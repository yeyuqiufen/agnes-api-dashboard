# Agnes API Usage Dashboard

[中文说明](README.md)

A local dashboard for viewing Agnes API usage. It reads the latest three days of usage logs and displays tokens, requests, cache usage, trends, image generations, and video generation seconds in one place.

## Features

- Total, input, output, and cached tokens
- Minute and hourly usage trends
- Image generation count and video generation seconds
- Recent request records
- Manual refresh with the frontend updated five seconds later
- Automatic display units (K/M/B)

## Installation

Requires Node.js 18 or newer.

```bash
npm install
```

Copy the example configuration and enter your own Agnes API token:

```powershell
Copy-Item .env.example .env
notepad .env
```

Set at least:

```ini
AGNES_API_TOKEN=your Agnes API bearer token
```

Optionally set `AGNES_API_LOG_URL` to use another compatible usage-log endpoint.

## Run

```bash
npm start
```

Open <http://localhost:3001> in your browser.

## Security

Never commit `.env`, real tokens, `data.json`, logs, or local caches. They are excluded by `.gitignore`. Copy `.env.example` to `.env` and use your own token.

## Repository

<https://github.com/yeyuqiufen/agnes-api-dashboard>

## Feedback and contributions

Issues and contributions are welcome. Please report bugs, suggest improvements, or share ideas here:

<https://github.com/yeyuqiufen/agnes-api-dashboard/issues>
