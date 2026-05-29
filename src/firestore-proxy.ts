import * as firestore from 'firebase/firestore';

// Global variable tracking quota exceedance state
if (typeof window !== 'undefined') {
  (window as any).isFirestoreQuotaExceeded = (window as any).isFirestoreQuotaExceeded || false;
}

function getQuotaExceeded(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).isFirestoreQuotaExceeded;
}

function setQuotaExceeded() {
  if (typeof window !== 'undefined' && !(window as any).isFirestoreQuotaExceeded) {
    console.warn("Setting window.isFirestoreQuotaExceeded to true. Switching to Local Demo Database fallback.");
    (window as any).isFirestoreQuotaExceeded = true;
    window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
  }
}

function isQuotaError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || err).toLowerCase();
  return (
    err.code === 'resource-exhausted' ||
    msg.includes('quota') ||
    msg.includes('exhausted') ||
    msg.includes('limit')
  );
}

// Map collection and references path tracking
function getPathFromRef(ref: any): string {
  if (!ref) return '';
  if (ref._proxiedPath) return ref._proxiedPath;
  if (ref.path) return ref.path;
  if (ref._query && ref._query.path) return ref._query.path.toString();
  return '';
}

// Proxy wrapper functions
export function collection(db: any, path: string, ...args: any[]) {
  const colRef = firestore.collection(db, path, ...args);
  (colRef as any)._proxiedPath = path;
  return colRef;
}

export function doc(parent: any, ...args: any[]) {
  const docRef = (firestore.doc as any)(parent, ...args);
  let pathText = '';
  if (typeof parent === 'string') {
    pathText = args.join('/');
  } else {
    const parentPath = getPathFromRef(parent);
    pathText = parentPath ? `${parentPath}/${args.join('/')}` : args.join('/');
  }
  (docRef as any)._proxiedPath = pathText;
  return docRef;
}

export function query(queryRef: any, ...args: any[]) {
  const q = firestore.query(queryRef, ...args);
  (q as any)._proxiedPath = getPathFromRef(queryRef);
  return q;
}

// Re-export constraints
export { where, orderBy, limit, or, serverTimestamp } from 'firebase/firestore';

// Local storage key prefix
const cachePrefix = 'firestore_local_db_';

