import { useDestinationManager } from "@/components/DestinationManagerContext";
import { DestinationLabel } from "@/components/sidebar/build-files-section/DestinationLabel";
import { EmptySidebarLabel } from "@/components/sidebar/EmptySidebarLabel";
import {
  SelectableListActions,
  SelectableListItem,
  SelectableListItemAction,
  SelectableListItemMenu,
  SelectableListItems,
  SelectableListSimple,
} from "@/components/sidebar/SelectableList";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DestinationDAO } from "@/data/dao/DestinationDAO";
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
    openDestinationFlow(destinationId);
  };

  return (
    <SelectableListSimple
      data={destinations}
      getItemId={(build) => build.guid}
      onClick={handleView}
      onDelete={handleDelete}
      emptyLabel="no destinations found"
      showGrip={false}
    >
      <SelectableListActions>
        <DropdownMenuItem
          onClick={() => openDestinationFlow()}
          className="grid grid-cols-[auto_1fr] items-center gap-2"
        >
          <Plus /> Add Destination
        </DropdownMenuItem>
      </SelectableListActions>

      <SelectableListItems>
        <div className="flex flex-col gap-2 mt-4 ml-3 group">
          {destinations.length === 0 && <EmptySidebarLabel label="no destinations" />}
          {destinations.map((destination) => (
            <SelectableListItem key={destination.guid} id={destination.guid}>
              <DestinationLabel destination={destination} />
              <SelectableListItemMenu>
                <SelectableListItemAction
                  onClick={() => handleView(destination.guid)}
                  icon={<Eye className="w-4 h-4" />}
                >
                  View
                </SelectableListItemAction>
                <SelectableListItemAction
                  onClick={() => handleDelete(destination.guid)}
                  icon={<Delete className="w-4 h-4" />}
                  destructive
                >
                  Delete
                </SelectableListItemAction>
              </SelectableListItemMenu>
            </SelectableListItem>
          ))}
        </div>
      </SelectableListItems>
    </SelectableListSimple>
  );
}
