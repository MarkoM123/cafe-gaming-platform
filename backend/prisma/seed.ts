import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ensureOperatingHours = async () => {
  const existing = await prisma.operatingHour.count();
  if (existing > 0) return;

  await prisma.operatingHour.createMany({
    data: [
      { dayOfWeek: 0, openTime: '08:00', closeTime: '23:59', isClosed: false },
      { dayOfWeek: 1, openTime: '08:00', closeTime: '23:59', isClosed: false },
      { dayOfWeek: 2, openTime: '08:00', closeTime: '23:59', isClosed: false },
      { dayOfWeek: 3, openTime: '08:00', closeTime: '23:59', isClosed: false },
      { dayOfWeek: 4, openTime: '08:00', closeTime: '23:59', isClosed: false },
      { dayOfWeek: 5, openTime: '08:00', closeTime: '23:59', isClosed: false },
      { dayOfWeek: 6, openTime: '08:00', closeTime: '23:59', isClosed: false },
    ],
  });
};

const ensureUsers = async () => {
  const count = await prisma.user.count();
  if (count > 0) return;

  const adminHash = await bcrypt.hash('admin123', 10);
  const staffHash = await bcrypt.hash('staff123', 10);
  const demoHash = await bcrypt.hash('demo123', 10);

  await prisma.user.createMany({
    data: [
      {
        email: 'admin@demo.com',
        passwordHash: adminHash,
        name: 'Admin',
        role: UserRole.ADMIN,
      },
      {
        email: 'staff@demo.com',
        passwordHash: staffHash,
        name: 'Staff',
        role: UserRole.STAFF,
      },
      {
        email: 'demo@demo.com',
        passwordHash: demoHash,
        name: 'Demo',
        role: UserRole.GAMER,
      },
    ],
  });
};

const ensureMenu = async () => {
  const count = await prisma.menuCategory.count();
  if (count > 0) return;

  await prisma.menuCategory.create({
    data: {
      name: 'Kafa',
      sortOrder: 1,
      items: {
        create: [
          { name: 'Espresso', priceCents: 220, isActive: true },
          { name: 'Dupli espresso', priceCents: 280, isActive: true },
          { name: 'Espresso macchiato', priceCents: 250, isActive: true },
          { name: 'Americano', priceCents: 260, isActive: true },
          { name: 'Cappuccino', priceCents: 300, isActive: true },
          { name: 'Latte', priceCents: 330, isActive: true },
          { name: 'Mocha', priceCents: 350, isActive: true },
          { name: 'Flat white', priceCents: 340, isActive: true },
          { name: 'Cold brew', priceCents: 360, isActive: true },
          { name: 'Iced latte', priceCents: 360, isActive: true },
        ],
      },
    },
  });

  await prisma.menuCategory.create({
    data: {
      name: 'Bez kofeina',
      sortOrder: 2,
      items: {
        create: [
          { name: 'Kafa bez kofeina', priceCents: 300, isActive: true },
          { name: 'Kakao', priceCents: 280, isActive: true },
          { name: 'Topla čokolada', priceCents: 320, isActive: true },
          { name: 'Čaj (biljni)', priceCents: 220, isActive: true },
          { name: 'Čaj (crni)', priceCents: 220, isActive: true },
          { name: 'Čaj (zeleni)', priceCents: 240, isActive: true },
        ],
      },
    },
  });

  await prisma.menuCategory.create({
    data: {
      name: 'Vode',
      sortOrder: 3,
      items: {
        create: [
          { name: 'Rosa 0.33', priceCents: 140, isActive: true },
          { name: 'Rosa 0.5', priceCents: 180, isActive: true },
          { name: 'Rosa 0.75', priceCents: 220, isActive: true },
          { name: 'Knjaz Miloš 0.33', priceCents: 150, isActive: true },
          { name: 'Knjaz Miloš 0.5', priceCents: 190, isActive: true },
          { name: 'Knjaz Miloš 0.75', priceCents: 230, isActive: true },
          { name: 'Prolom 0.33', priceCents: 150, isActive: true },
          { name: 'Aqua Viva 0.5', priceCents: 170, isActive: true },
        ],
      },
    },
  });

  await prisma.menuCategory.create({
    data: {
      name: 'Sokovi i gazirano',
      sortOrder: 4,
      items: {
        create: [
          { name: 'Coca-Cola 0.33', priceCents: 220, isActive: true },
          { name: 'Coca-Cola Zero 0.33', priceCents: 220, isActive: true },
          { name: 'Fanta 0.33', priceCents: 220, isActive: true },
          { name: 'Sprite 0.33', priceCents: 220, isActive: true },
          { name: 'Schweppes Bitter Lemon', priceCents: 240, isActive: true },
          { name: 'Schweppes Tonic', priceCents: 240, isActive: true },
          { name: 'Schweppes Tangerine', priceCents: 240, isActive: true },
          { name: 'Next jabuka 0.2', priceCents: 200, isActive: true },
          { name: 'Next narandža 0.2', priceCents: 200, isActive: true },
          { name: 'Nectar narandža 0.2', priceCents: 200, isActive: true },
          { name: 'Nectar breskva 0.2', priceCents: 200, isActive: true },
          { name: 'Nectar višnja 0.2', priceCents: 200, isActive: true },
          { name: 'Breskva 0.25', priceCents: 210, isActive: true },
          { name: 'Borovnica 0.25', priceCents: 210, isActive: true },
          { name: 'Multivitamin 0.25', priceCents: 210, isActive: true },
          { name: 'Cedevita narandža', priceCents: 190, isActive: true },
          { name: 'Cedevita limun', priceCents: 190, isActive: true },
          { name: 'Ice Tea breskva 0.5', priceCents: 260, isActive: true },
          { name: 'Ice Tea limun 0.5', priceCents: 260, isActive: true },
          { name: 'Red Bull 0.25', priceCents: 360, isActive: true },
        ],
      },
    },
  });

  await prisma.menuCategory.create({
    data: {
      name: 'Limunade i specijal',
      sortOrder: 5,
      items: {
        create: [
          { name: 'Limunada klasična', priceCents: 240, isActive: true },
          { name: 'Limunada nana', priceCents: 260, isActive: true },
          { name: 'Limunada đumbir', priceCents: 260, isActive: true },
          { name: 'Narandžada', priceCents: 280, isActive: true },
          { name: 'Tonik sa limetom', priceCents: 280, isActive: true },
        ],
      },
    },
  });

  await prisma.menuCategory.create({
    data: {
      name: 'Zalogaji',
      sortOrder: 6,
      items: {
        create: [
          { name: 'Tost', priceCents: 350, isActive: true },
          { name: 'Nachos', priceCents: 420, isActive: true },
          { name: 'Sendvič šunka-sir', priceCents: 420, isActive: true },
          { name: 'Sendvič piletina', priceCents: 460, isActive: true },
        ],
      },
    },
  });
};

