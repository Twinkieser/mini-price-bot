import type { Product, PriceResult } from './types';

export function calculatePrice(product: Product): PriceResult {
  const available = product.competitors.filter((competitor) => competitor.inStock);
  const base = { sku: product.sku, oldPrice: product.myPrice };

  if (available.length === 0) {
    return { ...base, newPrice: product.maxPrice, reason: 'NO_COMPETITORS' };
  }

  const best = available.reduce((lowest, competitor) => Math.min(lowest, competitor.price), Infinity);
  const candidate = Math.floor(best - product.step);

  if (candidate < product.minPrice) {
    return { ...base, newPrice: product.minPrice, reason: 'AT_MIN' };
  }
  if (candidate > product.maxPrice) {
    return { ...base, newPrice: product.maxPrice, reason: 'AT_MAX' };
  }
  return { ...base, newPrice: candidate, reason: 'UNDERCUT' };
}
