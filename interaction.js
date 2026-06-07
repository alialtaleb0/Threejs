// =============================================
// Multi Touch Interaction Events
// =============================================

import * as THREE from "three";

export const draggedBalls = new Map();

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0,0,1),0);
const intersectionPoint = new THREE.Vector3();

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

                controls.enabled=false;

                document.body.style.cursor=
                'grabbing';
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

                // Use a vertical plane facing the camera for free 3D drag
                const camDir=new THREE.Vector3();
                camera.getWorldDirection(camDir);
                camDir.y=0;
                camDir.normalize();
                dragPlane.normal.copy(camDir);
                dragPlane.constant=
                -dragPlane.normal.dot(
                    newtonsCradle.position
                );

                raycaster.ray.intersectPlane(
                    dragPlane,
                    intersectionPoint
                );

                let pivotX=
                (
                    -(newtonsCradle.ballsCount-1)
                    *0.5
                    +
                    ballIndex
                )
                *
                (
                    newtonsCradle.ballRadius*2
                );

                let pivotY=
                newtonsCradle.frameH;

                let dx=
                intersectionPoint.x-pivotX;

                let dy=
                pivotY-intersectionPoint.y;

                let dz=
                intersectionPoint.z;

                let theta=
                Math.atan2(dx,dy);

                let phi=
                Math.atan2(dz,dy);

                let maxAngle=
                Math.PI/2.1;

                theta=
                Math.max(
                    -maxAngle,
                    Math.min(maxAngle,theta)
                );

                phi=
                Math.max(
                    -maxAngle,
                    Math.min(maxAngle,phi)
                );

                let ball=
                newtonsCradle
                .moveableDummies[ballIndex];

                ball.theta=theta;
                ball.omega=0;

                ball.phi=phi;
                ball.omegaZ=0;

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

        draggedBalls.delete(
            event.pointerId
        );

        if(draggedBalls.size===0){

            controls.enabled=true;

            document.body.style.cursor=
            'default';
        }
    }

    window.addEventListener('pointerup', releasePointer);
    window.addEventListener('pointercancel', releasePointer);
    window.addEventListener('pointerleave', releasePointer);
}
