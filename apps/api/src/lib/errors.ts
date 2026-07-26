import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

// ---- AppError class ----
export class AppError extends HTTPException {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(status as any, { message });
    this.code = code;
    this.details = details;
  }
}

// ---- Error factory helpers ----
export function badRequest(message: string, details?: unknown): AppError {
  return new AppError(400, "BAD_REQUEST", message, details);
}

export function unauthorized(message = "Authentication required"): AppError {
  return new AppError(401, "UNAUTHORIZED", message);
}

export function forbidden(message = "Insufficient permissions"): AppError {
  return new AppError(403, "FORBIDDEN", message);
}

export function notFound(message = "Resource not found"): AppError {
  return new AppError(404, "NOT_FOUND", message);
}

export function conflict(message: string): AppError {
  return new AppError(409, "CONFLICT", message);
}

export function tooManyRequests(message = "Too many requests"): AppError {
  return new AppError(429, "TOO_MANY_REQUESTS", message);
}

export function internalError(message = "Internal server error"): AppError {
  return new AppError(500, "INTERNAL_ERROR", message);
}

// ---- Error response format ----
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ---- Global error handler middleware ----
export async function errorHandler(err: Error, c: Context): Promise<Response> {
  if (err instanceof AppError) {
    return c.json(
      {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
      } satisfies ErrorResponse,
      err.status as any,
    );
  }

  // Handle Hono's built-in HTTPException
  if (err instanceof HTTPException) {
    return c.json(
      {
        error: {
          code: "HTTP_ERROR",
          message: err.message,
        },
      } satisfies ErrorResponse,
      err.status as any,
    );
  }

  // Unexpected errors — log and return generic
  console.error("Unhandled error:", err);
  return c.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    } satisfies ErrorResponse,
    500,
  );
}
