(function() {
  var _restpaths = new RestPaths();
  var _linkpaths = new LinkPaths();
  angular.module('reldashApp')
  .controller('ReleaseViewController',
              ['$rootScope', '$scope', '$routeParams', '$http', 'visible',
               function($rootScope, $scope, $routeParams, $http, visible){
    console.log("ReleaseViewController started.");
    console.log("Handed Parameter [id]: " + $routeParams.id);
    console.log("Hitting REST API: " + _restpaths.release($routeParams.id));
    $http.get(_restpaths.release($routeParams.id)).success(function(release) {
      console.log("Loaded Release...");
      //console.log("Loaded Release: " + JSON.stringify(release, null, 2));
      release.product.link = _linkpaths.product(release.product._id);
      release.link = _linkpaths.release(release._id);
      $scope.selected_release = release;
    }).error(function(err) {
      console.log("Getting Release ["+$routeParams.id+"] threw an error: " + JSON.stringify(err, null, 2));
    });
    $scope.events = [];
    $scope.code_changes = [];
    //var today = new Date();
    //$scope.domain_start = (new Date()).setDate(today.getDate() - 7);
    //$scope.domain_end = (new Date()).setDate(today.getDate() + 7);
    
    $scope.$watch('selected_release', function(newVal, oldVal) {
      console.log("Selected Release Watch called...");
      //console.log("Release Is Now: " + JSON.stringify($scope.selected_release, null, 2));
      if ($scope.selected_release) {
        $scope.code_changes = $scope.selected_release.code_changes;
        $http.get(_restpaths.release_domain($scope.selected_release._id)).success(function(domain) {
          domain.start_time = new Date(domain.start_time);
          domain.end_time = new Date(domain.end_time);
          domain.start_time = domain.start_time.setDate(domain.start_time.getDate() - 1);
          domain.end_time = domain.end_time.setDate(domain.end_time.getDate() + 1);
          $scope.timeline_domain = domain;
        });
      }
      console.log("Getting Events...");
      $http.get(_restpaths.events()).success(function(events) {
        console.log("Received events: ");
        console.log(events);
        var updated_events = [];
        for (var i = 0, l = events.length, updated_event; i < l; i++) {
          updated_event = events[i];
          updated_event.name = updated_event.release.name + ' - ' + updated_event.name;
          updated_event.start_time = new Date(updated_event.start_time);
          updated_event.end_time = new Date(updated_event.end_time);
          updated_event.parent = updated_event.release._id;
          updated_events.push(updated_event);
        }
        $scope.events = updated_events;
      });
    });
    
    
    //Turn back on later, this is our polling refresh.
    ////////$interval(function() {
    ////////  getReleases($scope, $http);
    ////////  getProducts($scope, $http);
    ////////}, 1000, 3);
  }]);
})();