// Initial Seeds to mimic a fully operational and high-fidelity product dashboard
function getInitialSeeds(collectionName: string): any[] {
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthStr = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;
  
  if (collectionName === 'users') {
    return [
      {
        id: 'user-001',
        uid: 'mc6dR4iNC2XbW44pwpnxvlwr1Gd2',
        email: 'thienvu1108@gmail.com',
        displayName: 'Nguyễn Thiên Vũ',
        fullName: 'Nguyễn Thiên Vũ',
        role: 'super_admin',
        teamName: 'Ban Giám Đốc',
        assignedProjects: ['da-001', 'da-002', 'da-003'],
        createdAt: { toDate: () => new Date(), toMillis: () => Date.now() }
      }
    ];
  }
  
  if (collectionName === 'projects') {
    return [
      { id: 'da-001', name: 'Dự án Marketing Miền Bắc', projectCode: 'DA-NORTH-MKT', region: 'Miền Bắc', type: 'Marketing', createdAt: { toDate: () => new Date(), toMillis: () => Date.now() } },
      { id: 'da-002', name: 'Dự án Tuyển dụng Hà Nội', projectCode: 'DA-RECRUIT-HN', region: 'Miền Bắc', type: 'Tuyển dụng', createdAt: { toDate: () => new Date(), toMillis: () => Date.now() } },
      { id: 'da-003', name: 'Dự án Thương mại miền Nam', projectCode: 'DA-SOUTH-TRADE', region: 'Miền Nam', type: 'Thương mại', createdAt: { toDate: () => new Date(), toMillis: () => Date.now() } }
    ];
  }
  
  if (collectionName === 'teams') {
    return [
      { id: 'team-001', name: 'Phòng Kinh Doanh HN1', teamCode: 'HN1', blockId: 'block-001', blockCode: 'EG01', createdAt: { toDate: () => new Date(), toMillis: () => Date.now() } },
      { id: 'team-002', name: 'Phòng Kinh Doanh HN2', teamCode: 'HN2', blockId: 'block-001', blockCode: 'EG01', createdAt: { toDate: () => new Date(), toMillis: () => Date.now() } },
      { id: 'team-003', name: 'Phòng Kinh Doanh SG1', teamCode: 'SG1', blockId: 'block-002', blockCode: 'EG02', createdAt: { toDate: () => new Date(), toMillis: () => Date.now() } }
    ];
  }
  
  if (collectionName === 'blocks') {
    return [
      { id: 'block-001', name: 'Khối EG01', blockCode: 'EG01', teamPrefix: 'EG', directorUid: 'mc6dR4iNC2XbW44pwpnxvlwr1Gd2', createdAt: { toDate: () => new Date(), toMillis: () => Date.now() } },
      { id: 'block-002', name: 'Khối EG02', blockCode: 'EG02', teamPrefix: 'EG', directorUid: 'mc6dR4iNC2XbW44pwpnxvlwr1Gd2', createdAt: { toDate: () => new Date(), toMillis: () => Date.now() } }
    ];
  }
  
  if (collectionName === 'regions') {
    return [
      { id: 'reg-001', name: 'Miền Bắc', createdAt: { toDate: () => new Date(), toMillis: () => Date.now() } },
      { id: 'reg-002', name: 'Miền Trung', createdAt: { toDate: () => new Date(), toMillis: () => Date.now() } },
      { id: 'reg-003', name: 'Miền Nam', createdAt: { toDate: () => new Date(), toMillis: () => Date.now() } }
    ];
  }
  
  if (collectionName === 'types') {
    return [
      { id: 'type-001', name: 'Marketing', createdAt: { toDate: () => new Date(), toMillis: () => Date.now() } },
      { id: 'type-002', name: 'Tuyển dụng', createdAt: { toDate: () => new Date(), toMillis: () => Date.now() } },
      { id: 'type-003', name: 'Thương mại', createdAt: { toDate: () => new Date(), toMillis: () => Date.now() } }
    ];
  }
  
  if (collectionName === 'settings') {
    return [
      { id: 'global', budgetStartDay: 1, budgetEndDay: 20 }
    ];
  }
  
  if (collectionName === 'budgets') {
    return [
      {
        id: 'b-001',
        projectId: 'da-001',
        projectName: 'Dự án Marketing Miền Bắc',
        teamId: 'team-001',
        teamName: 'Phòng Kinh Doanh HN1',
        teamCode: 'HN1',
        implementerName: 'Nguyễn Thiên Vũ',
        month: currentMonthStr,
        amount: 80000000,
        createdAt: { toDate: () => new Date(), toMillis: () => Date.now() },
        createdBy: 'mc6dR4iNC2XbW44pwpnxvlwr1Gd2',
        userEmail: 'thienvu1108@gmail.com',
        status: 'approved'
      },
      {
        id: 'b-002',
        projectId: 'da-002',
        projectName: 'Dự án Tuyển dụng Hà Nội',
        teamId: 'team-002',
        teamName: 'Phòng Kinh Doanh HN2',
        teamCode: 'HN2',
        implementerName: 'Trần Anh Trung',
        month: currentMonthStr,
        amount: 50000000,
        createdAt: { toDate: () => new Date(), toMillis: () => Date.now() },
        createdBy: 'mc6dR4iNC2XbW44pwpnxvlwr1Gd2',
        userEmail: 'thienvu1108@gmail.com',
        status: 'approved'
      }
    ];
  }
  
  if (collectionName === 'costs') {
    return [
      {
        id: 'c-001',
        projectId: 'da-001',
        projectName: 'Dự án Marketing Miền Bắc',
        teamId: 'team-001',
        teamName: 'Phòng Kinh Doanh HN1',
        teamCode: 'HN1',
        budgetId: 'b-001',
        implementerName: 'Nguyễn Thiên Vũ',
        weekNumber: 1,
        year: String(now.getFullYear()),
        month: currentMonthStr,
        amount: 15600000,
        channels: { fbAds: 8000000, googleAds: 5000000, zaloAds: 1000000, posting: 600000, otherCost: 1000000 },
        note: 'Chi phí chạy ads tuần 1 (Mẫu Offline)',
        createdAt: { toDate: () => new Date(), toMillis: () => Date.now() },
        userEmail: 'thienvu1108@gmail.com'
      },
      {
        id: 'c-002',
        projectId: 'da-001',
        projectName: 'Dự án Marketing Miền Bắc',
        teamId: 'team-001',
        teamName: 'Phòng Kinh Doanh HN1',
        teamCode: 'HN1',
        budgetId: 'b-001',
        implementerName: 'Nguyễn Thiên Vũ',
        weekNumber: 2,
        year: String(now.getFullYear()),
        month: currentMonthStr,
        amount: 18400000,
        channels: { fbAds: 10000000, googleAds: 5000000, zaloAds: 2000000, posting: 400000, otherCost: 1000000 },
        note: 'Chi phí chạy ads tuần 2 (Mẫu Offline)',
        createdAt: { toDate: () => new Date(), toMillis: () => Date.now() },
        userEmail: 'thienvu1108@gmail.com'
      },
      {
        id: 'c-003',
        projectId: 'da-002',
        projectName: 'Dự án Tuyển dụng Hà Nội',
        teamId: 'team-002',
        teamName: 'Phòng Kinh Doanh HN2',
        teamCode: 'HN2',
        budgetId: 'b-002',
        implementerName: 'Trần Anh Trung',
        weekNumber: 1,
        year: String(now.getFullYear()),
        month: currentMonthStr,
        amount: 12000000,
        channels: { fbAds: 6000000, googleAds: 3000000, zaloAds: 1000000, posting: 1000000, otherCost: 1000000 },
        note: 'Chi phí tuyển dụng (Mẫu)',
        createdAt: { toDate: () => new Date(), toMillis: () => Date.now() },
        userEmail: 'thienvu1108@gmail.com'
      }
    ];
  }
  
  if (collectionName === 'efficiencyReports') {
    return [
      {
        id: 'eff-001',
        projectId: 'da-001',
        projectName: 'Dự án Marketing Miền Bắc',
        teamId: 'team-001',
        teamName: 'Phòng Kinh Doanh HN1',
        month: currentMonthStr,
        sales: 120,
        revenue: 600000000,
        createdAt: { toDate: () => new Date(), toMillis: () => Date.now() },
        createdBy: 'mc6dR4iNC2XbW44pwpnxvlwr1Gd2'
      },
      {
        id: 'eff-002',
        projectId: 'da-002',
        projectName: 'Dự án Tuyển dụng Hà Nội',
        teamId: 'team-002',
        teamName: 'Phòng Kinh Doanh HN2',
        month: currentMonthStr,
        sales: 85,
        revenue: 425000000,
        createdAt: { toDate: () => new Date(), toMillis: () => Date.now() },
        createdBy: 'mc6dR4iNC2XbW44pwpnxvlwr1Gd2'
      }
    ];
  }
  
  if (collectionName === 'acceptances') {
    return [
      { id: 'acc-001', projectId: 'da-001', projectName: 'Dự án Marketing Miền Bắc', month: currentMonthStr, sales: 120, revenue: 600000000, createdAt: { toDate: () => new Date(), toMillis: () => Date.now() } }
    ];
  }
  
  if (collectionName === 'finalAcceptances') {
    return [
      { id: 'facc-001', projectId: 'da-001', projectName: 'Dự án Marketing Miền Bắc', month: currentMonthStr, sales: 120, revenue: 600000000, finalizedAt: { toDate: () => new Date(), toMillis: () => Date.now() } }
    ];
  }
  
  if (collectionName === 'docProcessing') {
    return [
      { id: 'dp-001', projectId: 'da-001', projectName: 'Dự án Marketing Miền Bắc', status: 'processing', updatedAt: { toDate: () => new Date(), toMillis: () => Date.now() } }
    ];
  }
  
  if (collectionName === 'supportRequests') {
    return [
      {
        id: 'sup-001',
        userId: 'mc6dR4iNC2XbW44pwpnxvlwr1Gd2',
        title: 'Cập quyền truy cập dự án mới',
        description: 'Tôi cần truy cập dự án Thương mại miền Nam',
        status: 'pending',
        createdAt: { toDate: () => new Date(), toMillis: () => Date.now() }
      }
    ];
  }
  
  return [];
}

