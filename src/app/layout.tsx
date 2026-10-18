import type { Metadata } from "next";
import "./globals.css";
import { getI18n } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: {
      default: t.meta.defaultTitle,
      template: "%s | MyCard",
    },
    description: t.meta.description,
    robots: { index: false, follow: false }, // App privada
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale, t } = await getI18n();

  return (
    <html lang={locale}>
      <body>
        <I18nProvider locale={locale} dictionary={t}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
