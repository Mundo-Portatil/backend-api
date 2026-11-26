import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log('🚀 Iniciando script de backfill seguro de empresa inicial...');

  const defaultCompanyData = {
    name: 'Mundo Portátil S.A.C.',
    ruc: '20601234567',
    address: 'Av. Bolognesi 123, Tacna',
    active: true,
  };

  // 1. Buscar o crear la empresa inicial
  let company = await prisma.company.findFirst({
    where: {
      OR: [
        { ruc: defaultCompanyData.ruc },
        { name: defaultCompanyData.name },
      ],
    },
  });

  if (!company) {
    company = await prisma.company.create({
      data: defaultCompanyData,
    });
    console.log(`✅ Empresa inicial creada: ${company.name} (RUC: ${company.ruc}) [ID: ${company.id}]`);
  } else {
    console.log(`ℹ️ Empresa inicial existente: ${company.name} (RUC: ${company.ruc}) [ID: ${company.id}]`);
  }

  const companyId = company.id;

  // 2. Backfill en hardware_items
  const hwUpdateResult = await prisma.$executeRaw`
    UPDATE hardware_items
    SET "companyId" = ${companyId}
    WHERE "companyId" IS NULL;
  `;
  console.log(`✅ Registros actualizados en hardware_items: ${hwUpdateResult}`);

  // 3. Backfill en quantity_stocks
  const qsUpdateResult = await prisma.$executeRaw`
    UPDATE quantity_stocks
    SET "companyId" = ${companyId}
    WHERE "companyId" IS NULL;
  `;
  console.log(`✅ Registros actualizados en quantity_stocks: ${qsUpdateResult}`);

  // 4. Backfill en internal_transfer_items
  const tiUpdateResult = await prisma.$executeRaw`
    UPDATE internal_transfer_items
    SET "companyId" = ${companyId}
    WHERE "companyId" IS NULL;
  `;
  console.log(`✅ Registros actualizados en internal_transfer_items: ${tiUpdateResult}`);

  // 5. Verificación final de registros nulos
  const [hwNullCount] = await prisma.$queryRaw<[{ count: string }]>`
    SELECT COUNT(*)::text as count FROM hardware_items WHERE "companyId" IS NULL;
  `;
  const [qsNullCount] = await prisma.$queryRaw<[{ count: string }]>`
    SELECT COUNT(*)::text as count FROM quantity_stocks WHERE "companyId" IS NULL;
  `;

  console.log(`🔍 Verificación final — HardwareItems con companyId NULL: ${hwNullCount.count}`);
  console.log(`🔍 Verificación final — QuantityStocks con companyId NULL: ${qsNullCount.count}`);

  if (parseInt(hwNullCount.count, 10) > 0 || parseInt(qsNullCount.count, 10) > 0) {
    throw new Error('❌ Falló la verificación de backfill: aún existen registros con companyId NULL.');
  }

  console.log('🎉 Backfill completado exitosamente sin pérdida de datos.');
}

main()
  .catch((e) => {
    console.error('❌ Error en script de backfill:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
