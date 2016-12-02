
// this is run from the Main electron process

const {ipcMain} = require('electron');
const electron = require('electron')

const DEBUG = 1; // false | (true | 1) | 2

function registerAsyncRequestResponseMessageHandler(task, fn){
	ipcMain.on('msg-' + task, (event, message) => {
		var messageId = message.messageId;
		message = message.message;
        // bah!
        message.messageId = messageId; // fixme!
		fn(message, function(response){
			event.sender.send('response-' + task + '-' + messageId, response);
		});
	});
}


function createOffScreenUtilityWindow(){
	const BrowserWindow = electron.BrowserWindow
    var myWindow = new BrowserWindow({
    	x: DEBUG === 2 ? 800 : -9000, 
    	y: DEBUG === 2 ? 0 : -9000,
    	width: 900,
    	height: 800,
    	frame: true,
    	skipTaskbar: DEBUG ? false : true,
        nodeIntegration: false, // this is very important for security
    	webPreferences : {
    		preload: `${__dirname}//crawler/crawler-preload.js`,
    	}
  	});

    if (DEBUG) {
        myWindow.webContents.openDevTools();
    }
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

registerAsyncRequestResponseMessageHandler('search-google', function(request, done){
    var myWindow = createOffScreenUtilityWindow();
    myWindow.loadURL('http://google.co.uk/#q=' + encodeURIComponent(request.query));
    myWindow.webContents.once('dom-ready', () => {
        myWindow.webContents.send('scoop-google', request);
    });
    const cancelHandler = () => {
        ipcMain.removeAllListeners('cancel-search-google' + request.messageId);
        ipcMain.removeAllListeners('google-result' + request.messageId);  
        myWindow.close();  
    };
    const resultHandler = (event, msg) => {
       done(msg);
       cancelHandler();
    };
    ipcMain.once('google-result' + request.messageId, resultHandler); 
    ipcMain.once('cancel-search-google' + request.messageId, cancelHandler);       
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