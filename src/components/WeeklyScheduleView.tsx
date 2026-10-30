import React from 'react';
import { ProductionOrder, ProductionLine, ProductionSettings } from '../types';
import { Calendar, AlertTriangle, Layers, Clock, TrendingUp } from 'lucide-react';

interface WeeklyScheduleViewProps {
  orders: ProductionOrder[];
  lines: ProductionLine[];
  settings: ProductionSettings;
}

export const WeeklyScheduleView: React.FC<WeeklyScheduleViewProps> = ({
  orders,
  lines,
  settings,
}) => {
  // Générer les 5 ou 6 jours ouvrés de la semaine courante
  const today = new Date();
  const currentDayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon ...
  const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const daysOfWeek = Array.from({ length: settings.workingDaysPerWeek }).map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      dateStr: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
      dayNumber: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      isToday: d.toISOString().split('T')[0] === today.toISOString().split('T')[0],
    };
  });

  return (
    <div className="space-y-4">
      {/* Introduction Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-600" />
            <span>Dispatch Hebdomadaire & Analyse de Charge / Capacité</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Surveillance de la saturation des lignes et anticipation des goulets d'étranglement sur la semaine ({settings.workingDaysPerWeek} jours ouvrés)
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
            <span className="text-slate-600">&lt; 85% Fluide</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            <span className="text-slate-600">85-100% Pleine charge</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
            <span className="text-slate-600">&gt; 100% Surcharge</span>
          </div>
        </div>
      </div>

      {/* Lines Schedule */}
      <div className="space-y-4">
        {lines.map((line) => {
          const lineOrders = orders.filter(
            (o) => o.lineId === line.id && o.status !== 'completed'
          );

          const totalLineHours = lineOrders.reduce(
            (acc, o) => acc + (o.estimatedHours || 0),
            0
          );
          const weeklyCapacity = line.capacityHoursPerDay * settings.workingDaysPerWeek;
          const loadPercent = Math.round((totalLineHours / Math.max(1, weeklyCapacity)) * 100);

          const isOverloaded = loadPercent > 100;
          const isOptimal = loadPercent >= 80 && loadPercent <= 100;

          return (
            <div
              key={line.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
            >
              {/* Line Header with Progress Bar */}
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: line.color }}
                  />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{line.name}</h3>
                    <p className="text-xs text-slate-500">
                      Capacité hebdo : <strong>{weeklyCapacity}h</strong> ({line.capacityHoursPerDay}h/j × {settings.workingDaysPerWeek}j) • Cadence : <strong>{line.defaultCadence} pcs/h</strong>
                    </p>
                  </div>
                </div>

                {/* Capacity Bar */}
                <div className="md:w-72 flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Taux de charge hebdo :</span>
                    <span
                      className={`font-mono font-bold ${
                        isOverloaded
                          ? 'text-rose-600'
                          : isOptimal
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {totalLineHours}h / {weeklyCapacity}h ({loadPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOverloaded
                          ? 'bg-rose-500'
                          : isOptimal
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, loadPercent)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Day by Day Calendar Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-px bg-slate-200">
                {daysOfWeek.map((day) => {
                  // Trouver les ordres actifs sur ce jour
                  const dayOrders = lineOrders.filter((ord) => {
                    const start = ord.startDate;
                    const end = ord.estimatedEndDate || ord.startDate;
                    return day.dateStr >= start && day.dateStr <= end;
                  });

                  return (
                    <div
                      key={day.dateStr}
                      className={`p-3 min-h-[140px] flex flex-col justify-between ${
                        day.isToday ? 'bg-indigo-50/40' : 'bg-white'
                      }`}
                    >
                      <div>
                        {/* Day Header */}
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                          <span
                            className={`text-xs font-bold uppercase ${
                              day.isToday ? 'text-indigo-600' : 'text-slate-700'
                            }`}
                          >
                            {day.dayName}
                          </span>
                          <span
                            className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
                              day.isToday
                                ? 'bg-indigo-600 text-white font-bold'
                                : 'text-slate-500'
                            }`}
                          >
                            {day.dayNumber}
                          </span>
                        </div>

                        {/* Orders List for that day */}
                        <div className="mt-2 space-y-1.5">
                          {dayOrders.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic py-2">
                              Disponible
                            </p>
                          ) : (
                            dayOrders.map((ord) => {
                              const isDelayed = ord.status === 'delayed';

                              return (
                                <div
                                  key={ord.id}
                                  className={`p-1.5 rounded-md border text-[11px] transition ${
                                    isDelayed
                                      ? 'bg-rose-100/70 border-rose-300 text-rose-900 font-semibold'
                                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono font-bold text-[10px]">
                                      {ord.code}
                                    </span>
                                    {isDelayed && (
                                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                                    )}
                                  </div>
                                  <p className="font-medium truncate text-[11px] text-slate-900">
                                    {ord.client}
                                  </p>
                                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                                    <span>{ord.remainingQty} pcs</span>
                                    <span>{ord.cadencePerHour} p/h</span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Day Load */}
                      {dayOrders.length > 0 && (
                        <div className="mt-2 pt-1 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                          <span>Charge :</span>
                          <strong className="text-slate-700 font-mono">
                            {dayOrders.length} OF
                          </strong>
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
