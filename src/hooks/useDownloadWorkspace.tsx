import { useCallback } from "react";

export function useDownloadWorkspace({
  onStart: onStart,
  onFinish,
}: { onStart?: () => void; onFinish?: () => void } = {}) {
  return useCallback(async () => {
    try {
      onStart?.();
      const res = await fetch("/download", { method: "GET" });
      if (!res.ok) throw new Error("Failed to download");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "workspace.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
      onFinish?.();
    } catch (e: any) {
      alert("Download failed: " + e.message);
      onFinish?.();
    }
  }, [onStart, onFinish]);
}
