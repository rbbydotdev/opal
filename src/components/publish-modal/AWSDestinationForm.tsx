import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DestinationMetaType } from "@/data/DestinationDAO";
import { AWS_REGIONS, getRegionDisplayName } from "@/lib/aws/AWSRegions";
import { UseFormReturn } from "react-hook-form";

export function AWSDestinationForm({ form }: { form: UseFormReturn<DestinationMetaType<"aws">> }) {
  return (
    <>
      <FormField
        control={form.control}
        name="meta.bucketName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Bucket Name</FormLabel>
            <FormControl>
              <Input {...field} placeholder="my-website-bucket" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="meta.region"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Region</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a region" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {AWS_REGIONS.map((region) => (
                  <SelectItem key={region.value} value={region.value}>
                    {getRegionDisplayName(region.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
