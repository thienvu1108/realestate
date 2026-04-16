import React, { useState, useEffect, useMemo } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  browserLocalPersistence,
  User
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  orderBy, 
  where,
  or,
  serverTimestamp,
  doc,
  getDocFromServer,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { LogIn, LogOut, Plus, History, TrendingUp, Wallet, Building2, ShieldCheck, BarChart3, Users, Edit2, Trash2, X, Check, Search, ArrowUpDown, AlertTriangle, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, getWeek } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';

// Error handling for Firestore
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  toast.error(`Lỗi Firestore: ${errInfo.error}`);
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'super_admin' | 'admin' | 'mod' | 'user' | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [costs, setCosts] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('register');
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Helper for Marketing Month (21st of prev month to 20th of current month)
  const getMarketingMonth = (date: Date | any) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    const day = d.getDate();
    if (day >= 21) {
      d.setMonth(d.getMonth() + 1);
    }
    return format(d, 'yyyy-MM');
  };

  const getReportingPeriod = (monthStr: string) => {
    if (!monthStr) return '';
    try {
      const [year, month] = monthStr.split('-').map(Number);
      const endDate = new Date(year, month - 1, 20);
      const startDate = new Date(year, month - 2, 21);
      return `(${format(startDate, 'dd/MM')} - ${format(endDate, 'dd/MM')})`;
    } catch (e) {
      return '';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumberWithCommas = (value: string | number) => {
    if (value === undefined || value === null || value === '') return '';
    const stringValue = value.toString().replace(/,/g, '');
    return stringValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handleNumberInputChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, '');
    if (rawValue === '' || /^\d+$/.test(rawValue)) {
      setter(rawValue);
    }
  };

  const safeFormat = (date: any, formatStr: string) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    return format(d, formatStr);
  };

  const formatYAxis = (value: number) => {
    if (value >= 1000000000) return (value / 1000000000).toFixed(1) + ' tỷ';
    if (value >= 1000000) return (value / 1000000).toFixed(1) + ' tr';
    return value.toLocaleString();
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const budget = payload.find((p: any) => p.dataKey === 'budget' || p.name === 'Ngân sách')?.value || 0;
      const actual = payload.find((p: any) => p.dataKey === 'actual' || p.name === 'Thực chi')?.value || 0;
      const diff = budget - actual;
      const percent = budget > 0 ? (actual / budget) * 100 : 0;

      return (
        <div className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-2xl border border-slate-100 min-w-[240px] animate-in fade-in zoom-in duration-200">
          <div className="flex items-center justify-between mb-3 border-b pb-2 border-slate-100">
            <p className="text-sm font-bold text-slate-800">{label}</p>
            <Badge variant={percent > 100 ? "destructive" : percent > 90 ? "secondary" : "default"} className="text-[10px] px-1.5 h-5">
              {percent.toFixed(1)}%
            </Badge>
          </div>
          
          <div className="space-y-2.5">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between group">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: entry.fill }} />
                  <span className="text-xs font-medium text-slate-500">{entry.name}</span>
                </div>
                <span className="text-xs font-bold text-slate-900 tabular-nums">
                  {formatCurrency(entry.value)}
                </span>
              </div>
            ))}

            {(budget > 0 || actual > 0) && (
              <div className="mt-3 pt-3 border-t border-dashed border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chênh lệch</span>
                  <span className={`text-xs font-bold tabular-nums ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                  </span>
                </div>
                
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${percent > 100 ? 'bg-rose-500' : percent > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>
                
                <p className="text-[10px] text-center text-slate-400 italic">
                  {percent > 100 
                    ? `Vượt ngân sách ${formatCurrency(actual - budget)}` 
                    : `Còn lại ${formatCurrency(budget - actual)}`}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const getMarketingMonthDisplayRange = (monthStr: string) => {
    if (!monthStr) return '';
    try {
      const [year, month] = monthStr.split('-').map(Number);
      // Marketing month M is from 21st of M-1 to 20th of M
      const startDate = new Date(year, month - 2, 21);
      const endDate = new Date(year, month - 1, 20);
      return `Tháng ${month} (từ ${safeFormat(startDate, 'dd/MM')} - ${safeFormat(endDate, 'dd/MM')})`;
    } catch (e) {
      return '';
    }
  };

  // Form states
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectRegion, setNewProjectRegion] = useState('');
  const [newProjectType, setNewProjectType] = useState('Thấp tầng');
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [actualProjectId, setActualProjectId] = useState('');
  const [selectedTeamName, setSelectedTeamName] = useState('');
  const [implementerName, setImplementerName] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [teamName, setTeamName] = useState('');
  const [budgetMonth, setBudgetMonth] = useState(getMarketingMonth(new Date()));
  
  // Search and Confirmation states
  const [projectSearch, setProjectSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [adminProjectRegionFilter, setAdminProjectRegionFilter] = useState('all');
  const [adminProjectTypeFilter, setAdminProjectTypeFilter] = useState('all');
  const [budgetSearch, setBudgetSearch] = useState('');
  const [isConfirmBudgetOpen, setIsConfirmBudgetOpen] = useState(false);
  
  // Delete confirmation states
  const [isDeleteProjectDialogOpen, setIsDeleteProjectDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string, name: string } | null>(null);
  const [isDeleteTeamDialogOpen, setIsDeleteTeamDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<{ id: string, name: string } | null>(null);

  // Sorting states
  const [projectSort, setProjectSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [teamSort, setTeamSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

  // Editing states for projects with extra fields
  const [editingProjectRegion, setEditingProjectRegion] = useState('');
  const [editingProjectType, setEditingProjectType] = useState('');

  const [costAmount, setCostAmount] = useState('');
  const [fbAds, setFbAds] = useState('');
  const [posting, setPosting] = useState('');
  const [zaloAds, setZaloAds] = useState('');
  const [googleAds, setGoogleAds] = useState('');
  const [otherCost, setOtherCost] = useState('');
  const [costNote, setCostNote] = useState('');
  const [selectedBudgetId, setSelectedBudgetId] = useState('');
  const [costWeek, setCostWeek] = useState(format(new Date(), "yyyy-'W'ww"));

  // Edit states for Budget
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editingBudgetAmount, setEditingBudgetAmount] = useState('');
  const [editingBudgetMonth, setEditingBudgetMonth] = useState(getMarketingMonth(new Date()));
  const [editingBudgetTeam, setEditingBudgetTeam] = useState('');
  const [editingBudgetProject, setEditingBudgetProject] = useState('');
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [editingCostAmount, setEditingCostAmount] = useState('');
  const [editingCostNote, setEditingCostNote] = useState('');

  // Edit states
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState('');

  // Region management states
  const [newRegionName, setNewRegionName] = useState('');
  const [editingRegionId, setEditingRegionId] = useState<string | null>(null);
  const [editingRegionName, setEditingRegionName] = useState('');
  const [regionSearch, setRegionSearch] = useState('');
  const [regionSort, setRegionSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [isDeleteRegionDialogOpen, setIsDeleteRegionDialogOpen] = useState(false);
  const [regionToDelete, setRegionToDelete] = useState<{ id: string, name: string } | null>(null);
  const [isSetProjectsDialogOpen, setIsSetProjectsDialogOpen] = useState(false);
  const [regionForProjects, setRegionForProjects] = useState<any>(null);
  const [selectedProjectIdsForRegion, setSelectedProjectIdsForRegion] = useState<string[]>([]);

  // Type management states
  const [newTypeName, setNewTypeName] = useState('');
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editingTypeName, setEditingTypeName] = useState('');
  const [typeSearch, setTypeSearch] = useState('');
  const [typeSort, setTypeSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [isDeleteTypeDialogOpen, setIsDeleteTypeDialogOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<{ id: string, name: string } | null>(null);
  const [isSetProjectsForTypeDialogOpen, setIsSetProjectsForTypeDialogOpen] = useState(false);
  const [typeForProjects, setTypeForProjects] = useState<any>(null);
  const [selectedProjectIdsForType, setSelectedProjectIdsForType] = useState<string[]>([]);

  // Onboarding states
  const [userProfile, setUserProfile] = useState<{ fullName?: string, teamName?: string, role?: string, assignedProjects?: string[] } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingName, setOnboardingName] = useState('');
  const [onboardingTeam, setOnboardingTeam] = useState('');

  // Report filters
  const [reportProject, setReportProject] = useState('all');
  const [reportTeam, setReportTeam] = useState('all');
  const [reportRegion, setReportRegion] = useState('all');
  const [reportType, setReportType] = useState('all');
  const [reportMonth, setReportMonth] = useState(getMarketingMonth(new Date()));
  const [reportWeek, setReportWeek] = useState('all');
  const [chartTimeType, setChartTimeType] = useState<'week' | 'month'>('month');
  const [reportYear, setReportYear] = useState(new Date().getFullYear().toString());
  const [reportProjectSearch, setReportProjectSearch] = useState('');
  const [reportTeamSearch, setReportTeamSearch] = useState('');
  const [selectedBudgetIds, setSelectedBudgetIds] = useState<string[]>([]);
  const [selectedCostIds, setSelectedCostIds] = useState<string[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedRegionIds, setSelectedRegionIds] = useState<string[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);
  const [adminBudgetSearch, setAdminBudgetSearch] = useState('');
  const [adminBudgetMonthFilter, setAdminBudgetMonthFilter] = useState(getMarketingMonth(new Date()));
  const [adminCostSearch, setAdminCostSearch] = useState('');
  const [adminCostMonthFilter, setAdminCostMonthFilter] = useState(getMarketingMonth(new Date()));
  const [costBudgetMonth, setCostBudgetMonth] = useState(getMarketingMonth(new Date()));
  const [selectedRegionForBulk, setSelectedRegionForBulk] = useState('');
  const [isBulkUpdateRegionDialogOpen, setIsBulkUpdateRegionDialogOpen] = useState(false);
  const [isAddingRegion, setIsAddingRegion] = useState(false);
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [isAddingType, setIsAddingType] = useState(false);
  const [isDeletingTeams, setIsDeletingTeams] = useState(false);
  const [isDeletingRegions, setIsDeletingRegions] = useState(false);
  const [isDeletingTypes, setIsDeletingTypes] = useState(false);
  const [isDeletingProjects, setIsDeletingProjects] = useState(false);
  const [isDeletingBudgets, setIsDeletingBudgets] = useState(false);
  const [isDeletingCosts, setIsDeletingCosts] = useState(false);
  const [isDeleteBudgetDialogOpen, setIsDeleteBudgetDialogOpen] = useState(false);
  const [isBulkDeleteBudgetsDialogOpen, setIsBulkDeleteBudgetsDialogOpen] = useState(false);
  const [isDeleteAllBudgetsDialogOpen, setIsDeleteAllBudgetsDialogOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<{id: string, name: string} | null>(null);
  const [isDeleteCostDialogOpen, setIsDeleteCostDialogOpen] = useState(false);
  const [isBulkDeleteCostsDialogOpen, setIsBulkDeleteCostsDialogOpen] = useState(false);
  const [isDeleteAllCostsDialogOpen, setIsDeleteAllCostsDialogOpen] = useState(false);
  const [costToDelete, setCostToDelete] = useState<{id: string, name: string} | null>(null);
  
  const [isBulkDeleteProjectsDialogOpen, setIsBulkDeleteProjectsDialogOpen] = useState(false);
  const [isDeleteAllProjectsDialogOpen, setIsDeleteAllProjectsDialogOpen] = useState(false);
  const [isBulkDeleteRegionsDialogOpen, setIsBulkDeleteRegionsDialogOpen] = useState(false);
  const [isDeleteAllRegionsDialogOpen, setIsDeleteAllRegionsDialogOpen] = useState(false);
  const [isBulkDeleteTypesDialogOpen, setIsBulkDeleteTypesDialogOpen] = useState(false);
  const [isDeleteAllTypesDialogOpen, setIsDeleteAllTypesDialogOpen] = useState(false);
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{id: string, email: string} | null>(null);

  const isAdmin = userRole === 'super_admin' || userRole === 'admin';
  const isSuperAdmin = userRole === 'super_admin';
  const isMod = userRole === 'mod';
  const isGDDA = userRole === 'gdda';
  const isUser = userRole === 'user';

  // Project name lookup map
  const projectMap = useMemo(() => {
    const map: Record<string, string> = {};
    projects.forEach(p => {
      map[p.id] = p.name;
    });
    return map;
  }, [projects]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Check/Create user profile
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          let role: 'super_admin' | 'admin' | 'mod' | 'gdda' | 'user' = 'user';
          if (firebaseUser.email === 'thienvu1108@gmail.com') {
            role = 'super_admin';
          }

          if (!userDoc.exists()) {
            const initialProfile = {
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              role: role,
              fullName: '',
              teamName: '',
              assignedProjects: [],
              createdAt: serverTimestamp()
            };
            await setDoc(userDocRef, initialProfile);
            setUserProfile(initialProfile);
            setShowOnboarding(true);
          } else {
            const data = userDoc.data();
            role = data?.role || 'user';
            setUserProfile(data || null);
            
            // If profile exists but missing fullName or teamName, show onboarding
            if (!data?.fullName || !data?.teamName) {
              setOnboardingName(data?.fullName || '');
              setOnboardingTeam(data?.teamName || '');
              setShowOnboarding(true);
            } else {
              // Auto-fill implementer name and team if profile is complete
              setImplementerName(data.fullName);
              setSelectedTeamName(data.teamName);
            }
          }
          
          setUserRole(role);
          setUser(firebaseUser);
          if (role === 'super_admin' || role === 'admin') {
            setActiveTab('admin');
          } else {
            setActiveTab('register');
          }
        } else {
          setUser(null);
          setUserRole(null);
          setUserProfile(null);
          setShowOnboarding(false);
        }
      } catch (error) {
        console.error('Auth State Error:', error);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    // Listen to projects
    let qProjects;
    if (isAdmin || isMod || isUser) {
      qProjects = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    } else if (isGDDA && userProfile?.assignedProjects && userProfile.assignedProjects.length > 0) {
      qProjects = query(collection(db, 'projects'), where('__name__', 'in', userProfile.assignedProjects));
    } else {
      // If GDDA has no projects, they see nothing
      qProjects = query(collection(db, 'projects'), where('__name__', '==', 'dummy_id'));
    }

    const unsubProjects = onSnapshot(qProjects, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'projects'));

    // Listen to teams
    const qTeams = query(collection(db, 'teams'), orderBy('createdAt', 'desc'));
    const unsubTeams = onSnapshot(qTeams, (snapshot) => {
      setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'teams'));

    // Listen to regions
    const qRegions = query(collection(db, 'regions'), orderBy('createdAt', 'desc'));
    const unsubRegions = onSnapshot(qRegions, (snapshot) => {
      setRegions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'regions'));

    // Listen to types
    const qTypes = query(collection(db, 'types'), orderBy('createdAt', 'desc'));
    const unsubTypes = onSnapshot(qTypes, (snapshot) => {
      setTypes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'types'));

    // Listen to budgets
    let qBudgets;
    if (isAdmin || isMod) {
      qBudgets = query(collection(db, 'budgets'), orderBy('createdAt', 'desc'));
    } else if (isGDDA && userProfile?.assignedProjects && userProfile.assignedProjects.length > 0) {
      qBudgets = query(collection(db, 'budgets'), where('projectId', 'in', userProfile.assignedProjects));
    } else {
      qBudgets = query(
        collection(db, 'budgets'), 
        or(
          where('createdBy', '==', user.uid),
          where('userEmail', '==', user.email?.toLowerCase())
        )
      );
    }

    const unsubBudgets = onSnapshot(qBudgets, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (!(isAdmin || isMod)) {
        data.sort((a: any, b: any) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        });
      }
      setBudgets(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'budgets'));

    // Listen to costs
    let qCosts;
    if (isAdmin || isMod) {
      qCosts = query(collection(db, 'costs'), orderBy('createdAt', 'desc'));
    } else if (isGDDA && userProfile?.assignedProjects && userProfile.assignedProjects.length > 0) {
      qCosts = query(collection(db, 'costs'), where('projectId', 'in', userProfile.assignedProjects));
    } else {
      qCosts = query(
        collection(db, 'costs'), 
        or(
          where('createdBy', '==', user.uid),
          where('userEmail', '==', user.email?.toLowerCase())
        )
      );
    }

    const unsubCosts = onSnapshot(qCosts, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (!(isAdmin || isMod)) {
        data.sort((a: any, b: any) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        });
      }
      setCosts(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'costs'));

    // Listen to audit logs
    let unsubLogs = () => {};
    if (isAdmin || isMod) {
      const qLogs = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'));
      unsubLogs = onSnapshot(qLogs, (snapshot) => {
        setAuditLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'auditLogs'));
    }

    // Listen to all users (for Admin)
    let unsubUsers = () => {};
    if (isAdmin) {
      const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      unsubUsers = onSnapshot(qUsers, (snapshot) => {
        setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));
    }

    return () => {
      unsubProjects();
      unsubTeams();
      unsubRegions();
      unsubTypes();
      unsubBudgets();
      unsubCosts();
      unsubLogs();
      unsubUsers();
    };
  }, [user, userRole, userProfile]);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      // Ensure persistence is set to local
      await auth.setPersistence(browserLocalPersistence);
      await signInWithPopup(auth, provider);
      toast.success('Đăng nhập thành công');
    } catch (error: any) {
      console.error('Login Error:', error);
      let message = 'Đăng nhập thất bại';
      if (error.code === 'auth/popup-blocked') {
        message = 'Trình duyệt đã chặn cửa sổ bật lên. Vui lòng cho phép bật lên để đăng nhập.';
      } else if (error.code === 'auth/cancelled-popup-request') {
        message = 'Yêu cầu đăng nhập đã bị hủy.';
      } else if (error.code === 'auth/unauthorized-domain') {
        message = 'Tên miền này chưa được ủy quyền trong Firebase Console.';
      } else if (error.message) {
        message = `Lỗi: ${error.message}`;
      }
      toast.error(message);
    }
  };

  const handleGoogleBackup = async () => {
    setIsBackingUp(true);
    try {
      // 1. Get Auth URL
      const urlRes = await fetch('/api/auth/google/url');
      const { url } = await urlRes.json();

      // 2. Open Popup
      const authWindow = window.open(url, 'google_auth_popup', 'width=600,height=700');
      
      if (!authWindow) {
        toast.error('Vui lòng cho phép popup để tiếp tục sao lưu.');
        setIsBackingUp(false);
        return;
      }

      // 3. Wait for success message
      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
          window.removeEventListener('message', handleMessage);
          
          // 4. Perform Backup
          toast.info('Đang chuẩn bị dữ liệu sao lưu...');
          
          const backupData = [
            { collectionName: 'Dự án', docs: projects },
            { collectionName: 'Vùng_KhuVực', docs: regions },
            { collectionName: 'Loại_Hình', docs: types },
            { collectionName: 'Team', docs: teams },
            { collectionName: 'Ngân_Sách', docs: budgets },
            { collectionName: 'Thực_Chi', docs: costs },
            { collectionName: 'Nhật_Ký', docs: auditLogs },
            { collectionName: 'Người_Dùng', docs: allUsers }
          ];

          const backupRes = await fetch('/api/backup/sheets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data: backupData,
              fileName: `Backup_Mayhomes_${format(new Date(), 'yyyyMMdd_HHmmss')}`
            })
          });

          const result = await backupRes.json();
          if (result.success) {
            toast.success('Sao lưu thành công!');
            if (result.spreadsheetUrl) {
              window.open(result.spreadsheetUrl, '_blank');
            }
          } else {
            toast.error('Sao lưu thất bại: ' + result.error);
          }
          setIsBackingUp(false);
        }
      };

      window.addEventListener('message', handleMessage);

    } catch (error) {
      console.error('Backup error:', error);
      toast.error('Có lỗi xảy ra trong quá trình sao lưu.');
      setIsBackingUp(false);
    }
  };

  const logout = () => signOut(auth);

  const logAction = async (action: string, collectionName: string, docId: string, data: any) => {
    try {
      await addDoc(collection(db, 'auditLogs'), {
        action,
        collection: collectionName,
        docId,
        data,
        timestamp: serverTimestamp(),
        userEmail: user?.email,
        userId: user?.uid
      });
    } catch (error) {
      console.error('Audit log error:', error);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string, assignedProjects: string[] = []) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        assignedProjects,
        updatedAt: serverTimestamp()
      });
      await logAction('UPDATE_USER_ROLE', 'users', userId, { role: newRole, assignedProjects });
      toast.success('Đã cập nhật quyền người dùng');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleDeleteUser = (userId: string, email: string) => {
    setUserToDelete({ id: userId, email });
    setIsDeleteUserDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', userToDelete.id));
      await logAction('DELETE_USER', 'users', userToDelete.id, { email: userToDelete.email });
      toast.success('Đã xóa người dùng');
      setIsDeleteUserDialogOpen(false);
      setUserToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'users');
    }
  };

  const sortedProjects = useMemo(() => {
    let filtered = projects.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(projectSearch.toLowerCase());
      const matchRegion = adminProjectRegionFilter === 'all' || p.region === adminProjectRegionFilter;
      const matchType = adminProjectTypeFilter === 'all' || p.type === adminProjectTypeFilter;
      
      // Role-based filtering
      const isSuperAdmin = userRole === 'super_admin';
      const isAdmin = userRole === 'admin';
      const isMod = userRole === 'mod';
      const isUser = userRole === 'user';

      if (isSuperAdmin || isAdmin || isUser) return matchSearch && matchRegion && matchType;
      if (isMod) {
        const isAssigned = userProfile?.assignedProjects?.includes(p.id);
        return isAssigned && matchSearch && matchRegion && matchType;
      }
      return false;
    });

    return filtered.sort((a, b) => {
      const aValue = a[projectSort.key] || '';
      const bValue = b[projectSort.key] || '';
      if (aValue < bValue) return projectSort.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return projectSort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [projects, projectSort, projectSearch, adminProjectRegionFilter, adminProjectTypeFilter]);

  const sortedTeams = useMemo(() => {
    let filtered = teams.filter(t => 
      t.name.toLowerCase().includes(teamSearch.toLowerCase())
    );

    return filtered.sort((a, b) => {
      const aValue = a[teamSort.key] || '';
      const bValue = b[teamSort.key] || '';
      if (aValue < bValue) return teamSort.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return teamSort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [teams, teamSort, teamSearch]);

  const handleSaveOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingName.trim() || !onboardingTeam) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    if (!user) return;

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        fullName: onboardingName.trim(),
        teamName: onboardingTeam,
        updatedAt: serverTimestamp()
      });
      
      setUserProfile(prev => ({
        ...prev,
        fullName: onboardingName.trim(),
        teamName: onboardingTeam
      }));
      
      // Auto-fill form fields
      setImplementerName(onboardingName.trim());
      setSelectedTeamName(onboardingTeam);
      
      setShowOnboarding(false);
      toast.success('Thông tin đã được cập nhật');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    
    const names = newProjectName.split('\n').map(n => n.trim()).filter(n => n !== '');
    if (names.length === 0) return;

    let successCount = 0;
    let duplicateCount = 0;
    const existingNames = new Set(projects.map(p => p.name.toLowerCase()));

    for (const name of names) {
      if (existingNames.has(name.toLowerCase())) {
        duplicateCount++;
        continue;
      }

      try {
        const docRef = await addDoc(collection(db, 'projects'), {
          name,
          region: newProjectRegion || 'Chưa xác định',
          type: newProjectType,
          createdAt: serverTimestamp(),
          createdBy: user?.uid
        });
        await logAction('CREATE', 'projects', docRef.id, { name, region: newProjectRegion, type: newProjectType });
        successCount++;
        existingNames.add(name.toLowerCase());
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'projects');
      }
    }
    
    setNewProjectName('');
    setNewProjectRegion('');
    if (successCount > 0) {
      toast.success(`Đã thêm ${successCount} dự án mới`);
    }
    if (duplicateCount > 0) {
      toast.warning(`${duplicateCount} dự án đã tồn tại và bị bỏ qua`);
    }
  };

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || isAddingTeam) return;
    
    const names = newTeamName.split('\n').map(n => n.trim()).filter(n => n !== '');
    if (names.length === 0) return;

    setIsAddingTeam(true);
    toast.info(`Đang thêm ${names.length} team...`);
    let successCount = 0;
    let duplicateCount = 0;
    const existingNames = new Set(teams.map(t => t.name.toLowerCase()));

    for (const name of names) {
      if (existingNames.has(name.toLowerCase())) {
        duplicateCount++;
        continue;
      }

      try {
        const docRef = await addDoc(collection(db, 'teams'), {
          name,
          createdAt: serverTimestamp(),
          createdBy: user?.uid
        });
        await logAction('CREATE', 'teams', docRef.id, { name });
        successCount++;
        existingNames.add(name.toLowerCase());
      } catch (error) {
        console.error('Error adding team:', error);
        handleFirestoreError(error, OperationType.WRITE, 'teams');
      }
    }
    
    setNewTeamName('');
    setIsAddingTeam(false);
    if (successCount > 0) {
      toast.success(`Đã thêm ${successCount} team mới`);
    }
    if (duplicateCount > 0) {
      toast.warning(`${duplicateCount} team đã tồn tại và bị bỏ qua`);
    }
  };

  const handleUpdateProject = async (id: string, newName: string, region?: string, type?: string) => {
    if (!newName.trim()) return;
    try {
      const updateData: any = { name: newName };
      if (region !== undefined) updateData.region = region;
      if (type !== undefined) updateData.type = type;
      
      await updateDoc(doc(db, 'projects', id), updateData);
      await logAction('UPDATE', 'projects', id, updateData);
      setEditingProjectId(null);
      toast.success('Đã cập nhật dự án');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'projects');
    }
  };

  const handleDeleteProject = (id: string, name: string) => {
    setProjectToDelete({ id, name });
    setIsDeleteProjectDialogOpen(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    try {
      await deleteDoc(doc(db, 'projects', projectToDelete.id));
      await logAction('DELETE', 'projects', projectToDelete.id, { name: projectToDelete.name });
      toast.success('Đã xóa dự án');
      setIsDeleteProjectDialogOpen(false);
      setProjectToDelete(null);
      setSelectedProjectIds(prev => prev.filter(pid => pid !== projectToDelete.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'projects');
    }
  };

  const handleBulkDeleteProjects = async () => {
    if (selectedProjectIds.length === 0 || isDeletingProjects) return;
    setIsBulkDeleteProjectsDialogOpen(true);
  };

  const confirmBulkDeleteProjects = async () => {
    setIsDeletingProjects(true);
    setIsBulkDeleteProjectsDialogOpen(false);
    try {
      const batch = writeBatch(db);
      selectedProjectIds.forEach(id => {
        batch.delete(doc(db, 'projects', id));
      });
      await batch.commit();
      await logAction('DELETE_BULK', 'projects', 'multiple', { count: selectedProjectIds.length });
      toast.success(`Đã xóa ${selectedProjectIds.length} dự án`);
      setSelectedProjectIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'projects');
    } finally {
      setIsDeletingProjects(false);
    }
  };

  const handleBulkUpdateProjectRegion = async () => {
    if (selectedProjectIds.length === 0 || !selectedRegionForBulk) {
      toast.error('Vui lòng chọn dự án và vùng/khu vực');
      return;
    }
    setIsBulkUpdateRegionDialogOpen(true);
  };

  const confirmBulkUpdateProjectRegion = async () => {
    setIsBulkUpdateRegionDialogOpen(false);
    try {
      const batch = writeBatch(db);
      selectedProjectIds.forEach(id => {
        batch.update(doc(db, 'projects', id), { region: selectedRegionForBulk });
      });
      await batch.commit();
      await logAction('UPDATE_BULK', 'projects', 'multiple', { count: selectedProjectIds.length, region: selectedRegionForBulk });
      toast.success(`Đã cập nhật vùng/khu vực cho ${selectedProjectIds.length} dự án`);
      setSelectedProjectIds([]);
      setSelectedRegionForBulk('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'projects');
    }
  };

  const handleDeleteAllProjects = async () => {
    if (projects.length === 0) return;
    setIsDeleteAllProjectsDialogOpen(true);
  };

  const confirmDeleteAllProjects = async () => {
    setIsDeleteAllProjectsDialogOpen(false);
    try {
      const batch = writeBatch(db);
      projects.forEach(p => {
        batch.delete(doc(db, 'projects', p.id));
      });
      await batch.commit();
      await logAction('DELETE_ALL', 'projects', 'all', { count: projects.length });
      toast.success('Đã xóa tất cả dự án');
      setSelectedProjectIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'projects');
    }
  };

  const handleUpdateTeam = async (id: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      await updateDoc(doc(db, 'teams', id), { name: newName });
      await logAction('UPDATE', 'teams', id, { name: newName });
      setEditingTeamId(null);
      toast.success('Đã cập nhật team');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'teams');
    }
  };

  const handleDeleteTeam = (id: string, name: string) => {
    setTeamToDelete({ id, name });
    setIsDeleteTeamDialogOpen(true);
  };

  const confirmDeleteTeam = async () => {
    if (!teamToDelete) return;
    try {
      await deleteDoc(doc(db, 'teams', teamToDelete.id));
      await logAction('DELETE', 'teams', teamToDelete.id, { name: teamToDelete.name });
      toast.success('Đã xóa team');
      setIsDeleteTeamDialogOpen(false);
      setTeamToDelete(null);
      setSelectedTeamIds(prev => prev.filter(tid => tid !== teamToDelete.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'teams');
    }
  };

  const [isBulkDeleteTeamsDialogOpen, setIsBulkDeleteTeamsDialogOpen] = useState(false);

  const handleBulkDeleteTeams = async () => {
    if (selectedTeamIds.length === 0 || isDeletingTeams) return;
    setIsBulkDeleteTeamsDialogOpen(true);
  };

  const confirmBulkDeleteTeams = async () => {
    setIsDeletingTeams(true);
    setIsBulkDeleteTeamsDialogOpen(false);
    console.log('Bulk deleting teams:', selectedTeamIds);
    try {
      const batch = writeBatch(db);
      selectedTeamIds.forEach(id => {
        batch.delete(doc(db, 'teams', id));
      });
      await batch.commit();
      await logAction('DELETE_BULK', 'teams', 'multiple', { count: selectedTeamIds.length });
      toast.success(`Đã xóa ${selectedTeamIds.length} team`);
      setSelectedTeamIds([]);
    } catch (error) {
      console.error('Bulk delete teams error:', error);
      handleFirestoreError(error, OperationType.DELETE, 'teams');
    } finally {
      setIsDeletingTeams(false);
    }
  };

  const [isDeleteAllTeamsDialogOpen, setIsDeleteAllTeamsDialogOpen] = useState(false);

  const handleDeleteAllTeams = async () => {
    if (teams.length === 0) return;
    setIsDeleteAllTeamsDialogOpen(true);
  };

  const confirmDeleteAllTeams = async () => {
    setIsDeleteAllTeamsDialogOpen(false);
    try {
      const batch = writeBatch(db);
      teams.forEach(t => {
        batch.delete(doc(db, 'teams', t.id));
      });
      await batch.commit();
      await logAction('DELETE_ALL', 'teams', 'all', { count: teams.length });
      toast.success('Đã xóa tất cả team');
      setSelectedTeamIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'teams');
    }
  };

  const handleAddRegion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegionName.trim() || isAddingRegion) return;
    
    const names = newRegionName.split('\n').map(n => n.trim()).filter(n => n !== '');
    if (names.length === 0) return;

    setIsAddingRegion(true);
    console.log('Adding regions:', names);
    toast.info(`Đang thêm ${names.length} vùng/khu vực...`);
    let successCount = 0;
    let duplicateCount = 0;
    const existingNames = new Set(regions.map(r => r.name.toLowerCase()));

    try {
      for (const name of names) {
        if (existingNames.has(name.toLowerCase())) {
          duplicateCount++;
          continue;
        }

        const docRef = await addDoc(collection(db, 'regions'), {
          name,
          createdAt: serverTimestamp(),
          createdBy: user?.uid
        });
        await logAction('CREATE', 'regions', docRef.id, { name });
        successCount++;
        existingNames.add(name.toLowerCase());
      }
      
      setNewRegionName('');
      if (successCount > 0) {
        toast.success(`Đã thêm ${successCount} vùng/khu vực mới`);
      }
      if (duplicateCount > 0) {
        toast.warning(`${duplicateCount} vùng/khu vực đã tồn tại và bị bỏ qua`);
      }
    } catch (error) {
      console.error('Error adding region:', error);
      handleFirestoreError(error, OperationType.WRITE, 'regions');
    } finally {
      setIsAddingRegion(false);
    }
  };

  const handleUpdateRegion = async (id: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      await updateDoc(doc(db, 'regions', id), { name: newName });
      await logAction('UPDATE', 'regions', id, { name: newName });
      setEditingRegionId(null);
      toast.success('Đã cập nhật vùng/khu vực');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'regions');
    }
  };

  const handleDeleteRegion = (id: string, name: string) => {
    setRegionToDelete({ id, name });
    setIsDeleteRegionDialogOpen(true);
  };

  const confirmDeleteRegion = async () => {
    if (!regionToDelete) return;
    try {
      await deleteDoc(doc(db, 'regions', regionToDelete.id));
      await logAction('DELETE', 'regions', regionToDelete.id, { name: regionToDelete.name });
      toast.success('Đã xóa vùng/khu vực');
      setIsDeleteRegionDialogOpen(false);
      setRegionToDelete(null);
      setSelectedRegionIds(prev => prev.filter(rid => rid !== regionToDelete.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'regions');
    }
  };

  const handleBulkDeleteRegions = async () => {
    if (selectedRegionIds.length === 0 || isDeletingRegions) return;
    setIsBulkDeleteRegionsDialogOpen(true);
  };

  const confirmBulkDeleteRegions = async () => {
    setIsDeletingRegions(true);
    setIsBulkDeleteRegionsDialogOpen(false);
    try {
      const batch = writeBatch(db);
      selectedRegionIds.forEach(id => {
        batch.delete(doc(db, 'regions', id));
      });
      await batch.commit();
      await logAction('DELETE_BULK', 'regions', 'multiple', { count: selectedRegionIds.length });
      toast.success(`Đã xóa ${selectedRegionIds.length} vùng/khu vực`);
      setSelectedRegionIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'regions');
    } finally {
      setIsDeletingRegions(false);
    }
  };

  const handleDeleteAllRegions = async () => {
    if (regions.length === 0) return;
    setIsDeleteAllRegionsDialogOpen(true);
  };

  const confirmDeleteAllRegions = async () => {
    setIsDeleteAllRegionsDialogOpen(false);
    try {
      const batch = writeBatch(db);
      regions.forEach(r => {
        batch.delete(doc(db, 'regions', r.id));
      });
      await batch.commit();
      await logAction('DELETE_ALL', 'regions', 'all', { count: regions.length });
      toast.success('Đã xóa tất cả vùng/khu vực');
      setSelectedRegionIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'regions');
    }
  };

  const handleSetProjectsForRegion = async () => {
    if (!regionForProjects) return;
    
    try {
      const batch = writeBatch(db);
      // First, remove this region from all projects that currently have it (if we want to overwrite)
      // Or just add it to selected ones.
      // The user says "Set dự án theo vùng / khu vực, có thể set nhiều dự án cho 1 vùng, khu vực."
      // This usually means assigning a list of projects to this region.
      
      for (const projectId of selectedProjectIdsForRegion) {
        batch.update(doc(db, 'projects', projectId), { region: regionForProjects.name });
      }
      
      await batch.commit();
      await logAction('UPDATE_REGION_PROJECTS', 'projects', 'multiple', { region: regionForProjects.name, projectIds: selectedProjectIdsForRegion });
      toast.success(`Đã cập nhật vùng cho ${selectedProjectIdsForRegion.length} dự án`);
      setIsSetProjectsDialogOpen(false);
      setRegionForProjects(null);
      setSelectedProjectIdsForRegion([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'projects');
    }
  };

  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim() || isAddingType) return;
    
    const names = newTypeName.split('\n').map(n => n.trim()).filter(n => n !== '');
    if (names.length === 0) return;

    setIsAddingType(true);
    let successCount = 0;
    let duplicateCount = 0;
    const existingNames = new Set(types.map(t => t.name.toLowerCase()));

    try {
      for (const name of names) {
        if (existingNames.has(name.toLowerCase())) {
          duplicateCount++;
          continue;
        }

        const docRef = await addDoc(collection(db, 'types'), {
          name,
          createdAt: serverTimestamp(),
          createdBy: user?.uid
        });
        await logAction('CREATE', 'types', docRef.id, { name });
        successCount++;
        existingNames.add(name.toLowerCase());
      }
      
      setNewTypeName('');
      if (successCount > 0) {
        toast.success(`Đã thêm ${successCount} loại hình mới`);
      }
      if (duplicateCount > 0) {
        toast.warning(`${duplicateCount} loại hình đã tồn tại và bị bỏ qua`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'types');
    } finally {
      setIsAddingType(false);
    }
  };

  const handleUpdateType = async (id: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      await updateDoc(doc(db, 'types', id), { name: newName });
      await logAction('UPDATE', 'types', id, { name: newName });
      setEditingTypeId(null);
      toast.success('Đã cập nhật loại hình');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'types');
    }
  };

  const handleDeleteType = (id: string, name: string) => {
    setTypeToDelete({ id, name });
    setIsDeleteTypeDialogOpen(true);
  };

  const confirmDeleteType = async () => {
    if (!typeToDelete) return;
    try {
      await deleteDoc(doc(db, 'types', typeToDelete.id));
      await logAction('DELETE', 'types', typeToDelete.id, { name: typeToDelete.name });
      toast.success('Đã xóa loại hình');
      setIsDeleteTypeDialogOpen(false);
      setTypeToDelete(null);
      setSelectedTypeIds(prev => prev.filter(tid => tid !== typeToDelete.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'types');
    }
  };

  const handleBulkDeleteTypes = async () => {
    if (selectedTypeIds.length === 0 || isDeletingTypes) return;
    setIsBulkDeleteTypesDialogOpen(true);
  };

  const confirmBulkDeleteTypes = async () => {
    setIsDeletingTypes(true);
    setIsBulkDeleteTypesDialogOpen(false);
    try {
      const batch = writeBatch(db);
      selectedTypeIds.forEach(id => {
        batch.delete(doc(db, 'types', id));
      });
      await batch.commit();
      await logAction('DELETE_BULK', 'types', 'multiple', { count: selectedTypeIds.length, ids: selectedTypeIds });
      toast.success(`Đã xóa ${selectedTypeIds.length} loại hình`);
      setSelectedTypeIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'types');
    } finally {
      setIsDeletingTypes(false);
    }
  };

  const handleDeleteAllTypes = async () => {
    if (types.length === 0) return;
    setIsDeleteAllTypesDialogOpen(true);
  };

  const confirmDeleteAllTypes = async () => {
    setIsDeleteAllTypesDialogOpen(false);
    try {
      const batch = writeBatch(db);
      types.forEach(t => {
        batch.delete(doc(db, 'types', t.id));
      });
      await batch.commit();
      await logAction('DELETE_ALL', 'types', 'all', { count: types.length });
      toast.success('Đã xóa tất cả loại hình');
      setSelectedTypeIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'types');
    }
  };

  const handleSetProjectsForType = async () => {
    if (!typeForProjects) return;
    
    try {
      const batch = writeBatch(db);
      for (const projectId of selectedProjectIdsForType) {
        batch.update(doc(db, 'projects', projectId), { type: typeForProjects.name });
      }
      
      await batch.commit();
      await logAction('UPDATE_TYPE_PROJECTS', 'projects', 'multiple', { type: typeForProjects.name, projectIds: selectedProjectIdsForType });
      toast.success(`Đã cập nhật loại hình cho ${selectedProjectIdsForType.length} dự án`);
      setIsSetProjectsForTypeDialogOpen(false);
      setTypeForProjects(null);
      setSelectedProjectIdsForType([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'projects');
    }
  };

  const handleAddBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !budgetAmount || !selectedTeamName || !budgetMonth || !implementerName) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    setIsConfirmBudgetOpen(true);
  };

  const confirmAddBudget = async () => {
    const project = projects.find(p => p.id === selectedProjectId);
    try {
      const docRef = await addDoc(collection(db, 'budgets'), {
        projectId: selectedProjectId,
        projectName: project?.name || 'N/A',
        teamName: selectedTeamName,
        implementerName: implementerName,
        month: budgetMonth,
        amount: Number(budgetAmount),
        createdAt: serverTimestamp(),
        createdBy: user?.uid,
        userEmail: user?.email?.toLowerCase()
      });
      await logAction('CREATE', 'budgets', docRef.id, { projectName: project?.name || 'N/A', amount: budgetAmount, implementer: implementerName });
      setBudgetAmount('');
      // Keep implementerName and selectedTeamName from profile for next entry
      if (!userProfile?.fullName) setImplementerName('');
      setSelectedProjectId('');
      if (!userProfile?.teamName) setSelectedTeamName('');
      setIsConfirmBudgetOpen(false);
      toast.success('Đã đăng ký ngân sách');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'budgets');
    }
  };

  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = Number(fbAds) + Number(posting) + Number(zaloAds) + Number(googleAds) + Number(otherCost);
    if (!actualProjectId || totalAmount <= 0 || !costWeek || !selectedBudgetId) return;
    const project = projects.find(p => p.id === actualProjectId);
    const budget = budgets.find(b => b.id === selectedBudgetId);
    
    if (!budget) {
      toast.error('Không tìm thấy thông tin ngân sách tương ứng');
      return;
    }
    
    // Parse week string (e.g., "2024-W15")
    const [year, weekStr] = costWeek.split('-W');
    const weekNumber = Number(weekStr);

    try {
      const docRef = await addDoc(collection(db, 'costs'), {
        projectId: actualProjectId,
        projectName: project?.name || 'N/A',
        budgetId: selectedBudgetId,
        implementerName: budget.implementerName || 'N/A',
        teamName: budget.teamName || 'N/A',
        weekNumber,
        year: Number(year),
        amount: totalAmount,
        channels: {
          fbAds: Number(fbAds),
          posting: Number(posting),
          zaloAds: Number(zaloAds),
          googleAds: Number(googleAds),
          otherCost: Number(otherCost)
        },
        note: costNote,
        createdAt: serverTimestamp(),
        createdBy: user?.uid,
        userEmail: user?.email?.toLowerCase()
      });
      await logAction('CREATE', 'costs', docRef.id, { projectName: project?.name, amount: totalAmount, note: costNote, budgetId: selectedBudgetId });
      setFbAds('');
      setPosting('');
      setZaloAds('');
      setGoogleAds('');
      setOtherCost('');
      setCostNote('');
      setActualProjectId('');
      setSelectedBudgetId('');
      toast.success('Đã nhập chi phí thực tế');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'costs');
    }
  };

  const handleUpdateBudget = async (id: string) => {
    try {
      await updateDoc(doc(db, 'budgets', id), {
        amount: Number(editingBudgetAmount),
        month: editingBudgetMonth,
        teamName: editingBudgetTeam,
        projectId: editingBudgetProject,
        projectName: projectMap[editingBudgetProject] || 'N/A'
      });
      await logAction('UPDATE', 'budgets', id, { amount: editingBudgetAmount });
      setEditingBudgetId(null);
      toast.success('Đã cập nhật ngân sách');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'budgets');
    }
  };

  const handleDeleteBudget = (id: string, projectName: string) => {
    setBudgetToDelete({ id, name: projectName });
    setIsDeleteBudgetDialogOpen(true);
  };

  const confirmDeleteBudget = async () => {
    if (!budgetToDelete) return;
    try {
      await deleteDoc(doc(db, 'budgets', budgetToDelete.id));
      await logAction('DELETE', 'budgets', budgetToDelete.id, { projectName: budgetToDelete.name });
      toast.success('Đã xóa đăng ký ngân sách');
      setIsDeleteBudgetDialogOpen(false);
      setBudgetToDelete(null);
      setSelectedBudgetIds(prev => prev.filter(bid => bid !== budgetToDelete.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'budgets');
    }
  };

  const handleBulkDeleteBudgets = async () => {
    if (selectedBudgetIds.length === 0 || isDeletingBudgets) return;
    setIsBulkDeleteBudgetsDialogOpen(true);
  };

  const confirmBulkDeleteBudgets = async () => {
    setIsDeletingBudgets(true);
    setIsBulkDeleteBudgetsDialogOpen(false);
    try {
      const batch = writeBatch(db);
      selectedBudgetIds.forEach(id => {
        batch.delete(doc(db, 'budgets', id));
      });
      await batch.commit();
      await logAction('DELETE_BULK', 'budgets', 'multiple', { count: selectedBudgetIds.length });
      toast.success(`Đã xóa ${selectedBudgetIds.length} đăng ký ngân sách`);
      setSelectedBudgetIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'budgets');
    } finally {
      setIsDeletingBudgets(false);
    }
  };

  const handleDeleteAllBudgets = async () => {
    if (budgets.length === 0) return;
    setIsDeleteAllBudgetsDialogOpen(true);
  };

  const confirmDeleteAllBudgets = async () => {
    setIsDeleteAllBudgetsDialogOpen(false);
    try {
      const batch = writeBatch(db);
      budgets.forEach(b => {
        batch.delete(doc(db, 'budgets', b.id));
      });
      await batch.commit();
      await logAction('DELETE_ALL', 'budgets', 'all', { count: budgets.length });
      toast.success('Đã xóa tất cả đăng ký ngân sách');
      setSelectedBudgetIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'budgets');
    }
  };

  const handleDeleteCost = (id: string, projectName: string) => {
    setCostToDelete({ id, name: projectName });
    setIsDeleteCostDialogOpen(true);
  };

  const confirmDeleteCost = async () => {
    if (!costToDelete) return;
    try {
      await deleteDoc(doc(db, 'costs', costToDelete.id));
      await logAction('DELETE', 'costs', costToDelete.id, { projectName: costToDelete.name });
      toast.success('Đã xóa bản ghi chi phí');
      setIsDeleteCostDialogOpen(false);
      setCostToDelete(null);
      setSelectedCostIds(prev => prev.filter(cid => cid !== costToDelete.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'costs');
    }
  };

  const handleBulkDeleteCosts = async () => {
    if (selectedCostIds.length === 0 || isDeletingCosts) return;
    setIsBulkDeleteCostsDialogOpen(true);
  };

  const confirmBulkDeleteCosts = async () => {
    setIsDeletingCosts(true);
    setIsBulkDeleteCostsDialogOpen(false);
    try {
      const batch = writeBatch(db);
      selectedCostIds.forEach(id => {
        batch.delete(doc(db, 'costs', id));
      });
      await batch.commit();
      await logAction('DELETE_BULK', 'costs', 'multiple', { count: selectedCostIds.length });
      toast.success(`Đã xóa ${selectedCostIds.length} bản ghi chi phí`);
      setSelectedCostIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'costs');
    } finally {
      setIsDeletingCosts(false);
    }
  };

  const handleDeleteAllCosts = async () => {
    if (costs.length === 0) return;
    setIsDeleteAllCostsDialogOpen(true);
  };

  const confirmDeleteAllCosts = async () => {
    setIsDeleteAllCostsDialogOpen(false);
    try {
      const batch = writeBatch(db);
      costs.forEach(c => {
        batch.delete(doc(db, 'costs', c.id));
      });
      await batch.commit();
      await logAction('DELETE_ALL', 'costs', 'all', { count: costs.length });
      toast.success('Đã xóa tất cả bản ghi chi phí thực tế');
      setSelectedCostIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'costs');
    }
  };

  const handleUpdateCost = async (id: string) => {
    if (!editingCostAmount || isNaN(Number(editingCostAmount))) {
      toast.error('Vui lòng nhập số tiền hợp lệ');
      return;
    }
    try {
      await updateDoc(doc(db, 'costs', id), {
        amount: Number(editingCostAmount),
        note: editingCostNote
      });
      await logAction('UPDATE', 'costs', id, { amount: editingCostAmount, note: editingCostNote });
      toast.success('Đã cập nhật chi phí');
      setEditingCostId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'costs');
    }
  };

  // Reporting Logic
  const filteredBudgets = useMemo(() => {
    return budgets.filter(b => {
      const project = projects.find(p => p.id === b.projectId);
      
      // Role-based project access
      const hasProjectAccess = (isAdmin || isMod) || 
                               (isGDDA && userProfile?.assignedProjects?.includes(b.projectId)) ||
                               (isUser); // Users can see all projects for registration but maybe we should restrict here too?
                                         // User request says "GDDA : Có quyền xem thông tin báo cáo , thông tin ngân sách đăng ký theo dự án được chỉ định"
                                         // "User : Người dùng có quyền đăng ký ngân sách , cập nhập chi phí thực tế theo ngân sách đăng ký ."
                                         // So Users can see projects they are registering for.
      
      if (!hasProjectAccess) return false;

      const matchProject = reportProject === 'all' || b.projectId === reportProject;
      const userEmail = user?.email?.toLowerCase();
      const budgetEmail = b.userEmail?.toLowerCase() || b.createdByEmail?.toLowerCase();
      const isOwner = (budgetEmail && userEmail && budgetEmail === userEmail) || (b.createdBy === user?.uid);

      const matchTeam = (isAdmin || isMod || isGDDA)
        ? (reportTeam === 'all' || b.teamName === reportTeam)
        : isOwner;
      const matchMonth = b.month === reportMonth;
      const matchRegion = reportRegion === 'all' || (project?.region === reportRegion);
      const matchType = reportType === 'all' || (project?.type === reportType);
      
      return matchProject && matchTeam && matchMonth && matchRegion && matchType;
    }).map(b => {
      // If a specific week is selected, return 1/4 of the budget as an estimate
      if (reportWeek !== 'all') {
        return { ...b, amount: b.amount / 4 };
      }
      return b;
    });
  }, [budgets, reportProject, reportTeam, reportMonth, reportRegion, reportType, projects, isAdmin, isMod, isGDDA, isUser, userProfile, reportWeek]);

  const filteredCosts = useMemo(() => {
    return costs.filter(c => {
      const project = projects.find(p => p.id === c.projectId);
      
      // Role-based project access
      const hasProjectAccess = (isAdmin || isMod) || 
                               (isGDDA && userProfile?.assignedProjects?.includes(c.projectId)) ||
                               (isUser);
      
      if (!hasProjectAccess) return false;

      const matchProject = reportProject === 'all' || c.projectId === reportProject;
      const userEmail = user?.email?.toLowerCase();
      const costEmail = c.userEmail?.toLowerCase() || c.createdByEmail?.toLowerCase();
      const isOwner = (costEmail && userEmail && costEmail === userEmail) || (c.createdBy === user?.uid);

      const matchTeam = (isAdmin || isMod || isGDDA)
        ? (reportTeam === 'all' || c.teamName === reportTeam)
        : isOwner;
      // Map cost date to marketing month
      const costDate = c.createdAt?.toDate ? c.createdAt.toDate() : null;
      const mMonth = costDate ? getMarketingMonth(costDate) : null;
      const matchMonth = mMonth === reportMonth;
      const matchRegion = reportRegion === 'all' || (project?.region === reportRegion);
      const matchType = reportType === 'all' || (project?.type === reportType);
      const matchWeek = reportWeek === 'all' || c.weekNumber?.toString() === reportWeek;
      
      return matchProject && matchTeam && matchMonth && matchRegion && matchType && matchWeek;
    });
  }, [costs, reportProject, reportTeam, reportMonth, getMarketingMonth, reportRegion, reportType, projects, isAdmin, isMod, isGDDA, isUser, userProfile, reportWeek]);

  const uniqueTeams = useMemo(() => {
    return Array.from(new Set(teams.map(t => t.name)));
  }, [teams]);

  const uniqueRegions = useMemo(() => {
    return regions.map(r => r.name).sort();
  }, [regions]);

  const uniqueTypes = useMemo(() => {
    return types.map(t => t.name).sort();
  }, [types]);

  const chartData = useMemo(() => {
    return uniqueTeams.filter(t => reportTeam === 'all' || t === reportTeam).map(team => {
      const teamBudgets = budgets.filter(b => {
        const project = projects.find(p => p.id === b.projectId);
        const matchProject = reportProject === 'all' || b.projectId === reportProject;
        const matchMonth = b.month === reportMonth;
        const matchRegion = reportRegion === 'all' || (project?.region === reportRegion);
        const matchType = reportType === 'all' || (project?.type === reportType);
        return matchProject && b.teamName === team && matchMonth && matchRegion && matchType;
      });
      
      let teamTotalBudget = teamBudgets.reduce((acc, curr) => acc + curr.amount, 0);
      if (chartTimeType === 'week') teamTotalBudget = teamTotalBudget / 4;

      let teamTotalCost = costs.filter(c => {
        const project = projects.find(p => p.id === c.projectId);
        const matchProject = reportProject === 'all' || c.projectId === reportProject;
        const costDate = c.createdAt?.toDate ? c.createdAt.toDate() : null;
        const mMonth = costDate ? getMarketingMonth(costDate) : null;
        const matchMonth = mMonth === reportMonth;
        const matchRegion = reportRegion === 'all' || (project?.region === reportRegion);
        const matchType = reportType === 'all' || (project?.type === reportType);
        const matchWeek = chartTimeType === 'month' || reportWeek === 'all' || c.weekNumber?.toString() === reportWeek;
        
        return matchProject && c.teamName === team && matchMonth && matchRegion && matchType && matchWeek;
      }).reduce((acc, curr) => acc + curr.amount, 0);

      if (chartTimeType === 'week' && reportWeek === 'all') {
        teamTotalCost = teamTotalCost / 4;
      }
      
      return {
        name: team,
        budget: teamTotalBudget,
        actual: teamTotalCost
      };
    }).filter(d => d.budget > 0 || d.actual > 0);
  }, [uniqueTeams, budgets, costs, reportTeam, reportProject, reportMonth, reportRegion, reportType, projects, chartTimeType, reportWeek, getMarketingMonth]);

  const regionChartData = useMemo(() => {
    return uniqueRegions.map(region => {
      const regionBudgets = budgets.filter(b => {
        const project = projects.find(p => p.id === b.projectId);
        const matchProject = reportProject === 'all' || b.projectId === reportProject;
        const matchTeam = reportTeam === 'all' || b.teamName === reportTeam;
        const matchMonth = b.month === reportMonth;
        return matchProject && matchTeam && project?.region === region && matchMonth;
      });
      
      let totalBudget = regionBudgets.reduce((acc, curr) => acc + curr.amount, 0);
      if (chartTimeType === 'week') totalBudget = totalBudget / 4;

      let totalCost = costs.filter(c => {
        const project = projects.find(p => p.id === c.projectId);
        const matchProject = reportProject === 'all' || c.projectId === reportProject;
        const matchTeam = reportTeam === 'all' || c.teamName === reportTeam;
        const costDate = c.createdAt?.toDate ? c.createdAt.toDate() : null;
        const mMonth = costDate ? getMarketingMonth(costDate) : null;
        const matchMonth = mMonth === reportMonth;
        const matchWeek = chartTimeType === 'month' || reportWeek === 'all' || c.weekNumber?.toString() === reportWeek;
        
        return matchProject && matchTeam && project?.region === region && matchMonth && matchWeek;
      }).reduce((acc, curr) => acc + curr.amount, 0);

      if (chartTimeType === 'week' && reportWeek === 'all') {
        totalCost = totalCost / 4;
      }

      return {
        name: region,
        budget: totalBudget,
        actual: totalCost
      };
    }).filter(d => d.budget > 0 || d.actual > 0);
  }, [uniqueRegions, budgets, costs, projects, reportProject, reportTeam, reportMonth, chartTimeType, reportWeek, getMarketingMonth]);

  const projectChartData = useMemo(() => {
    const projectIds = Array.from(new Set([
      ...budgets.filter(b => b.month === reportMonth).map(b => b.projectId),
      ...costs.filter(c => {
        const costDate = c.createdAt?.toDate ? c.createdAt.toDate() : null;
        return costDate && getMarketingMonth(costDate) === reportMonth;
      }).map(c => c.projectId)
    ]));

    return projectIds.filter(id => reportProject === 'all' || id === reportProject).map(id => {
      const projectName = projectMap[id] || 'N/A';
      const projectBudgets = budgets.filter(b => b.projectId === id && b.month === reportMonth);
      
      let totalBudget = projectBudgets.reduce((acc, curr) => acc + curr.amount, 0);
      if (chartTimeType === 'week') totalBudget = totalBudget / 4;

      let totalCost = costs.filter(c => {
        const costDate = c.createdAt?.toDate ? c.createdAt.toDate() : null;
        const mMonth = costDate ? getMarketingMonth(costDate) : null;
        const matchMonth = mMonth === reportMonth;
        const matchWeek = chartTimeType === 'month' || reportWeek === 'all' || c.weekNumber?.toString() === reportWeek;
        return c.projectId === id && matchMonth && matchWeek;
      }).reduce((acc, curr) => acc + curr.amount, 0);

      if (chartTimeType === 'week' && reportWeek === 'all') {
        totalCost = totalCost / 4;
      }

      return {
        name: projectName,
        budget: totalBudget,
        actual: totalCost
      };
    }).filter(d => d.budget > 0 || d.actual > 0)
      .sort((a, b) => b.budget - a.budget);
  }, [budgets, costs, projectMap, reportMonth, reportProject, chartTimeType, reportWeek, getMarketingMonth]);

  const getWeekRange = (weekStr: string) => {
    if (!weekStr) return '';
    try {
      const [year, week] = weekStr.split('-W').map(Number);
      const d = new Date(year, 0, 1);
      const dayNum = d.getDay() || 7;
      if (dayNum <= 4) d.setDate(d.getDate() - d.getDay() + 1);
      else d.setDate(d.getDate() + 8 - d.getDay());
      const monday = new Date(d.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
      const sunday = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);
      return `${safeFormat(monday, 'dd/MM')} - ${safeFormat(sunday, 'dd/MM')}`;
    } catch (e) {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-pulse text-slate-400">Đang tải...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
        <Card className="w-full max-w-md border-none shadow-xl bg-white/80 backdrop-blur">
          <CardHeader className="text-center space-y-4 pb-2">
            <div className="mx-auto flex flex-col items-center gap-2">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-xl border border-slate-100 overflow-hidden">
                <img 
                  src="https://picsum.photos/seed/mayhomes/200/200" 
                  alt="MAYHOMES Logo" 
                  className="w-full h-full object-contain p-2"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="space-y-1">
                <h2 className="text-4xl font-black tracking-tighter text-slate-900">
                  <span className="text-orange-500">MAY</span>
                  <span className="text-blue-600">HOMES</span>
                </h2>
                <p className="text-[10px] font-bold text-blue-800 tracking-[0.2em] uppercase">Khơi nguồn cuộc sống tinh hoa</p>
              </div>
            </div>
            <div className="pt-4 space-y-2">
              <CardTitle className="text-xl font-bold tracking-tight text-slate-800">Marketing Cost Control</CardTitle>
              <CardDescription className="text-slate-500">Hệ thống quản lý chi phí marketing chuyên nghiệp</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <Button onClick={login} className="w-full h-12 text-lg font-medium bg-slate-900 hover:bg-slate-800 transition-all" size="lg">
              <LogIn className="mr-2 h-5 w-5" /> Đăng nhập bằng Google
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 w-full bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-100 overflow-hidden">
              <img 
                src="https://picsum.photos/seed/mayhomes/100/100" 
                alt="MAYHOMES" 
                className="w-full h-full object-contain p-1"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tighter text-slate-900 leading-none">
                  <span className="text-orange-500">MAY</span>
                  <span className="text-blue-600">HOMES</span>
                </h1>
              </div>
              <div className="flex gap-1 mt-1">
                {isSuperAdmin && <Badge variant="outline" className="text-[10px] py-0 h-4 border-purple-200 text-purple-600 bg-purple-50">SUPER ADMIN</Badge>}
                {(userRole === 'admin') && <Badge variant="outline" className="text-[10px] py-0 h-4 border-blue-200 text-blue-600 bg-blue-50">ADMIN</Badge>}
                {isMod && <Badge variant="outline" className="text-[10px] py-0 h-4 border-slate-200 text-slate-600 bg-slate-50">MODERATOR</Badge>}
                {isGDDA && <Badge variant="outline" className="text-[10px] py-0 h-4 border-emerald-200 text-emerald-600 bg-emerald-50">GDDA</Badge>}
                {isUser && <Badge variant="outline" className="text-[10px] py-0 h-4 border-orange-200 text-orange-600 bg-orange-50">USER</Badge>}
              </div>
            </div>
          </div>

          {/* Main Navigation Menu */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl border border-slate-200/50">
            {isAdmin && (
              <Button 
                variant={activeTab === 'admin' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setActiveTab('admin')}
                className={`rounded-lg px-4 h-9 transition-all ${activeTab === 'admin' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <ShieldCheck className="w-4 h-4 mr-2" /> Quản trị
              </Button>
            )}
            <Button 
              variant={activeTab === 'register' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setActiveTab('register')}
              className={`rounded-lg px-4 h-9 transition-all ${activeTab === 'register' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Wallet className="w-4 h-4 mr-2" /> Đăng ký
            </Button>
            <Button 
              variant={activeTab === 'actual' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setActiveTab('actual')}
              className={`rounded-lg px-4 h-9 transition-all ${activeTab === 'actual' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <TrendingUp className="w-4 h-4 mr-2" /> Thực chi
            </Button>
            <Button 
              variant={activeTab === 'history' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setActiveTab('history')}
              className={`rounded-lg px-4 h-9 transition-all ${activeTab === 'history' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <History className="w-4 h-4 mr-2" /> Lịch sử
            </Button>
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-slate-900">{user.displayName}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} className="text-slate-500 hover:text-red-600">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Tổng dự án
              </CardDescription>
              <CardTitle className="text-3xl font-bold">{projects.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Wallet className="w-4 h-4" /> Ngân sách tháng này (21-{safeFormat(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 21), 'MM')} đến 20-{safeFormat(new Date(), 'MM')})
              </CardDescription>
              <CardTitle className="text-3xl font-bold">
                {budgets
                  .filter(b => b.month === getMarketingMonth(new Date()))
                  .reduce((acc, curr) => acc + curr.amount, 0)
                  .toLocaleString()} đ
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Thực tế đã chi (Tuần này)
              </CardDescription>
              <CardTitle className="text-3xl font-bold">
                {costs
                  .filter(c => c.weekNumber === getWeek(new Date()) && c.year === new Date().getFullYear())
                  .reduce((acc, curr) => acc + curr.amount, 0)
                  .toLocaleString()} đ
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1 rounded-xl h-auto flex-wrap sm:flex-nowrap lg:hidden">
            {(isAdmin || isMod || isGDDA) && (
              <TabsTrigger value="admin" className="rounded-lg py-2 px-4 data-[state=active]:bg-slate-100 data-[state=active]:shadow-none">
                <ShieldCheck className="w-4 h-4 mr-2" /> Quản trị
              </TabsTrigger>
            )}
            <TabsTrigger value="register" className="rounded-lg py-2 px-4 data-[state=active]:bg-slate-100 data-[state=active]:shadow-none">
              <Wallet className="w-4 h-4 mr-2" /> Đăng ký ngân sách
            </TabsTrigger>
            <TabsTrigger value="actual" className="rounded-lg py-2 px-4 data-[state=active]:bg-slate-100 data-[state=active]:shadow-none">
              <TrendingUp className="w-4 h-4 mr-2" /> Chi phí thực tế
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg py-2 px-4 data-[state=active]:bg-slate-100 data-[state=active]:shadow-none">
              <History className="w-4 h-4 mr-2" /> Lịch sử
            </TabsTrigger>
          </TabsList>

          {/* Admin Tab */}
          {(isAdmin || isMod || isGDDA) && (
            <TabsContent value="admin" className="space-y-6">
              <Tabs defaultValue={isGDDA ? "reports" : "projects"} className="space-y-6">
                <TabsList className="bg-slate-100/50 p-1 rounded-xl h-auto w-full justify-start border border-slate-200">
                  {(isAdmin || isMod) && (
                    <>
                      <TabsTrigger value="projects" className="rounded-lg py-2 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Building2 className="w-4 h-4 mr-2" /> Quản lý Dự án
                      </TabsTrigger>
                      <TabsTrigger value="regions" className="rounded-lg py-2 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Building2 className="w-4 h-4 mr-2" /> Quản lý Vùng / Khu vực
                      </TabsTrigger>
                      <TabsTrigger value="types" className="rounded-lg py-2 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Building2 className="w-4 h-4 mr-2" /> Quản lý Loại hình
                      </TabsTrigger>
                      <TabsTrigger value="teams" className="rounded-lg py-2 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Users className="w-4 h-4 mr-2" /> Quản lý Team
                      </TabsTrigger>
                      <TabsTrigger value="budgets" className="rounded-lg py-2 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Wallet className="w-4 h-4 mr-2" /> Quản lý Ngân sách
                      </TabsTrigger>
                      <TabsTrigger value="costs" className="rounded-lg py-2 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <TrendingUp className="w-4 h-4 mr-2" /> Quản lý Thực chi
                      </TabsTrigger>
                    </>
                  )}
                  <TabsTrigger value="reports" className="rounded-lg py-2 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <BarChart3 className="w-4 h-4 mr-2" /> Báo cáo & Phân tích
                  </TabsTrigger>
                  {isAdmin && (
                    <TabsTrigger value="users" className="rounded-lg py-2 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      <UserCircle className="w-4 h-4 mr-2" /> Quản lý Người dùng
                    </TabsTrigger>
                  )}
                  {(isAdmin || isMod) && (
                    <TabsTrigger value="audit" className="rounded-lg py-2 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      <History className="w-4 h-4 mr-2" /> Nhật ký hệ thống
                    </TabsTrigger>
                  )}
                  {isAdmin && (
                    <TabsTrigger value="backup" className="rounded-lg py-2 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      <History className="w-4 h-4 mr-2" /> Sao lưu
                    </TabsTrigger>
                  )}
                </TabsList>

                {/* Project Management Tab */}
                <TabsContent value="projects" className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    {/* Project Controls */}
                    <Card className="border-none shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex flex-wrap items-end gap-4">
                          <div className="flex-1 min-w-[250px] space-y-1.5">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tìm kiếm dự án</Label>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <Input 
                                placeholder="Nhập tên dự án..." 
                                className="pl-10 bg-slate-50 border-none shadow-none"
                                value={projectSearch}
                                onChange={e => setProjectSearch(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="w-[180px] space-y-1.5">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Khu vực</Label>
                            <Select value={adminProjectRegionFilter} onValueChange={setAdminProjectRegionFilter}>
                              <SelectTrigger className="bg-slate-50 border-none shadow-none">
                                <SelectValue placeholder="Tất cả khu vực" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Tất cả khu vực</SelectItem>
                                {uniqueRegions.map(r => (
                                  <SelectItem key={r} value={r}>{r}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-[180px] space-y-1.5">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Loại hình</Label>
                            <Select value={adminProjectTypeFilter} onValueChange={setAdminProjectTypeFilter}>
                              <SelectTrigger className="bg-slate-50 border-none shadow-none">
                                <SelectValue placeholder="Tất cả loại hình" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Tất cả loại hình</SelectItem>
                                <SelectItem value="Cao tầng">Cao tầng</SelectItem>
                                <SelectItem value="Thấp tầng">Thấp tầng</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {isAdmin && (
                            <Dialog>
                              <DialogTrigger render={
                                <Button className="bg-blue-600 hover:bg-blue-700">
                                  <Plus className="w-4 h-4 mr-2" /> Thêm dự án
                                </Button>
                              } />
                            <DialogContent className="sm:max-w-[500px]">
                              <DialogHeader>
                                <DialogTitle>Thêm dự án mới</DialogTitle>
                                <DialogDescription>Nhập thông tin dự án bất động sản. Bạn có thể nhập nhiều dự án cùng lúc bằng cách xuống dòng.</DialogDescription>
                              </DialogHeader>
                              <form onSubmit={handleAddProject} className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>Tên dự án (Mỗi dòng 1 dự án)</Label>
                                  <textarea 
                                    className="flex min-h-[120px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="VD: Vinhomes Grand Park&#10;Vinhomes Central Park" 
                                    value={newProjectName} 
                                    onChange={e => setNewProjectName(e.target.value)} 
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label>Vùng / Khu vực</Label>
                                    <Select value={newProjectRegion} onValueChange={setNewProjectRegion}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Chọn vùng..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {regions.map(r => (
                                          <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Loại hình</Label>
                                    <Select value={newProjectType} onValueChange={setNewProjectType}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Chọn loại hình..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {types.map(t => (
                                          <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                                    Xác nhận thêm dự án
                                  </Button>
                                </DialogFooter>
                              </form>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                      </CardContent>
                    </Card>

                    {/* Project Table */}
                    <Card className="border-none shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle>Danh sách dự án</CardTitle>
                          <CardDescription>Quản lý và phân loại dự án ({sortedProjects.length} kết quả)</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {isAdmin && (
                            <div className="flex gap-2 mr-4">
                              <Dialog open={isBulkUpdateRegionDialogOpen} onOpenChange={setIsBulkUpdateRegionDialogOpen}>
                                <DialogTrigger render={
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 text-[10px] text-blue-600 border-blue-200 hover:bg-blue-50"
                                    disabled={selectedProjectIds.length === 0}
                                  >
                                    <Building2 className="w-3 h-3 mr-1" /> Sửa Vùng ({selectedProjectIds.length})
                                  </Button>
                                } />
                                <DialogContent className="sm:max-w-[400px]">
                                  <DialogHeader>
                                    <DialogTitle>Cập nhật Vùng / Khu vực</DialogTitle>
                                    <DialogDescription>Chọn vùng / khu vực mới cho {selectedProjectIds.length} dự án đã chọn.</DialogDescription>
                                  </DialogHeader>
                                  <div className="py-4 space-y-4">
                                    <div className="space-y-2">
                                      <Label>Vùng / Khu vực</Label>
                                      <Select value={selectedRegionForBulk} onValueChange={setSelectedRegionForBulk}>
                                        <SelectTrigger><SelectValue placeholder="Chọn vùng..." /></SelectTrigger>
                                        <SelectContent>
                                          {regions.map(r => (
                                            <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button onClick={handleBulkUpdateProjectRegion} className="w-full bg-blue-600 hover:bg-blue-700">
                                      Cập nhật cho {selectedProjectIds.length} dự án
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>

                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-[10px] text-red-600 border-red-200 hover:bg-red-50"
                                onClick={handleBulkDeleteProjects}
                                disabled={selectedProjectIds.length === 0}
                              >
                                <Trash2 className="w-3 h-3 mr-1" /> Xóa đã chọn ({selectedProjectIds.length})
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                className="h-8 text-[10px]"
                                onClick={handleDeleteAllProjects}
                                disabled={projects.length === 0}
                              >
                                <AlertTriangle className="w-3 h-3 mr-1" /> Xóa tất cả
                              </Button>
                            </div>
                          )}
                          <Badge variant="secondary">{projects.length} tổng số</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-xl border border-slate-100 overflow-hidden">
                          <Table>
                            <TableHeader className="bg-slate-50">
                              <TableRow>
                                {isAdmin && (
                                  <TableHead className="w-[40px]">
                                    <input 
                                      type="checkbox" 
                                      className="rounded border-slate-300"
                                      checked={selectedProjectIds.length === sortedProjects.length && sortedProjects.length > 0}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedProjectIds(sortedProjects.map(p => p.id));
                                        } else {
                                          setSelectedProjectIds([]);
                                        }
                                      }}
                                    />
                                  </TableHead>
                                )}
                                <TableHead className="cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setProjectSort({ key: 'name', direction: projectSort.direction === 'asc' ? 'desc' : 'asc' })}>
                                  <div className="flex items-center gap-2">Tên dự án <ArrowUpDown className="w-3 h-3" /></div>
                                </TableHead>
                                <TableHead className="cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setProjectSort({ key: 'region', direction: projectSort.direction === 'asc' ? 'desc' : 'asc' })}>
                                  <div className="flex items-center gap-2">Vùng / Khu vực <ArrowUpDown className="w-3 h-3" /></div>
                                </TableHead>
                                <TableHead className="cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setProjectSort({ key: 'type', direction: projectSort.direction === 'asc' ? 'desc' : 'asc' })}>
                                  <div className="flex items-center gap-2">Loại hình <ArrowUpDown className="w-3 h-3" /></div>
                                </TableHead>
                                <TableHead>Ngày tạo</TableHead>
                                <TableHead className="text-right">Thao tác</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sortedProjects.map(p => (
                                <TableRow key={p.id} className={selectedProjectIds.includes(p.id) ? "bg-blue-50/30" : ""}>
                                  {isAdmin && (
                                    <TableCell>
                                      <input 
                                        type="checkbox" 
                                        className="rounded border-slate-300"
                                        checked={selectedProjectIds.includes(p.id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedProjectIds(prev => [...prev, p.id]);
                                          } else {
                                            setSelectedProjectIds(prev => prev.filter(id => id !== p.id));
                                          }
                                        }}
                                      />
                                    </TableCell>
                                  )}
                                  <TableCell className="font-medium">
                                    {editingProjectId === p.id ? (
                                      <Input value={editingProjectName} onChange={e => setEditingProjectName(e.target.value)} className="h-8" />
                                    ) : p.name}
                                  </TableCell>
                                  <TableCell>
                                    {editingProjectId === p.id ? (
                                      <Select value={editingProjectRegion} onValueChange={setEditingProjectRegion}>
                                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          {regions.map(r => (
                                            <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <Badge variant="outline" className="font-normal border-slate-200">{p.region || 'Chưa xác định'}</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {editingProjectId === p.id ? (
                                      <Select value={editingProjectType} onValueChange={setEditingProjectType}>
                                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          {types.map(t => (
                                            <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.type === 'Cao tầng' ? 'bg-purple-50 text-purple-600' : 'bg-orange-50 text-orange-600'}`}>
                                        {p.type || 'Thấp tầng'}
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-xs text-slate-500">
                                    {safeFormat(p.createdAt?.toDate ? p.createdAt.toDate() : new Date(), 'dd/MM/yyyy')}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {isAdmin && (
                                      <div className="flex justify-end gap-1">
                                        {editingProjectId === p.id ? (
                                          <>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleUpdateProject(p.id, editingProjectName, editingProjectRegion, editingProjectType)}>
                                              <Check className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400" onClick={() => setEditingProjectId(null)}>
                                              <X className="h-4 w-4" />
                                            </Button>
                                          </>
                                        ) : (
                                          <>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => {
                                              setEditingProjectId(p.id);
                                              setEditingProjectName(p.name);
                                              setEditingProjectRegion(p.region || '');
                                              setEditingProjectType(p.type || 'Thấp tầng');
                                            }}>
                                              <Edit2 className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleDeleteProject(p.id, p.name)}>
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                              {sortedProjects.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                                    Không tìm thấy dự án nào phù hợp
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Region Management Tab */}
                <TabsContent value="regions" className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    {/* Region Controls */}
                    <Card className="border-none shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex flex-wrap items-end gap-4">
                          <div className="flex-1 min-w-[250px] space-y-1.5">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tìm kiếm Vùng / Khu vực</Label>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <Input 
                                placeholder="Nhập tên vùng..." 
                                className="pl-10 bg-slate-50 border-none shadow-none"
                                value={regionSearch}
                                onChange={e => setRegionSearch(e.target.value)}
                              />
                            </div>
                          </div>
                          {isAdmin && (
                            <Dialog>
                              <DialogTrigger render={
                                <Button className="bg-blue-600 hover:bg-blue-700">
                                  <Plus className="w-4 h-4 mr-2" /> Thêm Vùng / Khu vực
                                </Button>
                              } />
                              <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                  <DialogTitle>Thêm Vùng / Khu vực mới</DialogTitle>
                                  <DialogDescription>Nhập danh sách các vùng hoặc khu vực. Mỗi dòng tương ứng 1 vùng.</DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleAddRegion} className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label>Tên Vùng / Khu vực (Mỗi dòng 1 vùng)</Label>
                                    <textarea 
                                      className="flex min-h-[120px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                      placeholder="VD: Quận 9&#10;Thủ Đức" 
                                      value={newRegionName} 
                                      onChange={e => setNewRegionName(e.target.value)} 
                                    />
                                  </div>
                                  <DialogFooter>
                                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isAddingRegion}>
                                      {isAddingRegion ? 'Đang xử lý...' : 'Xác nhận thêm Vùng / Khu vực'}
                                    </Button>
                                  </DialogFooter>
                                </form>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Region Table */}
                    <Card className="border-none shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle>Danh sách Vùng / Khu vực</CardTitle>
                          <CardDescription>Quản lý các vùng và khu vực ({regions.length} kết quả)</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {isAdmin && (
                            <div className="flex gap-2 mr-4">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-[10px] text-red-600 border-red-200 hover:bg-red-50"
                                onClick={handleBulkDeleteRegions}
                                disabled={selectedRegionIds.length === 0 || isDeletingRegions}
                              >
                                <Trash2 className="w-3 h-3 mr-1" /> {isDeletingRegions ? 'Đang xóa...' : `Xóa đã chọn (${selectedRegionIds.length})`}
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                className="h-8 text-[10px]"
                                onClick={handleDeleteAllRegions}
                                disabled={regions.length === 0}
                              >
                                <AlertTriangle className="w-3 h-3 mr-1" /> Xóa tất cả
                              </Button>
                            </div>
                          )}
                          <Badge variant="secondary">{regions.length} tổng số</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-xl border border-slate-100 overflow-hidden">
                          <Table>
                            <TableHeader className="bg-slate-50">
                              <TableRow>
                                {isAdmin && (
                                  <TableHead className="w-[40px]">
                                    <input 
                                      type="checkbox" 
                                      className="rounded border-slate-300"
                                      checked={selectedRegionIds.length === regions.length && regions.length > 0}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedRegionIds(regions.map(r => r.id));
                                        } else {
                                          setSelectedRegionIds([]);
                                        }
                                      }}
                                    />
                                  </TableHead>
                                )}
                                <TableHead className="cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setRegionSort({ key: 'name', direction: regionSort.direction === 'asc' ? 'desc' : 'asc' })}>
                                  <div className="flex items-center gap-2">Tên Vùng / Khu vực <ArrowUpDown className="w-3 h-3" /></div>
                                </TableHead>
                                <TableHead>Số lượng dự án</TableHead>
                                <TableHead>Ngày tạo</TableHead>
                                <TableHead className="text-right">Thao tác</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {regions
                                .filter(r => r.name.toLowerCase().includes(regionSearch.toLowerCase()))
                                .sort((a, b) => {
                                  const factor = regionSort.direction === 'asc' ? 1 : -1;
                                  return a.name.localeCompare(b.name) * factor;
                                })
                                .map(r => {
                                  const regionProjects = projects.filter(p => p.region === r.name);
                                  return (
                                    <TableRow key={r.id} className={selectedRegionIds.includes(r.id) ? "bg-blue-50/30" : ""}>
                                      {isAdmin && (
                                        <TableCell>
                                          <input 
                                            type="checkbox" 
                                            className="rounded border-slate-300"
                                            checked={selectedRegionIds.includes(r.id)}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setSelectedRegionIds(prev => [...prev, r.id]);
                                              } else {
                                                setSelectedRegionIds(prev => prev.filter(id => id !== r.id));
                                              }
                                            }}
                                          />
                                        </TableCell>
                                      )}
                                      <TableCell className="font-medium">
                                        {editingRegionId === r.id ? (
                                          <Input value={editingRegionName} onChange={e => setEditingRegionName(e.target.value)} className="h-8" />
                                        ) : r.name}
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="secondary" className="font-normal">{regionProjects.length} dự án</Badge>
                                      </TableCell>
                                      <TableCell className="text-xs text-slate-500">
                                        {safeFormat(r.createdAt?.toDate ? r.createdAt.toDate() : new Date(), 'dd/MM/yyyy')}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {isAdmin && (
                                          <div className="flex justify-end gap-1">
                                            {editingRegionId === r.id ? (
                                              <>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleUpdateRegion(r.id, editingRegionName)}>
                                                  <Check className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400" onClick={() => setEditingRegionId(null)}>
                                                  <X className="h-4 w-4" />
                                                </Button>
                                              </>
                                            ) : (
                                              <>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => {
                                                  setRegionForProjects(r);
                                                  setSelectedProjectIdsForRegion(regionProjects.map(p => p.id));
                                                  setIsSetProjectsDialogOpen(true);
                                                }} title="Gán dự án">
                                                  <Plus className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => {
                                                  setEditingRegionId(r.id);
                                                  setEditingRegionName(r.name);
                                                }}>
                                                  <Edit2 className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleDeleteRegion(r.id, r.name)}>
                                                  <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                              </>
                                            )}
                                          </div>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              {regions.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                                    Chưa có vùng / khu vực nào
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Type Management Tab */}
                <TabsContent value="types" className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    {/* Type Controls */}
                    <Card className="border-none shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex flex-wrap items-end gap-4">
                          <div className="flex-1 min-w-[250px] space-y-1.5">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tìm kiếm Loại hình</Label>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <Input 
                                placeholder="Nhập tên loại hình..." 
                                className="pl-10 bg-slate-50 border-none shadow-none"
                                value={typeSearch}
                                onChange={e => setTypeSearch(e.target.value)}
                              />
                            </div>
                          </div>
                          {isAdmin && (
                            <Dialog>
                              <DialogTrigger render={
                                <Button className="bg-blue-600 hover:bg-blue-700">
                                  <Plus className="w-4 h-4 mr-2" /> Thêm Loại hình
                                </Button>
                              } />
                            <DialogContent className="sm:max-w-[500px]">
                              <DialogHeader>
                                <DialogTitle>Thêm Loại hình mới</DialogTitle>
                                <DialogDescription>Nhập danh sách các loại hình dự án. Mỗi dòng tương ứng 1 loại hình.</DialogDescription>
                              </DialogHeader>
                              <form onSubmit={handleAddType} className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>Tên Loại hình (Mỗi dòng 1 loại hình)</Label>
                                  <textarea 
                                    className="flex min-h-[120px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="VD: Thấp tầng&#10;Cao tầng&#10;TMDV" 
                                    value={newTypeName} 
                                    onChange={e => setNewTypeName(e.target.value)} 
                                  />
                                </div>
                                <DialogFooter>
                                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                                    Xác nhận thêm Loại hình
                                  </Button>
                                </DialogFooter>
                              </form>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                      </CardContent>
                    </Card>

                    {/* Type Table */}
                    <Card className="border-none shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle>Danh sách Loại hình</CardTitle>
                          <CardDescription>Quản lý các loại hình dự án ({types.length} kết quả)</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {isAdmin && (
                            <div className="flex gap-2 mr-4">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-[10px] text-red-600 border-red-200 hover:bg-red-50"
                                onClick={handleBulkDeleteTypes}
                                disabled={selectedTypeIds.length === 0}
                              >
                                <Trash2 className="w-3 h-3 mr-1" /> Xóa đã chọn ({selectedTypeIds.length})
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                className="h-8 text-[10px]"
                                onClick={handleDeleteAllTypes}
                                disabled={types.length === 0}
                              >
                                <AlertTriangle className="w-3 h-3 mr-1" /> Xóa tất cả
                              </Button>
                            </div>
                          )}
                          <Badge variant="secondary">{types.length} tổng số</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-xl border border-slate-100 overflow-hidden">
                          <Table>
                            <TableHeader className="bg-slate-50">
                              <TableRow>
                                {isAdmin && (
                                  <TableHead className="w-[40px]">
                                    <input 
                                      type="checkbox" 
                                      className="rounded border-slate-300"
                                      checked={selectedTypeIds.length === types.length && types.length > 0}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedTypeIds(types.map(t => t.id));
                                        } else {
                                          setSelectedTypeIds([]);
                                        }
                                      }}
                                    />
                                  </TableHead>
                                )}
                                <TableHead className="cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setTypeSort({ key: 'name', direction: typeSort.direction === 'asc' ? 'desc' : 'asc' })}>
                                  <div className="flex items-center gap-2">Tên Loại hình <ArrowUpDown className="w-3 h-3" /></div>
                                </TableHead>
                                <TableHead>Số lượng dự án</TableHead>
                                <TableHead>Ngày tạo</TableHead>
                                <TableHead className="text-right">Thao tác</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {types
                                .filter(t => t.name.toLowerCase().includes(typeSearch.toLowerCase()))
                                .sort((a, b) => {
                                  const factor = typeSort.direction === 'asc' ? 1 : -1;
                                  return a.name.localeCompare(b.name) * factor;
                                })
                                .map(t => {
                                  const typeProjects = projects.filter(p => p.type === t.name);
                                  return (
                                    <TableRow key={t.id} className={selectedTypeIds.includes(t.id) ? "bg-blue-50/30" : ""}>
                                      {isAdmin && (
                                        <TableCell>
                                          <input 
                                            type="checkbox" 
                                            className="rounded border-slate-300"
                                            checked={selectedTypeIds.includes(t.id)}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setSelectedTypeIds(prev => [...prev, t.id]);
                                              } else {
                                                setSelectedTypeIds(prev => prev.filter(id => id !== t.id));
                                              }
                                            }}
                                          />
                                        </TableCell>
                                      )}
                                      <TableCell className="font-medium">
                                        {editingTypeId === t.id ? (
                                          <Input value={editingTypeName} onChange={e => setEditingTypeName(e.target.value)} className="h-8" />
                                        ) : t.name}
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="secondary" className="font-normal">{typeProjects.length} dự án</Badge>
                                      </TableCell>
                                      <TableCell className="text-xs text-slate-500">
                                        {safeFormat(t.createdAt?.toDate ? t.createdAt.toDate() : new Date(), 'dd/MM/yyyy')}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {isAdmin && (
                                          <div className="flex justify-end gap-1">
                                            {editingTypeId === t.id ? (
                                              <>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleUpdateType(t.id, editingTypeName)}>
                                                  <Check className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400" onClick={() => setEditingTypeId(null)}>
                                                  <X className="h-4 w-4" />
                                                </Button>
                                              </>
                                            ) : (
                                              <>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => {
                                                  setTypeForProjects(t);
                                                  setSelectedProjectIdsForType(typeProjects.map(p => p.id));
                                                  setIsSetProjectsForTypeDialogOpen(true);
                                                }} title="Gán dự án">
                                                  <Plus className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => {
                                                  setEditingTypeId(t.id);
                                                  setEditingTypeName(t.name);
                                                }}>
                                                  <Edit2 className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleDeleteType(t.id, t.name)}>
                                                  <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                              </>
                                            )}
                                          </div>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              {types.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                                    Chưa có loại hình nào
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Team Management Tab */}
                <TabsContent value="teams" className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    {/* Team Controls */}
                    <Card className="border-none shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex flex-wrap items-end gap-4">
                          <div className="flex-1 min-w-[250px] space-y-1.5">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tìm kiếm Team</Label>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <Input 
                                placeholder="Nhập tên team..." 
                                className="pl-10 bg-slate-50 border-none shadow-none"
                                value={teamSearch}
                                onChange={e => setTeamSearch(e.target.value)}
                              />
                            </div>
                          </div>
                          {isAdmin && (
                            <Dialog>
                              <DialogTrigger render={
                                <Button className="bg-blue-600 hover:bg-blue-700">
                                  <Plus className="w-4 h-4 mr-2" /> Thêm Team
                                </Button>
                              } />
                              <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                  <DialogTitle>Thêm Team mới</DialogTitle>
                                  <DialogDescription>Nhập danh sách các đội marketing. Mỗi dòng tương ứng 1 team.</DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleAddTeam} className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label>Tên Team (Mỗi dòng 1 team)</Label>
                                    <textarea 
                                      className="flex min-h-[120px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                      placeholder="VD: Team Facebook&#10;Team Google" 
                                      value={newTeamName} 
                                      onChange={e => setNewTeamName(e.target.value)} 
                                    />
                                  </div>
                                  <DialogFooter>
                                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isAddingTeam}>
                                      {isAddingTeam ? 'Đang xử lý...' : 'Xác nhận thêm Team'}
                                    </Button>
                                  </DialogFooter>
                                </form>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Team Table */}
                    <Card className="border-none shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle>Danh sách Team</CardTitle>
                          <CardDescription>Quản lý các đội marketing ({sortedTeams.length} kết quả)</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {isAdmin && (
                            <div className="flex gap-2 mr-4">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-[10px] text-red-600 border-red-200 hover:bg-red-50"
                                onClick={handleBulkDeleteTeams}
                                disabled={selectedTeamIds.length === 0 || isDeletingTeams}
                              >
                                <Trash2 className="w-3 h-3 mr-1" /> {isDeletingTeams ? 'Đang xóa...' : `Xóa đã chọn (${selectedTeamIds.length})`}
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                className="h-8 text-[10px]"
                                onClick={handleDeleteAllTeams}
                                disabled={teams.length === 0}
                              >
                                <AlertTriangle className="w-3 h-3 mr-1" /> Xóa tất cả
                              </Button>
                            </div>
                          )}
                          <Badge variant="secondary">{teams.length} tổng số</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-xl border border-slate-100 overflow-hidden">
                          <Table>
                            <TableHeader className="bg-slate-50">
                              <TableRow>
                                {isAdmin && (
                                  <TableHead className="w-[40px]">
                                    <input 
                                      type="checkbox" 
                                      className="rounded border-slate-300"
                                      checked={selectedTeamIds.length === sortedTeams.length && sortedTeams.length > 0}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedTeamIds(sortedTeams.map(t => t.id));
                                        } else {
                                          setSelectedTeamIds([]);
                                        }
                                      }}
                                    />
                                  </TableHead>
                                )}
                                <TableHead className="cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setTeamSort({ key: 'name', direction: teamSort.direction === 'asc' ? 'desc' : 'asc' })}>
                                  <div className="flex items-center gap-2">Tên Team <ArrowUpDown className="w-3 h-3" /></div>
                                </TableHead>
                                <TableHead>Ngày tạo</TableHead>
                                <TableHead className="text-right">Thao tác</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sortedTeams.map(t => (
                                <TableRow key={t.id} className={selectedTeamIds.includes(t.id) ? "bg-blue-50/30" : ""}>
                                  {isAdmin && (
                                    <TableCell>
                                      <input 
                                        type="checkbox" 
                                        className="rounded border-slate-300"
                                        checked={selectedTeamIds.includes(t.id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedTeamIds(prev => [...prev, t.id]);
                                          } else {
                                            setSelectedTeamIds(prev => prev.filter(id => id !== t.id));
                                          }
                                        }}
                                      />
                                    </TableCell>
                                  )}
                                  <TableCell className="font-medium">
                                    {editingTeamId === t.id ? (
                                      <Input value={editingTeamName} onChange={e => setEditingTeamName(e.target.value)} className="h-8" />
                                    ) : t.name}
                                  </TableCell>
                                  <TableCell className="text-xs text-slate-500">
                                    {safeFormat(t.createdAt?.toDate ? t.createdAt.toDate() : new Date(), 'dd/MM/yyyy')}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {isAdmin && (
                                      <div className="flex justify-end gap-1">
                                        {editingTeamId === t.id ? (
                                          <>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleUpdateTeam(t.id, editingTeamName)}>
                                              <Check className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400" onClick={() => setEditingTeamId(null)}>
                                              <X className="h-4 w-4" />
                                            </Button>
                                          </>
                                        ) : (
                                          <>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => {
                                              setEditingTeamId(t.id);
                                              setEditingTeamName(t.name);
                                            }}>
                                              <Edit2 className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleDeleteTeam(t.id, t.name)}>
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                              {sortedTeams.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={3} className="h-24 text-center text-slate-500">
                                    Không tìm thấy team nào phù hợp
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Budget Management Tab */}
                <TabsContent value="budgets" className="space-y-6">
                  <div className="space-y-6">
                    <Card className="border-none shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle>Quản lý Ngân sách đã đăng ký</CardTitle>
                          <CardDescription>Xóa hoặc xem danh sách ngân sách của các team</CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-[10px] text-red-600 border-red-200 hover:bg-red-50"
                            onClick={handleBulkDeleteBudgets}
                            disabled={selectedBudgetIds.length === 0}
                          >
                            <Trash2 className="w-3 h-3 mr-1" /> Xóa đã chọn ({selectedBudgetIds.length})
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="h-8 text-[10px]"
                            onClick={handleDeleteAllBudgets}
                            disabled={budgets.length === 0}
                          >
                            <AlertTriangle className="w-3 h-3 mr-1" /> Xóa tất cả
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="flex-1 min-w-[200px] relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input 
                              placeholder="Tìm theo dự án, team, người triển khai..." 
                              className="pl-10 bg-white border-none shadow-sm h-10"
                              value={adminBudgetSearch}
                              onChange={e => setAdminBudgetSearch(e.target.value)}
                            />
                          </div>
                          <div className="w-[200px]">
                            <Input 
                              type="month" 
                              className="bg-white border-none shadow-sm h-10"
                              value={adminBudgetMonthFilter}
                              onChange={e => setAdminBudgetMonthFilter(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-100 overflow-hidden">
                          <Table>
                            <TableHeader className="bg-slate-50">
                              <TableRow>
                                <TableHead className="w-[40px]">
                                  <input 
                                    type="checkbox" 
                                    className="rounded border-slate-300"
                                    checked={selectedBudgetIds.length === budgets.length && budgets.length > 0}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedBudgetIds(budgets.map(b => b.id));
                                      } else {
                                        setSelectedBudgetIds([]);
                                      }
                                    }}
                                  />
                                </TableHead>
                                <TableHead>Dự án</TableHead>
                                <TableHead>Team</TableHead>
                                <TableHead>Người triển khai</TableHead>
                                <TableHead>Kỳ</TableHead>
                                <TableHead className="text-right">Ngân sách</TableHead>
                                <TableHead className="text-right">Thao tác</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {budgets
                                .filter(b => {
                                  const matchesSearch = 
                                    (b.projectName || '').toLowerCase().includes(adminBudgetSearch.toLowerCase()) ||
                                    (b.teamName || '').toLowerCase().includes(adminBudgetSearch.toLowerCase()) ||
                                    (b.implementerName || '').toLowerCase().includes(adminBudgetSearch.toLowerCase());
                                  const matchesMonth = !adminBudgetMonthFilter || b.month === adminBudgetMonthFilter;
                                  return matchesSearch && matchesMonth;
                                })
                                .sort((a, b) => {
                                  const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                                  const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                                  return dateB - dateA;
                                })
                                .map(b => (
                                  <TableRow key={b.id} className={selectedBudgetIds.includes(b.id) ? "bg-blue-50/30" : ""}>
                                    <TableCell>
                                      <input 
                                        type="checkbox" 
                                        className="rounded border-slate-300"
                                        checked={selectedBudgetIds.includes(b.id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedBudgetIds(prev => [...prev, b.id]);
                                          } else {
                                            setSelectedBudgetIds(prev => prev.filter(id => id !== b.id));
                                          }
                                        }}
                                      />
                                    </TableCell>
                                    <TableCell className="font-medium">{b.projectName}</TableCell>
                                    <TableCell>{b.teamName}</TableCell>
                                    <TableCell>{b.implementerName}</TableCell>
                                    <TableCell className="text-xs">{b.month}</TableCell>
                                    <TableCell className="text-right font-mono font-bold">{b.amount.toLocaleString()} đ</TableCell>
                                    <TableCell className="text-right">
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-slate-400 hover:text-red-600"
                                        onClick={() => handleDeleteBudget(b.id, b.projectName)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              {budgets.filter(b => {
                                  const matchesSearch = 
                                    (b.projectName || '').toLowerCase().includes(adminBudgetSearch.toLowerCase()) ||
                                    (b.teamName || '').toLowerCase().includes(adminBudgetSearch.toLowerCase()) ||
                                    (b.implementerName || '').toLowerCase().includes(adminBudgetSearch.toLowerCase());
                                  const matchesMonth = !adminBudgetMonthFilter || b.month === adminBudgetMonthFilter;
                                  return matchesSearch && matchesMonth;
                                }).length === 0 && (
                                  <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                      Không tìm thấy ngân sách nào phù hợp
                                    </TableCell>
                                  </TableRow>
                                )}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Cost Management Tab */}
                <TabsContent value="costs" className="space-y-6">
                  <div className="space-y-6">
                    <Card className="border-none shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle>Quản lý Thực chi</CardTitle>
                          <CardDescription>Xóa hoặc xem danh sách các bản ghi thực chi</CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-[10px] text-red-600 border-red-200 hover:bg-red-50"
                            onClick={handleBulkDeleteCosts}
                            disabled={selectedCostIds.length === 0}
                          >
                            <Trash2 className="w-3 h-3 mr-1" /> Xóa đã chọn ({selectedCostIds.length})
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="h-8 text-[10px]"
                            onClick={handleDeleteAllCosts}
                            disabled={costs.length === 0}
                          >
                            <AlertTriangle className="w-3 h-3 mr-1" /> Xóa tất cả
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="flex-1 min-w-[200px] relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input 
                              placeholder="Tìm theo dự án, team, người triển khai..." 
                              className="pl-10 bg-white border-none shadow-sm h-10"
                              value={adminCostSearch}
                              onChange={e => setAdminCostSearch(e.target.value)}
                            />
                          </div>
                          <div className="w-[200px]">
                            <Input 
                              type="month" 
                              className="bg-white border-none shadow-sm h-10"
                              value={adminCostMonthFilter}
                              onChange={e => setAdminCostMonthFilter(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-100 overflow-hidden">
                          <Table>
                            <TableHeader className="bg-slate-50">
                              <TableRow>
                                <TableHead className="w-[40px]">
                                  <input 
                                    type="checkbox" 
                                    className="rounded border-slate-300"
                                    checked={selectedCostIds.length === costs.length && costs.length > 0}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedCostIds(costs.map(c => c.id));
                                      } else {
                                        setSelectedCostIds([]);
                                      }
                                    }}
                                  />
                                </TableHead>
                                <TableHead>Dự án</TableHead>
                                <TableHead>Team</TableHead>
                                <TableHead>Người triển khai</TableHead>
                                <TableHead>Tuần</TableHead>
                                <TableHead className="text-right">Thực chi</TableHead>
                                <TableHead className="text-right">Thao tác</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {costs
                                .filter(c => {
                                  const matchesSearch = 
                                    (c.projectName || '').toLowerCase().includes(adminCostSearch.toLowerCase()) ||
                                    (c.teamName || '').toLowerCase().includes(adminCostSearch.toLowerCase()) ||
                                    (c.implementerName || '').toLowerCase().includes(adminCostSearch.toLowerCase());
                                  
                                  const costDate = c.createdAt?.toDate ? c.createdAt.toDate() : null;
                                  const matchesMonth = !adminCostMonthFilter || (costDate && getMarketingMonth(costDate) === adminCostMonthFilter);
                                  
                                  return matchesSearch && matchesMonth;
                                })
                                .sort((a, b) => {
                                  const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                                  const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                                  return dateB - dateA;
                                })
                                .map(c => (
                                  <TableRow key={c.id} className={selectedCostIds.includes(c.id) ? "bg-blue-50/30" : ""}>
                                    <TableCell>
                                      <input 
                                        type="checkbox" 
                                        className="rounded border-slate-300"
                                        checked={selectedCostIds.includes(c.id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedCostIds(prev => [...prev, c.id]);
                                          } else {
                                            setSelectedCostIds(prev => prev.filter(id => id !== c.id));
                                          }
                                        }}
                                      />
                                    </TableCell>
                                    <TableCell className="font-medium">{c.projectName}</TableCell>
                                    <TableCell>{c.teamName}</TableCell>
                                    <TableCell>{c.implementerName}</TableCell>
                                    <TableCell className="text-xs">Tuần {c.weekNumber}</TableCell>
                                    <TableCell className="text-right font-mono font-bold text-blue-600">{c.amount.toLocaleString()} đ</TableCell>
                                    <TableCell className="text-right">
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-slate-400 hover:text-red-600"
                                        onClick={() => handleDeleteCost(c.id, c.projectName)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              {costs.filter(c => {
                                  const matchesSearch = 
                                    (c.projectName || '').toLowerCase().includes(adminCostSearch.toLowerCase()) ||
                                    (c.teamName || '').toLowerCase().includes(adminCostSearch.toLowerCase()) ||
                                    (c.implementerName || '').toLowerCase().includes(adminCostSearch.toLowerCase());
                                  const costDate = c.createdAt?.toDate ? c.createdAt.toDate() : null;
                                  const matchesMonth = !adminCostMonthFilter || (costDate && getMarketingMonth(costDate) === adminCostMonthFilter);
                                  return matchesSearch && matchesMonth;
                                }).length === 0 && (
                                  <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                      Không tìm thấy bản ghi thực chi nào phù hợp
                                    </TableCell>
                                  </TableRow>
                                )}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Reports & Analytics Tab */}
                <TabsContent value="reports" className="space-y-6">
                  <Card className="border-none shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-blue-600" /> Báo cáo & Phân tích chuyên sâu
                      </CardTitle>
                      <CardDescription>Theo dõi hiệu quả sử dụng ngân sách theo Team và Dự án</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                    {/* Filters Row */}
                    <div className="flex flex-wrap gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="flex-1 min-w-[200px] space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Dự án</Label>
                        <Select value={reportProject} onValueChange={setReportProject}>
                          <SelectTrigger className="bg-white border-none shadow-sm">
                            <SelectValue placeholder="Tất cả dự án">
                              {reportProject === 'all' ? 'Tất cả dự án' : projectMap[reportProject]}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <div className="p-2 sticky top-0 bg-popover z-10 border-b">
                              <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="Tìm dự án..."
                                  className="pl-8 h-9"
                                  value={reportProjectSearch}
                                  onChange={(e) => setReportProjectSearch(e.target.value)}
                                  onKeyDown={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                            <SelectItem value="all">Tất cả dự án</SelectItem>
                            {projects
                              .filter(p => p.name.toLowerCase().includes(reportProjectSearch.toLowerCase()))
                              .map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))
                            }
                            {projects.filter(p => p.name.toLowerCase().includes(reportProjectSearch.toLowerCase())).length === 0 && (
                              <div className="p-4 text-center text-xs text-muted-foreground">Không tìm thấy dự án</div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      {isAdmin && (
                        <div className="flex-1 min-w-[200px] space-y-1.5">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Đội (Team)</Label>
                          <Select value={reportTeam} onValueChange={setReportTeam}>
                            <SelectTrigger className="bg-white border-none shadow-sm">
                              <SelectValue placeholder="Tất cả đội" />
                            </SelectTrigger>
                            <SelectContent>
                              <div className="p-2 sticky top-0 bg-popover z-10 border-b">
                                <div className="relative">
                                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    placeholder="Tìm team..."
                                    className="pl-8 h-9"
                                    value={reportTeamSearch}
                                    onChange={(e) => setReportTeamSearch(e.target.value)}
                                    onKeyDown={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </div>
                              <SelectItem value="all">Tất cả đội</SelectItem>
                              {uniqueTeams
                                .filter(t => t.toLowerCase().includes(reportTeamSearch.toLowerCase()))
                                .map(t => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))
                              }
                              {uniqueTeams.filter(t => t.toLowerCase().includes(reportTeamSearch.toLowerCase())).length === 0 && (
                                <div className="p-4 text-center text-xs text-muted-foreground">Không tìm thấy team</div>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="flex-1 min-w-[200px] space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Miền / Vùng</Label>
                        <Select value={reportRegion} onValueChange={setReportRegion}>
                          <SelectTrigger className="bg-white border-none shadow-sm">
                            <SelectValue placeholder="Tất cả miền" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tất cả miền</SelectItem>
                            {uniqueRegions.map(r => (
                              <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 min-w-[200px] space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Loại hình</Label>
                        <Select value={reportType} onValueChange={setReportType}>
                          <SelectTrigger className="bg-white border-none shadow-sm">
                            <SelectValue placeholder="Tất cả loại hình" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tất cả loại hình</SelectItem>
                            {uniqueTypes.map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 min-w-[200px] space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Năm báo cáo</Label>
                        <Select value={reportYear} onValueChange={setReportYear}>
                          <SelectTrigger className="bg-white border-none shadow-sm">
                            <SelectValue placeholder="Chọn năm" />
                          </SelectTrigger>
                          <SelectContent>
                            {[2024, 2025, 2026, 2027, 2028].map(y => (
                              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 min-w-[200px] space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
                          {reportMonth ? getMarketingMonthDisplayRange(reportMonth) : 'Kỳ báo cáo'}
                        </Label>
                        <Input type="month" className="bg-white border-none shadow-sm" value={reportMonth} onChange={e => setReportMonth(e.target.value)} />
                      </div>
                      <div className="flex-1 min-w-[200px] space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tuần báo cáo</Label>
                        <Select value={reportWeek} onValueChange={setReportWeek}>
                          <SelectTrigger className="bg-white border-none shadow-sm">
                            <SelectValue placeholder="Tất cả tuần" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tất cả tuần</SelectItem>
                            {/* Derive weeks from costs in the selected month */}
                            {Array.from(new Set(costs
                              .filter(c => {
                                const costDate = c.createdAt?.toDate ? c.createdAt.toDate() : null;
                                return costDate && getMarketingMonth(costDate) === reportMonth;
                              })
                              .map(c => c.weekNumber)
                            ))
                            .sort((a, b) => (a as number) - (b as number))
                            .map(w => (
                              <SelectItem key={w} value={w?.toString() || ''}>Tuần {w}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Summary Cards - Only visible to Admin */}
                    {isAdmin && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col gap-1">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tổng ngân sách</p>
                          <p className="text-2xl font-bold text-slate-900">
                            {filteredBudgets.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()} đ
                          </p>
                        </div>
                        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col gap-1">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tổng thực chi</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {filteredCosts.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()} đ
                          </p>
                        </div>
                        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col gap-1">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tỉ lệ sử dụng</p>
                          {(() => {
                            const budget = filteredBudgets.reduce((acc, curr) => acc + curr.amount, 0);
                            const cost = filteredCosts.reduce((acc, curr) => acc + curr.amount, 0);
                            const percent = budget > 0 ? (cost / budget) * 100 : 0;
                            return (
                              <div className="flex items-center gap-2">
                                <p className={`text-2xl font-bold ${percent > 100 ? 'text-red-600' : percent < 70 ? 'text-amber-600' : 'text-green-600'}`}>
                                  {percent.toFixed(1)}%
                                </p>
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${percent > 100 ? 'bg-red-500' : percent < 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                                    style={{ width: `${Math.min(percent, 100)}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Chart Section */}
                    <div className="space-y-4">
                      <Tabs defaultValue="team" className="w-full">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                          <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Biểu đồ so sánh Ngân sách vs Thực chi</Label>
                            <p className="text-[10px] text-slate-400">So sánh dữ liệu theo {chartTimeType === 'month' ? 'Tháng' : 'Tuần'}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                              <Button 
                                variant={chartTimeType === 'month' ? 'secondary' : 'ghost'} 
                                size="sm" 
                                onClick={() => setChartTimeType('month')}
                                className={`h-7 text-[10px] px-4 rounded-lg transition-all ${chartTimeType === 'month' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
                              >
                                Theo Tháng
                              </Button>
                              <Button 
                                variant={chartTimeType === 'week' ? 'secondary' : 'ghost'} 
                                size="sm" 
                                onClick={() => setChartTimeType('week')}
                                className={`h-7 text-[10px] px-4 rounded-lg transition-all ${chartTimeType === 'week' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
                              >
                                Theo Tuần
                              </Button>
                            </div>
                            <TabsList className="bg-slate-100 p-1 h-9 rounded-xl border border-slate-200">
                              <TabsTrigger value="team" className="text-[10px] px-4 h-7 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600">Theo Team</TabsTrigger>
                              <TabsTrigger value="project" className="text-[10px] px-4 h-7 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600">Theo Dự án</TabsTrigger>
                              <TabsTrigger value="region" className="text-[10px] px-4 h-7 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600">Theo Khu vực</TabsTrigger>
                            </TabsList>
                          </div>
                        </div>

                        <TabsContent value="team" className="mt-0">
                          <div className="h-[450px] w-full bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                  dataKey="name" 
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fill: '#64748b', fontSize: 12 }} 
                                  dy={15}
                                />
                                <YAxis 
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fill: '#64748b', fontSize: 12 }} 
                                  tickFormatter={formatYAxis}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                <Legend 
                                  verticalAlign="top" 
                                  align="right" 
                                  iconType="circle" 
                                  wrapperStyle={{ paddingBottom: '30px', fontSize: '12px', fontWeight: 500 }} 
                                />
                                <Bar dataKey="budget" name="Ngân sách" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={32} />
                                <Bar dataKey="actual" name="Thực chi" fill="#10b981" radius={[6, 6, 0, 0]} barSize={32} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </TabsContent>

                        <TabsContent value="project" className="mt-0">
                          <div className="h-[500px] w-full bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={projectChartData} margin={{ top: 20, right: 30, left: 40, bottom: 100 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                  dataKey="name" 
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fill: '#64748b', fontSize: 10 }} 
                                  dy={10} 
                                  interval={0} 
                                  angle={-45} 
                                  textAnchor="end" 
                                  height={120}
                                />
                                <YAxis 
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fill: '#64748b', fontSize: 12 }} 
                                  tickFormatter={formatYAxis}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                <Legend 
                                  verticalAlign="top" 
                                  align="right" 
                                  iconType="circle" 
                                  wrapperStyle={{ paddingBottom: '30px', fontSize: '12px', fontWeight: 500 }} 
                                />
                                <Bar dataKey="budget" name="Ngân sách" fill="#0ea5e9" radius={[6, 6, 0, 0]} barSize={24} />
                                <Bar dataKey="actual" name="Thực chi" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={24} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </TabsContent>

                        <TabsContent value="region" className="mt-0">
                          <div className="h-[450px] w-full bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={regionChartData} margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                  dataKey="name" 
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fill: '#64748b', fontSize: 12 }} 
                                  dy={15}
                                />
                                <YAxis 
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fill: '#64748b', fontSize: 12 }} 
                                  tickFormatter={formatYAxis}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                <Legend 
                                  verticalAlign="top" 
                                  align="right" 
                                  iconType="circle" 
                                  wrapperStyle={{ paddingBottom: '30px', fontSize: '12px', fontWeight: 500 }} 
                                />
                                <Bar dataKey="budget" name="Ngân sách" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={32} />
                                <Bar dataKey="actual" name="Thực chi" fill="#ec4899" radius={[6, 6, 0, 0]} barSize={32} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>

                    {/* Detailed Table */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Bảng chi tiết theo Team</Label>
                      </div>
                      <div className="rounded-2xl border border-slate-100 overflow-hidden">
                        <Table>
                          <TableHeader className="bg-slate-50">
                            <TableRow>
                              <TableHead className="font-bold">Team / Nhân sự</TableHead>
                              <TableHead className="font-bold">Dự án</TableHead>
                              <TableHead className="text-right font-bold">Ngân sách</TableHead>
                              <TableHead className="text-right font-bold">Thực chi</TableHead>
                              <TableHead className="text-right font-bold">Chênh lệch</TableHead>
                              <TableHead className="text-center font-bold">Trạng thái</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                          {uniqueTeams.filter(t => reportTeam === 'all' || t === reportTeam).map(team => {
                            const teamBudgets = filteredBudgets.filter(b => b.teamName === team);
                            const teamTotalBudget = teamBudgets.reduce((acc, curr) => acc + curr.amount, 0);
                            
                            const teamTotalCost = filteredCosts
                              .filter(c => c.teamName === team)
                              .reduce((acc, curr) => acc + curr.amount, 0);

                            if (teamTotalBudget === 0 && teamTotalCost === 0) return null;

                            const diff = teamTotalBudget - teamTotalCost;
                            
                            let status = "Bình thường";
                            let statusColor = "text-green-600 bg-green-50";
                            
                            if (teamTotalCost > teamTotalBudget) {
                              status = "Vượt ngân sách";
                              statusColor = "text-red-600 bg-red-50";
                            } else if (teamTotalCost < teamTotalBudget * 0.7) {
                              status = "Chi thấp (<70%)";
                              statusColor = "text-amber-600 bg-amber-50";
                            }

                            return (
                              <React.Fragment key={team}>
                                <TableRow className="bg-slate-50/50">
                                  <TableCell className="font-bold text-blue-700">{team} (Tổng)</TableCell>
                                  <TableCell className="text-xs text-slate-500">
                                    {Array.from(new Set(teamBudgets.map(b => projectMap[b.projectId]))).join(', ')}
                                  </TableCell>
                                  <TableCell className="text-right font-bold font-mono">{teamTotalBudget.toLocaleString()} đ</TableCell>
                                  <TableCell className="text-right font-bold font-mono">{teamTotalCost.toLocaleString()} đ</TableCell>
                                  <TableCell className={`text-right font-bold font-mono ${diff < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {diff.toLocaleString()} đ
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant="outline" className={`border-none ${statusColor}`}>
                                      {status}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                                {/* Implementer breakdown */}
                                {teamBudgets.map(budget => {
                                  const budgetCost = filteredCosts
                                    .filter(c => c.budgetId === budget.id)
                                    .reduce((acc, curr) => acc + curr.amount, 0);
                                  const bDiff = budget.amount - budgetCost;
                                  
                                  return (
                                    <TableRow key={budget.id} className="border-l-4 border-l-blue-200">
                                      <TableCell className="pl-8 text-xs text-slate-600 flex flex-col">
                                        <span className="font-medium">{budget.implementerName}</span>
                                        <span className="text-[10px] text-slate-400">{budget.userEmail}</span>
                                      </TableCell>
                                      <TableCell className="text-xs">{projectMap[budget.projectId]}</TableCell>
                                      <TableCell className="text-right text-xs font-mono">{budget.amount.toLocaleString()} đ</TableCell>
                                      <TableCell className="text-right text-xs font-mono">{budgetCost.toLocaleString()} đ</TableCell>
                                      <TableCell className={`text-right text-xs font-mono ${bDiff < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                        {bDiff.toLocaleString()} đ
                                      </TableCell>
                                      <TableCell />
                                    </TableRow>
                                  );
                                })}
                              </React.Fragment>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-slate-500 uppercase">Chi tiết ngân sách đăng ký</Label>
                      {isAdmin && (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-[10px] text-red-600 border-red-200 hover:bg-red-50"
                            onClick={handleBulkDeleteBudgets}
                            disabled={selectedBudgetIds.length === 0}
                          >
                            <Trash2 className="w-3 h-3 mr-1" /> Xóa đã chọn ({selectedBudgetIds.length})
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="h-8 text-[10px]"
                            onClick={handleDeleteAllBudgets}
                            disabled={filteredBudgets.length === 0}
                          >
                            <AlertTriangle className="w-3 h-3 mr-1" /> Xóa tất cả
                          </Button>
                        </div>
                      )}
                    </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {isAdmin && (
                              <TableHead className="w-[40px]">
                                <input 
                                  type="checkbox" 
                                  className="rounded border-slate-300"
                                  checked={selectedBudgetIds.length === filteredBudgets.length && filteredBudgets.length > 0}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedBudgetIds(filteredBudgets.map(b => b.id));
                                    } else {
                                      setSelectedBudgetIds([]);
                                    }
                                  }}
                                />
                              </TableHead>
                            )}
                            <TableHead>Đội</TableHead>
                            <TableHead>Người triển khai</TableHead>
                            <TableHead>Dự án</TableHead>
                            <TableHead className="text-right">Ngân sách</TableHead>
                            <TableHead>Người đăng ký</TableHead>
                            {isAdmin && <TableHead className="text-right">Thao tác</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredBudgets.map(b => (
                            <TableRow key={b.id} className={selectedBudgetIds.includes(b.id) ? "bg-blue-50/30" : ""}>
                              {isAdmin && (
                                <TableCell>
                                  <input 
                                    type="checkbox" 
                                    className="rounded border-slate-300"
                                    checked={selectedBudgetIds.includes(b.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedBudgetIds(prev => [...prev, b.id]);
                                      } else {
                                        setSelectedBudgetIds(prev => prev.filter(id => id !== b.id));
                                      }
                                    }}
                                  />
                                </TableCell>
                              )}
                              <TableCell className="font-medium">
                                {editingBudgetId === b.id ? (
                                  <Select value={editingBudgetTeam} onValueChange={setEditingBudgetTeam}>
                                    <SelectTrigger className="h-8 w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {teams.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                ) : b.teamName}
                              </TableCell>
                              <TableCell>
                                {editingBudgetId === b.id ? (
                                  <Input 
                                    className="h-8" 
                                    value={implementerName} 
                                    onChange={e => setImplementerName(e.target.value)} 
                                  />
                                ) : b.implementerName}
                              </TableCell>
                              <TableCell>
                                {editingBudgetId === b.id ? (
                                  <Select value={editingBudgetProject} onValueChange={setEditingBudgetProject}>
                                    <SelectTrigger className="h-8 w-full"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                ) : (projectMap[b.projectId] || b.projectName || 'N/A')}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {editingBudgetId === b.id ? (
                                  <Input 
                                    type="text" 
                                    className="h-8 text-right" 
                                    value={formatNumberWithCommas(editingBudgetAmount)} 
                                    onChange={handleNumberInputChange(setEditingBudgetAmount)} 
                                  />
                                ) : `${b.amount.toLocaleString()} đ`}
                              </TableCell>
                              <TableCell className="text-xs text-slate-500">{b.userEmail}</TableCell>
                              {isAdmin && (
                                <TableCell className="text-right">
                                  {editingBudgetId === b.id ? (
                                    <div className="flex justify-end gap-1">
                                      <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleUpdateBudget(b.id)}>
                                        <Check className="h-4 w-4" />
                                      </Button>
                                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400" onClick={() => setEditingBudgetId(null)}>
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex justify-end gap-1">
                                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => {
                                        setEditingBudgetId(b.id);
                                        setEditingBudgetAmount(b.amount.toString());
                                        setEditingBudgetMonth(b.month);
                                        setEditingBudgetTeam(b.teamName);
                                        setEditingBudgetProject(b.projectId);
                                      }}>
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleDeleteBudget(b.id, b.projectName)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                          {filteredBudgets.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-8 text-slate-400">Không tìm thấy dữ liệu phù hợp</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* User Management Tab */}
              {isAdmin && (
                <TabsContent value="users" className="space-y-6">
                  <Card className="border-none shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Quản lý Người dùng</CardTitle>
                        <CardDescription>Phân quyền và gán dự án cho người dùng</CardDescription>
                      </div>
                      <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          placeholder="Tìm người dùng..." 
                          className="pl-10 h-9"
                          value={userSearch}
                          onChange={e => setUserSearch(e.target.value)}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-xl border border-slate-100 overflow-hidden">
                        <Table>
                          <TableHeader className="bg-slate-50">
                            <TableRow>
                              <TableHead>Người dùng</TableHead>
                              <TableHead>Vai trò</TableHead>
                              <TableHead>Dự án gán (cho Mod)</TableHead>
                              <TableHead className="text-right">Thao tác</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {allUsers
                              .filter(u => u.email.toLowerCase().includes(userSearch.toLowerCase()) || u.fullName?.toLowerCase().includes(userSearch.toLowerCase()))
                              .map(u => (
                              <TableRow key={u.id}>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{u.fullName || u.displayName || 'Chưa cập nhật'}</span>
                                    <span className="text-xs text-slate-500">{u.email}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Select 
                                    value={u.role || 'user'} 
                                    onValueChange={(val) => handleUpdateUserRole(u.id, val, u.assignedProjects || [])}
                                  >
                                    <SelectTrigger className="w-[140px] h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="super_admin">Super Admin</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                      <SelectItem value="mod">Mod</SelectItem>
                                      <SelectItem value="gdda">GDDA</SelectItem>
                                      <SelectItem value="user">User</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  {(u.role === 'mod' || u.role === 'gdda') ? (
                                    <div className="flex flex-wrap gap-1 max-w-[300px]">
                                      <Dialog>
                                        <DialogTrigger render={
                                          <Button variant="outline" size="sm" className="h-7 text-[10px] px-2">
                                            Gán dự án ({u.assignedProjects?.length || 0})
                                          </Button>
                                        } />
                                        <DialogContent className="sm:max-w-[400px]">
                                          <DialogHeader>
                                            <DialogTitle>Gán dự án cho {u.fullName || u.email}</DialogTitle>
                                            <DialogDescription>
                                              {u.role === 'mod' 
                                                ? 'Chọn các dự án mà Mod này có quyền xem.' 
                                                : 'Chọn các dự án mà GDDA này có quyền xem báo cáo.'}
                                            </DialogDescription>
                                          </DialogHeader>
                                          <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto py-4">
                                            {projects.map(p => (
                                              <div key={p.id} className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded-lg">
                                                <input 
                                                  type="checkbox" 
                                                  id={`proj-${u.id}-${p.id}`}
                                                  checked={u.assignedProjects?.includes(p.id)}
                                                  onChange={(e) => {
                                                    const current = u.assignedProjects || [];
                                                    const next = e.target.checked 
                                                      ? [...current, p.id]
                                                      : current.filter((id: string) => id !== p.id);
                                                    handleUpdateUserRole(u.id, u.role, next);
                                                  }}
                                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <Label htmlFor={`proj-${u.id}-${p.id}`} className="text-sm font-normal cursor-pointer flex-1">
                                                  {p.name}
                                                </Label>
                                              </div>
                                            ))}
                                          </div>
                                        </DialogContent>
                                      </Dialog>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-400 italic">N/A</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-slate-400 hover:text-red-600"
                                    onClick={() => handleDeleteUser(u.id, u.email)}
                                    disabled={u.email === 'thienvu1108@gmail.com'}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {(isAdmin || isMod) && (
                <TabsContent value="audit" className="space-y-6">
                  <Card className="border-none shadow-sm">
                    <CardHeader>
                      <CardTitle>Nhật ký hệ thống</CardTitle>
                      <CardDescription>Theo dõi các thay đổi và người thực hiện</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {auditLogs.slice(0, 50).map(log => (
                          <div key={log.id} className="flex items-start gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100">
                            <div className="mt-1">
                              <Badge variant={log.action === 'CREATE' ? 'default' : log.action === 'DELETE' ? 'destructive' : 'secondary'}>
                                {log.action}
                              </Badge>
                            </div>
                            <div className="flex-1 space-y-1">
                              <p className="text-sm font-medium">
                                <span className="text-blue-600 font-bold">{log.userEmail}</span> đã {log.action === 'CREATE' ? 'thêm mới' : log.action === 'DELETE' ? 'xóa' : 'cập nhật'} dữ liệu trong <span className="font-bold">{log.collection}</span>
                              </p>
                              <p className="text-xs text-slate-500">
                                ID: {log.docId} | {log.timestamp?.toDate ? safeFormat(log.timestamp.toDate(), 'HH:mm dd/MM/yyyy') : '...'}
                              </p>
                              <div className="mt-2 text-xs bg-white p-2 rounded border border-slate-200 font-mono overflow-x-auto">
                                {JSON.stringify(log.data)}
                              </div>
                            </div>
                          </div>
                        ))}
                        {auditLogs.length === 0 && (
                          <div className="text-center py-12 text-slate-400">Chưa có lịch sử hoạt động</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
              {isAdmin && (
                <TabsContent value="backup" className="space-y-6">
                  <Card className="border-none shadow-sm">
                    <CardHeader>
                      <CardTitle>Sao lưu sang Google Sheets</CardTitle>
                      <CardDescription>Xuất toàn bộ dữ liệu hệ thống sang một tệp Google Spreadsheet mới.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
                        <p className="font-bold mb-1">Lưu ý:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Bạn cần đăng nhập bằng tài khoản Google có quyền tạo tệp trên Google Drive.</li>
                          <li>Hệ thống sẽ tạo một tệp Spreadsheet mới với các sheet tương ứng cho từng bảng dữ liệu.</li>
                          <li>Quá trình này có thể mất vài giây tùy thuộc vào lượng dữ liệu.</li>
                        </ul>
                      </div>
                      <Button 
                        onClick={handleGoogleBackup} 
                        disabled={isBackingUp}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isBackingUp ? (
                          <>
                            <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                            Đang sao lưu...
                          </>
                        ) : (
                          <>
                            <BarChart3 className="w-4 h-4 mr-2" /> Bắt đầu sao lưu sang Google Sheets
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>

            {/* Delete Project Confirmation Dialog */}
                <Dialog open={isDeleteProjectDialogOpen} onOpenChange={setIsDeleteProjectDialogOpen}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="w-5 h-5" /> Xác nhận xóa dự án
                      </DialogTitle>
                      <DialogDescription>
                        Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa dự án <strong>{projectToDelete?.name}</strong>?
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-3 mt-4">
                      <Button variant="outline" onClick={() => setIsDeleteProjectDialogOpen(false)}>Hủy</Button>
                      <Button variant="destructive" onClick={confirmDeleteProject}>Xóa dự án</Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Delete Team Confirmation Dialog */}
                <Dialog open={isDeleteTeamDialogOpen} onOpenChange={setIsDeleteTeamDialogOpen}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="w-5 h-5" /> Xác nhận xóa Team
                      </DialogTitle>
                      <DialogDescription>
                        Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa team <strong>{teamToDelete?.name}</strong>?
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-3 mt-4">
                      <Button variant="outline" onClick={() => setIsDeleteTeamDialogOpen(false)}>Hủy</Button>
                      <Button variant="destructive" onClick={confirmDeleteTeam}>Xóa Team</Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Bulk Delete Teams Confirmation Dialog */}
                <Dialog open={isBulkDeleteTeamsDialogOpen} onOpenChange={setIsBulkDeleteTeamsDialogOpen}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="w-5 h-5" /> Xác nhận xóa nhiều Team
                      </DialogTitle>
                      <DialogDescription>
                        Bạn có chắc chắn muốn xóa <strong>{selectedTeamIds.length}</strong> team đã chọn? Hành động này không thể hoàn tác.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-3 mt-4">
                      <Button variant="outline" onClick={() => setIsBulkDeleteTeamsDialogOpen(false)}>Hủy</Button>
                      <Button variant="destructive" onClick={confirmBulkDeleteTeams}>Xác nhận xóa</Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Delete All Teams Confirmation Dialog */}
                <Dialog open={isDeleteAllTeamsDialogOpen} onOpenChange={setIsDeleteAllTeamsDialogOpen}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="w-5 h-5" /> CẢNH BÁO: Xóa tất cả Team
                      </DialogTitle>
                      <DialogDescription>
                        Hành động này sẽ xóa <strong>TẤT CẢ</strong> team trong hệ thống và không thể hoàn tác. Bạn có chắc chắn?
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-3 mt-4">
                      <Button variant="outline" onClick={() => setIsDeleteAllTeamsDialogOpen(false)}>Hủy</Button>
                      <Button variant="destructive" onClick={confirmDeleteAllTeams}>Xác nhận xóa TẤT CẢ</Button>
                    </div>
                  </DialogContent>
                </Dialog>
            </TabsContent>
          )}

          {/* Budget Registration Tab */}
          <TabsContent value="register" className="space-y-6">
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <div className="h-1.5 bg-blue-600 w-full" />
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-slate-900">Đăng ký ngân sách tháng</CardTitle>
                <CardDescription>Nhập ngân sách dự kiến cho các chiến dịch marketing</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddBudget} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2 lg:col-span-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dự án</Label>
                      <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                        <SelectTrigger className="bg-slate-50 border-slate-200 focus:ring-blue-500 h-11">
                          <SelectValue placeholder="Chọn dự án">
                            {selectedProjectId ? (
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{projectMap[selectedProjectId]}</span>
                                <span className="text-[10px] text-slate-400 font-normal">({projects.find(p => p.id === selectedProjectId)?.region})</span>
                              </div>
                            ) : "Chọn dự án"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="w-[400px] md:w-[600px] max-w-[95vw]">
                          <div className="p-2 sticky top-0 bg-popover z-10 border-b">
                            <div className="relative">
                              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Tìm dự án..."
                                className="pl-8 h-9"
                                value={projectSearch}
                                onChange={(e) => setProjectSearch(e.target.value)}
                                onKeyDown={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                          <SelectGroup>
                            {projects
                              .filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase()))
                              .map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                  <div className="flex items-center justify-between w-full gap-4">
                                    <span className="font-medium">{p.name}</span>
                                    <Badge variant="outline" className="text-[10px] py-0 h-4 bg-slate-50 text-slate-500 border-slate-100 shrink-0">
                                      {p.region}
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))
                            }
                            {projects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase())).length === 0 && (
                              <div className="p-4 text-center text-xs text-muted-foreground">Không tìm thấy dự án</div>
                            )}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Team</Label>
                      <Select value={selectedTeamName} onValueChange={setSelectedTeamName}>
                        <SelectTrigger className="bg-slate-50 border-slate-200 focus:ring-blue-500 h-11">
                          <SelectValue placeholder="Chọn team" />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="p-2 sticky top-0 bg-popover z-10 border-b">
                            <div className="relative">
                              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Tìm team..."
                                className="pl-8 h-9"
                                value={teamSearch}
                                onChange={(e) => setTeamSearch(e.target.value)}
                                onKeyDown={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                          <SelectGroup>
                            {teams
                              .filter(t => t.name.toLowerCase().includes(teamSearch.toLowerCase()))
                              .map(t => (
                                <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                              ))
                            }
                            {teams.filter(t => t.name.toLowerCase().includes(teamSearch.toLowerCase())).length === 0 && (
                              <div className="p-4 text-center text-xs text-muted-foreground">Không tìm thấy team</div>
                            )}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Người triển khai</Label>
                      <div className="relative">
                        <Input 
                          placeholder="Tên người chạy" 
                          className="bg-slate-50 border-slate-200 focus:ring-blue-500 h-11 pr-10"
                          value={implementerName} 
                          onChange={e => setImplementerName(e.target.value)} 
                        />
                        {userProfile?.fullName && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500" title="Đã lấy từ hồ sơ">
                            <UserCircle className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Kỳ báo cáo (Tháng) <span className="text-blue-600 ml-1 normal-case font-medium">{getReportingPeriod(budgetMonth)}</span>
                      </Label>
                      <Input 
                        type="month" 
                        className="bg-slate-50 border-slate-200 focus:ring-blue-500 h-11"
                        value={budgetMonth} 
                        onChange={e => setBudgetMonth(e.target.value)} 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Số tiền (VNĐ)</Label>
                      <div className="relative">
                        <Input 
                          type="text" 
                          placeholder="0" 
                          className="bg-slate-50 border-slate-200 focus:ring-blue-500 h-11 pr-12 font-mono font-bold text-blue-600"
                          value={formatNumberWithCommas(budgetAmount)} 
                          onChange={handleNumberInputChange(setBudgetAmount)} 
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">đ</span>
                      </div>
                    </div>

                    <div className="flex items-end">
                      <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-11 shadow-md shadow-blue-200 transition-all hover:translate-y-[-1px]">
                        <Plus className="w-4 h-4 mr-2" /> Đăng ký ngân sách
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Confirmation Dialog */}
            <Dialog open={isConfirmBudgetOpen} onOpenChange={setIsConfirmBudgetOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Xác nhận đăng ký ngân sách</DialogTitle>
                  <DialogDescription>
                    Vui lòng kiểm tra lại thông tin trước khi xác nhận.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right font-bold">Dự án:</Label>
                    <div className="col-span-3">{projectMap[selectedProjectId]}</div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right font-bold">Team:</Label>
                    <div className="col-span-3">{selectedTeamName}</div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right font-bold">Người triển khai:</Label>
                    <div className="col-span-3">{implementerName}</div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right font-bold">Tháng:</Label>
                    <div className="col-span-3">{budgetMonth} <span className="text-blue-600 text-xs ml-1">{getReportingPeriod(budgetMonth)}</span></div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right font-bold">Số tiền:</Label>
                    <div className="col-span-3 font-mono font-bold text-blue-600">
                      {Number(budgetAmount).toLocaleString()} đ
                    </div>
                  </div>
                </div>
                <DialogFooter className="flex sm:justify-between gap-2">
                  <Button variant="outline" onClick={() => setIsConfirmBudgetOpen(false)}>
                    Hủy bỏ
                  </Button>
                  <Button onClick={confirmAddBudget} className="bg-blue-600 hover:bg-blue-700">
                    Xác nhận đăng ký
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="border-b border-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900">Danh sách đăng ký gần đây</CardTitle>
                    <CardDescription>Các khoản ngân sách vừa được thiết lập</CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        {selectedBudgetIds.length > 0 && (
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="h-8 text-[10px]"
                            onClick={handleBulkDeleteBudgets}
                          >
                            <Trash2 className="w-3 h-3 mr-1" /> Xóa {selectedBudgetIds.length} đã chọn
                          </Button>
                        )}
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="h-8 text-[10px]"
                          onClick={handleDeleteAllBudgets}
                          disabled={budgets.length === 0}
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" /> Xóa tất cả
                        </Button>
                      </div>
                    )}
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none">
                      {budgets.length} bản ghi
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="hover:bg-transparent border-b border-slate-100">
                        {isAdmin && (
                          <TableHead className="w-[40px] py-4">
                            <input 
                              type="checkbox" 
                              className="rounded border-slate-300"
                              checked={selectedBudgetIds.length === Math.min(budgets.length, 10) && budgets.length > 0}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedBudgetIds(budgets.slice(0, 10).map(b => b.id));
                                } else {
                                  setSelectedBudgetIds([]);
                                }
                              }}
                            />
                          </TableHead>
                        )}
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-4">Dự án</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-4">Team</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-4">Người triển khai</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-4">Tháng</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-4 text-right">Ngân sách</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-4">Người nhập</TableHead>
                        {isAdmin && <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-4 text-right">Thao tác</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {budgets
                        .filter(b => {
                          const userEmail = user?.email?.toLowerCase();
                          const budgetEmail = b.userEmail?.toLowerCase() || b.createdByEmail?.toLowerCase();
                          const isOwner = (budgetEmail && userEmail && budgetEmail === userEmail) || (b.createdBy === user?.uid);
                          const isAssignedGDDA = isGDDA && userProfile?.assignedProjects?.includes(b.projectId);
                          
                          return isAdmin || isMod || isOwner || isAssignedGDDA;
                        })
                        .slice(0, 10).map(b => (
                        <TableRow key={b.id} className={`${selectedBudgetIds.includes(b.id) ? "bg-blue-50/30" : ""} hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0`}>
                          {isAdmin && (
                            <TableCell className="py-4">
                              <input 
                                type="checkbox" 
                                className="rounded border-slate-300"
                                checked={selectedBudgetIds.includes(b.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedBudgetIds(prev => [...prev, b.id]);
                                  } else {
                                    setSelectedBudgetIds(prev => prev.filter(id => id !== b.id));
                                  }
                                }}
                              />
                            </TableCell>
                          )}
                          <TableCell className="py-4">
                            <span className="font-semibold text-slate-700">{projectMap[b.projectId] || b.projectName || 'N/A'}</span>
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge variant="outline" className="font-normal border-slate-200 text-slate-600 bg-white">
                              {b.teamName}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 text-slate-600">{b.implementerName}</TableCell>
                          <TableCell className="py-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded w-fit">
                                {b.month}
                              </span>
                              <span className="text-[10px] text-blue-600 font-medium">{getReportingPeriod(b.month)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4 text-right">
                            <span className="font-mono font-bold text-blue-600">
                              {b.amount.toLocaleString()} đ
                            </span>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{b.userEmail}</span>
                            </div>
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="py-4 text-right">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-slate-400 hover:text-red-600"
                                onClick={() => handleDeleteBudget(b.id, b.projectName)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                      {budgets.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
                                <Plus className="w-6 h-6 text-slate-200" />
                              </div>
                              <span>Chưa có dữ liệu đăng ký ngân sách</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Actual Cost Tab */}
          <TabsContent value="actual" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-6">
                <Card className="border-none shadow-sm bg-white overflow-hidden">
                  <div className="h-1.5 bg-green-600 w-full" />
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-bold text-slate-900">Cập nhật chi phí</CardTitle>
                    <CardDescription>Chọn khoản ngân sách để nhập chi phí thực tế</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <form onSubmit={handleAddCost} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kỳ ngân sách</Label>
                          <Input 
                            type="month" 
                            className="bg-slate-50 border-slate-200 h-11" 
                            value={costBudgetMonth} 
                            onChange={e => setCostBudgetMonth(e.target.value)} 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Khoản ngân sách</Label>
                          <Select value={selectedBudgetId} onValueChange={(val) => {
                            setSelectedBudgetId(val);
                            const budget = budgets.find(b => b.id === val);
                            if (budget) setActualProjectId(budget.projectId);
                          }}>
                            <SelectTrigger className="h-auto py-3 bg-slate-50 border-slate-200 focus:ring-green-500">
                              <SelectValue placeholder="Chọn khoản ngân sách của bạn">
                                {selectedBudgetId ? (
                                  (() => {
                                    const b = budgets.find(b => b.id === selectedBudgetId);
                                    return b ? (
                                      <div className="flex flex-col items-start">
                                        <span className="font-bold text-sm">{projectMap[b.projectId]}</span>
                                        <span className="text-[10px] text-slate-500">{b.teamName} - {b.implementerName}</span>
                                      </div>
                                    ) : "Chọn khoản ngân sách của bạn";
                                  })()
                                ) : "Chọn khoản ngân sách của bạn"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="w-[400px] md:w-[600px] max-w-[95vw]">
                              <div className="p-2 sticky top-0 bg-popover z-10 border-b">
                                <div className="relative">
                                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    placeholder="Tìm ngân sách..."
                                    className="pl-8 h-9"
                                    value={budgetSearch}
                                    onChange={(e) => setBudgetSearch(e.target.value)}
                                    onKeyDown={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </div>
                              <SelectGroup>
                                {budgets
                                  .filter(b => {
                                    const userEmail = user?.email?.toLowerCase();
                                    const budgetEmail = b.userEmail?.toLowerCase() || b.createdByEmail?.toLowerCase();
                                    const isOwner = (budgetEmail && userEmail && budgetEmail === userEmail) || (b.createdBy === user?.uid);
                                    const isAssignedGDDA = isGDDA && userProfile?.assignedProjects?.includes(b.projectId);
                                    
                                    // Admin and Mod see all budgets
                                    // GDDA sees assigned projects
                                    // User sees their own budgets
                                    const canSee = isAdmin || isMod || isOwner || isAssignedGDDA;
                                    
                                    // Filter by selected cost budget month
                                    return canSee && b.month === costBudgetMonth;
                                  })
                                  .filter(b => 
                                    (projectMap[b.projectId] || '').toLowerCase().includes(budgetSearch.toLowerCase()) ||
                                    (b.teamName || '').toLowerCase().includes(budgetSearch.toLowerCase()) ||
                                    (b.implementerName || '').toLowerCase().includes(budgetSearch.toLowerCase())
                                  )
                                  .map(b => (
                                    <SelectItem key={b.id} value={b.id} className="py-3">
                                      <div className="flex flex-col items-start gap-1">
                                        <span className="font-bold">{projectMap[b.projectId]}</span>
                                        <span className="text-xs text-slate-500">{b.teamName} - {b.implementerName}</span>
                                        <Badge variant="secondary" className="text-[10px] mt-1">
                                          Ngân sách: {b.amount.toLocaleString()} đ
                                        </Badge>
                                      </div>
                                    </SelectItem>
                                  ))
                                }
                                {budgets.filter(b => {
                                    const userEmail = user?.email?.toLowerCase();
                                    const budgetEmail = b.userEmail?.toLowerCase() || b.createdByEmail?.toLowerCase();
                                    const isOwner = (budgetEmail && userEmail && budgetEmail === userEmail) || (b.createdBy === user?.uid);
                                    const isAssignedGDDA = isGDDA && userProfile?.assignedProjects?.includes(b.projectId);
                                    const canSee = isAdmin || isMod || isOwner || isAssignedGDDA;
                                    return canSee && b.month === costBudgetMonth;
                                }).length === 0 && (
                                  <div className="p-4 text-center text-xs text-slate-500">
                                    Không tìm thấy ngân sách đăng ký cho kỳ {costBudgetMonth}
                                  </div>
                                )}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {selectedBudgetId && (
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
                          {(() => {
                            const budget = budgets.find(b => b.id === selectedBudgetId);
                            const spent = costs
                              .filter(c => c.budgetId === selectedBudgetId)
                              .reduce((acc, curr) => acc + curr.amount, 0);
                            const percent = budget ? (spent / budget.amount) * 100 : 0;
                            
                            return (
                              <>
                                <div className="flex justify-between items-end">
                                  <div className="space-y-1">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Đã chi / Ngân sách</p>
                                    <p className="text-sm font-bold">
                                      {spent.toLocaleString()} / {budget?.amount.toLocaleString()} đ
                                    </p>
                                  </div>
                                  <Badge className={percent > 100 ? "bg-red-100 text-red-700" : percent < 70 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}>
                                    {percent.toFixed(1)}%
                                  </Badge>
                                </div>
                                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-500 ${percent > 100 ? "bg-red-500" : percent < 70 ? "bg-amber-500" : "bg-green-500"}`}
                                    style={{ width: `${Math.min(percent, 100)}%` }}
                                  />
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tuần</Label>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                              {getWeekRange(costWeek)}
                            </span>
                          </div>
                          <Input type="week" className="bg-slate-50 border-slate-200 h-11" value={costWeek} onChange={e => setCostWeek(e.target.value)} />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase">Facebook Ads</Label>
                            <Input type="text" className="h-9 text-xs font-mono" placeholder="0" value={formatNumberWithCommas(fbAds)} onChange={handleNumberInputChange(setFbAds)} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase">Google Ads</Label>
                            <Input type="text" className="h-9 text-xs font-mono" placeholder="0" value={formatNumberWithCommas(googleAds)} onChange={handleNumberInputChange(setGoogleAds)} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase">Zalo Ads</Label>
                            <Input type="text" className="h-9 text-xs font-mono" placeholder="0" value={formatNumberWithCommas(zaloAds)} onChange={handleNumberInputChange(setZaloAds)} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase">Đăng tin</Label>
                            <Input type="text" className="h-9 text-xs font-mono" placeholder="0" value={formatNumberWithCommas(posting)} onChange={handleNumberInputChange(setPosting)} />
                          </div>
                          <div className="space-y-1.5 col-span-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase">Khác</Label>
                            <Input type="text" className="h-9 text-xs font-mono" placeholder="0" value={formatNumberWithCommas(otherCost)} onChange={handleNumberInputChange(setOtherCost)} />
                          </div>
                          <div className="col-span-2 pt-3 border-t border-slate-200 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-600">Tổng cộng:</span>
                            <span className="text-base font-bold text-blue-600 font-mono">
                              {(Number(fbAds) + Number(posting) + Number(zaloAds) + Number(googleAds) + Number(otherCost)).toLocaleString()} đ
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ghi chú</Label>
                        <Input placeholder="Nhập ghi chú chi phí..." className="bg-slate-50 border-slate-200 h-11" value={costNote} onChange={e => setCostNote(e.target.value)} />
                      </div>

                      <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 h-11 shadow-md shadow-green-100 transition-all hover:translate-y-[-1px]" disabled={!selectedBudgetId}>
                        <Plus className="w-4 h-4 mr-2" /> Cập nhật chi phí
                      </Button>
                    </form>
                    <div className="mt-6 p-4 rounded-lg bg-amber-50 border border-amber-100 space-y-2">
                      <p className="text-[10px] font-bold text-amber-800 uppercase">Quy định chi phí:</p>
                      <ul className="text-[10px] text-amber-700 list-disc pl-4 space-y-1">
                        <li>Không vượt quá 100% ngân sách.</li>
                        <li>Không thấp hơn 70% ngân sách.</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <Card className="border-none shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Lịch sử chi phí thực tế</CardTitle>
                      <CardDescription>Danh sách các khoản chi đã cập nhật trong kỳ</CardDescription>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-[10px] text-red-600 border-red-200 hover:bg-red-50"
                          onClick={handleBulkDeleteCosts}
                          disabled={selectedCostIds.length === 0}
                        >
                          <Trash2 className="w-3 h-3 mr-1" /> Xóa đã chọn ({selectedCostIds.length})
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="h-8 text-[10px]"
                          onClick={handleDeleteAllCosts}
                          disabled={costs.length === 0}
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" /> Xóa tất cả
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {isAdmin && (
                            <TableHead className="w-[40px]">
                              <input 
                                type="checkbox" 
                                className="rounded border-slate-300"
                                checked={selectedCostIds.length === costs.length && costs.length > 0}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedCostIds(costs.map(c => c.id));
                                  } else {
                                    setSelectedCostIds([]);
                                  }
                                }}
                              />
                            </TableHead>
                          )}
                          <TableHead>Dự án / Team</TableHead>
                          <TableHead>Người triển khai</TableHead>
                          <TableHead>Thời gian</TableHead>
                          <TableHead className="text-right">Số tiền</TableHead>
                          <TableHead>Ghi chú</TableHead>
                          {isAdmin && <TableHead className="text-right">Thao tác</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {costs
                          .filter(c => isAdmin || isMod || c.userEmail === user.email)
                          .slice(0, 15)
                          .map(c => (
                          <TableRow key={c.id} className={selectedCostIds.includes(c.id) ? "bg-blue-50/30" : ""}>
                            {isAdmin && (
                              <TableCell>
                                <input 
                                  type="checkbox" 
                                  className="rounded border-slate-300"
                                  checked={selectedCostIds.includes(c.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedCostIds(prev => [...prev, c.id]);
                                    } else {
                                      setSelectedCostIds(prev => prev.filter(id => id !== c.id));
                                    }
                                  }}
                                />
                              </TableCell>
                            )}
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{projectMap[c.projectId] || c.projectName}</span>
                                <span className="text-[10px] text-slate-500">{c.teamName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">{c.implementerName}</TableCell>
                            <TableCell className="text-xs">Tuần {c.weekNumber}</TableCell>
                            <TableCell className="text-right font-mono font-medium">
                              {editingCostId === c.id ? (
                                <Input 
                                  type="text" 
                                  className="h-8 text-right w-32 ml-auto" 
                                  value={formatNumberWithCommas(editingCostAmount)} 
                                  onChange={handleNumberInputChange(setEditingCostAmount)} 
                                />
                              ) : `${c.amount.toLocaleString()} đ`}
                            </TableCell>
                            <TableCell className="text-xs italic text-slate-500 max-w-[150px] truncate">
                              {editingCostId === c.id ? (
                                <Input 
                                  className="h-8 text-xs" 
                                  value={editingCostNote} 
                                  onChange={e => setEditingCostNote(e.target.value)} 
                                />
                              ) : (c.note || '-')}
                            </TableCell>
                            {isAdmin && (
                              <TableCell className="text-right">
                                {editingCostId === c.id ? (
                                  <div className="flex justify-end gap-1">
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleUpdateCost(c.id)}>
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400" onClick={() => setEditingCostId(null)}>
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex justify-end gap-1">
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => {
                                      setEditingCostId(c.id);
                                      setEditingCostAmount(c.amount.toString());
                                      setEditingCostNote(c.note || '');
                                    }}>
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleDeleteCost(c.id, projectMap[c.projectId] || c.projectName)}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                        {costs.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-12 text-slate-400">Chưa có dữ liệu thực tế</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Audit History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Lịch sử chỉnh sửa</CardTitle>
                <CardDescription>Theo dõi các thay đổi và người thực hiện</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {auditLogs.slice(0, 20).map(log => (
                    <div key={log.id} className="flex items-start gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="mt-1">
                        <Badge variant={log.action === 'CREATE' ? 'default' : 'secondary'}>
                          {log.action}
                        </Badge>
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">
                          <span className="text-blue-600">{log.userEmail}</span> đã {log.action === 'CREATE' ? 'thêm mới' : 'cập nhật'} dữ liệu trong <span className="font-bold">{log.collection}</span>
                        </p>
                        <p className="text-xs text-slate-500">
                          ID: {log.docId} | {log.timestamp?.toDate ? safeFormat(log.timestamp.toDate(), 'HH:mm dd/MM/yyyy') : '...'}
                        </p>
                        <div className="mt-2 text-xs bg-white p-2 rounded border border-slate-200 font-mono overflow-x-auto">
                          {JSON.stringify(log.data)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {auditLogs.length === 0 && (
                    <div className="text-center py-12 text-slate-400">Chưa có lịch sử hoạt động</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Onboarding Dialog */}
      <Dialog open={showOnboarding} onOpenChange={(open) => {
        // Prevent closing if profile is incomplete
        if (!userProfile?.fullName || !userProfile?.teamName) return;
        setShowOnboarding(open);
      }}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-none shadow-2xl">
          <div className="h-2 bg-blue-600 w-full" />
          <div className="p-6 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-slate-900">Chào mừng bạn!</DialogTitle>
              <DialogDescription className="text-slate-500">
                Vui lòng hoàn tất thông tin cá nhân để bắt đầu sử dụng hệ thống.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSaveOnboarding} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-semibold text-slate-700">Họ và tên đầy đủ</Label>
                  <Input
                    id="fullName"
                    placeholder="Nhập họ tên của bạn..."
                    className="h-12 bg-slate-50 border-slate-200 focus:ring-blue-500"
                    value={onboardingName}
                    onChange={(e) => setOnboardingName(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Team đang làm việc</Label>
                  <Select value={onboardingTeam} onValueChange={setOnboardingTeam} required>
                    <SelectTrigger className="h-12 bg-slate-50 border-slate-200 focus:ring-blue-500">
                      <SelectValue placeholder="Chọn team của bạn" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2 sticky top-0 bg-popover z-10 border-b">
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Tìm team..."
                            className="pl-8 h-9"
                            value={teamSearch}
                            onChange={(e) => setTeamSearch(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <SelectGroup>
                        {teams
                          .filter(t => t.name.toLowerCase().includes(teamSearch.toLowerCase()))
                          .map(t => (
                            <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                          ))
                        }
                        {teams.filter(t => t.name.toLowerCase().includes(teamSearch.toLowerCase())).length === 0 && (
                          <div className="p-4 text-center text-xs text-muted-foreground">Không tìm thấy team</div>
                        )}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-[0.98]">
                Lưu thông tin & Bắt đầu
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Set Projects for Region Dialog */}
      <Dialog open={isSetProjectsDialogOpen} onOpenChange={setIsSetProjectsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Gán dự án cho vùng: {regionForProjects?.name}</DialogTitle>
            <DialogDescription>Chọn các dự án bạn muốn gán vào vùng này. Các dự án đang thuộc vùng khác sẽ được cập nhật sang vùng mới.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Tìm kiếm dự án..." 
                className="pl-10"
                value={projectSearch}
                onChange={e => setProjectSearch(e.target.value)}
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto border rounded-md p-2 space-y-1">
              {projects
                .filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase()))
                .map(p => (
                  <div key={p.id} className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded-md transition-colors">
                    <input 
                      type="checkbox" 
                      id={`proj-${p.id}`}
                      className="rounded border-slate-300"
                      checked={selectedProjectIdsForRegion.includes(p.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProjectIdsForRegion(prev => [...prev, p.id]);
                        } else {
                          setSelectedProjectIdsForRegion(prev => prev.filter(id => id !== p.id));
                        }
                      }}
                    />
                    <Label htmlFor={`proj-${p.id}`} className="flex-1 cursor-pointer text-sm">
                      {p.name} <span className="text-[10px] text-slate-400 ml-2">({p.region || 'Chưa có vùng'})</span>
                    </Label>
                  </div>
                ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSetProjectsDialogOpen(false)}>Hủy</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSetProjectsForRegion}>
              Xác nhận gán {selectedProjectIdsForRegion.length} dự án
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Region Confirmation Dialog */}
      <Dialog open={isDeleteRegionDialogOpen} onOpenChange={setIsDeleteRegionDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Xác nhận xóa
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa vùng <strong>{regionToDelete?.name}</strong>? 
              Hành động này sẽ không xóa các dự án, nhưng các dự án thuộc vùng này sẽ không còn thông tin vùng.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteRegionDialogOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={confirmDeleteRegion}>Xác nhận xóa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Set Projects for Type Dialog */}
      <Dialog open={isSetProjectsForTypeDialogOpen} onOpenChange={setIsSetProjectsForTypeDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Gán dự án cho loại hình: {typeForProjects?.name}</DialogTitle>
            <DialogDescription>Chọn các dự án bạn muốn gán vào loại hình này. Các dự án đang thuộc loại hình khác sẽ được cập nhật sang loại hình mới.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Tìm kiếm dự án..." 
                className="pl-10"
                value={projectSearch}
                onChange={e => setProjectSearch(e.target.value)}
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto border rounded-md p-2 space-y-1">
              {projects
                .filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase()))
                .map(p => (
                  <div key={p.id} className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded-md transition-colors">
                    <input 
                      type="checkbox" 
                      id={`type-proj-${p.id}`}
                      className="rounded border-slate-300"
                      checked={selectedProjectIdsForType.includes(p.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProjectIdsForType(prev => [...prev, p.id]);
                        } else {
                          setSelectedProjectIdsForType(prev => prev.filter(id => id !== p.id));
                        }
                      }}
                    />
                    <Label htmlFor={`type-proj-${p.id}`} className="flex-1 cursor-pointer text-sm">
                      {p.name} <span className="text-[10px] text-slate-400 ml-2">({p.type || 'Chưa có loại hình'})</span>
                    </Label>
                  </div>
                ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSetProjectsForTypeDialogOpen(false)}>Hủy</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSetProjectsForType}>
              Xác nhận gán {selectedProjectIdsForType.length} dự án
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Type Confirmation Dialog */}
      <Dialog open={isDeleteTypeDialogOpen} onOpenChange={setIsDeleteTypeDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Xác nhận xóa
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa loại hình <strong>{typeToDelete?.name}</strong>? 
              Hành động này sẽ không xóa các dự án, nhưng các dự án thuộc loại hình này sẽ không còn thông tin loại hình.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteTypeDialogOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={confirmDeleteType}>Xác nhận xóa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete User Confirmation Dialog */}
      <Dialog open={isDeleteUserDialogOpen} onOpenChange={setIsDeleteUserDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Xác nhận xóa người dùng
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa người dùng <strong>{userToDelete?.email}</strong>? 
              Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteUserDialogOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={confirmDeleteUser}>Xác nhận xóa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Projects Confirmation Dialog */}
      <Dialog open={isBulkDeleteProjectsDialogOpen} onOpenChange={setIsBulkDeleteProjectsDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Xác nhận xóa nhiều dự án
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa <strong>{selectedProjectIds.length}</strong> dự án đã chọn?
              Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsBulkDeleteProjectsDialogOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={confirmBulkDeleteProjects} disabled={isDeletingProjects}>
              {isDeletingProjects ? "Đang xóa..." : "Xác nhận xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Update Region Confirmation Dialog */}
      <Dialog open={isBulkUpdateRegionDialogOpen} onOpenChange={setIsBulkUpdateRegionDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-blue-600 flex items-center gap-2">
              <Building2 className="w-5 h-5" /> Xác nhận cập nhật vùng
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn cập nhật vùng/khu vực thành <strong>{selectedRegionForBulk}</strong> cho <strong>{selectedProjectIds.length}</strong> dự án đã chọn?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsBulkUpdateRegionDialogOpen(false)}>Hủy</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={confirmBulkUpdateProjectRegion}>Xác nhận cập nhật</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Projects Confirmation Dialog */}
      <Dialog open={isDeleteAllProjectsDialogOpen} onOpenChange={setIsDeleteAllProjectsDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> CẢNH BÁO: Xóa TẤT CẢ dự án
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa <strong>TẤT CẢ</strong> dự án trong hệ thống?
              Hành động này cực kỳ nguy hiểm và không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteAllProjectsDialogOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={confirmDeleteAllProjects}>Xác nhận XÓA TẤT CẢ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Regions Confirmation Dialog */}
      <Dialog open={isBulkDeleteRegionsDialogOpen} onOpenChange={setIsBulkDeleteRegionsDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Xác nhận xóa nhiều vùng
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa <strong>{selectedRegionIds.length}</strong> vùng/khu vực đã chọn?
              Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsBulkDeleteRegionsDialogOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={confirmBulkDeleteRegions} disabled={isDeletingRegions}>
              {isDeletingRegions ? "Đang xóa..." : "Xác nhận xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Regions Confirmation Dialog */}
      <Dialog open={isDeleteAllRegionsDialogOpen} onOpenChange={setIsDeleteAllRegionsDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> CẢNH BÁO: Xóa TẤT CẢ vùng
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa <strong>TẤT CẢ</strong> vùng/khu vực trong hệ thống?
              Hành động này cực kỳ nguy hiểm và không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteAllRegionsDialogOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={confirmDeleteAllRegions}>Xác nhận XÓA TẤT CẢ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Types Confirmation Dialog */}
      <Dialog open={isBulkDeleteTypesDialogOpen} onOpenChange={setIsBulkDeleteTypesDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Xác nhận xóa nhiều loại hình
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa <strong>{selectedTypeIds.length}</strong> loại hình đã chọn?
              Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsBulkDeleteTypesDialogOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={confirmBulkDeleteTypes} disabled={isDeletingTypes}>
              {isDeletingTypes ? "Đang xóa..." : "Xác nhận xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Types Confirmation Dialog */}
      <Dialog open={isDeleteAllTypesDialogOpen} onOpenChange={setIsDeleteAllTypesDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> CẢNH BÁO: Xóa TẤT CẢ loại hình
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa <strong>TẤT CẢ</strong> loại hình trong hệ thống?
              Hành động này cực kỳ nguy hiểm và không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteAllTypesDialogOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={confirmDeleteAllTypes}>Xác nhận XÓA TẤT CẢ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Budget Confirmation Dialog */}
      <Dialog open={isDeleteBudgetDialogOpen} onOpenChange={setIsDeleteBudgetDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Xác nhận xóa ngân sách
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa đăng ký ngân sách cho dự án <strong>{budgetToDelete?.name}</strong>? 
              Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteBudgetDialogOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={confirmDeleteBudget}>Xác nhận xóa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Budgets Confirmation Dialog */}
      <Dialog open={isBulkDeleteBudgetsDialogOpen} onOpenChange={setIsBulkDeleteBudgetsDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Xác nhận xóa nhiều bản ghi
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa <strong>{selectedBudgetIds.length}</strong> đăng ký ngân sách đã chọn?
              Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsBulkDeleteBudgetsDialogOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={confirmBulkDeleteBudgets} disabled={isDeletingBudgets}>
              {isDeletingBudgets ? "Đang xóa..." : "Xác nhận xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Budgets Confirmation Dialog */}
      <Dialog open={isDeleteAllBudgetsDialogOpen} onOpenChange={setIsDeleteAllBudgetsDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> CẢNH BÁO: Xóa TẤT CẢ ngân sách
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa <strong>TẤT CẢ</strong> bản ghi đăng ký ngân sách trong hệ thống?
              Hành động này cực kỳ nguy hiểm và không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteAllBudgetsDialogOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={confirmDeleteAllBudgets}>Xác nhận XÓA TẤT CẢ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Cost Confirmation Dialog */}
      <Dialog open={isDeleteCostDialogOpen} onOpenChange={setIsDeleteCostDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Xác nhận xóa thực chi
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa bản ghi thực chi cho dự án <strong>{costToDelete?.name}</strong>? 
              Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteCostDialogOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={confirmDeleteCost}>Xác nhận xóa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Costs Confirmation Dialog */}
      <Dialog open={isBulkDeleteCostsDialogOpen} onOpenChange={setIsBulkDeleteCostsDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Xác nhận xóa nhiều bản ghi
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa <strong>{selectedCostIds.length}</strong> bản ghi thực chi đã chọn?
              Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsBulkDeleteCostsDialogOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={confirmBulkDeleteCosts} disabled={isDeletingCosts}>
              {isDeletingCosts ? "Đang xóa..." : "Xác nhận xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Costs Confirmation Dialog */}
      <Dialog open={isDeleteAllCostsDialogOpen} onOpenChange={setIsDeleteAllCostsDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> CẢNH BÁO: Xóa TẤT CẢ thực chi
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa <strong>TẤT CẢ</strong> bản ghi thực chi trong hệ thống?
              Hành động này cực kỳ nguy hiểm và không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteAllCostsDialogOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={confirmDeleteAllCosts}>Xác nhận XÓA TẤT CẢ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
