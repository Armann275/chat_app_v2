export function firstRow(result) {
  if (!result) return null;
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0][0] ?? null;
  }
  return result[0] ?? null;
}

export function rows(result) {
  if (!result) return [];
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0];
  }
  return result;
}
