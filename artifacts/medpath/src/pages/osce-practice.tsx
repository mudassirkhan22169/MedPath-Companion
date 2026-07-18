import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardList, ChevronDown, ChevronRight, Trophy, BookOpen, AlertCircle,
  RefreshCw, Stethoscope, Activity, Clock, CheckCircle, XCircle, TrendingUp
} from "lucide-react";

type AppState = "idle" | "loading" | "case" | "evaluating" | "results";

interface VitalSigns {
  bp: string; hr: string; rr: string; temp: string; spo2: string;
}
interface OsceQuestion {
  number: number; question: string; marks: number; hint: string;
}
interface CaseData {
  title: string; specialty: string; difficulty: string;
  patientInfo: { name: string; age: number; sex: string; occupation: string };
  chiefComplaint: string; historyOfPresentingIllness: string;
  pastMedicalHistory: string; medications: string;
  familyHistory: string; socialHistory: string; systemsReview: string;
  vitalSigns: VitalSigns; examinationFindings: string;
  questions: OsceQuestion[]; totalMarks: number;
}
interface SessionData { id: number; caseData: CaseData; specialty: string }
interface QuestionFeedback {
  number: number; marksAwarded: number; marksAvailable: number;
  feedback: string; modelAnswer: string;
}
interface Feedback {
  totalScore: number; percentage: number; grade: string; overallFeedback: string;
  questionFeedback: QuestionFeedback[];
  strengths: string[]; areasForImprovement: string[];
  keyLearningPoints: string[]; recommendedReading: string[];
}
interface HistoryItem {
  id: number; specialty: string; status: string; score: number | null;
  maxScore: number | null; createdAt: string; title: string;
}

