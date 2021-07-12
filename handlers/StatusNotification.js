import DB from "../db";
import * as StatusNotificationConst from "../ocpp/commands/StatusNotification"; // eslint-disable-line
import moment from "moment";

var Storage = new DB(process.env.storage);

export const StatusNotification = {
  handle: function (client, command) {
    return new Promise(function (resolve, reject) {
      client.info = {
        ...command,
      };

      let stationDetails = {};
      if (client.connection.url.constructor === String && client.connection.url.length) {
        stationDetails.endpoint = client.connection.url;
        stationDetails.chargeBoxIdentity = client.connection.url.split("/").pop();
      }

      let connectorId = parseInt(client.info.connectorId);
      let timestamp = moment().toISOString();

      var notification = {
        station: stationDetails,
        text: "Status Notification Update",
        unread: true,
        type: "StatusNotification",
        timestamp: timestamp,
        status: client.info.status,
        connectorId: connectorId,
        errorCode: client.info.errorCode,
      };

      Storage.findOne(
        "station",
        {
          chargeBoxIdentity: stationDetails.chargeBoxIdentity,
        },
        function (error, station) {
          if (error) {
            reject(new Error("Couldn't find the Chargepoint"));
          } else {
            if (station) {
              station = station.toObject();
              if (station.hasOwnProperty("connectors") && station.connectors.length) {
                let foundConnector = station.connectors.filter(function (el) {
                  return el.connectorId === connectorId;
                });
                if (!foundConnector.length) {
                  Storage.findOneAndUpdate(
                    "station",
                    {
                      chargeBoxIdentity: station.chargeBoxIdentity,
                    },
                    {
                      $push: {
                        connectors: {
                          connectorId: connectorId,
                          status: client.info.status,
                          errorCode: client.info.errorCode,
                          consumption: 0,
                          soc: 0,
                          connectorType: `Connector ${connectorId}`,
                          timestamp: timestamp,
                        },
                      },
                    }
                  )
                    .then(function (station) {
                      Storage.save("notification", notification, function (err, data) {
                        if (err) {
                          reject(err);
                        } else {
                          resolve({});
                        }
                      });
                    })
                    .catch(function (err) {
                      reject(err);
                    });
                } else {
                  station.connectors.forEach(function (el, i) {
                    if (el.connectorId === connectorId) {
                      el.status = client.info.status;
                      el.errorCode = client.info.errorCode;
                    }
                  });

                  Storage.findOneAndUpdate(
                    "station",
                    {
                      chargeBoxIdentity: station.chargeBoxIdentity,
                    },
                    {
                      $set: { connectors: station.connectors },
                    }
                  )
                    .then(function (station) {
                      Storage.save("notification", notification, function (err, data) {
                        if (err) {
                          reject(err);
                        } else {
                          resolve({});
                        }
                      });
                    })
                    .catch(function (err) {
                      reject(err);
                    });
                }

                (function () {
                  try {
                    Storage.findOne(
                      "transaction",
                      {
                        chargeBoxIdentity: stationDetails.chargeBoxIdentity,
                        connectorId: connectorId,
                        meterStop: { $exists: false },
                      },
                      async function (err, data) {
                        if (err) {
                          console.log(err);
                        } else {
                          if (data) {
                            data = data.toObject();
                            if (data && data.hasOwnProperty("userId") && data.userId) {
                              let connectorStatus = client.info.status.toLowerCase();
                              if (connectorStatus !== "available") {
                                try {
                                  await Storage.findOneAndUpdate(
                                    "users",
                                    {
                                      _id: data.userId,
                                    },
                                    {
                                      $set: {
                                        "stateData.session_state": connectorStatus,
                                      },
                                    }
                                  );
                                } catch (error) {
                                  console.log(error);
                                }
                              }
                              /** Set to 0 if charger connector becomes available */
                              if (connectorStatus == "available") {
                                await Storage.findOneAndUpdate(
                                  "station",
                                  {
                                    chargeBoxIdentity: stationDetails.chargeBoxIdentity,
                                    "connectors.connectorId": parseInt(connectorId),
                                  },
                                  {
                                    $set: { "connectors.$.soc": 0 },
                                  }
                                );
                              }
                            }
                          }
                        }
                      }
                    );
                  } catch (e) {
                    console.log(e.message);
                  }
                })();
              } else {
                reject(new Error("No connectors found"));
              }
            } else {
              reject(new Error("No station found"));
            }
          }
        }
      );
    });
  },
};
