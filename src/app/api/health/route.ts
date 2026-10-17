import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const timestamp = new Date().toISOString();

  // 1. Verificar conexión a base de datos
  let dbHealthy = false;
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    dbHealthy = true;
  } catch (err) {
    console.error("Healthcheck fallo en base de datos:", err);
  }

  // 2. Verificar acceso al volumen de uploads
  let storageHealthy = false;
  try {
    const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? "./uploads");
    await fs.mkdir(uploadDir, { recursive: true });
    storageHealthy = true;
  } catch (err) {
    console.error("Healthcheck fallo en almacenamiento:", err);
  }

  const isHealthy = dbHealthy && storageHealthy;

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp,
      checks: {
        database: dbHealthy ? "connected" : "disconnected",
        storage: storageHealthy ? "accessible" : "unreachable",
      },
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    }
  );
}
