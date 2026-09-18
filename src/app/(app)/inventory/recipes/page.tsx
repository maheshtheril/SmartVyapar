'use client';

import React, { useState, useEffect } from 'react';
import { 
  UtensilsCrossed, 
  Plus, 
  Search, 
  TrendingUp, 
  Trash2, 
  RefreshCw, 
  X, 
  ArrowLeft, 
  CheckCircle2, 
  ChefHat, 
  PieChart, 
  Scale, 
  AlertTriangle 
} from 'lucide-react';
import Link from 'next/link';

interface IngredientRow {
  ingredientId: string;
  quantityRequired: number;
  wastePercentage: number;
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedDishId, setSelectedDishId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [recipeIngredients, setRecipeIngredients] = useState<IngredientRow[]>([
    { ingredientId: '', quantityRequired: 0.25, wastePercentage: 5 },
  ]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/recipes');
      const data = await res.json();
      if (data.success) {
        setRecipes(data.recipes || []);
        setRawMaterials(data.rawMaterials || []);
        if (data.rawMaterials.length > 0 && !selectedDishId) {
          setSelectedDishId(data.rawMaterials[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading recipes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (dish?: any) => {
    if (dish) {
      setSelectedDishId(dish.id);
      setRecipeIngredients(
        dish.ingredients.map((ing: any) => ({
          ingredientId: ing.ingredientId,
          quantityRequired: ing.quantityRequired,
          wastePercentage: ing.wastePercentage || 0,
        }))
      );
    } else {
      setSelectedDishId(rawMaterials[0]?.id || '');
      setRecipeIngredients([
        { ingredientId: rawMaterials[1]?.id || '', quantityRequired: 0.25, wastePercentage: 5 },
      ]);
    }
    setShowModal(true);
  };

  const handleAddIngredientRow = () => {
    setRecipeIngredients([
      ...recipeIngredients,
      { ingredientId: rawMaterials[0]?.id || '', quantityRequired: 0.1, wastePercentage: 0 },
    ]);
  };

  const handleRemoveIngredientRow = (index: number) => {
    if (recipeIngredients.length === 1) return;
    setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index));
  };

  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDishId) {
      alert('Please select a menu dish');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menuProductId: selectedDishId,
          ingredients: recipeIngredients,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save recipe');
      }

      alert('✅ Recipe saved! Inward raw stock will auto-deplete when billed at POS.');
      setShowModal(false);
      loadData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter recipes
  const filtered = recipes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.category && r.category.toLowerCase().includes(search.toLowerCase()))
  );

