/**
 * Cleanup script: removes vitest-generated test words from the live DB.
 * Run with: node scripts/cleanup-test-words.mjs
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [result] = await conn.execute(
  "DELETE FROM words WHERE word LIKE 'edit-test-%' OR word LIKE 'vitest-word-%'"
);

console.log(`Deleted ${result.affectedRows} test word(s).`);
await conn.end();
