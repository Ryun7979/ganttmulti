import React from 'react';
import { AppSettings, ColorSet } from '../types';
import { Button } from './Button';
import { RefreshCw, Trash2, Plus, AlertCircle, RotateCcw, BookOpen, CheckCircle2 } from 'lucide-react';

// --- Sub-components for Tabs ---

export const GeneralSettingsTab: React.FC<{
    settings: AppSettings;
    onChange: (settings: AppSettings) => void;
}> = ({ settings, onChange }) => (
    <div className="space-y-4">
        <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">アプリケーション名</label>
            <input
                type="text"
                value={settings.appName || ''}
                onChange={(e) => onChange({ ...settings, appName: e.target.value })}
                placeholder="例: GanttMalti"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
            <p className="text-xs text-gray-500">画面左上に表示されるタイトルです。</p>
        </div>
    </div>
);

export const PaletteSettingsTab: React.FC<{
    palette: ColorSet[];
    onChange: (index: number, value: string) => void;
}> = ({ palette, onChange }) => (
    <div className="space-y-4">
        <p className="text-sm text-gray-500 mb-2">
            担当者に割り当てられる20色のカラーパレットを編集します。<br />
            メインカラーを選択すると、背景色と枠線色が自動的に生成されます。
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {palette.map((color, index) => (
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
                                    onChange={(e) => onChange(index, e.target.value)}
                                    className="w-8 h-8 p-0 border-0 rounded cursor-pointer shadow-sm"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="w-16 h-12 rounded border flex items-center justify-center relative shadow-sm" style={{ backgroundColor: color.bg, borderColor: color.border }}>
                        <div className="h-full absolute left-0 top-0" style={{ width: '50%', backgroundColor: color.bar }}></div>
                        <span className="relative z-10 text-[10px] font-medium drop-shadow-md" style={{ color: color.textColor }}>Text</span>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export const CalendarSettingsTab: React.FC<{
    settings: AppSettings;
    newHoliday: string;
    onNewHolidayChange: (val: string) => void;
    holidayError: string | null;
    onAddHoliday: () => void;
    onRemoveHoliday: (date: string) => void;
    onHolidayColorChange: (field: keyof AppSettings['holidayColors'], value: string) => void;
    onResetHolidayColors: () => void;
    newEvent: string;
    onNewEventChange: (val: string) => void;
    eventError: string | null;
    onAddEvent: () => void;
    onRemoveEvent: (date: string) => void;
    onEventColorChange: (field: keyof AppSettings['eventColors'], value: string) => void;
    onResetEventColors: () => void;
}> = ({
    settings, newHoliday, onNewHolidayChange, holidayError, onAddHoliday, onRemoveHoliday, onHolidayColorChange, onResetHolidayColors,
    newEvent, onNewEventChange, eventError, onAddEvent, onRemoveEvent, onEventColorChange, onResetEventColors
}) => (
        <div className="space-y-8">
            {/* Holidays Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-100 rounded-sm border border-red-200"></div>
                        <h3 className="text-base font-bold text-gray-800">休日・祝日設定</h3>
                    </div>
                    <Button variant="secondary" size="sm" onClick={onResetHolidayColors} icon={<RotateCcw size={12} />} className="text-xs">
                        デフォルトに戻す
                    </Button>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-gray-500 uppercase">表示色設定</h4>
                        <span className="text-[10px] text-gray-400">文字色はヘッダー背景から自動生成</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between bg-white p-2 rounded border">
                                <label className="text-sm text-gray-700">ヘッダー背景</label>
                                <input type="color" value={settings.holidayColors.headerBg} onChange={(e) => onHolidayColorChange('headerBg', e.target.value)} className="w-8 h-6 p-0 border-0 rounded cursor-pointer" />
                            </div>
                            <div className="flex items-center justify-between bg-white p-2 rounded border">
                                <label className="text-sm text-gray-700">グリッド背景</label>
                                <input type="color" value={settings.holidayColors.gridBg} onChange={(e) => onHolidayColorChange('gridBg', e.target.value)} className="w-8 h-6 p-0 border-0 rounded cursor-pointer" />
                            </div>
                        </div>
                        <div className="border rounded bg-white p-2 flex flex-col items-center justify-center gap-1" style={{ backgroundColor: settings.holidayColors.headerBg }}>
                            <span className="text-sm font-bold" style={{ color: settings.holidayColors.dateText }}>24</span>
                            <span className="text-xs" style={{ color: settings.holidayColors.weekdayText }}>祝日</span>
                            <div className="text-[10px] text-gray-400 bg-white/80 px-1 rounded mt-1">プレビュー</div>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">カスタム休日</h4>
                    <div className="flex flex-col gap-2 mb-3">
                        <div className="flex gap-2">
                            <input
                                type="date"
                                value={newHoliday}
                                onChange={(e) => onNewHolidayChange(e.target.value)}
                                className={`flex-1 px-3 py-2 border rounded-lg text-sm ${holidayError ? 'border-red-500 focus:ring-red-200' : 'border-gray-300'}`}
                            />
                            <Button onClick={onAddHoliday} disabled={!newHoliday} icon={<Plus size={16} />}>追加</Button>
                        </div>
                        {holidayError && (
                            <div className="flex items-center gap-1 text-red-500 text-xs px-1">
                                <AlertCircle size={12} />
                                <span>{holidayError}</span>
                            </div>
                        )}
                    </div>
                    <div className="border rounded-lg overflow-hidden max-h-32 overflow-y-auto bg-white">
                        {settings.customHolidays.length === 0 ? (
                            <div className="p-3 text-center text-xs text-gray-400">設定なし</div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {settings.customHolidays.map(date => (
                                    <li key={date} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 text-sm">
                                        <span className="font-mono text-gray-700">{date}</span>
                                        <button onClick={() => onRemoveHoliday(date)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
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
                    <Button variant="secondary" size="sm" onClick={onResetEventColors} icon={<RotateCcw size={12} />} className="text-xs">
                        デフォルトに戻す
                    </Button>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-gray-500 uppercase">表示色設定</h4>
                        <span className="text-[10px] text-gray-400">文字色はヘッダー背景から自動生成</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between bg-white p-2 rounded border">
                                <label className="text-sm text-gray-700">ヘッダー背景</label>
                                <input type="color" value={settings.eventColors?.headerBg || '#fef9c3'} onChange={(e) => onEventColorChange('headerBg', e.target.value)} className="w-8 h-6 p-0 border-0 rounded cursor-pointer" />
                            </div>
                            <div className="flex items-center justify-between bg-white p-2 rounded border">
                                <label className="text-sm text-gray-700">グリッド背景</label>
                                <input type="color" value={settings.eventColors?.gridBg || '#fefce8'} onChange={(e) => onEventColorChange('gridBg', e.target.value)} className="w-8 h-6 p-0 border-0 rounded cursor-pointer" />
                            </div>
                        </div>
                        <div className="border rounded bg-white p-2 flex flex-col items-center justify-center gap-1" style={{ backgroundColor: settings.eventColors?.headerBg || '#fef9c3' }}>
                            <span className="text-sm font-bold" style={{ color: settings.eventColors?.dateText || '#ca8a04' }}>15</span>
                            <span className="text-xs" style={{ color: settings.eventColors?.weekdayText || '#eab308' }}>催事</span>
                            <div className="text-[10px] text-gray-400 bg-white/80 px-1 rounded mt-1">プレビュー</div>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">カスタムイベント日</h4>
                    <div className="flex flex-col gap-2 mb-3">
                        <div className="flex gap-2">
                            <input
                                type="date"
                                value={newEvent}
                                onChange={(e) => onNewEventChange(e.target.value)}
                                className={`flex-1 px-3 py-2 border rounded-lg text-sm ${eventError ? 'border-red-500 focus:ring-red-200' : 'border-gray-300'}`}
                            />
                            <Button onClick={onAddEvent} disabled={!newEvent} icon={<Plus size={16} />}>追加</Button>
                        </div>
                        {eventError && (
                            <div className="flex items-center gap-1 text-red-500 text-xs px-1">
                                <AlertCircle size={12} />
                                <span>{eventError}</span>
                            </div>
                        )}
                    </div>
                    <div className="border rounded-lg overflow-hidden max-h-32 overflow-y-auto bg-white">
                        {(!settings.customEvents || settings.customEvents.length === 0) ? (
                            <div className="p-3 text-center text-xs text-gray-400">設定なし</div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {settings.customEvents.map(date => (
                                    <li key={date} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 text-sm">
                                        <span className="font-mono text-gray-700">{date}</span>
                                        <button onClick={() => onRemoveEvent(date)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

export const NetworkSettingsTab: React.FC<{
    onRegenerate: () => void;
    regenerationSuccess: boolean;
}> = ({ onRegenerate, regenerationSuccess }) => (
    <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
            <h3 className="text-sm font-bold text-blue-800 mb-2">P2P IDの設定</h3>
            <p className="text-xs text-blue-700 mb-4">
                現在のIDを破棄し、新しいIDを生成します。<br />
                現在接続中のピアとは切断されます。
            </p>
            <div className="flex items-center gap-3">
                <Button variant="secondary" onClick={onRegenerate} icon={<RefreshCw size={16} />}>
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
);

export const ManualTab: React.FC = () => (
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
);
