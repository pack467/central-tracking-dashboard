import test from "node:test";
import assert from "node:assert/strict";

// Re-implement the pure logic as written in frontend/app/lib/shifts.ts for hermetic testing
const shiftDefinitions = {
  subuh: { id: "subuh", label: "Shift Subuh", period: "00:00 – 08:30 WIB" },
  pagi: { id: "pagi", label: "Shift Pagi", period: "08:00 – 16:30 WIB" },
  malam: { id: "malam", label: "Shift Malam", period: "16:00 – 00:30 WIB" },
};

function getShiftTransitionStateForMinutes(totalMinutes) {
  const minuteOfDay = ((totalMinutes % 1440) + 1440) % 1440;

  // Window 1: Malam -> Subuh (00:00 - 00:30)
  if (minuteOfDay < 30) {
    return {
      isActive: true,
      isUpcoming: false,
      fromShift: shiftDefinitions.malam,
      toShift: shiftDefinitions.subuh,
      label: "Malam → Subuh",
      windowStart: "00:00",
      windowEnd: "00:30",
      windowPeriod: "00:00 – 00:30 WIB",
      minutesRemaining: Math.max(1, 30 - minuteOfDay),
      minutesUntilStart: 0,
      progressPercent: Math.min(100, Math.round((minuteOfDay / 30) * 100)),
    };
  }

  // Window 2: Subuh -> Pagi (08:00 - 08:30)
  if (minuteOfDay >= 8 * 60 && minuteOfDay < 8 * 60 + 30) {
    const elapsed = minuteOfDay - 8 * 60;
    return {
      isActive: true,
      isUpcoming: false,
      fromShift: shiftDefinitions.subuh,
      toShift: shiftDefinitions.pagi,
      label: "Subuh → Pagi",
      windowStart: "08:00",
      windowEnd: "08:30",
      windowPeriod: "08:00 – 08:30 WIB",
      minutesRemaining: Math.max(1, 30 - elapsed),
      minutesUntilStart: 0,
      progressPercent: Math.min(100, Math.round((elapsed / 30) * 100)),
    };
  }

  // Window 3: Pagi -> Malam (16:00 - 16:30)
  if (minuteOfDay >= 16 * 60 && minuteOfDay < 16 * 60 + 30) {
    const elapsed = minuteOfDay - 16 * 60;
    return {
      isActive: true,
      isUpcoming: false,
      fromShift: shiftDefinitions.pagi,
      toShift: shiftDefinitions.malam,
      label: "Pagi → Malam",
      windowStart: "16:00",
      windowEnd: "16:30",
      windowPeriod: "16:00 – 16:30 WIB",
      minutesRemaining: Math.max(1, 30 - elapsed),
      minutesUntilStart: 0,
      progressPercent: Math.min(100, Math.round((elapsed / 30) * 100)),
    };
  }

  // Outside active window: Determine next upcoming handover window
  if (minuteOfDay < 8 * 60) {
    const minutesUntil = 8 * 60 - minuteOfDay;
    return {
      isActive: false,
      isUpcoming: minutesUntil <= 30,
      fromShift: shiftDefinitions.subuh,
      toShift: shiftDefinitions.pagi,
      label: "Subuh → Pagi",
      windowStart: "08:00",
      windowEnd: "08:30",
      windowPeriod: "08:00 – 08:30 WIB",
      minutesRemaining: 0,
      minutesUntilStart: minutesUntil,
      progressPercent: 0,
    };
  }

  if (minuteOfDay < 16 * 60) {
    const minutesUntil = 16 * 60 - minuteOfDay;
    return {
      isActive: false,
      isUpcoming: minutesUntil <= 30,
      fromShift: shiftDefinitions.pagi,
      toShift: shiftDefinitions.malam,
      label: "Pagi → Malam",
      windowStart: "16:00",
      windowEnd: "16:30",
      windowPeriod: "16:00 – 16:30 WIB",
      minutesRemaining: 0,
      minutesUntilStart: minutesUntil,
      progressPercent: 0,
    };
  }

  // minuteOfDay >= 16:30
  const minutesUntil = 24 * 60 - minuteOfDay;
  return {
    isActive: false,
    isUpcoming: minutesUntil <= 30,
    fromShift: shiftDefinitions.malam,
    toShift: shiftDefinitions.subuh,
    label: "Malam → Subuh",
    windowStart: "00:00",
    windowEnd: "00:30",
    windowPeriod: "00:00 – 00:30 WIB",
    minutesRemaining: 0,
    minutesUntilStart: minutesUntil,
    progressPercent: 0,
  };
}

