'use strict';

// ---------- Mappe ----------
// Ogni mappa ha il suo file di dati, i suoi testi e il suo spazio di
// salvataggio. L'Italia mantiene le chiavi e il seme del quotidiano storici,
// così partite e statistiche già salvate restano valide.
const MAPS = {
  italia: {
    tab: 'Italia',
    title: 'Province Italiane',
    file: 'data/italia.json',
    facts: 'data/facts/italia.json',
    one: 'provincia', many: 'province',
    placeholder: 'Scrivi una provincia…',
    unknown: 'Provincia non riconosciuta',
    already: 'è già stata inserita',
    ambiguous: 'Più province corrispondono: scegline una dalla lista',
    linksNote: '⛴️ I tratti di mare tratteggiati (Stretto di Messina, traghetto Livorno–Olbia) contano come confini.',
    zoomTitle: "Mostra tutta l'Italia",
    storagePrefix: 'pi_',
    seedOffset: 12345,
    minDist: 4, maxDist: 8,
    extraMin: 3, extraFactor: 0.8,
    codes: true,              // le sigle (RM, MI…) valgono come nomi
    // Nomi alternativi accettati in input (oltre al nome ufficiale e alla sigla).
    aliases: {
      AO: ['aosta', "valle d'aosta"],
      BZ: ['bolzano', 'bozen', 'alto adige', 'sudtirol'],
      FC: ['forli', 'cesena'],
      MB: ['monza', 'brianza', 'monza e brianza'],
      MS: ['massa', 'carrara'],
      PU: ['pesaro', 'urbino'],
      RC: ['reggio calabria'],
      RE: ['reggio emilia'],
      VB: ['verbania', 'vco'],
      BT: ['barletta', 'andria', 'trani', 'bat'],
      SP: ['spezia'],
      AQ: ['aquila'],
      OT: ['gallura', 'olbia', 'tempio', 'olbia tempio', 'nord est sardegna'],
      OG: ['lanusei', 'tortoli'],
      VS: ['sanluri', 'villacidro'],
      CI: ['sulcis', 'carbonia', 'iglesias', 'carbonia iglesias'],
    },
  },
  milano: {
    tab: 'Milano',
    title: 'Milano e Brianza',
    file: 'data/milano.json',
    facts: 'data/facts/milano.json',
    one: 'comune o quartiere', many: 'comuni o quartieri',
    placeholder: 'Scrivi un comune o un quartiere…',
    unknown: 'Comune o quartiere non riconosciuto',
    already: 'è già stato inserito',
    ambiguous: 'Più nomi corrispondono: scegline uno dalla lista',
    unknownHints: { milano: 'Milano è divisa nei suoi 88 quartieri: scrivi il nome di un quartiere (es. Duomo, Isola, Lambrate)' },
    linksNote: 'Il comune di Milano è diviso nei suoi 88 quartieri (NIL). 🛣️ San Colombano al Lambro è staccato dal resto della città metropolitana: il tratteggio che lo unisce a San Zenone al Lambro conta come un confine.',
    zoomTitle: 'Mostra tutta la mappa',
    storagePrefix: 'pi_milano_',
    seedOffset: 54321,
    minDist: 4, maxDist: Infinity,   // anche le tratte che attraversano la città, fino a 17 confini
    extraMin: 4, extraFactor: 1,
    codes: false,
    aliases: {},
  },
  germania: {
    tab: 'Germania',
    level: 'Länder',
    levels: ['germania', 'distretti'],   // livelli scelti dal selettore sotto la linguetta
    title: 'Länder della Germania',
    file: 'data/germania.json',
    facts: 'data/facts/germania.json',
    one: 'Land', many: 'Länder',
    placeholder: 'Scrivi un Land…',
    unknown: 'Land non riconosciuto',
    already: 'è già stato inserito',
    ambiguous: 'Più Länder corrispondono: scegline uno dalla lista',
    linksNote: 'Berlino è circondata dal Brandeburgo e Brema dalla Bassa Sassonia. Si accettano anche i nomi in tedesco.',
    zoomTitle: 'Mostra tutta la Germania',
    storagePrefix: 'pi_germania_',
    seedOffset: 4242,
    minDist: 3, maxDist: 5,
    extraMin: 2, extraFactor: 0.8,
    codes: true,
    aliases: {
      BW: ['baden wurttemberg', 'baden wuerttemberg'], BY: ['bayern'], BE: ['berlin'], BB: ['brandenburg'],
      HB: ['bremen'], HH: ['hamburg'], HE: ['hessen'], MV: ['mecklenburg vorpommern', 'meclemburgo'],
      NI: ['niedersachsen'], NW: ['nordrhein westfalen', 'nrw', 'vestfalia'], RP: ['rheinland pfalz', 'palatinato'],
      SL: ['saar', 'saarland'], SN: ['sachsen'], ST: ['sachsen anhalt'], SH: ['schleswig holstein'], TH: ['thuringen', 'thueringen'],
    },
  },
  distretti: {
    tab: 'Germania',
    level: 'Distretti',
    parent: 'germania',
    title: 'Distretti della Germania',
    file: 'data/distretti.json',
    facts: 'data/facts/distretti.json',
    one: 'distretto', many: 'distretti',
    placeholder: 'Scrivi un distretto…',
    unknown: 'Distretto non riconosciuto',
    already: 'è già stato inserito',
    ambiguous: 'Più distretti corrispondono: scegline uno dalla lista',
    linksNote: 'I distretti sono i 400 Kreise tedeschi, con i nomi in tedesco. Quando una città extracircondariale e un circondario hanno lo stesso nome sono indicati come (città) e (circondario), per esempio München (città) e München (circondario).',
    zoomTitle: 'Mostra tutta la Germania',
    storagePrefix: 'pi_distretti_',
    seedOffset: 9090,
    minDist: 4, maxDist: 7,
    extraMin: 4, extraFactor: 1,
    codes: false,
    aliases: {},
  },
  mondo: {
    tab: 'Mondo',
    level: 'Nazioni',
    levels: ['mondo', 'regioni'],
    title: 'Nazioni del mondo',
    file: 'data/mondo.json',
    facts: 'data/facts/mondo.json',
    one: 'nazione', many: 'nazioni',
    placeholder: 'Scrivi una nazione…',
    unknown: 'Nazione non riconosciuta',
    already: 'è già stata inserita',
    ambiguous: 'Più nazioni corrispondono: scegline una dalla lista',
    linksNote: '🚆 Il tunnel della Manica e 🌉 i ponti dell\'Øresund e di re Fahd contano come confini. Le nazioni senza confini terrestri (Giappone, Australia…) si possono nominare ma non collegano nulla e si colorano di nero.',
    zoomTitle: 'Mostra tutto il mondo',
    storagePrefix: 'pi_mondo_',
    seedOffset: 777,
    minDist: 4, maxDist: 8,
    extraMin: 3, extraFactor: 0.8,
    codes: false,
    aliases: {
      USA: ['usa', 'stati uniti d america', 'america'], GBR: ['uk', 'inghilterra', 'gran bretagna'],
      NLD: ['olanda'], CZE: ['cechia'], MMR: ['myanmar'], SWZ: ['swaziland'], MKD: ['macedonia'],
      TLS: ['timor leste', 'timor orientale'], RUS: ['federazione russa'], ARE: ['emirati'],
      COD: ['congo kinshasa', 'rd congo', 'rdc'], COG: ['congo brazzaville'], CAF: ['centrafrica'],
      DOM: ['dominicana'], VAT: ['vaticano'], MCO: ['monaco'], BIH: ['bosnia', 'erzegovina'],
      PNG: ['papua'], FSM: ['micronesia'], KNA: ['saint kitts'], VCT: ['saint vincent'], STP: ['sao tome'],
      ZAF: ['sud africa'], SDS: ['sud sudan'], MDA: ['moldova'], BLR: ['belarus'], KGZ: ['kirghizia'],
      THA: ['tailandia'], AZE: ['azerbaijan'], KAZ: ['kazakhstan'], TJK: ['tajikistan'], CIV: ['costa d avorio'],
      PSX: ['stato di palestina'], SAH: ['sahara occidentale'],
    },
  },
};
const ALPS_NOTE = 'L\'arco alpino da Nizza a Vienna, con le aree fino a circa 150 km dalle montagne: a sud fino a Milano e Venezia, a nord fino a Monaco di Baviera e Stoccarda. Comprende Italia, Francia, Svizzera, Liechtenstein, Austria, Germania, Slovenia e Monaco, le contee della Croazia settentrionale e le due contee ungheresi con le ultime colline alpine (Vas e Győr-Moson-Sopron).';
MAPS.alpi = {
  tab: 'Alpi',
  level: 'Regioni',
  levels: ['alpi', 'alpiprovince'],
  title: 'Regioni delle Alpi',
  file: 'data/alpi.json',
  facts: 'data/facts/alpi.json',
  one: 'regione', many: 'regioni',
  placeholder: 'Scrivi una regione…',
  unknown: 'Regione non riconosciuta',
  already: 'è già stata inserita',
  ambiguous: 'Più regioni corrispondono: scegline una dalla lista',
  linksNote: ALPS_NOTE + ' Le aree sono regioni italiane e francesi, Länder austriaci e tedeschi, cantoni svizzeri, le due regioni della Slovenia e le contee croate e ungheresi.',
  zoomTitle: 'Mostra tutte le Alpi',
  storagePrefix: 'pi_alpi_',
  seedOffset: 4807,
  minDist: 3, maxDist: Infinity,   // può capitare anche una tratta da un capo all'altro
  extraMin: 2, extraFactor: 0.8,
  codes: false,
  aliases: {},
};
MAPS.alpiprovince = {
  tab: 'Alpi',
  level: 'Province e distretti',
  parent: 'alpi',
  title: 'Province e distretti delle Alpi',
  file: 'data/alpiprovince.json',
  facts: 'data/facts/alpiprovince.json',
  one: 'area', many: 'aree',
  placeholder: 'Scrivi una provincia o un distretto…',
  unknown: 'Area non riconosciuta',
  already: 'è già stata inserita',
  ambiguous: 'Più aree corrispondono: scegline una dalla lista',
  linksNote: ALPS_NOTE + ' Le aree sono le province italiane, i dipartimenti francesi, i distretti svizzeri, austriaci e tedeschi, le regioni statistiche slovene e le contee croate e ungheresi. I distretti svizzeri sono quelli del 2014: nei Grigioni, per esempio, dal 2016 al loro posto ci sono le regioni. I cantoni senza distretti (Ginevra, Uri, Zugo…) contano come un\'area sola. Città e circondario con lo stesso nome sono indicati come (città) e (circondario).',
  zoomTitle: 'Mostra tutte le Alpi',
  storagePrefix: 'pi_alpiprovince_',
  seedOffset: 8848,
  minDist: 4, maxDist: Infinity,
  extraMin: 4, extraFactor: 0.8,
  codes: false,
  aliases: {},
};
MAPS.regioni = {
  tab: 'Mondo',
  level: 'Regioni',
  parent: 'mondo',
  title: 'Regioni del mondo',
  file: 'data/regioni.json',
  facts: 'data/facts/regioni.json',
  one: 'regione', many: 'regioni',
  placeholder: 'Scrivi una regione…',
  unknown: 'Regione non riconosciuta',
  already: 'è già stata inserita',
  ambiguous: 'Più regioni corrispondono: scegline una dalla lista',
  // Scrivere una nazione divisa in regioni non basta: si spiega cosa serve.
  unknownHints: Object.fromEntries(['italia', 'francia', 'germania', 'spagna', 'russia', 'cina', 'india',
    'brasile', 'stati uniti', 'usa', 'canada', 'australia', 'argentina', 'messico', 'regno unito', 'inghilterra']
    .map(n => [n, 'Qui si gioca con le regioni: scrivi una regione, uno stato o una provincia (es. Lombardia, Baviera, Texas)'])),
  linksNote: 'Le aree sono le suddivisioni di primo livello di ogni nazione (stati, regioni, province); nei paesi dove sono molto piccole, come Italia, Francia, Spagna e Regno Unito, sono accorpate in regioni. I piccoli stati restano interi. 🚆 Il tunnel della Manica e 🌉 i ponti dell\'Øresund, dello Storebælt, di re Fahd e di Johor contano come confini; le isole senza collegamenti si colorano di nero. Si accettano anche i nomi locali e in inglese.',
  zoomTitle: 'Mostra tutto il mondo',
  storagePrefix: 'pi_regioni_',
  seedOffset: 31337,
  minDist: 6, maxDist: 50,
  extraMin: 5, extraFactor: 0.6,
  codes: false,
  aliases: {},
};
const DEFAULT_MAP = 'italia';
const GAME_TITLE = 'Travel Maps';

