import { toast } from '@r/ui';
import type { TuyauError } from '@tuyau/core/client';
import type { Viewport } from '@xyflow/react';
import { createWithEqualityFn } from 'zustand/traditional';

import { client, normalizeApiFailedMessage, urlFor } from '#/services/api';
import { getToken } from '#/shared/token';
import { createUuid } from '#/shared/uuid';
import {
  DEFAULT_WORKSPACE_NAME,
  FIRST_FRAME_TARGET_HANDLE,
  GENERATION_DEFAULT_PARAMETERS,
  type GenerationTaskState,
  isActiveTaskStatus,
  LAST_FRAME_TARGET_HANDLE,
  PROMPT_TARGET_HANDLE,
  type VideoWorkspaceEdge,
  type VideoWorkspaceItem,
  type VideoWorkspaceNode,
  type VideoWorkspaceNodeData,
} from './types';

const CURRENT_WORKSPACE_STORAGE_KEY = 'video-workspace.current-id';
const NODE_OFFSET_STEP = 28;

/** 最近一次成功保存的画布序列化（模块级，不参与渲染） */
let lastSavedSerialized: string | null = null;
let addNodeIndex = 0;

function failedMessage(error: unknown, fallback: string) {
  return normalizeApiFailedMessage(error as TuyauError) || fallback;
}

function centerPosition(viewport: Viewport | null, index: number) {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const offset = index * NODE_OFFSET_STEP;
  if (!viewport) return { x: cx + offset, y: cy + offset };
  return { x: (cx - viewport.x) / viewport.zoom + offset, y: (cy - viewport.y) / viewport.zoom + offset };
}

export type CreativeVideoStore = {
  // 创作空间
  workspaces: VideoWorkspaceItem[];
  workspacesLoading: boolean;
  currentId: string | null;
  initWorkspaces: () => Promise<void>;
  selectWorkspace: (id: string) => void;
  createWorkspace: (name: string) => Promise<string>;
  renameWorkspace: (id: string, name: string) => Promise<void>;
  removeWorkspace: (id: string) => Promise<void>;

  // 画布
  nodes: VideoWorkspaceNode[];
  edges: VideoWorkspaceEdge[];
  viewport: Viewport | null;
  saveStatus: 'idle' | 'saving' | 'saved';
  canvasLoaded: boolean;
  loadCanvas: (workspaceId: string) => Promise<void>;
  setNodes: (updater: (snapshot: VideoWorkspaceNode[]) => VideoWorkspaceNode[]) => void;
  setEdges: (updater: (snapshot: VideoWorkspaceEdge[]) => VideoWorkspaceEdge[]) => void;
  setViewport: (viewport: Viewport | null) => void;
  updateNodeData: (nodeId: string, patch: Partial<VideoWorkspaceNodeData>) => void;
  addNode: (kind: 'prompt' | 'image' | 'generation') => void;
  deleteNode: (nodeId: string) => void;
  updateNodeTask: (nodeId: string, task: GenerationTaskState) => void;
  generate: (nodeId: string) => Promise<void>;
  abandon: (nodeId: string) => Promise<void>;
  flushCanvas: () => Promise<void>;
  flushCanvasKeepalive: () => void;
};

