# PRD v2: Web Agent Supervisor Pendidikan

**Revisi:** dashboard Admin dan dashboard Guru dipisah total (role, route, UI, dan hak akses berbeda). **Tujuan dokumen:** bahan vibe coding (UI/UX, frontend, backend, tools, bahan yang perlu disiapkan).

## 1. Ringkasan Produk

Web **Agent Supervisor** adalah instrumen supervisi berbasis IT dengan sentuhan wibu. Guru mengisi instrumen supervisi (pertanyaan/angket), lalu AI (OpenAI-compatible) menyimpulkan dan mengevaluasi jawabannya, memberi skor dan saran. Saran dibacakan lewat sistem **podcast** dengan TTS **Fish Audio** (suara sample buatan sendiri). Hasil bisa diexport ke PDF/Word dan audio podcast. Admin mengatur seluruh sistem lewat panel terpisah.

**Karakter maskot:** agent supervisor bergaya anime (nama bebas, mis. "Sensei-AI"). Gaya bahasa AI sopan, hangat, sedikit nuansa wibu (sapaan "Sensei", emoji secukupnya), tetap profesional karena ini dokumen supervisi.

## 2. Pemisahan Role

Satu aplikasi, dua area yang benar-benar terpisah.

| Aspek | Admin | Guru |
| --- | --- | --- |
| Tujuan | Mengelola sistem dan memantau semua guru | Mengisi supervisi dan melihat hasil sendiri |
| URL | `/admin/*` | `/guru/*` |
| Login | `/admin/login` | `/login` |
| Layout | Sidebar lebar, tabel, grafik, form konfigurasi | Sederhana, mobile-first, bergaya kartu |
| Data yang terlihat | Semua guru, semua hasil | Hanya data milik sendiri |
| Pengaturan API | Ya (OpenAI, Fish Audio, Shiroko) | Tidak, tidak boleh terlihat sama sekali |

**Aturan akses (wajib):**

- Token/session membawa field `role` (`admin` atau `guru`).
- Middleware backend menolak (403) guru yang memanggil endpoint `/api/admin/*`.
- Frontend: guru yang membuka `/admin/*` diarahkan ke `/guru`; admin yang membuka `/guru/*` diarahkan ke `/admin`.
- API key (OpenAI, Fish Audio) tidak pernah dikirim ke frontend guru. Semua panggilan AI dan TTS lewat backend.
- Akun admin dibuat lewat seed/env saat deploy. Akun guru dibuat oleh admin (atau daftar mandiri dengan persetujuan admin, opsional).

## 3. Tech Stack yang Disarankan

- **Frontend:** Next.js (App Router) + Tailwind CSS + shadcn/ui. Grafik: Recharts. Dua route group: `(admin)` dan `(guru)`, masing-masing punya layout sendiri.
- **Backend:** route handler Next.js atau Node.js + Express (pilih satu, jangan campur). Validasi dengan Zod.
- **Database:** SQLite (via Prisma) untuk tugas kuliah, mudah dipindah ke PostgreSQL.
- **Auth:** JWT di httpOnly cookie, password di-hash bcrypt.
- **AI:** SDK `openai` dengan `baseURL` dan `apiKey` dari konfigurasi admin (OpenAI-compatible).
- **TTS:** Fish Audio API (key, reference/voice ID, dan parameter dari konfigurasi admin).
- **Export:** `pdfkit` atau `puppeteer` untuk PDF, `docx` (npm) untuk Word.
- **Audio:** simpan file mp3/wav di folder `/storage/podcast`, dilayani lewat endpoint ber-auth.
- **Desain UI:** Google Stitch (prompt ada di bagian 12).

## 4. Alur Utama

1. Admin login, mengisi konfigurasi API, membuat/menyusun instrumen (set pertanyaan), membuat akun guru.
2. Guru login, memilih instrumen yang ditugaskan, mengisi jawaban.
3. Guru submit, backend mengirim jawaban ke AI untuk evaluasi (skor per aspek, kesimpulan, saran).
4. Backend membuat naskah podcast dari hasil evaluasi, lalu memanggil Fish Audio untuk menghasilkan audio.
5. Guru melihat hasil, mendengar podcast, dan mengunduh PDF/Word/audio.
6. Admin melihat rekap, grafik, dan bisa membuka hasil semua guru.

## 5. Fitur Dashboard ADMIN (`/admin`)

### 5.1 Beranda Admin

