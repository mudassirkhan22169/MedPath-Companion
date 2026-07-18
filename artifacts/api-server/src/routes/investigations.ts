import { Router, type IRouter } from "express";
import { db, investigationsTable } from "@workspace/db";
import { eq, ilike, or } from "drizzle-orm";

const router: IRouter = Router();

router.get("/investigations", async (req, res): Promise<void> => {
  const { search, category } = req.query as { search?: string; category?: string };

  let investigations;

  if (search && category) {
    investigations = await db.select().from(investigationsTable).where(
      eq(investigationsTable.category, category)
    );
    const searchLower = search.toLowerCase();
    investigations = investigations.filter(i =>
      i.name.toLowerCase().includes(searchLower) ||
      (i.abbreviation && i.abbreviation.toLowerCase().includes(searchLower))
    );
  } else if (search) {
    const searchLower = search.toLowerCase();
    investigations = await db.select().from(investigationsTable).where(
      or(
        ilike(investigationsTable.name, `%${search}%`),
        ilike(investigationsTable.abbreviation, `%${search}%`)
      )
    );
  } else if (category) {
    investigations = await db.select().from(investigationsTable).where(
      eq(investigationsTable.category, category)
    );
  } else {
    investigations = await db.select().from(investigationsTable);
  }

  res.json(investigations);
});

router.post("/investigations/interpret", async (req, res): Promise<void> => {
  const { investigationName, value, units, patientContext } = req.body;

  if (!investigationName || !value) {
    res.status(400).json({ error: "investigationName and value are required" });
    return;
  }

  // Look up the investigation for reference ranges
  const [inv] = await db.select().from(investigationsTable).where(
    ilike(investigationsTable.name, `%${investigationName}%`)
  );

  const normalRange = inv?.normalRange ?? "Reference range not available";
  const valueNum = parseFloat(value);
  const isNumeric = !isNaN(valueNum);

  // Simple rule-based interpretation when AI is not available
  let status: "normal" | "low" | "high" | "critical" = "normal";
  let interpretation = `${investigationName}: ${value}${units ? ` ${units}` : ""}`;
  let clinicalSignificance = inv?.significance ?? "Clinical interpretation requires context.";
  const possibleConditions = inv?.relatedConditions ?? [];
  let recommendations = "Correlate with clinical presentation and other investigations.";

  if (inv) {
    interpretation = `${inv.name} level is ${value}${units ? ` ${units}` : ""}. Normal range: ${inv.normalRange}. ${inv.interpretation}`;

    // Try to parse normal range for basic comparison
    const rangeMatch = inv.normalRange.match(/(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)/);
    if (rangeMatch && isNumeric) {
      const low = parseFloat(rangeMatch[1]);
      const high = parseFloat(rangeMatch[2]);
      if (valueNum < low) {
        status = valueNum < low * 0.5 ? "critical" : "low";
        interpretation = `${inv.name} is ${status === "critical" ? "critically" : ""} below normal range. Value: ${value}${units ? ` ${units}` : ""}, Normal: ${inv.normalRange}.`;
      } else if (valueNum > high) {
        status = valueNum > high * 2 ? "critical" : "high";
        interpretation = `${inv.name} is ${status === "critical" ? "critically" : ""} above normal range. Value: ${value}${units ? ` ${units}` : ""}, Normal: ${inv.normalRange}.`;
      } else {
        status = "normal";
        interpretation = `${inv.name} is within normal range. Value: ${value}${units ? ` ${units}` : ""}, Normal: ${inv.normalRange}.`;
      }
    }

    recommendations = `${inv.significance} Consider correlating with clinical symptoms${patientContext ? ` (Patient context: ${patientContext})` : ""}.`;
  }

  res.json({
    interpretation,
    status,
    clinicalSignificance,
    possibleConditions,
    recommendations,
  });
});

router.get("/investigations/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [investigation] = await db.select().from(investigationsTable).where(eq(investigationsTable.id, id));
  if (!investigation) {
    res.status(404).json({ error: "Investigation not found" });
    return;
  }

  res.json(investigation);
});

export default router;
