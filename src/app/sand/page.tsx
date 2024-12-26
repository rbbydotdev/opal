// const IdxFun = dynamic(() => import("@/app/sand/IdxFun"), {
//   ssr: false,

import IdxFun from "@/app/sand/IdxFun";

// });
export default async function Page() {
  return (
    <div className="w-full h-full">
      <IdxFun />
    </div>
  );
}
