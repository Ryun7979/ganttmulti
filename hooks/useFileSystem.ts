import { useState, useCallback, useEffect } from 'react';
import { saveFileHandle, getLastFileHandle, clearFileHandle } from '../utils/db';
import { validateImportData } from '../utils';
import { AppSettings } from '../types';

export const useFileSystem = () => {
    const [handle, setHandle] = useState<FileSystemFileHandle | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [isPermissionRequired, setIsPermissionRequired] = useState(false);

    // 初期化時に保存されたハンドルを読み込む
    useEffect(() => {
        const loadHandle = async () => {
            try {
                const savedHandle = await getLastFileHandle();
                if (savedHandle) {
                    setHandle(savedHandle);
                    setFileName(savedHandle.name);

                    // 権限があるか確認
                    const permission = await (savedHandle as any).queryPermission({ mode: 'readwrite' });
                    if (permission !== 'granted') {
                        setIsPermissionRequired(true);
                    }
                }
            } catch (error) {
                console.error('Failed to load saved file handle:', error);
            }
        };
        loadHandle();
    }, []);

    // 権限の要求
    const requestPermission = useCallback(async () => {
        if (!handle) return false;
        try {
            const permission = await (handle as any).requestPermission({ mode: 'readwrite' });
            if (permission === 'granted') {
                setIsPermissionRequired(false);
                return true;
            }
        } catch (error) {
            console.error('Permission request failed:', error);
        }
        return false;
    }, [handle]);

    // ファイル選択
    const pickFile = useCallback(async (currentSettings: AppSettings) => {
        try {
            const [newHandle] = await (window as any).showOpenFilePicker({
                types: [{
                    description: 'JSON Files',
                    accept: { 'application/json': ['.json'] },
                }],
                multiple: false,
            });
            setHandle(newHandle);
            setFileName(newHandle.name);
            setIsPermissionRequired(false);
            await saveFileHandle(newHandle);

            const file = await newHandle.getFile();
            const content = await file.text();
            return validateImportData(content, currentSettings);
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error('File pick failed:', error);
                throw error;
            }
        }
        return null;
    }, []);

    // 上書き保存
    const saveFile = useCallback(async (data: any) => {
        if (!handle) return false;
        try {
            const writable = await (handle as any).createWritable();
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();
            return true;
        } catch (error) {
            console.error('File save failed:', error);
            throw error;
        }
    }, [handle]);

    // リロード
    const reloadFile = useCallback(async (currentSettings: AppSettings) => {
        if (!handle) return null;
        try {
            const file = await handle.getFile();
            const content = await file.text();
            return validateImportData(content, currentSettings);
        } catch (error) {
            console.error('File reload failed:', error);
            throw error;
        }
    }, [handle]);

    // ファイル接続解除
    const disconnectFile = useCallback(async () => {
        setHandle(null);
        setFileName(null);
        setIsPermissionRequired(false);
        await clearFileHandle();
    }, []);

    return {
        handle,
        fileName,
        isPermissionRequired,
        pickFile,
        saveFile,
        reloadFile,
        requestPermission,
        disconnectFile
    };
};
