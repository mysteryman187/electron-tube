
const {ipcRenderer} = require('electron');


function scoop(){
	var $ = require('jquery');	
	var rv = [];
	const resultSelector = '.listing td:even a';
	const episodeSelector = '.listing td a';
	const isSearch = window.location.pathname.indexOf('/Search') !== -1;
	selector = isSearch ? resultSelector : episodeSelector;
	$(selector).each(function(){
		var href = $(this).attr('href');
		var text = $(this).text();
		rv.push({url: href, title: text });
	});
	return {
		url: window.location.pathname,
		isSearch,
		results: rv
	};
}

function awaitDomNode(selector, timeout = 10000){
	return new Promise(function(resolve, reject) {
		const interval = setInterval(() => {
			if(document.querySelector(selector)){
				clear();
				resolve();
			}
		}, 100);
		const timeoutId = setTimeout(() => {
			clear();
			reject();
		}, timeout);
		const clear = () => {
			clearInterval(interval);
			clearTimeout(timeoutId);
		};
	});
}

ipcRenderer.on('crawl', function(event, msg) {
	event.sender.send('crawled', scoop(msg.selector));
});


ipcRenderer.on('search', function(event, msg) {
	var $ = require('jquery');
	$('#keyword').val(msg.query);
	$('#imgSearch').attr('onclick', '');
	$('#imgSearch').trigger('click');
});


ipcRenderer.on('scoop', function(event, msg) {
	event.sender.send('search-result', scoop());
});

ipcRenderer.on('extract-video', function(event, msg) {
	event.sender.send('extract-video-result', { fragment: document.querySelector('video').outerHTML });
});

ipcRenderer.on('scoop-google', function(event, msg) {
	awaitDomNode('.kno-ecr-pt').then(function(){
		event.sender.send('google-result' + msg.messageId, { 	
			title: document.querySelector('.kno-ecr-pt').innerHTML,
			description: document.querySelector('.kno-rdesc').childNodes[0].innerHTML,
			success: true
	});		
	}, function(){
		event.sender.send('google-result' + msg.messageId, { title: 'aww snap', description: 'Timed out, booo!', success: false } );
	});
});