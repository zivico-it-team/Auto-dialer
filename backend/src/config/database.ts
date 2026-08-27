import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
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
