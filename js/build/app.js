'use strict';
// Source: js/loaders.js
var loadingManager = new THREE.LoadingManager();
loadingManager.onLoad = function () {

	main();
	run();

};

loadingManager.onProgress = function ( item, loaded, total ) {

	console.log( loaded + '/' + total, item );

};

var SHADERS = {};
var shaderLoader = new THREE.XHRLoader( loadingManager );
shaderLoader.setResponseType( 'text' );
shaderLoader.showStatus = true;

shaderLoader.loadShaders = function ( SHADERS, urlObj ) {

	Object.keys( urlObj ).forEach( function ( key ) {

		shaderLoader.load( urlObj[ key ], function ( shader ) {

			SHADERS[ key ] = shader;

		} );

	} );

};

shaderLoader.loadShaders( SHADERS, {

	passVert: 'shaders/pass.vert',
	passFrag: 'shaders/pass.frag',

	hudVert: 'shaders/hud.vert',
	hudFrag: 'shaders/hud.frag',

	particleVert: 'shaders/particle.vert',
	particleFrag: 'shaders/particle.frag',

	velocity: 'shaders/velocity.frag',
	position: 'shaders/position.frag',

	sort: 'shaders/mergeSort.frag',

	opacityMapVert: 'shaders/opacityMap.vert',
	opacityMapFrag: 'shaders/opacityMap.frag',


} );

var TEXTURES = {};
var textureLoader = new THREE.TextureLoader( loadingManager );
textureLoader.load( 'sprites/electricScaled.png', function ( tex ) {

	TEXTURES.electric = tex;

} );

// Source: js/scene.js
/* exported updateHelpers */
if ( !Detector.webgl ){
	Detector.addGetWebGLMessage();
}

var $$ = {};
var CANVAS, STATS;
var SCENE, CAMERA, CAMERA_CTRL, RENDERER;
var WIDTH = window.innerWidth;
var HEIGHT = window.innerHeight;
var PIXEL_RATIO = window.devicePIXEL_RATIO || 1;
var SCREEN_RATIO = WIDTH / HEIGHT;
var CLOCK = new THREE.Clock();

// ---- Settings
var SCENE_SETTINGS = {

	bgColor: 0x383f4d,
	pause: false,
	enableGridHelper: false,
	enableAxisHelper: false,
	showFrameBuffer: true

};

// ---- Scene
	CANVAS = document.getElementById( 'canvas' );
	SCENE = new THREE.Scene();

// ---- Camera
	CAMERA = new THREE.PerspectiveCamera( 70, SCREEN_RATIO, 10, 100000 );
	CAMERA_CTRL = new THREE.OrbitControls( CAMERA, CANVAS );
	CAMERA.position.set( -321.5847028300089, 215.28711637817776, 881.9719256352606 );
	CAMERA.quaternion.set( -0.12170374143462927, -0.340052864691943, 0.04443202001754455, 0.9314386960684689 );
	CAMERA_CTRL.center.set( 243.27711348462407, -17.799729328901254, 211.47633089038425 );
	CAMERA_CTRL.update();

// ---- Renderer
	RENDERER = new THREE.WebGLRenderer( { antialias: false , alpha: true } );
	RENDERER.setSize( WIDTH, HEIGHT );
	RENDERER.setPixelRatio( PIXEL_RATIO );
	RENDERER.setClearColor( SCENE_SETTINGS.bgColor, 1.0 );
	RENDERER.autoClear = false;

	CANVAS.appendChild( RENDERER.domElement );

// ---- Stats
	STATS = new Stats();
	CANVAS.appendChild( STATS.domElement );

// ---- grid & axis helper
	var gridHelper = new THREE.GridHelper( 600, 50 );
	gridHelper.setColors( 0 );
	gridHelper.material.opacity = 0.5;
	gridHelper.material.transparent = true;
	gridHelper.position.y = -300;
	SCENE.add( gridHelper );

	var axisHelper = new THREE.AxisHelper( 1000 );
	SCENE.add( axisHelper );

	function updateHelpers() {
		axisHelper.visible = SCENE_SETTINGS.enableAxisHelper;
		gridHelper.visible = SCENE_SETTINGS.enableGridHelper;
	}
	updateHelpers();

