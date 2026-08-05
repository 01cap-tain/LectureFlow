import { createClient } from "redis";

const valkeyUrl = process.env.VALKEY_URL || process.env.REDIS_URL;
let clientPromise;
let keepAliveTimer;
let lastErrorAt = 0;

function logValkeyError(message) {
  const now = Date.now();

  // Avoid flooding logs during repeated network resets.
  if (now - lastErrorAt > 30000) {
    console.error("Valkey error:", message);
    lastErrorAt = now;
  }
}

function startKeepAlive(client) {
  if (keepAliveTimer) return;

  // A tiny ping keeps some managed TLS connections from going idle.
  keepAliveTimer = setInterval(async () => {
    if (!client.isOpen) return;

    try {
      await client.ping();
    } catch (err) {
      logValkeyError(err.message);
    }
  }, Number(process.env.VALKEY_PING_INTERVAL_MS || 4 * 60 * 1000));

  keepAliveTimer.unref?.();
}

export async function getValkeyClient({ required = false } = {}) {
  if (!valkeyUrl) {
    if (required) throw new Error("VALKEY_URL or REDIS_URL is required");
    return null;
  }

  if (!clientPromise) {
    const client = createClient({
      url: valkeyUrl,
      socket: {
        connectTimeout: 10000,
        reconnectStrategy(retries) {
          if (retries > 10) return false;
          return Math.min(retries * 250, 3000);
        },
      },
    });

    client.on("error", (err) => {
      logValkeyError(err.message);
    });

    clientPromise = client
      .connect()
      .then(() => {
        startKeepAlive(client);
        return client;
      })
      .catch((err) => {
        clientPromise = null;
        logValkeyError(err.message);
        if (required) throw err;
        return null;
      });
  }

  return clientPromise;
}
