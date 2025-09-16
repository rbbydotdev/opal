// import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";

// // Factory function to create a typed FileTreeAttributes context
// export function createFileTreeAttributesContext<Attr extends string>() {
//   type FileTreeAttributes = {
//     resetAll: () => void;
//     addAttribute: (path: string, attributes: Attr[]) => void;
//     removeAttribute: (path: string, attribute: Attr) => void;
//     getAttributes: (path: string) => Attr[];
//     removePath: (path: string) => void;
//   };

//   const Context = createContext<FileTreeAttributes | null>(null);
//   Context.displayName = "FileTreeAttributesContext";

//   const Provider = ({ children }: { children: ReactNode }) => {
//     const [attributesMap, setAttributesMap] = useState<Map<string, Set<Attr>>>(new Map());

//     const resetAll = () => setAttributesMap(new Map());

//     const addAttribute = (path: string, attributes: Attr[]) => {
//       setAttributesMap((prev) => {
//         const newMap = new Map(prev);
//         const current = newMap.get(path) || new Set<Attr>();
//         attributes.forEach((attr) => current.add(attr));
//         newMap.set(path, current);
//         return newMap;
//       });
//     };

//     const removeAttribute = (path: string, attribute: Attr) => {
//       setAttributesMap((prev) => {
//         const newMap = new Map(prev);
//         const current = newMap.get(path);
//         if (current) {
//           current.delete(attribute);
//           if (current.size === 0) {
//             newMap.delete(path);
//           } else {
//             newMap.set(path, current);
//           }
//         }
//         return newMap;
//       });
//     };

//     const getAttributes = useCallback(
//       (path: string) => {
//         return Array.from(attributesMap.get(path) || []);
//       },
//       [attributesMap]
//     );

//     const removePath = (path: string) => {
//       setAttributesMap((prev) => {
//         const newMap = new Map(prev);
//         newMap.delete(path);
//         return newMap;
//       });
//     };

//     const value = useMemo<FileTreeAttributes>(
//       () => ({
//         resetAll,
//         addAttribute,
//         removeAttribute,
//         getAttributes,
//         removePath,
//       }),
//       [getAttributes]
//     );

//     return <Context.Provider value={value}>{children}</Context.Provider>;
//   };

//   const useFileTreeAttributes = () => {
//     const context = useContext(Context);
//     if (!context) {
//       throw new Error("useFileTreeAttributes must be used within its corresponding Provider");
//     }
//     return context;
//   };

//   return { Provider, useFileTreeAttributes, Context };
// }
