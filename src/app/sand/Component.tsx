"use client";
import React, { use } from "react";

const promise = Promise.resolve("foo");
export const Component = () => {
  const value = use(promise);
  return <div>{value}</div>;
};
