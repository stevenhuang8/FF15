"use client";

import { Button } from "@/components/ui/button";

const APPROVAL_TITLES: Record<string, string> = {
  confirmMealLog: "Log this meal?",
  confirmWorkoutLog: "Log this workout?",
  confirmHealthMetricsLog: "Save these health metrics?",
  confirmAddPantryItem: "Add this to your pantry?",
  confirmDietaryPreferencesUpdate: "Replace your dietary restrictions with this list?",
  confirmAllergiesUpdate: "Replace your allergies with this list?",
  confirmFitnessGoalsUpdate: "Save these fitness goals?",
  createFitnessGoal: "Create this fitness goal?",
  updateStructuredGoal: "Update this fitness goal?",
};

function fieldLabel(key: string): string {
  const words = key.replace(/([A-Z])/g, " $1").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "None";
  if (Array.isArray(value)) {
    return value.length > 0 ? value.map(formatValue).join("; ") : "None";
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${fieldLabel(k)}: ${formatValue(v)}`)
      .join(", ");
  }
  return String(value);
}

interface ToolApprovalCardProps {
  toolName: string;
  input: unknown;
  disabled?: boolean;
  onRespond: (approved: boolean) => void;
}

/**
 * Shows the exact values a save tool was called with, so the approval doesn't
 * depend on how the model described them.
 */
export function ToolApprovalCard({
  toolName,
  input,
  disabled,
  onRespond,
}: ToolApprovalCardProps) {
  const fields = Object.entries((input ?? {}) as Record<string, unknown>).filter(
    ([key]) => key !== "userId"
  );

  return (
    <div className="w-full rounded-lg border bg-card p-4 space-y-3">
      <p className="text-sm font-medium">
        {APPROVAL_TITLES[toolName] ?? "Allow this change?"}
      </p>
      <dl className="space-y-1 text-sm">
        {fields.map(([key, value]) => (
          <div key={key} className="break-words">
            <dt className="inline text-muted-foreground">{fieldLabel(key)}: </dt>
            <dd className="inline">{formatValue(value)}</dd>
          </div>
        ))}
      </dl>
      <div className="flex gap-2">
        <Button size="sm" disabled={disabled} onClick={() => onRespond(true)}>
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onRespond(false)}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
