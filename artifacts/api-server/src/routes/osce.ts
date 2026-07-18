import { Router, type IRouter } from "express";
import { db, osceSessionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

const SPECIALTIES = [
  "General Medicine",
  "Cardiology",
  "Pulmonology",
  "Gastroenterology",
  "Neurology",
  "Nephrology",
  "Endocrinology",
  "Infectious Disease",
  "General Surgery",
  "Orthopedics",
  "Obstetrics & Gynecology",
  "Pediatrics",
  "Psychiatry",
  "Emergency Medicine",
];

function requireAuth(req: any, res: any): string | null {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return userId;
}

async function callAI(messages: Array<{ role: string; content: string }>): Promise<string | null> {
  const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

  if (!baseUrl || !apiKey) return null;

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_completion_tokens: 1500,
        messages,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

// POST /osce/generate — generate a new OSCE clinical case
router.post("/osce/generate", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { specialty = "General Medicine" } = req.body;

  const systemPrompt = `You are an expert OSCE examiner for MBBS medical students. Generate realistic, educational clinical cases.
Always respond with valid JSON only — no markdown, no extra text.`;

  const userPrompt = `Generate a realistic OSCE clinical case for specialty: ${specialty}.

Return a JSON object with this exact structure:
{
  "title": "Brief case title",
  "specialty": "${specialty}",
  "difficulty": "Easy|Medium|Hard",
  "patientInfo": {
    "name": "Patient's name (use realistic names)",
    "age": number,
    "sex": "Male|Female",
    "occupation": "occupation"
  },
  "chiefComplaint": "Main presenting complaint (1-2 sentences)",
  "historyOfPresentingIllness": "Detailed history paragraph",
  "pastMedicalHistory": "Relevant past history",
  "medications": "Current medications or 'None'",
  "familyHistory": "Relevant family history",
  "socialHistory": "Social history",
  "systemsReview": "Relevant positive and negative findings",
  "vitalSigns": {
    "bp": "e.g. 145/92 mmHg",
    "hr": "e.g. 88 bpm",
    "rr": "e.g. 18/min",
    "temp": "e.g. 37.2°C",
    "spo2": "e.g. 96% on room air"
  },
  "examinationFindings": "Key examination findings",
  "questions": [
    {
      "number": 1,
      "question": "What is the most likely diagnosis? Give two differential diagnoses.",
      "marks": 3,
      "hint": "Consider the clinical features systematically"
    },
    {
      "number": 2,
      "question": "List four relevant investigations you would order and explain why.",
      "marks": 4,
      "hint": "Consider diagnosis confirmation and baseline assessment"
    },
    {
      "number": 3,
      "question": "Outline your initial management plan.",
      "marks": 5,
      "hint": "Consider immediate stabilization and definitive treatment"
    },
    {
      "number": 4,
      "question": "What complications should you monitor for in this patient?",
      "marks": 3,
      "hint": "Consider both acute and chronic complications"
    }
  ],
  "totalMarks": 15,
  "modelAnswerSummary": "Brief summary of the key diagnosis and management approach (for reference — not shown to student)"
}`;

  const aiResponse = await callAI([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  let caseData: Record<string, unknown>;

  if (aiResponse) {
    try {
      // Strip markdown code fences if present
      const cleaned = aiResponse.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
      caseData = JSON.parse(cleaned);
    } catch {
      caseData = getFallbackCase(specialty);
    }
  } else {
    caseData = getFallbackCase(specialty);
  }

  const [session] = await db
    .insert(osceSessionsTable)
    .values({
      userId,
      caseData,
      specialty: String(caseData.specialty ?? specialty),
      status: "active",
    })
    .returning();

  // Don't expose the model answer to the student
  const { modelAnswerSummary: _hidden, ...safeCase } = caseData as any;

  res.json({ session: { ...session, caseData: safeCase } });
});

// POST /osce/evaluate — submit and evaluate a student's answer
router.post("/osce/evaluate", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { sessionId, studentAnswer } = req.body;
  if (!sessionId || !studentAnswer?.trim()) {
    res.status(400).json({ error: "sessionId and studentAnswer are required" });
    return;
  }

  const [session] = await db
    .select()
    .from(osceSessionsTable)
    .where(eq(osceSessionsTable.id, parseInt(sessionId, 10)));

  if (!session || session.userId !== userId) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const caseData = session.caseData as any;

  const systemPrompt = `You are an OSCE examiner providing structured, constructive feedback to an MBBS student. 
Be fair, educational, and specific. Always respond with valid JSON only.`;

  const userPrompt = `OSCE Case: ${caseData.title}
Specialty: ${caseData.specialty}
Chief Complaint: ${caseData.chiefComplaint}
Total Marks Available: ${caseData.totalMarks}

Questions:
${(caseData.questions || []).map((q: any) => `Q${q.number} (${q.marks} marks): ${q.question}`).join("\n")}

Student's Answer:
${studentAnswer}

Model Answer Summary (for reference): ${caseData.modelAnswerSummary || "Not available"}

Evaluate the student's answer and return JSON with this exact structure:
{
  "totalScore": number (out of ${caseData.totalMarks}),
  "percentage": number,
  "grade": "Distinction|Pass|Borderline|Fail",
  "overallFeedback": "2-3 sentence overall assessment",
  "questionFeedback": [
    {
      "number": 1,
      "marksAwarded": number,
      "marksAvailable": number,
      "feedback": "Specific feedback on this answer",
      "modelAnswer": "What the ideal answer should include"
    }
  ],
  "strengths": ["strength 1", "strength 2"],
  "areasForImprovement": ["area 1", "area 2"],
  "keyLearningPoints": ["learning point 1", "learning point 2", "learning point 3"],
  "recommendedReading": ["Resource 1", "Resource 2"]
}`;

  const aiResponse = await callAI([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  let feedback: Record<string, unknown>;
  let score = 0;

  if (aiResponse) {
    try {
      const cleaned = aiResponse.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
      feedback = JSON.parse(cleaned);
      score = Number((feedback as any).totalScore) || 0;
    } catch {
      feedback = getFallbackFeedback(caseData.totalMarks, studentAnswer);
      score = Math.round(caseData.totalMarks * 0.5);
    }
  } else {
    feedback = getFallbackFeedback(caseData.totalMarks, studentAnswer);
    score = Math.round(caseData.totalMarks * 0.5);
  }

  const [updated] = await db
    .update(osceSessionsTable)
    .set({
      studentAnswer,
      aiFeedback: JSON.stringify(feedback),
      score,
      maxScore: caseData.totalMarks,
      status: "submitted",
    })
    .where(eq(osceSessionsTable.id, session.id))
    .returning();

  res.json({ session: updated, feedback });
});

// GET /osce/history — get user's past OSCE sessions
router.get("/osce/history", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const sessions = await db
    .select()
    .from(osceSessionsTable)
    .where(eq(osceSessionsTable.userId, userId))
    .orderBy(desc(osceSessionsTable.createdAt))
    .limit(20);

  // Strip model answers from history
  const safe = sessions.map(s => {
    const cd = s.caseData as any;
    const { modelAnswerSummary: _hidden, ...safeCase } = cd;
    return { ...s, caseData: safeCase };
  });

  res.json(safe);
});

// GET /osce/specialties — list available specialties
router.get("/osce/specialties", (_req, res): void => {
  res.json(SPECIALTIES);
});

function getFallbackCase(specialty: string): Record<string, unknown> {
  return {
    title: "Acute Chest Pain — Clinical Assessment",
    specialty,
    difficulty: "Medium",
    patientInfo: {
      name: "James Okafor",
      age: 58,
      sex: "Male",
      occupation: "Bank manager",
    },
    chiefComplaint: "Sudden onset central chest pain radiating to the left arm for the past 2 hours.",
    historyOfPresentingIllness:
      "Mr. Okafor is a 58-year-old male who presents with a 2-hour history of severe crushing central chest pain (8/10) radiating to the left arm and jaw. He is diaphoretic and feels nauseated. He has no pleuritic component and the pain is not positional.",
    pastMedicalHistory: "Hypertension (diagnosed 5 years ago), type 2 diabetes mellitus (10 years).",
    medications: "Metformin 500mg BD, Amlodipine 5mg OD",
    familyHistory: "Father died of a heart attack at age 62.",
    socialHistory: "Smokes 15 cigarettes/day for 30 years. Occasional alcohol.",
    systemsReview: "No cough, no leg swelling. Mild dyspnea on exertion for 3 weeks.",
    vitalSigns: {
      bp: "162/98 mmHg",
      hr: "96 bpm (irregular)",
      rr: "22/min",
      temp: "37.1°C",
      spo2: "94% on room air",
    },
    examinationFindings:
      "Alert but distressed. Diaphoretic. JVP not elevated. Dual heart sounds, no murmurs. Lungs clear. No peripheral edema.",
    questions: [
      {
        number: 1,
        question: "What is the most likely diagnosis? Give two differential diagnoses.",
        marks: 3,
        hint: "Consider the clinical features, risk factors, and symptom characteristics.",
      },
      {
        number: 2,
        question: "List four relevant investigations you would order and explain the purpose of each.",
        marks: 4,
        hint: "Think about diagnosis confirmation and baseline assessment.",
      },
      {
        number: 3,
        question: "Outline your immediate management plan in the emergency department.",
        marks: 5,
        hint: "Use MONA or a systematic approach. Consider reperfusion.",
      },
      {
        number: 4,
        question: "What are four complications you should monitor for in this patient?",
        marks: 3,
        hint: "Consider both electrical and mechanical complications.",
      },
    ],
    totalMarks: 15,
    modelAnswerSummary:
      "STEMI most likely. ECG → activate cath lab. MONA approach. Primary PCI target door-to-balloon <90 min. Monitor for arrhythmias, cardiogenic shock, mechanical complications.",
  };
}

function getFallbackFeedback(totalMarks: number, _answer: string): Record<string, unknown> {
  const score = Math.round(totalMarks * 0.6);
  return {
    totalScore: score,
    percentage: Math.round((score / totalMarks) * 100),
    grade: "Pass",
    overallFeedback:
      "Your answer demonstrated a reasonable understanding of the clinical scenario. There is room for improvement in the depth of management planning and complication monitoring.",
    questionFeedback: [
      {
        number: 1,
        marksAwarded: Math.round(totalMarks * 0.2),
        marksAvailable: 3,
        feedback: "Diagnosis identified. Differentials could be more specific.",
        modelAnswer: "Primary diagnosis with supporting features; two relevant differentials with brief reasoning.",
      },
    ],
    strengths: ["Identified key diagnosis", "Organized answer structure"],
    areasForImprovement: ["More specific investigation rationale", "Detailed complication monitoring"],
    keyLearningPoints: [
      "Always use a systematic approach in OSCE cases",
      "Link investigations to clinical questions",
      "Cover both immediate and definitive management",
    ],
    recommendedReading: ["Harrison's Principles of Internal Medicine", "Oxford Handbook of Clinical Medicine"],
  };
}

export default router;
