import type { Task } from "./types";

export function hasTaskSourceReference(task: Pick<Task, "sourceReferenceEnabled" | "sourceLink" | "sourceImageUrl">): boolean {
  if (task.sourceReferenceEnabled === false) return false;
  return Boolean(task.sourceLink?.trim() || task.sourceImageUrl?.trim());
}

export function normalizeSourceLink(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function getSourceReferenceHref(task: Pick<Task, "sourceLink" | "sourceImageUrl">): string | undefined {
  const link = task.sourceLink?.trim();
  if (link) return normalizeSourceLink(link);
  const image = task.sourceImageUrl?.trim();
  if (image) return image;
  return undefined;
}

export function isSupportedSourceImage(file: File): boolean {
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);
}
