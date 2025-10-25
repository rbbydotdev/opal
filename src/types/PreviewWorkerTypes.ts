export interface PreviewWorkerApi {
  renderFromMarkdownAndSnapshot(markdownContent: string): Promise<Blob>;
  renderAndSnapshot(editId: number): Promise<Blob>;
}

export type PreviewWorkerApiType = PreviewWorkerApi;