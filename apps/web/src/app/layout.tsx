import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { Providers } from "@/components/layout/providers";
import { YandexMetrikaConsent } from "@/components/analytics/yandex-metrika-consent";
import { publicSiteMetadataBase } from "@/lib/site";
import "./globals.css";

const socialTitle = "Финансовое путешествие — финансовая онлайн-игра";
const socialDescription =
  "Создайте комнату для 2–6 участников или начните одиночную партию с виртуальными соперниками. Принимайте решения и управляйте денежным потоком.";

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
    title: socialTitle,
    description: socialDescription,
    url: "/",
    siteName: "Финансовое путешествие",
    locale: "ru_RU",
    type: "website",
    images: [
      {
        url: "/social-preview-v2.png",
        width: 1200,
        height: 630,
        alt: "Изометрический игровой маршрут «Финансовое путешествие»"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: socialTitle,
    description: socialDescription,
    images: ["/social-preview-v2.png"]
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/logo.svg"
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
