/**
 * Resolve department from consecutive alphabetic groups in a matric number.
 * Only whole letter runs match (e.g. "CSC" in "CSC/2021/001"), not scattered letters.
 *
 * Known codes:
 *   CSC -> Computer Science
 *   STA -> Statistics
 *   SE  -> Software Engineering
 *
 * @param {string} matric_no
 * @returns {{ code: string, name: string } | null}
 */
export function resolveDepartmentFromMatric(matric_no) {
  if (typeof matric_no !== "string" || !matric_no.trim()) {
    return null;
  }

  // Consecutive A-Z runs only (ignores digits, slashes, dots, hyphens)
  const letterGroups = matric_no.toUpperCase().match(/[A-Z]+/g);
  if (!letterGroups) {
    return null;
  }

  for (const group of letterGroups) {
    switch (group) {
      case "CSC":
        return { code: "CSC", name: "Computer Science" };
      case "STA":
        return { code: "STA", name: "Statistics" };
      case "SE":
        return { code: "SE", name: "Software Engineering" };
      default:
        break;
    }
  }

  return null;
}
