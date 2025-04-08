// import { ClientComponent } from "@/app/sandbox/ClientComponent";
"use client";

// const ClientComponent = dynamic(import("@/app/sandbox/ClientComponent"), {
// ssr: false,
// });
export default function Page() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold">Sandbox</h1>
      <p className="mt-4 text-lg">This is a sandbox page.</p>
      {/* <ClientComponent /> */}
    </div>
  );
}
