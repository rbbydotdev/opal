import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import Github from "@/icons/github.svg?react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { Loader } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_app/autoimport/github/$owner/$repo")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { owner, repo } = useParams({ from: "/_app/autoimport/github/$owner/$repo" });
  const [isValidRepo, setIsValidRepo] = useState<boolean | null>(null);

  useEffect(() => {
    if (!owner || !repo) {
      toast({
        title: "Invalid Repository",
        description: "Repository format is invalid. Expected format: owner/repo",
        type: "error"
      });
      navigate({ to: "/" });
      return;
    }

    // Simple validation: just check that we have non-empty strings
    const isValid = owner.trim().length > 0 && repo.trim().length > 0;
    if (!isValid) {
      toast({
        title: "Invalid Repository",
        description: `"${owner}/${repo}" is not a valid repository format. Expected format: owner/repo`,
        type: "error"
      });
      navigate({ to: "/" });
      return;
    }

    setIsValidRepo(true);
  }, [owner, repo, navigate]);

  const handleOkayClick = () => {
    void navigate({ to: "/" });
  };

  if (!isValidRepo) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8 w-full">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <Loader className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Validating repository...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-8 w-full">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="dark:bg-black bg-white dark:text-white text-black p-2 rounded-md w-12 h-12 flex items-center justify-center">
              <Github style={{ width: "24px", height: "24px" }} />
            </div>
          </div>
          <CardTitle className="text-lg">Importing from GitHub</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-8">
          <div className="space-y-2">
            <p className="font-medium">
              {owner}/{repo}
            </p>
            <Loader className="h-6 w-6 animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Setting up your workspace...</p>
          </div>
          <Button onClick={() => navigate({ to: "/" })}>Cancel</Button>
        </CardContent>
      </Card>
    </div>
  );
}
