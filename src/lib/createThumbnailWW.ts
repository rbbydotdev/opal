import { errF } from "@/lib/errors";

export const createThumbnailWW = (
  imageData: Uint8Array,
  maxWidth: number = 20,
  maxHeight: number = 20
): Promise<Uint8Array> => {
  return new Promise((resolve, reject) => {
    // Create a Blob from the Uint8Array
    const blob = new Blob([imageData as BlobPart], { type: "image" }); // Adjust the MIME type as needed
    // Use createImageBitmap to load the image
    createImageBitmap(blob)
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
          .convertToBlob({ type: "image/webp", quality: 0.7 })
          .then((blob) => {
            const reader = new FileReader();
            reader.onload = () => {
              const arrayBuffer = reader.result as ArrayBuffer;
              const uint8Array = new Uint8Array(arrayBuffer);
              resolve(uint8Array);
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
