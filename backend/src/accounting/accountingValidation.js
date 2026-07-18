const SCALE = 10000n;

function parseScaled(value) {
  const text = String(value ?? 0).trim();
  const negative = text.startsWith("-");
  const normalized = negative ? text.slice(1) : text;
  const [whole = "0", fraction = ""] = normalized.split(".");
  const padded = `${fraction}0000`.slice(0, 4);
  const scaled = BigInt(whole || "0") * SCALE + BigInt(padded || "0");
  return negative ? -scaled : scaled;
}

function formatScaled(value) {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = abs / SCALE;
  let fraction = (abs % SCALE).toString().padStart(4, "0");
  fraction = fraction.replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole.toString()}${fraction ? `.${fraction}` : ""}`;
}

function mul(a, b) {
  return (parseScaled(a) * parseScaled(b)) / SCALE;
}

function percent(base, rate) {
  return (base * parseScaled(rate)) / (SCALE * 100n);
}

export function assertBalanced(lines) {
  const debit = lines.reduce((sum, line) => sum + parseScaled(line.debit), 0n);
  const credit = lines.reduce((sum, line) => sum + parseScaled(line.credit), 0n);
  if (debit !== credit) {
    throw new Error(`Asiento descuadrado: Debe ${formatScaled(debit)} Haber ${formatScaled(credit)}`);
  }
  for (const line of lines) {
    const d = parseScaled(line.debit);
    const c = parseScaled(line.credit);
    if (d > 0n && c > 0n) throw new Error("Linea con Debe y Haber simultaneos");
    if (d === 0n && c === 0n) throw new Error("Linea en cero");
  }
  return true;
}

export function calculateInvoiceTotals(lines, generalDiscount = 0) {
  let subtotal = 0n;
  let lineDiscount = 0n;
  let tax = 0n;
  for (const line of lines) {
    const gross = mul(line.quantity, line.unitPrice);
    const discount = parseScaled(line.discount);
    subtotal += gross;
    lineDiscount += discount;
    tax += percent(gross - discount, line.taxRate);
  }
  const discount = lineDiscount + parseScaled(generalDiscount);
  return {
    subtotal: formatScaled(subtotal),
    discount: formatScaled(discount),
    tax: formatScaled(tax),
    total: formatScaled(subtotal - discount + tax)
  };
}

export function weightedAverageCost({ currentQty, currentAvgCost, incomingQty, incomingCost }) {
  const currentQtyScaled = parseScaled(currentQty);
  const incomingQtyScaled = parseScaled(incomingQty);
  const nextQty = currentQtyScaled + incomingQtyScaled;
  if (nextQty <= 0n) return "0";
  const currentValue = (currentQtyScaled * parseScaled(currentAvgCost)) / SCALE;
  const incomingValue = (incomingQtyScaled * parseScaled(incomingCost)) / SCALE;
  return formatScaled(((currentValue + incomingValue) * SCALE) / nextQty);
}

export function agingBucket(dueDate, asOf = new Date()) {
  const due = new Date(`${dueDate}T00:00:00`);
  const ref = new Date(asOf.toISOString().slice(0, 10) + "T00:00:00");
  const days = Math.floor((ref - due) / 86400000);
  if (days <= 0) return "Corriente";
  if (days <= 30) return "1 a 30 dias";
  if (days <= 60) return "31 a 60 dias";
  if (days <= 90) return "61 a 90 dias";
  return "Mas de 90 dias";
}
