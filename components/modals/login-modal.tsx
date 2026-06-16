"use client";

import type * as React from "react";
import { useMemo, useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch, type ApiUser, type ApiUserResponse } from "@/lib/api";
import { normalizeUser, setLocalUser } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";

export function LoginModal({
  trigger,
  open,
  onOpenChange,
  onLoginSuccess
}: {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onLoginSuccess?: (user: ApiUser) => void;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const emailIsValid = useMemo(() => /\S+@\S+\.\S+/.test(email), [email]);

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange?.(nextOpen);
    if (!nextOpen) {
      setError("");
    }
  }

  async function continueWithEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!emailIsValid) {
      setError("Enter a valid email address.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const data = await apiFetch<ApiUserResponse>("/auth/email/send-code", {
        body: { email },
        method: "POST"
      });
      const user = normalizeUser(data);

      if (!user) {
        throw new Error("Could not sign in. Please try again.");
      }

      setLocalUser(user);
      onLoginSuccess?.(user);
      handleOpenChange(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold">Save your export</DialogTitle>
          <DialogDescription className="text-sm leading-6 text-muted">
            Create an account only when you are ready to download subtitles. Your current edit stays in place.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={continueWithEmail}>
          <label className="grid gap-2 text-sm font-bold">
            Email
            <input
              className="min-h-11 rounded border border-line bg-panel-2 px-3 text-text outline-none focus:border-cyan"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <Button variant="primary" className="w-full gap-2" type="submit" disabled={busy}>
            <Mail className="h-4 w-4" />
            {busy ? "Signing in..." : "Continue with email"}
          </Button>
        </form>
        {error ? <p className="mb-0 text-sm font-semibold text-danger">{error}</p> : null}
        <p className="mb-0 text-xs leading-5 text-soft">
          By continuing you agree to the VideoToSRT Terms and Privacy Policy.
        </p>
      </DialogContent>
    </Dialog>
  );
}
