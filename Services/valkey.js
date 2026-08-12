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

  // A tiny ping keeps managed TLS connections warm during quiet periods.
  keepAliveTimer = setInterval(async () => {
    if (!client.isReady) return;

    try {
      await client.ping();
    } catch (err) {
      logValkeyError(err.message);
    }
  }, Number(process.env.VALKEY_PING_INTERVAL_MS));

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
          // Never return false here. Sessions need this client to recover after
          // temporary Aiven/network socket resets instead of closing forever.
          return Math.min(retries * 250, 5000);
        },
      },
    });

    client.on("error", (err) => {
      logValkeyError(err.message);
    });

    client.on("end", () => {
      logValkeyError(
        "connection ended; reconnecting when Redis client allows it",
      );
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
