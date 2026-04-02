import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tenio",
  description: "Claim status operations platform for revenue cycle teams."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
