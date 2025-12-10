import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ImageIcon } from "lucide-react";
import type { ParsedPost } from "@/server/db/schema";
import { regenerateImageFn } from "@/server/functions/posts";

interface ImageRegenerateDialogProps {
  post: ParsedPost;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegenerate: (updatedPost: ParsedPost) => void;
}

export function ImageRegenerateDialog({
  post,
  open,
  onOpenChange,
  onRegenerate,
}: ImageRegenerateDialogProps) {
  const [feedback, setFeedback] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleRegenerate = async () => {
    if (!feedback.trim()) return;

    setIsRegenerating(true);
    try {
      const updated = await regenerateImageFn({
        data: {
          postId: post.id,
          feedback,
        },
      });
      if (updated) {
        onRegenerate(updated);
        onOpenChange(false);
        toast.success("Image regenerated!");
        setFeedback("");
      }
    } catch (error) {
      toast.error("Failed to regenerate image");
      console.error(error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFeedback("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Regenerate Image</DialogTitle>
          <DialogDescription>
            Describe what you would like to change about the image
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Image Preview */}
          {post.imageUrl && (
            <div className="aspect-[4/5] rounded-md overflow-hidden bg-muted max-h-48">
              <img
                src={post.imageUrl}
                alt={post.hook}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Current Prompt */}
          <div className="rounded-md border p-3 bg-muted/50">
            <Label className="text-xs text-muted-foreground">
              Current prompt
            </Label>
            <p className="text-sm mt-1">{post.imagePrompt}</p>
          </div>

          {/* Feedback Input */}
          <div className="space-y-2">
            <Label>What would you like to change?</Label>
            <Textarea
              placeholder="e.g., Make it warmer, add more natural lighting, show a different angle..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleRegenerate}
            disabled={isRegenerating || !feedback.trim()}
          >
            {isRegenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <ImageIcon className="h-4 w-4 mr-2" />
                Regenerate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
