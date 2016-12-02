const {ipcRenderer} = require('electron');
const $ = require('jquery');
const angular = require('angular');
const _ = require('lodash');

require('angular-ui-router');
require('angular-sanitize');
require('angular-ui-bootstrap');

var imdb = require('imdb-api');

var app = angular.module('kissfucker', ['ui.router', 'ui.bootstrap', 'ngSanitize']);

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
			},
			recent: {
				templateUrl: './views/recent.html',
				controller: 'recentCtrl'
			}
		}
	}).state('app.views.searchResults', {
		url: '/searchResults/:query',
		resolve:{
			results: function(search, $stateParams) {
				if ($stateParams.query) {
					return search($stateParams.query);		
				} else {
					return [];
				}
			}
		},
		views: {
			'searchResults@app.views': {
				templateUrl: './views/search.html',
				controller: 'searchResultsCtrl'
			}
		}
	}).state('app.views.searchResults.episodes', {
		url: '/episodes/:seasonTitle/:url',
		resolve:{

			seasonTitle: ($stateParams) => $stateParams.seasonTitle,

			episodes: function(episodeService, $stateParams){
				return episodeService($stateParams.url);		
			}
		},
		views: {
			'searchResults@app.views': {
				templateUrl: './views/episodes.html',
				controller: 'episodesCtrl'
			}
		}
	}).state('app.views.searchResults.episodes.play', {
		url: '/player/:episodeTitle/:episodeUrl',
		resolve:{
			
			episodeTitle: ($stateParams) => $stateParams.episodeTitle,

			videoHtml: function($stateParams, video){
				return video($stateParams.episodeUrl);
			}
		},	
		views:{
			'play@app.views':{
				controller: 'playCtrl',
				templateUrl: './views/player.html'
			}	
		}
	});

});


app.controller('recentCtrl', function($scope, recentlyWatchedItems){
	$scope.items = recentlyWatchedItems.get();
	$scope.$on('$stateChangeSuccess', function(event, toState, toParams){
		if(toState.name === 'app.views.searchResults.episodes.play'){
			var newItem = {
				title:toParams.episodeTitle,
				url:toParams.episodeUrl
			};
			$scope.items.unshift(newItem);
			$scope.items = _.uniqWith($scope.items, angular.equals );
			$scope.items = $scope.items.slice(0, 30);
			recentlyWatchedItems.set($scope.items);			
		}
	});

});


app.factory('localstorage', function ($window) {
	return {
		get: (key) => {
			if($window.localStorage[key]) {
				return angular.fromJson(localStorage[key]);
			}
		},
		set: (key, val) => {
			$window.localStorage[key] = angular.toJson(val);
		}
	};
});


app.factory('recentlyWatchedItems', function(localstorage){
	return {
		get: () => {
			var items = localstorage.get('recentlyWatchedItems');
			return items || [];
		},
		set: (val) => {
			localstorage.set('recentlyWatchedItems', val);
		}
	};
});



app.factory('historyItems', function(localstorage){
	return {
		get: () => {
			var items = localstorage.get('historyItems');
			return items || ['american dad', 'family guy'];
		},
		set: (val) => {
			localstorage.set('historyItems', val);
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
			$scope.historyItems = _.uniqWith($scope.historyItems, angular.equals);
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

// aka seasons
app.controller('searchResultsCtrl', function($scope, $stateParams, results){
	$scope.results = results;
});
	
app.directive('episode', function(google){
	return {
		scope: {
			episode: '='
		},
		link: function($scope){
			$scope.hoverEpisode = episode => {
				$scope.googleResult = { description: 'Loading...' }; 
				google(episode.title)
				.then((result) => {
						$scope.googleResult = result;
						$scope.$digest();
				}, err => {
					// probably cancelled
					$scope.googleResult = null;
					$scope.$digest();
				});					
			};
		},
		templateUrl: 'views/episode.html'
	};
});

app.controller('episodesCtrl', function($scope, episodes, seasonTitle){
	$scope.title = seasonTitle;
	$scope.episodes = episodes;
});

app.controller('playCtrl', function($scope, $sce, $rootElement, videoHtml, episodeTitle){
	$scope.title = episodeTitle;
	debugger;
	$scope.playerHtml = $sce.trustAsHtml(videoHtml.fragment);
	$scope.fullscreen = () => {
		$rootElement.find('video')[0].webkitEnterFullscreen();
	};
});

app.service('episodeService', function(){

	return function(url){
		return crawlSeasonPage(url).promise;
	}

});


app.service('search', function(){
	return function(query){
		return searchKissCartoon(query).promise;
	}

});

app.service('google', function(promiseCancelCaller, localstorage){
	const caller = promiseCancelCaller(searchGoogle);
	return function(query) {
		const cached = localstorage.get(`google-result-${query}`);
		if (cached) {
			return Promise.resolve(cached);
		}
		return caller(query)
		.then((result) => {
			if(result.success){
				localstorage.set(`google-result-${query}`, result);				
			}
			return result;
		});
	};
});

app.service('promiseCancelCaller', function(){
	return function(func){
		let funkyPromise;	
		return function (arg1, arg2) {
			if (funkyPromise) {
				funkyPromise.cancel();
			}
			funkyPromise = func(arg1, arg2);
			return funkyPromise.promise;
		};
	}
});

app.service('video', function(){
	return url => extractVideoElement(url).promise;
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

function searchGoogle(query) {
	return requestResponse('search-google', { query });
}

function requestResponse(task, message){
	let promiseReject;
	const promise = (messageId => new Promise(function(resolve, reject){
		promiseReject = reject;
		ipcRenderer.once('response-' + task + '-' + messageId, function(event, response) {
			resolve(response);
		});
		ipcRenderer.send('msg-' + task, { messageId: messageId, message: message || {} });
	}))(messageId);
	const cancel = (messageId => () => {
		ipcRenderer.send('cancel-' + task + messageId, {});
		ipcRenderer.removeAllListeners('response-' + task + '-' + messageId);
		promiseReject('cancelled');
	})(messageId);
	messageId++;
	return {
		promise,
		cancel
	}
}