import type { Metadata } from "next";
import "./globals.css";
import { getLocale } from "../lib/locale";

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
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
