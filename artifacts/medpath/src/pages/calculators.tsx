import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Activity, Droplets, Brain } from "lucide-react";

/* ─────────────── BMI Calculator ─────────────── */
function BMICalculator() {
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [result, setResult] = useState<{ bmi: number; category: string; color: string; idealMin: number; idealMax: number } | null>(null);

  function calculate() {
    const w = parseFloat(weight);
    const h = parseFloat(height) / 100;
    if (!w || !h || h <= 0) return;
    const bmi = w / (h * h);
    let category = "", color = "";
    if (bmi < 18.5) { category = "Underweight"; color = "bg-blue-100 text-blue-700"; }
    else if (bmi < 25) { category = "Normal weight"; color = "bg-green-100 text-green-700"; }
    else if (bmi < 30) { category = "Overweight"; color = "bg-yellow-100 text-yellow-700"; }
    else if (bmi < 35) { category = "Obese Class I"; color = "bg-orange-100 text-orange-700"; }
    else if (bmi < 40) { category = "Obese Class II"; color = "bg-red-100 text-red-700"; }
    else { category = "Obese Class III"; color = "bg-red-200 text-red-900"; }
    const idealMin = +(18.5 * h * h).toFixed(1);
    const idealMax = +(24.9 * h * h).toFixed(1);
    setResult({ bmi: +bmi.toFixed(1), category, color, idealMin, idealMax });
  }

  const zones = [
    { label: "Under", range: "<18.5", pct: 15, color: "bg-blue-300" },
    { label: "Normal", range: "18.5–24.9", pct: 25, color: "bg-green-400" },
    { label: "Over", range: "25–29.9", pct: 20, color: "bg-yellow-400" },
    { label: "Obese I", range: "30–34.9", pct: 15, color: "bg-orange-400" },
    { label: "Obese II", range: "35–39.9", pct: 13, color: "bg-red-400" },
    { label: "III", range: "≥40", pct: 12, color: "bg-red-600" },
  ];
  const bmiPercent = result ? Math.min(((result.bmi - 10) / 35) * 100, 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="w-4 h-4 text-primary" /> BMI Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Weight (kg)</Label>
            <Input type="number" placeholder="70" value={weight} onChange={e => setWeight(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Height (cm)</Label>
            <Input type="number" placeholder="170" value={height} onChange={e => setHeight(e.target.value)} className="mt-1" />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={calculate} className="flex-1">Calculate BMI</Button>
          <Button variant="outline" onClick={() => { setWeight(""); setHeight(""); setResult(null); }}>Reset</Button>
        </div>
        {result && (
          <div className="space-y-3 pt-1">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">{result.bmi}</div>
              <div className="text-xs text-muted-foreground mb-2">kg/m²</div>
              <Badge className={result.color + " text-sm px-3"}>{result.category}</Badge>
            </div>
            {/* Gauge bar */}
            <div>
              <div className="flex h-3 rounded-full overflow-hidden mb-1">
                {zones.map(z => (
                  <div key={z.label} className={`${z.color}`} style={{ width: `${z.pct}%` }} />
                ))}
              </div>
              <div className="relative h-2">
                <div className="absolute w-2 h-4 bg-foreground rounded-full -top-1 -translate-x-1/2 transition-all" style={{ left: `${bmiPercent}%` }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>10</span><span>18.5</span><span>25</span><span>30</span><span>35</span><span>45</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 bg-muted/50 rounded"><span className="text-xs text-muted-foreground block">Ideal weight range</span><span className="font-medium">{result.idealMin}–{result.idealMax} kg</span></div>
              <div className="p-2 bg-muted/50 rounded"><span className="text-xs text-muted-foreground block">Target BMI</span><span className="font-medium">18.5–24.9</span></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─────────────── Glasgow Coma Scale ─────────────── */
const EYE_OPTIONS = [
  { value: 4, label: "4 — Spontaneous" },
  { value: 3, label: "3 — To voice" },
  { value: 2, label: "2 — To pain" },
  { value: 1, label: "1 — None" },
];
const VERBAL_OPTIONS = [
  { value: 5, label: "5 — Oriented" },
  { value: 4, label: "4 — Confused" },
  { value: 3, label: "3 — Inappropriate words" },
  { value: 2, label: "2 — Incomprehensible" },
  { value: 1, label: "1 — None" },
];
const MOTOR_OPTIONS = [
  { value: 6, label: "6 — Obeys commands" },
  { value: 5, label: "5 — Localizes pain" },
  { value: 4, label: "4 — Withdraws" },
  { value: 3, label: "3 — Abnormal flexion" },
  { value: 2, label: "2 — Extension" },
  { value: 1, label: "1 — None" },
];

function GCSCalculator() {
  const [eye, setEye] = useState<number>(4);
  const [verbal, setVerbal] = useState<number>(5);
  const [motor, setMotor] = useState<number>(6);
  const total = eye + verbal + motor;
  const severity = total >= 13 ? { label: "Mild", color: "bg-green-100 text-green-700" } : total >= 9 ? { label: "Moderate", color: "bg-yellow-100 text-yellow-700" } : { label: "Severe", color: "bg-red-100 text-red-700" };
  const interpretation = total >= 13 ? "Patient is alert or minimally confused. Monitor closely." : total >= 9 ? "Moderate brain injury. Frequent neurological observations required. Consider CT head." : "Severe brain injury. Airway management critical — GCS ≤8, intubate. Urgent CT head and neurosurgical referral.";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" /> Glasgow Coma Scale
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {[
          { label: "Eye Opening (E)", options: EYE_OPTIONS, value: eye, onChange: setEye },
          { label: "Verbal Response (V)", options: VERBAL_OPTIONS, value: verbal, onChange: setVerbal },
          { label: "Motor Response (M)", options: MOTOR_OPTIONS, value: motor, onChange: setMotor },
        ].map(({ label, options, value, onChange }) => (
          <div key={label}>
            <Label className="text-xs">{label}</Label>
            <Select value={String(value)} onValueChange={v => onChange(parseInt(v))}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map(o => (
                  <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        {/* Result */}
        <div className="pt-2 border-t space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              E{eye} + V{verbal} + M{motor} =
            </div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-primary">{total}</span>
              <span className="text-sm text-muted-foreground">/15</span>
            </div>
          </div>
          <Badge className={severity.color + " w-full justify-center py-1 text-sm"}>
            {severity.label} — GCS {total}
          </Badge>
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">{interpretation}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─────────────── Creatinine Clearance ─────────────── */
const CKD_STAGES = [
  { min: 90, label: "G1 — Normal / At Risk", color: "bg-green-100 text-green-700", notes: "No dose adjustment needed for most drugs." },
  { min: 60, label: "G2 — Mildly Reduced", color: "bg-green-100 text-green-700", notes: "No adjustment needed for most drugs. Monitor renally-cleared drugs." },
  { min: 45, label: "G3a — Mildly-Moderately Reduced", color: "bg-yellow-100 text-yellow-700", notes: "Dose-adjust aminoglycosides, digoxin, metformin (use with caution), NSAIDs avoid." },
  { min: 30, label: "G3b — Moderately-Severely Reduced", color: "bg-orange-100 text-orange-700", notes: "Stop metformin. Dose-adjust many antibiotics, anticoagulants. Avoid NSAIDs." },
  { min: 15, label: "G4 — Severely Reduced", color: "bg-red-100 text-red-700", notes: "Significant drug adjustment required. Prepare for RRT. Refer to nephrology." },
  { min: 0, label: "G5 — Kidney Failure (ESRD)", color: "bg-red-200 text-red-900", notes: "Dialysis or transplant. Most renally-cleared drugs contraindicated or require specialist guidance." },
];

function CrClCalculator() {
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [scr, setScr] = useState("");
  const [scrUnit, setScrUnit] = useState<"mgdl" | "umol">("mgdl");
  const [sex, setSex] = useState<"male" | "female">("male");
  const [result, setResult] = useState<{ crcl: number; stage: typeof CKD_STAGES[0] } | null>(null);

  function calculate() {
    const a = parseFloat(age), w = parseFloat(weight), s = parseFloat(scr);
    if (!a || !w || !s) return;
    const scrMgDl = scrUnit === "umol" ? s / 88.4 : s;
    let crcl = ((140 - a) * w) / (72 * scrMgDl);
    if (sex === "female") crcl *= 0.85;
    const stage = CKD_STAGES.find(st => crcl >= st.min) ?? CKD_STAGES[CKD_STAGES.length - 1];
    setResult({ crcl: +crcl.toFixed(1), stage });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" /> Creatinine Clearance
          <span className="text-xs font-normal text-muted-foreground">(Cockcroft-Gault)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Age (years)</Label>
            <Input type="number" placeholder="45" value={age} onChange={e => setAge(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Weight (kg)</Label>
            <Input type="number" placeholder="70" value={weight} onChange={e => setWeight(e.target.value)} className="mt-1" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Serum Creatinine</Label>
          <div className="flex gap-2 mt-1">
            <Input type="number" placeholder="1.0" value={scr} onChange={e => setScr(e.target.value)} />
            <Select value={scrUnit} onValueChange={v => setScrUnit(v as any)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mgdl">mg/dL</SelectItem>
                <SelectItem value="umol">μmol/L</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-xs">Sex</Label>
          <Select value={sex} onValueChange={v => setSex(v as any)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female (×0.85 correction)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button onClick={calculate} className="flex-1">Calculate CrCl</Button>
          <Button variant="outline" onClick={() => { setAge(""); setWeight(""); setScr(""); setResult(null); }}>Reset</Button>
        </div>
        {result && (
          <div className="space-y-3 pt-1 border-t">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">{result.crcl}</div>
              <div className="text-xs text-muted-foreground">mL/min</div>
            </div>
            <Badge className={result.stage.color + " w-full justify-center py-1 text-sm"}>{result.stage.label}</Badge>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground font-semibold mb-1">Drug dosing guidance</p>
              <p className="text-xs">{result.stage.notes}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─────────────── IV Fluid Calculator ─────────────── */
type FluidIndication = "maintenance" | "mild" | "moderate" | "severe" | "burns";

function IVFluidCalculator() {
  const [weight, setWeight] = useState("");
  const [indication, setIndication] = useState<FluidIndication>("maintenance");
  const [tbsa, setTbsa] = useState("");
  const [result, setResult] = useState<{ totalMl: number; rateMlHr: number; type: string; notes: string; extra?: string } | null>(null);

  function hollidaySegar(w: number) {
    if (w <= 10) return w * 100;
    if (w <= 20) return 1000 + (w - 10) * 50;
    return 1500 + (w - 20) * 20;
  }

  function calculate() {
    const w = parseFloat(weight);
    if (!w) return;
    let totalMl = 0, type = "", notes = "", extra = "";
    switch (indication) {
      case "maintenance":
        totalMl = hollidaySegar(w);
        type = "0.9% Normal Saline or Hartmann's solution";
        notes = "Holliday-Segar formula: 100mL/kg (≤10kg) + 50mL/kg (10–20kg) + 20mL/kg (>20kg)";
        break;
      case "mild":
        totalMl = hollidaySegar(w) + w * 50;
        type = "0.9% Normal Saline";
        notes = "Maintenance + 5% deficit (50 mL/kg). Reassess after 4–6 hours.";
        break;
      case "moderate":
        totalMl = hollidaySegar(w) + w * 100;
        type = "0.9% Normal Saline / Hartmann's";
        notes = "Maintenance + 10% deficit (100 mL/kg). Give half deficit in first 8h, rest over 16h.";
        break;
      case "severe":
        totalMl = hollidaySegar(w) + w * 150;
        type = "Hartmann's / 0.9% NS bolus 20mL/kg STAT first";
        notes = "Severe: Bolus 20mL/kg NS first, then replace maintenance + 15% deficit. ICU/HDU management.";
        break;
      case "burns": {
        const tbsaPct = parseFloat(tbsa);
        if (!tbsaPct) { setResult(null); return; }
        const parkland = 4 * w * tbsaPct;
        extra = `First 8h from burn time: ${Math.round(parkland / 2)} mL (${Math.round(parkland / 2 / 8)} mL/hr)\nNext 16h: ${Math.round(parkland / 2)} mL (${Math.round(parkland / 2 / 16)} mL/hr)`;
        totalMl = parkland;
        type = "Lactated Ringer's (Hartmann's)";
        notes = `Parkland formula: 4 × ${w}kg × ${tbsaPct}% TBSA = ${Math.round(parkland)} mL in 24h.`;
        break;
      }
    }
    setResult({ totalMl: Math.round(totalMl), rateMlHr: Math.round(totalMl / 24), type, notes, extra });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Droplets className="w-4 h-4 text-primary" /> IV Fluid Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs">Weight (kg)</Label>
          <Input type="number" placeholder="70" value={weight} onChange={e => setWeight(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Indication</Label>
          <Select value={indication} onValueChange={v => { setIndication(v as FluidIndication); setResult(null); }}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="mild">Mild Dehydration (~5%)</SelectItem>
              <SelectItem value="moderate">Moderate Dehydration (~10%)</SelectItem>
              <SelectItem value="severe">Severe Dehydration (~15%)</SelectItem>
              <SelectItem value="burns">Burns (Parkland Formula)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {indication === "burns" && (
          <div>
            <Label className="text-xs">% Total Body Surface Area Burned</Label>
            <Input type="number" placeholder="20" value={tbsa} onChange={e => setTbsa(e.target.value)} className="mt-1" />
          </div>
        )}
        <div className="flex gap-2">
          <Button onClick={calculate} className="flex-1">Calculate</Button>
          <Button variant="outline" onClick={() => { setWeight(""); setTbsa(""); setResult(null); }}>Reset</Button>
        </div>
        {result && (
          <div className="space-y-3 pt-1 border-t">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-3 bg-primary/5 rounded-lg">
                <div className="text-2xl font-bold text-primary">{result.totalMl.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">mL / 24h</div>
              </div>
              <div className="text-center p-3 bg-primary/5 rounded-lg">
                <div className="text-2xl font-bold text-primary">{result.rateMlHr}</div>
                <div className="text-xs text-muted-foreground">mL / hour</div>
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg space-y-1.5 text-xs">
              <p className="font-semibold text-foreground">Fluid type: {result.type}</p>
              <p className="text-muted-foreground">{result.notes}</p>
              {result.extra && (
                <pre className="font-mono text-xs whitespace-pre-wrap text-muted-foreground mt-2">{result.extra}</pre>
              )}
            </div>
            <p className="text-xs text-muted-foreground italic">⚕️ Always reassess clinically. Adjust for ongoing losses and co-morbidities.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─────────────── Page ─────────────── */
export default function Calculators() {
  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 animate-[fadeIn_0.4s_ease-out]">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Medical Calculators</h1>
          <p className="text-sm text-muted-foreground">Clinical decision support tools for bedside use</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <BMICalculator />
        <GCSCalculator />
        <CrClCalculator />
        <IVFluidCalculator />
      </div>
      <p className="text-xs text-center text-muted-foreground pb-4">
        ⚕️ These calculators are for educational purposes. Always validate results clinically before acting on them.
      </p>
    </div>
  );
}
