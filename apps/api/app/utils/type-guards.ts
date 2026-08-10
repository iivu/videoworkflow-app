export type JsonRecord = Record<string, unknown>;

export function asRecord(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as JsonRecord) : null;
}

export function optionalString(record: JsonRecord | null, key: string): string | undefined {
  const value = record?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

export function optionalArray<T>(record: JsonRecord | null, key: string) {
  const value = record?.[key];
  return Array.isArray(value) ? (value as T[]) : [];
}
