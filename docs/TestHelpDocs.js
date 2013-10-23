
var types = {

	'number': 'number',
	'Integer': 'number',
	'Float': 'number',

	'Boolean': 'boolean',
	'Boolean': 'boolean',

	'string': 'string',
	'String': 'string'

};

var ToSomeType;

var TypeMapper2 = function(){

	this['CameraHelper'] = 'new THREE.CameraHelper(new THREE.Camera)';

};

TypeMapper2.prototype.get = function (typeName) {
		return this[typeName] || THREE[typeName];
};

TypeMapper2.prototype.getInstance = function (typeName) {

	// If the type needs a custom constructor (i.e. it has some special requirements to create) use that override
	if (this[typeName]) {
		eval(this[typeName]);
	} else {
		// Otherwise just invoke the constructor function
		return eval('new THREE.' + typeName);
	}

};

var typeMap = new TypeMapper2();

var columns = {
	'Name': 0,
	'Exists': 1,
	'Documented': 2,
	'CorrectType': 3,
	'Abreviated': 4,
	'Described': 5
};

function validateDocs(className, instance) {

	var helpDoc = helpDocs[className];

	var properties = helpDoc.Properties;

	var actualProps = inspectInstance(instance);

	var table = document.createElement('table');

	function createRow(table, tag, cellCount) {
		var tr = document.createElement('tr');
		table.appendChild(tr);

		for (var i = 0; i < cellCount; i++) {
			tr.appendChild(document.createElement(tag));
		}

		return tr;
	}

	var tr = createRow(table, 'th', 6);
	var td;

	var columnCount = 0;

	for (var v in columns) {
		var i = columns[v];
		tr.children[i].innerHTML = v;
		columnCount++;
	}

	tr = createRow(table, 'th', 1);
	td = tr.children[0];
	td.setAttribute('colspan', 6);
	td.innerHTML = 'Members';
	td.className = 'heading'

	// Loop over the props defined on the object
	for (var v in actualProps) {

		if (v == 'inherited') continue;

		tr = createRow(table, 'td', 6);

		td = tr.children[columns.Name];
		td.innerHTML = v;

		td = tr.children[columns.Exists];
		td.className = 'true';
		td.innerHTML = '1';
	}


	tr = createRow(table, 'th', 1);
	td = tr.children[0];
	td.setAttribute('colspan', 6);
	td.innerHTML = 'Inherited';
	td.className = 'heading'

	for (var v in actualProps.inherited) {

		tr = createRow(table, 'td', 6);

		td = tr.children[columns.Name];
		td.innerHTML = v;

		td = tr.children[columns.Exists];
		td.className = 'true';
		td.innerHTML = '1';
	}


	// Loop over the properties defined in the docs 
	for (var p in properties) {

		hasExpectedProperty(instance, properties[p]);

	}

	return table;

}

//validateDocs('MeshBasicMaterial', obj);




function hasExpectedProperty(instance, item) {

	function setColumn(name, val) {
		info[columns[name]] = val;
	}

	// Table 
	// Name | Documented | Exists | Abreviated | Empty |

	var info = [5];

	var itemInstance = instance[item.name];
	var actualType = typeof itemInstance;

	// Sanitize type names from help docs into js base types
	var expectedType = types[item.type] || item.type;

	
	var hasProp = itemInstance != null;

	var correctType = expectedType == actualType;

	var unableToValidate = false;

	if (!correctType && actualType == 'object') {
		if (itemInstance == null || itemInstance == undefined) {
			unableToValidate = correctType == true;
		} else {
			var typeFunction = typeMap[item.type] || THREE[item.type];
			correctType = typeFunction && itemInstance instanceof typeFunction;
		}
	}

	setColumn('Name', item.name);
	setColumn('Exists', hasProp);
	setColumn('CorrectType', unableToValidate ? 'Unknown' : correctType);

	console.log((( hasProp && correctType ) ? '- Pass: ' : '- Fail: ') + item.name + ' : ' + actualType);

	if (!hasProp)
		console.log('  - Missing ' + item.name);

	if (!correctType)
		console.log('  - Type mismatch: ' + item.type + ' != ' + actualType );
}

function inspectInstance(obj) {
	var info = {
		inherited: {}
	};

	for(var v in obj) { 
		if (obj.hasOwnProperty(v))
			info[v] = typeof obj[v];
		//else
		//	info.inherited[v] = typeof obj[v];
	}

	return info;
}

function dumpDef(obj) {
	var inherited = {};

	console.log('************ Direct Properties ***********');
	for (var v in obj) {
		if (obj.hasOwnProperty(v)) 
			console.log(v + ' : ' + typeof obj[v]); 
		else 
			inherited[v] = v; 
	}

	console.log('************ Inherited ***********');
	for(var v in inherited) { console.log(v + ' : ' + typeof obj[v]); }

}

//console.log(dumpDef2(obj));