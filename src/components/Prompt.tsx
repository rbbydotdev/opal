import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import React, {
  ReactElement,
  createContext,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

type PromptContextType = {
  open: <T>(form: ReactElement, title: string, description: string) => Promise<T | null>;
};

const PromptContext = createContext<PromptContextType | undefined>(undefined);

export function PromptProvider({ children }: { children: React.ReactNode }) {
  const { open, cmdRef } = usePromptCmd();

  return (
    <PromptContext.Provider value={{ open }}>
      {children}
      <Prompt cmdRef={cmdRef} />
    </PromptContext.Provider>
  );
}

export function usePrompt() {
  const ctx = useContext(PromptContext);
  if (!ctx) throw new Error("usePrompt must be used within a PromptProvider");
  return ctx;
}

export function usePromptCmd() {
  const cmdRef = useRef<{
    open: <T>(form: ReactElement, title: string, description: string) => Promise<T | null>;
  }>({
    open: async () => null,
  });
  return {
    open: <T,>(form: ReactElement, title: string, description: string): Promise<T | null> =>
      cmdRef.current.open(form, title, description),
    cmdRef,
  };
}

export function Prompt({
  cmdRef,
}: {
  cmdRef: React.ForwardedRef<{
    open: <T>(form: ReactElement, title: string, description: string) => Promise<T | null>;
  }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const deferredPromiseRef = useRef<PromiseWithResolvers<any> | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState<string>("");
  const [FormElement, setFormElement] = useState<ReactElement | null>(null);

  const handleCancel = () => {
    deferredPromiseRef.current?.resolve(null);
    cleanup();
  };

  const handleSubmit = (data: any) => {
    deferredPromiseRef.current?.resolve(data);
    cleanup();
  };

  const cleanup = () => {
    setIsOpen(false);
    setFormElement(null);
    deferredPromiseRef.current = null;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancel();
    }
  };

  useEffect(() => {
    return () => {
      deferredPromiseRef.current = null;
    };
  }, []);

  useImperativeHandle(cmdRef, () => ({
    open: <T,>(form: ReactElement, title: string, description: string): Promise<T | null> => {
      deferredPromiseRef.current = Promise.withResolvers<T | null>();
      setTitle(title);
      setDescription(description);
      setFormElement(form);
      setIsOpen(true);
      return deferredPromiseRef.current.promise;
    },
  }));

  // Inject our submit handler into the form
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const formData = new FormData(e.currentTarget);
    console.log(formData);
    const values = Object.fromEntries(formData.entries());
    handleSubmit(values);
    //@ts-ignore
    if (FormElement.props.onSubmit) {
      //@ts-ignore
      FormElement.props.onSubmit(e);
    }
  };
  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent onKeyDown={handleKeyDown}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {FormElement && (
          <form onSubmit={onSubmit} className="w-full min-w-0">
            {FormElement}
          </form>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} ref={(ref) => ref?.focus()}>
            Cancel
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
