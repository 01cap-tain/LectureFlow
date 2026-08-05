import { getValkeyClient } from "./valkey.js";

export async function getJsonCache(key) {
  try {
    const client = await getValkeyClient();
    if (!client) return null;

    const value = await client.get(key);
    if (!value) return null;

    return JSON.parse(value);
  } catch (err) {
    console.error("getJsonCache error:", err.message);
    return null;
  }
}

export async function setJsonCache(key, value, ttlSeconds) {
  try {
    const client = await getValkeyClient();
    if (!client) return false;

    await client.setEx(key, ttlSeconds, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error("setJsonCache error:", err.message);
    return false;
  }
}

export async function deleteCacheKeys(keys) {
  try {
    const client = await getValkeyClient();
    const uniqueKeys = [...new Set(keys.filter(Boolean))];
    if (!client || uniqueKeys.length === 0) return false;

    await client.del(uniqueKeys);
    return true;
  } catch (err) {
    console.error("deleteCacheKeys error:", err.message);
    return false;
  }
}
