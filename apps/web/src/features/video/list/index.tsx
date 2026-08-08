import { Button, ButtonGroup } from '@r/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Download, History, Plus } from 'lucide-react';
import { useState } from 'react';
import { Pagination } from '#/components/pagination';
import { Route } from '#/routes/_auth/videos/index';
import { query } from '#/services/api';
import { EVENT_OPEN_CRAWLER_VIDEO_FORM_DIALOG, emitter } from '#/shared/mitt';
import { type VideoData, VideoEditDialog } from '../components/video-edit-dialog';
import { CrawlerTaskHistoryDialog } from './crawler-task-history-dialog';
import { CrawlerVideoFormDialog } from './crawler-video-form-dialog';
import { Empty } from './empty';
import { SearchForm } from './search-form';
import { VideoList } from './video-list';

export function VideoListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [taskHistoryOpen, setTaskHistoryOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoData>();
  const search = Route.useSearch();
  const searchFormKey = `${search.title}-${search.author}`;
  const { data, isLoading, error } = useQuery(query.videos.list.queryOptions({ query: search }));
  const isEmpty = !isLoading && !error && data?.data.list.length === 0;
  return (
    <section className="relative">
      <div className="absolute top-0 z-10 flex h-12 w-full items-center gap-2 overflow-x-auto border-b bg-background px-4">
        <SearchForm key={searchFormKey} />
        <ButtonGroup className="ml-auto" aria-label="视频提取操作">
          <Button variant="outline" aria-label="提取视频" onClick={() => emitter.emit(EVENT_OPEN_CRAWLER_VIDEO_FORM_DIALOG)}>
            <Download />
            <span className="hidden sm:inline">提取视频</span>
          </Button>
          <Button size="icon" variant="outline" aria-label="任务记录" title="任务记录" onClick={() => setTaskHistoryOpen(true)}>
            <History />
          </Button>
        </ButtonGroup>
        <Button aria-label="创建视频" onClick={() => navigate({ to: '/videos/create' })}>
          <Plus />
          <span className="hidden sm:inline">创建视频</span>
        </Button>
      </div>
      {isEmpty ? <Empty /> : <VideoList videos={data?.data.list || []} onEdit={(video) => setEditingVideo(video)} />}
      <Pagination
        className="w-fit shrink-0 rounded-full border bg-background px-2 py-1.5 shadow-lg sticky bottom-4 mt-4"
        size={search.size}
        currentPage={search.page}
        total={data?.data?.meta.total || 0}
        onPageChange={(page) => navigate({ to: '/videos', search: { ...search, page } })}
      />
      <CrawlerTaskHistoryDialog open={taskHistoryOpen} onOpenChange={setTaskHistoryOpen} />
      <CrawlerVideoFormDialog />
      {editingVideo ? (
        <VideoEditDialog
          video={editingVideo}
          open
          onOpenChange={(open) => {
            if (!open) setEditingVideo(undefined);
          }}
          onSaved={() => {
            setEditingVideo(undefined);
            void queryClient.invalidateQueries({ queryKey: query.videos.list.queryKey() });
          }}
        />
      ) : null}
    </section>
  );
}
