// export function base64URIToBlob(src: string): Blob {
//   const [meta, base64] = src.split(",");
//   const mimeMatch = meta!.match(/data:(.*);base64/);
//   const mimeType = mimeMatch ? mimeMatch[1] : "image/webp";
//   const binary = atob(base64!);
//   const array = new Uint8Array(binary.length);
//   for (let i = 0; i < binary.length; i++) {
//     array[i] = binary.charCodeAt(i);
//   }
//   const blob = new Blob([array], { type: mimeType });
//   return blob;
// }
