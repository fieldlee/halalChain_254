/**
 * Copyright 2017 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an 'AS IS' BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
let fs = require('fs');
let path = require('path');

let helper = require('./helper.js');
let logger = helper.getLogger('Create-Channel');
//Attempt to send a request to the orderer with the sendTransaction method
let createChannel = async function (orderer, channelName, channelConfigPath, username, orgName) {
    console.log("======1=======");
    logger.debug('\n====== Creating Channel \'' + channelName + '\' ======\n');
    try {
        console.log("======2=======");
        // first setup the client for this org
        let client = await helper.getClientForOrg(orgName);
        logger.debug('Successfully got the fabric client for the organization "%s"', orgName);

        // read in the envelope for the channel config raw bytes
        let envelope = fs.readFileSync(path.join(__dirname, channelConfigPath));
        // extract the channel config bytes from the envelope to be signed
        let channelConfig = client.extractChannelConfig(envelope);
        console.log("======3=======");
        //Acting as a client in the given organization provided with "orgName" param
        // sign the channel config bytes as "endorsement", this is required by
        // the orderer's channel creation policy
        // this will use the admin identity assigned to the client when the connection profile was loaded
        let signature = client.signChannelConfig(channelConfig);
        console.log("======4=======");
        let request = {
            config: channelConfig,
            signatures: [signature],
            name: channelName,
            txId: client.newTransactionID(true) // get an admin based transactionID
        };
        console.log("======5=======");
        if (orderer) {
            request.orderer = orderer;
        }

        // send to orderer
        let response = await client.createChannel(request);
        console.log("======6=======");
        logger.debug(' response ::%j', response);
        if (response && response.status === 'SUCCESS') {
            logger.debug('Successfully created the channel.');
            return {
                success: true,
                message: 'Channel \'' + channelName + '\' created Successfully',
                timestamp: Date.now()
            };
        } else {
            logger.error('\n!!!!!!!!! Failed to create the channel \'' + channelName +
                '\' !!!!!!!!!\n\n');
            return {
                success: false,
                message: 'Failed to create the channel \'' + channelName + '\'',
                timestamp: Date.now()
            }
        }
    } catch (err) {
        logger.error('Failed to initialize the channel: ' + err.stack ? err.stack : err);
        return {
            success: false,
            message: 'Failed to initialize the channel: ' + err.toString(),
            timestamp: Date.now()
        }
    }
};

exports.createChannel = createChannel;
