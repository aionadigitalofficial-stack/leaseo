import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react";
import { Bold, Italic, Link as LinkIcon, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEditMode } from "@/contexts/EditModeContext";
import { cn } from "@/lib/utils";
import DOMPurify from "isomorphic-dompurify";

const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'strong', 'em', 'a', 'br', 'p', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });
};

type TextElement = "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div";

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  as?: TextElement;
  className?: string;
  placeholder?: string;
  contentKey?: string;
}

export function EditableText({
  value,
  onChange,
  as: Component = "p",
  className,
  placeholder = "Click to edit...",
  contentKey,
}: EditableTextProps) {
  const { isEditMode, registerChange } = useEditMode();
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [showToolbar, setShowToolbar] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const contentRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleFocus = () => {
    if (isEditMode) {
      setIsEditing(true);
      setShowToolbar(true);
    }
  };

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    setShowToolbar(false);
    if (contentRef.current) {
      const rawValue = contentRef.current.innerHTML;
      const sanitizedValue = sanitizeHtml(rawValue);
      if (sanitizedValue !== value) {
        setLocalValue(sanitizedValue);
        onChange(sanitizedValue);
        if (contentKey) {
          registerChange(contentKey, sanitizedValue);
        }
      }
    }
  }, [value, onChange, contentKey, registerChange]);

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Escape") {
      contentRef.current?.blur();
    }
    if (e.key === "Enter" && !e.shiftKey && (Component === "h1" || Component === "h2" || Component === "h3" || Component === "h4")) {
      e.preventDefault();
      contentRef.current?.blur();
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    contentRef.current?.focus();
  };

  const handleBold = () => execCommand("bold");
  const handleItalic = () => execCommand("italic");

  const handleLink = () => {
    if (linkUrl) {
      execCommand("createLink", linkUrl);
      setLinkUrl("");
      setLinkPopoverOpen(false);
    }
  };

  const handleUnlink = () => {
    execCommand("unlink");
  };

  if (!isEditMode) {
    return (
      <Component
        className={className}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(localValue || placeholder) }}
        data-testid={contentKey ? `text-${contentKey}` : undefined}
      />
    );
  }

  return (
    <div className="relative group">
      {showToolbar && (
        <div
          className="absolute -top-10 left-0 z-10 flex items-center gap-1 p-1 bg-background border rounded-md shadow-md"
          data-testid="rich-text-toolbar"
        >
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onMouseDown={(e) => {
              e.preventDefault();
              handleBold();
            }}
            data-testid="button-bold"
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onMouseDown={(e) => {
              e.preventDefault();
              handleItalic();
            }}
            data-testid="button-italic"
          >
            <Italic className="w-4 h-4" />
          </Button>
          <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onMouseDown={(e) => e.preventDefault()}
                data-testid="button-link"
              >
                <LinkIcon className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <div className="flex gap-2">
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1"
                  data-testid="input-link-url"
                />
                <Button
                  size="sm"
                  onClick={handleLink}
                  data-testid="button-apply-link"
                >
                  Add
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onMouseDown={(e) => {
              e.preventDefault();
              handleUnlink();
            }}
            data-testid="button-unlink"
          >
            <Unlink className="w-4 h-4" />
          </Button>
        </div>
      )}
      <Component
        ref={contentRef as any}
        contentEditable
        suppressContentEditableWarning
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          className,
          "outline-none ring-2 ring-primary/20 rounded px-1 -mx-1 cursor-text",
          isEditing && "ring-primary"
        )}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(localValue || "") }}
        data-testid={contentKey ? `editable-text-${contentKey}` : "editable-text"}
        data-placeholder={placeholder}
      />
    </div>
  );
}
