// =============================================
// Newton's Cradle Class
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
            });
        });
    }

    updatePhysics(dt){

        const steps=80;

        const subDt=dt/steps;

        const L=this.stringLengthReal;

        let totalEnergy=0;

        for(let s=0;s<steps;s++){

            // =========================
            // Integration
            // =========================

            for(let i=0;i<this.ballsCount;i++){

                let b=this.moveableDummies[i];

                const isDragged=
                Array.from(draggedBalls.values())
                .includes(i);

                if(isDragged){

                    b.omega=0;
                    b.alpha=0;

                    b.omegaZ=0;
                    b.alphaZ=0;

                    continue;
                }

                let gravityTorque=
                -(physicsParams.gravity/L)
                *Math.sin(b.theta);

                let drag=
                -(physicsParams.friction*b.omega)
                -
                (
                    physicsParams.friction*
                    0.2*
                    b.omega*
                    Math.abs(b.omega)
                );

                b.alpha=gravityTorque+drag;

                b.omega+=b.alpha*subDt;

                b.theta+=b.omega*subDt;

                let gravityTorqueZ=
                -(physicsParams.gravity/L)
                *Math.sin(b.phi);

                let dragZ=
                -(physicsParams.friction*b.omegaZ)
                -
                (
                    physicsParams.friction*
                    0.2*
                    b.omegaZ*
                    Math.abs(b.omegaZ)
                );

                b.alphaZ=gravityTorqueZ+dragZ;

                b.omegaZ+=b.alphaZ*subDt;

                b.phi+=b.omegaZ*subDt;
            }

            // =========================
            // Collisions
            // =========================

            for(let iter=0;iter<10;iter++){

                for(let i=0;i<this.ballsCount-1;i++){

                    let b1=this.moveableDummies[i];

                    let b2=this.moveableDummies[i+1];

                    let overlap=b1.theta-b2.theta;

                    if(overlap>0){

                        const b1Dragged=
                        Array.from(
                            draggedBalls.values()
                        ).includes(i);

                        const b2Dragged=
                        Array.from(
                            draggedBalls.values()
                        ).includes(i+1);

                        if(b1Dragged){

                            b2.theta+=overlap;

                        }else if(b2Dragged){

                            b1.theta-=overlap;

                        }else{

                            b1.theta-=overlap*0.5;
                            b2.theta+=overlap*0.5;
                        }

                        let relVel=
                        b1.omega-b2.omega;

                        if(relVel>0){

                            let e=
                            physicsParams.restitution;

                            let impulse=
                            -(1+e)*relVel*0.5;

                            if(!b1Dragged)
                                b1.omega+=impulse;

                            if(!b2Dragged)
                                b2.omega-=impulse;
                        }
                    }
                }
            }
        }

        this.moveableDummies.forEach((b)=>{

            let ke=0.5*b.omega*b.omega + 0.5*b.omegaZ*b.omegaZ;

            let pe=
            physicsParams.gravity*
            L*
            (
                1-Math.cos(b.theta)
            )
            +
            physicsParams.gravity*
            L*
            (
                1-Math.cos(b.phi)
            );

            totalEnergy+=(ke+pe);
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

        this.moveableDummies.forEach((b)=>{

            b.rotation.z=b.theta;

            b.rotation.x=b.phi;

            b.updateMatrix();

            this.ballSystem
            .setMatrixAt(
                b.instanceIndex,
                b.matrix
            );
        });

        this.ballSystem.instanceMatrix
        .needsUpdate=true;
    }
}
