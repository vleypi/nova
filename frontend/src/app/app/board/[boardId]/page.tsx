"use client";
import { useState } from "react";
import {
  useBoardPage,
  BoardTopBar,
  BoardToolbar,
  SelectionOverlay,
  RemoteCursors,
  AiChatWidget,
  SelectionToolbar,
  OnlineUsersWidget,
  ZoomWidget,
  ConnectionStatusWidget,
  BoardAccessError,
  BoardSplashScreen,
} from "@/features/board";

// Страница доски
export default function BoardPage() {
  const {
    boardId,
    containerRef,
    canvasRef,
    cameraRef,
    engine,
    activeTool,
    setActiveTool,
    activePenTool,
    setActivePenTool,
    activeStickyColor,
    setActiveStickyColor,
    activeShapeKind,
    setActiveShapeKind,
    selectionBox,
    onlineUsers,
    cursors,
    zoom,
    onZoomIn,
    onZoomOut,
    connectionStatus,
    boardError,
    boardReady,
    onUndo,
    onRedo,
  } = useBoardPage();
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden select-none"
        style={{
          touchAction: "none",
          backgroundColor: "#f5f5f5",
        }}
      />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      <SelectionOverlay box={selectionBox} />
      <RemoteCursors cursors={cursors} cameraRef={cameraRef} />
      <BoardTopBar boardId={boardId} />
      <OnlineUsersWidget users={onlineUsers} />
      <BoardToolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        activePenTool={activePenTool}
        setActivePenTool={setActivePenTool}
        activeStickyColor={activeStickyColor}
        setActiveStickyColor={setActiveStickyColor}
        activeShapeKind={activeShapeKind}
        setActiveShapeKind={setActiveShapeKind}
        onAiClick={() => setIsAiChatOpen((prev) => !prev)}
        onUndo={onUndo}
        onRedo={onRedo}
      />
      {engine && (
        <>
          <SelectionToolbar
            engine={engine}
            onOpenAiChat={() => setIsAiChatOpen(true)}
          />
          <AiChatWidget
            isOpen={isAiChatOpen}
            onClose={() => setIsAiChatOpen(false)}
            boardId={boardId}
            cameraRef={cameraRef}
            engine={engine}
          />
        </>
      )}
      <ZoomWidget zoom={zoom} onZoomIn={onZoomIn} onZoomOut={onZoomOut} />
      <ConnectionStatusWidget status={connectionStatus} />
      {boardError && <BoardAccessError message={boardError} />}
      <BoardSplashScreen ready={boardReady} />
    </div>
  );
}
