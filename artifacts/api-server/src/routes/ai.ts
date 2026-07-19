import { Router, type IRouter } from "express";

const router: IRouter = Router();

// ─── Toggle this to false to use live Gemini API ───────────────────────────
const GEMINI_ENABLED = false;
// ───────────────────────────────────────────────────────────────────────────

const STRUCTURED_SYSTEM_PROMPT = `You are MedPath AI, an expert clinical companion for MBBS medical students. You provide accurate, evidence-based medical information.

CRITICAL INSTRUCTION: For every clinical query, you MUST structure your response using EXACTLY these 13 sections with markdown bold headers. Never skip a section. Never reorder them.

**Definition**
Concise clinical definition (2-3 sentences).

**Causes**
Classify causes (e.g. infective/non-infective, primary/secondary, congenital/acquired). Use bullet points.

**Risk Factors**
List modifiable and non-modifiable risk factors as bullet points.

**Symptoms**
Separate into: Typical symptoms • Atypical presentations • Severity indicators. Use bullets.

**Differential Diagnosis**
List 4-6 differentials with a one-line distinguishing feature for each.

**History Questions**
List 6-8 targeted history questions a clinician should ask this patient.

**Physical Examination**
List key examination findings to look for, organized by system or relevance.

**Investigations**
Two tiers:
- First-line (bedside/urgent)
- Second-line (confirmatory/specialized)
Include what result you expect and why.

**Management**
Stepwise: Immediate → Short-term → Long-term. Include non-pharmacological measures.

**Drug Treatment**
List drugs with: drug name | dose | route | frequency | key monitoring point. Include first-line and alternatives.

**Clinical Pearls**
3-5 high-yield exam and clinical practice tips (mnemonics, key numbers, classic presentations).

**Red Flags**
Bullet list of warning signs requiring urgent/emergency escalation.

**Patient Education**
3-4 key points to explain to the patient in simple language.

---
Always include a brief disclaimer at the end: "⚕️ Clinical decisions must always be made by a qualified healthcare professional."`;

