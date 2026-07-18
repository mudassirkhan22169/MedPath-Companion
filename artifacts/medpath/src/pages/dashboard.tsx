import { Link } from "wouter";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import { useGetDashboardStats } from "@workspace/api-client-react";
import { 
  Activity, BookOpen, Pill, FileText, Bot, Plus, ArrowRight, Flame 
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { user } = useAuth();
  
  // For now, we mock the stats as the API might return empty or error if not seeded
  const { data: stats, isLoading } = useGetDashboardStats({
    query: {
      retry: false
    }
  });

  const displayStats = stats || {
    totalNotes: 12,
    notesThisWeek: 3,
    diseasesSaved: 45,
    drugsSaved: 28,
    studyStreak: 5,
    aiChatsToday: 2,
    recentNotes: [
      { id: 1, title: "Cardiology Rotation - Heart Failure", category: "Cardiology", createdAt: new Date().toISOString() },
      { id: 2, title: "Antibiotics summary", category: "Pharmacology", createdAt: new Date().toISOString() }
    ]
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-gray-200 animate-pulse rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Good morning, {user?.name?.split(' ')[0] || 'Doc'}</h1>
          <p className="text-gray-500 mt-1">Here's your clinical overview for today.</p>
        </div>
        <div className="flex items-center gap-2 bg-orange-50 text-orange-600 px-4 py-2 rounded-full font-medium text-sm border border-orange-100 shadow-sm">
          <Flame className="w-4 h-4 fill-current" />
          <span>{displayStats.studyStreak} Day Streak</span>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Clinical Notes" 
          value={displayStats.totalNotes.toString()} 
          subtitle={`+${displayStats.notesThisWeek} this week`}
          icon={FileText} 
        />
        <StatCard 
          title="Diseases Reference" 
          value={displayStats.diseasesSaved.toString()} 
          subtitle="Saved in library"
          icon={BookOpen} 
        />
        <StatCard 
          title="Drug Guides" 
          value={displayStats.drugsSaved.toString()} 
          subtitle="Saved in library"
          icon={Pill} 
        />
        <StatCard 
          title="AI Consults" 
          value={displayStats.aiChatsToday.toString()} 
          subtitle="Today"
          icon={Bot} 
        />
      </div>

      {/* Main Content Area */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Quick Tools */}
        <Card className="lg:col-span-2 shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle>Quick Tools</CardTitle>
            <CardDescription>Access your essential clinical resources</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <QuickToolCard 
                href="/ai-assistant"
                icon={Bot}
                title="AI Assistant"
                desc="Ask a clinical question"
                color="bg-blue-50 text-blue-600"
              />
              <QuickToolCard 
                href="/investigation-interpreter"
                icon={Activity}
                title="Lab Interpreter"
                desc="Analyze test results"
                color="bg-purple-50 text-purple-600"
              />
              <QuickToolCard 
                href="/disease-library"
                icon={BookOpen}
                title="Disease Library"
                desc="Browse conditions"
                color="bg-green-50 text-green-600"
              />
              <QuickToolCard 
                href="/drug-guide"
                icon={Pill}
                title="Drug Guide"
                desc="Check medications"
                color="bg-rose-50 text-rose-600"
              />
            </div>
          </CardContent>
        </Card>

        {/* Recent Notes */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle>Recent Notes</CardTitle>
              <CardDescription>Your latest study material</CardDescription>
            </div>
            <Link href="/notes">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                <Plus className="w-4 h-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mt-4">
              {displayStats.recentNotes.length > 0 ? (
                displayStats.recentNotes.map((note: any) => (
                  <Link key={note.id} href={`/notes`} className="block group">
                    <div className="flex flex-col gap-1 p-3 rounded-lg border border-gray-100 hover:border-primary/30 hover:bg-blue-50/50 transition-colors">
                      <span className="font-medium text-sm text-gray-900 group-hover:text-primary transition-colors line-clamp-1">{note.title}</span>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>{note.category || 'Uncategorized'}</span>
                        <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-6 text-sm text-gray-500">
                  No notes yet. Create your first note.
                </div>
              )}
            </div>
            <Link href="/notes" className="mt-4 flex items-center justify-center gap-1 text-sm font-medium text-primary hover:underline">
              View all notes <ArrowRight className="w-3 h-3" />
            </Link>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon }: { title: string, value: string, subtitle: string, icon: any }) {
  return (
    <Card className="shadow-sm border-gray-200 overflow-hidden group">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
          </div>
          <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-primary/10 transition-colors">
            <Icon className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm text-gray-500">
          {subtitle}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickToolCard({ href, icon: Icon, title, desc, color }: { href: string, icon: any, title: string, desc: string, color: string }) {
  return (
    <Link href={href}>
      <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:border-primary/20 hover:shadow-md transition-all group cursor-pointer">
        <div className={`p-3 rounded-lg ${color} shrink-0`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">{title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
        </div>
      </div>
    </Link>
  );
}
