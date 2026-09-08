const prerender = false;
const CLIENT_ID = undefined                                 ;
const CLIENT_SECRET = undefined                                     ;
const REFRESH_TOKEN = undefined                                     ;
async function getAccessToken() {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": "Basic " + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: REFRESH_TOKEN
    })
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(data.error ?? "No access token");
  return data.access_token;
}
const GET = async () => {
  try {
    const token = await getAccessToken();
    const res = await fetch(
      "https://api.spotify.com/v1/me/player/recently-played?limit=10",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    const tracks = (data.items ?? []).map((item) => ({
      title: item.track.name,
      artist: item.track.artists.map((a) => a.name).join(", "),
      album: item.track.album.name,
      albumArt: item.track.album.images[1]?.url ?? item.track.album.images[0]?.url,
      spotifyUrl: item.track.external_urls.spotify,
      playedAt: item.played_at
    }));
    const seen = /* @__PURE__ */ new Set();
    const unique = tracks.filter((t) => {
      const key = `${t.title}::${t.artist}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return new Response(JSON.stringify({ tracks: unique }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60"
        // cache 60s at edge
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
