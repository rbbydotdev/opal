import { RemoteAuthFormValues } from "@/components/remote-auth/RemoteAuthTemplate";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { UseFormReturn } from "react-hook-form";

export function GitHubScopeSelector({ form }: { form: UseFormReturn<RemoteAuthFormValues<"oauth-device" | "oauth">> }) {
  return (
    <FormField
      control={form.control}
      name="data.scope"
      render={({ field: { value, onChange } }) => (
        <FormItem className="flex items-center justify-between">
          <FormLabel className="text-sm font-medium">Include Private Repositories</FormLabel>
          <FormControl>
            <Switch
              disabled={form.getValues().data.obtainedAt !== undefined}
              checked={typeof value === "string" && value.includes("repo") && !value.includes("public_repo")}
              onCheckedChange={(checked) => {
                onChange(checked ? "read:user,repo,workflow" : "read:user,public_repo,workflow");
              }}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}
