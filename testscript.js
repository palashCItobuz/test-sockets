const express = require('express')
const http = require('http')
const moment = require("moment")
import debugFn from "debug"
const WebSocket = require('websocket')
const WebSocketServer = WebSocket.server
const { DEBUG_LIBNAME, CALL_MESSAGE, CALLRESULT_MESSAGE, CALLERROR_MESSAGE, SOCKET_TIMEOUT } = require("./constants")
const _debug = debugFn(DEBUG_LIBNAME)

const app = express()
app.use(express.urlencoded({ extended: false }))
app.use(express.text({ type: 'text/plain' }))
const server = http.createServer(app)
const port = 9220
let clients = []

const debug = function (...logMessage) {
    console.log(logMessage);
    _debug(logMessage);
};


let wss = new WebSocketServer({
    httpServer: server,
    keepalive: true,
    keepaliveInterval: 6000,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});

wss.on('request', (req) => {
    let cpid, ip
    var connection = req.accept('ocpp1.6', req.origin)
    console.log((new Date()) + ' Connection accepted.');

    if (req) {
        cpid = req && req.resourceURL ? req.resourceURL.path.split('/').pop() : req.resourceURL.path
        ip = req && (req.remoteAddress || req.headers["x-forwarded-for"])
        debug(`New connection from "${ip}", protocol "ocpp1.6", CPID "${cpid}"`)
    } else {
        url = "SERVER";
        debug(`New connection to server`);
    }

    connection.on('message', function (message) {
        onMessage(message, cpid, connection)
    })

    connection.on('close', function (reasonCode, description) {
        const index = clients.find((element) => {
            element.cpid == cpid
        })
        console.log("-------", clients[index], index)
        clients.splice(index, 1)
        debug(clients)
        console.log(`Peer "${ip}" disconnected.`, reasonCode, description)
    })

    connection.on("error", (err) => {
        console.info(err, connection.readyState)
    })

    clients.push({ connection: connection, cpid, ip })
    debug(clients)
    connection.send('Hello! Message From Server!')
})

const onMessage = async function (message, url, connection) {
    let messageType, messageId, commandNameOrPayload, commandPayload, errorDetails;

    let respose;
    try {
        [messageType, messageId, commandNameOrPayload, commandPayload, errorDetails] = JSON.parse(message.utf8Data);
    } catch (err) {
        throw new Error(`Failed to parse message: "${message}", ${err.message}`);
    }

    console.log("..>>", message.utf8Data)

    switch (messageType) {
        case 2:
            switch (commandNameOrPayload) {
                case 'BootNotification':
                    respose = '[3,"' + messageId + '",{"status":"Accepted","currentTime":"' + new Date().toISOString() + '","interval":300}]';
                    break;

                case 'Heartbeat':
                    respose = '[3,"' + messageId + '",{"currentTime":"' + new Date().toISOString() + '"}]';
                    break;

                case 'StatusNotification':
                    respose = '[3,"' + messageId + '",{}]';
                    break;

                case 'MeterValues':
                    respose = '[3,"' + messageId + '",{}]';
                    break;

                case 'DiagnosticsStatusNotification':
                    respose = '[3,"' + messageId + '",{}]';
                    break;

                case 'FirmwareStatusNotification':
                    respose = '[3,"' + messageId + '",{}]';
                    break;

                case 'Authorize':
                    respose = '[3,"' + messageId + '", {"idTagInfo":{"status":"Accepted", "expiryDate":"' + moment().add(1, "months").toISOString() + '"}}]';
                    break;

                case 'StartTransaction':
                    respose = '[3,"' + messageId + '", {"idTagInfo":{"status":"Accepted", "expiryDate":"' + moment().add(1, "months").toISOString() + '"}, "transactionId":1}]';
                    break;

                case 'StopTransaction':
                    respose = '[3,"' + messageId + '", {"idTagInfo":{"status":"Accepted", "expiryDate":"' + moment().add(1, "months").toISOString() + '"}}]';
                    break;

                case 'DataTransfer':
                    respose = '[3,"' + messageId + '", {"status":"Accepted"}]';
                    break;
            }
            console.log(url, "<<", respose)
            connection.send(respose)
            break;

        case 3:
            console.log(url, ">>", commandNameOrPayload, commandPayload)
            break;

        case 4:
            console.log(url, ">>", commandNameOrPayload, commandPayload)
            break;

        default:
            console.log(`Wrong message type ${messageType}`)
            throw new Error(`Wrong message type ${messageType}`)
    }
}

app.post('/send-command/:cpid', (req, res) => {
    let cpid = req.params.cpid
    let message = req.body

    let client = clients.find(client => {
        console.log(client.cpid == cpid)
        return client.cpid == cpid
    })

    if (client && (client.connection.readyState === WebSocket.OPEN)) {
        console.log("<<.", message)
        client.connection.sendUTF(message);
        return res.send({ status: 200, message: "sent message" });
    }
    return res.send({ status: 200, message: "not sent" })
})

server.listen(port, () => console.log(`http server is listening on http://localhost:${port}`))
