import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth-context";
import { ZodError } from "zod";

export function json<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export function error(
  message: string,
  status: number,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function handleRouteError(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return error(err.code, err.code === "unauthenticated" ? 401 : 403);
  }
  if (err instanceof ZodError) {
    return error("invalid_body", 400, { issues: err.issues });
  }
  console.error("API error:", err);
  return error("internal_error", 500);
}
