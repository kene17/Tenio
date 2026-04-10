import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getLocale } from "../lib/locale";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Tenio",
  description: "Claim status operations platform for revenue cycle teams."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={inter.variable}>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