// Versione della pubblicazione, presa dall'indirizzo dello script (game.js?v=...):
// i dati la ripetono, così una pagina nuova non usa dati vecchi rimasti in cache.
const VERSION = new URL(document.currentScript.src).searchParams.get('v');
const versioned = (url) => VERSION ? `${url}?v=${VERSION}` : url;

// Icona dallo sprite SVG di index.html.
const ic = (name) => `<svg class="ic" aria-hidden="true"><use href="#i-${name}"/></svg>`;

const EMOJI = { 'g-ok': '🟩', 'g-near': '🟧', 'g-far': '🟥', 'g-none': '⬛', hint: '💡' };
const DAILY_EPOCH = new Date(2024, 0, 1);
const REDUCED_MOTION = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Stato ----------
let mapKey = DEFAULT_MAP;
let MAP = MAPS[DEFAULT_MAP];
let DATA = null;
let NB = {};                   // id -> [id confinanti]
let SIGLAS = [];
let NAME_INDEX = {};           // testo normalizzato -> id (corrispondenze esatte)
let SEARCH_KEYS = [];          // [{sigla, key}] per l'autocompletamento
const dataCache = {};
const factsCache = {};

let game = null;
let view = null;               // viewBox corrente [x, y, w, h]
let showAll = false;           // vista della mappa intera invece dello zoom sulla partita
let countdownTimer = null;

const $ = (id) => document.getElementById(id);
const statsKey = () => MAP.storagePrefix + 'stats_v1';
const dailyPrefix = () => MAP.storagePrefix + 'daily_';

