import { CommonFileSystem } from "@/data/fs/FileSystemTypes";
import { NamespacedFs } from "@/data/fs/TranslateFs";
import { absPath } from "@/lib/paths2";
import { TestSuite } from "@/lib/tests/TestSuite";

class MockFileSystem implements CommonFileSystem {
  private operations: Array<{ method: string; args: any[] }> = [];

  getOperations() {
    return this.operations;
  }

  clearOperations() {
    this.operations = [];
  }

  async readdir(path: string) {
    this.operations.push({ method: "readdir", args: [path] });
    return ["file1.txt", "file2.md"];
  }

  async stat(path: string) {
    this.operations.push({ method: "stat", args: [path] });
    return { isDirectory: () => false, isFile: () => true };
  }

  async readFile(path: string, options?: { encoding?: "utf8" }) {
    this.operations.push({ method: "readFile", args: [path, options] });
    return "file content";
  }

  async mkdir(path: string, options?: { recursive?: boolean; mode: number }) {
    this.operations.push({ method: "mkdir", args: [path, options] });
    return path;
  }

  async rename(oldPath: string, newPath: string) {
    this.operations.push({ method: "rename", args: [oldPath, newPath] });
  }

  async unlink(path: string) {
    this.operations.push({ method: "unlink", args: [path] });
  }

  async writeFile(path: string, data: any, options?: { encoding?: "utf8"; mode: number }) {
    this.operations.push({ method: "writeFile", args: [path, data, options] });
  }

  async rmdir(path: string, options?: { recursive?: boolean }) {
    this.operations.push({ method: "rmdir", args: [path, options] });
  }

  async lstat(path: string) {
    this.operations.push({ method: "lstat", args: [path] });
    return { isDirectory: () => false, isFile: () => true };
  }

  async symlink(target: string, path: string) {
    throw new Error("Symlinks are not supported in MockFileSystem");
  }

  async readlink(path: string): Promise<string | Buffer | null> {
    this.operations.push({ method: "readlink", args: [path] });
    return "link-target";
  }
}

const suite = new TestSuite("NamespacedFs");

let mockFs: MockFileSystem;
let namespacedFs: NamespacedFs;

function setup() {
  mockFs = new MockFileSystem();
  namespacedFs = new NamespacedFs(mockFs, "test-namespace");
}

// Constructor tests
suite.test("should accept string namespace and convert to AbsPath", () => {
  setup();
  const fs = new NamespacedFs(mockFs, "my-namespace");
  suite.assertEqual(fs.namespace, "/my-namespace");
});

suite.test("should accept AbsPath namespace directly", () => {
  setup();
  const namespace = absPath("/custom-namespace");
  const fs = new NamespacedFs(mockFs, namespace);
  suite.assertEqual(fs.namespace, "/custom-namespace");
});

// Init tests
suite.test("should create namespace directory", async () => {
  setup();
  await namespacedFs.init();

  const operations = mockFs.getOperations();
  suite.assertEqual(operations.length, 1);
  suite.assertDeepEqual(operations[0], {
    method: "mkdir",
    args: ["test-namespace", undefined],
  });
});

suite.test("should ignore EEXIST error when namespace directory already exists", async () => {
  setup();
  const errorFs: CommonFileSystem = Object.assign({}, mockFs, {
    mkdir: async (path: string) => {
      const error = new Error("Directory exists") as any;
      error.code = "EEXIST";
      throw error;
    },
  });

  const fs = new NamespacedFs(errorFs, "existing-namespace");

  // Should not throw
  await fs.init();
});

suite.test("should throw non-EEXIST errors", async () => {
  setup();
  const errorFs: CommonFileSystem = Object.assign({}, mockFs, {
    mkdir: async (path: string) => {
      const error = new Error("Permission denied") as any;
      error.code = "EACCES";
      throw error;
    },
  });

  const fs = new NamespacedFs(errorFs, "test-namespace");

  await suite.assertThrowsAsync(async () => {
    await fs.init();
  }, /Permission denied/);
});

// Readdir tests
suite.test("should prefix path with namespace for readdir", async () => {
  setup();
  await namespacedFs.readdir("subdir");

  const operations = mockFs.getOperations();
  suite.assertEqual(operations.length, 1);
  suite.assertDeepEqual(operations[0], {
    method: "readdir",
    args: ["/test-namespace/subdir"],
  });
});

suite.test("should handle root path for readdir", async () => {
  setup();
  await namespacedFs.readdir("/");

  const operations = mockFs.getOperations();
  suite.assertDeepEqual(operations[0], {
    method: "readdir",
    args: ["/test-namespace"],
  });
});

// Stat tests
suite.test("should prefix path with namespace for stat", async () => {
  setup();
  const result = await namespacedFs.stat("file.txt");

  const operations = mockFs.getOperations();
  suite.assertEqual(operations.length, 1);
  suite.assertDeepEqual(operations[0], {
    method: "stat",
    args: ["/test-namespace/file.txt"],
  });
  suite.assertType(result.isDirectory, "function");
  suite.assertType(result.isFile, "function");
});

// ReadFile tests
suite.test("should prefix path with namespace for readFile", async () => {
  setup();
  await namespacedFs.readFile("document.md");

  const operations = mockFs.getOperations();
  suite.assertEqual(operations.length, 1);
  suite.assertDeepEqual(operations[0], {
    method: "readFile",
    args: ["/test-namespace/document.md", undefined],
  });
});

