"use client";

import { useState, useEffect, useCallback } from "react";

interface GameState {
  gridSize: number;
  tiles: string[];
  targetIndex: number;
  score: number;
  highScore: number; // <--- INI DIA HIGH SCORE SEMENTARA
  combo: number;
  level: number;
  isPlaying: boolean;
  message: string;
}

const ColorMatchGame = () => {
  const [game, setGame] = useState<GameState>({
    gridSize: 2,
    tiles: [],
    targetIndex: -1,
    score: 0,
    highScore: 0, // Awalnya 0
    combo: 0,
    level: 1,
    isPlaying: true,
    message: "Cari warna yang beda!",
  });

  // Generate warna acak dalam format HSL
  const generateRandomColor = () => {
    const h = Math.floor(Math.random() * 360);
    const s = 50 + Math.floor(Math.random() * 30);
    const l = 40 + Math.floor(Math.random() * 30);
    return { h, s, l };
  };

  // Generate grid baru
  const generateGrid = useCallback((level: number) => {
    const size = Math.min(2 + Math.floor((level - 1) / 3), 5);
    const total = size * size;

    const base = generateRandomColor();
    const diff = Math.max(18 - level * 0.5, 5);
    const offset = Math.floor(Math.random() * 2) === 0 ? diff : -diff;

    let targetH = base.h + offset;
    if (targetH < 0) targetH += 360;
    if (targetH >= 360) targetH -= 360;

    const targetColor = {
      h: targetH,
      s: base.s + (Math.random() > 0.5 ? 5 : -5),
      l: base.l + (Math.random() > 0.5 ? 5 : -5),
    };

    const clamp = (v: number, min: number, max: number) =>
      Math.max(min, Math.min(max, v));
    targetColor.s = clamp(targetColor.s, 30, 85);
    targetColor.l = clamp(targetColor.l, 30, 80);

    const tiles: string[] = [];
    const targetIdx = Math.floor(Math.random() * total);

    for (let i = 0; i < total; i++) {
      if (i === targetIdx) {
        tiles.push(
          `hsl(${Math.round(targetColor.h)}, ${Math.round(targetColor.s)}%, ${Math.round(targetColor.l)}%)`
        );
      } else {
        tiles.push(
          `hsl(${Math.round(base.h)}, ${Math.round(base.s)}%, ${Math.round(base.l)}%)`
        );
      }
    }

    setGame((prev) => ({
      ...prev,
      gridSize: size,
      tiles,
      targetIndex: targetIdx,
      isPlaying: true,
      message: `Level ${level} — Cari yang beda!`,
    }));
  }, []);

  // Handle klik tile
  const handleTileClick = (index: number) => {
    if (!game.isPlaying) return;

    if (index === game.targetIndex) {
      // BENAR
      const newCombo = game.combo + 1;
      const bonus = Math.floor(newCombo / 5) + 1;
      const newScore = game.score + 10 * bonus;

      // 🔥 UPDATE HIGH SCORE (SEMENTARA)
      const newHighScore = Math.max(game.highScore, newScore);

      setGame((prev) => ({
        ...prev,
        score: newScore,
        highScore: newHighScore, // Simpan high score terbaru
        combo: newCombo,
        message: `🎉 Benar! Combo x${newCombo}`,
      }));

      // Naik level setiap 3 jawaban benar
      if (game.level % 3 === 0) {
        setGame((prev) => ({
          ...prev,
          level: prev.level + 1,
        }));
        setTimeout(() => generateGrid(game.level + 1), 300);
      } else {
        setTimeout(() => generateGrid(game.level), 300);
      }
    } else {
      // SALAH
      setGame((prev) => ({
        ...prev,
        combo: 0,
        isPlaying: false,
        message: `❌ Salah! Coba lagi.`,
      }));

      setTimeout(() => {
        setGame((prev) => ({
          ...prev,
          isPlaying: true,
          message: `Level ${prev.level} — Coba lagi!`,
        }));
        generateGrid(game.level);
      }, 1000);
    }
  };

  // Reset game (tombol "Mulai Ulang")
  const resetGame = () => {
    setGame({
      gridSize: 2,
      tiles: [],
      targetIndex: -1,
      score: 0,
      highScore: 0, // HIGH SCORE RESET SAAT RESET MANUAL
      combo: 0,
      level: 1,
      isPlaying: true,
      message: "Game direset!",
    });
    generateGrid(1);
  };

  // Init game pertama kali
  useEffect(() => {
    generateGrid(1);
  }, [generateGrid]);

  const getTileSize = () => {
    const baseSize = 80;
    const maxSize = 120;
    const minSize = 50;
    const size = baseSize - (game.gridSize - 2) * 8;
    return Math.max(minSize, Math.min(maxSize, size));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-2xl shadow-xl">
      {/* Header */}
      <div className="w-full max-w-md mb-4 text-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
          🎯 Cari Warna Beda
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Sembari menunggu maintenance selesai...
        </p>
      </div>

      {/* Scoreboard */}
      <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md mb-4 p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl backdrop-blur">
        {/* SKOR */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            🏆 Skor:
          </span>
          <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
            {game.score}
          </span>
        </div>

        {/* 🔥 HIGH SCORE (SEMENTARA) - RESET KALAU REFRESH/TUTUP */}
        <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-full border border-yellow-300 dark:border-yellow-700">
          <span className="text-sm font-bold text-yellow-700 dark:text-yellow-400">
            ⭐ High:
          </span>
          <span className="text-lg font-bold text-yellow-600 dark:text-yellow-300">
            {game.highScore}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            🔥 Combo:
          </span>
          <span className="text-lg font-bold text-orange-500 dark:text-orange-400">
            x{game.combo}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            📊 Level:
          </span>
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {game.level}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            📐 Grid:
          </span>
          <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
            {game.gridSize}×{game.gridSize}
          </span>
        </div>
      </div>

      {/* Pesan Status */}
      <div className="w-full max-w-md text-center mb-4 min-h-[2rem]">
        <p
          className={`text-lg font-medium ${
            game.message.includes("Benar")
              ? "text-emerald-600 dark:text-emerald-400"
              : game.message.includes("Salah")
              ? "text-red-600 dark:text-red-400"
              : "text-slate-600 dark:text-slate-300"
          }`}
        >
          {game.message}
        </p>
      </div>

      {/* Grid Warna */}
      <div
        className="grid gap-2 p-4 bg-white/30 dark:bg-slate-800/30 rounded-xl"
        style={{
          gridTemplateColumns: `repeat(${game.gridSize}, 1fr)`,
          width: "fit-content",
        }}
      >
        {game.tiles.map((color, index) => (
          <button
            key={index}
            className="rounded-lg transition-all duration-150 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            style={{
              backgroundColor: color,
              width: getTileSize(),
              height: getTileSize(),
              cursor: game.isPlaying ? "pointer" : "default",
              opacity: game.isPlaying ? 1 : 0.6,
            }}
            onClick={() => handleTileClick(index)}
            disabled={!game.isPlaying}
            aria-label={`Tile ${index + 1}`}
          />
        ))}
      </div>

      {/* Tombol Reset */}
      <button
        onClick={resetGame}
        className="mt-6 px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-full transition-colors shadow-md hover:shadow-lg"
      >
        🔄 Mulai Ulang
      </button>

      <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
        ⚡ High Score hanya bertahan selama halaman ini terbuka.
      </p>
    </div>
  );
};

export default ColorMatchGame;