import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.patch("/profile", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const { name, year, university, specialization, bio } = req.body;
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (year !== undefined) updateData.year = parseInt(year, 10);
  if (university !== undefined) updateData.university = university;
  if (specialization !== undefined) updateData.specialization = specialization;
  if (bio !== undefined) updateData.bio = bio;

  const [user] = await db.update(usersTable)
    .set(updateData)
    .where(eq(usersTable.id, userId))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    year: user.year,
    university: user.university,
    specialization: user.specialization,
    bio: user.bio,
    avatar: user.avatar,
    createdAt: user.createdAt,
  });
});

export default router;
