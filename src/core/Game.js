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
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib';
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper';
import { Sprite, SpriteMaterial, OrthographicCamera, Scene } from 'three';

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
        this.gravity = 70;

        this.toggle = false;
        this.collisionsEnabled = true;

        this.rockets = [];
        this.rocketForce = 90;
        this.maxRockets = 100;
        this.rocketIdx = 0;
        this.deltaRocket = 0;
        this.frontRocketLight = null;
        this.backRocketLight = null;

        this.textureLoader = new THREE.TextureLoader();
        this.textureMap = new Map();

        this.elaspedTime = 0;
        this.chatMessages = new Array();

        this.loadingManager = new THREE.LoadingManager();
        this.audioLoader = new THREE.AudioLoader(this.loadingManager);
        this.listener = new THREE.AudioListener();
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
            chatSection: document.getElementById('chatSection'),
            chatList: document.getElementById('chatList'),
            crosshair: null,
        };
    }

    // Loading scene function before game is started
    load() {
        console.log('PRELOADING...');

        this.initAudio().then(() => {
            this.initScene();
            this.initSkybox();
            this.initMap();
            this.initPlayer();
            this.initCrosshair();
            this.initRockets();
            this.initStats();
            this.initSocket();
        });
    }

    // Init function when game starts
    startGame() {
        console.log('START GAME');

        this.activatePointerLock();
        this.activateMovement();
        this.activateRocketShooting();
        this.startAnimation(); // Starts tick function

        this.addChatMessage('player1', 'hello hello hello!');

        setTimeout(() => {
            this.addChatMessage('player2', 'hey whats up!!');
        }, 5000);

        setTimeout(() => {
            this.addChatMessage('player3', 'hey up!!');
        }, 6000);

        setTimeout(() => {
            this.addChatMessage('player4', 'whats up!!');
        }, 7000);

        setTimeout(() => {
            this.addChatMessage(
                'player5',
                'up!! yeah im a reaaaaly LOOOOOOOOONG message wow!!!!!1111'
            );
        }, 8000);
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
        this.elaspedTime += delta;

        this.updatePlayerControl(delta);
        this.updateCheckOnGround(delta);
        this.updatePlayerMovement(delta);
        this.updateRockets(delta);
        this.updateStats();
        this.updateChatList();

        this.stats.update();
        this.renderer.render(this.scene, this.camera);
        this.renderer.autoClear = false;
        this.renderer.render(this.hudScene, this.hudCamera);
    }

    initSocket() {
        console.log('init socket');
        this.socket = io('http://localhost:3000');

        this.socket.on('connect', () => {
            console.log(`I am ${this.socket.id}`);
        });

        this.socket.on('player connect', (playerId) => {
            console.log(`${playerId} joined the session!`);
            this.addChatMessage(playerId, 'I am here');
        });

        this.socket.on('player disconnect', (playerId) => {
            console.log(`${playerId} has left us...`);
            this.addChatMessage(playerId, 'has left us...');
        });

        this.socket.on('connect', () => {
            setTimeout(() => {
                this.socket.emit(
                    'chat message',
                    this.socket.id,
                    'sooo anyway.. now what? '
                );
            }, 5000);
            this.socket.on('chat message', (message, message2) => {
                this.addChatMessage(message, message2);
            });
        });
    }

    updateChatList() {
        const chatMessages = this.chatMessages;

        for (let i = chatMessages.length - 1; i >= 0; i--) {
            const message = chatMessages[i];

            if (this.elaspedTime >= message.endTime) {
                chatMessages.splice(i, 1);

                const chatList = this.ui.chatList;
                chatList.removeChild(message.ui);
            }
        }

        if (chatMessages.length === 0) {
            this.ui.chatSection.classList.add('hidden');
        }

        return this;
    }

    addChatMessage(username, message) {
        this.ui.chatSection.classList.remove('hidden');

        const string = `${username} says ${message}`;

        const usernameSpan = document.createElement('span');
        usernameSpan.style.color = '#0fff00';
        usernameSpan.textContent = username;

        const middleSpan = document.createElement('span');
        middleSpan.textContent = ': ';

        const messageSpan = document.createElement('span');
        messageSpan.style.color = '#ffffff';
        messageSpan.textContent = message;

        const MsgText = document.createElement('li');
        MsgText.appendChild(usernameSpan);
        MsgText.appendChild(middleSpan);
        MsgText.appendChild(messageSpan);

        const chatMessage = {
            text: string,
            endTime: this.elaspedTime + 10,
            ui: MsgText,
        };

        this.chatMessages.push(chatMessage);
        const chatList = this.ui.chatList;
        chatList.appendChild(MsgText);

        return this;
    }

    // ------------------------------------------------
    // Main init functions during loading screen

    initAudio() {
        console.log('init audio');
        const loadingManager = this.loadingManager;
        const audioLoader = this.audioLoader;
        const audioMap = this.audioMap;
        const listener = this.listener;

        const rocketExplode = new THREE.PositionalAudio(listener);
        const rocketFly = new THREE.PositionalAudio(listener);

        audioLoader.load('sounds/rocket-explode.ogg', (buffer) =>
            rocketExplode.setBuffer(buffer)
        );
        audioLoader.load('sounds/rocket-flying.ogg', (buffer) =>
            rocketFly.setBuffer(buffer)
        );

        audioMap.set('rocketFly', rocketFly);
        audioMap.set('rocketExplode', rocketExplode);

        loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
            console.log(
                'Loading file: ' +
                    url +
                    '.\nLoaded ' +
                    itemsLoaded +
                    ' of ' +
                    itemsTotal +
                    ' files.'
            );
        };

        loadingManager.onError = function (url) {
            console.log('There was an error loading ' + url);
        };

        return new Promise((resolve) => {
            loadingManager.onLoad = () => {
                resolve();
                console.log('All loading completed!');
            };
        });
    }

    initScene() {
        this.gui = new dat.GUI();
        this.clock = new THREE.Clock();
        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            2000
        );
        this.camera.add(this.listener);

        // const ambientLight = new THREE.AmbientLight(0x404040); // soft white light
        // ambientLight.power = 30;
        // this.scene.add(ambientLight);

        // ---- MAYBE other init functions here such as field, playermodel, map, objects, rockets etc

        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.ui.body.appendChild(this.renderer.domElement);

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.hudSetSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
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
        // const gltfLoader = new GLTFLoader().setPath('models/');
        // const dracoLoader = new DRACOLoader();
        // dracoLoader.setDecoderPath('draco/');
        // gltfLoader.setDRACOLoader(dracoLoader);
        // gltfLoader.load('terrain-draco-2.glb', (gltf) => {
        //     gltf.scene.traverse((model) => {
        //         model.castShadow = true;
        //     });
        //     this.world.add(gltf.scene);
        //     this.worldOctree.fromGraphNode(gltf.scene);
        // });

        // Models FBX
        // const fbxLoader = new FBXLoader().setPath('models/');
        // fbxLoader.load('rocks.fbx', (rock) => {
        //     rock.traverse(function (child) {
        //         if (child instanceof THREE.Mesh) {
        //             child.material.map = textureRock;
        //             child.scale.set(0.15, 0.15, 0.15);
        //             child.material.color.setHex(0xb5aa61);
        //         }
        //     });
        //     rock.position.x = -100;
        //     rock.position.z = 500;
        //     rock.position.y = 0;
        //     this.world.add(rock);
        //     this.worldOctree.fromGraphNode(rock);
        // });

        RectAreaLightUniformsLib.init();

        const rectLight1 = new THREE.RectAreaLight(0xff0000, 5, 200, 500);
        const rectLight2 = new THREE.RectAreaLight(0x00ff00, 5, 200, 500);
        const rectLight3 = new THREE.RectAreaLight(0x0000ff, 5, 200, 500);
        const rectLight4 = new THREE.RectAreaLight(0xffffff, 5, 800, 400);

        const floorGeo = new THREE.BoxGeometry(2000, 0.1, 2000);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x808080,
            roughness: 0.1,
            metalness: 0,
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);

        const torusGeo = new THREE.TorusKnotGeometry(1.5, 0.5, 200, 16);
        const torusMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0,
            metalness: 0,
        });
        const torus = new THREE.Mesh(torusGeo, torusMat);

        rectLight1.position.set(-500, 250, 500);
        rectLight2.position.set(0, 250, 500);
        rectLight3.position.set(500, 250, 500);
        rectLight4.position.set(0, 500, -500);
        rectLight4.rotateX(180);
        floor.position.set(0, -2.5, 0);
        torus.position.set(50, 50, 0);

        this.scene.add(rectLight1);
        this.scene.add(rectLight2);
        this.scene.add(rectLight3);
        this.scene.add(rectLight4);
        this.scene.add(new RectAreaLightHelper(rectLight1));
        this.scene.add(new RectAreaLightHelper(rectLight2));
        this.scene.add(new RectAreaLightHelper(rectLight3));
        this.scene.add(new RectAreaLightHelper(rectLight4));
        this.world.add(torus);
        this.world.add(floor);

        // TEST Objects
        const textureRock = new THREE.TextureLoader().load(
            'models/rocktexture.jpg'
        );
        textureRock.wrapS = THREE.RepeatWrapping;
        textureRock.wrapT = THREE.RepeatWrapping;
        textureRock.repeat.set(1, 1);

        const spikyMaterial = new THREE.MeshPhongMaterial();
        spikyMaterial.color = new THREE.Color(0xff109000);
        const spikySphere = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1),
            spikyMaterial
        );
        spikySphere.castShadow = true;
        this.world.add(spikySphere);

        const displacementMap = new THREE.TextureLoader().load(
            'models/heightmap.png'
        );
        displacementMap.wrapS = THREE.RepeatWrapping;
        displacementMap.wrapT = THREE.RepeatWrapping;
        displacementMap.repeat.set(1, 1);
        const displacementMat = new THREE.MeshPhongMaterial({
            color: 'gray',
            map: textureRock,
            displacementMap: displacementMap,
            displacementScale: 200,
            displacementBias: -0.428408,
        });
        const displacementGeo = new THREE.PlaneBufferGeometry(
            500,
            2000,
            128,
            128
        );
        const displacementMesh = new THREE.Mesh(
            displacementGeo,
            displacementMat
        );

        displacementMesh.rotation.z = Math.PI / 2;
        displacementMesh.position.set(-500, -10, -1000);
        displacementMesh.rotation.x = -89.5;
        displacementMesh.receiveShadow = true;
        this.world.add(displacementMesh);

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
            new THREE.Vector3(0, 2, 0),
            0.5
        );

        console.log('init player');
    }

    initCrosshair() {
        const textureLoader = this.textureLoader;

        let texture = textureLoader.load('images/crosshair.png');
        texture.matrixAutoUpdate = false;
        this.textureMap.set('crosshair', texture);

        const crosshairTexture = this.textureMap.get('crosshair');
        const crosshairMat = new SpriteMaterial({
            map: crosshairTexture,
            opacity: 1,
        });

        const crosshair = new Sprite(crosshairMat);
        crosshair.matrixAutoUpdate = false;
        crosshair.visible = true;
        crosshair.position.set(0, 0, 2);
        crosshair.scale.set(70, 70, 1);
        crosshair.updateMatrix();

        this.ui.crosshair = crosshair;

        this.hudCamera = new OrthographicCamera(
            -window.innerWidth / 2,
            window.innerWidth / 2,
            window.innerHeight / 2,
            -window.innerHeight / 2,
            1,
            10
        );
        this.hudCamera.position.z = 10;
        this.hudScene = new Scene();
        this.hudScene.add(crosshair);

        console.log('init crosshair');
        return this;
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

            const audioFly = this.createAudioInstance(
                this.audioMap.get('rocketFly')
            );
            const audioExplode = this.createAudioInstance(
                this.audioMap.get('rocketExplode')
            );
            coolRocket.add(audioFly);
            coolRocket.add(audioExplode);

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

            const flySound = this.rockets[airRocketIdx].mesh.children[0];
            const explodeSound = this.rockets[airRocketIdx].mesh.children[1];

            if (this.rocketIdx !== this.deltaRocket) {
                this.deltaRocket = this.rocketIdx;

                flySound.offset = 1;
                flySound.play();
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

                    explodeSound.offset = 0.05;
                    explodeSound.play();
                    flySound.stop();

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

    createAudioInstance(source) {
        const audio = new source.constructor(source.listener);
        audio.buffer = source.buffer;

        return audio;
    }

    hudSetSize(width, height) {
        this.hudCamera.left = -width / 2;
        this.hudCamera.right = width / 2;
        this.hudCamera.top = height / 2;
        this.hudCamera.bottom = -height / 2;
        this.hudCamera.updateProjectionMatrix();

        return this;
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
