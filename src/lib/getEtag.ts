import { createHash } from "crypto";

export function getEtagSync(data: string | Buffer): string {
  return createHash("md5").update(data).digest("hex");
}

export function getEtagAsync(data: string | Buffer): Promise<string> {
  return new Promise((resolve) => {
    const hash = createHash("md5").update(data).digest("hex");
    resolve(hash);
  });
}
