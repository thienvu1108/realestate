import React, { useState, useEffect, useMemo } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  orderBy, 
  serverTimestamp,
  doc,
  getDocFromServer,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc
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
  const [userRole, setUserRole] = useState<'super_admin' | 'admin' | 'gdda' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [costs, setCosts] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // Helper for Marketing Month (21st of prev month to 20th of current month)
  const getMarketingMonth = (date: Date) => {
    const d = new Date(date);
    const day = d.getDate();
    if (day >= 21) {
      d.setMonth(d.getMonth() + 1);
    }
    return format(d, 'yyyy-MM');
  };

  const getMarketingMonthDisplayRange = (monthStr: string) => {
    if (!monthStr) return '';
    try {
      const [year, month] = monthStr.split('-').map(Number);
      // Marketing month M is from 21st of M-1 to 20th of M
      const startDate = new Date(year, month - 2, 21);
      const endDate = new Date(year, month - 1, 20);
      return `Tháng ${month} (từ ${format(startDate, 'dd/MM')} - ${format(endDate, 'dd/MM')})`;
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

  // Edit states
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState('');

  // User Management states
  const [editingUserRole, setEditingUserRole] = useState<{ uid: string, role: string } | null>(null);
  const [editingUserProjects, setEditingUserProjects] = useState<{ uid: string, projects: string[] } | null>(null);

  // Onboarding states
  const [userProfile, setUserProfile] = useState<{ fullName?: string, teamName?: string, role?: string } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingName, setOnboardingName] = useState('');
  const [onboardingTeam, setOnboardingTeam] = useState('');

  // Report filters
  const [reportProject, setReportProject] = useState('all');
  const [reportTeam, setReportTeam] = useState('all');
  const [reportRegion, setReportRegion] = useState('all');
  const [reportType, setReportType] = useState('all');
  const [reportMonth, setReportMonth] = useState(getMarketingMonth(new Date()));
  const [reportProjectSearch, setReportProjectSearch] = useState('');
  const [reportTeamSearch, setReportTeamSearch] = useState('');

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
      if (firebaseUser) {
        // Check/Create user profile
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        let role: 'super_admin' | 'admin' | 'gdda' | 'user' = 'user';
        if (firebaseUser.email === 'thienvu1108@gmail.com') {
          role = 'super_admin';
        }

        if (!userDoc.exists()) {
          const initialProfile = {
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            role: role,
            createdAt: serverTimestamp()
          };
          await setDoc(userDocRef, initialProfile);
        }
        
        setUser(firebaseUser);
      } else {
        setUser(null);
        setUserRole(null);
        setUserProfile(null);
        setShowOnboarding(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const unsubProfile = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setUserProfile(data);
        setUserRole(data.role || 'user');
        
        if (!data.fullName || !data.teamName) {
          setOnboardingName(data.fullName || '');
          setOnboardingTeam(data.teamName || '');
          setShowOnboarding(true);
        } else {
          setImplementerName(data.fullName);
          setSelectedTeamName(data.teamName);
          setShowOnboarding(false);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users/' + user.uid);
    });

    return () => unsubProfile();
  }, [user]);

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
    const qProjects = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    const unsubProjects = onSnapshot(qProjects, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'projects'));

    // Listen to teams
    const qTeams = query(collection(db, 'teams'), orderBy('createdAt', 'desc'));
    const unsubTeams = onSnapshot(qTeams, (snapshot) => {
      setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'teams'));

    // Listen to budgets
    const qBudgets = query(collection(db, 'budgets'), orderBy('createdAt', 'desc'));
    const unsubBudgets = onSnapshot(qBudgets, (snapshot) => {
      setBudgets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'budgets'));

    // Listen to costs
    const qCosts = query(collection(db, 'costs'), orderBy('createdAt', 'desc'));
    const unsubCosts = onSnapshot(qCosts, (snapshot) => {
      setCosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'costs'));

    // Listen to audit logs
    const qLogs = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setAuditLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'auditLogs'));

    // Listen to all users (only for super_admin and admin)
    let unsubUsers = () => {};
    if (userRole === 'super_admin' || userRole === 'admin') {
      const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      unsubUsers = onSnapshot(qUsers, (snapshot) => {
        setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));
    }

    return () => {
      unsubProjects();
      unsubTeams();
      unsubBudgets();
      unsubCosts();
      unsubLogs();
      unsubUsers();
    };
  }, [user, userRole]);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast.success('Đăng nhập thành công');
    } catch (error) {
      console.error(error);
      toast.error('Đăng nhập thất bại');
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

  const sortedProjects = useMemo(() => {
    let filtered = projects.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(projectSearch.toLowerCase());
      const matchRegion = adminProjectRegionFilter === 'all' || p.region === adminProjectRegionFilter;
      const matchType = adminProjectTypeFilter === 'all' || p.type === adminProjectTypeFilter;
      return matchSearch && matchRegion && matchType;
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
    if (!newTeamName.trim()) return;
    
    const names = newTeamName.split('\n').map(n => n.trim()).filter(n => n !== '');
    if (names.length === 0) return;

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
        handleFirestoreError(error, OperationType.WRITE, 'teams');
      }
    }
    
    setNewTeamName('');
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
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'teams');
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
        userEmail: user?.email
      });
      await logAction('CREATE', 'budgets', docRef.id, { projectName: project?.name || 'N/A', amount: budgetAmount, implementer: implementerName });
      setBudgetAmount('');
      setImplementerName('');
      setSelectedProjectId('');
      setSelectedTeamName('');
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
        userEmail: user?.email
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

  const handleDeleteBudget = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa đăng ký ngân sách này?')) return;
    try {
      await deleteDoc(doc(db, 'budgets', id));
      await logAction('DELETE', 'budgets', id, {});
      toast.success('Đã xóa đăng ký ngân sách');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'budgets');
    }
  };

  const handleUpdateUserRole = async (uid: string, newRole: any) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      await logAction('UPDATE_USER_ROLE', 'users', uid, { role: newRole });
      toast.success('Đã cập nhật quyền người dùng');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleUpdateUserProjects = async (uid: string, assignedProjects: string[]) => {
    try {
      await updateDoc(doc(db, 'users', uid), { assignedProjects });
      await logAction('UPDATE_USER_PROJECTS', 'users', uid, { assignedProjects });
      toast.success('Đã cập nhật dự án gán cho GDDA');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  // Reporting Logic
  const filteredBudgets = useMemo(() => {
    return budgets.filter(b => {
      const project = projects.find(p => p.id === b.projectId);
      const matchProject = reportProject === 'all' || b.projectId === reportProject;
      
      let matchTeam = true;
      if (userRole === 'super_admin' || userRole === 'admin') {
        matchTeam = reportTeam === 'all' || b.teamName === reportTeam;
      } else if (userRole === 'gdda') {
        const assignedProjects = userProfile?.assignedProjects || [];
        if (!assignedProjects.includes(b.projectId)) return false;
        matchTeam = reportTeam === 'all' || b.teamName === reportTeam;
      } else {
        matchTeam = b.teamName === userProfile?.teamName;
      }

      const matchMonth = b.month === reportMonth;
      const matchRegion = reportRegion === 'all' || (project?.region === reportRegion);
      const matchType = reportType === 'all' || (project?.type === reportType);
      return matchProject && matchTeam && matchMonth && matchRegion && matchType;
    });
  }, [budgets, reportProject, reportTeam, reportMonth, reportRegion, reportType, projects, userRole, userProfile]);

  const filteredCosts = useMemo(() => {
    return costs.filter(c => {
      const project = projects.find(p => p.id === c.projectId);
      const matchProject = reportProject === 'all' || c.projectId === reportProject;
      
      let matchTeam = true;
      if (userRole === 'super_admin' || userRole === 'admin') {
        matchTeam = reportTeam === 'all' || c.teamName === reportTeam;
      } else if (userRole === 'gdda') {
        const assignedProjects = userProfile?.assignedProjects || [];
        if (!assignedProjects.includes(c.projectId)) return false;
        matchTeam = reportTeam === 'all' || c.teamName === reportTeam;
      } else {
        matchTeam = c.teamName === userProfile?.teamName;
      }

      // Map cost date to marketing month
      const costDate = c.createdAt?.toDate ? c.createdAt.toDate() : null;
      const mMonth = costDate ? getMarketingMonth(costDate) : null;
      const matchMonth = mMonth === reportMonth;
      const matchRegion = reportRegion === 'all' || (project?.region === reportRegion);
      const matchType = reportType === 'all' || (project?.type === reportType);
      return matchProject && matchTeam && matchMonth && matchRegion && matchType;
    });
  }, [costs, reportProject, reportTeam, reportMonth, getMarketingMonth, reportRegion, reportType, projects, userRole, userProfile]);

  const uniqueTeams = useMemo(() => {
    return Array.from(new Set(teams.map(t => t.name)));
  }, [teams]);

  const uniqueRegions = useMemo(() => {
    const regions = projects.map(p => p.region).filter(Boolean);
    return Array.from(new Set(regions));
  }, [projects]);

  const uniqueTypes = useMemo(() => {
    const types = projects.map(p => p.type).filter(Boolean);
    return Array.from(new Set(types));
  }, [projects]);

  const chartData = useMemo(() => {
    return uniqueTeams.filter(t => reportTeam === 'all' || t === reportTeam).map(team => {
      const teamBudgets = filteredBudgets.filter(b => b.teamName === team);
      const teamTotalBudget = teamBudgets.reduce((acc, curr) => acc + curr.amount, 0);
      const teamTotalCost = filteredCosts
        .filter(c => c.teamName === team)
        .reduce((acc, curr) => acc + curr.amount, 0);
      
      return {
        name: team,
        budget: teamTotalBudget,
        actual: teamTotalCost
      };
    }).filter(d => d.budget > 0 || d.actual > 0);
  }, [uniqueTeams, filteredBudgets, filteredCosts, reportTeam]);

  const regionChartData = useMemo(() => {
    return uniqueRegions.map(region => {
      const regionBudgets = filteredBudgets.filter(b => {
        const p = projects.find(proj => proj.id === b.projectId);
        return p?.region === region;
      });
      const regionCosts = filteredCosts.filter(c => {
        const p = projects.find(proj => proj.id === c.projectId);
        return p?.region === region;
      });

      return {
        name: region,
        budget: regionBudgets.reduce((acc, curr) => acc + curr.amount, 0),
        actual: regionCosts.reduce((acc, curr) => acc + curr.amount, 0)
      };
    }).filter(d => d.budget > 0 || d.actual > 0);
  }, [uniqueRegions, filteredBudgets, filteredCosts, projects]);

  const typeChartData = useMemo(() => {
    return uniqueTypes.map(type => {
      const typeBudgets = filteredBudgets.filter(b => {
        const p = projects.find(proj => proj.id === b.projectId);
        return p?.type === type;
      });
      const typeCosts = filteredCosts.filter(c => {
        const p = projects.find(proj => proj.id === c.projectId);
        return p?.type === type;
      });

      return {
        name: type,
        budget: typeBudgets.reduce((acc, curr) => acc + curr.amount, 0),
        actual: typeCosts.reduce((acc, curr) => acc + curr.amount, 0)
      };
    }).filter(d => d.budget > 0 || d.actual > 0);
  }, [uniqueTypes, filteredBudgets, filteredCosts, projects]);

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
      return `${format(monday, 'dd/MM')} - ${format(sunday, 'dd/MM')}`;
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
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">Marketing Cost Control</CardTitle>
              <CardDescription className="text-slate-500">Hệ thống quản lý chi phí marketing bất động sản</CardDescription>
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

  const isSuperAdmin = userRole === 'super_admin';
  const isAdmin = userRole === 'super_admin' || userRole === 'admin';
  const isGDDA = userRole === 'gdda';
  const isUser = userRole === 'user';

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 w-full bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-slate-900 leading-none">Marketing Control</h1>
              <div className="flex gap-1 mt-1">
                {isSuperAdmin && <Badge variant="outline" className="text-[10px] py-0 h-4 border-purple-200 text-purple-600 bg-purple-50">SUPER ADMIN</Badge>}
                {userRole === 'admin' && <Badge variant="outline" className="text-[10px] py-0 h-4 border-blue-200 text-blue-600 bg-blue-50">ADMIN</Badge>}
                {isGDDA && <Badge variant="outline" className="text-[10px] py-0 h-4 border-amber-200 text-amber-600 bg-amber-50">GDDA</Badge>}
                {isUser && <Badge variant="outline" className="text-[10px] py-0 h-4 border-slate-200 text-slate-600 bg-slate-50">USER</Badge>}
              </div>
            </div>
          </div>
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
                <Wallet className="w-4 h-4" /> Ngân sách tháng này (21-{format(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 21), 'MM')} đến 20-{format(new Date(), 'MM')})
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

        <Tabs defaultValue={isAdmin || isGDDA ? "admin" : "register"} className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1 rounded-xl h-auto flex-wrap sm:flex-nowrap">
            {(isAdmin || isGDDA) && (
              <TabsTrigger value="admin" className="rounded-lg py-2 px-4 data-[state=active]:bg-slate-100 data-[state=active]:shadow-none">
                <BarChart3 className="w-4 h-4 mr-2" /> Báo cáo
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="settings" className="rounded-lg py-2 px-4 data-[state=active]:bg-slate-100 data-[state=active]:shadow-none">
                <ShieldCheck className="w-4 h-4 mr-2" /> Quản trị
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="users" className="rounded-lg py-2 px-4 data-[state=active]:bg-slate-100 data-[state=active]:shadow-none">
                <Users className="w-4 h-4 mr-2" /> Người dùng
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

          {/* Report Tab (Visible to Admin and GDDA) */}
          {(isAdmin || isGDDA) && (
            <TabsContent value="admin" className="space-y-6">
              <Card className="border-none shadow-sm bg-white overflow-hidden">
                <div className="h-1.5 bg-blue-600 w-full" />
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
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
                            .filter(p => {
                              const matchSearch = p.name.toLowerCase().includes(reportProjectSearch.toLowerCase());
                              if (isGDDA) {
                                return matchSearch && (userProfile?.assignedProjects || []).includes(p.id);
                              }
                              return matchSearch;
                            })
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
                          <SelectItem value="Cao tầng">Cao tầng</SelectItem>
                          <SelectItem value="Thấp tầng">Thấp tầng</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 min-w-[200px] space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
                        {reportMonth ? getMarketingMonthDisplayRange(reportMonth) : 'Kỳ báo cáo'}
                      </Label>
                      <Input type="month" className="bg-white border-none shadow-sm" value={reportMonth} onChange={e => setReportMonth(e.target.value)} />
                    </div>
                  </div>

                  {/* Summary Cards - Visible to Admin and GDDA */}
                  {(isAdmin || isGDDA) && (
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
                      <div className="flex items-center justify-between mb-4">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Biểu đồ so sánh Ngân sách vs Thực chi</Label>
                        <TabsList className="bg-slate-100 p-1 h-8">
                          <TabsTrigger value="team" className="text-[10px] px-3 h-6">Theo Team</TabsTrigger>
                          <TabsTrigger value="region" className="text-[10px] px-3 h-6">Theo Miền</TabsTrigger>
                          <TabsTrigger value="type" className="text-[10px] px-3 h-6">Theo Loại hình</TabsTrigger>
                        </TabsList>
                      </div>

                      <TabsContent value="team" className="mt-0">
                        <div className="h-[350px] w-full bg-white p-4 rounded-2xl border border-slate-100">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`} />
                              <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: number) => [value.toLocaleString() + ' đ', '']}
                              />
                              <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                              <Bar dataKey="budget" name="Ngân sách" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={30} />
                              <Bar dataKey="actual" name="Thực chi" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </TabsContent>

                      <TabsContent value="region" className="mt-0">
                        <div className="h-[350px] w-full bg-white p-4 rounded-2xl border border-slate-100">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={regionChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`} />
                              <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: number) => [value.toLocaleString() + ' đ', '']}
                              />
                              <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                              <Bar dataKey="budget" name="Ngân sách" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={30} />
                              <Bar dataKey="actual" name="Thực chi" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </TabsContent>

                      <TabsContent value="type" className="mt-0">
                        <div className="h-[350px] w-full bg-white p-4 rounded-2xl border border-slate-100">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={typeChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`} />
                              <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: number) => [value.toLocaleString() + ' đ', '']}
                              />
                              <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                              <Bar dataKey="budget" name="Ngân sách" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={30} />
                              <Bar dataKey="actual" name="Thực chi" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>

                  {/* Table Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Bảng tổng hợp theo Team</Label>
                    </div>
                    <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="w-[200px]">Đội (Team)</TableHead>
                            <TableHead>Dự án</TableHead>
                            <TableHead className="text-right">Ngân sách</TableHead>
                            <TableHead className="text-right">Thực chi</TableHead>
                            <TableHead className="text-right">Chênh lệch</TableHead>
                            <TableHead className="text-center">Trạng thái</TableHead>
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
                            const percent = teamTotalBudget > 0 ? (teamTotalCost / teamTotalBudget) * 100 : 0;
                            
                            let status = 'Bình thường';
                            let statusColor = 'text-green-600 bg-green-50';
                            if (percent > 100) {
                              status = 'Vượt ngân sách';
                              statusColor = 'text-red-600 bg-red-50';
                            } else if (percent > 90) {
                              status = 'Sắp hết';
                              statusColor = 'text-amber-600 bg-amber-50';
                            }

                            return (
                              <React.Fragment key={team}>
                                <TableRow className="bg-slate-50/30 font-medium">
                                  <TableCell className="font-bold text-slate-900">{team}</TableCell>
                                  <TableCell className="text-slate-400 text-xs italic">Tổng cộng team</TableCell>
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
                    <Label className="text-xs text-slate-500 uppercase">Chi tiết ngân sách đăng ký</Label>
                      <Table>
                        <TableHeader>
                          <TableRow>
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
                            <TableRow key={b.id}>
                              <TableCell className="font-medium">{b.teamName}</TableCell>
                              <TableCell>{b.implementerName}</TableCell>
                              <TableCell>{projectMap[b.projectId]}</TableCell>
                              <TableCell className="text-right font-mono">
                                {editingBudgetId === b.id ? (
                                  <Input 
                                    type="number" 
                                    value={editingBudgetAmount} 
                                    onChange={(e) => setEditingBudgetAmount(e.target.value)}
                                    className="h-8 w-32 text-right"
                                  />
                                ) : (
                                  `${b.amount.toLocaleString()} đ`
                                )}
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{b.userEmail}</span>
                                </div>
                              </TableCell>
                              {isAdmin && (
                                <TableCell>
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
                                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleDeleteBudget(b.id)}>
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
          )}

          {/* Settings Tab (Admin only) */}
          {isAdmin && (
            <TabsContent value="settings" className="space-y-6">
              <Tabs defaultValue="projects" className="space-y-6">
                <TabsList className="bg-slate-100/50 p-1 rounded-xl h-auto w-full justify-start border border-slate-200">
                  <TabsTrigger value="projects" className="rounded-lg py-2 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <Building2 className="w-4 h-4 mr-2" /> Quản lý Dự án
                  </TabsTrigger>
                  <TabsTrigger value="teams" className="rounded-lg py-2 px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <Users className="w-4 h-4 mr-2" /> Quản lý Team
                  </TabsTrigger>
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
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button className="bg-blue-600 hover:bg-blue-700">
                                <Plus className="w-4 h-4 mr-2" /> Thêm dự án
                              </Button>
                            </DialogTrigger>
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
                                    <Input 
                                      placeholder="VD: Quận 9, Thủ Đức..." 
                                      value={newProjectRegion} 
                                      onChange={e => setNewProjectRegion(e.target.value)} 
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Loại hình</Label>
                                    <Select value={newProjectType} onValueChange={setNewProjectType}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Thấp tầng">Thấp tầng</SelectItem>
                                        <SelectItem value="Cao tầng">Cao tầng</SelectItem>
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
                        <Badge variant="secondary">{projects.length} tổng số</Badge>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-xl border border-slate-100 overflow-hidden">
                          <Table>
                            <TableHeader className="bg-slate-50">
                              <TableRow>
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
                                <TableRow key={p.id}>
                                  <TableCell className="font-medium">
                                    {editingProjectId === p.id ? (
                                      <Input value={editingProjectName} onChange={e => setEditingProjectName(e.target.value)} className="h-8" />
                                    ) : p.name}
                                  </TableCell>
                                  <TableCell>
                                    {editingProjectId === p.id ? (
                                      <Input value={editingProjectRegion} onChange={e => setEditingProjectRegion(e.target.value)} className="h-8" />
                                    ) : (
                                      <Badge variant="outline" className="font-normal border-slate-200">{p.region || 'Chưa xác định'}</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {editingProjectId === p.id ? (
                                      <Select value={editingProjectType} onValueChange={setEditingProjectType}>
                                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Thấp tầng">Thấp tầng</SelectItem>
                                          <SelectItem value="Cao tầng">Cao tầng</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.type === 'Cao tầng' ? 'bg-purple-50 text-purple-600' : 'bg-orange-50 text-orange-600'}`}>
                                        {p.type || 'Thấp tầng'}
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-xs text-slate-500">
                                    {format(p.createdAt?.toDate ? p.createdAt.toDate() : new Date(), 'dd/MM/yyyy')}
                                  </TableCell>
                                  <TableCell className="text-right">
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
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button className="bg-blue-600 hover:bg-blue-700">
                                <Plus className="w-4 h-4 mr-2" /> Thêm Team
                              </Button>
                            </DialogTrigger>
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
                                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                                    Xác nhận thêm Team
                                  </Button>
                                </DialogFooter>
                              </form>
                            </DialogContent>
                          </Dialog>
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
                        <Badge variant="secondary">{teams.length} tổng số</Badge>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-xl border border-slate-100 overflow-hidden">
                          <Table>
                            <TableHeader className="bg-slate-50">
                              <TableRow>
                                <TableHead className="cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setTeamSort({ key: 'name', direction: teamSort.direction === 'asc' ? 'desc' : 'asc' })}>
                                  <div className="flex items-center gap-2">Tên Team <ArrowUpDown className="w-3 h-3" /></div>
                                </TableHead>
                                <TableHead>Ngày tạo</TableHead>
                                <TableHead className="text-right">Thao tác</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sortedTeams.map(t => (
                                <TableRow key={t.id}>
                                  <TableCell className="font-medium">
                                    {editingTeamId === t.id ? (
                                      <Input value={editingTeamName} onChange={e => setEditingTeamName(e.target.value)} className="h-8" />
                                    ) : t.name}
                                  </TableCell>
                                  <TableCell className="text-xs text-slate-500">
                                    {format(t.createdAt?.toDate ? t.createdAt.toDate() : new Date(), 'dd/MM/yyyy')}
                                  </TableCell>
                                  <TableCell className="text-right">
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
                            <SelectItem value="Cao tầng">Cao tầng</SelectItem>
                            <SelectItem value="Thấp tầng">Thấp tầng</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 min-w-[200px] space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
                          {reportMonth ? getMarketingMonthDisplayRange(reportMonth) : 'Kỳ báo cáo'}
                        </Label>
                        <Input type="month" className="bg-white border-none shadow-sm" value={reportMonth} onChange={e => setReportMonth(e.target.value)} />
                      </div>
                    </div>

                    {/* Summary Cards - Visible to Admin and GDDA */}
                    {(isAdmin || isGDDA) && (
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
                        <div className="flex items-center justify-between mb-4">
                          <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Biểu đồ so sánh Ngân sách vs Thực chi</Label>
                          <TabsList className="bg-slate-100 p-1 h-8">
                            <TabsTrigger value="team" className="text-[10px] px-3 h-6">Theo Team</TabsTrigger>
                            <TabsTrigger value="region" className="text-[10px] px-3 h-6">Theo Miền</TabsTrigger>
                            <TabsTrigger value="type" className="text-[10px] px-3 h-6">Theo Loại hình</TabsTrigger>
                          </TabsList>
                        </div>

                        <TabsContent value="team" className="mt-0">
                          <div className="h-[350px] w-full bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} formatter={(value: number) => [value.toLocaleString() + ' đ']} />
                                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                                <Bar dataKey="budget" name="Ngân sách" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                                <Bar dataKey="actual" name="Thực chi" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </TabsContent>

                        <TabsContent value="region" className="mt-0">
                          <div className="h-[350px] w-full bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={regionChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} formatter={(value: number) => [value.toLocaleString() + ' đ']} />
                                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                                <Bar dataKey="budget" name="Ngân sách" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={24} />
                                <Bar dataKey="actual" name="Thực chi" fill="#ec4899" radius={[4, 4, 0, 0]} barSize={24} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </TabsContent>

                        <TabsContent value="type" className="mt-0">
                          <div className="h-[350px] w-full bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={typeChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} formatter={(value: number) => [value.toLocaleString() + ' đ']} />
                                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                                <Bar dataKey="budget" name="Ngân sách" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={24} />
                                <Bar dataKey="actual" name="Thực chi" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={24} />
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
                    <Label className="text-xs text-slate-500 uppercase">Chi tiết ngân sách đăng ký</Label>
                      <Table>
                        <TableHeader>
                          <TableRow>
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
                            <TableRow key={b.id}>
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
                                    type="number" 
                                    className="h-8 text-right" 
                                    value={editingBudgetAmount} 
                                    onChange={e => setEditingBudgetAmount(e.target.value)} 
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
                                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleDeleteBudget(b.id)}>
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
            </TabsContent>
          )}

          {/* Users Tab (Admin only) */}
          {isAdmin && (
            <TabsContent value="users" className="space-y-6">
              <Card className="border-none shadow-sm bg-white overflow-hidden">
                <div className="h-1.5 bg-purple-600 w-full" />
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" /> Quản lý Người dùng & Phân quyền
                  </CardTitle>
                  <CardDescription>Cấp quyền Super Admin, Admin, GDDA hoặc User cho nhân viên</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-2xl border border-slate-100 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead>Họ tên</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead>Vai trò</TableHead>
                          <TableHead>Dự án gán (GDDA)</TableHead>
                          <TableHead className="text-right">Thao tác</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allUsers.map(u => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">{u.fullName || 'Chưa cập nhật'}</TableCell>
                            <TableCell className="text-slate-500 text-xs">{u.email}</TableCell>
                            <TableCell className="text-slate-600">{u.teamName || 'Chưa gán'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`
                                ${u.role === 'super_admin' ? 'border-purple-200 text-purple-600 bg-purple-50' : 
                                  u.role === 'admin' ? 'border-blue-200 text-blue-600 bg-blue-50' :
                                  u.role === 'gdda' ? 'border-amber-200 text-amber-600 bg-amber-50' :
                                  'border-slate-200 text-slate-600 bg-slate-50'}
                              `}>
                                {u.role === 'super_admin' ? 'Super Admin' : 
                                 u.role === 'admin' ? 'Admin' :
                                 u.role === 'gdda' ? 'GDDA' : 'User'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {u.role === 'gdda' ? (
                                <div className="flex flex-wrap gap-1">
                                  {(u.assignedProjects || []).map((pid: string) => (
                                    <Badge key={pid} variant="secondary" className="text-[10px]">
                                      {projectMap[pid] || pid}
                                    </Badge>
                                  ))}
                                  {(u.assignedProjects || []).length === 0 && <span className="text-[10px] text-slate-400 italic">Chưa gán dự án</span>}
                                </div>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600">
                                      <ShieldCheck className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Phân quyền người dùng</DialogTitle>
                                      <DialogDescription>Thay đổi vai trò cho {u.fullName || u.email}</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                      <div className="space-y-2">
                                        <Label>Vai trò</Label>
                                        <Select defaultValue={u.role} onValueChange={(val) => handleUpdateUserRole(u.id, val)}>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Chọn vai trò" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="super_admin">Super Admin (Full quyền)</SelectItem>
                                            <SelectItem value="admin">Admin (Xem toàn bộ báo cáo)</SelectItem>
                                            <SelectItem value="gdda">GDDA (Xem báo cáo dự án được gán)</SelectItem>
                                            <SelectItem value="user">User (Chỉ đăng ký & xem team mình)</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>

                                {u.role === 'gdda' && (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-amber-600">
                                        <Building2 className="h-4 w-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl">
                                      <DialogHeader>
                                        <DialogTitle>Gán dự án cho GDDA</DialogTitle>
                                        <DialogDescription>Chọn các dự án mà {u.fullName} có quyền xem báo cáo tổng</DialogDescription>
                                      </DialogHeader>
                                      <div className="grid grid-cols-2 gap-2 py-4 max-h-[400px] overflow-y-auto">
                                        {projects.map(p => {
                                          const isAssigned = (u.assignedProjects || []).includes(p.id);
                                          return (
                                            <div 
                                              key={p.id} 
                                              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isAssigned ? 'border-amber-200 bg-amber-50' : 'border-slate-100 hover:bg-slate-50'}`}
                                              onClick={() => {
                                                const current = u.assignedProjects || [];
                                                const next = isAssigned 
                                                  ? current.filter((id: string) => id !== p.id)
                                                  : [...current, p.id];
                                                handleUpdateUserProjects(u.id, next);
                                              }}
                                            >
                                              <div className="flex flex-col">
                                                <span className="text-sm font-medium">{p.name}</span>
                                                <span className="text-[10px] text-slate-400">{p.region} - {p.type}</span>
                                              </div>
                                              {isAssigned ? <Check className="w-4 h-4 text-amber-600" /> : <Plus className="w-4 h-4 text-slate-300" />}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                )}
                              </div>
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
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dự án</Label>
                      <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                        <SelectTrigger className="bg-slate-50 border-slate-200 focus:ring-blue-500 h-11">
                          <SelectValue placeholder="Chọn dự án">
                            {projectMap[selectedProjectId]}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
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
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
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
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kỳ báo cáo (Tháng)</Label>
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
                          type="number" 
                          placeholder="0" 
                          className="bg-slate-50 border-slate-200 focus:ring-blue-500 h-11 pr-12 font-mono font-bold text-blue-600"
                          value={budgetAmount} 
                          onChange={e => setBudgetAmount(e.target.value)} 
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
                    <div className="col-span-3">{budgetMonth}</div>
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
                  <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none">
                    {budgets.length} bản ghi
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="hover:bg-transparent border-b border-slate-100">
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-4">Dự án</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-4">Team</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-4">Người triển khai</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-4">Tháng</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-4 text-right">Ngân sách</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-4">Người nhập</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {budgets.slice(0, 10).map(b => (
                        <TableRow key={b.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
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
                            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                              {b.month}
                            </span>
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
                          <SelectContent>
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
                                .filter(b => (isAdmin || b.userEmail === user.email) && b.month === getMarketingMonth(new Date()))
                                .filter(b => 
                                  projectMap[b.projectId]?.toLowerCase().includes(budgetSearch.toLowerCase()) ||
                                  b.teamName.toLowerCase().includes(budgetSearch.toLowerCase()) ||
                                  b.implementerName.toLowerCase().includes(budgetSearch.toLowerCase())
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
                            </SelectGroup>
                          </SelectContent>
                        </Select>
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
                            <Input type="number" className="h-9 text-xs font-mono" placeholder="0" value={fbAds} onChange={e => setFbAds(e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase">Google Ads</Label>
                            <Input type="number" className="h-9 text-xs font-mono" placeholder="0" value={googleAds} onChange={e => setGoogleAds(e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase">Zalo Ads</Label>
                            <Input type="number" className="h-9 text-xs font-mono" placeholder="0" value={zaloAds} onChange={e => setZaloAds(e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase">Đăng tin</Label>
                            <Input type="number" className="h-9 text-xs font-mono" placeholder="0" value={posting} onChange={e => setPosting(e.target.value)} />
                          </div>
                          <div className="space-y-1.5 col-span-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase">Khác</Label>
                            <Input type="number" className="h-9 text-xs font-mono" placeholder="0" value={otherCost} onChange={e => setOtherCost(e.target.value)} />
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
                  <CardHeader>
                    <CardTitle>Lịch sử chi phí thực tế</CardTitle>
                    <CardDescription>Danh sách các khoản chi đã cập nhật trong kỳ</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Dự án / Team</TableHead>
                          <TableHead>Người triển khai</TableHead>
                          <TableHead>Thời gian</TableHead>
                          <TableHead className="text-right">Số tiền</TableHead>
                          <TableHead>Ghi chú</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {costs
                          .filter(c => isAdmin || c.userEmail === user.email)
                          .slice(0, 15)
                          .map(c => (
                          <TableRow key={c.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{projectMap[c.projectId] || c.projectName}</span>
                                <span className="text-[10px] text-slate-500">{c.teamName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">{c.implementerName}</TableCell>
                            <TableCell className="text-xs">Tuần {c.weekNumber}</TableCell>
                            <TableCell className="text-right font-mono font-medium">{c.amount.toLocaleString()} đ</TableCell>
                            <TableCell className="text-xs italic text-slate-500 max-w-[150px] truncate">{c.note || '-'}</TableCell>
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
                          ID: {log.docId} | {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'HH:mm dd/MM/yyyy') : '...'}
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
    </div>
  );
}
