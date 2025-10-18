"use client";
import { assets } from "@/assets/assets";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Image from "next/image";
import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import axios from "axios";
import toast from "react-hot-toast";

export const metadata = {
  title: "Add Shipping Address | PosterGenius",
  description:
    "Securely add a new shipping address to your PosterGenius account so your next poster ships to the right place.",
  alternates: { canonical: "https://postergenius.ca/add-address" },
  openGraph: {
    title: "Add Shipping Address | PosterGenius",
    description:
      "Securely add a new shipping address to your PosterGenius account so your next poster ships to the right place.",
    url: "https://postergenius.ca/add-address",
    siteName: "PosterGenius",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Add Shipping Address | PosterGenius",
    description:
      "Securely add a new shipping address to your PosterGenius account so your next poster ships to the right place.",
  },
};

const AddAddress = () => {
  const { getToken, router } = useAppContext();

  const [address, setAddress] = useState({
    fullName: "",
    phoneNumber: "",
    pincode: "",
    area: "",
    city: "",
    state: "",
  });

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    try {
      const token = await getToken();
      const { data } = await axios.post(
        "/api/user/add-address",
        { address },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success(data.message || "Address saved");
        router.push("/cart");
      } else {
        toast.error(data.message || "Something went wrong");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || "Error");
    }
  };

  // one place to keep input classes on-brand
  const inputCls =
    "px-3 py-3 rounded-md w-full text-blackhex placeholder-gray-500 " +
    "border border-gray-300 focus:border-primary focus:ring-2 focus:ring-secondary/40 outline-none " +
    "transition-colors duration-200";

  return (
    <>
      <Navbar />
      <div className="px-6 md:px-16 lg:px-32 py-16 flex flex-col md:flex-row justify-between">
        <form onSubmit={onSubmitHandler} className="w-full max-w-xl">
          <h1 className="text-2xl md:text-3xl text-blackhex">
            Add Shipping <span className="font-semibold text-primary">Address | PosterGenius</span>
          </h1>

          <div className="space-y-3 mt-10">
            <input
              className={inputCls}
              type="text"
              placeholder="Full name"
              onChange={(e) =>
                setAddress({ ...address, fullName: e.target.value })
              }
              value={address.fullName}
            />
            <input
              className={inputCls}
              type="text"
              placeholder="Phone number"
              onChange={(e) =>
                setAddress({ ...address, phoneNumber: e.target.value })
              }
              value={address.phoneNumber}
            />
            <input
              className={inputCls}
              type="text"
              placeholder="Postal code"
              onChange={(e) =>
                setAddress({ ...address, pincode: e.target.value })
              }
              value={address.pincode}
            />
            <textarea
              className={`${inputCls} resize-none`}
              rows={4}
              placeholder="Address (Area and Street)"
              onChange={(e) => setAddress({ ...address, area: e.target.value })}
              value={address.area}
            />
            <div className="flex gap-3">
              <input
                className={inputCls}
                type="text"
                placeholder="City / District / Town"
                onChange={(e) =>
                  setAddress({ ...address, city: e.target.value })
                }
                value={address.city}
              />
              <input
                className={inputCls}
                type="text"
                placeholder="Province / State"
                onChange={(e) =>
                  setAddress({ ...address, state: e.target.value })
                }
                value={address.state}
              />
            </div>
          </div>

          <button
            type="submit"
            className="max-w-xl w-full mt-6 h-12 rounded-full font-semibold text-white 
                       bg-primary hover:bg-tertiary active:scale-[0.99]
                       shadow-md shadow-primary/20 transition-colors"
          >
            Save address
          </button>

          <p className="text-xs text-gray-500 mt-2">
            Your details are secured and used only for shipping.
          </p>
        </form>

        <Image
          className="md:ml-16 mt-16 md:mt-0"
          src={assets.my_location_image}
          alt="Location illustration"
          priority
        />
      </div>
      <Footer />
    </>
  );
};

export default AddAddress;
