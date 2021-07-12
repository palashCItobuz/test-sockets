import { BootNotification } from "./BootNotification";
import { Heartbeat } from "./Heartbeat";
import { Authorize } from "./Authorize";
import { MeterValues } from "./MeterValues";
import { StartTransaction } from "./StartTransaction";
import { StopTransaction } from "./StopTransaction";
import { StatusNotification } from "./StatusNotification";
import { DataTransfer } from "./DataTransfer";
import { DiagnosticsStatusNotification } from "./DiagnosticsStatusNotification";
import { FirmwareStatusNotification } from "./FirmwareStatusNotification";

export const handlers = {
  BootNotification,
  Heartbeat,
  Authorize,
  MeterValues,
  StartTransaction,
  StopTransaction,
  StatusNotification,
  DataTransfer,
  DiagnosticsStatusNotification,
  FirmwareStatusNotification,
};
