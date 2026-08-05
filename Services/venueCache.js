import { deleteCacheKeys } from "./cache.js";

function formatDateForCache(date) {
  if (date instanceof Date) return date.toISOString().slice(0, 10);
  return String(date).slice(0, 10);
}

export function getVenueQueueCacheKey({ venue_id, date }) {
  return `v3:venue:${venue_id}:queue:${formatDateForCache(date)}`;
}

export async function clearVenueCache({ venue_ids = [], dates = [] }) {
  const keys = [];

  for (const venue_id of venue_ids) {
    for (const date of dates) {
      keys.push(getVenueQueueCacheKey({ venue_id, date }));
    }
  }

  return deleteCacheKeys(keys);
}
