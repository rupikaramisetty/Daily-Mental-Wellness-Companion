/**
 * Root Layout
 *
 * Minimal Next.js App Router layout with SEO metadata for the
 * Daily Wellness Companion application.
 *
 * @module app/layout
 */

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daily Wellness Companion",
  description:
    "Your personal AI wellness companion — daily check-ins, pattern analysis, and personalized nudges",
};

/**
 * Root layout wrapping all pages with HTML structure and metadata.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
