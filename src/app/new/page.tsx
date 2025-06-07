"use client";
import { Workspace } from "@/Db/Workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { customAlphabet } from "nanoid";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
const nanoid = customAlphabet("1234567890abcdef", 8);

export default function Page() {
  const router = useRouter();
  useEffect(() => {}, []);
  const [name, setName] = useState("wrk-" + nanoid());
  return (
    <div className="p-6">
      <div>new workspace</div>
      <div className="gap-2 flex">
        <Input placeholder="Workspace Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Button
          onClick={async () => {
            const workspace = await Workspace.CreateNewWithSeedFiles(name);
            router.push(workspace.home());
          }}
        >
          Create
        </Button>
      </div>
    </div>
  );
}
