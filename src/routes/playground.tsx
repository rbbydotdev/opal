import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

// ---------------------------------------------------------------------------
// Reactive engine
// ---------------------------------------------------------------------------
type Listener<T> = (value: T) => void;

function createEmitter<T extends Record<string, any>>() {
  const listeners: { [K in keyof T]?: Listener<T[K]>[] } = {};
  return {
    on<K extends keyof T>(key: K, listener: Listener<T[K]>) {
      (listeners[key] ||= []).push(listener);
      return () => {
        listeners[key] = listeners[key]?.filter((l) => l !== listener);
      };
    },
    emit<K extends keyof T>(key: K, value: T[K]) {
      listeners[key]?.forEach((l) => l(value));
    },
  };
}

type ReactiveKeys<T> = {
  [K in keyof T]: K extends `$${string}` ? K : never;
}[keyof T];

type ReactiveEvents<T> = {
  [K in ReactiveKeys<T>]: T[K];
};

type ReactiveWrapper<T extends object> = Omit<T, ReactiveKeys<T>> &
  ReactiveEvents<T> & {
    emitter: ReturnType<typeof createEmitter<ReactiveEvents<T>>>;
  };

// ---------------------------------------------------------------------------
// Core reactivity with dependency tracking + computed detection
// ---------------------------------------------------------------------------

function Reactive<T extends object>(obj: T): ReactiveWrapper<T> {
  const emitter = createEmitter<ReactiveEvents<T>>();
  const backing = new Map<PropertyKey, any>();

  // Dependency tracking
  let activeWatcher: (() => void) | null = null;
  const depsMap = new Map<string, Set<() => void>>();

  function track(key: string) {
    if (!activeWatcher) return;
    if (!depsMap.has(key)) depsMap.set(key, new Set());
    depsMap.get(key)!.add(activeWatcher);
  }

  function trigger(key: string) {
    const watchers = depsMap.get(key);
    if (watchers) for (const fn of watchers) fn();
  }

  // 1️⃣ Capture all $ props first
  const allKeys = Object.keys(obj).filter((k) => k.startsWith("$"));
  for (const key of allKeys) {
    const val = (obj as any)[key];
    backing.set(key, val);
    delete (obj as any)[key];
  }

  // 2️⃣ Create proxy that manages read/write/reactivity
  const proxy = new Proxy(obj as any, {
    get(_, prop, receiver) {
      if (prop === "emitter") return emitter;

      if (typeof prop === "string" && prop.startsWith("$")) {
        const val = backing.get(prop);

        // Computed
        if (val && typeof val === "object" && val.__type === "computed") {
          track(prop);
          if (val.dirty) {
            val.dirty = false;
            activeWatcher = val.run;
            const out = val.compute();
            activeWatcher = null;
            val.cached = out;
          }
          return val.cached;
        }

        // Plain reactive
        track(prop);
        return val;
      }

      return Reflect.get(_, prop, receiver);
    },

    set(_, prop, value, receiver) {
      if (typeof prop === "string" && prop.startsWith("$")) {
        const old = backing.get(prop);
        if (old !== value) {
          backing.set(prop, value);
          trigger(prop);
          emitter.emit(prop as keyof ReactiveEvents<T>, value);
        }
        return true;
      }
      return Reflect.set(_, prop, value, receiver);
    },
  });

  // 3️⃣ Initialize computed fields AFTER all data are ready
  for (const key of allKeys) {
    const originalValue = backing.get(key);
    if (typeof originalValue === "function" && originalValue.length === 0) {
      // Wrap the compute into a closure that always uses proxy
      const compute = () => {
        // Even if originalValue is arrow func capturing wrong this,
        // call with proxy context to access proxy-bound $props
        return originalValue.call(proxy);
      };

      const desc = {
        __type: "computed" as const,
        cached: undefined as any,
        dirty: true,
        compute,
        run() {
          desc.dirty = false;
          activeWatcher = desc.run;
          const next = desc.compute();
          activeWatcher = null;
          desc.cached = next;
          emitter.emit(key as keyof ReactiveEvents<T>, next);
        },
      };

      backing.set(key, desc);

      // initial compute – safe now
      try {
        desc.run();
      } catch (e) {
        console.warn(`Computed ${String(key)} failed initial compute:`, e);
      }
    }
  }

  return proxy;
}

// ---------------------------------------------------------------------------
// Store Definition
// ---------------------------------------------------------------------------

type Todo = { id: number; text: string; completed: boolean };

class TodoStore {
  $todos: Todo[] = [];
  $completedTodos = () => this.$todos.filter((t) => t.completed);
}

// ---------------------------------------------------------------------------
// TanStack Router File Route
// ---------------------------------------------------------------------------

export const Route = createFileRoute("/playground")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Playground />;
}

// ---------------------------------------------------------------------------
// React store hook
// ---------------------------------------------------------------------------

export function useWatchStore<
  T extends { emitter: { on(event: string, cb: () => void): () => void } },
  K extends string & keyof T,
>(store: T, member: K): T[K] {
  const eventKey = (member.startsWith("$") ? member : (`$${member}` as keyof T)) as string;

  const subscribe = useCallback((cb: () => void) => store.emitter.on(eventKey, cb), [store, eventKey]);

  const getSnapshot = useCallback(() => store[eventKey as K], [store, eventKey]);

  return useSyncExternalStore(subscribe, getSnapshot);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function Playground() {
  const store = useMemo(() => Reactive(new TodoStore()), []);
  const todos = useWatchStore(store, "$todos");
  const completed = useWatchStore(store, "$completedTodos");

  const [input, setInput] = useState("");

  const addTodo = () => {
    if (!input.trim()) return;
    store.$todos = [...store.$todos, { id: Date.now(), text: input.trim(), completed: false }];
    setInput("");
  };

  const toggleTodo = (id: number) => {
    store.$todos = store.$todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTodo = (id: number) => {
    store.$todos = store.$todos.filter((t) => t.id !== id);
  };

  return (
    <div className="p-6 flex flex-col gap-4 items-center max-w-md mx-auto">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Reactive Todos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Enter todo..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTodo()}
            />
            <Button onClick={addTodo}>Add</Button>
          </div>

          <ul className="flex flex-col gap-2">
            {todos.map((todo) => (
              <li key={todo.id}>
                <Card className={`flex items-center justify-between p-2 ${todo.completed ? "opacity-70" : ""}`}>
                  <span
                    className={`cursor-pointer select-none ${
                      todo.completed ? "line-through text-muted-foreground" : ""
                    }`}
                    onClick={() => toggleTodo(todo.id)}
                  >
                    {todo.text}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => deleteTodo(todo.id)}>
                    Delete
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        </CardContent>

        <CardFooter>
          <div className="text-sm text-muted-foreground">
            {todos.length === 0
              ? "No todos yet"
              : `${todos.filter((t) => !t.completed).length} active / ${completed.length} completed`}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
