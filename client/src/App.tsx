import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import TaskView from "./pages/TaskView";
import ParentDashboard from "./pages/ParentDashboard";
import ParentSettings from "./pages/ParentSettings";
import ParentReview from "./pages/ParentReview";

function Router() {
  return (
    <Switch>
      {/* Kids routes */}
      <Route path="/" component={Home} />
      <Route path="/tasks/:studentId/:subject" component={TaskView} />
      {/* Parent routes */}
      <Route path="/parent" component={ParentDashboard} />
      <Route path="/parent/settings/:studentId" component={ParentSettings} />
      <Route path="/parent/review/:studentId" component={ParentReview} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="top-right" richColors />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
