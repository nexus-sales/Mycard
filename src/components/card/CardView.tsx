import React from "react";
import { CardTheme, CardTemplateType, defaultTheme } from "@/lib/validations";
import MinimalTemplate from "./templates/MinimalTemplate";
import ExecutiveTemplate from "./templates/ExecutiveTemplate";
import CreativeTemplate from "./templates/CreativeTemplate";
import LightTemplate from "./templates/LightTemplate";
import BoldTemplate from "./templates/BoldTemplate";
import EditorialTemplate from "./templates/EditorialTemplate";

export interface CardViewProps {
  card: {
    slug: string;
    template: CardTemplateType;
    theme: unknown;
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
  shareUrl: string;
  isOwner?: boolean;
}

export default function CardView({ card, content, shareUrl, isOwner }: CardViewProps) {
  // Asegurar theme tipado con defaults seguros
  const rawTheme = (card.theme && typeof card.theme === "object" ? card.theme : {}) as Partial<CardTheme>;
  const theme: CardTheme = {
    primaryColor: rawTheme.primaryColor || defaultTheme.primaryColor,
    accentColor: rawTheme.accentColor || defaultTheme.accentColor,
    fontFamily: rawTheme.fontFamily || defaultTheme.fontFamily,
    bgMode: rawTheme.bgMode || defaultTheme.bgMode,
  };

  const vcardUrl = `/c/${card.slug}/vcard`;

  const templateProps = { card, content, theme, shareUrl, vcardUrl, isOwner };

  switch (card.template) {
    case "LIGHT":
      return <LightTemplate {...templateProps} />;
    case "BOLD":
      return <BoldTemplate {...templateProps} />;
    case "EDITORIAL":
      return <EditorialTemplate {...templateProps} />;
    case "CLASSIC":
      return (
        <ExecutiveTemplate
          card={card}
          content={content}
          theme={theme}
          shareUrl={shareUrl}
          vcardUrl={vcardUrl}
          isOwner={isOwner}
        />
      );
    case "MODERN":
      return (
        <CreativeTemplate
          card={card}
          content={content}
          theme={theme}
          shareUrl={shareUrl}
          vcardUrl={vcardUrl}
          isOwner={isOwner}
        />
      );
    case "MINIMAL":
    default:
      return (
        <MinimalTemplate
          card={card}
          content={content}
          theme={theme}
          shareUrl={shareUrl}
          vcardUrl={vcardUrl}
          isOwner={isOwner}
        />
      );
  }
}
