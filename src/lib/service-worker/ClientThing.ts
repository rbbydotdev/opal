// SWAppType;

import { SWAppType } from "@/lib/service-worker/sw-hono";
import { hc } from "hono/client";

function main() {
  const client = hc<SWAppType>("/");
}
