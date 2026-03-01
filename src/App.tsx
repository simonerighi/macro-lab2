
import React, { useEffect, useMemo, useState } from 'react';

type NumMap = Record<string, number>;
type Field = { key: string; label: string; min?: number; max?: number; step?: number };
type Scale = { x: (v: number) => number; y: (v: number) => number; x0: number; y0: number; w: number; h: number; xMin:number; xMax:number; yMin:number; yMax:number; };

const MODEL_LIST = [
  { id: 'intro', label: '1. Identità macroeconomiche di base' },
  { id: 'kc', label: '2. Mercato dei beni / Keynesian Cross' },
  { id: 'is', label: '3. Curva IS' },
  { id: 'lm', label: '4. Mercato della moneta / LM classica' },
  { id: 'islmFlat', label: '5. IS-LM con BC che fissa il tasso' },
  { id: 'islmRisk', label: '6. IS-LM con tasso reale e premio al rischio' },
  { id: 'wsps', label: '7. Mercato del lavoro WS-PS' },
  { id: 'phillips', label: '8. Phillips curve con aspettative' },
  { id: 'islmpc', label: '9. Modello IS-LM-PC integrato' },
  { id: 'openGoods', label: '11. Economia aperta: mercato dei beni' },
  { id: 'uip', label: '12. UIP' },
  { id: 'islmuip', label: '13. IS-LM-UIP' },
  { id: 'islmuipExt', label: '14. IS-LM-UIP esteso' },
];

function clamp(v: number, min = -Infinity, max = Infinity) {
  return Math.min(max, Math.max(min, v));
}
function round(v: number, d = 2) {
  if (!Number.isFinite(v)) return NaN;
  const m = Math.pow(10, d);
  return Math.round(v * m) / m;
}
function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue] as const;
}
function makeScale(xMin:number, xMax:number, yMin:number, yMax:number, W=540, H=300, pad=40): Scale {
  const w = W - 2*pad, h = H - 2*pad;
  const dx = Math.max(1e-9, xMax - xMin), dy = Math.max(1e-9, yMax - yMin);
  return {
    x: (v:number) => pad + (v - xMin) * w / dx,
    y: (v:number) => pad + (yMax - v) * h / dy,
    x0: pad, y0: pad, w, h, xMin, xMax, yMin, yMax
  };
}
function pointsString(points:number[][], s:Scale) {
  return points.map(([x,y]) => `${s.x(x).toFixed(2)},${s.y(y).toFixed(2)}`).join(' ');
}
function range(start:number, stop:number, n=40) {
  const out:number[] = [];
  if (n <= 1) return [start];
  const step = (stop - start)/(n-1);
  for (let i=0;i<n;i++) out.push(start + i*step);
  return out;
}
function euro(v:number) {
  if (!Number.isFinite(v)) return '—';
  return round(v,2).toFixed(2);
}
function warnMultiplier(c1:number) {
  return c1 > 0.95 ? 'Attenzione: c1 è molto vicino a 1; il moltiplicatore diventa molto elevato e poco realistico.' : '';
}

function Card({children, className=''}:{children:any; className?:string}) {
  return <div className={`card ${className}`}>{children}</div>;
}
function SectionTitle({children}:{children:any}) {
  return <div className="sectionTitle">{children}</div>;
}
function FieldGrid({fields, params, setParams}:{fields:Field[]; params:NumMap; setParams:(v:NumMap)=>void}) {
  return <div className="fieldGrid">
    {fields.map(f => (
      <label className="fieldRow" key={f.key}>
        <span>{f.label}</span>
        <input
          type="number"
          value={params[f.key]}
          min={f.min}
          max={f.max}
          step={f.step ?? 0.1}
          onChange={e => setParams({ ...params, [f.key]: Number(e.target.value) })}
        />
      </label>
    ))}
  </div>;
}
function Summary({items}:{items:{label:string; value:any}[]}) {
  return <div className="summaryGrid">
    {items.map((it, idx) => <div className="summaryCard" key={idx}>
      <div className="summaryLabel">{it.label}</div>
      <div className="summaryValue">{String(it.value)}</div>
    </div>)}
  </div>;
}
function Plot({title, subtitle, xLabel, yLabel, xMin, xMax, yMin, yMax, note, children}:{title:string; subtitle?:string; xLabel:string; yLabel:string; xMin:number; xMax:number; yMin:number; yMax:number; note?:string; children:(s:Scale)=>React.ReactNode}) {
  const s = makeScale(xMin, xMax, yMin, yMax);
  const gx = range(xMin, xMax, 6);
  const gy = range(yMin, yMax, 6);
  return <Card className="chartCard">
    <div className="chartHead">
      <div>
        <div className="chartTitle">{title}</div>
        {subtitle && <div className="chartSubtitle">{subtitle}</div>}
      </div>
    </div>
    <svg viewBox="0 0 540 300" className="chartSvg">
      {gx.map((v, i) => <g key={i}>
        <line x1={s.x(v)} y1={s.y0} x2={s.x(v)} y2={s.y0+s.h} className="gridLine" />
        <text x={s.x(v)} y={s.y0+s.h+18} textAnchor="middle" className="axisText">{round(v,1)}</text>
      </g>)}
      {gy.map((v, i) => <g key={i}>
        <line x1={s.x0} y1={s.y(v)} x2={s.x0+s.w} y2={s.y(v)} className="gridLine" />
        <text x={s.x0-8} y={s.y(v)+4} textAnchor="end" className="axisText">{round(v,1)}</text>
      </g>)}
      <line x1={s.x0} y1={s.y0+s.h} x2={s.x0+s.w} y2={s.y0+s.h} className="axisLine" />
      <line x1={s.x0} y1={s.y0} x2={s.x0} y2={s.y0+s.h} className="axisLine" />
      <text x={s.x0+s.w} y={s.y0+s.h+34} textAnchor="end" className="axisLabel">{xLabel}</text>
      <text x={18} y={18} textAnchor="start" className="axisLabel">{yLabel}</text>
      {children(s)}
    </svg>
    {note && <div className="note">{note}</div>}
  </Card>;
}
function LinkButton({onClick, children}:{onClick:()=>void; children:any}) {
  return <button className="secondary" onClick={onClick}>{children}</button>;
}
function ModelShell({title, description, controls, outputs, narrative, warning, charts}:{title:string; description:string; controls:any; outputs:any; narrative:any; warning?:string; charts:any}) {
  return <div className="modelShell">
    <Card>
      <SectionTitle>{title}</SectionTitle>
      <div className="description">{description}</div>
      {warning && <div className="warning">{warning}</div>}
      {controls}
      {outputs}
      <SectionTitle>Narrazione automatica</SectionTitle>
      <div className="narrative">{narrative}</div>
    </Card>
    <div className="chartsArea">{charts}</div>
  </div>;
}
function ShockControls({enabled, setEnabled, shock, setShock, shockSize, setShockSize, options}:{enabled:boolean; setEnabled:(v:boolean)=>void; shock:string; setShock:(v:string)=>void; shockSize:number; setShockSize:(v:number)=>void; options:{id:string; label:string}[]}) {
  return <>
    <div className="lineControls">
      <button className={enabled ? 'primary' : ''} onClick={() => setEnabled(!enabled)}>{enabled ? 'Shock ON' : 'Shock OFF'}</button>
      <label className="checkboxRow"><span>Mostra confronto prima/dopo</span><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} /></label>
    </div>
    <div className="fieldRow inline">
      <span>Tipo shock</span>
      <select value={shock} onChange={e => setShock(e.target.value)}>
        {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </div>
    <label className="fieldRow">
      <span>Intensità shock</span>
      <input type="number" value={shockSize} step={0.5} onChange={e => setShockSize(Number(e.target.value))} />
    </label>
  </>;
}
function linePoints(xs:number[], fn:(x:number)=>number, yMin?:number, yMax?:number) {
  return xs.map(x => [x, fn(x)]);
}
function applyShock(base:NumMap, shock:string, size:number):NumMap {
  const p = { ...base };
  switch (shock) {
    case 'g_up': p.G += size; break;
    case 'g_down': p.G -= size; break;
    case 't_up': p.T += size; break;
    case 't_down': p.T -= size; break;
    case 'i_down': if ('iBar' in p) p.iBar -= size; if ('iTarget' in p) p.iTarget -= size; break;
    case 'i_up': if ('iBar' in p) p.iBar += size; if ('iTarget' in p) p.iTarget += size; break;
    case 'm_up': p.M += size; break;
    case 'm_down': p.M -= size; break;
    case 'i0_up': p.I0 += size; if ('Ibar' in p) p.Ibar += size; break;
    case 'i0_down': p.I0 -= size; if ('Ibar' in p) p.Ibar -= size; break;
    case 'c0_up': p.c0 += size; break;
    case 'c0_down': p.c0 -= size; break;
    case 'pie_up': p.piE += size; if ('piAnchor' in p) p.piAnchor += size; break;
    case 'pie_down': p.piE -= size; if ('piAnchor' in p) p.piAnchor -= size; break;
    case 'risk_up': p.x += size; if ('rho' in p) p.rho += size; break;
    case 'risk_down': p.x -= size; if ('rho' in p) p.rho -= size; break;
    case 'y_up': if ('Y' in p) p.Y += size; break;
    case 'y_down': if ('Y' in p) p.Y -= size; break;
    case 'ystar_up': if ('YStar' in p) p.YStar += size; break;
    case 'ystar_down': if ('YStar' in p) p.YStar -= size; break;
    case 'eexp_up': p.Ee += size; break;
    case 'eexp_down': p.Ee -= size; break;
    case 'istar_up': p.iStar += size; break;
    case 'istar_down': p.iStar -= size; break;
    case 'v_up': p.v += size; break;
    case 'v_down': p.v -= size; break;
    case 'yn_up': p.Yn += size; break;
    case 'yn_down': p.Yn -= size; break;
    default: break;
  }
  return p;
}

function BetaGate({onEnter}:{onEnter:()=>void}) {
  return <div className="betaGate">
    <div className="betaCard">
      <h1>Introduzione alla Macroeconomia</h1>
      <p className="betaSub">Università di Modena e Reggio Emilia – Dipartimento di Economia “Marco Biagi”</p>
      <p>Questa è una <b>versione beta</b> della web app didattica.</p>
      <ul>
        <li>Sviluppata da <b>Simone Righi</b> come supporto per studenti di introduzione alla macroeconomia.</li>
        <li>Non si esclude la presenza di errori. Se ne identifichi, scrivi al docente includendo anche eventuali screenshot.</li>
        <li>Le versioni mostrate sono applicazioni lineari di modelli più generali visti a lezione.</li>
        <li>La linearità introduce assunzioni sull’economia non sempre realistiche, ma rende i calcoli più accessibili.</li>
        <li>La logica d’uso è: osservare il legame fra equazioni, grafici e movimenti generati dagli shock.</li>
      </ul>
      <button className="primary big" onClick={onEnter}>Entra nell’app</button>
    </div>
  </div>;
}

