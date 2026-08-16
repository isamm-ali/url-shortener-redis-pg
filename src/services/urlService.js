import { db } from "../db/postgres.js";
import { client } from "../services/redisService.js";

export function generateShortCode() {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let shortcode = "";
  for (let i = 0; i < 6; i++) {
    const randomLetter = Math.floor(Math.random() * characters.length);
    shortcode += characters[randomLetter];
  }
  return shortcode;
}

export async function createShortUrl(originalUrl, expiresIn) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const shortCode = generateShortCode();

    try {
      const { rows } = await db.query(
        `insert into urls (short_code, original_url, expires_at)
        values ($1, $2, now() + ($3 * interval '1 second'))
        returning *`,
        [shortCode, originalUrl, expiresIn],
      );

      return {
        originalUrl: rows[0].original_url,
        shortCode: rows[0].short_code,
        expires_at: rows[0].expires_at,
      };
    } catch (error) {
      // PostgreSQL unique_violation
      if (error.code === "23505") {
        continue;
      }

      throw error;
    }
  }
  throw new Error("Failed to generate a unique short code")
}

export async function getOriginalUrl(shortCode) {
  let originalUrl;
  const cachedUrl = await client.get(shortCode);
  if (cachedUrl) {
    await client.incr("cache:hits");
    originalUrl = cachedUrl;
  } else {
    const result = await db.query(
      "select original_url, expires_at from urls where short_code = $1 and (expires_at is null or expires_at > now())",
      [shortCode],
    );
    if (result.rows.length === 0) {
      return null;
    }
    await client.incr("cache:miss");
    originalUrl = result.rows[0].original_url;
    const expiresAt = result.rows[0].expires_at;
    if (!expiresAt) {
      await client.set(shortCode, originalUrl);
    } else {
      const lifeTime = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
      await client.set(shortCode, originalUrl, { EX: lifeTime });
    }
  }

  await client.incr(`clicks:${shortCode}`);
  await client.set(`last_clicked:${shortCode}`, Date.now());
  return originalUrl;
}

export async function getUrlStats(shortCode) {
  const result = await db.query(
    `select original_url, created_at, expires_at from urls where short_code = $1`,
    [shortCode],
  );
  if (result.rows.length === 0) {
    return null;
  }
  const clicks = (await client.get(`clicks:${shortCode}`)) || "0";
  const lastClickedTime = await client.get(`last_clicked:${shortCode}`);
  const lastClicked = lastClickedTime
    ? new Date(Number(lastClickedTime)).toISOString()
    : "Not available";
  return {
    originalUrl: result.rows[0].original_url,
    createdAt: result.rows[0].created_at,
    expiresAt: result.rows[0].expires_at,
    clicks: clicks,
    lastClicked: lastClicked,
  };
}

export async function getUrlMetrics() {
  const hits = Number(await client.get("cache:hits")) || 0;
  const misses = Number(await client.get("cache:miss")) || 0;
  const hitRate = hits + misses === 0? "0%" : `${((hits / (hits + misses)) * 100).toFixed(2)}%`;
  return {
    cacheHits: hits,
    cacheMisses: misses,
    hitRate: hitRate,
  };
}
