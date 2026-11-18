import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ECOVIS BPO | Manual Interativo de POPs - TI",
  description:
    "Manual Interativo de Procedimentos Operacionais Padrão (POP-001 a POP-038) da TI - ECOVIS BPO.",
verification: {
    google: "<meta name="google-site-verification" content="k8t95FNRJJQSoQ-uIJ1ErVDXInmkBsDX6PjmNGax6fg" /> I"};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-screen flex flex-col font-sans selection:bg-crimson selection:text-white">
        {children}
      </body>
    </html>
  );
}