// Source: js/gui.js
/* exported gui, gui_display, gui_settings, initGui, updateGuiDisplay */
var gui, gui_display, gui_settings;

function initGui() {

	// gui_settings.add( Object, property, min, max, step ).name( 'name' );

	gui = new dat.GUI();
	gui.width = 300;

	gui_display = gui.addFolder( 'Display' );
		gui_display.autoListen = false;

	gui_settings = gui.addFolder( 'Settings' );

		gui_settings.addColor( SCENE_SETTINGS, 'bgColor' ).name( 'Background' );
		gui_settings.add( CAMERA, 'fov', 25, 120, 1 ).name( 'FOV' );

		gui_settings.add( $$.uniformsInput.timeMult, 'value', 0.0, 0.5  , 0.01 ).name( 'Time Multiplier' );
		gui_settings.add( $$.uniformsInput.noiseFreq, 'value', 0.0, 3.0  , 0.01 ).name( 'Frequency' );
		gui_settings.add( $$.uniformsInput.speed, 'value', 0.0, 200.0, 0.01 ).name( 'Speed' );
		gui_settings.add( $$.psys.material.uniforms.size, 'value', 1.0, 20.0 , 0.01 ).name( 'Size' );
		gui_settings.add( SCENE_SETTINGS, 'showFrameBuffer' ).name( 'Show Frame Buffer' );


	gui_display.open();
	gui_settings.open();

	gui_settings.__controllers.forEach( function ( controller ) {
		controller.onChange( updateSettings );
	} );

}

function updateSettings() {

	CAMERA.updateProjectionMatrix();
	bgMat.color.setHex( SCENE_SETTINGS.bgColor );
	// renderer.setClearColor( SCENE_SETTINGS.bgColor , 1.0 );

}

function updateGuiDisplay() {

	gui_display.__controllers.forEach( function ( controller ) {
		controller.updateDisplay();
	} );

}

// Source: js/FBOCompositor.js
function FBOCompositor( renderer, bufferSize, passThruVertexShader ) {

	this.renderer = renderer;

	this._getWebGLExtensions();
	this.bufferSize = bufferSize;
	this.passThruVertexShader = passThruVertexShader;
	var halfBufferSize = bufferSize * 0.5;
	this.camera = new THREE.OrthographicCamera( -halfBufferSize, halfBufferSize, halfBufferSize, -halfBufferSize, 1, 10 );
	this.camera.position.z = 5;
	this.quad = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), null );
	this.scene = new THREE.Scene();
	this.scene.add( this.quad );
	this.dummyRenderTarget = new THREE.WebGLRenderTarget( 2, 2 );

	this.passThruShader = new THREE.ShaderMaterial( {

		uniforms: {
			resolution: {
				type: 'v2',
				value: new THREE.Vector2( this.bufferSize, this.bufferSize )
			},
			passTexture: {
				type: 't',
				value: null
			}
		},
		vertexShader: SHADERS.passVert,
		fragmentShader: SHADERS.passFrag,
		blending: THREE.NoBlending

	} );

	this.passes = [];

	// sorting
	this.totalSortStep = ( Math.log2( this.bufferSize*this.bufferSize ) * ( Math.log2( this.bufferSize * this.bufferSize ) + 1 ) ) / 2;
	this.sortPass = -1;
	this.sortStage = -1;

}

