var fs = require('fs');
var net = require('net');
var crypto = require('crypto');

var async = require('async');
var bignum = require('bignum');
var cnUtil = require('cryptonote-util');

var multiHashing = require("cryptonight-hashing");
var http = require('http');
var querystring = require('querystring');

// Must exactly be 8 hex chars
var noncePattern = new RegExp("^[0-9A-Fa-f]{8}$");
var threadId = '(Thread ' + process.env.forkId + ') ';
var logSystem = 'pool';
require('./exceptionWriter.js')(logSystem);
var apiInterfaces = require('./apiInterfaces.js')(config.daemon, config.wallet, config.api);
var utils = require('./utils.js');
var log = function(severity, system, text, data) {
    global.log(severity, system, threadId + text, data);
};
var cryptoNight = function(convertedBlob) {
    return multiHashing.cryptonight(convertedBlob, convertedBlob[0] >= 7 ? convertedBlob[0] - 6 : 0);
};
var diff1 = bignum('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF', 16);
var instanceId = crypto.randomBytes(4);
var validBlockTemplates = [];
var currentBlockTemplate;
var connectedMiners = {};
var addressBase58Prefix = cnUtil.address_decode(new Buffer(config.poolServer.poolAddress));


(function init() {
    jobRefresh(true, function(sucessful) {
        if (!sucessful) {
            log('error', logSystem, 'Could not start pool');
            return;
        }
        startPoolServerTcp(function(successful) {

        });
    });
})();


setInterval(function() {
    var now = Date.now() / 1000 | 0;
    for (var minerId in connectedMiners) {
        var miner = connectedMiners[minerId];
        if(!miner.noRetarget) {
            miner.retarget(now);
        }
    }
}, config.poolServer.varDiff.retargetTime * 1000);


setInterval(function() {
    apiInterfaces.rpcDaemon('getlastblockheader', {}, function(error, reply){
        if (error){
            log('error', logSystem, 'Error getting daemon data %j', [error]);
            return;
        }
        var blockHeader = reply.block_header;

        utils.post(config.pool_engine.host, config.pool_engine.port, "/submit_node_info", {
            coin: config.coin,
            height: blockHeader.height,
            difficulty: blockHeader.difficulty
        }, function() {}, function(e) {
            log('info', logSystem, 'Error submitting node info: %s', [e]);
        });
    });
}, 1000);


function BlockTemplate(template) {
    this.blob = template.blocktemplate_blob;
    this.difficulty = template.difficulty;
    this.height = template.height;
    this.reserveOffset = template.reserved_offset;
    this.buffer = new Buffer(this.blob, 'hex');
    instanceId.copy(this.buffer, this.reserveOffset + 4, 0, 3);
    this.extraNonce = 0;
}
BlockTemplate.prototype = {
    nextBlob: function() {
        this.buffer.writeUInt32BE(++this.extraNonce, this.reserveOffset);
        return cnUtil.convert_blob(this.buffer).toString('hex');
    }
};


function getBlockTemplate(callback) {
    apiInterfaces.rpcDaemon('getblocktemplate', {reserve_size: 8, wallet_address: config.poolServer.poolAddress}, callback);
}


function jobRefresh(loop, callback) {
    callback = callback || function() {};
    getBlockTemplate(function(error, result) {
        if (loop)
            setTimeout(function() {
                jobRefresh(true);
            }, config.poolServer.blockRefreshInterval);
        if (error) {
            log('error', logSystem, 'Error polling getblocktemplate %j', [error]);
            callback(false);
            return;
        }
        if (!currentBlockTemplate || result.height > currentBlockTemplate.height) {
            log('info', logSystem, 'New block to mine at height %d w/ difficulty of %d', [result.height, result.difficulty]);
            processBlockTemplate(result);
        }
        callback(true);
    })
}


function processBlockTemplate(template) {
    if (currentBlockTemplate)
        validBlockTemplates.push(currentBlockTemplate);

    if (validBlockTemplates.length > 3)
        validBlockTemplates.shift();

    currentBlockTemplate = new BlockTemplate(template);

    for (var minerId in connectedMiners) {
        var miner = connectedMiners[minerId];
        miner.pushMessage('job', miner.getJob());
    }
}


