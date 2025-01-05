"use client";
import React, { useEffect, useState } from "react";
import { ChannelEmittery } from "../../lib/channel";

const channelName = "counter-channel"; // Shared channel name for all istances
const emitter = new ChannelEmittery<{ increment: void; decrement: void }>(channelName);
export const Component: React.FC = () => {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    const incrementListener = () => setCount((prevCount) => prevCount + 1);
    const decrementListener = () => setCount((prevCount) => prevCount - 1);

    emitter.on("increment", incrementListener);
    emitter.on("decrement", decrementListener);

    // Cleanup on component unmount
    return () => {
      emitter.off("increment", incrementListener);
      emitter.off("decrement", decrementListener);
      emitter.closeChannel();
    };
  }, []);

  const increment = () => {
    emitter.emit("increment", { self: true });
  };

  const decrement = () => {
    emitter.emit("decrement", { self: true });
  };

  return (
    <div>
      <h1>Counter: {count}</h1>
      <button onClick={increment}>Increment</button>
      <button onClick={decrement}>Decrement</button>
    </div>
  );
};
