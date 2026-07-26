import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import type { UserRole } from "@sitepilot/shared";

// ---- Types ----
export interface AccessTokenPayload {
  sub: string;      // user.id
  org: string;      // user.orgId
  role: UserRole;
  permissions: string[];
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  orgId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: string[];
}

// ---- Config ----
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is required");
  return secret;
}

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_DAYS = 30;

// ---- Access Token ----
export function generateAccessToken(user: AuthUser): string {
  const payload: Omit<AccessTokenPayload, "iat" | "exp"> = {
    sub: user.id,
    org: user.orgId,
    role: user.role,
    permissions: user.permissions,
  };

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, getJwtSecret()) as AccessTokenPayload;
}

// ---- Refresh Token ----
export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getRefreshTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + REFRESH_TOKEN_DAYS);
  return expiry;
}

export const REFRESH_COOKIE_NAME = "sitepilot_refresh";