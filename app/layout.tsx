import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Save Our Planet Camp",
  description: "นิทรรศการภาพและ Creative Lenses สำหรับนักเรียนในค่าย",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
