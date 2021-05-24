import '../style.css';
import * as THREE from 'three';
import * as dat from 'dat.gui';
import io from 'socket.io-client';
import Stats from 'three/examples/jsm/libs/stats.module';
import { Capsule } from 'three/examples/jsm/math/Capsule';
import { Octree } from 'three/examples/jsm/math/Octree';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { DiscreteInterpolant, PlaneBufferGeometry, TextureLoader } from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

class Game {
    constructor() {
        this.camera = null;
        this.scene = null;
        this.renderer = null;

        this.gui = null;
        this.clock = null;

        this.worldOctree = new Octree();
        this.world = new THREE.Group();

        this.lastTime = null;
        this.stats = null;
        this.drawCallPanel = null;

        this.player = null;
        this.playerCapsule = null;
        this.isPlayerGrounded = false;
        this.playerSpeed = 30;
        this.playerVelocity = null;

        this.Key = {};
        this.controls = null;
        this.maxJumps = 2;
        this.upVector = null;
        this.gravity = 100;

        this.toggle = false;
        this.collisionsEnabled = true;

        this.rockets = [];
        this.rocketForce = 90;
        this.maxRockets = 20;
        this.rocketIdx = 0;
        this.deltaRocket = 0;
        this.frontRocketLight = null;
        this.backRocketLight = null;

        // this.loadingManager = new THREE.LoadingManager();
        this.audioLoader = new THREE.AudioLoader();
        this.listener = new THREE.AudioListener();
        this.audio = new THREE.Audio(this.listener);
        this.audioMap = new Map();
        // this.socket = io('http://localhost:3000');
        // this.socket.emit('chat message', 'hello hello');
        // this.socket.on('chat message', function (message) {
        //     console.log(message);
        // });

        this.animRequest;
        this.requestAnimId = null;
        this.startAnimation = startAnimation.bind(this);
        this.stopAnimation = stopAnimation.bind(this);

        this.ui = {
            body: document.querySelector('body'),
            pauseButton: document.querySelector('.pause-button'),
            velocityStats: document.querySelector('.velocity-stats'),
            positionStats: document.querySelector('.position-stats'),
            // crosshair: (document.querySelector('.crosshair').src =
            //     'images/crosshair.png'),
        };
    }

    // Loading scene function before game is started
    load() {
        console.log('PRELOADING...');
        this.initAudio();
        this.initScene();
        this.initSkybox();
        this.initMap();
        this.initPlayer();
        this.initRockets();
        this.initStats();
    }

    // Init function when game starts
    startGame() {
        console.log('START GAME');

        this.activatePointerLock();
        this.activateMovement();
        this.activateRocketShooting();
        this.startAnimation(); // Starts tick function
    }

    pauseGame() {
        this.ui.pauseButton.addEventListener('click', () => {
            this.toggle = !this.toggle;
            this.toggle ? this.stopAnimation() : this.startAnimation();
        });
    }

    // Main update game function
    tick() {
        const delta = this.clock.getDelta();

        this.updatePlayerControl(delta);
        this.updateCheckOnGround(delta);
        this.updatePlayerMovement(delta);
        this.updateRockets(delta);

        this.stats.update();

        this.renderer.render(this.scene, this.camera);

        this.updateStats();
    }

    // ------------------------------------------------
    // Main init functions during loading screen

    initAudio() {
        const audioLoader = this.audioLoader;
        const audioMap = this.audioMap;
        const listener = this.listener;

        const rocketExplode = new THREE.PositionalAudio(listener);
        const rocketFly = new THREE.PositionalAudio(listener);

        audioLoader.load(
            'sounds/rocket-explode.ogg',
            (buffer) =>
                rocketExplode.setBuffer(buffer) &&
                console.log('-- loaded audio 1'),
            console.log('-- loading audio one...')
        );
        audioLoader.load(
            'sounds/rocket-flying.ogg',
            (buffer) =>
                rocketFly.setBuffer(buffer) &&
                console.log('-- loaded audio 2!'),
            console.log('-- loading audio two...')
        );

        audioMap.set('rocketFly', rocketFly);
        audioMap.set('rocketExplode', rocketExplode);
        console.log('init audio');

        // const sound = new THREE.Audio(listener);
        // const bgTrackPath = './sounds/asiastana.ogg';
        // audioLoader.load(bgTrackPath, function (buffer) {
        //     sound.setBuffer(buffer);
        //     sound.setLoop(true);
        //     sound.setVolume(0.075);
        //     sound.play();
        // });
    }

