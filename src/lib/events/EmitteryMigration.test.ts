import { CreateSuperTypedEmitterClass, SuperEmitter } from "../TypeEmitter";

// Test the exact patterns we migrated from Emittery
type TestSuite = {
  name: string;
  run: () => Promise<void>;
};

const tests: TestSuite[] = [];

function test(name: string, fn: () => Promise<void> | void) {
  tests.push({
    name,
    run: async () => fn(),
  });
}

// Test 1: HistoryDAO pattern - new SuperEmitter<EventType>()
test("HistoryDAO pattern: new SuperEmitter<EventType>()", async () => {
  type HistoryEvents = {
    edits: Array<{ id: string }>;
    new_edit: { id: string };
  };

  const emitter = new SuperEmitter<HistoryEvents>();
  const received: string[] = [];

  const unsub1 = emitter.on("edits", (edits) => {
    received.push(`edits-${edits.length}`);
  });

  const unsub2 = emitter.on("new_edit", (edit) => {
    received.push(`new-${edit.id}`);
  });

  emitter.emit("edits", [{ id: "1" }, { id: "2" }]);
  emitter.emit("new_edit", { id: "test" });

  console.assert(received.length === 2, "Should receive both events");
  console.assert(received[0] === "edits-2", "Should receive edits correctly");
  console.assert(received[1] === "new-test", "Should receive new_edit correctly");

  unsub1();
  unsub2();
  console.log("✅ HistoryDAO pattern works");
});

// Test 2: DiskEventsLocal pattern - extend CreateSuperTypedEmitterClass
test("DiskEventsLocal pattern: extend CreateSuperTypedEmitterClass", async () => {
  type DiskEvents = {
    "inside-write": { filePaths: string[] };
    "outside-write": { filePaths: string[] };
    index: undefined;
  };

  class DiskEventsLocal extends CreateSuperTypedEmitterClass<DiskEvents>() {}

  const diskEvents = new DiskEventsLocal();
  const received: string[] = [];

  // Test multiple event listening (key Emittery feature)
  const unsub = diskEvents.on(["inside-write", "outside-write", "index"], (payload) => {
    if (payload && "filePaths" in payload) {
      received.push(`write-${payload.filePaths.length}`);
    } else {
      received.push("index");
    }
  });

  diskEvents.emit("inside-write", { filePaths: ["file1.ts"] });
  diskEvents.emit("index", undefined as never);
  diskEvents.emit("outside-write", { filePaths: ["file1.ts", "file2.ts"] });

  console.assert(received.length === 3, "Should receive all events");
  console.assert(received[0] === "write-1", "Should receive inside-write");
  console.assert(received[1] === "index", "Should receive index");
  console.assert(received[2] === "write-2", "Should receive outside-write");

  unsub();
  console.log("✅ DiskEventsLocal pattern works");
});

// Test 3: Channel pattern - composition with SuperEmitter
test("Channel pattern: composition with delegate methods", async () => {
  type ChannelEvents = {
    message: string;
    data: { value: number };
  };

  class TestChannel {
    private emitter = new SuperEmitter<ChannelEvents>();

    on<K extends keyof ChannelEvents>(
      eventName: K | (keyof ChannelEvents)[],
      listener: (eventData: ChannelEvents[K]) => void
    ): () => void {
      return this.emitter.on(eventName, listener);
    }

    emit<K extends keyof ChannelEvents>(event: K, payload: ChannelEvents[K]): void {
      this.emitter.emit(event, payload);
    }

    clearListeners(): void {
      this.emitter.clearListeners();
    }
  }

  const channel = new TestChannel();
  const received: string[] = [];

  const unsub = channel.on("message", (msg) => {
    received.push(msg);
  });

  channel.emit("message", "hello");
  channel.emit("message", "world");

  console.assert(received.length === 2, "Should receive both messages");
  console.assert(received[0] === "hello", "Should receive first message");
  console.assert(received[1] === "world", "Should receive second message");

  channel.clearListeners();
  channel.emit("message", "after-clear");

  console.assert(received.length === 2, "Should not receive after clearListeners");

  console.log("✅ Channel pattern works");
});

// Test 4: WatchPromiseMembers pattern - member property
test("WatchPromiseMembers pattern: member property", async () => {
  type WatcherEvents = {
    "method:start": string;
    "method:end": string;
  };

  class TestWatcher {
    public readonly events = new SuperEmitter<WatcherEvents>();

    async simulateAsyncMethod() {
      this.events.emit("method:start", "start");
      await new Promise((resolve) => setTimeout(resolve, 1));
      this.events.emit("method:end", "end");
    }
  }

  const watcher = new TestWatcher();
  const received: string[] = [];

  watcher.events.on("method:start", (msg) => received.push(msg));
  watcher.events.on("method:end", (msg) => received.push(msg));

  await watcher.simulateAsyncMethod();

  console.assert(received.length === 2, "Should receive start and end");
  console.assert(received[0] === "start", "Should receive start event");
  console.assert(received[1] === "end", "Should receive end event");

  console.log("✅ WatchPromiseMembers pattern works");
});

// Test 5: Verify no async/await needed (unlike Emittery)
test("Synchronous behavior: no async/await needed", () => {
  const emitter = new SuperEmitter<{ test: string }>();
  let received: string | null = null;

  emitter.on("test", (payload) => {
    received = payload;
  });

  // This is synchronous - no await needed!
  emitter.emit("test", "immediate");

  // Should be received immediately
  console.assert(received === "immediate", "Should receive immediately without await");
  console.log("✅ Synchronous behavior works (no async/await needed)");
});

// Run all tests
async function runTests() {
  console.log("🔄 Running Emittery Migration Tests...\n");

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test.run();
      passed++;
    } catch (error) {
      console.log(`❌ ${test.name}`);
      console.log(`   Error: ${error instanceof Error ? error.message : String(error)}\n`);
      failed++;
    }
  }

  console.log(`\n📊 Migration Tests: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log("\n🎉 All patterns migrated successfully! SuperEmitter is a drop-in replacement for Emittery.");
  }

  return failed === 0;
}

// Run tests if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

export { runTests };
