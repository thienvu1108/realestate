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
import { LogIn, LogOut, Plus, RefreshCw, History, TrendingUp, Wallet, Building2, ShieldCheck, BarChart3, Users, Edit2, Trash2, X, Check, Search, ArrowUpDown, AlertTriangle, UserCircle, Map, Layers, Database, FileUp, Download, Filter, Calendar, FileSpreadsheet, Link, Info, FileText, FileWarning, Copy, LayoutDashboard, ArrowRight } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { format, getWeek } from 'date-fns';
import { 
  BarChart, 
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
  const [efficiencyReports, setEfficiencyReports] = useState<any[]>([]);
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
  
  // Delete confirmation states
  const [isDeleteProjectDialogOpen, setIsDeleteProjectDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string, name: string } | null>(null);
  const [isDeleteTeamDialogOpen, setIsDeleteTeamDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<{ id: string, name: string } | null>(null);

  // Sorting states
  const [projectSort, setProjectSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [teamSort, setTeamSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

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
  const [reportUser, setReportUser] = useState('all');
  const [reportUserSearch, setReportUserSearch] = useState('');
  const [reportMonth, setReportMonth] = useState(getMarketingMonth(new Date()));
  const [reportWeek, setReportWeek] = useState('all');
  const [costPeriod, setCostPeriod] = useState('1');
  const [chartTimeType, setChartTimeType] = useState<'week' | 'month'>('month');
  const [reportYear, setReportYear] = useState(new Date().getFullYear().toString());
  const [reportSortBy, setReportSortBy] = useState<'budget' | 'actual' | 'revenue'>('budget');
  const [activeReportTab, setActiveReportTab] = useState('team');
  const [efficiencyGroupType, setEfficiencyGroupType] = useState<'team' | 'project'>('team');
  const [reportProjectSearch, setReportProjectSearch] = useState('');
  const [reportTeamSearch, setReportTeamSearch] = useState('');
  const [selectedBudgetIds, setSelectedBudgetIds] = useState<string[]>([]);
  const [selectedCostIds, setSelectedCostIds] = useState<string[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedRegionIds, setSelectedRegionIds] = useState<string[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);
  const [selectedEfficiencyIds, setSelectedEfficiencyIds] = useState<string[]>([]);
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
  const [newEfficiencyProjectSearch, setNewEfficiencyProjectSearch] = useState('');
  const [newEfficiencyTeamSearch, setNewEfficiencyTeamSearch] = useState('');
  const [adminEfficiencySearch, setAdminEfficiencySearch] = useState('');
  const [adminEfficiencyMonthFilter, setAdminEfficiencyMonthFilter] = useState(getMarketingMonth(new Date()));
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
    const str = String(val).trim();
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
    const qEfficiency = query(collection(db, 'efficiencyReports'), orderBy('createdAt', 'desc'));
    const unsubEfficiency = onSnapshot(qEfficiency, (snapshot) => {
      setEfficiencyReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'efficiencyReports'));

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
        let missingIds = 0;
        let invalidData = 0;
        const missingIdDetails: string[] = [];

        for (const row of json) {
          // Normalize row keys (remove spaces, case insensitive)
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
          let month = normalizeMonth(getVal(['Tháng', 'Kỳ', 'Month', 'thang', 'tháng', 'tháng', 'kỳ']));
          
          const salesStr = String(getVal(['Căn bán', 'Số căn bán', 'canban', 'socan', 'salescount', 'sales', 'số căn', 'units']) || '0');
          const revenueStr = String(getVal(['Doanh số', 'revenue', 'doanhso', 'thực đạt', 'doanh thu', 'doanhthu']) || '0');

          const sales = parseInt(salesStr.replace(/[^0-9]/g, '')) || 0;
          const revenue = parseInt(revenueStr.replace(/[^0-9]/g, '')) || 0;

          if (!pRef || !tRef || !month) {
            // Check if row is mostly empty (skip empty rows)
            const hasData = Object.values(normalizedRow).some(v => v !== null && v !== undefined && v !== '');
            if (hasData) invalidData++;
            continue;
          }

          const project = projects.find(p => p.id === pRef || p.projectCode === pRef || p.name.toLowerCase() === pRef.toLowerCase());
          const team = teams.find(t => t.id === tRef || t.teamCode === tRef || t.name.toLowerCase() === tRef.toLowerCase());

          if (!project) {
            missingIds++;
            if (missingIdDetails.length < 3) missingIdDetails.push(`P-Ref: ${pRef}`);
            continue;
          }
          if (!team) {
            missingIds++;
            if (missingIdDetails.length < 3) missingIdDetails.push(`T-Ref: ${tRef}`);
            continue;
          }

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

        if (missingIds > 0) {
          toast.error(`${missingIds} dòng bị bỏ qua do ID dự án/team không khớp hệ thống. Ví dụ: ${missingIdDetails.join(', ')}`, { duration: 6000 });
        }
        
        if (invalidData > 0) {
          toast.error(`${invalidData} dòng không hợp lệ (thiếu thông tin bắt buộc).`, { duration: 4000 });
        }

        if (count === 0 && missingIds === 0 && invalidData === 0) {
          toast.info("Không tìm thấy dữ liệu mới để đồng bộ.");
        }

        await logAction('IMPORT', 'efficiencyReports', 'bulk', { count, errors: missingIds + invalidData });
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

      if (rows.length === 0) {
        toast.error("Không tìm thấy dữ liệu trong Google Sheet.");
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
            if (normalizedRow[cleanPK] !== undefined && normalizedRow[cleanPK] !== '') return normalizedRow[cleanPK];
          }
          return undefined;
        };

        const pRef = String(getVal(['ID Dự án', 'Mã Dự án', 'Dự án', 'ProjectID', 'idduan', 'id dự án', 'mã dự án']) || '').trim();
        const tRef = String(getVal(['ID Team', 'Mã Team', 'Tên Team', 'TeamID', 'idteam', 'id team', 'mã team']) || '').trim();
        const monthRaw = getVal(['Tháng', 'Kỳ', 'Month', 'thang', 'tháng', 'tháng', 'kỳ']);
        const month = normalizeMonth(monthRaw);
        const implementer = String(getVal(['Người triển khai', 'GDDA', 'Implementer', 'nguoiphutrach', 'giamdockinhdoanh', 'nguoitrienkhai', 'người triển khai', 'phụ trách']) || '').trim();
        const amount = parseVal(getVal(['Ngân sách', 'Amount', 'ngansach', 'ngân sách', 'ngânsách', 'số tiền']));

        if (!pRef || !tRef || !month) {
          const hasData = Object.values(normalizedRow).some(v => v !== '');
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
        const assignedUserEmail = extractEmail(implementer);

        const existingBudget = budgets.find(b => 
          b.projectId === projectId && 
          b.teamId === teamId && 
          b.month === month
        );

        if (existingBudget) {
          batch.update(doc(db, 'budgets', existingBudget.id), {
            amount,
            implementerName: implementer || existingBudget.implementerName,
            assignedUserEmail: assignedUserEmail || existingBudget.assignedUserEmail || null,
            userEmail: assignedUserEmail || existingBudget.userEmail || user?.email?.toLowerCase(),
            updatedAt: serverTimestamp(),
            updatedBy: user?.uid
          });
        } else {
          batch.set(doc(collection(db, 'budgets')), {
            projectId,
            projectName: project.name,
            teamId,
            teamName: team.name,
            implementerName: implementer || 'N/A',
            assignedUserEmail: assignedUserEmail,
            userEmail: assignedUserEmail || user?.email?.toLowerCase(), // Use implementer email if available
            month,
            amount,
            createdAt: serverTimestamp(),
            createdBy: user?.uid,
            // Original registered email is kept in createdByEmail if needed (though not explicit here)
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
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });
  }, [efficiencyReports, adminEfficiencySearch, adminEfficiencyMonthFilter, projectMap, teamMap]);

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
      nhatKyHeThong: sanitizeData(auditLogs.slice(0, 500)), // Include logs in backup (capped to avoid payload issues)
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
      // Logic for automatic sanitization is already in syncFullSystem, we'll replicate simplified version here
      const sanitizeLogs = (logs: any[]) => {
        return logs.map(log => ({
          ...log,
          timestamp: log.timestamp?.toDate ? log.timestamp.toDate().toISOString() : new Date().toISOString(),
          data: typeof log.data === 'object' ? JSON.stringify(log.data) : String(log.data)
        }));
      };

      const payload = {
        nhatKyHanhDong: sanitizeLogs(auditLogs.slice(0, 1000)) // Cap to 1000 latest logs for performance
      };

      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
      });
      
      toast.success(`Đã đồng bộ ${Math.min(auditLogs.length, 1000)} nhật ký lên Google Sheet.`);
    } catch (error) {
      console.error("Sync All Logs Error:", error);
      toast.error("Lỗi khi đồng bộ toàn bộ nhật ký");
    } finally {
      setIsSyncingLogs(false);
    }
  };

  const syncLogToGoogleSheets = async (logEntry: any) => {
    try {
      const payload = {
        nhatKyHanhDong: [{
          ...logEntry,
          timestamp: new Date().toISOString(),
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
    const team = teams.find(t => t.id === selectedTeamId);
    try {
      const docRef = await addDoc(collection(db, 'budgets'), {
        projectId: selectedProjectId,
        projectName: project?.name || 'N/A',
        teamId: selectedTeamId,
        teamName: team?.name || selectedTeamName,
        implementerName: implementerName,
        month: budgetMonth,
        amount: Number(budgetAmount),
        createdAt: serverTimestamp(),
        createdBy: user?.uid,
        userEmail: user?.email?.toLowerCase()
      });
      await logAction('CREATE', 'budgets', docRef.id, { 
        projectId: selectedProjectId,
        projectName: project?.name || 'N/A',
        teamId: selectedTeamId,
        teamName: team?.name || selectedTeamName,
        month: budgetMonth,
        amount: Number(budgetAmount),
        implementerName
      });
      setBudgetAmount('');
      // Keep implementerName and selectedTeamId from profile for next entry
      if (!userProfile?.fullName) setImplementerName('');
      setSelectedProjectId('');
      if (!userProfile?.teamId) {
        setSelectedTeamId('');
        setSelectedTeamName('');
      }
      setIsConfirmBudgetOpen(false);
      toast.success('Đã đăng ký ngân sách');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'budgets');
    }
  };

  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = Number(fbAds) + Number(posting) + Number(zaloAds) + Number(googleAds) + Number(otherCost);
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
        otherCost: Number(otherCost),
        totalAmount,
        note: costNote,
        budgetId: selectedBudgetId 
      });
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

  const handleOpenEditBudget = (budget: any) => {
    setEditingBudgetId(budget.id);
    setEditingBudgetAmount(budget.amount.toString());
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
    try {
      const budgetRef = doc(db, 'budgets', editingBudgetId);
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
        <div className="flex items-center gap-2 text-red-600 font-bold">
          <Trash2 className="w-3 h-3" /> 
          Đã xóa {data.count || data.snapshot?.length || 'tất cả'} bản ghi
          {data.snapshot && <span className="text-[10px] bg-red-50 px-2 py-0.5 rounded-full">(Có snapshot khôi phục)</span>}
        </div>
      );
    }

    if (action === 'IMPORT_BUDGETS' || action === 'IMPORT_COSTS') {
      return (
        <div className="flex items-center gap-2 text-emerald-600 font-bold">
          <FileUp className="w-3 h-3" /> 
          Đã nhập {data.count || data.items?.length || data.snapshot?.length || 'nhiều'} bản ghi từ {data.source || 'tệp CSV'}
        </div>
      );
    }

    if (action === 'FULL_SYSTEM_BACKUP') {
      return (
        <div className="flex items-center gap-2 text-indigo-600 font-bold">
          <Database className="w-3 h-3" /> 
          Bản sao lưu hệ thống toàn diện
        </div>
      );
    }

    // Standard recursive renderer for small objects
    const renderObject = (obj: any, depth = 0) => {
      if (depth > 2) return <span className="text-slate-400">...</span>;
      if (typeof obj !== 'object' || obj === null) return <span>{String(obj)}</span>;
      
      return (
        <div className="pl-2 space-y-0.5 border-l border-slate-100">
          {Object.entries(obj).map(([key, val]) => {
            if (key === 'snapshot' || key === 'payload' || key === 'items') return null; // Too big
            return (
              <div key={key} className="flex flex-wrap gap-x-2">
                <span className="font-bold text-slate-500">{key}:</span>
                <span className="text-slate-900">
                  {typeof val === 'object' ? renderObject(val, depth + 1) : String(val)}
                </span>
              </div>
            );
          })}
        </div>
      );
    };

    return <div className="mt-1">{renderObject(data)}</div>;
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

        for (let i = 0; i < data.length; i++) {
          const rawRow = data[i] as any;
          const rowIndex = i + 2;
          const row: any = {};
          Object.keys(rawRow).forEach(k => {
            const cleanKey = k.trim().toLowerCase().replace(/\s+/g, '');
            row[cleanKey] = rawRow[k];
          });

          const getVal = (possibleKeys: string[]) => {
            for (const pk of possibleKeys) {
              const cleanPK = pk.trim().toLowerCase().replace(/\s+/g, '');
              if (row[cleanPK] !== undefined && row[cleanPK] !== '') return row[cleanPK];
            }
            return undefined;
          };

          const pRef = String(getVal(['ID Dự án', 'Mã Dự án', 'Dự án', 'ProjectID', 'idduan', 'id dự án', 'mã dự án']) || '').trim();
          const tRef = String(getVal(['ID Team', 'Mã Team', 'Tên Team', 'TeamID', 'teamid', 'id team', 'mã team']) || '').trim();
          const monthRaw = getVal(['Tháng', 'Kỳ', 'Month', 'thang', 'tháng', 'ky', 'kỳ']);
          const month = normalizeMonth(monthRaw);
          const implementer = String(getVal(['Người phụ trách', 'Giám đốc kinh doanh', 'GDDA', 'Người triển khai', 'Implementer', 'nguoiphutrach', 'giamdockinhdoanh', 'nguoitrienkhai', 'người triển khai', ' GD']) || '').trim();
          const amountRaw = getVal(['Ngân sách', 'Amount', 'ngansach', 'ngân sách', 'ngânsách', 'số tiền']);
          const amountDecimal = String(amountRaw || '0').replace(/[.,]/g, '');
          const amount = Number(amountDecimal);

          if (!pRef || !tRef || !month || amount <= 0) {
            const hasData = Object.values(row).some(v => v !== '');
            if (hasData) {
              errorDetailsList.push(`Dòng ${rowIndex}: Thiếu thông tin bắt buộc hoặc số tiền không hợp lệ`);
              errorsCount++;
            }
            continue;
          }

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

          const project = findProjectAddress(pRef);
          const team = findTeamAddress(tRef);

          if (!project) {
            errorDetailsList.push(`Dòng ${rowIndex}: Không tìm thấy Dự án khớp với "${pRef}"`);
            errorsCount++;
            continue;
          }
          if (!team) {
            errorDetailsList.push(`Dòng ${rowIndex}: Không tìm thấy Team khớp với "${tRef}"`);
            errorsCount++;
            continue;
          }

          const pId = project.id;
          const teamId = team.id;
          const assignedUserEmail = extractEmail(implementer);

          const existingBudget = budgets.find(b => 
            b.projectId === pId && 
            b.teamId === teamId && 
            b.month === month
          );

          if (existingBudget) {
            const bRef = doc(db, 'budgets', existingBudget.id);
            batch.update(bRef, {
              amount,
              implementerName: implementer || existingBudget.implementerName,
              assignedUserEmail: assignedUserEmail || existingBudget.assignedUserEmail || null,
              userEmail: assignedUserEmail || existingBudget.userEmail || user?.email?.toLowerCase(),
              updatedAt: serverTimestamp(),
              updatedBy: user?.uid
            });
          } else {
            const bRef = doc(collection(db, 'budgets'));
            batch.set(bRef, {
              projectId: pId,
              projectName: project.name,
              teamId: teamId,
              teamName: team.name,
              implementerName: implementer || 'N/A',
              assignedUserEmail: assignedUserEmail,
              userEmail: assignedUserEmail || user?.email?.toLowerCase(),
              month,
              amount,
              createdAt: serverTimestamp(),
              createdBy: user?.uid
            });
          }
          count++;
        }

        if (count > 0) {
          await batch.commit();
          await logAction('IMPORT_BUDGETS', 'budgets', 'bulk', { count, errors: errorsCount });
          toast.success(`Đã cập nhật ${count} ngân sách. ${errorsCount > 0 ? `Bỏ qua ${errorsCount} dòng lỗi.` : ''}`);
          if (errorsCount > 0) {
            setImportErrors(errorDetailsList);
            setIsImportErrorsDialogOpen(true);
          }
        } else {
          if (errorDetailsList.length > 0) {
            setImportErrors(errorDetailsList);
            setIsImportErrorsDialogOpen(true);
          } else {
            toast.error(`Không có dữ liệu hợp lệ để nhập.`);
          }
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
            const cleanKey = k.trim().toLowerCase().replace(/\s+/g, '');
            row[cleanKey] = rawRow[k];
          });

          const getVal = (possibleKeys: string[]) => {
            for (const pk of possibleKeys) {
              const cleanPK = pk.trim().toLowerCase().replace(/\s+/g, '');
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
              errorDetailsList.push(`Dòng ${rowIndex}: Thiếu thông tin bắt buộc (Dự án: "${pRef}", Team: "${tRef}", Kỳ: "${month}")`);
              errorsCount++;
            }
            continue;
          }

          const project = findProjectInternal(pRef);
          const team = findTeamInternal(tRef);

          if (!project) {
            errorDetailsList.push(`Dòng ${rowIndex}: Không tìm thấy Dự án khớp với "${pRef}"`);
            errorsCount++;
            continue;
          }
          if (!team) {
            errorDetailsList.push(`Dòng ${rowIndex}: Không tìm thấy Team khớp với "${tRef}"`);
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
            errorDetailsList.push(`Dòng ${rowIndex}: Không tìm thấy ngân sách đã duyệt cho [${project.name}] - [${team.name}] tháng ${month}`);
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
      const isAssigned = b.assignedUserEmail?.toLowerCase() === userEmail;

      const matchUser = reportUser === 'all' || budgetEmail === reportUser.toLowerCase();
      const matchTeam = (isAdmin || isMod || isGDDA)
        ? (reportTeam === 'all' || b.teamName === reportTeam)
        : (isOwner || isAssigned);
      
      const matchMonth = b.month === reportMonth;
      const matchRegion = reportRegion === 'all' || (project?.region === reportRegion);
      const matchType = reportType === 'all' || (project?.type === reportType);
      
      return matchProject && matchTeam && matchMonth && matchRegion && matchType && matchUser;
    }).map(b => {
      // If a specific week is selected, return 1/4 of the budget as an estimate
      if (reportWeek !== 'all') {
        return { ...b, amount: b.amount / 4 };
      }
      return b;
    });
  }, [budgets, reportProject, reportTeam, reportMonth, reportRegion, reportType, projects, isAdmin, isMod, isGDDA, isUser, userProfile, reportWeek, reportUser]);

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
      const isAssigned = c.assignedUserEmail?.toLowerCase() === userEmail;
      const isOwnerOrAssigned = isOwner || isAssigned;

      const matchUser = reportUser === 'all' || costEmail === reportUser.toLowerCase();
      const matchTeam = (isAdmin || isMod || isGDDA)
        ? (reportTeam === 'all' || c.teamName === reportTeam)
        : isOwnerOrAssigned;
      // Map cost date to marketing month
      const mMonth = c.month || (c.createdAt?.toDate ? getMarketingMonth(c.createdAt.toDate()) : null);
      const matchMonth = mMonth === reportMonth;
      const matchRegion = reportRegion === 'all' || (project?.region === reportRegion);
      const matchType = reportType === 'all' || (project?.type === reportType);
      const matchWeek = reportWeek === 'all' || c.weekNumber?.toString() === reportWeek;
      
      return matchProject && matchTeam && matchMonth && matchRegion && matchType && matchWeek && matchUser;
    });
  }, [costs, reportProject, reportTeam, reportMonth, getMarketingMonth, reportRegion, reportType, projects, isAdmin, isMod, isGDDA, isUser, userProfile, reportWeek, reportUser]);

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
        const mMonth = c.month || (c.createdAt?.toDate ? getMarketingMonth(c.createdAt.toDate()) : null);
        const matchMonth = mMonth === reportMonth;
        const matchRegion = reportRegion === 'all' || (project?.region === reportRegion);
        const matchType = reportType === 'all' || (project?.type === reportType);
        const matchWeek = chartTimeType === 'month' || reportWeek === 'all' || c.weekNumber?.toString() === reportWeek;
        
        return matchProject && c.teamName === team && matchMonth && matchRegion && matchType && matchWeek;
      }).reduce((acc, curr) => acc + curr.amount, 0);

      if (chartTimeType === 'week' && reportWeek === 'all') {
        teamTotalCost = teamTotalCost / 4;
      }

      // Project breakdown for team
      const teamProjectDetails = projects.map(p => {
        const pBudgets = teamBudgets.filter(b => b.projectId === p.id);
        const pCosts = costs.filter(c => {
          const project = projects.find(proj => proj.id === c.projectId);
          const matchProject = c.projectId === p.id;
          const mMonth = c.month || (c.createdAt?.toDate ? getMarketingMonth(c.createdAt.toDate()) : null);
          const matchMonth = mMonth === reportMonth;
          const matchRegion = reportRegion === 'all' || (project?.region === reportRegion);
          const matchType = reportType === 'all' || (project?.type === reportType);
          const matchWeek = chartTimeType === 'month' || reportWeek === 'all' || c.weekNumber?.toString() === reportWeek;
          
          return matchProject && c.teamName === team && matchMonth && matchRegion && matchType && matchWeek;
        });

        let pTotalBudget = pBudgets.reduce((acc, curr) => acc + curr.amount, 0);
        let pTotalCost = pCosts.reduce((acc, curr) => acc + curr.amount, 0);

        if (chartTimeType === 'week') {
          pTotalBudget = pTotalBudget / 4;
          if (reportWeek === 'all') pTotalCost = pTotalCost / 4;
        }

        const pRevenue = efficiencyReports
          .filter(r => r.projectId === p.id && (teamMap[r.teamId] === team || r.teamName === team) && (reportMonth === 'all' || r.month === reportMonth))
          .reduce((acc, curr) => acc + (curr.revenue || 0), 0);

        return {
          name: p.name,
          budget: pTotalBudget,
          actual: pTotalCost,
          revenue: pRevenue
        };
      }).filter(d => d.budget > 0 || d.actual > 0)
        .sort((a, b) => b[reportSortBy] - a[reportSortBy]);

      const teamRevenue = efficiencyReports
        .filter(r => (teamMap[r.teamId] === team || r.teamName === team) && (reportMonth === 'all' || r.month === reportMonth) && (reportProject === 'all' || r.projectId === reportProject))
        .reduce((acc, curr) => acc + (curr.revenue || 0), 0);
      
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
  }, [uniqueTeams, budgets, costs, reportTeam, reportProject, reportMonth, reportRegion, reportType, projects, chartTimeType, reportWeek, getMarketingMonth, reportSortBy]);

  const efficiencyChartData = useMemo(() => {
    // rawData structure: rawData[mainKey][detailKey] = { budget, cost, revenue, sales }
    const rawData: { [key: string]: { [detailKey: string]: { budget: number, cost: number, revenue: number, sales: number } } } = {};

    const getTarget = (mainKey: string, detailKey: string) => {
      if (!mainKey || !detailKey) return null;
      if (!rawData[mainKey]) rawData[mainKey] = {};
      if (!rawData[mainKey][detailKey]) rawData[mainKey][detailKey] = { budget: 0, cost: 0, revenue: 0, sales: 0 };
      return rawData[mainKey][detailKey];
    };

    // Budgets
    budgets.forEach(b => {
      if (reportMonth && reportMonth !== 'all' && b.month !== reportMonth) return;
      if (reportProject !== 'all' && b.projectId !== reportProject) return;
      if (reportTeam !== 'all' && b.teamName !== reportTeam) return;

      const tId = teams.find(t => t.name === b.teamName)?.id || b.teamName;
      const mainKey = efficiencyGroupType === 'project' ? b.projectId : tId;
      const detailKey = efficiencyGroupType === 'project' ? tId : b.projectId;
      
      const target = getTarget(mainKey, detailKey);
      if (target) target.budget += b.amount || 0;
    });

    // Costs
    costs.forEach(c => {
      const mMonth = c.month || (c.createdAt?.toDate ? getMarketingMonth(c.createdAt.toDate()) : null);
      if (reportMonth && reportMonth !== 'all' && mMonth !== reportMonth) return;
      if (reportProject !== 'all' && c.projectId !== reportProject) return;
      if (reportTeam !== 'all' && c.teamName !== reportTeam) return;

      const tId = teams.find(t => t.name === c.teamName)?.id || c.teamName;
      const mainKey = efficiencyGroupType === 'project' ? c.projectId : tId;
      const detailKey = efficiencyGroupType === 'project' ? tId : c.projectId;

      const target = getTarget(mainKey, detailKey);
      if (target) target.cost += c.amount || 0;
    });

    // Efficiency Reports
    efficiencyReports.forEach(r => {
      if (reportMonth && reportMonth !== 'all' && r.month !== reportMonth) return;
      if (reportProject !== 'all' && r.projectId !== reportProject) return;
      const currentTeamName = teamMap[r.teamId] || r.teamName;
      if (reportTeam !== 'all' && currentTeamName !== reportTeam) return;
      if (reportUser !== 'all' && r.createdByEmail?.toLowerCase() !== reportUser.toLowerCase()) return;

      const mainKey = efficiencyGroupType === 'project' ? r.projectId : r.teamId;
      const detailKey = efficiencyGroupType === 'project' ? r.teamId : r.projectId;

      const target = getTarget(mainKey, detailKey);
      if (target) {
        target.sales += r.salesCount || 0;
        target.revenue += r.revenue || 0;
      }
    });

    return Object.keys(rawData).map(mainKey => {
      const name = efficiencyGroupType === 'project' ? (projectMap[mainKey] || mainKey) : (teamMap[mainKey] || mainKey);
      
      const details = Object.keys(rawData[mainKey]).map(detailKey => {
        const detailName = efficiencyGroupType === 'project' ? (teamMap[detailKey] || detailKey) : (projectMap[detailKey] || detailKey);
        return {
          name: detailName,
          ...rawData[mainKey][detailKey]
        };
      }).sort((a, b) => b.revenue - a.revenue || b.cost - a.cost);

      const totals = details.reduce((acc, curr) => ({
        sales: acc.sales + curr.sales,
        revenue: acc.revenue + curr.revenue,
        cost: acc.cost + curr.cost,
        budget: acc.budget + curr.budget
      }), { sales: 0, revenue: 0, cost: 0, budget: 0 });

      return {
        name,
        ...totals,
        details
      };
    }).sort((a, b) => {
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      return b.cost - a.cost;
    });
  }, [efficiencyReports, costs, budgets, reportMonth, reportProject, reportTeam, reportUser, efficiencyGroupType, projectMap, teamMap, teams, getMarketingMonth]);

  const overBudgetStats = useMemo(() => {
    const overItems = efficiencyChartData.filter(item => item.cost > item.budget);
    return {
      count: overItems.length,
      totalExcess: overItems.reduce((acc, curr) => acc + (curr.cost - curr.budget), 0),
      items: overItems
    };
  }, [efficiencyChartData]);

  const salesGeneratingData = useMemo(() => 
    efficiencyChartData.filter(d => d.revenue > 0).sort((a, b) => {
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      return b.cost - a.cost;
    }), 
    [efficiencyChartData]
  );

  const noSalesData = useMemo(() => 
    efficiencyChartData.filter(d => d.revenue === 0).sort((a, b) => b.cost - a.cost), 
    [efficiencyChartData]
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
      if (reportTeam !== 'all' && c.teamName !== reportTeam) return;

      if (monthlyMap[mMonth]) {
        monthlyMap[mMonth].cost += c.amount || 0;
      }
    });

    return Object.values(monthlyMap).map(d => ({
      ...d,
      roi: d.cost > 0 ? Number((d.revenue / d.cost).toFixed(2)) : 0
    }));
  }, [efficiencyReports, costs, reportYear, reportProject, reportTeam, teamMap, getMarketingMonth]);

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
        const mMonth = c.month || (c.createdAt?.toDate ? getMarketingMonth(c.createdAt.toDate()) : null);
        const matchMonth = mMonth === reportMonth;
        const matchWeek = chartTimeType === 'month' || reportWeek === 'all' || c.weekNumber?.toString() === reportWeek;
        
        return matchProject && matchTeam && project?.region === region && matchMonth && matchWeek;
      }).reduce((acc, curr) => acc + curr.amount, 0);

      if (chartTimeType === 'week' && reportWeek === 'all') {
        totalCost = totalCost / 4;
      }

      const regionRevenue = efficiencyReports.filter(r => {
        const project = projects.find(p => p.id === r.projectId);
        const matchProject = reportProject === 'all' || r.projectId === reportProject;
        const matchTeam = reportTeam === 'all' || (teamMap[r.teamId] === reportTeam || r.teamName === reportTeam);
        const matchMonth = reportMonth === 'all' || r.month === reportMonth;
        return matchProject && matchTeam && project?.region === region && matchMonth;
      }).reduce((acc, curr) => acc + (curr.revenue || 0), 0);

      return {
        name: region,
        budget: totalBudget,
        actual: totalCost,
        revenue: regionRevenue
      };
    }).filter(d => d.budget > 0 || d.actual > 0)
      .sort((a, b) => b[reportSortBy] - a[reportSortBy]);
  }, [uniqueRegions, budgets, costs, projects, reportProject, reportTeam, reportMonth, chartTimeType, reportWeek, getMarketingMonth, reportSortBy]);

  const projectChartData = useMemo(() => {
    const projectIds = Array.from(new Set([
      ...budgets.filter(b => b.month === reportMonth).map(b => b.projectId),
      ...costs.filter(c => {
        const mMonth = c.month || (c.createdAt?.toDate ? getMarketingMonth(c.createdAt.toDate()) : null);
        return mMonth === reportMonth;
      }).map(c => c.projectId)
    ]));

    return projectIds.filter(id => reportProject === 'all' || id === reportProject).map(id => {
      const projectName = projectMap[id] || 'N/A';
      const projectBudgets = budgets.filter(b => b.projectId === id && b.month === reportMonth);
      
      let totalBudget = projectBudgets.reduce((acc, curr) => acc + curr.amount, 0);
      if (chartTimeType === 'week') totalBudget = totalBudget / 4;

      let totalCost = costs.filter(c => {
        const mMonth = c.month || (c.createdAt?.toDate ? getMarketingMonth(c.createdAt.toDate()) : null);
        const matchMonth = mMonth === reportMonth;
        const matchWeek = chartTimeType === 'month' || reportWeek === 'all' || c.weekNumber?.toString() === reportWeek;
        return c.projectId === id && matchMonth && matchWeek;
      }).reduce((acc, curr) => acc + curr.amount, 0);

      if (chartTimeType === 'week' && reportWeek === 'all') {
        totalCost = totalCost / 4;
      }

      // Team breakdown for project
      const projectTeamDetails = uniqueTeams.map(teamName => {
        const tBudgets = projectBudgets.filter(b => b.teamName === teamName);
        const tCosts = costs.filter(c => {
          const mMonth = c.month || (c.createdAt?.toDate ? getMarketingMonth(c.createdAt.toDate()) : null);
          const matchMonth = mMonth === reportMonth;
          const matchWeek = chartTimeType === 'month' || reportWeek === 'all' || c.weekNumber?.toString() === reportWeek;
          return c.projectId === id && c.teamName === teamName && matchMonth && matchWeek;
        });

        let tTotalBudget = tBudgets.reduce((acc, curr) => acc + curr.amount, 0);
        let tTotalCost = tCosts.reduce((acc, curr) => acc + curr.amount, 0);

        if (chartTimeType === 'week') {
          tTotalBudget = tTotalBudget / 4;
          if (reportWeek === 'all') tTotalCost = tTotalCost / 4;
        }

        const tRevenue = efficiencyReports
          .filter(r => r.projectId === id && (teamMap[r.teamId] === teamName || r.teamName === teamName) && (reportMonth === 'all' || r.month === reportMonth))
          .reduce((acc, curr) => acc + (curr.revenue || 0), 0);

        return {
          name: teamName,
          budget: tTotalBudget,
          actual: tTotalCost,
          revenue: tRevenue
        };
      }).filter(d => d.budget > 0 || d.actual > 0)
        .sort((a, b) => b[reportSortBy] - a[reportSortBy]);

      const projectRevenue = efficiencyReports
        .filter(r => r.projectId === id && (reportMonth === 'all' || r.month === reportMonth) && (reportTeam === 'all' || (teamMap[r.teamId] === reportTeam || r.teamName === reportTeam)))
        .reduce((acc, curr) => acc + (curr.revenue || 0), 0);

      return {
        name: projectName,
        budget: totalBudget,
        actual: totalCost,
        revenue: projectRevenue,
        details: projectTeamDetails,
        isProjectReport: true
      };
    }).filter(d => d.budget > 0 || d.actual > 0)
      .sort((a, b) => b[reportSortBy] - a[reportSortBy]);
  }, [budgets, costs, projectMap, reportMonth, reportProject, chartTimeType, reportWeek, getMarketingMonth, reportSortBy]);

  const reportTableData = useMemo(() => {
    const teams = uniqueTeams.filter(t => reportTeam === 'all' || t === reportTeam).map(team => {
       const teamBudgets = filteredBudgets.filter(b => b.teamName === team);
       let totalBudget = teamBudgets.reduce((acc, curr) => acc + curr.amount, 0);
       
       let totalCost = filteredCosts.filter(c => {
         const matchWeek = chartTimeType === 'month' || reportWeek === 'all' || c.weekNumber?.toString() === reportWeek;
         return c.teamName === team && matchWeek;
       }).reduce((acc, curr) => acc + curr.amount, 0);

       if (chartTimeType === 'week') {
         totalBudget = totalBudget / 4;
         if (reportWeek === 'all') totalCost = totalCost / 4;
       }

       const projectsInTeam = Array.from(new Set(teamBudgets.map(b => projectMap[b.projectId])));

       const aggregatedProjects = projectsInTeam.map(projectId => {
         const pBudgets = teamBudgets.filter(b => b.projectId === projectId);
         let pTotalBudget = pBudgets.reduce((acc, curr) => acc + curr.amount, 0);
         
         let pTotalCost = filteredCosts.filter(c => {
           const matchWeek = chartTimeType === 'month' || reportWeek === 'all' || c.weekNumber?.toString() === reportWeek;
           return c.teamName === team && c.projectId === projectId && matchWeek;
         }).reduce((acc, curr) => acc + curr.amount, 0);

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
         projects: projectsInTeam,
         items: aggregatedProjects
       };
    }).filter(d => d.budget > 0 || d.actual > 0)
      .sort((a, b) => (b[reportSortBy] || 0) - (a[reportSortBy] || 0));

    const projectIds = Array.from(new Set([
      ...filteredBudgets.map(b => b.projectId),
      ...filteredCosts.map(c => c.projectId)
    ]));

    const projectsData = projectIds.filter(id => reportProject === 'all' || id === reportProject).map(id => {
       const pBudgets = filteredBudgets.filter(b => b.projectId === id);
       let totalBudget = pBudgets.reduce((acc, curr) => acc + curr.amount, 0);
       
       let totalCost = filteredCosts.filter(c => {
         const matchWeek = chartTimeType === 'month' || reportWeek === 'all' || c.weekNumber?.toString() === reportWeek;
         return c.projectId === id && matchWeek;
       }).reduce((acc, curr) => acc + curr.amount, 0);

       if (chartTimeType === 'week') {
         totalBudget = totalBudget / 4;
         if (reportWeek === 'all') totalCost = totalCost / 4;
       }

       const teamsInProject = Array.from(new Set(pBudgets.map(b => b.teamName)));

       const aggregatedTeams = uniqueTeams.map(teamName => {
         const tBudgets = pBudgets.filter(b => b.teamName === teamName);
         let tTotalBudget = tBudgets.reduce((acc, curr) => acc + curr.amount, 0);
         
         let tTotalCost = filteredCosts.filter(c => {
           const matchWeek = chartTimeType === 'month' || reportWeek === 'all' || c.weekNumber?.toString() === reportWeek;
           return c.projectId === id && c.teamName === teamName && matchWeek;
         }).reduce((acc, curr) => acc + curr.amount, 0);

         if (chartTimeType === 'week') {
           tTotalBudget = tTotalBudget / 4;
           if (reportWeek === 'all') tTotalCost = tTotalCost / 4;
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
         teams: teamsInProject,
         items: aggregatedTeams
       };
    }).filter(d => d.budget > 0 || d.actual > 0)
      .sort((a, b) => (b[reportSortBy] || 0) - (a[reportSortBy] || 0));

    return { teams, projects: projectsData };
  }, [uniqueTeams, reportTeam, reportProject, filteredBudgets, filteredCosts, chartTimeType, reportWeek, reportSortBy, projectMap]);

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
      <header className="sticky top-0 z-30 w-full bg-white/90 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-18 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200/50 overflow-hidden group transition-transform hover:scale-105">
              <img 
                src="https://picsum.photos/seed/mayhomes/100/100" 
                alt="MAYHOMES" 
                className="w-full h-full object-contain p-1.5 brightness-0 invert"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tighter leading-none">
                  <span className="text-orange-500">MAY</span>
                  <span className="text-indigo-600">HOMES</span>
                </h1>
              </div>
              <div className="flex gap-1.5 mt-1.5">
                {isSuperAdmin && <Badge variant="outline" className="text-[9px] font-bold py-0 h-4 border-purple-200 text-purple-700 bg-purple-50/50">SUPER ADMIN</Badge>}
                {(userRole === 'admin') && <Badge variant="outline" className="text-[9px] font-bold py-0 h-4 border-indigo-200 text-indigo-700 bg-indigo-50/50">ADMIN</Badge>}
                {isMod && <Badge variant="outline" className="text-[9px] font-bold py-0 h-4 border-slate-200 text-slate-700 bg-slate-50/50">MODERATOR</Badge>}
                {isGDDA && <Badge variant="outline" className="text-[9px] font-bold py-0 h-4 border-emerald-200 text-emerald-700 bg-emerald-50/50">GDDA</Badge>}
                {isUser && <Badge variant="outline" className="text-[9px] font-bold py-0 h-4 border-orange-200 text-orange-700 bg-orange-50/50">USER</Badge>}
              </div>
            </div>
          </div>

          {/* Removed Duplicated Navigation Menu */}
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <p className="text-sm font-bold text-slate-900 leading-tight">{user.displayName}</p>
              <p className="text-[11px] font-medium text-slate-500">{user.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-10 space-y-10">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
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
          <TabsList className="bg-white border border-slate-200 p-1 rounded-xl h-auto flex-wrap sm:flex-nowrap lg:flex mb-2">
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
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-8 h-12">Đối tượng</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right h-12">Ngân sách</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right h-12">Thực chi</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center h-12">Căn bán</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right h-12">Doanh số</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right pr-8 h-12">ROI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {efficiencyChartData.slice(0, 10).map((item, idx) => {
                      const roi = item.cost > 0 ? (item.revenue / item.cost).toFixed(2) : '0';
                      const isOverBudget = item.cost > item.budget;
                      return (
                        <TableRow key={idx} className="group hover:bg-indigo-50/20 transition-colors border-b-slate-100/50 h-20">
                          <TableCell className="pl-8">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm ${item.revenue > 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                {idx + 1}
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
                    })}
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
                <aside className="lg:w-64 space-y-2">
                  <div className="px-3 py-2">
                    <h2 className="mb-4 px-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Hệ thống</h2>
                    <div className="space-y-1">
                      <Button 
                        variant={adminSubTab === 'reports' ? 'secondary' : 'ghost'} 
                        className={`w-full justify-start rounded-xl px-4 py-2.5 h-auto transition-all ${adminSubTab === 'reports' ? 'bg-indigo-50 text-indigo-700 shadow-sm font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
                        onClick={() => setAdminSubTab('reports')}
                      >
                        <BarChart3 className={`mr-3 h-5 w-5 ${adminSubTab === 'reports' ? 'text-indigo-600' : 'text-slate-400'}`} />
                        Báo cáo & Phân tích
                      </Button>
                      {(isAdmin || isMod) && (
                        <>
                          <Button 
                            variant={adminSubTab === 'projects' ? 'secondary' : 'ghost'} 
                            className={`w-full justify-start rounded-xl px-4 py-2.5 h-auto transition-all ${adminSubTab === 'projects' ? 'bg-indigo-50 text-indigo-700 shadow-sm font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
                            onClick={() => setAdminSubTab('projects')}
                          >
                            <Building2 className={`mr-3 h-5 w-5 ${adminSubTab === 'projects' ? 'text-indigo-600' : 'text-slate-400'}`} />
                            Quản lý Dự án
                          </Button>
                          <Button 
                            variant={adminSubTab === 'regions' ? 'secondary' : 'ghost'} 
                            className={`w-full justify-start rounded-xl px-4 py-2.5 h-auto transition-all ${adminSubTab === 'regions' ? 'bg-indigo-50 text-indigo-700 shadow-sm font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
                            onClick={() => setAdminSubTab('regions')}
                          >
                            <Map className={`mr-3 h-5 w-5 ${adminSubTab === 'regions' ? 'text-indigo-600' : 'text-slate-400'}`} />
                            Quản lý Vùng
                          </Button>
                          <Button 
                            variant={adminSubTab === 'types' ? 'secondary' : 'ghost'} 
                            className={`w-full justify-start rounded-xl px-4 py-2.5 h-auto transition-all ${adminSubTab === 'types' ? 'bg-indigo-50 text-indigo-700 shadow-sm font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
                            onClick={() => setAdminSubTab('types')}
                          >
                            <Layers className={`mr-3 h-5 w-5 ${adminSubTab === 'types' ? 'text-indigo-600' : 'text-slate-400'}`} />
                            Quản lý Loại hình
                          </Button>
                          <Button 
                            variant={adminSubTab === 'teams' ? 'secondary' : 'ghost'} 
                            className={`w-full justify-start rounded-xl px-4 py-2.5 h-auto transition-all ${adminSubTab === 'teams' ? 'bg-indigo-50 text-indigo-700 shadow-sm font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
                            onClick={() => setAdminSubTab('teams')}
                          >
                            <Users className={`mr-3 h-5 w-5 ${adminSubTab === 'teams' ? 'text-indigo-600' : 'text-slate-400'}`} />
                            Quản lý Team
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="px-3 py-2">
                    <h2 className="mb-4 px-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Dữ liệu</h2>
                    <div className="space-y-1">
                      {(isAdmin || isMod) && (
                        <>
                          <Button 
                            variant={adminSubTab === 'budgets' ? 'secondary' : 'ghost'} 
                            className={`w-full justify-start rounded-xl px-4 py-2.5 h-auto transition-all ${adminSubTab === 'budgets' ? 'bg-indigo-50 text-indigo-700 shadow-sm font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
                            onClick={() => setAdminSubTab('budgets')}
                          >
                            <Wallet className={`mr-3 h-5 w-5 ${adminSubTab === 'budgets' ? 'text-indigo-600' : 'text-slate-400'}`} />
                            Ngân sách
                          </Button>
                          <Button 
                            variant={adminSubTab === 'costs' ? 'secondary' : 'ghost'} 
                            className={`w-full justify-start rounded-xl px-4 py-2.5 h-auto transition-all ${adminSubTab === 'costs' ? 'bg-indigo-50 text-indigo-700 shadow-sm font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
                            onClick={() => setAdminSubTab('costs')}
                          >
                            <TrendingUp className={`mr-3 h-5 w-5 ${adminSubTab === 'costs' ? 'text-indigo-600' : 'text-slate-400'}`} />
                            Cập nhật Chi phí
                          </Button>
                          <Button 
                            variant={adminSubTab === 'efficiency' ? 'secondary' : 'ghost'} 
                            className={`w-full justify-start rounded-xl px-4 py-2.5 h-auto transition-all ${adminSubTab === 'efficiency' ? 'bg-indigo-50 text-indigo-700 shadow-sm font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
                            onClick={() => setAdminSubTab('efficiency')}
                          >
                            <BarChart3 className={`mr-3 h-5 w-5 ${adminSubTab === 'efficiency' ? 'text-indigo-600' : 'text-slate-400'}`} />
                            Hiệu quả Kinh doanh
                          </Button>
                        </>
                      )}
                      {isAdmin && (
                        <Button 
                          variant={adminSubTab === 'users' ? 'secondary' : 'ghost'} 
                          className={`w-full justify-start rounded-xl px-4 py-2.5 h-auto transition-all ${adminSubTab === 'users' ? 'bg-indigo-50 text-indigo-700 shadow-sm font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
                          onClick={() => setAdminSubTab('users')}
                        >
                          <UserCircle className={`mr-3 h-5 w-5 ${adminSubTab === 'users' ? 'text-indigo-600' : 'text-slate-400'}`} />
                          Người dùng
                        </Button>
                      )}
                    </div>
                  </div>

                  {(isAdmin || isMod) && (
                    <div className="px-3 py-2">
                      <h2 className="mb-4 px-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Bảo mật</h2>
                      <div className="space-y-1">
                        <Button 
                          variant={adminSubTab === 'audit' ? 'secondary' : 'ghost'} 
                          className={`w-full justify-start rounded-xl px-4 py-2.5 h-auto transition-all ${adminSubTab === 'audit' ? 'bg-indigo-50 text-indigo-700 shadow-sm font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
                          onClick={() => setAdminSubTab('audit')}
                        >
                          <History className={`mr-3 h-5 w-5 ${adminSubTab === 'audit' ? 'text-indigo-600' : 'text-slate-400'}`} />
                          Nhật ký
                        </Button>
                        {isAdmin && (
                          <Button 
                            variant={adminSubTab === 'backup' ? 'secondary' : 'ghost'} 
                            className={`w-full justify-start rounded-xl px-4 py-2.5 h-auto transition-all ${adminSubTab === 'backup' ? 'bg-indigo-50 text-indigo-700 shadow-sm font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
                            onClick={() => setAdminSubTab('backup')}
                          >
                            <Database className={`mr-3 h-5 w-5 ${adminSubTab === 'backup' ? 'text-indigo-600' : 'text-slate-400'}`} />
                            Sao lưu
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
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
                                <Input 
                                  type="month" 
                                  className="bg-slate-50 border-none h-11 rounded-xl" 
                                  value={newEfficiencyMonth}
                                  onChange={e => setNewEfficiencyMonth(e.target.value)}
                                />
                              </div>
                              <div className="lg:col-span-2 space-y-2">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Dự án</Label>
                                <Select value={newEfficiencyProject} onValueChange={setNewEfficiencyProject}>
                                  <SelectTrigger className="bg-slate-50 border-none h-11 rounded-xl">
                                    <SelectValue placeholder="Chọn dự án..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <div className="p-2 sticky top-0 bg-popover z-10 border-b">
                                      <div className="relative">
                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                          placeholder="Tìm dự án..."
                                          className="pl-8 h-9 border-none bg-slate-50"
                                          value={newEfficiencyProjectSearch}
                                          onChange={(e) => setNewEfficiencyProjectSearch(e.target.value)}
                                          onKeyDown={(e) => e.stopPropagation()}
                                        />
                                      </div>
                                    </div>
                                    {projects
                                      .filter(p => p.name.toLowerCase().includes(newEfficiencyProjectSearch.toLowerCase()) || p.id.toLowerCase().includes(newEfficiencyProjectSearch.toLowerCase()))
                                      .map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                          <div className="flex flex-col">
                                            <span className="font-medium text-slate-900">{p.name}</span>
                                            <span className="text-[9px] text-slate-400 font-mono">ID: {p.id}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="lg:col-span-2 space-y-2">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Team</Label>
                                <Select value={newEfficiencyTeam} onValueChange={setNewEfficiencyTeam}>
                                  <SelectTrigger className="bg-slate-50 border-none h-11 rounded-xl">
                                    <SelectValue placeholder="Chọn team..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <div className="p-2 sticky top-0 bg-popover z-10 border-b">
                                      <div className="relative">
                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                          placeholder="Tìm team..."
                                          className="pl-8 h-9 border-none bg-slate-50"
                                          value={newEfficiencyTeamSearch}
                                          onChange={(e) => setNewEfficiencyTeamSearch(e.target.value)}
                                          onKeyDown={(e) => e.stopPropagation()}
                                        />
                                      </div>
                                    </div>
                                    {teams
                                      .filter(t => t.name.toLowerCase().includes(newEfficiencyTeamSearch.toLowerCase()) || t.id.toLowerCase().includes(newEfficiencyTeamSearch.toLowerCase()))
                                      .map(t => (
                                        <SelectItem key={t.id} value={t.id}>
                                          <div className="flex flex-col">
                                            <span className="font-medium text-slate-900">{t.name}</span>
                                            <span className="text-[9px] text-slate-400 font-mono">ID: {t.id}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
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
                                  onChange={e => setNewEfficiencyRevenue(e.target.value.replace(/,/g, ''))}
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
                                  <Input 
                                    placeholder="Tìm dự án, team..." 
                                    className="pl-10 bg-slate-50 border-none h-10 text-xs rounded-xl"
                                    value={adminEfficiencySearch}
                                    onChange={e => setAdminEfficiencySearch(e.target.value)}
                                  />
                                </div>
                                <div className="relative">
                                  <Input 
                                    type="month" 
                                    className="w-40 bg-slate-50 border-none h-10 text-xs rounded-xl pr-10"
                                    value={adminEfficiencyMonthFilter}
                                    onChange={e => setAdminEfficiencyMonthFilter(e.target.value)}
                                  />
                                  {adminEfficiencyMonthFilter && (
                                    <button 
                                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full transition-colors"
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
                            <Table>
                              <TableHeader className="bg-slate-50/50">
                                <TableRow>
                                  <TableHead className="w-10 pl-4">
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
                                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-2">Dự án / Team</TableHead>
                                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Tháng</TableHead>
                                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Số căn</TableHead>
                                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Doanh số</TableHead>
                                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center w-[120px]">Thao tác</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredEfficiencyReports.map((report) => (
                                  <TableRow key={report.id} className="hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="w-10 pl-4">
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
                                    <TableCell colSpan={5} className="h-32 text-center text-slate-400 italic">
                                      Chưa có dữ liệu hiệu quả kinh doanh cho kỳ này
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      </div>
                    )}

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
                                {types.map(t => (
                                  <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {isAdmin && (
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                onClick={handleExportProjects}
                              >
                                <Download className="w-4 h-4 mr-2" /> Xuất Excel
                              </Button>
                              <Dialog>
                                <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-700" />}>
                                  <Plus className="w-4 h-4 mr-2" /> Thêm dự án
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
                        </div>
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
                                  />
                                }>
                                  <Building2 className="w-3 h-3 mr-1" /> Sửa Vùng ({selectedProjectIds.length})
                                </DialogTrigger>
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

                              <Dialog open={isBulkUpdateTypeDialogOpen} onOpenChange={setIsBulkUpdateTypeDialogOpen}>
                                <DialogTrigger render={
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 text-[10px] text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                    disabled={selectedProjectIds.length === 0}
                                  />
                                }>
                                  <Layers className="w-3 h-3 mr-1" /> Sửa Loại hình ({selectedProjectIds.length})
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[400px]">
                                  <DialogHeader>
                                    <DialogTitle>Cập nhật Loại hình</DialogTitle>
                                    <DialogDescription>Chọn loại hình mới cho {selectedProjectIds.length} dự án đã chọn.</DialogDescription>
                                  </DialogHeader>
                                  <div className="py-4 space-y-4">
                                    <div className="space-y-2">
                                      <Label>Loại hình</Label>
                                      <Select value={selectedTypeForBulk} onValueChange={setSelectedTypeForBulk}>
                                        <SelectTrigger><SelectValue placeholder="Chọn loại hình..." /></SelectTrigger>
                                        <SelectContent>
                                          {types.map(t => (
                                            <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button onClick={handleBulkUpdateProjectType} className="w-full bg-blue-600 hover:bg-blue-700">
                                      Cập nhật cho {selectedProjectIds.length} dự án
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>

                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-[10px] text-blue-600 border-blue-200 hover:bg-blue-50"
                                onClick={handleSyncProjectCodes}
                                disabled={isSyncingProjects}
                              >
                                <RefreshCw className={`w-3 h-3 mr-1 ${isSyncingProjects ? 'animate-spin' : ''}`} /> Đồng bộ Mã Dự án
                              </Button>
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
                                <TableHead className="cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setProjectSort({ key: 'projectCode', direction: projectSort.direction === 'asc' ? 'desc' : 'asc' })}>
                                  <div className="flex items-center gap-2">Mã Dự án <ArrowUpDown className="w-3 h-3" /></div>
                                </TableHead>
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
                                  <TableCell className="font-mono text-xs font-bold text-blue-600">
                                    {editingProjectId === p.id ? (
                                      <Input value={editingProjectCode} onChange={e => setEditingProjectCode(e.target.value)} className="h-8 font-mono" />
                                    ) : (p.projectCode || '-')}
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {editingProjectId === p.id ? (
                                      <Input value={editingProjectName} onChange={e => {
                                        setEditingProjectName(e.target.value);
                                        if (!editingProjectCode) {
                                          setEditingProjectCode(extractProjectCode(e.target.value));
                                        }
                                      }} className="h-8" />
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
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        (p.type || '').trim() === 'Cao tầng' ? 'bg-indigo-50 text-indigo-600' : 
                                        (p.type || '').trim() === 'Thấp tầng' ? 'bg-amber-50 text-amber-600' : 
                                        p.type ? 'bg-slate-50 text-slate-600' : 'bg-red-50 text-red-600'
                                      }`}>
                                        {p.type || 'Chưa phân loại'}
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
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleUpdateProject(p.id, editingProjectName, editingProjectCode, editingProjectRegion, editingProjectType)}>
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
                                               setEditingProjectCode(p.projectCode || extractProjectCode(p.name));
                                              setEditingProjectRegion(p.region || '');
                                              setEditingProjectType(p.type || '');
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
                                className="h-8 text-[10px] text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                onClick={handleSyncTypes}
                                disabled={isSyncingTypes}
                                title="Chuẩn hóa dữ liệu & Tự động thêm loại hình còn thiếu từ danh sách dự án"
                              >
                                {isSyncingTypes ? (
                                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-3 h-3 mr-1" />
                                )}
                                Đồng bộ Dữ liệu
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-[10px] text-blue-600 border-blue-200 hover:bg-blue-50"
                                onClick={() => {
                                  setSelectedGlobalProjectIds(selectedProjectIds);
                                  setTargetGlobalType('');
                                  setIsGlobalProjectAssignDialogOpen(true);
                                }}
                                title="Chọn nhiều dự án và gán 1 loại hình duy nhất"
                              >
                                <Plus className="w-3 h-3 mr-1" /> Gán Loại hình cho Dự án
                              </Button>
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
                                  const typeProjects = projects.filter(p => (p.type || '').trim() === (t.name || '').trim());
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
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-indigo-600" onClick={() => handleMigrateType(t)} title="Chuyển toàn bộ dự án">
                                                  <RefreshCw className="h-3.5 w-3.5" />
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
                              <TableRow className="bg-slate-50/50">
                                {isAdmin && <TableCell />}
                                <TableCell className="font-medium italic text-slate-500">
                                  Chưa phân loại
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="font-normal border-red-100 bg-red-50 text-red-600">
                                    {projects.filter(p => !p.type || !(p.type || '').trim()).length} dự án
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-slate-300">-</TableCell>
                                <TableCell className="text-right italic text-xs text-slate-400">Tự động</TableCell>
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
                              <Input 
                                placeholder="Nhập tên team..." 
                                className="pl-10 bg-slate-50 border-none shadow-none"
                                value={teamSearch}
                                onChange={e => setTeamSearch(e.target.value)}
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
                                      <div className="flex justify-end gap-1">
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
                                <TableHead>Kỳ</TableHead>
                                <TableHead className="text-right">Chi phí</TableHead>
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
                                    <TableCell className="text-xs">Kỳ {c.weekNumber}</TableCell>
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
                      <CardDescription>Theo dõi hiệu quả sử dụng ngân sách & Hiệu quả kinh doanh thực tế</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                    {/* Alert for Over Budget */}
                    {overBudgetStats.count > 0 && (
                      <div className="mx-6 mt-2 p-5 bg-red-50 border-2 border-red-200 rounded-3xl flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm">
                        <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center shrink-0 border border-red-200">
                          <AlertTriangle className="w-6 h-6 text-red-600 animate-pulse" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-black text-red-900 uppercase tracking-tighter text-sm">Cảnh báo vượt ngân sách ({overBudgetStats.count} mục)</h4>
                          <p className="text-xs text-red-700/80 font-medium leading-relaxed mt-1">
                            Tổng chi phí thực tế đã vượt ngân sách đăng ký của <strong>{overBudgetStats.count}</strong> đơn vị với tổng số tiền vượt là 
                            <span className="font-black ml-1 text-red-800">{formatCurrency(overBudgetStats.totalExcess)}</span>. 
                            Vui lòng kiểm tra lại các mục được đánh dấu màu đỏ dưới bảng.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Filters Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5 p-6 rounded-3xl bg-slate-50/50 border border-slate-200/60 shadow-inner mb-8">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                          <Building2 className="w-3 h-3" /> Dự án
                        </Label>
                        <Select value={reportProject} onValueChange={setReportProject}>
                          <SelectTrigger className="bg-white border-slate-200 shadow-sm transition-all hover:border-blue-300 focus:ring-2 focus:ring-blue-100 h-10">
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
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                            <Users className="w-3 h-3" /> Đội (Team)
                          </Label>
                          <Select value={reportTeam} onValueChange={setReportTeam}>
                            <SelectTrigger className="bg-white border-slate-200 shadow-sm transition-all hover:border-blue-300 focus:ring-2 focus:ring-blue-100 h-10">
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

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                          <Map className="w-3 h-3" /> Miền / Vùng
                        </Label>
                        <Select value={reportRegion} onValueChange={setReportRegion}>
                          <SelectTrigger className="bg-white border-slate-200 shadow-sm transition-all hover:border-blue-300 focus:ring-2 focus:ring-blue-100 h-10">
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

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                          <Layers className="w-3 h-3" /> Loại hình
                        </Label>
                        <Select value={reportType} onValueChange={setReportType}>
                          <SelectTrigger className="bg-white border-slate-200 shadow-sm transition-all hover:border-blue-300 focus:ring-2 focus:ring-blue-100 h-10">
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

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                          <TrendingUp className="w-3 h-3" /> Năm báo cáo
                        </Label>
                        <Select value={reportYear} onValueChange={setReportYear}>
                          <SelectTrigger className="bg-white border-slate-200 shadow-sm transition-all hover:border-blue-300 focus:ring-2 focus:ring-blue-100 h-10">
                            <SelectValue placeholder="Chọn năm" />
                          </SelectTrigger>
                          <SelectContent>
                            {[2024, 2025, 2026, 2027, 2028].map(y => (
                              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                          <History className="w-3 h-3" /> {reportMonth ? getMarketingMonthDisplayRange(reportMonth) : 'Tất cả các tháng'}
                        </Label>
                        <div className="relative">
                          <Input 
                            type="month" 
                            className="bg-white border-slate-200 shadow-sm h-10 cursor-pointer transition-all hover:border-blue-300 pr-10" 
                            value={reportMonth} 
                            onChange={e => setReportMonth(e.target.value)} 
                          />
                          {reportMonth && (
                            <button 
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
                              onClick={() => setReportMonth('')}
                            >
                              <X className="w-3 h-3 text-slate-400" />
                            </button>
                          )}
                        </div>
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
                            <SelectItem value="1">Kỳ 1 ({getPeriodRange(reportMonth, '1')})</SelectItem>
                            <SelectItem value="2">Kỳ 2 ({getPeriodRange(reportMonth, '2')})</SelectItem>
                            <SelectItem value="3">Kỳ 3 ({getPeriodRange(reportMonth, '3')})</SelectItem>
                            <SelectItem value="4">Kỳ 4 ({getPeriodRange(reportMonth, '4')})</SelectItem>
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

                      {isAdmin && (
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                            <UserCircle className="w-3 h-3" /> Nhân viên
                          </Label>
                          <Select value={reportUser} onValueChange={setReportUser}>
                            <SelectTrigger className="bg-white border-slate-200 shadow-sm transition-all hover:border-blue-300 focus:ring-2 focus:ring-blue-100 h-10">
                              <SelectValue placeholder="Tất cả nhân viên" />
                            </SelectTrigger>
                            <SelectContent>
                              <div className="p-2 sticky top-0 bg-popover z-10 border-b">
                                <div className="relative">
                                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    placeholder="Tìm nhân viên..."
                                    className="pl-8 h-9"
                                    value={reportUserSearch}
                                    onChange={(e) => setReportUserSearch(e.target.value)}
                                    onKeyDown={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </div>
                              <SelectItem value="all">Tất cả nhân viên</SelectItem>
                              {allUsers
                                .filter(u => u.email.toLowerCase().includes(reportUserSearch.toLowerCase()) || (u.displayName || '').toLowerCase().includes(reportUserSearch.toLowerCase()))
                                .map(u => (
                                  <SelectItem key={u.id} value={u.email}>{u.fullName || u.email}</SelectItem>
                                ))
                              }
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    {/* Summary Cards - Viewable by all but tailored by role */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
                      {/* 0. Tổng dự án (Admin only) */}
                      {isAdmin && (
                        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col gap-1 transition-all hover:border-blue-200 group">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Tổng dự án</p>
                            <span className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
                              <Building2 className="w-3 h-3 text-blue-500" />
                            </span>
                          </div>
                          <p className="text-xl font-black text-slate-900 leading-none">
                            {projects.length} <span className="text-[10px] font-bold text-slate-400">Dự án</span>
                          </p>
                          <div className="mt-2 h-1 w-full bg-slate-50 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 w-full" />
                          </div>
                        </div>
                      )}

                      {/* 1. Tổng ngân sách */}
                        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col gap-1 transition-all hover:border-blue-200 group">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Tổng ngân sách</p>
                            <span className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
                              <Wallet className="w-3 h-3 text-blue-500" />
                            </span>
                          </div>
                          <p className="text-xl font-black text-slate-900 leading-none">
                            {filteredBudgets.reduce((acc, curr) => acc + (curr.amount || 0), 0).toLocaleString()} <span className="text-[10px] font-bold text-slate-400">đ</span>
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
                          <p className="text-xl font-black text-emerald-600 leading-none">
                            {filteredCosts.reduce((acc, curr) => acc + (curr.amount || 0), 0).toLocaleString()} <span className="text-[10px] font-bold text-slate-400">đ</span>
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
                            <p className="text-xl font-black text-slate-900 leading-none">
                              {efficiencyChartData.reduce((acc, curr) => acc + (curr.sales || 0), 0)}
                            </p>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Căn</span>
                          </div>
                          <p className="text-[8px] font-bold text-slate-400 mt-2 italic">Dữ liệu từ hiệu quả kinh doanh</p>
                        </div>

                        {/* 4. Tổng doanh số (Sales) */}
                        <div className="p-5 rounded-2xl bg-indigo-600 border border-indigo-700 shadow-lg shadow-indigo-100 flex flex-col gap-1 transition-all hover:translate-y-[-2px]">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] text-indigo-100 font-black uppercase tracking-widest">Doanh số (Sales)</p>
                            <TrendingUp className="w-3 h-3 text-indigo-200" />
                          </div>
                          <p className="text-xl font-black text-white leading-none">
                            {efficiencyChartData.reduce((acc, curr) => acc + (curr.revenue || 0), 0).toLocaleString()} <span className="text-[10px] font-bold text-indigo-200">đ</span>
                          </p>
                          <div className="mt-2 text-[9px] font-bold text-indigo-200/80">
                            Hiệu quả doanh thu thực tế
                          </div>
                        </div>

                        {/* 5. ROMI / Cost Ratio */}
                        {(() => {
                           const totalRevenue = efficiencyChartData.reduce((acc, curr) => acc + (curr.revenue || 0), 0);
                           const totalCost = filteredCosts.reduce((acc, curr) => acc + (curr.amount || 0), 0);
                           const romi = totalCost > 0 ? (totalRevenue / totalCost).toFixed(2) : '0';
                           const costRatio = totalRevenue > 0 ? (totalCost / totalRevenue * 100).toFixed(1) : '0';
                           
                           return (
                             <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col gap-1 transition-all hover:border-amber-200">
                               <div className="flex items-center justify-between mb-1">
                                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">ROMI / CP Marketing</p>
                                 <BarChart3 className="w-3 h-3 text-amber-500" />
                               </div>
                               <div className="flex items-baseline gap-2">
                                 <p className="text-xl font-black text-amber-600 leading-none">{romi}x</p>
                                 <span className="text-[10px] font-bold text-slate-400 border-l pl-2 border-slate-200">{costRatio}%</span>
                               </div>
                               <p className="text-[8px] font-bold text-slate-400 mt-2 uppercase">ROMI | CP/Doanh thu</p>
                             </div>
                           );
                        })()}

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
                                <p className={`text-xl font-black leading-none ${usagePercent > 100 ? 'text-rose-600' : usagePercent > 90 ? 'text-amber-600' : 'text-slate-900'}`}>{usagePercent.toFixed(1)}%</p>
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
                              <TabsTrigger value="efficiency" className="text-[10px] px-4 h-7 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600">Hiệu quả</TabsTrigger>
                            </TabsList>
                          </div>
                        </div>

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
                                <Bar yAxisId="left" dataKey="actual" name="Chi phí" fill="#10b981" radius={[6, 6, 0, 0]} barSize={32} />
                                <Line yAxisId="right" type="monotone" dataKey="revenue" name="Doanh số" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2 }} activeDot={{ r: 6 }} />
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
                                <Bar yAxisId="left" dataKey="actual" name="Chi phí" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={24} />
                                <Line yAxisId="right" type="monotone" dataKey="revenue" name="Doanh số" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2 }} activeDot={{ r: 6 }} />
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
                                <Bar yAxisId="left" dataKey="actual" name="Chi phí" fill="#ec4899" radius={[6, 6, 0, 0]} barSize={32} />
                                <Line yAxisId="right" type="monotone" dataKey="revenue" name="Doanh số" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                              </ComposedChart>
                            </ResponsiveContainer>
                          </div>
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
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
                              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                                <TrendingUp className="w-12 h-12 text-blue-600" />
                              </div>
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Tổng căn đã bán</p>
                              <div className="flex items-baseline gap-2">
                                <p className="text-3xl font-black text-slate-900 leading-none">
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
                              <p className="text-2xl font-black text-emerald-600 leading-none">
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
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Tổng ngân sách</p>
                              <p className="text-2xl font-black text-blue-600 leading-none">
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
                              <p className="text-2xl font-black text-amber-600 leading-none">
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
                                    <Bar dataKey="budget" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={20} />
                                    <Bar dataKey="cost" fill="#f87171" radius={[4, 4, 0, 0]} barSize={20} />
                                    <Line type="monotone" dataKey="revenue" name="Doanh số" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2 }} activeDot={{ r: 6 }} />
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
                                    <Bar dataKey="budget" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={24} />
                                    <Bar dataKey="cost" fill="#f87171" radius={[4, 4, 0, 0]} barSize={24} />
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
                                  <Table>
                                    <TableHeader className="bg-slate-50/50">
                                      <TableRow className="hover:bg-transparent">
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-8 h-12">Đối tượng</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-right h-12">Ngân sách</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-right h-12">Chi phí thực</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center h-12">Sản lượng</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-right h-12">Doanh số</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-right pr-8 h-12">Chỉ số ROI</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {salesGeneratingData.map((item, idx) => {
                                        const roi = item.cost > 0 ? (item.revenue / item.cost).toFixed(2) : '0';
                                        const isOverBudget = item.cost > item.budget;
                                        return (
                                          <TableRow key={idx} className={`group transition-colors border-b-slate-50 ${isOverBudget ? 'bg-red-50/40 hover:bg-red-50/60' : 'hover:bg-emerald-50/30'}`}>
                                            <TableCell className="pl-8 py-4">
                                              <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${isOverBudget ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                  {idx + 1}
                                                </div>
                                                <div>
                                                  <div className="flex items-center gap-2">
                                                    <p className="font-black text-slate-900 transition-colors uppercase tracking-tight">{item.name}</p>
                                                    {isOverBudget && (
                                                      <TooltipProvider>
                                                        <UITooltip>
                                                          <TooltipTrigger>
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
                                  <Table>
                                    <TableHeader className="bg-slate-50/50">
                                      <TableRow className="hover:bg-transparent">
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-8 h-12">Đối tượng</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-right h-12">Ngân sách</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-right h-12">Chi phí thực</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-right pr-8 h-12">Số dự án/team liên quan</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {noSalesData.map((item, idx) => {
                                        const isOverBudget = item.cost > item.budget;
                                        return (
                                          <TableRow key={idx} className={`group transition-colors border-b-slate-50 ${isOverBudget ? 'bg-red-50/50 hover:bg-red-100/40' : 'hover:bg-red-50/30'}`}>
                                            <TableCell className="pl-8 py-4">
                                              <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${isOverBudget ? 'bg-red-200 text-red-700' : 'bg-red-100 text-red-600'}`}>
                                                  {idx + 1}
                                                </div>
                                                <div>
                                                  <div className="flex items-center gap-2">
                                                    <p className="font-black text-slate-900 uppercase tracking-tight">{item.name}</p>
                                                    {isOverBudget && (
                                                      <TooltipProvider>
                                                        <UITooltip>
                                                          <TooltipTrigger>
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
                               <TableCell className="font-medium">{b.teamName}</TableCell>
                              <TableCell>{b.implementerName}</TableCell>
                              <TableCell>{projectMap[b.projectId] || b.projectName || 'N/A'}</TableCell>
                              <TableCell className="text-right font-mono">{b.amount.toLocaleString()} đ</TableCell>
                              <TableCell className="text-xs text-slate-500">{b.userEmail}</TableCell>
                              {isAdmin && (
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button 
                                      size="icon" 
                                      variant="ghost" 
                                      className="h-8 w-8 text-slate-400 hover:text-blue-600" 
                                      onClick={() => handleOpenEditBudget(b)}
                                      title="Sửa ngân sách"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button 
                                      size="icon" 
                                      variant="ghost" 
                                      className="h-8 w-8 text-slate-400 hover:text-red-600" 
                                      onClick={() => handleDeleteBudget(b.id, b.projectName)}
                                      title="Xóa ngân sách"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
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
                                        <DialogTrigger render={<Button variant="outline" size="sm" className="h-7 text-[10px] px-2" />}>
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
                          <Input 
                            placeholder="Tìm Email, ID, Collection..." 
                            className="pl-10 h-10 w-[250px] bg-slate-50 border-none rounded-xl"
                            value={logSearch}
                            onChange={e => setLogSearch(e.target.value)}
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
                          <div key={log.id} className="group relative flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all">
                            <div className="mt-1 shrink-0">
                              <Badge className={`text-[10px] font-black border-none uppercase h-5 px-2 ${
                                log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700' : 
                                log.action === 'DELETE' || log.action?.startsWith('DELETE_') ? 'bg-red-100 text-red-700' : 
                                log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                                log.action === 'SYSTEM_CHECKPOINT' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {log.action === 'CREATE' ? 'Thêm mới' : 
                                 log.action === 'DELETE' ? 'Xóa' : 
                                 log.action === 'UPDATE' ? 'Cập nhật' : 
                                 log.action === 'DELETE_ALL' ? 'Xóa hết' :
                                 log.action === 'IMPORT_BUDGETS' ? 'Nhập CSV' :
                                 log.action === 'SYSTEM_CHECKPOINT' ? 'Phiên bản' :
                                 log.action === 'DEEP_SYSTEM_RESTORE' ? 'Khôi phục' : log.action}
                              </Badge>
                            </div>
                            <div className="flex-1 space-y-2 min-w-0">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-bold text-slate-900 truncate">
                                  <span className="text-indigo-600">{log.userEmail}</span> 
                                  <span className="mx-1 text-slate-400 font-medium">→</span>
                                  <span className="text-slate-700">{log.collection}</span>
                                </p>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                                  {log.timestamp?.toDate ? safeFormat(log.timestamp.toDate(), 'HH:mm:ss dd/MM/yyyy') : '...'}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded">ID: {log.docId}</span>
                              </div>
                              
                              <div className="p-3 rounded-xl bg-slate-50/50 border border-slate-100/50 text-xs flex justify-between items-center group/data">
                                <div className="flex-1">
                                  <RenderLogData data={log.data} action={log.action} />
                                </div>
                                {log.action === 'SYSTEM_CHECKPOINT' && (
                                  <Button 
                                    size="sm" 
                                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black h-7 px-4 rounded-xl ml-4"
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
                      <Select value={selectedTeamId} onValueChange={(val) => {
                        const team = teams.find(t => t.id === val);
                        setSelectedTeamId(val);
                        if (team) setSelectedTeamName(team.name);
                      }}>
                        <SelectTrigger className="bg-slate-50 border-slate-200 focus:ring-blue-500 h-11">
                          <SelectValue placeholder="Vui lòng chọn team" />
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
                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
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
                          <Input 
                            type="month" 
                            className="bg-slate-50 border-slate-200 h-11" 
                            value={costBudgetMonth} 
                            onChange={e => setCostBudgetMonth(e.target.value)} 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Khoản ngân sách</Label>
                          <Dialog open={isBudgetSelectionDialogOpen} onOpenChange={setIsBudgetSelectionDialogOpen}>
                            <DialogTrigger render={
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
                                        <span className="font-bold text-slate-900 truncate">{projectMap[b.projectId]}</span>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                          <span className="font-medium">{b.teamName}</span>
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
                                  <Input
                                    placeholder="Tìm theo dự án, team hoặc nhân sự..."
                                    className="pl-10 h-12 bg-slate-50 border-slate-100 focus:border-emerald-200 focus:ring-emerald-100 text-sm rounded-xl"
                                    value={budgetSearch}
                                    onChange={(e) => setBudgetSearch(e.target.value)}
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
                                        <h4 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                                          {projectMap[b.projectId]}
                                        </h4>
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                                          {b.type}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                          <Users className="w-3 h-3 opacity-60" />
                                          <span className="font-medium">{b.teamName}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                          <UserCircle className="w-3 h-3 opacity-60" />
                                          <span>{b.implementerName}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                          <Map className="w-3 h-3 opacity-60" />
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
                            <TableCell className="text-xs">Kỳ {c.weekNumber}</TableCell>
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
                <Input 
                  placeholder="Tìm kiếm dự án..." 
                  className="pl-10 h-9"
                  value={projectSearch}
                  onChange={e => setProjectSearch(e.target.value)}
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
          <div className="flex-1 overflow-y-auto my-4 p-4 bg-slate-50 rounded-xl border border-slate-100 font-mono text-[11px] space-y-2">
            {importErrors.map((err, idx) => (
              <div key={idx} className="flex gap-3 text-slate-700 bg-white p-2 rounded border border-slate-200 shadow-sm">
                <span className="text-red-400 font-bold shrink-0">{idx + 1}.</span>
                <span className="break-words">{err}</span>
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
                  <SelectValue placeholder="Chọn dự án" />
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
                            <span className="font-medium">{p.name}</span>
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
                  <SelectValue placeholder="Chọn team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {teams.map(t => (
                      <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
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
              <Label className="text-xs font-bold text-slate-500 uppercase">Số tiền (VNĐ)</Label>
              <div className="relative">
                <Input 
                  type="text" 
                  value={formatNumberWithCommas(editingBudgetAmount)} 
                  onChange={handleNumberInputChange(setEditingBudgetAmount)} 
                  className="bg-slate-50 border-slate-200 pr-8 font-mono font-bold text-blue-600"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">đ</span>
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
                onChange={e => setNewEfficiencyRevenue(e.target.value.replace(/,/g, ''))}
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
    </div>
  );
}
