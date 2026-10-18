"use client";

import React from "react";
import { useI18n } from "@/lib/i18n/client";
import Image from "next/image";
import { CardTheme, sanitizeExternalUrl, sanitizeMailtoUrl, sanitizeTelUrl } from "@/lib/validations";
import SocialLinksList from "../SocialLinksList";
import CardActionButtons from "../CardActionButtons";

interface TemplateProps {
  card?: {
    slug: string;
    active: boolean;
    allowPublicWallet?: boolean;
  };
  content: {
    name: string;
    jobTitle?: string | null;
    company?: string | null;
    bio?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    address?: string | null;
    avatarPath?: string | null;
    bannerPath?: string | null;
    showPhone: boolean;
    showEmail: boolean;
    showAddress: boolean;
    socialLinks: Array<{ platform: string; url: string }>;
  };
  theme: CardTheme;
  shareUrl: string;
  vcardUrl?: string;
  isOwner?: boolean;
}

export default function MinimalTemplate({ card, content, theme, shareUrl, vcardUrl, isOwner }: TemplateProps) {
  const { t } = useI18n();
  const fontClass =
    theme.fontFamily === "serif"
      ? "font-serif"
      : theme.fontFamily === "mono"
      ? "font-mono"
      : "font-sans";

  const safeWebsite = sanitizeExternalUrl(content.website);
  const safeEmail = sanitizeMailtoUrl(content.email);
  const safePhone = sanitizeTelUrl(content.phone);

  return (
    <div className={`w-full max-w-sm mx-auto p-4 sm:p-6 ${fontClass}`}>
      <div className="bg-basalto/90 text-cal rounded-3xl border border-cal/10 p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden space-y-6">
        {/* Glow de acento superior */}
        <div
          className="absolute -top-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ backgroundColor: theme.primaryColor }}
        />

        {/* Avatar */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 shadow-lg bg-picon" style={{ borderColor: theme.primaryColor }}>
            {content.avatarPath ? (
              <Image
                src={content.avatarPath}
                alt={content.name}
                fill
                sizes="96px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-cal/70">
                {content.name.slice(0, 2).toUpperCase() || "MC"}
              </div>
            )}
          </div>

          <div>
            <h1 className="text-xl font-bold text-cal tracking-tight">{content.name}</h1>
            {(content.jobTitle || content.company) && (
              <p className="text-xs text-cal/70 mt-0.5">
                {content.jobTitle}
                {content.jobTitle && content.company && " · "}
                {content.company}
              </p>
            )}
          </div>

          {content.bio && (
            <p className="text-xs text-cal/90 max-w-xs leading-relaxed italic">
              &ldquo;{content.bio}&rdquo;
            </p>
          )}
        </div>

        {/* Datos de contacto visibles */}
        <div className="space-y-2 text-xs divide-y divide-cal/10">
          {content.showEmail && content.email && safeEmail && (
            <div className="pt-2 flex items-center justify-between">
              <span className="text-cal/70">{t.card.email}</span>
              <a
                href={safeEmail}
                className="font-medium hover:underline truncate max-w-[200px]"
                style={{ color: theme.accentColor }}
              >
                {content.email}
              </a>
            </div>
          )}

          {content.showPhone && content.phone && safePhone && (
            <div className="pt-2 flex items-center justify-between">
              <span className="text-cal/70">{t.card.phone}</span>
              <a
                href={safePhone}
                className="font-medium hover:underline"
                style={{ color: theme.accentColor }}
              >
                {content.phone}
              </a>
            </div>
          )}

          {safeWebsite && (
            <div className="pt-2 flex items-center justify-between">
              <span className="text-cal/70">{t.card.web}</span>
              <a
                href={safeWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:underline truncate max-w-[200px]"
                style={{ color: theme.accentColor }}
              >
                {content.website?.replace(/^https?:\/\//, "")}
              </a>
            </div>
          )}

          {content.showAddress && content.address && (
            <div className="pt-2 flex items-start justify-between gap-4">
              <span className="text-cal/70 shrink-0">{t.card.address}</span>
              <span className="text-cal/90 text-right">{content.address}</span>
            </div>
          )}
        </div>

        {/* Redes sociales */}
        <SocialLinksList links={content.socialLinks} accentColor={theme.accentColor} />

        {/* Botones de acción */}
        <CardActionButtons
          cardName={content.name}
          shareUrl={shareUrl}
          vcardUrl={vcardUrl}
          slug={card?.slug}
          allowPublicWallet={card?.allowPublicWallet}
          isOwner={isOwner}
          primaryColor={theme.primaryColor}
        />
      </div>
    </div>
  );
}
