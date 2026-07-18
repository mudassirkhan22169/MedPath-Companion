import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Stethoscope } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center px-4">
      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6 text-primary">
        <Stethoscope className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-bold text-gray-900 mb-2">404 - Not Found</h1>
      <p className="text-gray-500 max-w-md mb-8 text-lg">
        We couldn't find the clinical page you're looking for. It may have been moved or deleted.
      </p>
      <Link href="/dashboard">
        <Button size="lg">Return to Dashboard</Button>
      </Link>
    </div>
  );
}
