/**
 * Created by zhangtailin on 2018/3/7.
 */
let util = require('util');
let helper = require('../halal/helper.js');
let logger = helper.getLogger('blocklistener');
let queryHandler = require('../halal/query');
let blockDB = require('./block-db');
let process = require('process');
require('../config.js');

let listener_peer = "peer0.ageli.com";
let listener_channel = "mychannel";
let listener_user = "grapebaba1";
let listener_org = "Ageli";
let allEventhubs = [];

let blockListener = async function (channel_name, peer, org_name) {
    logger.debug('\n\n============ listener block start ============\n');

    logger.debug('check and sync history block data');
    await syncHistoryBlock(peer, channel_name, listener_user, org_name);

    try {
        logger.debug('listener channel "%s", organization "%s", peer "%s"', channel_name, peer, org_name);
        let response = await helper.getOrgCAUser(org_name);
        let orgCAusername;
        if (response && response.success) {
            orgCAusername = response.username;
        } else {
            logger.error('failed got the CAUser for the organization "%s"', org_name);
            return;
        }

        let client = await helper.getClientForOrg(org_name, orgCAusername);
        logger.debug('Successfully got the fabric client for the organization "%s"', org_name);

        let channel = client.getChannel(channel_name);
        if (!channel) {
            let message = util.format('Channel %s was not defined in the connection profile', channel_name);
            logger.error(message);
            return;
        }

        // get the genesis_block from the orderer,
        let request = {
            txId: client.newTransactionID(true) //get an admin based transactionID
        };
        let genesis_block = await channel.getGenesisBlock(request);
        if (!genesis_block) {
            logger.error('Failed to get channel:"%s" genesisBlock', channel);
        }

        // tell each peer to join and wait for the event hub of each peer to tell us
        // that the channel has been created on each peer
        let eh = client.getEventHub(peer);
        eh.registerBlockEvent((block) => {
            // a peer may have more than one channel so
            // we must check that this block came from the channel we
            let channel_header = block.data.data[0].payload.header.channel_header;
            if (channel_header.channel_id === channel_name) {
                logger.info(util.format('EventHub "%s" has reported block number "%d" update for channel "%s"',
                    eh._ep._endpoint.addr,block.header.number,channel_name));
                insertDB(block).catch((err) => {
                    logger.error('failed to insert into blockInfo, err: ', err);
                });
            }
        }, (err) => {
            logger.error('Problem setting up the event hub :' + err.toString());
        });

        eh.connect(); //this opens the event stream that must be shutdown at some point with a disconnect()
        allEventhubs.push(eh);
    } catch (error) {
        logger.error('Failed to listener block due to error: ' + error.stack ? error.stack : error);
    }
};

let insertDB = (block) => {
    let eventPromises = [];
    let number = block.header.number;
    let data_hash = block.header.data_hash;
    let previous_hash = block.header.previous_hash;
    let length = block.data.data.length;
    let last_tx = block.data.data[length-1];
    let blockTime = last_tx.payload.header.channel_header.timestamp;
    let blockSQL = 'INSERT INTO block VALUES(?,?,?,?,?)';
    let paramSQL = [data_hash, parseInt(number),length, new Date(blockTime).getTime(), previous_hash];
    let blockPromise = blockDB.query(blockSQL, paramSQL);
    eventPromises.push(blockPromise);
    return Promise.all(eventPromises);
};

let getBlockByNumber = (peer, channelName, blockNumber, username, org) => {
    return queryHandler.getBlockByNumber(peer, channelName, blockNumber, username, org).then((result) => {
        if (result.success === false) {
            logger.error(util.format('Failed to get block number:%d, %s'),blockNumber,block);
            return 'Failed to get block number: "' + blockNumber + '". Error: ' + block;
        }
       return insertDB(result.tx);
    }, (err) => {
        logger.error(util.format('getBlockByNumber, failed to get block number:%d , err:%s'), blockNumber, err);
    }).then((rows) => {
        logger.info(util.format('getBlockByNumber, insert block number:%d into db', blockNumber));
    },(err) => {
        logger.error(util.format('getBlockByNumber, failed to insert block number:%d into db, err:%s', blockNumber, err));
    }).catch((err) => {
        logger.error('getBlockByNumber catch err:', err);
    });
};

let syncHistoryBlock = (peer, channelName, username, org) => {
    // get block max height from db,compare with current height in blockchain network
    // if lower，get missing block info insert into db
    return queryHandler.getChainInfo(peer, channelName, username, org).then((result) => {
        if (result.success === false || result.tx.height === undefined) {
            logger.info('not find any history block,', result);
            return 'not find any history block, ' + result;
        }
        let height = parseInt(result.tx.height);
        let selectSQL = 'SELECT max(number) FROM block';
        blockDB.query(selectSQL).then((rows) => {
            let oldHeigth = rows[0]['max(number)'];
            if (oldHeigth === null) {
                oldHeigth = -1;
            }
            for(let i=oldHeigth+1; i<height; i++) {
               getBlockByNumber(peer, channelName, i, username, org);
            }
        },(err) => {
            logger.error('syncHistoryBlock, query db failed, err:', err);
        });
    }, (err) => {
        logger.error('getChainInfo failed, err:', err);
    }).catch((err) => {
        logger.error('syncHistoryBlock catch err:', err);
    });
};

blockListener(listener_channel, listener_peer, listener_org);

process.on('exit',() => {
    for (let key in allEventhubs) {
        let eventhub = allEventhubs[key];
        if (eventhub && eventhub.isconnected()) {
            logger.debug('Disconnecting the event hub');
            eventhub.disconnect();
        }
    }
});

