import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/settings";
import { ensureSeeded } from "@/lib/seed-data";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  await ensureSeeded(false);

  const [perangkat, guruList] = await Promise.all([
    prisma.perangkatSupervisi.findMany({
      include: {
        guru: {
          select: {
            id: true,
            nama: true,
            email: true,
            nip: true,
            mapel: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.user.findMany({
      where: { role: "guru", aktif: true },
      select: { id: true, nama: true, mapel: true, nip: true },
      orderBy: { nama: "asc" },
    }),
  ]);

  return NextResponse.json({ perangkat, guruList });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json();

    // Aksi Verifikasi Supervisor / Kepala Sekolah
    if (body.action === "verifikasi") {
      const id = String(body.id || "");
      const statusVerifikasi = String(body.statusVerifikasi || "lengkap");
      const catatanSupervisor = body.catatanSupervisor
        ? String(body.catatanSupervisor).trim()
        : null;

      if (statusVerifikasi === "revisi" && !catatanSupervisor) {
        return NextResponse.json(
          {
            error:
              "Catatan alasan perbaikan wajib diisi saat mengembalikan berkas (Perlu Revisi).",
          },
          { status: 400 }
        );
      }

      const updated = await prisma.perangkatSupervisi.update({
        where: { id },
        data: {
          statusVerifikasi,
          catatanSupervisor,
          diverifikasiOleh: session.nama,
          diverifikasiPada: new Date(),
        },
        include: {
          guru: { select: { id: true, nama: true, mapel: true } },
        },
      });

      // Sinkronkan status penugasan aktif milik guru yang sesuai
      if (statusVerifikasi === "lengkap") {
        await prisma.penugasan.updateMany({
          where: {
            guruId: updated.guruId,
            status: { in: ["menunggu_verifikasi", "perlu_revisi"] },
          },
          data: {
            status: "dalam_penilaian",
            diverifikasiOleh: session.nama,
            diverifikasiPada: new Date(),
            catatanVerifikasi: catatanSupervisor || "Berkas perangkat pembelajaran disetujui.",
          },
        });
      } else if (statusVerifikasi === "revisi") {
        await prisma.penugasan.updateMany({
          where: {
            guruId: updated.guruId,
            status: { in: ["menunggu_verifikasi", "dalam_penilaian"] },
          },
          data: {
            status: "perlu_revisi",
            diverifikasiOleh: session.nama,
            diverifikasiPada: new Date(),
            catatanVerifikasi: catatanSupervisor,
          },
        });
      }

      await logActivity({
        userId: session.userId,
        namaUser: session.nama,
        role: session.role,
        aksi: "VERIFIKASI_PERANGKAT_AJAR",
        detail: `${session.nama} memverifikasi perangkat "${updated.judulPembelajaran}" milik ${updated.guru.nama} dengan status: ${statusVerifikasi.toUpperCase()}`,
      });

      return NextResponse.json({
        success: true,
        message: `Status verifikasi perangkat ${updated.guru.nama} berhasil diperbarui (${statusVerifikasi})!`,
        perangkat: updated,
      });
    }

    // Buat atau perbarui berkas perangkat oleh Admin / Kepala Sekolah
    const id = body.id ? String(body.id) : null;
    const guruId = String(body.guruId || "");
    if (!guruId) {
      return NextResponse.json(
        { error: "Pilih guru terlebih dahulu." },
        { status: 400 }
      );
    }

    const payload = {
      guruId,
      judulPembelajaran: String(
        body.judulPembelajaran || "Modul Ajar & Perangkat Pembelajaran"
      ).trim(),
      mataPelajaran: String(body.mataPelajaran || "Umum").trim(),
      kelasFase: String(body.kelasFase || "Kelas 4 / Fase B").trim(),
      semester: String(body.semester || "Ganjil 2026/2027").trim(),
      tanggalPelaksanaan: body.tanggalPelaksanaan
        ? new Date(body.tanggalPelaksanaan)
        : new Date(),
      modulAjarJudul: String(body.modulAjarJudul || "").trim(),
      modulAjarTujuan: String(body.modulAjarTujuan || "").trim(),
      modulAjarUrl: String(body.modulAjarUrl || "").trim(),
      modulAjarFileNama: String(body.modulAjarFileNama || "").trim(),
      modulAjarStatus: Boolean(body.modulAjarStatus ?? true),
      lkpdJudul: String(body.lkpdJudul || "").trim(),
      lkpdDeskripsi: String(body.lkpdDeskripsi || "").trim(),
      lkpdUrl: String(body.lkpdUrl || "").trim(),
      lkpdFileNama: String(body.lkpdFileNama || "").trim(),
      lkpdStatus: Boolean(body.lkpdStatus ?? true),
      asesmenJenis: String(body.asesmenJenis || "Formatif & Sumatif").trim(),
      asesmenKriteria: String(body.asesmenKriteria || "").trim(),
      asesmenUrl: String(body.asesmenUrl || "").trim(),
      asesmenFileNama: String(body.asesmenFileNama || "").trim(),
      asesmenStatus: Boolean(body.asesmenStatus ?? true),
      fotoBuktiJSON:
        typeof body.fotoBuktiJSON === "string"
          ? body.fotoBuktiJSON
          : JSON.stringify(body.fotoBukti || []),
      fotoBuktiCatatan: String(body.fotoBuktiCatatan || "").trim(),
      fotoBuktiStatus: Boolean(body.fotoBuktiStatus ?? true),
      mediaJenis: String(body.mediaJenis || "").trim(),
      mediaPlatform: String(body.mediaPlatform || "").trim(),
      mediaUrl: String(body.mediaUrl || "").trim(),
      mediaDeskripsi: String(body.mediaDeskripsi || "").trim(),
      mediaStatus: Boolean(body.mediaStatus ?? true),
      refleksiKeberhasilan: String(body.refleksiKeberhasilan || "").trim(),
      refleksiKendala: String(body.refleksiKendala || "").trim(),
      refleksiTindakLanjut: String(body.refleksiTindakLanjut || "").trim(),
      refleksiStatus: Boolean(body.refleksiStatus ?? true),
      statusVerifikasi: String(body.statusVerifikasi || "lengkap"),
      catatanSupervisor: body.catatanSupervisor
        ? String(body.catatanSupervisor)
        : null,
      diverifikasiOleh: session.nama,
      diverifikasiPada: new Date(),
    };

    const saved =
      id && id !== "new"
        ? await prisma.perangkatSupervisi.update({
            where: { id },
            data: payload,
          })
        : await prisma.perangkatSupervisi.create({
            data: payload,
          });

    return NextResponse.json({
      success: true,
      message: "Data perangkat supervisi berhasil disimpan!",
      perangkat: saved,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Gagal memproses data perangkat supervisi.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "ID perangkat wajib disertakan." },
      { status: 400 }
    );
  }

  await prisma.perangkatSupervisi.delete({ where: { id } });

  return NextResponse.json({
    success: true,
    message: "Data perangkat supervisi berhasil dihapus.",
  });
}
