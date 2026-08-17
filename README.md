# Agnes API Token Usage Dashboard

Local dashboard for Agnes API token usage. The server fetches the last three days from the Agnes usage-log API and the browser renders summaries, charts, and recent requests.

## Install

Requires Node.js 18 or newer:

```bash
npm install
```

Copy the example configuration and enter your own token:

```powershell
Copy-Item .env.example .env
notepad .env
```

Set at least:

```ini
AGNES_API_TOKEN=your Agnes API bearer token
```

Optionally set `AGNES_API_LOG_URL` to use another compatible usage endpoint.

## Run

```bash
npm start
```

Open http://localhost:3001. The page loads data once; click the refresh button to fetch new data. The dashboard reads token units automatically (K/M/B), and shows image generation count plus video generation seconds when those records are returned by the API.

## GitHub

Do not commit `.env`, `data.json`, video renders, or real tokens. They are ignored by default. Other users should copy `.env.example` to `.env` and enter their own token.
