import DB from '../db';
import * as FirmwareStatusNotificationConst from '../ocpp/commands/FirmwareStatusNotification';
import moment from 'moment';

var Storage = new DB(process.env.storage)

export const FirmwareStatusNotification = {
  handle: function (client, command) {
    return new Promise(function (resolve, reject) {
      if (client.connection.url.constructor === String && client.connection.url.length) {
        var chargeBoxIdentity = client.connection.url.split('/').pop()
      }
      let data = {
        station: { chargeBoxIdentity: chargeBoxIdentity },
        unread: true,
        type: 'FirmwareStatusNotification',
        timestamp: moment().toISOString()
      }

      Storage.save('notification', data, function () {
        resolve({})
      })
    })
  }
}
