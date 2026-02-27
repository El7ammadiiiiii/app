"use client";

import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

interface InfinityWireframesProps
{
  opacity?: number;
}

export function InfinityWireframes ( { opacity = 0.07 }: InfinityWireframesProps )
{
  const containerRef = useRef<HTMLDivElement>( null );
  const [ mounted, setMounted ] = useState( false );
  const opacityClass = `infinity-wireframes-opacity-${ Math.round( opacity * 1000 ) }`;

  useEffect( () =>
  {
    setMounted( true );
  }, [] );

  useEffect( () =>
  {
    if ( !mounted || !containerRef.current ) return;

    // Setup scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 0.1, 1000 );
    camera.position.z = 45;

    const renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
    renderer.setClearColor( 0x000000, 0 );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );
    containerRef.current.appendChild( renderer.domElement );

    // Lighting
    const ambientLight = new THREE.AmbientLight( 0xffffff, 0.5 );
    scene.add( ambientLight );

    const pointLight = new THREE.PointLight( 0xffffff, 100 );
    pointLight.position.set( 10, 10, 10 );
    scene.add( pointLight );

    const mainGroup = new THREE.Group();
    scene.add( mainGroup );

    const colors = [
      0xF0FAFF, // Snow White
      0x004D4D, // Dark Teal
      0x40E0D0  // Turquoise
    ];

    // Create infinity curve points
    const createInfinityCurvePoints = ( segments: number = 128 ): THREE.Vector3[] =>
    {
      const points: THREE.Vector3[] = [];
      for ( let i = 0; i <= segments; i++ )
      {
        const t = i / segments;
        const tx = Math.cos( 2 * Math.PI * t ) * 15;
        const ty = Math.sin( 4 * Math.PI * t ) * 7;
        const tz = Math.sin( 2 * Math.PI * t ) * 5;
        points.push( new THREE.Vector3( tx, ty, tz ) );
      }
      return points;
    };

    // Create wireframe tubes using CatmullRomCurve3
    const createWire = ( color: number, offset: number, scale: number, wireOpacity: number ) =>
    {
      const points = createInfinityCurvePoints( 128 );
      const curve = new THREE.CatmullRomCurve3( points, true );
      const geometry = new THREE.TubeGeometry( curve, 128, 0.6, 8, true );
      const material = new THREE.MeshStandardMaterial( {
        color: color,
        wireframe: true,
        transparent: true,
        opacity: wireOpacity,
        emissive: color,
        emissiveIntensity: 0.5
      } );
      const mesh = new THREE.Mesh( geometry, material );
      mesh.rotation.y = offset;
      mesh.scale.set( scale, scale, scale );
      return mesh;
    };

    const wireSnow = createWire( colors[ 0 ], 0, 1, 0.9 );
    const wireTeal = createWire( colors[ 1 ], Math.PI / 4, 1.05, 0.7 );
    const wireTurq = createWire( colors[ 2 ], -Math.PI / 4, 0.95, 0.8 );

    mainGroup.add( wireSnow );
    mainGroup.add( wireTeal );
    mainGroup.add( wireTurq );

    // Particles
    const particlesCount = 200;
    const pGeometry = new THREE.BufferGeometry();
    const pPositions = new Float32Array( particlesCount * 3 );
    for ( let i = 0; i < particlesCount * 3; i++ )
    {
      pPositions[ i ] = ( Math.random() - 0.5 ) * 60;
    }
    pGeometry.setAttribute( 'position', new THREE.BufferAttribute( pPositions, 3 ) );
    const pMaterial = new THREE.PointsMaterial( {
      size: 0.1,
      color: 0xF0FAFF,
      transparent: true,
      opacity: 0.5
    } );
    const particles = new THREE.Points( pGeometry, pMaterial );
    scene.add( particles );

    // Mouse interaction
    let mouseX = 0, mouseY = 0;
    const handleMouseMove = ( event: MouseEvent ) =>
    {
      mouseX = ( event.clientX / window.innerWidth ) - 0.5;
      mouseY = ( event.clientY / window.innerHeight ) - 0.5;
    };
    window.addEventListener( 'mousemove', handleMouseMove );

    // Animation loop
    let animationId: number;
    function animate ()
    {
      animationId = requestAnimationFrame( animate );

      mainGroup.rotation.y += 0.005;
      mainGroup.rotation.x += 0.002;

      // Pulsing emissive effect
      const time = Date.now() * 0.001;
      ( wireSnow.material as THREE.MeshStandardMaterial ).emissiveIntensity = 0.5 + Math.sin( time * 2 ) * 0.3;
      ( wireTurq.material as THREE.MeshStandardMaterial ).emissiveIntensity = 0.4 + Math.cos( time * 1.5 ) * 0.2;

      particles.rotation.y -= 0.001;

      // Mouse interaction
      mainGroup.rotation.y += mouseX * 0.005;
      mainGroup.rotation.x += mouseY * 0.005;

      renderer.render( scene, camera );
    }

    animate();

    // Handle resize
    const handleResize = () =>
    {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize( window.innerWidth, window.innerHeight );
    };
    window.addEventListener( 'resize', handleResize );

    // Cleanup
    return () =>
    {
      cancelAnimationFrame( animationId );
      window.removeEventListener( 'mousemove', handleMouseMove );
      window.removeEventListener( 'resize', handleResize );
      if ( containerRef.current && renderer.domElement )
      {
        containerRef.current.removeChild( renderer.domElement );
      }
      renderer.dispose();
      pGeometry.dispose();
      pMaterial.dispose();
    };
  }, [ mounted ] );

  if ( !mounted ) return null;

  return (
    <div className={ `fixed inset-0 pointer-events-none z-0 ${ opacityClass }` }>
      <style>{ `.${ opacityClass }{opacity:${ opacity };}` }</style>
      <div ref={ containerRef } className="w-full h-full" />
    </div>
  );
}
