process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
var options = {};
options.config = {
  instance: 'https://my.service-now.com',
  username: 'joes',
  password: "password"
};
options.argv = {};
process.argv.forEach(function (args, index, array) {
  if (index < 2) return;
  var s = args.split('=');
  var help = false;
  var key = (s.length > 0)?s[0].replace(/[\-\/]/g,''):'',
      val = (s.length == 2)?s[1]:undefined;
  switch(key) {
    case 'changerequest':
    case 'change':
    case 'c':
    case 'crq':
      options.argv['change'] = val;
      break;
    case 'help':
    case 'h':
    case '?':
      help = true;
    default:
      if (!help) console.log("ERROR: Did not recognize ["+key+"]");
      console.log("  -/--changerequest=[Change Request Number]");
      console.log("  -/--change=[Change Request Number]");
      console.log("  -/--crq=[Change Request Number]");
      console.log("  -/--c=[Change Request Number]");
      break;
  }
});
if (!options || !options.argv || !options.argv.change) {
  throw("ERROR: Please specify a Change Request number.");
}
var ServiceNow = require('servicenow');
var Util = require(__dirname + '/../lib/util');

var client = new ServiceNow.Client(options.config);

//Get the Change Request, 
client.getRecords("change_request", "number="+ options.argv.change, function(error, result) {
  if (error) {
    if (error.contains('<html>')) {
      console.error(Util.pretifyHTMLErrorReport("ServiceNow Error Response", error));
    } else {
      console.error("servicenow module threw error:" + error);
    }
  } else {
    console.log(JSON.stringify(result, null, 3));
  }
}, true, true);
