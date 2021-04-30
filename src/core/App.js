import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as dat from 'dat.gui';

// Experimenting with classes
export default class App {
    constructor() {
        this.camera = null;
        this.scene = null;
        this.renderer = null;

        this.sizes = {
            width: window.innerWidth,
            height: window.innerHeight,
        };

        this.init();
    }

    init() {
        this.bestInit();
        this.objects();
        this.animate();
    }

    bestInit() {
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
        this.scene.add(this.camera);

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

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
        });
        this.renderer.setSize(this.sizes.width, this.sizes.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    animate() {
        const tick = () => {
            // Call tick again on the next frame
            window.requestAnimationFrame(tick);

            const elapsedTime = this.clock.getElapsedTime();
            const delta = this.clock.getDelta();

            // Update objects
            this.sphere.rotation.y = 0.5 * elapsedTime;

            // Update Orbital Controls
            this.controls.update();

            // Render
            this.renderer.render(this.scene, this.camera);
        };

        tick();
    }
}
