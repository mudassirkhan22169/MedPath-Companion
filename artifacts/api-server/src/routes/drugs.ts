import { Router, type IRouter } from "express";
import { db, drugsTable } from "@workspace/db";
import { eq, ilike, or, sql } from "drizzle-orm";

const router: IRouter = Router();

// Must be defined before /:id to avoid route conflict
router.get("/drugs/classes", async (_req, res): Promise<void> => {
  const rows = await db.selectDistinct({ drugClass: drugsTable.drugClass }).from(drugsTable);
  res.json(rows.map(r => r.drugClass));
});

router.get("/drugs", async (req, res): Promise<void> => {
  const { search, class: drugClass, limit = "20", offset = "0" } = req.query as {
    search?: string;
    class?: string;
    limit?: string;
    offset?: string;
  };

  const lim = parseInt(limit, 10);
  const off = parseInt(offset, 10);

  let drugs;
  let total: number;

  if (search && drugClass) {
    drugs = await db.select().from(drugsTable).where(
      sql`(${ilike(drugsTable.name, `%${search}%`)} OR ${ilike(drugsTable.genericName, `%${search}%`)}) AND ${eq(drugsTable.drugClass, drugClass)}`
    ).limit(lim).offset(off);
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(drugsTable).where(
      sql`(${ilike(drugsTable.name, `%${search}%`)} OR ${ilike(drugsTable.genericName, `%${search}%`)}) AND ${eq(drugsTable.drugClass, drugClass)}`
    );
    total = Number(count);
  } else if (search) {
    drugs = await db.select().from(drugsTable).where(
      or(ilike(drugsTable.name, `%${search}%`), ilike(drugsTable.genericName, `%${search}%`))
    ).limit(lim).offset(off);
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(drugsTable).where(
      or(ilike(drugsTable.name, `%${search}%`), ilike(drugsTable.genericName, `%${search}%`))
    );
    total = Number(count);
  } else if (drugClass) {
    drugs = await db.select().from(drugsTable).where(eq(drugsTable.drugClass, drugClass)).limit(lim).offset(off);
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(drugsTable).where(eq(drugsTable.drugClass, drugClass));
    total = Number(count);
  } else {
    drugs = await db.select().from(drugsTable).limit(lim).offset(off);
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(drugsTable);
    total = Number(count);
  }

  res.json({ drugs, total });
});

router.get("/drugs/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [drug] = await db.select().from(drugsTable).where(eq(drugsTable.id, id));
  if (!drug) {
    res.status(404).json({ error: "Drug not found" });
    return;
  }

  res.json(drug);
});

export default router;
