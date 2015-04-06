var S = require('string');
S.extendPrototype();

var define_parseMap2 = function(map, data_sources) {
  var result = {}, source_target, obj, objs;
  var i, l, array_name, array_map, array_key, array_key_name, array_key_key;
  for (key in map) {
    //Change all instances of map keys in source target
    //  Supports "object.object[other_obj.id_key]" so one obj can reference another    
    source_target = map[key];
    var key_reg;
    for (source_key in data_sources) {
      //Using regexp for global find and replace.
      key_reg = new RegExp(source_key, "g");
      source_target = source_target.replace(key_reg, "data_sources." + source_key);
    }
    
    // if the key has a bracket, enter into array handling
    // assumes format of "new_array_name[source_data_item.source_array_name]
    if (key.indexOf('[') > 0) {
      objs = key.replace(']','').split('[');
      array_name = objs[0];
      array_key = objs[1];
      array_key_name = array_key.split('.')[0];
      array_key_key = array_key.split('.')[1];
      array_map = map[key];
      result[array_name] = [];
      //for each iteration of the source array, process it recursively
      if (data_sources[array_key_name] && data_sources[array_key_name][array_key_key]) {
        data_sources[array_key_name][array_key_key].forEach(function (array_item) {
          result[array_name].push(define_parseMap2(array_map, {'array_item': array_item}));
        });
      }
    }
    else
    {
      // if the key is dotted, like key="obj.obj2.prop", then we have to run through and create objects
      //   result.obj = {};
      //   result.obj.obj2 = {};
      // so that we can do
      //   result.obj.obj2.prop = value;
      if (key.indexOf('.') > 0) {
        objs = key.split('.');
        obj = "result";
        for (i = 0, l = objs.length - 1; i < l; i++) {
          obj += '.' + objs[i];
          // Don't set if already an object, or we might lose previously set data.
          eval("if (" + obj + " === undefined || typeof " + obj + " !== 'object') { " + obj + " = {}; }");
        }
      }
      var eval_string;
      try {
        if (map[key][0] === '=') {
          eval_string = "result." + key + map[key];
        } else {
          eval_string = "result." + key + " = " + source_target;
        }
        eval(eval_string);
      }
      catch(exception){
        console.error("Failed to eval [" + eval_string + "] :\n" + exception);
      }
    }
  }
  return result;
};

