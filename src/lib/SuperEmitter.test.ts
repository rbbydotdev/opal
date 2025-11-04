import { SuperEmitter } from "./TypeEmitter";

// Test event types
type TestEvents = {
  message: string;
  data: { count: number };
  signal: undefined;
};

// Simple test framework
class TestSuite {
  private tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];
  private passed = 0;
  private failed = 0;

  test(name: string, fn: () => void | Promise<void>) {
    this.tests.push({ name, fn });
  }

  assert(condition: boolean, message: string) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  assertEqual<T>(actual: T, expected: T, message?: string) {
    if (actual !== expected) {
      throw new Error(
        `Assertion failed: ${message || "Values not equal"}\nExpected: ${expected}\nActual: ${actual}`
      );
    }
  }

  async run() {
    console.log("🧪 Running SuperEmitter tests...\n");

    for (const { name, fn } of this.tests) {
      try {
        await fn();
        console.log(`✅ ${name}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error instanceof Error ? error.message : String(error)}\n`);
        this.failed++;
      }
    }

    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed`);
    
    if (this.failed > 0) {
      process.exit(1);
    }
  }
}

// Test suite
const suite = new TestSuite();

suite.test("should emit and receive events", () => {
  const emitter = new SuperEmitter<TestEvents>();
  let received: string | null = null;

  const unsub = emitter.on("message", (payload) => {
    received = payload;
  });

  emitter.emit("message", "hello world");
  suite.assertEqual(received, "hello world", "Should receive emitted message");

  unsub();
});

suite.test("should return unsubscribe function from .on()", () => {
  const emitter = new SuperEmitter<TestEvents>();
  let callCount = 0;

  const unsub = emitter.on("message", () => {
    callCount++;
  });

  emitter.emit("message", "test1");
  suite.assertEqual(callCount, 1, "Should receive first message");

  unsub();
  emitter.emit("message", "test2");
  suite.assertEqual(callCount, 1, "Should not receive message after unsubscribe");
});

suite.test("should listen to multiple events with array syntax", () => {
  const emitter = new SuperEmitter<TestEvents>();
  const received: string[] = [];

  const unsub = emitter.on(["message", "signal"], (payload) => {
    received.push(typeof payload === "string" ? payload : "signal");
  });

  emitter.emit("message", "hello");
  emitter.emit("signal", undefined);
  emitter.emit("message", "world");

  suite.assertEqual(received.length, 3, "Should receive all events");
  suite.assertEqual(received[0], "hello", "First message correct");
  suite.assertEqual(received[1], "signal", "Signal received");
  suite.assertEqual(received[2], "world", "Second message correct");

  unsub();
});

suite.test("should work with .once()", () => {
  const emitter = new SuperEmitter<TestEvents>();
  let callCount = 0;

  const unsub = emitter.once("message", () => {
    callCount++;
  });

  emitter.emit("message", "test1");
  emitter.emit("message", "test2");
  
  suite.assertEqual(callCount, 1, "Should only receive one message with .once()");

  unsub(); // Should be safe to call even after auto-unsub
});

suite.test("should support awaitEvent", async () => {
  const emitter = new SuperEmitter<TestEvents>();
  
  // Emit after a short delay
  setTimeout(() => {
    emitter.emit("data", { count: 42 });
  }, 10);

  const result = await emitter.awaitEvent("data");
  suite.assertEqual(result.count, 42, "Should await and receive correct data");
});

suite.test("should clear all listeners", () => {
  const emitter = new SuperEmitter<TestEvents>();
  let callCount = 0;

  emitter.on("message", () => callCount++);
  emitter.on("data", () => callCount++);

  emitter.emit("message", "test");
  emitter.emit("data", { count: 1 });
  suite.assertEqual(callCount, 2, "Should receive events before clear");

  emitter.clearListeners();
  emitter.emit("message", "test2");
  emitter.emit("data", { count: 2 });
  suite.assertEqual(callCount, 2, "Should not receive events after clear");
});

suite.test("should support off() method", () => {
  const emitter = new SuperEmitter<TestEvents>();
  let callCount = 0;

  const handler = () => callCount++;
  emitter.on("message", handler);

  emitter.emit("message", "test1");
  suite.assertEqual(callCount, 1, "Should receive first message");

  emitter.off("message", handler);
  emitter.emit("message", "test2");
  suite.assertEqual(callCount, 1, "Should not receive message after .off()");
});

suite.test("should support removeListener() method", () => {
  const emitter = new SuperEmitter<TestEvents>();
  let callCount = 0;

  const handler = () => callCount++;
  emitter.on("message", handler);

  emitter.emit("message", "test1");
  suite.assertEqual(callCount, 1, "Should receive first message");

  emitter.removeListener("message", handler);
  emitter.emit("message", "test2");
  suite.assertEqual(callCount, 1, "Should not receive message after .removeListener()");
});

suite.test("should handle complex event payloads", () => {
  const emitter = new SuperEmitter<TestEvents>();
  let received: { count: number } | null = null;

  emitter.on("data", (payload) => {
    received = payload;
  });

  const testData = { count: 123 };
  emitter.emit("data", testData);
  
  suite.assert(received !== null, "Should receive data");
  suite.assertEqual(received!.count, 123, "Should receive correct data structure");
});

// Compatibility test - ensure it works like old Emittery usage
suite.test("should work exactly like Emittery patterns we used", () => {
  const emitter = new SuperEmitter<TestEvents>();
  const events: string[] = [];

  // Test the pattern: this.events.on([DiskEvents.OUTSIDE_WRITE, DiskEvents.INDEX], callback)
  const unsub1 = emitter.on(["message", "signal"], () => {
    events.push("multi-event");
  });

  // Test the pattern: this.events.on(HistoryEvents.EDITS, cb)
  const unsub2 = emitter.on("data", (payload) => {
    events.push(`data-${payload.count}`);
  });

  // Test the pattern: this.events.emit(HistoryEvents.SELECTED_EDIT, edit)
  emitter.emit("message", "test");
  emitter.emit("data", { count: 5 });
  emitter.emit("signal", undefined);

  suite.assertEqual(events.length, 3, "Should handle all event patterns");
  suite.assertEqual(events[0], "multi-event", "Multi-event pattern works");
  suite.assertEqual(events[1], "data-5", "Single event pattern works");
  suite.assertEqual(events[2], "multi-event", "Multi-event pattern works for second event");

  // Test cleanup like: this.events.clearListeners()
  emitter.clearListeners();
  emitter.emit("message", "after-clear");
  suite.assertEqual(events.length, 3, "No events after clearListeners()");
});

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  suite.run().catch(console.error);
}

export { suite as SuperEmitterTestSuite };