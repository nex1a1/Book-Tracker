import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../');
if (!process.env.MAL_CLIENT_ID) {
    throw new Error('MAL_CLIENT_ID is not set in .env');
}
export const config = {
    PORT: process.env.PORT || 3001,
    MAL_CLIENT_ID: process.env.MAL_CLIENT_ID,
    DB_PATH: process.env.DB_PATH || path.join(rootDir, 'data/manga.db'),
    DATA_DIR: path.join(rootDir, 'data')
};