function IntroModel() {
  const defaults = { C:50, I:20, G:25, X:18, IM:15, T:22 };
  const [p, setP] = usePersistentState<NumMap>('intro-params', defaults);
  const NX = p.X - p.IM;
  const Y = p.C + p.I + p.G + NX;
  const YD = Y - p.T;
  const S = Y - p.C - p.T;
  const items = [
    ['C', p.C], ['I', p.I], ['G', p.G], ['NX', NX], ['Y', Y]
  ];
  const maxVal = Math.max(...items.map(x => x[1])) * 1.4 + 1;
  return <ModelShell
    title="1. Identità macroeconomiche di base"
    description="Modulo introduttivo senza vero solver: mostra identità contabili, composizione del PIL e collegamenti tra settore privato, pubblico ed estero."
    controls={<>
      <SectionTitle>Parametri</SectionTitle>
      <FieldGrid params={p} setParams={setP} fields={[
        {key:'C',label:'Consumi C',step:1},{key:'I',label:'Investimenti I',step:1},
        {key:'G',label:'Spesa pubblica G',step:1},{key:'X',label:'Esportazioni X',step:1},
        {key:'IM',label:'Importazioni IM',step:1},{key:'T',label:'Tasse T',step:1},
      ]} />
    </>}
    outputs={<>
      <SectionTitle>Output sintetici</SectionTitle>
      <Summary items={[
        {label:'PIL Y', value:euro(Y)}, {label:'Reddito disponibile YD', value:euro(YD)},
        {label:'Risparmio S', value:euro(S)}, {label:'Saldo pubblico T-G', value:euro(p.T-p.G)},
        {label:'Bilancia commerciale NX', value:euro(NX)}
      ]}/>
    </>}
    narrative={`Il PIL è dato da C + I + G + NX. In questa configurazione il settore estero contribuisce per ${euro(NX)}, mentre il saldo pubblico è ${euro(p.T - p.G)}. Il modulo serve a leggere le identità di contabilità macroeconomica più che a risolvere un equilibrio.`}
    charts={<Plot title="Composizione del PIL" xLabel="componenti" yLabel="valore" xMin={0} xMax={6} yMin={0} yMax={maxVal} note="Il grafico evidenzia la scomposizione del PIL in componenti di spesa.">
      {(s) => <>
        {items.map((it, idx) => {
          const x = idx + 0.6;
          const w = 0.55;
          return <g key={idx}>
            <rect x={s.x(x)} y={s.y(it[1])} width={s.x(x+w)-s.x(x)} height={s.y(0)-s.y(it[1])} className="barFill" />
            <text x={(s.x(x)+s.x(x+w))/2} y={s.y(0)-6} className="axisText" textAnchor="middle">{it[0]}</text>
          </g>;
        })}
      </>}
    </Plot>}
  />;
}

function KeynesianCrossModel() {
  const defaults = { c0:8, c1:0.7, T:10, Ibar:12, G:12 };
  const [p, setP] = usePersistentState<NumMap>('kc-params', defaults);
  const [shockOn, setShockOn] = usePersistentState<boolean>('kc-shock-on', false);
  const [shock, setShock] = usePersistentState<string>('kc-shock', 'g_up');
  const [shockSize, setShockSize] = usePersistentState<number>('kc-size', 4);
  const p2 = shockOn ? applyShock(p, shock, shockSize) : p;
  const solve = (q:NumMap) => {
    const denom = Math.max(0.05, 1 - q.c1);
    const Y = (q.c0 + q.Ibar + q.G - q.c1*q.T)/denom;
    const C = q.c0 + q.c1*(Y - q.T);
    const Z = C + q.Ibar + q.G;
    return {Y,C,Z};
  };
  const a = solve(p), b = solve(p2);
  const max = Math.max(40, a.Y*1.5, b.Y*1.5);
  const warning = warnMultiplier(p.c1);
  return <ModelShell
    title="2. Mercato dei beni / Keynesian Cross"
    description="Primo modello di equilibrio: la produzione è determinata dall’intersezione tra domanda aggregata Z(Y) e retta a 45 gradi."
    warning={warning}
    controls={<>
      <SectionTitle>Parametri</SectionTitle>
      <FieldGrid params={p} setParams={setP} fields={[
        {key:'c0',label:'Consumo autonomo c0',step:0.5},
        {key:'c1',label:'Propensione marginale al consumo c1',step:0.01},
        {key:'T',label:'Tasse T',step:0.5},
        {key:'Ibar',label:'Investimento autonomo Ī',step:0.5},
        {key:'G',label:'Spesa pubblica G',step:0.5},
      ]}/>
      <SectionTitle>Analizza shock</SectionTitle>
      <ShockControls enabled={shockOn} setEnabled={setShockOn} shock={shock} setShock={setShock} shockSize={shockSize} setShockSize={setShockSize}
        options={[
          {id:'g_up',label:'Aumento G'},{id:'g_down',label:'Diminuzione G'},
          {id:'t_up',label:'Aumento T'},{id:'t_down',label:'Diminuzione T'},
          {id:'c0_up',label:'Aumento c0'},{id:'c0_down',label:'Diminuzione c0'},
          {id:'i0_up',label:'Aumento Ī'},{id:'i0_down',label:'Diminuzione Ī'},
        ]}/>
    </>}
    outputs={<>
      <SectionTitle>Output sintetici</SectionTitle>
      <Summary items={[
        {label:'Y* prima', value:euro(a.Y)},
        {label:'C prima', value:euro(a.C)},
        {label:'Z prima', value:euro(a.Z)},
        {label:'Y* dopo', value:euro(b.Y)},
      ]}/>
      <div className="formulaBox">Y = [c0 + Ī + G - c1 T] / (1 - c1)</div>
    </>}
    narrative={`Nel mercato dei beni l’equilibrio è Y = Z. Con i parametri correnti la produzione di equilibrio è ${euro(a.Y)}. ${shockOn ? `Dopo lo shock selezionato, l’equilibrio diventa ${euro(b.Y)}.` : 'Attivando “shock” puoi vedere come si sposta la curva Z(Y).'} Il moltiplicatore è ${euro(1 / Math.max(0.05,1-p.c1))}.`}
    charts={<Plot title="Croce keynesiana" subtitle="Retta a 45° e domanda aggregata" xLabel="Y" yLabel="Z" xMin={0} xMax={max} yMin={0} yMax={max} note="La curva della domanda aggregata si sposta in alto con G, Ī o c0 più alti e in basso con T più alte.">
      {(s) => <>
        <polyline className="line45" fill="none" points={pointsString([[0,0],[max,max]], s)} />
        <polyline className="lineBase" fill="none" points={pointsString(linePoints(range(0,max,50), Y => p.c0 + p.c1*(Y-p.T) + p.Ibar + p.G), s)} />
        {shockOn && <polyline className="lineShock" fill="none" points={pointsString(linePoints(range(0,max,50), Y => p2.c0 + p2.c1*(Y-p2.T) + p2.Ibar + p2.G), s)} />}
        <circle cx={s.x(a.Y)} cy={s.y(a.Y)} r="4.5" className="pointBase" />
        {shockOn && <circle cx={s.x(b.Y)} cy={s.y(b.Y)} r="4.5" className="pointShock" />}
        <text x={s.x(a.Y)+8} y={s.y(a.Y)-8} className="axisText">Prima</text>
        {shockOn && <text x={s.x(b.Y)+8} y={s.y(b.Y)+14} className="axisText shockText">Dopo</text>}
      </>}
    </Plot>}
  />;
}

function ISCurveModel() {
  const defaults = { c0:8, c1:0.7, T:10, I0:12, b:6, G:12, iNow:1.5 };
  const [p, setP] = usePersistentState<NumMap>('is-params', defaults);
  const [shockOn, setShockOn] = usePersistentState<boolean>('is-shock-on', false);
  const [shock, setShock] = usePersistentState<string>('is-shock', 'g_up');
  const [shockSize, setShockSize] = usePersistentState<number>('is-size', 3);
  const p2 = shockOn ? applyShock(p, shock, shockSize) : p;
  const solveY = (q:NumMap, i:number) => (q.c0 - q.c1*q.T + q.I0 + q.G - q.b*i)/Math.max(0.05,1-q.c1);
  const goods = (q:NumMap) => {
    const Y = solveY(q, q.iNow);
    const C = q.c0 + q.c1*(Y-q.T);
    const I = q.I0 - q.b*q.iNow;
    return {Y, C, I, Z:C+I+q.G};
  };
  const a = goods(p), b = goods(p2);
  const maxY = Math.max(40,a.Y*1.5,b.Y*1.5);
  const maxI = Math.max(4,p.iNow*2,p2.iNow*2,4);
  return <ModelShell
    title="3. Curva IS"
    description="Il mercato dei beni genera una relazione decrescente tra tasso di interesse e produzione."
    warning={warnMultiplier(p.c1)}
    controls={<>
      <SectionTitle>Parametri</SectionTitle>
      <FieldGrid params={p} setParams={setP} fields={[
        {key:'c0',label:'c0',step:0.5},{key:'c1',label:'c1',step:0.01},{key:'T',label:'T',step:0.5},
        {key:'I0',label:'I0',step:0.5},{key:'b',label:'Sensibilità investimenti b',step:0.5},
        {key:'G',label:'G',step:0.5},{key:'iNow',label:'Tasso corrente i',step:0.1},
      ]}/>
      <SectionTitle>Analizza shock</SectionTitle>
      <ShockControls enabled={shockOn} setEnabled={setShockOn} shock={shock} setShock={setShock} shockSize={shockSize} setShockSize={setShockSize}
        options={[
          {id:'g_up',label:'Aumento G'},{id:'g_down',label:'Diminuzione G'},
          {id:'t_up',label:'Aumento T'},{id:'t_down',label:'Diminuzione T'},
          {id:'i0_up',label:'Aumento I0'},{id:'i0_down',label:'Diminuzione I0'},
        ]}/>
    </>}
    outputs={<>
      <SectionTitle>Output sintetici</SectionTitle>
      <Summary items={[
        {label:'Y al tasso i corrente', value:euro(a.Y)},
        {label:'Consumi', value:euro(a.C)},
        {label:'Investimenti', value:euro(a.I)},
        {label:'Y dopo shock', value:euro(b.Y)},
      ]}/>
      <div className="formulaBox">Y = [c0 - c1T + I0 + G - b·i] / (1 - c1)</div>
      <div className="formulaBox">i = [c0 - c1T + I0 + G - (1 - c1)Y] / b</div>
    </>}
    narrative={`La curva IS è decrescente: un tasso più alto riduce gli investimenti e quindi la produzione. Al tasso corrente i = ${euro(p.iNow)}, la produzione è ${euro(a.Y)}.${shockOn ? ` Lo shock sposta l’intera IS e la produzione al tasso dato diventa ${euro(b.Y)}.` : ''}`}
    charts={<div className="chartGrid2">
      <Plot title="Mercato dei beni dato i" xLabel="Y" yLabel="Z" xMin={0} xMax={maxY} yMin={0} yMax={maxY}>
        {(s)=><>
          <polyline className="line45" fill="none" points={pointsString([[0,0],[maxY,maxY]], s)} />
          <polyline className="lineBase" fill="none" points={pointsString(linePoints(range(0,maxY,50), Y => p.c0 + p.c1*(Y-p.T) + (p.I0-p.b*p.iNow) + p.G), s)} />
          {shockOn && <polyline className="lineShock" fill="none" points={pointsString(linePoints(range(0,maxY,50), Y => p2.c0 + p2.c1*(Y-p2.T) + (p2.I0-p2.b*p2.iNow) + p2.G), s)} />}
          <circle cx={s.x(a.Y)} cy={s.y(a.Y)} r="4.5" className="pointBase" />
          {shockOn && <circle cx={s.x(b.Y)} cy={s.y(b.Y)} r="4.5" className="pointShock" />}
        </>}
      </Plot>
      <Plot title="Curva IS" xLabel="Y" yLabel="i" xMin={0} xMax={maxY} yMin={0} yMax={maxI}>
        {(s)=><>
          <polyline className="lineBase" fill="none" points={pointsString(range(0,maxI,50).map(i => [solveY(p,i), i]), s)} />
          {shockOn && <polyline className="lineShock" fill="none" points={pointsString(range(0,maxI,50).map(i => [solveY(p2,i), i]), s)} />}
          <circle cx={s.x(a.Y)} cy={s.y(p.iNow)} r="4.5" className="pointBase" />
          {shockOn && <circle cx={s.x(b.Y)} cy={s.y(p2.iNow)} r="4.5" className="pointShock" />}
        </>}
      </Plot>
    </div>}
  />;
}

