import React, { useState, useEffect } from 'react';
import { Task, AppSettings } from '../types';
import { Button } from './Button';
import { Modal } from './Modal';
import { generateId, formatDate, addDays, calculateWorkdays, calculateEndDate, parseDate } from '../utils';
import { Plus, Save } from 'lucide-react';

interface TaskFormProps {
  initialData?: Task | null;
  onSave: (task: Task) => void;
  onClose: () => void;
  settings: AppSettings;
}

export const TaskForm: React.FC<TaskFormProps> = ({ initialData, onSave, onClose, settings }) => {
  const [name, setName] = useState('');
  const [assignee, setAssignee] = useState('');
  const [startDate, setStartDate] = useState(formatDate(new Date()));
  const [endDate, setEndDate] = useState(formatDate(addDays(new Date(), 3)));
  const [type, setType] = useState<'task' | 'milestone'>('task');
  const [workdays, setWorkdays] = useState(0);
  const [workdaysStr, setWorkdaysStr] = useState('0');
  const [progress, setProgress] = useState(0);
  const [startTime, setStartTime] = useState<'AM' | 'PM'>('AM');
  const [endTime, setEndTime] = useState<'AM' | 'PM'>('PM');

  // Initialize form when initialData changes
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setAssignee(initialData.assignee);
      setStartDate(initialData.startDate);
      setEndDate(initialData.endDate);
      setEndDate(initialData.endDate);
      setEndDate(initialData.endDate);
      setStartTime(initialData.startTime || 'AM');
      setEndTime(initialData.endTime || 'PM');
      setEndTime(initialData.endTime || 'PM');
      const calculatedDays = initialData.workdays ?? calculateWorkdays(parseDate(initialData.startDate), parseDate(initialData.endDate), settings, initialData.startTime || 'AM', initialData.endTime || 'PM');
      setWorkdays(calculatedDays);
      setWorkdaysStr(calculatedDays.toString());
      setProgress(initialData.progress);
      setType(initialData.type || 'task');
    } else {
      // Reset for new task
      const today = new Date();
      const initialStart = formatDate(today);
      const initialEnd = formatDate(addDays(today, 3));
      setName('');
      setAssignee('');
      setStartDate(initialStart);
      setEndDate(initialEnd);
      setStartDate(initialStart);
      setEndDate(initialEnd);
      setStartTime('AM');
      setEndTime('PM');
      setEndTime('PM');
      const calculatedDays = calculateWorkdays(parseDate(initialStart), parseDate(initialEnd), settings, 'AM', 'PM');
      setWorkdays(calculatedDays);
      setWorkdaysStr(calculatedDays.toString());
      setWorkdays(calculatedDays);
      setWorkdaysStr(calculatedDays.toString());
      setProgress(0);
      setType('task');
    }
  }, [initialData, settings]);

  // Handlers for bi-directional binding
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    setStartDate(newStart);

    if (type === 'milestone') {
      setEndDate(newStart);
      return;
    }

    if (newStart && endDate) {
      // 開始日が変更されたら、終了日を維持して稼働日を再計算
      const days = calculateWorkdays(parseDate(newStart), parseDate(endDate), settings, startTime, endTime);
      setWorkdays(days);
      setWorkdaysStr(days.toString());
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = e.target.value;
    setEndDate(newEnd);
    if (startDate && newEnd) {
      // 終了日が変更されたら、稼働日を再計算
      const days = calculateWorkdays(parseDate(startDate), parseDate(newEnd), settings, startTime, endTime);
      setWorkdays(days);
      setWorkdaysStr(days.toString());
    }
  };

  const handleStartTimeChange = (val: 'AM' | 'PM') => {
    setStartTime(val);
    if (startDate && endDate) {
      const days = calculateWorkdays(parseDate(startDate), parseDate(endDate), settings, val, endTime);
      setWorkdays(days);
      setWorkdaysStr(days.toString());
    }
  };

  const handleEndTimeChange = (val: 'AM' | 'PM') => {
    setEndTime(val);
    if (startDate && endDate) {
      const days = calculateWorkdays(parseDate(startDate), parseDate(endDate), settings, startTime, val);
      setWorkdays(days);
      setWorkdaysStr(days.toString());
    }
  };

  const handleWorkdaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    setWorkdaysStr(valStr);
    const val = parseFloat(valStr);

    // Only update logical state if valid number
    if (!isNaN(val) && val >= 0) {
      setWorkdays(val);
      if (startDate && val > 0) {
        // 稼働日が変更されたら、終了日を再計算 (addWorkdays -> calculateEndDate)
        const { date, timing } = calculateEndDate(parseDate(startDate), val, settings, startTime);
        setEndDate(formatDate(date));
        setEndTime(timing);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) return;

    if (type === 'task' && new Date(endDate) < new Date(startDate)) {
      alert("終了日は開始日より後の日付を指定してください。");
      return;
    }

    onSave({
      id: initialData?.id || generateId(),
      name,
      assignee,
      startDate,
      endDate: type === 'milestone' ? startDate : endDate,
      startTime: type === 'milestone' ? 'AM' : startTime,
      endTime: type === 'milestone' ? 'AM' : endTime,
      workdays: type === 'milestone' ? 0 : workdays,
      progress: Math.min(100, Math.max(0, Number(progress))),
      type,
    });
  };

  const isEdit = !!initialData;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isEdit ? 'タスク編集' : '新規タスク追加'}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Type Selection */}
        <div className="flex gap-4 mb-4">
          <label className={`flex items-center gap-2 cursor-pointer ${isEdit ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <input
              type="radio"
              name="taskType"
              value="task"
              checked={type === 'task'}
              onChange={() => !isEdit && setType('task')}
              disabled={isEdit}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">タスク</span>
          </label>
          <label className={`flex items-center gap-2 cursor-pointer ${isEdit ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <input
              type="radio"
              name="taskType"
              value="milestone"
              checked={type === 'milestone'}
              onChange={() => !isEdit && setType('milestone')}
              disabled={isEdit}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">マイルストーン</span>
          </label>
        </div>

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

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{type === 'milestone' ? '期日' : '開始日'}</label>
            <div className="flex gap-2">
              <input
                type="date"
                required
                value={startDate}
                onChange={handleStartDateChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
              {type === 'task' && settings.minDayUnit && settings.minDayUnit < 1 && (
                <select
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value as 'AM' | 'PM')}
                  className="px-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              )}
            </div>
          </div>

          {type === 'task' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">稼働日</label>
                <input
                  type="number"
                  min={settings.minDayUnit || 1}
                  step={settings.minDayUnit || 1}
                  required
                  value={workdaysStr}
                  onChange={handleWorkdaysChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">終了日</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={handleEndDateChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                  {settings.minDayUnit && settings.minDayUnit < 1 && (
                    <select
                      value={endTime}
                      onChange={(e) => handleEndTimeChange(e.target.value as 'AM' | 'PM')}
                      className="px-2 border border-gray-300 rounded-lg text-sm bg-white"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {type === 'task' && (
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
        )}

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
