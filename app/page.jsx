"use client";
import React from "react";
import Navbar from "@/components/Navbar";
import HeroBanner from "@/components/HeroBanner";
import HeaderSlider from "@/components/HeaderSlider";
import HomeProducts from "@/components/HomeProducts";
import FeaturedCategory from "@/components/FeaturedCategory";
import Testimonial from "@/components/Testimonials";
import Banner from "@/components/Banner";
import NewsLetter from "@/components/NewsLetter";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Home | PosterGenius",
  description:
    "Discover fandom-inspired posters, premium art prints, and decor curated by PosterGenius for every collection.",
  alternates: { canonical: "https://postergenius.ca/" },
  openGraph: {
    title: "Home | PosterGenius",
    description:
      "Discover fandom-inspired posters, premium art prints, and decor curated by PosterGenius for every collection.",
    url: "https://postergenius.ca/",
    siteName: "PosterGenius",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Home | PosterGenius",
    description:
      "Discover fandom-inspired posters, premium art prints, and decor curated by PosterGenius for every collection.",
  },
};

const Home = () => {
  return (
    <>
      <Navbar />
      <div className="px-6 md:px-16 lg:px-16">
        <h1 className="sr-only">Home | PosterGenius</h1>
        {/* <HeaderSlider /> */}
        <HeroBanner />
        <HomeProducts />
        <FeaturedCategory />
        <Testimonial />
        {/* <Banner /> */}
        <NewsLetter />
      </div>
      <Footer />
    </>
  );
};

export default Home;
