


const {ipcRenderer} = require('electron');
const $ = require('jquery');
const angular = require('angular');
const _ = require('lodash');

require('angular-ui-router');
require('angular-sanitize');
var app = angular.module('kissfucker', ['ui.router', 'ngSanitize']);

app.config(function($stateProvider, $urlRouterProvider){
	
	$urlRouterProvider.otherwise('/app/views');
	$stateProvider.state('app', {
		abstract: true,
		url: '/app',
		controller: 'appCtrl',
		templateUrl: './views/app.html',
	}).state('app.views', {
		url: '/views',
		views: {
			history: {
				templateUrl: './views/history.html',
				controller: 'historyCtrl'
			},
			player: {
				template: '<div ui-view="play"></div>'
			},
			search: {
			 	template: '<div ui-view="searchResults"></div>'
			 }
		}
	}).state('app.views.searchResults', {
		url: '/searchResults/:query',
		resolve:{
			results: function(search, $stateParams){
				return search($stateParams.query);		
			}
		},
		views: {
			'searchResults@app.views': {
				templateUrl: './views/search.html',
				controller: 'searchResultsCtrl'
			}
		}
	}).state('app.views.searchResults.episodes', {
		url: '/episodes/:query',
		resolve:{
			episodes: function(episodeService, $stateParams){
				return episodeService($stateParams.query);		
			}
		},
		views: {
			'searchResults@app.views': {
				templateUrl: './views/episodes.html',
				controller: 'episodesCtrl'
			}
		}
	}).state('app.views.searchResults.episodes.play', {
		url: '/player/:episodeUrl',
		resolve:{
			videoHtml: function($stateParams){
				return extractVideoElement($stateParams.episodeUrl);
			}
		},	
		views:{
			'play@app.views':{
				controller: 'playerCtrl',
				templateUrl: './views/player.html'
			}	
		}
	});

});

app.factory('historyItems', function(){
	return {
		get: () => {
			if(localStorage['historyItems']){
				var items = JSON.parse(localStorage['historyItems']);
				if(items.length){
					return items;
				}
			}
			
			return ['american dad', 'family guy'];
		},
		set: (val) => {
			localStorage['historyItems'] = JSON.stringify(val);
		}
	};
});

app.controller('appCtrl', function($scope, $timeout){
	var removeAfter = function(t){
		$timeout(function(){
			$scope.errorMessage = null;
		}, t);
	};

	$scope.$on('error', function(event, error){
		if(angular.isString(error)){
			$scope.errorMessage = error;
		}
		removeAfter(4000);
	});
});

app.controller('historyCtrl', function($scope, $state, historyItems){
	$scope.historyItems = historyItems.get();

	$scope.keyUp = (e) => {
		var isEnter = e.keyCode === 13;
		if (isEnter) {
			$scope.go();
		}
	};

	$scope.go = function(){
		if ($scope.search && $scope.search.length > 2) {
			$scope.historyItems.push($scope.search);
			$state.go('app.views.searchResults', {query: $scope.search}, {});
			$scope.search = '';
			historyItems.set($scope.historyItems);
		} else {
			$scope.$emit('error', 'search requires > 2 characters');
		}
	};

	$scope.removeItem = function(item){
		$scope.historyItems = _.remove($scope.historyItems, function(i){
			return i !== item;
		});
		historyItems.set($scope.historyItems);
	};

});

app.controller('searchCtrl', function($scope, $stateParams){
	
});

// aka seasons
app.controller('searchResultsCtrl', function($scope, $stateParams, results){
	$scope.results = results;
});

app.controller('episodesCtrl', function($scope, episodes){
	$scope.episodes = episodes;
});

app.controller('playerCtrl', function($scope, $sce, $rootElement, videoHtml){
	$scope.playerHtml = $sce.trustAsHtml(videoHtml.fragment);
	$scope.fullscreen = () => {
		$rootElement.find('video')[0].webkitEnterFullscreen();
	};
});

app.service('episodeService', function(){

	return function(url){
		return crawlSeasonPage(url);
	}

});


app.service('search', function(){

	return function(query){
		return searchKissCartoon(query);
	}

});


var messageId = 69;

function searchKissCartoon(query) {
	return requestResponse('search', {query: query});
}

function crawlSeasonPage(url) {
	return requestResponse('crawl-season', {url: url});
}

function extractVideoElement(url) {
	return requestResponse('extract-video', {url: url});
}

function requestResponse(task, message){
	return new Promise(function(resolve, reject){

		ipcRenderer.once('response-' + task + '-' + messageId, function(event, response) {
			resolve(response);
		});

		ipcRenderer.send('msg-' + task, { messageId: messageId, message: message || {} });
		messageId++;
	});
}