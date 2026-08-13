import { Alert, AlertDescription, AlertTitle } from '@r/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { useState } from 'react';

import { Route } from '#/routes/_auth/videos/$id';
import { normalizeApiFailedMessage, query } from '#/services/api';
import { VideoEditDialog } from '../components/video-edit-dialog';
import { ChatPanel } from './chat-panel';
import { VideoPanelSkeleton } from './components';
import { TranscriptionPanel } from './transcription-panel';
import { VideoPanel } from './video-panel';

export function VideoDetailPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const videoQuery = useQuery(query.videos.check.queryOptions({ params: { id } }));
  const [editOpen, setEditOpen] = useState(false);

  if (!videoQuery.isLoading && (videoQuery.error || !videoQuery.data?.data)) {
    return (
      <main className="flex min-h-(--content-min-height) items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-lg">
          <AlertCircle />
          <AlertTitle>视频加载失败</AlertTitle>
          <AlertDescription>{normalizeApiFailedMessage(videoQuery.error) || '无法获取视频详情，请稍后重试'}</AlertDescription>
        </Alert>
      </main>
    );
  }

  return (
    <main className="h-(--content-min-height) min-h-140 overflow-x-auto bg-muted/20">
      <div className="grid h-full min-w-240 grid-cols-[minmax(400px,0.8fr)_minmax(520px,1.2fr)] xl:min-w-280 xl:grid-cols-[minmax(280px,0.7fr)_minmax(320px,0.85fr)_minmax(520px,1.45fr)]">
        <div className="grid h-full min-h-0 min-w-100 grid-rows-[400px_minmax(320px,1fr)] overflow-y-auto xl:contents">
          {videoQuery.data?.data ? <VideoPanel video={videoQuery.data.data} onEdit={() => setEditOpen(true)} /> : <VideoPanelSkeleton />}
          <TranscriptionPanel videoId={id} />
        </div>
        <ChatPanel key={id} videoId={id} />
      </div>
      {videoQuery.data?.data ? (
        <VideoEditDialog
          video={videoQuery.data.data}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSaved={(video) => {
            queryClient.setQueryData(query.videos.check.queryKey({ params: { id } }), { code: 0, message: 'ok', data: video });
            void queryClient.invalidateQueries({ queryKey: query.videos.list.queryKey() });
          }}
        />
      ) : null}
    </main>
  );
}
