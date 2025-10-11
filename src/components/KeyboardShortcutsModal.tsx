import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IS_MAC } from "@/lib/isMac";
import { KeyboardIcon } from "lucide-react";
import React from "react";

interface KeyboardShortcut {
  action: string;
  keys: string[];
  section: "General" | "Editor" | "Navigation" | "Search" | "File Explorer";
  description?: string;
}

//TODO: make this configurable by user
const keyboardShortcuts: KeyboardShortcut[] = [
  {
    section: "General",
    action: "Spotlight Search",
    keys: [IS_MAC ? "⌘" : "Ctrl", "P"],
    description: "Filename and command Palette",
  },
  {
    section: "General",
    action: "Workspace Search",
    keys: [IS_MAC ? "⌘" : "Ctrl", "Shift", "F"],
    description: "Search file contents across workspaces",
  },
  {
    section: "Editor",
    action: "Editor Search",
    keys: [IS_MAC ? "⌘" : "Ctrl", "F"],
    description: "Search within current file",
  },
  {
    section: "Editor",
    action: "Editor View Mode",
    keys: [IS_MAC ? "⌘" : ";", ";"],
    description: "Switch between wysiwyg and view modes",
  },
  {
    section: "File Explorer",
    action: "Navigate Down",
    keys: ["↓"],
    description: "Move selection down in lists",
  },
  {
    section: "File Explorer",
    action: "Navigate Up",
    keys: ["↑"],
    description: "Move selection up in lists",
  },
  {
    section: "File Explorer",
    action: "Navigate Items",
    keys: ["Tab"],
    description: "Navigate between interactive elements",
  },
  {
    section: "File Explorer",
    action: "Navigate Items (Reverse)",
    keys: ["Shift", "Tab"],
    description: "Navigate backwards between elements",
  },
  {
    section: "General",
    action: "Close Modal/Search",
    keys: ["Escape"],
    description: "Close open dialogs and search bars",
  },
  {
    section: "Search",
    action: "Next Search Result",
    keys: ["Enter"],
    description: "Navigate to next search result",
  },
  {
    section: "Search",
    action: "Previous Search Result",
    keys: ["Shift", "Enter"],
    description: "Navigate to previous search result",
  },
  {
    section: "Search",
    action: "Replace",
    keys: ["Enter"],
    description: "Replace current match (in replace mode)",
  },
  {
    section: "Search",
    action: "Replace All",
    keys: [IS_MAC ? "⌘" : "Ctrl", "Enter"],
    description: "Replace all matches (in replace mode)",
  },
];

function KeyboardShortcutBadge({ keys }: { keys: string[] }) {
  return (
    <div className="flex items-center gap-1">
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            {key}
          </kbd>
          {index < keys.length - 1 && <span className="text-muted-foreground text-xs">+</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

export function KeyboardShortcutsModal({ children }: { children: React.ReactNode }) {
  // Group shortcuts by section
  const groupedShortcuts = keyboardShortcuts.reduce(
    (acc, shortcut) => {
      if (!acc[shortcut.section]) {
        acc[shortcut.section] = [];
      }
      acc[shortcut.section]!.push(shortcut);
      return acc;
    },
    {} as Record<string, KeyboardShortcut[]>
  );

  // Define section order for consistent display
  const sectionOrder = ["General", "Editor", "Navigation", "Search", "File Explorer"];

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyboardIcon className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-6">
          {sectionOrder.map((section) => {
            const shortcuts = groupedShortcuts[section];
            if (!shortcuts || shortcuts.length === 0) return null;

            return (
              <div key={section}>
                <h3 className="text-lg font-semibold mb-3 text-foreground">{section}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Action</TableHead>
                      <TableHead className="w-[200px]">Shortcut</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shortcuts.map((shortcut, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium font-mono text-sm">{shortcut.action}</TableCell>
                        <TableCell>
                          <KeyboardShortcutBadge keys={shortcut.keys} />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{shortcut.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
