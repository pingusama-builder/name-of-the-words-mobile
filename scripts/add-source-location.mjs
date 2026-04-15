import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [cols] = await conn.execute('SHOW COLUMNS FROM words');
const colNames = cols.map(c => c.Field);

if (!colNames.includes('source')) {
  await conn.execute('ALTER TABLE words ADD COLUMN source VARCHAR(512) NULL');
  console.log('Added source');
} else {
  console.log('source already exists');
}

if (!colNames.includes('location')) {
  await conn.execute('ALTER TABLE words ADD COLUMN location VARCHAR(255) NULL');
  console.log('Added location');
} else {
  console.log('location already exists');
}

if (!colNames.includes('location_order')) {
  await conn.execute('ALTER TABLE words ADD COLUMN location_order INT NULL');
  console.log('Added location_order');
} else {
  console.log('location_order already exists');
}

console.log('Migration complete');
await conn.end();
