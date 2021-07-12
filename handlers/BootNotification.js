import moment from "moment";
import DB from "../db";
import * as BootNotificationConst from "../ocpp/commands/BootNotification";

var Storage = new DB(process.env.storage);
var Interval = parseInt(process.env.HEARTBEAT_INTERVAL);

export const BootNotification = {
  handle: function (client, command) {
    return new Promise(function (resolve, reject) {
      client.info = {
        connectors: [],
        metadata: { ...command },
      };

      if (client.connection.url.constructor === String && client.connection.url.length) {
        client.info.chargeBoxIdentity = client.connection.url.split("/").pop();
      }

      var message = client.info.chargeBoxIdentity + " has just started";

      var notification = {
        text: message,
        unread: true,
        type: "BootNotification",
        timestamp: new Date().toISOString(),
      };

      Storage.findOneAndUpdate(
        "station",
        {
          chargeBoxIdentity: client.info.chargeBoxIdentity,
        },
        {
          $set: {
            stationStatus: "Online",
            timestamp: moment().toISOString(),
          },
        }
      )
        .then(function (station) {
          if (station) {
            Storage.save("notification", notification, function (err) {
              if (err) {
                reject({
                  // eslint-disable-line
                  status: BootNotificationConst.STATUS_REJECTED,
                  currentTime: new Date().toISOString(),
                  interval: Interval,
                });
              } else {
                resolve({
                  status: BootNotificationConst.STATUS_ACCEPTED,
                  currentTime: new Date().toISOString(),
                  interval: Interval,
                });
              }
            });
          } else {
            client.info.connectors = [
              {
                connectorId: 0,
                status: "Available",
                errorCode: "NoError",
                consumption: 0,
                connectorType: "Controller",
                timestamp: new Date().toISOString(),
              },
            ];
            client.info.stationName = client.info.chargeBoxIdentity + "_" + command.chargePointVendor;

            Storage.save("station", client.info, function (err) {
              if (err) {
                reject({
                  // eslint-disable-line
                  status: BootNotificationConst.STATUS_REJECTED,
                  currentTime: new Date().toISOString(),
                  interval: Interval,
                });
              } else {
                Storage.save("notification", notification, function (err) {
                  if (err) {
                    resolve({
                      status: BootNotificationConst.STATUS_ACCEPTED,
                      currentTime: new Date().toISOString(),
                      interval: Interval,
                    });
                  } else {
                    resolve({
                      status: BootNotificationConst.STATUS_ACCEPTED,
                      currentTime: new Date().toISOString(),
                      interval: Interval,
                    });
                  }
                });

                // Return Reponse
                // status can be Rejected or Accepted
                resolve({
                  status: BootNotificationConst.STATUS_ACCEPTED,
                  currentTime: new Date().toISOString(),
                  interval: Interval,
                });
              }
            });
          }
        })
        .catch(function (err) {
          // eslint-disable-line
          reject({
            // eslint-disable-line
            status: BootNotificationConst.STATUS_REJECTED,
            currentTime: new Date().toISOString(),
            interval: Interval,
          });
        });
    });
  },
};
