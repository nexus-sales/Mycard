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

/** Luminosa: tarjeta clara (cal) con barra de color y contactos en píldoras. */
export default function LightTemplate({ card, content, theme, shareUrl, vcardUrl, isOwner }: TemplateProps) {
  const { t } = useI18n();
  const contacts = buildContactItems(content);
  const labels = { email: t.card.email, phone: t.card.phone, web: t.card.web, address: t.card.address };

  return (
    <div className={`w-full max-w-sm mx-auto p-4 sm:p-6 ${fontClassFor(theme)}`}>
      <div className="relative overflow-hidden rounded-3xl border border-basalto/10 bg-cal text-basalto shadow-2xl">
        {/* Cabecera: banner si existe; si no, barra con los dos colores */}
        {content.bannerPath ? (
          <div
            className="h-28 w-full"
            style={{
              backgroundImage: `url(${content.bannerPath})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        ) : (
          <div
            className="h-2 w-full"
            style={{ backgroundImage: `linear-gradient(to right, ${theme.primaryColor}, ${theme.accentColor})` }}
          />
        )}

        <div className="space-y-6 px-6 pb-6 pt-7">
          <div className="flex flex-col items-center space-y-3 text-center">
            <div
              className="relative h-24 w-24 overflow-hidden rounded-full bg-cal-alt shadow-lg"
              style={{ boxShadow: `0 0 0 4px ${theme.primaryColor}` }}
            >
              {content.avatarPath ? (
                <Image src={content.avatarPath} alt={content.name} fill sizes="96px" className="object-cover" priority />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-picon">
                  {initialsOf(content.name, "MC")}
                </div>
              )}
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight">{content.name}</h1>
              {(content.jobTitle || content.company) && (
                <p className="mt-0.5 text-xs text-picon">
                  {content.jobTitle}
                  {content.jobTitle && content.company && " · "}
                  {content.company}
                </p>
              )}
            </div>

            {content.bio && <p className="max-w-xs text-xs italic leading-relaxed text-picon">&ldquo;{content.bio}&rdquo;</p>}
          </div>

          {contacts.length > 0 && (
            <ul className="space-y-2">
              {contacts.map((item) => {
                const body = (
                  <>
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: theme.primaryColor, color: readableTextColor(theme.primaryColor) }}
                    >
                      <ContactIcon kind={item.kind} className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[10px] font-semibold uppercase tracking-wider text-picon/70">
                        {labels[item.kind]}
                      </span>
                      <span className="block truncate text-xs font-medium">{item.value}</span>
                    </span>
                  </>
                );
                const rowClass = "flex items-center gap-3 rounded-2xl bg-cal-alt/70 px-3 py-2";
                return (
                  <li key={item.kind}>
                    {item.href ? (
                      <a
                        href={item.href}
                        {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className={`${rowClass} transition-colors hover:bg-cal-alt`}
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
    </div>
  );
}
