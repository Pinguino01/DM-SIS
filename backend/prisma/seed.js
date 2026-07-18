import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const roles = [
  "Administrador",
  "Gerente",
  "Contador",
  "Auxiliar contable",
  "Facturador",
  "Cajero",
  "Encargado de inventario",
  "Compras",
  "Auditor"
];

const modules = ["security", "configuration", "sales", "inventory", "purchases", "treasury", "accounting", "fiscal", "reports", "audit"];
const actions = ["view", "create", "edit", "approve", "void", "reverse", "export", "close-period", "reopen-period", "admin", "delete"];

const accounts = [
  ["1", "ACTIVO", "ASSET", "DEBIT", 1, false],
  ["1.1", "ACTIVO CORRIENTE", "ASSET", "DEBIT", 2, false],
  ["1.1.01", "Caja general", "ASSET", "DEBIT", 3, true],
  ["1.1.02", "Caja chica", "ASSET", "DEBIT", 3, true],
  ["1.1.03", "Bancos", "ASSET", "DEBIT", 3, true],
  ["1.1.04", "Cuentas por cobrar", "ASSET", "DEBIT", 3, true],
  ["1.1.05", "Inventario", "ASSET", "DEBIT", 3, true],
  ["1.1.06", "ITBIS adelantado", "ASSET", "DEBIT", 3, true],
  ["1.1.07", "Anticipos a proveedores", "ASSET", "DEBIT", 3, true],
  ["1.2", "ACTIVO NO CORRIENTE", "ASSET", "DEBIT", 2, false],
  ["1.2.01", "Propiedad, planta y equipo", "ASSET", "DEBIT", 3, true],
  ["1.2.02", "Depreciacion acumulada", "ASSET", "CREDIT", 3, true],
  ["2", "PASIVO", "LIABILITY", "CREDIT", 1, false],
  ["2.1", "PASIVO CORRIENTE", "LIABILITY", "CREDIT", 2, false],
  ["2.1.01", "Cuentas por pagar", "LIABILITY", "CREDIT", 3, true],
  ["2.1.02", "ITBIS por pagar", "LIABILITY", "CREDIT", 3, true],
  ["2.1.03", "Retenciones por pagar", "LIABILITY", "CREDIT", 3, true],
  ["2.1.04", "Anticipos de clientes", "LIABILITY", "CREDIT", 3, true],
  ["2.2", "PASIVO NO CORRIENTE", "LIABILITY", "CREDIT", 2, false],
  ["2.2.01", "Prestamos a largo plazo", "LIABILITY", "CREDIT", 3, true],
  ["3", "PATRIMONIO", "EQUITY", "CREDIT", 1, false],
  ["3.1", "Capital", "EQUITY", "CREDIT", 2, true],
  ["3.2", "Aportes", "EQUITY", "CREDIT", 2, true],
  ["3.3", "Resultados acumulados", "EQUITY", "CREDIT", 2, true],
  ["3.4", "Resultado del ejercicio", "EQUITY", "CREDIT", 2, true],
  ["4", "INGRESOS", "INCOME", "CREDIT", 1, false],
  ["4.1", "Ventas de productos", "INCOME", "CREDIT", 2, true],
  ["4.2", "Ingresos por servicios", "INCOME", "CREDIT", 2, true],
  ["4.3", "Otros ingresos", "INCOME", "CREDIT", 2, true],
  ["5", "COSTOS", "COST", "DEBIT", 1, false],
  ["5.1", "Costo de ventas", "COST", "DEBIT", 2, true],
  ["6", "GASTOS", "EXPENSE", "DEBIT", 1, false],
  ["6.1", "Gastos administrativos", "EXPENSE", "DEBIT", 2, true],
  ["6.2", "Gastos de ventas", "EXPENSE", "DEBIT", 2, true],
  ["6.3", "Gastos financieros", "EXPENSE", "DEBIT", 2, true],
  ["6.4", "Gastos de depreciacion", "EXPENSE", "DEBIT", 2, true],
  ["6.5", "Perdidas por inventario", "EXPENSE", "DEBIT", 2, true],
  ["6.6", "Otros gastos", "EXPENSE", "DEBIT", 2, true]
];

