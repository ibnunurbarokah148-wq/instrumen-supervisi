import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const existingClient = globalForPrisma.prisma;
const hasPerangkatDelegate =
  existingClient &&
  "perangkatSupervisi" in (existingClient as unknown as Record<string, unknown>);

export const prisma =
  hasPerangkatDelegate && existingClient
    ? existingClient
    : new PrismaClient({
        log:
          process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

