import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, RefreshCw, ImageIcon, Trash2 } from "lucide-react";

interface PostCardMenuProps {
  onRegenerateText: () => void;
  onRegenerateImage: () => void;
  onDelete: () => void;
}

export function PostCardMenu({
  onRegenerateText,
  onRegenerateImage,
  onDelete,
}: PostCardMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Post options</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onRegenerateText}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Regenerate Text
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onRegenerateImage}>
          <ImageIcon className="h-4 w-4 mr-2" />
          Regenerate Image
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} variant="destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
