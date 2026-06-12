"use client";

const DB_NAME = "videotosrt.uploads";
const STORE_NAME = "pending_uploads";
const DB_VERSION = 1;

export type PendingUpload = {
  createdAt: number;
  file: File;
  id: string;
  name: string;
  size: number;
  type: string;
};

function openUploadDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function runStoreAction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    openUploadDb()
      .then((db) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const request = action(transaction.objectStore(STORE_NAME));

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      })
      .catch(reject);
  });
}

export async function savePendingUpload(file: File) {
  const id = crypto.randomUUID();
  const upload: PendingUpload = {
    createdAt: Date.now(),
    file,
    id,
    name: file.name,
    size: file.size,
    type: file.type
  };

  await runStoreAction("readwrite", (store) => store.put(upload));
  return upload;
}

export function getPendingUpload(id: string) {
  return runStoreAction<PendingUpload | undefined>("readonly", (store) => store.get(id));
}

export function deletePendingUpload(id: string) {
  return runStoreAction<undefined>("readwrite", (store) => store.delete(id));
}
