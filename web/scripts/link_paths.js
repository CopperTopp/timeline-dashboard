  //LinkPaths Class -----------------------------------------------------
  // A class to manage and handle the paths to link to other pages
  var LinkPaths = function() {
    this.paths = {};
    this.paths.products = '/#/product';
    this.paths.product = '/#/product/#PRODUCT#';
    this.paths.release = '/#/release/#RELEASE#';
  }
  LinkPaths.prototype.products = function() {
    return this.paths.products;
  };
  LinkPaths.prototype.product = function(product_id) {
    if (!product_id) {
      throw "ERROR: LinkPaths.product() requires a 'product_id' parameter";
    }
    return this.paths.product.replace(/#PRODUCT#/g, product_id);
  };
  LinkPaths.prototype.release = function(release_id) {
    if (!release_id) {
      throw "ERROR: LinkPaths.release() requires a 'release_id' parameter";
    }
    return this.paths.release.replace(/#RELEASE#/g, release_id);
  };
  