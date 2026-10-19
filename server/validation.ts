import type { Competitor, Product } from '../src/types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isCompetitor(value: unknown): value is Competitor {
  return isRecord(value) && isNonNegativeNumber(value.price) && typeof value.inStock === 'boolean';
}

export function isProduct(value: unknown): value is Product {
  if (!isRecord(value)) return false;
  return typeof value.sku === 'string' && value.sku.trim().length > 0
    && typeof value.name === 'string' && value.name.trim().length > 0
    && isNonNegativeNumber(value.myPrice)
    && isNonNegativeNumber(value.minPrice)
    && isNonNegativeNumber(value.maxPrice)
    && value.minPrice <= value.maxPrice
    && isNonNegativeNumber(value.step)
    && Array.isArray(value.competitors)
    && value.competitors.every(isCompetitor);
}