FBOCompositor.prototype = {

	_getWebGLExtensions: function () {

		var gl = this.renderer.getContext();
		if ( !gl.getExtension( "OES_texture_float" ) ) {
			console.error( "No support for float textures!" );
		}

		if ( gl.getParameter( gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS ) === 0 ) {
			console.error( "No support for vertex shader textures!" );
		}

	},

	getPass: function ( name ) {
		/* todo: update to ECMA6 Array.find() */
		var pass = null;
		this.passes.some( function ( currPass ) {

			var test = currPass.name === name;
			if ( test ) pass = currPass;
			return test;

		} );

		return pass;

	},

	addPass: function ( name, fragmentShader, inputTargets, uniforms ) {

		var pass = new FBOPass( name, this.passThruVertexShader, fragmentShader, this.bufferSize );
		pass.inputTargetList = inputTargets  || {};
		pass.attachUniform( uniforms || {} );
		this.passes.push( pass );
		return pass;

	},

	updatePassDependencies: function () {

		var self = this;
		this.passes.forEach( function ( currPass ) {

			Object.keys( currPass.inputTargetList ).forEach( function ( shaderInputName ) {

				var targetPass = currPass.inputTargetList[ shaderInputName ];
				currPass.setInputTarget( shaderInputName, self.getPass( targetPass ).getRenderTarget() );

			} );

		} );

	},

	_renderPass: function ( shader, passTarget ) {

		this.quad.material = shader;
		this.renderer.render( this.scene, this.camera, passTarget, true );

	},

	renderInitialBuffer: function ( dataTexture, toPass ) {

		var pass = this.getPass( toPass );
		this.passThruShader.uniforms.passTexture.value = dataTexture;
		this._renderPass( this.passThruShader, pass.doubleBuffer[ 1 ] ); // render to secondary buffer which is already set as input to first buffer.
		this._renderPass( this.passThruShader, pass.doubleBuffer[ 0 ] ); // or just render to both
		/*!
		 *	dont call renderer.clear() before updating the simulation it will clear current active buffer which is the render target that we previously rendered to.
		 *	or just set active target to dummy target.
		 */
		this.renderer.setRenderTarget( this.dummyRenderTarget );

	},

	step: function () {

		for ( let i = 0; i < this.passes.length; i++ ) {

			this.updatePassDependencies();
			var currPass = this.passes[ i ];

			if ( currPass.name === 'sortPass' ) {

				// copy position buffer to sort buffer
				this.renderInitialBuffer( this.getPass( 'positionPass' ).getRenderTarget(), currPass.name );

				for ( let s = 0; s <= this.totalSortStep; s ++ ) {

					this.sortPass --;
			      if ( this.sortPass  < 0 ) {
						this.sortStage ++;
						this.sortPass = this.sortStage;
			      }

					currPass.uniforms.pass.value  = 1 << this.sortPass;
					currPass.uniforms.stage.value = 1 << this.sortStage;

					// console.log( 'Stage:', this.sortStage, 1 << this.sortStage );
					// console.log( 'Pass:', this.sortPass, 1 << this.sortPass );
					// console.log( '------------------------------------------' );

					this._renderPass( currPass.getShader(), currPass.getRenderTarget() );
					currPass.swapBuffer();

				}

				// reset
				this.sortPass = -1;
				this.sortStage = -1;

			} else {

				// other passes
				this._renderPass( currPass.getShader(), currPass.getRenderTarget() );
				currPass.swapBuffer();

			}

		} // end loop

	}

};


function FBOPass( name, vertexShader, fragmentShader, bufferSize ) {

	this.name = name;
	this.vertexShader = vertexShader;
	this.fragmentShader = fragmentShader;
	this.bufferSize = bufferSize;

	this.currentBuffer = 0;
	this.doubleBuffer = []; //  single FBO cannot act as input (texture) and output (render target) at the same time, we take the double-buffer approach
	this.doubleBuffer[ 0 ] = this.generateRenderTarget();
	this.doubleBuffer[ 1 ] = this.generateRenderTarget();

	this.inputTargetList = {};

	this.uniforms = {
		resolution: {
			type: 'v2',
			value: new THREE.Vector2( this.bufferSize, this.bufferSize )
		},
		mirrorBuffer: {
			type: 't',
			value: this.doubleBuffer[ 1 ]
		}
	};

	this.shader = new THREE.ShaderMaterial( {

		uniforms: this.uniforms,
		vertexShader: this.vertexShader,
		fragmentShader: this.fragmentShader,
		blending: THREE.NoBlending

	} );

}

