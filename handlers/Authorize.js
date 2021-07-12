import * as AuthorizeConst from "../ocpp/commands/Authorize";
import moment from "moment";
import DB from "../db";

var Storage = new DB(process.env.storage);

export const Authorize = {
  handle: function (client, command) {
    return new Promise(async (resolve, reject) => {
      if (client.connection.url.constructor === String && client.connection.url.length) {
        var chargeBoxIdentity = client.connection.url.split("/").pop();
      }
      let { idTag } = command 
      if(idTag.length == 6) {
        let station = await Storage.findOnePromise('station', { chargeBoxIdentity })
        //console.log(station)
        resolve({
          idTagInfo: {
            status: AuthorizeConst.STATUS_ACCEPTED,
            expiryDate: moment().subtract(1, "months").toISOString()
          },
        })
      } else {
        try {
          let reservation = await Storage.findOnePromise("reservation", { chargeBoxIdentity: chargeBoxIdentity, idTag: idTag, status: "claimed" })
          if (reservation) {
            try {
              await Storage.findOneAndUpdate(
                "reservation",
                {
                  _id: reservation._id,
                },
                {
                  status: "authorized",
                }
              )
              resolve({
                idTagInfo: {
                  status: AuthorizeConst.STATUS_ACCEPTED,
                  expiryDate: moment().add(1, "months").toISOString(),
                },
              })
            } catch (error) {
              resolve({
                idTagInfo: {
                  status: AuthorizeConst.STATUS_INVALID,
                  expiryDate: moment().add(1, "months").toISOString()
                },
              })
            }
          } else {
            resolve({
              idTagInfo: {
                status: AuthorizeConst.STATUS_INVALID,
                expiryDate: moment().subtract(1, "months").toISOString()
              },
            })
          }
        } catch (err) {
          resolve({
            idTagInfo: {
              status: AuthorizeConst.STATUS_INVALID,
              expiryDate: moment().subtract(1, "months").toISOString()
            },
          })
        }
      }    
    })
  },
}
