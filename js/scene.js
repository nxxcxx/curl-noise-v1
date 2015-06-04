/* exported updateHelpers */

if ( !Detector.webgl ){
	Detector.addGetWebGLMessage();
}

var container, stats;
var scene, light, camera, cameraCtrl, renderer;
var WIDTH = window.innerWidth;
var HEIGHT = window.innerHeight;
var pixelRatio = window.devicePixelRatio || 1;
var screenRatio = WIDTH / HEIGHT;
var clock = new THREE.Clock();

// ---- Settings
var sceneSettings = {

	bgColor: 0x757575,
	enableGridHelper: false,
	enableAxisHelper: true,
	pause: false,
	showFrameBuffer: true

};

// ---- Scene
	container = document.getElementById( 'canvas-container' );
	scene = new THREE.Scene();

// ---- Camera
	camera = new THREE.PerspectiveCamera( 70, screenRatio, 10, 100000 );
	// camera orbit control
	cameraCtrl = new THREE.OrbitControls( camera, container );
	// cameraCtrl.object.position.z = 1500;

	camera.position.set( -321.5847028300089, 215.28711637817776, 881.9719256352606 );
	camera.quaternion.set( -0.12170374143462927, -0.340052864691943, 0.04443202001754455, 0.9314386960684689 );
	cameraCtrl.center.set( 243.27711348462407, -17.799729328901254, 211.47633089038425 );

	cameraCtrl.update();

// ---- Renderer
	renderer = new THREE.WebGLRenderer( { antialias: true , alpha: true } );
	renderer.setSize( WIDTH, HEIGHT );
	renderer.setPixelRatio( pixelRatio );
	renderer.setClearColor( sceneSettings.bgColor, 1.0 );
	renderer.autoClear = false;

	container.appendChild( renderer.domElement );

// ---- Stats
	stats = new Stats();
	container.appendChild( stats.domElement );

// ---- grid & axis helper
	var gridHelper = new THREE.GridHelper( 600, 50 );
	gridHelper.setColors( 0 );
	gridHelper.material.opacity = 0.5;
	gridHelper.material.transparent = true;
	gridHelper.position.y = -300;
	scene.add( gridHelper );

	var axisHelper = new THREE.AxisHelper( 1000 );
	scene.add( axisHelper );

	function updateHelpers() {
		axisHelper.visible = sceneSettings.enableAxisHelper;
		gridHelper.visible = sceneSettings.enableGridHelper;
	}
	updateHelpers();

// ---- Lights
	// top light
		// renderer.shadowMapEnabled = true;
		// light = new THREE.DirectionalLight( 0xffffff, 1.0 );
		// light.position.set( 0, 500, 0 );
		// light.castShadow = true;
		// light.shadowCameraVisible = true;
		// light.shadowCameraNear = 10;
		// light.shadowCameraFar = 1000;
		// light.shadowMapWidth = 512;
		// light.shadowMapHeight = 512;
		//
		// scene.add( light );
