"use client";
import { WorkspaceLiveEditor } from "@/components/WorkspaceLiveEditor";
import { ImgSw } from "@/lib/ImagesServiceWorker/ImgSw";

export default function Page() {
  return (
    <>
      <ImgSw />
      <WorkspaceLiveEditor />
    </>
  );
}
