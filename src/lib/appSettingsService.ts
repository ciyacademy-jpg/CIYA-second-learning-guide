import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from './firebase';
import { AppSettings } from '../types';

const SETTINGS_DOC_ID = 'global_config';

export async function fetchAppSettings(retries = 3): Promise<AppSettings | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as AppSettings;
      }
      return null;
    } catch (error: any) {
      const isOfflineError = error?.message?.includes('offline') || error?.code === 'unavailable';
      
      if (isOfflineError && i < retries - 1) {
        console.warn(`Fetch app settings attempt ${i + 1} failed (offline/unavailable). Retrying in ${1000 * (i + 1)}ms...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      
      if (!isOfflineError) {
        console.error('Error fetching app settings:', error);
      } else if (i === retries - 1) {
        console.error('Error fetching app settings (Persistent Offline):', error);
      }
      return null;
    }
  }
  return null;
}

export async function saveAppSettings(settings: Partial<AppSettings>, retries = 3): Promise<{ success: boolean; message: string }> {
  for (let i = 0; i < retries; i++) {
    try {
      const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
      console.log('[AppSettings] Saving to Firestore (Attempt', i + 1, '):', SETTINGS_DOC_ID);
      
      await setDoc(docRef, {
        ...settings,
        id: SETTINGS_DOC_ID,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      
      console.log('[AppSettings] Save confirmed by Firestore');
      return { success: true, message: 'Settings saved successfully' };
    } catch (error: any) {
      const isOfflineError = error?.message?.includes('offline') || error?.code === 'unavailable';
      
      if (isOfflineError && i < retries - 1) {
        console.warn(`Save app settings attempt ${i + 1} failed (offline/unavailable). Retrying in ${1000 * (i + 1)}ms...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }

      console.error('[AppSettings] Critical Save Error:', error);
      return { success: false, message: error.message || 'Failed to save settings' };
    }
  }
  return { success: false, message: 'Failed to save settings after multiple attempts' };
}

export function subscribeToAppSettings(callback: (settings: AppSettings) => void) {
  const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
  return onSnapshot(
    docRef, 
    (doc) => {
      if (doc.exists()) {
        callback(doc.data() as AppSettings);
      }
    },
    (error) => {
      console.warn('Subscription to app settings noticed a connectivity issue:', error);
    }
  );
}
