import * as THREE from 'three';
import { PlayerController } from './PlayerController.js';
import { SurfelGI } from './SurfelGI.js';
import { Level } from './Level.js';

let scene, camera, renderer, clock;
let player, level, surfelGI;
let isGameStarted = false;
let orbsCollected = 0;
let totalOrbs = 5;

const startScreen = document.getElementById('start-screen');
const hudScreen = document.getElementById('hud-screen');
const clearScreen = document.getElementById('clear-screen');
const orbCountSpan = document.getElementById('orb-count');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const hintMsg = document.getElementById('hint-msg');

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020202); // Very dark ambient
  scene.fog = new THREE.FogExp2(0x000000, 0.08);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.6, 0); // Start position

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.getElementById('game-container').appendChild(renderer.domElement);

  // Dim global ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.08);
  scene.add(ambientLight);

  // Add a faint flashlight to the player so they aren't completely blind in dark areas
  const playerLight = new THREE.PointLight(0xffffff, 0.2, 8);
  camera.add(playerLight);
  scene.add(camera);

  surfelGI = new SurfelGI(scene);
  level = new Level(scene, surfelGI);

  player = new PlayerController(camera, renderer.domElement, level.collisionBoxes);

  clock = new THREE.Clock();

  window.addEventListener('resize', onWindowResize);

  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', () => location.reload());

  document.addEventListener('playerUnlocked', () => {
    if (isGameStarted && orbsCollected < totalOrbs) {
      startScreen.classList.add('active');
      hudScreen.classList.remove('active');
      isGameStarted = false;
    }
  });
}

function startGame() {
  player.lock();
  startScreen.classList.remove('active');
  hudScreen.classList.add('active');
  isGameStarted = true;
}

function checkOrbCollisions() {
  level.orbs.forEach(orb => {
    if (!orb.collected) {
      const dist = camera.position.distanceTo(orb.mesh.position);
      if (dist < 1.5) {
        orb.collected = true;
        scene.remove(orb.mesh);
        orbsCollected++;
        orbCountSpan.innerText = orbsCollected;

        // Spread light!
        surfelGI.updateSurfelLighting(orb.mesh.position, 12, 0.6);
        
        showHintMessage("Orb collected! The light spreads...");

        if (orbsCollected === totalOrbs) {
          level.openFinalDoor();
          showHintMessage("The final door is unlocked!");
        }
      }
    }
  });
}

function showHintMessage(msg) {
  hintMsg.innerText = msg;
  setTimeout(() => {
    if (hintMsg.innerText === msg) hintMsg.innerText = "";
  }, 3000);
}

function checkEscape() {
  if (orbsCollected === totalOrbs && camera.position.x > 22 && camera.position.z < -18) {
    document.exitPointerLock();
    clearScreen.classList.add('active');
    hudScreen.classList.remove('active');
    isGameStarted = false;
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  if (isGameStarted) {
    player.update(delta);
    level.update(time);
    checkOrbCollisions();
    checkEscape();
  }

  renderer.render(scene, camera);
}
