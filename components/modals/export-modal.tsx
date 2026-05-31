"use client";

import type * as React from "react";
import { Download, FileText } from "lucide-react";
import { LoginModal } from "@/components/modals/login-modal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ExportModal({ trigger }: { trigger: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="w-[min(94vw,640px)]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold">Export subtitles</DialogTitle>
          <DialogDescription className="text-sm leading-6 text-muted">
            Choose a file format and export settings. Sign in is requested only at download.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="srt">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="srt">SRT</TabsTrigger>
            <TabsTrigger value="vtt">VTT</TabsTrigger>
            <TabsTrigger value="txt">TXT</TabsTrigger>
            <TabsTrigger value="ass">ASS</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="grid gap-3 py-4 sm:grid-cols-2">
          {["Include speaker labels", "Normalize timestamps", "Keep line breaks", "UTF-8 encoding"].map((item) => (
            <label key={item} className="flex min-h-12 items-center gap-3 rounded border border-line bg-panel-2 px-3 text-sm font-semibold">
              <input type="checkbox" defaultChecked className="h-4 w-4 accent-cyan" />
              {item}
            </label>
          ))}
        </div>
        <label className="grid gap-2 text-sm font-bold">
          File name
          <input className="min-h-11 rounded border border-line bg-panel-2 px-3 text-text outline-none focus:border-cyan" defaultValue="launch-video-subtitles.srt" />
        </label>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" className="gap-2 sm:flex-1">
            <FileText className="h-4 w-4" />
            Preview file
          </Button>
          <LoginModal
            trigger={
              <Button variant="primary" className="gap-2 sm:flex-1">
                <Download className="h-4 w-4" />
                Download
              </Button>
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
