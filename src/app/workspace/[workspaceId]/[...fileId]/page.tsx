"use client";
import { WorkspaceLiveEditor } from "@/components/WorkspaceLiveEditor";
import { ImgSw } from "@/lib/ImagesServiceWorker/ImgSwSetup";

export default function Page() {
  return (
    <>
      <ImgSw>
        <WorkspaceLiveEditor />
      </ImgSw>
    </>
  );
}
