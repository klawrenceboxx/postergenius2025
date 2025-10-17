import React from "react";
import { assets } from "@/assets/assets";
import Image from "next/image";
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
    <footer aria-label="Site footer" className="bg-white text-gray-500">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-14 border-b border-gray-500/30 md:flex-row md:flex-wrap md:justify-between md:px-16">
        <div className="max-w-md space-y-6">
          <Image className="w-28 md:w-32" src={assets.logo} alt="PosterGenius logo" />
          <p className="text-sm leading-6">
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
