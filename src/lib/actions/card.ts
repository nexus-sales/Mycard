"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import {
  cardContentUpdateSchema,
  cardSettingsUpdateSchema,
  defaultTheme,
} from "@/lib/validations";
import { processAndSaveImage, deleteOldImage, ImageUploadType, UploadError } from "@/lib/upload";
import { syncGenericObjectToGoogle } from "@/lib/wallet";
import { revalidatePath } from "next/cache";
import { getI18n } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/config";
import { translateFieldErrors } from "@/lib/i18n/dictionaries";

/**
 * Obtiene la tarjeta del usuario actual, o la inicializa si no existe aún.
 * Garantiza que cada usuario solo accede a SU PROPIA tarjeta.
 */
export async function getOrCreateUserCard() {
  const sessionUser = await requireSession();

  let card = await prisma.card.findUnique({
    where: { userId: sessionUser.id },
    include: { content: true },
  });

  if (!card) {
    // Generar un slug inicial único a partir del email o nombre
    const baseSlug = sessionUser.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 20) || "mi-tarjeta";

    let candidateSlug = baseSlug;
    if (candidateSlug.length < 3) candidateSlug = `user-${sessionUser.id.slice(0, 6)}`;

    // Comprobar colisión de slug
    const existing = await prisma.card.findUnique({ where: { slug: candidateSlug } });
    if (existing) {
      candidateSlug = `${candidateSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    card = await prisma.card.create({
      data: {
        userId: sessionUser.id,
        slug: candidateSlug,
        template: "MINIMAL",
        theme: defaultTheme,
        active: true,
        content: {
          create: {
            name: sessionUser.name,
            email: sessionUser.email,
            showEmail: true,
            showPhone: false,
            showAddress: false,
            socialLinks: [],
          },
        },
      },
      include: { content: true },
    });
  }

  return card;
}

export type UpdateCardResult = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

/**
 * Actualiza el contenido y configuración de la tarjeta.
 * Comprueba estrictamente la autorización: solo edita la tarjeta del sessionUser.
 */
export async function updateCardAction(
  _prevState: unknown,
  payload: {
    settings: {
      slug: string;
      template: "MINIMAL" | "MODERN" | "CLASSIC";
      theme: Record<string, unknown>;
      active: boolean;
      allowPublicWallet: boolean;
    };
    content: {
      name: string;
      jobTitle: string;
      company: string;
      bio: string;
      phone: string;
      email: string;
      website: string;
      address: string;
      showPhone: boolean;
      showEmail: boolean;
      showAddress: boolean;
      socialLinks: Array<{ platform: string; url: string }>;
    };
  }
): Promise<UpdateCardResult> {
  const sessionUser = await requireSession();
  const { t, locale } = await getI18n();

  // Validar datos de configuración de tarjeta
  const parsedSettings = cardSettingsUpdateSchema.safeParse(payload.settings);
  if (!parsedSettings.success) {
    return {
      error: t.actions.invalidSettings,
      fieldErrors: translateFieldErrors(t, parsedSettings.error.flatten().fieldErrors),
    };
  }

  // Validar datos de contenido
  const parsedContent = cardContentUpdateSchema.safeParse(payload.content);
  if (!parsedContent.success) {
    return {
      error: t.actions.invalidProfile,
      fieldErrors: translateFieldErrors(t, parsedContent.error.flatten().fieldErrors),
    };
  }

  // Obtener la tarjeta del usuario autenticado
  const currentCard = await prisma.card.findUnique({
    where: { userId: sessionUser.id },
  });

  if (!currentCard) {
    return { error: t.actions.cardNotFoundForUser };
  }

  // Si el slug ha cambiado, verificar que no esté ocupado por otro usuario
  if (parsedSettings.data.slug !== currentCard.slug) {
    const slugCollision = await prisma.card.findFirst({
      where: {
        slug: parsedSettings.data.slug,
        id: { not: currentCard.id },
      },
    });

    if (slugCollision) {
      return {
        error: t.actions.slugTaken,
        fieldErrors: { slug: [t.actions.slugTakenField] },
      };
    }
  }

  // Actualizar en base de datos
  const updatedCard = await prisma.card.update({
    where: { id: currentCard.id },
    data: {
      slug: parsedSettings.data.slug,
      template: parsedSettings.data.template,
      theme: parsedSettings.data.theme,
      active: parsedSettings.data.active,
      allowPublicWallet: parsedSettings.data.allowPublicWallet,
      content: {
        upsert: {
          create: {
            ...parsedContent.data,
            socialLinks: parsedContent.data.socialLinks,
          },
          update: {
            ...parsedContent.data,
            socialLinks: parsedContent.data.socialLinks,
          },
        },
      },
    },
    include: { content: true },
  });

  // Sincronizar con Google Wallet en segundo plano de forma no bloqueante
  // Si la API falla o aún no está configurada, se registra el error y no se rompe el guardado
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const rawTheme = (updatedCard.theme && typeof updatedCard.theme === "object" ? updatedCard.theme : {}) as Record<string, string>;
  
  (async () => {
    try {
      const syncResult = await syncGenericObjectToGoogle(
        {
          cardId: updatedCard.id,
          slug: updatedCard.slug,
          name: parsedContent.data.name,
          jobTitle: parsedContent.data.jobTitle,
          company: parsedContent.data.company,
          email: parsedContent.data.email,
          phone: parsedContent.data.phone,
          avatarPath: updatedCard.content?.avatarPath,
          showEmail: parsedContent.data.showEmail,
          showPhone: parsedContent.data.showPhone,
          primaryColor: rawTheme.primaryColor || "#0D4F52",
          locale,
        },
        appUrl
      );
      if (!syncResult.success && syncResult.error) {
        // Reintento sencillo
        console.warn("Reintentando sincronización de Google Wallet:", syncResult.error);
        await new Promise((r) => setTimeout(r, 1000));
        await syncGenericObjectToGoogle(
          {
            cardId: updatedCard.id,
            slug: updatedCard.slug,
            name: parsedContent.data.name,
            jobTitle: parsedContent.data.jobTitle,
            company: parsedContent.data.company,
            email: parsedContent.data.email,
            phone: parsedContent.data.phone,
            avatarPath: updatedCard.content?.avatarPath,
            showEmail: parsedContent.data.showEmail,
            showPhone: parsedContent.data.showPhone,
            primaryColor: rawTheme.primaryColor || "#0D4F52",
            locale,
          },
          appUrl
        ).catch(() => {});
      }
    } catch (walletErr) {
      console.warn("No se pudo sincronizar con Google Wallet (no crítico):", walletErr);
    }
  })();

  revalidatePath("/dashboard");
  revalidatePath(`/c/${parsedSettings.data.slug}`);
  if (currentCard.slug !== parsedSettings.data.slug) {
    revalidatePath(`/c/${currentCard.slug}`);
  }

  return { success: true };
}

/**
 * Subida segura de imagen (avatar o banner).
 * Valida MIME real, reprocesa con sharp, elimina EXIF y guarda con nombre aleatorio.
 */
export async function uploadCardImageAction(formData: FormData): Promise<{
  success?: boolean;
  publicPath?: string;
  error?: string;
}> {
  const sessionUser = await requireSession();
  const { t } = await getI18n();

  const file = formData.get("file") as File | null;
  const type = formData.get("type") as ImageUploadType | null;

  if (!file || !type || (type !== "avatar" && type !== "banner")) {
    return { error: t.actions.invalidFile };
  }

  // Obtener la tarjeta del usuario autenticado
  const card = await prisma.card.findUnique({
    where: { userId: sessionUser.id },
    include: { content: true },
  });

  if (!card) {
    return { error: t.actions.noCard };
  }

  try {
    // Procesar con sharp
    const { publicPath } = await processAndSaveImage(file, type);

    // Borrar imagen anterior si existía
    const previousPath =
      type === "avatar" ? card.content?.avatarPath : card.content?.bannerPath;
    await deleteOldImage(previousPath);

    // Actualizar en base de datos
    await prisma.cardContent.upsert({
      where: { cardId: card.id },
      create: {
        cardId: card.id,
        [type === "avatar" ? "avatarPath" : "bannerPath"]: publicPath,
      },
      update: {
        [type === "avatar" ? "avatarPath" : "bannerPath"]: publicPath,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath(`/c/${card.slug}`);

    return { success: true, publicPath };
  } catch (err: unknown) {
    console.error("Error subiendo imagen:", err);
    if (err instanceof UploadError) {
      const messages = {
        tooLarge: fmt(t.actions.uploadTooLarge, { mb: err.params.mb ?? 0 }),
        badFormat: t.actions.uploadBadFormat,
        corrupt: t.actions.uploadCorrupt,
        unsupported: t.actions.uploadUnsupported,
      };
      return { error: messages[err.code] };
    }
    return { error: t.actions.imageProcessing };
  }
}

/**
 * Elimina la imagen de avatar o banner del usuario actual
 */
export async function deleteCardImageAction(type: ImageUploadType): Promise<{
  success?: boolean;
  error?: string;
}> {
  const sessionUser = await requireSession();
  const { t } = await getI18n();

  const card = await prisma.card.findUnique({
    where: { userId: sessionUser.id },
    include: { content: true },
  });

  if (!card || !card.content) {
    return { error: t.actions.cardNotFound };
  }

  const previousPath =
    type === "avatar" ? card.content.avatarPath : card.content.bannerPath;
  await deleteOldImage(previousPath);

  await prisma.cardContent.update({
    where: { cardId: card.id },
    data: {
      [type === "avatar" ? "avatarPath" : "bannerPath"]: null,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/c/${card.slug}`);

  return { success: true };
}
