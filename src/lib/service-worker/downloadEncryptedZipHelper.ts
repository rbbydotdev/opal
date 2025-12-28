export type DownloadEncryptionProps = {
  password: string;
  encryption: "zipcrypto" | "aes";
  workspaceName: string;
  name?: string;
};
export const EncHeader = "X-Encryption";
export const PassHeader = "X-Password";

export const downloadEncryptedZipHelper = async ({
  password,
  encryption,
  workspaceName,
  name = "/download-encrypted.zip",
}: DownloadEncryptionProps) => {
  const requestUrl = new URL("/download-encrypted.zip", window.location.origin);
  requestUrl.searchParams.set("workspaceName", workspaceName);
  const response = await fetch(requestUrl.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [EncHeader]: encryption, // Custom header to indicate encryption type
      [PassHeader]: password, // Custom header to pass the password
    },
  });

  if (!response.ok) {
    logger.error("Download failed with status:", response.status, response.statusText);
    throw new Error("Download failed");
  }

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = blobUrl;
  document.body.appendChild(a);
  a.download = name;
  a.click();
  a.remove();
  window.URL.revokeObjectURL(blobUrl);
};
