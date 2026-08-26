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
    message: "Temukan yang berbeda!",
  });

  const generateRandomColor = () => {
    const h = Math.floor(Math.random() * 360);
    const s = 50 + Math.floor(Math.random() * 30);
    const l = 40 + Math.floor(Math.random() * 30);
    return { h, s, l };
  };

  // Fungsi untuk menentukan ukuran grid berdasarkan level
  const getGridSizeFromLevel = (level: number) => {
    if (level <= 10) return 2;
    if (level <= 25) return 3;
    if (level <= 40) return 4;
    return 5; // level 41 ke atas
  };

  const generateGrid = useCallback((level: number) => {
    const size = getGridSizeFromLevel(level);
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
      message: "Temukan yang berbeda!",
    }));
  }, []);

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
        message: `Keren! +${10 * bonus} poin ✨`,
      }));

      // Naik level setiap 3 jawaban benar
      if (game.level % 3 === 0) {
        setGame((prev) => ({
          ...prev,
          level: prev.level + 1,
        }));
        setTimeout(() => generateGrid(game.level + 1), 350);
      } else {
        setTimeout(() => generateGrid(game.level), 350);
      }
    } else {
      setGame((prev) => ({
        ...prev,
        combo: 0,
        isPlaying: false,
        message: "Yah, kurang tepat 😅",
      }));

      setTimeout(() => {
        setGame((prev) => ({
          ...prev,
          isPlaying: true,
          message: `Level ${prev.level} — Temukan yang berbeda!`,
        }));
        generateGrid(game.level);
      }, 900);
    }
  };

  // RESET: hanya reset skor, combo, dan level ke awal. HIGH SCORE TETAP!
  const resetGame = () => {
    setGame((prev) => ({
      ...prev,
      score: 0,
      combo: 0,
      level: 1,
      isPlaying: true,
      message: "Mulai dari awal!",
    }));
    generateGrid(1);
  };

  useEffect(() => {
    generateGrid(1);
  }, [generateGrid]);

  const getTileSize = () => {
    const baseSize = 76;
    const maxSize = 110;
    const minSize = 48;
    const size = baseSize - (game.gridSize - 2) * 7;
    return Math.max(minSize, Math.min(maxSize, size));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[520px] p-6 bg-gradient-to-br from-slate-50 to-slate-100/70 dark:from-slate-900 dark:to-slate-800/80 rounded-3xl shadow-xl border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-sm max-w-lg mx-auto w-full transition-all">
      
      {/* Header - tanpa subtitle "Sembari menunggu..." */}
      <div className="w-full text-center mb-3">
        <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
          Cari Warna Beda
        </h2>
        <div className="w-16 h-1 bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500 mx-auto mt-1.5 rounded-full" />
      </div>

      {/* Scoreboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full max-w-md mt-2">
        <div className="bg-white/70 dark:bg-slate-800/70 rounded-xl px-3 py-2 text-center shadow-sm border border-slate-200/50 dark:border-slate-700/50">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium">Skor</p>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{game.score}</p>
        </div>
        <div className="bg-white/70 dark:bg-slate-800/70 rounded-xl px-3 py-2 text-center shadow-sm border border-slate-200/50 dark:border-slate-700/50">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium">Tertinggi</p>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{game.highScore}</p>
        </div>
        <div className="bg-white/70 dark:bg-slate-800/70 rounded-xl px-3 py-2 text-center shadow-sm border border-slate-200/50 dark:border-slate-700/50">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium">Kombinasi</p>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">×{game.combo}</p>
        </div>
        <div className="bg-white/70 dark:bg-slate-800/70 rounded-xl px-3 py-2 text-center shadow-sm border border-slate-200/50 dark:border-slate-700/50">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium">Level</p>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{game.level}</p>
        </div>
      </div>

      {/* Grid size tag - DIHAPUS (tidak ditampilkan) */}

      {/* Pesan status */}
      <div className="w-full max-w-md text-center min-h-[2.2rem] mt-3 flex items-center justify-center">
        <p className={`text-sm font-medium transition-all duration-200 ${
          game.message.includes("Keren")
            ? "text-emerald-600 dark:text-emerald-400"
            : game.message.includes("kurang")
            ? "text-rose-500 dark:text-rose-400"
            : "text-slate-500 dark:text-slate-400"
        }`}>
          {game.message}
        </p>
      </div>

      {/* Grid warna */}
      <div
        className="grid gap-2.5 p-4 bg-white/40 dark:bg-slate-800/40 rounded-2xl shadow-inner backdrop-blur-sm border border-white/20 dark:border-slate-700/30 mt-1"
        style={{
          gridTemplateColumns: `repeat(${game.gridSize}, 1fr)`,
          width: "fit-content",
        }}
      >
        {game.tiles.map((color, index) => (
          <button
            key={index}
            className="rounded-xl transition-all duration-150 hover:scale-105 hover:shadow-md active:scale-95 focus:outline-none focus:ring-2 focus:ring-slate-400/60 focus:ring-offset-2 dark:focus:ring-slate-500/60"
            style={{
              backgroundColor: color,
              width: getTileSize(),
              height: getTileSize(),
              cursor: game.isPlaying ? "pointer" : "default",
              opacity: game.isPlaying ? 1 : 0.5,
              boxShadow: game.isPlaying ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
            }}
            onClick={() => handleTileClick(index)}
            disabled={!game.isPlaying}
            aria-label={`Tile ${index + 1}`}
          />
        ))}
      </div>

      {/* Tombol Reset - hanya reset skor, combo, level, tapi HIGH SCORE tetap */}
      <button
        onClick={resetGame}
        className="mt-6 px-8 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-200/80 dark:bg-slate-700/80 hover:bg-slate-300/80 dark:hover:bg-slate-600/80 rounded-full transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 border border-slate-300/40 dark:border-slate-600/40"
      >
        Mulai Ulang
      </button>

      {/* Footer hint */}
      <p className="mt-4 text-[11px] text-slate-400 dark:text-slate-500 font-light tracking-wide">
        Tertinggi hanya bertahan selama halaman ini terbuka
      </p>
    </div>
  );
};

export default ColorMatchGame;