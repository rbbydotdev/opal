export default function Page() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Workspace Settings</h1>
      <div className="border-2 rounded-lg min-h-48 p-4 flex flex-col">
        <h2 className="text-lg font-bold mb-4">General</h2>
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col space-y-1">
            <label htmlFor="workspaceName" className="text-sm font-bold">
              Workspace Name
            </label>
            <input type="text" id="workspaceName" className="input" />
          </div>
          <div className="flex flex-col space-y-1">
            <label htmlFor="workspaceDescription" className="text-sm font-bold">
              Description
            </label>
            <textarea id="workspaceDescription" className="input" />
          </div>
        </div>
        <h2 className="text-lg font-bold mt-8 mb-4">Danger Zone</h2>
        <div className="flex flex-col space-y-4">
          <button className="btn btn-danger">Delete Workspace</button>
        </div>
      </div>
    </div>
  );
}
