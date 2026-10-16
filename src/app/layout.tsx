import type { Metadata } from "next";
import { Nunito, Poppins } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-nunito",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Sensei-AI • Web Agent Supervisor Pendidikan",
  description:
    "Instrumen Supervisi Akademik Berbasis AI & Podcast Suara Fish Audio (Panel Admin & Guru Terpisah)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${nunito.variable} ${poppins.variable}`}>
      <body className="font-sans min-h-screen">{children}</body>
    </html>
  );
}