function LMClassicModel() {
  const defaults = { M:20, P:1, k:0.6, h:4, Y:40 };
  const [p, setP] = usePersistentState<NumMap>('lm-params', defaults);
  const [shockOn, setShockOn] = usePersistentState<boolean>('lm-shock-on', false);
  const [shock, setShock] = usePersistentState<string>('lm-shock', 'm_up');
  const [shockSize, setShockSize] = usePersistentState<number>('lm-size', 3);
  const p2 = shockOn ? applyShock(p, shock, shockSize) : p;
  const solveI = (q:NumMap, Y:number) => (q.k*Y - q.M/q.P)/Math.max(0.2,q.h);
  const aI = solveI(p,p.Y), bI = solveI(p2,p2.Y);
  const maxY = Math.max(80,p.Y*1.8,p2.Y*1.8);
  const maxI = Math.max(6,aI*1.8,bI*1.8,4);
  const md = (q:NumMap, i:number) => q.k*q.Y - q.h*i;
  return <ModelShell
    title="4. Mercato della moneta / LM classica"
    description="Con offerta reale di moneta esogena, l’equilibrio monetario determina il tasso di interesse e genera una curva LM crescente."
    controls={<>
      <SectionTitle>Parametri</SectionTitle>
      <FieldGrid params={p} setParams={setP} fields={[
        {key:'M',label:'M',step:0.5},{key:'P',label:'P',step:0.1},{key:'k',label:'k',step:0.05},
        {key:'h',label:'h',step:0.2},{key:'Y',label:'Y dato',step:1},
      ]}/>
      <SectionTitle>Analizza shock</SectionTitle>
      <ShockControls enabled={shockOn} setEnabled={setShockOn} shock={shock} setShock={setShock} shockSize={shockSize} setShockSize={setShockSize}
        options={[
          {id:'m_up',label:'Aumento M'},{id:'m_down',label:'Diminuzione M'},
          {id:'y_up',label:'Aumento Y dato'},{id:'y_down',label:'Riduzione Y dato'},
        ]}/>
    </>}
    outputs={<>
      <SectionTitle>Output sintetici</SectionTitle>
      <Summary items={[
        {label:'M/P', value:euro(p.M/p.P)},
        {label:'i* prima', value:euro(aI)},
        {label:'i* dopo', value:euro(bI)},
        {label:'Md/P al punto', value:euro(p.M/p.P)}
      ]}/>
      <div className="formulaBox">M/P = kY - hi &nbsp; ⇒ &nbsp; i = (kY - M/P)/h</div>
    </>}
    narrative={`Nel mercato della moneta un aumento di Y fa crescere la domanda di moneta e tende a spingere in alto i. Un aumento di M/P, invece, sposta la LM verso il basso.`}
    charts={<div className="chartGrid2">
      <Plot title="Mercato della moneta" xLabel="M/P" yLabel="i" xMin={0} xMax={Math.max(40,p.M/p.P*2,p2.M/p2.P*2)} yMin={0} yMax={maxI}>
        {(s)=><>
          <polyline className="lineBase" fill="none" points={pointsString(range(0,maxI,50).map(i => [md(p,i), i]), s)} />
          {shockOn && <polyline className="lineShock" fill="none" points={pointsString(range(0,maxI,50).map(i => [md(p2,i), i]), s)} />}
          <line x1={s.x(p.M/p.P)} x2={s.x(p.M/p.P)} y1={s.y0} y2={s.y0+s.h} className="line45" />
          {shockOn && <line x1={s.x(p2.M/p2.P)} x2={s.x(p2.M/p2.P)} y1={s.y0} y2={s.y0+s.h} className="shockDash" />}
          <circle cx={s.x(p.M/p.P)} cy={s.y(aI)} r="4.5" className="pointBase" />
          {shockOn && <circle cx={s.x(p2.M/p2.P)} cy={s.y(bI)} r="4.5" className="pointShock" />}
        </>}
      </Plot>
      <Plot title="Curva LM" xLabel="Y" yLabel="i" xMin={0} xMax={maxY} yMin={0} yMax={maxI}>
        {(s)=><>
          <polyline className="lineBase" fill="none" points={pointsString(range(0,maxY,60).map(Y => [Y, solveI(p,Y)]), s)} />
          {shockOn && <polyline className="lineShock" fill="none" points={pointsString(range(0,maxY,60).map(Y => [Y, solveI(p2,Y)]), s)} />}
          <circle cx={s.x(p.Y)} cy={s.y(aI)} r="4.5" className="pointBase" />
          {shockOn && <circle cx={s.x(p2.Y)} cy={s.y(bI)} r="4.5" className="pointShock" />}
        </>}
      </Plot>
    </div>}
  />;
}

function ISLMFlatCore(params:NumMap) {
  const Y = (params.c0 - params.c1*params.T + params.I0 + params.G - params.b*params.iBar)/Math.max(0.05,1-params.c1);
  const C = params.c0 + params.c1*(Y - params.T);
  const I = params.I0 - params.b*params.iBar;
  const m = params.k*Y - params.h*params.iBar;
  return { Y, C, I, m, Z: C + I + params.G };
}

function ISLMFlatModel() {
  const defaults = { c0:8, c1:0.7, T:10, I0:12, b:6, G:12, iBar:1.5, k:0.6, h:4 };
  const [p, setP] = usePersistentState<NumMap>('islmflat-params', defaults);
  const [shockOn, setShockOn] = usePersistentState<boolean>('islmflat-shock-on', false);
  const [shock, setShock] = usePersistentState<string>('islmflat-shock', 'g_up');
  const [shockSize, setShockSize] = usePersistentState<number>('islmflat-size', 3);
  const p2 = shockOn ? applyShock(p, shock, shockSize) : p;
  const a = ISLMFlatCore(p), b = ISLMFlatCore(p2);
  const maxY = Math.max(40,a.Y*1.5,b.Y*1.5);
  const maxI = Math.max(4,p.iBar+2,p2.iBar+2);
  return <ModelShell
    title="5. Modello IS-LM con banca centrale che fissa il tasso"
    description="Versione moderna con LM orizzontale: la banca centrale sceglie il tasso iBar e fornisce la moneta necessaria."
    warning={warnMultiplier(p.c1)}
    controls={<>
      <SectionTitle>Parametri</SectionTitle>
      <FieldGrid params={p} setParams={setP} fields={[
        {key:'c0',label:'c0',step:0.5},{key:'c1',label:'c1',step:0.01},{key:'T',label:'T',step:0.5},
        {key:'I0',label:'I0',step:0.5},{key:'b',label:'b',step:0.5},{key:'G',label:'G',step:0.5},
        {key:'iBar',label:'ī',step:0.1},{key:'k',label:'k',step:0.05},{key:'h',label:'h',step:0.2}
      ]}/>
      <SectionTitle>Analizza shock</SectionTitle>
      <ShockControls enabled={shockOn} setEnabled={setShockOn} shock={shock} setShock={setShock} shockSize={shockSize} setShockSize={setShockSize}
        options={[
          {id:'g_up',label:'Aumento G'},{id:'g_down',label:'Diminuzione G'},
          {id:'t_up',label:'Aumento T'},{id:'t_down',label:'Diminuzione T'},
          {id:'i_down',label:'Taglio ī'},{id:'i_up',label:'Aumento ī'}
        ]}/>
    </>}
    outputs={<>
      <SectionTitle>Output sintetici</SectionTitle>
      <Summary items={[
        {label:'Y prima', value:euro(a.Y)}, {label:'C prima', value:euro(a.C)},
        {label:'I prima', value:euro(a.I)}, {label:'M/P richiesto', value:euro(a.m)},
        {label:'Y dopo', value:euro(b.Y)}
      ]}/>
      <div className="formulaBox">Y = [c0 - c1T + I0 + G - b·ī] / (1 - c1)</div>
      <div className="formulaBox">M/P = kY - h·ī</div>
    </>}
    narrative={`Con LM piatta, la politica fiscale agisce soprattutto su Y, mentre la politica monetaria è rappresentata come variazione del tasso fissato dalla banca centrale. Con i parametri correnti Y = ${euro(a.Y)} e la moneta reale richiesta è ${euro(a.m)}.`}
    charts={<div className="chartGrid2">
      <Plot title="Mercato dei beni" xLabel="Y" yLabel="Z" xMin={0} xMax={maxY} yMin={0} yMax={maxY}>
        {(s)=><>
          <polyline className="line45" fill="none" points={pointsString([[0,0],[maxY,maxY]], s)} />
          <polyline className="lineBase" fill="none" points={pointsString(linePoints(range(0,maxY,60), Y => p.c0 + p.c1*(Y-p.T) + (p.I0-p.b*p.iBar) + p.G), s)} />
          {shockOn && <polyline className="lineShock" fill="none" points={pointsString(linePoints(range(0,maxY,60), Y => p2.c0 + p2.c1*(Y-p2.T) + (p2.I0-p2.b*p2.iBar) + p2.G), s)} />}
          <circle cx={s.x(a.Y)} cy={s.y(a.Y)} r="4.5" className="pointBase" />
          {shockOn && <circle cx={s.x(b.Y)} cy={s.y(b.Y)} r="4.5" className="pointShock" />}
        </>}
      </Plot>
      <Plot title="Mercato della moneta" xLabel="M/P" yLabel="i" xMin={0} xMax={Math.max(30,a.m*1.6,b.m*1.6)} yMin={0} yMax={maxI}>
        {(s)=><>
          <polyline className="lineBase" fill="none" points={pointsString(range(0,Math.max(30,a.m*1.6,b.m*1.6),60).map(m => [m, (p.k*a.Y - m)/Math.max(0.2,p.h)]), s)} />
          <line x1={s.x0} x2={s.x0+s.w} y1={s.y(p.iBar)} y2={s.y(p.iBar)} className="line45" />
          <line x1={s.x(a.m)} x2={s.x(a.m)} y1={s.y0} y2={s.y0+s.h} className="lineBaseThin" />
          {shockOn && <>
            <polyline className="lineShock" fill="none" points={pointsString(range(0,Math.max(30,a.m*1.6,b.m*1.6),60).map(m => [m, (p2.k*b.Y - m)/Math.max(0.2,p2.h)]), s)} />
            <line x1={s.x0} x2={s.x0+s.w} y1={s.y(p2.iBar)} y2={s.y(p2.iBar)} className="shockDash" />
            <line x1={s.x(b.m)} x2={s.x(b.m)} y1={s.y0} y2={s.y0+s.h} className="lineShockThin" />
          </>}
        </>}
      </Plot>
      <Plot title="IS-LM moderno" xLabel="Y" yLabel="i" xMin={0} xMax={maxY} yMin={0} yMax={maxI}>
        {(s)=><>
          <polyline className="lineBase" fill="none" points={pointsString(range(0,maxI,60).map(i => [(p.c0 - p.c1*p.T + p.I0 + p.G - p.b*i)/Math.max(0.05,1-p.c1), i]), s)} />
          <line x1={s.x0} x2={s.x0+s.w} y1={s.y(p.iBar)} y2={s.y(p.iBar)} className="line45" />
          <circle cx={s.x(a.Y)} cy={s.y(p.iBar)} r="4.5" className="pointBase" />
          {shockOn && <>
            <polyline className="lineShock" fill="none" points={pointsString(range(0,maxI,60).map(i => [(p2.c0 - p2.c1*p2.T + p2.I0 + p2.G - p2.b*i)/Math.max(0.05,1-p2.c1), i]), s)} />
            <line x1={s.x0} x2={s.x0+s.w} y1={s.y(p2.iBar)} y2={s.y(p2.iBar)} className="shockDash" />
            <circle cx={s.x(b.Y)} cy={s.y(p2.iBar)} r="4.5" className="pointShock" />
          </>}
        </>}
      </Plot>
    </div>}
  />;
}