  // Selected dish details for modal cost estimation
  const currentDish = rawMaterials.find((p) => p.id === selectedDishId);
  let estimatedCost = 0;
  recipeIngredients.forEach((row) => {
    const raw = rawMaterials.find((m) => m.id === row.ingredientId);
    if (raw) {
      const costPerUnit = Number(raw.purchasePrice || 0);
      const qty = Number(row.quantityRequired || 0);
      const waste = Number(row.wastePercentage || 0);
      estimatedCost += qty * (1 + waste / 100) * costPerUnit;
    }
  });
  const dishPrice = currentDish ? Number(currentDish.sellingPrice || 0) : 0;
  const estimatedMargin = dishPrice > 0 ? dishPrice - estimatedCost : 0;
  const foodCostPct = dishPrice > 0 ? ((estimatedCost / dishPrice) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Link href="/inventory" className="text-slate-400 hover:text-slate-600 transition">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
              <ChefHat className="h-6 w-6 text-amber-600" />
              <span>Recipe Management & Bill of Materials (BOM)</span>
              <span className="rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5">
                Backflushing Engine
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Map bulk raw materials (Chicken, Rice, Oil) to menu dishes (Biryani, 65) for automatic ingredient depletion on billing
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition flex items-center space-x-1.5"
        >
          <Plus className="h-4 w-4" />
          <span>+ Create Dish Recipe</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Recipes Defined</span>
            <UtensilsCrossed className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{recipes.length} Dishes</div>
          <p className="mt-1 text-[11px] text-slate-400">Auto-depleting ingredients at POS</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Target Food Cost %</span>
            <PieChart className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700">28% - 32%</div>
          <p className="mt-1 text-[11px] text-emerald-600">Restaurant industry profit benchmark</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Available Raw Materials</span>
            <Scale className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{rawMaterials.length} In Stock</div>
          <p className="mt-1 text-[11px] text-slate-400">Purchased in bulk via AI Scan</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search menu dishes by name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Total Recipes: <span className="text-slate-900 font-bold">{recipes.length}</span>
        </div>
      </div>

      {/* Recipe Cards List */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 flex flex-col items-center">
          <RefreshCw className="h-6 w-6 animate-spin text-amber-600 mb-2" />
          <span className="text-xs">Loading recipes from Neon database...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400 space-y-3">
          <UtensilsCrossed className="h-10 w-10 mx-auto opacity-30 text-amber-500" />
          <p className="text-sm font-semibold text-slate-700">No recipes configured yet</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Click &quot;+ Create Dish Recipe&quot; to link raw ingredients (e.g. 250g Chicken + 150g Rice) to a menu dish (Chicken Biryani).
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition"
          >
            + Create First Recipe
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((dish) => (
            <div
              key={dish.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 hover:border-amber-300 transition"
            >
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{dish.name}</h3>
                  <div className="text-[11px] text-slate-400 font-medium">
                    Menu Price: <span className="text-slate-900 font-bold">₹{dish.sellingPrice.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenModal(dish)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition"
                >
                  Edit Recipe
                </button>
              </div>

              {/* Food Cost & Profitability Bar */}
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600">
                    Food Cost: <span className="font-bold text-slate-900">₹{dish.totalFoodCost.toFixed(2)}</span> ({dish.foodCostPercentage}%)
                  </span>
                  <span className="text-emerald-700 font-bold">
                    Gross Margin: ₹{dish.grossMargin.toFixed(2)}
                  </span>
                </div>

                {/* Progress bar visual */}
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex">
                  <div 
                    style={{ width: `${Math.min(100, dish.foodCostPercentage)}%` }} 
                    className="bg-amber-500 h-full" 
                    title="Food Cost"
                  />
                  <div 
                    style={{ width: `${Math.max(0, 100 - dish.foodCostPercentage)}%` }} 
                    className="bg-emerald-500 h-full" 
                    title="Gross Margin"
                  />
                </div>
              </div>

              {/* Ingredients List */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Raw Ingredients Depleted per Order:
                </div>

                <div className="space-y-1">
                  {dish.ingredients.map((ing: any) => (
                    <div
                      key={ing.id}
                      className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50/70 border border-slate-100"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        <span className="font-medium text-slate-800">{ing.ingredientName}</span>
                      </div>
                      <div className="text-slate-600 font-mono text-[11px]">
                        {ing.quantityRequired} {ing.baseUnit} 
                        {ing.wastePercentage > 0 && <span className="text-[10px] text-slate-400"> (+{ing.wastePercentage}% loss)</span>}
                        <span className="text-slate-400 ml-1">≈ ₹{ing.lineCost.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: RECIPE BUILDER */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <ChefHat className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Configure Dish Recipe (BOM)</h3>
                  <p className="text-[11px] text-slate-500">Auto-depletes raw ingredients when sold at POS</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRecipe} className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Select Dish */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Select Menu Dish *</label>
                <select
                  value={selectedDishId}
                  onChange={(e) => setSelectedDishId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none bg-slate-50/50"
                >
                  {rawMaterials.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Selling Price: ₹{Number(p.sellingPrice).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Recipe Ingredients Builder */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Raw Materials / Ingredients Required:
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddIngredientRow}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center space-x-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Ingredient</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {recipeIngredients.map((row, idx) => {
                    const raw = rawMaterials.find((m) => m.id === row.ingredientId);
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center gap-3"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                          {idx + 1}
                        </span>

                        {/* Raw Material Selector */}
                        <div className="flex-1 w-full">
                          <select
                            value={row.ingredientId}
                            onChange={(e) => {
                              const updated = [...recipeIngredients];
                              updated[idx].ingredientId = e.target.value;
                              setRecipeIngredients(updated);
                            }}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
                          >
                            <option value="">-- Choose Raw Material --</option>
                            {rawMaterials.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} (Cost: ₹{Number(m.purchasePrice)}/{m.baseUnit})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quantity Required */}
                        <div className="w-24">
                          <label className="block text-[10px] text-slate-400 font-medium">Qty ({raw?.baseUnit || 'Unit'})</label>
                          <input
                            type="number"
                            step="0.001"
                            min="0.001"
                            value={row.quantityRequired}
                            onChange={(e) => {
                              const updated = [...recipeIngredients];
                              updated[idx].quantityRequired = Number(e.target.value);
                              setRecipeIngredients(updated);
                            }}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-center font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                          />
                        </div>

                        {/* Waste % */}
                        <div className="w-20">
                          <label className="block text-[10px] text-slate-400 font-medium">Loss %</label>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={row.wastePercentage}
                            onChange={(e) => {
                              const updated = [...recipeIngredients];
                              updated[idx].wastePercentage = Number(e.target.value);
                              setRecipeIngredients(updated);
                            }}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-center font-semibold text-slate-600 focus:border-amber-500 focus:outline-none"
                          />
                        </div>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredientRow(idx)}
                          className="p-1 text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Real-Time Food Cost & Margin Preview */}
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs space-y-1 text-amber-950 font-medium">
                <div className="flex justify-between">
                  <span>Selling Price:</span>
                  <span className="font-bold">₹{dishPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-800">
                  <span>Calculated Food Cost:</span>
                  <span className="font-bold">₹{estimatedCost.toFixed(2)} ({foodCostPct}%)</span>
                </div>
                <div className="flex justify-between text-emerald-800 font-bold border-t border-amber-200 pt-1">
                  <span>Estimated Profit / Dish:</span>
                  <span>₹{estimatedMargin.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition disabled:bg-slate-300 flex items-center space-x-1.5"
                >
                  {isSaving && <RefreshCw className="h-4 w-4 animate-spin" />}
                  <span>Save Recipe & Activate Backflushing</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
