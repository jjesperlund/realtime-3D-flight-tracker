import './style/main.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as CONSTANTS from './contants.js';
import { mockData } from './mockData';

let renderer, scene, camera, directionalLight, earthMesh, cloudMesh, bloomComposer;
let flightsData = [];

init();

async function fetchData() {
    const response = await fetch('https://airlabs.co/api/v9/flights?api_key=963ec8cc-82f3-4c0d-955c-eedfceea6497');
    const flights = await response.json();
    return flights.response;
}

async function init() {
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set( 12, 12, -5 );

    scene = new THREE.Scene();
    scene.background = new THREE.Color('#111111');

    directionalLight = new THREE.PointLight(0xffffff, 0.8);
    directionalLight.position.set(8, 24, -22);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);

    const light = new THREE.AmbientLight( 0x404040, 0.5 );
    scene.add( light );

    // Add star galaxy
    for (let z = 0; z < CONSTANTS.NUM_STARS; z++) {
        var geometry = new THREE.SphereGeometry(0.03, 8, 8)
        var material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        var sphere = new THREE.Mesh(geometry, material)

        // Position star randomly in space
        sphere.position.x = Math.random() * 200 - 100;
        sphere.position.y = Math.random() * 200 - 100;
        sphere.position.z = Math.random() * 200 - 100;

        scene.add( sphere );
    }

    // Add earth mesh
    const earthGeometry = new THREE.SphereGeometry(
        CONSTANTS.EARTH_RADIUS_IN_METERS * CONSTANTS.DISTANCE_FACTOR, 72, 72);
    const earthMaterial = new THREE.MeshPhongMaterial({
        shininess: 15,
        map: new THREE.TextureLoader().load('textures/8k_earth_daymap.jpg'),
        normalMap: new THREE.TextureLoader().load('textures/8k_earth_normal_map.tif'),
        normalScale: new THREE.Vector2(20, 20),
        specular: new THREE.Color(0x333333),
        specularMap: new THREE.TextureLoader().load('textures/8k_earth_specular_map.tif')
    });
    earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    earthMesh.receiveShadow = true;
    scene.add(earthMesh);

    // Add clouds mesh with 0.1% greater radius than the earth mesh
    const cloudGeometry = new THREE.SphereGeometry(
        CONSTANTS.EARTH_RADIUS_IN_METERS * CONSTANTS.DISTANCE_FACTOR * 1.001, 32, 32
    );
    const cloudMaterial = new THREE.MeshPhongMaterial({
        map: new THREE.TextureLoader().load('textures/fair_clouds_4k.png'),
        transparent: true,
        opacity: 0.8
    });
    cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
    scene.add(cloudMesh);

    initFlights();
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMapSoft = true;
    document.body.appendChild(renderer.domElement);

    //Add bloom renderer for glow effect
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1,
        CONSTANTS.EARTH_RADIUS_IN_METERS * CONSTANTS.DISTANCE_FACTOR * 0.5,
        0.1
    );

    bloomPass.threshold = 0.1;
    bloomPass.strength = 0.1;
    bloomPass.radius = CONSTANTS.EARTH_RADIUS_IN_METERS * CONSTANTS.DISTANCE_FACTOR * 0.5;

    bloomComposer = new EffectComposer(renderer);
    bloomComposer.setSize(window.innerWidth, window.innerHeight);
    bloomComposer.renderToScreen = true;
    bloomComposer.addPass(renderScene);
    bloomComposer.addPass(bloomPass);

    // == Controls for navigating the 3D scene ==========================
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.screenSpacePanning = true;
    controls.maxDistance = CONSTANTS.CAMERA_MAX_DISTANCE;
    controls.minDistance = CONSTANTS.CAMERA_MIN_DISTANCE;
    controls.update();

    update();
    window.addEventListener('resize', onWindowResize);

    // Update flight postions every 5 second
    // setInterval(initFlights, 5000);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}

function update(elapsedTime) {
    //earthMesh.rotation.y = elapsedTime * 0.00001;
    //cloudMesh.rotation.y = elapsedTime * 0.00001;
    //flightsGroup.rotation.y = elapsedTime * 0.00001;
    
    requestAnimationFrame(update);
    renderer.render(scene, camera);
    bloomComposer.render();
}

async function initFlights() {

    flightsData = await fetchData();
    //flightsData = mockData.response; // mock data for testing

    const flightModelGroup = await loadAirplaneModel();
    let flightsGroup = new THREE.Group();

    flightsData.forEach(flight => {
        const newAirplane = cloneGroup(flightModelGroup);
        newAirplane.scale.set(1/55000, 1/55000, 1/55000)

        placePlaneOnPlanet(newAirplane, flight.lat, flight.lng, flight.alt, flight.dir);
        flightsGroup.add(newAirplane);
    })

    scene.remove(flightsGroup);
    scene.add(flightsGroup);

    console.log("Added " + flightsData.length + " flights to the scene.")
}

function placePlaneOnPlanet(object, lat, lon, altitude, directionInDegrees) {
    var latRad = lat * (Math.PI / 180);
    var lonRad = -lon * (Math.PI / 180);

    altitude += CONSTANTS.EARTH_RADIUS_IN_METERS;
    altitude *= CONSTANTS.DISTANCE_FACTOR;

    object.position.set(
        Math.cos(latRad) * Math.cos(lonRad) * altitude,
        Math.sin(latRad) * altitude,
        Math.cos(latRad) * Math.sin(lonRad) * altitude
    );
    object.rotation.set(0.0, -lonRad, latRad - Math.PI * 0.5);
    object.rotateOnAxis(new THREE.Vector3(0, 1, 0), degreesToRadians(directionInDegrees));
}

function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
}

function cloneGroup(group) {
    if (group.children.length === 0) {
        console.log('cloneGroup: No meshes found in group', group);
        return;
    }

    let clone = new THREE.Group();
    group.children.forEach(mesh => {
        let meshClone = mesh.clone();
        clone.add(meshClone);
    });

    return clone;
}

async function loadAirplaneModel() {
    const airplaneBodyMeshName = 'fuselage';
    const fbxLoader = new FBXLoader();
    const model = await fbxLoader.loadAsync('3D-models/boeing/B_787_8.fbx');
    let airplaneGroup = new THREE.Group();

    model.children.forEach(child => {
        if (child.isMesh && child.name === airplaneBodyMeshName) { 
            const texture = new THREE.TextureLoader().load(
              '3D-models/boeing/texture.png'
            );            
            child.material.map = texture;
            child.material.needsUpdate = true;
            airplaneGroup.add(child);
        }
    });

    return airplaneGroup;
}