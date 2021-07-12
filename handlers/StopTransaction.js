import uuid from "uuid/v4";
import DB from "../db";
import moment from "moment"; // eslint-disable-lines
import * as StopTransactionConst from "../ocpp/commands/StartTransaction";
var Storage = new DB(process.env.storage);

export const StopTransaction = {
  handle: function (client, command) {
    if (client.connection.url.constructor === String && client.connection.url.length) {
      let chargeBoxIdentity = client.connection.url.split("/").pop();
      return new Promise(function (resolve, reject) {
        Storage.findOne(
          "station",
          {
            chargeBoxIdentity: chargeBoxIdentity,
          },
          (err, station) => {
            if (err) {
              console.log(err);
            } else {
              if (station) {
                station = station.toObject();
                Storage.findOne("transaction", { transactionId: command.transactionId }, async function (err, transactions) {
                  if (err) {
                    console.log(err);
                  }
                  if (transactions) {
                    transactions = transactions.toObject();
                    var response = {};
                    var transaction = transactions[0];
                    var meterStop = 0;

                    if (transaction) {
                      response = {
                        idTagInfo: {
                          status: StopTransactionConst.STATUS_EXPIRED,
                          expiryDate: moment().toISOString(),
                        },
                      };
                      if (transaction.status === "Accepted") {
                        response = {
                          idTagInfo: {
                            status: StopTransactionConst.STATUS_EXPIRED,
                            expiryDate: moment().toISOString(),
                          },
                        };
                      } else {
                        response = {
                          idTagInfo: {
                            status: StopTransactionConst.STATUS_EXPIRED,
                            expiryDate: moment().toISOString(),
                          },
                        };
                      }
                    } else {
                      response = {
                        idTagInfo: {
                          status: StopTransactionConst.STATUS_EXPIRED,
                          expiryDate: moment().toISOString(),
                        },
                      };
                    }

                    await Storage.findOneAndUpdate("reservation", { reservationId: transactions.reservationId }, { status: "finished" });

                    // store transaction details
                    Storage.findOneAndUpdate(
                      "transaction",
                      { transactionId: command.transactionId },
                      { meterStop: command.meterStop, reason: command.reason, finishTimestamp: command.timestamp }
                    )
                      .then(async (savedTx) => {
                        savedTx = savedTx.toObject();
                        console.log(savedTx, station);
                        if (savedTx && savedTx.userId) {
                          meterStop = command.meterStop;
                          const meterDiff = meterStop - savedTx.meterStart;
                          const price = meterDiff * Number(station.unitPrice);
                          const tax = (price * Number(station.taxRate)) / 100;
                          const duty = (price * Number(station.dutyRate)) / 100;
                          const finalPrice = +(price + tax + duty).toFixed(2);
                          const invoice = {
                            dueDate: moment().toISOString(),
                            balance: 0,
                            invoiceId: uuid(),
                            status: "Due",
                            description: "New invoice for the customer",
                            amount: price,
                            taxAmt: tax,
                            dutyAmt: duty,
                            userId: savedTx.userId,
                            transactionId: command.transactionId,
                            totalAmt: finalPrice,
                          };

                          try {
                            await Storage.findOneAndUpdate(
                              "users",
                              {
                                _id: savedTx.userId,
                              },
                              {
                                $set: {
                                  "stateData.session_state": "finished",
                                },
                              }
                            );
                          } catch (error) {
                            console.log(error);
                          }

                          Storage.save("invoice", invoice, function (err) {
                            if (err) {
                              resolve({
                                idTagInfo: {
                                  status: StopTransactionConst.STATUS_EXPIRED,
                                  expiryDate: moment().toISOString(),
                                },
                              });
                            } else {
                              resolve({
                                idTagInfo: {
                                  status: StopTransactionConst.STATUS_ACCEPTED,
                                  expiryDate: moment().toISOString(),
                                },
                              });
                            }
                          });
                        } else {
                          resolve({
                            idTagInfo: {
                              status: StopTransactionConst.STATUS_ACCEPTED,
                              expiryDate: moment().toISOString(),
                            },
                          });
                        }
                      })
                      .catch(function (err) {
                        resolve({
                          idTagInfo: {
                            status: StopTransactionConst.STATUS_EXPIRED,
                            expiryDate: moment().toISOString(),
                          },
                        });
                      });
                  } else {
                    response = {
                      idTagInfo: {
                        status: StopTransactionConst.STATUS_EXPIRED,
                        expiryDate: moment().toISOString(),
                      },
                    };
                    resolve(response);
                  }
                });
              }
            }
          }
        );
      });
    }
  },
};