- Kartu statistik: total guru, total supervisi masuk, rata-rata skor, jumlah podcast terbuat, status koneksi API (OpenAI, Fish Audio, Shiroko).
- Grafik ringkas: tren supervisi per minggu, rata-rata skor per aspek.

### 5.2 Pengaturan API

- **OpenAI-compatible:** base URL, API key (disamarkan, tombol tampilkan), nama model, temperature, max tokens. Tombol **Tes Koneksi**.
- **Fish Audio:** API key, ID suara (reference ID dari sample suara), model/backend, format output, kecepatan bicara, serta parameter Fish Audio lain yang relevan (mis. temperature, top\_p, normalisasi teks, chunk length). Tombol **Tes Suara** dengan teks contoh.
- **Integrasi Shiroko:** URL endpoint bot, secret/token, toggle aktif/nonaktif, tombol uji kirim pesan.
- Semua key disimpan terenkripsi (AES) di database atau hanya di env; tidak pernah dikembalikan utuh lewat API (hanya masked).

### 5.3 Editor Pertanyaan (Instrumen)

- CRUD instrumen (judul, deskripsi, status aktif/draft).
- CRUD pertanyaan dalam instrumen: teks pertanyaan, tipe (skala 1-5, pilihan ganda, ya/tidak, isian singkat, esai), aspek penilaian (mis. perencanaan, pelaksanaan, evaluasi, penguasaan IT), bobot, wajib/tidak.
- Drag and drop untuk urutan, duplikasi pertanyaan, pratinjau tampilan sisi guru.
- Opsi **Buat pertanyaan dengan AI** (admin memberi topik, AI menyarankan daftar pertanyaan, admin edit lalu simpan).
- Versi instrumen: perubahan pada instrumen yang sudah punya jawaban membuat versi baru, jawaban lama tetap utuh.

### 5.4 Manajemen Guru

- Tabel guru: nama, email/NIP, mata pelajaran, status, terakhir login.
- Tambah, ubah, nonaktifkan, reset password, impor CSV.
- Penugasan instrumen ke guru atau kelompok guru, dengan tenggat waktu.

### 5.5 Hasil dan Grafik

- Daftar semua hasil supervisi (filter guru, instrumen, tanggal, rentang skor).
- Detail hasil: jawaban, skor per aspek, kesimpulan AI, saran, pemutar podcast.
- Grafik: radar per aspek (per guru dan rata-rata keseluruhan), batang perbandingan antar guru, garis tren dari waktu ke waktu, distribusi skor.
- Admin bisa memberi **catatan tambahan** atau menimpa nilai AI secara manual (tercatat siapa dan kapan).

### 5.6 Pengaturan Penilaian AI

- Editor **system prompt** evaluator (persona, rubrik, format JSON keluaran).
- Editor rubrik: skala nilai, kategori predikat (mis. Sangat Baik, Baik, Cukup, Kurang), ambang batas.
- Template naskah podcast (gaya bahasa, durasi target, jumlah "pembawa").
- Pengaturan pengisian nilai dokumen: AI yang menentukan nilai akhir dan mengisinya ke template dokumen export.

### 5.7 Template Dokumen Export

- Unggah/atur template Word dan PDF (kop, logo, warna, tanda tangan).
- Placeholder yang dikenali: `{{nama_guru}}`, `{{tanggal}}`, `{{skor_total}}`, `{{predikat}}`, `{{kesimpulan}}`, `{{saran}}`, `{{tabel_aspek}}`.

### 5.8 Log dan Keamanan

- Log aktivitas (login, perubahan konfigurasi, export, panggilan AI/TTS gagal).
- Penghitung pemakaian token dan karakter TTS (opsional) untuk memantau biaya.

## 6. Fitur Dashboard GURU (`/guru`)

### 6.1 Beranda Guru

- Sapaan dari agent (maskot) dengan nama guru.
- Kartu **Tugas supervisi** yang harus diisi (judul, tenggat, status: belum, draft, selesai).
- Ringkasan hasil terakhir: skor total, predikat, tombol putar podcast.

### 6.2 Isi Instrumen

- Form bertahap (satu aspek per langkah) dengan progress bar.
- Simpan draft otomatis, bisa dilanjutkan nanti.
- Validasi pertanyaan wajib sebelum submit, ada layar konfirmasi.
- Setelah submit, tampil animasi "Sensei-AI sedang menganalisis" lalu halaman hasil.

