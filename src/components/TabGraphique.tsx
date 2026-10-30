import React, { useState, useMemo } from 'react';
import { SemaineCalculated, CommandeCalculated } from '../utils/macroLogic';
import { formatDay } from '../utils/dateDisplay';
import {
  Users,
  Clock,
  Package,
  Calendar,
  Layers,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Info,
} from 'lucide-react';

interface TabGraphiqueProps {
  semaines: SemaineCalculated[];
  commandes: CommandeCalculated[];
  currentSemaineCode: string;
}

export const TabGraphique: React.FC<TabGraphiqueProps> = ({
  semaines,
  commandes,
  currentSemaineCode,
}) => {
  // Metric to visualize: Brodeuses / Heures / Pièces
  const [metricMode, setMetricMode] = useState<'brodeuses' | 'heures' | 'pieces'>('brodeuses');
  // Team capacity benchmark (default 42 brodeuses as in line 52 of Excel, or user customizable)
  const [teamCapacity, setTeamCapacity] = useState<number>(42);
  // Filter active weeks or all 23 weeks
  const [showOnlyActive, setShowOnlyActive] = useState<boolean>(false);
  // Sort order: chronological or highest load first
  const [sortBy, setSortBy] = useState<'chrono' | 'desc'>('chrono');

  // Filter & sort weeks
  const displayedSemaines = useMemo(() => {
    let list = [...semaines];
    if (showOnlyActive) {
      list = list.filter((s) => s.totalPieces > 0 || s.code === currentSemaineCode);
    }
    if (sortBy === 'desc') {
      list.sort((a, b) => {
        if (metricMode === 'brodeuses') return b.totalBrodeuses - a.totalBrodeuses;
        if (metricMode === 'heures') return b.totalHeures - a.totalHeures;
        return b.totalPieces - a.totalPieces;
      });
    } else {
      list.sort((a, b) => a.ordre - b.ordre);
    }
    return list;
  }, [semaines, showOnlyActive, sortBy, metricMode, currentSemaineCode]);

  // Find max value to calibrate horizontal bar width
  const maxVal = useMemo(() => {
    const vals = displayedSemaines.map((s) => {
      if (metricMode === 'brodeuses') return s.totalBrodeuses;
      if (metricMode === 'heures') return s.totalHeures;
      return s.totalPieces;
    });
    const highest = Math.max(...vals, 1);
    if (metricMode === 'brodeuses') {
      return Math.max(highest, teamCapacity * 1.1);
    }
    if (metricMode === 'heures') {
      return Math.max(highest, teamCapacity * 40 * 1.1);
    }
    return highest;
  }, [displayedSemaines, metricMode, teamCapacity]);

  // Overall metrics summary
  const summary = useMemo(() => {
    const totalBrodeusesSem = semaines.reduce((sum, s) => sum + s.totalBrodeuses, 0);
    const totalHeures = semaines.reduce((sum, s) => sum + s.totalHeures, 0);
    const totalPieces = semaines.reduce((sum, s) => sum + s.totalPieces, 0);
    const overloadedWeeks = semaines.filter((s) => s.totalBrodeuses > teamCapacity);
    const peakWeek = [...semaines].sort((a, b) => b.totalBrodeuses - a.totalBrodeuses)[0];

    return {
      totalBrodeusesSem,
      totalHeures,
      totalPieces,
      overloadedCount: overloadedWeeks.length,
      peakWeekCode: peakWeek?.code || 'S34',
      peakBrodeuses: peakWeek?.totalBrodeuses || 0,
    };
  }, [semaines, teamCapacity]);

  // Donut chart calculations:
  // 1. Global Order Progress (Finies vs Planifiées restantes vs Non planifiées)
  const donutProgressData = useMemo(() => {
    const totalCommandee = commandes.reduce((acc, c) => acc + c.qte_commande, 0);
    const totalFinie = commandes.reduce((acc, c) => acc + c.qte_finie, 0);
    const totalPlanifie = commandes.reduce((acc, c) => acc + c.totalProgramme, 0);
    const totalReste = Math.max(0, totalCommandee - totalFinie);
    const nonPlanifie = Math.max(0, totalReste - totalPlanifie);

    return [
      { label: 'Déjà Produit (Fini)', value: totalFinie, color: '#10b981', textColor: 'text-emerald-600' },
      { label: 'En Cours / Programmé', value: totalPlanifie, color: '#6366f1', textColor: 'text-indigo-600' },
      { label: 'Reste non programmé', value: nonPlanifie, color: '#f59e0b', textColor: 'text-amber-600' },
    ];
  }, [commandes]);

  // 2. Client Breakdown (Répartition par client)
  const donutClientData = useMemo(() => {
    const map = new Map<string, number>();
    commandes.forEach((c) => {
      const client = c.client.split(' ')[0] || c.client;
      map.set(client, (map.get(client) || 0) + c.qte_commande);
    });

    const palette = ['#6366f1', '#ec4899', '#3b82f6', '#14b8a6', '#f59e0b', '#8b5cf6'];
    const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    const top4 = entries.slice(0, 4);
    const others = entries.slice(4).reduce((sum, item) => sum + item[1], 0);

    const result = top4.map(([label, value], i) => ({
      label,
      value,
      color: palette[i % palette.length],
    }));

    if (others > 0) {
      result.push({ label: 'Autres Clients', value: others, color: '#94a3b8' });
    }
    return result;
  }, [commandes]);

  // 3. Weekly Workshop Load Breakdown (Sous-charge vs Charge normale vs Surcharge)
  const donutLoadStatusData = useMemo(() => {
    let sousCharge = 0;
    let normal = 0;
    let surcharge = 0;

    semaines.forEach((s) => {
      const rate = (s.totalBrodeuses / teamCapacity) * 100;
      if (s.totalBrodeuses === 0 || rate < 80) sousCharge++;
      else if (rate <= 100) normal++;
      else surcharge++;
    });

    return [
      { label: 'Surcharge (>100%)', count: surcharge, color: '#ef4444', textColor: 'text-rose-600' },
      { label: 'Charge Normale (80-100%)', count: normal, color: '#f59e0b', textColor: 'text-amber-600' },
      { label: 'Sous-charge / Dispo (<80%)', count: sousCharge, color: '#10b981', textColor: 'text-emerald-600' },
    ];
  }, [semaines, teamCapacity]);

  // Helper SVG Donut generator
  const renderDonutSvg = (
    slices: { label: string; value: number; color: string }[],
    centerTitle: string,
    centerSubtitle: string
  ) => {
    const total = slices.reduce((sum, s) => sum + s.value, 0);
    if (total === 0) return null;

    const size = 160;
    const strokeWidth = 24;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    let accumulatedAngle = 0;

    return (
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          {slices.map((slice, idx) => {
            const ratio = slice.value / total;
            const strokeDasharray = `${ratio * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedAngle * circumference;
            accumulatedAngle += ratio;

            return (
              <circle
                key={idx}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500 hover:opacity-90"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-base font-black text-slate-900 font-mono tracking-tight">{centerTitle}</span>
          <span className="text-[10px] text-slate-500 font-medium uppercase">{centerSubtitle}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & KPI Summary Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h10M4 18h14" />
                </svg>
              </span>
              <span>Graphe Horizontal de Charge (S29 à S51)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Visualisation horizontale de la charge par semaine avec seuil d'alerte et effectif d'atelier.
            </p>
          </div>

          {/* Metric Selector Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 font-medium mr-1">Afficher :</span>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              <button
                onClick={() => setMetricMode('brodeuses')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                  metricMode === 'brodeuses'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Brodeuses (ETP)
              </button>
              <button
                onClick={() => setMetricMode('heures')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                  metricMode === 'heures'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Volume Heures
              </button>
              <button
                onClick={() => setMetricMode('pieces')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                  metricMode === 'pieces'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Nb Pièces
              </button>
            </div>
          </div>
        </div>

        {/* Filter and threshold bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <Users className="w-4 h-4 text-indigo-600" />
              <span className="text-slate-700 font-medium">Capacité nominale atelier :</span>
              <input
                type="number"
                min={1}
                max={200}
                value={teamCapacity}
                onChange={(e) => setTeamCapacity(Number(e.target.value) || 42)}
                className="w-14 px-2 py-0.5 text-center font-mono font-bold bg-white border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-slate-500">brodeuses ({teamCapacity * 40} h/sem)</span>
            </div>

            <button
              onClick={() => setShowOnlyActive(!showOnlyActive)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border transition ${
                showOnlyActive
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{showOnlyActive ? 'Semaines actives seulement' : 'Toutes les 23 semaines'}</span>
            </button>

            <button
              onClick={() => setSortBy(sortBy === 'chrono' ? 'desc' : 'chrono')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 bg-white"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{sortBy === 'chrono' ? 'Ordre chronologique' : 'Trier par charge décroissante'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-3 text-slate-600">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Sous-charge (&lt;80%)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>Charge haute (80-100%)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>Surcharge (&gt;100%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="text-[11px] text-slate-500 font-medium">Pic d'effectif requis</div>
          <div className="text-xl font-black text-rose-600 font-mono mt-0.5">
            {summary.peakBrodeuses} <span className="text-xs font-normal text-slate-600">brod.</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Semaine de pointe : <strong className="font-mono text-slate-800">{summary.peakWeekCode}</strong>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="text-[11px] text-slate-500 font-medium">Semaines en surcharge</div>
          <div className="text-xl font-black text-amber-600 font-mono mt-0.5">
            {summary.overloadedCount} <span className="text-xs font-normal text-slate-500">/ 23 sem.</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Dépassement du seuil de {teamCapacity} brod.
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="text-[11px] text-slate-500 font-medium">Volume total planifié</div>
          <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
            {summary.totalPieces.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-500">pcs</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Sur l'ensemble du cycle
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="text-[11px] text-slate-500 font-medium">Cumul heures prévues</div>
          <div className="text-xl font-black text-indigo-600 font-mono mt-0.5">
            {summary.totalHeures.toLocaleString('fr-FR')} <span className="text-xs font-normal text-slate-500">h</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Broderie traditionnelle
          </div>
        </div>
      </div>

      {/* DONUT CHARTS SECTION (Graphiques en Anneau) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-6">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
              <span>Graphiques en Anneau (Donut Charts)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Répartition synthétique de l'avancement global, des clients majeurs et de la santé de l'atelier.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Donut 1: Avancement des Commandes */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 flex flex-col items-center">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              1. Avancement Global des Pièces
            </h4>
            {renderDonutSvg(
              donutProgressData,
              `${Math.round(
                (commandes.reduce((s, c) => s + c.qte_finie, 0) /
                  (commandes.reduce((s, c) => s + c.qte_commande, 0) || 1)) *
                  100
              )}%`,
              'Produit'
            )}
            <div className="w-full mt-4 space-y-1.5 text-xs">
              {donutProgressData.map((d, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></span>
                    <span className="text-slate-600">{d.label}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-800">
                    {d.value.toLocaleString('fr-FR')} pcs
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Donut 2: Répartition par Client */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 flex flex-col items-center">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              2. Volume par Marque / Client
            </h4>
            {renderDonutSvg(
              donutClientData,
              `${donutClientData.length}`,
              'Marques'
            )}
            <div className="w-full mt-4 space-y-1.5 text-xs">
              {donutClientData.map((d, i) => {
                const totalCmd = commandes.reduce((s, c) => s + c.qte_commande, 0);
                const pct = Math.round((d.value / (totalCmd || 1)) * 100);
                return (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></span>
                      <span className="text-slate-700 font-medium">{d.label}</span>
                    </div>
                    <div className="flex items-center space-x-2 font-mono">
                      <span className="text-slate-500 text-[11px]">{pct}%</span>
                      <span className="font-bold text-slate-800">{d.value.toLocaleString('fr-FR')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Donut 3: Répartition des Semaines (Météo Capacité) */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 flex flex-col items-center">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              3. Profil de Charge Atelier
            </h4>
            {renderDonutSvg(
              donutLoadStatusData.map((d) => ({
                label: d.label,
                value: d.count,
                color: d.color,
              })),
              `${semaines.length}`,
              'Semaines'
            )}
            <div className="w-full mt-4 space-y-1.5 text-xs">
              {donutLoadStatusData.map((d, i) => {
                const pct = Math.round((d.count / (semaines.length || 1)) * 100);
                return (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></span>
                      <span className="text-slate-600">{d.label}</span>
                    </div>
                    <div className="flex items-center space-x-2 font-mono">
                      <span className="text-slate-500 text-[11px]">{pct}%</span>
                      <span className="font-bold text-slate-800">{d.count} sem.</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* HORIZONTAL BARS CHART */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Semaine & Date de début
          </div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Barre horizontale & Valeur détaillée
          </div>
        </div>

        <div className="space-y-3">
          {displayedSemaines.map((sem) => {
            const isCourante = sem.code === currentSemaineCode;

            // Value depending on metricMode
            const value =
              metricMode === 'brodeuses'
                ? sem.totalBrodeuses
                : metricMode === 'heures'
                ? sem.totalHeures
                : sem.totalPieces;

            // Percentage of max bar width
            const barPercent = Math.min(100, Math.max(0, (value / (maxVal || 1)) * 100));

            // Load rate vs teamCapacity
            const loadRate = Math.round((sem.totalBrodeuses / teamCapacity) * 100);
            const isOverloaded = sem.totalBrodeuses > teamCapacity;
            const isMedium = loadRate >= 80 && loadRate <= 100;

            // Bar color scheme
            let barColor = 'bg-emerald-500';
            let barHover = 'group-hover:bg-emerald-600';
            if (isOverloaded) {
              barColor = 'bg-rose-500';
              barHover = 'group-hover:bg-rose-600';
            } else if (isMedium) {
              barColor = 'bg-amber-500';
              barHover = 'group-hover:bg-amber-600';
            } else if (value === 0) {
              barColor = 'bg-slate-200';
            }

            return (
              <div
                key={sem.id}
                className={`group p-2.5 rounded-lg transition-all ${
                  isCourante
                    ? 'bg-amber-50/80 ring-1 ring-amber-300'
                    : 'hover:bg-slate-50/80'
                }`}
              >
                <div className="grid grid-cols-12 gap-3 items-center">
                  {/* Left Label: Week code, date, badge */}
                  <div className="col-span-3 sm:col-span-2 flex flex-col sm:flex-row sm:items-center sm:justify-between pr-2">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono font-black text-sm text-slate-900">{sem.code}</span>
                      {isCourante && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-bold">
                          En cours
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">{formatDay(sem.date_debut)}</span>
                  </div>

                  {/* Horizontal Bar Graphic */}
                  <div className="col-span-7 sm:col-span-8 flex items-center">
                    <div className="w-full bg-slate-100 rounded-lg h-6 p-0.5 overflow-hidden border border-slate-200 flex items-center relative">
                      {/* Vertical line indicator for capacity threshold if metric is brodeuses or heures */}
                      {metricMode === 'brodeuses' && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-slate-700/60 z-10"
                          style={{ left: `${Math.min(100, (teamCapacity / maxVal) * 100)}%` }}
                          title={`Seuil nominal: ${teamCapacity} brodeuses`}
                        />
                      )}
                      {metricMode === 'heures' && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-slate-700/60 z-10"
                          style={{ left: `${Math.min(100, ((teamCapacity * 40) / maxVal) * 100)}%` }}
                          title={`Seuil nominal: ${teamCapacity * 40} heures`}
                        />
                      )}

                      {/* The animated horizontal bar */}
                      <div
                        className={`h-full rounded-md ${barColor} ${barHover} transition-all duration-300 flex items-center justify-end px-2`}
                        style={{ width: `${Math.max(barPercent, value > 0 ? 3 : 0)}%` }}
                      >
                        {barPercent > 20 && (
                          <span className="text-[11px] font-bold text-white drop-shadow-xs font-mono">
                            {value.toLocaleString('fr-FR')} {metricMode === 'heures' ? 'h' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Stats & Badge */}
                  <div className="col-span-2 flex flex-col items-end justify-center text-right font-mono">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-slate-900">
                        {value > 0 ? value.toLocaleString('fr-FR') : '—'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-sans">
                        {metricMode === 'brodeuses' ? 'brod.' : metricMode === 'heures' ? 'h' : 'pcs'}
                      </span>
                    </div>

                    {metricMode === 'brodeuses' && value > 0 && (
                      <span
                        className={`text-[10px] font-bold ${
                          isOverloaded ? 'text-rose-600' : isMedium ? 'text-amber-600' : 'text-emerald-600'
                        }`}
                      >
                        {loadRate}% {isOverloaded && '⚠️'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend notes */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-slate-400" />
            <span>
              La barre verticale grise indique la capacité nominale d'atelier ({teamCapacity} brodeuses / {teamCapacity * 40} h).
            </span>
          </div>
          <div>
            Formule : <strong>Nb brodeuses = Total heures / 40h</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
