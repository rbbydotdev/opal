// import React, { createContext, useContext } from "react";
// type DropCommanderProps = {
//   handleExternalFileDrop: (files: File[]) => Promise<void>;
//   handleFileTreeNodeDrop: (files: File[], targetNode: string) => Promise<void>;
//   handleDrop: (event: React.DragEvent) => Promise<void>;
// };

// const DropCommanderContext = createContext<DropCommanderProps>({
//   handleExternalFileDrop: async () => {},
//   handleFileTreeNodeDrop: async () => Promise.resolve(),
//   handleDrop: async () => Promise.resolve(),
// });

// //detect dragging

// export function DropCommanderProvider({ children }: { children: React.ReactNode }) {
//   // You can add your context values here later
//   const handleExternalFileDrop = async () => {};
//   const handleFileTreeNodeDrop = async () => {};
//   const handleDrop = async () => {};

//   return (
//     <DropCommanderContext.Provider
//       value={{
//         handleFileTreeNodeDrop,
//         handleExternalFileDrop,
//         handleDrop,
//       }}
//     >
//       <>{children}</>
//     </DropCommanderContext.Provider>
//   );
// }

// export function useDropCommander() {
//   const context = useContext(DropCommanderContext);
//   if (context === undefined) {
//     throw new Error("useDropCommander must be used within a DropCommanderProvider");
//   }
//   return context;
// }
