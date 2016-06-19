
const {ipcRenderer} = require('electron');

function scoop(selector){
	var $ = require('jquery');	
	var rv = [];
	$(selector).each(function(){
		var href = $(this).attr('href');
		var text = $(this).text();
		rv.push({href: href, text: text});
	});
	return rv;
}

ipcRenderer.on('crawl', function(event, msg) {
	event.sender.send('crawled', scoop(msg.selector));
});


function wait(until, timeout){
	timeout = timeout || 5000;
	return new Promise(function(resolve, reject){
		var startTime = new Date().getTime();
		var id = setInterval(function(){
			if(until()){
				clearInterval(id);				
				resolve();
			}else if(new Date().getTime() - startTime > timeout){
				reject('timed out waiting after ' + timeout + ' ms');
			}
		}, 200);
	});


}

// ok i see whats going on here
// this context is lost when the page reloads
// so this handler might get re-attached
//.. is probably does
// but it was in the middle of executing
// ...hmmmm

const resultSelector = '.listing td:even a';

ipcRenderer.on('search', function(event, msg) {
	var $ = require('jquery');
	$('#keyword').val(msg.query);
	$('#imgSearch').attr('onclick', '');
	$('#imgSearch').trigger('click');
});


ipcRenderer.on('scoop', function(event, msg) {
	event.sender.send('search-result', scoop(resultSelector));
});

ipcRenderer.on('crawl-season', function(event, msg) {
	var episodeSelector = '.listing td a';
	event.sender.send('crawl-season-result', scoop(episodeSelector));
});

ipcRenderer.on('extract-video', function(event, msg) {
	var $ = require('jquery');
	event.sender.send('extract-video-result', {fragment: $('video')[0].outerHTML });
});

