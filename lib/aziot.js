// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
require('dotenv').config()

var Protocol = require('azure-iot-device-mqtt').Mqtt;
var Client = require('azure-iot-device').Client;
var Message = require('azure-iot-device').Message;

// String containing Hostname, Device Id & Device Key in the following formats:
//  "HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"
var connectionString = process.env.cs;

// fromConnectionString must specify a transport constructor, coming from any transport package.
var client = Client.fromConnectionString(connectionString, Protocol);
const sendTelemetry = (payload) => {
    let message = new Message(JSON.stringify(payload));
    client.sendEvent(message, function (err) {
        if (err) {
            console.error('Could not send: ' + err.toString());
            process.exit(-1);
        } else {
            console.log('message sent')
        }
    });
};

var start = () => {
    client.open(function (err) {
        if (err) {
            console.error('Could not connect: ' + err.message);
        } else {
            console.log('connected to iot hub');
        };
    });
}

module.exports.start = start
module.exports.sendTelemetry = sendTelemetry