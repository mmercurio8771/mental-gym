// Returns the top N scores for the flexibility:stroop game.
// Uses Supabase service key to fetch data and masks emails.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const limitParam = event.queryStringParameters?.limit;
  let limit = 10;
  if (limitParam) {
    const n = parseInt(limitParam, 10);
    if (!Number.isNaN(n) && n > 0 && n <= 100) limit = n;
  }
  const base = `${SUPABASE_URL}/rest/v1/scores`;
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`
  };
  try {
    // Higher best scores are better.
    const url = `${base}?select=email,best,updated_at&game_id=eq.flexibility:stroop&best=gt.0&order=best.desc&limit=${limit}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Supabase error ${res.status}`);
    const data = await res.json();
    const masked = data.map(row => {
      const [name] = row.email.split('@');
      let display = name;
      if (display.length > 3) display = display.slice(0, 3);
      display += '@';
      return { email: display, best: row.best, updated_at: row.updated_at };
    });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(masked)
    };
  } catch (err) {
    return { statusCode: 500, body: 'Failed to load leaderboard' };
  }
};