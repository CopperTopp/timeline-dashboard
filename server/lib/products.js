//This line helps get around self-signed certificates
// Necessary when talking to Mingle
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var fs = require('fs');
var Util = require(__dirname + '/util');
var nMingle_project_path = __dirname + '/../../node_modules/nMingle/lib/project';

var get_filtered_project = function(filter, callback) {
  var path = "/api/v2/projects/" + this.identifier + "/cards.xml?filters[mql]=" + encodeURIComponent(filter).replace('%3A',':');
  this.api.get(path, this.cardsConverter(callback));
};

var Products = function(searchDirectory, logger, callback){
  this.logger = logger;
  this.products = [];
  var p = this.products;
  fs.readdir(searchDirectory, function(err, files){
    if (err) {
      console.error("Reading Directory Failed: " + err);
      return;
    }
    files.forEach(function(file) {
      file = searchDirectory + '/' + file;
      fs.stat(file, function(err, stat){
        if (stat && stat.isFile()) {
          fs.readFile(file, 'utf8', function(err, contents) {
            if (err) {
              console.error('Error Reading Product File ['+file+']: ');
              console.error(err);
              return;
            }
            callback(JSON.parse(contents));
          });
        }
      });
    });
  });
};

Products.getCodeChanges = function(product_template, release, logger, callback) {
  if (product_template.adapters.mingle) {
    var Mingle = require('nMingle');
    var Project = require(nMingle_project_path);
    Project.prototype.getCardsFiltered = get_filtered_project;
    
    var mingle_options = product_template.adapters.mingle;
    mingle_options.rejectUnauthorized = false;
    mingle_options.requestCert = true;
    mingle_options.agent = false;
    
    var mingle = Mingle.create(mingle_options);
    //TODO: Remove or make an option
    mingle.debug = true;
    var filter = Util.replacePropertiesInString(product_template.change_filter, release);
    mingle.getProject("trunk_release", function(project, err) {
      if (err) {
        Util.showError("Mingle getProject", "trunk_release", err);
      } else if (project) {
        project.getCardsFiltered(filter, function(change_cards, err) {
          if (err) {
            Util.showError("Mingle getCardsFiltered", filter, err);
          } else {
            var changes = [];
            for (var i = 0, length = change_cards.length; i < length; i++) {
              change_card = Util.convertMingleProperties(change_cards[i]);
              changes.push(change_card);
            }
            callback(changes);
          } //end if (err)
        }); //end project.getCardsFiltered(callback)
      } //end if (project)
    });//end mingle.getProject(callback)
  }
};

Products.getReleases = function(product, product_template, callback) {
  if (product_template.adapters) {
    if (product_template.adapters.mingle) {
      var Mingle = require('nMingle');
      var Project = require(nMingle_project_path);
      Project.prototype.getCardsFiltered = get_filtered_project;
      
      var mingle_options = product_template.adapters.mingle;
      mingle_options.rejectUnauthorized = false;
      mingle_options.requestCert = true;
      mingle_options.agent = false;
      
      var mingle = Mingle.create(mingle_options);
      //TODO: Remove or make an option
      mingle.debug = true;
      var filter = Util.replacePropertiesInString(product_template.release_filter, product_template);
      mingle.getProject("trunk_release", function(project, err) {
        if (err) {
          Util.showError("Mingle getProject", "trunk_release", err);
        } else if (project) {
          project.getCardsFiltered(filter, function(cards, err) {
            if (err) {
              Util.showError("Mingle getCardsFiltered", filter, err);
            } else {
              var card, releases = [], release, raw_release;
              for (var i = 0, length = cards.length; i < length; i++) {
                card = Util.convertMingleProperties(cards[i]);
                releases.push(card);
              } //end for(cards.length)
              callback(releases);
            } //end if (err)
          }); //end project.getCardsFiltered(callback)
        } //end if (project)
      });//end mingle.getProject(callback)
    } else if (product_template.adapters.tfs) {
      //TODO: move timeouts into configuration
      var http = require('http');
      var readTimeoutMilliseconds = 180000;
      var readIntervalMilliseconds = 600000;
      var rootPath = "/DefaultCollection/" +
                     encodeURIComponent(product_template.adapters.tfs.project)
                     + "/workitems";
      
      var auth = 'Basic ' + new Buffer(product_template.adapters.tfs.username + ":" +
                                       product_template.adapters.tfs.password).toString('base64');
      var options = {
        host: product_template.adapters.tfs.host,
        port: product_template.adapters.tfs.port,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': auth
        }
      };
      
      var releases = [];
      var responseReader = function(response) {
        var msg = '';
        response.on('data', function(chunk) {
          msg += chunk;
        });
        response.on('end', function() {
          if (msg.indexOf('<html>') >= 0) {
            this.logger.warn("TFS Connection Error:\n" + String(msg).stripTags().s);
            Util.pretifyHTMLErrorReport("TFS Error Response", msg);
          } else {
            var jsonResponse = JSON.parse(msg);
            for (var i = 0, l = jsonResponse.length, wi; i < l; i++) {
              release_item = jsonResponse[i];
              releases.push(release_item);
            }
            callback(releases);
          }
        });
      };
      
      options.path = rootPath + '/Release%20Record/?filter=' +
                                encodeURIComponent(product_template.filter);
      options.method = 'GET';
      var request = http.request(options, responseReader);
      request.on('socket', function(socket){
        socket.setTimeout(readTimeoutMilliseconds);
        socket.on('timeout', function(){
          this.logger.warn("WARNING: Connection to [" +
                      options.path + "] timed out after " +
                      readTimeoutMilliseconds + " milliseconds.");
          request.abort();
        });
      });
      request.end();
    }
  }
};

Products.getItemFromServiceNow = function(servicenow_config, map, template, release_item, callback) {
  var ServiceNow = require('servicenow');
  var servicenow_client = new ServiceNow.Client(servicenow_config);
  servicenow_client.getRecords("change_request", "number=" + template.number, function(error, records) {
    if (records && records.records.length > 0) {
      var item_obj, item = records.records[0];
      //TODO: Rather than spitting out errors here, return to callback like others do.
      if (error) {
        if (error.contains('<html>')) {
          console.error(Util.pretifyHTMLErrorReport("ServiceNow Error Response", error));
        } else {
          console.error("servicenow module threw error ["+error+"]");
        }
      } else {
        item_obj = Util.parseMap2(map, {event_template: template, event_item: item, release_item: release_item});
        callback(item_obj.name, item_obj);
      }
    } else { //No records returned from ServiceNow
      callback(template.name, template);
    }
  }, true, true);
};

module.exports = Products;