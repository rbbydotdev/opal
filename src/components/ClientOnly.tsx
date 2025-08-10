import { JSX } from "react";

type ClientOnlyProps = { children: JSX.Element };

export const ClientOnly = (props: ClientOnlyProps) => {
  const { children } = props;
  return children;
};
