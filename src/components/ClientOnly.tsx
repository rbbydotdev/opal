"use client";
import dynamic from "next/dynamic";
import { JSX } from "react";

type ClientOnlyProps = { children: JSX.Element };
const ClientOnlyContainer = (props: ClientOnlyProps) => {
  const { children } = props;
  return children;
};

export const ClientOnly = dynamic(() => Promise.resolve(ClientOnlyContainer), {
  ssr: false,
});
