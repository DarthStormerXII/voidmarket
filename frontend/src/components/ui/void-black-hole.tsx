"use client";

import React, { useMemo } from "react";

interface VoidBlackHoleProps {
  className?: string;
}

export function VoidBlackHole({ className = "" }: VoidBlackHoleProps) {
  // Generate random particles for the accretion disk - slow orbital motion
  const particles = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => ({
      id: i,
      orbitRadius: 100 + Math.random() * 180,
      duration: 40 + Math.random() * 60, // Much slower: 40-100 seconds per orbit
      delay: Math.random() * -80,
      size: 1.5 + Math.random() * 3,
      opacity: 0.4 + Math.random() * 0.5,
    }));
  }, []);

  // Generate spiral particles being consumed - slow descent into the void
  const spiralParticles = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      startRadius: 120 + Math.random() * 140,
      duration: 20 + Math.random() * 20, // Slower: 20-40 seconds to spiral in
      delay: Math.random() * -30,
      size: 1.5 + Math.random() * 2,
    }));
  }, []);

  return (
    <div
      className={`fixed inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{ zIndex: 0 }}
    >
      {/* Deep space background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(
              ellipse at 50% 50%,
              rgba(10, 10, 10, 0.2) 0%,
              rgba(5, 5, 5, 0.5) 30%,
              rgba(3, 3, 3, 0.85) 50%,
              rgba(2, 2, 2, 1) 100%
            )
          `,
        }}
      />

      {/* Black hole container - centered */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          transform: "translate(-50%, -50%)",
        }}
      >
        {/* Outer gravitational distortion ring */}
        <div
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: "500px",
            height: "500px",
            transform: "translate(-50%, -50%)",
            background: `
              radial-gradient(
                circle,
                transparent 35%,
                rgba(255, 255, 255, 0.03) 45%,
                rgba(255, 255, 255, 0.08) 52%,
                rgba(255, 255, 255, 0.03) 60%,
                transparent 70%
              )
            `,
            animation: "gravitational-lensing 20s ease-in-out infinite",
          }}
        />

        {/* Accretion disk - outer ring */}
        <div
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: "380px",
            height: "380px",
            transform: "translate(-50%, -50%)",
            background: `
              conic-gradient(
                from 0deg,
                transparent 0deg,
                rgba(255, 255, 255, 0.15) 30deg,
                transparent 60deg,
                rgba(255, 255, 255, 0.1) 120deg,
                transparent 150deg,
                rgba(255, 255, 255, 0.18) 210deg,
                transparent 240deg,
                rgba(255, 255, 255, 0.12) 300deg,
                transparent 330deg,
                transparent 360deg
              )
            `,
            animation: "accretion-disk 60s linear infinite",
            filter: "blur(3px)",
          }}
        />

        {/* Accretion disk - middle ring */}
        <div
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: "280px",
            height: "280px",
            transform: "translate(-50%, -50%)",
            background: `
              conic-gradient(
                from 90deg,
                transparent 0deg,
                rgba(255, 255, 255, 0.2) 40deg,
                transparent 80deg,
                rgba(255, 255, 255, 0.15) 140deg,
                transparent 180deg,
                rgba(255, 255, 255, 0.22) 220deg,
                transparent 260deg,
                rgba(255, 255, 255, 0.18) 320deg,
                transparent 360deg
              )
            `,
            animation: "accretion-disk 45s linear infinite reverse",
            filter: "blur(2px)",
          }}
        />

        {/* Accretion disk - inner ring */}
        <div
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: "180px",
            height: "180px",
            transform: "translate(-50%, -50%)",
            background: `
              conic-gradient(
                from 180deg,
                transparent 0deg,
                rgba(255, 255, 255, 0.25) 45deg,
                transparent 90deg,
                rgba(255, 255, 255, 0.2) 135deg,
                transparent 180deg,
                rgba(255, 255, 255, 0.28) 225deg,
                transparent 270deg,
                rgba(255, 255, 255, 0.22) 315deg,
                transparent 360deg
              )
            `,
            animation: "accretion-disk 35s linear infinite",
            filter: "blur(1px)",
          }}
        />

        {/* Orbiting particles */}
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute left-1/2 top-1/2"
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              backgroundColor: `rgba(255, 255, 255, ${particle.opacity})`,
              borderRadius: "50%",
              boxShadow: `0 0 ${particle.size * 3}px rgba(255, 255, 255, ${particle.opacity * 0.6})`,
              animation: `particle-orbit ${particle.duration}s linear infinite`,
              animationDelay: `${particle.delay}s`,
              ["--orbit-radius" as string]: `${particle.orbitRadius}px`,
            }}
          />
        ))}

        {/* Spiral particles being consumed */}
        {spiralParticles.map((particle) => (
          <div
            key={`spiral-${particle.id}`}
            className="absolute left-1/2 top-1/2"
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              borderRadius: "50%",
              boxShadow: "0 0 8px rgba(255, 255, 255, 0.6)",
              animation: `spiral-inward ${particle.duration}s ease-in infinite`,
              animationDelay: `${particle.delay}s`,
              ["--start-radius" as string]: `${particle.startRadius}px`,
            }}
          />
        ))}

        {/* Event horizon glow */}
        <div
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: "120px",
            height: "120px",
            transform: "translate(-50%, -50%)",
            background: `
              radial-gradient(
                circle,
                transparent 25%,
                rgba(255, 255, 255, 0.08) 45%,
                rgba(255, 255, 255, 0.15) 55%,
                rgba(255, 255, 255, 0.08) 65%,
                transparent 80%
              )
            `,
            animation: "event-horizon-pulse 10s ease-in-out infinite",
          }}
        />

        {/* The void - absolute black center */}
        <div
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: "70px",
            height: "70px",
            transform: "translate(-50%, -50%)",
            backgroundColor: "#000",
            boxShadow: `
              inset 0 0 40px 15px rgba(0, 0, 0, 1),
              0 0 50px 15px rgba(0, 0, 0, 0.9),
              0 0 80px 30px rgba(0, 0, 0, 0.7)
            `,
          }}
        />

        {/* Photon sphere - light bending at critical radius */}
        <div
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: "95px",
            height: "95px",
            transform: "translate(-50%, -50%)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            boxShadow: `
              0 0 15px 3px rgba(255, 255, 255, 0.1),
              inset 0 0 15px 3px rgba(255, 255, 255, 0.05)
            `,
            animation: "black-hole-spin 90s linear infinite",
          }}
        />

        {/* Second photon ring */}
        <div
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: "110px",
            height: "110px",
            transform: "translate(-50%, -50%)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            animation: "black-hole-spin 120s linear infinite reverse",
          }}
        />
      </div>

      {/* Distant stars / space dust */}
      <div className="absolute inset-0">
        {Array.from({ length: 80 }).map((_, i) => (
          <div
            key={`star-${i}`}
            className="absolute rounded-full"
            style={{
              width: `${1 + Math.random() * 2}px`,
              height: `${1 + Math.random() * 2}px`,
              backgroundColor: `rgba(255, 255, 255, ${0.2 + Math.random() * 0.5})`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `void-pulse ${4 + Math.random() * 6}s ease-in-out infinite`,
              animationDelay: `${Math.random() * -5}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
