// exifOrient.ts
// Utility functions to handle EXIF orientation in images (Service Worker safe)

export async function getExifOrientation(blob: Blob): Promise<number> {
  const buffer = await blob.arrayBuffer();
  const view = new DataView(buffer);

  // JPEG magic number (0xFFD8)
  if (view.getUint16(0, false) !== 0xffd8) return -1;

  let offset = 2;
  const length = view.byteLength;

  while (offset < length) {
    const marker = view.getUint16(offset, false);

    // APP1 (EXIF)
    if (marker === 0xffe1) {
      const exifLength = view.getUint16(offset + 2, false);
      const exifData = new DataView(buffer, offset + 4, exifLength - 2);

      // "Exif\0\0"
      if (exifData.getUint32(0, false) === 0x45786966 && exifData.getUint16(4, false) === 0x0000) {
        const tiffOffset = 6;
        const littleEndian = exifData.getUint16(tiffOffset, false) === 0x4949;

        const firstIFDOffset = exifData.getUint32(tiffOffset + 4, littleEndian);
        if (firstIFDOffset < 0x00000008) return -1;

        const dirOffset = tiffOffset + firstIFDOffset;
        const entries = exifData.getUint16(dirOffset, littleEndian);

        for (let i = 0; i < entries; i++) {
          const entryOffset = dirOffset + 2 + i * 12;
          const tag = exifData.getUint16(entryOffset, littleEndian);

          if (tag === 0x0112) {
            // Orientation tag
            const value = exifData.getUint16(entryOffset + 8, littleEndian);
            return value;
          }
        }
      }
    } else if (marker === 0xffda) {
      // SOS (start of stream) - no more headers
      break;
    } else {
      // Skip segment
      offset += 2 + view.getUint16(offset + 2, false);
    }
  }

  return -1;
}

export function applyOrientationTransform(
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  orientation: number,
  width: number,
  height: number
): void {
  switch (orientation) {
    case 2: // Mirror horizontal
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      break;
    case 3: // Rotate 180°
      ctx.translate(width, height);
      ctx.rotate(Math.PI);
      break;
    case 4: // Mirror vertical
      ctx.translate(0, height);
      ctx.scale(1, -1);
      break;
    case 5: // Mirror horizontal and rotate 90° CW
      ctx.rotate(0.5 * Math.PI);
      ctx.scale(1, -1);
      break;
    case 6: // Rotate 90° CW
      ctx.rotate(0.5 * Math.PI);
      ctx.translate(0, -height);
      break;
    case 7: // Mirror horizontal and rotate 90° CCW
      ctx.rotate(0.5 * Math.PI);
      ctx.translate(width, -height);
      ctx.scale(-1, 1);
      break;
    case 8: // Rotate 90° CCW
      ctx.rotate(-0.5 * Math.PI);
      ctx.translate(-width, 0);
      break;
    default:
      // 1 = no transform
      break;
  }
}

/**
 * Convenience function: fix orientation of an image blob.
 * Returns a new Blob with correct orientation applied.
 */
export async function fixImageOrientation(blob: Blob, type: string = "image/webp"): Promise<Blob> {
  const orientation = await getExifOrientation(blob);
  const bitmap = await createImageBitmap(blob);

  // Swap canvas dimensions if rotated 90/270
  const swap = orientation >= 5 && orientation <= 8;
  const canvas = new OffscreenCanvas(swap ? bitmap.height : bitmap.width, swap ? bitmap.width : bitmap.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("CanvasRenderingContext2D not available");

  ctx.save();
  applyOrientationTransform(ctx, orientation, bitmap.width, bitmap.height);
  ctx.drawImage(bitmap, 0, 0);
  ctx.restore();

  return await canvas.convertToBlob({ type });
}
