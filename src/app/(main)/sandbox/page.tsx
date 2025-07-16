"use client";
import React, { useCallback, useState } from "react";

export default function Page() {
  return (
    <div>
      <h1>DOCX to Markdown Tester</h1>
      <DocxToMarkdownTester />
    </div>
  );
}

export const DocxToMarkdownTester: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setLoading(true);

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await fetch("/convert-docx", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const json = await response.json();
      console.log("API response:", json);
      alert("Conversion complete! Check the console for output.");
    } catch (err) {
      console.error("API error:", err);
      alert("Error converting file(s). See console for details.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      void handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      void handleFiles(e.target.files);
    },
    [handleFiles]
  );

  return (
    <div style={{ padding: 24 }}>
      <h2>DOCX to Markdown Tester</h2>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          border: "2px dashed #888",
          borderRadius: 8,
          padding: 32,
          textAlign: "center",
          background: dragActive ? "#f0f8ff" : "#fafafa",
          marginBottom: 16,
          transition: "background 0.2s",
          cursor: "pointer",
        }}
        onClick={() => {
          document.getElementById("docx-input")?.click();
        }}
        tabIndex={0}
        role="button"
        aria-label="Drop DOCX files here or click to select"
      >
        <input
          id="docx-input"
          type="file"
          accept=".docx"
          multiple
          style={{ display: "none" }}
          disabled={loading}
          onChange={handleInputChange}
        />
        {loading ? "Converting..." : "Drop DOCX files here or click to select"}
      </div>
    </div>
  );
};
