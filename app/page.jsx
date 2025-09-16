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

const Home = () => {
  return (
    <>
      <Navbar />
      <div className="px-6 md:px-16 lg:px-16">
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
