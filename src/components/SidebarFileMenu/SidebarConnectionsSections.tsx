import { ConnectionsModal } from "@/components/ConnectionsModal";
import { RemoteAuthSourceIconComponent } from "@/components/RemoteAuthSourceIcon";
import { SelectableList, SelectableItem } from "@/components/ui/SelectableList2";
import { SidebarGroup } from "@/components/ui/sidebar";
import { RemoteAuthJType, RemoteAuthRecord } from "@/Db/RemoteAuthTypes";
import { useRemoteAuths } from "@/hooks/useRemoteAuths";
import { Plus, Sparkle } from "lucide-react";
import { useMemo, useState } from "react";

function ConnectionManager() {
  const { remoteAuths, deleteRemoteAuth } = useRemoteAuths();
  const [editingConnection, setEditingConnection] = useState<RemoteAuthJType | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Convert RemoteAuthRecord to SelectableItem format
  const connectionItems: SelectableItem[] = useMemo(
    () =>
      remoteAuths.map((connection) => ({
        id: connection.guid,
        label: connection.name,
        subLabel: `${connection.type} ${connection.source}`.toLowerCase(),
        Icon: () => (
          <RemoteAuthSourceIconComponent
            type={connection.type}
            source={connection.source}
            size={12}
            className="flex-shrink-0"
          />
        ),
      })),
    [remoteAuths]
  );

  const handleEdit = (id: string) => {
    const connection = remoteAuths.find((conn) => conn.guid === id);
    if (connection) {
      setEditingConnection(connection);
    }
  };

  const handleDelete = (id: string) => {
    deleteRemoteAuth(id);
  };

  const handleAddConnection = () => {
    setAddModalOpen(true);
  };

  return (
    <>
      <SelectableList.Root
        items={connectionItems}
        onEdit={handleEdit}
        onDelete={handleDelete}
        expanderId="connections"
        emptyLabel="no connections"
      >
        <SelectableList.Header>
          <Sparkle size={12} className="mr-2" />
          Connections
        </SelectableList.Header>
        
        <SelectableList.Actions>
          <SelectableList.ActionButton 
            onClick={handleAddConnection}
            title="Add Connection"
          >
            <Plus className="w-4 h-4" />
            <span className="sr-only">Add Connection</span>
          </SelectableList.ActionButton>
        </SelectableList.Actions>
        
        <SelectableList.Content />
      </SelectableList.Root>

      {/* Add Connection Modal */}
      <ConnectionsModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSuccess={() => setAddModalOpen(false)}
      />

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
