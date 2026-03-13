import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: ["http://127.0.0.1:8080", "http://localhost:8080"],
    methods: ["POST", "OPTIONS"],
  })
);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/api/recaptcha/verify", async (req, res) => {
  const token = req.body?.token;
  if (!token) return res.status(400).json({ ok: false, reason: "missing_token" });

  const secret = process.env.RECAPTCHA_SECRET;
  if (!secret) return res.status(500).json({ ok: false, reason: "missing_secret" });

  const params = new URLSearchParams();
  params.set("secret", secret);
  params.set("response", token);

  try {
    const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const data = await verifyRes.json();
    if (!data.success) {
      return res.status(200).json({
        ok: false,
        reason: "recaptcha_failed",
        details: data["error-codes"] || [],
      });
    }

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, reason: "verify_error", details: String(err?.message || err) });
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`reCAPTCHA verify API listening on http://127.0.0.1:${port}`);
});

