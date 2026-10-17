import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { generateVCardString } from "@/lib/vcard";
import { extractClientIp } from "@/lib/ip";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { slug } = await params;

  // 1. Rate limiting en memoria para evitar scraping masivo
  const clientIp = extractClientIp(request.headers);

  const rl = rateLimit(`vcard:${clientIp}`, RATE_LIMITS.vcard);
  if (!rl.allowed) {
    const retrySeconds = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000));
    return new NextResponse("Demasiadas descargas. Inténtalo más tarde.", {
      status: 429,
      headers: {
        "Retry-After": retrySeconds.toString(),
      },
    });
  }

  // 2. Buscar tarjeta en base de datos
  const card = await prisma.card.findUnique({
    where: { slug },
    include: { content: true },
  });

  // Si no existe o está desactivada: 404 genérico
  if (!card || !card.active || !card.content) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const socialLinks = Array.isArray(card.content.socialLinks)
    ? (card.content.socialLinks as unknown as Array<{ platform: string; url: string }>)
    : [];

  // 3. Generar contenido vCard 3.0 compatible con RFC
  const vcardText = await generateVCardString({
    slug: card.slug,
    name: card.content.name,
    jobTitle: card.content.jobTitle,
    company: card.content.company,
    bio: card.content.bio,
    phone: card.content.phone,
    email: card.content.email,
    website: card.content.website,
    address: card.content.address,
    avatarPath: card.content.avatarPath,
    showPhone: card.content.showPhone,
    showEmail: card.content.showEmail,
    showAddress: card.content.showAddress,
    socialLinks,
  });

  // 4. Nombre de archivo saneado a partir del slug
  const saneFilename = `${card.slug.replace(/[^a-z0-9-]/gi, "") || "contacto"}.vcf`;

  return new NextResponse(vcardText, {
    status: 200,
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${saneFilename}"`,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
