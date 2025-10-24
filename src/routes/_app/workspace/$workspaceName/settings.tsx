import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const workspaceFormSchema = z.object({
  workspaceName: z
    .string()
    .min(2, { message: "Workspace name must be at least 2 characters." })
    .max(50, { message: "Workspace name must not exceed 50 characters." }),
  workspaceDescription: z.string().max(500, { message: "Description must not exceed 500 characters." }).optional(),
});

type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>;

const defaultValues: Partial<WorkspaceFormValues> = {
  workspaceName: "",
};

export const Route = createFileRoute("/_app/workspace/$workspaceName/settings")({
  component: WorkspaceSettingsPage,
});

function WorkspaceSettingsPage() {
  const { currentWorkspace } = useWorkspaceContext();
  const form = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceFormSchema),
    defaultValues,
  });
  useEffect(() => {
    if (!currentWorkspace.isNull) {
      form.reset({
        workspaceName: currentWorkspace.name,
      });
      console.log(currentWorkspace.name, "reset");
    }
  }, [currentWorkspace, form]);

  function onSubmit(data: WorkspaceFormValues) {
    toast({
      title: "Workspace updated",
      description: "Your workspace settings have been updated.",
      type: "success",
    });
    console.log(data);
  }

  function handleDeleteWorkspace() {
    toast({
      title: "Workspace deletion requested",
      description: "This action would delete your workspace.",
      type: "error",
    });
  }

  return (
    <div className="flex w-full items-start justify-center bg-background h-full">
      <div className="p-4 max-w-xl w-full gap-8 flex flex-col">
        <h1 className="text-2xl font-bold mb-4">Workspace Settings</h1>
        <section className="border-2 rounded-lg p-4 flex flex-col bg-card">
          <h2 className="text-lg font-bold mb-4">Info</h2>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <tbody>
                <tr className="border-b last:border-b-0">
                  <td className="w-1/3 py-3 px-2 text-sm font-medium text-muted-foreground">Workspace ID</td>
                  <td className="py-3 px-2 text-sm break-words">{currentWorkspace.id}</td>
                </tr>
                <tr className="border-b last:border-b-0">
                  <td className="w-1/3 py-3 px-2 text-sm font-medium text-muted-foreground">Name</td>
                  <td className="py-3 px-2 text-sm">{currentWorkspace.name}</td>
                </tr>
                <tr className="border-b last:border-b-0">
                  <td className="w-1/3 py-3 px-2 text-sm font-medium text-muted-foreground">Main Disk ID</td>
                  <td className="py-3 px-2 text-sm break-words">{currentWorkspace.getDisk().guid}</td>
                </tr>
                <tr>
                  <td className="w-1/3 py-3 px-2 text-sm font-medium text-muted-foreground">Disk Type</td>
                  <td className="py-3 px-2 text-sm">{currentWorkspace.getDisk().type}</td>
                </tr>
                <tr className="border-b last:border-b-0">
                  <td className="w-1/3 py-3 px-2 text-sm font-medium text-muted-foreground">Thumb Disk ID</td>
                  <td className="py-3 px-2 text-sm break-words">{currentWorkspace.getThumbsDisk().guid}</td>
                </tr>
                <tr>
                  <td className="w-1/3 py-3 px-2 text-sm font-medium text-muted-foreground">Disk Type</td>
                  <td className="py-3 px-2 text-sm">{currentWorkspace.getThumbsDisk().type}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section className="border-2 rounded-lg p-4 #flex flex-col bg-card hidden">
          <h2 className="text-lg font-bold mb-4">General</h2>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="workspaceName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-bold">Workspace Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Workspace" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit">Save Changes</Button>
            </form>
          </Form>

          <h2 className="text-lg font-bold mt-8 mb-4">Danger Zone</h2>
          <div className="flex flex-col space-y-4">
            <Button variant="destructive" onClick={handleDeleteWorkspace}>
              Delete Workspace
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
