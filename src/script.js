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
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
const body = document.querySelector('body');
const canvas = document.querySelector('canvas.webgl');
const pauseButton = document.querySelector('.pause-button');
const gui = new dat.GUI();
const clock = new THREE.Clock();

let playerSpeed = 30;
let maxJumps = 2; // not in yet
let gravity = 70;
let maxRockets = 100;
let rocketForce = 30;

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
    'skybox/Right_Tex.webp',
    'skybox/Left_Tex.webp',
    'skybox/Up_Tex.webp',
    'skybox/Down_Tex.webp',
    'skybox/Front_Tex.webp',
    'skybox/Back_Tex.webp',
]);

// Camera
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

// Movement Control
const Key = {};
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

// Debug GUI
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
        playerVelocity.add(lookVector().multiplyScalar(playerSpeed * delta));
    }
    if (Key['a']) {
        playerVelocity.add(
            playerDirection.crossVectors(
                upVector,
                lookVector().multiplyScalar(playerSpeed * delta)
            )
        );
    }
    if (Key['s']) {
        playerVelocity.add(
            lookVector()
                .negate()
                .multiplyScalar(playerSpeed * delta)
        );
    }
    if (Key['d']) {
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
        playerVelocity.y = playerSpeed;
    }
    if (Key['Control']) {
        playerVelocity.y -= playerSpeed * delta;
    }
    if (Key['e']) {
        playerVelocity.set(0, 0, 0);
    }
}

// Input functions
function lookVector() {
    camera.getWorldDirection(playerDirection);
    playerDirection.normalize();
    return playerDirection;
}

