import { ConnectionsModalMode } from "@/components/ConnectionsModal";
import { RemoteAuthFormValues } from "@/components/RemoteAuthTemplate";
import { RemoteAuthDAO, RemoteAuthJType } from "@/Db/RemoteAuth";
import { useState } from "react";

export const useRemoteAuthSubmit = (
  mode: ConnectionsModalMode,
  editConnection: RemoteAuthJType | undefined,
  onSuccess: (rad: RemoteAuthDAO) => void,
  onCancel: () => void
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
          source: editConnection.source,
          guid: editConnection.guid,
          type: editConnection.type,
          name: formValues.name,
          data: formValues.data,
        });
        await dao.save();
        onSuccess(dao);
      } else {
        const { type, source, name, ...values } = formValues;
        const result = await RemoteAuthDAO.Create(type, source, name, values.data!);
        onSuccess(result);
      }
      onCancel();
    } catch (error) {
      setError("Failed to save connection");
      console.error("Error saving connection:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return { submitting, error, handleSubmit, reset };
};
