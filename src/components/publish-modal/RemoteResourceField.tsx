import {
  RemoteResourceContext,
  RemoteResourceContextValue,
  RemoteResourceMode,
  useRemoteResourceContext,
} from "@/components/publish-modal/RemoteResourceMode";
import { RemoteItemCreateInput, RemoteItemSearchDropDown } from "@/components/RemoteConnectionItem";
import { useRepositoryCreation } from "@/components/repository/RepositoryCreationProvider";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { TooltipToast, useTooltipToastCmd } from "@/components/ui/tooltip-toast";
import { Check, Plus, Search, X } from "lucide-react";
import React, { ReactNode, startTransition, useEffect, useRef, useState } from "react";
import { Control, FieldPath, FieldValues } from "react-hook-form";

interface RemoteResourceRootProps<T extends FieldValues, K extends FieldPath<T>> {
  children: ReactNode;
  control: Control<T>;
  fieldName: K;
  onValueChange: (value: string) => void;
  onInputBlur?: () => void;
  onCreateFocus?: () => void;
  getValue: () => string | undefined;
}

export function RemoteResourceRoot<T extends FieldValues, K extends FieldPath<T>>({
  children,
  control,
  fieldName,
  onValueChange,
  onInputBlur,
  onCreateFocus,
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
    onCreateFocus,
    onInputBlur,
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
  onClose,
  onSearchChange,
  searchResults,
  error,
}: {
  label: string;
  isLoading: boolean;
  searchValue: string;
  onActive?: () => void;
  onClose?: () => void;

  onSearchChange: (value: string) => void;
  searchResults: Array<{ element: ReactNode; label: string; value: string }>;
  error: string | Error | null;
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
            onClose?.();
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
  children,
  icon,
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
  children?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  const { mode, setMode, onValueChange, onCreateFocus } = useRemoteResourceContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const pauseCloseRef = useRef<boolean>(false);
  if (mode === "option") {
    return (
      <div>
        <FormLabel>{label}</FormLabel>
        <div className="flex justify-center w-full items-center gap-2 mt-2">
          {children}
          <Button type="button" variant="outline" title="Cancel" onClick={() => setMode("input")}>
            <X />
          </Button>
        </div>
      </div>
    );
  }

  if (mode !== "create") return null;
  //useEffect mode === "create" ???
  const handleCreateSubmit = async () => {
    try {
      pauseCloseRef.current = true;
      const res = await request.submit();
      pauseCloseRef.current = false;
      if (!res) return;
      onValueChange(res.name);
      setMode("input/success");
    } catch (_e) {
      inputRef.current?.addEventListener("focus", () => (pauseCloseRef.current = false), { once: true });
      inputRef.current?.focus();
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
          icon={icon}
          onFocus={onCreateFocus}
          onClose={(newName) => {
            if (!pauseCloseRef.current) {
              onValueChange(newName || "");
              setMode("input");
            }
          }}
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

function RemoteResourceInputField({
  label,
  placeholder,
  children,
}: {
  label: string;
  placeholder: string;
  children?: React.ReactNode;
}) {
  const { mode, setMode, control, fieldName, inputRef, onInputBlur } = useRemoteResourceContext();

  const { cmdRef } = useTooltipToastCmd();

  const showSuccess = mode.startsWith("input/success");
  useEffect(() => {
    if (showSuccess && cmdRef.current) {
      cmdRef.current.show("Successfully created!", "success", 2000);
    }
  }, [cmdRef, showSuccess]);

  if (!mode.startsWith("input")) return null;

  return (
    <FormField
      control={control}
      name={fieldName}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <div className="flex justify-start w-full items-center gap-2">
            <FormControl>
              <div className="flex items-center gap-2 w-full">
                {showSuccess && (
                  <div className="rounded-md w-9 h-9 border-success border text-success flex justify-center items-center p-1">
                    <TooltipToast cmdRef={cmdRef} />
                    <Check />
                  </div>
                )}

                <Input
                  {...field}
                  ref={inputRef}
                  onBlur={onInputBlur}
                  placeholder={placeholder}
                  className="flex-1 w-full"
                  onChange={(e) => {
                    setMode("input");
                    field.onChange(e);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                    }
                  }}
                />
              </div>
            </FormControl>
            {children}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function RemoteResourceCreateButton({
  title = "Create",
  ident,
  createReset,
}: {
  title?: string;
  ident: {
    isValid: boolean;
    name: string;
    setName: (name: string) => void;
  };
  createReset?: () => void;
}) {
  const { setMode, getValue } = useRemoteResourceContext();
  const repoCapabilities = useRepositoryCreation();

  return (
    <Button
      type="button"
      variant="outline"
      title={title}
      onClick={() => {
        setMode("input");
        createReset?.();
        const currentValue = getValue();
        ident.setName(currentValue || "");

        // Check if repository creation requires visibility selection
        if (repoCapabilities?.requiresOptions) {
          setMode("option");
        } else {
          setMode("create");
        }
      }}
    >
      <Plus />
    </Button>
  );
}

function RemoteResourceSearchButton({
  title = "Search",
  onSearchChange,
  searchReset,
}: {
  title?: string;
  onSearchChange: (value: string) => void;
  searchReset?: () => void;
}) {
  const { setMode, getValue } = useRemoteResourceContext();

  return (
    <Button
      type="button"
      variant="outline"
      title={title}
      onClick={() => {
        startTransition(() => {
          const currentValue = getValue();
          onSearchChange(currentValue || "");
          setMode("search");
          searchReset?.();
        });
      }}
    >
      <Search />
    </Button>
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
  return (
    <RemoteResourceInputField label={label} placeholder={placeholder}>
      <div>
        <RemoteResourceCreateButton title={createButtonTitle} ident={ident} createReset={createReset} />
      </div>
      <RemoteResourceSearchButton title={searchButtonTitle} onSearchChange={onSearchChange} searchReset={searchReset} />
    </RemoteResourceInputField>
  );
}

export function RemoteResourceSearchInput({
  label,
  placeholder,
  searchButtonTitle = "Search",
  searchReset,
  onSearchChange,
}: {
  label: string;
  placeholder: string;
  searchButtonTitle?: string;
  searchReset?: () => void;
  onSearchChange: (value: string) => void;
}) {
  return (
    <RemoteResourceInputField label={label} placeholder={placeholder}>
      <RemoteResourceSearchButton title={searchButtonTitle} onSearchChange={onSearchChange} searchReset={searchReset} />
    </RemoteResourceInputField>
  );
}

export const RemoteResource = {
  Root: RemoteResourceRoot as <T extends FieldValues, K extends FieldPath<T>>(
    props: RemoteResourceRootProps<T, K>
  ) => React.ReactElement,
  Search: RemoteResourceSearch,
  Create: RemoteResourceCreate,
  Input: RemoteResourceInput,
  InputField: RemoteResourceInputField,
  CreateButton: RemoteResourceCreateButton,
  SearchButton: RemoteResourceSearchButton,
};
