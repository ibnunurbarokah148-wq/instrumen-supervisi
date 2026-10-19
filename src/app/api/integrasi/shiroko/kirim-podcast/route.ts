import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getAllSettingsDecrypted, logActivity } from "@/lib/settings";

export async function POST(req: NextRequest) {
  try {
    const settings = await getAllSettingsDecrypted();
    const apiKeyHeader = req.headers.get("x-api-key") || "";

    if (
      settings.shiroko_secret &&
      apiKeyHeader !== settings.shiroko_secret
    ) {
      return NextResponse.json(
        { error: "Unauthorized: x-api-key tidak valid." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { nomorWA, hasilId, podcastId } = body;

    let podcast = null;
    if (podcastId || hasilId) {
      podcast = await prisma.podcast.findFirst({
        where: {
          OR: [
            podcastId ? { id: String(podcastId) } : undefined,
            hasilId ? { hasilId: String(hasilId) } : undefined,
          ].filter(Boolean) as { id?: string; hasilId?: string }[],
        },
        include: {
          hasil: {
            include: {
              penugasan: { include: { guru: true, instrumen: true } },
            },
          },
        },
      });
    } else if (nomorWA) {
      const cleanNomor = String(nomorWA).replace(/[^0-9]/g, "");
      const coreNumber = cleanNomor.startsWith("62")
        ? cleanNomor.slice(2)
        : cleanNomor.startsWith("0")
        ? cleanNomor.slice(1)
        : cleanNomor;
      const guru = await prisma.user.findFirst({
        where: {
          role: "guru",
          OR: [
            { nomorWA: { contains: cleanNomor } },
            { nomorWA: { contains: coreNumber } },
          ],
        },
      });
      if (guru) {
        const lastPenugasan = await prisma.penugasan.findFirst({
          where: { guruId: guru.id, status: "selesai" },
          include: {
            guru: true,
            instrumen: true,
            hasil: { include: { podcast: true } },
          },
          orderBy: { updatedAt: "desc" },
        });
        if (lastPenugasan?.hasil?.podcast) {
          podcast = {
            ...lastPenugasan.hasil.podcast,
            hasil: {
              ...lastPenugasan.hasil,
              penugasan: lastPenugasan,
            },
          };
        }
      }
    }

    if (!podcast || !podcast.audioPath) {
      return NextResponse.json(
        {
          error:
            "File audio podcast Fish Audio untuk guru tersebut belum tersedia.",
        },
        { status: 404 }
      );
    }

    const storageDir = path.join(process.cwd(), "storage", "podcast");
    const fileName = podcast.audioPath;
    const audioBuffer = await fs.readFile(path.join(storageDir, fileName));

    const guru = podcast.hasil.penugasan.guru;
    const base64Audio = audioBuffer.toString("base64");

    await logActivity({
      userId: guru.id,
      namaUser: "Bot Shiroko",
      role: "system",
      aksi: "SHIROKO_KIRIM_PODCAST",
      detail: `Mengirim file audio podcast Fish Audio ke WhatsApp ${guru.nama} (${
        guru.nomorWA || "-"
      })`,
    });

    return NextResponse.json({
      success: true,
      guru: {
        nama: guru.nama,
        nomorWA: guru.nomorWA,
      },
      instrumen: podcast.hasil.penugasan.instrumen.judul,
      skorTotal: podcast.hasil.skorTotal,
      predikat: podcast.hasil.predikat,
      durasiDetik: podcast.durasi,
      mimeType: fileName.endsWith(".mp3") ? "audio/mpeg" : "audio/wav",
      fileName,
      audioBase64: base64Audio,
      caption: `🌸 *Podcast Evaluasi Sensei-AI*\nHalo ${guru.nama}-sensei! Berikut rekaman podcast hasil supervisi *${podcast.hasil.penugasan.instrumen.judul}* (Skor: *${podcast.hasil.skorTotal}/100 - ${podcast.hasil.predikat}*). Selamat mendengarkan! ✨`,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
