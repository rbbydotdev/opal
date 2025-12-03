class TestSuite {
  private tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];
  private passed = 0;
  private failed = 0;
  public suiteName: string;

  constructor(suiteName: string = "Test Suite") {
    this.suiteName = suiteName;
  }

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
      throw new Error(`Assertion failed: ${message || "Values not equal"}\nExpected: ${expected}\nActual: ${actual}`);
    }
  }

  assertDeepEqual<T>(actual: T, expected: T, message?: string) {
    const actualStr = JSON.stringify(actual, null, 2);
    const expectedStr = JSON.stringify(expected, null, 2);
    if (actualStr !== expectedStr) {
      throw new Error(
        `Assertion failed: ${message || "Deep equality failed"}\nExpected: ${expectedStr}\nActual: ${actualStr}`
      );
    }
  }

  assertThrows(fn: () => void | Promise<void>, expectedMessage?: string | RegExp) {
    try {
      const result = fn();
      if (result instanceof Promise) {
        throw new Error("Use assertThrowsAsync for async functions");
      }
      throw new Error("Expected function to throw, but it didn't");
    } catch (error) {
      if (expectedMessage) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (typeof expectedMessage === "string") {
          if (!errorMessage.includes(expectedMessage)) {
            throw new Error(`Expected error message to contain "${expectedMessage}", but got: ${errorMessage}`);
          }
        } else {
          if (!expectedMessage.test(errorMessage)) {
            throw new Error(`Expected error message to match ${expectedMessage}, but got: ${errorMessage}`);
          }
        }
      }
    }
  }

  async assertThrowsAsync(fn: () => Promise<void>, expectedMessage?: string | RegExp) {
    try {
      await fn();
      throw new Error("Expected async function to throw, but it didn't");
    } catch (error) {
      if (expectedMessage) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (typeof expectedMessage === "string") {
          if (!errorMessage.includes(expectedMessage)) {
            throw new Error(`Expected error message to contain "${expectedMessage}", but got: ${errorMessage}`);
          }
        } else {
          if (!expectedMessage.test(errorMessage)) {
            throw new Error(`Expected error message to match ${expectedMessage}, but got: ${errorMessage}`);
          }
        }
      }
    }
  }

  assertInstanceOf<T>(actual: any, expectedClass: new (...args: any[]) => T, message?: string) {
    if (!(actual instanceof expectedClass)) {
      throw new Error(
        `Assertion failed: ${message || "Instance check failed"}\nExpected instance of: ${expectedClass.name}\nActual: ${typeof actual}`
      );
    }
  }

  assertType(actual: any, expectedType: string, message?: string) {
    const actualType = typeof actual;
    if (actualType !== expectedType) {
      throw new Error(
        `Assertion failed: ${message || "Type check failed"}\nExpected type: ${expectedType}\nActual type: ${actualType}`
      );
    }
  }

  async run() {
    console.log(`🧪 Running ${this.suiteName} tests...\n`);

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

  getResults() {
    return {
      passed: this.passed,
      failed: this.failed,
      total: this.tests.length,
    };
  }
}
