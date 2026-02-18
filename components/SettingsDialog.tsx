import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { Modal } from './Modal';
import { Settings } from 'lucide-react';
import { tintColor, shadeColor, parseDate, isWeekend, DEFAULT_SETTINGS } from '../utils';
import { GeneralSettingsTab, PaletteSettingsTab, CalendarSettingsTab, NetworkSettingsTab, ManualTab } from './SettingsDialogTabs';

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
  const [localSettings, setLocalSettings] = useState<AppSettings>(() => structuredClone(settings));
  const [newHoliday, setNewHoliday] = useState('');
  const [holidayError, setHolidayError] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState('');
  const [eventError, setEventError] = useState<string | null>(null);
  const [regenerationSuccess, setRegenerationSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(structuredClone(settings));
    }
  }, [isOpen, settings]);

  const handlePaletteChange = (index: number, value: string) => {
    const newPalette = [...localSettings.assigneePalette];
    newPalette[index] = {
      ...newPalette[index],
      bar: value,
      bg: tintColor(value, 0.9),
      border: tintColor(value, 0.6)
    };
    setLocalSettings({ ...localSettings, assigneePalette: newPalette });
  };

  const handleHolidayColorChange = (field: keyof AppSettings['holidayColors'], value: string) => {
    const newColors = { ...localSettings.holidayColors, [field]: value };
    if (field === 'headerBg') {
      newColors.dateText = shadeColor(value, 0.6);
      newColors.weekdayText = shadeColor(value, 0.4);
    }
    setLocalSettings({ ...localSettings, holidayColors: newColors });
  };

  const handleEventColorChange = (field: keyof AppSettings['eventColors'], value: string) => {
    const newColors = { ...(localSettings.eventColors || {}), [field]: value } as AppSettings['eventColors'];
    if (field === 'headerBg') {
      newColors.dateText = shadeColor(value, 0.6);
      newColors.weekdayText = shadeColor(value, 0.4);
    }
    setLocalSettings({ ...localSettings, eventColors: newColors });
  };

  const handleAddHoliday = () => {
    if (!newHoliday) return;
    if (localSettings.customHolidays.includes(newHoliday)) return setHolidayError('既に登録されています。');
    if (localSettings.customEvents?.includes(newHoliday)) return setHolidayError('「イベント日」として設定されているため、休日には設定できません。');
    if (isWeekend(parseDate(newHoliday))) return setHolidayError('指定日は「土日」のため、設定不要です。');
    setLocalSettings({ ...localSettings, customHolidays: [...localSettings.customHolidays, newHoliday].sort() });
    setNewHoliday('');
  };

  const handleAddEvent = () => {
    const currentEvents = localSettings.customEvents || [];
    if (newEvent && !currentEvents.includes(newEvent)) {
      setLocalSettings({ ...localSettings, customEvents: [...currentEvents, newEvent].sort() });
      setNewEvent('');
    } else if (currentEvents.includes(newEvent)) {
      setEventError('既に登録されています。');
    }
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
    <Modal isOpen={isOpen} onClose={onClose} title="設定" maxWidth="max-w-2xl" icon={<Settings className="text-gray-600" size={20} />}>
      <div className="flex flex-col h-[60vh]">
        <div className="flex border-b border-gray-200 px-4 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'general' && <GeneralSettingsTab settings={localSettings} onChange={setLocalSettings} />}
          {activeTab === 'palette' && <PaletteSettingsTab palette={localSettings.assigneePalette} onChange={handlePaletteChange} />}
          {activeTab === 'calendar' && (
            <CalendarSettingsTab
              settings={localSettings}
              newHoliday={newHoliday}
              onNewHolidayChange={setNewHoliday}
              holidayError={holidayError}
              onAddHoliday={handleAddHoliday}
              onRemoveHoliday={(date) => setLocalSettings({ ...localSettings, customHolidays: localSettings.customHolidays.filter(d => d !== date) })}
              onHolidayColorChange={handleHolidayColorChange}
              onResetHolidayColors={() => setLocalSettings({ ...localSettings, holidayColors: { ...DEFAULT_SETTINGS.holidayColors } })}
              newEvent={newEvent}
              onNewEventChange={setNewEvent}
              eventError={eventError}
              onAddEvent={handleAddEvent}
              onRemoveEvent={(date) => setLocalSettings({ ...localSettings, customEvents: (localSettings.customEvents || []).filter(d => d !== date) })}
              onEventColorChange={handleEventColorChange}
              onResetEventColors={() => setLocalSettings({ ...localSettings, eventColors: { ...DEFAULT_SETTINGS.eventColors } })}
            />
          )}
          {activeTab === 'network' && <NetworkSettingsTab onRegenerate={handleRegenerate} regenerationSuccess={regenerationSuccess} />}
          {activeTab === 'manual' && <ManualTab />}
        </div>
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">キャンセル</button>
          <button onClick={() => { onSave(localSettings); onClose(); }} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors">設定を保存</button>
        </div>
      </div>
    </Modal>
  );
};
