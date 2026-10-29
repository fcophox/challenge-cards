import { z } from "zod";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;
const MAX_DIMENSION = 1600;

export const completionSchema = z.object({
  confirmed: z.literal(true, { message: "Confirma que completaste el reto." }),
  note: z.string().trim().max(2000, "Máximo 2000 caracteres.").optional(),
  photo: z
    .custom<File>((v) => typeof File !== "undefined" && v instanceof File, "Archivo no válido")
    .refine((f) => (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(f.type), "Formato no admitido. Usa JPG, PNG o WebP.")
    .refine((f) => f.size <= MAX_UPLOAD_BYTES, "La imagen supera los 8 MB.")
    .optional(),
});

export type CompletionForm = z.infer<typeof completionSchema>;

/**
 * Re-encodes the photo on a canvas: shrinks it to MAX_DIMENSION and drops
 * all metadata (EXIF GPS location, device info) before it is stored.
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
