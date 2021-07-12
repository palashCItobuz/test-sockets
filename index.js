import express from 'express'
import bodyParser from 'body-parser';
import * as WebSocket from 'ws'
import debugFn from "debug"
import http from 'http';
import path from 'path';
import commands from "./commands"
//import { handlers } from "./handlers";
import { DEBUG_LIBNAME, CALL_MESSAGE, CALLRESULT_MESSAGE, CALLERROR_MESSAGE, SOCKET_TIMEOUT } from "./constants";
import { send } from 'process';
const _debug = debugFn(DEBUG_LIBNAME)

const app = express();
app.use(express.urlencoded({ extended: false }))
app.use(express.text({ type:'text/plain' }))

const port = 9220;
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let clients = []

const debug = function (logMessage) {
  console.log(logMessage);
  _debug(logMessage);
};

const onRequest = async function (client, command) {

  console.log(command)

  //const connection = client.connection;

  //console.info(`-----> New command from ${connection.url} with IP ${connection.ip}`);

  function findCommand(command) {
    let cmd;
    for (const method in commands) {
      if (command instanceof commands[method]) {
        cmd = method;
      }
    }
    return cmd;
  }

  let cmd = findCommand(command);
  if (cmd && Object.keys(handlers).includes(cmd)) {
    try {
      return await handlers[cmd].handle(client, command);
    } catch (error) {
      throw new OCPPError(ERROR_INTERNALERROR, error);
    }
  } else if (cmd) {
    throw new OCPPError(ERROR_NOTSUPPORTED, "Not Supported");
  } else {
    throw new OCPPError(ERROR_NOTIMPLEMENTED, "Unknown command");
  }
};

const onMessage = async function (message, url, socket) {
  let messageType, messageId, commandNameOrPayload, commandPayload, errorDetails;
  debug(message)
  let respose;
  try {
    [messageType, messageId, commandNameOrPayload, commandPayload, errorDetails] = JSON.parse(message);
  } catch (err) {
    throw new Error(`Failed to parse message: "${message}", ${err.message}`);
  }

  debug(messageType, messageId, commandNameOrPayload, commandPayload, errorDetails)

  switch (messageType) {
    case 2:
      switch (commandNameOrPayload) {
        case 'BootNotification':
          respose = '[3,"'+ messageId +'",{"status":"Accepted","currentTime":"'+ new Date().toISOString() +'","interval":300}]';
          break;

        case 'Heartbeat':
          respose = '[3,"'+ messageId +'",{"currentTime":"'+ new Date().toISOString() +'"}]';
          break;

        case 'StatusNotification':
          respose = '[3,"'+ messageId +'",{}]';
          break;
      }
      debug("<<",respose)
      socket.send(respose)
      break;

    default:
      console.log(`Wrong message type ${messageType}`)
      throw new Error(`Wrong message type ${messageType}`)
  }

}
 
wss.on('connection', (socket, req) => {
  let url, ip
  if (req) {
    url = req && req.url ? req.url.split('/').pop() : req.url
    ip = req && ((req.connection && req.connection.remoteAddress) || req.headers["x-forwarded-for"]);
    debug(`New connection from "${ip}", protocol "${socket.protocol}", url "${url}"`);
  } else {
    url = "SERVER";
    debug(`New connection to server`);
  }

  socket.on("error", (err) => {
    console.info(err, socket.readyState);
  })

  socket.on('message', msg => {
    try{
      onMessage(msg, url, socket)
    } catch (e) {
      debug(e)
    }
  })

  socket.on("close", (err) => {
    const index = clients.indexOf(socket);
    clients.splice(index, 1);
    debug(`Socket closed with error: ${err}`);
    debug(clients.length)
  })

  clients.push({ connection : socket, url, ip });

  debug(clients.length)

  socket.send('Hello! Message From Server!!')
})

app.post('/send-command/:cpid', (req, res) => {
  let cpid = req.params.cpid
  let message = req.body
  console.log(message, clients)
  let client = clients.find(client => {
    console.log(client.url == cpid)
    return client.url == cpid
  })

  if (client && (client.readyState === WebSocket.OPEN)) {
    client.send(`message being sent to ${cpid}`);
    return res.send({ status: 200, message: "sent message" });
  }
  return res.send({ status: 200, message: "not sent" })
});

server.listen(port, () => console.log(`http server is listening on http://localhost:${port}`));