// ---------- Utilità ----------
// Minuscolo, senza accenti né apostrofi: "L'Aquila" -> "laquila", "Forlì" -> "forli".
function norm(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['’‘`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Variante con l'apostrofo trattato come spazio: "L'Aquila" -> "l aquila".
function normSpaced(s) {
  return norm(s.replace(/['’‘`]/g, ' '));
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }
    catch { return fallback; }
  },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage non disponibile */ } },
  remove(key) { try { localStorage.removeItem(key); } catch { /* idem */ } },
  keys() { try { return Object.keys(localStorage); } catch { return []; } },
};

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Indice del giorno secondo il fuso orario locale: il puzzle cambia a mezzanotte.
function dayNumber(d) {
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
}

function dailyId() {
  return dayNumber(new Date()) - dayNumber(DAILY_EPOCH) + 1;
}

function area(sig) { return DATA.areas[sig]; }

function shortName(sig) {
  return area(sig).name.split('/')[0];
}

// ---------- URL ----------
function mapFromUrl() {
  const key = new URLSearchParams(location.search).get('mappa');
  return MAPS[key] ? key : DEFAULT_MAP;
}

function urlFor(params = {}) {
  const q = new URLSearchParams();
  if (mapKey !== DEFAULT_MAP) q.set('mappa', mapKey);
  for (const [k, v] of Object.entries(params)) q.set(k, v);
  const s = q.toString();
  return location.pathname + (s ? '?' + s : '');
}

function syncUrl(params) {
  const next = urlFor(params);
  if (next !== location.pathname + location.search) history.replaceState(null, '', next);
}

// ---------- Grafo ----------
function bfs(src) {
  const dist = { [src]: 0 };
  const q = [src];
  for (let i = 0; i < q.length; i++) {
    const u = q[i];
    for (const v of NB[u]) {
      if (dist[v] === undefined) { dist[v] = dist[u] + 1; q.push(v); }
    }
  }
  return dist;
}

function shortestPath(a, b) {
  const prev = { [a]: null };
  const q = [a];
  for (let i = 0; i < q.length && prev[b] === undefined; i++) {
    for (const v of NB[q[i]]) {
      if (prev[v] === undefined) { prev[v] = q[i]; q.push(v); }
    }
  }
  const path = [];
  for (let c = b; c != null; c = prev[c]) path.unshift(c);
  return path;
}

// Il percorso ideale da mostrare a fine partita: tra i più corti, quello che
// passa per più aree già indovinate, così prosegue ciò che il giocatore ha fatto.
function idealPath() {
  const { distStart, distEnd, opt } = game;
  const owned = ownedSet();
  const best = { [game.start]: { score: 0, prev: null } };
  let layer = [game.start];
  for (let d = 1; d <= opt && layer.length; d++) {
    const next = new Set();
    for (const u of layer) {
      for (const v of NB[u]) {
        if (distStart[v] !== d || distEnd[v] !== opt - d) continue;
        const score = best[u].score + (owned.has(v) ? 1 : 0);
        if (!best[v] || score > best[v].score) best[v] = { score, prev: u };
        next.add(v);
      }
    }
    layer = [...next];
  }
  if (!best[game.end]) return shortestPath(game.start, game.end);
  const path = [];
  for (let c = game.end; c != null; c = best[c].prev) path.unshift(c);
  return path;
}

function connected(a, b, allowed) {
  const seen = new Set([a]);
  const q = [a];
  for (let i = 0; i < q.length; i++) {
    for (const v of NB[q[i]]) {
      if (v === b) return true;
      if (!seen.has(v) && allowed.has(v)) { seen.add(v); q.push(v); }
    }
  }
  return false;
}

// Il modo più economico per completare il percorso partendo da ciò che il
// giocatore ha già inserito: attraversare un'area già nota costa 0,
// qualsiasi altra costa 1 (BFS 0-1).
function bestCompletion() {
  const owned = ownedSet();
  const cost = { [game.start]: 0 };
  const prev = { [game.start]: null };
  const dq = [game.start];
  while (dq.length) {
    const u = dq.shift();
    for (const v of NB[u]) {
      const w = owned.has(v) ? 0 : 1;
      if (cost[v] === undefined || cost[u] + w < cost[v]) {
        cost[v] = cost[u] + w;
        prev[v] = u;
        if (w) dq.push(v); else dq.unshift(v);
      }
    }
  }
  const path = [];
  for (let c = game.end; c != null; c = prev[c]) path.unshift(c);
  return path.filter(s => !owned.has(s));
}

// ---------- Dati ----------
async function loadData(key) {
  if (!dataCache[key]) {
    const res = await fetch(versioned(MAPS[key].file));
    if (!res.ok) throw new Error('HTTP ' + res.status);
    dataCache[key] = await res.json();
  }
  mapKey = key;
  MAP = MAPS[key];
  DATA = dataCache[key];
  NB = {};
  SIGLAS = [];
  NAME_INDEX = {};
  SEARCH_KEYS = [];
  for (const sig in DATA.areas) {
    NB[sig] = DATA.areas[sig].neighbors.slice();
    SIGLAS.push(sig);
  }
  for (const [a, b] of DATA.links) {
    if (!NB[a].includes(b)) NB[a].push(b);
    if (!NB[b].includes(a)) NB[b].push(a);
  }
  for (const sig of SIGLAS) {
    const p = area(sig);
    const names = [p.name, ...p.name.split('/'), ...(MAP.aliases[sig] || []), ...(p.aliases || [])];
    const keys = new Set([...names.map(norm), ...names.map(normSpaced)]);
    for (const k of keys) {
      if (!k) continue;
      NAME_INDEX[k] = sig;
      SEARCH_KEYS.push({ sigla: sig, key: k });
    }
    if (MAP.codes) NAME_INDEX[norm(sig)] = sig;
  }
}

// ---------- Puzzle ----------
function pickPuzzle(rng) {
  for (let tries = 0; tries < 500; tries++) {
    const start = SIGLAS[Math.floor(rng() * SIGLAS.length)];
    const dist = bfs(start);
    const candidates = SIGLAS.filter(s => dist[s] >= MAP.minDist && dist[s] <= MAP.maxDist);
    if (candidates.length) return { start, end: candidates[Math.floor(rng() * candidates.length)] };
  }
  throw new Error('nessun puzzle valido');
}

function puzzleFromUrl() {
  const params = new URLSearchParams(location.search);
  const start = (params.get('da') || '').toUpperCase();
  const end = (params.get('a') || '').toUpperCase();
  if (!NB[start] || !NB[end] || start === end || NB[start].includes(end)) return null;
  return { start, end };
}

function makeGame(mode, fixed) {
  let puzzle, id = null, label;
  if (mode === 'daily') {
    id = dailyId();
    const dn = dayNumber(new Date());
    puzzle = pickPuzzle(mulberry32(dn * 2654435761 % 2147483647 + MAP.seedOffset));
    label = 'Puzzle #' + id;
  } else {
    puzzle = fixed || pickPuzzle(mulberry32((Math.random() * 2 ** 32) >>> 0));
    label = fixed ? 'Sfida' : 'Allenamento';
  }
  const distStart = bfs(puzzle.start);
  const distEnd = bfs(puzzle.end);
  const opt = distStart[puzzle.end];
  const needed = opt - 1;                       // aree intermedie minime
  const extra = Math.max(MAP.extraMin, Math.round(needed * MAP.extraFactor));
  return {
    mode, id, label,
    start: puzzle.start, end: puzzle.end, opt, needed,
    maxGuesses: needed + extra,
    distStart, distEnd,
    moves: [],              // [{sigla, type: 'guess'|'hint', color?}] in ordine cronologico
    over: false, won: false, gaveUp: false,
  };
}

const guesses = () => game.moves.filter(m => m.type === 'guess');
const isGuessed = (sig) => game.moves.some(m => m.type === 'guess' && m.sigla === sig);
const isHinted = (sig) => game.moves.some(m => m.type === 'hint' && m.sigla === sig);
// Livello di aiuto ricevuto su un'area: 1 = contorno, 2 = anche le iniziali.
// I suggerimenti salvati dalla versione precedente rivelavano il nome: contano come 2.
const hintLevel = (sig) => Math.max(0, ...game.moves
  .filter(m => m.type === 'hint' && m.sigla === sig).map(m => m.level || 2));
// Il nome di un'area suggerita resta nascosto finché non la si indovina.
const nameHidden = (sig) => !game.over && isHinted(sig) && !isGuessed(sig);

// Iniziali di ogni parola e un trattino basso per ogni altra lettera:
// "Reggio nell'Emilia" -> "R_____ n___'E_____".
function initials(sig) {
  let out = '', prevLetter = false;
  for (const ch of area(sig).name.split('/')[0]) {
    const letter = /\p{L}/u.test(ch);
    out += !letter ? ch : prevLetter ? '_' : ch;
    prevLetter = letter;
  }
  return out;
}

// Le iniziali con una casella per ogni lettera mancante, così si contano.
function initialsHtml(sig) {
  const text = initials(sig);
  const body = [...text].map(ch => ch === '_' ? '<span class="blank"></span>'
    : ch === ' ' ? '<span class="gap"></span>' : esc(ch)).join('');
  return `<span class="initials" role="img" aria-label="${esc(text)}">${body}</span>`;
}
const remaining = () => game.maxGuesses - game.moves.length;
const overPar = () => game.moves.length - game.needed;

function ownedSet() {
  const set = new Set([game.start, game.end]);
  for (const m of guesses()) set.add(m.sigla);
  return set;
}

function revealedList() {
  const list = [game.start, game.end, ...game.moves.map(m => m.sigla)];
  if (game.over) list.push(...idealPath());
  return [...new Set(list)];
}

// Colore in base a quanto l'area allunga il percorso ottimale.
function colorFor(sig) {
  // Aree senza alcun collegamento con partenza e arrivo (isole nel mondo).
  if (game.distStart[sig] === undefined) return 'g-none';
  const detour = game.distStart[sig] + game.distEnd[sig] - game.opt;
  if (detour <= 0) return 'g-ok';
  if (detour <= 2) return 'g-near';
  return 'g-far';
}

// ---------- Mappa ----------
function buildMap() {
  $('layer-context').innerHTML = DATA.context ? `<path class="context" d="${DATA.context}"/>` : '';
  $('layer-prov').innerHTML = SIGLAS.map(s =>
    `<path class="prov" id="p-${s}" data-sig="${s}" d="${area(s).path}"/>`).join('');
  $('layer-regions').innerHTML = Object.values(DATA.groups).map(d =>
    `<path class="region" d="${d}"/>`).join('');
  $('layer-sea').innerHTML = DATA.links.map(([a, b, icon]) => {
    const pa = area(a), pb = area(b);
    const mx = (pa.lx + pb.lx) / 2, my = (pa.ly + pb.ly) / 2;
    return `<g class="sea" data-a="${a}" data-b="${b}">` +
           `<line class="sea-edge" x1="${pa.lx}" y1="${pa.ly}" x2="${pb.lx}" y2="${pb.ly}"/>` +
           `<text class="ferry" x="${mx}" y="${my}">${icon}</text></g>`;
  }).join('');
}

function showTooltip(e) {
  const sig = e.target.dataset && e.target.dataset.sig;
  const tip = $('tooltip');
  if (!sig || !game || !revealedList().includes(sig)) { tip.hidden = true; return; }
  const p = area(sig);
  tip.innerHTML = nameHidden(sig)
    ? 'Prossimo passo suggerito'
    : `${esc(p.name)} <small>${esc(p.group)}</small>`;
  const rect = $('map-wrap').getBoundingClientRect();
  tip.style.left = (e.clientX - rect.left) + 'px';
  tip.style.top = (e.clientY - rect.top) + 'px';
  tip.hidden = false;
}
function hideTooltip() { $('tooltip').hidden = true; }

// Nel quotidiano in corso la mappa è nascosta: si vedono solo le aree già
// scoperte. A fine partita (e in allenamento) compare tutta la mappa.
const isFogged = () => game.mode === 'daily' && !game.over;

function paintMap() {
  const route = game.over ? idealPath() : [];
  const solution = new Set(route);
  const fog = isFogged();
  const shown = new Set(revealedList());
  $('map').classList.toggle('fog', fog);
  for (const g of $('layer-sea').children) {
    g.classList.toggle('hidden', fog && !(shown.has(g.dataset.a) && shown.has(g.dataset.b)));
  }
  for (const sig of SIGLAS) {
    const cls = ['prov'];
    if (fog && !shown.has(sig)) cls.push('hidden');
    if (sig === game.start) cls.push('start');
    else if (sig === game.end) cls.push('end');
    else {
      const g = game.moves.find(m => m.sigla === sig && m.type === 'guess');
      if (g) cls.push(g.color);
      else if (isHinted(sig)) cls.push('hint');
      else if (solution.has(sig)) cls.push('solution');
    }
    if (solution.has(sig)) cls.push('path-hl');
    $('p-' + sig).setAttribute('class', cls.join(' '));
  }
  // A fine partita una linea tratteggiata unisce le aree del percorso ideale.
  const pt = (s) => `${area(s).lx},${area(s).ly}`;
  $('layer-route').innerHTML = route.length < 2 ? '' :
    `<polyline class="route" points="${route.map(pt).join(' ')}"/>` +
    route.map(s => `<path class="stop" d="M${pt(s)}h0"/>`).join('');
  // Ordine di priorità: partenza, arrivo, a fine partita il percorso ideale,
  // poi le mosse dalla più recente.
  const order = [...new Set([game.start, game.end, ...route, ...game.moves.map(m => m.sigla).reverse(), ...shown])];
  $('layer-labels').innerHTML = order.map(s => {
    const p = area(s);
    return `<text class="label" x="${p.lx}" y="${p.ly}">${nameHidden(s) ? '?' : esc(shortName(s))}</text>`;
  }).join('');
  updateLabelSize();
}

// Nasconde le etichette che si sovrappongono a una con priorità più alta.
// Il nome resta disponibile toccando l'area e nell'elenco delle mosse.
function declutterLabels() {
  const kept = [];
  for (const el of $('layer-labels').children) {
    el.classList.remove('hidden');
    const b = el.getBBox();
    if (!b.width) continue;
    const clash = kept.some(k => b.x < k.x + k.width && k.x < b.x + b.width &&
                                 b.y < k.y + k.height && k.y < b.y + b.height);
    if (clash) el.classList.add('hidden');
    else kept.push(b);
  }
}

function bboxOf(sigs) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of sigs) {
    const b = area(s).bbox;
    x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]);
    x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]);
  }
  return [x0, y0, x1 - x0, y1 - y0];
}

