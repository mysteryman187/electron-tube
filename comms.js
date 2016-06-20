
// this is run from the Main electron process

const {ipcMain} = require('electron');
const electron = require('electron')


function registerAsyncRequestResponseMessageHandler(task, fn){
	ipcMain.on('msg-' + task, (event, message) => {
		var messageId = message.messageId;
		message = message.message;
		fn(message, function(response){
			event.sender.send('response-' + task + '-' + messageId, response);
		});
	});
}

function createOffScreenUtilityWindow(){
	const BrowserWindow = electron.BrowserWindow
    var myWindow = new BrowserWindow({
    	x: -9000, 
    	y: -9000,
    	width: 900,
    	height: 800,
    	frame: true,
    	skipTaskbar: true,
      nodeIntegration: false, // this is very important for security
    	webPreferences : {
    		preload: `${__dirname}//crawler/crawler-preload.js`,
    	}
  	});
    return myWindow;
}

registerAsyncRequestResponseMessageHandler('extract-video', function(request, done){
    var myWindow = createOffScreenUtilityWindow();

	myWindow.loadURL('http://kisscartoon.me' + request.url);

  	myWindow.webContents.once('dom-ready', () => {
  		myWindow.webContents.send('extract-video', request);
    });

  	ipcMain.once('extract-video-result', (event, result) => {
  		done(result);
  		myWindow.close();
  	});
});

registerAsyncRequestResponseMessageHandler('crawl-season', function(request, done){

  var myWindow = createOffScreenUtilityWindow();

	myWindow.loadURL('http://kisscartoon.me' + request.url);
  	myWindow.webContents.once('dom-ready', () => {
  		myWindow.webContents.send('crawl-season', request);
    });

  	ipcMain.once('crawl-season-result', (event, linksArray) => {
  		done(linksArray);
  		myWindow.close();
  	});
});

registerAsyncRequestResponseMessageHandler('search', function(request, done){

  var myWindow = createOffScreenUtilityWindow();

	myWindow.loadURL('http://kisscartoon.me/');
  	myWindow.webContents.once('dom-ready', () => {
  		myWindow.webContents.send('search', request);
    	myWindow.webContents.once('dom-ready', () => {
    		myWindow.webContents.send('scoop', request);
    	});
  	});
  	
  	ipcMain.once('search-result', (event, linksArray) => {
  		done(linksArray);
  		myWindow.close();
  	});
});




function getKissCartoonCookie(){  

  var myWindow = createOffScreenUtilityWindow();
  myWindow.loadURL('http://kisscartoon.me/');  


  // we might land on teh wait 5 seconds page or we might land on the actual page
  myWindow.webContents.once('dom-ready', () => {

    var timeoutId = setTimeout(function(){
      console.log('we must have already had the cookie so close this window');
      myWindow.close();
    }, 9000);
    
    myWindow.webContents.once('dom-ready', () => {
        // if we landed on the "wait 5 secons page" then we have now be redirected to the actual page and should have the cookie
        console.log('got the cookie!');
        myWindow.close();
        clearTimeout(timeoutId);
    });


  });


}

const app = electron.app;
app.on('ready', getKissCartoonCookie);