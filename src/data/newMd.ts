import graymatter from "gray-matter";
import { nanoid } from "nanoid";

export const newMd = function (doc: string) {
  return graymatter.stringify(doc, { documentId: nanoid(), createdAt: new Date().toISOString() });
};
