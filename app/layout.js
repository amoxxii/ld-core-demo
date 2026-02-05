import "./globals.css";
import { Outfit } from "next/font/google";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-hero",
});

export const metadata = {
  title: "ToggleHealth – Coverage Concierge",
  description: "Powered by Amazon Bedrock · Triage only",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={outfit.variable}>
      <body>{children}</body>
    </html>
  );
}