var VarDiff = (function() {
    var variance = config.poolServer.varDiff.variancePercent / 100 * config.poolServer.varDiff.targetTime;
    return {
        variance: variance,
        bufferSize: config.poolServer.varDiff.retargetTime / config.poolServer.varDiff.targetTime * 4,
        tMin: config.poolServer.varDiff.targetTime - variance,
        tMax: config.poolServer.varDiff.targetTime + variance,
        maxJump: config.poolServer.varDiff.maxJump
    };
})();


function Miner(id, login, pass, ip, startingDiff, noRetarget, pushMessage) {
    this.id = id;
    this.login = login;
    this.pass = pass;
    this.ip = ip;
    this.pushMessage = pushMessage;
    this.heartbeat();
    this.noRetarget = noRetarget;
    this.difficulty = startingDiff;
    this.validJobs = [];
    this.disconnected = false;

    // Vardiff related variables
    this.shareTimeRing = utils.ringBuffer(16);
    this.lastShareTime = Date.now() / 1000 | 0;
}
Miner.prototype = {
    retarget: function(now) {
        var options = config.poolServer.varDiff;

        var sinceLast = now - this.lastShareTime;
        var decreaser = sinceLast > VarDiff.tMax;

        var avg = this.shareTimeRing.avg(decreaser ? sinceLast : null);
        var newDiff;

        var direction;

        if (avg > VarDiff.tMax && this.difficulty > options.minDiff) {
            newDiff = options.targetTime / avg * this.difficulty;
            newDiff = newDiff > options.minDiff ? newDiff : options.minDiff;
            direction = -1;
        }
        else if (avg < VarDiff.tMin && this.difficulty < options.maxDiff) {
            newDiff = options.targetTime / avg * this.difficulty;
            newDiff = newDiff < options.maxDiff ? newDiff : options.maxDiff;
            direction = 1;
        }
        else{
            return;
        }

        if (Math.abs(newDiff - this.difficulty) / this.difficulty * 100 > options.maxJump) {
            var change = options.maxJump / 100 * this.difficulty * direction;
            newDiff = this.difficulty + change;
        }

        this.setNewDiff(newDiff);
        this.shareTimeRing.clear();
        if (decreaser) this.lastShareTime = now;
    },
    setNewDiff: function(newDiff) {
        newDiff = Math.round(newDiff);
        if (this.difficulty === newDiff) return;
        log('info', logSystem, 'Retargetting difficulty %d to %d for %s', [this.difficulty, newDiff, this.login]);
        this.pendingDifficulty = newDiff;
        this.pushMessage('job', this.getJob());
    },
    heartbeat: function() {
        this.lastBeat = Date.now();
    },
    getTargetHex: function() {
        if (this.pendingDifficulty) {
            this.lastDifficulty = this.difficulty;
            this.difficulty = this.pendingDifficulty;
            this.pendingDifficulty = null;
        }

        var padded = new Buffer(32);
        padded.fill(0);

        var diffBuff = diff1.div(this.difficulty).toBuffer();
        diffBuff.copy(padded, 32 - diffBuff.length);

        var buff = padded.slice(0, 4);
        var buffArray = buff.toJSON();
        buffArray.reverse();
        var buffReversed = new Buffer(buffArray);
        this.target = buffReversed.readUInt32BE(0);
        var hex = buffReversed.toString('hex');
        return hex;
    },
    getJob: function() {
        if (this.lastBlockHeight === currentBlockTemplate.height && !this.pendingDifficulty) {
            return {
                blob: '',
                job_id: '',
                target: ''
            };
        }

        var blob = currentBlockTemplate.nextBlob();
        this.lastBlockHeight = currentBlockTemplate.height;
        var target = this.getTargetHex();

        var newJob = {
            id: utils.uid(),
            extraNonce: currentBlockTemplate.extraNonce,
            height: currentBlockTemplate.height,
            difficulty: this.difficulty,
            score: this.score,
            diffHex: this.diffHex,
            submissions: []
        };

        this.validJobs.push(newJob);

        if (this.validJobs.length > 4)
            this.validJobs.shift();

        return {
            blob: blob,
            job_id: newJob.id,
            target: target
        };
    }
};

