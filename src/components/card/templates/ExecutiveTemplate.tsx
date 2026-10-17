import React from "react";
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

export default function ExecutiveTemplate({ card, content, theme, shareUrl, vcardUrl, isOwner }: TemplateProps) {
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
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Banner o cabecera ejecutiva */}
        <div
          className="h-28 w-full relative bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700/60"
          style={{
            backgroundImage: content.bannerPath ? `url(${content.bannerPath})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
          <div
            className="absolute bottom-0 left-0 right-0 h-1"
            style={{ backgroundColor: theme.primaryColor }}
          />
        </div>

        {/* Cuerpo */}
        <div className="px-6 pb-6 pt-0 relative space-y-5">
          {/* Avatar sobrepuesto */}
          <div className="flex justify-between items-end -mt-12 mb-3">
            <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-slate-900 shadow-xl bg-slate-800">
              {content.avatarPath ? (
                <Image
                  src={content.avatarPath}
                  alt={content.name}
                  fill
                  sizes="80px"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl font-bold text-slate-400">
                  {content.name.slice(0, 2).toUpperCase() || "EX"}
                </div>
              )}
            </div>

            {content.company && (
              <span className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                {content.company}
              </span>
            )}
          </div>

          {/* Nombre y Título */}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">{content.name}</h1>
            {content.jobTitle && (
              <p className="text-sm font-medium mt-0.5" style={{ color: theme.accentColor }}>
                {content.jobTitle}
              </p>
            )}
          </div>

          {content.bio && (
            <p className="text-xs text-slate-300 leading-relaxed border-l-2 pl-3 border-slate-700">
              {content.bio}
            </p>
          )}

          {/* Tarjetas de contacto corporativas */}
          <div className="space-y-2 pt-1">
            {content.showEmail && content.email && safeEmail && (
              <a
                href={safeEmail}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-colors text-xs text-slate-200"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${theme.primaryColor}25`, color: theme.primaryColor }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="truncate">{content.email}</span>
              </a>
            )}

            {content.showPhone && content.phone && safePhone && (
              <a
                href={safePhone}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-colors text-xs text-slate-200"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${theme.primaryColor}25`, color: theme.primaryColor }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <span>{content.phone}</span>
              </a>
            )}

            {safeWebsite && (
              <a
                href={safeWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-colors text-xs text-slate-200"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${theme.primaryColor}25`, color: theme.primaryColor }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <span className="truncate">{content.website?.replace(/^https?:\/\//, "")}</span>
              </a>
            )}

            {content.showAddress && content.address && (
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${theme.primaryColor}25`, color: theme.primaryColor }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span>{content.address}</span>
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
