import { Loader } from "lucide-react";

export const LoadingPanel = () => (
  <div className="flex justify-center items-center">
    <div>
      <Loader size={96} className="animate-spin" />
    </div>
  </div>
);
