import { Alert, AlertDescription, AlertTitle } from '@r/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { AlertCircle } from 'lucide-react';
import { useState } from 'react';

import { Route } from '#/routes/_auth/videos/$id';
import { normalizeApiFailedMessage, query } from '#/services/api';
import { VideoEditDialog } from '../components/video-edit-dialog';
import { ChatPanel } from './chat-panel';
import { DetailHeader, DetailHeaderSkeleton, VideoPanelSkeleton } from './components';
import { TranscriptionPanel } from './transcription-panel';
import { VideoPanel } from './video-panel';

export function VideoDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const videoQuery = useQuery(query.videos.check.queryOptions({ params: { id } }));
  const [editOpen, setEditOpen] = useState(false);

  if (!videoQuery.isLoading && (videoQuery.error || !videoQuery.data?.data)) {
    return (
      <main className="flex min-h-(--content-min-height) flex-col bg-muted/20">
        <DetailHeaderSkeleton />
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <Alert variant="destructive" className="max-w-lg">
            <AlertCircle />
            <AlertTitle>视频加载失败</AlertTitle>
            <AlertDescription>{normalizeApiFailedMessage(videoQuery.error) || '无法获取视频详情，请稍后重试'}</AlertDescription>
          </Alert>
        </div>
      </main>
    );
  }

  const video = videoQuery.data?.data;

  return (
    <main className="flex h-(--content-min-height) min-h-140 flex-col overflow-x-auto bg-muted/20">
      {video ? <DetailHeader video={video} onBack={() => navigate({ to: '/videos' })} /> : <DetailHeaderSkeleton />}
      <div className="grid min-h-0 min-w-240 flex-1 grid-cols-[minmax(400px,0.8fr)_minmax(520px,1.2fr)] xl:min-w-280 xl:grid-cols-[minmax(280px,0.7fr)_minmax(320px,0.85fr)_minmax(520px,1.45fr)]">
        <div className="grid h-full min-h-0 min-w-100 grid-rows-[400px_minmax(320px,1fr)] overflow-y-auto xl:contents">
          {video ? <VideoPanel video={video} onEdit={() => setEditOpen(true)} /> : <VideoPanelSkeleton />}
          <TranscriptionPanel videoId={id} />
        </div>
        <ChatPanel key={id} videoId={id} />
      </div>
      {video ? (
        <VideoEditDialog
          video={video}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSaved={(savedVideo) => {
            queryClient.setQueryData(query.videos.check.queryKey({ params: { id } }), { code: 0, message: 'ok', data: savedVideo });
            void queryClient.invalidateQueries({ queryKey: query.videos.list.queryKey() });
          }}
        />
      ) : null}
    </main>
  );
}
