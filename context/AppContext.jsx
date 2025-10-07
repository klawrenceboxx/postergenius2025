"use client";
import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import axios from "axios";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { augmentProductWithPricing } from "@/lib/pricing";
import {
  getOrCreateGuestId,
  isGuestIdExpired,
  __internal as guestInternal,
} from "@/lib/guestUtils";

export const AppContext = createContext();
export const useAppContext = () => useContext(AppContext);

export const AppContextProvider = (props) => {
  const currency = process.env.NEXT_PUBLIC_CURRENCY;
  const router = useRouter();

  const { user } = useUser();
  const { getToken } = useAuth();
  const { openSignIn } = useClerk();

  const [products, setProducts] = useState([]);
  const [userData, setUserData] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cartItems, setCartItems] = useState({});
  const [wishlist, setWishlist] = useState([]);
  const [activeGuestId, setActiveGuestId] = useState(null);

  const guestStorageKey =
    guestInternal?.GUEST_ID_STORAGE_KEY || "posterGenius.guest";

  const normalizeWishlist = (source) => {
    if (!source) return [];
    if (Array.isArray(source)) {
      return source.map((item) =>
        typeof item === "string" ? { productId: item } : { ...item }
      );
    }
    if (Array.isArray(source?.items)) {
      return source.items.map((item) =>
        typeof item === "string" ? { productId: item } : { ...item }
      );
    }
    return [];
  };

  // normalize _id -> productId
  const mapProduct = (p) => {
    const normalizedId =
      p?.productId ||
      (typeof p?._id === "object" && p?._id !== null
        ? p._id.toString()
        : p?._id ?? "");

    const normalized = {
      ...p,
      _id:
        typeof p?._id === "object" && p?._id !== null
          ? p._id.toString()
          : p?._id ?? normalizedId,
      productId: normalizedId,
    };

    return augmentProductWithPricing(normalized);
  };

  const peekStoredGuestId = () => {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const raw = window.localStorage.getItem(guestStorageKey);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      if (!parsed?.id || isGuestIdExpired(parsed.createdAt)) {
        window.localStorage.removeItem(guestStorageKey);
        return null;
      }

      return parsed.id;
    } catch (error) {
      console.warn("[AppContext] Failed to parse stored guestId", error);
      return null;
    }
  };

  const prepareCartRequest = async ({ createGuestIfMissing = false } = {}) => {
    if (user) {
      const token = await getToken();
      return {
        headers: { Authorization: `Bearer ${token}` },
        guestId: null,
      };
    }

    let guestId = peekStoredGuestId();
    if (!guestId && createGuestIfMissing) {
      guestId = getOrCreateGuestId();
    }

    if (!guestId) {
      return { headers: {}, guestId: null };
    }

    setActiveGuestId((prev) => (prev === guestId ? prev : guestId));

    return {
      headers: { "x-guest-id": guestId },
      guestId,
    };
  };

  const fetchProductData = async () => {
    try {
      const { data } = await axios.get("/api/product/list");
      if (data.success) {
        setProducts((data.products || []).map(mapProduct));
      } else {
        toast.error(data.message || "Failed to load products");
      }
    } catch (error) {
      toast.error(error.message || "Failed to load products");
    }
  };

  const fetchCart = async ({ createGuestIfMissing = false } = {}) => {
    try {
      const { headers, guestId } = await prepareCartRequest({
        createGuestIfMissing,
      });

      if (!user && !guestId) {
        setCartItems({});
        return;
      }

      const { data } = await axios.get("/api/cart/get", { headers });
      if (data.success) {
        setCartItems(data.cartItems || {});
      } else {
        toast.error(data.message || "Failed to load cart");
      }
    } catch (error) {
      toast.error(error.message || "Failed to load cart");
    }
  };

  const fetchUserData = async () => {
    try {
      setIsAdmin(user?.publicMetadata?.role === "admin");

      const token = await getToken();
      const { data } = await axios.get("/api/user/data", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setUserData(data.user);
      } else {
        toast.error(data.message || "Failed to load user");
      }
    } catch (error) {
      toast.error(error.message || "Failed to load user");
    }
  };

  const fetchWishlist = async () => {
    if (!user) {
      setWishlist([]);
      return;
    }

    try {
      const token = await getToken();
      const { data } = await axios.get("/api/wishlist/get", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setWishlist(normalizeWishlist(data.wishlist));
      } else {
        toast.error(data.message || "Failed to load wishlist");
      }
    } catch (error) {
      toast.error(error.message || "Failed to load wishlist");
    }
  };

  const addToCart = async (payload) => {
    let cartData = structuredClone(cartItems);
    let itemKey = null;
    let itemRecord = null;

    if (typeof payload === "string") {
      const itemId = payload; // primitive id path
      const existing = cartData[itemId];
      const nextQuantity = existing
        ? typeof existing === "object"
          ? (existing.quantity || 0) + 1
          : Number(existing) + 1
        : 1;

      const productInfo = products.find(
        (p) => (p.productId || p._id?.toString?.() || p._id) === itemId
      );

      const fallbackPrice =
        productInfo?.pricing?.defaultPhysicalFinalPrice ??
        productInfo?.finalPrice ??
        productInfo?.price ??
        0;

      const normalized = {
        productId: itemId,
        title: productInfo?.title ?? productInfo?.name ?? "",
        imageUrl: productInfo?.imageUrl ?? productInfo?.images?.[0] ?? "",
        price: Number(fallbackPrice) || 0,
        quantity: Number(nextQuantity),
        slug: productInfo?.slug ?? "",
        dimensions: productInfo?.dimensions ?? "",
      };

      cartData[itemId] = normalized;
      itemKey = itemId;
      itemRecord = normalized;
    } else if (payload && typeof payload === "object") {
      let p = { ...payload };

      // backfill productId if caller sent _id or only slug
      if (!p.productId) {
        if (p._id) p.productId = p._id.toString?.() ?? p._id;
        if (!p.productId && p.slug) {
          const found = products.find((x) => x.slug === p.slug);
          if (found) p.productId = found.productId;
        }
      }

      // normalize format/dimensions
      p.format = (p.format || "").toLowerCase().trim() || undefined;
      if (p.format === "digital" && !p.dimensions) p.dimensions = "digital";

      if (!p.productId || !p.format || !p.dimensions) {
        console.warn("Bad cart payload:", p);
        toast.error("Could not add to cart. Missing fields.");
        return;
      }

      const key = `${p.productId}-${p.format}-${p.dimensions}`;
      const existing = cartData[key];

      if (existing && typeof existing === "object") {
        existing.quantity = (existing.quantity || 0) + Number(p.quantity ?? 1);
        itemRecord = existing;
      } else {
        cartData[key] = {
          productId: p.productId,
          title: p.title ?? "",
          imageUrl: p.imageUrl ?? "",
          price: Number(p.price ?? 0),
          quantity: Number(p.quantity ?? 1),
          slug: p.slug ?? "",
          format: p.format,
          dimensions: p.dimensions,
        };
        itemRecord = cartData[key];
      }

      itemKey = key;
    }

    setCartItems(cartData);

    if (!itemKey || !itemRecord || typeof itemRecord !== "object") {
      return;
    }

    try {
      const { headers, guestId } = await prepareCartRequest({
        createGuestIfMissing: !user,
      });

      if (!user && !guestId) {
        console.warn("[AppContext] Unable to persist cart for guest without guestId");
        return;
      }

      await axios.post(
        "/api/cart/add",
        {
          itemKey,
          itemData: itemRecord,
          ...(guestId ? { guestId } : {}),
        },
        { headers }
      );

      toast.success("cart updated successfully");
    } catch (error) {
      toast.error(error.message || "Failed to update cart");
    }
  };

  const updateCartQuantity = async (itemId, quantity) => {
    let cartData = structuredClone(cartItems);
    const existing = cartData[itemId];

    if (quantity === 0) {
      delete cartData[itemId];
    } else if (typeof existing === "object") {
      existing.quantity = Number(quantity);
    } else {
      const productInfo = products.find(
        (p) => (p.productId || p._id?.toString?.() || p._id) === itemId
      );

      const fallbackPrice =
        productInfo?.pricing?.defaultPhysicalFinalPrice ??
        productInfo?.finalPrice ??
        productInfo?.price ??
        0;

      cartData[itemId] = {
        productId: itemId,
        title: productInfo?.title ?? productInfo?.name ?? "",
        imageUrl: productInfo?.imageUrl ?? productInfo?.images?.[0] ?? "",
        price: Number(fallbackPrice) || 0,
        quantity: Number(quantity),
        slug: productInfo?.slug ?? "",
        dimensions: productInfo?.dimensions ?? "",
      };
    }

    setCartItems(cartData);

    const isRemoval = quantity === 0;
    const itemRecord = cartData[itemId];

    try {
      const { headers, guestId } = await prepareCartRequest({
        createGuestIfMissing: !user && quantity > 0,
      });

      if (!user && !guestId) {
        console.warn("[AppContext] Unable to persist cart for guest without guestId");
        return;
      }

      if (isRemoval) {
        await axios.post(
          "/api/cart/delete",
          {
            itemKey: itemId,
            ...(guestId ? { guestId } : {}),
          },
          { headers }
        );
      } else if (itemRecord && typeof itemRecord === "object") {
        await axios.post(
          "/api/cart/add",
          {
            itemKey: itemId,
            itemData: itemRecord,
            ...(guestId ? { guestId } : {}),
          },
          { headers }
        );
      }

      toast.success("cart updated successfully");
    } catch (error) {
      toast.error(error.message || "Failed to update cart");
    }
  };

  const addToWishlist = async (productId) => {
    if (!user) {
      openSignIn?.();
      return;
    }

    try {
      const token = await getToken();

      // Append product if not already in wishlist
      const currentWishlist = normalizeWishlist(wishlist);
      const updatedWishlist = [...currentWishlist];
      if (!updatedWishlist.some((item) => item.productId === productId)) {
        updatedWishlist.push({ productId });
      }

      await axios.post(
        "/api/wishlist/update",
        { wishlistData: updatedWishlist },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setWishlist(updatedWishlist);
      toast.success("Wishlist updated successfully");
    } catch (error) {
      toast.error(error.message || "Failed to update wishlist");
    }
  };

  const removeFromWishlist = async (productId) => {
    if (!user) {
      openSignIn?.();
      return;
    }

    try {
      const token = await getToken();

      // Remove product from local wishlist array
      const currentWishlist = normalizeWishlist(wishlist);
      const updatedWishlist = currentWishlist.filter(
        (item) => item.productId !== productId
      );

      await axios.post(
        "/api/wishlist/update",
        { wishlistData: updatedWishlist },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setWishlist(updatedWishlist);
      toast.success("Wishlist updated successfully");
    } catch (error) {
      toast.error(error.message || "Failed to update wishlist");
    }
  };

  const getCartCount = () => {
    let totalCount = 0;
    for (const k in cartItems) {
      const entry = cartItems[k];
      const qty = typeof entry === "object" ? entry.quantity || 0 : entry;
      if (qty > 0) totalCount += qty;
    }
    return totalCount;
  };

  const getCartAmount = () => {
    let totalAmount = 0;
    for (const key in cartItems) {
      const entry = cartItems[key];

      if (typeof entry === "object") {
        if (entry.quantity > 0) {
          totalAmount += Number(entry.price || 0) * entry.quantity;
        }
      } else {
        // legacy primitive entries (key === productId)
        const itemInfo = products.find(
          (p) => (p.productId || p._id?.toString?.() || p._id) === key
        );
        if (itemInfo && entry > 0) {
          const defaultPrice =
            itemInfo?.pricing?.defaultPhysicalFinalPrice ??
            itemInfo?.finalPrice ??
            itemInfo?.price ??
            0;
          totalAmount += Number(defaultPrice) * entry;
        }
      }
    }
    return Math.floor(totalAmount * 100) / 100;
  };

  const getWishlistCount = () => {
    return normalizeWishlist(wishlist).length;
  };

  useEffect(() => {
    fetchProductData();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserData();
      fetchWishlist();
      fetchCart({ createGuestIfMissing: false });
      setActiveGuestId(null);
    } else {
      setIsAdmin(false);
      setWishlist([]);
      const existingGuestId = peekStoredGuestId();
      setActiveGuestId(existingGuestId);
      if (existingGuestId) {
        fetchCart({ createGuestIfMissing: false });
      } else {
        setCartItems({});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const value = {
    user,
    getToken,
    currency,
    router,
    isAdmin,
    setIsAdmin,
    userData,
    fetchUserData,
    products,
    fetchProductData,
    fetchCart,
    cartItems,
    setCartItems,
    activeGuestId,
    addToCart,
    updateCartQuantity,
    getCartCount,
    getCartAmount,
    wishlist,
    setWishlist,
    fetchWishlist,
    addToWishlist,
    removeFromWishlist,
    getWishlistCount,
  };

  return (
    <AppContext.Provider value={value}>{props.children}</AppContext.Provider>
  );
};

/**
 * Manual verification:
 * 1. Log out, add products to the cart, and confirm `/api/cart/add` receives a guestId.
 * 2. Refresh the page and ensure `/api/cart/get` restores the same guest cart.
 * 3. Log in and verify the authenticated cart remains separate from the guest cart.
 */
