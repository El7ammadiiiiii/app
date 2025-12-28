"use client";

import { useRef, useEffect, memo } from "react";
import * as THREE from "three";
import { useTheme } from "next-themes";

// Crypto symbols and colors
const CRYPTO_SYMBOLS = ["₿", "Ξ", "₳", "◈", "Ð", "Ł", "M", "B", "⚡", "$"];
const SYMBOL_COLORS = [
  "#00FFFF", "#FFA500", "#A020F0", "#DAA520", "#FF4500",
  "#7D0552", "#B0C4DE", "#0FA958", "#C0392B", "#778899"
];

// Infinity curve class for the logo
class InfinityCurve extends THREE.Curve<THREE.Vector3> {
  scale: number;
  
  constructor(scale = 10) {
    super();
    this.scale = scale;
  }
  
  getPoint(t: number, optionalTarget = new THREE.Vector3()) {
    const a = this.scale;
    const t2 = t * Math.PI * 2;
    const den = 1 + Math.sin(t2) ** 2;
    const x = (a * Math.cos(t2)) / den;
    const y = (a * Math.sin(t2) * Math.cos(t2)) / den;
    const z = Math.sin(t2 * 2) * 3.5;
    return optionalTarget.set(x, y, z);
  }
}

// Helper to create text texture
function createTextTexture(text: string, colorStr: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.font = "bold 48px monospace";
  ctx.fillStyle = colorStr;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 32, 32);
  return new THREE.CanvasTexture(canvas);
}

interface AnimatableSymbol {
  mesh: THREE.Sprite;
  type: "fall";
  speed: number;
  yReset: number;
  yLimit: number;
}

interface CryptoBackgroundProps {
  opacity?: number;
  className?: string;
}

function CryptoBackgroundComponent({ opacity = 0.06, className = "" }: CryptoBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = null; // شفاف لإظهار التدرج اللوني

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 70);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendererRef.current = renderer;
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.CineonToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Main group
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // Animatable symbols array
    const animatables: AnimatableSymbol[] = [];

    // Create infinity curve logo
    const infinityCurve = new InfinityCurve(15);
    const tubeGeometry = new THREE.TubeGeometry(infinityCurve, 100, 1.5, 16, true);
    const tubeMaterial = new THREE.MeshNormalMaterial({ 
      wireframe: true,
      opacity: 0.25,
      transparent: true
    });
    const tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
    mainGroup.add(tubeMesh);

    // Create falling crypto symbols
    const rnd = (min: number, max: number) => Math.random() * (max - min) + min;
    
    for (let i = 0; i < 150; i++) {
      const sym = CRYPTO_SYMBOLS[Math.floor(Math.random() * CRYPTO_SYMBOLS.length)];
      const colStr = SYMBOL_COLORS[Math.floor(Math.random() * SYMBOL_COLORS.length)];
      const mat = new THREE.SpriteMaterial({
        map: createTextTexture(sym, colStr),
        transparent: true,
        opacity: 0.6
      });
      const sprite = new THREE.Sprite(mat);
      
      sprite.position.set(rnd(-40, 40), rnd(-30, 30), rnd(-20, 20));
      sprite.scale.set(1.5, 1.5, 1);
      
      animatables.push({
        mesh: sprite,
        type: "fall",
        speed: rnd(0.003, 0.01),
        yReset: 35,
        yLimit: -35
      });
      mainGroup.add(sprite);
    }

    // Lights
    const light1 = new THREE.PointLight(0xb8860b, 80, 100);
    light1.position.set(20, 20, 20);
    scene.add(light1);

    const light2 = new THREE.PointLight(0xb8860b, 40, 100);
    light2.position.set(-20, -20, 10);
    scene.add(light2);

    scene.add(new THREE.AmbientLight(0x404040, 0.1));

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      
      // Rotate main group slowly
      mainGroup.rotation.y += 0.001;
      
      // Animate falling symbols
      animatables.forEach(o => {
        o.mesh.position.y -= o.speed;
        if (o.mesh.position.y < o.yLimit) {
          o.mesh.position.y = o.yReset;
          o.mesh.position.x = rnd(-40, 40);
        }
      });
      
      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(frameRef.current);
      
      // Dispose geometries and materials
      mainGroup.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(m => m.dispose());
          } else {
            object.material?.dispose();
          }
        }
        if (object instanceof THREE.Sprite) {
          object.material?.map?.dispose();
          object.material?.dispose();
        }
      });
      
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [resolvedTheme]);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 -z-10 ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    />
  );
}

export const CryptoBackground = memo(CryptoBackgroundComponent);
