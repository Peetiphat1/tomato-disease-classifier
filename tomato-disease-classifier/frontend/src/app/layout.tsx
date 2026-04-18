import type { Metadata } from "next";
import { Manrope, Public_Sans } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-head",
  weight: ["400", "500", "600", "700", "800"],
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Tomato Leaf Disease Detection — Agrarian AI",
  description: "Identify tomato plant diseases instantly with AI-powered leaf analysis. Upload a photo and get an accurate diagnosis in seconds.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --font-head: ${manrope.style.fontFamily}, sans-serif;
              --font-body: ${publicSans.style.fontFamily}, sans-serif;
            }
          `
        }} />
      </head>
      <body className={`${manrope.variable} ${publicSans.variable}`}>
        {children}
      </body>
    </html>
  );
}
