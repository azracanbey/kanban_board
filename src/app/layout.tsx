import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { tr } from "@/lib/i18n/dictionaries";
import { AppProviders } from "@/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: tr["app.metadataTitle"],
  description: tr["app.metadataDesc"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta charSet="utf-8" />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--app-page)] text-[var(--app-text)]">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
