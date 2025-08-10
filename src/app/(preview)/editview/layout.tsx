// import "../styles.css";
import "../../styles.css"; //TODO JUST FOR FUN REMOVE ME

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className="markdown-body"
        style={{
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          marginTop: "32px",
          minHeight: "100vh",
          justifyContent: "start",
          alignItems: "center",
          width: "100%",
        }}
      >
        <div style={{ maxWidth: "980px" }}>{children}</div>
      </body>
    </html>
  );
}
