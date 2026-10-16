import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await context.params;
  const download = req.nextUrl.searchParams.get("download") === "1";

  const podcast = await prisma.podcast.findFirst({
    where: {
      OR: [{ id }, { hasilId: id }],
    },
    include: {
      hasil: {
        include: {
          penugasan: true,
        },
      },
    },
  });

  if (!podcast) {
    return NextResponse.json(
      { error: "Data audio podcast tidak ditemukan." },
      { status: 404 }
    );
  }

  // Aturan wajib PRD Bagian 8: Guru hanya boleh mengakses audio miliknya sendiri
  if (
    session.role === "guru" &&
    podcast.hasil.penugasan.guruId !== session.userId
  ) {
    return NextResponse.json(
      {
        error:
          "Akses ditolak (403): Anda hanya diizinkan mengakses podcast milik sendiri.",
      },
      { status: 403 }
    );
  }

  if (!podcast.audioPath) {
    return NextResponse.json(
      {
        error:
          "File audio Fish Audio belum terbentuk. Pastikan API Key Fish Audio sudah diatur di Panel Admin.",
      },
      { status: 404 }
    );
  }

  const storageDir = path.join(process.cwd(), "storage", "podcast");
  const fileName = podcast.audioPath;
  const fullPath = path.join(storageDir, fileName);

  try {
    const audioBuffer = await fs.readFile(fullPath);
    const contentType = fileName.endsWith(".mp3") ? "audio/mpeg" : "audio/wav";
    const ext = contentType === "audio/mpeg" ? "mp3" : "wav";

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Content-Length": String(audioBuffer.length),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
    };

    if (download) {
      headers[
        "Content-Disposition"
      ] = `attachment; filename="Podcast_SenseiAI_${podcast.id.slice(-6)}.${ext}"`;
    }

    return new NextResponse(new Uint8Array(audioBuffer), {
      status: 200,
      headers,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "File audio Fish Audio tidak ditemukan di penyimpanan. Silakan tekan tombol Generate via Fish Audio.",
      },
      { status: 404 }
    );
  }
}