const ensureGames = async () => {
  const gameCount = await prisma.game.count();
  const stationCount = await prisma.gameStation.count();

  if (gameCount === 0) {
    await prisma.game.createMany({
      data: [
        { name: 'CS2', isActive: true },
        { name: 'Dota 2', isActive: true },
        { name: 'Valorant', isActive: true },
        { name: 'Fortnite', isActive: true },
        { name: 'League of Legends', isActive: true },
      ],
    });
  }

  if (stationCount === 0) {
    await prisma.gameStation.createMany({
      data: [
        { name: 'Računar 1', isActive: true },
        { name: 'Računar 2', isActive: true },
        { name: 'Računar 3', isActive: true },
        { name: 'Računar 4', isActive: true },
        { name: 'Računar 5', isActive: true },
      ],
    });
  }
};

const ensureTables = async () => {
  const desired = [
    { code: 'T1', name: 'Sto T1' },
    { code: 'T2', name: 'Sto T2' },
    { code: 'T3', name: 'Sto T3' },
    { code: 'T4', name: 'Sto T4' },
    { code: 'T5', name: 'Sto T5' },
    { code: 'T6', name: 'Sto T6' },
    { code: 'A1', name: 'Sto A1' },
    { code: 'A2', name: 'Sto A2' },
    { code: 'A3', name: 'Sto A3' },
    { code: 'B1', name: 'Sto B1' },
    { code: 'B2', name: 'Sto B2' },
    { code: 'C1', name: 'Sto C1' },
  ];

  const existing = await prisma.table.findMany({
    select: { code: true },
  });
  const existingCodes = new Set(existing.map((t) => t.code));

  const toCreate = desired
    .filter((t) => !existingCodes.has(t.code))
    .map((t) => ({ ...t, isActive: true }));

  if (toCreate.length > 0) {
    await prisma.table.createMany({ data: toCreate });
  }
};

const ensureReservations = async () => {
  const count = await prisma.reservation.count();
  if (count > 0) return;

  const station = await prisma.gameStation.findFirst({
    where: { isActive: true },
  });
  if (!station) return;

  const game = await prisma.game.findFirst({ where: { isActive: true } });
  const today = new Date();
  const start = new Date(today);
  start.setHours(18, 0, 0, 0);
  const end = new Date(today);
  end.setHours(20, 0, 0, 0);

  await prisma.reservation.create({
    data: {
      stationId: station.id,
      gameId: game?.id,
      customerName: 'Demo Guest',
      customerPhone: '060000000',
      startsAt: start,
      endsAt: end,
    },
  });
};

async function main() {
  await ensureOperatingHours();
  await ensureUsers();
  await ensureMenu();
  await ensureGames();
  await ensureTables();
  await ensureReservations();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });

