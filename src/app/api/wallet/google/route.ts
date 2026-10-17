import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { generateGoogleWalletSaveUrl, WalletCardPayload } from "@/lib/wallet";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const sessionUser = await getSession();
  if (!sessionUser) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // El usuario únicamente puede generar el pase de SU PROPIA tarjeta
  const card = await prisma.card.findUnique({
    where: { userId: sessionUser.id },
    include: { content: true },
  });

  if (!card || !card.content) {
    return NextResponse.json(
      { error: "Tarjeta no encontrada para tu usuario" },
      { status: 404 }
    );
  }

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const rawTheme = (card.theme && typeof card.theme === "object" ? card.theme : {}) as Record<string, string>;

  const payload: WalletCardPayload = {
    cardId: card.id,
    slug: card.slug,
    name: card.content.name,
    jobTitle: card.content.jobTitle,
    company: card.content.company,
    email: card.content.email,
    phone: card.content.phone,
    avatarPath: card.content.avatarPath,
    showEmail: card.content.showEmail,
    showPhone: card.content.showPhone,
    primaryColor: rawTheme.primaryColor || "#4f46e5",
  };

  try {
    const saveUrl = await generateGoogleWalletSaveUrl(payload, appUrl);

    // Si la petición viene de un click o enlace directo, redirigir
    const acceptHeader = request.headers.get("accept") || "";
    if (acceptHeader.includes("text/html")) {
      return NextResponse.redirect(saveUrl);
    }

    return NextResponse.json({ url: saveUrl });
  } catch (err: unknown) {
    console.error("Error en GET /api/wallet/google:", err);
    return NextResponse.json(
      { error: "No se pudo generar el pase de Google Wallet en este momento." },
      { status: 500 }
    );
  }
}
