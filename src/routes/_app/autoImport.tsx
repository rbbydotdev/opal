import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/autoImport')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_app/autoImport"!</div>
}
