import * as THREE from 'three';

export class Level {
  constructor(scene, surfelGI) {
    this.scene = scene;
    this.surfelGI = surfelGI;
    this.collisionBoxes = [];
    this.orbs = [];
    this.hints = [];
    this.finalDoor = null;

    this.wallMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
    this.floorMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
    this.ceilingMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0 });

    this.buildMap();
    this.placeOrbs();
    this.placeHints();
    this.placeFinalDoor();
  }

  createRoom(x, z, width, depth, generateSurfels = true) {
    const height = 4;
    const halfW = width / 2;
    const halfD = depth / 2;

    // Floor
    const floorGeo = new THREE.PlaneGeometry(width, depth);
    const floor = new THREE.Mesh(floorGeo, this.floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(x, 0, z);
    this.scene.add(floor);

    // Ceiling
    const ceil = new THREE.Mesh(floorGeo, this.ceilingMaterial);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(x, height, z);
    this.scene.add(ceil);

    // Build collision box for the room walls (approximate with thick invisible boxes)
    const thickness = 1;
    
    // Left Wall
    this.addWall(x - halfW, height/2, z, thickness, height, depth + thickness);
    // Right Wall
    this.addWall(x + halfW, height/2, z, thickness, height, depth + thickness);
    // Back Wall
    this.addWall(x, height/2, z - halfD, width + thickness, height, thickness);
    // Front Wall
    this.addWall(x, height/2, z + halfD, width + thickness, height, thickness);

    if (generateSurfels) {
      // Floor surfels
      this.surfelGI.generateGrid(x - halfW + 1, x + halfW - 1, z - halfD + 1, z + halfD - 1, 0.1, 2, new THREE.Vector3(0, 1, 0));
      // Wall surfels
      this.surfelGI.generateWallGridZ(z - halfD + 1, z + halfD - 1, 1, height - 1, x - halfW + 0.1, 2, new THREE.Vector3(1, 0, 0));
      this.surfelGI.generateWallGridZ(z - halfD + 1, z + halfD - 1, 1, height - 1, x + halfW - 0.1, 2, new THREE.Vector3(-1, 0, 0));
      this.surfelGI.generateWallGrid(x - halfW + 1, x + halfW - 1, 1, height - 1, z - halfD + 0.1, 2, new THREE.Vector3(0, 0, 1));
      this.surfelGI.generateWallGrid(x - halfW + 1, x + halfW - 1, 1, height - 1, z + halfD - 0.1, 2, new THREE.Vector3(0, 0, -1));
    }
  }

  addWall(x, y, z, w, h, d) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const wall = new THREE.Mesh(geo, this.wallMaterial);
    wall.position.set(x, y, z);
    this.scene.add(wall);

    const box = new THREE.Box3().setFromObject(wall);
    this.collisionBoxes.push(box);
  }

  // Cuts a hole by replacing a wall - simplified for this project by just adding collision gaps
  // Since we use addWall which creates solid walls, interconnected rooms will have overlapping walls blocking the way.
  // We need a more granular wall building. For simplicity, we just use custom boxes.

  buildMap() {
    // Instead of generic createRoom, let's build specific custom walls to leave doorways open.
    const h = 4;
    const t = 1; // thickness

    // Start Room (10x10), centered at (0,0,0)
    // Doorway at North (z = -5), x = [-2, 2]
    this.addFloor(0, 0, 10, 10);
    this.addWall(-5, h/2, 0, t, h, 10); // Left
    this.addWall(5, h/2, 0, t, h, 10);  // Right
    this.addWall(0, h/2, 5, 10, h, t);  // Bottom/South
    this.addWall(-3.5, h/2, -5, 3, h, t); // Top/North Left part
    this.addWall(3.5, h/2, -5, 3, h, t);  // Top/North Right part

    // Corridor (4x10), from z=-5 to z=-15
    this.addFloor(0, -10, 4, 10);
    this.addWall(-2, h/2, -10, t, h, 10); // Left
    this.addWall(2, h/2, -10, t, h, 10);  // Right

    // Hint Room (10x10), centered at (0,0,-20)
    // Doorway South (z = -15)
    // Doorway East (x = 5), z = [-2, 2]
    this.addFloor(0, -20, 10, 10);
    this.addWall(-5, h/2, -20, t, h, 10); // Left
    this.addWall(0, h/2, -25, 10, h, t);  // Top/North
    this.addWall(-3.5, h/2, -15, 3, h, t); // Bottom/South Left part
    this.addWall(3.5, h/2, -15, 3, h, t);  // Bottom/South Right part
    this.addWall(5, h/2, -16.5, t, h, 3); // Right Top part
    this.addWall(5, h/2, -23.5, t, h, 3); // Right Bottom part

    // Final Corridor (10x4), from x=5 to x=15, centered at z=-20
    this.addFloor(10, -20, 10, 4);
    this.addWall(10, h/2, -18, 10, h, t); // Bottom
    this.addWall(10, h/2, -22, 10, h, t); // Top

    // Final Room (10x10), centered at (20,-20)
    // Doorway West (x = 15)
    this.addFloor(20, -20, 10, 10);
    this.addWall(20, h/2, -15, 10, h, t); // Bottom/South
    this.addWall(20, h/2, -25, 10, h, t); // Top/North
    this.addWall(25, h/2, -20, t, h, 10); // Right/East
    this.addWall(15, h/2, -16.5, t, h, 3); // Left Bottom part
    this.addWall(15, h/2, -23.5, t, h, 3); // Left Top part

    // Generate Surfels manually roughly
    this.surfelGI.generateGrid(-4, 4, -4, 4, 0.1, 2, new THREE.Vector3(0, 1, 0)); // Start room
    this.surfelGI.generateGrid(-1, 1, -14, -6, 0.1, 2, new THREE.Vector3(0, 1, 0)); // Corridor
    this.surfelGI.generateGrid(-4, 4, -24, -16, 0.1, 2, new THREE.Vector3(0, 1, 0)); // Hint Room
    this.surfelGI.generateGrid(6, 14, -21, -19, 0.1, 2, new THREE.Vector3(0, 1, 0)); // Final Corridor
    this.surfelGI.generateGrid(16, 24, -24, -16, 0.1, 2, new THREE.Vector3(0, 1, 0)); // Final Room

    // Walls (just a few for visual effect)
    this.surfelGI.generateWallGrid(-4, 4, 1, 3, -4.5, 2, new THREE.Vector3(0, 0, 1));
    this.surfelGI.generateWallGrid(-4, 4, 1, 3, -24.5, 2, new THREE.Vector3(0, 0, 1));
  }

  addFloor(x, z, w, d) {
    const floorGeo = new THREE.PlaneGeometry(w, d);
    const floor = new THREE.Mesh(floorGeo, this.floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(x, 0, z);
    this.scene.add(floor);

    const ceil = new THREE.Mesh(floorGeo, this.ceilingMaterial);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(x, 4, z);
    this.scene.add(ceil);
  }

  createOrb(x, y, z) {
    const geo = new THREE.SphereGeometry(0.3, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    
    // Halo
    const haloGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xffffaa, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    mesh.add(halo);

    const light = new THREE.PointLight(0xffffff, 1.5, 5);
    mesh.add(light);

    this.scene.add(mesh);
    this.orbs.push({ mesh, collected: false, activeY: y });
  }

  placeOrbs() {
    this.createOrb(0, 1.5, 0); // Start room
    this.createOrb(0, 1.5, -10); // Corridor
    this.createOrb(-3, 1.5, -20); // Hint room L
    this.createOrb(3, 1.5, -20); // Hint room R
    this.createOrb(10, 1.5, -20); // Final corridor
  }

  createHint(x, y, z, lines, rotationY = 0) {
    // Simple text hint using Canvas
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'black';
    ctx.fillRect(0,0,512,512);
    ctx.fillStyle = '#00ffaa';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    lines.forEach((line, index) => {
      ctx.fillText(line, 256, 180 + (index * 80));
    });

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshStandardMaterial({ 
      map: tex, 
      emissive: new THREE.Color(0x00ffaa),
      emissiveIntensity: 0.0, // starts invisible
      transparent: true,
      opacity: 0.1
    });

    const geo = new THREE.PlaneGeometry(3, 3);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotationY;
    this.scene.add(mesh);
    
    this.hints.push(mesh);
  }

  placeHints() {
    // Hint Room North Wall
    this.createHint(0, 2, -24.4, ["Gather all 5 Orbs", "to reveal the path ->"]);
    
    // Hint Room West Wall
    this.createHint(-4.4, 2, -20, ["The Final Door", "is hidden East", "=>"], Math.PI / 2);

    // Corridor Hint
    this.createHint(1.9, 2, -10, ["Follow the light", "V"], -Math.PI / 2);
  }

  placeFinalDoor() {
    const geo = new THREE.BoxGeometry(0.5, 4, 3);
    const mat = new THREE.MeshStandardMaterial({ color: 0xaa0000, emissive: 0x550000 });
    this.finalDoor = new THREE.Mesh(geo, mat);
    this.finalDoor.position.set(15, 2, -20);
    this.scene.add(this.finalDoor);
    
    // Add door to collision
    const box = new THREE.Box3().setFromObject(this.finalDoor);
    this.collisionBoxes.push(box);
    this.finalDoor.collisionBoxIndex = this.collisionBoxes.length - 1;
  }

  openFinalDoor() {
    this.scene.remove(this.finalDoor);
    // Remove collision
    if (this.finalDoor.collisionBoxIndex !== undefined) {
      this.collisionBoxes[this.finalDoor.collisionBoxIndex] = new THREE.Box3(); // empty box
    }
  }

  update(time) {
    // Animate orbs
    this.orbs.forEach(orb => {
      if (!orb.collected) {
        orb.mesh.position.y = orb.activeY + Math.sin(time * 3) * 0.2;
        orb.mesh.rotation.y += 0.02;
      }
    });

    // Update hints based on nearby surfel brightness
    this.hints.forEach(hint => {
      // Find nearest surfel
      let maxBright = 0;
      this.surfelGI.surfels.forEach(s => {
        if (s.position.distanceTo(hint.position) < 4) {
          if (s.brightness > maxBright) maxBright = s.brightness;
        }
      });
      hint.material.emissiveIntensity = maxBright * 2;
      hint.material.opacity = 0.1 + maxBright * 0.9;
    });
  }
}
