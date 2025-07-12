import { BadRequestError, errF } from "@/lib/errors";
import { isImageType } from "@/lib/fileType";
import { prefix } from "@/lib/paths2";
import mime from "mime-types";

/**
 * A flexible representation of an image source, which can be a File,
 * Blob, ArrayBuffer, or Uint8Array.
 */
export type ImageInput = File | Blob | ArrayBuffer | Uint8Array;

interface BaseImageOptions {
  prefixName?: string;
  mimeType?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

interface CreateImageOptions extends BaseImageOptions {
  file: File;
}

interface ConvertImageOptions extends BaseImageOptions {
  imageInput: ImageInput;
  skipSvg?: boolean;
  force?: boolean;
}

/**
 * Converts an image input (File, Blob, ArrayBuffer, etc.) to a desired
 * MIME type and resizes it.
 *
 * - If `force` is false, it will skip conversion if the input is already
 *   the correct MIME type.
 * - If `force` is false and `skipSvg` is true, it will not convert SVGs.
 * - If the input is a raw buffer (ArrayBuffer/Uint8Array), it cannot be
 *   skipped and will always be processed, as its original type is unknown.
 *
 * @returns A Promise that resolves to the converted (or original) File.
 */
export const convertImage = async ({
  imageInput,
  mimeType = "image/webp",
  prefixName = "image",
  skipSvg = true,
  force = false,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.85,
}: ConvertImageOptions): Promise<File> => {
  // 1. Normalize the input into a File object to work with consistently.
  let inputFile: File;
  if (imageInput instanceof File) {
    inputFile = imageInput;
  } else if (imageInput instanceof Blob) {
    // Blobs have a type, but no name.
    inputFile = new File([imageInput], "image", { type: imageInput.type });
  } else {
    // ArrayBuffer or Uint8Array have no name or type. We must convert.
    inputFile = new File([imageInput as ArrayBuffer], "image");
  }

  const originalMimeType = inputFile.type;

  // 2. Check if we should skip conversion. This is only possible if we
  // know the original MIME type and conversion isn't forced.
  if (!force && originalMimeType) {
    if (!isImageType(originalMimeType)) {
      throw new BadRequestError(`Not a valid image, got ${originalMimeType}`);
    }
    if (originalMimeType === mimeType) {
      return inputFile; // Already correct type, return as is.
    }
    if (skipSvg && originalMimeType === "image/svg+xml") {
      return inputFile; // It's a skippable SVG, return as is.
    }
  }

  // 3. If we haven't returned yet, proceed with the conversion.
  return createImage({
    file: inputFile,
    prefixName,
    mimeType,
    maxWidth,
    maxHeight,
    quality,
  });
};

/**
 * Creates a new image file from a source file by drawing it to a canvas,
 * resizing it, and converting it to the target format.
 *
 * @throws Will throw an error if the input file cannot be processed as an image.
 */
export const createImage = async ({
  file,
  mimeType = "image/webp",
  prefixName = "image",
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.85,
}: CreateImageOptions): Promise<File> => {
  try {
    const fileName = file.name || prefixName; // Fallback for files created from blobs
    const imgBitmap = await createImageBitmap(file);
    const canvas = new OffscreenCanvas(imgBitmap.width, imgBitmap.height);
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    let { width, height } = imgBitmap;

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
    const resultImageName = `${prefix(fileName)}.${mime.extension(mimeType)}`;

    return new File([blob], resultImageName, { type: mimeType });
  } catch (e) {
    console.error(e);
    throw errF`Failed to create image from input. It may not be a supported image format. Error: ${e}`;
  }
};