async function main() {
  const company = await prisma.company.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      commercialName: "DM-SIS Demo",
      legalName: "DM-SIS Demo SRL",
      rnc: "131000000",
      address: "Santo Domingo, Republica Dominicana",
      phone: "809-555-0100",
      email: "demo@dm-sis.local",
      currency: "DOP",
      defaultTaxRate: 18
    }
  });

  const branch = await prisma.branch.upsert({
    where: { companyId_code: { companyId: company.id, code: "MAIN" } },
    update: {},
    create: { companyId: company.id, code: "MAIN", name: "Sucursal principal" }
  });

  const permissionRows = [];
  for (const module of modules) {
    for (const action of actions) {
      permissionRows.push(await prisma.permission.upsert({
        where: { companyId_module_action: { companyId: company.id, module, action } },
        update: {},
        create: { companyId: company.id, module, action }
      }));
    }
  }

  const roleMap = new Map();
  for (const roleName of roles) {
    const role = await prisma.role.upsert({
      where: { companyId_name: { companyId: company.id, name: roleName } },
      update: {},
      create: { companyId: company.id, name: roleName, isSystem: true }
    });
    roleMap.set(roleName, role);
  }

  const admin = roleMap.get("Administrador");
  for (const permission of permissionRows) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: admin.id, permissionId: permission.id } },
      update: {},
      create: { roleId: admin.id, permissionId: permission.id }
    });
  }

  const accountant = roleMap.get("Contador");
  for (const permission of permissionRows.filter((p) => ["accounting", "fiscal", "reports", "audit"].includes(p.module))) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: accountant.id, permissionId: permission.id } },
      update: {},
      create: { roleId: accountant.id, permissionId: permission.id }
    });
  }

  const passwordHash = await bcrypt.hash("Demo12345!", 12);
  const adminUser = await prisma.user.upsert({
    where: { companyId_email: { companyId: company.id, email: "admin@dm-sis.local" } },
    update: {},
    create: {
      companyId: company.id,
      branchId: branch.id,
      name: "Administrador Demo",
      email: "admin@dm-sis.local",
      passwordHash,
      mustChangePassword: true
    }
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: admin.id } },
    update: {},
    create: { userId: adminUser.id, roleId: admin.id }
  });

  const createdAccounts = new Map();
  for (const [code, name, accountType, normalBalance, level, allowsPosting] of accounts) {
    const parentCode = code.includes(".") ? code.split(".").slice(0, -1).join(".") : null;
    const account = await prisma.ledgerAccount.upsert({
      where: { companyId_code: { companyId: company.id, code } },
      update: {},
      create: {
        companyId: company.id,
        code,
        name,
        accountType,
        normalBalance,
        level,
        allowsPosting,
        systemAccount: true,
        parentId: parentCode ? createdAccounts.get(parentCode)?.id : null
      }
    });
    createdAccounts.set(code, account);
  }

  const now = new Date();
  for (let month = 1; month <= 12; month++) {
    await prisma.accountingPeriod.upsert({
      where: { companyId_fiscalYear_month: { companyId: company.id, fiscalYear: now.getFullYear(), month } },
      update: {},
      create: {
        companyId: company.id,
        fiscalYear: now.getFullYear(),
        month,
        startDate: new Date(now.getFullYear(), month - 1, 1),
        endDate: new Date(now.getFullYear(), month, 0),
        status: "OPEN"
      }
    });
  }

  await prisma.paymentMethod.upsert({
    where: { companyId_name: { companyId: company.id, name: "Efectivo" } },
    update: {},
    create: { companyId: company.id, name: "Efectivo", type: "CASH", ledgerAccountId: createdAccounts.get("1.1.01").id }
  });
  await prisma.paymentMethod.upsert({
    where: { companyId_name: { companyId: company.id, name: "Transferencia" } },
    update: {},
    create: { companyId: company.id, name: "Transferencia", type: "BANK", ledgerAccountId: createdAccounts.get("1.1.03").id, requiresReference: true }
  });
  await prisma.bankAccount.create({
    data: { companyId: company.id, bankName: "Banco Demo", accountNumber: "000-000000-1", currency: "DOP", ledgerAccountId: createdAccounts.get("1.1.03").id }
  }).catch(() => {});
  await prisma.costCenter.upsert({
    where: { companyId_code: { companyId: company.id, code: "ADM" } },
    update: {},
    create: { companyId: company.id, code: "ADM", name: "Administracion" }
  });
  await prisma.taxType.upsert({
    where: { companyId_code: { companyId: company.id, code: "ITBIS18" } },
    update: {},
    create: { companyId: company.id, code: "ITBIS18", name: "ITBIS 18%", rate: 18, validFrom: new Date(now.getFullYear(), 0, 1) }
  });

  const supplier = await prisma.supplier.create({
    data: { companyId: company.id, name: "Distribuidora Central", rnc: "131000000", contact: "Laura Perez", phone: "809-555-0101" }
  }).catch(() => null);
  const customer = await prisma.customer.create({
    data: { companyId: company.id, name: "Cliente General", document: "0", creditLimit: 0, creditDays: 0 }
  }).catch(() => null);
  const warehouse = await prisma.warehouse.upsert({
    where: { companyId_code: { companyId: company.id, code: "MAIN" } },
    update: {},
    create: { companyId: company.id, branchId: branch.id, code: "MAIN", name: "Almacen principal" }
  });
  const product = await prisma.product.create({
    data: {
      companyId: company.id,
      sku: "ARR-001",
      barcode: "7790001",
      name: "Arroz Selecto 1kg",
      category: "Abarrotes",
      cost: 8,
      averageCost: 8,
      price: 12,
      wholesalePrice: 10,
      retailPrice: 12,
      minStock: 10,
      inventoryAccountId: createdAccounts.get("1.1.05").id,
      salesAccountId: createdAccounts.get("4.1").id,
      costOfSalesAccountId: createdAccounts.get("5.1").id,
      purchaseAccountId: createdAccounts.get("1.1.05").id
    }
  }).catch(() => null);
  if (product) {
    await prisma.stockBalance.create({
      data: { companyId: company.id, warehouseId: warehouse.id, productId: product.id, quantity: 35, averageCost: 8 }
    }).catch(() => {});
  }

  await prisma.fiscalSequence.create({
    data: { companyId: company.id, type: "B01", prefix: "B01", nextNumber: 1 }
  }).catch(() => {});

  console.log("Seed completado");
  console.log("Usuario demo: admin@dm-sis.local");
  console.log("Contrasena demo: Demo12345!");
  if (supplier || customer) console.log("Datos comerciales demo creados");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
