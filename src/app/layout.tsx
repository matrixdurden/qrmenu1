import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QR Menu Studio",
  description: "Esnek, çoklu site destekli QR menü yönetimi",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
