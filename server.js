var express = require('express'),
    Mongoose = require('mongoose');
var Util = require(__dirname + '/server/lib/util');
var configs = require(__dirname + '/server/config.json');

var Logger = require(__dirname + '/server/lib/logger')(configs.log4js_srv);
var logger = Logger.getLogger('server');
logger.setLevel(configs.log4js_srv.default_level);

var connection = Mongoose.createConnection(configs.mongodb.server, configs.mongodb.db);
var models;

connection.on('error', function(err) {
  Util.showError(logger, "Mongoose Connection", configs.mongodb.uri, err);
});

connection.on('open', function() {
  models = require(__dirname + '/server/lib/models.js')(connection, Logger.getLogger('mongoose'));
});

var app = express();
app.use('/product_view', express.static(__dirname + '/web/product_view'));
app.use('/release_view', express.static(__dirname + '/web/release_view'));
app.use('/directives', express.static(__dirname + '/web/directives'));
app.use('/services', express.static(__dirname + '/web/services'));
app.use('/scripts', express.static(__dirname + '/web/scripts'));
app.use('/styles', express.static(__dirname + '/web/styles'));


app.get('/app.js', function(req, res) {
  res.sendFile(__dirname + '/web/app.js');
});
app.get('/routes.js', function(req, res) {
  res.sendFile(__dirname + '/web/routes.js');
});
app.get('/api/v1/products', function(req, res) {
  logger.info("Express Mongoose Product.find() started...");
  models.Product.find({}, function(err, products) {
    logger.info("Express Mongoose Product.find() returned...");
    if (err) {
      res.status(500).json({error: "Failed to get products: " + err});
    } else {
      res.json(products);
    }
  });
});

app.get('/api/v1/product/:product_id/releases', function(req, res, next) {
  var product_id = req.params.product_id;
  logger.info('Getting Product Releases...');
  models.Product.find({ _id: product_id }).populate('releases').exec(function(err, product) {
    if (err) {
      res.status(500).json({error: "Failed to get products: " + err});
    } else if (!product) {
      res.status(404).json({error: "Product id ["+product_id+"] not found."});
    } else {
      res.json(product[0].releases);
    }
  });
});

app.get('/api/v1/product/:product_id/domain', function(req, res, next) {
  var product_id = req.params.product_id;
  logger.info('Getting Product Date Range Domain...');
  models.Release.find({product: product_id})
                 .sort('start_time')
                 .exec(function(err, releases) {
    if (err) {
      res.status(500).json({error: "Failed to get products for domain-get: " + err});
    } else if (!releases) {
      res.status(404).json({error: "Product id ["+product_id+"] not found."});
    } else {
      var old_release = releases[0], new_release;
      for (var i = 0, l = releases.length, release; i < l; i++) {
        release = releases[i];
        if (release.end_delta < 0 && release.end_delta > old_release.end_delta) {
          old_release = release;
          //if release is the last of the array, use 'today' as the end of the range
          if (i + 1 < l) {
            new_release = releases[i+1];
          } else {
            new_release = {
              end_time: new Date()
            }
          }
        }
        //Once we hit a positive delta, we're at "today" so stop looking for an 'old_release'.
        if (release.end_delta > 0) {
          //Case: this release straddle's today, so pick 3, the ones before and after this one.
          if (release.start_delta < 0) {
            //if release is releases[0], use 'today' as the start of the range
            if (i - 1 > 0) {
              old_release = releases[i-1];
            } else {
              old_release = {
                start_time: new Date()
              }
            }
            //if release is the last of the array, use 'today' as the end of the range
            if (i + 1 < l) {
              new_release = releases[i+1];
            } else {
              new_release = {
                end_time: new Date()
              }
            }
          }
          break;
        }
      }
      if (old_release && new_release) {
        res.json({
          start_time: old_release.start_time,
          end_time:   new_release.end_time
        });
      } else {
        res.status(500).json({error: "Failed to find releases:"
                             + " \n\tFirst release:  " + JSON.stringify(old_release, null, 2)
                             + " \n\tSecond release: " + JSON.stringify(new_release, null, 2)});
      }
    }
  });
});

app.get('/api/v1/product/:product_id/releases/countbyyear', function(req, res) {
  console.log("Getting year-by-year count of releases");
  var product_id = req.params.product_id;
  console.log("Getting Count for Product: " + product_id);
  models.Release.find({product: product_id}).exec(function(err, releases) {
    console.log("Returned list of releases: " + releases.length);
    var counter = {};
    for (var i = 0, l = releases.length, r, year, date; i < l; i++) {
      r = releases[i];
      date = new Date(r.start_time);
      year = date.getFullYear();
      if (counter[year]) {
        counter[year].count++;
      } else {
        counter[year] = {
          year: year,
          count: 1
        };
      }
    }
    var result = [];
    for (year in counter) {
      result.push(counter[year]);
    }
    res.json(result);
  });
});

app.get('/api/v1/releases', function(req, res, next) {
  logger.info("Getting Releases...");
  models.Release.find({})
        .populate('product')
        .exec(function(err, releases) {
    if (err) return next(err);
    if (!releases) return next("No Releases Found.");
    //Clean out "bad" data points
    var ret_releases = [];
    for (var i = 0, l = releases.length, release; i < l; i++) {
      release = releases[i];
      if (release.start_time && release.end_time) {
        ret_releases.push(release);
      }
    }
    res.json(ret_releases);
    return ret_releases;
  });
});

app.get('/api/v1/release/:release_id/domain', function(req, res, next) {
  var release_id = req.params.release_id;
  logger.info('Getting Release Date Range Domain...');
  models.Release.findOne({_id: release_id})
                 .populate('events')
                 .exec(function(err, release) {
    if (err) {
      res.status(500).json({error: "Failed to get release for domain-get: " + err});
    } else if (!release) {
      res.status(404).json({error: "Release id ["+release_id+"] not found."});
    } else {
      var domain = {
        start_time: new Date(release.events[0].start_time),
        end_time: new Date(release.events[0].end_time)
      };
      for (var i = 0, l = release.events.length, event; i < l; i++) {
        event = release.events[i];
        event.start_time = new Date(event.start_time);
        event.end_time = new Date(event.end_time);
        if (event.start_time < domain.start_time) {
          domain.start_time = event.start_time;
        }
        if (event.end_time > domain.end_time) {
          domain.end_time = event.end_time;
        }
      }
      res.json(domain);
    }
  });
});

app.get('/api/v1/release/:release_id', function(req, res, next) {
  console.log("Looking for release: " + req.params.release_id);
  models.Release.findOne({_id: req.params.release_id})
    .populate({
      path: 'product',
      select: '_id name'
    })
    .populate('events')
    .populate('code_changes')
    .exec(function(err, release) {
      res.json(release);
    });
});

app.get('/api/v1/events', function(req, res) {
  console.log("Getting all Events");
  models.Event.find({})
    .populate({
      path: 'product',
      select: '_id name'
    })
    .populate({
      path: 'release',
      select: '_id name'
    })
    .exec(function(err, events) {
      res.json(events);
    });
});

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/web/index.html');
});
app.get('*', function(req, res) {
  res.sendFile(__dirname + '/web/index.html');
});

app.listen(8080);