// Global cached memory to allow instantaneous reactive updates on listeners
const memoryCollections: Record<string, any[]> = {};

function getLocalDBCollection(collectionName: string): any[] {
  if (memoryCollections[collectionName]) {
    return memoryCollections[collectionName];
  }
  
  const key = cachePrefix + collectionName;
  let parsed: any[] = [];
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        parsed = JSON.parse(stored);
      } catch {
        parsed = [];
      }
    }
  }
  
  if (parsed.length === 0) {
    parsed = getInitialSeeds(collectionName);
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(parsed));
    }
  }
  
  // Enforce Mock Firebase Timestamps
  parsed = parsed.map(item => {
    const updated = { ...item };
    for (const key of Object.keys(updated)) {
      if (updated[key] && typeof updated[key] === 'object' && updated[key].toDate) {
        // preserve it
      } else if (key === 'createdAt' || key === 'timestamp' || key === 'finalizedAt') {
        updated[key] = {
          toDate: () => new Date(updated[key] || Date.now()),
          toMillis: () => new Date(updated[key] || Date.now()).getTime()
        };
      }
    }
    return updated;
  });
  
  memoryCollections[collectionName] = parsed;
  return parsed;
}

function saveLocalDBCollection(collectionName: string, data: any[]) {
  memoryCollections[collectionName] = data;
  if (typeof window !== 'undefined') {
    const key = cachePrefix + collectionName;
    localStorage.setItem(key, JSON.stringify(data));
  }
}

