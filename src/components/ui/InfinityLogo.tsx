/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * INFINITY LOGO - Three.js Animated Component
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * لوجو Infinity متحرك بألوان CCWAYS - المكون الموحد للتطبيق
 * يُستخدم في: رسائل AI، نظام Thinking، نظام search&think
 * 
 * @version 2.0.0
 */

'use client';

import { useEffect, useRef, useState, memo } from 'react';
import * as THREE from 'three';

interface InfinityLogoProps
{
  size?: number;          // حجم اللوجو (default: 32)
  speed?: number;         // سرعة الدوران (default: 0.012)
  className?: string;
  isAnimating?: boolean;  // هل يتحرك (default: true)
}

// ═══════════════════════════════════════════════════════════════════════════════
// INFINITY CURVE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class InfinityCurve extends THREE.Curve<THREE.Vector3>
{
  constructor ()
  {
    super();
  }

  getPoint ( t: number, optionalTarget = new THREE.Vector3() ): THREE.Vector3
  {
    const tx = Math.cos( 2 * Math.PI * t ) * 15;
    const ty = Math.sin( 4 * Math.PI * t ) * 7;
    const tz = Math.sin( 2 * Math.PI * t ) * 5;
    return optionalTarget.set( tx, ty, tz );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const InfinityLogo = memo( function InfinityLogo ( {
  size = 32,
  speed = 0.012,
  className = '',
  isAnimating = true,
}: InfinityLogoProps )
{
  const containerRef = useRef<HTMLDivElement>( null );
  const rendererRef = useRef<THREE.WebGLRenderer | null>( null );
  const sceneRef = useRef<THREE.Scene | null>( null );
  const cameraRef = useRef<THREE.PerspectiveCamera | null>( null );
  const groupRef = useRef<THREE.Group | null>( null );
  const frameRef = useRef<number>( 0 );
  const [ mounted, setMounted ] = useState( false );
  const sizeClass = `infinity-logo-size-${ size }`;
  const innerSize = Math.round( size * 0.6 );
  const innerClass = `infinity-logo-inner-${ innerSize }`;

  // Hydration fix
  useEffect( () =>
  {
    setMounted( true );
  }, [] );

  useEffect( () =>
  {
    if ( !mounted || !containerRef.current ) return;

    // ═══════════════════════════════════════════════════════════════════════
    // SCENE SETUP
    // ═══════════════════════════════════════════════════════════════════════

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera( 45, 1, 0.1, 1000 );
    camera.position.z = 75;
    cameraRef.current = camera;

    // Renderer with transparency
    const renderer = new THREE.WebGLRenderer( {
      antialias: true,
      alpha: true,
      powerPreference: 'low-power',
    } );
    renderer.setClearColor( 0x000000, 0 );
    renderer.setSize( size, size );
    renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );
    rendererRef.current = renderer;

    containerRef.current.appendChild( renderer.domElement );

    // ═══════════════════════════════════════════════════════════════════════
    // LIGHTING
    // ═══════════════════════════════════════════════════════════════════════

    const ambientLight = new THREE.AmbientLight( 0xffffff, 1.2 );
    scene.add( ambientLight );

    const pointLight = new THREE.PointLight( 0xffffff, 150 );
    pointLight.position.set( 20, 20, 30 );
    scene.add( pointLight );

    // ═══════════════════════════════════════════════════════════════════════
    // INFINITY WIRES
    // ═══════════════════════════════════════════════════════════════════════

    const mainGroup = new THREE.Group();
    groupRef.current = mainGroup;
    scene.add( mainGroup );

    // CCWAYS Colors
    const colors = {
      snow: 0xF0FAFF,      // Snow White
      teal: 0x004D4D,      // Dark Teal
      turquoise: 0x40E0D0, // Turquoise
    };

    const createWire = (
      color: number,
      offset: number,
      scale: number,
      opacity: number
    ): THREE.Mesh =>
    {
      const curve = new InfinityCurve();
      const geometry = new THREE.TubeGeometry( curve, 100, 0.45, 8, true );
      const material = new THREE.MeshStandardMaterial( {
        color,
        wireframe: true,
        transparent: true,
        opacity,
        emissive: color,
        emissiveIntensity: 0.8,
      } );
      const mesh = new THREE.Mesh( geometry, material );
      mesh.rotation.y = offset;
      mesh.scale.set( scale, scale, scale );
      return mesh;
    };

    const wireSnow = createWire( colors.snow, 0, 1, 0.95 );
    const wireTeal = createWire( colors.teal, Math.PI / 4, 1.05, 0.85 );
    const wireTurq = createWire( colors.turquoise, -Math.PI / 4, 0.95, 0.9 );

    mainGroup.add( wireSnow );
    mainGroup.add( wireTeal );
    mainGroup.add( wireTurq );

    // ═══════════════════════════════════════════════════════════════════════
    // ANIMATION LOOP
    // ═══════════════════════════════════════════════════════════════════════

    const animate = () =>
    {
      frameRef.current = requestAnimationFrame( animate );

      if ( isAnimating && mainGroup )
      {
        // دوران أفقي فقط (حول المحور Y)
        mainGroup.rotation.y += speed;

        // نبض الضوء البسيط
        const time = Date.now() * 0.001;
        ( wireSnow.material as THREE.MeshStandardMaterial ).emissiveIntensity =
          0.7 + Math.sin( time * 2 ) * 0.2;
      }

      renderer.render( scene, camera );
    };

    animate();

    // ═══════════════════════════════════════════════════════════════════════
    // CLEANUP
    // ═══════════════════════════════════════════════════════════════════════

    return () =>
    {
      cancelAnimationFrame( frameRef.current );

      if ( rendererRef.current && containerRef.current )
      {
        containerRef.current.removeChild( rendererRef.current.domElement );
      }

      // Dispose resources
      renderer.dispose();
      [ wireSnow, wireTeal, wireTurq ].forEach( ( wire ) =>
      {
        wire.geometry.dispose();
        ( wire.material as THREE.Material ).dispose();
      } );
    };
  }, [ mounted, size, speed, isAnimating ] );

  // Handle size changes
  useEffect( () =>
  {
    if ( rendererRef.current )
    {
      rendererRef.current.setSize( size, size );
    }
  }, [ size ] );

  if ( !mounted )
  {
    // SSR placeholder
    return (
      <div className={ `flex items-center justify-center ${ sizeClass } ${ className } leading-none` }>
        <style>{ `.${ sizeClass }{width:${ size }px;height:${ size }px;} .${ innerClass }{width:${ innerSize }px;height:${ innerSize }px;}` }</style>
        <div className={ `rounded-full bg-gradient-to-br from-cyan-400/20 to-teal-600/20 animate-pulse ${ innerClass }` } />
      </div>
    );
  }

  return (
    <div className={ `inline-block ${ sizeClass } ${ className } leading-none` }>
      <style>{ `.${ sizeClass }{width:${ size }px;height:${ size }px;}` }</style>
      <div ref={ containerRef } className="w-full h-full" />
    </div>
  );
} );

export default InfinityLogo;
