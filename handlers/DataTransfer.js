import * as DataTransferConst from "../ocpp/commands/DataTransfer";
import moment from "moment";
import DB from "../db";
import { ChargePoint, OCPPCommands } from "../ocpp";

var Storage = new DB(process.env.storage);

export const DataTransfer = {
  handle: function (client, command) {
    return new Promise(function (resolve, reject) {
      if (client.connection.url.constructor === String && client.connection.url.length) {
        var chargeBoxIdentity = client.connection.url.split("/").pop();
      }

      const regex = /^VIN.*/g;
      const found = command.messageId.match(regex);
      if (found.length) {
        console.log("VIN : ", command.data);
        //JSON.parse(command.data);
        /* Storage.findWhere(
          "reservation",
          {
            chargeBoxIdentity: chargeBoxIdentity,
            status: "transacting",
            VIN: command.data
          }).then((reservations) => {
            if (reservations) {
              console.log(reservations)
              resolve({
                status: DataTransferConst.STATUS_ACCEPTED,
                data: `${command.vendorId}|ALLOWED`,
              });
            } else {
              resolve({
                status: DataTransferConst.STATUS_ACCEPTED,
                data: `${command.vendorId}|ALLOWED`,
              });
            }
          }).catch((err) => {
            resolve({
              status: AuthorizeConst.STATUS_REJECTED,
              data: "",
            });
          }); */
      }
      resolve({
        status: DataTransferConst.STATUS_ACCEPTED,
        data: `${command.vendorId}|ALLOWED`,
      });
    });
  },
};
