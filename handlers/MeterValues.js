import DB from '../db'
var Storage = new DB(process.env.storage)

export const MeterValues = {
  handle: function (client, command) {
    return new Promise(function (resolve, reject) {
      var parsed = JSON.parse(JSON.stringify(command), function (k, v) {
        if (k === '$value') {
          this.value = v
        } else {
          return v
        }
      })

      if (client.connection.url.constructor === String && client.connection.url.length) {
        parsed.chargeBoxIdentity = client.connection.url.split('/').pop()
      }

      // Store in Collection MeterValues
      if (command.connectorId > 0) {
      }

      Storage.save('meterValues', parsed, async function (err) {
        if (err) {
          console.log('error: ' + err)
          reject(err)
        } else {
          if (Object.keys(parsed).length && parsed.hasOwnProperty('meterValue') && parsed.meterValue.length) {
            var consumption = 0
            var soc = 0
            if (parsed.hasOwnProperty('transactionId')) {
              try {
                var transaction = await Storage.findOnePromise('transaction', {
                  transactionId: parsed.transactionId
                })
                transaction = transaction.toObject()
              } catch (e) {
                //reject(e)
                resolve({})
              }
              if (transaction) {
                parsed.meterValue.map((meter) => {
                  meter.sampledValue.map((sample) => {
                    if (sample.measurand == 'Energy.Active.Import.Register') {
                      consumption = sample.value - transaction.meterStart
                    }
                    if (sample.measurand == 'SoC') {
                      soc = sample.value
                    }
                  })
                })
              }
            }

            try{
              await Storage.findOneAndUpdate('transaction', { transactionId: transaction.transactionId, startSoC: null }, { $set: { startSoC: soc } })
            } catch (e) {
              reject({})
            }
            try{
              await Storage.findOneAndUpdate('transaction', { transactionId: transaction.transactionId }, { $set: { endSoC: soc } })
            } catch (e) {
              reject({})
            }

            Storage.findOneAndUpdate(
              'station',
              {
                chargeBoxIdentity: parsed.chargeBoxIdentity,
                'connectors.connectorId': parseInt(command.connectorId)
              },
              {
                $set: {
                  'connectors.$.consumption': consumption,
                  'connectors.$.soc': soc
                }
              }
            )
              .then(function (station) {
                resolve({})
              })
              .catch(function (err) {
                if (err) {
                  resolve({})
                }
              })
          }
        }
      })
    })
  }
}
