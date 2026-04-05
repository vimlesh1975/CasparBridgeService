#!/usr/bin/env node

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const dotenv = require("dotenv");
const { CasparCG, Options, AMCP } = require("casparcg-connection");

const runtimeDir = process.pkg
  ? path.dirname(process.execPath)
  : path.resolve(__dirname, "..");
const envPath = path.join(runtimeDir, ".env");
const logPath = path.join(runtimeDir, "bridge.log");

dotenv.config({ path: envPath });

const port = Number.parseInt(process.env.PORT || "13000", 10);
const casparHost = process.env.CASPAR_HOST || "localhost";
const casparPort = Number.parseInt(process.env.CASPAR_PORT || "5250", 10);
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
const apiToken = process.env.API_TOKEN || "";

let caspar = null;
let lastCommand = "";
let lastError = "";
let lastRequestAt = "";

function log(message, meta) {
  const timestamp = new Date().toISOString();
  const suffix = meta ? ` ${JSON.stringify(meta)}` : "";
  const line = `[${timestamp}] ${message}${suffix}`;

  console.log(line);

  try {
    fs.appendFileSync(logPath, `${line}\n`, "utf8");
  } catch (error) {
    console.error(`[Bridge] failed to write log: ${error.message}`);
  }
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function ensureCasparReady() {
  const connection = getCasparConnection();

  if (connection.connected) {
    return connection;
  }

  connection.connect();

  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (connection.connected) {
      return connection;
    }

    await wait(100);
  }

  throw new Error(`CasparCG is not connected at ${casparHost}:${casparPort}`);
}

function getCasparConnection() {
  if (caspar) {
    return caspar;
  }

  caspar = new CasparCG(casparHost, casparPort);
  caspar.queueMode = Options.QueueMode.SEQUENTIAL;
  caspar.autoReconnect = true;
  caspar.onConnectionChanged = () => {
    log("[CasparCG] connection changed", { connected: caspar.connected });
  };
  caspar.onError = (error) => {
    const message = error instanceof Error ? error.message : String(error);
    lastError = message;
    log("[CasparCG] error", { error: message });
  };
  caspar.connect();

  return caspar;
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Token");
}

function sendJson(res, statusCode, payload) {
  setCorsHeaders(res);
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendEmpty(res, statusCode) {
  setCorsHeaders(res);
  res.writeHead(statusCode);
  res.end("");
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });

    req.on("error", reject);
  });
}

function isAuthorized(req) {
  if (!apiToken) {
    return true;
  }

  const headerToken = req.headers["x-api-token"];
  const bearer = req.headers.authorization;
  const bearerToken = typeof bearer === "string" && bearer.startsWith("Bearer ")
    ? bearer.slice("Bearer ".length)
    : "";

  return headerToken === apiToken || bearerToken === apiToken;
}

async function handleCommand(req, res) {
  lastRequestAt = new Date().toISOString();

  if (!isAuthorized(req)) {
    lastError = "Unauthorized";
    log("[Bridge] rejected request", {
      method: req.method,
      url: req.url,
      reason: "unauthorized"
    });
    sendEmpty(res, 401);
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    lastError = error.message;
    log("[Bridge] invalid request body", {
      method: req.method,
      url: req.url,
      error: error.message
    });
    sendEmpty(res, 400);
    return;
  }

  log("[Bridge] request body", { body });

  const action = typeof body.action === "string" ? body.action.trim() : "";
  const command = typeof body.command === "string" ? body.command.trim() : "";

  if (action !== "endpoint" || !command) {
    lastError = "Ignored payload";
    log("[Bridge] ignored payload", {
      action,
      hasCommand: Boolean(command)
    });
    sendEmpty(res, 200);
    return;
  }

  try {
    const connection = await ensureCasparReady();

    lastCommand = command;
    lastError = "";
    log("[Bridge] forwarding command", {
      origin: req.headers.origin || "",
      command
    });

    await connection.do(new AMCP.CustomCommand(command));

    log("[Bridge] command forwarded", { command });
    sendEmpty(res, 200);
  } catch (error) {
    lastError = error instanceof Error ? error.message : "Failed to send command to CasparCG";
    log("[Bridge] forward failed", {
      error: lastError,
      action,
      command
    });
    sendEmpty(res, 502);
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || `localhost:${port}`}`);

  log("[Bridge] incoming request", {
    method: req.method,
    path: url.pathname,
    origin: req.headers.origin || "",
    contentType: req.headers["content-type"] || ""
  });

  if (req.method === "OPTIONS") {
    setCorsHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (
    req.method === "POST" &&
    (
      url.pathname === "/api/casparcg"
    )
  ) {
    await handleCommand(req, res);
    return;
  }

  sendJson(res, 404, { ok: false, error: "Not found" });
});

server.on("error", (error) => {
  log("[Bridge] server error", {
    code: error.code || "",
    message: error.message
  });
});

server.listen(port, "localhost", () => {
  log("[Bridge] started", {
    listenUrl: `http://localhost:${port}`,
    casparHost,
    casparPort,
    envPath,
    logPath
  });
  getCasparConnection();
});
