"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "react-hot-toast";
import { AppContextProvider } from "@/context/AppContext";

const clerkPublishableKey =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  process.env.CLERK_PUBLISHABLE_KEY;

export default function Providers({ children }) {
  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <Toaster />
      <AppContextProvider>{children}</AppContextProvider>
    </ClerkProvider>
  );
}
