import { createApp } from './bootstrap.js';

// Port is hard-coded until environment validation lands (plan Task 3).
const PORT = 3001;

const app = await createApp();
await app.listen(PORT);
