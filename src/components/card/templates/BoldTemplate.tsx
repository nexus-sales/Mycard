"use client";

import React from "react";
import Image from "next/image";
import SocialLinksList from "../SocialLinksList";
import CardActionButtons from "../CardActionButtons";
import { useI18n } from "@/lib/i18n/client";
import { readableTextColor } from "@/lib/qr";
import {
  ContactIcon,
  TemplateProps,
  buildContactItems,
  fontClassFor,
  initialsOf,
} from "./shared";

/** Impacto: cabecera grande con el color primario y nombre en tipografía pesada. */
export default function BoldTemplate({ card, content, theme, shareUrl, vcardUrl, isOwner }: TemplateProps) {
  const { t } = useI18n();
  const contacts = buildContactItems(content);
  const labels = { email: t.card.email, phone: t.card.phone, web: t.card.web, address: t.card.address };
  const headerText = readableTextColor(theme.primaryColor);

  return (
    <div className={`w-full max-w-sm mx-auto p-4 sm:p-6 ${fontClassFor(theme)}`}>
      <div className="overflow-hidden rounded-[2rem] bg-basalto text-cal shadow-2xl">
        {/* Cabecera de color */}
        <div
          className="relative px-6 pb-16 pt-8"
          style={{ backgroundColor: theme.primaryColor, color: headerText }}
        >
          {content.bannerPath && (
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-25 mix-blend-multiply"
              style={{
                backgroundImage: `url(${content.bannerPath})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          )}
          <div className="relative">
            {content.company && (
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-80">{content.company}</p>
            )}
            <h1 className="mt-3 break-words text-3xl font-black leading-[1.05] tracking-tight">{content.name}</h1>
            {content.jobTitle && <p className="mt-2 text-sm font-semibold opacity-90">{content.jobTitle}</p>}
          </div>
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-0 right-0 h-1.5"
            style={{ backgroundColor: theme.accentColor }}
          />
        </div>

        <div className="relative space-y-5 px-6 pb-6">
          {/* Avatar que cruza la cabecera */}
          <div className="-mt-10 flex justify-end">
            <div className="relative h-20 w-20 overflow-hidden rounded-2xl border-4 border-basalto bg-picon shadow-xl">
              {content.avatarPath ? (
                <Image src={content.avatarPath} alt={content.name} fill sizes="80px" className="object-cover" priority />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl font-black text-cal/70">
                  {initialsOf(content.name, "MC")}
                </div>
              )}
            </div>
          </div>

          {content.bio && <p className="text-sm leading-relaxed text-cal/80">{content.bio}</p>}

          {contacts.length > 0 && (
            <ul className="divide-y divide-cal/10 border-y border-cal/10">
              {contacts.map((item) => {
                const body = (
                  <>
                    <span style={{ color: theme.accentColor }}>
                      <ContactIcon kind={item.kind} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-cal/55">
                        {labels[item.kind]}
                      </span>
                      <span className="block truncate text-sm font-semibold text-cal">{item.value}</span>
                    </span>
                  </>
                );
                const rowClass = "flex items-center gap-3 py-3";
                return (
                  <li key={item.kind}>
                    {item.href ? (
                      <a
                        href={item.href}
                        {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className={`${rowClass} transition-opacity hover:opacity-80`}
                      >
                        {body}
                      </a>
                    ) : (
                      <div className={rowClass}>{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <SocialLinksList links={content.socialLinks} accentColor={theme.accentColor} />

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
