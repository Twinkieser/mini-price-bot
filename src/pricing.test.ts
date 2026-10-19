import { describe, expect, it } from 'vitest';
import products from '../data/products.json';
import expected from '../data/expected.json';
import { calculatePrice } from './pricing';
import type { Product } from './types';

const product: Product = {
  sku: 'TEST', name: 'Тест', myPrice: 120, minPrice: 80, maxPrice: 150, step: 5,
  competitors: [{ price: 110, inStock: true }],
};

describe('calculatePrice', () => {
  it.each([
    ['TEA-01', 105, 'UNDERCUT'],
    ['COFFEE-02', 100, 'AT_MIN'],
    ['COCOA-03', 160, 'AT_MAX'],
    ['HONEY-04', 250, 'NO_COMPETITORS'],
    ['MILK-05', 87, 'UNDERCUT'],
  ] as const)('пример из README: %s', (sku, newPrice, reason) => {
    const example = products.find((item) => item.sku === sku);
    if (!example) throw new Error(`Нет примера ${sku}`);
    expect(calculatePrice(example)).toEqual({ sku, oldPrice: example.myPrice, newPrice, reason });
  });

  it('игнорирует более дешёвого конкурента без товара', () => {
    expect(calculatePrice({ ...product, competitors: [
      { price: 1, inStock: false }, { price: 110, inStock: true },
    ] })).toMatchObject({ newPrice: 105, reason: 'UNDERCUT' });
  });

  it('использует maxPrice для пустого списка', () => {
    expect(calculatePrice({ ...product, competitors: [] }))
      .toMatchObject({ newPrice: 150, reason: 'NO_COMPETITORS' });
  });

  it.each([80, 150])('candidate ровно %s остаётся UNDERCUT', (boundary) => {
    expect(calculatePrice({ ...product, competitors: [{ price: boundary + 5, inStock: true }] }))
      .toMatchObject({ newPrice: boundary, reason: 'UNDERCUT' });
  });

  it('поддерживает step = 0', () => {
    expect(calculatePrice({ ...product, step: 0 }))
      .toMatchObject({ newPrice: 110, reason: 'UNDERCUT' });
  });

  it('вычитает дробный step перед округлением вниз', () => {
    expect(calculatePrice({ ...product, step: 2.5, competitors: [{ price: 110.2, inStock: true }] }))
      .toMatchObject({ newPrice: 107, reason: 'UNDERCUT' });
  });

  it('обрабатывает одинаковые минимальные цены', () => {
    expect(calculatePrice({ ...product, competitors: [
      { price: 130, inStock: true }, { price: 110, inStock: true }, { price: 110, inStock: true },
    ] })).toMatchObject({ newPrice: 105, reason: 'UNDERCUT' });
  });

  it('myPrice влияет только на oldPrice', () => {
    const first = calculatePrice({ ...product, myPrice: 1 });
    const second = calculatePrice({ ...product, myPrice: 9999 });
    expect(first).toEqual({ sku: 'TEST', oldPrice: 1, newPrice: 105, reason: 'UNDERCUT' });
    expect(second).toEqual({ ...first, oldPrice: 9999 });
  });

  it('не изменяет входной объект и вложенные данные', () => {
    const input = structuredClone(product);
    const before = structuredClone(input);
    input.competitors.forEach(Object.freeze);
    Object.freeze(input.competitors);
    Object.freeze(input);
    calculatePrice(input);
    expect(input).toEqual(before);
  });

  it('сверяет весь products.json с expected.json в исходном порядке', () => {
    expect(products.map(calculatePrice)).toEqual(expected);
  });
});