### 6.3 Hasil Saya

- Skor total dan predikat, grafik radar per aspek miliknya, kesimpulan AI, saran perbaikan.
- **Pemutar podcast:** play/pause, kecepatan, seek, unduh audio, transkrip yang tersorot sesuai waktu putar.
- Tombol **Export PDF**, **Export Word**, **Unduh Podcast**.
- Catatan dari admin ditampilkan terpisah dan jelas.

### 6.4 Riwayat

- Daftar supervisi sebelumnya, perbandingan skor antar periode (grafik garis kecil).

### 6.5 Profil

- Ubah nama tampilan, foto, dan password. Tidak ada akses ke pengaturan sistem.

## 7. Alur AI Evaluator

1. Backend menyusun payload: instrumen, pertanyaan, aspek, bobot, jawaban guru.
2. Panggil API OpenAI-compatible (`/chat/completions`) dengan system prompt dari admin dan permintaan **JSON terstruktur**:

```json
{
  "skor_per_aspek": [{"aspek": "", "skor": 0, "alasan": ""}],
  "skor_total": 0,
  "predikat": "",
  "kesimpulan": "",
  "kekuatan": [""],
  "saran": [""],
  "naskah_podcast": ""
}
```

3. Validasi JSON dengan Zod. Bila gagal, ulangi maksimal 2 kali, lalu tandai status `gagal` dan beri tombol coba lagi.
4. Simpan hasil ke database. Nilai akhir yang dipakai di dokumen dihitung dari keluaran AI, dapat dikoreksi admin.
5. Hasil dikirim ke guru dan, bila integrasi aktif, ke bot Shiroko.

## 8. Sistem Podcast (Fish Audio)

- Naskah dibuat AI dalam gaya dialog atau monolog agent (durasi target 1-3 menit), dipecah per paragraf agar aman dari batas panjang teks.
- Backend memanggil Fish Audio per potongan memakai ID suara dan parameter dari pengaturan admin, lalu menggabungkan menjadi satu file audio.
- Status job: `menunggu`, `memproses`, `selesai`, `gagal`. Proses berjalan di background (queue sederhana), UI guru polling status.
- Audio disimpan dan dilayani lewat endpoint ber-auth (guru hanya boleh mengakses audio miliknya).
- Cache: naskah yang sama dengan suara yang sama tidak digenerate ulang.

## 9. Export Dokumen

- **PDF dan Word:** berisi identitas guru, tabel skor per aspek, grafik (gambar dari server), kesimpulan, saran, catatan admin, tanda tangan.
- **Audio:** unduh mp3 podcast.
- Guru hanya bisa export hasil miliknya. Admin bisa export hasil siapa saja, plus **export massal** (ZIP) dan rekap Excel/CSV.
- Penilaian dan pengisian nilai di dokumen diatur oleh AI sesuai bagian 7.

## 10. Integrasi Bot Shiroko

- **Admin saja** yang mengatur integrasi ini.
- Backend menyediakan API penghubung:
  - `POST /api/integrasi/shiroko/notify`: backend mengirim notifikasi (hasil selesai, pengingat tenggat) ke bot.
  - `GET /api/integrasi/shiroko/hasil/:nomor`: bot mengambil ringkasan hasil guru berdasarkan nomor WhatsApp terdaftar.
  - `POST /api/integrasi/shiroko/kirim-podcast`: bot mengirim audio podcast ke WhatsApp guru.
- Autentikasi: header `x-api-key` dengan secret dari pengaturan admin.
- Referensi lokal bot: `D:\Project Vs Code\bot-iseng` dan repo bot-shiroko (hanya sebagai patokan struktur, tidak diakses langsung).

## 11. Model Data (ringkas)

- **User:** id, nama, email, passwordHash, **role (admin/guru)**, nomorWA, mapel, aktif.
- **Instrumen:** id, judul, deskripsi, versi, status.
- **Pertanyaan:** id, instrumenId, teks, tipe, aspek, bobot, urutan, wajib, opsiJSON.
- **Penugasan:** id, instrumenId, guruId, tenggat, status.
- **Jawaban:** id, penugasanId, pertanyaanId, nilaiJSON.
- **Hasil:** id, penugasanId, skorTotal, predikat, kesimpulan, sarannyaJSON, catatanAdmin, status.
- **Podcast:** id, hasilId, naskah, audioPath, status, durasi.
- **Pengaturan:** key, value (terenkripsi untuk rahasia).
- **LogAktivitas:** id, userId, aksi, detail, waktu.