function recordShareData(miner, job, shareDiff, blockCandidate, hashHex, shareType, blockTemplate) {
    job.score = job.difficulty;

    utils.post(config.pool_engine.host, config.pool_engine.port, "/submit_share", {
        coin: config.coin,
        wallet: miner.login,
        count: job.score,
        worker: miner.pass ? miner.pass.split(':')[0] : "default",
        email: miner.pass && miner.pass.split(':').length == 2 ? miner.pass.split(':')[1] : ""
    }, function() {
        log('info', logSystem, 'Accepted %s share at difficulty %d/%d from %s@%s', [shareType, job.difficulty, shareDiff, miner.login, miner.ip]);
        if (blockCandidate) {
            utils.post(config.pool_engine.host, config.pool_engine.port, "/submit_block", {
                coin: config.coin,
                height: job.height,
                hash: hashHex
            }, function () {
                log('info', logSystem, 'Submitted block', []);
            }, function(e) {
                log('info', logSystem, 'Error submitting block: %s', [e]);
            });
        }
    }, function(e) {
        log('info', logSystem, 'Error submitting share: %s', [e]);
    });
}

function processShare(miner, job, blockTemplate, nonce, resultHash) {
    var template = new Buffer(blockTemplate.buffer.length);
    blockTemplate.buffer.copy(template);
    template.writeUInt32BE(job.extraNonce, blockTemplate.reserveOffset);
    var shareBuffer = cnUtil.construct_block_blob(template, new Buffer(nonce, 'hex'));

    var convertedBlob;
    var hash;
    var shareType;

    convertedBlob = cnUtil.convert_blob(shareBuffer);
    hash = cryptoNight(convertedBlob);
    shareType = 'valid';


    if (hash.toString('hex') !== resultHash) {
        log('warn', logSystem, 'Bad hash from miner %s@%s', [miner.login, miner.ip]);
        return false;
    }

    var hashArray = hash.toJSON();
    hashArray.reverse();
    var hashNum = bignum.fromBuffer(new Buffer(hashArray));
    var hashDiff = diff1.div(hashNum);



    if (hashDiff.ge(blockTemplate.difficulty)) {

        apiInterfaces.rpcDaemon('submitblock', [shareBuffer.toString('hex')], function(error, result) {
            if (error) {
                log('error', logSystem, 'Error submitting block at height %d from %s@%s, share type: "%s" - %j', [job.height, miner.login, miner.ip, shareType, error]);
                recordShareData(miner, job, hashDiff.toString(), false, null, shareType);
            }
            else{
                var blockFastHash = cnUtil.get_block_id(shareBuffer).toString('hex');
                log('info', logSystem,
                    'Block %s found at height %d by miner %s@%s - submit result: %j',
                    [blockFastHash.substr(0, 6), job.height, miner.login, miner.ip, result]
                );
                recordShareData(miner, job, hashDiff.toString(), true, blockFastHash, shareType, blockTemplate);
                jobRefresh();
            }
        });
    }

    else if (hashDiff.lt(job.difficulty)) {
        log('warn', logSystem, 'Rejected low difficulty share of %s from %s@%s', [hashDiff.toString(), miner.login, miner.ip]);
        return false;
    }
    else{
        recordShareData(miner, job, hashDiff.toString(), false, null, shareType);
    }

    return true;
}


