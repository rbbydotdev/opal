"use client";
import React, { useRef, useState } from "react";
// @ts-ignore
import * as mammoth from "mammoth/mammoth.browser";
export default function Page() {
  return (
    <div>
      <h1>DOCX to Markdown Tester</h1>
      <DocxToMarkdownTester />
    </div>
  );
}

const DocxToMarkdownTester: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleConvert = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      alert("Please select a DOCX file first.");
      return;
    }
    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const { value: markdown } = await mammoth.convertToMarkdown({
        arrayBuffer,
      });
      console.log("Markdown result:", markdown);
      alert("Conversion complete! Check the console for output.");
    } catch (err) {
      console.error("Conversion error:", err);
      alert("Error converting file. See console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>DOCX to Markdown Tester</h2>
      <input type="file" accept=".docx" ref={fileInputRef} disabled={loading} />
      <button onClick={handleConvert} disabled={loading}>
        {loading ? "Converting..." : "Convert"}
      </button>
    </div>
  );
};
