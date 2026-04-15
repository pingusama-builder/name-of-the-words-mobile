import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env
const envFile = resolve(__dirname, "../.env");
try {
  const envContent = readFileSync(envFile, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
} catch {}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await mysql.createConnection(url);

// Apply migration 0002: add user_id to words + create users table
const sqls = [
  // Add user_id to words if not exists
  `ALTER TABLE \`words\` ADD COLUMN IF NOT EXISTS \`user_id\` varchar(128)`,
  // Create users table if not exists
  `CREATE TABLE IF NOT EXISTS \`users\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`open_id\` varchar(128) NOT NULL,
    \`name\` varchar(255),
    \`email\` varchar(255),
    \`login_method\` varchar(64),
    \`role\` enum('user','admin') NOT NULL DEFAULT 'user',
    \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`last_signed_in\` timestamp,
    CONSTRAINT \`users_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`users_open_id_unique\` UNIQUE(\`open_id\`)
  )`,
];

for (const sql of sqls) {
  try {
    await conn.execute(sql);
    console.log("✓", sql.substring(0, 60).replace(/\s+/g, " ") + "...");
  } catch (err) {
    if (err.code === "ER_DUP_FIELDNAME" || err.code === "ER_TABLE_EXISTS_ERROR") {
      console.log("⚠ Already exists, skipping:", err.code);
    } else {
      console.error("✗ Failed:", err.message);
    }
  }
}

// Verify
const [rows] = await conn.execute("DESCRIBE `words`");
const hasUserId = rows.some(r => r.Field === "user_id");
console.log("\nwords.user_id column exists:", hasUserId);

const [uRows] = await conn.execute("SHOW TABLES LIKE 'users'");
console.log("users table exists:", uRows.length > 0);

await conn.end();
console.log("\nDone.");
