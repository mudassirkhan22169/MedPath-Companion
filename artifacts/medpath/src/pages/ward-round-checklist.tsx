import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ChevronDown, ChevronRight, Plus, Trash2, Printer, CheckCircle, ClipboardList, User
} from "lucide-react";

interface Investigation { id: string; name: string; result: string; date: string; abnormal: boolean }
interface ExamSystem { normal: boolean; notes: string }
interface Patient {
  id: string;
  name: string; ward: string; consultant: string; date: string;
  // S1 — Identification
  hospitalNum: string; dob: string;
  // S2 — Chief Complaint
  chiefComplaint: string;
  // S3 — History
  hpi: string; pmh: string; meds: string; allergies: string; social: string;
  // S4 — Examination
  exam: { general: ExamSystem; cvs: ExamSystem; resp: ExamSystem; gi: ExamSystem; neuro: ExamSystem };
  // S5 — Investigations
  investigations: Investigation[];
  // S6 — Diagnosis
  workingDx: string; differentials: string[];
  // S7 — Management
  managementPlan: string; managementChecklist: Record<string, boolean>;
  // S8 — Follow-up
  nextReview: string; outstandingTasks: string; dischargeCriteria: string; familyComm: string;
}

const MGMT_ITEMS = [
  "IV access established",
  "IV fluids ordered",
  "Blood tests ordered",
  "Imaging ordered",
  "Specialist consult requested",
  "Prescriptions written",
  "Patient educated",
  "Nursing instructions given",
];

const EXAM_SYSTEMS: Array<{ key: keyof Patient["exam"]; label: string }> = [
  { key: "general", label: "General" },
  { key: "cvs", label: "CVS" },
  { key: "resp", label: "Respiratory" },
  { key: "gi", label: "Gastrointestinal" },
  { key: "neuro", label: "Neurological" },
];

function makePatient(id: string): Patient {
  return {
    id, name: "", ward: "", consultant: "", date: new Date().toISOString().slice(0, 10),
    hospitalNum: "", dob: "",
    chiefComplaint: "",
    hpi: "", pmh: "", meds: "", allergies: "", social: "",
    exam: {
      general: { normal: true, notes: "" },
      cvs: { normal: true, notes: "" },
      resp: { normal: true, notes: "" },
      gi: { normal: true, notes: "" },
      neuro: { normal: true, notes: "" },
    },
    investigations: [],
    workingDx: "", differentials: ["", ""],
    managementPlan: "", managementChecklist: Object.fromEntries(MGMT_ITEMS.map(i => [i, false])),
    nextReview: "", outstandingTasks: "", dischargeCriteria: "", familyComm: "",
  };
}

function sectionProgress(p: Patient): number {
  let done = 0;
  if (p.name && p.hospitalNum && p.ward) done++;
  if (p.chiefComplaint.trim()) done++;
  if (p.hpi.trim() && p.meds.trim()) done++;
  if (Object.values(p.exam).some(e => e.notes.trim() || e.normal)) done++;
  if (p.investigations.length > 0) done++;
  if (p.workingDx.trim()) done++;
  if (p.managementPlan.trim() || Object.values(p.managementChecklist).some(Boolean)) done++;
  if (p.nextReview.trim() || p.outstandingTasks.trim()) done++;
  return done;
}

const STORAGE_KEY = "medpath-ward-round";

function uid() { return Math.random().toString(36).slice(2, 10); }

