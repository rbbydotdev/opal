import { ClientIndexedDb } from "@/Db";

let _db: ClientIndexedDb | null = null;

export const ClientDb = new Proxy(
  {},
  {
    get(_, prop) {
      if (!_db) {
        _db = new ClientIndexedDb();
      }

      return Reflect.get(_db, prop);
    },
  }
) as ClientIndexedDb;
