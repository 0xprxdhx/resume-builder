import type { Metadata, Viewport } from "next";
import { Syne, Space_Mono, Outfit } from "next/font/google";
import "./globals.css";

// ─────────────────────────────────────────────────────────────────────────────
// Fonts — must match the CSS variables declared in globals.css:
//   --display  → Syne
//   --mono     → Space Mono
//   --body     → Outfit
// ─────────────────────────────────────────────────────────────────────────────

const syne = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

// ─────────────────────────────────────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "résumé·studio — Resume Builder",
  description: "Build, preview, and export your resume to PDF. Fast, beautiful, yours.",
  authors: [{ name: "résumé·studio" }],
  keywords: ["resume", "cv", "builder", "pdf", "career", "portfolio"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

// ─────────────────────────────────────────────────────────────────────────────
// Layout
// ─────────────────────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={[syne.variable, spaceMono.variable, outfit.variable].join(" ")}
    >
      <body>{children}</body>
    </html>
  );
}