/**
 * TimelineScreen.js  —  Improved ADHD Timeline
 *
 * Key changes from original:
 *  1. Week-grid layout: 7 day columns, hour rows — event blocks sit in their exact time slot
 *  2. Blocks are vertical, sized by duration, positioned on the correct day column
 *  3. Month/year navigation replaced with a dropdown Modal picker
 *  4. Tabs: All | Tasks | Focus | Habits — filter what shows on the grid
 *  5. Live current-time red line
 *  6. Colorful gradient blocks matching existing app palette
 *
 * DATA WIRING (replace SAMPLE_EVENTS with your real context):
 *   Each event shape: {
 *     id: string,
 *     title: string,
 *     type: 'task' | 'habit' | 'focus',
 *     isoKey: 'YYYY-MM-DD',
 *     startHour: number,
 *     startMin: number,
 *     durationMins: number,
 *     colorIdx: number,   // 0-9, see CARD_COLORS
 *   }
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
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Layout constants ─────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HOUR_HEIGHT     = 64;   // px per hour row
const TIME_COL_WIDTH  = 46;   // left column for hour labels
const DAY_HEADER_H    = 54;   // sticky day-name + date header height
const START_HOUR      = 6;
const END_HOUR        = 23;
const TOTAL_HOURS     = END_HOUR - START_HOUR + 1;

// Grid content width (right of time column)
const GRID_WIDTH = SCREEN_WIDTH - 32 - TIME_COL_WIDTH; // 32 = card horizontal padding
const DAY_COL_WIDTH = GRID_WIDTH / 7;

// ─── Color palette ────────────────────────────────────────────────────────────
const CARD_COLORS = [
  { bg: ['#FF6B6B', '#FF8E53'] },  // 0 coral-orange
  { bg: ['#4ECDC4', '#44A08D'] },  // 1 teal-green
  { bg: ['#A18CD1', '#FBC2EB'] },  // 2 purple-pink
  { bg: ['#43E97B', '#38F9D7'] },  // 3 mint-green
  { bg: ['#F093FB', '#F5576C'] },  // 4 pink-red
  { bg: ['#4FACFE', '#00F2FE'] },  // 5 sky-blue
  { bg: ['#FFD93D', '#FF6B6B'] },  // 6 yellow-coral
  { bg: ['#6BCB77', '#4D96FF'] },  // 7 green-blue
  { bg: ['#FF9A9E', '#FECFEF'] },  // 8 soft-pink
  { bg: ['#667EEA', '#764BA2'] },  // 9 indigo-purple
];

// ─── Date helpers ─────────────────────────────────────────────────────────────
const DAY_ABBR   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

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
  const base   = h % 12 === 0 ? 12 : h % 12;
  return `${base}${suffix}`;
}

function formatTime(h, m) {
  const suffix = h >= 12 ? 'PM' : 'AM';
  const base   = h % 12 === 0 ? 12 : h % 12;
  return `${base}:${String(m).padStart(2, '0')} ${suffix}`;
}

// ─── Sample events  ───────────────────────────────────────────────────────────
// Replace this with data from your TasksContext / HabitsContext / FocusContext.
// Shape: { id, title, type ('task'|'habit'|'focus'), isoKey, startHour, startMin, durationMins, colorIdx }
const SAMPLE_EVENTS = [
  { id:'e1',  title:'Deep Work',      type:'focus',  isoKey:'2026-04-24', startHour:9,  startMin:0,  durationMins:90,  colorIdx:2 },
  { id:'e2',  title:'Team Standup',   type:'task',   isoKey:'2026-04-24', startHour:11, startMin:0,  durationMins:30,  colorIdx:5 },
  { id:'e3',  title:'Lunch Break',    type:'habit',  isoKey:'2026-04-24', startHour:13, startMin:0,  durationMins:60,  colorIdx:1 },
  { id:'e4',  title:'UI Review',      type:'task',   isoKey:'2026-04-24', startHour:15, startMin:0,  durationMins:45,  colorIdx:0 },
  { id:'e5',  title:'Read 30 min',    type:'habit',  isoKey:'2026-04-24', startHour:21, startMin:0,  durationMins:30,  colorIdx:6 },
  { id:'e6',  title:'Morning Run',    type:'habit',  isoKey:'2026-04-25', startHour:7,  startMin:0,  durationMins:45,  colorIdx:3 },
  { id:'e7',  title:'Research Sprint',type:'task',   isoKey:'2026-04-25', startHour:10, startMin:0,  durationMins:120, colorIdx:9 },
  { id:'e8',  title:'Weekly Review',  type:'focus',  isoKey:'2026-04-26', startHour:9,  startMin:30, durationMins:60,  colorIdx:2 },
  { id:'e9',  title:'Plan Sprint',    type:'task',   isoKey:'2026-04-26', startHour:14, startMin:0,  durationMins:90,  colorIdx:4 },
  { id:'e10', title:'Meditation',     type:'habit',  isoKey:'2026-04-27', startHour:6,  startMin:30, durationMins:20,  colorIdx:1 },
  { id:'e11', title:'Design Sprint',  type:'focus',  isoKey:'2026-04-27', startHour:11, startMin:0,  durationMins:90,  colorIdx:2 },
  { id:'e12', title:'Vitamins',       type:'habit',  isoKey:'2026-04-27', startHour:8,  startMin:0,  durationMins:10,  colorIdx:7 },
  { id:'e13', title:'Client Call',    type:'task',   isoKey:'2026-04-28', startHour:10, startMin:30, durationMins:60,  colorIdx:0 },
  { id:'e14', title:'Focus: Report',  type:'focus',  isoKey:'2026-04-28', startHour:14, startMin:0,  durationMins:90,  colorIdx:9 },
];

// ─── Tab config ───────────────────────────────────────────────────────────────
const TABS = [
  { key: 'All',    colors: ['#667EEA', '#764BA2'] },
  { key: 'Tasks',  colors: ['#4FACFE', '#00F2FE'] },
  { key: 'Focus',  colors: ['#A18CD1', '#FBC2EB'] },
  { key: 'Habits', colors: ['#43E97B', '#38F9D7'] },
];

// ─── MonthPicker dropdown ─────────────────────────────────────────────────────
function MonthPickerModal({ visible, currentBase, onSelect, onClose }) {
  const year  = currentBase.getFullYear();
  const month = currentBase.getMonth();

  // Build 12 months for current year ± 1
  const options = [];
  for (let y = year - 1; y <= year + 1; y++) {
    for (let m = 0; m < 12; m++) {
      options.push({ year: y, month: m });
    }
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.pickerCard}>
          <Text style={styles.pickerTitle}>Select Month</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
            {options.map((opt) => {
              const isSelected = opt.year === year && opt.month === month;
              return (
                <TouchableOpacity
                  key={`${opt.year}-${opt.month}`}
                  onPress={() => {
                    const d = new Date(opt.year, opt.month, 1);
                    onSelect(d);
                    onClose();
                  }}
                  style={[styles.pickerRow, isSelected && styles.pickerRowActive]}
                >
                  <Text style={[styles.pickerRowText, isSelected && styles.pickerRowTextActive]}>
                    {MONTH_NAMES[opt.month]} {opt.year}
                  </Text>
                  {isSelected && <Text style={styles.pickerCheck}>✓</Text>}
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
  const now     = new Date();
  const todayKey = todayISO();
  const colIdx  = weekDays.findIndex((d) => d.isoKey === todayKey);
  if (colIdx === -1) return null;

  const topOffset =
    (now.getHours() - START_HOUR) * HOUR_HEIGHT +
    (now.getMinutes() / 60) * HOUR_HEIGHT;

  if (topOffset < 0 || topOffset > TOTAL_HOURS * HOUR_HEIGHT) return null;

  const leftOffset = TIME_COL_WIDTH + colIdx * DAY_COL_WIDTH;

  return (
    <View pointerEvents="none" style={[styles.nowLine, { top: topOffset, left: leftOffset, width: DAY_COL_WIDTH }]}>
      <View style={styles.nowDot} />
      <View style={styles.nowBar} />
    </View>
  );
}

// ─── Single event block ───────────────────────────────────────────────────────
function EventBlock({ event, colIdx, onPress }) {
  const topOffset =
    (event.startHour - START_HOUR) * HOUR_HEIGHT +
    (event.startMin  / 60)         * HOUR_HEIGHT +
    2;

  const blockHeight = Math.max(22, (event.durationMins / 60) * HOUR_HEIGHT - 4);
  const leftOffset  = TIME_COL_WIDTH + colIdx * DAY_COL_WIDTH + 2;
  const blockWidth  = DAY_COL_WIDTH - 4;

  const colors = CARD_COLORS[event.colorIdx % CARD_COLORS.length].bg;
  const short  = blockHeight < 36;

  const typeIcon = event.type === 'focus' ? '🎯' : event.type === 'habit' ? '✅' : '📌';

  return (
    <TouchableOpacity
      onPress={() => onPress(event)}
      activeOpacity={0.85}
      style={[
        styles.eventBlock,
        { top: topOffset, left: leftOffset, width: blockWidth, height: blockHeight },
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
            {formatTime(event.startHour, event.startMin)} · {event.durationMins}m
          </Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TimelineScreen() {
  const today       = new Date();
  const [weekBase,  setWeekBase]      = useState(today);
  const [activeTab, setActiveTab]     = useState('All');
  const [pickerOpen, setPickerOpen]   = useState(false);

  const gridScrollRef = useRef(null);

  const weekDays = useMemo(() => getWeekDays(weekBase), [weekBase]);

  // Current month label derived from first day of the displayed week
  const monthLabel = useMemo(() => {
    const d = weekDays[0];
    return `${MONTH_NAMES[d.month]} ${d.year}`;
  }, [weekDays]);

  // Build visible ISO keys for this week
  const weekKeys = useMemo(() => weekDays.map((d) => d.isoKey), [weekDays]);

  // Filter events by week + active tab
  const visibleEvents = useMemo(() => {
    return SAMPLE_EVENTS.filter((e) => {
      if (!weekKeys.includes(e.isoKey)) return false;
      if (activeTab === 'All')    return true;
      if (activeTab === 'Tasks')  return e.type === 'task';
      if (activeTab === 'Focus')  return e.type === 'focus';
      if (activeTab === 'Habits') return e.type === 'habit';
      return true;
    });
  }, [weekKeys, activeTab]);

  const hours = useMemo(
    () => Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i),
    [],
  );

  const goToPrevWeek = useCallback(() => {
    setWeekBase((prev) => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d; });
  }, []);

  const goToNextWeek = useCallback(() => {
    setWeekBase((prev) => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d; });
  }, []);

  const goToToday = useCallback(() => setWeekBase(new Date()), []);

  const handleEventPress = useCallback((event) => {
    Alert.alert(
      `${event.type === 'focus' ? '🎯' : event.type === 'habit' ? '✅' : '📌'} ${event.title}`,
      `${formatTime(event.startHour, event.startMin)} · ${event.durationMins} min\nType: ${event.type}`,
      event.type === 'focus'
        ? [
            { text: 'Not Now', style: 'cancel' },
            { text: 'Start Focus Session', onPress: () => { /* navigate to Focus screen */ } },
          ]
        : [{ text: 'OK' }],
    );
  }, []);

  // Scroll to current time on layout
  const handleGridLayout = useCallback(() => {
    const now = new Date();
    const scrollY = Math.max(0, (now.getHours() - START_HOUR - 1) * HOUR_HEIGHT);
    gridScrollRef.current?.scrollTo({ y: scrollY, animated: false });
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>

      {/* ── Month dropdown picker modal ── */}
      <MonthPickerModal
        visible={pickerOpen}
        currentBase={weekBase}
        onSelect={(d) => setWeekBase(d)}
        onClose={() => setPickerOpen(false)}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.outerScroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Header ── */}
        <View style={styles.headerSection}>
          <Text style={styles.screenTitle}>Timeline</Text>

          {/* Month nav row — dropdown replaces prev/next arrows */}
          <View style={styles.monthRow}>
            {/* Prev week */}
            <TouchableOpacity onPress={goToPrevWeek} style={styles.navBtn}>
              <Text style={styles.navBtnText}>‹</Text>
            </TouchableOpacity>

            {/* Dropdown trigger */}
            <TouchableOpacity
              onPress={() => setPickerOpen(true)}
              style={styles.monthDropdown}
              activeOpacity={0.7}
            >
              <Text style={styles.monthLabel}>{monthLabel}</Text>
              <Text style={styles.dropdownCaret}>▾</Text>
            </TouchableOpacity>

            {/* Next week */}
            <TouchableOpacity onPress={goToNextWeek} style={styles.navBtn}>
              <Text style={styles.navBtnText}>›</Text>
            </TouchableOpacity>

            {/* Today */}
            <TouchableOpacity onPress={goToToday} style={styles.todayBtn}>
              <LinearGradient colors={['#4FACFE', '#00F2FE']} style={styles.todayBtnGrad}>
                <Text style={styles.todayBtnText}>Today</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Tabs ── */}
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

        {/* ── Week grid card ── */}
        <View style={styles.gridCard}>

          {/* Sticky day-name header row */}
          <View style={styles.dayHeaderRow}>
            {/* Spacer for time column */}
            <View style={{ width: TIME_COL_WIDTH }} />
            {weekDays.map((day) => (
              <View key={day.isoKey} style={[styles.dayHeaderCell, { width: DAY_COL_WIDTH }]}>
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

          {/* Scrollable hour grid */}
          <ScrollView
            ref={gridScrollRef}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            onLayout={handleGridLayout}
            style={styles.gridScroll}
          >
            {/* Grid container — all hour lines + event blocks */}
            <View style={{ height: TOTAL_HOURS * HOUR_HEIGHT, position: 'relative' }}>

              {/* Hour rows (horizontal lines + labels) */}
              {hours.map((hour, idx) => (
                <View
                  key={hour}
                  style={[styles.hourRow, { top: idx * HOUR_HEIGHT }]}
                >
                  <Text style={styles.hourLabel}>{formatHour(hour)}</Text>
                  {/* Vertical day dividers */}
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

              {/* Event blocks */}
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

              {/* Current time red line */}
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
  safeArea: {
    flex: 1,
    backgroundColor: '#F0F7FF',
  },
  outerScroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // ── Header
  headerSection: {
    marginBottom: 12,
  },
  screenTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  navBtnText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#94A3B8',
    lineHeight: 22,
  },
  monthDropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  dropdownCaret: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
  },
  todayBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  todayBtnGrad: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 16,
  },
  todayBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  // ── Tabs
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  tabGrad: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 14,
  },
  tabInactive: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.1)',
    backgroundColor: '#fff',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  tabTextInactive: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 13,
  },

  // ── Grid card
  gridCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    overflow: 'hidden',
  },

  // Day header row (sticky above scroll)
  dayHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,23,42,0.08)',
    paddingVertical: 8,
    backgroundColor: '#fff',
    zIndex: 10,
  },
  dayHeaderCell: {
    alignItems: 'center',
    gap: 4,
  },
  dayAbbr: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dayAbbrToday: {
    color: '#4FACFE',
  },
  dayDateCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDateCircleToday: {
    backgroundColor: '#4FACFE',
  },
  dayDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  dayDateToday: {
    color: '#fff',
  },

  // Scrollable grid
  gridScroll: {
    height: 480,
  },

  // Hour row — one per hour
  hourRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: HOUR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.07)',
  },
  hourLabel: {
    width: TIME_COL_WIDTH,
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'right',
    paddingRight: 6,
    paddingTop: 3,
    letterSpacing: 0.2,
  },
  hourCell: {
    height: HOUR_HEIGHT,
  },
  hourCellBorder: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(15,23,42,0.06)',
  },

  // ── Event block
  eventBlock: {
    position: 'absolute',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  eventGradient: {
    flex: 1,
    paddingHorizontal: 5,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  eventTitle: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
  },
  eventTime: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 9,
    fontWeight: '500',
    marginTop: 2,
  },

  // ── Now line
  nowLine: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 20,
    pointerEvents: 'none',
  },
  nowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4757',
    marginLeft: -4,
  },
  nowBar: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#FF4757',
    opacity: 0.85,
  },

  // ── Month picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerCard: {
    width: SCREEN_WIDTH * 0.75,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  pickerRowActive: {
    backgroundColor: 'rgba(79,172,254,0.12)',
  },
  pickerRowText: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '500',
  },
  pickerRowTextActive: {
    color: '#4FACFE',
    fontWeight: '700',
  },
  pickerCheck: {
    fontSize: 14,
    color: '#4FACFE',
    fontWeight: '700',
  },
});