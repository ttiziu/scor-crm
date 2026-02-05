import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AppLayoutWithSidebar } from "@/components/app-layout-with-sidebar";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SCOR CRM",
  description: "CRM para negocios de gas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        <AppLayoutWithSidebar>{children}</AppLayoutWithSidebar>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
