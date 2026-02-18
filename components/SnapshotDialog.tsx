import React, { useState } from 'react';
import { Snapshot } from '../types';
import { Button } from './Button';
import { Modal } from './Modal';
import { Save, Trash2, RotateCcw, Camera } from 'lucide-react';

interface SnapshotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: Snapshot[];
  onCreateSnapshot: (name: string) => void;
  onRestoreSnapshot: (snapshot: Snapshot) => void;
  onDeleteSnapshot: (id: string) => void;
}

export const SnapshotDialog: React.FC<SnapshotDialogProps> = ({
  isOpen,
  onClose,
  snapshots,
  onCreateSnapshot,
  onRestoreSnapshot,
  onDeleteSnapshot,
}) => {
  const [newSnapshotName, setNewSnapshotName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSnapshotName.trim()) return;
    onCreateSnapshot(newSnapshotName);
    setNewSnapshotName('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="一時保存データ管理"
      maxWidth="max-w-lg"
      icon={<div className="bg-purple-100 p-1.5 rounded-lg"><Camera className="text-purple-600" size={20} /></div>}
    >
      <div className="p-6">
        {/* Create Section */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-2">現在の状態を保存</h3>
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              value={newSnapshotName}
              onChange={(e) => setNewSnapshotName(e.target.value)}
              placeholder="データ名 (例: 初期計画案)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm"
            />
            <Button type="submit" disabled={!newSnapshotName.trim()} icon={<Save size={16} />}>
              保存
            </Button>
          </form>
        </div>

        {/* List Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">保存済みデータ</h3>
          {snapshots.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-lg">
              <p className="text-sm text-gray-400">保存されたデータはありません</p>
            </div>
          ) : (
            snapshots.map((snapshot) => (
              <div key={snapshot.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 group hover:border-purple-300 hover:shadow-sm transition-all">
                <div className="min-w-0 flex-1 mr-4">
                  <h4 className="font-medium text-gray-800 truncate text-sm">{snapshot.name}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(snapshot.timestamp).toLocaleString('ja-JP')} • タスク数: {snapshot.tasks.length}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => onRestoreSnapshot(snapshot)}
                    title="この状態を復元"
                    icon={<RotateCcw size={14} />}
                    className="hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200"
                  >
                    復元
                  </Button>
                  <button 
                    onClick={() => onDeleteSnapshot(snapshot.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="削除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};