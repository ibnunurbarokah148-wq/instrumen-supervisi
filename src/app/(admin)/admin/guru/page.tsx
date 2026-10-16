"use client";

import React, { useEffect, useState } from "react";
import {
  UserPlus,
  Upload,
  CalendarClock,
  KeyRound,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  X,
} from "lucide-react";

interface GuruRow {
  id: string;
  nama: string;
  email: string;
  nip: string | null;
  nomorWA: string | null;
  mapel: string | null;
  aktif: boolean;
  lastLoginAt: string | null;
  penugasan: {
    id: string;
    status: string;
    tenggat: string;
    instrumen: { id: string; judul: string; versi: number };
    hasil?: { id: string; skorTotal: number; predikat: string } | null;
  }[];
}

export default function AdminGuruPage() {
  const [guruList, setGuruList] = useState<GuruRow[]>([]);
  const [instrumenAktif, setInstrumenAktif] = useState<
    { id: string; judul: string; versi: number }[]
  >([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toast, setToast] = useState("");

  // Modal Tambah / Edit Guru
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGuru, setEditingGuru] = useState<GuruRow | null>(null);
  const [formNama, setFormNama] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formNip, setFormNip] = useState("");
  const [formMapel, setFormMapel] = useState("");
  const [formWA, setFormWA] = useState("");
  const [formPassword, setFormPassword] = useState("guru123");

  // Modal Penugasan Instrumen
  const [assignModal, setAssignModal] = useState(false);
  const [assignInstrumenId, setAssignInstrumenId] = useState("");
  const [assignTenggat, setAssignTenggat] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [assignKirimWA, setAssignKirimWA] = useState(true);

  // Modal Impor CSV
  const [csvModal, setCsvModal] = useState(false);
  const [csvText, setCsvText] = useState(
    "Dewi Sartika, S.Pd.;dewi@sekolah.sch.id;199402102020122003;Kimia;6281234567890\nAndi Wijaya, M.Pd.;andi@sekolah.sch.id;199108152019031002;Sejarah;6281234567891"
  );

  const fetchData = async () => {
    const res = await fetch("/api/admin/guru");
    if (res.ok) {
      const data = await res.json();
      setGuruList(data.guru || []);
      setInstrumenAktif(data.instrumenAktif || []);
      if (data.instrumenAktif?.[0] && !assignInstrumenId) {
        setAssignInstrumenId(data.instrumenAktif[0].id);
      }
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4500);
  };

  const openAddModal = () => {
    setEditingGuru(null);
    setFormNama("");
    setFormEmail("");
    setFormNip("");
    setFormMapel("");
    setFormWA("");
    setFormPassword("guru123");
    setModalOpen(true);
  };

  const openEditModal = (g: GuruRow) => {
    setEditingGuru(g);
    setFormNama(g.nama);
    setFormEmail(g.email);
    setFormNip(g.nip || "");
    setFormMapel(g.mapel || "");
    setFormWA(g.nomorWA || "");
    setFormPassword("");
    setModalOpen(true);
  };

  const handleSaveGuru = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGuru) {
      const res = await fetch(`/api/admin/guru/${editingGuru.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: formNama,
          email: formEmail,
          nip: formNip,
          mapel: formMapel,
          nomorWA: formWA,
          newPassword: formPassword || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToastMsg(data.message);
        setModalOpen(false);
        fetchData();
      } else {
        alert(data.error);
      }
    } else {
      const res = await fetch("/api/admin/guru", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: formNama,
          email: formEmail,
          nip: formNip,
          mapel: formMapel,
          nomorWA: formWA,
          password: formPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToastMsg(data.message);
        setModalOpen(false);
        fetchData();
      } else {
        alert(data.error);
      }
    }
  };

  const handleToggleActive = async (g: GuruRow) => {
    const res = await fetch(`/api/admin/guru/${g.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aktif: !g.aktif }),
    });
    if (res.ok) {
      showToastMsg(
        `Status akun ${g.nama} diubah menjadi ${!g.aktif ? "Aktif" : "Nonaktif"}.`
      );
      fetchData();
    }
  };

  const handleResetPassword = async (g: GuruRow) => {
    const newPass = window.prompt(
      `Masukkan password baru untuk ${g.nama}:`,
      "guru123"
    );
    if (!newPass) return;
    const res = await fetch(`/api/admin/guru/${g.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: newPass }),
    });
    const data = await res.json();
    if (res.ok) {
      showToastMsg(data.message);
    }
  };

  const handleDelete = async (g: GuruRow) => {
    if (!window.confirm(`Hapus akun guru ${g.nama}?`)) return;
    const res = await fetch(`/api/admin/guru/${g.id}`, { method: "DELETE" });
    if (res.ok) {
      showToastMsg(`Akun ${g.nama} dihapus.`);
      fetchData();
    }
  };

  const handleImportCSV = async () => {
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const rows = lines.map((line) => {
      const parts = line.includes(";") ? line.split(";") : line.split(",");
      return {
        nama: parts[0]?.trim() || "",
        email: parts[1]?.trim() || "",
        nip: parts[2]?.trim() || "",
        mapel: parts[3]?.trim() || "Umum",
        nomorWA: parts[4]?.trim() || "",
      };
    });

    const res = await fetch("/api/admin/guru", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "import_csv", rows }),
    });
    const data = await res.json();
    if (res.ok) {
      showToastMsg(data.message);
      setCsvModal(false);
      fetchData();
    } else {
      alert(data.error);
    }
  };

  const handleAssignInstrumen = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetGuruIds =
      selectedIds.length > 0 ? selectedIds : guruList.map((g) => g.id);

    const res = await fetch("/api/admin/guru", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "assign_instrumen",
        instrumenId: assignInstrumenId,
        guruIds: targetGuruIds,
        tenggat: assignTenggat,
        kirimNotifikasiWA: assignKirimWA,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      showToastMsg(data.message);
      setAssignModal(false);
      setSelectedIds([]);
      fetchData();
    } else {
      alert(data.error);
    }
  };

  const toggleSelectGuru = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          {toast}
        </div>
      )}

      {/* Header Action Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display font-bold text-lg text-slate-900">
            Manajemen Guru & Penugasan Instrumen ({guruList.length} Guru)
          </h3>
          <p className="text-xs text-slate-500">
            Kelola akun guru, impor CSV massal, dan tugaskan instrumen supervisi dengan tenggat waktu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAssignModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sakura-500 hover:bg-sakura-600 text-white text-xs font-bold shadow-sm transition"
          >
            <CalendarClock className="w-4 h-4" />
            Tugaskan Instrumen{" "}
            {selectedIds.length > 0 ? `(${selectedIds.length})` : "(Semua)"}
          </button>
          <button
            type="button"
            onClick={() => setCsvModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-sora-200 bg-sora-50 text-sora-700 hover:bg-sora-100 text-xs font-bold transition"
          >
            <Upload className="w-4 h-4" />
            Impor CSV
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition"
          >
            <UserPlus className="w-4 h-4" />
            Tambah Guru
          </button>
        </div>
      </div>

      {/* Tabel Guru (PRD Bagian 5.4) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      guruList.length > 0 &&
                      selectedIds.length === guruList.length
                    }
                    onChange={(e) =>
                      setSelectedIds(
                        e.target.checked ? guruList.map((g) => g.id) : []
                      )
                    }
                    className="rounded"
                  />
                </th>
                <th className="p-4">Nama Guru</th>
                <th className="p-4">Email / NIP</th>
                <th className="p-4">Mata Pelajaran</th>
                <th className="p-4">Status</th>
                <th className="p-4">Tugas & Hasil</th>
                <th className="p-4">Terakhir Login</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {guruList.map((g) => (
                <tr key={g.id} className="hover:bg-sora-50/30 transition">
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(g.id)}
                      onChange={() => toggleSelectGuru(g.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="p-4">
                    <p className="font-bold text-slate-900">{g.nama}</p>
                    {g.nomorWA && (
                      <p className="text-xs text-slate-400">WA: {g.nomorWA}</p>
                    )}
                  </td>
                  <td className="p-4">
                    <p className="text-xs font-semibold text-slate-700">
                      {g.email}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      NIP: {g.nip || "-"}
                    </p>
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-xl bg-sora-50 text-sora-700 text-xs font-bold">
                      {g.mapel || "Umum"}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(g)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        g.aktif
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {g.aktif ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      {g.aktif ? "Aktif" : "Nonaktif"}
                    </button>
                  </td>
                  <td className="p-4 text-xs">
                    <span className="font-bold text-slate-700">
                      {g.penugasan.length} tugas
                    </span>
                    {g.penugasan[0]?.hasil && (
                      <span className="ml-2 px-2 py-0.5 rounded-lg bg-sakura-50 text-sakura-700 font-bold">
                        Skor: {g.penugasan[0].hasil.skorTotal}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-xs text-slate-500">
                    {g.lastLoginAt
                      ? new Date(g.lastLoginAt).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Belum login"}
                  </td>
                  <td className="p-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(g)}
                        className="p-2 rounded-xl text-slate-600 hover:bg-slate-100"
                        title="Ubah Data"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResetPassword(g)}
                        className="p-2 rounded-xl text-sora-600 hover:bg-sora-50"
                        title="Reset Password"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(g)}
                        className="p-2 rounded-xl text-rose-600 hover:bg-rose-50"
                        title="Hapus Guru"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit Guru */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveGuru}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-bold text-base text-slate-900">
                {editingGuru ? "Ubah Data Guru" : "Tambah Akun Guru Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Lengkap & Gelar
              </label>
              <input
                type="text"
                required
                value={formNama}
                onChange={(e) => setFormNama(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  NIP
                </label>
                <input
                  type="text"
                  value={formNip}
                  onChange={(e) => setFormNip(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mata Pelajaran
                </label>
                <input
                  type="text"
                  required
                  value={formMapel}
                  onChange={(e) => setFormMapel(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor WhatsApp
                </label>
                <input
                  type="text"
                  value={formWA}
                  onChange={(e) => setFormWA(e.target.value)}
                  placeholder="62812..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {editingGuru
                  ? "Password Baru (Kosongkan jika tidak diubah)"
                  : "Password Awal"}
              </label>
              <input
                type="text"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-sora-500 hover:bg-sora-600 text-white text-xs font-bold"
              >
                Simpan Guru
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Penugasan Instrumen (PRD Bagian 5.4) */}
      {assignModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAssignInstrumen}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-bold text-base text-slate-900">
                Tugaskan Instrumen Supervisi ke Guru
              </h3>
              <button
                type="button"
                onClick={() => setAssignModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Menugaskan kepada:{" "}
              <strong>
                {selectedIds.length > 0
                  ? `${selectedIds.length} Guru Terpilih`
                  : `Seluruh Guru (${guruList.length} orang)`}
              </strong>
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Pilih Instrumen Aktif
              </label>
              <select
                value={assignInstrumenId}
                onChange={(e) => setAssignInstrumenId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
              >
                {instrumenAktif.map((ins) => (
                  <option key={ins.id} value={ins.id}>
                    {ins.judul} (v{ins.versi})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tenggat Waktu Pengisian
              </label>
              <input
                type="date"
                required
                value={assignTenggat}
                onChange={(e) => setAssignTenggat(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={assignKirimWA}
                onChange={(e) => setAssignKirimWA(e.target.checked)}
                className="rounded text-sora-600"
              />
              Kirim notifikasi penugasan via Bot WhatsApp Shiroko
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssignModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-sakura-500 hover:bg-sakura-600 text-white text-xs font-bold"
              >
                Kirim Penugasan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Impor CSV */}
      {csvModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-bold text-base text-slate-900">
                Impor Massal Data Guru (CSV)
              </h3>
              <button
                type="button"
                onClick={() => setCsvModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Format per baris: <code className="bg-slate-100 px-1.5 py-0.5 rounded">Nama;Email;NIP;Mapel;NomorWA</code> (Password default: <code>guru123</code>)
            </p>

            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-mono"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCsvModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleImportCSV}
                className="px-5 py-2 rounded-xl bg-sora-500 hover:bg-sora-600 text-white text-xs font-bold"
              >
                Proses Impor CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
