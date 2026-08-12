import { getValkeyClient } from "./valkey.js";

const CACHE_PAUSE_MS = Number(process.env.CACHE_CIRCUIT_BREAKER_MS);
let cachePausedUntil = 0;

function isCachePaused() {
  return Date.now() < cachePausedUntil;
}

function pauseCache(err) {
  // If Valkey is unstable, pause cache attempts briefly and let routes use DB.
  cachePausedUntil = Date.now() + CACHE_PAUSE_MS;
  console.error("Valkey cache paused:", err.message);
}

export async function getJsonCache(key) {
  try {
    if (isCachePaused()) return null;

    const client = await getValkeyClient();
    if (!client || !client.isReady) return null;

    const value = await client.get(key);
    if (!value) return null;

    return JSON.parse(value);
  } catch (err) {
    pauseCache(err);
    return null;
  }
}

export async function setJsonCache(key, value, ttlSeconds) {
  try {
    if (isCachePaused()) return false;

    const client = await getValkeyClient();
    if (!client || !client.isReady) return false;

    await client.setEx(key, ttlSeconds, JSON.stringify(value));
    return true;
  } catch (err) {
    pauseCache(err);
    return false;
  }
}

export async function deleteCacheKeys(keys) {
  try {
    if (isCachePaused()) return false;

    const client = await getValkeyClient();
    const uniqueKeys = [...new Set(keys.filter(Boolean))];
    if (!client || !client.isReady || uniqueKeys.length === 0) return false;

    await client.del(uniqueKeys);
    return true;
  } catch (err) {
    pauseCache(err);
    return false;
  }
}
