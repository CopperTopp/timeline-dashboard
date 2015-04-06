angular.module('reldashApp')
.service('visible', ['$rootScope', function($rootScope) {
  this.list = [];
  this.add = function(v) {
    if (this.list.indexOf(v) < 0) {
      this.list.push(v);
      //console.log("VISIBLE added: " + v);
      $rootScope.$emit('visible_changed');
    }
  };
  this.get = function() {
    return this.list;
  };
  this.remove = function(v) {
    var i = this.list.indexOf(v);
    if (i >= 0) {
      this.list.splice(i, 1);
      //console.log('VISIBLE removed: ' + v);
      $rootScope.$emit('visible_changed');
    }
  };
}]);