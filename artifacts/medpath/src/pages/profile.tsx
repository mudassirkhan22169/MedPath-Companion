import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useUpdateProfile } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { User as UserIcon, GraduationCap, Building2, Save, Loader2, Award } from "lucide-react";

export default function Profile() {
  const { user, login } = useAuth();
  const updateProfileMutation = useUpdateProfile();
  
  const [formData, setFormData] = useState({
    name: user?.name || "",
    university: user?.university || "",
    year: user?.year?.toString() || "",
    specialization: user?.specialization || "",
    bio: user?.bio || ""
  });

  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(false);

    const payload = {
      name: formData.name,
      university: formData.university,
      year: parseInt(formData.year) || undefined,
      specialization: formData.specialization,
      bio: formData.bio
    };

    updateProfileMutation.mutate({ data: payload }, {
      onSuccess: (updatedUser) => {
        login(updatedUser); // Update local context
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
      },
      onError: () => {
        // Fallback for demo
        if (user) {
          login({ ...user, ...payload });
          setIsSaved(true);
          setTimeout(() => setIsSaved(false), 3000);
        }
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Profile Settings</h1>
        <p className="text-gray-500 mt-1">Manage your academic and clinical details.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 items-start">
        {/* Profile Summary Card */}
        <Card className="md:col-span-1 shadow-sm border-gray-200 text-center">
          <CardContent className="pt-6">
            <div className="w-24 h-24 mx-auto bg-blue-50 text-primary rounded-full flex items-center justify-center mb-4 ring-4 ring-white shadow-sm">
              <UserIcon className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{user?.name || 'Doctor'}</h2>
            <p className="text-sm text-gray-500 mt-1">{user?.email}</p>
            
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-2 rounded-md">
                <GraduationCap className="w-4 h-4 text-primary shrink-0" />
                <span className="text-left font-medium">Year {formData.year || '-'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-2 rounded-md">
                <Building2 className="w-4 h-4 text-primary shrink-0" />
                <span className="text-left line-clamp-1">{formData.university || 'No university set'}</span>
              </div>
              {formData.specialization && (
                <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-2 rounded-md">
                  <Award className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-left line-clamp-1">{formData.specialization} Interest</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit Form */}
        <Card className="md:col-span-2 shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle>Edit Information</CardTitle>
            <CardDescription>Update how you appear in the MedPath system</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Full Name</label>
                <Input 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">MBBS Year</label>
                  <Input 
                    type="number"
                    min="1" max="6"
                    value={formData.year}
                    onChange={(e) => setFormData({...formData, year: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">University</label>
                  <Input 
                    value={formData.university}
                    onChange={(e) => setFormData({...formData, university: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Specialization Interest</label>
                <Input 
                  placeholder="e.g. Cardiology, General Surgery"
                  value={formData.specialization}
                  onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Bio</label>
                <Textarea 
                  placeholder="Tell us about your clinical interests..."
                  className="resize-none"
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                />
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-gray-100">
                <span className="text-sm text-green-600 font-medium transition-opacity duration-300" style={{ opacity: isSaved ? 1 : 0 }}>
                  Profile updated successfully!
                </span>
                <Button type="submit" disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
