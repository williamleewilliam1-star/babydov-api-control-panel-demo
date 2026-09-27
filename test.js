const { createServer } = require("./mock-api");

async function run() {
  const server = createServer();
  await new Promise((resolve) => server.listen(18778, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:18778";
  const headers = { "content-type": "application/json", "x-api-key": "demo-key" };

  try {
    const created = await fetch(base + "/profiles", {
      method: "POST",
      headers: { ...headers, "idempotency-key": "test-create-1" },
      body: JSON.stringify({ name: "QA Profile", proxy: "http://127.0.0.1:8080" })
    }).then((r) => r.json());

    if (!created.created || !created.profile?.id) throw new Error("create failed");
    const id = created.profile.id;

    const started = await fetch(base + `/profiles/${id}/start`, {
      method: "POST",
      headers,
      body: "{}"
    }).then((r) => r.json());

    if (!started.verified || started.profile.sessionStatus !== "running") {
      throw new Error("start verification failed");
    }
    const proxy = await fetch(base + `/profiles/${id}/proxy-test`, {
      method: "POST",
      headers,
      body: JSON.stringify({ proxy: "http://10.0.0.1:9000" })
    }).then((r) => r.json());

    if (!proxy.ok || proxy.proxy !== "http://10.0.0.1:9000") {
      throw new Error("proxy verification failed");
    }

    const stopped = await fetch(base + `/profiles/${id}/stop`, {
      method: "POST",
      headers,
      body: "{}"
    }).then((r) => r.json());

    if (!stopped.verified || stopped.profile.sessionStatus !== "stopped") {
      throw new Error("stop verification failed");
    }

    const list = await fetch(base + "/profiles", { headers }).then((r) => r.json());
    if (list.profiles.length !== 1) throw new Error("list verification failed");

    console.log("PASS: create → start → proxy-test → stop → list");
  } finally {
    server.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
