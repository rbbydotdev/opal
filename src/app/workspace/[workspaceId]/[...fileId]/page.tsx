"use client";
// import * as None from "@/components/Editor/InitializedMDXEditor";
import { WorkspaceLiveEditor } from "@/components/WorkspaceLiveEditor";
import { ImgSw } from "@/lib/ImagesServiceWorker/ImgSwSetup";
// if (None) {
// }

export default function Page() {
  return (
    <div>
      <ImgSw>
        <WorkspaceLiveEditor />
      </ImgSw>
    </div>
  );
}
