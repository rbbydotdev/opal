import { GitHubRepoSelector } from "@/components/GitHubRepoSelector";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DestinationMetaType } from "@/data/dao/DestinationDAO";
import { absPath } from "@/lib/paths2";
import { RemoteAuthDAO } from "@/workspace/RemoteAuthDAO";
import { flushSync } from "react-dom";
import { UseFormReturn } from "react-hook-form";
import { coerceGitHubRepoToURL } from "../../data/remote-auth/RemoteAuthGithubAgent";

// https://github.com/rbbydotdev/test123/settings/pages
// should set up gear link to assist and remind user to set up github pages
// should add force push check box for gh-pages branch
// add public or private repo option

export function GitHubDestinationForm({
  form,
  remoteAuth,
  defaultName,
}: {
  form: UseFormReturn<DestinationMetaType<"github">>;
  remoteAuth: RemoteAuthDAO | null;
  defaultName?: string;
}) {
  return (
    <>
      <GitHubRepoSelector
        control={form.control}
        fieldName="meta.repository"
        onValueChange={(value: string) => {
          form.setValue("meta.repository", coerceGitHubRepoToURL(value));
          if (form.getValues("meta.baseUrl") === "/") {
            form.setValue("meta.baseUrl", absPath([...value.split("/")].pop() || "/"));
          }
        }}
        getValue={() => form.getValues("meta.repository")}
        remoteAuth={remoteAuth}
        defaultName={defaultName}
        label="Repository"
        placeholder="https://github.com/user/my-website-repo"
      />
      <FormField
        control={form.control}
        name="meta.branch"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Branch</FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder="gh-pages"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                  }
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="meta.baseUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Base URL</FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder="/"
                onBlur={() => flushSync(() => form.setValue("meta.baseUrl", absPath(form.getValues("meta.baseUrl"))))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                  }
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
