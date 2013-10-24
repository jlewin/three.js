
var types = {

	'number': 'number',
	'Integer': 'number',
	'Float': 'number',

	'Boolean': 'boolean',
	'Boolean': 'boolean',

	'string': 'string',
	'String': 'string'

};

var TypeMapper = function(){

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

	//this.ConvexGeometry = function () {

	//	var points = [
	//					new THREE.Vector3(100, 0, 0),
	//					new THREE.Vector3(0, 100, 0),
	//					new THREE.Vector3(0, 0, 100),
	//					new THREE.Vector3(0, 0, 0)];

	//	return new THREE.ConvexGeometry(points);
	//}();

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

var columns = {
	Name: 0,
	Documented: 1,
	CorrectType: 2,
	Help: 3,
	Chars: 4,
	TODO: 5,
	length: 6
};

function validateDocs(className, instance, helpDoc, members) {

	var table = document.createElement('table');

	// Dump some basic info about the class into the table
	var tr = createHeading('Class: ' + helpDoc.className + ' &bull; Prototype: ' + helpDoc.protoName + ' &bull; Super: ' + helpDoc.superName);
	var td = tr.cells[0];
	td.style.borderBottom = 'none';
	td.style.background = '#bbb';

	// Display column headings
	var tr = createRow(table, 'th', columns.length);
	for (var c in columns) {

		if (c == 'length') continue;

		var i = columns[c];
		tr.children[i].innerHTML = c;
	}

	createHeading('Members');
	dumpMembers(members.local);

	if (members.overridden.length > 0) {
		createHeading('Overridden');
		dumpMembers(members.overridden);
	}

	if (members.remote.length > 0) {

		createHeading('Inherited');
		dumpMembers(members.remote);
	}

	return table;

	function createRow(table, tag, cellCount) {
		var tr = document.createElement('tr');
		table.appendChild(tr);

		for (var i = 0; i < cellCount; i++) {
			tr.appendChild(document.createElement(tag));
		}

		return tr;
	}

	function createHeading(title) {
		tr = createRow(table, 'th', 1);
		td = tr.children[0];
		td.setAttribute('colspan', columns.length);
		td.innerHTML = title;
		td.className = 'heading'

		return tr;
	}

	function dumpMembers(items) {

		for (var i = 0, length = items.length; i < length; i++) {

			var p = items[i];

			var tr = createRow(table, 'td', columns.length);

			td = tr.children[columns.Name];
			td.innerHTML = p;

			// TODO: Come up with some way to handle this...
			if (p != 'constructor') {

				var results = validateHelpDoc(instance, p, helpDoc.members[p]);

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

var todo = /TODO/ig;

// @item = HelpDoc property item
function validateHelpDoc(instance, name, item) {

	function setColumn(name, val) {
		info[columns[name]] = val;
	}

	var info = [];

	var hasHelpDefinition = (item && item != null) ? true : false;
	setColumn('Documented', hasHelpDefinition);

	// TODO: Consider... we could add a mechanism to lookup additional info on 
	// types at this point to include in our populated results. For example,
	// the ShaderSprite has a .sprite member which is an anonymous type and
	// fall short in the docs. Providing a hook here would allow us to extract
	// the type details for depiction in the docs or the docs test/helper suite
	var itemInstance = instance[name];
	var hasProp = itemInstance != null;

	// Early exit due to dependence on help details below
	if (!hasHelpDefinition) return info;

	var actualType = typeof itemInstance;

	// Sanitize type names from help docs into js base types
	var expectedType = types[item.type] || item.type;
	
	var correctType = (item.t == 'M' && actualType == 'function') || (expectedType == actualType);

	var unableToValidate = false;

	var length = item.val ? item.val.replace(todo, '').length : 0

	setColumn('TODO', item.val.match(todo) == null)
	setColumn('Chars', length);

	var status;
	if (length < 6) {
		status = 'None';
	} else if (length < 15) {
		status = 'Abridged';
	} else if (length < 30) {
		status = 'Short';
	} else {
		status = 'ok';
	}

	setColumn('Help', status);
	
	// If the type is incorrect, probe further to see if comparision is blocked by undefined
	if (!correctType && actualType == 'object') {

		if (itemInstance == null) {
			debugger;
			unableToValidate = correctType == true;
		} else if(Array.isArray(itemInstance) && item.type == 'array') {
			correctType = true;
		} else {
			// if typeof equals object, but a more specific class was specified, validate with instanceof
			var typeFunction = THREE[item.type];
			correctType = typeFunction && itemInstance instanceof typeFunction;
		}
	}

	setColumn('CorrectType', unableToValidate ? 'Unknown' : correctType);

	console.log((( hasProp && correctType ) ? '- Pass: ' : '- Fail: ') + item.name + ' : ' + actualType);

	if (!hasProp)
		console.log('  - Missing ' + item.name);

	if (!correctType)
		console.log('  - Type mismatch: ' + item.type + ' != ' + actualType);

	return info;
}

function inspectInstance(obj) {
	var info = {
		local: [],
		remote: [],
		overridden: []
	};

	for(var p in obj) {
		if (obj.hasOwnProperty(p))
			info.local.push(p);
		else
			info.remote.push(p); // = typeof obj[p];
	}

	return info;
}

function dumpDef(obj) {
	var inherited = {};

	console.log('************ Direct Properties ***********');
	for (var p in obj) {
		if (obj.hasOwnProperty(p))
			console.log(p + ' : ' + typeof obj[p]);
		else 
			inherited[p] = p;
	}

	console.log('************ Inherited ***********');
	for(var p in inherited) { console.log(p + ' : ' + typeof obj[p]); }

}

//console.log(dumpDef2(obj));