import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Stethoscope, ArrowRight, Shield, Zap, Search, BookOpen } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b bg-white/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
            <Stethoscope className="w-6 h-6" />
            <span>MedPath</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Log in
            </Link>
            <Link href="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center animate-in fade-in slide-up duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-8">
            <Zap className="w-4 h-4" />
            <span>The intelligent clinical companion for medical students</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-8 max-w-4xl mx-auto leading-tight">
            Build clinical confidence with <span className="text-primary">precision.</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Not just another study app. MedPath is a focused, authoritative clinical companion that feels like having a brilliant senior resident in your pocket.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto text-base h-12 px-8">
                Start learning for free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-base h-12 px-8">
                Sign in to your account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything you need on the ward</h2>
            <p className="text-gray-600 text-lg">Designed for speed, clarity, and clinical accuracy.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Shield}
              title="Disease & Drug Library"
              description="Comprehensive, structured information on diseases and medications, strictly organized for quick clinical reference."
              delay="stagger-1"
            />
            <FeatureCard 
              icon={Search}
              title="Investigation Interpreter"
              description="Input lab values and instantly receive differential diagnoses, clinical significance, and next steps."
              delay="stagger-2"
            />
            <FeatureCard 
              icon={BookOpen}
              title="AI Clinical Assistant"
              description="Ask complex clinical questions and get detailed, structured medical answers backed by accurate medical knowledge."
              delay="stagger-3"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, delay }: { icon: any, title: string, description: string, delay: string }) {
  return (
    <div className={`bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow animate-in fade-in slide-up ${delay}`}>
      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-6">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}
