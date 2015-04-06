(function() {
  var _restpaths = new RestPaths();
  var _linkpaths = new LinkPaths();
  angular.module('reldashApp')
  .controller('ProductViewController',
              ['$rootScope', '$scope', '$routeParams', '$http', 'visible',
               function($rootScope, $scope, $routeParams, $http, visible){
    console.log("ProductViewController started.");
    console.log("Handed Parameter [id]: " + $routeParams.id);
    $scope.products = [];
    $scope.releases = [];
    $scope.release_year_count = [];
    
    $rootScope.$on('visible_changed', function() {
      angular.element('tr.release').removeClass('timeline-visible');
      visible.get().forEach(function(release_id) {
        angular.element('tr.release-' + release_id).addClass('timeline-visible');
      });
    });
    
    $scope.OnSelectedProductChanged = function() {
      console.log("OnSelectedProductChanged was called...");
    };
    
    console.log("Getting Products...");
    $http.get(_restpaths.products()).success(function(products) {
      console.log("Got Products...");
      $scope.products = products;
      if (!$scope.selected_product) {
        console.log("Setting selected_product");
        //Try to see if product _id was handed on URI route
        console.log("ooo Do we have [id]? " + $routeParams.id);
        if ($routeParams.id) {
          console.log("ooo We Have IT!: Parameter [id]: " + $routeParams.id);
          for (var i = 0, l = $scope.products.length; i < l; i++) {
            console.log("ooo Comparing: [" + $routeParams.id);
            if ($scope.products[i]._id.toLowerCase() === $routeParams.id.toLowerCase()) {
              $scope.selected_product = $scope.products[i];
            }
          }
        }
        //If we're still not set, just set to first product in the list.
        if (!$scope.selected_product) $scope.selected_product = $scope.products[0];
        $http.get(_restpaths.release_count_by_year($scope.selected_product._id)).success(function(count_array) {
          $scope.release_year_count = count_array;
        });
      }
    }).error(function(err) {
      console.log("getProducts threw an error: " + err);
    });
    
    $scope.$watch('selected_product', function(newVal, oldVal) {
      console.log("Selected Product Watch called...");
      //console.log("Release Is Now: " + JSON.stringify($scope.selected_release, null, 2));
      if ($scope.selected_product) {
        $http.get(_restpaths.product_domain($scope.selected_product._id)).success(function(domain) {
          console.log("selected_product got new domain: " + JSON.stringify(domain, null, 2));
          domain.start_time = new Date(domain.start_time);
          domain.end_time = new Date(domain.end_time);
          domain.start_time = domain.start_time.setDate(domain.start_time.getDate() - 1);
          domain.end_time = domain.end_time.setDate(domain.end_time.getDate() + 1);
          $scope.timeline_domain = domain;
        }).error(function(err) {
          console.log("Getting Product ["+$scope.selected_product._id+"] date domain threw an error: " + JSON.stringify(err, null, 2));
        });
        $http.get(_restpaths.release_count_by_year($scope.selected_product._id)).success(function(count_array) {
          console.log("Updating by-year counts");
          $scope.release_year_count = count_array;
        });
      }
    });
    
    $http.get(_restpaths.releases()).success(function(releases) {
      for (var i = 0, l = releases.length, this_release; i < l; i++) {
        this_release = releases[i];
        this_release.start_time = new Date(this_release.start_time);
        this_release.end_time = new Date(this_release.end_time);
        this_release.parent = this_release.product._id;
        this_release.link = _linkpaths.release(this_release._id);
      }
      $scope.releases = releases;
    }).error(function(err) {
      console.log("Getting Releases threw an error:\n\t" + err);
    });
    
    //Turn back on later, this is our polling refresh.
    ////////$interval(function() {
    ////////  getReleases($scope, $http);
    ////////  getProducts($scope, $http);
    ////////}, 1000, 3);
  }]);
})();