import { TestSuite } from "@/lib/tests/TestSuite";
import { CommonFileSystem } from "@/data/FileSystemTypes";
import { MountingFS } from "@/data/fs/TranslateFs";
import { absPath } from "@/lib/paths2";

class MockFileSystem implements CommonFileSystem {
  private name: string;
  private operations: Array<{ method: string; args: any[] }> = [];

  constructor(name: string) {
    this.name = name;
  }

  getOperations() {
    return this.operations;
  }

  clearOperations() {
    this.operations = [];
  }

  async readdir(path: string) {
    this.operations.push({ method: "readdir", args: [path] });
    return [`${this.name}-file1.txt`, `${this.name}-file2.md`];
  }

  async stat(path: string) {
    this.operations.push({ method: "stat", args: [path] });
    return { isDirectory: () => false, isFile: () => true };
  }

  async readFile(path: string, options?: { encoding?: "utf8" }) {
    this.operations.push({ method: "readFile", args: [path, options] });
    return `content from ${this.name}`;
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
    this.operations.push({ method: "symlink", args: [target, path] });
  }

  async readlink(path: string) {
    this.operations.push({ method: "readlink", args: [path] });
    return `link-target-${this.name}`;
  }
}

const suite = new TestSuite("MountingFS");

let rootFs: MockFileSystem;
let homeFs: MockFileSystem;
let tmpFs: MockFileSystem;
let mountingFs: MountingFS;

function setup() {
  rootFs = new MockFileSystem("root");
  homeFs = new MockFileSystem("home");
  tmpFs = new MockFileSystem("tmp");
  mountingFs = new MountingFS(rootFs);
}

// Basic mounting tests
suite.test("should create MountingFS with root filesystem", () => {
  setup();
  suite.assertInstanceOf(mountingFs, MountingFS);
  suite.assertEqual(mountingFs.getMounts().length, 0);
});

suite.test("should mount filesystem at path", () => {
  setup();
  mountingFs.mount("/home", homeFs);
  
  const mounts = mountingFs.getMounts();
  suite.assertEqual(mounts.length, 1);
  suite.assertEqual(mounts[0].mountPath, "/home");
  suite.assertEqual(mounts[0].filesystem, homeFs);
});

suite.test("should support multiple mounts", () => {
  setup();
  mountingFs.mount("/home", homeFs);
  mountingFs.mount("/tmp", tmpFs);
  
  const mounts = mountingFs.getMounts();
  suite.assertEqual(mounts.length, 2);
  
  const mountPaths = mounts.map(m => m.mountPath).sort();
  suite.assertDeepEqual(mountPaths, ["/home", "/tmp"]);
});

suite.test("should unmount filesystem", () => {
  setup();
  mountingFs.mount("/home", homeFs);
  mountingFs.mount("/tmp", tmpFs);
  
  mountingFs.unmount("/home");
  
  const mounts = mountingFs.getMounts();
  suite.assertEqual(mounts.length, 1);
  suite.assertEqual(mounts[0].mountPath, "/tmp");
});

// Path resolution tests
suite.test("should route to root filesystem for unmounted paths", async () => {
  setup();
  await mountingFs.readdir("/etc");
  
  const operations = rootFs.getOperations();
  suite.assertEqual(operations.length, 1);
  suite.assertDeepEqual(operations[0], {
    method: "readdir",
    args: ["/etc"]
  });
});

suite.test("should route to mounted filesystem for mounted paths", async () => {
  setup();
  mountingFs.mount("/home", homeFs);
  
  await mountingFs.readdir("/home/user");
  
  const homeOps = homeFs.getOperations();
  const rootOps = rootFs.getOperations();
  
  suite.assertEqual(homeOps.length, 1);
  suite.assertEqual(rootOps.length, 0);
  suite.assertDeepEqual(homeOps[0], {
    method: "readdir",
    args: ["/user"] // Mount prefix removed
  });
});

suite.test("should route to mount point root when accessing mount point itself", async () => {
  setup();
  mountingFs.mount("/home", homeFs);
  
  await mountingFs.readdir("/home");
  
  const homeOps = homeFs.getOperations();
  suite.assertEqual(homeOps.length, 1);
  suite.assertDeepEqual(homeOps[0], {
    method: "readdir",
    args: ["/"] // Access to mount point root
  });
});

// Hierarchy tests (longer paths take precedence)
suite.test("should prioritize longer mount paths", async () => {
  setup();
  mountingFs.mount("/home", homeFs);
  mountingFs.mount("/home/user", tmpFs); // Nested mount
  
  // Access nested mount
  await mountingFs.readdir("/home/user/docs");
  
  const tmpOps = tmpFs.getOperations();
  const homeOps = homeFs.getOperations();
  
  suite.assertEqual(tmpOps.length, 1);
  suite.assertEqual(homeOps.length, 0);
  suite.assertDeepEqual(tmpOps[0], {
    method: "readdir",
    args: ["/docs"] // Routed to nested mount
  });
});

