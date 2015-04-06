//This line helps get around self-signed certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
var Util = require(__dirname + '/../lib/util');

var Mingle = require('nMingle');
var Project = require(__dirname + '/../../node_modules/nMingle/lib/project');
Project.prototype.getCardsFiltered = function(filter, callback) {
  var path = "/api/v2/projects/" + this.identifier + "/cards.xml?filters[mql]=" + encodeURIComponent(filter).replace('%3A',':');
  console.log("Accessing Mingle API path: " + path);
  try {
    this.api.get(path, this.cardsConverter(callback));
  } catch (err) {
    console.error("Getting [" + filter + "] failed!!\n\n" + err);
  }
};

var Products = require(__dirname + '/../lib/products');
var expweb_template;
Products(__dirname + '/../products', process.stdout, function(product_template) {
  if (product_template.name == 'MY_PRODUCT') {
    expweb_template = product_template;
  }
});
var mingle_options = {
    "host": "my.mingle.com",
    "port": "443",
    "username": "joes",
    "password": "password",
    "project": "mingle_project"
  };
mingle_options.rejectUnauthorized = false;
mingle_options.requestCert = true;
mingle_options.agent = false;
console.log("** Mingle Options **********************");
console.log(mingle_options);
console.log("****************************************");


console.log("Preparing to read mingle.");
var mingle = Mingle.create(mingle_options);
//mingle.api.auth = '';
console.log("Mingle instance created.");
console.log("** Mingle Instance *********************");
console.log(mingle);
console.log("****************************************");
mingle.getProject(mingle_options.project, function(project, err){
  console.log("Getting project...");
  console.log("** Project *****************************");
  console.log(project);
  if (project.errors) {
    console.log(project.errors.error[0]);
  }
  console.log("****************************************");
  if (project) {
    project.getCardsFiltered("Type is Release", function(rel_cards, err){
      var rel_card, change_card;
      var releases = {}, release;
      for (var i = 0, length = rel_cards.length; i < length; i++) {
        rel_card = Util.convertMingleProperties(rel_cards[i]);
        releases[rel_card.name] = rel_card;
        project.getCardsFiltered("Type is Change AND 'Release' is '"+rel_card.name+"'", function(change_cards, err){
          for (var i = 0, length = change_cards.length; i < length; i++) {
            change_card = Util.convertMingleProperties(change_cards[i]);
            console.log(change_card);
          }
        });
      }
    });
  }
});
