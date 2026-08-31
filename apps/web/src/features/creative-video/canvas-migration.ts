import type { GenerationImageAsset, GenerationImageRole, ImageNodeData, VideoWorkspaceCanvas } from './types';
import { CANVAS_VERSION, GENERATION_INPUT_HANDLE, LEGACY_CANVAS_VERSION } from './types';

type CanvasMigrator = (canvas: VideoWorkspaceCanvas) => VideoWorkspaceCanvas;

/**
 * 画布数据版本迁移器注册表：key 为待迁移的当前版本，value 将其迁移至下一版本（version + 1）。
 * 未来新增画布数据结构变更时：递增 types.CANVAS_VERSION 并在此注册对应迁移步骤。
 */
const canvasMigrators: Record<number, CanvasMigrator> = {
  1: migrateCanvasV1ToV2,
  2: migrateCanvasV2ToV3,
  3: migrateCanvasV3ToV4,
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

/**
 * v2 → v3：生成节点画幅移除 adaptive 选项，存量 adaptive 一律改写为默认 9:16。
 */
function migrateCanvasV2ToV3(canvas: VideoWorkspaceCanvas): VideoWorkspaceCanvas {
  const nodes = canvas.nodes.map((node) => {
    if (node.data?.kind !== 'generation') return node;
    const parameters = node.data.parameters as { ratio?: unknown };
    if (parameters.ratio !== 'adaptive') return node;
    return { ...node, data: { ...node.data, parameters: { ...node.data.parameters, ratio: '9:16' } } };
  });

  return { ...canvas, version: 3, nodes };
}

/**
 * v3 → v4：图片节点移除首/尾帧角色字段（只负责上传/选择）；
 * 生成节点新增图片素材配置 assets，按存量连线把已连入图片的原角色（first_frame/last_frame）迁移进来。
 *
 * 幂等兼容说明（后端此前未持久化 version，存量数据载入时会重复执行迁移链）：
 * - 生成节点已有 assets（v4 数据）时原样保留，仅做角色去重修正（首/尾帧至多各 1 张，超出降级为参考图），
 *   避免 v4 图片节点已无 frame 字段时被整体冲刷为 first_frame；
 * - 存量 v1~v3 数据按连线重建 assets：v2/v3 读取图片节点 frame，v1 按历史连线 handle（firstFrame/lastFrame）映射角色；
 * - 历史 firstFrame/lastFrame 连线 handle 统一改写为 GENERATION_INPUT_HANDLE，保证连线在 v4 画布可渲染、可参与生成。
 */
function migrateCanvasV3ToV4(canvas: VideoWorkspaceCanvas): VideoWorkspaceCanvas {
  /** 历史 v1 连线 handle → 素材角色（v2 起统一为 GENERATION_INPUT_HANDLE） */
  const legacyRoleByHandle: Record<string, GenerationImageRole> = {
    firstFrame: 'first_frame',
    lastFrame: 'last_frame',
  };

  // 已具备 assets 的生成节点（v4 数据）不再重建，避免重复迁移把角色冲刷为 first_frame
  const assetsByTarget = new Map<string, GenerationImageAsset[]>();
  for (const edge of canvas.edges) {
    if (!edge.source || !edge.target) continue;
    const sourceData = canvas.nodes.find((node) => node.id === edge.source)?.data as { kind?: unknown; frame?: unknown } | null;
    if (sourceData?.kind !== 'image') continue;
    const targetData = canvas.nodes.find((node) => node.id === edge.target)?.data as { kind?: unknown; assets?: unknown } | null;
    if (targetData?.kind !== 'generation' || Array.isArray(targetData.assets)) continue;
    // 角色优先级：图片节点 frame（v2/v3）> 历史连线 handle（v1）> 默认首帧
    const role: GenerationImageRole =
      sourceData.frame === 'first_frame' || sourceData.frame === 'last_frame' ? sourceData.frame : (legacyRoleByHandle[edge.targetHandle ?? ''] ?? 'first_frame');
    const list = assetsByTarget.get(edge.target) ?? [];
    list.push({ nodeId: edge.source, role });
    assetsByTarget.set(edge.target, list);
  }

  const nodes = canvas.nodes.map((node) => {
    if (node.data?.kind === 'image') {
      const { frame: _frame, ...rest } = node.data as ImageNodeData & { frame?: unknown };
      return { ...node, data: rest };
    }
    if (node.data?.kind === 'generation') {
      const existing = (node.data as { assets?: unknown }).assets;
      const assets = Array.isArray(existing) ? (existing as GenerationImageAsset[]) : (assetsByTarget.get(node.id) ?? []);
      return { ...node, data: { ...node.data, assets: normalizeFrameRoles(assets) } };
    }
    return node;
  });

  // 历史 v1 连线 handle 改写为生成节点唯一输入 handle，保证连线在 v4 画布中可渲染、可参与生成
  const edges = canvas.edges.map((edge) => (edge.targetHandle === 'firstFrame' || edge.targetHandle === 'lastFrame' ? { ...edge, targetHandle: GENERATION_INPUT_HANDLE } : edge));

  return { ...canvas, version: 4, nodes, edges };
}

/** 首/尾帧各至多保留 1 张，超出部分降级为参考图（与后端 media 上限对齐，防止渲染数据出现重复首/尾帧） */
function normalizeFrameRoles(assets: GenerationImageAsset[]): GenerationImageAsset[] {
  let firstCount = 0;
  let lastCount = 0;
  return assets.map((asset) => {
    if (asset.role === 'first_frame' && firstCount++ > 0) return { ...asset, role: 'reference_image' };
    if (asset.role === 'last_frame' && lastCount++ > 0) return { ...asset, role: 'reference_image' };
    return asset;
  });
}