// Adatta un riquadro alle proporzioni del contenitore.
function fitToWrap(box) {
  const wrap = $('map-wrap');
  const ratio = (wrap.clientWidth / wrap.clientHeight) || 1;
  let [x, y, w, h] = box;
  if (w / h < ratio) { const nw = h * ratio; x -= (nw - w) / 2; w = nw; }
  else { const nh = w / ratio; y -= (nh - h) / 2; h = nh; }
  return [x, y, w, h];
}

function targetView() {
  const full = DATA.viewBox;
  if (showAll) return fitToWrap(full);
  let [x, y, w, h] = bboxOf(revealedList());
  const pad = Math.max(w, h) * 0.2 + 20;
  x -= pad; y -= pad; w += 2 * pad; h += 2 * pad;
  const min = 160;
  if (w < min) { x -= (min - w) / 2; w = min; }
  if (h < min) { y -= (min - h) / 2; h = min; }
  if (w >= full[2] && h >= full[3]) return fitToWrap(full);
  return fitToWrap([x, y, w, h]);
}

// quick: durante un gesto si salta il ricalcolo delle etichette sovrapposte,
// che sulle mappe grandi è lento; si rifà alla fine del gesto.
function setView(v, quick = false) {
  view = v;
  $('map').setAttribute('viewBox', v.map(n => n.toFixed(1)).join(' '));
  updateLabelSize(quick);
}

function updateLabelSize(quick = false) {
  if (!view) return;
  const px = $('map-wrap').clientWidth || 500;
  const unitsPerPx = view[2] / px;
  $('layer-labels').setAttribute('font-size', (13 * unitsPerPx).toFixed(2));
  $('layer-sea').setAttribute('font-size', (14 * unitsPerPx).toFixed(2));
  if (!quick) declutterLabels();
}

// ---------- Zoom e spostamento a mano ----------
// Pizzico e trascinamento sul telefono, rotella e trascinamento col mouse,
// pulsanti + e −. Una nuova mossa riporta la vista sulla partita.
function clientToMap(cx, cy) {
  const r = $('map').getBoundingClientRect();
  return [view[0] + (cx - r.left) / r.width * view[2], view[1] + (cy - r.top) / r.height * view[3]];
}

function clampView([x, y, w, h]) {
  const full = fitToWrap(DATA.viewBox);
  const k = Math.min(Math.max(w, full[2] / 80), full[2] * 1.5) / w;   // da 80x a 1/1,5 della mappa intera
  const nw = w * k, nh = h * k;
  const cx = x + w / 2, cy = y + h / 2;
  // il centro della vista resta dentro la mappa
  const mx = Math.min(Math.max(cx, full[0]), full[0] + full[2]);
  const my = Math.min(Math.max(cy, full[1]), full[1] + full[3]);
  return [mx - nw / 2, my - nh / 2, nw, nh];
}

