import React, { useState, useEffect, useMemo, memo } from 'react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

// Component Input có debounce để tránh re-render toàn bộ app khi gõ phím
const DebouncedInput = memo(({ 
  value: initialValue, 
  onChange, 
  debounce = 300, 
  ...props 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  debounce?: number; 
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value);
    }, debounce);

    return () => clearTimeout(timeout);
  }, [value, debounce, onChange]);

  return (
    <Input 
      {...props} 
      value={value} 
      onChange={e => setValue(e.target.value)} 
    />
  );
});

// Optimized searchable components for reports to prevent whole-app re-renders on every keystroke
const SearchableSelectGeneric = memo(({ 
  value, 
  onValueChange, 
  items, 
  placeholder, 
  searchPlaceholder = "Tìm kiếm...",
  noResultsText = "Không tìm thấy kết quả",
  triggerClassName,
  triggerDisplay,
  selectContentClassName,
  renderItem
}: any) => {
  const [search, setSearch] = useState('');
  const filteredItems = useMemo(() => {
    return items.filter((item: any) => 
      item.searchString.toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={`w-full overflow-hidden flex items-center justify-between ${triggerClassName}`}>
        <SelectValue placeholder={placeholder}>
          <span className="truncate block text-left flex-1">{triggerDisplay || placeholder}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className={selectContentClassName}>
        <div className="p-2 sticky top-0 bg-popover z-10 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <DebouncedInput
              placeholder={searchPlaceholder}
              className="pl-8 h-9"
              value={search}
              onChange={setSearch}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        {filteredItems.map((item: any) => renderItem ? renderItem(item) : (
          <SelectItem key={item.value} value={item.value}>
            <span className="truncate">{item.label}</span>
          </SelectItem>
        ))}
        {filteredItems.length === 0 && (
          <div className="p-4 text-center text-xs text-muted-foreground">{noResultsText}</div>
        )}
      </SelectContent>
    </Select>
  );
});

const SearchableRegionSelect = memo(({ value, onValueChange, regions }: any) => {
  const items = useMemo(() => {
    const list = [{ value: 'all', label: 'Tất cả miền', searchString: 'tất cả miền all' }];
    regions.forEach((r: string) => {
      list.push({ value: r, label: r, searchString: r.toLowerCase() });
    });
    return list;
  }, [regions]);

  return (
    <SearchableSelectGeneric
      value={value}
      onValueChange={onValueChange}
      items={items}
      placeholder="Tất cả miền"
      searchPlaceholder="Tìm miền..."
      triggerClassName="bg-white border-slate-200 shadow-sm transition-all hover:border-blue-300 focus:ring-2 focus:ring-blue-100 h-10"
      triggerDisplay={value === 'all' ? "Tất cả miền" : value}
    />
  );
});

const SearchableTypeSelect = memo(({ value, onValueChange, types }: any) => {
  const items = useMemo(() => {
    const list = [{ value: 'all', label: 'Tất cả loại hình', searchString: 'tất cả loại hình all' }];
    types.forEach((t: string) => {
      list.push({ value: t, label: t, searchString: t.toLowerCase() });
    });
    return list;
  }, [types]);

  return (
    <SearchableSelectGeneric
      value={value}
      onValueChange={onValueChange}
      items={items}
      placeholder="Tất cả loại hình"
      searchPlaceholder="Tìm loại hình..."
      triggerClassName="bg-white border-slate-200 shadow-sm transition-all hover:border-blue-300 focus:ring-2 focus:ring-blue-100 h-10"
      triggerDisplay={value === 'all' ? "Tất cả loại hình" : value}
    />
  );
});

const SearchableProjectSelect = memo(({ value, onValueChange, projects, projectMap }: any) => {
  const items = useMemo(() => {
    const list = projects.map((p: any) => ({
      value: p.id,
      label: `${p.name} (${p.projectCode})`,
      searchString: `${p.name} ${p.projectCode || ''}`
    }));
    return list;
  }, [projects]);

  return (
    <SearchableSelectGeneric
      value={value}
      onValueChange={onValueChange}
      items={items}
      placeholder="Tất cả dự án"
      searchPlaceholder="Tìm dự án..."
      triggerClassName="bg-white border-slate-200 shadow-sm transition-all hover:border-blue-300 focus:ring-2 focus:ring-blue-100 h-10"
      triggerDisplay={value === 'all' ? "Tất cả dự án" : `${projectMap[value] || value} (${projects.find((p: any) => p.id === value)?.projectCode || ''})`}
    />
  );
});

const SearchableTeamSelect = memo(({ value, onValueChange, teams, uniqueTeams }: any) => {
  const items = useMemo(() => {
    return uniqueTeams.map((t: string) => ({
      value: t,
      label: `${t} (${teams.find((team: any) => team.name === t)?.teamCode || ''})`,
      searchString: t
    }));
  }, [uniqueTeams, teams]);

  return (
    <SearchableSelectGeneric
      value={value}
      onValueChange={onValueChange}
      items={items}
      placeholder="Tất cả đội"
      searchPlaceholder="Tìm team..."
      triggerClassName="bg-white border-slate-200 shadow-sm transition-all hover:border-blue-300 focus:ring-2 focus:ring-blue-100 h-10"
      triggerDisplay={value === 'all' ? "Tất cả đội" : `${value} (${teams.find((t: any) => t.name === value)?.teamCode || ''})`}
    />
  );
});

const SearchableEfficiencyProjectSelect = memo(({ value, onValueChange, projects, projectMap }: any) => {
  const items = useMemo(() => {
    return projects.map((p: any) => ({
      value: p.id,
      label: p.name,
      searchString: `${p.name} ${p.projectCode || ''}`
    }));
  }, [projects]);

  return (
    <SearchableSelectGeneric
      value={value}
      onValueChange={onValueChange}
      items={items}
      placeholder="Chọn dự án..."
      searchPlaceholder="Tìm dự án..."
      triggerClassName="bg-slate-50 border-none h-11 rounded-xl"
      triggerDisplay={value ? `${projectMap[value] || value} (${projects.find((p: any) => p.id === value)?.projectCode || ''})` : "Chọn dự án..."}
      renderItem={(item: any) => (
        <SelectItem key={item.value} value={item.value}>
          <div className="flex flex-col">
            <span className="font-medium text-slate-900">{item.label}</span>
          </div>
        </SelectItem>
      )}
    />
  );
});

const SearchableEfficiencyTeamSelect = memo(({ value, onValueChange, teams, teamMap }: any) => {
  const items = useMemo(() => {
    return teams.map((t: any) => ({
      value: t.id,
      label: t.name,
      searchString: `${t.name} ${t.teamCode || ''}`
    }));
  }, [teams]);

  return (
    <SearchableSelectGeneric
      value={value}
      onValueChange={onValueChange}
      items={items}
      placeholder="Chọn team..."
      searchPlaceholder="Tìm team..."
      triggerClassName="bg-slate-50 border-none h-11 rounded-xl"
      triggerDisplay={value ? `${teamMap[value] || value} (${teams.find((t: any) => t.id === value)?.teamCode || ''})` : "Chọn team..."}
      renderItem={(item: any) => (
        <SelectItem key={item.value} value={item.value}>
          <div className="flex flex-col">
            <span className="font-medium text-slate-900">{item.label}</span>
          </div>
        </SelectItem>
      )}
    />
  );
});

const SearchableAcceptanceTeamSelect = memo(({ value, onValueChange, teams, teamMap }: any) => {
  const items = useMemo(() => {
    return teams.map((t: any) => ({
      value: t.id,
      label: t.name,
      searchString: `${t.name} ${t.teamCode || ''}`
    }));
  }, [teams]);

  return (
    <SearchableSelectGeneric
      value={value}
      onValueChange={onValueChange}
      items={items}
      placeholder="Chọn đội..."
      searchPlaceholder="Tìm đội..."
      triggerClassName="h-11 bg-slate-50 border-none rounded-xl font-bold"
      triggerDisplay={value ? `${teamMap[value] || value} (${teams.find((t: any) => t.id === value)?.teamCode || ''})` : "Chọn đội..."}
    />
  );
});

const SearchableAcceptanceProjectSelect = memo(({ value, onValueChange, projects, projectMap }: any) => {
  const items = useMemo(() => {
    return projects.map((p: any) => ({
      value: p.id,
      label: p.name,
      searchString: `${p.name} ${p.projectCode || ''}`
    }));
  }, [projects]);

  return (
    <SearchableSelectGeneric
      value={value}
      onValueChange={onValueChange}
      items={items}
      placeholder="Chọn dự án..."
      searchPlaceholder="Tìm dự án..."
      triggerClassName="h-11 bg-slate-50 border-none rounded-xl font-bold"
      triggerDisplay={value ? `${projectMap[value] || value} (${projects.find((p: any) => p.id === value)?.projectCode || ''})` : "Chọn dự án..."}
    />
  );
});
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
  writeBatch,
  increment,
  arrayUnion
} from 'firebase/firestore';
import { auth, db, testConnection } from './firebase';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
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
import { LogIn, LogOut, Plus, RefreshCw, History, TrendingUp, Wallet, Building2, ShieldCheck, BarChart3, Users, Edit2, Trash2, X, Check, Search, ArrowUpDown, AlertTriangle, UserCircle, Map as MapIcon, Layers, Database, FileUp, Download, Filter, Calendar, FileSpreadsheet, Link, Info, FileText, FileWarning, Copy, LayoutDashboard, ArrowRight, Clock, Save, Target, GitMerge, CheckSquare, BadgeDollarSign, PlusCircle, MinusCircle, BadgeCheck, MessageCircle, Settings, Eye } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { format, getWeek } from 'date-fns';
import { 
  BarChart, 
  LineChart,
  Bar, 
  Line,
  ComposedChart,
  PieChart,
  Pie,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell,
  Tooltip as ChartTooltip
} from 'recharts';
import { 
  Tooltip as UITooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

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
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  
  const errorJson = JSON.stringify(errInfo);
  console.error('Firestore Error: ', errorJson);
  
  if (errInfo.error.includes('insufficient permissions') || errInfo.error.includes('offline')) {
    toast.error(`Lỗi kết nối hoặc phân quyền Firestore: ${errInfo.error}`);
    throw new Error(errorJson);
  } else {
    toast.error(`Lỗi Firestore: ${errInfo.error}`);
  }
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
  const [efficiencyReports, setEfficiencyReports] = useState<any[]>([]);
  const [acceptances, setAcceptances] = useState<any[]>([]);
  const [finalAcceptances, setFinalAcceptances] = useState<any[]>([]);
  const [supportRequests, setSupportRequests] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('home');
  const [adminSubTab, setAdminSubTab] = useState('reports');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoringData, setIsRestoringData] = useState(false);
  const [isRestoreBudgetsDialogOpen, setIsRestoreBudgetsDialogOpen] = useState(false);
  const [isRestoreCheckpointDialogOpen, setIsRestoreCheckpointDialogOpen] = useState(false);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<any>(null);
  const [selectedLogForRestore, setSelectedLogForRestore] = useState<any>(null);

  // Helper for Marketing Month (21st of prev month to 20th of current month)
  const getMarketingMonth = (date: Date | any) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    const day = d.getDate();
    // Month M starts on 21/(M-1)
    if (day >= 21) {
      d.setMonth(d.getMonth() + 1);
    }
    return format(d, 'yyyy-MM');
  };

  const getReportingPeriod = (monthStr: string) => {
    if (!monthStr) return '';
    try {
      const [year, month] = monthStr.split('-').map(Number);
      // Month M is 21/(M-1) - 20/M
      const endDate = new Date(year, month - 1, 20);
      const startDate = new Date(year, month - 2, 21);
      return `( ${format(startDate, 'd/M')} - ${format(endDate, 'd/M')} )`;
    } catch (e) {
      return '';
    }
  };

  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    // The current marketing month could be the "next" calendar month if we are past the 21st
    const currentM = getMarketingMonth(now);
    const [y, m] = currentM.split('-').map(Number);
    
    // Show current month and next 5 months
    for (let i = 0; i < 6; i++) {
      const d = new Date(y, m - 1 + i, 1);
      const val = format(d, 'yyyy-MM');
      options.push({
        value: val,
        label: getMarketingMonthDisplayRange(val)
      });
    }
    return options;
  };

  const getChartColor = (index: number) => {
    const colors = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
    return colors[index % colors.length];
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
    const stringValue = value.toString().replace(/\./g, '');
    return stringValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleNumberInputChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\./g, '');
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
    return value.toLocaleString('vi-VN');
  };

  const EfficiencyDetailedTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const roi = data.cost > 0 ? (data.revenue / data.cost).toFixed(2) : '0';
      const isOverBudget = data.cost > data.budget;
      const usagePercent = data.budget > 0 ? (data.cost / data.budget) * 100 : 0;

      return (
        <div className="bg-white p-5 rounded-[24px] shadow-2xl border border-slate-100 min-w-[340px] space-y-4 animate-in fade-in zoom-in duration-200">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
              <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{label}</p>
            </div>
            <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-none text-[8px] font-black uppercase">Hiệu quả kỳ này</Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 p-3 bg-slate-50/50 rounded-2xl border border-slate-100/50">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Wallet className="w-2.5 h-2.5" /> Ngân sách
              </p>
              <p className="text-xs font-black text-slate-700 font-mono">{formatCurrency(data.budget)}</p>
            </div>
            <div className={`space-y-1 p-3 rounded-2xl border ${isOverBudget ? 'bg-red-50 border-red-100' : 'bg-slate-50/50 border-slate-100/50'}`}>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <TrendingUp className="w-2.5 h-2.5" /> Chi phí
              </p>
              <p className={`text-xs font-black font-mono ${isOverBudget ? 'text-red-600' : 'text-slate-700'}`}>
                {formatCurrency(data.cost)}
              </p>
              {isOverBudget && <p className="text-[8px] font-bold text-red-500 italic">Vượt {usagePercent.toFixed(0)}%</p>}
            </div>
          </div>

          <div className="p-4 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 space-y-3">
            <div className="flex items-center justify-between border-b border-indigo-400/30 pb-2">
              <div className="space-y-0.5">
                <p className="text-[8px] font-black text-indigo-200 uppercase tracking-widest">Sản lượng bán</p>
                <p className="text-lg font-black text-white leading-none">{data.sales || 0} <span className="text-[10px] font-bold opacity-80 uppercase">Căn</span></p>
              </div>
              <div className="h-8 w-[1px] bg-indigo-400/30" />
              <div className="space-y-0.5 text-right">
                <p className="text-[8px] font-black text-indigo-200 uppercase tracking-widest">Doanh số</p>
                <p className="text-sm font-black text-white leading-none">{formatCurrency(data.revenue || 0)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-[8px] font-black text-indigo-100 uppercase tracking-widest opacity-80">ROI (Doanh thu/Vốn)</p>
                  <p className="text-xs font-black text-white uppercase">{roi}x lần</p>
                </div>
              </div>
              <div className="px-3 py-1 bg-white/20 rounded-lg backdrop-blur-md">
                <p className="text-[9px] font-black text-white">{data.cost > 0 ? ((data.revenue/data.cost)*100).toFixed(0) : 0}% Lợi điểm</p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
              {efficiencyGroupType === 'team' ? 'Thành phần (Xếp theo Doanh số)' : 'Đội ngũ triển khai (Xếp theo Doanh số)'}
            </p>
            <div className="space-y-1 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
              {data.details.map((d: any, i: number) => (
                <div key={i} className="flex flex-col p-2.5 rounded-lg border border-slate-100 bg-slate-50/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-[10px] uppercase tracking-tight">{d.name}</span>
                    {d.sales > 0 && (
                      <Badge variant="secondary" className="h-4 text-[7px] font-black px-1.5 bg-emerald-50 text-emerald-600 border-none">{d.sales} căn</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px]">
                    <div className="flex justify-between border-r border-slate-100 pr-2">
                      <span className="text-slate-400 font-bold uppercase tracking-tighter">Doanh số:</span>
                      <span className="font-black text-emerald-600 font-mono">{formatCurrency(d.revenue)}</span>
                    </div>
                    <div className="flex justify-between pl-1">
                      <span className="text-slate-400 font-bold uppercase tracking-tighter">Chi phí:</span>
                      <span className={`font-mono font-black ${(d.budget > 0 && d.cost > d.budget) ? 'text-red-600' : 'text-slate-600'}`}>
                        {formatCurrency(d.cost)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const budget = payload.find((p: any) => p.dataKey === 'budget' || p.name === 'Ngân sách')?.value || 0;
      const actual = payload.find((p: any) => p.dataKey === 'actual' || p.name === 'Chi phí' || p.name === 'Thực chi')?.value || 0;
      const revenue = payload.find((p: any) => p.dataKey === 'revenue' || p.name === 'Doanh số')?.value || 0;
      const details = payload[0]?.payload?.details || [];
      const isTeamReport = payload[0]?.payload?.isTeamReport;
      const isProjectReport = payload[0]?.payload?.isProjectReport;
      
      const usagePercent = budget > 0 ? (actual / budget) * 100 : 0;
      const variancePercent = budget > 0 ? ((actual / budget) - 1) * 100 : 0;
      
      const romi = actual > 0 ? (revenue / actual).toFixed(2) : '0';
      const costRatio = revenue > 0 ? ((actual / revenue) * 100).toFixed(1) : '0';

      return (
        <div className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-2xl border border-slate-100 min-w-[320px] animate-in fade-in zoom-in duration-200">
          <div className="flex items-center justify-between mb-3 border-b pb-2 border-slate-100">
            <p className="text-sm font-bold text-slate-800">{label}</p>
            <div className="flex flex-col items-end">
              {revenue > 0 ? (
                <div className="flex flex-col items-end gap-0.5">
                  <Badge className="text-[10px] px-1.5 h-5 bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">
                    ROMI: {romi}x
                  </Badge>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">CP/Doanh số: {costRatio}%</span>
                </div>
              ) : (
                <>
                  <Badge variant={usagePercent > 100 ? "destructive" : usagePercent > 90 ? "secondary" : "default"} className="text-[10px] px-1.5 h-5">
                    SD: {usagePercent.toFixed(1)}%
                  </Badge>
                  <span className={`text-[9px] font-bold mt-1 ${Math.abs(variancePercent) < 0.1 ? 'text-slate-400' : variancePercent > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    CL: {variancePercent > 0 ? '+' : ''}{variancePercent.toFixed(1)}%
                  </span>
                </>
              )}
            </div>
          </div>
          
          <div className="space-y-3">
            <div className={`grid ${revenue > 0 && budget > 0 ? 'grid-cols-3' : 'grid-cols-2'} gap-2 pb-2`}>
              {budget > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ngân sách</p>
                  <p className="text-sm font-bold text-blue-600">{formatCurrency(budget)}</p>
                </div>
              )}
              <div className={`space-y-1 ${!revenue && budget ? 'text-right' : ''}`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chi phí</p>
                <p className="text-sm font-bold text-emerald-600">{formatCurrency(actual)}</p>
              </div>
              {revenue > 0 && (
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Doanh số</p>
                  <p className="text-sm font-bold text-indigo-600">{formatCurrency(revenue)}</p>
                </div>
              )}
            </div>

            {details.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>{isTeamReport ? 'Chi tiết Dự án' : isProjectReport ? 'Chi tiết Team' : 'Chi tiết'}</span>
                  {revenue > 0 && <span className="text-[9px] font-medium italic text-slate-400">Ưu tiên theo doanh số</span>}
                </p>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                  {details.map((detail: any, i: number) => {
                    const dUsage = detail.budget > 0 ? (detail.actual / detail.budget) * 100 : 0;
                    const dRomi = detail.actual > 0 ? (detail.revenue / detail.actual).toFixed(1) : '0';
                    return (
                      <div key={i} className="flex flex-col text-[11px] p-1.5 rounded-lg bg-slate-50 border border-slate-100 group">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-700 truncate mr-2" title={detail.name}>{detail.name}</span>
                          {detail.revenue > 0 ? (
                            <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1 rounded">R: {dRomi}x</span>
                          ) : (
                            <span className={`font-bold tabular-nums ${dUsage > 100 ? 'text-rose-500' : 'text-slate-500'}`}>
                              {dUsage.toFixed(0)}%
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 italic">CP:</span>
                            <span className="font-bold text-slate-800">{formatCurrency(detail.actual)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 justify-end">
                            {detail.revenue > 0 ? (
                              <>
                                <span className="text-slate-400 italic">DS:</span>
                                <span className="font-bold text-indigo-600">{formatCurrency(detail.revenue)}</span>
                              </>
                            ) : (
                              <>
                                <span className="text-slate-400 italic">NS:</span>
                                <span className="font-medium text-slate-600">{formatCurrency(detail.budget)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {detail.budget > 0 && !detail.revenue && (
                          <div className="w-full bg-slate-200/50 h-0.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-700 ${dUsage > 100 ? 'bg-rose-500' : dUsage > 80 ? 'bg-amber-500' : 'bg-blue-500'}`}
                              style={{ width: `${Math.min(dUsage, 100)}%` }}
                            />
                          </div>
                        )}
                        {detail.revenue > 0 && (
                          <div className="w-full bg-slate-200/50 h-0.5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-emerald-400 to-indigo-600"
                              style={{ width: `${Math.min((detail.revenue / (revenue || 1)) * 100, 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
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
      // User requested: Month M ( 21/M-1 - 20/M )
      const startDate = new Date(year, month - 2, 21);
      const endDate = new Date(year, month - 1, 20);
      return `Tháng ${month} ( ${safeFormat(startDate, 'd/M')} - ${safeFormat(endDate, 'd/M')} )`;
    } catch (e) {
      return '';
    }
  };

  // Form states
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectRegion, setNewProjectRegion] = useState('');
  const [newProjectType, setNewProjectType] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [actualProjectId, setActualProjectId] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedTeamName, setSelectedTeamName] = useState('');
  const [implementerName, setImplementerName] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [teamName, setTeamName] = useState('');
  const [budgetMonth, setBudgetMonth] = useState('');
  
  // Search and Confirmation states
  const [projectSearch, setProjectSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [adminProjectRegionFilter, setAdminProjectRegionFilter] = useState('all');
  const [adminProjectTypeFilter, setAdminProjectTypeFilter] = useState('all');
  const [budgetSearch, setBudgetSearch] = useState('');
  const [isConfirmBudgetOpen, setIsConfirmBudgetOpen] = useState(false);
  const [isConfirmingMulti, setIsConfirmingMulti] = useState(false);
  
  // Delete confirmation states
  const [isDeleteProjectDialogOpen, setIsDeleteProjectDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string, name: string } | null>(null);
  const [isDeleteTeamDialogOpen, setIsDeleteTeamDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<{ id: string, name: string } | null>(null);

  // Sorting states
  const [projectSort, setProjectSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [teamSort, setTeamSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [budgetReportSort, setBudgetReportSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'amount', direction: 'desc' });
  const [costReportSort, setCostReportSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'amount', direction: 'desc' });
  const [efficiencyTableSort, setEfficiencyTableSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'revenue', direction: 'desc' });

  const [costAmount, setCostAmount] = useState('');
  const [fbAds, setFbAds] = useState('');
  const [posting, setPosting] = useState('');
  const [zaloAds, setZaloAds] = useState('');
  const [googleAds, setGoogleAds] = useState('');
  const [visaAmount, setVisaAmount] = useState('');
  const [digitalAmount, setDigitalAmount] = useState('');
  const [otherCost, setOtherCost] = useState('');
  const [costNote, setCostNote] = useState('');
  const [selectedBudgetId, setSelectedBudgetId] = useState('');
  const [costWeek, setCostWeek] = useState(format(new Date(), "yyyy-'W'ww"));

  // Edit states for Budget
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editingBudgetAmount, setEditingBudgetAmount] = useState('');
  const [editingBudgetVerifiedAmount, setEditingBudgetVerifiedAmount] = useState('');
  const [editingBudgetMonth, setEditingBudgetMonth] = useState(getMarketingMonth(new Date()));
  const [editingBudgetTeam, setEditingBudgetTeam] = useState('');
  const [editingBudgetProject, setEditingBudgetProject] = useState('');
  const [editingBudgetImplementer, setEditingBudgetImplementer] = useState('');
  const [isEditBudgetDialogOpen, setIsEditBudgetDialogOpen] = useState(false);
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [editingCostAmount, setEditingCostAmount] = useState('');
  const [editingCostNote, setEditingCostNote] = useState('');

  // Edit states
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [editingProjectCode, setEditingProjectCode] = useState('');
  const [editingProjectRegion, setEditingProjectRegion] = useState('');
  const [editingProjectType, setEditingProjectType] = useState('');
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState('');
  const [editingTeamCode, setEditingTeamCode] = useState('');

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
  const [reportMonths, setReportMonths] = useState<string[]>([getMarketingMonth(new Date())]);
  const [reportWeek, setReportWeek] = useState('all');
  const [costPeriod, setCostPeriod] = useState('1');
  const [chartTimeType, setChartTimeType] = useState<'week' | 'month'>('month');
  const [reportYear, setReportYear] = useState(new Date().getFullYear().toString());
  const [reportSortBy, setReportSortBy] = useState<'budget' | 'actual' | 'revenue'>('budget');
  const [activeReportTab, setActiveReportTab] = useState('team');
  const [efficiencyGroupType, setEfficiencyGroupType] = useState<'team' | 'project' | 'region'>('team');
  const [selectedBudgetIds, setSelectedBudgetIds] = useState<string[]>([]);
  const [selectedCostIds, setSelectedCostIds] = useState<string[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedRegionIds, setSelectedRegionIds] = useState<string[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);
  const [selectedEfficiencyIds, setSelectedEfficiencyIds] = useState<string[]>([]);
  const [multiBudgetItems, setMultiBudgetItems] = useState<any[]>([]);
  const [isOverBudgetDetailOpen, setIsOverBudgetDetailOpen] = useState(false);
  const [systemSettings, setSystemSettings] = useState<any>(null);
  const [adminBudgetStartDay, setAdminBudgetStartDay] = useState('1');
  const [adminBudgetEndDay, setAdminBudgetEndDay] = useState('20');
  const [isEditCostDialogOpen, setIsEditCostDialogOpen] = useState(false);
  
  const formatCurrencyInput = (value: string) => {
    const number = value.replace(/\D/g, '');
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const [historyToView, setHistoryToView] = useState<any[]>([]);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [historyTargetName, setHistoryTargetName] = useState('');
  const [editingCostForm, setEditingCostForm] = useState({
    fbAds: '',
    posting: '',
    zaloAds: '',
    googleAds: '',
    visaAmount: '',
    digitalAmount: '',
    otherCost: '',
    note: ''
  });
  const [adminBudgetSearch, setAdminBudgetSearch] = useState('');
  const [adminBudgetMonthFilter, setAdminBudgetMonthFilter] = useState(getMarketingMonth(new Date()));
  const [adminCostSearch, setAdminCostSearch] = useState('');
  const [adminCostMonthFilter, setAdminCostMonthFilter] = useState(getMarketingMonth(new Date()));
  const [costBudgetMonth, setCostBudgetMonth] = useState(getMarketingMonth(new Date()));
  const [isBudgetSelectionDialogOpen, setIsBudgetSelectionDialogOpen] = useState(false);
  const [selectedRegionForBulk, setSelectedRegionForBulk] = useState('');
  const [isBulkUpdateRegionDialogOpen, setIsBulkUpdateRegionDialogOpen] = useState(false);
  const [selectedTypeForBulk, setSelectedTypeForBulk] = useState('');
  const [isBulkUpdateTypeDialogOpen, setIsBulkUpdateTypeDialogOpen] = useState(false);
  const [isGlobalProjectAssignDialogOpen, setIsGlobalProjectAssignDialogOpen] = useState(false);
  const [selectedGlobalProjectIds, setSelectedGlobalProjectIds] = useState<string[]>([]);
  const [targetGlobalType, setTargetGlobalType] = useState('');
  const [isMigrateTypeDialogOpen, setIsMigrateTypeDialogOpen] = useState(false);
  const [typeToMigrate, setTypeToMigrate] = useState<{id: string, name: string} | null>(null);
  const [migrationTargetType, setMigrationTargetType] = useState('');
  const [isMigratingTypes, setIsMigratingTypes] = useState(false);
  const [isAddingRegion, setIsAddingRegion] = useState(false);
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [isAddingType, setIsAddingType] = useState(false);
  const [isDeletingTeams, setIsDeletingTeams] = useState(false);
  const [isDeletingRegions, setIsDeletingRegions] = useState(false);
  const [isDeletingTypes, setIsDeletingTypes] = useState(false);
  const [isSyncingTypes, setIsSyncingTypes] = useState(false);
  const [isSyncingTeams, setIsSyncingTeams] = useState(false);
  const [isSyncingProjects, setIsSyncingProjects] = useState(false);
  const [isSyncingBudgetPermissions, setIsSyncingBudgetPermissions] = useState(false);

  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwjeE6fQBkPs5SaIaMO7pLwkp_XGwwuVMxEXpExlFnSzsCws3hqc5buywAToX82iRlsWw/exec";
  const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1hOAZtsqgCEegOrxDSnDRWso7EUpRXNi4G-kBfcNyhBg/edit?gid=0#gid=0"; // Link Google Sheet của bạn

  const [isSyncingLogs, setIsSyncingLogs] = useState(false);
  const [isDeletingProjects, setIsDeletingProjects] = useState(false);
  const [isMergingBudgets, setIsMergingBudgets] = useState(false);

  const handleMergeDuplicateBudgets = async () => {
    if (!isAdmin && !isMod) return;
    
    setIsMergingBudgets(true);
    const toastId = toast.loading('Đang xử lý gộp ngân sách trùng lặp...');
    
    try {
      const groups: Record<string, any[]> = {};
      budgets.forEach(b => {
        // ONLY group and merge if we have valid IDs
        if (!b.projectId || !b.teamId || !b.month) return;
        
        const key = `${b.projectId}_${b.teamId}_${b.month}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(b);
      });
      
      let mergedCount = 0;
      let deletedCount = 0;
      let costUpdatedCount = 0;
      
      for (const key in groups) {
        const group = groups[key];
        if (group.length > 1) {
          // Keep the first one
          const target = group[0];
          const others = group.slice(1);
          
          const totalAmount = group.reduce((sum, b) => sum + b.amount, 0);
          
          // Collect all edit histories
          let combinedHistory: any[] = [];
          group.forEach(b => {
            if (b.editHistory && Array.isArray(b.editHistory)) {
              combinedHistory = [...combinedHistory, ...b.editHistory];
            }
          });
          
          // Add a merge entry
          combinedHistory.push({
            action: 'MERGE_CLEANUP',
            editorName: 'SYSTEM',
            editorEmail: 'system@ais.dev',
            timestamp: new Date().toISOString(),
            mergedIds: others.map(o => o.id),
            previousTotal: target.amount,
            newTotal: totalAmount
          });
          
          // Sort history by timestamp
          combinedHistory.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          
          const batch = writeBatch(db);
          
          // Update target
          batch.update(doc(db, 'budgets', target.id), {
            amount: totalAmount,
            editHistory: combinedHistory,
            updatedAt: serverTimestamp()
          });
          
          // Update costs pointing to others
          const otherIds = others.map(o => o.id);
          const costsToUpdate = costs.filter(c => otherIds.includes(c.budgetId));
          
          costsToUpdate.forEach(c => {
            batch.update(doc(db, 'costs', c.id), {
              budgetId: target.id
            });
            costUpdatedCount++;
          });
          
          // Delete others
          others.forEach(o => {
            batch.delete(doc(db, 'budgets', o.id));
            deletedCount++;
          });
          
          await batch.commit();
          mergedCount++;
        }
      }
      
      if (mergedCount > 0) {
        toast.success(`Đã gộp ${mergedCount} nhóm ngân sách. Xóa ${deletedCount} bản trùng. Cập nhật ${costUpdatedCount} chi phí.`, { id: toastId });
        await logAction('SYSTEM', 'budgets', 'all', { mergedCount, deletedCount, costUpdatedCount });
      } else {
        toast.success('Không có ngân sách trùng lặp nào cần gộp.', { id: toastId });
      }
    } catch (error) {
      console.error("Merge error:", error);
      toast.error('Lỗi khi gộp ngân sách: ' + (error instanceof Error ? error.message : String(error)), { id: toastId });
    } finally {
      setIsMergingBudgets(false);
    }
  };

  const [isDeletingBudgets, setIsDeletingBudgets] = useState(false);
  const [isDeletingCosts, setIsDeletingCosts] = useState(false);
  const [isAddingEfficiency, setIsAddingEfficiency] = useState(false);
  const [isDeletingEfficiency, setIsDeletingEfficiency] = useState(false);
  const [isDeletingEfficiencyBatch, setIsDeletingEfficiencyBatch] = useState(false);
  const [newEfficiencyProject, setNewEfficiencyProject] = useState('');
  const [newEfficiencyTeam, setNewEfficiencyTeam] = useState('');
  const [newEfficiencyMonth, setNewEfficiencyMonth] = useState(getMarketingMonth(new Date()));
  const [newEfficiencySales, setNewEfficiencySales] = useState('');
  const [newEfficiencyRevenue, setNewEfficiencyRevenue] = useState('');
  const [adminEfficiencySearch, setAdminEfficiencySearch] = useState('');
  const [adminEfficiencyMonthFilter, setAdminEfficiencyMonthFilter] = useState(getMarketingMonth(new Date()));
  const [adminEfficiencySort, setAdminEfficiencySort] = useState<{ key: 'sales' | 'revenue' | 'name' | 'month' | 'none', direction: 'asc' | 'desc' }>({ key: 'none', direction: 'desc' });
  const [isImportingEfficiencyUrl, setIsImportingEfficiencyUrl] = useState(false);
  const [efficiencySheetUrl, setEfficiencySheetUrl] = useState('');
  const [costSheetUrl, setCostSheetUrl] = useState('');
  const [budgetSheetUrl, setBudgetSheetUrl] = useState('');
  const [isImportingBudgetsUrl, setIsImportingBudgetsUrl] = useState(false);
  const [isImportingCostsUrl, setIsImportingCostsUrl] = useState(false);
  const [isDeleteEfficiencyDialogOpen, setIsDeleteEfficiencyDialogOpen] = useState(false);
  const [isBulkDeleteEfficiencyDialogOpen, setIsBulkDeleteEfficiencyDialogOpen] = useState(false);
  const [isDeleteAllEfficiencyDialogOpen, setIsDeleteAllEfficiencyDialogOpen] = useState(false);
  const [efficiencyToDelete, setEfficiencyToDelete] = useState<any>(null);
  const [isEditEfficiencyDialogOpen, setIsEditEfficiencyDialogOpen] = useState(false);
  const [editingEfficiency, setEditingEfficiency] = useState<any>(null);
  const [isImportEfficiencyDialogOpen, setIsImportEfficiencyDialogOpen] = useState(false);
  const [isImportingEfficiency, setIsImportingEfficiency] = useState(false);

  const [isDeleteBudgetDialogOpen, setIsDeleteBudgetDialogOpen] = useState(false);
  const [isBulkDeleteBudgetsDialogOpen, setIsBulkDeleteBudgetsDialogOpen] = useState(false);
  const [isDeleteAllBudgetsDialogOpen, setIsDeleteAllBudgetsDialogOpen] = useState(false);
  const [isMigrateBudgetsDialogOpen, setIsMigrateBudgetsDialogOpen] = useState(false);
  const [isMigratingBudgets, setIsMigratingBudgets] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<{id: string, name: string} | null>(null);
  const [isDeleteCostDialogOpen, setIsDeleteCostDialogOpen] = useState(false);
  const [isBulkDeleteCostsDialogOpen, setIsBulkDeleteCostsDialogOpen] = useState(false);
  const [isDeleteAllCostsDialogOpen, setIsDeleteAllCostsDialogOpen] = useState(false);
  const [isImportCostsDialogOpen, setIsImportCostsDialogOpen] = useState(false);
  const [isImportBudgetsDialogOpen, setIsImportBudgetsDialogOpen] = useState(false);
  const [isImportingCosts, setIsImportingCosts] = useState(false);
  const [isImportingBudgets, setIsImportingBudgets] = useState(false);
  const [isImportingProjects, setIsImportingProjects] = useState(false);
  const [costToDelete, setCostToDelete] = useState<{id: string, name: string} | null>(null);
  
  const [isBulkDeleteProjectsDialogOpen, setIsBulkDeleteProjectsDialogOpen] = useState(false);
  const [isDeleteAllProjectsDialogOpen, setIsDeleteAllProjectsDialogOpen] = useState(false);
  const [isBulkDeleteRegionsDialogOpen, setIsBulkDeleteRegionsDialogOpen] = useState(false);
  const [isDeleteAllRegionsDialogOpen, setIsDeleteAllRegionsDialogOpen] = useState(false);
  const [isBulkDeleteTypesDialogOpen, setIsBulkDeleteTypesDialogOpen] = useState(false);
  const [isDeleteAllTypesDialogOpen, setIsDeleteAllTypesDialogOpen] = useState(false);
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{id: string, email: string} | null>(null);

  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImportErrorsDialogOpen, setIsImportErrorsDialogOpen] = useState(false);

  const isAdmin = userRole === 'super_admin' || userRole === 'admin';
  const isSuperAdmin = userRole === 'super_admin';
  const isMod = userRole === 'mod';
  const isGDDA = userRole === 'gdda';

  const normalizeMonth = (val: any): string => {
    if (!val) return '';
    if (val instanceof Date) {
      const d = new Date(val.getTime() + 12 * 60 * 60 * 1000);
      return format(d, 'yyyy-MM');
    }
    const str = String(val).trim().normalize('NFC').replace(/^\uFEFF/, '');
    const parts = str.split(/[-/.]/);
    if (parts.length === 2) {
      let year = '';
      let month = '';
      if (parts[0].length === 4) {
        year = parts[0];
        month = parts[1].padStart(2, '0');
      } else {
        month = parts[0].padStart(2, '0');
        year = parts[1].length === 2 ? `20${parts[1]}` : parts[1];
      }
      if (year.length === 4 && (parseInt(month) >= 1 && parseInt(month) <= 12)) return `${year}-${month}`;
    }
    return str;
  };

  const parseVal = (val: any) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const cleanVal = String(val).replace(/[.,]/g, '');
    const num = Number(cleanVal);
    return isNaN(num) ? 0 : num;
  };

  const extractEmail = (text: string): string | null => {
    if (!text) return null;
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex);
    return matches ? matches[0].toLowerCase().trim() : null;
  };
  const isUser = userRole === 'user';

  // Project name lookup map
  const projectMap = useMemo(() => {
    const map: Record<string, string> = {};
    projects.forEach(p => {
      map[p.id] = p.name;
    });
    return map;
  }, [projects]);

  const teamMap = useMemo(() => {
    const map: Record<string, string> = {};
    teams.forEach(t => {
      map[t.id] = t.name;
    });
    return map;
  }, [teams]);

  const budgetAmountMap = useMemo(() => {
    const map: Record<string, number> = {};
    budgets.forEach(b => {
      map[b.id] = b.amount;
    });
    return map;
  }, [budgets]);

  const filteredBudgetsForCostSelection = useMemo(() => {
    const userEmail = user?.email?.toLowerCase();
    
    return budgets
      .filter(b => {
        const budgetEmail = b.userEmail?.toLowerCase() || b.createdByEmail?.toLowerCase();
        const isOwner = (budgetEmail && userEmail && budgetEmail === userEmail) || (b.createdBy === user?.uid);
        const isAssigned = b.assignedUserEmail?.toLowerCase() === userEmail;
        const isAssignedGDDA = isGDDA && userProfile?.assignedProjects?.includes(b.projectId);
        
        const canSee = isAdmin || isMod || isOwner || isAssigned || isAssignedGDDA;
        return canSee && b.month === costBudgetMonth;
      })
      .filter(b => 
        (projectMap[b.projectId] || '').toLowerCase().includes(budgetSearch.toLowerCase()) ||
        (b.teamName || '').toLowerCase().includes(budgetSearch.toLowerCase()) ||
        (b.implementerName || '').toLowerCase().includes(budgetSearch.toLowerCase())
      );
  }, [budgets, user, userProfile, isGDDA, isAdmin, isMod, costBudgetMonth, projectMap, budgetSearch]);

  useEffect(() => {
    // Test Firestore connection on boot
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Check/Create user profile
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          
          let userDoc;
          try {
            // Prefer getDoc (which might use cache)
            userDoc = await getDoc(userDocRef);
          } catch (e: any) {
            console.warn("getDoc failed, trying getDocFromServer:", e.message);
            // If it failed due to being offline or something, try forcing server fetch if possible
            // or just catch and report
            userDoc = await getDocFromServer(userDocRef).catch(() => null);
          }

          if (!userDoc) {
            console.error("Critical: Could not fetch user profile. System might be offline.");
            setUser(firebaseUser); // Still set user but might be degraded
            return;
          }
          
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
          
          // Force super_admin role for specific email
          if (firebaseUser.email === 'thienvu1108@gmail.com') {
            role = 'super_admin';
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
          where('userEmail', '==', user.email?.toLowerCase()),
          where('assignedUserEmail', '==', user.email?.toLowerCase())
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
          where('userEmail', '==', user.email?.toLowerCase()),
          where('assignedUserEmail', '==', user.email?.toLowerCase())
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

    // Listen to efficiency reports
    let unsubEfficiency = () => {};
    if (isAdmin || isMod || isGDDA) {
      const qEfficiency = query(collection(db, 'efficiencyReports'), orderBy('createdAt', 'desc'));
      unsubEfficiency = onSnapshot(qEfficiency, (snapshot) => {
        setEfficiencyReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'efficiencyReports'));
    }

    // Listen to acceptances
    let unsubAcceptances = () => {};
    if (isAdmin || isMod || isGDDA) {
      const qAcceptances = query(collection(db, 'acceptances'), orderBy('month', 'desc'));
      unsubAcceptances = onSnapshot(qAcceptances, (snapshot) => {
        setAcceptances(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'acceptances'));
    }

    // Listen to final acceptances
    let unsubFinalAcceptances = () => {};
    if (isAdmin || isMod || isGDDA) {
      const qFinal = query(collection(db, 'finalAcceptances'), orderBy('finalizedAt', 'desc'));
      unsubFinalAcceptances = onSnapshot(qFinal, (snapshot) => {
        setFinalAcceptances(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'finalAcceptances'));
    }

    // Listen to support requests
    let qSupport;
    if (isAdmin || isMod) {
      qSupport = query(collection(db, 'supportRequests'), orderBy('createdAt', 'desc'));
    } else {
      qSupport = query(collection(db, 'supportRequests'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    }

    const unsubSupport = onSnapshot(qSupport, (snapshot) => {
      setSupportRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'supportRequests'));

    // Listen to settings
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setSystemSettings(data);
        if (data.budgetStartDay) setAdminBudgetStartDay(data.budgetStartDay.toString());
        if (data.budgetEndDay) setAdminBudgetEndDay(data.budgetEndDay.toString());
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings'));

    return () => {
      unsubProjects();
      unsubTeams();
      unsubRegions();
      unsubTypes();
      unsubBudgets();
      unsubCosts();
      unsubLogs();
      unsubUsers();
      unsubEfficiency();
      unsubAcceptances();
      unsubFinalAcceptances();
      unsubSupport();
      unsubSettings();
    };
  }, [user, userRole, userProfile]);

  const handleImportEfficiency = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (projects.length === 0 || teams.length === 0) {
      toast.error("Dữ liệu hệ thống (Dự án/Team) chưa tải xong. Vui lòng đợi giây lát.");
      return;
    }


    setIsImportingEfficiency(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to array of arrays to find headers
        let rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (rows.length === 0) {
          toast.error("File trống hoặc không tìm thấy dữ liệu");
          setIsImportingEfficiency(false);
          return;
        }

        // Find header row (the one containing 'ID' or 'Dự án')
        let headerIndex = -1;
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          const row = rows[i];
          if (row.some(cell => {
            const str = String(cell || '').toLowerCase().replace(/\s+/g, '');
            return str.includes('idduan') || str.includes('dựán') || str.includes('projectid');
          })) {
            headerIndex = i;
            break;
          }
        }

        if (headerIndex === -1) {
          // Fallback to first row if no obvious header found
          headerIndex = 0;
        }

        // Re-parse with detected header row
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { range: headerIndex });

        if (json.length === 0) {
          toast.error("Không tìm thấy dữ liệu hợp lệ. Vui lòng kiểm tra lại cấu trúc file mẫu.");
          setIsImportingEfficiency(false);
          return;
        }

        const batch = writeBatch(db);
        let count = 0;
        const currentImportErrors: string[] = [];

        for (let i = 0; i < json.length; i++) {
          const row = json[i];
          const rowNum = i + headerIndex + 2; 

          // Normalize row keys
          const normalizedRow: any = {};
          Object.keys(row).forEach(k => {
            const cleanKey = k.trim().toLowerCase().normalize('NFC').replace(/\s+/g, '').replace(/^\uFEFF/, '');
            normalizedRow[cleanKey] = row[k];
          });

          const getVal = (possibleKeys: string[]) => {
            for (const pk of possibleKeys) {
              const cleanPK = pk.trim().toLowerCase().normalize('NFC').replace(/\s+/g, '').replace(/^\uFEFF/, '');
              if (normalizedRow[cleanPK] !== undefined && normalizedRow[cleanPK] !== '') return normalizedRow[cleanPK];
            }
            return undefined;
          };

          const pRef = String(getVal(['ID Dự án', 'Mã Dự án', 'Dự án', 'ProjectID', 'idduan', 'id dự án', 'mã dự án']) || '').trim();
          const tRef = String(getVal(['ID Team', 'Mã Team', 'Tên Team', 'TeamID', 'teamid', 'id team', 'mã team']) || '').trim();
          let month = normalizeMonth(getVal(['Tháng', 'Kỳ', 'Month', 'thang', 'tháng', 'tháng', 'kỳ']));
          
          const salesStr = String(getVal(['Căn bán', 'Số căn bán', 'canban', 'socan', 'salescount', 'sales', 'số căn', 'units']) || '0');
          const revenueStr = String(getVal(['Doanh số', 'revenue', 'doanhso', 'thực đạt', 'doanh thu', 'doanhthu']) || '0');

          if (!pRef || !tRef || !month) {
            const hasData = Object.values(normalizedRow).some(v => v !== null && v !== undefined && v !== '');
            if (hasData) {
              const missing = [];
              if (!pRef) missing.push('Dự án (Mã/Tên)');
              if (!tRef) missing.push('Team (Mã/Tên)');
              if (!month) missing.push('Tháng (Kỳ)');
              currentImportErrors.push(
                `Dòng ${rowNum}: THIẾU THÔNG TIN BẮT BUỘC (${missing.join(', ')}).\n` +
                `• Nguyên nhân: Cột chứa thông tin này bị trống hoặc tên cột không khớp mẫu.\n` +
                `• Cách khắc phục: Đảm bảo các cột ID/Tên Dự án, Team và Tháng được điền đầy đủ. Đối với Tháng, hãy nhập đúng định dạng YYYY-MM (Ví dụ: 2024-04).`
              );
            }
            continue;
          }

          const project = projects.find(p => p.id === pRef || p.projectCode === pRef || p.name.toLowerCase() === pRef.toLowerCase());
          const team = teams.find(t => t.id === tRef || t.teamCode === tRef || t.name.toLowerCase() === tRef.toLowerCase());

          if (!project) {
            currentImportErrors.push(
              `Dòng ${rowNum}: KHÔNG TÌM THẤY DỰ ÁN khớp với "${pRef}".\n` +
              `• Nguyên nhân: Mã dự án hoặc Tên dự án trong file không tồn tại trong hệ thống.\n` +
              `• Cách khắc phục: Kiểm tra lại mục "Quản lý Dự án" để lấy chính xác Mã ID hoặc Tên dự án. Lưu ý không có khoảng trắng thừa.`
            );
            continue;
          }
          if (!team) {
            currentImportErrors.push(
              `Dòng ${rowNum}: KHÔNG TÌM THẤY TEAM khớp với "${tRef}".\n` +
              `• Nguyên nhân: Mã team hoặc Tên team trong file không tồn tại trong hệ thống.\n` +
              `• Cách khắc phục: Kiểm tra lại mục "Quản lý Team/Sàn" để lấy chính xác Mã ID hoặc Tên team.`
            );
            continue;
          }

          const sales = parseInt(salesStr.replace(/[^0-9]/g, '')) || 0;
          const revenue = parseInt(revenueStr.replace(/[^0-9]/g, '')) || 0;

          const projectId = project.id;
          const teamId = team.id;

          // Find existing record
          const existing = efficiencyReports.find(r => 
            r.projectId === projectId && 
            r.teamId === teamId && 
            r.month === month
          );

          if (existing) {
            const docRef = doc(db, 'efficiencyReports', existing.id);
            batch.update(docRef, {
              salesCount: sales,
              revenue: revenue,
              updatedAt: serverTimestamp()
            });
          } else {
            const docRef = doc(collection(db, 'efficiencyReports'));
            batch.set(docRef, {
              projectId,
              projectName: projectMap[projectId] || 'N/A',
              teamId,
              teamName: teamMap[teamId] || 'N/A',
              month,
              salesCount: sales,
              revenue: revenue,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              createdBy: user?.uid,
              createdByEmail: user?.email
            });
          }
          count++;
        }

        await batch.commit();
        
        if (count > 0) {
          toast.success(`Đồng bộ thành công ${count} bản ghi.`);
        }

        if (currentImportErrors.length > 0) {
          setImportErrors(currentImportErrors);
          setIsImportErrorsDialogOpen(true);
          toast.error(`Có ${currentImportErrors.length} dòng gặp lỗi khi nhập dữ liệu.`);
        } else if (count === 0) {
          toast.info("Không tìm thấy dữ liệu mới để đồng bộ.");
        }

        await logAction('IMPORT', 'efficiencyReports', 'bulk', { count, errors: currentImportErrors.length });
      } catch (error) {
        console.error("Import Error:", error);
        toast.error("Lỗi xử lý file. Vui lòng đảm bảo bạn đang dùng file Excel (.xlsx) hoặc CSV chuẩn và không có bảo mật.");
      } finally {
        setIsImportingEfficiency(false);
        setIsImportEfficiencyDialogOpen(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportBudgetsFromUrl = async () => {
    if (!budgetSheetUrl.trim()) {
      toast.error('Vui lòng nhập Link Google Sheet ngân sách');
      return;
    }

    const docIdMatch = budgetSheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!docIdMatch) {
      toast.error('Link Google Sheet không hợp lệ');
      return;
    }

    const docId = docIdMatch[1];
    const exportUrl = `https://docs.google.com/spreadsheets/d/${docId}/export?format=xlsx`;

    setIsImportingBudgetsUrl(true);
    setImportErrors([]);
    try {
      const response = await fetch(exportUrl);
      if (!response.ok) {
        throw new Error("Không thể tải file từ Google Sheet. Hãy đảm bảo file đã được chia sẻ công khai.");
      }
      
      const buffer = await response.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
      
      let rows: any[] = [];
      let foundHeaders = false;

      // Scan all sheets to find the one with budget headers
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        let headerIndex = -1;
        for (let i = 0; i < Math.min(rawData.length, 20); i++) {
          const row = rawData[i];
          if (row && Array.isArray(row) && row.some(cell => {
            const str = String(cell || '').toLowerCase().replace(/\s+/g, '');
            return str.includes('ngânsách') || str.includes('amount') || str.includes('idduan') || str.includes('dựán') || str.includes('idteam');
          })) {
            headerIndex = i;
            break;
          }
        }

        if (headerIndex !== -1) {
          rows = XLSX.utils.sheet_to_json(worksheet, { range: headerIndex });
          if (rows.length > 0) {
            foundHeaders = true;
            break;
          }
        }
      }

      if (!foundHeaders || rows.length === 0) {
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(firstSheet);
      }

      const batch = writeBatch(db);
      let count = 0;
      let skippedCount = 0;
      const errorDetails: string[] = [];

      // Pre-consolidate incoming Google Sheet data
      const consolidatedDataMap = new Map();
      for (const row of rows) {
        const normalizedRow: any = {};
        Object.keys(row).forEach(k => {
          const cleanKey = k.trim().toLowerCase().replace(/\s+/g, '');
          normalizedRow[cleanKey] = row[k];
        });

        const getVal = (possibleKeys: string[]) => {
          for (const pk of possibleKeys) {
            const cleanPK = pk.trim().toLowerCase().replace(/\s+/g, '');
            if (normalizedRow[cleanPK] !== undefined && normalizedRow[cleanPK] !== '') return normalizedRow[cleanPK];
          }
          return undefined;
        };

          const pRef = String(getVal(['ID Dự án', 'Mã Dự án', 'Dự án', 'ProjectID', 'idduan', 'id dự án', 'mã dự án']) || '').trim();
          const tRef = String(getVal(['ID Team', 'Mã Team', 'Tên Team', 'TeamID', 'idteam', 'id team', 'mã team']) || '').trim();
          const monthRaw = getVal(['Tháng', 'Kỳ', 'Month', 'thang', 'tháng', 'tháng', 'kỳ']);
          const month = normalizeMonth(monthRaw);
          const amount = parseVal(getVal(['Ngân sách', 'Amount', 'ngansach', 'ngân sách', 'ngânsách', 'số tiền']));
          const implementer = String(getVal(['Người triển khai', 'GDDA', 'Implementer', 'nguoiphutrach', 'giamdockinhdoanh', 'nguoitrienkhai', 'người triển khai', 'phụ trách']) || '').trim();

          if (pRef && tRef && month && (amount >= 0 || !isNaN(amount))) {
            const key = `${pRef}_${tRef}_${month}`;
            if (consolidatedDataMap.has(key)) {
              consolidatedDataMap.get(key).amount += amount;
            } else {
              consolidatedDataMap.set(key, { pRef, tRef, month, amount, implementer });
            }
          } else if (Object.values(normalizedRow).some(v => v !== '')) {
            const missing = [];
            if (!pRef) missing.push('Dự án');
            if (!tRef) missing.push('Team');
            if (!month) missing.push('Tháng');
            if (isNaN(amount)) missing.push('Ngân sách');
            
            errorDetails.push(
              `THÔNG TIN SAI HOẶC THIẾU: (${missing.join(', ')}).\n` +
              `• Nguyên nhân: Một số ô ở Google Sheet đang trống hoặc sai định dạng số.\n` +
              `• Cách khắc phục: Kiểm tra lại các cột Dự án, Team, Tháng và Ngân sách tại Link Google Sheet.`
            );
            skippedCount++;
          }
      }

      const consolidatedItems = Array.from(consolidatedDataMap.values()) as any[];

      for (const item of consolidatedItems) {
        const findProject = (ref: string) => {
          const cleanRef = ref.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
          if (!cleanRef) return null;
          return projects.find(p => 
            p.id === ref || 
            (p.projectCode && p.projectCode.toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
            p.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef
          );
        };

        const findTeam = (ref: string) => {
          const cleanRef = ref.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
          if (!cleanRef) return null;
          return teams.find(t => 
            t.id === ref || 
            (t.teamCode && t.teamCode.toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
            t.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef
          );
        };

        const project = findProject(item.pRef);
        const team = findTeam(item.tRef);

        if (!project) {
          errorDetails.push(
            `KHÔNG TÌM THẤY DỰ ÁN khớp với "${item.pRef}".\n` +
            `• Nguyên nhân: Dự án mang tên "${item.pRef}" trong Google Sheet không khớp với hệ thống.\n` +
            `• Cách khắc phục: Sửa lại tên Dự án trong Google Sheet cho đúng với danh sách hệ thống.`
          );
          skippedCount++;
          continue;
        }
        if (!team) {
          errorDetails.push(
            `KHÔNG TÌM THẤY TEAM khớp với "${item.tRef}".\n` +
            `• Nguyên nhân: Mã hoặc tên Team "${item.tRef}" không tồn tại.\n` +
            `• Cách khắc phục: Sửa lại tên Team trong Google Sheet cho đúng với danh sách hệ thống.`
          );
          skippedCount++;
          continue;
        }

        const projectId = project.id;
        const teamId = team.id;
        const assignedUserEmail = extractEmail(item.implementer);

        const existingBudgetsForMatch = budgets.filter(b => 
          b.projectId && b.projectId === projectId && 
          b.teamId && b.teamId === teamId && 
          b.month === item.month
        );

        if (existingBudgetsForMatch.length > 0) {
          const targetBudget = existingBudgetsForMatch[0];
          const duplicates = existingBudgetsForMatch.slice(1);
          
          // PRESERVE the total existing amount when merging duplicates
          const totalExistingAmount = existingBudgetsForMatch.reduce((sum, b) => sum + b.amount, 0);

          batch.update(doc(db, 'budgets', targetBudget.id), {
            amount: item.amount, // Set to Excel amount (if we want to replace existing with Excel value)
            implementerName: item.implementer || targetBudget.implementerName,
            assignedUserEmail: assignedUserEmail || targetBudget.assignedUserEmail || null,
            userEmail: assignedUserEmail || targetBudget.userEmail || user?.email?.toLowerCase(),
            updatedAt: serverTimestamp(),
            updatedBy: user?.uid,
            editHistory: arrayUnion({
              action: 'URL_IMPORT_UPDATE_MERGE',
              editorName: implementerName,
              timestamp: new Date().toISOString(),
              prevTotalInDb: totalExistingAmount,
              newImportAmount: item.amount,
              duplicatesFixed: duplicates.length
            })
          });

          for (const dup of duplicates) {
            const affectedCosts = costs.filter(c => c.budgetId === dup.id);
            affectedCosts.forEach(c => {
              batch.update(doc(db, 'costs', c.id), { budgetId: targetBudget.id });
            });
            batch.delete(doc(db, 'budgets', dup.id));
          }
        } else {
          batch.set(doc(collection(db, 'budgets')), {
            projectId,
            projectName: project.name,
            teamId,
            teamName: team.name,
            implementerName: item.implementer || 'N/A',
            assignedUserEmail: assignedUserEmail,
            userEmail: assignedUserEmail || user?.email?.toLowerCase(),
            month: item.month,
            amount: item.amount,
            createdAt: serverTimestamp(),
            createdBy: user?.uid,
            editHistory: [{
              action: 'URL_IMPORT_CREATE',
              editorName: implementerName,
              timestamp: new Date().toISOString(),
              amount: item.amount
            }]
          });
        }
        count++;
      }

      if (count > 0) {
        await batch.commit();
        await logAction('IMPORT_BUDGETS_URL', 'budgets', docId, { count, errors: skippedCount });
        
        let msg = `Đã cập nhật ${count} ngân sách từ Google Sheet.`;
        if (skippedCount > 0) {
          msg += ` Bỏ qua ${skippedCount} dòng lỗi.`;
          setImportErrors(errorDetails);
          setIsImportErrorsDialogOpen(true);
        }
        toast.success(msg);
        setBudgetSheetUrl('');
      } else {
        if (errorDetails.length > 0) {
          setImportErrors(errorDetails);
          setIsImportErrorsDialogOpen(true);
        } else {
          toast.info("Không có dữ liệu ngân sách hợp lệ để cập nhật. Vui lòng kiểm tra tiêu đề cột và nội dung.");
        }
      }
    } catch (error) {
      console.error('Import budgets error:', error);
      toast.error('Lỗi khi tải hoặc xử lý link Google Sheet. Đảm bảo file được chia sẻ công khai.');
    } finally {
      setIsImportingBudgetsUrl(false);
    }
  };

  const handleImportEfficiencyFromUrl = async () => {
    if (!efficiencySheetUrl) {
      toast.error("Vui lòng nhập link Google Sheet");
      return;
    }

    // Extract Spreadsheet ID
    const match = efficiencySheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match || !match[1]) {
      toast.error("Link Google Sheet không đúng định dạng");
      return;
    }

    const spreadsheetId = match[1];
    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;

    setIsImportingEfficiencyUrl(true);
    setIsImportingEfficiency(true);

    try {
      const response = await fetch(exportUrl);
      if (!response.ok) {
        throw new Error("Không thể tải file từ Google Sheet. Hãy đảm bảo file đã được chia sẻ công khai (Bất kỳ ai có liên kết đều có thể xem).");
      }
      
      const buffer = await response.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
      
      let rows: any[] = [];
      let foundHeaders = false;
      let headerIndex = -1;

      // Scan all sheets to find the one with efficiency headers
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const dataArr: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        headerIndex = -1;
        for (let i = 0; i < Math.min(dataArr.length, 20); i++) {
          const row = dataArr[i];
          if (row && Array.isArray(row) && row.some(cell => {
            const str = String(cell || '').toLowerCase().replace(/\s+/g, '');
            return str.includes('idduan') || str.includes('dựán') || str.includes('projectid') || str.includes('idteam') || str.includes('cănbán');
          })) {
            headerIndex = i;
            break;
          }
        }

        if (headerIndex !== -1) {
          rows = XLSX.utils.sheet_to_json(worksheet, { range: headerIndex });
          if (rows.length > 0) {
            foundHeaders = true;
            break;
          }
        }
      }

      if (!foundHeaders || rows.length === 0) {
        // Fallback to first sheet
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(firstSheet);
      }

      if (rows.length === 0) {
        toast.error("Không tìm thấy dữ liệu hợp lệ trong Google Sheet.");
        return;
      }

      const batch = writeBatch(db);
      let count = 0;
      let skippedCount = 0;
      const errorDetails: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowIndex = i + 2;
        const normalizedRow: any = {};
        Object.keys(row).forEach(k => {
          const cleanKey = k.trim().toLowerCase().replace(/\s+/g, '');
          normalizedRow[cleanKey] = row[k];
        });

        const getVal = (possibleKeys: string[]) => {
          for (const pk of possibleKeys) {
            const cleanPK = pk.trim().toLowerCase().replace(/\s+/g, '');
            if (normalizedRow[cleanPK] !== undefined) return normalizedRow[cleanPK];
          }
          return undefined;
        };

        const pRef = String(getVal(['ID Dự án', 'Mã Dự án', 'Dự án', 'ProjectID', 'idduan', 'id dự án', 'mã dự án']) || '').trim();
        const tRef = String(getVal(['ID Team', 'Mã Team', 'Tên Team', 'TeamID', 'idteam', 'id team', 'mã team']) || '').trim();
        const month = normalizeMonth(getVal(['Tháng', 'Kỳ', 'Month', 'thang', 'tháng', 'tháng', 'kỳ']));

        const salesStr = String(getVal(['Căn bán', 'Số căn bán', 'canban', 'socan', 'salescount', 'sales', 'số căn', 'units']) || '0');
        const revenueStr = String(getVal(['Doanh số', 'revenue', 'doanhso', 'thực đạt', 'doanh thu', 'doanhthu']) || '0');

        const sales = parseInt(salesStr.replace(/[^0-9]/g, '')) || 0;
        const revenue = parseInt(revenueStr.replace(/[^0-9]/g, '')) || 0;

        if (!pRef || !tRef || !month) {
          const hasData = Object.values(normalizedRow).some(v => v !== null && v !== undefined && v !== '');
          if (hasData) {
            errorDetails.push(`Dòng ${rowIndex}: Thiếu thông tin bắt buộc (Dự án: "${pRef}", Team: "${tRef}", Kỳ: "${month}")`);
            skippedCount++;
          }
          continue;
        }

        const findProject = (ref: string) => {
          const cleanRef = ref.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
          if (!cleanRef) return null;
          return projects.find(p => 
            p.id === ref || 
            (p.projectCode && p.projectCode.toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
            p.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef
          );
        };

        const findTeam = (ref: string) => {
          const cleanRef = ref.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
          if (!cleanRef) return null;
          return teams.find(t => 
            t.id === ref || 
            (t.teamCode && t.teamCode.toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
            t.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef
          );
        };

        const project = findProject(pRef);
        const team = findTeam(tRef);

        if (!project) {
          errorDetails.push(`Dòng ${rowIndex}: Không tìm thấy Dự án khớp với "${pRef}"`);
          skippedCount++;
          continue;
        }
        if (!team) {
          errorDetails.push(`Dòng ${rowIndex}: Không tìm thấy Team khớp với "${tRef}"`);
          skippedCount++;
          continue;
        }

        const projectId = project.id;
        const teamId = team.id;

        const existing = efficiencyReports.find(r => 
          r.projectId === projectId && 
          r.teamId === teamId && 
          r.month === month
        );

        if (existing) {
          const docRef = doc(db, 'efficiencyReports', existing.id);
          batch.update(docRef, {
            salesCount: sales,
            revenue: revenue,
            updatedAt: serverTimestamp()
          });
        } else {
          const docRef = doc(collection(db, 'efficiencyReports'));
          batch.set(docRef, {
            projectId,
            projectName: projectMap[projectId] || 'N/A',
            teamId,
            teamName: teamMap[teamId] || 'N/A',
            month,
            salesCount: sales,
            revenue: revenue,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: user?.uid,
            createdByEmail: user?.email
          });
        }
        count++;
      }

      if (count > 0) {
        await batch.commit();
        let msg = `Đồng bộ thành công ${count} bản ghi hiệu quả từ Google Sheet.`;
        if (skippedCount > 0) {
          msg += ` Bỏ qua ${skippedCount} dòng lỗi.`;
          setImportErrors(errorDetails);
          setIsImportErrorsDialogOpen(true);
        }
        toast.success(msg);
      } else {
        if (errorDetails.length > 0) {
          setImportErrors(errorDetails);
          setIsImportErrorsDialogOpen(true);
        } else {
          toast.error("Không tìm thấy dữ liệu hiệu quả hợp lệ để nhập.");
        }
      }

      await logAction('IMPORT_URL', 'efficiencyReports', spreadsheetId, { count, errors: skippedCount });
      setIsImportEfficiencyDialogOpen(false);
      setEfficiencySheetUrl('');
    } catch (error: any) {
      console.error("Link Import Error:", error);
      toast.error(error.message || "Lỗi khi kết nối với Google Sheet. Hãy kiểm tra quyền chia sẻ của file.");
    } finally {
      setIsImportingEfficiencyUrl(false);
      setIsImportingEfficiency(false);
    }
  };

  const handleDownloadEfficiencyTemplate = () => {
    const templateData = [
      {
        'ID Dự án': projects[0]?.id || 'ID_DU_AN_1',
        'ID Team': teams[0]?.id || 'ID_TEAM_1',
        'Tháng': format(new Date(), 'yyyy-MM'),
        'Số căn bán': 5,
        'Doanh số': 15000000000
      }
    ];

    const projectData = projects.map(p => ({
      'ID Dự án': p.id,
      'Tên Dự án': p.name,
      'Vùng/Khu vực': p.region
    }));

    const teamData = teams.map(t => ({
      'ID Team': t.id,
      'Tên Team': t.name
    }));

    const wb = XLSX.utils.book_new();
    
    // Create sheet with only required columns
    const wsTemplate = XLSX.utils.json_to_sheet(templateData);
    XLSX.utils.book_append_sheet(wb, wsTemplate, "Mẫu Nhập Liệu");

    const wsProjects = XLSX.utils.json_to_sheet(projectData);
    XLSX.utils.book_append_sheet(wb, wsProjects, "DANH SÁCH ID DỰ ÁN");

    const wsTeams = XLSX.utils.json_to_sheet(teamData);
    XLSX.utils.book_append_sheet(wb, wsTeams, "DANH SÁCH ID TEAM");

    XLSX.writeFile(wb, `Mau_Bao_Cao_Hieu_Qua_Sync_IDs_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    toast.success("Đã tải xuống file mẫu đồng bộ theo ID!");
  };

  const handleAddEfficiency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEfficiencyProject || !newEfficiencyTeam || !newEfficiencySales || !newEfficiencyRevenue) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setIsAddingEfficiency(true);
    try {
      const docRef = await addDoc(collection(db, 'efficiencyReports'), {
        projectId: newEfficiencyProject,
        projectName: projectMap[newEfficiencyProject] || 'N/A',
        teamId: newEfficiencyTeam,
        teamName: teamMap[newEfficiencyTeam] || 'N/A',
        month: newEfficiencyMonth,
        salesCount: parseInt(newEfficiencySales),
        revenue: parseInt(newEfficiencyRevenue),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user?.uid,
        createdByEmail: user?.email
      });
      await logAction('CREATE', 'efficiencyReports', docRef.id, { 
        project: projectMap[newEfficiencyProject], 
        team: teamMap[newEfficiencyTeam],
        month: newEfficiencyMonth,
        sales: newEfficiencySales,
        revenue: newEfficiencyRevenue
      });
      toast.success('Đã lưu báo cáo hiệu quả');
      setNewEfficiencySales('');
      setNewEfficiencyRevenue('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'efficiencyReports');
    } finally {
      setIsAddingEfficiency(false);
    }
  };

  const handleUpdateEfficiency = async (id: string, sales: string, revenue: string) => {
    try {
      const updateData = {
        salesCount: parseInt(sales),
        revenue: parseInt(revenue),
        updatedAt: serverTimestamp()
      };
      await updateDoc(doc(db, 'efficiencyReports', id), updateData);
      await logAction('UPDATE', 'efficiencyReports', id, updateData);
      toast.success('Đã cập nhật báo cáo');
      setIsEditEfficiencyDialogOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'efficiencyReports');
    }
  };

  const handleDeleteEfficiency = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'efficiencyReports', id));
      await logAction('DELETE', 'efficiencyReports', id, {});
      toast.success('Đã xóa báo cáo hiệu quả');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'efficiencyReports');
    }
  };

  const handleBulkDeleteEfficiency = async () => {
    if (selectedEfficiencyIds.length === 0 || isDeletingEfficiencyBatch) return;
    setIsBulkDeleteEfficiencyDialogOpen(true);
  };

  const confirmBulkDeleteEfficiency = async () => {
    setIsDeletingEfficiencyBatch(true);
    setIsBulkDeleteEfficiencyDialogOpen(false);
    try {
      const batch = writeBatch(db);
      selectedEfficiencyIds.forEach(id => {
        batch.delete(doc(db, 'efficiencyReports', id));
      });
      await batch.commit();
      await logAction('DELETE_BULK', 'efficiencyReports', 'multiple', { count: selectedEfficiencyIds.length });
      toast.success(`Đã xóa ${selectedEfficiencyIds.length} bản ghi hiệu quả`);
      setSelectedEfficiencyIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'efficiencyReports');
    } finally {
      setIsDeletingEfficiencyBatch(false);
    }
  };

  const handleDeleteAllEfficiency = async () => {
    if (efficiencyReports.length === 0) return;
    setIsDeleteAllEfficiencyDialogOpen(true);
  };

  const confirmDeleteAllEfficiency = async () => {
    setIsDeleteAllEfficiencyDialogOpen(false);
    try {
      const batch = writeBatch(db);
      efficiencyReports.forEach(r => {
        batch.delete(doc(db, 'efficiencyReports', r.id));
      });
      await batch.commit();
      await logAction('DELETE_ALL', 'efficiencyReports', 'all', { count: efficiencyReports.length });
      toast.success('Đã xóa tất cả bản ghi hiệu quả kinh doanh');
      setSelectedEfficiencyIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'efficiencyReports');
    }
  };

  const filteredEfficiencyReports = useMemo(() => {
    return efficiencyReports.filter(r => {
      const pName = projectMap[r.projectId] || r.projectName || '';
      const tName = teamMap[r.teamId] || r.teamName || '';
      const matchSearch = (pName.toLowerCase().includes(adminEfficiencySearch.toLowerCase())) ||
                        (tName.toLowerCase().includes(adminEfficiencySearch.toLowerCase()));
      const matchMonth = !adminEfficiencyMonthFilter || r.month === adminEfficiencyMonthFilter;
      return matchSearch && matchMonth;
    }).sort((a, b) => {
      if (adminEfficiencySort.key === 'none') {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      }
      
      let comparison = 0;
      if (adminEfficiencySort.key === 'sales') {
        comparison = a.salesCount - b.salesCount;
      } else if (adminEfficiencySort.key === 'revenue') {
        comparison = a.revenue - b.revenue;
      } else if (adminEfficiencySort.key === 'name') {
        const nameA = (projectMap[a.projectId] || a.projectName || '').toLowerCase();
        const nameB = (projectMap[b.projectId] || b.projectName || '').toLowerCase();
        comparison = nameA.localeCompare(nameB);
      } else if (adminEfficiencySort.key === 'month') {
        comparison = a.month.localeCompare(b.month);
      }
      
      return adminEfficiencySort.direction === 'asc' ? comparison : -comparison;
    });
  }, [efficiencyReports, adminEfficiencySearch, adminEfficiencyMonthFilter, projectMap, teamMap, adminEfficiencySort]);

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

  const syncFullSystem = async () => {
    setIsBackingUp(true);
    
    // Helper function to sanitize data recursively (convert Timestamps to ISO strings)
    const sanitizeData = (data: any[]) => {
      if (!data || !Array.isArray(data)) return [];
      
      const sanitizeObj = (obj: any): any => {
        if (obj === null || obj === undefined) return obj;
        
        // Handle Firestore Timestamp specifically
        if (typeof obj === 'object' && obj.seconds !== undefined && obj.nanoseconds !== undefined) {
          try {
            return new Date(obj.seconds * 1000).toISOString();
          } catch (e) {
            return String(obj);
          }
        }
        
        if (Array.isArray(obj)) {
          return obj.map(sanitizeObj);
        }
        
        if (typeof obj === 'object') {
          // If it's a Date object
          if (obj instanceof Date) return obj.toISOString();
          
          const newObj: any = {};
          Object.keys(obj).forEach(key => {
            newObj[key] = sanitizeObj(obj[key]);
          });
          return newObj;
        }
        
        return obj;
      };
      
      return data.map(sanitizeObj);
    };

    const masterPayload = {
      nganSach: sanitizeData(budgets),
      chiPhi: sanitizeData(costs),
      duAn: sanitizeData(projects),
      team: sanitizeData(teams),
      nguoiDung: sanitizeData(allUsers),
      vungKhuVuc: sanitizeData(regions),
      hieuQuaKinhDoanh: sanitizeData(efficiencyReports),
      nghiemThu: sanitizeData(acceptances),
      nhatKyHeThong: auditLogs.slice(0, 1000).map(log => {
        const ts = log.timestamp?.toDate ? log.timestamp.toDate() : new Date();
        return {
          id: log.id,
          action: log.action,
          collection: log.collection,
          docId: log.docId,
          data: typeof log.data === 'object' ? JSON.stringify(log.data) : String(log.data),
          userEmail: log.userEmail,
          userId: log.userId,
          timestamp: ts.toISOString(),
          // Các trường tiếng việt cho Sheet
          thoiGian: ts.toLocaleString('vi-VN'),
          hanhDong: log.action || 'N/A',
          nguoiChinhSua: log.userEmail || 'Hệ thống'
        };
      }),
      systemLog: {
        action: "Full System Backup",
        user: user?.email || "Admin_Mayhomes",
        timestamp: new Date().toISOString(),
        details: `Sao lưu ${budgets.length} ngân sách, ${costs.length} chi phí, ${projects.length} dự án`
      }
    };

    try {
      console.log("Dữ liệu chuẩn hóa gửi sang Google Sheets:", masterPayload);
      
      // Sử dụng text/plain để tránh Preflight CORS (POST simple request)
      // Dữ liệu được gửi dưới dạng chuỗi JSON thô
      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain",
        },
        body: JSON.stringify(masterPayload)
      });
      
      toast.success("Đã gửi yêu cầu sao lưu thành công! Dữ liệu đang được xử lý trên Google Sheet.");
      await logAction('FULL_SYSTEM_BACKUP', 'system', 'all', { 
        counts: {
          budgets: budgets.length,
          costs: costs.length,
          projects: projects.length,
          teams: teams.length,
          users: allUsers.length,
          regions: regions.length,
          efficiency: efficiencyReports.length
        }
      });
    } catch (error) {
      console.error("Lỗi đồng bộ hệ thống:", error);
      toast.error("Lỗi đồng bộ hệ thống. Vui lòng kiểm tra lại cấu hình script.");
    } finally {
      setIsBackingUp(false);
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

  const handleSyncAllLogs = async () => {
    if (isSyncingLogs || auditLogs.length === 0) return;
    setIsSyncingLogs(true);
    try {
      const sanitizeLogs = (logs: any[]) => {
        return logs.map(log => {
          const ts = log.timestamp?.toDate ? log.timestamp.toDate() : new Date();
          return {
            ...log,
            timestamp: ts.toISOString(),
            // Thêm các trường tiếng Việt theo yêu cầu user
            thoiGian: ts.toLocaleString('vi-VN'),
            hanhDong: log.action || 'N/A',
            nguoiChinhSua: log.userEmail || 'Hệ thống',
            collection: log.collection || 'N/A',
            docId: log.docId || 'N/A',
            data: typeof log.data === 'object' ? JSON.stringify(log.data) : String(log.data)
          };
        });
      };

      const payload = {
        nhatKyHanhDong: sanitizeLogs(auditLogs.slice(0, 2000)) // Tăng giới hạn lên 2000 để bao quát hơn
      };

      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
      });
      
      toast.success(`Đã đồng bộ ${Math.min(auditLogs.length, 2000)} nhật ký lên Google Sheet.`);
    } catch (error) {
      console.error("Sync All Logs Error:", error);
      toast.error("Lỗi khi đồng bộ toàn bộ nhật ký");
    } finally {
      setIsSyncingLogs(false);
    }
  };

  const syncLogToGoogleSheets = async (logEntry: any) => {
    try {
      const now = new Date();
      const payload = {
        nhatKyHanhDong: [{
          ...logEntry,
          timestamp: now.toISOString(),
          // Các trường tiếng Việt đồng bộ với script Google Sheets
          thoiGian: now.toLocaleString('vi-VN'),
          hanhDong: logEntry.action,
          nguoiChinhSua: logEntry.userEmail || 'Hệ thống',
          data: typeof logEntry.data === 'object' ? JSON.stringify(logEntry.data) : String(logEntry.data)
        }]
      };
      
      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.error("Google Sheets Auto-Sync Error:", e);
    }
  };

  const logAction = async (action: string, collectionName: string, docId: string, data: any) => {
    try {
      const logData = {
        action,
        collection: collectionName,
        docId,
        data,
        timestamp: serverTimestamp(),
        userEmail: user?.email,
        userId: user?.uid
      };
      
      await addDoc(collection(db, 'auditLogs'), logData);
      
      // Tự động đồng bộ Nhật ký này sang Google Sheet ngay lập tức
      syncLogToGoogleSheets({
        action,
        collection: collectionName,
        docId,
        data,
        userEmail: user?.email
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

  const extractTeamCode = (name: string) => {
    // Pattern MH follow by digits and dots (e.g., MH17, MH79.28, MH04.1)
    const match = name.match(/MH[0-9.]+/i);
    if (match) {
      // Return and trim any trailing dots if they were just punctuation
      return match[0].toUpperCase().replace(/\.+$/, '');
    }
    return '';
  };

  const extractProjectCode = (name: string) => {
    // Look for uppercase blocks DA-xxx or just capitalized acronyms
    const match = name.match(/[A-Z0-9-]{3,}/);
    return match ? match[0].toUpperCase() : '';
  };

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

      const projectCode = extractProjectCode(name);

      try {
        const docRef = await addDoc(collection(db, 'projects'), {
          name,
          projectCode,
          region: newProjectRegion || 'Chưa xác định',
          type: newProjectType,
          createdAt: serverTimestamp(),
          createdBy: user?.uid
        });
        await logAction('CREATE', 'projects', docRef.id, { name, projectCode, region: newProjectRegion, type: newProjectType });
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

  const handleImportProjectsCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingProjects(true);
    setImportErrors([]);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (rawJson.length === 0) {
          toast.error("File Excel không có dữ liệu.");
          return;
        }

        const batch = writeBatch(db);
        let count = 0;
        let errorsCount = 0;
        const errorDetailsList: string[] = [];
        const existingNames = new Set(projects.map(p => p.name.toLowerCase()));

        for (let i = 0; i < rawJson.length; i++) {
          const rowData = rawJson[i];
          const rowIndex = i + 2;
          const row: any = {};
          Object.keys(rowData).forEach(k => {
            const cleanKey = k.trim().toLowerCase().normalize('NFC').replace(/\s+/g, '').replace(/^\uFEFF/, '');
            row[cleanKey] = rowData[k];
          });

          const getVal = (possibleKeys: string[]) => {
            for (const pk of possibleKeys) {
              const cleanPK = pk.trim().toLowerCase().normalize('NFC').replace(/\s+/g, '').replace(/^\uFEFF/, '');
              if (row[cleanPK] !== undefined && row[cleanPK] !== '') return row[cleanPK];
            }
            return undefined;
          };

          const name = String(getVal(['Tên dự án', 'Dự án', 'Project', 'Project Name', 'tenduan', 'tên dự án']) || '').trim();
          const code = String(getVal(['Mã Dự án', 'Mã', 'Code', 'Project Code', 'maduan', 'mã dự án']) || '').trim();
          const region = String(getVal(['Miền', 'Khu vực', 'Vùng', 'Region', 'mien', 'khuvuc', 'vùng']) || '').trim();
          const type = String(getVal(['Loại hình', 'Type', 'loaihinh', 'loại hình']) || '').trim();

          if (!name) {
            if (Object.values(row).some(v => v !== '')) {
              errorDetailsList.push(`Dòng ${rowIndex}: Thiếu tên dự án.`);
              errorsCount++;
            }
            continue;
          }

          if (existingNames.has(name.toLowerCase())) {
            errorDetailsList.push(`Dòng ${rowIndex}: Dự án "${name}" đã tồn tại.`);
            errorsCount++;
            continue;
          }

          const projectCode = code || extractProjectCode(name);
          
          const docRef = doc(collection(db, 'projects'));
          batch.set(docRef, {
            name,
            projectCode,
            region: region || 'Chưa xác định',
            type: type || 'Chưa phân loại',
            createdAt: serverTimestamp(),
            createdBy: user?.uid
          });
          
          existingNames.add(name.toLowerCase());
          count++;
          
          if (count >= 450) break; // Firestore batch limit
        }

        if (count > 0) {
          await batch.commit();
          await logAction('IMPORT_PROJECTS', 'projects', 'bulk', { count, errors: errorsCount });
          toast.success(`Đã thêm ${count} dự án mới từ Excel.`);
        }

        if (errorsCount > 0) {
          setImportErrors(errorDetailsList);
          setIsImportErrorsDialogOpen(true);
        }

        if (count === 0 && errorsCount > 0) {
          toast.error("Không có dự án hợp lệ nào được thêm.");
        }
      } catch (error) {
        console.error(error);
        toast.error("Lỗi khi xử lý file Excel.");
      } finally {
        setIsImportingProjects(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
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

      const teamCode = extractTeamCode(name);

      try {
        const docRef = await addDoc(collection(db, 'teams'), {
          name,
          teamCode,
          createdAt: serverTimestamp(),
          createdBy: user?.uid
        });
        await logAction('CREATE', 'teams', docRef.id, { name, teamCode });
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

  const handleUpdateProject = async (id: string, newName: string, newCode: string, region?: string, type?: string) => {
    if (!newName.trim()) return;
    try {
      const updateData: any = { 
        name: newName,
        projectCode: newCode || '',
        updatedAt: serverTimestamp()
      };
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

  const handleSyncProjectCodes = async () => {
    setIsSyncingProjects(true);
    try {
      const batch = writeBatch(db);
      let count = 0;
      projects.forEach(p => {
        if (!p.projectCode) {
          const code = extractProjectCode(p.name);
          if (code) {
            batch.update(doc(db, 'projects', p.id), { projectCode: code, updatedAt: serverTimestamp() });
            count++;
          }
        }
      });
      if (count > 0) {
        await batch.commit();
        await logAction('SYNC_PROJECT_CODES', 'projects', 'all', { count });
        toast.success(`Đã cập nhật mã cho ${count} dự án`);
      } else {
        toast.info('Tất cả dự án đã có mã hoặc không tìm thấy mã hợp lệ trong tên');
      }
    } catch (error) {
      console.error('Error syncing project codes:', error);
      toast.error('Lỗi khi đồng bộ mã dự án');
    } finally {
      setIsSyncingProjects(false);
    }
  };

  const handleSyncTeamCodes = async () => {
    setIsSyncingTeams(true);
    try {
      const batch = writeBatch(db);
      let count = 0;
      teams.forEach(t => {
        const accurateCode = extractTeamCode(t.name);
        if (accurateCode && t.teamCode !== accurateCode) {
          batch.update(doc(db, 'teams', t.id), { 
            teamCode: accurateCode, 
            updatedAt: serverTimestamp() 
          });
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
        await logAction('SYNC_TEAM_CODES', 'teams', 'all', { count });
        toast.success(`Đã chuẩn hóa mã cho ${count} team`);
      } else {
        toast.info('Tất cả mã team đã được chuẩn hóa hoặc không tìm thấy mã hợp lệ');
      }
    } catch (error) {
      console.error('Error syncing team codes:', error);
      toast.error('Lỗi khi đồng bộ mã team');
    } finally {
      setIsSyncingTeams(false);
    }
  };

  const handleSyncBudgetPermissions = async () => {
    setIsSyncingBudgetPermissions(true);
    try {
      const batch = writeBatch(db);
      let count = 0;
      
      budgets.forEach(b => {
        const implementer = b.implementerName || '';
        const emailMatch = extractEmail(implementer);
        
        // If we found an email, we prioritize it as both assignedUserEmail AND userEmail
        // This ensures the employee has full ownership and visibility
        if (emailMatch && (b.assignedUserEmail !== emailMatch || b.userEmail !== emailMatch)) {
          batch.update(doc(db, 'budgets', b.id), { 
            assignedUserEmail: emailMatch,
            userEmail: emailMatch, // Change the registration email to the employee's email
            updatedAt: serverTimestamp(),
            updatedBy: user?.uid
          });
          count++;
        }
      });
      
      // Also sync costs to ensure they have the assigned email from their budget
      costs.forEach(c => {
        if (c.budgetId) {
          const parentBudget = budgets.find(b => b.id === c.budgetId);
          const budgetEmail = parentBudget?.assignedUserEmail || extractEmail(parentBudget?.implementerName || '');
          
          if (budgetEmail && (c.assignedUserEmail !== budgetEmail || c.userEmail !== budgetEmail)) {
            batch.update(doc(db, 'costs', c.id), { 
              assignedUserEmail: budgetEmail,
              userEmail: budgetEmail, // Also update userEmail for costs to ensure total visibility
              updatedAt: serverTimestamp()
            });
            count++;
          }
        }
      });

      if (count > 0) {
        await batch.commit();
        await logAction('SYNC_BUDGET_PERMISSIONS', 'budgets', 'all', { count });
        toast.success(`Đã đồng bộ phân quyền cho ${count} bản ghi`);
      } else {
        toast.info('Tất cả dữ liệu đã được đồng bộ phân quyền');
      }
    } catch (error) {
      console.error('Error syncing budget permissions:', error);
      toast.error('Lỗi khi đồng bộ phân quyền ngân sách');
    } finally {
      setIsSyncingBudgetPermissions(false);
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

  const handleBulkUpdateProjectType = () => {
    if (selectedProjectIds.length === 0 || !selectedTypeForBulk) {
      toast.error('Vui lòng chọn dự án và loại hình');
      return;
    }
    setIsBulkUpdateTypeDialogOpen(true);
  };

  const confirmBulkUpdateProjectType = async () => {
    setIsBulkUpdateTypeDialogOpen(false);
    try {
      const batch = writeBatch(db);
      selectedProjectIds.forEach(id => {
        batch.update(doc(db, 'projects', id), { type: selectedTypeForBulk });
      });
      await batch.commit();
      await logAction('UPDATE_BULK', 'projects', 'multiple', { count: selectedProjectIds.length, type: selectedTypeForBulk });
      toast.success(`Đã cập nhật loại hình cho ${selectedProjectIds.length} dự án`);
      setSelectedProjectIds([]);
      setSelectedTypeForBulk('');
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

  const handleUpdateTeam = async (id: string, newName: string, newCode: string) => {
    if (!newName.trim()) return;
    try {
      await updateDoc(doc(db, 'teams', id), { 
        name: newName,
        teamCode: newCode || '',
        updatedAt: serverTimestamp() 
      });
      await logAction('UPDATE', 'teams', id, { name: newName, teamCode: newCode });
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
      const typeRef = doc(db, 'types', id);
      const typeDoc = await getDoc(typeRef);
      const oldName = typeDoc.exists() ? typeDoc.data().name : null;

      await updateDoc(typeRef, { name: newName });
      
      // Propagate change to projects
      if (oldName && oldName !== newName) {
        const batch = writeBatch(db);
        const projectsToUpdate = projects.filter(p => p.type === oldName);
        projectsToUpdate.forEach(p => {
          batch.update(doc(db, 'projects', p.id), { type: newName });
        });
        if (projectsToUpdate.length > 0) {
          await batch.commit();
          toast.info(`Đã cập nhật loại hình cho ${projectsToUpdate.length} dự án liên quan`);
        }
      }

      await logAction('UPDATE', 'types', id, { name: newName, oldName });
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

  const handleMigrateType = (type: {id: string, name: string}) => {
    setTypeToMigrate(type);
    setIsMigrateTypeDialogOpen(true);
  };

  const confirmMigrateType = async () => {
    if (!typeToMigrate || !migrationTargetType || isMigratingTypes) return;
    setIsMigratingTypes(true);
    try {
      const batch = writeBatch(db);
      const targetName = migrationTargetType.trim();
      const sourceName = typeToMigrate.name.trim();

      const projectsToUpdate = projects.filter(p => (p.type || '').trim() === sourceName);
      
      projectsToUpdate.forEach(p => {
        batch.update(doc(db, 'projects', p.id), { type: targetName });
      });

      await batch.commit();
      await logAction('MIGRATE_TYPE', 'projects', 'multiple', { 
        count: projectsToUpdate.length, 
        from: sourceName, 
        to: targetName 
      });

      toast.success(`Đã chuyển ${projectsToUpdate.length} dự án từ "${sourceName}" sang "${targetName}"`);
      setIsMigrateTypeDialogOpen(false);
      setTypeToMigrate(null);
      setMigrationTargetType('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'projects');
    } finally {
      setIsMigratingTypes(false);
    }
  };

  const handleSyncTypes = async () => {
    if (isSyncingTypes) return;
    setIsSyncingTypes(true);
    try {
      const batch = writeBatch(db);
      
      // 1. Get all unique types from projects
      const projectTypesSet = new Set<string>();
      projects.forEach(p => {
        if (p.type) projectTypesSet.add(p.type.trim());
      });
      
      const uniqueProjectTypes = Array.from(projectTypesSet);
      
      // 2. Standardize current projects (trim types)
      const projectsToFix = projects.filter(p => p.type && (p.type !== p.type.trim()));
      projectsToFix.forEach(p => {
        batch.update(doc(db, 'projects', p.id), { type: p.type.trim() });
      });
      
      // 3. Standardize current types (trim names)
      const typesToFix = types.filter(t => t.name && (t.name !== t.name.trim()));
      typesToFix.forEach(t => {
        batch.update(doc(db, 'types', t.id), { name: t.name.trim() });
      });

      // 4. Ensure all project types exist in types collection
      const existingTypeNames = new Set(types.map(t => (t.name || '').trim()));
      
      let newTypesCount = 0;
      uniqueProjectTypes.forEach(typeName => {
        if (!existingTypeNames.has(typeName)) {
          const newTypeRef = doc(collection(db, 'types'));
          batch.set(newTypeRef, {
            name: typeName,
            createdAt: serverTimestamp()
          });
          newTypesCount++;
        }
      });
      
      if (projectsToFix.length > 0 || typesToFix.length > 0 || newTypesCount > 0) {
        await batch.commit();
        await logAction('SYNC_TYPES', 'system', 'multiple', { 
          fixedProjects: projectsToFix.length, 
          fixedTypes: typesToFix.length,
          addedTypes: newTypesCount 
        });
        toast.success(`Đã chuẩn hóa ${projectsToFix.length} dự án, ${typesToFix.length} loại hình và thêm ${newTypesCount} loại hình mới`);
      } else {
        toast.info("Dữ liệu đã đồng nhất, không cần cập nhật");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'system');
    } finally {
      setIsSyncingTypes(false);
    }
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

  const handleGlobalProjectAssign = async () => {
    if (selectedGlobalProjectIds.length === 0 || !targetGlobalType) {
      toast.error('Vui lòng chọn ít nhất một dự án và một loại hình');
      return;
    }
    
    try {
      const batch = writeBatch(db);
      const targetName = targetGlobalType.trim();
      
      selectedGlobalProjectIds.forEach(id => {
        batch.update(doc(db, 'projects', id), { type: targetName });
      });
      
      await batch.commit();
      await logAction('BULK_ASSIGN_TYPE', 'projects', 'multiple', { 
        count: selectedGlobalProjectIds.length, 
        type: targetName 
      });
      
      toast.success(`Đã gán loại hình "${targetName}" cho ${selectedGlobalProjectIds.length} dự án`);
      setIsGlobalProjectAssignDialogOpen(false);
      setSelectedGlobalProjectIds([]);
      setSelectedProjectIds([]);
      setTargetGlobalType('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'projects');
    }
  };

  const handleSetProjectsForType = async () => {
    if (!typeForProjects) return;
    
    try {
      const batch = writeBatch(db);
      const targetTypeName = typeForProjects.name.trim();
      
      // 1. All currently checked projects get this type
      for (const projectId of selectedProjectIdsForType) {
        batch.update(doc(db, 'projects', projectId), { type: targetTypeName });
      }

      // 2. Any project that PREVIOUSLY had this type but is NOW UNCHECKED should have its type cleared
      const projectsCurrentlyInThisType = projects.filter(p => (p.type || '').trim() === targetTypeName);
      const checkedIds = new Set(selectedProjectIdsForType);
      
      projectsCurrentlyInThisType.forEach(p => {
        if (!checkedIds.has(p.id)) {
          batch.update(doc(db, 'projects', p.id), { type: '' });
        }
      });
      
      await batch.commit();
      await logAction('UPDATE_TYPE_PROJECTS', 'projects', 'multiple', { 
        type: targetTypeName, 
        projectIds: selectedProjectIdsForType,
        removedCount: projectsCurrentlyInThisType.length - projectsToUpdateCount(projectsCurrentlyInThisType, checkedIds)
      });
      toast.success(`Đã cập nhật membership loại hình "${targetTypeName}" cho các dự án`);
      setIsSetProjectsForTypeDialogOpen(false);
      setTypeForProjects(null);
      setSelectedProjectIdsForType([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'projects');
    }
  };

  const projectsToUpdateCount = (current: any[], checked: Set<any>) => {
    let count = 0;
    current.forEach(p => { if (checked.has(p.id)) count++; });
    return count;
  };

  const isWithinRegistrationWindow = () => {
    if (isAdmin || isMod || firebaseUserEmail === 'thienvu1108@gmail.com') return true;
    if (!systemSettings) return true;
    
    const now = new Date();
    const day = now.getDate();
    const start = systemSettings.budgetStartDay || 1;
    const end = systemSettings.budgetEndDay || 20;

    return day >= Number(start) && day <= Number(end);
  };

  const firebaseUserEmail = user?.email?.toLowerCase() || '';

  const handleAddBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !budgetAmount || !selectedTeamId || !budgetMonth || !implementerName) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    if (!isWithinRegistrationWindow()) {
      toast.error(`Thời gian đăng ký ngân sách đã kết thúc. Vui lòng liên hệ Admin.`);
      return;
    }

    const project = projects.find(p => p.id === selectedProjectId);
    const team = teams.find(t => t.id === selectedTeamId);

    const newItem = {
      projectId: selectedProjectId,
      projectName: project?.name || 'N/A',
      teamId: selectedTeamId,
      teamName: team?.name || selectedTeamName,
      implementerName,
      month: budgetMonth,
      amount: Number(budgetAmount),
      tempId: Math.random().toString(36).substr(2, 9)
    };

    setMultiBudgetItems([...multiBudgetItems, newItem]);
    setBudgetAmount('');
    setSelectedProjectId('');
    // Notice: Not calling toast.success here if we are about to show confirm dialog
    return true;
  };

  const handleRegisterBudgetMain = (e: React.FormEvent) => {
    e.preventDefault();
    
    // If form has data, try to add it to list first
    if (selectedProjectId && budgetAmount && selectedTeamId && budgetMonth && implementerName) {
      const success = handleAddBudget(e);
      if (!success) return;
    } else if (multiBudgetItems.length === 0) {
      toast.error('Vui lòng nhập đầy đủ thông tin đăng ký');
      return;
    }

    setIsConfirmingMulti(true);
    setIsConfirmBudgetOpen(true);
  };

  const handleAddBudgetToListOnly = (e: React.FormEvent) => {
    e.preventDefault();
    const success = handleAddBudget(e);
    if (success) {
      toast.success('Đã thêm dự án vào danh sách chờ');
    }
  };

  const removeMultiBudgetItem = (tempId: string) => {
    setMultiBudgetItems(multiBudgetItems.filter(item => item.tempId !== tempId));
  };

  const confirmAddBudget = async () => {
    if (multiBudgetItems.length === 0) return;
    
    try {
      setIsDeletingBudgets(true); 

      // Pre-merge multiBudgetItems to consolidate multiple entries for same project/team/month in current submission
      const mergedItems = multiBudgetItems.reduce((acc: any[], current) => {
        const existingIndex = acc.findIndex(item => 
          item.projectId === current.projectId && 
          item.teamId === current.teamId && 
          item.month === current.month
        );
        
        if (existingIndex > -1) {
          acc[existingIndex].amount += current.amount;
        } else {
          acc.push({ ...current });
        }
        return acc;
      }, []);

      for (const item of mergedItems) {
        // ONLY merge if project/team IDs are present
        if (!item.projectId || !item.teamId || !item.month) continue;

        // Find ALL existing budgets for same Project, Team, and Month from the main budgets list
        const existingBudgetsForMatch = budgets.filter(b => 
          b.projectId && b.projectId === item.projectId && 
          b.teamId && b.teamId === item.teamId && 
          b.month === item.month
        );

        if (existingBudgetsForMatch.length > 0) {
          // Merge everything into the FIRST one
          const targetBudget = existingBudgetsForMatch[0];
          const targetRef = doc(db, 'budgets', targetBudget.id);
          const duplicates = existingBudgetsForMatch.slice(1);
          
          const batch = writeBatch(db);
          
          let totalToMergeFromDuplicates = 0;
          const duplicateIdsRemoved: string[] = [];

          // If duplicates existed, prepare them for merge
          if (duplicates.length > 0) {
            for (const dup of duplicates) {
              totalToMergeFromDuplicates += dup.amount;
              duplicateIdsRemoved.push(dup.id);
              
              // Update costs pointing to duplicate to point to target
              const affectedCosts = costs.filter(c => c.budgetId === dup.id);
              affectedCosts.forEach(c => {
                batch.update(doc(db, 'costs', c.id), { budgetId: targetBudget.id });
              });
              
              // Delete duplicate
              batch.delete(doc(db, 'budgets', dup.id));
            }
          }
          
          // Single update for target with combined amount
          batch.update(targetRef, {
            amount: increment(item.amount + totalToMergeFromDuplicates),
            updatedAt: serverTimestamp(),
            editHistory: arrayUnion({
              action: 'MERGE_ADD_CLEANUP',
              editorName: implementerName,
              editorEmail: user?.email,
              timestamp: new Date().toISOString(),
              addedAmount: item.amount,
              mergedFromDuplicates: totalToMergeFromDuplicates,
              prevAmount: targetBudget.amount,
              duplicatesFixed: duplicateIdsRemoved.length > 0 ? duplicateIdsRemoved : null
            })
          });

          await batch.commit();
          await logAction('UPDATE', 'budgets', targetBudget.id, { 
            mergedAmount: item.amount,
            duplicatesRemoved: duplicateIdsRemoved.length 
          });
        } else {
          // Create new
          const docRef = await addDoc(collection(db, 'budgets'), {
            projectId: item.projectId,
            projectName: item.projectName,
            teamId: item.teamId,
            teamName: item.teamName,
            implementerName: item.implementerName,
            month: item.month,
            amount: item.amount,
            createdAt: serverTimestamp(),
            createdBy: user?.uid,
            userEmail: user?.email?.toLowerCase(),
            editHistory: []
          });
          await logAction('CREATE', 'budgets', docRef.id, { ...item });
        }
      }

      setMultiBudgetItems([]);
      setIsConfirmBudgetOpen(false);
      setIsConfirmingMulti(false);
      toast.success('Đã hoàn tất đăng ký ngân sách');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'budgets');
    } finally {
      setIsDeletingBudgets(false);
    }
  };

  const handleSaveSystemSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        budgetStartDay: Number(adminBudgetStartDay),
        budgetEndDay: Number(adminBudgetEndDay),
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid
      }, { merge: true });
      toast.success('Đã lưu cài đặt hệ thống');
      await logAction('UPDATE', 'settings', 'global', { budgetStartDay: adminBudgetStartDay, budgetEndDay: adminBudgetEndDay });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings');
    }
  };

  const handleOpenHistory = (target: any, name: string) => {
    setHistoryToView(target.editHistory || []);
    setHistoryTargetName(name);
    setIsHistoryDialogOpen(true);
  };

  const handleEditBudget = async (budget: any, newAmount: number) => {
    if (!isWithinRegistrationWindow()) {
      toast.error('Ngoài thời gian cho phép chỉnh sửa ngân sách.');
      return;
    }

    try {
      const budgetRef = doc(db, 'budgets', budget.id);
      await updateDoc(budgetRef, {
        amount: newAmount,
        updatedAt: serverTimestamp(),
        editHistory: arrayUnion({
          action: 'EDIT',
          editorName: userProfile?.fullName || user?.displayName || 'Unknown',
          editorEmail: user?.email,
          timestamp: new Date().toISOString(),
          oldAmount: budget.amount,
          newAmount: newAmount
        })
      });
      toast.success('Đã cập nhật ngân sách');
      await logAction('UPDATE', 'budgets', budget.id, { oldAmount: budget.amount, newAmount });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'budgets');
    }
  };

  const handleEditCost = async (cost: any, newChannels: any, newNote: string) => {
    // Note: User requirement says can edit actual cost too. 
    // Usually costs are edits are less restricted by time window unless specified.
    // For now, I'll allow editing if they created it.
    
    const totalAmount = Object.values(newChannels).reduce((acc: number, val: any) => acc + Number(val), 0);

    try {
      const costRef = doc(db, 'costs', cost.id);
      await updateDoc(costRef, {
        amount: totalAmount,
        channels: newChannels,
        note: newNote,
        updatedAt: serverTimestamp(),
        editHistory: arrayUnion({
          action: 'UPDATE',
          editorName: userProfile?.fullName || user?.displayName || 'Unknown',
          editorEmail: user?.email,
          timestamp: new Date().toISOString(),
          changes: {
            amount: { old: cost.amount, new: totalAmount },
            note: { old: cost.note, new: newNote }
          }
        })
      });
      toast.success('Đã cập nhật chi phí');
      await logAction('UPDATE', 'costs', cost.id, { oldAmount: cost.amount, newAmount: totalAmount });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'costs');
    }
  };

  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalVisa = isAdmin ? Number(visaAmount) : 0;
    const finalDigital = isAdmin ? Number(digitalAmount) : 0;
    const totalAmount = Number(fbAds) + Number(posting) + Number(zaloAds) + Number(googleAds) + Number(otherCost) + finalVisa + finalDigital;
    if (!actualProjectId || totalAmount <= 0 || !costPeriod || !selectedBudgetId) return;
    const project = projects.find(p => p.id === actualProjectId);
    const budget = budgets.find(b => b.id === selectedBudgetId);
    
    if (!budget) {
      toast.error('Không tìm thấy thông tin ngân sách tương ứng');
      return;
    }
    
    const [yearStr] = costBudgetMonth.split('-');
    const year = Number(yearStr);
    const periodNumber = Number(costPeriod);

    try {
      const docRef = await addDoc(collection(db, 'costs'), {
        projectId: actualProjectId,
        projectName: project?.name || 'N/A',
        budgetId: selectedBudgetId,
        teamId: budget.teamId || null,
        implementerName: budget.implementerName || 'N/A',
        teamName: budget.teamName || 'N/A',
        assignedUserEmail: budget.assignedUserEmail || null,
        weekNumber: periodNumber, // Using weekNumber field to store periodNumber for compatibility
        year,
        month: costBudgetMonth,
        amount: totalAmount,
        channels: {
          fbAds: Number(fbAds),
          posting: Number(posting),
          zaloAds: Number(zaloAds),
          googleAds: Number(googleAds),
          visaAmount: finalVisa,
          digitalAmount: finalDigital,
          otherCost: Number(otherCost)
        },
        note: costNote,
        createdAt: serverTimestamp(),
        createdBy: user?.uid,
        userEmail: user?.email?.toLowerCase()
      });
      await logAction('CREATE', 'costs', docRef.id, { 
        projectId: actualProjectId,
        projectName: project?.name || 'N/A',
        teamId: budget?.teamId,
        teamName: budget?.teamName,
        month: budget?.month,
        period: costPeriod,
        fbAds: Number(fbAds),
        posting: Number(posting),
        zaloAds: Number(zaloAds),
        googleAds: Number(googleAds),
        visaAmount: finalVisa,
        digitalAmount: finalDigital,
        otherCost: Number(otherCost),
        totalAmount,
        note: costNote,
        budgetId: selectedBudgetId 
      });
      setFbAds('');
      setPosting('');
      setZaloAds('');
      setGoogleAds('');
      setVisaAmount('');
      setDigitalAmount('');
      setOtherCost('');
      setCostNote('');
      setActualProjectId('');
      setSelectedBudgetId('');
      toast.success('Đã nhập chi phí thực tế');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'costs');
    }
  };

  const handleOpenEditBudget = (budget: any) => {
    setEditingBudgetId(budget.id);
    setEditingBudgetAmount(budget.amount.toString());
    setEditingBudgetVerifiedAmount((budget.verifiedAmount || 0).toString());
    setEditingBudgetMonth(budget.month);
    setEditingBudgetTeam(budget.teamName);
    setEditingBudgetProject(budget.projectId);
    setEditingBudgetImplementer(budget.implementerName);
    setIsEditBudgetDialogOpen(true);
  };

  const confirmEditBudget = async () => {
    if (!editingBudgetId || !editingBudgetAmount || !editingBudgetTeam || !editingBudgetMonth || !editingBudgetProject || !editingBudgetImplementer) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    if (!isAdmin && !isWithinRegistrationWindow()) {
      toast.error('Ngoài thời gian cho phép chỉnh sửa ngân sách.');
      return;
    }

    try {
      const budgetRef = doc(db, 'budgets', editingBudgetId);
      const originalBudget = budgets.find(b => b.id === editingBudgetId);
      const updateData: any = {
        amount: Number(editingBudgetAmount),
        verifiedAmount: Number(editingBudgetVerifiedAmount),
        month: editingBudgetMonth,
        teamName: editingBudgetTeam,
        projectId: editingBudgetProject,
        projectName: projectMap[editingBudgetProject] || 'N/A',
        implementerName: editingBudgetImplementer,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid,
        editHistory: arrayUnion({
          action: 'UPDATE',
          editorName: userProfile?.fullName || user?.displayName || 'Unknown',
          editorEmail: user?.email,
          timestamp: new Date().toISOString(),
          changes: {
            amount: { old: originalBudget?.amount, new: Number(editingBudgetAmount) },
            verifiedAmount: { old: originalBudget?.verifiedAmount || 0, new: Number(editingBudgetVerifiedAmount) },
            month: { old: originalBudget?.month, new: editingBudgetMonth },
            team: { old: originalBudget?.teamName, new: editingBudgetTeam },
            project: { old: originalBudget?.projectName, new: projectMap[editingBudgetProject] || 'N/A' },
            implementer: { old: originalBudget?.implementerName, new: editingBudgetImplementer }
          }
        })
      };
      await updateDoc(budgetRef, updateData);
      
      // Update related costs
      const relatedCosts = costs.filter(c => c.budgetId === editingBudgetId);
      if (relatedCosts.length > 0) {
        const batch = writeBatch(db);
        relatedCosts.forEach(cost => {
          const costRef = doc(db, 'costs', cost.id);
          batch.update(costRef, {
            projectId: editingBudgetProject,
            projectName: projectMap[editingBudgetProject] || 'N/A'
          });
        });
        await batch.commit();
      }

      await logAction('UPDATE', 'budgets', editingBudgetId, updateData);
      setEditingBudgetId(null);
      setIsEditBudgetDialogOpen(false);
      toast.success('Đã cập nhật ngân sách');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'budgets');
    }
  };

  const handleUpdateBudget = async (id: string) => {
    try {
      const budgetRef = doc(db, 'budgets', id);
      const updateData = {
        amount: Number(editingBudgetAmount),
        month: editingBudgetMonth,
        teamName: editingBudgetTeam,
        projectId: editingBudgetProject,
        projectName: projectMap[editingBudgetProject] || 'N/A',
        implementerName: editingBudgetImplementer,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid
      };
      await updateDoc(budgetRef, updateData);
      
      // Update related costs
      const relatedCosts = costs.filter(c => c.budgetId === id);
      if (relatedCosts.length > 0) {
        const batch = writeBatch(db);
        relatedCosts.forEach(cost => {
          const costRef = doc(db, 'costs', cost.id);
          batch.update(costRef, {
            projectId: editingBudgetProject,
            projectName: projectMap[editingBudgetProject] || 'N/A'
          });
        });
        await batch.commit();
      }

      await logAction('UPDATE', 'budgets', id, updateData);
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
      // Save snapshot in audit log for recovery before deleting all
      await logAction('DELETE_ALL', 'budgets', 'all', { 
        count: budgets.length,
        snapshot: budgets.map(b => ({
          id: b.id,
          projectId: b.projectId,
          projectName: b.projectName,
          teamId: b.teamId,
          teamName: b.teamName,
          month: b.month,
          amount: b.amount,
          implementerName: b.implementerName
        }))
      });
      
      budgets.forEach(b => {
        batch.delete(doc(db, 'budgets', b.id));
      });
      await batch.commit();
      toast.success('Đã xóa tất cả đăng ký ngân sách. Thông tin đã được lưu vào nhật ký để khôi phục nếu cần.');
      setSelectedBudgetIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'budgets');
    }
  };

  const handleRestoreBudgetsFromLogs = async (logToUse: any = null) => {
    if (isRestoringData) return;
    setIsRestoringData(true);
    
    try {
      const budgetMap: Record<string, any> = {};
      const sortedLogs = [...auditLogs].reverse();
      const limitTimestamp = logToUse?.timestamp;
      
      sortedLogs.forEach(log => {
        if (limitTimestamp && log.timestamp && log.timestamp.seconds > limitTimestamp.seconds) return;

        if (log.collection === 'budgets' || log.collection === 'nganSach') {
          if (log.action === 'CREATE' || log.action === 'UPDATE' || log.action === 'IMPORT_BUDGETS') {
            if (log.data) {
              if (log.docId && log.docId !== 'bulk') {
                budgetMap[log.docId] = { ...(budgetMap[log.docId] || {}), ...log.data, id: log.docId };
              } else if (log.data.snapshot) {
                log.data.snapshot.forEach((b: any) => { budgetMap[b.id] = { ...b }; });
              } else if (log.data.items) {
                log.data.items.forEach((b: any) => { if (b.id) budgetMap[b.id] = { ...b }; });
              }
            }
          } else if (log.action === 'DELETE') {
            delete budgetMap[log.docId];
          } else if (log.action === 'DELETE_ALL' || log.action === 'DELETE_BULK') {
            if (log.data?.snapshot) {
              log.data.snapshot.forEach((b: any) => { budgetMap[b.id] = { ...b }; });
            }
          }
        } else if (log.action === 'FULL_SYSTEM_BACKUP' && log.data?.payload?.nganSach) {
          log.data.payload.nganSach.forEach((b: any) => { budgetMap[b.id] = { ...b }; });
        }
      });

      if (logToUse?.data?.snapshot) {
        logToUse.data.snapshot.forEach((b: any) => { budgetMap[b.id] = { ...b }; });
      }

      const toRestore = Object.values(budgetMap);
      if (toRestore.length === 0) {
        toast.info('Không tìm thấy dữ liệu nào trong nhật ký để khôi phục.');
        setIsRestoreBudgetsDialogOpen(false);
        return;
      }

      const batch = writeBatch(db);
      let restoreCount = 0;
      toRestore.forEach((item: any) => {
        if (!budgets.some(b => b.id === item.id)) {
          const bRef = doc(db, 'budgets', item.id);
          const { id, ...saveData } = item;
          if (!saveData.assignedUserEmail && saveData.implementerName) {
            saveData.assignedUserEmail = extractEmail(saveData.implementerName);
          }
          batch.set(bRef, {
            ...saveData,
            createdAt: saveData.createdAt || serverTimestamp(),
            restoredAt: serverTimestamp(),
            restoredBy: user?.uid,
            restoredFromLog: true,
            originalDocId: id
          });
          restoreCount++;
        }
      });

      if (restoreCount === 0) {
        toast.info('Tất cả dữ liệu trong nhật ký đã tồn tại trên hệ thống.');
      } else {
        await batch.commit();
        await logAction('RESTORE_BUDGETS_EXECUTED', 'budgets', 'bulk', { count: restoreCount, point: logToUse?.id || 'All' });
        toast.success(`Đã khôi phục thành công ${restoreCount} bản ghi.`);
      }
      setIsRestoreBudgetsDialogOpen(false);
    } catch (error) {
      console.error('Restore error:', error);
      handleFirestoreError(error, OperationType.WRITE, 'budgets');
    } finally {
      setIsRestoringData(false);
    }
  };

  const [isRestoreAllDialogOpen, setIsRestoreAllDialogOpen] = useState(false);
  const [logLimit, setLogLimit] = useState(50);
  const [logSearch, setLogSearch] = useState('');
  const [logTypeFilter, setLogTypeFilter] = useState('all');
  const [logUserFilter, setLogUserFilter] = useState('all');

  const uniqueLogUsers = useMemo(() => {
    const users = new Set<string>();
    auditLogs.forEach(log => {
      if (log.userEmail) users.add(log.userEmail);
    });
    return Array.from(users).sort();
  }, [auditLogs]);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const matchesSearch = 
        (log.userEmail || '').toLowerCase().includes(logSearch.toLowerCase()) ||
        (log.collection || '').toLowerCase().includes(logSearch.toLowerCase()) ||
        (log.docId || '').toLowerCase().includes(logSearch.toLowerCase());
      
      const matchesType = logTypeFilter === 'all' || 
        (logTypeFilter === 'WRITE' && (log.action === 'CREATE' || log.action === 'UPDATE' || log.action?.startsWith('IMPORT'))) ||
        (logTypeFilter === 'DELETE' && (log.action === 'DELETE' || log.action?.startsWith('DELETE_'))) ||
        (logTypeFilter === 'SYSTEM' && (log.action === 'FULL_SYSTEM_BACKUP' || log.action === 'DEEP_SYSTEM_RESTORE'));

      const matchesUser = logUserFilter === 'all' || log.userEmail === logUserFilter;

      return matchesSearch && matchesType && matchesUser;
    });
  }, [auditLogs, logSearch, logTypeFilter, logUserFilter]);

  const RenderLogData = ({ data, action }: { data: any, action: string }) => {
    if (!data) return null;
    
    // Specical cases for bulk actions
    if (action === 'DELETE_ALL' || action === 'DELETE_BULK') {
      return (
        <div className="flex items-center gap-2 text-danger font-bold">
          <Trash2 className="w-4 h-4" /> 
          Đã xóa {data.count || data.snapshot?.length || 'tất cả'} bản ghi
          {data.snapshot && <span className="text-[10px] bg-red-50 px-2 py-0.5 rounded-full">(Có snapshot khôi phục)</span>}
        </div>
      );
    }

    if (action === 'IMPORT_BUDGETS' || action === 'IMPORT_COSTS' || action === 'IMPORT_UNIFIED_URL') {
      return (
        <div className="flex items-center gap-2 text-success font-bold">
          <FileUp className="w-4 h-4" /> 
          {action === 'IMPORT_UNIFIED_URL' ? (
            <span>Nhập từ URL: {data.costCount} chi phí, {data.efficiencyCount} hiệu quả</span>
          ) : (
            <span>Đã nhập {data.count || data.items?.length || data.snapshot?.length || 'nhiều'} bản ghi</span>
          )}
        </div>
      );
    }

    // Standard recursive renderer for small objects
    const renderObject = (obj: any, depth = 0) => {
      if (depth > 2) return <span className="text-muted-foreground italic">...</span>;
      if (typeof obj !== 'object' || obj === null) return <span className="font-medium text-foreground">{String(obj)}</span>;
      
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 pl-3 border-l-2 border-indigo-100 my-1">
          {Object.entries(obj).map(([key, val]) => {
            if (['snapshot', 'payload', 'items', 'counts'].includes(key)) return null; 
            
            // Highlight changes if old/new exist
            if (key === 'oldAmount' || key === 'newAmount' || key === 'amount' || key === 'oldName' || key === 'newName') {
               const isOld = key.startsWith('old');
               const isNew = key.startsWith('new');
               return (
                 <div key={key} className="flex items-center gap-2 text-xs">
                   <span className="font-bold text-slate-400 capitalize">{key.replace('Amount', ' (VNĐ)')}:</span>
                   <span className={`${isOld ? 'text-slate-400 line-through' : isNew ? 'text-emerald-600 font-black' : 'text-slate-900 font-bold'}`}>
                     {typeof val === 'number' ? formatCurrency(val) : String(val)}
                   </span>
                 </div>
               );
            }

            return (
              <div key={key} className="flex items-center gap-2 text-xs overflow-hidden">
                <span className="font-bold text-slate-500 min-w-[80px] shrink-0">{key}:</span>
                <span className="text-slate-900 truncate">
                  {typeof val === 'object' ? renderObject(val, depth + 1) : String(val)}
                </span>
              </div>
            );
          })}
        </div>
      );
    };

    return <div className="w-full">{renderObject(data)}</div>;
  };

  const handleCreateCheckpoint = async (customNote: string = '') => {
    if (isBackingUp) return;
    setIsBackingUp(true);
    const toastId = toast.loading('Đang chuẩn bị bản sao hệ thống...');
    
    try {
      // Helper function to sanitize data for storage (limited to avoid huge payloads if needed, but let's try full)
      const prepareSnapshot = (data: any[]) => {
        if (!data || !Array.isArray(data)) return [];
        return data.map(item => {
          const newItem = { ...item };
          // Convert any complex objects to strings if they aren't standard
          return newItem;
        });
      };

      const snapshot = {
        budgets: prepareSnapshot(budgets),
        costs: prepareSnapshot(costs),
        projects: prepareSnapshot(projects),
        teams: prepareSnapshot(teams),
        efficiencyReports: prepareSnapshot(efficiencyReports),
        regions: prepareSnapshot(regions),
        types: prepareSnapshot(types)
      };

      await logAction('SYSTEM_CHECKPOINT', 'system', 'checkpoint', { 
        snapshot, 
        note: customNote || `Checkpoint tự động tạo bởi ${user?.email}`,
        counts: {
          budgets: budgets.length,
          costs: costs.length,
          projects: projects.length,
          teams: teams.length,
          efficiency: efficiencyReports.length
        }
      });

      toast.success('Đã lưu điểm khôi phục hệ thống thành công!', { id: toastId });
    } catch (error) {
      console.error('Checkpoint error:', error);
      toast.error('Lỗi khi tạo điểm khôi phục.', { id: toastId });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreCheckpoint = async (checkpoint: any) => {
    if (!checkpoint || !checkpoint.data?.snapshot) {
      toast.error('Dữ liệu khôi phục không hợp lệ hoặc bị thiếu snapshot');
      return;
    }

    if (isRestoringData) return;
    setIsRestoringData(true);
    const loadingToastId = toast.loading('Đang khởi động tiến trình khôi phục điểm thời gian...');

    try {
      const snapshot = checkpoint.data.snapshot;
      const collections = [
        { name: 'budgets', key: 'budgets' },
        { name: 'costs', key: 'costs' },
        { name: 'projects', key: 'projects' },
        { name: 'teams', key: 'teams' },
        { name: 'efficiencyReports', key: 'hieuQuaKinhDoanh' },
        { name: 'regions', key: 'regions' },
        { name: 'types', key: 'types' }
      ];

      // Deep Restore Logic:
      // We want to make the current state match the snapshot exactly.
      // However, to avoid massive bulk deletion that could hit limits or be irreversible, 
      // we'll use a "Synchronized Merge" approach:
      // 1. Restore anything missing from the snapshot.
      // 2. Update anything that differs.
      
      let totalOps = 0;
      let batch = writeBatch(db);

      const commitBatchAndReset = async () => {
        if (totalOps > 0) {
          await batch.commit();
          batch = writeBatch(db);
          totalOps = 0;
        }
      };

      for (const coll of collections) {
        const snapshotData = snapshot[coll.key] || snapshot[coll.name] || [];
        
        for (const item of snapshotData) {
          if (!item.id) continue;
          
          const docRef = doc(db, coll.name, item.id);
          const { id, ...dataToSave } = item;
          
          batch.set(docRef, {
            ...dataToSave,
            restoredAt: serverTimestamp(),
            restoredBy: user?.uid,
            restoredFromCheckpoint: checkpoint.id
          });
          
          totalOps++;
          if (totalOps >= 450) await commitBatchAndReset();
        }
      }

      await commitBatchAndReset();
      
      await logAction('RESTORE_CHECKPOINT_EXECUTED', 'system', checkpoint.id, { 
        checkpointId: checkpoint.id,
        timestamp: checkpoint.timestamp
      });

      toast.success('Hệ thống đã được khôi phục về phiên bản đã chọn!', { id: loadingToastId });
      setIsRestoreCheckpointDialogOpen(false);
      setSelectedCheckpoint(null);
    } catch (error) {
      console.error('Point in time restore error:', error);
      handleFirestoreError(error, OperationType.WRITE, 'system');
      toast.error('Lỗi trong quá trình khôi phục.', { id: loadingToastId });
    } finally {
      setIsRestoringData(false);
    }
  };

  const handleRestoreFullDatabase = async () => {
    if (isRestoringData) return;
    setIsRestoringData(true);
    toast.info('Đang phân tích dữ liệu lịch sử để khôi phục toàn hệ thống...');

    try {
      const dbMaps: Record<string, Record<string, any>> = {
        'budgets': {}, 'costs': {}, 'projects': {}, 'teams': {},
        'regions': {}, 'types': {}, 'efficiencyReports': {}
      };

      const collMap: Record<string, string> = {
        'budgets': 'budgets', 'nganSach': 'budgets',
        'costs': 'costs', 'chiPhi': 'costs',
        'projects': 'projects', 'duAn': 'projects', 'du_an': 'projects',
        'teams': 'teams', 'team': 'teams',
        'regions': 'regions', 'vungKhuVuc': 'regions',
        'types': 'types', 'projectTypes': 'types', 'loai_hinh': 'types',
        'efficiencyReports': 'efficiencyReports', 'hieuQuaKinhDoanh': 'efficiencyReports'
      };

      const sortedLogs = [...auditLogs].reverse();

      sortedLogs.forEach(log => {
        const targetColl = collMap[log.collection];
        if (!targetColl) {
          if (log.action === 'FULL_SYSTEM_BACKUP' && log.data?.payload) {
            const p = log.data.payload;
            if (p.nganSach) p.nganSach.forEach((i: any) => dbMaps['budgets'][i.id] = i);
            if (p.chiPhi) p.chiPhi.forEach((i: any) => dbMaps['costs'][i.id] = i);
            if (p.duAn) p.duAn.forEach((i: any) => dbMaps['projects'][i.id] = i);
            if (p.team) p.team.forEach((i: any) => dbMaps['teams'][i.id] = i);
            if (p.vungKhuVuc) p.vungKhuVuc.forEach((i: any) => dbMaps['regions'][i.id] = i);
            if (p.hieuQuaKinhDoanh) p.hieuQuaKinhDoanh.forEach((i: any) => dbMaps['efficiencyReports'][i.id] = i);
          }
          return;
        }

        const map = dbMaps[targetColl];
        if (log.action === 'CREATE' || log.action === 'UPDATE' || log.action?.startsWith('IMPORT')) {
          if (log.data) {
            if (log.docId && log.docId !== 'bulk' && log.docId !== 'all') {
              map[log.docId] = { ...(map[log.docId] || {}), ...log.data, id: log.docId };
            } else if (log.data.snapshot) {
              log.data.snapshot.forEach((b: any) => map[b.id] = { ...b });
            } else if (log.data.items) {
              log.data.items.forEach((b: any) => { if (b.id) map[b.id] = { ...b }; });
            }
          }
        } else if (log.action === 'DELETE') {
          delete map[log.docId];
        } else if (log.action?.startsWith('DELETE_')) {
          if (log.data?.snapshot) {
            log.data.snapshot.forEach((b: any) => map[b.id] = { ...b });
          }
        }
      });

      const batch = writeBatch(db);
      let totalRestored = 0;

      const currentStates: Record<string, any[]> = {
        'budgets': budgets, 'costs': costs, 'projects': projects, 'teams': teams,
        'regions': regions, 'types': types, 'efficiencyReports': efficiencyReports
      };

      Object.entries(dbMaps).forEach(([collName, itemsMap]) => {
        const currentList = currentStates[collName] || [];
        Object.values(itemsMap).forEach((item: any) => {
          if (!currentList.some(cl => cl.id === item.id)) {
            const docRef = doc(db, collName, item.id);
            const { id, ...dataToSave } = item;
            batch.set(docRef, {
              ...dataToSave,
              createdAt: dataToSave.createdAt || serverTimestamp(),
              restoredAt: serverTimestamp(),
              restoredFromDeepScan: true,
              restoredBy: user?.uid
            });
            totalRestored++;
          }
        });
      });

      if (totalRestored === 0) {
        toast.info('Không tìm thấy thêm dữ liệu nào bị thiếu để khôi phục.');
      } else {
        await batch.commit();
        await logAction('DEEP_SYSTEM_RESTORE', 'system', 'all', { count: totalRestored });
        toast.success(`Đã khôi phục thành công ${totalRestored} bản ghi cho toàn hệ thống.`);
      }
      setIsRestoreAllDialogOpen(false);
    } catch (error) {
      console.error('Deep restore error:', error);
      handleFirestoreError(error, OperationType.WRITE, 'system');
    } finally {
      setIsRestoringData(false);
    }
  };

  const handleMigrateBudgets = () => {
    const aprilBudgets = budgets.filter(b => b.month === '2026-04');
    if (aprilBudgets.length === 0) {
      toast.info('Không tìm thấy bản ghi tháng 4 nào để cập nhật');
      return;
    }
    setIsMigrateBudgetsDialogOpen(true);
  };

  const confirmMigrateBudgets = async () => {
    const aprilBudgets = budgets.filter(b => b.month === '2026-04');
    const aprilCosts = costs.filter(c => c.month === '2026-04');
    setIsMigratingBudgets(true);
    setIsMigrateBudgetsDialogOpen(false);
    try {
      const batch = writeBatch(db);
      
      // Migrate Budgets
      aprilBudgets.forEach(b => {
        batch.update(doc(db, 'budgets', b.id), { 
          month: '2026-05',
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid
        });
      });

      // Migrate Costs
      aprilCosts.forEach(c => {
        batch.update(doc(db, 'costs', c.id), {
          month: '2026-05',
          year: 2026, // Ensure year is also correct
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid
        });
      });

      await batch.commit();
      await logAction('MIGRATE_BUDGETS_AND_COSTS', 'budgets', 'bulk', { from: '2026-04', to: '2026-05', budgetCount: aprilBudgets.length, costCount: aprilCosts.length });
      toast.success(`Đã chuyển thành công ${aprilBudgets.length} ngân sách và ${aprilCosts.length} thực chi sang Tháng 5`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'budgets');
    } finally {
      setIsMigratingBudgets(false);
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

  const handleDownloadCostTemplate = () => {
    const headers = ['ProjectID', 'TeamID', 'Month', 'Period', 'FBAds', 'Posting', 'ZaloAds', 'GoogleAds', 'OtherCost', 'Note'];
    const sampleData = [
      ['p_id_1', 't_id_1', '2026-03', '1', '1000000', '500000', '0', '0', '100000', 'Note sample'],
      ['p_id_2', 't_id_2', '2026-03', '2', '2000000', '1000000', '500000', '300000', '0', 'Note sample 2']
    ];
    
    const csvContent = [headers, ...sampleData].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "template_chi_phi.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportTeams = () => {
    if (teams.length === 0) {
      toast.error('Không có dữ liệu team để xuất');
      return;
    }

    const data = teams.map(t => ({
      'ID': t.id,
      'Mã Team': t.teamCode || '',
      'Tên Team': t.name,
      'Ngày tạo': t.createdAt ? format(t.createdAt.toDate ? t.createdAt.toDate() : new Date(t.createdAt), 'dd/MM/yyyy HH:mm:ss') : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Teams");
    XLSX.writeFile(workbook, `danh_sach_team_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
    toast.success('Đã xuất danh sách team thành công');
  };

  const handleExportProjects = () => {
    if (projects.length === 0) {
      toast.error('Không có dữ liệu dự án để xuất');
      return;
    }

    const data = projects.map(p => ({
      'ID': p.id,
      'Mã Dự án': p.projectCode || '',
      'Tên Dự án': p.name,
      'Khu vực': p.region || 'N/A',
      'Loại hình': p.type || 'N/A',
      'Ngày tạo': p.createdAt ? format(p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt), 'dd/MM/yyyy HH:mm:ss') : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Projects");
    XLSX.writeFile(workbook, `danh_sach_du_an_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
    toast.success('Đã xuất danh sách dự án thành công');
  };

  const handleExportBudgets = () => {
    if (budgets.length === 0) {
      toast.error('Không có dữ liệu ngân sách để xuất');
      return;
    }

    const data = budgets.map(b => ({
      'ID Dự án': b.projectId,
      'Tên Dự án': b.projectName || '',
      'ID Team': b.teamId,
      'Tên Team': b.teamName || '',
      'Tháng': b.month,
      'Người triển khai': b.implementerName || 'N/A',
      'Ngân sách': b.amount
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Budgets");
    XLSX.writeFile(workbook, `danh_sach_ngan_sach_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
    toast.success('Đã xuất danh sách ngân sách (Excel) thành công');
  };

  const handleExportCosts = () => {
    if (costs.length === 0) {
      toast.error('Không có dữ liệu chi phí để xuất');
      return;
    }

    const data = costs.map(c => ({
      'ID Dự án': c.projectId,
      'Tên Dự án': c.projectName || '',
      'Team': c.teamName || '',
      'Tháng': c.month,
      'Tuần': c.weekNumber,
      'Người triển khai': c.implementerName || 'N/A',
      'FB Ads': c.channels?.fbAds || 0,
      'Posting': c.channels?.posting || 0,
      'Zalo Ads': c.channels?.zaloAds || 0,
      'Google Ads': c.channels?.googleAds || 0,
      'Khác': c.channels?.otherCost || 0,
      'Tổng chi phí': c.amount,
      'Ghi chú': c.note || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Costs");
    XLSX.writeFile(workbook, `chi_phi_chi_tiet_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
    toast.success('Đã xuất danh sách chi phí (Excel) thành công');
  };

  const handleDownloadBudgetTemplate = () => {
    const headers = ['ID Dự án', 'ID Team', 'Tháng', 'Người triển khai', 'Ngân sách'];
    const sampleData = [
      ['p_id_1', 't_id_1', '2026-03', 'Nguyễn Văn A', '50000000'],
      ['p_id_2', 't_id_2', '2026-03', 'Trần Thị B', '75000000']
    ];
    
    const csvContent = "\uFEFF" + [headers, ...sampleData].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "template_dang_ky_ngan_sach.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportBudgetsCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingBudgets(true);
    setImportErrors([]);

    const processBudgetData = async (data: any[]) => {
      try {
        const batch = writeBatch(db);
        let count = 0;
        let errorsCount = 0;
        const errorDetailsList: string[] = [];

        // Pre-consolidate the incoming data by projectId_teamId_month
        const consolidatedDataMap = new Map();
        for (const rowData of data) {
          const processedRow = rowData as any;
          const normalizedRow: any = {};
          Object.keys(processedRow).forEach(k => {
            const cleanKey = k.trim().toLowerCase().normalize('NFC').replace(/\s+/g, '').replace(/^\uFEFF/, '');
            normalizedRow[cleanKey] = processedRow[k];
          });

          const getVal = (possibleKeys: string[]) => {
            for (const pk of possibleKeys) {
              const cleanPK = pk.trim().toLowerCase().normalize('NFC').replace(/\s+/g, '').replace(/^\uFEFF/, '');
              if (normalizedRow[cleanPK] !== undefined && normalizedRow[cleanPK] !== '') return normalizedRow[cleanPK];
            }
            return undefined;
          };

          const pRef = String(getVal(['ID Dự án', 'Mã Dự án', 'Dự án', 'ProjectID', 'idduan', 'id dự án', 'mã dự án']) || '').trim();
          const tRef = String(getVal(['ID Team', 'Mã Team', 'Tên Team', 'TeamID', 'teamid', 'id team', 'mã team']) || '').trim();
          const monthRaw = getVal(['Tháng', 'Kỳ', 'Month', 'thang', 'tháng', 'ky', 'kỳ']);
          const month = normalizeMonth(monthRaw);
          const amountRaw = getVal(['Ngân sách', 'Amount', 'ngansach', 'ngân sách', 'ngânsách', 'số tiền']);
          const amountDecimal = String(amountRaw || '0').replace(/[.,]/g, '');
          const amount = Number(amountDecimal);
          const implementer = String(getVal(['Người phụ trách', 'Giám đốc kinh doanh', 'GDDA', 'Người triển khai', 'Implementer', 'nguoiphutrach', 'giamdockinhdoanh', 'nguoitrienkhai', 'người triển khai', ' GD']) || '').trim();

          if (pRef && tRef && month && (amount >= 0 || !isNaN(amount))) {
            const key = `${pRef}_${tRef}_${month}`;
            if (consolidatedDataMap.has(key)) {
              consolidatedDataMap.get(key).amount += amount;
            } else {
              consolidatedDataMap.set(key, { pRef, tRef, month, amount, implementer, rawRow: processedRow });
            }
          } else if (Object.values(normalizedRow).some(v => v !== '')) {
             const missing = [];
             if (!pRef) missing.push('Dự án');
             if (!tRef) missing.push('Team');
             if (!month) missing.push('Tháng/Kỳ');
             if (isNaN(amount)) missing.push('Ngân sách (không phải số)');
             
             errorDetailsList.push(
               `THÔNG TIN SAI ĐỊNH DẠNG HOẶC THIẾU: (${missing.join(', ')}).\n` +
               `• Nguyên nhân: Cột "${missing[0]}" đang để trống hoặc chứa ký tự không hợp lệ (đối với số tiền).\n` +
               `• Cách khắc phục: Điền đầy đủ thông tin Dự án, Team, Tháng (YYYY-MM). Đối với Ngân sách chỉ điền chữ số, không kèm đơn vị VNĐ hay dấu chấm phân cách.`
             );
             errorsCount++;
          }
        }

        const consolidatedItems = Array.from(consolidatedDataMap.values()) as any[];

        for (const item of consolidatedItems) {
          const findProjectAddress = (ref: string) => {
            const cleanRef = ref.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            if (!cleanRef) return null;
            return projects.find(p => 
              p.id === ref || 
              (p.projectCode && p.projectCode.toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
              p.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef
            );
          };

          const findTeamAddress = (ref: string) => {
            const cleanRef = ref.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            if (!cleanRef) return null;
            return teams.find(t => 
              t.id === ref || 
              (t.teamCode && t.teamCode.toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
              t.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef
            );
          };

          const project = findProjectAddress(item.pRef);
          const team = findTeamAddress(item.tRef);

          if (!project) {
            errorDetailsList.push(
              `KHÔNG TÌM THẤY DỰ ÁN khớp với "${item.pRef}".\n` +
              `• Nguyên nhân: Tên hoặc mã Dự án không tồn tại. "Dự án" hiển thị trong file là "${item.pRef}".\n` +
              `• Cách khắc phục: Đối chiếu với danh sách Dự án trong hệ thống để lấy đúng tên hoặc ID.`
            );
            errorsCount++;
            continue;
          }
          if (!team) {
            errorDetailsList.push(
              `KHÔNG TÌM THẤY TEAM khớp với "${item.tRef}".\n` +
              `• Nguyên nhân: Tên hoặc mã Team không tồn tại. "Team" hiển thị trong file là "${item.tRef}".\n` +
              `• Cách khắc phục: Đối chiếu với danh sách Team trong hệ thống để lấy đúng tên hoặc ID.`
            );
            errorsCount++;
            continue;
          }

          const pId = project.id;
          const teamId = team.id;
          const assignedUserEmail = extractEmail(item.implementer);

          const existingBudgetsForMatch = budgets.filter(b => 
            b.projectId && b.projectId === pId && 
            b.teamId && b.teamId === teamId && 
            b.month === item.month
          );

          if (existingBudgetsForMatch.length > 0) {
            const targetBudget = existingBudgetsForMatch[0];
            const duplicates = existingBudgetsForMatch.slice(1);
            const bRef = doc(db, 'budgets', targetBudget.id);
            
            // Calculate total existing amount before merge
            const totalExistingAmount = existingBudgetsForMatch.reduce((sum, b) => sum + b.amount, 0);
            
            batch.update(bRef, {
              amount: totalExistingAmount + item.amount, // Add to existing total
              implementerName: item.implementer || targetBudget.implementerName,
              assignedUserEmail: assignedUserEmail || targetBudget.assignedUserEmail || null,
              userEmail: assignedUserEmail || targetBudget.userEmail || user?.email?.toLowerCase(),
              updatedAt: serverTimestamp(),
              updatedBy: user?.uid,
              editHistory: arrayUnion({
                action: 'IMPORT_ADD_MERGE',
                editorName: userProfile?.fullName || user?.displayName || 'Admin',
                editorEmail: user?.email,
                timestamp: new Date().toISOString(),
                addedAmount: item.amount,
                prevTotalInDb: totalExistingAmount,
                newTotal: totalExistingAmount + item.amount,
                duplicatesMerged: duplicates.length
              })
            });

            // Cleanup duplicates
            for (const dup of duplicates) {
              const affectedCosts = costs.filter(c => c.budgetId === dup.id);
              affectedCosts.forEach(c => {
                batch.update(doc(db, 'costs', c.id), { budgetId: targetBudget.id });
              });
              batch.delete(doc(db, 'budgets', dup.id));
            }
          } else {
            const bRef = doc(collection(db, 'budgets'));
            batch.set(bRef, {
              projectId: pId,
              projectName: project.name,
              teamId: teamId,
              teamName: team.name,
              implementerName: item.implementer || 'N/A',
              assignedUserEmail: assignedUserEmail,
              userEmail: assignedUserEmail || user?.email?.toLowerCase(),
              month: item.month,
              amount: item.amount,
              createdAt: serverTimestamp(),
              createdBy: user?.uid,
              editHistory: [{
                action: 'IMPORT_CREATE',
                editorName: 'Admin',
                timestamp: new Date().toISOString(),
                amount: item.amount
              }]
            });
          }
          count++;
        }

        if (count > 0) {
          await batch.commit();
          await logAction('IMPORT_BUDGETS', 'budgets', 'bulk', { count, errors: errorsCount });
          toast.success(`Đã cập nhật ${count} ngân sách. ${errorsCount > 0 ? `Bỏ qua ${errorsCount} dòng lỗi.` : ''}`);
        }

        if (count === 0 && errorsCount > 0) {
          toast.error(`Không có dữ liệu hợp lệ để nhập. Có ${errorsCount} dòng lỗi.`);
        } else if (count === 0) {
          toast.error(`Không có dữ liệu hợp lệ để nhập. Vui lòng kiểm tra tiêu đề cột và nội dung.`);
        }

        if (errorsCount > 0 || errorDetailsList.length > 0) {
          setImportErrors(errorDetailsList);
          setIsImportErrorsDialogOpen(true);
        }
      } catch (error) {
        console.error(error);
        toast.error('Lỗi khi nhập dữ liệu');
      } finally {
        setIsImportingBudgets(false);
        e.target.value = '';
      }
    };

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const buffer = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(firstSheet);
          await processBudgetData(json);
        } catch (error) {
          console.error(error);
          toast.error('Lỗi khi đọc file Excel');
          setIsImportingBudgets(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          await processBudgetData(results.data);
        },
        error: (error) => {
          toast.error('Lỗi khi đọc file CSV');
          setIsImportingBudgets(false);
        }
      });
    }
  };

  const handleImportCostsCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingCosts(true);
    setImportErrors([]);

    const findProjectInternal = (ref: string) => {
      const cleanRef = ref.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      if (!cleanRef) return null;
      return projects.find(p => 
        p.id === ref || 
        (p.projectCode && p.projectCode.toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
        p.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef
      );
    };

    const findTeamInternal = (ref: string) => {
      const cleanRef = ref.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      if (!cleanRef) return null;
      return teams.find(t => 
        t.id === ref || 
        (t.teamCode && t.teamCode.toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
        t.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef
      );
    };

    const processCostData = async (data: any[]) => {
      try {
        const batch = writeBatch(db);
        let count = 0;
        let errorsCount = 0;
        const errorDetailsList: string[] = [];

        for (let i = 0; i < data.length; i++) {
          const rawRow = data[i];
          const rowIndex = i + 2;
          const row: any = {};
          Object.keys(rawRow).forEach(k => {
            const cleanKey = k.trim().toLowerCase().normalize('NFC').replace(/\s+/g, '').replace(/^\uFEFF/, '');
            row[cleanKey] = rawRow[k];
          });

          const getVal = (possibleKeys: string[]) => {
            for (const pk of possibleKeys) {
              const cleanPK = pk.trim().toLowerCase().normalize('NFC').replace(/\s+/g, '').replace(/^\uFEFF/, '');
              if (row[cleanPK] !== undefined && row[cleanPK] !== '') return row[cleanPK];
            }
            return undefined;
          };

          const pRef = String(getVal(['ID Dự án', 'Mã Dự án', 'Dự án', 'ProjectID', 'idduan', 'id dự án', 'mã dự án']) || '').trim();
          const tRef = String(getVal(['ID Team', 'Mã Team', 'Tên Team', 'TeamID', 'idteam', 'id team', 'mã team']) || '').trim();
          const monthRaw = getVal(['Tháng', 'Kỳ tháng', 'Kỳ', 'Month', 'thang', 'tháng', 'kỳ']);
          const month = normalizeMonth(monthRaw);
          const periodValue = String(getVal(['Tuần', 'Kỳ tuần', 'Week', 'Period', 'tuan', 'tuần', 'ky']) || '').trim();
          
          const fbAds = parseVal(getVal(['FBAds', 'FB Ads', 'Facebook Ads', 'Facebook', 'Chi phí FB', 'QC Facebook', 'Ads FB', 'chiphi fb', 'facebook ads', 'ads facebook', 'facebook ads']));
          const posting = parseVal(getVal(['Posting', 'Đăng bài', 'Content', 'Content & Design', 'Content/Design', 'dangbai', 'chiphi content', 'posting/content', 'posting & content']));
          const zaloAds = parseVal(getVal(['ZaloAds', 'Zalo Ads', 'Zalo', 'Chi phí Zalo', 'QC Zalo', 'Ads Zalo', 'chiphi zalo', 'zalo ads', 'ads zalo']));
          const googleAds = parseVal(getVal(['GoogleAds', 'Google Ads', 'Google', 'Chi phí Google', 'QC Google', 'SEM', 'Ads Google', 'chiphi google', 'google ads', 'ads google', 'sem/google']));
          const otherCost = parseVal(getVal(['OtherCost', 'Chi phí khác', 'Khác', 'Phát sinh', 'Khác (Phát sinh)', 'chiphikhac', 'phatsinh', 'chi phi khac']));
          const note = String(getVal(['Note', 'Ghi chú', 'Ghi chú thêm', 'ghichu']) || '');

          if (!pRef || !tRef || !month) {
            const hasData = Object.values(row).some(v => v !== '');
            if (hasData) {
              const missingFields = [];
              if (!pRef) missingFields.push('Dự án');
              if (!tRef) missingFields.push('Team');
              if (!month) missingFields.push('Tháng');
              errorDetailsList.push(
                `Dòng ${rowIndex}: THIẾU THÔNG TIN BẮT BUỘC (${missingFields.join(', ')}).\n` +
                `• Nguyên nhân: Một trong các cột bắt buộc bị trống.\n` +
                `• Cách khắc phục: Hãy điền đầy đủ Dự án, Team và Tháng thực chi.`
              );
              errorsCount++;
            }
            continue;
          }

          const project = findProjectInternal(pRef);
          const team = findTeamInternal(tRef);

          if (!project) {
            errorDetailsList.push(
              `Dòng ${rowIndex}: KHÔNG TÌM THẤY DỰ ÁN khớp với "${pRef}".\n` +
              `• Nguyên nhân: Hệ thống không nhận diện được dự án này.\n` +
              `• Cách khắc phục: Kiểm tra lại tên hoặc ID Dự án trong danh sách Quản lý Dự án.`
            );
            errorsCount++;
            continue;
          }
          if (!team) {
            errorDetailsList.push(
              `Dòng ${rowIndex}: KHÔNG TÌM THẤY TEAM khớp với "${tRef}".\n` +
              `• Nguyên nhân: Hệ thống không nhận diện được team này.\n` +
              `• Cách khắc phục: Kiểm tra lại tên hoặc ID Team trong danh sách Quản lý Team.`
            );
            errorsCount++;
            continue;
          }

          const pId = project.id;
          const teamId = team.id;

          const matchingBudget = budgets.find(b => 
            b.projectId === pId && 
            b.teamId === teamId && 
            b.month === month
          );

          if (!matchingBudget) {
            errorDetailsList.push(
              `Dòng ${rowIndex}: KHÔNG CÓ NGÂN SÁCH ĐÃ DUYỆT cho [${project.name}] - [${team.name}] tháng ${month}.\n` +
              `• Nguyên nhân: Bạn đang nhập chi phí cho một dự án/team chưa được khai báo ngân sách trong tháng này.\n` +
              `• Cách khắc phục: Vui lòng nhập Ngân sách cho dự án này trước khi nhập chi phí thực tế.`
            );
            errorsCount++;
            continue;
          }

          const totalAmount = fbAds + posting + zaloAds + googleAds + otherCost;
          const [yearStr] = month.split('-');
          const year = Number(yearStr);

          const docRef = doc(collection(db, 'costs'));
          batch.set(docRef, {
            projectId: pId,
            projectName: project.name,
            budgetId: matchingBudget.id,
            implementerName: matchingBudget.implementerName || 'N/A',
            teamName: team.name,
            teamId: teamId,
            weekNumber: Number(periodValue) || 1,
            year,
            month,
            amount: totalAmount,
            channels: { fbAds, posting, zaloAds, googleAds, otherCost },
            note,
            createdAt: serverTimestamp(),
            createdBy: user?.uid,
            userEmail: user?.email?.toLowerCase()
          });
          count++;
        }

        if (count > 0) {
          await batch.commit();
          await logAction('IMPORT_COSTS', 'costs', 'bulk', { count, errors: errorsCount });
          toast.success(`Đã nhập thành công ${count} bản ghi. ${errorsCount > 0 ? `Bỏ qua ${errorsCount} dòng lỗi.` : ''}`);
          if (errorsCount > 0) {
            setImportErrors(errorDetailsList);
            setIsImportErrorsDialogOpen(true);
          }
        } else {
           if (errorDetailsList.length > 0) {
            setImportErrors(errorDetailsList);
            setIsImportErrorsDialogOpen(true);
          } else {
            toast.error(`Không thể nhập dữ liệu. Kiểm tra định dạng file.`);
          }
        }
        
        setIsImportCostsDialogOpen(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'costs');
      } finally {
        setIsImportingCosts(false);
        e.target.value = '';
      }
    };

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const buffer = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(firstSheet);
          await processCostData(json);
        } catch (error) {
          console.error(error);
          toast.error('Lỗi khi đọc file Excel');
          setIsImportingCosts(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          await processCostData(results.data);
        },
        error: (error) => {
          toast.error('Lỗi khi đọc file CSV');
          setIsImportingCosts(false);
        }
      });
    }
  };

  const handleImportCostsFromUrl = async () => {
    if (!costSheetUrl) {
      toast.error("Vui lòng nhập link Google Sheet");
      return;
    }

    // Extract Spreadsheet ID
    const match = costSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match || !match[1]) {
      toast.error("Link Google Sheet không đúng định dạng");
      return;
    }

    const spreadsheetId = match[1];
    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;

    setIsImportingCostsUrl(true);
    setIsImportingCosts(true);
    setImportErrors([]);

    try {
      const response = await fetch(exportUrl);
      if (!response.ok) {
        throw new Error("Không thể tải file từ Google Sheet. Hãy đảm bảo file đã được chia sẻ công khai.");
      }
      
      const buffer = await response.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
      
      let finalRows: any[] = [];
      let foundHeaders = false;

      // Scan all sheets to find the one with cost/efficiency headers
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const dataArr: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        let headerIndex = -1;
        for (let i = 0; i < Math.min(dataArr.length, 20); i++) {
          const row = dataArr[i];
          if (row && Array.isArray(row) && row.some(cell => {
            const str = String(cell || '').toLowerCase().replace(/\s+/g, '');
            return str.includes('chiphi') || str.includes('fbads') || str.includes('zalo') || str.includes('idduan') || str.includes('cănbán') || str.includes('idteam') || str.includes('dựán');
          })) {
            headerIndex = i;
            break;
          }
        }

        if (headerIndex !== -1) {
          finalRows = XLSX.utils.sheet_to_json(worksheet, { range: headerIndex });
          if (finalRows.length > 0) {
            foundHeaders = true;
            break;
          }
        }
      }

      if (!foundHeaders || finalRows.length === 0) {
        // Fallback to first sheet
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        finalRows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
      }

      if (finalRows.length === 0) {
        toast.error("Không tìm thấy dữ liệu hợp lệ trong Google Sheet.");
        return;
      }

      const batch = writeBatch(db);
      let costCount = 0;
      let efficiencyCount = 0;
      let skippedCount = 0;
      const errorDetails: string[] = [];


      for (let i = 0; i < finalRows.length; i++) {
        const row = finalRows[i];
        const rowIndex = i + 2; // Assuming header is at some index, this is relative
        
        // Normalize keys
        const normalizedRow: any = {};
        Object.keys(row).forEach(k => {
          const cleanKey = k.trim().toLowerCase().replace(/\s+/g, '');
          normalizedRow[cleanKey] = row[k];
        });

        const getVal = (possibleKeys: string[]) => {
          for (const pk of possibleKeys) {
            const cleanPK = pk.trim().toLowerCase().replace(/\s+/g, '');
            if (normalizedRow[cleanPK] !== undefined && normalizedRow[cleanPK] !== '') return normalizedRow[cleanPK];
          }
          return undefined;
        };

        const pRef = String(getVal(['ID Dự án', 'Mã Dự án', 'Dự án', 'ProjectID', 'idduan', 'id dự án', 'tên dự án', 'mã dự án']) || '').trim();
        const tRef = String(getVal(['ID Team', 'Mã Team', 'Tên Team', 'TeamID', 'idteam', 'id team', 'mã team', 'tên team']) || '').trim();
        const monthRaw = getVal(['Tháng', 'Kỳ tháng', 'Kỳ', 'Month', 'thang', 'tháng', 'tháng', 'kỳ']);
        const month = normalizeMonth(monthRaw);
        const period = String(getVal(['Tuần', 'Kỳ tuần', 'Week', 'Period', 'tuan', 'tuần', 'kỳ']) || '').trim();
        
        // Cost values with even more expanded aliases
        const fbAds = parseVal(getVal(['FBAds', 'FB Ads', 'Facebook Ads', 'Facebook', 'Chi phí FB', 'QC Facebook', 'Ads FB', 'chiphi fb', 'facebook ads', 'ads facebook']));
        const posting = parseVal(getVal(['Posting', 'Đăng bài', 'Content', 'Content & Design', 'Content/Design', 'dangbai', 'chiphi content', 'posting/content', 'chi phí content']));
        const zaloAds = parseVal(getVal(['ZaloAds', 'Zalo Ads', 'Zalo', 'Chi phí Zalo', 'QC Zalo', 'Ads Zalo', 'chiphi zalo', 'zalo ads', 'ads zalo']));
        const googleAds = parseVal(getVal(['GoogleAds', 'Google Ads', 'Google', 'Chi phí Google', 'QC Google', 'SEM', 'Ads Google', 'chiphi google', 'google ads', 'ads google', 'sem/google']));
        const otherCost = parseVal(getVal(['OtherCost', 'Chi phí khác', 'Khác', 'Phát sinh', 'Khác (Phát sinh)', 'chiphikhac', 'phatsinh', 'chi phí phát sinh']));
        const note = String(getVal(['Note', 'Ghi chú', 'Ghi chú thêm', 'ghichu', 'ghi chú']) || '');

        // Efficiency values
        const salesCount = parseVal(getVal(['Căn bán', 'Số căn bán', 'Sales Count', 'Sales', 'Số căn', 'Căn', 'canban', 'socanban', 'units', 'số lượng']));
        const revenue = parseVal(getVal(['Doanh số', 'Revenue', 'Doanh thu', 'Thực đạt', 'Tổng doanh thu', 'Doanh thu thực', 'doanhso', 'doanhthu', 'thực thu']));

        if (!pRef || !tRef || !month) {
          // Skip truly empty rows without error
          const hasAnyData = Object.values(normalizedRow).some(v => v !== '');
          if (hasAnyData) {
            errorDetails.push(`Dòng ${rowIndex}: Thiếu thông tin bắt buộc (Dự án: "${pRef}", Team: "${tRef}", Kỳ: "${month}")`);
            skippedCount++;
          }
          continue;
        }

        const findProject = (ref: string) => {
          const cleanRef = ref.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
          if (!cleanRef) return null;
          return projects.find(p => 
            p.id === ref || 
            (p.projectCode && p.projectCode.toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
            p.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef
          );
        };

        const findTeam = (ref: string) => {
          const cleanRef = ref.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
          if (!cleanRef) return null;
          return teams.find(t => 
            t.id === ref || 
            (t.teamCode && t.teamCode.toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
            t.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef
          );
        };

        const project = findProject(pRef);
        const team = findTeam(tRef);

        if (!project) {
          errorDetails.push(`Dòng ${rowIndex}: Không tìm thấy Dự án khớp với "${pRef}"`);
          skippedCount++;
          continue;
        }
        if (!team) {
          errorDetails.push(`Dòng ${rowIndex}: Không tìm thấy Team khớp với "${tRef}"`);
          skippedCount++;
          continue;
        }

        const projectId = project.id;
        const teamId = team.id;
        const [yearStr] = month.split('-');
        const year = Number(yearStr);

        // 1. Process Costs (if cost values exist and match a budget)
        const totalAmount = fbAds + posting + zaloAds + googleAds + otherCost;
        if (totalAmount > 0) {
          const matchingBudget = budgets.find(b => 
            b.projectId === projectId && 
            b.teamId === teamId && 
            b.month === month
          );

          if (matchingBudget) {
            const weekNum = Number(period) || 1;
            const docRef = doc(collection(db, 'costs'));
            batch.set(docRef, {
              projectId,
              projectName: project.name,
              budgetId: matchingBudget.id,
              implementerName: matchingBudget.implementerName || 'N/A',
              teamName: team.name,
              teamId: teamId,
              weekNumber: weekNum,
              year,
              month,
              amount: totalAmount,
              channels: { fbAds, posting, zaloAds, googleAds, otherCost },
              note,
              createdAt: serverTimestamp(),
              createdBy: user?.uid,
              userEmail: user?.email?.toLowerCase()
            });
            costCount++;
          } else {
            errorDetails.push(`Dòng ${rowIndex}: Không tìm thấy Ngân sách cho [${project.name}] - [${team.name}] vào tháng ${month}. Vui lòng đăng ký ngân sách trước.`);
            skippedCount++;
          }
        }

        // 2. Process Efficiency (always process if values exist)
        if (salesCount > 0 || revenue > 0) {
          const existingEfficiency = efficiencyReports.find(r => 
            r.projectId === projectId && 
            r.teamId === teamId && 
            r.month === month
          );

          if (existingEfficiency) {
            const docRef = doc(db, 'efficiencyReports', existingEfficiency.id);
            batch.update(docRef, {
              salesCount,
              revenue,
              updatedAt: serverTimestamp()
            });
          } else {
            const docRef = doc(collection(db, 'efficiencyReports'));
            batch.set(docRef, {
              projectId,
              projectName: project.name,
              teamId,
              teamName: team.name,
              month,
              salesCount,
              revenue,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              createdBy: user?.uid,
              createdByEmail: user?.email
            });
          }
          efficiencyCount++;
        }
      }

      if (costCount > 0 || efficiencyCount > 0) {
        await batch.commit();
        await logAction('IMPORT_UNIFIED_URL', 'multiple', spreadsheetId, { costCount, efficiencyCount, errors: skippedCount });
        
        let msg = `Nhập thành công: ${costCount} chi phí, ${efficiencyCount} hiệu quả.`;
        if (skippedCount > 0) {
          msg += ` Bỏ qua ${skippedCount} dòng không hợp lệ.`;
          setImportErrors(errorDetails);
          setIsImportErrorsDialogOpen(true);
        }
        toast.success(msg);
        
        setIsImportCostsDialogOpen(false);
        setCostSheetUrl('');
      } else {
        if (errorDetails.length > 0) {
          setImportErrors(errorDetails);
          setIsImportErrorsDialogOpen(true);
        } else {
          toast.error(`Không tìm thấy dữ liệu hợp lệ để nhập.`);
        }
      }
    } catch (error) {
      console.error("Unified Import Error:", error);
      toast.error("Lỗi khi nhập dữ liệu. Hãy kiểm tra lại link và định dạng file.");
    } finally {
      setIsImportingCostsUrl(false);
      setIsImportingCosts(false);
    }
  };

  const handleUpdateCost = async (id: string) => {
    if (!editingCostAmount || isNaN(Number(editingCostAmount))) {
      toast.error('Vui lòng nhập số tiền hợp lệ');
      return;
    }
    try {
      const existingCost = costs.find(c => c.id === id);
      await updateDoc(doc(db, 'costs', id), {
        amount: Number(editingCostAmount),
        note: editingCostNote,
        updatedAt: serverTimestamp(),
        editHistory: arrayUnion({
          action: 'UPDATE',
          editorName: userProfile?.fullName || user?.displayName || 'Unknown',
          editorEmail: user?.email,
          timestamp: new Date().toISOString(),
          changes: {
            amount: { old: existingCost?.amount, new: Number(editingCostAmount) },
            note: { old: existingCost?.note, new: editingCostNote }
          }
        })
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
      const userEmail = user?.email?.toLowerCase();
      const budgetEmail = b.userEmail?.toLowerCase() || b.createdByEmail?.toLowerCase();
      const isOwner = (budgetEmail && userEmail && budgetEmail === userEmail) || (b.createdBy === user?.uid);
      const isAssigned = b.assignedUserEmail?.toLowerCase() === userEmail;
      
      // Role-based access control
      const hasAccess = isAdmin || isMod || 
                         (isGDDA && userProfile?.assignedProjects?.includes(b.projectId)) ||
                         (isOwner || isAssigned);
      
      if (!hasAccess) return false;

      const matchProject = reportProject === 'all' || b.projectId === reportProject;
      const bTeamName = teamMap[b.teamId] || b.teamName;
      const matchTeam = reportTeam === 'all' || bTeamName === reportTeam;
      const matchMonth = reportMonths.length === 0 || reportMonths.includes(b.month);
      const matchRegion = reportRegion === 'all' || (project?.region === reportRegion);
      const matchType = reportType === 'all' || (project?.type === reportType);
      
      return matchProject && matchTeam && matchMonth && matchRegion && matchType;
    }).sort((a, b) => {
      const factor = budgetReportSort.direction === 'asc' ? 1 : -1;
      if (budgetReportSort.key === 'amount') return (a.amount - b.amount) * factor;
      if (budgetReportSort.key === 'team') return (a.teamName || '').localeCompare(b.teamName || '') * factor;
      if (budgetReportSort.key === 'project') return (a.projectName || '').localeCompare(b.projectName || '') * factor;
      if (budgetReportSort.key === 'implementer') return (a.implementerName || '').localeCompare(b.implementerName || '') * factor;
      return 0;
    });
  }, [budgets, reportProject, reportTeam, reportMonths, reportRegion, reportType, projects, isAdmin, isMod, isGDDA, isUser, userProfile, reportWeek, budgetReportSort]);

  const filteredCosts = useMemo(() => {
    return costs.filter(c => {
      const project = projects.find(p => p.id === c.projectId);
      const userEmail = user?.email?.toLowerCase();
      const costEmail = c.userEmail?.toLowerCase() || c.createdByEmail?.toLowerCase();
      const isOwner = (costEmail && userEmail && costEmail === userEmail) || (c.createdBy === user?.uid);
      const isAssigned = c.assignedUserEmail?.toLowerCase() === userEmail;
      
      // Role-based access control
      const hasAccess = isAdmin || isMod || 
                         (isGDDA && userProfile?.assignedProjects?.includes(c.projectId)) ||
                         (isOwner || isAssigned);
      
      if (!hasAccess) return false;

      const matchProject = reportProject === 'all' || c.projectId === reportProject;
      const cTeamName = teamMap[c.teamId] || c.teamName;
      const matchTeam = reportTeam === 'all' || cTeamName === reportTeam;
      
      // Map cost date to marketing month
      const mMonth = c.month || (c.createdAt?.toDate ? getMarketingMonth(c.createdAt.toDate()) : null);
      const matchMonth = mMonth && (reportMonths.length === 0 || reportMonths.includes(mMonth));
      const matchRegion = reportRegion === 'all' || (project?.region === reportRegion);
      const matchType = reportType === 'all' || (project?.type === reportType);
      const matchWeek = reportWeek === 'all' || c.weekNumber?.toString() === reportWeek;
      
      return matchProject && matchTeam && matchMonth && matchRegion && matchType && matchWeek;
    }).sort((a, b) => {
      const factor = costReportSort.direction === 'asc' ? 1 : -1;
      if (costReportSort.key === 'amount') return (a.amount - b.amount) * factor;
      if (costReportSort.key === 'team') return (a.teamName || '').localeCompare(b.teamName || '') * factor;
      if (costReportSort.key === 'project') return (a.projectName || '').localeCompare(b.projectName || '') * factor;
      if (costReportSort.key === 'implementer') return (a.implementerName || '').localeCompare(b.implementerName || '') * factor;
      if (costReportSort.key === 'week') return (a.weekNumber - b.weekNumber) * factor;
      return 0;
    });
  }, [costs, reportProject, reportTeam, reportMonths, getMarketingMonth, reportRegion, reportType, projects, isAdmin, isMod, isGDDA, isUser, userProfile, reportWeek, costReportSort]);

  const adminFilteredBudgets = useMemo(() => {
    return budgets.filter(b => {
      const matchesSearch = 
        (projectMap[b.projectId] || b.projectName || '').toLowerCase().includes(adminBudgetSearch.toLowerCase()) ||
        (teamMap[b.teamId] || b.teamName || '').toLowerCase().includes(adminBudgetSearch.toLowerCase()) ||
        (b.implementerName || '').toLowerCase().includes(adminBudgetSearch.toLowerCase());
      const matchesMonth = !adminBudgetMonthFilter || b.month === adminBudgetMonthFilter;
      return matchesSearch && matchesMonth;
    }).sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return dateB - dateA;
    });
  }, [budgets, adminBudgetSearch, adminBudgetMonthFilter, projectMap, teamMap]);

  const uniqueTeams = useMemo(() => {
    return Array.from(new Set(teams.map(t => t.name)));
  }, [teams]);

  const uniqueRegions = useMemo(() => {
    return regions.map(r => r.name).sort();
  }, [regions]);

  const uniqueTypes = useMemo(() => {
    return types.map(t => t.name).sort();
  }, [types]);

  const overBudgetProjectIds = useMemo(() => {
    const currentMonth = getMarketingMonth(new Date());
    const projectBudgets: {[key: string]: number} = {};
    const projectCosts: {[key: string]: number} = {};
    
    budgets.forEach(b => {
      if (b.month === currentMonth) {
        projectBudgets[b.projectId] = (projectBudgets[b.projectId] || 0) + b.amount;
      }
    });
    
    costs.forEach(c => {
      const mMonth = c.month || (c.createdAt?.toDate ? getMarketingMonth(c.createdAt.toDate()) : null);
      if (mMonth === currentMonth) {
        projectCosts[c.projectId] = (projectCosts[c.projectId] || 0) + c.amount;
      }
    });

    const set = new Set<string>();
    Object.entries(projectBudgets).forEach(([pid, budget]) => {
      if ((projectCosts[pid] || 0) > budget) {
        set.add(pid);
      }
    });
    return set;
  }, [budgets, costs, getMarketingMonth]);

  const channelReportData = useMemo(() => {
    const keyData: { [key: string]: any } = {};
    
    filteredCosts.forEach(c => {
      const key = `${c.projectId}_${c.teamName}`;
      if (!keyData[key]) {
        keyData[key] = {
          projectId: c.projectId,
          projectName: c.projectName,
          teamName: c.teamName,
          fbAds: 0,
          googleAds: 0,
          zaloAds: 0,
          posting: 0,
          visaAmount: 0,
          digitalAmount: 0,
          otherCost: 0,
          total: 0
        };
      }
      
      const p = keyData[key];
      const ch = c.channels || {};
      p.fbAds += ch.fbAds || 0;
      p.googleAds += ch.googleAds || 0;
      p.zaloAds += ch.zaloAds || 0;
      p.posting += ch.posting || 0;
      p.visaAmount += ch.visaAmount || 0;
      p.digitalAmount += ch.digitalAmount || 0;
      p.otherCost += ch.otherCost || 0;
      p.total += c.amount || 0;
    });

    return Object.values(keyData).sort((a: any, b: any) => {
       if (a.teamName !== b.teamName) return a.teamName.localeCompare(b.teamName);
       return b.total - a.total;
    });
  }, [filteredCosts]);

  const chartData = useMemo(() => {
    return uniqueTeams.filter(t => reportTeam === 'all' || t === reportTeam).map(team => {
      const teamBudgets = budgets.filter(b => {
        const project = projects.find(p => p.id === b.projectId);
        const matchProject = reportProject === 'all' || b.projectId === reportProject;
        const matchMonth = reportMonths.length === 0 || reportMonths.includes(b.month);
        const matchRegion = reportRegion === 'all' || (project?.region === reportRegion);
        const matchType = reportType === 'all' || (project?.type === reportType);
        const bTeamName = teamMap[b.teamId] || b.teamName;
        return matchProject && bTeamName === team && matchMonth && matchRegion && matchType;
      });
      
      let teamTotalBudget = teamBudgets.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      if (chartTimeType === 'week' && reportWeek !== 'all') teamTotalBudget = teamTotalBudget / 4;

      let teamTotalCost = costs.filter(c => {
        const project = projects.find(p => p.id === c.projectId);
        const matchProject = reportProject === 'all' || c.projectId === reportProject;
        const mMonth = c.month || (c.createdAt?.toDate ? getMarketingMonth(c.createdAt.toDate()) : null);
        const matchMonth = mMonth && (reportMonths.length === 0 || reportMonths.includes(mMonth));
        const matchRegion = reportRegion === 'all' || (project?.region === reportRegion);
        const matchType = reportType === 'all' || (project?.type === reportType);
        const matchWeek = chartTimeType === 'month' || reportWeek === 'all' || c.weekNumber?.toString() === reportWeek;
        const cTeamName = teamMap[c.teamId] || c.teamName;
        
        return matchProject && cTeamName === team && matchMonth && matchRegion && matchType && matchWeek;
      }).reduce((acc, curr) => acc + (curr.amount || 0), 0);

      // Project breakdown for team
      const teamProjectDetails = projects.map(p => {
        const pBudgets = teamBudgets.filter(b => b.projectId === p.id);
        const pCosts = costs.filter(c => {
          const project = projects.find(proj => proj.id === c.projectId);
          const matchProject = c.projectId === p.id;
          const mMonth = c.month || (c.createdAt?.toDate ? getMarketingMonth(c.createdAt.toDate()) : null);
          const matchMonth = mMonth && (reportMonths.length === 0 || reportMonths.includes(mMonth));
          const matchRegion = reportRegion === 'all' || (project?.region === reportRegion);
          const matchType = reportType === 'all' || (project?.type === reportType);
          const matchWeek = chartTimeType === 'month' || reportWeek === 'all' || c.weekNumber?.toString() === reportWeek;
          const cTeamName = teamMap[c.teamId] || c.teamName;
          
          return matchProject && cTeamName === team && matchMonth && matchRegion && matchType && matchWeek;
        });

        let pTotalBudget = pBudgets.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        let pTotalCost = pCosts.reduce((acc, curr) => acc + (curr.amount || 0), 0);

        if (chartTimeType === 'week' && reportWeek !== 'all') {
          pTotalBudget = pTotalBudget / 4;
        }

        let pRevenue = efficiencyReports
          .filter(r => r.projectId === p.id && (teamMap[r.teamId] === team || r.teamName === team) && (reportMonths.length === 0 || reportMonths.includes(r.month)))
          .reduce((acc, curr) => acc + (curr.revenue || 0), 0);

        if (chartTimeType === 'week' && reportWeek !== 'all') {
          pRevenue = pRevenue / 4;
        }

        return {
          name: p.name,
          budget: pTotalBudget,
          actual: pTotalCost,
          revenue: pRevenue
        };
      }).filter(d => d.budget > 0 || d.actual > 0)
        .sort((a, b) => (b[reportSortBy] || 0) - (a[reportSortBy] || 0));

      let teamRevenue = efficiencyReports
        .filter(r => (teamMap[r.teamId] === team || r.teamName === team) && (reportMonths.length === 0 || reportMonths.includes(r.month)) && (reportProject === 'all' || r.projectId === reportProject))
        .reduce((acc, curr) => acc + (curr.revenue || 0), 0);

      if (chartTimeType === 'week' && reportWeek !== 'all') {
        teamRevenue = teamRevenue / 4;
      }
      
      return {
        name: team,
        budget: teamTotalBudget,
        actual: teamTotalCost,
        revenue: teamRevenue,
        details: teamProjectDetails,
        isTeamReport: true
      };
    }).filter(d => d.budget > 0 || d.actual > 0)
      .sort((a, b) => b[reportSortBy] - a[reportSortBy]);
  }, [uniqueTeams, budgets, costs, reportTeam, reportProject, reportMonths, reportRegion, reportType, projects, chartTimeType, reportWeek, getMarketingMonth, reportSortBy]);

  const efficiencyChartData = useMemo(() => {
    // rawData structure: rawData[mainKey][detailKey] = { budget, cost, revenue, sales }
    const rawData: { [key: string]: { [detailKey: string]: { budget: number, cost: number, revenue: number, sales: number } } } = {};

    const getTarget = (mainKey: string, detailKey: string) => {
      if (!mainKey || !detailKey) return null;
      if (!rawData[mainKey]) rawData[mainKey] = {};
      if (!rawData[mainKey][detailKey]) rawData[mainKey][detailKey] = { budget: 0, cost: 0, revenue: 0, sales: 0 };
      return rawData[mainKey][detailKey];
    };

    // Budgets - Normalize by period
    budgets.forEach(b => {
      if (reportMonths.length > 0 && !reportMonths.includes(b.month)) return;
      if (reportProject !== 'all' && b.projectId !== reportProject) return;
      const bTeamName = teamMap[b.teamId] || b.teamName;
      if (reportTeam !== 'all' && bTeamName !== reportTeam) return;

      const bProject = projects.find(p => p.id === b.projectId);
      const bRegion = bProject?.region || 'Khác';
      const tId = b.teamId || b.teamName;
      
      let mainKey, detailKey;
      if (efficiencyGroupType === 'project') {
        mainKey = b.projectId;
        detailKey = tId;
      } else if (efficiencyGroupType === 'region') {
        mainKey = bRegion;
        detailKey = b.projectId;
      } else {
        mainKey = tId;
        detailKey = b.projectId;
      }
      
      const target = getTarget(mainKey, detailKey);
      if (target) {
        let amount = b.amount || 0;
        if (chartTimeType === 'week') {
          // If a specific week is selected, show 1/4 of budget. 
          // If "All" weeks, we keep it as month total for the overview.
          if (reportWeek !== 'all') {
            amount = amount / 4;
          }
        }
        target.budget += amount;
      }
    });

    // Costs - Filter by week if needed
    costs.forEach(c => {
      const mMonth = c.month || (c.createdAt?.toDate ? getMarketingMonth(c.createdAt.toDate()) : null);
      if (mMonth && reportMonths.length > 0 && !reportMonths.includes(mMonth)) return;
      if (reportProject !== 'all' && c.projectId !== reportProject) return;
      const cTeamName = teamMap[c.teamId] || c.teamName;
      if (reportTeam !== 'all' && cTeamName !== reportTeam) return;

      // Week filter
      if (chartTimeType === 'week' && reportWeek !== 'all') {
        if (c.weekNumber?.toString() !== reportWeek) return;
      }

      const cProject = projects.find(p => p.id === c.projectId);
      const cRegion = cProject?.region || 'Khác';
      const tId = c.teamId || c.teamName;
      
      let mainKey, detailKey;
      if (efficiencyGroupType === 'project') {
        mainKey = c.projectId;
        detailKey = tId;
      } else if (efficiencyGroupType === 'region') {
        mainKey = cRegion;
        detailKey = c.projectId;
      } else {
        mainKey = tId;
        detailKey = c.projectId;
      }

      const target = getTarget(mainKey, detailKey);
      if (target) target.cost += c.amount || 0;
    });

    // Efficiency Reports - Note: Revenue is monthly in this app's current schema
    efficiencyReports.forEach(r => {
      if (reportMonths.length > 0 && !reportMonths.includes(r.month)) return;
      if (reportProject !== 'all' && r.projectId !== reportProject) return;
      const rProject = projects.find(p => p.id === r.projectId);
      const rRegion = rProject?.region || 'Khác';
      const currentTeamName = teamMap[r.teamId] || r.teamName;
      if (reportTeam !== 'all' && currentTeamName !== reportTeam) return;

      let mainKey, detailKey;
      if (efficiencyGroupType === 'project') {
        mainKey = r.projectId;
        detailKey = r.teamId;
      } else if (efficiencyGroupType === 'region') {
        mainKey = rRegion;
        detailKey = r.projectId;
      } else {
        mainKey = r.teamId;
        detailKey = r.projectId;
      }

      const target = getTarget(mainKey, detailKey);
      if (target) {
        // If we are looking at a single week, prorate revenue/sales
        let rev = r.revenue || 0;
        let sales = r.salesCount || 0;
        if (chartTimeType === 'week' && reportWeek !== 'all') {
          rev = rev / 4;
          sales = sales / 4;
        }
        target.sales += sales;
        target.revenue += rev;
      }
    });

    return Object.keys(rawData).map(mainKey => {
      let name;
      if (efficiencyGroupType === 'project') {
        name = projectMap[mainKey] || mainKey;
      } else if (efficiencyGroupType === 'region') {
        name = mainKey;
      } else {
        name = teamMap[mainKey] || mainKey;
      }
      
      const details = Object.keys(rawData[mainKey]).map(detailKey => {
        let detailName;
        if (efficiencyGroupType === 'project') {
          detailName = teamMap[detailKey] || detailKey;
        } else if (efficiencyGroupType === 'region') {
          detailName = projectMap[detailKey] || detailKey;
        } else {
          detailName = projectMap[detailKey] || detailKey;
        }
        
        return {
          name: detailName,
          ...rawData[mainKey][detailKey]
        };
      }).sort((a, b) => {
        if (reportSortBy === 'budget') return b.budget - a.budget;
        if (reportSortBy === 'actual') return b.cost - a.cost;
        return b.revenue - a.revenue || b.cost - a.cost;
      });

      const totals = details.reduce((acc, curr) => ({
        sales: acc.sales + curr.sales,
        revenue: acc.revenue + curr.revenue,
        cost: acc.cost + curr.cost,
        budget: acc.budget + curr.budget
      }), { sales: 0, revenue: 0, cost: 0, budget: 0 });

      return {
        id: mainKey,
        name,
        ...totals,
        details
      };
    }).sort((a, b) => {
      if (reportSortBy === 'budget') return b.budget - a.budget;
      if (reportSortBy === 'actual') return b.cost - a.cost;
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      return b.cost - a.cost;
    });
  }, [efficiencyReports, costs, budgets, reportMonths, reportProject, reportTeam, efficiencyGroupType, projectMap, teamMap, teams, chartTimeType, reportWeek, getMarketingMonth, reportSortBy]);

  const pendingSupportCount = useMemo(() => {
    return supportRequests.filter((r: any) => r.status === 'Chờ xử lý').length;
  }, [supportRequests]);

  const overBudgetStats = useMemo(() => {
    // Collect all granular items (Project-Team pairings) that are over budget
    const granularOverItems: any[] = [];
    let totalExcess = 0;

    efficiencyChartData.forEach(item => {
      // item is either a Project (with Team details) or a Team (with Project details)
      // Both ways cover all Project-Team combinations
      item.details.forEach((detail: any) => {
        if (detail.cost > detail.budget) {
          const excess = detail.cost - detail.budget;
          totalExcess += excess;
          granularOverItems.push({
            id: `${item.id}-${detail.name}`, // Unique ID for the pair
            name: efficiencyGroupType === 'project' ? `${item.name} - ${detail.name}` : `${detail.name} - ${item.name}`,
            mainName: item.name,
            detailName: detail.name,
            budget: detail.budget,
            cost: detail.cost,
            sales: detail.sales,
            revenue: detail.revenue,
            excess: excess,
            details: detail.details || [] // In case details were nested further down, but usually one level
          });
        }
      });
    });

    return {
      count: granularOverItems.length,
      totalExcess: totalExcess,
      items: granularOverItems
    };
  }, [efficiencyChartData, efficiencyGroupType]);

  const salesGeneratingData = useMemo(() => 
    efficiencyChartData.filter(d => d.revenue > 0).sort((a, b) => {
      const factor = efficiencyTableSort.direction === 'asc' ? 1 : -1;
      if (efficiencyTableSort.key === 'revenue') return (a.revenue - b.revenue) * factor;
      if (efficiencyTableSort.key === 'cost') return (a.cost - b.cost) * factor;
      if (efficiencyTableSort.key === 'budget') return (a.budget - b.budget) * factor;
      if (efficiencyTableSort.key === 'name') return (a.name || '').localeCompare(b.name || '') * factor;
      if (efficiencyTableSort.key === 'sales') return (a.sales - b.sales) * factor;
      if (efficiencyTableSort.key === 'roi') {
        const roiA = a.cost > 0 ? a.revenue / a.cost : 0;
        const roiB = b.cost > 0 ? b.revenue / b.cost : 0;
        return (roiA - roiB) * factor;
      }
      // Default to the global reportSortBy if no table sort or default revenue
      if (reportSortBy === 'budget') return (b.budget - a.budget) || ((b.revenue - a.revenue) * factor);
      if (reportSortBy === 'actual') return (b.cost - a.cost) || ((b.revenue - a.revenue) * factor);
      if (b.revenue !== a.revenue) return (b.revenue - a.revenue);
      return b.cost - a.cost;
    }), 
    [efficiencyChartData, reportSortBy, efficiencyTableSort]
  );

  const noSalesData = useMemo(() => 
    efficiencyChartData.filter(d => d.revenue === 0).sort((a, b) => {
      const factor = efficiencyTableSort.direction === 'asc' ? 1 : -1;
      if (efficiencyTableSort.key === 'cost') return (a.cost - b.cost) * factor;
      if (efficiencyTableSort.key === 'budget') return (a.budget - b.budget) * factor;
      if (efficiencyTableSort.key === 'name') return (a.name || '').localeCompare(b.name || '') * factor;
      
      if (reportSortBy === 'budget') return b.budget - a.budget;
      return b.cost - a.cost;
    }), 
    [efficiencyChartData, reportSortBy, efficiencyTableSort]
  );

  const efficiencyPieData = useMemo(() => {
    const costWithSales = salesGeneratingData.reduce((acc, curr) => acc + curr.cost, 0);
    const costWithoutSales = noSalesData.reduce((acc, curr) => acc + curr.cost, 0);
    
    return [
      { name: 'Phát sinh doanh số', value: costWithSales, color: '#10b981' },
      { name: 'Không phát sinh doanh số', value: costWithoutSales, color: '#f87171' }
    ];
  }, [salesGeneratingData, noSalesData]);

  const efficiencyTrendData = useMemo(() => {
    const monthlyMap: { [key: string]: { month: string, sales: number, revenue: number, cost: number, roi: number } } = {};
    
    // Fill all months for the selected year
    const year = reportYear || new Date().getFullYear().toString();
    for (let m = 1; m <= 12; m++) {
      const monthStr = `${year}-${m.toString().padStart(2, '0')}`;
      monthlyMap[monthStr] = { month: monthStr, sales: 0, revenue: 0, cost: 0, roi: 0 };
    }

    efficiencyReports.forEach(r => {
      if (!r.month || !r.month.startsWith(year)) return;
      if (reportProject !== 'all' && r.projectId !== reportProject) return;
      const currentTeamName = teamMap[r.teamId] || r.teamName;
      if (reportTeam !== 'all' && currentTeamName !== reportTeam) return;

      if (monthlyMap[r.month]) {
        monthlyMap[r.month].sales += r.salesCount || 0;
        monthlyMap[r.month].revenue += r.revenue || 0;
      }
    });

    costs.forEach(c => {
      const mMonth = c.month || (c.createdAt?.toDate ? getMarketingMonth(c.createdAt.toDate()) : null);
      if (!mMonth || !mMonth.startsWith(year)) return;
      if (reportProject !== 'all' && c.projectId !== reportProject) return;
      const currentTeamName = teamMap[c.teamId] || c.teamName;
      if (reportTeam !== 'all' && currentTeamName !== reportTeam) return;

      if (monthlyMap[mMonth]) {
        monthlyMap[mMonth].cost += c.amount || 0;
      }
    });

    return Object.values(monthlyMap).map(m => ({
      ...m,
      roi: m.cost > 0 ? (m.revenue / m.cost) : 0
    }));
  }, [efficiencyReports, costs, reportYear, reportProject, reportTeam, teamMap, getMarketingMonth]);

  const projectChartData = useMemo(() => {
    const projectIds = Array.from(new Set([
      ...budgets.filter(b => reportMonths.length === 0 || reportMonths.includes(b.month)).map(b => b.projectId),
      ...costs.filter(c => {
        const mMonth = c.month || (c.createdAt?.toDate ? getMarketingMonth(c.createdAt.toDate()) : null);
        return mMonth && (reportMonths.length === 0 || reportMonths.includes(mMonth));
      }).map(c => c.projectId)
    ]));

    return projectIds.filter(id => reportProject === 'all' || id === reportProject).map(id => {
      const projectName = projectMap[id] || 'N/A';
      const projectBudgets = budgets.filter(b => b.projectId === id && (reportMonths.length === 0 || reportMonths.includes(b.month)));
      
      let totalBudget = projectBudgets.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      if (chartTimeType === 'week' && reportWeek !== 'all') totalBudget = totalBudget / 4;

      let totalCost = costs.filter(c => {
        const mMonth = c.month || (c.createdAt?.toDate ? getMarketingMonth(c.createdAt.toDate()) : null);
        const matchMonth = mMonth && (reportMonths.length === 0 || reportMonths.includes(mMonth));
        const matchWeek = chartTimeType === 'month' || reportWeek === 'all' || c.weekNumber?.toString() === reportWeek;
        return c.projectId === id && matchMonth && matchWeek;
      }).reduce((acc, curr) => acc + (curr.amount || 0), 0);

      // Team breakdown for project
      const projectTeamDetails = uniqueTeams.map(teamName => {
        const tBudgets = projectBudgets.filter(b => (teamMap[b.teamId] || b.teamName) === teamName);
        const tCosts = costs.filter(c => {
          const mMonth = c.month || (c.createdAt?.toDate ? getMarketingMonth(c.createdAt.toDate()) : null);
          const matchMonth = mMonth && (reportMonths.length === 0 || reportMonths.includes(mMonth));
          const matchWeek = chartTimeType === 'month' || reportWeek === 'all' || c.weekNumber?.toString() === reportWeek;
          const cTeamName = teamMap[c.teamId] || c.teamName;
          return c.projectId === id && cTeamName === teamName && matchMonth && matchWeek;
        });

        let tTotalBudget = tBudgets.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        let tTotalCost = tCosts.reduce((acc, curr) => acc + (curr.amount || 0), 0);

        if (chartTimeType === 'week' && reportWeek !== 'all') {
          tTotalBudget = tTotalBudget / 4;
        }

        let tRevenue = efficiencyReports
          .filter(r => r.projectId === id && (teamMap[r.teamId] || r.teamName) === teamName && (reportMonths.length === 0 || reportMonths.includes(r.month)))
          .reduce((acc, curr) => acc + (curr.revenue || 0), 0);
        
        if (chartTimeType === 'week' && reportWeek !== 'all') {
          tRevenue = tRevenue / 4;
        }

        return {
          name: teamName,
          budget: tTotalBudget,
          actual: tTotalCost,
          revenue: tRevenue
        };
      }).filter(d => d.budget > 0 || d.actual > 0)
        .sort((a, b) => (b[reportSortBy] || 0) - (a[reportSortBy] || 0));

      let projectRevenue = efficiencyReports
        .filter(r => r.projectId === id && (reportMonths.length === 0 || reportMonths.includes(r.month)) && (reportTeam === 'all' || (teamMap[r.teamId] || r.teamName) === reportTeam))
        .reduce((acc, curr) => acc + (curr.revenue || 0), 0);

      if (chartTimeType === 'week' && reportWeek !== 'all') {
        projectRevenue = projectRevenue / 4;
      }

      return {
        id: id,
        name: projectName,
        budget: totalBudget,
        actual: totalCost,
        revenue: projectRevenue,
        details: projectTeamDetails,
        isProjectReport: true
      };
    }).filter(d => d.budget > 0 || d.actual > 0)
      .sort((a, b) => (b[reportSortBy] || 0) - (a[reportSortBy] || 0));
  }, [budgets, costs, projectMap, reportMonths, reportProject, chartTimeType, reportWeek, getMarketingMonth, reportSortBy, uniqueTeams, teamMap, efficiencyReports]);

  const regionMap = useMemo(() => {
    const map: Record<string, string> = {};
    regions.forEach(r => {
      map[r.id] = r.name;
    });
    return map;
  }, [regions]);

  const regionChartData = useMemo(() => {
    const rawData: Record<string, { budget: number, actual: number, revenue: number }> = {};
    
    uniqueRegions.forEach(regionName => {
      rawData[regionName] = { budget: 0, actual: 0, revenue: 0 };
    });

    budgets.forEach(b => {
      const project = projects.find(p => p.id === b.projectId);
      const rName = project?.region || 'Chưa xác định';
      
      const userEmail = user?.email?.toLowerCase();
      const budgetEmail = b.userEmail?.toLowerCase() || b.createdByEmail?.toLowerCase();
      const isOwner = (budgetEmail && userEmail && budgetEmail === userEmail) || (b.createdBy === user?.uid);
      const isAssigned = b.assignedUserEmail?.toLowerCase() === userEmail;
      const hasAccess = isAdmin || isMod || (isGDDA && userProfile?.assignedProjects?.includes(b.projectId)) || (isOwner || isAssigned);
      if (!hasAccess) return;

      if (reportMonths.length > 0 && !reportMonths.includes(b.month)) return;
      if (reportProject !== 'all' && b.projectId !== reportProject) return;
      const bTeamName = teamMap[b.teamId] || b.teamName;
      if (reportTeam !== 'all' && bTeamName !== reportTeam) return;

      if (!rawData[rName]) rawData[rName] = { budget: 0, actual: 0, revenue: 0 };
      
      let amount = b.amount || 0;
      if (chartTimeType === 'week' && reportWeek !== 'all') {
        amount = amount / 4;
      }
      rawData[rName].budget += amount;
    });

    costs.forEach(c => {
      const project = projects.find(p => p.id === c.projectId);
      const rName = project?.region || 'Chưa xác định';

      const userEmail = user?.email?.toLowerCase();
      const costEmail = c.userEmail?.toLowerCase() || c.createdByEmail?.toLowerCase();
      const isOwner = (costEmail && userEmail && costEmail === userEmail) || (c.createdBy === user?.uid);
      const isAssigned = c.assignedUserEmail?.toLowerCase() === userEmail;
      const hasAccess = isAdmin || isMod || (isGDDA && userProfile?.assignedProjects?.includes(c.projectId)) || (isOwner || isAssigned);
      if (!hasAccess) return;

      const mMonth = c.month || (c.createdAt?.toDate ? getMarketingMonth(c.createdAt.toDate()) : null);
      if (mMonth && reportMonths.length > 0 && !reportMonths.includes(mMonth)) return;
      if (reportProject !== 'all' && c.projectId !== reportProject) return;
      const cTeamName = teamMap[c.teamId] || c.teamName;
      if (reportTeam !== 'all' && cTeamName !== reportTeam) return;

      if (chartTimeType === 'week' && reportWeek !== 'all') {
        if (c.weekNumber?.toString() !== reportWeek) return;
      }

      if (!rawData[rName]) rawData[rName] = { budget: 0, actual: 0, revenue: 0 };
      rawData[rName].actual += c.amount || 0;
    });

    efficiencyReports.forEach(r => {
      const project = projects.find(p => p.id === r.projectId);
      const rName = project?.region || 'Chưa xác định';

      if (reportMonths.length > 0 && !reportMonths.includes(r.month)) return;
      if (reportProject !== 'all' && r.projectId !== reportProject) return;
      const tName = teamMap[r.teamId] || r.teamName;
      if (reportTeam !== 'all' && tName !== reportTeam) return;

      if (!rawData[rName]) rawData[rName] = { budget: 0, actual: 0, revenue: 0 };
      
      let rev = r.revenue || 0;
      if (chartTimeType === 'week' && reportWeek !== 'all') {
        rev = rev / 4;
      }
      rawData[rName].revenue += rev;
    });

    return Object.keys(rawData).map(name => {
      let displayName = name;
      if (name.includes('Quảng Ninh') && name.includes('Hải Phòng')) {
        displayName = 'QN - HP';
      }
      
      return {
        name: displayName,
        ...rawData[name]
      };
    }).filter(d => reportRegion === 'all' || d.name === reportRegion)
      .sort((a, b) => (b[reportSortBy] || 0) - (a[reportSortBy] || 0));
  }, [regions, uniqueRegions, budgets, costs, efficiencyReports, projects, reportMonths, reportProject, reportTeam, reportRegion, teamMap, chartTimeType, reportWeek, isAdmin, isMod, isGDDA, user, userProfile, reportSortBy, getMarketingMonth]);

  const comparisonChartData = useMemo(() => {
    if (reportMonths.length === 0) return [];

    const categories = efficiencyGroupType === 'team' ? uniqueTeams : Array.from(new Set(projects.map(p => p.id)));
    
    return categories.map(catId => {
      const name = efficiencyGroupType === 'team' ? catId : projectMap[catId] || 'N/A';
      const row: any = { name };

      reportMonths.forEach(month => {
        let value = 0;
        if (reportSortBy === 'budget') {
          const mBudgets = budgets.filter(b => {
            const matchCat = efficiencyGroupType === 'team' ? (teamMap[b.teamId] || b.teamName) === catId : b.projectId === catId;
            return b.month === month && matchCat;
          });
          value = mBudgets.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        } else if (reportSortBy === 'actual') {
          const mCosts = costs.filter(c => {
             const mMonth = c.month || (c.createdAt?.toDate ? getMarketingMonth(c.createdAt.toDate()) : null);
             const matchCat = efficiencyGroupType === 'team' ? (teamMap[c.teamId] || c.teamName) === catId : c.projectId === catId;
             return mMonth === month && matchCat;
          });
          value = mCosts.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        } else if (reportSortBy === 'revenue') {
          const mRevs = efficiencyReports.filter(r => {
             const matchCat = efficiencyGroupType === 'team' ? (teamMap[r.teamId] || r.teamName) === catId : r.projectId === catId;
             return r.month === month && matchCat;
          });
          value = mRevs.reduce((acc, curr) => acc + (curr.revenue || 0), 0);
        }
        row[month] = value;
      });

      return row;
    }).filter(row => {
      // Only show rows that have at least one value > 0 across selected months
      return reportMonths.some(m => row[m] > 0);
    }).sort((a, b) => {
      // Sort by the first selected month's value
      const primaryMonth = reportMonths[0];
      return (b[primaryMonth] || 0) - (a[primaryMonth] || 0);
    });
  }, [reportMonths, efficiencyGroupType, uniqueTeams, projects, budgets, costs, efficiencyReports, projectMap, teamMap, reportSortBy, getMarketingMonth]);

  const reportTableData = useMemo(() => {
    // 1. Process Teams group
    const teams = uniqueTeams.filter(t => reportTeam === 'all' || t === reportTeam).map(team => {
       const teamBudgets = filteredBudgets.filter(b => (teamMap[b.teamId] || b.teamName) === team);
       
       const teamCosts = filteredCosts.filter(c => {
         const matchWeek = chartTimeType === 'month' || reportWeek === 'all' || c.weekNumber?.toString() === reportWeek;
         const cTeamName = teamMap[c.teamId] || c.teamName;
         return cTeamName === team && matchWeek;
       });

       let totalBudget = teamBudgets.reduce((acc, curr) => acc + (curr.amount || 0), 0);
       let totalCost = teamCosts.reduce((acc, curr) => acc + (curr.amount || 0), 0);

       if (chartTimeType === 'week' && reportWeek !== 'all') {
         totalBudget = totalBudget / 4;
       }

       // Use project IDs to avoid name collision and ensure correct filtering
       const projectsInTeamIds = Array.from(new Set([
         ...teamBudgets.map(b => b.projectId),
         ...teamCosts.map(c => c.projectId)
       ]));

       const aggregatedProjects = projectsInTeamIds.map(projectId => {
         const pBudgets = teamBudgets.filter(b => b.projectId === projectId);
         const pCosts = teamCosts.filter(c => c.projectId === projectId);

         let pTotalBudget = pBudgets.reduce((acc, curr) => acc + (curr.amount || 0), 0);
         let pTotalCost = pCosts.reduce((acc, curr) => acc + (curr.amount || 0), 0);

         if (chartTimeType === 'week') {
           pTotalBudget = pTotalBudget / 4;
           if (reportWeek === 'all') pTotalCost = pTotalCost / 4;
         }

         return {
           id: `${team}-${projectId}`,
           teamName: team,
           projectId,
           projectName: projectMap[projectId] || 'N/A',
           implementerName: projectMap[projectId] || 'N/A',
           userEmail: 'Project Summary',
           amount: pTotalBudget,
           actual: pTotalCost
         };
       }).filter(d => d.amount > 0 || d.actual > 0)
         .sort((a, b) => {
            if (reportSortBy === 'budget') return (b.amount || 0) - (a.amount || 0);
            return (b.actual || 0) - (a.actual || 0);
         });

       return {
         id: team,
         name: team,
         budget: totalBudget,
         actual: totalCost,
         projects: projectsInTeamIds.map(id => projectMap[id]),
         items: aggregatedProjects
       };
    }).filter(d => d.budget > 0 || d.actual > 0)
      .sort((a, b) => (b[reportSortBy] || 0) - (a[reportSortBy] || 0));

    const projectIds = Array.from(new Set([
      ...filteredBudgets.map(b => b.projectId),
      ...filteredCosts.map(c => c.projectId)
    ]));

    const projects = projectIds.filter(id => reportProject === 'all' || id === reportProject).map(id => {
       const pBudgets = filteredBudgets.filter(b => b.projectId === id);
       const pCosts = filteredCosts.filter(c => {
         const matchWeek = chartTimeType === 'month' || reportWeek === 'all' || c.weekNumber?.toString() === reportWeek;
         return c.projectId === id && matchWeek;
       });

       let totalBudget = pBudgets.reduce((acc, curr) => acc + (curr.amount || 0), 0);
       let totalCost = pCosts.reduce((acc, curr) => acc + (curr.amount || 0), 0);

       if (chartTimeType === 'week' && reportWeek !== 'all') {
         totalBudget = totalBudget / 4;
       }

       const teamsInProjectNames = Array.from(new Set([
         ...pBudgets.map(b => teamMap[b.teamId] || b.teamName),
         ...pCosts.map(c => teamMap[c.teamId] || c.teamName)
       ]));

       const aggregatedTeams = teamsInProjectNames.map(teamName => {
         const tBudgets = pBudgets.filter(b => (teamMap[b.teamId] || b.teamName) === teamName);
         const tCosts = pCosts.filter(c => (teamMap[c.teamId] || c.teamName) === teamName);

         let tTotalBudget = tBudgets.reduce((acc, curr) => acc + (curr.amount || 0), 0);
         let tTotalCost = tCosts.reduce((acc, curr) => acc + (curr.amount || 0), 0);

         if (chartTimeType === 'week' && reportWeek !== 'all') {
           tTotalBudget = tTotalBudget / 4;
         }

         return {
           id: `${id}-${teamName}`,
           teamName,
           implementerName: teamName,
           userEmail: 'Team Summary',
           amount: tTotalBudget,
           actual: tTotalCost
         };
       }).filter(d => d.amount > 0 || d.actual > 0)
         .sort((a, b) => {
            if (reportSortBy === 'budget') return (b.amount || 0) - (a.amount || 0);
            return (b.actual || 0) - (a.actual || 0);
         });

       return {
         id,
         name: projectMap[id] || 'N/A',
         budget: totalBudget,
         actual: totalCost,
         teams: teamsInProjectNames,
         items: aggregatedTeams
       };
    }).filter(d => d.budget > 0 || d.actual > 0)
      .sort((a, b) => (b[reportSortBy] || 0) - (a[reportSortBy] || 0));

    return { teams, projects };
  }, [uniqueTeams, reportTeam, reportProject, filteredBudgets, filteredCosts, chartTimeType, reportWeek, reportSortBy, projectMap, teamMap]);



  const getCurrentPeriod = () => {
    const now = new Date();
    const mMonth = getMarketingMonth(now);
    if (!mMonth) return 1;
    const [year, month] = mMonth.split('-').map(Number);
    // Budget month M starts on 21st of month M-1
    const startDate = new Date(year, month - 2, 21);
    const diffDays = Math.floor((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    
    if (diffDays < 7) return 1;
    if (diffDays < 14) return 2;
    if (diffDays < 21) return 3;
    return 4; // Kỳ cuối là những ngày còn lại
  };

  const getPeriodRange = (monthStr: string, period: number | string) => {
    if (!monthStr || !period || period === 'all') return '';
    try {
      const [year, month] = monthStr.split('-').map(Number);
      // Budget month M starts on 21st of month M-1
      const startDate = new Date(year, month - 2, 21);
      const pNum = Number(period);
      
      const periodStart = new Date(startDate);
      let periodEnd = new Date(startDate);

      if (pNum < 4) {
        periodStart.setDate(startDate.getDate() + (pNum - 1) * 7);
        periodEnd.setDate(periodStart.getDate() + 6);
      } else {
        // Kỳ 4: Until the end (20th of month M)
        periodStart.setDate(startDate.getDate() + 21);
        periodEnd = new Date(year, month - 1, 20);
      }
      
      return `${format(periodStart, 'd/M')} - ${format(periodEnd, 'd/M')}`;
    } catch (e) {
      return '';
    }
  };

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

  // Thêm component footer thông tin phát triển
  const DeveloperFooter = ({ className = "", isHeader = false }: { className?: string, isHeader?: boolean }) => (
    <div className={`flex flex-col items-center justify-center gap-3 text-slate-400 ${className}`}>
      <div className={`flex items-center gap-2 font-black uppercase tracking-[0.2em] ${isHeader ? 'text-[12px]' : 'text-[9px]'}`}>
        <span className="opacity-60">Phát triển bởi</span>
        <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
        <span className={isHeader ? 'text-slate-800' : 'text-slate-600'}>Thiên Vũ - Digital Marketing Mayhomes</span>
      </div>
      <a 
        href="https://zalo.me/0854642555" 
        target="_blank" 
        rel="noopener noreferrer"
        className={`flex items-center gap-3 border transition-all duration-300 group ${isHeader ? 'px-6 py-2.5 bg-white border-blue-200 rounded-2xl shadow-lg shadow-blue-100/50 hover:shadow-xl hover:border-blue-400 hover:translate-y-[-2px]' : 'px-3 py-1 bg-slate-50 border-slate-100 rounded-full hover:bg-white hover:shadow-sm'}`}
      >
        <div className={`bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-200 group-hover:rotate-[10deg] transition-all ${isHeader ? 'w-8 h-8' : 'w-5 h-5'}`}>
          <MessageCircle className={`${isHeader ? 'w-5 h-5' : 'w-3 h-3'} fill-current`} />
        </div>
        <div className="flex flex-col items-start leading-none">
          <span className={`font-black uppercase tracking-tight ${isHeader ? 'text-sm text-blue-700' : 'text-[10px] text-slate-600'}`}>Liên hệ hỗ trợ Zalo</span>
          {isHeader && <span className="text-[11px] font-bold text-blue-500/70 mt-0.5">0854.642.555</span>}
        </div>
      </a>
    </div>
  );

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
            <div className="pt-4 space-y-3">
              <CardTitle className="text-xl font-bold tracking-tight text-slate-800">Marketing Cost Control</CardTitle>
              <div className="space-y-4">
                <CardDescription className="text-slate-500">Hệ thống quản lý chi phí marketing chuyên nghiệp</CardDescription>
                <DeveloperFooter className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100" />
              </div>
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
      <header className="sticky top-0 z-30 w-full bg-white/90 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200/50 overflow-hidden group transition-transform hover:scale-105 shrink-0">
              <img 
                src="https://picsum.photos/seed/mayhomes/100/100" 
                alt="MAYHOMES" 
                className="w-full h-full object-contain p-1.5 brightness-0 invert"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tighter leading-none">
                  <span className="text-orange-500">MAY</span>
                  <span className="text-indigo-600">HOMES</span>
                </h1>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {isSuperAdmin && <Badge variant="outline" className="text-[8px] sm:text-[9px] font-bold py-0 h-3.5 sm:h-4 border-purple-200 text-purple-700 bg-purple-50/50">SUPER ADMIN</Badge>}
                {(userRole === 'admin') && <Badge variant="outline" className="text-[8px] sm:text-[9px] font-bold py-0 h-3.5 sm:h-4 border-indigo-200 text-indigo-700 bg-indigo-50/50">ADMIN</Badge>}
                {isMod && <Badge variant="outline" className="text-[8px] sm:text-[9px] font-bold py-0 h-3.5 sm:h-4 border-slate-200 text-slate-700 bg-slate-50/50">MODERATOR</Badge>}
                {isGDDA && <Badge variant="outline" className="text-[8px] sm:text-[9px] font-bold py-0 h-3.5 sm:h-4 border-emerald-200 text-emerald-700 bg-emerald-50/50">GDDA</Badge>}
                {isUser && <Badge variant="outline" className="text-[8px] sm:text-[9px] font-bold py-0 h-3.5 sm:h-4 border-orange-200 text-orange-700 bg-orange-50/50">USER</Badge>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex flex-col items-end">
              <p className="text-sm font-bold text-slate-900 leading-tight">{user.displayName}</p>
              <p className="text-[11px] font-medium text-slate-500">{user.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 pt-6 pb-24 lg:py-10 space-y-6 lg:space-y-10">
        {/* Top Developer Support Info */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-[2rem] border border-blue-100/50 shadow-inner">
          <DeveloperFooter isHeader={true} />
        </div>

        {/* Mobile Welcome */}
        <div className="lg:hidden mb-2">
           <h2 className="text-xl font-black text-slate-900">Xin chào, {user.displayName?.split(' ').pop()} 👋</h2>
           <p className="text-xs text-slate-500 font-medium">{user.email}</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
          <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden group hover:translate-y-[-4px] transition-all duration-300">
            <div className="h-1.5 w-full bg-indigo-500" />
            <CardHeader className="pb-4">
              <CardDescription className="flex items-center gap-2 font-bold text-indigo-600/70 uppercase tracking-wider text-[10px]">
                <Building2 className="w-4 h-4" /> Tổng dự án
              </CardDescription>
              <CardTitle className="text-3xl font-black text-slate-900">{projects.length}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden group hover:translate-y-[-4px] transition-all duration-300">
            <div className="h-1.5 w-full bg-emerald-500" />
            <CardHeader className="pb-4">
              <CardDescription className="flex items-center gap-2 font-bold text-emerald-600/70 uppercase tracking-wider text-[10px]">
                <Wallet className="w-4 h-4" /> Ngân sách tháng này
              </CardDescription>
              <CardTitle className="text-3xl font-black text-slate-900">
                {budgets
                  .filter(b => {
                    const matchMonth = b.month === getMarketingMonth(new Date());
                    if (!isAdmin && !isMod) {
                      const userEmail = user?.email?.toLowerCase();
                      const budgetEmail = b.userEmail?.toLowerCase() || b.createdByEmail?.toLowerCase();
                      return matchMonth && (budgetEmail === userEmail || b.createdBy === user?.uid);
                    }
                    return matchMonth;
                  })
                  .reduce((acc, curr) => acc + curr.amount, 0)
                  .toLocaleString()} <span className="text-lg font-medium text-slate-400">đ</span>
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden group hover:translate-y-[-4px] transition-all duration-300">
            <div className="h-1.5 w-full bg-orange-500" />
            <CardHeader className="pb-4">
              <CardDescription className="flex items-center gap-2 font-bold text-orange-600/70 uppercase tracking-wider text-[10px]">
                <TrendingUp className="w-4 h-4" /> Thực tế đã chi (Kỳ này)
              </CardDescription>
              <CardTitle className="text-3xl font-black text-slate-900">
                {costs
                  .filter(c => {
                    const matchMonth = c.month === getMarketingMonth(new Date()) || (c.year === new Date().getFullYear() && !c.month);
                    const matchWeek = c.weekNumber === getCurrentPeriod();
                    const isMatchTime = matchMonth && matchWeek;
                    
                    if (!isAdmin && !isMod) {
                      const userEmail = user?.email?.toLowerCase();
                      const costEmail = c.userEmail?.toLowerCase() || c.createdByEmail?.toLowerCase();
                      return isMatchTime && (costEmail === userEmail || c.createdBy === user?.uid);
                    }
                    return isMatchTime;
                  })
                  .reduce((acc, curr) => acc + curr.amount, 0)
                  .toLocaleString()} <span className="text-lg font-medium text-slate-400">đ</span>
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden group hover:translate-y-[-4px] transition-all duration-300">
            <div className="h-1.5 w-full bg-blue-500" />
            <CardHeader className="pb-4">
              <CardDescription className="flex items-center gap-2 font-bold text-blue-600/70 uppercase tracking-wider text-[10px]">
                <Building2 className="w-4 h-4" /> Căn bán (Tháng này)
              </CardDescription>
              <CardTitle className="text-3xl font-black text-slate-900">
                {efficiencyReports
                  .filter(r => {
                    const matchMonth = r.month === getMarketingMonth(new Date());
                    if (!isAdmin && !isMod) {
                      return matchMonth && r.createdByEmail?.toLowerCase() === user?.email?.toLowerCase();
                    }
                    return matchMonth;
                  })
                  .reduce((acc, curr) => acc + (curr.salesCount || 0), 0)
                  .toLocaleString()} <span className="text-lg font-medium text-slate-400">Căn</span>
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-none shadow-xl shadow-slate-200/50 bg-indigo-600 overflow-hidden group hover:translate-y-[-4px] transition-all duration-300 shadow-indigo-200/50">
            <div className="h-1.5 w-full bg-white opacity-20" />
            <CardHeader className="pb-4">
              <CardDescription className="flex items-center gap-2 font-bold text-indigo-100 uppercase tracking-wider text-[10px]">
                <TrendingUp className="w-4 h-4" /> Tổng Doanh số (Tháng này)
              </CardDescription>
              <CardTitle className="text-3xl font-black text-white">
                {efficiencyReports
                  .filter(r => {
                    const matchMonth = r.month === getMarketingMonth(new Date());
                    if (!isAdmin && !isMod) {
                      return matchMonth && r.createdByEmail?.toLowerCase() === user?.email?.toLowerCase();
                    }
                    return matchMonth;
                  })
                  .reduce((acc, curr) => acc + (curr.revenue || 0), 0)
                  .toLocaleString()} <span className="text-lg font-medium text-indigo-300">đ</span>
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1 rounded-xl h-auto flex lg:flex mb-2 hidden lg:flex">
            <TabsTrigger value="home" className="rounded-lg py-2 px-4 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none font-bold">
              <LayoutDashboard className="w-4 h-4 mr-2" /> Trang chủ
            </TabsTrigger>
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
            <TabsTrigger value="support" className="rounded-lg py-2 px-4 data-[state=active]:bg-slate-100 data-[state=active]:shadow-none relative">
              <MessageCircle className="w-4 h-4 mr-2" /> Hỗ trợ
              {pendingSupportCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white ring-2 ring-white animate-pulse">
                  {pendingSupportCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Home / Dashboard Tab */}
          <TabsContent value="home" className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  Phân tích Hiệu quả Kinh doanh
                </h2>
                <p className="text-slate-500 text-sm mt-1 font-medium italic">Tháng marketing: {getMarketingMonth(new Date())} {getReportingPeriod(getMarketingMonth(new Date()))}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setActiveTab('admin')} 
                className="hidden md:flex rounded-xl border-slate-200 hover:bg-slate-50 gap-2 h-10 px-5 font-bold text-slate-600"
              >
                Chi tiết báo cáo <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Main Visual Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-100/50 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                  <TrendingUp className="w-64 h-64 text-indigo-600" />
                </div>
                <div className="flex items-center justify-between mb-8 relative z-10">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tương quan Hiệu quả</Label>
                    <h3 className="text-xl font-black text-slate-900">Chi phí vs Doanh số thực tế</h3>
                  </div>
                  <div className="flex items-center gap-6">
                     <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full bg-indigo-100 border-2 border-indigo-500" />
                       <span className="text-[10px] font-black text-slate-500 uppercase">Doanh số</span>
                     </div>
                     <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full bg-rose-500" />
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Chi phí</span>
                     </div>
                  </div>
                </div>
                <div className="h-[350px] w-full relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={efficiencyChartData.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                        dy={10}
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} tickFormatter={formatYAxis} />
                      <ChartTooltip cursor={{ fill: '#f8fafc' }} content={<EfficiencyDetailedTooltip />} />
                      <Bar dataKey="cost" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={32} />
                      <Line type="monotone" dataKey="revenue" name="Doanh số" stroke="#4f46e5" strokeWidth={4} dot={{ r: 6, fill: '#4f46e5', strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 8, stroke: '#fff', strokeWidth: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-6">
                <Card className="border-none shadow-xl shadow-slate-100 bg-indigo-600 p-8 rounded-[32px] text-white overflow-hidden relative group">
                  <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                  <div className="relative z-10 space-y-4">
                    <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em]">ROI Trung bình kỳ này</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-5xl font-black italic tracking-tighter">
                        {(() => {
                          const totalCost = efficiencyChartData.reduce((acc, curr) => acc + curr.cost, 0);
                          const totalRevenue = efficiencyChartData.reduce((acc, curr) => acc + curr.revenue, 0);
                          return totalCost > 0 ? (totalRevenue / totalCost).toFixed(2) : '0';
                        })()}
                      </p>
                      <span className="text-xl font-black text-indigo-300">x</span>
                    </div>
                    <div className="pt-2 border-t border-indigo-400/30">
                      <p className="text-[11px] font-medium text-indigo-100 leading-relaxed italic opacity-80">
                        "Cứ 1 đồng chi phí bỏ ra, hệ thống mang về {(() => {
                          const totalCost = efficiencyChartData.reduce((acc, curr) => acc + curr.cost, 0);
                          const totalRevenue = efficiencyChartData.reduce((acc, curr) => acc + curr.revenue, 0);
                          return totalCost > 0 ? (totalRevenue / totalCost).toFixed(2) : '0';
                        })()} đồng doanh số."
                      </p>
                    </div>
                  </div>
                </Card>

                <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-100/50 space-y-4">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2">Phân bổ Top {efficiencyGroupType === 'team' ? 'Team' : 'Dự án'}</p>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={efficiencyPieData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={8}
                          dataKey="value"
                        >
                          {efficiencyPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                             return (
                               <div className="bg-white p-3 rounded-xl shadow-xl border border-slate-50 min-w-[150px]">
                                 <p className="text-[10px] font-black uppercase text-slate-400 mb-1">{payload[0].name}</p>
                                 <p className="text-sm font-black text-slate-900">{formatCurrency(payload[0].value)}</p>
                               </div>
                             );
                          }
                          return null;
                        }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                     {efficiencyPieData.map((d, i) => (
                       <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/50 border border-slate-100/50">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-400 uppercase truncate max-w-[80px]">{d.name}</span>
                            <span className="text-[10px] font-black text-slate-700">{((d.value / (efficiencyPieData.reduce((a,b) => a+b.value, 0) || 1)) * 100).toFixed(0)}%</span>
                          </div>
                       </div>
                     ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Table Section */}
            <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white/80 backdrop-blur-md rounded-[32px]">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Chi tiết Hiệu quả Kinh doanh</CardTitle>
                  <p className="text-slate-500 text-[10px] font-medium uppercase tracking-widest mt-1">Sắp xếp theo doanh số thực nhận</p>
                </div>
                <div className="flex p-0.5 bg-slate-100 rounded-xl border border-slate-200">
                  <Button 
                    variant={efficiencyGroupType === 'team' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setEfficiencyGroupType('team')}
                    className={`h-8 text-[10px] px-4 rounded-lg transition-all ${efficiencyGroupType === 'team' ? 'bg-white shadow-sm text-indigo-600 font-black' : 'text-slate-500 font-bold'}`}
                  >
                    Đội ngũ
                  </Button>
                  <Button 
                    variant={efficiencyGroupType === 'project' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setEfficiencyGroupType('project')}
                    className={`h-8 text-[10px] px-4 rounded-lg transition-all ${efficiencyGroupType === 'project' ? 'bg-white shadow-sm text-indigo-600 font-black' : 'text-slate-500 font-bold'}`}
                  >
                    Dự án
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-8 h-12 w-16">STT</TableHead>
                      <TableHead 
                        className="text-[10px] font-black uppercase tracking-widest text-slate-400 h-12 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => setEfficiencyTableSort(prev => ({ key: 'name', direction: prev.key === 'name' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                      >
                        <div className="flex items-center gap-1">
                          Đối tượng <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right h-12 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => setEfficiencyTableSort(prev => ({ key: 'budget', direction: prev.key === 'budget' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Ngân sách <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right h-12 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => setEfficiencyTableSort(prev => ({ key: 'cost', direction: prev.key === 'cost' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Thực chi <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center h-12 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => setEfficiencyTableSort(prev => ({ key: 'sales', direction: prev.key === 'sales' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Căn bán <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right h-12 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => setEfficiencyTableSort(prev => ({ key: 'revenue', direction: prev.key === 'revenue' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Doanh số <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right pr-8 h-12 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => setEfficiencyTableSort(prev => ({ key: 'roi', direction: prev.key === 'roi' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                      >
                        <div className="flex items-center justify-end gap-1">
                          ROI <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const sortedData = [...efficiencyChartData].sort((a, b) => {
                        const factor = efficiencyTableSort.direction === 'asc' ? 1 : -1;
                        if (efficiencyTableSort.key === 'revenue') return (a.revenue - b.revenue) * factor;
                        if (efficiencyTableSort.key === 'cost') return (a.cost - b.cost) * factor;
                        if (efficiencyTableSort.key === 'budget') return (a.budget - b.budget) * factor;
                        if (efficiencyTableSort.key === 'name') return (a.name || '').localeCompare(b.name || '') * factor;
                        if (efficiencyTableSort.key === 'sales') return (a.sales - b.sales) * factor;
                        if (efficiencyTableSort.key === 'roi') {
                          const roiA = a.cost > 0 ? a.revenue / a.cost : 0;
                          const roiB = b.cost > 0 ? b.revenue / b.cost : 0;
                          return (roiA - roiB) * factor;
                        }
                        return 0;
                      });
                      return sortedData.slice(0, 10).map((item, idx) => {
                        const roi = item.cost > 0 ? (item.revenue / item.cost).toFixed(2) : '0';
                        const isOverBudget = item.cost > item.budget;
                        return (
                          <TableRow key={idx} className="group hover:bg-indigo-50/20 transition-colors border-b-slate-100/50 h-20">
                            <TableCell className="pl-8 font-bold text-slate-400 text-xs">{idx + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm ${item.revenue > 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                  {item.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-black text-slate-900 uppercase tracking-tight text-sm">{item.name}</p>
                                  <p className="text-[10px] text-slate-400 font-medium lowercase italic">
                                    {efficiencyGroupType === 'project' ? `${item.details.length} teams tham gia` : `${item.details.length} dự án triển khai`}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-slate-400 font-mono text-xs">{formatCurrency(item.budget)}</TableCell>
                            <TableCell className={`text-right font-black font-mono text-xs ${isOverBudget ? 'text-rose-500' : 'text-slate-700 opacity-70'}`}>
                              {formatCurrency(item.cost)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 font-black border-none px-3 h-6 text-[10px] rounded-lg">
                                {item.sales} căn
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-black text-indigo-600 font-mono text-sm">{formatCurrency(item.revenue)}</TableCell>
                            <TableCell className="text-right pr-8">
                              <div className="flex flex-col items-end">
                                <span className="text-sm font-black text-indigo-700 italic">{roi}x</span>
                                {parseFloat(roi) >= 5 && <span className="text-[8px] bg-amber-100 text-amber-700 px-1 rounded font-black uppercase">Hiệu quả cao</span>}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      });
                    })()}
                  </TableBody>
                </Table>
              </div>
              {efficiencyChartData.length > 10 && (
                <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-center">
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('admin')} className="text-indigo-600 font-black text-[10px] uppercase tracking-widest gap-2">
                    Xem toàn bộ {efficiencyChartData.length} đơn vị tại trang báo cáo <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Admin Tab */}
          {(isAdmin || isMod || isGDDA) && (
            <TabsContent value="admin" className="space-y-8">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Admin Sidebar-like Navigation */}
                <aside className="lg:w-72 space-y-6 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 scroll-hide scrollbar-hide">
                  <div className="flex lg:flex-col gap-6 min-w-max lg:min-w-0">
                    
                    {/* Category: Phân tích & Báo cáo */}
                    <div className="flex lg:flex-col gap-1.5 min-w-max lg:min-w-0">
                      <div className="px-4 py-2 lg:block hidden">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400/80 mb-2">Phân tích & Thống kê</h2>
                      </div>
                      <Button 
                        variant={adminSubTab === 'reports' ? 'secondary' : 'ghost'} 
                        className={`justify-start rounded-2xl px-4 h-11 transition-all duration-300 border border-transparent ${
                          adminSubTab === 'reports' 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 border-blue-500 font-bold scale-[1.02]' 
                            : 'text-slate-600 hover:bg-white hover:border-slate-200 hover:shadow-sm'
                        }`}
                        onClick={() => setAdminSubTab('reports')}
                      >
                        <BarChart3 className={`mr-3 h-4 w-4 ${adminSubTab === 'reports' ? 'text-white' : 'text-blue-500'}`} />
                        <span className="text-sm">Báo cáo chuyên sâu</span>
                      </Button>
                    </div>

                    {/* Category: Quản lý Dữ liệu gốc */}
                    {(isAdmin || isMod) && (
                      <div className="flex lg:flex-col gap-1.5 min-w-max lg:min-w-0">
                        <div className="px-4 py-2 lg:block hidden border-t border-slate-100 pt-6 mt-2">
                          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400/80 mb-2">Dữ liệu nền tảng</h2>
                        </div>
                        <Button 
                          variant={adminSubTab === 'projects' ? 'secondary' : 'ghost'} 
                          className={`justify-start rounded-2xl px-4 h-11 transition-all duration-300 border border-transparent ${
                            adminSubTab === 'projects' 
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 border-blue-500 font-bold scale-[1.02]' 
                              : 'text-slate-600 hover:bg-white hover:border-slate-200 hover:shadow-sm'
                          }`}
                          onClick={() => setAdminSubTab('projects')}
                        >
                          <Building2 className={`mr-3 h-4 w-4 ${adminSubTab === 'projects' ? 'text-white' : 'text-indigo-500'}`} />
                          <span className="text-sm">Danh mục Dự án</span>
                        </Button>
                        <Button 
                          variant={adminSubTab === 'regions' ? 'secondary' : 'ghost'} 
                          className={`justify-start rounded-2xl px-4 h-11 transition-all duration-300 border border-transparent ${
                            adminSubTab === 'regions' 
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 border-blue-500 font-bold scale-[1.02]' 
                              : 'text-slate-600 hover:bg-white hover:border-slate-200 hover:shadow-sm'
                          }`}
                          onClick={() => setAdminSubTab('regions')}
                        >
                          <MapIcon className={`mr-3 h-4 w-4 ${adminSubTab === 'regions' ? 'text-white' : 'text-emerald-500'}`} />
                          <span className="text-sm">Vùng miền</span>
                        </Button>
                        <Button 
                          variant={adminSubTab === 'types' ? 'secondary' : 'ghost'} 
                          className={`justify-start rounded-2xl px-4 h-11 transition-all duration-300 border border-transparent ${
                            adminSubTab === 'types' 
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 border-blue-500 font-bold scale-[1.02]' 
                              : 'text-slate-600 hover:bg-white hover:border-slate-200 hover:shadow-sm'
                          }`}
                          onClick={() => setAdminSubTab('types')}
                        >
                          <Layers className={`mr-3 h-4 w-4 ${adminSubTab === 'types' ? 'text-white' : 'text-amber-500'}`} />
                          <span className="text-sm">Loại hình</span>
                        </Button>
                        <Button 
                          variant={adminSubTab === 'teams' ? 'secondary' : 'ghost'} 
                          className={`justify-start rounded-2xl px-4 h-11 transition-all duration-300 border border-transparent ${
                            adminSubTab === 'teams' 
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 border-blue-500 font-bold scale-[1.02]' 
                              : 'text-slate-600 hover:bg-white hover:border-slate-200 hover:shadow-sm'
                          }`}
                          onClick={() => setAdminSubTab('teams')}
                        >
                          <Users className={`mr-3 h-4 w-4 ${adminSubTab === 'teams' ? 'text-white' : 'text-purple-500'}`} />
                          <span className="text-sm">Đội nhóm (Teams)</span>
                        </Button>
                      </div>
                    )}

                    {/* Category: Vận hành & Chi phí */}
                    <div className="flex lg:flex-col gap-1.5 min-w-max lg:min-w-0">
                      <div className="px-4 py-2 lg:block hidden border-t border-slate-100 pt-6 mt-2">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400/80 mb-2">Vận hành & Tài chính</h2>
                      </div>
                      {(isAdmin || isMod) && (
                        <>
                          <Button 
                            variant={adminSubTab === 'budgets' ? 'secondary' : 'ghost'} 
                            className={`justify-start rounded-2xl px-4 h-11 transition-all duration-300 border border-transparent ${
                              adminSubTab === 'budgets' 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 border-blue-500 font-bold scale-[1.02]' 
                                : 'text-slate-600 hover:bg-white hover:border-slate-200 hover:shadow-sm'
                            }`}
                            onClick={() => setAdminSubTab('budgets')}
                          >
                            <Wallet className={`mr-3 h-4 w-4 ${adminSubTab === 'budgets' ? 'text-white' : 'text-cyan-500'}`} />
                            <span className="text-sm">Quản lý Ngân sách</span>
                          </Button>
                          <Button 
                            variant={adminSubTab === 'costs' ? 'secondary' : 'ghost'} 
                            className={`justify-start rounded-2xl px-4 h-11 transition-all duration-300 border border-transparent ${
                              adminSubTab === 'costs' 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 border-blue-500 font-bold scale-[1.02]' 
                                : 'text-slate-600 hover:bg-white hover:border-slate-200 hover:shadow-sm'
                            }`}
                            onClick={() => setAdminSubTab('costs')}
                          >
                            <TrendingUp className={`mr-3 h-4 w-4 ${adminSubTab === 'costs' ? 'text-white' : 'text-rose-500'}`} />
                            <span className="text-sm">Thực chi Marketing</span>
                          </Button>
                          <Button 
                            variant={adminSubTab === 'efficiency' ? 'secondary' : 'ghost'} 
                            className={`justify-start rounded-2xl px-4 h-11 transition-all duration-300 border border-transparent ${
                              adminSubTab === 'efficiency' 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 border-blue-500 font-bold scale-[1.02]' 
                                : 'text-slate-600 hover:bg-white hover:border-slate-200 hover:shadow-sm'
                            }`}
                            onClick={() => setAdminSubTab('efficiency')}
                          >
                            <Target className={`mr-3 h-4 w-4 ${adminSubTab === 'efficiency' ? 'text-white' : 'text-orange-500'}`} />
                            <span className="text-sm">Hiệu quả Kinh doanh</span>
                          </Button>
                          <Button 
                            variant={adminSubTab === 'acceptance' ? 'secondary' : 'ghost'} 
                            className={`justify-start rounded-2xl px-4 h-11 transition-all duration-300 border border-transparent ${
                              adminSubTab === 'acceptance' 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 border-blue-500 font-bold scale-[1.02]' 
                                : 'text-slate-600 hover:bg-white hover:border-slate-200 hover:shadow-sm'
                            }`}
                            onClick={() => setAdminSubTab('acceptance')}
                          >
                            <ShieldCheck className={`mr-3 h-4 w-4 ${adminSubTab === 'acceptance' ? 'text-white' : 'text-teal-500'}`} />
                            <span className="text-sm">Nghiệm thu hồ sơ</span>
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Category: Hệ thống & Bảo mật */}
                    {isAdmin && (
                      <div className="flex lg:flex-col gap-1.5 min-w-max lg:min-w-0">
                        <div className="px-4 py-2 lg:block hidden border-t border-slate-100 pt-6 mt-2">
                          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400/80 mb-2">Hệ thống & Bảo mật</h2>
                        </div>
                        <Button 
                          variant={adminSubTab === 'users' ? 'secondary' : 'ghost'} 
                          className={`justify-start rounded-2xl px-4 h-11 transition-all duration-300 border border-transparent ${
                            adminSubTab === 'users' 
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 border-blue-500 font-bold scale-[1.02]' 
                              : 'text-slate-600 hover:bg-white hover:border-slate-200 hover:shadow-sm'
                          }`}
                          onClick={() => setAdminSubTab('users')}
                        >
                          <UserCircle className={`mr-3 h-4 w-4 ${adminSubTab === 'users' ? 'text-white' : 'text-slate-500'}`} />
                          <span className="text-sm">Người dùng & Quyền</span>
                        </Button>
                        <Button 
                          variant={adminSubTab === 'audit' ? 'secondary' : 'ghost'} 
                          className={`justify-start rounded-2xl px-4 h-11 transition-all duration-300 border border-transparent ${
                            adminSubTab === 'audit' 
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 border-blue-500 font-bold scale-[1.02]' 
                              : 'text-slate-600 hover:bg-white hover:border-slate-200 hover:shadow-sm'
                          }`}
                          onClick={() => setAdminSubTab('audit')}
                        >
                          <History className={`mr-3 h-4 w-4 ${adminSubTab === 'audit' ? 'text-white' : 'text-slate-500'}`} />
                          <span className="text-sm">Nhật ký hoạt động</span>
                        </Button>
                        <Button 
                          variant={adminSubTab === 'backup' ? 'secondary' : 'ghost'} 
                          className={`justify-start rounded-2xl px-4 h-11 transition-all duration-300 border border-transparent ${
                            adminSubTab === 'backup' 
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 border-blue-500 font-bold scale-[1.02]' 
                              : 'text-slate-600 hover:bg-white hover:border-slate-200 hover:shadow-sm'
                          }`}
                          onClick={() => setAdminSubTab('backup')}
                        >
                          <Database className={`mr-3 h-4 w-4 ${adminSubTab === 'backup' ? 'text-white' : 'text-slate-500'}`} />
                          <span className="text-sm">Sao lưu & Sheets</span>
                        </Button>
                        <Button 
                          variant={adminSubTab === 'settings' ? 'secondary' : 'ghost'} 
                          className={`justify-start rounded-2xl px-4 h-11 transition-all duration-300 border border-transparent ${
                            adminSubTab === 'settings' 
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 border-blue-500 font-bold scale-[1.02]' 
                              : 'text-slate-600 hover:bg-white hover:border-slate-200 hover:shadow-sm'
                          }`}
                          onClick={() => setAdminSubTab('settings')}
                        >
                          <Settings className={`mr-3 h-4 w-4 ${adminSubTab === 'settings' ? 'text-white' : 'text-slate-500'}`} />
                          <span className="text-sm">Cài đặt hệ thống</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </aside>

                {/* Admin Content Area */}
                <div className="flex-1 min-w-0">
                  <Tabs value={adminSubTab} onValueChange={setAdminSubTab} className="space-y-6">
                    {/* Hidden TabsList to keep Tabs logic working */}
                    <TabsList className="hidden" />

                    {/* Efficiency Management Tab */}
                    {adminSubTab === 'efficiency' && (
                      <div className="space-y-6">
                        <Card className="border-none shadow-sm overflow-hidden">
                          <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 w-full" />
                          <CardHeader className="pb-6">
                            <div className="flex items-center gap-3 mb-1">
                              <div className="p-2 bg-blue-50 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-blue-600" />
                              </div>
                              <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">Cập nhật hiệu quả kinh doanh</CardTitle>
                            </div>
                            <CardDescription className="text-slate-500 font-medium">Cập nhật số căn bán và doanh số thực tế của từng team theo dự án</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <form onSubmit={handleAddEfficiency} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                              <div className="lg:col-span-2 space-y-2">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Kỳ báo cáo</Label>
                                <div className="grid grid-cols-2 gap-2">
                                  <Select 
                                    value={newEfficiencyMonth ? newEfficiencyMonth.split('-')[0] : ''} 
                                    onValueChange={(val) => {
                                      const current = newEfficiencyMonth || format(new Date(), 'yyyy-MM');
                                      const [, m] = current.split('-');
                                      setNewEfficiencyMonth(`${val}-${m}`);
                                    }}
                                  >
                                    <SelectTrigger className="h-11 bg-slate-50 border-none rounded-xl font-bold">
                                      <SelectValue placeholder="Năm" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {[2024, 2025, 2026, 2027, 2028].map(y => (
                                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Select 
                                    value={newEfficiencyMonth ? newEfficiencyMonth.split('-')[1] : ''} 
                                    onValueChange={(val) => {
                                      const current = newEfficiencyMonth || format(new Date(), 'yyyy-MM');
                                      const [y] = current.split('-');
                                      setNewEfficiencyMonth(`${y}-${val}`);
                                    }}
                                  >
                                    <SelectTrigger className="h-11 bg-slate-50 border-none rounded-xl font-bold">
                                      <SelectValue placeholder="Tháng" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(m => (
                                        <SelectItem key={m} value={m}>Tháng {m}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="lg:col-span-2 space-y-2">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Dự án</Label>
                                <SearchableEfficiencyProjectSelect 
                                  value={newEfficiencyProject} 
                                  onValueChange={setNewEfficiencyProject} 
                                  projects={projects} 
                                  projectMap={projectMap} 
                                />
                              </div>
                              <div className="lg:col-span-2 space-y-2">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Team</Label>
                                <SearchableEfficiencyTeamSelect 
                                  value={newEfficiencyTeam} 
                                  onValueChange={setNewEfficiencyTeam} 
                                  teams={teams} 
                                  teamMap={teamMap} 
                                />
                              </div>
                              <div className="lg:col-span-2 space-y-2">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Số căn bán</Label>
                                <Input 
                                  type="number"
                                  placeholder="VD: 5"
                                  className="bg-slate-50 border-none h-11 rounded-xl" 
                                  value={newEfficiencySales}
                                  onChange={e => setNewEfficiencySales(e.target.value)}
                                />
                              </div>
                              <div className="lg:col-span-2 space-y-2">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Doanh số (VND)</Label>
                                <Input 
                                  type="text"
                                  placeholder="VD: 15,000,000,000"
                                  className="bg-slate-50 border-none h-11 rounded-xl" 
                                  value={formatNumberWithCommas(newEfficiencyRevenue)}
                                  onChange={e => setNewEfficiencyRevenue(e.target.value.replace(/\./g, ''))}
                                />
                              </div>
                              <div className="lg:col-span-2">
                                <Button 
                                  type="submit" 
                                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 rounded-xl"
                                  disabled={isAddingEfficiency}
                                >
                                  {isAddingEfficiency ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                  Lưu kết quả
                                </Button>
                              </div>
                            </form>
                          </CardContent>
                        </Card>

                        <Card className="border-none shadow-sm overflow-hidden">
                          <CardHeader className="pb-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <FileSpreadsheet className="w-5 h-5 text-blue-500" />
                                Danh sách hiệu quả kinh doanh
                              </CardTitle>
                              <div className="flex flex-wrap items-center gap-3">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-10 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl"
                                  onClick={() => setIsImportEfficiencyDialogOpen(true)}
                                >
                                  <FileUp className="w-4 h-4 mr-2" /> Nhập từ Excel
                                </Button>
                                {isAdmin && (
                                  <>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="h-10 text-xs text-red-600 border-red-200 hover:bg-red-50 rounded-xl"
                                      onClick={handleBulkDeleteEfficiency}
                                      disabled={selectedEfficiencyIds.length === 0 || isDeletingEfficiencyBatch}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" /> {isDeletingEfficiencyBatch ? 'Đang xóa...' : `Xóa (${selectedEfficiencyIds.length})`}
                                    </Button>
                                    <Button 
                                      variant="destructive" 
                                      size="sm" 
                                      className="h-10 text-xs rounded-xl"
                                      onClick={handleDeleteAllEfficiency}
                                      disabled={efficiencyReports.length === 0}
                                    >
                                      <AlertTriangle className="w-4 h-4 mr-2" /> Xóa tất cả
                                    </Button>
                                  </>
                                )}
                                <div className="relative w-64">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                  <DebouncedInput 
                                    placeholder="Tìm dự án, team..." 
                                    className="pl-10 bg-slate-50 border-none h-10 text-xs rounded-xl"
                                    value={adminEfficiencySearch}
                                    onChange={setAdminEfficiencySearch}
                                  />
                                </div>
                                <div className="flex gap-1">
                                  <Select 
                                    value={adminEfficiencyMonthFilter ? adminEfficiencyMonthFilter.split('-')[0] : ''} 
                                    onValueChange={(val) => {
                                      const current = adminEfficiencyMonthFilter || format(new Date(), 'yyyy-MM');
                                      const [y, m] = current.split('-');
                                      setAdminEfficiencyMonthFilter(`${val}-${m}`);
                                    }}
                                  >
                                    <SelectTrigger className="w-[80px] bg-slate-50 border-none h-10 text-[10px] font-bold rounded-xl">
                                      <SelectValue placeholder="Năm" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {[2024, 2025, 2026, 2027, 2028].map(y => (
                                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Select 
                                    value={adminEfficiencyMonthFilter ? adminEfficiencyMonthFilter.split('-')[1] : ''} 
                                    onValueChange={(val) => {
                                      const current = adminEfficiencyMonthFilter || format(new Date(), 'yyyy-MM');
                                      const [y, m] = current.split('-');
                                      setAdminEfficiencyMonthFilter(`${y}-${val}`);
                                    }}
                                  >
                                    <SelectTrigger className="w-[100px] bg-slate-50 border-none h-10 text-[10px] font-bold rounded-xl">
                                      <SelectValue placeholder="Tháng" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">Tất cả</SelectItem>
                                      {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(m => (
                                        <SelectItem key={m} value={m}>Tháng {m}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {adminEfficiencyMonthFilter && (
                                    <button 
                                      className="p-1 hover:bg-slate-200 rounded-full transition-colors self-center"
                                      onClick={() => setAdminEfficiencyMonthFilter('')}
                                    >
                                      <X className="w-3 h-3 text-slate-400" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="p-0">
                            <div className="bg-blue-50/50 px-6 py-3 border-b border-slate-100 flex items-center justify-between font-mono">
                              <div className="flex items-center gap-4">
                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Database Info</span>
                                <div className="h-4 w-px bg-slate-200" />
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="bg-white text-blue-700 border-blue-100 font-black text-[10px]">
                                    {efficiencyReports.length} TOTAL RECORDS
                                  </Badge>
                                  <Badge variant="secondary" className="bg-white text-emerald-700 border-emerald-100 font-black text-[10px]">
                                    {filteredEfficiencyReports.length} FILTERED
                                  </Badge>
                                </div>
                              </div>
                              {adminEfficiencyMonthFilter && (
                                <p className="text-[9px] text-slate-400 font-bold italic">
                                  <Info className="w-3 h-3 inline mr-1" /> Viewing month: {adminEfficiencyMonthFilter}. Use X to show all.
                                </p>
                              )}
                            </div>
                            <div className="overflow-x-auto scroll-hide -mx-2 px-2">
                              <Table>
                                <TableHeader className="bg-slate-50/50">
                                  <TableRow>
                                    <TableHead className="w-12 pl-4 py-3 text-[10px] uppercase font-black text-slate-400">STT</TableHead>
                                    <TableHead className="w-10 px-2 py-3">
                                      <input 
                                      type="checkbox" 
                                      className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                                      checked={filteredEfficiencyReports.length > 0 && selectedEfficiencyIds.length === filteredEfficiencyReports.length}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedEfficiencyIds(filteredEfficiencyReports.map(r => r.id));
                                        } else {
                                          setSelectedEfficiencyIds([]);
                                        }
                                      }}
                                    />
                                  </TableHead>
                                  <TableHead 
                                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-2 cursor-pointer hover:bg-slate-100 transition-colors"
                                    onClick={() => setAdminEfficiencySort(prev => ({ key: 'name', direction: prev.key === 'name' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                                  >
                                    <div className="flex items-center gap-1">
                                      Dự án / Team <ArrowUpDown className="w-3 h-3 text-slate-300" />
                                    </div>
                                  </TableHead>
                                  <TableHead 
                                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                                    onClick={() => setAdminEfficiencySort(prev => ({ key: 'month', direction: prev.key === 'month' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                                  >
                                    <div className="flex items-center justify-center gap-1">
                                      Tháng <ArrowUpDown className="w-3 h-3 text-slate-300" />
                                    </div>
                                  </TableHead>
                                  <TableHead 
                                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                                    onClick={() => setAdminEfficiencySort(prev => ({ key: 'sales', direction: prev.key === 'sales' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                                  >
                                    <div className="flex items-center justify-center gap-1">
                                      Số căn <ArrowUpDown className="w-3 h-3 text-slate-300" />
                                    </div>
                                  </TableHead>
                                  <TableHead 
                                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                                    onClick={() => setAdminEfficiencySort(prev => ({ key: 'revenue', direction: prev.key === 'revenue' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                                  >
                                    <div className="flex items-center justify-end gap-1">
                                      Doanh số <ArrowUpDown className="w-3 h-3 text-slate-300" />
                                    </div>
                                  </TableHead>
                                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center w-[120px]">Thao tác</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredEfficiencyReports.map((report, idx) => (
                                  <TableRow key={report.id} className="hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="w-12 pl-4 py-3 font-black text-slate-400 text-xs text-center border-r border-slate-50/50">{idx + 1}</TableCell>
                                    <TableCell className="w-10 px-2 py-3">
                                      <input 
                                        type="checkbox" 
                                        className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                                        checked={selectedEfficiencyIds.includes(report.id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedEfficiencyIds(prev => [...prev, report.id]);
                                          } else {
                                            setSelectedEfficiencyIds(prev => prev.filter(id => id !== report.id));
                                          }
                                        }}
                                      />
                                    </TableCell>
                                    <TableCell className="pl-2">
                                      <div className="space-y-0.5">
                                        <div className="font-bold text-slate-900">{projectMap[report.projectId] || report.projectName}</div>
                                        <div className="text-[10px] text-slate-500 font-medium">{teamMap[report.teamId] || report.teamName}</div>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center font-medium text-slate-600">{report.month}</TableCell>
                                    <TableCell className="text-center">
                                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 font-bold px-3">
                                        {report.salesCount} căn
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-black text-slate-900 font-mono">
                                      {formatCurrency(report.revenue)}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center justify-center gap-2">
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                          onClick={() => {
                                            setEditingEfficiency(report);
                                            setNewEfficiencySales(report.salesCount.toString());
                                            setNewEfficiencyRevenue(report.revenue.toString());
                                            setIsEditEfficiencyDialogOpen(true);
                                          }}
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                          onClick={() => {
                                            setEfficiencyToDelete(report);
                                            setIsDeleteEfficiencyDialogOpen(true);
                                          }}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                                {filteredEfficiencyReports.length === 0 && (
                                  <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-slate-400 italic">
                                      Chưa có dữ liệu hiệu quả kinh doanh cho kỳ này
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                              {filteredEfficiencyReports.length > 0 && (
                                <TableFooter className="bg-slate-50/80 border-t-2 border-slate-200">
                                  <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={4} className="pl-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Tổng cộng lọc được:</TableCell>
                                    <TableCell className="text-center py-4">
                                      <div className="flex flex-col items-center">
                                        <Badge className="bg-blue-600 text-white font-black px-3 py-0.5 text-[10px] h-5 min-w-[60px] justify-center">
                                          {filteredEfficiencyReports.reduce((acc, curr) => acc + curr.salesCount, 0)} căn
                                        </Badge>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right py-4 font-black text-slate-900 font-mono text-xs pr-4" colSpan={1}>
                                      {formatCurrency(filteredEfficiencyReports.reduce((acc, curr) => acc + curr.revenue, 0))}
                                    </TableCell>
                                    <TableCell className="w-[120px]" />
                                  </TableRow>
                                </TableFooter>
                              )}
                            </Table>
                          </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Project Management Tab */}
                    <TabsContent value="projects" className="space-y-6">
                      <div className="space-y-6">
                        {/* Project Controls Card */}
                        <Card className="border-none shadow-sm overflow-hidden bg-white">
                          <div className="h-1 bg-blue-600 w-full" />
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-xl font-black text-slate-900">Danh mục Dự án</CardTitle>
                                <CardDescription className="text-xs font-medium text-slate-500">Quản lý toàn bộ danh sách dự án bất động sản trên hệ thống</CardDescription>
                              </div>
                              {isAdmin && (
                                <div className="flex gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="h-9 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 transition-all font-bold"
                                    onClick={handleExportProjects}
                                  >
                                    <Download className="w-4 h-4 mr-2 text-indigo-500" /> Xuất Excel
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="h-9 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 transition-all font-bold relative"
                                    disabled={isImportingProjects}
                                    nativeButton={false}
                                    render={<label className="cursor-pointer flex items-center px-4" />}
                                  >
                                    {isImportingProjects ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <FileUp className="w-4 h-4 mr-2 text-emerald-500" />}
                                    Nhập Excel
                                    <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleImportProjectsCSV} />
                                  </Button>
                                  <Dialog>
                                    <DialogTrigger nativeButton={true} render={<Button className="h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-100 font-bold px-4" />}>
                                      <Plus className="w-4 h-4 mr-2" /> Thêm dự án
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[500px] rounded-3xl border-none shadow-2xl">
                                      <DialogHeader>
                                        <DialogTitle className="text-xl font-black text-slate-900">Thêm dự án mới</DialogTitle>
                                        <DialogDescription className="font-medium text-slate-500">Nhập thông tin dự án bất động sản. Bạn có thể nhập nhiều dự án cùng lúc (mỗi dòng một tên).</DialogDescription>
                                      </DialogHeader>
                                      <form onSubmit={handleAddProject} className="space-y-6 py-4">
                                        <div className="space-y-2">
                                          <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Tên dự án</Label>
                                          <textarea 
                                            className="flex min-h-[140px] w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm transition-all focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none"
                                            placeholder="VD: Vinhomes Grand Park&#10;Vinhomes Central Park" 
                                            value={newProjectName} 
                                            onChange={e => setNewProjectName(e.target.value)} 
                                          />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Vùng / Khu vực</Label>
                                            <Select value={newProjectRegion} onValueChange={setNewProjectRegion}>
                                              <SelectTrigger className="rounded-xl border-slate-100 bg-slate-50 h-11">
                                                <SelectValue placeholder="Chọn vùng..." />
                                              </SelectTrigger>
                                              <SelectContent className="rounded-xl border-none shadow-xl">
                                                {regions.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Loại hình</Label>
                                            <Select value={newProjectType} onValueChange={setNewProjectType}>
                                              <SelectTrigger className="rounded-xl border-slate-100 bg-slate-50 h-11">
                                                <SelectValue placeholder="Chọn loại..." />
                                              </SelectTrigger>
                                              <SelectContent className="rounded-xl border-none shadow-xl">
                                                {types.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </div>
                                        <DialogFooter>
                                          <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg shadow-blue-100">
                                            Xác nhận thêm dự án
                                          </Button>
                                        </DialogFooter>
                                      </form>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="px-6 pb-6 pt-2">
                            <div className="flex flex-wrap items-center gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-100 shadow-inner">
                              <div className="flex-1 min-w-[280px]">
                                <div className="relative group">
                                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors group-focus-within:text-blue-500" />
                                  <DebouncedInput 
                                    placeholder="Tìm theo tên dự án hoặc mã..." 
                                    className="pl-11 h-11 bg-white border-none shadow-sm rounded-xl text-sm transition-all focus:ring-2 focus:ring-blue-100"
                                    value={projectSearch}
                                    onChange={setProjectSearch}
                                  />
                                </div>
                              </div>
                              <div className="w-[200px]">
                                <Select value={adminProjectRegionFilter} onValueChange={setAdminProjectRegionFilter}>
                                  <SelectTrigger className="h-11 bg-white border-none shadow-sm rounded-xl text-[13px] font-medium text-slate-600">
                                    <div className="flex items-center gap-2">
                                      <MapIcon className="w-3.5 h-3.5 text-emerald-500" />
                                      <SelectValue placeholder="Tất cả khu vực" />
                                    </div>
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl border-none shadow-xl">
                                    <SelectItem value="all">Tất cả khu vực</SelectItem>
                                    {uniqueRegions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="w-[200px]">
                                <Select value={adminProjectTypeFilter} onValueChange={setAdminProjectTypeFilter}>
                                  <SelectTrigger className="h-11 bg-white border-none shadow-sm rounded-xl text-[13px] font-medium text-slate-600">
                                    <div className="flex items-center gap-2">
                                      <Layers className="w-3.5 h-3.5 text-amber-500" />
                                      <SelectValue placeholder="Tất cả loại hình" />
                                    </div>
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl border-none shadow-xl">
                                    <SelectItem value="all">Tất cả loại hình</SelectItem>
                                    {types.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      {/* Project Table Card will be here, inside the same div/TabsContent */}
                      
                    {/* Project Table */}
                    <Card className="border-none shadow-sm bg-white overflow-hidden">
                      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-6">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-600 p-2 rounded-xl">
                            <Building2 className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg font-bold text-slate-900">Danh sách dự án</CardTitle>
                              <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none font-bold">
                                {projects.length}
                              </Badge>
                            </div>
                            <CardDescription className="text-[11px] font-medium text-slate-400">Quản lý và phân loại dự án bất động sản</CardDescription>
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-100">
                              <Dialog open={isBulkUpdateRegionDialogOpen} onOpenChange={setIsBulkUpdateRegionDialogOpen}>
                                <DialogTrigger nativeButton={true} render={
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 text-[11px] font-bold text-slate-600 hover:text-blue-600 rounded-lg transition-all"
                                    disabled={selectedProjectIds.length === 0}
                                  />
                                }>
                                  <MapIcon className="w-3.5 h-3.5 mr-1.5" /> Vùng ({selectedProjectIds.length})
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[400px] rounded-3xl border-none shadow-2xl">
                                  <DialogHeader>
                                    <DialogTitle className="text-xl font-black text-slate-900">Cập nhật Vùng</DialogTitle>
                                    <DialogDescription className="font-medium text-slate-500">Chọn vùng / khu vực mới cho {selectedProjectIds.length} dự án đã chọn.</DialogDescription>
                                  </DialogHeader>
                                  <div className="py-6 space-y-4">
                                    <div className="space-y-2">
                                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Vùng / Khu vực mới</Label>
                                      <Select value={selectedRegionForBulk} onValueChange={setSelectedRegionForBulk}>
                                        <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-100"><SelectValue placeholder="Chọn vùng..." /></SelectTrigger>
                                        <SelectContent className="rounded-xl border-none shadow-xl">
                                          {regions.map(r => (
                                            <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button onClick={handleBulkUpdateProjectRegion} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg shadow-blue-100">
                                      Cập nhật cho {selectedProjectIds.length} dự án
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>

                              <div className="w-px h-4 bg-slate-200 mx-1" />

                              <Dialog open={isBulkUpdateTypeDialogOpen} onOpenChange={setIsBulkUpdateTypeDialogOpen}>
                                <DialogTrigger nativeButton={true} render={
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 text-[11px] font-bold text-slate-600 hover:text-indigo-600 rounded-lg transition-all"
                                    disabled={selectedProjectIds.length === 0}
                                  />
                                }>
                                  <Layers className="w-3.5 h-3.5 mr-1.5" /> Loại hình ({selectedProjectIds.length})
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[400px] rounded-3xl border-none shadow-2xl">
                                  <DialogHeader>
                                    <DialogTitle className="text-xl font-black text-slate-900">Cập nhật Loại hình</DialogTitle>
                                    <DialogDescription className="font-medium text-slate-500">Chọn loại hình mới cho {selectedProjectIds.length} dự án đã chọn.</DialogDescription>
                                  </DialogHeader>
                                  <div className="py-6 space-y-4">
                                    <div className="space-y-2">
                                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Loại hình mới</Label>
                                      <Select value={selectedTypeForBulk} onValueChange={setSelectedTypeForBulk}>
                                        <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-100"><SelectValue placeholder="Chọn loại hình..." /></SelectTrigger>
                                        <SelectContent className="rounded-xl border-none shadow-xl">
                                          {types.map(t => (
                                            <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button onClick={handleBulkUpdateProjectType} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg shadow-blue-100">
                                      Cập nhật cho {selectedProjectIds.length} dự án
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>

                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-9 rounded-xl text-[11px] font-bold text-blue-600 border-blue-100 hover:bg-blue-50 transition-all px-4"
                              onClick={handleSyncProjectCodes}
                              disabled={isSyncingProjects}
                            >
                              <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isSyncingProjects ? 'animate-spin' : ''}`} /> Đồng bộ Mã
                            </Button>

                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-9 rounded-xl text-[11px] font-bold text-red-600 border-red-100 hover:bg-red-50 transition-all px-4"
                              onClick={handleBulkDeleteProjects}
                              disabled={selectedProjectIds.length === 0}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Xóa ({selectedProjectIds.length})
                            </Button>

                            <Dialog>
                              <DialogTrigger nativeButton={false} render={
                                <Button 
                                  variant="destructive" 
                                  size="sm" 
                                  className="h-9 rounded-xl text-[11px] font-bold px-4"
                                  disabled={projects.length === 0}
                                />
                              }>
                                <AlertTriangle className="w-3.5 h-3.5 mr-2" /> Xóa tất cả
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[400px] rounded-3xl border-none shadow-2xl">
                                <DialogHeader>
                                  <DialogTitle className="text-xl font-black text-slate-900">Xác nhận xóa tất cả?</DialogTitle>
                                  <DialogDescription className="font-medium text-slate-500">Hành động này sẽ xóa toàn bộ danh sách dự án. Dữ liệu không thể khôi phục.</DialogDescription>
                                </DialogHeader>
                                <DialogFooter className="mt-4">
                                  <Button variant="outline" className="rounded-xl h-12 font-bold" onClick={() => {}}>Hủy</Button>
                                  <Button variant="destructive" className="rounded-xl h-12 font-black shadow-lg shadow-red-100" onClick={handleDeleteAllProjects}>Xác nhận Xóa hết</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="rounded-xl border border-slate-100 overflow-x-auto scroll-hide">
                          <Table>
                            <TableHeader className="bg-slate-50/50">
                              <TableRow className="hover:bg-transparent border-b border-slate-100">
                                {isAdmin && (
                                  <TableHead className="w-[50px] pl-6 py-4">
                                    <input 
                                      type="checkbox" 
                                      className="h-4 w-4 rounded border-slate-300 accent-blue-600"
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
                                <TableHead className="cursor-pointer py-4 group" onClick={() => setProjectSort({ key: 'projectCode', direction: projectSort.direction === 'asc' ? 'desc' : 'asc' })}>
                                  <div className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-slate-400 group-hover:text-blue-600 transition-colors">
                                    Mã Dự án <ArrowUpDown className="w-3 h-3" />
                                  </div>
                                </TableHead>
                                <TableHead className="cursor-pointer py-4 group" onClick={() => setProjectSort({ key: 'name', direction: projectSort.direction === 'asc' ? 'desc' : 'asc' })}>
                                  <div className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-slate-400 group-hover:text-blue-600 transition-colors">
                                    Tên dự án <ArrowUpDown className="w-3 h-3" />
                                  </div>
                                </TableHead>
                                <TableHead className="cursor-pointer py-4 group" onClick={() => setProjectSort({ key: 'region', direction: projectSort.direction === 'asc' ? 'desc' : 'asc' })}>
                                  <div className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-slate-400 group-hover:text-blue-600 transition-colors">
                                    Khu vực <ArrowUpDown className="w-3 h-3" />
                                  </div>
                                </TableHead>
                                <TableHead className="cursor-pointer py-4 group" onClick={() => setProjectSort({ key: 'type', direction: projectSort.direction === 'asc' ? 'desc' : 'asc' })}>
                                  <div className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-slate-400 group-hover:text-blue-600 transition-colors">
                                    Loại hình <ArrowUpDown className="w-3 h-3" />
                                  </div>
                                </TableHead>
                                <TableHead className="text-[10px] uppercase font-black tracking-widest text-slate-400 py-4">Ngày tạo</TableHead>
                                <TableHead className="text-right pr-6 py-4 text-[10px] uppercase font-black tracking-widest text-slate-400">Thao tác</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sortedProjects.map(p => (
                                <TableRow key={p.id} className={`group transition-colors border-b border-slate-50 ${selectedProjectIds.includes(p.id) ? "bg-blue-50/20" : "hover:bg-slate-50/30"}`}>
                                  {isAdmin && (
                                    <TableCell className="pl-6 py-4">
                                      <input 
                                        type="checkbox" 
                                        className="h-4 w-4 rounded border-slate-300 accent-blue-600"
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
                                  <TableCell className="py-4">
                                    {editingProjectId === p.id ? (
                                      <Input value={editingProjectCode} onChange={e => setEditingProjectCode(e.target.value)} className="h-9 font-mono text-xs rounded-lg border-blue-100 bg-blue-50/30" />
                                    ) : (
                                      <Badge variant="outline" className="font-mono text-[10px] font-black text-blue-600 border-blue-100 bg-blue-50 shadow-none px-2 rounded-lg">
                                        {p.projectCode || '-'}
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="py-4">
                                    {editingProjectId === p.id ? (
                                      <Input value={editingProjectName} onChange={e => {
                                        setEditingProjectName(e.target.value);
                                        if (!editingProjectCode) {
                                          setEditingProjectCode(extractProjectCode(e.target.value));
                                        }
                                      }} className="h-9 text-sm rounded-lg border-blue-100 bg-blue-50/30" />
                                    ) : (
                                      <div className="flex flex-col">
                                        <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{p.name}</span>
                                        {overBudgetProjectIds.has(p.id) && (
                                          <div className="flex items-center gap-1 mt-0.5">
                                            <span className="flex h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                                            <span className="text-[9px] font-black uppercase text-red-500 tracking-tighter">Vượt ngân sách</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="py-4">
                                    {editingProjectId === p.id ? (
                                      <Select value={editingProjectRegion} onValueChange={setEditingProjectRegion}>
                                        <SelectTrigger className="h-9 text-xs rounded-lg border-blue-100 bg-blue-50/30"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl border-none shadow-xl">
                                          {regions.map(r => (
                                            <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <div className="flex items-center gap-1.5 font-medium text-slate-600 text-sm">
                                        <MapIcon className="w-3 h-3 text-emerald-500" />
                                        {p.region || 'Chưa xác định'}
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="py-4">
                                    {editingProjectId === p.id ? (
                                      <Select value={editingProjectType} onValueChange={setEditingProjectType}>
                                        <SelectTrigger className="h-9 text-xs rounded-lg border-blue-100 bg-blue-50/30"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl border-none shadow-xl">
                                          {types.map(t => (
                                            <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                                        (p.type || '').trim() === 'Cao tầng' ? 'bg-indigo-50 text-indigo-700' : 
                                        (p.type || '').trim() === 'Thấp tầng' ? 'bg-amber-50 text-amber-700' : 
                                        p.type ? 'bg-slate-50 text-slate-600' : 'bg-red-50 text-red-700'
                                      }`}>
                                        {p.type || 'Chưa phân loại'}
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="py-4 text-xs font-medium text-slate-400">
                                    {safeFormat(p.createdAt?.toDate ? p.createdAt.toDate() : new Date(), 'dd/MM/yyyy')}
                                  </TableCell>
                                  <TableCell className="py-4 pr-6 text-right">
                                    {isAdmin && (
                                      <div className="flex justify-end gap-1">
                                        {editingProjectId === p.id ? (
                                          <>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-50 rounded-lg shadow-sm" onClick={() => handleUpdateProject(p.id, editingProjectName, editingProjectCode, editingProjectRegion, editingProjectType)}>
                                              <Check className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:bg-slate-100 rounded-lg" onClick={() => setEditingProjectId(null)}>
                                              <X className="h-4 w-4" />
                                            </Button>
                                          </>
                                        ) : (
                                          <>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" onClick={() => {
                                              setEditingProjectId(p.id);
                                              setEditingProjectName(p.name);
                                              setEditingProjectCode(p.projectCode || extractProjectCode(p.name));
                                              setEditingProjectRegion(p.region || '');
                                              setEditingProjectType(p.type || '');
                                            }}>
                                              <Edit2 className="h-3.5 w-3.5" />
                                            </Button>
                                            <Dialog>
                                              <DialogTrigger nativeButton={true} render={
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" />
                                              }>
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </DialogTrigger>
                                              <DialogContent className="sm:max-w-[400px] rounded-3xl border-none shadow-2xl">
                                                <DialogHeader>
                                                  <DialogTitle className="text-xl font-black text-slate-900">Xóa dự án?</DialogTitle>
                                                  <DialogDescription className="font-medium text-slate-500">Bạn có chắc chắn muốn xóa dự án <span className="text-red-600 font-bold">{p.name}</span>? Thao tác này không thể hoàn tác.</DialogDescription>
                                                </DialogHeader>
                                                <DialogFooter className="mt-4">
                                                  <Button variant="outline" className="rounded-xl h-12 font-bold" onClick={() => {}}>Hủy</Button>
                                                  <Button variant="destructive" className="rounded-xl h-12 font-black shadow-lg shadow-red-100" onClick={() => handleDeleteProject(p.id, p.name)}>Xác nhận Xóa</Button>
                                                </DialogFooter>
                                              </DialogContent>
                                            </Dialog>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                              {sortedProjects.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={isAdmin ? 7 : 6} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center space-y-4">
                                      <div className="bg-slate-50 p-4 rounded-full border border-slate-100">
                                        <Search className="h-8 w-8 text-slate-300" />
                                      </div>
                                      <div className="space-y-1">
                                        <p className="font-bold text-slate-900">Không tìm thấy dự án nào</p>
                                        <p className="text-xs text-slate-500">Hãy thử thay đổi từ khóa hoặc bộ lọc</p>
                                      </div>
                                    </div>
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
                    <Card className="border-none shadow-sm bg-white overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div className="flex-1 max-w-md space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Tìm kiếm Vùng / Khu vực</Label>
                            <div className="relative group">
                              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                              <DebouncedInput 
                                placeholder="Nhập tên vùng (VD: Quận 1, Quận 2...)" 
                                className="h-11 pl-11 bg-slate-50 border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-medium"
                                value={regionSearch}
                                onChange={setRegionSearch}
                              />
                            </div>
                          </div>
                          
                          {isAdmin && (
                            <Dialog>
                              <DialogTrigger nativeButton={false} render={
                                <Button className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg shadow-blue-100 px-6 transition-all transform active:scale-95 flex items-center gap-2">
                                  <Plus className="w-5 h-5" /> Thêm Vùng / Khu vực
                                </Button>
                              } />
                              <DialogContent className="sm:max-w-[500px] rounded-3xl border-none shadow-2xl">
                                <DialogHeader>
                                  <DialogTitle className="text-2xl font-black text-slate-900">Thêm Vùng mới</DialogTitle>
                                  <DialogDescription className="font-medium text-slate-500">Nhập danh sách các vùng hoặc khu vực. Mỗi dòng tương ứng 1 vùng.</DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleAddRegion} className="space-y-6 pt-4">
                                  <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Tên Vùng / Khu vực (Mỗi dòng 1 vùng)</Label>
                                    <textarea 
                                      className="flex min-h-[160px] w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium ring-offset-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                                      placeholder="VD: Quận 9&#10;Thủ Đức&#10;Quận 2" 
                                      value={newRegionName} 
                                      onChange={e => setNewRegionName(e.target.value)} 
                                    />
                                  </div>
                                  <DialogFooter>
                                    <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg shadow-blue-100" disabled={isAddingRegion}>
                                      {isAddingRegion ? (
                                        <div className="flex items-center gap-2">
                                          <RefreshCw className="w-4 h-4 animate-spin" /> Đang xử lý...
                                        </div>
                                      ) : 'Xác nhận lưu danh sách'}
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
                    <Card className="border-none shadow-sm bg-white overflow-hidden">
                      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-6">
                        <div className="flex items-center gap-3">
                          <div className="bg-emerald-600 p-2 rounded-xl">
                            <MapIcon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg font-bold text-slate-900">Danh sách Vùng</CardTitle>
                              <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none font-bold">
                                {regions.length}
                              </Badge>
                            </div>
                            <CardDescription className="text-[11px] font-medium text-slate-400">Định nghĩa các khu vực hoạt động</CardDescription>
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-9 rounded-xl text-[11px] font-bold text-red-600 border-red-100 hover:bg-red-50 transition-all px-4"
                              onClick={handleBulkDeleteRegions}
                              disabled={selectedRegionIds.length === 0 || isDeletingRegions}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> {isDeletingRegions ? 'Đang xóa...' : `Xóa (${selectedRegionIds.length})`}
                            </Button>

                            <Dialog>
                              <DialogTrigger nativeButton={false} render={
                                <Button 
                                  variant="destructive" 
                                  size="sm" 
                                  className="h-9 rounded-xl text-[11px] font-bold px-4"
                                  disabled={regions.length === 0}
                                />
                              }>
                                <AlertTriangle className="w-3.5 h-3.5 mr-2" /> Xóa tất cả
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[400px] rounded-3xl border-none shadow-2xl">
                                <DialogHeader>
                                  <DialogTitle className="text-xl font-black text-slate-900">Xác nhận xóa tất cả?</DialogTitle>
                                  <DialogDescription className="font-medium text-slate-500">Toàn bộ danh sách vùng / khu vực sẽ bị xóa vĩnh viễn.</DialogDescription>
                                </DialogHeader>
                                <DialogFooter className="mt-4">
                                  <Button variant="outline" className="rounded-xl h-12 font-bold" onClick={() => {}}>Hủy</Button>
                                  <Button variant="destructive" className="rounded-xl h-12 font-black shadow-lg shadow-red-100" onClick={handleDeleteAllRegions}>Xác nhận Xóa</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="rounded-xl border border-slate-100 overflow-x-auto scroll-hide">
                          <Table>
                            <TableHeader className="bg-slate-50/50">
                              <TableRow className="hover:bg-transparent border-b border-slate-100">
                                {isAdmin && (
                                  <TableHead className="w-[50px] pl-6 py-4">
                                    <input 
                                      type="checkbox" 
                                      className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
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
                                <TableHead className="cursor-pointer py-4 pl-4 group" onClick={() => setRegionSort({ key: 'name', direction: regionSort.direction === 'asc' ? 'desc' : 'asc' })}>
                                  <div className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-slate-400 group-hover:text-emerald-600 transition-colors">
                                    Tên Vùng / Khu vực <ArrowUpDown className="w-3 h-3" />
                                  </div>
                                </TableHead>
                                <TableHead className="py-4 text-[10px] uppercase font-black tracking-widest text-slate-400">Số lượng dự án</TableHead>
                                <TableHead className="py-4 text-[10px] uppercase font-black tracking-widest text-slate-400">Ngày tạo</TableHead>
                                <TableHead className="text-right pr-6 py-4 text-[10px] uppercase font-black tracking-widest text-slate-400">Thao tác</TableHead>
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
                                    <TableRow key={r.id} className={`group transition-all border-b border-slate-50 ${selectedRegionIds.includes(r.id) ? "bg-emerald-50/20" : "hover:bg-slate-50/30"}`}>
                                      {isAdmin && (
                                        <TableCell className="pl-6 py-4">
                                          <input 
                                            type="checkbox" 
                                            className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
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
                                      <TableCell className="py-4 pl-4">
                                        {editingRegionId === r.id ? (
                                          <Input value={editingRegionName} onChange={e => setEditingRegionName(e.target.value)} className="h-9 px-3 rounded-lg border-emerald-100 bg-emerald-50/30 text-sm font-bold" />
                                        ) : (
                                          <span className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors uppercase italic">{r.name}</span>
                                        )}
                                      </TableCell>
                                      <TableCell className="py-4">
                                        <Badge variant="secondary" className="bg-slate-50 text-slate-600 border-slate-100 font-bold px-3 py-1 rounded-lg">
                                          {regionProjects.length} dự án
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="py-4 text-xs font-medium text-slate-400">
                                        {safeFormat(r.createdAt?.toDate ? r.createdAt.toDate() : new Date(), 'dd/MM/yyyy')}
                                      </TableCell>
                                      <TableCell className="py-4 pr-6 text-right">
                                        {isAdmin && (
                                          <div className="flex justify-end gap-1">
                                            {editingRegionId === r.id ? (
                                              <>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-50 rounded-lg shadow-sm" onClick={() => handleUpdateRegion(r.id, editingRegionName)}>
                                                  <Check className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:bg-slate-100 rounded-lg" onClick={() => setEditingRegionId(null)}>
                                                  <X className="h-4 w-4" />
                                                </Button>
                                              </>
                                            ) : (
                                              <>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" onClick={() => {
                                                  setRegionForProjects(r);
                                                  setSelectedProjectIdsForRegion(regionProjects.map(p => p.id));
                                                  setIsSetProjectsDialogOpen(true);
                                                }} title="Gán dự án">
                                                  <Plus className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg" onClick={() => {
                                                  setEditingRegionId(r.id);
                                                  setEditingRegionName(r.name);
                                                }}>
                                                  <Edit2 className="h-3.5 w-3.5" />
                                                </Button>
                                                <Dialog>
                                                  <DialogTrigger nativeButton={false} render={
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" />
                                                  }>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                  </DialogTrigger>
                                                  <DialogContent className="sm:max-w-[400px] rounded-3xl border-none shadow-2xl">
                                                    <DialogHeader>
                                                      <DialogTitle className="text-xl font-black text-slate-900">Xóa vùng này?</DialogTitle>
                                                      <DialogDescription className="font-medium text-slate-500">Dự án thuộc vùng này sẽ về trạng thái 'Chưa xác định'.</DialogDescription>
                                                    </DialogHeader>
                                                    <DialogFooter className="mt-4">
                                                      <Button variant="outline" className="rounded-xl h-12 font-bold" onClick={() => {}}>Hủy</Button>
                                                      <Button variant="destructive" className="rounded-xl h-12 font-black shadow-lg shadow-red-100" onClick={() => handleDeleteRegion(r.id, r.name)}>Xác nhận Xóa</Button>
                                                    </DialogFooter>
                                                  </DialogContent>
                                                </Dialog>
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
                                  <TableCell colSpan={isAdmin ? 5 : 4} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center space-y-4">
                                      <div className="bg-slate-50 p-4 rounded-full border border-slate-100">
                                        <MapIcon className="h-8 w-8 text-slate-300" />
                                      </div>
                                      <div className="space-y-1">
                                        <p className="font-bold text-slate-900">Chưa có vùng nào</p>
                                        <p className="text-xs text-slate-500">Hãy thêm vùng mới để quản lý dự án</p>
                                      </div>
                                    </div>
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
                              <DebouncedInput 
                                placeholder="Nhập tên loại hình..." 
                                className="pl-10 bg-slate-50 border-none shadow-none"
                                value={typeSearch}
                                onChange={setTypeSearch}
                              />
                            </div>
                          </div>
                          {isAdmin && (
                            <Dialog>
                              <DialogTrigger nativeButton={false} render={
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
                    <Card className="border-none shadow-sm bg-white overflow-hidden">
                      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-6">
                        <div className="flex items-center gap-3">
                          <div className="bg-indigo-600 p-2 rounded-xl">
                            <Layers className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg font-bold text-slate-900">Danh sách Loại hình</CardTitle>
                              <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none font-bold">
                                {types.length}
                              </Badge>
                            </div>
                            <CardDescription className="text-[11px] font-medium text-slate-400">Phân loại các hình thức bất động sản</CardDescription>
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="flex flex-wrap items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-9 rounded-xl text-[10px] font-bold text-indigo-600 border-indigo-100 hover:bg-indigo-50 transition-all px-3"
                              onClick={handleSyncTypes}
                              disabled={isSyncingTypes}
                            >
                              {isSyncingTypes ? (
                                <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3.5 h-3.5 mr-2" />
                              )}
                              Đồng bộ
                            </Button>

                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-9 rounded-xl text-[10px] font-bold text-blue-600 border-blue-100 hover:bg-blue-50 transition-all px-3"
                              onClick={() => {
                                setSelectedGlobalProjectIds(selectedProjectIds);
                                setTargetGlobalType('');
                                setIsGlobalProjectAssignDialogOpen(true);
                              }}
                            >
                              <Plus className="w-3.5 h-3.5 mr-2" /> Gán nhanh
                            </Button>

                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-9 rounded-xl text-[11px] font-bold text-red-600 border-red-100 hover:bg-red-50 transition-all px-4"
                              onClick={handleBulkDeleteTypes}
                              disabled={selectedTypeIds.length === 0}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> {`Xóa (${selectedTypeIds.length})`}
                            </Button>

                            <Dialog>
                              <DialogTrigger nativeButton={false} render={
                                <Button 
                                  variant="destructive" 
                                  size="sm" 
                                  className="h-9 rounded-xl text-[11px] font-bold px-4"
                                  disabled={types.length === 0}
                                />
                              }>
                                <AlertTriangle className="w-3.5 h-3.5 mr-2" /> Xóa tất cả
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[400px] rounded-3xl border-none shadow-2xl">
                                <DialogHeader>
                                  <DialogTitle className="text-xl font-black text-slate-900">Xác nhận xóa tất cả?</DialogTitle>
                                  <DialogDescription className="font-medium text-slate-500">Toàn bộ danh sách loại hình sẽ bị xóa vĩnh viễn.</DialogDescription>
                                </DialogHeader>
                                <DialogFooter className="mt-4">
                                  <Button variant="outline" className="rounded-xl h-12 font-bold" onClick={() => {}}>Hủy</Button>
                                  <Button variant="destructive" className="rounded-xl h-12 font-black shadow-lg shadow-red-100" onClick={handleDeleteAllTypes}>Xác nhận Xóa</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="rounded-xl border border-slate-100 overflow-x-auto scroll-hide">
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
                                  const typeProjects = projects.filter(p => (p.type || '').trim() === (t.name || '').trim());
                                  return (
                                    <TableRow key={t.id} className={`group transition-all border-b border-slate-50 ${selectedTypeIds.includes(t.id) ? "bg-indigo-50/20" : "hover:bg-slate-50/30"}`}>
                                      {isAdmin && (
                                        <TableCell className="pl-6 py-4">
                                          <input 
                                            type="checkbox" 
                                            className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
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
                                      <TableCell className="py-4 pl-4">
                                        {editingTypeId === t.id ? (
                                          <Input value={editingTypeName} onChange={e => setEditingTypeName(e.target.value)} className="h-9 px-3 rounded-lg border-indigo-100 bg-indigo-50/30 text-sm font-bold" />
                                        ) : (
                                          <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase italic">{t.name}</span>
                                        )}
                                      </TableCell>
                                      <TableCell className="py-4">
                                        <Badge variant="secondary" className="bg-slate-50 text-slate-600 border-slate-100 font-bold px-3 py-1 rounded-lg">
                                          {typeProjects.length} dự án
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="py-4 text-xs font-medium text-slate-400">
                                        {safeFormat(t.createdAt?.toDate ? t.createdAt.toDate() : new Date(), 'dd/MM/yyyy')}
                                      </TableCell>
                                      <TableCell className="py-4 pr-6 text-right">
                                        {isAdmin && (
                                          <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                            {editingTypeId === t.id ? (
                                              <>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-50 rounded-lg shadow-sm" onClick={() => handleUpdateType(t.id, editingTypeName)}>
                                                  <Check className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:bg-slate-100 rounded-lg" onClick={() => setEditingTypeId(null)}>
                                                  <X className="h-4 w-4" />
                                                </Button>
                                              </>
                                            ) : (
                                              <>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" onClick={() => {
                                                  setTypeForProjects(t);
                                                  setSelectedProjectIdsForType(typeProjects.map(p => p.id));
                                                  setIsSetProjectsForTypeDialogOpen(true);
                                                }} title="Gán dự án">
                                                  <Plus className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" onClick={() => handleMigrateType(t)} title="Chuyển toàn bộ dự án">
                                                  <RefreshCw className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" onClick={() => {
                                                  setEditingTypeId(t.id);
                                                  setEditingTypeName(t.name);
                                                }}>
                                                  <Edit2 className="h-3.5 w-3.5" />
                                                </Button>
                                                <Dialog>
                                                  <DialogTrigger nativeButton={false} render={
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" />
                                                  }>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                  </DialogTrigger>
                                                  <DialogContent className="sm:max-w-[400px] rounded-3xl border-none shadow-2xl">
                                                    <DialogHeader>
                                                      <DialogTitle className="text-xl font-black text-slate-900">Xóa loại hình này?</DialogTitle>
                                                      <DialogDescription className="font-medium text-slate-500">Dự án thuộc loại hình này sẽ về trạng thái 'Chưa xác định'.</DialogDescription>
                                                    </DialogHeader>
                                                    <DialogFooter className="mt-4">
                                                      <Button variant="outline" className="rounded-xl h-12 font-bold" onClick={() => {}}>Hủy</Button>
                                                      <Button variant="destructive" className="rounded-xl h-12 font-black shadow-lg shadow-red-100" onClick={() => handleDeleteType(t.id, t.name)}>Xác nhận Xóa</Button>
                                                    </DialogFooter>
                                                  </DialogContent>
                                                </Dialog>
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
                                  <TableCell colSpan={isAdmin ? 5 : 4} className="h-48 text-center bg-slate-50/50">
                                    <div className="flex flex-col items-center justify-center space-y-4">
                                      <div className="bg-slate-50 p-4 rounded-full border border-slate-100">
                                        <Layers className="h-8 w-8 text-slate-300" />
                                      </div>
                                      <div className="space-y-1">
                                        <p className="font-bold text-slate-900">Chưa có loại hình nào</p>
                                        <p className="text-xs text-slate-500">Hãy thêm loại hình mới để quản lý dự án</p>
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                              <TableRow className="bg-slate-50/30 hover:bg-slate-50/50 transition-colors">
                                {isAdmin && <TableCell className="pl-6" />}
                                <TableCell className="py-4 pl-4 font-bold text-slate-500 italic">
                                  Chưa phân loại
                                </TableCell>
                                <TableCell className="py-4">
                                  <Badge variant="outline" className="font-bold border-red-100 bg-red-50 text-red-600 px-3 py-1 rounded-lg">
                                    {projects.filter(p => !p.type || !(p.type || '').trim()).length} dự án
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-4 text-xs font-medium text-slate-300">-</TableCell>
                                <TableCell className="py-4 pr-6 text-right italic text-[10px] font-bold text-slate-400">Hệ thống</TableCell>
                              </TableRow>
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
                              <DebouncedInput 
                                placeholder="Nhập tên team..." 
                                className="pl-10 bg-slate-50 border-none shadow-none"
                                value={teamSearch}
                                onChange={setTeamSearch}
                              />
                            </div>
                          </div>
                          {isAdmin && (
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                onClick={handleExportTeams}
                              >
                                <Download className="w-4 h-4 mr-2" /> Xuất Excel
                              </Button>
                              <Dialog>
                                <DialogTrigger nativeButton={false} render={
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
                          </div>
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
                                className="h-8 text-[10px] text-blue-600 border-blue-200 hover:bg-blue-50"
                                onClick={handleSyncTeamCodes}
                                disabled={isSyncingTeams}
                              >
                                <RefreshCw className={`w-3 h-3 mr-1 ${isSyncingTeams ? 'animate-spin' : ''}`} /> Đồng bộ Mã Team
                              </Button>
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
                        <div className="rounded-xl border border-slate-100 overflow-x-auto scroll-hide">
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
                                <TableHead className="cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setTeamSort({ key: 'teamCode', direction: teamSort.direction === 'asc' ? 'desc' : 'asc' })}>
                                  <div className="flex items-center gap-2">Mã Team <ArrowUpDown className="w-3 h-3" /></div>
                                </TableHead>
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
                                  <TableCell className="font-mono text-xs font-bold text-indigo-600">
                                    {editingTeamId === t.id ? (
                                      <Input value={editingTeamCode} onChange={e => setEditingTeamCode(e.target.value)} className="h-8 font-mono" />
                                    ) : (t.teamCode || '-')}
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {editingTeamId === t.id ? (
                                      <Input value={editingTeamName} onChange={e => {
                                        setEditingTeamName(e.target.value);
                                        // Auto-extract if code is empty
                                        if (!editingTeamCode) {
                                          setEditingTeamCode(extractTeamCode(e.target.value));
                                        }
                                      }} className="h-8" />
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
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleUpdateTeam(t.id, editingTeamName, editingTeamCode)}>
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
                                               setEditingTeamCode(t.teamCode || extractTeamCode(t.name));
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
                            className="h-8 text-[10px] text-blue-600 border-blue-200 hover:bg-blue-50"
                            onClick={handleSyncBudgetPermissions}
                            disabled={isSyncingBudgetPermissions}
                          >
                            <ShieldCheck className={`w-3 h-3 mr-1 ${isSyncingBudgetPermissions ? 'animate-spin' : ''}`} /> Đồng bộ phân quyền
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-[10px] text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                            onClick={handleMergeDuplicateBudgets}
                            disabled={isMergingBudgets}
                          >
                            <RefreshCw className={`w-3 h-3 mr-1 ${isMergingBudgets ? 'animate-spin' : ''}`} /> Gộp ngân sách trùng
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-[10px] text-amber-600 border-amber-200 hover:bg-amber-50"
                            onClick={() => {
                              const orphans = budgets.filter(b => !projects.find(p => p.id === b.projectId));
                              if (orphans.length === 0) {
                                toast.success("Tất cả ngân sách đều hợp lệ!");
                              } else {
                                const orphanIds = Array.from(new Set(orphans.map(o => o.projectId)));
                                toast.warning(`Tìm thấy ID Dự án không tồn tại!`, { duration: 5000 });
                                setImportErrors(orphanIds.map(id => `Dự án ID "${id}" không tồn tại trong danh sách Dự án (${orphans.filter(o=>o.projectId===id).length} bản ghi)`));
                                setIsImportErrorsDialogOpen(true);
                              }
                            }}
                          >
                            <Target className="w-3 h-3 mr-1" /> Kiểm tra dữ liệu lạc
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-[10px] text-green-600 border-green-200 hover:bg-green-50"
                            onClick={handleExportBudgets}
                          >
                            <Download className="w-3 h-3 mr-1" /> Xuất Excel
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-[10px] text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                            onClick={() => setIsImportBudgetsDialogOpen(true)}
                          >
                            <FileUp className="w-3 h-3 mr-1" /> Nhập File
                          </Button>
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
                            <DebouncedInput 
                              placeholder="Tìm theo dự án, team, người triển khai..." 
                              className="pl-10 bg-white border-none shadow-sm h-10"
                              value={adminBudgetSearch}
                              onChange={setAdminBudgetSearch}
                            />
                          </div>
                          <div className="flex gap-1">
                            <Select 
                              value={adminBudgetMonthFilter ? adminBudgetMonthFilter.split('-')[0] : ''} 
                              onValueChange={(val) => {
                                const current = adminBudgetMonthFilter || format(new Date(), 'yyyy-MM');
                                const [y, m] = current.split('-');
                                setAdminBudgetMonthFilter(`${val}-${m}`);
                              }}
                            >
                              <SelectTrigger className="w-[80px] bg-white border-none shadow-sm h-10 text-[10px] font-bold">
                                <SelectValue placeholder="Năm" />
                              </SelectTrigger>
                              <SelectContent>
                                {[2024, 2025, 2026, 2027, 2028].map(y => (
                                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select 
                              value={adminBudgetMonthFilter ? adminBudgetMonthFilter.split('-')[1] : ''} 
                              onValueChange={(val) => {
                                const current = adminBudgetMonthFilter || format(new Date(), 'yyyy-MM');
                                const [y, m] = current.split('-');
                                setAdminBudgetMonthFilter(`${y}-${val}`);
                              }}
                            >
                              <SelectTrigger className="w-[100px] bg-white border-none shadow-sm h-10 text-[10px] font-bold">
                                <SelectValue placeholder="Tháng" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(m => (
                                  <SelectItem key={m} value={m}>Tháng {m}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-100 overflow-x-auto scroll-hide">
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
                                <TableHead className="text-right">Chi phí NT</TableHead>
                                <TableHead className="text-right">Thao tác</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {adminFilteredBudgets.map(b => (
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
                                  <TableCell className="font-medium">
                                    <div className="flex flex-col gap-0.5">
                                      <span>{projectMap[b.projectId] || b.projectName}</span>
                                      <span className="text-[10px] text-slate-400 font-normal">({projects.find(p => p.id === b.projectId)?.projectCode || ''})</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col gap-0.5">
                                      <span>{teamMap[b.teamId] || b.teamName}</span>
                                      <span className="text-[10px] text-slate-400 font-normal">({teams.find(t => t.id === b.teamId)?.teamCode || ''})</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>{b.implementerName}</TableCell>
                                  <TableCell className="text-xs">{b.month}</TableCell>
                                  <TableCell className="text-right font-mono font-bold">{b.amount.toLocaleString()} đ</TableCell>
                                  <TableCell className="text-right font-mono font-bold text-blue-600">{((b.verifiedAmount || 0)).toLocaleString()} đ</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-slate-400 hover:text-indigo-600"
                                        onClick={() => handleOpenHistory(b, `${b.projectName} - ${b.teamName}`)}
                                        title="Lịch sử thay đổi"
                                      >
                                        <History className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-slate-400 hover:text-blue-600"
                                        onClick={() => handleOpenEditBudget(b)}
                                        title="Sửa ngân sách"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-slate-400 hover:text-red-600"
                                        onClick={() => handleDeleteBudget(b.id, b.projectName)}
                                        title="Xóa ngân sách"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                              {adminFilteredBudgets.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                                    Không tìm thấy ngân sách nào phù hợp
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                            {adminFilteredBudgets.length > 0 && (
                              <TableFooter className="bg-slate-50 font-bold border-t-2 border-slate-200">
                                <TableRow>
                                  <TableCell></TableCell>
                                  <TableCell colSpan={4} className="text-slate-900 uppercase text-[10px] tracking-wider">Tổng cộng</TableCell>
                                  <TableCell className="text-right font-mono text-blue-700">
                                    {adminFilteredBudgets.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()} đ
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-indigo-700">
                                    {adminFilteredBudgets.reduce((acc, curr) => acc + (curr.verifiedAmount || 0), 0).toLocaleString()} đ
                                  </TableCell>
                                  <TableCell></TableCell>
                                </TableRow>
                              </TableFooter>
                            )}

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
                          <CardTitle>Quản lý Chi phí</CardTitle>
                          <CardDescription>Xóa hoặc xem danh sách các bản ghi thực chi</CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-[10px] text-green-600 border-green-200 hover:bg-green-50"
                            onClick={handleExportCosts}
                          >
                            <Download className="w-3 h-3 mr-1" /> Xuất Excel
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-[10px] text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                            onClick={() => setIsImportCostsDialogOpen(true)}
                          >
                            <FileUp className="w-3 h-3 mr-1" /> Nhập File
                          </Button>
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
                            <DebouncedInput 
                              placeholder="Tìm theo dự án, team, người triển khai..." 
                              className="pl-10 bg-white border-none shadow-sm h-10"
                              value={adminCostSearch}
                              onChange={setAdminCostSearch}
                            />
                          </div>
                  <div className="space-y-4">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kỳ báo cáo</Label>
                    <div className="grid grid-cols-2 gap-2">
                       <Select 
                        value={adminCostMonthFilter ? adminCostMonthFilter.split('-')[0] : ''} 
                        onValueChange={(val) => {
                          const current = adminCostMonthFilter || format(new Date(), 'yyyy-MM');
                          const [, m] = current.split('-');
                          setAdminCostMonthFilter(`${val}-${m}`);
                        }}
                      >
                        <SelectTrigger className="bg-white border-none shadow-sm h-10 w-[90px]">
                          <SelectValue placeholder="Năm" />
                        </SelectTrigger>
                        <SelectContent>
                          {[2024, 2025, 2026, 2027, 2028].map(y => (
                            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select 
                        value={adminCostMonthFilter ? adminCostMonthFilter.split('-')[1] : ''} 
                        onValueChange={(val) => {
                          const current = adminCostMonthFilter || format(new Date(), 'yyyy-MM');
                          const [y] = current.split('-');
                          setAdminCostMonthFilter(`${y}-${val}`);
                        }}
                      >
                        <SelectTrigger className="bg-white border-none shadow-sm h-10 w-[110px]">
                          <SelectValue placeholder="Tháng" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(m => (
                            <SelectItem key={m} value={m}>Tháng {m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                        </div>

                        <div className="rounded-xl border border-slate-100 overflow-x-auto scroll-hide">
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
                                <TableHead>Kỳ</TableHead>
                                <TableHead className="text-right">Chi phí</TableHead>
                                <TableHead className="text-right">Thao tác</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {costs
                                .filter(c => {
                                  const matchesSearch = 
                                    (projectMap[c.projectId] || c.projectName || '').toLowerCase().includes(adminCostSearch.toLowerCase()) ||
                                    (teamMap[c.teamId] || c.teamName || '').toLowerCase().includes(adminCostSearch.toLowerCase()) ||
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
                                    <TableCell className="font-medium">{projectMap[c.projectId] || c.projectName}</TableCell>
                                    <TableCell>{teamMap[c.teamId] || c.teamName}</TableCell>
                                    <TableCell>{c.implementerName}</TableCell>
                                    <TableCell className="text-xs">Kỳ {c.weekNumber}</TableCell>
                                    <TableCell className="text-right font-mono font-bold text-blue-600">{c.amount.toLocaleString()} đ</TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-1">
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-8 w-8 text-slate-400 hover:text-indigo-600"
                                          onClick={() => handleOpenHistory(c, `${c.projectName} - ${c.teamName}`)}
                                          title="Lịch sử thay đổi"
                                        >
                                          <History className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-8 w-8 text-slate-400 hover:text-red-600"
                                          onClick={() => handleDeleteCost(c.id, c.projectName)}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
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
                      <CardDescription>Theo dõi hiệu quả sử dụng ngân sách & Hiệu quả kinh doanh thực tế</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                    {/* Alert for Over Budget */}
                    {overBudgetStats.count > 0 && (
                      <div className="mx-6 mt-2 p-5 bg-red-50 border-2 border-red-200 rounded-3xl flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 bg-red-100/20 rounded-full -mr-12 -mt-12 blur-3xl group-hover:bg-red-200/30 transition-colors" />
                        <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center shrink-0 border border-red-200 z-10">
                          <AlertTriangle className="w-6 h-6 text-red-600 animate-pulse" />
                        </div>
                        <div className="flex-1 z-10">
                          <div className="flex items-center justify-between">
                            <h4 className="font-black text-red-900 uppercase tracking-tighter text-sm">Cảnh báo vượt ngân sách ({overBudgetStats.count} mục)</h4>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setIsOverBudgetDetailOpen(true)}
                              className="h-8 rounded-xl border-red-200 bg-white text-red-600 hover:bg-red-600 hover:text-white transition-all font-black text-[10px] uppercase gap-1.5 shadow-sm active:scale-95"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Xem chi tiết
                            </Button>
                          </div>
                          <p className="text-xs text-red-700/80 font-medium leading-relaxed mt-1 pr-0 md:pr-24">
                            Tổng chi phí thực tế đã vượt ngân sách đăng ký của <strong>{overBudgetStats.count}</strong> đơn vị với tổng số tiền vượt là 
                            <span className="font-black ml-1 text-red-800">{formatCurrency(overBudgetStats.totalExcess)}</span>. 
                            Vui lòng kiểm tra lại các mục được đánh dấu màu đỏ dưới bảng.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Filters Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5 p-6 rounded-3xl bg-slate-50/50 border border-slate-200/60 shadow-inner mb-8 overflow-hidden">
                      <div className="space-y-2 min-w-0">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                          <Building2 className="w-3 h-3" /> Dự án
                        </Label>
                        <SearchableProjectSelect 
                          value={reportProject} 
                          onValueChange={setReportProject} 
                          projects={projects} 
                          projectMap={projectMap} 
                        />
                      </div>

                      {isAdmin && (
                        <div className="space-y-2 min-w-0">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                            <Users className="w-3 h-3" /> Đội (Team)
                          </Label>
                          <SearchableTeamSelect 
                            value={reportTeam} 
                            onValueChange={setReportTeam} 
                            teams={teams} 
                            uniqueTeams={uniqueTeams} 
                          />
                        </div>
                      )}

                      <div className="space-y-2 min-w-0">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                          <MapIcon className="w-3 h-3" /> Miền / Vùng
                        </Label>
                        <SearchableRegionSelect
                          value={reportRegion}
                          onValueChange={setReportRegion}
                          regions={uniqueRegions}
                        />
                      </div>

                      <div className="space-y-2 min-w-0">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                          <Layers className="w-3 h-3" /> Loại hình
                        </Label>
                        <SearchableTypeSelect
                          value={reportType}
                          onValueChange={setReportType}
                          types={uniqueTypes}
                        />
                      </div>



                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                          <History className="w-3 h-3" /> Năm
                        </Label>
                        <Select value={reportYear} onValueChange={setReportYear}>
                          <SelectTrigger className="bg-white border-slate-200 shadow-sm transition-all hover:border-blue-300 focus:ring-2 focus:ring-blue-100 h-10">
                            <SelectValue placeholder="Chọn năm" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - 2 + i).toString()).map(y => (
                              <SelectItem key={y} value={y}>Năm {y}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                          <Calendar className="w-3 h-3" /> {reportMonths.length > 1 ? `Đang chọn ${reportMonths.length} tháng` : reportMonths.length === 1 ? getMarketingMonthDisplayRange(reportMonths[0]) : 'Chọn tháng'}
                        </Label>
                        <DropdownMenu>
                          <DropdownMenuTrigger className={cn(buttonVariants({ variant: "outline" }), "w-full bg-white border-slate-200 shadow-sm transition-all hover:border-blue-300 focus:ring-2 focus:ring-blue-100 h-10 justify-between font-medium")}>
                            <span className="truncate">
                              {reportMonths.length === 0 ? "Chọn Tháng" : 
                               reportMonths.length === 1 ? `Tháng ${reportMonths[0].split('-')[1]}` :
                               `Đã chọn ${reportMonths.length} tháng`}
                            </span>
                            <Plus className="w-4 h-4 ml-2 opacity-50" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-56 bg-white rounded-2xl shadow-2xl border-slate-100 p-2 overflow-y-auto max-h-[300px]">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 py-1.5">Chọn nhiều tháng để so sánh</DropdownMenuLabel>
                              <DropdownMenuSeparator className="bg-slate-50" />
                              {Array.from({ length: 12 }, (_, i) => {
                                const m = (i + 1).toString().padStart(2, '0');
                                const year = reportYear || new Date().getFullYear().toString();
                                const monthValue = `${year}-${m}`;
                                const isChecked = reportMonths.includes(monthValue);
                                
                                return (
                                  <DropdownMenuCheckboxItem
                                    key={m}
                                    checked={isChecked}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setReportMonths([...reportMonths, monthValue]);
                                      } else {
                                        setReportMonths(reportMonths.filter(v => v !== monthValue));
                                      }
                                    }}
                                    className="rounded-xl focus:bg-blue-50 focus:text-blue-600 transition-colors cursor-pointer py-2 px-3"
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-bold text-sm">Tháng {m}</span>
                                      <span className="text-[9px] text-slate-400 uppercase font-black">{getMarketingMonthDisplayRange(monthValue)}</span>
                                    </div>
                                  </DropdownMenuCheckboxItem>
                                );
                              })}
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                          <Filter className="w-3 h-3" /> Kỳ báo cáo
                        </Label>
                        <Select value={reportWeek} onValueChange={setReportWeek}>
                          <SelectTrigger className="bg-white border-slate-200 shadow-sm transition-all hover:border-blue-300 focus:ring-2 focus:ring-blue-100 h-10">
                            <SelectValue placeholder="Tất cả kỳ" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tất cả kỳ</SelectItem>
                            <SelectItem value="1">Kỳ 1 ({getPeriodRange(reportMonths[0] || getMarketingMonth(new Date()), '1')})</SelectItem>
                            <SelectItem value="2">Kỳ 2 ({getPeriodRange(reportMonths[0] || getMarketingMonth(new Date()), '2')})</SelectItem>
                            <SelectItem value="3">Kỳ 3 ({getPeriodRange(reportMonths[0] || getMarketingMonth(new Date()), '3')})</SelectItem>
                            <SelectItem value="4">Kỳ 4 ({getPeriodRange(reportMonths[0] || getMarketingMonth(new Date()), '4')})</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                          <ArrowUpDown className="w-3 h-3" /> Sắp xếp theo
                        </Label>
                        <Select value={reportSortBy} onValueChange={(v: 'budget' | 'actual' | 'revenue') => setReportSortBy(v)}>
                          <SelectTrigger className="bg-white border-slate-200 shadow-sm transition-all hover:border-blue-300 focus:ring-2 focus:ring-blue-100 h-10">
                            <SelectValue placeholder="Chọn kiểu sắp xếp" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="budget">Ngân sách (Cao → Thấp)</SelectItem>
                            <SelectItem value="actual">Chi phí thực tế (Cao → Thấp)</SelectItem>
                            <SelectItem value="revenue">Doanh số (Cao → Thấp)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>


                    </div>

                    {/* Summary Cards - Viewable by all but tailored by role */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-6 gap-4 mb-8">
                      {/* 0. Tổng dự án (Admin only) */}
                      {isAdmin && (
                        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col gap-1 transition-all hover:border-blue-200 group">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Tổng dự án</p>
                            <span className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
                              <Building2 className="w-3 h-3 text-blue-500" />
                            </span>
                          </div>
                          <p className="text-lg font-black text-slate-900 leading-none">
                            {projects.length} <span className="text-[9px] font-bold text-slate-400">Dự án</span>
                          </p>
                          <div className="mt-2 h-1 w-full bg-slate-50 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 w-full" />
                          </div>
                        </div>
                      )}

                      {/* 1. Tổng ngân sách */}
                        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col gap-1 transition-all hover:border-blue-200 group">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Tổng ngân sách {chartTimeType === 'week' ? 'kỳ này (Ước tính)' : ''}</p>
                            <span className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
                              <Wallet className="w-3 h-3 text-blue-500" />
                            </span>
                          </div>
                          <p className="text-lg font-black text-slate-900 leading-normal">
                            {(filteredBudgets.reduce((acc, curr) => acc + (curr.amount || 0), 0) / (chartTimeType === 'week' ? 4 : 1)).toLocaleString()} <span className="text-[9px] font-bold text-slate-400">đ</span>
                          </p>
                          <div className="mt-2 h-1 w-full bg-slate-50 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 w-full" />
                          </div>
                        </div>

                        {/* 2. Tổng chi phí thực tế */}
                        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col gap-1 transition-all hover:border-emerald-200 group">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Tổng thực chi</p>
                            <span className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center">
                              <Wallet className="w-3 h-3 text-emerald-500" />
                            </span>
                          </div>
                          <p className="text-lg font-black text-emerald-600 leading-normal">
                            {filteredCosts.reduce((acc, curr) => acc + (curr.amount || 0), 0).toLocaleString()} <span className="text-[9px] font-bold text-slate-400">đ</span>
                          </p>
                          <div className="mt-2 h-1 w-full bg-slate-50 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 w-3/4 opacity-50" />
                          </div>
                        </div>

                        {/* 3. Căn bán (Units) */}
                        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col gap-1 transition-all hover:border-indigo-200 group">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Căn bán (Units)</p>
                            <span className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center">
                              <Building2 className="w-3 h-3 text-indigo-500" />
                            </span>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <p className="text-lg font-black text-slate-900 leading-none">
                              {efficiencyChartData.reduce((acc, curr) => acc + (curr.sales || 0), 0)}
                            </p>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Căn</span>
                          </div>
                          <p className="text-[8px] font-bold text-slate-400 mt-2 italic">Dữ liệu từ hiệu quả kinh doanh</p>
                        </div>

                        {/* 4. Tổng doanh số (Sales) */}
                        <div className="p-5 rounded-2xl bg-indigo-600 border border-indigo-700 shadow-lg shadow-indigo-100 flex flex-col gap-1 transition-all hover:translate-y-[-2px]">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] text-indigo-100 font-black uppercase tracking-widest">Doanh số (Sales)</p>
                            <TrendingUp className="w-3 h-3 text-indigo-200" />
                          </div>
                          <p className="text-lg font-black text-white leading-normal">
                            {efficiencyChartData.reduce((acc, curr) => acc + (curr.revenue || 0), 0).toLocaleString()} <span className="text-[9px] font-bold text-indigo-200">đ</span>
                          </p>
                          <div className="mt-2 text-[9px] font-bold text-indigo-200/80">
                            Hiệu quả doanh thu thực tế
                          </div>
                        </div>


                        {/* 6. Tỉ lệ Thực chi / Ngân sách */}
                        {(() => {
                           const budget = filteredBudgets.reduce((acc, curr) => acc + (curr.amount || 0), 0);
                           const cost = filteredCosts.reduce((acc, curr) => acc + (curr.amount || 0), 0);
                           const usagePercent = budget > 0 ? (cost / budget) * 100 : 0;
                           const variance = usagePercent - 100;
                           
                           return (
                             <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col gap-1 transition-all hover:border-purple-200">
                               <div className="flex items-center justify-between mb-1">
                                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">CP / Ngân sách</p>
                                 <RefreshCw className={`w-3 h-3 ${usagePercent > 100 ? 'text-rose-500' : 'text-purple-500'}`} />
                               </div>
                               <div className="flex items-baseline gap-2">
                                 <p className={`text-lg font-black leading-none ${usagePercent > 100 ? 'text-rose-600' : usagePercent > 90 ? 'text-amber-600' : 'text-slate-900'}`}>{usagePercent.toFixed(1)}%</p>
                                 <span className={`text-[8px] font-bold px-1 rounded-sm ${variance > 0 ? 'bg-rose-50 text-rose-600' : 'bg-green-50 text-green-600'}`}>
                                   {variance > 0 ? '+' : ''}{variance.toFixed(1)}%
                                 </span>
                               </div>
                               <div className="mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                 <div 
                                   className={`h-full transition-all duration-500 ${usagePercent > 100 ? 'bg-rose-500' : usagePercent > 90 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                   style={{ width: `${Math.min(usagePercent, 100)}%` }}
                                 />
                               </div>
                             </div>
                           );
                        })()}

                      </div>

                    {/* Chart Section */}
                    <div className="space-y-4">
                      <Tabs value={activeReportTab} onValueChange={setActiveReportTab} className="w-full">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                          <div className="space-y-1">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Biểu đồ so sánh Chi phí vs Doanh số</Label>
                            <p className="text-[10px] text-slate-400">So sánh dữ liệu theo {chartTimeType === 'month' ? 'Tháng' : 'Kỳ'}</p>
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
                                Theo Kỳ
                              </Button>
                            </div>
                            <TabsList className="bg-slate-100 p-1 h-9 rounded-xl border border-slate-200">
                              <TabsTrigger value="team" className="text-[10px] px-4 h-7 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600">Theo Team</TabsTrigger>
                              <TabsTrigger value="project" className="text-[10px] px-4 h-7 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600">Theo Dự án</TabsTrigger>
                              <TabsTrigger value="region" className="text-[10px] px-4 h-7 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600">Theo Khu vực</TabsTrigger>
                              <TabsTrigger value="channels" className="text-[10px] px-4 h-7 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600">Chi tiết Kênh</TabsTrigger>
                              <TabsTrigger value="efficiency" className="text-[10px] px-4 h-7 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600">Hiệu quả</TabsTrigger>
                              <TabsTrigger value="comparison" className="text-[10px] px-4 h-7 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 font-bold border border-indigo-100">So sánh tháng</TabsTrigger>
                            </TabsList>
                          </div>
                        </div>

                        <TabsContent value="comparison" className="mt-0 space-y-6">
                           <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-6">
                              {reportMonths.length === 0 ? (
                                <div className="h-[400px] flex flex-col items-center justify-center text-center space-y-4">
                                  <div className="w-20 h-20 rounded-[32px] bg-slate-50 flex items-center justify-center border border-slate-100">
                                    <History className="w-10 h-10 text-slate-300" />
                                  </div>
                                  <div className="space-y-1">
                                    <h3 className="font-black text-slate-900 uppercase tracking-tighter">Chưa chọn tháng so sánh</h3>
                                    <p className="text-xs text-slate-500 font-medium max-w-[280px]">Vui lòng chọn ít nhất một tháng ở bộ lọc phía trên để bắt đầu so sánh hiệu quả giữa các tháng.</p>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <GitMerge className="w-3 h-3 text-indigo-500" /> Biểu đồ so sánh hiệu quả giữa các tháng
                                  </Label>
                                  <p className="text-[10px] text-slate-500 font-medium">So sánh <span className="font-bold text-indigo-600">{reportSortBy === 'budget' ? 'Ngân sách' : reportSortBy === 'actual' ? 'Chi phí thực' : 'Doanh số'}</span> của {reportMonths.length} tháng đã chọn</p>
                                </div>
                                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                                   <div className="flex gap-1 group">
                                      {reportMonths.map((m, idx) => (
                                         <div key={m} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-100 shadow-sm">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getChartColor(idx) }} />
                                            <span className="text-[9px] font-black text-slate-600 uppercase">Tháng {m.split('-')[1]}</span>
                                         </div>
                                      ))}
                                   </div>
                                </div>
                              </div>

                              <div className="h-[450px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={comparisonChartData} margin={{ top: 10, right: 30, left: 20, bottom: 60 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis 
                                      dataKey="name" 
                                      axisLine={false} 
                                      tickLine={false} 
                                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} 
                                      interval={0}
                                      angle={-45}
                                      textAnchor="end"
                                      height={60}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} tickFormatter={formatYAxis} />
                                    <ChartTooltip 
                                       content={({ active, payload, label }) => {
                                          if (active && payload && payload.length) {
                                            return (
                                              <div className="bg-white p-4 rounded-2xl shadow-2xl border border-slate-50 min-w-[220px] animate-in fade-in zoom-in duration-200">
                                                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                                                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{label}</p>
                                                </div>
                                                <div className="space-y-2">
                                                  {payload.map((p: any, i: number) => (
                                                     <div key={i} className="flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-1.5">
                                                           <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                                                           <span className="text-[9px] font-bold text-slate-500 uppercase">Tháng {p.name.split('-')[1]}</span>
                                                        </div>
                                                        <span className="text-xs font-black text-slate-900">{formatCurrency(p.value)}</span>
                                                     </div>
                                                  ))}
                                                </div>
                                              </div>
                                            );
                                          }
                                          return null;
                                       }}
                                    />
                                    {reportMonths.map((m, idx) => (
                                       <Line 
                                          key={m}
                                          type="monotone"
                                          dataKey={m}
                                          name={m}
                                          stroke={getChartColor(idx)}
                                          strokeWidth={3}
                                          dot={{ r: 4, fill: getChartColor(idx), strokeWidth: 2, stroke: '#fff' }}
                                          activeDot={{ r: 6, strokeWidth: 0 }}
                                          animationDuration={1500}
                                          animationBegin={idx * 200}
                                       />
                                    ))}
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-50">
                                 <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Mục tiêu so sánh</p>
                                    <div className="flex gap-2">
                                       <Button 
                                          variant={reportSortBy === 'budget' ? 'secondary' : 'ghost'} 
                                          size="sm" 
                                          onClick={() => setReportSortBy('budget')}
                                          className={`h-7 text-[9px] font-black uppercase tracking-tight px-3 rounded-xl ${reportSortBy === 'budget' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'text-slate-400'}`}
                                       >
                                          Ngân sách
                                       </Button>
                                       <Button 
                                          variant={reportSortBy === 'actual' ? 'secondary' : 'ghost'} 
                                          size="sm" 
                                          onClick={() => setReportSortBy('actual')}
                                          className={`h-7 text-[9px] font-black uppercase tracking-tight px-3 rounded-xl ${reportSortBy === 'actual' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'text-slate-400'}`}
                                       >
                                          Chi phí thực
                                       </Button>
                                       <Button 
                                          variant={reportSortBy === 'revenue' ? 'secondary' : 'ghost'} 
                                          size="sm" 
                                          onClick={() => setReportSortBy('revenue')}
                                          className={`h-7 text-[9px] font-black uppercase tracking-tight px-3 rounded-xl ${reportSortBy === 'revenue' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'text-slate-400'}`}
                                       >
                                          Doanh số
                                       </Button>
                                    </div>
                                 </div>
                                 <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Cấp độ so sánh</p>
                                    <div className="flex gap-2">
                                       <Button 
                                          variant={efficiencyGroupType === 'team' ? 'secondary' : 'ghost'} 
                                          size="sm" 
                                          onClick={() => setEfficiencyGroupType('team')}
                                          className={`h-7 text-[9px] font-black uppercase tracking-tight px-3 rounded-xl ${efficiencyGroupType === 'team' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-slate-400'}`}
                                       >
                                          Theo Team
                                       </Button>
                                       <Button 
                                          variant={efficiencyGroupType === 'project' ? 'secondary' : 'ghost'} 
                                          size="sm" 
                                          onClick={() => setEfficiencyGroupType('project')}
                                          className={`h-7 text-[9px] font-black uppercase tracking-tight px-3 rounded-xl ${efficiencyGroupType === 'project' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-slate-400'}`}
                                       >
                                          Theo Dự án
                                       </Button>
                                       <Button 
                                          variant={efficiencyGroupType === 'region' ? 'secondary' : 'ghost'} 
                                          size="sm" 
                                          onClick={() => setEfficiencyGroupType('region')}
                                          className={`h-7 text-[9px] font-black uppercase tracking-tight px-3 rounded-xl ${efficiencyGroupType === 'region' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'text-slate-400'}`}
                                       >
                                          Theo Khu vực
                                       </Button>
                                    </div>
                                 </div>
                                 <div className="p-4 flex items-center justify-center">
                                    <p className="text-[10px] text-slate-400 font-medium italic text-center leading-relaxed">
                                       * Dữ liệu được tổng hợp từ ngân sách, chi phí thực tế và báo cáo kinh doanh của các tháng đã chọn.
                                    </p>
                                 </div>
                              </div>
                            </>
                           )}
                         </div>
                      </TabsContent>

                        <TabsContent value="team" className="mt-0">
                          <div className="h-[450px] w-full bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <ResponsiveContainer width="100%" height="100%">
                              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 40, bottom: 80 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                  dataKey="name" 
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fill: '#64748b', fontSize: 10 }} 
                                  interval={0}
                                  angle={-70}
                                  textAnchor="end"
                                  height={80}
                                  tickFormatter={(val) => {
                                    const code = extractTeamCode(val);
                                    return code || val.split(' ')[0];
                                  }}
                                  dx={-5}
                                />
                                <YAxis 
                                  yAxisId="left"
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fill: '#10b981', fontSize: 12 }} 
                                  tickFormatter={formatYAxis}
                                />
                                <YAxis 
                                  yAxisId="right"
                                  orientation="right"
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fill: '#8b5cf6', fontSize: 12 }} 
                                  tickFormatter={formatYAxis}
                                />
                                <ChartTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                <Legend 
                                  verticalAlign="top" 
                                  align="right" 
                                  iconType="circle" 
                                  wrapperStyle={{ paddingBottom: '30px', fontSize: '12px', fontWeight: 500 }} 
                                />
                                <Line 
                                  yAxisId="left" 
                                  type="monotone" 
                                  dataKey="budget" 
                                  name="Ngân sách" 
                                  stroke="#0ea5e9" 
                                  strokeWidth={2} 
                                  strokeDasharray="5 5" 
                                  dot={{ r: 3, fill: '#0ea5e9' }} 
                                  style={{ cursor: 'pointer' }}
                                  onClick={(data) => {
                                    if (data && data.name) setReportTeam(data.name);
                                  }}
                                />
                                <Bar 
                                  yAxisId="left" 
                                  dataKey="actual" 
                                  name="Chi phí" 
                                  fill="#10b981" 
                                  radius={[6, 6, 0, 0]} 
                                  barSize={32} 
                                  style={{ cursor: 'pointer' }}
                                  onClick={(data) => {
                                    if (data && data.name) setReportTeam(data.name);
                                  }}
                                />
                                <Line 
                                  yAxisId="right" 
                                  type="monotone" 
                                  dataKey="revenue" 
                                  name="Doanh số" 
                                  stroke="#8b5cf6" 
                                  strokeWidth={3} 
                                  dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2 }} 
                                  activeDot={{ r: 6 }} 
                                  style={{ cursor: 'pointer' }}
                                  onClick={(data) => {
                                    if (data && data.name) setReportTeam(data.name);
                                  }}
                                />
                              </ComposedChart>
                            </ResponsiveContainer>
                          </div>
                        </TabsContent>

                        <TabsContent value="project" className="mt-0">
                          <div className="h-[500px] w-full bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <ResponsiveContainer width="100%" height="100%">
                              <ComposedChart data={projectChartData} margin={{ top: 20, right: 30, left: 40, bottom: 100 }}>
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
                                  yAxisId="left"
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fill: '#8b5cf6', fontSize: 12 }} 
                                  tickFormatter={formatYAxis}
                                />
                                <YAxis 
                                  yAxisId="right"
                                  orientation="right"
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fill: '#f59e0b', fontSize: 12 }} 
                                  tickFormatter={formatYAxis}
                                />
                                <ChartTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                <Legend 
                                  verticalAlign="top" 
                                  align="right" 
                                  iconType="circle" 
                                  wrapperStyle={{ paddingBottom: '30px', fontSize: '12px', fontWeight: 500 }} 
                                />
                                <Line 
                                  yAxisId="left" 
                                  type="monotone" 
                                  dataKey="budget" 
                                  name="Ngân sách" 
                                  stroke="#0ea5e9" 
                                  strokeWidth={2} 
                                  strokeDasharray="5 5" 
                                  dot={{ r: 3, fill: '#0ea5e9' }} 
                                  style={{ cursor: 'pointer' }}
                                  onClick={(data) => {
                                    if (data && data.id) setReportProject(data.id);
                                  }}
                                />
                                <Bar 
                                  yAxisId="left" 
                                  dataKey="actual" 
                                  name="Chi phí" 
                                  fill="#8b5cf6" 
                                  radius={[6, 6, 0, 0]} 
                                  barSize={24} 
                                  style={{ cursor: 'pointer' }}
                                  onClick={(data) => {
                                    if (data && data.id) setReportProject(data.id);
                                  }}
                                />
                                <Line 
                                  yAxisId="right" 
                                  type="monotone" 
                                  dataKey="revenue" 
                                  name="Doanh số" 
                                  stroke="#f59e0b" 
                                  strokeWidth={3} 
                                  dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2 }} 
                                  activeDot={{ r: 6 }} 
                                  style={{ cursor: 'pointer' }}
                                  onClick={(data) => {
                                    if (data && data.id) setReportProject(data.id);
                                  }}
                                />
                              </ComposedChart>
                            </ResponsiveContainer>
                          </div>
                        </TabsContent>

                        <TabsContent value="region" className="mt-0">
                          <div className="h-[450px] w-full bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <ResponsiveContainer width="100%" height="100%">
                              <ComposedChart data={regionChartData} margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                  dataKey="name" 
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fill: '#64748b', fontSize: 12 }} 
                                  dy={15}
                                />
                                <YAxis 
                                  yAxisId="left"
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fill: '#ec4899', fontSize: 12 }} 
                                  tickFormatter={formatYAxis}
                                />
                                <YAxis 
                                  yAxisId="right"
                                  orientation="right"
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fill: '#3b82f6', fontSize: 12 }} 
                                  tickFormatter={formatYAxis}
                                />
                                <ChartTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                                <Legend 
                                  verticalAlign="top" 
                                  align="right" 
                                  iconType="circle" 
                                  wrapperStyle={{ paddingBottom: '30px', fontSize: '12px', fontWeight: 500 }} 
                                />
                                <Line 
                                  yAxisId="left" 
                                  type="monotone" 
                                  dataKey="budget" 
                                  name="Ngân sách" 
                                  stroke="#0ea5e9" 
                                  strokeWidth={2} 
                                  strokeDasharray="5 5" 
                                  dot={{ r: 3, fill: '#0ea5e9' }} 
                                  style={{ cursor: 'pointer' }}
                                  onClick={(data) => {
                                    if (data && data.name) setReportRegion(data.name);
                                  }}
                                />
                                <Bar 
                                  yAxisId="left" 
                                  dataKey="actual" 
                                  name="Chi phí" 
                                  fill="#ec4899" 
                                  radius={[6, 6, 0, 0]} 
                                  barSize={32} 
                                  style={{ cursor: 'pointer' }}
                                  onClick={(data) => {
                                    if (data && data.name) setReportRegion(data.name);
                                  }}
                                />
                                <Line 
                                  yAxisId="right" 
                                  type="monotone" 
                                  dataKey="revenue" 
                                  name="Doanh số" 
                                  stroke="#3b82f6" 
                                  strokeWidth={3} 
                                  dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2 }} 
                                  activeDot={{ r: 6 }} 
                                  style={{ cursor: 'pointer' }}
                                  onClick={(data) => {
                                    if (data && data.name) setReportRegion(data.name);
                                  }}
                                />
                              </ComposedChart>
                            </ResponsiveContainer>
                          </div>
                        </TabsContent>

                        <TabsContent value="channels" className="mt-0 space-y-6">
                          <Card className="border-none shadow-sm overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50">
                              <div>
                                <CardTitle className="text-lg font-bold">Báo cáo chi tiết theo Kênh</CardTitle>
                                <CardDescription>Chi tiết chi phí từng kênh cho mỗi dự án và đội triển khai</CardDescription>
                              </div>
                            </CardHeader>
                            <CardContent className="p-0">
                              <div className="overflow-x-auto scroll-hide">
                                <Table>
                                  <TableHeader className="bg-slate-100/80">
                                    <TableRow>
                                      <TableHead className="w-[50px] text-center font-bold text-slate-700">STT</TableHead>
                                      <TableHead className="font-bold text-slate-700 whitespace-nowrap">Team</TableHead>
                                      <TableHead className="font-bold text-slate-700 whitespace-nowrap">Dự án</TableHead>
                                      <TableHead className="text-right font-bold text-indigo-600 whitespace-nowrap">Facebook Ads</TableHead>
                                      <TableHead className="text-right font-bold text-blue-600 whitespace-nowrap">Google Ads</TableHead>
                                      <TableHead className="text-right font-bold text-emerald-600 whitespace-nowrap">Zalo Ads</TableHead>
                                      <TableHead className="text-right font-bold text-amber-600 whitespace-nowrap">Đăng tin</TableHead>
                                      <TableHead className="text-right font-bold text-blue-700 whitespace-nowrap">Visa Công ty</TableHead>
                                      <TableHead className="text-right font-bold text-purple-700 whitespace-nowrap">Digital Agency</TableHead>
                                      <TableHead className="text-right font-bold text-slate-700 whitespace-nowrap">Tổng cộng</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {channelReportData.map((row, idx) => (
                                      <TableRow key={`${row.projectId}-${row.teamName}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                                        <TableCell className="text-center font-mono text-[10px] text-slate-400">{idx + 1}</TableCell>
                                        <TableCell className="font-medium text-slate-600 whitespace-nowrap text-xs">{teamMap[row.teamId] || row.teamName}</TableCell>
                                        <TableCell className="font-medium text-slate-900 whitespace-nowrap uppercase tracking-tight text-xs">{row.projectName}</TableCell>
                                        <TableCell className="text-right font-mono text-xs">{row.fbAds.toLocaleString()} đ</TableCell>
                                        <TableCell className="text-right font-mono text-xs">{row.googleAds.toLocaleString()} đ</TableCell>
                                        <TableCell className="text-right font-mono text-xs">{row.zaloAds.toLocaleString()} đ</TableCell>
                                        <TableCell className="text-right font-mono text-xs">{row.posting.toLocaleString()} đ</TableCell>
                                        <TableCell className="text-right font-mono text-xs font-bold text-blue-600 bg-blue-50/20">{row.visaAmount.toLocaleString()} đ</TableCell>
                                        <TableCell className="text-right font-mono text-xs font-bold text-purple-600 bg-purple-50/20">{row.digitalAmount.toLocaleString()} đ</TableCell>
                                        <TableCell className="text-right font-mono font-bold text-slate-900 text-xs">{row.total.toLocaleString()} đ</TableCell>
                                      </TableRow>
                                    ))}
                                    {channelReportData.length === 0 && (
                                      <TableRow>
                                        <TableCell colSpan={10} className="h-32 text-center text-slate-400 italic">
                                          Không có dữ liệu chi phí cho kỳ này
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                  {channelReportData.length > 0 && (
                                    <TableFooter className="bg-slate-50 font-bold">
                                      <TableRow>
                                        <TableCell colSpan={3} className="uppercase text-[10px] text-slate-600 pl-8">Tổng cộng các kênh:</TableCell>
                                        <TableCell className="text-right font-mono text-[10px]">{channelReportData.reduce((acc, curr) => acc + curr.fbAds, 0).toLocaleString()} đ</TableCell>
                                        <TableCell className="text-right font-mono text-[10px]">{channelReportData.reduce((acc, curr) => acc + curr.googleAds, 0).toLocaleString()} đ</TableCell>
                                        <TableCell className="text-right font-mono text-[10px]">{channelReportData.reduce((acc, curr) => acc + curr.zaloAds, 0).toLocaleString()} đ</TableCell>
                                        <TableCell className="text-right font-mono text-[10px]">{channelReportData.reduce((acc, curr) => acc + curr.posting, 0).toLocaleString()} đ</TableCell>
                                        <TableCell className="text-right font-mono text-[10px] text-blue-700">{channelReportData.reduce((acc, curr) => acc + curr.visaAmount, 0).toLocaleString()} đ</TableCell>
                                        <TableCell className="text-right font-mono text-[10px] text-purple-700">{channelReportData.reduce((acc, curr) => acc + curr.digitalAmount, 0).toLocaleString()} đ</TableCell>
                                        <TableCell className="text-right font-mono text-md text-slate-900 font-black">{channelReportData.reduce((acc, curr) => acc + curr.total, 0).toLocaleString()} đ</TableCell>
                                      </TableRow>
                                    </TableFooter>
                                  )}
                                </Table>
                              </div>
                            </CardContent>
                          </Card>
                        </TabsContent>

                        <TabsContent value="efficiency" className="mt-0 space-y-8">
                          {/* Efficiency Controls */}
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50/80 rounded-2xl border border-slate-200/60 shadow-inner">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Phân nhóm:</span>
                              <div className="flex p-0.5 bg-slate-200/50 rounded-lg">
                                <Button 
                                  variant={efficiencyGroupType === 'team' ? 'secondary' : 'ghost'} 
                                  size="sm" 
                                  onClick={() => setEfficiencyGroupType('team')}
                                  className={`h-7 text-[10px] px-4 rounded-md transition-all ${efficiencyGroupType === 'team' ? 'bg-white shadow-sm text-blue-600 font-bold' : 'text-slate-500'}`}
                                >
                                  Theo Team
                                </Button>
                                <Button 
                                  variant={efficiencyGroupType === 'project' ? 'secondary' : 'ghost'} 
                                  size="sm" 
                                  onClick={() => setEfficiencyGroupType('project')}
                                  className={`h-7 text-[10px] px-4 rounded-md transition-all ${efficiencyGroupType === 'project' ? 'bg-white shadow-sm text-blue-600 font-bold' : 'text-slate-500'}`}
                                >
                                  Theo Dự án
                                </Button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pr-2">
                               <Info className="w-3.5 h-3.5 text-blue-500" />
                               <span className="text-[10px] text-slate-500 font-medium italic">Biểu đồ & bảng sẽ thay đổi theo cách phân nhóm này</span>
                            </div>
                          </div>

                          {/* Summary KPI Cards */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
                              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                                <TrendingUp className="w-12 h-12 text-blue-600" />
                              </div>
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Tổng căn đã bán</p>
                              <div className="flex items-baseline gap-2">
                                <p className="text-2xl font-black text-slate-900 leading-none">
                                  {efficiencyChartData.reduce((acc, curr) => acc + (curr.sales || 0), 0)}
                                </p>
                                <span className="text-xs font-bold text-slate-400">căn</span>
                              </div>
                              <div className="mt-2 text-[10px] text-slate-400 italic">
                                * Tổng số lượng sản phẩm được chốt trong kỳ
                              </div>
                            </div>

                            <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
                              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                                <Wallet className="w-12 h-12 text-emerald-600" />
                              </div>
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Hiệu quả doanh số</p>
                              <p className="text-xl font-black text-emerald-600 leading-normal break-all">
                                {formatCurrency(efficiencyChartData.reduce((acc, curr) => acc + (curr.revenue || 0), 0))}
                              </p>
                              <div className="mt-2 text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> Doanh số thực tế ghi nhận
                              </div>
                            </div>

                            <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
                              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                                <Wallet className="w-12 h-12 text-blue-600" />
                              </div>
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Tổng ngân sách {chartTimeType === 'week' ? 'kỳ này (Ước tính)' : ''}</p>
                              <p className="text-xl font-black text-blue-600 leading-normal break-all">
                                {formatCurrency(efficiencyChartData.reduce((acc, curr) => acc + (curr.budget || 0), 0))}
                              </p>
                              <div className="mt-2 text-[10px] text-blue-500 font-bold">
                                Tổng vốn đầu tư dự kiến
                              </div>
                            </div>

                            <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
                              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                                <BarChart3 className="w-12 h-12 text-amber-600" />
                              </div>
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Cost/Sale (TB)</p>
                              <p className="text-xl font-black text-amber-600 leading-normal break-all">
                                {(() => {
                                  const totalSales = efficiencyChartData.reduce((acc, curr) => acc + (curr.sales || 0), 0);
                                  const totalCost = efficiencyChartData.reduce((acc, curr) => acc + (curr.cost || 0), 0);
                                  return totalSales > 0 ? formatCurrency(Math.round(totalCost / totalSales)) : '0 đ';
                                })()}
                              </p>
                              <div className="mt-2 text-[10px] text-amber-500 font-bold">
                                Chi phí trung bình / 1 căn
                              </div>
                            </div>
                          </div>


                          {/* Charts Grid */}
                          <div className="space-y-12">
                            {/* Distribution Pie Chart */}
                            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-8">
                              <div className="flex-1 space-y-4">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phân bổ chi phí theo hiệu quả doanh số</Label>
                                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                  Biểu đồ thể hiện sự tương quan giữa ngân đầu tư cho các nhóm <span className="text-emerald-600 font-bold border-b-2 border-emerald-100">có kết quả</span> và nhóm <span className="text-red-500 font-bold border-b-2 border-red-100">chưa có kết quả</span>.
                                </p>
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                  {efficiencyPieData.map((d, i) => (
                                    <div key={i} className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                                      <p className="text-[9px] font-black text-slate-400 uppercase">{d.name}</p>
                                      <p className="text-base font-black text-slate-900">{formatCurrency(d.value)}</p>
                                      <p className="text-[9px] font-bold text-slate-400 uppercase">
                                        Chiếm {((d.value / (efficiencyPieData.reduce((a,b) => a+b.value, 0) || 1)) * 100).toFixed(1)}%
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="h-[240px] w-full md:w-[240px]">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie
                                      data={efficiencyPieData}
                                      innerRadius={60}
                                      outerRadius={80}
                                      paddingAngle={8}
                                      dataKey="value"
                                    >
                                      {efficiencyPieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                      ))}
                                    </Pie>
                                    <ChartTooltip 
                                      content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                          const total = efficiencyPieData.reduce((a, b) => a + b.value, 0);
                                          const percent = ((payload[0].value / (total || 1)) * 100).toFixed(1);
                                          return (
                                            <div className="bg-white p-4 rounded-2xl shadow-2xl border border-slate-50 min-w-[200px] animate-in fade-in zoom-in duration-200">
                                              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].payload.color }} />
                                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{payload[0].name}</p>
                                              </div>
                                              <div className="space-y-1">
                                                <p className="text-lg font-black text-slate-900 leading-none">{formatCurrency(payload[0].value)}</p>
                                                <p className="text-[10px] font-bold text-indigo-600 bg-indigo-50 inline-block px-1.5 py-0.5 rounded-md">Chiếm {percent}% tổng thể</p>
                                              </div>
                                            </div>
                                          );
                                        }
                                        return null;
                                      }}
                                    />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                            </div>

                            {/* Sales Generating Entities Chart */}
                            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-6">
                              <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {efficiencyGroupType === 'team' ? 'Các Team phát sinh doanh số' : 'Các Dự án phát sinh doanh số'}
                                  </Label>
                                  <p className="text-[10px] text-emerald-600 font-bold italic">Top các đơn vị có kết quả kinh doanh tốt nhất</p>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-2">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-slate-200" />
                                    <span className="text-[10px] text-slate-500 font-bold uppercase">Ngân sách</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-0.5 bg-emerald-500" />
                                    <span className="text-[10px] text-slate-500 font-bold uppercase">Doanh số</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-red-400" />
                                    <span className="text-[10px] text-slate-500 font-bold uppercase">Chi phí</span>
                                  </div>
                                </div>
                              </div>
                              <div className="h-[400px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <ComposedChart data={salesGeneratingData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis 
                                      dataKey="name" 
                                      axisLine={false} 
                                      tickLine={false} 
                                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                                      dy={10}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} tickFormatter={formatYAxis} />
                                    <ChartTooltip cursor={{ fill: '#f8fafc' }} content={<EfficiencyDetailedTooltip />} />
                                <Bar 
                                  dataKey="budget" 
                                  fill="#e2e8f0" 
                                  radius={[4, 4, 0, 0]} 
                                  barSize={20} 
                                  style={{ cursor: 'pointer' }}
                                  onClick={(data) => {
                                    if (data && data.id) {
                                      if (efficiencyGroupType === 'project') setReportProject(data.id);
                                      else setReportTeam(data.id);
                                    }
                                  }}
                                />
                                <Bar 
                                  dataKey="cost" 
                                  fill="#f87171" 
                                  radius={[4, 4, 0, 0]} 
                                  barSize={20} 
                                  style={{ cursor: 'pointer' }}
                                  onClick={(data) => {
                                    if (data && data.id) {
                                      if (efficiencyGroupType === 'project') setReportProject(data.id);
                                      else setReportTeam(data.id);
                                    }
                                  }}
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="revenue" 
                                  name="Doanh số" 
                                  stroke="#10b981" 
                                  strokeWidth={3} 
                                  dot={{ r: 4, fill: '#10b981', strokeWidth: 2 }} 
                                  activeDot={{ r: 6 }} 
                                  style={{ cursor: 'pointer' }}
                                  onClick={(data) => {
                                    if (data && data.id) {
                                      if (efficiencyGroupType === 'project') setReportProject(data.id);
                                      else setReportTeam(data.id);
                                    }
                                  }}
                                />
                                  </ComposedChart>
                                </ResponsiveContainer>
                              </div>
                            </div>

                            {/* Non-Sales Generating Entities Chart */}
                            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col gap-6">
                              <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {efficiencyGroupType === 'team' ? 'Các Team chưa phát sinh doanh số' : 'Các Dự án chưa phát sinh doanh số'}
                                  </Label>
                                  <p className="text-[10px] text-red-400 font-bold italic">Danh sách cần rà soát lại phương án triển khai</p>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-slate-200" />
                                    <span className="text-[10px] text-slate-500 font-bold uppercase">Ngân sách</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-red-400" />
                                    <span className="text-[10px] text-slate-500 font-bold uppercase">Chi phí</span>
                                  </div>
                                </div>
                              </div>
                              <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={noSalesData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis 
                                      dataKey="name" 
                                      axisLine={false} 
                                      tickLine={false} 
                                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                                      dy={10}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} tickFormatter={formatYAxis} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} content={<EfficiencyDetailedTooltip />} />
                                <Bar 
                                  dataKey="budget" 
                                  fill="#e2e8f0" 
                                  radius={[4, 4, 0, 0]} 
                                  barSize={24} 
                                  style={{ cursor: 'pointer' }}
                                  onClick={(data) => {
                                    if (data && data.id) {
                                      if (efficiencyGroupType === 'project') setReportProject(data.id);
                                      else setReportTeam(data.id);
                                    }
                                  }}
                                />
                                <Bar 
                                  dataKey="cost" 
                                  fill="#f87171" 
                                  radius={[4, 4, 0, 0]} 
                                  barSize={24} 
                                  style={{ cursor: 'pointer' }}
                                  onClick={(data) => {
                                    if (data && data.id) {
                                      if (efficiencyGroupType === 'project') setReportProject(data.id);
                                      else setReportTeam(data.id);
                                    }
                                  }}
                                />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          </div>

                          {/* Split Tables */}
                          <div className="space-y-12 mt-12 pb-12">
                            {/* Table 1: Sales Generating */}
                            <Card className="border-none shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
                              <CardHeader className="pb-4 bg-emerald-50/50 border-b border-emerald-100">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-lg font-black flex items-center gap-2 text-emerald-900">
                                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                                    Bảng chi tiết đơn vị phát sinh doanh số
                                  </CardTitle>
                                  <Badge className="bg-emerald-600 text-white border-none text-[9px] font-black uppercase">
                                    {salesGeneratingData.length} đơn vị
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table className="border-separate border-spacing-0">
                                      <TableHeader className="bg-slate-50/80 sticky top-0 z-10 shadow-sm">
                                        <TableRow className="hover:bg-transparent border-b border-slate-200">
                                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-8 h-12 w-16 text-center border-b border-slate-200 whitespace-nowrap">STT</TableHead>
                                          <TableHead 
                                            className="text-[10px] font-black uppercase tracking-widest text-slate-900 h-12 cursor-pointer hover:bg-slate-100 transition-colors border-b border-slate-200 whitespace-nowrap"
                                            onClick={() => setEfficiencyTableSort(prev => ({ key: 'name', direction: prev.key === 'name' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                                          >
                                            <div className="flex items-center gap-1">
                                              Đối tượng <ArrowUpDown className="w-3 h-3 text-indigo-500" />
                                            </div>
                                          </TableHead>
                                          <TableHead 
                                            className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-right h-12 cursor-pointer hover:bg-slate-100 transition-colors border-b border-slate-200 whitespace-nowrap font-mono"
                                            onClick={() => setEfficiencyTableSort(prev => ({ key: 'budget', direction: prev.key === 'budget' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                                          >
                                            <div className="flex items-center justify-end gap-1">
                                              Ngân sách <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                            </div>
                                          </TableHead>
                                          <TableHead 
                                            className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-right h-12 cursor-pointer hover:bg-slate-100 transition-colors border-b border-slate-200 whitespace-nowrap font-mono"
                                            onClick={() => setEfficiencyTableSort(prev => ({ key: 'cost', direction: prev.key === 'cost' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                                          >
                                            <div className="flex items-center justify-end gap-1">
                                              Chi phí thực <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                            </div>
                                          </TableHead>
                                          <TableHead 
                                            className="text-[10px] font-black uppercase tracking-widest text-emerald-700 text-center h-12 cursor-pointer hover:bg-emerald-50 transition-colors border-b border-emerald-100 whitespace-nowrap bg-emerald-50/20"
                                            onClick={() => setEfficiencyTableSort(prev => ({ key: 'sales', direction: prev.key === 'sales' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                                          >
                                            <div className="flex items-center justify-center gap-1">
                                              Số căn <ArrowUpDown className="w-3 h-3 text-emerald-500" />
                                            </div>
                                          </TableHead>
                                          <TableHead 
                                            className="text-[10px] font-black uppercase tracking-widest text-emerald-700 text-right h-12 cursor-pointer hover:bg-emerald-50 transition-colors border-b border-emerald-100 whitespace-nowrap bg-emerald-50/20"
                                            onClick={() => setEfficiencyTableSort(prev => ({ key: 'revenue', direction: prev.key === 'revenue' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                                          >
                                            <div className="flex items-center justify-end gap-1">
                                              Doanh số <ArrowUpDown className="w-3 h-3 text-emerald-500" />
                                            </div>
                                          </TableHead>
                                          <TableHead 
                                            className="text-[10px] font-black uppercase tracking-widest text-blue-700 text-right pr-8 h-12 cursor-pointer hover:bg-blue-50 transition-colors border-b border-blue-100 whitespace-nowrap bg-blue-50/20"
                                            onClick={() => setEfficiencyTableSort(prev => ({ key: 'roi', direction: prev.key === 'roi' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                                          >
                                            <div className="flex items-center justify-end gap-1">
                                              ROI <ArrowUpDown className="w-3 h-3 text-blue-500" />
                                            </div>
                                          </TableHead>
                                        </TableRow>
                                      </TableHeader>
                                    <TableBody>
                                      {salesGeneratingData.map((item, idx) => {
                                        const roi = item.cost > 0 ? (item.revenue / item.cost).toFixed(2) : '0';
                                        const isOverBudget = item.cost > item.budget;
                                        return (
                                          <TableRow 
                                            key={idx} 
                                            className={`group transition-colors border-b-slate-50 cursor-pointer ${isOverBudget ? 'bg-red-50/40 hover:bg-red-50/60' : 'hover:bg-emerald-50/30'}`}
                                            onClick={() => {
                                              if (efficiencyGroupType === 'project') setReportProject(item.id);
                                              else setReportTeam(item.id);
                                            }}
                                          >
                                            <TableCell className="pl-8 py-4 font-black text-slate-400 text-xs border-r border-slate-50/50 w-16 text-center">{idx + 1}</TableCell>
                                            <TableCell className="py-4">
                                              <div className="flex items-center gap-3 ml-2">
                                                <div>
                                                  <div className="flex items-center gap-2">
                                                    <p className="font-black text-slate-900 transition-colors uppercase tracking-tight text-xs">{item.name}</p>
                                                    {isOverBudget && (
                                                      <TooltipProvider>
                                                        <UITooltip>
                                                          <TooltipTrigger nativeButton={true}>
                                                            <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-bounce" />
                                                          </TooltipTrigger>
                                                          <TooltipContent className="bg-red-600 text-white border-none font-bold text-xs p-2 rounded-xl">
                                                            Vượt ngân sách {formatCurrency(item.cost - item.budget)}
                                                          </TooltipContent>
                                                        </UITooltip>
                                                      </TooltipProvider>
                                                    )}
                                                  </div>
                                                  <p className="text-[10px] text-slate-400 font-medium lowercase">
                                                    {efficiencyGroupType === 'project' ? `${item.details.length} teams tham gia` : `${item.details.length} dự án triển khai`}
                                                  </p>
                                                </div>
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-right py-4 font-bold text-slate-500 font-mono text-[11px]">{formatCurrency(item.budget)}</TableCell>
                                            <TableCell className={`text-right py-4 font-black font-mono text-[11px] ${isOverBudget ? 'text-red-600 scale-110 shadow-sm' : 'text-slate-900 opacity-80'}`}>
                                              {formatCurrency(item.cost)}
                                            </TableCell>
                                            <TableCell className="text-center py-4">
                                              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 font-black border-none px-2 h-5 text-[9px]">
                                                {item.sales} căn
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="text-right py-4 font-black text-emerald-600 font-mono text-[11px]">{formatCurrency(item.revenue)}</TableCell>
                                            <TableCell className="text-right pr-8 py-4">
                                              <div className="text-xs font-black font-mono text-emerald-600">{roi}x</div>
                                              <div className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">Doanh thu/Vốn</div>
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                      {salesGeneratingData.length > 0 && (
                                        <TableFooter className="bg-emerald-50/80 font-black border-t-4 border-emerald-200">
                                          <TableRow className="hover:bg-transparent">
                                            <TableCell colSpan={2} className="pl-8 py-6 uppercase text-xs text-emerald-800 font-bold tracking-widest">TỔNG CỘNG HIỆU QUẢ KINH DOANH:</TableCell>
                                            <TableCell className="text-right py-6 font-black text-slate-500 font-mono text-base">{formatCurrency(salesGeneratingData.reduce((acc, curr) => acc + curr.budget, 0))}</TableCell>
                                            <TableCell className="text-right py-6 font-black font-mono text-base text-red-600">{formatCurrency(salesGeneratingData.reduce((acc, curr) => acc + curr.cost, 0))}</TableCell>
                                            <TableCell className="text-center py-6">
                                              <div className="flex flex-col items-center">
                                                <Badge className="bg-emerald-700 text-white font-black px-4 py-1.5 text-sm shadow-lg ring-2 ring-emerald-100 ring-offset-2">{salesGeneratingData.reduce((acc, curr) => acc + curr.sales, 0)} căn</Badge>
                                                <span className="text-[9px] text-emerald-600 mt-2 font-bold uppercase tracking-tighter">Tổng số căn chốt</span>
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-right py-6 font-black text-emerald-800 font-mono text-base drop-shadow-sm">{formatCurrency(salesGeneratingData.reduce((acc, curr) => acc + curr.revenue, 0))}</TableCell>
                                            <TableCell className="text-right pr-8 py-6">
                                              <div className="text-lg font-black font-mono text-blue-700 italic flex flex-col items-end">
                                                <span>
                                                  {(salesGeneratingData.reduce((acc, curr) => acc + curr.cost, 0) > 0 
                                                    ? (salesGeneratingData.reduce((acc, curr) => acc + curr.revenue, 0) / salesGeneratingData.reduce((acc, curr) => acc + curr.cost, 0)) 
                                                    : 0).toFixed(2)}x
                                                </span>
                                                <span className="text-[8px] text-blue-500 font-bold uppercase tracking-tighter not-italic mt-1">ROI Tổng</span>
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        </TableFooter>
                                      )}
                                  </Table>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Table 2: No Sales */}
                            <Card className="border-none shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
                              <CardHeader className="pb-4 bg-red-50/50 border-b border-red-100">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-lg font-black flex items-center gap-2 text-red-900">
                                    <AlertTriangle className="w-5 h-5 text-red-600" />
                                    Bảng chi tiết đơn vị chưa phát sinh doanh số
                                  </CardTitle>
                                  <Badge className="bg-red-600 text-white border-none text-[9px] font-black uppercase">
                                    {noSalesData.length} đơn vị
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table className="border-separate border-spacing-0">
                                      <TableHeader className="bg-slate-50/80 sticky top-0 z-10 shadow-sm">
                                        <TableRow className="hover:bg-transparent border-b border-slate-200">
                                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-8 h-12 w-16 text-center border-b border-slate-200 whitespace-nowrap">STT</TableHead>
                                          <TableHead 
                                            className="text-[10px] font-black uppercase tracking-widest text-red-900 h-12 cursor-pointer hover:bg-slate-100 transition-colors border-b border-slate-200 whitespace-nowrap"
                                            onClick={() => setEfficiencyTableSort(prev => ({ key: 'name', direction: prev.key === 'name' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                                          >
                                            <div className="flex items-center gap-1">
                                              Đối tượng <ArrowUpDown className="w-3 h-3 text-red-500" />
                                            </div>
                                          </TableHead>
                                          <TableHead 
                                            className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-right h-12 cursor-pointer hover:bg-slate-100 transition-colors border-b border-slate-200 whitespace-nowrap font-mono"
                                            onClick={() => setEfficiencyTableSort(prev => ({ key: 'budget', direction: prev.key === 'budget' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                                          >
                                            <div className="flex items-center justify-end gap-1">
                                              Ngân sách <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                            </div>
                                          </TableHead>
                                          <TableHead 
                                            className="text-[10px] font-black uppercase tracking-widest text-red-700 text-right h-12 cursor-pointer hover:bg-red-50 transition-colors border-b border-red-100 whitespace-nowrap bg-red-50/20"
                                            onClick={() => setEfficiencyTableSort(prev => ({ key: 'cost', direction: prev.key === 'cost' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                                          >
                                            <div className="flex items-center justify-end gap-1">
                                              Thực chi <ArrowUpDown className="w-3 h-3 text-red-500" />
                                            </div>
                                          </TableHead>
                                          <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right pr-8 h-12 border-b border-slate-200">Liên quan</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                    <TableBody>
                                      {noSalesData.map((item, idx) => {
                                        const isOverBudget = item.cost > item.budget;
                                        return (
                                          <TableRow 
                                            key={idx} 
                                            className={`group transition-colors border-b-slate-50 cursor-pointer ${isOverBudget ? 'bg-red-50/50 hover:bg-red-100/40' : 'hover:bg-red-50/30'}`}
                                            onClick={() => {
                                              if (efficiencyGroupType === 'project') setReportProject(item.id);
                                              else setReportTeam(item.id);
                                            }}
                                          >
                                            <TableCell className="pl-8 py-4 font-black text-slate-400 text-xs border-r border-slate-100/50 w-16 text-center">{idx + 1}</TableCell>
                                            <TableCell className="py-4">
                                              <div className="flex items-center gap-3 ml-2">
                                                <div>
                                                  <div className="flex items-center gap-2">
                                                    <p className="font-black text-slate-900 transition-colors uppercase tracking-tight text-xs">{item.name}</p>
                                                    {isOverBudget && (
                                                      <TooltipProvider>
                                                        <UITooltip>
                                                          <TooltipTrigger nativeButton={true}>
                                                            <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-bounce" />
                                                          </TooltipTrigger>
                                                          <TooltipContent className="bg-red-600 text-white border-none font-bold text-xs p-2 rounded-xl">
                                                            Vượt ngân sách {formatCurrency(item.cost - item.budget)}
                                                          </TooltipContent>
                                                        </UITooltip>
                                                      </TooltipProvider>
                                                    )}
                                                  </div>
                                                  <p className="text-[10px] text-slate-400 font-medium">Chưa ghi nhận doanh số</p>
                                                </div>
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-right py-4 font-bold text-slate-500 font-mono text-[11px]">{formatCurrency(item.budget)}</TableCell>
                                            <TableCell className={`text-right py-4 font-black font-mono text-[11px] ${isOverBudget ? 'text-red-700 scale-110' : 'text-red-600/60 font-medium'}`}>{formatCurrency(item.cost)}</TableCell>
                                          <TableCell className="text-right pr-8 py-4">
                                            <Badge variant="outline" className="text-[9px] font-bold text-slate-500">
                                              {item.details.length} {efficiencyGroupType === 'project' ? 'đội tham gia' : 'dự án triển khai'}
                                            </Badge>
                                          </TableCell>
                                        </TableRow>
                                        );
                                      })}
                                      {noSalesData.length === 0 && (
                                        <TableRow>
                                          <TableCell colSpan={4} className="h-24 text-center text-slate-400 italic text-[10px]">
                                            Tất cả các đơn vị đều đã phát sinh doanh số
                                          </TableCell>
                                        </TableRow>
                                      )}
                                    </TableBody>
                                    {noSalesData.length > 0 && (
                                      <TableFooter className="bg-red-50/50 font-black border-t-2 border-red-100">
                                        <TableRow className="hover:bg-transparent">
                                          <TableCell colSpan={2} className="pl-8 py-5 uppercase text-[10px] text-red-700 tracking-widest font-black">TỔNG CỘNG CHƯA PHÁT SINH:</TableCell>
                                          <TableCell className="text-right py-5 font-black text-slate-500 font-mono text-sm">{formatCurrency(noSalesData.reduce((acc, curr) => acc + curr.budget, 0))}</TableCell>
                                          <TableCell className="text-right py-5 font-black font-mono text-sm text-red-600">{formatCurrency(noSalesData.reduce((acc, curr) => acc + curr.cost, 0))}</TableCell>
                                          <TableCell colSpan={1} className="pr-8 text-right py-5">
                                            <div className="flex flex-col items-end">
                                              <Badge variant="outline" className="text-[10px] font-black text-red-700 border-red-200 bg-white shadow-sm">
                                                {noSalesData.length} Đơn vị
                                              </Badge>
                                              <span className="text-[8px] text-slate-400 mt-1 uppercase">Chưa doanh số</span>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      </TableFooter>
                                    )}
                                  </Table>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>


                    <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-slate-500 uppercase">Chi tiết ngân sách đăng ký</Label>
                      {isAdmin && (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-[10px] text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                            onClick={() => setIsRestoreBudgetsDialogOpen(true)}
                            disabled={isRestoringData}
                          >
                            {isRestoringData ? (
                              <div className="animate-spin h-3 w-3 border-2 border-indigo-600 border-t-transparent rounded-full mr-2" />
                            ) : (
                              <History className="w-3 h-3 mr-1" />
                            )}
                            Khôi phục từ Nhật ký
                          </Button>
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
                    <div className="rounded-xl border border-slate-100 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px] text-center">STT</TableHead>
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
                            <TableHead 
                              className="cursor-pointer hover:bg-slate-50 transition-colors"
                              onClick={() => setBudgetReportSort(prev => ({ key: 'team', direction: prev.key === 'team' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                            >
                              <div className="flex items-center gap-1">
                                Đội <ArrowUpDown className="w-3 h-3 text-slate-400" />
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-slate-50 transition-colors"
                              onClick={() => setBudgetReportSort(prev => ({ key: 'implementer', direction: prev.key === 'implementer' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                            >
                              <div className="flex items-center gap-1">
                                Người triển khai <ArrowUpDown className="w-3 h-3 text-slate-400" />
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-slate-50 transition-colors"
                              onClick={() => setBudgetReportSort(prev => ({ key: 'project', direction: prev.key === 'project' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                            >
                              <div className="flex items-center gap-1">
                                Dự án <ArrowUpDown className="w-3 h-3 text-slate-400" />
                              </div>
                            </TableHead>
                            <TableHead 
                              className="text-right cursor-pointer hover:bg-slate-50 transition-colors"
                              onClick={() => setBudgetReportSort(prev => ({ key: 'amount', direction: prev.key === 'amount' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                            >
                              <div className="flex items-center justify-end gap-1">
                                Ngân sách <ArrowUpDown className="w-3 h-3 text-slate-400" />
                              </div>
                            </TableHead>
                            <TableHead>Người đăng ký</TableHead>
                            {isAdmin && <TableHead className="text-right">Thao tác</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredBudgets.map((b, idx) => (
                            <TableRow key={b.id} className={selectedBudgetIds.includes(b.id) ? "bg-blue-50/30" : ""}>
                              <TableCell className="text-center font-mono text-[10px] text-slate-400">{idx + 1}</TableCell>
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
                               <TableCell className="font-medium text-xs">{teamMap[b.teamId] || b.teamName}</TableCell>
                              <TableCell className="text-xs">{b.implementerName}</TableCell>
                              <TableCell className="text-xs">{projectMap[b.projectId] || b.projectName || 'N/A'}</TableCell>
                              <TableCell className="text-right font-mono text-xs font-bold">{b.amount.toLocaleString()} đ</TableCell>
                              <TableCell className="text-[10px] text-slate-500">{b.userEmail}</TableCell>
                              {isAdmin && (
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button 
                                      size="icon" 
                                      variant="ghost" 
                                      className="h-7 w-7 text-slate-400 hover:text-blue-600" 
                                      onClick={() => handleOpenEditBudget(b)}
                                      title="Sửa ngân sách"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button 
                                      size="icon" 
                                      variant="ghost" 
                                      className="h-7 w-7 text-slate-400 hover:text-red-600" 
                                      onClick={() => handleDeleteBudget(b.id, b.projectName)}
                                      title="Xóa ngân sách"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                          {filteredBudgets.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={isAdmin ? 8 : 6} className="text-center py-8 text-slate-400">Không tìm thấy dữ liệu phù hợp</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                        {filteredBudgets.length > 0 && (
                          <TableFooter className="bg-slate-100/80 font-black border-t-2 border-slate-200">
                            <TableRow>
                              <TableCell colSpan={isAdmin ? 5 : 4} className="text-right py-4 text-slate-500 uppercase text-[10px] tracking-widest font-black">
                                TỔNG CỘNG NGÂN SÁCH ĐĂNG KÝ {chartTimeType === 'week' ? '(ƯỚC TÍNH THEO KỲ)' : '(THÁNG)'}:
                              </TableCell>
                              <TableCell className="text-right py-4 font-black font-mono text-[13px] text-indigo-700">
                                {formatCurrency(filteredBudgets.reduce((acc, curr) => acc + (curr.amount || 0), 0) / (chartTimeType === 'week' ? 4 : 1))}
                              </TableCell>
                              <TableCell colSpan={isAdmin ? 2 : 1}></TableCell>
                            </TableRow>
                          </TableFooter>
                        )}
                      </Table>
                    </div>
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
                        <DebouncedInput 
                          placeholder="Tìm người dùng..." 
                          className="pl-10 h-9"
                          value={userSearch}
                          onChange={setUserSearch}
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
                                        <DialogTrigger nativeButton={true} render={<Button variant="outline" size="sm" className="h-7 text-[10px] px-2" />}>
                                          Gán dự án ({u.assignedProjects?.length || 0})
                                        </DialogTrigger>
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
                                  <div className="flex justify-end gap-1">
                                    <Button 
                                      size="icon" 
                                      variant="ghost" 
                                      className="h-8 w-8 text-slate-400 hover:text-indigo-600"
                                      onClick={() => {
                                        setActiveTab('admin');
                                        setAdminSubTab('audit');
                                        setLogUserFilter(u.email);
                                        setLogSearch('');
                                      }}
                                      title="Xem nhật ký hoạt động"
                                    >
                                      <History className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-slate-400 hover:text-red-600"
                                    onClick={() => handleDeleteUser(u.id, u.email)}
                                    disabled={u.email === 'thienvu1108@gmail.com'}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
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

              {(isAdmin || isMod) && (
                <>
                  {/* Tab Nghiệm thu */}
                  <TabsContent value="acceptance" className="space-y-6">
                    <AcceptanceManager 
                      isAdmin={isAdmin}
                      isSuperAdmin={isSuperAdmin}
                      isMod={isMod}
                      user={user}
                      teams={teams}
                      projects={projects}
                      acceptances={acceptances}
                      finalAcceptances={finalAcceptances}
                      teamMap={teamMap}
                      projectMap={projectMap}
                      formatCurrency={formatCurrency}
                      getMarketingMonth={getMarketingMonth}
                      handleFirestoreError={handleFirestoreError}
                      formatCurrencyInput={formatCurrencyInput}
                    />
                  </TabsContent>

                <TabsContent value="audit" className="space-y-6">
                  <Card className="border-none shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-xl font-black text-slate-900">Nhật ký hệ thống</CardTitle>
                        <CardDescription className="text-slate-500 font-medium font-inter flex items-center gap-2">
                          Theo dõi chi tiết các thay đổi dữ liệu và lịch sử hoạt động
                          <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[9px] h-4">Tự động đồng bộ lên Sheets</Badge>
                        </CardDescription>
                      </div>
                      <div className="flex gap-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-10 text-[10px] font-bold text-emerald-700 bg-emerald-50 border-emerald-100 hover:bg-emerald-100 rounded-xl"
                          onClick={() => handleCreateCheckpoint('Điểm khôi phục thủ công')}
                          disabled={isBackingUp}
                        >
                          <History className="w-3 h-3 mr-1.5" />
                          Tạo điểm khôi phục
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-10 text-[10px] font-bold text-indigo-700 bg-indigo-50 border-indigo-100 hover:bg-indigo-100 rounded-xl"
                          onClick={handleSyncAllLogs}
                          disabled={isSyncingLogs || auditLogs.length === 0}
                        >
                          {isSyncingLogs ? (
                            <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
                          ) : (
                            <FileSpreadsheet className="w-3 h-3 mr-1.5" />
                          )}
                          Đồng bộ toàn bộ Nhật ký
                        </Button>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <DebouncedInput 
                            placeholder="Tìm Email, ID, Collection..." 
                            className="pl-10 h-10 w-[250px] bg-slate-50 border-none rounded-xl"
                            value={logSearch}
                            onChange={setLogSearch}
                          />
                        </div>
                        <Select value={logUserFilter} onValueChange={setLogUserFilter}>
                          <SelectTrigger className="h-10 w-[200px] bg-slate-50 border-none rounded-xl">
                            <SelectValue placeholder="Người thực hiện" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tất cả người dùng</SelectItem>
                            {uniqueLogUsers.map(email => (
                              <SelectItem key={email} value={email}>{email}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={logTypeFilter} onValueChange={setLogTypeFilter}>
                          <SelectTrigger className="h-10 w-[150px] bg-slate-50 border-none rounded-xl">
                            <SelectValue placeholder="Loại bộ lọc" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tất cả hành động</SelectItem>
                            <SelectItem value="WRITE">Tạo & Cập nhật</SelectItem>
                            <SelectItem value="DELETE">Xóa dữ liệu</SelectItem>
                            <SelectItem value="SYSTEM">Hệ thống</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="max-h-[700px] overflow-y-auto px-6 py-4 space-y-3 custom-scrollbar">
                        {filteredLogs.slice(0, logLimit).map(log => (
                          <div key={log.id} className="group relative flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-100 hover:border-indigo-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                            <div className="mt-1 shrink-0">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                log.action === 'CREATE' ? 'bg-emerald-50 text-emerald-600' : 
                                log.action === 'DELETE' || log.action?.startsWith('DELETE_') ? 'bg-red-50 text-red-600' : 
                                log.action === 'UPDATE' ? 'bg-blue-50 text-blue-600' :
                                log.action === 'SYSTEM_CHECKPOINT' ? 'bg-amber-50 text-amber-600' :
                                'bg-slate-50 text-slate-600'
                              }`}>
                                {log.action === 'CREATE' ? <Plus className="w-5 h-5" /> : 
                                 log.action === 'DELETE' ? <Trash2 className="w-5 h-5" /> : 
                                 log.action === 'UPDATE' ? <Edit2 className="w-5 h-5" /> : 
                                 log.action === 'DELETE_ALL' ? <AlertTriangle className="w-5 h-5" /> :
                                 log.action === 'IMPORT_BUDGETS' ? <FileUp className="w-5 h-5" /> :
                                 log.action === 'SYSTEM_CHECKPOINT' ? <History className="w-5 h-5" /> :
                                 log.action === 'DEEP_SYSTEM_RESTORE' ? <RefreshCw className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                              </div>
                            </div>
                            <div className="flex-1 space-y-3 min-w-0">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="space-y-0.5">
                                  <Badge className={`text-[9px] font-black border-none uppercase h-4 px-1.5 mb-1 ${
                                    log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700' : 
                                    log.action === 'DELETE' || log.action?.startsWith('DELETE_') ? 'bg-red-100 text-red-700' : 
                                    log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                                    log.action === 'SYSTEM_CHECKPOINT' ? 'bg-amber-100 text-amber-700' :
                                    'bg-slate-100 text-slate-700'
                                  }`}>
                                    {log.action === 'CREATE' ? 'Thêm mới' : 
                                     log.action === 'DELETE' ? 'XÓA' : 
                                     log.action === 'UPDATE' ? 'Cập nhật' : 
                                     log.action === 'DELETE_ALL' ? 'XÓA TOÀN BỘ' :
                                     log.action === 'IMPORT_BUDGETS' ? 'NHẬP EXCEL' :
                                     log.action === 'SYSTEM_CHECKPOINT' ? 'PHIÊN BẢN' :
                                     log.action === 'DEEP_SYSTEM_RESTORE' ? 'KHÔI PHỤC' : log.action}
                                  </Badge>
                                  <p className="text-sm font-bold text-slate-900 truncate flex items-center gap-2">
                                    <span className="text-indigo-600 font-black">{log.userEmail || 'Hệ thống'}</span> 
                                    <span className="text-slate-400 font-medium">đã {
                                      log.action === 'CREATE' ? 'tạo mới' : 
                                      log.action === 'DELETE' ? 'xóa' : 
                                      log.action === 'UPDATE' ? 'chỉnh sửa' : 'thực hiện'
                                    } trong</span>
                                    <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg text-xs">{log.collection}</span>
                                  </p>
                                </div>
                                <span className="text-[11px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 italic">
                                  {log.timestamp?.toDate ? safeFormat(log.timestamp.toDate(), 'HH:mm:ss dd/MM/yyyy') : '...'}
                                </span>
                              </div>
                              
                              <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100/50 text-xs flex justify-between items-start group/data shadow-inner">
                                <div className="flex-1 overflow-hidden">
                                  <RenderLogData data={log.data} action={log.action} />
                                </div>
                                {log.action === 'SYSTEM_CHECKPOINT' && (
                                  <Button 
                                    size="sm" 
                                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black h-8 px-4 rounded-xl ml-4 shadow-lg shadow-indigo-200"
                                    onClick={() => {
                                      setSelectedCheckpoint(log);
                                      setIsRestoreCheckpointDialogOpen(true);
                                    }}
                                  >
                                    Khôi phục về đây
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {filteredLogs.length > logLimit && (
                          <div className="py-6 flex justify-center">
                            <Button 
                              variant="ghost" 
                              className="text-indigo-600 font-bold hover:bg-indigo-50"
                              onClick={() => setLogLimit(prev => prev + 50)}
                            >
                              Xem thêm nhật ký ({filteredLogs.length - logLimit} còn lại)
                            </Button>
                          </div>
                        )}

                        {filteredLogs.length === 0 && (
                          <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                            <History className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Không tìm thấy lịch sử phù hợp</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </>
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
                        <div className="flex flex-wrap gap-3">
                          <Button 
                            onClick={syncFullSystem} 
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
                                <BarChart3 className="w-4 h-4 mr-2" /> Sao lưu dữ liệu (Sync All)
                              </>
                            )}
                          </Button>
                          <a 
                            href={GOOGLE_SHEET_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all border border-green-600 text-green-700 hover:bg-green-50 h-10 px-4 py-2"
                          >
                            <FileSpreadsheet className="w-4 h-4 mr-2" /> Mở Google Sheet đồng bộ
                          </a>
                          <Button 
                            variant="outline"
                            onClick={() => setIsRestoreAllDialogOpen(true)}
                            className="border-indigo-600 text-indigo-700 hover:bg-indigo-50"
                          >
                            <History className="w-4 h-4 mr-2" /> Khôi phục toàn bộ (Deep Scan)
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}

                {/* System Settings Tab */}
                <TabsContent value="settings" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-none shadow-sm overflow-hidden">
                      <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-500 w-full" />
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-50 rounded-lg">
                            <Clock className="w-5 h-5 text-amber-600" />
                          </div>
                          <div>
                            <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Cài đặt Thời gian Đăng ký</CardTitle>
                            <CardDescription className="text-xs font-medium text-slate-500">Quy định khung thời gian user được phép đăng ký & chỉnh sửa ngân sách hàng tháng</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-3">
                          <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                          <div className="text-xs text-indigo-700 leading-relaxed font-medium">
                            <p className="font-bold mb-1 underline">Cơ chế hoạt động:</p>
                            <ul className="list-disc list-inside space-y-1">
                              <li>Users chỉ có thể <b>Đăng ký</b> hoặc <b>Chỉnh sửa</b> ngân sách trong khoảng từ ngày <b>Bắt đầu</b> đến ngày <b>Kết thúc</b> của mỗi tháng.</li>
                              <li>Ngoài khoảng thời gian này, các tính năng thêm/sửa ngân sách sẽ bị khóa.</li>
                              <li><b>Admin</b> và các tài khoản được chỉ định vẫn có quyền chỉnh sửa bất cứ lúc nào.</li>
                            </ul>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Ngày Bắt đầu</Label>
                            <div className="relative">
                              <Input 
                                type="number" 
                                min="1" 
                                max="31" 
                                value={adminBudgetStartDay} 
                                onChange={(e) => setAdminBudgetStartDay(e.target.value)}
                                className="bg-slate-50 border-slate-200 h-12 text-center text-lg font-black text-indigo-600 focus:ring-amber-500 rounded-xl"
                              />
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Ngày</span>
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium italic">* Thường là ngày 01 đầu tháng</p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Ngày Kết thúc</Label>
                            <div className="relative">
                              <Input 
                                type="number" 
                                min="1" 
                                max="31" 
                                value={adminBudgetEndDay} 
                                onChange={(e) => setAdminBudgetEndDay(e.target.value)}
                                className="bg-slate-50 border-slate-200 h-12 text-center text-lg font-black text-rose-600 focus:ring-amber-500 rounded-xl"
                              />
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Ngày</span>
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium italic">* VD: Ngày 10 hàng tháng</p>
                          </div>
                        </div>

                        <div className="pt-4">
                          <Button 
                            onClick={handleSaveSystemSettings}
                            className="w-full bg-slate-900 hover:bg-black text-white h-12 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-slate-200 transition-all hover:scale-[1.01]"
                          >
                            <Save className="w-4 h-4" /> Lưu cấu hình hệ thống
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm overflow-hidden bg-slate-50/50">
                      <CardHeader>
                        <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-indigo-500" />
                          Trạng thái Hiện tại
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                          <span className="text-sm font-medium text-slate-600">Trạng thái đăng ký:</span>
                          {isWithinRegistrationWindow() ? (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-3 py-1 rounded-full font-bold flex items-center gap-1">
                              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                              ĐANG MỞ
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none px-3 py-1 rounded-full font-bold flex items-center gap-1">
                              <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                              ĐÃ KHÓA
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Người có quyền ghi đè (Override)</h4>
                          <div className="space-y-2">
                            <div className="p-3 bg-white rounded-xl border border-slate-100 flex items-center gap-3">
                              <UserCircle className="w-8 h-8 text-indigo-400" />
                              <div>
                                <p className="text-sm font-bold text-slate-800">Administrator</p>
                                <p className="text-[10px] text-slate-400 font-medium">Toàn bộ Admin & Super Admin</p>
                              </div>
                            </div>
                            <div className="p-3 bg-white rounded-xl border border-slate-100 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">TV</div>
                              <div>
                                <p className="text-sm font-bold text-slate-800">thienvu1108@gmail.com</p>
                                <p className="text-[10px] text-slate-400 font-medium">Tài khoản hệ thống (Hardcoded)</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Checkpoint Restore Dialog */}
                <Dialog open={isRestoreCheckpointDialogOpen} onOpenChange={setIsRestoreCheckpointDialogOpen}>
                  <DialogContent className="sm:max-w-md bg-white border-none shadow-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-indigo-900 text-xl font-black">
                        <History className="w-6 h-6 text-indigo-600" />
                        Khôi phục phiên bản?
                      </DialogTitle>
                      <DialogDescription className="text-slate-500 font-medium py-2">
                        Bạn đang chọn khôi phục toàn bộ hệ thống về trạng thái tại thời điểm: 
                        <span className="block font-bold text-indigo-600 mt-1">
                          {selectedCheckpoint?.timestamp?.toDate ? safeFormat(selectedCheckpoint.timestamp.toDate(), 'HH:mm:ss dd/MM/yyyy') : '...'}
                        </span>
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800 space-y-2">
                      <div className="flex items-center gap-2 font-bold mb-1">
                        <AlertTriangle className="w-4 h-4" /> Lưu ý quan trọng
                      </div>
                      <p>Hành động này sẽ cập nhật/ghi đè các bản ghi hiện tại bằng dữ liệu từ bản sao lưu này. Các thay đổi sau thời điểm này sẽ được giữ lại nếu không bị trùng ID.</p>
                      <p className="font-bold">Quy mô khôi phục dự kiến:</p>
                      <ul className="list-disc list-inside ml-2">
                        <li>{selectedCheckpoint?.data?.counts?.projects || 0} Dự án</li>
                        <li>{selectedCheckpoint?.data?.counts?.budgets || 0} Ngân sách</li>
                        <li>{selectedCheckpoint?.data?.counts?.costs || 0} Chi phí thực tế</li>
                      </ul>
                    </div>

                    <DialogFooter className="gap-3 mt-4">
                      <Button variant="ghost" onClick={() => setIsRestoreCheckpointDialogOpen(false)} className="rounded-xl font-bold">Hủy bỏ</Button>
                      <Button 
                        onClick={() => handleRestoreCheckpoint(selectedCheckpoint)}
                        disabled={isRestoringData}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl px-6"
                      >
                        {isRestoringData ? 'Đang xử lý...' : 'Xác nhận khôi phục'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Restore Budgets Dialog */}
                <Dialog open={isRestoreBudgetsDialogOpen} onOpenChange={setIsRestoreBudgetsDialogOpen}>
                  <DialogContent className="sm:max-w-2xl bg-white border-none shadow-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-indigo-900 text-xl font-black">
                        <History className="w-6 h-6 text-indigo-600" />
                        Khôi phục Ngân sách từ Nhật ký
                      </DialogTitle>
                      <DialogDescription className="text-slate-500 font-medium">
                        Hệ thống sẽ tái hiện lại dữ liệu từ các bản ghi hoạt động. Vui lòng chọn mốc thời điểm hoặc sự kiện xóa.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="max-h-[450px] overflow-y-auto space-y-3 py-4 pr-2 custom-scrollbar">
                      <div 
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer group ${!selectedLogForRestore ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-100' : 'border-slate-100 bg-white hover:border-indigo-200 hover:bg-slate-50'}`}
                        onClick={() => setSelectedLogForRestore(null)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-black text-slate-900 text-sm block">Toàn bộ dữ liệu từ Nhật ký (Replay All)</span>
                            <p className="text-[10px] text-slate-500 mt-1 font-medium italic">Khôi phục tất cả các bản ghi tìm thấy trong lịch sử hoạt động từ trước đến nay.</p>
                          </div>
                          {!selectedLogForRestore && <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                        </div>
                      </div>

                      <div className="py-2">
                        <div className="h-px bg-slate-100 w-full flex items-center justify-center">
                          <span className="bg-white px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Các mốc sự kiện quan trọng</span>
                        </div>
                      </div>

                      {auditLogs
                        .filter(log => (log.collection === 'budgets' || log.collection === 'nganSach') && (log.action === 'DELETE_ALL' || log.action === 'DELETE_BULK' || log.action === 'IMPORT_BUDGETS' || log.action === 'RESTORE_BUDGETS'))
                        .slice(0, 15)
                        .map(log => (
                        <div 
                          key={log.id}
                          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer group ${selectedLogForRestore?.id === log.id ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-100' : 'border-slate-100 bg-white hover:border-indigo-200 hover:bg-slate-50'}`}
                          onClick={() => setSelectedLogForRestore(log)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge className={`text-[9px] font-black border-none uppercase ${
                                  log.action === 'DELETE_ALL' ? 'bg-red-100 text-red-700' : 
                                  log.action === 'IMPORT_BUDGETS' ? 'bg-emerald-100 text-emerald-700' : 
                                  'bg-indigo-100 text-indigo-700'
                                }`}>
                                  {log.action === 'DELETE_ALL' ? 'Xóa tất cả' : log.action === 'DELETE_BULK' ? 'Xóa nhiều' : log.action === 'IMPORT_BUDGETS' ? 'Dữ liệu Nhập' : 'Khôi phục'}
                                </Badge>
                                <span className="text-[11px] font-black text-slate-900">{log.timestamp?.toDate ? format(log.timestamp.toDate(), 'HH:mm dd/MM/yyyy') : ''}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 font-medium">
                                <span className="font-bold text-slate-700">{log.userEmail}</span> | 
                                Quy mô: <span className="font-bold text-indigo-600">{log.data?.count || log.data?.snapshot?.length || 'N/A'} bản ghi</span>
                              </p>
                              {log.data?.snapshot && (
                                <div className="mt-2 flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full w-fit">
                                  <ShieldCheck className="w-3 h-3" /> Chứa Bản Sao (Snapshot An toàn)
                                </div>
                              )}
                            </div>
                            {selectedLogForRestore?.id === log.id && <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-white" /></div>}
                          </div>
                        </div>
                      ))}
                    </div>

                    <DialogFooter className="gap-3 mt-6 border-t pt-4">
                      <Button variant="ghost" onClick={() => setIsRestoreBudgetsDialogOpen(false)} className="rounded-xl font-bold text-slate-500">Hủy bỏ</Button>
                      <Button 
                        disabled={isRestoringData}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black px-6 shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5"
                        onClick={() => handleRestoreBudgetsFromLogs(selectedLogForRestore)}
                      >
                        {isRestoringData ? (
                          <>
                            <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                            Đang xử lý khôi phục...
                          </>
                        ) : (
                          'Bắt đầu khôi phục dữ liệu'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Deep Restoration Dialog */}
                <Dialog open={isRestoreAllDialogOpen} onOpenChange={setIsRestoreAllDialogOpen}>
                  <DialogContent className="sm:max-w-md bg-white border-none shadow-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-indigo-900 text-xl font-black">
                        <History className="w-6 h-6 text-indigo-600" />
                        Xác nhận Khôi phục Toàn diện
                      </DialogTitle>
                      <DialogDescription className="text-slate-500 font-medium py-2">
                        Tính năng này sẽ quét toàn bộ nhật ký hệ thống (Audit Logs) và các bản sao lưu để tìm kiếm mọi dữ liệu đã bị xóa (Dự án, Team, Ngân sách, Chi phí, v.v.) và đưa chúng trở lại.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-700 space-y-2">
                      <p className="font-bold">Hệ thống sẽ thử khôi phục:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Dự án & Loại hình dự án</li>
                        <li>Teams & Vùng/Khu vực</li>
                        <li>Ngân sách đã đăng ký</li>
                        <li>Chi phí Marketing thực tế</li>
                        <li>Báo cáo hiệu quả kinh doanh</li>
                      </ul>
                    </div>

                    <DialogFooter className="gap-3 mt-4">
                      <Button variant="ghost" onClick={() => setIsRestoreAllDialogOpen(false)}>Hủy bỏ</Button>
                      <Button 
                        onClick={handleRestoreFullDatabase}
                        disabled={isRestoringData}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                      >
                        {isRestoringData ? 'Đang xử lý...' : 'Bắt đầu quét & khôi phục'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

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
                  </Tabs>
                </div>
              </div>
            </TabsContent>
          )}

          <TabsContent value="register" className="space-y-8">
            <Card className="border-none shadow-2xl shadow-slate-200/60 bg-white overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-indigo-500 to-blue-600 w-full" />
              <CardHeader className="pb-6">
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <Wallet className="w-5 h-5 text-indigo-600" />
                  </div>
                  <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">Đăng ký ngân sách tháng</CardTitle>
                </div>
                <CardDescription className="text-slate-500 font-medium">Nhập ngân sách dự kiến cho các chiến dịch marketing của bạn</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-amber-800 leading-relaxed">
                    Chú ý : Ngân sách chạy thực tế không được Vượt quá hoặc Thấp hơn 70% so với ngân sách đã đăng kí .
                  </p>
                </div>
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
                                <span className="text-[10px] text-slate-400 font-normal">({projects.find(p => p.id === selectedProjectId)?.projectCode || projects.find(p => p.id === selectedProjectId)?.region})</span>
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
                                    <span className="font-medium">{p.name} ({p.projectCode})</span>
                                    <Badge variant="outline" className="text-[10px] py-0 h-4 bg-slate-50 text-slate-500 border-slate-100 shrink-0">
                                      {p.region}
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))
                            }
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Team</Label>
                      <Select value={selectedTeamId} onValueChange={(val) => {
                        const team = teams.find(t => t.id === val);
                        setSelectedTeamId(val);
                        if (team) setSelectedTeamName(team.name);
                      }}>
                        <SelectTrigger className="bg-slate-50 border-slate-200 focus:ring-blue-500 h-11">
                          <SelectValue placeholder="Vui lòng chọn team">
                            {selectedTeamId ? `${teamMap[selectedTeamId] || selectedTeamId} (${teams.find(t => t.id === selectedTeamId)?.teamCode || ''})` : "Vui lòng chọn team"}
                          </SelectValue>
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
                                <SelectItem key={t.id} value={t.id}>{t.name} ({t.teamCode})</SelectItem>
                              ))
                            }
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
                        Kỳ báo cáo (Tháng)
                      </Label>
                      <Select value={budgetMonth} onValueChange={setBudgetMonth}>
                        <SelectTrigger className="bg-slate-50 border-slate-200 focus:ring-blue-500 h-11 text-xs">
                          <SelectValue placeholder="Vui lòng chọn kỳ báo cáo mà bạn muốn đăng ký" />
                        </SelectTrigger>
                        <SelectContent>
                          {getMonthOptions().map(opt => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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

                    <div className="flex flex-col md:flex-row items-stretch gap-4 md:col-span-2 lg:col-span-1">
                      <Button 
                        type="button" 
                        onClick={handleRegisterBudgetMain}
                        className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-100 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 group"
                      >
                        <Wallet className="w-5 h-5 group-hover:animate-bounce" />
                        ĐĂNG KÝ NGÂN SÁCH
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleAddBudgetToListOnly}
                        className="flex-1 h-11 border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-600 font-bold transition-all rounded-xl"
                      >
                        <Plus className="w-4 h-4 mr-2" /> Bổ sung ngân sách dự án khác
                      </Button>
                    </div>
                  </div>
                </form>

                {multiBudgetItems.length > 0 && (
                  <div className="mt-8 space-y-4 pt-8 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                          <Database className="w-5 h-5 text-indigo-500" />
                          Danh sách dự án chờ đăng ký ({multiBudgetItems.length})
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider italic">Gợi ý: Bạn có thể đăng ký nhiều dự án cùng một lúc.</p>
                      </div>
                      <Button 
                        onClick={() => {
                          setIsConfirmingMulti(true);
                          setIsConfirmBudgetOpen(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-6 px-10 rounded-2xl shadow-xl shadow-indigo-100 transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-3"
                      >
                         Xác Nhận Đăng Ký ({formatCurrency(multiBudgetItems.reduce((acc, curr) => acc + curr.amount, 0))})
                         <ArrowRight className="w-5 h-5" />
                      </Button>
                    </div>

                    <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white">
                      <Table>
                        <TableHeader className="bg-slate-50/50">
                          <TableRow>
                            <TableHead className="text-[10px] font-black uppercase text-slate-400 h-10">Dự án</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-400 h-10">Team</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-400 h-10">Tháng</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-400 h-10 text-right">Số tiền</TableHead>
                            <TableHead className="w-20"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {multiBudgetItems.map((item) => (
                            <TableRow key={item.tempId} className="hover:bg-slate-50/30 transition-colors">
                              <TableCell className="font-bold text-slate-900 py-3">{item.projectName}</TableCell>
                              <TableCell className="text-slate-600 py-3">{teamMap[item.teamId] || item.teamName}</TableCell>
                              <TableCell className="text-slate-600 font-mono text-xs py-3">{item.month}</TableCell>
                              <TableCell className="text-right font-black text-indigo-600 py-3">{formatCurrency(item.amount)}</TableCell>
                              <TableCell className="py-3">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => removeMultiBudgetItem(item.tempId)}
                                  className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg h-8 w-8"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>

            {/* Confirmation Dialog */}
            <Dialog open={isConfirmBudgetOpen} onOpenChange={(open) => {
              setIsConfirmBudgetOpen(open);
              if (!open) setIsConfirmingMulti(false);
            }}>
              <DialogContent className="sm:max-w-lg bg-white border-none shadow-2xl p-0 overflow-hidden rounded-[32px]">
                <div className="bg-indigo-600 p-6 text-white overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                  <div className="relative z-10">
                    <DialogTitle className="text-2xl font-black tracking-tight mb-1">Xác nhận đăng ký</DialogTitle>
                    <DialogDescription className="text-indigo-100 font-medium">
                      {isConfirmingMulti ? `Bạn đang thực hiện đăng ký cho ${multiBudgetItems.length} dự án` : 'Vui lòng kiểm tra lại thông tin đăng ký bên dưới'}
                    </DialogDescription>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {isConfirmingMulti ? (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {multiBudgetItems.map((item, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-sm truncate">{projectMap[item.projectId]}</p>
                            <p className="text-[10px] text-slate-500 font-medium">{item.teamName} • Tháng {item.month}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-black text-indigo-600 text-sm">{formatCurrency(item.amount)}</p>
                          </div>
                        </div>
                      ))}
                      <div className="pt-4 border-t border-dashed border-slate-200 flex justify-between items-center px-2">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Tổng cộng</span>
                        <span className="text-xl font-black text-slate-900">{formatCurrency(multiBudgetItems.reduce((acc, curr) => acc + curr.amount, 0))}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dự án</p>
                          <p className="text-xs font-bold text-slate-900 truncate">{projectMap[selectedProjectId]}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Team</p>
                          <p className="text-xs font-bold text-slate-900 truncate">{selectedTeamName}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tháng</p>
                          <p className="text-xs font-bold text-slate-900">{budgetMonth}</p>
                        </div>
                      </div>
                      <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col items-center justify-center gap-1 text-center">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Số tiền đăng ký</p>
                        <p className="text-3xl font-black text-indigo-600">{formatCurrency(Number(budgetAmount))}</p>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                        <p className="text-[10px] font-bold text-amber-800 leading-tight">
                          Đảm bảo ngân sách thực tế không biến động quá 30% so với con số này.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter className="p-6 bg-slate-50 flex sm:justify-between items-center gap-3">
                  <Button variant="ghost" onClick={() => setIsConfirmBudgetOpen(false)} className="rounded-xl font-bold text-slate-500">
                    Hủy bỏ
                  </Button>
                  <Button 
                    onClick={() => {
                      if (isConfirmingMulti) {
                        confirmAddBudget();
                      } else {
                        // Current confirmAddBudget handles multiBudgetItems list. 
                        // If we are not in multi mode, we need to temporarily add current item then confirm.
                        // But wait, my handleRegisterBudgetMain already added it to list.
                        confirmAddBudget();
                      }
                    }} 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 py-6 rounded-2xl shadow-xl shadow-indigo-100 h-auto"
                  >
                    Xác nhận đăng ký ngay
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
                          const isAssigned = b.assignedUserEmail?.toLowerCase() === userEmail;
                          const isAssignedGDDA = isGDDA && userProfile?.assignedProjects?.includes(b.projectId);
                          
                          return isAdmin || isMod || isOwner || isAssigned || isAssignedGDDA;
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
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-slate-700">{projectMap[b.projectId] || b.projectName || 'N/A'}</span>
                              <span className="text-[10px] text-slate-400 font-normal">({projects.find(p => p.id === b.projectId)?.projectCode || ''})</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge variant="outline" className="font-normal border-slate-200 text-slate-600 bg-white">
                              {b.teamName} ({teams.find(t => t.id === b.teamId)?.teamCode || ''})
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
                          <TableCell className="py-4 text-right">
                             <div className="flex justify-end gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-slate-400 hover:text-indigo-600"
                                  onClick={() => handleOpenHistory(b, `${b.projectName} - ${b.teamName}`)}
                                  title="Lịch sử thay đổi"
                                >
                                  <History className="h-3.5 w-3.5" />
                                </Button>
                                {(isAdmin || (b.userEmail === user?.email?.toLowerCase() && isWithinRegistrationWindow())) && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-slate-400 hover:text-blue-600"
                                    onClick={() => {
                                      setEditingBudgetId(b.id);
                                      setEditingBudgetProject(b.projectId);
                                      setEditingBudgetTeam(b.teamId);
                                      setEditingBudgetAmount(b.amount.toString());
                                      setEditingBudgetMonth(b.month);
                                      setEditingBudgetImplementer(b.implementerName);
                                      setIsEditBudgetDialogOpen(true);
                                    }}
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {isAdmin && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-slate-400 hover:text-red-600"
                                    onClick={() => handleDeleteBudget(b.id, b.projectName)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
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
          <TabsContent value="actual" className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-8">
                <Card className="border-none shadow-2xl shadow-slate-200/60 bg-white overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-600 w-full" />
                  <CardHeader className="pb-6">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="p-2 bg-emerald-50 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                      </div>
                      <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">Cập nhật chi phí</CardTitle>
                    </div>
                    <CardDescription className="text-slate-500 font-medium">Chọn khoản ngân sách để nhập chi phí thực tế</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <form onSubmit={handleAddCost} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kỳ ngân sách</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Select 
                              value={costBudgetMonth ? costBudgetMonth.split('-')[0] : ''} 
                              onValueChange={(val) => {
                                const current = costBudgetMonth || format(new Date(), 'yyyy-MM');
                                const [, m] = current.split('-');
                                setCostBudgetMonth(`${val}-${m}`);
                              }}
                            >
                              <SelectTrigger className="bg-slate-50 border-slate-200 h-11">
                                <SelectValue placeholder="Năm" />
                              </SelectTrigger>
                              <SelectContent>
                                {[2024, 2025, 2026, 2027, 2028].map(y => (
                                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select 
                              value={costBudgetMonth ? costBudgetMonth.split('-')[1] : ''} 
                              onValueChange={(val) => {
                                const current = costBudgetMonth || format(new Date(), 'yyyy-MM');
                                const [y] = current.split('-');
                                setCostBudgetMonth(`${y}-${val}`);
                              }}
                            >
                              <SelectTrigger className="bg-slate-50 border-slate-200 h-11">
                                <SelectValue placeholder="Tháng" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(m => (
                                  <SelectItem key={m} value={m}>Tháng {m}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Khoản ngân sách</Label>
                          <Dialog open={isBudgetSelectionDialogOpen} onOpenChange={setIsBudgetSelectionDialogOpen}>
                            <DialogTrigger nativeButton={true} render={
                              <Button 
                                variant="outline" 
                                className="w-full h-auto py-3 px-4 bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300 justify-start text-left focus:ring-green-500 rounded-xl transition-all"
                              />
                            }>
                              {selectedBudgetId ? (
                                (() => {
                                  const b = budgets.find(b => b.id === selectedBudgetId);
                                  return b ? (
                                    <div className="flex items-center gap-3 w-full">
                                      <div className="p-2 bg-emerald-100 rounded-lg shrink-0">
                                        <Wallet className="w-4 h-4 text-emerald-600" />
                                      </div>
                                      <div className="flex flex-col min-w-0 flex-1" key={b.id}>
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-slate-900 truncate">{projectMap[b.projectId]}</span>
                                          <span className="text-[10px] text-slate-400 font-normal shrink-0">({projects.find(p => p.id === b.projectId)?.projectCode || ''})</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                          <span className="font-medium">{teamMap[b.teamId] || b.teamName}</span>
                                          <span className="opacity-30">•</span>
                                          <span>{b.implementerName}</span>
                                        </div>
                                      </div>
                                      <div className="text-right shrink-0">
                                        <span className="text-xs font-bold text-emerald-600 font-mono italic">
                                          {b.amount.toLocaleString()} đ
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 text-slate-400">
                                      <Search className="w-4 h-4" />
                                      <span>Chọn khoản ngân sách của bạn...</span>
                                    </div>
                                  );
                                })()
                              ) : (
                                <div className="flex items-center gap-2 text-slate-400">
                                  <Search className="w-4 h-4" />
                                  <span>Chọn khoản ngân sách của bạn...</span>
                                </div>
                              )}
                            </DialogTrigger>
                            <DialogContent className="max-w-[95vw] sm:max-w-[600px] p-0 gap-0 overflow-hidden rounded-2xl shadow-2xl border-none">
                              <DialogHeader className="p-6 pb-0 bg-white">
                                <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                                  <Wallet className="w-5 h-5 text-emerald-500" />
                                  Chọn Ngân Sách Đăng Ký
                                </DialogTitle>
                                <DialogDescription className="text-slate-500 font-medium">
                                  Danh sách ngân sách của bạn trong kỳ {costBudgetMonth}
                                </DialogDescription>
                                <div className="mt-4 relative group">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-emerald-500" />
                                  <DebouncedInput
                                    placeholder="Tìm theo dự án, team hoặc nhân sự..."
                                    className="pl-10 h-12 bg-slate-50 border-slate-100 focus:border-emerald-200 focus:ring-emerald-100 text-sm rounded-xl"
                                    value={budgetSearch}
                                    onChange={setBudgetSearch}
                                  />
                                </div>
                              </DialogHeader>
                              
                              <div className="p-4 bg-slate-50/50 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-2 mt-4">
                                {filteredBudgetsForCostSelection.map(b => (
                                  <button
                                    key={b.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedBudgetId(b.id);
                                      setActualProjectId(b.projectId);
                                      setIsBudgetSelectionDialogOpen(false);
                                    }}
                                    className={`w-full p-4 rounded-xl border text-left transition-all duration-200 group flex items-start gap-4 ${
                                      selectedBudgetId === b.id 
                                        ? 'bg-emerald-50 border-emerald-200 ring-2 ring-emerald-500/20' 
                                        : 'bg-white border-slate-100 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5'
                                    }`}
                                  >
                                    <div className={`p-2 rounded-lg shrink-0 transition-colors ${
                                      selectedBudgetId === b.id ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600'
                                    }`}>
                                      <Building2 className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-start gap-2 mb-1">
                                        <div className="flex items-center gap-2 truncate">
                                          <h4 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                                            {projectMap[b.projectId]}
                                          </h4>
                                          <span className="text-[10px] text-slate-400 font-normal">({projects.find(p => p.id === b.projectId)?.projectCode || ''})</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                                          {b.type}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                          <Users className="w-3 h-3 opacity-60" />
                                          <span className="font-medium">{teamMap[b.teamId] || b.teamName}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                          <UserCircle className="w-3 h-3 opacity-60" />
                                          <span>{b.implementerName}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                          <MapIcon className="w-3 h-3 opacity-60" />
                                          <span>{projects.find(p => p.id === b.projectId)?.region || 'N/A'}</span>
                                        </div>
                                      </div>
                                      <div className="mt-3 flex items-center justify-between border-t border-slate-50 pt-3">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ngân sách đăng ký</span>
                                        <span className="text-sm font-black text-emerald-600 font-mono">
                                          {b.amount.toLocaleString()} <span className="text-[10px]">đ</span>
                                        </span>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                                {filteredBudgetsForCostSelection.length === 0 && (
                                  <div className="py-12 text-center space-y-4">
                                    <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                                      <Search className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-slate-900 font-bold">Không tìm thấy ngân sách</p>
                                      <p className="text-xs text-slate-500">Hãy thử tìm theo bộ lọc khác hoặc kiểm tra kỳ ngân sách</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                      
                      {selectedBudgetId && (
                        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                          {(() => {
                            const budget = budgets.find(b => b.id === selectedBudgetId);
                            const project = projects.find(p => p.id === budget?.projectId);
                            const spent = costs
                              .filter(c => c.budgetId === selectedBudgetId)
                              .reduce((acc, curr) => acc + curr.amount, 0);
                            const percent = budget ? (spent / budget.amount) * 100 : 0;
                            const remaining = budget ? budget.amount - spent : 0;
                            
                            return (
                              <>
                                <div className="flex justify-between items-start border-b border-slate-50 pb-3">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-black text-slate-900 leading-none">{project?.name}</h3>
                                      <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-bold uppercase border-slate-200 text-slate-400">
                                        {project?.type}
                                      </Badge>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium">
                                      {project?.region} • {budget?.teamName}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <Badge className={percent > 100 ? "bg-red-500 text-white" : percent < 70 ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"}>
                                      {percent.toFixed(1)}%
                                    </Badge>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Đã thực chi</p>
                                    <p className="text-sm font-black text-slate-900 font-mono">
                                      {spent.toLocaleString()} <span className="text-[10px]">đ</span>
                                    </p>
                                  </div>
                                  <div className="space-y-1 text-right">
                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Còn lại</p>
                                    <p className={`text-sm font-black font-mono ${remaining < 0 ? 'text-red-500' : 'text-slate-900'}`}>
                                      {remaining.toLocaleString()} <span className="text-[10px]">đ</span>
                                    </p>
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                                    <span>Tiến độ ngân sách</span>
                                    <span>{budget?.amount.toLocaleString()} đ</span>
                                  </div>
                                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                                    <div 
                                      className={`h-full transition-all duration-1000 ease-out shadow-sm ${percent > 100 ? "bg-red-500" : percent < 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                                      style={{ width: `${Math.min(percent, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kỳ cập nhật</Label>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                              {getPeriodRange(costBudgetMonth, costPeriod)}
                            </span>
                          </div>
                          <Select value={costPeriod} onValueChange={setCostPeriod}>
                            <SelectTrigger className="bg-slate-50 border-slate-200 h-11">
                              <SelectValue placeholder="Chọn kỳ cập nhật" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Kỳ 1 (Ngày 21 - 27)</SelectItem>
                              <SelectItem value="2">Kỳ 2 (Ngày 28 - 04)</SelectItem>
                              <SelectItem value="3">Kỳ 3 (Ngày 05 - 11)</SelectItem>
                              <SelectItem value="4">Kỳ 4 (Ngày 12 - 18)</SelectItem>
                            </SelectContent>
                          </Select>
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
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Visa Công ty</Label>
                            <Input type="text" className="h-9 text-xs font-mono border-blue-100 bg-blue-50/20" placeholder="0" value={formatNumberWithCommas(visaAmount)} onChange={handleNumberInputChange(setVisaAmount)} disabled={!isAdmin} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Digital Agency</Label>
                            <Input type="text" className="h-9 text-xs font-mono border-purple-100 bg-purple-50/20" placeholder="0" value={formatNumberWithCommas(digitalAmount)} onChange={handleNumberInputChange(setDigitalAmount)} disabled={!isAdmin} />
                          </div>
                          <div className="space-y-1.5 col-span-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase">Khác</Label>
                            <Input type="text" className="h-9 text-xs font-mono" placeholder="0" value={formatNumberWithCommas(otherCost)} onChange={handleNumberInputChange(setOtherCost)} />
                          </div>
                          <div className="col-span-2 pt-3 border-t border-slate-200 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-600">Tổng cộng:</span>
                            <span className="text-base font-bold text-blue-600 font-mono">
                              {(Number(fbAds) + Number(posting) + Number(zaloAds) + Number(googleAds) + Number(otherCost) + Number(visaAmount) + Number(digitalAmount)).toLocaleString()} đ
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
                          <TableHead className="w-[50px] text-center">STT</TableHead>
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
                          <TableHead 
                            className="cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => setCostReportSort(prev => ({ key: 'project', direction: prev.key === 'project' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                          >
                            <div className="flex items-center gap-1">
                              Dự án / Team <ArrowUpDown className="w-3 h-3 text-slate-400" />
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => setCostReportSort(prev => ({ key: 'implementer', direction: prev.key === 'implementer' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                          >
                            <div className="flex items-center gap-1">
                              Người triển khai <ArrowUpDown className="w-3 h-3 text-slate-400" />
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => setCostReportSort(prev => ({ key: 'week', direction: prev.key === 'week' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                          >
                            <div className="flex items-center gap-1">
                              Thời gian <ArrowUpDown className="w-3 h-3 text-slate-400" />
                            </div>
                          </TableHead>
                          <TableHead 
                            className="text-right cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => setCostReportSort(prev => ({ key: 'amount', direction: prev.key === 'amount' && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                          >
                            <div className="flex items-center justify-end gap-1">
                              Số tiền <ArrowUpDown className="w-3 h-3 text-slate-400" />
                            </div>
                          </TableHead>
                          <TableHead className="text-right font-bold text-slate-400 uppercase text-[10px]">Ngân sách</TableHead>
                          <TableHead className="text-right font-bold text-slate-400 uppercase text-[10px]">%</TableHead>
                          <TableHead>Ghi chú</TableHead>
                          <TableHead className="text-right">Thao tác</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {costs
                          .filter(c => isAdmin || isMod || c.userEmail === user.email)
                          .slice(0, 50)
                          .map((c, idx) => (
                          <TableRow key={c.id} className={selectedCostIds.includes(c.id) ? "bg-blue-50/30" : ""}>
                            <TableCell className="text-center font-mono text-[10px] text-slate-400">{idx + 1}</TableCell>
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
                                <span className="font-medium text-xs">{projectMap[c.projectId] || c.projectName}</span>
                                <span className="text-[10px] text-slate-500">{teamMap[c.teamId] || c.teamName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">{c.implementerName}</TableCell>
                            <TableCell className="text-xs">Kỳ {c.weekNumber}</TableCell>
                            <TableCell className="text-right font-mono font-medium text-xs">
                              {editingCostId === c.id ? (
                                <Input 
                                  type="text" 
                                  className="h-8 text-right w-32 ml-auto" 
                                  value={formatNumberWithCommas(editingCostAmount)} 
                                  onChange={handleNumberInputChange(setEditingCostAmount)} 
                                />
                              ) : `${c.amount.toLocaleString()} đ`}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-slate-500">
                              {budgetAmountMap[c.budgetId] ? `${budgetAmountMap[c.budgetId].toLocaleString()} đ` : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {budgetAmountMap[c.budgetId] ? (
                                <Badge variant="outline" className={`text-[10px] font-mono ${(c.amount / budgetAmountMap[c.budgetId]) > 1 ? 'text-red-600 bg-red-50 border-red-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>
                                  {((c.amount / budgetAmountMap[c.budgetId]) * 100).toFixed(1)}%
                                </Badge>
                              ) : '-'}
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
                            <TableCell className="text-right">
                              {(isAdmin || c.userEmail === user?.email?.toLowerCase()) && (
                                <>
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
                                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-indigo-600" onClick={() => handleOpenHistory(c, `${c.projectName} - ${c.teamName}`)} title="Lịch sử thay đổi">
                                        <History className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => {
                                        setEditingCostId(c.id);
                                        setEditingCostAmount(c.amount.toString());
                                        setEditingCostNote(c.note || '');
                                      }}>
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </Button>
                                      {isAdmin && (
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleDeleteCost(c.id, projectMap[c.projectId] || c.projectName)}>
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {costs.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={isAdmin ? 10 : 9} className="text-center py-12 text-slate-400">Chưa có dữ liệu thực tế</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                      {costs.length > 0 && (
                        <TableFooter className="bg-slate-50 font-bold border-t-2 border-slate-100">
                          <TableRow>
                            <TableCell colSpan={isAdmin ? 5 : 4} className="text-right text-slate-600 uppercase text-[10px]">Tổng cộng:</TableCell>
                            <TableCell className="text-right font-mono text-emerald-600 font-black">
                              {costs.reduce((acc, curr) => acc + (curr.amount || 0), 0).toLocaleString()} <span className="text-[10px]">đ</span>
                            </TableCell>
                            <TableCell className="text-right font-mono text-slate-500 text-xs">
                              {costs.reduce((acc, curr) => acc + (budgetAmountMap[curr.budgetId] || 0), 0).toLocaleString()} đ
                            </TableCell>
                            <TableCell className="text-right">
                              {(() => {
                                const totalBudget = costs.reduce((acc, curr) => acc + (budgetAmountMap[curr.budgetId] || 0), 0);
                                const totalCost = costs.reduce((acc, curr) => acc + (curr.amount || 0), 0);
                                if (totalBudget === 0) return '-';
                                const percent = (totalCost / totalBudget) * 100;
                                return (
                                  <Badge className={percent > 100 ? "bg-red-600" : percent < 70 ? "bg-amber-600" : "bg-emerald-600"}>
                                    {percent.toFixed(1)}%
                                  </Badge>
                                );
                              })()}
                            </TableCell>
                            <TableCell colSpan={2}></TableCell>
                          </TableRow>
                        </TableFooter>
                      )}
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

          <TabsContent value="support" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <SupportManager 
              isAdmin={isAdmin || isMod} 
              user={user} 
              supportRequests={supportRequests}
              handleFirestoreError={handleFirestoreError}
            />
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
                          <DebouncedInput
                            placeholder="Tìm team..."
                            className="pl-8 h-9"
                            value={teamSearch}
                            onChange={setTeamSearch}
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
              <DebouncedInput 
                placeholder="Tìm kiếm dự án..." 
                className="pl-10"
                value={projectSearch}
                onChange={setProjectSearch}
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
      {/* Global Project for Type Dialog */}
      <Dialog open={isGlobalProjectAssignDialogOpen} onOpenChange={setIsGlobalProjectAssignDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Gán Loại hình cho Dự án</DialogTitle>
            <DialogDescription>Chọn các dự án và loại hình bạn muốn gán.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Chọn Loại hình</Label>
              <Select value={targetGlobalType} onValueChange={setTargetGlobalType}>
                <SelectTrigger><SelectValue placeholder="Chọn loại hình..." /></SelectTrigger>
                <SelectContent>
                  {types.map(t => (
                    <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Chọn Dự án ({selectedGlobalProjectIds.length})</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <DebouncedInput 
                  placeholder="Tìm kiếm dự án..." 
                  className="pl-10 h-9"
                  value={projectSearch}
                  onChange={setProjectSearch}
                />
              </div>
              <div className="max-h-[250px] overflow-y-auto border rounded-md p-2 space-y-1">
                {projects
                  .filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase()))
                  .map(p => (
                    <div key={p.id} className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded-md transition-colors">
                      <input 
                        type="checkbox" 
                        id={`global-type-proj-${p.id}`}
                        className="rounded border-slate-300"
                        checked={selectedGlobalProjectIds.includes(p.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedGlobalProjectIds(prev => [...prev, p.id]);
                          } else {
                            setSelectedGlobalProjectIds(prev => prev.filter(id => id !== p.id));
                          }
                        }}
                      />
                      <Label htmlFor={`global-type-proj-${p.id}`} className="flex-1 cursor-pointer text-sm">
                        {p.name} <span className="text-[10px] text-slate-400 ml-2">({p.type || 'Chưa phân loại'})</span>
                      </Label>
                    </div>
                  ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGlobalProjectAssignDialogOpen(false)}>Hủy</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleGlobalProjectAssign} disabled={selectedGlobalProjectIds.length === 0 || !targetGlobalType}>
              Xác nhận gán {selectedGlobalProjectIds.length} dự án
            </Button>
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
              <DebouncedInput 
                placeholder="Tìm kiếm dự án..." 
                className="pl-10"
                value={projectSearch}
                onChange={setProjectSearch}
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

      {/* Bulk Delete Efficiency Confirmation Dialog */}
      <Dialog open={isBulkDeleteEfficiencyDialogOpen} onOpenChange={setIsBulkDeleteEfficiencyDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Xác nhận xóa nhiều bản ghi
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa <strong>{selectedEfficiencyIds.length}</strong> bản ghi hiệu quả kinh doanh đã chọn?
              Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsBulkDeleteEfficiencyDialogOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={confirmBulkDeleteEfficiency} disabled={isDeletingEfficiencyBatch}>
              {isDeletingEfficiencyBatch ? "Đang xóa..." : "Xác nhận xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Efficiency Confirmation Dialog */}
      <Dialog open={isDeleteAllEfficiencyDialogOpen} onOpenChange={setIsDeleteAllEfficiencyDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Xác nhận xóa TẤT CẢ
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa <strong>TOÀN BỘ {efficiencyReports.length}</strong> bản ghi hiệu quả kinh doanh trong hệ thống?
              Hành động này cực kỳ nguy hiểm và không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteAllEfficiencyDialogOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={confirmDeleteAllEfficiency}>Xác nhận xóa tất cả</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Errors Log Dialog */}
      <Dialog open={isImportErrorsDialogOpen} onOpenChange={setIsImportErrorsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <FileWarning className="w-5 h-5" /> Nhật ký lỗi nhập dữ liệu
            </DialogTitle>
            <DialogDescription>
              Hệ thống tìm thấy <strong>{importErrors.length}</strong> dòng không thể xử lý trong file của bạn.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto my-4 p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
            {importErrors.map((err, idx) => (
              <div key={idx} className="flex gap-3 text-[11px] leading-relaxed text-slate-700 bg-white p-3 rounded-lg border border-slate-200 shadow-sm whitespace-pre-wrap">
                <div className="bg-red-50 text-red-600 font-black shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px]">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  {err.split('\n').map((line, lIdx) => {
                    if (line.includes('• Nguyên nhân:')) {
                      return <p key={lIdx} className="text-amber-700 font-medium mt-1">{line}</p>;
                    }
                    if (line.includes('• Cách khắc phục:')) {
                      return <p key={lIdx} className="text-emerald-700 font-bold mt-1 bg-emerald-50/50 p-1 rounded">{line}</p>;
                    }
                    return <p key={lIdx} className="font-bold text-slate-900 border-b border-slate-100 pb-1 mb-1">{line}</p>;
                  })}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="flex justify-between items-center sm:justify-between w-full">
            <Button variant="outline" size="sm" onClick={() => {
              const text = importErrors.join('\n');
              navigator.clipboard.writeText(text);
              toast.success("Đã sao chép danh sách lỗi!");
            }}>
              <Copy className="w-3.5 h-3.5 mr-2" /> Sao chép lỗi
            </Button>
            <Button className="bg-slate-900" onClick={() => setIsImportErrorsDialogOpen(false)}>Đóng</Button>
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

      {/* Bulk Update Type Confirmation Dialog */}
      <Dialog open={isBulkUpdateTypeDialogOpen} onOpenChange={setIsBulkUpdateTypeDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-blue-600 flex items-center gap-2">
              <Layers className="w-5 h-5" /> Xác nhận cập nhật loại hình
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn cập nhật loại hình thành <strong>{selectedTypeForBulk}</strong> cho <strong>{selectedProjectIds.length}</strong> dự án đã chọn?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsBulkUpdateTypeDialogOpen(false)}>Hủy</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={confirmBulkUpdateProjectType}>Xác nhận cập nhật</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Migrate Type Confirmation Dialog */}
      <Dialog open={isMigrateTypeDialogOpen} onOpenChange={setIsMigrateTypeDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-indigo-600 flex items-center gap-2">
              <RefreshCw className="w-5 h-5" /> Chuyển đổi toàn bộ dự án
            </DialogTitle>
            <DialogDescription>
              Di chuyển toàn bộ dự án hiện đang thuộc loại hình <strong>{typeToMigrate?.name}</strong> sang một loại hình mới.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Chọn loại hình đích</Label>
              <Select value={migrationTargetType} onValueChange={setMigrationTargetType}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại hình mới..." />
                </SelectTrigger>
                <SelectContent>
                  {types
                    .filter(t => t.id !== typeToMigrate?.id)
                    .map(t => (
                    <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                  ))}
                  <SelectItem value="">(Gỡ bỏ loại hình)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsMigrateTypeDialogOpen(false)}>Hủy</Button>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white" 
              onClick={confirmMigrateType}
              disabled={isMigratingTypes}
            >
              {isMigratingTypes ? "Đang xử lý..." : "Xác nhận chuyển đổi"}
            </Button>
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
      {/* Edit Budget Dialog */}
      <Dialog open={isEditBudgetDialogOpen} onOpenChange={setIsEditBudgetDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-blue-600 flex items-center gap-2">
              <Edit2 className="w-5 h-5" /> Sửa thông tin Đăng ký Ngân sách
            </DialogTitle>
            <DialogDescription>
              Cập nhật các thông tin về dự án, team, người triển khai và số tiền ngân sách.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">Dự án</Label>
              <Select value={editingBudgetProject} onValueChange={setEditingBudgetProject}>
                <SelectTrigger className="bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Chọn dự án">
                    {editingBudgetProject ? `${projectMap[editingBudgetProject] || editingBudgetProject} (${projects.find(p => p.id === editingBudgetProject)?.projectCode || ''})` : "Chọn dự án"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="w-[400px] md:w-[550px]">
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
                  <SelectGroup className="max-h-[300px] overflow-y-auto">
                    {projects
                      .filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase()))
                      .map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex items-center justify-between w-full gap-4">
                            <span className="font-medium">{p.name} ({p.projectCode})</span>
                            <Badge variant="outline" className="text-[10px] py-0 h-4 bg-slate-50 text-slate-500 border-slate-100 shrink-0">
                              {p.region}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))
                    }
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">Team</Label>
              <Select value={editingBudgetTeam} onValueChange={setEditingBudgetTeam}>
                <SelectTrigger className="bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Chọn team">
                    {editingBudgetTeam ? `${teamMap[editingBudgetTeam] || editingBudgetTeam} (${teams.find(t => (t.id === editingBudgetTeam || t.name === editingBudgetTeam))?.teamCode || ''})` : "Chọn team"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {teams.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name} ({t.teamCode})</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">Người triển khai</Label>
              <Input 
                value={editingBudgetImplementer} 
                onChange={e => setEditingBudgetImplementer(e.target.value)} 
                className="bg-slate-50 border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">Tháng báo cáo</Label>
              <div className="space-y-1">
                <Select value={editingBudgetMonth} onValueChange={setEditingBudgetMonth}>
                  <SelectTrigger className="bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Chọn tháng" />
                  </SelectTrigger>
                  <SelectContent>
                    {getMonthOptions().map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">Ngân sách đăng ký (VNĐ)</Label>
              <div className="relative">
                <Input 
                  type="text" 
                  value={formatNumberWithCommas(editingBudgetAmount)} 
                  onChange={handleNumberInputChange(setEditingBudgetAmount)} 
                  className="bg-slate-50 border-slate-200 pr-8 font-mono font-bold"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">đ</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase text-blue-600">Chi phí nghiệm thu (Admin)</Label>
              <div className="relative">
                <Input 
                  type="text" 
                  value={formatNumberWithCommas(editingBudgetVerifiedAmount)} 
                  onChange={handleNumberInputChange(setEditingBudgetVerifiedAmount)} 
                  className="bg-blue-50 border-blue-200 pr-8 font-mono font-bold text-blue-700"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-400">đ</span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsEditBudgetDialogOpen(false)}>Hủy</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={confirmEditBudget}>
              Cập nhật thông tin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Migration Budget Confirmation Dialog */}
      <Dialog open={isMigrateBudgetsDialogOpen} onOpenChange={setIsMigrateBudgetsDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-blue-600 flex items-center gap-2">
              <RefreshCw className="w-5 h-5" /> Xác nhận chuyển dữ liệu
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn chuyển toàn bộ bản ghi đăng ký ngân sách từ <strong>Tháng 4</strong> sang <strong>Tháng 5</strong>?
              Hành động này sẽ cập nhật tất cả bản ghi có kỳ báo cáo "2026-04" thành "2026-05".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsMigrateBudgetsDialogOpen(false)}>Hủy</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={confirmMigrateBudgets} disabled={isMigratingBudgets}>
              {isMigratingBudgets ? "Đang xử lý..." : "Xác nhận chuyển"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Budget Import Dialog */}
      <Dialog open={isImportBudgetsDialogOpen} onOpenChange={setIsImportBudgetsDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-indigo-600 flex items-center gap-2 font-black">
              <FileUp className="w-5 h-5" /> Nhập dữ liệu Ngân sách
            </DialogTitle>
            <DialogDescription className="font-medium text-slate-500">
              Tải lên file Excel/CSV hoặc nhập link Google Sheet để đồng bộ dữ liệu ngân sách.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-50/50 border border-indigo-100">
              <div className="space-y-1">
                <p className="text-sm font-bold text-indigo-900">Tải file mẫu</p>
                <p className="text-xs text-indigo-500 font-medium font-inter">Sử dụng file này để nhập dữ liệu đúng mẫu</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadBudgetTemplate} className="h-9 font-bold text-indigo-700 bg-white border-indigo-200 hover:bg-indigo-50 rounded-xl shadow-sm">
                <Download className="w-4 h-4 mr-2" /> Tải về
              </Button>
            </div>
            
            <Tabs defaultValue="file" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-slate-100 rounded-xl mb-4">
                <TabsTrigger value="file" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm">
                  <FileText className="w-3.5 h-3.5 mr-2" /> File Excel / CSV
                </TabsTrigger>
                <TabsTrigger value="url" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm">
                  <Link className="w-3.5 h-3.5 mr-2" /> Google Sheet
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="file" className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Chọn file dữ liệu (.xlsx, .csv)</Label>
                  <div className="relative group">
                    <Input 
                      type="file" 
                      accept=".csv,.xlsx,.xls" 
                      onChange={handleImportBudgetsCSV} 
                      disabled={isImportingBudgets}
                      className="cursor-pointer file:cursor-pointer shadow-sm border-slate-200 h-11 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 rounded-xl"
                    />
                    {isImportingBudgets && !isImportingBudgetsUrl && (
                      <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-md">
                        <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="url" className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Link Google Sheet công khai</Label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="https://docs.google.com/spreadsheets/d/..." 
                        value={budgetSheetUrl}
                        onChange={(e) => setBudgetSheetUrl(e.target.value)}
                        className="bg-slate-50 border-slate-200 h-11 text-xs rounded-xl"
                      />
                      <Button 
                        onClick={handleImportBudgetsFromUrl} 
                        disabled={isImportingBudgetsUrl || !budgetSheetUrl}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 h-11 px-6 rounded-xl font-bold"
                      >
                        {isImportingBudgetsUrl ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Nhập dữ liệu"}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsImportBudgetsDialogOpen(false)} className="rounded-xl text-xs h-9">Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cost Import Dialog */}
      <Dialog open={isImportCostsDialogOpen} onOpenChange={setIsImportCostsDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-blue-600 flex items-center gap-2 font-black">
              <FileUp className="w-5 h-5" /> Nhập dữ liệu chi phí
            </DialogTitle>
            <DialogDescription className="font-medium text-slate-500">
              Tải lên file Excel/CSV hoặc nhập link Google Sheet để đồng bộ dữ liệu chi phí.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-blue-50/50 border border-blue-100">
              <div className="space-y-1">
                <p className="text-sm font-bold text-blue-900">Tải file mẫu</p>
                <p className="text-xs text-blue-500 font-medium font-inter">Sử dụng file này để nhập dữ liệu đúng mẫu</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadCostTemplate} className="h-9 font-bold text-blue-700 bg-white border-blue-200 hover:bg-blue-50 rounded-xl shadow-sm">
                <Download className="w-4 h-4 mr-2" /> Tải về
              </Button>
            </div>
            
            <Tabs defaultValue="file" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-slate-100 rounded-xl mb-4">
                <TabsTrigger value="file" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
                  <FileText className="w-3.5 h-3.5 mr-2" /> File Excel / CSV
                </TabsTrigger>
                <TabsTrigger value="url" className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
                  <Link className="w-3.5 h-3.5 mr-2" /> Google Sheet
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="file" className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Chọn file dữ liệu (.xlsx, .csv)</Label>
                  <div className="relative group">
                    <Input 
                      type="file" 
                      accept=".csv,.xlsx,.xls" 
                      onChange={handleImportCostsCSV} 
                      disabled={isImportingCosts}
                      className="cursor-pointer file:cursor-pointer shadow-sm border-slate-200 h-11 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 rounded-xl"
                    />
                    {isImportingCosts && !isImportingCostsUrl && (
                      <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-md">
                        <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="url" className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Link Google Sheet công khai</Label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="https://docs.google.com/spreadsheets/d/..." 
                        value={costSheetUrl}
                        onChange={(e) => setCostSheetUrl(e.target.value)}
                        className="bg-slate-50 border-slate-200 h-11 text-xs rounded-xl"
                      />
                      <Button 
                        onClick={handleImportCostsFromUrl} 
                        disabled={isImportingCostsUrl || !costSheetUrl}
                        className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 h-11 px-6 rounded-xl font-bold"
                      >
                        {isImportingCostsUrl ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Nhập dữ liệu"}
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
                    <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                      Hãy đảm bảo file đã được <strong>Chia sẻ công khai</strong> (Bất kỳ ai có liên kết đều có thể xem) để hệ thống có thể đọc dữ liệu.
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <p className="text-[10px] text-slate-400 italic text-center px-4">
              * Lưu ý: Tên Dự án, Team, và Tháng phải khớp với dữ liệu đã đăng ký ngân sách để đồng bộ chính xác.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsImportCostsDialogOpen(false)} className="rounded-xl text-xs h-9">Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Efficiency Edit Dialog */}
      <Dialog open={isEditEfficiencyDialogOpen} onOpenChange={setIsEditEfficiencyDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa báo cáo hiệu quả</DialogTitle>
            <DialogDescription>
              Cập nhật kết quả kinh doanh cho dự án <strong>{editingEfficiency?.projectName}</strong> - Team <strong>{editingEfficiency?.teamName}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Số căn bán</Label>
              <Input 
                type="number"
                value={newEfficiencySales}
                onChange={e => setNewEfficiencySales(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Doanh số (VND)</Label>
              <Input 
                type="text"
                value={formatNumberWithCommas(newEfficiencyRevenue)}
                onChange={e => setNewEfficiencyRevenue(e.target.value.replace(/\./g, ''))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditEfficiencyDialogOpen(false)}>Hủy</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => handleUpdateEfficiency(editingEfficiency?.id, newEfficiencySales, newEfficiencyRevenue)}>Lưu thay đổi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Efficiency Delete Dialog */}
      <Dialog open={isDeleteEfficiencyDialogOpen} onOpenChange={setIsDeleteEfficiencyDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Xác nhận xóa
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa bản ghi hiệu quả của <strong>{efficiencyToDelete?.projectName}</strong> - {efficiencyToDelete?.teamName}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteEfficiencyDialogOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={() => {
              handleDeleteEfficiency(efficiencyToDelete?.id);
              setIsDeleteEfficiencyDialogOpen(false);
            }}>Xác nhận xóa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Efficiency Dialog */}
      <Dialog open={isImportEfficiencyDialogOpen} onOpenChange={setIsImportEfficiencyDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-emerald-600 flex items-center gap-2 text-xl font-black">
              <FileUp className="w-5 h-5" /> Nhập hiệu quả từ Excel
            </DialogTitle>
            <DialogDescription className="font-medium">
              Chỉ đồng bộ dữ liệu thông qua <strong>ID Dự án</strong> và <strong>ID Team</strong>. Hệ thống sẽ bỏ qua tên dự án/team trong file và tự động lấy tên từ cơ sở dữ liệu.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <div className="space-y-3">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                <Link className="w-3 h-3" /> Nhập từ Link Google Sheet
              </Label>
              <div className="flex gap-2">
                <Input 
                  placeholder="Dán link Google Sheet tại đây..." 
                  className="bg-slate-50 border-slate-200 h-11 rounded-xl"
                  value={efficiencySheetUrl}
                  onChange={e => setEfficiencySheetUrl(e.target.value)}
                  disabled={isImportingEfficiencyUrl}
                />
                <Button 
                  className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white min-w-[100px]"
                  onClick={handleImportEfficiencyFromUrl}
                  disabled={isImportingEfficiencyUrl || !efficiencySheetUrl}
                >
                  {isImportingEfficiencyUrl ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Đồng bộ'}
                </Button>
              </div>
              <p className="text-[10px] text-slate-400 italic ml-1">
                * Lưu ý: File Google Sheet phải được chia sẻ "Bất kỳ ai có liên kết đều có thể xem".
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest text-slate-300">
                <span className="bg-white px-3">Hoặc tải lên file</span>
              </div>
            </div>

            <div className={`p-8 border-2 border-dashed rounded-2xl text-center transition-all group ${isImportingEfficiency && !isImportingEfficiencyUrl ? 'bg-slate-50 border-slate-200' : 'bg-emerald-50/30 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/50'}`}>
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                className="hidden" 
                id="efficiency-upload" 
                onChange={handleImportEfficiency}
                disabled={isImportingEfficiency}
              />
              <label 
                htmlFor="efficiency-upload" 
                className={`cursor-pointer flex flex-col items-center gap-4 ${isImportingEfficiency ? 'cursor-not-allowed' : ''}`}
              >
                {isImportingEfficiency ? (
                  <RefreshCw className="w-12 h-12 text-emerald-500 animate-spin" />
                ) : (
                  <div className="p-4 bg-emerald-100 rounded-full text-emerald-600 group-hover:scale-110 transition-transform">
                    <FileSpreadsheet className="w-8 h-8" />
                  </div>
                )}
                <div className="space-y-1">
                  <p className="font-bold text-slate-900 text-base">{isImportingEfficiency ? 'Đang xử lý dữ liệu...' : 'Nhấn để chọn file Excel'}</p>
                  <p className="text-xs text-slate-500">Hỗ trợ định dạng .xlsx và .xls</p>
                </div>
              </label>
            </div>
            
            <div className="space-y-3 bg-blue-50/50 p-5 rounded-xl border border-blue-100">
              <h4 className="text-[10px] font-black text-blue-700 uppercase tracking-[0.2em] flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" /> Định dạng yêu cầu
              </h4>
              <div className="space-y-2">
                <p className="text-[11px] text-blue-600 font-medium italic">Lưu ý: Tên cột phải khớp chính xác tuyệt đối.</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/60 p-2 rounded border border-blue-100/50">
                    <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">Cột Định danh (Bắt buộc)</p>
                    <div className="flex flex-wrap gap-1">
                      <code className="text-[10px] bg-blue-100 px-1.5 py-0.5 rounded text-blue-700 font-bold">ID Dự án</code>
                      <code className="text-[10px] bg-blue-100 px-1.5 py-0.5 rounded text-blue-700 font-bold">ID Team</code>
                      <code className="text-[10px] bg-blue-100 px-1.5 py-0.5 rounded text-blue-700 font-bold">Tháng</code>
                    </div>
                  </div>
                  <div className="bg-white/60 p-2 rounded border border-blue-100/50">
                    <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">Cột dữ liệu</p>
                    <div className="flex flex-wrap gap-1">
                      <code className="text-[10px] bg-blue-100 px-1.5 py-0.5 rounded text-blue-700 font-bold">Số căn bán</code>
                      <code className="text-[10px] bg-blue-100 px-1.5 py-0.5 rounded text-blue-700 font-bold">Doanh số</code>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-blue-500 italic mt-2">* Hệ thống sử dụng ID để đối soát. Tên dự án/team sẽ được tự động cập nhật theo database hiện tại.</p>
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-between items-center sm:justify-between w-full">
            <Button 
              variant="outline" 
              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 rounded-xl text-xs h-9"
              onClick={handleDownloadEfficiencyTemplate}
            >
              <Download className="w-4 h-4 mr-2" /> Tải file mẫu (.xlsx)
            </Button>
            <Button variant="ghost" onClick={() => setIsImportEfficiencyDialogOpen(false)} className="rounded-xl text-xs h-9">Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-500" />
              Lịch sử chỉnh sửa
            </DialogTitle>
            <DialogDescription>
              Chi tiết các thay đổi của: <strong>{historyTargetName}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {historyToView && historyToView.length > 0 ? (
                historyToView.slice().reverse().map((entry, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border-indigo-100">
                        {entry.action === 'UPDATE' ? 'CHỈNH SỬA' : entry.action === 'MERGE_ADD' ? 'GỘP THÊM' : entry.action}
                      </Badge>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {entry.timestamp ? format(new Date(entry.timestamp), 'dd/MM/yyyy HH:mm') : '-'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-700">{entry.editorName || entry.editorEmail}</p>
                      {entry.action === 'MERGE_ADD' ? (
                        <p className="text-[11px] text-slate-600">
                          Gộp thêm <span className="font-bold text-emerald-600">{entry.addedAmount?.toLocaleString()}đ</span> vào tổng <span className="font-bold">{entry.prevAmount?.toLocaleString()}đ</span>
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {entry.changes && Object.entries(entry.changes).map(([field, delta]: [string, any], cIdx) => (
                            <p key={cIdx} className="text-[11px] text-slate-600 flex flex-wrap gap-1 items-center">
                              <span className="font-medium text-slate-400">{field}:</span>
                              <span className="line-through text-slate-300">{delta.old?.toLocaleString()}</span>
                              <ArrowRight className="w-2.5 h-2.5 text-slate-300" />
                              <span className="font-bold text-indigo-600">{delta.new?.toLocaleString()}</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 italic text-sm">
                  Chưa có lịch sử chỉnh sửa cho bản ghi này
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={() => setIsHistoryDialogOpen(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Bottom Navigation for Mobile */}
      <nav className="lg:hidden fixed bottom-6 left-4 right-4 z-40">
        <div className="bg-white/80 backdrop-blur-2xl border border-white/40 shadow-2xl shadow-indigo-100/50 rounded-[28px] p-2 flex items-center justify-between">
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-2xl transition-all duration-300 ${activeTab === 'home' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <LayoutDashboard className={`w-5 h-5 ${activeTab === 'home' ? 'animate-in zoom-in duration-300' : ''}`} />
            <span className="text-[10px] font-black uppercase tracking-tighter">Trang chủ</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('register')}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-2xl transition-all duration-300 ${activeTab === 'register' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Wallet className={`w-5 h-5 ${activeTab === 'register' ? 'animate-in zoom-in duration-300' : ''}`} />
            <span className="text-[10px] font-black uppercase tracking-tighter">Budget</span>
          </button>

          <button 
            onClick={() => setActiveTab('actual')}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-2xl transition-all duration-300 ${activeTab === 'actual' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <TrendingUp className={`w-5 h-5 ${activeTab === 'actual' ? 'animate-in zoom-in duration-300' : ''}`} />
            <span className="text-[10px] font-black uppercase tracking-tighter">Chi phí</span>
          </button>

          {(isAdmin || isMod || isGDDA) && (
            <button 
              onClick={() => setActiveTab('admin')}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-2xl transition-all duration-300 ${activeTab === 'admin' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <ShieldCheck className={`w-5 h-5 ${activeTab === 'admin' ? 'animate-in zoom-in duration-300' : ''}`} />
              <span className="text-[10px] font-black uppercase tracking-tighter">Quản trị</span>
            </button>
          )}

          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-2xl transition-all duration-300 ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <History className={`w-5 h-5 ${activeTab === 'history' ? 'animate-in zoom-in duration-300' : ''}`} />
            <span className="text-[10px] font-black uppercase tracking-tighter">Nhật ký</span>
          </button>

          <button 
            onClick={() => setActiveTab('support')}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-2xl transition-all duration-300 relative ${activeTab === 'support' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <MessageCircle className={`w-5 h-5 ${activeTab === 'support' ? 'animate-in zoom-in duration-300' : ''}`} />
            <span className="text-[10px] font-black uppercase tracking-tighter">Hỗ trợ</span>
            {pendingSupportCount > 0 && (
              <span className="absolute top-1 right-4 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white ring-2 ring-white shadow-lg shadow-rose-200">
                {pendingSupportCount}
              </span>
            )}
          </button>
        </div>

        {/* Over Budget Detail Dialog */}
        <Dialog open={isOverBudgetDetailOpen} onOpenChange={setIsOverBudgetDetailOpen}>
          <DialogContent className="max-w-[95vw] md:max-w-4xl p-0 overflow-hidden rounded-[32px] border-none shadow-2xl bg-white animate-in fade-in zoom-in duration-300">
            <div className="bg-red-600 p-8 text-white relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-12 -mb-12 blur-xl" />
              
              <DialogTitle className="text-2xl font-black tracking-tight mb-1 relative z-10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                Chi tiết cảnh báo vượt ngân sách
              </DialogTitle>
              <p className="text-red-100 text-xs font-black uppercase tracking-widest relative z-10 leading-relaxed opacity-80">
                Danh sách các đơn vị có chi phí thực tế cao hơn ngân sách dự kiến ({overBudgetStats.count} mục)
              </p>
            </div>

            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
               <div className="grid grid-cols-1 gap-6">
                  {overBudgetStats.items.map((item: any) => (
                    <Card key={item.id} className="border border-red-100 bg-red-50/30 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group">
                      <CardHeader className="bg-red-50/50 p-6 border-b border-red-100">
                        <div className="flex items-center justify-between">
                           <div className="space-y-1">
                              <span className="text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-1">
                                 {efficiencyGroupType === 'project' ? <Building2 className="w-2.5 h-2.5" /> : <Users className="w-2.5 h-2.5" />}
                                 {item.mainName}
                              </span>
                              <h4 className="text-lg font-black text-red-900 leading-none flex items-center gap-2">
                                {efficiencyGroupType === 'project' ? <Users className="w-4 h-4 text-red-300" /> : <Building2 className="w-4 h-4 text-red-300" />}
                                {item.detailName}
                              </h4>
                           </div>
                           <Badge className="bg-red-600 text-white border-none py-1 px-3 rounded-xl text-xs font-black shadow-lg shadow-red-100 flex items-center gap-1.5 animate-pulse">
                              <TrendingUp className="w-3 h-3" />
                              Vượt {formatCurrency(item.excess)}
                           </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-red-100 border-b border-red-100">
                           <div className="p-4 text-center">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ngân sách</p>
                              <p className="text-base font-black text-slate-700">{formatCurrency(item.budget)}</p>
                           </div>
                           <div className="p-4 text-center bg-red-50/50">
                              <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Thực chi</p>
                              <p className="text-base font-black text-red-600">{formatCurrency(item.cost)}</p>
                           </div>
                           <div className="p-4 text-center">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tỷ lệ</p>
                              <p className="text-base font-black text-red-600">{(item.cost / item.budget * 100).toFixed(1)}%</p>
                           </div>
                           <div className="p-4 text-center">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Doanh số</p>
                              <p className="text-base font-black text-emerald-600">{item.sales} căn</p>
                           </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
               </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
              <Button 
                  onClick={() => setIsOverBudgetDetailOpen(false)}
                  className="h-12 px-10 bg-slate-900 hover:bg-black text-white font-black rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-95 uppercase tracking-widest text-xs"
              >
                  Đóng cửa sổ
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </nav>
    </div>
  );
}

/**
 * AcceptanceManager Component
 * Encapsulates the Acceptance tab logic and UI to improve performance and reduce input lag.
 */
const AcceptanceManager = React.memo(({ 
  isAdmin, isSuperAdmin, isMod, user, teams, projects, acceptances, finalAcceptances, teamMap, projectMap, 
  formatCurrency, getMarketingMonth, handleFirestoreError, formatCurrencyInput 
}: any) => {
  const [acceptanceSearch, setAcceptanceSearch] = useState('');
  const [acceptanceMonthFilter, setAcceptanceMonthFilter] = useState('all');
  const [acceptanceListView, setAcceptanceListView] = useState<'pending' | 'finalized'>('pending');
  const [isAddingAcceptance, setIsAddingAcceptance] = useState(false);
  const [editingAcceptance, setEditingAcceptance] = useState<any>(null);
  const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false);
  const [acceptanceToFinalize, setAcceptanceToFinalize] = useState<any>(null);

  // Form states (Local to this component to avoid App-wide lag)
  const [acceptanceMonth, setAcceptanceMonth] = useState('');
  const [acceptanceTeam, setAcceptanceTeam] = useState('');
  const [acceptanceProject, setAcceptanceProject] = useState('');
  
  // Dynamic line items (flat list)
  const [entries, setEntries] = useState<{ id: string; channel: string; account: string; amount: string; isConfirmed?: boolean; finalAmount?: number | null }[]>([
    { id: Math.random().toString(36).substring(7), channel: 'facebook', account: '', amount: '' }
  ]);

  const [acceptanceStatus, setAcceptanceStatus] = useState('Trước nghiệm thu');
  const [acceptanceType, setAcceptanceType] = useState('Chi phí không đổi');
  const [acceptanceRealCost, setAcceptanceRealCost] = useState('');
  const [selectedAcceptanceIds, setSelectedAcceptanceIds] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [acceptanceToDelete, setAcceptanceToDelete] = useState<string | null>(null);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isDeleteFinalDialogOpen, setIsDeleteFinalDialogOpen] = useState(false);
  const [finalAcceptanceToDelete, setFinalAcceptanceToDelete] = useState<string | null>(null);
  const [isDeletingAcceptance, setIsDeletingAcceptance] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState<string | null>(null);
  const [editingBreakdownValues, setEditingBreakdownValues] = useState<Record<string, string>>({});

  const addEntry = () => {
    setEntries(prev => [...prev, { id: Math.random().toString(36).substring(7), channel: 'facebook', account: '', amount: '' }]);
  };

  const removeEntry = (id: string) => {
    setEntries(prev => {
      if (prev.length <= 1) {
        return [{ id: Math.random().toString(36).substring(7), channel: 'facebook', account: '', amount: '' }];
      }
      return prev.filter(e => e.id !== id);
    });
  };

  const updateEntry = (id: string, field: 'channel' | 'account' | 'amount', value: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const calculateChannelTotal = (channelKey: string) => {
    return entries
      .filter(e => e.channel === channelKey)
      .reduce((sum, item) => {
        const val = parseFloat(item.amount.replace(/\./g, '')) || 0;
        return sum + val;
      }, 0);
  };

  const [expandingAcceptance, setExpandingAcceptance] = useState<string | null>(null);

  const handleToggleEntryConfirmation = async (acceptanceId: string, channel: string, itemIdx: number) => {
    const acc = acceptances.find((a: any) => a.id === acceptanceId);
    if (!acc) return;

    const newBreakdown = { ...acc.breakdown };
    if (!newBreakdown[channel]) return;
    
    const items = [...newBreakdown[channel]];
    if (!items[itemIdx]) return;
    
    const isCurrentlyConfirmed = items[itemIdx].isConfirmed || false;
    
    items[itemIdx] = {
      ...items[itemIdx],
      isConfirmed: !isCurrentlyConfirmed,
      finalAmount: !isCurrentlyConfirmed ? items[itemIdx].amount : null
    };
    newBreakdown[channel] = items;

    try {
      await updateDoc(doc(db, 'acceptances', acceptanceId), {
        breakdown: newBreakdown,
        updatedAt: serverTimestamp()
      });
      toast.success('Cập nhật trạng thái mục chi');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, 'acceptances');
    }
  };

  const handleUpdateEntryAmount = async (acceptanceId: string, channel: string, itemIdx: number, newAmount: number) => {
    const acc = acceptances.find((a: any) => a.id === acceptanceId);
    if (!acc) return;

    const newBreakdown = { ...acc.breakdown };
    if (!newBreakdown[channel]) return;
    
    const items = [...newBreakdown[channel]];
    if (!items[itemIdx]) return;
    
    items[itemIdx] = {
      ...items[itemIdx],
      finalAmount: newAmount,
      isConfirmed: true
    };
    newBreakdown[channel] = items;

    // Recalculate total after acceptance
    let newAfterAcceptanceTotal = 0;
    Object.keys(newBreakdown).forEach(ch => {
      newBreakdown[ch].forEach((it: any) => {
        newAfterAcceptanceTotal += (it.finalAmount !== undefined && it.finalAmount !== null) ? it.finalAmount : it.amount;
      });
    });

    try {
      await updateDoc(doc(db, 'acceptances', acceptanceId), {
        breakdown: newBreakdown,
        afterAcceptanceCost: newAfterAcceptanceTotal,
        updatedAt: serverTimestamp()
      });
      toast.success('Cập nhật chi phí thực tế thành công');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, 'acceptances');
    }
  };

  const toggleEntryConfirmation = (acceptanceId: string, channel: string, itemIdx: number) => {
    handleToggleEntryConfirmation(acceptanceId, channel, itemIdx);
  };

  const updateBreakdownAmount = (acceptanceId: string, channel: string, itemIdx: number, newAmount: string) => {
    const numericVal = parseFloat(newAmount.replace(/\./g, '')) || 0;
    handleUpdateEntryAmount(acceptanceId, channel, itemIdx, numericVal);
  };

  const filteredAcceptances = useMemo(() => {
    return acceptances.filter((a: any) => {
      const matchesSearch = 
        (a.projectName || '').toLowerCase().includes(acceptanceSearch.toLowerCase()) ||
        (a.teamName || '').toLowerCase().includes(acceptanceSearch.toLowerCase()) ||
        (a.teamCode || '').toLowerCase().includes(acceptanceSearch.toLowerCase());
      const matchesMonth = acceptanceMonthFilter === 'all' || a.month === acceptanceMonthFilter;
      const isPending = a.status !== 'Đã nghiệm thu';
      return matchesSearch && matchesMonth && isPending;
    });
  }, [acceptances, acceptanceSearch, acceptanceMonthFilter]);

  const filteredFinalAcceptances = useMemo(() => {
    return (finalAcceptances || []).filter((a: any) => {
      const matchesSearch = 
        (a.projectName || '').toLowerCase().includes(acceptanceSearch.toLowerCase()) ||
        (a.teamName || '').toLowerCase().includes(acceptanceSearch.toLowerCase()) ||
        (a.teamCode || '').toLowerCase().includes(acceptanceSearch.toLowerCase());
      const matchesMonth = acceptanceMonthFilter === 'all' || a.month === acceptanceMonthFilter;
      return matchesSearch && matchesMonth;
    });
  }, [finalAcceptances, acceptanceSearch, acceptanceMonthFilter]);

  const pendingTotals = useMemo(() => {
    return filteredAcceptances.reduce((acc, a) => ({
      total: acc.total + (a.totalCost || 0),
      after: acc.after + (a.afterAcceptanceCost || 0),
      fb: acc.fb + (a.facebookCost || 0),
      zalo: acc.zalo + (a.zaloCost || 0),
      google: acc.google + (a.googleCost || 0),
      posting: acc.posting + (a.postingCost || 0),
      other: acc.other + (a.otherCost + a.visaCost + a.digitalCost || 0)
    }), { total: 0, after: 0, fb: 0, zalo: 0, google: 0, posting: 0, other: 0 });
  }, [filteredAcceptances]);

  const finalizedTotals = useMemo(() => {
    return filteredFinalAcceptances.reduce((acc, a) => ({
      total: acc.total + (a.beforeAcceptanceCost || 0),
      after: acc.after + (a.totalActualCost || 0),
      fb: acc.fb + (a.facebookCost || 0),
      zalo: acc.zalo + (a.zaloCost || 0),
      google: acc.google + (a.googleCost || 0),
      posting: acc.posting + (a.postingCost || 0),
      other: acc.other + (a.otherCost + a.visaCost + a.digitalCost || 0)
    }), { total: 0, after: 0, fb: 0, zalo: 0, google: 0, posting: 0, other: 0 });
  }, [filteredFinalAcceptances]);

  const handleAddAcceptance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptanceMonth || !acceptanceTeam || !acceptanceProject) {
      toast.error('Vui lòng chọn đầy đủ Tháng, Đội và Dự án');
      return;
    }

    setIsAddingAcceptance(true);
    try {
      const fb = calculateChannelTotal('facebook');
      const zalo = calculateChannelTotal('zalo');
      const google = calculateChannelTotal('google');
      const posting = calculateChannelTotal('posting');
      const other = calculateChannelTotal('other');
      const visa = calculateChannelTotal('visa');
      const digital = calculateChannelTotal('digital');
      const realCost = parseFloat(acceptanceRealCost.replace(/\./g, '')) || 0;
      
      const beforeAcceptanceTotal = fb + zalo + google + posting + other + visa + digital;
      const afterTotal = (acceptanceStatus === 'Đã nghiệm thu' && acceptanceType === 'Chi phí thay đổi') ? realCost : beforeAcceptanceTotal;

      const team = teams.find((t: any) => t.id === acceptanceTeam);
      const project = projects.find((p: any) => p.id === acceptanceProject);

      // Process breakdown for storage (convert strings to numbers)
      const processedBreakdown: any = {};
      const channelKeys = ['facebook', 'zalo', 'google', 'posting', 'visa', 'digital', 'other'];
      
      channelKeys.forEach(key => {
        processedBreakdown[key] = entries
          .filter(e => e.channel === key && (e.account.trim() !== '' || e.amount.trim() !== ''))
          .map(e => ({
            account: e.account,
            amount: parseFloat(e.amount.replace(/\./g, '')) || 0,
            isConfirmed: e.isConfirmed || false,
            finalAmount: e.finalAmount !== undefined ? e.finalAmount : null
          }));
      });

      const payload = {
        month: acceptanceMonth,
        teamId: acceptanceTeam,
        teamName: team?.name || '',
        teamCode: team?.teamCode || '',
        projectId: acceptanceProject,
        projectName: project?.name || '',
        projectCode: project?.projectCode || '',
        facebookCost: fb,
        zaloCost: zalo,
        googleCost: google,
        postingCost: posting,
        otherCost: other,
        visaCost: visa,
        digitalCost: digital,
        totalCost: beforeAcceptanceTotal,
        beforeAcceptanceCost: beforeAcceptanceTotal,
        afterAcceptanceCost: afterTotal,
        status: acceptanceStatus,
        acceptanceType: acceptanceStatus === 'Đã nghiệm thu' ? acceptanceType : null,
        breakdown: processedBreakdown,
        updatedAt: serverTimestamp(),
        updatedBy: user?.email || '',
        updatedByUid: user?.uid || ''
      };

      if (editingAcceptance) {
        await updateDoc(doc(db, 'acceptances', editingAcceptance.id), payload);
        toast.success('Cập nhật nghiệm thu thành công');
        setEditingAcceptance(null);
      } else {
        await addDoc(collection(db, 'acceptances'), {
          ...payload,
          createdAt: serverTimestamp(),
          createdBy: user?.email || '',
          createdByUid: user?.uid || ''
        });
        toast.success('Thêm bản ghi nghiệm thu thành công');
      }

      // Reset form
      setAcceptanceTeam('');
      setAcceptanceProject('');
      setEntries([{ id: Math.random().toString(36).substring(7), channel: 'facebook', account: '', amount: '' }]);
      setAcceptanceRealCost('');
      setAcceptanceStatus('Trước nghiệm thu');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, 'acceptances');
    } finally {
      setIsAddingAcceptance(false);
    }
  };

  const handleDeleteAcceptance = async (id: string) => {
    if (!id) return;
    setIsDeletingAcceptance(true);
    const toastId = toast.loading('Đang xóa bản ghi...');
    try {
      await deleteDoc(doc(db, 'acceptances', id));
      toast.success('Xóa bản ghi thành công', { id: toastId });
      setIsDeleteDialogOpen(false);
      setAcceptanceToDelete(null);
    } catch (error: any) {
      console.error("Delete error:", error);
      handleFirestoreError(error, OperationType.DELETE, 'acceptances');
      toast.error('Không thể xóa. Vui lòng kiểm tra quyền hạn của Admin.', { id: toastId });
    } finally {
      setIsDeletingAcceptance(false);
    }
  };

  const handleBulkDeleteAcceptances = async () => {
    if (selectedAcceptanceIds.length === 0) return;
    setIsDeletingAcceptance(true);
    const toastId = toast.loading(`Đang xóa ${selectedAcceptanceIds.length} bản ghi...`);
    try {
      const batch = writeBatch(db);
      selectedAcceptanceIds.forEach(id => {
        batch.delete(doc(db, 'acceptances', id));
      });
      await batch.commit();
      const count = selectedAcceptanceIds.length;
      setSelectedAcceptanceIds([]);
      toast.success(`Đã xóa thành công ${count} bản ghi`, { id: toastId });
      setIsBulkDeleteDialogOpen(false);
    } catch (error: any) {
      console.error("Bulk delete error:", error);
      handleFirestoreError(error, OperationType.DELETE, 'acceptances');
      toast.error('Không thể xóa hàng loạt. Vui lòng kiểm tra quyền hạn.', { id: toastId });
    } finally {
      setIsDeletingAcceptance(false);
    }
  };

  const handleDeleteFinalAcceptance = async (id: string) => {
    if (!id) return;
    setIsDeletingAcceptance(true);
    const toastId = toast.loading('Đang xóa bản ghi thực tế...');
    try {
      await deleteDoc(doc(db, 'finalAcceptances', id));
      toast.success('Đã xóa bản ghi thực tế', { id: toastId });
      setIsDeleteFinalDialogOpen(false);
      setFinalAcceptanceToDelete(null);
    } catch (error: any) {
      console.error("Final delete error:", error);
      handleFirestoreError(error, OperationType.DELETE, 'finalAcceptances');
      toast.error('Lỗi khi xóa bản ghi thực tế.', { id: toastId });
    } finally {
      setIsDeletingAcceptance(false);
    }
  };

  const handleFinalizeAcceptance = async (acc: any) => {
    if (!acc) return;
    
    setIsFinalizing(acc.id);
    const toastId = toast.loading('Đàng xử lý chốt số liệu quyết toán...');
    try {
      const breakdown = acc.breakdown || {};
      
      const finalPayload = {
        originalAcceptanceId: acc.id,
        month: acc.month || '',
        teamId: acc.teamId || '',
        teamName: acc.teamName || '',
        teamCode: acc.teamCode || '',
        projectId: acc.projectId || '',
        projectName: acc.projectName || '',
        projectCode: acc.projectCode || '',
        facebookCost: acc.facebookCost || 0,
        zaloCost: acc.zaloCost || 0,
        googleCost: acc.googleCost || 0,
        postingCost: acc.postingCost || 0,
        otherCost: acc.otherCost || 0,
        visaCost: acc.visaCost || 0,
        digitalCost: acc.digitalCost || 0,
        breakdown: breakdown,
        totalActualCost: acc.afterAcceptanceCost || 0,
        beforeAcceptanceCost: acc.beforeAcceptanceCost || 0,
        finalizedAt: serverTimestamp(),
        finalizedBy: user?.email || '',
        finalizedByUid: user?.uid || '',
        status: 'Đã nghiệm thu'
      };
      
      // 1. Add to finalAcceptances
      await addDoc(collection(db, 'finalAcceptances'), finalPayload);
      
      // 2. Mark original as finalized
      await updateDoc(doc(db, 'acceptances', acc.id), {
        status: 'Đã nghiệm thu',
        finalizedAt: serverTimestamp(),
        finalizedBy: user?.email || '',
        updatedAt: serverTimestamp(),
        updatedBy: user?.email || '',
        updatedByUid: user?.uid || ''
      });
      
      toast.success('Đã chốt số liệu và quyết toán thành công!', { id: toastId });
      setExpandingAcceptance(null);
    } catch (error: any) {
      console.error("Finalize error:", error);
      handleFirestoreError(error, OperationType.WRITE, 'finalAcceptances');
      toast.error('Lỗi khi chốt số liệu. Vui lòng thử lại.', { id: toastId });
    } finally {
      setIsFinalizing(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <Card className="border-none shadow-2xl shadow-slate-200/60 bg-white overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 w-full" />
          <CardHeader className="pb-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <CheckSquare className="w-5 h-5 text-indigo-600" />
              </div>
              <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Nghiệm Thu</CardTitle>
            </div>
            <CardDescription className="text-slate-500 font-medium font-inter">Nhập chi tiết nghiệm thu marketing hàng tháng</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleAddAcceptance} className="space-y-6">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kỳ báo cáo tháng</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select 
                      value={acceptanceMonth ? acceptanceMonth.split('-')[0] : ''} 
                      onValueChange={(val) => {
                        const current = acceptanceMonth || format(new Date(), 'yyyy-MM');
                        const [, m] = current.split('-');
                        setAcceptanceMonth(`${val}-${m}`);
                      }}
                    >
                      <SelectTrigger className="h-11 bg-slate-50 border-none rounded-xl font-bold">
                        <SelectValue placeholder="Năm" />
                      </SelectTrigger>
                      <SelectContent>
                        {[2024, 2025, 2026, 2027, 2028].map(y => (
                          <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select 
                      value={acceptanceMonth ? acceptanceMonth.split('-')[1] : ''} 
                      onValueChange={(val) => {
                        const current = acceptanceMonth || format(new Date(), 'yyyy-MM');
                        const [y] = current.split('-');
                        setAcceptanceMonth(`${y}-${val}`);
                      }}
                    >
                      <SelectTrigger className="h-11 bg-slate-50 border-none rounded-xl font-bold">
                        <SelectValue placeholder="Tháng" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(m => (
                          <SelectItem key={m} value={m}>Tháng {m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Đội (Team)</Label>
                    <SearchableAcceptanceTeamSelect 
                      value={acceptanceTeam} 
                      onValueChange={setAcceptanceTeam} 
                      teams={teams} 
                      teamMap={teamMap} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dự án (Project)</Label>
                    <SearchableAcceptanceProjectSelect 
                      value={acceptanceProject} 
                      onValueChange={setAcceptanceProject} 
                      projects={projects} 
                      projectMap={projectMap} 
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chi tiết khoản chi</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={addEntry}
                      className="h-8 rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-black text-[10px] uppercase gap-1.5"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Thêm khoản chi
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {entries.map((entry, idx) => (
                      <div key={entry.id} className="flex flex-col gap-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-3">
                          <div className="w-[140px]">
                            <Select 
                              value={entry.channel} 
                              onValueChange={(val) => updateEntry(entry.id, 'channel', val)}
                            >
                              <SelectTrigger className="h-9 bg-white border-slate-200 rounded-xl text-[10px] font-black uppercase">
                                <SelectValue placeholder="Kênh..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="facebook">Facebook</SelectItem>
                                <SelectItem value="zalo">Zalo</SelectItem>
                                <SelectItem value="google">Google</SelectItem>
                                <SelectItem value="posting">Đăng tin</SelectItem>
                                <SelectItem value="visa">Visa</SelectItem>
                                <SelectItem value="digital">Digital</SelectItem>
                                <SelectItem value="other">Khác</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1">
                            <Input 
                              placeholder="Tên tài khoản / Ghi chú..." 
                              className="h-9 bg-white border-slate-200 rounded-xl text-xs font-bold focus:border-indigo-300"
                              value={entry.account}
                              onChange={e => updateEntry(entry.id, 'account', e.target.value)}
                            />
                          </div>
                          <div className="w-[140px] relative">
                            <Input 
                              placeholder="Số tiền..." 
                              className="h-9 bg-white border-slate-200 rounded-xl text-xs font-mono text-right pr-4 font-black text-indigo-700"
                              value={entry.amount}
                              onChange={e => updateEntry(entry.id, 'amount', formatCurrencyInput(e.target.value))}
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-300 font-bold">đ</span>
                          </div>
                          {entries.length > 1 && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full"
                              onClick={() => removeEntry(entry.id)}
                            >
                              <MinusCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                    <div className="p-4 bg-indigo-50 rounded-2xl flex items-center justify-between border border-indigo-100 shadow-sm">
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Tổng chi tạm tính</span>
                      <span className="text-lg font-black text-indigo-700 font-mono italic">
                        {formatCurrency(entries.reduce((sum, e) => sum + (parseFloat(e.amount.replace(/\./g, '')) || 0), 0))}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Trạng thái</Label>
                      <Select value={acceptanceStatus} onValueChange={setAcceptanceStatus}>
                        <SelectTrigger className="h-11 bg-slate-50 border-none rounded-xl font-bold">
                          <SelectValue placeholder="Chọn trạng thái" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Trước nghiệm thu">Trước nghiệm thu</SelectItem>
                          <SelectItem value="Đã nghiệm thu">Đã nghiệm thu</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {acceptanceStatus === 'Đã nghiệm thu' && (
                      <div className="animate-in slide-in-from-top-2 duration-300 space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Loại nghiệm thu</Label>
                          <Select value={acceptanceType} onValueChange={setAcceptanceType}>
                            <SelectTrigger className="h-11 bg-white border-slate-200 rounded-xl font-bold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Chi phí không đổi">Chi phí không đổi</SelectItem>
                              <SelectItem value="Chi phí thay đổi">Chi phí thay đổi</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {acceptanceType === 'Chi phí thay đổi' && (
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chi phí thực tế sau NT</Label>
                            <Input 
                              className="h-11 bg-indigo-50 border-indigo-200 rounded-xl font-black text-indigo-700 text-lg" 
                              placeholder="Nhập chi phí thực tế..." 
                              value={acceptanceRealCost}
                              onChange={e => setAcceptanceRealCost(formatCurrencyInput(e.target.value))}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4">
                  <Button 
                    type="submit" 
                    className={`w-full h-11 rounded-xl font-black text-sm transition-all shadow-lg ${
                      editingAcceptance ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                    }`}
                    disabled={isAddingAcceptance}
                  >
                    {isAddingAcceptance ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : editingAcceptance ? (
                      'Cập nhật Nghiệm thu'
                    ) : (
                      'Lưu Nghiệm thu'
                    )}
                  </Button>
                  {editingAcceptance && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      className="w-full mt-2 text-slate-400 font-bold"
                      onClick={() => {
                        setEditingAcceptance(null);
                        setAcceptanceMonth('');
                        setAcceptanceTeam('');
                        setAcceptanceProject('');
                        setEntries([{ id: Math.random().toString(36).substring(7), channel: 'facebook', account: '', amount: '' }]);
                        setAcceptanceRealCost('');
                        setAcceptanceStatus('Trước nghiệm thu');
                        setAcceptanceType('Chi phí không đổi');
                      }}
                    >
                      Hủy chỉnh sửa
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-col space-y-4 pb-6">
              <div className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Quản lý Nghiệm thu</CardTitle>
                  <CardDescription className="text-slate-500 font-medium tracking-tight">Chi tiết báo cáo và quyết toán chi phí hàng tháng</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  {selectedAcceptanceIds.length > 0 && (isAdmin || isSuperAdmin) && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="h-10 px-4 rounded-xl font-black text-[10px] uppercase gap-2 shadow-lg shadow-red-100 animate-in zoom-in duration-300"
                      onClick={() => setIsBulkDeleteDialogOpen(true)}
                    >
                      <Trash2 className="w-4 h-4" /> Xóa {selectedAcceptanceIds.length} bản ghi
                    </Button>
                  )}
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className={`text-[10px] font-black uppercase h-8 rounded-lg px-4 ${acceptanceListView === 'pending' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
                      onClick={() => setAcceptanceListView('pending')}
                    >
                      Chưa nghiệm thu
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className={`text-[10px] font-black uppercase h-8 rounded-lg px-4 ${acceptanceListView === 'finalized' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500'}`}
                      onClick={() => setAcceptanceListView('finalized')}
                    >
                      Đã nghiệm thu
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Tìm dự án, đội ngũ..." 
                    className="pl-10 h-10 bg-slate-50 border-none rounded-xl text-xs font-bold"
                    value={acceptanceSearch}
                    onChange={(e) => setAcceptanceSearch(e.target.value)}
                  />
                </div>
                <Select value={acceptanceMonthFilter} onValueChange={setAcceptanceMonthFilter}>
                  <SelectTrigger className="h-10 w-[160px] bg-slate-50 border-none rounded-xl text-xs font-bold">
                    <SelectValue placeholder="Lọc theo tháng" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả tháng</SelectItem>
                    {Array.from(new Set(acceptances.map((a: any) => a.month))).sort().reverse().map((m: any) => (
                      <SelectItem key={m} value={m}>Tháng {m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {acceptanceListView === 'pending' ? (
                <Table>
                  <TableHeader className="bg-slate-50/80">
                  <TableRow>
                     {(isAdmin || isSuperAdmin) && (
                       <TableHead className="w-[40px] px-4">
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-300 h-4 w-4"
                            checked={filteredAcceptances.length > 0 && selectedAcceptanceIds.length === filteredAcceptances.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAcceptanceIds(filteredAcceptances.map((a: any) => a.id));
                              } else {
                                setSelectedAcceptanceIds([]);
                              }
                            }}
                          />
                       </TableHead>
                     )}
                     <TableHead className="text-center w-[40px] font-black text-[10px] text-slate-400 uppercase">STT</TableHead>
                     <TableHead className="min-w-[150px] font-black text-[10px] text-slate-400 uppercase">Team / Dự án</TableHead>
                     <TableHead className="text-right font-black text-[10px] text-slate-400 uppercase">Facebook</TableHead>
                     <TableHead className="text-right font-black text-[10px] text-slate-400 uppercase">Zalo</TableHead>
                     <TableHead className="text-right font-black text-[10px] text-slate-400 uppercase">Google</TableHead>
                     <TableHead className="text-right font-black text-[10px] text-slate-400 uppercase">Đăng tin</TableHead>
                     <TableHead className="text-right font-black text-[10px] text-slate-400 uppercase">Khác</TableHead>
                     <TableHead className="text-right font-black text-[10px] bg-amber-50/50 text-amber-600 uppercase">Tạm tính</TableHead>
                     <TableHead className="text-right font-black text-[10px] bg-emerald-50/50 text-emerald-600 uppercase">Thực thu</TableHead>
                     <TableHead className="text-center font-black text-[10px] text-slate-400 uppercase">Trạng thái</TableHead>
                     <TableHead className="text-right font-black text-[10px] text-slate-400 uppercase pr-4">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAcceptances.map((a: any, index: number) => (
                    <React.Fragment key={a.id}>
                      <TableRow className={`hover:bg-slate-50/50 transition-colors group ${expandingAcceptance === a.id ? 'bg-indigo-50/30' : ''}`}>
                        {(isAdmin || isSuperAdmin) && (
                          <TableCell className="px-4">
                            <input 
                              type="checkbox" 
                              className="rounded border-slate-300 h-4 w-4"
                              checked={selectedAcceptanceIds.includes(a.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAcceptanceIds(prev => [...prev, a.id]);
                                } else {
                                  setSelectedAcceptanceIds(prev => prev.filter(id => id !== a.id));
                                }
                              }}
                            />
                          </TableCell>
                        )}
                        <TableCell className="text-center font-mono text-[10px] text-slate-400">{index + 1}</TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-900 text-xs truncate max-w-[150px]">{a.projectName}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[9px] h-4 px-1 border-slate-200 text-slate-500 font-bold">{a.teamName}</Badge>
                              <span className="text-[9px] font-bold text-slate-400">{a.month}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-[10px] font-bold text-slate-600">{formatCurrency(a.facebookCost)}</TableCell>
                        <TableCell className="text-right font-mono text-[10px] font-bold text-slate-600">{formatCurrency(a.zaloCost)}</TableCell>
                        <TableCell className="text-right font-mono text-[10px] font-bold text-slate-600">{formatCurrency(a.googleCost)}</TableCell>
                        <TableCell className="text-right font-mono text-[10px] font-bold text-slate-600">{formatCurrency(a.postingCost)}</TableCell>
                        <TableCell className="text-right font-mono text-[10px] font-bold text-slate-600">{formatCurrency(a.otherCost + a.visaCost + a.digitalCost)}</TableCell>
                        <TableCell className="text-right bg-amber-50/30">
                          <p className="font-mono text-xs font-black text-amber-700">{formatCurrency(a.totalCost)}</p>
                        </TableCell>
                        <TableCell className="text-right bg-emerald-50/30">
                          <p className="font-mono text-xs font-black text-emerald-700">
                             {a.status === 'Đã nghiệm thu' ? formatCurrency(a.afterAcceptanceCost) : '-'}
                          </p>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border-none ${
                            a.status === 'Đã nghiệm thu' 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {a.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant={a.status !== 'Đã nghiệm thu' ? "default" : "ghost"}
                              size="sm"
                              className={`h-8 px-2 text-[10px] font-black uppercase rounded-lg transition-all ${
                                a.status !== 'Đã nghiệm thu' 
                                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100' 
                                  : 'text-slate-400 hover:text-indigo-600'
                              } ${expandingAcceptance === a.id ? 'ring-2 ring-indigo-200 ring-offset-1' : ''}`}
                              onClick={() => setExpandingAcceptance(expandingAcceptance === a.id ? null : a.id)}
                            >
                              {a.status !== 'Đã nghiệm thu' ? 'Nghiệm thu' : 'Chi tiết'}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-400 hover:text-indigo-600"
                              onClick={() => {
                                setEditingAcceptance(a);
                                setAcceptanceMonth(a.month);
                                setAcceptanceTeam(a.teamId);
                                setAcceptanceProject(a.projectId);
                                
                                const flatEntries: any[] = [];
                                if (a.breakdown) {
                                  Object.keys(a.breakdown).forEach(channel => {
                                    if (Array.isArray(a.breakdown[channel])) {
                                      a.breakdown[channel].forEach((item: any) => {
                                        flatEntries.push({
                                          id: Math.random().toString(36).substring(7),
                                          channel,
                                          account: item.account || '',
                                          amount: formatCurrencyInput(String(item.amount || 0)),
                                          isConfirmed: item.isConfirmed || false,
                                          finalAmount: item.finalAmount
                                        });
                                      });
                                    }
                                  });
                                }
                                
                                if (flatEntries.length === 0) {
                                  const legacyFields = [
                                    { key: 'facebook', val: a.facebookCost },
                                    { key: 'zalo', val: a.zaloCost },
                                    { key: 'google', val: a.googleCost },
                                    { key: 'posting', val: a.postingCost },
                                    { key: 'visa', val: a.visaCost },
                                    { key: 'digital', val: a.digitalCost },
                                    { key: 'other', val: a.otherCost },
                                  ];
                                  legacyFields.forEach(f => {
                                    if (f.val > 0) {
                                      flatEntries.push({
                                        id: Math.random().toString(36).substring(7),
                                        channel: f.key,
                                        account: 'Hệ thống',
                                        amount: formatCurrencyInput(String(f.val))
                                      });
                                    }
                                  });
                                }
                                setEntries(flatEntries.length > 0 ? flatEntries : [{ id: Math.random().toString(36).substring(7), channel: 'facebook', account: '', amount: '' }]);
                                setAcceptanceStatus(a.status);
                                setAcceptanceType(a.acceptanceType || 'Chi phí không đổi');
                                setAcceptanceRealCost(formatCurrencyInput(String(a.afterAcceptanceCost)));
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            {(isAdmin || isSuperAdmin) && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-slate-400 hover:text-red-600 transition-colors"
                                onClick={() => {
                                  setAcceptanceToDelete(a.id);
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandingAcceptance === a.id && (
                        <TableRow className="bg-indigo-50/20 border-t-0 animate-in slide-in-from-top-1 duration-300">
                          <TableCell colSpan={(isAdmin || isSuperAdmin) ? 12 : 11} className="p-0">
                            <div className="p-6 border-x-2 border-indigo-200/50 m-2 bg-white rounded-2xl shadow-xl shadow-indigo-100/50">
                               <div className="grid grid-cols-2 gap-8">
                                 <div className="space-y-4">
                                   <div className="flex items-center gap-2 mb-2">
                                     <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                                     <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest px-1">Chi tiết phân bổ chi phí</h4>
                                   </div>
                                   <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                      {Object.keys(a.breakdown || {}).map(channel => (
                                        <div key={channel} className="space-y-1">
                                          {(a.breakdown[channel] || []).map((item: any, i: number) => (
                                            <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${item.isConfirmed ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'} hover:border-indigo-200 transition-colors`}>
                                              <div className="flex items-center gap-3">
                                                <Badge variant="outline" className="text-[9px] font-black uppercase bg-white">{channel}</Badge>
                                                <span className="text-xs font-bold text-slate-700">{item.account}</span>
                                              </div>
                                              <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                  <p className="text-[10px] font-black text-slate-400 line-through opacity-50">{formatCurrency(item.amount)}</p>
                                                  <p className="text-xs font-black text-indigo-600">{formatCurrency(item.finalAmount || item.amount)}</p>
                                                </div>
                                                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-100">
                                                  <Button 
                                                    size="icon" 
                                                    variant="ghost" 
                                                    className={`h-6 w-10 text-[9px] font-black ${item.isConfirmed ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-indigo-600'}`}
                                                    onClick={() => toggleEntryConfirmation(a.id, channel, i)}
                                                  >
                                                    {item.isConfirmed ? 'OK' : 'Xác nhận'}
                                                  </Button>
                                                  <Input 
                                                    className="w-24 h-6 text-right text-[10px] font-black font-mono border-none bg-slate-50 rounded"
                                                    value={editingBreakdownValues[`${a.id}-${channel}-${i}`] || formatCurrencyInput(String(item.finalAmount || item.amount))}
                                                    onChange={e => {
                                                      const val = formatCurrencyInput(e.target.value);
                                                      setEditingBreakdownValues(prev => ({...prev, [`${a.id}-${channel}-${i}`]: val}));
                                                      updateBreakdownAmount(a.id, channel, i, val);
                                                    }}
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ))}
                                   </div>
                                 </div>

                                 <div className="space-y-6">
                                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loại NT</span>
                                        <Select 
                                          value={a.acceptanceType || 'Chi phí không đổi'} 
                                          onValueChange={(val) => {
                                            updateDoc(doc(db, 'acceptances', a.id), { 
                                              acceptanceType: val,
                                              afterAcceptanceCost: val === 'Chi phí không đổi' ? a.totalCost : a.afterAcceptanceCost
                                            });
                                          }}
                                        >
                                          <SelectTrigger className="w-[160px] h-8 bg-white border-slate-200 rounded-lg text-[10px] font-black uppercase">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="Chi phí không đổi">Chi phí không đổi</SelectItem>
                                            <SelectItem value="Chi phí thay đổi">Chi phí thay đổi</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiền thực NT</span>
                                        <div className="w-[160px] relative">
                                          <Input 
                                            className="h-8 text-right font-black font-mono text-indigo-700 bg-white border-slate-200 rounded-lg pr-4"
                                            value={formatCurrency(a.afterAcceptanceCost)}
                                            readOnly 
                                          />
                                        </div>
                                      </div>

                                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Lệch quyết toán</span>
                                        <span className={`text-xs font-black font-mono ${(a.afterAcceptanceCost - a.totalCost) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                          {(a.afterAcceptanceCost - a.totalCost) > 0 ? '+' : ''}{formatCurrency(a.afterAcceptanceCost - a.totalCost)}
                                        </span>
                                      </div>
                                   </div>

                                   <Button 
                                      className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-100 transition-all gap-2"
                                      disabled={isFinalizing === a.id}
                                      onClick={() => {
                                        setAcceptanceToFinalize(a);
                                        setIsFinalizeDialogOpen(true);
                                      }}
                                   >
                                      {isFinalizing === a.id ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                                      Chốt số liệu
                                   </Button>
                                   <p className="text-[9px] text-center text-slate-400 font-bold px-4 italic leading-relaxed uppercase tracking-tighter">
                                     Hành động này sẽ đóng bảng nghiệm thu tháng này và chuyển dữ liệu sang báo cáo thực tế chính thức
                                   </p>
                                 </div>
                               </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                  {filteredAcceptances.length > 0 && (
                    <TableRow className="bg-slate-50/50 border-t-2 border-slate-100">
                      <TableCell colSpan={(isAdmin || isSuperAdmin) ? 3 : 2} className="text-right font-black text-[10px] text-slate-400 uppercase tracking-wider">TỔNG CỘNG</TableCell>
                      <TableCell className="text-right font-mono text-[10px] font-black text-indigo-600">{formatCurrency(pendingTotals.fb)}</TableCell>
                      <TableCell className="text-right font-mono text-[10px] font-black text-indigo-600">{formatCurrency(pendingTotals.zalo)}</TableCell>
                      <TableCell className="text-right font-mono text-[10px] font-black text-indigo-600">{formatCurrency(pendingTotals.google)}</TableCell>
                      <TableCell className="text-right font-mono text-[10px] font-black text-indigo-600">{formatCurrency(pendingTotals.posting)}</TableCell>
                      <TableCell className="text-right font-mono text-[10px] font-black text-indigo-600">{formatCurrency(pendingTotals.other)}</TableCell>
                      <TableCell className="text-right font-mono text-[10px] font-black text-slate-400">{formatCurrency(pendingTotals.total)}</TableCell>
                      <TableCell className="text-right bg-emerald-50/30">
                        <p className="font-mono text-xs font-black text-emerald-700">{formatCurrency(pendingTotals.after)}</p>
                      </TableCell>
                      <TableCell colSpan={2}></TableCell>
                    </TableRow>
                  )}
                  {filteredAcceptances.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={(isAdmin || isSuperAdmin) ? 12 : 11} className="h-40 text-center text-slate-300 italic">
                        Không tìm thấy dữ liệu nghiệm thu phù hợp
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            ) : (              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                     <TableHead className="text-center w-[40px] font-black text-[10px] text-slate-400 uppercase">STT</TableHead>
                     <TableHead className="min-w-[150px] font-black text-[10px] text-slate-400 uppercase">Team / Dự án</TableHead>
                     <TableHead className="text-right font-black text-[10px] text-slate-400 uppercase">Facebook</TableHead>
                     <TableHead className="text-right font-black text-[10px] text-slate-400 uppercase">Zalo</TableHead>
                     <TableHead className="text-right font-black text-[10px] text-slate-400 uppercase">Google</TableHead>
                     <TableHead className="text-right font-black text-[10px] text-slate-400 uppercase">Đăng tin</TableHead>
                     <TableHead className="text-right font-black text-[10px] text-slate-400 uppercase">Khác</TableHead>
                     <TableHead className="text-right font-black text-[10px] bg-emerald-50/50 text-emerald-600 uppercase">Quyết toán</TableHead>
                     <TableHead className="text-center font-black text-[10px] text-slate-400 uppercase">Trạng thái</TableHead>
                     <TableHead className="text-right font-black text-[10px] text-slate-400 uppercase pr-4">Ngày chốt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFinalAcceptances.map((a: any, index: number) => (
                    <TableRow key={a.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="text-center font-mono text-[10px] text-slate-400">{index + 1}</TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900 text-xs truncate max-w-[150px]">{a.projectName}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px] h-4 px-1 border-slate-200 text-slate-500 font-bold">{a.teamName}</Badge>
                            <span className="text-[9px] font-bold text-slate-400">{a.month}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-[10px] font-bold text-slate-600">{formatCurrency(a.facebookCost || 0)}</TableCell>
                      <TableCell className="text-right font-mono text-[10px] font-bold text-slate-600">{formatCurrency(a.zaloCost || 0)}</TableCell>
                      <TableCell className="text-right font-mono text-[10px] font-bold text-slate-600">{formatCurrency(a.googleCost || 0)}</TableCell>
                      <TableCell className="text-right font-mono text-[10px] font-bold text-slate-600">{formatCurrency(a.postingCost || 0)}</TableCell>
                      <TableCell className="text-right font-mono text-[10px] font-bold text-slate-600">{formatCurrency((a.otherCost || 0) + (a.visaCost || 0) + (a.digitalCost || 0))}</TableCell>
                      <TableCell className="text-right bg-emerald-50/30">
                        <p className="font-mono text-xs font-black text-emerald-700">{formatCurrency(a.totalActualCost)}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border-none bg-emerald-100 text-emerald-700">
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold text-slate-500">
                            {a.finalizedAt ? format(a.finalizedAt.toDate ? a.finalizedAt.toDate() : new Date(a.finalizedAt), 'dd/MM/yyyy HH:mm') : '-'}
                          </span>
                          {a.finalizedBy && (
                            <span className="text-[8px] font-black text-slate-300 uppercase truncate max-w-[100px]">
                              {a.finalizedBy.split('@')[0]}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        {(isAdmin || isSuperAdmin) && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors rounded-full"
                            onClick={() => {
                              setFinalAcceptanceToDelete(a.id);
                              setIsDeleteFinalDialogOpen(true);
                             }}
                           >
                             <Trash2 className="h-3.5 w-3.5" />
                           </Button>
                         )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredFinalAcceptances.length > 0 && (
                    <TableRow className="bg-emerald-50/20 border-t-2 border-emerald-100">
                      <TableCell colSpan={2} className="text-right font-black text-[10px] text-emerald-600 uppercase tracking-wider">TỔNG CỘNG</TableCell>
                      <TableCell className="text-right font-mono text-[10px] font-black text-emerald-700">{formatCurrency(finalizedTotals.fb)}</TableCell>
                      <TableCell className="text-right font-mono text-[10px] font-black text-emerald-700">{formatCurrency(finalizedTotals.zalo)}</TableCell>
                      <TableCell className="text-right font-mono text-[10px] font-black text-emerald-700">{formatCurrency(finalizedTotals.google)}</TableCell>
                      <TableCell className="text-right font-mono text-[10px] font-black text-emerald-700">{formatCurrency(finalizedTotals.posting)}</TableCell>
                      <TableCell className="text-right font-mono text-[10px] font-black text-emerald-700">{formatCurrency(finalizedTotals.other)}</TableCell>
                      <TableCell className="text-right bg-emerald-100/30">
                        <p className="font-mono text-xs font-black text-emerald-800">{formatCurrency(finalizedTotals.after)}</p>
                      </TableCell>
                      <TableCell colSpan={3}></TableCell>
                    </TableRow>
                  )}
                  {filteredFinalAcceptances.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="h-40 text-center text-slate-300 italic">
                        Chưa có dữ liệu đã quyết toán
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-white p-8 space-y-6">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto ring-8 ring-rose-50/30">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            <div className="space-y-2 text-center">
              <h3 className="text-xl font-black text-slate-900 leading-none">Xác nhận xóa?</h3>
              <p className="text-sm font-bold text-slate-500 leading-relaxed px-4">
                Hành động này không thể hoàn tác. Dữ liệu nghiệm thu sẽ bị xóa vĩnh viễn khỏi hệ thống.
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 h-12 rounded-2xl border-slate-200 text-slate-600 font-black tracking-wide"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Hủy bỏ
              </Button>
              <Button 
                className="flex-1 h-12 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black tracking-wide shadow-lg shadow-rose-200"
                onClick={() => acceptanceToDelete && handleDeleteAcceptance(acceptanceToDelete)}
              >
                Xác nhận xóa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-white p-8 space-y-6">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto ring-8 ring-rose-50/30">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            <div className="space-y-2 text-center">
              <h3 className="text-xl font-black text-slate-900 leading-none">Xóa hàng loạt?</h3>
              <p className="text-sm font-bold text-slate-500 leading-relaxed px-4">
                Bạn đang chuẩn bị xóa <span className="text-rose-600 font-black">{selectedAcceptanceIds.length}</span> bản ghi đã chọn. Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 h-12 rounded-2xl border-slate-200 text-slate-600 font-black tracking-wide"
                onClick={() => setIsBulkDeleteDialogOpen(false)}
              >
                Hủy bỏ
              </Button>
              <Button 
                className="flex-1 h-12 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black tracking-wide shadow-lg shadow-rose-200"
                onClick={handleBulkDeleteAcceptances}
              >
                Xác nhận xóa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isDeleteFinalDialogOpen} onOpenChange={setIsDeleteFinalDialogOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-white p-8 space-y-6">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto ring-8 ring-rose-50/30">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            <div className="space-y-2 text-center">
              <h3 className="text-xl font-black text-slate-900 leading-none">Xóa bản ghi đã chốt?</h3>
              <p className="text-sm font-bold text-slate-500 leading-relaxed px-4">
                Bản ghi này đã được quyết toán. Việc xóa sẽ làm mất dấu vết lịch sử tài chính. Bạn có chắc chắn?
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 h-12 rounded-2xl border-slate-200 text-slate-600 font-black tracking-wide"
                onClick={() => setIsDeleteFinalDialogOpen(false)}
              >
                Hủy bỏ
              </Button>
              <Button 
                className="flex-1 h-12 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black tracking-wide shadow-lg shadow-rose-200"
                onClick={() => finalAcceptanceToDelete && handleDeleteFinalAcceptance(finalAcceptanceToDelete)}
              >
                Xác nhận xóa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isFinalizeDialogOpen} onOpenChange={setIsFinalizeDialogOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-white p-8 space-y-6">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto ring-8 ring-emerald-50/30">
              <ShieldCheck className="w-8 h-8 text-emerald-500" />
            </div>
            <div className="space-y-2 text-center">
              <h3 className="text-xl font-black text-slate-900 leading-none">Chốt số liệu?</h3>
              <p className="text-sm font-bold text-slate-500 leading-relaxed px-4">
                Hành động này sẽ <span className="text-emerald-600 font-black uppercase">CHỐT</span> số liệu quyết toán và không thể thay đổi sau đó. Bản ghi sẽ được chuyển sang báo cáo thực tế chính thức.
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 h-12 rounded-2xl border-slate-200 text-slate-600 font-black tracking-wide"
                onClick={() => setIsFinalizeDialogOpen(false)}
              >
                Hủy bỏ
              </Button>
              <Button 
                className="flex-1 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black tracking-wide shadow-lg shadow-emerald-200"
                onClick={() => {
                  if (acceptanceToFinalize) {
                    handleFinalizeAcceptance(acceptanceToFinalize);
                    setIsFinalizeDialogOpen(false);
                    setAcceptanceToFinalize(null);
                  }
                }}
              >
                Xác nhận chốt
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

/**
 * SupportManager Component
 * Allows users to submit issues and admins to reply.
 */
const SupportManager = React.memo(({ 
  isAdmin, user, supportRequests, handleFirestoreError 
}: any) => {
  const [isAddingRequest, setIsAddingRequest] = useState(false);
  const [requestTitle, setRequestTitle] = useState('');
  const [requestContent, setRequestContent] = useState('');
  const [requestCategory, setRequestCategory] = useState('Kỹ thuật');
  const [requestPriority, setRequestPriority] = useState('Trung bình');
  
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [adminReply, setAdminReply] = useState('');
  const [replyStatus, setReplyStatus] = useState('');

  const handleSubmitRequest = async () => {
    if (!requestTitle || !requestContent) {
      toast.error('Vui lòng nhập đầy đủ tiêu đề và nội dung');
      return;
    }

    try {
      await addDoc(collection(db, 'supportRequests'), {
        title: requestTitle,
        content: requestContent,
        category: requestCategory,
        priority: requestPriority,
        status: 'Chờ xử lý',
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || user.email.split('@')[0],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setRequestTitle('');
      setRequestContent('');
      setIsAddingRequest(false);
      toast.success('Gửi yêu cầu hỗ trợ thành công');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'supportRequests');
    }
  };

  const handleAdminReply = async () => {
    if (!adminReply) {
      toast.error('Vui lòng nhập nội dung phản hồi');
      return;
    }

    try {
      await updateDoc(doc(db, 'supportRequests', replyingTo.id), {
        adminReply: adminReply,
        status: replyStatus || 'Đã phản hồi',
        repliedBy: user.email,
        repliedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setAdminReply('');
      setReplyingTo(null);
      toast.success('Đã gửi phản hồi');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'supportRequests');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Chờ xử lý': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none px-2 py-0.5 rounded-full text-[10px] font-black uppercase">Chờ xử lý</Badge>;
      case 'Đang xử lý': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-2 py-0.5 rounded-full text-[10px] font-black uppercase">Đang xử lý</Badge>;
      case 'Đã phản hồi': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-2 py-0.5 rounded-full text-[10px] font-black uppercase">Đã phản hồi</Badge>;
      case 'Đã đóng': return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-none px-2 py-0.5 rounded-full text-[10px] font-black uppercase">Đã đóng</Badge>;
      default: return null;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'Cao': return <Badge className="bg-rose-50 text-rose-600 border-rose-100 px-2 py-0 text-[9px] font-bold">Cao</Badge>;
      case 'Trung bình': return <Badge className="bg-amber-50 text-amber-600 border-amber-100 px-2 py-0 text-[9px] font-bold">Trung bình</Badge>;
      case 'Thấp': return <Badge className="bg-slate-50 text-slate-600 border-slate-100 px-2 py-0 text-[9px] font-bold">Thấp</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            Phòng Hỗ trợ & Giải quyết Vấn đề
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium italic">Gửi thắc mắc hoặc báo cáo lỗi cho đội ngũ quản trị viên</p>
        </div>
        
        {!isAdmin && (
          <Button 
            onClick={() => setIsAddingRequest(true)}
            className="h-12 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2 group"
          >
            <Plus className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
            TẠO YÊU CẦU MỚI
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {supportRequests.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50 rounded-[32px]">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center rotate-3">
                <MessageCircle className="w-10 h-10 text-slate-200" />
              </div>
              <div className="space-y-1">
                <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Hộp thư trống</p>
                <p className="text-slate-400 text-sm font-medium">Hiện chưa có yêu cầu hỗ trợ nào được ghi nhận</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {supportRequests.map((req: any) => (
              <Card key={req.id} className="border-none shadow-xl shadow-slate-100 bg-white rounded-[32px] overflow-hidden group hover:shadow-2xl hover:shadow-indigo-100/50 transition-all duration-500 flex flex-col h-full border border-slate-100/50 relative">
                {req.status === 'Chờ xử lý' && <div className="absolute top-4 right-4 w-2 h-2 bg-rose-500 rounded-full animate-ping" />}
                <CardHeader className="p-6 pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                       <Badge variant="outline" className="bg-slate-50 text-slate-500 border-none text-[9px] font-black tracking-widest uppercase py-0.5 px-2">{req.category}</Badge>
                       {getPriorityBadge(req.priority)}
                    </div>
                    {getStatusBadge(req.status)}
                  </div>
                  <CardTitle className="text-lg font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">
                    {req.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 flex-1 space-y-4">
                  <p className="text-slate-600 text-sm font-medium leading-relaxed italic line-clamp-3">
                    "{req.content}"
                  </p>
                  
                  <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-indigo-50 rounded-full flex items-center justify-center">
                        <UserCircle className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{req.userName}</span>
                        <span className="text-[8px] font-bold text-slate-400">{req.userEmail?.split('@')[0]}</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                      {req.createdAt ? format(req.createdAt.toDate ? req.createdAt.toDate() : new Date(req.createdAt), 'dd/MM/yyyy HH:mm') : ''}
                    </span>
                  </div>

                  {req.adminReply ? (
                    <div className="mt-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col gap-2 relative overflow-hidden animate-in fade-in slide-in-from-top-2 duration-500">
                      <div className="absolute top-0 right-0 p-2 opacity-[0.05]">
                        <ShieldCheck className="w-12 h-12 text-emerald-600" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-600 text-white border-none py-0 px-2 text-[8px] font-black uppercase">Admin Phản hồi</Badge>
                        <span className="text-[8px] font-bold text-emerald-500 uppercase italic">
                          {req.repliedAt ? format(req.repliedAt.toDate ? req.repliedAt.toDate() : new Date(req.repliedAt), 'dd/MM HH:mm') : ''}
                        </span>
                      </div>
                      <p className="text-emerald-900 text-xs font-bold leading-relaxed">
                        {req.adminReply}
                      </p>
                      <span className="text-[8px] font-black text-emerald-600/50 uppercase tracking-tighter text-right">By: {req.repliedBy?.split('@')[0]}</span>
                    </div>
                  ) : (
                    <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center py-6">
                       <Clock className="w-5 h-5 text-slate-300 mb-2" />
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang chờ xử lý</p>
                    </div>
                  )}
                </CardContent>
                
                {isAdmin && (
                  <div className="p-4 bg-slate-50/50 border-t border-slate-100">
                    <Button 
                      onClick={() => {
                        setReplyingTo(req);
                        setAdminReply(req.adminReply || '');
                        setReplyStatus(req.status);
                      }}
                      className="w-full h-10 bg-white hover:bg-indigo-600 hover:text-white text-indigo-600 border border-indigo-100 rounded-xl font-bold text-[11px] shadow-sm transition-all"
                    >
                      {req.adminReply ? 'CẬP NHẬT PHẢN HỒI' : 'PHẢN HỒI NGAY'}
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* New Request Modal */}
      <Dialog open={isAddingRequest} onOpenChange={setIsAddingRequest}>
        <DialogContent className="sm:max-w-lg bg-white border-none shadow-2xl p-0 overflow-hidden rounded-[32px]">
          <div className="bg-indigo-600 p-8 text-white relative h-32 flex flex-col justify-end">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
            <DialogTitle className="text-2xl font-black tracking-tight mb-1 relative z-10">Tạo yêu cầu mới</DialogTitle>
            <p className="text-indigo-100 text-xs font-medium relative z-10 leading-relaxed uppercase tracking-widest">Gửi thắc mắc hoặc báo lỗi tới ban quản trị</p>
          </div>
          
          <div className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vấn đề</Label>
                  <Select value={requestCategory} onValueChange={setRequestCategory}>
                    <SelectTrigger className="h-12 bg-slate-50 border-none rounded-xl text-xs font-bold focus:ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-2xl">
                      <SelectItem value="Kỹ thuật">Kỹ thuật</SelectItem>
                      <SelectItem value="Quy trình">Quy trình</SelectItem>
                      <SelectItem value="Ngân sách">Ngân sách</SelectItem>
                      <SelectItem value="Khác">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mức độ ưu tiên</Label>
                  <Select value={requestPriority} onValueChange={setRequestPriority}>
                    <SelectTrigger className="h-12 bg-slate-50 border-none rounded-xl text-xs font-bold focus:ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-2xl">
                      <SelectItem value="Thấp">Thấp</SelectItem>
                      <SelectItem value="Trung bình">Trung bình</SelectItem>
                      <SelectItem value="Cao">Cao</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tiêu đề yêu cầu</Label>
                <Input 
                  placeholder="Vd: Lỗi không hiển thị doanh số..." 
                  className="h-12 bg-slate-50 border-none rounded-xl text-sm font-bold placeholder:text-slate-300"
                  value={requestTitle}
                  onChange={(e) => setRequestTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nội dung chi tiết</Label>
                <textarea 
                  className="w-full min-h-[120px] p-4 bg-slate-50 border-none rounded-[20px] text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                  placeholder="Mô tả kỹ lỗi bạn gặp phải hoặc thắc mắc cần giải đáp..."
                  value={requestContent}
                  onChange={(e) => setRequestContent(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                variant="ghost" 
                className="flex-1 h-14 rounded-2xl font-black text-slate-400 uppercase tracking-widest"
                onClick={() => setIsAddingRequest(false)}
              >
                Hủy bỏ
              </Button>
              <Button 
                className="flex-2 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all"
                onClick={handleSubmitRequest}
              >
                GỬI YÊU CẦU NGAY
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Reply Modal */}
      <Dialog open={!!replyingTo} onOpenChange={(open) => !open && setReplyingTo(null)}>
        <DialogContent className="sm:max-w-lg bg-white border-none shadow-2xl p-0 overflow-hidden rounded-[32px]">
          <div className="bg-slate-900 p-8 text-white relative h-32 flex flex-col justify-end">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
            <DialogTitle className="text-2xl font-black tracking-tight mb-1 relative z-10">Phản hồi yêu cầu</DialogTitle>
            <p className="text-slate-400 text-[10px] font-black relative z-10 leading-relaxed uppercase tracking-[0.2em]">Đang xử lý cho: "{replyingTo?.userName}"</p>
          </div>
          
          <div className="p-8 space-y-6">
            <div className="p-4 bg-slate-50 rounded-2xl space-y-2 mb-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[8px] font-black uppercase bg-white">{replyingTo?.category}</Badge>
                <h4 className="text-xs font-black text-slate-900">{replyingTo?.title}</h4>
              </div>
              <p className="text-[11px] text-slate-500 font-medium italic leading-relaxed">"{replyingTo?.content}"</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Trạng thái xử lý</Label>
                <div className="grid grid-cols-3 gap-2">
                  {['Đang xử lý', 'Đã phản hồi', 'Đã đóng'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setReplyStatus(status)}
                      className={`h-10 rounded-xl text-[10px] font-black uppercase transition-all border ${
                        replyStatus === status 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100 scale-105' 
                          : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-200'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nội dung phản hồi</Label>
                <textarea 
                  className="w-full min-h-[150px] p-4 bg-slate-50 border-none rounded-[24px] text-sm font-bold placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all shadow-inner"
                  placeholder="Nhập nội dung phản hồi chi tiết tới người dùng..."
                  value={adminReply}
                  onChange={(e) => setAdminReply(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                variant="ghost" 
                className="flex-1 h-14 rounded-2xl font-black text-slate-400 uppercase tracking-widest"
                onClick={() => setReplyingTo(null)}
              >
                Hủy bỏ
              </Button>
              <Button 
                className="flex-2 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest shadow-xl shadow-indigo-100"
                onClick={handleAdminReply}
              >
                GỬI PHẢN HỒI NGAY
                <Check className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});
