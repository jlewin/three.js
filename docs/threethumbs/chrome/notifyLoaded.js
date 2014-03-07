/* Copyright 2014 John Lewin lewin76@gmail.com */

// When the page is loaded, call back into the extension, sending loaded=true
if (document.readyState === 'complete') {

	console.log('readyState=complete');
	notifyLoaded();

} else {

	console.log('load');
	window.addEventListener('load', notifyLoaded, false);

}

function notifyLoaded() {

	chrome.runtime.sendMessage({ loaded: true });

}

