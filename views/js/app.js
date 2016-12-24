(function () {
	'use strict';
	var app = angular.module('argnet', ['ngRoute', 'toastr', 'argClient']);

	app.directive('argNav', function ($rootScope) {
		return {
			restrict: 'A',
			scope: {
				destination: '=argNav'
			},
			link: function (scope, element, attrs) {
				element.on('click', function () {
					$rootScope.$broadcast('navigate', scope.destination);
				});

				function onNavigate(e, to) {
					if (to.indexOf(scope.destination) === 0) {
						element.addClass('active');
					} else {
						element.removeClass('active');
					}
				}

				$rootScope.$on('navigate', onNavigate);
				onNavigate(null, $rootScope.page);
			}
		}
	});

	app.directive('dashboardInfoBox', function () {
		return {
			restrict: 'E',
			scope: {
				info: '='
			},
			templateUrl: 'include/widget-info-box.html'
		}
	});

	app.directive('dashboardWorker', function () {
		return {
			restrict: 'E',
			scope: {
				info: '='
			},
			templateUrl: 'include/widget-worker.html'
		}
	});

	app.run(function ($rootScope, $location) {
		$rootScope.page = $location.url().match(/^\/([^/]*)/)[1];
	});

	app.controller('AppController', function () {

	});

	app.controller('PendingController', function () {

	});

	app.controller('RunningController', function () {

	});

	app.controller('CompletedController', function () {

	});

	app.controller('SidebarController', function ($scope) {

	});

	app.controller('DashboardController', function ($scope, $routeParams, $rootScope, Client) {
		this.boxWorkers = {
			text: 'Workers',
			bg: 'blue',
			icon: 'stats-bars',
			number: '0'
		};
		this.boxPending = {
			text: 'Tasks Pending',
			bg: 'red',
			icon: 'clipboard',
			number: '0'
		};
		this.boxRunning = {
			text: 'Tasks Running',
			bg: 'yellow',
			icon: 'loop',
			number: '0'
		};
		this.boxCompleted = {
			text: 'Tasks Completed',
			bg: 'green',
			icon: 'checkmark-round',
			number: '0'
		};
		$scope.boxes = [this.boxWorkers, this.boxPending, this.boxRunning, this.boxCompleted];
		$scope.workers = {};

		$rootScope.$watch(function () {
			return Client.client;
		}, () => {
			try {
				this.boxWorkers.number = Object.keys(Client.client.workers.workers).length;
				// this.boxPending.number = Object.keys(Client.client.workers.workers).length;
				// this.boxRunning.number = Object.keys(Client.client.tasks.running).length;
				// this.boxCompleted.number = Object.keys(Client.client.workers.workers).length;
				$scope.workers = Client.client.workers.workers;
			} catch (err) {

			}
		})
	});

	app.controller('SettingsController', function ($scope, $routeParams, Settings, toastr) {
		$scope.settings = Settings;
		// toastr.success('Hello');
	});

	app.config(function ($routeProvider, $locationProvider) {
		$routeProvider
			.when('/dashboard', {
				templateUrl: 'include/dashboard.html',
				controller: 'DashboardController'
			})
			.when('/settings', {
				templateUrl: 'include/settings.html',
				controller: 'SettingsController'
			})
			.when('/completed', {
				templateUrl: 'include/completed.html',
				controller: 'CompletedController'
			})
			.when('/pending', {
				templateUrl: 'include/pending.html',
				controller: 'PendingController'
			})
			.when('/running', {
				templateUrl: 'include/pending.html',
				controller: 'PendingController'
			})
			.otherwise({
				redirectTo: '/dashboard'
			});
	});
})();