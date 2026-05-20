import React, { useState, useEffect } from 'react';
import {
    Trophy, BarChart3, Target, Calendar, MoreHorizontal,
    LogOut, FileText, ChevronDown, ChevronLeft, ChevronRight,
    Lock, Plus, Pencil, Trash2, Users, ClipboardList,
    ArrowLeft, Eye, EyeOff, Check, X, Settings
} from 'lucide-react';

// ============================================================
// BRANDING
// ============================================================
const BRAND = {
    orange: '#EE5A1F',
    orangeDark: '#D14E18',
    orangeSoft: '#FFF1EA',
    navy: '#2D3E50',
    ink: '#111827',
    muted: '#6B7280',
    surface: '#FFFFFF',
    surfaceAlt: '#F9FAFB',
    success: '#16A34A',
    danger: '#DC2626',
    border: '#E5E7EB',
};

// ============================================================
// MOCK DATA
// ============================================================
const ME = { name: 'Martín García', email: 'martin.garcia@carestino.com' };

const LEADERBOARD = [
    { pos: 1, name: 'Lucía Fernández', exact: 8, points: 87 },
    { pos: 2, name: 'Diego Rodríguez', exact: 7, points: 82 },
    { pos: 2, name: 'Sofía Pereyra', exact: 6, points: 82 },
    { pos: 4, name: 'Martín García', exact: 5, points: 79, isMe: true },
    { pos: 5, name: 'Camila Suárez', exact: 5, points: 75 },
    { pos: 6, name: 'Joaquín Romero', exact: 4, points: 71 },
    { pos: 7, name: 'Valentina Cruz', exact: 4, points: 68 },
    { pos: 8, name: 'Federico Acosta', exact: 3, points: 65 },
    { pos: 9, name: 'Agustina Moreno', exact: 3, points: 62 },
    { pos: 10, name: 'Tomás Vega', exact: 3, points: 58 },
    { pos: 11, name: 'Bruno Castro', exact: 2, points: 54 },
    { pos: 12, name: 'Julieta Ríos', exact: 2, points: 49 },
];

const GROUPS = [
    {
        name: 'A',
        teams: [
            { name: 'México', flag: '🇲🇽', pj: 2, g: 2, e: 0, p: 0, dg: '+4', pts: 6 },
            { name: 'Corea del Sur', flag: '🇰🇷', pj: 2, g: 1, e: 0, p: 1, dg: '0', pts: 3 },
            { name: 'Rep. Checa', flag: '🇨🇿', pj: 2, g: 1, e: 0, p: 1, dg: '-1', pts: 3 },
            { name: 'Marruecos', flag: '🇲🇦', pj: 2, g: 0, e: 0, p: 2, dg: '-3', pts: 0 },
        ],
    },
    {
        name: 'B',
        teams: [
            { name: 'Canadá', flag: '🇨🇦', pj: 2, g: 2, e: 0, p: 0, dg: '+3', pts: 6 },
            { name: 'Suiza', flag: '🇨🇭', pj: 2, g: 1, e: 1, p: 0, dg: '+2', pts: 4 },
            { name: 'Bosnia-Herz.', flag: '🇧🇦', pj: 2, g: 0, e: 1, p: 1, dg: '-1', pts: 1 },
            { name: 'Catar', flag: '🇶🇦', pj: 2, g: 0, e: 0, p: 2, dg: '-4', pts: 0 },
        ],
    },
    {
        name: 'C',
        teams: [
            { name: 'Brasil', flag: '🇧🇷', pj: 2, g: 2, e: 0, p: 0, dg: '+5', pts: 6 },
            { name: 'Escocia', flag: '🏴', pj: 2, g: 1, e: 0, p: 1, dg: '+1', pts: 3 },
            { name: 'Haití', flag: '🇭🇹', pj: 2, g: 1, e: 0, p: 1, dg: '-2', pts: 3 },
            { name: 'Costa Marfil', flag: '🇨🇮', pj: 2, g: 0, e: 0, p: 2, dg: '-4', pts: 0 },
        ],
    },
    {
        name: 'D',
        teams: [
            { name: 'Argentina', flag: '🇦🇷', pj: 2, g: 2, e: 0, p: 0, dg: '+5', pts: 6 },
            { name: 'Paraguay', flag: '🇵🇾', pj: 2, g: 1, e: 0, p: 1, dg: '+1', pts: 3 },
            { name: 'Australia', flag: '🇦🇺', pj: 2, g: 1, e: 0, p: 1, dg: '0', pts: 3 },
            { name: 'Turquía', flag: '🇹🇷', pj: 2, g: 0, e: 0, p: 2, dg: '-6', pts: 0 },
        ],
    },
];

const CURRENT_ROUND_MATCHES = [
    {
        id: 1, day: 'Vie 12/06', time: '16:00', group: 'Grupo B',
        home: { name: 'Canadá', code: 'CAN', flag: '🇨🇦' },
        away: { name: 'Bosnia-Herz.', code: 'BIH', flag: '🇧🇦' },
        locked: false, predHome: '', predAway: '', isKnockout: false,
    },
    {
        id: 2, day: 'Vie 12/06', time: '22:00', group: 'Grupo D',
        home: { name: 'USA', code: 'USA', flag: '🇺🇸' },
        away: { name: 'Paraguay', code: 'PAR', flag: '🇵🇾' },
        locked: false, predHome: '2', predAway: '1', isKnockout: false,
    },
    {
        id: 3, day: 'Sáb 13/06', time: '16:00', group: 'Grupo B',
        home: { name: 'Catar', code: 'QAT', flag: '🇶🇦' },
        away: { name: 'Suiza', code: 'SUI', flag: '🇨🇭' },
        locked: true, predHome: '0', predAway: '2', isKnockout: false,
    },
    {
        id: 4, day: 'Sáb 13/06', time: '19:00', group: 'Grupo C',
        home: { name: 'Brasil', code: 'BRA', flag: '🇧🇷' },
        away: { name: 'Marruecos', code: 'MAR', flag: '🇲🇦' },
        locked: false, predHome: '3', predAway: '0', isKnockout: false,
    },
];

