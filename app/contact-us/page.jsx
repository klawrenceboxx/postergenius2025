"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import { useState } from "react";

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [status, setStatus] = useState({ type: "idle", message: "" });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: "loading", message: "" });

    // console.log("Submitting form data:", formData);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to send message.");
      }

      setStatus({
        type: "success",
        message: "Thank you! Your message has been sent.",
      });
      setFormData({ name: "", email: "", message: "" });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error.message || "Something went wrong. Please try again later.",
      });
    }
  };

  return (
    <>
      <Navbar />
      <div className="flex flex-col px-6 md:px-16 lg:px-32 pt-12 pb-24 text-gray-700">
        <div className="flex flex-col items-end">
          <p className="text-2xl font-medium">Contact Us</p>
          <div className="w-16 h-0.5 bg-primary rounded-full"></div>
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

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8"
          >
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your Name"
              className="border border-gray-300 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Your Email"
              className="border border-gray-300 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Your Message"
              rows={5}
              className="md:col-span-2 border border-gray-300 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            ></textarea>
            <button
              type="submit"
              className="md:col-span-2 bg-primary hover:bg-tertiary text-white px-6 py-2 rounded-md text-sm font-medium disabled:opacity-75"
              disabled={status.type === "loading"}
            >
              {status.type === "loading" ? "Sending..." : "Send Message"}
            </button>
          </form>

          {status.type !== "idle" && status.message && (
            <p
              className={`text-sm ${
                status.type === "success" ? "text-green-600" : "text-red-600"
              }`}
            >
              {status.message}
            </p>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ContactPage;
