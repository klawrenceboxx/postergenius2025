import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HowItWorksClient from "@/components/HowItWorksClient";

export const metadata = {
  title: "How Digital Prints Work | PosterGenius",
  description:
    "Learn how digital poster files work, where to print them, and how to get from checkout to wall art fast.",
};

export default function VideosPage() {
  return (
    <>
      <Navbar />
      <HowItWorksClient />
      <Footer />
    </>
  );
}