FBOPass.prototype = {

	getShader: function () {
		return this.shader;
	},
	getRenderTarget: function () {
		return this.doubleBuffer[ this.currentBuffer ];
	},
	setInputTarget: function ( shaderInputName, inputTarget ) {
		this.uniforms[ shaderInputName ] = {
			type: 't',
			value: inputTarget
		};
	},
	swapBuffer: function () {

		this.uniforms.mirrorBuffer.value = this.doubleBuffer[ this.currentBuffer ];
		this.currentBuffer ^= 1;

	},
	generateRenderTarget: function () {

		var target = new THREE.WebGLRenderTarget( this.bufferSize, this.bufferSize, {

			wrapS: THREE.ClampToEdgeWrapping,
			wrapT: THREE.ClampToEdgeWrapping,
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType,
			stencilBuffer: false,
			depthBuffer: false,

		} );

		return target;

	},
	attachUniform: function ( uniformsInput ) {

		var self = this;
		Object.keys( uniformsInput ).forEach( function ( key ) {

			self.uniforms[ key ] = uniformsInput[ key ];

		} );

	},

};

// Source: js/hud.js
function HUD( renderer ) {

	this.renderer = renderer;
	this.HUDMargin = 0.05;
	var hudHeight = 2.0 / 3.0; // 2.0 = full screen size
	var hudWidth = hudHeight;

	this.HUDCam = new THREE.OrthographicCamera( -SCREEN_RATIO, SCREEN_RATIO, 1, -1, 1, 10 );
	this.HUDCam.position.z = 5;

	this.hudMaterial = new THREE.ShaderMaterial( {

		uniforms: {
			tDiffuse: {
				type: "t",
				value: this.tTarget
			}
		},
		vertexShader: SHADERS.hudVert,
		fragmentShader: SHADERS.hudFrag

	} );


	this.hudGeo = new THREE.PlaneBufferGeometry( hudWidth, hudHeight );
	this.hudGeo.applyMatrix( new THREE.Matrix4().makeTranslation( hudWidth / 2, hudHeight / 2, 0 ) );

	this.HUDMesh = new THREE.Mesh( this.hudGeo, this.hudMaterial );
	this.HUDMesh.position.x = this.HUDCam.left + this.HUDMargin;
	this.HUDMesh.position.y = this.HUDCam.bottom + this.HUDMargin;

	this.HUDScene = new THREE.Scene();
	this.HUDScene.add( this.HUDMesh );

}



HUD.prototype = {

	setInputTexture: function ( target ) {

		this.hudMaterial.uniforms.tDiffuse.value = target;

	},

	render: function () {

		this.renderer.clearDepth();
		this.renderer.render( this.HUDScene, this.HUDCam );

	},

	update: function () { // call on window resize

		// match aspect ratio to prevent distortion
		this.HUDCam.left = -SCREEN_RATIO;
		this.HUDCam.right = SCREEN_RATIO;

		this.HUDMesh.position.x = this.HUDCam.left + this.HUDMargin;
		this.HUDMesh.position.y = this.HUDCam.bottom + this.HUDMargin;

		this.HUDCam.updateProjectionMatrix();

	}

};

