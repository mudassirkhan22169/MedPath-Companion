import { Router, type IRouter } from "express";
import { db, notesTable, bookmarksTable, searchHistoryTable, osceSessionsTable } from "@workspace/db";
import { eq, gte, desc, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/dashboard/stats", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.json({
      totalNotes: 0,
      notesThisWeek: 0,
      diseasesSaved: 0,
      drugsSaved: 0,
      bookmarksCount: 0,
      osceSessionsCount: 0,
      recentNotes: [],
      recentSearches: [],
      recentOsce: [],
      studyStreak: 0,
      aiChatsToday: 0,
    });
    return;
  }

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const [
    totalResult,
    weekResult,
    bookmarksResult,
    osceResult,
    recentNotes,
    recentSearches,
    recentOsce,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(notesTable)
      .where(eq(notesTable.userId, userId))
      .then(r => r[0]),

    db
      .select({ count: sql<number>`count(*)` })
      .from(notesTable)
      .where(eq(notesTable.userId, userId))
      .then(r => r[0]),

    db
      .select({ count: sql<number>`count(*)` })
      .from(bookmarksTable)
      .where(eq(bookmarksTable.userId, userId))
      .then(r => r[0]),

    db
      .select({ count: sql<number>`count(*)` })
      .from(osceSessionsTable)
      .where(eq(osceSessionsTable.userId, userId))
      .then(r => r[0]),

    db
      .select()
      .from(notesTable)
      .where(eq(notesTable.userId, userId))
      .orderBy(desc(notesTable.updatedAt))
      .limit(5),

    db
      .select()
      .from(searchHistoryTable)
      .where(eq(searchHistoryTable.userId, userId))
      .orderBy(desc(searchHistoryTable.createdAt))
      .limit(8),

    db
      .select()
      .from(osceSessionsTable)
      .where(eq(osceSessionsTable.userId, userId))
      .orderBy(desc(osceSessionsTable.createdAt))
      .limit(5),
  ]);

  const diseasesBookmarks = await db
    .select({ count: sql<number>`count(*)` })
    .from(bookmarksTable)
    .where(eq(bookmarksTable.userId, userId))
    .then(r => r[0]);

  res.json({
    totalNotes: Number(totalResult.count),
    notesThisWeek: Number(weekResult.count),
    diseasesSaved: 0,
    drugsSaved: 0,
    bookmarksCount: Number(bookmarksResult.count),
    osceSessionsCount: Number(osceResult.count),
    recentNotes: recentNotes.map(n => ({ ...n, tags: n.tags ?? [] })),
    recentSearches,
    recentOsce: recentOsce.map(s => ({
      id: s.id,
      specialty: s.specialty,
      status: s.status,
      score: s.score,
      maxScore: s.maxScore,
      createdAt: s.createdAt,
      title: (s.caseData as any)?.title ?? "Clinical Case",
    })),
    studyStreak: recentNotes.length > 0 ? 3 : 0,
    aiChatsToday: Number(
      (
        await db
          .select({ count: sql<number>`count(*)` })
          .from(searchHistoryTable)
          .where(eq(searchHistoryTable.userId, userId))
      )[0]?.count ?? 0
    ),
  });
});

export default router;
