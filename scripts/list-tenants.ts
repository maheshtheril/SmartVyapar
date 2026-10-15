import { prisma } from "../src/lib/prisma";

async function main() {
  const tenants = await prisma.tenant.findMany({
    include: {
      users: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log("TOTAL_TENANTS:", tenants.length);
  for (const t of tenants) {
    console.log(`\nTenant ID: ${t.id} | Slug: ${t.slug} | Type: ${t.businessType} | Name: ${t.businessName}`);
    console.log("Users:", t.users.map((u) => `${u.email} (${u.role})`).join(", "));
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
