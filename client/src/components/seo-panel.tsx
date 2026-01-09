import { useState, useEffect } from "react";
import { Search, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useEditMode } from "@/contexts/EditModeContext";
import { cn } from "@/lib/utils";

interface SEOPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metaTitle: string;
  metaDescription: string;
  pageUrl?: string;
  onMetaTitleChange: (value: string) => void;
  onMetaDescriptionChange: (value: string) => void;
}

export function SEOPanel({
  open,
  onOpenChange,
  metaTitle,
  metaDescription,
  pageUrl = "leaseo.in",
  onMetaTitleChange,
  onMetaDescriptionChange,
}: SEOPanelProps) {
  const { isEditMode, registerChange } = useEditMode();
  const [localTitle, setLocalTitle] = useState(metaTitle);
  const [localDescription, setLocalDescription] = useState(metaDescription);

  useEffect(() => {
    setLocalTitle(metaTitle);
  }, [metaTitle]);

  useEffect(() => {
    setLocalDescription(metaDescription);
  }, [metaDescription]);

  const handleTitleChange = (value: string) => {
    setLocalTitle(value);
    onMetaTitleChange(value);
    registerChange("metaTitle", value);
  };

  const handleDescriptionChange = (value: string) => {
    setLocalDescription(value);
    onMetaDescriptionChange(value);
    registerChange("metaDescription", value);
  };

  const titleLength = localTitle.length;
  const descriptionLength = localDescription.length;

  const titleMaxLength = 60;
  const descriptionMaxLength = 160;

  if (!isEditMode) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            SEO Settings
          </SheetTitle>
          <SheetDescription>
            Optimize how this page appears in search results
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
              <Globe className="w-4 h-4" />
              Google Preview
            </div>
            <div className="space-y-1" data-testid="seo-google-preview">
              <h3
                className={cn(
                  "text-lg font-medium line-clamp-1",
                  "text-[#1a0dab] dark:text-[#8ab4f8]"
                )}
              >
                {localTitle || "Page Title"}
              </h3>
              <p className="text-sm text-[#006621] dark:text-[#bdc1c6]">
                {pageUrl}
              </p>
              <p className="text-sm text-[#545454] dark:text-[#bdc1c6] line-clamp-2">
                {localDescription || "Page description will appear here..."}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="meta-title">Meta Title</Label>
                <span
                  className={cn(
                    "text-xs",
                    titleLength > titleMaxLength ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  {titleLength}/{titleMaxLength}
                </span>
              </div>
              <Input
                id="meta-title"
                value={localTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Enter page title for search engines"
                data-testid="input-meta-title"
              />
              <p className="text-xs text-muted-foreground">
                Keep it under {titleMaxLength} characters for optimal display
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="meta-description">Meta Description</Label>
                <span
                  className={cn(
                    "text-xs",
                    descriptionLength > descriptionMaxLength ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  {descriptionLength}/{descriptionMaxLength}
                </span>
              </div>
              <Textarea
                id="meta-description"
                value={localDescription}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="Enter a compelling description for search results"
                rows={4}
                className="resize-none"
                data-testid="input-meta-description"
              />
              <p className="text-xs text-muted-foreground">
                Keep it under {descriptionMaxLength} characters for optimal display
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">SEO Tips</h4>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Include your primary keyword in the title</li>
              <li>Write a unique description for each page</li>
              <li>Make your description compelling to improve click-through rates</li>
              <li>Avoid duplicate titles and descriptions across pages</li>
            </ul>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
            data-testid="button-close-seo-panel"
          >
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface SEOTriggerButtonProps {
  onClick: () => void;
  className?: string;
}

export function SEOTriggerButton({ onClick, className }: SEOTriggerButtonProps) {
  const { isEditMode } = useEditMode();

  if (!isEditMode) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn("gap-2", className)}
      data-testid="button-open-seo-panel"
    >
      <Search className="w-4 h-4" />
      SEO Settings
    </Button>
  );
}
