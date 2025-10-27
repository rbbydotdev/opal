type ProviderEntry<V> = {
  Provider: React.ComponentType<{ children: React.ReactNode }>;
  useValue: () => V;
};

export function withProviders<P>(Component: React.ComponentType<P>, entries: ProviderEntry<any>[]): React.FC<P> {
  const Wrapped: React.FC<P> = (props) => {
    const combinedValues = entries.reduce((acc, { useValue }) => ({ ...acc, ...useValue() }), {});
    return entries.reduceRight(
      (child, { Provider }) => <Provider>{child}</Provider>,
      <Component {...(props as P)} {...combinedValues} />
    );
  };
  return Wrapped;
}
