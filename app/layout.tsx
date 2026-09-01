import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import LocalHashNavigation from "../components/LocalHashNavigation";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HouseStuff — Sua casa, uma tarefa por vez",
  description: "Organize as pessoas e tarefas da sua casa em um só lugar.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body className={`${geistSans.variable} ${geistMono.variable}`}><LocalHashNavigation />{children}</body></html>;
}
