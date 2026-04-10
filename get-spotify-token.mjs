/**
 * One-time script to get a Spotify refresh token.
 * Run: node get-spotify-token.mjs
 * Delete this file afterwards — don't commit it.
 */

const CLIENT_ID     = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI  = 'https://dylandibona.com/callback';
const SCOPES        = 'user-read-recently-played user-top-read';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\nMissing credentials. Run as:\n');
  console.error('  SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy node get-spotify-token.mjs\n');
  process.exit(1);
}

// Step 1 — print the auth URL for the user to visit
const authUrl = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
  client_id:     CLIENT_ID,
  response_type: 'code',
  redirect_uri:  REDIRECT_URI,
  scope:         SCOPES,
});

console.log('\n1. Open this URL in your browser:\n');
console.log('   ' + authUrl);
console.log('\n2. Approve the permissions.');
console.log('3. You\'ll be redirected to dylandibona.com/callback — the page won\'t load.');
console.log('4. Copy the FULL URL from your browser bar and paste it below.\n');

// Step 2 — read a single line from stdin
import readline from 'readline';
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Paste the full redirect URL: ', async (url) => {
  rl.close();
  url = url.trim();
  let code;
  try {
    code = new URL(url).searchParams.get('code');
  } catch (e) {
    console.error('\nCouldn\'t parse that URL. Make sure you copied the full thing.\n');
    process.exit(1);
  }

  if (!code) {
    console.error('\nNo "code" parameter found in the URL.\n');
    process.exit(1);
  }

  // Step 3 — exchange code for tokens
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type:   'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  const data = await res.json();

  if (data.error) {
    console.error('\nSpotify error:', data.error, data.error_description, '\n');
    process.exit(1);
  }

  console.log('\n✓ Done! Add this to Vercel as SPOTIFY_REFRESH_TOKEN:\n');
  console.log('  ' + data.refresh_token);
  console.log('\n(Access token expires in 1h — only the refresh token matters.)\n');
});
