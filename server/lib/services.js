var Util = require(__dirname + '/util');
var rest_client = require('restler');
var service_map = require(__dirname + '/service_map.json');

module.exports = function(root_uri, callback) {
  console.log("TOP Root URI: " + root_uri);
  var options = {
    rejectUnauthorized: false,
    headers: {
      'Accept': 'application/json',
      'X-User-Agent': 'Release Dashboard Investigation'
    }
  };
  
  var get_service_instance = function(uri, callback) {
    var uri_list = [];
    var next_uri;
    var process_result = function(service_instance, response) {
      callback(service_instance);
    };
    
    rest_client.get(uri, options).on('complete', process_result);
  };
  
  var get_service_instances = function(uri, callback) {
    var services = [];
    var uri_list = [];
    var next_uri;
    var process_result = function(service_instances, response) {
      service_instances.forEach(function(service_instance_item) {
        uri_list.push(service_instance_item._self);
        get_service_instance(service_instance_item._self, function(service_instance) {
          var data = {}; data['service_instance'] = service_instance;
          var service_object = Util.parseMap2(service_map, data);
          services.push(service_object);
        });
      });
      next_uri = response.headers['x-pagination-next'];
      if (next_uri) {
        rest_client.get(next_uri, options).on('complete', process_result);
      } else {
        callback(services);
      }
    };
    
    rest_client.get(uri, options).on('complete', process_result);
  };
  
  console.log("Root URI: " + root_uri);
  get_service_instances(root_uri, function(service_instances) {
    callback(service_instances);
  });
};