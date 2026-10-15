import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pg from "pg";

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 3000);
const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
const jwtSecret = process.env.JWT_SECRET;
const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "disable" ? false : { rejectUnauthorized: false }
}) : null;
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").map(x => x.trim()).filter(Boolean);

app.disable("x-powered-by");
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed"));
  }
}));
app.use(express.json({ limit: "1mb" }));

let schemaReady;
async function ensureSchema() {
  if (!pool) throw new Error("Database is not configured. Set DATABASE_URL.");
  if (!schemaReady) schemaReady = pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(80) NOT NULL,
      email VARCHAR(254) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      grade VARCHAR(2) NOT NULL DEFAULT '8',
      board VARCHAR(20) NOT NULL DEFAULT 'CBSE',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await schemaReady;
}
function publicUser(row) {
  return { id: String(row.id), name: row.name, email: row.email, grade: row.grade, board: row.board };
}
function signToken(row) {
  if (!jwtSecret || jwtSecret.length < 32) throw new Error("JWT_SECRET must be configured with at least 32 characters.");
  return jwt.sign({ sub: String(row.id) }, jwtSecret, { expiresIn: "7d", issuer: "exammastery-ai" });
}
async function authRequired(req, res, next) {
  try {
    if (!jwtSecret || !pool) return res.status(503).json({ error: "Account service is not configured yet." });
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "Please log in first." });
    const claims = jwt.verify(token, jwtSecret, { issuer: "exammastery-ai" });
    await ensureSchema();
    const result = await pool.query("SELECT id, name, email, grade, board FROM users WHERE id = $1", [claims.sub]);
    if (!result.rowCount) return res.status(401).json({ error: "Account not found. Please log in again." });
    req.user = result.rows[0];
    next();
  } catch {
    return res.status(401).json({ error: "Session expired. Please log in again." });
  }
}

app.get("/health", (_req, res) => res.json({ ok: true, service: "ExamMastery AI", accountsConfigured: Boolean(pool && jwtSecret), aiConfigured: Boolean(apiKey) }));

app.post("/api/auth/register", async (req, res) => {
  try {
    if (!pool || !jwtSecret || jwtSecret.length < 32) return res.status(503).json({ error: "Account service is not configured yet. Hosting setup is required." });
    await ensureSchema();
    const { name, email, password, grade = "8", board = "CBSE" } = req.body || {};
    const cleanName = typeof name === "string" ? name.trim() : "";
    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (cleanName.length < 2 || cleanName.length > 80) return res.status(400).json({ error: "Name must be 2–80 characters." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 254) return res.status(400).json({ error: "Enter a valid email address." });
    if (typeof password !== "string" || password.length < 10 || password.length > 128) return res.status(400).json({ error: "Password must be 10–128 characters." });
    if (!["6", "7", "8", "9", "10"].includes(String(grade))) return res.status(400).json({ error: "Choose a valid class." });
    if (!["CBSE", "ICSE", "OAV"].includes(String(board))) return res.status(400).json({ error: "Choose a valid board." });
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      "INSERT INTO users(name,email,password_hash,grade,board) VALUES($1,$2,$3,$4,$5) RETURNING id,name,email,grade,board",
      [cleanName, cleanEmail, hash, String(grade), String(board)]
    );
    const user = result.rows[0];
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    if (err?.code === "23505") return res.status(409).json({ error: "An account with this email already exists. Please log in." });
    console.error("Registration failed:", err?.message || "unknown error");
    res.status(500).json({ error: "Could not create account. Please try again." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    if (!pool || !jwtSecret || jwtSecret.length < 32) return res.status(503).json({ error: "Account service is not configured yet. Hosting setup is required." });
    await ensureSchema();
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!email || !password || password.length > 128) return res.status(400).json({ error: "Enter your email and password." });
    const result = await pool.query("SELECT id,name,email,password_hash,grade,board FROM users WHERE email=$1", [email]);
    const row = result.rows[0];
    if (!row || !(await bcrypt.compare(password, row.password_hash))) return res.status(401).json({ error: "Email or password is incorrect." });
    res.json({ token: signToken(row), user: publicUser(row) });
  } catch (err) {
    console.error("Login failed:", err?.message || "unknown error");
    res.status(500).json({ error: "Could not log in. Please try again." });
  }
});

app.get("/api/auth/me", authRequired, (req, res) => res.json({ user: publicUser(req.user) }));

app.post("/api/tutor", async (req, res) => {
  try {
    if (!apiKey) return res.status(503).json({ error: "AI backend is not configured. Set OPENAI_API_KEY in the hosting environment." });
    const { question, context = "", grade = "8", board = "CBSE", subject = "General", language = "auto" } = req.body || {};
    if (typeof question !== "string" || !question.trim()) return res.status(400).json({ error: "Please enter a question." });
    if (question.length > 4000 || typeof context !== "string" || context.length > 24000) return res.status(413).json({ error: "Question or book excerpt is too long. Please shorten it." });
    const system = [
      "You are ExamMastery AI, a patient school study tutor.",
      "Explain concepts clearly at the student's grade level. Use short steps and examples.",
      "For math, show working. If the supplied book context is relevant, prioritize it and say when the answer is not covered by it.",
      "Do not claim to have read material that was not provided. If unsure, say so.",
      "Use the student's question language when practical.",
      language === "Odia" && subject !== "English" ? "For this response, use natural Odia in Odia script throughout. This language requirement takes priority over the language of the question. Keep English only for necessary technical terms." : "",
      language === "English" || subject === "English" ? "For this response, use English." : ""
    ].join(" ");
    const user = `Student level: Class ${String(grade).slice(0, 12)}, Board: ${String(board).slice(0, 40)}, Subject: ${String(subject).slice(0, 80)}\n\nBook excerpt (may be empty):\n${context.slice(0, 24000) || "(No book text supplied)"}\n\nQuestion:\n${question.trim()}`;
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "system", content: system }, { role: "user", content: user }], temperature: 0.3, max_tokens: 900 }),
      signal: AbortSignal.timeout(45000)
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("AI provider returned", upstream.status);
      return res.status(upstream.status === 429 ? 429 : 502).json({ error: upstream.status === 429 ? "AI service rate limit reached. Try again shortly." : "AI service request failed. Check backend configuration." });
    }
    const answer = data.choices?.[0]?.message?.content?.trim();
    if (!answer) return res.status(502).json({ error: "AI returned an empty answer. Please try again." });
    res.json({ answer, model });
  } catch (err) {
    console.error("Tutor request failed:", err?.message || "unknown error");
    res.status(500).json({ error: "Tutor request failed. Please try again." });
  }
});

app.listen(port, "0.0.0.0", () => console.log(`ExamMastery AI backend listening on ${port}`));
