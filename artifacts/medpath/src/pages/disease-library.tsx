import { useState } from "react";
import { useGetDiseases } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Stethoscope, FileText, AlertCircle, SearchX } from "lucide-react";
import { Disease } from "@workspace/api-client-react/src/generated/api.schemas";

export default function DiseaseLibrary() {
  const [search, setSearch] = useState("");
  
  const { data, isLoading } = useGetDiseases({
    search: search || undefined
  }, {
    query: {
      retry: false
    }
  });

  // Mock data fallback
  const displayDiseases: Disease[] = data?.diseases || [
    {
      id: 1,
      name: "Myocardial Infarction",
      category: "Cardiology",
      icdCode: "I21",
      description: "Myocardial necrosis resulting from acute obstruction of a coronary artery.",
      symptoms: ["Chest pain", "Shortness of breath", "Diaphoresis", "Nausea"],
      causes: ["Atherosclerosis", "Coronary artery spasm"],
      riskFactors: ["Smoking", "Hypertension", "Diabetes", "Dyslipidemia"],
      diagnosis: "ECG (STEMI/NSTEMI), Cardiac biomarkers (Troponin).",
      investigations: ["ECG", "Troponin I/T", "Echocardiogram", "Coronary angiography"],
      treatment: "MONA (Morphine, Oxygen, Nitroglycerin, Aspirin), PCI, Thrombolytics.",
      complications: ["Arrhythmias", "Heart failure", "Cardiogenic shock"]
    },
    {
      id: 2,
      name: "Type 2 Diabetes Mellitus",
      category: "Endocrinology",
      icdCode: "E11",
      description: "A chronic metabolic disorder characterized by insulin resistance and relative insulin deficiency.",
      symptoms: ["Polyuria", "Polydipsia", "Polyphagia", "Weight loss", "Fatigue"],
      causes: ["Insulin resistance", "Beta-cell dysfunction"],
      riskFactors: ["Obesity", "Sedentary lifestyle", "Family history", "Age"],
      diagnosis: "Fasting plasma glucose ≥ 126 mg/dL, HbA1c ≥ 6.5%.",
      investigations: ["Fasting glucose", "HbA1c", "Lipid profile", "Urine albumin"],
      treatment: "Lifestyle modifications, Metformin, SGLT2 inhibitors, GLP-1 RAs.",
      complications: ["Neuropathy", "Nephropathy", "Retinopathy", "Cardiovascular disease"]
    }
  ];

  // Client side filtering for demo if search isn't working via API
  const filteredDiseases = displayDiseases.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Disease Library</h1>
          <p className="text-gray-500 mt-1">Comprehensive clinical reference for conditions and management.</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            placeholder="Search diseases, categories..." 
            className="pl-9 bg-white border-gray-200"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse shadow-sm border-gray-100">
              <CardHeader className="space-y-2">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredDiseases.length > 0 ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredDiseases.map((disease) => (
            <Card key={disease.id} className="flex flex-col shadow-sm border-gray-200 hover:shadow-md transition-shadow group overflow-hidden">
              <div className="h-1 w-full bg-blue-500" />
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1.5">
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none font-medium">
                      {disease.category}
                    </Badge>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors line-clamp-1">
                      {disease.name}
                    </CardTitle>
                  </div>
                  {disease.icdCode && (
                    <span className="text-xs font-mono px-2 py-1 bg-gray-100 text-gray-600 rounded">
                      {disease.icdCode}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <p className="text-sm text-gray-600 line-clamp-3">
                  {disease.description}
                </p>
                
                <div className="pt-4 border-t space-y-3">
                  <div className="flex gap-2">
                    <Stethoscope className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-gray-900 block mb-1">Key Symptoms</span>
                      <div className="flex flex-wrap gap-1">
                        {disease.symptoms.slice(0, 3).map(s => (
                          <span key={s} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{s}</span>
                        ))}
                        {disease.symptoms.length > 3 && (
                          <span className="text-[10px] text-gray-400 px-1.5 py-0.5">+{disease.symptoms.length - 3}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-gray-900 block mb-1">Diagnosis</span>
                      <p className="text-xs text-gray-600 line-clamp-2">{disease.diagnosis}</p>
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
          <h3 className="text-lg font-semibold text-gray-900">No diseases found</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-md">
            We couldn't find any conditions matching "{search}". Try checking your spelling or use different keywords.
          </p>
        </div>
      )}
    </div>
  );
}
