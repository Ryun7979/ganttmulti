import React, { useState, useMemo, useRef, useCallback } from 'react';
import { GanttChart } from './components/GanttChart';
import { TaskForm } from './components/TaskForm';
import { Button } from './components/Button';
import { ConfirmDialog } from './components/ConfirmDialog';
import { SnapshotDialog } from './components/SnapshotDialog';
import { CollaborationDialog } from './components/CollaborationDialog';
import { SettingsDialog } from './components/SettingsDialog';
import { Toolbar } from './components/Toolbar';
import { Task, ViewMode, Snapshot, AppSettings } from './types';
import { getTimelineRange, generateId, formatDate, addDays, DEFAULT_SETTINGS, calculateWorkdays, calculateEndDate, parseDate, getPaletteColor } from './utils';

import { useCollaboration } from './hooks/useCollaboration';
import { useGanttExport } from './hooks/useGanttExport';
import { useAppPersistence } from './hooks/useAppPersistence';
import { useSidebarResize } from './hooks/useSidebarResize';
import { useTaskViewModel } from './hooks/useTaskViewModel';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useFileSystem } from './hooks/useFileSystem';
import { Plus, Trash2, GripVertical, CheckCircle2, Download, Copy, ChevronDown, ChevronRight } from 'lucide-react';

const INITIAL_TASKS: Task[] = [
  { id: '1', name: '市場調査', assignee: '佐藤', startDate: formatDate(new Date()), endDate: formatDate(addDays(new Date(), 4)), progress: 100 },
  { id: '2', name: 'プロトタイプ作成', assignee: '鈴木', startDate: formatDate(addDays(new Date(), 2)), endDate: formatDate(addDays(new Date(), 8)), progress: 45 },
  { id: '3', name: 'クライアント確認', assignee: '田中', startDate: formatDate(addDays(new Date(), 9)), endDate: formatDate(addDays(new Date(), 12)), progress: 0 },
];

const SNAPSHOT_STORAGE_KEY = 'ganttmalti-snapshots-v1';

