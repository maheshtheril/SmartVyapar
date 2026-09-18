import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "SmartVyapar - Multi-Tenant SaaS ERP",
  description: "Next-Gen Invoicing, Inventory & Indian GST Platform",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SmartVyapar",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read the path to determine if we're on the login page.
  // next/headers referer is not reliable; instead the login page
  // renders its own full-screen layout without Sidebar.
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