suite.test("should pass options to underlying filesystem for readFile", async () => {
  setup();
  await namespacedFs.readFile("document.md", { encoding: "utf8" });

  const operations = mockFs.getOperations();
  suite.assertDeepEqual(operations[0], {
    method: "readFile",
    args: ["/test-namespace/document.md", { encoding: "utf8" }],
  });
});

// Mkdir tests
suite.test("should prefix path with namespace for mkdir", async () => {
  setup();
  await namespacedFs.mkdir("new-folder");

  const operations = mockFs.getOperations();
  suite.assertEqual(operations.length, 1);
  suite.assertDeepEqual(operations[0], {
    method: "mkdir",
    args: ["/test-namespace/new-folder", undefined],
  });
});

suite.test("should pass options to underlying filesystem for mkdir", async () => {
  setup();
  await namespacedFs.mkdir("new-folder", { recursive: true, mode: 0o755 });

  const operations = mockFs.getOperations();
  suite.assertDeepEqual(operations[0], {
    method: "mkdir",
    args: ["/test-namespace/new-folder", { recursive: true, mode: 0o755 }],
  });
});

// Rename tests
suite.test("should prefix both old and new paths with namespace for rename", async () => {
  setup();
  await namespacedFs.rename("old-file.txt", "new-file.txt");

  const operations = mockFs.getOperations();
  suite.assertEqual(operations.length, 1);
  suite.assertDeepEqual(operations[0], {
    method: "rename",
    args: ["/test-namespace/old-file.txt", "/test-namespace/new-file.txt"],
  });
});

// Unlink tests
suite.test("should prefix path with namespace for unlink", async () => {
  setup();
  await namespacedFs.unlink("file-to-delete.txt");

  const operations = mockFs.getOperations();
  suite.assertEqual(operations.length, 1);
  suite.assertDeepEqual(operations[0], {
    method: "unlink",
    args: ["/test-namespace/file-to-delete.txt"],
  });
});

// WriteFile tests
suite.test("should prefix path with namespace for writeFile", async () => {
  setup();
  await namespacedFs.writeFile("output.txt", "content");

  const operations = mockFs.getOperations();
  suite.assertEqual(operations.length, 1);
  suite.assertDeepEqual(operations[0], {
    method: "writeFile",
    args: ["/test-namespace/output.txt", "content", undefined],
  });
});

suite.test("should pass options to underlying filesystem for writeFile", async () => {
  setup();
  await namespacedFs.writeFile("output.txt", "content", { encoding: "utf8", mode: 0o644 });

  const operations = mockFs.getOperations();
  suite.assertDeepEqual(operations[0], {
    method: "writeFile",
    args: ["/test-namespace/output.txt", "content", { encoding: "utf8", mode: 0o644 }],
  });
});

// Rmdir tests
suite.test("should prefix path with namespace for rmdir", async () => {
  setup();
  await namespacedFs.rmdir(absPath("folder-to-remove"));

  const operations = mockFs.getOperations();
  suite.assertEqual(operations.length, 1);
  suite.assertDeepEqual(operations[0], {
    method: "rmdir",
    args: ["/test-namespace/folder-to-remove", undefined],
  });
});

suite.test("should pass options to underlying filesystem for rmdir", async () => {
  setup();
  await namespacedFs.rmdir(absPath("folder-to-remove"), { recursive: true });

  const operations = mockFs.getOperations();
  suite.assertDeepEqual(operations[0], {
    method: "rmdir",
    args: ["/test-namespace/folder-to-remove", { recursive: true }],
  });
});

// Lstat tests
// suite.test("should delegate to stat method for lstat", async () => {
//   setup();
//   const result = await namespacedFs.lstat(absPath("symlink"));

//   const operations = mockFs.getOperations();
//   suite.assertEqual(operations.length, 1);
//   suite.assertDeepEqual(operations[0], {
//     method: "stat",
//     args: ["/test-namespace/symlink"],
//   });
//   suite.assertType(result.isDirectory, "function");
//   suite.assertType(result.isFile, "function");
// });

// Symlink operation tests
// suite.test("symlink should throw error", async () => {
//   setup();
//   await suite.assertThrowsAsync(
//     () => namespacedFs.symlink("target", "link"),
//     /Symlinks are not supported in NamespacedFs/
//   );
// });

// suite.test("readlink should throw error", async () => {
//   setup();
//   await suite.assertThrowsAsync(() => namespacedFs.readlink("link"), /Symlinks are not supported in NamespacedFs/);
// });

// Path transformation tests
suite.test("should handle empty path", async () => {
  setup();
  await namespacedFs.readdir("");

  const operations = mockFs.getOperations();
  suite.assertDeepEqual(operations[0], {
    method: "readdir",
    args: ["/test-namespace"],
  });
});

suite.test("should handle nested paths", async () => {
  setup();
  await namespacedFs.readdir("folder/subfolder/file.txt");

  const operations = mockFs.getOperations();
  suite.assertDeepEqual(operations[0], {
    method: "readdir",
    args: ["/test-namespace/folder/subfolder/file.txt"],
  });
});

suite.test("should handle absolute paths correctly", async () => {
  setup();
  await namespacedFs.readdir("/absolute/path");

  const operations = mockFs.getOperations();
  suite.assertDeepEqual(operations[0], {
    method: "readdir",
    args: ["/test-namespace/absolute/path"],
  });
});

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  suite.run().catch(console.error);
}

export { suite as NamespacedFsTestSuite };
