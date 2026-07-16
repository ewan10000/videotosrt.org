import { Hono } from "hono";
import { getUsage } from "../lib/credits";
import { fail, ok } from "../lib/response";
import { requireUser } from "../lib/session";
import type { HonoAppEnv } from "../types";

export const usageRoutes = new Hono<HonoAppEnv>();

usageRoutes.get("/usage", async (c) => {
  const user = requireUser(c);
  if (!user) return fail(c, 401, "UNAUTHORIZED", "Authentication required");

  return ok(c, await getUsage(c.env, user.id, undefined, user.plan));
});
