import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Delete, Trash2, Undo } from "lucide-react";

export const RestoreBanner = ({
  open,
  cancel,
  restore,
  className,
}: {
  open: boolean;
  cancel: () => void;
  restore: () => void;
  className?: string;
}) => {
  if (!open) return null;

  return (
    <div
      className={cn(
        "w-[480px] text-sm text-ring pointer-events-none absolute left-0 right-0 m-auto top-16 z-50 flex justify-center items-center",
        className
      )}
    >
      <Button
        tabIndex={0}
        title="Put Back"
        onClick={cancel}
        aria-label="Put Back From Trash"
        className="!bg-primary-foreground absolute left-0 peer/putback transition-transform hover:scale-125 hover:text-ring rounded-full ock w-12 h-12 text-sidebar-foreground/70 shadow-lg pointer-events-auto"
      >
        <Undo strokeWidth={3} />
      </Button>
      <Button
        title="Permanently Delete"
        onClick={restore}
        aria-label="Permanently Delete"
        className="absolute right-0 peer/delete transition-transform  hover:scale-125 hover:text-ring shadow-lg rounded-full block w-12 h-12 !bg-primary-foreground text-sidebar-foreground/70 pointer-events-auto "
      >
        <Delete className="scale-125" strokeWidth={3} />
      </Button>
      <div
        data-putback="Put Back"
        data-delete="Delete"
        data-trash="Trash"
        className="
        shadow-lg
          transition-transform
          after:content-[attr(data-trash)]

          bg-primary-foreground

          peer-hover/delete:after:content-[attr(data-delete)]
          peer-hover/putback:after:content-[attr(data-putback)]
          peer-hover/putback:-translate-x-12

          peer-hover/putback:scale-x-105
          peer-hover/delete:scale-x-105

          peer-hover/delete:translate-x-12
          peer-hover/putback:[&_.putback-icon]:flex
          peer-hover/delete:[&_.delete-icon]:flex

          peer-hover/putback:[&_.trash-icon]:hidden
          peer-hover/delete:[&_.trash-icon]:hidden


          peer-hover/delete:text-ring
          peer-hover/putback:text-ring

          font-bold
          text-sidebar-foreground/70
          w-64
          h-12
          flex
          justify-center
          items-center
          gap-2
          rounded-full
        "
      >
        <div className="items-center gap-2 justify-center trash-icon">
          <Trash2 size={16} strokeWidth={2} />
        </div>
        <div className="hidden items-center gap-2 justify-center delete-icon">
          <Delete size={16} strokeWidth={2} />
        </div>
        <div className="hidden items-center gap-2 justify-center putback-icon">
          <Undo size={16} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
};
