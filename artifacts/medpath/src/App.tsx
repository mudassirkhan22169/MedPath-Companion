import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AuthProvider, ProtectedRoute } from '@/components/auth-provider';
import { AppLayout } from '@/components/layout';

import Landing from '@/pages/landing';
import Login from '@/pages/login';
import Register from '@/pages/register';
import Dashboard from '@/pages/dashboard';
import AiAssistant from '@/pages/ai-assistant';
import DiseaseLibrary from '@/pages/disease-library';
import DrugGuide from '@/pages/drug-guide';
import InvestigationInterpreter from '@/pages/investigation-interpreter';
import Notes from '@/pages/notes';
import Profile from '@/pages/profile';

const queryClient = new QueryClient();

function ProtectedRoutes() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <Switch>
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/ai-assistant" component={AiAssistant} />
          <Route path="/disease-library" component={DiseaseLibrary} />
          <Route path="/drug-guide" component={DrugGuide} />
          <Route path="/investigation-interpreter" component={InvestigationInterpreter} />
          <Route path="/notes" component={Notes} />
          <Route path="/profile" component={Profile} />
          <Route component={NotFound} />
        </Switch>
      </AppLayout>
    </ProtectedRoute>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {/* Fallback to protected routes for anything else */}
      <Route component={ProtectedRoutes} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AuthProvider>
            <Router />
            <Toaster />
          </AuthProvider>
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
