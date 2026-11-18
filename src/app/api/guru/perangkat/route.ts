import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/settings";
import { ensureSeeded } from "@/lib/seed-data";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  await ensureSeeded(false);

  const list = await prisma.perangkatSupervisi.findMany({
    where: { guruId: session.userId },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ perangkat: list });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const id = body.id ? String(body.id) : null;

    const judulPembelajaran = String(
      body.judulPembelajaran || "Perangkat Pembelajaran & Modul Ajar"
    ).trim();
    const mataPelajaran = String(body.mataPelajaran || "Umum").trim();
    const kelasFase = String(body.kelasFase || "Kelas 4 / Fase B").trim();
    const semester = String(body.semester || "Ganjil 2026/2027").trim();
    const tanggalPelaksanaan = body.tanggalPelaksanaan
      ? new Date(body.tanggalPelaksanaan)
      : new Date();

    // 1. Modul Ajar / RPP
    const modulAjarJudul = String(body.modulAjarJudul || "").trim();
    const modulAjarTujuan = String(body.modulAjarTujuan || "").trim();
    const modulAjarUrl = String(body.modulAjarUrl || "").trim();
    const modulAjarFileNama = String(body.modulAjarFileNama || "").trim();
    const modulAjarStatus = Boolean(
      body.modulAjarStatus ??
        (modulAjarJudul.length > 0 ||
          modulAjarUrl.length > 0 ||
          modulAjarFileNama.length > 0)
    );

    // 2. LKPD
    const lkpdJudul = String(body.lkpdJudul || "").trim();
    const lkpdDeskripsi = String(body.lkpdDeskripsi || "").trim();
    const lkpdUrl = String(body.lkpdUrl || "").trim();
    const lkpdFileNama = String(body.lkpdFileNama || "").trim();
    const lkpdStatus = Boolean(
      body.lkpdStatus ??
        (lkpdJudul.length > 0 || lkpdUrl.length > 0 || lkpdFileNama.length > 0)
    );

    // 3. Instrumen / Rubrik Asesmen
    const asesmenJenis = String(
      body.asesmenJenis || "Formatif & Sumatif"
    ).trim();
    const asesmenKriteria = String(body.asesmenKriteria || "").trim();
    const asesmenUrl = String(body.asesmenUrl || "").trim();
    const asesmenFileNama = String(body.asesmenFileNama || "").trim();
    const asesmenStatus = Boolean(
      body.asesmenStatus ??
        (asesmenKriteria.length > 0 ||
          asesmenUrl.length > 0 ||
          asesmenFileNama.length > 0)
    );

    // 4. Foto / Bukti Pelaksanaan
    const fotoBuktiJSON =
      typeof body.fotoBuktiJSON === "string"
        ? body.fotoBuktiJSON
        : JSON.stringify(Array.isArray(body.fotoBukti) ? body.fotoBukti : []);
    const fotoBuktiCatatan = String(body.fotoBuktiCatatan || "").trim();
    let parsedFotos: unknown[] = [];
    try {
      parsedFotos = JSON.parse(fotoBuktiJSON);
    } catch {
      parsedFotos = [];
    }
    const fotoBuktiStatus = Boolean(
      body.fotoBuktiStatus ??
        (parsedFotos.length > 0 || fotoBuktiCatatan.length > 0)
    );

    // 5. Media Dokumentasi Pembelajaran
    const mediaJenis = String(body.mediaJenis || "").trim();
    const mediaPlatform = String(body.mediaPlatform || "").trim();
    const mediaUrl = String(body.mediaUrl || "").trim();
    const mediaDeskripsi = String(body.mediaDeskripsi || "").trim();
    const mediaStatus = Boolean(
      body.mediaStatus ??
        (mediaJenis.length > 0 ||
          mediaPlatform.length > 0 ||
          mediaUrl.length > 0 ||
          mediaDeskripsi.length > 0)
    );

    // 6. Catatan Refleksi Mandiri Guru
    const refleksiKeberhasilan = String(body.refleksiKeberhasilan || "").trim();
    const refleksiKendala = String(body.refleksiKendala || "").trim();
    const refleksiTindakLanjut = String(body.refleksiTindakLanjut || "").trim();
    const refleksiStatus = Boolean(
      body.refleksiStatus ??
        (refleksiKeberhasilan.length > 0 ||
          refleksiKendala.length > 0 ||
          refleksiTindakLanjut.length > 0)
    );

    const payload = {
      judulPembelajaran,
      mataPelajaran,
      kelasFase,
      semester,
      tanggalPelaksanaan,
      modulAjarJudul,
      modulAjarTujuan,
      modulAjarUrl,
      modulAjarFileNama,
      modulAjarStatus,
      lkpdJudul,
      lkpdDeskripsi,
      lkpdUrl,
      lkpdFileNama,
      lkpdStatus,
      asesmenJenis,
      asesmenKriteria,
      asesmenUrl,
      asesmenFileNama,
      asesmenStatus,
      fotoBuktiJSON,
      fotoBuktiCatatan,
      fotoBuktiStatus,
      mediaJenis,
      mediaPlatform,
      mediaUrl,
      mediaDeskripsi,
      mediaStatus,
      refleksiKeberhasilan,
      refleksiKendala,
      refleksiTindakLanjut,
      refleksiStatus,
    };

    let saved;
    if (id && id !== "new") {
      const existing = await prisma.perangkatSupervisi.findUnique({
        where: { id },
      });
      if (!existing || existing.guruId !== session.userId) {
        return NextResponse.json(
          { error: "Data perangkat tidak ditemukan atau akses ditolak." },
          { status: 404 }
        );
      }
      saved = await prisma.perangkatSupervisi.update({
        where: { id },
        data: payload,
      });
    } else {
      saved = await prisma.perangkatSupervisi.create({
        data: {
          ...payload,
          guruId: session.userId,
        },
      });
    }

    await logActivity({
      userId: session.userId,
      namaUser: session.nama,
      role: session.role,
      aksi: "SIMPAN_PERANGKAT_AJAR",
      detail: `Menyimpan administrasi modul ajar & perangkat supervisi: "${judulPembelajaran}" (${kelasFase})`,
    });

    return NextResponse.json({
      success: true,
      message: "Administrasi Modul Ajar & Perangkat Supervisi berhasil disimpan!",
      perangkat: saved,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Gagal menyimpan perangkat supervisi.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "ID perangkat wajib disertakan." },
      { status: 400 }
    );
  }

  const existing = await prisma.perangkatSupervisi.findUnique({
    where: { id },
  });
  if (!existing || existing.guruId !== session.userId) {
    return NextResponse.json(
      { error: "Data tidak ditemukan." },
      { status: 404 }
    );
  }

  await prisma.perangkatSupervisi.delete({ where: { id } });

  return NextResponse.json({
    success: true,
    message: "Berkas perangkat supervisi berhasil dihapus.",
  });
}
