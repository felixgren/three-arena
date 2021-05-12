import './style.css';
import * as THREE from 'three';
import * as dat from 'dat.gui';
import Stats from 'three/examples/jsm/libs/stats.module';
import { Capsule } from 'three/examples/jsm/math/Capsule';
import { Octree } from 'three/examples/jsm/math/Octree';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { DiscreteInterpolant, PlaneBufferGeometry, TextureLoader } from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
const body = document.querySelector('body');
const canvas = document.querySelector('canvas.webgl');
const pauseButton = document.querySelector('.pause-button');
const gui = new dat.GUI();
const clock = new THREE.Clock();

let playerSpeed = 30;
let maxJumps = 2;
let gravity = 30;

// FPS, render time, drawcalls
const stats = new Stats();
let drawCallPanel = stats.addPanel(
    new Stats.Panel('drawcalls', '#ff8', '#221')
);
stats.showPanel(0, 1, 3);
document.body.appendChild(stats.domElement);
body.appendChild(stats.domElement);

const scene = new THREE.Scene();

// Skybox
scene.background = new THREE.CubeTextureLoader().load([
    'skybox/Right_Tex.png',
    'skybox/Left_Tex.png',
    'skybox/Up_Tex.png',
    'skybox/Down_Tex.png',
    'skybox/Front_Tex.png',
    'skybox/Back_Tex.png',
]);

// Camera
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 0, 2);
// scene.add(camera);

const Key = {};

// Movement Control
document.addEventListener('keydown', (event) => {
    Key[event.key] = true;
});

document.addEventListener('keyup', (event) => {
    Key[event.key] = false;
});

// Octrees
const worldOctree = new Octree();

// Vectors
let isPlayerGrounded = false;
const playerVelocity = new THREE.Vector3();
const playerDirection = new THREE.Vector3();
const upVector = new THREE.Vector3(0, 1, 0);

// https://wickedengine.net/2020/04/26/capsule-collision-detection/
const playerCapsule = new Capsule(
    new THREE.Vector3(),
    new THREE.Vector3(0, 2, 0),
    0.5
);

// Player
function playerUpdate(delta) {
    isPlayerGrounded &&
        playerVelocity.addScaledVector(playerVelocity, -5 * delta);
    !isPlayerGrounded
        ? (playerVelocity.y -= gravity * delta)
        : (playerVelocity.y = 0);
}

function playerCollision() {
    const collide = worldOctree.capsuleIntersect(playerCapsule);
    isPlayerGrounded = false;
    if (collide) {
        isPlayerGrounded = collide.normal.y > 0;

        playerCapsule.translate(collide.normal.multiplyScalar(collide.depth));
    }
}

let options = {
    // Initial
    cubeRotationX: 0,
    cubeRotationY: 0.5,
    stop: function () {
        this.cubeRotationX = 0;
        this.cubeRotationY = 0;
    },
    reset: function () {
        this.cubeRotationX = 0;
        this.cubeRotationY = 0.5;
    },
};

let cubeRotation = gui.addFolder('Cube Rotation');
cubeRotation
    .add(options, 'cubeRotationX', -5, 5, 0.1)
    .name('Cube Rotation X')
    .listen();
cubeRotation
    .add(options, 'cubeRotationY', -5, 5, 0.1)
    .name('Cube Rotation Y')
    .listen();
cubeRotation.add(options, 'stop');
cubeRotation.add(options, 'reset');

// Inputs
function playerControl(delta) {
    if (Key['w']) {
        // console.log(lookVector());
        playerVelocity.add(lookVector().multiplyScalar(playerSpeed * delta));
    }
    if (Key['a']) {
        // console.log('A');
        playerVelocity.add(
            playerDirection.crossVectors(
                upVector,
                lookVector().multiplyScalar(playerSpeed * delta)
            )
        );
    }
    if (Key['s']) {
        // console.log('S');
        playerVelocity.add(
            lookVector()
                .negate()
                .multiplyScalar(playerSpeed * delta)
        );
    }
    if (Key['d']) {
        // console.log('D');
        playerVelocity.add(
            playerDirection.crossVectors(
                upVector,
                lookVector()
                    .negate()
                    .multiplyScalar(playerSpeed * delta)
            )
        );
    }
    if (Key[' ']) {
        // console.log('Spacebar');
        playerVelocity.y = playerSpeed;
    }
    if (Key['Control']) {
        // console.log('CTRL');
        playerVelocity.y -= playerSpeed * delta;
    }
    if (Key['e']) {
        playerVelocity.set(0, 0, 0);
    }
}

// Input functions
function lookVector() {
    return camera.getWorldDirection(playerDirection);
}

function updateMovement() {
    const deltaPosition = playerVelocity.clone().multiplyScalar(0.01);

    // This can be used for movement without momentum
    // camera.position.copy(deltaPosition);

    // This is movement with momentum.
    playerCapsule.translate(deltaPosition);
    camera.position.copy(playerCapsule.end);
}

// First person camera
canvas.addEventListener('mousedown', () => {
    document.body.requestPointerLock();
});

camera.rotation.order = 'YXZ';
document.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement === document.body) {
        // FP Camera lock

        // if (camera.rotation.x > 1.55) {
        //     camera.rotation.x = 1.55;
        // }
        // if (camera.rotation.x < -1.55) {
        //     camera.rotation.x = -1.55;
        // }
        camera.rotation.x -= event.movementY / 700;
        camera.rotation.y -= event.movementX / 700;
    }
});

