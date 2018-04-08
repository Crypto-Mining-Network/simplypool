var async = require('async');
var http = require('http');

var apiInterfaces = require('./apiInterfaces.js')(config.daemon, config.wallet, config.api);

var logSystem = 'validator';
require('./exceptionWriter.js')(logSystem);
var utils = require('./utils.js');

log('info', logSystem, 'Started');


function runInterval() {
    async.waterfall([
        // Get all block candidates in redis
        function(callback) {
            utils.get(config.pool_engine.host, config.pool_engine.port, "/blocks_to_validate?coin=" + config.coin, function(data) {
                callback(null, data);
            }, function() {
                log('error', logSystem, 'Error querying blocks to validate', []);
            })
        },

        // Check if blocks are orphaned
        function(blocks, callback){
            async.filter(blocks, function(block, mapCback) {
                apiInterfaces.rpcDaemon('getblockheaderbyheight', { height: block.height }, function(error, result) {
                    if (error){
                        log('error', logSystem, 'Error with getblockheaderbyheight RPC request for block %s - %j', [block.serialized, error]);
                        callback(true);
                        return;
                    }
                    if (!result.block_header){
                        log('error', logSystem, 'Error with getblockheaderbyheight, no details returned for %s - %j', [block.serialized, result]);
                        callback(true);
                        return;
                    }
                    var blockHeader = result.block_header;

                    block.valid = blockHeader.hash === block.hash ? 1 : 0;
                    block.unlocked = blockHeader.depth >= config.blockValidator.depth;
                    block.reward = blockHeader.reward;
                    mapCback(block.unlocked);
                });
            }, function(unlockedBlocks) {
                if (unlockedBlocks.length === 0) {
                    log('info', logSystem, 'No pending blocks are unlocked yet (%d pending)', [blocks.length]);
                    callback(true);
                    return;
                }
                callback(null, unlockedBlocks)
            })
        },

        // Submit results
        function(blocks, callback) {
            for (var i in blocks) {
                var block = blocks[i];
                utils.post(config.pool_engine.host, config.pool_engine.port, "/validate_block", {
                    block_id: block.id,
                    is_valid: block.valid,
                    reward: block.reward / parseInt(config.sigDivisor)
                }, function() {
                    log('info', logSystem, 'Validated block with block_id %s', [block.id]);
                }, function(err) {
                    log('error', logSystem, 'Error validating block with block_id %s', [block.id]);
                });
            }
            callback(null);
        }
    ], function(error, result){
        setTimeout(runInterval, config.blockValidator.interval * 1000);
    })
}

runInterval();