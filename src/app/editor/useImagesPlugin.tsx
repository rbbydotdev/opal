import { ErrorPopupControl } from "@/components/ui/error-popup";
import { useWorkspaceRoute } from "@/context/WorkspaceContext";
import { BadRequestError, isError } from "@/lib/errors";
import { dirname } from "@/lib/paths2";
import { Workspace } from "@/workspace/Workspace";
import { imagePlugin } from "@mdxeditor/editor";
import { useEffect, useMemo, useState } from "react";

export function useImagesPlugin({ currentWorkspace }: { currentWorkspace: Workspace }) {
  const [imgs, setImgs] = useState<string[]>([]);

  const { path } = useWorkspaceRoute();
  useEffect(() => {
    return currentWorkspace.watchDiskIndex(() => {
      setImgs(currentWorkspace.getImages().map((i) => i));
    });
  }, [currentWorkspace]);
  return useMemo(
    () =>
      imagePlugin({
        imageAutocompleteSuggestions: imgs,
        imageUploadHandler: async (file: File) => {
          try {
            return currentWorkspace.uploadSingleImage(file, dirname(path ?? "/"));
          } catch (e) {
            console.error("image upload handler error");
            console.error(e);
            if (isError(e, BadRequestError)) {
              ErrorPopupControl.show({
                title: "Not a valid image",
                description: "Please upload a valid image file (png,gif,webp,jpg)",
              });
              return Promise.resolve(file.name ?? "");
            } else {
              throw e;
            }
          }
        },
      }),
    [currentWorkspace, imgs, path]
  );
}
