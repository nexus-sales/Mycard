/**
 * Script de inicialización de la GenericClass de Google Wallet.
 * Ejecutar con: npm run wallet:setup
 */

import {
  getWalletCredentials,
  getGenericClassId,
  getGoogleApiAccessToken,
} from "../src/lib/wallet";

async function main() {
  console.log("🚀 Iniciando configuración de GenericClass en Google Wallet...");

  const creds = getWalletCredentials();
  if (!creds) {
    console.error("❌ ERROR: Faltan variables de entorno para Google Wallet.");
    console.error("Asegúrate de definir en tu archivo .env:");
    console.error("  - GOOGLE_WALLET_ISSUER_ID");
    console.error("  - GOOGLE_WALLET_SERVICE_ACCOUNT_JSON (en base64)");
    console.error("\nConsulta la guía WALLET.md para más instrucciones.");
    process.exit(1);
  }

  const { issuerId, serviceAccount } = creds;
  const classId = getGenericClassId(issuerId);

  console.log(`📌 Emisor ID: ${issuerId}`);
  console.log(`📌 Generic Class ID: ${classId}`);
  console.log(`🔑 Autenticando con cuenta de servicio: ${serviceAccount.client_email}...`);

  let accessToken: string;
  try {
    accessToken = await getGoogleApiAccessToken(serviceAccount);
    console.log("✅ Token de acceso OAuth2 obtenido correctamente.");
  } catch (err) {
    console.error("❌ Error de autenticación con Google OAuth:", err);
    process.exit(1);
  }

  const classPayload = {
    id: classId,
    classTemplateInfo: {
      cardTemplateOverride: {
        cardRowTemplateInfos: [
          {
            twoItems: {
              startItem: {
                firstValue: {
                  fields: [{ fieldPath: "object.textModulesData['jobTitle']" }],
                },
              },
              endItem: {
                firstValue: {
                  fields: [{ fieldPath: "object.textModulesData['company']" }],
                },
              },
            },
          },
        ],
      },
    },
  };

  const getUrl = `https://walletobjects.googleapis.com/walletobjects/v1/genericClass/${encodeURIComponent(
    classId
  )}`;

  console.log(`🔍 Comprobando si la clase ${classId} ya existe...`);
  const checkRes = await fetch(getUrl, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (checkRes.ok) {
    console.log("ℹ️ La GenericClass ya existe. Actualizando (PATCH)...");
    const patchRes = await fetch(getUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(classPayload),
    });

    if (!patchRes.ok) {
      const errText = await patchRes.text();
      console.error("❌ Fallo actualizando GenericClass:", errText);
      process.exit(1);
    }
    console.log("✅ GenericClass actualizada con éxito en Google Wallet.");
  } else if (checkRes.status === 404) {
    console.log("✨ La GenericClass no existe. Creando (POST)...");
    const createUrl = "https://walletobjects.googleapis.com/walletobjects/v1/genericClass";
    const createRes = await fetch(createUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(classPayload),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("❌ Fallo creando GenericClass:", errText);
      process.exit(1);
    }
    console.log("✅ GenericClass creada con éxito en Google Wallet.");
  } else {
    const errText = await checkRes.text();
    console.error(`❌ Error inesperado (${checkRes.status}):`, errText);
    process.exit(1);
  }

  console.log("\n🎉 ¡Configuración de Google Wallet completada con éxito!");
}

main().catch((e) => {
  console.error("Error fatal:", e);
  process.exit(1);
});
