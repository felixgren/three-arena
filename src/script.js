import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as dat from 'dat.gui';

// Debug GUI
const gui = new dat.GUI();

// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();

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

// Sizes
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
};

window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    // Update camera
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    // Update renderer
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Base camera
const camera = new THREE.PerspectiveCamera(
    75,
    sizes.width / sizes.height,
    0.1,
    100
);
camera.position.set(0, 0, 2);
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Shadow renderer
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Animate
const clock = new THREE.Clock();

const tick = () => {
    // Call tick again on the next frame
    window.requestAnimationFrame(tick);

    const elapsedTime = clock.getElapsedTime();

    // Update objects
    sphere.rotation.y = 0.5 * elapsedTime;

    // group.rotation.x += 0.005;
    // group.rotation.y += 0.005;

    // Update Orbital Controls
    controls.update();

    // Render
    renderer.render(scene, camera);
};

tick();