function zoomAt(factor, cx, cy, quick = false) {
  if (!view) return;
  cancelAnimationFrame(updateZoom.raf);
  const [px, py] = clientToMap(cx, cy);
  const [x, y, w, h] = view;
  const nw = w / factor, nh = h / factor;
  // il punto sotto il dito o il cursore resta fermo
  setView(clampView([px - (px - x) * nw / w, py - (py - y) * nh / h, nw, nh]), quick);
}

function zoomButton(factor) {
  const r = $('map').getBoundingClientRect();
  zoomAt(factor, r.left + r.width / 2, r.top + r.height / 2);
}

function initMapGestures() {
  const svg = $('map');
  const pointers = new Map();         // pointerId -> [x, y]
  let last = null;                    // {x, y, dist} della posizione precedente del gesto
  let moved = false;

  const snapshot = () => {
    const pts = [...pointers.values()];
    const x = pts.reduce((a, p) => a + p[0], 0) / pts.length;
    const y = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    const dist = pts.length > 1 ? Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]) : 0;
    return { x, y, dist };
  };

  svg.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    last = snapshot();
    if (pointers.size === 1) moved = false;
  });
  svg.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId) || !view) return;
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    const now = snapshot();
    if (!moved && Math.hypot(now.x - last.x, now.y - last.y) < 6 && pointers.size === 1) return;
    if (!moved) svg.setPointerCapture(e.pointerId);
    moved = true;
    hideTooltip();
    cancelAnimationFrame(updateZoom.raf);
    const r = svg.getBoundingClientRect();
    const [x, y, w, h] = view;
    let next = [x - (now.x - last.x) / r.width * w, y - (now.y - last.y) / r.height * h, w, h];
    setView(clampView(next), true);
    if (now.dist && last.dist) zoomAt(now.dist / last.dist, now.x, now.y, true);
    last = now;
  });
  const end = (e) => {
    if (!pointers.delete(e.pointerId)) return;
    last = pointers.size ? snapshot() : null;
    if (!pointers.size && moved) declutterLabels();
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
  // Un trascinamento non vale come tocco su un'area.
  svg.addEventListener('click', (e) => {
    if (moved) { e.stopImmediatePropagation(); moved = false; }
  }, true);

  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomAt(Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015)), e.clientX, e.clientY, true);
    clearTimeout(initMapGestures.wheelTimer);
    initMapGestures.wheelTimer = setTimeout(declutterLabels, 150);
  }, { passive: false });

  $('btn-zoom-in').addEventListener('click', () => zoomButton(1.6));
  $('btn-zoom-out').addEventListener('click', () => zoomButton(1 / 1.6));
}

function updateZoom(animate = true) {
  const to = targetView();
  const from = view;
  if (!animate || !from || REDUCED_MOTION) { setView(to); return; }
  const t0 = performance.now();
  const dur = 550;
  cancelAnimationFrame(updateZoom.raf);
  const step = (now) => {
    const t = Math.min(1, (now - t0) / dur);
    const k = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    setView(from.map((f, i) => f + (to[i] - f) * k));
    if (t < 1) updateZoom.raf = requestAnimationFrame(step);
  };
  updateZoom.raf = requestAnimationFrame(step);
}

function renderZoomButton() {
  const btn = $('btn-zoom');
  btn.innerHTML = ic(showAll ? 'target' : 'fit');
  btn.title = showAll ? 'Torna alla partita' : MAP.zoomTitle;
  btn.setAttribute('aria-label', btn.title);
}

function toggleShowAll() {
  showAll = !showAll;
  renderZoomButton();
  updateZoom();
}

// ---------- Interfaccia ----------
// Testi che dipendono dalla mappa: titolo, schede, input, aiuto.
function renderMapTexts() {
  document.title = `${GAME_TITLE} · ${MAP.title}`;
  const root = MAP.parent || mapKey;
  for (const btn of document.querySelectorAll('[data-map]')) {
    btn.setAttribute('aria-selected', String(btn.dataset.map === root));
  }
  // Selettore del livello (es. Länder | Distretti) per le mappe che ne hanno più di uno.
  const levels = MAPS[root].levels || [];
  $('levels').hidden = !levels.length;
  $('levels').innerHTML = levels.map(k =>
    `<button class="level" data-level="${k}" aria-pressed="${k === mapKey}">${esc(MAPS[k].level)}</button>`).join('');
  $('guess-input').placeholder = MAP.placeholder;
  $('guess-input').setAttribute('aria-label', MAP.placeholder.replace('…', ''));
  for (const el of document.querySelectorAll('[data-u]')) el.textContent = MAP[el.dataset.u];
  $('help-links').textContent = MAP.linksNote;
  $('legend-none').hidden = MAP !== MAPS.mondo && MAP !== MAPS.regioni;
  $('stats-map').textContent = MAP.level ? `${MAP.tab} · ${MAP.level}` : MAP.tab;
}

function renderAll() {
  $('start-name').textContent = area(game.start).name;
  $('end-name').textContent = area(game.end).name;
  $('puzzle-id').textContent = game.label;
  $('mode-daily').setAttribute('aria-pressed', String(game.mode === 'daily'));
  $('mode-practice').setAttribute('aria-pressed', String(game.mode !== 'daily'));
  $('btn-new').innerHTML = ic('shuffle') + (game.mode === 'daily' ? ' Allenamento' : ' Nuova partita');

  const playing = !game.over;
  $('guess-input').disabled = !playing;
  $('btn-guess').disabled = !playing;
  $('actions-play').hidden = !playing;
  $('actions-over').hidden = playing;
  resetGiveUp();
  renderHintButton();

  paintMap();
  renderStatus();
  renderMoves();
}

function renderStatus() {
  $('guess-count').innerHTML =
    `Tentativi rimasti: <b>${Math.max(0, remaining())}</b> <span class="muted">· minimo ${game.needed} ${MAP.many}</span>`;
  $('progress').innerHTML = Array.from({ length: game.maxGuesses }, (_, i) => {
    const m = game.moves[i];
    const cls = !m ? '' : (m.type === 'hint' ? 'hint' : m.color);
    return `<span class="seg ${cls}${i === game.needed - 1 ? ' par' : ''}"></span>`;
  }).join('');
}

function renderMoves() {
  // La mossa appena fatta entra con una breve animazione; il resto no.
  const fresh = renderMoves.game === game && game.moves.length > renderMoves.count;
  renderMoves.game = game;
  renderMoves.count = game.moves.length;
  $('guesses').innerHTML = game.moves.slice().reverse().map((m, i) => {
    const p = area(m.sigla);
    const cls = fresh && i === 0 ? ' new' : '';
    if (m.type === 'hint') {
      const level = m.level || 2;
      const what = !nameHidden(m.sigla) ? esc(p.name)
        : level === 1 ? 'Contorno sulla mappa' : initialsHtml(m.sigla);
      return `<li class="hint-row${cls}"><span class="dot hint"></span><span>${what}</span>` +
             `<span class="reg">${level === 1 ? 'suggerimento' : 'iniziali'}</span></li>`;
    }
    return `<li class="${cls.trim()}"><span class="dot ${m.color}"></span><span>${esc(p.name)}</span><span class="reg">${esc(p.group)}</span></li>`;
  }).join('');
}

function showMessage(text, kind = 'info', html = false) {
  const m = $('message');
  if (html) m.innerHTML = text; else m.textContent = text;
  m.className = 'message ' + kind;
  m.hidden = false;
  clearTimeout(showMessage.timer);
  if (kind !== 'err') showMessage.timer = setTimeout(clearMessage, 4000);
}
function clearMessage() { $('message').hidden = true; }

function shake() {
  const input = $('guess-input');
  input.classList.remove('shake');
  void input.offsetWidth;          // riavvia l'animazione
  input.classList.add('shake');
}

