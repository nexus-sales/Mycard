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

export default function CreativeTemplate({ card, content, theme, shareUrl, vcardUrl, isOwner }: TemplateProps) {
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
      <div className="bg-gradient-to-b from-basalto/95 via-basalto to-basalto text-cal rounded-[2.5rem] border border-cal/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden relative">
        {/* Banner vibrante */}
        <div
          className="h-36 w-full relative bg-picon"
          style={{
            backgroundImage: content.bannerPath
              ? `url(${content.bannerPath})`
              : `linear-gradient(135deg, ${theme.primaryColor}, ${theme.accentColor})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-basalto via-transparent to-black/30" />
        </div>

        <div className="px-6 pb-7 -mt-16 relative flex flex-col items-center text-center space-y-4">
          {/* Avatar con doble halo */}
          <div
            className="relative w-24 h-24 rounded-full p-1 bg-gradient-to-tr shadow-2xl"
            style={{
              backgroundImage: `linear-gradient(to top right, ${theme.primaryColor}, ${theme.accentColor})`,
            }}
          >
            <div className="relative w-full h-full rounded-full overflow-hidden bg-basalto">
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
                <div className="w-full h-full flex items-center justify-center text-2xl font-black text-cal/90">
                  {content.name.slice(0, 2).toUpperCase() || "CR"}
                </div>
              )}
            </div>
          </div>

          {/* Nombre y Cargo */}
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-cal">{content.name}</h1>
            {(content.jobTitle || content.company) && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-medium text-cal">
                {content.jobTitle && <span>{content.jobTitle}</span>}
                {content.jobTitle && content.company && <span className="opacity-40">•</span>}
                {content.company && <span style={{ color: theme.accentColor }}>{content.company}</span>}
              </div>
            )}
          </div>

          {content.bio && (
            <p className="text-xs text-cal/90 leading-relaxed max-w-[280px]">
              {content.bio}
            </p>
          )}

          {/* Quick Contact Chips */}
          <div className="w-full flex flex-col gap-2 pt-1 text-xs">
            {content.showEmail && content.email && safeEmail && (
              <a
                href={safeEmail}
                className="py-2.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-cal hover:text-cal transition-all flex items-center justify-between"
              >
                <span className="text-cal/70">{t.card.email}</span>
                <span className="font-semibold truncate max-w-[180px]">{content.email}</span>
              </a>
            )}

            {content.showPhone && content.phone && safePhone && (
              <a
                href={safePhone}
                className="py-2.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-cal hover:text-cal transition-all flex items-center justify-between"
              >
                <span className="text-cal/70">{t.card.phone}</span>
                <span className="font-semibold">{content.phone}</span>
              </a>
            )}

            {safeWebsite && (
              <a
                href={safeWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-cal hover:text-cal transition-all flex items-center justify-between"
              >
                <span className="text-cal/70">{t.card.web}</span>
                <span className="font-semibold truncate max-w-[180px]">
                  {content.website?.replace(/^https?:\/\//, "")}
                </span>
              </a>
            )}

            {content.showAddress && content.address && (
              <div className="py-2.5 px-4 rounded-2xl bg-white/5 border border-white/10 text-cal/90 flex items-start justify-between text-left">
                <span className="text-cal/70 shrink-0">{t.card.location}</span>
                <span className="text-right text-cal">{content.address}</span>
              </div>
            )}
          </div>

          {/* Redes */}
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
    </div>
  );
}
