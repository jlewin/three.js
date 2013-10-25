
var TypeMapper = function () {

	// Map from help doc to runtime types as inferred from typeof
	this.baseFromDocType = {

		'Integer': 'number',
		'Float': 'number',
		'Boolean': 'boolean',
		'String': 'string'

	}

	this['ShaderSprite'] = 'THREE.ShaderSprite';  // TODO: Object literal, can't use new, update docs
	this['ShaderFlares'] = 'THREE.ShaderFlares';  // TODO: Object literal, can't use new, update docs
	this['CameraHelper'] = 'new THREE.CameraHelper(new THREE.Camera())';
	this['SpotLightHelper'] = 'new THREE.SpotLightHelper(new THREE.SpotLight())';
	this['PointLightHelper'] = 'new THREE.PointLightHelper(new THREE.PointLight())';
	this['HemisphereLightHelper'] = 'new THREE.HemisphereLightHelper(new THREE.HemisphereLight())';
	this['DirectionalLightHelper'] = 'new THREE.DirectionalLightHelper(new THREE.DirectionalLight())';
	this['ArrowHelper'] = 'new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 50, 0xff0000)';
	this['TubeGeometry'] = 'new THREE.TubeGeometry( new THREE.SplineCurve3([new THREE.Vector3(0, 0, 100), new THREE.Vector3(0, 100, 100)]), 100, 2, 3, false )';
	this['TextGeometry'] = 'new THREE.TextGeometry("hello", { size: 80, height: 20, curveSegments: 2, font: "helvetiker" })';
	this['ShapeGeometry'] = 'var s = new THREE.Shape(); s.moveTo(  80, 20 ); s.lineTo(  40, 80 ); s.lineTo( 120, 80 ); s.lineTo(  80, 20 ); new THREE.ShapeGeometry(s)';
	this['PolyhedronGeometry'] = 'new THREE.PolyhedronGeometry([[-1, 1, 0], [1, 1, 0], [-1, 1, 0]], [[0, 1, 2]])';

	this.LatheGeometry = function () {
		var points = [];

		for (var i = 0; i < 50; i++) {

			points.push(new THREE.Vector3(Math.sin(i * 0.2) * Math.sin(i * 0.1) * 15 + 50, 0, (i - 5) * 2));

		}

		return new THREE.LatheGeometry(points, 20);
	}();

};

TypeMapper.prototype.get = function (typeName) {
		return this[typeName] || THREE[typeName];
};

TypeMapper.prototype.getInstance = function (typeName) {

	// If the constructor function has dependencies, satisfy those by using the override or instantiated object in the map
	var o = this[typeName];
	if (o && typeof o == 'object') {
		return o;
	} else if (o) {
		return eval(this[typeName]);
	} else {
		// Otherwise just invoke the constructor function
		return eval('new THREE.' + typeName);
	}

};

var typeMap = new TypeMapper();
var todoText = /TODO/ig;
var columns = {
	Name: 0,
	Documented: 1,
	CorrectType: 2,
	Help: 3,
	Chars: 4,
	TODO: 5,
	length: 6
};

var tr, td;

function validateDocs(className, instance, helpDoc, members) {

	var table = document.createElement('table');

	// Dump some basic info about the class into the table
	var tr = createHeading(table, 'Class: ' + helpDoc.className + ' &bull; Prototype: ' + helpDoc.protoName + ' &bull; Super: ' + helpDoc.superName);
	var td = tr.cells[0];
	td.style.borderBottom = 'none';
	td.style.background = '#bbb';

	// Display column headings
	tr = createRow(table, 'th', columns.length);
	for (var c in columns) {

		if (c == 'length') continue;

		var i = columns[c];
		tr.children[i].innerHTML = c;
	}

	createHeading(table, 'Members');
	dumpMembers(members.local);

	if (members.overridden.length > 0) {
		createHeading(table, 'Overridden');
		dumpMembers(members.overridden);
	}

	if (members.remote.length > 0) {

		createHeading(table, 'Inherited');
		dumpMembers(members.remote);
	}

	return table;

	function dumpMembers(items) {

		for (var i = 0, length = items.length; i < length; i++) {

			var p = items[i];

			var tr = createRow(table, 'td', columns.length);

			td = tr.children[columns.Name];
			td.innerHTML = p;

			// TODO: Handle constructor documentation
			if (p != 'constructor') {

				var results = validateHelpDetails(instance, p, helpDoc.members[p]);

				if (results[columns['Documented']]) {
					tr.className = 'expected';
				}


				for (var r in results) {
					var val = results[r];

					td = tr.children[r];

					if (typeof val == 'boolean') {

						td.className = val ? 'pass' : 'fail';

					} else {

						td.innerHTML = val;

					}

				}
			}
		}

	}
}

