import { ClientDb } from "@/data/db/DBInstance";
import { HistoryDB } from "@/editors/history/HistoryDB";
import { NotFoundError } from "@/lib/errors/errors";
import { SWWStore } from "@/lib/service-worker/SWWStore";
import { Workspace } from "@/workspace/Workspace";
import graymatter from "gray-matter";
import { marked } from "marked";

export async function handleMarkdownRender(
  request: Request,
  workspaceName: string,
  documentId: string,
  editId: number
) {
  console.log(`Handling markdown render for workspace: ${workspaceName}, document: ${documentId}, edit: ${editId}`);
  const workspace = await SWWStore.tryWorkspace(workspaceName).then((w) => w.initNoListen());
  if (!workspace) throw new NotFoundError("Workspace not found");

  const cache = await Workspace.newCache(workspaceName).getCache();
  const cached = await cache.match(request); //c.req.raw
  if (cached) {
    console.log(`Cache hit for markdown render: ${editId}`);
    return cached;
  }

  // Get edit from database to check for existing preview blob
  const edit = await ClientDb.historyDocs.get(editId);
  if (!edit) {
    console.error(`Edit not found: ${editId}`);
    throw new NotFoundError("Edit not found");
  }

  let htmlContent: string;

  // Check if edit already has preview blob
  if (edit.preview) {
    console.log(`Using existing preview blob for edit: ${editId}`);
    htmlContent = await edit.preview.text();
  } else {
    console.log(`Generating new HTML for edit: ${editId}`);

    // Create HistoryDB instance and reconstruct document
    const historyDB = new HistoryDB();
    const markdownContent = await historyDB.reconstructDocument({ edit_id: editId });
    // Render markdown to HTML
    htmlContent = await marked(graymatter(markdownContent).content);
    // Store rendered HTML in edit.preview Blob field
    await historyDB.updatePreviewForEditId(editId, new Blob([htmlContent], { type: "text/html" }));
    historyDB.tearDown();
  }

  await cache.put(
    request,
    new Response(htmlContent, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  );

  // return c.body(htmlContent);
  // return htmlContent;
  return new Response(htmlContent, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
