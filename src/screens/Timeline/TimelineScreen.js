/**
 * TimelineScreen.js  — fixed version
 *
 * Fixes:
 *  1. Grid ALWAYS shows (not gated behind noEvents). Empty state shown as overlay/banner only.
 *  2. Event blocks are absolutely positioned per column × time slot correctly.
 *  3. Month/week dropdown replaces the two arrow buttons (kept arrows too for quick nav).
 *  4. Grid shows even with 0 events so users can see the time rows immediately.
 */

import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppData } from '../../contexts/AppDataContext';

// ─── Layout constants ─────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HOUR_HEIGHT    = 64;
const TIME_COL_WIDTH = 48;
const START_HOUR     = 6;
const END_HOUR       = 23;
const TOTAL_HOURS    = END_HOUR - START_HOUR + 1;

const GRID_WIDTH     = SCREEN_WIDTH - 32 - TIME_COL_WIDTH;
const DAY_COL_WIDTH  = GRID_WIDTH / 7;

// ─── Color palette ────────────────────────────────────────────────────────────
const CARD_COLORS = [
  { bg: ['#FF6B6B', '#FF8E53'] },  // 0 coral-orange
  { bg: ['#4ECDC4', '#44A08D'] },  // 1 teal-green
  { bg: ['#A18CD1', '#FBC2EB'] },  // 2 purple-pink  (focus)
  { bg: ['#43E97B', '#38F9D7'] },  // 3 mint-green
  { bg: ['#F093FB', '#F5576C'] },  // 4 pink-red
  { bg: ['#4FACFE', '#00F2FE'] },  // 5 sky-blue
  { bg: ['#FFD93D', '#FF6B6B'] },  // 6 yellow-coral
  { bg: ['#6BCB77', '#4D96FF'] },  // 7 green-blue
  { bg: ['#FF9A9E', '#FECFEF'] },  // 8 soft-pink
  { bg: ['#667EEA', '#764BA2'] },  // 9 indigo-purple
];

// ─── Date helpers ─────────────────────────────────────────────────────────────
const DAY_ABBR    = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const todayISO = () => new Date().toISOString().slice(0, 10);

function getWeekDays(base) {
  const d   = new Date(base);
  const sun = new Date(d);
  sun.setDate(d.getDate() - d.getDay());
  const today = todayISO();
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(sun);
    day.setDate(sun.getDate() + i);
    const isoKey = day.toISOString().slice(0, 10);
    return {
      abbr   : DAY_ABBR[i],
      date   : day.getDate(),
      month  : day.getMonth(),
      year   : day.getFullYear(),
      isoKey,
      isToday: isoKey === today,
    };
  });
}

function formatHour(h) {
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 === 0 ? 12 : h % 12}${suffix}`;
}

function formatTime(h, m) {
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2,'0')} ${suffix}`;
}

// ─── Tab config ───────────────────────────────────────────────────────────────
const TABS = [
  { key: 'All',    colors: ['#667EEA', '#764BA2'] },
  { key: 'Tasks',  colors: ['#4FACFE', '#00F2FE'] },
  { key: 'Focus',  colors: ['#A18CD1', '#FBC2EB'] },
  { key: 'Habits', colors: ['#43E97B', '#38F9D7'] },
];

