import z from "zod";

export const gitRefSchema = z.object({
  value: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name is too long")
    .regex(
      /^(?!\/|.*([/.]\.|\/\/|@\{|\\))[^\x00-\x1f\x7f ~^:?*[]+(?<!\.lock|\/|\.| )$/,
      "Invalid name: must not start/end with '/', contain spaces, or special characters"
    ),
  type: z.enum(["branch", "commit"]),
});
// Keep backward compatibility

export const gitBranchSchema = z.object({
  branch: z
    .string()
    .min(1, "Branch name is required")
    .max(100, "Branch name is too long")
    .regex(
      /^(?!\/|.*([/.]\.|\/\/|@\{|\\))[^\x00-\x1f\x7f ~^:?*[]+(?<!\.lock|\/|\.| )$/,
      "Invalid branch name: must not start/end with '/', contain spaces, or special characters"
    ),
});
