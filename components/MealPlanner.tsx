'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import bundledRecipes from '@/lib/recipes.json';

type MealType = 'breakfast' | 'main';
type Recipe = { id: number | string; name: string; meal: MealType; protein: string; minutes: number; image: number; tags: string[]; ingredients: string[]; steps: string[] };
type Preferences = { servings: number; style: string; noPork: boolean; noSeafood: boolean };
type View = 'planner' | 'discover' | 'shopping' | 'saved' | 'settings';
type Period = 'day' | 'week' | 'month';
type Groc = { name: string; unit: string; qty: number; group: string };
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const DEFAULT_PREF: Preferences = { servings: 4, style: 'all', noPork: false, noSeafood: false };
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
const BY = ['Breakfast', 'Lunch', 'Dinner'];
const INITIAL_DATE = new Date(2026, 9, 29, 12);
const store = (key: string, value: unknown) => { try { localStorage.setItem(`lutongpinoy.${key}`, JSON.stringify(value)); } catch { /* Browsers with disabled storage */ } };
function read<T>(key: string, fallback: T): T { try { const val = localStorage.getItem(`lutongpinoy.${key}`); return val ? JSON.parse(val) as T : fallback; } catch { return fallback; } }
function dateAt(y: number, m: number, d: number) { return new Date(y, m, d, 12, 0, 0); }
function localToday() { const d = new Date(); return dateAt(d.getFullYear(), d.getMonth(), d.getDate()); }
function addDays(d: Date, n: number) { return dateAt(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function weekStart(d: Date) { return addDays(d, -(d.getDay() + 6) % 7); }
function monthStart(d: Date) { return dateAt(d.getFullYear(), d.getMonth(), 1); }
function monthEnd(d: Date) { return dateAt(d.getFullYear(), d.getMonth() + 1, 0); }
function daysBetween(start: Date, end: Date) { const out: Date[] = []; for (let d = start; d <= end; d = addDays(d, 1)) out.push(d); return out; }
function iso(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function dayNumber(d: Date) { return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2024, 0, 1)) / 86_400_000); }
function dateLabel(d: Date, opts: Intl.DateTimeFormatOptions) { return d.toLocaleDateString('en-PH', opts); }
function periodDays(d: Date, period: Period) { if (period === 'day') return [d]; if (period === 'week') return daysBetween(weekStart(d), addDays(weekStart(d), 6)); return daysBetween(monthStart(d), monthEnd(d)); }
function recipeImage(r: Recipe) {
  let i = r.image || 0; const n = r.name.toLowerCase();
  if (/arroz caldo|lugaw|champorado|sopas|sotanghon|misua|ginataang mais/.test(n)) i = 9;
  else if (/sinigang|nilaga/.test(n)) i = 1;
  else if (/tinola|pesang|binakol|sinampalukan/.test(n)) i = 2;
  else if (/kare.kare|curry|laing|ginataang|gising.gising/.test(n)) i = 4;
  else if (/pancit|palabok/.test(n)) i = 5;
  else if (/torta|omelet|scrambled eggs|eggs|silog/.test(n)) i = 6;
  else if (/monggo/.test(n)) i = 7;
  else if (/afritada|caldereta/.test(n)) i = 8;
  else if (/menudo|mechado|giniling/.test(n)) i = 10;
  else if (/pinakbet|chopsuey|vegetable|repolyo|sitaw|kangkong|sayote|ampalaya|dinengdeng/.test(n)) i = 11;
  else if (/grilled|inihaw|daing|paksiw na .*(bangus|galunggong)|tilapia|bangsilog|escabeche|bangus/.test(n)) i = 3;
  else if (/adobo|humba|paksiw na pata/.test(n)) i = 0;
  return `${BASE}/photos/dish-${((i % 12) + 12) % 12}.webp`;
}
function parseIngredient(text: string) {
  const m = text.match(/^([\d.]+)\s+(kg|g|pcs|pc|cloves|bunches|bunch|cans|can|ml|l|tbsp|tsp|pack|packs)\s+(.*)$/i);
  if (!m) return { qty: 1, unit: 'item', name: text };
  const names: Record<string, string> = { pcs: 'pc', bunches: 'bunch', cans: 'can', packs: 'pack' };
  return { qty: Number(m[1]), unit: names[m[2].toLowerCase()] || m[2].toLowerCase(), name: m[3] };
}
function formatAmount(qty: number, unit: string) {
  const units: Record<string, string> = { pc: 'pcs', bunch: 'bunches', can: 'cans', pack: 'packs' };
  return `${Number(qty.toFixed(2)).toLocaleString('en-PH')} ${units[unit] || unit}`;
}
function foodGroup(item: string) {
  const n = item.toLowerCase();
  if (/chicken|pork|beef|longganisa|tocino|tilapia|bangus|galunggong|shrimp|squid|crab|dilis|tuna|sardines|eggs|fish|tofu|kesong|lechon|danggit|corned beef|milk/.test(n)) return '🍗 Proteins & dairy';
  if (/rice|oats|noodles|sotanghon|pandesal|bread|macaroni|misua|bihon|canton|sweet potato/.test(n)) return '🍚 Rice, grains & bread';
  if (/banana|pineapple|papaya|mango|calamansi/.test(n)) return '🍌 Fruits';
  if (/soy sauce|vinegar|oil|salt|pepper|sugar|fish sauce|coconut milk|tomato sauce|sinigang mix|annatto|bagoong|broth/.test(n)) return '🧂 Pantry essentials';
  return '🥬 Vegetables & aromatics';
}
function csvCell(value: string | number) { return `"${String(value).replaceAll('"', '""')}"`; }
function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function eligibleRecipes(all: Recipe[], pref: Preferences, slot: number) {
  let list = all.filter(r => (slot === 0 ? r.meal === 'breakfast' : r.meal === 'main') &&
    (!pref.noPork || !r.ingredients.some(i => /\b(pork|longganisa|tocino|lechon)\b/i.test(i))) &&
    (!pref.noSeafood || !r.ingredients.some(i => /\b(fish|bangus|galunggong|tilapia|dilis|shrimp|squid|crab|tuna|sardines|danggit|oyster|tinapa)\b/i.test(i))));
  if (pref.style !== 'all') { const matched = list.filter(r => r.tags.includes(pref.style)); if (matched.length) list = matched; }
  // Group proteins in round-robin order so adjacent days have more variety.
  const buckets: Record<string, Recipe[]> = {};
  for (const r of list) { const group = ['fish', 'seafood'].includes(r.protein) ? 'seafood' : ['vegetarian', 'tofu', 'egg', 'dairy'].includes(r.protein) ? 'plant' : r.protein; (buckets[group] ||= []).push(r); }
  const ordered: Recipe[] = []; let last = '';
  while (ordered.length < list.length) {
    let choices = Object.keys(buckets).filter(k => buckets[k].length > 0 && k !== last).sort((a,b) => buckets[b].length - buckets[a].length);
    if (!choices.length) choices = Object.keys(buckets).filter(k => buckets[k].length > 0);
    const chosen = choices[0]; if (!chosen) break;
    ordered.push(buckets[chosen].shift()!); last = chosen;
  }
  return ordered;
}
const navItems: { view: View; icon: string; title: string; short: string }[] = [
  { view: 'planner', icon: '▦', title: 'Meal planner', short: 'Plan' },
  { view: 'discover', icon: '◈', title: 'Recipe library', short: 'Recipes' },
  { view: 'shopping', icon: '▤', title: 'Grocery list', short: 'Groceries' },
  { view: 'saved', icon: '♡', title: 'Favorites', short: 'Saved' },
  { view: 'settings', icon: '⚙', title: 'Preferences', short: 'Settings' },
];

