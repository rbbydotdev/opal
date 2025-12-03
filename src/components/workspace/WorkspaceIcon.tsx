import { Identicon } from "@/components/Identicon";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { twMerge } from "tailwind-merge";

export function CurrentWorkspaceIcon(
  props: Omit<React.ComponentProps<typeof Identicon>, "input"> & { className?: string; variant?: keyof typeof variants }
) {
  const { currentWorkspace } = useWorkspaceContext();
  if (currentWorkspace.isNull) return null;

  return <WorkspaceIcon input={currentWorkspace.guid} className={props.className} variant={props.variant} />;
  // return (
  //   <div className="inline-block rounded-sm overflow-clip">
  //     <Identicon input={currentWorkspace.guid} {...props} size={props.size ?? 4} scale={props.scale ?? 7} />
  //   </div>
  // );
}

type WorkspaceIconProps = Omit<React.ComponentProps<typeof Identicon>, "size" | "scale"> & {
  size?: number;
  scale?: number;
  className?: string;
};

const variants = {
  round: "rounded-full",
  square: "rounded-sm",
};

export function WorkspaceIcon({
  className,
  variant,
  ...props
}: WorkspaceIconProps & { variant?: keyof typeof variants }) {
  return (
    <span className={twMerge(variants[variant ?? "square"], "inline-block overflow-clip", className)}>
      <Identicon {...props} size={props.size ?? 4} scale={props.scale ?? 5} />
    </span>
  );
}
