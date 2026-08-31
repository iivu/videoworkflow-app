import type { VideoWorkspaceCanvas } from './types';
import { CANVAS_VERSION, LEGACY_CANVAS_VERSION } from './types';

type CanvasMigrator = (canvas: VideoWorkspaceCanvas) => VideoWorkspaceCanvas;

/**
 * 画布数据版本迁移器注册表：key 为待迁移的当前版本，value 将其迁移至下一版本（version + 1）。
 * 未来新增画布数据结构变更时：递增 types.CANVAS_VERSION 并在此注册对应迁移步骤。
 */
const canvasMigrators: Record<number, CanvasMigrator> = {
  1: migrateCanvasV1ToV2,
};

/**
 * 将任意来源的画布数据归一化，并依据画布配置的 version（缺失时视为 LEGACY_CANVAS_VERSION）
 * 与最新版本 CANVAS_VERSION，一级一级地迁移至最新版本（v1 → v2 → …）。
 */
export function migrateCanvas(canvas: unknown): VideoWorkspaceCanvas {
  let current = normalizeCanvas(canvas);
  while (current.version < CANVAS_VERSION) {
    const migrator = canvasMigrators[current.version];
    if (!migrator) break;
    current = migrator(current);
  }
  return current;
}

function normalizeCanvas(canvas: unknown): VideoWorkspaceCanvas {
  const raw = (canvas ?? {}) as Record<string, unknown>;
  return {
    version: readCanvasVersion(raw.version),
    nodes: (Array.isArray(raw.nodes) ? raw.nodes : []) as VideoWorkspaceCanvas['nodes'],
    edges: (Array.isArray(raw.edges) ? raw.edges : []) as VideoWorkspaceCanvas['edges'],
    viewport: (raw.viewport ?? null) as VideoWorkspaceCanvas['viewport'],
  };
}

function readCanvasVersion(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= LEGACY_CANVAS_VERSION ? value : LEGACY_CANVAS_VERSION;
}

/**
 * v1 → v2：移除提示词节点，将提示词并入其连向的生成节点参数；
 * 其余节点/连线原样保留，连线 handle 标识沿用历史值，无需改写。
 */
function migrateCanvasV1ToV2(canvas: VideoWorkspaceCanvas): VideoWorkspaceCanvas {
  const promptNodeIds = new Set<string>();
  for (const node of canvas.nodes) {
    if ((node.data as { kind?: unknown } | null)?.kind === 'prompt') promptNodeIds.add(node.id);
  }

  // 提示词按目标生成节点收集（连线规则保证同一生成节点至多连入一个提示词节点）
  const promptByTarget = new Map<string, string>();
  for (const edge of canvas.edges) {
    if (!edge.source || !promptNodeIds.has(edge.source)) continue;
    const sourceNode = canvas.nodes.find((node) => node.id === edge.source);
    const data = sourceNode?.data as { kind?: unknown; prompt?: unknown } | null;
    const prompt = typeof data?.prompt === 'string' ? data.prompt : '';
    if (edge.target) promptByTarget.set(edge.target, prompt);
  }

  // 移除提示词节点；生成节点统一补全 prompt（已有非空提示词优先，其次连入的提示词节点，最后空串）
  const nodes = canvas.nodes
    .filter((node) => !promptNodeIds.has(node.id))
    .map((node) => {
      if (node.data?.kind !== 'generation') return node;
      const parameters = node.data.parameters as { prompt?: unknown };
      const prompt = typeof parameters.prompt === 'string' && parameters.prompt.length > 0 ? parameters.prompt : (promptByTarget.get(node.id) ?? '');
      return { ...node, data: { ...node.data, parameters: { ...node.data.parameters, prompt } } };
    });

  const edges = canvas.edges.filter((edge) => !promptNodeIds.has(edge.source) && !promptNodeIds.has(edge.target));

  return { ...canvas, version: 2, nodes, edges };
}
