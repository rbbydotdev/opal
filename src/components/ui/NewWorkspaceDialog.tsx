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
import { Disk, DiskCanUseMap, DiskEnabledFSTypes, DiskLabelMap, DiskType, OpFsDirMountDisk } from "@/Db/Disk";
import { Workspace } from "@/Db/Workspace";
import { WorkspaceDAO } from "@/Db/WorkspaceDAO";
import { WORKSPACE_TEMPLATES, getDefaultTemplate, getTemplateById } from "@/Db/WorkspaceTemplates";
import { RandomSlugWords } from "@/lib/randomSlugWords";
import { useNavigate } from "@tanstack/react-router";
import { FolderIcon, LoaderIcon, XIcon } from "lucide-react";
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
  const [selectedFileSystem, setSelectedFileSystem] = useState<DiskType>(Disk.defaultDiskType);
  const [selectedDirectory, setSelectedDirectory] = useState<FileSystemDirectoryHandle | null>(null);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(getDefaultTemplate().id);

  const defaultValue = useMemo(() => RandomSlugWords() /*nanoid()*/, []);
  const navigate = useNavigate();

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      void navigate({ to: "/" });
      // Reset state when closing
      setSelectedFileSystem(Disk.defaultDiskType);
      setSelectedDirectory(null);
      setDirectoryError(null);
      setSelectedTemplate(getDefaultTemplate().id);
    }
  };

  const handleSelectDirectory = async () => {
    try {
      setDirectoryError(null);
      if (!("showDirectoryPicker" in window)) {
        throw new Error("Directory picker not supported in this browser");
      }

      const handle = await (window as any).showDirectoryPicker({
        mode: "readwrite",
        startIn: "documents",
      });

      setSelectedDirectory(handle);
    } catch (error: any) {
      if (error.name === "AbortError") {
        // User cancelled the picker
        return;
      }
      setDirectoryError(error.message || "Failed to select directory");
    }
  };

  const handleClearDirectory = () => {
    setSelectedDirectory(null);
    setDirectoryError(null);
  };

  const handleFileSystemChange = (value: DiskType) => {
    setSelectedFileSystem(value);
    if (value !== "OpFsDirMountDisk") {
      setSelectedDirectory(null);
      setDirectoryError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const workspaceName = formData.get("workspaceName") as string;
    const fileSystem = formData.get("fileSystem") as DiskType;
    const templateId = formData.get("template") as string;

    // Validate directory selection for OpFsDirMountDisk
    if (fileSystem === "OpFsDirMountDisk" && !selectedDirectory) {
      setDirectoryError("Please select a directory");
      return;
    }

    // Get the selected template
    const template = getTemplateById(templateId) || getDefaultTemplate();

    setPending(true);
    try {
      let workspace: Workspace;

      if (fileSystem === "OpFsDirMountDisk" && selectedDirectory) {
        // Create workspace with directory-mounted OPFS
        const workspaceDAO = await WorkspaceDAO.CreateNewWithDiskType({ name: workspaceName, diskType: fileSystem });
        const disk = workspaceDAO.disk.toModel() as OpFsDirMountDisk;
        await disk.setDirectoryHandle(selectedDirectory);
        workspace = workspaceDAO.toModel();
        await workspace.newFiles(Object.entries(template.seedFiles).map(([path, content]) => [path as any, content]));
      } else {
        workspace = await Workspace.CreateNew(workspaceName, template.seedFiles, fileSystem);
      }

      setPending(false);
      setIsOpen(false);
      void navigate({ to: String(workspace.home()) });
    } catch (error: any) {
      setPending(false);
      setDirectoryError(error.message || "Failed to create workspace");
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {/* 1. Give the form a unique ID */}
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[28rem] max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>New Workspace</DialogTitle>
          <DialogDescription>Create A New Workspace</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="gap-4 flex flex-col">
          <div className="grid gap-4 min-w-0">
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
              <Label htmlFor="template-1">Template</Label>
              <Select name="template" value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Choose a template"></SelectValue>
                </SelectTrigger>
                <SelectContent id="template-1">
                  {WORKSPACE_TEMPLATES.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex flex-col items-start w-full min-w-0 text-start">
                        <span className="font-medium truncate w-full">{template.name}</span>
                        <span className="text-sm text-muted-foreground w-full">{template.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3">
              <Label htmlFor="fileSystem-1">File System</Label>
              <Select name="fileSystem" defaultValue={Disk.defaultDiskType} onValueChange={handleFileSystemChange}>
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
            {selectedFileSystem === "OpFsDirMountDisk" && (
              <div className="grid gap-3">
                <Label htmlFor="directory-1">Directory</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSelectDirectory}
                    disabled={isPending}
                    className="flex-1"
                  >
                    <FolderIcon className="mr-2 h-4 w-4" />
                    {selectedDirectory ? selectedDirectory.name : "Select Directory"}
                  </Button>
                  {selectedDirectory && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleClearDirectory}
                      disabled={isPending}
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {directoryError && <p className="text-sm text-red-500">{directoryError}</p>}
              </div>
            )}
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