// Source: js/particle.js
function ParticleSystem( _bufferSize ) {

	this.bufferSize = _bufferSize;
	this.halfSize = this.bufferSize * 0.5;

	this.geom = new THREE.BufferGeometry();

	this.position = new Float32Array( this.bufferSize * this.bufferSize * 3 );
	this.ndUV = ndarray( new Float32Array( this.bufferSize * this.bufferSize * 3 ), [ this.bufferSize, this.bufferSize, 3 ] );

	var normalizedSpacing = 1.0 / this.bufferSize;
	var normalizedHalfPixel = 0.5 / this.bufferSize;
	for ( let r = 0; r < this.bufferSize; r++ ) {
		for ( let c = 0; c < this.bufferSize; c++ ) {

			this.ndUV.set( r, c, 0, 1.0 - normalizedSpacing * c + normalizedHalfPixel );
			this.ndUV.set( r, c, 1, 1.0 - normalizedSpacing * r + normalizedHalfPixel );
			this.ndUV.set( r, c, 2, 0.0 );

		}
	}

	this.geom.addAttribute( 'here', new THREE.BufferAttribute( this.ndUV.data, 3 ) );
	this.geom.addAttribute( 'position', new THREE.BufferAttribute( this.position, 3 ) );

	delete this.ndUV;
	delete this.position;

	this.pScene = new THREE.Scene();

	this.material = new THREE.ShaderMaterial( {

		attributes: {
			here: {
				type: 'v3',
				value: null
			}
		},

		uniforms: {
			size: {
				type: 'f',
				value: 3.0
			},
			particleTexture: {
				type: 't',
				value: TEXTURES.electric
			},
			positionBuffer: {
				type: 't',
				value: null
			},
			velocityBuffer: {
				type: 't',
				value: null
			},
			opacityMap: {
				type: 't',
				value: null
			},
			lightMatrix: {
				type: 'm4',
				value: null
			},
			sortOrder: {
				type: 'f',
				value: -1
			}
		},

		vertexShader: SHADERS.particleVert,
		fragmentShader: SHADERS.particleFrag,

		transparent: true,
		depthTest: false,
		depthWrite: false,

		////
		blending: THREE.CustomBlending,
		blendEquation: THREE.AddEquation,

		// blend modes override in run time
		blendSrc: null,
		blendDst: null,

		/*
			back to front
			THREE.OneFactor,
			THREE.OneMinusSrcAlphaFactor,

			front to back
			THREE.OneMinusDstAlphaFactor,
			THREE.OneFactor,
		*/

	} );

	this.particleMesh = new THREE.PointCloud( this.geom, this.material );
	this.particleMesh.frustumCulled = false;

}

