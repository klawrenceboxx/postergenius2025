"use client";
import React, { useState } from "react";
import { assets, BagIcon, BoxIcon, CartIcon, HomeIcon } from "@/assets/assets";
import Link from "next/link";
import { useAppContext } from "@/context/AppContext";
import Image from "next/image";
import { useClerk, UserButton } from "@clerk/nextjs";
import TopBanner from "@/components/TopBanner";

const Navbar = () => {
  const { isAdmin, router, user, getCartCount } = useAppContext();
  const { openSignIn } = useClerk();
  const cartCount = getCartCount();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const closeMenu = () => setIsMenuOpen(false);

  const [searchQuery, setSearchQuery] = useState("");

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/shop", label: "Shop" },
    { href: "/about-us", label: "About Us" },
    { href: "/contact-us", label: "Contact" },
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    router.push(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
    setSearchQuery("");
    setIsMenuOpen(false);
  };

  return (
    <div>
      <TopBanner />
      <nav className="sticky top-0 z-50 bg-white flex items-center justify-between px-6 md:px-16 lg:px-16 py-3 border-b border-gray-300 text-gray-600 relative">
        <Image
          className="cursor-pointer w-24 md:w-28"
          onClick={() => router.push("/")}
          src={assets.logo}
          alt="logo"
        />
        <div className="hidden lg:flex text-m items-center gap-4 lg:gap-12 font-[500] font-blackhex ">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="relative hover:text-secondary transition-colors duration-300 group"
            >
              {link.label}
              <span className="absolute bottom-0 left-0 h-0.5 bg-secondary w-0 group-hover:w-full transition-all duration-200"></span>{" "}
            </Link>
          ))}

          {isAdmin && (
            <button
              onClick={() => router.push("/seller")}
              className="text-xs border px-4 py-1.5 rounded-full"
            >
              Seller Dashboard
            </button>
          )}
        </div>

        <ul className="hidden lg:flex items-center gap-4 ">
          {/* Desktop: always open search */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center border rounded-full px-3 py-1 w-52
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

        <div className="flex items-center lg:hidden gap-3">
          <Link href="/cart" className="relative">
            <Image
              className="w-6 h-6"
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
          </Link>
          {isAdmin && (
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
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="p-2 border rounded-md hover:bg-gray-50 transition"
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
          >
            <Image src={assets.menu_icon} alt="menu icon" width={18} height={18} />
          </button>
        </div>
        <div
          className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ease-in-out lg:hidden ${
            isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          onClick={closeMenu}
        />
        <div
          className={`fixed right-0 top-0 h-full w-3/4 max-w-sm bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
            isMenuOpen
              ? "translate-x-0 pointer-events-auto"
              : "translate-x-full pointer-events-none"
          }`}
        >
          <div className="flex flex-col gap-4 px-6 py-6 text-gray-700 h-full overflow-y-auto">
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center gap-2 border rounded-full px-4 py-2 focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/30 transition-all duration-300"
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
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </form>
            <div className="flex flex-col gap-3 text-base font-medium font-blackhex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0 hover:text-secondary transition-colors duration-200"
                >
                  {link.label}
                  <span className="text-lg">›</span>
                </Link>
              ))}
              {isAdmin && (
                <button
                  onClick={() => {
                    closeMenu();
                    router.push("/seller");
                  }}
                  className="text-left py-2 border-b border-gray-100 last:border-b-0 hover:text-secondary transition-colors duration-200"
                >
                  Seller Dashboard
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
