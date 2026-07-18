import { Router, type IRouter } from "express";
import { db, notesTable } from "@workspace/db";
import { eq, and, ilike, or } from "drizzle-orm";

const router: IRouter = Router();

router.get("/notes", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { search, category } = req.query as { search?: string; category?: string };

  let query = db.select().from(notesTable).where(eq(notesTable.userId, userId));

  const filters = [eq(notesTable.userId, userId)];
  if (category) {
    filters.push(eq(notesTable.category, category));
  }

  let notes;
  if (search) {
    notes = await db.select().from(notesTable).where(
      and(
        eq(notesTable.userId, userId),
        category ? eq(notesTable.category, category) : undefined,
        or(
          ilike(notesTable.title, `%${search}%`),
          ilike(notesTable.content, `%${search}%`)
        )
      )
    ).orderBy(notesTable.isPinned, notesTable.updatedAt);
  } else {
    notes = await db.select().from(notesTable).where(
      and(
        eq(notesTable.userId, userId),
        category ? eq(notesTable.category, category) : undefined
      )
    ).orderBy(notesTable.isPinned, notesTable.updatedAt);
  }

  res.json(notes.map(n => ({
    ...n,
    tags: n.tags ?? [],
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  })));
});

router.post("/notes", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { title, content, category, tags, isPinned } = req.body;
  if (!title) {
    res.status(400).json({ error: "Title is required" });
    return;
  }

  const [note] = await db.insert(notesTable).values({
    userId,
    title,
    content: content ?? "",
    category: category ?? null,
    tags: tags ?? [],
    isPinned: isPinned ?? false,
  }).returning();

  res.status(201).json({ ...note, tags: note.tags ?? [] });
});

router.get("/notes/:id", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [note] = await db.select().from(notesTable).where(
    and(eq(notesTable.id, id), eq(notesTable.userId, userId))
  );

  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  res.json({ ...note, tags: note.tags ?? [] });
});

router.patch("/notes/:id", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const { title, content, category, tags, isPinned } = req.body;
  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title;
  if (content !== undefined) updateData.content = content;
  if (category !== undefined) updateData.category = category;
  if (tags !== undefined) updateData.tags = tags;
  if (isPinned !== undefined) updateData.isPinned = isPinned;

  const [note] = await db.update(notesTable)
    .set(updateData)
    .where(and(eq(notesTable.id, id), eq(notesTable.userId, userId)))
    .returning();

  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  res.json({ ...note, tags: note.tags ?? [] });
});

router.delete("/notes/:id", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [note] = await db.delete(notesTable)
    .where(and(eq(notesTable.id, id), eq(notesTable.userId, userId)))
    .returning();

  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  res.json({ message: "Note deleted successfully" });
});

export default router;
