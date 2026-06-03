"use client";

import type * as React from "react";
import { Mail } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";

const supportEmail = "support@videotosrt.org";

export function ContactModal({ trigger }: { trigger: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold">Contact us</DialogTitle>
          <DialogDescription className="text-sm leading-6 text-muted">
            Send product questions, account requests, or support details to our team.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="rounded border border-line bg-panel-2 p-4">
            <p className="mb-1 text-xs font-bold uppercase text-soft">Email</p>
            <p className="mb-0 font-bold text-text">{supportEmail}</p>
          </div>
          <a className={buttonVariants({ variant: "primary", className: "gap-2" })} href={`mailto:${supportEmail}`}>
            <Mail className="h-4 w-4" />
            Email support
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
