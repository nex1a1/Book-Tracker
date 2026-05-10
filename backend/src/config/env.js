import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../');

export const config = {
  PORT: process.env.PORT || 3001,
  MAL_CLIENT_ID: process.env.MAL_CLIENT_ID || 'c46d973094ed01130b93efd3a0015ab4',
  DB_PATH: process.env.DB_PATH || path.join(rootDir, 'data/manga.db'),
  DATA_DIR: path.join(rootDir, 'data')
};