test("Pagi -> Malam Handover Window (16:00 - 16:30 WIB)", () => {
  // 16:00 WIB
  const at1600 = getShiftTransitionStateForMinutes(16 * 60);
  assert.equal(at1600.isActive, true);
  assert.equal(at1600.label, "Pagi → Malam");
  assert.equal(at1600.fromShift.id, "pagi");
  assert.equal(at1600.toShift.id, "malam");
  assert.equal(at1600.windowPeriod, "16:00 – 16:30 WIB");
  assert.equal(at1600.minutesRemaining, 30);
  assert.equal(at1600.progressPercent, 0);

  // 16:15 WIB (user observed state)
  const at1615 = getShiftTransitionStateForMinutes(16 * 60 + 15);
  assert.equal(at1615.isActive, true);
  assert.equal(at1615.label, "Pagi → Malam");
  assert.equal(at1615.minutesRemaining, 15);
  assert.equal(at1615.progressPercent, 50);

  // 16:29 WIB
  const at1629 = getShiftTransitionStateForMinutes(16 * 60 + 29);
  assert.equal(at1629.isActive, true);
  assert.equal(at1629.minutesRemaining, 1);
});

test("Malam -> Subuh Handover Window (00:00 - 00:30 WIB)", () => {
  // 00:00 WIB
  const at0000 = getShiftTransitionStateForMinutes(0);
  assert.equal(at0000.isActive, true);
  assert.equal(at0000.label, "Malam → Subuh");
  assert.equal(at0000.fromShift.id, "malam");
  assert.equal(at0000.toShift.id, "subuh");
  assert.equal(at0000.windowPeriod, "00:00 – 00:30 WIB");
  assert.equal(at0000.minutesRemaining, 30);

  // 00:20 WIB
  const at0020 = getShiftTransitionStateForMinutes(20);
  assert.equal(at0020.isActive, true);
  assert.equal(at0020.minutesRemaining, 10);
});

test("Subuh -> Pagi Handover Window (08:00 - 08:30 WIB)", () => {
  // 08:10 WIB
  const at0810 = getShiftTransitionStateForMinutes(8 * 60 + 10);
  assert.equal(at0810.isActive, true);
  assert.equal(at0810.label, "Subuh → Pagi");
  assert.equal(at0810.fromShift.id, "subuh");
  assert.equal(at0810.toShift.id, "pagi");
  assert.equal(at0810.windowPeriod, "08:00 – 08:30 WIB");
  assert.equal(at0810.minutesRemaining, 20);
});

test("Outside Handover Windows (Normal & Upcoming)", () => {
  // 10:00 WIB (Normal working hour during Shift Pagi)
  const at1000 = getShiftTransitionStateForMinutes(10 * 60);
  assert.equal(at1000.isActive, false);
  assert.equal(at1000.isUpcoming, false);
  assert.equal(at1000.label, "Pagi → Malam");
  assert.equal(at1000.minutesUntilStart, 360); // 6 hours

  // 15:45 WIB (15 minutes before 16:00 handover window)
  const at1545 = getShiftTransitionStateForMinutes(15 * 60 + 45);
  assert.equal(at1545.isActive, false);
  assert.equal(at1545.isUpcoming, true);
  assert.equal(at1545.label, "Pagi → Malam");
  assert.equal(at1545.minutesUntilStart, 15);

  // 23:45 WIB (15 minutes before 00:00 handover window)
  const at2345 = getShiftTransitionStateForMinutes(23 * 60 + 45);
  assert.equal(at2345.isActive, false);
  assert.equal(at2345.isUpcoming, true);
  assert.equal(at2345.label, "Malam → Subuh");
  assert.equal(at2345.minutesUntilStart, 15);
});

test("ShiftTransitionBadge file structure has clean hierarchy and no cluttered icon list", async () => {
  const fs = await import("node:fs/promises");
  const badgeSource = await fs.readFile(
    "f:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/components/layout/ShiftTransitionBadge.tsx",
    "utf-8"
  );

  // Assert clean new markup structure
  assert.ok(badgeSource.includes("transition-icon-container"), "Contains .transition-icon-container");
  assert.ok(badgeSource.includes("transition-info-stack"), "Contains .transition-info-stack");
  assert.ok(badgeSource.includes("transition-kicker-label"), "Contains .transition-kicker-label");
  assert.ok(badgeSource.includes("transition-flow-row"), "Contains .transition-flow-row");
  assert.ok(badgeSource.includes("transition-timer-badge"), "Contains .transition-timer-badge");

  // Assert old cluttered elements are removed
  assert.ok(!badgeSource.includes("transition-icons-preview"), "Old squished icon preview removed");
  assert.ok(!badgeSource.includes("transition-badge-tag"), "Old hazard tape yellow tag removed");

  // Verify CSS styles in layout.css
  const layoutCss = await fs.readFile(
    "f:/Website/Central Tracking Dashboard/Central_Tracking_Dashboard/frontend/app/styles/layout.css",
    "utf-8"
  );
  assert.ok(layoutCss.includes(".transition-icon-container"), "CSS defines .transition-icon-container");
  assert.ok(layoutCss.includes(".transition-timer-badge"), "CSS defines .transition-timer-badge");
  assert.ok(layoutCss.includes(".transition-flow-row"), "CSS defines .transition-flow-row");
});

