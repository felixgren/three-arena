import '../style.css';
import * as THREE from 'three';
import * as dat from 'dat.gui';
import io from 'socket.io-client';
import Stats from 'three/examples/jsm/libs/stats.module';
import { Capsule } from 'three/examples/jsm/math/Capsule';
import { Octree } from 'three/examples/jsm/math/Octree';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { Sprite, SpriteMaterial, OrthographicCamera, Scene } from 'three';
import explosionFragment from '../shader/Explosion.frag';
import explosionVertex from '../shader/Explosion.vert';

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
        this.players = null;
        this.playerCapsule = null;
        this.isPlayerGrounded = false;
        this.playerSpeed = 50;
        this.playerVelocity = null;
        this.teleportVec = new THREE.Vector3(0, 0, 0); // Better performance to reuse same vector

        this.Key = {};
        this.controls = null;
        this.maxJumps = 2;
        this.upVector = null;
        this.gravity = 70;

        this.toggle = false;
        this.collisionsEnabled = true;
        this.playerFocused = false;
        this.inputDisabled = false;

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

        this.shaderLoader = new THREE.TextureLoader();
        this.explosionMaterial = null;
        this.explosionTime = Date.now();

        this.animRequest;
        this.requestAnimId = null;
        this.startAnimation = startAnimation.bind(this);
        this.stopAnimation = stopAnimation.bind(this);

        this.ui = {
            body: document.querySelector('body'),
            respawnButton: document.querySelector('.respawn-button-wrapper'),
            pauseButton: document.querySelector('.pause-button-wrapper'),
            velocityStats: document.querySelector('.velocity-stats'),
            positionStats: document.querySelector('.position-stats'),
            chatSection: document.getElementById('chatSection'),
            chatList: document.querySelector('.chatList'),
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
            this.initExplosion();
            this.initStats();
            this.initDevWIP();
            this.initSocket();
        });
    }

    // Init function when game starts
    startGame() {
        console.log('START GAME');

        this.activatePointerLock();
        this.activateMovement();
        this.activateRocketShooting();
        this.activateGamePause();
        this.startAnimation(); // Starts tick function
        this.addChatMessage('Admin', 'Welcome to three arena.');
    }

    // Main update game function
    tick() {
        const delta = this.clock.getDelta();
        this.elaspedTime += delta;

        this.updatePlayerControl(delta);
        this.updateCheckOnGround(delta);
        this.updatePlayerMovement(delta);
        this.updateRockets(delta);
        this.updateChatList();
        this.updateStats();
        this.updateCloneCube();

        this.stats.update();
        this.renderer.render(this.scene, this.camera);
        this.renderer.autoClear = false;
        this.renderer.render(this.hudScene, this.hudCamera);
    }

    createCloneCube() {
        const geometry = new THREE.BoxGeometry();
        const material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        this.cube = new THREE.Mesh(geometry, material);
        this.scene.add(this.cube);
    }

    createMannequin() {
        const headGeo = new THREE.BoxGeometry(1, 1, 1);
        const bodyGeo = new THREE.BoxGeometry(0.7, 1, 0.7);
        const gunGeo = new THREE.BoxGeometry(1.5, 0.2, 0.2);

        const playerMat = new THREE.MeshNormalMaterial();
        const gunMat = new THREE.MeshPhongMaterial();
        gunMat.color = new THREE.Color(0x000000);

        const playerHead = new THREE.Mesh(headGeo, playerMat);
        const playerBody = new THREE.Mesh(bodyGeo, playerMat);
        const playerGun = new THREE.Mesh(gunGeo, gunMat);

        playerBody.position.set(0, -1, 0);
        playerGun.position.set(0.3, -1, 0.5);

        const playerModel = new THREE.Group();
        playerModel.add(playerHead);
        playerModel.add(playerBody);
        playerModel.add(playerGun);

        this.scene.add(playerModel);
        playerModel.position.set(5, 0, 0);
    }

    updateCloneCube() {
        const position = this.playerCapsule.end;
        this.cube.position.set(position.x + 2, position.y + 2, position.z + 2);
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
        const ambientSong = new THREE.Audio(listener);

        audioLoader.load('sounds/rocket-explode.ogg', (buffer) =>
            rocketExplode.setBuffer(buffer)
        );

        audioLoader.load('sounds/rocket-flying.ogg', (buffer) =>
            rocketFly.setBuffer(buffer)
        );

        audioLoader.load('sounds/slownomotion.ogg', (buffer) => {
            ambientSong.setBuffer(buffer);
            ambientSong.setLoop(true);
            ambientSong.setVolume(0.02);
            // ambientSong.play();
        });

        audioMap.set('rocketFly', rocketFly);
        audioMap.set('rocketExplode', rocketExplode);
        audioMap.set('ambientSong', ambientSong);

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

        this.renderer = new THREE.WebGLRenderer({
            powerPreference: 'high-performance',
            antialias: false,
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.ui.body.appendChild(this.renderer.domElement);

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.hudSetSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
        });

        // Maybe other init functions here such as field, playermodel, map, objects, rockets etc in here
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
        const ambientLight = new THREE.AmbientLight(0xddbf96, 0.6); // Soft white light
        const dirLight = new THREE.DirectionalLight(0xfcd6a4, 1);

        dirLight.position.set(-25, 250, 120);
        dirLight.castShadow = true;
        dirLight.shadow.camera.near = 1;
        dirLight.shadow.camera.far = 2000;
        dirLight.shadow.camera.right = 250;
        dirLight.shadow.camera.left = -250;
        dirLight.shadow.camera.top = 250;
        dirLight.shadow.camera.bottom = -250;
        dirLight.shadow.mapSize.width = 4064;
        dirLight.shadow.mapSize.height = 4064;
        dirLight.shadow.radius = 0.6;

        this.scene.add(ambientLight);
        this.scene.add(dirLight);

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
            gltf.scene.traverse((model) => {
                model.castShadow = true;
            });
            gltf.scene.scale.set(35, 35, 35);
            gltf.scene.position.set(-3, -10, -3);
            this.world.add(gltf.scene);
        });

        // TEST Objects
        const geometry = new THREE.IcosahedronGeometry(1);
        const bgGeometry = new THREE.PlaneBufferGeometry(1500, 1500, 128, 128);

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
            color: '#030303',
            map: textureRock,
            shininess: 0,
            displacementMap: displacementMap,
            displacementScale: 500,
            displacementBias: -0.428408,
        });

        const bgMaterial = new THREE.MeshBasicMaterial();
        bgMaterial.color = new THREE.Color(0xff111111);
        const material = new THREE.MeshPhongMaterial();
        material.color = new THREE.Color(0xff109000);

        const sphere = new THREE.Mesh(geometry, material);
        const bgfull = new THREE.Mesh(bgGeometry, textMat);

        bgfull.position.set(0, -210, 0);
        bgfull.rotation.x = -89.5;
        bgfull.rotation.z = 89.5;

        sphere.castShadow = true;
        sphere.position.set(0, 75, 0);
        sphere.scale.set(2, 2, 2);

        this.scene.add(bgfull);
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
            new THREE.Vector3(0, 2, 0),
            0.5
        );

        this.triggerRespawn();
        this.playerCapsule.translate(this.teleportVec.set(0, 100, 0));

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

    initExplosion() {
        this.shaderLoader.load(
            'models/explosion.png',
            (texture) => {
                this.explosionMaterial = new THREE.ShaderMaterial({
                    uniforms: {
                        tExplosion: {
                            type: 't',
                            value: texture,
                        },
                        time: {
                            type: 'f',
                            value: 0.0,
                        },
                    },
                    vertexShader: explosionVertex,
                    fragmentShader: explosionFragment,
                });

                this.rocketExplosion = new THREE.Mesh(
                    new THREE.IcosahedronGeometry(10, 10),
                    this.explosionMaterial
                );
                this.scene.add(this.rocketExplosion);
                this.rocketExplosion.position.set(0, 10, -50);
                console.log('init explosions');

                this.initRockets();
            },
            undefined,
            function (err) {
                console.error(
                    'An error happened whilst loading initExplosions'
                );
            }
        );
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
            const coolExplosion = this.rocketExplosion.clone();
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

            coolExplosion.position.set(0, 0, 0);
            coolExplosion.visible = false;
            coolExplosion.name = 'explosion';
            this.scene.add(coolRocket);
            coolRocket.add(coolExplosion);

            this.rockets.push({
                mesh: coolRocket,
                collider: new THREE.Sphere(new THREE.Vector3(0, -50, 0), 0.5),
                velocity: new THREE.Vector3(),
                timer: new THREE.Clock(),
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

    initDevWIP() {
        this.createCloneCube();
        this.createMannequin();
    }

    initSocket() {
        console.log('init socket');
        this.socket = io('https://three-arena.fly.dev/');

        this.player = {};
        this.players = {};

        this.socket.on('connect', () => {
            this.socket.on('initPlayer', (data, playerCount, playerIDs) => {
                this.player.id = data.id;
                console.log(
                    `I am ${this.socket.id}, the ${playerCount}${
                        playerCount <= 1
                            ? 'st'
                            : playerCount == 2
                            ? 'nd'
                            : playerCount == 3
                            ? 'rd'
                            : 'th'
                    } player`
                );

                // Check all that isn't local player
                for (let i = 0; i < playerCount; i++) {
                    if (playerIDs[i] !== this.player.id) {
                        console.log(
                            `${playerIDs[i]} needs to be added to the world...`
                        );
                        this.initRemotePlayer(playerIDs[i]);
                    }
                }
            });
        });

        this.socket.on('playerPositions', (players) => {
            this.updateRemotePlayers(players);
        });

        this.socket.on('player connect', (playerId, playerCount) => {
            console.log(`${playerId} joined the session!`);
            console.log(`There are now ${playerCount} players`);
            if (playerId !== this.player.id) {
                console.log(`${playerId} needs to be added to the world...`);
                this.initRemotePlayer(playerId);
            }
            this.addStatusMessage(playerId, 'join');
        });

        this.socket.on('player disconnect', (playerId, playerCount) => {
            this.deleteRemotePlayer(playerId);
            console.log(`${playerId} has left us...`);
            console.log(`There are now ${playerCount} players`);
            this.addStatusMessage(playerId, 'leave');
        });

        this.socket.on('connect', () => {
            this.socket.on('chat message', (username, message) => {
                this.addChatMessage(username, message);
            });
        });

        this.socket.on('shootSyncRocket', (playerData, playerID) => {
            this.shootRemoteRocket(playerData, playerID);
        });

        this.socket.on('kill message', (shooter, killed) => {
            if (shooter) {
                this.addKillMessage(shooter, killed);
            } else {
                this.addKillMessage(killed);
            }
        });
    }

    initRemotePlayer(playerID) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshNormalMaterial();
        material.color = new THREE.Color(0x000000);

        const remotePlayer = new THREE.Mesh(geometry, material);
        remotePlayer.position.set(0, 0, 0);

        this.scene.add(remotePlayer);

        this.players[playerID] = {};
        this.players[playerID].mesh = remotePlayer;
        this.players[playerID].positionSync = new THREE.Vector3();
        this.players[playerID].lookDirection = new THREE.Vector3();

        console.log(`${playerID} added to the scene!`);
        console.log(this.players);
    }

    deleteRemotePlayer(playerID) {
        this.scene.remove(this.players[playerID].mesh);
        delete this.players[playerID];
        console.log(this.players);
    }

    updateRemotePlayers(remotePlayers) {
        for (let id in remotePlayers) {
            if (id != this.player.id) {
                // Should not forget to reuse vectors
                this.players[id].positionSync = new THREE.Vector3().fromArray(
                    remotePlayers[id].position
                );
                this.players[id].lookDirection = new THREE.Vector3().fromArray(
                    remotePlayers[id].direction
                );

                // Set player position
                this.players[id].mesh.position.set(
                    this.players[id].positionSync.x,
                    this.players[id].positionSync.y,
                    this.players[id].positionSync.z
                );

                // Set head rotation
                this.players[id].mesh.rotation.y =
                    this.players[id].lookDirection.x;
                this.players[id].mesh.rotation.x =
                    this.players[id].lookDirection.y;
            }
        }
    }

    uploadMovementData() {
        this.socket.emit(
            'updateClientPos',
            [
                this.playerCapsule.end.x,
                this.playerCapsule.end.y,
                this.playerCapsule.end.z,
            ],
            this.lookVector().toArray()
        );
    }

    // ------------------------------------------------
    // Activate functions when game starts

    activatePointerLock() {
        this.ui.body.requestPointerLock();

        document.querySelector('canvas').addEventListener('mousedown', () => {
            !this.inputDisabled && this.ui.body.requestPointerLock();
        });

        this.camera.rotation.order = 'YXZ';

        document.addEventListener('mousemove', (event) => {
            if (document.pointerLockElement === this.ui.body) {
                // add check looking for 360 rotation
                this.camera.rotation.x -= event.movementY / 700;
                this.camera.rotation.y -= event.movementX / 700;
            }
        });

        document.addEventListener('pointerlockchange', () => {
            this.playerFocused = document.pointerLockElement === this.ui.body;
            console.log(`Player Focus is ${this.playerFocused}`);
        });

        document.addEventListener(
            'click',
            (event) => {
                if (this.inputDisabled) {
                    event.stopPropagation();
                    event.preventDefault();
                }
            },
            true
        );

        console.log('Activate pointerlock');
    }

    activateGamePause() {
        this.ui.pauseButton.addEventListener('click', () => {
            this.toggle = !this.toggle;
            this.toggle ? this.stopAnimation() : this.startAnimation();
        });
    }

    activateMovement() {
        document.addEventListener('keydown', (event) => {
            !this.inputDisabled && (this.Key[event.key] = true);
            if (event.key == 'Enter') {
                event.preventDefault();
            }
        });
        document.addEventListener('keyup', (event) => {
            this.Key[event.key] = false;
        });

        console.log('Activate movement controls');
    }

    activateRocketShooting() {
        let canShoot = true;

        document.addEventListener('click', () => {
            if (canShoot) {
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

                // Emit to other players
                this.socket.emit('triggerRemoteRocket');

                this.rocketIdx = (this.rocketIdx + 1) % this.rockets.length;

                canShoot = false;
                console.log('Rocket fired');

                setTimeout(() => {
                    canShoot = true;
                }, 500);
            }
        });
    }

    shootRemoteRocket(playerData, playerID) {
        const rocket = this.rockets[this.rocketIdx];
        const playerPosition = new THREE.Vector3().fromArray(
            playerData.position
        );
        const playerDirection = new THREE.Vector3().fromArray(
            playerData.direction
        );

        // Model direction
        rocket.mesh.lookAt(playerDirection.negate());

        rocket.mesh.add(this.frontRocketLight, this.backRocketLight);
        this.frontRocketLight.position.set(0, -1.1, 0);
        this.backRocketLight.position.set(0, -1.2, 0);
        this.frontRocketLight.power = 120;
        this.backRocketLight.power = 100;
        this.frontRocketLight.distance = 10;
        this.backRocketLight.distance = 10; // Could be used for explosion animation

        // Spawn Position
        rocket.collider.center.copy(playerPosition);

        // Spawn shoot direction
        rocket.velocity
            .copy(playerDirection.negate())
            .multiplyScalar(this.rocketForce);

        // Reset explode state
        rocket.mesh.userData.isExploded = false;

        // Set rocket owner
        rocket.mesh.userData.shooter = playerID;

        // Set visible
        rocket.mesh.visible = true;

        this.rocketIdx = (this.rocketIdx + 1) % this.rockets.length;

        console.log('Remote rocket fired');
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
        if (this.isPlayerGrounded) {
            if (this.Key[' ']) {
                this.playerVelocity.y = 50;
            }
        }
        if (this.Key['Control']) {
            this.playerVelocity.y -= this.playerSpeed * delta;
        }
        if (this.Key['e']) {
            this.playerVelocity.set(0, 0, 0);
        }
        if (this.Key['t']) {
            openForm();
        }
        if (this.Key['Enter']) {
            closeForm();
            let inputText = document.getElementById('inputText');
            if (inputText.value !== '') {
                this.socket.emit(
                    'chat message',
                    this.socket.id,
                    inputText.value
                );
                inputText.value = '';
            }
        }
    }

    updateCheckOnGround(delta) {
        if (this.isPlayerGrounded) {
            this.playerVelocity.addScaledVector(
                this.playerVelocity,
                -5 * delta
            );
        } else if (this.playerFocused) {
            this.playerVelocity.y -= this.gravity * delta;
        }
    }

    updatePlayerMovement(delta) {
        // if (this.collisionsEnabled) {
        this.playerCollision();
        // }

        if (this.playerFocused) {
            const deltaPosition = this.playerVelocity
                .clone()
                .multiplyScalar(delta);
            this.playerCapsule.translate(deltaPosition);
            this.camera.position.copy(this.playerCapsule.end);

            this.uploadMovementData();
        }

        if (
            this.camera.position.y < -10 &&
            Math.abs(this.camera.position.x) <= 125 &&
            Math.abs(this.camera.position.z) <= 125
        ) {
            console.log('Player glitched through floor, correction applied');
            this.teleportToGround();
            this.playerVelocity.setY(0);
            // this.collisionsEnabled = true;
        }

        if (this.camera.position.y < -200) {
            console.log('Player fell off the map, up they go');
            let pushForce = 200;
            this.camera.position.y < -500 && (pushForce = 500);
            this.playerVelocity.set(0, 0, 0);
            this.playerVelocity.y = pushForce;
            // this.collisionsEnabled = false;

            if (this.camera.position.y < -1000) {
                console.log('Player way off, teleported back up');
                this.teleportToGround(50);
                this.playerVelocity.set(0, 0, 0);
            }

            setTimeout(() => {
                this.camera.position.y > -200 &&
                    console.log('World collisions re-enabled');
                // this.collisionsEnabled = true;
            }, 2500);
        }
    }

    updateRockets(delta) {
        if (this.explosionMaterial) {
            this.explosionMaterial.uniforms['time'].value =
                0.00025 * (Date.now() - this.explosionTime);
        }

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

            // On rocket impact
            if (result) {
                rocket.velocity.set(0, 0, 0);
                const explodeMesh = rocket.mesh.getObjectByName('explosion');

                if (!rocket.mesh.userData.isExploded) {
                    rocket.mesh.userData.isExploded = true;
                    console.log('Rocket hit');

                    const playerDistance =
                        this.playerCapsule.end.distanceToSquared(
                            rocket.collider.center
                        );

                    // On Player hit
                    if (playerDistance < 170) {
                        this.socket.emit(
                            'kill message',
                            rocket.mesh.userData.shooter,
                            this.player.id
                        );

                        this.triggerDeath();
                    }

                    explodeSound.offset = 0.05;
                    explodeSound.play();
                    flySound.stop();

                    explodeMesh.visible = true;
                    rocket.timer.start();
                }

                if (rocket.timer.getElapsedTime() >= 0.2) {
                    {
                        // Plays once
                        rocket.timer.stop();
                        explodeMesh.scale.set(0, 0, 0);
                        explodeMesh.position.set(0, 0, 0);
                        rocket.mesh.visible = false;

                        // For looping animation, both do same thing, start() would seem most efficient
                        // this.explodeClock = new THREE.Clock();
                        // rocket.timer.start()
                    }
                } else {
                    let size = 0 + rocket.timer.getElapsedTime() * 8;
                    explodeMesh.scale.set(size, size, size);
                }
            } else {
                // Whilst in air
                rocket.velocity.y -= (this.gravity / 15) * delta;
            }

            // Accelerate with time
            const acceleration = Math.exp(3 * delta) - 1;
            rocket.velocity.addScaledVector(rocket.velocity, acceleration);

            rocket.mesh.position.copy(rocket.collider.center);
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

    triggerDeath() {
        console.log('You died');
        document.exitPointerLock();
        this.respawnWaitingRoom();
        this.inputDisabled = true;
        this.ui.respawnButton.style.pointerEvents = 'none';
        this.ui.respawnButton.style.userSelect = 'none';
        this.ui.respawnButton.style.display = 'block';
        this.ui.respawnButton.lastChild.style.fontSize = '30px';
        this.ui.respawnButton.lastChild.style.transform = 'translate(0px, 0px)';
        this.ui.respawnButton.lastChild.textContent = `Respawn in 5`;

        let countdown = 5;
        const timer = setInterval(() => {
            countdown--;
            countdown <= 0 && clearInterval(timer);
            this.ui.respawnButton.lastChild.textContent = `Respawn in ${countdown}`;
        }, 1000);

        setTimeout(() => {
            console.log('You can now respawn');
            this.inputDisabled = false;
            this.ui.respawnButton.style.userSelect = 'unset';
            this.ui.respawnButton.style.pointerEvents = 'unset';
            this.ui.respawnButton.lastChild.textContent = `RESPAWN`;
            this.ui.respawnButton.lastChild.style.fontSize = '40px';
            this.ui.respawnButton.lastChild.style.transform =
                'translate(8px, 8px)';
        }, 5000);
    }

    triggerRespawn() {
        console.log('Respawn triggered');
        const distFromX = -this.playerCapsule.end.x;
        const distToGround = Math.abs(this.playerCapsule.end.y);
        const distFromZ = -this.playerCapsule.end.z;
        this.playerCapsule.translate(
            this.teleportVec.set(
                distFromX + this.getRandomBetween(10, 120),
                distToGround + 50,
                distFromZ + this.getRandomBetween(10, 120)
            )
        );
        this.playerVelocity.set(0, 0, 0);
        this.gravity = 70;
    }

    addChatMessage(username, message) {
        const usernameSpan = document.createElement('span');
        usernameSpan.style.color = '#0fff00';
        usernameSpan.textContent = username;

        const middleSpan = document.createElement('span');
        middleSpan.textContent = ': ';

        const messageSpan = document.createElement('span');
        messageSpan.style.color = '#ffffff';
        messageSpan.textContent = message;

        const content = document.createElement('li');
        content.appendChild(usernameSpan);
        content.appendChild(middleSpan);
        content.appendChild(messageSpan);

        this.createMessage(content);
    }

    addKillMessage(shooter, killed) {
        const shooterSpan = document.createElement('span');
        shooterSpan.textContent = `${shooter}`;
        shooterSpan.style.color = '#00ff00';

        const middleSpan = document.createElement('span');
        middleSpan.textContent = ' ︻┳═一 ';

        const killedSpan = document.createElement('span');
        killedSpan.textContent = killed;
        killedSpan.style.color = '#ff0000';

        const content = document.createElement('li');
        content.style.color = '#ffff00';
        content.style.fontWeight = '500';
        content.appendChild(shooterSpan);
        content.appendChild(middleSpan);
        content.appendChild(killedSpan);

        this.createMessage(content);
    }

    addStatusMessage(username, status) {
        const usernameSpan = document.createElement('span');
        usernameSpan.textContent = username;

        const statusSpan = document.createElement('span');
        statusSpan.textContent = status;

        const content = document.createElement('li');
        switch (status) {
            case 'join':
                content.style.color = '#00ff00';
                statusSpan.textContent = ' has joined the game';
                break;
            case 'leave':
                content.style.color = '#ff0000';
                statusSpan.textContent = ' has left the game ';
                break;
            default:
                statusSpan.textContent = ' unknown status event ';
                break;
        }
        content.appendChild(usernameSpan);
        content.appendChild(statusSpan);

        this.createMessage(content);
    }

    createMessage(content) {
        this.ui.chatSection.classList.remove('hidden');

        const chatMessage = {
            endTime: this.elaspedTime + 10,
            ui: content,
        };

        this.chatMessages.push(chatMessage);
        const chatList = this.ui.chatList;
        chatList.appendChild(content);

        return this;
    }

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

    getRandomBetween(min, max) {
        return Math.random() * (max - min) + min;
    }

    teleportToGround(extraDistance = 0) {
        const distToGround = Math.abs(this.playerCapsule.end.y);
        this.playerCapsule.translate(
            this.teleportVec.set(0, distToGround + extraDistance, 0)
        );
    }

    toggleInputs() {
        this.inputDisabled = !this.inputDisabled;
        this.inputDisabled ? console.log('enabled') : console.log('disabled');
    }

    respawnWaitingRoom() {
        this.gravity = 0;
        const distFromX = -this.playerCapsule.end.x;
        const distToGround = Math.abs(this.playerCapsule.end.y);
        const distFromZ = -this.playerCapsule.end.z;
        this.playerCapsule.translate(
            this.teleportVec.set(
                distFromX + 0,
                distToGround - 50,
                distFromZ + 0
            )
        );
        this.playerVelocity.set(0, 0, 0);
    }

    // ------------------------------------------------
    // In development functions

    createCloneCube() {
        const geometry = new THREE.BoxGeometry();
        const material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        this.cube = new THREE.Mesh(geometry, material);
        this.scene.add(this.cube);
    }

    updateCloneCube() {
        const position = this.playerCapsule.end;
        this.cube.position.set(position.x + 2, position.y + 2, position.z + 2);
    }

    createMannequin() {
        const headGeo = new THREE.BoxGeometry(1, 1, 1);
        const bodyGeo = new THREE.BoxGeometry(0.7, 1, 0.7);
        const gunGeo = new THREE.BoxGeometry(1.5, 0.2, 0.2);

        const playerMat = new THREE.MeshNormalMaterial();
        const gunMat = new THREE.MeshPhongMaterial();
        gunMat.color = new THREE.Color(0x000000);

        const playerHead = new THREE.Mesh(headGeo, playerMat);
        const playerBody = new THREE.Mesh(bodyGeo, playerMat);
        const playerGun = new THREE.Mesh(gunGeo, gunMat);

        playerBody.position.set(0, -1, 0);
        playerGun.position.set(0.3, -1, 0.5);

        const playerModel = new THREE.Group();
        playerModel.add(playerHead);
        playerModel.add(playerBody);
        playerModel.add(playerGun);

        this.scene.add(playerModel);
        playerModel.position.set(5, 0, 0);
    }

    checkPlayerData() {
        const playerVelocity = this.playerVelocity.clone();
        const position = this.playerCapsule.end;
        const look = this.lookVector();
        console.log('Velocity is');
        console.log(playerVelocity);
        console.log('Position is');
        console.log(position);
        console.log('Look direction is');
        console.log(look);
    }
}

function startAnimation() {
    this.requestAnimId = requestAnimationFrame(this.startAnimation);
    this.tick();
}

function stopAnimation() {
    cancelAnimationFrame(this.requestAnimId);
}

function openForm() {
    document.getElementById('inputForm').style.display = 'block';
    document.getElementById('inputText').focus();
}

function closeForm() {
    document.getElementById('inputForm').style.display = 'none';
}

export default new Game();
