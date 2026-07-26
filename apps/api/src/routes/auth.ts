import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import bcrypt from "bcryptjs";
import { db, schema, eq, and, isNull } from "@sitepilot/db";
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTokenExpiry,
} from "../lib/auth.js";
import { requireAuth, orgContext } from "../middleware/auth.js";
import {
  unauthorized,
  conflict,
  notFound,
  internalError,
} from "../lib/errors.js";
import type { AuthUser } from "../lib/auth.js";

// ---- Constants ----
const REFRESH_COOKIE_NAME = "sitepilot_refresh";
const BCRYPT_ROUNDS = 12;

// ---- Schemas ----
const registerSchema = z.object({
  orgName: z.string().min(1, "Organization name is required").max(255),
  ownerName: z.string().min(1, "Owner name is required").max(200),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ---- Helpers ----
function makeAuthUser(row: typeof schema.users.$inferSelect): AuthUser {
  const permissions = (row.permissions as string[]) ?? [];
  return {
    id: row.id,
    orgId: row.orgId ?? "",
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    role: row.role as AuthUser["role"],
    permissions,
  };
}

// ---- Router ----
const auth = new Hono();

// POST /api/v1/auth/register
auth.post("/register", zValidator("json", registerSchema), async (c) => {
  const { orgName, ownerName, email, password } = c.req.valid("json");

  // Generate org slug from name
  const slug = orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100) || "org";

  // Hash password
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Split owner name into first/last
  const nameParts = ownerName.trim().split(/\s+/);
  const firstName = nameParts[0] ?? ownerName;
  const lastName = nameParts.slice(1).join(" ") || "";

  try {
    // Use a transaction to create org + user atomically
    const result = await db.transaction(async (tx) => {
      // Create organization
      const [org] = await tx
        .insert(schema.organizations)
        .values({
          name: orgName,
          slug,
        })
        .returning();

      if (!org) {
        throw internalError("Failed to create organization");
      }

      // Check email uniqueness within this new org
      const existing = await tx
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(
          and(
            eq(schema.users.orgId, org.id),
            eq(schema.users.email, email.toLowerCase()),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        throw conflict("A user with this email already exists");
      }

      // Create owner user
      const [user] = await tx
        .insert(schema.users)
        .values({
          orgId: org.id,
          email: email.toLowerCase(),
          passwordHash,
          firstName,
          lastName,
          role: "business_owner",
        })
        .returning();

      if (!user) {
        throw internalError("Failed to create user");
      }

      return { org, user };
    });

    const authUser = makeAuthUser(result.user);

    // Generate tokens
    const accessToken = generateAccessToken(authUser);
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashToken(refreshToken);
    const expiresAt = getRefreshTokenExpiry();

    // Store refresh token hash
    await db.insert(schema.refreshTokens).values({
      userId: result.user.id,
      token: refreshTokenHash,
      expiresAt,
    });

    // Set refresh token cookie
    setCookie(c, REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      path: "/api/v1/auth",
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    });

    return c.json(
      {
        accessToken,
        user: {
          id: authUser.id,
          email: authUser.email,
          firstName: authUser.firstName,
          lastName: authUser.lastName,
          role: authUser.role,
          orgId: authUser.orgId,
          orgName: result.org.name,
        },
      },
      201,
    );
  } catch (err: unknown) {
    if (err instanceof Error && "code" in err) {
      const appErr = err as Error & { code?: string; message?: string };
      if (appErr.code === "CONFLICT" || appErr.code === "BAD_REQUEST" || appErr.code === "INTERNAL_ERROR") {
        throw err;
      }
    }

    // Handle unique constraint violations at DB level
    if (err instanceof Error && (err.message?.includes("duplicate key") || (err as any)?.code === "23505")) {
      throw conflict("An organization with this name already exists");
    }

    console.error("Registration error:", err);
    throw internalError("Registration failed");
  }
});

// POST /api/v1/auth/login
auth.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");

  // Find user by email — across orgs
  const users = await db
    .select()
    .from(schema.users)
    .where(
      and(
        eq(schema.users.email, email.toLowerCase()),
        isNull(schema.users.deletedAt),
        eq(schema.users.isActive, true),
      ),
    )
    .limit(1);

  if (users.length === 0 || !users[0]) {
    throw unauthorized("Invalid email or password");
  }

  const user = users[0];

  // Verify password
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw unauthorized("Invalid email or password");
  }

  const authUser = makeAuthUser(user);

  // Generate tokens
  const accessToken = generateAccessToken(authUser);
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = getRefreshTokenExpiry();

  // Store refresh token hash
  await db.insert(schema.refreshTokens).values({
    userId: user.id,
    token: refreshTokenHash,
    expiresAt,
  });

  // Update last login
  await db
    .update(schema.users)
    .set({ lastLoginAt: new Date() })
    .where(eq(schema.users.id, user.id));

  // Set refresh token cookie
  setCookie(c, REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    path: "/api/v1/auth",
    maxAge: 30 * 24 * 60 * 60,
  });

  return c.json({
    accessToken,
    user: {
      id: authUser.id,
      email: authUser.email,
      firstName: authUser.firstName,
      lastName: authUser.lastName,
      role: authUser.role,
      orgId: authUser.orgId,
    },
  });
});

