import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TRPCProvider } from "@/components/providers";
import "../../globals.css";

export const metadata: Metadata = {
  title: "HealTrip | Patient Decision Assistant",
  description: "A bilingual care-navigation prototype.",
  icons: { icon: [{ url: "/logo.jpg", type: "image/jpeg" }] },
};

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "ar") notFound();

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <body>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}