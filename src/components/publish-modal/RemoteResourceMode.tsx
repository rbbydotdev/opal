import React, { createContext, useContext } from "react";
import { Control, FieldPath, FieldValues } from "react-hook-form";

export const RemoteResourceContext = createContext<RemoteResourceContextValue<any, any> | null>(null);
export function useRemoteResourceContext<T extends FieldValues, K extends FieldPath<T>>() {
  const context = useContext(RemoteResourceContext);
  if (!context) {
    throw new Error("RemoteResource compound components must be used within RemoteResourceRoot");
  }
  return context as RemoteResourceContextValue<T, K>;
}
export type RemoteResourceMode = "search" | "input" | "create" | "input/success";
export type RemoteResourceContextValue<T extends FieldValues, K extends FieldPath<T>> = {
  mode: RemoteResourceMode;
  setMode: (mode: RemoteResourceMode) => void;
  control: Control<T>;
  fieldName: K;
  onBlur?: () => void;
  onValueChange: (value: string) => void;
  rules?: {
    setValueAs: (value: string) => string;
  };
  getValue: () => string | undefined;
  inputRef: React.RefObject<HTMLInputElement | null>;
};
