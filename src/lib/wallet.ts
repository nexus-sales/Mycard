import crypto from "crypto";
import { dictionaries } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

interface GoogleServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

export interface WalletCardPayload {
  cardId: string;
  slug: string;
  name: string;
  jobTitle?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  avatarPath?: string | null;
  showEmail: boolean;
  showPhone: boolean;
  primaryColor?: string;
  /** Idioma de los textos del pase (por defecto español). */
  locale?: Locale;
}

/**
 * Obtiene y valida las credenciales de Google Wallet desde variables de entorno.
 * Nunca imprime la clave privada en logs.
 */
export function getWalletCredentials(): {
  issuerId: string;
  serviceAccount: GoogleServiceAccount;
} | null {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
  const rawBase64 = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON;

  if (!issuerId || !rawBase64) {
    return null;
  }

  try {
    const decoded = Buffer.from(rawBase64.trim(), "base64").toString("utf-8");
    const parsed = JSON.parse(decoded) as GoogleServiceAccount;
    if (!parsed.client_email || !parsed.private_key) {
      return null;
    }
    return { issuerId, serviceAccount: parsed };
  } catch {
    return null;
  }
}

/**
 * Genera el ID estandarizado de la clase genérica de Google Wallet
 */
export function getGenericClassId(issuerId: string): string {
  return `${issuerId}.mycard_business_card_v1`;
}

/**
 * Genera el ID determinista del Generic Object para una tarjeta
 */
export function getGenericObjectId(issuerId: string, cardId: string): string {
  return `${issuerId}.card_${cardId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

/**
 * Genera un token de acceso OAuth2 para interactuar con la Google Wallet API
 * usando JWT Bearer flow nativo (RS256).
 */
export async function getGoogleApiAccessToken(
  serviceAccount: GoogleServiceAccount
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const tokenUri = serviceAccount.token_uri || "https://oauth2.googleapis.com/token";

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const claimSet = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/wallet_object.issuer",
    aud: tokenUri,
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedClaimSet = Buffer.from(JSON.stringify(claimSet)).toString("base64url");
  const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signatureInput);
  signer.end();
  const signature = signer.sign(serviceAccount.private_key, "base64url");

  const assertion = `${signatureInput}.${signature}`;

  const response = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Fallo en autenticación con Google OAuth: ${errorBody}`);
  }

  const tokenData = (await response.json()) as { access_token: string };
  return tokenData.access_token;
}

/**
 * Construye el Generic Object según el diseño de la tarjeta
 */
export function buildGenericObjectPayload(
  issuerId: string,
  card: WalletCardPayload,
  appUrl: string
) {
  const classId = getGenericClassId(issuerId);
  const objectId = getGenericObjectId(issuerId, card.cardId);

  const locale: Locale = card.locale ?? "es";
  const w = dictionaries[locale].wallet;
  const textModulesData: Array<{ id: string; header: string; body: string }> = [];

  if (card.jobTitle?.trim()) {
    textModulesData.push({
      id: "jobTitle",
      header: w.labelJobTitle,
      body: card.jobTitle.trim(),
    });
  }

  if (card.company?.trim()) {
    textModulesData.push({
      id: "company",
      header: w.labelCompany,
      body: card.company.trim(),
    });
  }

  if (card.showEmail && card.email?.trim()) {
    textModulesData.push({
      id: "email",
      header: w.labelEmail,
      body: card.email.trim(),
    });
  }

  if (card.showPhone && card.phone?.trim()) {
    textModulesData.push({
      id: "phone",
      header: w.labelPhone,
      body: card.phone.trim(),
    });
  }

  const logoUri = card.avatarPath
    ? `${appUrl}${card.avatarPath}`
    : undefined;

  return {
    id: objectId,
    classId,
    logo: logoUri
      ? {
          sourceUri: { uri: logoUri },
          contentDescription: {
            defaultValue: { language: locale, value: card.name },
          },
        }
      : undefined,
    cardTitle: {
      defaultValue: { language: locale, value: w.passTitle },
    },
    header: {
      defaultValue: { language: locale, value: card.name },
    },
    subheader: card.company
      ? { defaultValue: { language: locale, value: card.company } }
      : undefined,
    hexBackgroundColor: card.primaryColor || "#0D4F52",
    textModulesData: textModulesData.length > 0 ? textModulesData : undefined,
    barcode: {
      type: "QR_CODE",
      value: `${appUrl}/c/${card.slug}`,
      alternateText: `${appUrl}/c/${card.slug}`,
    },
    linksModuleData: {
      uris: [
        {
          uri: `${appUrl}/c/${card.slug}`,
          description: w.openFullCard,
        },
      ],
    },
  };
}

/**
 * Crea o actualiza (PATCH) el Generic Object en la API de Google Wallet.
 * Si falla, no arroja una excepción fatal, para permitir fallback suave.
 */
export async function syncGenericObjectToGoogle(
  card: WalletCardPayload,
  appUrl: string
): Promise<{ success: boolean; objectId?: string; error?: string }> {
  const creds = getWalletCredentials();
  if (!creds) {
    return { success: false, error: "Credenciales de Google Wallet no configuradas." };
  }

  try {
    const accessToken = await getGoogleApiAccessToken(creds.serviceAccount);
    const objectPayload = buildGenericObjectPayload(creds.issuerId, card, appUrl);
    const objectId = objectPayload.id;

    // Intentar PATCH primero (si ya existe)
    const patchUrl = `https://walletobjects.googleapis.com/walletobjects/v1/genericObject/${encodeURIComponent(
      objectId
    )}`;

    const patchRes = await fetch(patchUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(objectPayload),
    });

    if (patchRes.ok) {
      return { success: true, objectId };
    }

    // Si no existe (404), crearlo mediante POST
    if (patchRes.status === 404) {
      const createUrl = "https://walletobjects.googleapis.com/walletobjects/v1/genericObject";
      const createRes = await fetch(createUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(objectPayload),
      });

      if (createRes.ok) {
        return { success: true, objectId };
      }
      const createError = await createRes.text();
      return { success: false, error: createError };
    }

    const patchError = await patchRes.text();
    return { success: false, error: patchError };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Genera la URL oficial "https://pay.google.com/gp/v/save/{jwt}" firmando el JWT con RS256
 */
export async function generateGoogleWalletSaveUrl(
  card: WalletCardPayload,
  appUrl: string
): Promise<string> {
  const creds = getWalletCredentials();
  if (!creds) {
    throw new Error(
      "Google Wallet no está configurado aún en este servidor (faltan GOOGLE_WALLET_ISSUER_ID o GOOGLE_WALLET_SERVICE_ACCOUNT_JSON)."
    );
  }

  // Sincronizar el objeto con la API primero
  await syncGenericObjectToGoogle(card, appUrl);

  const genericObject = buildGenericObjectPayload(creds.issuerId, card, appUrl);

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const payload = {
    iss: creds.serviceAccount.client_email,
    aud: "google",
    origins: [appUrl],
    typ: "savetowallet",
    payload: {
      genericObjects: [genericObject],
    },
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signatureInput);
  signer.end();
  const signature = signer.sign(creds.serviceAccount.private_key, "base64url");

  const jwt = `${signatureInput}.${signature}`;
  return `https://pay.google.com/gp/v/save/${jwt}`;
}
