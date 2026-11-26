import { PrismaClient, Role, LocationType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log('🌱 Starting seed...');

  // 1. Ubicación: Almacén Central
  const centralLocationName = 'Almacén Central';
  let centralLocation = await prisma.location.findFirst({
    where: { name: centralLocationName },
  });

  if (!centralLocation) {
    centralLocation = await prisma.location.create({
      data: {
        name: centralLocationName,
        type: LocationType.ALMACEN_CENTRAL,
        active: true,
      },
    });
    console.log(`✅ Ubicación creada: ${centralLocation.name} (${centralLocation.id})`);
  } else {
    console.log(`ℹ️ Ubicación existente: ${centralLocation.name} (${centralLocation.id})`);
  }

  // 2. Ubicación: Puesto 102 - Mercadillo Bolognesi
  const puestoLocationName = 'Puesto 102 - Mercadillo Bolognesi';
  let puestoLocation = await prisma.location.findFirst({
    where: { name: puestoLocationName },
  });

  if (!puestoLocation) {
    puestoLocation = await prisma.location.create({
      data: {
        name: puestoLocationName,
        type: LocationType.PUESTO,
        active: true,
      },
    });
    console.log(`✅ Ubicación creada: ${puestoLocation.name} (${puestoLocation.id})`);
  } else {
    console.log(`ℹ️ Ubicación existente: ${puestoLocation.name} (${puestoLocation.id})`);
  }

  // 3. Empresa Inicial: Mundo Portátil S.A.C.
  const defaultCompanyName = 'Mundo Portátil S.A.C.';
  const defaultCompanyRuc = '20601234567';
  let defaultCompany = await prisma.company.findFirst({
    where: {
      OR: [{ ruc: defaultCompanyRuc }, { name: defaultCompanyName }],
    },
  });

  if (!defaultCompany) {
    defaultCompany = await prisma.company.create({
      data: {
        name: defaultCompanyName,
        ruc: defaultCompanyRuc,
        address: 'Av. Bolognesi 123, Tacna',
        active: true,
      },
    });
    console.log(`✅ Empresa creada: ${defaultCompany.name} (RUC: ${defaultCompany.ruc}) (${defaultCompany.id})`);
  } else {
    console.log(`ℹ️ Empresa existente: ${defaultCompany.name} (RUC: ${defaultCompany.ruc}) (${defaultCompany.id})`);
  }

  // 4. Usuario ADMIN
  const adminEmail = 'admin@mundoportatil.pe';
  const hashedPassword = await bcrypt.hash('Admin123!', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: 'Administrador Principal',
      role: Role.ADMIN,
      active: true,
      password: hashedPassword,
    },
    create: {
      email: adminEmail,
      name: 'Administrador Principal',
      password: hashedPassword,
      role: Role.ADMIN,
      active: true,
    },
  });

  console.log(`✅ Usuario ADMIN listo: ${adminUser.email} (${adminUser.id})`);
  console.log('🌱 Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Error in seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
