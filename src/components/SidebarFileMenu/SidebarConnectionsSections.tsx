import { ConnectionsModal } from "@/components/ConnectionsModal";
import { RemoteAuthSourceIconComponent } from "@/components/RemoteAuthSourceIcon";
import { SelectableList } from "@/components/ui/SelectableList";
import { SidebarGroup } from "@/components/ui/sidebar";
import { RemoteAuthJType } from "@/Db/RemoteAuthTypes";
import { useRemoteAuths } from "@/hooks/useRemoteAuths";
import { Delete, Pencil, Plus, Sparkle } from "lucide-react";
import { useState } from "react";

function ConnectionManager() {
  const { remoteAuths, deleteRemoteAuth } = useRemoteAuths();
  const [editingConnection, setEditingConnection] = useState<RemoteAuthJType | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const handleEdit = (id: string) => {
    const connection = remoteAuths.find((conn) => conn.guid === id);
    if (connection) {
      setEditingConnection(connection);
    }
  };

  const handleDelete = (id: string) => {
    return deleteRemoteAuth(id);
  };

  const handleAddConnection = () => {
    setAddModalOpen(true);
  };

  return (
    <>
      <SelectableList.Root onClick={handleEdit} expanderId="connections" emptyLabel="no connections">
        <SelectableList.Header>
          <Sparkle size={12} className="mr-2" />
          Connections
        </SelectableList.Header>

        <SelectableList.Actions>
          <SelectableList.ActionButton onClick={handleAddConnection} title="Add Connection" className="right-7">
            <Plus className="w-4 h-4" />
            <span className="sr-only">Add Connection</span>
          </SelectableList.ActionButton>
        </SelectableList.Actions>

        <SelectableList.Content>
          {remoteAuths.map((connection) => (
            <SelectableList.Item key={connection.guid} id={connection.guid}>
              <SelectableList.ItemIcon>
                <RemoteAuthSourceIconComponent
                  type={connection.type}
                  source={connection.source}
                  size={12}
                  className="flex-shrink-0"
                />
              </SelectableList.ItemIcon>
              <SelectableList.ItemLabel>{connection.name}</SelectableList.ItemLabel>
              <SelectableList.ItemSubLabel>
                {`${connection.type} ${connection.source}`.toLowerCase()}
              </SelectableList.ItemSubLabel>
              <SelectableList.ItemMenu>
                <SelectableList.ItemAction
                  onClick={() => handleEdit(connection.guid)}
                  icon={<Pencil className="w-4 h-4" />}
                >
                  Edit
                </SelectableList.ItemAction>
                <SelectableList.ItemAction
                  onClick={() => handleDelete(connection.guid)}
                  icon={<Delete className="w-4 h-4" />}
                  destructive
                >
                  Delete
                </SelectableList.ItemAction>
              </SelectableList.ItemMenu>
            </SelectableList.Item>
          ))}
        </SelectableList.Content>
      </SelectableList.Root>

      {/* Add Connection Modal */}
      <ConnectionsModal open={addModalOpen} onOpenChange={setAddModalOpen} onSuccess={() => setAddModalOpen(false)} />

      {/* Edit Connection Modal */}
      <ConnectionsModal
        mode="edit"
        editConnection={editingConnection!}
        open={Boolean(editingConnection)}
        onOpenChange={(open) => {
          if (!open) setEditingConnection(null);
        }}
        onSuccess={() => setEditingConnection(null)}
      />
    </>
  );
}

export function SidebarConnectionsSection(props: React.ComponentProps<typeof SidebarGroup>) {
  return <ConnectionManager {...props} />;
}
