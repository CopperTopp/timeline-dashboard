angular.module('reldashApp')

.config(function($locationProvider, $routeProvider) {
  //$locationProvider.html5Mode(true);
  $routeProvider
  .when('/product', {
    templateUrl: '/product_view/view.html',
    controller: 'ProductViewController'
  })
  .when('/product/:id', {
    templateUrl: '/product_view/view.html',
    controller: 'ProductViewController'
  })
  .when('/release/:id', {
    templateUrl: '/release_view/view.html',
    controller: 'ReleaseViewController'
  })
  .otherwise({ redirectTo: '/' });
});