var Util = require(__dirname + '/lib/util');
var rest_client = require('restler');

var service_map = {
  "name":                   "service_instance.service.name",
  "description":            "service_instance.service.description",
  "group":                  "service_instance.service.group.name",
  "owner.firstname":        "service_instance.service.owner.firstName",
  "owner.lastname":         "service_instance.service.owner.lastName",
  "owner.username":         "service_instance.service.owner.username",
  "owner.email":            "service_instance.service.owner.email",
  "data_center":            "service_instance.dataCenter.name",
  "region":                 "service_instance.dataCenter.region.name",
  "environment":            "service_instance.environment.name",
  "load_balancer.name":     "service_instance.loadBalancer.name",
  "load_balancer.type":     "service_instance.loadBalancer.type",
  "nodes[service_instance.nodes]": {
    "name":                   "array_item.name",
    "health":                 "array_item.healthStatus.name",
    "ipAddresses[array_item.ipAddresses]": {
      "ip":                     "array_item.ipAddress",
      "endpoints[array_item.endpoints]": {
        "port":                   "array_item.port.number",
        "protocol":               "array_item.port.protocol",
        "rotationStatus.state":   "array_item.rotationStatus.key",
        "rotationStatus.success": "array_item.rotationStatus.statusType.key"
      }
    }
  }
};

var start_uri = "https://seisoapi.server.domain/v1/service-instances?view=default&page=0&size=200";
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
    //console.log("\n*************************************************************************");
    //console.log(service_instance);
    //console.log(response.headers);
    //console.log("*************************************************************************");
    callback(service_instance);
  };
  
  rest_client.get(uri, options).on('complete', process_result);
};

var get_service_instance_uris = function(uri, callback) {
  var services = [];
  var uri_list = [];
  var next_uri;
  var process_result = function(service_instances, response) {
    //console.log("\n*************************************************************************");
    //console.log(service_instances);
    //console.log(response.headers);
    //console.log("*************************************************************************");
    //overall = overall.concat(result);
    service_instances.forEach(function(service_instance_item) {
      uri_list.push(service_instance_item._self);
      get_service_instance(service_instance_item._self, function(service_instance) {
        var data = {}; data['service_instance'] = service_instance;
        var service_object = Util.parseMap2(service_map, data);
        //console.log(service_object);
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

get_service_instance_uris(start_uri, function(service_instance_uris) {
  console.log(JSON.stringify(service_instance_uris, null, 2));
  console.log("Services Found: " + service_instance_uris.length);
  console.log(service_instance_uris[0]);
});