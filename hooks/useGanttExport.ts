import React, { useRef, useState } from 'react';
import { Task, AppSettings } from '../types';
import { formatDate, DEFAULT_SETTINGS, calculateWorkdays, parseDate } from '../utils';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface UseGanttExportProps {
  settings: AppSettings;
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  sidebarWidth: number;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const useGanttExport = ({ settings, tasks, setTasks, sidebarWidth }: UseGanttExportProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportContainerRef = useRef<HTMLDivElement>(null);
  const taskListRef = useRef<HTMLDivElement>(null);
  const ganttChartRef = useRef<HTMLDivElement>(null);
  const [pendingImportTasks, setPendingImportTasks] = useState<Task[] | null>(null);
  const [pendingSettings, setPendingSettings] = useState<AppSettings | null>(null);

  const handleExportJSON = () => {
    // Export as an object containing metadata, settings, and tasks
    const exportData = {
      appName: settings.appName,
      settings: settings,
      exportedAt: new Date().toISOString(),
      tasks: tasks.map(t => ({
        ...t,
        workdays: t.workdays ?? calculateWorkdays(parseDate(t.startDate), parseDate(t.endDate), settings, t.startTime, t.endTime)
      }))
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `${settings.appName.replace(/\s+/g, '_')}_${formatDate(new Date())}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleExportPDF = async () => {
    if (!exportContainerRef.current || !taskListRef.current || !ganttChartRef.current) return;

    try {
      const taskListEl = taskListRef.current;
      const ganttChartEl = ganttChartRef.current;

      const sidebarHeight = 40 + taskListEl.scrollHeight;
      const ganttHeight = ganttChartEl.scrollHeight;

      const totalHeight = Math.max(sidebarHeight, ganttHeight);
      const totalWidth = sidebarWidth + ganttChartEl.scrollWidth;

      const canvas = await html2canvas(exportContainerRef.current, {
        scale: 3,
        useCORS: true,
        logging: false,
        width: totalWidth,
        height: totalHeight,
        windowWidth: totalWidth,
        windowHeight: totalHeight,
        onclone: (clonedDoc, element) => {
          const el = element as HTMLElement;
          el.style.overflow = 'visible';
          el.style.width = `${totalWidth}px`;
          el.style.height = `${totalHeight}px`;

          const sidebarWrapper = el.children[0] as HTMLElement;
          if (sidebarWrapper) {
            sidebarWrapper.style.height = 'auto';
            const taskListClone = sidebarWrapper.querySelector('.no-scrollbar') as HTMLElement;
            if (taskListClone) {
              taskListClone.style.overflow = 'visible';
              taskListClone.style.height = 'auto';

              // Adjust font sizes
              // Adjust font sizes
              taskListClone.querySelectorAll('p.text-sm').forEach((node) => {
                const p = node as HTMLElement;
                p.style.fontSize = '12px';
                p.style.lineHeight = '1.5';
                p.style.height = '20px';
                p.style.overflow = 'hidden';
                p.style.textOverflow = 'ellipsis';
                p.style.whiteSpace = 'nowrap';
                p.style.display = 'block';
              });
              taskListClone.querySelectorAll('p[class*="text-[10px]"]').forEach((node) => {
                const p = node as HTMLElement;
                p.style.fontSize = '9px';
                p.style.lineHeight = '1.4';
                p.style.paddingBottom = '2px';
                p.style.overflow = 'visible';
              });
              // Target w-12 (Workdays) and w-20 (Assignee)
              taskListClone.querySelectorAll('div.w-12, div.w-20').forEach((node) => {
                const div = node as HTMLElement;
                div.style.fontSize = '11px';
                div.style.display = 'flex';
                div.style.alignItems = 'center';
                div.style.justifyContent = 'flex-end';
                div.style.height = '100%';
                div.style.overflow = 'visible';
              });
            }
          }

          const ganttWrapper = el.children[2] as HTMLElement;
          if (ganttWrapper) {
            ganttWrapper.style.overflow = 'visible';
            const ganttScrollClone = ganttWrapper.querySelector('.hide-scrollbar') as HTMLElement;
            if (ganttScrollClone) {
              ganttScrollClone.style.overflow = 'visible';
              ganttScrollClone.style.width = 'auto';
              ganttScrollClone.style.height = 'auto';

              // Hide checkmarks
              ganttScrollClone.querySelectorAll('svg.lucide-check').forEach((node) => {
                (node as HTMLElement).style.display = 'none';
              });

              // Adjust Labels
              ganttScrollClone.querySelectorAll('span.text-xs.font-semibold').forEach((node) => {
                const span = node as HTMLElement;
                span.style.fontSize = '9px';
                span.style.lineHeight = '1';
                span.style.transform = 'translateY(-1.5px)';
                span.style.overflow = 'visible';
                span.style.display = 'flex';
                span.style.alignItems = 'center';
                span.style.whiteSpace = 'nowrap';
              });
            }
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: totalWidth > totalHeight ? 'l' : 'p',
        unit: 'px',
        format: [totalWidth, totalHeight]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, totalWidth, totalHeight);
      pdf.save(`${settings.appName.replace(/\s+/g, '_')}_export_${formatDate(new Date())}.pdf`);
    } catch (err) {
      console.error('Export PDF Error:', err);
      alert('PDFの生成に失敗しました。');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, onSuccess: () => void, onError: (msg: string) => void) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      onError('ファイルサイズが大きすぎます (最大 5MB)');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (!content || content.trim() === '') {
          throw new Error('ファイルが空です。');
        }

        let parsedData;
        try {
          parsedData = JSON.parse(content);
        } catch (jsonError) {
          throw new Error('ファイルが正しいJSON形式ではありません。\nカンマの不足や括弧の閉じ忘れがないか確認してください。');
        }

        let extractedTasks: any[] = [];
        let extractedSettings: AppSettings | null = null;

        // Determine if it's legacy format (Array) or new format (Object with tasks)
        if (Array.isArray(parsedData)) {
          extractedTasks = parsedData;
        } else if (typeof parsedData === 'object' && parsedData !== null) {
          if (Array.isArray(parsedData.tasks)) {
            extractedTasks = parsedData.tasks;

            // Extract Settings if present
            if (parsedData.settings) {
              extractedSettings = { ...DEFAULT_SETTINGS, ...parsedData.settings };
            } else if (typeof parsedData.appName === 'string' && parsedData.appName.trim() !== '') {
              // Legacy format with just appName: preserve current settings but update appName
              extractedSettings = { ...settings, appName: parsedData.appName };
            }

          } else {
            throw new Error('データの形式が正しくありません。\n"tasks" プロパティが見つかりません。');
          }
        } else {
          throw new Error('データの形式が正しくありません。\nルート要素はタスク配列またはプロジェクトオブジェクトである必要があります。');
        }

        if (extractedTasks.length === 0) {
          throw new Error('インポートするタスクが見つかりません（リストが空です）。');
        }

        // Detailed Validation
        const cleanTasks: Task[] = extractedTasks.map((t: any, index: number) => {
          const rowNum = index + 1;
          const tempName = t.name ? `「${t.name}」` : '（名称不明）';

          // Check ID
          if (!t.id && t.id !== 0 && t.id !== '0') {
            throw new Error(`${rowNum}行目のタスクにIDがありません。`);
          }

          // Check Name
          if (!t.name || typeof t.name !== 'string' || !t.name.trim()) {
            throw new Error(`${rowNum}行目 (ID: ${t.id}) のタスク名が無効、または空です。`);
          }

          // Check Dates
          const startDate = Date.parse(t.startDate);
          const endDate = Date.parse(t.endDate);

          if (!t.startDate || isNaN(startDate)) {
            throw new Error(`${rowNum}行目 ${tempName}: 開始日 (${t.startDate}) が無効な日付形式です。YYYY-MM-DD形式を確認してください。`);
          }
          if (!t.endDate || isNaN(endDate)) {
            throw new Error(`${rowNum}行目 ${tempName}: 終了日 (${t.endDate}) が無効な日付形式です。YYYY-MM-DD形式を確認してください。`);
          }

          // Logic Check
          if (startDate > endDate) {
            throw new Error(`${rowNum}行目 ${tempName}: 開始日が終了日より後になっています。\n開始日: ${t.startDate}, 終了日: ${t.endDate}`);
          }

          // Check Progress
          const progress = Number(t.progress);
          if (typeof t.progress === 'undefined' || isNaN(progress) || progress < 0 || progress > 100) {
            throw new Error(`${rowNum}行目 ${tempName}: 進捗率 (progress) は0〜100の数値である必要があります。`);
          }

          // Check Workdays
          let workdays: number | undefined;
          if (typeof t.workdays !== 'undefined') {
            const w = Number(t.workdays);
            if (isNaN(w) || w < 0) {
              throw new Error(`${rowNum}行目 ${tempName}: 稼働日 (workdays) は0以上の数値である必要があります。`);
            }
            workdays = w;
          }

          // Sanitize
          // Check Type
          let type: 'task' | 'milestone' | undefined;
          if (t.type === 'milestone' || t.type === 'task') {
            type = t.type;
          } else {
            type = 'task';
          }

          // Check StartTime/EndTime
          let startTime: 'AM' | 'PM' | undefined;
          if (t.startTime === 'AM' || t.startTime === 'PM') {
            startTime = t.startTime;
          }
          let endTime: 'AM' | 'PM' | undefined;
          if (t.endTime === 'AM' || t.endTime === 'PM') {
            endTime = t.endTime;
          }

          return {
            id: String(t.id),
            name: String(t.name).trim(),
            assignee: t.assignee ? String(t.assignee).trim() : '',
            startDate: t.startDate,
            endDate: t.endDate,
            progress: progress,
            workdays: workdays,
            type: type,
            startTime: startTime,
            endTime: endTime
          };
        });

        setPendingImportTasks(cleanTasks);
        setPendingSettings(extractedSettings);
        onSuccess();
      } catch (error: any) {
        console.error('Import Error:', error);
        onError(error.message || '不明なエラーが発生しました。');
      } finally {
        // Reset the file input so the user can re-select the same file if they fixed it
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.onerror = () => {
      onError('ファイルの読み込み中にエラーが発生しました。');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  return {
    fileInputRef,
    exportContainerRef,
    taskListRef,
    ganttChartRef,
    pendingImportTasks,
    setPendingImportTasks,
    pendingSettings,
    setPendingSettings,
    handleExportJSON,
    handleExportPDF,
    handleImportClick,
    handleFileChange
  };
};
