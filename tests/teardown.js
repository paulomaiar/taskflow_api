afterAll(async () => {
  const prisma = require('../src/database/prisma');
  const pool = require('../src/database/db');

  await Promise.all([
    prisma.$disconnect(),
    pool.end(),
  ]);
});
