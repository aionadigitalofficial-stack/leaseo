import { Pencil, X, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEditMode } from "@/contexts/EditModeContext";
import { cn } from "@/lib/utils";

interface FloatingEditToggleProps {
  className?: string;
}

export function FloatingEditToggle({ className }: FloatingEditToggleProps) {
  const { isAdmin, isEditMode, setIsEditMode, saveChanges, isSaving, pendingChanges } = useEditMode();

  if (!isAdmin) {
    return null;
  }

  const hasChanges = pendingChanges.size > 0;

  const handleToggle = async () => {
    if (isEditMode && hasChanges) {
      await saveChanges();
    }
    setIsEditMode(!isEditMode);
  };

  const handleSave = async () => {
    await saveChanges();
  };

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 flex flex-col gap-2",
        className
      )}
      data-testid="floating-edit-toggle"
    >
      {isEditMode && hasChanges && (
        <Button
          onClick={handleSave}
          disabled={isSaving}
          size="default"
          className="shadow-lg"
          data-testid="button-save-changes"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      )}
      <Button
        onClick={handleToggle}
        disabled={isSaving}
        variant={isEditMode ? "destructive" : "default"}
        size="default"
        className="shadow-lg"
        data-testid="button-toggle-edit-mode"
      >
        {isEditMode ? (
          <>
            <X className="w-4 h-4 mr-2" />
            Exit Edit
          </>
        ) : (
          <>
            <Pencil className="w-4 h-4 mr-2" />
            Edit Page
          </>
        )}
      </Button>
    </div>
  );
}
