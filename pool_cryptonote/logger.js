var fs = require('fs');
var util = require('util');

var dateFormat = require('dateformat');
var clc = require('cli-color');

var severityMap = {
    'info': clc.blue,
    'warn': clc.yellow,
    'error': clc.red
};

var severityLevels = ['info', 'warn', 'error'];

global.log = function(severity, system, text, data){
    var logConsole = severityLevels.indexOf(severity) >= severityLevels.indexOf(config.logging.console.level);

    if (!logConsole) return;

    var time = dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss');
    var formattedMessage = text;

    if (data) {
        data.unshift(text);
        formattedMessage = util.format.apply(null, data);
    }

    if (logConsole){
        if (config.logging.console.colors)
            console.log(severityMap[severity](time) + clc.white.bold(' [' + system + '] ') + formattedMessage);
        else
            console.log(time + ' [' + system + '] ' + formattedMessage);
    }
};