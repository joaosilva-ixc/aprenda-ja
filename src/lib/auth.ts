import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import * as bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma/enums";

const SESSION_COOKIE = "aj_session";
const TOTP_CHALLENGE_COOKIE = "aj_2fa";
const SESSION_DURATION = "30d";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const CHALLENGE_MAX_AGE_SECONDS = 5 * 60;

const TEMP_PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function generateTemporaryPassword(length = 10) {
  let password = "";
  for (let i = 0; i < length; i++) {
    password += TEMP_PASSWORD_ALPHABET[randomInt(TEMP_PASSWORD_ALPHABET.length)];
  }
  return password;
}

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET não definido no ambiente.");
  }
  return new TextEncoder().encode(secret);
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: {
  id: string;
  role: UserRole;
  tokenVersion: number;
  totpEnabled?: boolean;
}) {
  const token = await new SignJWT({
    role: user.role,
    ver: user.tokenVersion,
    tf: Boolean(user.totpEnabled),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function createTwoFactorChallenge(userId: string) {
  const token = await new SignJWT({ purpose: "2fa" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(TOTP_CHALLENGE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CHALLENGE_MAX_AGE_SECONDS,
  });
}

export async function consumeTwoFactorChallenge(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOTP_CHALLENGE_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.purpose !== "2fa" || !payload.sub) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export async function clearTwoFactorChallenge() {
  const cookieStore = await cookies();
  cookieStore.set(TOTP_CHALLENGE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub) return null;
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return null;
    if (payload.ver !== user.tokenVersion) return null;
    return user;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) {
    throw new AuthError("Não autenticado", 401);
  }
  return user;
}

export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) {
    throw new AuthError("Não autenticado", 401);
  }
  if (user.role !== "ADMIN" && user.role !== "MASTER") {
    throw new AuthError("Acesso restrito a administradores", 403);
  }
  return user;
}

export async function requireMaster() {
  const user = await getSessionUser();
  if (!user) {
    throw new AuthError("Não autenticado", 401);
  }
  if (user.role !== "MASTER") {
    throw new AuthError("Acesso restrito ao perfil master", 403);
  }
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}