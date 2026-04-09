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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LogIn, LogOut, Plus, History, TrendingUp, Wallet, Building2, ShieldCheck, BarChart3, Users, Edit2, Trash2, X, Check } from 'lucide-react';
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
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [costs, setCosts] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Helper for Marketing Month (21st of prev month to 20th of current month)
  const getMarketingMonth = (date: Date) => {
    const d = new Date(date);
    const day = d.getDate();
    if (day >= 21) {
      d.setMonth(d.getMonth() + 1);
    }
    return format(d, 'yyyy-MM');
  };

  // Form states
  const [newProjectName, setNewProjectName] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [actualProjectId, setActualProjectId] = useState('');
  const [selectedTeamName, setSelectedTeamName] = useState('');
  const [implementerName, setImplementerName] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [teamName, setTeamName] = useState('');
  const [budgetMonth, setBudgetMonth] = useState(getMarketingMonth(new Date()));
  
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

  // Report filters
  const [reportProject, setReportProject] = useState('all');
  const [reportTeam, setReportTeam] = useState('all');
  const [reportMonth, setReportMonth] = useState(getMarketingMonth(new Date()));

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
        
        let role: 'admin' | 'user' = 'user';
        if (firebaseUser.email === 'thienvu1108@gmail.com') {
          role = 'admin';
        }

        if (!userDoc.exists()) {
          await setDoc(userDocRef, {
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            role: role,
            createdAt: serverTimestamp()
          });
        } else {
          role = userDoc.data()?.role || 'user';
        }
        
        setUserRole(role);
        setUser(firebaseUser);
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
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

    return () => {
      unsubProjects();
      unsubTeams();
      unsubBudgets();
      unsubCosts();
      unsubLogs();
    };
  }, [user]);

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
          createdAt: serverTimestamp(),
          createdBy: user?.uid
        });
        await logAction('CREATE', 'projects', docRef.id, { name });
        successCount++;
        existingNames.add(name.toLowerCase());
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'projects');
      }
    }
    
    setNewProjectName('');
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

  const handleUpdateProject = async (id: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      await updateDoc(doc(db, 'projects', id), { name: newName });
      await logAction('UPDATE', 'projects', id, { name: newName });
      setEditingProjectId(null);
      toast.success('Đã cập nhật dự án');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'projects');
    }
  };

  const handleDeleteProject = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa dự án "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'projects', id));
      await logAction('DELETE', 'projects', id, { name });
      toast.success('Đã xóa dự án');
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

  const handleDeleteTeam = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa team "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'teams', id));
      await logAction('DELETE', 'teams', id, { name });
      toast.success('Đã xóa team');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'teams');
    }
  };

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !budgetAmount || !selectedTeamName || !budgetMonth || !implementerName) return;
    const project = projects.find(p => p.id === selectedProjectId);
    try {
      const docRef = await addDoc(collection(db, 'budgets'), {
        projectId: selectedProjectId,
        projectName: project?.name,
        teamName: selectedTeamName,
        implementerName: implementerName,
        month: budgetMonth,
        amount: Number(budgetAmount),
        createdAt: serverTimestamp(),
        createdBy: user?.uid,
        userEmail: user?.email
      });
      await logAction('CREATE', 'budgets', docRef.id, { projectName: project?.name, amount: budgetAmount, implementer: implementerName });
      setBudgetAmount('');
      setImplementerName('');
      setSelectedProjectId('');
      setSelectedTeamName('');
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
    
    // Parse week string (e.g., "2024-W15")
    const [year, weekStr] = costWeek.split('-W');
    const weekNumber = Number(weekStr);

    try {
      const docRef = await addDoc(collection(db, 'costs'), {
        projectId: actualProjectId,
        projectName: project?.name,
        budgetId: selectedBudgetId,
        implementerName: budget?.implementerName,
        teamName: budget?.teamName,
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
        projectName: projectMap[editingBudgetProject]
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

  // Reporting Logic
  const filteredBudgets = useMemo(() => {
    return budgets.filter(b => {
      const matchProject = reportProject === 'all' || b.projectId === reportProject;
      const matchTeam = reportTeam === 'all' || b.teamName === reportTeam;
      const matchMonth = b.month === reportMonth;
      return matchProject && matchTeam && matchMonth;
    });
  }, [budgets, reportProject, reportTeam, reportMonth]);

  const filteredCosts = useMemo(() => {
    return costs.filter(c => {
      const matchProject = reportProject === 'all' || c.projectId === reportProject;
      // Map cost date to marketing month
      const costDate = c.createdAt?.toDate ? c.createdAt.toDate() : null;
      const mMonth = costDate ? getMarketingMonth(costDate) : null;
      const matchMonth = mMonth === reportMonth;
      return matchProject && matchMonth;
    });
  }, [costs, reportProject, reportMonth, getMarketingMonth]);

  const uniqueTeams = useMemo(() => {
    return teams.map(t => t.name);
  }, [teams]);

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

  const isAdmin = userRole === 'admin';

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
              {isAdmin && <Badge variant="outline" className="w-fit mt-1 text-[10px] py-0 h-4 border-blue-200 text-blue-600 bg-blue-50">ADMIN</Badge>}
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

        <Tabs defaultValue={isAdmin ? "admin" : "register"} className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1 rounded-xl h-auto flex-wrap sm:flex-nowrap">
            {isAdmin && (
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
          {isAdmin && (
            <TabsContent value="admin" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Project Management */}
                <Card className="border-none shadow-sm lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" /> Quản lý dự án
                    </CardTitle>
                    <CardDescription>Thêm các dự án bất động sản mới</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <form onSubmit={handleAddProject} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Tên dự án (Nhập mỗi dòng 1 dự án)</Label>
                        <textarea 
                          className="flex min-h-[100px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="VD: Vinhomes Grand Park&#10;Vinhomes Central Park" 
                          value={newProjectName} 
                          onChange={e => setNewProjectName(e.target.value)} 
                        />
                      </div>
                      <Button type="submit" className="w-full">
                        <Plus className="w-4 h-4 mr-2" /> Thêm danh sách dự án
                      </Button>
                    </form>
                    <div className="pt-6 border-t border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Danh sách dự án ({projects.length})</Label>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {projects.length === 0 ? (
                          <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl">
                            <Building2 className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-xs text-slate-400">Chưa có dự án nào</p>
                          </div>
                        ) : (
                          projects.map(p => (
                            <div key={p.id} className="group p-3 rounded-xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all flex flex-col gap-2">
                              <div className="flex justify-between items-center">
                                {editingProjectId === p.id ? (
                                  <div className="flex items-center gap-2 flex-1">
                                    <Input 
                                      className="h-9 text-sm border-blue-200 focus:ring-blue-100" 
                                      value={editingProjectName} 
                                      onChange={e => setEditingProjectName(e.target.value)}
                                      autoFocus
                                    />
                                    <Button size="icon" variant="ghost" className="h-9 w-9 text-green-600 hover:bg-green-50" onClick={() => handleUpdateProject(p.id, editingProjectName)}>
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-9 w-9 text-slate-400 hover:bg-slate-50" onClick={() => setEditingProjectId(null)}>
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="font-semibold text-sm text-slate-700">{p.name}</span>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => {
                                        setEditingProjectId(p.id);
                                        setEditingProjectName(p.name);
                                      }}>
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteProject(p.id, p.name)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-[10px] bg-slate-50 text-slate-500 border-none font-normal">
                                  Ngày tạo: {format(p.createdAt?.toDate ? p.createdAt.toDate() : new Date(), 'dd/MM/yyyy')}
                                </Badge>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Team Management */}
                <Card className="border-none shadow-sm lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" /> Quản lý Team
                    </CardTitle>
                    <CardDescription>Thêm các đội marketing mới</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <form onSubmit={handleAddTeam} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Tên Team (Nhập mỗi dòng 1 team)</Label>
                        <textarea 
                          className="flex min-h-[100px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="VD: Team Facebook&#10;Team Google" 
                          value={newTeamName} 
                          onChange={e => setNewTeamName(e.target.value)} 
                        />
                      </div>
                      <Button type="submit" className="w-full">
                        <Plus className="w-4 h-4 mr-2" /> Thêm danh sách Team
                      </Button>
                    </form>
                    <div className="pt-6 border-t border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Danh sách Team ({teams.length})</Label>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {teams.length === 0 ? (
                          <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl">
                            <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-xs text-slate-400">Chưa có team nào</p>
                          </div>
                        ) : (
                          teams.map(t => (
                            <div key={t.id} className="group p-3 rounded-xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all flex flex-col gap-2">
                              <div className="flex justify-between items-center">
                                {editingTeamId === t.id ? (
                                  <div className="flex items-center gap-2 flex-1">
                                    <Input 
                                      className="h-9 text-sm border-blue-200 focus:ring-blue-100" 
                                      value={editingTeamName} 
                                      onChange={e => setEditingTeamName(e.target.value)}
                                      autoFocus
                                    />
                                    <Button size="icon" variant="ghost" className="h-9 w-9 text-green-600 hover:bg-green-50" onClick={() => handleUpdateTeam(t.id, editingTeamName)}>
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-9 w-9 text-slate-400 hover:bg-slate-50" onClick={() => setEditingTeamId(null)}>
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="font-semibold text-sm text-slate-700">{t.name}</span>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => {
                                        setEditingTeamId(t.id);
                                        setEditingTeamName(t.name);
                                      }}>
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteTeam(t.id, t.name)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-[10px] bg-slate-50 text-slate-500 border-none font-normal">
                                  Ngày tạo: {format(t.createdAt?.toDate ? t.createdAt.toDate() : new Date(), 'dd/MM/yyyy')}
                                </Badge>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Reports & Analytics */}
                <Card className="border-none shadow-sm lg:col-span-2">
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
                            <SelectItem value="all">Tất cả dự án</SelectItem>
                            {projects.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 min-w-[200px] space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Đội (Team)</Label>
                        <Select value={reportTeam} onValueChange={setReportTeam}>
                          <SelectTrigger className="bg-white border-none shadow-sm">
                            <SelectValue placeholder="Tất cả đội" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tất cả đội</SelectItem>
                            {uniqueTeams.map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 min-w-[200px] space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Kỳ báo cáo (Tháng)</Label>
                        <Input type="month" className="bg-white border-none shadow-sm" value={reportMonth} onChange={e => setReportMonth(e.target.value)} />
                      </div>
                    </div>

                    {/* Summary Cards */}
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

                    {/* Chart Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Biểu đồ so sánh Ngân sách vs Thực chi</Label>
                      </div>
                      <div className="h-[350px] w-full bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: '#64748b', fontSize: 12 }}
                              dy={10}
                            />
                            <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: '#64748b', fontSize: 12 }}
                              tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                            />
                            <Tooltip 
                              cursor={{ fill: '#f1f5f9' }}
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              formatter={(value: number) => [value.toLocaleString() + ' đ']}
                            />
                            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                            <Bar dataKey="budget" name="Ngân sách" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                            <Bar dataKey="actual" name="Thực chi" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
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
              </div>
            </TabsContent>
          )}

          {/* Budget Registration Tab */}
          <TabsContent value="register" className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Đăng ký ngân sách tháng</CardTitle>
                <CardDescription>Nhập ngân sách dự kiến cho các chiến dịch marketing</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddBudget} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                  <div className="space-y-2">
                    <Label>Dự án</Label>
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn dự án">
                          {projectMap[selectedProjectId]}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Team</Label>
                    <Select value={selectedTeamName} onValueChange={setSelectedTeamName}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn team" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map(t => (
                          <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Người triển khai</Label>
                    <Input placeholder="Tên người chạy" value={implementerName} onChange={e => setImplementerName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tháng</Label>
                    <Input type="month" value={budgetMonth} onChange={e => setBudgetMonth(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Số tiền (VNĐ)</Label>
                    <Input type="number" placeholder="0" value={budgetAmount} onChange={e => setBudgetAmount(e.target.value)} />
                  </div>
                  <Button type="submit" className="lg:col-span-5 bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" /> Đăng ký ngay
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Danh sách đăng ký gần đây</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dự án</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Người triển khai</TableHead>
                      <TableHead>Tháng</TableHead>
                      <TableHead className="text-right">Ngân sách</TableHead>
                      <TableHead>Người nhập</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {budgets.slice(0, 10).map(b => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{projectMap[b.projectId] || b.projectName || 'N/A'}</TableCell>
                        <TableCell>{b.teamName}</TableCell>
                        <TableCell>{b.implementerName}</TableCell>
                        <TableCell>{b.month}</TableCell>
                        <TableCell className="text-right font-mono">{b.amount.toLocaleString()} đ</TableCell>
                        <TableCell className="text-xs text-slate-500">{b.userEmail}</TableCell>
                      </TableRow>
                    ))}
                    {budgets.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-400">Chưa có dữ liệu đăng ký</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Actual Cost Tab */}
          <TabsContent value="actual" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-6">
                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <CardTitle>Cập nhật chi phí hàng tuần</CardTitle>
                    <CardDescription>Chọn khoản ngân sách bạn đã đăng ký để nhập chi phí</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddCost} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Khoản ngân sách (Dự án - Team - Người triển khai)</Label>
                        <Select value={selectedBudgetId} onValueChange={(val) => {
                          setSelectedBudgetId(val);
                          const budget = budgets.find(b => b.id === val);
                          if (budget) setActualProjectId(budget.projectId);
                        }}>
                          <SelectTrigger className="h-auto py-3">
                            <SelectValue placeholder="Chọn khoản ngân sách của bạn">
                              {selectedBudgetId ? (
                                (() => {
                                  const b = budgets.find(b => b.id === selectedBudgetId);
                                  return b ? `${b.teamName} - ${projectMap[b.projectId]} (${b.amount.toLocaleString()} đ)` : "Chọn khoản ngân sách của bạn";
                                })()
                              ) : "Chọn khoản ngân sách của bạn"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {budgets
                              .filter(b => (isAdmin || b.userEmail === user.email) && b.month === getMarketingMonth(new Date()))
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
                              ))}
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

                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Label>Tuần</Label>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                              {getWeekRange(costWeek)}
                            </span>
                          </div>
                          <Input type="week" value={costWeek} onChange={e => setCostWeek(e.target.value)} />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase">Facebook Ads</Label>
                            <Input type="number" className="h-8 text-xs" placeholder="0" value={fbAds} onChange={e => setFbAds(e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase">Google Ads</Label>
                            <Input type="number" className="h-8 text-xs" placeholder="0" value={googleAds} onChange={e => setGoogleAds(e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase">Zalo Ads</Label>
                            <Input type="number" className="h-8 text-xs" placeholder="0" value={zaloAds} onChange={e => setZaloAds(e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase">Đăng tin</Label>
                            <Input type="number" className="h-8 text-xs" placeholder="0" value={posting} onChange={e => setPosting(e.target.value)} />
                          </div>
                          <div className="space-y-1 col-span-2">
                            <Label className="text-[10px] uppercase">Khác</Label>
                            <Input type="number" className="h-8 text-xs" placeholder="0" value={otherCost} onChange={e => setOtherCost(e.target.value)} />
                          </div>
                          <div className="col-span-2 pt-2 border-t border-slate-200 flex justify-between items-center">
                            <span className="text-xs font-bold">Tổng cộng:</span>
                            <span className="text-sm font-bold text-blue-600">
                              {(Number(fbAds) + Number(posting) + Number(zaloAds) + Number(googleAds) + Number(otherCost)).toLocaleString()} đ
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Ghi chú</Label>
                        <Input placeholder="Nhập ghi chú chi phí..." value={costNote} onChange={e => setCostNote(e.target.value)} />
                      </div>
                      <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={!selectedBudgetId}>
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
    </div>
  );
}
