var nameTest = /\.([^\($\s]*)/;

function HelpDocParser(iframe, references, finished) {
	var that = this;
	var imported = 0;
	var MAX_IMPORT = 0;
	var IMPORT_SKIP_COUNT = 0;

	this.iframe = iframe;
	this.xhr = new XMLHttpRequest();
	this.finished = finished;
	this.collected = [];

	var types = [];
	// Flatten the type info from the lists object into a hash of objectName -> path
	for (var i in references) {

		references[i].forEach(function (t) {

			types.push(t);

		});

	}

	this.types = types;

	if (IMPORT_SKIP_COUNT > 0) {
		for (var i = 0; i < IMPORT_SKIP_COUNT; i++) {
			types.pop();
		}
	}

	// For each document processed by the parser, the Three.js help document will 
	// be loaded into the iframe and its contents will be extracted. Further, on 
	// completion of parsing the help doc, the script file will be loaded for
	// additional type detail extraction
	this.iframe.onload = function () {

		// Process the help documentation for the given item
		var helpDoc =  that.extractDetails(that.iframe.contentDocument.body);
		helpDoc.helpClassName = that.activeItem[0];
		helpDoc.helpUrl = that.activeItem[1] + '.html';

		// Process the script
		var scriptUrl = '../' + helpDoc.Source[0].local;

		try {

			var scriptText = that.syncLoadScript(scriptUrl);

			// Extract prototype from assignment to Three.js type
			var protoAssign = /\.prototype\s*=\s*[^\n]*THREE.([^)\n\s]*)/.exec(scriptText);
			helpDoc.protoName = (protoAssign && protoAssign.length > 0) ? protoAssign[1] : null;

			// Extract super from .call or .apply on Three.js type
			// TODO: at one point this was running against the constructor function text only, restore that functionality
			var baseCall = /THREE\.([^\s]*)\.(call|apply)/.exec(scriptText);
			helpDoc.superName = (baseCall && baseCall.length > 0) ? baseCall[1] : null;

			that.collected.push(helpDoc);

		} catch (e) {

			console.log(e.message);
			helpDoc.error = e.message;
			errors.push({ message: e.message, doc: helpDoc });

		}

		window.setTimeout(popLoadType, 500);

	};

	this.run = function () {

		// Start processing the queue
		popLoadType();

	}

	function popLoadType() {

		// Pop the item from the queue
		var item = that.activeItem = that.types.pop();

		// If below max, load the document in the iframe to start the import
		if (item && (imported < MAX_IMPORT || MAX_IMPORT <= 0)) {

			hostFrame.src = item[1] + '.html';
			imported++;

		} else {

			if (that.finished) {
				that.finished(that.collected);
			}
		}

	}

}

// Use nameTest to remove leading period and drop parens and everything after
HelpDocParser.prototype.sanitize = function (text) {

	var matches = text.match(nameTest);
	return matches && matches.length == 2 ? matches[1] : text;

}

HelpDocParser.prototype.extractDetails = function(bodyElement) {

	var helpDoc = {
		breadCrumb: bodyElement.firstChild.textContent.trim(),
	};

	var context = bodyElement.firstElementChild;
	var state = 'loading';
	var current = '';
	var container;

	while (context) {

		switch (context.nodeName) {
			case 'H1':

				helpDoc.className = context.innerText;
				container = [];
				helpDoc.description = container;
				state = 'class';
				current = '';
				break;

			case 'H2':
				state = context.innerText;
				container = [];
				helpDoc[state] = container;
				current = '';
				break;

			case 'H3':
				current = context.innerText;
				break;

			case 'CODE':
			case 'DIV':
				var item = { name: current, val: context.innerHTML.trim() };
				if (state != 'Constructor') {

					var name = this.sanitize(item.name);

					var segments = name.split('::');
					if (segments.length == 2) {
						item.name = segments[0];
						item.group = state.substr(0, 1);
						item.type = segments[1];
					} else if (name != item.name) {
						item.full = item.name;
						item.group = state.substr(0, 1);
						item.name = name;
					}
				}

				container.push(item);
				break;

			case 'A':
				container.push({ local: context.textContent.trim(), href: context.href });
				break;
		}

		//console.log(state, context, current);
		context = context.nextElementSibling;

	}

	return helpDoc;
}


HelpDocParser.prototype.syncLoadScript = function(path) {

	this.xhr.open("GET", path, false);
	this.xhr.send(null);

	if (this.xhr.status == '404') {
		throw 'Error loading script';
	}

	return this.xhr.responseText;

}