var https = require('https');
var xml2js = require('xml2js');
var xml2json = require("xml2json");

var readTimeoutMilliseconds = 60000;
var readIntervalMilliseconds = 600000;
//var rootPath = "/DefaultCollection/5th%20Column/workitems";
//var username = 'SEA\\s-ewebuildprop';
//var password = 'w3ak5auce.06';
//var auth = 'Basic ' + new Buffer(username + ":" + password).toString('base64');
//console.log("Auth: " + auth);
var options = {
  host: 'my.mingle.com',
  port: '443',
  rejectUnauthorized: false
};

var responseReader = function(response) {
  var msg = '';
  response.on('data', function(chunk){
    msg += chunk;
  });
  response.on('end', function() {
    console.log(msg);
    //xml2js.parseString(msg, function(err, json){
    //  console.log(JSON.stringify(json, null, 2));
    //});
    var json_out = xml2json.toJson(msg, {object: true, reversible: false});
    console.log(JSON.stringify(json_out, null, 2));
    //var jsonResponse = JSON.parse(msg);
    //for (var i = 0, l = jsonResponse.length, wi; i < l; i++) {
    //  wi = jsonResponse[i];
    //  //console.log('Title        [' + wi.systemTitle + ']');
    //  //console.log('Release Type [' + wi.t2ReleaseType + ']');
    //  //console.log('State        [' + wi.systemState + ']');
    //  console.log(wi);
    //  console.log('');
    //}
  });
};

//switch (options.argv.project.toLowerCase()) {
//  case 'cars':
//    options.path = rootPath + '/Release%20Record/?filter=' +
//                              encodeURIComponent('Group="CARS" AND') +
//                              encodeURIComponent('(T2.ReleaseType="Major Release" OR T2.ReleaseType="Minor Release" OR T2.ReleaseType="Maintenance")');
//    break;
//  case 'airint':
//  case 'air':
//    options.path = rootPath + '/Release%20Record/?filter=' +
//                              encodeURIComponent('Group="Air" AND Title Contains "AirINT"');
//    break;
//  case 'bfs':
//    options.path = rootPath + '/Release%20Record/?filter=' +
//                              encodeURIComponent('Group="BFS"');
//    break;
//  default:
//    break;
//}
options.path = "/api/v2/projects/trunk_release/cards.xml?filters[mql]=type%20is%20release";
//options.path = "/api/v2/projects/trunk_release/cards.xml?filters[mql]=type%20is%20release%20AND%20name='2015-03-r5'";
console.log("Path: " + options.path);
options.method = 'GET';
var request = https.request(options, responseReader);
request.on('socket', function(socket){
  socket.setTimeout(readTimeoutMilliseconds);
  socket.on('timeout', function(){
    console.log("WARNING: Connection to " +
                options.host + " timed out after " +
                readTimeoutMilliseconds + " milliseconds.");
    request.abort();
  });
});
request.end();
