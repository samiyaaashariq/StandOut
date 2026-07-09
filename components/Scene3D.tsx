"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, Sphere, Points, PointMaterial, Torus } from "@react-three/drei";
import * as THREE from "three";

function GlowSphere() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.15;
      meshRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.2) * 0.25;
    }
  });

  return (
    <Sphere ref={meshRef} args={[1.8, 64, 64]} position={[1.2, 0.3, -1]}>
      <MeshDistortMaterial
        color="#5EEAD4"
        attach="material"
        distort={0.5}
        speed={1.8}
        roughness={0.1}
        metalness={0.8}
        opacity={0.45}
        transparent
      />
    </Sphere>
  );
}

function OrbitRing() {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.getElapsedTime() * 0.1;
      ringRef.current.rotation.x = 1.2 + Math.sin(state.clock.getElapsedTime() * 0.15) * 0.1;
    }
  });

  return (
    <Torus ref={ringRef} args={[2.4, 0.015, 16, 100]} position={[1.2, 0.3, -1]}>
      <meshStandardMaterial color="#2DD4BF" transparent opacity={0.55} emissive="#2DD4BF" emissiveIntensity={0.4} />
    </Torus>
  );
}

function Particles() {
  const ref = useRef<THREE.Points>(null);
  const count = 700;

  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 14;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
  }

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.getElapsedTime() * 0.03;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3}>
      <PointMaterial
        color="#5EEAD4"
        size={0.035}
        sizeAttenuation
        transparent
        opacity={0.6}
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
        state.mouse.x * 0.35,
        0.03
      );
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        state.mouse.y * 0.2,
        0.03
      );
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

export default function Scene3D() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <pointLight position={[5, 5, 5]} intensity={1.2} color="#5EEAD4" />
          <pointLight position={[-5, -3, 2]} intensity={0.5} color="#2DD4BF" />
          <MouseParallaxRig>
            <GlowSphere />
            <OrbitRing />
            <Particles />
          </MouseParallaxRig>
        </Suspense>
      </Canvas>
      {/* Soft vignette so the 3D layer doesn't wash out foreground text near screen edges */}
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/20 via-transparent to-neutral-950/60" />
    </div>
  );
}
