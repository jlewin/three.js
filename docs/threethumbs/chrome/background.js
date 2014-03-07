/* Copyright 2014 John Lewin lewin76@gmail.com */

var tab,
	activeItem,
	baseUrl = 'http://localhost:8085/',
	importedCount = 0,
	queuedExamples,
	id;

// Hook browserAction click event
chrome.browserAction.onClicked.addListener(function (activeTab) {
	
	console.time("tjs import");
	
	initFiles();

	id = JSON.stringify(new Date()).replace(/:/g, '-').replace(/\"/g, '').substring(0, 19);

	// Load the examples page
	chrome.tabs.create({ url: 'about:blank' }, function (loaded) {

		tab = loaded;
		processNextItem();

    });

});

// Register to receive message from getTabContent.js
chrome.runtime.onMessage.addListener(function (request) {

    // Once we've recieved the page information, pass that along into CaptureScreenShot to resume the process
    if (request.loaded /* && importedCount++ < 5 */) {

    	setTimeout(CaptureScreenShot, 1000, false);

    }
});

function initFiles() {

	// Flatten and store file names of examples
	queuedExamples = [];

	for (var f in exampleFiles) {
		var items = exampleFiles[f];

		for (var i = 0, length = items.length; i < length; i++) {
			queuedExamples.push(items[i]);
		}
	}
}

function processNextItem() {

	var exampleName = queuedExamples.pop();

	if (!exampleName) {

		console.timeEnd("tjs import");
		return;

	}

	activeItem = exampleName;
    
    // We're currently using hardcoded logic that intimately knows the relationship between the example files and the target urls. In
    // the future this should be adapted so we call a url supplied by the user, view config or similar that returns a list of urls 
    // to process
	chrome.tabs.update(tab.id, { url: baseUrl + 'examples/' + exampleName + '.html' }, function (loaded) {

		tab = loaded;

		// Callback when loaded
		chrome.tabs.executeScript(tab.id, { file: 'notifyLoaded.js' });

	});

}

function CaptureScreenShot() {

	// Capture active tab
	chrome.tabs.captureVisibleTab(tab.windowId, function (img) {

		var xhr = new XMLHttpRequest(), formData = new FormData();
		formData.append("screenShot", img);
		
		xhr.open("POST", "http://localhost:8000/", true);

		//xhr.setRequestHeader('tjs-batch', id);
        // Pass the name through to the node.js code so it knows how to name the posted data
		xhr.setRequestHeader('tjs-name', activeItem);

		// Finally hook up a handler to the response which displays the results in a new tab
		xhr.addEventListener("load", function () {
			
			// Load next item
			setTimeout(processNextItem, 200, false);

			
		}, false);

		// Execute the xhr, posting the image to the node.js receiver
		xhr.send(formData)
		
	});

}