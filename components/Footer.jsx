import React from "react";
import { assets } from "@/assets/assets";
import Image from "next/image";
import { getOptimizedImageProps } from "@/lib/imageUtils";
import Link from "next/link";

const Footer = () => {
  const companyLinks = [
    { href: "/", label: "Home" },
    { href: "/about-us", label: "About us" },
    { href: "/contact-us", label: "Contact us" },
    { href: "/blog", label: "Blog" },
  ];

  const supportLinks = [
    { href: "/faq", label: "FAQ" },
    { href: "/privacy", label: "Privacy policy" },
    { href: "/terms", label: "Terms & Conditions" },
  ];

  const socialLinks = [
    { href: "https://www.instagram.com", label: "Instagram" },
    { href: "https://www.pinterest.com", label: "Pinterest" },
    { href: "https://www.facebook.com", label: "Facebook" },
    { href: "https://www.twitter.com", label: "Twitter / X" },
  ];

  return (
    <footer>
      <div className="flex flex-col md:flex-row items-start justify-center px-6 md:px-16  gap-10 py-14 border-b border-gray-500/30 text-gray-500">
        <div className="w-4/5">
          <Image
            {...getOptimizedImageProps(assets.logo)}
            className="w-28 md:w-32"
            alt="logo"
          />
          <p className="mt-6 text-sm">
            At PosterGenius, we bring walls to life. Whether you&apos;re looking for
            bold, cinematic art or minimalist designs, our curated poster
            collections help you express what matters most. Designed for
            creators, dreamers, and doers—your space, your style.
          </p>
        </div>

        <nav aria-labelledby="footer-company-heading" className="min-w-[12rem]">
          <h2 id="footer-company-heading" className="text-base font-semibold text-gray-900">
            Company
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            {companyLinks.map((link) => (
              <li key={link.href}>
                <Link className="transition hover:text-gray-900 hover:underline" href={link.href}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-support-heading" className="min-w-[12rem]">
          <h2 id="footer-support-heading" className="text-base font-semibold text-gray-900">
            Support
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            {supportLinks.map((link) => (
              <li key={link.href}>
                <Link className="transition hover:text-gray-900 hover:underline" href={link.href}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-[12rem]">
          <h2 className="text-base font-semibold text-gray-900">Get in touch</h2>
          <div className="mt-4 space-y-2 text-sm">
            <p>
              <a className="transition hover:text-gray-900 hover:underline" href="tel:+16476321709">
                +1 (647) 632-1709
              </a>
            </p>
            <p>
              <a
                className="transition hover:text-gray-900 hover:underline"
                href="mailto:kaleel.lawrence-boxx@postergenius.ca"
              >
                kaleel.lawrence-boxx@postergenius.ca
              </a>
            </p>
          </div>
        </div>

        <div className="min-w-[12rem]">
          <h2 className="text-base font-semibold text-gray-900">Follow us</h2>
          <ul className="mt-4 flex flex-wrap gap-3 text-sm">
            {socialLinks.map((link) => (
              <li key={link.href}>
                <a
                  className="transition hover:text-gray-900 hover:underline"
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="py-4 text-center text-xs md:text-sm">
        Copyright 2025 © PosterGenius.dev All Right Reserved.
      </p>
    </footer>
  );
};

export default Footer;
