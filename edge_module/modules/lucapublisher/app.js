'use strict';

const opcua = require('node-opcua');
const pn = require('./config/pn.json')
var Transport = require('azure-iot-device-mqtt').Mqtt;
var Client = require('azure-iot-device').ModuleClient;
var Message = require('azure-iot-device').Message;

const opcua_client = new opcua.OPCUAClient();
//const server = process.env.SERVER;
const endpointUrl = "opc.tcp://ekskog.net:4334/HBVUattic";
console.log('... trying to connect to server at: ' + endpointUrl)
var edge_client, the_session, the_subscription;

const monitor_nid = (m, nid) => {
  m.on('changed', function (dataValue) {

    console.log('value received for NodeId: ' + nid)

    let payload = {
      "nodeId": nid,
      "value": dataValue.value.value,
      deviceTimestamp: dataValue.sourceTimestamp,
      edgeTimeStamp: new Date()
    }
    var outputMsg = new Message(JSON.stringify(payload));
    edge_client.sendOutputEvent('output1', outputMsg, printResultFor('Forwarding OPC UA message'));
  })
}

const subscribe = () => {
  console.log('Start to create the subscription')

  the_subscription = new opcua.ClientSubscription(the_session, {
    requestedPublishingInterval: 10000,
    requestedLifetimeCount: 10,
    requestedMaxKeepAliveCount: 2,
    maxNotificationsPerPublish: 10,
    publishingEnabled: true,
    priority: 10,
  });

  the_subscription
    .on('started', function () {
      console.log('subscription started - subscriptionId: ', the_subscription.subscriptionId);
    })
    .on('keepalive', function () {
      console.log('keepalive');
    })
    .on('terminated', function () {});

    for (var i = 0; i < pn.OpcNodes.length; i++) {
      var nid = pn.OpcNodes[i].Id
      var m = the_subscription.monitor({
          nodeId: opcua.resolveNodeId(nid),
          attributeId: opcua.AttributeIds.Value,
        }, {
          samplingInterval: pn.OpcNodes[i].OpcSamplingInterval,
          discardOldest: true,
          queueSize: 1,
        },
        opcua.read_service.TimestampsToReturn.Both
      );
      monitor_nid(m, nid)
    }
    console.log('# Subscribing to Values From')
    console.table(pn.OpcNodes)
    console.log('-------------------------------------');
}

opcua_client.connect(endpointUrl, function (err) {
  if (err) {
    console.log(' cannot connect to endpoint :', endpointUrl);
  } else {
    console.log('connected !');
    opcua_client.createSession(function (err, session) {
      if (!err) {
        the_session = session;
        console.log('created session !');
        subscribe();
      } else {
        console.log(err)
      }
    });
  }
});

Client.fromEnvironment(Transport, function (err, client) {
  edge_client = client
  if (err) {
    throw err;
  } else {
    edge_client.on('error', function (err) {
      throw err;
    });

    // connect to the Edge instance
    edge_client.open(function (err) {
      if (err) {
        throw err;
      } else {
        console.log('IoT Hub module client initialized');

        // Act on input messages to the module.
        edge_client.on('inputMessage', function (inputName, msg) {
          pipeMessage(edge_client, inputName, msg);
        });
      }
    });
  }
});

// This function just pipes the messages without any change.
function pipeMessage(edge_client, inputName, msg) {
  edge_client.complete(msg, printResultFor('Receiving message'));

  if (inputName === 'input1') {
    var message = msg.getBytes().toString('utf8');
    if (message) {
      var outputMsg = new Message(message);
      edge_client.sendOutputEvent('output1', outputMsg, printResultFor('Sending received message'));
    }
  }
}

// Helper function to print results in the console
function printResultFor(op) {
  return function printResult(err, res) {
    if (err) {
      console.log(op + ' error: ' + err.toString());
    }
    if (res) {
      console.log(op + ' status: ' + res.constructor.name);
      console.log('------------------------------------------------------------');
    }
  };
}