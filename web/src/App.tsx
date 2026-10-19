import { useEffect, useState } from 'react';
import products from '../../data/products.json';
import type { PriceReason, PriceResult } from '../../src/types';

const reasons: Record<PriceReason, string> = {
  NO_COMPETITORS: 'Нет конкурентов в наличии',
  AT_MIN: 'Достигнута минимальная цена',
  AT_MAX: 'Достигнута максимальная цена',
  UNDERCUT: 'Ниже цены конкурента',
};
const formatPrice = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; results: PriceResult[] };

function isPriceResult(value: unknown): value is PriceResult {
  if (typeof value !== 'object' || value === null) return false;
  return 'sku' in value && typeof value.sku === 'string'
    && 'oldPrice' in value && typeof value.oldPrice === 'number' && Number.isFinite(value.oldPrice)
    && 'newPrice' in value && typeof value.newPrice === 'number' && Number.isFinite(value.newPrice)
    && 'reason' in value && typeof value.reason === 'string' && Object.hasOwn(reasons, value.reason);
}

export function App() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });

    async function reprice() {
      try {
        const response = await fetch('/reprice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(products),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Сервер вернул ошибку ${response.status}.`);
        const body: unknown = await response.json();
        if (!Array.isArray(body)) throw new Error('Сервер вернул некорректные результаты.');
        const results: unknown[] = body;
        if (!results.every(isPriceResult) || results.length !== products.length
          || results.some((result, index) => result.sku !== products[index]?.sku)) {
          throw new Error('Сервер вернул некорректные результаты.');
        }
        if (!controller.signal.aborted) setState({ status: 'success', results });
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Не удалось получить цены.',
          });
        }
      }
    }

    void reprice();
    return () => controller.abort();
  }, [attempt]);

  return (
    <main>
      <header>
        <div>
          <p className="eyebrow">МИНИ-ПРАЙС-БОТ</p>
          <h1>Цены под контролем</h1>
          <p className="intro">Сравнение с конкурентами и пересчёт в заданных границах.</p>
        </div>
        <button disabled={state.status === 'loading'} onClick={() => setAttempt((value) => value + 1)}>
          {state.status === 'loading' ? 'Рассчитываем…' : 'Пересчитать цены'}
        </button>
      </header>

      {state.status === 'loading' && (
        <div className="notice" role="status">Загружаем и рассчитываем цены для {products.length} товаров…</div>
      )}
      {state.status === 'error' && (
        <div className="notice error" role="alert">
          <strong>Не удалось пересчитать цены</strong>
          <p>{state.message} Проверьте, что API запущен на порту 3001, и повторите запрос.</p>
        </div>
      )}
      {state.status === 'success' && (
        <section aria-label="Результаты пересчёта цен">
          <div className="section-title">
            <h2>Было / стало</h2>
            <span>{state.results.length} товаров</span>
          </div>
          <div className="table-scroll">
            <table>
              <caption className="sr-only">Старые и новые цены товаров с причинами изменения</caption>
              <thead>
                <tr>
                  <th scope="col">SKU</th><th scope="col">Название</th>
                  <th scope="col" className="number">Старая цена</th>
                  <th scope="col" className="number">Новая цена</th><th scope="col">Причина</th>
                </tr>
              </thead>
              <tbody>
                {state.results.map((result, index) => (
                  <tr key={result.sku}>
                    <td className="sku">{result.sku}</td>
                    <th scope="row">{products[index]?.name}</th>
                    <td className="number old-price">{formatPrice.format(result.oldPrice)}</td>
                    <td className="number new-price">{formatPrice.format(result.newPrice)}</td>
                    <td><span className={`reason ${result.reason.toLowerCase()}`} title={result.reason}>
                      {reasons[result.reason]}
                    </span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="footnote" role="status">Пересчёт завершён. Учтены только конкуренты с товаром в наличии.</p>
        </section>
      )}
    </main>
  );
}
