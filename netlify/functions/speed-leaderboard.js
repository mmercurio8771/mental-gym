// Returns the top N fastest reaction times for the speed:reaction-time game.
// This function runs on the server and uses the Supabase service role key
// to fetch data from the scores table. It masks player emails to the first
// few characters for privacy.

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
    // Order ascending by best (lower times are better). If multiple players share
    // the same time the order is arbitrary but stable.
    const url = `${base}?select=email,best,updated_at&game_id=eq.speed:reaction-time&best=gt.0&order=best.asc&limit=${limit}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Supabase error ${res.status}`);
    const data = await res.json();
    // Mask emails: show up to first 3 characters of the local part followed by '@'
    const masked = data.map(row => {
      const [name] = row.email.split('@');
      let display = name;
      if (display.length > 3) display = display.slice(0, 3);
      display += '@';
      return {
        email: display,
        best: row.best,
        updated_at: row.updated_at
      };
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