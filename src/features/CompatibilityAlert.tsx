import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { BrowserCompatibility, type CompatibilityCheck } from "@/lib/BrowserCompatibility";
import { BrowserDetection } from "@/lib/BrowserDetection";
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  ExternalLink,
  Smartphone
} from "lucide-react";

export function CompatibilityAlert() {
  const [isOpen, setIsOpen] = useState(false);
  const { storedValue: isDismissed, setStoredValue: setIsDismissed } = useLocalStorage(
    'compatibility-alert-dismissed', 
    false,
    { initializeWithValue: true }
  );

  const compatibilityChecks = BrowserCompatibility.getCompatibilityChecks();
  const hasCompatibilityIssues = BrowserCompatibility.hasCompatibilityIssues();

  useEffect(() => {
    if (hasCompatibilityIssues && !isDismissed) {
      setIsOpen(true);
    }
  }, [hasCompatibilityIssues, isDismissed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsOpen(false);
  };

  const getStatusIcon = (check: CompatibilityCheck) => {
    const passed = check.check();
    if (passed) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (check.required) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    } else {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  if (!hasCompatibilityIssues && isDismissed) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {BrowserDetection.isMobile() && <Smartphone className="h-5 w-5" />}
            Browser Compatibility Check
          </DialogTitle>
          <DialogDescription>
            This application has specific browser and device requirements for optimal functionality.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3">
          {compatibilityChecks.map((check, index) => (
            <div key={index} className="flex items-start gap-3 p-2 rounded border">
              {getStatusIcon(check)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{check.name}</span>
                  {check.required && <span className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded">Required</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {check.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => window.open('#', '_blank')}
            className="w-full sm:w-auto"
          >
            <ExternalLink className="h-4 w-4" />
            Learn More
          </Button>
          <Button 
            onClick={handleDismiss}
            className="w-full sm:w-auto"
          >
            Dismiss
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
