"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

const BlogPage = () => {
  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-16 md:px-10 lg:px-0">
        <h1 className="text-3xl font-semibold text-gray-900">PosterGenius Blog</h1>
        <p className="text-base leading-relaxed text-gray-600">
          Stories, inspiration, and behind-the-scenes looks at PosterGenius are
          on the way. Check back soon for creative insights and product
          updates.
        </p>
      </main>
      <Footer />
    </>
  );
};

export default BlogPage;
