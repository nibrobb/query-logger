import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const catalog = {
  1001: "Sykepleier",
  1002: "Elektriker",
  1003: "Systemutvikler",
  1004: "Saksbehandler",
  1005: "Entreprenør",
  1006: "Byggingeniør",
  1007: "Eiendomsmegler",
  1008: "Butikkmedarbeider",
  1009: "Renholdsoperatør",
  1010: "Kranfører",
  1011: "Kirkeverge",
};
const logs = [];

const sendJson = (res, status, payload) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(payload));
};

const readBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
};

const serveFile = async (res, filePath, contentType) => {
  try {
    const content = await readFile(filePath);
    res.writeHead(200, { "content-type": contentType });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost:8080");

  if (req.method === "GET" && url.pathname === "/") {
    await serveFile(res, path.join(root, "demo", "index.html"), "text/html; charset=utf-8");
    return;
  }

  if (req.method === "GET" && url.pathname === "/demo/app.js") {
    await serveFile(res, path.join(root, "demo", "app.js"), "text/javascript; charset=utf-8");
    return;
  }

  if (req.method === "GET" && url.pathname === "/dist/query-logger.js") {
    await serveFile(
      res,
      path.join(root, "dist", "query-logger.js"),
      "text/javascript; charset=utf-8",
    );
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/search") {
    const query = url.searchParams.get("q")?.toLowerCase().trim() ?? "";
    const results = Object.entries(catalog)
      .map(([id, name]) => ({ id: Number(id), name }))
      .filter((item) => item.name.toLowerCase().includes(query))
      .slice(0, 5);

    const resultIds = results.map((item) => item.id);
    sendJson(res, 200, { query, resultIds, results });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/query-logs") {
    const bodyText = await readBody(req);
    const payload = JSON.parse(bodyText || "{}");
    logs.push(payload);
    console.log("[query-log] batch received:", JSON.stringify(payload, null, 2));
    sendJson(res, 202, { accepted: true });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/query-logs") {
    sendJson(res, 200, { logs });
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(8080, () => {
  console.log("Demo running at http://localhost:8080");
});
