import type { Metadata } from "next";
import "@fontsource-variable/archivo/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hero Марка Аржанникова",
  description: "Марк Аржанников — мужской стилист, преподаватель и технолог.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
