export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_FILES_PER_SUBMISSION = 10;

export const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "audio/mpeg",
  "audio/wav",
  "video/mp4",
]);

export class UploadValidationError extends Error {}

export function assertValidUpload(file: { size: number; type?: string; name: string }) {
  if (file.size <= 0) throw new UploadValidationError(`${file.name} is empty`);
  if (file.size > MAX_FILE_SIZE) {
    throw new UploadValidationError(`${file.name} exceeds the ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
  }
  const type = file.type || "application/octet-stream";
  if (!ALLOWED_MIME_TYPES.has(type)) {
    throw new UploadValidationError(`${file.name} has an unsupported file type (${type})`);
  }
}

/** Converts a validated File/Blob into a base64 data URL for storage in Postgres. */
export async function fileToDataUrl(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const type = file.type || "application/octet-stream";
  return `data:${type};base64,${base64}`;
}
