export const deleteIDBs = async () => {
  try {
    console.log("Clearing data and deleting all databases...");
    const databases = await window.indexedDB.databases().catch((error) => {
      console.error("Error getting databases:", error);
      return [];
    });

    await Promise.all(
      databases.map((db) => {
        return new Promise((resolve, reject) => {
          const request = window.indexedDB.open(db.name!);
          request.onsuccess = () => {
            const dbInstance = request.result;

            // Close all connections to the database
            dbInstance.close();

            // Forcefully delete the database
            const deleteRequest = window.indexedDB.deleteDatabase(db.name!);
            deleteRequest.onsuccess = () => resolve(undefined);
            deleteRequest.onerror = () => reject(deleteRequest.error);
            deleteRequest.onblocked = () => {
              console.warn(`Deletion of database ${db.name} is blocked.`);
              reject(new Error(`Deletion of database ${db.name} is blocked.`));
            };
          };

          request.onerror = () => {
            console.error(`Error opening database ${db.name}:`, request.error);
            reject(request.error);
          };
        });
      })
    );

    console.log("All databases deleted.");
    window.location.reload();
  } catch (error) {
    console.error("Error clearing and deleting databases:", error);
  }
};
