import test from "node:test";
import assert from "node:assert/strict";

const base = process.env.TEST_API_BASE || "http://127.0.0.1:3000";

test("health endpoint responds and reports setup status", async () => {
  const response = await fetch(base + "/health");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.service, "ExamMastery AI");
  assert.equal(typeof body.accountsConfigured, "boolean");
  assert.equal(typeof body.aiConfigured, "boolean");
});

test("tutor returns a clear setup error when no provider key is configured", async (t) => {
  if (process.env.OPENAI_API_KEY) {
    t.skip("This test specifically checks the unconfigured-key response.");
    return;
  }
  const response = await fetch(base + "/api/tutor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "Explain fractions simply." })
  });
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.match(body.error, /OPENAI_API_KEY/);
});
