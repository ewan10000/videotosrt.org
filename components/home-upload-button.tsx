"use client";

import { useRef, type ChangeEvent } from "react";
import { FolderUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { savePendingUpload } from "@/lib/upload-transfer";

export function useHomeUploadPicker() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const startUpload = async (file: File) => {
    try {
      const upload = await savePendingUpload(file);
      window.sessionStorage.setItem("videotosrt.upload", JSON.stringify({ id: upload.id, name: file.name, size: file.size, type: file.type }));
    } catch {
      window.sessionStorage.setItem("videotosrt.upload", JSON.stringify({ name: file.name, size: file.size, type: file.type }));
    }
    router.push("/editor");
  };

  const openFilePicker = () => {
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
        Upload Video — Free
      </button>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        aria-label="Upload video or audio file"
        accept="video/*,audio/*"
        onChange={handleFileChange}
      />
    </>
  );
}
