import { z } from "zod";

// Helper that trims every string in a schema
export const zodTrimStrings = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  z.object(
    Object.fromEntries(
      Object.entries(schema.shape).map(([key, value]) => {
        return [key, value instanceof z.ZodString ? value.trim() : value];
      })
    ) as { [K in keyof T]: T[K] }
  );