// ---------- Suoni ----------
// Sintetizzati al momento con Web Audio: nessun file audio da scaricare.
// Ogni esito ha il suo timbro; le scelte ottimali di fila salgono di tono.
// Sul telefono una breve vibrazione accompagna errori e fine partita.
let audioCtx = null;
let soundOn = store.get('pi_sound', true);
const soundLog = [];                 // ultimi suoni suonati (usato dai test)

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);   // numero MIDI -> Hz

function tone(freq, start, dur, { type = 'triangle', gain = .22, slide = 0 } = {}) {
  const t0 = audioCtx.currentTime + start;
  const osc = audioCtx.createOscillator();
  const env = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(freq * slide, t0 + dur);
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(env).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const SOUNDS = {
  // scelta sul percorso ideale: due note che salgono, più acute a ogni scelta ottimale di fila
  'g-ok': (step = 0) => { const b = 76 + step * 2; tone(NOTE(b), 0, .14); tone(NOTE(b + 5), .08, .22); },
  'g-near': () => tone(NOTE(67), 0, .22, { gain: .2 }),
  'g-far': () => { tone(NOTE(62), 0, .16, { gain: .2 }); tone(NOTE(57), .12, .26, { gain: .2 }); },
  'g-none': () => tone(110, 0, .3, { type: 'sine', gain: .35, slide: .6 }),
  error: () => tone(150, 0, .12, { type: 'square', gain: .06, slide: .8 }),
  hint: () => [84, 88, 91].forEach((n, i) => tone(NOTE(n), i * .06, .18, { type: 'sine', gain: .12 })),
  perfect: () => {
    [72, 76, 79, 84].forEach((n, i) => tone(NOTE(n), i * .1, .3));
    [72, 76, 79, 84].forEach(n => tone(NOTE(n), .45, .9, { type: 'sine', gain: .1 }));
  },
  win: () => [72, 76, 79].forEach((n, i) => tone(NOTE(n), i * .11, i === 2 ? .5 : .25)),
  lose: () => [67, 63, 60].forEach((n, i) => tone(NOTE(n), i * .16, i === 2 ? .6 : .26, { gain: .18 })),
};
const VIBRATION = { 'g-far': [35], 'g-none': [60, 40, 60], error: [25], perfect: [30, 60, 30, 60, 90], win: [30, 60, 60], lose: [140] };

function playSound(name, step = 0) {
  if (!soundOn) return;
  soundLog.push(name);
  if (soundLog.length > 20) soundLog.shift();
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    SOUNDS[name](step);
  } catch { /* audio non disponibile */ }
  if (VIBRATION[name] && navigator.vibrate) { try { navigator.vibrate(VIBRATION[name]); } catch { /* idem */ } }
}

// Quante scelte ottimali di fila chiudono l'elenco delle mosse.
function okStreak() {
  let n = 0;
  for (let i = game.moves.length - 1; i >= 0 && game.moves[i].type === 'guess' && game.moves[i].color === 'g-ok'; i--) n++;
  return n;
}

function renderSoundButton() {
  const btn = $('btn-sound');
  btn.innerHTML = ic(soundOn ? 'sound' : 'mute');
  btn.title = soundOn ? 'Disattiva i suoni' : 'Attiva i suoni';
  btn.setAttribute('aria-label', btn.title);
  btn.setAttribute('aria-pressed', String(soundOn));
}

function toggleSound() {
  soundOn = !soundOn;
  store.set('pi_sound', soundOn);
  renderSoundButton();
  playSound('g-ok');
}

// ---------- Mosse ----------
function submitGuess(sig) {
  if (game.over) return;
  if (!sig) { showMessage(MAP.unknown, 'err'); shake(); playSound('error'); return; }
  const name = area(sig).name;
  if (sig === game.start || sig === game.end) { showMessage(`${name} è già la partenza o l'arrivo`, 'warn'); shake(); playSound('error'); return; }
  if (isGuessed(sig)) { showMessage(`${name} ${MAP.already}`, 'warn'); shake(); playSound('error'); return; }

  const color = colorFor(sig);
  game.moves.push({ sigla: sig, type: 'guess', color });
  clearMessage();
  playSound(color, Math.min(okStreak() - 1, 6));
  afterMove();
}

// Il suggerimento procede a livelli sulla stessa area, ognuno costa un tentativo:
// prima il contorno sulla mappa (senza nome), poi le iniziali.
function pendingHint() {
  const m = game.moves.find(x => x.type === 'hint' && !isGuessed(x.sigla));
  return m ? m.sigla : null;
}

function giveHint() {
  if (game.over) return;
  const sig = pendingHint() || bestCompletion()[0];
  if (!sig) return;
  const level = hintLevel(sig);
  if (level >= 2) { showMessage(`Hai già tutti gli aiuti per questo passo: ${initialsHtml(sig)}`, 'info', true); return; }
  if (remaining() <= 1) { showMessage('Non hai abbastanza tentativi per un suggerimento', 'warn'); return; }
  game.moves.push({ sigla: sig, type: 'hint', level: level + 1 });
  playSound('hint');
  if (level === 0) showMessage('Il contorno del prossimo passo utile è sulla mappa', 'info');
  else showMessage(`Iniziali: ${initialsHtml(sig)}`, 'info', true);
  afterMove();
}

function renderHintButton() {
  const sig = pendingHint();
  const level = sig ? hintLevel(sig) : 0;
  $('btn-hint').innerHTML = ic('bulb') + (level === 0 ? ' Suggerimento <small>(−1 tentativo)</small>'
    : level === 1 ? ' Iniziali <small>(−1 tentativo)</small>'
    : ' Iniziali <small>(già usate)</small>');
}

function afterMove() {
  if (connected(game.start, game.end, ownedSet())) {
    game.won = true;
    game.over = true;
  } else if (remaining() <= 0) {
    game.over = true;
  }
  saveState();
  renderAll();
  updateZoom();
  if (game.over) {
    const end = !game.won ? 'lose' : overPar() <= 0 ? 'perfect' : 'win';
    setTimeout(() => playSound(end), 280);
    finish();
  }
}

function giveUp() {
  if (game.over) return;
  game.over = true;
  game.gaveUp = true;
  saveState();
  renderAll();
  updateZoom();
  playSound('lose');
  finish();
}

function resetGiveUp() {
  const btn = $('btn-giveup');
  clearTimeout(resetGiveUp.timer);
  btn.classList.remove('confirm');
  btn.innerHTML = ic('flag') + ' Mi arrendo';
}

function onGiveUpClick() {
  const btn = $('btn-giveup');
  if (btn.classList.contains('confirm')) { resetGiveUp(); giveUp(); return; }
  btn.classList.add('confirm');
  btn.textContent = 'Sicuro? Tocca di nuovo';
  resetGiveUp.timer = setTimeout(resetGiveUp, 3500);
}

function finish() {
  recordStats();
  const shown = game;
  setTimeout(() => { if (game === shown) showResult(); }, REDUCED_MOTION ? 0 : 700);
}

// ---------- Risultato e condivisione ----------
function scoreText() {
  if (!game.won) return game.gaveUp ? 'Arreso' : 'X';
  return overPar() <= 0 ? 'Perfetto' : '+' + overPar();
}

function showResult() {
  const route = `${area(game.start).name} → ${area(game.end).name}`;
  let title;
  if (game.won) title = overPar() <= 0 ? 'Perfetto!' : 'Completato!';
  else title = game.gaveUp ? 'Ti sei arreso' : 'Tentativi esauriti';
  $('result-title').textContent = title;
  $('result-title').className = game.won ? 'won' : 'lost';
  $('result-sub').textContent = `${route} · ${scoreText()} (${game.moves.length}/${game.maxGuesses})`;
  $('result-grid').innerHTML = game.moves.map(m =>
    `<i class="sq ${m.type === 'hint' ? 'hint' : m.color}"></i>`).join('') || '—';

  const path = idealPath();
  $('result-path').innerHTML = `<b>Un percorso ideale (${game.needed} ${MAP.many}):</b><br>` +
    path.map(s => `<span class="step">${esc(area(s).name)}</span>`).join(' <span class="sep">›</span> ');

  $('btn-practice').innerHTML = ic('shuffle') + (game.mode === 'daily' ? ' Allenamento' : ' Nuova partita');
  $('share-ok').hidden = true;
  renderFacts();
  openModal('result-modal');
  startCountdown();
}

