import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["cyrillic", "latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://financial-journey-game.d0bby.chatgpt.site"),
  title: "Финансовое путешествие — онлайн-игра о финансовых решениях",
  description:
    "Создавайте игровые комнаты для 2–6 участников, управляйте доходами и расходами, оценивайте сделки и развивайте финансовое мышление.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Финансовое путешествие",
    description:
      "Онлайн-игра, где каждое решение меняет ваш денежный поток и маршрут.",
    url: "/",
    siteName: "Financial Journey",
    locale: "ru_RU",
    type: "website",
    images: [
      {
        url: "/financial-journey-board.png",
        width: 1586,
        height: 992,
        alt: "Изометрический игровой маршрут Financial Journey",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Финансовое путешествие",
    description: "Онлайн-игра для развития финансового мышления.",
    images: ["/financial-journey-board.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
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
      <body className={manrope.variable}>{children}</body>
    </html>
  );
}
