import moment from 'moment'
import DB from '../db'

var Storage = new DB(process.env.storage)

export const Heartbeat = {
  handle: function (client, command) {
    return new Promise(function (resolve, reject) {
      if (client.connection.url.constructor === String && client.connection.url.length) {
        let chargeBoxIdentity = client.connection.url.split('/').pop()

        Storage.findOneAndUpdate('station', {
          'chargeBoxIdentity': chargeBoxIdentity,
          'connectors.connectorId': 0
        }, {
          '$set': {
            // 'connectors.$.status': 'Available',
            'stationStatus': 'Online',
            'timestamp': moment().toISOString()
          }
        }).then(function () {
          resolve({
            'currentTime': moment().toISOString()
          })
        }).catch(function (err) {
          if (err) {
            resolve({
              'currentTime': moment().toISOString()
            })
          }
        })
      }
    })
  }
}
