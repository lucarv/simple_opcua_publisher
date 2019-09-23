/*global require,console,setTimeout */
require('dotenv').config()
const aziot = require('./lib/aziot')
const opcua = require('node-opcua');
const async = require('async');
const pn = require('./pn.json')
console.table(pn.OpcNodes)
const client = new opcua.OPCUAClient();
console.log('... trying to connect to server at: ' + pn.EndpointUrl)
var the_session, the_subscription;

const monitor_nid = (m, nid) => {
	m.on('changed', function (dataValue) {
		let payload = {
			"nodeId": nid,
			"value": dataValue.value.value,
			deviceTimestamp: dataValue.sourceTimestamp,
			edgeTimeStamp: new Date()
		  }
		  aziot.sendTelemetry(payload)
	})
}
async.series(
	[
		// step 1 : connect to
		function (callback) {
			client.connect(
				pn.EndpointUrl,
				function (err) {
					if (err) {
						console.log(' cannot connect to endpoint :', endpointUrl);
					} else {
						console.log('connected !');
					}
					callback(err);
				}
			);
		},

		// step 2 : createSession
		function (callback) {
			client.createSession(function (err, session) {
				if (!err) {
					the_session = session;
				}
				callback(err);
			});
		},

		// step 3 : browse
		function (callback) {
			the_session.browse('RootFolder', function (err, browseResult) {
				if (!err) {
					console.log("Root Folder Structure")

					browseResult.references.forEach(function (reference) {
						console.log(reference.browseName.toString());
					});
				}
				callback(err);
			});
		},


		// step 5: install a subscription and install a monitored item for 10 seconds
		function (callback) {
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
					console.log(
						'subscription started - subscriptionId: ',
						the_subscription.subscriptionId
					);
					aziot.start()
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

			console.log('-------------------------------------');
		},

		// close session
		function (callback) {
			the_session.close(function (err) {
				if (err) {
					console.log('session closed failed ?');
				}
				callback();
			});
		},
	],
	function (err) {
		if (err) {
			console.log(' failure ', err);
		} else {
			console.log('done!');
		}
		client.disconnect(function () {});
	}
);