function ISLMRiskModel() {
  const defaults = { c0:8, c1:0.7, T:10, I0:12, b:6, G:12, iBar:1.0, iTarget:1.0, iMin:0, piE:1.5, x:1.0, k:0.6, h:4, lowerBound:0 };
  const [p, setP] = usePersistentState<NumMap>('islmrisk-params', defaults);
  const [shockOn, setShockOn] = usePersistentState<boolean>('islmrisk-shock-on', false);
  const [shock, setShock] = usePersistentState<string>('islmrisk-shock', 'risk_up');
  const [shockSize, setShockSize] = usePersistentState<number>('islmrisk-size', 0.5);
  const compute = (q:NumMap) => {
    const i = q.lowerBound > 0.5 ? Math.max(q.iTarget, q.iMin) : q.iBar;
    const rPolicy = i - q.piE;
    const rFirm = rPolicy + q.x;
    const Y = (q.c0 - q.c1*q.T + q.I0 + q.G - q.b*rFirm)/Math.max(0.05,1-q.c1);
    const C = q.c0 + q.c1*(Y-q.T);
    const I = q.I0 - q.b*rFirm;
    const m = q.k*Y - q.h*i;
    return {i, rPolicy, rFirm, Y, C, I, m};
  };
  const p2 = shockOn ? applyShock(p, shock, shockSize) : p;
  const a = compute(p), b = compute(p2);
  const maxY = Math.max(40,a.Y*1.6,b.Y*1.6);
  const maxI = Math.max(4,a.i+2,b.i+2, Math.abs(a.rFirm)+2, Math.abs(b.rFirm)+2);
  return <ModelShell
    title="6. IS-LM con LM orizzontale, tasso nominale, tasso reale e premio al rischio"
    description="Modulo che distingue tra tasso nominale fissato dalla banca centrale, tasso reale di policy e tasso reale effettivo pagato dalle imprese."
    controls={<>
      <SectionTitle>Parametri</SectionTitle>
      <FieldGrid params={p} setParams={setP} fields={[
        {key:'c0',label:'c0',step:0.5},{key:'c1',label:'c1',step:0.01},{key:'T',label:'T',step:0.5},
        {key:'I0',label:'I0',step:0.5},{key:'b',label:'b',step:0.5},{key:'G',label:'G',step:0.5},
        {key:'iBar',label:'ī',step:0.1},{key:'iTarget',label:'i target',step:0.1},{key:'iMin',label:'i minimo',step:0.1},
        {key:'piE',label:'πe',step:0.1},{key:'x',label:'Premio al rischio x',step:0.1},
        {key:'k',label:'k',step:0.05},{key:'h',label:'h',step:0.2}
      ]}/>
      <label className="checkboxRow"><span>Attiva vincolo inferiore sui tassi</span><input type="checkbox" checked={p.lowerBound > 0.5} onChange={e => setP({...p, lowerBound: e.target.checked ? 1 : 0})}/></label>
      <SectionTitle>Analizza shock</SectionTitle>
      <ShockControls enabled={shockOn} setEnabled={setShockOn} shock={shock} setShock={setShock} shockSize={shockSize} setShockSize={setShockSize}
        options={[
          {id:'i_down',label:'Taglio tasso nominale'},{id:'i_up',label:'Aumento tasso nominale'},
          {id:'pie_down',label:'Calo inflazione attesa'},{id:'pie_up',label:'Aumento inflazione attesa'},
          {id:'risk_up',label:'Aumento premio al rischio'},{id:'risk_down',label:'Riduzione premio al rischio'},
          {id:'g_up',label:'Aumento G'}
        ]}/>
    </>}
    outputs={<>
      <SectionTitle>Output sintetici</SectionTitle>
      <Summary items={[
        {label:'i nominale', value:euro(a.i)},{label:'r di policy', value:euro(a.rPolicy)},
        {label:'r per imprese', value:euro(a.rFirm)},{label:'Y', value:euro(a.Y)},
        {label:'M/P richiesto', value:euro(a.m)},{label:'Y dopo shock', value:euro(b.Y)}
      ]}/>
      <div className="formulaBox">rPolicy = i - πe</div>
      <div className="formulaBox">rFirm = i - πe + x</div>
      <div className="formulaBox">Y = [c0 - c1T + I0 + G - b(i - πe + x)] / (1 - c1)</div>
    </>}
    narrative={`La banca centrale controlla direttamente il tasso nominale, non quello reale rilevante per le imprese. Con i parametri correnti: i = ${euro(a.i)}, rPolicy = ${euro(a.rPolicy)}, rFirm = ${euro(a.rFirm)}. ${a.i <= 0.05 && p.piE < 0 ? 'Qui compare il limite della politica monetaria: con deflazione attesa il tasso reale resta elevato anche con i nominale vicino a zero.' : ''}`}
    charts={<div className="chartGrid2">
      <Plot title="Mercato dei beni" xLabel="Y" yLabel="Z" xMin={0} xMax={maxY} yMin={0} yMax={maxY}>
        {(s)=><>
          <polyline className="line45" fill="none" points={pointsString([[0,0],[maxY,maxY]], s)} />
          <polyline className="lineBase" fill="none" points={pointsString(linePoints(range(0,maxY,60), Y => p.c0 + p.c1*(Y-p.T) + (p.I0-p.b*a.rFirm) + p.G), s)} />
          {shockOn && <polyline className="lineShock" fill="none" points={pointsString(linePoints(range(0,maxY,60), Y => p2.c0 + p2.c1*(Y-p2.T) + (p2.I0-p2.b*b.rFirm) + p2.G), s)} />}
          <circle cx={s.x(a.Y)} cy={s.y(a.Y)} r="4.5" className="pointBase" />
          {shockOn && <circle cx={s.x(b.Y)} cy={s.y(b.Y)} r="4.5" className="pointShock" />}
        </>}
      </Plot>
      <Plot title="Mercato della moneta" xLabel="M/P" yLabel="i" xMin={0} xMax={Math.max(25,a.m*1.7,b.m*1.7)} yMin={-1} yMax={maxI}>
        {(s)=><>
          <polyline className="lineBase" fill="none" points={pointsString(range(0,Math.max(25,a.m*1.7,b.m*1.7),60).map(m => [m, (p.k*a.Y - m)/Math.max(0.2,p.h)]), s)} />
          <line x1={s.x0} x2={s.x0+s.w} y1={s.y(a.i)} y2={s.y(a.i)} className="line45" />
          <line x1={s.x(a.m)} x2={s.x(a.m)} y1={s.y0} y2={s.y0+s.h} className="lineBaseThin" />
          {shockOn && <>
            <polyline className="lineShock" fill="none" points={pointsString(range(0,Math.max(25,a.m*1.7,b.m*1.7),60).map(m => [m, (p2.k*b.Y - m)/Math.max(0.2,p2.h)]), s)} />
            <line x1={s.x0} x2={s.x0+s.w} y1={s.y(b.i)} y2={s.y(b.i)} className="shockDash" />
            <line x1={s.x(b.m)} x2={s.x(b.m)} y1={s.y0} y2={s.y0+s.h} className="lineShockThin" />
          </>}
        </>}
      </Plot>
      <Plot title="IS-LM con LM orizzontale" xLabel="Y" yLabel="i" xMin={0} xMax={maxY} yMin={-1} yMax={maxI}>
        {(s)=><>
          <polyline className="lineBase" fill="none" points={pointsString(range(-1,maxI,60).map(i => [(p.c0 - p.c1*p.T + p.I0 + p.G - p.b*(i - p.piE + p.x))/Math.max(0.05,1-p.c1), i]), s)} />
          <line x1={s.x0} x2={s.x0+s.w} y1={s.y(a.i)} y2={s.y(a.i)} className="line45" />
          <circle cx={s.x(a.Y)} cy={s.y(a.i)} r="4.5" className="pointBase" />
          {shockOn && <>
            <polyline className="lineShock" fill="none" points={pointsString(range(-1,maxI,60).map(i => [(p2.c0 - p2.c1*p2.T + p2.I0 + p2.G - p2.b*(i - p2.piE + p2.x))/Math.max(0.05,1-p2.c1), i]), s)} />
            <line x1={s.x0} x2={s.x0+s.w} y1={s.y(b.i)} y2={s.y(b.i)} className="shockDash" />
            <circle cx={s.x(b.Y)} cy={s.y(b.i)} r="4.5" className="pointShock" />
          </>}
        </>}
      </Plot>
      <Plot title="Decomposizione del tasso" xLabel="componenti" yLabel="valore" xMin={0} xMax={5} yMin={Math.min(-3,a.rFirm,b.rFirm)-1} yMax={Math.max(4,a.i,b.i,a.rPolicy,b.rPolicy,a.rFirm,b.rFirm)+1}>
        {(s)=><>
          {[
            ['i', a.i, 'barFill'],
            ['-πe', -p.piE, 'barAlt'],
            ['x', p.x, 'barWarn'],
            ['rFirm', a.rFirm, 'barFill'],
          ].map((it:any, idx:number) => {
            const x = idx + 0.45, w = 0.5;
            const y0 = s.y(0), y1 = s.y(it[1]);
            return <g key={idx}>
              <rect x={s.x(x)} y={Math.min(y0,y1)} width={s.x(x+w)-s.x(x)} height={Math.abs(y1-y0)} className={it[2]} />
              <text x={(s.x(x)+s.x(x+w))/2} y={s.y0+s.h+18} textAnchor="middle" className="axisText">{it[0]}</text>
            </g>;
          })}
        </>}
      </Plot>
    </div>}
  />;
}

function WSPSModel() {
  const defaults = { alpha:1.2, z:0.15, m:0.25, A:1.0, L:100 };
  const [p, setP] = usePersistentState<NumMap>('wsps-params', defaults);
  const [shockOn, setShockOn] = usePersistentState<boolean>('wsps-shock-on', false);
  const [shock, setShock] = usePersistentState<string>('wsps-shock', 'v_up');
  const [shockSize, setShockSize] = usePersistentState<number>('wsps-size', 0.05);
  const p2 = { ...p };
  if (shockOn) {
    if (shock === 'markup_up') p2.m += shockSize;
    if (shock === 'markup_down') p2.m -= shockSize;
    if (shock === 'z_up') p2.z += shockSize;
    if (shock === 'z_down') p2.z -= shockSize;
    if (shock === 'a_up') p2.A += shockSize;
    if (shock === 'a_down') p2.A -= shockSize;
  }
  const solve = (q:NumMap) => {
    const PS = 1/(1+q.m);
    const u = clamp((1 + q.z - PS)/Math.max(0.05,q.alpha), 0, 1);
    const N = q.L*(1-u);
    const Y = q.A*N;
    return {PS,u,N,Y};
  };
  const a = solve(p), b = solve(p2);
  return <ModelShell
    title="7. Mercato del lavoro: WS-PS"
    description="Modulo di medio periodo: la wage-setting relation e la price-setting relation determinano disoccupazione naturale, occupazione e prodotto naturale."
    controls={<>
      <SectionTitle>Parametri</SectionTitle>
      <FieldGrid params={p} setParams={setP} fields={[
        {key:'alpha',label:'α',step:0.05},{key:'z',label:'z',step:0.02},
        {key:'m',label:'markup m',step:0.02},{key:'A',label:'Produttività A',step:0.05},{key:'L',label:'Forza lavoro L',step:1}
      ]}/>
      <SectionTitle>Analizza shock</SectionTitle>
      <ShockControls enabled={shockOn} setEnabled={setShockOn} shock={shock} setShock={setShock} shockSize={shockSize} setShockSize={setShockSize}
        options={[
          {id:'markup_up',label:'Aumento markup m'},{id:'markup_down',label:'Riduzione markup m'},
          {id:'z_up',label:'Aumento z'},{id:'z_down',label:'Riduzione z'},
          {id:'a_up',label:'Aumento produttività A'},{id:'a_down',label:'Riduzione produttività A'},
        ]}/>
    </>}
    outputs={<>
      <SectionTitle>Output sintetici</SectionTitle>
      <Summary items={[
        {label:'u naturale', value:euro(a.u)},
        {label:'N', value:euro(a.N)},
        {label:'Y naturale', value:euro(a.Y)},
        {label:'Salario reale PS', value:euro(a.PS)},
        {label:'Y naturale dopo shock', value:euro(b.Y)},
      ]}/>
      <div className="formulaBox">W/P = 1 - αu + z</div>
      <div className="formulaBox">W/P = 1 / (1 + m)</div>
    </>}
    narrative={`Il markup riduce il salario reale compatibile con la price-setting relation; z sposta la wage-setting relation. Con i parametri correnti la disoccupazione naturale è ${euro(a.u)} e il prodotto naturale ${euro(a.Y)}.`}
    charts={<div className="chartGrid2">
      <Plot title="WS-PS" xLabel="u" yLabel="W/P" xMin={0} xMax={1} yMin={0} yMax={1.4}>
        {(s)=><>
          <polyline className="lineBase" fill="none" points={pointsString(range(0,1,60).map(u => [u, 1 - p.alpha*u + p.z]), s)} />
          <line x1={s.x0} x2={s.x0+s.w} y1={s.y(a.PS)} y2={s.y(a.PS)} className="line45" />
          <circle cx={s.x(a.u)} cy={s.y(a.PS)} r="4.5" className="pointBase" />
          {shockOn && <>
            <polyline className="lineShock" fill="none" points={pointsString(range(0,1,60).map(u => [u, 1 - p2.alpha*u + p2.z]), s)} />
            <line x1={s.x0} x2={s.x0+s.w} y1={s.y(b.PS)} y2={s.y(b.PS)} className="shockDash" />
            <circle cx={s.x(b.u)} cy={s.y(b.PS)} r="4.5" className="pointShock" />
          </>}
        </>}
      </Plot>
      <Plot title="Occupazione e prodotto naturale" xLabel="stati" yLabel="valore" xMin={0} xMax={3} yMin={0} yMax={Math.max(120,a.Y*1.2,b.Y*1.2)}>
        {(s)=><>
          {[['N',a.N,'barFill'],['Yₙ',a.Y,'barAlt']].map((it:any, idx:number) => {
            const x = idx + 0.5, w = 0.45;
            return <g key={idx}>
              <rect x={s.x(x)} y={s.y(it[1])} width={s.x(x+w)-s.x(x)} height={s.y(0)-s.y(it[1])} className={it[2]} />
              <text x={(s.x(x)+s.x(x+w))/2} y={s.y0+s.h+18} className="axisText" textAnchor="middle">{it[0]}</text>
            </g>;
          })}
          {shockOn && [['N2',b.N,'barWarn',1.55],['Y₂',b.Y,'barShock',2.05]].map((it:any, idx:number) => {
            const x = it[3], w = 0.45;
            return <g key={idx}>
              <rect x={s.x(x)} y={s.y(it[1])} width={s.x(x+w)-s.x(x)} height={s.y(0)-s.y(it[1])} className={it[2]} />
              <text x={(s.x(x)+s.x(x+w))/2} y={s.y0+s.h+18} className="axisText" textAnchor="middle">{it[0]}</text>
            </g>;
          })}
        </>}
      </Plot>
    </div>}
  />;
}

