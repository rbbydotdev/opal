import { ConnectionsModal } from "@/components/connections-modal/ConnectionsModal";
import { RemoteAuthSourceIconComponent } from "@/components/remote-auth/RemoteAuthSourceIcon";
import {
  SelectableListActions,
  SelectableListContent,
  SelectableListHeader,
  SelectableListItem,
  SelectableListItemAction,
  SelectableListItemIcon,
  SelectableListItemLabel,
  SelectableListItemMenu,
  SelectableListItemSubLabel,
  SelectableListRoot,
} from "@/components/sidebar/SelectableList";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { SidebarGroup } from "@/components/ui/sidebar";
import { RemoteAuthDAO } from "@/data/dao/RemoteAuthDAO";
import { RemoteAuthJType } from "@/data/RemoteAuthTypes";
import { useRemoteAuths } from "@/hooks/useRemoteAuths";
import { Delete, Pencil, Plus, Sparkle } from "lucide-react";
import { useState } from "react";

function ConnectionManager(props: React.ComponentProps<typeof SidebarGroup>) {
  const { remoteAuths } = useRemoteAuths();
  const [editingConnection, setEditingConnection] = useState<RemoteAuthJType | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const handleEdit = (id: string) => {
    const connection = remoteAuths.find((conn) => conn.guid === id);
    if (connection) {
      setEditingConnection(connection);
    }
  };

  const handleDelete = (id: string) => {
    return RemoteAuthDAO.deleteByGuid(id);
  };

  const handleAddConnection = () => {
    setAddModalOpen(true);
  };

  return (
    <div {...props}>
      <SelectableListRoot
        data={remoteAuths}
        getItemId={(connection) => connection.guid}
        onClick={handleEdit}
        onDelete={handleDelete}
        expanderId="connections"
        emptyLabel="no connections"
      >
        <SelectableListHeader>
          <Sparkle size={12} className="mr-2" />
          Connections
        </SelectableListHeader>

        <SelectableListActions>
          <DropdownMenuItem onClick={handleAddConnection} className="grid grid-cols-[auto_1fr] items-center gap-2">
            <Plus /> Add Connection
          </DropdownMenuItem>
        </SelectableListActions>

        <SelectableListContent className="ml-7">
          {remoteAuths.map((connection) => (
            <SelectableListItem key={connection.guid} id={connection.guid}>
              <SelectableListItemIcon>
                <RemoteAuthSourceIconComponent
                  type={connection.type}
                  source={connection.source}
                  size={12}
                  className="flex-shrink-0"
                />
              </SelectableListItemIcon>
              <SelectableListItemLabel title={connection.name}>{connection.name}</SelectableListItemLabel>
              <SelectableListItemSubLabel>
                {`${connection.type} ${connection.source}`.toLowerCase()}
              </SelectableListItemSubLabel>
              <SelectableListItemMenu>
                <SelectableListItemAction
                  onClick={() => handleEdit(connection.guid)}
                  icon={<Pencil className="w-4 h-4" />}
                >
                  Edit
                </SelectableListItemAction>
                <SelectableListItemAction
                  onClick={() => handleDelete(connection.guid)}
                  icon={<Delete className="w-4 h-4" />}
                  destructive
                >
                  Delete
                </SelectableListItemAction>
              </SelectableListItemMenu>
            </SelectableListItem>
          ))}
        </SelectableListContent>
      </SelectableListRoot>
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
    </div>
  );
}

export function SidebarConnectionsSection(props: React.ComponentProps<typeof SidebarGroup>) {
  return <ConnectionManager {...props} />;
}