// POST /api/v1/auth/customer-login
auth.post("/customer-login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");

  // Find customer user by email — only role='customer'
  const users = await db
    .select()
    .from(schema.users)
    .where(
      and(
        eq(schema.users.email, email.toLowerCase()),
        eq(schema.users.role, "customer"),
        isNull(schema.users.deletedAt),
        eq(schema.users.isActive, true),
      ),
    )
    .limit(1);

  if (users.length === 0 || !users[0]) {
    throw unauthorized("Invalid email or password");
  }

  const user = users[0];

  // Verify password
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw unauthorized("Invalid email or password");
  }

  const authUser = makeAuthUser(user);

  // Generate tokens
  const accessToken = generateAccessToken(authUser);
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = getRefreshTokenExpiry();

  // Store refresh token hash
  await db.insert(schema.refreshTokens).values({
    userId: user.id,
    token: refreshTokenHash,
    expiresAt,
  });

  // Update last login
  await db
    .update(schema.users)
    .set({ lastLoginAt: new Date() })
    .where(eq(schema.users.id, user.id));

  // Set refresh token cookie
  setCookie(c, REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    path: "/api/v1/auth",
    maxAge: 30 * 24 * 60 * 60,
  });

  return c.json({
    accessToken,
    user: {
      id: authUser.id,
      email: authUser.email,
      firstName: authUser.firstName,
      lastName: authUser.lastName,
      role: authUser.role,
      orgId: authUser.orgId,
    },
  });
});

// POST /api/v1/auth/refresh
auth.post("/refresh", async (c) => {
  const rawToken = getCookie(c, REFRESH_COOKIE_NAME);

  if (!rawToken) {
    throw unauthorized("No refresh token provided");
  }

  const tokenHash = hashToken(rawToken);

  // Find the stored refresh token
  const [stored] = await db
    .select()
    .from(schema.refreshTokens)
    .where(
      and(
        eq(schema.refreshTokens.token, tokenHash),
        eq(schema.refreshTokens.revoked, false),
      ),
    )
    .limit(1);

  if (!stored) {
    // Token not found or already revoked — clear cookie
    deleteCookie(c, REFRESH_COOKIE_NAME, {
      path: "/api/v1/auth",
    });
    throw unauthorized("Invalid or revoked refresh token");
  }

  // Check expiry
  if (new Date() > stored.expiresAt) {
    // Expired — revoke and clear
    await db
      .update(schema.refreshTokens)
      .set({ revoked: true })
      .where(eq(schema.refreshTokens.id, stored.id));

    deleteCookie(c, REFRESH_COOKIE_NAME, {
      path: "/api/v1/auth",
    });
    throw unauthorized("Refresh token has expired");
  }

  // Revoke the old token (rotation)
  await db
    .update(schema.refreshTokens)
    .set({ revoked: true })
    .where(eq(schema.refreshTokens.id, stored.id));

  // Find the user
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, stored.userId))
    .limit(1);

  if (!user) {
    throw unauthorized("User not found");
  }

  const authUser = makeAuthUser(user);

  // Generate new tokens
  const accessToken = generateAccessToken(authUser);
  const newRefreshToken = generateRefreshToken();
  const newRefreshTokenHash = hashToken(newRefreshToken);
  const expiresAt = getRefreshTokenExpiry();

  // Store new refresh token
  await db.insert(schema.refreshTokens).values({
    userId: user.id,
    token: newRefreshTokenHash,
    expiresAt,
  });

  // Set new refresh cookie
  setCookie(c, REFRESH_COOKIE_NAME, newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    path: "/api/v1/auth",
    maxAge: 30 * 24 * 60 * 60,
  });

  return c.json({
    accessToken,
    user: {
      id: authUser.id,
      email: authUser.email,
      firstName: authUser.firstName,
      lastName: authUser.lastName,
      role: authUser.role,
      orgId: authUser.orgId,
    },
  });
});

// POST /api/v1/auth/logout
auth.post("/logout", async (c) => {
  const rawToken = getCookie(c, REFRESH_COOKIE_NAME);

  if (rawToken) {
    const tokenHash = hashToken(rawToken);

    // Revoke the token
    await db
      .update(schema.refreshTokens)
      .set({ revoked: true })
      .where(
        and(
          eq(schema.refreshTokens.token, tokenHash),
          eq(schema.refreshTokens.revoked, false),
        ),
      );
  }

  // Clear cookie regardless
  deleteCookie(c, REFRESH_COOKIE_NAME, {
    path: "/api/v1/auth",
  });

  return c.json({ success: true });
});

// GET /api/v1/auth/me — requires valid JWT
auth.get("/me", requireAuth, orgContext, async (c) => {
  const authUser = c.get("user");

  // Fetch full user details from DB
  const [user] = await db
    .select({
      id: schema.users.id,
      orgId: schema.users.orgId,
      email: schema.users.email,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      role: schema.users.role,
      permissions: schema.users.permissions,
      emailVerified: schema.users.emailVerified,
      isActive: schema.users.isActive,
      lastLoginAt: schema.users.lastLoginAt,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .where(eq(schema.users.id, authUser.id))
    .limit(1);

  if (!user) {
    throw notFound("User not found");
  }

  // Fetch org name
  const [org] = user.orgId
    ? await db
        .select({ name: schema.organizations.name })
        .from(schema.organizations)
        .where(eq(schema.organizations.id, user.orgId))
        .limit(1)
    : [null];

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      permissions: user.permissions,
      orgId: user.orgId,
      orgName: org?.name ?? null,
      emailVerified: user.emailVerified,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    },
  });
});

export default auth;
