"use client";

import { useState, useEffect, useCallback } from "react";

interface GameState {
  gridSize: number;
  tiles: string[];
  targetIndex: number;
  score: number;
  highScore: number;
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
    highScore: 0,
    combo: 0,
    level: 1,
    isPlaying: true,
    message: "Cari warna yang berbeda",
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
      message: `Level ${level} — Cari yang berbeda`,
    }));
  }, []);

  // Handle klik tile
  const handleTileClick = (index: number) => {
    if (!game.isPlaying) return;

    if (index === game.targetIndex) {
      const newCombo = game.combo + 1;
      const bonus = Math.floor(newCombo / 5) + 1;
      const newScore = game.score + 10 * bonus;
      const newHighScore = Math.max(game.highScore, newScore);

      setGame((prev) => ({
        ...prev,
        score: newScore,
        highScore: newHighScore,
        combo: newCombo,
        message: `Benar! Kombinasi x${newCombo}`,
      }));

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
      setGame((prev) => ({
        ...prev,
        combo: 0,
        isPlaying: false,
        message: "Salah, coba lagi",
      }));

      setTimeout(() => {
        setGame((prev) => ({
          ...prev,
          isPlaying: true,
          message: `Level ${prev.level} — Cari yang berbeda`,
        }));
        generateGrid(game.level);
      }, 1000);
    }
  };

  const resetGame = () => {
    setGame({
      gridSize: 2,
      tiles: [],
      targetIndex: -1,
      score: 0,
      highScore: 0,
      combo: 0,
      level: 1,
      isPlaying: true,
      message: "Game direset",
    });
    generateGrid(1);
  };

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
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="w-full max-w-md text-center mb-5">
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
          Cari Warna Beda
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Sembari menunggu maintenance selesai
        </p>
      </div>

      {/* Scoreboard - minimalis tanpa warna mencolok */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 w-full max-w-md text-sm text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-3 mb-4">
        <div className="flex justify-between md:justify-start md:gap-2">
          <span className="font-medium">Skor</span>
          <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{game.score}</span>
        </div>
        <div className="flex justify-between md:justify-start md:gap-2">
          <span className="font-medium">Tertinggi</span>
          <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{game.highScore}</span>
        </div>
        <div className="flex justify-between md:justify-start md:gap-2">
          <span className="font-medium">Kombinasi</span>
          <span className="font-mono font-bold text-slate-800 dark:text-slate-100">x{game.combo}</span>
        </div>
        <div className="flex justify-between md:justify-start md:gap-2">
          <span className="font-medium">Level</span>
          <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{game.level}</span>
        </div>
        <div className="col-span-2 md:col-span-4 flex justify-between md:justify-start md:gap-2 text-slate-500 dark:text-slate-400 text-xs">
          <span>Grid</span>
          <span className="font-mono">{game.gridSize}×{game.gridSize}</span>
        </div>
      </div>

      {/* Pesan status */}
      <div className="w-full max-w-md text-center min-h-[2rem] mb-3">
        <p className={`text-sm font-medium ${
          game.message.includes("Benar")
            ? "text-emerald-600 dark:text-emerald-400"
            : game.message.includes("Salah")
            ? "text-red-500 dark:text-red-400"
            : "text-slate-600 dark:text-slate-300"
        }`}>
          {game.message}
        </p>
      </div>

      {/* Grid warna */}
      <div
        className="grid gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl"
        style={{
          gridTemplateColumns: `repeat(${game.gridSize}, 1fr)`,
          width: "fit-content",
        }}
      >
        {game.tiles.map((color, index) => (
          <button
            key={index}
            className="rounded-lg transition-all duration-150 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:focus:ring-slate-500"
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

      {/* Tombol reset - plain */}
      <button
        onClick={resetGame}
        className="mt-6 px-5 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-full transition-colors shadow-sm"
      >
        Mulai Ulang
      </button>

      {/* Footer hint - tanpa emoji */}
      <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
        Tertinggi hanya bertahan selama halaman ini terbuka
      </p>
    </div>
  );
};

export default ColorMatchGame;