function handleMinerMethod(method, params, ip, portData, sendReply, pushMessage) {
    var miner = connectedMiners[params.id];

    switch(method) {
        case 'login':
            var login = params.login;
            if (!login) {
                sendReply('missing login');
                return;
            }

            var difficulty = portData.difficulty;
            var noRetarget = false;
            var addressSeparator = '.';
            if (config && config.poolServer && config.poolServer.addressSeparator) {
              addressSeparator = config.poolServer.addressSeparator;
            }
            var splittedLogin = login.split(addressSeparator);
            
            if (splittedLogin.length > 4) {
                sendReply('Too many login parameters.');
                return;
            }
            
            var difficultyCandidate = splittedLogin[splittedLogin.length-1];

            if (splittedLogin.length > 1 && difficultyCandidate.length < 64 /* Last element is not 64-character string */ ) {
              if (config.poolServer.fixedDiff && config.poolServer.fixedDiff.enabled) {
                  noRetarget = true;
                  difficulty = parseInt(difficultyCandidate, 10);
                  if(difficulty == parseInt(difficulty, 10)) { // Last element is int! It is difficulty!
                      if(difficulty < config.poolServer.varDiff.minDiff) {
                          difficulty = config.poolServer.varDiff.minDiff;
                      }
                      log('info', logSystem, 'Miner difficulty fixed to %s',  [difficulty]);
                  } else {
                    sendReply('Invalid login. Last element is neither Payment ID nor difficulty.');
                    return;
                  }
              }
              // Remove difficulty from splitted login
              splittedLogin.pop();
            } else if (splittedLogin.length == 3) {
                //last element is not int and we have 3 elements in login
                sendReply('Invalid login. Last element is not int and we have 3 elements in login.');
                return;
            }
            // Now we have 1 or 2 elements in login. First should be valid wallet addres
            if (addressBase58Prefix !== cnUtil.address_decode(new Buffer(splittedLogin[0]))) {
                log('info', logSystem, 'Miner faild to login with %s',  [login]);
                sendReply('Invalid address used for login.');
                return;
            }
            if (splittedLogin.length == 2) {
                // We have paymentId in login.
                // It should be 2-byte/64-character hex string
                // https://getmonero.org/knowledge-base/developer-guides/wallet-rpc#transger
                if (! (/^[0-9A-Za-z]+$/.test(splittedLogin[1]) && (splittedLogin[1].length == 16 || splittedLogin[1].length == 64) )) {
                    sendReply('Invalid Payment ID in login.');
                    return;
                }
            }
            //collect login back
            login = splittedLogin.join(addressSeparator);

            var minerId = utils.uid();
            miner = new Miner(minerId, login, params.pass, ip, difficulty, noRetarget, pushMessage);
            connectedMiners[minerId] = miner;
            sendReply(null, {
                id: minerId,
                job: miner.getJob(),
                status: 'OK'
            });
            log('info', logSystem, 'Miner connected %s@%s',  [params.login, miner.ip]);
            break;
        case 'getjob':
            if (!miner) {
                sendReply('Unauthenticated');
                return;
            }
            miner.heartbeat();
            sendReply(null, miner.getJob());
            break;
        case 'submit':
            if (!miner) {
                sendReply('Unauthenticated');
                return;
            }
            miner.heartbeat();

            var job = miner.validJobs.filter(function(job) {
                return job.id === params.job_id;
            })[0];

            if (!job) {
                sendReply('Invalid job id');
                return;
            }

        params.nonce = params.nonce.substr(0, 8).toLowerCase();
        if (!noncePattern.test(params.nonce)) {
                var minerText = miner ? (' ' + miner.login + '@' + miner.ip) : '';
                log('warn', logSystem, 'Malformed nonce: ' + JSON.stringify(params) + ' from ' + minerText);
                sendReply('Duplicate share');
                return;
            }

            if (job.submissions.indexOf(params.nonce) !== -1) {
                var minerText = miner ? (' ' + miner.login + '@' + miner.ip) : '';
                log('warn', logSystem, 'Duplicate share: ' + JSON.stringify(params) + ' from ' + minerText);
                sendReply('Duplicate share');
                return;
            }

            job.submissions.push(params.nonce);

            var blockTemplate = currentBlockTemplate.height === job.height ? currentBlockTemplate : validBlockTemplates.filter(function(t) {
                return t.height === job.height;
            })[0];

            if (!blockTemplate) {
                sendReply('Block expired');
                return;
            }

            var shareAccepted = processShare(miner, job, blockTemplate, params.nonce, params.result);
            
            if (!shareAccepted) {
                sendReply('Low difficulty share');
                return;
            }

            var now = Date.now() / 1000 | 0;
            miner.shareTimeRing.append(now - miner.lastShareTime);
            miner.lastShareTime = now;
            //miner.retarget(now);

            sendReply(null, {status: 'OK'});
            break;
        case 'keepalived' :
            miner.heartbeat()
            sendReply(null, { status:'KEEPALIVED'
            });
            break;
        default:
            sendReply("invalid method");
            var minerText = miner ? (' ' + miner.login + '@' + miner.ip) : '';
            log('warn', logSystem, 'Invalid method: %s (%j) from %s', [method, params, minerText]);
            break;
    }
}


