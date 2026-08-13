import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/video-breakdown/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_auth/video-breakdown/"!</div>
}
