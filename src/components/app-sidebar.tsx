import { Calendar, ChevronDown, ChevronRight, Home, Inbox, Search, Settings } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from "@/components/ui/sidebar";

// Menu items.
const items = [
  {
    title: "Home",
    url: "#",
    icon: Home,
  },
  {
    title: "Inbox",
    url: "#",
    icon: Inbox,
  },
  {
    title: "Calendar",
    url: "#",
    icon: Calendar,
  },
  {
    title: "Search",
    url: "#",
    icon: Search,
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings,
  },
];

//fake data deeply nested file structure
type FileTreeFile = { name: string; type: "file" };
type FileTreeDir = { name: string; type: "dir"; children: Array<FileTreeFile | FileTreeDir> };
type FileTree = [FileTreeFile | FileTreeDir];

const fileTree: FileTree = [
  {
    name: "src",
    type: "dir",
    children: [
      {
        name: "app",
        type: "dir",
        children: [
          {
            name: "layout.tsx",
            type: "file",
          },
          {
            name: "page.tsx",
            type: "file",
          },
        ],
      },
      {
        name: "components",
        type: "dir",
        children: [
          {
            name: "lib",
            type: "dir",
            children: [],
          },
          {
            name: "app-sidebar.tsx",
            type: "file",
          },
          {
            name: "editor.tsx",
            type: "file",
          },
        ],
      },
    ],
  },
];
function FileTreeMenu({ fileTree }: { fileTree?: FileTree }) {
  if (!fileTree) return null;
  return fileTree.map((file) => (
    <Collapsible key={file.name}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton asChild>
            <a href={"#"} className="group">
              <ChevronDown className="group-data-[state=closed]:hidden" />
              <ChevronRight className="group-data-[state=open]:hidden" />
              <span>{file.name}</span>
            </a>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            <SidebarMenuButton asChild>
              <a href={"#"}>
                <span>{item.title}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  ));
}
export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <Collapsible key={item.title}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton asChild>
                        <a href={item.url} className="group">
                          <ChevronDown className="group-data-[state=closed]:hidden" />
                          <ChevronRight className="group-data-[state=open]:hidden" />
                          <item.icon />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuButton asChild>
                          <a href={item.url}>
                            <item.icon />
                            <span>{item.title}</span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
