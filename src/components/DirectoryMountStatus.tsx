import { Button } from "@/components/ui/button";
import { OpFsDirMountDisk } from "@/Db/Disk";
import { AlertTriangleIcon, FolderIcon } from "lucide-react";
import { useEffect, useState } from "react";

interface DirectoryMountStatusProps {
  disk: OpFsDirMountDisk;
  onDirectorySelected?: (handle: FileSystemDirectoryHandle) => void;
}

export function DirectoryMountStatus({ disk, onDirectorySelected }: DirectoryMountStatusProps) {
  const [needsSelection, setNeedsSelection] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [lastKnownDirectory, setLastKnownDirectory] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      const needs = await disk.needsDirectorySelection();
      setNeedsSelection(needs);
      
      if (needs) {
        const metadata = await disk.getStoredMetadata();
        setLastKnownDirectory(metadata?.directoryName || null);
      }
    };

    checkStatus();
  }, [disk]);

  const handleSelectDirectory = async () => {
    try {
      setIsSelecting(true);
      const handle = await disk.selectDirectory();
      setNeedsSelection(false);
      onDirectorySelected?.(handle);
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Failed to select directory:", error);
      }
    } finally {
      setIsSelecting(false);
    }
  };

  if (!needsSelection) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-yellow-800">Directory Access Lost</h3>
          <p className="text-sm text-yellow-700 mt-1">
            This workspace was previously connected to a directory
            {lastKnownDirectory && ` "${lastKnownDirectory}"`}, but the connection was lost after the page 
            was reloaded. Please re-select the directory to continue working with your files.
          </p>
          <Button
            onClick={handleSelectDirectory}
            disabled={isSelecting}
            variant="outline"
            size="sm"
            className="mt-3 bg-white hover:bg-yellow-50 border-yellow-300"
          >
            <FolderIcon className="mr-2 h-4 w-4" />
            {isSelecting ? "Selecting..." : "Re-select Directory"}
          </Button>
        </div>
      </div>
    </div>
  );
}