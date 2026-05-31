"use client";

import type * as React from "react";
import { Github, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";

export function LoginModal({ trigger }: { trigger: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold">Save your export</DialogTitle>
          <DialogDescription className="text-sm leading-6 text-muted">
            Create an account only when you are ready to download subtitles. Your current edit stays in place.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Button variant="secondary" className="w-full gap-2">
            <Mail className="h-4 w-4" />
            Continue with email
          </Button>
          <Button variant="secondary" className="w-full gap-2">
            <Github className="h-4 w-4" />
            Continue with GitHub
          </Button>
          <Button variant="secondary" className="w-full">Continue with Google</Button>
        </div>
        <div className="my-2 h-px bg-line" />
        <form className="grid gap-4">
          <label className="grid gap-2 text-sm font-bold">
            Email
            <input className="min-h-11 rounded border border-line bg-panel-2 px-3 text-text outline-none focus:border-cyan" type="email" placeholder="you@example.com" />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Password
            <input className="min-h-11 rounded border border-line bg-panel-2 px-3 text-text outline-none focus:border-cyan" type="password" placeholder="••••••••" />
          </label>
          <Button variant="primary" type="button">Create account and export</Button>
        </form>
        <p className="mb-0 text-xs leading-5 text-soft">
          By continuing you agree to the VideoToSRT Terms and Privacy Policy.
        </p>
      </DialogContent>
    </Dialog>
  );
}
