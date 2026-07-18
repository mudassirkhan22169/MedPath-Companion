import { Link } from "wouter";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import { useGetDashboardStats } from "@workspace/api-client-react";
import {
  Activity, BookOpen, Pill, FileText, Bot, Plus, ArrowRight, Flame,
  Clock, ClipboardList, Bookmark, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useGetDashboardStats({ query: { retry: false } });

  const displayStats = stats ?? {
    totalNotes: 0, notesThisWeek: 0,
    diseasesSaved: 0, drugsSaved: 0,
    bookmarksCount: 0, osceSessionsCount: 0,
    studyStreak: 0, aiChatsToday: 0,
    recentNotes: [], recentSearches: [], recentOsce: [],
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 animate-pulse rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-[fadeIn_0.4s_ease-out]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Good morning, {user?.name?.split(" ")[0] || "Doc"}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Here's your clinical overview for today.</p>
        </div>
        <div className="flex items-center gap-2 bg-orange-50 text-orange-600 px-4 py-2 rounded-full font-medium text-sm border border-orange-100 shadow-sm w-fit">
          <Flame className="w-4 h-4 fill-current" />
          <span>{displayStats.studyStreak ?? 0} Day Streak</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard title="Clinical Notes" value={String(displayStats.totalNotes ?? 0)} subtitle={`+${displayStats.notesThisWeek ?? 0} this week`} icon={FileText} />
        <StatCard title="AI Consults" value={String(displayStats.aiChatsToday ?? 0)} subtitle="Total searches" icon={Bot} />
        <StatCard title="Bookmarks" value={String((displayStats as any).bookmarksCount ?? 0)} subtitle="Saved items" icon={Bookmark} />
        <StatCard title="OSCE Sessions" value={String((displayStats as any).osceSessionsCount ?? 0)} subtitle="Practice cases" icon={ClipboardList} />
      </div>

      {/* Quick Tools */}
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Tools</CardTitle>
          <CardDescription className="text-xs">Jump straight into your clinical resources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <QuickToolCard href="/ai-assistant" icon={Bot} title="AI Assistant" desc="Ask a question" color="bg-blue-50 text-blue-600" />
            <QuickToolCard href="/osce-practice" icon={ClipboardList} title="OSCE Practice" desc="Clinical cases + AI feedback" color="bg-violet-50 text-violet-600" />
            <QuickToolCard href="/calculators" icon={Activity} title="Calculators" desc="BMI, GCS, CrCl, Fluids" color="bg-teal-50 text-teal-600" />
            <QuickToolCard href="/disease-library" icon={BookOpen} title="Disease Library" desc="Browse conditions" color="bg-green-50 text-green-600" />
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity — 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Recent Notes */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm">Recent Notes</CardTitle>
            </div>
            <Link href="/notes">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {(displayStats.recentNotes ?? []).length > 0 ? (
              <div className="space-y-2">
                {(displayStats.recentNotes as any[]).slice(0, 4).map((note: any) => (
                  <Link key={note.id} href="/notes" className="block">
                    <div className="p-2.5 rounded-lg border border-gray-100 hover:border-primary/30 hover:bg-blue-50/50 transition-colors">
                      <p className="font-medium text-xs text-gray-900 line-clamp-1">{note.title}</p>
                      <div className="flex justify-between items-center mt-1 gap-1">
                        <Badge variant="outline" className="text-[10px] py-0 h-4">{note.category || "General"}</Badge>
                        <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(note.updatedAt || note.createdAt)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
                <Link href="/notes" className="flex items-center justify-center gap-1 text-xs font-medium text-primary hover:underline pt-1">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-gray-400">
                <FileText className="w-6 h-6 mx-auto mb-2 opacity-30" />
                No notes yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent AI Searches */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm">Recent Searches</CardTitle>
            </div>
            <Link href="/ai-assistant">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary">
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {((displayStats as any).recentSearches ?? []).length > 0 ? (
              <div className="space-y-2">
                {((displayStats as any).recentSearches as any[]).slice(0, 5).map((s: any) => (
                  <Link key={s.id} href="/ai-assistant" className="block">
                    <div className="p-2.5 rounded-lg border border-gray-100 hover:border-primary/30 hover:bg-blue-50/50 transition-colors">
                      <p className="text-xs text-gray-800 line-clamp-1">{s.query}</p>
                      <div className="flex justify-between items-center mt-1">
                        <Badge variant="outline" className="text-[10px] py-0 h-4 capitalize">{s.type}</Badge>
                        <span className="text-[10px] text-gray-400">{timeAgo(s.createdAt)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
                <Link href="/ai-assistant" className="flex items-center justify-center gap-1 text-xs font-medium text-primary hover:underline pt-1">
                  Open AI Assistant <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-gray-400">
                <Bot className="w-6 h-6 mx-auto mb-2 opacity-30" />
                No searches yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent OSCE Sessions */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm">OSCE Sessions</CardTitle>
            </div>
            <Link href="/osce-practice">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {((displayStats as any).recentOsce ?? []).length > 0 ? (
              <div className="space-y-2">
                {((displayStats as any).recentOsce as any[]).slice(0, 4).map((o: any) => (
                  <Link key={o.id} href="/osce-practice" className="block">
                    <div className="p-2.5 rounded-lg border border-gray-100 hover:border-primary/30 hover:bg-blue-50/50 transition-colors">
                      <p className="text-xs font-medium text-gray-800 line-clamp-1">{o.title}</p>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[10px] text-gray-500">{o.specialty}</span>
                        <span className="text-[10px] font-medium text-primary">
                          {o.status === "submitted" && o.score != null ? `${o.score}/${o.maxScore}` : "In progress"}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
                <Link href="/osce-practice" className="flex items-center justify-center gap-1 text-xs font-medium text-primary hover:underline pt-1">
                  Practice more <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-gray-400">
                <ClipboardList className="w-6 h-6 mx-auto mb-2 opacity-30" />
                No OSCE sessions yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* More quick tools row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QuickToolCard href="/investigation-interpreter" icon={Activity} title="Lab Interpreter" desc="Analyze test results" color="bg-purple-50 text-purple-600" />
        <QuickToolCard href="/drug-guide" icon={Pill} title="Drug Guide" desc="Medications & dosing" color="bg-rose-50 text-rose-600" />
        <QuickToolCard href="/ward-round-checklist" icon={ClipboardList} title="Ward Round" desc="Structured checklist" color="bg-amber-50 text-amber-600" />
        <QuickToolCard href="/notes" icon={FileText} title="My Notes" desc="Clinical study notes" color="bg-sky-50 text-sky-600" />
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon }: { title: string; value: string; subtitle: string; icon: any }) {
  return (
    <Card className="shadow-sm border-gray-200 overflow-hidden group">
      <CardContent className="p-4 sm:p-5">
        <div className="flex justify-between items-start">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-gray-500 truncate">{title}</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
          </div>
          <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-primary/10 transition-colors shrink-0">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-primary transition-colors" />
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500 truncate">{subtitle}</div>
      </CardContent>
    </Card>
  );
}

function QuickToolCard({ href, icon: Icon, title, desc, color }: { href: string; icon: any; title: string; desc: string; color: string }) {
  return (
    <Link href={href}>
      <div className="flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-gray-100 bg-white hover:border-primary/20 hover:shadow-md transition-all group cursor-pointer">
        <div className={`p-2 sm:p-2.5 rounded-lg ${color} shrink-0`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors text-xs sm:text-sm truncate">{title}</h3>
          <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 line-clamp-1">{desc}</p>
        </div>
      </div>
    </Link>
  );
}
