import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { disposeNode } from './Utils';

interface Params {
    logCameraPosition?: boolean;
}

export class CreateTwin {
    scene: THREE.Scene;
    directionalLight: THREE.DirectionalLight;
    ambientLight: THREE.AmbientLight;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer | null;
    controls: OrbitControls | null;
    animationId: any;
    destroy: () => void;
    renderLoop: () => void;
    renderOnce: () => void;
    width: number;
    height: number;
    css2Renderer: CSS2DRenderer;

    constructor(params: Params = {}) {
        const { logCameraPosition = false } = params;

        // 场景
        this.scene = new THREE.Scene();

        // 平行光
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        this.directionalLight.position.set(10, 10, 10);
        this.scene.add(this.directionalLight);

        // 环境光
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
        this.scene.add(this.ambientLight);

        // 相机
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 8000);
        this.camera.position.set(2, 2, 2);
        this.camera.lookAt(0, 0, 0);

        // 渲染器
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            logarithmicDepthBuffer: true,
            preserveDrawingBuffer: true // html2canvas 需要
        });
        this.renderer.setClearColor(0xffffff);
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.domElement.style.pointerEvents = 'auto';
        this.renderer.domElement.style.zIndex = '1';

        // css2D 渲染器
        this.css2Renderer = new CSS2DRenderer();
        this.css2Renderer.setSize(this.width, this.height);
        this.css2Renderer.domElement.style.pointerEvents = 'none';

        this.renderOnce = () => {
            if (this.scene && this.camera && this.renderer) {
                this.renderer?.render(this.scene, this.camera);
                this.css2Renderer?.render(this.scene, this.camera);
            }
        };

        // 渲染循环
        this.renderLoop = () => {
            if (this.scene && this.camera) {
                this.renderOnce();
                requestAnimationFrame(this.renderLoop);
            }
        };
        this.renderLoop();
        this.animationId = requestAnimationFrame(this.renderLoop);

        // 相机控件
        this.controls = new OrbitControls(this.camera, this.renderer?.domElement);
        this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.minDistance = 0.06;
        this.controls.maxDistance = 10;
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        this.controls.addEventListener('change', () => {
            if (this.scene && this.camera) {
                this.renderOnce();

                if (logCameraPosition) {
                    console.log('camera.position:', this.camera.position);
                }
            }
        });

        //画布尺寸随着窗口变化
        window.addEventListener('resize', () => {
            if (this.scene && this.renderer && this.camera) {
                this.renderer.setSize(window.innerWidth, window.innerHeight);
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.renderOnce();
                this.camera.updateProjectionMatrix();
            }
        });

        // 获取当前浏览器的版本并检测是否支持WebGPU
        // getChromeVersion();

        // 销毁
        this.destroy = () => {
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }

            this.scene?.traverse(disposeNode);

            // 销毁控制器
            if (this.controls && typeof this.controls.dispose === 'function') {
                this.controls.dispose();
            }

            // 删除控制器引用
            this.controls = null;

            if (this.renderer) {
                this.renderer.dispose();
                this.renderer.domElement = null as any;
                this.renderer.forceContextLoss();
                this.renderer = null;
            }

            if (this.css2Renderer) {
                // this.css2Renderer.dispose();
                // this.css2Renderer.domElement = null as any;
                // this.css2Renderer.forceContextLoss();
                this.css2Renderer = null;
            }

            // if (this.scene) {
            //     this.scene.remove();
            //     this.scene.clear();
            //     this.scene = null;
            //     this.camera = null;
            // }
        };
    }
}