export const useCanvasStore = createWithEqualityFn<CreativeVideoStore>()(
  (set, get) => ({
    workspaces: [],
    workspacesLoading: false,
    currentId: null,
    nodes: [],
    edges: [],
    viewport: null,
    saveStatus: 'idle',
    canvasLoaded: false,

    initWorkspaces: async () => {
      set({ workspacesLoading: true });
      try {
        let workspaces = ((await client.api.videoWorkspaces.list({})).data ?? []) as VideoWorkspaceItem[];
        if (workspaces.length === 0) {
          // 首次进入无空间时自动创建默认空间
          const created = await client.api.videoWorkspaces.create({ body: { name: DEFAULT_WORKSPACE_NAME } });
          workspaces = ((await client.api.videoWorkspaces.list({})).data ?? []) as VideoWorkspaceItem[];
          const id = String(created.data.id);
          if (typeof window !== 'undefined') window.localStorage.setItem(CURRENT_WORKSPACE_STORAGE_KEY, id);
          set({ workspaces, currentId: id });
        } else {
          const storedId = typeof window !== 'undefined' ? window.localStorage.getItem(CURRENT_WORKSPACE_STORAGE_KEY) : null;
          const currentId = storedId && workspaces.some((item) => String(item.id) === storedId) ? storedId : String(workspaces[0].id);
          set({ workspaces, currentId });
        }
      } catch {
        // 列表加载失败不阻塞画布使用
      } finally {
        set({ workspacesLoading: false });
      }
    },

    selectWorkspace: (id) => {
      set({ currentId: id });
      if (typeof window !== 'undefined') window.localStorage.setItem(CURRENT_WORKSPACE_STORAGE_KEY, id);
    },

    createWorkspace: async (name) => {
      const response = await client.api.videoWorkspaces.create({ body: { name } });
      const workspaces = ((await client.api.videoWorkspaces.list({})).data ?? []) as VideoWorkspaceItem[];
      set({ workspaces });
      return String(response.data.id);
    },

    renameWorkspace: async (id, name) => {
      await client.api.videoWorkspaces.rename({ params: { id }, body: { name } });
      const workspaces = ((await client.api.videoWorkspaces.list({})).data ?? []) as VideoWorkspaceItem[];
      set({ workspaces });
    },

    removeWorkspace: async (id) => {
      await client.api.videoWorkspaces.remove({ params: { id } });
      let workspaces = ((await client.api.videoWorkspaces.list({})).data ?? []) as VideoWorkspaceItem[];
      let currentId = get().currentId === id ? (workspaces[0] ? String(workspaces[0].id) : null) : get().currentId;
      if (workspaces.length === 0) {
        // 删除最后一个空间后自动补建默认空间
        const created = await client.api.videoWorkspaces.create({ body: { name: DEFAULT_WORKSPACE_NAME } });
        workspaces = ((await client.api.videoWorkspaces.list({})).data ?? []) as VideoWorkspaceItem[];
        currentId = String(created.data.id);
      }
      set({ workspaces, currentId });
      if (currentId && typeof window !== 'undefined') window.localStorage.setItem(CURRENT_WORKSPACE_STORAGE_KEY, currentId);
    },

    loadCanvas: async (workspaceId) => {
      set({ canvasLoaded: false, nodes: [], edges: [], viewport: null, saveStatus: 'idle' });
      try {
        const response = await client.api.videoWorkspaces.show({ params: { id: workspaceId } });
        const canvas = response.data.canvas;
        lastSavedSerialized = JSON.stringify({ nodes: canvas.nodes ?? [], edges: canvas.edges ?? [], viewport: canvas.viewport ?? null });
        set({
          nodes: canvas.nodes as unknown as VideoWorkspaceNode[],
          edges: canvas.edges as unknown as VideoWorkspaceEdge[],
          viewport: (canvas.viewport ?? null) as unknown as Viewport | null,
          canvasLoaded: true,
          saveStatus: 'saved',
        });
      } catch {
        set({ canvasLoaded: false, saveStatus: 'saved' });
      }
    },

    setNodes: (updater) => set((state) => ({ nodes: updater(state.nodes) })),
    setEdges: (updater) => set((state) => ({ edges: updater(state.edges) })),
    setViewport: (viewport) => set({ viewport }),

    updateNodeData: (nodeId, patch) =>
      set((state) => ({
        nodes: state.nodes.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, ...patch } as VideoWorkspaceNodeData } : node)),
      })),

    addNode: (kind) => {
      const { currentId, nodes, viewport } = get();
      if (!currentId) return;
      const id = createUuid();
      const position = centerPosition(viewport, addNodeIndex++);
      const node: VideoWorkspaceNode =
        kind === 'prompt'
          ? { id, type: 'prompt', position, data: { kind: 'prompt', prompt: '' } }
          : kind === 'image'
            ? { id, type: 'image', position, data: { kind: 'image', imageUrl: null } }
            : { id, type: 'generation', position, data: { kind: 'generation', parameters: { ...GENERATION_DEFAULT_PARAMETERS }, task: null } };
      set({ nodes: [...nodes, node] });
    },

    deleteNode: (nodeId) =>
      set((state) => ({
        nodes: state.nodes.filter((node) => node.id !== nodeId),
        edges: state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      })),

    updateNodeTask: (nodeId, task) =>
      set((state) => ({
        nodes: state.nodes.map((node) => (node.id === nodeId && node.data.kind === 'generation' ? { ...node, data: { ...node.data, task } } : node)),
      })),

    flushCanvas: async () => {
      const { currentId, nodes, edges, viewport, canvasLoaded } = get();
      if (!currentId || !canvasLoaded) return;
      const canvas = { nodes, edges, viewport };
      const serialized = JSON.stringify(canvas);
      if (serialized === lastSavedSerialized) {
        set({ saveStatus: 'saved' });
        return;
      }
      set({ saveStatus: 'saving' });
      try {
        await client.api.videoWorkspaces.saveCanvas({ params: { id: currentId }, body: canvas });
        lastSavedSerialized = serialized;
        set({ saveStatus: 'saved' });
      } catch {
        // 保存失败不阻塞交互，下一个定时周期会重试
        set({ saveStatus: 'saved' });
      }
    },

    flushCanvasKeepalive: () => {
      const { currentId, nodes, edges, viewport, canvasLoaded } = get();
      if (!currentId || !canvasLoaded) return;
      const serialized = JSON.stringify({ nodes, edges, viewport });
      if (serialized === lastSavedSerialized) return;
      const token = getToken();
      void fetch(urlFor('video_workspaces.save_canvas', { id: currentId }), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: serialized,
        keepalive: true,
      });
    },

    generate: async (nodeId) => {
      const workspaceId = get().currentId;
      if (!workspaceId) return;
      const state = get();
      const target = state.nodes.find((node) => node.id === nodeId);
      if (target?.data.kind !== 'generation') return;

      const promptEdge = state.edges.find((edge) => edge.target === nodeId && edge.targetHandle === PROMPT_TARGET_HANDLE);
      const promptNode = promptEdge ? state.nodes.find((node) => node.id === promptEdge.source) : undefined;
      const prompt = promptNode?.data.kind === 'prompt' ? (promptNode.data.prompt ?? '').trim() : '';
      if (!promptEdge || !prompt) {
        toast.add({ type: 'warning', description: '请先连接提示词节点并填写提示词' });
        return;
      }

      const media: Array<{ type: 'first_frame' | 'last_frame'; url: string }> = [];
      for (const [handle, type] of [
        [FIRST_FRAME_TARGET_HANDLE, 'first_frame'],
        [LAST_FRAME_TARGET_HANDLE, 'last_frame'],
      ] as const) {
        const edge = state.edges.find((item) => item.target === nodeId && item.targetHandle === handle);
        const imageNode = edge ? state.nodes.find((item) => item.id === edge.source) : undefined;
        if (imageNode && imageNode.data.kind === 'image' && imageNode.data.imageUrl) {
          media.push({ type, url: imageNode.data.imageUrl });
        }
      }

      // 提交生成前 flush 未保存画布，确保节点 id 已落库（后端按画布节点校验）
      await get().flushCanvas();

      const node = get().nodes.find((item) => item.id === nodeId);
      if (node?.data.kind !== 'generation') return;
      const parameters = node.data.parameters;
      try {
        const response = await client.api.videoWorkspaces.generate({
          params: { id: workspaceId, nodeId },
          body: {
            model: parameters.model as 'wan3.0-video' | 'wan3.0-video-prime',
            input: { prompt, media: media.length > 0 ? media : undefined },
            parameters: {
              resolution: parameters.resolution as '1080P' | '720P' | '480P',
              ratio: parameters.ratio as 'adaptive' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16',
              duration: parameters.duration,
              ...(parameters.seed !== undefined ? { seed: parameters.seed } : {}),
              audio: parameters.audio,
            },
          },
        });
        const task = response.data;
        get().updateNodeTask(nodeId, { taskId: task.taskId, status: task.status, videoUrl: task.videoUrl, reason: task.reason });
        toast.add({ type: 'success', description: '生成任务已提交' });
      } catch (error) {
        toast.add({ type: 'error', description: failedMessage(error, '生成失败') });
      }
    },

    abandon: async (nodeId) => {
      const workspaceId = get().currentId;
      if (!workspaceId) return;
      const node = get().nodes.find((item) => item.id === nodeId);
      if (node?.data.kind !== 'generation' || !node?.data.task) return;
      try {
        const response = await client.api.videoWorkspaces.abandonTask({ params: { id: workspaceId, taskId: node.data.task.taskId } });
        const task = response.data;
        get().updateNodeTask(nodeId, { taskId: task.taskId, status: task.status, videoUrl: task.videoUrl, reason: task.reason });
        toast.add({ type: 'success', description: '已放弃生成任务' });
      } catch (error) {
        toast.add({ type: 'error', description: failedMessage(error, '放弃失败') });
      }
    },
  }),
  Object.is,
);

