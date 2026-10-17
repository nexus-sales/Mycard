/**
 * Seed: crea el primer usuario ADMIN desde variables de entorno.
 * Ejecutar con: node prisma/seed.js (JS puro: funciona en la imagen de producción, sin tsx)
 *
 * Vars necesarias en .env:
 *   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME
 */

const { PrismaClient } = require("@prisma/client");
const argon2 = require("argon2");

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Admin";

  if (!email || !password) {
    console.error(
      "❌ Faltan ADMIN_EMAIL o ADMIN_PASSWORD en las variables de entorno."
    );
    process.exit(1);
  }

  // Validaciones mínimas
  if (password.length < 12) {
    console.error("❌ ADMIN_PASSWORD debe tener al menos 12 caracteres.");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`✅ El usuario admin (${email}) ya existe. Nada que hacer.`);
    return;
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const admin = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log(`✅ Admin creado: ${admin.email} (id: ${admin.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