export default function WardRoundChecklist() {
  const [patients, setPatients] = useState<Patient[]>(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : [makePatient(uid())]; }
    catch { return [makePatient(uid())]; }
  });
  const [activeIdx, setActiveIdx] = useState(0);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ s1: true });

  const save = useCallback((ps: Patient[]) => {
    setPatients(ps);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ps)); } catch {}
  }, []);

  function upd<K extends keyof Patient>(field: K, value: Patient[K]) {
    const copy = [...patients];
    copy[activeIdx] = { ...copy[activeIdx], [field]: value };
    save(copy);
  }

  function updExam(sys: keyof Patient["exam"], part: keyof ExamSystem, value: any) {
    const copy = [...patients];
    copy[activeIdx] = {
      ...copy[activeIdx],
      exam: { ...copy[activeIdx].exam, [sys]: { ...copy[activeIdx].exam[sys], [part]: value } },
    };
    save(copy);
  }

  function addPatient() {
    if (patients.length >= 5) return;
    const np = makePatient(uid());
    save([...patients, np]);
    setActiveIdx(patients.length);
    setOpenSections({ s1: true });
  }

  function removePatient(idx: number) {
    if (patients.length === 1) return;
    const copy = patients.filter((_, i) => i !== idx);
    save(copy);
    setActiveIdx(Math.min(idx, copy.length - 1));
  }

  function addInvestigation() {
    const copy = [...patients];
    copy[activeIdx].investigations = [
      ...copy[activeIdx].investigations,
      { id: uid(), name: "", result: "", date: new Date().toISOString().slice(0, 10), abnormal: false },
    ];
    save(copy);
  }

  function updInv(invId: string, field: keyof Investigation, val: any) {
    const copy = [...patients];
    copy[activeIdx].investigations = copy[activeIdx].investigations.map(i =>
      i.id === invId ? { ...i, [field]: val } : i
    );
    save(copy);
  }

  function removeInv(invId: string) {
    const copy = [...patients];
    copy[activeIdx].investigations = copy[activeIdx].investigations.filter(i => i.id !== invId);
    save(copy);
  }

  function toggleSection(key: string) {
    setOpenSections(p => ({ ...p, [key]: !p[key] }));
  }

  const p = patients[activeIdx];
  const progress = sectionProgress(p);

  function SectionHeader({ id, title, icon }: { id: string; title: string; icon: string }) {
    return (
      <CollapsibleTrigger
        className="flex items-center w-full text-left gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
        onClick={() => toggleSection(id)}
      >
        <span className="text-lg">{icon}</span>
        <span className="font-medium text-sm flex-1">{title}</span>
        {openSections[id] ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </CollapsibleTrigger>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-5 animate-[fadeIn_0.4s_ease-out]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Ward Round Checklist</h1>
            <p className="text-sm text-muted-foreground">Structured patient assessment tool</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 print:hidden">
          <Printer className="w-4 h-4" /> Print
        </Button>
      </div>

      {/* Patient tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 print:hidden">
        {patients.map((pt, idx) => (
          <button
            key={pt.id}
            onClick={() => { setActiveIdx(idx); setOpenSections({ s1: true }); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap transition-colors ${activeIdx === idx ? "bg-primary text-primary-foreground border-primary" : "bg-background border-muted-foreground/20 text-muted-foreground hover:border-primary/50"}`}
          >
            <User className="w-3 h-3" />
            {pt.name || `Patient ${idx + 1}`}
            {idx > 0 && activeIdx === idx && (
              <span onClick={e => { e.stopPropagation(); removePatient(idx); }} className="ml-1 text-primary-foreground/70 hover:text-primary-foreground">✕</span>
            )}
          </button>
        ))}
        {patients.length < 5 && (
          <button onClick={addPatient} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary transition-colors whitespace-nowrap">
            <Plus className="w-3 h-3" /> Add Patient
          </button>
        )}
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(progress / 8) * 100}%` }} />
        </div>
        <span className="text-sm font-medium text-muted-foreground shrink-0">{progress}/8 sections</span>
      </div>

      {/* Sections */}
      <div className="space-y-2">
        {/* S1 Patient Identification */}
        <Card className="overflow-hidden">
          <Collapsible open={openSections.s1}>
            <SectionHeader id="s1" title="1. Patient Identification" icon="🪪" />
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Full Name</Label><Input value={p.name} onChange={e => upd("name", e.target.value)} placeholder="James Okafor" className="mt-1" /></div>
                  <div><Label className="text-xs">Hospital Number</Label><Input value={p.hospitalNum} onChange={e => upd("hospitalNum", e.target.value)} placeholder="UCH/2024/0001" className="mt-1" /></div>
                  <div><Label className="text-xs">Date of Birth</Label><Input type="date" value={p.dob} onChange={e => upd("dob", e.target.value)} className="mt-1" /></div>
                  <div><Label className="text-xs">Ward / Bed</Label><Input value={p.ward} onChange={e => upd("ward", e.target.value)} placeholder="Ward 5, Bed 12" className="mt-1" /></div>
                  <div><Label className="text-xs">Consultant</Label><Input value={p.consultant} onChange={e => upd("consultant", e.target.value)} placeholder="Dr. A. Adeyemi" className="mt-1" /></div>
                  <div><Label className="text-xs">Date</Label><Input type="date" value={p.date} onChange={e => upd("date", e.target.value)} className="mt-1" /></div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* S2 Chief Complaint */}
        <Card className="overflow-hidden">
          <Collapsible open={openSections.s2}>
            <SectionHeader id="s2" title="2. Chief Complaint" icon="💬" />
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4">
                <Textarea value={p.chiefComplaint} onChange={e => upd("chiefComplaint", e.target.value)} placeholder="Describe the main presenting complaint…" className="min-h-[80px]" />
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* S3 History */}
        <Card className="overflow-hidden">
          <Collapsible open={openSections.s3}>
            <SectionHeader id="s3" title="3. History" icon="📋" />
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4 space-y-3">
                {[
                  { field: "hpi" as const, label: "History of Presenting Illness", ph: "Onset, duration, character, associated features…" },
                  { field: "pmh" as const, label: "Past Medical History", ph: "Hypertension, diabetes, previous surgeries…" },
                  { field: "meds" as const, label: "Current Medications", ph: "Drug name, dose, frequency…" },
                  { field: "allergies" as const, label: "Allergies", ph: "Drug, food, other allergies and reactions" },
                  { field: "social" as const, label: "Social History", ph: "Occupation, smoking, alcohol, marital status, home situation…" },
                ].map(({ field, label, ph }) => (
                  <div key={field}>
                    <Label className="text-xs">{label}</Label>
                    <Textarea value={p[field] as string} onChange={e => upd(field, e.target.value)} placeholder={ph} className="mt-1 min-h-[70px]" />
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* S4 Examination */}
        <Card className="overflow-hidden">
          <Collapsible open={openSections.s4}>
            <SectionHeader id="s4" title="4. Examination" icon="🩺" />
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4 space-y-3">
                {EXAM_SYSTEMS.map(({ key, label }) => (
                  <div key={key} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{label}</span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox checked={p.exam[key].normal} onCheckedChange={v => updExam(key, "normal", v)} />
                        <span className="text-xs">{p.exam[key].normal ? <span className="text-green-600">Normal</span> : <span className="text-amber-600">Abnormal</span>}</span>
                      </label>
                    </div>
                    <Input
                      value={p.exam[key].notes}
                      onChange={e => updExam(key, "notes", e.target.value)}
                      placeholder={p.exam[key].normal ? "No abnormalities detected" : "Describe findings…"}
                      className="text-sm"
                    />
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* S5 Investigations */}
        <Card className="overflow-hidden">
          <Collapsible open={openSections.s5}>
            <SectionHeader id="s5" title="5. Investigations" icon="🔬" />
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4 space-y-2">
                {p.investigations.map(inv => (
                  <div key={inv.id} className="grid grid-cols-12 gap-2 items-center">
                    <Input className="col-span-4" placeholder="Test name" value={inv.name} onChange={e => updInv(inv.id, "name", e.target.value)} />
                    <Input className="col-span-4" placeholder="Result" value={inv.result} onChange={e => updInv(inv.id, "result", e.target.value)} />
                    <Input className="col-span-2" type="date" value={inv.date} onChange={e => updInv(inv.id, "date", e.target.value)} />
                    <label className="col-span-1 flex items-center justify-center cursor-pointer" title="Abnormal?">
                      <Checkbox checked={inv.abnormal} onCheckedChange={v => updInv(inv.id, "abnormal", !!v)} />
                    </label>
                    <button onClick={() => removeInv(inv.id)} className="col-span-1 flex items-center justify-center text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {p.investigations.length > 0 && (
                  <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-1">
                    <span className="col-span-4">Test</span><span className="col-span-4">Result</span><span className="col-span-2">Date</span><span className="col-span-1">Abnl</span>
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={addInvestigation} className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add Investigation
                </Button>
                {p.investigations.some(i => i.abnormal) && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {p.investigations.filter(i => i.abnormal).map(i => (
                      <Badge key={i.id} variant="destructive" className="text-xs">{i.name}: {i.result}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* S6 Diagnosis */}
        <Card className="overflow-hidden">
          <Collapsible open={openSections.s6}>
            <SectionHeader id="s6" title="6. Diagnosis" icon="🏥" />
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4 space-y-3">
                <div>
                  <Label className="text-xs">Working Diagnosis</Label>
                  <Input value={p.workingDx} onChange={e => upd("workingDx", e.target.value)} placeholder="Primary diagnosis" className="mt-1" />
                </div>
                {p.differentials.map((d, i) => (
                  <div key={i}>
                    <Label className="text-xs">Differential {i + 1}</Label>
                    <Input value={d} onChange={e => {
                      const ds = [...p.differentials]; ds[i] = e.target.value; upd("differentials", ds);
                    }} placeholder={`Differential diagnosis ${i + 1}`} className="mt-1" />
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* S7 Management */}
        <Card className="overflow-hidden">
          <Collapsible open={openSections.s7}>
            <SectionHeader id="s7" title="7. Management" icon="💊" />
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4 space-y-4">
                <div>
                  <Label className="text-xs">Management Plan</Label>
                  <Textarea value={p.managementPlan} onChange={e => upd("managementPlan", e.target.value)} placeholder="Outline your management plan…" className="mt-1 min-h-[80px]" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MGMT_ITEMS.map(item => (
                    <label key={item} className="flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                      <Checkbox
                        checked={p.managementChecklist[item] ?? false}
                        onCheckedChange={v => upd("managementChecklist", { ...p.managementChecklist, [item]: !!v })}
                      />
                      <span className={`text-sm ${p.managementChecklist[item] ? "line-through text-muted-foreground" : ""}`}>{item}</span>
                    </label>
                  ))}
                </div>
                <div className="text-sm text-muted-foreground">
                  {Object.values(p.managementChecklist).filter(Boolean).length}/{MGMT_ITEMS.length} tasks completed
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* S8 Follow-up */}
        <Card className="overflow-hidden">
          <Collapsible open={openSections.s8}>
            <SectionHeader id="s8" title="8. Follow-up" icon="📅" />
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4 space-y-3">
                <div>
                  <Label className="text-xs">Next Review Date / Time</Label>
                  <Input type="datetime-local" value={p.nextReview} onChange={e => upd("nextReview", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Outstanding Tasks</Label>
                  <Textarea value={p.outstandingTasks} onChange={e => upd("outstandingTasks", e.target.value)} placeholder="Pending results, referrals, procedures…" className="mt-1 min-h-[70px]" />
                </div>
                <div>
                  <Label className="text-xs">Discharge Criteria</Label>
                  <Textarea value={p.dischargeCriteria} onChange={e => upd("dischargeCriteria", e.target.value)} placeholder="Goals required for safe discharge…" className="mt-1 min-h-[70px]" />
                </div>
                <div>
                  <Label className="text-xs">Family Communication</Label>
                  <Input value={p.familyComm} onChange={e => upd("familyComm", e.target.value)} placeholder="Spoken to: name, date, content…" className="mt-1" />
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pb-6 print:hidden">
        <Button variant="outline" onClick={() => window.print()} className="gap-2 flex-1">
          <Printer className="w-4 h-4" /> Print Checklist
        </Button>
        <Button
          variant="outline"
          className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
          onClick={() => { if (confirm("Clear this patient's data?")) { const copy = [...patients]; copy[activeIdx] = makePatient(copy[activeIdx].id); save(copy); }}}
        >
          <Trash2 className="w-4 h-4" /> Clear
        </Button>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .max-w-3xl, .max-w-3xl * { visibility: visible; }
          .max-w-3xl { position: absolute; left: 0; top: 0; width: 100%; }
          [data-collapsible] { display: block !important; }
        }
      `}</style>
    </div>
  );
}
