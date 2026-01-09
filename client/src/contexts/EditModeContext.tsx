import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";

interface EditModeContextType {
  isAdmin: boolean;
  isEditMode: boolean;
  setIsEditMode: (value: boolean) => void;
  saveChanges: () => Promise<void>;
  isSaving: boolean;
  pendingChanges: Map<string, unknown>;
  registerChange: (key: string, value: unknown) => void;
  clearChanges: () => void;
}

const EditModeContext = createContext<EditModeContextType | null>(null);

interface EditModeProviderProps {
  children: ReactNode;
  onSave?: (changes: Map<string, unknown>) => Promise<void>;
}

export function EditModeProvider({ children, onSave }: EditModeProviderProps) {
  const { isAdmin } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<string, unknown>>(new Map());

  const registerChange = useCallback((key: string, value: unknown) => {
    setPendingChanges((prev) => {
      const next = new Map(prev);
      next.set(key, value);
      return next;
    });
  }, []);

  const clearChanges = useCallback(() => {
    setPendingChanges(new Map());
  }, []);

  const saveChanges = useCallback(async () => {
    if (pendingChanges.size === 0) return;

    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(pendingChanges);
      }
      clearChanges();
    } catch (error) {
      console.error("Failed to save changes:", error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [pendingChanges, onSave, clearChanges]);

  const handleSetEditMode = useCallback((value: boolean) => {
    if (!value && pendingChanges.size > 0) {
      clearChanges();
    }
    setIsEditMode(value);
  }, [pendingChanges.size, clearChanges]);

  return (
    <EditModeContext.Provider
      value={{
        isAdmin,
        isEditMode: isAdmin && isEditMode,
        setIsEditMode: handleSetEditMode,
        saveChanges,
        isSaving,
        pendingChanges,
        registerChange,
        clearChanges,
      }}
    >
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode(): EditModeContextType {
  const context = useContext(EditModeContext);
  if (!context) {
    throw new Error("useEditMode must be used within an EditModeProvider");
  }
  return context;
}
