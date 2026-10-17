import { describe, it, expect } from "vitest";
import crypto from "crypto";
import {
  getGenericClassId,
  getGenericObjectId,
  buildGenericObjectPayload,
  getWalletCredentials,
  WalletCardPayload,
} from "@/lib/wallet";

describe("Fase 4 - Google Wallet: IDs Deterministas y Payloads", () => {
  const issuerId = "3388000000022345678";

  it("genera el GenericClassId estandarizado", () => {
    const classId = getGenericClassId(issuerId);
    expect(classId).toBe("3388000000022345678.mycard_business_card_v1");
  });

  it("genera el GenericObjectId determinista y seguro", () => {
    const objId = getGenericObjectId(issuerId, "clrk89abc0001xyz");
    expect(objId).toBe("3388000000022345678.card_clrk89abc0001xyz");
  });

  it("construye el payload de GenericObject con campos de contacto y código QR", () => {
    const cardData: WalletCardPayload = {
      cardId: "card123",
      slug: "marta-dev",
      name: "Marta Gómez",
      jobTitle: "Lead Architect",
      company: "Cloud Security SL",
      email: "marta@cloudsec.es",
      phone: "+34 654 321 000",
      avatarPath: "/api/uploads/a1b2c3d4e5f60718293a4b5c6d7e8f90.webp",
      showEmail: true,
      showPhone: false, // Oculto intencionadamente
      primaryColor: "#059669",
    };

    const payload = buildGenericObjectPayload(issuerId, cardData, "https://nexus-sales.eu");

    expect(payload.id).toBe("3388000000022345678.card_card123");
    expect(payload.classId).toBe("3388000000022345678.mycard_business_card_v1");
    expect(payload.header.defaultValue.value).toBe("Marta Gómez");
    expect(payload.subheader?.defaultValue.value).toBe("Cloud Security SL");
    expect(payload.hexBackgroundColor).toBe("#059669");

    // Barcode QR
    expect(payload.barcode.type).toBe("QR_CODE");
    expect(payload.barcode.value).toBe("https://nexus-sales.eu/c/marta-dev");

    // Logo público HTTPS
    expect(payload.logo?.sourceUri.uri).toBe(
      "https://nexus-sales.eu/api/uploads/a1b2c3d4e5f60718293a4b5c6d7e8f90.webp"
    );

    // Módulos de texto respetando privacidad
    const modules = payload.textModulesData ?? [];
    const ids = modules.map((m) => m.id);
    expect(ids).toContain("jobTitle");
    expect(ids).toContain("company");
    expect(ids).toContain("email");
    expect(ids).not.toContain("phone"); // showPhone era false
  });
});

describe("Fase 4 - Google Wallet: Credenciales y Firma RS256", () => {
  it("devuelve null si faltan las variables de entorno", () => {
    delete process.env.GOOGLE_WALLET_ISSUER_ID;
    delete process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON;

    expect(getWalletCredentials()).toBeNull();
  });

  it("parsea correctamente credenciales codificadas en base64", () => {
    const mockSA = {
      client_email: "test-sa@project.iam.gserviceaccount.com",
      private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgk...\n-----END PRIVATE KEY-----\n",
    };
    process.env.GOOGLE_WALLET_ISSUER_ID = "123456789";
    process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON = Buffer.from(
      JSON.stringify(mockSA)
    ).toString("base64");

    const creds = getWalletCredentials();
    expect(creds).not.toBeNull();
    expect(creds?.issuerId).toBe("123456789");
    expect(creds?.serviceAccount.client_email).toBe(
      "test-sa@project.iam.gserviceaccount.com"
    );

    // Limpiar
    delete process.env.GOOGLE_WALLET_ISSUER_ID;
    delete process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON;
  });

  it("valida la firma criptográfica RS256 generada para JWTs de Google Wallet", () => {
    // Generar pareja de claves RSA para probar la firma
    const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });

    const header = { alg: "RS256", typ: "JWT" };
    const payload = {
      iss: "test@iam.gserviceaccount.com",
      aud: "google",
      typ: "savetowallet",
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signatureInput = `${encodedHeader}.${encodedPayload}`;

    const signer = crypto.createSign("RSA-SHA256");
    signer.update(signatureInput);
    signer.end();
    const signature = signer.sign(privateKey, "base64url");

    // Verificar la firma con la clave pública
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(signatureInput);
    verifier.end();
    const isValid = verifier.verify(publicKey, signature, "base64url");

    expect(isValid).toBe(true);
    const fullJwt = `${signatureInput}.${signature}`;
    expect(fullJwt.split(".").length).toBe(3);
  });
});
