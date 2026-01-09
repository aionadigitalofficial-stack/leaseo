import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface PageContent {
  id: string;
  pageKey: string;
  title: string;
  content: Record<string, unknown>;
  metaTitle: string | null;
  metaDescription: string | null;
  status: string;
  lastEditedBy: string | null;
  updatedAt: string;
  createdAt: string;
}

interface UsePageContentOptions {
  slug: string;
  debounceMs?: number;
  autoSave?: boolean;
}

interface UsePageContentReturn {
  content: PageContent | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSaving: boolean;
  updateContent: (key: string, value: unknown) => void;
  updateMetaTitle: (value: string) => void;
  updateMetaDescription: (value: string) => void;
  save: () => Promise<void>;
  localContent: Record<string, unknown>;
  metaTitle: string;
  metaDescription: string;
  hasUnsavedChanges: boolean;
}

export function usePageContent({
  slug,
  debounceMs = 2000,
  autoSave = true,
}: UsePageContentOptions): UsePageContentReturn {
  const queryClient = useQueryClient();
  const [localContent, setLocalContent] = useState<Record<string, unknown>>({});
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    data: content,
    isLoading,
    isError,
    error,
  } = useQuery<PageContent>({
    queryKey: ["/api/pages", slug],
    enabled: !!slug,
    retry: false,
  });

  useEffect(() => {
    if (content) {
      setLocalContent(content.content as Record<string, unknown>);
      setMetaTitle(content.metaTitle || "");
      setMetaDescription(content.metaDescription || "");
    }
  }, [content]);

  const saveMutation = useMutation({
    mutationFn: async (data: {
      title?: string;
      content?: Record<string, unknown>;
      metaTitle?: string;
      metaDescription?: string;
    }) => {
      const response = await apiRequest("PATCH", `/api/pages/${slug}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages", slug] });
      setHasUnsavedChanges(false);
    },
  });

  const scheduleSave = useCallback(() => {
    if (!autoSave) return;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      saveMutation.mutate({
        content: localContent,
        metaTitle,
        metaDescription,
      });
    }, debounceMs);
  }, [autoSave, debounceMs, localContent, metaTitle, metaDescription, saveMutation]);

  const updateContent = useCallback((key: string, value: unknown) => {
    setLocalContent((prev) => {
      const updated = { ...prev, [key]: value };
      return updated;
    });
    setHasUnsavedChanges(true);
    scheduleSave();
  }, [scheduleSave]);

  const updateMetaTitle = useCallback((value: string) => {
    setMetaTitle(value);
    setHasUnsavedChanges(true);
    scheduleSave();
  }, [scheduleSave]);

  const updateMetaDescription = useCallback((value: string) => {
    setMetaDescription(value);
    setHasUnsavedChanges(true);
    scheduleSave();
  }, [scheduleSave]);

  const save = useCallback(async () => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    await saveMutation.mutateAsync({
      content: localContent,
      metaTitle,
      metaDescription,
    });
  }, [localContent, metaTitle, metaDescription, saveMutation]);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    content: content || null,
    isLoading,
    isError,
    error: error as Error | null,
    isSaving: saveMutation.isPending,
    updateContent,
    updateMetaTitle,
    updateMetaDescription,
    save,
    localContent,
    metaTitle,
    metaDescription,
    hasUnsavedChanges,
  };
}