// World environment group
const world = new THREE.Group();

// Models GLTF/GLB
const gltfLoader = new GLTFLoader().setPath('models/');

// Terrain
gltfLoader.load('terrain.glb', (gltf) => {
    gltf.scene.traverse((model) => {
        model.castShadow = true;
        // model.material.position.z = -800;
        // model.body.position.z = -800;
        console.log(model.getWorldPosition);
    });
    // console.log(gltf.scene);
    // gltf.scene.translateZ(-500);
    // gltf.scene.position.y = -2;
    world.add(gltf.scene);
    worldOctree.fromGraphNode(gltf.scene);
});

// Models FBX
const fbxLoader = new FBXLoader().setPath('models/');
fbxLoader.load(
    'rocks.fbx',
    (object) => {
        object.traverse(function (child) {
            if (child instanceof THREE.Mesh) {
                child.material.map = textureRock;
                child.scale.set(0.15, 0.15, 0.15);
                child.material.color.setHex(0xb5aa61);
            }
        });
        object.position.x = -100;
        object.position.z = 500;
        object.position.y = 0;
        world.add(object);
        worldOctree.fromGraphNode(object);
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
    },
    (error) => {
        console.log(error);
    }
);

// Objects
const geometry = new THREE.IcosahedronGeometry(1);
const floorGeometry = new THREE.PlaneBufferGeometry(500, 2000, 128, 128);

// Textures

const textureRock = new THREE.TextureLoader().load('models/rocktexture.jpg');
textureRock.wrapS = THREE.RepeatWrapping;
textureRock.wrapT = THREE.RepeatWrapping;
textureRock.repeat.set(1, 1);

const displacementMap = new THREE.TextureLoader().load('models/heightmap.png');
displacementMap.wrapS = THREE.RepeatWrapping;
displacementMap.wrapT = THREE.RepeatWrapping;
displacementMap.repeat.set(1, 1);
const textMat = new THREE.MeshPhongMaterial({
    color: 'gray',
    map: textureRock,
    displacementMap: displacementMap,
    displacementScale: 200,
    displacementBias: -0.428408,
});

// Materials
const floorMaterial = new THREE.MeshPhongMaterial();
floorMaterial.color = new THREE.Color(0xff111111);
const material = new THREE.MeshPhongMaterial();
material.color = new THREE.Color(0xff109000);

// Mesh

const sphere = new THREE.Mesh(geometry, material);
const floor = new THREE.Mesh(floorGeometry, textMat);

// Mesh geography
floor.rotation.z = Math.PI / 2;
floor.position.set(-500, -10, -1000);
floor.rotation.x = -89.5;

// Mesh Shadows
sphere.castShadow = true; //default
floor.receiveShadow = true; //default

world.add(floor);
world.add(sphere);
scene.add(world);
worldOctree.fromGraphNode(world);

// Lights
const pointLight = new THREE.PointLight(0xffffff, 0.1);
const pointLight2 = new THREE.PointLight(0xffffff, 0.1);
const ambient = new THREE.AmbientLight(0xffffff, 0.3);
pointLight.castShadow = true;

pointLight.position.set(3, 25, -1);
pointLight2.position.set(-3, 20, 1);
pointLight.power = 20;
pointLight2.power = 0;
scene.add(pointLight, pointLight2, ambient);

const pointLightHelper = new THREE.PointLightHelper(pointLight);
const pointLightHelper2 = new THREE.PointLightHelper(pointLight2);
scene.add(pointLightHelper);
scene.add(pointLightHelper2);

const helper = new THREE.CameraHelper(pointLight.shadow.camera);
scene.add(helper);

// Resize
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
renderer.shadowMap.type = THREE.PCFShadowMap;

let animRequest;
let toggle = false;
pauseButton.addEventListener('click', () => {
    toggle = !toggle;

    if (toggle) {
        console.log('Time is stopped!');
        stopAnimation();
    } else {
        console.log('Time resumed!');
        tick();
    }
});

// time init
let lastTime = performance.now();
let velocityStats = document.querySelector('.velocity-stats');
let positionStats = document.querySelector('.position-stats');

function roundStat(data) {
    return Math.round(data * 100) / 100;
}

function stopAnimation() {
    cancelAnimationFrame(animRequest);
    clock.stop();
}

// Animate
const tick = () => {
    const delta = clock.getDelta();

    // Call tick again on the next frame
    animRequest = requestAnimationFrame(tick);

    playerControl(delta);

    playerUpdate(delta);

    playerCollision();

    // Update objects
    sphere.rotation.x += options.cubeRotationX * delta;
    sphere.rotation.y += options.cubeRotationY * delta;

    updateMovement();

    stats.update();

    // Render
    renderer.render(scene, camera);

    // Stats
    velocityStats.innerHTML = `
    X: ${roundStat(playerVelocity.x)} <br> 
    Y: ${roundStat(playerVelocity.y)} <br> 
    Z: ${roundStat(playerVelocity.z)}`;

    positionStats.innerHTML = `
    X: ${roundStat(camera.position.x)} <br> 
    Y: ${roundStat(camera.position.y)} <br> 
    Z: ${roundStat(camera.position.z)}`;

    if (performance.now() - lastTime < 1000 / 1) return;
    lastTime = performance.now();
    drawCallPanel.update(renderer.info.render.calls);
};

tick();
