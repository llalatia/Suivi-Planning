import React, { useState } from 'react';
import { ProductionOrder, ProductionLine, OrderPriority, OrderStatus } from '../types';
import {
  Search,
  Filter,
  Plus,
  Trash2,
  Copy,
  CheckCheck,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';

interface ExcelTableProps {
  orders: ProductionOrder[];
  lines: ProductionLine[];
  onUpdateOrder: (updated: ProductionOrder) => void;
  onAddOrder: (newOrder: ProductionOrder) => void;
  onDeleteOrder: (id: string) => void;
  onDuplicateOrder: (order: ProductionOrder) => void;
}

export const ExcelTable: React.FC<ExcelTableProps> = ({
  orders,
  lines,
  onUpdateOrder,
  onAddOrder,
  onDeleteOrder,
  onDuplicateOrder,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLineFilter, setSelectedLineFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // Nouvel Ordre Form State
  const [newCode, setNewCode] = useState(`OF-2024-${100 + orders.length + 1}`);
  const [newClient, setNewClient] = useState('');
  const [newProduct, setNewProduct] = useState('');
  const [newLineId, setNewLineId] = useState(lines[0]?.id || 'L1');
  const [newQuantity, setNewQuantity] = useState(500);
  const [newCadence, setNewCadence] = useState(60);
  const [newPriority, setNewPriority] = useState<OrderPriority>('P2');
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newDeadline, setNewDeadline] = useState(
    new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]
  );
  const [newNotes, setNewNotes] = useState('');

  const lineMap = new Map<string, ProductionLine>(lines.map((l) => [l.id, l]));

  // Filtrage
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesLine = selectedLineFilter === 'ALL' || order.lineId === selectedLineFilter;
    const matchesStatus =
      selectedStatusFilter === 'ALL' ||
      (selectedStatusFilter === 'delayed' && order.status === 'delayed') ||
      (selectedStatusFilter === 'at_risk' && order.status === 'at_risk') ||
      (selectedStatusFilter === 'on_time' && order.status === 'on_time') ||
      (selectedStatusFilter === 'completed' && order.status === 'completed');

    return matchesSearch && matchesLine && matchesStatus;
  });

  const handleFieldChange = (order: ProductionOrder, field: keyof ProductionOrder, value: any) => {
    const updated = { ...order, [field]: value };
    // recalculer si quantites changent
    if (field === 'quantity' || field === 'produced' || field === 'cadencePerHour') {
      updated.remainingQty = Math.max(0, updated.quantity - updated.produced);
      const line = lineMap.get(updated.lineId);
      const efficiency = line?.efficiencyRate || 0.9;
      updated.estimatedHours =
        updated.cadencePerHour > 0
          ? Math.round((updated.remainingQty / (updated.cadencePerHour * efficiency)) * 10) / 10
          : 0;
    }
    onUpdateOrder(updated);
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.trim() || !newProduct.trim()) return;

    const newOrd: ProductionOrder = {
      id: `ord-${Date.now()}`,
      code: newCode.trim(),
      client: newClient.trim(),
      product: newProduct.trim(),
      lineId: newLineId,
      quantity: Number(newQuantity),
      produced: 0,
      cadencePerHour: Number(newCadence),
      startDate: newStartDate,
      deadlineDate: newDeadline,
      priority: newPriority,
      status: 'on_time',
      notes: newNotes.trim(),
    };

    onAddOrder(newOrd);
    setShowAddModal(false);
    // Reset form
    setNewCode(`OF-2024-${100 + orders.length + 2}`);
    setNewClient('');
    setNewProduct('');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
      {/* Control Bar: Search, Filters & Add */}
      <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="search-input-orders"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par OF, client, référence produit..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            />
          </div>
        </div>

        {/* Filters and Add button */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Filter Line */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <select
              id="filter-line-select"
              value={selectedLineFilter}
              onChange={(e) => setSelectedLineFilter(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-800 font-medium focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Toutes les Lignes</option>
              {lines.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              id="filter-status-select"
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-800 font-medium focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Tous les Statuts</option>
              <option value="delayed">En Retard Critique</option>
              <option value="at_risk">À Risque (Vigilance)</option>
              <option value="on_time">À l'Heure</option>
              <option value="completed">Terminés</option>
            </select>
          </div>

          {/* Add Order Button */}
          <button
            id="btn-add-order"
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-xs transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter un OF</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet Table View */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
          <thead>
            <tr className="bg-slate-100/80 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-3 w-28">Code OF</th>
              <th className="py-2.5 px-3 w-36">Client</th>
              <th className="py-2.5 px-3 w-44">Produit / Désignation</th>
              <th className="py-2.5 px-3 w-40">Ligne / Machine</th>
              <th className="py-2.5 px-2 w-16 text-center">Prio</th>
              <th className="py-2.5 px-3 w-24 text-right">Qté Totale</th>
              <th className="py-2.5 px-3 w-24 text-right">Fait</th>
              <th className="py-2.5 px-3 w-24 text-right bg-slate-200/50">Reste</th>
              <th className="py-2.5 px-3 w-28 text-right">Cadence (h)</th>
              <th className="py-2.5 px-3 w-24 text-right bg-slate-200/50">Durée (h)</th>
              <th className="py-2.5 px-3 w-32">Date Limite (Client)</th>
              <th className="py-2.5 px-3 w-32">Fin Estimée</th>
              <th className="py-2.5 px-3 w-32 text-center">Statut Délais</th>
              <th className="py-2.5 px-3 w-20 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={14} className="py-8 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileSpreadsheet className="w-8 h-8 text-slate-300" />
                    <span>Aucun ordre de fabrication trouvé avec ces critères de recherche.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const line = lineMap.get(order.lineId);
                const remaining = order.remainingQty ?? Math.max(0, order.quantity - order.produced);
                const isDelayed = order.status === 'delayed';
                const isAtRisk = order.status === 'at_risk';
                const isCompleted = order.status === 'completed';

                return (
                  <tr
                    key={order.id}
                    className={`hover:bg-slate-50/80 transition group ${
                      isDelayed
                        ? 'bg-rose-50/40'
                        : isAtRisk
                        ? 'bg-amber-50/30'
                        : isCompleted
                        ? 'bg-slate-50/50 text-slate-400 opacity-80'
                        : ''
                    }`}
                  >
                    {/* Code OF */}
                    <td className="py-2 px-3 font-mono font-bold text-slate-800">
                      <input
                        type="text"
                        value={order.code}
                        onChange={(e) => handleFieldChange(order, 'code', e.target.value)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border-transparent hover:border-slate-200 focus:border-emerald-500 rounded px-1.5 py-0.5 font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>

                    {/* Client */}
                    <td className="py-2 px-3 font-medium text-slate-900">
                      <input
                        type="text"
                        value={order.client}
                        onChange={(e) => handleFieldChange(order, 'client', e.target.value)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border-transparent hover:border-slate-200 focus:border-emerald-500 rounded px-1.5 py-0.5 text-xs focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>

                    {/* Produit */}
                    <td className="py-2 px-3 text-slate-700">
                      <input
                        type="text"
                        value={order.product}
                        onChange={(e) => handleFieldChange(order, 'product', e.target.value)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border-transparent hover:border-slate-200 focus:border-emerald-500 rounded px-1.5 py-0.5 text-xs focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>

                    {/* Ligne */}
                    <td className="py-2 px-3">
                      <select
                        value={order.lineId}
                        onChange={(e) => handleFieldChange(order, 'lineId', e.target.value)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border-transparent hover:border-slate-200 focus:border-emerald-500 rounded px-1.5 py-0.5 text-xs font-medium cursor-pointer"
                        style={{ color: line?.color || '#334155' }}
                      >
                        {lines.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Priorité */}
                    <td className="py-2 px-2 text-center">
                      <select
                        value={order.priority}
                        onChange={(e) => handleFieldChange(order, 'priority', e.target.value as OrderPriority)}
                        className={`text-xs font-bold rounded px-1.5 py-0.5 border cursor-pointer ${
                          order.priority === 'P1'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : order.priority === 'P2'
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        <option value="P1">P1</option>
                        <option value="P2">P2</option>
                        <option value="P3">P3</option>
                      </select>
                    </td>

                    {/* Quantité Totale */}
                    <td className="py-2 px-3 text-right font-medium">
                      <input
                        type="number"
                        min="1"
                        value={order.quantity}
                        onChange={(e) => handleFieldChange(order, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-20 text-right bg-transparent hover:bg-white focus:bg-white border-transparent hover:border-slate-200 focus:border-emerald-500 rounded px-1 py-0.5 font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>

                    {/* Déjà Produit */}
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        min="0"
                        value={order.produced}
                        onChange={(e) => handleFieldChange(order, 'produced', parseInt(e.target.value) || 0)}
                        className="w-20 text-right bg-transparent hover:bg-white focus:bg-white border-transparent hover:border-slate-200 focus:border-emerald-500 rounded px-1 py-0.5 font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>

                    {/* Reste à Produire (Calculé auto) */}
                    <td className="py-2 px-3 text-right font-mono font-bold bg-slate-50/60 text-slate-900">
                      {remaining.toLocaleString()}
                    </td>

                    {/* Cadence (pcs/h) */}
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        min="1"
                        value={order.cadencePerHour}
                        onChange={(e) => handleFieldChange(order, 'cadencePerHour', parseInt(e.target.value) || 1)}
                        className="w-16 text-right bg-transparent hover:bg-white focus:bg-white border-transparent hover:border-slate-200 focus:border-emerald-500 rounded px-1 py-0.5 font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                        title="Cadence nominale en pièces par heure"
                      />
                      <span className="text-[10px] text-slate-400 ml-1">p/h</span>
                    </td>

                    {/* Heures Requises (Calculé auto) */}
                    <td className="py-2 px-3 text-right font-mono font-bold bg-slate-50/60 text-indigo-950">
                      {order.estimatedHours}h
                    </td>

                    {/* Date Limite Client (Deadline) */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                        <input
                          type="date"
                          value={order.deadlineDate}
                          onChange={(e) => handleFieldChange(order, 'deadlineDate', e.target.value)}
                          className="bg-transparent hover:bg-white focus:bg-white border-transparent hover:border-slate-200 focus:border-emerald-500 rounded px-1 py-0.5 text-xs font-mono focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                        />
                      </div>
                    </td>

                    {/* Fin Estimée */}
                    <td className="py-2 px-3 font-mono text-slate-700">
                      {order.estimatedEndDate || '-'}
                    </td>

                    {/* Statut de ponctualité */}
                    <td className="py-2 px-3 text-center">
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          <CheckCircle2 className="w-3 h-3 text-slate-400" />
                          Terminé
                        </span>
                      ) : isDelayed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          Retard (+{order.delayDays}j)
                        </span>
                      ) : isAtRisk ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                          <Clock className="w-3 h-3 text-amber-600" />
                          À Risque
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          À l'Heure
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition">
                        <button
                          onClick={() => handleFieldChange(order, 'produced', order.quantity)}
                          title="Marquer comme 100% terminé"
                          className="p-1 hover:text-emerald-600 rounded hover:bg-emerald-50 transition"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDuplicateOrder(order)}
                          title="Dupliquer cet OF"
                          className="p-1 hover:text-blue-600 rounded hover:bg-blue-50 transition"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteOrder(order.id)}
                          title="Supprimer la ligne"
                          className="p-1 hover:text-rose-600 rounded hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          <span>Affichage de <strong>{filteredOrders.length}</strong> sur <strong>{orders.length}</strong> ordres de fabrication.</span>
          <span className="ml-2 text-slate-400">• Cliquez directement dans les cellules pour éditer comme dans Excel.</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span> À l'heure
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 ml-2"></span> Risque
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 ml-2"></span> Retard critique
        </div>
      </div>

      {/* Modal Ajout Nouvel Ordre */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>Nouvel Ordre de Fabrication (OF)</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Code OF</label>
                  <input
                    type="text"
                    required
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Client</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Airbus, Alstom, Renault..."
                    value={newClient}
                    onChange={(e) => setNewClient(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Désignation Produit / Référence</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carter Aluminium X42, Boîtier Tertiaire..."
                  value={newProduct}
                  onChange={(e) => setNewProduct(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ligne de Production</label>
                  <select
                    value={newLineId}
                    onChange={(e) => setNewLineId(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    {lines.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priorité</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as OrderPriority)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="P1">P1 - Haute (Urgent)</option>
                    <option value="P2">P2 - Standard</option>
                    <option value="P3">P3 - Basse (Tolérance)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quantité Totale</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(parseInt(e.target.value) || 1)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cadence (pièces / heure)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newCadence}
                    onChange={(e) => setNewCadence(parseInt(e.target.value) || 1)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date Début Planifiée</label>
                  <input
                    type="date"
                    required
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Deadline Client (Impérative)</label>
                  <input
                    type="date"
                    required
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Consignes d'atelier</label>
                <input
                  type="text"
                  placeholder="Ex: Contrôle CMM 100%, emballage spécifique..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition shadow-xs"
                >
                  Enregistrer et Calculer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
