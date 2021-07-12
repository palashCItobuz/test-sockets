import DB from '../db'
import * as StartTransactionConst from '../ocpp/commands/StartTransaction'
import moment from 'moment' // eslint-disable-lines

var Storage = new DB(process.env.storage)

let transaction = 0
export const StartTransaction = {
  handle: function (client, command) {
    transaction = transaction + 1
    return new Promise(function (resolve, reject) {
      var start = true
      var response = {}
      var transactionId = 0
      if (client.connection.url.constructor === String && client.connection.url.length) {
        command.chargeBoxIdentity = client.connection.url.split('/').pop()
      }
      
      Storage.findAll('transaction', false, async function (err, transactions) {
        if (err) {
          reject(err)
        }

        /* if (transactions.length > 0) {
          transactionId = transactions.length + 1
        } else {
          transactionId = 1
        } */
        transactionId = Date.now();

        let userTransaction = transactions.find(function (transaction) {
          return transaction.idTag === command.idTag && transaction.reservationId == command.reservationId
        })
        if (userTransaction) start = false

        // TODO: to bec checked, start transaction are often sent? [Issue #23]
        /* for (transaction in userTransaction) {
          if (transaction.status === "Accepted") {
            // Still Charging
            start = false;
          }
        } */

        if (start) {
          response = {
            transactionId: parseInt(transactionId),
            idTagInfo: {
              status: StartTransactionConst.STATUS_ACCEPTED
            }
          }
        } else {
          response = {
            transactionId: parseInt(transactionId),
            idTagInfo: {
              status: StartTransactionConst.STATUS_CONCURRENTTX,
              expiryDate: moment().toISOString()
            }
          }
        }

        command.transactionId = transactionId

        try {
          var reservation = await Storage.findOneAndUpdate(
            'reservation',
            {
              reservationId: command.reservationId
            },
            {
              status: 'transacting'
            }
          )
          if(reservation) {
            reservation = reservation.toObject()
            command.userId = reservation.userId
          }
        } catch (e) {
          start = false
          console.log(e)
        }

        console.log('Reservation >', command.reservationId, reservation)

        // save transaction
        if (start) {
          Storage.save('transaction', command, async function (err, data) {
            if (err) {
              reject(err)
            }

            if (reservation && reservation.hasOwnProperty('userId') && reservation.userId) {
              try {
                await Storage.findOneAndUpdate(
                  'users',
                  {
                    _id: reservation.userId
                  },
                  {
                    $set: {
                      'stateData.transactionId': parseInt(transactionId),
                      'stateData.meter_value': command.meterStart,
                      'stateData.session_state': 'transaction'
                    }
                  }
                )
              } catch (e) {
                console.log(e.message)
              }
            }
            resolve(response)
          })
        } else {
          resolve(response)
        }
      })

      /* resolve({
        idTagInfo: {
          status: 'Accepted'
        },
        transactionId: transaction
      }) */
    })
  }
}
