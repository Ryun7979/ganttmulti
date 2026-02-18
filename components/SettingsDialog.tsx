import React, { useState, useEffect } from 'react';
import { AppSettings, ColorSet } from '../types';
import { Button } from './Button';
import { Modal } from './Modal';
import { Settings, RefreshCw, Trash2, Plus, Calendar, CheckCircle2, AlertCircle, RotateCcw, BookOpen } from 'lucide-react';
import { tintColor, shadeColor, parseDate, isWeekend, DEFAULT_SETTINGS } from '../utils';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  onRegeneratePeerId: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  onRegeneratePeerId
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'palette' | 'calendar' | 'network' | 'manual'>('general');
  const [localSettings, setLocalSettings] = useState<AppSettings>(() => JSON.parse(JSON.stringify(settings)));
  const [newHoliday, setNewHoliday] = useState('');
  const [holidayError, setHolidayError] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState('');
  const [eventError, setEventError] = useState<string | null>(null);
  const [regenerationSuccess, setRegenerationSuccess] = useState(false);

  // Sync state with props when dialog opens or settings change externally
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(JSON.parse(JSON.stringify(settings)));
    }
  }, [isOpen, settings]);

  const handlePaletteChange = (index: number, value: string) => {
    const newPalette = [...localSettings.assigneePalette];

    // Automatically generate background (very light) and border (light) based on the selected bar color
    const bg = tintColor(value, 0.9);    // 90% white mix
    const border = tintColor(value, 0.6); // 60% white mix

    newPalette[index] = {
      ...newPalette[index],
      bar: value,
      bg: bg,
      border: border
    };
    setLocalSettings({ ...localSettings, assigneePalette: newPalette });
  };

  const handleHolidayColorChange = (field: keyof typeof localSettings.holidayColors, value: string) => {
    let newColors = { ...localSettings.holidayColors, [field]: value };

    // Auto-calculate text colors if header background changes
    if (field === 'headerBg') {
      newColors.dateText = shadeColor(value, 0.6); // Darker shade for date
      newColors.weekdayText = shadeColor(value, 0.4); // Medium shade for weekday
    }

    setLocalSettings({
      ...localSettings,
      holidayColors: newColors
    });
  };

  const handleResetHolidayColors = () => {
    setLocalSettings({
      ...localSettings,
      holidayColors: { ...DEFAULT_SETTINGS.holidayColors }
    });
  };

  const handleEventColorChange = (field: keyof typeof localSettings.eventColors, value: string) => {
    let newColors = {
      ...localSettings.eventColors,
      // fallback if eventColors is undefined in legacy settings
      ...(localSettings.eventColors || {}),
      [field]: value
    };

    // Auto-calculate text colors if header background changes
    if (field === 'headerBg') {
      newColors.dateText = shadeColor(value, 0.6);
      newColors.weekdayText = shadeColor(value, 0.4);
    }

    setLocalSettings({
      ...localSettings,
      eventColors: newColors
    });
  };

  const handleResetEventColors = () => {
    setLocalSettings({
      ...localSettings,
      eventColors: { ...DEFAULT_SETTINGS.eventColors }
    });
  };

  const handleAddHoliday = () => {
    setHolidayError(null);
    if (!newHoliday) return;

    if (localSettings.customHolidays.includes(newHoliday)) {
      setHolidayError('既に登録されています。');
      return;
    }

    // Validation: Cannot be a custom event
    if (localSettings.customEvents?.includes(newHoliday)) {
      setHolidayError('「イベント日」として設定されているため、休日には設定できません。');
      return;
    }
    // Validation: Cannot be a weekend
    if (isWeekend(parseDate(newHoliday))) {
      setHolidayError('指定日は「土日」のため、設定不要です。');
      return;
    }

    const updated = [...localSettings.customHolidays, newHoliday].sort();
    setLocalSettings({ ...localSettings, customHolidays: updated });
    setNewHoliday('');
  };

  const handleRemoveHoliday = (date: string) => {
    setLocalSettings({
      ...localSettings,
      customHolidays: localSettings.customHolidays.filter(d => d !== date)
    });
  };

  const handleAddEvent = () => {
    setEventError(null);
    const currentEvents = localSettings.customEvents || [];
    if (newEvent && !currentEvents.includes(newEvent)) {
      const updated = [...currentEvents, newEvent].sort();
      setLocalSettings({ ...localSettings, customEvents: updated });
      setNewEvent('');
    } else if (currentEvents.includes(newEvent)) {
      setEventError('既に登録されています。');
    }
  };

  const handleRemoveEvent = (date: string) => {
    setLocalSettings({
      ...localSettings,
      customEvents: (localSettings.customEvents || []).filter(d => d !== date)
    });
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const handleRegenerate = () => {
    onRegeneratePeerId();
    setRegenerationSuccess(true);
    setTimeout(() => setRegenerationSuccess(false), 3000);
  };

  const tabs = [
    { id: 'general', label: '一般' },
    { id: 'palette', label: 'カラーパレット' },
    { id: 'calendar', label: 'カレンダー設定' },
    { id: 'network', label: 'ネットワーク' },
    { id: 'manual', label: 'マニュアル' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="設定"
      maxWidth="max-w-2xl"
      icon={<Settings className="text-gray-600" size={20} />}
    >
      <div className="flex flex-col h-[60vh]">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-4 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">アプリケーション名</label>
                <input
                  type="text"
                  value={localSettings.appName || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, appName: e.target.value })}
                  placeholder="例: GanttMalti"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
                <p className="text-xs text-gray-500">画面左上に表示されるタイトルです。</p>
              </div>
            </div>
          )}

          {activeTab === 'palette' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 mb-2">
                担当者に割り当てられる20色のカラーパレットを編集します。<br />
                メインカラーを選択すると、背景色と枠線色が自動的に生成されます。
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {localSettings.assigneePalette.map((color, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
                    <span className="text-xs font-mono text-gray-400 w-6">{index + 1}</span>
                    <div className="flex flex-col gap-2 flex-1">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">メインカラー</label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-400">{color.bar}</span>
                          <input
                            type="color"
                            value={color.bar}
                            onChange={(e) => handlePaletteChange(index, e.target.value)}
                            className="w-8 h-8 p-0 border-0 rounded cursor-pointer shadow-sm"
                          />
                        </div>
                      </div>
                    </div>
                    {/* Preview */}
                    <div className="w-16 h-12 rounded border flex items-center justify-center relative shadow-sm" style={{ backgroundColor: color.bg, borderColor: color.border }}>
                      <div className="h-full absolute left-0 top-0" style={{ width: '50%', backgroundColor: color.bar }}></div>
                      <span className="relative z-10 text-[10px] font-medium drop-shadow-md" style={{ color: color.textColor }}>Text</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'calendar' && (
            <div className="space-y-8">
              {/* Holidays Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-100 rounded-sm border border-red-200"></div>
                    <h3 className="text-base font-bold text-gray-800">休日・祝日設定</h3>
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleResetHolidayColors} icon={<RotateCcw size={12} />} className="text-xs">
                    デフォルトに戻す
                  </Button>
                </div>

                {/* Holiday Colors */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-gray-500 uppercase">表示色設定</h4>
                    <span className="text-[10px] text-gray-400">文字色はヘッダー背景から自動生成</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-white p-2 rounded border">
                        <label className="text-sm text-gray-700">ヘッダー背景</label>
                        <input type="color" value={localSettings.holidayColors.headerBg} onChange={(e) => handleHolidayColorChange('headerBg', e.target.value)} className="w-8 h-6 p-0 border-0 rounded cursor-pointer" />
                      </div>
                      <div className="flex items-center justify-between bg-white p-2 rounded border">
                        <label className="text-sm text-gray-700">グリッド背景</label>
                        <input type="color" value={localSettings.holidayColors.gridBg} onChange={(e) => handleHolidayColorChange('gridBg', e.target.value)} className="w-8 h-6 p-0 border-0 rounded cursor-pointer" />
                      </div>
                    </div>

                    {/* Preview Box */}
                    <div className="border rounded bg-white p-2 flex flex-col items-center justify-center gap-1" style={{ backgroundColor: localSettings.holidayColors.headerBg }}>
                      <span className="text-sm font-bold" style={{ color: localSettings.holidayColors.dateText }}>24</span>
                      <span className="text-xs" style={{ color: localSettings.holidayColors.weekdayText }}>祝日</span>
                      <div className="text-[10px] text-gray-400 bg-white/80 px-1 rounded mt-1">プレビュー</div>
                    </div>
                  </div>
                </div>

                {/* Custom Holidays List */}
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">カスタム休日</h4>
                  <div className="flex flex-col gap-2 mb-3">
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={newHoliday}
                        onChange={(e) => { setNewHoliday(e.target.value); setHolidayError(null); }}
                        className={`flex-1 px-3 py-2 border rounded-lg text-sm ${holidayError ? 'border-red-500 focus:ring-red-200' : 'border-gray-300'}`}
                      />
                      <Button onClick={handleAddHoliday} disabled={!newHoliday} icon={<Plus size={16} />}>追加</Button>
                    </div>
                    {holidayError && (
                      <div className="flex items-center gap-1 text-red-500 text-xs px-1">
                        <AlertCircle size={12} />
                        <span>{holidayError}</span>
                      </div>
                    )}
                  </div>
                  <div className="border rounded-lg overflow-hidden max-h-32 overflow-y-auto bg-white">
                    {localSettings.customHolidays.length === 0 ? (
                      <div className="p-3 text-center text-xs text-gray-400">設定なし</div>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {localSettings.customHolidays.map(date => (
                          <li key={date} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 text-sm">
                            <span className="font-mono text-gray-700">{date}</span>
                            <button onClick={() => handleRemoveHoliday(date)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {/* Events Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-100 rounded-sm border border-yellow-200"></div>
                    <h3 className="text-base font-bold text-gray-800">イベント日設定</h3>
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleResetEventColors} icon={<RotateCcw size={12} />} className="text-xs">
                    デフォルトに戻す
                  </Button>
                </div>

                {/* Event Colors */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-gray-500 uppercase">表示色設定</h4>
                    <span className="text-[10px] text-gray-400">文字色はヘッダー背景から自動生成</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-white p-2 rounded border">
                        <label className="text-sm text-gray-700">ヘッダー背景</label>
                        <input type="color" value={localSettings.eventColors?.headerBg || '#fef9c3'} onChange={(e) => handleEventColorChange('headerBg', e.target.value)} className="w-8 h-6 p-0 border-0 rounded cursor-pointer" />
                      </div>
                      <div className="flex items-center justify-between bg-white p-2 rounded border">
                        <label className="text-sm text-gray-700">グリッド背景</label>
                        <input type="color" value={localSettings.eventColors?.gridBg || '#fefce8'} onChange={(e) => handleEventColorChange('gridBg', e.target.value)} className="w-8 h-6 p-0 border-0 rounded cursor-pointer" />
                      </div>
                    </div>

                    {/* Preview Box */}
                    <div className="border rounded bg-white p-2 flex flex-col items-center justify-center gap-1" style={{ backgroundColor: localSettings.eventColors?.headerBg || '#fef9c3' }}>
                      <span className="text-sm font-bold" style={{ color: localSettings.eventColors?.dateText || '#ca8a04' }}>15</span>
                      <span className="text-xs" style={{ color: localSettings.eventColors?.weekdayText || '#eab308' }}>催事</span>
                      <div className="text-[10px] text-gray-400 bg-white/80 px-1 rounded mt-1">プレビュー</div>
                    </div>
                  </div>
                </div>

                {/* Custom Events List */}
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">カスタムイベント日</h4>
                  <div className="flex flex-col gap-2 mb-3">
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={newEvent}
                        onChange={(e) => { setNewEvent(e.target.value); setEventError(null); }}
                        className={`flex-1 px-3 py-2 border rounded-lg text-sm ${eventError ? 'border-red-500 focus:ring-red-200' : 'border-gray-300'}`}
                      />
                      <Button onClick={handleAddEvent} disabled={!newEvent} icon={<Plus size={16} />}>追加</Button>
                    </div>
                    {eventError && (
                      <div className="flex items-center gap-1 text-red-500 text-xs px-1">
                        <AlertCircle size={12} />
                        <span>{eventError}</span>
                      </div>
                    )}
                  </div>
                  <div className="border rounded-lg overflow-hidden max-h-32 overflow-y-auto bg-white">
                    {(!localSettings.customEvents || localSettings.customEvents.length === 0) ? (
                      <div className="p-3 text-center text-xs text-gray-400">設定なし</div>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {localSettings.customEvents.map(date => (
                          <li key={date} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 text-sm">
                            <span className="font-mono text-gray-700">{date}</span>
                            <button onClick={() => handleRemoveEvent(date)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'network' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                <h3 className="text-sm font-bold text-blue-800 mb-2">P2P IDの設定</h3>
                <p className="text-xs text-blue-700 mb-4">
                  現在のIDを破棄し、新しいIDを生成します。<br />
                  現在接続中のピアとは切断されます。
                </p>
                <div className="flex items-center gap-3">
                  <Button variant="secondary" onClick={handleRegenerate} icon={<RefreshCw size={16} />}>
                    IDを再生成する
                  </Button>
                  {regenerationSuccess && (
                    <span className="text-sm text-green-600 font-bold flex items-center gap-1 animate-pulse">
                      <CheckCircle2 size={16} />
                      新しいIDを生成しました
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'manual' && (
            <div className="space-y-6 text-gray-700">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 mb-3 pb-2 border-b">
                  <BookOpen size={20} className="text-blue-500" />
                  GanttMalti 簡易マニュアル
                </h3>

                <section className="mb-6">
                  <h4 className="font-bold text-gray-900 mb-2">1. 基本操作</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li><span className="font-semibold">タスクの追加:</span> 画面右下の「新規」ボタン、または「最初のタスクを作成」から行います。</li>
                    <li><span className="font-semibold">タスクの編集:</span> ガントチャート上のバーやリストをダブルクリックします。</li>
                    <li><span className="font-semibold">タスクの移動:</span> バーをドラッグして日程を変更できます。</li>
                    <li><span className="font-semibold">期間変更:</span> バーの両端をドラッグして期間を伸縮します。</li>
                    <li><span className="font-semibold">進捗変更:</span> バー下部の白いノブをドラッグして進捗率を変更します。</li>
                  </ul>
                </section>

                <section className="mb-6">
                  <h4 className="font-bold text-gray-900 mb-2">2. 表示・整理</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li><span className="font-semibold">表示モード:</span> ヘッダーの「日・週・月」で切り替えます。</li>
                    <li><span className="font-semibold">リスト順 (自由配置):</span> タスクをドラッグ＆ドロップで並び替えできます。</li>
                    <li><span className="font-semibold">担当者順:</span> 担当者ごとに自動でグループ化します。</li>
                  </ul>
                </section>

                <section className="mb-6">
                  <h4 className="font-bold text-gray-900 mb-2">3. データ管理</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li><span className="font-semibold">Undo/Redo:</span> 矢印ボタンで操作を元に戻せます。</li>
                    <li><span className="font-semibold">一時保存:</span> 「一時保存」ボタンでスナップショットを作成し、後で復元できます。</li>
                    <li><span className="font-semibold">インポート/エクスポート:</span> JSON形式でバックアップ、PDFで画像保存が可能です。</li>
                  </ul>
                </section>

                <section className="mb-6">
                  <h4 className="font-bold text-gray-900 mb-2">4. 同時編集 (P2P)</h4>
                  <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
                    <p className="mb-1 font-semibold">サーバー不要のリアルタイム編集</p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>「共有」ボタンをクリック</li>
                      <li>自分のIDを相手に伝える or 相手のIDを入力して接続</li>
                      <li>接続が確立すると、操作が即座に同期されます</li>
                    </ol>
                  </div>
                </section>

                <section>
                  <h4 className="font-bold text-gray-900 mb-2">5. 設定</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li><span className="font-semibold">アプリ名:</span> タイトルを変更できます。</li>
                    <li><span className="font-semibold">カラーパレット:</span> 担当者の色分け設定。</li>
                    <li><span className="font-semibold">休日・イベント:</span> 独自の休日やイベント日を追加し、色をカスタマイズできます。</li>
                  </ul>
                </section>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>キャンセル</Button>
          <Button onClick={handleSave}>設定を保存</Button>
        </div>
      </div>
    </Modal>
  );
};
