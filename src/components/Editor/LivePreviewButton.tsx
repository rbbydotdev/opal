import { getPreviewPaneElement } from "@/app/EditorSidebarLayout";
import { useScrollSync } from "@/components/ScrollSync";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

export function LivePreviewButton({ disabled }: { disabled?: boolean }) {
  const handlePreviewPane = () => {
    const previewPane = getPreviewPaneElement();
    if (previewPane) {
      console.log(previewPane);
      previewPane.innerHTML = `<iframe src="${previewURL}" style="width:100%;height:100%;" />`;
      // previewPane.classList.toggle("hidden");
    }
  };
  const { previewURL } = useScrollSync();
  return disabled ? (
    <Button size="sm" className="opacity-70" disabled={disabled}>
      Live Preview <Zap className="!text-primary-foreground" />
    </Button>
  ) : (
    <Button size="sm" className="pointer-events-auto" onClick={handlePreviewPane}>
      Live Preview <Zap className="!text-primary-foreground" />
    </Button>
    // <Button size="sm" className="pointer-events-auto" asChild>
    //   <Link to={previewURL} target="_blank">
    //     Live Preview <Zap className="!text-primary-foreground" />
    //   </Link>
    // </Button>
  );
}