const FIXTURE = [
    {
        date: 'Viernes, 12 de junio', matches: [
            { home: 'Canadá', homeFlag: '🇨🇦', away: 'Bosnia-Herz.', awayFlag: '🇧🇦', time: '16:00' },
            { home: 'USA', homeFlag: '🇺🇸', away: 'Paraguay', awayFlag: '🇵🇾', time: '22:00' },
        ]
    },
    {
        date: 'Sábado, 13 de junio', matches: [
            { home: 'Catar', homeFlag: '🇶🇦', away: 'Suiza', awayFlag: '🇨🇭', time: '16:00' },
            { home: 'Brasil', homeFlag: '🇧🇷', away: 'Marruecos', awayFlag: '🇲🇦', time: '19:00' },
            { home: 'Haití', homeFlag: '🇭🇹', away: 'Escocia', awayFlag: '🏴', time: '22:00' },
        ]
    },
    {
        date: 'Domingo, 14 de junio', matches: [
            { home: 'Australia', homeFlag: '🇦🇺', away: 'Turquía', awayFlag: '🇹🇷', time: '01:00' },
            { home: 'Alemania', homeFlag: '🇩🇪', away: 'Curazao', awayFlag: '🇨🇼', time: '14:00' },
            { home: 'Países Bajos', homeFlag: '🇳🇱', away: 'Japón', awayFlag: '🇯🇵', time: '17:00' },
            { home: 'Costa Marfil', homeFlag: '🇨🇮', away: 'Ecuador', awayFlag: '🇪🇨', time: '20:00' },
        ]
    },
];

const ADMIN_USERS = [
    { id: 1, nombre: 'Admin', apellido: 'Sistema', cuil: '20-00000000-0', email: 'admin', esAdmin: true },
    { id: 2, nombre: 'Martín', apellido: 'García', cuil: '20-35123456-9', email: 'martin.garcia@carestino.com', esAdmin: false },
    { id: 3, nombre: 'Lucía', apellido: 'Fernández', cuil: '27-34987654-2', email: 'lucia.fernandez@carestino.com', esAdmin: false },
    { id: 4, nombre: 'Diego', apellido: 'Rodríguez', cuil: '20-33555111-7', email: 'diego.rodriguez@carestino.com', esAdmin: true },
    { id: 5, nombre: 'Sofía', apellido: 'Pereyra', cuil: '27-36222333-4', email: 'sofia.pereyra@carestino.com', esAdmin: false },
];

const ADMIN_MATCHES = [
    { id: 1, day: 'Mié 11/06', time: '23:00', home: 'Corea del Sur', homeFlag: '🇰🇷', away: 'Rep. Checa', awayFlag: '🇨🇿', homeGoals: 1, awayGoals: 0, status: 'finalizado' },
    { id: 2, day: 'Vie 12/06', time: '16:00', home: 'Canadá', homeFlag: '🇨🇦', away: 'Bosnia-Herz.', awayFlag: '🇧🇦', homeGoals: null, awayGoals: null, status: 'programado' },
    { id: 3, day: 'Vie 12/06', time: '22:00', home: 'USA', homeFlag: '🇺🇸', away: 'Paraguay', awayFlag: '🇵🇾', homeGoals: null, awayGoals: null, status: 'programado' },
    { id: 4, day: 'Sáb 13/06', time: '16:00', home: 'Catar', homeFlag: '🇶🇦', away: 'Suiza', awayFlag: '🇨🇭', homeGoals: null, awayGoals: null, status: 'programado' },
];

const RULES_TEXT = [
    {
        title: '1. ¿Cómo se juega?',
        body: 'Cargá tus predicciones de los partidos del Mundial 2026 hasta 15 minutos antes del inicio de cada partido. Los puntos se obtienen según aciertos en ganador, diferencia de gol y resultado exacto.'
    },
    {
        title: '2. Puntuación',
        body: '• 7 puntos por acertar ganador y resultado exacto.\n• 5 puntos por acertar ganador y diferencia de gol.\n• 3 puntos por acertar solo el ganador.\n• 0 puntos en cualquier otro caso.'
    },
    {
        title: '3. Resultado que cuenta',
        body: 'Se toma el marcador al terminar los 90 minutos + adicional. En eliminatorias, los 120 minutos. Los penales NO cuentan para el resultado.'
    },
    {
        title: '4. Eliminatorias',
        body: 'En partidos de eliminación directa NO se puede predecir empate. Tenés que ingresar un ganador y un perdedor. Si el partido se define por penales, vale como victoria simple del ganador (3 puntos para quien lo predijo).'
    },
    {
        title: '5. Partidos postergados',
        body: 'Si se reprograma dentro de la misma fecha, cuenta normalmente. Si se juega fuera de su fecha original, cuenta para la fecha en la que se juega. Si se resuelve administrativamente, no suma puntos.'
    },
    {
        title: '6. Predicciones sin completar',
        body: 'Si no cargás una predicción antes del cierre, ese partido suma 0 puntos.'
    },
    {
        title: '7. Cuándo empezás a sumar',
        body: 'Cada participante suma desde la fecha en la que fue dado de alta. Quien entra en fecha 5 no acumula puntos de fechas 1 a 4.'
    },
    {
        title: '8. Tabla de posiciones',
        body: 'Se ordena por puntos de mayor a menor. En caso de empate, los participantes comparten posición (puede haber 1°, 2°, 2°, 4°). Para el orden visual entre empatados, quien tenga más resultados exactos aparece primero.'
    },
];

// ============================================================
// COMPONENTES COMPARTIDOS
// ============================================================

