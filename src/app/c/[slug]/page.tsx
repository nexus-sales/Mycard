import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { isLikelyBot } from "@/lib/analytics";
import { extractClientIp } from "@/lib/ip";
import CardView from "@/components/card/CardView";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getI18n } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/config";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { t } = await getI18n();

  const card = await prisma.card.findUnique({
    where: { slug },
    include: { content: true },
  });

  if (!card || !card.active) {
    return {
      title: t.meta.cardNotFound,
      robots: { index: false, follow: false },
    };
  }

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const name = card.content?.name || t.meta.cardContact;
  const title = fmt(t.meta.cardTitle, { name });
  const descriptionParts = [
    card.content?.jobTitle,
    card.content?.company ? fmt(t.meta.cardDescAt, { company: card.content.company }) : null,
  ].filter(Boolean);
  const description = descriptionParts.length > 0
    ? descriptionParts.join(" ")
    : card.content?.bio || t.meta.cardDescFallback;

  const cardUrl = `${appUrl}/c/${slug}`;
  const imageUrl = card.content?.avatarPath
    ? `${appUrl}${card.content.avatarPath}`
    : card.content?.bannerPath
    ? `${appUrl}${card.content.bannerPath}`
    : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: cardUrl,
      siteName: "MyCard",
      type: "profile",
      images: imageUrl ? [{ url: imageUrl, width: 400, height: 400, alt: name }] : [],
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

export default async function PublicCardPage({ params }: PageProps) {
  const { slug } = await params;
  const headerList = await headers();
  const { t } = await getI18n();

  // 1. Rate limiting en memoria para mitigar scraping
  const clientIp = extractClientIp(headerList);

  const rl = rateLimit(`card:${clientIp}`, RATE_LIMITS.cardView);
  if (!rl.allowed) {
    return (
      <main className="min-h-screen bg-paper text-ink-2 flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-3">
          <h1 className="text-xl font-bold text-ink">{t.card.tooManyTitle}</h1>
          <p className="text-sm text-ink-2">
            {t.card.tooManyText}
          </p>
        </div>
      </main>
    );
  }

  // 2. Buscar tarjeta en base de datos
  const card = await prisma.card.findUnique({
    where: { slug },
    include: { content: true },
  });

  // Si no existe o no está activa: misma respuesta 404 genérica
  if (!card || !card.active || !card.content) {
    notFound();
  }

  // 3. Contador de visitas inteligente y estrictamente anónimo
  const userAgent = headerList.get("user-agent");
  const isBot = isLikelyBot(userAgent);

  // Si el usuario actual está logueado y es el propio dueño de la tarjeta, ignorar
  const currentSessionUser = await getSession();
  const isOwner = currentSessionUser?.id === card.userId;

  // Solo incrementamos si NO es un bot y NO es el dueño viendo su propia tarjeta
  if (!isBot && !isOwner) {
    try {
      await prisma.card.update({
        where: { id: card.id },
        data: { views: { increment: 1 } },
      });
    } catch (error) {
      // La métrica nunca debe impedir que se muestre la tarjeta.
      console.warn("Error incrementando contador de visitas:", error);
    }
  }

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const shareUrl = `${appUrl}/c/${card.slug}`;

  const socialLinks = Array.isArray(card.content.socialLinks)
    ? (card.content.socialLinks as unknown as Array<{ platform: string; url: string }>)
    : [];

  return (
    <main className="relative min-h-screen bg-paper flex flex-col items-center justify-center py-8 px-4 sm:px-6">
      <div className="absolute right-4 top-4 z-10"><LanguageSwitcher /></div>
      <CardView
        card={{
          slug: card.slug,
          template: card.template,
          theme: card.theme,
          active: card.active,
          allowPublicWallet: card.allowPublicWallet,
        }}
        content={{
          ...card.content,
          socialLinks,
        }}
        shareUrl={shareUrl}
        isOwner={isOwner}
      />
    </main>
  );
}
