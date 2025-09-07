// Reads/writes best & streak to Supabase for the signed-in email.
const crypto = require("crypto");

// Node 18+ on Netlify: global fetch available
const SECRET = process.env.SESSION_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

function verifyToken(token) {
  if (!token) return null;
  const [payload, ts, sig] = token.split(".");
  if (!payload || !ts || !sig) return null;
  const ageMs = Date.now() - Number(ts);
  if (Number.isNaN(ageMs) || ageMs > 1000 * 60 * 60 * 24 * 30) return null; // 30 days
  const expect = crypto.createHmac("sha256", SECRET).update(`${payload}.${ts}`).digest("base64url");
  if (expect !== sig) return null;
  try { return Buffer.from(payload, "base64url").toString("utf8"); } catch { return null; }
}

exports.handler = async (event) => {
  const auth = event.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const email = verifyToken(token);
  if (!email) return { statusCode: 401, body: "Unauthorized" };

  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation"
  };
  const base = `${SUPABASE_URL}/rest/v1/scores`;

  if (event.httpMethod === "GET") {
    const game_id = event.queryStringParameters?.game_id;
    if (!game_id) return { statusCode: 400, body: "Missing game_id" };
    const res = await fetch(`${base}?email=eq.${encodeURIComponent(email)}&game_id=eq.${encodeURIComponent(game_id)}`, { headers });
    const data = await res.json();
    const row = data[0] || { email, game_id, best: 0, streak: 0 };
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(row) };
  }

  if (event.httpMethod === "POST") {
    const { game_id, best, streak } = JSON.parse(event.body || "{}");
    if (!game_id) return { statusCode: 400, body: "Missing game_id" };
    const payload = [{
      email, game_id,
      best: Number(best) || 0,
      streak: Number(streak) || 0,
      updated_at: new Date().toISOString()
    }];
    const res = await fetch(`${base}?on_conflict=email,game_id`, { method: "POST", headers, body: JSON.stringify(payload) });
    const data = await res.json();
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data[0]) };
  }

  return { statusCode: 405, body: "Method Not Allowed" };
};
