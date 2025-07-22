"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const ContactPage = () => {
  return (
    <>
      <Navbar />
      <div className="flex flex-col px-6 md:px-16 lg:px-32 pt-12 pb-24 text-gray-700">
        <div className="flex flex-col items-end">
          <p className="text-2xl font-medium">Contact Us</p>
          <div className="w-16 h-0.5 bg-orange-600 rounded-full"></div>
        </div>

        <div className="mt-12 space-y-10 max-w-3xl">
          <p className="text-base leading-relaxed">
            We’d love to hear from you! Whether you have a question about
            posters, an order, or anything else—our team is ready to help.
          </p>

          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium text-gray-900">Phone:</span> +1 (647)
              632-1709
            </p>
            <p>
              <span className="font-medium text-gray-900">Email:</span>{" "}
              kaleel.lawrence-boxx@postergenius.ca
            </p>
            <p>
              <span className="font-medium text-gray-900">Address:</span> 111
              Ribblesdale dr
            </p>
          </div>

          <form className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">
            <input
              type="text"
              placeholder="Your Name"
              className="border border-gray-300 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <input
              type="email"
              placeholder="Your Email"
              className="border border-gray-300 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <textarea
              placeholder="Your Message"
              rows={5}
              className="md:col-span-2 border border-gray-300 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            ></textarea>
            <button
              type="submit"
              className="md:col-span-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-md text-sm font-medium"
            >
              Send Message
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ContactPage;
