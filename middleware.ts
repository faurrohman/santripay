import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { NextRequestWithAuth } from "next-auth/middleware";
import { jwtVerify } from "jose";

export default async function middleware(request: NextRequestWithAuth) {

    // Izinkan request ke endpoint callback Midtrans tanpa autentikasi
  if (request.nextUrl.pathname.startsWith("/api/pembayaran/midtrans-callback")) {
    return NextResponse.next();
  }
  // Izinkan request ke NextAuth
  if (request.nextUrl.pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Cek Bearer token di header Authorization untuk API routes
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(process.env.JWT_SECRET || "secret")
      );
      return NextResponse.next();
    } catch (e) {
      // Untuk API routes, kembalikan 401 Unauthorized
      if (request.nextUrl.pathname.startsWith("/api/")) {
        return new NextResponse("Unauthorized", { status: 401 });
      }
      // Untuk web routes, lanjut ke pengecekan session/cookie
    }
  }

  // Fallback ke session/cookie (NextAuth) untuk web routes
  const token = await getToken({ req: request });
  const isAuthPage = request.nextUrl.pathname.startsWith("/auth/login") || 
                    request.nextUrl.pathname.startsWith("/auth/register");

  if (isAuthPage) {
    if (token) {
      // Redirect berdasarkan role
      if (token.role === "admin") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      } else if (token.role === "santri") {
        return NextResponse.redirect(new URL("/santri/dashboard", request.url));
      }
    }
    return NextResponse.next();
  }

  if (!token) {
    let from = request.nextUrl.pathname;
    if (request.nextUrl.search) {
      from += request.nextUrl.search;
    }

    return NextResponse.redirect(
      new URL(`/auth/login?from=${encodeURIComponent(from)}`, request.url)
    );
  }

  // Cek akses berdasarkan role
  if (request.nextUrl.pathname.startsWith("/admin") && token.role !== "admin") {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  if (request.nextUrl.pathname.startsWith("/santri") && token.role !== "santri") {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Izinkan akses ke halaman yang diminta jika sudah terautentikasi
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/santri/:path*",
    "/api/:path*",
    "/auth/:path*",
  ],
}; 