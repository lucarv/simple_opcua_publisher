# simple OPC UA publisher  

A simple OPC UA publisher that publishes data on Azure IoT Hub.  
Based on the node-opcua [sdk](http://node-opcua.github.io/). 

## simple instructions
1. download/clone
2. npm install
3. create a device on your IoT Hub. Set an envvar name _cs_ with the value of the device's connection string.
4. edit the pn.json according to the opcua server
5. start the client (enter _node client_ at a console)
