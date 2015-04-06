// Run this as a service to refresh the Mongo DB with data.
(function() {
var Util = require(__dirname + '/lib/util');
var configs = require(__dirname + '/config.json');
var ID = require(__dirname + '/lib/id.js');

var Logger = require(__dirname + '/lib/logger')(configs.log4js_cm);
var logger = Logger.getLogger('data_reader');
logger.setLevel(configs.log4js_cm.default_level);

var mongoose = require('mongoose');

var Products = require(__dirname + '/lib/products');
var Services = require(__dirname + '/lib/services');

logger.info("Connection to MongoDB: " + configs.mongodb.server + " - " + configs.mongodb.db);
var connection = mongoose.createConnection(configs.mongodb.server, configs.mongodb.db);
var models;
connection.on('error', function(err) {
  Util.showError(logger, "Mongoose Connection", configs.mongodb.server + ", " + configs.mongodb.db, err);
});
connection.on('open', function(){
  logger.info("Connection open...");
  models = require(__dirname + '/lib/models.js')(connection, Logger.getLogger('mongoose'));
  populateReleases();
  //populateServices(); - On Hold

  setInterval(function() {
    populateReleases();
    //populateServices(); - On Hold
  }, configs.cache_polling_interval);
});

var populateReleases = function() {
  logger.info("Starting population...");
  var product, product_obj;
  var release, release_obj;
  var event, event_obj;
  var prod_logger = Logger.getLogger('product');
  var rel_logger = Logger.getLogger('release');
  var event_logger = Logger.getLogger('event');
  var change_logger = Logger.getLogger('code_change');
  var today = new Date();
  Products(__dirname + '/products', prod_logger, function(product_template) {
    product_obj = {
      name: product_template.name
    };
    product = new models.Product(ID.Product(product_obj));
    prod_logger.info("Creating Product: " + product.name);
    models.Product.findOneAndUpdate({_id: product._id}, product.toUpsert(), {upsert: true}, function(err) {
      if (err) {
        rel_logger.error("Failed to Save Product Failed:\n" + err);
      }
    });
    var rf_product = product;
    var rf_product_template = product_template;
    Products.getReleases(rf_product, rf_product_template, function(releases) {
      var r_product = rf_product;
      var r_product_template = rf_product_template;
      releases.forEach(function(release_item) {
        release_obj = Util.parseMap2(r_product_template.release_map, {release_item: release_item});
        release = new models.Release(ID.Release(r_product, release_obj));
        rel_logger.info("Creating Release ["+release.name+"] for Product ["+r_product.name+"]");
        release.product = r_product;
        r_product.releases.push(release);
        models.Release.findOneAndUpdate({_id: release._id}, release.toUpsert(), {upsert:true}, function(err) {
          if (err) {
            rel_logger.error("Failed to Save Release:\n" + err);
          }
        });
        models.Product.findOneAndUpdate({_id: r_product._id}, r_product.toUpsert(), {upsert:true}, function(err, rp) {
          if (err) {
            prod_logger.error("Failed to Save Product with Release update: \n" + err);
          } else {
            prod_logger.info("Product ["+rp._id+"] Saved.")
          }
        });
        var ef_product = r_product;
        var ef_product_template = r_product_template;
        var ef_release = release;
        var ef_release_item = release_item;
        var event_item;
        r_product_template.events.forEach(function(event_template) {
          event_item = Util.parseMap2(event_template, {release_item: ef_release_item});
          var e_product = ef_product;
          var e_product_template = ef_product_template;
          var e_release = ef_release;
          var e_release_item = ef_release_item;
          Products.getItemFromServiceNow(
            e_product_template.adapters.servicenow,
            e_product_template.event_map,
            event_item, e_release_item,
            function(event_name, event_obj) {
              if (event_obj) {
                event = new models.Event(ID.Event(e_product, e_release, event_obj));
                event_logger.info("Creating Event ["+event.name+"] for Product ["+e_product.name+"] and Release ["+e_release.name+"]");
                event.product = e_product;
                event.release = e_release;
                event.start_delta = event.start_time - today;
                event.end_delta = event.end_time - today;
                e_release.events.push(event);
                if (event.start_time && event.end_time) {
                  models.Event.findOneAndUpdate({_id: event._id}, event.toUpsert(), {upsert: true}, function(err, re){
                    if (err) {
                      event_logger.error("Failed to Save Event:\n" + err);
                    } else {
                      event_logger.info("Event ["+re._id+"] Saved.");
                    }
                  });
                  if (!e_release.start_time || event.start_time < e_release.start_time) {
                    e_release.start_time = event.start_time;
                    e_release.start_delta = e_release.start_time - today;
                  }
                  if (!e_release.end_time || event.end_time > e_release.end_time) {
                    e_release.end_time = event.end_time;
                    e_release.end_delta = e_release.end_time - today;
                  }
                }
                //Don't keep a release that doesn't have a start and end time.
                if (e_release.start_time && e_release.end_time) {
                  models.Release.findOneAndUpdate({_id: e_release._id}, e_release.toUpsert(), {upsert: true}, function(err, re) {
                    if (err) {
                      rel_logger.error("Failed to Save Release with updated Events and Timestamps:\n" + err);
                    } else {
                      rel_logger.info("Release ["+re._id+"] Update Saved.");
                    }
                  });
                } else {
                  models.Release.remove({_id: e_release._id}).exec();
                  e_product.releases.remove(e_release);
                  models.Product.findOneAndUpdate({_id: e_product._id}, e_product.toUpsert(), {upsert: true}, function(err, ep) {
                    if (err) {
                      prod_logger.error("Failed to Save Product after removing Release:\n" + err);
                    } else {
                      prod_logger.info("Product ["+ep._id+"] Update Saved.");
                    }
                  })
                }
              }
            });
        });//End events.forEach
        
        
        
        if (product_template.change_filter) {
          var code_change;
          var c_product = r_product;
          var c_product_template = r_product_template;
          var c_release = release;
          var c_release_item = release_item;
          Products.getCodeChanges(c_product_template, release, change_logger, function(code_changes) {
            if (code_changes) {
              code_changes.forEach(function(code_change_item) {
                code_change_obj = Util.parseMap2(c_product_template.change_map, {change_item: code_change_item});
                code_change = new models.CodeChange(ID.CodeChange(c_product, c_release, code_change_obj));
                change_logger.info("Creating Code Change ["+code_change.name+"] for Product ["+c_product.name+"] and Release ["+c_release.name+"]");
                code_change.product = c_product;
                code_change.release = c_release;
                models.CodeChange.findOneAndUpdate({_id: code_change._id}, code_change.toUpsert(), {upsert: true}, function(err, rcc) {
                  if (err) {
                    change_logger.error("Failed to Save CodeChange:\n" + err);
                  } else {
                    change_logger.info("CodeChange ["+rcc._id+"] Saved.");
                  }
                });
                c_release.code_changes.push(code_change);
                models.Release.findOneAndUpdate({_id: c_release._id}, c_release.toUpsert(), {upsert: true}, function(err, cr) {
                  if (err) {
                    rel_logger.error("Failed to Save Release with updated Code Changes:\n" + err);
                  } else {
                    rel_logger.info("Release ["+cr._id+"] Saved.")
                  }
                });
              });
            } else {
              change_logger.info("No Code Changes for Product ["+c_product_template.name+"] and Release ["+c_release.name+"]");
            }
          });
        }
      });//End releases.forEach
    });//End Products.getReleases
  });//End Products() constructor.
};//End populate()

var populateServices = function() {
  //**********************************************************
  //*  On indefinite hold 'til Product to Service relationship
  //*   if formalized in some manner.
  //**********************************************************
  //var services = new Services();
  //services.getServices(configs.seiso.uri + configs.seiso.page_size, function(services) {
  //Services(configs.seiso.uri + configs.seiso.page_size, function(services) {
  //  //console.log(services);
  //  services.forEach(function(service_item) {
  //  });
  //});//End services.getServices()
};
})();