import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

function createDatabaseAdapter() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required to start the database client.');
  }

  const url = new URL(connectionString);
  const database = url.pathname.replace(/^\//, '');

  if (!database) {
    throw new Error('DATABASE_URL must include a database name.');
  }

  return new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    // Shared hosting can briefly run two application instances while restarting.
    // Keep the pool small so it does not exhaust the Hostinger MySQL limit.
    connectionLimit: 5,
    connectTimeout: 5_000,
  });
}

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    adapter: createDatabaseAdapter(),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export async function connectDatabase() {
  // Hostinger replaces a running Node.js process with a new one during a
  // restart. Prisma can briefly reject the overlapping connection attempt;
  // retry so the replacement process does not exit and leave the site at 503.
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await prisma.$connect();
      console.log('Database connected successfully.');
      return;
    } catch (error) {
      console.error(`Database connection attempt ${attempt}/${maxAttempts} failed:`, error);

      if (attempt === maxAttempts) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}
