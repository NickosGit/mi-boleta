import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mi Boleta · Boleta de peso para centros de acopio",
  description:
    "Emite la boleta de peso y precio en segundos. Quien entrega material recibe su copia por WhatsApp o en papel.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1d2a24",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-MX" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col text-base">
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-10">{children}</div>
      </body>
    </html>
  );
}
