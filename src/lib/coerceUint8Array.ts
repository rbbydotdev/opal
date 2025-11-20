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

export function coerceString(data: Uint8Array | string | null | undefined): string {
  if (typeof data === "string") {
    return data;
  } else if (data instanceof Uint8Array) {
    return new TextDecoder("utf-8").decode(data);
  } else if (data === null || data === undefined) {
    return "";
  } else {
    throw new TypeError("Unsupported type for coerceString");
  }
}

export function coerceFileContent(data: Uint8Array | string, options?: { encoding?: "utf8" }): Uint8Array | string {
  if (options?.encoding === "utf8") {
    return coerceString(data);
  }
  return coerceUint8Array(data);
}
