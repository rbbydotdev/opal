"use client";

import React, { use } from "react";

export default function Page() {
  const value = use<string>(new Promise((resolve) => setTimeout(() => resolve("foo"), 5000)));
  return <div className="w-full h-full">hello world + {value}</div>;
}
