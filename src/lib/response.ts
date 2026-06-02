import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export function ok<T>(c: Context, data: T, status: ContentfulStatusCode = 200) {
  return c.json({ ok: true, data }, status);
}

export function fail(c: Context, status: number, code: string, message: string) {
  return c.json({ ok: false, error: { code, message } }, status as ContentfulStatusCode);
}
