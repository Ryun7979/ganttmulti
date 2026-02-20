import React, { useRef, useState } from 'react';
import { Task, AppSettings } from '../types';
import { formatDate, DEFAULT_SETTINGS, calculateWorkdays, parseDate, validateImportData } from '../utils';
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

      const commonOptions = {
        useCORS: true,
        logging: false,
        width: totalWidth,
        height: totalHeight,
        windowWidth: totalWidth,
        windowHeight: totalHeight,
        onclone: (clonedDoc: Document, element: HTMLElement) => {
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
              taskListClone.querySelectorAll('p.text-sm').forEach((node) => {
                const p = node as HTMLElement;
                if (!p) return;
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
                if (!p) return;
                p.style.fontSize = '9px';
                p.style.lineHeight = '1.4';
                p.style.paddingBottom = '2px';
                p.style.overflow = 'visible';
              });
              // Target w-12 (Workdays) and w-20 (Assignee)
              taskListClone.querySelectorAll('div.w-12, div.w-20').forEach((node) => {
                const div = node as HTMLElement;
                if (!div) return;
                div.style.fontSize = '11px';
                div.style.display = 'flex';
                div.style.alignItems = 'center';
                div.style.justifyContent = 'flex-end';
                div.style.height = '100%';
                div.style.overflow = 'visible';
              });
            }
          }

          // Safety check for ganttWrapper (index 2 might not exist if layout changes)
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
                const el = node as HTMLElement;
                if (el) el.style.display = 'none';
              });

              // Adjust Labels (Tasks)
              ganttScrollClone.querySelectorAll('span.text-xs.font-semibold').forEach((node) => {
                const span = node as HTMLElement;
                if (!span) return;
                span.style.fontSize = '9px';
                span.style.lineHeight = '1';
                span.style.transform = 'translateY(-1.5px)';
                span.style.overflow = 'visible';
                span.style.display = 'flex';
                span.style.alignItems = 'center';
                span.style.whiteSpace = 'nowrap';
              });

              // Adjust Labels (Milestones) - Targeting the specific style of milestone labels
              const milestoneLabels = ganttScrollClone.querySelectorAll('.absolute.left-full.ml-1.text-xs');
              milestoneLabels.forEach((node) => {
                const div = node as HTMLElement;
                if (!div) return;
                div.style.fontSize = '9px';
                // Ensure it's visible and doesn't get cut off
                div.style.whiteSpace = 'nowrap';
                div.style.overflow = 'visible';
              });
            }
          }
        }
      };

      // Recursive function to attempt export with decreasing scale
      const attemptExport = async (currentScale: number) => {
        try {
          const canvas = await html2canvas(exportContainerRef.current!, {
            ...commonOptions,
            scale: currentScale
          });

          // toDataURL can fail if image is too big
          const imgData = canvas.toDataURL('image/png');

          const pdfInstance = new jsPDF({
            orientation: totalWidth > totalHeight ? 'l' : 'p',
            unit: 'px',
            format: [totalWidth, totalHeight]
          });

          pdfInstance.addImage(imgData, 'PNG', 0, 0, totalWidth, totalHeight);
          pdfInstance.save(`${settings.appName.replace(/\s+/g, '_')}_export_${formatDate(new Date())}.pdf`);

        } catch (err: any) {
          console.warn(`Export failed at scale ${currentScale}:`, err);
          if (currentScale > 1) {
            // Try lower scale
            // 2 -> 1.5 -> 1
            if (currentScale === 2) {
              await attemptExport(1.5);
            } else if (currentScale === 1.5) {
              await attemptExport(1);
            } else {
              throw err; // Give up if 1 fails
            }
          } else {
            throw err;
          }
        }
      };

      // Start with scale 2 (was 3, and caused invalid string length error)
      await attemptExport(2);

    } catch (err: any) {
      console.error('Export PDF Error:', err);
      // Show more detailed error message to the user
      alert(`PDFの生成に失敗しました。\nエラー詳細: ${err.message || err}`);
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
        const { tasks: cleanTasks, settings: extractedSettings } = validateImportData(content, settings);

        setPendingImportTasks(cleanTasks);
        setPendingSettings(extractedSettings);
        onSuccess();
      } catch (error: any) {
        console.error('Import Error:', error);
        onError(error.message || '不明なエラーが発生しました。');
      } finally {
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
