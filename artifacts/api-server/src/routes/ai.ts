import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.post("/ai/chat", async (req, res): Promise<void> => {
  const { message, conversationHistory = [], context } = req.body;

  if (!message) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  try {
    const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

    if (baseUrl && apiKey) {
      const systemPrompt = `You are MedPath AI, an expert clinical companion for MBBS medical students. 
You provide accurate, evidence-based medical information to help students learn clinical medicine.

Your responses should:
- Be clinically accurate and educational
- Include relevant pathophysiology when appropriate
- Reference standard diagnostic criteria and treatment guidelines
- Use proper medical terminology with brief explanations
- Suggest when to consult senior clinicians or specialists
- Cover differential diagnoses when relevant

Always remind students that clinical decisions should be made by qualified healthcare professionals.
${context ? `Additional context: ${context}` : ""}`;

      const messages = [
        { role: "system", content: systemPrompt },
        ...(conversationHistory || []).map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
        { role: "user", content: message },
      ];

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-5.6-luna",
          max_completion_tokens: 1024,
          messages,
        }),
      });

      if (response.ok) {
        const data = await response.json() as { choices: Array<{ message: { content: string } }> };
        const reply = data.choices?.[0]?.message?.content ?? "I could not generate a response.";
        res.json({ reply, sources: [] });
        return;
      }
    }

    // Fallback: rule-based medical responses
    const reply = generateFallbackResponse(message);
    res.json({ reply, sources: [] });
  } catch {
    const reply = generateFallbackResponse(message);
    res.json({ reply, sources: [] });
  }
});

function generateFallbackResponse(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("diabetes") || lower.includes("hyperglycemia")) {
    return "Diabetes mellitus is characterized by chronic hyperglycemia. Type 1 involves autoimmune beta-cell destruction (insulin deficient), while Type 2 involves insulin resistance with relative deficiency. Key diagnostic criteria: FPG ≥126 mg/dL, 2h OGTT ≥200 mg/dL, HbA1c ≥6.5%, or symptomatic with random glucose ≥200 mg/dL. Management: lifestyle modification, metformin (first-line for T2DM), and escalation per guidelines. Monitor for complications: nephropathy, retinopathy, neuropathy, and cardiovascular disease.";
  }

  if (lower.includes("hypertension") || lower.includes("blood pressure")) {
    return "Hypertension is defined as persistent BP ≥130/80 mmHg (ACC/AHA) or ≥140/90 mmHg (WHO). Primary (essential) hypertension accounts for 90-95% of cases. Initial evaluation includes fundoscopy, ECG, renal function, and urine analysis. First-line agents: ACE inhibitors/ARBs, CCBs, thiazide diuretics. Target BP: <130/80 for most patients, <140/90 for elderly (>65y). Always consider secondary causes (renal artery stenosis, primary aldosteronism, phaeochromocytoma) in resistant or young-onset hypertension.";
  }

  if (lower.includes("mi") || lower.includes("myocardial infarction") || lower.includes("heart attack")) {
    return "STEMI management: activate cath lab immediately (door-to-balloon <90 min). Primary PCI is preferred reperfusion. If PCI unavailable, thrombolytics within 30 min. NSTEMI: GRACE score risk stratification; anticoagulation (LMWH/fondaparinux), dual antiplatelet (aspirin + P2Y12 inhibitor). Initial investigations: 12-lead ECG (Q waves, ST changes), troponins (rise at 3-6h, peak 12-24h), CXR, echo. Key complications: arrhythmias (most common early cause of death), cardiogenic shock, mechanical complications (VSD, MR, free wall rupture).";
  }

  if (lower.includes("pneumonia")) {
    return "Community-acquired pneumonia (CAP): CURB-65 score guides admission decision (Confusion, Urea >7, RR ≥30, BP <90/60, Age ≥65 — score ≥2: consider hospital admission). Common pathogens: Streptococcus pneumoniae (most common), atypicals (Mycoplasma, Chlamydophila, Legionella). CXR shows lobar consolidation, interstitial infiltrates. Management: amoxicillin ± macrolide (outpatient), beta-lactam + macrolide or respiratory quinolone (inpatient), piperacillin-tazobactam + azithromycin (ICU/severe). Reassess at 48-72h.";
  }

  if (lower.includes("anemia")) {
    return "Anemia classification by MCV: Microcytic (MCV <80) — iron deficiency (most common globally), thalassemia, sideroblastic; Normocytic (MCV 80-100) — chronic disease, acute blood loss, aplastic anemia, renal disease; Macrocytic (MCV >100) — B12/folate deficiency, liver disease, hypothyroidism, drugs (methotrexate, hydroxyurea). Investigation: CBC, reticulocyte count, peripheral smear, iron studies (ferritin, TIBC, serum iron), B12/folate. Iron deficiency: ferritin <12 μg/L is diagnostic. Treatment is cause-specific.";
  }

  return `Thank you for your clinical question about: "${message}". 

As your AI clinical companion, I can help with:
- Disease pathophysiology and clinical features
- Diagnostic approaches and investigations
- Treatment guidelines and drug mechanisms
- Differential diagnoses
- MBBS exam preparation topics

For detailed, accurate information, please connect this app to the AI service. In the meantime, I recommend consulting Harrison's Principles of Internal Medicine, Davidson's, or UpToDate for evidence-based clinical information.

What specific aspect of this topic would you like to explore further?`;
}

export default router;
