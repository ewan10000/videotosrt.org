"use client";

import type * as React from "react";
import { useMemo, useState } from "react";
import { Chrome, Github, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch, authLoginUrl, type ApiUser, type ApiUserResponse } from "@/lib/api";
import { normalizeUser, setLocalUser } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";

type LoginStep = "options" | "email" | "code" | "success";

type SendCodeResponse = {
  data?: {
    user?: ApiUser | null;
  };
  sent: boolean;
  expires_in_seconds: number;
  user?: ApiUser | null;
};

type VerifyCodeResponse = ApiUserResponse;

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
  const [step, setStep] = useState<LoginStep>("options");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const emailIsValid = useMemo(() => /\S+@\S+\.\S+/.test(email), [email]);

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange?.(nextOpen);
    if (!nextOpen) {
      setStep("options");
      setError("");
      setCode("");
    }
  }

  function startLogin(provider: "google" | "github") {
    window.location.href = authLoginUrl(provider, window.location.href);
  }

  async function sendCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!emailIsValid) {
      setError("Enter a valid email address.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const data = await apiFetch<SendCodeResponse>("/auth/email/send-code", {
        method: "POST",
        body: { email }
      });

      if (!data.sent) {
        throw new Error("Could not send verification code. Please try again.");
      }

      const user = normalizeUser(data.user ? data as ApiUserResponse : data.data ? data as ApiUserResponse : null);
      if (user) {
        setLocalUser(user);
        setStep("success");
        onLoginSuccess?.(user);
        window.setTimeout(() => handleOpenChange(false), 500);
        return;
      }

      setStep("code");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not send verification code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setError("Enter the verification code.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const data = await apiFetch<VerifyCodeResponse>("/auth/email/verify", {
        method: "POST",
        body: { email, code: trimmedCode }
      });

      const user = normalizeUser(data);

      if (!user) {
        throw new Error("Could not verify code. Please try again.");
      }

      setLocalUser(user);
      setStep("success");
      onLoginSuccess?.(user);
      window.setTimeout(() => handleOpenChange(false), 500);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not verify code. Please try again.");
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
        {step === "options" ? (
          <div className="grid gap-3">
            <Button variant="secondary" className="w-full gap-2" type="button" onClick={() => setStep("email")}>
              <Mail className="h-4 w-4" />
              Continue with email
            </Button>
            <Button variant="secondary" className="w-full gap-2" type="button" onClick={() => startLogin("github")}>
              <Github className="h-4 w-4" />
              Continue with GitHub
            </Button>
            <Button variant="secondary" className="w-full gap-2" type="button" onClick={() => startLogin("google")}>
              <Chrome className="h-4 w-4" />
              Continue with Google
            </Button>
          </div>
        ) : null}
        {step === "email" ? (
          <form className="grid gap-4" onSubmit={sendCode}>
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
            {error ? <p className="mb-0 text-sm font-semibold text-danger">{error}</p> : null}
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="secondary" type="button" onClick={() => setStep("options")}>Back</Button>
              <Button variant="primary" type="submit" disabled={busy}>{busy ? "Signing in..." : "Continue with email"}</Button>
            </div>
          </form>
        ) : null}
        {step === "code" ? (
          <form className="grid gap-4" onSubmit={verifyCode}>
            <div className="rounded border border-line bg-panel-2 p-3 text-sm leading-6 text-muted">
              Verification code sent to <span className="font-bold text-text">{email}</span>. Check your inbox and enter it below.
            </div>
            <label className="grid gap-2 text-sm font-bold">
              Verification code
              <input
                className="min-h-11 rounded border border-line bg-panel-2 px-3 font-mono text-text outline-none focus:border-cyan"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </label>
            {error ? <p className="mb-0 text-sm font-semibold text-danger">{error}</p> : null}
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="secondary" type="button" onClick={() => setStep("email")}>Change email</Button>
              <Button variant="primary" type="submit" disabled={busy}>{busy ? "Verifying..." : "Log in"}</Button>
            </div>
          </form>
        ) : null}
        {step === "success" ? (
          <div className="rounded border border-success/40 bg-success/10 p-4 text-sm font-bold text-success">
            Logged in as {email}
          </div>
        ) : null}
        <p className="mb-0 text-xs leading-5 text-soft">
          By continuing you agree to the VideoToSRT Terms and Privacy Policy.
        </p>
      </DialogContent>
    </Dialog>
  );
}
