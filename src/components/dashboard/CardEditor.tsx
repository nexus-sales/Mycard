"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { CardTheme, defaultTheme, CardTemplateType } from "@/lib/validations";
import { updateCardAction } from "@/lib/actions/card";
import CardView from "@/components/card/CardView";
import ImageUploader from "./ImageUploader";
import QrCodeGenerator from "./QrCodeGenerator";
import GoogleWalletButton from "@/components/card/GoogleWalletButton";

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

const editorSections = [
  { id: "diseno", label: "Diseño" },
  { id: "imagenes", label: "Imágenes" },
  { id: "perfil", label: "Perfil" },
  { id: "contacto", label: "Contacto" },
  { id: "redes", label: "Redes" },
  { id: "publicacion", label: "Publicación" },
  { id: "qr", label: "Código QR" },
] as const;

export default function CardEditor({ initialCard, appUrl }: CardEditorProps) {
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
      const res = await updateCardAction(null, payloadToSave);

      if (res.error) {
        setSaveStatus({ error: res.error });
      } else {
        setSavedSnapshot(snapshotToSave);
        setSavedSlug(payloadToSave.settings.slug);
        setSavedActive(payloadToSave.settings.active);
        setSaveStatus({ success: "¡Tarjeta guardada y actualizada correctamente!" });
      }
    });
  };

  const shareUrl = `${appUrl}/c/${savedSlug}`;

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      {/* Barra superior de estado y métricas */}
      <div className="lg:sticky lg:top-20 z-30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Editor de Tarjeta</h1>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                savedActive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              }`}
            >
              {savedActive ? "Pública y activa" : "Oculta"}
            </span>
            <span
              role="status"
              aria-live="polite"
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-semibold ${
                hasUnsavedChanges
                  ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                  : "bg-slate-800 text-slate-300 border-slate-700"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${hasUnsavedChanges ? "bg-amber-400" : "bg-emerald-400"}`} />
              {hasUnsavedChanges ? "Cambios sin guardar" : "Todo guardado"}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Enlace público:{" "}
            <Link
              href={`/c/${savedSlug}`}
              target="_blank"
              className="text-indigo-400 hover:underline font-mono"
            >
              /c/{savedSlug}
            </Link>
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="block text-2xl font-extrabold text-white">{initialCard.views}</span>
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              Visitas registradas
            </span>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || !hasUnsavedChanges}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
          >
            {isPending && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {isPending ? "Guardando…" : hasUnsavedChanges ? "Guardar cambios" : "Guardado"}
          </button>
        </div>
      </div>

      {/* Alerta de guardado */}
      {saveStatus?.success && !hasUnsavedChanges && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {saveStatus.success}
        </div>
      )}
      {saveStatus?.error && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium">
          {saveStatus.error}
        </div>
      )}

      {/* Selector de pestañas para móvil */}
      <div
        role="tablist"
        aria-label="Modo del editor"
        className="sticky top-16 z-20 flex lg:hidden bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-xl p-1 shadow-lg"
      >
        <button
          role="tab"
          aria-selected={mobileTab === "edit"}
          type="button"
          onClick={() => setMobileTab("edit")}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
            mobileTab === "edit" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Editar información
        </button>
        <button
          role="tab"
          aria-selected={mobileTab === "preview"}
          type="button"
          onClick={() => setMobileTab("preview")}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
            mobileTab === "preview" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Vista previa en vivo
        </button>
      </div>

      {mobileTab === "edit" && (
        <nav aria-label="Secciones del editor" className="lg:hidden -mx-4 px-4 overflow-x-auto [scrollbar-width:none]">
          <div className="flex w-max gap-2 pb-1">
            {editorSections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="min-h-11 inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-4 text-xs font-semibold text-slate-300 hover:border-indigo-500 hover:text-white transition-colors"
              >
                {section.label}
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
          <div id="diseno" className="scroll-mt-32 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-5 shadow-lg">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              Plantilla y Estilo
            </h2>

            {/* Selector de Plantilla */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                Selecciona tu plantilla
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "MINIMAL", label: "Minimalista", desc: "Geométrica y sobria" },
                  { id: "CLASSIC", label: "Ejecutiva", desc: "Corporativa y formal" },
                  { id: "MODERN", label: "Creativa", desc: "Vibrante con banner" },
                ].map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setTemplate(tpl.id as CardTemplateType)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      template === tpl.id
                        ? "border-indigo-500 bg-indigo-500/10 shadow-sm"
                        : "border-slate-800 hover:border-slate-700 bg-slate-950/50"
                    }`}
                  >
                    <span className="block text-xs font-bold text-white">{tpl.label}</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">{tpl.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Colores */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label htmlFor="primary-color" className="block text-xs font-medium text-slate-300 mb-1">
                  Color Primario (Botones)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="primary-color"
                    type="color"
                    value={theme.primaryColor}
                    onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                    className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 cursor-pointer"
                  />
                  <input
                    aria-label="Código hexadecimal del color primario"
                    type="text"
                    value={theme.primaryColor}
                    onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                    className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="accent-color" className="block text-xs font-medium text-slate-300 mb-1">
                  Color Secundario (Acentos)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="accent-color"
                    type="color"
                    value={theme.accentColor}
                    onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                    className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 cursor-pointer"
                  />
                  <input
                    aria-label="Código hexadecimal del color secundario"
                    type="text"
                    value={theme.accentColor}
                    onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                    className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Tipografía */}
            <div>
              <label htmlFor="font-family" className="block text-xs font-medium text-slate-300 mb-1">
                Tipografía
              </label>
              <select
                id="font-family"
                value={theme.fontFamily}
                onChange={(e) => setTheme({ ...theme, fontFamily: e.target.value as "sans" | "serif" | "mono" })}
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="sans">Moderna Sans-Serif (Limpia y versátil)</option>
                <option value="serif">Elegante Serif (Clásica y formal)</option>
                <option value="mono">Técnica Monoespaciada (Developer / Tech)</option>
              </select>
            </div>
          </div>

          {/* SECCIÓN 2: Imágenes (Avatar y Banner) */}
          <div id="imagenes" className="scroll-mt-32 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-5 shadow-lg">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500" />
              Imágenes de Perfil
            </h2>

            <ImageUploader
              type="avatar"
              label="Avatar / Foto de perfil"
              helperText="JPEG, PNG, WebP o GIF (máx. 2MB). Reprocesada a WebP 400x400 sin EXIF."
              currentPath={avatarPath}
              onImageChanged={(p) => setAvatarPath(p)}
            />

            <div className="pt-2 border-t border-slate-800">
              <ImageUploader
                type="banner"
                label="Banner de cabecera"
                helperText="JPEG, PNG, WebP o GIF (máx. 4MB). Reprocesada a WebP 1200x400 sin EXIF."
                currentPath={bannerPath}
                onImageChanged={(p) => setBannerPath(p)}
              />
            </div>
          </div>

          {/* SECCIÓN 3: Información Personal y Profesional */}
          <div id="perfil" className="scroll-mt-32 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4 shadow-lg">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Información Personal
            </h2>

            <div>
              <label htmlFor="card-name" className="block text-xs font-medium text-slate-300 mb-1">Nombre completo *</label>
              <input
                id="card-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="job-title" className="block text-xs font-medium text-slate-300 mb-1">Cargo o especialidad</label>
                <input
                  id="job-title"
                  type="text"
                  placeholder="ej: Senior Software Engineer"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="company" className="block text-xs font-medium text-slate-300 mb-1">Empresa u organización</label>
                <input
                  id="company"
                  type="text"
                  placeholder="ej: Acme Corp"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="bio" className="block text-xs font-medium text-slate-300 mb-1">Biografía o presentación corta</label>
              <textarea
                id="bio"
                rows={3}
                placeholder="Breve resumen profesional o propuesta de valor..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-500">{bio.length}/500 caracteres</span>
            </div>
          </div>

          {/* SECCIÓN 4: Datos de Contacto y Toggles de Visibilidad */}
          <div id="contacto" className="scroll-mt-32 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4 shadow-lg">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Contacto y Privacidad
            </h2>
            <p className="text-xs text-slate-400">
              Controla qué datos serán públicos. Si un dato tiene su interruptor desactivado, no se mostrará en tu tarjeta pública.
            </p>

            {/* Email */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200">Email de contacto</label>
                <label className="inline-flex items-center cursor-pointer gap-2">
                  <span className="text-[11px] text-slate-400">{showEmail ? "Visible" : "Oculto"}</span>
                  <input
                    aria-label="Mostrar email en la tarjeta pública"
                    type="checkbox"
                    checked={showEmail}
                    onChange={(e) => setShowEmail(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600 relative" />
                </label>
              </div>
              <input
                aria-label="Email de contacto"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs text-white"
              />
            </div>

            {/* Teléfono */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200">Teléfono</label>
                <label className="inline-flex items-center cursor-pointer gap-2">
                  <span className="text-[11px] text-slate-400">{showPhone ? "Visible" : "Oculto"}</span>
                  <input
                    aria-label="Mostrar teléfono en la tarjeta pública"
                    type="checkbox"
                    checked={showPhone}
                    onChange={(e) => setShowPhone(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600 relative" />
                </label>
              </div>
              <input
                aria-label="Teléfono de contacto"
                type="tel"
                placeholder="+34 600 000 000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs text-white"
              />
            </div>

            {/* Sitio Web */}
            <div>
              <label htmlFor="website" className="block text-xs font-medium text-slate-300 mb-1">Sitio web personal o portafolio</label>
              <input
                id="website"
                type="url"
                placeholder="https://miweb.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Dirección */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200">Ubicación / Dirección</label>
                <label className="inline-flex items-center cursor-pointer gap-2">
                  <span className="text-[11px] text-slate-400">{showAddress ? "Visible" : "Oculto"}</span>
                  <input
                    aria-label="Mostrar dirección en la tarjeta pública"
                    type="checkbox"
                    checked={showAddress}
                    onChange={(e) => setShowAddress(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600 relative" />
                </label>
              </div>
              <input
                aria-label="Ubicación o dirección"
                type="text"
                placeholder="ej: Madrid, España"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs text-white"
              />
            </div>
          </div>

          {/* SECCIÓN 5: Redes Sociales */}
          <div id="redes" className="scroll-mt-32 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                Redes Sociales ({socialLinks.length}/12)
              </h2>
              <button
                type="button"
                onClick={addSocialLink}
                disabled={socialLinks.length >= 12}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition-colors disabled:opacity-50"
              >
                + Añadir enlace
              </button>
            </div>

            {socialLinks.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No has añadido enlaces sociales todavía.</p>
            ) : (
              <div className="space-y-3">
                {socialLinks.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      aria-label={`Plataforma del enlace social ${idx + 1}`}
                      type="text"
                      placeholder="Plataforma (ej: LinkedIn)"
                      value={item.platform}
                      onChange={(e) => updateSocialLink(idx, "platform", e.target.value)}
                      className="w-28 sm:w-32 rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-xs text-white"
                    />
                    <input
                      aria-label={`URL del enlace social ${idx + 1}`}
                      type="url"
                      placeholder="https://..."
                      value={item.url}
                      onChange={(e) => updateSocialLink(idx, "url", e.target.value)}
                      className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => removeSocialLink(idx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Eliminar"
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
          <div id="publicacion" className="scroll-mt-32 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4 shadow-lg">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Configuración de la URL
            </h2>

            <div>
              <label htmlFor="card-slug" className="block text-xs font-medium text-slate-300 mb-1">
                Slug (identificador de enlace público)
              </label>
              <div className="flex items-center rounded-xl bg-slate-800 border border-slate-700 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                <span className="px-3 text-xs text-slate-400 font-mono bg-slate-850">
                  {appUrl}/c/
                </span>
                <input
                  id="card-slug"
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  className="flex-1 bg-transparent px-3 py-2 text-sm text-white font-mono focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <div>
                <span className="block text-xs font-semibold text-white">Tarjeta activa</span>
                <span className="block text-[11px] text-slate-400">
                  Si la desactivas, cualquier persona que visite tu enlace verá un error 404.
                </span>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  aria-label="Publicar tarjeta"
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 relative" />
              </label>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-800">
              <div>
                <span className="block text-xs font-semibold text-white">
                  Permitir añadir a Google Wallet
                </span>
                <span className="block text-[11px] text-slate-400">
                  Muestra el botón oficial en tu tarjeta pública para que cualquier persona pueda guardarte en su teléfono.
                </span>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  aria-label="Permitir añadir la tarjeta a Google Wallet"
                  type="checkbox"
                  checked={allowPublicWallet}
                  onChange={(e) => setAllowPublicWallet(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 relative" />
              </label>
            </div>

            {allowPublicWallet && (
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <span className="block text-xs font-semibold text-slate-300">
                  Tu pase de Google Wallet
                </span>
                <p className="text-[11px] text-slate-400">
                  Añade tu propia tarjeta a Google Wallet para llevarla siempre en tu teléfono:
                </p>
                <div className="max-w-xs">
                  <GoogleWalletButton slug={savedSlug} isOwner={true} />
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
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Vista previa en vivo
              </span>
              <span className="text-[11px] text-slate-400">
                Plantilla: <strong className="text-white">{template}</strong>
              </span>
            </div>

            {/* Marco de teléfono simulado */}
            <div className="rounded-[2.5rem] p-3 sm:p-4 bg-slate-950 border-4 border-slate-800 shadow-inner flex justify-center">
              <CardView
                card={{
                  slug,
                  template,
                  theme,
                  active,
                  allowPublicWallet,
                }}
                content={{
                  name: name || "Tu Nombre",
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

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 p-3 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className={`truncate text-xs font-semibold ${hasUnsavedChanges ? "text-amber-300" : "text-emerald-300"}`}>
              {hasUnsavedChanges ? "Tienes cambios sin guardar" : "Todos los cambios están guardados"}
            </p>
            <p className="truncate text-[11px] text-slate-500">/c/{savedSlug}</p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || !hasUnsavedChanges}
            className="min-h-11 shrink-0 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500"
          >
            {isPending ? "Guardando…" : hasUnsavedChanges ? "Guardar" : "Guardado"}
          </button>
        </div>
      </div>
    </div>
  );
}
