"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, Sphere, Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

function GlowSphere() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.08;
      meshRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.1) * 0.15;
    }
  });

  return (
    <Sphere ref={meshRef} args={[1.4, 64, 64]} position={[0, 0, 0]}>
      <MeshDistortMaterial
        color="#5EEAD4"
        attach="material"
        distort={0.35}
        speed={1.2}
        roughness={0.2}
        metalness={0.6}
        opacity={0.18}
        transparent
      />
    </Sphere>
  );
}

function Particles() {
  const ref = useRef<THREE.Points>(null);
  const count = 400;

  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
  }

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.getElapsedTime() * 0.02;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3}>
      <PointMaterial
        color="#2DD4BF"
        size={0.02}
        sizeAttenuation
        transparent
        opacity={0.4}
        depthWrite={false}
      />
    </Points>
  );
}

function MouseParallaxRig({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        state.mouse.x * 0.2,
        0.02
      );
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        state.mouse.y * 0.1,
        0.02
      );
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

export default function Scene3D() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <pointLight position={[5, 5, 5]} intensity={0.6} color="#5EEAD4" />
          <MouseParallaxRig>
            <GlowSphere />
            <Particles />
          </MouseParallaxRig>
        </Suspense>
      </Canvas>
    </div>
  );
}
