import {
  IMAGE_COMPRESS_SKIP_BELOW_BYTES,
  IMAGE_COMPRESS_TARGET_MAX_BYTES,
  IMAGE_COMPRESS_DEFAULT_QUALITY,
  IMAGE_COMPRESS_FALLBACK_QUALITIES,
  IMAGE_COMPRESS_MIN_DIMENSION,
  IMAGE_COMPRESS_DOWNSCALE_RATIO,
  IMAGE_COMPRESS_DOWNSCALE_QUALITY,
} from "@/features/board/constants/board.constant";

// Ошибка сжатия. Caller ловит и показывает toast пользователю.
export class ImageCompressorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageCompressorError";
  }
}

// Сжимает картинку в WebP до целевого размера.
// Сначала перебирает quality по убыванию, потом уменьшает картинку до 640px.
// GIF не сжимаем (анимация); файлы меньше 50KB пропускаем как есть.
export async function compressImage(blob: Blob): Promise<Blob> {
  if (blob.type === "image/gif") {
    if (blob.size > IMAGE_COMPRESS_TARGET_MAX_BYTES) {
      throw new ImageCompressorError(
        "GIF too large to compress without losing animation",
      );
    }
    return blob;
  }
  if (blob.size < IMAGE_COMPRESS_SKIP_BELOW_BYTES) return blob;

  const bitmap = await createImageBitmap(blob);
  const origW = bitmap.width;
  const origH = bitmap.height;
  try {
    // Перебор качества без изменения размеров.
    for (const q of [
      IMAGE_COMPRESS_DEFAULT_QUALITY,
      ...IMAGE_COMPRESS_FALLBACK_QUALITIES,
    ]) {
      const out = await encodeWebp(bitmap, origW, origH, q);
      if (out.size <= IMAGE_COMPRESS_TARGET_MAX_BYTES) return out;
    }

    // Уменьшаем размер до минимальной стороны с фиксированным качеством.
    let w = origW;
    let h = origH;
    while (Math.max(w, h) > IMAGE_COMPRESS_MIN_DIMENSION) {
      w = Math.round(w * IMAGE_COMPRESS_DOWNSCALE_RATIO);
      h = Math.round(h * IMAGE_COMPRESS_DOWNSCALE_RATIO);
      const out = await encodeWebp(
        bitmap,
        w,
        h,
        IMAGE_COMPRESS_DOWNSCALE_QUALITY,
      );
      if (out.size <= IMAGE_COMPRESS_TARGET_MAX_BYTES) return out;
    }

    throw new ImageCompressorError("Image too complex to compress under 1 MB");
  } finally {
    bitmap.close();
  }
}

// Кодирует bitmap в WebP через временный canvas.
async function encodeWebp(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  quality: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageCompressorError("Cannot get 2D context");
  ctx.drawImage(bitmap, 0, 0, width, height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new ImageCompressorError("canvas.toBlob returned null"));
      },
      "image/webp",
      quality,
    );
  });
}
