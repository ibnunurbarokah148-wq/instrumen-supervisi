import { NextResponse } from "next/server";
import { COOKIE_NAME, getSession } from "@/lib/auth";
import { logActivity } from "@/lib/settings";

export async function POST() {
  const session = await getSession();
  if (session) {
    await logActivity({
      userId: session.userId,
      namaUser: session.nama,
      role: session.role,
      aksi: "LOGOUT",
      detail: `${session.nama} keluar dari sesi`,
    });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.delete(COOKIE_NAME);
  return res;
}
