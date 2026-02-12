import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Tenant "plataforma" para el super admin (tú). No es una empresa cliente.
  const platformTenant = await prisma.tenant.upsert({
    where: { slug: "platform" },
    update: {},
    create: {
      name: "Plataforma SCOR",
      slug: "platform",
    },
  });

  // Super admin (único usuario que ve y controla todas las empresas)
  const superAdminHash = await bcrypt.hash("super123", 10);
  await prisma.user.upsert({
    where: {
      tenantId_username: { tenantId: platformTenant.id, username: "superadmin" },
    },
    update: { passwordHash: superAdminHash, name: "Super Administrador", role: Role.SUPER_ADMIN },
    create: {
      tenantId: platformTenant.id,
      username: "superadmin",
      email: "super@scor.com",
      passwordHash: superAdminHash,
      name: "Super Administrador",
      role: Role.SUPER_ADMIN,
    },
  });

  // Tenant de demostración
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      name: "Empresa Demo",
      slug: "demo",
    },
  });

  // Usuario ADMIN (login: usuario "admin", contraseña admin123)
  const adminHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: {
      tenantId_username: { tenantId: tenant.id, username: "admin" },
    },
    update: { passwordHash: adminHash, name: "Administrador Demo", role: Role.ADMIN },
    create: {
      tenantId: tenant.id,
      username: "admin",
      email: "admin@demo.com",
      passwordHash: adminHash,
      name: "Administrador Demo",
      role: Role.ADMIN,
    },
  });

  // Usuario OPERADOR (login: usuario "operador", contraseña operador123)
  const operadorHash = await bcrypt.hash("operador123", 10);
  await prisma.user.upsert({
    where: {
      tenantId_username: { tenantId: tenant.id, username: "operador" },
    },
    update: { passwordHash: operadorHash, name: "Operador Demo", role: Role.OPERADOR },
    create: {
      tenantId: tenant.id,
      username: "operador",
      email: "operador@demo.com",
      passwordHash: operadorHash,
      name: "Operador Demo",
      role: Role.OPERADOR,
    },
  });

  // Usuario REPARTIDOR (login: usuario "repartidor", contraseña repartidor123)
  const repartidorHash = await bcrypt.hash("repartidor123", 10);
  await prisma.user.upsert({
    where: {
      tenantId_username: { tenantId: tenant.id, username: "repartidor" },
    },
    update: { passwordHash: repartidorHash, name: "Repartidor Demo", role: Role.REPARTIDOR },
    create: {
      tenantId: tenant.id,
      username: "repartidor",
      email: "repartidor@demo.com",
      passwordHash: repartidorHash,
      name: "Repartidor Demo",
      role: Role.REPARTIDOR,
    },
  });

  // Clientes de ejemplo
  const cliente1 = await prisma.cliente.upsert({
    where: { id: "seed-cliente-1" },
    update: { distrito: "San Isidro", tipoValvula: "Estándar" },
    create: {
      id: "seed-cliente-1",
      tenantId: tenant.id,
      name: "Juan Pérez",
      documento: "12345678",
      direccion: "Av. Principal 100",
      distrito: "San Isidro",
      tipoValvula: "Estándar",
      telefono: "999888777",
      email: "juan@example.com",
    },
  });

  const cliente2 = await prisma.cliente.upsert({
    where: { id: "seed-cliente-2" },
    update: { distrito: "Miraflores", tipoValvula: "Premium" },
    create: {
      id: "seed-cliente-2",
      tenantId: tenant.id,
      name: "María García",
      documento: "87654321",
      direccion: "Calle Secundaria 200",
      distrito: "Miraflores",
      tipoValvula: "Premium",
      telefono: "999777666",
    },
  });

  // Productos del catálogo (gas, regulador, kit, kit completo)
  const productoNames = [
    "Gas 5 kg",
    "Gas 10 kg normal",
    "Gas 10 kg premium",
    "Gas 45 kg",
    "Regulador normal",
    "Regulador premium",
    "Kit válvula",
    "Kit completo 10 kg",
    "Kit completo 45 kg",
  ];
  for (let i = 0; i < productoNames.length; i++) {
    await prisma.producto.upsert({
      where: { id: `seed-producto-${i + 1}` },
      update: { name: productoNames[i] },
      create: {
        id: `seed-producto-${i + 1}`,
        tenantId: tenant.id,
        name: productoNames[i],
      },
    });
  }

  // Marcas de balón
  const marcaNames = ["Solgas", "Limagas", "Caserito", "Petroperu"];
  for (let i = 0; i < marcaNames.length; i++) {
    await prisma.marca.upsert({
      where: { id: `seed-marca-${i + 1}` },
      update: { name: marcaNames[i] },
      create: {
        id: `seed-marca-${i + 1}`,
        tenantId: tenant.id,
        name: marcaNames[i],
      },
    });
  }

  // Pedidos de ejemplo
  await prisma.pedido.upsert({
    where: { id: "seed-pedido-1" },
    update: {},
    create: {
      id: "seed-pedido-1",
      tenantId: tenant.id,
      clienteId: cliente1.id,
      estado: "CREATED",
      cantidad: 2,
      observaciones: "Entregar en la mañana",
    },
  });

  await prisma.pedido.upsert({
    where: { id: "seed-pedido-2" },
    update: {},
    create: {
      id: "seed-pedido-2",
      tenantId: tenant.id,
      clienteId: cliente2.id,
      estado: "IN_ROUTE",
      cantidad: 1,
    },
  });

  console.log("Seed completado.");
  console.log("Tenant demo:", tenant.slug);
  console.log("Login de prueba (empresa 'demo', usuario / contraseña):");
  console.log("  SUPER_ADMIN (empresa 'platform'): superadmin / super123");
  console.log("  ADMIN:       admin / admin123");
  console.log("  OPERADOR:    operador / operador123");
  console.log("  REPARTIDOR:  repartidor / repartidor123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