// ---------- Curiosità ----------
// Caricate solo a fine partita: non pesano sull'avvio del gioco.
async function loadFacts(key) {
  if (!(key in factsCache)) {
    try {
      const res = await fetch(versioned(MAPS[key].facts));
      factsCache[key] = res.ok ? await res.json() : {};
    } catch {
      factsCache[key] = {};
    }
  }
  return factsCache[key];
}

// Una curiosità su partenza e arrivo, mostrata solo a partita vinta.
// Nel quotidiano la scelta è fissa per quel giorno, così è la stessa per tutti.
async function renderFacts() {
  const box = $('result-facts');
  box.hidden = true;
  box.innerHTML = '';
  if (!game.won) return;
  const shown = game;
  const facts = await loadFacts(mapKey);
  if (game !== shown) return;
  const seed = game.id || Math.floor(Math.random() * 1000);
  const items = [game.start, game.end].map((sig, i) => {
    const entry = facts[sig];
    if (!entry || !entry.facts || !entry.facts.length) return '';
    const text = entry.facts[(seed + i) % entry.facts.length];
    const src = (entry.sources || []).find(u => /^https?:\/\//.test(u));
    return `<div class="fact"><div class="fact-place">${esc(area(sig).name)}</div>` +
           `<p>${esc(text)}</p>` +
           (src ? `<a href="${esc(src)}" target="_blank" rel="noopener">Fonte</a>` : '') + '</div>';
  }).filter(Boolean);
  if (!items.length) return;
  box.innerHTML = '<b>Lo sapevi?</b>' + items.join('');
  box.hidden = false;
}

function startCountdown() {
  const el = $('next-puzzle');
  clearInterval(countdownTimer);
  if (game.mode !== 'daily') { el.hidden = true; return; }
  const tick = () => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const s = Math.max(0, Math.floor((next - now) / 1000));
    if (dailyId() !== game.id) {
      el.textContent = 'È disponibile un nuovo puzzle: ricarica la pagina!';
      clearInterval(countdownTimer);
    } else {
      const hh = String(Math.floor(s / 3600)).padStart(2, '0');
      const mm = String(Math.floor(s / 60) % 60).padStart(2, '0');
      const ss = String(s % 60).padStart(2, '0');
      el.textContent = `Prossimo puzzle tra ${hh}:${mm}:${ss}`;
    }
  };
  tick();
  el.hidden = false;
  countdownTimer = setInterval(tick, 1000);
}

function gameUrl() {
  if (!/^https?:/.test(location.protocol)) return '';
  const params = game.mode === 'daily' ? {} : { da: game.start, a: game.end };
  return location.origin + urlFor(params);
}