export default function MealPlanner() {
  const [mounted, setMounted] = useState(false);
  const [pref, setPref] = useState<Preferences>(DEFAULT_PREF);
  const [favorites, setFavorites] = useState<(string | number)[]>([]);
  const [overrides, setOverrides] = useState<Record<string, string | number>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [custom, setCustom] = useState<Recipe[]>([]);
  const [view, setView] = useState<View>('planner');
  const [span, setSpan] = useState<Period>('day');
  const [grocerySpan, setGrocerySpan] = useState<Period>('week');
  const [date, setDate] = useState(INITIAL_DATE);
  const [selectedRecipe, setSelectedRecipe] = useState<string | number | null>(null);
  const [newRecipe, setNewRecipe] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [protein, setProtein] = useState('all');
  const [installEvent, setInstallEvent] = useState<InstallPrompt | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setPref(read('pref', DEFAULT_PREF)); setFavorites(read('favorites', [])); setOverrides(read('overrides', {}));
    setChecked(read('checked', {})); setCustom(read('custom', [])); setDate(localToday()); setMounted(true);
    const onInstall = (event: Event) => { event.preventDefault(); setInstallEvent(event as InstallPrompt); };
    window.addEventListener('beforeinstallprompt', onInstall);
    return () => window.removeEventListener('beforeinstallprompt', onInstall);
  }, []);
  useEffect(() => { if (mounted) store('pref', pref); }, [pref, mounted]);
  useEffect(() => { if (mounted) store('favorites', favorites); }, [favorites, mounted]);
  useEffect(() => { if (mounted) store('overrides', overrides); }, [overrides, mounted]);
  useEffect(() => { if (mounted) store('checked', checked); }, [checked, mounted]);
  useEffect(() => { if (mounted) store('custom', custom); }, [custom, mounted]);
  useEffect(() => { if (selectedRecipe !== null || newRecipe) { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; } }, [selectedRecipe, newRecipe]);
  const recipes = useMemo(() => [...bundledRecipes as Recipe[], ...custom], [custom]);
  const orderedBreakfast = useMemo(() => eligibleRecipes(recipes, pref, 0), [recipes, pref]);
  const orderedMains = useMemo(() => eligibleRecipes(recipes, pref, 1), [recipes, pref]);
  function getMeal(d: Date, slot: number): Recipe | null {
    const list = slot === 0 ? orderedBreakfast : orderedMains;
    if (!list.length) return null;
    const found = list.find(r => String(r.id) === String(overrides[`${iso(d)}|${slot}`]));
    if (found) return found;
    const n = dayNumber(d);
    const offset = slot === 0 ? n : 2 * n + slot - 1;
    return list[((offset % list.length) + list.length) % list.length];
  }
  function swapMeal(d: Date, slot: number) {
    const list = slot === 0 ? orderedBreakfast : orderedMains; if (list.length <= 1) return;
    const current = getMeal(d,slot);
    let index = list.findIndex(r => r.id === current?.id) + 1;
    let next = list[index % list.length];
    const other = slot === 1 ? getMeal(d, 2) : slot === 2 ? getMeal(d, 1) : null;
    if (other && next.id === other.id) next = list[(index + 1) % list.length];
    setOverrides(prev => ({ ...prev, [`${iso(d)}|${slot}`]: next.id }));
    flash('Swapped for a different Filipino dish.');
  }
  const period = useMemo(() => periodDays(date,span), [date,span]);
  const shoppingDays = useMemo(() => periodDays(date,grocerySpan), [date,grocerySpan]);
  const groceries = useMemo(() => {
    const ingredients: Record<string, Groc> = {};
    for (const d of shoppingDays) {
      for (let slot = 0; slot < 3; slot++) {
        const r = getMeal(d, slot); if (!r) continue;
        for (const text of r.ingredients) {
          const p = parseIngredient(text); let { qty, unit } = p;
          if (unit === 'kg') { qty *= 1000; unit = 'g'; }
          if (unit === 'l') { qty *= 1000; unit = 'ml'; }
          const k = `${p.name.toLowerCase()}|${unit}`;
          if (!ingredients[k]) ingredients[k] = { name:p.name, unit, qty:0, group:foodGroup(p.name) };
          ingredients[k].qty += qty * (pref.servings/4);
        }
      }
      const k = 'rice|g';
      if (!ingredients[k]) ingredients[k] = { name:'rice', unit:'g', qty:0, group:'🍚 Rice, grains & bread' };
      ingredients[k].qty += 180 * pref.servings; // Rough daily uncooked rice allowance for the family.
    }
    return Object.values(ingredients).map(it => {
      if (it.qty >= 1000 && it.unit === 'g') return { ...it,qty:it.qty/1000, unit:'kg' };
      if (it.qty >= 1000 && it.unit === 'ml') return { ...it,qty:it.qty/1000, unit:'l' };
      return it;
    }).sort((a,b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shoppingDays, orderedBreakfast, orderedMains, overrides, pref.servings]);
  const groupedGroceries = useMemo(() => {
    const out: Record<string, Groc[]> = {};
    for (const g of groceries) (out[g.group] ||= []).push(g);
    return out;
  }, [groceries]);
  const checkedCount = groceries.filter(g => checked[`${grocerySpan}|${iso(shoppingDays[0])}|${g.name}|${g.unit}`]).length;
  const selected = recipes.find(r => String(r.id) === String(selectedRecipe));
  const filterResults = recipes.filter(r => (view !== 'saved' || favorites.some(id => String(id)===String(r.id))) &&
    (category === 'all' || r.meal === category) && (protein === 'all' || r.protein === protein) &&
    (r.name.toLowerCase().includes(search.toLowerCase()) || r.ingredients.join(' ').toLowerCase().includes(search.toLowerCase())));
  function flash(text: string) { setNotice(text); window.setTimeout(() => setNotice(''), 3000); }
  function go(next: View) { setView(next); setSearch(''); setCategory('all'); setProtein('all'); window.scrollTo({top:0,behavior:'smooth'}); }
  function jump(dir: number) { setDate(d => span === 'day' ? addDays(d, dir) : span === 'week' ? addDays(d, dir*7) : dateAt(d.getFullYear(), d.getMonth()+dir, Math.min(d.getDate(),28))); }
  function toggleFavorite(id: string | number) { setFavorites(prev => prev.some(x => String(x)===String(id)) ? prev.filter(x => String(x)!==String(id)) : [...prev,id]); }
  function toggleCheck(g: Groc) { const key = `${grocerySpan}|${iso(shoppingDays[0])}|${g.name}|${g.unit}`; setChecked(prev => ({ ...prev, [key]: !prev[key] })); }
  function addCustomRecipe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const name = String(data.get('name') || '').trim();
    const ingredients = String(data.get('ingredients') || '').split('\n').map(x=>x.trim()).filter(Boolean);
    const steps = String(data.get('steps') || '').split('\n').map(x=>x.trim()).filter(Boolean);
    if (!name || !ingredients.length || !steps.length) return;
    const r: Recipe = { id:`custom-${Date.now()}`, name, meal:data.get('meal') === 'breakfast' ? 'breakfast':'main', protein:String(data.get('protein') || 'vegetarian'), minutes:Math.max(5,Number(data.get('minutes')) || 30), image:11, tags:['family'], ingredients, steps };
    setCustom(prev => [...prev, r]); setNewRecipe(false); flash('Added to your rotating recipe library.');
  }
  const timeLabel = span === 'day' ? dateLabel(date,{weekday:'long',month:'short',day:'numeric',year:'numeric'}) : span === 'week' ? `${dateLabel(weekStart(date),{month:'short',day:'numeric'})} – ${dateLabel(addDays(weekStart(date),6),{month:'short',day:'numeric',year:'numeric'})}` : dateLabel(date,{month:'long',year:'numeric'});
  const ingredientLabel = (s: string) => { const p = parseIngredient(s); return p.unit === 'item' ? s : `${formatAmount(p.qty*pref.servings/4,p.unit)} ${p.name}`; };
  const saveShopping = () => downloadCSV(`LutongPinoy_Groceries_${grocerySpan}.csv`, [['Category','Ingredient','Quantity','Unit'], ...groceries.map(g => [g.group,g.name,Number(g.qty.toFixed(2)),g.unit])]);
  const savePlan = () => downloadCSV(`LutongPinoy_Menu_${span}.csv`, [['Date','Meal','Recipe','Cook time (minutes)'], ...period.flatMap(d => [0,1,2].map(slot => [iso(d),BY[slot],getMeal(d,slot)?.name || '',getMeal(d,slot)?.minutes || 0]))]);

  function MealCard({ day, slot, mini = false }: { day: Date; slot: number; mini?: boolean }) {
    const r = getMeal(day,slot); if (!r) return <div className="empty-card">No matching dish. Try adjusting preferences.</div>;
    return <article className={`meal-card ${mini ? 'small-card' : ''}`}>
      <button className="meal-photo" onClick={()=>setSelectedRecipe(r.id)} aria-label={`View ${r.name} recipe`}><img src={recipeImage(r)} alt={`Illustrative Filipino food for ${r.name}`} loading="lazy" /><span className="photo-tag">{BY[slot]}</span></button>
      <div className="meal-details"><div className="meal-meta">⏱ {r.minutes} min <span>·</span> {r.protein}</div>
        <button className="text-link" onClick={()=>setSelectedRecipe(r.id)}><strong>{r.name}</strong></button>
        {!mini && <p>{r.tags.includes('healthy')?'🌿 Balanced option':r.tags.includes('budget')?'💰 Budget-friendly':'🍲 Lutong-bahay favorite'}</p>}
        <div className="meal-actions"><button onClick={()=>setSelectedRecipe(r.id)}>View recipe <span>↗</span></button><button onClick={()=>swapMeal(day,slot)} aria-label={`Swap ${r.name}`} title="Try another dish">↻ Swap</button></div>
      </div>
    </article>;
  }

  if (!mounted) return <div className="loading-screen">🍲 <strong>LutongPinoy</strong><span>Preparing your kitchen…</span></div>;

  return <div className="shell">
    <aside className="sidebar"><div className="brand"><div className="logo">🍲</div><div><strong>Lutong<span>Pinoy</span></strong><small>ANONG ULAM TODAY?</small></div></div>
      <nav className="desktop-nav" aria-label="Main menu">{navItems.map(item => <button key={item.view} onClick={()=>go(item.view)} className={view===item.view?'active':''}><span>{item.icon}</span>{item.title}</button>)}</nav>
      <div className="sidebar-bottom"><span>🌿</span><b>Made for lutong-bahay.</b><small>Plan less, cook more, share better meals.</small></div>
    </aside>
    <div className="app-main"><header className="topbar"><div>THE FILIPINO FAMILY KITCHEN <span className="muted">/</span> <strong>{navItems.find(item=>item.view===view)?.title.toUpperCase()}</strong></div><div className="top-right"><span className="filipino-pill">🇵🇭 Filipino recipes</span><span className="avatar">👩‍🍳</span></div></header>
      <main className="content">
        {view === 'planner' && <>
          <div className="intro"><div><div className="eyebrow">PLAN YOUR MEALS, THE FILIPINO WAY</div><h1>Anong lulutuin natin? <span>✳</span></h1><p>Fresh everyday meal ideas, complete recipes and one smart grocery list. From your kitchen to your family&apos;s table.</p></div><div className="intro-portion">👨‍👩‍👧‍👦 <b>Made for {pref.servings} people</b><small>Breakfast · Lunch · Dinner</small></div></div>
          <div className="toolbar"><div className="segmented">{(['day','week','month'] as Period[]).map(s=><button key={s} className={span===s?'active':''} onClick={()=>setSpan(s)}>{s[0].toUpperCase()+s.slice(1)}</button>)}</div>
            <div className="date-nav"><button aria-label="Previous period" onClick={()=>jump(-1)}>‹</button><strong>{timeLabel}</strong><button aria-label="Next period" onClick={()=>jump(1)}>›</button><button className="today" onClick={()=>setDate(localToday())}>Today</button></div>
            <button className="outline-btn export" onClick={savePlan}>↓ Export menu</button>
          </div>
          {span === 'day' && <div className="dashboard-grid"><section><div className="hero"><img src={`${BASE}/photos/dish-11.webp`} alt="Illustrative Filipino vegetable dish" /><div><span className="eyebrow">TODAY&apos;S TABLE</span><h2>Home-cooked goodness, every day.</h2><p>Three dishes, some variety and a whole lot of sarap.</p><button className="dark-btn" onClick={()=>go('shopping')}>Make a grocery list →</button></div></div>
            <div className="section-heading"><h2>On the menu</h2><small>{dateLabel(date,{weekday:'long',month:'long',day:'numeric'})}</small></div>
            <div className="daily-cards">{[0,1,2].map(slot=><MealCard day={date} slot={slot} key={`${iso(date)}-${slot}`} />)}</div></section>
            <aside className="right-rail"><div className="stats-card"><span className="eyebrow">YOUR KITCHEN AT A GLANCE</span><strong>{recipes.length}</strong><p>Filipino recipes to discover</p><div><span>Meals each day</span><b>3</b></div><div><span>Family members</span><b>{pref.servings}</b></div><div><span>Saved favorites</span><b>{favorites.length}</b></div></div><div className="tip-card"><span>💡 TIP OF THE DAY</span><h3>Make cooking simpler.</h3><p>Check what&apos;s already in your pantry before buying. Save favorite dishes to find them again.</p></div>
            <button className="rail-action" onClick={()=>setSpan('week')}>See the whole week →</button></aside></div>}
          {span === 'week' && <><div className="section-heading"><h2>Your week, sorted.</h2><small>7 days · 21 meals · {pref.servings} portions each</small></div><div className="week-list">{period.map(d=><div className="week-day" key={iso(d)}><button className={`weekday ${iso(d)===iso(localToday())?'today-day':''}`} onClick={()=>{setDate(d);setSpan('day');}}><span>{dateLabel(d,{weekday:'short'}).toUpperCase()}</span><strong>{d.getDate()}</strong><small>{dateLabel(d,{month:'short'})}</small></button><div className="week-meals">{[0,1,2].map(slot=><MealCard key={`${iso(d)}-${slot}`} day={d} slot={slot} mini />)}</div></div>)}</div></>}
          {span === 'month' && <><div className="section-heading"><h2>{dateLabel(date,{month:'long',year:'numeric'})} menu calendar</h2><small>Pick a date to see its meals</small></div><div className="month-calendar"><div className="month-weekdays">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=><span key={x}>{x}</span>)}</div><div className="month-days">{[...Array((monthStart(date).getDay()+6)%7).fill(null),...period].map((d: Date|null,i)=><div className={`month-cell ${d && iso(d)===iso(localToday())?'today-date':''}`} key={d?iso(d):`pad-${i}`}>{d && <button onClick={()=>{setDate(d);setSpan('day');}}><b>{d.getDate()}</b><span>{getMeal(d,0)?.name}</span><span>{getMeal(d,1)?.name}</span><span>{getMeal(d,2)?.name}</span></button>}</div>)}</div></div></>}
          <div className="bottom-banner"><div><strong>Ready to cook smarter?</strong><p>Build a shopping list for the whole week or month.</p></div><button className="primary-btn" onClick={()=>go('shopping')}>Create grocery list →</button></div>
        </>}
        {(view === 'discover' || view === 'saved') && <><div className="section-heading large"><div><span className="eyebrow">THE RECIPE COLLECTION</span><h1>{view==='saved'?'Your saved favorites':'Explore Filipino recipes'}</h1><p>{view==='saved'?'Dishes you love, all in one place.':'Traditional classics, everyday favorites, vegetables and regional dishes.'}</p></div><button className="primary-btn" onClick={()=>setNewRecipe(true)}>+ Add family recipe</button></div>
          <div className="filters"><input aria-label="Search recipes" placeholder="Search dish or ingredient…" value={search} onChange={e=>setSearch(e.target.value)} /><select aria-label="Meal category" value={category} onChange={e=>setCategory(e.target.value)}><option value="all">All meals</option><option value="breakfast">Breakfast</option><option value="main">Lunch & dinner</option></select><select aria-label="Protein filter" value={protein} onChange={e=>setProtein(e.target.value)}><option value="all">All proteins</option>{[...new Set(recipes.map(r=>r.protein))].sort().map(p=><option value={p} key={p}>{p}</option>)}</select></div>
          <p className="result-count">{filterResults.length} recipes found · Ingredient quantities scale to {pref.servings} people</p>
          <div className="recipe-grid">{filterResults.map(r=><article className="recipe-tile" key={r.id}><button className="recipe-image" onClick={()=>setSelectedRecipe(r.id)}><img src={recipeImage(r)} loading="lazy" alt={`Illustrative photograph of ${r.name}`} /></button><div className="tile-info"><div className="meal-meta">⏱ {r.minutes} min · {r.protein}</div><button className="tile-title" onClick={()=>setSelectedRecipe(r.id)}>{r.name}</button><div className="tile-foot"><small>{r.meal==='breakfast'?'Breakfast':'Lunch / Dinner'}</small><button aria-label="Toggle favorite" onClick={()=>toggleFavorite(r.id)} className={favorites.some(x=>String(x)===String(r.id))?'favorited':''}>{favorites.some(x=>String(x)===String(r.id))?'♥':'♡'}</button></div></div></article>)}</div>
          {!filterResults.length && <div className="empty-state">No recipes match your search. Try different filters or add your own recipe.</div>}
        </>}
        {view === 'shopping' && <><div className="section-heading large"><div><span className="eyebrow">ONE LIST, ZERO GUESSWORK</span><h1>Your palengke list</h1><p>Combined quantities for the recipes in your meal plan. Check off what you already have.</p></div><button className="primary-btn" onClick={saveShopping}>↓ Download CSV</button></div>
          <div className="shop-toolbar"><div className="segmented">{(['day','week','month'] as Period[]).map(s=><button key={s} onClick={()=>setGrocerySpan(s)} className={grocerySpan===s?'active':''}>{s[0].toUpperCase()+s.slice(1)}</button>)}</div><div className="shop-stat"><strong>{groceries.length}</strong> ingredients <span>·</span> <strong>{checkedCount}</strong> checked <span>·</span> {pref.servings} people</div></div>
          <div className="shopping-grid"><div>{Object.entries(groupedGroceries).map(([group,items])=><section className="grocery-group" key={group}><div className="grocery-heading"><h2>{group}</h2><small>{items.length} items</small></div>{items.map(g=>{const value=!!checked[`${grocerySpan}|${iso(shoppingDays[0])}|${g.name}|${g.unit}`];return <label className={`grocery-item ${value?'checked':''}`} key={`${g.name}|${g.unit}`}><input type="checkbox" checked={value} onChange={()=>toggleCheck(g)} /><span>{g.name}</span><strong>{formatAmount(g.qty,g.unit)}</strong></label>})}</section>)}</div>
          <aside className="grocery-aside"><div className="stats-card"><span className="eyebrow">SHOPPING OVERVIEW</span><strong>{shoppingDays.length}</strong><p>Days of planned meals</p><div><span>Number of meals</span><b>{shoppingDays.length*3}</b></div><div><span>Family size</span><b>{pref.servings}</b></div><div><span>Items checked</span><b>{checkedCount}/{groceries.length}</b></div></div><div className="tip-card"><span>🛒 SHOP SMARTER</span><p>Amounts are estimates for the selected dishes, not guaranteed package sizes. Review pantry staples before heading to the palengke.</p></div></aside></div>
        </>}
        {view === 'settings' && <><div className="section-heading large"><div><span className="eyebrow">MAKE IT YOUR KITCHEN</span><h1>Cooking preferences</h1><p>Personalize recommendations and portion sizes for your family.</p></div></div><div className="settings-card"><div className="setting"><div><h3>Servings per meal</h3><p>Ingredient quantities and grocery lists change with family size.</p></div><select value={pref.servings} onChange={e=>setPref({...pref,servings:Number(e.target.value)})}>{[1,2,3,4,5,6,7,8,10,12].map(n=><option key={n} value={n}>{n} {n===1?'person':'people'}</option>)}</select></div>
          <div className="setting"><div><h3>Recipe rotation style</h3><p>Choose which type of Filipino dishes appears more often.</p></div><select value={pref.style} onChange={e=>setPref({...pref,style:e.target.value})}><option value="all">All Filipino dishes</option><option value="healthy">Healthy & balanced</option><option value="budget">Budget-friendly</option><option value="classic">Traditional classics</option><option value="family">Family recipes</option></select></div>
          <div className="setting"><div><h3>Exclude pork</h3><p>Filter dishes listing pork or pork-based ingredients.</p></div><input type="checkbox" className="switch" checked={pref.noPork} onChange={e=>setPref({...pref,noPork:e.target.checked})} /></div>
          <div className="setting"><div><h3>Exclude fish and seafood</h3><p>Filter fish, shrimp, squid and other seafood from the planner.</p></div><input type="checkbox" className="switch" checked={pref.noSeafood} onChange={e=>setPref({...pref,noSeafood:e.target.checked})} /></div>
          <div className="setting"><div><h3>Clear meal swaps and grocery checks</h3><p>Keep your favorites and personal recipes.</p></div><button className="outline-btn" onClick={()=>{if(window.confirm('Clear saved meal swaps and grocery checkmarks?')){setOverrides({});setChecked({});flash('Meal swaps cleared.');}}}>Reset planner</button></div></div>
          <div className="install-card"><div><span className="eyebrow">SAVE LUTONGPINOY TO YOUR HOME SCREEN</span><h2>Install the cooking app</h2><p>On Android, use your browser&apos;s Install app option. On iPhone, use Safari → Share → Add to Home Screen. Once visited online, cached recipes and photos can be used without a connection.</p></div>{installEvent && <button className="primary-btn" onClick={async()=>{await installEvent.prompt();await installEvent.userChoice;setInstallEvent(null);}}>Install app ↓</button>}</div>
        </>}
      </main>
      <footer className="footer">Illustrative food photographs · Recipes are independent summaries of traditional Filipino methods. <span>Explore <a href="https://panlasangpinoy.com/" target="_blank" rel="noreferrer">Panlasang Pinoy</a> and <a href="https://www.kawalingpinoy.com/" target="_blank" rel="noreferrer">Kawaling Pinoy</a>.</span></footer>
    </div>
    <nav className="mobile-nav" aria-label="Mobile navigation">{navItems.map(item=><button key={item.view} onClick={()=>go(item.view)} className={view===item.view?'active':''}><span>{item.icon}</span>{item.short}</button>)}</nav>
    {selected && <Modal onClose={()=>setSelectedRecipe(null)}><div className="modal-cover"><img src={recipeImage(selected)} alt={`Illustrative photograph for ${selected.name}`} /></div><div className="modal-inner"><div className="eyebrow">{selected.meal==='breakfast'?'BREAKFAST':'LUNCH / DINNER'} · {selected.protein.toUpperCase()}</div><h2>{selected.name}</h2><div className="modal-meta"><span>⏱ {selected.minutes} minutes</span><span>👨‍👩‍👧‍👦 {pref.servings} servings</span>{selected.tags.map(t=><span key={t}>{t}</span>)}</div><div className="modal-tools"><button className="outline-btn" onClick={()=>toggleFavorite(selected.id)}>{favorites.some(x=>String(x)===String(selected.id))?'♥ Saved':'♡ Save favorite'}</button><button className="outline-btn" onClick={()=>window.print()}>⎙ Print recipe</button></div><h3>Ingredients</h3><p className="small-note">Scaled for {pref.servings} people. Check the ingredients you have.</p><ul className="ingredient-list">{selected.ingredients.map((s,i)=><li key={`${s}-${i}`}><label><input type="checkbox" /><span>{ingredientLabel(s)}</span></label></li>)}</ul><h3>How to cook</h3><ol className="steps-list">{selected.steps.map((s,i)=><li key={i}><b>{i+1}</b><span>{s}</span></li>)}</ol><div className="recipe-tip">💡 Times and ingredient amounts are starting estimates. Cook meat and seafood thoroughly; adjust seasoning to taste.</div></div></Modal>}
    {newRecipe && <Modal onClose={()=>setNewRecipe(false)}><div className="modal-inner new-recipe"><div className="eyebrow">YOUR FAMILY'S FAVORITES</div><h2>Add a Filipino recipe</h2><p>Custom dishes are saved on this device and added to the rotating planner.</p><form onSubmit={addCustomRecipe}><label>Dish name<input name="name" required placeholder="e.g., Lola's Chicken Adobo" /></label><div className="form-row"><label>Meal<select name="meal"><option value="main">Lunch / Dinner</option><option value="breakfast">Breakfast</option></select></label><label>Protein<select name="protein"><option value="chicken">Chicken</option><option value="pork">Pork</option><option value="fish">Fish</option><option value="seafood">Seafood</option><option value="beef">Beef</option><option value="vegetarian">Vegetarian</option><option value="egg">Egg</option><option value="tofu">Tofu</option></select></label></div><label>Cook time (minutes)<input name="minutes" type="number" defaultValue="30" min="5" max="360" /></label><label>Ingredients (one per line)<textarea name="ingredients" required rows={5} placeholder={'0.6 kg chicken\n2 tbsp soy sauce\n4 cloves garlic'} /></label><label>Cooking instructions (one step per line)<textarea name="steps" required rows={5} placeholder={'Sauté the aromatics.\nAdd the chicken and simmer.\nServe hot.'} /></label><button className="primary-btn" type="submit">Save recipe</button></form></div></Modal>}
    {notice && <div className="toast" role="status">{notice}</div>}
  </div>;
}

function Modal({ children, onClose }: {children: ReactNode; onClose: () => void}) {
  useEffect(() => { const onKey = (e:KeyboardEvent) => { if(e.key === 'Escape') onClose(); }; document.addEventListener('keydown',onKey); return ()=>document.removeEventListener('keydown',onKey); },[onClose]);
  return <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}} role="presentation"><div className="modal" role="dialog" aria-modal="true"><button className="modal-close" onClick={onClose} aria-label="Close recipe">×</button>{children}</div></div>;
}
