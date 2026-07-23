"use client";

import type * as React from "react";
import { Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authLoginUrl } from "@/lib/api";
import { trackConversionEvent } from "@/lib/conversion-events";
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
  title = "Sign in",
  description = "Continue with Google to use account features. Your current work stays in place."
}: {
  description?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
}) {
  function handleOpenChange(nextOpen: boolean) {
    onOpenChange?.(nextOpen);
  }

  function startLogin() {
    trackConversionEvent("sign_in_started", { source: "login_modal" });
    window.location.href = authLoginUrl("google", window.location.href);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold">{title}</DialogTitle>
          <DialogDescription className="text-sm leading-6 text-muted">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Button variant="secondary" className="w-full gap-2" type="button" onClick={startLogin}>
            <Chrome className="h-4 w-4" />
            Continue with Google
          </Button>
        </div>
        <p className="mb-0 text-xs leading-5 text-soft">
          By continuing you agree to the{" "}
          <a className="font-semibold text-cyan underline underline-offset-2" href="/terms-of-service">VideoToSRT Terms</a>
          {" "}and{" "}
          <a className="font-semibold text-cyan underline underline-offset-2" href="/privacy-policy">Privacy Policy</a>.
        </p>
      </DialogContent>
    </Dialog>
  );
}
