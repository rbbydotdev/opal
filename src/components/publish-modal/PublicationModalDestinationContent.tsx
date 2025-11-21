import { CloudflareDestinationForm } from "@/components/publish-modal/CloudflareDestinationForm";
import { NetlifyDestinationForm } from "@/components/publish-modal/NetlifyDestinationForm";
import { RemoteAuthSourceIconComponent } from "@/components/RemoteAuthSourceIcon";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DestinationDAO,
  DestinationJType,
  DestinationMetaType,
  DestinationSchemaMap,
  DestinationType,
} from "@/data/DestinationDAO";
import { RemoteAuthDAO } from "@/data/RemoteAuthDAO";
import { RemoteAuthRecord } from "@/data/RemoteAuthTypes";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import z from "zod";

export function PublicationModalDestinationContent({
  close,
  handleSubmit,
  defaultName,
  preferredDestConnection,
  editDestination,
  remoteAuths,
  onAddConnection,
}: {
  close: () => void;
  handleSubmit: (data: any) => void;
  defaultName?: string;
  editDestination?: DestinationDAO | null;
  preferredDestConnection: RemoteAuthRecord | null;
  remoteAuths: RemoteAuthDAO[];
  onAddConnection: () => void;
}) {
  const defaultRemoteAuth = preferredDestConnection || remoteAuths[0];
  const defaultDestinationType: DestinationType = defaultRemoteAuth?.source || "custom";
  const [destinationType, setDestinationType] = useState<DestinationType>(defaultDestinationType);
  const currentSchema = useMemo(() => DestinationSchemaMap[destinationType], [destinationType]);

  const form = useForm<z.infer<(typeof DestinationSchemaMap)[typeof destinationType]>>({
    defaultValues: {
      ...currentSchema._def.defaultValue(),
      remoteAuthId: defaultRemoteAuth?.guid || "",
      ...(editDestination?.toJSON() as DestinationJType<any>),
    },
    resolver: (values, opt1, opt2) => {
      return zodResolver<z.infer<(typeof DestinationSchemaMap)[typeof destinationType]>>(
        DestinationSchemaMap[destinationType]
      )(values, opt1, opt2);
    },
    mode: "onChange",
  });

  const formValues = form.watch();

  const currentRemoteAuthId = formValues.remoteAuthId;
  const remoteAuth = useMemo(
    () =>
      currentRemoteAuthId
        ? RemoteAuthDAO.FromJSON(remoteAuths.find((remoteAuth) => remoteAuth.guid === currentRemoteAuthId)!)
        : null,
    [currentRemoteAuthId, remoteAuths]
  );

  const isCompleteOkay = currentSchema.safeParse(formValues).success;

  const handleSelectType = (value: string) => {
    form.setValue("remoteAuthId", value);
    const remoteAuth = remoteAuths.find((remoteAuth) => remoteAuth.guid === value);
    const newType = remoteAuth ? (remoteAuth.source as DestinationType) : "custom";
    setDestinationType(newType);
    form.reset({
      ...DestinationSchemaMap[newType]._def.defaultValue(),
      remoteAuthId: value,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4 pt-2">
        <FormField
          control={form.control}
          name="remoteAuthId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Connection Type</FormLabel>
              <div className="flex gap-2">
                <Select value={field.value || ""} onValueChange={handleSelectType}>
                  <SelectTrigger id="connection-type">
                    <SelectValue placeholder="Select a connection type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectSeparator />
                    {remoteAuths.map((connection) => (
                      <SelectItem key={connection.guid} value={connection.guid}>
                        <div className="flex items-center gap-2">
                          <RemoteAuthSourceIconComponent source={connection.source} />
                          <div>
                            <p className="text-sm font-medium">{connection.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {connection.source} {connection.type}
                            </p>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={onAddConnection}>
                  <Plus />
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {destinationType !== "custom" && (
          <FormField
            control={form.control}
            name="label"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Destination Label</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="label" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {destinationType === "cloudflare" && (
          <CloudflareDestinationForm form={form as UseFormReturn<DestinationMetaType<typeof destinationType>>} />
        )}
        {destinationType === "netlify" && (
          <NetlifyDestinationForm
            form={form as UseFormReturn<DestinationMetaType<typeof destinationType>>}
            defaultName={defaultName}
            remoteAuth={remoteAuth}
            destination={null}
          />
        )}

        <div className="w-full justify-end flex gap-4">
          <Button type="button" variant="outline" onClick={close}>
            <ArrowLeft /> Back
          </Button>
          <Button type="submit" disabled={!isCompleteOkay}>
            <Zap />
            Save
          </Button>
        </div>
      </form>
    </Form>
  );
}
