import { createInvoice } from "../services/documentService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { writeAudit } from "../middleware/audit.js";

export const documentController = {
  createInvoice: asyncHandler(async (req, res) => {
    const document = await createInvoice({
      companyId: req.user.companyId,
      branchId: req.user.branchId,
      userId: req.user.id,
      payload: req.body
    });
    await writeAudit({ req, action: "CREATE", module: "sales", entity: "SalesDocument", entityId: document.id, newValues: document });
    res.status(201).json({ data: document });
  })
};
