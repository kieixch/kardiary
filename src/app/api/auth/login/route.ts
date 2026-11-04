import { NextResponse } from "next/server";
import { createSessionCookie, isAuthConfigured, verifyPassword } from "@/lib/auth";
import { HttpError, errorResponse, readJson } from "@/lib/http";

export async function POST(request: Request) {
  try {
    if (!isAuthConfigured()) {
      throw new HttpError(
        503,
        "KARDIARY password authentication is not configured.",
        "AUTH_NOT_CONFIGURED",
      );
    }

    const body = (await readJson(request)) as { password?: unknown };
    if (typeof body.password !== "string" || body.password.length === 0) {
      throw new HttpError(400, "Password is required", "PASSWORD_REQUIRED");
    }
    if (!verifyPassword(body.password)) {
      throw new HttpError(401, "Incorrect password", "INVALID_PASSWORD");
    }

    const cookie = createSessionCookie();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
