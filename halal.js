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
'use strict';
let log4js = require('log4js');
let logger = log4js.getLogger('SampleWebApp');
let express = require('express');
let bodyParser = require('body-parser');
let http = require('http');
let util = require('util');
var path = require('path');
let app = express();
let expressJWT = require('express-jwt');
let jwt = require('jsonwebtoken');
let bearerToken = require('express-bearer-token');
let cors = require('cors');

require('./config.js');
let hfc = require('fabric-client');
// some other settings the application might need to know
hfc.addConfigFile(path.join(__dirname, 'config.json'));

let helper = require('./halal/helper.js');
let createChannel = require('./halal/create-channel.js');
let join = require('./halal/join-channel.js');
let install = require('./halal/install-chaincode.js');
let instantiate = require('./halal/instantiate-chaincode.js');
let invoke = require('./halal/invoke-transaction.js');
let query = require('./halal/query.js');
let login = require('./halal/login');
let upgrade = require('./halal/upgrade-chaincode.js');
let blockDB = require('./listener/block-db');
let host = process.env.HOST || hfc.getConfigSetting('host');
let port = process.env.PORT || 4000;

//////////////////////////////////////////////////////////////////////////////
////////////////////////couchdb//////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
const NodeCouchDb = require('node-couchdb');
// node-couchdb instance with default options
const couch = new NodeCouchDb();
// node-couchdb instance with Memcached
const MemcacheNode = require('node-couchdb-plugin-memcached');
const couchWithMemcache = new NodeCouchDb({
    cache: new MemcacheNode
});
// node-couchdb instance talking to external service
const couchExternal = new NodeCouchDb({host: 'localhost',protocol: 'https',port: 5984});
// not admin party
const couchAuth = new NodeCouchDb({auth: {user: 'test',pass: 'test'}});
///////////////////////////////////////////////////////////////////////////////
//////////////////////////////// SET CONFIGURATONS ////////////////////////////
///////////////////////////////////////////////////////////////////////////////
app.options('*', cors());
app.use(cors());
//support parsing of application/json type post data
app.use(bodyParser.json());
//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({
    extended: false
}));
// set secret variable
app.set('secret', '!Grapebaba1');
app.use(expressJWT({
    secret: '!Grapebaba1'
}).unless({
    path: ['/login','/query/channels/mychannel/chaincodes/hlccc']
}));

app.use(bearerToken());

app.use(function (req, res, next) {
    logger.debug(' ------>>>>>> new request for %s', req.originalUrl);
    if (req.originalUrl.indexOf('/login') >= 0 || req.originalUrl.indexOf('/query/channels/mychannel/chaincodes/hlccc') >= 0) {
        return next();
    }
    let token = req.token;
    jwt.verify(token, app.get('secret'), function (err, decoded) {
        if (err) {
            res.send({
                success: false,
                message: 'Failed to authenticate token. Make sure to include the ' +
                'token returned from /users call in the authorization header ' +
                ' as a Bearer token'
            });
            return;
        } else {
            // add the decoded user name and org name to the request object
            // for the downstream code to use
            req.username = decoded.username;
            req.orgname = decoded.orgName;
            logger.debug(util.format('Decoded from JWT token: username - %s, orgname - %s', decoded.username, decoded.orgName));
            return next();
        }
    });
});

///////////////////////////////////////////////////////////////////////////////
//////////////////////////////// START SERVER /////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
var server = http.createServer(app).listen(port, function () {
});
logger.info('****************** SERVER STARTED ************************');
logger.info('***************  http://%s:%s  ******************', host, port);
server.timeout = 240000;

