import { ensureSeeded } from "../src/lib/seed-data";

async function main() {
  console.log("🌸 Menjalankan seed database Web Agent Supervisor v2...");
  const res = await ensureSeeded(true);
  console.log("✅ Seed selesai:", res);
}

main()
  .catch((e) => {
    console.error("❌ Gagal seed database:", e);
    process.exit(1);
  });
