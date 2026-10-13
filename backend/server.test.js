import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

async function withServer(fn) {
  const port = 3100 + Math.floor(Math.random() * 1000);
  const child = spawn(process.execPath, ["server.js"], {
    cwd: new URL(".", import.meta.url),
    env: { ...process.env, PORT: String(port), OPENAI_API_KEY: "" },
    stdio: "ignore"
  });
  const base = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      if (child.exitCode !== null) throw new Error("Backend exited before becoming ready");
      try {
        const r = await fetch(base + "/health");
        if (r.ok) { ready = true; break; }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    assert.equal(ready, true, "backend should start and respond to health check");
    await fn(base);
  } finally {
    child.kill("SIGTERM");
  }
}

test("health endpoint responds and reports setup status", async () => {
  await withServer(async base => {
    const response = await fetch(base + "/health");
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.service, "ExamMastery AI");
    assert.equal(typeof body.accountsConfigured, "boolean");
    assert.equal(typeof body.aiConfigured, "boolean");
  });
});

test("tutor returns a clear setup error when no provider key is configured", async () => {
  await withServer(async base => {
    const response = await fetch(base + "/api/tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "Explain fractions simply." })
    });
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.match(body.error, /OPENAI_API_KEY/);
  });
});
