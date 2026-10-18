"use client";

import { useState, useRef, useTransition } from "react";
import Image from "next/image";
import { uploadCardImageAction, deleteCardImageAction } from "@/lib/actions/card";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/config";
import { IMAGE_MAX_BYTES } from "@/lib/cards";

interface ImageUploaderProps {
  cardId: string;
  type: "avatar" | "banner";
  label: string;
  helperText: string;
  currentPath: string | null | undefined;
  onImageChanged: (newPath: string | null) => void;
}

export default function ImageUploader({
  cardId,
  type,
  label,
  helperText,
  currentPath,
  onImageChanged,
}: ImageUploaderProps) {
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Se comprueba antes de enviar: si el cuerpo supera el límite del servidor, la acción falla sin mensaje útil
    const maxBytes = IMAGE_MAX_BYTES[type];
    if (file.size > maxBytes) {
      setError(fmt(t.actions.uploadTooLarge, { mb: Math.round(maxBytes / (1024 * 1024)) }));
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    formData.append("cardId", cardId);

    startTransition(async () => {
      let res: Awaited<ReturnType<typeof uploadCardImageAction>>;
      try {
        res = await uploadCardImageAction(formData);
      } catch {
        setError(t.actions.imageProcessing);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      if (res.error) {
        setError(res.error);
      } else if (res.publicPath) {
        onImageChanged(res.publicPath);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  };

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const res = await deleteCardImageAction(cardId, type);
      if (res.error) {
        setError(res.error);
      } else {
        onImageChanged(null);
      }
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-ink-2 uppercase tracking-wider">
          {label}
        </label>
        {currentPath && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="text-xs text-rose-700 dark:text-rose-300 hover:text-rose-700 dark:hover:text-rose-300 disabled:opacity-50"
          >
            {t.uploader.remove}
          </button>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Preview thumbnail */}
        <div
          className={`relative overflow-hidden bg-paper border border-ink/15 shrink-0 ${
            type === "avatar" ? "w-16 h-16 rounded-2xl" : "w-32 h-16 rounded-xl"
          }`}
        >
          {currentPath ? (
            <Image
              src={currentPath}
              alt={label}
              fill
              sizes={type === "avatar" ? "64px" : "128px"}
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-ink-3 text-xs text-center p-1">
              {t.uploader.noImage}
            </div>
          )}
        </div>

        {/* Input & Botón de subida */}
        <div className="space-y-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            disabled={isPending}
            className="hidden"
            id={`file-upload-${type}`}
          />
          <label
            htmlFor={`file-upload-${type}`}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-paper hover:bg-ink-3/30 text-ink border border-ink/15 cursor-pointer transition-colors ${
              isPending ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {isPending ? t.uploader.processing : currentPath ? t.uploader.change : t.uploader.upload}
          </label>
          <p className="text-[11px] text-ink-2">{helperText}</p>
        </div>
      </div>

      {error && <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p>}
    </div>
  );
}