ParticleSystem.prototype = {


	setPositionBuffer: function ( inputBuffer ) {

		this.material.uniforms.positionBuffer.value = inputBuffer;

	},

	generatePositionTexture: function () {

		var data = new Float32Array( this.bufferSize * this.bufferSize * 4 );

		var fieldSize = 25.0;

		for ( var i = 0; i < data.length; i += 4 ) {

			data[ i + 0 ] = THREE.Math.randFloat( -fieldSize, fieldSize );
			data[ i + 1 ] = THREE.Math.randFloat( -fieldSize, fieldSize );
			data[ i + 2 ] = THREE.Math.randFloat( -fieldSize, fieldSize );
			data[ i + 3 ] = THREE.Math.randFloat( 0, 50 ); // initial particle life, todo: move to separate texture

		}

		var texture = new THREE.DataTexture( data, this.bufferSize, this.bufferSize, THREE.RGBAFormat, THREE.FloatType );
		texture.minFilter = THREE.NearestFilter;
		texture.magFilter = THREE.NearestFilter;
		texture.needsUpdate = true;

		return texture;

	},


	// opacity map stuff

	init: function () {

		// cam
		this.lightCam = new THREE.OrthographicCamera( -600, 1000, 500, -500, 10, 1000 );
		this.lightCam.position.set( 500, 500, 0 );
		this.lightCam.rotateX( -Math.PI * 0.5 );
		this.lightCam.updateMatrixWorld();
		this.lightCam.matrixWorldInverse.getInverse( this.lightCam.matrixWorld );
		this.lightCam.updateProjectionMatrix();

		// this.lightCamHelper = new THREE.CameraHelper( this.lightCam );
		// SCENE.add( this.lightCamHelper );

		// uniform -> lightMatrix
		this.lightMatrix = new THREE.Matrix4();
		this.lightMatrix.set(
			0.5, 0.0, 0.0, 0.5,
			0.0, 0.5, 0.0, 0.5,
			0.0, 0.0, 0.5, 0.5,
			0.0, 0.0, 0.0, 1.0
		);
		this.lightMatrix.multiply( this.lightCam.projectionMatrix );
		this.lightMatrix.multiply( this.lightCam.matrixWorldInverse );

		this.lightScene = new THREE.Scene();
		this.lightScene.add( this.particleMesh );

		var downSample = 1.0;
		this.opacityMap = new THREE.WebGLRenderTarget( this.bufferSize * downSample, this.bufferSize * downSample, {

			wrapS: THREE.ClampToEdgeWrapping,
			wrapT: THREE.ClampToEdgeWrapping,
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType,
			stencilBuffer: false,
			depthBuffer: false,

		} );

		this.numSlices = 32;
		this.pCount = this.bufferSize * this.bufferSize;
		this.pPerSlice = this.pCount / this.numSlices;
		console.log( this.pCount, this.pPerSlice );

		this.material.uniforms.lightMatrix.value = this.lightMatrix;
		this.material.uniforms.opacityMap.value = this.opacityMap;

		this.opacityMaterial = new THREE.ShaderMaterial( {

			attributes: {
				here: {
					type: 'v3',
					value: null
				}
			},

			uniforms: {
				size: {
					type: 'f',
					value: 3.0
				},
				luminance: {
					type: 'f',
					value: 50.0
				},
				particleTexture: {
					type: 't',
					value: TEXTURES.electric
				},
				positionBuffer: {
					type: 't',
					value: null
				},
			},

			vertexShader: SHADERS.opacityMapVert,
			fragmentShader: SHADERS.opacityMapFrag,

			transparent: true,
			depthTest: false,
			depthWrite: false,

			////
			blending: THREE.CustomBlending,
			blendEquation: THREE.AddEquation,

			blendSrcAlpha: THREE.SrcAlphaFactor,
			blendDstAlpha: THREE.OneMinusSrcAlphaFactor

		} );

		this.pScene.add( this.particleMesh );

	},

	render: function ( renderer, camera ) {

		// clear opacityMap buffer
		renderer.setClearColor( 0.0, 1.0 );
		renderer.clearTarget( this.opacityMap );
		renderer.setClearColor( SCENE_SETTINGS.bgColor, 1.0 );


		// set position buffer
		for ( let i = 0; i < this.numSlices; i++ ) {

			// set geometry draw calls
			this.geom.drawcalls[ 0 ] = {
				start: 0,
				count: this.pPerSlice,
				index: i * this.pPerSlice
			};

			// render to screen
			this.particleMesh.material = this.material;
			renderer.render( this.pScene, camera );

			// render opacityMap
			this.opacityMaterial.uniforms = this.material.uniforms;
			this.particleMesh.material = this.opacityMaterial;
			renderer.render( this.pScene, this.lightCam, this.opacityMap );

		}

		// reset render target
		renderer.setRenderTarget( this.dummyRenderTarget );

	},

	computeHalfAngle: function( camera ) {

		var eye = new THREE.Vector3( 0, 0, -1 );
		var light = new THREE.Vector3( 0, -1, 0 );
		var hf = new THREE.Vector3();

		eye.applyQuaternion( camera.quaternion );
		eye.normalize();
		light.normalize();

		if ( eye.dot( light ) > 0.0 ) {

			hf.addVectors( eye, light );
			this.material.blendSrc = THREE.OneFactor
			this.material.blendDst = THREE.OneMinusSrcAlphaFactor

		} else {

			eye.multiplyScalar( -1 );
			hf.addVectors( eye, light );
			this.material.blendSrc = THREE.OneMinusDstAlphaFactor
			this.material.blendDst = THREE.OneFactor

		}

		hf.normalize();
		this.halfAngle = hf;

		return hf;

	}

};

// Source: js/main.js
function main() {

	initParticleSystem();

	$$.hud = new HUD( RENDERER );

	initBackground();

	initGui();

}


function initParticleSystem() {

	$$.uniformsInput = {
		time     : { type: 'f', value: 0.0 },
		timeMult : { type: 'f', value: 0.2 },
		noiseFreq: { type: 'f', value: 1.3 },
		speed    : { type: 'f', value: 23.2 }
	};

	$$.sortUniforms = {
		pass: { type: 'f', value: -1 },
		stage: { type: 'f', value: -1 },
		lookAt: { type: 'v3', value: new THREE.Vector3( 0, 0, -1 ) },
		halfAngle: { type: 'v3', value: new THREE.Vector3() },
		sortOrder: { type: 'f', value: 1 }
	};


	var numParSq = 256;
	$$.FBOC = new FBOCompositor( RENDERER, numParSq, SHADERS.passVert );
	$$.FBOC.addPass( 'velocityPass', SHADERS.velocity, { positionBuffer: 'positionPass' }, $$.uniformsInput );
	$$.FBOC.addPass( 'positionPass', SHADERS.position, { velocityBuffer: 'velocityPass' }, $$.uniformsInput );
	$$.FBOC.addPass( 'sortPass', SHADERS.sort, {}, $$.sortUniforms );

	$$.psys = new ParticleSystem( numParSq );
	$$.psys.init();

	var initialPositionDataTexture = $$.psys.generatePositionTexture();
	$$.FBOC.renderInitialBuffer( initialPositionDataTexture, 'positionPass' );

}