var Util = {
  //makeDir - More resilient directory creation, creating full path if not there
  makeDirSync: function(dir, mode) {
    var path = require('path');
    var fs = require('fs');
    try {
      fs.mkdirSync(dir, mode);
    } catch (e) {
      if (e.code === 'ENOENT' && e.errno === 34) {
        this.makeDirSync(path.dirname(e.path));
        fs.mkdirSync(e.path);
      } else if (e.code === 'EEXIST' && e.errno === 47) {
        console.log("Directory ["+e.path+"] already exists, skipping creation...");
      } else {
        console.log("makeDirSync Error ["+JSON.stringify(e, null, 2)+"]");
      }
    }
  },
  
  //Helper function, designed to accompany parseMap() for Mingle timestamps, called from within mapped string
  //  Example: "start_time": "this.joinMingleDateTime(release_item.properties[event_item.date], release_item.properties[event_item.start])"
  joinMingleDateTime: function(date, time) {
    var y, mo, d, h = 0, mi = 0, datetime, sm;
    if (date) {
      var split = date.split('-');
      y = parseInt(split[0], 10);
      mo = parseInt(split[1], 10) - 1; //convert 1-12 to 0-11
      d = parseInt(split[2], 10);
      if (time) {
        h = parseInt(time.substring(0,2), 10);
        sm = time.substring(2,2);
        if (sm) {
          mi = parseInt(sm, 10);
        } else {
          mi = 0;
        }
      }
      //console.log("y["+y+"] mo["+mo+"] d["+d+"] h["+h+"] mi["+mi+"]");
      datetime = new Date(y, mo, d, h, mi);
    }
    return datetime;
  },
  
  //replacePropertiesInString - Replace %property% tokens in a string with the value of container.property,
  //    so 'string' is the string to process, and 'container' is the parent object
  //    containing the properties.
  //  Wanted to use without container, but javascript protects global var values
  //  and while global property names are available under global object,
  //  the values are not accessible.
  replacePropertiesInString: function(string, container){
    //Recursively read down object values to support JSON, handling
    //  property references like 'obj.group.subgroup.property'
    var readProperty = function(container, names) {
      var parent = names.shift();
      if (names.length === 0) {
        return container[parent];
      } else {
        return readProperty(container[parent], names);
      }
    }
    return string.replace(/%(.*?)%/gi, function(match, capture) {
      if(capture.match(/[a-z0-9_]+\[[a-z0-9_]+\]/i)) {
        var arritm = capture.match(/([a-z0-9_]+)\[([a-z0-9_]+)\]/i);
        if (container[arritm[1]] === undefined) {
          return undefined;
        } else {
          return container[arritm[1]][arritm[2]];
        }
      }
      else {
        var names = capture.split('.');
        return readProperty(container, names);
      }
    });
  },
  
  //convertMingleProperties - Converts Mingle card.properties.property[i].name
  //            and card.properties.property[i].value
  //             to card.properties.name = value
  convertMingleProperties: function(card) {
    var properties = card.properties.property;
    var property;
    for (var i = 0, l = properties.length; i < l; i++) {
      property = card.properties.property[i];
      card.properties[property.name] = property.value;
    }
    delete card.properties["property"];
    return card;
  },
  
  //parseMap - Designed to map values in release_item, event_item, change_template, and change_item
  //  into a single, returned object, using the map object parameter to define the mapping.
  // Intended to help when reading into models.
  // Example:
  //  var map = {
  //    "name": "release_item.name",
  //    "title": "release_item.title + ' [' + release_item.type + ']'" 
  //  };
  //  var release_item = {
  //    name: "2099-01-r1",
  //    title: "My Release Title",
  //    type: "Major Release"
  //  };
  //  var release_obj = Util.parseMap(map, release_item);
  // Would set rlease_obj to:
  //  release_obj = {
  //    name: "2099-01-r1",
  //    title: "My Release Title [Major Release]"
  //  }
  //
  // Take care to use names matching what are in the function definition as it won't
  // Modified to deal with key = "ri.obj.prop" to read ri.obj.prop
  //      and not ri["obj.prop"] as they are two different references.
  parseMap: function(map, release_item, event_item, change_template, change_item) {
    var result = {}, obj, objs, i, l;
    for (key in map) {
      // if the key is dotted, like key="obj.obj2.prop", then we have to run through and create objects
      //   result.obj = {};
      //   result.obj.obj2 = {};
      // so that we can do
      //   result.obj.obj2.prop = value;
      if (key.indexOf('.') > 0) {
        objs = key.split('.');
        obj = "result";
        for (i = 0, l = objs.length - 1; i < l; i++) {
          obj += '.' + objs[i];
          // Don't set if already an object, or we might lose previously set data.
          eval("if (" + obj + " === undefined || typeof " + obj + " !== 'object') { " + obj + " = {}; }");
        }
      }
      eval("result." + key + " = " + map[key]);
    }
    return result;
  },
  //parseMap2 - Designed to be more generic than parseMap.  Instead of locking to the data objects
  //   in the definition of parseMap, assign the objects as properties of one object, data, then hand
  //   only the data object in.  Then parseMap will search the handed in data object for the mapped
  //   source values.
  // Intended to help when reading into models.
  // Example:
  //  //Note that we depend on two source objects, release_item and product_item
  //  var map = {
  //    "name": "release_item.name",
  //    "title": "release_item.title + ' [' + release_item.type + ']'",
  //    "product": "product_item.name"
  //  };
  //  //The data source objects for the map
  //  var product_item = {
  //    name: "ExpWeb"
  //  };
  //  var release_item = {
  //    name: "2099-01-r1",
  //    title: "My Release Title",
  //    type: "Major Release"
  //  };
  //  //Add the data source objects to a single object, data (name unimportant)
  //  var data = {};
  //  var data['product_item'] = product_item;
  //  var data['release_item'] = release_item;
  //  //Hand the data object to parseMap2
  //  var release_obj = Util.parseMap2(map, release_item);
  //
  // Would set rlease_obj to:
  //  release_obj = {
  //    name: "2099-01-r1",
  //    title: "My Release Title [Major Release]",
  //    product: "ExpWeb"
  //  }
  //
  // Added handling of embedded arrays
  // Note that inside the array mapping, 'array_item' is a special
  // variable that represents a single iteration of the source array.
  // It is automatically scoped for the array it is in.
  //  var map = {
  //    "name": "release_item.name",
  //    "items[release_item.nodes]": {
  //      "name":  "array_item.name",
  //      "subitems[array_item.subnodes]": [
  //        "name": "array_item.name"
  //      ]
  //    }
  //  };
  //  //The data source objects for the map
  //  var release_item = {
  //    name: "2099-01-r1",
  //    title: "My Release Title",
  //    nodes: [
  //      {
  //        name: "node1",
  //        subnodes: [
  //          {
  //            name: "node11"
  //          },
  //        subnodes: [
  //          {
  //            name: "node12"
  //          },
  //        ]
  //      },
  //      {
  //        name: "node2",
  //        subnodes: [
  //          {
  //            name: "node21"
  //          },
  //        subnodes: [
  //          {
  //            name: "node22"
  //          },
  //        ]
  //      }
  //    ]
  //  };
  //  //Add the data source objects to a single object, data (name unimportant)
  //  var data = {};
  //  var data['release_item'] = release_item;
  //  //Hand the data object to parseMap2
  //  var release_obj = Util.parseMap2(map, release_item);
  //
  // Would set rlease_obj to:
  //  release_obj = {
  //    name: "2099-01-r1",
  //    items: [
  //      {
  //        name: "node1"
  //        subitems: [
  //          {name: "node11"}
  //          {name: "node12"}
  //        ]
  //      },
  //      {
  //        name: "node2"
  //        subitems: [
  //          {name: "node21"}
  //          {name: "node22"}
  //        ]
  //      }
  //    ]
  //  }
  //
  // 2/14/2015 - Added handling of '=' leading a quoted string value to mean to not do mapping, just place that string in the field.
  //   "name": "='SOAK'",
  // In a map would result in the 'name' field being set to 'SOAK', not a search for a field named 'SOAK'.
  parseMap2: define_parseMap2,
  
  //pretifyHTMLErrorReport - Converts html error response from web services to a human readable console error string.
  //  Depends on npm's 'string' package "npm install string".
  // Turns:
  //    <html>
  //      <head>
  //        <title>ServiceNow - Error report</title>
  //        <style>
  //        <!--
  //        H1 {font-family:Tahoma,Arial,sans-serif;color:white;background-color:#525D76;font-size:22px;}
  //        H2 {font-family:Tahoma,Arial,sans-serif;color:white;background-color:#525D76;font-size:16px;}
  //        H3 {font-family:Tahoma,Arial,sans-serif;color:white;background-color:#525D76;font-size:14px;}
  //        BODY {font-family:Tahoma,Arial,sans-serif;color:black;background-color:white;}
  //        B {font-family:Tahoma,Arial,sans-serif;color:white;background-color:#525D76;}
  //        P {font-family:Tahoma,Arial,sans-serif;background:white;color:black;font-size:12px;}
  //        A {color : black;}
  //        A.name {color : black;}
  //        HR {color : #525D76;}
  //        -->
  //        </style>
  //      </head>
  //      <body>
  //        <h1>HTTP Status 401 - </h1>
  //        <HR size="1" noshade="noshade">
  //          <p><b>type</b> Status report</p>
  //          <p><b>message</b> <u></u></p>
  //          <p><b>description</b> <u>This request requires HTTP authentication.</u></p>
  //          <HR size="1" noshade="noshade">
  //            <h3>ServiceNow</h3>
  //      </body>
  //    </html>
  // To: (with 'header' parameter set to "ServiceNow Error Response")
  //      ServiceNow Error Response [
  //              HTTP Status 401 -
  //              type:    Status report
  //              message:
  //              description:     This request requires HTTP authentication.
  //              ServiceNow
  //      ]
  pretifyHTMLErrorReport: function(header, html) {
      var prettyError = html.between('<body>', '</body>');
      prettyError = prettyError.replaceAll('<p>', "\t");
      prettyError = prettyError.replaceAll('</p>', "\n");
      prettyError = prettyError.replaceAll('<h1>', "\t");
      prettyError = prettyError.replaceAll('</h1>', "\n");
      prettyError = prettyError.replaceAll('<h2>', "\t");
      prettyError = prettyError.replaceAll('</h2>', "\n");
      prettyError = prettyError.replaceAll('<h3>', "\t");
      prettyError = prettyError.replaceAll('</h3>', "\n");
      prettyError = prettyError.replaceAll('<h4>', "\t");
      prettyError = prettyError.replaceAll('</h4>', "\n");
      prettyError = prettyError.replaceAll('</b>', ":\t");
      return header + " [\n" + prettyError.stripTags() + "\n]";
  },
  
  //showError - Standardize Error message display.
  //  var jsonFile = '/config.json';
  //  fs.readFile(jsonFile, function (file, 'utf8', function(err, file_contents){
  //    if (err) {Util.showError("Reading JSON File", jsonFile, err);}
  //  });
  //
  // On err, sends to stderr: "ERROR: Reading JSON File [/config.json] Failed"
  //                          "<err contents>"
  showError: function(logger, tag, target, error) {
    logger.error("ERROR: "+tag+" ["+target+"] Failed!");
    if (error !== undefined && error !== null) {logger.error(error);}
  }
}

module.exports = Util;