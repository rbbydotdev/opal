"use client";
import { ClientDb } from "@/clientdb/instance";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";

interface Auth {
  count: number;
  text: string;
}

interface ProviderAuth {
  id: number;
  value: Auth;
}

function setAuth(value: Auth) {
  ClientDb.providerAuths.put({ id: 1, value });
}

export default function IdxFun() {
  const [count, setCount] = useState<number | null>(null);
  const [text, setText] = useState<string | null>(null);

  const increment = () => setCount(count! + 1);
  const decrement = () => setCount(count! - 1);

  const providerAuth = useLiveQuery<ProviderAuth>(async () => {
    return (await ClientDb.providerAuths.where({ id: 1 }).first()) as ProviderAuth;
  }, []);

  const loaded = providerAuth !== undefined;

  useEffect(() => {
    if (!loaded) return;
    setAuth({
      count: count ?? 0,
      text: text ?? "",
    });
  }, [count, text, loaded]);

  useEffect(() => {
    if (providerAuth) {
      setCount(providerAuth.value.count);
      setText(providerAuth.value.text);
    }
  }, [providerAuth]);
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg text-center">
        <div className="mb-4">
          <button
            onClick={decrement}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mr-2"
          >
            Decrement
          </button>
          <span className="text-white text-lg">{count}</span>
          <button
            onClick={increment}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded ml-2"
          >
            Increment
          </button>
        </div>
        <div>
          <input
            type="text"
            defaultValue={text ?? ""}
            onChange={(e) => setText(e.target.value)}
            className="bg-gray-700 text-white p-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
            placeholder="Enter text"
          />
        </div>
        <pre className="text-white">{JSON.stringify(providerAuth, null, 4)}</pre>
      </div>
    </div>
  );
}
