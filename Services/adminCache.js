import { deleteCacheKeys } from "./cache.js";

export const adminCacheKeys = {
  admins: "admin:list:admins",
  courses: "admin:list:courses",
  departments: "admin:list:departments",
  faculties: "admin:list:faculties",
  lecturers: "admin:list:lecturers",
  venues: "admin:list:venues",
};

export async function clearAdminListCache(keys) {
  return deleteCacheKeys(keys);
}
