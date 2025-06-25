import { errF } from "@/lib/errors";
import { prefix } from "@/lib/paths2";
import mime from "mime-types";

export interface CreateImageOptions {
  file: File;
  mimeType?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export const createImage = ({
  file,
  mimeType = "image/webp",
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.85,
}: CreateImageOptions): Promise<File> => {
  return new Promise((resolve, reject) => {
    createImageBitmap(file)
      .then((imgBitmap) => {
        const canvas = new OffscreenCanvas(imgBitmap.width, imgBitmap.height);
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
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

        canvas
          .convertToBlob({ type: mimeType, quality })
          .then((blob) => {
            const reader = new FileReader();
            reader.onload = () => {
              const arrayBuffer = reader.result as ArrayBuffer;
              const uint8Array = new Uint8Array(arrayBuffer);
              const fileName = `${prefix(file.name)}.${mime.extension(mimeType)}`;
              const newFile = new File([uint8Array], fileName, { type: mimeType });
              resolve(newFile);
            };
            reader.onerror = () => {
              reject(new Error("Failed to read blob as ArrayBuffer"));
            };
            reader.readAsArrayBuffer(blob);
          })
          .catch(() => {
            reject(new Error("Canvas toBlob failed"));
          });
      })
      .catch((e) => {
        console.error(e);
        reject(errF`Failed to create image bitmap ${e}`);
      });
  });
};
