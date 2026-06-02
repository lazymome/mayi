import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import * as THREE from "three";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const normalizeCamera = (camera = {}) => ({
  yaw: Number.isFinite(Number(camera.yaw)) ? Number(camera.yaw) : 0,
  pitch: Number.isFinite(Number(camera.pitch))
    ? clamp(Number(camera.pitch), -85, 85)
    : 0,
  fov: Number.isFinite(Number(camera.fov))
    ? clamp(Number(camera.fov), 20, 120)
    : 65,
});

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const applyCameraPose = (perspectiveCamera, camera) => {
  if (!perspectiveCamera) return;
  const normalized = normalizeCamera(camera);
  perspectiveCamera.fov = normalized.fov;
  perspectiveCamera.updateProjectionMatrix();

  const yaw = toRadians(normalized.yaw - 90);
  const pitch = toRadians(normalized.pitch);
  const target = new THREE.Vector3(
    Math.cos(pitch) * Math.cos(yaw),
    Math.sin(pitch),
    Math.cos(pitch) * Math.sin(yaw)
  );
  perspectiveCamera.lookAt(target);
};

const disposeObject = (object) => {
  if (!object) return;
  object.geometry?.dispose?.();
  const materials = Array.isArray(object.material)
    ? object.material
    : [object.material];
  materials.forEach((material) => {
    if (!material) return;
    material.map?.dispose?.();
    material.dispose?.();
  });
};

