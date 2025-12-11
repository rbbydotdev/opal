import { useCallback, useState } from "react";

export interface BuildLog {
  timestamp: number;
  message: string;
  type: "info" | "error";
}
