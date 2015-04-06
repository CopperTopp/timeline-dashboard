throw "Under Construction";

var Util = require(__dirname + '/../lib/util');
var configs = require(__dirname + '/../config.json');
var Logger = require(__dirname + '/../lib/logger')(configs.log4js_cm);
var logger = Logger.getLogger('cache_manager');
logger.setLevel(configs.log4js_cm.default_level);
var Mongoose = require('mongoose');
var cachedb = Mongoose.createConnection(configs.mongodb.server, configs.mongodb.db);
cachedb.on('error', function(err) {
  Util.showError(logger, "Mongoose Connection", configs.mongodb.server + ", " + configs.mongodb.db, err);
});
var Models = require(__dirname + "/../lib/models")(Mongoose, cachedb, configs.mongoose);
//List Products               -p=*
//Get ProductByName           -p=<name>
//List ReleasesByProductName  -p=<name> -r=*
//Get ReleaseByName           -r=<name>
//List EventsByReleaseName    -r=<name> -e=*
//Get EventByName             -e=<name>
//List ChangesByReleaseName   -r=<name> -c=*
//Get ChangeByCRQ             -c=<CRQ>
var help = function() {
      console.log("  -/--p=*|[Product Name]");
      console.log("  -/--r=*|[Release Name]");
      console.log("  -/--e=*|[Event Name]");
      console.log("  -/--c=*|[Change Request Number]");
}
options = {};
//options['product'] = '*';
//options['release'] = '*';
//options['event'] = '*';
//options['change'] = '*';
process.argv.forEach(function (args, index, array) {
  if (index < 2) return;
  var s = args.split('=');
  var help = false;
  var key = (s.length > 0)?s[0].replace(/[\-\/]/g,''):'',
      val = (s.length == 2)?s[1]:undefined;
  switch(key.toLowerCase()) {
    case 'product':
    case 'p':
      options['product'] = val;
      break;
    case 'release':
    case 'r':
      options['release'] = val;
      break;
    case 'event':
    case 'e':
      options['event'] = val;
      break;
    case 'changerequest':
    case 'change':
    case 'c':
    case 'crq':
      options['change'] = val;
      break;
    case 'help':
    case 'h':
    case '?':
      help();
      break;
    default:
      console.log("ERROR: Did not recognize ["+key+"]");
      help();
      throw "Option Not Recognized";
      break;
  }
});

cachedb.on('open', function(){
  logger.info("Connection open...");
  query();
  setInterval(function() {
    query();
  }, configs.cache_polling_interval);
});

var query =function() {
  var query = {};
  if (options['change']) {
    if (options.change != '*') {
      query = {
        number: options.change
      };
    }
    if (options.release) {
      query.release = {
        name: options.release
      };
    }
    if (options.product) {
      query.product = {
        name: options.product
      };
    }
    console.log(query);
    Models.Change.find(query).populate('product').populate('release').exec(function(err, changes) {
      for (change in changes) {
        console.log(changes[change]);
      }
      cachedb.close();
    });
  }
}