async function callGemini(
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens = 8192
): Promise<string | null> {
  if (!GEMINI_ENABLED) return null;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { maxOutputTokens: maxTokens },
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

router.post("/ai/chat", async (req, res): Promise<void> => {
  const { message, conversationHistory = [], context } = req.body;

  if (!message) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  try {
    const systemContent =
      STRUCTURED_SYSTEM_PROMPT + (context ? `\n\nAdditional context: ${context}` : "");

    const userMessages = [
      ...(conversationHistory || []).map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const aiReply = await callGemini(systemContent, userMessages, 8192);

    if (aiReply) {
      res.json({ reply: aiReply, sources: [] });
      return;
    }

    // Fallback: structured mock responses
    const reply = generateStructuredFallback(message);
    res.json({ reply, sources: [] });
  } catch {
    const reply = generateStructuredFallback(message);
    res.json({ reply, sources: [] });
  }
});

function generateStructuredFallback(message: string): string {
  const lower = message.toLowerCase();

  // ── Diabetes ────────────────────────────────────────────────────────────
  if (lower.includes("diabetes") || lower.includes("hyperglycemia") || lower.includes("dm")) {
    return `**Definition**
Diabetes mellitus is a group of metabolic diseases characterized by chronic hyperglycemia resulting from defects in insulin secretion, insulin action, or both (WHO). Type 1 is autoimmune beta-cell destruction; Type 2 involves insulin resistance with progressive beta-cell failure.

**Causes**
- Type 1: Autoimmune destruction of pancreatic beta cells (HLA-DR3/DR4 association)
- Type 2: Insulin resistance + relative insulin deficiency; multifactorial
- Other: MODY, gestational DM, drug-induced (steroids, antipsychotics), pancreatitis

**Risk Factors**
- Non-modifiable: Family history, age >45, ethnicity (South Asian, African), previous GDM
- Modifiable: Obesity (BMI >30), physical inactivity, high-carbohydrate diet, hypertension, dyslipidemia

**Symptoms**
- Classic triad: Polyuria, Polydipsia, Polyphagia
- Weight loss (especially T1DM)
- Fatigue, blurred vision, recurrent infections (candidiasis, UTIs)
- Slow wound healing, peripheral numbness/tingling
- T2DM: often asymptomatic — detected on screening

**Differential Diagnosis**
- Diabetes insipidus — polyuria without hyperglycemia (low urine osmolality)
- MODY — autosomal dominant, family history, mild hyperglycemia in young
- Cushing syndrome — central obesity, elevated cortisol with hyperglycemia
- Acromegaly — insulin resistance secondary to excess GH
- Chronic pancreatitis — exocrine + endocrine insufficiency

**History Questions**
1. When did symptoms start? Onset helps distinguish T1 (acute) from T2 (insidious)
2. Any polyuria, polydipsia, or unexplained weight loss?
3. Family history of diabetes?
4. Any previous gestational diabetes or macrosomic babies?
5. Current medications (steroids, antipsychotics, thiazides)?
6. Exercise frequency and diet history?
7. Any symptoms of complications (vision changes, foot numbness, chest pain)?
8. Ethnic background and BMI history?

**Physical Examination**
- Anthropometrics: BMI, waist circumference, blood pressure
- Eyes: fundoscopy for retinopathy (dot/blot hemorrhages, new vessel formation)
- Feet: inspection (ulcers, deformity), sensation (10g monofilament, tuning fork), peripheral pulses
- Skin: acanthosis nigricans (insulin resistance), lipohypertrophy at injection sites
- Cardiovascular: signs of autonomic neuropathy (postural hypotension)
- Abdomen: hepatomegaly in fatty liver disease

**Investigations**
First-line:
- Fasting plasma glucose (FPG) ≥7.0 mmol/L (126 mg/dL) — diagnostic if repeated
- HbA1c ≥6.5% (48 mmol/mol) — diagnostic
- Random glucose ≥11.1 mmol/L with symptoms — diagnostic

Second-line:
- 75g OGTT (2h glucose ≥11.1 mmol/L)
- C-peptide and GAD antibodies (distinguish T1 from T2/MODY)
- Fasting lipid profile, urine ACR, eGFR, LFTs, TSH
- Urine ketones (DKA screen in new T1DM)

**Management**
Immediate: Treat DKA/HHS if present (fluids, insulin, electrolyte correction)
Short-term: Patient education, glucose monitoring, dietary counseling, lifestyle modification
Long-term: HbA1c target <7.0% for most; annual review of complications; multidisciplinary care

Non-pharmacological: DASH/Mediterranean diet, aerobic exercise ≥150 min/week, weight loss (5-10% reduces HbA1c by 1-2%)

**Drug Treatment**
- Metformin | 500mg | oral | BD-TDS with food | eGFR monitoring (stop if <30)
- SGLT2 inhibitors (empagliflozin) | 10mg | oral | OD | eGFR, UTI risk, DKA (rare)
- GLP-1 agonists (semaglutide) | 0.5-1mg | SC | weekly | GI side effects, pancreatitis
- DPP-4 inhibitors (sitagliptin) | 100mg | oral | OD | dose-adjust in renal impairment
- Sulfonylureas (gliclazide MR) | 30-120mg | oral | OD | hypoglycemia risk
- Insulin (basal-bolus) — when HbA1c persistently elevated despite 2-3 agents

**Clinical Pearls**
- 🔑 "MODY" in a lean young patient with family history — test for GCK/HNF mutations
- HbA1c is falsely low in hemolytic anemia, iron-deficiency, recent transfusion
- SGLT2 inhibitors reduce CV mortality (EMPA-REG, CANVAS trials) — prescribe in T2DM + CVD
- DKA can occur in T2DM on SGLT2 inhibitors (euglycemic DKA) — don't miss it
- Statin therapy is recommended for virtually all T2DM patients >40 years

**Red Flags**
🚨 DKA: Vomiting + abdominal pain + deep sighing respiration (Kussmaul) + fruity breath → Emergency
🚨 HHS: Profound dehydration + confusion + glucose >33 mmol/L → ICU
🚨 Severe hypoglycemia: BG <3 mmol/L + confusion/unconscious → glucagon/IV dextrose
🚨 Acute foot infection with systemic features → urgent surgical/orthopedic review

**Patient Education**
1. Check your blood glucose as directed and keep a log — share with your doctor at every visit
2. Eat smaller portions, reduce refined carbohydrates and sugary drinks; aim for consistent meal times
3. Never skip your medications — diabetes complications (blindness, kidney failure, amputation) are largely preventable with good control
4. Report any foot wounds immediately — even small cuts can become serious infections quickly

⚕️ Clinical decisions must always be made by a qualified healthcare professional.`;
  }

  // ── Hypertension ─────────────────────────────────────────────────────────
  if (lower.includes("hypertension") || lower.includes("high blood pressure") || lower.includes(" htn")) {
    return `**Definition**
Hypertension is persistently elevated systemic arterial blood pressure defined as ≥140/90 mmHg (WHO/ESC) or ≥130/80 mmHg (ACC/AHA 2017). It is the leading modifiable risk factor for cardiovascular disease globally.

**Causes**
- Primary (Essential) 90-95%: multifactorial — genetic predisposition + environmental factors
- Secondary 5-10%: Renovascular (renal artery stenosis), primary hyperaldosteronism (Conn syndrome), phaeochromocytoma, Cushing syndrome, coarctation of aorta, OSA, drugs (NSAIDs, OCP, decongestants)

**Risk Factors**
- Non-modifiable: Age, male sex, family history, Black African ethnicity
- Modifiable: Obesity, high sodium diet (>5g/day), physical inactivity, heavy alcohol, smoking, stress, chronic kidney disease

**Symptoms**
- Usually asymptomatic ("silent killer")
- Headache (occipital, morning), epistaxis, visual changes — non-specific
- Hypertensive crisis: severe headache, visual disturbance, chest pain, focal neurological deficit

**Differential Diagnosis**
- White coat hypertension — BP normal on 24h ABPM
- Phaeochromocytoma — episodic sweating, headache, palpitations; elevated catecholamines
- Primary hyperaldosteronism — hypokalemia + resistant HTN; elevated aldosterone:renin ratio
- Renal artery stenosis — young patient or resistant HTN; renal bruit; bilateral leg edema
- Cushing syndrome — central obesity, striae, buffalo hump, elevated cortisol

**History Questions**
1. Duration of hypertension and prior BP measurements?
2. Any symptoms suggesting end-organ damage (headache, visual changes, chest pain, dyspnea, ankle swelling)?
3. Episodic symptoms (suggesting phaeochromocytoma: palpitations, sweating, headache)?
4. Drug history: NSAIDs, OCP, decongestants, stimulants?
5. Family history of hypertension, stroke, premature cardiac death?
6. Dietary salt and alcohol intake, smoking, exercise?
7. Any renal disease or chronic illness?
8. Snoring/witnessed apneas (sleep apnea)?

**Physical Examination**
- BP both arms (twice, sitting, 5 min rest) — if arm difference >20 mmHg, suspect subclavian stenosis
- Heart rate and rhythm; BMI and waist circumference
- Fundoscopy: Keith-Wagener-Barker grading (silver wiring, AV nipping, papilloedema)
- Cardiovascular: S4, displaced apex (LVH), renal bruits (aortic/renal artery stenosis)
- Renal: abdominal masses (polycystic kidneys)
- Neurological: focal deficits suggesting previous stroke

**Investigations**
First-line (all patients):
- Urinalysis (protein, blood — renal disease)
- Serum creatinine + eGFR, electrolytes (hypokalemia → aldosteronism)
- Fasting glucose, HbA1c
- Fasting lipid profile
- ECG (LVH: Sokolow-Lyon criteria; strain pattern)

Second-line:
- 24h ABPM (gold standard — excludes white coat, diagnoses masked HTN)
- Echocardiography (LVH assessment)
- Renal ultrasound + Doppler (RAS)
- Aldosterone:Renin Ratio (if hypokalemia or resistant HTN)
- 24h urinary catecholamines/metanephrines (phaeochromocytoma)

**Management**
Immediate: Hypertensive emergency (BP >180/120 with end-organ damage) — IV labetalol or nitroprusside; controlled reduction <25% in first hour
Short-term: Lifestyle modification 3-6 months if Stage 1 without organ damage; initiate drugs in Stage 2 or high-risk
Long-term: Treat to target BP <130/80 for most; <140/90 for elderly; annual review, ABPM monitoring

**Drug Treatment**
- Amlodipine | 5-10mg | oral | OD | ankle edema, flushing (CCB — preferred in elderly/Black patients)
- Lisinopril/Ramipril | 5-10mg | oral | OD | monitor K+, creatinine, cough (ACEi — preferred in DM/CKD)
- Losartan | 50-100mg | oral | OD | same as ACEi, no cough (ARB — if ACEi intolerant)
- Indapamide | 1.5mg SR | oral | OD | electrolytes, glucose (Thiazide-like — preferred over HCTZ)
- Bisoprolol | 5-10mg | oral | OD | heart rate, bronchospasm (Beta-blocker — add-on or in HF/AF)
- Spironolactone | 25-50mg | oral | OD | K+, renal function (resistant HTN 4th line)

**Clinical Pearls**
- 🔑 "A + C" first-line: ACEi/ARB + CCB for most patients; add thiazide if needed
- Check BOTH arms at diagnosis — >20 mmHg difference suggests subclavian stenosis or aortic coarctation
- Isolated systolic HTN in elderly → CCB preferred (stiff large arteries)
- Resistant HTN = uncontrolled on 3 drugs including a diuretic → exclude secondary causes, check adherence
- ARBs have no cough — use if ACEi causes cough (10-15% of patients)

**Red Flags**
🚨 Hypertensive encephalopathy: BP >180/120 + confusion/seizures → IV therapy, ICU
🚨 Aortic dissection: Tearing interscapular pain + BP differential between arms → Emergency CT
🚨 Acute pulmonary edema: Severe HTN + acute dyspnea → IV furosemide + GTN
🚨 Hypertensive retinopathy Grade 4 (papilloedema) → Treat as emergency

**Patient Education**
1. Take your medications every day — missing doses even occasionally can cause dangerous BP spikes
2. Reduce salt to less than 5g (1 teaspoon) daily — read food labels; avoid processed and packaged foods
3. Check your BP at home weekly and bring your log to clinic — home readings are more meaningful than clinic readings
4. Regular exercise (30 minutes walking, 5 days/week) can reduce BP by 5-8 mmHg on its own

⚕️ Clinical decisions must always be made by a qualified healthcare professional.`;
  }

  // ── Myocardial Infarction ─────────────────────────────────────────────────
  if (lower.includes("myocardial infarction") || lower.includes(" mi ") || lower.includes("stemi") || lower.includes("heart attack") || lower.includes("nstemi")) {
    return `**Definition**
Acute myocardial infarction (AMI) is irreversible myocardial necrosis caused by prolonged ischemia, most commonly from plaque rupture with thrombosis in a coronary artery. STEMI: full-thickness infarct with complete occlusion. NSTEMI: partial occlusion with positive biomarkers.

**Causes**
- Type 1 (Spontaneous): Plaque rupture/erosion with acute thrombosis (most common)
- Type 2 (Demand): Supply-demand mismatch — severe anaemia, tachyarrhythmia, hypotension, vasospasm
- Other: Coronary embolism, dissection, vasculitis (rare)

**Risk Factors**
- Non-modifiable: Age (M >45, F >55), male sex, family history (FDR <55M / <65F), South Asian ethnicity
- Modifiable: Smoking (#1 modifiable), hypertension, diabetes, hyperlipidemia, obesity, sedentary lifestyle, cocaine use

**Symptoms**
- Classic: Crushing central chest pain radiating to left arm/jaw, diaphoresis, nausea, dyspnea
- Atypical (women, diabetics, elderly): Epigastric pain, vomiting, fatigue, syncope — "silent MI"
- Physical signs: Tachycardia, pallor, diaphoresis, 3rd/4th heart sound, new murmur (mechanical complication)

**Differential Diagnosis**
- Aortic dissection — tearing pain radiating to back, BP differential between arms, wide mediastinum
- Pulmonary embolism — pleuritic chest pain, dyspnea, hypoxia; ECG S1Q3T3
- GERD/esophageal spasm — relieved by antacids, no ECG changes, normal troponin
- Pericarditis — sharp positional pain, worse supine, better leaning forward; saddle ST elevation
- Unstable angina — ECG changes, negative troponin (by definition)

**History Questions**
1. Character, location, radiation, and severity of pain (1-10)?
2. Time of onset — duration matters for reperfusion decision
3. Exertional or rest pain?
4. Associated diaphoresis, dyspnea, nausea, syncope?
5. Prior cardiac history, previous MI, PCI, or CABG?
6. Current medications (especially anticoagulants, nitrates)?
7. Contraindications to thrombolytics (recent surgery, bleeding history)?
8. Drug use: cocaine? (causes vasospasm)

**Physical Examination**
- Vitals: BP both arms, HR, SpO2 — hemodynamic stability assessment
- Cardiovascular: JVP elevation, new murmur (MR = papillary muscle; VSD = harsh pansystolic), S3/S4
- Chest: Signs of pulmonary edema (bilateral fine crackles, wheeze)
- Peripheral: Pulse quality, capillary refill (cardiogenic shock assessment)

**Investigations**
First-line (immediate):
- 12-lead ECG within 10 minutes of arrival — ST elevation ≥1mm in ≥2 contiguous leads = STEMI
- High-sensitivity Troponin I/T: at 0h and 3h (rise at 3-6h, peak 12-24h, normalizes 7-14 days)
- SpO2 and CXR (pulmonary edema, mediastinum)
- Point-of-care glucose, blood gas

Second-line:
- CBC, coagulation profile, renal function (pre-PCI), LFTs
- Echocardiography (wall motion abnormalities, EF, mechanical complications)
- Coronary angiography (diagnostic + therapeutic in STEMI)

**Management**
Immediate (STEMI):
- Activate cath lab — door-to-balloon target <90 minutes
- Aspirin 300mg loading (chew) + P2Y12 inhibitor (ticagrelor 180mg or prasugrel 60mg)
- Anticoagulation: UFH bolus or bivalirudin
- Primary PCI (preferred) — balloon and stent to culprit lesion

NSTEMI:
- GRACE score → risk-stratify: High-risk → early invasive within 24h
- Dual antiplatelet + anticoagulation (fondaparinux preferred if no PCI)

Long-term (all MI):
- Aspirin 75mg lifelong + P2Y12 inhibitor for 12 months
- Beta-blocker (bisoprolol), ACE inhibitor (ramipril), statin (atorvastatin 40-80mg)
- Cardiac rehabilitation, smoking cessation, dietary modification

**Drug Treatment**
- Aspirin | 300mg loading, then 75mg | oral | OD lifelong | GI bleeding risk
- Ticagrelor | 180mg loading, then 90mg | oral | BD × 12 months | dyspnea, bleeding
- Atorvastatin | 40-80mg | oral | OD | LFTs, myalgia (high-intensity statin)
- Ramipril | 2.5mg → 10mg | oral | OD | creatinine, potassium (ACEi — reduces remodeling)
- Bisoprolol | 1.25mg → 10mg | oral | OD | HR target 55-65 bpm (beta-blocker)
- Morphine | 2-5mg IV titrated | IV | PRN | respiratory rate (use cautiously — may worsen outcomes)

**Clinical Pearls**
- 🔑 MONA is outdated — Morphine may be harmful; O2 only if SpO2 <94%; Nitrates avoid in RV infarct
- Posterior MI: ST depression V1-V3 + dominant R wave = STEMI equivalent — do posterior leads V7-V9
- Right ventricular MI (inferior STEMI + hypotension): Fluid, NOT diuretics — avoid nitrates
- New LBBB with chest pain = STEMI equivalent — don't be fooled by "old LBBB"
- Killip classification grades heart failure post-MI: I (no HF) → IV (cardiogenic shock)

**Red Flags**
🚨 Cardiogenic shock (BP <90 + poor perfusion) → IABP + emergency PCI
🚨 Ventricular fibrillation → Immediate defibrillation (200J biphasic)
🚨 Cardiac tamponade (Beck's triad: hypotension + muffled sounds + JVP↑) → Pericardiocentesis
🚨 New pansystolic murmur post-MI → VSD or acute MR → Surgical emergency

**Patient Education**
1. Call emergency services immediately at the first sign of chest pain lasting >15 minutes — every minute without treatment damages heart muscle
2. Chew (not swallow) aspirin if available and you are not allergic — it works faster when chewed
3. After discharge, take all your heart medications every day — stopping beta-blockers or aspirin significantly increases the risk of a second heart attack
4. Attend cardiac rehabilitation — supervised exercise after MI improves survival and quality of life

⚕️ Clinical decisions must always be made by a qualified healthcare professional.`;
  }

  // ── Pneumonia ─────────────────────────────────────────────────────────────
  if (lower.includes("pneumonia")) {
    return `**Definition**
Pneumonia is an acute infection of the lung parenchyma causing alveolar consolidation. Community-acquired pneumonia (CAP) occurs outside hospital; hospital-acquired pneumonia (HAP) develops ≥48h after admission.

**Causes**
- Bacterial (most common CAP): Streptococcus pneumoniae, Haemophilus influenzae, Moraxella catarrhalis
- Atypical (walk-in pneumonia): Mycoplasma pneumoniae, Legionella pneumophila, Chlamydophila pneumoniae
- Viral: Influenza, SARS-CoV-2, RSV
- HAP/VAP: Gram-negatives (Pseudomonas, Klebsiella), MRSA

**Risk Factors**
- Age extremes (<5y, >65y), smoking, alcohol, COPD, asthma, immunocompromise (HIV, steroids, chemotherapy), aspiration risk (neurological disease, dysphagia, sedation)

**Symptoms**
- Classic: Fever, productive cough (rust-colored sputum in pneumococcal), dyspnea, pleuritic chest pain
- Atypical: Dry cough, headache, myalgia — insidious onset (Mycoplasma)
- Examination: Dullness to percussion, bronchial breathing, crepitations, reduced breath sounds (effusion)

**Differential Diagnosis**
- Pulmonary tuberculosis — night sweats, weight loss, hemoptysis; apical changes on CXR
- Pulmonary embolism — sudden dyspnea, pleuritic pain; risk factors for VTE; normal CXR
- Heart failure — bilateral basal crepitations, JVP elevated, orthopnea, BNP elevated
- Lung cancer — constitutional symptoms; persistent lobar collapse; no improvement with antibiotics
- ARDS — bilateral diffuse infiltrates; preceding trigger; severe hypoxia

**History Questions**
1. Duration and character of symptoms (onset, cough type, sputum color)?
2. Fever — temperature, rigors?
3. Recent travel abroad (Legionella risk in hotels)?
4. Immunosuppression or chronic disease?
5. Aspiration risk (alcohol, altered consciousness, dysphagia)?
6. Sick contacts or occupational exposure?
7. Vaccination history (pneumococcal, influenza)?
8. Hospital admission or healthcare contact in past 90 days (HAP risk)?

**Physical Examination**
- Vitals: Temperature, RR (key CURB-65 component ≥30), HR, BP, SpO2
- Inspection: Respiratory distress, use of accessory muscles, cyanosis
- Percussion: Dullness over consolidation or effusion
- Auscultation: Bronchial breathing, crepitations (fine = fluid; coarse = secretions), pleural rub
- General: JVP (HF?), lymphadenopathy, rash (erythema multiforme in Mycoplasma)

**Investigations**
First-line:
- CXR (PA): lobar consolidation — confirms diagnosis; reveals complications (effusion, cavity)
- SpO2 and ABG (if SpO2 <92% or severe)
- CBC: neutrophilia (bacterial), lymphopenia (viral/atypical), leukopenia (severe sepsis)
- CRP, procalcitonin (bacterial vs viral; serial PCT guides antibiotic duration)
- Blood cultures × 2 (before antibiotics if possible)

Second-line:
- Urine Legionella antigen (if severe/travel/outbreak)
- Urine pneumococcal antigen (severe CAP)
- Sputum culture + sensitivity (not routine, but send in ICU/severe)
- CT chest (if no improvement at 48h, or suspected complications)
- HIV test (consider in all adults with pneumonia)

**Management**
CURB-65 Score (0-5): C=confusion, U=urea>7mmol/L, R=RR≥30, B=BP<90/60, 65=age≥65
- Score 0-1: Home → oral amoxicillin ± macrolide
- Score 2: Hospital consideration → IV antibiotics
- Score 3-5: Hospital + ICU assessment

Supportive: Oxygen (target SpO2 94-98%; 88-92% in COPD), IV fluids if dehydrated, antipyretics, chest physiotherapy, DVT prophylaxis, early mobilization

**Drug Treatment**
- Amoxicillin | 1g | oral | TDS × 5 days | (mild CAP outpatient — S. pneumoniae)
- Amoxicillin + Clarithromycin | 500mg each | oral | BD | GI upset, QTc (moderate CAP for atypicals)
- Levofloxacin | 500mg | oral/IV | OD × 5-7 days | QTc, tendinopathy (respiratory quinolone — penicillin allergy or severe)
- Co-amoxiclav + clarithromycin | 1.2g IV + 500mg | IV | TDS + BD | (severe inpatient)
- Piperacillin-tazobactam | 4.5g | IV | TDS | (HAP/aspiration/Pseudomonas risk)

**Clinical Pearls**
- 🔑 CURB-65 ≥3 = high mortality (>15%) — admit, consider ICU
- Rust-colored sputum = pneumococcal pneumonia (hemosiderin from RBC breakdown)
- "Round pneumonia" in children on CXR — classic for Streptococcus pneumoniae
- Legionella: think hotels/air conditioning; hyponatremia + abnormal LFTs + high CRP
- Non-resolving pneumonia at 6 weeks → repeat CXR → exclude malignancy

**Red Flags**
🚨 Septic shock: hypotension not responding to fluids → ICU + broad-spectrum IV antibiotics within 1 hour
🚨 SpO2 <90% despite oxygen therapy → consider CPAP/NIV/intubation
🚨 Empyema (pleural fluid pH <7.2) → urgent chest drain
🚨 PaO2/FiO2 ratio <200 → ARDS criteria → ITU

**Patient Education**
1. Complete the full antibiotic course even if you feel better — stopping early can allow bacteria to return, stronger and harder to treat
2. Rest and drink plenty of fluids — recovery from pneumonia can take 4-6 weeks; fatigue may persist
3. Get vaccinated — pneumococcal and annual influenza vaccines significantly reduce your risk of future pneumonia
4. Stop smoking — smoking directly impairs your lung defenses and makes you much more likely to develop pneumonia again

⚕️ Clinical decisions must always be made by a qualified healthcare professional.`;
  }

  // ── Asthma ────────────────────────────────────────────────────────────────
  if (lower.includes("asthma") || lower.includes("bronchospasm") || lower.includes("wheez")) {
    return `**Definition**
Asthma is a chronic inflammatory disorder of the airways characterized by variable and recurring symptoms, airflow obstruction, bronchial hyper-responsiveness, and underlying airway inflammation. It is reversible either spontaneously or with treatment, distinguishing it from COPD.

**Causes**
- Atopic/Allergic: IgE-mediated response to allergens (house dust mite, pollen, pet dander) — most common
- Non-atopic: Infection-triggered, exercise-induced, aspirin/NSAID-induced, occupational (flour, isocyanates)
- Mechanisms: Mast cell degranulation → bronchoconstriction; eosinophilic inflammation; smooth muscle hypertrophy (chronic)

**Risk Factors**
- Non-modifiable: Atopy/eczema/allergic rhinitis, family history, premature birth, male sex (children)
- Modifiable: Smoke exposure (active/passive), indoor allergens, air pollution, obesity, respiratory infections in childhood

**Symptoms**
- Classic triad: Episodic wheeze, breathlessness, cough (worse at night/early morning)
- Chest tightness, prolonged expiration, use of accessory muscles
- Triggers: exercise, cold air, allergens, viral URTI, emotion, NSAIDs
- Atypical: Isolated nocturnal cough in children; chronic cough variant asthma

**Differential Diagnosis**
- COPD — older patient, smoking history, partially reversible obstruction; no diurnal variation
- Cardiac failure — pulmonary edema causing "cardiac asthma"; bilateral crackles, elevated BNP
- Vocal cord dysfunction — inspiratory stridor, normal spirometry between attacks
- Bronchiectasis — chronic productive cough, clubbing, CT shows dilated airways
- Foreign body aspiration — sudden onset in child, unilateral wheeze, no response to bronchodilators

**History Questions**
1. Age of onset and progression of symptoms?
2. Triggers identified (allergens, exercise, cold, aspirin, stress)?
3. Diurnal pattern — worse at night or early morning?
4. History of atopy (eczema, hay fever, food allergy)?
5. Occupational exposures (flour dust, chemicals)?
6. Current medications and adherence to inhalers?
7. Number of exacerbations, A&E visits, and hospitalizations in past 12 months?
8. Smoking history and secondhand smoke exposure?

**Physical Examination**
- Respiratory: Bilateral polyphonic wheeze on auscultation, prolonged expiratory phase
- Signs of severity: accessory muscle use (sternocleidomastoid), tracheal tug, paradoxical breathing
- Pulsus paradoxus >10 mmHg — severe attack
- Signs of atopy: eczema, nasal polyps, allergic shiners
- Peak flow measurement (compare to personal best or predicted)

**Investigations**
First-line:
- Peak Expiratory Flow Rate (PEFR): <50% predicted = severe; diurnal variability >20% supports asthma
- SpO2 and ABG in acute attack (Type 1 RF; Type 2 = impending respiratory failure)
- Spirometry: FEV1/FVC <0.7 with ≥12% + 200mL reversibility after bronchodilator

Second-line:
- FeNO (fractional exhaled nitric oxide): ≥40 ppb = eosinophilic inflammation
- Skin prick testing / specific IgE (allergen identification)
- CXR (to exclude pneumothorax, consolidation)
- Full blood count (eosinophilia in atopic asthma)
- Bronchial provocation testing (methacholine challenge) if spirometry normal

**Management**
Acute Severe Attack (PEFR 33-50%): Salbutamol 5mg nebulized, ipratropium 500mcg, prednisolone 40-50mg oral, O2 to target SpO2 94-98%, CXR, IV magnesium sulphate if poor response
Life-threatening (PEFR <33%): IV magnesium, HDU/ICU, consider intubation

Stepwise (BTS/SIGN):
- Step 1: SABA (salbutamol PRN)
- Step 2: Add low-dose ICS (beclomethasone 200mcg/day)
- Step 3: Add LABA (formoterol/salmeterol) — MART therapy preferred
- Step 4: Increase ICS dose; add LTRA or SR theophylline
- Step 5: Add-on biologics (omalizumab/mepolizumab) for severe eosinophilic asthma

**Drug Treatment**
- Salbutamol (reliever) | 100-200mcg | inhaled (MDI/spacer) | PRN | tachycardia, tremor
- Beclomethasone (ICS) | 100-400mcg | inhaled | BD | oral candidiasis — rinse mouth after
- Budesonide/formoterol | 160/4.5mcg | inhaled | OD-BD (MART) | as per ICS + monitor growth in children
- Montelukast (LTRA) | 10mg | oral | OD | mood changes, nightmares
- Prednisolone (acute) | 40-50mg | oral | OD × 5 days | glucose, BP, GI protection if prolonged
- Magnesium sulphate | 2g IV | IV infusion | single dose in severe attack | BP, respiratory rate

**Clinical Pearls**
- 🔑 "Normal PaCO2 in a severe attack = DANGER" — should be low (hyperventilating); normalization = fatigue, impending failure
- Aspirin/NSAID triad: asthma + nasal polyps + aspirin sensitivity (Samter's triad)
- Inhaler technique review at every visit — poor technique is the #1 cause of uncontrolled asthma
- Over-reliance on SABA (>3 canisters/year) = marker of poorly controlled asthma
- Vocal cord dysfunction mimics asthma — suspect if poor response to bronchodilators

**Red Flags**
🚨 Silent chest (no wheeze) in severe attack = complete obstruction → Emergency
🚨 SpO2 <92% or rising PaCO2 → impending respiratory failure → ICU
🚨 Altered consciousness, cyanosis, exhaustion → intubation risk
🚨 Pneumothorax as complication → urgent chest drain

**Patient Education**
1. Use your preventer inhaler (brown/red) every day even when well — it treats underlying inflammation, not just symptoms
2. Know your action plan: when to increase treatment, when to call for help, and when to go to A&E
3. Identify and avoid your personal triggers — keep a symptom diary to spot patterns
4. Check your inhaler technique with a nurse or pharmacist at every visit — most people use them incorrectly

⚕️ Clinical decisions must always be made by a qualified healthcare professional.`;
  }

  // ── Heart Failure ─────────────────────────────────────────────────────────
  if (lower.includes("heart failure") || lower.includes("cardiac failure") || lower.includes(" hf ") || lower.includes("hfref") || lower.includes("hfpef")) {
    return `**Definition**
Heart failure (HF) is a clinical syndrome in which the heart cannot pump sufficient blood to meet the body's metabolic demands, or can only do so at elevated filling pressures. Classified by ejection fraction: HFrEF (EF <40%), HFmrEF (40-49%), HFpEF (≥50%).

**Causes**
- Most common: Ischaemic heart disease (coronary artery disease), hypertension
- Cardiomyopathies: Dilated (viral/idiopathic), hypertrophic, restrictive, peripartum
- Valvular: Mitral regurgitation, aortic stenosis/regurgitation
- Arrhythmias: AF with rapid ventricular rate (tachycardia-mediated cardiomyopathy)
- High output failure: Anaemia, thyrotoxicosis, Paget's disease, AV fistula, wet beriberi

**Risk Factors**
- Non-modifiable: Age >65, male sex, family history of cardiomyopathy
- Modifiable: Hypertension, diabetes, obesity, coronary artery disease, smoking, alcohol excess, cardiotoxic drugs (anthracyclines, trastuzumab)

**Symptoms**
- Left heart failure: Dyspnea (exertional → orthopnea → PND), fatigue, pulmonary edema
- Right heart failure: Peripheral edema (pitting, ankle→sacrum), JVP elevation, hepatomegaly, ascites
- Both: Fatigue, reduced exercise tolerance, cardiac cachexia
- NYHA classification: I (no limitation) → IV (symptoms at rest)

**Differential Diagnosis**
- Pulmonary disease (COPD/asthma) — wheeze, hyperinflation; normal BNP; spirometry abnormal
- Nephrotic syndrome — massive proteinuria, hypoalbuminaemia, periorbital edema
- Venous insufficiency/lymphedema — non-pitting edema, no orthopnea, normal BNP
- Pericardial effusion/tamponade — JVP↑, muffled sounds, pulsus paradoxus; echo diagnostic
- Hypoalbuminaemia (liver cirrhosis) — signs of liver disease, spider naevi, jaundice

**History Questions**
1. Dyspnea — at rest or on exertion? How many pillows? (orthopnea = LHF)
2. Nocturnal symptoms — paroxysmal nocturnal dyspnea, waking coughing/wheezing?
3. Ankle swelling — unilateral (DVT) vs bilateral (HF)?
4. Precipitating cause — recent MI, viral illness, new drug, dietary indiscretion?
5. NYHA functional class — compare to 3 months ago?
6. Medication compliance — missed doses?
7. Cardiac history — previous MI, valve disease, AF, hypertension?
8. Alcohol consumption and cardiotoxin exposure?

**Physical Examination**
- Vitals: BP (low in decompensated HF), HR, RR, SpO2, weight (trend)
- JVP: Elevated >4cm above sternal angle = right heart failure; hepatojugular reflux
- Cardiovascular: Displaced apex beat (dilated LV), S3 gallop (volume overload), S4 (stiff LV), murmurs (valvular cause)
- Respiratory: Bilateral fine crackles at bases (pulmonary edema); pleural effusion (stony dull percussion)
- Abdomen: Hepatomegaly (pulsatile in TR), ascites (shifting dullness), splenomegaly
- Periphery: Pitting edema (bilateral), warm peripheries (high output) vs cool (low output/cardiogenic shock)

**Investigations**
First-line:
- BNP/NT-proBNP: BNP >100pg/mL or NT-proBNP >300pg/mL suggests HF; level correlates with severity
- ECG: LVH, LBBB, AF, Q waves (old MI), ST changes
- CXR: Cardiomegaly (CTR >0.5), upper lobe diversion, Kerley B lines, bilateral alveolar shadowing ("bat wing"), pleural effusions

Second-line:
- Echocardiography (gold standard): EF, wall motion, valves, diastolic function
- Renal function, electrolytes (pre-ACEi/diuretic), LFTs, TFTs (thyroid cause), CBC, iron studies (iron deficiency in HF → treat)
- 6-minute walk test (functional capacity)
- Cardiac MRI (cardiomyopathy characterization)
- Coronary angiography (revascularizable ischaemic cause)

**Management**
Acute decompensated HF (APE):
- Sit up, O2 to target SpO2 >94%
- IV furosemide 40-80mg (if fluid overloaded)
- GTN infusion (if SBP >100 mmHg)
- CPAP/NIV for respiratory failure
- Identify and treat precipitant (infection, AF, ACS)

Chronic HFrEF (disease-modifying — "ABCDE"):
- ACEi/ARB or ARNI (sacubitril-valsartan)
- Beta-blocker (bisoprolol, carvedilol)
- spironolaCtonE / eplerenone (mineralocorticoid receptor antagonist)
- Dapagliflozin/empagliflozin (SGLT2 inhibitor — DAPA-HF, EMPEROR-Reduced)
- Device: CRT if LBBB + EF <35%; ICD if EF <35%

**Drug Treatment**
- Furosemide | 40mg → 80-240mg | oral/IV | OD-BD | renal function, K+, uric acid
- Ramipril | 1.25mg → 10mg | oral | OD | K+, creatinine, cough
- Bisoprolol | 1.25mg → 10mg | oral | OD | HR, bronchospasm — start LOW, go SLOW
- Spironolactone | 25-50mg | oral | OD | K+, renal function, gynaecomastia
- Dapagliflozin | 10mg | oral | OD | eGFR, UTI, DKA (rare) — hold if unwell
- Sacubitril-valsartan | 24/26mg → 97/103mg | oral | BD | K+, BP, angioedema (avoid with ACEi — washout 36h)

**Clinical Pearls**
- 🔑 "ABCDE" of HFrEF medications — all four pillars have mortality benefit; don't stop at one
- SGLT2 inhibitors reduce HF hospitalizations regardless of diabetes status
- Iron deficiency worsens HF outcomes — check transferrin saturation; IV iron (ferric carboxymaltose) if deficient
- BNP is a guide, not a target — treat the patient, not the number
- HFpEF has no proven mortality-reducing therapies except SGLT2 inhibitors — focus on symptom control and treating comorbidities

**Red Flags**
🚨 Acute pulmonary edema: SpO2 <90% + severe dyspnea → NIV + IV furosemide + ICU
🚨 Cardiogenic shock (SBP <90 + hypoperfusion) → inotropes + urgent revascularization
🚨 Hyperkalemia >6.0 mmol/L on ACEi/MRA → STOP drugs, cardiac monitoring, treat
🚨 Acute deterioration in chronic HF → always look for a precipitant (ACS, infection, AF, non-compliance)

**Patient Education**
1. Weigh yourself every morning before eating — report a gain of >2kg in 2 days to your doctor, as it usually means fluid is building up
2. Limit fluid intake to 1.5-2 litres per day and avoid added salt — excess fluid and salt cause dangerous fluid overload
3. Never stop your heart failure medications without telling your doctor — stopping beta-blockers suddenly can be dangerous
4. Moderate exercise (e.g. supervised cardiac rehabilitation) improves your symptoms and quality of life — rest alone does not

⚕️ Clinical decisions must always be made by a qualified healthcare professional.`;
  }

  // ── Stroke / TIA ──────────────────────────────────────────────────────────
  if (lower.includes("stroke") || lower.includes("tia") || lower.includes("transient ischemic") || lower.includes("cerebrovascular")) {
    return `**Definition**
Stroke is a medical emergency defined as a rapidly developing focal neurological deficit lasting >24 hours (or any duration if imaging shows infarction), caused by vascular disruption. Ischaemic stroke (85%): thrombotic or embolic occlusion. Haemorrhagic stroke (15%): intracerebral or subarachnoid haemorrhage. TIA: transient (<24h) focal neurological deficit with no infarction on imaging.

**Causes**
- Ischaemic (85%): Cardioembolic (AF, valvular disease, recent MI), large vessel atherosclerosis, small vessel (lacunar) disease, cryptogenic
- Haemorrhagic (15%): Hypertension (#1 cause ICH), aneurysm rupture (SAH), AVM, anticoagulation, amyloid angiopathy
- Rarer: Carotid dissection (young patient, neck trauma), vasculitis, antiphospholipid syndrome, sickle cell

**Risk Factors**
- Non-modifiable: Age, male sex, Black/African ethnicity, family history, prior stroke/TIA
- Modifiable: Hypertension (#1), AF, diabetes, hyperlipidemia, smoking, obesity, carotid stenosis, excessive alcohol

**Symptoms**
- FAST: Face drooping, Arm weakness, Speech difficulty, Time to call emergency
- Other: Sudden visual loss (amaurosis fugax = TIA of ophthalmic artery), hemianopia, dysphagia, ataxia, diplopia, vertigo (posterior circulation)
- SAH: "Thunderclap headache" — worst of life, sudden onset, nausea, neck stiffness, photophobia

**Differential Diagnosis**
- Hypoglycemia — always check BM first; focal deficit can mimic stroke; resolves with glucose
- Todd's paresis — post-ictal focal weakness; preceded by witnessed seizure, gradual resolution
- Complex migraine — visual aura, headache; history of migraine; no DWI lesion on MRI
- Space-occupying lesion (tumor/abscess) — gradual onset; papilloedema; systemic features
- Hypertensive encephalopathy — BP >220/120, confusion, no focal deficit, bilateral changes on MRI

**History Questions**
1. Exact time of onset (or "last known well") — crucial for thrombolysis/thrombectomy window
2. Precise nature of deficit (weakness, speech, vision, coordination)?
3. Headache at onset? (suggests haemorrhage or SAH)
4. Any preceding TIA episodes (amaurosis fugax, transient weakness)?
5. AF, valvular heart disease, recent MI?
6. Anticoagulation use? Last dose? INR?
7. Contraindications to thrombolysis (recent surgery, GI bleed, severe hypertension)?
8. Functional baseline (pre-stroke mRS)?

**Physical Examination**
- Neurological: NIHSS score (0-42) — guides thrombolysis and prognosis
- Cranial nerves: gaze deviation, facial droop, dysarthria, dysphagia
- Motor: Pronator drift, limb power (MRC scale), deep tendon reflexes, plantar response
- Sensory: Hemineglect, hemisensory loss
- Cardiovascular: AF (irregular pulse), carotid bruits, BP both arms, cardiac murmurs
- Cerebellar (posterior circulation): Ataxia, nystagmus, past-pointing, HINTS exam (Head Impulse, Nystagmus, Test of Skew)

**Investigations**
First-line (within 15 minutes of arrival):
- Non-contrast CT head: Excludes haemorrhage (before thrombolysis); may be normal in early ischaemic stroke
- Blood glucose (exclude hypoglycemia), FBC, coagulation, group & save
- ECG (AF), 12-lead; continuous cardiac monitoring

Second-line:
- CT angiography (CTA): Identifies large vessel occlusion → guides thrombectomy decision
- MRI DWI (gold standard): Shows ischaemic core within minutes; superior to CT for posterior fossa
- Carotid Doppler/CTA (if anterior circulation TIA/minor stroke) — carotid endarterectomy if >70% stenosis
- Echocardiography (TOE if cardioembolic source suspected)
- Thrombophilia screen (young patient, cryptogenic stroke)
- Holter monitor/implantable loop recorder (paroxysmal AF detection)

**Management**
Acute Ischaemic Stroke:
- thrombolysis window: IV alteplase 0.9mg/kg (max 90mg) within 4.5h of onset (contraindicated if haemorrhage, BP >185/110, INR >1.7, recent major surgery)
- Thrombectomy: Large vessel occlusion → up to 24h if salvageable penumbra on perfusion imaging
- Aspirin 300mg after 24h (not before thrombolysis)
- Admit to Hyperacute Stroke Unit (HASU) — reduces mortality/disability by 20%

TIA (ABCD2 score ≥4 or AF): Dual antiplatelet (aspirin + clopidogrel × 3 weeks), statin, BP control, investigate within 24h

Secondary prevention: Antiplatelet (clopidogrel 75mg) or anticoagulation (DOAC if AF), high-intensity statin, BP target <130/80, lifestyle modification

**Drug Treatment**
- Alteplase | 0.9mg/kg IV (10% bolus, rest over 60min) | IV | once | BP monitoring, neurological deterioration → CT immediately
- Aspirin | 300mg loading, then 75mg | oral | OD (switch to clopidogrel at 2 weeks) | GI bleeding
- Apixaban | 5mg (2.5mg if 2/3 criteria: age ≥80, weight ≤60kg, Cr ≥133) | oral | BD | bleeding — for AF-related stroke
- Atorvastatin | 40-80mg | oral | OD | myalgia, LFTs (high-intensity — reduce recurrence)
- Ramipril | 2.5mg → 10mg | oral | OD | K+, creatinine — BP target <130/80

**Clinical Pearls**
- 🔑 "Time is brain" — ~1.9 million neurons die per minute of untreated stroke; call 999 first
- Always check glucose before diagnosing stroke — hypoglycemia is the #1 stroke mimic
- AF is found in 25% of cryptogenic strokes — 30-day cardiac monitoring changes treatment in many
- HINTS exam (in A&E): + HI (normal VOR) + N (direction-changing nystagmus) + TS (skew deviation) = central cause; refer for MRI urgently
- Never give anticoagulation for 2 weeks after large ischaemic stroke — haemorrhagic transformation risk

**Red Flags**
🚨 Haemorrhagic transformation: Neurological deterioration after thrombolysis → CT immediately → reverse anticoagulation
🚨 Herniation: Declining GCS + pupil asymmetry → CT + neurosurgical emergency
🚨 SAH: Thunderclap headache → CT head → if negative → lumbar puncture for xanthochromia → angiography
🚨 Malignant MCA infarct (>50% MCA territory): Brain swelling at 48-96h → decompressive hemicraniectomy

**Patient Education**
1. Learn FAST — Face drooping, Arm weakness, Speech difficulty, Time to call 999 — and act immediately; even minutes matter
2. Take all your blood-thinning and cholesterol-lowering medicines every day — they cut your risk of a second stroke by up to 80%
3. Control your blood pressure at home — it is the single biggest risk factor for another stroke
4. Rehabilitation begins in hospital and continues at home — daily exercises for speech, movement, and cognition significantly improve recovery

⚕️ Clinical decisions must always be made by a qualified healthcare professional.`;
  }

  // ── Sepsis ────────────────────────────────────────────────────────────────
  if (lower.includes("sepsis") || lower.includes("septic shock") || lower.includes("systemic inflammatory")) {
    return `**Definition**
Sepsis is life-threatening organ dysfunction caused by a dysregulated host response to infection (Sepsis-3, 2016). Defined operationally as suspected infection + SOFA score ≥2. Septic shock: sepsis + vasopressor requirement to maintain MAP ≥65 mmHg + serum lactate >2 mmol/L despite adequate fluid resuscitation (mortality >40%).

**Causes**
- Pulmonary (most common, 40-50%): Pneumonia — S. pneumoniae, Klebsiella, P. aeruginosa, MRSA
- Urinary tract (25%): E. coli, Klebsiella, Enterococcus
- Abdominal (20%): Perforated viscus, cholangitis — E. coli, Bacteroides, Enterococcus
- Skin/Soft tissue: Streptococcus pyogenes, S. aureus (cellulitis, necrotizing fasciitis)
- Central line/IV access: Staphylococcus epidermidis, MRSA, Candida
- Meningococcaemia: Neisseria meningitidis — young adults

**Risk Factors**
- Immunocompromise (HIV, steroids, chemotherapy), extremes of age, diabetes, CKD, liver disease
- Indwelling devices (urinary catheter, central line, VP shunt)
- Recent surgery or invasive procedure
- Chronic wounds, pressure ulcers

**Symptoms**
- Febrile (>38°C) or hypothermic (<36°C), rigors
- Tachycardia (>90 bpm), tachypnea (>20/min), altered mental status
- Warm vasodilated peripheries (early) → cold, clammy, mottled skin (late/shock)
- Source-specific: Dysuria (UTI), productive cough (pneumonia), RUQ pain (cholangitis), neck stiffness (meningitis)

**Differential Diagnosis**
- SIRS from non-infectious cause — pancreatitis, burns, trauma, major surgery; culture-negative
- Anaphylaxis — allergen exposure, urticaria, angioedema, bronchospasm; responds to adrenaline
- Adrenal crisis — known Addison's/steroid use; hyponatremia, hyperkalemia; responds to hydrocortisone
- Pulmonary embolism — tachycardia + hypoxia; D-dimer, CTPA; no fever or positive cultures
- Cardiogenic shock — cool peripheries, high JVP, BNP elevated, no infection source

**History Questions**
1. Source of infection — recent URTI, UTI symptoms, skin wounds, surgical procedures?
2. Time course — hours vs days (rapid = bacteraemia/meningococcaemia)?
3. Immunosuppression — HIV, steroids, chemotherapy, transplant?
4. Indwelling devices — Foley, central line, joint prosthesis?
5. Recent travel (malaria, typhoid, viral haemorrhagic fever)?
6. Last seen well? Collateral history if altered consciousness
7. Medications — PPIs (↑gut infection), NSAIDs (mask fever), antibiotics (recent — guide spectrum)
8. Allergies — especially penicillin?

**Physical Examination**
- Vitals: Temperature, HR, BP, RR, GCS, SpO2, urine output (Foley if shocked)
- Hands: Capillary refill (>2s = poor perfusion), splinter haemorrhages (endocarditis), clubbing
- Skin: Rash (petechiae/purpura = meningococcaemia; maculopapular = typhoid), cellulitis, wound infection
- Cardiovascular: New murmur (endocarditis), muffled sounds (effusion)
- Respiratory: Consolidation (pneumonia), pleuritic rub
- Abdomen: Tenderness (peritonitis), Murphy's sign (cholecystitis), RUQ (cholangitis)
- Neurological: Meningism (neck stiffness, Kernig's, Brudzinski's), GCS

**Investigations**
First-line (within 1 hour — Sepsis Six):
- Blood cultures × 2 sets (peripheral + CVC if present) — before antibiotics
- Serum lactate (>2 = concern; >4 = emergency)
- FBC (leukocytosis or leukopenia), CRP, procalcitonin
- Renal/liver function, coagulation (DIC screen), blood glucose
- Urinalysis and urine MC&S
- CXR (pneumonia, pulmonary edema)

Second-line:
- CT abdomen/pelvis (abdominal source — perforation, abscess)
- Lumbar puncture (if meningism — after CT head, after coagulation correction)
- Echocardiography (endocarditis if persistent bacteraemia)
- Throat swab, wound swab, sputum, pleural fluid as guided by source

**Management**
The Sepsis Six (within 1 hour of recognition):
1. Oxygen — target SpO2 >94% (88-92% if COPD)
2. Blood cultures — before antibiotics
3. IV antibiotics — broad-spectrum, source-guided (piperacillin-tazobactam ± gentamicin)
4. IV fluid resuscitation — 30mL/kg crystalloid (reassess with dynamic fluid responsiveness)
5. Urine output monitoring — target >0.5 mL/kg/hour; catheterize
6. Serum lactate — recheck 2h; if >4 → ICU/HDU

Septic shock: Noradrenaline infusion (vasopressor) if MAP <65 after fluids; ICU admission; source control (drain abscess, remove infected line)

**Drug Treatment**
- Piperacillin-tazobactam | 4.5g | IV | 6-hourly | renal dose-adjust; hepatotoxicity (broad gram-neg/pos)
- Gentamicin | 5mg/kg | IV | once daily | drug levels, renal function, ototoxicity (gram-neg synergy)
- Meropenem | 500mg-1g | IV | 8-hourly | reserve for ESBL/Pseudomonas/severe; carbapenem stewardship
- Vancomycin | 15-20mg/kg | IV | 8-12 hourly (guided by levels) | nephrotoxicity, red man syndrome (MRSA cover)
- Noradrenaline | 0.01-0.5 mcg/kg/min | IV infusion | titrate to MAP ≥65 | HR, BP, peripheral ischaemia
- Hydrocortisone | 200mg/day | IV infusion or 50mg 6-hourly | for refractory septic shock | glucose, BP

**Clinical Pearls**
- 🔑 "Sepsis Six in One Hour" — every hour's delay in antibiotics increases mortality by ~7%
- Lactate >4 mmol/L = cryptic shock even if BP is normal — resuscitate aggressively
- Source control is as important as antibiotics — drain the abscess, remove the infected line
- Procalcitonin: high specificity for bacterial infection; serial PCT guides antibiotic de-escalation (stop if <0.1)
- Meningococcaemia: give IM/IV benzylpenicillin immediately — before transfer, before LP

**Red Flags**
🚨 Non-blanching petechial/purpuric rash + fever → meningococcaemia → IV benzylpenicillin IMMEDIATELY
🚨 Lactate >4 mmol/L → life-threatening tissue hypoperfusion → ICU + aggressive resuscitation
🚨 GCS deterioration → intubation risk; CT head + LP planning
🚨 No response to 30mL/kg fluid + antibiotics → septic shock → vasopressors + ICU

**Patient Education**
1. Sepsis is a medical emergency — if you or a family member has a suspected infection with worsening confusion, extreme breathlessness, or mottled skin, call 999 immediately
2. Complete your prescribed antibiotic course — stopping early increases the risk of the infection returning and becoming resistant
3. Keep your vaccinations up to date — pneumococcal and meningococcal vaccines protect against some of the most common causes of sepsis
4. Report to your doctor immediately if you develop a high temperature after surgery, a medical procedure, or with an indwelling catheter or drain

⚕️ Clinical decisions must always be made by a qualified healthcare professional.`;
  }

  // ── Acute Kidney Injury ────────────────────────────────────────────────────
  if (lower.includes("acute kidney") || lower.includes(" aki ") || lower.includes("acute renal failure") || lower.includes("renal failure")) {
    return `**Definition**
Acute kidney injury (AKI) is an abrupt decline in kidney function defined as: serum creatinine rise ≥26.5 μmol/L in 48h, or ≥1.5× baseline within 7 days, or urine output <0.5 mL/kg/h for ≥6h (KDIGO criteria). Staged I–III by severity; previously called "acute renal failure."

**Causes**
- Pre-renal (55%): Hypovolaemia (haemorrhage, dehydration, vomiting/diarrhoea, burns), cardiogenic shock, hepatorenal syndrome, NSAID/ACEi-induced vasoconstriction
- Intrinsic renal (40%): ATN (ischaemic — #1; nephrotoxic — aminoglycosides, contrast, vancomycin), glomerulonephritis, interstitial nephritis (drugs: NSAIDs, PPIs, antibiotics), rhabdomyolysis
- Post-renal/Obstructive (5%): BPH, ureteric stones, pelvic malignancy, retroperitoneal fibrosis, blocked urinary catheter

**Risk Factors**
- CKD (strongest risk factor), age >65, diabetes, heart failure, liver disease
- Hypovolaemia, sepsis, recent nephrotoxin exposure (contrast, NSAIDs, aminoglycosides)
- Major surgery, cardiac surgery, burns
- Myeloma, haematological malignancies

**Symptoms**
- Often asymptomatic — detected biochemically
- Oliguria/anuria, nocturia (if recovering), haematuria (glomerulonephritis, obstruction)
- Features of uraemia: Nausea, vomiting, confusion, hiccups, pericarditis (friction rub), encephalopathy
- Signs of volume status: Hypotension + dry mucous membranes (pre-renal) vs fluid overload/oedema (oliguric AKI)

**Differential Diagnosis**
- Chronic kidney disease — small kidneys on USS, long-standing elevated creatinine, anaemia of CKD
- AKI-on-CKD — acute deterioration on known CKD; compare to recent baseline creatinine
- Contrast-induced nephropathy — creatinine rises 24-72h post-contrast; usually transient
- Glomerulonephritis — haematuria + proteinuria + hypertension; systemic features (rash, arthralgia)
- Rhabdomyolysis — pigmented urine, very high CK; myalgia, trauma, statins, excess exercise

**History Questions**
1. Fluid intake and output — decreased urine output, dark urine?
2. Recent medications — NSAIDs, ACEi, ARBs, aminoglycosides, contrast, diuretics?
3. Recent illness causing fluid loss — vomiting, diarrhoea, bleeding, fever?
4. Urinary symptoms — difficulty voiding, stream hesitancy (obstruction)?
5. Known CKD, diabetes, hypertension, liver disease?
6. Recent surgery, trauma, crush injury, prolonged immobility?
7. Systemic symptoms — rash, arthralgia, haematuria (glomerulonephritis)?
8. Nephrotoxin exposure — recent CT with contrast, herbal remedies?

**Physical Examination**
- Volume status (crucial for management):
  - Hypovolaemia: Postural BP drop >20 mmHg, dry skin/tongue, low JVP, sunken eyes, reduced skin turgor
  - Fluid overload: Pulmonary crackles, peripheral oedema, elevated JVP, S3
- Bladder: Palpable/percussible (retention → obstruction); catheter check if in situ
- Skin: Rash (vasculitis, drug reaction), livedo (cholesterol emboli), jaundice (hepatorenal)
- Cardiovascular: Pericardial rub (uraemic pericarditis), irregular pulse (hyperkalaemia)

**Investigations**
First-line (immediate):
- Serum creatinine, urea, eGFR (compare to baseline) + electrolytes (K+ — life-threatening if >6)
- ECG (hyperkalaemia: peaked T waves → RBBB → sine wave → VF)
- Urine dipstick (blood + protein = intrinsic; negative = pre/post-renal)
- Bladder scan/USS renal tract (exclude obstruction in all AKI — quick and non-invasive)
- FBC, CRP, blood cultures (if sepsis-associated)

Second-line:
- Urine microscopy (casts: granular = ATN; red cell = glomerulonephritis; white cell = interstitial nephritis)
- Urine Na+ (FeNa <1% = pre-renal; >2% = intrinsic renal)
- Urine protein:creatinine ratio (PCR >300 = significant proteinuria)
- CK (rhabdomyolysis), LFTs, albumin
- Complement C3/C4, ANCA, anti-GBM, ANA, anti-dsDNA, serum immunoglobulins (if glomerulonephritis suspected)
- Renal biopsy (if unexplained intrinsic AKI or suspected glomerulonephritis)

**Management**
STOP nephrotoxins: Withhold NSAIDs, ACEi/ARBs, aminoglycosides, metformin
Treat hyperkalaemia (K+ >6.0 mmol/L):
1. IV calcium gluconate 10mL 10% (membrane stabilization — immediate)
2. Insulin 10 units + 50mL 50% dextrose IV (shifts K+ intracellular — 20 min)
3. Sodium bicarbonate (if acidotic)
4. Calcium resonium (slow excretion — 24-48h)
5. Haemodialysis (refractory hyperkalaemia)

Volume optimization: IV fluids (0.9% NaCl or Hartmann's) in pre-renal AKI; fluid restriction + furosemide in fluid-overloaded intrinsic AKI
Treat precipitant: Sepsis (antibiotics + source control), relieve obstruction (catheter/nephrostomy), stop offending drug

Indications for emergency dialysis (AEIOU):
- A: Acidosis (pH <7.1)
- E: Electrolytes (K+ >6.5 refractory)
- I: Intoxication (dialysable toxin)
- O: Overload (pulmonary oedema refractory to diuretics)
- U: Uraemia (pericarditis, encephalopathy, uraemic bleeding)

**Drug Treatment**
- Calcium gluconate 10% | 10mL | IV | over 2 min; repeat after 5 min if ECG unchanged | BP (cardioprotective in hyperkalaemia — not definitive)
- Insulin (Actrapid) + 50% dextrose | 10 units + 50mL | IV | once; recheck K+ at 60 min | BM monitoring
- Furosemide | 80-250mg | IV | OD-BD | only in volume-overloaded AKI; not for oliguria in hypovolaemia
- Noradrenaline | as per sepsis | IV infusion | in sepsis-associated AKI with shock | MAP target ≥65

**Clinical Pearls**
- 🔑 STOP nephrotoxins first — this is both treatment and prevention; chart review is essential
- Normal creatinine does not mean normal kidney — elderly/malnourished patients have low muscle mass, so creatinine underestimates dysfunction
- Urine output is a vital sign in AKI — oliguria (<0.5 mL/kg/h) must not be ignored on the ward
- ECG before K+ result — peaked T waves may appear before labs return; fatal arrhythmia can precede first treatment
- FeNa is unreliable if the patient has had diuretics; use FEUrea instead (>35% = intrinsic)

**Red Flags**
🚨 K+ >6.5 mmol/L with ECG changes → Cardiac arrest risk → Calcium gluconate IV IMMEDIATELY + emergency dialysis
🚨 Pulmonary oedema not responding to furosemide → Urgent renal dialysis
🚨 Uraemic pericarditis (friction rub) → Dialysis — avoid anticoagulation
🚨 pH <7.1 → Emergency bicarbonate + renal team + dialysis

**Patient Education**
1. Stay well-hydrated — drink plenty of fluids, especially during hot weather, illness, or before procedures involving dye injections
2. Always tell your doctor about all medications you take, including over-the-counter painkillers — ibuprofen and other anti-inflammatories can damage kidneys, especially if you are already on blood pressure medication
3. Follow up with nephrology — some forms of kidney injury can progress to chronic kidney disease without symptoms; regular blood tests are important
4. Avoid contrast scans without discussing kidney protection first — if you have kidney disease, make sure your doctor knows before any CT or angiogram

⚕️ Clinical decisions must always be made by a qualified healthcare professional.`;
  }

  // ── Generic mock with rich content ────────────────────────────────────────
  const topic = message.length > 60 ? message.substring(0, 57) + "…" : message;
  return `**Definition**
${topic} is an important clinical topic studied in MBBS curricula worldwide. This is a sample structured response demonstrating the MedPath AI format. For comprehensive, query-specific clinical content, the live AI backend can be reconnected at any time.

**Causes**
- Primary causes: Disease-specific pathophysiology as described in standard medical references
- Secondary causes: Complications and associated conditions
- Iatrogenic causes: Drug-induced and procedure-related etiologies
- Idiopathic: Cases where no identifiable cause is found despite full workup

**Risk Factors**
- Non-modifiable: Age, sex, genetic predisposition, family history, ethnicity
- Modifiable: Lifestyle factors (smoking, diet, exercise, alcohol), environmental exposures, comorbidities
- Occupational/environmental: Relevant to specific disease mechanisms

**Symptoms**
- Typical presentation: Condition-specific cardinal symptoms and signs
- Atypical presentations: Variations seen in elderly, immunocompromised, and pediatric patients
- Severity indicators: Features that suggest mild, moderate, or severe disease

**Differential Diagnosis**
- Condition A — distinguishing feature: different onset pattern or specific test finding
- Condition B — distinguishing feature: characteristic examination finding or biomarker
- Condition C — distinguishing feature: response to treatment or imaging characteristic
- Condition D — distinguishing feature: demographic or epidemiological clue
- Condition E — distinguishing feature: specific laboratory abnormality

**History Questions**
1. When did symptoms begin and how have they progressed?
2. Are symptoms constant or episodic? Any identifiable triggers?
3. Relevant past medical history and family history?
4. Current medications including OTC drugs, supplements, and recreational substances?
5. Social history: occupation, travel, sexual history (where relevant)?
6. Review of systems for associated features?
7. Previous investigations or treatments for this condition?
8. Impact on daily functioning and quality of life?

**Physical Examination**
- General: Appearance, vital signs, nutritional status, mental status
- System-specific examination: Targeted to the likely diagnosis
- Signs of severity: Features indicating disease complications or systemic involvement
- Signs of comorbidities: Related conditions that may influence management

**Investigations**
First-line:
- Bedside tests: Vital signs, point-of-care glucose, urinalysis, ECG where appropriate
- Blood tests: Full blood count, metabolic panel, inflammatory markers (CRP, ESR)
- Imaging: Chest X-ray or ultrasound as guided by clinical presentation

Second-line:
- Specialized blood tests: Specific antibodies, hormone levels, genetic tests
- Advanced imaging: CT, MRI, or nuclear medicine studies
- Tissue diagnosis: Biopsy where malignancy or specific pathology is suspected
- Functional tests: Spirometry, echocardiography, or other dynamic assessments

**Management**
Immediate: Stabilize the patient — airway, breathing, circulation; treat reversible precipitants
Short-term: Initiate disease-specific therapy; monitor response; manage complications
Long-term: Optimize chronic therapy; secondary prevention; multidisciplinary follow-up; regular monitoring
Non-pharmacological: Lifestyle modification, rehabilitation, dietary changes, patient education

**Drug Treatment**
- First-line agent | standard dose | route | frequency | key monitoring parameter
- Second-line agent | dose range | route | frequency | contraindications and cautions
- Adjunct therapy | as indicated | route | frequency | specific adverse effects to watch for
- Note: Always verify current guidelines and local formularies; doses may vary by indication and patient factors

**Clinical Pearls**
- 🔑 Always approach clinical problems systematically: History → Examination → Investigations → Management
- Classic presentations are well-known; atypical presentations in elderly, diabetics, and immunocompromised patients are where diagnoses are missed
- The most common things occur most commonly — but always have a safety-net for rare but dangerous differentials
- Investigations confirm clinical suspicion — do not investigate without a pre-test probability framework
- Patient communication and shared decision-making improve adherence and outcomes

**Red Flags**
🚨 Haemodynamic instability (BP <90 systolic, HR >120) → immediate resuscitation
🚨 Altered consciousness or GCS decline → urgent neurological assessment and CT head
🚨 Signs of sepsis (fever + tachycardia + confusion) → immediate cultures + IV antibiotics within 1 hour
🚨 Acute chest pain + ECG changes → 12-lead ECG within 10 minutes → activate appropriate pathway

**Patient Education**
1. Understand your diagnosis — ask your doctor to explain what the condition means for your daily life and long-term health
2. Take all prescribed medications as directed — do not stop treatment without consulting your healthcare team, even if you feel well
3. Keep all follow-up appointments — many conditions are best managed with regular monitoring even when symptoms are controlled
4. Know your warning signs — understand which symptoms should prompt an urgent return to hospital or call to your doctor

⚕️ Clinical decisions must always be made by a qualified healthcare professional.`;
}

export default router;
