import { app } from './app';

const server = app.listen(3001, () => {
  console.log('Price API: http://localhost:3001');
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.close());
}
