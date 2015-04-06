var mongoose = require('mongoose');

var schemas = require(__dirname + '/schemas.js')(mongoose);

var modeler = function(connection, logger, model_name, schema) {
  logger.info("Adding Model: " + model_name);
  
  schema.method('toUpsert', function() {
    var upsert = this.toObject();
    delete upsert._id;
    return upsert;
  });

  return connection.model(model_name, schema);
};

module.exports = function(connection, logger) {
  var models = {}, model_name;
  for (model_name in schemas) {
    models[model_name] = modeler(connection, logger, model_name, schemas[model_name]);
  }
  return models;
};
