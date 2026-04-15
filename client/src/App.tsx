import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Home from "@/pages/Home";
import AddWord from "@/pages/AddWord";
import CalendarView from "@/pages/CalendarView";
import TagCloud from "@/pages/TagCloud";
import WordDetail from "@/pages/WordDetail";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/home" component={Home} />
      <Route path="/add" component={AddWord} />
      <Route path="/calendar" component={CalendarView} />
      <Route path="/tags" component={TagCloud} />
      <Route path="/word/:id" component={WordDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <TooltipProvider>
      <Toaster />
      <Router hook={useHashLocation}>
        <AppRouter />
      </Router>
    </TooltipProvider>
  );
}

export default App;
