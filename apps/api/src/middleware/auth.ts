import { createMiddleware } from "hono/factory";
import type { Context, Next } from "hono";
import { verifyAccessToken } from "../lib/auth.js";
import { unauthorized, forbidden } from "../lib/errors.js";
import type { AuthUser, AccessTokenPayload } from "../lib/auth.js";

// ---- Extended context types ----
declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser;
    accessTokenPayload: AccessTokenPayload;
  }
}

// ---- requireAuth: validates JWT from Authorization header ----
export const requireAuth = createMiddleware(async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw unauthorized("Missing or invalid Authorization header");
  }

  const token = authHeader.slice(7); // remove "Bearer "

  try {
    const payload = verifyAccessToken(token);

    const user: AuthUser = {
      id: payload.sub,
      orgId: payload.org,
      email: "", // will be enriched by services when needed
      firstName: "",
      lastName: "",
      role: payload.role,
      permissions: payload.permissions ?? [],
    };

    c.set("user", user);
    c.set("accessTokenPayload", payload);

    await next();
  } catch (err) {
    if (err instanceof Error && err.name === "TokenExpiredError") {
      throw unauthorized("Access token has expired");
    }
    throw unauthorized("Invalid access token");
  }
});

// ---- requireRole: checks user role before proceeding ----
export function requireRole(...roles: string[]) {
  return createMiddleware(async (c: Context, next: Next) => {
    const user = c.get("user");

    if (!user) {
      throw unauthorized();
    }

    if (roles.length > 0 && !roles.includes(user.role)) {
      throw forbidden(`Role '${user.role}' does not have access to this resource`);
    }

    await next();
  });
}

// ---- orgContext: ensures all subsequent DB queries are scoped to orgId ----
export const orgContext = createMiddleware(async (c: Context, next: Next) => {
  // The orgId is already embedded in the JWT and attached by requireAuth.
  // This middleware is a semantic hook for future org-level operations
  // (e.g., loading full org settings, feature flags, plan tier checks).
  // For now, it ensures the user has a valid orgId.

  const user = c.get("user");

  if (!user?.orgId) {
    throw forbidden("No organization context available");
  }

  await next();
});
