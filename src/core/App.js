import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as dat from 'dat.gui';

// Experimenting with classes
export default class App {
    constructor() {
        this.sizes = {
            width: window.innerWidth,
            height: window.innerHeight,
        };

        this.startAnimation = startAnimation.bind(this);
        this.stopAnimation = stopAnimation.bind(this);

        this.init();
        this.objects();
        this.startAnimation();
    }

    init() {
        this.canvas = document.querySelector('canvas.webgl');
        this.gui = new dat.GUI();
        this.clock = new THREE.Clock();

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.sizes.width / this.sizes.height,
            0.1,
            100
        );
        this.camera.position.set(0, 0, 2);

        this.controls = new OrbitControls(this.camera, this.canvas);
        this.controls.enableDamping = true;
    }

    objects() {
        // Objects
        const geometry = new THREE.IcosahedronGeometry(1);

        // Materials
        const material = new THREE.MeshPhongMaterial();
        material.color = new THREE.Color(0xff0000);

        // Mesh
        this.sphere = new THREE.Mesh(geometry, material);
        this.sphere2 = new THREE.Mesh(geometry, material);
        this.scene.add(this.sphere);
        this.scene.add(this.sphere2);
        this.sphere2.position.set(0, -2, 0);

        // Lights
        const pointLight = new THREE.PointLight(0xffffff, 0.1);
        const pointLight2 = new THREE.PointLight(0xffffff, 0.1);
        const ambientLight = new THREE.AmbientLight(0x505050);
        pointLight.position.set(3, 2, 1);
        pointLight2.position.set(-3, 2, 1);
        pointLight.power = 20;
        pointLight2.power = 10;
        this.scene.add(ambientLight);
        this.scene.add(pointLight, pointLight2);

        // Light helpers
        const pointLightHelper = new THREE.PointLightHelper(pointLight);
        const pointLightHelper2 = new THREE.PointLightHelper(pointLight2);
        this.scene.add(pointLightHelper);
        this.scene.add(pointLightHelper2);

        window.addEventListener('resize', () => {
            // Update sizes
            this.sizes.width = window.innerWidth;
            this.sizes.height = window.innerHeight;

            // Update camera
            this.camera.aspect = this.sizes.width / this.sizes.height;
            this.camera.updateProjectionMatrix();

            // Update renderer
            this.renderer.setSize(this.sizes.width, this.sizes.height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        });

        let toggle = false;
        window.addEventListener('click', () => {
            toggle = !toggle;

            if (toggle) {
                console.log('I WANNA STOP NOW');
                this.stopAnimation();
            } else {
                console.log('I WANNA DANCE');
                this.startAnimation();
            }
        });

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
        });
        this.renderer.setSize(this.sizes.width, this.sizes.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    tick() {
        // Call tick again on the next frame

        // https://github.com/mrdoob/three.js/issues/5696
        // clock should be refactored into timer
        // https://github.com/mrdoob/three.js/pull/17912
        // const elapsedTime = this.clock.getElapsedTime();

        const delta = this.clock.getDelta();

        // Update objects
        this.sphere.rotation.y += 0.5 * delta;

        // Update Orbital Controls
        this.controls.update();

        // Render
        this.renderer.render(this.scene, this.camera);
    }
}

function startAnimation() {
    this.animRequest = requestAnimationFrame(this.startAnimation);
    this.tick();
    // console.log(this.clock.running);
    if (!this.clock.running) {
        // booo start sets time to 0 theres no resume it suxxx
        this.clock.start();
    }
}

function stopAnimation() {
    cancelAnimationFrame(this.animRequest);
    // console.log(this.clock.getElapsedTime());
    this.clock.stop();
}
