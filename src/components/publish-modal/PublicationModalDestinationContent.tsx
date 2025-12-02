import { AWSDestinationForm } from "@/components/publish-modal/AWSDestinationForm";
import { CloudflareDestinationForm } from "@/components/publish-modal/CloudflareDestinationForm";
import { GitHubDestinationForm } from "@/components/publish-modal/GitHubDestinationForm";
import { NetlifyDestinationForm } from "@/components/publish-modal/NetlifyDestinationForm";
import { PublishViewType } from "@/components/publish-modal/PublishModalStack";
import { VercelDestinationForm } from "@/components/publish-modal/VercelDestinationForm";
import { RemoteAuthSourceIconComponent } from "@/components/RemoteAuthSourceIcon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnyDestinationMetaType, DestinationDAO, DestinationJType, DestinationMetaType } from "@/data/DestinationDAO";
import { DestinationSchemaMap, DestinationType } from "@/data/DestinationSchemaMap";
import { RemoteAuthDAO } from "@/data/RemoteAuthDAO";
import { isRemoteAuthJType, PartialRemoteAuthJType, RemoteAuthJType } from "@/data/RemoteAuthTypes";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Pencil, Plus, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm, UseFormReturn, useWatch } from "react-hook-form";
import z from "zod";

export function PublicationModalDestinationContent({
  close,
  handleSubmit,
  defaultName,
  preferredConnection,
  editDestination,
  remoteAuths,
  setPreferredConnection,
  pushView,
}: {
  close: () => void;
  handleSubmit: (data: AnyDestinationMetaType) => void;
  defaultName?: string;
  editDestination?: DestinationDAO | null;
  preferredConnection: RemoteAuthJType | PartialRemoteAuthJType | null;
  remoteAuths: RemoteAuthDAO[];
  pushView: (view: PublishViewType) => void;
  setPreferredConnection: (connection: RemoteAuthJType | PartialRemoteAuthJType | null) => void;
}) {
  const defaultRemoteAuth = preferredConnection || remoteAuths[0];
  const defaultDestinationType: DestinationType = defaultRemoteAuth?.source || "custom";
  const [destinationType, setDestinationType] = useState<DestinationType>(defaultDestinationType);
  const [menuHelperOpen, setMenuHelperOpen] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);

  const remoteAuthId = editDestination
    ? editDestination.toJSON().remoteAuth.guid
    : isRemoteAuthJType(defaultRemoteAuth)
      ? defaultRemoteAuth.guid
      : "";

  const currentSchema = DestinationSchemaMap[destinationType];
  const defaultValues = useMemo(
    () => ({
      ...currentSchema._def.defaultValue(),
      remoteAuthId,
      ...(editDestination?.toJSON() as DestinationJType<any>),
    }),
    [currentSchema._def, editDestination, remoteAuthId]
  );

  const form = useForm<z.infer<(typeof DestinationSchemaMap)[typeof destinationType]>>({
    defaultValues,
    resolver: (values, opt1, opt2) => {
      return zodResolver<z.infer<(typeof DestinationSchemaMap)[typeof destinationType]>>(currentSchema)(
        values,
        opt1,
        opt2
      );
    },
    mode: "onChange",
  });

  const formValues = useWatch({ control: form.control });

  const currentRemoteAuthId = formValues.remoteAuthId;
  const remoteAuth = useMemo(
    () =>
      currentRemoteAuthId
        ? RemoteAuthDAO.FromJSON(remoteAuths.find((remoteAuth) => remoteAuth.guid === currentRemoteAuthId)!)
        : null,
    [currentRemoteAuthId, remoteAuths]
  );

  const isCompleteOkay = currentSchema.safeParse(formValues).success;

  const handleClose = () => {
    form.reset();
    setDestinationType(defaultDestinationType);
    close();
  };

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

  const ConnectionSelectPlaceHolder = (
    <div className="w-full truncate flex items-center">
      <div className="p-1 mr-1">
        <Zap className="w-4 h-4 stroke-ring flex-shrink-0" />
      </div>
      Connection
    </div>
  );

  const NoConnectionSelectPlaceHolder = (
    <div className="w-full truncate flex items-center">
      <div className="p-1 mr-1">
        <Zap className="w-4 h-4 stroke-ring flex-shrink-0" />
      </div>
      Add Connection
    </div>
  );

  const ConnectionMenuHelper = ({
    children,
    open,
    setOpen,
  }: {
    children: React.ReactNode;
    open: boolean;
    setOpen: (open: boolean) => void;
  }) => (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <div className="cursor-pointer">
          {remoteAuths.length ? ConnectionSelectPlaceHolder : NoConnectionSelectPlaceHolder}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">{children}</DropdownMenuContent>
    </DropdownMenu>
  );

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
                <Select
                  open={selectOpen}
                  value={field.value || ""}
                  onValueChange={handleSelectType}
                  onOpenChange={(open) => {
                    if (!remoteAuths.length) return setMenuHelperOpen(true);
                    setSelectOpen(open);
                  }}
                >
                  <SelectTrigger id="connection-type">
                    <SelectValue
                      placeholder={
                        remoteAuths.length ? (
                          "Select a connection type"
                        ) : (
                          <ConnectionMenuHelper open={menuHelperOpen} setOpen={setMenuHelperOpen}>
                            <DropdownMenuItem
                              onClick={() => {
                                pushView("connection");
                                setPreferredConnection(null);
                              }}
                            >
                              <Plus /> Add Connection
                            </DropdownMenuItem>
                          </ConnectionMenuHelper>
                        )
                      }
                    />
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    pushView("connection");
                    setPreferredConnection(null);
                  }}
                >
                  <Plus />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  // pushView
                  onClick={() => {
                    const selectedConnection = remoteAuths.find((conn) => conn.guid === field.value);
                    if (selectedConnection) setPreferredConnection(selectedConnection);
                    pushView("connection");
                  }}
                  disabled={!field.value || field.value === ""}
                  title="Edit Connection"
                >
                  <Pencil />
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
                  <Input
                    {...field}
                    placeholder="label"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        return e.preventDefault();
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {destinationType === "vercel" && (
          <VercelDestinationForm
            form={form as UseFormReturn<DestinationMetaType<typeof destinationType>>}
            remoteAuth={remoteAuth}
            defaultName={defaultName}
          />
        )}
        {destinationType === "github" && (
          <GitHubDestinationForm
            form={form as UseFormReturn<DestinationMetaType<typeof destinationType>>}
            remoteAuth={remoteAuth}
            defaultName={defaultName}
          />
        )}
        {destinationType === "cloudflare" && (
          <CloudflareDestinationForm
            form={form as UseFormReturn<DestinationMetaType<typeof destinationType>>}
            remoteAuth={remoteAuth}
          />
        )}
        {destinationType === "netlify" && (
          <NetlifyDestinationForm
            form={form as UseFormReturn<DestinationMetaType<typeof destinationType>>}
            defaultName={defaultName}
            remoteAuth={remoteAuth}
          />
        )}
        {destinationType === "aws" && (
          <AWSDestinationForm
            form={form as UseFormReturn<DestinationMetaType<typeof destinationType>>}
            remoteAuth={remoteAuth}
            defaultName={defaultName}
          />
        )}

        <div className="w-full justify-end flex gap-4">
          <Button type="button" variant="outline" onClick={handleClose}>
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
