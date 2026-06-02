import { Hono } from "hono";
import { ok } from "../lib/response";
import type { HonoAppEnv } from "../types";

export const healthRoutes = new Hono<HonoAppEnv>();

healthRoutes.get("/health", (c) =>
  ok(c, {
    status: "healthy",
    service: c.env.SITE_NAME || "VideoToSRT",
    timestamp: new Date().toISOString(),
  }),
);
