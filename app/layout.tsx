import type { Metadata, Viewport } from "next";
import { inter } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Postee",
  description: "Fotografe, edite com IA e planeje seus posts do Instagram e TikTok.",
  appleWebApp: { capable: true, title: "Postee", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#0f0f14", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
