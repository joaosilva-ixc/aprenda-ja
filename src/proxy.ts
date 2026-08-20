import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "aj_session";
const PUBLIC_ROUTES = new Set(["/login"]);
const STAFF_ROUTES = new Set(["/admin/usuarios"]);
const MASTER_ONLY_ROUTES = new Set(["/upload", "/admin/aulas", "/admin/temas", "/admin/anuncio"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_ROUTES.has(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  let payload;
  try {
    ({ payload } = await jwtVerify(token, new TextEncoder().encode(secret)));
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = payload.role as string | undefined;

  if (MASTER_ONLY_ROUTES.has(pathname) && role !== "MASTER") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if ((pathname === "/admin" || STAFF_ROUTES.has(pathname)) && role !== "MASTER" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname === "/login" && payload.sub) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
