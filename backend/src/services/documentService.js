import { prisma } from "../config/prisma.js";
import { AccountingEngine } from "../accounting/accountingEngine.js";
import { AppError } from "../utils/errors.js";
import { toDecimal } from "../utils/decimal.js";

const accounting = new AccountingEngine(prisma);

export async function createInvoice({ companyId, branchId, userId, payload }) {
  return prisma.$transaction(async (tx) => {
    const lines = payload.lines || [];
    if (!lines.length) throw new AppError("La factura requiere lineas", 422);

    const subtotal = lines.reduce((acc, line) => acc.plus(toDecimal(line.quantity).times(line.unitPrice)), toDecimal(0));
    const discount = lines.reduce((acc, line) => acc.plus(toDecimal(line.discount || 0)), toDecimal(payload.discount || 0));
    const tax = lines.reduce((acc, line) => acc.plus(toDecimal(line.tax || 0)), toDecimal(0));
    const total = subtotal.minus(discount).plus(tax);
    if (total.lte(0)) throw new AppError("El total debe ser mayor que cero", 422);

    const document = await tx.salesDocument.create({
      data: {
        companyId,
        branchId,
        customerId: payload.customerId,
        documentType: "INVOICE",
        number: payload.number,
        status: payload.status || "PENDING",
        issueDate: new Date(payload.issueDate || Date.now()),
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        fiscalDocumentType: payload.fiscalDocumentType,
        ncf: payload.ncf,
        subtotal: subtotal.toString(),
        discount: discount.toString(),
        tax: tax.toString(),
        total: total.toString(),
        paidAmount: payload.paymentType === "cash" ? total.toString() : "0",
        balance: payload.paymentType === "cash" ? "0" : total.toString(),
        paymentTerms: payload.paymentTerms,
        currency: payload.currency || "DOP",
        exchangeRate: payload.exchangeRate || 1,
        postingStatus: "NOT_POSTED",
        notes: payload.notes,
        lines: {
          create: lines.map((line) => ({
            productId: line.productId,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discount: line.discount || 0,
            taxRate: line.taxRate || 0,
            tax: line.tax || 0,
            total: toDecimal(line.quantity).times(line.unitPrice).minus(line.discount || 0).plus(line.tax || 0).toString()
          }))
        }
      },
      include: { lines: true }
    });

    for (const line of lines.filter((item) => item.productId)) {
      const product = await tx.product.findUnique({ where: { id: line.productId } });
      if (!product) throw new AppError("Producto no encontrado", 422);
      const stock = await tx.stockBalance.findFirst({
        where: { companyId, productId: line.productId }
      });
      const previous = toDecimal(stock?.quantity || 0);
      const next = previous.minus(line.quantity);
      if (next.lt(0)) throw new AppError("Inventario insuficiente", 422, { productId: line.productId });
      if (stock) {
        await tx.stockBalance.update({ where: { id: stock.id }, data: { quantity: next.toString() } });
      }
    }

    if (payload.post === true) {
      const accounts = payload.accounts;
      if (!accounts?.receivableOrCash || !accounts?.income || (tax.gt(0) && !accounts?.taxPayable)) {
        throw new AppError("Faltan cuentas contables para contabilizar la factura", 422);
      }
      const entryLines = [
        { accountId: accounts.receivableOrCash, debit: total.toString(), credit: 0, customerId: payload.customerId },
        { accountId: accounts.income, debit: 0, credit: subtotal.minus(discount).toString() }
      ];
      if (tax.gt(0)) entryLines.push({ accountId: accounts.taxPayable, debit: 0, credit: tax.toString() });
      const entry = await accounting.createAndPostEntry(tx, {
        companyId,
        branchId,
        entryNumber: payload.entryNumber,
        entryDate: document.issueDate,
        description: `Factura ${document.number}`,
        entryType: "AUTOMATIC",
        sourceModule: "SALES",
        sourceType: "INVOICE",
        sourceId: document.id,
        currency: document.currency,
        exchangeRate: document.exchangeRate,
        createdBy: userId,
        lines: entryLines
      });
      await tx.salesDocument.update({
        where: { id: document.id },
        data: { postingStatus: "POSTED", journalEntryId: entry.id, postedAt: new Date(), postedBy: userId }
      });
    }

    return document;
  });
}
