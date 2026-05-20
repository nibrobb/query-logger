import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const SEARCH_API_URL = "https://api.utdanning.no/search/result/v2";
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

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const mapSearchResult = (item, index) => {
  const fallbackId = item.entity_id ?? item.id ?? `result-${index}`;
  return {
    id: Number.parseInt(fallbackId, 10) || String(fallbackId),
    name: item.title ?? "Uten tittel",
  };
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
    const query = url.searchParams.get("q")?.trim() || "*";
    const page = toPositiveInt(url.searchParams.get("page"), 1);
    const itemsPerPage = toPositiveInt(url.searchParams.get("itemsPerPage"), 30);

    const upstreamUrl = new URL(SEARCH_API_URL);
    upstreamUrl.searchParams.set("query_value", query);
    upstreamUrl.searchParams.set("page", String(page));
    upstreamUrl.searchParams.set("itemsPerPage", String(itemsPerPage));

    try {
      const upstreamResponse = await fetch(upstreamUrl);

      if (!upstreamResponse.ok) {
        sendJson(res, 502, {
          error: "Failed to fetch search results",
          status: upstreamResponse.status,
        });
        return;
      }

      const payload = await upstreamResponse.json();
      const results = (payload["hydra:member"] ?? []).map(mapSearchResult);
      const resultIds = results.map((item) => item.id);

      sendJson(res, 200, {
        query,
        page,
        itemsPerPage,
        totalItems: payload["hydra:totalItems"] ?? null,
        resultIds,
        results,
      });
    } catch (error) {
      sendJson(res, 502, {
        error: "Search service unavailable",
        details: String(error?.message ?? error),
      });
    }
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
