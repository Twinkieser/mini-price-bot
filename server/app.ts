import cors from 'cors';
import express from 'express';
import type { ErrorRequestHandler } from 'express';
import { calculatePrice } from '../src/pricing';
import { isProduct } from './validation';

export const app = express();
app.use(cors());
app.use(express.json());

app.post('/reprice', (request, response) => {
  const body: unknown = request.body;
  if (!Array.isArray(body)) {
    response.status(400).json({ error: 'Ожидается массив товаров Product[].' });
    return;
  }
  const products: unknown[] = body;
  const invalidIndex = products.findIndex((product) => !isProduct(product));
  if (invalidIndex !== -1) {
    response.status(400).json({ error: `Некорректный товар по индексу ${invalidIndex}.` });
    return;
  }
  response.json(products.filter(isProduct).map(calculatePrice));
});

const handleError: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof SyntaxError) {
    response.status(400).json({ error: 'Некорректный JSON.' });
    return;
  }
  if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.too.large') {
    response.status(413).json({ error: 'Слишком большой запрос.' });
    return;
  }
  response.status(500).json({ error: 'Ошибка сервера.' });
};
app.use(handleError);
