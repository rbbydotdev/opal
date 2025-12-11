export function coerceUint8Array(data: Uint8Array | ArrayBuffer | string | null | undefined): Uint8Array {
  if (data instanceof Uint8Array) {
    return data;
  } else if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  } else if (typeof data === "string") {
    return new TextEncoder().encode(data);
  } else if (data === null || data === undefined) {
    return new Uint8Array();
  } else {
    throw new TypeError("Unsupported type for coerceUint8Array");
  }
}
