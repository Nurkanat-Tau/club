import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DEMO_MODE } from "@/lib/data";

export const metadata: Metadata = {
  title: { default: "Club — сообщества Шымкента", template: "%s · Club" },
  description: "Находите клубы по интересам в своём городе: бег, английский, шахматы, теннис, походы. Записывайтесь на встречи и знакомьтесь.",
  applicationName: "Club",
  appleWebApp: { capable: true, title: "Club", statusBarStyle: "default" },
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
        {DEMO_MODE && (
          <div className="bg-ink px-4 py-1.5 text-center text-xs text-bg">
            Тестовый режим без базы данных: всё введённое сотрётся при перезапуске
          </div>
        )}
        <div className="mx-auto flex min-h-full max-w-xl flex-col">{children}</div>
      </body>
    </html>
  );
}
