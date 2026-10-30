import React, { useState, useRef, useEffect } from 'react';
import { MODEL_COLOR_PALETTE } from '../../utils/modelColorUtils';
import { Palette, Check, Pipette } from 'lucide-react';

interface ColorPickerPopoverProps {
  currentColor: string;
  onChangeColor: (newColor: string) => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const ColorPickerPopover: React.FC<ColorPickerPopoverProps> = ({
  currentColor,
  onChangeColor,
  title = 'Choisir une couleur',
  size = 'md',
  showLabel = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const circleSize =
    size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';

  return (
    <div className="relative inline-flex items-center" ref={containerRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-1.5 p-0.5 rounded hover:bg-slate-200/80 transition cursor-pointer group"
        title={title}
      >
        <span
          className={`${circleSize} rounded-full shrink-0 shadow-2xs ring-1 ring-black/20 transition-transform group-hover:scale-110`}
          style={{ backgroundColor: currentColor }}
        />
        {showLabel && (
          <span className="text-[10px] text-slate-700 font-medium">Couleur</span>
        )}
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 top-full mt-1.5 left-0 bg-white border border-slate-300 rounded-xl shadow-xl p-3 w-64 text-slate-900 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 text-xs">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-slate-700" />
              Couleur assignée
            </span>
            <div className="flex items-center gap-1">
              <span
                className="w-3 h-3 rounded-full border border-slate-400"
                style={{ backgroundColor: currentColor }}
              />
              <span className="font-mono text-[10px] font-bold text-slate-600">
                {currentColor}
              </span>
            </div>
          </div>

          {/* Palette Grid */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {MODEL_COLOR_PALETTE.map((c) => {
              const isSelected = currentColor.toLowerCase() === c.hex.toLowerCase();
              return (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => {
                    onChangeColor(c.hex);
                    setIsOpen(false);
                  }}
                  className="w-full aspect-square rounded-lg flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-2xs relative group"
                  style={{ backgroundColor: c.hex }}
                  title={`${c.name} (${c.hex})`}
                >
                  {isSelected && (
                    <Check className="w-4 h-4 text-white drop-shadow-sm stroke-[3]" />
                  )}
                  <span className="sr-only">{c.name}</span>
                </button>
              );
            })}
          </div>

          {/* Custom color input */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <label className="text-[11px] text-slate-700 font-medium flex items-center gap-1 cursor-pointer">
              <Pipette className="w-3 h-3 text-slate-500" />
              Personnalisée :
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={currentColor}
                onChange={(e) => onChangeColor(e.target.value)}
                className="w-6 h-6 p-0 border border-slate-300 rounded cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-2 py-0.5 bg-slate-900 text-white rounded text-[10.5px] font-bold hover:bg-black cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
