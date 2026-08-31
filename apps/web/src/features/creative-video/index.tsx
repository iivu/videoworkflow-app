import { toast } from '@r/ui';
import type { TuyauError } from '@tuyau/core/client';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  type Connection,
  type Edge,
  type OnConnect,
  type OnEdgesChange,
  type OnMoveEnd,
  type OnNodesChange,
  ReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import { useCallback, useMemo, useState } from 'react';

import { useConfirm } from '#/providers/confirm-dialog-provider';
import { useTheme } from '#/providers/theme-provider';
import { normalizeApiFailedMessage } from '#/services/api';
import { createUuid } from '#/shared/uuid';
import { CanvasToolbar } from './components/canvas-toolbar';
import { CanvasAutoSave } from './components/data/canvas-auto-save';
import { CanvasLoader } from './components/data/canvas-loader';
import { CanvasViewportSync } from './components/data/canvas-viewport-sync';
import { TaskPolling } from './components/data/task-polling';
import { WorkspaceInit } from './components/data/workspace-init';
import { SaveStatusPanel } from './components/save-status-panel';
import { WorkspaceMenu } from './components/workspace-menu';
import { WorkspaceNameDialog } from './components/workspace-name-dialog';
import { isValidCanvasConnection, nodeTypes } from './nodes/definitions';
import { selectCurrentWorkspace, selectGeneratingEdgeIds, useCanvasStore } from './store';
import type { VideoWorkspaceEdge, VideoWorkspaceNode } from './types';

type WorkspaceDialogState = 'create' | 'rename' | null;

function failedMessage(error: unknown, fallback: string) {
  return normalizeApiFailedMessage(error as TuyauError) || fallback;
}

function stringSetsEqual(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

export function CreativeVideoPage() {
  return (
    <ReactFlowProvider>
      <WorkspaceInit />
      <CanvasLoader />
      <CanvasAutoSave />
      <TaskPolling />
      <CreativeVideoCanvas />
    </ReactFlowProvider>
  );
}

function CreativeVideoCanvas() {
  const { theme } = useTheme();
  const { confirm } = useConfirm();

  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const generatingEdgeIds = useCanvasStore(selectGeneratingEdgeIds, stringSetsEqual);
  // 生成进行中的相连连线加动画（展示层派生，不写回存储）
  const displayEdges = useMemo(() => edges.map((edge) => (generatingEdgeIds.has(edge.id) ? { ...edge, animated: true } : edge)), [edges, generatingEdgeIds]);
  const setNodes = useCanvasStore((state) => state.setNodes);
  const setEdges = useCanvasStore((state) => state.setEdges);
  const setViewport = useCanvasStore((state) => state.setViewport);
  const markDirty = useCanvasStore((state) => state.markDirty);
  const syncGenerationAssets = useCanvasStore((state) => state.syncGenerationAssets);
  const workspaces = useCanvasStore((state) => state.workspaces);
  const currentWorkspace = useCanvasStore(selectCurrentWorkspace);
  const saveStatus = useCanvasStore((state) => state.saveStatus);
  const selectWorkspace = useCanvasStore((state) => state.selectWorkspace);
  const createWorkspace = useCanvasStore((state) => state.createWorkspace);
  const renameWorkspace = useCanvasStore((state) => state.renameWorkspace);
  const removeWorkspace = useCanvasStore((state) => state.removeWorkspace);
  const addNode = useCanvasStore((state) => state.addNode);

  const workspaceId = currentWorkspace ? String(currentWorkspace.id) : null;

  const [dialog, setDialog] = useState<WorkspaceDialogState>(null);
  const [nameInput, setNameInput] = useState('');
  const [nameSubmitting, setNameSubmitting] = useState(false);

  const onNodesChange = useCallback<OnNodesChange<VideoWorkspaceNode>>(
    (changes) => {
      // 仅节点增删改（add/remove/replace）置脏触发保存；位置/尺寸/选中等瞬态变化不保存
      const structural = changes.some((change) => change.type !== 'position' && change.type !== 'dimensions' && change.type !== 'select');
      setNodes((snapshot) => applyNodeChanges(changes, snapshot));
      if (structural) markDirty();
    },
    [setNodes, markDirty],
  );
  const onEdgesChange = useCallback<OnEdgesChange<VideoWorkspaceEdge>>(
    (changes) => {
      // 连线增删改置脏触发保存，选中态变化不保存
      const structureChanged = changes.some((change) => change.type !== 'select');
      setEdges((snapshot) => applyEdgeChanges(changes, snapshot));
      if (structureChanged) {
        syncGenerationAssets();
        markDirty();
      }
    },
    [setEdges, syncGenerationAssets, markDirty],
  );

  const onConnect = useCallback<OnConnect>(
    (connection) => {
      if (!isValidCanvasConnection(connection, edges, nodes)) return;
      setEdges((snapshot) => addEdge({ ...connection, id: createUuid() }, snapshot));
      syncGenerationAssets();
      markDirty();
    },
    [edges, nodes, setEdges, syncGenerationAssets, markDirty],
  );

  const isValidConnection = useCallback((connection: Edge | Connection) => isValidCanvasConnection(connection, edges, nodes), [edges, nodes]);

  const onMoveEnd = useCallback<OnMoveEnd>((_event, viewport) => setViewport(viewport), [setViewport]);

  function openDialog(next: WorkspaceDialogState) {
    if (!next) return;
    setNameInput(next === 'rename' ? (currentWorkspace?.name ?? '') : '');
    setDialog(next);
  }

  async function handleNameSubmit() {
    const name = nameInput.trim();
    if (!name || nameSubmitting) return;
    setNameSubmitting(true);
    try {
      if (dialog === 'create') {
        const id = await createWorkspace(name);
        selectWorkspace(id);
      } else {
        if (!currentWorkspace) return;
        await renameWorkspace(String(currentWorkspace.id), name);
      }
      setDialog(null);
    } catch (error) {
      toast.add({ type: 'error', description: failedMessage(error, '操作失败') });
    } finally {
      setNameSubmitting(false);
    }
  }

  async function handleDeleteWorkspace() {
    if (!currentWorkspace) return;
    const ok = await confirm({
      title: '删除创作空间',
      description: '该空间的视频生成任务将一并删除，确定删除吗？',
      danger: true,
    });
    if (!ok) return;
    try {
      await removeWorkspace(String(currentWorkspace.id));
      toast.add({ type: 'success', description: '创作空间已删除' });
    } catch (error) {
      toast.add({ type: 'error', description: failedMessage(error, '删除失败') });
    }
  }

  return (
    <section className="h-(--content-min-height)">
      <CanvasViewportSync />
      <ReactFlow
        colorMode={theme}
        nodes={nodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onMoveEnd={onMoveEnd}
        isValidConnection={isValidConnection}
        deleteKeyCode={null}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} />

        <WorkspaceMenu
          workspaces={workspaces}
          workspaceId={workspaceId}
          currentName={currentWorkspace?.name ?? '创作空间'}
          onSwitch={selectWorkspace}
          onOpenDialog={openDialog}
          onDelete={() => void handleDeleteWorkspace()}
        />

        <CanvasToolbar onAddNode={addNode} />

        <SaveStatusPanel saveStatus={saveStatus} />
      </ReactFlow>

      <WorkspaceNameDialog
        open={dialog !== null}
        mode={dialog ?? 'create'}
        name={nameInput}
        submitting={nameSubmitting}
        onNameChange={setNameInput}
        onClose={() => setDialog(null)}
        onSubmit={() => void handleNameSubmit()}
      />
    </section>
  );
}
