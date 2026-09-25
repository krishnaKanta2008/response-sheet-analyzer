"use client";

import { useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";

interface FileDropzoneProps {
  onFile: (file: File) => void;
  onClear: () => void;
  fileName: string | null;
  disabled?: boolean;
}

export default function FileDropzone({
  onFile,
  onClear,
  fileName,
  disabled,
}: FileDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) onFile(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-slate-400 uppercase">
        <Upload className="h-3.5 w-3.5" aria-hidden />
        Response Sheet
      </span>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!disabled) handleFiles(event.dataTransfer.files);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!disabled) inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Upload a response sheet HTML file"
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-colors ${
          dragging
            ? "border-blue-500 bg-[#1a2337]"
            : disabled
              ? "cursor-not-allowed border-[#222f47] opacity-60"
              : "border-[#2c3a55] hover:border-[#3b4a68]"
        }`}
      >
        <FileText className="h-6 w-6 text-slate-500" aria-hidden />
        {fileName ? (
          <p className="flex max-w-full items-center gap-2 text-sm font-medium text-slate-200">
            <span className="truncate">{fileName}</span>
            <span
              role="button"
              tabIndex={0}
              aria-label="Remove selected file"
              onClick={(event) => {
                event.stopPropagation();
                onClear();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  onClear();
                }
              }}
              className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#2c3a55] text-slate-400 transition-colors hover:border-red-500/50 hover:text-red-400"
            >
              <X className="h-3 w-3" aria-hidden />
            </span>
          </p>
        ) : (
          <p className="text-sm text-slate-400">
            Drop the <span className="font-mono text-slate-300">.html</span> file here
          </p>
        )}
        <p className="text-xs text-slate-500">or click to browse</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".html,.htm,text/html"
        className="hidden"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