function createRow(table, tag, cellCount, colspan) {
	var tr = document.createElement('tr');
	table.appendChild(tr);

	for (var i = 0; i < cellCount; i++) {
		tr.appendChild(document.createElement(tag));
	}

	if(colspan) {
		tr.cells[0].colSpan = colspan;
	}

	return tr;
}

function createHeading(table, text, className) {
	tr = createRow(table, 'th', 1, columns.length);
	td = tr.cells[0];
	td.innerHTML = text;
	td.className = className || 'heading'

	return tr;
}

function validateHelpDetails(instance, name, memberDocs) {

	var testResults = [];

	var hasHelpDefinition = (memberDocs && memberDocs != null) ? true : false;
	testResults[columns['Documented']] = hasHelpDefinition;

	// TODO: Consider... we could add a mechanism to lookup additional info on 
	// types at this point to include in our populated results. For example,
	// the ShaderSprite has a .sprite member which is an anonymous type and
	// falls short in the docs. Providing a hook here would allow us to extract
	// the type details for depiction in the docs or the docs test/helper suite
	var itemInstance = instance[name];
	var hasProp = itemInstance != null;

	// Early exit due to dependence on help details below
	if (!hasHelpDefinition) return testResults;

	var actualType = typeof itemInstance;

	// Map help doc types into expected results from typeof operator on runtime instance
	var expectedType = typeMap.baseFromDocType[memberDocs.type] || memberDocs.type;
	
	// The docs are accurate when the item is a function and it was in (M)embers or when the santized types match
	var isCorrectType = (memberDocs.group == 'M' && actualType == 'function') || (expectedType == actualType);

	// Remove todo text and extract length
	var length = memberDocs.val ? memberDocs.val.replace(todoText, '').length : 0

	testResults[columns['TODO']] = memberDocs.val.match(todoText) == null;
	testResults[columns['Chars']] = length;
	testResults[columns['Help']] = inferQualityFromLength(length);
	testResults[columns['CorrectType']] = hasCorrectTypeDefinition();

	return testResults;

	function hasCorrectTypeDefinition() {

		var unableToValidate = false;

		// If the type is incorrect, probe further to see if comparision is blocked by undefined
		if (!isCorrectType && actualType == 'object') {

			if (itemInstance == null) {
				debugger;
				unableToValidate = isCorrectType == true;
			} else if (Array.isArray(itemInstance) && memberDocs.type == 'array') {
				isCorrectType = true;
			} else {
				// if typeof equals object, but a more specific class was specified, validate with instanceof
				var typeFunction = THREE[memberDocs.type];
				isCorrectType = typeFunction && itemInstance instanceof typeFunction;
			}
		}

		return unableToValidate ? 'Unknown' : isCorrectType;

	}

}

function showDependants(table, files) {
	createHeading(table, '&nbsp;', 'separator' );
	createHeading(table, 'Related', 'related');

	for(var i = 0, length = files.length; i < length; i++) {

		tr = createRow(table, 'td', 1, columns.length);
		var path = '/' + files[i];
		var a = document.createElement('a');
		a.target = 'hostFrame';
		a.href = path;
		a.innerHTML = path;
		tr.cells[0].appendChild(a);

	}

}

// TODO: Word count would be a better quality metric
function inferQualityFromLength(length) {

	if (length < 6) {
		return 'None';
	} else if (length < 15) {
		return 'Abridged';
	} else if (length < 30) {
		return 'Short';
	} else {
		return 'ok';
	}
}

function inspectInstance(obj) {
	var members = {
		local: [],
		remote: [],
		overridden: []
	};

	for(var p in obj) {
		if (obj.hasOwnProperty(p))
			members.local.push(p);
		else
			members.remote.push(p); // = typeof obj[p];
	}

	return members;
}