function getErrorMessage(field) {
    var response = {
        success: false,
        message: field + ' field is missing or Invalid in the request'
    };
    return response;
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////// REST ENDPOINTS START HERE ///////////////////////////
///////////////////////////////////////////////////////////////////////////////
// Login user
app.post('/login', async function (req, res) {
    let username = req.body.username;
    let orgName = req.body.orgName;
    let password = req.body.password;
    logger.debug('End point : /login');
    logger.debug('User name : ' + username);
    logger.debug('Org name  : ' + orgName);
    logger.debug('Password  : ' + password);
    if (!username) {
        res.json(getErrorMessage('\'username\''));
        return;
    }
    if (!orgName) {
        res.json(getErrorMessage('\'orgName\''));
        return;
    }
    if (!password) {
        res.json(getErrorMessage('\'password\''));
        return;
    }
    console.log(hfc.getConfigSetting('jwt_expiretime'));
    let exp = Math.floor(Date.now() / 1000) + parseInt(hfc.getConfigSetting('jwt_expiretime'));
    let token = jwt.sign({
        exp: exp,
        username: username,
        orgName: orgName
    }, app.get('secret'));
    let response = await login.login(username, orgName, password);
    logger.debug('Successfully returned from logon the username %s for organization %s', username, orgName);
    if (response && response.success) {
        response.token = token;
        response.exp = exp;
    }
    res.send(response);
});

//Query for Channel instantiated chaincodes
app.post('/query/channels/:channelName/chaincodes', async function (req, res) {
    logger.debug('================ GET INSTANTIATED CHAINCODES ======================');
    logger.debug('channelName : ' + req.params.channelName);
    let peer = req.body.peer;
    var username = "grapebaba1";
    var orgname = "Ageli";
    let message = await query.getInstalledChaincodes(peer, req.params.channelName, 'instantiated', username, orgname);
    res.send(message);
});

// Create Channel
app.post('/channels', async function (req, res) {
    logger.info('<<<<<<<<<<<<<<<<< C R E A T E  C H A N N E L >>>>>>>>>>>>>>>>>');
    logger.debug('End point : /channels');
    let orderer = req.body.orderer;
    let channelName = req.body.channelName;
    let channelConfigPath = req.body.channelConfigPath;
    logger.debug('Channel name : ' + channelName);
    logger.debug('channelConfigPath : ' + channelConfigPath);
    logger.debug('orderer : ' + orderer);
    if (!channelName) {
        res.json(getErrorMessage('\'channelName\''));
        return;
    }
    if (!channelConfigPath) {
        res.json(getErrorMessage('\'channelConfigPath\''));
        return;
    }

    let message = await createChannel.createChannel(orderer, channelName, channelConfigPath, req.username, req.orgname);
    res.send(message);
});
// Join Channel
app.post('/channels/:channelName/peers', async function (req, res) {
    logger.info('<<<<<<<<<<<<<<<<< J O I N  C H A N N E L >>>>>>>>>>>>>>>>>');
    var channelName = req.params.channelName;
    var peers = req.body.peers;
    logger.debug('channelName : ' + channelName);
    logger.debug('peers : ' + peers);
    logger.debug('username :' + req.username);
    logger.debug('orgname:' + req.orgname);

    if (!channelName) {
        res.json(getErrorMessage('\'channelName\''));
        return;
    }
    if (!peers || peers.length === 0) {
        res.json(getErrorMessage('\'peers\''));
        return;
    }

    let message = await join.joinChannel(channelName, peers, req.username, req.orgname);
    res.send(message);
});
// Install chaincode on target peers
app.post('/chaincodes', async function (req, res) {
    logger.debug('==================== INSTALL CHAINCODE ==================');
    var peers = req.body.peers;
    var chaincodeName = req.body.chaincodeName;
    var chaincodePath = req.body.chaincodePath;
    var chaincodeVersion = req.body.chaincodeVersion;
    var chaincodeType = req.body.chaincodeType;
    logger.debug('peers : ' + peers); // target peers list
    logger.debug('chaincodeName : ' + chaincodeName);
    logger.debug('chaincodePath  : ' + chaincodePath);
    logger.debug('chaincodeVersion  : ' + chaincodeVersion);
    logger.debug('chaincodeType  : ' + chaincodeType);
    if (!peers || peers.length == 0) {
        res.json(getErrorMessage('\'peers\''));
        return;
    }
    if (!chaincodeName) {
        res.json(getErrorMessage('\'chaincodeName\''));
        return;
    }
    if (!chaincodePath) {
        res.json(getErrorMessage('\'chaincodePath\''));
        return;
    }
    if (!chaincodeVersion) {
        res.json(getErrorMessage('\'chaincodeVersion\''));
        return;
    }
    if (!chaincodeType) {
        res.json(getErrorMessage('\'chaincodeType\''));
        return;
    }
    let message = await install.installChaincode(peers, chaincodeName, chaincodePath, chaincodeVersion, chaincodeType, req.username, req.orgname)
    res.send(message);
});
// Instantiate chaincode on target peers
app.post('/channels/:channelName/chaincodes', async function (req, res) {
    logger.debug('==================== INSTANTIATE CHAINCODE ==================');
    let chaincodeName = req.body.chaincodeName;
    let chaincodeVersion = req.body.chaincodeVersion;
    let channelName = req.params.channelName;
    let chaincodeType = req.body.chaincodeType;
    let fcn = req.body.fcn;
    let args = req.body.args;
    let peer = req.body.peer;
    logger.debug('channelName  : ' + channelName);
    logger.debug('chaincodeName : ' + chaincodeName);
    logger.debug('chaincodeVersion  : ' + chaincodeVersion);
    logger.debug('chaincodeType  : ' + chaincodeType);
    logger.debug('fcn  : ' + fcn);
    logger.debug('args  : ' + args);
    logger.debug('peer  : ' + peer);
    if (!chaincodeName) {
        res.json(getErrorMessage('\'chaincodeName\''));
        return;
    }
    if (!chaincodeVersion) {
        res.json(getErrorMessage('\'chaincodeVersion\''));
        return;
    }
    if (!channelName) {
        res.json(getErrorMessage('\'channelName\''));
        return;
    }
    if (!chaincodeType) {
        res.json(getErrorMessage('\'chaincodeType\''));
        return;
    }
    if (!args) {
        res.json(getErrorMessage('\'args\''));
        return;
    }

    let message = await instantiate.instantiateChaincode(peer, channelName, chaincodeName, chaincodeVersion, chaincodeType, fcn, args, req.username, req.orgname);
    res.send(message);
});
// Invoke transaction on chaincode on target peers
app.post('/channels/:channelName/chaincodes/:chaincodeName', async function (req, res) {
    logger.debug('==================== INVOKE ON CHAINCODE ==================');
    var peers = req.body.peers;
    var chaincodeName = req.params.chaincodeName;
    var channelName = req.params.channelName;
    var fcn = req.body.fcn;
    var args = req.body.args;
    logger.debug('channelName  : ' + channelName);
    logger.debug('chaincodeName : ' + chaincodeName);
    logger.debug('fcn  : ' + fcn);
    logger.debug('args  : ' + args);
    if (!chaincodeName) {
        res.json(getErrorMessage('\'chaincodeName\''));
        return;
    }
    if (!channelName) {
        res.json(getErrorMessage('\'channelName\''));
        return;
    }
    if (!fcn) {
        res.json(getErrorMessage('\'fcn\''));
        return;
    }
    if (!args) {
        res.json(getErrorMessage('\'args\''));
        return;
    }

    let message = await invoke.invokeChaincode(peers, channelName, chaincodeName, fcn, args, req.username, req.orgname);
    res.send(message);
});
// Query on chaincode on target peers
app.post('/query/channels/:channelName/chaincodes/:chaincodeName', async function (req, res) {
    logger.debug('==================== QUERY BY CHAINCODE ==================');
    var channelName = req.params.channelName;
    var chaincodeName = req.params.chaincodeName;
    let args = req.body.args;
    let fcn = req.body.fcn;
    let peers = req.body.peers;

    logger.debug('channelName : ' + channelName);
    logger.debug('chaincodeName : ' + chaincodeName);
    logger.debug('fcn : ' + fcn);
    logger.debug('args : ' + args);
    logger.debug('peers : ' + peers);

    if (!chaincodeName) {
        res.json(getErrorMessage('\'chaincodeName\''));
        return;
    }
    if (!channelName) {
        res.json(getErrorMessage('\'channelName\''));
        return;
    }
    if (!fcn) {
        res.json(getErrorMessage('\'fcn\''));
        return;
    }
    if (!args) {
        res.json(getErrorMessage('\'args\''));
        return;
    }
    

    const dbName = "mychannel_hlccc";
    if (fcn=="GetAllInModule") {
        const mangoQuery = {
            selector: {
                _id: {$regex: 'PRODUCT_INFO'},
                "data.inModule": {$gt: null}
            },
            "limit": 1000
        };
        console.log(mangoQuery);
        const parameters = {};
        couch.mango(dbName, mangoQuery, parameters).then(({data, headers, status}) => {
            // console.log(data);
            const modulelist = [];
            if (data.docs) {
                for (let index = 0; index < data.docs.length; index++) {
                    const element = data.docs[index];
                    // console.log(element);
                    if(element.data){
                        // console.log(element.data);
                        if (modulelist.indexOf(element.data.inModule)==-1) {
                            modulelist.push(element.data.inModule)
                        }
                    }
                }
            }
            const obj = {
                success: true,
                payloads: [JSON.stringify(modulelist)],
                timestamp: Date.now(),
                message: "Successfully Query the chaincode "
            };
            res.send(obj);
        }, err => {
            const obj = {
                success: false,
                timestamp: Date.now(),
                message: "Failed Query the chaincode "
            };
            res.send(err);
        }); 
    }else if(fcn=="GetProductIdsByInModule"){
        if(args){
            const obj = JSON.parse(args[1]); //"{\"inModule\":\"XXXX14\"}"
            const modulevalue = obj.inModule;
            // {"selector":{"_id": {"$regex": "PRODUCT_INFO"},"data.inModule":"` + inModule + `"}}`
            const mangoQuery = {
                selector: {
                    "_id": {$regex: 'PRODUCT_INFO'},
                    "data.inModule": modulevalue
                },
                "limit": 1000
            };
            // console.log(mangoQuery);
            const parameters = {};
            couch.mango(dbName, mangoQuery, parameters).then(({data, headers, status}) => {
                // console.log(data);
                const modulelist = [];
                if (data.docs) {
                    for (let index = 0; index < data.docs.length; index++) {
                        const element = data.docs[index];
                        if (element.data) {
                            modulelist.push(JSON.stringify(element.data))
                        }
                    }
                }
                const obj = {
                    success: true,
                    payloads: ["["+modulelist.toString()+"]"],
                    timestamp: Date.now(),
                    message: "Successfully Query the chaincode "
                };
                res.send(obj);
            }, err => {
                const obj = {
                    success: false,
                    timestamp: Date.now(),
                    message: "Failed Query the chaincode "
                };
                res.send(err);
            }); 
        }
    }else{
        var username = "grapebaba1";
        var orgname = "Ageli";
        let message = await query.queryChaincode(peers, channelName, chaincodeName, args, fcn,username , orgname);
        res.send(message);
    }
    
});
// Upgrade chaincode on target peers
app.put('/channels/:channelName/chaincodes', async function (req, res) {
    logger.debug('==================== UPGRADE CHAINCODE ==================');
    let chaincodeName = req.body.chaincodeName;
    let chaincodeVersion = req.body.chaincodeVersion;
    let channelName = req.params.channelName;
    let chaincodeType = req.body.chaincodeType;
    let fcn = req.body.fcn;
    let args = req.body.args;
    let peer = req.body.peer;
    logger.debug('channelName  : ' + channelName);
    logger.debug('chaincodeName : ' + chaincodeName);
    logger.debug('chaincodeVersion  : ' + chaincodeVersion);
    logger.debug('chaincodeType  : ' + chaincodeType);
    logger.debug('fcn  : ' + fcn);
    logger.debug('args  : ' + args);
    logger.debug('peer  : ' + peer);
    if (!chaincodeName) {
        res.json(getErrorMessage('\'chaincodeName\''));
        return;
    }
    if (!chaincodeVersion) {
        res.json(getErrorMessage('\'chaincodeVersion\''));
        return;
    }
    if (!channelName) {
        res.json(getErrorMessage('\'channelName\''));
        return;
    }
    if (!chaincodeType) {
        res.json(getErrorMessage('\'chaincodeType\''));
        return;
    }
    if (!args) {
        res.json(getErrorMessage('\'args\''));
        return;
    }
    console.log("===================================");
    let message = await upgrade.upgradeChaincode(peer, channelName, chaincodeName, chaincodeVersion, chaincodeType, fcn, args, req.username, req.orgname);
    res.send(message);
});

//  Query POST Block by BlockNumber
app.post('/channels/:channelName/blocks/:blockId', async function (req, res) {
    logger.debug('==================== GET BLOCK BY NUMBER ==================');
    let blockId = req.params.blockId;
    let peer = req.body.peer;
    logger.debug('channelName : ' + req.params.channelName);
    logger.debug('BlockID : ' + blockId);
    logger.debug('Peer : ' + peer);
    if (!blockId) {
        res.json(getErrorMessage('\'blockId\''));
        return;
    }

    let message = await query.getBlockByNumber(peer, req.params.channelName, blockId, req.username, req.orgname);
    res.send(message);
});
// Query POST Transaction by Transaction ID
app.post('/query/channels/:channelName/transactions/:trxnId', async function (req, res) {
    logger.debug('================ GET TRANSACTION BY TRANSACTION_ID ======================');
    logger.debug('channelName : ' + req.params.channelName);
    let trxnId = req.params.trxnId;
    let peer = req.body.peer;
    if (!trxnId) {
        res.json(getErrorMessage('\'trxnId\''));
        return;
    }
    var username = "grapebaba1";
    var orgname = "Ageli";
    let message = await query.getTransactionByID(peer, req.params.channelName, trxnId, username, orgname);
    res.send(message);
});
// // Query Get Block by Hash
app.post('/channels/:channelName/blocks', async function (req, res) {
    logger.debug('================ GET BLOCK BY HASH ======================');
    logger.debug('channelName : ' + req.params.channelName);
    let hash = req.body.hash;
    let peer = req.body.peer;
    if (!hash) {
        res.json(getErrorMessage('\'hash\''));
        return;
    }

    let message = await query.getBlockByHash(peer, req.params.channelName, hash, req.username, req.orgname);
    res.send(message);
});
// //Query for Channel Information
app.post('/channels/:channelName', async function (req, res) {
    logger.debug('================ GET CHANNEL INFORMATION ======================');
    logger.debug('channelName : ' + req.params.channelName);
    let peer = req.body.peer;

    let message = await query.getChainInfo(peer, req.params.channelName, req.username, req.orgname);
    res.send(message);
});
//Query for Channel instantiated chaincodes
app.post('/query/channels/:channelName/chaincodes', async function (req, res) {
    logger.debug('================ GET INSTANTIATED CHAINCODES ======================');
    logger.debug('channelName : ' + req.params.channelName);
    let peer = req.body.peer;
    var username = "grapebaba1";
    var orgname = "Ageli";
    let message = await query.getInstalledChaincodes(peer, req.params.channelName, 'instantiated', username, orgname);
    res.send(message);
});
// note: query from mysql cache, data from block-listener
// Query peer list
app.get('/peer-list', async function (req, res) {
    logger.debug('================ GET CHANNEL PEER LIST ======================');
    let selectSQL = 'select * from peer';
    blockDB.query(selectSQL).then((rows) => {
        res.json({"success":true,"message":'succeed get peer list',"list":rows});
    }, (err) => {
        res.json({"success":false, "message":err.toString()});
    }).catch((err) => {
        res.json({"success":false, "message":err.toString()});
    });
});
// note: query from mysql cache, data from block-listener
// Query Block list
app.get('/block-list', async function (req, res) {
    logger.debug('================ GET CHANNEL BLOCK LIST ======================');
    let selectSQL = 'select * from block order by timestamp desc limit 10';
    blockDB.query(selectSQL).then((rows) => {
        res.json({"success":true,"message":'succeed get block list',"list":rows});
    }, (err) => {
        res.json({"success":false, "message":err.toString()});
    }).catch((err) => {
        res.json({"success":false, "message":err.toString()});
    });
});
// note: query from mysql cache, data from block-listener
// Query transaction number
app.get('/transaction-count', async function (req, res) {
    logger.debug('================ GET CHANNEL TRANSACTION NUMBER ======================');
    let selectSQL = 'select sum(tx_count) as tx from block';
    blockDB.query(selectSQL).then((rows) => {
        res.json({"success":true,"message":'succeed get transaction number',"number":rows[0].tx});
    }, (err) => {
        res.json({"success":false, "message":err.toString()});
    }).catch((err) => {
        res.json({"success":false, "message":err.toString()});
    });
});
//Query for Channel instantiated chaincodes
app.get('/channels/:channelName/chaincodes', async function (req, res) {
    logger.debug('================ GET INSTANTIATED CHAINCODES ======================');

    let peer = req.query.peer;
    logger.debug('channelName : ' + req.params.channelName, peer);
    let message = await query.getInstalledChaincodes(peer, req.params.channelName, 'instantiated', req.username, req.orgname);
    res.send(message);
});
// // Query to fetch all Installed/instantiated chaincodes
// app.get('/chaincodes', async function (req, res) {
//     var peer = req.query.peer;
//     var installType = req.query.type;
//     logger.debug('================ GET INSTALLED CHAINCODES ======================');
//
//     let message = await query.getInstalledChaincodes(peer, null, 'installed', req.username, req.orgname)
//     res.send(message);
// });
// // Query to fetch channels
// app.get('/channels', async function (req, res) {
//     logger.debug('================ GET CHANNELS ======================');
//     logger.debug('peer: ' + req.query.peer);
//     var peer = req.query.peer;
//     if (!peer) {
//         res.json(getErrorMessage('\'peer\''));
//         return;
//     }
//
//     let message = await query.getChannels(peer, req.username, req.orgname);
//     res.send(message);
// });
