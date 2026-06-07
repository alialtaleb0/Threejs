// =============================================
// Main Entry Point
// =============================================

import * as THREE from "three";
import { initUIControls } from "./physics-params.js";
import { initScene } from "./scene.js";
import { NewtonsCradle } from "./NewtonsCradle.js";
import { initInteraction } from "./interaction.js";

// Init UI sliders
initUIControls();

// Init scene (renderer, camera, lights, ground)
const { scene, camera, renderer, controls } = initScene();

// Create Newton's Cradle
const newtonsCradle = new NewtonsCradle();

newtonsCradle.traverse(part=>{

    if(part.isMesh){

        part.castShadow=true;
        part.receiveShadow=true;
    }
});

scene.add(newtonsCradle);

// Init multi-touch interaction
initInteraction(camera, controls, newtonsCradle);

// =============================================
// Animation Loop
// =============================================

const clock = new THREE.Clock();

renderer.setAnimationLoop(()=>{

    let dt=
    Math.min(
        clock.getDelta(),
        0.05
    );

    controls.update();

    newtonsCradle.updatePhysics(dt);

    renderer.render(scene, camera);
});
