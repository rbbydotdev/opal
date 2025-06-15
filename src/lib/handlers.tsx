export function cxHandlers<T extends React.SyntheticEvent>(...eventHandlers: Array<(event: T) => boolean | void>) {
  return (event: T) => {
    for (const handler of eventHandlers) {
      const returnVal = handler(event);
      if (returnVal === false) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }
    eventHandlers.forEach((handler) => handler(event));
  };
}
