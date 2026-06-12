"use client";

import type * as React from "react";
import { useState } from "react";
import { Chrome, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authLoginUrl, type ApiUser } from "@/lib/api";
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
  const [step, setStep] = useState<"options">("options");
  const [error, setError] = useState("");

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange?.(nextOpen);
    if (!nextOpen) {
      setStep("options");
      setError("");
    }
  }

  function startLogin(provider: "google" | "github") {
    window.location.href = authLoginUrl(provider, window.location.href);
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
        {error ? <p className="mb-0 text-sm font-semibold text-danger">{error}</p> : null}
        <p className="mb-0 text-xs leading-5 text-soft">
          By continuing you agree to the VideoToSRT Terms and Privacy Policy.
        </p>
      </DialogContent>
    </Dialog>
  );
}
