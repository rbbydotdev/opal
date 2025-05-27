// components/DownloadButton.js

export function DownloadButton() {
  const handleDownload = async () => {
    try {
      // Fetch the zip file (service worker will intercept)
      const res = await fetch("/download", {
        method: "GET",
        credentials: "include", // if you need cookies
      });
      if (!res.ok) throw new Error("Failed to download");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // Create a temporary <a> and click it
      const a = document.createElement("a");
      a.href = url;
      a.download = "workspace.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();

      // Clean up
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Download failed: " + e.message);
    }
  };

  return <button onClick={handleDownload}>Download Workspace ZIP</button>;
}
