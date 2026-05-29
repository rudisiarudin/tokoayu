import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TokoAyu - Kasir Warung",
  description: "PWA kasir dan manajemen warung grosir/kelontongan yang sederhana.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "TokoAyu",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#147a47",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={jakarta.variable}>{children}</body>
    </html>
  );
}
