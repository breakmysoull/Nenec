
import { TrainingStep } from "../types";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";

interface TrainingStepsChecklistProps {
  steps: TrainingStep[];
  completedStepIds: Set<string>;
  onToggleStep: (stepId: string, checked: boolean) => void;
  onUploadEvidence?: (stepId: string) => void;
}

export const TrainingStepsChecklist = ({
  steps,
  completedStepIds,
  onToggleStep,
  onUploadEvidence
}: TrainingStepsChecklistProps) => {
  if (steps.length === 0) return null;

  return (
    <div className="bg-card border rounded-xl divide-y">
      {steps.map((step) => (
        <div key={step.id} className="p-4 flex items-start gap-3">
          <Checkbox 
            id={step.id}
            checked={completedStepIds.has(step.id)}
            onCheckedChange={(c) => onToggleStep(step.id, c as boolean)}
          />
          <div className="flex-1 space-y-1">
            <label 
              htmlFor={step.id}
              className="text-sm font-medium leading-none cursor-pointer"
            >
              {step.description}
              {step.required && <span className="text-destructive ml-1">*</span>}
            </label>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            onClick={() => onUploadEvidence?.(step.id)}
            title="Enviar Evidência"
          >
            <Camera className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </div>
  );
};
