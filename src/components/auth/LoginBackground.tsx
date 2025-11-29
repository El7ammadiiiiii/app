"use client";

import { useEffect, useRef } from "react";

type ThreeModule = typeof import("three");
type WebGLRendererInstance = InstanceType<ThreeModule["WebGLRenderer"]>;
type Vector3Instance = InstanceType<ThreeModule["Vector3"]>;
type SpriteInstance = InstanceType<ThreeModule["Sprite"]>;

type CleanupFn = () => void;

export const LoginBackground = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let renderer: WebGLRendererInstance | null = null;
    let composer: any;
    let controls: any;
    let frameId: number;
    let cleanupScene: CleanupFn | undefined;

    const init = async () => {
      const THREE: ThreeModule = await import("three");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
      const { EffectComposer } = await import("three/examples/jsm/postprocessing/EffectComposer.js");
      const { RenderPass } = await import("three/examples/jsm/postprocessing/RenderPass.js");
      const { UnrealBloomPass } = await import("three/examples/jsm/postprocessing/UnrealBloomPass.js");

      if (!containerRef.current) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.set(0, 0, 70);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }) as WebGLRendererInstance;
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.toneMapping = THREE.CineonToneMapping;
      renderer.toneMappingExposure = 1.2;
      containerRef.current.appendChild(renderer.domElement);

      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
      bloom.strength = 0.8;
      bloom.radius = 0.5;
      composer.addPass(bloom);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.6;

      const { Curve } = THREE;
      class InfinityCurve extends Curve<Vector3Instance> {
        constructor(private readonly size = 15) {
          super();
        }
        getPoint(t: number, optionalTarget = new THREE.Vector3() as Vector3Instance) {
          const angle = t * Math.PI * 2;
          const denominator = 1 + Math.sin(angle) ** 2;
          const x = (this.size * Math.cos(angle)) / denominator;
          const y = (this.size * Math.sin(angle) * Math.cos(angle)) / denominator;
          const z = Math.sin(angle * 2) * 3.5;
          return optionalTarget.set(x, y, z);
        }
      }

      const tubeGeometry = new THREE.TubeGeometry(new InfinityCurve(15), 100, 1.5, 16, true);
      const tubeMaterial = new THREE.MeshNormalMaterial({ wireframe: true });
      const tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
      scene.add(tubeMesh);

      const symbols = ["₿", "Ξ", "₳", "◈", "Ð", "Ł", "M", "B", "⚡", "$"];
      const colors = ["#00FFFF", "#FFA500", "#A020F0", "#DAA520", "#FF4500", "#7D0552", "#B0C4DE", "#0FA958", "#C0392B", "#778899"];

      const createTextTexture = (text: string, shade: string) => {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.font = "bold 48px monospace";
        ctx.fillStyle = shade;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, 32, 32);
        return new THREE.CanvasTexture(canvas);
      };

      type Animatable = { sprite: SpriteInstance; speed: number; resetY: number; limitY: number };
      const animatables: Animatable[] = [];

      for (let i = 0; i < 200; i += 1) {
        const symbol = symbols[Math.floor(Math.random() * symbols.length)];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const texture = createTextTexture(symbol, color);
        if (!texture) continue;
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material) as SpriteInstance;
        sprite.position.set((Math.random() - 0.5) * 60, Math.random() * 60, (Math.random() - 0.5) * 40);
        sprite.scale.set(1.5, 1.5, 1);
        scene.add(sprite);
        animatables.push({ sprite, speed: Math.random() * 0.02 + 0.005, resetY: 30, limitY: -30 });
      }

      const pointLightA = new THREE.PointLight(0xb8860b, 80, 100);
      pointLightA.position.set(20, 20, 20);
      const pointLightB = new THREE.PointLight(0x7d0552, 40, 100);
      pointLightB.position.set(-20, -20, 10);
      scene.add(pointLightA, pointLightB, new THREE.AmbientLight(0x404040, 0.4));

      const animate = () => {
        frameId = requestAnimationFrame(animate);
        tubeMesh.rotation.y += 0.002;
        controls.update();
        animatables.forEach((item) => {
          item.sprite.position.y -= item.speed;
          if (item.sprite.position.y < item.limitY) {
            item.sprite.position.y = item.resetY;
            item.sprite.position.x = (Math.random() - 0.5) * 60;
          }
        });
        composer.render();
      };

      const onResize = () => {
        if (!renderer) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
      };

      window.addEventListener("resize", onResize);
      animate();

      cleanupScene = () => {
        cancelAnimationFrame(frameId);
        window.removeEventListener("resize", onResize);
        controls?.dispose?.();
        tubeGeometry.dispose();
        tubeMaterial.dispose();
        animatables.forEach(({ sprite }) => {
          sprite.material?.dispose?.();
          sprite.material?.map?.dispose?.();
        });
        renderer?.dispose();
        if (renderer?.domElement && containerRef.current?.contains(renderer.domElement)) {
          containerRef.current.removeChild(renderer.domElement);
        }
      };
    };

    init();

    return () => {
      cancelAnimationFrame(frameId ?? 0);
      cleanupScene?.();
      renderer?.dispose();
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0" aria-hidden />;
};
