import { RemoteAuthFormValues } from "@/components/RemoteAuthTemplate";
import { RemoteAuthDAO } from "@/data/dao/RemoteAuthDAO";
import { isRemoteAuthJType, PartialRemoteAuthJType, RemoteAuthJType } from "@/data/RemoteAuthTypes";
import { errF } from "@/lib/errors";
import { ConnectionsModalMode } from "@/types/ConnectionsModalTypes";
import { useState } from "react";

export const useRemoteAuthSubmit = (
  mode: ConnectionsModalMode,
  editConnection: RemoteAuthJType | PartialRemoteAuthJType | null | undefined,
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
      if (mode === "edit" && isRemoteAuthJType(editConnection)) {
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
        const result = await RemoteAuthDAO.Create({
          type,
          source,
          name,
          data: values.data!,
          tags: tags,
        });
        onSuccess(result);
      }
    } catch (error) {
      setError("Failed to save connection");
      console.error(errF`Error saving connection: ${error}`);
      onCancel?.(error as string | Error);
    } finally {
      setSubmitting(false);
    }
  };

  return { submitting, error, handleSubmit, reset };
};
