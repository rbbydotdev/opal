import Identicon from "@/components/Identicon";
import { useWorkspaceContext } from "@/context/WorkspaceHooks";

export function CurrentWorkspaceIcon(props: Omit<React.ComponentProps<typeof Identicon>, "input">) {
  const { currentWorkspace } = useWorkspaceContext();
  if (currentWorkspace.isNull) return null;

  return (
    <div className="inline-block rounded-sm overflow-hidden">
      <Identicon input={currentWorkspace.guid} {...props} size={props.size ?? 4} scale={props.scale ?? 7} />
    </div>
  );
}

type WorkspaceIconProps = Omit<React.ComponentProps<typeof Identicon>, "size" | "scale"> & {
  size?: number;
  scale?: number;
};

export function WorkspaceIcon(props: WorkspaceIconProps) {
  return (
    <div className="inline-block rounded-sm overflow-hidden">
      <Identicon {...props} size={props.size ?? 4} scale={props.scale ?? 7} />
    </div>
  );
}
