import { Router, type IRouter } from "express";
import { db, bookmarksTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: any, res: any): string | null {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return userId;
}

// GET /bookmarks — list all bookmarks for the user
router.get("/bookmarks", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { type } = req.query as { type?: string };

  let query = db.select().from(bookmarksTable).where(eq(bookmarksTable.userId, userId));
  const results = await db
    .select()
    .from(bookmarksTable)
    .where(eq(bookmarksTable.userId, userId))
    .orderBy(bookmarksTable.createdAt);

  const filtered = type ? results.filter(b => b.type === type) : results;
  res.json(filtered);
});

// POST /bookmarks — create a bookmark
router.post("/bookmarks", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { type, itemId, itemName, itemCategory } = req.body;
  if (!type || !itemId || !itemName) {
    res.status(400).json({ error: "type, itemId, and itemName are required" });
    return;
  }

  // Check for duplicate
  const existing = await db
    .select()
    .from(bookmarksTable)
    .where(
      and(
        eq(bookmarksTable.userId, userId),
        eq(bookmarksTable.type, type),
        eq(bookmarksTable.itemId, String(itemId))
      )
    );

  if (existing.length > 0) {
    res.json(existing[0]);
    return;
  }

  const [bookmark] = await db
    .insert(bookmarksTable)
    .values({ userId, type, itemId: String(itemId), itemName, itemCategory })
    .returning();

  res.status(201).json(bookmark);
});

// DELETE /bookmarks/:id — remove a bookmark by bookmark id
router.delete("/bookmarks/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  await db
    .delete(bookmarksTable)
    .where(and(eq(bookmarksTable.id, id), eq(bookmarksTable.userId, userId)));

  res.json({ success: true });
});

// DELETE /bookmarks/item/:type/:itemId — remove a bookmark by item reference
router.delete("/bookmarks/item/:type/:itemId", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { type, itemId } = req.params;

  await db
    .delete(bookmarksTable)
    .where(
      and(
        eq(bookmarksTable.userId, userId),
        eq(bookmarksTable.type, type),
        eq(bookmarksTable.itemId, itemId)
      )
    );

  res.json({ success: true });
});

export default router;
