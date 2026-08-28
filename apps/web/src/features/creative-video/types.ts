import type { Edge, Node, Viewport } from '@xyflow/react';

export type PromptNodeData = {
  kind: 'prompt';
  prompt: string;
};

export type ImageNodeData = {
  kind: 'image';
  imageUrl: string | null;
  fileName?: string;
  /** 作为生成视频的首帧还是尾帧 */
  frame: 'first_frame' | 'last_frame';
};

export type GenerationParameters = {
  model: string;
  resolution: string;
  ratio: string;
  duration: number;
  seed?: number;
  audio: boolean;
};

export type GenerationTaskState = {
  taskId: string;
  status: WanxiangVideoTaskStatus;
  videoUrl: string | null;
  reason: string | null;
};

export type GenerationNodeData = {
  kind: 'generation';
  parameters: GenerationParameters;
  task: GenerationTaskState | null;
};

export type VideoWorkspaceNodeData = PromptNodeData | ImageNodeData | GenerationNodeData;

export type VideoWorkspaceNode = Node<VideoWorkspaceNodeData>;

export type VideoWorkspaceEdge = Edge;

export type VideoWorkspaceCanvas = {
  nodes: VideoWorkspaceNode[];
  edges: VideoWorkspaceEdge[];
  viewport: Viewport | null;
};

/** 创作空间列表项（与 list 接口返回对齐） */
export type VideoWorkspaceItem = {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string | null;
};

export const DEFAULT_WORKSPACE_NAME = '默认创作空间';

/** 连线 handle 标识：生成节点仅保留唯一输入 handle（提示词与图片均连入） */
export const PROMPT_SOURCE_HANDLE = 'prompt';
export const IMAGE_SOURCE_HANDLE = 'image';
export const PROMPT_TARGET_HANDLE = 'prompt';

/** 图片节点帧角色选项 */
export const IMAGE_FRAME_OPTIONS = [
  { label: '首帧', value: 'first_frame' },
  { label: '尾帧', value: 'last_frame' },
] as const;

/** 画布保存状态 */
export type CanvasSaveStatus = 'idle' | 'saving' | 'saved';

/** 与后端 WanxiangVideoTaskStatus 对齐 */
export const WANXIANG_TASK_STATUS = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  CANCELED: 'CANCELED',
  UNKNOWN: 'UNKNOWN',
} as const;

export type WanxiangVideoTaskStatus = (typeof WANXIANG_TASK_STATUS)[keyof typeof WANXIANG_TASK_STATUS];

export const GENERATION_DEFAULT_PARAMETERS: GenerationParameters = {
  model: 'wan3.0-video',
  resolution: '1080P',
  ratio: 'adaptive',
  duration: 5,
  audio: true,
};

export const GENERATION_MODEL_OPTIONS = [
  { label: '万相 3.0', value: 'wan3.0-video' },
  { label: '万相 3.0 Prime', value: 'wan3.0-video-prime' },
];

export const GENERATION_RESOLUTION_OPTIONS = ['1080P', '720P', '480P'].map((value) => ({ label: value, value }));

export const GENERATION_RATIO_OPTIONS = ['adaptive', '16:9', '4:3', '1:1', '3:4', '9:16'].map((value) => ({ label: value, value }));

export const GENERATION_DURATION_OPTIONS = [2, 3, 4, 5, 6, 8, 10, 15, 20, 25, 30].map((value) => ({ label: `${value}s`, value: String(value) }));

export function isGenerationNodeData(data: VideoWorkspaceNodeData): data is GenerationNodeData {
  return data.kind === 'generation';
}

export function isActiveTaskStatus(status: WanxiangVideoTaskStatus) {
  return status === WANXIANG_TASK_STATUS.PENDING || status === WANXIANG_TASK_STATUS.RUNNING;
}
