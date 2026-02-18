import React from 'react';
import { Button } from './Button';
import { Task, ViewMode } from '../types';
import { Calendar, Settings, Radio, List, Users, RotateCcw, RotateCw, Camera, FileDown, Upload, Download, Trash2, Plus } from 'lucide-react';

interface ToolbarProps {
  appName: string;
  tasks: Task[];
  isConnected: boolean;
  viewMode: ViewMode;
  groupBy: 'default' | 'assignee';
  canUndo: boolean;
  canRedo: boolean;
  onOpenSettings: () => void;
  onOpenCollab: () => void;
  onChangeGroupBy: (mode: 'default' | 'assignee') => void;
  onChangeViewMode: (mode: ViewMode) => void;
  onUndo: () => void;
  onRedo: () => void;
  onOpenSnapshot: () => void;
  onExportPDF: () => void;
  onExportJSON: () => void;
  onImportClick: () => void;
  onDeleteAll: () => void;
  onNewTask: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  appName,
  tasks,
  isConnected,
  viewMode,
  groupBy,
  canUndo,
  canRedo,
  onOpenSettings,
  onOpenCollab,
  onChangeGroupBy,
  onChangeViewMode,
  onUndo,
  onRedo,
  onOpenSnapshot,
  onExportPDF,
  onExportJSON,
  onImportClick,
  onDeleteAll,
  onNewTask
}) => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex flex-wrap items-center justify-between sticky top-0 z-30 shadow-sm gap-4">
      <div className="flex items-center gap-3 min-w-max">
        <div className="bg-blue-600 p-2 rounded-lg"><Calendar className="text-white h-5 w-5" /></div>
        <div><h1 className="text-xl font-bold text-gray-900 tracking-tight">{appName}</h1><p className="text-xs text-gray-500">プロジェクト工程管理</p></div>
      </div>
      
      <div className="flex flex-wrap items-center gap-2 justify-end flex-1">
        <Button variant="secondary" size="sm" onClick={onOpenSettings} icon={<Settings size={16} />} title="設定" />
        
        <div className="flex bg-gray-100 p-1 rounded-lg shrink-0">
           <Button variant={isConnected ? 'primary' : 'secondary'} size="sm" onClick={onOpenCollab} icon={<Radio size={16} className={isConnected ? "animate-pulse" : ""} />} title="同時編集 (P2P)">{isConnected ? `接続中` : '共有'}</Button>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-lg shrink-0">
          <button onClick={() => onChangeGroupBy('default')} className={`p-1.5 rounded-md transition-all ${groupBy === 'default' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} title="リスト順"><List size={16} /></button>
          <button onClick={() => onChangeGroupBy('assignee')} className={`p-1.5 rounded-md transition-all ${groupBy === 'assignee' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} title="担当者順"><Users size={16} /></button>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-lg shrink-0">
          {(['Day', 'Week', 'Month'] as ViewMode[]).map((mode) => (
            <button key={mode} onClick={() => onChangeViewMode(mode)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === mode ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{mode === 'Day' ? '日' : mode === 'Week' ? '週' : '月'}</button>
          ))}
        </div>
        
        <div className="flex gap-1 shrink-0">
           <Button variant="secondary" size="sm" onClick={onUndo} disabled={!canUndo} icon={<RotateCcw size={16} />} title="元に戻す (Ctrl+Z)" />
           <Button variant="secondary" size="sm" onClick={onRedo} disabled={!canRedo} icon={<RotateCw size={16} />} title="やり直し (Ctrl+Y)" />
        </div>
        
        <Button variant="secondary" size="sm" onClick={onOpenSnapshot} icon={<Camera size={16} />} title="スナップショット管理">一時保存</Button>
        
        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" size="sm" onClick={onExportPDF} icon={<FileDown size={16} />} title="PDFとして保存">PDF</Button>
          <Button variant="secondary" size="sm" onClick={onExportJSON} icon={<Upload size={16} />} title="JSONへエクスポート">Export</Button>
          <Button variant="secondary" size="sm" onClick={onImportClick} icon={<Download size={16} />} title="JSONからインポート">Import</Button>
        </div>
        
        <div className="flex gap-2 shrink-0 pl-2 ml-2 border-l border-gray-200">
          {tasks.length > 0 && <Button variant="danger" size="sm" onClick={onDeleteAll} icon={<Trash2 size={16} />}>全削除</Button>}
          <Button onClick={onNewTask} icon={<Plus size={16} />}>新規</Button>
        </div>
      </div>
    </header>
  );
};
