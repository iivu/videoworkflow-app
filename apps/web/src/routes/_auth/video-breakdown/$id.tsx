import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/video-breakdown/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_auth/video-breakdown/$id"!</div>
}
