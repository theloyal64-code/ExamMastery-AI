import express from "express";
import cors from "cors";

const app = express();
const port = Number(process.env.PORT || 3000);
const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").map(x => x.trim()).filter(Boolean);

app.disable("x-powered-by");
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed"));
  }
}));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ ok: true, service: "ExamMastery AI Tutor" }));

app.post("/api/tutor", async (req, res) => {
  try {
    if (!apiKey) return res.status(503).json({ error: "AI backend is not configured. Set OPENAI_API_KEY in the hosting environment." });
    const { question, context = "", grade = "8", board = "CBSE", subject = "General" } = req.body || {};
    if (typeof question !== "string" || !question.trim()) return res.status(400).json({ error: "Please enter a question." });
    if (question.length > 4000 || typeof context !== "string" || context.length > 24000) {
      return res.status(413).json({ error: "Question or book excerpt is too long. Please shorten it." });
    }

    const system = [
      "You are ExamMastery AI, a patient school study tutor.",
      "Explain concepts clearly at the student's grade level. Use short steps and examples.",
      "For math, show working. If the supplied book context is relevant, prioritize it and say when the answer is not covered by it.",
      "Do not claim to have read material that was not provided. If unsure, say so.",
      "Use the student's question language when practical."
    ].join(" ");

    const user = `Student level: Class ${String(grade).slice(0, 12)}, Board: ${String(board).slice(0, 40)}, Subject: ${String(subject).slice(0, 80)}\n\nBook excerpt (may be empty):\n${context.slice(0, 24000) || "(No book text supplied)"}\n\nQuestion:\n${question.trim()}`;

    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        temperature: 0.3,
        max_tokens: 900
      }),
      signal: AbortSignal.timeout(45000)
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("AI provider returned", upstream.status);
      return res.status(upstream.status === 429 ? 429 : 502).json({
        error: upstream.status === 429 ? "AI service rate limit reached. Try again shortly." : "AI service request failed. Check backend configuration."
      });
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