## 12. UI/UX

**Gaya visual (wibu tapi tetap rapi):** palet pastel (biru langit, putih, aksen sakura), font bulat ramah (mis. Nunito/Poppins), maskot anime di sapaan, empty state, dan loading. Dark mode opsional.

**Perbedaan karakter UI:**

- **Admin:** padat informasi, sidebar kiri, tabel, grafik, nuansa "control room" dengan warna lebih netral.
- **Guru:** lega, kartu besar, tombol jelas, mobile-first, maskot lebih sering muncul.

**Prompt Google Stitch (Admin):**

> Desain dashboard admin web "Agent Supervisor" bertema anime pastel (biru langit, putih, aksen sakura), sidebar kiri berisi Beranda, Pengaturan API, Editor Pertanyaan, Guru, Hasil & Grafik, Pengaturan Penilaian AI, Template Dokumen, Log. Halaman beranda memuat 4 kartu statistik, grafik garis tren supervisi, grafik radar rata-rata aspek, dan indikator status koneksi API. Gaya bersih, tabel rapi, font bulat, maskot kecil di pojok.

**Prompt Google Stitch (Guru):**

> Desain dashboard guru mobile-first untuk "Agent Supervisor" bertema anime pastel. Bagian atas sapaan maskot anime "Sensei-AI". Kartu tugas supervisi dengan tenggat dan status, kartu hasil terakhir dengan skor besar dan tombol putar podcast, navigasi bawah (Beranda, Isi, Hasil, Riwayat, Profil). Halaman hasil memuat grafik radar, kesimpulan, saran, pemutar podcast dengan transkrip, serta tombol export PDF/Word.

## 13. Fitur Pelengkap (opsional)

- Pengingat tenggat otomatis lewat WhatsApp (Shiroko).
- Mode **tanya Sensei-AI** (chat singkat tentang hasil supervisi, hanya sisi guru).
- Lencana pencapaian ringan (mis. "Supervisi pertama selesai") untuk sentuhan gamifikasi.
- Perbandingan antar periode otomatis dengan narasi AI.
- Mode demo dengan data contoh, berguna saat presentasi ke dosen.

## 14. Kebutuhan Non-Fungsional

- Responsif (guru: mobile-first, admin: desktop-first namun tetap bisa di tablet).
- Waktu evaluasi AI di bawah 30 detik dengan indikator loading.
- Rahasia (API key) tidak masuk repo; pakai `.env` dan file `.env.example`.
- Rate limit di endpoint login dan endpoint AI.
- Pesan error ramah berbahasa Indonesia.

## 15. Bahan yang Perlu Disiapkan

- Base URL, API key, dan nama model OpenAI-compatible.
- API key Fish Audio dan ID suara dari sample yang sudah dibuat.
- Daftar pertanyaan awal instrumen supervisi (bisa dibantu AI) dan rubrik penilaian dari dosen.
- Logo kampus/sekolah, dan aset maskot/ilustrasi anime (pastikan hak pakai).
- Template dokumen Word/PDF yang diinginkan dosen (jika ada).
- URL dan secret bot Shiroko untuk integrasi.
- Data contoh beberapa guru untuk uji coba.

## 16. Urutan Pengerjaan untuk Vibe Coding

1. Setup proyek, database, auth, dan **role admin/guru beserta middleware** (kerjakan dulu agar pemisahan benar dari awal).
2. Layout dan route group `(admin)` dan `(guru)` terpisah.
3. Panel admin: pengaturan API, editor pertanyaan, manajemen guru.
4. Sisi guru: isi instrumen dan simpan jawaban.
5. Evaluator AI dan halaman hasil.
6. Pipeline podcast Fish Audio dan pemutar audio.
7. Export PDF/Word dan audio.
8. Grafik admin dan rekap.
9. Integrasi Shiroko.
10. Poles UI wibu, uji alur kedua role, dan data demo.

## 17. Kriteria Selesai

- Guru tidak dapat melihat atau memanggil apa pun di area admin (diuji manual dan via API).
- Admin dapat mengubah base URL, key, suara, dan pertanyaan tanpa menyentuh kode.
- Satu alur penuh berjalan: guru mengisi, AI mengevaluasi, podcast terbentuk, export berhasil.
- Grafik admin menampilkan data nyata dari hasil guru.
