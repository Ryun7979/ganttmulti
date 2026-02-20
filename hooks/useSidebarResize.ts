import React, { useState, useRef, useEffect, useCallback } from 'react';

export const useSidebarResize = (initialWidth: number = 320) => {
  const STORAGE_KEY = 'ganttmulti-sidebar-width';

  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed)) return parsed;
        }
      } catch (e) {
        console.error('Failed to load sidebar width', e);
      }
    }
    return initialWidth;
  });

  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const sidebarResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  // Persistence with debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, sidebarWidth.toString());
      } catch (e) {
        console.error('Failed to save sidebar width', e);
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [sidebarWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar && sidebarResizeRef.current) {
        const delta = e.clientX - sidebarResizeRef.current.startX;
        setSidebarWidth(Math.max(200, Math.min(1200, sidebarResizeRef.current.startWidth + delta)));
      }
    };
    const handleMouseUp = () => {
      if (isResizingSidebar) {
        setIsResizingSidebar(false);
        sidebarResizeRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    if (isResizingSidebar) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSidebar]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);
    sidebarResizeRef.current = { startX: e.clientX, startWidth: sidebarWidth };
  }, [sidebarWidth]);

  return {
    sidebarWidth,
    isResizingSidebar,
    handleResizeStart
  };
};