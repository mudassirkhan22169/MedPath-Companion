import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const router: IRouter = Router();

// Register
router.post("/auth/register", async (req, res): Promise<void> => {
  const { name, email, password, year, university } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: "Name, email, and password are required" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = randomUUID();

  const [user] = await db.insert(usersTable).values({
    id,
    name,
    email,
    passwordHash,
    year: year ? parseInt(year, 10) : null,
    university: university ?? null,
  }).returning();

  req.session!.userId = user.id;

  res.status(201).json({
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

// Login
router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  req.session!.userId = user.id;

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

// Get current user
router.get("/auth/me", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
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

// Logout
router.post("/auth/logout", async (req, res): Promise<void> => {
  req.session?.destroy(() => {});
  res.json({ message: "Logged out successfully" });
});

export default router;