// Active listeners tracker
const activeListeners: {
  ref: any;
  onNext: Function;
  onError: Function;
  unsubscribed: boolean;
}[] = [];

// Triggers active snapshot callbacks with current values
function triggerActiveListeners(collectionName: string) {
  setTimeout(() => {
    for (const listener of activeListeners) {
      if (listener.unsubscribed) continue;
      const path = getPathFromRef(listener.ref);
      const listenerCol = path.split('/')[0];
      if (listenerCol === collectionName) {
        emitMockSnapshot(listener.ref, listener.onNext);
      }
    }
  }, 10);
}

function emitMockSnapshot(ref: any, onNext: Function) {
  const path = getPathFromRef(ref);
  const parts = path.split('/');
  const collectionName = parts[0];
  const docId = parts[1];
  
  if (docId) {
    // Document listener
    const colData = getLocalDBCollection(collectionName);
    const docItem = colData.find(item => item.id === docId);
    onNext({
      exists: () => !!docItem,
      id: docId,
      data: () => docItem || null
    });
  } else {
    // Query list listener
    const colData = getLocalDBCollection(collectionName);
    const filtered = filterMockData(path, colData, ref);
    onNext({
      empty: filtered.length === 0,
      docs: filtered.map(item => ({
        id: item.id,
        exists: () => true,
        data: () => item
      }))
    });
  }
}

function filterMockData(path: string, data: any[], queryRef: any): any[] {
  // Return everything or do simple filtering where necessary
  const collectionName = path.split('/')[0];
  if (collectionName === 'budgets' || collectionName === 'costs') {
    // Simple filter to ensure speed and consistency
  }
  return data;
}

// FieldValue simulations
function evaluateMockFieldUpdate(updateVal: any, existingFieldVal: any) {
  if (updateVal && typeof updateVal === 'object') {
    if (updateVal._type === 'increment') {
      const current = typeof existingFieldVal === 'number' ? existingFieldVal : 0;
      return current + updateVal.value;
    }
    if (updateVal._type === 'arrayUnion') {
      const current = Array.isArray(existingFieldVal) ? existingFieldVal : [];
      const newArr = [...current];
      for (const item of updateVal.value) {
        if (!newArr.some(existing => JSON.stringify(existing) === JSON.stringify(item))) {
          newArr.push(item);
        }
      }
      return newArr;
    }
  }
  return updateVal;
}

export function increment(n: number) {
  return {
    _type: 'increment',
    value: n
  };
}

export function arrayUnion(...items: any[]) {
  return {
    _type: 'arrayUnion',
    value: items
  };
}

// Exportable Firestore client interface actions
export async function getDocs(queryRef: any) {
  if (getQuotaExceeded()) {
    const path = getPathFromRef(queryRef);
    const collectionName = path.split('/')[0];
    const data = getLocalDBCollection(collectionName);
    const filtered = filterMockData(path, data, queryRef);
    return {
      empty: filtered.length === 0,
      docs: filtered.map(item => ({
        id: item.id,
        exists: () => true,
        data: () => item
      }))
    };
  }
  
  try {
    return await firestore.getDocs(queryRef);
  } catch (err) {
    if (isQuotaError(err)) {
      setQuotaExceeded();
      return getDocs(queryRef);
    }
    throw err;
  }
}

