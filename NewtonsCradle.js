// =============================================
// Newton's Cradle Class (improved collisions & frameD exposed)
// =============================================

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeBufferGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { physicsParams } from "./physics-params.js";
import { draggedBalls } from "./interaction.js";

export class NewtonsCradle extends THREE.Group{

    constructor(){

        super();

        let baseG=
        new RoundedBoxGeometry(
            14,1,7,3,0.25
        ).translate(0,0.5,0);

        let baseM=
        new THREE.MeshLambertMaterial({
            color:new THREE.Color(0,0.4,0.8)
            .multiplyScalar(0.4)
        });

        this.add(new THREE.Mesh(baseG,baseM));

        let frameR=0.25;
        let frameRound=1.5;
        let frameW=12;

        this.frameH=14;

        let frameD=5;
        this.frameD = frameD; // expose for interaction

        let radialSegs=16;

        let gs=[];

        let cornerRound=
        new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(-frameRound,0,0),
            new THREE.Vector3(-frameRound,-frameRound,0),
            new THREE.Vector3(0,-frameRound,0)
        );

        let tubeG=
        new THREE.TubeGeometry(
            cornerRound,
            10,
            frameR,
            radialSegs
        );

        let vertG=
        new THREE.CylinderGeometry(
            frameR,
            frameR,
            this.frameH-frameRound,
            radialSegs,
            1,
            true
        ).translate(
            0,
            (this.frameH-frameRound)*0.5,
            0
        );

        gs.push(
            tubeG.clone()
            .rotateZ(Math.PI*-0.5)
            .translate(
                -frameW*0.5+frameRound,
                this.frameH-frameRound,
                frameD*0.5
            ),

            tubeG.clone()
            .rotateZ(Math.PI)
            .translate(
                frameW*0.5-frameRound,
                this.frameH-frameRound,
                frameD*0.5
            ),

            vertG.clone()
            .translate(-frameW*0.5,0,frameD*0.5),

            vertG.clone()
            .translate(frameW*0.5,0,frameD*0.5),

            new THREE.CylinderGeometry(
                frameR,
                frameR,
                frameW-frameRound*2,
                radialSegs,
                1,
                true
            )
            .rotateZ(Math.PI*0.5)
            .translate(
                0,
                this.frameH,
                frameD*0.5
            )
        );

        let g=mergeBufferGeometries(gs);

        g=mergeBufferGeometries([
            g.clone(),
            g.clone().translate(0,0,-frameD)
        ]);

        let frame=
        new THREE.Mesh(
            g,
            new THREE.MeshLambertMaterial({
                color:0x888888
            })
        );

        frame.position.y=1;

        this.add(frame);

        this.ballsCount=5;

        this.ballRadius=1.115;

        this.stringLengthReal=
        this.frameH-1.5-1.115;

        let stringLengthUI=
        Math.sqrt(
            this.stringLengthReal*this.stringLengthReal+
            frameD*0.5*frameD*0.5
        );

        let stringG=
        new THREE.CylinderGeometry(
            0.02,
            0.02,
            stringLengthUI,
            8,
            1,
            true
        )
        .translate(0,stringLengthUI*0.5,0)
        .rotateX(Math.PI*0.5);

        let ballSystemGeoms=[

            new THREE.SphereGeometry(
                this.ballRadius,
                64,
                32
            ).translate(
                0,
                -this.frameH+1.5,
                0
            ),

            stringG.clone()
            .lookAt(
                new THREE.Vector3(
                    0,
                    this.stringLengthReal,
                    frameD*0.5
                )
            )
            .translate(
                0,
                -this.stringLengthReal,
                0
            ),

            stringG.clone()
            .lookAt(
                new THREE.Vector3(
                    0,
                    this.stringLengthReal,
                    frameD*-0.5
                )
            )
            .translate(
                0,
                -this.stringLengthReal,
                0
            )
        ];

        let ballSystemGeom=
        mergeBufferGeometries(ballSystemGeoms);

