import graymatter from "gray-matter";

export const newMd = function (doc: string) {
  // return graymatter.stringify(doc, { documentId: nanoid(), createdAt: new Date().toISOString() });
  return graymatter.stringify(doc, { createdAt: new Date().toISOString() });
};
