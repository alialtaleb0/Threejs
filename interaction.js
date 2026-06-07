// =============================================
// Multi Touch Interaction Events
// =============================================

import * as THREE from "three";
import { physicsParams } from "./physics-params.js";

export const draggedBalls = new Map();

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const intersectionPoint = new THREE.Vector3();

// keep extra drag info per pointer to compute release velocities
const dragInfo = new Map();

export function initInteraction(camera, controls, newtonsCradle){

    window.addEventListener(
        'pointerdown',
        event=>{

            mouse.x=
            (event.clientX/window.innerWidth)*2-1;

            mouse.y=
            -(event.clientY/window.innerHeight)*2+1;

            raycaster.setFromCamera(
                mouse,
                camera
            );

            let intersects=
            raycaster.intersectObject(
                newtonsCradle.ballSystem
            );

            if(intersects.length>0){

                const ballIndex=
                intersects[0].instanceId;

                draggedBalls.set(
                    event.pointerId,
                    ballIndex
                );

                // initialize drag info
                const b = newtonsCradle.moveableDummies[ballIndex];
                dragInfo.set(event.pointerId,{
                    ballIndex,
                    lastTheta: b.theta,
                    lastPhi: b.phi,
                    lastTime: performance.now()
                });

                controls.enabled=false;

                document.body.style.cursor=
                'grabbing';

                // capture pointer for multitouch reliability
                (event.target || window).setPointerCapture?.(event.pointerId);
            }
        }
    );

    window.addEventListener(
        'pointermove',
        event=>{

            if(
                draggedBalls.has(
                    event.pointerId
                )
            ){

                const ballIndex=
                draggedBalls.get(
                    event.pointerId
                );

                mouse.x=
                (event.clientX/window.innerWidth)*2-1;

                mouse.y=
                -(event.clientY/window.innerHeight)*2+1;

                raycaster.setFromCamera(
                    mouse,
                    camera
                );

                // Compute pivot in local coordinates (where the string is attached)
                const pivotX = (
                    -(newtonsCradle.ballsCount-1)*0.5 + ballIndex
                ) * (newtonsCradle.ballRadius*2);

                const pivotY = newtonsCradle.frameH;
                const pivotZ = 0; // balls are centered at z=0 in the cradle local space

                // pivot world
                const pivotLocal = new THREE.Vector3(pivotX, pivotY, pivotZ);
                const pivotWorld = pivotLocal.clone();
                newtonsCradle.localToWorld(pivotWorld);

                // Ray-sphere intersection: sphere centered at pivotWorld with radius = stringLengthReal
                const ray = raycaster.ray;
                const O = ray.origin;
                const D = ray.direction;
                const C = pivotWorld;
                const R = newtonsCradle.stringLengthReal;

                const OC = new THREE.Vector3().subVectors(O, C);
                const a = D.dot(D); // should be 1
                const b = 2 * D.dot(OC);
                const c = OC.dot(OC) - R*R;
                const disc = b*b - 4*a*c;

                let worldHit = null;

                if(disc >= 0){
                    const sqrtDisc = Math.sqrt(disc);
                    const t1 = (-b - sqrtDisc) / (2*a);
                    const t2 = (-b + sqrtDisc) / (2*a);

                    // choose the closest positive t
                    let t = Number.POSITIVE_INFINITY;
                    if(t1 > 0 && t1 < t) t = t1;
                    if(t2 > 0 && t2 < t) t = t2;

                    if(isFinite(t)){
                        worldHit = new THREE.Vector3().copy(D).multiplyScalar(t).add(O);
                    }
                }

                // Fallback: intersect a plane that faces the camera and goes through the pivot
                if(!worldHit){
                    const camDir = new THREE.Vector3();
                    camera.getWorldDirection(camDir);

                    const dragPlane = new THREE.Plane();
                    dragPlane.normal.copy(camDir).normalize();
                    dragPlane.constant = -dragPlane.normal.dot(pivotWorld);

                    worldHit = new THREE.Vector3();
                    ray.intersectPlane(dragPlane, worldHit);

                    if(!worldHit) return; // give up if no intersection

                    // Project the plane hit onto the sphere surface to keep string length constraint
                    const dirFromPivot = new THREE.Vector3().subVectors(worldHit, pivotWorld).normalize();
                    worldHit.copy(dirFromPivot.multiplyScalar(R).add(pivotWorld));
                }

                // Convert intersection point back to cradle local space to compute angles
                const localHit = worldHit.clone();
                newtonsCradle.worldToLocal(localHit);

                const dx = localHit.x - pivotX;
                const dy = pivotY - localHit.y;
                const dz = localHit.z - pivotZ;

                // Compute angles (theta: left/right around Z, phi: front/back around X)
                let theta = Math.atan2(dx, dy);
                let phi = Math.asin( Math.max(-1, Math.min(1, dz / R)) ); // more stable recovery for phi

                const maxAngle = Math.PI / 2.1;

                theta = Math.max(-maxAngle, Math.min(maxAngle, theta));
                phi = Math.max(-maxAngle, Math.min(maxAngle, phi));

                const ball = newtonsCradle.moveableDummies[ballIndex];

                // compute delta time and set angular velocities based on movement
                const info = dragInfo.get(event.pointerId);
                const now = performance.now();
                if(info){
                    const dt = Math.max(1e-3, (now - info.lastTime) / 1000);

                    const dTheta = (theta - info.lastTheta);
                    const dPhi = (phi - info.lastPhi);

                    // set angular velocities directly (rad/s)
                    ball.omega = dTheta / dt;
                    ball.omegaZ = dPhi / dt;

                    // clamp using physics params
                    const maxA = physicsParams.maxAngularSpeed;
                    ball.omega = Math.max(-maxA, Math.min(maxA, ball.omega));
                    ball.omegaZ = Math.max(-maxA, Math.min(maxA, ball.omegaZ));

                    info.lastTheta = theta;
                    info.lastPhi = phi;
                    info.lastTime = now;
                }

                // set angles from drag
                ball.theta = theta;
                ball.phi = phi;

            }else{

                mouse.x=
                (event.clientX/window.innerWidth)*2-1;

                mouse.y=
                -(event.clientY/window.innerHeight)*2+1;

                raycaster.setFromCamera(
                    mouse,
                    camera
                );

                let intersects=
                raycaster.intersectObject(
                    newtonsCradle.ballSystem
                );

                document.body.style.cursor=
                intersects.length>0
                ?
                'grab'
                :
                'default';
            }
        }
    );

    function releasePointer(event){

        // on release, we already set ball.omega and ball.omegaZ during moves
        draggedBalls.delete(
            event.pointerId
        );

        dragInfo.delete(event.pointerId);

        if(draggedBalls.size===0){

            controls.enabled=true;

            document.body.style.cursor=
            'default';
        }

        try{ (event.target || window).releasePointerCapture?.(event.pointerId); }catch(e){}
    }

    window.addEventListener('pointerup', releasePointer);
    window.addEventListener('pointercancel', releasePointer);
    window.addEventListener('pointerleave', releasePointer);
}
