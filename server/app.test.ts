import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import products from '../data/products.json';
import expected from '../data/expected.json';
import { app } from './app';

let server: Server;
let endpoint: string;

beforeAll(async () => {
  server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Нет адреса тестового сервера');
  endpoint = `http://127.0.0.1:${address.port}/reprice`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

function post(body: unknown): Promise<Response> {
  return fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}

describe('POST /reprice', () => {
  it('возвращает все результаты в исходном порядке и разрешает CORS', async () => {
    const response = await post(products);
    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(await response.json()).toEqual(expected);
  });

  it('принимает пустой массив', async () => {
    const response = await post([]);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it.each([null, {}, 'text', 42])('отклоняет тело вне массива: %j', async (body) => {
    expect((await post(body)).status).toBe(400);
  });

  const valid = products[0];
  if (!valid) throw new Error('Нет тестового товара');

  it.each([
    null,
    {},
    { ...valid, sku: '' },
    { ...valid, name: 1 },
    { ...valid, myPrice: '120' },
    { ...valid, minPrice: null },
    { ...valid, maxPrice: -1 },
    { ...valid, minPrice: 999 },
    { ...valid, step: -1 },
    { ...valid, competitors: {} },
    { ...valid, competitors: [null] },
    { ...valid, competitors: [{ price: '100', inStock: true }] },
    { ...valid, competitors: [{ price: 100, inStock: 'true' }] },
  ])('отклоняет некорректный элемент %j', async (invalid) => {
    const response = await post([valid, invalid]);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Некорректный товар по индексу 1.' });
  });

  it('отклоняет бесконечное JSON-число', async () => {
    const response = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([valid]).replace('120', '1e999'),
    });
    expect(response.status).toBe(400);
  });

  it('отклоняет повреждённый JSON', async () => {
    const response = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '[',
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Некорректный JSON.' });
  });
});
