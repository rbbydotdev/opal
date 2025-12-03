import { transferHandlers } from "comlink";
import { asyncGeneratorTransferHandler } from "comlink-async-generator";
// This function is called to ensure the transfer handlers are registered
transferHandlers.set("asyncGenerator", asyncGeneratorTransferHandler);
