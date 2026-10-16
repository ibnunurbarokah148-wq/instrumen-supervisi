import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;

  // 1. Proteksi API Admin (/api/admin/*)
  if (pathname.startsWith("/api/admin")) {
    if (!session) {
      return NextResponse.json(
        { error: "Belum login. Silakan masuk terlebih dahulu." },
        { status: 401 }
      );
    }
    if (session.role !== "admin") {
      return NextResponse.json(
        { error: "Akses ditolak (403): Guru tidak diizinkan mengakses endpoint Admin." },
        { status: 403 }
      );
    }
    return NextResponse.next();
  }

  // 2. Proteksi API Guru (/api/guru/*)
  if (pathname.startsWith("/api/guru")) {
    if (!session) {
      return NextResponse.json(
        { error: "Belum login. Silakan masuk terlebih dahulu." },
        { status: 401 }
      );
    }
    if (session.role !== "guru") {
      return NextResponse.json(
        { error: "Akses ditolak (403): Endpoint ini khusus untuk role Guru." },
        { status: 403 }
      );
    }
    return NextResponse.next();
  }

  // 3. Halaman Login Admin (/admin/login) & Login Guru (/login)
  if (pathname === "/admin/login" || pathname === "/login") {
    if (session) {
      const target = session.role === "admin" ? "/admin" : "/guru";
      return NextResponse.redirect(new URL(target, req.url));
    }
    return NextResponse.next();
  }

  // 4. Proteksi Halaman Frontend Admin (/admin/*)
  if (pathname.startsWith("/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    // Aturan wajib PRD: guru yang membuka /admin/* diarahkan ke /guru
    if (session.role === "guru") {
      return NextResponse.redirect(new URL("/guru", req.url));
    }
    return NextResponse.next();
  }

  // 5. Proteksi Halaman Frontend Guru (/guru/*)
  if (pathname.startsWith("/guru")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    // Aturan wajib PRD: admin yang membuka /guru/* diarahkan ke /admin
    if (session.role === "admin") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/guru/:path*",
    "/login",
    "/api/admin/:path*",
    "/api/guru/:path*",
  ],
};
