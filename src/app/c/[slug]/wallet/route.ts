import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { generateGoogleWalletSaveUrl, WalletCardPayload } from "@/lib/wallet";
import { extractClientIp } from "@/lib/ip";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { slug } = await params;

  // 1. Rate limiting en memoria para evitar abusos o ataques de denegación
  const clientIp = extractClientIp(request.headers);

  const rl = rateLimit(`wallet_public:${clientIp}`, {
    windowMs: 60 * 1000,
    max: 15,
  });

  if (!rl.allowed) {
    const retrySeconds = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000));
    return new NextResponse("Demasiadas peticiones. Inténtalo más tarde.", {
      status: 429,
      headers: { "Retry-After": retrySeconds.toString() },
    });
  }

  // 2. Buscar tarjeta en base de datos
  const card = await prisma.card.findUnique({
    where: { slug },
    include: { content: true },
  });

  // Si no existe, no está activa o el dueño NO permite que otros la añadan a Wallet
  if (!card || !card.active || !card.allowPublicWallet || !card.content) {
    return new NextResponse("Pase no disponible", { status: 404 });
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
    return NextResponse.redirect(saveUrl);
  } catch (err: unknown) {
    console.error("Error generando enlace de Google Wallet público:", err);
    return new NextResponse("El servicio de Google Wallet no está disponible en este momento.", {
      status: 503,
    });
  }
}
