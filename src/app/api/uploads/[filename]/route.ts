import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { getSafeUploadFilePath } from "@/lib/upload";

interface RouteParams {
  params: Promise<{ filename: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { filename } = await params;

  const filePath = getSafeUploadFilePath(filename);
  if (!filePath) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const fileBuffer = await fs.readFile(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return new NextResponse("Not Found", { status: 404 });
    }
    console.error("Error sirviendo imagen:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
