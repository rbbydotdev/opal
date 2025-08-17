// import { useEffect, useState } from "react";

// export function useEventListener<T>(listener: (cb: (data: T) => void) => () => void, initialState: T): T {
//   const [event, setEvent] = useState<T>(initialState);
//   useEffect(() => {
//     const unsub = listener((data: T) => {
//       console.log("Event received:", data); // Debugging log
//       setEvent(data);
//     });
//     return () => {
//       unsub();
//     };
//   }, [listener, setEvent]);
//   return event;
// }
