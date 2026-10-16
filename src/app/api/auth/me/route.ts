import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      nama: true,
      email: true,
      nip: true,
      role: true,
      nomorWA: true,
      mapel: true,
      fotoUrl: true,
      aktif: true,
      badgesJSON: true,
      lastLoginAt: true,
    },
  });

  if (!user || !user.aktif) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({ user });
}
