const http = require("http");
const { randomUUID } = require("crypto");

const profiles = new Map();
const API_KEY = "demo-key";

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type,x-api-key,x-request-id,idempotency-key",
    "access-control-allow-methods": "GET,POST,DELETE,OPTIONS"
  });
  res.end(data);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function requireAuth(req, res) {
  if (req.headers["x-api-key"] !== API_KEY) {
    json(res, 401, { error: "invalid API key" });
    return false;
  }
  return true;
}
function createServer() {
  return http.createServer(async (req, res) => {
    if (req.method === "OPTIONS") return json(res, 204, {});
    if (!requireAuth(req, res)) return;

    const url = new URL(req.url, "http://127.0.0.1");
    const parts = url.pathname.split("/").filter(Boolean);

    if (req.method === "GET" && url.pathname === "/profiles") {
      return json(res, 200, { profiles: [...profiles.values()] });
    }

    if (req.method === "POST" && url.pathname === "/profiles") {
      const body = await readBody(req);
      if (!body.name) return json(res, 400, { error: "name is required" });
      const id = randomUUID();
      const profile = {
        id,
        name: body.name,
        proxy: body.proxy || "",
        sessionStatus: "stopped",
        createdAt: new Date().toISOString()
      };
      profiles.set(id, profile);
      return json(res, 201, { created: true, profile });
    }

    if (req.method === "POST" && url.pathname === "/proxy-test") {
      const body = await readBody(req);
      return json(res, 200, {
        ok: true,
        proxy: body.proxy || null,
        verifiedAt: new Date().toISOString()
      });
    }
    if (parts[0] === "profiles" && parts[1]) {
      const profile = profiles.get(parts[1]);
      if (!profile) return json(res, 404, { error: "profile not found" });

      if (req.method === "DELETE" && parts.length === 2) {
        profiles.delete(profile.id);
        return json(res, 200, { deleted: true, id: profile.id });
      }

      if (req.method === "POST" && parts[2] === "start") {
        profile.sessionStatus = "running";
        profile.sessionId = randomUUID();
        return json(res, 200, { verified: true, profile });
      }

      if (req.method === "POST" && parts[2] === "stop") {
        profile.sessionStatus = "stopped";
        delete profile.sessionId;
        return json(res, 200, { verified: true, profile });
      }

      if (req.method === "POST" && parts[2] === "proxy-test") {
        const body = await readBody(req);
        profile.proxy = body.proxy || profile.proxy;
        return json(res, 200, {
          ok: true,
          profileId: profile.id,
          proxy: profile.proxy,
          verifiedAt: new Date().toISOString()
        });
      }
    }

    return json(res, 404, { error: "route not found" });
  });
}
if (require.main === module) {
  const port = Number(process.env.PORT || 18777);
  createServer().listen(port, "127.0.0.1", () => {
    console.log(`Mock REST API listening on http://127.0.0.1:${port}`);
    console.log("API key: demo-key");
  });
}

module.exports = { createServer };
