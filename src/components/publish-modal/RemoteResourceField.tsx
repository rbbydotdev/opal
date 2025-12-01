import { RemoteItemCreateInput, RemoteItemSearchDropDown } from "@/components/RemoteConnectionItem";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Plus, Search, X } from "lucide-react";
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { Control, FieldPath, FieldValues } from "react-hook-form";

type RemoteResourceMode = "search" | "input" | "create";

type RemoteResourceContextValue<T extends FieldValues, K extends FieldPath<T>> = {
  mode: RemoteResourceMode;
  setMode: (mode: RemoteResourceMode) => void;
  control: Control<T>;
  fieldName: K;
  onValueChange: (value: string) => void;
  getValue: () => string | undefined;
  inputRef: React.RefObject<HTMLInputElement | null>;
};

const RemoteResourceContext = createContext<RemoteResourceContextValue<any, any> | null>(null);

function useRemoteResourceContext<T extends FieldValues, K extends FieldPath<T>>() {
  const context = useContext(RemoteResourceContext);
  if (!context) {
    throw new Error("RemoteResource compound components must be used within RemoteResourceRoot");
  }
  return context as RemoteResourceContextValue<T, K>;
}

interface RemoteResourceRootProps<T extends FieldValues, K extends FieldPath<T>> {
  children: ReactNode;
  control: Control<T>;
  fieldName: K;
  onValueChange: (value: string) => void;
  getValue: () => string | undefined;
}

export function RemoteResourceRoot<T extends FieldValues, K extends FieldPath<T>>({
  children,
  control,
  fieldName,
  onValueChange,
  getValue,
}: RemoteResourceRootProps<T, K>) {
  const [mode, setMode] = useState<RemoteResourceMode>("input");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "input" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [mode]);

  const contextValue: RemoteResourceContextValue<T, K> = {
    mode,
    setMode,
    control,
    fieldName,
    onValueChange,
    getValue,
    inputRef,
  };

  return <RemoteResourceContext.Provider value={contextValue}>{children}</RemoteResourceContext.Provider>;
}

export function RemoteResourceSearch({
  label,
  isLoading,
  searchValue,
  onActive,
  onSearchChange,
  searchResults,
  error,
}: {
  label: string;
  isLoading: boolean;
  searchValue: string;
  onActive: () => void;
  onSearchChange: (value: string) => void;
  searchResults: Array<{ element: ReactNode; label: string; value: string }>;
  error: string | null;
}) {
  const { mode, setMode, onValueChange } = useRemoteResourceContext();

  if (mode !== "search") return null;

  return (
    <div>
      <FormLabel>{label}</FormLabel>
      <div className="flex justify-center w-full items-center gap-2 mt-2">
        <RemoteItemSearchDropDown
          className="flex-1"
          isLoading={isLoading}
          searchValue={searchValue}
          onFocus={onActive}
          onSearchChange={onSearchChange}
          onClose={(val?: string) => {
            setMode("input");
            if (val) onValueChange(val);
          }}
          onSelect={(item: { element: ReactNode; label: string; value: string }) => {
            onValueChange(item.value);
            setMode("input");
          }}
          error={error}
          allItems={searchResults}
        />
        <Button type="button" variant="outline" title="Exit search" onClick={() => setMode("input")}>
          <X />
        </Button>
      </div>
    </div>
  );
}

export function RemoteResourceCreate({
  label,
  placeholder,
  ident,
  msg,
  request,
  error,
  onCreateSuccess,
}: {
  label: string;
  placeholder: string;
  ident: {
    isValid: boolean;
    name: string;
    setName: (name: string) => void;
  };
  msg: {
    creating: string;
    askToEnter: string;
    valid: string;
    error: string | null;
  };
  request: {
    error: string | null;
    isLoading: boolean;
    submit: () => Promise<{ name: string } | null>;
    reset: () => void;
  };
  error?: string | null;
  onCreateSuccess?: (name: string) => void;
}) {
  const { mode, setMode, onValueChange } = useRemoteResourceContext();
  const inputRef = useRef<HTMLInputElement>(null);

  if (mode !== "create") return null;

  const handleCreateSubmit = async () => {
    try {
      const res = await request.submit();
      if (!res) return;
      onValueChange(res.name);
      setMode("input");
      onCreateSuccess?.(res.name);
    } catch {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  return (
    <div>
      <FormLabel>{label}</FormLabel>
      <div className="flex justify-center w-full items-center gap-2 mt-2">
        <RemoteItemCreateInput
          className="flex-1"
          ref={inputRef}
          placeholder={placeholder}
          onClose={() => setMode("input")}
          submit={handleCreateSubmit}
          request={request}
          msg={msg}
          ident={ident}
        />
        <Button type="button" variant="outline" title="Exit create" onClick={() => setMode("input")}>
          <X />
        </Button>
      </div>
    </div>
  );
}

export function RemoteResourceInput({
  label,
  placeholder,
  createButtonTitle = "Create",
  searchButtonTitle = "Search",
  ident,
  createReset,
  searchReset,
  onSearchChange,
}: {
  label: string;
  placeholder: string;
  createButtonTitle?: string;
  searchButtonTitle?: string;
  ident: {
    isValid: boolean;
    name: string;
    setName: (name: string) => void;
  };
  createReset?: () => void;
  searchReset?: () => void;
  onSearchChange: (value: string) => void;
}) {
  const { mode, setMode, control, fieldName, getValue, inputRef } = useRemoteResourceContext();

  if (mode !== "input") return null;

  return (
    <FormField
      control={control}
      name={fieldName}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <div className="flex justify-center w-full items-center gap-2">
            <FormControl>
              <Input
                {...field}
                ref={inputRef}
                placeholder={placeholder}
                onChange={(e) => {
                  field.onChange(e);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                  }
                }}
              />
            </FormControl>
            <Button
              type="button"
              variant="outline"
              title={createButtonTitle}
              onClick={() => {
                createReset?.();
                const currentValue = getValue();
                ident.setName(currentValue || "");
                setMode("create");
              }}
            >
              <Plus />
            </Button>
            <Button
              type="button"
              variant="outline"
              title={searchButtonTitle}
              onClick={() => {
                const currentValue = getValue();
                onSearchChange(currentValue || "");
                setMode("search");
                searchReset?.();
              }}
            >
              <Search />
            </Button>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export const RemoteResource = {
  Root: RemoteResourceRoot as <T extends FieldValues, K extends FieldPath<T>>(
    props: RemoteResourceRootProps<T, K>
  ) => React.ReactElement,
  Search: RemoteResourceSearch,
  Create: RemoteResourceCreate,
  Input: RemoteResourceInput,
};