function PhillipsModel() {
  const defaults = { lambda:0.08, alpha:0.3, Yn:100, Y:103, un:0.06, u:0.05, piAnchor:2.0, piPrev:2.0, theta:0.5, v:0.0, regime:0 };
  const [p, setP] = usePersistentState<any>('phillips-params', defaults);
  const [shockOn, setShockOn] = usePersistentState<boolean>('phillips-shock-on', false);
  const [shock, setShock] = usePersistentState<string>('phillips-shock', 'v_up');
  const [shockSize, setShockSize] = usePersistentState<number>('phillips-size', 0.5);
  const q = { ...p };
  if (shockOn) {
    if (shock === 'demand_up') q.Y += shockSize;
    if (shock === 'demand_down') q.Y -= shockSize;
    if (shock === 'v_up') q.v += shockSize;
    if (shock === 'v_down') q.v -= shockSize;
    if (shock === 'yn_up') q.Yn += shockSize;
    if (shock === 'yn_down') q.Yn -= shockSize;
    if (shock === 'anchor_up') q.piAnchor += shockSize;
    if (shock === 'anchor_down') q.piAnchor -= shockSize;
  }
  const getPiE = (x:any) => x.regime === 0 ? x.piAnchor : x.regime === 1 ? x.piPrev : x.theta*x.piAnchor + (1-x.theta)*x.piPrev;
  const solve = (x:any) => {
    const piE = getPiE(x);
    const pi = piE + x.lambda*(x.Y - x.Yn) + x.v;
    return { piE, pi, gap: x.Y - x.Yn };
  };
  const a = solve(p), b = solve(q);
  const simulate = (x:any, periods=8) => {
    const out:any[] = [];
    let prev = x.piPrev;
    for (let t=0;t<periods;t++) {
      const piE = x.regime === 0 ? x.piAnchor : x.regime === 1 ? prev : x.theta*x.piAnchor + (1-x.theta)*prev;
      const pi = piE + x.lambda*(x.Y - x.Yn) + x.v;
      out.push({t, piE, pi});
      prev = pi;
    }
    return out;
  };
  const sim = simulate(q,8);
  const maxPi = Math.max(5, ...sim.flatMap(d => [d.pi, d.piE]).map(Math.abs)) + 1;
  return <ModelShell
    title="8. Phillips curve"
    description="Relazione tra attività economica, aspettative di inflazione e inflazione corrente, con confronto fra aspettative ancorate e non ancorate."
    controls={<>
      <SectionTitle>Parametri</SectionTitle>
      <FieldGrid params={p} setParams={setP} fields={[
        {key:'lambda',label:'λ',step:0.01},{key:'Yn',label:'Yₙ',step:1},{key:'Y',label:'Y',step:1},
        {key:'piAnchor',label:'π anchor',step:0.1},{key:'piPrev',label:'π(t-1)',step:0.1},
        {key:'theta',label:'θ (ibrido)',step:0.05},{key:'v',label:'Shock offerta v',step:0.1},
      ]}/>
      <div className="fieldRow inline">
        <span>Regime aspettative</span>
        <select value={p.regime} onChange={e => setP({...p, regime: Number(e.target.value)})}>
          <option value={0}>Ancorate</option>
          <option value={1}>Adattive / non ancorate</option>
          <option value={2}>Parzialmente ancorate</option>
        </select>
      </div>
      <SectionTitle>Analizza shock</SectionTitle>
      <ShockControls enabled={shockOn} setEnabled={setShockOn} shock={shock} setShock={setShock} shockSize={shockSize} setShockSize={setShockSize}
        options={[
          {id:'demand_up',label:'Shock di domanda positivo'},{id:'demand_down',label:'Shock di domanda negativo'},
          {id:'v_up',label:'Shock di offerta v positivo'},{id:'v_down',label:'Shock di offerta v negativo'},
          {id:'yn_up',label:'Aumento Yₙ'},{id:'yn_down',label:'Riduzione Yₙ'},
          {id:'anchor_up',label:'Aumento ancora nominale'},{id:'anchor_down',label:'Riduzione ancora nominale'},
        ]}/>
    </>}
    outputs={<>
      <SectionTitle>Output sintetici</SectionTitle>
      <Summary items={[
        {label:'πe', value:euro(a.piE)},
        {label:'π', value:euro(a.pi)},
        {label:'Y - Yₙ', value:euro(a.gap)},
        {label:'π dopo shock', value:euro(b.pi)},
        {label:'πe dopo shock', value:euro(b.piE)},
      ]}/>
      <div className="formulaBox">πt = πe + λ(Y - Yₙ) + v</div>
    </>}
    narrative={`Con ${p.regime === 0 ? 'aspettative ancorate' : p.regime === 1 ? 'aspettative non ancorate' : 'aspettative parzialmente ancorate'}, l’inflazione attesa vale ${euro(a.piE)} e l’inflazione corrente ${euro(a.pi)}. ${p.regime === 1 ? 'Poiché le aspettative seguono l’inflazione passata, gli shock tendono a essere più persistenti.' : 'Con aspettative ancorate gli shock hanno, a parità di tutto il resto, effetti meno persistenti.'}`}
    charts={<div className="chartGrid2">
      <Plot title="Phillips curve" xLabel="Y" yLabel="π - πe" xMin={p.Yn-20} xMax={p.Yn+20} yMin={-5} yMax={5}>
        {(s)=><>
          <polyline className="lineBase" fill="none" points={pointsString(range(p.Yn-20,p.Yn+20,60).map(Y => [Y, p.lambda*(Y-p.Yn)+p.v]), s)} />
          <line x1={s.x(p.Yn)} x2={s.x(p.Yn)} y1={s.y0} y2={s.y0+s.h} className="line45" />
          <circle cx={s.x(p.Y)} cy={s.y(a.pi-a.piE)} r="4.5" className="pointBase" />
          {shockOn && <>
            <polyline className="lineShock" fill="none" points={pointsString(range(q.Yn-20,q.Yn+20,60).map(Y => [Y, q.lambda*(Y-q.Yn)+q.v]), s)} />
            <line x1={s.x(q.Yn)} x2={s.x(q.Yn)} y1={s.y0} y2={s.y0+s.h} className="shockDash" />
            <circle cx={s.x(q.Y)} cy={s.y(b.pi-b.piE)} r="4.5" className="pointShock" />
          </>}
        </>}
      </Plot>
      <Plot title="Dinamica temporale π e πe" xLabel="t" yLabel="inflazione" xMin={0} xMax={7} yMin={-1} yMax={maxPi}>
        {(s)=><>
          <polyline className="lineBase" fill="none" points={pointsString(sim.map(d => [d.t, d.pi]), s)} />
          <polyline className="lineShock" fill="none" points={pointsString(sim.map(d => [d.t, d.piE]), s)} />
          {sim.map(d => <circle key={'p'+d.t} cx={s.x(d.t)} cy={s.y(d.pi)} r="3.5" className="pointBase" />)}
        </>}
      </Plot>
    </div>}
  />;
}

