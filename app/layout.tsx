import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "JobPilot — Job hunting is hard. Your tools shouldn't be.",
  description:
    "Stop applying blind. JobPilot finds the jobs, researches the companies, and gives you everything you need to stand out.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-surface">{children}</body>
    </html>
  );
}