var httpResponse = ' 200 OK\nContent-Type: text/plain\nContent-Length: 20\n\nmining server online';


function startPoolServerTcp(callback) {
    async.each(config.poolServer.ports, function(portData, cback) {
        var handleMessage = function(socket, jsonData, pushMessage) {
            if (!jsonData.id) {
                log('warn', logSystem, 'Miner RPC request missing RPC id');
                return;
            }
            else if (!jsonData.method) {
                log('warn', logSystem, 'Miner RPC request missing RPC method');
                return;
            }

            var sendReply = function(error, result) {
                if(!socket.writable) return;
                var sendData = JSON.stringify({
                    id: jsonData.id,
                    jsonrpc: "2.0",
                    error: error ? {code: -1, message: error} : null,
                    result: result
                }) + "\n";
                socket.write(sendData);
            };

            handleMinerMethod(jsonData.method, jsonData.params, socket.remoteAddress, portData, sendReply, pushMessage);
        };

        net.createServer(function(socket) {
            socket.setKeepAlive(true);
            socket.setEncoding('utf8');

            var dataBuffer = '';

            var pushMessage = function(method, params) {
                if(!socket.writable) return;
                var sendData = JSON.stringify({
                    jsonrpc: "2.0",
                    method: method,
                    params: params
                }) + "\n";
                socket.write(sendData);
            };

            socket.on('data', function(d) {
                dataBuffer += d;
                if (Buffer.byteLength(dataBuffer, 'utf8') > 10240) { //10KB
                    dataBuffer = null;
                    log('warn', logSystem, 'Socket flooding detected and prevented from %s', [socket.remoteAddress]);
                    socket.destroy();
                    return;
                }
                if (dataBuffer.indexOf('\n') !== -1) {
                    var messages = dataBuffer.split('\n');
                    var incomplete = dataBuffer.slice(-1) === '\n' ? '' : messages.pop();
                    for (var i = 0; i < messages.length; i++) {
                        var message = messages[i];
                        if (message.trim() === '') continue;
                        var jsonData;
                        try{
                            jsonData = JSON.parse(message);
                        }
                        catch(e) {
                            if (message.indexOf('GET /') === 0) {
                                if (message.indexOf('HTTP/1.1') !== -1) {
                                    socket.end('HTTP/1.1' + httpResponse);
                                    break;
                                }
                                else if (message.indexOf('HTTP/1.0') !== -1) {
                                    socket.end('HTTP/1.0' + httpResponse);
                                    break;
                                }
                            }

                            log('warn', logSystem, 'Malformed message from %s: %s', [socket.remoteAddress, message]);
                            socket.destroy();

                            break;
                        }
                        handleMessage(socket, jsonData, pushMessage);
                    }
                    dataBuffer = incomplete;
                }
            }).on('error', function(err) {
                if (err.code !== 'ECONNRESET')
                    log('warn', logSystem, 'Socket error from %s %j', [socket.remoteAddress, err]);
            }).on('close', function() {
                pushMessage = function() {};
            });

        }).listen(portData.port, function (error, result) {
            if (error) {
                log('error', logSystem, 'Could not start server listening on port %d, error: $j', [portData.port, error]);
                cback(true);
                return;
            }
            log('info', logSystem, 'Started server listening on port %d', [portData.port]);
            cback();
        });

    }, function(err) {
        if (err)
            callback(false);
        else
            callback(true);
    });
}
