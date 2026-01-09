import { useState, useRef, useCallback } from "react";
import { ImagePlus, Upload, Link as LinkIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEditMode } from "@/contexts/EditModeContext";
import { compressImage, formatFileSize } from "@/lib/image-compression";
import { cn } from "@/lib/utils";

interface EditableImageProps {
  src: string;
  alt: string;
  onChange: (src: string) => void;
  className?: string;
  contentKey?: string;
}

export function EditableImage({
  src,
  alt,
  onChange,
  className,
  contentKey,
}: EditableImageProps) {
  const { isEditMode, registerChange } = useEditMode();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = useCallback((newSrc: string) => {
    onChange(newSrc);
    if (contentKey) {
      registerChange(contentKey, newSrc);
    }
    setIsDialogOpen(false);
    setImageUrl("");
    setCompressionInfo(null);
  }, [onChange, contentKey, registerChange]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await compressImage(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
      });

      setCompressionInfo(
        `Compressed: ${formatFileSize(result.originalSize)} → ${formatFileSize(result.compressedSize)} (${result.compressionRatio}% saved)`
      );

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        handleImageChange(base64);
      };
      reader.readAsDataURL(result.file);
    } catch (error) {
      console.error("Failed to compress image:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlSubmit = () => {
    if (imageUrl.trim()) {
      handleImageChange(imageUrl.trim());
    }
  };

  const handleClick = () => {
    if (isEditMode) {
      setIsDialogOpen(true);
    }
  };

  if (!isEditMode) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        data-testid={contentKey ? `image-${contentKey}` : undefined}
      />
    );
  }

  return (
    <>
      <div
        className={cn(
          "relative cursor-pointer group",
          className
        )}
        onClick={handleClick}
        data-testid={contentKey ? `editable-image-${contentKey}` : "editable-image"}
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            className={cn(className, "group-hover:opacity-75 transition-opacity")}
          />
        ) : (
          <div
            className={cn(
              "flex items-center justify-center bg-muted border-2 border-dashed rounded-md min-h-32",
              className
            )}
          >
            <ImagePlus className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
          <div className="text-white text-sm font-medium flex items-center gap-2">
            <ImagePlus className="w-5 h-5" />
            Change Image
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Image</DialogTitle>
            <DialogDescription>
              Upload a new image or provide a URL
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" data-testid="tab-upload">
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="url" data-testid="tab-url">
                <LinkIcon className="w-4 h-4 mr-2" />
                URL
              </TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                data-testid="input-file"
              />
              <Button
                variant="outline"
                className="w-full h-24 border-dashed"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                data-testid="button-upload-image"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Compressing...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Click to upload image
                  </>
                )}
              </Button>
              {compressionInfo && (
                <p className="text-sm text-muted-foreground text-center">
                  {compressionInfo}
                </p>
              )}
            </TabsContent>
            <TabsContent value="url" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="flex-1"
                  data-testid="input-image-url"
                />
                <Button
                  onClick={handleUrlSubmit}
                  disabled={!imageUrl.trim()}
                  data-testid="button-apply-url"
                >
                  Apply
                </Button>
              </div>
              {imageUrl && (
                <div className="rounded-md overflow-hidden border">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "";
                    }}
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
