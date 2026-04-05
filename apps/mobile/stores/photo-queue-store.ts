import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PHOTO_KEY = 'photo_upload_queue';
const CHECKLIST_KEY = 'checklist_queue';
const COMPLETION_KEY = 'completion_queue';
const START_KEY = 'start_queue';

export type QueuedPhoto = {
  id: string;
  interventionId: string;
  localPath: string;
  type: 'before' | 'after' | 'damage';
  userId: string;
  label?: string;
};

export type QueuedChecklistItem = {
  id: string;
  interventionId: string;
  itemId: string;
  checked: boolean;
};

type OfflineQueueState = {
  queue: QueuedPhoto[];
  checklistQueue: QueuedChecklistItem[];
  completionQueue: string[];
  startQueue: string[];
  isProcessing: boolean;
  loadQueue: () => Promise<void>;
  addToQueue: (item: Omit<QueuedPhoto, 'id'>) => Promise<void>;
  removeFromQueue: (id: string) => Promise<void>;
  addChecklistItem: (item: Omit<QueuedChecklistItem, 'id'>) => Promise<void>;
  removeChecklistItem: (id: string) => Promise<void>;
  addCompletion: (interventionId: string) => Promise<void>;
  removeCompletion: (interventionId: string) => Promise<void>;
  addStart: (interventionId: string) => Promise<void>;
  removeStart: (interventionId: string) => Promise<void>;
  setProcessing: (v: boolean) => void;
};

export const usePhotoQueueStore = create<OfflineQueueState>((set, get) => ({
  queue: [],
  checklistQueue: [],
  completionQueue: [],
  startQueue: [],
  isProcessing: false,

  loadQueue: async () => {
    const [rawPhotos, rawChecklist, rawCompletion, rawStart] = await Promise.all([
      AsyncStorage.getItem(PHOTO_KEY),
      AsyncStorage.getItem(CHECKLIST_KEY),
      AsyncStorage.getItem(COMPLETION_KEY),
      AsyncStorage.getItem(START_KEY),
    ]);
    set({
      queue: rawPhotos ? JSON.parse(rawPhotos) : [],
      checklistQueue: rawChecklist ? JSON.parse(rawChecklist) : [],
      completionQueue: rawCompletion ? JSON.parse(rawCompletion) : [],
      startQueue: rawStart ? JSON.parse(rawStart) : [],
    });
  },

  addToQueue: async (item) => {
    const newItem: QueuedPhoto = { ...item, id: `${Date.now()}_${Math.random()}` };
    const queue = [...get().queue, newItem];
    set({ queue });
    await AsyncStorage.setItem(PHOTO_KEY, JSON.stringify(queue));
  },

  removeFromQueue: async (id) => {
    const queue = get().queue.filter((q) => q.id !== id);
    set({ queue });
    await AsyncStorage.setItem(PHOTO_KEY, JSON.stringify(queue));
  },

  addChecklistItem: async (item) => {
    const existing = get().checklistQueue;
    // Remplacer si même intervention + même item (évite les doublons)
    const filtered = existing.filter(
      (q) => !(q.interventionId === item.interventionId && q.itemId === item.itemId)
    );
    const newItem: QueuedChecklistItem = { ...item, id: `${Date.now()}_${Math.random()}` };
    const checklistQueue = [...filtered, newItem];
    set({ checklistQueue });
    await AsyncStorage.setItem(CHECKLIST_KEY, JSON.stringify(checklistQueue));
  },

  removeChecklistItem: async (id) => {
    const checklistQueue = get().checklistQueue.filter((q) => q.id !== id);
    set({ checklistQueue });
    await AsyncStorage.setItem(CHECKLIST_KEY, JSON.stringify(checklistQueue));
  },

  addCompletion: async (interventionId) => {
    const completionQueue = [...new Set([...get().completionQueue, interventionId])];
    set({ completionQueue });
    await AsyncStorage.setItem(COMPLETION_KEY, JSON.stringify(completionQueue));
  },

  removeCompletion: async (interventionId) => {
    const completionQueue = get().completionQueue.filter((id) => id !== interventionId);
    set({ completionQueue });
    await AsyncStorage.setItem(COMPLETION_KEY, JSON.stringify(completionQueue));
  },

  addStart: async (interventionId) => {
    const startQueue = [...new Set([...get().startQueue, interventionId])];
    set({ startQueue });
    await AsyncStorage.setItem(START_KEY, JSON.stringify(startQueue));
  },

  removeStart: async (interventionId) => {
    const startQueue = get().startQueue.filter((id) => id !== interventionId);
    set({ startQueue });
    await AsyncStorage.setItem(START_KEY, JSON.stringify(startQueue));
  },

  setProcessing: (v) => set({ isProcessing: v }),
}));
