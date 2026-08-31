import { toast } from '@r/ui';
import type { TuyauError } from '@tuyau/core/client';
import type { Viewport } from '@xyflow/react';
import { createWithEqualityFn } from 'zustand/traditional';

import { client, normalizeApiFailedMessage, urlFor } from '#/services/api';
import { getToken } from '#/shared/token';
import { createUuid } from '#/shared/uuid';
import { migrateCanvas } from './canvas-migration';
import {
  CANVAS_VERSION,
  DEFAULT_WORKSPACE_NAME,
  GENERATION_DEFAULT_PARAMETERS,
  GENERATION_INPUT_HANDLE,
  type GenerationTaskState,
  isActiveTaskStatus,
  MAX_REFERENCE_IMAGES,
  type VideoWorkspaceEdge,
  type VideoWorkspaceItem,
  type VideoWorkspaceNode,
  type VideoWorkspaceNodeData,
} from './types';

const CURRENT_WORKSPACE_STORAGE_KEY = 'video-workspace.current-id';
const NODE_OFFSET_STEP = 28;

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
  version: number;
  saveStatus: 'idle' | 'saving' | 'saved';
  canvasLoaded: boolean;
  /** 画布内容自上次保存后是否有变化（仅节点/连线的增删改置脏；节点位置、视口等瞬态变化不置脏） */
  dirty: boolean;
  loadCanvas: (workspaceId: string) => Promise<void>;
  /** 标记画布内容已变更（仅节点/连线结构或数据变化时调用，触发下一次定时保存） */
  markDirty: () => void;
  setNodes: (updater: (snapshot: VideoWorkspaceNode[]) => VideoWorkspaceNode[]) => void;
  setEdges: (updater: (snapshot: VideoWorkspaceEdge[]) => VideoWorkspaceEdge[]) => void;
  setViewport: (viewport: Viewport | null) => void;
  /** 以当前连线为准重建各生成节点的图片素材列表（连线增删时调用）；保留已有角色，新连入图片默认作为参考图 */
  syncGenerationAssets: () => void;
  updateNodeData: (nodeId: string, patch: Partial<VideoWorkspaceNodeData>) => void;
  addNode: (kind: 'image' | 'generation') => void;
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
    version: CANVAS_VERSION,
    saveStatus: 'idle',
    canvasLoaded: false,
    dirty: false,

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
      set({ canvasLoaded: false, nodes: [], edges: [], viewport: null, version: CANVAS_VERSION, saveStatus: 'idle', dirty: false });
      try {
        const response = await client.api.videoWorkspaces.show({ params: { id: workspaceId } });
        const raw = response.data.canvas as unknown;
        const rawRecord = (raw ?? {}) as { version?: unknown; nodes?: unknown; edges?: unknown; viewport?: unknown };
        const canvas = migrateCanvas(raw);
        // 迁移是否改写画布内容（仅载入时一次性比较，不参与后续 flush）；若改写则置脏，下一次 flush 回写迁移结果。
        // 版本缺失/落后（后端此前未持久化 version）同样视为改写，回写时一并补全最新版本，避免每次载入重复迁移。
        const needsWriteBack =
          canvas.version !== rawRecord.version ||
          JSON.stringify(canvas.nodes) !== JSON.stringify(rawRecord.nodes ?? []) ||
          JSON.stringify(canvas.edges) !== JSON.stringify(rawRecord.edges ?? []);
        set({
          nodes: canvas.nodes,
          edges: canvas.edges,
          viewport: canvas.viewport,
          version: canvas.version,
          canvasLoaded: true,
          saveStatus: 'saved',
          dirty: needsWriteBack,
        });
      } catch {
        set({ canvasLoaded: false, saveStatus: 'saved' });
      }
    },

    markDirty: () => set({ dirty: true }),

    setNodes: (updater) => set((state) => ({ nodes: updater(state.nodes) })),
    setEdges: (updater) => set((state) => ({ edges: updater(state.edges) })),
    setViewport: (viewport) => set({ viewport }),

    syncGenerationAssets: () =>
      set((state) => {
        const sourcesByTarget = new Map<string, string[]>();
        for (const edge of state.edges) {
          if (edge.source && edge.target && edge.targetHandle === GENERATION_INPUT_HANDLE) {
            const list = sourcesByTarget.get(edge.target) ?? [];
            list.push(edge.source);
            sourcesByTarget.set(edge.target, list);
          }
        }
        return {
          dirty: true,
          nodes: state.nodes.map((node) => {
            if (node.data.kind !== 'generation') return node;
            const linked = sourcesByTarget.get(node.id) ?? [];
            const linkedSet = new Set(linked);
            const previous = node.data.assets;
            const roleByNodeId = new Map(previous.map((asset) => [asset.nodeId, asset.role]));
            // 保留已有素材的顺序与角色，新连入的图片追加到末尾并默认作为参考图
            const kept = previous.filter((asset) => linkedSet.has(asset.nodeId));
            const added = linked.filter((nodeId) => !roleByNodeId.has(nodeId)).map((nodeId) => ({ nodeId, role: 'reference_image' as const }));
            return { ...node, data: { ...node.data, assets: [...kept, ...added] } };
          }),
        };
      }),

    updateNodeData: (nodeId, patch) =>
      set((state) => ({
        dirty: true,
        nodes: state.nodes.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, ...patch } as VideoWorkspaceNodeData } : node)),
      })),

    addNode: (kind) => {
      const { currentId, nodes, viewport } = get();
      if (!currentId) return;
      const id = createUuid();
      const position = centerPosition(viewport, addNodeIndex++);
      const node: VideoWorkspaceNode =
        kind === 'image'
          ? { id, type: 'image', position, data: { kind: 'image', imageUrl: null } }
          : {
              id,
              type: 'generation',
              position,
              data: { kind: 'generation', parameters: { ...GENERATION_DEFAULT_PARAMETERS }, assets: [], task: null },
            };
      set({ dirty: true, nodes: [...nodes, node] });
    },

    deleteNode: (nodeId) =>
      set((state) => ({
        dirty: true,
        nodes: state.nodes
          .filter((node) => node.id !== nodeId)
          .map((node) => (node.data.kind === 'generation' ? { ...node, data: { ...node.data, assets: node.data.assets.filter((asset) => asset.nodeId !== nodeId) } } : node)),
        edges: state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      })),

    updateNodeTask: (nodeId, task) =>
      set((state) => ({
        dirty: true,
        nodes: state.nodes.map((node) => (node.id === nodeId && node.data.kind === 'generation' ? { ...node, data: { ...node.data, task } } : node)),
      })),

    flushCanvas: async () => {
      const { currentId, version, nodes, edges, viewport, canvasLoaded, dirty } = get();
      // 仅画布内容（节点/连线增删改）变化时才保存；节点位置、视口等瞬态变化不触发
      if (!currentId || !canvasLoaded || !dirty) return;
      const canvas = { version, nodes, edges, viewport };
      set({ saveStatus: 'saving' });
      try {
        await client.api.videoWorkspaces.saveCanvas({ params: { id: currentId }, body: canvas });
        set({ dirty: false, saveStatus: 'saved' });
      } catch {
        // 保存失败不阻塞交互，dirty 保持为 true，下一个定时周期会重试
        set({ saveStatus: 'saved' });
      }
    },

    flushCanvasKeepalive: () => {
      const { currentId, version, nodes, edges, viewport, canvasLoaded, dirty } = get();
      if (!currentId || !canvasLoaded || !dirty) return;
      const token = getToken();
      void fetch(urlFor('video_workspaces.save_canvas', { id: currentId }), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ version, nodes, edges, viewport }),
        keepalive: true,
      });
    },

    generate: async (nodeId) => {
      const workspaceId = get().currentId;
      if (!workspaceId) return;
      const state = get();
      const target = state.nodes.find((node) => node.id === nodeId);
      if (target?.data.kind !== 'generation') return;

      const prompt = (target.data.parameters.prompt ?? '').trim();
      if (!prompt) {
        toast.add({ type: 'warning', description: '请先填写提示词' });
        return;
      }

      const linkedSources = new Set(state.edges.filter((edge) => edge.target === nodeId && edge.targetHandle === GENERATION_INPUT_HANDLE).map((edge) => edge.source));
      const media: Array<{ type: 'first_frame' | 'last_frame' | 'reference_image'; url: string }> = [];
      let referenceCount = 0;
      let firstFrameCount = 0;
      let lastFrameCount = 0;
      for (const asset of target.data.assets ?? []) {
        if (!linkedSources.has(asset.nodeId)) continue;
        if (asset.role === 'reference_image' && referenceCount >= MAX_REFERENCE_IMAGES) continue;
        // 首/尾帧各至多 1 张（与后端 media 上限一致），超出部分跳过，防止生成请求被拒
        if (asset.role === 'first_frame' && firstFrameCount >= 1) continue;
        if (asset.role === 'last_frame' && lastFrameCount >= 1) continue;
        const imageNode = state.nodes.find((node) => node.id === asset.nodeId);
        if (imageNode?.data.kind === 'image' && imageNode.data.imageUrl) {
          if (asset.role === 'reference_image') referenceCount++;
          if (asset.role === 'first_frame') firstFrameCount++;
          if (asset.role === 'last_frame') lastFrameCount++;
          media.push({ type: asset.role, url: imageNode.data.imageUrl });
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
              ratio: parameters.ratio as '16:9' | '4:3' | '1:1' | '3:4' | '9:16',
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

/** 进行中生成任务的节点 id 集合（内部复用） */
function selectActiveGenerationNodeIds(state: CreativeVideoStore) {
  const ids = new Set<string>();
  for (const node of state.nodes) {
    if (node.data.kind === 'generation' && node.data.task && isActiveTaskStatus(node.data.task.status)) {
      ids.add(node.id);
    }
  }
  return ids;
}

/** 生成中的节点是否锁定（生成节点自身及其相连的图片节点），锁定期间禁止删除/修改 */
export const selectIsNodeLocked = (nodeId: string) => (state: CreativeVideoStore) => {
  const active = selectActiveGenerationNodeIds(state);
  if (active.has(nodeId)) return true;
  for (const edge of state.edges) {
    if ((active.has(edge.target) || active.has(edge.source)) && (edge.source === nodeId || edge.target === nodeId)) return true;
  }
  return false;
};

/** 与进行中生成任务相连的连线 id 集合（用于线条动画） */
export const selectGeneratingEdgeIds = (state: CreativeVideoStore) => {
  const active = selectActiveGenerationNodeIds(state);
  const ids = new Set<string>();
  for (const edge of state.edges) {
    if (active.has(edge.target) || active.has(edge.source)) ids.add(edge.id);
  }
  return ids;
};

/** 生成节点的提示词就绪状态（布尔派生，仅变化时触发重渲染） */
export const selectGenerationPromptReady = (nodeId: string) => (state: CreativeVideoStore) => {
  const node = state.nodes.find((item) => item.id === nodeId);
  return node?.data.kind === 'generation' ? (node.data.parameters.prompt ?? '').trim().length > 0 : false;
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
