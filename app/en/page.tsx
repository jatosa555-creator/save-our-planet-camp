import Home from "../page";

export const metadata = {
  title: "Environmental AI Exhibition for Students",
  description: "Explore environmental themes, Creative Lenses, and AI image generation in English at Save Our Planet Camp.",
  alternates: { canonical: "/en" },
};

export default function EnglishPage() {
  return <Home initialLanguage="en" />;
}
