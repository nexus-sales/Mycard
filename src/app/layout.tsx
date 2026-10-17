import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MyCard — Tarjetas de visita digitales",
    template: "%s | MyCard",
  },
  description: "Tu tarjeta de visita digital, siempre disponible.",
  robots: { index: false, follow: false }, // App privada
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