function Logo({ size = 28 }) {
    return (
        <div
            className="flex items-center justify-center rounded-full font-bold text-white"
            style={{
                width: size, height: size, background: BRAND.orange,
                fontSize: size * 0.55, fontFamily: 'Montserrat, sans-serif',
                letterSpacing: '-0.02em',
            }}
        >
            C
        </div>
    );
}

function Header({ title, showBack, onBack, adminBadge }) {
    return (
        <div
            className="px-4 pt-3 pb-4 flex items-center gap-3"
            style={{ background: BRAND.orange, color: 'white' }}
        >
            {showBack ? (
                <button onClick={onBack} className="p-1 -ml-1">
                    <ArrowLeft size={22} />
                </button>
            ) : (
                <Logo size={32} />
            )}
            <div className="flex-1">
                <div className="text-[10px] tracking-[0.18em] opacity-80 font-semibold">PRODE CARESTINO</div>
                <div className="text-base font-extrabold tracking-tight">{title}</div>
            </div>
            {adminBadge && (
                <span className="text-[10px] px-2 py-1 rounded-full font-bold tracking-wider"
                    style={{ background: 'rgba(255,255,255,0.18)', letterSpacing: '0.15em' }}>
                    ADMIN
                </span>
            )}
        </div>
    );
}

