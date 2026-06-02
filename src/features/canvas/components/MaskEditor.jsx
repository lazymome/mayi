import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Eraser, Undo2 } from "lucide-react";

import i18n from "../../../i18n";
import MaskVisualFeedback from "./MaskVisualFeedback";

const t = i18n.t.bind(i18n);

const getImageDimensions = (src) =>
  new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error("Missing image source"));
      return;
    }
    const img = new Image();
    img.onload = () =>
      resolve({
        w: img.naturalWidth || img.width,
        h: img.naturalHeight || img.height,
      });
    img.onerror = reject;
    img.src = src;
  });

const MaskEditor = ({
  nodeId,
  imageUrl,
  imageDimensions,
  isActive,
  onClose,
  onSave,
  theme,
  view,
  maskContent,
  onUpdateNode,
}) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const lastPointRef = useRef(null); // V3.7.27: 用于平滑绘制
  const [brushSize, setBrushSize] = useState(30);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const maxHistory = 10;
  const [resolvedDimensions, setResolvedDimensions] = useState(imageDimensions);

  useEffect(() => {
    if (imageDimensions?.w && imageDimensions?.h) {
      setResolvedDimensions(imageDimensions);
    }
  }, [imageDimensions]);

  useEffect(() => {
    if (!isActive || !imageUrl) return;
    if (imageDimensions?.w && imageDimensions?.h) return;
    let cancelled = false;
    getImageDimensions(imageUrl)
      .then((dims) => {
        if (cancelled) return;
        if (dims?.w && dims?.h) {
          setResolvedDimensions(dims);
          if (onUpdateNode) onUpdateNode(nodeId, { dimensions: dims });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isActive, imageUrl, imageDimensions, nodeId, onUpdateNode]);

  // 初始化 Canvas
  useEffect(() => {
    if (!isActive || !canvasRef.current || !resolvedDimensions) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctxRef.current = ctx;

    // 设置 Canvas 尺寸为图片原始分辨率
    canvas.width = resolvedDimensions.w;
    canvas.height = resolvedDimensions.h;

    // 清空画布（透明背景）
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 如果有保存的蒙版，恢复它
    if (maskContent) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        saveToHistory();
      };
      img.src = maskContent;
    } else {
      saveToHistory();
    }
  }, [isActive, resolvedDimensions, nodeId, maskContent]);

  // 保存当前状态到历史记录
  const saveToHistory = () => {
    if (!canvasRef.current || !ctxRef.current) return;
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(imageData);
    if (newHistory.length > maxHistory) {
      newHistory.shift();
    }
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // 获取鼠标在 Canvas 上的真实像素坐标
  const getCanvasCoordinates = (e) => {
    if (!canvasRef.current) return null;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // 使用 getBoundingClientRect 获取 Canvas 在视口中的绝对位置
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 计算缩放比例（图片原始尺寸 / DOM 显示尺寸）
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // 映射回真实像素坐标
    return {
      x: Math.round(x * scaleX),
      y: Math.round(y * scaleY),
    };
  };

  // 绘制函数 V3.7.27: 使用 lineTo 实现平滑绘制
  const draw = (e) => {
    if (!isDrawing || !canvasRef.current || !ctxRef.current) return;
    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    const ctx = ctxRef.current;
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "#FFFFFF";
    ctx.fillStyle = "#FFFFFF";
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (lastPointRef.current) {
      // 连接到上一个点
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else {
      // 第一个点：画一个圆
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    lastPointRef.current = coords;
  };

  // 鼠标事件处理
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // 只处理左键
    e.preventDefault();
    e.stopPropagation();
    lastPointRef.current = null; // V3.7.27: 重置上一个点
    setIsDrawing(true);
    saveToHistory();
    draw(e);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    e.stopPropagation();
    draw(e);
  };

  const handleMouseUp = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDrawing(false);
    lastPointRef.current = null; // V3.7.27: 清除上一个点
    saveToHistory();
  };

  // 撤销
  const handleUndo = () => {
    if (historyIndex <= 0 || !canvasRef.current || !ctxRef.current) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    const ctx = ctxRef.current;
    ctx.putImageData(history[newIndex], 0, 0);
  };

  // 清空
  const handleClear = () => {
    if (!canvasRef.current || !ctxRef.current) return;
    const ctx = ctxRef.current;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    saveToHistory();
  };

  // 保存蒙版
  const handleSave = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const maskDataUrl = canvas.toDataURL("image/png");

    // 更新节点状态
    if (onUpdateNode) {
      onUpdateNode(nodeId, { maskContent: maskDataUrl, isMasking: false });
    }

    if (onSave) onSave(maskDataUrl);
    if (onClose) onClose();
  };

  // 键盘快捷键：Ctrl+Z 撤销
  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, historyIndex, history]);

  if (!isActive || !imageUrl || !resolvedDimensions) return null;

  return (
    <>
      <div
        className="absolute inset-0 z-50 pointer-events-auto"
        style={{
          mixBlendMode: "normal",
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseMove={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        {/* Canvas 层：用于绘制蒙版 */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{
            opacity: 0.5,
            mixBlendMode: "multiply",
            cursor: "crosshair",
            pointerEvents: "auto",
            imageRendering: "auto",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {/* 视觉反馈层：半透明红色覆盖 - 使用 Canvas 作为 mask */}
        <MaskVisualFeedback canvasRef={canvasRef} isDrawing={isDrawing} />
      </div>

      {/* 工具栏 - 使用 Portal 固定到 Body，避免被 Canvas Transform 影响 */}
      {createPortal(
        <div
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 flex flex-row items-center gap-4 p-2 rounded-full border backdrop-blur-md shadow-xl z-[9999] ${
            theme === "dark"
              ? "bg-zinc-900/90 border-zinc-700 text-zinc-200"
              : "bg-white/90 border-zinc-300 text-zinc-800"
          }`}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* 笔刷粗细 */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium whitespace-nowrap">
              笔刷
            </span>
            <input
              type="range"
              min="10"
              max="150"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-20"
              onMouseDown={(e) => e.stopPropagation()}
            />
            <span className="text-[10px] w-8 text-right whitespace-nowrap">
              {brushSize}px
            </span>
          </div>

          {/* 按钮组 */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className={`p-1.5 rounded-full transition-colors ${
                theme === "dark"
                  ? "hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  : "hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
              }`}
              title={t("撤销 (Ctrl+Z)")}
            >
              <Undo2 size={14} />
            </button>
            <button
              onClick={handleClear}
              className={`p-1.5 rounded-full transition-colors ${
                theme === "dark" ? "hover:bg-zinc-800" : "hover:bg-zinc-100"
              }`}
              title={t("清空")}
            >
              <Eraser size={14} />
            </button>
            <button
              onClick={handleSave}
              className="p-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              title={t("保存/完成")}
            >
              <Check size={14} />
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default MaskEditor;
