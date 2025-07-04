// const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
// useEffect(() => {
//   const timeout = debounceRef.current;
//   return () => {
//     if (timeout) {
//       clearTimeout(timeout);
//     }
//   };
// }, []);

// const updateContents = useCallback(
//   async (updates: string) => {
//     if (filePath && currentWorkspace) {
//       await currentWorkspace?.disk.writeFile(filePath, prettifyMarkdownAsync(updates));
//     }
//   },
//   [currentWorkspace, filePath]
// );
// const debouncedUpdate = useDebouncedIdleCallback(
//   (content: string | null) => {
//     if (content !== null) {
//       void updateContents(String(content));
//     }
//   },
//   250,
//   1000
// );