    initScene() {
        this.gui = new dat.GUI();
        this.clock = new THREE.Clock();
        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.add(this.listener);

        const ambientLight = new THREE.AmbientLight(0x404040); // soft white light
        ambientLight.power = 100;
        this.scene.add(ambientLight);

        // const dirLight = new THREE.DirectionalLight(0xffffff, 0.3); // Exposes terrain vertices
        // dirLight.position.set(40, 100, 1);
        // dirLight.castShadow = true;
        // dirLight.target.position.set(0, 0, 0);
        // this.scene.add(dirLight);

        // const pointLight = new THREE.PointLight(0xffffff, 0.5);
        // const pointLightHelper = new THREE.PointLightHelper(pointLight, 2);
        // pointLight.castShadow = true;
        // pointLight.position.set(50, 300, 0);
        // this.scene.add(pointLight);
        // this.scene.add(pointLightHelper);

        // ---- MAYBE other init functions here such as field, playermodel, map, objects, rockets etc

        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.ui.body.appendChild(this.renderer.domElement);

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        });

        console.log('init scene');
    }

    initSkybox() {
        this.scene.background = new THREE.CubeTextureLoader().load([
            'skybox/Right_Tex.webp',
            'skybox/Left_Tex.webp',
            'skybox/Up_Tex.webp',
            'skybox/Down_Tex.webp',
            'skybox/Front_Tex.webp',
            'skybox/Back_Tex.webp',
        ]);

        console.log('init skybox');
    }

    initMap() {
        // const groundTexture = new THREE.TextureLoader().load(
        //     'models/venus.png'
        // );

        const gltfLoader = new GLTFLoader().setPath('models/');
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('draco/');
        gltfLoader.setDRACOLoader(dracoLoader);
        gltfLoader.load('scene.glb', (gltf) => {
            gltf.scene.traverse((model) => {
                model.receiveShadow = true;
                model.castShadow = true;
            });
            gltf.scene.receiveShadow = true;
            gltf.scene.castShadow = true;
            this.world.add(gltf.scene);
            this.worldOctree.fromGraphNode(gltf.scene);
        });
        gltfLoader.load('tree.gltf', (gltf) => {
            gltf.scene.traverse((model) => {});
            gltf.scene.scale.set(35, 35, 35);
            gltf.scene.position.set(-2, -10, -2);
            this.world.add(gltf.scene);

            // Replaced with invisible nav mesh in editor
            // this.worldOctree.fromGraphNode(gltf.scene);
        });

        // Models FBX
        // const fbxLoader = new FBXLoader().setPath('models/');
        // fbxLoader.load('odyssey.fbx', (rock) => {
        //     rock.traverse(function (child) {
        //         if (child instanceof THREE.Mesh) {
        //             // child.material.map = textureRock;
        //             child.scale.setScalar(0.0045);
        //             child.material.color.setHex(0xffffff);
        //         }
        //     });
        //     rock.position.x = -150;
        //     rock.position.z = 240;
        //     rock.position.y = 200;
        //     this.world.add(rock);
        //     this.worldOctree.fromGraphNode(rock);
        // });

        // TEST Objects
        const geometry = new THREE.IcosahedronGeometry(1);
        const bgGeometry = new THREE.PlaneBufferGeometry(500, 1200, 128, 128);
        const bgGeometryVariant = new THREE.PlaneBufferGeometry(
            420,
            1400,
            128,
            128
        );
        const bgGeoFull = new THREE.PlaneBufferGeometry(1500, 1500, 128, 128);

        const textureRock = new THREE.TextureLoader().load(
            'models/rocktexture.jpg'
        );
        textureRock.wrapS = THREE.RepeatWrapping;
        textureRock.wrapT = THREE.RepeatWrapping;
        textureRock.repeat.set(1, 1);

        const displacementMap = new THREE.TextureLoader().load(
            'models/paintbg.png'
        );
        displacementMap.wrapS = THREE.RepeatWrapping;
        displacementMap.wrapT = THREE.RepeatWrapping;
        displacementMap.repeat.set(1, 1);
        const textMat = new THREE.MeshPhongMaterial({
            color: 'black',
            // map: textureRock,
            displacementMap: displacementMap,
            displacementScale: 500,
            displacementBias: -0.428408,
        });

        const bgMaterial = new THREE.MeshBasicMaterial();
        bgMaterial.color = new THREE.Color(0xff111111);
        const material = new THREE.MeshPhongMaterial();
        material.color = new THREE.Color(0xff109000);

        const sphere = new THREE.Mesh(geometry, material);
        const bgSouth = new THREE.Mesh(bgGeometry, textMat);
        const bgNorth = new THREE.Mesh(bgGeometry, textMat);
        const bgEast = new THREE.Mesh(bgGeometryVariant, textMat);
        const bgWest = new THREE.Mesh(bgGeometryVariant, textMat);
        const bgfull = new THREE.Mesh(bgGeoFull, textMat);

        bgSouth.rotation.z = Math.PI / 2;
        bgSouth.position.set(-400, 0, -550);
        bgSouth.rotation.x = -89.61;

        bgNorth.rotation.z = Math.PI / 2;
        bgNorth.position.set(-400, 0, 910);
        bgNorth.rotation.x = -89.5;

        bgEast.position.set(270, 0, 170);
        bgEast.rotation.x = -89.5;

        bgWest.position.set(-1200, 0, 210);
        bgWest.rotation.x = -89.5;

        bgfull.position.set(0, -250, 0);
        bgfull.rotation.x = -89.5;
        bgfull.rotation.z = 89.5;

        sphere.castShadow = true;
        sphere.position.set(0, 75, 0);
        sphere.scale.set(2, 2, 2);
        // No need (?)
        bgSouth.receiveShadow = true;

        // this.world.add(bgSouth);
        // this.world.add(bgNorth);
        // this.world.add(bgEast);
        // this.world.add(bgWest);
        this.world.add(bgfull);
        this.world.add(sphere);
        this.scene.add(this.world);
        this.worldOctree.fromGraphNode(this.world);

        console.log('init map');
    }

    initPlayer() {
        this.playerVelocity = new THREE.Vector3();
        this.playerDirection = new THREE.Vector3();
        this.upVector = new THREE.Vector3(0, 1, 0);

        // https://wickedengine.net/2020/04/26/capsule-collision-detection/
        this.playerCapsule = new Capsule(
            new THREE.Vector3(),
            new THREE.Vector3(0, 3, 0),
            0.5
        );

        console.log('init player');
    }

    initRockets() {
        const rocketGeometry = new THREE.CylinderGeometry(0.05, 0.15, 2, 12);
        const rocketMaterial = new THREE.MeshPhongMaterial();
        rocketMaterial.color = new THREE.Color(0x000000);

        this.frontRocketLight = new THREE.PointLight(0xffaa00, 0.1);
        this.backRocketLight = new THREE.PointLight(0xff0000, 0.1);

        this.scene.add(this.frontRocketLight, this.backRocketLight);

        this.frontRocketLight.castShadow = true;
        this.backRocketLight.castShadow = true;

        for (let i = 0; i < this.maxRockets; i++) {
            const coolRocket = new THREE.Mesh(rocketGeometry, rocketMaterial);

            coolRocket.castShadow = true;
            coolRocket.receiveShadow = true;
            coolRocket.userData.isExploded = false;
            coolRocket.userData.rocketExplode =
                this.audioMap.get('rocketExplode');

            this.scene.add(coolRocket);

            this.rockets.push({
                mesh: coolRocket,
                collider: new THREE.Sphere(new THREE.Vector3(0, -50, 0), 0.5),
                velocity: new THREE.Vector3(),
            });
        }
        console.log('init rockets');
    }

    initStats() {
        this.stats = new Stats();
        this.drawCallPanel = this.stats.addPanel(
            new Stats.Panel('drawcalls', '#ff8', '#221')
        );
        this.stats.showPanel(0, 1, 3);
        this.ui.body.appendChild(this.stats.domElement);
        this.ui.body.appendChild(this.stats.domElement);

        this.lastTime = performance.now();
    }

    // ------------------------------------------------
    // Activate functions when game starts

    activatePointerLock() {
        this.ui.body.requestPointerLock();

        document.querySelector('canvas').addEventListener('mousedown', () => {
            this.ui.body.requestPointerLock();
        });

        this.camera.rotation.order = 'YXZ';

        document.addEventListener('mousemove', (event) => {
            if (document.pointerLockElement === this.ui.body) {
                // add check looking for 360 rotation
                this.camera.rotation.x -= event.movementY / 700;
                this.camera.rotation.y -= event.movementX / 700;
            }
        });
        console.log('Activate pointerlock');
    }

    activateMovement() {
        document.addEventListener('keydown', (event) => {
            this.Key[event.key] = true;
        });
        document.addEventListener('keyup', (event) => {
            this.Key[event.key] = false;
        });

        console.log('Activate movement controls');
    }

    activateRocketShooting() {
        document.addEventListener('click', () => {
            // Currently bug causes rocket to misalign after reaching maxRocket count, AKA when rocketIdx is reset.
            const rocket = this.rockets[this.rocketIdx];

            // Align rocket to look direction
            rocket.mesh.lookAt(this.lookVector().negate());

            rocket.mesh.add(this.frontRocketLight, this.backRocketLight);
            this.frontRocketLight.position.set(0, -1.1, 0);
            this.backRocketLight.position.set(0, -1.2, 0);
            this.frontRocketLight.power = 120;
            this.backRocketLight.power = 100;
            this.frontRocketLight.distance = 10;
            this.backRocketLight.distance = 10; // use for animation

            // console.log(rocket.mesh.userData);
            // rocket.mesh.add(rocket.mesh.userData.rocketExplode);

            // Copy player head pos to projectile center
            rocket.collider.center.copy(this.playerCapsule.end);

            // Apply force in look direction
            rocket.velocity
                .copy(this.lookVector())
                .multiplyScalar(this.rocketForce);

            // Reset explode state
            rocket.mesh.userData.isExploded = false;

            // Set rocket visible
            rocket.mesh.visible = true;

            this.rocketIdx = (this.rocketIdx + 1) % this.rockets.length;

            console.log('Rocket fired');
        });
    }

    // ------------------------------------------------
    // Functions to update game in animation function (tick)

    updatePlayerControl(delta) {
        if (this.Key['w']) {
            this.playerVelocity.add(
                this.lookVector().multiplyScalar(this.playerSpeed * delta)
            );
        }
        if (this.Key['a']) {
            this.playerVelocity.add(
                this.playerDirection.crossVectors(
                    this.upVector,
                    this.lookVector().multiplyScalar(this.playerSpeed * delta)
                )
            );
        }
        if (this.Key['s']) {
            this.playerVelocity.add(
                this.lookVector()
                    .negate()
                    .multiplyScalar(this.playerSpeed * delta)
            );
        }
        if (this.Key['d']) {
            this.playerVelocity.add(
                this.playerDirection.crossVectors(
                    this.upVector,
                    this.lookVector()
                        .negate()
                        .multiplyScalar(this.playerSpeed * delta)
                )
            );
        }
        if (this.Key[' ']) {
            this.playerVelocity.y = this.playerSpeed;
        }
        if (this.Key['Control']) {
            this.playerVelocity.y -= this.playerSpeed * delta;
        }
        if (this.Key['e']) {
            this.playerVelocity.set(0, 0, 0);
        }
    }

    updateCheckOnGround(delta) {
        this.isPlayerGrounded &&
            this.playerVelocity.addScaledVector(
                this.playerVelocity,
                -5 * delta
            );
        !this.isPlayerGrounded
            ? (this.playerVelocity.y -= this.gravity * delta)
            : (this.playerVelocity.y = 0);
    }

    updatePlayerMovement(delta) {
        const deltaPosition = this.playerVelocity.clone().multiplyScalar(delta);

        // This can be used for movement without momentum
        // camera.position.copy(deltaPosition);

        // This is movement with momentum.
        this.playerCapsule.translate(deltaPosition);
        this.camera.position.copy(this.playerCapsule.end);

        if (this.collisionsEnabled) {
            this.playerCollision();
        }

        if (this.camera.position.y < -200) {
            console.log('Player fell off the map, up they go');
            let pushForce = 200;
            this.camera.position.y < -5000 && (pushForce = 500);
            this.playerVelocity.set(0, 0, 0);
            this.playerVelocity.y = pushForce;
            this.collisionsEnabled = false;

            setTimeout(() => {
                this.camera.position.y > -200 &&
                    console.log('World collisions re-enabled');
                this.collisionsEnabled = true;
            }, 2500);
        }
    }

    updateRockets(delta) {
        this.rockets.forEach((rocket) => {
            rocket.collider.center.addScaledVector(rocket.velocity, delta);

            // Check collision
            const result = this.worldOctree.sphereIntersect(rocket.collider);

            let airRocketIdx;
            if (this.rocketIdx > 0) {
                airRocketIdx = this.rocketIdx - 1;
            } else {
                airRocketIdx = this.rocketIdx;
            }

            // const audioRocketFly = this.rockets[airRocketIdx].mesh.children[1];
            // const audioRocketExplode = this.rockets[airRocketIdx].mesh
            //     .children[0];

            if (this.rocketIdx !== this.deltaRocket) {
                this.deltaRocket = this.rocketIdx;

                const audio = this.audioMap.get('rocketFly');
                audio.offset = 1;
                audio.play();
            }

            // On hit
            if (result) {
                rocket.velocity.set(0, 0, 0);
                if (
                    // !audioRocketExplode.isPlaying &&
                    !rocket.mesh.userData.isExploded
                ) {
                    console.log('Rocket hit');
                    rocket.mesh.userData.isExploded = true;

                    const audio = this.audioMap.get('rocketExplode');
                    audio.offset = 0.05;
                    audio.play();
                    this.audioMap.get('rocketFly').stop();
                    // rocket.mesh.children[2].play();

                    // Set rocket invisible
                    setTimeout(() => {
                        rocket.mesh.visible = false;
                    }, 1000);
                }
            } else {
                // In air
                rocket.velocity.y -= (this.gravity / 15) * delta;
            }

            // Accelerate with time
            const acceleration = Math.exp(3 * delta) - 1;
            rocket.velocity.addScaledVector(rocket.velocity, acceleration);

            rocket.mesh.position.copy(rocket.collider.center);
        });
    }

    updateStats() {
        this.ui.velocityStats.innerHTML = `
        X: ${this.roundStat(this.playerVelocity.x)} <br> 
        Y: ${this.roundStat(this.playerVelocity.y)} <br> 
        Z: ${this.roundStat(this.playerVelocity.z)}`;

        this.ui.positionStats.innerHTML = `
        X: ${this.roundStat(this.camera.position.x)} <br> 
        Y: ${this.roundStat(this.camera.position.y)} <br> 
        Z: ${this.roundStat(this.camera.position.z)}`;

        if (performance.now() - this.lastTime < 1000 / 1) return;
        this.lastTime = performance.now();
        this.drawCallPanel.update(this.renderer.info.render.calls);
    }

    // ------------------------------------------------
    // General functions

    roundStat(data) {
        return Math.round(data * 100) / 100;
    }

    lookVector() {
        this.camera.getWorldDirection(this.playerDirection);
        this.playerDirection.normalize();
        return this.playerDirection;
    }

    playerCollision() {
        const collide = this.worldOctree.capsuleIntersect(this.playerCapsule);
        this.isPlayerGrounded = false;
        if (collide) {
            this.isPlayerGrounded = collide.normal.y > 0;

            this.playerCapsule.translate(
                collide.normal.multiplyScalar(collide.depth)
            );
        }
    }
}

function startAnimation() {
    this.requestAnimId = requestAnimationFrame(this.startAnimation);
    this.tick();
}

function stopAnimation() {
    cancelAnimationFrame(this.requestAnimId);
    this.clock.stop();
}

export default new Game();
