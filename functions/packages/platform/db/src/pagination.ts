export type PageRequest = {
  limit?: number;
  cursor?: string;
};

export type Page<T> = {
  items: T[];
  nextCursor?: string;
};

export function normalizePageLimit(
  limit: number | undefined,
  options: {
    defaultLimit: number;
    maxLimit: number;
  } = {
    defaultLimit: 25,
    maxLimit: 100,
  }
): number {
  if (!limit || limit < 1) {
    return options.defaultLimit;
  }

  return Math.min(limit, options.maxLimit);
}
