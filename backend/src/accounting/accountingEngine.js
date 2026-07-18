import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/errors.js";
import { sum, toDecimal } from "../utils/decimal.js";

export const AccountingEvents = Object.freeze({
  INVOICE_POSTED: "INVOICE_POSTED",
  INVOICE_VOIDED: "INVOICE_VOIDED",
  CREDIT_NOTE_POSTED: "CREDIT_NOTE_POSTED",
  DEBIT_NOTE_POSTED: "DEBIT_NOTE_POSTED",
  CUSTOMER_PAYMENT_RECEIVED: "CUSTOMER_PAYMENT_RECEIVED",
  CUSTOMER_REFUND_ISSUED: "CUSTOMER_REFUND_ISSUED",
  PURCHASE_POSTED: "PURCHASE_POSTED",
  PURCHASE_VOIDED: "PURCHASE_VOIDED",
  SUPPLIER_PAYMENT_MADE: "SUPPLIER_PAYMENT_MADE",
  EXPENSE_POSTED: "EXPENSE_POSTED",
  INVENTORY_ADJUSTMENT_POSTED: "INVENTORY_ADJUSTMENT_POSTED",
  BANK_TRANSFER_POSTED: "BANK_TRANSFER_POSTED",
  CASH_OPENING_POSTED: "CASH_OPENING_POSTED",
  CASH_CLOSING_DIFFERENCE_POSTED: "CASH_CLOSING_DIFFERENCE_POSTED",
  FIXED_ASSET_DEPRECIATION_POSTED: "FIXED_ASSET_DEPRECIATION_POSTED",
  PERIOD_CLOSED: "PERIOD_CLOSED"
});

export class AccountingEngine {
  constructor(db = prisma) {
    this.db = db;
  }

  validateBalanced(lines) {
    const debit = sum(lines.map((line) => line.debit || 0));
    const credit = sum(lines.map((line) => line.credit || 0));
    if (!debit.equals(credit)) {
      throw new AppError("El asiento no cuadra: Debe debe ser igual a Haber", 422, {
        debit: debit.toString(),
        credit: credit.toString()
      });
    }
    for (const line of lines) {
      const d = toDecimal(line.debit || 0);
      const c = toDecimal(line.credit || 0);
      if (d.gt(0) && c.gt(0)) throw new AppError("Una linea no puede tener Debe y Haber simultaneamente", 422);
      if (d.eq(0) && c.eq(0)) throw new AppError("Una linea no puede estar en cero", 422);
    }
  }

  async assertOpenPeriod(tx, companyId, entryDate) {
    const date = new Date(entryDate);
    const period = await tx.accountingPeriod.findFirst({
      where: {
        companyId,
        startDate: { lte: date },
        endDate: { gte: date }
      }
    });
    if (!period) throw new AppError("No existe periodo contable para la fecha", 422);
    if (period.status === "CLOSED") throw new AppError("No se puede contabilizar en periodo cerrado", 422);
    return period;
  }

  async assertAccounts(tx, accountIds) {
    const accounts = await tx.ledgerAccount.findMany({ where: { id: { in: accountIds } } });
    const found = new Map(accounts.map((account) => [account.id, account]));
    for (const id of accountIds) {
      const account = found.get(id);
      if (!account) throw new AppError("Cuenta contable no encontrada", 422, { accountId: id });
      if (!account.isActive) throw new AppError("No se permiten cuentas inactivas", 422, { accountId: id });
      if (!account.allowsPosting) throw new AppError("No se permiten movimientos en cuentas agrupadoras", 422, { accountId: id });
    }
  }

  async createAndPostEntry(tx, payload) {
    this.validateBalanced(payload.lines);
    const period = await this.assertOpenPeriod(tx, payload.companyId, payload.entryDate);
    await this.assertAccounts(tx, [...new Set(payload.lines.map((line) => line.accountId))]);

    const entry = await tx.journalEntry.create({
      data: {
        companyId: payload.companyId,
        branchId: payload.branchId,
        entryNumber: payload.entryNumber,
        entryDate: new Date(payload.entryDate),
        description: payload.description,
        entryType: payload.entryType || "AUTOMATIC",
        sourceModule: payload.sourceModule,
        sourceType: payload.sourceType,
        sourceId: payload.sourceId,
        accountingPeriodId: period.id,
        status: "POSTED",
        currency: payload.currency || "DOP",
        exchangeRate: payload.exchangeRate || 1,
        createdBy: payload.createdBy,
        approvedBy: payload.createdBy,
        approvedAt: new Date(),
        lines: {
          create: payload.lines.map((line) => ({
            accountId: line.accountId,
            description: line.description,
            debit: line.debit || 0,
            credit: line.credit || 0,
            customerId: line.customerId,
            supplierId: line.supplierId,
            productId: line.productId,
            costCenterId: line.costCenterId,
            branchId: line.branchId,
            currency: line.currency || payload.currency || "DOP",
            exchangeRate: line.exchangeRate || payload.exchangeRate || 1
          }))
        }
      },
      include: { lines: true }
    });
    return entry;
  }

  async postManualEntry(payload) {
    return this.db.$transaction((tx) => this.createAndPostEntry(tx, payload));
  }

  async reverseEntry({ companyId, entryId, reason, userId }) {
    return this.db.$transaction(async (tx) => {
      const original = await tx.journalEntry.findFirst({
        where: { id: entryId, companyId },
        include: { lines: true }
      });
      if (!original) throw new AppError("Asiento original no encontrado", 404);
      if (original.status !== "POSTED") throw new AppError("Solo se pueden revertir asientos contabilizados", 422);

      const reversal = await this.createAndPostEntry(tx, {
        companyId,
        branchId: original.branchId,
        entryNumber: `${original.entryNumber}-R`,
        entryDate: new Date(),
        description: `Reversion: ${reason || original.description}`,
        entryType: "REVERSAL",
        sourceModule: original.sourceModule,
        sourceType: original.sourceType,
        sourceId: original.sourceId,
        createdBy: userId,
        currency: original.currency,
        exchangeRate: original.exchangeRate,
        lines: original.lines.map((line) => ({
          accountId: line.accountId,
          description: `Reversion ${line.description || ""}`.trim(),
          debit: line.credit,
          credit: line.debit,
          customerId: line.customerId,
          supplierId: line.supplierId,
          productId: line.productId,
          costCenterId: line.costCenterId,
          branchId: line.branchId
        }))
      });

      await tx.journalEntry.update({
        where: { id: original.id },
        data: { status: "REVERSED", reversedEntryId: reversal.id }
      });
      return reversal;
    });
  }
}
