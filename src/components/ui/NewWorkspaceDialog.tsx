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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Disk, DiskCanUseMap, DiskEnabledFSTypes, DiskLabelMap, DiskType } from "@/Db/Disk";
import { Workspace } from "@/Db/Workspace";
import { RandomSlugWords } from "@/lib/randomSlugWords";
import { useNavigate } from "@tanstack/react-router";
import { LoaderIcon } from "lucide-react";
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

  const defaultValue = useMemo(() => RandomSlugWords() /*nanoid()*/, []);
  const navigate = useNavigate();

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      void navigate({ to: "/" });
    }
  };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const workspaceName = formData.get("workspaceName") as string;
    const fileSystem = formData.get("fileSystem") as DiskType;
    setPending(true);
    const workspace = await Workspace.CreateNewWithSeedFiles(workspaceName, fileSystem);
    setPending(false);
    setIsOpen(false);

    void navigate({ to: String(workspace.home()) });
  };
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {/* 1. Give the form a unique ID */}
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[26.5625rem]">
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
            <div className="grid gap-3">
              <Label htmlFor="fileSystem-1">File System</Label>
              <Select name="fileSystem" defaultValue={Disk.defaultDiskType}>
                <SelectTrigger>
                  <SelectValue placeholder={"Disk Filesystem Type"}></SelectValue>
                </SelectTrigger>
                <SelectContent id="fileSystem-1">
                  {DiskEnabledFSTypes.map((diskType) => (
                    <SelectItem key={diskType} value={diskType} disabled={!DiskCanUseMap[diskType]()}>
                      {DiskLabelMap[diskType]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
