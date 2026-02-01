import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Tenant de demostración
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      name: "Empresa Demo",
      slug: "demo",
    },
  });

  // Usuario ADMIN (para login de prueba)
  const adminHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: "admin@demo.com" },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "admin@demo.com",
      passwordHash: adminHash,
      name: "Administrador Demo",
      role: Role.ADMIN,
    },
  });

  // Usuario OPERADOR (opcional, para probar permisos)
  const operadorHash = await bcrypt.hash("operador123", 10);
  await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: "operador@demo.com" },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "operador@demo.com",
      passwordHash: operadorHash,
      name: "Operador Demo",
      role: Role.OPERADOR,
    },
  });

  // Clientes de ejemplo
  const cliente1 = await prisma.cliente.upsert({
    where: { id: "seed-cliente-1" },
    update: {},
    create: {
      id: "seed-cliente-1",
      tenantId: tenant.id,
      name: "Juan Pérez",
      documento: "12345678",
      direccion: "Av. Principal 100",
      telefono: "999888777",
      email: "juan@example.com",
    },
  });

  const cliente2 = await prisma.cliente.upsert({
    where: { id: "seed-cliente-2" },
    update: {},
    create: {
      id: "seed-cliente-2",
      tenantId: tenant.id,
      name: "María García",
      documento: "87654321",
      direccion: "Calle Secundaria 200",
      telefono: "999777666",
    },
  });

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
  console.log("Tenant:", tenant.slug);
  console.log("Login de prueba:");
  console.log("  ADMIN:    admin@demo.com / admin123");
  console.log("  OPERADOR: operador@demo.com / operador123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
