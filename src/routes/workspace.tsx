import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/workspace')({
  component: WorkspaceLayout,
})

function WorkspaceLayout() {
  return <Outlet />
}