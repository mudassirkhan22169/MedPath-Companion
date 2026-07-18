import { Router, type IRouter } from "express";

const router: IRouter = Router();

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

async function callAI(
  messages: Array<{ role: string; content: string }>,
  maxTokens = 2000
): Promise<string | null> {
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
        max_completion_tokens: maxTokens,
        messages,
      }),
    });

    if (!response.ok) return null;
    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
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

    const messages = [
      { role: "system", content: systemContent },
      ...(conversationHistory || []).map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const aiReply = await callAI(messages, 2000);

    if (aiReply) {
      res.json({ reply: aiReply, sources: [] });
      return;
    }

    // Fallback: structured rule-based responses
    const reply = generateStructuredFallback(message);
    res.json({ reply, sources: [] });
  } catch {
    const reply = generateStructuredFallback(message);
    res.json({ reply, sources: [] });
  }
});

function generateStructuredFallback(message: string): string {
  const lower = message.toLowerCase();

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

  // Generic structured fallback
  return `**Definition**
Your query about "${message}" relates to an important clinical topic. Please connect the app to an AI service (enter your OpenAI API key in settings) for a complete, structured answer.

**Causes**
Detailed causes analysis requires AI integration. Please add your API key for full clinical content.

**Risk Factors**
See reference: Harrison's Principles of Internal Medicine, Davidson's Clinical Medicine, or UpToDate.

**Symptoms**
—

**Differential Diagnosis**
—

**History Questions**
—

**Physical Examination**
—

**Investigations**
—

**Management**
—

**Drug Treatment**
—

**Clinical Pearls**
🔑 For complete clinical content with all 13 sections, please add your OpenAI API key in the app settings.

**Red Flags**
For urgent clinical guidance, always consult a senior clinician or specialist.

**Patient Education**
Always direct patients to their treating physician for specific advice.

⚕️ Clinical decisions must always be made by a qualified healthcare professional.`;
}

export default router;
