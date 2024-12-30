"use client";
import { Workspace } from "@/clientdb/Workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { customAlphabet } from "nanoid";
import { useEffect, useState } from "react";
const nanoid = customAlphabet("1234567890abcdef", 16);

export default function Page() {
  useEffect(() => {}, []);
  const [name, setName] = useState(nanoid());
  return (
    <div className="p-6">
      <div>new workspace</div>
      <div className="gap-2 flex">
        <Input placeholder="Workspace Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button
          onClick={
            async () => {
              await new Workspace(name).save();
            }
            // await ClientDb.workspaces.put({
            //   name,
            //   type: "MemDisk",
            //   description: "myworkspace",
            //   href: "/workspace/" + name,
            //   createdAt: new Date(),
            //   providerAuthId: 0,
            //   diskGuid: nanoid(),
            // })
          }
        >
          Create
        </Button>
      </div>
    </div>
  );
}