// ─── Week picker modal ────────────────────────────────────────────────────────
function WeekPickerModal({ visible, currentBase, onSelect, onClose }) {
  const year  = currentBase.getFullYear();
  const month = currentBase.getMonth();

  // Build options: every week start (Sunday) for ±6 months
  const options = [];
  const start = new Date(year, month - 3, 1);
  start.setDate(start.getDate() - start.getDay()); // back to Sunday
  for (let i = 0; i < 28; i++) {
    const sun = new Date(start);
    sun.setDate(start.getDate() + i * 7);
    const sat = new Date(sun);
    sat.setDate(sun.getDate() + 6);
    options.push({ sun, sat });
  }

  const currentSun = new Date(currentBase);
  currentSun.setDate(currentBase.getDate() - currentBase.getDay());
  const currentKey = currentSun.toISOString().slice(0, 10);

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.pickerCard}>
          <Text style={styles.pickerTitle}>Select Week</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
            {options.map((opt) => {
              const key = opt.sun.toISOString().slice(0, 10);
              const isSel = key === currentKey;
              const label = `${MONTH_SHORT[opt.sun.getMonth()]} ${opt.sun.getDate()} – ${MONTH_SHORT[opt.sat.getMonth()]} ${opt.sat.getDate()}, ${opt.sat.getFullYear()}`;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => { onSelect(opt.sun); onClose(); }}
                  style={[styles.pickerRow, isSel && styles.pickerRowActive]}
                >
                  <Text style={[styles.pickerRowText, isSel && styles.pickerRowTextActive]}>
                    {label}
                  </Text>
                  {isSel && <Text style={styles.pickerCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Current time red line ────────────────────────────────────────────────────
function NowLine({ weekDays }) {
  const now      = new Date();
  const todayKey = todayISO();
  const colIdx   = weekDays.findIndex((d) => d.isoKey === todayKey);
  if (colIdx === -1) return null;

  const topOffset =
    (now.getHours() - START_HOUR) * HOUR_HEIGHT +
    (now.getMinutes() / 60) * HOUR_HEIGHT;

  if (topOffset < 0 || topOffset > TOTAL_HOURS * HOUR_HEIGHT) return null;

  return (
    <View
      pointerEvents="none"
      style={[styles.nowLine, {
        top  : topOffset,
        left : TIME_COL_WIDTH + colIdx * DAY_COL_WIDTH,
        width: DAY_COL_WIDTH,
      }]}
    >
      <View style={styles.nowDot} />
      <View style={styles.nowBar} />
    </View>
  );
}

// ─── Event block ──────────────────────────────────────────────────────────────
// Positioned absolutely within the grid:
//   top    = (startHour - START_HOUR) * HOUR_HEIGHT + (startMin/60) * HOUR_HEIGHT
//   left   = TIME_COL_WIDTH + colIdx * DAY_COL_WIDTH  (+2px padding)
//   height = (durationMins / 60) * HOUR_HEIGHT         (-4px padding)
//   width  = DAY_COL_WIDTH - 4px padding
function EventBlock({ event, colIdx, onPress }) {
  const topOffset   = (event.startHour - START_HOUR) * HOUR_HEIGHT + ((event.startMin || 0) / 60) * HOUR_HEIGHT + 2;
  const blockHeight = Math.max(22, (event.durationMins / 60) * HOUR_HEIGHT - 4);
  const leftOffset  = TIME_COL_WIDTH + colIdx * DAY_COL_WIDTH + 2;
  const blockWidth  = DAY_COL_WIDTH - 4;
  const colors      = CARD_COLORS[event.colorIdx % CARD_COLORS.length].bg;
  const short       = blockHeight < 36;
  const typeIcon    = event.type === 'focus' ? '🎯' : event.type === 'habit' ? '✅' : '📌';

  return (
    <TouchableOpacity
      onPress={() => onPress(event)}
      activeOpacity={0.85}
      style={[
        styles.eventBlock,
        {
          top   : topOffset,
          left  : leftOffset,
          width : blockWidth,
          height: blockHeight,
        },
      ]}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.eventGradient}
      >
        <Text style={styles.eventTitle} numberOfLines={short ? 1 : 2}>
          {short ? event.title : `${typeIcon} ${event.title}`}
        </Text>
        {!short && (
          <Text style={styles.eventTime}>
            {formatTime(event.startHour, event.startMin || 0)} · {event.durationMins}m
          </Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TimelineScreen() {
  const { timelineEvents } = useAppData();

  const today       = new Date();
  const [weekBase,   setWeekBase]   = useState(today);
  const [activeTab,  setActiveTab]  = useState('All');
  const [pickerOpen, setPickerOpen] = useState(false);

  const gridScrollRef = useRef(null);

  const weekDays = useMemo(() => getWeekDays(weekBase), [weekBase]);

  // Month label — shows range like "Apr 20 – 26, 2026"
  const monthLabel = useMemo(() => {
    const first = weekDays[0];
    const last  = weekDays[6];
    if (first.month === last.month) {
      return `${MONTH_NAMES[first.month]} ${first.date}–${last.date}, ${last.year}`;
    }
    return `${MONTH_SHORT[first.month]} ${first.date} – ${MONTH_SHORT[last.month]} ${last.date}, ${last.year}`;
  }, [weekDays]);

  const weekKeys = useMemo(() => weekDays.map((d) => d.isoKey), [weekDays]);

  // Filter by week + tab
  const visibleEvents = useMemo(() => {
    return timelineEvents.filter((e) => {
      if (!weekKeys.includes(e.isoKey)) return false;
      if (activeTab === 'All')    return true;
      if (activeTab === 'Tasks')  return e.type === 'task';
      if (activeTab === 'Focus')  return e.type === 'focus';
      if (activeTab === 'Habits') return e.type === 'habit';
      return true;
    });
  }, [timelineEvents, weekKeys, activeTab]);

  const hours = useMemo(
    () => Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i),
    [],
  );

  const goToPrevWeek = useCallback(() => {
    setWeekBase((p) => { const d = new Date(p); d.setDate(d.getDate() - 7); return d; });
  }, []);

  const goToNextWeek = useCallback(() => {
    setWeekBase((p) => { const d = new Date(p); d.setDate(d.getDate() + 7); return d; });
  }, []);

  const goToToday = useCallback(() => setWeekBase(new Date()), []);

  const handleEventPress = useCallback((event) => {
    Alert.alert(
      `${event.type === 'focus' ? '🎯' : event.type === 'habit' ? '✅' : '📌'} ${event.title}`,
      `${formatTime(event.startHour, event.startMin || 0)} · ${event.durationMins} min\nType: ${event.type}`,
      event.type === 'focus'
        ? [{ text: 'Not Now', style: 'cancel' }, { text: 'Start Focus', onPress: () => {} }]
        : [{ text: 'OK' }],
    );
  }, []);

  // Auto-scroll to current time on mount
  const handleGridLayout = useCallback(() => {
    const scrollY = Math.max(0, (new Date().getHours() - START_HOUR - 1) * HOUR_HEIGHT);
    gridScrollRef.current?.scrollTo({ y: scrollY, animated: false });
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <WeekPickerModal
        visible={pickerOpen}
        currentBase={weekBase}
        onSelect={setWeekBase}
        onClose={() => setPickerOpen(false)}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.outerScroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <View style={styles.headerSection}>
          <Text style={styles.screenTitle}>Timeline</Text>
          <View style={styles.monthRow}>
            <TouchableOpacity onPress={goToPrevWeek} style={styles.navBtn}>
              <Text style={styles.navBtnText}>‹</Text>
            </TouchableOpacity>

            {/* Dropdown trigger — shows week range, opens picker */}
            <TouchableOpacity
              onPress={() => setPickerOpen(true)}
              style={styles.monthDropdown}
              activeOpacity={0.7}
            >
              <Text style={styles.monthLabel}>{monthLabel}</Text>
              <Text style={styles.dropdownCaret}>▾</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={goToNextWeek} style={styles.navBtn}>
              <Text style={styles.navBtnText}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={goToToday} style={styles.todayBtn}>
              <LinearGradient colors={['#4FACFE', '#00F2FE']} style={styles.todayBtnGrad}>
                <Text style={styles.todayBtnText}>Today</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <View style={styles.tabRow}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.8}
                style={styles.tabBtn}
              >
                {active ? (
                  <LinearGradient colors={tab.colors} style={styles.tabGrad}>
                    <Text style={styles.tabTextActive}>{tab.key}</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.tabInactive}>
                    <Text style={styles.tabTextInactive}>{tab.key}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Empty banner (shown above grid, not instead of it) ───────────── */}
        {visibleEvents.length === 0 && (
          <View style={styles.emptyBanner}>
            <Text style={styles.emptyBannerEmoji}>
              {activeTab === 'Focus' ? '🎯' : activeTab === 'Habits' ? '✅' : '📋'}
            </Text>
            <Text style={styles.emptyBannerText}>
              {activeTab === 'Tasks'
                ? 'Add a task — it will appear on the grid.'
                : activeTab === 'Habits'
                ? 'Add a habit — it will appear on the grid.'
                : activeTab === 'Focus'
                ? 'Start a focus session — it will appear here.'
                : 'Add tasks or habits and they will show up below.'}
            </Text>
          </View>
        )}

        {/* ── Week grid — ALWAYS rendered ──────────────────────────────────── */}
        <View style={styles.gridCard}>
          {/* Day header row */}
          <View style={styles.dayHeaderRow}>
            <View style={{ width: TIME_COL_WIDTH }} />
            {weekDays.map((day) => (
              <View
                key={day.isoKey}
                style={[styles.dayHeaderCell, { width: DAY_COL_WIDTH }]}
              >
                <Text style={[styles.dayAbbr, day.isToday && styles.dayAbbrToday]}>
                  {day.abbr}
                </Text>
                <View style={[styles.dayDateCircle, day.isToday && styles.dayDateCircleToday]}>
                  <Text style={[styles.dayDate, day.isToday && styles.dayDateToday]}>
                    {day.date}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Scrollable time grid */}
          <ScrollView
            ref={gridScrollRef}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            onLayout={handleGridLayout}
            style={styles.gridScroll}
          >
            {/* ── Fixed-height container for absolute positioning ── */}
            <View style={{ height: TOTAL_HOURS * HOUR_HEIGHT, position: 'relative' }}>

              {/* Hour rows — these create the visible time lines */}
              {hours.map((hour, idx) => (
                <View
                  key={hour}
                  style={[
                    styles.hourRow,
                    { top: idx * HOUR_HEIGHT },
                  ]}
                >
                  <Text style={styles.hourLabel}>{formatHour(hour)}</Text>
                  {weekDays.map((day, di) => (
                    <View
                      key={day.isoKey}
                      style={[
                        styles.hourCell,
                        { width: DAY_COL_WIDTH },
                        di < 6 && styles.hourCellBorder,
                      ]}
                    />
                  ))}
                </View>
              ))}

              {/* Event blocks — absolutely positioned per column × time */}
              {visibleEvents.map((event) => {
                const colIdx = weekDays.findIndex((d) => d.isoKey === event.isoKey);
                if (colIdx === -1) return null;
                return (
                  <EventBlock
                    key={event.id}
                    event={event}
                    colIdx={colIdx}
                    onPress={handleEventPress}
                  />
                );
              })}

              {/* Current time indicator */}
              <NowLine weekDays={weekDays} />
            </View>
          </ScrollView>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea:     { flex: 1, backgroundColor: '#F0F7FF' },
  outerScroll:  { paddingHorizontal: 16, paddingTop: 8 },

  // Header
  headerSection:  { marginBottom: 12 },
  screenTitle:    { fontSize: 30, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5, marginBottom: 12 },
  monthRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn:         { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(15,23,42,0.12)', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  navBtnText:     { fontSize: 20, fontWeight: '600', color: '#94A3B8', lineHeight: 22 },
  monthDropdown:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(15,23,42,0.12)', paddingVertical: 8, paddingHorizontal: 14 },
  monthLabel:     { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  dropdownCaret:  { fontSize: 12, color: '#94A3B8', marginTop: 1 },
  todayBtn:       { borderRadius: 16, overflow: 'hidden' },
  todayBtnGrad:   { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 16 },
  todayBtnText:   { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Tabs
  tabRow:           { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tabBtn:           { flex: 1, borderRadius: 14, overflow: 'hidden' },
  tabGrad:          { paddingVertical: 10, alignItems: 'center', borderRadius: 14 },
  tabInactive:      { paddingVertical: 10, alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(15,23,42,0.1)', backgroundColor: '#fff' },
  tabTextActive:    { color: '#fff', fontWeight: '700', fontSize: 13 },
  tabTextInactive:  { color: '#94A3B8', fontWeight: '600', fontSize: 13 },

  // Empty banner (shown above grid, not replacing it)
  emptyBanner:      { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)', paddingHorizontal: 16, paddingVertical: 12, marginBottom: 10 },
  emptyBannerEmoji: { fontSize: 22 },
  emptyBannerText:  { flex: 1, fontSize: 13, color: '#64748B', fontWeight: '500', lineHeight: 18 },

  // Grid card
  gridCard:     { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)', overflow: 'hidden' },

  // Day header
  dayHeaderRow:       { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(15,23,42,0.08)', paddingVertical: 8, backgroundColor: '#fff', zIndex: 10 },
  dayHeaderCell:      { alignItems: 'center', gap: 4 },
  dayAbbr:            { fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.3 },
  dayAbbrToday:       { color: '#4FACFE' },
  dayDateCircle:      { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dayDateCircleToday: { backgroundColor: '#4FACFE' },
  dayDate:            { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  dayDateToday:       { color: '#fff' },

  // Scrollable grid
  gridScroll:      { height: 480 },
  hourRow:         { position: 'absolute', left: 0, right: 0, height: HOUR_HEIGHT, flexDirection: 'row', alignItems: 'flex-start', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(15,23,42,0.07)' },
  hourLabel:       { width: TIME_COL_WIDTH, fontSize: 9, fontWeight: '600', color: '#94A3B8', textAlign: 'right', paddingRight: 6, paddingTop: 3, letterSpacing: 0.2 },
  hourCell:        { height: HOUR_HEIGHT },
  hourCellBorder:  { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: 'rgba(15,23,42,0.06)' },

  // Event blocks
  eventBlock:    { position: 'absolute', borderRadius: 8, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  eventGradient: { flex: 1, paddingHorizontal: 5, paddingVertical: 4, justifyContent: 'center' },
  eventTitle:    { color: '#fff', fontSize: 10, fontWeight: '700', lineHeight: 13 },
  eventTime:     { color: 'rgba(255,255,255,0.85)', fontSize: 9, fontWeight: '500', marginTop: 2 },

  // Now line
  nowLine: { position: 'absolute', flexDirection: 'row', alignItems: 'center', zIndex: 20 },
  nowDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4757', marginLeft: -4 },
  nowBar:  { flex: 1, height: 1.5, backgroundColor: '#FF4757', opacity: 0.85 },

  // Week picker modal
  modalOverlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  pickerCard:          { width: SCREEN_WIDTH * 0.80, backgroundColor: '#fff', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 12 },
  pickerTitle:         { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 12, textAlign: 'center' },
  pickerRow:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, paddingHorizontal: 12, borderRadius: 12 },
  pickerRowActive:     { backgroundColor: 'rgba(79,172,254,0.12)' },
  pickerRowText:       { fontSize: 14, color: '#334155', fontWeight: '500' },
  pickerRowTextActive: { color: '#4FACFE', fontWeight: '700' },
  pickerCheck:         { fontSize: 14, color: '#4FACFE', fontWeight: '700' },
});