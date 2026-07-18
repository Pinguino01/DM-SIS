import { z } from "zod";

export const idParam = z.object({ id: z.string().uuid() });

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query
    });
    if (!result.success) {
      return res.status(422).json({ error: "Datos invalidos", details: result.error.flatten() });
    }
    req.validated = result.data;
    next();
  };
}
