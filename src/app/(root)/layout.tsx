import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "HealTrip | Patient Decision Assistant",
  icons: { icon: [{ url: "/logo.jpg", type: "image/jpeg" }] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr">
      <body>{children}</body>
    </html>
  );
}