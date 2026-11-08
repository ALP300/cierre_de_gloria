// Crea un administrador del congreso, o cambia su contraseña si ya existe.
// Uso: npm run crear-admin
// También crea las tablas de administradores si todavía no existen.
import fs from 'node:fs';
import readline from 'node:readline';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const BACKEND = 'C:/back_lacasita/lacasa_informatica_aula';
const MIN_PASSWORD = 10;

function connectionConfig() {
  const override = process.env.CIERRE_DB_URL;
  if (override) return { connectionString: override };

  const env = fs.readFileSync(`${BACKEND}/.env`, 'utf8');
  const raw = env.match(/^\s*ConnectionStrings__DefaultConnection\s*=\s*(.+?)\s*$/m)?.[1]?.replace(/^["']|["']$/g, '');
  if (!raw) throw new Error('No se encontró ConnectionStrings__DefaultConnection en el .env del backend.');
  if (/^postgres(ql)?:\/\//.test(raw)) return { connectionString: raw, ssl: { rejectUnauthorized: false } };

  const parts = Object.fromEntries(raw.split(';').filter(Boolean).map(part => {
    const index = part.indexOf('=');
    return [part.slice(0, index).trim().toLowerCase(), part.slice(index + 1).trim()];
  }));
  return {
    host: parts.host ?? parts.server,
    port: Number(parts.port ?? 5432),
    database: parts.database,
    user: parts.username ?? parts['user id'] ?? parts.user,
    password: parts.password,
    ssl: /disable/i.test(parts['ssl mode'] ?? parts.sslmode ?? '') ? false : { rejectUnauthorized: false },
  };
}

function describe(config) {
  if (!config.connectionString) return `${config.host} / ${config.database}`;
  const url = new URL(config.connectionString);
  return `${url.hostname} / ${url.pathname.slice(1)}`;
}

const lines = readline.createInterface({ input: process.stdin })[Symbol.asyncIterator]();
async function ask(question) {
  process.stdout.write(question);
  const { value } = await lines.next();
  return (value ?? '').trim();
}

const config = connectionConfig();
console.log(`\nBase de datos: ${describe(config)}`);
if ((await ask('¿Es la base de producción correcta? Escribe s para continuar: ')).toLowerCase() !== 's') {
  console.log('Cancelado. No se hizo ningún cambio.');
  process.exit(0);
}

const email = (await ask('Correo del administrador: ')).toLowerCase();
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Ese correo no es válido.');

const password = await ask(`Contraseña (${MIN_PASSWORD} caracteres o más): `);
if (password.length < MIN_PASSWORD) throw new Error(`La contraseña debe tener ${MIN_PASSWORD} caracteres o más.`);

const hash = await bcrypt.hash(password, 11);
const client = new pg.Client(config);
await client.connect();
try {
  await client.query('BEGIN');
  await client.query(fs.readFileSync(`${BACKEND}/migration_cierre_gloria_admins.sql`, 'utf8'));
  const { rows } = await client.query(
    `INSERT INTO "CierreGloriaAdmins" ("Email", "PasswordHash", "CreatedAt")
     VALUES ($1, $2, timezone('utc', now()))
     ON CONFLICT ("Email") DO UPDATE SET "PasswordHash" = EXCLUDED."PasswordHash"
     RETURNING "Id"`,
    [email, hash],
  );
  await client.query('DELETE FROM "CierreGloriaAdminSessions" WHERE "AdminId" = $1', [rows[0].Id]);
  await client.query('COMMIT');
  console.log(`\nListo. ${email} ya puede entrar en /admin.`);
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
process.exit(0);
