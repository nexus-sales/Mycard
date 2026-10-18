"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import {
  cardContentUpdateSchema,
  cardSettingsUpdateSchema,
  defaultTheme,
  type CardTemplateType,
} from "@/lib/validations";
import { processAndSaveImage, deleteOldImage, ImageUploadType, UploadError } from "@/lib/upload";
import { syncGenericObjectToGoogle } from "@/lib/wallet";
import { revalidatePath } from "next/cache";
import { getI18n } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/config";
import { translateFieldErrors } from "@/lib/i18n/dictionaries";
import { MAX_CARDS_PER_USER, buildSlugCandidate } from "@/lib/cards";

/**
 * Lista las tarjetas de la cuenta actual (más antiguas primero).
 * Solo devuelve tarjetas del propio usuario.
 */
export async function listUserCards() {
  const sessionUser = await requireSession();

  return prisma.card.findMany({
    where: { userId: sessionUser.id },
    orderBy: { createdAt: "asc" },
    include: { content: true },
  });
}

/**
 * Obtiene UNA tarjeta por id, comprobando que pertenece al usuario autenticado
 * (evita IDOR: un id ajeno devuelve null igual que uno inexistente).
 */
export async function getUserCard(cardId: string) {
  const sessionUser = await requireSession();

  return prisma.card.findFirst({
    where: { id: cardId, userId: sessionUser.id },
    include: { content: true },
  });
}

/** Crea una tarjeta nueva en la cuenta, respetando el límite por usuario. */
export async function createCardAction(): Promise<{ cardId?: string; error?: string }> {
  const sessionUser = await requireSession();
  const { t } = await getI18n();

  const limitError = { error: fmt(t.actions.cardLimit, { max: MAX_CARDS_PER_USER }) };

  try {
    const existing = await prisma.card.count({ where: { userId: sessionUser.id } });
    if (existing >= MAX_CARDS_PER_USER) return limitError;

    // Slug único: nombre de la cuenta y, si choca, sufijo numérico aleatorio
    let slug = "";
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = buildSlugCandidate(sessionUser.name, attempt);
      const taken = await prisma.card.findUnique({ where: { slug: candidate } });
      if (!taken) {
        slug = candidate;
        break;
      }
    }
    if (!slug) return { error: t.actions.createFailed };

    const card = await prisma.$transaction(async (tx) => {
      // Se vuelve a contar dentro de la transacción para reducir carreras de doble clic
      const count = await tx.card.count({ where: { userId: sessionUser.id } });
      if (count >= MAX_CARDS_PER_USER) return null;

      return tx.card.create({
        data: {
          userId: sessionUser.id,
          slug,
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
        select: { id: true },
      });
    });

    if (!card) return limitError;

    revalidatePath("/dashboard");
    return { cardId: card.id };
  } catch (err) {
    console.error("Error creando tarjeta:", err);
    return { error: t.actions.createFailed };
  }
}

/** Elimina una tarjeta propia (y sus imágenes subidas). */
export async function deleteCardAction(cardId: string): Promise<{ success?: boolean; error?: string }> {
  const sessionUser = await requireSession();
  const { t } = await getI18n();

  const card = await prisma.card.findFirst({
    where: { id: cardId, userId: sessionUser.id },
    include: { content: true },
  });
  if (!card) return { error: t.actions.cardNotFound };

  await prisma.card.delete({ where: { id: card.id } });
  await deleteOldImage(card.content?.avatarPath);
  await deleteOldImage(card.content?.bannerPath);

  revalidatePath("/dashboard");
  revalidatePath(`/c/${card.slug}`);
  return { success: true };
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
  cardId: string,
  payload: {
    settings: {
      slug: string;
      template: CardTemplateType;
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
  const currentCard = await prisma.card.findFirst({
    where: { id: cardId, userId: sessionUser.id },
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
  const cardId = formData.get("cardId");

  if (!file || typeof cardId !== "string" || !cardId || !type || (type !== "avatar" && type !== "banner")) {
    return { error: t.actions.invalidFile };
  }

  // Obtener la tarjeta del usuario autenticado
  const card = await prisma.card.findFirst({
    where: { id: cardId, userId: sessionUser.id },
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
export async function deleteCardImageAction(cardId: string, type: ImageUploadType): Promise<{
  success?: boolean;
  error?: string;
}> {
  const sessionUser = await requireSession();
  const { t } = await getI18n();

  const card = await prisma.card.findFirst({
    where: { id: cardId, userId: sessionUser.id },
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