suite.test("should fall back to parent mount for non-nested paths", async () => {
  setup();
  mountingFs.mount("/home", homeFs);
  mountingFs.mount("/home/user", tmpFs);
  
  // Access parent mount area
  await mountingFs.readdir("/home/shared");
  
  const homeOps = homeFs.getOperations();
  const tmpOps = tmpFs.getOperations();
  
  suite.assertEqual(homeOps.length, 1);
  suite.assertEqual(tmpOps.length, 0);
  suite.assertDeepEqual(homeOps[0], {
    method: "readdir",
    args: ["/shared"] // Routed to parent mount
  });
});

// File operations tests
suite.test("should route stat operations correctly", async () => {
  setup();
  mountingFs.mount("/home", homeFs);
  
  await mountingFs.stat("/home/user/file.txt");
  
  const homeOps = homeFs.getOperations();
  suite.assertDeepEqual(homeOps[0], {
    method: "stat",
    args: ["/user/file.txt"]
  });
});

suite.test("should route readFile operations correctly", async () => {
  setup();
  mountingFs.mount("/home", homeFs);
  
  const result = await mountingFs.readFile("/home/user/file.txt", { encoding: "utf8" });
  
  const homeOps = homeFs.getOperations();
  suite.assertDeepEqual(homeOps[0], {
    method: "readFile",
    args: ["/user/file.txt", { encoding: "utf8" }]
  });
  suite.assertEqual(result, "content from home");
});

suite.test("should route writeFile operations correctly", async () => {
  setup();
  mountingFs.mount("/tmp", tmpFs);
  
  await mountingFs.writeFile("/tmp/output.txt", "test data", { encoding: "utf8", mode: 0o644 });
  
  const tmpOps = tmpFs.getOperations();
  suite.assertDeepEqual(tmpOps[0], {
    method: "writeFile",
    args: ["/output.txt", "test data", { encoding: "utf8", mode: 0o644 }]
  });
});

// Rename operation tests
suite.test("should handle rename within same filesystem", async () => {
  setup();
  mountingFs.mount("/home", homeFs);
  
  await mountingFs.rename("/home/old.txt", "/home/new.txt");
  
  const homeOps = homeFs.getOperations();
  suite.assertEqual(homeOps.length, 1);
  suite.assertDeepEqual(homeOps[0], {
    method: "rename",
    args: ["/old.txt", "/new.txt"]
  });
});

suite.test("should throw error for rename across different filesystems", async () => {
  setup();
  mountingFs.mount("/home", homeFs);
  mountingFs.mount("/tmp", tmpFs);
  
  await suite.assertThrowsAsync(
    () => mountingFs.rename("/home/file.txt", "/tmp/file.txt"),
    /Cannot rename across different mounted filesystems/
  );
});

// Error handling tests
suite.test("should throw error for unmounted paths without root filesystem", async () => {
  const mountingFsNoRoot = new MountingFS(); // No root filesystem
  
  await suite.assertThrowsAsync(
    () => mountingFsNoRoot.readdir("/etc"),
    /No filesystem mounted for path: \/etc/
  );
});

// Utility methods tests
suite.test("should check if path is mounted", () => {
  setup();
  mountingFs.mount("/home", homeFs);
  
  suite.assert(mountingFs.isMounted("/home"), "Should detect mounted path");
  suite.assert(!mountingFs.isMounted("/tmp"), "Should detect unmounted path");
});

suite.test("should replace mount at same path", () => {
  setup();
  mountingFs.mount("/home", homeFs);
  mountingFs.mount("/home", tmpFs); // Replace with different filesystem
  
  const mounts = mountingFs.getMounts();
  suite.assertEqual(mounts.length, 1);
  suite.assertEqual(mounts[0].filesystem, tmpFs);
});

// Edge cases
suite.test("should handle paths with trailing slashes", async () => {
  setup();
  mountingFs.mount("/home", homeFs);
  
  await mountingFs.readdir("/home/user/");
  
  const homeOps = homeFs.getOperations();
  suite.assertDeepEqual(homeOps[0], {
    method: "readdir",
    args: ["/user/"]
  });
});

suite.test("should handle root path operations", async () => {
  setup();
  
  await mountingFs.readdir("/");
  
  const rootOps = rootFs.getOperations();
  suite.assertDeepEqual(rootOps[0], {
    method: "readdir",
    args: ["/"]
  });
});

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  suite.run().catch(console.error);
}

export { suite as MountingFSTestSuite };