import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { Providers } from "@/components/layout/providers";
import { YandexMetrikaConsent } from "@/components/analytics/yandex-metrika-consent";
import { publicSiteMetadataBase } from "@/lib/site";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["cyrillic", "latin"]
});

export const metadata: Metadata = {
  metadataBase: publicSiteMetadataBase,
  alternates: {
    canonical: "/"
  },
  robots: {
    index: true,
    follow: true
  },
  title: "Финансовое путешествие — онлайн-игра о финансовых решениях",
  description:
    "Создавайте игровые комнаты для 2–6 участников, управляйте доходами и расходами, оценивайте сделки и развивайте финансовое мышление.",
  openGraph: {
    title: "Финансовое путешествие",
    description:
      "Онлайн-игра, где каждое решение меняет ваш денежный поток и маршрут.",
    siteName: "Financial Journey",
    locale: "ru_RU",
    type: "website",
    images: [
      {
        url: "/financial-journey-board.png",
        width: 1586,
        height: 992,
        alt: "Изометрический игровой маршрут Financial Journey"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Финансовое путешествие",
    description: "Онлайн-игра для развития финансового мышления.",
    images: ["/financial-journey-board.png"]
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className={manrope.variable} suppressHydrationWarning>
        <YandexMetrikaConsent />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
