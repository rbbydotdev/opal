"use client";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="markdown-body" style={{ padding: 0, margin: 0, maxWidth: "980px" }}>
        {children}
      </body>
    </html>
  );
}
