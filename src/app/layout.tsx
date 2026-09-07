import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "@fontsource/boldonse/400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Karma Food Finanzübersicht",
  description: "Interne Finanzübersicht für Karma Food",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${GeistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-cream text-ink">
        {children}
      </body>
    </html>
  );
}