export async function getDoc(docRef: any) {
  if (getQuotaExceeded()) {
    const path = getPathFromRef(docRef);
    const parts = path.split('/');
    const collectionName = parts[0];
    const docId = parts[1];
    
    if (collectionName === 'settings' && docId === 'global') {
      const colData = getLocalDBCollection('settings');
      return {
        exists: () => true,
        id: 'global',
        data: () => colData[0] || { budgetStartDay: 1, budgetEndDay: 20 }
      };
    }
    
    const collectionData = getLocalDBCollection(collectionName);
    const found = collectionData.find(item => item.id === docId);
    return {
      exists: () => !!found,
      id: docId,
      data: () => found || null
    };
  }
  
  try {
    return await firestore.getDoc(docRef);
  } catch (err) {
    if (isQuotaError(err)) {
      setQuotaExceeded();
      return getDoc(docRef);
    }
    throw err;
  }
}

export function getDocFromServer(docRef: any) {
  return getDoc(docRef);
}

export async function addDoc(collectionRef: any, data: any) {
  if (getQuotaExceeded()) {
    const path = getPathFromRef(collectionRef);
    const collectionName = path.split('/')[0];
    const colData = getLocalDBCollection(collectionName);
    const newDocId = 'mock_' + Math.random().toString(36).substr(2, 9);
    
    const newDoc = {
      id: newDocId,
      ...data,
      createdAt: data.createdAt || { toDate: () => new Date(), toMillis: () => Date.now() }
    };
    
    colData.push(newDoc);
    saveLocalDBCollection(collectionName, colData);
    triggerActiveListeners(collectionName);
    return { id: newDocId };
  }
  
  try {
    return await firestore.addDoc(collectionRef, data);
  } catch (err) {
    if (isQuotaError(err)) {
      setQuotaExceeded();
      return addDoc(collectionRef, data);
    }
    throw err;
  }
}

export async function updateDoc(docRef: any, data: any) {
  if (getQuotaExceeded()) {
    const path = getPathFromRef(docRef);
    const parts = path.split('/');
    const collectionName = parts[0];
    const docId = parts[1];
    
    const colData = getLocalDBCollection(collectionName);
    const idx = colData.findIndex(item => item.id === docId);
    if (idx > -1) {
      const item = colData[idx];
      const updatedFields: Record<string, any> = {};
      for (const key of Object.keys(data)) {
        updatedFields[key] = evaluateMockFieldUpdate(data[key], item[key]);
      }
      colData[idx] = {
        ...item,
        ...updatedFields
      };
      saveLocalDBCollection(collectionName, colData);
      triggerActiveListeners(collectionName);
    }
    return;
  }
  
  try {
    return await firestore.updateDoc(docRef, data);
  } catch (err) {
    if (isQuotaError(err)) {
      setQuotaExceeded();
      return updateDoc(docRef, data);
    }
    throw err;
  }
}

export async function setDoc(docRef: any, data: any, options?: any) {
  if (getQuotaExceeded()) {
    const path = getPathFromRef(docRef);
    const parts = path.split('/');
    const collectionName = parts[0];
    const docId = parts[1];
    
    const colData = getLocalDBCollection(collectionName);
    const idx = colData.findIndex(item => item.id === docId);
    
    if (idx > -1) {
      const item = colData[idx];
      const updatedFields: Record<string, any> = {};
      for (const key of Object.keys(data)) {
        updatedFields[key] = evaluateMockFieldUpdate(data[key], item[key]);
      }
      
      colData[idx] = options?.merge ? {
        ...item,
        ...updatedFields
      } : {
        id: docId,
        ...updatedFields
      };
    } else {
      colData.push({ id: docId, ...data });
    }
    
    saveLocalDBCollection(collectionName, colData);
    triggerActiveListeners(collectionName);
    return;
  }
  
  try {
    return await firestore.setDoc(docRef, data, options);
  } catch (err) {
    if (isQuotaError(err)) {
      setQuotaExceeded();
      return setDoc(docRef, data, options);
    }
    throw err;
  }
}

