var http = require('http');

var readTimeoutMilliseconds = 60000;
var readIntervalMilliseconds = 600000;
var rootPath = "/DefaultCollection/TFS%20Project%20Name/workitems";
var username = 'joes';
var password = 'password';
var auth = 'Basic ' + new Buffer(username + ":" + password).toString('base64');
console.log("Auth: " + auth);
var options = {
  host: 'tfs.rest.api',
  port: '18080',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': auth
  },
  argv: {}
};

var responseReader = function(response) {
  var msg = '';
  response.on('data', function(chunk){
    msg += chunk;
  });
  response.on('end', function() {
    console.log(msg);
    var jsonResponse = JSON.parse(msg);
    for (var i = 0, l = jsonResponse.length, wi; i < l; i++) {
      wi = jsonResponse[i];
      console.log('Title        [' + wi.systemTitle + ']');
      console.log('Release Type [' + wi.t2ReleaseType + ']');
      console.log('State        [' + wi.systemState + ']');
      console.log(wi);
      console.log(options);
      console.log('');
    }
  });
};

process.argv.forEach(function (args, index, array) {
  if (index < 2) return;
  var s = args.split('=');
  var help = false;
  var key = (s.length > 0)?s[0].replace(/[\-\/]/g,''):'',
      val = (s.length == 2)?s[1]:undefined;
  switch(key) {
    case 'project':
    case 'p':
      options.argv['project'] = val;
      break;
    case 'help':
    case 'h':
    case '?':
      help = true;
    default:
      if (!help) console.log("ERROR: Did not recognize ["+key+"]");
      console.log("  -/--project=[project]");
      console.log("  -/--p=[project]");
      break;
  }
});

if (!options.argv['project']) {
  throw "Must specify the 'project' to read."
}

switch (options.argv.project.toLowerCase()) {
  case 'cars':
    options.path = rootPath + '/Release%20Record/?filter=' +
                              encodeURIComponent('Group="CARS" AND') +
                              encodeURIComponent('(T2.ReleaseType="Major Release" OR T2.ReleaseType="Minor Release" OR T2.ReleaseType="Maintenance")');
    break;
  case 'airint':
  case 'air':
    options.path = rootPath + '/Release%20Record/?filter=' +
                              encodeURIComponent('Group="Air" AND Title Contains "AirINT"');
    break;
  case 'bfs':
    options.path = rootPath + '/Release%20Record/?filter=' +
                              encodeURIComponent('Group="BFS"');
    break;
  default:
    break;
}

console.log("Path: " + options.path);
options.method = 'GET';
var request = http.request(options, responseReader);
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
