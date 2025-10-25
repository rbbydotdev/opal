export function sessionIdParam({ sessionId }: { sessionId: string }) {
  const searchParams = new URLSearchParams();
  searchParams.set("sessionId", sessionId);
  return searchParams.toString();
}

export function workspacePathSessionId({ workspaceId, filePath }: { workspaceId: string; filePath: string }): string {
  return `${workspaceId}${filePath}`;
}