"use client";
import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import axios from "axios";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { augmentProductWithPricing } from "@/lib/pricing";

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

  const fetchUserData = async () => {
    try {
      setIsAdmin(user?.publicMetadata?.role === "admin");

      const token = await getToken();
      const { data } = await axios.get("/api/user/data", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setUserData(data.user);
        setCartItems(data.user.cartItems || {});
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
        setWishlist(data.wishlist?.items || []);
      } else {
        toast.error(data.message || "Failed to load wishlist");
      }
    } catch (error) {
      toast.error(error.message || "Failed to load wishlist");
    }
  };

  const addToCart = async (payload) => {
    let cartData = structuredClone(cartItems);

    if (typeof payload === "string") {
      const itemId = payload; // primitive id path
      const existing = cartData[itemId];
      cartData[itemId] = existing
        ? typeof existing === "object"
          ? { ...existing, quantity: (existing.quantity || 0) + 1 }
          : existing + 1
        : 1;
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
      }
    }

    setCartItems(cartData);

    if (user) {
      try {
        const token = await getToken();
        await axios.post(
          "/api/cart/update",
          { cartData },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("cart updated successfully");
      } catch (error) {
        toast.error(error.message || "Failed to update cart");
      }
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
      cartData[itemId] = Number(quantity);
    }

    setCartItems(cartData);

    if (user) {
      try {
        const token = await getToken();
        await axios.post(
          "/api/cart/update",
          { cartData },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("cart updated successfully");
      } catch (error) {
        toast.error(error.message || "Failed to update cart");
      }
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
      const updatedWishlist = [...wishlist];
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
      const updatedWishlist = wishlist.filter(
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
    return Array.isArray(wishlist) ? wishlist.length : 0;
  };

  useEffect(() => {
    fetchProductData();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserData();
      fetchWishlist();
    } else {
      setIsAdmin(false);
      setWishlist([]);
    }
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
    cartItems,
    setCartItems,
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
