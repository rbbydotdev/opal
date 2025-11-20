import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DestinationMetaType } from "@/data/DestinationDAO";
import { UseFormReturn } from "react-hook-form";

export function CloudflareDestinationForm({ form }: { form: UseFormReturn<DestinationMetaType<"cloudflare">> }) {
  return (
    <>
      <FormField
        control={form.control}
        name="meta.accountId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Account Id</FormLabel>
            <FormControl>
              <Input {...field} placeholder="account-id" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="meta.siteId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Site Id</FormLabel>
            <FormControl>
              <Input {...field} placeholder="my-cloudflare-site-id" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
