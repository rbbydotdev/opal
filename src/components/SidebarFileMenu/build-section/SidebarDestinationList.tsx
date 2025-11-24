import { useDestinationManager } from "@/components/DestinationManagerContext";
import { DestinationLabel } from "@/components/SidebarFileMenu/build-files-section/DestinationLabel";
import { EmptySidebarLabel } from "@/components/SidebarFileMenu/EmptySidebarLabel";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { SimpleSelectableList } from "@/components/ui/SelectableList";
import { DestinationDAO } from "@/data/DestinationDAO";
import { useDestinations } from "@/hooks/useDestinations";
import { coerceError } from "@/lib/errors";
import { useErrorToss } from "@/lib/errorToss";
import { Delete, Eye, Plus } from "lucide-react";

export function SidebarDestinationList() {
  const { openDestinationFlow } = useDestinationManager();
  const errorToss = useErrorToss();
  const { destinations } = useDestinations();
  const handleDelete = async (destId: string) => {
    try {
      await DestinationDAO.delete(destId);
    } catch (error) {
      errorToss(coerceError(error));
    }
  };

  const handleView = (destinationId: string) => {
    openDestinationFlow({ destinationId });
  };

  return (
    <SimpleSelectableList.Root
      data={destinations}
      getItemId={(build) => build.guid}
      onClick={handleView}
      onDelete={handleDelete}
      emptyLabel="no destinations found"
      showGrip={false}
    >
      <SimpleSelectableList.Actions>
        <DropdownMenuItem onClick={() => {}} className="grid grid-cols-[auto_1fr] items-center gap-2">
          <Plus /> Add Destination
        </DropdownMenuItem>
      </SimpleSelectableList.Actions>

      <SimpleSelectableList.Items>
        <div className="flex flex-col gap-2 mt-4 ml-3 group">
          {destinations.length === 0 && <EmptySidebarLabel label="no destinations" />}
          {destinations.map((destination) => (
            <SimpleSelectableList.Item key={destination.guid} id={destination.guid}>
              <DestinationLabel destination={destination} />
              <SimpleSelectableList.ItemMenu>
                <SimpleSelectableList.ItemAction
                  onClick={() => handleView(destination.guid)}
                  icon={<Eye className="w-4 h-4" />}
                >
                  View
                </SimpleSelectableList.ItemAction>
                <SimpleSelectableList.ItemAction
                  onClick={() => handleDelete(destination.guid)}
                  icon={<Delete className="w-4 h-4" />}
                  destructive
                >
                  Delete
                </SimpleSelectableList.ItemAction>
              </SimpleSelectableList.ItemMenu>
            </SimpleSelectableList.Item>
          ))}
        </div>
      </SimpleSelectableList.Items>
    </SimpleSelectableList.Root>
  );
}