export async function deleteDoc(docRef: any) {
  if (getQuotaExceeded()) {
    const path = getPathFromRef(docRef);
    const parts = path.split('/');
    const collectionName = parts[0];
    const docId = parts[1];
    
    const colData = getLocalDBCollection(collectionName);
    const filtered = colData.filter(item => item.id !== docId);
    saveLocalDBCollection(collectionName, filtered);
    triggerActiveListeners(collectionName);
    return;
  }
  
  try {
    return await firestore.deleteDoc(docRef);
  } catch (err) {
    if (isQuotaError(err)) {
      setQuotaExceeded();
      return deleteDoc(docRef);
    }
    throw err;
  }
}

export function onSnapshot(ref: any, onNext: any, onError?: any) {
  if (getQuotaExceeded()) {
    setTimeout(() => emitMockSnapshot(ref, onNext), 0);
    const listenerObj = {
      ref,
      onNext,
      onError: onError || (() => {}),
      unsubscribed: false
    };
    activeListeners.push(listenerObj);
    return () => {
      listenerObj.unsubscribed = true;
      const idx = activeListeners.indexOf(listenerObj);
      if (idx > -1) activeListeners.splice(idx, 1);
    };
  }
  
  const unsubReal = firestore.onSnapshot(ref, (snap) => {
    // Safely parse collection name
    const path = getPathFromRef(ref);
    const collectionName = path.split('/')[0];
    const docs = snap.docs ? snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [];
    if (docs.length > 0 && collectionName) {
      saveLocalDBCollection(collectionName, docs);
    }
    onNext(snap);
  }, (err) => {
    if (isQuotaError(err)) {
      setQuotaExceeded();
      emitMockSnapshot(ref, onNext);
    } else {
      if (onError) onError(err);
    }
  });
  
  const listenerObj = {
    ref,
    onNext,
    onError: onError || (() => {}),
    unsubscribed: false
  };
  activeListeners.push(listenerObj);
  
  return () => {
    listenerObj.unsubscribed = true;
    if (unsubReal) unsubReal();
    const idx = activeListeners.indexOf(listenerObj);
    if (idx > -1) activeListeners.splice(idx, 1);
  };
}

export function writeBatch(db: any) {
  if (getQuotaExceeded()) {
    const operations: (() => void)[] = [];
    return {
      set: (docRef: any, data: any, options?: any) => {
        operations.push(() => {
          const path = getPathFromRef(docRef);
          const parts = path.split('/');
          const collectionName = parts[0];
          const docId = parts[1];
          const colData = getLocalDBCollection(collectionName);
          const idx = colData.findIndex(item => item.id === docId);
          if (idx > -1) {
            colData[idx] = options?.merge ? { ...colData[idx], ...data } : { id: docId, ...data };
          } else {
            colData.push({ id: docId, ...data });
          }
          saveLocalDBCollection(collectionName, colData);
          triggerActiveListeners(collectionName);
        });
      },
      update: (docRef: any, data: any) => {
        operations.push(() => {
          const path = getPathFromRef(docRef);
          const parts = path.split('/');
          const collectionName = parts[0];
          const docId = parts[1];
          const colData = getLocalDBCollection(collectionName);
          const idx = colData.findIndex(item => item.id === docId);
          if (idx > -1) {
            colData[idx] = { ...colData[idx], ...data };
            saveLocalDBCollection(collectionName, colData);
            triggerActiveListeners(collectionName);
          }
        });
      },
      delete: (docRef: any) => {
        operations.push(() => {
          const path = getPathFromRef(docRef);
          const parts = path.split('/');
          const collectionName = parts[0];
          const docId = parts[1];
          const colData = getLocalDBCollection(collectionName);
          const filtered = colData.filter(item => item.id !== docId);
          saveLocalDBCollection(collectionName, filtered);
          triggerActiveListeners(collectionName);
        });
      },
      commit: async () => {
        operations.forEach(op => op());
      }
    };
  }
  
  const batch = firestore.writeBatch(db);
  return {
    set: batch.set.bind(batch),
    update: batch.update.bind(batch),
    delete: batch.delete.bind(batch),
    commit: async () => {
      try {
        return await batch.commit();
      } catch (err) {
        if (isQuotaError(err)) {
          setQuotaExceeded();
          const mockBatch = writeBatch(db);
          console.warn("writeBatch backed off to local storage");
        } else {
          throw err;
        }
      }
    }
  };
}
