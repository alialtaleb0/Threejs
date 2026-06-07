// =============================================
// Scene Setup: Renderer, Camera, Lights, Ground
// =============================================

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export function initScene(){

    const scene=new THREE.Scene();

    scene.background=
    new THREE.Color(0x1a1a1a);

    const camera=
    new THREE.PerspectiveCamera(
        35,
        innerWidth/innerHeight,
        1,
        1000
    );

    camera.position
    .set(-20,10,25)
    .setLength(40);

    const renderer=
    new THREE.WebGLRenderer({
        antialias:true
    });

    renderer.setSize(
        innerWidth,
        innerHeight
    );

    renderer.shadowMap.enabled=true;

    document.body.appendChild(
        renderer.domElement
    );

    const controls=
    new OrbitControls(
        camera,
        renderer.domElement
    );

    controls.target.set(0,7,0);

    controls.enablePan=false;

    controls.enableDamping=true;

    controls.maxPolarAngle=
    Math.PI*0.5;

    const light=
    new THREE.DirectionalLight(
        0xffffff,
        1.2
    );

    light.position.set(0,20,10);

    light.castShadow=true;

    scene.add(
        light,
        new THREE.AmbientLight(
            0xffffff,
            0.4
        )
    );

    // =============================================
    // Ground
    // =============================================

    const ground=
    new THREE.Mesh(

        new THREE.PlaneGeometry(
            100,
            100
        ).rotateX(Math.PI*-0.5),

        new THREE.MeshStandardMaterial({
            color:0x333333,
            roughness:0.8,
            metalness:0.2
        })
    );

    ground.receiveShadow=true;

    scene.add(ground);

    // =============================================
    // Resize Handler
    // =============================================

    window.addEventListener(
        'resize',
        ()=>{

            camera.aspect=
            innerWidth/innerHeight;

            camera.updateProjectionMatrix();

            renderer.setSize(
                innerWidth,
                innerHeight
            );
        }
    );

    return { scene, camera, renderer, controls };
}
