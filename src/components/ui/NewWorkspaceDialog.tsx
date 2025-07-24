"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Workspace } from "@/Db/Workspace";
import { LoaderIcon } from "lucide-react";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export function NewWorkspaceDialog({
  children,
  isOpen,
  setIsOpen,
}: {
  children?: React.ReactNode;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) {
  const [isPending, setPending] = useState(false);
  const defaultValue = useMemo(() => "wrk-" + nanoid(), []);
  const router = useRouter();

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      router.back();
    }
  };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const workspaceName = formData.get("workspaceName") as string;
    setPending(true);
    const workspace = await Workspace.CreateNewWithSeedFiles(workspaceName);
    setPending(false);
    setIsOpen(false);

    router.push(workspace.home());
  };
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {/* 1. Give the form a unique ID */}
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New Workspace</DialogTitle>
          <DialogDescription>Create A New Workspace</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="gap-4 flex flex-col">
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="name-1">Name</Label>
              <Input
                required
                type="text"
                id="name-1"
                name="workspaceName"
                defaultValue={defaultValue}
                autoComplete="off"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>
            {/* 2. Link the button to the form using the ID */}
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <div className="animate-spin">
                  <LoaderIcon size={12} />
                </div>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
