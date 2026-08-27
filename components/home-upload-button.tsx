"use client";

import { useRef, type ChangeEvent } from "react";
import { FolderUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { trackConversionEvent } from "@/lib/conversion-events";
import { ACCEPTED_TRANSCRIPTION_MEDIA_INPUTS, TECHNICAL_TRANSCRIPTION_UPLOAD_BYTES, TECHNICAL_TRANSCRIPTION_UPLOAD_LABEL } from "@/lib/limits";
import { savePendingUpload } from "@/lib/upload-transfer";

function fileTypeLabel(file: File) {
  if (file.type.startsWith("audio/")) {
    return "audio";
  }
  if (file.type.startsWith("video/")) {
    return "video";
  }
  return file.type || "unknown";
}

export function useHomeUploadPicker() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const startUpload = async (file: File) => {
    trackConversionEvent("file_selected", {
      fileSize: file.size,
      fileType: fileTypeLabel(file),
      reason: file.size > TECHNICAL_TRANSCRIPTION_UPLOAD_BYTES ? "provider_size_guard" : undefined,
      source: "home_upload"
    });
    try {
      const upload = await savePendingUpload(file);
      window.sessionStorage.setItem("videotosrt.upload", JSON.stringify({ id: upload.id, name: file.name, size: file.size, type: file.type }));
    } catch {
      window.sessionStorage.setItem("videotosrt.upload", JSON.stringify({ name: file.name, size: file.size, type: file.type }));
    }
    router.push("/editor");
  };

  const openFilePicker = () => {
    trackConversionEvent("upload_clicked", { source: "home_upload" });
    inputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      void startUpload(file);
    }

    event.target.value = "";
  };

  return { handleFileChange, inputRef, openFilePicker, startUpload };
}

export function HomeUploadButton({ className }: { className?: string }) {
  const { handleFileChange, inputRef, openFilePicker } = useHomeUploadPicker();

  return (
    <>
      <button
        className={className}
        type="button"
        onClick={openFilePicker}
      >
        <FolderUp className="h-4 w-4" />
        Upload ({TECHNICAL_TRANSCRIPTION_UPLOAD_LABEL} source cap)
      </button>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        aria-label="Upload video or audio file"
        accept={ACCEPTED_TRANSCRIPTION_MEDIA_INPUTS}
        onChange={handleFileChange}
      />
    </>
  );
}
