import React, { useState } from 'react';
import { ProductionOrder, ProductionLine, ShiftType } from '../types';
import { calculateDailyDispatch } from '../utils/dispatchEngine';
import { formatFullDate, formatFullDateWithName } from '../utils/dateDisplay';
import {
  Sun,
  Sunset,
  Moon,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

interface DailyDispatchViewProps {
  orders: ProductionOrder[];
  lines: ProductionLine[];
}

export const DailyDispatchView: React.FC<DailyDispatchViewProps> = ({ orders, lines }) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const changeDate = (days: number) => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + days);
    setSelectedDate(cur.toISOString().split('T')[0]);
  };

  const dispatchData = calculateDailyDispatch(orders, lines, selectedDate);

  const shiftInfo: { [key in ShiftType]: { label: string; time: string; icon: any; color: string } } = {
    morning: { label: 'Équipe Matin', time: '06h00 - 14h00 (8h)', icon: Sun, color: 'text-amber-500 bg-amber-50 border-amber-200' },
    afternoon: { label: 'Équipe Après-midi', time: '14h00 - 22h00 (8h)', icon: Sunset, color: 'text-orange-500 bg-orange-50 border-orange-200' },
    night: { label: 'Équipe Nuit', time: '22h00 - 06h00 (8h)', icon: Moon, color: 'text-indigo-500 bg-indigo-50 border-indigo-200' },
  };

  // Calcul du total des pièces du jour sélectionné
  let totalDailyPieces = 0;
  let totalDailyHours = 0;
  Object.values(dispatchData).forEach((lineShifts) => {
    Object.values(lineShifts).forEach((slots) => {
      slots?.forEach((s) => {
        totalDailyPieces += s.plannedPieces;
        totalDailyHours += s.allocatedHours;
      });
    });
  });

  return (
    <div className="space-y-4">
      {/* Date Bar & Daily Summary */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => changeDate(-1)}
              className="p-1.5 hover:bg-white text-slate-700 rounded-md transition"
              title="Jour précédent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 px-3 text-xs font-bold text-slate-900">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>{formatFullDateWithName(selectedDate)}</span>
            </div>
            <button
              onClick={() => changeDate(1)}
              className="p-1.5 hover:bg-white text-slate-700 rounded-md transition"
              title="Jour suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-2.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
          >
            Aujourd'hui
          </button>
        </div>

        {/* Daily Stats */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-emerald-900 font-semibold">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>{totalDailyPieces.toLocaleString()} pièces planifiées ce jour</span>
          </div>
          <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg text-indigo-900 font-semibold">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span>{Math.round(totalDailyHours * 10) / 10}h de charge machine</span>
          </div>
        </div>
      </div>

      {/* Grid of Lines & Shifts */}
      <div className="grid grid-cols-1 gap-4">
        {lines.map((line) => {
          const lineShifts = dispatchData[line.id] || { morning: [], afternoon: [], night: [] };
          const shiftsToDisplay: ShiftType[] = line.capacityHoursPerDay >= 24
            ? ['morning', 'afternoon', 'night']
            : ['morning', 'afternoon'];

          const totalLineHours = shiftsToDisplay.reduce((acc, shift) => {
            const slots = lineShifts[shift] || [];
            return acc + slots.reduce((sAcc, s) => sAcc + s.allocatedHours, 0);
          }, 0);

          const totalLinePieces = shiftsToDisplay.reduce((acc, shift) => {
            const slots = lineShifts[shift] || [];
            return acc + slots.reduce((sAcc, s) => sAcc + s.plannedPieces, 0);
          }, 0);

          return (
            <div
              key={line.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
            >
              {/* Line Header */}
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: line.color }}
                  />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{line.name}</h3>
                    <p className="text-xs text-slate-500">
                      Cadence standard : <strong>{line.defaultCadence} pcs/h</strong> • Rendement : <strong>{Math.round(line.efficiencyRate * 100)}%</strong> • Capacité : <strong>{line.capacityHoursPerDay}h/j</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-600 font-medium">
                    Charge du jour : <strong>{totalLineHours}h / {line.capacityHoursPerDay}h</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-200 font-mono font-bold text-slate-800">
                    {totalLinePieces} pièces
                  </span>
                </div>
              </div>

              {/* Shifts Columns */}
              <div className={`grid grid-cols-1 md:grid-cols-${shiftsToDisplay.length} divide-y md:divide-y-0 md:divide-x divide-slate-100`}>
                {shiftsToDisplay.map((shiftKey) => {
                  const info = shiftInfo[shiftKey];
                  const Icon = info.icon;
                  const slots = lineShifts[shiftKey] || [];
                  const shiftTotalHours = slots.reduce((acc, s) => acc + s.allocatedHours, 0);
                  const shiftTotalPieces = slots.reduce((acc, s) => acc + s.plannedPieces, 0);
                  const isFull = shiftTotalHours >= 7.5;

                  return (
                    <div key={shiftKey} className="p-3.5 flex flex-col justify-between">
                      <div>
                        {/* Shift Title */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <Icon className="w-4 h-4 text-slate-500" />
                            <div>
                              <p className="text-xs font-bold text-slate-900">{info.label}</p>
                              <p className="text-[10px] text-slate-400">{info.time}</p>
                            </div>
                          </div>

                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                              isFull
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : shiftTotalHours > 0
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-slate-50 text-slate-400 border-slate-200'
                            }`}
                          >
                            {shiftTotalHours}h / 8h
                          </span>
                        </div>

                        {/* Task Slots */}
                        <div className="mt-3 space-y-2">
                          {slots.length === 0 ? (
                            <div className="py-4 text-center text-xs text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                              Aucun ordre planifié sur cette équipe
                            </div>
                          ) : (
                            slots.map((slot, sIdx) => {
                              const order = orders.find((o) => o.id === slot.orderId);
                              const isDelayed = order?.status === 'delayed';

                              return (
                                <div
                                  key={sIdx}
                                  className={`p-2.5 rounded-lg border transition ${
                                    isDelayed
                                      ? 'bg-rose-50/60 border-rose-200 text-rose-900'
                                      : 'bg-slate-50 hover:bg-slate-100/60 border-slate-200 text-slate-800'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono font-bold text-xs">
                                      {slot.orderCode}
                                    </span>
                                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.2 rounded">
                                      +{slot.plannedPieces} pcs
                                    </span>
                                  </div>
                                  <p className="text-xs font-medium text-slate-900 mt-1 truncate">
                                    {slot.client}
                                  </p>
                                  <p className="text-[11px] text-slate-500 truncate">
                                    {slot.product}
                                  </p>
                                  <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                                    <span>Durée : <strong>{slot.allocatedHours}h</strong></span>
                                    <span>Livraison : <strong>{formatFullDate(order?.deadlineDate)}</strong></span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Shift Footer Summary */}
                      {slots.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                          <span>Total produit :</span>
                          <strong className="text-slate-800 font-mono">{shiftTotalPieces} pièces</strong>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
