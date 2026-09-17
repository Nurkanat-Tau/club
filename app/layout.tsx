import { SITE_URL } from "@/lib/site";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Club — сообщества Шымкента", template: "%s · Club" },
  description: "Находите клубы по интересам в своём городе: бег, английский, шахматы, теннис, походы. Записывайтесь на встречи и знакомьтесь.",
  applicationName: "Club",
  appleWebApp: { capable: true, title: "Club", statusBarStyle: "default" },
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    siteName: "Club",
    locale: "ru_KZ",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Club — сообщества Шымкента" }],
  },
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#ea580c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full font-sans">
        <div className="mx-auto flex min-h-full max-w-xl flex-col md:max-w-3xl">{children}</div>
      </body>
    </html>
  );
}
