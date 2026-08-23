import { useState } from "react";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flame,
  Home,
  MapPin,
  MessageCircle,
  Play,
  Trophy,
  UsersRound,
  X,
} from "lucide-react";

const days = [
  { weekday: "LUN", day: "18", classes: 3 },
  { weekday: "MAR", day: "19", classes: 4 },
  { weekday: "MIÉ", day: "20", classes: 5 },
  { weekday: "JUE", day: "21", classes: 4 },
  { weekday: "VIE", day: "22", classes: 3 },
];

export default function TrainingPulse() {
  const [selectedDay, setSelectedDay] = useState(2);
  const [booked, setBooked] = useState(false);
  const [showWod, setShowWod] = useState(false);
  const [notice, setNotice] = useState(false);

  const reserve = () => {
    setBooked((current) => !current);
    setNotice(true);
    window.setTimeout(() => setNotice(false), 2200);
  };

  return (
    <main
      className="min-h-[100dvh] overflow-hidden pb-28 text-[#f3eedf]"
      style={{
        background: "#17232b",
        fontFamily: "'DM Sans', sans-serif",
        backgroundImage:
          "radial-gradient(circle at 92% 4%, rgba(234,94,56,.32), transparent 23%), linear-gradient(154deg, #17232b 0%, #10191f 70%)",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Syne:wght@600;700;800&display=swap');
        .tp-display { font-family: 'Syne', sans-serif; }
        .tp-mono { font-family: 'DM Mono', monospace; }
        .tp-grid { background-image: linear-gradient(rgba(232,222,190,.055) 1px,transparent 1px), linear-gradient(90deg,rgba(232,222,190,.055) 1px,transparent 1px); background-size: 28px 28px; }
        .tp-scroll::-webkit-scrollbar { display:none; }
        @keyframes tp-rise { from { opacity:0; transform:translateY(14px)} to { opacity:1; transform:translateY(0)} }
        .tp-rise { animation: tp-rise .55s cubic-bezier(.2,.8,.2,1) both; }
      `}</style>

      <div className="tp-grid relative px-5 pt-5">
        <header className="flex items-center justify-between">
          <button aria-label="Abrir perfil" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d9d3c044] bg-[#20313a] text-xs font-bold text-[#f6b16f]">
            MP
          </button>
          <div className="tp-mono text-[10px] tracking-[0.18em] text-[#a6aaa4]">WODPLACE / SCL</div>
          <button aria-label="Notificaciones" className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#d9d3c044] bg-[#20313a]">
            <Bell size={17} strokeWidth={1.8} />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#f26b42]" />
          </button>
        </header>

        <section className="tp-rise pt-9">
          <p className="tp-mono text-[10px] tracking-[0.2em] text-[#f6b16f]">MIÉRCOLES, 20 DE AGOSTO</p>
          <div className="mt-2 flex items-end justify-between">
            <h1 className="tp-display max-w-[270px] text-[33px] font-extrabold leading-[.98] tracking-[-0.055em]">TU RITMO, HOY.</h1>
            <div className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-[#d9d3c0]"><Flame size={15} className="text-[#f26b42]" fill="currentColor" /> 4 días</div>
          </div>
        </section>

        <section className="tp-rise mt-7 flex gap-2 overflow-x-auto pb-1 tp-scroll" style={{ animationDelay: ".08s" }}>
          {days.map((item, index) => (
            <button
              key={item.day}
              onClick={() => setSelectedDay(index)}
              className={`w-[60px] shrink-0 rounded-2xl border py-3 transition ${selectedDay === index ? "border-[#f6b16f] bg-[#f6b16f] text-[#17232b]" : "border-[#d9d3c02b] bg-[#20313a] text-[#ddd7c8]"}`}
            >
              <span className="tp-mono block text-[9px] tracking-wider">{item.weekday}</span>
              <span className="tp-display mt-1 block text-xl tracking-tight">{item.day}</span>
              <span className={`mt-1 block text-[9px] ${selectedDay === index ? "text-[#17232b99]" : "text-[#8e9794]"}`}>{item.classes} CL</span>
            </button>
          ))}
          <button aria-label="Ver calendario" className="flex w-[48px] shrink-0 items-center justify-center rounded-2xl border border-dashed border-[#d9d3c044] text-[#f6b16f]"><CalendarDays size={17} /></button>
        </section>
      </div>

      <section className="tp-rise mx-5 mt-6 overflow-hidden rounded-[26px] bg-[#e8dfc7] text-[#17232b]" style={{ animationDelay: ".16s" }}>
        <div className="flex items-center justify-between px-5 pt-5">
          <span className="tp-mono text-[10px] font-medium tracking-[.16em]">PRÓXIMO BLOQUE</span>
          <span className="rounded-full bg-[#d7e67c] px-2.5 py-1 text-[10px] font-bold">08:00 — 09:00</span>
        </div>
        <div className="px-5 pb-5 pt-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="tp-display text-[38px] leading-none tracking-[-.06em]">ENGINE</h2>
              <p className="mt-2 text-sm text-[#405059]">Coach Camila · 13 cupos libres</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#17232b] text-[#e8dfc7]"><Dumbbell size={24} /></div>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-[#17232b22] pt-4">
            <div className="flex items-center gap-2 text-xs font-semibold"><UsersRound size={15} /> Nivel abierto</div>
            <button onClick={reserve} className={`rounded-full px-4 py-2.5 text-xs font-bold transition ${booked ? "bg-[#647a68] text-white" : "bg-[#f26b42] text-white"}`}>
              {booked ? <span className="flex items-center gap-1"><Check size={14} /> Agendado</span> : "Reservar lugar"}
            </button>
          </div>
        </div>
      </section>

      <section className="tp-rise mx-5 mt-7" style={{ animationDelay: ".23s" }}>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="tp-display text-xl tracking-[-.04em]">EL TABLERO DE HOY</h3>
          <button className="tp-mono flex items-center gap-1 text-[10px] text-[#f6b16f]">VER SEMANA <ChevronRight size={12} /></button>
        </div>
        <div className="grid grid-cols-[1.18fr_.82fr] gap-3">
          <button onClick={() => setShowWod(!showWod)} className="rounded-[22px] border border-[#d9d3c02d] bg-[#20313a] p-4 text-left">
            <div className="flex items-center justify-between"><span className="tp-mono text-[10px] tracking-wider text-[#aeb6ad]">WOD / 17.30</span><Play size={15} className="text-[#f6b16f]" fill="currentColor" /></div>
            <p className="tp-display mt-7 text-[25px] leading-[.95] tracking-[-.05em]">{showWod ? "12 MIN\nAMRAP" : "VER\nDESAFÍO"}</p>
            <p className="mt-4 text-[11px] text-[#aeb6ad]">{showWod ? "12 power cleans · 10 burpees" : "La pizarra abre a las 17:00"}</p>
          </button>
          <div className="rounded-[22px] bg-[#e66243] p-4 text-[#18252d]">
            <Trophy size={19} />
            <p className="tp-mono mt-6 text-[10px] font-medium tracking-wider">RACHA</p>
            <p className="tp-display mt-1 text-[42px] leading-none tracking-[-.07em]">04</p>
            <p className="mt-3 text-[11px] font-semibold leading-snug">Entrenos<br />esta semana</p>
          </div>
        </div>
      </section>

      <section className="tp-rise mx-5 mt-7" style={{ animationDelay: ".3s" }}>
        <div className="rounded-[22px] border border-[#d9d3c02d] bg-[#20313a]">
          <div className="flex items-center justify-between p-4">
            <div><p className="tp-mono text-[10px] tracking-wider text-[#aeb6ad]">COMUNIDAD</p><p className="mt-1 text-sm font-semibold">12 atletas entrenan hoy</p></div>
            <button aria-label="Abrir comunidad" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#30434c] text-[#f6b16f]"><MessageCircle size={16} /></button>
          </div>
          <div className="flex items-center gap-2 border-t border-[#d9d3c01c] px-4 py-3">
            {["CP", "AS", "TR", "LP"].map((initials, index) => <span key={initials} className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#20313a] text-[9px] font-bold ${index === 1 ? "bg-[#d7e67c] text-[#17232b]" : index === 2 ? "bg-[#f6b16f] text-[#17232b]" : "bg-[#39525d] text-[#ece5d5]"}`}>{initials}</span>)}
            <span className="ml-1 text-[11px] text-[#aeb6ad]">y 8 más</span>
          </div>
        </div>
      </section>

      <nav className="fixed bottom-0 left-0 right-0 z-10 mx-auto flex max-w-[450px] items-center justify-around border-t border-[#d9d3c022] bg-[#10191ff2] px-5 pb-5 pt-3 backdrop-blur">
        {[{ icon: Home, label: "Hoy", active: true }, { icon: CalendarDays, label: "Agenda" }, { icon: Dumbbell, label: "Progreso" }, { icon: MapPin, label: "Box" }].map(({ icon: Icon, label, active }) => (
          <button key={label} className={`flex min-w-12 flex-col items-center gap-1 ${active ? "text-[#f6b16f]" : "text-[#83908d]"}`}><Icon size={18} strokeWidth={active ? 2.5 : 1.8} /><span className="text-[9px] font-semibold">{label}</span></button>
        ))}
      </nav>

      {notice && <div className="fixed bottom-24 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#d7e67c] px-4 py-3 text-xs font-bold text-[#17232b] shadow-lg"><Check size={15} /> {booked ? "Lugar reservado para las 08:00" : "Reserva cancelada"}</div>}
    </main>
  );
}