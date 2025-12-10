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
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles } from "lucide-react";

interface GeneratePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (prompt: string, count: number) => Promise<void>;
  isGenerating: boolean;
}

export function GeneratePostModal({
  open,
  onOpenChange,
  onGenerate,
  isGenerating,
}: GeneratePostModalProps) {
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(1);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    await onGenerate(prompt, count);
    // Reset on success
    setPrompt("");
    setCount(1);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isGenerating) {
      setPrompt("");
      setCount(1);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate from Prompt</DialogTitle>
          <DialogDescription>
            Enter a topic or idea to generate posts about
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prompt">Topic or prompt</Label>
            <Textarea
              id="prompt"
              placeholder="e.g., Tips for getting toddlers to eat vegetables, morning routine hacks for busy moms..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              disabled={isGenerating}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="count">Number of posts</Label>
            <Input
              id="count"
              type="number"
              min={1}
              max={3}
              value={count}
              onChange={(e) =>
                setCount(Math.min(3, Math.max(1, parseInt(e.target.value) || 1)))
              }
              disabled={isGenerating}
              className="w-24"
            />
            <p className="text-xs text-muted-foreground">1-3 posts</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isGenerating || !prompt.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
