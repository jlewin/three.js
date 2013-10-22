var Viewport = function ( editor ) {

	var signals = editor.signals;

	var container = new UI.Panel();
	container.setPosition( 'absolute' );

	var info = new UI.Text();
	info.setPosition( 'absolute' );
	info.setRight( '5px' );
	info.setBottom( '5px' );
	info.setFontSize( '12px' );
	info.setColor( '#ffffff' );
	info.setValue( 'objects: 0, vertices: 0, faces: 0' );
	container.add( info );

	var scene = editor.scene;
	var sceneHelpers = editor.sceneHelpers;

	var objects = [];

	// helpers

	var grid = new THREE.GridHelper( 500, 25 );
	sceneHelpers.add( grid );

	//

	var camera = new THREE.PerspectiveCamera( 50, container.dom.offsetWidth / container.dom.offsetHeight, 1, 5000 );
	camera.position.fromArray( editor.config.getKey( 'camera' ).position );
	camera.lookAt( new THREE.Vector3().fromArray( editor.config.getKey( 'camera' ).target ) );

	//

	var selectionBox = new THREE.BoxHelper();
	selectionBox.material.depthTest = false;
	selectionBox.material.transparent = true;
	selectionBox.visible = false;
	sceneHelpers.add( selectionBox );

	var transformControls = new THREE.TransformControls( camera, container.dom );
	transformControls.addEventListener( 'change', function () {

		controls.enabled = true;

		if ( transformControls.axis !== undefined ) {

			controls.enabled = false;

		}

		if ( editor.selected !== null ) {

			signals.objectChanged.dispatch( editor.selected );

		}

	} );
	sceneHelpers.add( transformControls );

	// fog

	var oldFogType = "None";
	var oldFogColor = 0xaaaaaa;
	var oldFogNear = 1;
	var oldFogFar = 5000;
	var oldFogDensity = 0.00025;

	// object picking

	var ray = new THREE.Raycaster();
	var projector = new THREE.Projector();

	// events

	var getIntersects = function ( event, object ) {

		var rect = container.dom.getBoundingClientRect();
		x = (event.clientX - rect.left) / rect.width;
		y = (event.clientY - rect.top) / rect.height;
		var vector = new THREE.Vector3( ( x ) * 2 - 1, - ( y ) * 2 + 1, 0.5 );

		projector.unprojectVector( vector, camera );

		ray.set( camera.position, vector.sub( camera.position ).normalize() );

		if ( object instanceof Array ) {

			return ray.intersectObjects( object );

		}

		return ray.intersectObject( object );

	};

	// Fire a ray from the given origin and direction and find if the passed object has
	// an opposing face that intersects. This can be used to find centerpoints of cutouts
	var getInnerFace = function (origin, direction, object) {
		
		ray.set(origin, direction);
		return ray.intersectObject(object);

	};

	var onMouseDownPosition = new THREE.Vector2();
	var onMouseUpPosition = new THREE.Vector2();

	var onMouseDown = function ( event ) {

		event.preventDefault();

		var rect = container.dom.getBoundingClientRect();
		x = (event.clientX - rect.left) / rect.width;
		y = (event.clientY - rect.top) / rect.height;
		onMouseDownPosition.set( x, y );

		document.addEventListener( 'mouseup', onMouseUp, false );

	};

	var testing = 2;

	var selection = [];

	function extractConnectorFromSelection(selection) {

		debugger;

		var p = selection.intersect.point.toArray();
		var a = selection.face.normal.toArray();
		var n = selection.face.normal.toArray();

		var matrix = new THREE.Matrix4();
		matrix.extractRotation(selection.intersect.object.matrix);

		var direction = new THREE.Vector3(0, 1, 0);
		var xyz = matrix.multiplyVector3(direction);

		n = direction.normalize();
		
		return new CSG.Connector(p, a, n);
	}

	function investigateSelection(selection) {

		// The intersected point on the clicked face
		var clicked = selection.intersect.point

		// The intersected object
		var selected = selection.intersect.object;

		// The face on the intersected object
		var face = selected.geometry.faces[selection.intersect.faceIndex];
		//face.color.setHex(0xff8000)

		// World normal for clicked face
		var worldNormal = worldNormalFrom(selected, face.normal.clone());

		// Fire a ray from the clicked point, looking for an opposing face
		var matched = getInnerFace(clicked, worldNormal.normalize(), selected);

		var opposingFace = matched[0];

		var verts = selected.geometry.vertices;
		var points = [verts[face.a], verts[face.b], verts[face.c]];

		// Calculate normal from verts
		// TODO: Create some UI elements to display and swap the selection
		var directionFromFaceVerts = new THREE.Vector3().subVectors(points[0], points[2]);

		// TODO: Create some UI to mirror the normal direction
		directionFromFaceVerts.negate();

		var worldDir = worldNormalFrom(selected, directionFromFaceVerts.normalize());

		// Since the point of this functionality is to find the center point of a potential whole, 
		// we should probably test the found object to ensure the two faces are parallel
		if (opposingFace) {

			var rayToTravel = new THREE.Ray(clicked, worldNormal.normalize());
			var center = rayToTravel.at(opposingFace.distance / 2);

			// Show helper
			//addRayHelper(center, camera.up, scene);
			addRayHelper(center, worldDir, scene);
			
			// Show line
			var geometry = new THREE.Geometry();
			geometry.vertices.push(clicked);
			geometry.vertices.push(opposingFace.point);

			var line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.5 }));
			scene.add(line);

		} else {

			// Show helper
			addRayHelper(selected.worldToLocal(selection.intersect.point), face.normal, selected);
			//addRayHelper(clicked, worldNormal, scene);

		}

	}

	// Convert from object local normal to world
	function worldNormalFrom(object, normal) {

		var normalMatrix = new THREE.Matrix3().getNormalMatrix(object.matrixWorld);
		return normal.applyMatrix3(normalMatrix).normalize();

	}

	function addRayHelper(origin, direction, appendTo, length) {

		var helper = new THREE.ArrowHelper(
					direction,
					origin,
					length || 20,
					0x3333FF);

		appendTo.add(helper);

		return helper;

	}

	var moveObjectToContainer = function () {

		// Determine in world space the difference from the selected object to the clicked point
		var worldPosition = selected.localToWorld(selected.position.clone());
		var offset = worldPosition.sub(clicked);

		//if (selected.parent.name == 'Positioner') {
		//	selected.parent.position = offset;
		//} else {
		//	// Create a new container object which we will move our target object into
		//	var parent = new THREE.Object3D();
		//	parent.name = 'Positioner';
		//	parent.position = offset;

		//	scene.add(parent);

		//	// Move the target object to the new container
		//	parent.add(selected);
		//	selected.position = new THREE.Vector3();
		//}
	}

	var updateX = function () {

		var connectTo = extractConnectorFromSelection(selection[0]);
		var connectFrom = extractConnectorFromSelection(selection[1]);

		//var connectFrom = new CSG.Connector(selection[1].intersect.point.toArray(), selection[1].face.normal.toArray(), [0, 1, 0] );

		var matrix = connectFrom.getTransformationTo(
		  connectTo,
		  true,   // mirror 
		  0       // normalrotation
		);

		// Remap to three.js matrix
		var x = matrix.elements;
		var mx = new THREE.Matrix4(x[0], x[4], x[8], x[12],
								   x[1], x[5], x[9], x[13],
								   x[2], x[6], x[10], x[14],
						 		   x[3], x[7], x[11], x[15]);

		selection[1].intersect.object.applyMatrix(mx);
	}

	var clickHelper;

	var onMouseUp = function ( event ) {

		var rect = container.dom.getBoundingClientRect();
		x = (event.clientX - rect.left) / rect.width;
		y = (event.clientY - rect.top) / rect.height;
		onMouseUpPosition.set( x, y );

		if ( onMouseDownPosition.distanceTo( onMouseUpPosition ) == 0 ) {

			var intersects = getIntersects( event, objects );
			if ( intersects.length > 0 ) {

				var object = intersects[ 0 ].object;
				var intersect = intersects[ 0 ];

				if ( object.userData.object !== undefined ) {

					// helper

					editor.select( object.userData.object );

				} else {

					if (testing == 1) {

						var face = object.geometry.faces[intersect.faceIndex];

						if (selection.length >= 2) {

							selection.forEach(function (s) {
								object.removeChild(s.arrowHelper);
							});

							selection = [];
						}


						var arrow = new THREE.ArrowHelper(
								face.normal,
								face.centroid,
								20,
								0x3333FF);

						object.add(arrow);

						selection.push({ intersect: intersect, face: face, arrowHelper: arrow });

						if (selection.length == 2) {
							updateX();
						}

					} else if (testing == 2) {
						selection = [];
						
						
						selection.push({ intersect: intersect, face: face, arrowHelper: arrow });

						investigateSelection(selection[0]);

					}

					else
						editor.select(object);

				}

			} else {

				editor.select( camera );

			}

			render();

		}

		document.removeEventListener( 'mouseup', onMouseUp );

	};

	var onDoubleClick = function ( event ) {

		var intersects = getIntersects( event, objects );

		if ( intersects.length > 0 && intersects[ 0 ].object === editor.selected ) {

			controls.focus( editor.selected );

		}

	};

	container.dom.addEventListener( 'mousedown', onMouseDown, false );
	container.dom.addEventListener( 'dblclick', onDoubleClick, false );

	// controls need to be added *after* main logic,
	// otherwise controls.enabled doesn't work.

	var controls = new THREE.EditorControls( camera, container.dom );
	controls.center.fromArray( editor.config.getKey( 'camera' ).target )
	controls.addEventListener( 'change', function () {

		transformControls.update();
		signals.cameraChanged.dispatch( camera );

	} );

	// signals

	signals.themeChanged.add( function ( value ) {

		switch ( value ) {

			case 'css/light.css': grid.setColors( 0x444444, 0x888888 ); break;
			case 'css/dark.css': grid.setColors( 0xbbbbbb, 0x888888 ); break;

		}

		render();

	} );

	signals.transformModeChanged.add( function ( mode ) {

		transformControls.setMode( mode );

	} );

	signals.snapChanged.add( function ( dist ) {

		transformControls.setSnap( dist );

	} );

	signals.spaceChanged.add( function ( space ) {

		transformControls.setSpace( space );

	} );

	signals.rendererChanged.add( function ( type ) {

		container.dom.removeChild( renderer.domElement );

		renderer = new THREE[ type ]( { antialias: true } );
		renderer.autoClear = false;
		renderer.autoUpdateScene = false;
		renderer.setSize( container.dom.offsetWidth, container.dom.offsetHeight );

		container.dom.appendChild( renderer.domElement );

		render();

	} );

	signals.sceneGraphChanged.add( function () {

		render();
		updateInfo();

	} );

	signals.cameraChanged.add( function () {

		editor.config.setKey( 'camera', {
			position: camera.position.toArray(),
			target: controls.center.toArray()
		} );

		render();

	} );

	signals.objectSelected.add( function ( object ) {

		selectionBox.visible = false;
		transformControls.detach();

		if ( object !== null ) {

			if ( object.geometry !== undefined ) {

				selectionBox.update( object );
				selectionBox.visible = true;

			}

			if ( object instanceof THREE.PerspectiveCamera === false ) {

				transformControls.attach( object );

			}

		}

		render();

	} );

	signals.objectAdded.add( function ( object ) {

		var materialsNeedUpdate = false;

		object.traverse( function ( child ) {

			if ( child instanceof THREE.Light ) materialsNeedUpdate = true;

			objects.push( child );

		} );

		if ( materialsNeedUpdate === true ) updateMaterials();

	} );

	signals.objectChanged.add( function ( object ) {

		transformControls.update();

		if ( object !== camera ) {

			if ( object.geometry !== undefined ) {

				selectionBox.update( object );

			}

			if ( editor.helpers[ object.id ] !== undefined ) {

				editor.helpers[ object.id ].update();

			}

			updateInfo();

		}

		render();

	} );

	signals.objectRemoved.add( function ( object ) {

		var materialsNeedUpdate = false;

		object.traverse( function ( child ) {

			if ( child instanceof THREE.Light ) materialsNeedUpdate = true;

			objects.splice( objects.indexOf( child ), 1 );

		} );

		if ( materialsNeedUpdate === true ) updateMaterials();

	} );

	signals.helperAdded.add( function ( object ) {

		objects.push( object.getObjectByName( 'picker' ) );

	} );

	signals.helperRemoved.add( function ( object ) {

		objects.splice( objects.indexOf( object.getObjectByName( 'picker' ) ), 1 );

	} );

	signals.materialChanged.add( function ( material ) {

		render();

	} );

	signals.fogTypeChanged.add( function ( fogType ) {

		if ( fogType !== oldFogType ) {

			if ( fogType === "None" ) {

				scene.fog = null;

			} else if ( fogType === "Fog" ) {

				scene.fog = new THREE.Fog( oldFogColor, oldFogNear, oldFogFar );

			} else if ( fogType === "FogExp2" ) {

				scene.fog = new THREE.FogExp2( oldFogColor, oldFogDensity );

			}

			updateMaterials();

			oldFogType = fogType;

		}

		render();

	} );

	signals.fogColorChanged.add( function ( fogColor ) {

		oldFogColor = fogColor;

		updateFog( scene );

		render();

	} );

	signals.fogParametersChanged.add( function ( near, far, density ) {

		oldFogNear = near;
		oldFogFar = far;
		oldFogDensity = density;

		updateFog( scene );

		render();

	} );

	signals.windowResize.add( function () {

		camera.aspect = container.dom.offsetWidth / container.dom.offsetHeight;
		camera.updateProjectionMatrix();

		renderer.setSize( container.dom.offsetWidth, container.dom.offsetHeight );

		render();

	} );

	signals.playAnimations.add( function (animations) {
		
		function animate() {

			requestAnimationFrame( animate );
			
			for ( var i = 0; i < animations.length ; i ++ ) {

				animations[i].update(0.016);

			} 

			render();
		}

		animate();

	} );

	//

	var renderer;

	if ( editor.config.getKey( 'renderer' ) !== undefined ) {

		renderer = new THREE[ editor.config.getKey( 'renderer' ) ]( { antialias: true } );

	} else {

		if ( System.support.webgl === true ) {

			renderer = new THREE.WebGLRenderer( { antialias: true } );

		} else {

			renderer = new THREE.CanvasRenderer();

		}

	}

	renderer.autoClear = false;
	renderer.autoUpdateScene = false;
	container.dom.appendChild( renderer.domElement );

	animate();

	//

	function updateInfo() {

		var objects = 0;
		var vertices = 0;
		var faces = 0;

		scene.traverse( function ( object ) {

			if ( object instanceof THREE.Mesh ) {

				objects ++;

				var geometry = object.geometry;

				if ( geometry instanceof THREE.Geometry ) {

					vertices += geometry.vertices.length;
					faces += geometry.faces.length;

				} else if ( geometry instanceof THREE.BufferGeometry ) {

					vertices += geometry.attributes.position.array.length / 3;

					if ( geometry.attributes.index !== undefined ) {

						faces += geometry.attributes.index.array.length / 3;

					} else {

						faces += vertices / 3;

					}

				}

			}

		} );

		info.setValue( 'objects: ' + objects + ', vertices: ' + vertices + ', faces: ' + faces );

	}

	function updateMaterials() {

		editor.scene.traverse( function ( node ) {

			if ( node.material ) {

				node.material.needsUpdate = true;

				if ( node.material instanceof THREE.MeshFaceMaterial ) {

					for ( var i = 0; i < node.material.materials.length; i ++ ) {

						node.material.materials[ i ].needsUpdate = true;

					}

				}

			}

		} );

	}

	function updateFog( root ) {

		if ( root.fog ) {

			root.fog.color.setHex( oldFogColor );

			if ( root.fog.near !== undefined ) root.fog.near = oldFogNear;
			if ( root.fog.far !== undefined ) root.fog.far = oldFogFar;
			if ( root.fog.density !== undefined ) root.fog.density = oldFogDensity;

		}

	}

	function animate() {

		requestAnimationFrame( animate );

	}

	function render() {

		sceneHelpers.updateMatrixWorld();
		scene.updateMatrixWorld();

		renderer.clear();
		renderer.render( scene, camera );
		renderer.render( sceneHelpers, camera );

		//console.trace();

	}

	return container;

}
