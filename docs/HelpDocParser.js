var nameTest = /\.([^\($\s]*)/;

// Use nameTest to remove leading period and drop parens and everything after
function sanitize(text) {

	var matches = text.match(nameTest);
	return matches && matches.length == 2 ? matches[1] : text;

}

function extractHelpDoc(bodyElement) {

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

					var name = sanitize(item.name);

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