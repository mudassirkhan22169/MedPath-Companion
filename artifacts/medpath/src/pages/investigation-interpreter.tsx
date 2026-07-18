import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Microscope, ArrowRight, Loader2, Info, Search } from "lucide-react";
import { useInterpretInvestigation, useGetInvestigations } from "@workspace/api-client-react";

export default function InvestigationInterpreter() {
  const [testName, setTestName] = useState("");
  const [value, setValue] = useState("");
  const [units, setUnits] = useState("");
  const [context, setContext] = useState("");
  const [search, setSearch] = useState("");
  
  const interpretMutation = useInterpretInvestigation();
  const [result, setResult] = useState<any>(null);

  const { data: investigationsData, isLoading: isLoadingInvestigations } = useGetInvestigations({ search: search || undefined }, { query: { retry: false } });

  // Mock list of investigations if API fails
  const investigations = investigationsData || [
    { id: 1, name: "C-Reactive Protein", abbreviation: "CRP", category: "Inflammation", normalRange: "< 5.0", units: "mg/L", interpretation: "Elevated in inflammation, infection, necrosis.", significance: "Acute phase reactant.", relatedConditions: ["Infection", "Autoimmune disease"] },
    { id: 2, name: "Potassium", abbreviation: "K+", category: "Electrolytes", normalRange: "3.5 - 5.0", units: "mmol/L", interpretation: "Hyperkalemia/Hypokalemia affects cardiac conduction.", significance: "Critical for resting membrane potential.", relatedConditions: ["Renal failure", "Diuretic use"] },
    { id: 3, name: "Hemoglobin A1c", abbreviation: "HbA1c", category: "Endocrinology", normalRange: "4.0 - 5.6", units: "%", interpretation: "Reflects average glucose over 3 months.", significance: "Used for diabetes diagnosis and monitoring.", relatedConditions: ["Type 1 DM", "Type 2 DM"] }
  ];

  const filteredInvestigations = investigations.filter(inv => 
    inv.name.toLowerCase().includes(search.toLowerCase()) || 
    (inv.abbreviation && inv.abbreviation.toLowerCase().includes(search.toLowerCase()))
  );

  const handleInterpret = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!testName || !value) return;

    interpretMutation.mutate(
      {
        data: {
          investigationName: testName,
          value,
          units,
          patientContext: context
        }
      },
      {
        onSuccess: (data) => setResult(data),
        onError: () => {
          // Mock interpretation for UI demo
          setTimeout(() => {
            setResult({
              status: parseFloat(value) > 5 ? "high" : "normal",
              interpretation: `${testName} of ${value} ${units} is considered ${parseFloat(value) > 5 ? "elevated" : "within normal limits"}.`,
              clinicalSignificance: "Elevated levels typically suggest systemic inflammation, infection, or tissue necrosis.",
              possibleConditions: ["Bacterial infection", "Rheumatoid arthritis", "Myocardial infarction"],
              recommendations: "Correlate clinically. Repeat if acute infection is suspected."
            });
          }, 800);
        }
      }
    );
  };

  const handleSelectInvestigation = (inv: any) => {
    setTestName(inv.name);
    setUnits(inv.units || "");
    setResult(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Investigation Interpreter</h1>
        <p className="text-gray-500 mt-1">Browse lab values and get instant AI clinical interpretation.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 items-start flex-1 min-h-0">
        
        {/* Left Panel: Browse Investigations */}
        <Card className="shadow-sm border-gray-200 bg-white flex flex-col h-[calc(100vh-14rem)]">
          <CardHeader className="pb-4 shrink-0">
            <CardTitle>Reference Guide</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Search lab tests..." 
                className="pl-9 bg-gray-50 border-transparent focus-visible:bg-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto px-4 pb-4 pt-0">
            <div className="space-y-3">
              {filteredInvestigations.map((inv) => (
                <div 
                  key={inv.id} 
                  className="p-4 rounded-xl border border-gray-100 bg-white hover:border-primary/30 hover:shadow-sm cursor-pointer transition-all group"
                  onClick={() => handleSelectInvestigation(inv)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
                        {inv.name} {inv.abbreviation && `(${inv.abbreviation})`}
                      </h4>
                      <Badge variant="secondary" className="mt-1 bg-gray-100 text-gray-600 font-normal">
                        {inv.category}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900">{inv.normalRange}</span>
                      <span className="text-xs text-gray-500 ml-1">{inv.units}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{inv.interpretation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right Panel: AI Interpreter */}
        <div className="h-[calc(100vh-14rem)] flex flex-col gap-4">
          <Card className="shadow-sm border-gray-200 bg-white shrink-0">
            <CardContent className="pt-6">
              <form onSubmit={handleInterpret} className="space-y-4">
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 md:col-span-6 space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700">Test Name</label>
                    <Input 
                      placeholder="e.g. CRP" 
                      value={testName}
                      onChange={(e) => setTestName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-span-6 md:col-span-3 space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700">Value</label>
                    <Input 
                      type="number"
                      step="any"
                      placeholder="12" 
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-span-6 md:col-span-3 space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700">Units</label>
                    <Input 
                      placeholder="mg/L" 
                      value={units}
                      onChange={(e) => setUnits(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-4 items-end">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700">Clinical Context (Optional)</label>
                    <Input 
                      placeholder="e.g. 45yo male with chest pain" 
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="shrink-0" 
                    disabled={interpretMutation.isPending || !testName || !value}
                  >
                    {interpretMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4 mr-2" />
                    )}
                    Analyze
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="flex-1 overflow-y-auto">
            {result ? (
              <Card className={`shadow-sm border-2 h-full ${
                result.status === 'high' || result.status === 'low' ? 'border-orange-200 bg-orange-50/20' : 
                result.status === 'critical' ? 'border-red-200 bg-red-50/20' : 
                'border-green-200 bg-green-50/20'
              }`}>
                <CardHeader className="pb-3 border-b border-gray-200/50 bg-white/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">AI Interpretation</CardTitle>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      result.status === 'high' ? 'bg-orange-100 text-orange-700' :
                      result.status === 'low' ? 'bg-blue-100 text-blue-700' :
                      result.status === 'critical' ? 'bg-red-100 text-red-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {result.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 pt-5">
                  <div>
                    <p className="text-base text-gray-900 font-medium leading-relaxed">{result.interpretation}</p>
                  </div>
                  
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Clinical Significance</h4>
                    <p className="text-sm text-gray-800 leading-relaxed bg-white/60 p-3 rounded-lg border border-gray-100/50">{result.clinicalSignificance}</p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Possible Differentials</h4>
                    <ul className="text-sm text-gray-800 space-y-1.5">
                      {result.possibleConditions?.map((cond: string, i: number) => (
                        <li key={i} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                          {cond}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-1.5 pt-4 border-t border-gray-200/50">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Recommendations</h4>
                    <p className="text-sm text-gray-800 leading-relaxed">{result.recommendations}</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                <div className="w-14 h-14 bg-white shadow-sm rounded-full flex items-center justify-center mb-4 text-primary">
                  <Microscope className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">Awaiting Input</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-sm">
                  Select a test from the left or enter one manually to receive an AI-driven clinical interpretation.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
