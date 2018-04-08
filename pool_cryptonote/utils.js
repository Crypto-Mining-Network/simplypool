var base58 = require('base58-native');
var cnUtil = require('cryptonote-util');
var http = require('http');
var querystring = require('querystring');


exports.uid = function() {
    var min = 100000000000000;
    var max = 999999999999999;
    var id = Math.floor(Math.random() * (max - min + 1)) + min;
    return id.toString();
};

exports.ringBuffer = function(maxSize) {
    var data = [];
    var cursor = 0;
    var isFull = false;

    return {
        append: function(x) {
            if (isFull) {
                data[cursor] = x;
                cursor = (cursor + 1) % maxSize;
            }
            else {
                data.push(x);
                cursor++;
                if (data.length === maxSize) {
                    cursor = 0;
                    isFull = true;
                }
            }
        },
        avg: function(plusOne) {
            var sum = data.reduce(function(a, b) { return a + b }, plusOne || 0);
            return sum / ((isFull ? maxSize : cursor) + (plusOne ? 1 : 0));
        },
        size: function() {
            return isFull ? maxSize : cursor;
        },
        clear: function() {
            data = [];
            cursor = 0;
            isFull = false;
        }
    };
};

exports.varIntEncode = function(n) {

};

exports.post = function(host, port, path, data, callback, errback) {
    var postData = querystring.stringify(data);

    var req = http.request({
        host: host,
        port: port,
        path: path,
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": Buffer.byteLength(postData)
        }
    }, function(res) {
        res.setEncoding("utf8");
        res.on("data", function (chunk) {
            callback()
        });
    });

    req.on('error', function(e) {
        errback(e);
    });

    req.write(postData);
    req.end();
};

exports.get = function(host, port, path, callback, errback) {
    var req = http.request({
        host: host,
        port: port,
        path: path,
        method: "GET"
    }, function(res) {
        res.setEncoding("utf8");
        res.on("data", function (chunk) {
            callback(JSON.parse(chunk))
        });
    });

    req.on('error', function(e) {
        errback(e);
    });

    req.end();
};