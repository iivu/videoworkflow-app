import { cn, Label } from '@r/ui';
import { motion } from 'motion/react';
import type { ReactNode, RefObject } from 'react';
import { useRef, useState } from 'react';

import { selectIsNodeLocked, useCanvasStore } from '../store';
import { type GenerationImageAsset, MAX_REFERENCE_IMAGES } from '../types';

type SlotTarget = { zone: 'frame'; index: 0 | 1 } | { zone: 'ref'; index: number };

const FRAME_SLOT_LABELS = ['首帧', '尾帧'] as const;

function sameTarget(a: SlotTarget | null, b: SlotTarget | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.zone === b.zone && a.index === b.index;
}

function pointInRect(x: number, y: number, element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function isHover(target: SlotTarget | null, zone: SlotTarget['zone'], index: number) {
  return target !== null && target.zone === zone && target.index === index;
}

/** 素材缩略图角标：首尾帧位显示 1/2，参考图位显示序号（从 1 开始） */
function SlotTag({ children }: { children: ReactNode }) {
  return (
    <span className="absolute -top-1.5 -left-1.5 z-10 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] leading-none font-medium text-primary-foreground">
      {children}
    </span>
  );
}

/** 依据素材状态重建规范顺序：首帧 → 尾帧 → 参考图（按数组顺序） */
function normalize(frames: Array<GenerationImageAsset | null>, refs: GenerationImageAsset[]): GenerationImageAsset[] {
  const first = frames.find((frame) => frame?.role === 'first_frame') ?? null;
  const last = frames.find((frame) => frame?.role === 'last_frame') ?? null;
  return [...(first ? [first] : []), ...(last ? [last] : []), ...refs];
}

export function GenerationImageAssets({ nodeId }: { nodeId: string }) {
  const nodes = useCanvasStore((state) => state.nodes);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const locked = useCanvasStore(selectIsNodeLocked(nodeId));

  const firstSlotRef = useRef<HTMLDivElement>(null);
  const lastSlotRef = useRef<HTMLDivElement>(null);
  const refSlotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hoverRef = useRef<SlotTarget | null>(null);
  const [hover, setHover] = useState<SlotTarget | null>(null);

  const generation = nodes.find((node) => node.id === nodeId);
  if (generation?.data.kind !== 'generation') return null;
  const allAssets = generation.data.assets;

  // 仅展示仍存在且已上传图片的素材（防御：连线已删或节点已删时的残留配置）
  const displayImages = new Map<string, { imageUrl: string; fileName?: string }>();
  for (const node of nodes) {
    if (node.data.kind === 'image' && node.data.imageUrl) {
      displayImages.set(node.id, { imageUrl: node.data.imageUrl, fileName: node.data.fileName });
    }
  }
  const assets = allAssets.filter((asset) => displayImages.has(asset.nodeId));

  const firstFrame = assets.find((asset) => asset.role === 'first_frame') ?? null;
  const lastFrame = assets.find((asset) => asset.role === 'last_frame') ?? null;
  const refs = assets.filter((asset) => asset.role === 'reference_image');

  function slotAt(x: number, y: number): SlotTarget | null {
    if (firstSlotRef.current && pointInRect(x, y, firstSlotRef.current)) return { zone: 'frame', index: 0 };
    if (lastSlotRef.current && pointInRect(x, y, lastSlotRef.current)) return { zone: 'frame', index: 1 };
    for (let index = 0; index < refSlotRefs.current.length; index++) {
      const element = refSlotRefs.current[index];
      if (element && pointInRect(x, y, element)) return { zone: 'ref', index };
    }
    return null;
  }

  function updateHover(x: number, y: number) {
    const next = slotAt(x, y);
    hoverRef.current = next;
    setHover((prev) => (sameTarget(prev, next) ? prev : next));
  }

  function clearHover() {
    hoverRef.current = null;
    setHover(null);
  }

  /** 计算一次拖放后的新素材列表；返回 null 表示拖放无效（回弹） */
  function applyDrop(dragged: GenerationImageAsset, target: SlotTarget): GenerationImageAsset[] | null {
    const first = assets.find((asset) => asset.role === 'first_frame') ?? null;
    const last = assets.find((asset) => asset.role === 'last_frame') ?? null;
    const refs = assets.filter((asset) => asset.role === 'reference_image');

    if (target.zone === 'frame') {
      const targetRole = target.index === 0 ? 'first_frame' : 'last_frame';
      const otherRole = targetRole === 'first_frame' ? 'last_frame' : 'first_frame';
      const occupant = targetRole === 'first_frame' ? first : last;
      const other = targetRole === 'first_frame' ? last : first;

      if (dragged.role === targetRole) return null; // 拖回原位

      if (dragged.role === otherRole) {
        // 首帧/尾帧互换
        return normalize([{ ...dragged, role: targetRole }, occupant ? { ...occupant, role: otherRole } : null], refs);
      }

      // 参考图拖入首/尾帧位：原占位（若有）降级为参考图，插入参考图被拖出的位置
      const draggedIndex = refs.findIndex((asset) => asset.nodeId === dragged.nodeId);
      const nextRefs = refs.filter((asset) => asset.nodeId !== dragged.nodeId);
      if (occupant) nextRefs.splice(draggedIndex < 0 ? nextRefs.length : draggedIndex, 0, { ...occupant, role: 'reference_image' });
      return normalize(
        [targetRole === 'first_frame' ? { ...dragged, role: 'first_frame' } : other, targetRole === 'last_frame' ? { ...dragged, role: 'last_frame' } : other],
        nextRefs,
      );
    }

    // 拖入参考图区域：角色改为参考图，插入目标位置（超出上限则回弹）
    const nextRefs = refs.filter((asset) => asset.nodeId !== dragged.nodeId);
    if (nextRefs.length >= MAX_REFERENCE_IMAGES) return null;
    nextRefs.splice(Math.min(target.index, nextRefs.length), 0, { nodeId: dragged.nodeId, role: 'reference_image' });

    return normalize([dragged.role === 'first_frame' ? null : first, dragged.role === 'last_frame' ? null : last], nextRefs);
  }

  function commitDrop(dragged: GenerationImageAsset) {
    const target = hoverRef.current;
    clearHover();
    if (!target) return;
    const next = applyDrop(dragged, target);
    if (!next) return;
    // 保留尚未上传图片的素材配置（未参与展示与拖拽，避免丢失角色）
    const pending = allAssets.filter((asset) => !assets.some((item) => item.nodeId === asset.nodeId));
    updateNodeData(nodeId, { assets: [...next, ...pending] });
  }

  const frameSlots: Array<{ label: string; asset: GenerationImageAsset | null; slotRef: RefObject<HTMLDivElement | null> }> = [
    { label: FRAME_SLOT_LABELS[0], asset: firstFrame, slotRef: firstSlotRef },
    { label: FRAME_SLOT_LABELS[1], asset: lastFrame, slotRef: lastSlotRef },
  ];

  return (
    <div className="flex items-start gap-4 nodrag">
      {/* 首尾帧区域：1 号位 = 首帧，2 号位 = 尾帧，各自至多 1 张 */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">首尾帧</Label>
        <div className="flex items-start gap-2">
          {frameSlots.map((slot, index) => {
            const image = slot.asset ? displayImages.get(slot.asset.nodeId) : null;
            return (
              <div key={slot.label} className="flex flex-col items-center gap-1">
                <div ref={slot.slotRef} className="relative">
                  <SlotTag>{index + 1}</SlotTag>
                  {slot.asset && image ? (
                    <AssetThumb asset={slot.asset} imageUrl={image.imageUrl} fileName={image.fileName} locked={locked} onDrag={updateHover} onDrop={commitDrop} />
                  ) : (
                    <div
                      className={cn(
                        'size-11 rounded-md border border-dashed border-border',
                        isHover(hover, 'frame', index as 0 | 1) && 'border-primary bg-primary/5 ring-2 ring-primary/30',
                      )}
                    />
                  )}
                </div>
                <span className="text-[10px] leading-none text-muted-foreground">{slot.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 参考图像区域：最多 10 张，拖拽排序，角标从 1 开始编号 */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">参考图</Label>
        <div className="flex items-start gap-1.5">
          {Array.from({ length: MAX_REFERENCE_IMAGES }, (_, index) => {
            const asset = refs[index] ?? null;
            const image = asset ? displayImages.get(asset.nodeId) : null;
            return (
              <div
                key={index}
                ref={(element) => {
                  refSlotRefs.current[index] = element;
                }}
                className="relative"
              >
                {asset && image ? (
                  <>
                    <SlotTag>{index + 1}</SlotTag>
                    <AssetThumb asset={asset} imageUrl={image.imageUrl} fileName={image.fileName} locked={locked} onDrag={updateHover} onDrop={commitDrop} />
                  </>
                ) : (
                  <div
                    className={cn('size-11 rounded-md border border-dashed border-border', isHover(hover, 'ref', index) && 'border-primary bg-primary/5 ring-2 ring-primary/30')}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type AssetThumbProps = {
  asset: GenerationImageAsset;
  imageUrl: string;
  fileName?: string;
  locked: boolean;
  onDrag: (x: number, y: number) => void;
  onDrop: (asset: GenerationImageAsset) => void;
};

function AssetThumb({ asset, imageUrl, fileName, locked, onDrag, onDrop }: AssetThumbProps) {
  return (
    <motion.div
      drag={!locked}
      dragSnapToOrigin
      dragElastic={0.12}
      dragMomentum={false}
      layout
      whileDrag={{ scale: 1.08, zIndex: 20 }}
      className={cn('nodrag size-11 cursor-grab overflow-hidden rounded-md border border-border bg-muted/40 active:cursor-grabbing', locked && 'cursor-default')}
      onDrag={(_, info) => onDrag(info.point.x, info.point.y)}
      onDragEnd={() => onDrop(asset)}
      title={fileName ?? '图片素材'}
    >
      {/* 素材缩略图为纯展示，无可用字幕 */}
      <img src={imageUrl} alt={fileName ?? '图片素材'} draggable={false} className="pointer-events-none size-full object-cover" />
    </motion.div>
  );
}
