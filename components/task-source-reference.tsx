"use client";

import { useRef, useState } from "react";
import type { Task } from "@/lib/types";
import {
  getSourceReferenceHref,
  hasTaskSourceReference,
  isSupportedSourceImage,
  normalizeSourceLink,
} from "@/lib/task-source";
import {
  ExternalLink,
  ImageIcon,
  Link2,
  Loader2,
  Upload,
  X,
} from "lucide-react";

export function TaskSourceReferenceCard({
  task,
  variant = "compact",
  className = "",
}: {
  task: Pick<Task, "sourceReferenceEnabled" | "sourceLink" | "sourceImageUrl" | "sourceImageName">;
  variant?: "compact" | "detail";
  className?: string;
}) {
  if (!hasTaskSourceReference(task)) return null;

  const href = getSourceReferenceHref(task);
  const imageUrl = task.sourceImageUrl?.trim();
  const link = task.sourceLink?.trim();
  const displayHost = link
    ? (() => {
        try {
          return new URL(normalizeSourceLink(link)).hostname.replace(/^www\./, "");
        } catch {
          return "Source link";
        }
      })()
    : null;

  const content = imageUrl ? (
    <div className={`relative overflow-hidden rounded-xl border border-gray-200/90 bg-gray-50 shadow-sm transition-all duration-300 group-hover/source:border-indigo-300 group-hover/source:shadow-md ${variant === "detail" ? "rounded-2xl" : ""}`}>
      <div className={`relative ${variant === "detail" ? "aspect-[16/9]" : "aspect-[16/10]"} bg-gradient-to-br from-slate-100 to-slate-200`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={task.sourceImageName || "Source reference"}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover/source:scale-[1.02]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/75 via-gray-900/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3 sm:p-4">
          <div className="min-w-0">
            {displayHost && (
              <p className="truncate text-[11px] font-medium uppercase tracking-wide text-white/70">
                Source
              </p>
            )}
            <p className="truncate text-sm font-semibold text-white sm:text-base">
              {displayHost ?? task.sourceImageName ?? "View reference"}
            </p>
          </div>
          {href && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/95 text-indigo-600 shadow-lg transition group-hover/source:bg-white">
              <ExternalLink className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>
    </div>
  ) : (
    <div className={`flex items-center gap-3 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 px-4 py-3.5 shadow-sm transition-all duration-300 group-hover/source:border-indigo-200 group-hover/source:shadow-md ${variant === "detail" ? "rounded-2xl py-4" : ""}`}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
        <Link2 className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-500/80">
          Source reference
        </p>
        <p className="truncate text-sm font-semibold text-gray-900">{displayHost}</p>
      </div>
      <ExternalLink className="h-4 w-4 shrink-0 text-indigo-500" />
    </div>
  );

  if (!href) return <div className={className}>{content}</div>;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group/source block ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {content}
    </a>
  );
}

export function TaskSourceReferenceEditor({
  enabled,
  onEnabledChange,
  sourceLink,
  onSourceLinkChange,
  sourceImageUrl,
  sourceImageName,
  onImageChange,
  disabled,
}: {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  sourceLink: string;
  onSourceLinkChange: (value: string) => void;
  sourceImageUrl: string;
  sourceImageName: string;
  onImageChange: (url: string, name: string) => void;
  disabled?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function handleFile(file: File | null) {
    if (!file) return;
    setUploadError("");
    if (!isSupportedSourceImage(file)) {
      setUploadError("Use a JPG, PNG, WebP, GIF, or HEIC image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Image must be 10 MB or smaller.");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "spartans/tasks");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      onImageChange(json.path as string, (json.name as string) || file.name);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50/80 to-white p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">Source reference</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Add a product image and/or link for context
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={disabled}
          onClick={() => onEnabledChange(!enabled)}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50 ${
            enabled ? "bg-indigo-600" : "bg-gray-200"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="space-y-4 pt-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Website link
            </label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="url"
                value={sourceLink}
                onChange={(e) => onSourceLinkChange(e.target.value)}
                placeholder="https://example.com/product"
                className="input pl-10"
                disabled={disabled || uploading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Reference image
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.heic,.heif"
              className="hidden"
              disabled={disabled || uploading}
              onChange={(e) => {
                void handleFile(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />

            {sourceImageUrl ? (
              <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="aspect-[16/10] relative bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sourceImageUrl}
                    alt={sourceImageName || "Source preview"}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-3 py-2.5">
                  <p className="truncate text-xs text-gray-500">{sourceImageName || "Uploaded image"}</p>
                  <button
                    type="button"
                    disabled={disabled || uploading}
                    onClick={() => onImageChange("", "")}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition"
                  >
                    <X className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={disabled || uploading}
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-white px-4 py-8 text-center transition hover:border-indigo-300 hover:bg-indigo-50/40 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                    <span className="text-sm font-medium text-gray-600">Uploading…</span>
                  </>
                ) : (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Upload product image</p>
                      <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, WebP up to 10 MB</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                      <Upload className="h-3.5 w-3.5" />
                      Choose file
                    </span>
                  </>
                )}
              </button>
            )}

            {sourceImageUrl && !uploading && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => fileRef.current?.click()}
                className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition"
              >
                Replace image
              </button>
            )}
          </div>

          {uploadError && (
            <p className="text-xs text-red-600">{uploadError}</p>
          )}

          {!sourceLink.trim() && !sourceImageUrl && (
            <p className="text-xs text-amber-600">
              Add a link, an image, or both before saving.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function buildSourceReferencePayload(
  enabled: boolean,
  sourceLink: string,
  sourceImageUrl: string,
  sourceImageName: string
): Pick<Task, "sourceReferenceEnabled" | "sourceLink" | "sourceImageUrl" | "sourceImageName"> | {
  sourceReferenceEnabled: false;
  sourceLink: null;
  sourceImageUrl: null;
  sourceImageName: null;
} {
  if (!enabled) {
    return {
      sourceReferenceEnabled: false,
      sourceLink: null,
      sourceImageUrl: null,
      sourceImageName: null,
    };
  }

  const link = normalizeSourceLink(sourceLink);
  const imageUrl = sourceImageUrl.trim();
  const imageName = sourceImageName.trim();

  return {
    sourceReferenceEnabled: true,
    ...(link ? { sourceLink: link } : {}),
    ...(imageUrl ? { sourceImageUrl: imageUrl, sourceImageName: imageName || "Reference image" } : {}),
  };
}
