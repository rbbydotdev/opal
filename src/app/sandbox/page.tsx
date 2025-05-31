"use client";
import { SidebarDndList } from "@/components/ui/SidebarDndList";

export default function Page() {
  return (
    <div className="w-full h-full items-center flex justify-center m-auto">
      <div className="bg-blue-200 w-96 h-96">
        <SidebarDndList storageKey="dnd-list-example">
          <div className="w-96 h-12 bg-green-500" dnd-id="green"></div>
          <div className="w-96 h-12 bg-orange-500" dnd-id="orange"></div>
          <div className="w-96 h-12 bg-red-500" dnd-id="red"></div>
        </SidebarDndList>
      </div>
    </div>
  );
}
