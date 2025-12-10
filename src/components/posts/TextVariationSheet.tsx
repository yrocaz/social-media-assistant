import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  Check,
  Briefcase,
  Smile,
  Flame,
  Minimize2,
} from "lucide-react";
import type { ParsedPost, ToneOption } from "@/server/db/schema";
import {
  generateTextVariationsFn,
  acceptTextVariationFn,
} from "@/server/functions/posts";

interface TextVariationSheetProps {
  post: ParsedPost;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: (updatedPost: ParsedPost) => void;
}

interface VariationItem {
  id: string;
  hook: string;
  caption: string;
  hashtags: string[];
}

const TONE_OPTIONS = [
  { value: "formal" as const, label: "Formal", icon: Briefcase },
  { value: "friendly" as const, label: "Friendly", icon: Smile },
  { value: "spicy" as const, label: "Spicy", icon: Flame },
  { value: "minimal" as const, label: "Minimal", icon: Minimize2 },
];

export function TextVariationSheet({
  post,
  open,
  onOpenChange,
  onAccept,
}: TextVariationSheetProps) {
  const [feedback, setFeedback] = useState("");
  const [selectedTone, setSelectedTone] = useState<ToneOption | null>(null);
  const [variations, setVariations] = useState<VariationItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAccepting, setIsAccepting] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!feedback.trim() && !selectedTone) return;

    setIsGenerating(true);
    try {
      const result = await generateTextVariationsFn({
        data: {
          postId: post.id,
          feedback: feedback || `Make it ${selectedTone}`,
          tone: selectedTone,
        },
      });
      setVariations(result.variations);
    } catch (error) {
      toast.error("Failed to generate variations");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = async (variationId: string) => {
    setIsAccepting(variationId);
    try {
      const updated = await acceptTextVariationFn({
        data: { postId: post.id, variationId },
      });
      if (updated) {
        onAccept(updated);
        onOpenChange(false);
        toast.success("Post updated!");
        // Reset state
        setFeedback("");
        setSelectedTone(null);
        setVariations([]);
      }
    } catch (error) {
      toast.error("Failed to update post");
      console.error(error);
    } finally {
      setIsAccepting(null);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset state when closing
      setFeedback("");
      setSelectedTone(null);
      setVariations([]);
    }
    onOpenChange(open);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="border-b sticky top-0 bg-background">
          <SheetTitle>Generate Text Variations</SheetTitle>
          <SheetDescription>
            Provide feedback or select a tone to generate new caption variations
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 p-4">
          {/* Original Post Preview */}
          <div className="rounded-md border p-2.5 bg-muted/50 flex flex-col gap-1">
            <p className="text-sm font-medium">{post.hook}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {post.caption}
            </p>
          </div>

          {/* Feedback Input */}
          <div className="flex flex-col gap-1.5">
            <Label>Your feedback</Label>
            <Textarea
              placeholder="e.g., Make it more relatable, add a question at the end..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={2}
            />
          </div>

          {/* Tone Quick Select */}
          <div className="flex flex-col gap-1.5">
            <Label>Tone</Label>
            <div className="flex flex-wrap gap-1.5">
              {TONE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={
                    selectedTone === option.value ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    setSelectedTone(
                      selectedTone === option.value ? null : option.value
                    )
                  }
                >
                  <option.icon className="h-3 w-3 mr-1" />
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || (!feedback.trim() && !selectedTone)}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Variations
              </>
            )}
          </Button>

          {/* Variations List */}
          {variations.length > 0 && (
            <div className="flex flex-col gap-2 pt-3 border-t">
              <Label>Variations</Label>
              {variations.map((variation, index) => (
                <div
                  key={variation.id}
                  className="rounded-md border p-3 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium flex-1">
                      <span className="text-muted-foreground mr-1">
                        {index + 1}.
                      </span>
                      {variation.hook}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAccept(variation.id)}
                      disabled={isAccepting !== null}
                      className="shrink-0"
                    >
                      {isAccepting === variation.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Use
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {variation.caption}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {variation.hashtags.slice(0, 4).map((tag) => (
                      <span key={tag} className="text-xs text-primary">
                        #{tag}
                      </span>
                    ))}
                    {variation.hashtags.length > 4 && (
                      <span className="text-xs text-muted-foreground">
                        +{variation.hashtags.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
