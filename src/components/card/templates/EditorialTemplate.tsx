"use client";

import React from "react";
import Image from "next/image";
import SocialLinksList from "../SocialLinksList";
import CardActionButtons from "../CardActionButtons";
import { useI18n } from "@/lib/i18n/client";
import {
  TemplateProps,
  buildContactItems,
  fontClassFor,
  initialsOf,
  legibleOn,
} from "./shared";

const PAPER = "#F0EDE6"; // cal
const INK = "#14100D"; // basalto

/** Editorial: sobria, alineada a la izquierda, con filas etiqueta/valor al estilo de una revista. */
export default function EditorialTemplate({ card, content, theme, shareUrl, vcardUrl, isOwner }: TemplateProps) {
  const { t } = useI18n();
  const contacts = buildContactItems(content);
  const labels = { email: t.card.email, phone: t.card.phone, web: t.card.web, address: t.card.address };
  // El color de acento solo se usa como texto si se lee bien sobre el papel
  const accentText = legibleOn(PAPER, theme.accentColor, INK);

  return (
    <div className={`w-full max-w-sm mx-auto p-4 sm:p-6 ${fontClassFor(theme)}`}>
      <div className="space-y-6 rounded-xl border border-basalto/10 bg-cal p-7 text-basalto shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {content.company && (
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-picon/80">{content.company}</p>
            )}
          </div>
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-cal-alt">
            {content.avatarPath ? (
              <Image src={content.avatarPath} alt={content.name} fill sizes="64px" className="object-cover" priority />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-bold text-picon">
                {initialsOf(content.name, "MC")}
              </div>
            )}
          </div>
        </div>

        <div>
          <h1 className="break-words text-3xl font-bold leading-tight tracking-tight">{content.name}</h1>
          {content.jobTitle && (
            <p className="mt-1 text-sm font-semibold" style={{ color: accentText }}>
              {content.jobTitle}
            </p>
          )}
          <div className="mt-4 h-0.5 w-12" style={{ backgroundColor: theme.primaryColor }} />
        </div>

        {content.bio && (
          <blockquote
            className="border-l-2 pl-4 text-sm italic leading-relaxed text-picon"
            style={{ borderColor: theme.primaryColor }}
          >
            {content.bio}
          </blockquote>
        )}

        {contacts.length > 0 && (
          <dl className="divide-y divide-basalto/10 border-y border-basalto/10 text-sm">
            {contacts.map((item) => (
              <div key={item.kind} className="grid grid-cols-[5.5rem_1fr] items-baseline gap-3 py-2.5">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-picon/70">{labels[item.kind]}</dt>
                <dd className="min-w-0 break-words font-medium">
                  {item.href ? (
                    <a
                      href={item.href}
                      {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="underline decoration-2 underline-offset-4 transition-opacity hover:opacity-70"
                      style={{ textDecorationColor: theme.primaryColor }}
                    >
                      {item.value}
                    </a>
                  ) : (
                    item.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <SocialLinksList links={content.socialLinks} accentColor={theme.accentColor} tone="light" />

        <CardActionButtons
          cardName={content.name}
          shareUrl={shareUrl}
          vcardUrl={vcardUrl}
          slug={card?.slug}
          allowPublicWallet={card?.allowPublicWallet}
          isOwner={isOwner}
          primaryColor={theme.primaryColor}
          tone="light"
        />
      </div>
    </div>
  );
}
