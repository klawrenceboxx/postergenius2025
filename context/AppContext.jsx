"use client";
import { productsDummyData, userDummyData } from "@/assets/assets";
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { set } from "mongoose";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";

export const AppContext = createContext();

export const useAppContext = () => {
  return useContext(AppContext);
};

export const AppContextProvider = (props) => {
  const currency = process.env.NEXT_PUBLIC_CURRENCY;
  const router = useRouter();

  const { user } = useUser();
  const { getToken } = useAuth();

  const [products, setProducts] = useState([]);
  const [userData, setUserData] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [cartItems, setCartItems] = useState({});

  const fetchProductData = async () => {
    try {
      const { data } = await axios.get("/api/product/list");
      if (data.success) {
        setProducts(data.products);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const fetchUserData = async () => {
    try {
      if (user.publicMetadata.role === "seller") {
        setIsSeller(true);
      }

      const token = await getToken();
      const { data } = await axios.get("/api/user/data", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setUserData(data.user);
        setCartItems(data.user.cartItems);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const addToCart = async (payload) => {
    let cartData = structuredClone(cartItems);

    if (typeof payload === "string") {
      const itemId = payload;
      const existing = cartData[itemId];
      if (existing) {
        if (typeof existing === "object") existing.quantity += 1;
        else cartData[itemId] += 1;
      } else {
        cartData[itemId] = 1;
      }
    } else if (payload && typeof payload === "object") {
      const {
        productId,
        title,
        imageUrl,
        price,
        quantity = 1,
        slug,
        format,
        dimensions,
      } = payload;
      const key = `${productId}-${format}-${dimensions}`;
      const existing = cartData[key];
      if (existing && typeof existing === "object") {
        existing.quantity += quantity;
      } else {
        cartData[key] = {
          productId,
          title,
          imageUrl,
          price,
          quantity,
          slug,
          format,
          dimensions,
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
        toast.error(error.message);
      }
    }
  };

  const updateCartQuantity = async (itemId, quantity) => {
    let cartData = structuredClone(cartItems);
    const existing = cartData[itemId];
    if (quantity === 0) {
      delete cartData[itemId];
    } else if (typeof existing === "object") {
      existing.quantity = quantity;
    } else {
      cartData[itemId] = quantity;
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
        toast.error(error.message);
      }
    }
  };

  const getCartCount = () => {
    let totalCount = 0;
    for (const items in cartItems) {
      const entry = cartItems[items];
      const qty = typeof entry === "object" ? entry.quantity : entry;
      if (qty > 0) {
        totalCount += qty;
      }
    }
    return totalCount;
  };

  const getCartAmount = () => {
    let totalAmount = 0;
    for (const key in cartItems) {
      const entry = cartItems[key];
      if (typeof entry === "object") {
        if (entry.quantity > 0) {
          totalAmount += entry.price * entry.quantity;
        }
      } else {
        let itemInfo = products.find((product) => product._id === key);
        if (itemInfo && entry > 0) {
          totalAmount += itemInfo.offerPrice * entry;
        }
      }
    }
    return Math.floor(totalAmount * 100) / 100;
  };

  useEffect(() => {
    fetchProductData();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const value = {
    user,
    getToken,
    currency,
    router,
    isSeller,
    setIsSeller,
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
  };

  return (
    <AppContext.Provider value={value}>{props.children}</AppContext.Provider>
  );
};
