import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/preview/$')({
  component: PreviewPage,
})

function PreviewPage() {
  const params = Route.useParams()
  
  return (
    <div className="w-full h-screen">
      <h1 className="text-2xl font-bold p-4">Preview</h1>
      <div className="p-4">
        {/* Preview content will go here based on the original preview pages */}
        Preview path: {params._splat}
      </div>
    </div>
  )
}