import { toast } from '@r/ui';
import { useEffect } from 'react';

import { client } from '#/services/api';
import { activeTasksEqual, selectActiveTasks, selectWorkspaceId, useCanvasStore } from '../../store';
import { type GenerationTaskState, isActiveTaskStatus, WANXIANG_TASK_STATUS } from '../../types';

/**
 * 数据组件：轮询进行中的生成任务，终态回写节点数据并提示。
 *
 * 通过自定义相等比较订阅任务集合：画布节点位置/参数等无关变更不会触发重渲染，
 * 仅当任务集合（新增/完成/删除）实际变化时才重启轮询。
 */
export function TaskPolling() {
  const workspaceId = useCanvasStore(selectWorkspaceId);
  const activeTasks = useCanvasStore(selectActiveTasks, activeTasksEqual);
  const updateNodeTask = useCanvasStore((state) => state.updateNodeTask);

  useEffect(() => {
    if (!workspaceId || activeTasks.size === 0) return;
    let cancelled = false;
    const pollOnce = async () => {
      for (const [nodeId, task] of activeTasks) {
        if (cancelled) return;
        try {
          const response = await client.api.videoWorkspaces.checkTask({ params: { id: workspaceId, taskId: task.taskId } });
          const data = response.data;
          if (!data) continue;
          const next: GenerationTaskState = { taskId: data.taskId, status: data.status, videoUrl: data.videoUrl, reason: data.reason };
          if (isActiveTaskStatus(next.status)) continue;
          updateNodeTask(nodeId, next);
          if (next.status === WANXIANG_TASK_STATUS.SUCCEEDED) {
            toast.add({ type: 'success', description: '视频生成完成' });
          } else if (next.status === WANXIANG_TASK_STATUS.FAILED) {
            toast.add({ type: 'error', description: next.reason || '视频生成失败' });
          } else if (next.status === WANXIANG_TASK_STATUS.CANCELED) {
            toast.add({ type: 'warning', description: '任务已放弃' });
          }
        } catch (error) {
          // 单次轮询失败跳过，下一轮重试
          console.error('TaskPolling pollOnce error', error);
        }
      }
    };
    void pollOnce();
    const timer = setInterval(() => void pollOnce(), 3000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [workspaceId, activeTasks, updateNodeTask]);

  return null;
}
