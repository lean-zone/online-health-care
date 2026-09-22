/* =============================================================================
  本地开发服务器：静态托管 + 同源 LLM 代理（零依赖）
  -----------------------------------------------------------------------------
  1. 静态托管整个项目（替代 python -m http.server / npx serve）
  2. POST /llm-proxy 服务端转发到 LLM 上游，规避浏览器跨域(CORS)。
     前端只请求同源路径，Key 由本服务器注入，不暴露给前端。
  用法：
    npm start        # 或 node dev-server.js
    浏览器访问 http://localhost:8000
  ============================================================================= */
"use strict";

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8000;
const ROOT = __dirname;
const PROXY_PATH = "/llm-proxy";
/* 上游真实接口：只存在后端这一处（可用环境变量 UPSTREAM 覆盖） */
const UPSTREAM =
  process.env.UPSTREAM || "https://api.inner-book.top:3000/v1/chat/completions";

function log(method, url, note) {
  console.log(
    "[" +
      new Date().toLocaleTimeString() +
      "] " +
      method +
      " " +
      url +
      (note ? "  -> " + note : ""),
  );
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".otf": "font/otf",
  ".ttf": "font/ttf",
  ".zip": "application/zip",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function getKey() {
  if (process.env.LLM_API_KEY) return process.env.LLM_API_KEY;
  try {
    const src = fs.readFileSync(path.join(ROOT, "llm-config.js"), "utf8");
    const m = src.match(/apiKey\s*:\s*["']([^"']+)["']/);
    if (m && m[1]) return m[1];
  } catch (e) {
    /* 忽略 */
  }
  console.error(
    "未找到 LLM API Key：请设置环境变量 LLM_API_KEY，或在 llm-config.js 填好 apiKey 后重启。",
  );
  process.exit(1);
}

/* 同源代理：POST ->UPSTREAM，流式透传响应 */
function handleProxy(req, res) {
  let body = [];
  req.on("data", (c) => body.push(c));
  req.on("end", () => {
    const payload = Buffer.concat(body).toString();
    const up = https.request(
      UPSTREAM,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          Accept: "text/event-stream",
          Authorization: "Bearer " + getKey(),
        },
      },
      (upRes) => {
        res.writeHead(upRes.statusCode, {
          "Content-Type": upRes.headers["content-type"] || "application/json",
          "Cache-Control": "no-store",
        });
        upRes.pipe(res);
        upRes.on("error", () => res.end());
      },
    );
    up.on("error", (err) => {
      if (!res.headersSent)
        res.writeHead(502, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ error: "upstream request failed: " + err.message }),
      );
    });
    up.write(payload);
    up.end();
  });
  req.on("error", () => res.end());
}

/* 静态托管 */
function handleStatic(urlPath, res) {
  const decoded = decodeURIComponent(urlPath);
  let filePath = path.normalize(path.join(ROOT, decoded));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404);
    res.end("Not Found: " + decoded);
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "Content-Type": MIME[ext] || "application/octet-stream",
  });
  fs.createReadStream(filePath).pipe(res);
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === PROXY_PATH) {
      if (req.method !== "POST") {
        log(req.method, req.url, "405 仅允许 POST");
        res.writeHead(405, { Allow: "POST" });
        res.end("Method Not Allowed");
        return;
      }
      log(req.method, req.url, "转发上游");
      handleProxy(req, res);
      return;
    }
    log(req.method, url.pathname, "静态托管");
    handleStatic(url.pathname, res);
  })
  .listen(PORT, () => {
    console.log("静态站点 + LLM 代理已启动：");
    console.log(`  http://localhost:${PORT}`);
    console.log(`  代理路径：POST ${PROXY_PATH}  ->  ${UPSTREAM}`);
  });
