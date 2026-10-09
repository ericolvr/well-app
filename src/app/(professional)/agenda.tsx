import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Video } from 'lucide-react-native';

import { BRAND_ACCENT, BRAND_GRADIENT, FONTS } from '@/theme/tokens';

// Telas primeiro: por enquanto a agenda trabalha com dados de exemplo.
type SessionStatus = 'confirmed' | 'proposed' | 'done' | 'missed';

type Session = {
  id: number;
  start: Date;
  minutes: number;
  client: string;
  mode: 'online' | 'in_person';
  status: SessionStatus;
};

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEKDAYS_LONG = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const STATUS_LABEL: Record<SessionStatus, string> = {
  confirmed: 'Confirmada',
  proposed: 'Aguardando cliente',
  done: 'Realizada',
  missed: 'Não realizada',
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes());
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function weekStart(d: Date) {
  return addDays(startOfDay(d), -((d.getDay() + 6) % 7));
}

function hhmm(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function endOf(s: Session) {
  return new Date(s.start.getTime() + s.minutes * 60000);
}

function duration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function inHours(from: Date, to: Date) {
  const minutes = Math.round((to.getTime() - from.getTime()) / 60000);
  if (minutes < 60) return `em ${Math.max(minutes, 1)} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `em ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'amanhã' : `em ${days} dias`;
}

function at(base: Date, offset: number, hour: number, minute: number) {
  const d = addDays(startOfDay(base), offset);
  d.setHours(hour, minute);
  return d;
}

function sample(now: Date): Session[] {
  return [
    { id: 1, start: at(now, -2, 16, 0), minutes: 60, client: 'Rafael Lima', mode: 'in_person', status: 'done' },
    { id: 2, start: at(now, -1, 10, 0), minutes: 60, client: 'Bruna Alves', mode: 'online', status: 'done' },
    { id: 3, start: at(now, 0, 9, 0), minutes: 60, client: 'Marina Costa', mode: 'online', status: 'confirmed' },
    { id: 4, start: at(now, 0, 14, 30), minutes: 60, client: 'Rafael Lima', mode: 'in_person', status: 'confirmed' },
    { id: 5, start: at(now, 0, 18, 0), minutes: 45, client: 'Júlia Prado', mode: 'online', status: 'proposed' },
    { id: 6, start: at(now, 1, 8, 0), minutes: 60, client: 'Carlos Mendes', mode: 'in_person', status: 'confirmed' },
    { id: 7, start: at(now, 2, 19, 0), minutes: 60, client: 'Marina Costa', mode: 'online', status: 'confirmed' },
    { id: 8, start: at(now, 4, 7, 30), minutes: 60, client: 'Bruna Alves', mode: 'online', status: 'proposed' },
  ];
}

function NextUp({ session, now }: { session: Session; now: Date }) {
  const running = session.start <= now;
  return (
    <View style={styles.next}>
      <LinearGradient
        colors={BRAND_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Text style={styles.nextKicker}>{running ? 'Em andamento' : 'Próximo atendimento'}</Text>
      <Text style={styles.nextName} numberOfLines={1}>{session.client}</Text>
      <Text style={styles.nextMeta}>
        {sameDay(session.start, now) ? 'Hoje' : WEEKDAYS_LONG[session.start.getDay()]} · {hhmm(session.start)} ·{' '}
        {session.mode === 'online' ? 'Online' : 'Presencial'}
      </Text>
      {!running ? (
        <View style={styles.nextBadge}>
          <Text style={styles.nextBadgeLabel}>{inHours(now, session.start)}</Text>
        </View>
      ) : null}
    </View>
  );
}

function SessionRow({
  session,
  now,
  last,
  onAnswer,
}: {
  session: Session;
  now: Date;
  last: boolean;
  onAnswer: (done: boolean) => void;
}) {
  const ended = endOf(session) <= now;
  const askDone = session.status === 'confirmed' && ended;
  const Icon = session.mode === 'online' ? Video : MapPin;

  return (
    <View style={styles.row}>
      <View style={styles.timeCol}>
        <Text style={styles.time}>{hhmm(session.start)}</Text>
        <Text style={styles.timeEnd}>{hhmm(endOf(session))}</Text>
      </View>

      <View style={styles.rail}>
        <View style={[styles.dot, (session.status === 'confirmed' || session.status === 'proposed') && styles.dotOn]} />
        {!last ? <View style={styles.line} /> : null}
      </View>

      <View style={[styles.card, session.status === 'done' && styles.cardDone]}>
        <View style={styles.cardHead}>
          <Text style={styles.cardName} numberOfLines={1}>{session.client}</Text>
          <View style={[styles.pill, session.status === 'confirmed' && styles.pillOn]}>
            <Text style={[styles.pillLabel, session.status === 'confirmed' && styles.pillLabelOn]}>
              {askDone ? 'Terminou' : STATUS_LABEL[session.status]}
            </Text>
          </View>
        </View>
        <View style={styles.meta}>
          <Icon size={14} color="#6b6e78" />
          <Text style={styles.metaLabel}>
            {session.mode === 'online' ? 'Online' : 'Presencial'} · {duration(session.minutes)}
          </Text>
        </View>

        {askDone ? (
          <View style={styles.ask}>
            <Text style={styles.askText}>A aula aconteceu?</Text>
            <View style={styles.askActions}>
              <Pressable style={styles.askNo} onPress={() => onAnswer(false)} accessibilityRole="button">
                <Text style={styles.askNoLabel}>Não</Text>
              </Pressable>
              <Pressable style={styles.askYes} onPress={() => onAnswer(true)} accessibilityRole="button">
                <LinearGradient
                  colors={BRAND_GRADIENT}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.askYesLabel}>Sim, aconteceu</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function AgendaScreen() {
  const [now] = useState(() => new Date());
  const [sessions, setSessions] = useState(() => sample(new Date()));
  const [selected, setSelected] = useState(() => startOfDay(new Date()));

  const first = weekStart(selected);
  const week = Array.from({ length: 7 }, (_, i) => addDays(first, i));
  const last = week[6];
  const month =
    first.getMonth() === last.getMonth()
      ? `${MONTHS[first.getMonth()]} ${first.getFullYear()}`
      : `${MONTHS[first.getMonth()].slice(0, 3)} – ${MONTHS[last.getMonth()].slice(0, 3)} ${last.getFullYear()}`;

  const isToday = sameDay(selected, now);
  const daySessions = sessions
    .filter((s) => sameDay(s.start, selected))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  const upcoming = sessions
    .filter((s) => s.status === 'confirmed' && endOf(s) > now)
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0];
  const pendingProposals = sessions.filter((s) => s.status === 'proposed').length;

  const answer = (id: number, done: boolean) => {
    const apply = () => setSessions((all) => all.map((s) => (s.id === id ? { ...s, status: done ? 'done' : 'missed' } : s)));
    if (done) return apply();
    Alert.alert('Aula não realizada?', 'Vamos registrar que este horário não aconteceu.', [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Registrar', onPress: apply },
    ]);
  };

  const subtitle = isToday
    ? 'Hoje'
    : `${WEEKDAYS_LONG[selected.getDay()][0].toUpperCase()}${WEEKDAYS_LONG[selected.getDay()].slice(1)}, ${selected.getDate()}`;
  const count = daySessions.length;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Agenda</Text>

        {upcoming ? <NextUp session={upcoming} now={now} /> : null}

        <View style={styles.monthRow}>
          <Text style={styles.month}>{month}</Text>
          <View style={styles.monthActions}>
            {!isToday ? (
              <Pressable style={styles.todayBtn} onPress={() => setSelected(startOfDay(now))} accessibilityRole="button">
                <Text style={styles.todayLabel}>Hoje</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={styles.arrow}
              onPress={() => setSelected(addDays(selected, -7))}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Semana anterior">
              <ChevronLeft size={20} color="#1a1a1a" />
            </Pressable>
            <Pressable
              style={styles.arrow}
              onPress={() => setSelected(addDays(selected, 7))}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Próxima semana">
              <ChevronRight size={20} color="#1a1a1a" />
            </Pressable>
          </View>
        </View>

        <View style={styles.week}>
          {week.map((day) => {
            const isSelected = sameDay(day, selected);
            const has = sessions.some((s) => sameDay(s.start, day) && s.status !== 'missed');
            const today = sameDay(day, now);
            return (
              <Pressable key={day.toISOString()} style={styles.dayCell} onPress={() => setSelected(day)} accessibilityRole="button">
                <Text style={styles.dayName}>{WEEKDAYS[day.getDay()]}</Text>
                <View style={[styles.dayNum, isSelected && styles.dayNumOn]}>
                  <Text style={[styles.dayNumLabel, today && !isSelected && styles.dayNumToday, isSelected && styles.dayNumLabelOn]}>
                    {day.getDate()}
                  </Text>
                </View>
                <View style={[styles.dayDot, has && styles.dayDotOn]} />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.dayHead}>
          <Text style={styles.dayTitle}>{subtitle}</Text>
          <Text style={styles.dayCount}>
            {count === 0 ? 'Sem atendimentos' : count === 1 ? '1 atendimento' : `${count} atendimentos`}
          </Text>
        </View>

        {count === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <CalendarDays size={26} color={BRAND_ACCENT} />
            </View>
            <Text style={styles.emptyTitle}>Dia livre</Text>
            <Text style={styles.emptyText}>
              Quando você combinar um horário no chat com um aluno, ele aparece aqui.
            </Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            {daySessions.map((s, i) => (
              <SessionRow
                key={s.id}
                session={s}
                now={now}
                last={i === daySessions.length - 1}
                onAnswer={(done) => answer(s.id, done)}
              />
            ))}
          </View>
        )}

        {pendingProposals > 0 ? (
          <Text style={styles.footer}>
            {pendingProposals === 1
              ? '1 horário aguarda a confirmação do cliente.'
              : `${pendingProposals} horários aguardam a confirmação do cliente.`}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 },
  title: { fontFamily: FONTS.extraBold, fontSize: 28, lineHeight: 34, color: '#1a1a1a', letterSpacing: -0.5 },

  next: { marginTop: 16, padding: 18, borderRadius: 22, overflow: 'hidden' },
  nextKicker: { fontFamily: FONTS.semiBold, fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  nextName: { fontFamily: FONTS.extraBold, fontSize: 24, lineHeight: 30, color: '#FFFFFF', letterSpacing: -0.3, marginTop: 4 },
  nextMeta: { fontFamily: FONTS.semiBold, fontSize: 14, color: '#FFFFFF', marginTop: 2 },
  nextBadge: {
    alignSelf: 'flex-start',
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  nextBadgeLabel: { fontFamily: FONTS.bold, fontSize: 13, color: '#FFFFFF' },

  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28 },
  month: { fontFamily: FONTS.bold, fontSize: 18, color: '#1a1a1a' },
  monthActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  todayBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#FFF1EC' },
  todayLabel: { fontFamily: FONTS.bold, fontSize: 13, color: BRAND_ACCENT },
  arrow: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F7' },

  week: { flexDirection: 'row', marginTop: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F3F4F7' },
  dayCell: { flex: 1, alignItems: 'center' },
  dayName: { fontFamily: FONTS.semiBold, fontSize: 12, color: '#6b6e78' },
  dayNum: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  dayNumOn: { backgroundColor: BRAND_ACCENT },
  dayNumLabel: { fontFamily: FONTS.bold, fontSize: 16, color: '#1a1a1a' },
  dayNumToday: { color: BRAND_ACCENT },
  dayNumLabelOn: { color: '#FFFFFF' },
  dayDot: { width: 5, height: 5, borderRadius: 3, marginTop: 6, backgroundColor: 'transparent' },
  dayDotOn: { backgroundColor: BRAND_ACCENT },

  dayHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 28, marginBottom: 14 },
  dayTitle: { fontFamily: FONTS.extraBold, fontSize: 20, color: '#1a1a1a', letterSpacing: -0.3 },
  dayCount: { fontFamily: FONTS.regular, fontSize: 13, color: '#6b6e78' },

  timeline: {},
  row: { flexDirection: 'row' },
  timeCol: { width: 48, paddingTop: 16 },
  time: { fontFamily: FONTS.bold, fontSize: 15, color: '#1a1a1a' },
  timeEnd: { fontFamily: FONTS.regular, fontSize: 12, color: '#9a9da6', marginTop: 2 },
  rail: { width: 22, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 20, backgroundColor: '#C9CCD4' },
  dotOn: { backgroundColor: BRAND_ACCENT },
  line: { flex: 1, width: 2, marginTop: 4, marginBottom: -4, backgroundColor: '#E4E6EC' },
  card: { flex: 1, marginBottom: 12, padding: 14, borderRadius: 18, backgroundColor: '#F3F4F7' },
  cardDone: { opacity: 0.6 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardName: { flex: 1, fontFamily: FONTS.bold, fontSize: 16, color: '#1a1a1a' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: '#E4E6EC' },
  pillOn: { backgroundColor: '#FFF1EC' },
  pillLabel: { fontFamily: FONTS.semiBold, fontSize: 12, color: '#3a3d46' },
  pillLabelOn: { color: BRAND_ACCENT },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  metaLabel: { fontFamily: FONTS.regular, fontSize: 13, color: '#6b6e78' },

  ask: { marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#D8DAE0' },
  askText: { fontFamily: FONTS.semiBold, fontSize: 14, color: '#1a1a1a' },
  askActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  askNo: { flex: 1, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  askNoLabel: { fontFamily: FONTS.bold, fontSize: 14, color: '#1a1a1a' },
  askYes: { flex: 2, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  askYesLabel: { fontFamily: FONTS.bold, fontSize: 14, color: '#FFFFFF' },

  empty: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24, borderRadius: 22, backgroundColor: '#F3F4F7' },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF1EC' },
  emptyTitle: { fontFamily: FONTS.bold, fontSize: 17, color: '#1a1a1a', marginTop: 14 },
  emptyText: { fontFamily: FONTS.regular, fontSize: 14, lineHeight: 20, color: '#6b6e78', textAlign: 'center', marginTop: 4 },

  footer: { fontFamily: FONTS.regular, fontSize: 13, lineHeight: 18, color: '#6b6e78', marginTop: 8 },
});
