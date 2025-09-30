"use client";
import React, { useState } from "react";
import { assets, BagIcon, BoxIcon, CartIcon, HomeIcon } from "@/assets/assets";
import Link from "next/link";
import { useAppContext } from "@/context/AppContext";
import Image from "next/image";
import { useClerk, UserButton } from "@clerk/nextjs";
import TopBanner from "@/components/TopBanner";

const Navbar = () => {
  const { isSeller, router, user, getCartCount } = useAppContext();
  const { openSignIn } = useClerk();
  const cartCount = getCartCount();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 👇 state for search
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearch(false); // hide field after submit
      setSearchQuery("");
    }
  };

  return (
    <div>
      <TopBanner />
      <nav className="sticky top-0 z-50 bg-white flex items-center justify-between px-6 md:px-16 lg:px-16 py-3 border-b border-gray-300 text-gray-600">
        <Image
          className="cursor-pointer w-24 md:w-28"
          onClick={() => router.push("/")}
          src={assets.logo}
          alt="logo"
        />
        <div className="flex text-m items-center gap-4 lg:gap-12 max-md:hidden font-[500] font-blackhex ">
          <Link
            href="/"
            className="relative hover:text-secondary transition-colors duration-300 group"
          >
            Home
            <span className="absolute bottom-0 left-0 h-0.5 bg-secondary w-0 group-hover:w-full transition-all duration-200"></span>{" "}
            {/* Animated underline */}
          </Link>
          <Link
            href="/shop"
            className="relative hover:text-secondary transition-colors duration-300 group"
          >
            Shop
            <span className="absolute bottom-0 left-0 h-0.5 bg-secondary w-0 group-hover:w-full transition-all duration-200"></span>{" "}
          </Link>
          <Link
            href="/about-us"
            className="relative hover:text-secondary transition-colors duration-300 group"
          >
            About Us
            <span className="absolute bottom-0 left-0 h-0.5 bg-secondary w-0 group-hover:w-full transition-all duration-200"></span>{" "}
          </Link>
          <Link
            href="/contact-us"
            className="relative hover:text-secondary transition-colors duration-300 group"
          >
            Contact
            <span className="absolute bottom-0 left-0 h-0.5 bg-secondary w-0 group-hover:w-full transition-all duration-200"></span>{" "}
          </Link>

          {isSeller && (
            <button
              onClick={() => router.push("/seller")}
              className="text-xs border px-4 py-1.5 rounded-full"
            >
              Seller Dashboard
            </button>
          )}
        </div>

        <ul className="hidden md:flex items-center gap-4 ">
          {/* Desktop: always open search */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex items-center border rounded-full px-3 py-1 w-52 
             focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/30
             transition-all duration-300"
          >
            <Image
              src={assets.search_icon}
              alt="search"
              width={18}
              height={18}
              className="flex-shrink-0 w-5 h-5 text-gray-500"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posters..."
              className="ml-2 bg-transparent text-sm outline-none w-full"
            />
          </form>
          {/* Mobile: toggle animation */}
          <form
            onSubmit={handleSearchSubmit}
            className={`flex md:hidden items-center border rounded-full px-3 py-1 
             transition-all duration-300 ease-in-out
             ${showSearch ? "w-52" : "w-10 cursor-pointer"}`}
            onClick={() => {
              if (!showSearch) setShowSearch(true);
            }}
          >
            <Image
              src={assets.search_icon}
              alt="search"
              width={18}
              height={18}
              className="flex-shrink-0 w-5 h-5 text-gray-500"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className={`ml-2 bg-transparent text-sm outline-none transition-all duration-300
                ${showSearch ? "w-full opacity-100" : "w-0 opacity-0"}`}
              autoFocus={showSearch}
              onBlur={() => setShowSearch(false)}
            />
          </form>
          {/* cart */}
          <Link href="/cart" className="relative">
            <Image
              className="w-5 h-5"
              src={assets.cart_icon}
              alt="cart icon"
              width={24}
              height={24}
            />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] leading-none px-1 rounded-full">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>{" "}
          {user ? (
            <>
              <UserButton user={user}>
                <UserButton.MenuItems>
                  <UserButton.Action
                    label="Home"
                    labelIcon={<HomeIcon />}
                    onClick={() => router.push("/")}
                  />
                </UserButton.MenuItems>
                <UserButton.MenuItems>
                  <UserButton.Action
                    label="Products"
                    labelIcon={<BoxIcon />}
                    onClick={() => router.push("/shop")}
                  />
                </UserButton.MenuItems>
                <UserButton.MenuItems>
                  <UserButton.Action
                    label="Cart"
                    labelIcon={<CartIcon />}
                    onClick={() => router.push("/cart")}
                  />
                </UserButton.MenuItems>
                <UserButton.MenuItems>
                  <UserButton.Action
                    label="My Orders"
                    labelIcon={<BagIcon />}
                    onClick={() => router.push("/my-orders")}
                  />
                </UserButton.MenuItems>
              </UserButton>
            </>
          ) : (
            <button
              onClick={openSignIn}
              className="flex items-center gap-2 hover:text-gray-900 transition"
            >
              <Image
                className="w-5 h-5"
                src={assets.user_icon}
                alt="search icon"
                width={24}
                height={24}
              />{" "}
              Account
            </button>
          )}
        </ul>

        <div className="flex items-center md:hidden gap-3">
          {isSeller && (
            <button
              onClick={() => router.push("/seller")}
              className="text-xs border px-4 py-1.5 rounded-full"
            >
              Seller Dashboard
            </button>
          )}
          {user ? (
            <>
              <UserButton user={user}>
                <UserButton.MenuItems>
                  <UserButton.Action
                    label="Home"
                    labelIcon={<HomeIcon />}
                    onClick={() => router.push("/")}
                  />
                </UserButton.MenuItems>
                <UserButton.MenuItems>
                  <UserButton.Action
                    label="Products"
                    labelIcon={<BoxIcon />}
                    onClick={() => router.push("/shop")}
                  />
                </UserButton.MenuItems>

                <UserButton.MenuItems>
                  <UserButton.Action
                    label="Cart"
                    labelIcon={<CartIcon />}
                    onClick={() => router.push("/cart")}
                  />
                </UserButton.MenuItems>
                <UserButton.MenuItems>
                  <UserButton.Action
                    label="My Orders"
                    labelIcon={<BagIcon />}
                    onClick={() => router.push("/my-orders")}
                  />
                </UserButton.MenuItems>
              </UserButton>
            </>
          ) : (
            <button
              onClick={openSignIn}
              className="flex items-center gap-2 hover:text-gray-900 transition"
            >
              <Image src={assets.user_icon} alt="user icon" />
              Account
            </button>
          )}
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
