"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { CardTheme, defaultTheme, CardTemplateType } from "@/lib/validations";
import { updateCardAction } from "@/lib/actions/card";
import CardView from "@/components/card/CardView";
import ImageUploader from "./ImageUploader";
import QrCodeGenerator from "./QrCodeGenerator";
import GoogleWalletButton from "@/components/card/GoogleWalletButton";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";

interface InitialCardData {
  id: string;
  slug: string;
  template: CardTemplateType;
  theme: unknown;
  active: boolean;
  allowPublicWallet?: boolean;
  views: number;
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
    socialLinks: unknown;
  } | null;
}

interface CardEditorProps {
  initialCard: InitialCardData;
  appUrl: string;
}

const editorSections: Array<{ id: string; key: keyof Dictionary["editor"]["sections"] }> = [
  { id: "diseno", key: "design" },
  { id: "imagenes", key: "images" },
  { id: "perfil", key: "profile" },
  { id: "contacto", key: "contact" },
  { id: "redes", key: "social" },
  { id: "publicacion", key: "publish" },
  { id: "qr", key: "qr" },
];

export default function CardEditor({ initialCard, appUrl }: CardEditorProps) {
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const [saveStatus, setSaveStatus] = useState<{ success?: string; error?: string } | null>(null);
  const [savedSlug, setSavedSlug] = useState(initialCard.slug);
  const [savedActive, setSavedActive] = useState(initialCard.active);

  // Parsear tema inicial
  const rawTheme = (initialCard.theme && typeof initialCard.theme === "object"
    ? initialCard.theme
    : {}) as Partial<CardTheme>;

  const initialTheme: CardTheme = {
    primaryColor: rawTheme.primaryColor || defaultTheme.primaryColor,
    accentColor: rawTheme.accentColor || defaultTheme.accentColor,
    fontFamily: rawTheme.fontFamily || defaultTheme.fontFamily,
    bgMode: rawTheme.bgMode || defaultTheme.bgMode,
  };

  // Estado reactivo de Ajustes de Tarjeta
  const [slug, setSlug] = useState(initialCard.slug);
  const [template, setTemplate] = useState<CardTemplateType>(initialCard.template);
  const [theme, setTheme] = useState<CardTheme>(initialTheme);
  const [active, setActive] = useState(initialCard.active);
  const [allowPublicWallet, setAllowPublicWallet] = useState(initialCard.allowPublicWallet ?? true);

  // Estado reactivo de Contenido
  const [name, setName] = useState(initialCard.content?.name || "");
  const [jobTitle, setJobTitle] = useState(initialCard.content?.jobTitle || "");
  const [company, setCompany] = useState(initialCard.content?.company || "");
  const [bio, setBio] = useState(initialCard.content?.bio || "");
  const [phone, setPhone] = useState(initialCard.content?.phone || "");
  const [email, setEmail] = useState(initialCard.content?.email || "");
  const [website, setWebsite] = useState(initialCard.content?.website || "");
  const [address, setAddress] = useState(initialCard.content?.address || "");
  const [showPhone, setShowPhone] = useState(initialCard.content?.showPhone ?? false);
  const [showEmail, setShowEmail] = useState(initialCard.content?.showEmail ?? true);
  const [showAddress, setShowAddress] = useState(initialCard.content?.showAddress ?? false);

  // Estado de imágenes
  const [avatarPath, setAvatarPath] = useState(initialCard.content?.avatarPath || null);
  const [bannerPath, setBannerPath] = useState(initialCard.content?.bannerPath || null);

  // Estado de redes sociales
  const initialSocialLinks = Array.isArray(initialCard.content?.socialLinks)
    ? (initialCard.content?.socialLinks as unknown as Array<{ platform: string; url: string }>)
    : [];
  const [socialLinks, setSocialLinks] = useState(initialSocialLinks);

  const currentPayload = useMemo(
    () => ({
      settings: { slug, template, theme, active, allowPublicWallet },
      content: {
        name,
        jobTitle,
        company,
        bio,
        phone,
        email,
        website,
        address,
        showPhone,
        showEmail,
        showAddress,
        socialLinks,
      },
    }),
    [
      active,
      address,
      allowPublicWallet,
      bio,
      company,
      email,
      jobTitle,
      name,
      phone,
      showAddress,
      showEmail,
      showPhone,
      slug,
      socialLinks,
      template,
      theme,
      website,
    ]
  );
  const currentSnapshot = JSON.stringify(currentPayload);
  const [savedSnapshot, setSavedSnapshot] = useState(currentSnapshot);
  const hasUnsavedChanges = currentSnapshot !== savedSnapshot;

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
    };

    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [hasUnsavedChanges]);

  // Helper para añadir enlace social
  const addSocialLink = () => {
    if (socialLinks.length >= 12) return;
    setSocialLinks([...socialLinks, { platform: "LinkedIn", url: "https://" }]);
  };

  const updateSocialLink = (index: number, field: "platform" | "url", val: string) => {
    const updated = [...socialLinks];
    updated[index][field] = val;
    setSocialLinks(updated);
  };

  const removeSocialLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  };

  // Guardar cambios en servidor
  const handleSave = () => {
    setSaveStatus(null);
    const payloadToSave = currentPayload;
    const snapshotToSave = currentSnapshot;
    startTransition(async () => {
      const res = await updateCardAction(initialCard.id, payloadToSave);

      if (res.error) {
        setSaveStatus({ error: res.error });
      } else {
        setSavedSnapshot(snapshotToSave);
        setSavedSlug(payloadToSave.settings.slug);
        setSavedActive(payloadToSave.settings.active);
        setSaveStatus({ success: t.editor.saveSuccess });
      }
    });
  };

  const shareUrl = `${appUrl}/c/${savedSlug}`;

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      {/* Barra superior de estado y métricas */}
      <div className="lg:sticky lg:top-20 z-30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-paper-2/95 backdrop-blur-xl border border-ink/15 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-ink">{t.editor.title}</h1>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                savedActive ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20" : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20"
              }`}
            >
              {savedActive ? t.editor.publicActive : t.editor.hidden}
            </span>
            <span
              role="status"
              aria-live="polite"
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-semibold ${
                hasUnsavedChanges
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                  : "bg-paper text-ink-2 border-ink/15"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${hasUnsavedChanges ? "bg-amber-400" : "bg-emerald-400"}`} />
              {hasUnsavedChanges ? t.editor.unsaved : t.editor.allSaved}
            </span>
          </div>
          <p className="text-xs text-ink-2">
            {t.editor.publicLink}{" "}
            <Link
              href={`/c/${savedSlug}`}
              target="_blank"
              className="text-sea hover:underline font-mono"
            >
              /c/{savedSlug}
            </Link>
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="block text-2xl font-extrabold text-ink">{initialCard.views}</span>
            <span className="text-[11px] text-ink-2 uppercase tracking-wider font-semibold">
              {t.editor.views}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || !hasUnsavedChanges}
            className="px-5 py-2.5 rounded-xl bg-voltio hover:bg-voltio/90 disabled:opacity-50 text-basalto font-semibold text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
          >
            {isPending && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {isPending ? t.editor.saving : hasUnsavedChanges ? t.editor.save : t.editor.saved}
          </button>
        </div>
      </div>

      {/* Alerta de guardado */}
      {saveStatus?.success && !hasUnsavedChanges && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-700 dark:text-emerald-300 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {saveStatus.success}
        </div>
      )}
      {saveStatus?.error && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-medium">
          {saveStatus.error}
        </div>
      )}

      {/* Selector de pestañas para móvil */}
      <div
        role="tablist"
        aria-label={t.editor.modeLabel}
        className="sticky top-16 z-20 flex lg:hidden bg-paper-2/95 backdrop-blur-xl border border-ink/15 rounded-xl p-1 shadow-lg"
      >
        <button
          role="tab"
          aria-selected={mobileTab === "edit"}
          type="button"
          onClick={() => setMobileTab("edit")}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
            mobileTab === "edit" ? "bg-voltio text-basalto" : "text-ink-2 hover:text-ink"
          }`}
        >
          {t.editor.tabEdit}
        </button>
        <button
          role="tab"
          aria-selected={mobileTab === "preview"}
          type="button"
          onClick={() => setMobileTab("preview")}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
            mobileTab === "preview" ? "bg-voltio text-basalto" : "text-ink-2 hover:text-ink"
          }`}
        >
          {t.editor.tabPreview}
        </button>
      </div>

      {mobileTab === "edit" && (
        <nav aria-label={t.editor.sectionsLabel} className="lg:hidden -mx-4 px-4 overflow-x-auto [scrollbar-width:none]">
          <div className="flex w-max gap-2 pb-1">
            {editorSections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="min-h-11 inline-flex items-center rounded-full border border-ink/15 bg-paper-2 px-4 text-xs font-semibold text-ink-2 hover:border-sea hover:text-ink transition-colors"
              >
                {t.editor.sections[section.key]}
              </a>
            ))}
          </div>
        </nav>
      )}

      {/* Grid de 2 columnas en Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Columna Izquierda: Formulario de edición */}
        <div className={`lg:col-span-7 space-y-6 ${mobileTab === "preview" ? "hidden lg:block" : "block"}`}>
          {/* SECCIÓN 1: Plantilla y Diseño */}
          <div id="diseno" className="scroll-mt-32 bg-paper-2 border border-ink/15 rounded-2xl p-4 sm:p-6 space-y-5 shadow-lg">
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sea" />
              {t.editor.designTitle}
            </h2>

            {/* Selector de Plantilla */}
            <div>
              <label className="block text-xs font-medium text-ink-2 mb-2">
                {t.editor.chooseTemplate}
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "MINIMAL", ...t.editor.templates.MINIMAL },
                  { id: "CLASSIC", ...t.editor.templates.CLASSIC },
                  { id: "MODERN", ...t.editor.templates.MODERN },
                ].map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setTemplate(tpl.id as CardTemplateType)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      template === tpl.id
                        ? "border-sea bg-sea/10 shadow-sm"
                        : "border-ink/15 hover:border-ink/15 bg-paper/50"
                    }`}
                  >
                    <span className="block text-xs font-bold text-ink">{tpl.label}</span>
                    <span className="block text-[10px] text-ink-2 mt-0.5">{tpl.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Colores */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label htmlFor="primary-color" className="block text-xs font-medium text-ink-2 mb-1">
                  {t.editor.primaryColor}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="primary-color"
                    type="color"
                    value={theme.primaryColor}
                    onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                    className="w-9 h-9 rounded-lg bg-paper border border-ink/15 cursor-pointer"
                  />
                  <input
                    aria-label={t.editor.primaryColorHex}
                    type="text"
                    value={theme.primaryColor}
                    onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                    className="flex-1 rounded-lg bg-paper border border-ink/15 px-3 py-1.5 text-xs text-ink font-mono"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="accent-color" className="block text-xs font-medium text-ink-2 mb-1">
                  {t.editor.accentColor}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="accent-color"
                    type="color"
                    value={theme.accentColor}
                    onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                    className="w-9 h-9 rounded-lg bg-paper border border-ink/15 cursor-pointer"
                  />
                  <input
                    aria-label={t.editor.accentColorHex}
                    type="text"
                    value={theme.accentColor}
                    onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                    className="flex-1 rounded-lg bg-paper border border-ink/15 px-3 py-1.5 text-xs text-ink font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Tipografía */}
            <div>
              <label htmlFor="font-family" className="block text-xs font-medium text-ink-2 mb-1">
                {t.editor.typography}
              </label>
              <select
                id="font-family"
                value={theme.fontFamily}
                onChange={(e) => setTheme({ ...theme, fontFamily: e.target.value as "sans" | "serif" | "mono" })}
                className="w-full rounded-xl bg-paper border border-ink/15 px-3 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-sea"
              >
                <option value="sans">{t.editor.fonts.sans}</option>
                <option value="serif">{t.editor.fonts.serif}</option>
                <option value="mono">{t.editor.fonts.mono}</option>
              </select>
            </div>
          </div>

          {/* SECCIÓN 2: Imágenes (Avatar y Banner) */}
          <div id="imagenes" className="scroll-mt-32 bg-paper-2 border border-ink/15 rounded-2xl p-4 sm:p-6 space-y-5 shadow-lg">
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sea" />
              {t.editor.imagesTitle}
            </h2>

            <ImageUploader
              cardId={initialCard.id}
              type="avatar"
              label={t.editor.avatarLabel}
              helperText={t.editor.avatarHelp}
              currentPath={avatarPath}
              onImageChanged={(p) => setAvatarPath(p)}
            />

            <div className="pt-2 border-t border-ink/15">
              <ImageUploader
                cardId={initialCard.id}
                type="banner"
                label={t.editor.bannerLabel}
                helperText={t.editor.bannerHelp}
                currentPath={bannerPath}
                onImageChanged={(p) => setBannerPath(p)}
              />
            </div>
          </div>

          {/* SECCIÓN 3: Información Personal y Profesional */}
          <div id="perfil" className="scroll-mt-32 bg-paper-2 border border-ink/15 rounded-2xl p-4 sm:p-6 space-y-4 shadow-lg">
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {t.editor.profileTitle}
            </h2>

            <div>
              <label htmlFor="card-name" className="block text-xs font-medium text-ink-2 mb-1">{t.editor.fullName}</label>
              <input
                id="card-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl bg-paper border border-ink/15 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-sea"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="job-title" className="block text-xs font-medium text-ink-2 mb-1">{t.editor.jobTitle}</label>
                <input
                  id="job-title"
                  type="text"
                  placeholder={t.editor.jobTitlePlaceholder}
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full rounded-xl bg-paper border border-ink/15 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-sea"
                />
              </div>

              <div>
                <label htmlFor="company" className="block text-xs font-medium text-ink-2 mb-1">{t.editor.company}</label>
                <input
                  id="company"
                  type="text"
                  placeholder={t.editor.companyPlaceholder}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full rounded-xl bg-paper border border-ink/15 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-sea"
                />
              </div>
            </div>

            <div>
              <label htmlFor="bio" className="block text-xs font-medium text-ink-2 mb-1">{t.editor.bio}</label>
              <textarea
                id="bio"
                rows={3}
                placeholder={t.editor.bioPlaceholder}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                className="w-full rounded-xl bg-paper border border-ink/15 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-sea"
              />
              <span className="text-[10px] text-ink-3">{fmt(t.editor.bioCount, { count: bio.length })}</span>
            </div>
          </div>

          {/* SECCIÓN 4: Datos de Contacto y Toggles de Visibilidad */}
          <div id="contacto" className="scroll-mt-32 bg-paper-2 border border-ink/15 rounded-2xl p-4 sm:p-6 space-y-4 shadow-lg">
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {t.editor.contactTitle}
            </h2>
            <p className="text-xs text-ink-2">
              {t.editor.contactHelp}
            </p>

            {/* Email */}
            <div className="p-3 rounded-xl bg-paper/60 border border-ink/15 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-ink">{t.editor.contactEmail}</label>
                <label className="inline-flex items-center cursor-pointer gap-2">
                  <span className="text-[11px] text-ink-2">{showEmail ? t.editor.visible : t.editor.hiddenToggle}</span>
                  <input
                    aria-label={t.editor.showEmail}
                    type="checkbox"
                    checked={showEmail}
                    onChange={(e) => setShowEmail(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-ink-3/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600 relative" />
                </label>
              </div>
              <input
                aria-label={t.editor.contactEmail}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg bg-paper border border-ink/15 px-3 py-1.5 text-xs text-ink"
              />
            </div>

            {/* Teléfono */}
            <div className="p-3 rounded-xl bg-paper/60 border border-ink/15 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-ink">{t.editor.phone}</label>
                <label className="inline-flex items-center cursor-pointer gap-2">
                  <span className="text-[11px] text-ink-2">{showPhone ? t.editor.visible : t.editor.hiddenToggle}</span>
                  <input
                    aria-label={t.editor.showPhone}
                    type="checkbox"
                    checked={showPhone}
                    onChange={(e) => setShowPhone(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-ink-3/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600 relative" />
                </label>
              </div>
              <input
                aria-label={t.editor.phoneLabel}
                type="tel"
                placeholder="+34 600 000 000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg bg-paper border border-ink/15 px-3 py-1.5 text-xs text-ink"
              />
            </div>

            {/* Sitio Web */}
            <div>
              <label htmlFor="website" className="block text-xs font-medium text-ink-2 mb-1">{t.editor.website}</label>
              <input
                id="website"
                type="url"
                placeholder="https://example.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full rounded-xl bg-paper border border-ink/15 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-sea"
              />
            </div>

            {/* Dirección */}
            <div className="p-3 rounded-xl bg-paper/60 border border-ink/15 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-ink">{t.editor.address}</label>
                <label className="inline-flex items-center cursor-pointer gap-2">
                  <span className="text-[11px] text-ink-2">{showAddress ? t.editor.visible : t.editor.hiddenToggle}</span>
                  <input
                    aria-label={t.editor.showAddress}
                    type="checkbox"
                    checked={showAddress}
                    onChange={(e) => setShowAddress(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-ink-3/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600 relative" />
                </label>
              </div>
              <input
                aria-label={t.editor.addressLabel}
                type="text"
                placeholder={t.editor.addressPlaceholder}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-lg bg-paper border border-ink/15 px-3 py-1.5 text-xs text-ink"
              />
            </div>
          </div>

          {/* SECCIÓN 5: Redes Sociales */}
          <div id="redes" className="scroll-mt-32 bg-paper-2 border border-ink/15 rounded-2xl p-4 sm:p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-voltio" />
                {fmt(t.editor.socialTitle, { count: socialLinks.length })}
              </h2>
              <button
                type="button"
                onClick={addSocialLink}
                disabled={socialLinks.length >= 12}
                className="text-xs px-3 py-1.5 rounded-lg bg-paper hover:bg-ink-3/30 text-sea border border-ink/15 transition-colors disabled:opacity-50"
              >
                {t.editor.addLink}
              </button>
            </div>

            {socialLinks.length === 0 ? (
              <p className="text-xs text-ink-3 italic">{t.editor.noLinks}</p>
            ) : (
              <div className="space-y-3">
                {socialLinks.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      aria-label={fmt(t.editor.platformLabel, { n: idx + 1 })}
                      type="text"
                      placeholder={t.editor.platformPlaceholder}
                      value={item.platform}
                      onChange={(e) => updateSocialLink(idx, "platform", e.target.value)}
                      className="w-28 sm:w-32 rounded-lg bg-paper border border-ink/15 px-2.5 py-1.5 text-xs text-ink"
                    />
                    <input
                      aria-label={fmt(t.editor.urlLabel, { n: idx + 1 })}
                      type="url"
                      placeholder="https://..."
                      value={item.url}
                      onChange={(e) => updateSocialLink(idx, "url", e.target.value)}
                      className="flex-1 rounded-lg bg-paper border border-ink/15 px-2.5 py-1.5 text-xs text-ink font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => removeSocialLink(idx)}
                      className="p-1.5 rounded-lg text-ink-2 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                      title={t.editor.remove}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECCIÓN 6: Slug y Estado */}
          <div id="publicacion" className="scroll-mt-32 bg-paper-2 border border-ink/15 rounded-2xl p-4 sm:p-6 space-y-4 shadow-lg">
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {t.editor.urlTitle}
            </h2>

            <div>
              <label htmlFor="card-slug" className="block text-xs font-medium text-ink-2 mb-1">
                {t.editor.slugLabel}
              </label>
              <div className="flex items-center rounded-xl bg-paper border border-ink/15 overflow-hidden focus-within:ring-2 focus-within:ring-sea">
                <span className="px-3 text-xs text-ink-2 font-mono bg-paper">
                  {appUrl}/c/
                </span>
                <input
                  id="card-slug"
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  className="flex-1 bg-transparent px-3 py-2 text-sm text-ink font-mono focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <div>
                <span className="block text-xs font-semibold text-ink">{t.editor.cardActive}</span>
                <span className="block text-[11px] text-ink-2">
                  {t.editor.cardActiveHelp}
                </span>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  aria-label={t.editor.publishToggle}
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-ink-3/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sea relative" />
              </label>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-ink/15">
              <div>
                <span className="block text-xs font-semibold text-ink">
                  {t.editor.allowWallet}
                </span>
                <span className="block text-[11px] text-ink-2">
                  {t.editor.allowWalletHelp}
                </span>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  aria-label={t.editor.allowWalletToggle}
                  type="checkbox"
                  checked={allowPublicWallet}
                  onChange={(e) => setAllowPublicWallet(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-ink-3/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 relative" />
              </label>
            </div>

            {allowPublicWallet && (
              <div className="pt-3 border-t border-ink/15 space-y-2">
                <span className="block text-xs font-semibold text-ink-2">
                  {t.editor.yourPass}
                </span>
                <p className="text-[11px] text-ink-2">
                  {t.editor.yourPassHelp}
                </p>
                <div className="max-w-xs">
                  <GoogleWalletButton slug={savedSlug} cardId={initialCard.id} isOwner={true} />
                </div>
              </div>
            )}
          </div>

          {/* SECCIÓN 7: Código QR Dinámico */}
          <div id="qr" className="scroll-mt-32">
            <QrCodeGenerator url={shareUrl} slug={savedSlug} />
          </div>
        </div>

        {/* Columna Derecha: Vista Previa en Vivo */}
        <div className={`lg:col-span-5 sticky top-6 ${mobileTab === "edit" ? "hidden lg:block" : "block"}`}>
          <div className="bg-paper-2 border border-ink/15 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-ink/15">
              <span className="text-xs font-bold text-ink-2 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {t.editor.previewTitle}
              </span>
              <span className="text-[11px] text-ink-2">
                {t.editor.template} <strong className="text-ink">{t.editor.templates[template].label}</strong>
              </span>
            </div>

            {/* Marco de teléfono simulado */}
            <div className="rounded-[2.5rem] p-3 sm:p-4 bg-paper border-4 border-ink/15 shadow-inner flex justify-center">
              <CardView
                card={{
                  slug,
                  template,
                  theme,
                  active,
                  allowPublicWallet,
                }}
                content={{
                  name: name || t.editor.yourName,
                  jobTitle,
                  company,
                  bio,
                  phone,
                  email,
                  website,
                  address,
                  avatarPath,
                  bannerPath,
                  showPhone,
                  showEmail,
                  showAddress,
                  socialLinks,
                }}
                shareUrl={shareUrl}
                isOwner={true}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/15 bg-paper/95 p-3 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className={`truncate text-xs font-semibold ${hasUnsavedChanges ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"}`}>
              {hasUnsavedChanges ? t.editor.unsavedBar : t.editor.allSavedBar}
            </p>
            <p className="truncate text-[11px] text-ink-3">/c/{savedSlug}</p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || !hasUnsavedChanges}
            className="min-h-11 shrink-0 rounded-xl bg-voltio px-5 text-sm font-semibold text-basalto shadow-lg transition-colors hover:bg-voltio/90 disabled:bg-paper disabled:text-ink-3"
          >
            {isPending ? t.editor.saving : hasUnsavedChanges ? t.editor.saveShort : t.editor.saved}
          </button>
        </div>
      </div>
    </div>
  );
}
