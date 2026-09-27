const $ = (id) => document.getElementById(id);
const output = $("output");
const statusEl = $("status");
const profilesEl = $("profiles");
const countEl = $("count");

function log(label, data) {
  const safe = JSON.stringify(data, null, 2).replaceAll($("apiKey").value, "[REDACTED]");
  output.textContent = `[${new Date().toISOString()}] ${label}\n${safe}\n\n` + output.textContent;
}

function setStatus(text) {
  statusEl.textContent = text;
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  const url = $("baseUrl").value.replace(/\/$/, "") + path;
  const headers = {
    "content-type": "application/json",
    "x-api-key": $("apiKey").value,
    "x-request-id": crypto.randomUUID(),
    ...(options.headers || {})
  };
  try {
    setStatus("working");
    const response = await fetch(url, { ...options, headers, signal: controller.signal });
    const body = await response.json().catch(() => ({ raw: "non-json response" }));
    if (!response.ok) throw new Error(`${response.status}: ${body.error || "request failed"}`);
    setStatus("verified");
    log(`${options.method || "GET"} ${path}`, body);
    return body;
  } catch (error) {
    setStatus("error");
    log("ERROR", { path, message: error.message });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function refresh() {
  const data = await request("/profiles");
  profilesEl.innerHTML = "";
  countEl.textContent = data.profiles.length;
  for (const profile of data.profiles) renderProfile(profile);
}

function renderProfile(profile) {
  const el = document.createElement("article");
  el.className = "profile";
  const title = document.createElement("strong");
  title.textContent = profile.name;
  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = `id=${profile.id} • session=${profile.sessionStatus} • proxy=${profile.proxy || "none"}`;
  el.append(title, meta);
  const buttons = document.createElement("div");
  buttons.className = "buttons";
  const actions = [
    ["Start", "start"],
    ["Stop", "stop"],
    ["Test proxy", "proxy-test"],
    ["Delete", "delete"]
  ];
  for (const [label, action] of actions) {
    const button = document.createElement("button");
    button.textContent = label;
    if (action === "delete") button.className = "secondary";
    button.addEventListener("click", () => profileAction(profile.id, action));
    buttons.appendChild(button);
  }
  el.appendChild(buttons);
  profilesEl.appendChild(el);
}

async function profileAction(id, action) {
  if (action === "delete") {
    await request(`/profiles/${id}`, { method: "DELETE" });
  } else {
    await request(`/profiles/${id}/${action}`, {
      method: "POST",
      body: JSON.stringify({ proxy: $("proxy").value })
    });
  }
  await refresh();
}

document.querySelector('[data-action="create"]').addEventListener("click", async () => {
  await request("/profiles", {
    method: "POST",
    headers: { "idempotency-key": crypto.randomUUID() },
    body: JSON.stringify({
      name: $("profileName").value.trim(),
      proxy: $("proxy").value.trim()
    })
  });
  await refresh();
});

document.querySelector('[data-action="list"]').addEventListener("click", refresh);

document.querySelector('[data-action="proxy"]').addEventListener("click", async () => {
  await request("/proxy-test", {
    method: "POST",
    body: JSON.stringify({ proxy: $("proxy").value.trim() })
  });
});

$("clear").addEventListener("click", () => {
  output.textContent = "Log cleared.";
});

refresh().catch(() => {});
