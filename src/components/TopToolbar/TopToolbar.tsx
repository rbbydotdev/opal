import { Button } from "@/components/ui/button";

export function TopToolbar() {
  return (
    <div className="bg-background h-12 flex items-center justify-between px-2 border-b border-border gap-4">
      <div className="flex items-center gap-2">
        <Button size="sm">Button 1</Button>
        <Button size="sm">Button 2</Button>
        <Button size="sm">Button 3</Button>
      </div>
    </div>
  );
}