function initBackground() {

	$$.bgGeo = new THREE.PlaneBufferGeometry( 2, 2 );
	$$.bgMat = new THREE.MeshBasicMaterial( {

		color: SCENE_SETTINGS.bgColor,
		side: THREE.DoubleSide,
		transparent: true,

		blending: THREE.CustomBlending,
		blendEquation: THREE.AddEquation,
		blendSrc: THREE.OneMinusDstAlphaFactor,
		blendDst: THREE.OneFactor

	} );
	$$.bgMesh = new THREE.Mesh( $$.bgGeo, $$.bgMat );
	$$.bgScene = new THREE.Scene();
	$$.bgCam = new THREE.Camera();
	$$.bgScene.add( $$.bgMesh );

}

// Source: js/run.js
/* jshint -W117 */
// !todo: fix  particle flickering because velocity buffer not sync with sorted position buffer
// !todo: when rotate mesh, sorting axis is wrong
// !todo: fix particle stop sorting when pause and changing camera angle

function update() {

	$$.uniformsInput.time.value = CLOCK.getElapsedTime();

	$$.psys.computeHalfAngle( CAMERA );
	$$.sortUniforms.halfAngle.value = $$.psys.halfAngle;
	$$.FBOC.step();
	$$.psys.setPositionBuffer( $$.FBOC.getPass( 'sortPass' ).getRenderTarget() );

	updateGuiDisplay();

}


// ----  draw loop
function run() {

	requestAnimationFrame( run );

	RENDERER.setClearColor( 0, 0.0 );
	RENDERER.clear();

	if ( !SCENE_SETTINGS.pause ) {
		update();
	}

	RENDERER.render( SCENE, CAMERA );

	$$.psys.render( RENDERER, CAMERA );

	RENDERER.render( $$.bgScene, $$.bgCam );

	if ( SCENE_SETTINGS.showFrameBuffer ) {
		$$.hud.setInputTexture( $$.psys.opacityMap );
		$$.hud.render();
	}

	STATS.update();

}

// Source: js/events.js
window.addEventListener( 'keypress', function ( event ) {

	var key = event.keyCode;

	switch( key ) {

		case 32: SCENE_SETTINGS.pause = !SCENE_SETTINGS.pause;
		break;

		case 65:/*A*/
		case 97:/*a*/ SCENE_SETTINGS.enableGridHelper = !SCENE_SETTINGS.enableGridHelper; updateHelpers();
		break;

		case 83 :/*S*/
		case 115:/*s*/ SCENE_SETTINGS.enableAxisHelper = !SCENE_SETTINGS.enableAxisHelper; updateHelpers();
		break;

	}

} );


( function () {

	var timerID;
	window.addEventListener( 'resize', function () {

		clearTimeout( timerID );
		timerID = setTimeout( function () {
			onWindowResize();
		}, 100 );

	} );

} )();


function onWindowResize() {

	WIDTH = window.innerWidth;
	HEIGHT = window.innerHeight;

	PIXEL_RATIO = window.devicePIXEL_RATIO || 1;
	SCREEN_RATIO = WIDTH / HEIGHT;

	CAMERA.aspect = SCREEN_RATIO;
	CAMERA.updateProjectionMatrix();

	RENDERER.setSize( WIDTH, HEIGHT );
	RENDERER.setPixelRatio( PIXEL_RATIO );

	$$.hud.update();

}

//# sourceMappingURL=app.js.map