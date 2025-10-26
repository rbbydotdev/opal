// Module augmentation for FileSystemDirectoryHandle
declare global {
  interface FileSystemDirectoryHandle {
    requestPermission(options?: { mode?: "read" | "readwrite" }): Promise<"granted" | "denied">;
    queryPermission?(options?: { mode?: "read" | "readwrite" }): Promise<"granted" | "denied">;
  }

  interface FileSystemFileHandle {
    requestPermission?(options?: { mode?: "read" | "readwrite" }): Promise<"granted" | "denied">;
    queryPermission?(options?: { mode?: "read" | "readwrite" }): Promise<"granted" | "denied">;
  }
  interface Window {
    showDirectoryPicker?: (options?: OpenDirectoryPickerOptions) => Promise<FileSystemDirectoryHandle>;
  }
}
// when you use declare global in a file, TypeScript needs to know that the file is a module (not a script). Adding export {} is
// the minimal way to make TypeScript treat the file as a module, which allows the global interface augmentation to work properly.

// Ensure this file is treated as a module
export {};