function ISLMPCModel() {
  const defaults = { c0:8, c1:0.7, T:10, I0:12, b:6, G:12, iBar:1.5, k:0.6, h:4, lambda:0.08, Yn:100, piE:2.0, v:0.0 };
  const [p, setP] = usePersistentState<NumMap>('islmpc-params', defaults);
  const [shockOn, setShockOn] = usePersistentState<boolean>('islmpc-shock-on', false);
  const [shock, setShock] = usePersistentState<string>('islmpc-shock', 'g_up');
  const [shockSize, setShockSize] = usePersistentState<number>('islmpc-size', 2);
  const p2 = shockOn ? applyShock(p, shock, shockSize) : p;
  const solve = (q:NumMap) => {
    const Y = (q.c0 - q.c1*q.T + q.I0 + q.G - q.b*q.iBar)/Math.max(0.05,1-q.c1);
    const C = q.c0 + q.c1*(Y-q.T);
    const I = q.I0 - q.b*q.iBar;
    const Z = C + I + q.G;
    const m = q.k*Y - q.h*q.iBar;
    const piGap = q.lambda*(Y-q.Yn) + q.v;
    const pi = q.piE + piGap;
    return {Y,C,I,Z,m,piGap,pi};
  };
  const a=solve(p), b=solve(p2);
  const maxY = Math.max(120,p.Yn*1.2,a.Y*1.2,b.Y*1.2);
  const maxI = Math.max(5,p.iBar+2,p2.iBar+2);
  const maxPGap = Math.max(5, Math.abs(a.piGap), Math.abs(b.piGap)) + 1;
  return <ModelShell
    title="9. Modello IS-LM-PC integrato"
    description="Modulo integrato con croce keynesiana, mercato della moneta con BC che fissa il tasso, IS-LM moderno e Phillips curve nel piano (Y, π - πe)."
    controls={<>
      <SectionTitle>Parametri</SectionTitle>
      <FieldGrid params={p} setParams={setP} fields={[
        {key:'c0',label:'c0',step:0.5},{key:'c1',label:'c1',step:0.01},{key:'T',label:'T',step:0.5},
        {key:'I0',label:'I0',step:0.5},{key:'b',label:'b',step:0.5},{key:'G',label:'G',step:0.5},
        {key:'iBar',label:'ī',step:0.1},{key:'k',label:'k',step:0.05},{key:'h',label:'h',step:0.2},
        {key:'lambda',label:'λ',step:0.01},{key:'Yn',label:'Yₙ',step:1},{key:'piE',label:'πe',step:0.1},{key:'v',label:'v',step:0.1}
      ]}/>
      <SectionTitle>Analizza shock</SectionTitle>
      <ShockControls enabled={shockOn} setEnabled={setShockOn} shock={shock} setShock={setShock} shockSize={shockSize} setShockSize={setShockSize}
        options={[
          {id:'g_up',label:'Aumento G'},{id:'g_down',label:'Diminuzione G'},
          {id:'t_up',label:'Aumento T'},{id:'t_down',label:'Diminuzione T'},
          {id:'i_down',label:'Taglio ī'},{id:'i_up',label:'Aumento ī'},
          {id:'v_up',label:'Shock di offerta positivo'},{id:'v_down',label:'Shock di offerta negativo'},
          {id:'yn_up',label:'Aumento Yₙ'},{id:'yn_down',label:'Riduzione Yₙ'}
        ]}/>
    </>}
    outputs={<>
      <SectionTitle>Output sintetici</SectionTitle>
      <Summary items={[
        {label:'Y', value:euro(a.Y)},{label:'π - πe', value:euro(a.piGap)},{label:'π', value:euro(a.pi)},
        {label:'M/P richiesto', value:euro(a.m)},{label:'Y dopo shock', value:euro(b.Y)},{label:'π dopo shock', value:euro(b.pi)}
      ]}/>
      <div className="formulaBox">Y = [c0 - c1T + I0 + G - b·ī] / (1 - c1)</div>
      <div className="formulaBox">M / P = kY - h·ī</div>
      <div className="formulaBox">π - πe = λ(Y - Yₙ) + v</div>
    </>}
    narrative={`Il blocco IS-LM determina il reddito di breve periodo; il confronto fra Y e Yₙ genera pressione inflazionistica o disinflazionistica tramite la Phillips curve. Con i parametri correnti Y = ${euro(a.Y)} e π - πe = ${euro(a.piGap)}.`}
    charts={<div className="chartGrid2">
      <Plot title="Croce keynesiana" xLabel="Y" yLabel="Z" xMin={0} xMax={maxY} yMin={0} yMax={maxY}>
        {(s)=><>
          <polyline className="line45" fill="none" points={pointsString([[0,0],[maxY,maxY]], s)} />
          <polyline className="lineBase" fill="none" points={pointsString(linePoints(range(0,maxY,60), Y => p.c0 + p.c1*(Y-p.T) + (p.I0-p.b*p.iBar) + p.G), s)} />
          {shockOn && <polyline className="lineShock" fill="none" points={pointsString(linePoints(range(0,maxY,60), Y => p2.c0 + p2.c1*(Y-p2.T) + (p2.I0-p2.b*p2.iBar) + p2.G), s)} />}
          <circle cx={s.x(a.Y)} cy={s.y(a.Y)} r="4.5" className="pointBase" />
          {shockOn && <circle cx={s.x(b.Y)} cy={s.y(b.Y)} r="4.5" className="pointShock" />}
        </>}
      </Plot>
      <Plot title="Mercato della moneta" xLabel="M/P" yLabel="i" xMin={0} xMax={Math.max(30,a.m*1.6,b.m*1.6)} yMin={0} yMax={maxI}>
        {(s)=><>
          <polyline className="lineBase" fill="none" points={pointsString(range(0,Math.max(30,a.m*1.6,b.m*1.6),60).map(m => [m, (p.k*a.Y - m)/Math.max(0.2,p.h)]), s)} />
          <line x1={s.x0} x2={s.x0+s.w} y1={s.y(p.iBar)} y2={s.y(p.iBar)} className="line45" />
          <line x1={s.x(a.m)} x2={s.x(a.m)} y1={s.y0} y2={s.y0+s.h} className="lineBaseThin" />
          {shockOn && <>
            <polyline className="lineShock" fill="none" points={pointsString(range(0,Math.max(30,a.m*1.6,b.m*1.6),60).map(m => [m, (p2.k*b.Y - m)/Math.max(0.2,p2.h)]), s)} />
            <line x1={s.x0} x2={s.x0+s.w} y1={s.y(p2.iBar)} y2={s.y(p2.iBar)} className="shockDash" />
            <line x1={s.x(b.m)} x2={s.x(b.m)} y1={s.y0} y2={s.y0+s.h} className="lineShockThin" />
          </>}
        </>}
      </Plot>
      <Plot title="IS-LM moderno" xLabel="Y" yLabel="i" xMin={0} xMax={maxY} yMin={0} yMax={maxI}>
        {(s)=><>
          <polyline className="lineBase" fill="none" points={pointsString(range(0,maxI,60).map(i => [(p.c0 - p.c1*p.T + p.I0 + p.G - p.b*i)/Math.max(0.05,1-p.c1), i]), s)} />
          <line x1={s.x0} x2={s.x0+s.w} y1={s.y(p.iBar)} y2={s.y(p.iBar)} className="line45" />
          <circle cx={s.x(a.Y)} cy={s.y(p.iBar)} r="4.5" className="pointBase" />
          {shockOn && <>
            <polyline className="lineShock" fill="none" points={pointsString(range(0,maxI,60).map(i => [(p2.c0 - p2.c1*p2.T + p2.I0 + p2.G - p2.b*i)/Math.max(0.05,1-p2.c1), i]), s)} />
            <line x1={s.x0} x2={s.x0+s.w} y1={s.y(p2.iBar)} y2={s.y(p2.iBar)} className="shockDash" />
            <circle cx={s.x(b.Y)} cy={s.y(p2.iBar)} r="4.5" className="pointShock" />
          </>}
        </>}
      </Plot>
      <Plot title="Phillips curve coordinata" xLabel="Y" yLabel="π - πe" xMin={Math.min(p.Yn,p2.Yn)-30} xMax={Math.max(p.Yn,p2.Yn)+30} yMin={-maxPGap} yMax={maxPGap}>
        {(s)=><>
          <polyline className="lineBase" fill="none" points={pointsString(range(Math.min(p.Yn,p2.Yn)-30,Math.max(p.Yn,p2.Yn)+30,60).map(Y => [Y, p.lambda*(Y-p.Yn)+p.v]), s)} />
          <line x1={s.x(p.Yn)} x2={s.x(p.Yn)} y1={s.y0} y2={s.y0+s.h} className="line45" />
          <circle cx={s.x(a.Y)} cy={s.y(a.piGap)} r="4.5" className="pointBase" />
          {shockOn && <>
            <polyline className="lineShock" fill="none" points={pointsString(range(Math.min(p.Yn,p2.Yn)-30,Math.max(p.Yn,p2.Yn)+30,60).map(Y => [Y, p2.lambda*(Y-p2.Yn)+p2.v]), s)} />
            <line x1={s.x(p2.Yn)} x2={s.x(p2.Yn)} y1={s.y0} y2={s.y0+s.h} className="shockDash" />
            <circle cx={s.x(b.Y)} cy={s.y(b.piGap)} r="4.5" className="pointShock" />
          </>}
        </>}
      </Plot>
    </div>}
  />;
}

function OpenGoodsCore(p:NumMap, i:number, E?:number) {
  const eps = E !== undefined ? E*p.Ps/p.P : p.eps;
  const denom = Math.max(0.05, 1 - p.c1 + p.m1);
  const Y = (p.c0 - p.c1*p.T + p.I0 + p.G + p.nx0 + p.x1*p.YStar + p.xE*eps - p.b*i)/denom;
  const C = p.c0 + p.c1*(Y-p.T);
  const I = p.I0 - p.b*i;
  const NX = p.nx0 + p.x1*p.YStar - p.m1*Y + p.xE*eps;
  const Z = C + I + p.G + NX;
  return {Y,C,I,NX,Z,eps};
}

function OpenGoodsModel() {
  const defaults = { c0:8, c1:0.7, T:10, I0:12, b:6, G:12, i:1.5, nx0:0, x1:0.2, m1:0.15, xE:1.3, YStar:100, eps:1.0 };
  const [p, setP] = usePersistentState<NumMap>('open-goods-params', defaults);
  const [shockOn, setShockOn] = usePersistentState<boolean>('open-goods-shock-on', false);
  const [shock, setShock] = usePersistentState<string>('open-goods-shock', 'ystar_up');
  const [shockSize, setShockSize] = usePersistentState<number>('open-goods-size', 5);
  const p2 = shockOn ? applyShock(p, shock, shockSize) : p;
  const a = OpenGoodsCore(p,p.i), b = OpenGoodsCore(p2,p2.i);
  const maxY = Math.max(120,a.Y*1.4,b.Y*1.4);
  return <ModelShell
    title="11. Economia aperta: mercato dei beni"
    description="Modulo del lato reale in economia aperta: esportazioni nette, domanda estera e tasso di cambio reale entrano direttamente nella domanda aggregata."
    controls={<>
      <SectionTitle>Parametri</SectionTitle>
      <FieldGrid params={p} setParams={setP} fields={[
        {key:'c0',label:'c0',step:0.5},{key:'c1',label:'c1',step:0.01},{key:'T',label:'T',step:0.5},
        {key:'I0',label:'I0',step:0.5},{key:'b',label:'b',step:0.5},{key:'G',label:'G',step:0.5},{key:'i',label:'i',step:0.1},
        {key:'nx0',label:'nx0',step:0.2},{key:'x1',label:'x1',step:0.02},{key:'m1',label:'m1',step:0.02},
        {key:'xE',label:'xE',step:0.05},{key:'YStar',label:'Y*',step:1},{key:'eps',label:'ε',step:0.05},
      ]}/>
      <SectionTitle>Analizza shock</SectionTitle>
      <ShockControls enabled={shockOn} setEnabled={setShockOn} shock={shock} setShock={setShock} shockSize={shockSize} setShockSize={setShockSize}
        options={[
          {id:'ystar_up',label:'Aumento Y*'},{id:'ystar_down',label:'Riduzione Y*'},
          {id:'g_up',label:'Aumento G'},{id:'g_down',label:'Riduzione G'},
          {id:'t_up',label:'Aumento T'},{id:'t_down',label:'Riduzione T'},
        ]}/>
    </>}
    outputs={<>
      <SectionTitle>Output sintetici</SectionTitle>
      <Summary items={[
        {label:'Y', value:euro(a.Y)},{label:'NX', value:euro(a.NX)},{label:'C', value:euro(a.C)},{label:'I', value:euro(a.I)},{label:'Y dopo shock', value:euro(b.Y)}
      ]}/>
      <div className="formulaBox">Y = [c0 - c1T + I0 + G + nx0 + x1Y* + xEε - b·i] / [1 - c1 + m1]</div>
    </>}
    narrative={`Un aumento del reddito estero Y* o un deprezzamento reale ε più alto migliorano NX e sostengono la produzione. In questa specificazione lineare, l’effetto è proporzionale ai parametri x1 e xE.`}
    charts={<div className="chartGrid2">
      <Plot title="Croce keynesiana aperta" xLabel="Y" yLabel="Z" xMin={0} xMax={maxY} yMin={0} yMax={maxY}>
        {(s)=><>
          <polyline className="line45" fill="none" points={pointsString([[0,0],[maxY,maxY]], s)} />
          <polyline className="lineBase" fill="none" points={pointsString(linePoints(range(0,maxY,60), Y => p.c0 + p.c1*(Y-p.T) + (p.I0-p.b*p.i) + p.G + (p.nx0 + p.x1*p.YStar - p.m1*Y + p.xE*p.eps)), s)} />
          {shockOn && <polyline className="lineShock" fill="none" points={pointsString(linePoints(range(0,maxY,60), Y => p2.c0 + p2.c1*(Y-p2.T) + (p2.I0-p2.b*p2.i) + p2.G + (p2.nx0 + p2.x1*p2.YStar - p2.m1*Y + p2.xE*p2.eps)), s)} />}
          <circle cx={s.x(a.Y)} cy={s.y(a.Y)} r="4.5" className="pointBase" />
          {shockOn && <circle cx={s.x(b.Y)} cy={s.y(b.Y)} r="4.5" className="pointShock" />}
        </>}
      </Plot>
      <Plot title="Esportazioni nette" xLabel="ε" yLabel="NX" xMin={0.5} xMax={1.8} yMin={-20} yMax={20}>
        {(s)=><>
          <polyline className="lineBase" fill="none" points={pointsString(range(0.5,1.8,60).map(e => [e, p.nx0 + p.x1*p.YStar - p.m1*a.Y + p.xE*e]), s)} />
          <circle cx={s.x(a.eps)} cy={s.y(a.NX)} r="4.5" className="pointBase" />
          {shockOn && <circle cx={s.x(b.eps)} cy={s.y(b.NX)} r="4.5" className="pointShock" />}
        </>}
      </Plot>
    </div>}
  />;
}