const GRADE_COLORS: Record<string, string> = {
  Distinction: "bg-green-100 text-green-800",
  Pass: "bg-blue-100 text-blue-800",
  Borderline: "bg-yellow-100 text-yellow-800",
  Fail: "bg-red-100 text-red-800",
};
const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "bg-green-100 text-green-700",
  Medium: "bg-yellow-100 text-yellow-700",
  Hard: "bg-red-100 text-red-700",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function OscePractice() {
  const { toast } = useToast();
  const [appState, setAppState] = useState<AppState>("idle");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState("General Medicine");
  const [session, setSession] = useState<SessionData | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [openHints, setOpenHints] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetch("/api/osce/specialties", { credentials: "include" })
      .then(r => r.json())
      .then(data => setSpecialties(Array.isArray(data) ? data : []))
      .catch(() => {});
    fetch("/api/osce/history", { credentials: "include" })
      .then(r => r.json())
      .then(data => setHistory(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  async function generateCase() {
    setAppState("loading");
    setAnswers({});
    setFeedback(null);
    try {
      const res = await fetch("/api/osce/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ specialty: selectedSpecialty }),
      });
      if (!res.ok) throw new Error("Failed to generate case");
      const data = await res.json();
      setSession(data.session);
      setAppState("case");
    } catch {
      toast({ title: "Error", description: "Failed to generate case. Please try again.", variant: "destructive" });
      setAppState("idle");
    }
  }

  async function submitAnswers() {
    if (!session) return;
    const combined = (session.caseData.questions || [])
      .map(q => `Q${q.number}: ${q.question}\n\nAnswer: ${answers[q.number] || "(No answer provided)"}`)
      .join("\n\n---\n\n");
    setAppState("evaluating");
    try {
      const res = await fetch("/api/osce/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId: session.id, studentAnswer: combined }),
      });
      if (!res.ok) throw new Error("Evaluation failed");
      const data = await res.json();
      setFeedback(data.feedback);
      setAppState("results");
      // Refresh history
      fetch("/api/osce/history", { credentials: "include" })
        .then(r => r.json()).then(d => setHistory(Array.isArray(d) ? d : [])).catch(() => {});
    } catch {
      toast({ title: "Error", description: "Evaluation failed. Please try again.", variant: "destructive" });
      setAppState("case");
    }
  }

  const allAnswered = session
    ? (session.caseData.questions || []).every(q => (answers[q.number] || "").trim().length > 10)
    : false;

  if (appState === "idle") {
    return (
      <div className="max-w-4xl mx-auto p-4 space-y-6 animate-[fadeIn_0.4s_ease-out]">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">OSCE Practice</h1>
            <p className="text-sm text-muted-foreground">AI-generated clinical cases with structured feedback and marks</p>
          </div>
        </div>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              <div className="flex-1">
                <label className="text-sm font-medium text-foreground mb-2 block">Select Specialty</label>
                <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(specialties.length > 0 ? specialties : ["General Medicine", "Cardiology", "Pulmonology", "Neurology", "Gastroenterology", "Nephrology", "Endocrinology", "Infectious Disease", "General Surgery", "Pediatrics"]).map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button size="lg" onClick={generateCase} className="w-full sm:w-auto gap-2">
                <Stethoscope className="w-4 h-4" />
                Generate Case
              </Button>
            </div>
          </CardContent>
        </Card>

        {history.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Recent Sessions
            </h2>
            <div className="space-y-2">
              {history.map(h => (
                <Card key={h.id} className="cursor-default">
                  <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{h.title}</p>
                      <p className="text-xs text-muted-foreground">{h.specialty} · {timeAgo(h.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {h.status === "submitted" ? (
                        <Badge className={GRADE_COLORS["Pass"] + " text-xs"}>
                          {h.score}/{h.maxScore}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">In Progress</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {history.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No practice sessions yet</p>
            <p className="text-sm">Generate your first OSCE case above to get started</p>
          </div>
        )}
      </div>
    );
  }

  if (appState === "loading") {
    return (
      <div className="max-w-4xl mx-auto p-4 space-y-4 animate-[fadeIn_0.3s_ease-out]">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <div className="text-center text-muted-foreground text-sm py-4">
          <Activity className="w-5 h-5 mx-auto mb-2 animate-pulse text-primary" />
          Generating clinical case…
        </div>
      </div>
    );
  }

  if (appState === "evaluating") {
    return (
      <div className="max-w-4xl mx-auto p-4 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <TrendingUp className="w-8 h-8 text-primary animate-pulse" />
        </div>
        <h2 className="text-xl font-semibold">Evaluating your answers…</h2>
        <p className="text-muted-foreground text-center text-sm max-w-xs">
          Our AI examiner is reviewing your responses and preparing structured feedback.
        </p>
      </div>
    );
  }

  if (appState === "results" && feedback && session) {
    const cd = session.caseData;
    return (
      <div className="max-w-4xl mx-auto p-4 space-y-6 animate-[fadeIn_0.4s_ease-out]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">OSCE Results</h1>
          </div>
          <Button variant="outline" onClick={() => setAppState("idle")} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Another
          </Button>
        </div>

        {/* Score card */}
        <Card className="border-primary/30">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="text-center">
                <div className="text-5xl font-bold text-primary">{feedback.totalScore}</div>
                <div className="text-muted-foreground text-sm">out of {cd.totalMarks}</div>
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge className={`${GRADE_COLORS[feedback.grade] ?? "bg-gray-100 text-gray-800"} text-sm px-3 py-1`}>
                    {feedback.grade}
                  </Badge>
                  <span className="text-2xl font-semibold">{feedback.percentage}%</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(feedback.percentage, 100)}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">{feedback.overallFeedback}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Per-question feedback */}
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">Question Breakdown</h2>
          {(feedback.questionFeedback || []).map(qf => (
            <Card key={qf.number} className={qf.marksAwarded >= qf.marksAvailable * 0.6 ? "border-green-200" : "border-red-200"}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="font-medium text-sm">Question {qf.number}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {qf.marksAwarded >= qf.marksAvailable * 0.6
                      ? <CheckCircle className="w-4 h-4 text-green-600" />
                      : <XCircle className="w-4 h-4 text-red-500" />}
                    <Badge variant="outline" className="text-xs font-mono">{qf.marksAwarded}/{qf.marksAvailable}</Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{qf.feedback}</p>
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline">
                    <BookOpen className="w-3 h-3" /> Model Answer
                    <ChevronDown className="w-3 h-3" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
                      {qf.modelAnswer}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Strengths & improvements */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm text-green-700">✓ Strengths</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-1">{(feedback.strengths || []).map((s, i) => (
                <li key={i} className="text-sm text-green-800 flex gap-2"><span>·</span>{s}</li>
              ))}</ul>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm text-amber-700">△ Areas to Improve</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-1">{(feedback.areasForImprovement || []).map((s, i) => (
                <li key={i} className="text-sm text-amber-800 flex gap-2"><span>·</span>{s}</li>
              ))}</ul>
            </CardContent>
          </Card>
        </div>

        {/* Learning points */}
        <Card>
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm">🎯 Key Learning Points</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-1.5">{(feedback.keyLearningPoints || []).map((p, i) => (
              <li key={i} className="text-sm flex gap-2"><span className="text-primary font-bold">{i + 1}.</span>{p}</li>
            ))}</ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm">📚 Recommended Reading</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-1">{(feedback.recommendedReading || []).map((r, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2"><span>·</span>{r}</li>
            ))}</ul>
          </CardContent>
        </Card>
      </div>
    );
  }

  // CASE state
  if (appState === "case" && session) {
    const cd = session.caseData;
    return (
      <div className="max-w-4xl mx-auto p-4 space-y-5 animate-[fadeIn_0.4s_ease-out]">
        {/* Case header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{cd.title}</h1>
            <div className="flex flex-wrap gap-2 mt-1">
              <Badge variant="outline">{cd.specialty}</Badge>
              <Badge className={DIFFICULTY_COLORS[cd.difficulty] ?? "bg-gray-100 text-gray-700"}>{cd.difficulty}</Badge>
              <Badge variant="outline">{cd.totalMarks} marks</Badge>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setAppState("idle")} className="shrink-0">✕</Button>
        </div>

        {/* Patient info */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><span className="text-muted-foreground block text-xs">Name</span><span className="font-medium">{cd.patientInfo.name}</span></div>
              <div><span className="text-muted-foreground block text-xs">Age / Sex</span><span className="font-medium">{cd.patientInfo.age}y / {cd.patientInfo.sex}</span></div>
              <div className="col-span-2"><span className="text-muted-foreground block text-xs">Occupation</span><span className="font-medium">{cd.patientInfo.occupation}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="history">
          <TabsList className="w-full overflow-x-auto flex">
            <TabsTrigger value="history" className="flex-1 text-xs sm:text-sm">History</TabsTrigger>
            <TabsTrigger value="vitals" className="flex-1 text-xs sm:text-sm">Vital Signs</TabsTrigger>
            <TabsTrigger value="exam" className="flex-1 text-xs sm:text-sm">Examination</TabsTrigger>
          </TabsList>
          <TabsContent value="history" className="space-y-3 mt-3">
            <div className="p-3 bg-muted/40 rounded-lg">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">Chief Complaint</p>
              <p className="text-sm">{cd.chiefComplaint}</p>
            </div>
            <div className="p-3 bg-muted/40 rounded-lg">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">History of Presenting Illness</p>
              <p className="text-sm">{cd.historyOfPresentingIllness}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-muted/40 rounded-lg">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">Past Medical History</p>
                <p className="text-sm">{cd.pastMedicalHistory}</p>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">Medications</p>
                <p className="text-sm">{cd.medications}</p>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">Family History</p>
                <p className="text-sm">{cd.familyHistory}</p>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">Social History</p>
                <p className="text-sm">{cd.socialHistory}</p>
              </div>
            </div>
            {cd.systemsReview && (
              <div className="p-3 bg-muted/40 rounded-lg">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">Systems Review</p>
                <p className="text-sm">{cd.systemsReview}</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="vitals" className="mt-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Blood Pressure", value: cd.vitalSigns.bp, icon: "🫀" },
                { label: "Heart Rate", value: cd.vitalSigns.hr, icon: "💓" },
                { label: "Respiratory Rate", value: cd.vitalSigns.rr, icon: "🫁" },
                { label: "Temperature", value: cd.vitalSigns.temp, icon: "🌡️" },
                { label: "SpO₂", value: cd.vitalSigns.spo2, icon: "💨" },
              ].map(v => (
                <div key={v.label} className="p-4 bg-muted/40 rounded-xl text-center">
                  <div className="text-2xl mb-1">{v.icon}</div>
                  <div className="font-semibold text-sm">{v.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{v.label}</div>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="exam" className="mt-3">
            <div className="p-4 bg-muted/40 rounded-lg text-sm leading-relaxed">
              {cd.examinationFindings}
            </div>
          </TabsContent>
        </Tabs>

        {/* Questions */}
        <div className="space-y-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            OSCE Questions
          </h2>
          {(cd.questions || []).map(q => (
            <Card key={q.number} className="border-muted">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {q.number}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{q.question}</p>
                    <Badge variant="outline" className="mt-1 text-xs">{q.marks} marks</Badge>
                  </div>
                </div>
                {q.hint && (
                  <Collapsible open={openHints[q.number]} onOpenChange={v => setOpenHints(p => ({ ...p, [q.number]: v }))}>
                    <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2">
                      <AlertCircle className="w-3 h-3" />
                      Hint
                      {openHints[q.number] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <p className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2 mb-2">{q.hint}</p>
                    </CollapsibleContent>
                  </Collapsible>
                )}
                <Textarea
                  placeholder="Type your answer here…"
                  value={answers[q.number] || ""}
                  onChange={e => setAnswers(p => ({ ...p, [q.number]: e.target.value }))}
                  className="min-h-[100px] text-sm"
                />
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-muted-foreground">
                    {(answers[q.number] || "").length} chars
                  </span>
                  {(answers[q.number] || "").trim().length > 10 && (
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="pb-6">
          <Button
            size="lg"
            className="w-full gap-2"
            onClick={submitAnswers}
            disabled={!allAnswered}
          >
            <Trophy className="w-4 h-4" />
            {allAnswered ? "Submit for Evaluation" : "Answer all questions to submit"}
          </Button>
          {!allAnswered && (
            <p className="text-center text-xs text-muted-foreground mt-2">
              Each answer needs at least 10 characters
            </p>
          )}
        </div>
      </div>
    );
  }

  return null;
}
