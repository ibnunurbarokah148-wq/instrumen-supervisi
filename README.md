# 🌸 Sensei-AI • Web Agent Supervisor Pendidikan (v2)

Implementasi penuh sesuai **PRD v2: Web Agent Supervisor Pendidikan (Admin & Guru Terpisah)**.

## ✨ Fitur Utama yang Telah Dibangun

1. **Pemisahan Penuh Role Admin & Guru (`src/middleware.ts` & Route Groups `(admin)` / `(guru)`)**:
   - **Portal Admin (`/admin/*`, Login `/admin/login`)**: Layout *control room* dengan sidebar lebar, 4 kartu statistik, indikator status koneksi API, grafik Recharts, manajemen instrumen & guru, pengaturan API terenkripsi AES-256, editor prompt/rubrik AI, template dokumen export, dan log keamanan + penghitung token/karakter TTS.
   - **Portal Guru (`/guru/*`, Login `/login`)**: Layout *mobile-first* bertema anime pastel (*sora* biru langit & *sakura* pink) dengan maskot **Sensei-AI**, navigasi bawah (`Beranda`, `Isi`, `Hasil`, `Riwayat`, `Profil`), lencana pencapaian (gamifikasi), dan fitur **Tanya Sensei-AI**.
   - **Keamanan & Isolasi Data**:
     - Guru yang membuka `/admin/*` otomatis diarahkan ke `/guru`; Admin yang membuka `/guru/*` otomatis diarahkan ke `/admin`.
     - Guru yang memanggil `/api/admin/*` ditolak dengan `403 Forbidden`.
     - API Key (OpenAI, Fish Audio, Shiroko) disimpan terenkripsi **AES-256-CBC** di database, hanya ditampilkan *masked* (`••••`) di panel Admin, dan tidak pernah dikirim ke frontend Guru.
     - Guru hanya dapat melihat, memutar podcast, dan meng-export hasil supervisi miliknya sendiri.

2. **Editor Instrumen & Versi Otomatis (`/admin/instrumen`)**:
   - Mendukung 5 tipe pertanyaan (`skala` 1-5, `pilihan_ganda`, `ya_tidak`, `isian_singkat`, `esai`) pada berbagai aspek penilaian (`Perencanaan`, `Pelaksanaan`, `Penguasaan IT`, `Evaluasi`).
   - Drag-and-drop urutan soal, duplikasi pertanyaan, **Pratinjau Tampilan Sisi Guru**, dan fitur **Buat Pertanyaan dengan AI**.
   - **Versi Otomatis**: Jika instrumen yang sudah memiliki jawaban guru diubah pertanyaannya, sistem otomatis membuat versi baru (`v+1`) agar jawaban lama tetap utuh.

3. **Alur Evaluasi AI & Sistem Podcast Fish Audio**:
   - Validasi keluaran JSON terstruktur AI dengan **Zod** (`EvaluatorOutputSchema`) dan mekanisme retry otomatis hingga 2 kali bila gagal.
   - Pemecahan naskah podcast per paragraf, pemanggilan API **Fish Audio TTS** (beserta fallback *Synthesizer Audio WAV Lokal* + *Narator Suara Browser* agar tetap berfungsi penuh saat presentasi tanpa API key berbayar), serta **Cache SHA-256** agar naskah & suara yang sama tidak di-generate ulang.
   - **Pemutar Podcast Interaktif** dengan kontrol kecepatan (`0.75x` - `1.5x`), seek bar, unduh audio, dan **transkrip yang tersorot otomatis sesuai waktu putar**.

4. **Export Dokumen (PDF, Word `.docx`, CSV/Excel, dan Massal ZIP)**:
   - Laporan PDF dan Word otomatis memuat kop surat, identitas guru, visualisasi grafik & tabel skor per aspek, kesimpulan AI, kekuatan & saran, catatan tambahan Admin, serta tanda tangan supervisor.
   - Admin dapat mengunduh rekapitulasi CSV/Excel maupun **Export Massal PDF dalam arsip ZIP**.

5. **Integrasi Bot WhatsApp Shiroko (`/api/integrasi/shiroko/*`)**:
   - `POST /api/integrasi/shiroko/notify`
   - `GET /api/integrasi/shiroko/hasil/:nomor`
   - `POST /api/integrasi/shiroko/kirim-podcast`
   - Dilindungi autentikasi header `x-api-key`.

---

## 🚀 Cara Menjalankan Aplikasi

```bash
# 1. Install dependensi
npm install

# 2. Siapkan database SQLite & muat data demo awal
npm run setup

# 3. Jalankan server development
npm run dev
```

Buka **`http://localhost:3000`** di browser.

---

## 🔑 Akun Demo Bawaan (Seed)

| Role | Halaman Login | Email / NIP | Password |
| :--- | :--- | :--- | :--- |
| **Admin** | `/admin/login` | `admin@sekolah.sch.id` | `admin123` |
| **Guru 1** | `/login` | `aulia@sekolah.sch.id` | `guru123` |
| **Guru 2** | `/login` | `rizky@sekolah.sch.id` | `guru123` |
| **Guru 3** | `/login` | `nadia@sekolah.sch.id` | `guru123` |
| **Guru 4** | `/login` | `bagas@sekolah.sch.id` | `guru123` |