// ---- 派生选择器（组件按需订阅，避免无意义重渲染） ----

export const selectCurrentWorkspace = (state: CreativeVideoStore) => state.workspaces.find((item) => String(item.id) === state.currentId) ?? null;

export const selectWorkspaceId = (state: CreativeVideoStore) => {
  const current = selectCurrentWorkspace(state);
  return current ? String(current.id) : null;
};

export const selectNodeHasActiveTask = (nodeId: string) => (state: CreativeVideoStore) => {
  const node = state.nodes.find((item) => item.id === nodeId);
  return node?.data.kind === 'generation' && node.data.task ? isActiveTaskStatus(node.data.task.status) : false;
};

/** 生成节点的提示词就绪 / 首尾帧连接状态（布尔派生，仅在变化时触发重渲染） */
export const selectGenerationNodeConnections = (nodeId: string) => (state: CreativeVideoStore) => {
  const promptSourceId = state.edges.find((edge) => edge.target === nodeId && edge.targetHandle === PROMPT_TARGET_HANDLE)?.source;
  const promptNode = promptSourceId ? state.nodes.find((node) => node.id === promptSourceId) : undefined;
  const promptReady = promptNode?.data.kind === 'prompt' ? (promptNode.data.prompt ?? '').trim().length > 0 : false;
  const hasFirstFrame = state.edges.some((edge) => edge.target === nodeId && edge.targetHandle === FIRST_FRAME_TARGET_HANDLE);
  const hasLastFrame = state.edges.some((edge) => edge.target === nodeId && edge.targetHandle === LAST_FRAME_TARGET_HANDLE);
  return { promptReady, hasFirstFrame, hasLastFrame };
};

/** 进行中的任务集合（Map：nodeId -> task）；配合 activeTasksEqual 只在任务集合变化时通知订阅者 */
export const selectActiveTasks = (state: CreativeVideoStore) => {
  const map = new Map<string, GenerationTaskState>();
  for (const node of state.nodes) {
    if (node.data.kind === 'generation' && node.data.task && isActiveTaskStatus(node.data.task.status)) {
      map.set(node.id, node.data.task);
    }
  }
  return map;
};

export function activeTasksEqual(a: Map<string, GenerationTaskState>, b: Map<string, GenerationTaskState>) {
  if (a.size !== b.size) return false;
  for (const [key, task] of a) {
    if (b.get(key) !== task) return false;
  }
  return true;
}
