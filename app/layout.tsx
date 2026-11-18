import type { Metadata, Viewport } from "next";
import { Manrope, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const body = Manrope({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const heading = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-heading-face", display: "swap", weight: ["600", "700", "800"] });

export const metadata: Metadata = {
  title: { default: "CasaMed Admin", template: "%s · CasaMed Admin" },
  description: "Super-admin console for the CasaMed patient app.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F8FA" },
    { media: "(prefers-color-scheme: dark)", color: "#0A1220" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" suppressHydrationWarning className={`${body.variable} ${heading.variable}`}>
      <body className="min-h-dvh font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