function TabBar({ active, onChange }) {
    const tabs = [
        { id: 'torneo', label: 'Torneo', icon: Trophy },
        { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
        { id: 'predict', label: 'Predicciones', icon: Target },
        { id: 'fixture', label: 'Fixture', icon: Calendar },
        { id: 'more', label: 'Más', icon: MoreHorizontal },
    ];

    return (
        <div
            className="grid grid-cols-5 border-t bg-white"
            style={{ borderColor: BRAND.border }}
        >
            {tabs.map(t => {
                const isActive = active === t.id;
                const Icon = t.icon;
                return (
                    <button
                        key={t.id}
                        onClick={() => onChange(t.id)}
                        className="flex flex-col items-center gap-1 py-2.5 transition-colors"
                        style={{ color: isActive ? BRAND.orange : BRAND.muted }}
                    >
                        <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                        <span className="text-[10px] font-semibold tracking-wide">{t.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

function Field({ label, type = 'text', value, onChange, placeholder, helper }) {
    const [show, setShow] = useState(false);
    const isPass = type === 'password';
    return (
        <label className="block">
            <span className="block text-[11px] font-bold tracking-wider mb-1.5 uppercase"
                style={{ color: BRAND.navy }}>
                {label}
            </span>
            <div className="relative">
                <input
                    type={isPass && !show ? 'password' : 'text'}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition focus:ring-2"
                    style={{
                        border: `1px solid ${BRAND.border}`,
                        background: BRAND.surface, color: BRAND.ink,
                        fontFamily: 'Montserrat',
                    }}
                    onFocus={e => e.target.style.borderColor = BRAND.orange}
                    onBlur={e => e.target.style.borderColor = BRAND.border}
                />
                {isPass && (
                    <button type="button" onClick={() => setShow(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: BRAND.muted }}>
                        {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                )}
            </div>
            {helper && <span className="block mt-1 text-[11px]" style={{ color: BRAND.muted }}>{helper}</span>}
        </label>
    );
}

function Button({ children, onClick, variant = 'primary', size = 'md', fullWidth }) {
    const styles = {
        primary: { background: BRAND.orange, color: 'white' },
        secondary: { background: 'white', color: BRAND.orange, border: `1.5px solid ${BRAND.orange}` },
        ghost: { background: 'transparent', color: BRAND.navy },
        danger: { background: BRAND.danger, color: 'white' },
    };
    const sizes = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2.5 text-sm',
    };
    return (
        <button
            onClick={onClick}
            className={`${sizes[size]} rounded-lg font-bold tracking-wide transition active:scale-[0.98] ${fullWidth ? 'w-full' : ''}`}
            style={styles[variant]}
        >
            {children}
        </button>
    );
}

// ============================================================
// PANTALLAS: LOGIN
// ============================================================
function Login({ go }) {
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');

    return (
        <div className="flex flex-col h-full" style={{ background: BRAND.surface }}>
            <div
                className="pt-12 pb-10 px-6 flex flex-col items-center"
                style={{ background: BRAND.orange, color: 'white' }}
            >
                <Logo size={56} />
                <div className="mt-3 text-[10px] tracking-[0.22em] opacity-90 font-semibold">PRODE CARESTINO</div>
                <div className="mt-1 text-2xl font-extrabold tracking-tight">Mundial 2026</div>
            </div>

            <div className="flex-1 px-6 py-8 flex flex-col gap-4">
                <Field label="Email" type="email" value={email}
                    onChange={e => setEmail(e.target.value)} placeholder="tu.email@carestino.com" />
                <Field label="Contraseña" type="password" value={pass}
                    onChange={e => setPass(e.target.value)} placeholder="••••••••" />

                <div className="mt-2">
                    <Button onClick={() => go('torneo')} fullWidth>INGRESAR</Button>
                </div>

                <button
                    onClick={() => go('register')}
                    className="mt-2 text-sm text-center font-semibold"
                    style={{ color: BRAND.navy }}
                >
                    ¿No tenés cuenta? <span style={{ color: BRAND.orange }}>Registrate</span>
                </button>

                <div className="text-[11px] text-center mt-1" style={{ color: BRAND.muted }}>
                    Si olvidaste tu contraseña, contactá al admin.
                </div>
            </div>

            <div className="px-6 py-4 text-center text-[10px] tracking-wider" style={{ color: BRAND.muted }}>
                CARESTINO · BEBÉS FELICES
            </div>
        </div>
    );
}

// ============================================================
// PANTALLAS: REGISTER
// ============================================================
function Register({ go }) {
    const [form, setForm] = useState({ nombre: '', apellido: '', cuil: '', email: '', pass: '', pass2: '' });
    const set = k => e => setForm({ ...form, [k]: e.target.value });

    return (
        <div className="flex flex-col h-full" style={{ background: BRAND.surface }}>
            <Header title="Crear cuenta" showBack onBack={() => go('login')} />

            <div className="flex-1 px-5 py-6 overflow-y-auto">
                <div className="flex flex-col gap-3.5">
                    <Field label="Nombre" value={form.nombre} onChange={set('nombre')} placeholder="Martín" />
                    <Field label="Apellido" value={form.apellido} onChange={set('apellido')} placeholder="García" />
                    <Field label="CUIL" value={form.cuil} onChange={set('cuil')} placeholder="20-35123456-9" />
                    <Field label="Email" type="email" value={form.email} onChange={set('email')}
                        placeholder="tu.email@carestino.com" helper="Usarás este email para ingresar." />
                    <Field label="Contraseña" type="password" value={form.pass} onChange={set('pass')} placeholder="••••••••" />
                    <Field label="Repetir contraseña" type="password" value={form.pass2} onChange={set('pass2')} placeholder="••••••••" />

                    <div className="mt-3">
                        <Button onClick={() => go('torneo')} fullWidth>CREAR CUENTA</Button>
                    </div>
                    <button onClick={() => go('login')}
                        className="text-sm text-center font-semibold"
                        style={{ color: BRAND.navy }}>
                        Volver a ingresar
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// PANTALLAS: TORNEO (LEADERBOARD)
// ============================================================
function Torneo({ go }) {
    return (
        <div className="flex flex-col h-full" style={{ background: BRAND.surfaceAlt }}>
            <Header title="Torneo" />

            {/* User card */}
            <div className="px-4 -mt-3 mb-3">
                <div className="rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm"
                    style={{ background: 'white', border: `1px solid ${BRAND.border}` }}>
                    <div className="rounded-full w-10 h-10 flex items-center justify-center font-bold"
                        style={{ background: BRAND.orangeSoft, color: BRAND.orange }}>
                        MG
                    </div>
                    <div className="flex-1">
                        <div className="text-xs font-semibold" style={{ color: BRAND.muted }}>Tu posición</div>
                        <div className="text-sm font-bold" style={{ color: BRAND.ink }}>4° · {ME.name}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: BRAND.muted }}>Puntos</div>
                        <div className="text-xl font-extrabold" style={{ color: BRAND.orange }}>79</div>
                    </div>
                </div>
            </div>

            <div className="px-4 mb-2 flex items-center justify-between">
                <h2 className="text-xs font-extrabold tracking-[0.18em]" style={{ color: BRAND.navy }}>
                    TABLA GENERAL
                </h2>
                <span className="text-[11px] font-semibold" style={{ color: BRAND.muted }}>
                    {LEADERBOARD.length} participantes
                </span>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="rounded-2xl bg-white overflow-hidden"
                    style={{ border: `1px solid ${BRAND.border}` }}>
                    <div className="grid grid-cols-12 px-3 py-2.5 text-[10px] font-bold tracking-wider"
                        style={{ color: BRAND.muted, background: BRAND.surfaceAlt }}>
                        <div className="col-span-1">#</div>
                        <div className="col-span-7">PARTICIPANTE</div>
                        <div className="col-span-2 text-right">EX.</div>
                        <div className="col-span-2 text-right">PTS</div>
                    </div>
                    {LEADERBOARD.map((row, i) => (
                        <div key={i}
                            className="grid grid-cols-12 px-3 py-3 text-sm items-center"
                            style={{
                                background: row.isMe ? BRAND.orangeSoft : 'white',
                                borderTop: i === 0 ? 'none' : `1px solid ${BRAND.border}`,
                                color: row.isMe ? BRAND.orange : BRAND.ink,
                                fontWeight: row.isMe ? 700 : 500,
                            }}>
                            <div className="col-span-1 font-bold">{row.pos}</div>
                            <div className="col-span-7 truncate">{row.name}</div>
                            <div className="col-span-2 text-right">{row.exact}</div>
                            <div className="col-span-2 text-right font-extrabold">{row.points}</div>
                        </div>
                    ))}
                </div>
            </div>

            <TabBar active="torneo" onChange={go} />
        </div>
    );
}

// ============================================================
// PANTALLAS: ESTADÍSTICAS (TEAM GROUPS)
// ============================================================
function Stats({ go }) {
    return (
        <div className="flex flex-col h-full" style={{ background: BRAND.surfaceAlt }}>
            <Header title="Estadísticas" />

            <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 space-y-4">
                {GROUPS.map(g => (
                    <div key={g.name}>
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-sm font-extrabold tracking-wider" style={{ color: BRAND.navy }}>
                                GRUPO {g.name}
                            </h3>
                            <div className="flex-1 h-px" style={{ background: BRAND.border }} />
                        </div>
                        <div className="rounded-2xl bg-white overflow-hidden"
                            style={{ border: `1px solid ${BRAND.border}` }}>
                            <div className="grid px-3 py-2 text-[10px] font-bold tracking-wider"
                                style={{
                                    color: BRAND.muted, background: BRAND.surfaceAlt,
                                    gridTemplateColumns: '1.2fr 4fr repeat(6, 1fr)',
                                }}>
                                <div>#</div>
                                <div>EQUIPO</div>
                                <div className="text-center">PJ</div>
                                <div className="text-center">G</div>
                                <div className="text-center">E</div>
                                <div className="text-center">P</div>
                                <div className="text-center">DG</div>
                                <div className="text-right">PTS</div>
                            </div>
                            {g.teams.map((t, i) => (
                                <div key={i}
                                    className="grid px-3 py-2.5 text-xs items-center"
                                    style={{
                                        gridTemplateColumns: '1.2fr 4fr repeat(6, 1fr)',
                                        color: BRAND.ink,
                                        borderTop: i === 0 ? 'none' : `1px solid ${BRAND.border}`,
                                    }}>
                                    <div className="font-bold">{i + 1}</div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-base leading-none">{t.flag}</span>
                                        <span className="truncate font-semibold">{t.name}</span>
                                    </div>
                                    <div className="text-center">{t.pj}</div>
                                    <div className="text-center">{t.g}</div>
                                    <div className="text-center">{t.e}</div>
                                    <div className="text-center">{t.p}</div>
                                    <div className="text-center">{t.dg}</div>
                                    <div className="text-right font-extrabold" style={{ color: BRAND.orange }}>{t.pts}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <TabBar active="stats" onChange={go} />
        </div>
    );
}

// ============================================================
// PANTALLAS: PREDICCIONES
// ============================================================
function Predict({ go }) {
    const [matches, setMatches] = useState(CURRENT_ROUND_MATCHES);
    const [error, setError] = useState(null);

    const updatePred = (id, side, value) => {
        setMatches(prev => prev.map(m => {
            if (m.id !== id) return m;
            const v = value.replace(/\D/g, '').slice(0, 2);
            const newM = { ...m, [side === 'home' ? 'predHome' : 'predAway']: v };
            if (newM.isKnockout && newM.predHome !== '' && newM.predAway !== '' && newM.predHome === newM.predAway) {
                setError({ id, msg: 'No se permite predecir empate en eliminatorias.' });
                setTimeout(() => setError(null), 3000);
            }
            return newM;
        }));
    };

    const completed = matches.filter(m => m.predHome !== '' && m.predAway !== '').length;

    return (
        <div className="flex flex-col h-full" style={{ background: BRAND.surfaceAlt }}>
            <Header title="Predicciones" />

            <div className="px-4 pt-3 pb-3">
                <div className="rounded-xl bg-white px-3 py-2.5 flex items-center justify-between"
                    style={{ border: `1px solid ${BRAND.border}` }}>
                    <button className="p-1" style={{ color: BRAND.muted }}>
                        <ChevronLeft size={18} />
                    </button>
                    <div className="text-sm font-bold flex items-center gap-1.5" style={{ color: BRAND.ink }}>
                        Fase de Grupos · Fecha 1
                        <ChevronDown size={14} />
                    </div>
                    <button className="p-1" style={{ color: BRAND.orange }}>
                        <ChevronRight size={18} />
                    </button>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="font-bold tracking-wider" style={{ color: BRAND.navy }}>
                        PRONÓSTICOS CARGADOS
                    </span>
                    <span className="font-extrabold" style={{ color: BRAND.orange }}>
                        {completed}/{matches.length}
                    </span>
                </div>
                <div className="mt-2 h-1.5 rounded-full" style={{ background: BRAND.border }}>
                    <div className="h-1.5 rounded-full transition-all"
                        style={{ background: BRAND.orange, width: `${(completed / matches.length) * 100}%` }} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
                {matches.map(m => {
                    const showError = error && error.id === m.id;
                    return (
                        <div key={m.id}
                            className="rounded-2xl bg-white p-3"
                            style={{
                                border: `1px solid ${showError ? BRAND.danger : BRAND.border}`,
                                opacity: m.locked ? 0.65 : 1,
                            }}>
                            <div className="flex items-center justify-between text-[10px] font-bold tracking-wider mb-2"
                                style={{ color: BRAND.muted }}>
                                <span>{m.day} · {m.time} · {m.group.toUpperCase()}</span>
                                {m.locked && (
                                    <span className="flex items-center gap-1" style={{ color: BRAND.danger }}>
                                        <Lock size={11} /> CERRADO
                                    </span>
                                )}
                            </div>
                            <div className="grid items-center gap-2" style={{ gridTemplateColumns: '1fr auto auto 1fr' }}>
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-2xl leading-none">{m.home.flag}</span>
                                    <div className="min-w-0">
                                        <div className="text-sm font-bold truncate" style={{ color: BRAND.ink }}>{m.home.name}</div>
                                        <div className="text-[10px] font-semibold tracking-wider" style={{ color: BRAND.muted }}>
                                            {m.home.code}
                                        </div>
                                    </div>
                                </div>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={m.predHome}
                                    disabled={m.locked}
                                    onChange={e => updatePred(m.id, 'home', e.target.value)}
                                    className="w-11 h-11 text-center text-lg font-extrabold rounded-lg outline-none"
                                    style={{
                                        border: `1.5px dashed ${m.predHome !== '' ? BRAND.orange : BRAND.border}`,
                                        color: BRAND.ink, background: 'white',
                                    }}
                                    placeholder="–"
                                />
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={m.predAway}
                                    disabled={m.locked}
                                    onChange={e => updatePred(m.id, 'away', e.target.value)}
                                    className="w-11 h-11 text-center text-lg font-extrabold rounded-lg outline-none"
                                    style={{
                                        border: `1.5px dashed ${m.predAway !== '' ? BRAND.orange : BRAND.border}`,
                                        color: BRAND.ink, background: 'white',
                                    }}
                                    placeholder="–"
                                />
                                <div className="flex items-center gap-2 justify-end min-w-0">
                                    <div className="text-right min-w-0">
                                        <div className="text-sm font-bold truncate" style={{ color: BRAND.ink }}>{m.away.name}</div>
                                        <div className="text-[10px] font-semibold tracking-wider" style={{ color: BRAND.muted }}>
                                            {m.away.code}
                                        </div>
                                    </div>
                                    <span className="text-2xl leading-none">{m.away.flag}</span>
                                </div>
                            </div>
                            {showError && (
                                <div className="mt-2 text-[11px] font-semibold" style={{ color: BRAND.danger }}>
                                    {error.msg}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <TabBar active="predict" onChange={go} />
        </div>
    );
}

// ============================================================
// PANTALLAS: FIXTURE
// ============================================================
function Fixture({ go }) {
    return (
        <div className="flex flex-col h-full" style={{ background: BRAND.surfaceAlt }}>
            <Header title="Fixture" />

            <div className="px-4 pt-3 pb-2">
                <div className="rounded-xl bg-white px-3 py-2.5 flex items-center justify-between"
                    style={{ border: `1px solid ${BRAND.border}` }}>
                    <button className="p-1" style={{ color: BRAND.muted }}>
                        <ChevronLeft size={18} />
                    </button>
                    <div className="text-sm font-bold flex items-center gap-1.5" style={{ color: BRAND.ink }}>
                        Fase de Grupos · Fecha 1
                        <ChevronDown size={14} />
                    </div>
                    <button className="p-1" style={{ color: BRAND.orange }}>
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4 pt-2">
                {FIXTURE.map((day, i) => (
                    <div key={i} className="rounded-2xl bg-white overflow-hidden"
                        style={{ border: `1px solid ${BRAND.border}` }}>
                        <div className="px-4 py-2.5 text-xs font-extrabold"
                            style={{ color: BRAND.navy, background: BRAND.surfaceAlt }}>
                            {day.date}
                        </div>
                        {day.matches.map((m, j) => (
                            <div key={j}
                                className="grid items-center px-4 py-3"
                                style={{
                                    gridTemplateColumns: '1fr auto 1fr',
                                    borderTop: `1px solid ${BRAND.border}`,
                                }}>
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-xl leading-none">{m.homeFlag}</span>
                                    <span className="text-sm font-semibold truncate" style={{ color: BRAND.ink }}>
                                        {m.home}
                                    </span>
                                </div>
                                <div className="px-3 py-1 rounded-md text-xs font-extrabold mx-3"
                                    style={{ background: BRAND.surfaceAlt, color: BRAND.ink, border: `1px solid ${BRAND.border}` }}>
                                    {m.time}
                                </div>
                                <div className="flex items-center gap-2 justify-end min-w-0">
                                    <span className="text-sm font-semibold truncate" style={{ color: BRAND.ink }}>
                                        {m.away}
                                    </span>
                                    <span className="text-xl leading-none">{m.awayFlag}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            <TabBar active="fixture" onChange={go} />
        </div>
    );
}

// ============================================================
// PANTALLAS: MÁS
// ============================================================
function More({ go }) {
    const [showRules, setShowRules] = useState(false);

    if (showRules) {
        return (
            <div className="flex flex-col h-full" style={{ background: BRAND.surface }}>
                <Header title="Reglas del torneo" showBack onBack={() => setShowRules(false)} />
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
                    {RULES_TEXT.map((r, i) => (
                        <div key={i}>
                            <h4 className="text-sm font-extrabold mb-1" style={{ color: BRAND.orange }}>
                                {r.title}
                            </h4>
                            <p className="text-[13px] leading-relaxed whitespace-pre-line" style={{ color: BRAND.ink }}>
                                {r.body}
                            </p>
                        </div>
                    ))}
                </div>
                <TabBar active="more" onChange={go} />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full" style={{ background: BRAND.surfaceAlt }}>
            <Header title="Más" />

            <div className="px-4 -mt-3 mb-4">
                <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
                    style={{ background: 'white', border: `1px solid ${BRAND.border}` }}>
                    <div className="rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg"
                        style={{ background: BRAND.orangeSoft, color: BRAND.orange }}>
                        MG
                    </div>
                    <div className="flex-1">
                        <div className="text-sm font-bold" style={{ color: BRAND.ink }}>{ME.name}</div>
                        <div className="text-xs" style={{ color: BRAND.muted }}>{ME.email}</div>
                    </div>
                </div>
            </div>

            <div className="px-4">
                <div className="rounded-2xl bg-white overflow-hidden" style={{ border: `1px solid ${BRAND.border}` }}>
                    <button onClick={() => setShowRules(true)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
                        <FileText size={20} style={{ color: BRAND.orange }} />
                        <span className="flex-1 text-sm font-semibold" style={{ color: BRAND.ink }}>Reglas</span>
                        <ChevronRight size={18} style={{ color: BRAND.muted }} />
                    </button>
                    <div style={{ borderTop: `1px solid ${BRAND.border}` }} />
                    <button onClick={() => go('admin-users')}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
                        <Settings size={20} style={{ color: BRAND.orange }} />
                        <span className="flex-1 text-sm font-semibold" style={{ color: BRAND.ink }}>Panel Admin</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider"
                            style={{ background: BRAND.orangeSoft, color: BRAND.orange }}>ADMIN</span>
                        <ChevronRight size={18} style={{ color: BRAND.muted }} />
                    </button>
                    <div style={{ borderTop: `1px solid ${BRAND.border}` }} />
                    <button onClick={() => go('login')}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
                        <LogOut size={20} style={{ color: BRAND.danger }} />
                        <span className="flex-1 text-sm font-semibold" style={{ color: BRAND.danger }}>Cerrar sesión</span>
                    </button>
                </div>
            </div>

            <div className="flex-1" />

            <div className="px-6 py-4 text-center text-[10px] tracking-wider" style={{ color: BRAND.muted }}>
                v1.0.0 · CARESTINO · BEBÉS FELICES
            </div>

            <TabBar active="more" onChange={go} />
        </div>
    );
}

// ============================================================
// PANTALLAS: ADMIN - USUARIOS
// ============================================================
function AdminUsers({ go }) {
    const [users, setUsers] = useState(ADMIN_USERS);

    const toggleAdmin = (id) => {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, esAdmin: !u.esAdmin } : u));
    };

    return (
        <div className="flex flex-col h-full" style={{ background: BRAND.surfaceAlt }}>
            <Header title="Panel Admin" showBack onBack={() => go('more')} adminBadge />

            <div className="px-4 pt-3 pb-2">
                <div className="grid grid-cols-2 rounded-xl p-1 bg-white" style={{ border: `1px solid ${BRAND.border}` }}>
                    <button className="py-2 text-xs font-bold rounded-lg"
                        style={{ background: BRAND.orange, color: 'white' }}>
                        <Users size={14} className="inline mr-1.5 -mt-0.5" />USUARIOS
                    </button>
                    <button onClick={() => go('admin-results')}
                        className="py-2 text-xs font-bold rounded-lg"
                        style={{ color: BRAND.muted }}>
                        <ClipboardList size={14} className="inline mr-1.5 -mt-0.5" />RESULTADOS
                    </button>
                </div>
            </div>

            <div className="px-4 mb-2 mt-2 flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider" style={{ color: BRAND.muted }}>
                    {users.length} USUARIOS
                </span>
                <Button size="sm" variant="primary">
                    <Plus size={14} className="inline -mt-0.5 mr-1" />NUEVO
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="rounded-2xl bg-white overflow-hidden" style={{ border: `1px solid ${BRAND.border}` }}>
                    {users.map((u, i) => (
                        <div key={u.id}
                            className="px-3 py-3"
                            style={{ borderTop: i === 0 ? 'none' : `1px solid ${BRAND.border}` }}>
                            <div className="flex items-start gap-3">
                                <div className="rounded-full w-9 h-9 flex items-center justify-center text-xs font-bold shrink-0"
                                    style={{ background: BRAND.orangeSoft, color: BRAND.orange }}>
                                    {u.nombre[0]}{u.apellido[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold truncate" style={{ color: BRAND.ink }}>
                                        {u.nombre} {u.apellido}
                                    </div>
                                    <div className="text-[11px] truncate" style={{ color: BRAND.muted }}>{u.email}</div>
                                    <div className="text-[11px]" style={{ color: BRAND.muted }}>CUIL: {u.cuil}</div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => { }} className="p-1.5 rounded-md"
                                            style={{ color: BRAND.navy }}>
                                            <Pencil size={14} />
                                        </button>
                                        <button onClick={() => { }} className="p-1.5 rounded-md"
                                            style={{ color: BRAND.danger }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-bold tracking-wider" style={{ color: BRAND.muted }}>ADMIN</span>
                                        <button onClick={() => toggleAdmin(u.id)}
                                            className="relative w-9 h-5 rounded-full transition"
                                            style={{ background: u.esAdmin ? BRAND.orange : BRAND.border }}>
                                            <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                                                style={{ left: u.esAdmin ? 18 : 2 }} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <TabBar active="more" onChange={go} />
        </div>
    );
}

// ============================================================
// PANTALLAS: ADMIN - RESULTADOS
// ============================================================
function AdminResults({ go }) {
    const [matches, setMatches] = useState(ADMIN_MATCHES);
    const update = (id, side, v) => {
        const val = v.replace(/\D/g, '').slice(0, 2);
        setMatches(prev => prev.map(m => m.id === id
            ? { ...m, [side === 'home' ? 'homeGoals' : 'awayGoals']: val === '' ? null : parseInt(val) }
            : m));
    };

    return (
        <div className="flex flex-col h-full" style={{ background: BRAND.surfaceAlt }}>
            <Header title="Panel Admin" showBack onBack={() => go('more')} adminBadge />

            <div className="px-4 pt-3 pb-2">
                <div className="grid grid-cols-2 rounded-xl p-1 bg-white" style={{ border: `1px solid ${BRAND.border}` }}>
                    <button onClick={() => go('admin-users')}
                        className="py-2 text-xs font-bold rounded-lg"
                        style={{ color: BRAND.muted }}>
                        <Users size={14} className="inline mr-1.5 -mt-0.5" />USUARIOS
                    </button>
                    <button className="py-2 text-xs font-bold rounded-lg"
                        style={{ background: BRAND.orange, color: 'white' }}>
                        <ClipboardList size={14} className="inline mr-1.5 -mt-0.5" />RESULTADOS
                    </button>
                </div>
            </div>

            <div className="px-4 pt-2 pb-2">
                <div className="rounded-xl bg-white px-3 py-2.5 flex items-center justify-between"
                    style={{ border: `1px solid ${BRAND.border}` }}>
                    <button className="p-1" style={{ color: BRAND.muted }}>
                        <ChevronLeft size={18} />
                    </button>
                    <div className="text-sm font-bold flex items-center gap-1.5" style={{ color: BRAND.ink }}>
                        Fase de Grupos · Fecha 1
                        <ChevronDown size={14} />
                    </div>
                    <button className="p-1" style={{ color: BRAND.orange }}>
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3 pt-1">
                {matches.map(m => {
                    const isFinished = m.status === 'finalizado';
                    return (
                        <div key={m.id} className="rounded-2xl bg-white p-3"
                            style={{ border: `1px solid ${BRAND.border}` }}>
                            <div className="flex items-center justify-between text-[10px] font-bold tracking-wider mb-2">
                                <span style={{ color: BRAND.muted }}>{m.day} · {m.time}</span>
                                <span className="px-2 py-0.5 rounded-full"
                                    style={{
                                        background: isFinished ? '#DCFCE7' : BRAND.surfaceAlt,
                                        color: isFinished ? BRAND.success : BRAND.muted,
                                    }}>
                                    {isFinished ? 'FINALIZADO' : 'PROGRAMADO'}
                                </span>
                            </div>
                            <div className="grid items-center gap-2" style={{ gridTemplateColumns: '1fr auto auto 1fr' }}>
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-xl leading-none">{m.homeFlag}</span>
                                    <span className="text-sm font-bold truncate" style={{ color: BRAND.ink }}>{m.home}</span>
                                </div>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={m.homeGoals ?? ''}
                                    onChange={e => update(m.id, 'home', e.target.value)}
                                    className="w-11 h-11 text-center text-lg font-extrabold rounded-lg outline-none"
                                    style={{
                                        border: `1.5px solid ${m.homeGoals !== null ? BRAND.orange : BRAND.border}`,
                                        color: BRAND.ink, background: 'white',
                                    }}
                                    placeholder="–"
                                />
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={m.awayGoals ?? ''}
                                    onChange={e => update(m.id, 'away', e.target.value)}
                                    className="w-11 h-11 text-center text-lg font-extrabold rounded-lg outline-none"
                                    style={{
                                        border: `1.5px solid ${m.awayGoals !== null ? BRAND.orange : BRAND.border}`,
                                        color: BRAND.ink, background: 'white',
                                    }}
                                    placeholder="–"
                                />
                                <div className="flex items-center gap-2 justify-end min-w-0">
                                    <span className="text-sm font-bold truncate" style={{ color: BRAND.ink }}>{m.away}</span>
                                    <span className="text-xl leading-none">{m.awayFlag}</span>
                                </div>
                            </div>
                            {!isFinished && m.homeGoals !== null && m.awayGoals !== null && (
                                <div className="mt-3 flex gap-2">
                                    <Button size="sm" variant="primary" fullWidth>GUARDAR RESULTADO</Button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <TabBar active="more" onChange={go} />
        </div>
    );
}

// ============================================================
// SHELL (PHONE FRAME + NAV)
// ============================================================
function PhoneFrame({ children }) {
    return (
        <div className="relative mx-auto" style={{ width: 390, height: 780 }}>
            {/* Phone outer frame */}
            <div
                className="absolute inset-0 rounded-[44px] shadow-2xl"
                style={{
                    background: '#0F172A',
                    padding: 8,
                }}
            >
                <div className="relative w-full h-full rounded-[36px] overflow-hidden bg-white">
                    {/* Notch */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 rounded-b-2xl z-10"
                        style={{ background: '#0F172A' }} />
                    {children}
                </div>
            </div>
        </div>
    );
}

function NavItem({ active, onClick, children, group }) {
    return (
        <button
            onClick={onClick}
            className="w-full text-left px-3 py-2 rounded-lg transition text-sm font-semibold"
            style={{
                background: active ? BRAND.orangeSoft : 'transparent',
                color: active ? BRAND.orange : BRAND.navy,
                fontWeight: active ? 700 : 500,
            }}
        >
            {children}
        </button>
    );
}

export default function App() {
    const [screen, setScreen] = useState('login');

    useEffect(() => {
        if (!document.getElementById('mont-font')) {
            const l = document.createElement('link');
            l.id = 'mont-font';
            l.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap';
            l.rel = 'stylesheet';
            document.head.appendChild(l);
        }
    }, []);

    const go = (s) => setScreen(s);

    const screens = [
        {
            group: 'AUTENTICACIÓN', items: [
                { id: 'login', label: 'Login' },
                { id: 'register', label: 'Registro' },
            ]
        },
        {
            group: 'APP USUARIO', items: [
                { id: 'torneo', label: 'Torneo' },
                { id: 'stats', label: 'Estadísticas' },
                { id: 'predict', label: 'Predicciones' },
                { id: 'fixture', label: 'Fixture' },
                { id: 'more', label: 'Más' },
            ]
        },
        {
            group: 'ADMIN', items: [
                { id: 'admin-users', label: 'Usuarios' },
                { id: 'admin-results', label: 'Resultados' },
            ]
        },
    ];

    return (
        <div
            className="min-h-screen w-full p-6"
            style={{
                fontFamily: 'Montserrat, sans-serif',
                background: 'linear-gradient(135deg, #FAFAFA 0%, #F1F5F9 100%)',
            }}
        >
            <div className="max-w-6xl mx-auto flex gap-6 items-start">
                {/* Sidebar */}
                <div
                    className="w-60 rounded-2xl p-4 sticky top-6"
                    style={{
                        background: 'white',
                        border: `1px solid ${BRAND.border}`,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                >
                    <div className="flex items-center gap-2 mb-4 pb-4" style={{ borderBottom: `1px solid ${BRAND.border}` }}>
                        <Logo size={32} />
                        <div>
                            <div className="text-[9px] font-bold tracking-[0.18em]" style={{ color: BRAND.muted }}>PRODE</div>
                            <div className="text-sm font-extrabold tracking-tight" style={{ color: BRAND.navy }}>Mundial 2026</div>
                        </div>
                    </div>

                    {screens.map(g => (
                        <div key={g.group} className="mb-3">
                            <div className="text-[10px] font-bold tracking-wider mb-1.5 px-3" style={{ color: BRAND.muted }}>
                                {g.group}
                            </div>
                            <div className="space-y-0.5">
                                {g.items.map(s => (
                                    <NavItem key={s.id} active={screen === s.id} onClick={() => setScreen(s.id)}>
                                        {s.label}
                                    </NavItem>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div className="text-[10px] mt-4 pt-3" style={{ color: BRAND.muted, borderTop: `1px solid ${BRAND.border}` }}>
                        Mockup interactivo · navegá entre pantallas
                    </div>
                </div>

                {/* Phone */}
                <div className="flex-1 flex flex-col items-center">
                    <PhoneFrame>
                        {screen === 'login' && <Login go={go} />}
                        {screen === 'register' && <Register go={go} />}
                        {screen === 'torneo' && <Torneo go={go} />}
                        {screen === 'stats' && <Stats go={go} />}
                        {screen === 'predict' && <Predict go={go} />}
                        {screen === 'fixture' && <Fixture go={go} />}
                        {screen === 'more' && <More go={go} />}
                        {screen === 'admin-users' && <AdminUsers go={go} />}
                        {screen === 'admin-results' && <AdminResults go={go} />}
                    </PhoneFrame>
                    <div className="mt-4 text-xs font-semibold" style={{ color: BRAND.muted }}>
                        Pantalla actual: <span style={{ color: BRAND.orange }}>{screen}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
