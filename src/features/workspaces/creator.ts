// import { DiskType } from "@/Db/Disk";
// import { Workspace } from "@/Db/Workspace";

// export class WorkspaceCreator {
//   constructor(private workspace: Workspace) {}
//   static async WithSeedFiles(name: string, diskType?: DiskType) {
//     const workspace = (await WorkspaceDAO.CreateNewWithDiskType({ name, diskType })).toModel();
//     await workspace.newFiles(Object.entries(files).map(([path, content]) => [absPath(path), content]));
//     return workspace;
//   }

// }
