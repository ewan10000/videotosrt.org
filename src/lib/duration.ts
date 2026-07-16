export function parseDurationSeconds(value: unknown) {
  const duration = Number(value);
  return Number.isFinite(duration) && duration > 0 ? Math.ceil(duration) : null;
}
