"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function NotFound() {
  
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        setMousePos({
          x: (e.clientX - window.innerWidth / 2) / -20,
          y: (e.clientY - window.innerHeight / 2) / -20,
        });
      };
      window.addEventListener("mousemove", handleMouseMove);
      return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);
    
    return (
      <main className="relative w-full h-screen overflow-hidden bg-[#F9FAFB] cursor-default select-none">
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#D1D5DB 1.5px, transparent 1.5px)",
            backgroundSize: "24px 24px",
            transform: `translate(${mousePos.x}px, ${mousePos.y}px)`,
            willChange: "transform",
          }}
        />

        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            transform: `translate(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px)`,
          }}
        >
          <div className="absolute top-[20%] left-[15%] w-40 h-40 bg-[#FEF3C7] shadow-sm rotate-[-6deg] p-4 flex items-center justify-center text-center font-handwriting text-gray-700 text-sm">
            <span className="font-medium font-sans">
              Кто-то удалил этот слайд? 🤔
            </span>
          </div>
          <svg
            className="absolute top-[35%] left-[22%] w-24 h-24 text-gray-300 rotate-12"
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M10,10 Q50,50 90,90" strokeDasharray="5,5" />
            <path d="M80,80 L90,90 L75,95" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center h-full w-full px-4">
          <div className="relative group mb-12">
            <div className="absolute -inset-6 border-2 border-nova-blue rounded-lg opacity-100 pointer-events-none transition-all duration-300">
              <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-nova-blue rounded-full" />
              <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-nova-blue rounded-full" />
              <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-nova-blue rounded-full" />
              <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-nova-blue rounded-full" />
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-nova-blue text-white text-[10px] px-2 py-0.5 rounded-full font-mono">
                404 x 404 px
              </div>
            </div>

            <h1 className="text-[120px] sm:text-[180px] font-black leading-none text-gray-900 tracking-tighter">
              404
            </h1>

            <div className="absolute -right-12 top-1/2 w-32 animate-pulse pointer-events-none">
              <svg
                className="w-8 h-8 text-pink-500 fill-current drop-shadow-md"
                viewBox="0 0 24 24"
              >
                <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19169L17.4741 12.3673H5.65376Z" />
              </svg>
              <div className="ml-4 -mt-2 bg-pink-500 text-white text-xs px-2 py-1 rounded-md font-bold whitespace-nowrap">
                System Admin
              </div>
            </div>
          </div>

          <div className="text-center max-w-md relative">
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Холст пуст</h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Страница, которую вы ищете, была перемещена или удалена с доски.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link
                href="/"
                className="px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 hover:-translate-y-0.5 transition-all shadow-lg shadow-gray-900/10"
              >
                Вернуться на главную
              </Link>
              <button
                onClick={() => window.history.back()}
                className="px-6 py-3 bg-white text-gray-700 border border-gray-200 font-medium rounded-lg hover:bg-gray-50 transition-all"
              >
                Назад
              </button>
            </div>
          </div>
        </div>
      </main>
    );
}
