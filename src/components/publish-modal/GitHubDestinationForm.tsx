import { GitHubRepoSelector } from "@/components/GitHubRepoSelector";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DestinationMetaType } from "@/data/dao/DestinationDAO";
import { absPath } from "@/lib/paths2";
import { RemoteAuthDAO } from "@/workspace/RemoteAuthDAO";
import { flushSync } from "react-dom";
import { UseFormReturn } from "react-hook-form";

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
  // const updateBaseUrlFromRepoFullName = (fullName: string) => {
  //   const repoName = coerceGithubRepoToName(fullName);
  //   form.setValue("meta.baseUrl", absPath([...repoName.split("/")].pop() || "/"));
  // };

  return (
    <>
      <GitHubRepoSelector
        control={form.control}
        fieldName="meta.repository"
        onValueChange={(value: string) => form.setValue("meta.repository", value)}
        // onBlur={() =>
        //   queueMicrotask(() =>
        //     flushSync(() => {
        //       const repoName = coerceGithubRepoToName(form.getValues("meta.repository"));
        //       form.setValue("meta.repository", repoName);
        //       updateBaseUrlFromRepoFullName(repoName);
        //     })
        //   )
        // }
        getValue={() => form.getValues("meta.repository")}
        remoteAuth={remoteAuth}
        defaultName={defaultName}
        label="Repository"
        placeholder="my-website-repo"
        // onRepoCreated={({ full_name }) => {
        //   updateBaseUrlFromRepoFullName(full_name);
        // }}
        // onValueProcessing={updateBaseUrlFromRepoFullName}
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
