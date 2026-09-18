import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Save Our Planet Camp | Environmental AI Exhibition",
    template: "%s | Save Our Planet Camp",
  },
  description: "นิทรรศการสิ่งแวดล้อมสองภาษาและห้องทดลองสร้างภาพด้วย AI สำหรับนักเรียน: มองปัญหาใกล้ตัวผ่าน Creative Lenses แล้วสร้างภาพมุมมองใหม่",
  keywords: [
    "นิทรรศการสิ่งแวดล้อม",
    "environmental exhibition",
    "AI รูปภาพ",
    "AI image generation",
    "Creative Lenses",
    "student exhibition",
    "GPT",
    "Astra 2.5",
    "AGI",
    "OpenRouter",
    "Save Our Planet Camp",
  ],
  authors: [{ name: "Save Our Planet Camp" }],
  creator: "Save Our Planet Camp",
  applicationName: "Cap to Change",
  category: "education",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Save Our Planet Camp",
    title: "Save Our Planet Camp | Environmental AI Exhibition",
    description: "A bilingual environmental exhibition where students use Creative Lenses and AI image making to see familiar places differently.",
    locale: "th_TH",
    alternateLocale: ["en_US"],
  },
  robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "Save Our Planet Camp",
  alternateName: "Cap to Change",
  url: siteUrl,
  description: "Bilingual environmental exhibition and AI image-making learning experience for students.",
  inLanguage: ["th", "en"],
  educationalUse: ["exhibition", "creative learning", "AI literacy", "environmental education"],
  keywords: "environmental exhibition, นิทรรศการสิ่งแวดล้อม, AI image generation, GPT, Astra 2.5, AGI, Creative Lenses",
  about: [
    { "@type": "Thing", name: "Waste and materials" },
    { "@type": "Thing", name: "Water" },
    { "@type": "Thing", name: "Energy and heat" },
    { "@type": "Thing", name: "Green space and living things" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /></body></html>;
}
