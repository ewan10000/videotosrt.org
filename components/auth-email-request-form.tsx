"use client";

import type * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { Chrome, Github, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, authLoginUrl } from "@/lib/api";
import { setLocalUser } from "@/lib/auth";

type AuthEmailRequestFormProps = {
  backHref: string;
  backLabel: string;
  description: string;
  emailLabel: string;
  emailPlaceholder: string;
  mode: "sign-in" | "recovery";
  submitLabel: string;
  successBody: string;
  successTitle: string;
  title: string;
};

function getEmailAuthUser(data: Awaited<ReturnType<typeof api.sendEmailCode>>) {
  return data.user ?? data.data?.user ?? null;
}

export function AuthEmailRequestForm({
  backHref,
  backLabel,
  description,
  emailLabel,
  emailPlaceholder,
  mode,
  submitLabel,
  successBody,
  successTitle,
  title
}: AuthEmailRequestFormProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function startOauthLogin(provider: "google" | "github") {
    window.location.href = authLoginUrl(provider, window.location.href);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSent(false);
    setSubmitting(true);

    try {
      const data = await api.sendEmailCode(email);
      setLocalUser(getEmailAuthUser(data));
      setSent(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-[460px] rounded border border-line bg-panel p-6 shadow-panel">
      <Link className="text-sm font-semibold text-cyan underline underline-offset-4" href={backHref}>
        {backLabel}
      </Link>
      <h1 className="mb-3 mt-5 text-3xl font-extrabold leading-tight">{title}</h1>
      <p className="text-sm leading-6 text-muted">{description}</p>

      {mode === "sign-in" ? (
        <div className="mt-6 grid gap-3">
          <Button variant="secondary" className="w-full gap-2" type="button" onClick={() => startOauthLogin("github")}>
            <Github className="h-4 w-4" />
            Continue with GitHub
          </Button>
          <Button variant="secondary" className="w-full gap-2" type="button" onClick={() => startOauthLogin("google")}>
            <Chrome className="h-4 w-4" />
            Continue with Google
          </Button>
          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-normal text-soft">
            <span className="h-px flex-1 bg-line" />
            Email
            <span className="h-px flex-1 bg-line" />
          </div>
        </div>
      ) : null}

      <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
        <label className="grid gap-2 text-sm font-bold">
          {emailLabel}
          <input
            className="min-h-11 rounded border border-line bg-panel-2 px-3 text-text outline-none focus:border-cyan"
            type="email"
            value={email}
            autoComplete="email"
            placeholder={emailPlaceholder}
            required
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <Button variant="primary" className="gap-2" type="submit" disabled={submitting}>
          <Mail className="h-4 w-4" />
          {submitting ? "Sending..." : submitLabel}
        </Button>
      </form>

      {sent ? (
        <div className="mt-5 rounded border border-cyan/30 bg-cyan/10 p-4">
          <p className="mb-1 text-sm font-extrabold text-cyan">{successTitle}</p>
          <p className="mb-0 text-sm leading-6 text-muted">{successBody}</p>
        </div>
      ) : null}
      {error ? <p className="mt-4 mb-0 text-sm font-semibold text-danger">{error}</p> : null}
    </section>
  );
}