function UIPCore(p:NumMap, i:number) {
  const denom = 1 + i - p.iStar - p.rho;
  const E = denom <= 0.05 ? p.Ee / 0.05 : p.Ee / denom;
  return { E, denom };
}
function UIPModel() {
  const defaults = { i:1.5, iStar:1.0, Ee:1.2, rho:0.1 };
  const [p, setP] = usePersistentState<NumMap>('uip-params', defaults);
  const [shockOn, setShockOn] = usePersistentState<boolean>('uip-shock-on', false);
  const [shock, setShock] = usePersistentState<string>('uip-shock', 'istar_up');
  const [shockSize, setShockSize] = usePersistentState<number>('uip-size', 0.2);
  const p2 = shockOn ? applyShock(p, shock, shockSize) : p;
  const a = UIPCore(p,p.i), b = UIPCore(p2,p2.i);
  const warning = a.denom <= 0.05 ? 'Il denominatore della formula UIP è molto piccolo o negativo; la specificazione lineare è poco interpretabile in questa zona.' : '';
  return <ModelShell
    title="12. UIP"
    description="La parità non coperta dei tassi collega tasso interno, tasso estero, aspettative sul cambio e premio per il rischio."
    warning={warning}
    controls={<>
      <SectionTitle>Parametri</SectionTitle>
      <FieldGrid params={p} setParams={setP} fields={[
        {key:'i',label:'i interno',step:0.1},{key:'iStar',label:'i* estero',step:0.1},
        {key:'Ee',label:'Ee atteso',step:0.05},{key:'rho',label:'ρ rischio',step:0.05}
      ]}/>
      <SectionTitle>Analizza shock</SectionTitle>
      <ShockControls enabled={shockOn} setEnabled={setShockOn} shock={shock} setShock={setShock} shockSize={shockSize} setShockSize={setShockSize}
        options={[
          {id:'istar_up',label:'Aumento i*'},{id:'istar_down',label:'Riduzione i*'},
          {id:'eexp_up',label:'Aumento Ee'},{id:'eexp_down',label:'Riduzione Ee'},
          {id:'risk_up',label:'Aumento ρ'},{id:'risk_down',label:'Riduzione ρ'},
          {id:'i_up',label:'Aumento i interno'},{id:'i_down',label:'Riduzione i interno'}
        ]}/>
    </>}
    outputs={<>
      <SectionTitle>Output sintetici</SectionTitle>
      <Summary items={[
        {label:'E coerente con UIP', value:euro(a.E)},
        {label:'Differenziale i - i* - ρ', value:euro(p.i - p.iStar - p.rho)},
        {label:'E dopo shock', value:euro(b.E)}
      ]}/>
      <div className="formulaBox">i = i* + (Ee - E)/E + ρ</div>
    </>}
    narrative={`A parità di aspettative, un aumento del tasso interno tende ad apprezzare il cambio oggi (E più basso nella convenzione usata qui), mentre un aumento di i* o del rischio ρ tende a richiedere un E più alto.`}
    charts={<Plot title="UIP" xLabel="E" yLabel="i" xMin={0.4} xMax={2.2} yMin={0} yMax={4}>
      {(s)=><>
        <polyline className="lineBase" fill="none" points={pointsString(range(0.4,2.2,80).map(E => [E, p.iStar + (p.Ee-E)/E + p.rho]), s)} />
        <line x1={s.x0} x2={s.x0+s.w} y1={s.y(p.i)} y2={s.y(p.i)} className="line45" />
        <circle cx={s.x(a.E)} cy={s.y(p.i)} r="4.5" className="pointBase" />
        {shockOn && <>
          <polyline className="lineShock" fill="none" points={pointsString(range(0.4,2.2,80).map(E => [E, p2.iStar + (p2.Ee-E)/E + p2.rho]), s)} />
          <line x1={s.x0} x2={s.x0+s.w} y1={s.y(p2.i)} y2={s.y(p2.i)} className="shockDash" />
          <circle cx={s.x(b.E)} cy={s.y(p2.i)} r="4.5" className="pointShock" />
        </>}
      </>}
    </Plot>}
  />;
}

function ISLMUIPCore(p:NumMap) {
  const i = p.iBar;
  const u = UIPCore({iStar:p.iStar,Ee:p.Ee,rho:p.rho} as any, i);
  const E = u.E;
  const eps = E*p.Ps/p.P;
  const goods = OpenGoodsCore(p, i, E);
  const m = p.k*goods.Y - p.h*i;
  return {i,E,eps,m,...goods};
}

function ISLMUIPModel() {
  const defaults = { c0:8, c1:0.7, T:10, I0:12, b:6, G:12, nx0:0, x1:0.2, m1:0.15, xE:1.3, YStar:100, iBar:1.5, k:0.6, h:4, iStar:1.0, Ee:1.2, rho:0.1, P:1.0, Ps:1.0 };
  const [p, setP] = usePersistentState<NumMap>('islmuip-params', defaults);
  const [shockOn, setShockOn] = usePersistentState<boolean>('islmuip-shock-on', false);
  const [shock, setShock] = usePersistentState<string>('islmuip-shock', 'istar_up');
  const [shockSize, setShockSize] = usePersistentState<number>('islmuip-size', 0.2);
  const p2 = shockOn ? applyShock(p, shock, shockSize) : p;
  const a = ISLMUIPCore(p), b = ISLMUIPCore(p2);
  const maxY = Math.max(120,a.Y*1.5,b.Y*1.5);
  return <ModelShell
    title="13. IS-LM-UIP"
    description="Modulo aperto con mercato dei beni, BC che fissa il tasso e UIP; mostra il ruolo del cambio nel trasmettere gli shock."
    controls={<>
      <SectionTitle>Parametri</SectionTitle>
      <FieldGrid params={p} setParams={setP} fields={[
        {key:'c0',label:'c0',step:0.5},{key:'c1',label:'c1',step:0.01},{key:'T',label:'T',step:0.5},
        {key:'I0',label:'I0',step:0.5},{key:'b',label:'b',step:0.5},{key:'G',label:'G',step:0.5},
        {key:'nx0',label:'nx0',step:0.1},{key:'x1',label:'x1',step:0.02},{key:'m1',label:'m1',step:0.02},
        {key:'xE',label:'xE',step:0.05},{key:'YStar',label:'Y*',step:1},
        {key:'iBar',label:'ī',step:0.1},{key:'k',label:'k',step:0.05},{key:'h',label:'h',step:0.2},
        {key:'iStar',label:'i*',step:0.1},{key:'Ee',label:'Ee',step:0.05},{key:'rho',label:'ρ',step:0.05},
        {key:'P',label:'P interno',step:0.05},{key:'Ps',label:'P* estero',step:0.05}
      ]}/>
      <SectionTitle>Analizza shock</SectionTitle>
      <ShockControls enabled={shockOn} setEnabled={setShockOn} shock={shock} setShock={setShock} shockSize={shockSize} setShockSize={setShockSize}
        options={[
          {id:'g_up',label:'Aumento G'},{id:'g_down',label:'Riduzione G'},
          {id:'i_down',label:'Taglio ī'},{id:'i_up',label:'Aumento ī'},
          {id:'istar_up',label:'Aumento i*'},{id:'istar_down',label:'Riduzione i*'},
          {id:'eexp_up',label:'Aumento Ee'},{id:'eexp_down',label:'Riduzione Ee'},
          {id:'risk_up',label:'Aumento ρ'},{id:'risk_down',label:'Riduzione ρ'},
          {id:'ystar_up',label:'Aumento Y*'},{id:'ystar_down',label:'Riduzione Y*'}
        ]}/>
    </>}
    outputs={<>
      <SectionTitle>Output sintetici</SectionTitle>
      <Summary items={[
        {label:'Y', value:euro(a.Y)}, {label:'E', value:euro(a.E)}, {label:'ε', value:euro(a.eps)},
        {label:'NX', value:euro(a.NX)}, {label:'M/P richiesto', value:euro(a.m)}, {label:'Y dopo shock', value:euro(b.Y)}
      ]}/>
      <div className="formulaBox">i = i* + (Ee - E)/E + ρ</div>
      <div className="formulaBox">ε = E·P* / P</div>
    </>}
    narrative={`Il tasso interno fissato dalla banca centrale, insieme a i*, Ee e ρ, determina il cambio nominale tramite UIP. Quel cambio determina ε e, quindi, NX e Y. Qui Y = ${euro(a.Y)}, E = ${euro(a.E)} e NX = ${euro(a.NX)}.`}
    charts={<div className="chartGrid2">
      <Plot title="Mercato dei beni aperto" xLabel="Y" yLabel="Z" xMin={0} xMax={maxY} yMin={0} yMax={maxY}>
        {(s)=><>
          <polyline className="line45" fill="none" points={pointsString([[0,0],[maxY,maxY]], s)} />
          <polyline className="lineBase" fill="none" points={pointsString(linePoints(range(0,maxY,60), Y => p.c0 + p.c1*(Y-p.T) + (p.I0-p.b*p.iBar) + p.G + (p.nx0 + p.x1*p.YStar - p.m1*Y + p.xE*a.eps)), s)} />
          {shockOn && <polyline className="lineShock" fill="none" points={pointsString(linePoints(range(0,maxY,60), Y => p2.c0 + p2.c1*(Y-p2.T) + (p2.I0-p2.b*p2.iBar) + p2.G + (p2.nx0 + p2.x1*p2.YStar - p2.m1*Y + p2.xE*b.eps)), s)} />}
          <circle cx={s.x(a.Y)} cy={s.y(a.Y)} r="4.5" className="pointBase" />
          {shockOn && <circle cx={s.x(b.Y)} cy={s.y(b.Y)} r="4.5" className="pointShock" />}
        </>}
      </Plot>
      <Plot title="UIP" xLabel="E" yLabel="i" xMin={0.4} xMax={2.2} yMin={0} yMax={4}>
        {(s)=><>
          <polyline className="lineBase" fill="none" points={pointsString(range(0.4,2.2,80).map(E => [E, p.iStar + (p.Ee-E)/E + p.rho]), s)} />
          <line x1={s.x0} x2={s.x0+s.w} y1={s.y(p.iBar)} y2={s.y(p.iBar)} className="line45" />
          <circle cx={s.x(a.E)} cy={s.y(p.iBar)} r="4.5" className="pointBase" />
          {shockOn && <>
            <polyline className="lineShock" fill="none" points={pointsString(range(0.4,2.2,80).map(E => [E, p2.iStar + (p2.Ee-E)/E + p2.rho]), s)} />
            <line x1={s.x0} x2={s.x0+s.w} y1={s.y(p2.iBar)} y2={s.y(p2.iBar)} className="shockDash" />
            <circle cx={s.x(b.E)} cy={s.y(p2.iBar)} r="4.5" className="pointShock" />
          </>}
        </>}
      </Plot>
      <Plot title="NX e cambio reale" xLabel="ε" yLabel="NX" xMin={0.4} xMax={2.4} yMin={-20} yMax={20}>
        {(s)=><>
          <polyline className="lineBase" fill="none" points={pointsString(range(0.4,2.4,80).map(e => [e, p.nx0 + p.x1*p.YStar - p.m1*a.Y + p.xE*e]), s)} />
          <circle cx={s.x(a.eps)} cy={s.y(a.NX)} r="4.5" className="pointBase" />
          {shockOn && <circle cx={s.x(b.eps)} cy={s.y(b.NX)} r="4.5" className="pointShock" />}
        </>}
      </Plot>
    </div>}
  />;
}

