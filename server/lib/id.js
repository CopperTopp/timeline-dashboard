//
//  This class holds all the _id generators for Mongoose/MongoDB, yet
//    still knowable without the target item existing in the db.
//  Previously, for references and populate() to work, the reference detaults to
//    an ObjectID, which is a generated alphanumeric from the MongoDB stored as _id.
//    To get this _id, the item had to be stored in the database to be issued it's
//      final _id value.
//    This lead to race conditions as nodejs is submitting things for writting asynchronously.
//    This class is an attempt to know the _id BEFORE it exists, by generating a unique string
//      based on knowable metadata, such as the name of a product, or the seiso key of a service instance.
//    This way, the 'ref' value can be set without having to have that item exist in the database, and
//      the race condition goes away.
//  They have been externalized such that they are a reminder of what makes the ID,
//    as their data will come from data not necessarily available in a given element.
//  It also gives us a place to put in validation that we are generating a unique _id
//
var ID = function() {};

//Makes sure non-alphanumerics don't end up in key, just in case...
var normalize_string = function(str) {
  return str.trim().replace(/[^a-z0-9]+/gi, '_');
};

//Make sure each passed in obj is not null or empty and has a .name property
var validate_obj = function(caller, objects) {
  var ret = {};
  ret.error = "ERROR: Must provide ";
  ret.fail = false;
  for (var obj_name in objects) {
    if (!objects[obj_name]) {
      if (ret.fail) ret.error += " and ";
      ret.error += obj_name;
      ret.fail = true;
    } else if (!objects[obj_name].name) {
      if (ret.fail) ret.error += " and ";
      ret.error += obj_name + '.name';
      ret.fail = true;
    }
  }
  ret.error += " to "+caller+".";
  
  return ret;
}

ID.Product = function(product_obj) {
  var validate = validate_obj("ID.Product(product_obj)", {'product_obj': product_obj});
  if (validate.fail) {
    throw validate.error;
  } else {
    product_obj._id = normalize_string(product_obj.name);
  }
  return product_obj;
};

ID.Release = function(product_obj, release_obj) {
  var validate = validate_obj("ID.Release(product_obj, release_obj)",
                              {
                                'release_obj': release_obj,
                                'product_obj': product_obj
                              });
  if (validate.fail) {
    throw validate.error;
  } else {
    release_obj._id = normalize_string(product_obj.name + '_' + release_obj.name);
  }
  
  return release_obj;
};

ID.Service = function(product_obj, service_obj) {
  var validate = validate_obj("ID.Service(product_obj, service_obj)",
                              {
                                'product_obj': product_obj,
                                'service_obj': service_obj
                              });
  if (validate.fail) {
    throw validate.error;
  } else {
    service_obj._id = normalize_string(product_obj.name + '_' + service_obj.name);
  }
  
  return service_obj;
};

ID.Event = function(product_obj, release_obj, event_obj) {
  var validate = validate_obj("ID.Event(product_obj, release_obj, event_obj)",
                              {
                                'product_obj': product_obj,
                                'release_obj': release_obj,
                                'event_obj':   event_obj
                              });
  if (validate.fail) {
    throw validate.error;
  } else {
    event_obj._id = normalize_string(product_obj.name + '_' + release_obj.name + '_' + event_obj.name);
  }
  return event_obj;
};

ID.CodeChange = function(product_obj, release_obj, codechange_obj) {
  var validate = validate_obj("ID.CodeChange(product_obj, release_obj, codechange_obj)",
                              {
                                'product_obj':    product_obj,
                                'release_obj':    release_obj,
                                'codechange_obj': codechange_obj
                              });
  if (validate.fail) {
    throw validate.error;
  } else {
    codechange_obj._id = normalize_string(product_obj.name + '_' + release_obj.name + '_' + codechange_obj.name);
  }
  return codechange_obj;
};

ID.ServiceInstance = function(serviceinstance_obj) {
  //ServiceInstance is the only current obj target that uses 'key' rather than 'name', so
  //  normalize to 'name' so that helper functions don't need one-off code.
  serviceinstance_obj.name = serviceinstance_obj.key;
  var validate = validate_obj("ID.ServiceInstance(serviceinstance_obj)", {'serviceinstance_obj': serviceinstance_obj});
  if (validate.fail) {
    throw validate.error;
  } else {
    serviceinstance_obj._id = normalize_string(serviceinstance_obj.key);
  }
  //Remove normalization as we no longer need it and it could get in the way later...
  delete serviceinstance_obj.name;
  
  return serviceinstance_obj;
};

ID.Node = function(node_obj) {
  var validate = validate_obj("ID.Node(node_obj)", {'node_obj': node_obj});
  if (validate.fail) {
    throw validate.error;
  } else {
    node_obj._id = normalize_string(node_obj.name);
  }
  return node_obj;
};

module.exports = ID;