import { errF } from "@/lib/errors";
import { prefix } from "@/lib/paths2";
import mime from "mime-types";

export interface CreateImageOptions {
  file: File | Blob;
  mimeType?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export const createImage = async ({
  file,
  mimeType = "image/webp",
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.85,
}: CreateImageOptions): Promise<File> => {
  try {
    const fileName = file instanceof File ? file.name : "image";
    const imgBitmap = await createImageBitmap(file);
    const canvas = new OffscreenCanvas(imgBitmap.width, imgBitmap.height);
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    let width = imgBitmap.width;
    let height = imgBitmap.height;

    if (width > height) {
      if (width > maxWidth) {
        height *= maxWidth / width;
        width = maxWidth;
      }
    } else {
      if (height > maxHeight) {
        width *= maxHeight / height;
        height = maxHeight;
      }
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(imgBitmap, 0, 0, width, height);

    const blob = await canvas.convertToBlob({ type: mimeType, quality });

    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const resultImageName = `${prefix(fileName)}.${mime.extension(mimeType)}`;
    return new File([uint8Array], resultImageName, { type: mimeType });
  } catch (e) {
    console.error(e);
    throw errF`Failed to create image bitmap ${e}`;
  }
};
