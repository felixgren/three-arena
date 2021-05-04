import './style.css';
import * as THREE from 'three';
import * as dat from 'dat.gui';
import Stats from 'three/examples/jsm/libs/stats.module';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

const body = document.querySelector('body');
const canvas = document.querySelector('canvas.webgl');
const gui = new dat.GUI();
const clock = new THREE.Clock();

// FPS, render time, drawcalls
const stats = new Stats();
let drawCallPanel = stats.addPanel(
    new Stats.Panel('drawcalls', '#ff8', '#221')
);
stats.showPanel(0, 1, 3);
document.body.appendChild(stats.domElement);
body.appendChild(stats.domElement);

const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);
camera.position.set(0, 0, 2);
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

const Key = {};
const playerVelocity = new THREE.Vector3();

// Movement Control
document.addEventListener('keydown', (event) => {
    Key[event.key] = true;
});

document.addEventListener('keyup', (event) => {
    Key[event.key] = false;
    // console.log(`RAISED ${event.code}`);
});

function playerControl() {
    // console.log(Key['W']);
    if (Key['w']) {
        console.log('W');
        camera.position.setX(0);
        camera.position.setY(0);
        camera.position.setZ(3);
    }
    if (Key['a']) {
        console.log('A');
        camera.position.setY(0);
        camera.position.setX(3);
        camera.position.setZ(3);
    }
    if (Key['s']) {
        console.log('S');
        camera.position.setX(0);
        camera.position.setY(3);
        camera.position.setZ(0);
    }
    if (Key['d']) {
        console.log('D');
        camera.position.setZ(5);
        camera.position.setY(3);
    }
}

// Skybox
scene.background = new THREE.CubeTextureLoader().load([
    'skybox/bluecloud_rt.jpg',
    'skybox/bluecloud_lf.jpg',
    'skybox/bluecloud_up.jpg',
    'skybox/bluecloud_dn.jpg',
    'skybox/bluecloud_ft.jpg',
    'skybox/bluecloud_bk.jpg',
]);

// Model
const gltfLoader = new GLTFLoader().setPath('models/');
gltfLoader.load('smile.glb', (gltf) => {
    gltf.scene.traverse((model) => {
        model.castShadow = true;
    });
    gltf.scene.position.z = 1;

    // gltf.scene.scale = 10;
    scene.add(gltf.scene);
});

// Objects
const geometry = new THREE.IcosahedronGeometry(1);
const floorGeometry = new THREE.BoxGeometry(10, 0.5, 10);
const wallGeometry = new THREE.BoxGeometry(10, 5, 0.5);

// Materials
const floorMaterial = new THREE.MeshPhongMaterial();
floorMaterial.color = new THREE.Color(0xff111111);
const material = new THREE.MeshPhongMaterial();
material.color = new THREE.Color(0xff109000);

// Mesh
const sphere = new THREE.Mesh(geometry, material);
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
const wall = new THREE.Mesh(wallGeometry, floorMaterial);

floor.position.set(0, -3, 0);
wall.position.set(0, -0.5, -5);

sphere.castShadow = true; //default
floor.receiveShadow = true; //default
scene.add(wall);
scene.add(floor);
scene.add(sphere);

// Lights
const pointLight = new THREE.PointLight(0xffffff, 0.1);
const pointLight2 = new THREE.PointLight(0xffffff, 0.1);
pointLight.castShadow = true;

pointLight.position.set(3, 5, -1);
pointLight2.position.set(-3, 2, 1);
pointLight.power = 20;
pointLight2.power = 0;
scene.add(pointLight, pointLight2);

const pointLightHelper = new THREE.PointLightHelper(pointLight);
const pointLightHelper2 = new THREE.PointLightHelper(pointLight2);
scene.add(pointLightHelper);
scene.add(pointLightHelper2);

const helper = new THREE.CameraHelper(pointLight.shadow.camera);
scene.add(helper);

window.addEventListener('resize', () => {
    // Update camera
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    // Update renderer
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Shadow renderer
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// time init
let lastTime = performance.now();

// Animate
const tick = () => {
    // Call tick again on the next frame
    requestAnimationFrame(tick);

    playerControl();

    // const elapsedTime = clock.getElapsedTime();
    const delta = clock.getDelta();

    // Update objects
    sphere.rotation.y += 0.5 * delta;

    // Update Orbital Controls
    controls.update();

    stats.update();

    // Render
    renderer.render(scene, camera);

    if (performance.now() - lastTime < 1000 / 1) return;
    lastTime = performance.now();
    drawCallPanel.update(renderer.info.render.calls);
};

tick();
