import { z } from "zod";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;
export const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/3gpp"] as const;
const MAX_DIMENSION = 1600;

export const isVideoFile = (f: File) => f.type.startsWith("video/");

export const mediaSchema = z
  .custom<File>((v) => typeof File !== "undefined" && v instanceof File, "Archivo no válido")
  .refine(
    (f) => ([...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES] as string[]).includes(f.type),
    "Formato no admitido. Usa JPG, PNG, WebP, MP4, MOV o WebM.",
  )
  .refine((f) => !isVideoFile(f) || f.size <= MAX_VIDEO_BYTES, "El video supera los 100 MB. Graba uno más corto.")
  .refine((f) => isVideoFile(f) || f.size <= MAX_IMAGE_BYTES, "La imagen supera los 8 MB.");

export const completionSchema = z.object({
  confirmed: z.literal(true, { message: "Confirma que completaste el reto." }),
  note: z.string().trim().max(2000, "Máximo 2000 caracteres.").optional(),
  media: mediaSchema.optional(),
});

export type CompletionForm = z.infer<typeof completionSchema>;

/**
 * Re-encodes the photo on a canvas: shrinks it to MAX_DIMENSION and drops
 * all metadata (EXIF GPS location, device info) before it is stored.
 * Videos can't be re-encoded cheaply on the device, so they are stored as
 * recorded and the UI says that their metadata is kept.
 */
export async function sanitizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
  if (!blob) throw new Error("No se pudo procesar la imagen");
  return blob;
}
