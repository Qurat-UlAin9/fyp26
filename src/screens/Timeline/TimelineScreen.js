import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
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
import { useNavigation } from '@react-navigation/native';
import { useAppData } from '../../contexts/AppDataContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useProductivity } from '../../contexts/ProductivityContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Grid
const BASE_HOUR_HEIGHT = 56;
const TIME_COL_WIDTH = 48;
const START_HOUR = 6;
const END_HOUR = 23;
const TOTAL_HOURS = END_HOUR - START_HOUR + 1;

const GRID_WIDTH_FULL = SCREEN_WIDTH - 32 - TIME_COL_WIDTH;

// Cards
const MIN_CARD_HEIGHT = 40;      // Fits icon + one line comfortably
const TIGHT_CARD_THRESHOLD = 38;
const MAX_VISUAL_MINS = 60;      // Never visually exceed a full hour row
const MINUTE_TO_PX = BASE_HOUR_HEIGHT / 60;
const CARD_GAP = 4;
const ROW_TOP_PAD = 2;
const ROW_BOTTOM_PAD = 4;

const CARD_COLORS = [
  { bg: ['#FF6B6B', '#FF8E53'] },
  { bg: ['#4ECDC4', '#44A08D'] },
  { bg: ['#A78BFA', '#C4B5FD'] },
  { bg: ['#43E97B', '#38F9D7'] },
  { bg: ['#F093FB', '#F5576C'] },
  { bg: ['#4FACFE', '#00F2FE'] },
  { bg: ['#FFD93D', '#FF6B6B'] },
  { bg: ['#6BCB77', '#4D96FF'] },
  { bg: ['#FA709A', '#FEE140'] },
  { bg: ['#667EEA', '#764BA2'] },
  { bg: ['#30CFD0', '#330867'] },
  { bg: ['#FF9A9E', '#FECFEF'] },
];

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const todayISO = () => new Date().toISOString().slice(0, 10);

function getWeekDays(base) {
  const d = new Date(base);
  const sun = new Date(d);
  sun.setDate(d.getDate() - d.getDay());
  const today = todayISO();
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(sun);
    day.setDate(sun.getDate() + i);
    const isoKey = day.toISOString().slice(0, 10);
    return {
      abbr: DAY_ABBR[i],
      date: day.getDate(),
      month: day.getMonth(),
      year: day.getFullYear(),
      isoKey,
      isToday: isoKey === today,
    };
  });
}

