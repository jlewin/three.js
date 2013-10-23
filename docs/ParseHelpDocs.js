
function sanitize(name) {

	return name.replace(/[\.\(\)]+/gi, '').trim();

}

function processHelpPage(bodyElement) {

	var info = { breadCrumb: bodyElement.firstChild.textContent.trim() };
	var context = bodyElement.firstElementChild;
	var state = 'loading';
	var current = '';
	var container;

	while (context) {

		switch (context.nodeName) {
			case 'H1':

				info.className = context.innerText;
				container = [];
				info.description = container;
				state = 'class';
				current = '';
				break;

			case 'H2':
				state = context.innerText;
				container = [];
				info[state] = container;
				current = '';
				break;

			case 'H3':
				current = context.innerText;
				break;

			case 'CODE':
			case 'DIV':
				var item = { name: current, val: context.innerHTML.trim() };
				if (state != 'Constructor') {
					var segments = item.name.split('::');
					if (segments.length == 2) {
						item.name = sanitize(segments[0]);
						item.type = segments[1];
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

	return info;
}