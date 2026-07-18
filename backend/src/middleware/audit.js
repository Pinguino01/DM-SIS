import { prisma } from "../config/prisma.js";

export async function writeAudit({ req, action, module, entity, entityId, oldValues, newValues, reason, relatedDocument }) {
  await prisma.auditLog.create({
    data: {
      companyId: req?.user?.companyId,
      userId: req?.user?.id,
      ipAddress: req?.ip,
      action,
      module,
      entity,
      entityId,
      oldValues,
      newValues,
      reason,
      relatedDocument
    }
  });
}
