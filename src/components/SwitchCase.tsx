export function Case({ condition: _condition, children }: { condition: boolean; children?: React.ReactNode }) {
  return <>{children}</>;
}

export function SwitchCase({
  children,
}: {
  children: React.ReactElement<typeof Case> | React.ReactElement<typeof Case>[];
}) {
  const childrenArray = Array.isArray(children) ? children : [children];
  for (const child of childrenArray) {
    if ((child.props as any).condition) {
      return <>{(child.props as any).children}</>;
    }
  }
  return null;
}
