import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { authMiddleware } from "@/server/middleware/auth";
import { useSession, signOut } from "@/lib/auth-client";
import {
  listPostsFn,
  generatePostsFn,
  generatePostsWithPromptFn,
  approvePostFn,
  rejectPostFn,
  markPostedFn,
  deletePostFn,
} from "@/server/functions/posts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  LogOut,
  Plus,
  Sparkles,
  Check,
  X,
  Copy,
  Share,
  Loader2,
  User,
  ChevronDown,
  Shuffle,
  MessageSquare,
  ArrowLeft,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { PostStatus } from "@/server/db/schema";
import {
  PostCardMenu,
  TextVariationSheet,
  ImageRegenerateDialog,
  GeneratePostModal,
} from "@/components/posts";

export const Route = createFileRoute("/")({
  component: Dashboard,
  server: {
    middleware: [authMiddleware],
  },
  loader: async () => {
    const posts = await listPostsFn();
    return { posts };
  },
});

type ParsedPost = Awaited<ReturnType<typeof listPostsFn>>[number];

function Dashboard() {
  const { data: session } = useSession();
  const user = session?.user;
  const { posts: initialPosts } = Route.useLoaderData();

  const [posts, setPosts] = useState<ParsedPost[]>(initialPosts);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<PostStatus>("draft");
  const [promptModalOpen, setPromptModalOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/login";
  };

  const handleGenerateRandom = async () => {
    setIsGenerating(true);
    try {
      const result = await generatePostsFn();
      setPosts((prev) => [...result.posts, ...prev]);
      toast.success(`Generated ${result.posts.length} new posts!`);
      setActiveTab("draft");
    } catch (error) {
      toast.error("Failed to generate posts. Please try again.");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateFromPrompt = async (prompt: string, count: number) => {
    setIsGenerating(true);
    try {
      const result = await generatePostsWithPromptFn({
        data: { prompt, count },
      });
      setPosts((prev) => [...result.posts, ...prev]);
      toast.success(
        `Generated ${result.posts.length} new post${result.posts.length > 1 ? "s" : ""}!`
      );
      setActiveTab("draft");
      setPromptModalOpen(false);
    } catch (error) {
      toast.error("Failed to generate posts. Please try again.");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper to update post and sort by updatedAt (most recent first)
  const updatePostAndSort = (
    updatedPost: ParsedPost,
    targetTab?: PostStatus
  ) => {
    setPosts((prev) =>
      prev
        .map((p) => (p.id === updatedPost.id ? updatedPost : p))
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
    );
    if (targetTab) {
      setActiveTab(targetTab);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const updated = await approvePostFn({ data: { id } });
      if (updated) {
        updatePostAndSort(updated, "approved");
        toast.success("Post approved!");
      }
    } catch (error) {
      toast.error("Failed to approve post");
    }
  };

  const handleReject = async (id: string) => {
    try {
      const updated = await rejectPostFn({ data: { id } });
      if (updated) {
        updatePostAndSort(updated, "rejected");
        toast.success("Post rejected");
      }
    } catch (error) {
      toast.error("Failed to reject post");
    }
  };

  const handleMarkPosted = async (id: string) => {
    try {
      const updated = await markPostedFn({ data: { id } });
      if (updated) {
        updatePostAndSort(updated, "posted");
        toast.success("Marked as posted!");
      }
    } catch (error) {
      toast.error("Failed to update post");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePostFn({ data: { id } });
      setPosts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Post deleted");
    } catch (error) {
      toast.error("Failed to delete post");
    }
  };

  const handleCopy = async (post: ParsedPost) => {
    const hashtags = post.hashtags.map((h: string) => `#${h}`).join(" ");
    const text = `${post.caption}\n\n${hashtags}`;

    await navigator.clipboard.writeText(text);
    toast.success("Caption copied to clipboard!");
  };

  const handleUpdate = (updatedPost: ParsedPost) => {
    const targetTab = updatedPost.status === "draft" ? "draft" : activeTab;
    updatePostAndSort(updatedPost, targetTab);
  };

  const filteredPosts = posts.filter((p) => p.status === activeTab);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background z-50">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <h1 className="text-lg font-bold">Momwise Content</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="font-normal text-xs text-muted-foreground">
                {user?.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {/* Action bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">Content Dashboard</h2>
            <p className="text-sm text-muted-foreground">
              Generate and manage your social media posts
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={isGenerating} className="w-full sm:w-auto">
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleGenerateRandom}
                disabled={isGenerating}
              >
                <Shuffle className="h-4 w-4 mr-2" />
                Random
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setPromptModalOpen(true)}
                disabled={isGenerating}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                From Prompt
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Generate from Prompt Modal */}
        <GeneratePostModal
          open={promptModalOpen}
          onOpenChange={setPromptModalOpen}
          onGenerate={handleGenerateFromPrompt}
          isGenerating={isGenerating}
        />

        {/* Tabs for post status */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as PostStatus)}
          className="space-y-4"
        >
          <TabsList>
            <TabsTrigger value="draft">
              Draft{" "}
              <span className="hidden sm:inline-block">
                ({posts.filter((p) => p.status === "draft").length})
              </span>
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved{" "}
              <span className="hidden sm:inline-block">
                ({posts.filter((p) => p.status === "approved").length})
              </span>
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected{" "}
              <span className="hidden sm:inline-block">
                ({posts.filter((p) => p.status === "rejected").length})
              </span>
            </TabsTrigger>
            <TabsTrigger value="posted">
              Posted{" "}
              <span className="hidden sm:inline-block">
                ({posts.filter((p) => p.status === "posted").length})
              </span>
            </TabsTrigger>
          </TabsList>

          {(["draft", "approved", "rejected", "posted"] as const).map(
            (status) => (
              <TabsContent key={status} value={status} className="space-y-4">
                {isGenerating && status === "draft" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <Card key={i}>
                        <CardHeader>
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-6 w-full" />
                        </CardHeader>
                        <CardContent>
                          <Skeleton className="aspect-4/5 w-full mb-4" />
                          <Skeleton className="h-20 w-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : filteredPosts.length === 0 ? (
                  <EmptyState status={status} />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPosts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        onApprove={() => handleApprove(post.id)}
                        onReject={() => handleReject(post.id)}
                        onMarkPosted={() => handleMarkPosted(post.id)}
                        onDelete={() => handleDelete(post.id)}
                        onCopy={() => handleCopy(post)}
                        onUpdate={handleUpdate}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            )
          )}
        </Tabs>
      </main>
    </div>
  );
}

// ============================================================================
// PostCard Component
// ============================================================================

interface PostCardProps {
  post: ParsedPost;
  onApprove: () => void;
  onReject: () => void;
  onMarkPosted: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onUpdate: (updatedPost: ParsedPost) => void;
}

function PostCard({
  post,
  onApprove,
  onReject,
  onMarkPosted,
  onDelete,
  onCopy,
  onUpdate,
}: PostCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [textSheetOpen, setTextSheetOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  // Get names from email (part before @)
  const getName = (email?: string | null) => email?.split("@")[0] ?? "?";
  const getInitial = (email?: string | null) =>
    getName(email).charAt(0).toUpperCase();

  const creatorName = getName(post.creator?.email);
  const creatorInitial = getInitial(post.creator?.email);

  // Get action user based on status
  const getActionInfo = () => {
    switch (post.status) {
      case "approved":
        return post.approver
          ? { label: "Approved by", name: getName(post.approver.email) }
          : null;
      case "rejected":
        return post.rejector
          ? { label: "Rejected by", name: getName(post.rejector.email) }
          : null;
      case "posted":
        return post.poster
          ? { label: "Posted by", name: getName(post.poster.email) }
          : null;
      default:
        return null;
    }
  };

  const actionInfo = getActionInfo();

  const AvatarInfoContent = () => (
    <div className="space-y-1 text-sm">
      {actionInfo && (
        <p>
          <span className="text-muted-foreground">{actionInfo.label}</span>{" "}
          <span className="font-medium">{actionInfo.name}</span>
        </p>
      )}
      <p>
        <span className="text-muted-foreground">Created by</span>{" "}
        <span className="font-medium">{creatorName}</span>
      </p>
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{post.pillar}</Badge>
              {post.creator && (
                <>
                  {/* Desktop: HoverCard */}
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <Avatar className="h-5 w-5 text-[10px] cursor-pointer hidden sm:flex">
                        <AvatarFallback>{creatorInitial}</AvatarFallback>
                      </Avatar>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-auto">
                      <AvatarInfoContent />
                    </HoverCardContent>
                  </HoverCard>
                  {/* Mobile: Popover */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Avatar className="h-5 w-5 text-[10px] cursor-pointer sm:hidden">
                        <AvatarFallback>{creatorInitial}</AvatarFallback>
                      </Avatar>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto">
                      <AvatarInfoContent />
                    </PopoverContent>
                  </Popover>
                </>
              )}
            </div>
            <PostCardMenu
              onRegenerateText={() => setTextSheetOpen(true)}
              onRegenerateImage={() => setImageDialogOpen(true)}
              onDelete={onDelete}
            />
          </div>
          <CardTitle className="text-base leading-tight">{post.hook}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Image preview */}
          {post.imageUrl ? (
            <div className="aspect-4/5 bg-muted rounded-md overflow-hidden">
              <img
                src={post.imageUrl}
                alt={post.hook}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-4/5 bg-muted rounded-md flex items-center justify-center">
              <span className="text-muted-foreground text-sm">
                Image pending...
              </span>
            </div>
          )}

          {/* Caption preview */}
          <div className="text-sm">
            <p className={expanded ? "" : "line-clamp-3"}>{post.caption}</p>
            {post.caption.length > 150 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-primary text-xs mt-1"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>

          {/* Hashtags */}
          <div className="flex flex-wrap gap-1">
            {post.hashtags.slice(0, 5).map((tag: string) => (
              <span key={tag} className="text-xs text-primary">
                #{tag}
              </span>
            ))}
            {post.hashtags.length > 5 && (
              <span className="text-xs text-muted-foreground">
                +{post.hashtags.length - 5} more
              </span>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex gap-2 flex-wrap">
          {post.status === "draft" && (
            <>
              <Button size="sm" onClick={onApprove}>
                <Check className="h-3 w-3 mr-1" />
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={onReject}>
                <X className="h-3 w-3 mr-1" />
                Reject
              </Button>
            </>
          )}
          {post.status === "approved" && (
            <>
              <Button size="sm" onClick={onCopy}>
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
              <Button size="sm" variant="outline" onClick={onMarkPosted}>
                <Share className="h-3 w-3 mr-1" />
                Mark Posted
              </Button>
            </>
          )}
          {post.status === "posted" && (
            <>
              <Button size="sm" variant="outline" onClick={onApprove}>
                <X className="h-3 w-3 mr-1" />
                Unmark Posted
              </Button>
            </>
          )}
          {post.status === "rejected" && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdate({ ...post, status: "draft" })}
              >
                <ArrowLeft className="h-3 w-3 mr-1" />
                Back to Draft
              </Button>
            </>
          )}
        </CardFooter>
      </Card>

      {/* Text Variation Sheet */}
      <TextVariationSheet
        post={post}
        open={textSheetOpen}
        onOpenChange={setTextSheetOpen}
        onAccept={onUpdate}
      />

      {/* Image Regenerate Dialog */}
      <ImageRegenerateDialog
        post={post}
        open={imageDialogOpen}
        onOpenChange={setImageDialogOpen}
        onRegenerate={onUpdate}
      />
    </>
  );
}

// ============================================================================
// EmptyState Component
// ============================================================================

function EmptyState({ status }: { status: PostStatus }) {
  const messages: Record<PostStatus, { title: string; description: string }> = {
    draft: {
      title: "No draft posts",
      description: "Generate some posts to get started",
    },
    approved: {
      title: "No approved posts",
      description: "Approved posts will appear here",
    },
    rejected: {
      title: "No rejected posts",
      description: "Rejected posts will appear here",
    },
    posted: {
      title: "No posted content",
      description: "Posts marked as shared will appear here",
    },
  };

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Plus className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <CardTitle className="text-lg mb-2">{messages[status].title}</CardTitle>
        <CardDescription>{messages[status].description}</CardDescription>
      </CardContent>
    </Card>
  );
}
