import { RemoteAuthFormValues } from "@/components/RemoteAuthTemplate";
import { RemoteAuthDAO } from "@/data/RemoteAuthDAO";
import { RemoteAuthJType } from "@/data/RemoteAuthTypes";
import { getUniqueSlug } from "@/lib/getUniqueSlug";
import { ConnectionsModalMode } from "@/types/ConnectionsModalTypes";
import { useState } from "react";

export const useRemoteAuthSubmit = (
  mode: ConnectionsModalMode,
  editConnection: RemoteAuthJType | undefined,
  onSuccess: (rad: RemoteAuthDAO) => void,
  onCancel?: (error?: Error | string) => void,
  tags: string[] = ["github"]
) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reset = () => {
    setSubmitting(false);
    setError(null);
  };

  const handleSubmit = async (formValues: RemoteAuthFormValues) => {
    setSubmitting(true);
    try {
      if (mode === "edit" && editConnection) {
        const dao = RemoteAuthDAO.FromJSON({
          ...editConnection,
          guid: editConnection.guid,
          source: formValues.source,
          type: formValues.type,
          name: formValues.name,
          data: formValues.data,
          tags: tags,
        });
        await dao.save();
        onSuccess(dao);
      } else {
        const { type, source, name, ...values } = formValues;
        const existingNames = (await RemoteAuthDAO.all()).map((rad) => rad.name);
        const uniq = getUniqueSlug(name, existingNames);
        const result = await RemoteAuthDAO.Create(type, source, uniq, values.data!);
        onSuccess(result);
      }
    } catch (error) {
      setError("Failed to save connection");
      console.error("Error saving connection:", error);
      onCancel?.(error as string | Error);
    } finally {
      setSubmitting(false);
    }
  };

  return { submitting, error, handleSubmit, reset };
};
