import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Metis | Agentic Glass-Box Dashboard",
  description: "AI Credit Underwriting Platform",
};

import { GlobalChatWidget } from "@/components/GlobalChatWidget";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${inter.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <body className="flex min-h-screen" suppressHydrationWarning>
        {children}
        <GlobalChatWidget />
      </body>
    </html>
  );
}
