import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid input", details: error.flatten(), code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }
  console.error("[kardiary] Unhandled API error:", error);
  const message =
    process.env.NODE_ENV === "development" && error instanceof Error ? error.message : "Internal server error";
  return NextResponse.json({ error: message, code: "INTERNAL_ERROR" }, { status: 500 });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON", "INVALID_JSON");
  }
}
