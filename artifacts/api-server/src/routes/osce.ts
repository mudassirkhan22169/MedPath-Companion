import { Router, type IRouter } from "express";
import { db, osceSessionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

// ─── Toggle this to false to use live Gemini API ───────────────────────────
const GEMINI_ENABLED = false;
// ───────────────────────────────────────────────────────────────────────────

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

async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  jsonMode = false
): Promise<string | null> {
  if (!GEMINI_ENABLED) return null;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const generationConfig: Record<string, unknown> = { maxOutputTokens: 8192 };
    if (jsonMode) {
      generationConfig.responseMimeType = "application/json";
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig,
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text().catch(() => "");
      console.error("Gemini API error:", response.status, err);
      return null;
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch (e) {
    console.error("Gemini call failed:", e);
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

  const aiResponse = await callGemini(systemPrompt, userPrompt, true);

  let caseData: Record<string, unknown>;

  if (aiResponse) {
    try {
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

  const aiResponse = await callGemini(systemPrompt, userPrompt, true);

  let feedback: Record<string, unknown>;
  let score = 0;

  if (aiResponse) {
    try {
      const cleaned = aiResponse.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
      feedback = JSON.parse(cleaned);
      score = Number((feedback as any).totalScore) || 0;
    } catch {
      feedback = getFallbackFeedback(caseData, studentAnswer);
      score = Math.round(caseData.totalMarks * 0.5);
    }
  } else {
    feedback = getFallbackFeedback(caseData, studentAnswer);
    score = (feedback as any).totalScore ?? Math.round(caseData.totalMarks * 0.5);
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

// ─── Fallback Cases ──────────────────────────────────────────────────────────

const FALLBACK_CASES: Record<string, unknown>[] = [
  // Case 1 — Cardiology / ACS
  {
    title: "Acute Chest Pain — Emergency Assessment",
    specialty: "Cardiology",
    difficulty: "Medium",
    patientInfo: { name: "James Okafor", age: 58, sex: "Male", occupation: "Bank manager" },
    chiefComplaint: "Sudden onset central chest pain radiating to the left arm for the past 2 hours.",
    historyOfPresentingIllness:
      "Mr. Okafor is a 58-year-old male with a 2-hour history of severe crushing central chest pain (8/10) radiating to the left arm and jaw. He is diaphoretic and nauseated. The pain is not pleuritic or positional.",
    pastMedicalHistory: "Hypertension (5 years), type 2 diabetes mellitus (10 years).",
    medications: "Metformin 500mg BD, Amlodipine 5mg OD",
    familyHistory: "Father died of a heart attack at age 62.",
    socialHistory: "Smokes 15 cigarettes/day × 30 years. Occasional alcohol.",
    systemsReview: "Mild exertional dyspnea × 3 weeks. No cough, no leg swelling.",
    vitalSigns: { bp: "162/98 mmHg", hr: "96 bpm (irregular)", rr: "22/min", temp: "37.1°C", spo2: "94% on room air" },
    examinationFindings:
      "Alert but distressed. Diaphoretic. JVP not elevated. Dual heart sounds, no murmurs. Lungs clear. No peripheral edema.",
    questions: [
      { number: 1, question: "What is the most likely diagnosis? Give two differential diagnoses.", marks: 3, hint: "Consider the clinical features, risk factors, and symptom characteristics." },
      { number: 2, question: "List four relevant investigations you would order and explain the purpose of each.", marks: 4, hint: "Think about diagnosis confirmation and baseline assessment." },
      { number: 3, question: "Outline your immediate management plan in the emergency department.", marks: 5, hint: "Use a systematic approach. Consider reperfusion therapy and the door-to-balloon target." },
      { number: 4, question: "What are four complications you should monitor for in this patient?", marks: 3, hint: "Consider both electrical and mechanical complications." },
    ],
    totalMarks: 15,
    modelAnswerSummary:
      "STEMI most likely given crushing chest pain + risk factors + irregular HR. ECG → activate cath lab. MONA approach (O2 if SpO2 <94%, Aspirin 300mg + ticagrelor 180mg, nitrates if SBP >90). Primary PCI door-to-balloon <90 min. Monitor: arrhythmias (VF/VT), cardiogenic shock, mechanical complications (VSD, MR), pericarditis.",
  },

  // Case 2 — Neurology / Stroke
  {
    title: "Sudden Focal Neurological Deficit — Stroke Assessment",
    specialty: "Neurology",
    difficulty: "Medium",
    patientInfo: { name: "Margaret Chen", age: 72, sex: "Female", occupation: "Retired teacher" },
    chiefComplaint: "Sudden onset right-sided weakness and slurred speech 90 minutes ago.",
    historyOfPresentingIllness:
      "Mrs. Chen was watching television when she suddenly developed right arm and leg weakness and could not speak clearly. Her husband called the ambulance immediately. She has no headache and no loss of consciousness. Last seen well 90 minutes ago.",
    pastMedicalHistory: "Atrial fibrillation (diagnosed 2 years ago), hypertension.",
    medications: "Warfarin 3mg OD (last INR 2.4 two weeks ago), Ramipril 5mg OD",
    familyHistory: "Mother had a stroke at age 78.",
    socialHistory: "Non-smoker. Lives with husband. Independent in ADLs.",
    systemsReview: "No recent fall, no chest pain, no fever.",
    vitalSigns: { bp: "178/102 mmHg", hr: "88 bpm (irregularly irregular)", rr: "16/min", temp: "36.8°C", spo2: "97% on room air" },
    examinationFindings:
      "Dysarthric speech. Right facial droop (lower motor neuron pattern absent). Right arm pronator drift. Right leg power 3/5. Right plantar extensor. NIHSS approximately 10.",
    questions: [
      { number: 1, question: "What is the most likely diagnosis and which arterial territory is affected? Give two differentials.", marks: 3, hint: "Correlate the focal deficits with vascular anatomy. Consider what makes thrombolysis contraindicated here." },
      { number: 2, question: "List the immediate investigations required and state what you are looking for in each.", marks: 4, hint: "Think about what must be excluded before any treatment decision. Time matters." },
      { number: 3, question: "Is this patient a candidate for IV thrombolysis? Justify your answer and outline your management.", marks: 5, hint: "Review contraindications carefully. Consider anticoagulation status and INR." },
      { number: 4, question: "What secondary prevention measures should be implemented before discharge?", marks: 3, hint: "Address the most likely embolic source. Consider anticoagulation, risk factor control." },
    ],
    totalMarks: 15,
    modelAnswerSummary:
      "Left MCA ischaemic stroke (right hemiplegia + dysarthria). Thrombolysis CONTRAINDICATED — patient on warfarin with therapeutic INR (>1.7 is a contraindication). Non-contrast CT head urgently to exclude haemorrhage. Admit HASU; aspirin 300mg after CT clears haemorrhage; rate control for AF; anticoagulation with DOAC after 2 weeks (AF = cardioembolic source); statin; BP target <130/80.",
  },

  // Case 3 — Pulmonology / PE
  {
    title: "Acute Dyspnea and Pleuritic Chest Pain",
    specialty: "Pulmonology",
    difficulty: "Hard",
    patientInfo: { name: "David Mensah", age: 44, sex: "Male", occupation: "Long-haul truck driver" },
    chiefComplaint: "Sudden onset right-sided chest pain worsening on inspiration and shortness of breath for 4 hours.",
    historyOfPresentingIllness:
      "Mr. Mensah returned from a 14-hour drive yesterday and developed sharp right-sided chest pain worsening on deep breathing, associated with increasing breathlessness. No fever. He has been feeling generally well. He denies cough, haemoptysis, or leg swelling but admits his right calf has been slightly sore for two days.",
    pastMedicalHistory: "None. No previous clots.",
    medications: "None.",
    familyHistory: "Mother had DVT during pregnancy.",
    socialHistory: "Non-smoker. Minimal alcohol. Sedentary job involving prolonged sitting.",
    systemsReview: "Right calf tenderness × 2 days. No constitutional symptoms.",
    vitalSigns: { bp: "118/76 mmHg", hr: "112 bpm", rr: "26/min", temp: "37.4°C", spo2: "91% on room air" },
    examinationFindings:
      "Tachycardic, tachypneic, anxious. Trachea central. Reduced breath sounds right base. Right calf: warm, swollen, tender, Homan's sign positive. JVP mildly elevated. No peripheral edema.",
    questions: [
      { number: 1, question: "What is the most likely diagnosis? Calculate a clinical probability score and list two differentials.", marks: 3, hint: "Use Wells criteria for PE. Consider the triad of risk factors, symptoms, and signs." },
      { number: 2, question: "What investigations would you request and in what order? Justify each.", marks: 4, hint: "Consider the role of D-dimer, CTPA, and lower limb Doppler. What does the ECG typically show?" },
      { number: 3, question: "Outline your immediate management including anticoagulation choices.", marks: 5, hint: "Assess severity using PESI or sPESI. Consider haemodynamic stability. Which anticoagulant and why?" },
      { number: 4, question: "What investigations would you arrange to identify an underlying cause or prothrombotic state?", marks: 3, hint: "Consider inherited and acquired risk factors. When should thrombophilia screening be done?" },
    ],
    totalMarks: 15,
    modelAnswerSummary:
      "Pulmonary embolism — Wells score ≥5 (high probability): signs of DVT, PE most likely diagnosis, tachycardia, immobilization. CTPA is gold standard — do not delay for Wells >4. ECG: S1Q3T3, sinus tachycardia. Haemodynamically stable → DOAC (rivaroxaban or apixaban); LMWH bridge if DOAC unavailable. Thrombolysis only if haemodynamic instability. Thrombophilia screen 3 months after anticoagulation stopped (not during).",
  },

  // Case 4 — Endocrinology / DKA
  {
    title: "Diabetic Ketoacidosis — Acute Management",
    specialty: "Endocrinology",
    difficulty: "Medium",
    patientInfo: { name: "Aisha Nkrumah", age: 22, sex: "Female", occupation: "University student" },
    chiefComplaint: "Vomiting, abdominal pain, and confusion for 12 hours in a known type 1 diabetic.",
    historyOfPresentingIllness:
      "Aisha has had type 1 diabetes for 8 years. She ran out of insulin 2 days ago and has been unwell since yesterday with nausea, vomiting, and central abdominal pain. She admits to polyuria and polydipsia. Her housemate noticed she was confused this morning and called the ambulance.",
    pastMedicalHistory: "Type 1 diabetes mellitus × 8 years. No other conditions.",
    medications: "Insulin glargine 20 units OD, Insulin aspart with meals (ran out 2 days ago).",
    familyHistory: "Mother has autoimmune thyroid disease.",
    socialHistory: "University student. Non-smoker. Occasional alcohol. Lives with friends.",
    systemsReview: "Deep sighing respiration noticed. Fruity-smelling breath reported by housemate. No fever.",
    vitalSigns: { bp: "98/62 mmHg", hr: "124 bpm", rr: "28/min (deep)", temp: "37.0°C", spo2: "99% on room air" },
    examinationFindings:
      "GCS 13 (E3V4M6). Kussmaul breathing. Dry mucous membranes, reduced skin turgor. Tender abdomen (diffuse, no guarding). Capillary glucose: 34 mmol/L. Urine dipstick: +++glucose, +++ketones.",
    questions: [
      { number: 1, question: "State the diagnosis and the three biochemical criteria required to confirm it. What is the likely precipitant?", marks: 3, hint: "Recall the JBDS DKA diagnostic criteria. Consider what triggered this episode." },
      { number: 2, question: "List the immediate investigations required and what abnormalities you would expect in each.", marks: 4, hint: "Focus on the metabolic derangements of DKA. Don't forget VBG, electrolytes, and ECG." },
      { number: 3, question: "Outline the first 2 hours of management using the DKA protocol.", marks: 5, hint: "Follow JBDS guidelines: fluids first, then fixed-rate insulin infusion. What potassium level is needed before starting insulin?" },
      { number: 4, question: "What are four complications of DKA treatment you must monitor for?", marks: 3, hint: "Think about the risks of rapid correction of glucose, osmolality, and electrolytes." },
    ],
    totalMarks: 15,
    modelAnswerSummary:
      "DKA: glucose >11mmol/L + ketonaemia ≥3mmol/L (or urine ketones ++) + pH <7.3/bicarb <15. Precipitant: insulin omission. Management: IV 0.9% NaCl 1L over 1h (fluids before insulin); Fixed-rate IV insulin 0.1 units/kg/hr; K+ must be >3.5 before insulin (replace if <3.5); hourly glucose and ketone monitoring; target ketone drop >0.5 mmol/L/hr. Complications to monitor: cerebral edema (esp. children), hypoglycemia, hypokalemia, aspiration, fluid overload.",
  },

  // Case 5 — Gastroenterology / GI bleed
  {
    title: "Upper Gastrointestinal Haemorrhage",
    specialty: "Gastroenterology",
    difficulty: "Hard",
    patientInfo: { name: "Patrick Sullivan", age: 65, sex: "Male", occupation: "Retired builder" },
    chiefComplaint: "Haematemesis (bright red blood) and feeling faint for the past 3 hours.",
    historyOfPresentingIllness:
      "Mr. Sullivan vomited fresh bright red blood twice this morning, approximately 400mL total. He feels dizzy when standing. He has a 10-year history of epigastric pain for which he takes ibuprofen regularly. He has also been taking aspirin since a TIA 2 years ago. He drank 8 units of alcohol last night.",
    pastMedicalHistory: "TIA 2 years ago, osteoarthritis (NSAIDs × 10 years), hypertension.",
    medications: "Aspirin 75mg OD, Ibuprofen 400mg TDS, Amlodipine 5mg OD. No PPI.",
    familyHistory: "No family history of GI disease or malignancy.",
    socialHistory: "Smokes 10 cigarettes/day. Alcohol 30 units/week. Retired.",
    systemsReview: "Epigastric pain most days. Melena × 2 days (didn't mention until asked). No dysphagia.",
    vitalSigns: { bp: "94/60 mmHg (lying), 78/52 mmHg (sitting)", hr: "118 bpm", rr: "20/min", temp: "36.9°C", spo2: "97% on room air" },
    examinationFindings:
      "Pale, diaphoretic, visibly unwell. Postural hypotension confirmed. Abdomen soft, epigastric tenderness. Rectal examination: melena on glove.",
    questions: [
      { number: 1, question: "What is the most likely source of bleeding? Calculate the Glasgow-Blatchford Score and state its significance.", marks: 3, hint: "Identify the most common causes of upper GI bleed. GBS predicts need for intervention." },
      { number: 2, question: "Outline your immediate resuscitation priorities in the first 30 minutes.", marks: 4, hint: "Follow an ABCDE approach. Consider IV access, fluid choice, and blood product triggers." },
      { number: 3, question: "What is your investigation and treatment plan including endoscopy timing?", marks: 5, hint: "Consider pre-endoscopy pharmacotherapy. When should endoscopy occur? What endoscopic therapies exist?" },
      { number: 4, question: "What medication changes should be made at discharge and why?", marks: 3, hint: "Review the iatrogenic contribution to this bleed. What is the evidence for PPI co-prescription?" },
    ],
    totalMarks: 15,
    modelAnswerSummary:
      "Peptic ulcer bleed most likely (NSAID + aspirin + alcohol + epigastric pain + melena). GBS ≥6 = high risk, needs inpatient endoscopy and likely intervention. Resuscitation: 2 large-bore IV cannulae, cross-match 4 units, IV PPI (omeprazole 80mg bolus + 8mg/hr infusion), transfuse if Hb <80 (or <100 if ACS). Endoscopy within 24h (within 12h if shocked/unstable). Discharge: switch to paracetamol for analgesia; continue aspirin only if cardiovascular indication; prescribe PPI lifelong.",
  },

  // Case 6 — Infectious Disease / Meningitis
  {
    title: "Fever with Neck Stiffness and Rash",
    specialty: "Infectious Disease",
    difficulty: "Hard",
    patientInfo: { name: "Callum Reid", age: 19, sex: "Male", occupation: "University fresher" },
    chiefComplaint: "Severe headache, neck stiffness, photophobia, and non-blanching rash for 6 hours.",
    historyOfPresentingIllness:
      "Callum was well until yesterday evening when he developed a severe headache described as the worst of his life. He now has neck stiffness, photophobia, and feels extremely unwell. His flatmate noticed a rash on his legs. He started university 3 weeks ago and lives in a dormitory.",
    pastMedicalHistory: "Nil significant. Vaccinations up to date but did not receive meningococcal ACWY as it was not offered at his school.",
    medications: "None.",
    familyHistory: "Nil relevant.",
    socialHistory: "Non-smoker. Social alcohol. University fresher in shared accommodation.",
    systemsReview: "Fever, rigors, vomiting. No preceding URTI. No recent travel.",
    vitalSigns: { bp: "88/54 mmHg", hr: "132 bpm", rr: "24/min", temp: "39.8°C", spo2: "96% on room air" },
    examinationFindings:
      "Very unwell, agitated. GCS 13. Neck stiffness: positive. Kernig's sign: positive. Non-blanching petechial and purpuric rash on both lower limbs and trunk. No papilloedema on fundoscopy.",
    questions: [
      { number: 1, question: "What is the diagnosis? What is the causative organism most likely responsible and why? State one important immediate action.", marks: 3, hint: "The rash is the key finding. What must be given before transfer — even before CT?" },
      { number: 2, question: "Should you perform a lumbar puncture now? Justify your answer and outline the investigation plan.", marks: 4, hint: "Review contraindications to LP. What do you expect CSF to show in bacterial meningitis?" },
      { number: 3, question: "Outline your emergency management including antibiotic choice, dosing, and adjunctive therapy.", marks: 5, hint: "Think about empirical cover, steroid indication, and septic shock management." },
      { number: 4, question: "What public health actions are required within 24 hours of this diagnosis?", marks: 3, hint: "Consider close contacts, chemoprophylaxis, and statutory notification." },
    ],
    totalMarks: 15,
    modelAnswerSummary:
      "Meningococcal meningitis/septicaemia — Neisseria meningitidis. GIVE IV BENZYLPENICILLIN 2.4g IMMEDIATELY — before CT, before transfer. LP CONTRAINDICATED now (GCS <15, haemodynamic instability, purpuric rash — risk of herniation and coagulopathy). Empirical antibiotics: IV ceftriaxone 2g BD. Dexamethasone 0.15mg/kg IV QDS × 4 days (before or with first antibiotic dose). Manage septic shock (fluids + noradrenaline). Notify public health; prophylaxis for close contacts (ciprofloxacin 500mg stat or rifampicin); contact tracing within 24 hours.",
  },

  // Case 7 — Obstetrics / Pre-eclampsia
  {
    title: "Hypertension and Headache in Pregnancy",
    specialty: "Obstetrics & Gynecology",
    difficulty: "Medium",
    patientInfo: { name: "Fatima Al-Hassan", age: 28, sex: "Female", occupation: "Primary school teacher" },
    chiefComplaint: "Severe headache, visual disturbance, and swelling in a 34-week primigravida.",
    historyOfPresentingIllness:
      "Mrs. Al-Hassan is 34 weeks pregnant with her first child. She presents with a 24-hour history of severe frontal headache, blurred vision, and epigastric pain. She noticed significant swelling of her face and hands over the past week. Her community midwife recorded a BP of 158/104 at her last appointment and asked her to come to hospital.",
    pastMedicalHistory: "No pre-existing hypertension, diabetes, or renal disease. Booking BP was 110/68.",
    medications: "Folic acid, ferrous sulphate.",
    familyHistory: "Mother had pre-eclampsia with her pregnancies.",
    socialHistory: "Married, lives with husband. Non-smoker. Works full time.",
    systemsReview: "Facial and hand swelling × 1 week. Epigastric pain. No fever. Good fetal movement reported.",
    vitalSigns: { bp: "168/110 mmHg", hr: "90 bpm", rr: "18/min", temp: "36.9°C", spo2: "98% on room air" },
    examinationFindings:
      "Alert. Facial oedema. Pitting oedema lower limbs (++) and hands. Reflexes brisk (3+). Fundoscopy: arteriovenous nipping. Uterus: 34/40, cephalic presentation, FHR 142 bpm.",
    questions: [
      { number: 1, question: "What is the diagnosis? State the diagnostic criteria and classify the severity.", marks: 3, hint: "Distinguish pre-eclampsia from gestational hypertension. What makes this severe? What is the HELLP triad?" },
      { number: 2, question: "What investigations are required to assess maternal and fetal wellbeing?", marks: 4, hint: "Consider multi-organ involvement: haematological, hepatic, renal, and fetal assessment." },
      { number: 3, question: "Outline the immediate management on the delivery suite.", marks: 5, hint: "Antihypertensive targets, seizure prophylaxis, and timing of delivery. What drug prevents eclampsia?" },
      { number: 4, question: "What postnatal complications should be monitored for and what advice should be given at discharge?", marks: 3, hint: "BP can worsen postnatally. Long-term cardiovascular risk. Future pregnancy counselling." },
    ],
    totalMarks: 15,
    modelAnswerSummary:
      "Severe pre-eclampsia: BP ≥160/110 + proteinuria + severe features (headache, visual disturbance, epigastric pain, brisk reflexes). HELLP = Haemolysis + Elevated Liver enzymes + Low Platelets. Management: IV labetalol or oral nifedipine for BP (target <150/100); IV magnesium sulphate for seizure prophylaxis (4g loading + 1g/hr maintenance); multidisciplinary input (obstetrics, anaesthetics, neonatology); delivery is definitive treatment — at 34 weeks with severe features, delivery after steroid course (betamethasone for fetal lung maturity). Monitor BP for 48h postnatally; ACEI contraindicated if breastfeeding.",
  },
];

function getFallbackCase(specialty: string): Record<string, unknown> {
  // Try to find a case matching the requested specialty
  const match = FALLBACK_CASES.find(
    (c) => (c.specialty as string).toLowerCase() === specialty.toLowerCase()
  );
  if (match) return { ...match, specialty };

  // Map specialty groups to closest available case
  const cardiacSpecialties = ["Cardiology", "Emergency Medicine", "General Medicine"];
  const neuroSpecialties = ["Neurology", "Psychiatry"];
  const respiratorySpecialties = ["Pulmonology"];
  const endoSpecialties = ["Endocrinology"];
  const giSpecialties = ["Gastroenterology", "General Surgery"];
  const infectiousSpecialties = ["Infectious Disease", "Pediatrics"];
  const obgynSpecialties = ["Obstetrics & Gynecology"];

  let index = 0; // default: Cardiology/ACS case
  if (neuroSpecialties.includes(specialty)) index = 1;
  else if (respiratorySpecialties.includes(specialty)) index = 2;
  else if (endoSpecialties.includes(specialty)) index = 3;
  else if (giSpecialties.includes(specialty)) index = 4;
  else if (infectiousSpecialties.includes(specialty)) index = 5;
  else if (obgynSpecialties.includes(specialty)) index = 6;
  else if (cardiacSpecialties.includes(specialty)) index = 0;

  return { ...FALLBACK_CASES[index], specialty };
}

function getFallbackFeedback(caseData: any, studentAnswer: string): Record<string, unknown> {
  const totalMarks = caseData?.totalMarks ?? 15;
  const wordCount = studentAnswer?.trim().split(/\s+/).length ?? 0;

  // Estimate score based on answer length as a rough proxy
  let rawScore: number;
  if (wordCount < 30) rawScore = Math.round(totalMarks * 0.3);
  else if (wordCount < 80) rawScore = Math.round(totalMarks * 0.5);
  else if (wordCount < 150) rawScore = Math.round(totalMarks * 0.65);
  else rawScore = Math.round(totalMarks * 0.75);

  const percentage = Math.round((rawScore / totalMarks) * 100);
  let grade = "Fail";
  if (percentage >= 75) grade = "Distinction";
  else if (percentage >= 60) grade = "Pass";
  else if (percentage >= 50) grade = "Borderline";

  const questions = (caseData?.questions ?? []) as any[];

  return {
    totalScore: rawScore,
    percentage,
    grade,
    overallFeedback:
      "Your answer showed engagement with the clinical scenario. In a live OSCE, a qualified examiner would provide detailed mark-by-mark feedback. The key areas to strengthen are systematic investigation planning and clear management sequencing.",
    questionFeedback: questions.map((q: any) => ({
      number: q.number,
      marksAwarded: Math.max(1, Math.round(q.marks * (rawScore / totalMarks))),
      marksAvailable: q.marks,
      feedback: "Review the model answer for this question and compare it with your response. Focus on completeness and clinical accuracy.",
      modelAnswer:
        q.number === 1
          ? "State the primary diagnosis with supporting clinical features, then give two differentials each with a distinguishing feature."
          : q.number === 2
          ? "List each investigation with its rationale and the expected finding that would support your diagnosis."
          : q.number === 3
          ? "Use a structured approach: immediate stabilization → specific treatment → monitoring. Quote targets and drug doses."
          : "List both acute and chronic complications relevant to the diagnosis and management provided.",
    })),
    strengths: [
      "Identified the clinical scenario and engaged with the case",
      "Structured response with relevant clinical content",
    ],
    areasForImprovement: [
      "Provide specific drug doses, routes, and frequencies in management questions",
      "Include both acute and long-term considerations when discussing complications",
      "Use validated clinical scoring tools (e.g. CURB-65, Wells, GBS) where appropriate",
    ],
    keyLearningPoints: [
      "Always use a systematic ABCDE approach for acutely unwell patients before moving to specific management",
      "Link each investigation to a specific clinical question — investigations confirm or refute a diagnosis",
      "Management questions should include immediate, short-term, and long-term components",
    ],
    recommendedReading: [
      "Oxford Handbook of Clinical Medicine (latest edition)",
      "Harrison's Principles of Internal Medicine",
      "NICE Clinical Guidelines (condition-specific)",
    ],
  };
}

export default router;
