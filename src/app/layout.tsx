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

import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
