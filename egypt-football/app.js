// Vercel entry point. Vercel detects an Express app only when this file imports express itself,
// so the real app (server/index.js) is mounted on a thin wrapper. Locally, use `npm start`.
import express from 'express';
import site from './server/index.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(site);

export default app;
