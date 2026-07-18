import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function readJson(file) {
  const fullPath = path.resolve(file);
  if (!fs.existsSync(fullPath)) throw new Error(`No existe el archivo: ${fullPath}`);
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function requiredArray(data, key) {
  if (!Array.isArray(data[key])) throw new Error(`El JSON no contiene un arreglo valido en ${key}`);
  return data[key];
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Uso: npm run migrate:localstorage -- ./backup.json");
    process.exit(1);
  }
  const data = readJson(file);
  const company = await prisma.company.findFirst();
  if (!company) throw new Error("Debe ejecutar el seed o crear una empresa antes de migrar.");

  const summary = { customers: 0, suppliers: 0, products: 0, documents: 0, payments: 0, errors: [] };

  for (const c of requiredArray(data, "clients")) {
    try {
      await prisma.customer.create({
        data: {
          companyId: company.id,
          name: c.name,
          document: c.doc || null,
          phone: c.phone || null,
          email: c.email || null,
          address: c.address || null,
          creditLimit: c.creditLimit || 0,
          creditDays: c.creditDays || c.timeLimit || 0,
          notes: c.notes || null
        }
      });
      summary.customers++;
    } catch (error) {
      summary.errors.push({ entity: "client", source: c.id || c.name, error: error.message });
    }
  }

  for (const s of data.suppliers || []) {
    try {
      await prisma.supplier.create({
        data: {
          companyId: company.id,
          name: s.name,
          rnc: s.rnc || null,
          contact: s.contact || null,
          phone: s.phone || null,
          email: s.email || null,
          address: s.address || null,
          notes: s.notes || null
        }
      });
      summary.suppliers++;
    } catch (error) {
      summary.errors.push({ entity: "supplier", source: s.id || s.name, error: error.message });
    }
  }

  for (const p of requiredArray(data, "products")) {
    try {
      await prisma.product.create({
        data: {
          companyId: company.id,
          sku: p.sku || null,
          barcode: p.barcode || null,
          name: p.name,
          category: p.category || null,
          brand: p.brand || null,
          unit: p.unit || "Unidad",
          cost: p.cost || 0,
          averageCost: p.avgCost || p.averageCost || p.cost || 0,
          price: p.price || 0,
          wholesalePrice: p.wholesalePrice || p.price || 0,
          retailPrice: p.retailPrice || p.price || 0,
          minStock: p.minStock || 0,
          description: p.description || null
        }
      });
      summary.products++;
    } catch (error) {
      summary.errors.push({ entity: "product", source: p.id || p.name, error: error.message });
    }
  }

  console.log(JSON.stringify(summary, null, 2));
  if (summary.errors.length) process.exitCode = 2;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
