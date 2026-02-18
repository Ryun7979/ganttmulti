import React, { useState, useEffect } from 'react';
import { Task } from '../types';
import { Button } from './Button';
import { Modal } from './Modal';
import { generateId, formatDate, addDays } from '../utils';
import { Plus, Save } from 'lucide-react';

interface TaskFormProps {
  initialData?: Task | null;
  onSave: (task: Task) => void;
  onClose: () => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({ initialData, onSave, onClose }) => {
  const [name, setName] = useState('');
  const [assignee, setAssignee] = useState('');
  const [startDate, setStartDate] = useState(formatDate(new Date()));
  const [endDate, setEndDate] = useState(formatDate(addDays(new Date(), 3)));
  const [progress, setProgress] = useState(0);

  // Initialize form when initialData changes
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setAssignee(initialData.assignee);
      setStartDate(initialData.startDate);
      setEndDate(initialData.endDate);
      setProgress(initialData.progress);
    } else {
      // Reset for new task
      setName('');
      setAssignee('');
      setStartDate(formatDate(new Date()));
      setEndDate(formatDate(addDays(new Date(), 3)));
      setProgress(0);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) return;

    if (new Date(endDate) < new Date(startDate)) {
      alert("終了日は開始日より後の日付を指定してください。");
      return;
    }

    onSave({
      id: initialData?.id || generateId(),
      name,
      assignee,
      startDate,
      endDate,
      progress: Math.min(100, Math.max(0, Number(progress))),
    });
  };

  const isEdit = !!initialData;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isEdit ? 'タスク編集' : '新規タスク追加'}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">タスク名</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            placeholder="例: 設計レビュー"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">担当者</label>
          <input
            type="text"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            placeholder="例: 山田 太郎"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">終了日</label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">達成率</label>
            <span className="text-sm font-bold text-blue-600">{progress}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        <div className="flex justify-end pt-4 gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>キャンセル</Button>
          <Button type="submit" icon={isEdit ? <Save size={16} /> : <Plus size={16} />}>
            {isEdit ? '更新' : '作成'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};