let collisionsEnabled = true;
function updateMovement(delta) {
    const deltaPosition = playerVelocity.clone().multiplyScalar(delta);

    // This can be used for movement without momentum
    // camera.position.copy(deltaPosition);

    // This is movement with momentum.
    playerCapsule.translate(deltaPosition);
    camera.position.copy(playerCapsule.end);

    if (collisionsEnabled) {
        playerCollision();
    }

    if (camera.position.y < -200) {
        console.log('Player fell off the map, up they go');
        let pushForce = 200;
        camera.position.y < -5000 && (pushForce = 500);
        playerVelocity.set(0, 0, 0);
        playerVelocity.y = pushForce;
        collisionsEnabled = false;
        setTimeout(() => {
            camera.position.y > -200 &&
                console.log('World collisions re-enabled');
            collisionsEnabled = true;
        }, 2500);
    }
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

// Rocket Model
const rocketGeometry = new THREE.CylinderGeometry(0.05, 0.15, 2, 12); // without animation
const rocketMaterial = new THREE.MeshPhongMaterial();
rocketMaterial.color = new THREE.Color(0x000000);

// Rocket Audio
const audioLoader = new THREE.AudioLoader();
const audioListener = new THREE.AudioListener();
camera.add(audioListener);

// Rocket Lights
const frontRocketLight = new THREE.PointLight(0xffaa00, 0.1);
const backRocketLight = new THREE.PointLight(0xff0000, 0.1);
scene.add(frontRocketLight, backRocketLight);
frontRocketLight.castShadow = true;
backRocketLight.castShadow = true;

const rockets = [];
let rocketIdx = 0;

audioLoader.load('sounds/rocket-explode.m4a', function (buffer) {
    audioLoader.load('sounds/rocket-flying.m4a', function (buffer2) {
        for (let i = 0; i < maxRockets; i++) {
            const coolRocket = new THREE.Mesh(rocketGeometry, rocketMaterial);

            // Might be too expensive
            coolRocket.castShadow = true;
            coolRocket.receiveShadow = true;

            coolRocket.userData.isExploded = false;

            const audioRocketExplode = new THREE.PositionalAudio(audioListener);
            const audioRocketFly = new THREE.PositionalAudio(audioListener);
            audioRocketExplode.setBuffer(buffer);
            audioRocketFly.setBuffer(buffer2);
            coolRocket.add(audioRocketExplode);
            coolRocket.add(audioRocketFly);

            scene.add(coolRocket);

            rockets.push({
                mesh: coolRocket,
                collider: new THREE.Sphere(new THREE.Vector3(0, -50, 0), 0.5),
                velocity: new THREE.Vector3(),
            });
        }
    });
});

document.addEventListener('click', () => {
    // Currently bug causes rocket to misalign after reaching maxRocket count, AKA when rocketIdx is reset.
    const rocket = rockets[rocketIdx];

    // Align rocket to look direction
    rocket.mesh.lookAt(lookVector().negate());

    // Rocket lights
    rocket.mesh.add(frontRocketLight, backRocketLight);
    frontRocketLight.position.set(0, -1.1, 0);
    backRocketLight.position.set(0, -1.2, 0);
    frontRocketLight.power = 120;
    backRocketLight.power = 100;
    frontRocketLight.distance = 10;
    backRocketLight.distance = 10; // use for animation

    // Copy player head pos to projectile center
    rocket.collider.center.copy(playerCapsule.end);

    // Apply force in look direction
    rocket.velocity.copy(lookVector()).multiplyScalar(rocketForce);

    // Reset explode state
    rocket.mesh.userData.isExploded = false;

    // Set rocket visible
    rocket.mesh.visible = true;

    rocketIdx = (rocketIdx + 1) % rockets.length;
});

let deltaRocket = 0;
function updateRockets(delta) {
    rockets.forEach((rocket) => {
        rocket.collider.center.addScaledVector(rocket.velocity, delta);

        // Check collision
        const result = worldOctree.sphereIntersect(rocket.collider);

        let airRocketIdx;
        if (rocketIdx > 0) {
            airRocketIdx = rocketIdx - 1;
        } else {
            airRocketIdx = rocketIdx;
        }

        const audioRocketFly = rockets[airRocketIdx].mesh.children[1];
        const audioRocketExplode = rockets[airRocketIdx].mesh.children[0];

        if (rocketIdx !== deltaRocket) {
            deltaRocket = rocketIdx;
            audioRocketFly.offset = 1;
            audioRocketFly.play();
        }

        if (result) {
            // On hit
            rocket.velocity.set(0, 0, 0);
            if (
                // !audioRocketExplode.isPlaying &&
                !rocket.mesh.userData.isExploded
            ) {
                console.log('Rocket hit');
                rocket.mesh.userData.isExploded = true;
                audioRocketExplode.offset = 0.05;
                audioRocketExplode.play();
                audioRocketFly.stop();

                // Set rocket invisible
                setTimeout(() => {
                    rocket.mesh.visible = false;
                }, 1000);
            }
        } else {
            // In air
            rocket.velocity.y -= (gravity / 15) * delta;
        }

        // Accelerate with time
        const acceleration = Math.exp(3 * delta) - 1;
        rocket.velocity.addScaledVector(rocket.velocity, acceleration);

        rocket.mesh.position.copy(rocket.collider.center);
    });
}

// Skybox
// scene.background = new THREE.CubeTextureLoader().load([
//     'skybox/bluecloud_rt.jpg',
//     'skybox/bluecloud_lf.jpg',
//     'skybox/bluecloud_up.jpg',
//     'skybox/bluecloud_dn.jpg',
//     'skybox/bluecloud_ft.jpg',
//     'skybox/bluecloud_bk.jpg',
// ]);

// Models GLTF/GLB
const gltfLoader = new GLTFLoader().setPath('models/');

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('draco/');

gltfLoader.setDRACOLoader(dracoLoader);

// Terrain
gltfLoader.load('terrain-draco-2.glb', (gltf) => {
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

// floor.position.set(0, -3, 0);
// wall.position.set(0, -0.5, -50);
// sphere.position.set(0, 0, -10);

// Mesh Shadows
sphere.castShadow = true; //default
floor.receiveShadow = true; //default

world.add(floor);
world.add(sphere);
scene.add(world);
worldOctree.fromGraphNode(world);

// Lights
const ambientLight = new THREE.AmbientLight(0x404040); // soft white light
const pointLight = new THREE.PointLight(0xffffff, 0.1);
const pointLight2 = new THREE.PointLight(0xffffff, 0.1);
const ambient = new THREE.AmbientLight(0xffffff, 0.3);
pointLight.castShadow = true;

pointLight.position.set(3, 5, -1);
pointLight2.position.set(-3, 2, 1);

ambientLight.power = 30;
pointLight.power = 20;
pointLight2.power = 10;

scene.add(pointLight, pointLight2, ambientLight);

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

    updateRockets(delta);

    // Update objects
    sphere.rotation.x += options.cubeRotationX * delta;
    sphere.rotation.y += options.cubeRotationY * delta;

    updateMovement(delta);

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
