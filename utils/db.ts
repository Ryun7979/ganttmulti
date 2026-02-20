const DB_NAME = 'gantt-file-system-db';
const STORE_NAME = 'file-handles';
const KEY_LAST_HANDLE = 'last-file-handle';

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const saveFileHandle = async (handle: FileSystemFileHandle) => {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(handle, KEY_LAST_HANDLE);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const getLastFileHandle = async (): Promise<FileSystemFileHandle | undefined> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(KEY_LAST_HANDLE);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const clearFileHandle = async () => {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(KEY_LAST_HANDLE);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};