const PanoramaViewer = forwardRef(function PanoramaViewer(
  {
    imageUrl,
    camera,
    onCameraChange,
    className = "",
    placeholder = "上传或选择一张 2:1 单点全景图",
    label = "",
  },
  ref
) {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const meshRef = useRef(null);
  const cameraStateRef = useRef(normalizeCamera(camera));
  const dragRef = useRef(null);
  const renderRafRef = useRef(null);
  const emitRafRef = useRef(null);
  const pendingCameraRef = useRef(null);

  const render = () => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const perspectiveCamera = cameraRef.current;
    if (!renderer || !scene || !perspectiveCamera) return;
    applyCameraPose(perspectiveCamera, cameraStateRef.current);
    renderer.render(scene, perspectiveCamera);
  };

  const scheduleRender = () => {
    if (renderRafRef.current) return;
    renderRafRef.current = requestAnimationFrame(() => {
      renderRafRef.current = null;
      render();
    });
  };

  const scheduleCameraChange = (next) => {
    pendingCameraRef.current = next;
    if (emitRafRef.current) return;
    emitRafRef.current = requestAnimationFrame(() => {
      emitRafRef.current = null;
      if (pendingCameraRef.current) onCameraChange?.(pendingCameraRef.current);
    });
  };

  useEffect(() => {
    cameraStateRef.current = normalizeCamera(camera);
    render();
  }, [camera]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const scene = new THREE.Scene();
    const perspectiveCamera = new THREE.PerspectiveCamera(65, 16 / 9, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    sceneRef.current = scene;
    cameraRef.current = perspectiveCamera;
    rendererRef.current = renderer;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      renderer.setSize(width, height, false);
      perspectiveCamera.aspect = width / height;
      perspectiveCamera.updateProjectionMatrix();
      render();
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    return () => {
      if (renderRafRef.current) cancelAnimationFrame(renderRafRef.current);
      if (emitRafRef.current) cancelAnimationFrame(emitRafRef.current);
      resizeObserver.disconnect();
      disposeObject(meshRef.current);
      meshRef.current = null;
      renderer.dispose();
      renderer.domElement.remove();
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return undefined;
    if (meshRef.current) {
      scene.remove(meshRef.current);
      disposeObject(meshRef.current);
      meshRef.current = null;
    }
    if (!imageUrl) {
      render();
      return undefined;
    }

    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      imageUrl,
      (texture) => {
        if (cancelled) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        const geometry = new THREE.SphereGeometry(500, 32, 16);
        geometry.scale(-1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const mesh = new THREE.Mesh(geometry, material);
        meshRef.current = mesh;
        scene.add(mesh);
        render();
      },
      undefined,
      () => render()
    );

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  useImperativeHandle(ref, () => ({
    capture: async ({ width, height, camera: captureCamera } = {}) => {
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const perspectiveCamera = cameraRef.current;
      if (!renderer || !scene || !perspectiveCamera || !meshRef.current) {
        throw new Error("Three.js 全景预览尚未就绪");
      }

      const originalSize = new THREE.Vector2();
      renderer.getSize(originalSize);
      const originalAspect = perspectiveCamera.aspect;
      const nextWidth = Math.max(1, Math.round(width || originalSize.x));
      const nextHeight = Math.max(1, Math.round(height || originalSize.y));

      renderer.setSize(nextWidth, nextHeight, false);
      perspectiveCamera.aspect = nextWidth / nextHeight;
      cameraStateRef.current = normalizeCamera(captureCamera || cameraStateRef.current);
      applyCameraPose(perspectiveCamera, cameraStateRef.current);
      renderer.render(scene, perspectiveCamera);
      const dataUrl = renderer.domElement.toDataURL("image/png");

      renderer.setSize(originalSize.x, originalSize.y, false);
      perspectiveCamera.aspect = originalAspect;
      perspectiveCamera.updateProjectionMatrix();
      render();
      return dataUrl;
    },
  }));

  const emitCameraChange = (patch) => {
    const next = normalizeCamera({ ...cameraStateRef.current, ...patch });
    cameraStateRef.current = next;
    scheduleCameraChange(next);
    scheduleRender();
  };

  const handlePointerDown = (event) => {
    if (!imageUrl) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      yaw: cameraStateRef.current.yaw,
      pitch: cameraStateRef.current.pitch,
    };
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    emitCameraChange({
      yaw: drag.yaw - (event.clientX - drag.x) * 0.28,
      pitch: drag.pitch + (event.clientY - drag.y) * 0.22,
    });
  };

  const handlePointerUp = (event) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    event.stopPropagation();
    onCameraChange?.(cameraStateRef.current);
    dragRef.current = null;
  };

  const handleWheel = (event) => {
    if (!imageUrl) return;
    event.preventDefault();
    event.stopPropagation();
    emitCameraChange({ fov: cameraStateRef.current.fov + event.deltaY * 0.04 });
  };

  const handleKeyDown = (event) => {
    if (!imageUrl) return;

    const keyActions = {
      ArrowLeft: () => ({ yaw: cameraStateRef.current.yaw - 5 }),
      ArrowRight: () => ({ yaw: cameraStateRef.current.yaw + 5 }),
      ArrowUp: () => ({ pitch: cameraStateRef.current.pitch + 5 }),
      ArrowDown: () => ({ pitch: cameraStateRef.current.pitch - 5 }),
      '+': () => ({ fov: cameraStateRef.current.fov - 5 }),
      '=': () => ({ fov: cameraStateRef.current.fov - 5 }),
      '-': () => ({ fov: cameraStateRef.current.fov + 5 }),
      Home: () => ({ yaw: 0, pitch: 0, fov: 65 }),
    };

    const action = keyActions[event.key];
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    emitCameraChange(action());
    onCameraChange?.(cameraStateRef.current);
  };

  const currentCamera = normalizeCamera(cameraStateRef.current);
  const helperText = imageUrl
    ? "拖拽调整视角，滚轮调整焦距。键盘可用方向键调整视角，+/- 缩放，Home 重置。"
    : placeholder;

  return (
    <div
      className={`relative h-full w-full overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      tabIndex={imageUrl ? 0 : undefined}
      role={imageUrl ? "application" : undefined}
      aria-label={label ? `全景查看器：${label}` : "全景查看器"}
      aria-describedby="panorama-viewer-help"
      title={helperText}
    >
      <div ref={containerRef} className="absolute inset-0" />
      {!imageUrl && (
        <div className="absolute inset-0 flex items-center justify-center px-2 text-center text-[10px] text-zinc-500">
          {placeholder}
        </div>
      )}
      {imageUrl && (
        <>
          <div className="pointer-events-none absolute inset-3 border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.18)]" />
          <div className="pointer-events-none absolute left-1 bottom-1 rounded bg-black/60 px-1 py-0.5 text-[9px] text-white">
            yaw {Math.round(currentCamera.yaw)} / pitch {Math.round(currentCamera.pitch)} / fov {Math.round(currentCamera.fov)}
          </div>
          <div id="panorama-viewer-help" className="sr-only">
            {helperText}
          </div>
          {label && (
            <div className="pointer-events-none absolute right-1 top-1 rounded bg-black/55 px-1 py-0.5 text-[9px] text-white">
              {label}
            </div>
          )}
        </>
      )}
    </div>
  );
});

export default PanoramaViewer;