        let ballSystemMat=
        new THREE.MeshStandardMaterial({
            color:0xcccccc,
            metalness:1,
            roughness:0.2
        });

        this.ballSystem=
        new THREE.InstancedMesh(
            ballSystemGeom,
            ballSystemMat,
            this.ballsCount
        );

        this.moveableDummies=
        new Array(this.ballsCount)
        .fill()
        .map((p,idx)=>{

            let ballDummy=new THREE.Object3D();

            ballDummy.position.x=
            (
                -(this.ballsCount-1)*0.5+idx
            )*(this.ballRadius*2);

            ballDummy.theta=0;
            ballDummy.omega=0;
            ballDummy.alpha=0;

            ballDummy.phi=0;
            ballDummy.omegaZ=0;
            ballDummy.alphaZ=0;

            ballDummy.instanceIndex=idx;

            // store linear velocity of center for more accurate collisions
            ballDummy.v = new THREE.Vector3();

            return ballDummy;
        });

        this.ballSystem.position.y=this.frameH;

        frame.add(this.ballSystem);

        document.getElementById('resetBtn')
        .addEventListener('click',()=>{

            this.moveableDummies.forEach(b=>{

                b.theta=0;
                b.omega=0;
                b.alpha=0;

                b.phi=0;
                b.omegaZ=0;
                b.alphaZ=0;

                b.v.set(0,0,0);
            });
        });
    }

    // Convert angular state to world-space center position
    computeBallCenterWorld(i, outVec){
        const b = this.moveableDummies[i];

        const pivotX = (
            -(this.ballsCount-1)*0.5 + i
        ) * (this.ballRadius*2);

        const pivotY = this.frameH;
        const pivotZ = 0;

        // pivot in local space
        const pivotLocal = new THREE.Vector3(pivotX, pivotY, pivotZ);

        // ball local pos relative to cradle: length L at angles theta (around Z) and phi (around X)
        const L = this.stringLengthReal;

        // spherical-like conversion (small-angle friendly): y axis downwards
        const x = pivotX + Math.sin(b.theta) * Math.cos(b.phi) * L;
        const y = pivotY - Math.cos(b.theta) * Math.cos(b.phi) * L;
        const z = pivotZ + Math.sin(b.phi) * L;

        const local = new THREE.Vector3(x, y, z);

        // convert to world
        outVec.copy(local);
        this.localToWorld(outVec);

        return outVec;
    }

    // Convert angular velocities to linear velocity of center
    angularToLinearVelocity(i, outVec){
        const b = this.moveableDummies[i];
        const L = this.stringLengthReal;

        // small-angle approximations: v = omega x r
        // compute r (from pivot to center) in local coords
        const pivotX = (
            -(this.ballsCount-1)*0.5 + i
        ) * (this.ballRadius*2);
        const pivotY = this.frameH;
        const pivotZ = 0;

        const rLocal = new THREE.Vector3(
            Math.sin(b.theta) * Math.cos(b.phi) * L,
            -Math.cos(b.theta) * Math.cos(b.phi) * L,
            Math.sin(b.phi) * L
        );

        // angular velocity vector in local coords: around Z is omega (pointing +y?), around X is omegaZ
        // define ω = [omegaX, omegaY, omegaZ] -> here rotation about Z (vertical) corresponds to Vector (0,0,omegaZ?)
        // For our parameterization: theta rotates around Z axis, phi rotates around X axis. We'll build angular velocity vector accordingly.
        const ang = new THREE.Vector3();
        // rotation around Z (theta) => angZ = b.omega
        // rotation around X (phi) => angX = b.omegaZ
        ang.set(b.omegaZ, 0, b.omega);

        // linear velocity = ω cross r
        outVec.copy(ang).cross(rLocal);

        // convert to world space vector (rotation only) – assume cradle has no scale/rotation so local==world for vectors
        return outVec;
    }

    // Apply impulse to centers along normal n (world space) at contact between i and j
    applyImpulseBetween(i, j, n, relVelAlongNormal, e){
        const b1 = this.moveableDummies[i];
        const b2 = this.moveableDummies[j];

        const m = 1; // assume equal mass and mass=1

        // impulse scalar
        const jsc = -(1 + e) * relVelAlongNormal / 2; // divide by 2 because equal masses

        // change linear velocities
        const imp = n.clone().multiplyScalar(jsc);

        b1.v.add(imp.clone().multiplyScalar(1/m));
        b2.v.sub(imp.clone().multiplyScalar(1/m));

        // convert linear impulse back to angular velocity adjustments (approx)
        // torque = r x J. angular delta (approx) = torque / I. approximate I = m * L^2 (point mass at distance L)
        const L = this.stringLengthReal;
        const r1 = new THREE.Vector3();
        const r2 = new THREE.Vector3();
        this.computeBallCenterWorld(i, r1); this.localToWorld(r1); // r1 is world pos of center
        this.computeBallCenterWorld(j, r2); this.localToWorld(r2);

        // vectors from pivot world to centers
        const pivot1 = new THREE.Vector3((-(this.ballsCount-1)*0.5 + i)*(this.ballRadius*2), this.frameH, 0);
        const pivot2 = new THREE.Vector3((-(this.ballsCount-1)*0.5 + j)*(this.ballRadius*2), this.frameH, 0);
        this.localToWorld(pivot1); this.localToWorld(pivot2);

        const r1w = new THREE.Vector3().subVectors(r1, pivot1);
        const r2w = new THREE.Vector3().subVectors(r2, pivot2);

        const torque1 = new THREE.Vector3().copy(r1w).cross(imp);
        const torque2 = new THREE.Vector3().copy(r2w).cross(imp.clone().negate());

        const I = m * L * L;

        // approximate mapping torque -> (delta omega theta, delta omegaZ)
        // we'll project torque onto axes roughly corresponding to our parameterization
        b1.omega += torque1.z / I;
        b1.omegaZ += torque1.x / I;

        b2.omega += torque2.z / I;
        b2.omegaZ += torque2.x / I;
    }

    updatePhysics(dt){

        const steps=80;

        const subDt=dt/steps;

        const L=this.stringLengthReal;

        let totalEnergy=0;

        for(let s=0;s<steps;s++){

            // =========================
            // Integration (angular)
            // =========================

            for(let i=0;i<this.ballsCount;i++){

                let b=this.moveableDummies[i];

                const isDragged=
                Array.from(draggedBalls.values())
                .includes(i);

                if(isDragged){

                    // keep linear velocity in sync with angles
                    b.v.set(0,0,0);

                    b.omega=0;
                    b.alpha=0;

                    b.omegaZ=0;
                    b.alphaZ=0;

                    continue;
                }

                // simple pendulum angular acceleration for each axis
                let gravityTorque = -(physicsParams.gravity/L) * Math.sin(b.theta);
                let drag = -(physicsParams.friction*b.omega) - (physicsParams.friction*0.2*b.omega*Math.abs(b.omega));
                b.alpha = gravityTorque + drag;
                b.omega += b.alpha*subDt;
                b.theta += b.omega*subDt;

                let gravityTorqueZ = -(physicsParams.gravity/L) * Math.sin(b.phi);
                let dragZ = -(physicsParams.friction*b.omegaZ) - (physicsParams.friction*0.2*b.omegaZ*Math.abs(b.omegaZ));
                b.alphaZ = gravityTorqueZ + dragZ;
                b.omegaZ += b.alphaZ*subDt;
                b.phi += b.omegaZ*subDt;

                // update linear velocity from angular velocities (approx)
                this.angularToLinearVelocity(i, b.v);

                // damping clamp
                b.v.multiplyScalar(1 - physicsParams.friction*0.05);

            }

            // =========================
            // Collisions (3D sphere-sphere)
            // =========================

            // compute centers
            const centers = new Array(this.ballsCount).fill().map(()=>new THREE.Vector3());
            for(let i=0;i<this.ballsCount;i++){
                this.computeBallCenterWorld(i, centers[i]);
            }

            // naive pairwise collision resolution
            for(let i=0;i<this.ballsCount;i++){
                for(let j=i+1;j<this.ballsCount;j++){
                    const c1 = centers[i];
                    const c2 = centers[j];
                    const d = new THREE.Vector3().subVectors(c2, c1);
                    const dist = d.length();
                    const minDist = this.ballRadius*2;
                    if(dist < minDist - 1e-6){
                        const n = d.clone().normalize();

                        // relative velocity along normal
                        const relV = new THREE.Vector3().subVectors(this.moveableDummies[i].v, this.moveableDummies[j].v);
                        const relAlong = relV.dot(n);

                        if(relAlong > 0) continue; // moving apart

                        // positional correction (push apart)
                        const correction = n.clone().multiplyScalar((minDist - dist) * 0.5 + 1e-4);

                        // move centers in local space by converting correction to local and adjusting angles approx by small steps
                        // simpler: convert correction to angular deltas (approx)
                        // We'll apply immediate small angular displacement to avoid sinking
                        const delta = correction.length();

                        // compute restitution
                        const e = physicsParams.restitution;

                        // apply impulse
                        this.applyImpulseBetween(i, j, n, relAlong, e);

                        // Simple position correction by nudging angles slightly along normal projection
                        // project correction into local dx, dz for each ball
                        const corrLocal1 = correction.clone();
                        this.worldToLocal(corrLocal1.add(centers[i]));
                        corrLocal1.sub(centers[i]);

                        // map to small angle change: dtheta ≈ dx / L, dphi ≈ dz / L
                        const dtheta1 = corrLocal1.x / L;
                        const dphi1 = corrLocal1.z / L;

                        this.moveableDummies[i].theta -= dtheta1;
                        this.moveableDummies[i].phi -= dphi1;

                        const corrLocal2 = correction.clone().negate();
                        this.worldToLocal(corrLocal2.add(centers[j]));
                        corrLocal2.sub(centers[j]);

                        const dtheta2 = corrLocal2.x / L;
                        const dphi2 = corrLocal2.z / L;

                        this.moveableDummies[j].theta -= dtheta2;
                        this.moveableDummies[j].phi -= dphi2;

                    }
                }
            }

        }

        // Energy computation
        this.moveableDummies.forEach((b)=>{

            // kinetic: approximate from linear vel + angular
            const keLinear = 0.5 * b.v.lengthSq();
            const keAngular = 0.5*b.omega*b.omega + 0.5*b.omegaZ*b.omegaZ;

            let pe = physicsParams.gravity * L * (1 - Math.cos(b.theta)) + physicsParams.gravity * L * (1 - Math.cos(b.phi));

            totalEnergy += (keLinear + keAngular + pe);
        });

        let statusEl=
        document.getElementById('status');

        if(
            totalEnergy<0.005 &&
            draggedBalls.size===0
        ){

            this.moveableDummies.forEach((b)=>{

                b.theta*=0.85;

                b.omega=0;

                if(Math.abs(b.theta)<0.0001)
                    b.theta=0;

                b.phi*=0.85;

                b.omegaZ=0;

                if(Math.abs(b.phi)<0.0001)
                    b.phi=0;

                b.v.multiplyScalar(0.5);
            });

            statusEl.innerText=
            "حالة النظام: سكون";

            statusEl.style.color="#ff4757";

        }else{

            statusEl.innerText=
            draggedBalls.size>0
            ?
            "حالة النظام: تفاعل متعدد"
            :
            "حالة النظام: نشط";

            statusEl.style.color="#2ed573";
        }

        // write back instance matrices
        this.moveableDummies.forEach((b, i)=>{

            // update rotations from angles
            b.rotation.z=b.theta;
            b.rotation.x=b.phi;

            // update instance matrix
            b.updateMatrix();
            this.ballSystem.setMatrixAt(b.instanceIndex, b.matrix);
        });

        this.ballSystem.instanceMatrix.needsUpdate=true;
    }
}
