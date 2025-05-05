"use client";
import { ClientOnly } from "@/components/ClientOnly";
// import * as None from "@/components/Editor/InitializedMDXEditor";
import { WorkspaceLiveEditor } from "@/components/WorkspaceLiveEditor";
import { ImgSw } from "@/lib/ImagesServiceWorker/ImgSwSetup";
// if (None) {
// }

export default function Page() {
  return (
    <>
      <ClientOnly>
        <ImgSw />
      </ClientOnly>
      <ClientOnly>
        <WorkspaceLiveEditor />
      </ClientOnly>
    </>
  );
}
