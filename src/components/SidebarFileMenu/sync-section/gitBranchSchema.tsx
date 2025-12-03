import z from "zod";

export const gitBranchSchema = z.object({
  branch: z
    .string()
    .trim()
    .min(1, "Branch name is required")
    .max(100, "Branch name is too long")
    .regex(
      /^(?!\/|.*([/.]\.|\/\/|@\{|\\))[^\x00-\x1f\x7f ~^:?*[]+(?<!\.lock|\/|\.| )$/,
      "Invalid branch name: must not start/end with '/', contain spaces, or special characters"
    ),
});

const gitRefSchema = z.object({
  value: gitBranchSchema,
  type: z.enum(["branch", "commit"]),
});
