
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

