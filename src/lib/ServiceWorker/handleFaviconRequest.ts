import Identicon from "@/components/Identicon";
import { Workspace } from "@/Db/Workspace";
import React from "react";
import { renderToString } from "react-dom/server";
import { SWWStore } from "./SWWStore";

export async function handleFaviconRequest(event: FetchEvent): Promise<Response> {
  const referrerPath = new URL(event.request.referrer).pathname;
  Workspace.parseWorkspacePath(referrerPath);
  const { workspaceId } = Workspace.parseWorkspacePath(referrerPath);
  if (!workspaceId) {
    return fetch(event.request);
  }
  const workspace = await SWWStore.tryWorkspace(workspaceId);
  return new Response(
    renderToString(
      React.createElement(Identicon, {
        input: workspace.guid,
        size: 4,
      })
    ),
    {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}
