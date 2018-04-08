var fs = require('fs');
var cluster = require('cluster');

var os = require('os');

require('./configReader.js');
require('./logger.js');

var logSystem = 'master';
require('./exceptionWriter.js')(logSystem);


if (cluster.isWorker){
    switch(process.env.workerType){
        case 'pool':
            require('./pool.js');
            break;
        case 'blockValidator':
            require('./blockValidator.js');
            break;
    }
    return;
}


(function init() {
    spawnBlockValidator();
    spawnPoolWorkers();
})();


function spawnBlockValidator(){
    var worker = cluster.fork({
        workerType: 'blockValidator'
    });
    worker.on('exit', function(code, signal){
        log('error', logSystem, 'Block validator died, spawning replacement...');
        setTimeout(function(){
            spawnBlockValidator();
        }, 2000);
    });

}


function spawnPoolWorkers() {
    var numForks = os.cpus().length;
    var poolWorkers = {};

    var createPoolWorker = function(forkId) {
        var worker = cluster.fork({
            workerType: 'pool',
            forkId: forkId
        });
        worker.forkId = forkId;
        worker.type = 'pool';
        poolWorkers[forkId] = worker;
        worker.on('exit', function(code, signal) {
            log('error', logSystem, 'Pool fork %s died, spawning replacement worker...', [forkId]);
            setTimeout(function(){
                createPoolWorker(forkId);
            }, 2000);
        });
    };

    var i = 1;
    var spawnInterval = setInterval(function(){
        createPoolWorker(i.toString());
        i++;
        if (i - 1 === numForks){
            clearInterval(spawnInterval);
            log('info', logSystem, 'Pool spawned on %d thread(s)', [numForks]);
        }
    }, 10);
}

