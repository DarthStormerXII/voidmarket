/**
 * Test helpers for API route testing
 */
import { NextRequest } from "next/server";

/**
 * Create a NextRequest for testing GET routes
 */
export function createGetRequest(
  path: string,
  params?: Record<string, string>
): NextRequest {
  const url = new URL(path, "http://localhost:3000");
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return new NextRequest(url.toString(), { method: "GET" });
}

/**
 * Create a NextRequest for testing POST routes
 */
export function createPostRequest(
  path: string,
  body: Record<string, unknown>
): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000").toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Parse JSON response from API route handler
 */
export async function parseResponse(
  response: Response
): Promise<{ status: number; body: Record<string, unknown> }> {
  const body = await response.json();
  return { status: response.status, body };
}
