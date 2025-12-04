/**
 * Raw IndexedDB storage for FileSystemDirectoryHandle objects
 * Dexie cannot serialize these objects, so we use the native IndexedDB API
 */

import { promisifyHandler } from "@/lib/promisifyHandler";
import { InternalServerError, NotFoundError } from "../../lib/errors/errors";

const DB_NAME = "DirectoryHandlesDB";
const DB_VERSION = 1;
const STORE_NAME = "directoryHandles";

interface DirectoryHandleRecord {
  diskId: string;
  handle: FileSystemDirectoryHandle;
  directoryName: string;
  lastAccessed: Date;
}

export class DirectoryHandleIDB {
  private static db: IDBDatabase | null = null;
  private static initPromise: Promise<IDBDatabase> | null = null;

  private static async getDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "diskId" });
          store.createIndex("directoryName", "directoryName", { unique: false });
          store.createIndex("lastAccessed", "lastAccessed", { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  static async storeHandle(diskId: string, handle: FileSystemDirectoryHandle): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const record: DirectoryHandleRecord = {
        diskId,
        handle,
        directoryName: handle.name,
        lastAccessed: new Date(),
      };
      console.log("Storing directory handle record:", record);
      await promisifyHandler(store.put(record));
      console.log("Directory handle stored successfully for diskId:", diskId);
    } catch (error) {
      throw error;
    }
  }

  static async getHandle(diskId: string): Promise<FileSystemDirectoryHandle | null> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(diskId);

      const record = await new Promise<DirectoryHandleRecord | undefined>((resolve, reject) => {
        request.onsuccess = () => {
          resolve(request.result);
        };
        request.onerror = () => {
          reject(request.error);
        };
      });

      if (record) {
        // Verify the handle is still valid - keep it simple for now
        try {
          await record.handle.requestPermission({ mode: "readwrite" });
          return record.handle;
        } catch (_permissionError) {
          await this.removeHandle(diskId);
          throw new NotFoundError(`Directory handle for diskId '${diskId}' has invalid permissions and was removed`);
        }
      } else {
        throw new NotFoundError(`Directory handle not found for diskId '${diskId}'`);
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new InternalServerError(`Failed to retrieve directory handle for diskId '${diskId}': ${error}`);
    }
  }

  static async removeHandle(diskId: string): Promise<void> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(diskId);

      await new Promise<void>((resolve, reject) => {
        request.onsuccess = () => {
          resolve();
        };
        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      throw error;
    }
  }

  static async getMetadata(diskId: string): Promise<{ directoryName: string; lastAccessed: Date }> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(diskId);

      const record = await new Promise<DirectoryHandleRecord | undefined>((resolve, reject) => {
        request.onsuccess = () => {
          resolve(request.result);
        };
        request.onerror = () => {
          reject(request.error);
        };
      });

      if (record) {
        return {
          directoryName: record.directoryName,
          lastAccessed: record.lastAccessed,
        };
      }
      throw new NotFoundError(`Metadata not found for diskId '${diskId}'`);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new InternalServerError(`Failed to retrieve metadata for diskId '${diskId}': ${error}`);
    }
  }

  static async hasHandle(diskId: string): Promise<boolean> {
    try {
      const handle = await this.getHandle(diskId);
      return handle !== null;
    } catch (error) {
      if (error instanceof NotFoundError) {
        return false;
      }
      throw error;
    }
  }

  static async listAll(): Promise<Array<{ diskId: string; directoryName: string; lastAccessed: Date }>> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      const records = await new Promise<DirectoryHandleRecord[]>((resolve, reject) => {
        request.onsuccess = () => {
          resolve(request.result);
        };
        request.onerror = () => {
          reject(request.error);
        };
      });

      return records.map((record) => ({
        diskId: record.diskId,
        directoryName: record.directoryName,
        lastAccessed: record.lastAccessed,
      }));
    } catch (error) {
      throw new InternalServerError(`Failed to list all directory handles: ${error}`);
    }
  }
}