function shareText() {
  const head = game.mode === 'daily'
    ? `${GAME_TITLE} · ${MAP.title} #${game.id} · ${scoreText()}`
    : `${GAME_TITLE} · ${MAP.title} (${game.label.toLowerCase()}) · ${scoreText()}`;
  const route = `${area(game.start).name} → ${area(game.end).name}`;
  const grid = game.moves.map(m => EMOJI[m.type === 'hint' ? 'hint' : m.color]).join('');
  return [head, route, `${grid} (${game.moves.length}/${game.maxGuesses})`, gameUrl()].filter(Boolean).join('\n');
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback per contesti non sicuri (es. http://192.168.x.x)
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');
  ta.remove();
  if (!ok) throw new Error('copia non riuscita');
}

async function share() {
  const text = shareText();
  const touch = matchMedia('(pointer: coarse)').matches;
  if (navigator.share && touch) {
    try { await navigator.share({ text }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  try {
    await copyText(text);
    $('share-ok').textContent = 'Copiato negli appunti!';
  } catch {
    $('share-ok').textContent = 'Impossibile copiare: seleziona il testo qui sopra.';
  }
  $('share-ok').hidden = false;
}

// ---------- Statistiche ----------
function defaultStats() {
  return { played: 0, won: 0, streak: 0, maxStreak: 0, dist: {}, lastDailyId: null, lastWonId: null };
}

function loadStats() {
  const s = Object.assign(defaultStats(), store.get(statsKey(), {}));
  // compatibilità con la versione precedente, che non salvava lastWonId
  if (s.lastWonId == null && s.streak > 0) s.lastWonId = s.lastDailyId;
  return s;
}

function recordStats() {
  if (game.mode !== 'daily') return;
  const s = loadStats();
  if (s.lastDailyId === game.id) return;     // già registrata
  s.played++;
  if (game.won) {
    s.won++;
    s.streak = s.lastWonId === game.id - 1 ? s.streak + 1 : 1;
    s.maxStreak = Math.max(s.maxStreak, s.streak);
    s.lastWonId = game.id;
    const k = overPar() <= 0 ? 'P' : '+' + overPar();
    s.dist[k] = (s.dist[k] || 0) + 1;
  } else {
    s.streak = 0;
    s.dist.X = (s.dist.X || 0) + 1;
  }
  s.lastDailyId = game.id;
  store.set(statsKey(), s);
}

function renderStats() {
  const s = loadStats();
  const streak = s.lastWonId != null && s.lastWonId >= dailyId() - 1 ? s.streak : 0;
  const pct = s.played ? Math.round(s.won / s.played * 100) : 0;
  const rank = k => k === 'P' ? -1 : k === 'X' ? 999 : parseInt(k.slice(1), 10);
  const keys = Object.keys(s.dist).sort((a, b) => rank(a) - rank(b));
  const max = Math.max(1, ...keys.map(k => s.dist[k]));
  const label = k => k === 'P' ? 'Perfetto' : k === 'X' ? 'Perse' : k;
  const bars = keys.length
    ? keys.map(k => `<div class="dist-bar"><span class="k">${label(k)}</span>` +
        `<span class="bar${k === 'X' ? ' lost' : ''}" style="width:${Math.max(8, s.dist[k] / max * 100)}%">${s.dist[k]}</span></div>`).join('')
    : '<p class="muted small">Gioca il puzzle quotidiano per iniziare a raccogliere statistiche.</p>';
  $('stats-body').innerHTML = `
    <div class="stat-row">
      <div><div class="num">${s.played}</div><div class="lbl">Giocate</div></div>
      <div><div class="num">${pct}%</div><div class="lbl">Vittorie</div></div>
      <div><div class="num">${streak}</div><div class="lbl">Serie</div></div>
      <div><div class="num">${s.maxStreak}</div><div class="lbl">Record</div></div>
    </div>
    <div class="dist"><b>Distribuzione punteggi</b>${bars}</div>`;
}

// ---------- Salvataggio della partita quotidiana ----------
function saveState() {
  if (game.mode !== 'daily') return;
  store.set(dailyPrefix() + game.id, {
    start: game.start, end: game.end,
    moves: game.moves, over: game.over, won: game.won, gaveUp: game.gaveUp,
  });
}

function restoreState() {
  const saved = store.get(dailyPrefix() + game.id, null);
  // Il salvataggio vale solo se si riferisce allo stesso puzzle.
  if (!saved || saved.start !== game.start || saved.end !== game.end || !Array.isArray(saved.moves)) return;
  game.moves = saved.moves.filter(m => NB[m.sigla]);
  game.over = !!saved.over;
  game.won = !!saved.won;
  game.gaveUp = !!saved.gaveUp;
}

function pruneOldStates() {
  const keep = dailyId() - 7;
  for (const map of Object.values(MAPS)) {
    const prefix = map.storagePrefix + 'daily_';
    for (const k of store.keys()) {
      const n = k.startsWith(prefix) ? Number(k.slice(prefix.length)) : NaN;
      if (Number.isInteger(n) && n < keep) store.remove(k);
    }
  }
}

// ---------- Autocompletamento ----------
let suggestionList = [];
let activeSug = -1;

// Restituisce [[id, punteggio]] ordinati: 0 esatto, 1 inizio, 2 inizio parola, 3 contenuto.
function searchAreas(q) {
  const best = new Map();
  const consider = (sig, score) => { if (!best.has(sig) || score < best.get(sig)) best.set(sig, score); };
  if (MAP.codes && NAME_INDEX[q] && q.length <= 2) consider(NAME_INDEX[q], 0);   // sigla esatta
  for (const { sigla, key } of SEARCH_KEYS) {
    if (key === q) consider(sigla, 0);
    else if (key.startsWith(q)) consider(sigla, 1);
    else if (key.includes(' ' + q)) consider(sigla, 2);
    else if (q.length >= 3 && key.includes(q)) consider(sigla, 3);
  }
  return [...best].sort((a, b) => a[1] - b[1] ||
    area(a[0]).name.localeCompare(area(b[0]).name, 'it'));
}

const available = (sig) => sig !== game.start && sig !== game.end && !isGuessed(sig);

function updateSuggestions() {
  const q = norm($('guess-input').value);
  suggestionList = q ? searchAreas(q).filter(([s]) => available(s)).slice(0, 8).map(([s]) => s) : [];
  activeSug = -1;
  const box = $('suggestions');
  box.innerHTML = suggestionList.map((s, i) => {
    const p = area(s);
    return `<li id="sug-${i}" role="option" data-sig="${s}"><span>${esc(p.name)}</span><span class="reg">${esc(p.group)}</span></li>`;
  }).join('');
  setSuggestionsOpen(suggestionList.length > 0);
}

function setSuggestionsOpen(open) {
  $('suggestions').hidden = !open;
  $('guess-input').setAttribute('aria-expanded', String(open));
  if (!open) $('guess-input').removeAttribute('aria-activedescendant');
}

function moveSug(dir) {
  if (!suggestionList.length) return;
  activeSug = (activeSug + dir + suggestionList.length) % suggestionList.length;
  [...$('suggestions').children].forEach((li, i) => li.classList.toggle('active', i === activeSug));
  $('guess-input').setAttribute('aria-activedescendant', 'sug-' + activeSug);
}

// Cosa inviare quando si preme Invio senza aver scelto dalla lista.
function resolveTyped(raw) {
  const q = norm(raw);
  if (!q) return { empty: true };
  if (NAME_INDEX[q]) return { sig: NAME_INDEX[q] };
  const found = searchAreas(q);
  const open = found.filter(([s]) => available(s));
  if (open.length === 1) return { sig: open[0][0] };
  if (open.length > 1 && open[0][1] < open[1][1]) return { sig: open[0][0] };
  if (open.length > 1) return { ambiguous: true };
  return { sig: found.length ? found[0][0] : null };
}

function pick(sig) {
  $('guess-input').value = '';
  setSuggestionsOpen(false);
  submitGuess(sig);
  $('guess-input').focus();
}

function onSubmit(e) {
  e.preventDefault();
  if (activeSug >= 0) { pick(suggestionList[activeSug]); return; }
  const r = resolveTyped($('guess-input').value);
  if (r.empty) return;
  if (r.ambiguous) { showMessage(MAP.ambiguous, 'warn'); return; }
  const tip = !r.sig && (MAP.unknownHints || {})[norm($('guess-input').value)];
  if (tip) { showMessage(tip, 'warn'); shake(); playSound('error'); return; }
  pick(r.sig);
}

// ---------- Modali ----------
let lastFocus = null;
function openModal(id) {
  closeModals(false);
  lastFocus = document.activeElement;
  $(id).hidden = false;
  const btn = $(id).querySelector('.primary') || $(id).querySelector('.close');
  if (btn) btn.focus();
}
function closeModals(restoreFocus = true) {
  document.querySelectorAll('.modal').forEach(m => { m.hidden = true; });
  clearInterval(countdownTimer);
  if (restoreFocus && lastFocus && lastFocus.focus) lastFocus.focus();
}

// ---------- Avvio ----------
function startGame(mode, fixed) {
  game = makeGame(mode, fixed);
  if (mode === 'daily') {
    restoreState();
    syncUrl();
  }
  showAll = false;
  renderZoomButton();
  clearMessage();
  setSuggestionsOpen(false);
  $('guess-input').value = '';
  renderAll();
  updateZoom(view !== null);
}

function newPractice() {
  closeModals(false);
  syncUrl();
  startGame('practice');
  $('guess-input').focus();
}

// fromTab: il clic sulla linguetta già aperta non cambia il livello scelto;
// il selettore dei livelli invece passa sempre al livello indicato.
async function switchMap(key, fromTab = false) {
  if (key === mapKey && game) return;
  if (fromTab && MAPS[key].levels && MAPS[key].levels.includes(mapKey) && game) return;
  closeModals(false);
  await loadData(key);
  view = null;
  buildMap();
  renderMapTexts();
  syncUrl();
  startGame('daily');
}

function init() {
  buildMap();
  renderMapTexts();
  pruneOldStates();
  const challenge = puzzleFromUrl();
  startGame(challenge ? 'practice' : 'daily', challenge);

  const svg = $('map');
  initMapGestures();
  svg.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && !e.buttons) showTooltip(e); });
  svg.addEventListener('pointerleave', hideTooltip);
  svg.addEventListener('click', (e) => {
    showTooltip(e);
    clearTimeout(showTooltip.timer);
    showTooltip.timer = setTimeout(hideTooltip, 1800);
  });

  $('guess-form').addEventListener('submit', onSubmit);
  const input = $('guess-input');
  input.addEventListener('input', updateSuggestions);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveSug(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveSug(-1); }
    else if (e.key === 'Escape') setSuggestionsOpen(false);
  });
  input.addEventListener('blur', () => setTimeout(() => setSuggestionsOpen(false), 120));
  // Alla pressione si evita solo che l'input perda il focus (e chiuda la lista).
  // La scelta avviene sul click: se la lista sparisse già alla pressione, su
  // touch screen il click finirebbe sul pulsante che c'è sotto.
  $('suggestions').addEventListener('pointerdown', (e) => e.preventDefault());
  $('suggestions').addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (li) pick(li.dataset.sig);
  });

  for (const btn of document.querySelectorAll('[data-map]')) {
    btn.addEventListener('click', () => switchMap(btn.dataset.map, true).catch(showLoadError));
  }
  $('levels').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-level]');
    if (btn && btn.dataset.level !== mapKey) switchMap(btn.dataset.level).catch(showLoadError);
  });
  $('btn-hint').addEventListener('click', giveHint);
  $('btn-giveup').addEventListener('click', onGiveUpClick);
  $('btn-show-result').addEventListener('click', showResult);
  $('btn-new').addEventListener('click', newPractice);
  $('btn-practice').addEventListener('click', newPractice);
  $('btn-share').addEventListener('click', share);
  $('btn-zoom').addEventListener('click', toggleShowAll);
  $('mode-daily').addEventListener('click', () => { if (game.mode !== 'daily') startGame('daily'); });
  $('mode-practice').addEventListener('click', () => { if (game.mode === 'daily') newPractice(); });
  $('btn-help').addEventListener('click', () => openModal('help-modal'));
  $('btn-sound').addEventListener('click', toggleSound);
  renderSoundButton();
  $('btn-stats').addEventListener('click', () => { renderStats(); openModal('stats-modal'); });

  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeModals()));
  document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', (e) => {
    if (e.target === m) closeModals();
  }));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.querySelector('.modal:not([hidden])')) closeModals();
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => updateZoom(false), 100);
  });

  if (!store.get('pi_seen_help', false)) {
    openModal('help-modal');
    store.set('pi_seen_help', true);
  }
}

function showLoadError(err) {
  document.querySelector('main').innerHTML =
    `<p class="load-error">Errore nel caricamento dei dati: ${esc(err.message)}</p>`;
}

loadData(mapFromUrl()).then(init).catch(showLoadError);