const App: React.FC = () => {
  // --- 1. Core Logic (Persistence & State) ---
  const {
    tasks, setTasks, undo, redo, canUndo, canRedo, settings, setAppSettings
  } = useAppPersistence(INITIAL_TASKS);

  // Apply Font Size
  React.useEffect(() => {
    const root = document.documentElement;
    if (settings.fontSize === 'large') {
      root.style.fontSize = '125%';
    } else if (settings.fontSize === 'medium') {
      root.style.fontSize = '112.5%';
    } else {
      root.style.fontSize = '100%';
    }
  }, [settings.fontSize]);

  // --- Assignee Color Mapping Logic ---
  React.useEffect(() => {
    const colorMap = { ...(settings.assigneeColorMap || {}) };
    let hasChanges = false;

    // Get all unique assignees currently in tasks
    const currentAssignees = Array.from(new Set(tasks.map(t => t.assignee || '')));

    currentAssignees.forEach(name => {
      if (colorMap[name] === undefined) {
        // Find next available color index
        const usedIndices = Object.values(colorMap);
        let nextIndex = 0;
        // Simple logic: find first index (0-19) that isn't used much? 
        // Or just find the smallest index not used, or even simpler: (usedCount % 20)
        // Here we'll just pick (number of known assignees) % 20
        const knownCount = Object.keys(colorMap).length;
        nextIndex = knownCount % 20;

        colorMap[name] = nextIndex;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setAppSettings({ ...settings, assigneeColorMap: colorMap });
    }
  }, [tasks, settings, setAppSettings]);

  // --- 2. Custom Hooks for UI Logic ---
  const {
    sidebarWidth, isResizingSidebar, handleResizeStart
  } = useSidebarResize(400);

  const {
    groupBy, setGroupBy, toggleGroup, displayItems,
    draggedTaskIndex, draggingTasks, draggingTaskIds, handleDragStart, handleDragOver, handleDragEnd,
    selectedTaskIds, toggleTaskSelection, selectTask, clearSelection
  } = useTaskViewModel({ tasks, setTasks, settings });

  useKeyboardShortcuts({ undo, redo });

  // --- 3. Collaboration Hook ---
  const {
    myPeerId, connectToPeer, isConnected, connectionCount, regenerateId
  } = useCollaboration(tasks, setTasks);

  // --- 4. UI State ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('Day');
  const [isSnapshotDialogOpen, setIsSnapshotDialogOpen] = useState(false);
  const [isCollabDialogOpen, setIsCollabDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // --- 5. File Export/Import Hook ---
  const {
    fileInputRef, exportContainerRef, taskListRef, ganttChartRef,
    pendingImportTasks, setPendingImportTasks, pendingSettings, setPendingSettings,
    handleExportJSON, handleExportPDF, handleFileChange
  } = useGanttExport({ settings, tasks, setTasks, sidebarWidth });

  const {
    fileName,
    isPermissionRequired,
    pickFile,
    saveFile,
    reloadFile,
    requestPermission,
    disconnectFile
  } = useFileSystem();

  const handleFileSystemImport = async () => {
    try {
      const result = await pickFile(settings);
      if (result) {
        setPendingImportTasks(result.tasks);
        setPendingSettings(result.settings);
        handleImportSuccess();
      }
    } catch (error: any) {
      handleImportError(error.message);
    }
  };

  const handleFileSystemSave = async () => {
    try {
      const exportData = {
        appName: settings.appName,
        settings: settings,
        exportedAt: new Date().toISOString(),
        tasks: tasks.map(t => ({
          ...t,
          workdays: t.workdays ?? calculateWorkdays(parseDate(t.startDate), parseDate(t.endDate), settings, t.startTime, t.endTime)
        }))
      };
      const success = await saveFile(exportData);
      if (success) {
        // Option: Show a small toast or success indicator
      }
    } catch (error: any) {
      handleImportError(`保存に失敗しました: ${error.message}`);
    }
  };

  const handleFileSystemReload = async () => {
    try {
      const result = await reloadFile(settings);
      if (result) {
        setTasks(result.tasks);
        if (result.settings) {
          setAppSettings(result.settings);
        }
        // Option: Show a small toast or success indicator for reload
      }
    } catch (error: any) {
      handleImportError(`リロードに失敗しました: ${error.message}`);
    }
  };

  // --- 6. Dialog & Snapshot Logic ---
  const [snapshots, setSnapshots] = useState<Snapshot[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(SNAPSHOT_STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch (e) { console.error(e); }
    }
    return [];
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'single' | 'all' | 'import' | 'error' | 'snapshot_restore' | 'snapshot_delete';
    taskId?: string;
    errorMessage?: string;
    snapshot?: Snapshot;
  }>({ isOpen: false, type: 'single' });

  // Update multiple tasks (for bulk drag)
  const handleTasksUpdate = (updatedTasks: Task[]) => {
    const newTasks = [...tasks];
    updatedTasks.forEach(updated => {
      const idx = newTasks.findIndex(t => t.id === updated.id);
      if (idx !== -1) {
        newTasks[idx] = updated;
      }
    });
    setTasks(newTasks);
  };




  const handleSaveSettings = (newSettings: AppSettings) => {
    const oldUnit = settings.minDayUnit || 1;
    const newUnit = newSettings.minDayUnit || 1;

    // Fractional -> Integer Mode Switching
    if (oldUnit < 1 && newUnit >= 1) {
      const updatedTasks = tasks.map((task) => {
        const currentWorkdays = calculateWorkdays(
          parseDate(task.startDate),
          parseDate(task.endDate),
          settings,
          task.startTime,
          task.endTime
        );

        // Round up to integer
        const newWorkdays = Math.ceil(currentWorkdays);

        // Recalculate End Date based on new workdays, forcing AM start (Full day)
        const { date: newEndDate } = calculateEndDate(
          parseDate(task.startDate),
          newWorkdays,
          newSettings,
          'AM'
        );

        return {
          ...task,
          workdays: newWorkdays,
          startTime: 'AM' as const,
          endTime: 'PM' as const,
          endDate: formatDate(newEndDate)
        };
      });
      setTasks(updatedTasks);
    }

    setAppSettings(newSettings);
  };

  // --- Event Handlers (Remaining logic not extracted yet) ---

  // Task Manipulation
  const handleSaveTask = (taskOrTasks: Task | Task[]) => {
    if (Array.isArray(taskOrTasks)) {
      // Bulk create
      setTasks([...tasks, ...taskOrTasks]);
    } else {
      // Single create or update
      if (editingTask) setTasks(tasks.map(t => t.id === taskOrTasks.id ? taskOrTasks : t));
      else setTasks([...tasks, taskOrTasks]);
    }
    setIsFormOpen(false);
    setEditingTask(null);
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const handleDuplicateTask = (id: string) => {
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const newTask = { ...tasks[idx], id: generateId(), name: `${tasks[idx].name} (コピー)` };
    const newTasks = [...tasks];
    newTasks.splice(idx + 1, 0, newTask);
    setTasks(newTasks);
  };

  // Snapshot Actions
  const handleCreateSnapshot = (name: string) => {
    const newSnapshot: Snapshot = { id: generateId(), name, timestamp: Date.now(), tasks: structuredClone(tasks) };
    const updated = [newSnapshot, ...snapshots];
    setSnapshots(updated);
    localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(updated));
  };

  // Confirm Actions
  const executeConfirmAction = () => {
    const { type, taskId, snapshot } = confirmDialog;
    if (type === 'all') {
      setTasks([]);
      // Reset all settings to defaults
      setAppSettings(structuredClone(DEFAULT_SETTINGS));
    }
    else if (type === 'single' && taskId) setTasks(tasks.filter(t => t.id !== taskId));
    else if (type === 'import' && pendingImportTasks) {
      setTasks(pendingImportTasks);
      if (pendingSettings) {
        setAppSettings(pendingSettings);
      }
      setPendingImportTasks(null);
      setPendingSettings(null);
    } else if (type === 'snapshot_restore' && snapshot) {
      setTasks(structuredClone(snapshot.tasks));
      setIsSnapshotDialogOpen(false);
    } else if (type === 'snapshot_delete' && snapshot) {
      const updated = snapshots.filter(s => s.id !== snapshot.id);
      setSnapshots(updated);
      localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(updated));
    }
    setConfirmDialog({ ...confirmDialog, isOpen: false });
  };

  const handleImportSuccess = () => {
    setConfirmDialog({ isOpen: true, type: 'import' });
  };

  const handleImportError = (msg: string) => {
    setConfirmDialog({ isOpen: true, type: 'error', errorMessage: msg });
  };

  // Derived Data for Chart
  const { start: timelineStart, end: timelineEnd } = useMemo(() => getTimelineRange(tasks, viewMode), [tasks, viewMode]);

  // Sync Scroll
  // Sync Scroll
  const activeScrollRef = useRef<HTMLElement | null>(null);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>, targetRef: React.RefObject<HTMLDivElement>) => {
    const source = e.currentTarget;
    const target = targetRef.current;
    if (!target) return;

    // Block sync if another element is already the active scroller
    if (activeScrollRef.current && activeScrollRef.current !== source) {
      return;
    }

    // Set active scroller
    activeScrollRef.current = source;

    // Reset active scroller after scroll stops
    const timerId = (source as any).__scrollTimer;
    if (timerId) clearTimeout(timerId);
    (source as any).__scrollTimer = setTimeout(() => {
      activeScrollRef.current = null;
    }, 50);

    // Sync position
    if (Math.abs(target.scrollTop - source.scrollTop) > 1) {
      target.scrollTop = source.scrollTop;
    }
  }, []);

  // Confirm Dialog Content
  const getDialogContent = () => {
    switch (confirmDialog.type) {
      case 'error': return { title: 'インポートエラー', message: confirmDialog.errorMessage || 'エラー', confirmLabel: '閉じる', confirmVariant: 'danger' as const, showCancel: false };
      case 'import': {
        const importAppName = pendingSettings?.appName;
        const msg = importAppName
          ? `「${importAppName}」のデータをインポートしますか？\n現在のデータは上書きされ、設定（祝日・イベント日など）も更新されます。`
          : 'タスクデータをインポートしますか？\n現在のデータは上書きされます。';
        return { title: 'タスクのインポート', message: msg, confirmLabel: 'インポート', confirmVariant: 'primary' as const, showCancel: true };
      }
      case 'snapshot_restore': return { title: 'データの復元', message: `「${confirmDialog.snapshot?.name}」を復元しますか？`, confirmLabel: '復元', confirmVariant: 'primary' as const, showCancel: true };
      case 'snapshot_delete': return { title: 'データの削除', message: `「${confirmDialog.snapshot?.name}」を削除しますか？`, confirmLabel: '削除', confirmVariant: 'danger' as const, showCancel: true };
      case 'all': return { title: '全削除', message: '全てのタスクを削除しますか？\n（アプリケーション名、カラー設定、カスタム休日なども全て初期化されます）', confirmLabel: '削除', confirmVariant: 'danger' as const, showCancel: true };
      default: return { title: '削除', message: 'このタスクを削除しますか？', confirmLabel: '削除', confirmVariant: 'danger' as const, showCancel: true };
    }
  };
  const dialogContent = getDialogContent();

  // Calculate Total Workdays
  const totalWorkdays = useMemo(() => {
    return tasks.reduce((acc, task) => {
      if (task.workdays !== undefined) {
        return acc + task.workdays;
      }
      return acc + calculateWorkdays(
        parseDate(task.startDate),
        parseDate(task.endDate),
        settings,
        task.startTime,
        task.endTime
      );
    }, 0);
  }, [tasks, settings.customHolidays]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-800">
      <input type="file" accept=".json" ref={fileInputRef} onChange={(e) => handleFileChange(e, handleImportSuccess, handleImportError)} style={{ display: 'none' }} />

      <Toolbar
        appName={settings.appName || 'GanttMalti'}
        tasks={tasks}
        totalWorkdays={totalWorkdays}
        isConnected={isConnected}
        viewMode={viewMode}
        groupBy={groupBy}
        canUndo={canUndo}
        canRedo={canRedo}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCollab={() => setIsCollabDialogOpen(true)}
        onChangeGroupBy={setGroupBy}
        onChangeViewMode={setViewMode}
        onUndo={undo}
        onRedo={redo}
        onOpenSnapshot={() => setIsSnapshotDialogOpen(true)}
        onExportPDF={handleExportPDF}
        onExportJSON={handleExportJSON}
        onImportClick={handleFileSystemImport}
        onDeleteAll={() => setConfirmDialog({ isOpen: true, type: 'all' })}
        onNewTask={() => { setEditingTask(null); setIsFormOpen(true); }}
        fileName={fileName}
        onSaveFile={handleFileSystemSave}
        onReloadFile={handleFileSystemReload}
        onDisconnectFile={disconnectFile}
        isPermissionRequired={isPermissionRequired}
        onPermissionRequest={requestPermission}
      />

      <main className="flex-1 overflow-hidden flex flex-col p-4 sm:p-6">
        {tasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50">
            <div className="bg-white p-4 rounded-full shadow-sm mb-4"><CheckCircle2 className="w-12 h-12 text-blue-500" /></div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">タスクがありません</h3>
            <p className="text-gray-500 max-w-sm text-center mb-6">新しいタスクを作成するか、データをインポートしてください。</p>
            <div className="flex gap-3">
              <Button onClick={() => { setEditingTask(null); setIsFormOpen(true); }} icon={<Plus size={18} />}>最初のタスクを作成</Button>
              <Button variant="secondary" onClick={handleFileSystemImport} icon={<Download size={18} />}>データをインポート</Button>
            </div>
          </div>
        ) : (
          <div ref={exportContainerRef} className="flex-1 flex bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Sidebar */}
            <div className="flex-shrink-0 flex flex-col border-r border-gray-200 bg-white z-20" style={{ width: sidebarWidth }}>
              <div ref={taskListRef} onScroll={(e) => handleScroll(e, ganttChartRef)} className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
                <div className="h-10 bg-gray-50 border-b border-gray-200 flex items-center px-2 font-semibold text-xs text-gray-500 uppercase tracking-wider sticky top-0 z-30">
                  <span className="w-8"></span><span className="flex-1">タスク名</span><span className="w-12 text-right">稼働日</span><span className="w-20 text-right">担当者</span><span className="w-14"></span>
                </div>
                {displayItems.map((item, index) => {
                  // --- Render Group Header ---
                  if ('type' in item && item.type === 'group') {
                    return (
                      <div
                        key={item.id}
                        className="h-8 bg-gray-50 border-b border-gray-200 flex items-center px-4 font-bold text-gray-600 text-xs sticky top-10 z-20 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                        onClick={() => toggleGroup(item.id)}
                      >
                        {item.isCollapsed ? (
                          <ChevronRight size={14} className="mr-1 text-gray-400" />
                        ) : (
                          <ChevronDown size={14} className="mr-1 text-gray-400" />
                        )}
                        {item.title}
                      </div>
                    );
                  }

                  // --- Render Task Item ---
                  const task = item as Task;
                  const isCompleted = task.progress === 100;
                  const isDraggedItem = draggingTaskIds ? draggingTaskIds.has(task.id) : draggedTaskIndex === index;
                  const isSelected = selectedTaskIds.has(task.id);
                  const isMilestone = task.type === 'milestone';

                  const assigneeColorIndex = settings.assigneeColorMap?.[task.assignee || ''] ?? 0;
                  const assigneeColor = getPaletteColor(assigneeColorIndex, settings.assigneePalette);

                  return (
                    <div key={task.id}
                      draggable={groupBy === 'default'}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center px-2 border-b border-gray-100 transition-all duration-200 group relative
                        ${isDraggedItem
                          ? 'bg-blue-50 border-2 border-dashed border-blue-400 opacity-60 shadow-inner' // Active Drag Item (Placeholder)
                          : isCompleted
                            ? 'bg-gray-100'
                            : isSelected
                              ? 'bg-blue-100/50 hover:bg-blue-100' // Selected
                              : 'hover:bg-blue-50/50 hover:shadow-sm' // Normal Item
                        }
                        ${groupBy === 'assignee' && !isCompleted ? 'hover:bg-gray-50' : ''}
                      `}
                      style={{ height: `${settings.rowHeight || 48}px` }}
                      onClick={(e) => {
                        // Single click -> Select
                        // Ctrl+Click -> Toggle
                        // Shift+Click -> Range
                        e.stopPropagation();
                        toggleTaskSelection(task.id, e.ctrlKey || e.metaKey, e.shiftKey);
                      }}
                      onDoubleClick={() => { setEditingTask(task); setIsFormOpen(true); }}
                    >
                      <div className={`w-8 flex items-center justify-center transition-colors 
                        ${groupBy === 'default'
                          ? isDraggedItem ? 'text-blue-500 cursor-grabbing' : 'text-gray-300 cursor-grab group-hover:text-blue-400'
                          : 'cursor-default opacity-20'
                        }
                      `}>
                        <GripVertical size={16} />
                      </div>
                      <div className="flex-1 min-w-0 pr-2 cursor-pointer" title="ダブルクリックして編集">
                        <p
                          className={`text-sm font-medium truncate transition-colors ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}
                          style={isMilestone && !isCompleted ? { color: assigneeColor.bar } : {}}
                        >
                          {task.name}
                        </p>
                        <p className={`text-[10px] truncate ${isCompleted ? 'text-gray-400' : 'text-gray-500'}`}>
                          {isMilestone ? task.endDate : `${task.startDate} - ${task.endDate}`}
                        </p>
                      </div>
                      <div className={`w-12 text-right text-xs truncate ${isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
                        {isMilestone ? 'M' : calculateWorkdays(parseDate(task.startDate), parseDate(task.endDate), settings, task.startTime, task.endTime)}
                      </div>
                      <div className={`w-20 text-right text-xs truncate mr-2 cursor-pointer ${isCompleted ? 'text-gray-400' : (groupBy === 'assignee' ? 'font-bold text-blue-700' : 'text-gray-600')}`}>{task.assignee}</div>
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all gap-1">
                        <button onClick={() => handleDuplicateTask(task.id)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="複製"><Copy size={14} /></button>
                        <button onClick={() => setConfirmDialog({ isOpen: true, type: 'single', taskId: task.id })} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="削除"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  );
                })}
                <div className="h-6 flex-shrink-0" aria-hidden="true" />
              </div>
            </div>
            {/* Resizer */}
            <div className={`w-1 cursor-col-resize hover:bg-blue-400 bg-gray-200 z-30 transition-colors flex-shrink-0 ${isResizingSidebar ? 'bg-blue-500' : ''}`} onMouseDown={handleResizeStart} />
            {/* Gantt Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-white" onClick={clearSelection}>
              <GanttChart
                ref={ganttChartRef}
                onScroll={(e) => handleScroll(e, taskListRef)}
                items={displayItems}
                timelineStart={timelineStart}
                timelineEnd={timelineEnd}
                viewMode={viewMode}
                settings={settings}
                onTaskUpdate={handleUpdateTask}
                onTasksUpdate={handleTasksUpdate}
                onEditTask={(t) => { setEditingTask(t); setIsFormOpen(true); }}
                onToggleGroup={toggleGroup}
                selectedTaskIds={selectedTaskIds}
                onToggleSelection={toggleTaskSelection}
                onSelectTask={selectTask}
              />
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 px-6 py-3 text-xs text-gray-500 flex justify-between">
        <p>GanttMalti v1.0.0</p>
        <p className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span> 進行中 <span className="w-2 h-2 rounded-full bg-gray-500 inline-block ml-2"></span> 完了</p>
      </footer>

      {isFormOpen && <TaskForm initialData={editingTask} onSave={handleSaveTask} onClose={() => { setIsFormOpen(false); setEditingTask(null); }} settings={settings} />}
      <SnapshotDialog isOpen={isSnapshotDialogOpen} onClose={() => setIsSnapshotDialogOpen(false)} snapshots={snapshots} onCreateSnapshot={handleCreateSnapshot} onRestoreSnapshot={(s) => setConfirmDialog({ isOpen: true, type: 'snapshot_restore', snapshot: s })} onDeleteSnapshot={(id) => { const s = snapshots.find(x => x.id === id); if (s) setConfirmDialog({ isOpen: true, type: 'snapshot_delete', snapshot: s }); }} />
      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
        onRegeneratePeerId={regenerateId}
        onExportJSON={handleExportJSON}
        onImportClick={handleFileSystemImport}
        onDeleteAll={() => setConfirmDialog({ isOpen: true, type: 'all' })}
      />
      <CollaborationDialog isOpen={isCollabDialogOpen} onClose={() => setIsCollabDialogOpen(false)} myPeerId={myPeerId} isConnected={isConnected} connectionCount={connectionCount} onConnect={connectToPeer} />
      <ConfirmDialog isOpen={confirmDialog.isOpen} title={dialogContent.title} message={dialogContent.message} confirmLabel={dialogContent.confirmLabel} confirmVariant={dialogContent.confirmVariant} showCancel={dialogContent.showCancel} onConfirm={executeConfirmAction} onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })} />
    </div>
  );
};

export default App;