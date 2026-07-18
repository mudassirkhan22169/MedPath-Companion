import { useState } from "react";
import { useGetDrugs } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Pill, ShieldAlert, CheckCircle2, Activity, SearchX } from "lucide-react";
import { Drug } from "@workspace/api-client-react/src/generated/api.schemas";

export default function DrugGuide() {
  const [search, setSearch] = useState("");
  
  const { data, isLoading } = useGetDrugs({
    search: search || undefined
  }, {
    query: { retry: false }
  });

  // Mock data fallback
  const displayDrugs: Drug[] = data?.drugs || [
    {
      id: 1,
      name: "Atorvastatin",
      genericName: "Atorvastatin",
      brandNames: ["Lipitor"],
      drugClass: "Statin / HMG-CoA reductase inhibitor",
      mechanism: "Inhibits HMG-CoA reductase, the rate-limiting enzyme in cholesterol synthesis, upregulating LDL receptors.",
      indications: ["Hyperlipidemia", "Prevention of cardiovascular disease"],
      contraindications: ["Active liver disease", "Pregnancy", "Breastfeeding"],
      dosage: "10-80 mg orally once daily.",
      sideEffects: ["Myalgia", "Myopathy", "Rhabdomyolysis", "Elevated transaminases"],
      interactions: ["CYP3A4 inhibitors (e.g., clarithromycin, itraconazole)", "Grapefruit juice"],
      pregnancy: "Contraindicated (Category X).",
      monitoring: "Lipid panel, LFTs (baseline), CPK (if muscle symptoms occur)."
    },
    {
      id: 2,
      name: "Metformin",
      genericName: "Metformin",
      brandNames: ["Glucophage"],
      drugClass: "Biguanide",
      mechanism: "Decreases hepatic glucose production, decreases intestinal absorption of glucose, and improves insulin sensitivity.",
      indications: ["Type 2 Diabetes Mellitus", "PCOS (off-label)"],
      contraindications: ["Severe renal impairment (eGFR < 30)", "Metabolic acidosis"],
      dosage: "500-1000 mg orally twice daily with meals.",
      sideEffects: ["Diarrhea", "Nausea", "Vitamin B12 deficiency", "Lactic acidosis (rare)"],
      interactions: ["Iodinated contrast (temporarily withhold)", "Alcohol"],
      pregnancy: "Generally considered safe (Category B).",
      monitoring: "HbA1c, renal function (eGFR), Vitamin B12 levels."
    }
  ];

  const filteredDrugs = displayDrugs.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.drugClass.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Drug Guide</h1>
          <p className="text-gray-500 mt-1">Pharmacology, indications, and dosages for rapid reference.</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            placeholder="Search medications, classes..." 
            className="pl-9 bg-white border-gray-200"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse shadow-sm border-gray-100 h-64 bg-white" />
          ))}
        </div>
      ) : filteredDrugs.length > 0 ? (
        <div className="grid xl:grid-cols-2 gap-6">
          {filteredDrugs.map((drug) => (
            <Card key={drug.id} className="flex flex-col shadow-sm border-gray-200 overflow-hidden">
              <div className="h-1 w-full bg-rose-500" />
              <CardHeader className="bg-gray-50/50 pb-4 border-b">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Pill className="w-5 h-5 text-rose-500" />
                      <CardTitle className="text-xl font-bold text-gray-900">
                        {drug.name}
                      </CardTitle>
                    </div>
                    <p className="text-sm text-gray-500 font-mono">
                      Generic: {drug.genericName} {drug.brandNames?.length ? `| Brands: ${drug.brandNames.join(", ")}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-white whitespace-nowrap">
                    {drug.drugClass}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x border-b">
                  <div className="p-5 space-y-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">Indications</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {drug.indications.map((ind, i) => <li key={i}>• {ind}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5 space-y-3">
                    <div className="flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">Contraindications</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {drug.contraindications.map((contra, i) => <li key={i}>• {contra}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-5 bg-gray-50/30">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 text-primary rounded shrink-0">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-1">Dosage & Administration</h4>
                      <p className="text-sm text-gray-700">{drug.dosage}</p>
                    </div>
                  </div>
                </div>
                
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-gray-100 border-dashed">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <SearchX className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No medications found</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-md">
            We couldn't find any drugs matching "{search}".
          </p>
        </div>
      )}
    </div>
  );
}
