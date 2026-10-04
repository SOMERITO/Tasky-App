"use strict";

// =========================================================
// TASKY · V46 · PREVIEW / STORAGE SAFETY
// =========================================================
const memoryStorage = new Map();

const safeStorage = {
  getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return memoryStorage.has(key)
        ? memoryStorage.get(key)
        : null;
    }
  },

  setItem(key, value) {
    try {
      window.localStorage.setItem(key, String(value));
    } catch (error) {
      memoryStorage.set(key, String(value));
    }
  },

  removeItem(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      memoryStorage.delete(key);
    }
  }
};

// =========================================================
// TASKY v49
// =========================================================

const APP_VERSION = 104;
const APP_VERSION_LABEL = `V${APP_VERSION}`;

const STORAGE_KEY = "tasky_pro_v26";
const THEME_KEY = "tasky_theme";
const DEVICE_KEY = "tasky_device_id";
const COMPLETED_COLLAPSED_KEY = "tasky_completed_collapsed";

const firebaseConfig = {
  apiKey: "AIzaSyBCiHv2iS76-q4yWHgdrJ2zW5YrhvEcb8",
  authDomain: "tasky-7a30c.firebaseapp.com",
  projectId: "tasky-7a30c",
  storageBucket: "tasky-7a30c.firebasestorage.app",
  messagingSenderId: "505071526437",
  appId: "1:505071526437:web:6c9eb46dbb4fef296655cc"
};

const el = {
  loadingScreen: document.getElementById("loadingScreen"),
  loadingTitle: document.getElementById("loadingTitle"),
  loadingMessage: document.getElementById("loadingMessage"),
  board: document.getElementById("board"),
  emptyState: document.getElementById("emptyState"),
  emptyAddBtn: document.getElementById("emptyAddBtn"),
  searchInput: document.getElementById("searchInput"),
  overdueBtn: document.getElementById("overdueBtn"),
  overdueCount: document.getElementById("overdueCount"),
  overdueList: document.getElementById("overdueList"),
  rescheduledBtn: document.getElementById("rescheduledBtn"),
  rescheduledCount: document.getElementById("rescheduledCount"),
  rescheduledList: document.getElementById("rescheduledList"),
  productivityBtn: document.getElementById("productivityBtn"),
  dailyProductivityContent:
    document.getElementById("dailyProductivityContent"),
  statsReportContent:
    document.getElementById("statsReportContent"),
  syncStatus: document.getElementById("syncStatus"),
  dayPercent: document.getElementById("dayPercent"),
  dayCompleted: document.getElementById("dayCompleted"),
  dayTotal: document.getElementById("dayTotal"),
  dayProgressFill: document.getElementById("dayProgressFill"),
  metricCategories: document.getElementById("metricCategories"),
  metricPending: document.getElementById("metricPending"),
  metricCompleted: document.getElementById("metricCompleted"),
  fab: document.getElementById("fab"),
  fabMain: document.getElementById("fabMain"),
  fabTop: document.getElementById("fabTop"),
  themeBtn: document.getElementById("themeBtn"),
  menuBtn: document.getElementById("menuBtn"),
  importInput: document.getElementById("importInput"),
  toastStack: document.getElementById("toastStack")
};

let deviceId = "";

let db = null;
let taskyDoc = null;
let unsubscribe = null;

let state = defaultState();

let initialized = false;
let hydrating = false;
let localDirty = false;
let saveTimer = null;

let lastSavedHash = "";
let lastConfirmedRemoteHash = "";
let lastConfirmedRemoteUpdatedBy = "";
let lastLocalWriteHash = "";

let lastBlockedRemoteHash = "";
let lastBlockedRemoteAt = 0;

let pendingRemoteState = null;

let activeSearch = "";
let activeTaskView = "all";

let completedCollapsed = false;

let saveInFlight = false;
let queuedSaveReason = null;

let sortableCategories = null;

const sortableTasks = new Map();

function defaultState() {
  return {
    version: APP_VERSION,
    categories: [],
    completed: []
  };
}

function getOrCreateDeviceId() {
  const existing = safeStorage.getItem(DEVICE_KEY);

  if (existing) {
    return existing;
  }

  const id =
    crypto?.randomUUID?.() ||
    (
      "device-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 8)
    );

  safeStorage.setItem(DEVICE_KEY, id);

  return id;
}