function ISLMUIPExtendedModel() {
  const defaults = { c0:8, c1:0.7, T:10, I0:12, b:6, G:12, nx0:0, x1:0.2, m1:0.15, xE:1.3, YStar:100, iBar:1.5, k:0.6, h:4, iStar:1.0, Ee:1.2, rho:0.1, P:1.0, Ps:1.0 };
  const [p, setP] = usePersistentState<NumMap>('islmuip-ext-params', defaults);
  const [shockOn, setShockOn] = usePersistentState<boolean>('islmuip-ext-shock-on', false);
  const [shock, setShock] = usePersistentState<string>('islmuip-ext-shock', 'istar_up');
  const [shockSize, setShockSize] = usePersistentState<number>('islmuip-ext-size', 0.2);
  const p2 = shockOn ? applyShock(p, shock, shockSize) : p;
  const a = ISLMUIPCore(p), b = ISLMUIPCore(p2);
  const maxY = Math.max(120,a.Y*1.5,b.Y*1.5);
  const maxMP = Math.max(30,a.m*1.6,b.m*1.6);
  const maxI = Math.max(4,p.iBar+2,p2.iBar+2);
  return <ModelShell
    title="14. IS-LM-UIP esteso con mercato della moneta e croce keynesiana aperta"
    description="Versione completa del modulo aperto: croce keynesiana, mercato della moneta con BC che fissa i, quadro IS-LM moderno, UIP e grafico delle esportazioni nette."
    controls={<>
      <SectionTitle>Parametri</SectionTitle>
      <FieldGrid params={p} setParams={setP} fields={[
        {key:'c0',label:'c0',step:0.5},{key:'c1',label:'c1',step:0.01},{key:'T',label:'T',step:0.5},
        {key:'I0',label:'I0',step:0.5},{key:'b',label:'b',step:0.5},{key:'G',label:'G',step:0.5},
        {key:'nx0',label:'nx0',step:0.1},{key:'x1',label:'x1',step:0.02},{key:'m1',label:'m1',step:0.02},
        {key:'xE',label:'xE',step:0.05},{key:'YStar',label:'Y*',step:1},
        {key:'iBar',label:'ī',step:0.1},{key:'k',label:'k',step:0.05},{key:'h',label:'h',step:0.2},
        {key:'iStar',label:'i*',step:0.1},{key:'Ee',label:'Ee',step:0.05},{key:'rho',label:'ρ',step:0.05},
        {key:'P',label:'P',step:0.05},{key:'Ps',label:'P*',step:0.05}
      ]}/>
      <SectionTitle>Analizza shock</SectionTitle>
      <ShockControls enabled={shockOn} setEnabled={setShockOn} shock={shock} setShock={setShock} shockSize={shockSize} setShockSize={setShockSize}
        options={[
          {id:'g_up',label:'Aumento G'},{id:'g_down',label:'Riduzione G'},
          {id:'i_down',label:'Taglio ī'},{id:'i_up',label:'Aumento ī'},
          {id:'istar_up',label:'Aumento i*'},{id:'istar_down',label:'Riduzione i*'},
          {id:'eexp_up',label:'Aumento Ee'},{id:'eexp_down',label:'Riduzione Ee'},
          {id:'risk_up',label:'Aumento ρ'},{id:'risk_down',label:'Riduzione ρ'},
          {id:'ystar_up',label:'Aumento Y*'},{id:'ystar_down',label:'Riduzione Y*'}
        ]}/>
    </>}
    outputs={<>
      <SectionTitle>Output sintetici</SectionTitle>
      <Summary items={[
        {label:'Y', value:euro(a.Y)}, {label:'E', value:euro(a.E)}, {label:'ε', value:euro(a.eps)},
        {label:'NX', value:euro(a.NX)}, {label:'M/P richiesto', value:euro(a.m)}, {label:'Y dopo shock', value:euro(b.Y)}
      ]}/>
      <div className="formulaBox">Y = [c0 - c1T + I0 + G + nx0 + x1Y* + xEε - b·i] / [1 - c1 + m1]</div>
      <div className="formulaBox">M/P = kY - h·ī</div>
      <div className="formulaBox">i = i* + (Ee - E)/E + ρ</div>
      <div className="formulaBox">ε = E·P* / P</div>
    </>}
    narrative={`Il modulo collega cinque mercati/rappresentazioni: beni, moneta, IS-LM moderno, UIP e NX. La catena causale è: ī → E → ε → NX → Y → M/P richiesto. I risultati quantitativi riflettono una specificazione lineare di beni, moneta, NX e UIP.`}
    charts={<div className="chartGrid2">
      <Plot title="Croce keynesiana aperta" xLabel="Y" yLabel="Z" xMin={0} xMax={maxY} yMin={0} yMax={maxY} note="La forma lineare della Z(Y) dipende dalle assunzioni su consumo, investimenti e NX.">
        {(s)=><>
          <polyline className="line45" fill="none" points={pointsString([[0,0],[maxY,maxY]], s)} />
          <polyline className="lineBase" fill="none" points={pointsString(linePoints(range(0,maxY,60), Y => p.c0 + p.c1*(Y-p.T) + (p.I0-p.b*p.iBar) + p.G + (p.nx0 + p.x1*p.YStar - p.m1*Y + p.xE*a.eps)), s)} />
          {shockOn && <polyline className="lineShock" fill="none" points={pointsString(linePoints(range(0,maxY,60), Y => p2.c0 + p2.c1*(Y-p2.T) + (p2.I0-p2.b*p2.iBar) + p2.G + (p2.nx0 + p2.x1*p2.YStar - p2.m1*Y + p2.xE*b.eps)), s)} />}
          <circle cx={s.x(a.Y)} cy={s.y(a.Y)} r="4.5" className="pointBase" />
          {shockOn && <circle cx={s.x(b.Y)} cy={s.y(b.Y)} r="4.5" className="pointShock" />}
        </>}
      </Plot>
      <Plot title="Mercato della moneta" xLabel="M/P" yLabel="i" xMin={0} xMax={maxMP} yMin={0} yMax={maxI} note="La BC fissa ī e adatta M/P per mantenere l’equilibrio monetario.">
        {(s)=><>
          <polyline className="lineBase" fill="none" points={pointsString(range(0,maxMP,60).map(m => [m, (p.k*a.Y - m)/Math.max(0.2,p.h)]), s)} />
          <line x1={s.x0} x2={s.x0+s.w} y1={s.y(p.iBar)} y2={s.y(p.iBar)} className="line45" />
          <line x1={s.x(a.m)} x2={s.x(a.m)} y1={s.y0} y2={s.y0+s.h} className="lineBaseThin" />
          {shockOn && <>
            <polyline className="lineShock" fill="none" points={pointsString(range(0,maxMP,60).map(m => [m, (p2.k*b.Y - m)/Math.max(0.2,p2.h)]), s)} />
            <line x1={s.x0} x2={s.x0+s.w} y1={s.y(p2.iBar)} y2={s.y(p2.iBar)} className="shockDash" />
            <line x1={s.x(b.m)} x2={s.x(b.m)} y1={s.y0} y2={s.y0+s.h} className="lineShockThin" />
          </>}
        </>}
      </Plot>
      <Plot title="IS-LM moderno aperto" xLabel="Y" yLabel="i" xMin={0} xMax={maxY} yMin={0} yMax={maxI}>
        {(s)=><>
          <polyline className="lineBase" fill="none" points={pointsString(range(0,maxI,60).map(i => [OpenGoodsCore(p,i,a.E).Y, i]), s)} />
          <line x1={s.x0} x2={s.x0+s.w} y1={s.y(p.iBar)} y2={s.y(p.iBar)} className="line45" />
          <circle cx={s.x(a.Y)} cy={s.y(p.iBar)} r="4.5" className="pointBase" />
          {shockOn && <>
            <polyline className="lineShock" fill="none" points={pointsString(range(0,maxI,60).map(i => [OpenGoodsCore(p2,i,b.E).Y, i]), s)} />
            <line x1={s.x0} x2={s.x0+s.w} y1={s.y(p2.iBar)} y2={s.y(p2.iBar)} className="shockDash" />
            <circle cx={s.x(b.Y)} cy={s.y(p2.iBar)} r="4.5" className="pointShock" />
          </>}
        </>}
      </Plot>
      <Plot title="UIP" xLabel="E" yLabel="i" xMin={0.4} xMax={2.2} yMin={0} yMax={4}>
        {(s)=><>
          <polyline className="lineBase" fill="none" points={pointsString(range(0.4,2.2,80).map(E => [E, p.iStar + (p.Ee-E)/E + p.rho]), s)} />
          <line x1={s.x0} x2={s.x0+s.w} y1={s.y(p.iBar)} y2={s.y(p.iBar)} className="line45" />
          <circle cx={s.x(a.E)} cy={s.y(p.iBar)} r="4.5" className="pointBase" />
          {shockOn && <>
            <polyline className="lineShock" fill="none" points={pointsString(range(0.4,2.2,80).map(E => [E, p2.iStar + (p2.Ee-E)/E + p2.rho]), s)} />
            <line x1={s.x0} x2={s.x0+s.w} y1={s.y(p2.iBar)} y2={s.y(p2.iBar)} className="shockDash" />
            <circle cx={s.x(b.E)} cy={s.y(p2.iBar)} r="4.5" className="pointShock" />
          </>}
        </>}
      </Plot>
      <Plot title="Esportazioni nette" xLabel="ε" yLabel="NX" xMin={0.4} xMax={2.4} yMin={-20} yMax={20} note="L’effetto di ε su NX è lineare per costruzione: dipende dal parametro xE.">
        {(s)=><>
          <polyline className="lineBase" fill="none" points={pointsString(range(0.4,2.4,80).map(e => [e, p.nx0 + p.x1*p.YStar - p.m1*a.Y + p.xE*e]), s)} />
          <circle cx={s.x(a.eps)} cy={s.y(a.NX)} r="4.5" className="pointBase" />
          {shockOn && <circle cx={s.x(b.eps)} cy={s.y(b.NX)} r="4.5" className="pointShock" />}
        </>}
      </Plot>
    </div>}
  />;
}

function buildShareLink(modelId:string, params:any) {
  try {
    const payload = btoa(unescape(encodeURIComponent(JSON.stringify(params))));
    const url = new URL(window.location.href);
    url.searchParams.set('model', modelId);
    url.searchParams.set('state', payload);
    return url.toString();
  } catch {
    return window.location.href;
  }
}
function parseSharedState() {
  try {
    const url = new URL(window.location.href);
    const model = url.searchParams.get('model');
    const state = url.searchParams.get('state');
    if (!model || !state) return null;
    return { model, params: JSON.parse(decodeURIComponent(escape(atob(state)))) };
  } catch {
    return null;
  }
}

export default function App() {
  const [accepted, setAccepted] = usePersistentState<boolean>('macro-beta-accepted', false);
  const [advanced, setAdvanced] = usePersistentState<boolean>('macro-advanced', false);
  const [modelId, setModelId] = usePersistentState<string>('macro-current-model', 'intro');
  const [shareMsg, setShareMsg] = useState('');

  useEffect(() => {
    const parsed = parseSharedState();
    if (parsed?.model) setModelId(parsed.model);
  }, []);

  if (!accepted) return <BetaGate onEnter={() => setAccepted(true)} />;

  let moduleEl: React.ReactNode = null;
  switch (modelId) {
    case 'intro': moduleEl = <IntroModel />; break;
    case 'kc': moduleEl = <KeynesianCrossModel />; break;
    case 'is': moduleEl = <ISCurveModel />; break;
    case 'lm': moduleEl = <LMClassicModel />; break;
    case 'islmFlat': moduleEl = <ISLMFlatModel />; break;
    case 'islmRisk': moduleEl = <ISLMRiskModel />; break;
    case 'wsps': moduleEl = <WSPSModel />; break;
    case 'phillips': moduleEl = <PhillipsModel />; break;
    case 'islmpc': moduleEl = <ISLMPCModel />; break;
    case 'openGoods': moduleEl = <OpenGoodsModel />; break;
    case 'uip': moduleEl = <UIPModel />; break;
    case 'islmuip': moduleEl = <ISLMUIPModel />; break;
    case 'islmuipExt': moduleEl = <ISLMUIPExtendedModel />; break;
    default: moduleEl = <IntroModel />;
  }

  return (
    <div className="appRoot">
      <header className="topbar">
        <div>
          <div className="brand">Introduzione alla Macroeconomia</div>
          <div className="subbrand">Università di Modena e Reggio Emilia – Dipartimento di Economia “Marco Biagi”</div>
        </div>
        <div className="topActions">
          <label className="checkboxRow compact"><span>Modalità avanzata</span><input type="checkbox" checked={advanced} onChange={e => setAdvanced(e.target.checked)} /></label>
          <button className="secondary" onClick={() => { localStorage.clear(); window.location.reload(); }}>Reset completo</button>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <Card>
            <SectionTitle>Modelli</SectionTitle>
            <div className="modelList">
              {MODEL_LIST.map(m => (
                <button key={m.id} className={`modelBtn ${modelId === m.id ? 'active' : ''}`} onClick={() => setModelId(m.id)}>
                  {m.label}
                </button>
              ))}
            </div>
            <div className="divider" />
            <div className="miniNote">
              Questa app è una beta. I modelli sono specificazioni lineari e didattiche. I risultati vanno letti come supporto alla comprensione qualitativa.
            </div>
            <div className="divider" />
            <LinkButton onClick={() => {
              const link = buildShareLink(modelId, { note: 'Lo stato completo dei parametri è salvato in localStorage nel browser.' });
              navigator.clipboard?.writeText(link);
              setShareMsg('Link copiato negli appunti.');
              setTimeout(() => setShareMsg(''), 2000);
            }}>Copia link condivisibile</LinkButton>
            {shareMsg && <div className="miniSuccess">{shareMsg}</div>}
          </Card>
        </aside>

        <main className="mainContent">
          <div className="advancedNote">{advanced ? 'Modalità avanzata attiva: i pannelli numerici e le equazioni sono più espliciti.' : 'Modalità base attiva: focus su intuizione economica, grafici e comparazione prima/dopo.'}</div>
          {moduleEl}
        </main>
      </div>
    </div>
  );
}
