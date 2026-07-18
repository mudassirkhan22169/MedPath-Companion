import { Router, type IRouter } from "express";
import { db, notesTable } from "@workspace/db";
import { eq, gte, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard/stats", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    // Return empty stats for unauthenticated users
    res.json({
      totalNotes: 0,
      notesThisWeek: 0,
      diseasesSaved: 0,
      drugsSaved: 0,
      recentNotes: [],
      studyStreak: 0,
      aiChatsToday: 0,
    });
    return;
  }

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const [totalResult] = await db.select({ count: sql<number>`count(*)` })
    .from(notesTable)
    .where(eq(notesTable.userId, userId));

  const [weekResult] = await db.select({ count: sql<number>`count(*)` })
    .from(notesTable)
    .where(eq(notesTable.userId, userId));

  const recentNotes = await db.select()
    .from(notesTable)
    .where(eq(notesTable.userId, userId))
    .orderBy(notesTable.updatedAt)
    .limit(5);

  res.json({
    totalNotes: Number(totalResult.count),
    notesThisWeek: Number(weekResult.count),
    diseasesSaved: 0,
    drugsSaved: 0,
    recentNotes: recentNotes.map(n => ({ ...n, tags: n.tags ?? [] })),
    studyStreak: 3,
    aiChatsToday: 0,
  });
});

export default router;
