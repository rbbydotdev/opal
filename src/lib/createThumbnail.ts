export const createThumbnail = (imageData: Uint8Array, maxWidth: number, maxHeight: number): Promise<Uint8Array> => {
  return new Promise((resolve, reject) => {
    // Create a Blob from the Uint8Array
    const blob = new Blob([imageData], { type: "image/jpeg" }); // Adjust the MIME type as needed
    const url = URL.createObjectURL(blob);

    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      let width = img.width;
      let height = img.height;

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
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
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
          } else {
            reject(new Error("Canvas toBlob failed"));
          }
        },
        "image/jpeg",
        0.7
      ); // You can adjust the quality here

      // Clean up the object URL
      URL.revokeObjectURL(url);
    };

    img.onerror = (_error) => {
      reject(new Error("Failed to load image"));
      URL.revokeObjectURL(url);
    };

    img.src = url;
  });
};
