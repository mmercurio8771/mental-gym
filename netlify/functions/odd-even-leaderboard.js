// Returns the top N fastest average times for the speed:odd-even game.
// Queries the scores table using the Supabase service key and masks player emails.

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
    // Lower best times are better (faster reactions). Only include positive scores.
    const url = `${base}?select=email,best,updated_at&game_id=eq.speed:odd-even&best=gt.0&order=best.asc&limit=${limit}`;
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