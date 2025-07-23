"use client";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, display: "flex", justifyContent: "center" }}>
        <div>{children}</div>
      </body>
    </html>
  );
}
