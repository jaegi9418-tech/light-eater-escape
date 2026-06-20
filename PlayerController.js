import * as THREE from 'three';

export class PlayerController {
  constructor(camera, domElement, levelBoxes) {
    this.camera = camera;
    this.domElement = domElement;
    this.levelBoxes = levelBoxes; // Array of THREE.Box3 for collision

    // Movement state
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.canJump = false;

    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    
    this.speed = 15.0;
    this.playerHeight = 1.6;
    this.camera.position.y = this.playerHeight;
    this.playerRadius = 0.5;

    // PointerLock state
    this.isLocked = false;

    // Setup event listeners
    this.initEvents();
  }

  initEvents() {
    const onKeyDown = (event) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.moveForward = true;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.moveLeft = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.moveBackward = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.moveRight = true;
          break;
      }
    };

    const onKeyUp = (event) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.moveForward = false;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.moveLeft = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.moveBackward = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.moveRight = false;
          break;
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Mouse look
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    const PI_2 = Math.PI / 2;

    document.addEventListener('mousemove', (event) => {
      if (this.isLocked === false) return;

      const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
      const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

      this.euler.setFromQuaternion(this.camera.quaternion);

      this.euler.y -= movementX * 0.002;
      this.euler.x -= movementY * 0.002;

      this.euler.x = Math.max(-PI_2, Math.min(PI_2, this.euler.x));

      this.camera.quaternion.setFromEuler(this.euler);
    });

    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === document.body) {
        this.isLocked = true;
      } else {
        this.isLocked = false;
        // Show start screen if unlocked, assuming we have global access or trigger event
        document.dispatchEvent(new Event('playerUnlocked'));
      }
    });
  }

  lock() {
    document.body.requestPointerLock();
  }

  update(delta) {
    if (!this.isLocked) return;

    this.velocity.x -= this.velocity.x * 10.0 * delta;
    this.velocity.z -= this.velocity.z * 10.0 * delta;

    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    this.direction.normalize();

    if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * this.speed * delta;
    if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * this.speed * delta;

    // Calculate intended position
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    right.y = 0; right.normalize();
    
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    forward.y = 0; forward.normalize();

    const moveVector = new THREE.Vector3();
    moveVector.addScaledVector(right, -this.velocity.x);
    moveVector.addScaledVector(forward, -this.velocity.z);

    // Simple collision detection (AABB vs point with radius)
    let newPos = this.camera.position.clone().add(moveVector);
    
    // Check collision against all level boxes
    let collision = false;
    for (let box of this.levelBoxes) {
      // Create a small bounding box for player
      let playerBox = new THREE.Box3(
        new THREE.Vector3(newPos.x - this.playerRadius, 0, newPos.z - this.playerRadius),
        new THREE.Vector3(newPos.x + this.playerRadius, this.playerHeight + 0.5, newPos.z + this.playerRadius)
      );

      if (box.intersectsBox(playerBox)) {
        collision = true;
        break;
      }
    }

    if (!collision) {
      this.camera.position.copy(newPos);
    } else {
      // Try sliding along walls by zeroing out axes
      let slideXPos = this.camera.position.clone();
      slideXPos.x += moveVector.x;
      let slideXBox = new THREE.Box3(
        new THREE.Vector3(slideXPos.x - this.playerRadius, 0, slideXPos.z - this.playerRadius),
        new THREE.Vector3(slideXPos.x + this.playerRadius, this.playerHeight + 0.5, slideXPos.z + this.playerRadius)
      );
      
      let collX = false;
      for (let box of this.levelBoxes) if (box.intersectsBox(slideXBox)) collX = true;

      if (!collX) {
        this.camera.position.x = slideXPos.x;
      }

      let slideZPos = this.camera.position.clone();
      slideZPos.z += moveVector.z;
      let slideZBox = new THREE.Box3(
        new THREE.Vector3(slideZPos.x - this.playerRadius, 0, slideZPos.z - this.playerRadius),
        new THREE.Vector3(slideZPos.x + this.playerRadius, this.playerHeight + 0.5, slideZPos.z + this.playerRadius)
      );
      
      let collZ = false;
      for (let box of this.levelBoxes) if (box.intersectsBox(slideZBox)) collZ = true;

      if (!collZ) {
        this.camera.position.z = slideZPos.z;
      }
    }
  }
}
