'use client';
import { useEffect, useRef, useState } from 'react';
import { roomRequest } from '../../lib/room-client';
import { evolveAppearances, rankRacers, racerColour, speciesLabels } from '../../lib/race-ranking';
import Runner from './Runner';
import RaceResults from './RaceResults';
import { raceResults } from '../../lib/race-results';
import { useSite } from '../SiteContext';
export default function VisualRace({ room, connected, onError }) {
    const { save } = useSite();
    const me = room.people.find(p => p.id === room.me), [value, setValue] = useState(me.input || ''), [now, setNow] = useState(Date.now()), [appearances, setAppearances] = useState({});
    useEffect(() => { if (room.phase !== 'running')
        return; const frame = requestAnimationFrame(() => { const field = document.querySelector('.race-typing textarea'); (document.querySelector('.race-typing') || document.querySelector('.race-lanes'))?.scrollIntoView({ block: 'center', behavior: 'instant' }); field?.focus({ preventScroll: true }); }); return () => cancelAnimationFrame(frame); }, [room.startedAt]);
    const activity = useRef({});
    const heatKey = 'guepard-heat-' + room.id + '-' + room.startedAt;
    const heat = useRef({});
    useEffect(() => { try {
        heat.current = JSON.parse(sessionStorage.getItem(heatKey) || '{}');
    }
    catch { } }, [heatKey]);
    const latest = useRef(room), offset = useRef(room.serverNow - Date.now()), typed = useRef(me.typed || 0), queued = useRef(null), sending = useRef(false);
    latest.current = room;
    const finished = room.phase === 'finished', countdown = Math.max(0, Math.ceil(((room.startedAt || 0) - (now + offset.current)) / 1000)), elapsed = Math.max(0, (now + offset.current - (room.startedAt || 0)) / 1000), ranks = rankRacers(room.people);
    useEffect(() => { const timer = setInterval(() => { setNow(Date.now()); const r = latest.current; for (const p of r.people) {
        const old = activity.current[p.id];
        if (!old || old.progress !== p.progress)
            activity.current[p.id] = { progress: p.progress, at: Date.now() };
    } setAppearances(old => evolveAppearances(r.people, old, Date.now(), r.phase === 'finished')); if (queued.current !== null && !sending.current && r.phase === 'running') {
        const next = queued.current;
        queued.current = null;
        sending.current = true;
        roomRequest(r.id, { action: 'progress', value: next, typed: typed.current }).catch(e => { onError(e.message); if (queued.current === null)
            queued.current = next; }).finally(() => { sending.current = false; });
    } }, 180); return () => clearInterval(timer); }, [onError]);
    function type(next) { if (next.length > value.length) {
        for (let i = value.length; i < next.length; i++) {
            const k = (room.text?.[i] || next[i]).toLowerCase(), entry = heat.current[k] || { hits: 0, errors: 0 };
            entry.hits++;
            if (next[i] !== room.text?.[i])
                entry.errors++;
            heat.current[k] = entry;
        }
        try {
            sessionStorage.setItem(heatKey, JSON.stringify(heat.current));
        }
        catch { }
    } if (next.length > value.length)
        typed.current += next.length - value.length; if (room.settings.blockErrors && !room.text.startsWith(next))
        return; setValue(next); queued.current = next; }
    const stateFor = (p) => p.abandoned ? 'Abandon' : p.finishedAt ? 'Terminé' : finished ? 'Temps écoulé' : (p.id === room.me && !connected) || (p.kind !== 'bot' && now + offset.current - p.seen > 35000) ? 'Reconnexion…' : 'En course';
    useEffect(() => { if (!finished || me.role !== 'player')
        return; const resultId = room.id + '-' + room.startedAt; const m = raceResults(room).find(r => r.person.id === me.id); save('results', (old) => old.some(r => r.id === resultId) ? old : [...old, { id: resultId, date: room.endedAt || Date.now(), speed: m.speed, accuracy: m.accuracy, score: m.score }]); }, [finished, room.id, room.startedAt, me.id]);
    if (finished)
        return <RaceResults room={room}/>;
    return <div className="visual-race"><div className="visual-race-heading"><div><h2>{finished ? 'Le podium de la jungle' : countdown ? 'Tout le monde sur la ligne de départ' : 'La course est lancée'}</h2><p>La piste indique la progression validée. L’animal représente le rang.</p></div><strong className="race-clock" role="status">{finished ? 'Course terminée' : countdown ? 'Départ dans ' + countdown : Math.floor(elapsed) + ' s'}</strong></div>
 <p className="ranking-rule">{finished ? 'Classement final' : 'Classement en direct'} : ordre d’arrivée, puis progression ; abandons à la fin. Les égalités partagent le même rang. L’animal n’influence pas la frappe.</p>
 {!finished && <><div className="race-lanes" aria-label="Pistes des participants">{room.people.filter(p => p.role === 'player').map(p => { const result = ranks.find(r => r.person.id === p.id), percent = Math.min(100, Math.max(0, p.progress / Math.max(1, room.text?.length || 0) * 100)), species = appearances[p.id]?.species || 'cheetah'; return <div key={p.id} className={'race-lane ' + (p.id === room.me ? 'is-local ' : '') + (p.kind === 'bot' ? 'is-bot ' : '') + (p.abandoned ? 'is-abandoned' : '')} data-player-id={p.id} style={{ '--racer-colour': racerColour(p.id) }}><div className="race-lane-label"><strong><i />{p.name}{p.id === room.me ? ' · toi' : ''}</strong><span>#{result.rank}{result.tied ? ' ex æquo' : ''} · {speciesLabels[species]} · {Math.round(percent)} %</span><small>{countdown ? 'Au départ' : stateFor(p)}</small></div><div className="race-lane-road" role="progressbar" aria-label={'Progression de ' + p.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}><span className="lane-start">Départ</span><span className="lane-finish">Arrivée</span><div className="lane-travel"><div className="lane-position" style={{ left: percent + '%' }}><Runner key={species} species={species} motion={countdown ? 'waiting' : p.finishedAt ? 'arrived' : p.abandoned || stateFor(p) === 'Reconnexion…' ? 'stopped' : p.kind === 'bot' || p.progress > 0 && now - (activity.current[p.id]?.at || 0) < 1400 ? 'running' : 'stopped'}/></div></div></div></div>; })}</div>
 {me.role === 'spectator' ? <p className="spectator-message" role="status">Mode spectateur. Tu suis les pistes et tu participeras à la prochaine course.</p> : <div className="race-typing"><div className="typing-title"><h3>À tes doigts de jouer</h3><span>{room.settings.blockErrors ? 'Correction obligatoire' : 'Erreurs libres'}</span></div><p className="target room-target">{[...room.text || ''].map((ch, i) => <span key={i} className={i < value.length ? ch === value[i] ? 'correct' : 'incorrect' : ''}>{ch}</span>)}</p><textarea aria-label="Texte de la course" value={value} onChange={e => type(e.target.value.slice(0, room.text.length))} disabled={countdown > 0 || me.abandoned || !!me.finishedAt || !connected} onPaste={e => e.preventDefault()} onDrop={e => e.preventDefault()} spellCheck={false} autoCapitalize="off" autoCorrect="off" placeholder="Tape le texte ici…"/>{!connected && <p role="status">Reconnexion… Ta saisie est conservée.</p>}{me.finishedAt && <p role="status">Terminé ! Tu peux suivre les autres pistes.</p>}{!me.abandoned && !me.finishedAt && <button className="woodland-back" onClick={() => { queued.current = null; roomRequest(room.id, { action: 'abandon' }).catch(e => onError(e.message)); }}>Abandonner la course</button>}</div>}</>}
 </div>;
}
