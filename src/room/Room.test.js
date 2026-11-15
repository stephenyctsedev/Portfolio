import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildRoom } from './Room.js';
import { OVERVIEW } from './CameraRig.js';

const NAMES = ['floor', 'ceiling', 'backWall', 'leftWall', 'rightWall', 'baseboardNeon', 'bed', 'bedUnderglow', 'rug', 'desk', 'chair', 'shelf', 'lavaLamp', 'window', 'city', 'neonBolt', 'neonRing', 'posterA', 'posterB'];

describe('buildRoom', () => {
  it('builds every named piece with color fallbacks when textures are missing', () => {
    const scene = new THREE.Scene();
    const room = buildRoom(scene, {});
    for (const name of NAMES) expect(scene.getObjectByName(name), name).toBeTruthy();
    expect(scene.fog).toBeInstanceOf(THREE.FogExp2);
    const lights = [];
    scene.traverse((o) => { if (o.isLight) lights.push(o); });
    expect(lights.length).toBeGreaterThanOrEqual(4);
    expect(room.lights.deskLamp.isSpotLight).toBe(true);
    expect(() => { for (let i = 0; i < 50; i++) room.animate(i * 0.1, 0.1); }).not.toThrow();
  });
  it('puts the desk top surface at y = 0.76 for the computer to sit on', () => {
    const scene = new THREE.Scene();
    buildRoom(scene, {});
    scene.updateMatrixWorld(true);
    const top = scene.getObjectByName('deskTop');
    const box = new THREE.Box3().setFromObject(top);
    expect(box.max.y).toBeCloseTo(0.76, 5);
    expect(box.getCenter(new THREE.Vector3()).x).toBeCloseTo(-0.8, 5);
  });
  // Regression: the shelf's boards and books hid half of the "STAY CURIOUS" poster from the default camera.
  it.each(['posterA', 'posterB'])('shows %s unobstructed from the default overview camera', (name) => {
    const scene = new THREE.Scene();
    buildRoom(scene, {});
    scene.updateMatrixWorld(true);
    const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 40);
    camera.position.fromArray(OVERVIEW.position);
    camera.lookAt(...OVERVIEW.target);
    camera.updateMatrixWorld(true);

    const poster = scene.getObjectByName(name);
    const { width, height } = poster.geometry.parameters;
    const raycaster = new THREE.Raycaster();
    const blockers = new Set();
    for (let i = 0; i <= 8; i++) {
      for (let j = 0; j <= 8; j++) {
        // sample the poster face, stopping short of the exact edges
        const point = poster.localToWorld(new THREE.Vector3((i / 8 - 0.5) * width * 0.96, (j / 8 - 0.5) * height * 0.96, 0));
        const toPoint = point.clone().sub(camera.position);
        raycaster.set(camera.position, toPoint.clone().normalize());
        raycaster.far = toPoint.length() - 0.003; // anything hit before the poster surface is in the way
        for (const hit of raycaster.intersectObject(scene, true)) {
          let owner = hit.object; // report the nearest named piece of furniture, not the outer "room" group
          while (owner.parent && !(owner.name && owner.name !== 'room')) owner = owner.parent;
          blockers.add(owner.name || hit.object.type);
        }
      }
    }
    expect([...blockers], `${name} is hidden behind`).toEqual([]);
  });

  it('maps provided textures onto the window and posters', () => {
    const tex = new THREE.Texture();
    const scene = new THREE.Scene();
    buildRoom(scene, { city: tex, posterA: tex, grid: tex });
    expect(scene.getObjectByName('city').material.map).toBe(tex);
    expect(scene.getObjectByName('posterA').material.map).toBe(tex);
    expect(scene.getObjectByName('floor').material.emissiveMap).toBe(tex);
  });
});
