import { prisma } from "../config/prisma.js";
import { AccountingEngine } from "../accounting/accountingEngine.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { writeAudit } from "../middleware/audit.js";
import { sum } from "../utils/decimal.js";

const engine = new AccountingEngine(prisma);

export const accountingController = {
  postManualEntry: asyncHandler(async (req, res) => {
    const entry = await engine.postManualEntry({
      ...req.body,
      companyId: req.user.companyId,
      branchId: req.user.branchId,
      createdBy: req.user.id
    });
    await writeAudit({ req, action: "POST", module: "accounting", entity: "JournalEntry", entityId: entry.id, newValues: entry });
    res.status(201).json({ data: entry });
  }),

  reverseEntry: asyncHandler(async (req, res) => {
    const entry = await engine.reverseEntry({
      companyId: req.user.companyId,
      entryId: req.params.id,
      reason: req.body.reason,
      userId: req.user.id
    });
    await writeAudit({ req, action: "REVERSE", module: "accounting", entity: "JournalEntry", entityId: req.params.id, newValues: entry, reason: req.body.reason });
    res.status(201).json({ data: entry });
  }),

  journal: asyncHandler(async (req, res) => {
    const rows = await prisma.journalEntryLine.findMany({
      where: { journalEntry: { companyId: req.user.companyId } },
      include: { journalEntry: true, account: true },
      orderBy: [{ journalEntry: { entryDate: "asc" } }]
    });
    res.json({ data: rows });
  }),

  ledger: asyncHandler(async (req, res) => {
    const accountId = req.query.accountId;
    const rows = await prisma.journalEntryLine.findMany({
      where: {
        accountId,
        journalEntry: { companyId: req.user.companyId, status: "POSTED" }
      },
      include: { journalEntry: true, account: true },
      orderBy: [{ journalEntry: { entryDate: "asc" } }]
    });
    let balance = sum([]);
    const data = rows.map((line) => {
      balance = balance.plus(line.debit).minus(line.credit);
      return { ...line, runningBalance: balance.toString() };
    });
    res.json({ data });
  }),

  trialBalance: asyncHandler(async (req, res) => {
    const accounts = await prisma.ledgerAccount.findMany({
      where: { companyId: req.user.companyId },
      include: { lines: { where: { journalEntry: { status: "POSTED" } } } },
      orderBy: { code: "asc" }
    });
    const data = accounts.map((account) => {
      const debit = sum(account.lines.map((line) => line.debit));
      const credit = sum(account.lines.map((line) => line.credit));
      const net = debit.minus(credit);
      return {
        id: account.id,
        code: account.code,
        name: account.name,
        accountType: account.accountType,
        debit: debit.toString(),
        credit: credit.toString(),
        finalDebit: net.gt(0) ? net.toString() : "0",
        finalCredit: net.lt(0) ? net.abs().toString() : "0"
      };
    });
    const totalDebit = sum(data.map((row) => row.debit));
    const totalCredit = sum(data.map((row) => row.credit));
    res.json({ data, totals: { debit: totalDebit.toString(), credit: totalCredit.toString(), balanced: totalDebit.equals(totalCredit) } });
  }),

  financialStatements: asyncHandler(async (req, res) => {
    const rows = await prisma.journalEntryLine.findMany({
      where: { journalEntry: { companyId: req.user.companyId, status: "POSTED" } },
      include: { account: true }
    });
    const totals = { ASSET: sum([]), LIABILITY: sum([]), EQUITY: sum([]), INCOME: sum([]), COST: sum([]), EXPENSE: sum([]) };
    for (const line of rows) {
      const amount = line.account.normalBalance === "DEBIT"
        ? sum([line.debit]).minus(line.credit)
        : sum([line.credit]).minus(line.debit);
      totals[line.account.accountType] = totals[line.account.accountType].plus(amount);
    }
    const netIncome = totals.INCOME.minus(totals.COST).minus(totals.EXPENSE);
    res.json({
      balanceSheet: {
        assets: totals.ASSET.toString(),
        liabilities: totals.LIABILITY.toString(),
        equity: totals.EQUITY.plus(netIncome).toString(),
        balanced: totals.ASSET.equals(totals.LIABILITY.plus(totals.EQUITY).plus(netIncome))
      },
      incomeStatement: {
        income: totals.INCOME.toString(),
        cost: totals.COST.toString(),
        expenses: totals.EXPENSE.toString(),
        netIncome: netIncome.toString()
      }
    });
  })
};
