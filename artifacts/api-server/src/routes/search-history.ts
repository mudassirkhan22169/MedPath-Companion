import { Router, type IRouter } from "express";
import { db, searchHistoryTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: any, res: any): string | null {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return userId;
}

// GET /search-history — list recent searches (last 50)
router.get("/search-history", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { type, limit = "30" } = req.query as { type?: string; limit?: string };
  const take = Math.min(parseInt(limit, 10) || 30, 100);

  const all = await db
    .select()
    .from(searchHistoryTable)
    .where(eq(searchHistoryTable.userId, userId))
    .orderBy(desc(searchHistoryTable.createdAt))
    .limit(take);

  const filtered = type ? all.filter(h => h.type === type) : all;
  res.json(filtered);
});

// POST /search-history — record a search
router.post("/search-history", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { query, type = "ai" } = req.body;
  if (!query?.trim()) {
    res.status(400).json({ error: "query is required" });
    return;
  }

  const [entry] = await db
    .insert(searchHistoryTable)
    .values({ userId, query: query.trim(), type })
    .returning();

  res.status(201).json(entry);
});

// DELETE /search-history — clear all search history for user
router.delete("/search-history", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  await db.delete(searchHistoryTable).where(eq(searchHistoryTable.userId, userId));
  res.json({ success: true });
});

export default router;
