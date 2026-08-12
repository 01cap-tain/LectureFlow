/**
 * Extract the department code from a matric number.
 * Example: SCI22CSC022 -> CSC.
 */
export function extractDepartmentCodeFromMatric(matric_no) {
  if (typeof matric_no !== "string" || !matric_no.trim()) {
    return null;
  }

  const letterGroups = matric_no.toUpperCase().match(/[A-Z]+/g);
  if (!letterGroups) return null;

  // Prefer the shortest useful code after a faculty prefix, e.g. SCI22CSC022 -> CSC.
  const knownPrefixes = new Set(["SCI", "ENG", "ART", "EDU", "LAW", "MED"]);
  const candidates = letterGroups.filter((group) => !knownPrefixes.has(group));
  const code = candidates[0] || letterGroups[letterGroups.length - 1];

  return code || null;
}