function formatHour(h) {
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 === 0 ? 12 : h % 12} ${suffix}`;
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function colorForEvent(event) {
  return CARD_COLORS[hashStr(String(event.id)) % CARD_COLORS.length].bg;
}

// Estimate rendered height from text length + available card width.
// At fontSize 12, weight 800, avg char width ≈ 6.5px.
function estimateTextHeight(title, subtitle, cardWidth) {
  const CHAR_W = 6.5;
  const PAD_TOP = 5;
  const PAD_BOTTOM = 5;
  const ICON_H = 15;
  const LINE_H = 15;
  const SUB_H = 15;

  const usableWidth = Math.max(40, cardWidth - 24);
  const charsPerLine = Math.max(8, Math.floor(usableWidth / CHAR_W));

  const titleLen = String(title || '').length;
  const titleLines = Math.min(
    3,
    Math.max(1, Math.ceil(titleLen / charsPerLine))
  );

  const hasSub = Boolean(subtitle);
  const titleBlockH = Math.max(ICON_H, titleLines * LINE_H);

  return PAD_TOP + PAD_BOTTOM + titleBlockH + (hasSub ? SUB_H : 0);
}

// Card height = max of (text needs, duration implies, hard minimum).
function cardHeightForEvent(event, cardWidth) {
  const primaryText = event.subtitle || event.title || '';
  const secondaryText = event.subtitle ? `From · ${event.title}` : null;
  const textH = estimateTextHeight(primaryText, secondaryText, cardWidth);

  const durationMins = Math.min(
    Math.max(event.durationMins || 15, 5),
    MAX_VISUAL_MINS
  );
  const durationH = durationMins * MINUTE_TO_PX;

  return Math.max(MIN_CARD_HEIGHT, textH, durationH);
}

// ------------------------------------------------------------------
// Compute row heights globally across all visible days so columns align.
// A row grows when the sum of stacked card heights in that hour exceeds
// the base hour height.
// ------------------------------------------------------------------
function computeHourHeights(allEvents, cardWidth) {
  const byHourAndDay = {};

  allEvents.forEach((e) => {
    const h = Math.min(Math.max(e.startHour ?? START_HOUR, START_HOUR), END_HOUR);
    const dayKey = e.isoKey || 'unknown';
    const key = `${h}|${dayKey}`;
    if (!byHourAndDay[key]) byHourAndDay[key] = 0;
    byHourAndDay[key] += cardHeightForEvent(e, cardWidth) + CARD_GAP;
  });

  const hourHeights = {};
  for (let h = START_HOUR; h <= END_HOUR; h++) {
    let maxForHour = 0;
    Object.entries(byHourAndDay).forEach(([key, total]) => {
      const [keyHour] = key.split('|');
      if (parseInt(keyHour, 10) === h) {
        maxForHour = Math.max(maxForHour, total);
      }
    });
    hourHeights[h] = Math.max(
      BASE_HOUR_HEIGHT,
      maxForHour > 0 ? maxForHour + ROW_TOP_PAD + ROW_BOTTOM_PAD : BASE_HOUR_HEIGHT
    );
  }
  return hourHeights;
}

function buildHourOffsets(hourHeights) {
  const offsets = {};
  let y = 0;
  for (let h = START_HOUR; h <= END_HOUR; h++) {
    offsets[h] = y;
    y += hourHeights[h];
  }
  const totalHeight = y;
  return { offsets, totalHeight };
}

// Lay out cards per day using the shared hour offsets.
function layoutDay(events, hourOffsets, hourHeights, cardWidth) {
  const sorted = [...events].sort((a, b) => {
    const aM = (a.startHour || 0) * 60 + (a.startMin || 0);
    const bM = (b.startHour || 0) * 60 + (b.startMin || 0);
    return aM - bM;
  });

  const placed = [];
  const cursors = {};

  sorted.forEach((ev) => {
    const h = Math.min(Math.max(ev.startHour ?? START_HOUR, START_HOUR), END_HOUR);
    const rowTop = hourOffsets[h] ?? 0;
    const rowH = hourHeights[h] ?? BASE_HOUR_HEIGHT;
    const minuteOffset = ((ev.startMin || 0) / 60) * rowH;
    const naturalTop = rowTop + minuteOffset + ROW_TOP_PAD;

    const cursorKey = `h-${h}`;
    const cursor = cursors[cursorKey] ?? rowTop + ROW_TOP_PAD;
    const top = Math.max(naturalTop, cursor);

    const height = cardHeightForEvent(ev, cardWidth);
    placed.push({ event: ev, top, height });
    cursors[cursorKey] = top + height + CARD_GAP;
  });

  return placed;
}

const TYPE_TABS = [
  { key: 'All', colors: ['#667EEA', '#764BA2'] },
  { key: 'Tasks', colors: ['#4FACFE', '#00F2FE'] },
  { key: 'Focus', colors: ['#A78BFA', '#7C3AED'] },
  { key: 'Habits', colors: ['#43E97B', '#38F9D7'] },
];

const STATUS_TABS = [
  { key: 'active', label: 'Active', colors: ['#10B981', '#059669'] },
  { key: 'done', label: 'Done', colors: ['#64748B', '#475569'] },
  { key: 'all', label: 'All', colors: ['#8B5CF6', '#6D28D9'] },
];

function WeekPickerModal({ visible, currentBase, onSelect, onClose }) {
  const year = currentBase.getFullYear();
  const month = currentBase.getMonth();

  const options = [];
  const start = new Date(year, month - 3, 1);
  start.setDate(start.getDate() - start.getDay());
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

function NowLine({ days, columnWidth, hourOffsets, hourHeights }) {
  const now = new Date();
  const todayKey = todayISO();
  const colIdx = days.findIndex((d) => d.isoKey === todayKey);
  if (colIdx === -1) return null;

  const h = now.getHours();
  const m = now.getMinutes();
  if (h < START_HOUR || h > END_HOUR) return null;

  const rowTop = hourOffsets[h] ?? 0;
  const rowH = hourHeights[h] ?? BASE_HOUR_HEIGHT;
  const topOffset = rowTop + (m / 60) * rowH;

  return (
    <View
      pointerEvents="none"
      style={[styles.nowLine, {
        top: topOffset,
        left: TIME_COL_WIDTH,
        width: columnWidth * days.length,
      }]}
    >
      <View style={styles.nowDot} />
      <View style={styles.nowBar} />
    </View>
  );
}

function EventCard({ placed, colIdx, columnWidth, onPress }) {
  const { event, top, height } = placed;

  const leftOffset = TIME_COL_WIDTH + colIdx * columnWidth + 4;
  const cardWidth = columnWidth - 8;

  const colors = colorForEvent(event);
  const tight = height < TIGHT_CARD_THRESHOLD;

  const icon = event.type === 'focus' ? '🎯' : event.type === 'habit' ? '✅' : '📌';
  const hasSubtitle = Boolean(event.subtitle);
  const primaryText = hasSubtitle ? event.subtitle : event.title;
  const secondaryText = hasSubtitle ? `From · ${event.title}` : null;
  const done = Boolean(event.done);

  return (
    <TouchableOpacity
      onPress={() => onPress(event)}
      activeOpacity={0.88}
      style={[
        styles.eventCard,
        { top, left: leftOffset, width: cardWidth, height },
      ]}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.eventGradient}
      >
        <View style={styles.eventAccent} />
        <View style={styles.eventInner}>
          <View style={styles.eventTitleRow}>
            <Text style={styles.eventTitleIcon}>{done ? '✓' : icon}</Text>
            <Text
              style={[
                styles.eventTitle,
                tight && styles.eventTitleCompact,
                done && styles.eventTitleDone,
              ]}
              numberOfLines={tight ? 1 : 3}
            >
              {primaryText}
            </Text>
            {event.remainingCount > 0 && (
              <View style={styles.moreBadge}>
                <Text style={styles.moreBadgeText}>+{event.remainingCount}</Text>
              </View>
            )}
          </View>
          {secondaryText && !tight && (
            <Text style={styles.eventSub} numberOfLines={1} ellipsizeMode="tail">
              {secondaryText}
            </Text>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function TimelineScreen() {
  const { timelineEvents, focusSessions } = useAppData();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const { setActiveSessionTask } = useProductivity();

  const today = new Date();
  const [weekBase, setWeekBase] = useState(today);
  const [activeTab, setActiveTab] = useState('All');
  const [statusFilter, setStatusFilter] = useState('active');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [viewMode, setViewMode] = useState('today');

  const gridScrollRef = useRef(null);

  const weekDays = useMemo(() => getWeekDays(weekBase), [weekBase]);

  const visibleDays = useMemo(() => {
    if (viewMode === 'today') {
      const todayKey = todayISO();
      const t = weekDays.find((d) => d.isoKey === todayKey);
      return t ? [t] : [weekDays[new Date().getDay()]];
    }
    return weekDays;
  }, [weekDays, viewMode]);

  const columnWidth = GRID_WIDTH_FULL / visibleDays.length;

  const monthLabel = useMemo(() => {
    if (viewMode === 'today') {
      const d = visibleDays[0];
      return `${MONTH_NAMES[d.month]} ${d.date}, ${d.year}`;
    }
    const first = weekDays[0];
    const last = weekDays[6];
    if (first.month === last.month) {
      return `${MONTH_NAMES[first.month]} ${first.date}–${last.date}, ${last.year}`;
    }
    return `${MONTH_SHORT[first.month]} ${first.date} – ${MONTH_SHORT[last.month]} ${last.date}, ${last.year}`;
  }, [visibleDays, weekDays, viewMode]);

  const visibleKeys = useMemo(() => visibleDays.map((d) => d.isoKey), [visibleDays]);

  // Apply type tab + status filter
  const visibleEvents = useMemo(() => {
    return timelineEvents.filter((e) => {
      if (!visibleKeys.includes(e.isoKey)) return false;

      // Type filter
      if (activeTab !== 'All') {
        const typeMatch =
          (activeTab === 'Tasks' && e.type === 'task') ||
          (activeTab === 'Focus' && e.type === 'focus') ||
          (activeTab === 'Habits' && e.type === 'habit');
        if (!typeMatch) return false;
      }

      // Status filter
      if (statusFilter === 'active') {
        if (e.type === 'focus') return false; // focus history is completed
        return !e.done && !e.allDone;
      }
      if (statusFilter === 'done') {
        if (e.type === 'focus') return true; // all focus sessions are "done"
        return e.done || e.allDone;
      }
      return true; // 'all'
    });
  }, [timelineEvents, visibleKeys, activeTab, statusFilter]);

  // Compute hour row heights + offsets once, globally
  const { hourHeights, hourOffsets, totalHeight } = useMemo(() => {
    const cardWidth = Math.max(40, columnWidth - 8);
    const heights = computeHourHeights(visibleEvents, cardWidth);
    const { offsets, totalHeight: t } = buildHourOffsets(heights);
    return { hourHeights: heights, hourOffsets: offsets, totalHeight: t };
  }, [visibleEvents, columnWidth]);

  // Per-day layout
  const dayLayoutMap = useMemo(() => {
    const map = {};
    const cardWidth = Math.max(40, columnWidth - 8);
    for (const day of visibleDays) {
      const eventsForDay = visibleEvents.filter((e) => e.isoKey === day.isoKey);
      map[day.isoKey] = layoutDay(
        eventsForDay,
        hourOffsets,
        hourHeights,
        cardWidth
      );
    }
    return map;
  }, [visibleEvents, visibleDays, hourOffsets, hourHeights, columnWidth]);

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
    if (event.type === 'focus') {
      const sessionId = event.id.startsWith('focus-')
        ? event.id.replace('focus-', '')
        : null;
      const taskTitle = event.title.replace(/^Focus:\s*/, '');
      navigation.navigate('Focus', {
        task: { title: taskTitle },
        resumeSessionId: sessionId,
        _ts: Date.now(),
      });
      return;
    }

    if (event.type === 'habit') {
      const parts = String(event.id).split('-');
      const habitId = parts.length >= 3 ? parts[1] : null;
      navigation.navigate('Habits', {
        highlightHabitId: habitId,
        _ts: Date.now(),
      });
      return;
    }

    const stripped = String(event.id).replace('task-', '');
    const taskId = stripped.split('-')[0];
    if (!taskId) return;

    navigation.navigate('Tasks', {
      expandTaskId: taskId,
      _ts: Date.now(),
    });
  }, [navigation]);

  const handleGridLayout = useCallback(() => {
    const now = new Date();
    const h = Math.min(Math.max(now.getHours() - 1, START_HOUR), END_HOUR);
    const y = (hourOffsets[h] ?? 0);
    gridScrollRef.current?.scrollTo({ y, animated: false });
  }, [hourOffsets]);

  const emptyMessage = activeTab === 'Tasks'
    ? 'Add a task — it will appear on the grid.'
    : activeTab === 'Habits'
    ? 'Add a habit — it will appear on the grid.'
    : activeTab === 'Focus'
    ? 'Start a timer on the Focus tab. Completed sessions appear here.'
    : 'Tasks, focus sessions, and habits all appear on this grid.';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background[0] }]} edges={['top']}>
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
        <View style={styles.headerSection}>
          <Text style={[styles.screenTitle, { color: theme.text }]}>Timeline</Text>

          <View style={styles.modeToggle}>
            {['today', 'week'].map((mode) => {
              const active = viewMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setViewMode(mode)}
                  activeOpacity={0.8}
                  style={[styles.modeBtn, active && styles.modeBtnActive]}
                >
                  <Text
                    style={[
                      styles.modeText,
                      { color: active ? '#4FACFE' : isDark ? '#64748B' : '#94A3B8' },
                    ]}
                  >
                    {mode === 'today' ? 'Today' : 'Week'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.monthRow}>
            <TouchableOpacity onPress={goToPrevWeek} style={styles.navBtn}>
              <Text style={styles.navBtnText}>‹</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPickerOpen(true)}
              style={[styles.monthDropdown, { backgroundColor: isDark ? 'rgba(15,23,42,0.5)' : '#fff', borderColor: theme.border }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.monthLabel, { color: theme.text }]} numberOfLines={1}>
                {monthLabel}
              </Text>
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

        {/* Type tabs */}
        <View style={styles.tabRow}>
          {TYPE_TABS.map((tab) => {
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
                    <Text style={styles.tabTextActive} numberOfLines={1}>{tab.key}</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.tabInactive, { backgroundColor: isDark ? 'rgba(15,23,42,0.4)' : '#fff', borderColor: theme.border }]}>
                    <Text style={[styles.tabTextInactive, { color: theme.textSecondary }]} numberOfLines={1}>
                      {tab.key}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Status filter */}
        <View style={styles.statusRow}>
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setStatusFilter(tab.key)}
                activeOpacity={0.8}
                style={styles.statusBtn}
              >
                {active ? (
                  <LinearGradient colors={tab.colors} style={styles.statusGrad}>
                    <Text style={styles.statusTextActive}>{tab.label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.statusInactive, { backgroundColor: isDark ? 'rgba(15,23,42,0.4)' : '#fff', borderColor: theme.border }]}>
                    <Text style={[styles.statusTextInactive, { color: theme.textSecondary }]}>
                      {tab.label}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {visibleEvents.length === 0 && (
          <View style={styles.emptyBanner}>
            <Text style={styles.emptyBannerEmoji}>
              {statusFilter === 'done'
                ? '✅'
                : activeTab === 'Focus' ? '🎯' : activeTab === 'Habits' ? '✅' : '📋'}
            </Text>
            <Text style={styles.emptyBannerText}>
              {statusFilter === 'done'
                ? 'Nothing completed yet.'
                : emptyMessage}
            </Text>
          </View>
        )}

        <View style={styles.gridCard}>
          <View style={styles.dayHeaderRow}>
            <View style={{ width: TIME_COL_WIDTH }} />
            {visibleDays.map((day) => (
              <View key={day.isoKey} style={[styles.dayHeaderCell, { width: columnWidth }]}>
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

          <ScrollView
            ref={gridScrollRef}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            onLayout={handleGridLayout}
            style={styles.gridScroll}
          >
            <View style={{ height: totalHeight, position: 'relative' }}>

              {hours.map((hour) => {
                const top = hourOffsets[hour] ?? 0;
                const h = hourHeights[hour] ?? BASE_HOUR_HEIGHT;
                return (
                  <View
                    key={hour}
                    style={[
                      styles.hourRow,
                      { top, height: h },
                    ]}
                  >
                    <Text style={styles.hourLabel}>{formatHour(hour)}</Text>
                    {visibleDays.map((day, di) => (
                      <View
                        key={day.isoKey}
                        style={[
                          styles.hourCell,
                          { width: columnWidth, height: h },
                          di < visibleDays.length - 1 && styles.hourCellBorder,
                        ]}
                      />
                    ))}
                  </View>
                );
              })}

              {visibleDays.map((day, colIdx) => {
                const placed = dayLayoutMap[day.isoKey] || [];
                return placed.map((entry) => (
                  <EventCard
                    key={entry.event.id}
                    placed={entry}
                    colIdx={colIdx}
                    columnWidth={columnWidth}
                    onPress={handleEventPress}
                  />
                ));
              })}

              <NowLine
                days={visibleDays}
                columnWidth={columnWidth}
                hourOffsets={hourOffsets}
                hourHeights={hourHeights}
              />
            </View>
          </ScrollView>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F0F7FF' },
  outerScroll: { paddingHorizontal: 16, paddingTop: 8 },

  headerSection: { marginBottom: 12 },
  screenTitle: { fontSize: 30, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5, marginBottom: 12 },

  modeToggle: { flexDirection: 'row', alignSelf: 'flex-start', gap: 6, marginBottom: 12 },
  modeBtn: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 16,
    borderWidth: 1.5, borderColor: 'rgba(15,23,42,0.1)', backgroundColor: '#fff',
  },
  modeBtnActive: { backgroundColor: 'rgba(79,172,254,0.12)', borderColor: '#4FACFE' },
  modeText: { fontSize: 13, fontWeight: '700' },

  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(15,23,42,0.12)', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  navBtnText: { fontSize: 20, fontWeight: '600', color: '#94A3B8', lineHeight: 22 },
  monthDropdown: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(15,23,42,0.12)', paddingVertical: 8, paddingHorizontal: 14 },
  monthLabel: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  dropdownCaret: { fontSize: 12, color: '#94A3B8', marginTop: 1 },
  todayBtn: { borderRadius: 16, overflow: 'hidden' },
  todayBtnGrad: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 16 },
  todayBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  tabRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  tabBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  tabGrad: { paddingVertical: 9, alignItems: 'center', borderRadius: 12, paddingHorizontal: 6 },
  tabInactive: { paddingVertical: 9, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(15,23,42,0.1)', backgroundColor: '#fff', paddingHorizontal: 6 },
  tabTextActive: { color: '#fff', fontWeight: '700', fontSize: 12 },
  tabTextInactive: { color: '#94A3B8', fontWeight: '600', fontSize: 12 },

  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statusBtn: { borderRadius: 20, overflow: 'hidden' },
  statusGrad: { paddingVertical: 6, paddingHorizontal: 16, alignItems: 'center', borderRadius: 20 },
  statusInactive: { paddingVertical: 6, paddingHorizontal: 16, alignItems: 'center', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(15,23,42,0.1)', backgroundColor: '#fff' },
  statusTextActive: { color: '#fff', fontWeight: '800', fontSize: 12 },
  statusTextInactive: { color: '#94A3B8', fontWeight: '700', fontSize: 12 },

  emptyBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)', paddingHorizontal: 16, paddingVertical: 12, marginBottom: 10 },
  emptyBannerEmoji: { fontSize: 22 },
  emptyBannerText: { flex: 1, fontSize: 13, color: '#64748B', fontWeight: '500', lineHeight: 18 },

  gridCard: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)', overflow: 'hidden' },

  dayHeaderRow: { flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: 'rgba(15,23,42,0.12)', paddingVertical: 8, backgroundColor: '#fff', zIndex: 10 },
  dayHeaderCell: { alignItems: 'center', gap: 4 },
  dayAbbr: { fontSize: 10, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.4 },
  dayAbbrToday: { color: '#4FACFE' },
  dayDateCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dayDateCircleToday: { backgroundColor: '#4FACFE' },
  dayDate: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  dayDateToday: { color: '#fff' },

  gridScroll: { height: 560 },
  hourRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: 'rgba(15,23,42,0.14)',
  },
  hourLabel: {
    width: TIME_COL_WIDTH,
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textAlign: 'right',
    paddingRight: 8,
    paddingTop: 2,
    letterSpacing: 0.1,
  },
  hourCell: {},
  hourCellBorder: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(15,23,42,0.08)',
  },

  eventCard: {
    position: 'absolute',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  eventGradient: { flex: 1, flexDirection: 'row' },
  eventAccent: { width: 3, backgroundColor: 'rgba(255,255,255,0.6)' },
  eventInner: { flex: 1, paddingHorizontal: 10, paddingVertical: 5, justifyContent: 'center' },
  eventTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5 },
  eventTitleIcon: { color: '#FFFFFF', fontSize: 11, lineHeight: 15 },
  eventTitle: { flex: 1, color: '#FFFFFF', fontSize: 12, fontWeight: '800', lineHeight: 15, letterSpacing: 0.1 },
  eventTitleCompact: { fontSize: 11, lineHeight: 13 },
  eventTitleDone: { textDecorationLine: 'line-through', opacity: 0.7 },
  eventSub: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 13,
    marginTop: 2,
    marginLeft: 16,
    fontStyle: 'italic',
  },
  moreBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
    marginLeft: 4,
  },
  moreBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },

  nowLine: { position: 'absolute', flexDirection: 'row', alignItems: 'center', zIndex: 100 },
  nowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4757', marginLeft: -4 },
  nowBar: { flex: 1, height: 1.5, backgroundColor: '#FF4757', opacity: 0.9 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  pickerCard: { width: SCREEN_WIDTH * 0.80, backgroundColor: '#fff', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 12 },
  pickerTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 12, textAlign: 'center' },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, paddingHorizontal: 12, borderRadius: 12 },
  pickerRowActive: { backgroundColor: 'rgba(79,172,254,0.12)' },
  pickerRowText: { fontSize: 14, color: '#334155', fontWeight: '500' },
  pickerRowTextActive: { color: '#4FACFE', fontWeight: '700' },
  pickerCheck: { fontSize: 14, color: '#4FACFE', fontWeight: '700' },
});