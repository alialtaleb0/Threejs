// =============================================
// Physics Parameters & UI Controls
// =============================================

export const physicsParams = {
    gravity:9.81,
    friction:0.05,
    restitution:0.99
};

export function initUIControls(){

    document.getElementById('gravity').addEventListener('input',e=>{
        physicsParams.gravity=parseFloat(e.target.value);
        document.getElementById('gVal').innerText=
        physicsParams.gravity.toFixed(2);
    });

    document.getElementById('friction').addEventListener('input',e=>{
        physicsParams.friction=parseFloat(e.target.value);
        document.getElementById('fVal').innerText=
        physicsParams.friction.toFixed(2);
    });

    document.getElementById('restitution').addEventListener('input',e=>{
        physicsParams.restitution=parseFloat(e.target.value);
        document.getElementById('rVal').innerText=
        physicsParams.restitution.toFixed(2);
    });
}
