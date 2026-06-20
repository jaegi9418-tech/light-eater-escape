import * as THREE from 'three';

export class SurfelPoint {
  constructor(position, normal) {
    this.position = position.clone();
    this.normal = normal.clone();
    this.brightness = 0; // 0 to 1

    // Visual representation of the surfel
    // Using a plane geometry oriented with the normal
    const geometry = new THREE.PlaneGeometry(1.5, 1.5);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x000000, 
      transparent: true,
      opacity: 0.6,
      depthWrite: false
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position).add(this.normal.clone().multiplyScalar(0.01)); // Offset slightly to prevent z-fighting
    
    // Look along normal
    const target = this.position.clone().add(this.normal);
    this.mesh.lookAt(target);
  }

  setBrightness(val) {
    this.brightness = THREE.MathUtils.clamp(val, 0, 1);
    
    // Update visuals based on brightness
    const targetColor = new THREE.Color(0xffeebb); // Warm light color
    const blackColor = new THREE.Color(0x000000);
    
    this.mesh.material.color.lerpColors(blackColor, targetColor, this.brightness);
    this.mesh.material.opacity = 0.6 + (this.brightness * 0.4);
  }
}

export class SurfelGI {
  constructor(scene) {
    this.scene = scene;
    this.surfels = [];
    this.collectedLightSources = 0;
  }

  addSurfel(position, normal) {
    const surfel = new SurfelPoint(position, normal);
    this.surfels.push(surfel);
    this.scene.add(surfel.mesh);
  }

  generateGrid(minX, maxX, minZ, maxZ, yPos, spacing, normal) {
    for (let x = minX; x <= maxX; x += spacing) {
      for (let z = minZ; z <= maxZ; z += spacing) {
        this.addSurfel(new THREE.Vector3(x, yPos, z), normal);
      }
    }
  }

  generateWallGrid(minX, maxX, minY, maxY, zPos, spacing, normal) {
    for (let x = minX; x <= maxX; x += spacing) {
      for (let y = minY; y <= maxY; y += spacing) {
        this.addSurfel(new THREE.Vector3(x, y, zPos), normal);
      }
    }
  }

  generateWallGridZ(minZ, maxZ, minY, maxY, xPos, spacing, normal) {
    for (let z = minZ; z <= maxZ; z += spacing) {
      for (let y = minY; y <= maxY; y += spacing) {
        this.addSurfel(new THREE.Vector3(xPos, y, z), normal);
      }
    }
  }

  // Call this when an orb is collected
  updateSurfelLighting(orbPosition, radius, intensityBoost) {
    this.collectedLightSources++;
    
    for (let surfel of this.surfels) {
      const dist = surfel.position.distanceTo(orbPosition);
      if (dist < radius) {
        // Falloff calculation
        const falloff = 1.0 - (dist / radius);
        const newBrightness = surfel.brightness + (falloff * intensityBoost);
        surfel.setBrightness(newBrightness);
      }
    }
  }
}
