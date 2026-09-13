# URL Shortener

A backend URL shortener built with Express 5, PostgreSQL, and Redis. Generates short codes for long URLs, caches redirects for speed, tracks click activity, and rate-limits every route, all running behind a single Docker Compose stack.

![Node.js](https://img.shields.io/badge/Node.js_22-339933?style=flat&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express_5-000000?style=flat&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## Stress Test Preview

| | |
| <img src="https://github.com/user-attachments/assets/86c13aaa-2220-4d3e-95a6-bb4563aaf417" width="500"> | <img src="https://github.com/user-attachments/assets/5bee257a-bb33-44aa-a2ec-6cd8939d0250" width="500"> |
| <img src="https://github.com/user-attachments/assets/d774beca-9328-4f23-8758-992a2d396029" width="500"> | <img src="https://github.com/user-attachments/assets/9417e434-e9b1-49a0-a839-1ab4c2a70832" width="500"> |

## Features

- **Short link generation**: 6-character short codes, generated with automatic retry on collision
- **Optional expiry**: links can be created with a TTL (in seconds) or set to never expire
- **Redis-backed redirects**: cache-aside lookups on every redirect. Redis first, falling back to Postgres on a miss and repopulating the cache
- **Click tracking**: per-code click counts and last-clicked timestamps, tracked in Redis and exposed via the stats endpoint
- **Cache metrics**: global cache hit/miss counters and hit rate via `/stats/cache`
- **Rate limiting**: fixed-window rate limiting per IP, backed by Redis, configurable independently per route
- **Centralized error handling**: a single `AppError` class and error middleware produce consistent JSON error responses across the whole API, with Express 5's built-in async error forwarding handling rejected promises automatically
- **Dockerized**: app, Postgres, and Redis run together via `docker compose up`, with healthchecks gating startup order

## Tech stack

| Layer | Tech |
|---|---|
| Runtime | Node.js 22, Express 5 |
| Database | PostgreSQL |
| Cache | Redis (redis-stack) |
| Container | Docker, Docker Compose |

## Project structure

```
.
├── docker/
│   └── init.sql
├── src/
│   ├── controllers/
│   │   └── urlController.js
│   ├── db/
│   │   └── postgres.js
│   ├── middlewares/
│   │   ├── errorMiddleware.js
│   │   └── rateLimit.js
│   ├── routes/
│   │   └── urlRoutes.js
│   ├── services/
│   │   ├── redisService.js
│   │   └── urlService.js
│   ├── utils/
│   │   └── AppError.js
│   ├── app.js
│   └── server.js
├── compose.yaml
├── Dockerfile
├── package.json
└── .env
```

## Getting started

### Prerequisites

- Docker & Docker Compose

### Setup

1. Clone the repo and add a `.env` file in the project root:

   ```env
   PORT=5000
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_HOST=postgres
   POSTGRES_PORT=5432
   POSTGRES_DB=mydatabase
   REDIS_HOST=redis
   REDIS_PORT=6379
   ```

2. Start the stack:

   ```bash
   docker compose up --build
   ```

3. The app is available at `http://localhost:5000`.

### Running locally (without Docker)

```bash
npm install
npm start
```

Make sure Postgres and Redis are running and reachable at the hosts/ports set in `.env`.

## API reference

### Create a short URL

```
POST /urls
```

**Body**

```json
{
  "url": "https://example.com/some/very/long/path",
  "expiresIn": 3600
}
```

`expiresIn` is optional, omit it or pass `null` for a link that never expires. Value is in seconds.

**Response** `201`

```json
{
  "originalUrl": "https://example.com/some/very/long/path",
  "shortCode": "aZ3kQ9",
  "expires_at": "2026-08-16T14:30:00.000Z"
}
```

### Redirect

```
GET /:code
```

Redirects to the original URL if it exists and hasn't expired. Returns `404` otherwise.

### Get stats for a short code

```
GET /stats/:code
```

**Response** `200`

```json
{
  "originalUrl": "https://example.com/some/very/long/path",
  "createdAt": "2026-08-16T13:30:00.000Z",
  "expiresAt": "2026-08-16T14:30:00.000Z",
  "clicks": "12",
  "lastClicked": "2026-08-16T14:12:03.512Z"
}
```

### Get global cache metrics

```
GET /stats/cache
```

**Response** `200`

```json
{
  "cacheHits": 142,
  "cacheMisses": 18,
  "hitRate": "88.75%"
}
```

## Rate limits

| Route | Limit |
|---|---|
| `POST /urls` | 10 requests / 60s |
| `GET /stats/:code` | 30 requests / 60s |
| `GET /stats/cache` | 10 requests / 60s |
| `GET /:code` | 10 requests / 60s |

Limits are per IP, tracked in Redis with a fixed window. Exceeding the limit returns `429` with a `retryAfter` field (seconds).

## Environment variables

| Variable | Description |
|---|---|
| `PORT` | Port the app listens on |
| `POSTGRES_USER` | Postgres username |
| `POSTGRES_PASSWORD` | Postgres password |
| `POSTGRES_HOST` | Postgres host |
| `POSTGRES_PORT` | Postgres port |
| `POSTGRES_DB` | Postgres database name |
| `REDIS_HOST` | Redis host |
| `REDIS_PORT` | Redis port |

## Benchmarks

Load testing was performed using **autocannon** against the Redis-backed `GET /:code` redirect endpoint.

### Results

| Concurrent connections | RPS | Avg latency | p99 latency |
|---|---|---|---|
| 500 | 4,277 req/s | 116 ms | 266 ms |
| 1,000 | 3,752 req/s | 264 ms | 1,196 ms |
| 2,000 | 3,281 req/s | 631 ms | 2,575 ms |

The Redis hot-cache test maintained a **100% cache hit rate with 0 misses**.

As concurrency increased, requests per second started to drop while response times increased sharply.

> These benchmarks were run locally and should not be interpreted as production capacity.

## License

MIT
