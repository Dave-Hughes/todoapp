import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Gabarito } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const gabarito = Gabarito({
  subsets: ["latin"],
  variable: "--font-gabarito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ToDoApp",
  description: "Purpose-built for couples. Make invisible labor visible.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="cozy"
      className={`${bricolage.variable} ${gabarito.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
