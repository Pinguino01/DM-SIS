import test from "node:test";
import assert from "node:assert/strict";
import { assertBalanced, calculateInvoiceTotals, weightedAverageCost, agingBucket } from "../src/accounting/accountingValidation.js";

test("validacion Debe = Haber acepta asientos cuadrados", () => {
  assert.equal(assertBalanced([
    { accountId: "cash", debit: "118.00", credit: "0" },
    { accountId: "sales", debit: "0", credit: "100.00" },
    { accountId: "tax", debit: "0", credit: "18.00" }
  ]), true);
});

test("validacion Debe = Haber rechaza asientos descuadrados", () => {
  assert.throws(() => assertBalanced([
    { accountId: "cash", debit: "117.00", credit: "0" },
    { accountId: "sales", debit: "0", credit: "100.00" },
    { accountId: "tax", debit: "0", credit: "18.00" }
  ]), /descuadrado/);
});

test("calcula ITBIS, descuentos y total de factura", () => {
  const totals = calculateInvoiceTotals([
    { quantity: "2", unitPrice: "100", discount: "10", taxRate: "18" }
  ], "5");
  assert.deepEqual(totals, {
    subtotal: "200",
    discount: "15",
    tax: "34.2",
    total: "219.2"
  });
});

test("calcula costo promedio ponderado", () => {
  assert.equal(weightedAverageCost({
    currentQty: "10",
    currentAvgCost: "8",
    incomingQty: "5",
    incomingCost: "11"
  }), "9");
});

test("clasifica antiguedad de saldos", () => {
  const asOf = new Date("2026-07-17T00:00:00");
  assert.equal(agingBucket("2026-07-17", asOf), "Corriente");
  assert.equal(agingBucket("2026-07-01", asOf), "1 a 30 dias");
  assert.equal(agingBucket("2026-05-20", asOf), "31 a 60 dias");
  assert.equal(agingBucket("2026-04-30", asOf), "61 a 90 dias");
  assert.equal(agingBucket("2026-01-01", asOf), "Mas de 90 dias");
});
