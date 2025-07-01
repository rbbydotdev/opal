import * as http from "http";

const PORT = 8080;

const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
  // Set CORS headers for all responses
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "POST") {
    let body = "";

    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        console.log(data.msg);
      } catch (error) {
        console.error("Error parsing JSON:", error);
      }

      // Respond to the client
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Message received\n");
    });
  } else {
    res.writeHead(405, { "Content-Type": "text/plain" });
    res.end("Only POST requests are allowed\n");
  }
});

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
