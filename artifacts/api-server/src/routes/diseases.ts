import { Router, type IRouter } from "express";
import { db, diseasesTable } from "@workspace/db";
import { eq, ilike, or, sql } from "drizzle-orm";

const router: IRouter = Router();

// Must be defined before /:id to avoid route conflict
router.get("/diseases/categories", async (_req, res): Promise<void> => {
  const rows = await db.selectDistinct({ category: diseasesTable.category }).from(diseasesTable);
  res.json(rows.map(r => r.category));
});

router.get("/diseases", async (req, res): Promise<void> => {
  const { search, category, limit = "20", offset = "0" } = req.query as {
    search?: string;
    category?: string;
    limit?: string;
    offset?: string;
  };

  const lim = parseInt(limit, 10);
  const off = parseInt(offset, 10);

  let diseases;
  let total: number;

  if (search && category) {
    diseases = await db.select().from(diseasesTable).where(
      sql`(${ilike(diseasesTable.name, `%${search}%`)} OR ${ilike(diseasesTable.description, `%${search}%`)}) AND ${eq(diseasesTable.category, category)}`
    ).limit(lim).offset(off);
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(diseasesTable).where(
      sql`(${ilike(diseasesTable.name, `%${search}%`)} OR ${ilike(diseasesTable.description, `%${search}%`)}) AND ${eq(diseasesTable.category, category)}`
    );
    total = Number(count);
  } else if (search) {
    diseases = await db.select().from(diseasesTable).where(
      or(ilike(diseasesTable.name, `%${search}%`), ilike(diseasesTable.description, `%${search}%`))
    ).limit(lim).offset(off);
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(diseasesTable).where(
      or(ilike(diseasesTable.name, `%${search}%`), ilike(diseasesTable.description, `%${search}%`))
    );
    total = Number(count);
  } else if (category) {
    diseases = await db.select().from(diseasesTable).where(eq(diseasesTable.category, category)).limit(lim).offset(off);
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(diseasesTable).where(eq(diseasesTable.category, category));
    total = Number(count);
  } else {
    diseases = await db.select().from(diseasesTable).limit(lim).offset(off);
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(diseasesTable);
    total = Number(count);
  }

  res.json({ diseases, total });
});

router.get("/diseases/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [disease] = await db.select().from(diseasesTable).where(eq(diseasesTable.id, id));
  if (!disease) {
    res.status(404).json({ error: "Disease not found" });
    return;
  }

  res.json(disease);
});

export default router;
