// import { ClientComponent } from "@/app/sandbox/ClientComponent";
"use client";

// const ClientComponent = dynamic(import("@/app/sandbox/ClientComponent"), {
// ssr: false,
// });
export default function Page() {
  return (
    <div className="flex justify-center items-center w-full">
      <div className="border-2 bg-green-700 w-96 h-96 flex flex-col">
        <div className="bg-red-700 h-32 w-32 flex-1"></div>
        <div className="bg-blue-700 h-32 w-32 flex-1">
          <div className="h-full">
            <div className="h-full  border-orange-700 border-2 ">
              <div className="bg-white border-black border-2 w-12 h-12"></div>
              <div className="bg-white border-black border-2 w-12 h-12"></div>
              <div className="bg-white border-black border-2 w-12 h-12"></div>
              <div className="bg-white border-black border-2 w-12 h-12"></div>
              <div className="bg-white border-black border-2 w-12 h-12"></div>
              <div className="bg-white border-black border-2 w-12 h-12"></div>
              <div className="bg-white border-black border-2 w-12 h-12"></div>
              <div className="bg-white border-black border-2 w-12 h-12"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
