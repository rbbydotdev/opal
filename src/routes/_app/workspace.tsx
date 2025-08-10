import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/workspace')({
  component: WorkspaceLayout,
})

function WorkspaceLayout() {
  return <Outlet />
}