// Generates a signed token for an email so we can save scores server-side.
const crypto = require("crypto");

const SECRET = process.env.SESSION_SECRET; // set in Netlify env

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  let email = "";
  try { email = (JSON.parse(event.body || "{}").email || "").trim().toLowerCase(); } catch {}
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    return { statusCode: 400, body: "Invalid email" };
  }

  const ts = Date.now().toString();
  const payload = Buffer.from(email).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(`${payload}.${ts}`).digest("base64url");
  const token = `${payload}.${ts}.${sig}`;

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token })
  };
};
