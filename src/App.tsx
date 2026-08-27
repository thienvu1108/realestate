import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import * as XLSX from 'xlsx';
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
  arrayUnion,
  limit,
  getDocs
} from './firestore-proxy';
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
} from "@/components/ui/dialog";
import { 
  Popover, 
  PopoverContent, 
  PopoverDescription, 
  PopoverHeader, 
  PopoverTitle, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { 
  Tooltip as UITooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { 
  LogIn, LogOut, Plus, Search, Trash2, Edit2, 
  FileBox, BarChart3, Users, Settings, Filter, Download, 
  Upload, CheckCircle2, XCircle, AlertCircle, RefreshCw, 
  ChevronLeft, ChevronRight, Calendar, User as UserIcon, LayoutDashboard, 
  ArrowUpRight, ArrowDownRight, PieChart, TrendingUp, History, 
  FileText, Check, MoreHorizontal, FileDown, Eye, Send, MessageSquare, Info, ShieldCheck, UserCheck, ChevronDown, ChevronDown as ChevronDownIcon,
  ChevronUp, ChevronUp as ChevronUpIcon,
  ExternalLink,
  LockKeyhole,
  Save,
  Undo,
  X,
  Menu,
  ArrowUpDown, ArrowUp, ArrowDown,
  AlertTriangle,
  UserCircle,
  Map as MapIcon,
  Layers,
  Database,
  FileUp,
  FileSpreadsheet,
  Link,
  FileWarning,
  Copy,
  ArrowRight,
  Clock,
  Target,
  GitMerge,
  CheckSquare,
  BadgeDollarSign,
  PlusCircle,
  MinusCircle,
  BadgeCheck,
  MessageCircle,
  ShieldAlert,
  Wallet,
  Coins,
  Building2,
  FileCheck,
  Trash,
  Sliders,
  Sparkles,
  Bell,
  BellRing,
  CheckCheck,
  RotateCcw,
  FolderKanban
} from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { MktProcessManager } from './components/MktProcessManager';
import { DoiUngProcessManager } from './components/DoiUngProcessManager';
import { MktEfficiencyManager } from './components/MktEfficiencyManager';
import { AcceptanceManager } from './components/AcceptanceManager';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Legend, Cell, PieChart as RePieChart, Pie,
  LineChart, Line, ComposedChart, Tooltip as ChartTooltip
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { format, getWeek } from 'date-fns';
import { vi } from 'date-fns/locale';

// Component Input cÃ³ debounce Ä‘á»ƒ trÃ¡nh re-render toÃ n bá»™ app khi gÃµ phÃ­m
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
  const [value, setValue] = useState(initialValue ?? '');

  useEffect(() => {
    setValue(initialValue ?? '');
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
      value={value ?? ''} 
      onChange={e => setValue(e.target.value)} 
    />
  );
});

// Optimized searchable components for reports to prevent whole-app re-renders on every keystroke
const SearchableSelectGeneric = memo(({ 
  value, 
  onValueChange, 
  items = [], 
  placeholder, 
  searchPlaceholder = "TÃ¬m kiáº¿m...",
  noResultsText = "KhÃ´ng tÃ¬m tháº¥y káº¿t quáº£",
  emptyMessage,
  triggerClassName,
  triggerDisplay,
  selectContentClassName,
  renderItem
}: any) => {
  const [search, setSearch] = useState('');

  const normalizedItems = useMemo(() => {
    return (items || []).map((item: any) => {
      const val = item.value !== undefined ? String(item.value) : (item.id !== undefined ? String(item.id) : '');
      const lbl = item.label !== undefined ? String(item.label) : (item.name !== undefined ? String(item.name) : (item.title !== undefined ? String(item.title) : val));
      const searchStr = item.searchString !== undefined 
        ? String(item.searchString).toLowerCase()
        : `${lbl} ${item.code || item.teamCode || item.projectCode || ''} ${val}`.toLowerCase();
      return {
        ...item,
        value: val,
        label: lbl,
        searchString: searchStr
      };
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = (search || '').toLowerCase().trim();
    if (!q) return normalizedItems;
    return normalizedItems.filter((item: any) => 
      (item.searchString || '').includes(q)
    );
  }, [normalizedItems, search]);

  const resolvedDisplay = triggerDisplay || normalizedItems.find((i: any) => i.value === String(value ?? ''))?.label || undefined;
  const resolvedNoResults = emptyMessage || noResultsText;

  return (
    <Select value={value !== undefined && value !== null ? String(value) : ''} onValueChange={onValueChange}>
      <SelectTrigger className={`w-full overflow-hidden flex items-center justify-between ${triggerClassName}`}>
        <SelectValue placeholder={placeholder}>
          <span className="truncate block text-left flex-1">{resolvedDisplay || placeholder}</span>
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
          <div className="p-4 text-center text-xs text-muted-foreground">{resolvedNoResults}</div>
        )}
      </SelectContent>
    </Select>
  );
});

const SearchableRegionSelect = memo(({ value, onValueChange, regions = [] }: any) => {
  const items = useMemo(() => {
    const list = [{ value: 'all', label: 'Táº¥t cáº£ miá»n', searchString: 'táº¥t cáº£ miá»n all' }];
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
      placeholder="Táº¥t cáº£ miá»n"
      searchPlaceholder="TÃ¬m miá»n..."
      triggerClassName="bg-white border-slate-200 shadow-sm transition-all hover:border-blue-300 focus:ring-2 focus:ring-blue-100 h-10"
      triggerDisplay={value === 'all' ? "Táº¥t cáº£ miá»n" : value}
    />
  );
});

const SearchableTypeSelect = memo(({ value, onValueChange, types = [] }: any) => {
  const items = useMemo(() => {
    const list = [{ value: 'all', label: 'Táº¥t cáº£ loáº¡i hÃ¬nh', searchString: 'táº¥t cáº£ loáº¡i hÃ¬nh all' }];
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
      placeholder="Táº¥t cáº£ loáº¡i hÃ¬nh"
      searchPlaceholder="TÃ¬m loáº¡i hÃ¬nh..."
      triggerClassName="bg-white border-slate-200 shadow-sm transition-all hover:border-blue-300 focus:ring-2 focus:ring-blue-100 h-10"
      triggerDisplay={value === 'all' ? "Táº¥t cáº£ loáº¡i hÃ¬nh" : value}
    />
  );
});

const SearchableProjectSelect = memo(({ value, onValueChange, projects = [], projectMap = {} }: any) => {
  const items = useMemo(() => {
    const list = projects.map((p: any) => ({
      value: p.id,
      label: `${p.name} (${p.projectCode})`,
      searchString: `${p.name} ${p.projectCode || ''}`
    }));
    return [{ value: 'all', label: 'Táº¥t cáº£ cÃ¡c dá»± Ã¡n', searchString: 'tat ca cÃ¡c du an all' }, ...list];
  }, [projects]);

  return (
    <SearchableSelectGeneric
      value={value}
      onValueChange={onValueChange}
      items={items}
      placeholder="Táº¥t cáº£ dá»± Ã¡n"
      searchPlaceholder="TÃ¬m dá»± Ã¡n..."
      triggerClassName="bg-white border-slate-200 shadow-sm transition-all hover:border-blue-300 focus:ring-2 focus:ring-blue-100 h-10"
      triggerDisplay={value === 'all' ? "Táº¥t cáº£ cÃ¡c dá»± Ã¡n" : (projectMap[value] || projects.find((p: any) => p.id === value)?.name || value) + ` (${projects.find((p: any) => p.id === value)?.projectCode || ''})`}
    />
  );
});

const SearchableTeamSelect = memo(({ value, onValueChange, teams = [], uniqueTeams = [] }: any) => {
  const items = useMemo(() => {
    const list = uniqueTeams.map((t: string) => ({
      value: t,
      label: `${t} (${teams.find((team: any) => team.name === t)?.teamCode || ''})`,
      searchString: t
    }));
    return [{ value: 'all', label: 'Táº¥t cáº£ cÃ¡c Ä‘á»™i', searchString: 'tat ca cÃ¡c doi team all' }, ...list];
  }, [uniqueTeams, teams]);

  return (
    <SearchableSelectGeneric
      value={value}
      onValueChange={onValueChange}
      items={items}
      placeholder="Táº¥t cáº£ Ä‘á»™i"
      searchPlaceholder="TÃ¬m team..."
      triggerClassName="bg-white border-slate-200 shadow-sm transition-all hover:border-blue-300 focus:ring-2 focus:ring-blue-100 h-10"
      triggerDisplay={value === 'all' ? "Táº¥t cáº£ cÃ¡c Ä‘á»™i" : `${value} (${teams.find((t: any) => t.name === value)?.teamCode || ''})`}
    />
  );
});

const SearchableUserTeamSelect = memo(({ value, onValueChange, teams = [] }: any) => {
  const items = useMemo(() => {
    const list = teams.map((t: any) => ({
      value: t.name,
      label: `${t.name} (${t.teamCode || ''})`,
      searchString: `${t.name} ${t.teamCode || ''}`.toLowerCase()
    }));
    
    if (value && value !== 'no_team' && !teams.some((t: any) => t.name === value)) {
      list.push({
        value,
        label: value,
        searchString: value.toLowerCase()
      });
    }

    return [
      { value: 'no_team', label: '-- ChÆ°a gÃ¡n --', searchString: 'chua gan no team empty' },
      ...list
    ];
  }, [teams, value]);

  const displayVal = value && value !== 'no_team' ? value : '-- ChÆ°a gÃ¡n --';

  return (
    <SearchableSelectGeneric
      value={value || 'no_team'}
      onValueChange={(val: string) => onValueChange(val === 'no_team' ? '' : val)}
      items={items}
      placeholder="-- Chá»n team --"
      searchPlaceholder="TÃ¬m team..."
      triggerClassName="w-[160px] h-8 text-xs font-semibold"
      triggerDisplay={displayVal}
    />
  );
});

const SearchableBlockDirectorSelect = memo(({ value, onValueChange, allUsers = [], emptyValue = "", emptyLabel = "-- ChÆ°a gÃ¡n / Chá»n sau --" }: any) => {
  const items = useMemo(() => {
    const list = (allUsers || []).map((u: any) => {
      const uValue = u.uid || u.id;
      const displayName = u.displayName || u.fullName || u.email || "";
      const email = u.email || "";
      return {
        value: uValue,
        label: `${displayName} (${email})`,
        searchString: `${displayName} ${email}`.toLowerCase()
      };
    });
    return [{ value: emptyValue, label: emptyLabel, searchString: emptyLabel.toLowerCase() }, ...list];
  }, [allUsers, emptyValue, emptyLabel]);

  const selectedUser = allUsers.find((u: any) => (u.uid || u.id) === value);
  const displayLabel = value === emptyValue || !value
    ? emptyLabel
    : selectedUser 
      ? `${selectedUser.displayName || selectedUser.fullName || selectedUser.email} (${selectedUser.email || ''})`
      : value;

  return (
    <SearchableSelectGeneric
      value={value}
      onValueChange={onValueChange}
      items={items}
      placeholder="Chá»n tÃ i khoáº£n..."
      searchPlaceholder="TÃ¬m tÃ i khoáº£n vÃ  email..."
      triggerClassName="w-full bg-slate-50 border-slate-200 rounded-xl h-9 text-xs text-slate-700"
      triggerDisplay={displayLabel}
    />
  );
});

const SearchableBlockAssistantsSelect = memo(({ values = [], onValuesChange, allUsers = [] }: any) => {
  const [search, setSearch] = useState('');
  const filteredUsers = useMemo(() => {
    const s = search.toLowerCase().trim();
    return (allUsers || []).filter((u: any) => {
      const name = (u.displayName || u.fullName || u.email || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      return name.includes(s) || email.includes(s);
    });
  }, [allUsers, search]);

  const handleToggle = (uid: string) => {
    if (values.includes(uid)) {
      onValuesChange(values.filter((v: string) => v !== uid));
    } else {
      onValuesChange([...values, uid]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl min-h-[38px]">
        {values.length === 0 ? (
          <span className="text-xs text-slate-400 italic">ChÆ°a cÃ³ trá»£ lÃ½ nÃ o Ä‘Æ°á»£c gÃ¡n cho khá»‘i</span>
        ) : (
          values.map((uid: string) => {
            const u = (allUsers || []).find((usr: any) => (usr.uid || usr.id) === uid);
            const label = u ? (u.fullName || u.displayName || u.email) : uid;
            return (
              <Badge key={uid} variant="secondary" className="text-xs gap-1 bg-violet-100 text-violet-800 border-violet-200 py-0.5 px-2">
                <span className="truncate max-w-[180px]">{label}</span>
                <button
                  type="button"
                  onClick={() => handleToggle(uid)}
                  className="hover:bg-violet-200 text-violet-600 hover:text-violet-900 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })
        )}
      </div>
      <div className="border border-slate-200 rounded-xl bg-white p-2">
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input 
            placeholder="TÃ¬m tÃ i khoáº£n hoáº·c email trá»£ lÃ½ khá»‘i..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="pl-8 h-8 text-xs rounded-lg"
            onKeyDown={e => e.stopPropagation()}
          />
        </div>
        <div className="max-h-36 overflow-y-auto space-y-1">
          {filteredUsers.map((u: any) => {
            const uid = u.uid || u.id;
            const isSelected = values.includes(uid);
            return (
              <div 
                key={uid}
                onClick={() => handleToggle(uid)}
                className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${isSelected ? 'bg-violet-50 text-violet-700 font-semibold' : 'hover:bg-slate-50 text-slate-700'}`}
              >
                <div className="truncate flex-1 pr-2">
                  <span className="font-medium">{u.displayName || u.fullName || u.email}</span>
                  <span className="text-[10px] text-slate-400 ml-1.5">({u.email})</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={isSelected} 
                  onChange={() => {}} 
                  className="rounded text-violet-600 focus:ring-violet-500 pointer-events-none h-3.5 w-3.5"
                />
              </div>
            );
          })}
          {filteredUsers.length === 0 && (
            <div className="text-center py-2 text-xs text-slate-400">KhÃ´ng tÃ¬m tháº¥y tÃ i khoáº£n phÃ¹ há»£p</div>
          )}
        </div>
      </div>
    </div>
  );
});

const SearchableEfficiencyProjectSelect = memo(({ value, onValueChange, projects = [], projectMap = {} }: any) => {
  const items = useMemo(() => {
    const list = projects.map((p: any) => ({
      value: p.id,
      label: p.name,
      searchString: `${p.name} ${p.projectCode || ''}`
    }));
    return [{ value: 'all', label: 'Táº¥t cáº£ cÃ¡c dá»± Ã¡n', searchString: 'tat ca cÃ¡c du an all' }, ...list];
  }, [projects]);

  return (
    <SearchableSelectGeneric
      value={value}
      onValueChange={onValueChange}
      items={items}
      placeholder="Chá»n dá»± Ã¡n..."
      searchPlaceholder="TÃ¬m dá»± Ã¡n..."
      triggerClassName="bg-slate-50 border-none h-11 rounded-xl"
      triggerDisplay={value === 'all' ? "Táº¥t cáº£ cÃ¡c dá»± Ã¡n" : (value ? (projectMap[value] || projects.find((p: any) => p.id === value)?.name || value) + ` (${projects.find((p: any) => p.id === value)?.projectCode || ''})` : "Chá»n dá»± Ã¡n...")}
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

const SearchableEfficiencyTeamSelect = memo(({ value, onValueChange, teams = [], teamMap = {} }: any) => {
  const items = useMemo(() => {
    const list = teams.map((t: any) => ({
      value: t.id,
      label: `${t.name} (${t.teamCode || 'N/A'})`,
      searchString: `${t.name} ${t.teamCode || ''}`
    }));
    return [{ value: 'all', label: 'Táº¥t cáº£ cÃ¡c Ä‘á»™i', searchString: 'tat ca cÃ¡c doi team all' }, ...list];
  }, [teams]);

  return (
    <SearchableSelectGeneric
      value={value}
      onValueChange={onValueChange}
      items={items}
      placeholder="Chá»n team..."
      searchPlaceholder="TÃ¬m team..."
      triggerClassName="bg-slate-50 border-none h-11 rounded-xl"
      triggerDisplay={value === 'all' ? "Táº¥t cáº£ cÃ¡c Ä‘á»™i" : (value ? `${teamMap[value] || value} (${teams.find((t: any) => t.id === value)?.teamCode || ''})` : "Chá»n team...")}
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

const SearchableAcceptanceTeamSelect = memo(({ value, onValueChange, teams = [], teamMap = {} }: any) => {
  const items = useMemo(() => {
    const list = teams.map((t: any) => ({
      value: t.id,
      label: `${t.name} (${t.teamCode || 'N/A'})`,
      searchString: `${t.name} ${t.teamCode || ''}`
    }));
    return [{ value: 'all', label: 'Táº¥t cáº£ cÃ¡c Ä‘á»™i', searchString: 'tat ca cÃ¡c doi team all' }, ...list];
  }, [teams]);

  return (
    <SearchableSelectGeneric
      value={value}
      onValueChange={onValueChange}
      items={items}
      placeholder="Chá»n Ä‘á»™i..."
      searchPlaceholder="TÃ¬m Ä‘á»™i..."
      triggerClassName="h-11 bg-slate-50 border-none rounded-xl font-bold"
      triggerDisplay={value === 'all' ? "Táº¥t cáº£ cÃ¡c Ä‘á»™i" : (value ? `${teamMap[value] || value} (${teams.find((t: any) => t.id === value)?.teamCode || ''})` : "Chá»n Ä‘á»™i...")}
    />
  );
});


const SearchableAcceptanceProjectMultiSelect = memo(({ values = [], onValuesChange, projects = [], projectMap = {}, isEditing }: any) => {
  const [search, setSearch] = useState('');
  
  const items = useMemo(() => {
    return projects.map((p: any) => ({
      value: p.id,
      label: p.name,
      projectCode: p.projectCode || '',
      searchString: `${p.name} ${p.projectCode || ''}`.toLowerCase()
    }));
  }, [projects]);

  const filteredItems = useMemo(() => {
    return items.filter((item: any) => 
      item.searchString.includes(search.toLowerCase())
    );
  }, [items, search]);

  const toggleValue = (val: string) => {
    if (isEditing) {
      onValuesChange([val]);
      return;
    }
    
    if (values.includes(val)) {
      onValuesChange(values.filter((v: string) => v !== val));
    } else {
      onValuesChange([...values, val]);
    }
  };

  const getDisplay = () => {
    if (values.length === 0) return "Chá»n dá»± Ã¡n...";
    if (values.length <= 3) {
      return values.map((v: string) => {
        const name = projectMap[v] || projects.find((p: any) => p.id === v)?.name || v;
        const code = projects.find((p: any) => p.id === v)?.projectCode;
        return code ? `${name} (${code})` : name;
      }).join(', ');
    }
    return `ÄÃ£ chá»n ${values.length} dá»± Ã¡n`;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full h-11 bg-slate-50 border-none rounded-xl font-bold flex items-center justify-between px-4 hover:bg-slate-100 transition-all shadow-none"
        >
          <span className="truncate">{getDisplay()}</span>
          <ChevronDownIcon className="w-4 h-4 text-slate-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 rounded-2xl shadow-2xl border-slate-100 overflow-hidden" align="start">
        <div className="p-3 border-b border-slate-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="TÃ¬m dá»± Ã¡n..." 
              className="pl-10 h-10 bg-slate-50 border-none rounded-xl text-xs font-bold"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2 custom-scrollbar">
          {filteredItems.map((item: any) => (
            <div 
              key={item.value}
              className="flex items-center gap-3 p-2 hover:bg-indigo-50/50 rounded-xl cursor-pointer group transition-colors"
              onClick={() => toggleValue(item.value)}
            >
              <Checkbox 
                checked={values.includes(item.value)} 
                onCheckedChange={() => toggleValue(item.value)}
                className="rounded-md border-slate-200 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
              />
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-700 group-hover:text-indigo-700">{item.label}</p>
                <p className="text-[10px] font-medium text-slate-400">{item.projectCode}</p>
              </div>
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs font-medium italic">KhÃ´ng tÃ¬m tháº¥y dá»± Ã¡n</div>
          )}
        </div>
        {!isEditing && values.length > 0 && (
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-black text-indigo-600 uppercase">ÄÃ£ chá»n {values.length}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-[10px] font-black text-rose-500 hover:text-rose-600 hover:bg-rose-50"
              onClick={() => onValuesChange([])}
            >
              Bá» chá»n táº¥t cáº£
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
});

const SearchableAcceptanceProjectSelect = memo(({ value, onValueChange, projects = [], projectMap = {} }: any) => {
  const items = useMemo(() => {
    const list = projects.map((p: any) => ({
      value: p.id,
      label: p.name,
      searchString: `${p.name} ${p.projectCode || ''}`
    }));
    return [{ value: 'all', label: 'Táº¥t cáº£ cÃ¡c dá»± Ã¡n', searchString: 'tat ca cÃ¡c du an all' }, ...list];
  }, [projects]);

  return (
    <SearchableSelectGeneric
      value={value}
      onValueChange={onValueChange}
      items={items}
      placeholder="Chá»n dá»± Ã¡n..."
      searchPlaceholder="TÃ¬m dá»± Ã¡n..."
      triggerClassName="h-11 bg-slate-50 border-none rounded-xl font-bold"
      triggerDisplay={value === 'all' ? "Táº¥t cáº£ cÃ¡c dá»± Ã¡n" : (value ? (projectMap[value] || projects.find((p: any) => p.id === value)?.name || value) + ` (${projects.find((p: any) => p.id === value)?.projectCode || ''})` : "Chá»n dá»± Ã¡n...")}
    />
  );
});
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
    toast.error(`Lá»—i káº¿t ná»‘i hoáº·c phÃ¢n quyá»n Firestore: ${errInfo.error}`);
    throw new Error(errorJson);
  } else {
    toast.error(`Lá»—i Firestore: ${errInfo.error}`);
  }
}

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

const parseTimestampToDate = (val: any): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val.toDate === 'function') {
    try {
      return val.toDate();
    } catch (e) {}
  }
  if (typeof val === 'object') {
    const seconds = val.seconds ?? val._seconds;
    if (typeof seconds === 'number') {
      return new Date(seconds * 1000 + Math.floor((val.nanoseconds ?? val._nanoseconds ?? 0) / 1000000));
    }
  }
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  } catch (e) {}
  return null;
};

const safeFormat = (date: any, formatStr: string) => {
  const d = parseTimestampToDate(date);
  if (!d) return '';
  try {
    return format(d, formatStr);
  } catch (e) {
    return '';
  }
};

const formatYAxis = (value: number) => {
  return value.toLocaleString('vi-VN');
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

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export const normalizeTeamCode = (code: any): string => {
  if (code === undefined || code === null) return '';
  let str = String(code).trim();
  // 1. Convert MH to MAY and normalize space/hyphen separators (e.g., MH 02.08 -> MAY02.08, MH-36.01 -> MAY36.01)
  str = str
    .replace(/\bMH([0-9.]+)/gi, 'MAY$1')
    .replace(/\bMH[-_\s]+([0-9.]+)/gi, 'MAY$1')
    .replace(/\bMH\b/gi, 'MAY');

  // 2. Ensure MAY prefix is uppercase and normalize any spaces/hyphens after MAY (e.g. MAY 02.08 -> MAY02.08)
  str = str.replace(/\bMAY[-_\s]+([0-9.]+)/gi, 'MAY$1');
  str = str.replace(/\bmay/gi, 'MAY');

  // 3. Format MAY codes with single digit after dot: MAY36.1 -> MAY36.01, MAY02.8 -> MAY02.08
  str = str.replace(/\bMAY(\d+)\.(\d)(?!\d)/gi, (_, g1, g2) => `MAY${g1}.0${g2}`);

  return str;
};

export const normalizeTeamName = (name: any): string => {
  if (name === undefined || name === null) return '';
  let str = String(name);
  // 1. Convert MH to MAY and normalize space/hyphen separators (e.g., MH 02.08 -> MAY02.08, MH-36.01 -> MAY36.01)
  str = str
    .replace(/\bMH([0-9.]+)/gi, 'MAY$1')
    .replace(/\bMH[-_\s]+([0-9.]+)/gi, 'MAY$1')
    .replace(/\bMH\b/gi, 'MAY');

  // 2. Normalize spaces/hyphens after MAY inside name: "MAY - 36.01" -> "MAY36.01", "MAY 02.08" -> "MAY02.08"
  str = str.replace(/\bMAY[-_\s]+([0-9.]+)/gi, 'MAY$1');

  // 3. Format MAY codes with single digit after dot inside name: MAY36.1 -> MAY36.01, MAY02.8 -> MAY02.08
  str = str.replace(/\bMAY(\d+)\.(\d)(?!\d)/gi, (_, g1, g2) => `MAY${g1}.0${g2}`);

  return str;
};

export const convertMhToMay = (val: any): string => {
  return normalizeTeamName(val);
};

const extractTeamCode = (name: string) => {
  if (!name) return '';
  const normalized = normalizeTeamName(name);
  const match = normalized.match(/(?:MAY|MH|[A-Z]+)[0-9.]+/i);
  if (match) {
    let code = match[0].toUpperCase().replace(/\.+$/, '');
    return normalizeTeamCode(code);
  }
  return '';
};

const isTeamInBlock = (t: any, block: any, allTeams?: any[]) => {
  if (!block || !t) return false;
  let teamObj = t;
  if (typeof t === 'string') {
    if (allTeams && allTeams.length > 0) {
      teamObj = allTeams.find(item => item.id === t || item.name === t || item.teamCode === t) || { name: t };
    } else {
      teamObj = { name: t };
    }
  }
  if (teamObj.blockId === block.id || teamObj.blockCode === block.blockCode) return true;
  if (teamObj.blockId === 'unassigned' || teamObj.blockCode === 'unassigned' || teamObj.blockId === 'none' || teamObj.blockCode === 'none') return false;
  if (teamObj.blockId && teamObj.blockId !== block.id) return false;
  if (teamObj.blockCode && teamObj.blockCode !== block.blockCode) return false;
  
  let prefix = (block.teamPrefix || '').toUpperCase().trim();
  if (prefix === 'MH') prefix = 'MAY';
  if (!prefix) return false;
  const code = teamObj.teamCode || extractTeamCode(teamObj.name || '');
  return code.toUpperCase().trim().startsWith(prefix);
};

const extractGDKD = (name: string) => {
  if (!name) return '';
  const teamCode = extractTeamCode(name);
  if (teamCode) {
    const idx = name.toLowerCase().indexOf(teamCode.toLowerCase());
    if (idx !== -1) {
      let rest = name.substring(idx + teamCode.length);
      rest = rest.replace(/^[\s.\-_/]+/, '').trim();
      if (rest) return rest;
    }
  }
  const codeRegex = /^[A-Z0-9.-]+\s+/i;
  const codeMatch = name.match(codeRegex);
  if (codeMatch) {
    return name.substring(codeMatch[0].length).trim();
  }
  return name;
};

const extractProjectCode = (name: string) => {
  // Look for uppercase blocks DA-xxx or just capitalized acronyms
  const match = name.match(/[A-Z0-9-]{3,}/);
  return match ? match[0].toUpperCase() : '';
};

export const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  super_admin: [
    'home.view', 'home.export',
    'admin.projects.view', 'admin.projects.edit', 'admin.projects.import',
    'admin.teams.view', 'admin.teams.edit',
    'admin.budgets.view', 'admin.budgets.edit',
    'admin.costs.view', 'admin.costs.edit',
    'admin.efficiency.edit',
    'admin.users.view', 'admin.users.edit',
    'admin.backup.view', 'admin.permissions.edit',
    'block.view', 'block.approve',
    'team_mgmt.view', 'team_mgmt.approve',
    'register.view', 'register.create', 'register.edit', 'register.import',
    'actual.view', 'actual.create', 'actual.edit', 'actual.import',
    'history.view', 'history.export',
    'report_nt.view', 'report_nt.sync',
    'support.create', 'support.resolve',
    'process_mkt.create', 'process_mkt.approve',
    'process_doiung.create', 'process_doiung.approve',
    'mkt_efficiency.view', 'mkt_efficiency.export', 'mkt_efficiency.filter'
  ],
  admin: [
    'home.view', 'home.export',
    'admin.projects.view', 'admin.projects.edit', 'admin.projects.import',
    'admin.teams.view', 'admin.teams.edit',
    'admin.budgets.view', 'admin.budgets.edit',
    'admin.costs.view', 'admin.costs.edit',
    'admin.efficiency.edit',
    'admin.users.view', 'admin.users.edit',
    'admin.backup.view', 'admin.permissions.edit',
    'block.view', 'block.approve',
    'team_mgmt.view', 'team_mgmt.approve',
    'register.view', 'register.create', 'register.edit', 'register.import',
    'actual.view', 'actual.create', 'actual.edit', 'actual.import',
    'history.view', 'history.export',
    'report_nt.view', 'report_nt.sync',
    'support.create', 'support.resolve',
    'process_mkt.create', 'process_mkt.approve',
    'process_doiung.create', 'process_doiung.approve',
    'mkt_efficiency.view', 'mkt_efficiency.export', 'mkt_efficiency.filter'
  ],
  mod: [
    'home.view',
    'admin.projects.view', 'admin.teams.view',
    'admin.budgets.view', 'admin.costs.view',
    'block.view',
    'team_mgmt.view',
    'register.view', 'register.create', 'register.edit',
    'actual.view', 'actual.create', 'actual.edit',
    'history.view',
    'report_nt.view',
    'support.create', 'support.resolve',
    'process_mkt.create', 'process_mkt.approve',
    'process_doiung.create', 'process_doiung.approve',
    'mkt_efficiency.view', 'mkt_efficiency.export', 'mkt_efficiency.filter'
  ],
  accountant: [
    'home.view', 'home.export',
    'admin.projects.view', 'admin.projects.edit',
    'admin.teams.view',
    'admin.budgets.view', 'admin.budgets.edit',
    'admin.costs.view', 'admin.costs.edit',
    'block.view',
    'team_mgmt.view',
    'register.view',
    'actual.view',
    'history.view', 'history.export',
    'report_nt.view',
    'support.create',
    'process_mkt.create',
    'process_doiung.create',
    'mkt_efficiency.view', 'mkt_efficiency.export', 'mkt_efficiency.filter'
  ],
  gdda: [
    'home.view',
    'admin.projects.view',
    'block.view',
    'team_mgmt.view',
    'register.view', 'register.create', 'register.edit',
    'actual.view', 'actual.create', 'actual.edit',
    'history.view',
    'report_nt.view',
    'support.create',
    'process_mkt.create', 'process_mkt.approve',
    'process_doiung.create', 'process_doiung.approve',
    'mkt_efficiency.view', 'mkt_efficiency.export', 'mkt_efficiency.filter'
  ],
  gd_khoi: [
    'home.view',
    'block.view', 'block.approve',
    'team_mgmt.view',
    'register.view',
    'actual.view',
    'history.view',
    'report_nt.view',
    'support.create',
    'process_mkt.create', 'process_mkt.approve',
    'process_doiung.create', 'process_doiung.approve',
    'mkt_efficiency.view', 'mkt_efficiency.export', 'mkt_efficiency.filter'
  ],
  tro_ly_khoi: [
    'home.view',
    'block.view', 'block.approve',
    'team_mgmt.view',
    'register.view',
    'actual.view',
    'history.view',
    'report_nt.view',
    'support.create',
    'process_mkt.create', 'process_mkt.approve',
    'process_doiung.create', 'process_doiung.approve',
    'mkt_efficiency.view', 'mkt_efficiency.export', 'mkt_efficiency.filter'
  ],
  gdkd: [
    'home.view',
    'block.view',
    'team_mgmt.view', 'team_mgmt.approve',
    'register.view',
    'actual.view',
    'history.view',
    'report_nt.view',
    'support.create',
    'process_mkt.create', 'process_mkt.approve',
    'process_doiung.create', 'process_doiung.approve',
    'mkt_efficiency.view', 'mkt_efficiency.export', 'mkt_efficiency.filter'
  ],
  assistant: [
    'home.view', 'home.export',
    'block.view',
    'team_mgmt.view',
    'register.view', 'register.create', 'register.edit',
    'actual.view', 'actual.create', 'actual.edit',
    'history.view', 'history.export',
    'report_nt.view',
    'support.create',
    'process_mkt.create', 'process_mkt.approve',
    'process_doiung.create', 'process_doiung.approve',
    'mkt_efficiency.view', 'mkt_efficiency.export', 'mkt_efficiency.filter'
  ],
  user: [
    'home.view',
    'block.view',
    'team_mgmt.view',
    'register.view', 'register.create', 'register.edit',
    'actual.view', 'actual.create', 'actual.edit',
    'history.view',
    'report_nt.view',
    'support.create',
    'process_mkt.create',
    'process_doiung.create'
  ]
};

export const ROLE_NAMES: Record<string, string> = {
  super_admin: "Super Admin (Quáº£n trá»‹ cao cáº¥p)",
  admin: "Admin (Quáº£n trá»‹ viÃªn)",
  mod: "Mod (Äiá»u phá»‘i viÃªn)",
  accountant: "Accountant (Káº¿ toÃ¡n)",
  gdda: "GDDA (GiÃ¡m Ä‘á»‘c Dá»± Ã¡n)",
  gd_khoi: "GÄ Khá»‘i (GiÃ¡m Ä‘á»‘c Khá»‘i)",
  tro_ly_khoi: "Trá»£ lÃ½ Khá»‘i (Trá»£ lÃ½ GiÃ¡m Ä‘á»‘c Khá»‘i)",
  gdkd: "GÄKD (GiÃ¡m Ä‘á»‘c Kinh doanh)",
  assistant: "Trá»£ lÃ½ (Trá»£ lÃ½ Ban GiÃ¡m Ä‘á»‘c)",
  user: "User (NgÆ°á»i dÃ¹ng thÆ°á»ng)"
};

export const PERMISSION_GROUPS = [
  {
    category: 'Trang chá»§ (Dashboard & BÃ¡o cÃ¡o tá»•ng thá»ƒ)',
    items: [
      { key: 'home.view', label: 'Xem Trang chá»§', desc: 'CÃ³ quyá»n truy cáº­p tab Trang chá»§, xem biá»ƒu Ä‘á»“, doanh sá»‘, chi phÃ­ tá»•ng quan.' },
      { key: 'home.export', label: 'Táº£i bÃ¡o cÃ¡o tá»•ng há»£p', desc: 'Táº£i bÃ¡o cÃ¡o Excel tÃ­ch lÅ©y vÃ  hiá»‡u quáº£ tá»•ng há»£p.' }
    ]
  },
  {
    category: 'Quáº£n trá»‹ há»‡ thá»‘ng (Admin Panel)',
    items: [
      { key: 'admin.projects.view', label: 'Xem danh sÃ¡ch Dá»± Ã¡n', desc: 'Xem danh sÃ¡ch cÃ¡c dá»± Ã¡n trong há»‡ thá»‘ng.' },
      { key: 'admin.projects.edit', label: 'Quáº£n lÃ½ Dá»± Ã¡n (ThÃªm/Sá»­a/XÃ³a/GÃ¡n)', desc: 'ThÃªm dá»± Ã¡n má»›i, sá»­a thÃ´ng tin, xÃ³a dá»± Ã¡n, gÃ¡n loáº¡i hÃ¬nh/vÃ¹ng miá»n.' },
      { key: 'admin.projects.import', label: 'Nháº­p dá»¯ liá»‡u dá»± Ã¡n', desc: 'Nháº­p danh má»¥c dá»± Ã¡n hÃ ng loáº¡t tá»« file Excel.' },
      { key: 'admin.teams.view', label: 'Xem danh sÃ¡ch Team/Äá»™i', desc: 'Xem danh sÃ¡ch cÃ¡c phÃ²ng ban/tá»• Ä‘á»™i.' },
      { key: 'admin.teams.edit', label: 'Quáº£n lÃ½ Team/Äá»™i (ThÃªm/Sá»­a/XÃ³a)', desc: 'ThÃªm team, cáº­p nháº­t mÃ£ team, phÃ¢n bá»• tá»• Ä‘á»™i.' },
      { key: 'admin.budgets.view', label: 'Xem duyá»‡t Ä‘Äƒng kÃ½ ngÃ¢n sÃ¡ch', desc: 'Xem danh sÃ¡ch toÃ n bá»™ cÃ¡c Ä‘Äƒng kÃ½ ngÃ¢n sÃ¡ch cá»§a há»‡ thá»‘ng.' },
      { key: 'admin.budgets.edit', label: 'Pháº§n bá»• & Duyá»‡t NgÃ¢n sÃ¡ch', desc: 'Duyá»‡t/XÃ¡c Ä‘á»‹nh ngÃ¢n sÃ¡ch, chá»‰nh sá»­a, gÃ¡n ngÆ°á»i xá»­ lÃ½.' },
      { key: 'admin.costs.view', label: 'Xem duyá»‡t chi phÃ­ thá»±c táº¿', desc: 'Xem danh sÃ¡ch toÃ n bá»™ chi phÃ­ thá»±c chi thá»±c táº¿.' },
      { key: 'admin.costs.edit', label: 'Duyá»‡t & Quáº£n lÃ½ Chi phÃ­ thá»±c táº¿', desc: 'Chá»‰nh sá»­a, xÃ³a, duyá»‡t sá»‘ liá»‡u chi phÃ­ thá»±c táº¿ cáº¥p há»‡ thá»‘ng.' },
      { key: 'admin.efficiency.edit', label: 'Cáº­p nháº­t hiá»‡u quáº£ kinh doanh', desc: 'Nháº­p/Sá»­a sá»‘ cÄƒn bÃ¡n má»›i, doanh sá»‘ bÃ¡n láº» Ä‘á»ƒ tÃ­nh ROI.' },
      { key: 'admin.users.view', label: 'Xem danh sÃ¡ch NgÆ°á»i dÃ¹ng', desc: 'Xem danh sÃ¡ch cÃ¡c tÃ i khoáº£n Ä‘Äƒng kÃ½ trong app.' },
      { key: 'admin.users.edit', label: 'PhÃ¢n quyá»n tÃ i khoáº£n & GÃ¡n dá»± Ã¡n', desc: 'Chá»‰nh sá»­a vai trÃ², gÃ¡n danh sÃ¡ch dá»± Ã¡n cho Mod.' },
      { key: 'admin.backup.view', label: 'Quáº£n trá»‹ Sao lÆ°u & Phá»¥c há»“i', desc: 'Xem nháº­t kÃ½ thay Ä‘á»•i vÃ  quÃ©t/phá»¥c há»“i dá»¯ liá»‡u cÅ© bá»‹ xÃ³a.' },
      { key: 'admin.permissions.edit', label: 'Quáº£n lÃ½ phÃ¢n quyá»n vai trÃ²', desc: 'ÄÆ°á»£c phÃ©p tÃ¹y chá»‰nh danh má»¥c quyá»n nÃ y.' }
    ]
  },
  {
    category: 'Quáº£n lÃ½ Khá»‘i (Block management)',
    items: [
      { key: 'block.view', label: 'GiÃ¡m sÃ¡t chi phÃ­ Khá»‘i', desc: 'Xem sá»‘ liá»‡u phÃ¢n bá»•, thá»±c chi, cáº£nh bÃ¡o ngÃ¢n sÃ¡ch cá»§a Block.' },
      { key: 'block.approve', label: 'PhÃª duyá»‡t cáº¥p Khá»‘i', desc: 'Ghi Ã½ kiáº¿n phÃª duyá»‡t / Äá» xuáº¥t ngÃ¢n sÃ¡ch liÃªn phÃ²ng.' }
    ]
  },
  {
    category: 'Quáº£n lÃ½ PhÃ²ng KD (Team management)',
    items: [
      { key: 'team_mgmt.view', label: 'GiÃ¡m sÃ¡t hoáº¡t Ä‘á»™ng Äá»™i nhÃ³m', desc: 'Theo dÃµi Ä‘Äƒng kÃ½, tiáº¿n Ä‘á»™ cháº¡y chi phÃ­ cá»§a cÃ¡c team trá»±c thuá»™c.' },
      { key: 'team_mgmt.approve', label: 'Ã kiáº¿n Ä‘á» xuáº¥t cáº¥p PhÃ²ng KD', desc: 'Ghi nháº­n Ä‘á» xuáº¥t/Ã kiáº¿n Ä‘iá»u hÃ nh chung cáº¥p phÃ²ng.' }
    ]
  },
  {
    category: 'ÄÄƒng kÃ½ ngÃ¢n sÃ¡ch',
    items: [
      { key: 'register.view', label: 'Xem danh sÃ¡ch Ä‘Äƒng kÃ½', desc: 'CÃ³ quyá»n xem danh má»¥c Ä‘Äƒng kÃ½ ngÃ¢n sÃ¡ch cá»§a Ä‘á»™i hoáº·c báº£n thÃ¢n.' },
      { key: 'register.create', label: 'Táº¡o má»›i phiáº¿u Ä‘Äƒng kÃ½', desc: 'ÄÆ°á»£c phÃ©p láº­p káº¿ hoáº¡ch vÃ  submit ngÃ¢n sÃ¡ch thÃ¡ng má»›i.' },
      { key: 'register.edit', label: 'Chá»‰nh sá»­a/XÃ³a phiáº¿u Ä‘Äƒng kÃ½ cÃ¡ nhÃ¢n', desc: 'Sá»­a hoáº·c xÃ³a phiáº¿u Ä‘Äƒng kÃ½ khi á»Ÿ tráº¡ng thÃ¡i Chá» duyá»‡t.' },
      { key: 'register.import', label: 'Nháº­p Excel ngÃ¢n sÃ¡ch hÃ ng loáº¡t', desc: 'Nháº­p excel Ä‘Äƒng kÃ½ nhiá»u dÃ²ng Ä‘á»“ng thá»i.' }
    ]
  },
  {
    category: 'Ghi nháº­n chi phÃ­ thá»±c táº¿',
    items: [
      { key: 'actual.view', label: 'Xem thá»±c chi chiáº¿n dá»‹ch', desc: 'Xem danh sÃ¡ch thá»±c chi chiáº¿n chiáº¿n dá»‹ch quáº£ng cÃ¡o.' },
      { key: 'actual.create', label: 'Táº¡o má»›i phiáº¿u chi thá»±c táº¿', desc: 'Táº¡o phiáº¿u ghi nháº­n chi phÃ­ thá»±c táº¿ hÃ ng tuáº§n.' },
      { key: 'actual.edit', label: 'Sá»­a/XÃ³a phiáº¿u chi thá»±c táº¿ chÆ°a duyá»‡t', desc: 'Sá»­a hoáº·c xÃ³a phiáº¿u chi thá»±c táº¿ á»Ÿ tráº¡ng thÃ¡i chÆ°a Ä‘á»‘i soÃ¡t.' },
      { key: 'actual.import', label: 'Nháº­p Excel thá»±c táº¿ hÃ ng loáº¡t', desc: 'Nháº­p hÃ ng loáº¡t cÃ¡c dÃ²ng chi thá»±c táº¿ báº±ng file Excel.' }
    ]
  },
  {
    category: 'Lá»‹ch sá»­ dÃ²ng tiá»n (Transaction History)',
    items: [
      { key: 'history.view', label: 'Xem & Tra cá»©u dÃ²ng tiá»n', desc: 'Tra cá»©u thÃ´ng tin minh báº¡ch Ä‘á»‘i chiáº¿u cá»§a dá»± Ã¡n/Ä‘á»™i nhÃ³m.' },
      { key: 'history.export', label: 'Táº£i dÃ²ng tiá»n Excel', desc: 'Xuáº¥t dá»¯ liá»‡u lá»‹ch sá»­ Ä‘á»‘i chiáº¿u ra file Excel.' }
    ]
  },
  {
    category: 'BÃ¡o cÃ¡o Nghiá»‡m thu (NT Report)',
    items: [
      { key: 'report_nt.view', label: 'Xem BÃ¡o cÃ¡o Nghiá»‡m thu', desc: 'Xem bÃ¡o cÃ¡o nghiá»‡m thu tá»± Ä‘á»™ng káº¿t ná»‘i tá»« Google Sheet.' },
      { key: 'report_nt.sync', label: 'Äá»“ng bá»™ hÃ³a & Cáº­p nháº­t Sheet Link', desc: 'Äá»“ng bá»™ láº¡i dá»¯ liá»‡u nghiá»‡m thu, Ä‘á»•i link Google Sheets.' }
    ]
  },
  {
    category: 'Há»— trá»£ ká»¹ thuáº­t (Support Center)',
    items: [
      { key: 'support.create', label: 'Gá»­i yÃªu cáº§u há»— trá»£ má»›i', desc: 'Táº¡o ticket nhá» há»— trá»£ ká»¹ thuáº­t hoáº·c bÃ¡o lá»—i.' },
      { key: 'support.resolve', label: 'Xá»­ lÃ½ & ÄÃ³ng yÃªu cáº§u há»— trá»£', desc: 'Viáº¿t cÃ¢u tráº£ lá»i pháº£n há»“i, thay Ä‘á»•i tráº¡ng thÃ¡i ticket (DÃ nh cho Admin/Mod).' }
    ]
  },
  {
    category: 'Quy trÃ¬nh Marketing',
    items: [
      { key: 'process_mkt.create', label: 'Táº¡o quy trÃ¬nh Marketing', desc: 'Thiáº¿t láº­p quy trÃ¬nh chiáº¿n dá»‹ch vÃ  chuyá»ƒn giao tráº¡ng thÃ¡i.' },
      { key: 'process_mkt.approve', label: 'Duyá»‡t quy trÃ¬nh Marketing', desc: 'PhÃª duyá»‡t cÃ¡c bÆ°á»›c trong quy trÃ¬nh Marketing.' }
    ]
  },
  {
    category: 'Quy trÃ¬nh Ä‘á»‘i á»©ng bÃ n giao',
    items: [
      { key: 'process_doiung.create', label: 'Táº¡o quy trÃ¬nh Ä‘á»‘i á»©ng', desc: 'Khá»Ÿi táº¡o quy trÃ¬nh bÃ n giao nháº­n Ä‘á»‘i á»©ng.' },
      { key: 'process_doiung.approve', label: 'Duyá»‡t quy trÃ¬nh Ä‘á»‘i á»©ng', desc: 'PhÃª duyá»‡t quy trÃ¬nh Ä‘á»‘i á»©ng bÃ n giao.' }
    ]
  },
  {
    category: 'Hiá»‡u quáº£ Marketing (MKT Efficiency)',
    items: [
      { key: 'mkt_efficiency.view', label: 'Xem chi tiáº¿t Hiá»‡u quáº£ MKT', desc: 'Quyá»n xem tab Hiá»‡u quáº£ Marketing, cÃ¡c biá»ƒu Ä‘á»“, chi tiáº¿t chiáº¿n dá»‹ch vÃ  danh sÃ¡ch báº£n ghi.' },
      { key: 'mkt_efficiency.export', label: 'Xuáº¥t file Excel Hiá»‡u quáº£ MKT', desc: 'Quyá»n táº£i vá» cÃ¡c báº£n ghi vÃ  bÃ¡o cÃ¡o chiáº¿n dá»‹ch dÆ°á»›i dáº¡ng file Excel.' },
      { key: 'mkt_efficiency.filter', label: 'Lá»c danh sÃ¡ch Hiá»‡u quáº£ MKT', desc: 'Quyá»n sá»­ dá»¥ng tÃ¹y chá»n lá»c theo Dá»± Ã¡n, PhÃ²ng ban vÃ  ThÃ¡ng trong danh sÃ¡ch hiá»‡u quáº£.' }
    ]
  }
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'super_admin' | 'admin' | 'mod' | 'accountant' | 'gdda' | 'gd_khoi' | 'gdkd' | 'assistant' | 'user' | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [rolePermissionsList, setRolePermissionsList] = useState<any[]>([]);
  const [selectedRolePermission, setSelectedRolePermission] = useState<string>('admin');
  const [editedPermissions, setEditedPermissions] = useState<string[]>([]);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  const currentRolePermissions = useMemo(() => {
    const found = rolePermissionsList.find(rp => rp.role === selectedRolePermission);
    const roleKey = userRole || 'user';
    const activeSaved = rolePermissionsList.find(rp => rp.role === roleKey);
    if (activeSaved) {
      return activeSaved.permissions || [];
    }
    return DEFAULT_PERMISSIONS[roleKey] || [];
  }, [rolePermissionsList, userRole]);

  const hasPermission = useCallback((permKey: string) => {
    if (user?.email === 'thienvu1108@gmail.com' || userRole === 'super_admin') {
      return true;
    }
    return currentRolePermissions.includes(permKey);
  }, [currentRolePermissions, userRole, user?.email]);

  useEffect(() => {
    const found = rolePermissionsList.find(rp => rp.role === selectedRolePermission);
    if (found) {
      setEditedPermissions(found.permissions || []);
    } else {
      setEditedPermissions(DEFAULT_PERMISSIONS[selectedRolePermission] || []);
    }
  }, [selectedRolePermission, rolePermissionsList]);

  const hasUnsavedChanges = useMemo(() => {
    const saved = rolePermissionsList.find(rp => rp.role === selectedRolePermission)?.permissions || DEFAULT_PERMISSIONS[selectedRolePermission] || [];
    if (saved.length !== editedPermissions.length) return true;
    return [...saved].sort().join(',') !== [...editedPermissions].sort().join(',');
  }, [selectedRolePermission, rolePermissionsList, editedPermissions]);

  const handleSavePermissions = async () => {
    setIsSavingPermissions(true);
    try {
      const docId = selectedRolePermission;
      const docRef = doc(db, 'rolePermissions', docId);
      await setDoc(docRef, {
        role: selectedRolePermission,
        permissions: editedPermissions,
        updatedAt: serverTimestamp(),
        updatedBy: user?.email || 'admin'
      });
      await logAction('UPDATE', 'rolePermissions', docId, {
        role: selectedRolePermission,
        permissionsCount: editedPermissions.length
      });
      toast.success(`ÄÃ£ cáº­p nháº­t phÃ¢n quyá»n thÃ nh cÃ´ng cho vai trÃ² ${ROLE_NAMES[selectedRolePermission] || selectedRolePermission}`);
    } catch (error) {
      console.error("Save system permissions error:", error);
      toast.error("KhÃ´ng thá»ƒ lÆ°u phÃ¢n quyá»n: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsSavingPermissions(false);
    }
  };
  const [userSearch, setUserSearch] = useState('');
  const debouncedUserSearch = useDebounce(userSearch, 300);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [costs, setCosts] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [efficiencyReports, setEfficiencyReports] = useState<any[]>([]);
  const [acceptances, setAcceptances] = useState<any[]>([]);
  const [finalAcceptances, setFinalAcceptances] = useState<any[]>([]);
  const [docProcessingStatus, setDocProcessingStatus] = useState<any[]>([]);
  const [supportRequests, setSupportRequests] = useState<any[]>([]);

  // Pagination states for 20 items per page
  const [projectPage, setProjectPage] = useState(1);
  const [teamPage, setTeamPage] = useState(1);
  const [budgetPage, setBudgetPage] = useState(1);
  const [unbudgetedPage, setUnbudgetedPage] = useState(1);
  const [costPage, setCostPage] = useState(1);
  const [efficiencyPage, setEfficiencyPage] = useState(1);
  const [acceptancePage, setAcceptancePage] = useState(1);

  // Report states moved up
  const [userProfile, setUserProfile] = useState<{ fullName?: string, teamName?: string, role?: string, assignedProjects?: string[], assignedBlock?: string } | null>(null);
  const [budgetWarningThreshold, setBudgetWarningThreshold] = useState(80);
  const [budgetCriticalThreshold, setBudgetCriticalThreshold] = useState(100);

  const isAdmin = useMemo(() => {
    const role = (userRole || userProfile?.role || '').toLowerCase().trim();
    return role === 'admin' || role === 'super_admin' || role === 'quáº£n trá»‹' || user?.email?.toLowerCase() === 'thienvu1108@gmail.com';
  }, [userRole, userProfile, user]);

  const isSuperAdmin = useMemo(() => {
    const role = (userRole || userProfile?.role || '').toLowerCase().trim();
    return role === 'super_admin' || user?.email?.toLowerCase() === 'thienvu1108@gmail.com';
  }, [userRole, userProfile, user]);

  const isMod = useMemo(() => {
    const role = (userRole || userProfile?.role || '').toLowerCase().trim();
    return role === 'mod' || role === 'moderator' || role === 'Ä‘iá»u phá»‘i';
  }, [userRole, userProfile]);

  const isAccountant = useMemo(() => {
    const role = (userRole || userProfile?.role || '').toLowerCase().trim();
    return role === 'accountant' || role === 'káº¿ toÃ¡n' || role === 'accounting';
  }, [userRole, userProfile]);

  const isGDDA = useMemo(() => {
    const role = (userProfile?.role || userRole || '').toString().toLowerCase().trim();
    return role === 'gdda' || role === 'gÄ‘da' || role === 'giÃ¡m Ä‘á»‘c dá»± Ã¡n';
  }, [userProfile, userRole]);

  const isGDKhoi = useMemo(() => {
    const role = (userProfile?.role || userRole || '').toString().toLowerCase().trim();
    return role === 'gd_khoi' || role === 'gdkhoi' || role === 'gÄ‘ khá»‘i' || role === 'giÃ¡m Ä‘á»‘c khá»‘i' || role === 'giÃ¡m Ä‘á»‘c liÃªn khá»‘i' || role === 'gdk' || role === 'tro_ly_khoi' || role === 'tro ly khoi' || role === 'trá»£ lÃ½ khá»‘i' || role === 'tro_ly_gdkhoi' || role === 'assistant_block';
  }, [userProfile, userRole]);

  const isTroLyKhoi = useMemo(() => {
    const role = (userProfile?.role || userRole || '').toString().toLowerCase().trim();
    return role === 'tro_ly_khoi' || role === 'tro ly khoi' || role === 'trá»£ lÃ½ khá»‘i' || role === 'tro_ly_gdkhoi' || role === 'assistant_block';
  }, [userProfile, userRole]);

  const isGDKD = useMemo(() => {
    const role = (userProfile?.role || userRole || '').toString().toLowerCase().trim();
    return role === 'gdkd' || role === 'gÄ‘kd' || role === 'giÃ¡m Ä‘á»‘c kinh doanh' || role === 'gÄ‘ kinh doanh';
  }, [userProfile, userRole]);

  const isAssistant = useMemo(() => {
    const role = (userRole || userProfile?.role || '').toLowerCase().trim();
    return role === 'assistant' || role === 'trá»£ lÃ½' || role === 'tro ly';
  }, [userRole, userProfile]);

  const isUser = useMemo(() => {
    const role = (userRole || userProfile?.role || '').toLowerCase().trim();
    return !role || role === 'user' || role === 'ngÆ°á»i dÃ¹ng';
  }, [userRole, userProfile]);

  const isInternalStaff = useMemo(() => {
    const role = (userRole || userProfile?.role || '').toLowerCase().trim();
    const email = user?.email?.toLowerCase() || '';
    const internalRoles = ['super_admin', 'admin', 'mod', 'accountant', 'gdda', 'gd_khoi', 'gdkhoi', 'gÄ‘ khá»‘i', 'giÃ¡m Ä‘á»‘c khá»‘i', 'tro_ly_khoi', 'trá»£ lÃ½ khá»‘i', 'gdkd', 'giÃ¡m Ä‘á»‘c kinh doanh', 'assistant', 'trá»£ lÃ½', 'tro ly', 'moderator', 'káº¿ toÃ¡n', 'Ä‘iá»u phá»‘i', 'accounting'];
    return internalRoles.includes(role) || 
           email === 'thienvu1108@gmail.com' || 
           email === 'tesscain2022@gmail.com' ||
           isSuperAdmin || isAdmin || isMod || isAccountant || isGDDA || isGDKhoi || isTroLyKhoi || isGDKD || isAssistant;
  }, [userRole, user, isSuperAdmin, isAdmin, isMod, isAccountant, isGDDA, isGDKhoi, isTroLyKhoi, isGDKD, isAssistant]);
  const [activeTab, setActiveTab] = useState('home');
  const [reportNtSubTab, setReportNtSubTab] = useState<'direct' | 'google-sheet'>('direct');
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [showQuotaGuide, setShowQuotaGuide] = useState(false);

  useEffect(() => {
    const handleQuotaExceeded = () => {
      setIsQuotaExceeded(true);
    };
    window.addEventListener('firestore-quota-exceeded', handleQuotaExceeded);
    if ((window as any).isFirestoreQuotaExceeded) {
      setIsQuotaExceeded(true);
    }
    return () => {
      window.removeEventListener('firestore-quota-exceeded', handleQuotaExceeded);
    };
  }, []);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingName, setOnboardingName] = useState('');
  const [onboardingTeam, setOnboardingTeam] = useState('');

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
      map[t.id] = convertMhToMay(t.name);
    });
    return map;
  }, [teams]);

  // Block management states
  const [selectedBlockId, setSelectedBlockId] = useState<string>('');
  const [activeTeamMgmtId, setActiveTeamMgmtId] = useState<string>('');
  const [blockNameInput, setBlockNameInput] = useState('');
  const [blockCodeInput, setBlockCodeInput] = useState('');
  const [blockPrefixInput, setBlockPrefixInput] = useState('');
  const [blockDirectorUid, setBlockDirectorUid] = useState('');
  const [createBlockAssistantUids, setCreateBlockAssistantUids] = useState<string[]>([]);
  const [createBlockTeamSearch, setCreateBlockTeamSearch] = useState('');
  const [selectedTeamToAddToBlock, setSelectedTeamToAddToBlock] = useState('');
  const [isCreateBlockDialogOpen, setIsCreateBlockDialogOpen] = useState(false);
  const [selectedTeamIdsForNewBlock, setSelectedTeamIdsForNewBlock] = useState<string[]>([]);
  const [blockBudgetMonthFilter, setBlockBudgetMonthFilter] = useState<string>('all');
  const [blockCostMonthFilter, setBlockCostMonthFilter] = useState<string>('all');
  const [isCreatingBlockTeam, setIsCreatingBlockTeam] = useState(false);
  const [teamBudgetMonthFilter, setTeamBudgetMonthFilter] = useState<string>('all');
  const [teamCostMonthFilter, setTeamCostMonthFilter] = useState<string>('all');
  const [assignExistingTeamId, setAssignExistingTeamId] = useState<string>('');
  
  // States related to Editing a Block
  const [isEditBlockDialogOpen, setIsEditBlockDialogOpen] = useState(false);
  const [editBlockNameInput, setEditBlockNameInput] = useState('');
  const [editBlockCodeInput, setEditBlockCodeInput] = useState('');
  const [editBlockPrefixInput, setEditBlockPrefixInput] = useState('');
  const [editBlockDirectorUid, setEditBlockDirectorUid] = useState('');
  const [editBlockAssistantUids, setEditBlockAssistantUids] = useState<string[]>([]);
  const [editBlockTeamSearch, setEditBlockTeamSearch] = useState('');
  const [editBlockSelectedTeamToAssign, setEditBlockSelectedTeamToAssign] = useState('');

  // States for Block Marketing Acceptance
  const [blockAcceptanceMonthFilter, setBlockAcceptanceMonthFilter] = useState<string>('all');
  const [blockAcceptanceTeamFilter, setBlockAcceptanceTeamFilter] = useState<string>('all');
  const [blockAcceptanceProjectFilter, setBlockAcceptanceProjectFilter] = useState<string>('all');
  const [blockAcceptanceStatusFilter, setBlockAcceptanceStatusFilter] = useState<string>('all');
  const [blockAcceptanceSearch, setBlockAcceptanceSearch] = useState<string>('');
  const [blockAcceptanceViewMode, setBlockAcceptanceViewMode] = useState<'direct' | 'google-sheet'>('direct');

  const myBlock = useMemo(() => {
    if (userProfile?.assignedBlock) {
      const found = blocks.find(b => b.id === userProfile.assignedBlock || b.blockCode === userProfile.assignedBlock);
      if (found) return found;
    }
    const uUid = user?.uid;
    const uEmail = user?.email?.toLowerCase();
    if (uUid || uEmail) {
      const found = blocks.find(b => 
        (uUid && b.directorUid === uUid) || 
        (uEmail && b.directorUid?.toLowerCase() === uEmail) ||
        (Array.isArray(b.assistantUids) && (
          (uUid && b.assistantUids.includes(uUid)) || 
          (uEmail && b.assistantUids.some((uid: string) => uid?.toLowerCase() === uEmail))
        ))
      );
      if (found) return found;
    }
    return null;
  }, [userProfile?.assignedBlock, blocks, user]);

  const currentActiveBlock = useMemo(() => {
    if (isGDKhoi) return myBlock;
    if (selectedBlockId) {
      return blocks.find(b => b.id === selectedBlockId || b.blockCode === selectedBlockId);
    }
    return blocks[0] || null;
  }, [isGDKhoi, myBlock, selectedBlockId, blocks]);

  const isTeamInMyBlock = useCallback((teamId: string) => {
    if (isAdmin || isAccountant || isSuperAdmin) return true;
    const block = currentActiveBlock;
    if (!block) return false;
    const team = teams.find(t => t.id === teamId);
    if (!team) return false;
    if (team.blockId === block.id || team.blockCode === block.blockCode) return true;
    if (team.blockId === 'unassigned' || team.blockCode === 'unassigned' || team.blockId === 'none' || team.blockCode === 'none') return false;
    if (team.blockId && team.blockId !== block.id) return false;
    if (team.blockCode && team.blockCode !== block.blockCode) return false;
    const code = team.teamCode || extractTeamCode(team.name || '');
    let prefix = (block.teamPrefix || '').toUpperCase().trim();
    if (prefix === 'MH') prefix = 'MAY';
    return !!(prefix && code.toUpperCase().startsWith(prefix));
  }, [currentActiveBlock, teams, isAdmin, isAccountant, isSuperAdmin]);

  const [budgetReportSort, setBudgetReportSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'amount', direction: 'desc' });
  const [costReportSort, setCostReportSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'amount', direction: 'desc' });

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

  const [adminBudgetSearch, setAdminBudgetSearch] = useState('');
  const debouncedAdminBudgetSearch = useDebounce(adminBudgetSearch, 300);
  const [adminBudgetMonthFilter, setAdminBudgetMonthFilter] = useState(getMarketingMonth(new Date()));
  const [adminBudgetSort, setAdminBudgetSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' });

  const handleAdminBudgetSort = useCallback((key: string) => {
    setAdminBudgetSort(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  }, []);
  const [adminCostSearch, setAdminCostSearch] = useState('');
  const debouncedAdminCostSearch = useDebounce(adminCostSearch, 300);
  const [adminCostMonthFilter, setAdminCostMonthFilter] = useState(getMarketingMonth(new Date()));
  const [selectedBudgetIds, setSelectedBudgetIds] = useState<string[]>([]);
  const [selectedCostIds, setSelectedCostIds] = useState<string[]>([]);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<any>(null);
  const [selectedLogForRestore, setSelectedLogForRestore] = useState<any>(null);

  const [newBlockTeamName, setNewBlockTeamName] = useState('');
  const [newBlockTeamCode, setNewBlockTeamCode] = useState('');
  const [editingBlockTeamId, setEditingBlockTeamId] = useState<string | null>(null);
  const [editingBlockTeamName, setEditingBlockTeamName] = useState('');
  const [editingBlockTeamCode, setEditingBlockTeamCode] = useState('');

  const [blockBudgetProject, setBlockBudgetProject] = useState('');
  const [blockBudgetTeam, setBlockBudgetTeam] = useState('');
  const [blockBudgetMonth, setBlockBudgetMonth] = useState(getMarketingMonth(new Date()));
  const [blockBudgetAmount, setBlockBudgetAmount] = useState('');
  const [blockBudgetImplementer, setBlockBudgetImplementer] = useState('');

  const [blockCostProject, setBlockCostProject] = useState('');
  const [blockCostTeam, setBlockCostTeam] = useState('');
  const [blockCostMonth, setBlockCostMonth] = useState(getMarketingMonth(new Date()));
  const [blockCostAmount, setBlockCostAmount] = useState('');
  const [blockCostNote, setBlockCostNote] = useState('');
  const [blockCostFb, setBlockCostFb] = useState('');
  const [blockCostGoogle, setBlockCostGoogle] = useState('');
  const [blockCostZalo, setBlockCostZalo] = useState('');
  const [blockCostPosting, setBlockCostPosting] = useState('');
  const [blockCostOther, setBlockCostOther] = useState('');

  // Team management (GDKD) states
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('user');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserName, setEditingUserName] = useState('');
  const [editingUserRole, setEditingUserRole] = useState('user');

  // Admin expanded Team Management states
  const [adminSelectedTeamToManage, setAdminSelectedTeamToManage] = useState<string | null>(null);
  const [adminAddMemberName, setAdminAddMemberName] = useState('');
  const [adminAddMemberEmail, setAdminAddMemberEmail] = useState('');
  const [adminAddMemberRole, setAdminAddMemberRole] = useState('user');
  const [adminSelectExistingUserId, setAdminSelectExistingUserId] = useState('');

  const [teamCostProject, setTeamCostProject] = useState('');
  const [teamCostMonth, setTeamCostMonth] = useState(getMarketingMonth(new Date()));
  const [teamCostAmount, setTeamCostAmount] = useState('');
  const [teamCostNote, setTeamCostNote] = useState('');
  const [teamCostMember, setTeamCostMember] = useState('');
  const [teamCostFb, setTeamCostFb] = useState('');
  const [teamCostGoogle, setTeamCostGoogle] = useState('');
  const [teamCostZalo, setTeamCostZalo] = useState('');
  const [teamCostPosting, setTeamCostPosting] = useState('');
  const [teamCostOther, setTeamCostOther] = useState('');
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
  const [isAlertManagementOpen, setIsAlertManagementOpen] = useState(false);

  const [adminSubTab, setAdminSubTab] = useState('reports');
  const [blockSubTab, setBlockSubTab] = useState('block-teams');
  const [teamSubTab, setTeamSubTab] = useState('team-members');

  // BÃ¡o cÃ¡o NT states
  const [reportNTUrl, setReportNTUrl] = useState('');
  const [reportNTRecords, setReportNTRecords] = useState<any[]>([]);
  const [reportNTLastUpdated, setReportNTLastUpdated] = useState<any>(null);
  const [isSyncingReportNT, setIsSyncingReportNT] = useState(false);
  const [reportNTSearch, setReportNTSearch] = useState('');
  const [inputReportNTUrl, setInputReportNTUrl] = useState('');
  const [ntPage, setNtPage] = useState(1);
  const [ntSortField, setNtSortField] = useState<string | null>(null);
  const [ntSortDirection, setNtSortDirection] = useState<'asc' | 'desc' | 'none'>('none');

  const syncLogToGoogleSheets = async (logEntry: any) => {
    try {
      const payload = {
        action: logEntry.action,
        collection: logEntry.collection,
        docId: logEntry.docId,
        userEmail: logEntry.userEmail,
        timestamp: new Date().toISOString(),
        details: JSON.stringify(logEntry.data || {}).substring(0, 1000)
      };

      await fetch('https://script.google.com/macros/s/AKfycbz_m3Yc0_H69P6Pj6Uq9p5uH7U6q_R5p6s/exec', {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
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
      
      // Tá»± Ä‘á»™ng Ä‘á»“ng bá»™ Nháº­t kÃ½ nÃ y sang Google Sheet ngay láº­p tá»©c
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

  const [acceptanceSearch, setAcceptanceSearch] = useState('');
  const debouncedAcceptanceSearch = useDebounce(acceptanceSearch, 300);
  const [acceptanceMonthFilter, setAcceptanceMonthFilter] = useState('all');
  const [acceptanceProjectFilter, setAcceptanceProjectFilter] = useState('all');
  const [acceptanceTeamFilter, setAcceptanceTeamFilter] = useState('all');
  const [acceptanceCategoryFilter, setAcceptanceCategoryFilter] = useState('all');

  const groupedDocProcessing = useMemo(() => {
    const groups: Record<string, any> = {};
    
    // Index status for O(1) lookup
    const statusMap = new Map();
    (docProcessingStatus || []).forEach(s => {
      if (s.projectId || s.teamId) {
        statusMap.set(`${s.projectId}_${s.teamId}`, s);
      }
    });

    (finalAcceptances || []).forEach(a => {
      // Filter by month if not 'all'
      if (acceptanceMonthFilter !== 'all' && a.month !== acceptanceMonthFilter) {
        return;
      }

      // Use unique key combining IDs and names to prevent accidental merging of different entities with missing IDs
      const safePID = a.projectId || 'ID_MISSING';
      const safePName = (a.projectName || projectMap[a.projectId] || 'N/A').trim();
      const safeTID = a.teamId || 'ID_MISSING';
      const safeTName = (a.teamName || teamMap[a.teamId] || 'N/A').trim();
      
      const key = `${safePID}_${safePName}_${safeTID}_${safeTName}`;
      
      if (!groups[key]) {
        groups[key] = {
          groupKey: key,
          projectId: a.projectId || '',
          projectName: safePName,
          teamId: a.teamId || '',
          teamName: safeTName,
          totalAmount: 0,
          visaCost: 0,
          digitalCost: 0,
          crmCost: 0,
          facebookCost: 0,
          googleCost: 0,
          zaloCost: 0,
          tiktokCost: 0,
          postingCost: 0,
          otherCost: 0,
          recordCount: 0
        };
      }
      groups[key].totalAmount += (a.totalActualCost || a.afterAcceptanceCost || 0);
      groups[key].visaCost += (a.visaCost || 0);
      groups[key].digitalCost += (a.digitalCost || 0);
      groups[key].crmCost += (a.crmCost || 0);
      groups[key].facebookCost += (a.facebookCost || 0);
      groups[key].googleCost += (a.googleCost || 0);
      groups[key].zaloCost += (a.zaloCost || 0);
      groups[key].tiktokCost += (a.tiktokCost || 0);
      groups[key].postingCost += (a.postingCost || 0);
      groups[key].otherCost += (a.otherCost || 0);
      groups[key].recordCount += 1;
    });

    const searchLower = (debouncedAcceptanceSearch || '').toLowerCase();
    const projectNameFromMap = (projectMap[acceptanceProjectFilter] || '').toLowerCase();
    const teamNameFromMap = (teamMap[acceptanceTeamFilter] || '').toLowerCase();
    const projectFilterLower = (acceptanceProjectFilter || '').toLowerCase();
    const teamFilterLower = (acceptanceTeamFilter || '').toLowerCase();

    return Object.values(groups).map(group => {
      // Improved lookup: Try ID match, then fallback to Name match
      let status = statusMap.get(`${group.projectId}_${group.teamId}`);
      if (!status) {
         status = docProcessingStatus.find(s => 
           (s.projectId === group.projectId && s.teamId === group.teamId) ||
           (s.projectName === group.projectName && s.teamName === group.teamName)
         );
      }
      
      return {
        ...group,
        id: status?.id || null,
        confirmation: status?.confirmation || 'ChÆ°a Ä‘á»‘i soÃ¡t',
        note: status?.note || '',
        updatedAt: status?.updatedAt,
        updatedByEmail: status?.updatedByEmail
      };
    }).filter(g => {
      const matchSearch = !searchLower ||
        (g.projectName || '').toLowerCase().includes(searchLower) ||
        (g.teamName || '').toLowerCase().includes(searchLower);
      
      const gProjectLower = (g.projectName || '').toLowerCase().trim();
      const matchProject = acceptanceProjectFilter === 'all' || 
                           (g.projectId && String(g.projectId).trim() === String(acceptanceProjectFilter).trim()) || 
                           (projectNameFromMap && gProjectLower.includes(projectNameFromMap)) ||
                           (gProjectLower.includes(projectFilterLower));
      
      const gTeamLower = (g.teamName || '').toLowerCase().trim();
      const matchTeam = acceptanceTeamFilter === 'all' || 
                       (gTeamLower.includes(teamFilterLower)) ||
                       (g.teamId && String(g.teamId).toLowerCase().trim() === String(acceptanceTeamFilter).trim().toLowerCase()) ||
                       (teamNameFromMap && gTeamLower.includes(teamNameFromMap));
      
      const matchCategory = acceptanceCategoryFilter === 'all' || 
                           (acceptanceCategoryFilter === 'digital' && g.digitalCost > 0) ||
                           (acceptanceCategoryFilter === 'visa' && g.visaCost > 0) ||
                           (acceptanceCategoryFilter === 'crm' && (g.crmCost || 0) > 0);
      
      return matchSearch && matchProject && matchTeam && matchCategory;
    });
  }, [finalAcceptances, docProcessingStatus, projectMap, teamMap, debouncedAcceptanceSearch, acceptanceProjectFilter, acceptanceTeamFilter, acceptanceMonthFilter, acceptanceCategoryFilter]);

  const handleUpdateDocProcessing = async (projectId: string, teamId: string, confirmation: string, note: string) => {
    try {
      const existing = docProcessingStatus.find(s => s.projectId === projectId && s.teamId === teamId);
      const data = {
        projectId,
        teamId,
        confirmation,
        note,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid,
        updatedByEmail: user?.email
      };

      if (existing) {
        await updateDoc(doc(db, 'docProcessing', existing.id), data);
      } else {
        await addDoc(collection(db, 'docProcessing'), data);
      }
      toast.success('Cáº­p nháº­t tráº¡ng thÃ¡i thÃ nh cÃ´ng');
      await logAction('UPDATE_DOC_PROCESSING', 'docProcessing', `${projectId}_${teamId}`, { confirmation, note });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'docProcessing');
    }
  };

  const dataDrivenTeamMap = useMemo(() => {
    const map: Record<string, string> = { ...teamMap };
    budgets.forEach(b => { if (b.teamId && b.teamName && !map[b.teamId]) map[b.teamId] = b.teamName; });
    costs.forEach(c => { if (c.teamId && c.teamName && !map[c.teamId]) map[c.teamId] = c.teamName; });
    return map;
  }, [budgets, costs, teamMap]);

  const dataDrivenProjectMap = useMemo(() => {
    const map: Record<string, string> = { ...projectMap };
    budgets.forEach(b => { if (b.projectId && b.projectName && !map[b.projectId]) map[b.projectId] = b.projectName; });
    costs.forEach(c => { if (c.projectId && c.projectName && !map[c.projectName]) map[c.projectName] = c.projectName; });
    return map;
  }, [budgets, costs, projectMap]);

  const budgetAmountMap = useMemo(() => {
    const map: Record<string, number> = {};
    budgets.forEach(b => {
      map[b.id] = b.amount;
    });
    return map;
  }, [budgets]);

  const latestCostsByBudget = useMemo(() => {
    const map: Record<string, any> = {};
    costs.forEach(c => {
      const budgetId = c.budgetId;
      if (!budgetId) return;
      
      const existing = map[budgetId];
      const currentTimestamp = c.createdAt?.toDate ? c.createdAt.toDate().getTime() : (c.createdAt ? new Date(c.createdAt).getTime() : 0);
      const existingTimestamp = existing?.createdAt?.toDate ? existing.createdAt.toDate().getTime() : (existing?.createdAt ? new Date(existing.createdAt).getTime() : 0);
      
      if (!existing || currentTimestamp > existingTimestamp) {
        map[budgetId] = c;
      }
    });
    return map;
  }, [costs]);

  const latestCostsList = useMemo(() => Object.values(latestCostsByBudget), [latestCostsByBudget]);

  const resolveTeamName = useCallback((id: string | undefined, name: string | undefined) => {
    let res = 'N/A';
    if (id && teamMap[id]) res = teamMap[id];
    else if (id && dataDrivenTeamMap[id]) res = dataDrivenTeamMap[id];
    else if (name) {
      const isIdLike = name.length > 10 && !name.includes(' ') && /^[a-zA-Z0-9]+$/.test(name);
      if (isIdLike && dataDrivenTeamMap[name]) res = dataDrivenTeamMap[name];
      else res = name;
    } else {
      res = id || 'N/A';
    }
    return convertMhToMay(res);
  }, [teamMap, dataDrivenTeamMap]);

  const resolveProjectName = useCallback((id: string | undefined, name: string | undefined) => {
    if (id && projectMap[id]) return projectMap[id];
    if (id && dataDrivenProjectMap[id]) return dataDrivenProjectMap[id];
    if (name) {
      const isIdLike = name.length > 10 && !name.includes(' ') && /^[a-zA-Z0-9]+$/.test(name);
      if (isIdLike && dataDrivenProjectMap[name]) return dataDrivenProjectMap[name];
      return name;
    }
    return id || 'N/A';
  }, [projectMap, dataDrivenProjectMap]);

  const getAcceptanceCostValue = useCallback((a: any): number => {
    if (!a) return 0;
    if (a.afterAcceptanceCost !== undefined && a.afterAcceptanceCost !== null && Number(a.afterAcceptanceCost) > 0) {
      return Number(a.afterAcceptanceCost);
    }
    if (a.totalActualCost !== undefined && a.totalActualCost !== null && Number(a.totalActualCost) > 0) {
      return Number(a.totalActualCost);
    }
    return Number(a.totalCost || 0);
  }, []);

  const acceptanceMap = useMemo(() => {
    const map: Record<string, number> = {};
    const groupedAcceptances: Record<string, number> = {};

    // Combine acceptances and finalAcceptances cleanly without duplicate IDs
    const allAcceptancesMap = new Map<string, any>();
    (acceptances || []).forEach(a => {
      if (a && a.id) allAcceptancesMap.set(a.id, a);
    });
    (finalAcceptances || []).forEach(fa => {
      if (fa && fa.id && !allAcceptancesMap.has(fa.id)) {
        allAcceptancesMap.set(fa.id, fa);
      }
    });

    allAcceptancesMap.forEach(a => {
      const aTeamName = resolveTeamName(a.teamId, a.teamName) || teamMap[a.teamId] || a.teamName || '';
      const aProjName = resolveProjectName(a.projectId, a.projectName) || projectMap[a.projectId] || a.projectName || '';
      const tKey = normalizeTeamName(aTeamName).trim().toLowerCase();
      const pKey = aProjName.trim().toLowerCase();
      const mKey = normalizeMonth(a.month || '');

      const costValue = getAcceptanceCostValue(a);

      if (mKey && costValue >= 0) {
        if (tKey && pKey) {
          const key1 = `${tKey}|${pKey}|${mKey}`;
          groupedAcceptances[key1] = (groupedAcceptances[key1] || 0) + costValue;
        }
        if (a.teamId && a.projectId) {
          const key2 = `${String(a.teamId).trim().toLowerCase()}|${String(a.projectId).trim().toLowerCase()}|${mKey}`;
          if (key2 !== `${tKey}|${pKey}|${mKey}`) {
            groupedAcceptances[key2] = (groupedAcceptances[key2] || 0) + costValue;
          }
        }
      }
    });

    budgets.forEach(b => {
      const bTeamName = resolveTeamName(b.teamId, b.teamName) || teamMap[b.teamId] || b.teamName || '';
      const bProjName = resolveProjectName(b.projectId, b.projectName) || projectMap[b.projectId] || b.projectName || '';
      const tKey = normalizeTeamName(bTeamName).trim().toLowerCase();
      const pKey = bProjName.trim().toLowerCase();
      const mKey = normalizeMonth(b.month || '');

      const key1 = `${tKey}|${pKey}|${mKey}`;
      const key2 = `${String(b.teamId).trim().toLowerCase()}|${String(b.projectId).trim().toLowerCase()}|${mKey}`;

      if (groupedAcceptances[key1] !== undefined) {
        map[b.id] = groupedAcceptances[key1];
      } else if (groupedAcceptances[key2] !== undefined) {
        map[b.id] = groupedAcceptances[key2];
      } else {
        map[b.id] = 0;
      }
    });

    return map;
  }, [budgets, acceptances, finalAcceptances, resolveTeamName, resolveProjectName, teamMap, projectMap, getAcceptanceCostValue]);

  const baoCaoNTMap = acceptanceMap;

  const isReportsActive = activeTab === 'reports' || (activeTab === 'admin' && adminSubTab === 'reports') || activeTab === 'mkt-efficiency';

  const normalizedReportMonths = useMemo(() => reportMonths.map(m => normalizeMonth(m)), [reportMonths]);

  const filteredBudgets = useMemo(() => {
    if (!isReportsActive && activeTab !== 'budgets' && activeTab !== 'admin' && activeTab !== 'doc-processing') return [];
    // Get all teams in GÄ Khá»‘i's block if user is GÄ Khá»‘i
    const blockTeams = teams.filter(t => isTeamInBlock(t, currentActiveBlock));
    const blockTeamIds = new Set(blockTeams.map(t => t.id));
    const blockTeamNames = new Set(blockTeams.map(t => (t.name || '').toLowerCase().trim()));
    const blockTeamCodes = new Set(blockTeams.map(t => (t.teamCode || '').toLowerCase().trim()));

    return budgets.filter(b => {
      const bProjectName = resolveProjectName(b.projectId, b.projectName);
      const bTeamName = resolveTeamName(b.teamId, b.teamName);
      const project = projects.find(p => p.id === b.projectId || p.name === bProjectName);
      
      const userEmail = user?.email?.toLowerCase();
      const budgetEmail = (b.userEmail || b.createdByEmail)?.toLowerCase();
      const isOwner = (budgetEmail && userEmail && budgetEmail === userEmail) || (b.createdBy === user?.uid);
      const isAssigned = b.assignedUserEmail?.toLowerCase() === userEmail;
      
      const isInMyBlock = isGDKhoi && (
        (b.teamId && blockTeamIds.has(b.teamId)) ||
        (b.teamName && blockTeamNames.has(b.teamName.toLowerCase().trim())) ||
        (b.teamCode && blockTeamCodes.has(b.teamCode.toLowerCase().trim()))
      );

      const isInMyTeam = isGDKD && userProfile?.teamName && (
        (b.teamName && b.teamName.toLowerCase().trim() === String(userProfile.teamName).toLowerCase().trim()) ||
        (b.teamId && teams.find(t => t.id === b.teamId)?.name?.toLowerCase().trim() === String(userProfile.teamName).toLowerCase().trim())
      );

      const hasAccess = isAdmin || isMod || isAccountant || isGDDA || isInMyBlock || isInMyTeam || (isOwner || isAssigned);
      
      if (!hasAccess) return false;

      const matchProject = reportProject === 'all' || b.projectId === reportProject || bProjectName === projectMap[reportProject];
      const matchTeam = reportTeam === 'all' || b.teamId === reportTeam || bTeamName === reportTeam || bTeamName === teamMap[reportTeam];
      const matchMonth = normalizedReportMonths.length === 0 || normalizedReportMonths.includes(normalizeMonth(b.month));
      const matchRegion = reportRegion === 'all' || (project?.region || 'KhÃ¡c') === reportRegion;
      const matchType = reportType === 'all' || (project?.type || 'KhÃ¡c') === reportType;
      
      return matchProject && matchTeam && matchMonth && matchRegion && matchType;
    }).sort((a, b) => {
      const factor = budgetReportSort.direction === 'asc' ? 1 : -1;
      if (budgetReportSort.key === 'amount') return (a.amount - b.amount) * factor;
      if (budgetReportSort.key === 'team') return (a.teamName || '').localeCompare(b.teamName || '') * factor;
      if (budgetReportSort.key === 'project') return (a.projectName || '').localeCompare(b.projectName || '') * factor;
      if (budgetReportSort.key === 'implementer') return (a.implementerName || '').localeCompare(b.implementerName || '') * factor;
      return 0;
    });
  }, [budgets, costs, projectMap, teamMap, dataDrivenTeamMap, dataDrivenProjectMap, reportProject, reportTeam, normalizedReportMonths, reportRegion, reportType, isAdmin, isMod, isGDDA, isGDKhoi, isGDKD, currentActiveBlock, teams, userProfile, budgetReportSort, user, resolveProjectName, resolveTeamName, isReportsActive, activeTab]);

  const filteredCosts = useMemo(() => {
    if (!isReportsActive && activeTab !== 'budgets' && activeTab !== 'admin' && activeTab !== 'doc-processing') return [];
    // Get all teams in GÄ Khá»‘i's block if user is GÄ Khá»‘i
    const blockTeams = teams.filter(t => isTeamInBlock(t, currentActiveBlock));
    const blockTeamIds = new Set(blockTeams.map(t => t.id));
    const blockTeamNames = new Set(blockTeams.map(t => (t.name || '').toLowerCase().trim()));
    const blockTeamCodes = new Set(blockTeams.map(t => (t.teamCode || '').toLowerCase().trim()));

    return costs.filter(c => {
      const cProjectName = resolveProjectName(c.projectId, c.projectName);
      const cTeamName = resolveTeamName(c.teamId, c.teamName);
      const project = projects.find(p => p.id === c.projectId || p.name === cProjectName);
      
      const userEmail = user?.email?.toLowerCase();
      const costEmail = (c.userEmail || c.createdByEmail)?.toLowerCase();
      const isOwner = (costEmail && userEmail && costEmail === userEmail) || (c.createdBy === user?.uid);
      const isAssigned = c.assignedUserEmail?.toLowerCase() === userEmail;
      
      const isInMyBlock = isGDKhoi && (
        (c.teamId && blockTeamIds.has(c.teamId)) ||
        (c.teamName && blockTeamNames.has(c.teamName.toLowerCase().trim())) ||
        (c.teamCode && blockTeamCodes.has(c.teamCode.toLowerCase().trim()))
      );

      const isInMyTeam = isGDKD && userProfile?.teamName && (
        (c.teamName && c.teamName.toLowerCase().trim() === String(userProfile.teamName).toLowerCase().trim()) ||
        (c.teamId && teams.find(t => t.id === c.teamId)?.name?.toLowerCase().trim() === String(userProfile.teamName).toLowerCase().trim())
      );

      const hasAccess = isAdmin || isMod || isAccountant || isGDDA || isInMyBlock || isInMyTeam || (isOwner || isAssigned);
      
      if (!hasAccess) return false;

      const matchProject = reportProject === 'all' || c.projectId === reportProject || cProjectName === projectMap[reportProject];
      const matchTeam = reportTeam === 'all' || c.teamId === reportTeam || cTeamName === reportTeam || cTeamName === teamMap[reportTeam];
      const mMonth = c.month || (c.createdAt?.toDate ? getMarketingMonth(c.createdAt.toDate()) : null);
      const normalizedMMonth = normalizeMonth(mMonth);
      const matchMonth = normalizedReportMonths.length === 0 || (normalizedMMonth && normalizedReportMonths.includes(normalizedMMonth));
      const matchRegion = reportRegion === 'all' || (project?.region || 'KhÃ¡c') === reportRegion;
      const matchType = reportType === 'all' || (project?.type || 'KhÃ¡c') === reportType;
      const matchWeek = reportWeek === 'all' || c.weekNumber?.toString() === reportWeek;
      
      return matchProject && matchTeam && matchMonth && matchRegion && matchType && matchWeek;
    }).sort((a, b) => {
      const factor = costReportSort.direction === 'asc' ? 1 : -1;
      if (costReportSort.key === 'amount') return (a.amount - b.amount) * factor;
      if (costReportSort.key === 'team') return (a.teamName || '').localeCompare(b.teamName || '') * factor;
      if (costReportSort.key === 'project') return (a.projectName || '').localeCompare(b.projectName || '') * factor;
      if (costReportSort.key === 'implementer') return (a.implementerName || '').localeCompare(b.implementerName || '') * factor;
      if (costReportSort.key === 'createdAt') {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return (timeA - timeB) * factor;
      }
      return 0;
    });
  }, [costs, projects, projectMap, teamMap, dataDrivenTeamMap, dataDrivenProjectMap, reportProject, reportTeam, normalizedReportMonths, getMarketingMonth, reportRegion, reportType, reportWeek, isAdmin, isMod, isGDDA, isGDKhoi, isGDKD, currentActiveBlock, teams, userProfile, costReportSort, user, resolveProjectName, resolveTeamName, isReportsActive, activeTab]);

  const budgetReportWithActuals = useMemo(() => {
    if (!isReportsActive && activeTab !== 'budgets' && activeTab !== 'admin') return [];
    const budgetMap: { [key: string]: any } = {};

    // 1. Group budgets by team + project across selected months
    filteredBudgets.forEach(b => {
      const bTeamName = resolveTeamName(b.teamId, b.teamName) || '';
      const bProjectName = resolveProjectName(b.projectId, b.projectName) || '';
      const key = `${String(bTeamName).trim().toLowerCase()}|${String(bProjectName).trim().toLowerCase()}`;

      if (!budgetMap[key]) {
        budgetMap[key] = {
          ...b,
          id: b.id, // Primary ID for actions
          teamName: bTeamName,
          projectName: bProjectName,
          amount: 0,
          actualCost: 0,
          isFinalized: false
        };
      }
      budgetMap[key].amount += (b.amount || 0);
    });

    // 2. Map acceptances and merge into grouped data
    const userEmail = user?.email?.toLowerCase();
    const blockTeams = teams.filter(t => isTeamInBlock(t, currentActiveBlock));
    const blockTeamIds = new Set(blockTeams.map(t => t.id));
    const blockTeamNames = new Set(blockTeams.map(t => (t.name || '').toLowerCase().trim()));
    const blockTeamCodes = new Set(blockTeams.map(t => (t.teamCode || '').toLowerCase().trim()));

    acceptances.forEach(a => {
      const aProjectName = resolveProjectName(a.projectId, a.projectName) || '';
      const aTeamName = resolveTeamName(a.teamId, a.teamName) || '';
      const project = projects.find(p => p.id === a.projectId || p.name === aProjectName);
      const normalizedAMonth = normalizeMonth(a.month);

      // Access logic
      const aEmail = a.userEmail?.toLowerCase() || a.createdBy?.toLowerCase();
      const isOwner = (aEmail && userEmail && aEmail === userEmail) || (a.createdByUid === user?.uid);
      
      const isInMyBlock = isGDKhoi && (
        (a.teamId && blockTeamIds.has(a.teamId)) ||
        (a.teamName && blockTeamNames.has(a.teamName.toLowerCase().trim())) ||
        (a.teamCode && blockTeamCodes.has(a.teamCode.toLowerCase().trim()))
      );

      const isInMyTeam = isGDKD && userProfile?.teamName && (
        (a.teamName && a.teamName.toLowerCase().trim() === String(userProfile.teamName).toLowerCase().trim()) ||
        (a.teamId && teams.find(t => t.id === a.teamId)?.name?.toLowerCase().trim() === String(userProfile.teamName).toLowerCase().trim())
      );

      const hasAccess = isAdmin || isMod || isAccountant || isGDDA || isInMyBlock || isInMyTeam || isOwner;
      if (!hasAccess) return;

      // Filter logic
      const matchProject = reportProject === 'all' || a.projectId === reportProject || aProjectName === projectMap[reportProject];
      const matchTeam = reportTeam === 'all' || a.teamId === reportTeam || aTeamName === reportTeam || aTeamName === teamMap[reportTeam];
      const matchMonth = normalizedReportMonths.length === 0 || (normalizedAMonth && normalizedReportMonths.includes(normalizedAMonth));
      const matchRegion = reportRegion === 'all' || (project?.region || 'KhÃ¡c') === reportRegion;
      const matchType = reportType === 'all' || (project?.type || 'KhÃ¡c') === reportType;

      if (matchProject && matchTeam && matchMonth && matchRegion && matchType) {
        const key = `${String(aTeamName).trim().toLowerCase()}|${String(aProjectName).trim().toLowerCase()}`;
        // Use confirmed cost if finalized
        const costValue = a.status === 'ÄÃ£ nghiá»‡m thu' ? (a.afterAcceptanceCost || 0) : 0;

        if (!budgetMap[key]) {
          budgetMap[key] = {
            id: `grouped-acc-${a.id}`,
            teamId: a.teamId,
            teamName: aTeamName,
            projectId: a.projectId,
            projectName: aProjectName,
            amount: 0, // Registered budget is 0 if no record exists
            actualCost: 0,
            isFinalized: false,
            implementerName: 'N/A',
            userEmail: a.createdBy || 'N/A',
            month: a.month
          };
        }
        budgetMap[key].actualCost += costValue;
        if (a.status === 'ÄÃ£ nghiá»‡m thu') {
          budgetMap[key].isFinalized = true;
        }
      }
    });

    return Object.values(budgetMap).sort((a: any, b: any) => {
      const factor = budgetReportSort.direction === 'asc' ? 1 : -1;
      if (budgetReportSort.key === 'amount') return (a.amount - b.amount) * factor;
      if (budgetReportSort.key === 'actual') return (a.actualCost - b.actualCost) * factor;
      if (budgetReportSort.key === 'month') return (a.month || '').localeCompare(b.month || '') * factor;
      if (budgetReportSort.key === 'team') return (a.teamName || '').localeCompare(b.teamName || '') * factor;
      if (budgetReportSort.key === 'project') return (a.projectName || '').localeCompare(b.projectName || '') * factor;
      return 0;
    });
  }, [filteredBudgets, budgetReportSort, isReportsActive, activeTab]);

  const paginatedBudgetReportWithActuals = useMemo(() => {
    const start = (budgetPage - 1) * 20;
    return (budgetReportWithActuals || []).slice(start, start + 20);
  }, [budgetReportWithActuals, budgetPage]);

  const overBudgetStats = useMemo(() => {
    return {
      count: 0,
      warningCount: 0,
      totalExcess: 0,
      items: [],
      warningItems: []
    };
  }, []);

  const uniqueTeams = useMemo(() => {
    const set = new Set(teams.map(t => t.name));
    budgets.forEach(b => {
      const name = teamMap[b.teamId] || b.teamName;
      if (name) set.add(name);
    });
    costs.forEach(c => {
      const name = teamMap[c.teamId] || c.teamName;
      if (name) set.add(name);
    });
    acceptances.forEach(a => {
      const name = teamMap[a.teamId] || a.teamName;
      if (name) set.add(name);
    });
    efficiencyReports.forEach(r => {
      const name = teamMap[r.teamId] || r.teamName;
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [teams, budgets, costs, acceptances, efficiencyReports, teamMap]);

  const comparisonChartData = useMemo(() => {
    if (!isReportsActive) return [];
    // This chart compares items (based on efficiencyGroupType) across multiple months
    // reportSortBy determines which metric to compare
    
    // 1. Determine base items
    let items: any[] = [];
    if (efficiencyGroupType === 'team') {
      items = uniqueTeams.filter(t => reportTeam === 'all' || t === reportTeam).map(name => ({ id: name, name }));
    } else if (efficiencyGroupType === 'project') {
      items = projects.filter(p => reportProject === 'all' || p.id === reportProject).map(p => ({ id: p.id, name: p.name }));
    } else if (efficiencyGroupType === 'region') {
      items = regions.filter(r => reportRegion === 'all' || r.name === reportRegion).map(r => ({ id: r.name, name: r.name }));
    }

    // 2. Map items to monthly data
    return items.map(item => {
      const data: any = { name: item.name };
      
      reportMonths.forEach(month => {
        let value = 0;
        
        if (reportSortBy === 'budget') {
          value = budgets.filter(b => {
            const project = projects.find(p => p.id === b.projectId);
            const bTeamName = resolveTeamName(b.teamId, b.teamName);
            const bProjectName = resolveProjectName(b.projectId, b.projectName);
            
            const matchMonth = b.month === month;
            const matchProject = reportProject === 'all' || b.projectId === reportProject;
            const matchTeam = reportTeam === 'all' || bTeamName === reportTeam;
            const matchRegion = reportRegion === 'all' || (project?.region === reportRegion);
            const matchType = reportType === 'all' || (project?.type === reportType);
            
            if (!(matchMonth && matchProject && matchTeam && matchRegion && matchType)) return false;
            
            if (efficiencyGroupType === 'team') return bTeamName === item.id;
            if (efficiencyGroupType === 'project') return b.projectId === item.id || bProjectName === item.name;
            if (efficiencyGroupType === 'region') return project?.region === item.id;
            return false;
          }).reduce((acc, curr) => acc + (curr.amount || 0), 0);
        } else if (reportSortBy === 'actual') {
          value = acceptances.filter(a => {
            const project = projects.find(p => p.id === a.projectId);
            const aTeamName = resolveTeamName(a.teamId, a.teamName);
            const aProjectName = resolveProjectName(a.projectId, a.projectName);
            
            const matchMonth = normalizeMonth(a.month) === month;
            const matchProject = reportProject === 'all' || a.projectId === reportProject;
            const matchTeam = reportTeam === 'all' || aTeamName === reportTeam;
            const matchRegion = reportRegion === 'all' || (project?.region === reportRegion);
            const matchType = reportType === 'all' || (project?.type === reportType);
            
            if (!(matchMonth && matchProject && matchTeam && matchRegion && matchType)) return false;
            
            if (efficiencyGroupType === 'team') return aTeamName === item.id;
            if (efficiencyGroupType === 'project') return a.projectId === item.id || aProjectName === item.name;
            if (efficiencyGroupType === 'region') return project?.region === item.id;
            return false;
          }).reduce((acc, curr) => {
            const val = curr.status === 'ÄÃ£ nghiá»‡m thu' ? (curr.afterAcceptanceCost || 0) : 0;
            return acc + val;
          }, 0);
        } else if (reportSortBy === 'revenue') {
          value = efficiencyReports.filter(r => {
            const project = projects.find(p => p.id === r.projectId);
            const rTeamName = resolveTeamName(r.teamId, r.teamName);
            const rProjectName = resolveProjectName(r.projectId, r.projectName);
            
            const matchMonth = r.month === month;
            const matchProject = reportProject === 'all' || r.projectId === reportProject;
            const matchTeam = reportTeam === 'all' || rTeamName === reportTeam;
            const matchRegion = reportRegion === 'all' || (project?.region === reportRegion);
            
            if (!(matchMonth && matchProject && matchTeam && matchRegion)) return false;
            
            if (efficiencyGroupType === 'team') return rTeamName === item.id;
            if (efficiencyGroupType === 'project') return r.projectId === item.id || rProjectName === item.name;
            if (efficiencyGroupType === 'region') return project?.region === item.id;
            return false;
          }).reduce((acc, curr) => acc + (curr.revenue || 0), 0);
        }
        
        data[month] = value;
      });
      
      return data;
    }).filter(d => {
      // Keep only items that have at least one month with data > 0
      return reportMonths.some(m => d[m] > 0);
    });
  }, [reportMonths, budgets, acceptances, efficiencyReports, efficiencyGroupType, reportSortBy, teams, projects, regions, projectMap, teamMap, uniqueTeams, resolveTeamName, resolveProjectName, reportProject, reportTeam, reportRegion, reportType, isReportsActive, activeTab]);

  const projectChartData = useMemo(() => {
    if (!isReportsActive) return [];
    return projects.filter(p => reportProject === 'all' || p.id === reportProject).map(p => {
      const projBudgets = budgets.filter(b => {
        const matchProject = b.projectId === p.id;
        const bTeamName = resolveTeamName(b.teamId, b.teamName);
        const matchTeam = reportTeam === 'all' || bTeamName === reportTeam;
        const matchMonth = reportMonths.length === 0 || reportMonths.includes(b.month);
        return matchProject && matchTeam && matchMonth;
      });
      
      const projActual = acceptances
        .filter(a => {
          const matchProject = a.projectId === p.id;
          const matchMonth = reportMonths.length === 0 || reportMonths.includes(normalizeMonth(a.month));
          const aTeamName = resolveTeamName(a.teamId, a.teamName);
          const matchTeam = reportTeam === 'all' || aTeamName === reportTeam;
          return matchProject && matchMonth && matchTeam;
        })
        .reduce((acc, curr) => {
          const val = curr.status === 'ÄÃ£ nghiá»‡m thu' ? (curr.afterAcceptanceCost || 0) : 0;
          return acc + val;
        }, 0);
      
      const bTotal = projBudgets.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      
      const pRevenue = efficiencyReports
        .filter(r => {
          const matchProject = r.projectId === p.id;
          const rTeamName = resolveTeamName(r.teamId, r.teamName);
          const matchTeam = reportTeam === 'all' || rTeamName === reportTeam;
          const matchMonth = reportMonths.length === 0 || reportMonths.includes(r.month);
          return matchProject && matchTeam && matchMonth;
        })
        .reduce((acc, curr) => acc + (curr.revenue || 0), 0);
      
      return {
        name: p.name,
        budget: bTotal,
        actual: projActual,
        revenue: pRevenue
      };
    }).filter(d => d.budget > 0 || d.actual > 0).sort((a,b) => b.actual - a.actual);
  }, [projects, budgets, acceptances, efficiencyReports, reportMonths, reportProject, reportTeam, resolveTeamName, isReportsActive, activeTab]);

  const regionChartData = useMemo(() => {
    if (!isReportsActive) return [];
    return regions.filter(reg => reportRegion === 'all' || reg.name === reportRegion).map(reg => {
      const regBudgets = budgets.filter(b => {
        const project = projects.find(p => p.id === b.projectId);
        const bTeamName = resolveTeamName(b.teamId, b.teamName);
        const matchMonth = reportMonths.length === 0 || reportMonths.includes(b.month);
        const matchProject = reportProject === 'all' || b.projectId === reportProject;
        const matchTeam = reportTeam === 'all' || bTeamName === reportTeam;
        const matchType = reportType === 'all' || (project?.type === reportType);
        
        return (project?.region === reg.name) && matchMonth && matchProject && matchTeam && matchType;
      });
      
      const regActual = acceptances
        .filter(a => {
          const project = projects.find(p => p.id === a.projectId);
          const aTeamName = resolveTeamName(a.teamId, a.teamName);
          const matchMonth = reportMonths.length === 0 || reportMonths.includes(normalizeMonth(a.month));
          const matchProject = reportProject === 'all' || a.projectId === reportProject;
          const matchTeam = reportTeam === 'all' || aTeamName === reportTeam;
          const matchType = reportType === 'all' || (project?.type === reportType);
          
          return (project?.region === reg.name) && matchMonth && matchProject && matchTeam && matchType;
        })
        .reduce((acc, curr) => {
          const val = curr.status === 'ÄÃ£ nghiá»‡m thu' ? (curr.afterAcceptanceCost || 0) : 0;
          return acc + val;
        }, 0);
      
      const bTotal = regBudgets.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      
      const regRevenue = efficiencyReports
        .filter(r => {
          const project = projects.find(p => p.id === r.projectId);
          const rTeamName = resolveTeamName(r.teamId, r.teamName);
          const matchMonth = reportMonths.length === 0 || reportMonths.includes(r.month);
          const matchProject = reportProject === 'all' || r.projectId === reportProject;
          const matchTeam = reportTeam === 'all' || rTeamName === reportTeam;
          
          return (project?.region === reg.name) && matchMonth && matchProject && matchTeam;
        })
        .reduce((acc, curr) => acc + (curr.revenue || 0), 0);

      return {
        name: reg.name,
        budget: bTotal,
        actual: regActual,
        revenue: regRevenue
      };
    }).filter(d => d.budget > 0 || d.actual > 0);
  }, [regions, projects, budgets, acceptances, efficiencyReports, reportMonths, resolveTeamName, reportRegion, reportProject, reportTeam, reportType, resolveProjectName, isReportsActive, activeTab]);

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoringData, setIsRestoringData] = useState(false);
  const [isRestoreBudgetsDialogOpen, setIsRestoreBudgetsDialogOpen] = useState(false);
  const [isRestoreCheckpointDialogOpen, setIsRestoreCheckpointDialogOpen] = useState(false);

  const handleUpdateCost = async (id: string, data: any) => {
    try {
      const docRef = doc(db, 'costs', id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
        editHistory: arrayUnion({
          action: 'UPDATE_COST',
          editorName: userProfile?.fullName || user?.displayName || 'Unknown',
          editorEmail: user?.email,
          timestamp: new Date().toISOString(),
          changes: data
        })
      });
      await logAction('UPDATE_COST', 'costs', id, data);
      toast.success('ÄÃ£ cáº­p nháº­t chi phÃ­');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `costs/${id}`);
    }
  };

  const handleOpenMktReportDialog = (cost: any) => {
    setSelectedCostForMkt(cost);
    const report = cost.mktReport || {};
    setMktTotalLeads(report.totalLeads ? report.totalLeads.toString() : '');
    setMktContactedLeads(report.contactedLeads ? report.contactedLeads.toString() : '');
    setMktUnconvertedLeads(report.unconvertedLeads ? report.unconvertedLeads.toString() : '');
    setMktUnconvertedReason(report.unconvertedReason || '');
    setMktConvertedLeads(report.convertedLeads ? report.convertedLeads.toString() : '');
    setMktConversionRevenue(report.conversionRevenue ? report.conversionRevenue.toString() : '');
    setMktEditStartDate(report.startDate || '');
    setMktEditEndDate(report.endDate || '');
    setIsMktReportDialogOpen(true);
  };

  const handleSaveMktReport = async () => {
    if (!selectedCostForMkt) return;
    try {
      const costRef = doc(db, 'costs', selectedCostForMkt.id);
      const mktReportData = {
        totalLeads: Number(mktTotalLeads.toString().replace(/\./g, '')) || 0,
        contactedLeads: Number(mktContactedLeads.toString().replace(/\./g, '')) || 0,
        unconvertedLeads: Number(mktUnconvertedLeads.toString().replace(/\./g, '')) || 0,
        unconvertedReason: mktUnconvertedReason || '',
        convertedLeads: Number(mktConvertedLeads.toString().replace(/\./g, '')) || 0,
        conversionRevenue: Number(mktConversionRevenue.toString().replace(/\./g, '')) || 0,
        startDate: mktEditStartDate || '',
        endDate: mktEditEndDate || ''
      };

      await updateDoc(costRef, {
        mktReport: mktReportData,
        updatedAt: serverTimestamp(),
        editHistory: arrayUnion({
          action: 'UPDATE_MKT_REPORT',
          editorName: userProfile?.fullName || user?.displayName || 'Unknown',
          editorEmail: user?.email,
          timestamp: new Date().toISOString(),
          changes: {
            mktReport: mktReportData
          }
        })
      });

      toast.success('ÄÃ£ cáº­p nháº­t BÃ¡o cÃ¡o Hiá»‡u quáº£ MKT');
      setIsMktReportDialogOpen(false);
      setSelectedCostForMkt(null);
      await logAction('UPDATE_MKT_REPORT', 'costs', selectedCostForMkt.id, mktReportData);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `costs/${selectedCostForMkt.id}`);
    }
  };
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
      const normalizedBMonth = normalizeMonth(b.month);
      if (normalizedBMonth === currentMonth) {
        const pName = resolveProjectName(b.projectId, b.projectName);
        projectBudgets[pName] = (projectBudgets[pName] || 0) + b.amount;
      }
    });
    
    // Use acceptance data for real costs
    acceptances.forEach(a => {
      const aMonth = normalizeMonth(a.month);
      if (aMonth === currentMonth) {
        const pName = resolveProjectName(a.projectId, a.projectName);
        const costValue = a.status === 'ÄÃ£ nghiá»‡m thu' ? (a.afterAcceptanceCost || 0) : 0;
        projectCosts[pName] = (projectCosts[pName] || 0) + costValue;
      }
    });

    const overLimitNames = new Set<string>();
    Object.entries(projectBudgets).forEach(([pName, budget]) => {
      if ((projectCosts[pName] || 0) > budget) {
        overLimitNames.add(pName);
      }
    });

    const overLimitIds = new Set<string>();
    overLimitNames.forEach(name => {
      const foundId = Object.keys(dataDrivenProjectMap).find(id => dataDrivenProjectMap[id] === name);
      if (foundId) overLimitIds.add(foundId);
      else overLimitIds.add(name);
    });

    return overLimitIds;
  }, [budgets, latestCostsList, getMarketingMonth, dataDrivenProjectMap, resolveProjectName]);

  const chartData = useMemo(() => {
    return uniqueTeams.filter(t => reportTeam === 'all' || t === reportTeam).map(team => {
      const teamBudgets = budgets.filter(b => {
        const project = projects.find(p => p.id === b.projectId);
        const matchProject = reportProject === 'all' || b.projectId === reportProject;
        const matchMonth = reportMonths.length === 0 || reportMonths.includes(b.month);
        const matchRegion = reportRegion === 'all' || (project?.region === reportRegion);
        const matchType = reportType === 'all' || (project?.type === reportType);
        const bTeamName = resolveTeamName(b.teamId, b.teamName);
        return matchProject && bTeamName === team && matchMonth && matchRegion && matchType;
      });
      
      let teamTotalBudget = teamBudgets.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      if (chartTimeType === 'week' && reportWeek !== 'all') teamTotalBudget = teamTotalBudget / 4;

      const teamProjectDetails = projects.map(p => {
        const pBudgets = teamBudgets.filter(b => b.projectId === p.id);
        
        const pAcceptanceTotal = acceptances
          .filter(a => {
            const matchProject = a.projectId === p.id;
            const matchMonth = reportMonths.length === 0 || reportMonths.includes(normalizeMonth(a.month));
            const aTeamName = resolveTeamName(a.teamId, a.teamName);
            return matchProject && aTeamName === team && matchMonth;
          })
          .reduce((acc, curr) => {
            const val = curr.status === 'ÄÃ£ nghiá»‡m thu' ? (curr.afterAcceptanceCost || 0) : 0;
            return acc + val;
          }, 0);

        let pTotalBudget = pBudgets.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        if (chartTimeType === 'week' && reportWeek !== 'all') pTotalBudget = pTotalBudget / 4;

        let pRevenue = efficiencyReports
          .filter(r => r.projectId === p.id && resolveTeamName(r.teamId, r.teamName) === team && (reportMonths.length === 0 || reportMonths.includes(r.month)))
          .reduce((acc, curr) => acc + (curr.revenue || 0), 0);

        if (chartTimeType === 'week' && reportWeek !== 'all') pRevenue = pRevenue / 4;

        return {
          name: p.name,
          budget: pTotalBudget,
          actual: pAcceptanceTotal,
          revenue: pRevenue
        };
      }).filter(d => d.budget > 0 || d.actual > 0)
        .sort((a, b) => (b[reportSortBy] || 0) - (a[reportSortBy] || 0));

      const teamTotalCost = teamProjectDetails.reduce((sum, d) => sum + d.actual, 0);
      const teamRevenue = teamProjectDetails.reduce((sum, d) => sum + d.revenue, 0);
      
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
  }, [uniqueTeams, budgets, acceptances, reportTeam, reportProject, reportMonths, reportRegion, reportType, projects, chartTimeType, reportWeek, getMarketingMonth, reportSortBy, teamMap, efficiencyReports, resolveTeamName, resolveProjectName]);

  const efficiencyChartData = useMemo(() => {
    if (!isReportsActive) return [];
    const rawData: { [key: string]: { [detailKey: string]: { budget: number, cost: number, revenue: number, sales: number } } } = {};

    const getTarget = (mainKey: string, detailKey: string) => {
      if (!mainKey || !detailKey) return null;
      if (!rawData[mainKey]) rawData[mainKey] = {};
      if (!rawData[mainKey][detailKey]) rawData[mainKey][detailKey] = { budget: 0, cost: 0, revenue: 0, sales: 0 };
      return rawData[mainKey][detailKey];
    };

    budgets.forEach(b => {
      if (reportMonths.length > 0 && !reportMonths.includes(b.month)) return;
      
      const bProjectName = resolveProjectName(b.projectId, b.projectName);
      const bTeamName = resolveTeamName(b.teamId, b.teamName);

      if (reportProject !== 'all' && b.projectId !== reportProject && bProjectName !== projectMap[reportProject]) return;
      if (reportTeam !== 'all' && bTeamName !== reportTeam) return;

      const bProject = projects.find(p => p.id === b.projectId || p.name === bProjectName);
      if (reportRegion !== 'all' && (bProject?.region || 'KhÃ¡c') !== reportRegion) return;
      if (reportType !== 'all' && (bProject?.type || 'KhÃ¡c') !== reportType) return;
      
      const bRegion = bProject?.region || 'KhÃ¡c';
      const bTeamIdOrName = bTeamName;
      
      let mainKey, detailKey;
      if (efficiencyGroupType === 'project') {
        mainKey = bProjectName;
        detailKey = bTeamIdOrName;
      } else if (efficiencyGroupType === 'region') {
        mainKey = bRegion;
        detailKey = bProjectName;
      } else {
        mainKey = bTeamIdOrName;
        detailKey = bProjectName;
      }
      
      const target = getTarget(mainKey, detailKey);
      if (target) {
        let amount = b.amount || 0;
        if (chartTimeType === 'week' && reportWeek !== 'all') {
          amount = amount / 4;
        }
        target.budget += amount;
      }
    });

    acceptances.forEach(a => {
      const normalizedAMonth = normalizeMonth(a.month);
      if (reportMonths.length > 0 && !reportMonths.includes(normalizedAMonth)) return;
      
      const aProjectName = resolveProjectName(a.projectId, a.projectName);
      const aTeamName = resolveTeamName(a.teamId, a.teamName);

      if (reportProject !== 'all' && a.projectId !== reportProject && aProjectName !== projectMap[reportProject]) return;
      if (reportTeam !== 'all' && aTeamName !== reportTeam) return;

      const aProject = projects.find(p => p.id === a.projectId || p.name === aProjectName);
      if (reportRegion !== 'all' && (aProject?.region || 'KhÃ¡c') !== reportRegion) return;
      if (reportType !== 'all' && (aProject?.type || 'KhÃ¡c') !== reportType) return;
      
      const aRegion = aProject?.region || 'KhÃ¡c';
      const aTeamIdOrName = aTeamName;
      
      let mainKey, detailKey;
      if (efficiencyGroupType === 'project') {
        mainKey = aProjectName;
        detailKey = aTeamIdOrName;
      } else if (efficiencyGroupType === 'region') {
        mainKey = aRegion;
        detailKey = aProjectName;
      } else {
        mainKey = aTeamIdOrName;
        detailKey = aProjectName;
      }

      const target = getTarget(mainKey, detailKey);
      if (target) {
        const costValue = a.status === 'ÄÃ£ nghiá»‡m thu' ? (a.afterAcceptanceCost || 0) : 0;
        target.cost += costValue;
      }
    });

    // We keep costs for historical data before April 2026 if requested, 
    // but the prompt says "starting from April, take from acceptance". 
    // This usually means and standardizing the report on the new source.
    // If we need both, we'd filter costs by normalizedMonth < "2026-04".
    // For now I'll stick to the acceptance source as it's the new requirement for this report.

    efficiencyReports.forEach(r => {
      if (reportMonths.length > 0 && !reportMonths.includes(r.month)) return;
      
      const rProjectName = resolveProjectName(r.projectId, r.projectName);
      const rTeamName = resolveTeamName(r.teamId, r.teamName);

      if (reportProject !== 'all' && r.projectId !== reportProject && rProjectName !== projectMap[reportProject]) return;
      if (reportTeam !== 'all' && rTeamName !== reportTeam) return;

      const rProject = projects.find(p => p.id === r.projectId || p.name === rProjectName);
      if (reportRegion !== 'all' && (rProject?.region || 'KhÃ¡c') !== reportRegion) return;
      if (reportType !== 'all' && (rProject?.type || 'KhÃ¡c') !== reportType) return;
      
      const rRegion = rProject?.region || 'KhÃ¡c';
      const rTeamIdOrName = rTeamName;

      let mainKey, detailKey;
      if (efficiencyGroupType === 'project') {
        mainKey = rProjectName;
        detailKey = rTeamIdOrName;
      } else if (efficiencyGroupType === 'region') {
        mainKey = rRegion;
        detailKey = rProjectName;
      } else {
        mainKey = rTeamIdOrName;
        detailKey = rProjectName;
      }

      const target = getTarget(mainKey, detailKey);
      if (target) {
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
      const details = Object.keys(rawData[mainKey]).map(detailKey => {
        return {
          name: detailKey,
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
        name: mainKey,
        ...totals,
        details
      };
    }).sort((a, b) => {
      if (reportSortBy === 'budget') return b.budget - a.budget;
      if (reportSortBy === 'actual') return b.cost - a.cost;
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      return b.cost - a.cost;
    });
  }, [efficiencyReports, acceptances, budgets, reportMonths, reportProject, reportTeam, efficiencyGroupType, projectMap, projects, chartTimeType, reportWeek, getMarketingMonth, reportSortBy, reportRegion, reportType, resolveProjectName, resolveTeamName, isReportsActive, activeTab]);

  const salesGeneratingData = useMemo(() => 
    efficiencyChartData.filter(d => d.revenue > 0), [efficiencyChartData]
  );

  const noSalesData = useMemo(() => 
    efficiencyChartData.filter(d => d.revenue === 0), [efficiencyChartData]
  );

  const reportSummaryStats = useMemo(() => {
    const budget = efficiencyChartData.reduce((acc, d) => acc + d.budget, 0);
    const cost = efficiencyChartData.reduce((acc, d) => acc + d.cost, 0);
    const sales = efficiencyChartData.reduce((acc, d) => acc + d.sales, 0);
    const revenue = efficiencyChartData.reduce((acc, d) => acc + d.revenue, 0);
    
    // Calculate accurate project count based on filters including team
    const projectsWithData = new Set();
    
    // If we have a specific team filter, we need to know which projects they are in
    // Or we can just use the project IDs present in efficiencyChartData if we are grouping by project
    // But efficiencyChartData is grouped by efficiencyGroupType.
    
    // Let's use a more direct approach: find projects that match project/region/type filters 
    // AND have at least one record matching the team filter (if team is not 'all')
    const filteredProjects = projects.filter(p => {
      const matchProject = reportProject === 'all' || p.id === reportProject;
      const matchRegion = reportRegion === 'all' || p.region === reportRegion;
      const matchType = reportType === 'all' || p.type === reportType;
      
      if (!matchProject || !matchRegion || !matchType) return false;
      
      if (reportTeam !== 'all') {
        // Check if this project has any engagement with the selected team
        const hasTeamData = budgets.some(b => b.projectId === p.id && resolveTeamName(b.teamId, b.teamName) === reportTeam) ||
                           acceptances.some(a => a.projectId === p.id && resolveTeamName(a.teamId, a.teamName) === reportTeam) ||
                           efficiencyReports.some(r => r.projectId === p.id && resolveTeamName(r.teamId, r.teamName) === reportTeam);
        return hasTeamData;
      }
      
      return true;
    });

    return {
      projectCount: filteredProjects.length,
      budget,
      cost,
      sales,
      revenue
    };
  }, [efficiencyChartData, projects, reportProject, reportRegion, reportType, reportTeam, budgets, acceptances, efficiencyReports, resolveTeamName]);

  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isWebView, setIsWebView] = useState(false);
  const [showAuthHelper, setShowAuthHelper] = useState(false);

  useEffect(() => {
    if (isWebView) {
      setShowAuthHelper(true);
    }
  }, [isWebView]);

  useEffect(() => {
    const checkViewport = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);

    // Detect if opened inside Zalo or FB Messenger/In-app browser
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent || '';
      const isZaloBrowser = /Zalo/i.test(ua);
      const isFB = /FBAN|FBAV|Messenger/i.test(ua);
      const isInstagram = /Instagram/i.test(ua);
      const isOtherWebview = /WebView|iPod|iPad|iPhone|Android/i.test(ua) && ((/wv/i.test(ua) || ua.includes('Version/')) && !/Safari|Chrome/i.test(ua));
      setIsWebView(isZaloBrowser || isFB || isInstagram || isOtherWebview);
    }

    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  const getActiveTabLabel = (tab: string) => {
    switch (tab) {
      case 'home': return 'Trang chá»§';
      case 'admin': return 'Quáº£n trá»‹';
      case 'block-mgmt': return 'Quáº£n lÃ½ Khá»‘i';
      case 'team-mgmt': return 'Quáº£n lÃ½ PhÃ²ng Kinh doanh';
      case 'register': return 'ÄÄƒng kÃ½ MKT';
      case 'actual': return 'Cáº­p nháº­t Chi phÃ­';
      case 'mkt-efficiency': return 'Hiá»‡u quáº£ MKT';
      case 'history': return 'Lá»‹ch sá»­';
      case 'report-nt': return 'Nghiá»‡m thu MKT';
      case 'support': return 'Há»— trá»£';
      default: return '';
    }
  };

  const getBlockDisplayName = useCallback((block: any) => {
    if (!block) return '';
    const name = block.name || '';
    const code = block.blockCode || '';
    const isFirestoreId = /^[a-zA-Z0-9]{20}$/.test(name) || /^[a-zA-Z0-9]{20}$/.test(code);
    if (!name || isFirestoreId) {
      return code ? `Khá»‘i ${code}` : 'Khá»‘i chÆ°a Ä‘áº·t tÃªn';
    }
    return name;
  }, []);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          setIsScrolled(currentScrollY > 15);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Tá»± Ä‘á»™ng Ä‘Ã³ng menu di Ä‘á»™ng khi chuyá»ƒn Ä‘á»•i tab
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeTab]);

  const dashboardStats = useMemo(() => {
    if (activeTab === 'reports' || (activeTab === 'admin' && adminSubTab === 'reports')) {
      let monthText = 'Táº¤T Cáº¢';
      if (reportMonths.length === 1) {
        monthText = `HÃ€ Ná»˜I ${reportMonths[0].split('-')[1]}`;
      } else if (reportMonths.length > 1) {
        monthText = `${reportMonths.length} THÃNG`;
      }

      return {
        projectCount: reportSummaryStats.projectCount,
        budget: reportSummaryStats.budget,
        cost: reportSummaryStats.cost,
        sales: reportSummaryStats.sales,
        revenue: reportSummaryStats.revenue,
        isContextual: true,
        monthLabel: `(THÃNG ${monthText})`
      };
    }

    if (activeTab === 'doc-processing') {
      const budget = groupedDocProcessing.reduce((acc: number, d: any) => acc + (d.budget || 0), 0);
      const cost = groupedDocProcessing.reduce((acc: number, d: any) => acc + (d.totalAmount || 0), 0);
      const projectIds = new Set(groupedDocProcessing.map((d: any) => d.projectId));
      
      return {
        projectCount: projectIds.size,
        budget: budget || 0,
        cost: cost || 0,
        sales: 0,
        revenue: 0,
        isContextual: true,
        monthLabel: '(Trong Äá»‘i soÃ¡t)'
      };
    }

    // Default "This Month" Stats
    const currentMonth = getMarketingMonth(new Date());
    
    // NgÃ¢n sÃ¡ch thÃ¡ng nÃ y
    const budgetTotal = budgets
      .filter(b => {
        const matchMonth = b.month === currentMonth;
        if (!isAdmin && !isMod && !isAccountant && !isGDDA) {
          const userEmail = user?.email?.toLowerCase();
          const budgetEmail = b.userEmail?.toLowerCase() || b.createdByEmail?.toLowerCase();
          return matchMonth && (budgetEmail === userEmail || b.createdBy === user?.uid);
        }
        return matchMonth;
      })
      .reduce((acc, curr) => acc + curr.amount, 0);

    // Thá»±c táº¿ Ä‘Ã£ chi (ThÃ¡ng nÃ y) - Sá»­ dá»¥ng dá»¯ liá»‡u Nghiá»‡m thu
    const costTotal = acceptances
      .filter(a => {
        const matchMonth = normalizeMonth(a.month) === currentMonth;
        if (!isAdmin && !isMod && !isAccountant && !isGDDA) {
          const userEmail = user?.email?.toLowerCase();
          const aEmail = a.userEmail?.toLowerCase() || a.createdBy?.toLowerCase();
          return matchMonth && (aEmail === userEmail || a.createdByUid === user?.uid);
        }
        return matchMonth;
      })
      .reduce((acc, curr) => {
        const val = curr.status === 'ÄÃ£ nghiá»‡m thu' ? (curr.afterAcceptanceCost || 0) : 0;
        return acc + val;
      }, 0);

    // CÄƒn bÃ¡n (ThÃ¡ng nÃ y)
    const salesTotal = efficiencyReports
      .filter(r => {
        const matchMonth = r.month === currentMonth;
        if (!isAdmin && !isMod && !isAccountant && !isGDDA) {
          return matchMonth && r.createdByEmail?.toLowerCase() === user?.email?.toLowerCase();
        }
        return matchMonth;
      })
      .reduce((acc, curr) => acc + (curr.salesCount || 0), 0);

    // Doanh sá»‘ (ThÃ¡ng nÃ y)
    const revenueTotal = efficiencyReports
      .filter(r => {
        const matchMonth = r.month === currentMonth;
        if (!isAdmin && !isMod && !isAccountant && !isGDDA) {
          return matchMonth && r.createdByEmail?.toLowerCase() === user?.email?.toLowerCase();
        }
        return matchMonth;
      })
      .reduce((acc, curr) => acc + (curr.revenue || 0), 0);

    return {
      projectCount: projects.length,
      budget: budgetTotal,
      cost: costTotal,
      sales: salesTotal,
      revenue: revenueTotal,
      isContextual: false,
      monthLabel: `(THÃNG HÃ€ Ná»˜I ${currentMonth.split('-')[1]})`
    };
  }, [activeTab, adminSubTab, reportSummaryStats, projects, budgets, latestCostsList, efficiencyReports, isAdmin, isMod, isAccountant, isGDDA, user, reportMonths, getMarketingMonth]);

  const efficiencyPieData = useMemo(() => {
    const costWithSales = salesGeneratingData.reduce((acc, curr) => acc + curr.cost, 0);
    const costWithoutSales = noSalesData.reduce((acc, curr) => acc + curr.cost, 0);
    
    return [
      { name: 'PhÃ¡t sinh doanh sá»‘', value: costWithSales, color: '#10b981' },
      { name: 'KhÃ´ng phÃ¡t sinh doanh sá»‘', value: costWithoutSales, color: '#f87171' }
    ];
  }, [salesGeneratingData, noSalesData]);

  const efficiencyTrendData = useMemo(() => {
    const monthlyMap: { [key: string]: { month: string, sales: number, revenue: number, cost: number, roi: number } } = {};
    const year = reportYear || new Date().getFullYear().toString();
    for (let m = 1; m <= 12; m++) {
      const monthStr = `${year}-${m.toString().padStart(2, '0')}`;
      monthlyMap[monthStr] = { month: monthStr, sales: 0, revenue: 0, cost: 0, roi: 0 };
    }

    efficiencyReports.forEach(r => {
      if (!r.month || !r.month.startsWith(year)) return;
      const rProjectName = resolveProjectName(r.projectId, r.projectName);
      const rTeamName = resolveTeamName(r.teamId, r.teamName);
      if (reportProject !== 'all' && r.projectId !== reportProject && rProjectName !== projectMap[reportProject]) return;
      if (reportTeam !== 'all' && rTeamName !== reportTeam) return;
      if (monthlyMap[r.month]) {
        monthlyMap[r.month].sales += r.salesCount || 0;
        monthlyMap[r.month].revenue += r.revenue || 0;
      }
    });

    acceptances.forEach(a => {
      const aMonth = normalizeMonth(a.month);
      if (!aMonth || !aMonth.startsWith(year)) return;
      
      const aProjectName = resolveProjectName(a.projectId, a.projectName);
      const aTeamName = resolveTeamName(a.teamId, a.teamName);
      
      if (reportProject !== 'all' && a.projectId !== reportProject && aProjectName !== projectMap[reportProject]) return;
      if (reportTeam !== 'all' && aTeamName !== reportTeam) return;
      
      if (monthlyMap[aMonth]) {
        const costValue = a.status === 'ÄÃ£ nghiá»‡m thu' ? (a.afterAcceptanceCost || 0) : 0;
        monthlyMap[aMonth].cost += costValue;
      }
    });

    return Object.values(monthlyMap).map(m => ({
      ...m,
      roi: m.cost > 0 ? (m.revenue / m.cost) : 0
    }));
  }, [efficiencyReports, latestCostsList, reportYear, reportProject, reportTeam, getMarketingMonth, projectMap, resolveProjectName, resolveTeamName]);

  const pendingSupportCount = useMemo(() => {
    return supportRequests.filter((r: any) => r.status === 'Chá» xá»­ lÃ½').length;
  }, [supportRequests]);

  const menuItems = useMemo(() => {
    return [
      { value: 'home', label: 'Trang chá»§', icon: LayoutDashboard, color: 'text-indigo-600', activeBg: 'bg-indigo-600', activeText: 'text-white font-black', visible: hasPermission('home.view'), desc: 'Tá»•ng quan bÃ¡o cÃ¡o' },
      { value: 'admin', label: 'Quáº£n trá»‹ há»‡ thá»‘ng', icon: ShieldCheck, color: 'text-rose-600', activeBg: 'bg-slate-900', activeText: 'text-white font-black', visible: (hasPermission('admin.projects.view') || hasPermission('admin.teams.view') || hasPermission('admin.budgets.view') || hasPermission('admin.costs.view') || hasPermission('admin.users.view') || hasPermission('admin.permissions.edit')), desc: 'Cáº¥u hÃ¬nh dá»± Ã¡n, ngÃ¢n sÃ¡ch, nhÃ¢n sá»±' },
      { value: 'block-mgmt', label: 'Quáº£n lÃ½ Khá»‘i', icon: Building2, color: 'text-purple-600', activeBg: 'bg-indigo-600', activeText: 'text-white font-black', visible: hasPermission('block.view') || isGDKhoi || isTroLyKhoi || isAssistant, desc: 'Äá»“ng bá»™ & giÃ¡m sÃ¡t ngÃ¢n sÃ¡ch Khá»‘i' },
      { value: 'team-mgmt', label: 'Quáº£n lÃ½ PhÃ²ng KD', icon: Users, color: 'text-teal-600', activeBg: 'bg-indigo-600', activeText: 'text-white font-black', visible: hasPermission('team_mgmt.view'), desc: 'BÃ¡o cÃ¡o tÃ­ch lÅ©y, cÃ¡c tá»• Ä‘á»™i direct' },
      { value: 'register', label: 'ÄÄƒng kÃ½ MKT', icon: Wallet, color: 'text-emerald-600', activeBg: 'bg-indigo-600', activeText: 'text-white font-black', visible: hasPermission('register.view'), desc: 'Láº­p káº¿ hoáº¡ch phÃ¢n bá»• chi phÃ­ thÃ¡ng' },
      { value: 'history', label: 'Lá»‹ch sá»­ dÃ²ng tiá»n', icon: History, color: 'text-slate-600', activeBg: 'bg-indigo-600', activeText: 'text-white font-black', visible: hasPermission('history.view'), desc: 'Tra cá»©u lá»‹ch sá»­ thu chi minh báº¡ch' },
      { value: 'report-nt', label: 'Nghiá»‡m thu MKT', icon: FileCheck, color: 'text-indigo-600', activeBg: 'bg-indigo-600', activeText: 'text-white font-black', visible: hasPermission('report_nt.view'), desc: 'Nghiá»‡m thu MKT tá»± Ä‘á»™ng láº¥y tá»« Google Sheet' },
      { value: 'support', label: 'Há»— trá»£ ká»¹ thuáº­t', icon: MessageCircle, color: 'text-blue-500', activeBg: 'bg-indigo-600', activeText: 'text-white font-black', visible: hasPermission('support.create') || hasPermission('support.resolve'), badge: pendingSupportCount, desc: 'YÃªu cáº§u há»— trá»£, pháº£n há»“i sá»± cá»‘' },
      { value: 'process-mkt', label: 'Quy trÃ¬nh MKT', icon: FileText, color: 'text-amber-500', activeBg: 'bg-indigo-600', activeText: 'text-white font-black', visible: hasPermission('process_mkt.create'), desc: 'Quáº£n lÃ½ quy trÃ¬nh chiáº¿n dá»‹ch Marketing' },
      { value: 'process-doiung', label: 'Quy trÃ¬nh Ä‘á»‘i á»©ng', icon: RefreshCw, color: 'text-violet-500', activeBg: 'bg-indigo-600', activeText: 'text-white font-black', visible: hasPermission('process_doiung.create'), desc: 'Quáº£n lÃ½ Ä‘á»‘i á»©ng & bÃ n giao' },
    ].filter(item => item.visible);
  }, [hasPermission, isGDKhoi, isTroLyKhoi, isAssistant, pendingSupportCount]);

  const adminFilteredBudgets = useMemo(() => {
    const getTime = (item: any) => {
      if (item.createdAt?.toDate) return item.createdAt.toDate().getTime();
      if (item.createdAt?.toMillis) return item.createdAt.toMillis();
      if (item.createdAt) return new Date(item.createdAt).getTime();
      if (item.updatedAt?.toDate) return item.updatedAt.toDate().getTime();
      if (item.updatedAt?.toMillis) return item.updatedAt.toMillis();
      if (item.updatedAt) return new Date(item.updatedAt).getTime();
      return 0;
    };

    // Helper to get or synthesize initial history for a budget record
    const getBudgetHistory = (b: any) => {
      if (b.editHistory && Array.isArray(b.editHistory) && b.editHistory.length > 0) {
        return b.editHistory;
      }
      const bAmt = Number(b.amount || 0);
      const editor = b.implementerName || b.userEmail || b.createdByEmail || 'ChÆ°a rÃµ';
      const timeStr = b.createdAt?.toDate ? b.createdAt.toDate().toISOString() : (b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString());
      return [{
        action: 'REGISTER',
        editorName: editor,
        editorEmail: b.userEmail || b.createdByEmail || '',
        timestamp: timeStr,
        amount: bAmt,
        note: `ÄÄƒng kÃ½ ngÃ¢n sÃ¡ch ban Ä‘áº§u: ${bAmt.toLocaleString()}Ä‘`
      }];
    };

    // Group budgets by (projectId, teamId, month) and sum amounts for duplicate project entries of a team
    const latestBudgetsMap = new Map<string, any>();
    budgets.forEach(b => {
      const projName = resolveProjectName(b.projectId, b.projectName) || projectMap[b.projectId] || b.projectName || b.projectId || '';
      const teamNameStr = resolveTeamName(b.teamId, b.teamName) || teamMap[b.teamId] || b.teamName || b.teamId || '';
      const pKey = projName.trim().toLowerCase();
      const tKey = normalizeTeamName(teamNameStr).trim().toLowerCase();
      const mKey = normalizeMonth(b.month || '');
      const key = `${pKey}_${tKey}_${mKey}`;

      const existing = latestBudgetsMap.get(key);
      const bAmount = Number(b.amount || 0);
      const bHist = getBudgetHistory(b);

      if (!existing) {
        latestBudgetsMap.set(key, { 
          ...b, 
          amount: bAmount,
          projectName: projName,
          teamName: teamNameStr,
          month: mKey,
          editHistory: bHist
        });
      } else {
        // Keep the latest item metadata, but SUM amounts & COMBINE history of duplicate records for the same team + project + month
        const baseItem = getTime(b) > getTime(existing) ? { ...b } : { ...existing };
        const combinedHist = [...(existing.editHistory || []), ...bHist];
        combinedHist.sort((x: any, y: any) => new Date(x.timestamp || 0).getTime() - new Date(y.timestamp || 0).getTime());

        latestBudgetsMap.set(key, {
          ...baseItem,
          amount: Number(existing.amount || 0) + bAmount,
          projectName: projName,
          teamName: teamNameStr,
          month: mKey,
          editHistory: combinedHist
        });
      }
    });

    const uniqueBudgets = Array.from(latestBudgetsMap.values());

    const filtered = uniqueBudgets.filter(b => {
      const bTeamName = resolveTeamName(b.teamId, b.teamName) || teamMap[b.teamId] || b.teamName || '';
      const bProjName = resolveProjectName(b.projectId, b.projectName) || projectMap[b.projectId] || b.projectName || '';
      const matchesSearch = 
        bProjName.toLowerCase().includes(debouncedAdminBudgetSearch.toLowerCase()) ||
        bTeamName.toLowerCase().includes(debouncedAdminBudgetSearch.toLowerCase()) ||
        (b.implementerName || '').toLowerCase().includes(debouncedAdminBudgetSearch.toLowerCase());
      const matchesMonth = !adminBudgetMonthFilter || normalizeMonth(b.month) === normalizeMonth(adminBudgetMonthFilter);
      return matchesSearch && matchesMonth;
    });

    return filtered.sort((a, b) => {
      const factor = adminBudgetSort.direction === 'asc' ? 1 : -1;

      switch (adminBudgetSort.key) {
        case 'project': {
          const pA = (projectMap[a.projectId] || a.projectName || '').toLowerCase();
          const pB = (projectMap[b.projectId] || b.projectName || '').toLowerCase();
          return pA.localeCompare(pB, 'vi') * factor;
        }
        case 'team': {
          const tA = (teamMap[a.teamId] || a.teamName || '').toLowerCase();
          const tB = (teamMap[b.teamId] || b.teamName || '').toLowerCase();
          return tA.localeCompare(tB, 'vi') * factor;
        }
        case 'teamCode': {
          const tcA = (teams.find((t: any) => t.id === a.teamId || t.name === (teamMap[a.teamId] || a.teamName))?.teamCode || '').toLowerCase();
          const tcB = (teams.find((t: any) => t.id === b.teamId || t.name === (teamMap[b.teamId] || b.teamName))?.teamCode || '').toLowerCase();
          return tcA.localeCompare(tcB, 'vi') * factor;
        }
        case 'gdkd': {
          const gA = extractGDKD(teamMap[a.teamId] || a.teamName || '').toLowerCase();
          const gB = extractGDKD(teamMap[b.teamId] || b.teamName || '').toLowerCase();
          return gA.localeCompare(gB, 'vi') * factor;
        }
        case 'implementer': {
          const iA = (a.implementerName || '').toLowerCase();
          const iB = (b.implementerName || '').toLowerCase();
          return iA.localeCompare(iB, 'vi') * factor;
        }
        case 'month': {
          const mA = `${a.month || ''}-W${a.weekNumber || 0}`;
          const mB = `${b.month || ''}-W${b.weekNumber || 0}`;
          return mA.localeCompare(mB) * factor;
        }
        case 'amount': {
          return ((a.amount || 0) - (b.amount || 0)) * factor;
        }
        case 'baoCaoNT': {
          const valA = baoCaoNTMap[a.id] || 0;
          const valB = baoCaoNTMap[b.id] || 0;
          return (valA - valB) * factor;
        }
        case 'rate': {
          const rateA = a.amount > 0 ? ((baoCaoNTMap[a.id] || 0) / a.amount) : 0;
          const rateB = b.amount > 0 ? ((baoCaoNTMap[b.id] || 0) / b.amount) : 0;
          return (rateA - rateB) * factor;
        }
        case 'createdAt':
        default: {
          const getTime = (item: any) => {
            if (item.createdAt?.toDate) return item.createdAt.toDate().getTime();
            if (item.createdAt?.toMillis) return item.createdAt.toMillis();
            if (item.createdAt) return new Date(item.createdAt).getTime();
            return 0;
          };
          return (getTime(a) - getTime(b)) * factor;
        }
      }
    });
  }, [budgets, debouncedAdminBudgetSearch, adminBudgetMonthFilter, projectMap, teamMap, teams, baoCaoNTMap, adminBudgetSort]);

  const paginatedAdminFilteredBudgets = useMemo(() => {
    const start = (budgetPage - 1) * 20;
    return (adminFilteredBudgets || []).slice(start, start + 20);
  }, [adminFilteredBudgets, budgetPage]);

  const unbudgetedAcceptances = useMemo(() => {
    const isBudgetsViewActive = activeTab === 'budgets' || (activeTab === 'admin' && (adminSubTab === 'budgets' || adminSubTab === 'unbudgeted'));
    if (!isBudgetsViewActive) return [];
    // 1. Map registered budget amounts by (teamKey, projectKey, monthKey)
    const budgetAmountsMap: Record<string, number> = {};

    budgets.forEach(b => {
      const bTeamName = resolveTeamName(b.teamId, b.teamName) || teamMap[b.teamId] || b.teamName || '';
      const bProjName = resolveProjectName(b.projectId, b.projectName) || projectMap[b.projectId] || b.projectName || '';
      const tKey = normalizeTeamName(bTeamName).trim().toLowerCase();
      const pKey = bProjName.trim().toLowerCase();
      const mKey = normalizeMonth(b.month || '');

      if (tKey && pKey && mKey) {
        const key = `${tKey}|${pKey}|${mKey}`;
        budgetAmountsMap[key] = (budgetAmountsMap[key] || 0) + (Number(b.amount) || 0);
      }
    });

    // 2. Group acceptances by (teamKey, projectKey, monthKey)
    const acceptanceGroups: Record<string, {
      teamId?: string;
      teamName: string;
      teamCode?: string;
      projectId?: string;
      projectName: string;
      month: string;
      acceptanceCost: number;
      count: number;
    }> = {};

    // Combine acceptances and finalAcceptances cleanly without duplicate IDs
    const allAcceptancesList: any[] = [];
    const seenIds = new Set<string>();
    (acceptances || []).forEach(a => {
      if (a && a.id && !seenIds.has(a.id)) {
        seenIds.add(a.id);
        allAcceptancesList.push(a);
      }
    });
    (finalAcceptances || []).forEach(fa => {
      if (fa && fa.id && !seenIds.has(fa.id)) {
        seenIds.add(fa.id);
        allAcceptancesList.push(fa);
      }
    });

    allAcceptancesList.forEach(a => {
      const aTeamName = resolveTeamName(a.teamId, a.teamName) || teamMap[a.teamId] || a.teamName || '';
      const aProjName = resolveProjectName(a.projectId, a.projectName) || projectMap[a.projectId] || a.projectName || '';
      const tKey = normalizeTeamName(aTeamName).trim().toLowerCase();
      const pKey = aProjName.trim().toLowerCase();
      const mKey = normalizeMonth(a.month || '');

      const costValue = getAcceptanceCostValue(a);

      if (tKey && pKey && mKey && costValue > 0) {
        const key = `${tKey}|${pKey}|${mKey}`;
        const teamObj = teams.find((t: any) => t.id === a.teamId || normalizeTeamName(t.name).toLowerCase() === tKey);
        const resolvedTeamName = teamObj?.name || aTeamName || tKey.toUpperCase();
        const resolvedTeamCode = teamObj?.teamCode || a.teamCode || normalizeTeamCode(extractTeamCode(resolvedTeamName));

        if (!acceptanceGroups[key]) {
          acceptanceGroups[key] = {
            teamId: a.teamId,
            teamName: resolvedTeamName,
            teamCode: resolvedTeamCode,
            projectId: a.projectId,
            projectName: aProjName || pKey.toUpperCase(),
            month: mKey,
            acceptanceCost: 0,
            count: 0
          };
        }
        acceptanceGroups[key].acceptanceCost += costValue;
        acceptanceGroups[key].count += 1;
      }
    });

    // 3. Filter groups where acceptanceCost > 0 but registered budget <= 0
    const result: Array<{
      id: string;
      teamId?: string;
      teamName: string;
      teamCode?: string;
      projectId?: string;
      projectName: string;
      month: string;
      acceptanceCost: number;
      budgetAmount: number;
      count: number;
    }> = [];

    Object.entries(acceptanceGroups).forEach(([key, item]) => {
      const budgetAmt = budgetAmountsMap[key] || 0;
      if (budgetAmt <= 0) {
        result.push({
          id: key,
          ...item,
          budgetAmount: budgetAmt
        });
      }
    });

    // Sort by month desc, then projectName asc, then teamName asc
    result.sort((a, b) => {
      if (b.month !== a.month) return b.month.localeCompare(a.month);
      if (a.projectName !== b.projectName) return a.projectName.localeCompare(b.projectName, 'vi');
      return a.teamName.localeCompare(b.teamName, 'vi');
    });

    return result;
  }, [acceptances, budgets, resolveTeamName, resolveProjectName, teamMap, projectMap, teams]);

  const filteredUnbudgetedAcceptances = useMemo(() => {
    const q = (debouncedAdminBudgetSearch || '').toLowerCase().trim();
    return unbudgetedAcceptances.filter(item => {
      const matchesSearch = 
        !q ||
        (item.projectName || '').toLowerCase().includes(q) ||
        (item.teamName || '').toLowerCase().includes(q) ||
        (item.teamCode || '').toLowerCase().includes(q) ||
        extractGDKD(item.teamName || '').toLowerCase().includes(q);
      
      const matchesMonth = !adminBudgetMonthFilter || normalizeMonth(item.month) === normalizeMonth(adminBudgetMonthFilter);
      return matchesSearch && matchesMonth;
    });
  }, [unbudgetedAcceptances, debouncedAdminBudgetSearch, adminBudgetMonthFilter]);

  const paginatedUnbudgetedAcceptances = useMemo(() => {
    const start = (unbudgetedPage - 1) * 20;
    return (filteredUnbudgetedAcceptances || []).slice(start, start + 20);
  }, [filteredUnbudgetedAcceptances, unbudgetedPage]);

  const adminFilteredCosts = useMemo(() => {
    return costs
      .filter(c => {
        const matchesSearch = 
          (projectMap[c.projectId] || c.projectName || '').toLowerCase().includes(debouncedAdminCostSearch.toLowerCase()) ||
          (teamMap[c.teamId] || c.teamName || '').toLowerCase().includes(debouncedAdminCostSearch.toLowerCase()) ||
          (c.implementerName || '').toLowerCase().includes(debouncedAdminCostSearch.toLowerCase());
        
        const costDate = c.createdAt?.toDate ? c.createdAt.toDate() : null;
        const matchesMonth = !adminCostMonthFilter || (costDate && getMarketingMonth(costDate) === adminCostMonthFilter);
        
        return matchesSearch && matchesMonth;
      })
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return dateB - dateA;
      });
  }, [costs, debouncedAdminCostSearch, adminCostMonthFilter, projectMap, teamMap, getMarketingMonth]);

  const paginatedAdminFilteredCosts = useMemo(() => {
    const start = (costPage - 1) * 20;
    return (adminFilteredCosts || []).slice(start, start + 20);
  }, [adminFilteredCosts, costPage]);

  const isProjectKey = useCallback((key: string) => {
    const k = key.toLowerCase();
    return k.includes('dá»± Ã¡n') || k.includes('project') || k.includes('tÃªn');
  }, []);

  const isMoneyKey = useCallback((key: string) => {
    const k = key.toLowerCase();
    return k.includes('tiá»n') || k.includes('vnÄ‘') || k.includes('vnd') || k.includes('chi') || k.includes('lÆ°á»£ng') || k.includes('giÃ¡') || k.includes('cost') || k.includes('budget') || k.includes('amount');
  }, []);

  const formatNTValue = useCallback((val: any) => {
    if (val === undefined || val === null) return '-';
    const strVal = String(val).trim();
    if (!strVal) return '-';

    const cleanStr = strVal.replace(/\s+/g, '');
    
    if (/^-?\d+$/.test(cleanStr)) {
      return cleanStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    } else if (/^-?\d+\.\d+$/.test(cleanStr)) {
      const parts = cleanStr.split('.');
      const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      return `${integerPart},${parts[1]}`;
    } else if (/^-?\d+,\d+$/.test(cleanStr)) {
      const parts = cleanStr.split(',');
      const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      return `${integerPart},${parts[1]}`;
    }

    let formattedStr = strVal;
    formattedStr = formattedStr.replace(/\b\d{4,}\b/g, (match) => {
      return match.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    });

    return formattedStr;
  }, []);

  const handleToggleSortNT = (headerKey: string) => {
    if (ntSortField !== headerKey) {
      setNtSortField(headerKey);
      setNtSortDirection('asc');
    } else if (ntSortDirection === 'asc') {
      setNtSortDirection('desc');
    } else if (ntSortDirection === 'desc') {
      setNtSortDirection('none');
      setNtSortField(null);
    } else {
      setNtSortField(headerKey);
      setNtSortDirection('asc');
    }
  };

  const filteredNTRecords = useMemo(() => {
    if (!reportNTRecords) return [];
    
    // First, filter based on search query
    let result = [...reportNTRecords];
    if (reportNTSearch) {
      const q = reportNTSearch.toLowerCase().trim();
      result = result.filter(rec => {
        return Object.entries(rec).some(([key, val]) => {
          if (key === 'id_row') return false;
          return String(val).toLowerCase().includes(q);
        });
      });
    }

    // Next, apply sorting if fields and direction are defined
    if (ntSortField && ntSortDirection !== 'none') {
      result.sort((a, b) => {
        let valA = a[ntSortField];
        let valB = b[ntSortField];

        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';

        // If both values are numeric or represent money numbers, we should parse them cleanly
        const cleanA = String(valA).replace(/[^0-9-]/g, '').trim();
        const cleanB = String(valB).replace(/[^0-9-]/g, '').trim();
        const numA = Number(cleanA);
        const numB = Number(cleanB);

        const isNumA = cleanA !== '' && !isNaN(numA);
        const isNumB = cleanB !== '' && !isNaN(numB);

        if (isNumA && isNumB) {
          return ntSortDirection === 'asc' ? numA - numB : numB - numA;
        }

        // Fallback to Vietnamese string locale comparison
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return ntSortDirection === 'asc'
          ? strA.localeCompare(strB, 'vi', { sensitivity: 'base' })
          : strB.localeCompare(strA, 'vi', { sensitivity: 'base' });
      });
    }

    return result;
  }, [reportNTRecords, reportNTSearch, ntSortField, ntSortDirection]);

  const ntPageSize = 20;
  const totalNtPages = Math.ceil((filteredNTRecords?.length || 0) / ntPageSize) || 1;
  const paginatedNTRecords = useMemo(() => {
    if (!filteredNTRecords) return [];
    const start = (ntPage - 1) * ntPageSize;
    return filteredNTRecords.slice(start, start + ntPageSize);
  }, [filteredNTRecords, ntPage]);

  useEffect(() => {
    setNtPage(1);
  }, [reportNTSearch]);

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
            <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-none text-[8px] font-black uppercase">Hiá»‡u quáº£ ká»³ nÃ y</Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 p-3 bg-slate-50/50 rounded-2xl border border-slate-100/50">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Wallet className="w-2.5 h-2.5" /> NgÃ¢n sÃ¡ch
              </p>
              <p className="text-xs font-black text-slate-700 font-mono">{formatCurrency(data.budget)}</p>
            </div>
            <div className={`space-y-1 p-3 rounded-2xl border ${isOverBudget ? 'bg-red-50 border-red-100' : 'bg-slate-50/50 border-slate-100/50'}`}>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <TrendingUp className="w-2.5 h-2.5" /> Chi phÃ­
              </p>
              <p className={`text-xs font-black font-mono ${isOverBudget ? 'text-red-600' : 'text-slate-700'}`}>
                {formatCurrency(data.cost)}
              </p>
              {isOverBudget && <p className="text-[8px] font-bold text-red-500 italic">VÆ°á»£t {usagePercent.toFixed(0)}%</p>}
            </div>
          </div>

          <div className="p-4 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100 space-y-3">
            <div className="flex items-center justify-between border-b border-indigo-400/30 pb-2">
              <div className="space-y-0.5">
                <p className="text-[8px] font-black text-indigo-200 uppercase tracking-widest">Sáº£n lÆ°á»£ng bÃ¡n</p>
                <p className="text-lg font-black text-white leading-none">{data.sales || 0} <span className="text-[10px] font-bold opacity-80 uppercase">CÄƒn</span></p>
              </div>
              <div className="h-8 w-[1px] bg-indigo-400/30" />
              <div className="space-y-0.5 text-right">
                <p className="text-[8px] font-black text-indigo-200 uppercase tracking-widest">Doanh sá»‘</p>
                <p className="text-sm font-black text-white leading-none">{formatCurrency(data.revenue || 0)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-[8px] font-black text-indigo-100 uppercase tracking-widest opacity-80">ROI (Doanh thu/Vá»‘n)</p>
                  <p className="text-xs font-black text-white uppercase">{roi}x láº§n</p>
                </div>
              </div>
              <div className="px-3 py-1 bg-white/20 rounded-lg backdrop-blur-md">
                <p className="text-[9px] font-black text-white">{data.cost > 0 ? ((data.revenue/data.cost)*100).toFixed(0) : 0}% Lá»£i Ä‘iá»ƒm</p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
              {efficiencyGroupType === 'team' ? 'ThÃ nh pháº§n (Xáº¿p theo Doanh sá»‘)' : 'Äá»™i ngÅ© triá»ƒn khai (Xáº¿p theo Doanh sá»‘)'}
            </p>
            <div className="space-y-1 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
              {data.details.map((d: any, i: number) => (
                <div key={i} className="flex flex-col p-2.5 rounded-lg border border-slate-100 bg-slate-50/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-[10px] uppercase tracking-tight">{d.name}</span>
                    {d.sales > 0 && (
                      <Badge variant="secondary" className="h-4 text-[7px] font-black px-1.5 bg-emerald-50 text-emerald-600 border-none">{d.sales} cÄƒn</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px]">
                    <div className="flex justify-between border-r border-slate-100 pr-2">
                      <span className="text-slate-400 font-bold uppercase tracking-tighter">Doanh sá»‘:</span>
                      <span className="font-black text-emerald-600 font-mono">{formatCurrency(d.revenue)}</span>
                    </div>
                    <div className="flex justify-between pl-1">
                      <span className="text-slate-400 font-bold uppercase tracking-tighter">Chi phÃ­:</span>
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
      const budget = payload.find((p: any) => p.dataKey === 'budget' || p.name === 'NgÃ¢n sÃ¡ch')?.value || 0;
      const actual = payload.find((p: any) => p.dataKey === 'actual' || p.name === 'Chi phÃ­' || p.name === 'Thá»±c chi')?.value || 0;
      const revenue = payload.find((p: any) => p.dataKey === 'revenue' || p.name === 'Doanh sá»‘')?.value || 0;
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
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">CP/Doanh sá»‘: {costRatio}%</span>
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
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NgÃ¢n sÃ¡ch</p>
                  <p className="text-sm font-bold text-blue-600">{formatCurrency(budget)}</p>
                </div>
              )}
              <div className={`space-y-1 ${!revenue && budget ? 'text-right' : ''}`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chi phÃ­</p>
                <p className="text-sm font-bold text-emerald-600">{formatCurrency(actual)}</p>
              </div>
              {revenue > 0 && (
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Doanh sá»‘</p>
                  <p className="text-sm font-bold text-indigo-600">{formatCurrency(revenue)}</p>
                </div>
              )}
            </div>

            {details.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>{isTeamReport ? 'Chi tiáº¿t Dá»± Ã¡n' : isProjectReport ? 'Chi tiáº¿t Team' : 'Chi tiáº¿t'}</span>
                  {revenue > 0 && <span className="text-[9px] font-medium italic text-slate-400">Æ¯u tiÃªn theo doanh sá»‘</span>}
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

  // ThÃªm component footer thÃ´ng tin phÃ¡t triá»ƒn
  const DeveloperFooter = ({ className = "", isHeader = false }: { className?: string, isHeader?: boolean }) => (
    <div className={`flex flex-col items-center justify-center gap-3 text-slate-400 ${className}`}>
      <div className={`flex items-center gap-2 font-black uppercase tracking-[0.2em] ${isHeader ? 'text-[12px]' : 'text-[9px]'}`}>
        <span className="opacity-60">PhÃ¡t triá»ƒn bá»Ÿi</span>
        <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
        <span className={isHeader ? 'text-slate-800' : 'text-slate-600'}>ThiÃªn VÅ© - Digital Marketing Mayhomes</span>
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
          <span className={`font-black uppercase tracking-tight ${isHeader ? 'text-sm text-blue-700' : 'text-[10px] text-slate-600'}`}>LiÃªn há»‡ há»— trá»£ Zalo</span>
          {isHeader && <span className="text-[11px] font-bold text-blue-500/70 mt-0.5">0854.642.555</span>}
        </div>
      </a>
    </div>
  );

  const getMarketingMonthDisplayRange = (monthStr: string) => {
    if (!monthStr) return '';
    try {
      const [year, month] = monthStr.split('-').map(Number);
      // User requested: Month M ( 21/M-1 - 20/M )
      const startDate = new Date(year, month - 2, 21);
      const endDate = new Date(year, month - 1, 20);
      return `ThÃ¡ng ${month} ( ${safeFormat(startDate, 'd/M')} - ${safeFormat(endDate, 'd/M')} )`;
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
  const currentMarketingMonth = useMemo(() => getMarketingMonth(new Date()), []);
  const [budgetMonth, setBudgetMonth] = useState<string>(() => getMarketingMonth(new Date()) || '');
  
  // Search and Confirmation states
  const [projectSearch, setProjectSearch] = useState('');
  const debouncedProjectSearch = useDebounce(projectSearch, 300);
  const [teamSearch, setTeamSearch] = useState('');
  const debouncedTeamSearch = useDebounce(teamSearch, 300);
  const [adminProjectRegionFilter, setAdminProjectRegionFilter] = useState('all');
  const [adminProjectTypeFilter, setAdminProjectTypeFilter] = useState('all');
  const [budgetSearch, setBudgetSearch] = useState('');
  const debouncedBudgetSearch = useDebounce(budgetSearch, 300);
  const [isConfirmBudgetOpen, setIsConfirmBudgetOpen] = useState(false);
  const [isConfirmingMulti, setIsConfirmingMulti] = useState(false);
  
  // Recent Budget Registration List States - Defaults to current marketing period
  const [recentBudgetMonthFilter, setRecentBudgetMonthFilter] = useState<string>(() => getMarketingMonth(new Date()) || 'all');
  const [recentBudgetProjectFilter, setRecentBudgetProjectFilter] = useState<string>('all');
  const [recentBudgetRoleFilter, setRecentBudgetRoleFilter] = useState<'all' | 'created' | 'updated' | 'team'>('all');
  const [recentBudgetSearch, setRecentBudgetSearch] = useState('');
  const debouncedRecentBudgetSearch = useDebounce(recentBudgetSearch, 300);
  const [recentBudgetLimit, setRecentBudgetLimit] = useState<number | 'all'>(25);

  // Auto-default Team and Implementer from User Profile for Marketing Budget Registration
  useEffect(() => {
    if (userProfile?.fullName && (!implementerName || implementerName === '')) {
      setImplementerName(userProfile.fullName);
    }
    
    const userTeamName = userProfile?.teamName ? String(userProfile.teamName).trim() : '';
    const userTeamId = userProfile?.teamId ? String(userProfile.teamId).trim() : '';

    if (userTeamName || userTeamId) {
      const matched = teams.find(t => 
        (userTeamId && t.id === userTeamId) ||
        (userTeamName && normalizeTeamName(t.name).toLowerCase() === normalizeTeamName(userTeamName).toLowerCase()) ||
        (userTeamName && t.name.toLowerCase().trim() === userTeamName.toLowerCase()) ||
        (userTeamName && t.teamCode && t.teamCode.toLowerCase().trim() === userTeamName.toLowerCase()) ||
        (userTeamName && extractTeamCode(t.name).toLowerCase() === extractTeamCode(userTeamName).toLowerCase())
      );

      if (matched) {
        setSelectedTeamId(matched.id);
        setSelectedTeamName(matched.name);
      } else {
        if (userTeamName) setSelectedTeamName(userTeamName);
        if (userTeamId) setSelectedTeamId(userTeamId);
      }
    }
  }, [userProfile?.teamName, userProfile?.teamId, userProfile?.fullName, teams]);


  const userRelatedRecentBudgets = useMemo(() => {
    const userEmail = (user?.email || '').toLowerCase().trim();
    const currentUserId = user?.uid || '';
    const currentFullName = (userProfile?.fullName || user?.displayName || '').toLowerCase().trim();
    const currentTeamId = userProfile?.teamId || '';
    const currentTeamName = (userProfile?.teamName || '').toLowerCase().trim();

    return budgets
      .map(b => {
        const creatorEmail = (b.userEmail || b.createdByEmail || b.creatorEmail || b.assignedUserEmail || b.implementerEmail || '').toLowerCase().trim();
        const creatorName = (b.implementerName || b.creatorName || b.userName || '').toLowerCase().trim();

        const isCreator = Boolean(
          (creatorEmail && userEmail && creatorEmail === userEmail) ||
          (b.createdBy && currentUserId && b.createdBy === currentUserId) ||
          (b.assignedUserEmail && b.assignedUserEmail.toLowerCase().trim() === userEmail) ||
          (creatorName && currentFullName && creatorName === currentFullName)
        );

        let isUpdater = Boolean(
          (b.updatedBy && currentUserId && b.updatedBy === currentUserId) ||
          (b.updatedByEmail && b.updatedByEmail.toLowerCase().trim() === userEmail) ||
          (b.lastEditorEmail && b.lastEditorEmail.toLowerCase().trim() === userEmail) ||
          (b.lastEditorName && currentFullName && b.lastEditorName.toLowerCase().trim() === currentFullName)
        );

        let isSubContributor = false;
        let mySubAmount = 0;
        if (Array.isArray(b.subBudgets) && b.subBudgets.length > 0) {
          b.subBudgets.forEach((s: any) => {
            const sEmail = (s.userEmail || s.email || '').toLowerCase().trim();
            const sName = (s.userName || '').toLowerCase().trim();
            const sUid = s.userId || '';
            const match = (sEmail && userEmail && sEmail === userEmail) ||
                          (sUid && currentUserId && sUid === currentUserId) ||
                          (sName && currentFullName && sName === currentFullName);
            if (match) {
              isSubContributor = true;
              mySubAmount += Number(s.amount || 0);
            }
          });
        }

        let historyCount = 0;
        let lastHistoryItem: any = null;
        if (Array.isArray(b.editHistory) && b.editHistory.length > 0) {
          historyCount = b.editHistory.length;
          lastHistoryItem = b.editHistory[b.editHistory.length - 1];
          const hasInHistory = b.editHistory.some((h: any) => {
            const hEmail = (h.editorEmail || h.userEmail || '').toLowerCase().trim();
            const hName = (h.editorName || '').toLowerCase().trim();
            const hUid = h.userId || h.editorId || '';
            return (hEmail && userEmail && hEmail === userEmail) ||
                   (hUid && currentUserId && hUid === currentUserId) ||
                   (hName && currentFullName && hName === currentFullName);
          });
          if (hasInHistory) {
            isUpdater = true;
          }
        }

        const isTeamMember = Boolean(
          (currentTeamId && b.teamId && currentTeamId === b.teamId) ||
          (currentTeamName && b.teamName && currentTeamName === b.teamName.toLowerCase().trim())
        );

        const isAssignedGDDA = isGDDA && (
          !userProfile?.assignedProjects || 
          userProfile.assignedProjects.length === 0 || 
          userProfile.assignedProjects.includes(b.projectId)
        );

        // All users can view the budget records in this view
        const isVisible = true;

        // Effective activity timestamp for sorting
        let effectiveTime = 0;
        if (lastHistoryItem?.timestamp) {
          effectiveTime = lastHistoryItem.timestamp.toDate ? lastHistoryItem.timestamp.toDate().getTime() : new Date(lastHistoryItem.timestamp).getTime();
        } else if (b.updatedAt) {
          effectiveTime = b.updatedAt.toDate ? b.updatedAt.toDate().getTime() : new Date(b.updatedAt).getTime();
        } else if (b.createdAt) {
          effectiveTime = b.createdAt.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
        }

        return {
          ...b,
          _isCreator: isCreator,
          _isUpdater: isUpdater,
          _isSubContributor: isSubContributor,
          _isTeamMember: isTeamMember,
          _mySubAmount: mySubAmount,
          _historyCount: historyCount,
          _lastHistoryItem: lastHistoryItem,
          _effectiveTime: effectiveTime,
          _isVisible: isVisible
        };
      })
      .filter(b => b._isVisible)
      .sort((a, b) => b._effectiveTime - a._effectiveTime);
  }, [budgets, user, userProfile, isAdmin, isMod, isAccountant, isGDDA]);

  // Scoped recent budgets for the active month filter (for accurate pill count badges)
  const monthScopedRecentBudgets = useMemo(() => {
    return userRelatedRecentBudgets.filter(b => {
      if (recentBudgetMonthFilter !== 'all') {
        return normalizeMonth(b.month) === normalizeMonth(recentBudgetMonthFilter);
      }
      return true;
    });
  }, [userRelatedRecentBudgets, recentBudgetMonthFilter]);

  const filteredRecentBudgets = useMemo(() => {
    return userRelatedRecentBudgets.filter(b => {
      // 1. Month / Period Filter
      if (recentBudgetMonthFilter !== 'all') {
        if (normalizeMonth(b.month) !== normalizeMonth(recentBudgetMonthFilter)) {
          return false;
        }
      }

      // 2. Project Filter (Optional filter in recent list without needing form selection)
      if (recentBudgetProjectFilter !== 'all') {
        if (b.projectId !== recentBudgetProjectFilter) {
          return false;
        }
      }

      // 3. Role Filter
      if (recentBudgetRoleFilter === 'created' && !b._isCreator) return false;
      if (recentBudgetRoleFilter === 'updated' && !b._isUpdater) return false;
      if (recentBudgetRoleFilter === 'team' && !b._isTeamMember) return false;

      // 4. Search Filter
      if (debouncedRecentBudgetSearch.trim()) {
        const query = debouncedRecentBudgetSearch.toLowerCase().trim();
        const pName = (projectMap[b.projectId] || b.projectName || '').toLowerCase();
        const pCode = (projects.find(p => p.id === b.projectId)?.projectCode || '').toLowerCase();
        const tName = (b.teamName || teamMap[b.teamId] || '').toLowerCase();
        const tCode = (teams.find(t => t.id === b.teamId || t.name === b.teamName)?.teamCode || b.teamCode || '').toLowerCase();
        const impName = (b.implementerName || '').toLowerCase();
        const uEmail = (b.userEmail || '').toLowerCase();
        const lastEditor = (b._lastHistoryItem?.editorName || b._lastHistoryItem?.editorEmail || '').toLowerCase();
        
        const match = pName.includes(query) || pCode.includes(query) || tName.includes(query) || 
                      tCode.includes(query) || impName.includes(query) || uEmail.includes(query) || 
                      lastEditor.includes(query) || (b.month || '').includes(query);
        if (!match) return false;
      }

      return true;
    });
  }, [userRelatedRecentBudgets, recentBudgetMonthFilter, recentBudgetProjectFilter, recentBudgetRoleFilter, debouncedRecentBudgetSearch, projectMap, teamMap, projects, teams]);

  const recentAvailableBudgetMonths = useMemo(() => {
    const set = new Set<string>();
    const currentM = getMarketingMonth(new Date());
    if (currentM) set.add(normalizeMonth(currentM));
    budgets.forEach(b => {
      if (b.month) set.add(normalizeMonth(b.month));
    });
    getMonthOptions().forEach(opt => {
      if (opt.value) set.add(normalizeMonth(opt.value));
    });
    return Array.from(set).filter(Boolean).sort().reverse();
  }, [budgets]);

  const registeredProjectIdsInPeriod = useMemo(() => {
    if (!selectedTeamId || !budgetMonth) return new Set<string>();
    const set = new Set<string>();
    budgets.forEach(b => {
      if ((b.teamId === selectedTeamId || b.teamName === selectedTeamName) && normalizeMonth(b.month) === normalizeMonth(budgetMonth)) {
        set.add(b.projectId);
      }
    });
    multiBudgetItems.forEach(item => {
      if ((item.teamId === selectedTeamId || item.teamName === selectedTeamName) && normalizeMonth(item.month) === normalizeMonth(budgetMonth)) {
        set.add(item.projectId);
      }
    });
    return set;
  }, [budgets, multiBudgetItems, selectedTeamId, selectedTeamName, budgetMonth]);

  const existingBudgetForSelection = useMemo(() => {
    if (!selectedProjectId || !selectedTeamId || !budgetMonth) return null;
    return budgets.find(b => 
      b.projectId === selectedProjectId && 
      (b.teamId === selectedTeamId || b.teamName === selectedTeamName) && 
      normalizeMonth(b.month) === normalizeMonth(budgetMonth)
    ) || null;
  }, [budgets, selectedProjectId, selectedTeamId, selectedTeamName, budgetMonth]);

  const existingBudgetHistoryItems = useMemo(() => {
    if (!existingBudgetForSelection) return [];
    
    let items: any[] = [];
    
    if (existingBudgetForSelection.editHistory && Array.isArray(existingBudgetForSelection.editHistory) && existingBudgetForSelection.editHistory.length > 0) {
      items = existingBudgetForSelection.editHistory.map((h: any) => ({
        action: h.action || 'UPDATE',
        editorName: h.editorName || h.editorEmail || 'ThÃ nh viÃªn',
        editorEmail: h.editorEmail || '',
        timestamp: h.timestamp || h.createdAt || existingBudgetForSelection.updatedAt || existingBudgetForSelection.createdAt,
        amount: h.newAmount || h.newTotalAmount || h.amount || h.addedAmount || existingBudgetForSelection.amount,
        oldAmount: h.oldAmount || h.previousTotal,
        note: h.note || h.reason || (h.action === 'REGISTER' ? 'ÄÄƒng kÃ½ ngÃ¢n sÃ¡ch ban Ä‘áº§u' : 'Cáº­p nháº­t ngÃ¢n sÃ¡ch')
      }));
    } else if (existingBudgetForSelection.subBudgets && Array.isArray(existingBudgetForSelection.subBudgets) && existingBudgetForSelection.subBudgets.length > 0) {
      items = existingBudgetForSelection.subBudgets.map((s: any) => ({
        action: 'SUB_BUDGET',
        editorName: s.userName || s.userEmail || 'ThÃ nh viÃªn',
        editorEmail: s.userEmail || '',
        timestamp: s.createdAt || s.updatedAt || existingBudgetForSelection.createdAt,
        amount: s.amount,
        note: s.note || 'ÄÄƒng kÃ½ ngÃ¢n sÃ¡ch thÃ nh viÃªn'
      }));
    } else {
      const bAmt = Number(existingBudgetForSelection.amount || 0);
      const editor = existingBudgetForSelection.implementerName || existingBudgetForSelection.userEmail || 'ThÃ nh viÃªn';
      items = [{
        action: 'REGISTER',
        editorName: editor,
        editorEmail: existingBudgetForSelection.userEmail || '',
        timestamp: existingBudgetForSelection.createdAt,
        amount: bAmt,
        note: 'ÄÄƒng kÃ½ ngÃ¢n sÃ¡ch ban Ä‘áº§u'
      }];
    }
    
    return items.sort((a, b) => {
      const tA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp || 0).getTime();
      const tB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp || 0).getTime();
      return tB - tA;
    });
  }, [existingBudgetForSelection]);
  
  // Delete confirmation states
  const [isDeleteProjectDialogOpen, setIsDeleteProjectDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string, name: string } | null>(null);
  const [isDeleteTeamDialogOpen, setIsDeleteTeamDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<{ id: string, name: string } | null>(null);

  // Sorting states
  const [projectSort, setProjectSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [teamSort, setTeamSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

  const [efficiencyTableSort, setEfficiencyTableSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'revenue', direction: 'desc' });

  const [costAmount, setCostAmount] = useState('');
  const [fbAds, setFbAds] = useState('');
  const [posting, setPosting] = useState('');
  const [zaloAds, setZaloAds] = useState('');
  const [googleAds, setGoogleAds] = useState('');
  const [digitalCost, setDigitalCost] = useState('');
  const [otherCost, setOtherCost] = useState('');
  const [costNote, setCostNote] = useState('');
  const [selectedBudgetId, setSelectedBudgetId] = useState('');
  const [costWeek, setCostWeek] = useState(format(new Date(), "yyyy-'W'ww"));

  // MKT Efficiency Report states for addition form
  const [totalLeads, setTotalLeads] = useState('');
  const [contactedLeads, setContactedLeads] = useState('');
  const [unconvertedLeads, setUnconvertedLeads] = useState('');
  const [unconvertedReason, setUnconvertedReason] = useState('');
  const [convertedLeads, setConvertedLeads] = useState('');
  const [conversionRevenue, setConversionRevenue] = useState('');
  const [mktStartDate, setMktStartDate] = useState('');
  const [mktEndDate, setMktEndDate] = useState('');
  const [showMktReport, setShowMktReport] = useState(false);

  // MKT Efficiency Report states for edit dialog
  const [isMktReportDialogOpen, setIsMktReportDialogOpen] = useState(false);
  const [selectedCostForMkt, setSelectedCostForMkt] = useState<any>(null);
  const [mktTotalLeads, setMktTotalLeads] = useState('');
  const [mktContactedLeads, setMktContactedLeads] = useState('');
  const [mktUnconvertedLeads, setMktUnconvertedLeads] = useState('');
  const [mktUnconvertedReason, setMktUnconvertedReason] = useState('');
  const [mktConvertedLeads, setMktConvertedLeads] = useState('');
  const [mktConversionRevenue, setMktConversionRevenue] = useState('');
  const [mktEditStartDate, setMktEditStartDate] = useState('');
  const [mktEditEndDate, setMktEditEndDate] = useState('');

  // Edit states for Budget
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editingBudgetAmount, setEditingBudgetAmount] = useState('');
  const [editingBudgetVerifiedAmount, setEditingBudgetVerifiedAmount] = useState('');
  const [editingBudgetMonth, setEditingBudgetMonth] = useState(getMarketingMonth(new Date()));
  const [editingBudgetTeam, setEditingBudgetTeam] = useState('');
  const [editingBudgetTeamSearch, setEditingBudgetTeamSearch] = useState('');
  const [editingBudgetProject, setEditingBudgetProject] = useState('');
  const [editingBudgetImplementer, setEditingBudgetImplementer] = useState('');
  const [editingBudgetReason, setEditingBudgetReason] = useState('');
  const [isEditBudgetDialogOpen, setIsEditBudgetDialogOpen] = useState(false);

  // Adjust states for Budget
  const [adjustingBudgetId, setAdjustingBudgetId] = useState<string | null>(null);
  const [adjustingBudgetAmount, setAdjustingBudgetAmount] = useState('');
  const [adjustingBudgetReason, setAdjustingBudgetReason] = useState('');
  const [isAdjustBudgetDialogOpen, setIsAdjustBudgetDialogOpen] = useState(false);
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


  
  const formatCurrencyInput = (value: string) => {
    const number = value.replace(/\D/g, '');
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const [historyToView, setHistoryToView] = useState<any[]>([]);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [historyTargetName, setHistoryTargetName] = useState('');
  const [historyTargetRecord, setHistoryTargetRecord] = useState<any>(null);
  const [teamNotifications, setTeamNotifications] = useState<any[]>([]);
  const [isTeamNotificationDialogOpen, setIsTeamNotificationDialogOpen] = useState(false);
  const [notifFilterTab, setNotifFilterTab] = useState<'all' | 'unread' | 'my_projects'>('all');
  const [editingCostForm, setEditingCostForm] = useState({
    fbAds: '',
    posting: '',
    zaloAds: '',
    googleAds: '',
    visaCost: '',
    digitalCost: '',
    otherCost: '',
    note: ''
  });
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
  const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1hOAZtsqgCEegOrxDSnDRWso7EUpRXNi4G-kBfcNyhBg/edit?gid=0#gid=0"; // Link Google Sheet cá»§a báº¡n

  const [isSyncingLogs, setIsSyncingLogs] = useState(false);
  const [isDeletingProjects, setIsDeletingProjects] = useState(false);
  const [isMergingBudgets, setIsMergingBudgets] = useState(false);

  const handleMergeDuplicateBudgets = async (targetMonthFilter?: string) => {
    if (!isAdmin && !isMod && !isAccountant) return;
    
    setIsMergingBudgets(true);
    const filterLabel = targetMonthFilter ? `ká»³ ${targetMonthFilter}` : 'táº¥t cáº£ cÃ¡c ká»³';
    const toastId = toast.loading(`Äang xá»­ lÃ½ rÃ  soÃ¡t & gá»™p ngÃ¢n sÃ¡ch (${filterLabel})...`);
    
    try {
      const groups: Record<string, any[]> = {};
      
      budgets.forEach(b => {
        const projName = resolveProjectName(b.projectId, b.projectName) || b.projectId || '';
        const teamNameStr = resolveTeamName(b.teamId, b.teamName) || b.teamId || '';
        const pKey = projName.trim().toLowerCase();
        const tKey = normalizeTeamName(teamNameStr).trim().toLowerCase();
        const mKey = normalizeMonth(b.month || '');
        if (!pKey || !tKey || !mKey) return;
        
        // If filter month is specified, only include matching month
        if (targetMonthFilter && normalizeMonth(targetMonthFilter) !== mKey) {
          return;
        }

        const key = `${pKey}_${tKey}_${mKey}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(b);
      });
      
      let mergedCount = 0;
      let deletedCount = 0;
      let costUpdatedCount = 0;
      let subBudgetsUpdatedCount = 0;
      
      for (const key in groups) {
        const group = groups[key];
        const target = group[0];
        const others = group.slice(1);
        
        const totalAmount = group.reduce((sum, b) => sum + Number(b.amount || 0), 0);
        
        // Collect & construct subBudgets breakdown for individual user contributions
        let combinedSubBudgets: any[] = [];
        group.forEach(b => {
          if (b.subBudgets && Array.isArray(b.subBudgets) && b.subBudgets.length > 0) {
            combinedSubBudgets = [...combinedSubBudgets, ...b.subBudgets];
          } else {
            const bAmt = Number(b.amount || 0);
            const editor = b.implementerName || b.userEmail || b.createdByEmail || 'ChÆ°a rÃµ';
            const email = (b.userEmail || b.createdByEmail || '').toLowerCase();
            const timeStr = b.createdAt?.toDate ? b.createdAt.toDate().toISOString() : (b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString());
            combinedSubBudgets.push({
              id: b.id || `sub-${Math.random().toString(36).substring(2, 9)}`,
              userId: b.createdBy || b.userId || '',
              userName: editor,
              userEmail: email,
              amount: bAmt,
              note: b.note || b.description || `ÄÄƒng kÃ½ ngÃ¢n sÃ¡ch ${getMarketingMonthDisplayRange(b.month)}`,
              createdAt: timeStr
            });
          }
        });

        // Ensure subBudgets are chronologically sorted
        combinedSubBudgets.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

        // Collect all edit histories (synthesize initial registration entry if missing)
        let combinedHistory: any[] = [];
        group.forEach(b => {
          if (b.editHistory && Array.isArray(b.editHistory) && b.editHistory.length > 0) {
            combinedHistory = [...combinedHistory, ...b.editHistory];
          } else {
            const bAmt = Number(b.amount || 0);
            const editor = b.implementerName || b.userEmail || b.createdByEmail || 'Há»‡ thá»‘ng';
            const timeStr = b.createdAt?.toDate ? b.createdAt.toDate().toISOString() : (b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString());
            combinedHistory.push({
              action: 'REGISTER',
              editorName: editor,
              editorEmail: b.userEmail || b.createdByEmail || '',
              timestamp: timeStr,
              amount: bAmt,
              note: `ÄÄƒng kÃ½ ngÃ¢n sÃ¡ch ban Ä‘áº§u: ${bAmt.toLocaleString()}Ä‘ (${resolveProjectName(b.projectId, b.projectName)} - ${resolveTeamName(b.teamId, b.teamName)})`
            });
          }
        });

        if (group.length > 1) {
          // Add a merge entry
          combinedHistory.push({
            action: 'MERGE_CONSOLIDATE',
            editorName: userProfile?.fullName || user?.displayName || 'SYSTEM',
            editorEmail: user?.email || 'system@ais.dev',
            timestamp: new Date().toISOString(),
            mergedCount: group.length,
            userCount: combinedSubBudgets.length,
            mergedIds: others.map(o => o.id),
            previousTotal: target.amount || 0,
            addedAmount: totalAmount - (target.amount || 0),
            newTotal: totalAmount,
            note: `Gá»™p ${group.length} báº£n ghi Ä‘Äƒng kÃ½ cá»§a cÃ¡c thÃ nh viÃªn thÃ nh 1 ngÃ¢n sÃ¡ch tá»•ng cho Äá»™i (${resolveTeamName(target.teamId, target.teamName)} - ${resolveProjectName(target.projectId, target.projectName)})`
          });
        }
        
        // Sort history by timestamp
        combinedHistory.sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime());
        
        if (group.length > 1 || !target.subBudgets || target.subBudgets.length === 0) {
          const batch = writeBatch(db);
          
          // Update target
          batch.update(doc(db, 'budgets', target.id), {
            amount: totalAmount,
            subBudgets: combinedSubBudgets,
            editHistory: combinedHistory,
            updatedAt: serverTimestamp()
          });
          subBudgetsUpdatedCount++;
          
          if (group.length > 1) {
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
            mergedCount++;
          }
          
          await batch.commit();
        }
      }
      
      if (mergedCount > 0 || subBudgetsUpdatedCount > 0) {
        toast.success(`ÄÃ£ rÃ  soÃ¡t & gá»™p thÃ nh cÃ´ng ${filterLabel}: ÄÃ£ gá»™p ${mergedCount} nhÃ³m ngÃ¢n sÃ¡ch trÃ¹ng, chuáº©n hÃ³a chi tiáº¿t cho ${subBudgetsUpdatedCount} báº£n ghi Äá»™i, cáº­p nháº­t ${costUpdatedCount} chi phÃ­ liÃªn quan.`, { id: toastId, duration: 6000 });
        await logAction('SYSTEM', 'budgets', 'audit_merge', { filterLabel, mergedCount, deletedCount, costUpdatedCount, subBudgetsUpdatedCount });
      } else {
        toast.success(`NgÃ¢n sÃ¡ch (${filterLabel}) Ä‘Ã£ chuáº©n hÃ³a, khÃ´ng cÃ³ báº£n ghi trÃ¹ng láº·p nÃ o cáº§n gá»™p.`, { id: toastId });
      }
    } catch (error) {
      console.error("Merge error:", error);
      toast.error('Lá»—i khi rÃ  soÃ¡t & gá»™p ngÃ¢n sÃ¡ch: ' + (error instanceof Error ? error.message : String(error)), { id: toastId });
    } finally {
      setIsMergingBudgets(false);
    }
  };

  const handleAuditAndMerge082026Budgets = async () => {
    await handleMergeDuplicateBudgets('08-2026');
  };

  const handleAuditAndUpdateBudgetHistories = async () => {
    if (!isAdmin && !isMod && !isAccountant) return;
    
    setIsMergingBudgets(true);
    const toastId = toast.loading('Äang rÃ  soÃ¡t & cáº­p nháº­t lá»‹ch sá»­ Ä‘Äƒng kÃ½ ngÃ¢n sÃ¡ch...');
    
    try {
      let updatedHistoriesCount = 0;
      const batchSize = 400;
      let batch = writeBatch(db);
      let opCount = 0;

      // 1. Audit single budget records lacking editHistory and populate initial REGISTER entry
      for (const b of budgets) {
        if (!b.editHistory || !Array.isArray(b.editHistory) || b.editHistory.length === 0) {
          const bAmt = Number(b.amount || 0);
          const editor = b.implementerName || b.userEmail || b.createdByEmail || 'ChÆ°a rÃµ';
          const timeStr = b.createdAt?.toDate ? b.createdAt.toDate().toISOString() : (b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString());
          const initialHist = [{
            action: 'REGISTER',
            editorName: editor,
            editorEmail: b.userEmail || b.createdByEmail || '',
            timestamp: timeStr,
            amount: bAmt,
            note: `ÄÄƒng kÃ½ ngÃ¢n sÃ¡ch ban Ä‘áº§u: ${bAmt.toLocaleString()}Ä‘ (${resolveProjectName(b.projectId, b.projectName)} - ${resolveTeamName(b.teamId, b.teamName)})`
          }];

          const bRef = doc(db, 'budgets', b.id);
          batch.update(bRef, {
            editHistory: initialHist,
            updatedAt: serverTimestamp()
          });
          opCount++;
          updatedHistoriesCount++;

          if (opCount >= batchSize) {
            await batch.commit();
            batch = writeBatch(db);
            opCount = 0;
          }
        }
      }

      if (opCount > 0) {
        await batch.commit();
      }

      // 2. Perform merge cleanup for duplicate records while preserving complete combined history
      await handleMergeDuplicateBudgets();

      toast.success(`ÄÃ£ hoÃ n táº¥t rÃ  soÃ¡t vÃ  cáº­p nháº­t lá»‹ch sá»­ cho ${updatedHistoriesCount} báº£n ghi ngÃ¢n sÃ¡ch!`, { id: toastId });
    } catch (error) {
      console.error("Audit budget history error:", error);
      toast.error('Lá»—i khi rÃ  soÃ¡t lá»‹ch sá»­ ngÃ¢n sÃ¡ch: ' + (error instanceof Error ? error.message : String(error)), { id: toastId });
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
  const debouncedAdminEfficiencySearch = useDebounce(adminEfficiencySearch, 300);
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
  const [isImportingAcceptances, setIsImportingAcceptances] = useState(false);
  const [isImportAcceptancesDialogOpen, setIsImportAcceptancesDialogOpen] = useState(false);
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


  const filteredBudgetsForCostSelection = useMemo(() => {
    const userEmail = user?.email?.toLowerCase();
    
    return budgets
      .filter(b => {
        const budgetEmail = b.userEmail?.toLowerCase() || b.createdByEmail?.toLowerCase();
        const isOwner = (budgetEmail && userEmail && budgetEmail === userEmail) || (b.createdBy === user?.uid);
        const isAssigned = b.assignedUserEmail?.toLowerCase() === userEmail;
        
        const canSee = isInternalStaff || isOwner || isAssigned;
        return canSee && b.month === costBudgetMonth;
      })
      .filter(b => 
        (projectMap[b.projectId] || '').toLowerCase().includes(debouncedBudgetSearch.toLowerCase()) ||
        (b.teamName || '').toLowerCase().includes(debouncedBudgetSearch.toLowerCase()) ||
        (b.implementerName || '').toLowerCase().includes(debouncedBudgetSearch.toLowerCase())
      );
  }, [budgets, user, userProfile, isGDDA, isAdmin, isMod, costBudgetMonth, projectMap, debouncedBudgetSearch]);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          if (unsubscribeProfile) {
            unsubscribeProfile();
            unsubscribeProfile = null;
          }

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
          
          let role: 'super_admin' | 'admin' | 'mod' | 'accountant' | 'gdda' | 'assistant' | 'user' = 'user';
          if (firebaseUser.email?.toLowerCase() === 'thienvu1108@gmail.com') {
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
          }

          // Real-time profile listener
          unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data && data.teamName) {
                data.teamName = convertMhToMay(data.teamName);
              }
              setUserProfile(data || null);
              
              const rawRole = String(data?.role || 'user').toLowerCase().trim();
              let synchronizedRole: 'super_admin' | 'admin' | 'mod' | 'accountant' | 'gdda' | 'gd_khoi' | 'gdkd' | 'assistant' | 'user' = 'user';
              
              if (firebaseUser.email?.toLowerCase() === 'thienvu1108@gmail.com') synchronizedRole = 'super_admin';
              else if (rawRole === 'super_admin') synchronizedRole = 'super_admin';
              else if (rawRole === 'admin') synchronizedRole = 'admin';
              else if (rawRole === 'mod' || rawRole === 'moderator' || rawRole === 'Ä‘iá»u phá»‘i') synchronizedRole = 'mod';
              else if (rawRole === 'accountant' || rawRole === 'káº¿ toÃ¡n') synchronizedRole = 'accountant';
              else if (rawRole === 'gdda' || rawRole === 'gÄ‘da' || rawRole === 'giÃ¡m Ä‘á»‘c dá»± Ã¡n') synchronizedRole = 'gdda';
              else if (rawRole === 'gd_khoi' || rawRole === 'gdkhoi' || rawRole === 'gÄ‘ khá»‘i' || rawRole === 'giÃ¡m Ä‘á»‘c khá»‘i' || rawRole === 'giÃ¡m Ä‘á»‘c liÃªn khá»‘i' || rawRole === 'gdk') synchronizedRole = 'gd_khoi';
              else if (rawRole === 'gdkd' || rawRole === 'gÄ‘kd' || rawRole === 'giÃ¡m Ä‘á»‘c kinh doanh' || rawRole === 'gÄ‘ kinh doanh') synchronizedRole = 'gdkd';
              else if (rawRole === 'assistant' || rawRole === 'trá»£ lÃ½' || rawRole === 'tro ly') synchronizedRole = 'assistant';
              else synchronizedRole = 'user';
              
              setUserRole(synchronizedRole);

              if (!data?.fullName || !data?.teamName) {
                setOnboardingName(data?.fullName || '');
                setOnboardingTeam(data?.teamName || '');
                setShowOnboarding(true);
              } else {
                setImplementerName(data.fullName);
                setSelectedTeamName(data.teamName);
              }
            }
          }, (error) => {
             if (auth.currentUser) {
               handleFirestoreError(error, OperationType.GET, 'users');
             } else {
               console.warn("Ignoring Firestore permission error on profile listener since auth.currentUser is null");
             }
          });

          setUser(firebaseUser);
          
          // Initial tab redirection logic (based on initial fetch)
          const initialData = userDoc.data();
          const initialRawRole = (initialData?.role || 'user').toLowerCase().trim();
          if (firebaseUser.email === 'thienvu1108@gmail.com' || ['super_admin', 'admin', 'mod', 'accountant', 'gdda', 'assistant', 'trá»£ lÃ½', 'tro ly'].includes(initialRawRole)) {
            setActiveTab('admin');
          } else if (['gd_khoi', 'gdkhoi', 'gÄ‘ khá»‘i', 'giÃ¡m Ä‘á»‘c khá»‘i', 'giÃ¡m Ä‘á»‘c liÃªn khá»‘i', 'gdk'].includes(initialRawRole)) {
            setActiveTab('block-mgmt');
          } else if (['gdkd', 'gÄ‘kd', 'giÃ¡m Ä‘á»‘c kinh doanh', 'gÄ‘ kinh doanh'].includes(initialRawRole)) {
            setActiveTab('team-mgmt');
          } else {
            setActiveTab('register');
          }

          setLoading(false);
        } else {
          setUser(null);
          setUserRole(null);
          setUserProfile(null);
          setShowOnboarding(false);
          if (unsubscribeProfile) {
            unsubscribeProfile();
            unsubscribeProfile = null;
          }
        }
      } catch (error) {
        console.error('Auth State Error:', error);
      } finally {
        setLoading(false);
      }
    });
    return () => {
      unsubscribe();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  useEffect(() => {
    if (user) {
      testConnection();
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return;

    // Listen to projects - load all relevant projects to ensure mapping and search work perfectly
    let qProjects;
    if (isAdmin || isMod || isAccountant || isUser || isGDKhoi || isGDKD || (isGDDA && (!userProfile?.assignedProjects || userProfile.assignedProjects.length === 0))) {
      qProjects = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    } else if (isGDDA && userProfile?.assignedProjects && userProfile.assignedProjects.length > 0) {
      qProjects = query(collection(db, 'projects'), where('__name__', 'in', userProfile.assignedProjects));
    } else {
      qProjects = query(collection(db, 'projects'), where('__name__', '==', 'dummy_id'));
    }

    const unsubProjects = onSnapshot(qProjects, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'projects'));

    // Listen to teams - load all teams to ensure mapping and search work perfectly
    const qTeams = query(collection(db, 'teams'), orderBy('createdAt', 'desc'));
    const unsubTeams = onSnapshot(qTeams, (snapshot) => {
      const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      const sanitized = raw.map(t => ({
        ...t,
        name: normalizeTeamName(t.name),
        teamCode: normalizeTeamCode(t.teamCode || extractTeamCode(t.name))
      }));
      setTeams(sanitized);


    }, (error) => handleFirestoreError(error, OperationType.LIST, 'teams'));

    // Listen to blocks
    const qBlocks = query(collection(db, 'blocks'), orderBy('name', 'asc'));
    const unsubBlocks = onSnapshot(qBlocks, (snapshot) => {
      const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      const sanitized = raw.map(b => ({
        ...b,
        teamPrefix: String(b.teamPrefix || '').toUpperCase().trim() === 'MH' ? 'MAY' : convertMhToMay(b.teamPrefix)
      }));
      setBlocks(sanitized);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'blocks'));

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

    // Listen to budgets - load all relevant budgets to ensure mapping and team visibility work perfectly
    const qBudgets = query(collection(db, 'budgets'), orderBy('createdAt', 'desc'));
    const unsubBudgets = onSnapshot(qBudgets, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = { id: doc.id, ...doc.data() as any };
        return {
          ...d,
          teamName: convertMhToMay(d.teamName),
          teamCode: convertMhToMay(d.teamCode)
        };
      });
      setBudgets(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'budgets'));

    // Listen to costs - load all relevant costs to ensure mapping, team visibility, and actual costs work perfectly
    const qCosts = query(collection(db, 'costs'), orderBy('createdAt', 'desc'));
    const unsubCosts = onSnapshot(qCosts, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = { id: doc.id, ...doc.data() as any };
        return {
          ...d,
          teamName: convertMhToMay(d.teamName),
          teamCode: convertMhToMay(d.teamCode)
        };
      });
      setCosts(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'costs'));

    // Listen to team notifications for budget changes
    const qTeamNotifs = query(collection(db, 'teamNotifications'), orderBy('createdAt', 'desc'), limit(100));
    const unsubTeamNotifs = onSnapshot(qTeamNotifs, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      setTeamNotifications(data);
    }, (error) => {
      console.warn("teamNotifications listener error:", error);
    });

    // Listen to audit logs
    let unsubLogs = () => {};
    if (isAdmin || isMod || isAccountant) {
      const qLogs = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(500));
      unsubLogs = onSnapshot(qLogs, (snapshot) => {
        setAuditLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'auditLogs'));
    }

    // Listen to all users (for Admin, Accountant, GDKhoi, GDKD, and Team Management)
    const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(500));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      const sanitized = raw.map(u => ({
        ...u,
        teamName: convertMhToMay(u.teamName)
      }));
      setAllUsers(sanitized);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    // Listen to efficiency reports - load all relevant efficiency reports to ensure mapping and search work perfectly
    let unsubEfficiency = () => {};
    if (isAdmin || isMod || isAccountant || isUser || isGDKhoi || isGDKD || (isGDDA && (!userProfile?.assignedProjects || userProfile.assignedProjects.length === 0))) {
      const qEfficiency = query(collection(db, 'efficiencyReports'), orderBy('createdAt', 'desc'));
      unsubEfficiency = onSnapshot(qEfficiency, (snapshot) => {
        const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const sanitized = raw.map(e => ({
          ...e,
          teamName: convertMhToMay(e.teamName)
        }));
        setEfficiencyReports(sanitized);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'efficiencyReports'));
    } else if (isGDDA && userProfile?.assignedProjects && userProfile.assignedProjects.length > 0) {
      const qEfficiency = query(collection(db, 'efficiencyReports'), where('projectId', 'in', userProfile.assignedProjects));
      unsubEfficiency = onSnapshot(qEfficiency, (snapshot) => {
        const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const sanitized = raw.map(e => ({
          ...e,
          teamName: convertMhToMay(e.teamName)
        }));
        setEfficiencyReports(sanitized);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'efficiencyReports'));
    }

    // Listen to acceptances - load all relevant acceptances to ensure mapping and search work perfectly
    let unsubAcceptances = () => {};
    if (isAdmin || isMod || isAccountant || isGDKhoi || isGDKD || (isGDDA && (!userProfile?.assignedProjects || userProfile.assignedProjects.length === 0))) {
      const qAcceptances = query(collection(db, 'acceptances'), orderBy('month', 'desc'));
      unsubAcceptances = onSnapshot(qAcceptances, (snapshot) => {
        const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const sanitized = raw.map(a => ({
          ...a,
          teamName: convertMhToMay(a.teamName),
          teamCode: convertMhToMay(a.teamCode)
        }));
        setAcceptances(sanitized);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'acceptances'));
    } else if (isGDDA && userProfile?.assignedProjects && userProfile.assignedProjects.length > 0) {
      const qAcceptances = query(collection(db, 'acceptances'), where('projectId', 'in', userProfile.assignedProjects));
      unsubAcceptances = onSnapshot(qAcceptances, (snapshot) => {
        const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const sanitized = raw.map(a => ({
          ...a,
          teamName: convertMhToMay(a.teamName),
          teamCode: convertMhToMay(a.teamCode)
        }));
        setAcceptances(sanitized);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'acceptances'));
    }

    // Listen to final acceptances - load all relevant final acceptances to ensure mapping and search work perfectly
    let unsubFinalAcceptances = () => {};
    let unsubDocProcessing = () => {};
    if (isAdmin || isMod || isAccountant || isGDKhoi || isGDKD || (isGDDA && (!userProfile?.assignedProjects || userProfile.assignedProjects.length === 0))) {
      const qFinal = query(collection(db, 'finalAcceptances'), orderBy('finalizedAt', 'desc'));
      unsubFinalAcceptances = onSnapshot(qFinal, (snapshot) => {
        const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const sanitized = raw.map(fa => ({
          ...fa,
          teamName: convertMhToMay(fa.teamName),
          teamCode: convertMhToMay(fa.teamCode)
        }));
        setFinalAcceptances(sanitized);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'finalAcceptances'));

      const qDocProcessing = query(collection(db, 'docProcessing'));
      unsubDocProcessing = onSnapshot(qDocProcessing, (snapshot) => {
        const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const sanitized = raw.map(dp => ({
          ...dp,
          teamName: convertMhToMay(dp.teamName)
        }));
        setDocProcessingStatus(sanitized);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'docProcessing'));
    } else if (isGDDA && userProfile?.assignedProjects && userProfile.assignedProjects.length > 0) {
      const qFinal = query(collection(db, 'finalAcceptances'), where('projectId', 'in', userProfile.assignedProjects));
      unsubFinalAcceptances = onSnapshot(qFinal, (snapshot) => {
        const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const sanitized = raw.map(fa => ({
          ...fa,
          teamName: convertMhToMay(fa.teamName),
          teamCode: convertMhToMay(fa.teamCode)
        }));
        setFinalAcceptances(sanitized);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'finalAcceptances'));

      const qDocProcessing = query(collection(db, 'docProcessing'), where('projectId', 'in', userProfile.assignedProjects));
      unsubDocProcessing = onSnapshot(qDocProcessing, (snapshot) => {
        const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const sanitized = raw.map(dp => ({
          ...dp,
          teamName: convertMhToMay(dp.teamName)
        }));
        setDocProcessingStatus(sanitized);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'docProcessing'));
    }

    // Listen to support requests
    let unsubSupport = () => {};
    if (isAdmin || isMod || isAccountant) {
      const qSupport = query(collection(db, 'supportRequests'), orderBy('createdAt', 'desc'), limit(1000));
      unsubSupport = onSnapshot(qSupport, (snapshot) => {
        const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const sanitized = raw.map(sr => ({
          ...sr,
          teamName: convertMhToMay(sr.teamName),
          userTeam: convertMhToMay(sr.userTeam)
        }));
        setSupportRequests(sanitized);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'supportRequests'));
    } else {
      const qSupport = query(collection(db, 'supportRequests'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(500));
      unsubSupport = onSnapshot(qSupport, (snapshot) => {
        const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        const sanitized = raw.map(sr => ({
          ...sr,
          teamName: convertMhToMay(sr.teamName),
          userTeam: convertMhToMay(sr.userTeam)
        }));
        setSupportRequests(sanitized);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'supportRequests'));
    }

    // Listen to settings
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setSystemSettings(data);
        if (data.budgetStartDay) setAdminBudgetStartDay(data.budgetStartDay.toString());
        if (data.budgetEndDay) setAdminBudgetEndDay(data.budgetEndDay.toString());
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings'));

    // Listen to BÃ¡o cÃ¡o NT settings and cached records
    const unsubReportNT = onSnapshot(doc(db, 'settings', 'report_nt'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setReportNTUrl(data.sheetUrl || '');
        setInputReportNTUrl(data.sheetUrl || '');
        setReportNTRecords(data.records || []);
        setReportNTLastUpdated(data.lastUpdated || null);
      }
    }, (error) => {
      console.warn("BÃ¡o cÃ¡o NT settings listener skipped or not created yet:", error);
    });

    return () => {
      unsubProjects();
      unsubTeams();
      unsubRegions();
      unsubTypes();
      unsubBudgets();
      unsubCosts();
      unsubBlocks();
      unsubLogs();
      unsubUsers();
      unsubEfficiency();
      unsubDocProcessing();
      unsubAcceptances();
      unsubFinalAcceptances();
      unsubSupport();
      unsubSettings();
      unsubReportNT();
      unsubTeamNotifs();
    };
  }, [user?.uid, userRole, isAdmin, isMod, isAccountant, isGDDA, isGDKhoi, isGDKD, JSON.stringify(userProfile), JSON.stringify(currentRolePermissions)]);

  useEffect(() => {
    if (!user) return;
    const unsubRolePerms = onSnapshot(collection(db, 'rolePermissions'), (snapshot) => {
      setRolePermissionsList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.warn("rolePermissions collection listener error:", error);
    });
    return () => unsubRolePerms();
  }, [user?.uid]);

  const initialDocProcessingMonthSet = useRef(false);
  useEffect(() => {
    if (finalAcceptances && finalAcceptances.length > 0 && !initialDocProcessingMonthSet.current) {
      const latestRecord = finalAcceptances[0];
      if (latestRecord && latestRecord.month) {
        setAcceptanceMonthFilter(latestRecord.month);
        initialDocProcessingMonthSet.current = true;
      }
    }
  }, [finalAcceptances]);

  const googleSheetTableRef = useRef<HTMLDivElement>(null);

  // Implement mouse-drag horizontal scroll for best UX in Google Sheet view
  useEffect(() => {
    const slider = googleSheetTableRef.current;
    if (!slider) return;

    let isDown = false;
    let startX = 0;
    let startScrollLeft = 0;
    let hasMoved = false;
    let lastClientX = 0;
    let lastTime = 0;
    let velocityX = 0;
    let inertiaRaf: number | null = null;

    const handleDragStart = (e: DragEvent) => e.preventDefault();

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (inertiaRaf) {
        cancelAnimationFrame(inertiaRaf);
        inertiaRaf = null;
      }

      const target = e.target as HTMLElement;
      if (target.closest('input:not([type="checkbox"]), select, textarea, button, a, [role="button"], label, .no-drag')) {
        return;
      }

      isDown = true;
      hasMoved = false;
      startX = e.clientX;
      lastClientX = e.clientX;
      lastTime = performance.now();
      velocityX = 0;
      startScrollLeft = slider.scrollLeft;
      e.preventDefault();

      slider.classList.add('cursor-grabbing');
      slider.classList.remove('cursor-grab');
      document.body.style.userSelect = 'none';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      const currentX = e.clientX;
      const dx = currentX - startX;

      const now = performance.now();
      const dt = now - lastTime;
      if (dt > 0) {
        const instantVelocity = (lastClientX - currentX) / dt;
        velocityX = 0.7 * instantVelocity + 0.3 * velocityX;
        lastClientX = currentX;
        lastTime = now;
      }

      if (Math.abs(dx) > 3) {
        hasMoved = true;
        e.preventDefault();
      }
      slider.scrollLeft = startScrollLeft - dx;
    };

    const handleMouseUp = () => {
      if (!isDown) return;
      isDown = false;
      slider.classList.remove('cursor-grabbing');
      slider.classList.add('cursor-grab');
      document.body.style.userSelect = '';

      if (hasMoved && Math.abs(velocityX) > 0.12) {
        let currentVelocity = velocityX * 16;
        const friction = 0.93;

        const glide = () => {
          if (Math.abs(currentVelocity) < 0.3) {
            inertiaRaf = null;
            return;
          }
          slider.scrollLeft += currentVelocity;
          currentVelocity *= friction;
          inertiaRaf = requestAnimationFrame(glide);
        };
        inertiaRaf = requestAnimationFrame(glide);
      }
    };

    const handleClickCapture = (e: MouseEvent) => {
      if (hasMoved) {
        e.stopPropagation();
        e.preventDefault();
        hasMoved = false;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.shiftKey) {
        e.preventDefault();
        slider.scrollLeft += e.deltaY * 1.2;
      }
    };

    slider.addEventListener('dragstart', handleDragStart);
    slider.addEventListener('mousedown', handleMouseDown);
    slider.addEventListener('click', handleClickCapture, true);
    slider.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('mousemove', handleMouseMove, { passive: false });
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      if (inertiaRaf) {
        cancelAnimationFrame(inertiaRaf);
      }
      slider.removeEventListener('dragstart', handleDragStart);
      slider.removeEventListener('mousedown', handleMouseDown);
      slider.removeEventListener('click', handleClickCapture, true);
      slider.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, []);

  const handleImportEfficiency = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (projects.length === 0 || teams.length === 0) {
      toast.error("Dá»¯ liá»‡u há»‡ thá»‘ng (Dá»± Ã¡n/Team) chÆ°a táº£i xong. Vui lÃ²ng Ä‘á»£i giÃ¢y lÃ¡t.");
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
          toast.error("File trá»‘ng hoáº·c khÃ´ng tÃ¬m tháº¥y dá»¯ liá»‡u");
          setIsImportingEfficiency(false);
          return;
        }

        // Find header row (the one containing 'ID' or 'Dá»± Ã¡n')
        let headerIndex = -1;
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          const row = rows[i];
          if (row.some(cell => {
            const str = String(cell || '').toLowerCase().replace(/\s+/g, '');
            return str.includes('idduan') || str.includes('dá»±Ã¡n') || str.includes('projectid');
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
          toast.error("KhÃ´ng tÃ¬m tháº¥y dá»¯ liá»‡u há»£p lá»‡. Vui lÃ²ng kiá»ƒm tra láº¡i cáº¥u trÃºc file máº«u.");
          setIsImportingEfficiency(false);
          return;
        }

        const batch = writeBatch(db);
        let count = 0;
        const currentImportErrors: string[] = [];
        const ops: any[] = [];

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

          const pRef = String(getVal(['ID Dá»± Ã¡n', 'MÃ£ Dá»± Ã¡n', 'Dá»± Ã¡n', 'ProjectID', 'idduan', 'id dá»± Ã¡n', 'mÃ£ dá»± Ã¡n']) || '').trim();
          const tRef = String(getVal(['ID Team', 'MÃ£ Team', 'TÃªn Team', 'TeamID', 'teamid', 'id team', 'mÃ£ team']) || '').trim();
          let month = normalizeMonth(getVal(['ThÃ¡ng', 'Ká»³', 'Month', 'thang', 'thaÌng', 'thaÌng', 'ká»³']));
          
          const salesStr = String(getVal(['CÄƒn bÃ¡n', 'Sá»‘ cÄƒn bÃ¡n', 'canban', 'socan', 'salescount', 'sales', 'sá»‘ cÄƒn', 'units']) || '0');
          const revenueStr = String(getVal(['Doanh sá»‘', 'revenue', 'doanhso', 'thá»±c Ä‘áº¡t', 'doanh thu', 'doanhthu']) || '0');

          if (!pRef || !tRef || !month) {
            const hasData = Object.values(normalizedRow).some(v => v !== null && v !== undefined && v !== '');
            if (hasData) {
              const missing = [];
              if (!pRef) missing.push('Dá»± Ã¡n (MÃ£/TÃªn)');
              if (!tRef) missing.push('Team (MÃ£/TÃªn)');
              if (!month) missing.push('ThÃ¡ng (Ká»³)');
              currentImportErrors.push(
                `DÃ²ng ${rowNum}: THIáº¾U THÃ”NG TIN Báº®T BUá»˜C (${missing.join(', ')}).\n` +
                `â€¢ NguyÃªn nhÃ¢n: Cá»™t chá»©a thÃ´ng tin nÃ y bá»‹ trá»‘ng hoáº·c tÃªn cá»™t khÃ´ng khá»›p máº«u.\n` +
                `â€¢ CÃ¡ch kháº¯c phá»¥c: Äáº£m báº£o cÃ¡c cá»™t ID/TÃªn Dá»± Ã¡n, Team vÃ  ThÃ¡ng Ä‘Æ°á»£c Ä‘iá»n Ä‘áº§y Ä‘á»§. Äá»‘i vá»›i ThÃ¡ng, hÃ£y nháº­p Ä‘Ãºng Ä‘á»‹nh dáº¡ng YYYY-MM (VÃ­ dá»¥: 2024-04).`
              );
            }
            continue;
          }

          const project = projects.find(p => p.id === pRef || p.projectCode === pRef || (p.name && String(p.name).toLowerCase() === String(pRef).toLowerCase()));
          const team = teams.find(t => t.id === tRef || t.teamCode === tRef || (t.name && String(t.name).toLowerCase() === String(tRef).toLowerCase()));

          if (!project) {
            currentImportErrors.push(
              `DÃ²ng ${rowNum}: KHÃ”NG TÃŒM THáº¤Y Dá»° ÃN khá»›p vá»›i "${pRef}".\n` +
              `â€¢ NguyÃªn nhÃ¢n: MÃ£ dá»± Ã¡n hoáº·c TÃªn dá»± Ã¡n trong file khÃ´ng tá»“n táº¡i trong há»‡ thá»‘ng.\n` +
              `â€¢ CÃ¡ch kháº¯c phá»¥c: Kiá»ƒm tra láº¡i má»¥c "Quáº£n lÃ½ Dá»± Ã¡n" Ä‘á»ƒ láº¥y chÃ­nh xÃ¡c MÃ£ ID hoáº·c TÃªn dá»± Ã¡n. LÆ°u Ã½ khÃ´ng cÃ³ khoáº£ng tráº¯ng thá»«a.`
            );
            continue;
          }
          if (!team) {
            currentImportErrors.push(
              `DÃ²ng ${rowNum}: KHÃ”NG TÃŒM THáº¤Y TEAM khá»›p vá»›i "${tRef}".\n` +
              `â€¢ NguyÃªn nhÃ¢n: MÃ£ team hoáº·c TÃªn team trong file khÃ´ng tá»“n táº¡i trong há»‡ thá»‘ng.\n` +
              `â€¢ CÃ¡ch kháº¯c phá»¥c: Kiá»ƒm tra láº¡i má»¥c "Quáº£n lÃ½ Team/SÃ n" Ä‘á»ƒ láº¥y chÃ­nh xÃ¡c MÃ£ ID hoáº·c TÃªn team.`
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
            ops.push({
              type: 'update',
              ref: doc(db, 'efficiencyReports', existing.id),
              data: {
                salesCount: sales,
                revenue: revenue,
                updatedAt: serverTimestamp()
              }
            });
          } else {
            ops.push({
              type: 'set',
              ref: doc(collection(db, 'efficiencyReports')),
              data: {
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
              }
            });
          }
          count++;
        }

        if (ops.length > 0) {
          for (let i = 0; i < ops.length; i += 450) {
            const batch = writeBatch(db);
            ops.slice(i, i + 450).forEach(op => {
              if (op.type === 'update') batch.update(op.ref, op.data);
              else batch.set(op.ref, op.data);
            });
            await batch.commit();
          }
        }
        
        if (count > 0) {
          toast.success(`Äá»“ng bá»™ thÃ nh cÃ´ng ${count} báº£n ghi.`);
        }

        if (currentImportErrors.length > 0) {
          setImportErrors(currentImportErrors);
          setIsImportErrorsDialogOpen(true);
          toast.error(`CÃ³ ${currentImportErrors.length} dÃ²ng gáº·p lá»—i khi nháº­p dá»¯ liá»‡u.`);
        } else if (count === 0) {
          toast.info("KhÃ´ng tÃ¬m tháº¥y dá»¯ liá»‡u má»›i Ä‘á»ƒ Ä‘á»“ng bá»™.");
        }

        await logAction('IMPORT', 'efficiencyReports', 'bulk', { count, errors: currentImportErrors.length });
      } catch (error) {
        console.error("Import Error:", error);
        toast.error("Lá»—i xá»­ lÃ½ file. Vui lÃ²ng Ä‘áº£m báº£o báº¡n Ä‘ang dÃ¹ng file Excel (.xlsx) hoáº·c CSV chuáº©n vÃ  khÃ´ng cÃ³ báº£o máº­t.");
      } finally {
        setIsImportingEfficiency(false);
        setIsImportEfficiencyDialogOpen(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportBudgetsFromUrl = async () => {
    if (!budgetSheetUrl.trim()) {
      toast.error('Vui lÃ²ng nháº­p Link Google Sheet ngÃ¢n sÃ¡ch');
      return;
    }

    const docIdMatch = budgetSheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!docIdMatch) {
      toast.error('Link Google Sheet khÃ´ng há»£p lá»‡');
      return;
    }

    const docId = docIdMatch[1];
    const exportUrl = `https://docs.google.com/spreadsheets/d/${docId}/export?format=xlsx`;

    setIsImportingBudgetsUrl(true);
    setImportErrors([]);
    try {
      const response = await fetch(exportUrl);
      if (!response.ok) {
        throw new Error("KhÃ´ng thá»ƒ táº£i file tá»« Google Sheet. HÃ£y Ä‘áº£m báº£o file Ä‘Ã£ Ä‘Æ°á»£c chia sáº» cÃ´ng khai.");
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
            return str.includes('ngÃ¢nsÃ¡ch') || str.includes('amount') || str.includes('idduan') || str.includes('dá»±Ã¡n') || str.includes('idteam');
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

      let count = 0;
      let skippedCount = 0;
      const errorDetails: string[] = [];
      const ops: any[] = [];

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

          const pRef = String(getVal(['ID Dá»± Ã¡n', 'MÃ£ Dá»± Ã¡n', 'Dá»± Ã¡n', 'ProjectID', 'idduan', 'id dá»± Ã¡n', 'mÃ£ dá»± Ã¡n']) || '').trim();
          const tRef = String(getVal(['ID Team', 'MÃ£ Team', 'TÃªn Team', 'TeamID', 'idteam', 'id team', 'mÃ£ team']) || '').trim();
          const monthRaw = getVal(['ThÃ¡ng', 'Ká»³', 'Month', 'thang', 'thaÌng', 'thaÌng', 'ká»³']);
          const month = normalizeMonth(monthRaw);
          const amount = parseVal(getVal(['NgÃ¢n sÃ¡ch', 'Amount', 'ngansach', 'ngÃ¢n saÌch', 'ngÃ¢nsÃ¡ch', 'sá»‘ tiá»n']));
          const implementer = String(getVal(['NgÆ°á»i triá»ƒn khai', 'GDDA', 'Implementer', 'nguoiphutrach', 'giamdockinhdoanh', 'nguoitrienkhai', 'ngÆ°Æ¡Ì€i triÃªÌ‰n khai', 'phá»¥ trÃ¡ch']) || '').trim();

          if (pRef && tRef && month && (amount >= 0 || !isNaN(amount))) {
            const key = `${pRef}_${tRef}_${month}`;
            if (consolidatedDataMap.has(key)) {
              consolidatedDataMap.get(key).amount += amount;
            } else {
              consolidatedDataMap.set(key, { pRef, tRef, month, amount, implementer });
            }
          } else if (Object.values(normalizedRow).some(v => v !== '')) {
            const missing = [];
            if (!pRef) missing.push('Dá»± Ã¡n');
            if (!tRef) missing.push('Team');
            if (!month) missing.push('ThÃ¡ng');
            if (isNaN(amount)) missing.push('NgÃ¢n sÃ¡ch');
            
            errorDetails.push(
              `THÃ”NG TIN SAI HOáº¶C THIáº¾U: (${missing.join(', ')}).\n` +
              `â€¢ NguyÃªn nhÃ¢n: Má»™t sá»‘ Ã´ á»Ÿ Google Sheet Ä‘ang trá»‘ng hoáº·c sai Ä‘á»‹nh dáº¡ng sá»‘.\n` +
              `â€¢ CÃ¡ch kháº¯c phá»¥c: Kiá»ƒm tra láº¡i cÃ¡c cá»™t Dá»± Ã¡n, Team, ThÃ¡ng vÃ  NgÃ¢n sÃ¡ch táº¡i Link Google Sheet.`
            );
            skippedCount++;
          }
      }

      const consolidatedItems = Array.from(consolidatedDataMap.values()) as any[];

      for (const item of consolidatedItems) {
        const findProject = (ref: string) => {
          if (!ref) return null;
          const cleanRef = String(ref).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
          if (!cleanRef) return null;
          return projects.find(p => 
            p.id === ref || 
            (p.projectCode && String(p.projectCode).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
            (p.name && String(p.name).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef)
          );
        };

        const findTeam = (ref: string) => {
          if (!ref) return null;
          const cleanRef = String(ref).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
          if (!cleanRef) return null;
          return teams.find(t => 
            t.id === ref || 
            (t.teamCode && String(t.teamCode).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
            (t.name && String(t.name).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef)
          );
        };

        const project = findProject(item.pRef);
        const team = findTeam(item.tRef);

        if (!project) {
          errorDetails.push(
            `KHÃ”NG TÃŒM THáº¤Y Dá»° ÃN khá»›p vá»›i "${item.pRef}".\n` +
            `â€¢ NguyÃªn nhÃ¢n: Dá»± Ã¡n mang tÃªn "${item.pRef}" trong Google Sheet khÃ´ng khá»›p vá»›i há»‡ thá»‘ng.\n` +
            `â€¢ CÃ¡ch kháº¯c phá»¥c: Sá»­a láº¡i tÃªn Dá»± Ã¡n trong Google Sheet cho Ä‘Ãºng vá»›i danh sÃ¡ch há»‡ thá»‘ng.`
          );
          skippedCount++;
          continue;
        }
        if (!team) {
          errorDetails.push(
            `KHÃ”NG TÃŒM THáº¤Y TEAM khá»›p vá»›i "${item.tRef}".\n` +
            `â€¢ NguyÃªn nhÃ¢n: MÃ£ hoáº·c tÃªn Team "${item.tRef}" khÃ´ng tá»“n táº¡i.\n` +
            `â€¢ CÃ¡ch kháº¯c phá»¥c: Sá»­a láº¡i tÃªn Team trong Google Sheet cho Ä‘Ãºng vá»›i danh sÃ¡ch há»‡ thá»‘ng.`
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

          ops.push({
            type: 'update',
            ref: doc(db, 'budgets', targetBudget.id),
            data: {
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
            }
          });

          for (const dup of duplicates) {
            const affectedCosts = costs.filter(c => c.budgetId === dup.id);
            affectedCosts.forEach(c => {
              ops.push({ 
                type: 'update', 
                ref: doc(db, 'costs', c.id), 
                data: { budgetId: targetBudget.id } 
              });
            });
            ops.push({ 
              type: 'delete', 
              ref: doc(db, 'budgets', dup.id) 
            });
          }
        } else {
          ops.push({
            type: 'set',
            ref: doc(collection(db, 'budgets')),
            data: {
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
            }
          });
        }
        count++;
      }

      if (ops.length > 0) {
        for (let i = 0; i < ops.length; i += 450) {
          const batch = writeBatch(db);
          ops.slice(i, i + 450).forEach(op => {
            if (op.type === 'update') batch.update(op.ref, op.data);
            else if (op.type === 'set') batch.set(op.ref, op.data);
            else if (op.type === 'delete') batch.delete(op.ref);
          });
          await batch.commit();
        }
        await logAction('IMPORT_BUDGETS_URL', 'budgets', docId, { count, errors: skippedCount });
        
        let msg = `ÄÃ£ cáº­p nháº­t ${count} ngÃ¢n sÃ¡ch tá»« Google Sheet.`;
        if (skippedCount > 0) {
          msg += ` Bá» qua ${skippedCount} dÃ²ng lá»—i.`;
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
          toast.info("KhÃ´ng cÃ³ dá»¯ liá»‡u ngÃ¢n sÃ¡ch há»£p lá»‡ Ä‘á»ƒ cáº­p nháº­t. Vui lÃ²ng kiá»ƒm tra tiÃªu Ä‘á» cá»™t vÃ  ná»™i dung.");
        }
      }
    } catch (error) {
      console.error('Import budgets error:', error);
      toast.error('Lá»—i khi táº£i hoáº·c xá»­ lÃ½ link Google Sheet. Äáº£m báº£o file Ä‘Æ°á»£c chia sáº» cÃ´ng khai.');
    } finally {
      setIsImportingBudgetsUrl(false);
    }
  };

  const handleImportEfficiencyFromUrl = async () => {
    if (!efficiencySheetUrl) {
      toast.error("Vui lÃ²ng nháº­p link Google Sheet");
      return;
    }

    // Extract Spreadsheet ID
    const match = efficiencySheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match || !match[1]) {
      toast.error("Link Google Sheet khÃ´ng Ä‘Ãºng Ä‘á»‹nh dáº¡ng");
      return;
    }

    const spreadsheetId = match[1];
    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;

    setIsImportingEfficiencyUrl(true);
    setIsImportingEfficiency(true);

    try {
      const response = await fetch(exportUrl);
      if (!response.ok) {
        throw new Error("KhÃ´ng thá»ƒ táº£i file tá»« Google Sheet. HÃ£y Ä‘áº£m báº£o file Ä‘Ã£ Ä‘Æ°á»£c chia sáº» cÃ´ng khai (Báº¥t ká»³ ai cÃ³ liÃªn káº¿t Ä‘á»u cÃ³ thá»ƒ xem).");
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
            return str.includes('idduan') || str.includes('dá»±Ã¡n') || str.includes('projectid') || str.includes('idteam') || str.includes('cÄƒnbaÌn');
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
        toast.error("KhÃ´ng tÃ¬m tháº¥y dá»¯ liá»‡u há»£p lá»‡ trong Google Sheet.");
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

        const pRef = String(getVal(['ID Dá»± Ã¡n', 'MÃ£ Dá»± Ã¡n', 'Dá»± Ã¡n', 'ProjectID', 'idduan', 'id dá»± Ã¡n', 'mÃ£ dá»± Ã¡n']) || '').trim();
        const tRef = String(getVal(['ID Team', 'MÃ£ Team', 'TÃªn Team', 'TeamID', 'idteam', 'id team', 'mÃ£ team']) || '').trim();
        const month = normalizeMonth(getVal(['ThÃ¡ng', 'Ká»³', 'Month', 'thang', 'thaÌng', 'thaÌng', 'ká»³']));

        const salesStr = String(getVal(['CÄƒn bÃ¡n', 'Sá»‘ cÄƒn bÃ¡n', 'canban', 'socan', 'salescount', 'sales', 'sá»‘ cÄƒn', 'units']) || '0');
        const revenueStr = String(getVal(['Doanh sá»‘', 'revenue', 'doanhso', 'thá»±c Ä‘áº¡t', 'doanh thu', 'doanhthu']) || '0');

        const sales = parseInt(salesStr.replace(/[^0-9]/g, '')) || 0;
        const revenue = parseInt(revenueStr.replace(/[^0-9]/g, '')) || 0;

        if (!pRef || !tRef || !month) {
          const hasData = Object.values(normalizedRow).some(v => v !== null && v !== undefined && v !== '');
          if (hasData) {
            errorDetails.push(`DÃ²ng ${rowIndex}: Thiáº¿u thÃ´ng tin báº¯t buá»™c (Dá»± Ã¡n: "${pRef}", Team: "${tRef}", Ká»³: "${month}")`);
            skippedCount++;
          }
          continue;
        }

        const findProject = (ref: string) => {
          if (!ref) return null;
          const cleanRef = String(ref).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
          if (!cleanRef) return null;
          return projects.find(p => 
            p.id === ref || 
            (p.projectCode && String(p.projectCode).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
            (p.name && String(p.name).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef)
          );
        };

        const findTeam = (ref: string) => {
          if (!ref) return null;
          const cleanRef = String(ref).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
          if (!cleanRef) return null;
          return teams.find(t => 
            t.id === ref || 
            (t.teamCode && String(t.teamCode).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
            (t.name && String(t.name).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef)
          );
        };

        const project = findProject(pRef);
        const team = findTeam(tRef);

        if (!project) {
          errorDetails.push(`DÃ²ng ${rowIndex}: KhÃ´ng tÃ¬m tháº¥y Dá»± Ã¡n khá»›p vá»›i "${pRef}"`);
          skippedCount++;
          continue;
        }
        if (!team) {
          errorDetails.push(`DÃ²ng ${rowIndex}: KhÃ´ng tÃ¬m tháº¥y Team khá»›p vá»›i "${tRef}"`);
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
        let msg = `Äá»“ng bá»™ thÃ nh cÃ´ng ${count} báº£n ghi hiá»‡u quáº£ tá»« Google Sheet.`;
        if (skippedCount > 0) {
          msg += ` Bá» qua ${skippedCount} dÃ²ng lá»—i.`;
          setImportErrors(errorDetails);
          setIsImportErrorsDialogOpen(true);
        }
        toast.success(msg);
      } else {
        if (errorDetails.length > 0) {
          setImportErrors(errorDetails);
          setIsImportErrorsDialogOpen(true);
        } else {
          toast.error("KhÃ´ng tÃ¬m tháº¥y dá»¯ liá»‡u hiá»‡u quáº£ há»£p lá»‡ Ä‘á»ƒ nháº­p.");
        }
      }

      await logAction('IMPORT_URL', 'efficiencyReports', spreadsheetId, { count, errors: skippedCount });
      setIsImportEfficiencyDialogOpen(false);
      setEfficiencySheetUrl('');
    } catch (error: any) {
      console.error("Link Import Error:", error);
      toast.error(error.message || "Lá»—i khi káº¿t ná»‘i vá»›i Google Sheet. HÃ£y kiá»ƒm tra quyá»n chia sáº» cá»§a file.");
    } finally {
      setIsImportingEfficiencyUrl(false);
      setIsImportingEfficiency(false);
    }
  };

  const handleDownloadEfficiencyTemplate = () => {
    const templateData = [
      {
        'ID Dá»± Ã¡n': projects[0]?.id || 'ID_DU_AN_1',
        'ID Team': teams[0]?.id || 'ID_TEAM_1',
        'ThÃ¡ng': format(new Date(), 'yyyy-MM'),
        'Sá»‘ cÄƒn bÃ¡n': 5,
        'Doanh sá»‘': 15000000000
      }
    ];

    const projectData = projects.map(p => ({
      'ID Dá»± Ã¡n': p.id,
      'TÃªn Dá»± Ã¡n': p.name,
      'VÃ¹ng/Khu vá»±c': p.region
    }));

    const teamData = teams.map(t => ({
      'ID Team': t.id,
      'TÃªn Team': t.name
    }));

    const wb = XLSX.utils.book_new();
    
    // Create sheet with only required columns
    const wsTemplate = XLSX.utils.json_to_sheet(templateData);
    XLSX.utils.book_append_sheet(wb, wsTemplate, "Máº«u Nháº­p Liá»‡u");

    const wsProjects = XLSX.utils.json_to_sheet(projectData);
    XLSX.utils.book_append_sheet(wb, wsProjects, "DANH SÃCH ID Dá»° ÃN");

    const wsTeams = XLSX.utils.json_to_sheet(teamData);
    XLSX.utils.book_append_sheet(wb, wsTeams, "DANH SÃCH ID TEAM");

    XLSX.writeFile(wb, `Mau_Bao_Cao_Hieu_Qua_Sync_IDs_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    toast.success("ÄÃ£ táº£i xuá»‘ng file máº«u Ä‘á»“ng bá»™ theo ID!");
  };

  const handleAddEfficiency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEfficiencyProject || !newEfficiencyTeam || !newEfficiencySales || !newEfficiencyRevenue) {
      toast.error('Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ thÃ´ng tin');
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
      toast.success('ÄÃ£ lÆ°u bÃ¡o cÃ¡o hiá»‡u quáº£');
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
      toast.success('ÄÃ£ cáº­p nháº­t bÃ¡o cÃ¡o');
      setIsEditEfficiencyDialogOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'efficiencyReports');
    }
  };

  const handleDeleteEfficiency = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'efficiencyReports', id));
      await logAction('DELETE', 'efficiencyReports', id, {});
      toast.success('ÄÃ£ xÃ³a bÃ¡o cÃ¡o hiá»‡u quáº£');
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
      toast.success(`ÄÃ£ xÃ³a ${selectedEfficiencyIds.length} báº£n ghi hiá»‡u quáº£`);
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
      toast.success('ÄÃ£ xÃ³a táº¥t cáº£ báº£n ghi hiá»‡u quáº£ kinh doanh');
      setSelectedEfficiencyIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'efficiencyReports');
    }
  };

  const filteredEfficiencyReports = useMemo(() => {
    return efficiencyReports.filter(r => {
      const pName = projectMap[r.projectId] || r.projectName || '';
      const tName = teamMap[r.teamId] || r.teamName || '';
      const matchSearch = (pName.toLowerCase().includes(debouncedAdminEfficiencySearch.toLowerCase())) ||
                        (tName.toLowerCase().includes(debouncedAdminEfficiencySearch.toLowerCase()));
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
  }, [efficiencyReports, debouncedAdminEfficiencySearch, adminEfficiencyMonthFilter, projectMap, teamMap, adminEfficiencySort]);

  const paginatedFilteredEfficiencyReports = useMemo(() => {
    const start = (efficiencyPage - 1) * 20;
    return (filteredEfficiencyReports || []).slice(start, start + 20);
  }, [filteredEfficiencyReports, efficiencyPage]);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      // Ensure persistence is set to local
      await auth.setPersistence(browserLocalPersistence);
      await signInWithPopup(auth, provider);
      toast.success('ÄÄƒng nháº­p thÃ nh cÃ´ng');
    } catch (error: any) {
      console.error('Login Error:', error);
      let message = 'ÄÄƒng nháº­p tháº¥t báº¡i';
      if (error.code === 'auth/popup-blocked') {
        message = 'TrÃ¬nh duyá»‡t Ä‘Ã£ cháº·n cá»­a sá»• báº­t lÃªn. Vui lÃ²ng cho phÃ©p báº­t lÃªn Ä‘á»ƒ Ä‘Äƒng nháº­p.';
      } else if (error.code === 'auth/cancelled-popup-request') {
        message = 'YÃªu cáº§u Ä‘Äƒng nháº­p Ä‘Ã£ bá»‹ há»§y.';
      } else if (error.code === 'auth/unauthorized-domain') {
        message = 'TÃªn miá»n nÃ y chÆ°a Ä‘Æ°á»£c á»§y quyá»n trong Firebase Console.';
      } else if (error.message) {
        message = `Lá»—i: ${error.message}`;
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
          // CÃ¡c trÆ°á»ng tiáº¿ng viá»‡t cho Sheet
          thoiGian: ts.toLocaleString('vi-VN'),
          hanhDong: log.action || 'N/A',
          nguoiChinhSua: log.userEmail || 'Há»‡ thá»‘ng'
        };
      }),
      systemLog: {
        action: "Full System Backup",
        user: user?.email || "Admin_Mayhomes",
        timestamp: new Date().toISOString(),
        details: `Sao lÆ°u ${budgets.length} ngÃ¢n sÃ¡ch, ${costs.length} chi phÃ­, ${projects.length} dá»± Ã¡n`
      }
    };

    try {
      console.log("Dá»¯ liá»‡u chuáº©n hÃ³a gá»­i sang Google Sheets:", masterPayload);
      
      // Sá»­ dá»¥ng text/plain Ä‘á»ƒ trÃ¡nh Preflight CORS (POST simple request)
      // Dá»¯ liá»‡u Ä‘Æ°á»£c gá»­i dÆ°á»›i dáº¡ng chuá»—i JSON thÃ´
      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain",
        },
        body: JSON.stringify(masterPayload)
      });
      
      toast.success("ÄÃ£ gá»­i yÃªu cáº§u sao lÆ°u thÃ nh cÃ´ng! Dá»¯ liá»‡u Ä‘ang Ä‘Æ°á»£c xá»­ lÃ½ trÃªn Google Sheet.");
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
      console.error("Lá»—i Ä‘á»“ng bá»™ há»‡ thá»‘ng:", error);
      toast.error("Lá»—i Ä‘á»“ng bá»™ há»‡ thá»‘ng. Vui lÃ²ng kiá»ƒm tra láº¡i cáº¥u hÃ¬nh script.");
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
        toast.error('Vui lÃ²ng cho phÃ©p popup Ä‘á»ƒ tiáº¿p tá»¥c sao lÆ°u.');
        setIsBackingUp(false);
        return;
      }

      // 3. Wait for success message
      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
          window.removeEventListener('message', handleMessage);
          
          // 4. Perform Backup
          toast.info('Äang chuáº©n bá»‹ dá»¯ liá»‡u sao lÆ°u...');
          
          const backupData = [
            { collectionName: 'Dá»± Ã¡n', docs: projects },
            { collectionName: 'VÃ¹ng_KhuVá»±c', docs: regions },
            { collectionName: 'Loáº¡i_HÃ¬nh', docs: types },
            { collectionName: 'Team', docs: teams },
            { collectionName: 'NgÃ¢n_SÃ¡ch', docs: budgets },
            { collectionName: 'Thá»±c_Chi', docs: costs },
            { collectionName: 'Nháº­t_KÃ½', docs: auditLogs },
            { collectionName: 'NgÆ°á»i_DÃ¹ng', docs: allUsers }
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
            toast.success('Sao lÆ°u thÃ nh cÃ´ng!');
            if (result.spreadsheetUrl) {
              window.open(result.spreadsheetUrl, '_blank');
            }
          } else {
            toast.error('Sao lÆ°u tháº¥t báº¡i: ' + result.error);
          }
          setIsBackingUp(false);
        }
      };

      window.addEventListener('message', handleMessage);

    } catch (error) {
      console.error('Backup error:', error);
      toast.error('CÃ³ lá»—i xáº£y ra trong quÃ¡ trÃ¬nh sao lÆ°u.');
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
            // ThÃªm cÃ¡c trÆ°á»ng tiáº¿ng Viá»‡t theo yÃªu cáº§u user
            thoiGian: ts.toLocaleString('vi-VN'),
            hanhDong: log.action || 'N/A',
            nguoiChinhSua: log.userEmail || 'Há»‡ thá»‘ng',
            collection: log.collection || 'N/A',
            docId: log.docId || 'N/A',
            data: typeof log.data === 'object' ? JSON.stringify(log.data) : String(log.data)
          };
        });
      };

      const payload = {
        nhatKyHanhDong: sanitizeLogs(auditLogs.slice(0, 2000)) // TÄƒng giá»›i háº¡n lÃªn 2000 Ä‘á»ƒ bao quÃ¡t hÆ¡n
      };

      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
      });
      
      toast.success(`ÄÃ£ Ä‘á»“ng bá»™ ${Math.min(auditLogs.length, 2000)} nháº­t kÃ½ lÃªn Google Sheet.`);
    } catch (error) {
      console.error("Sync All Logs Error:", error);
      toast.error("Lá»—i khi Ä‘á»“ng bá»™ toÃ n bá»™ nháº­t kÃ½");
    } finally {
      setIsSyncingLogs(false);
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
      toast.success('ÄÃ£ cáº­p nháº­t quyá»n ngÆ°á»i dÃ¹ng');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleUpdateUserTeam = async (userId: string, teamName: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        teamName,
        updatedAt: serverTimestamp()
      });
      await logAction('UPDATE_USER_TEAM', 'users', userId, { teamName });
      toast.success('ÄÃ£ cáº­p nháº­t team ngÆ°á»i dÃ¹ng');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleAdminUpdateUserTeamAndBlock = async (userId: string, teamName: string, assignedBlock: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        teamName,
        assignedBlock,
        updatedAt: serverTimestamp()
      });
      await logAction('UPDATE_USER_STRUCTURE', 'users', userId, { teamName, assignedBlock });
      toast.success('ÄÃ£ cáº­p nháº­t cÆ¡ cáº¥u tá»• chá»©c ngÆ°á»i dÃ¹ng');
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
      toast.success('ÄÃ£ xÃ³a ngÆ°á»i dÃ¹ng');
      setIsDeleteUserDialogOpen(false);
      setUserToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'users');
    }
  };

  const sortedProjects = useMemo(() => {
    const q = (debouncedProjectSearch || '').toLowerCase().trim();
    let filtered = projects.filter(p => {
      const matchSearch = !q || (p.name || '').toLowerCase().includes(q) || (p.projectCode || '').toLowerCase().includes(q);
      const matchRegion = adminProjectRegionFilter === 'all' || p.region === adminProjectRegionFilter;
      const matchType = adminProjectTypeFilter === 'all' || p.type === adminProjectTypeFilter;
      
      // Role-based filtering
      const isSuperAdmin = userRole === 'super_admin';
      const isAdmin = userRole === 'admin';
      const isMod = userRole === 'mod';
      const isAccountant = userRole === 'accountant';
      const isUser = userRole === 'user';

      if (isSuperAdmin || isAdmin || isAccountant || isUser) return matchSearch && matchRegion && matchType;
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
  }, [projects, projectSort, debouncedProjectSearch, adminProjectRegionFilter, adminProjectTypeFilter, userRole, userProfile]);

  const paginatedProjects = useMemo(() => {
    const start = (projectPage - 1) * 20;
    return (sortedProjects || []).slice(start, start + 20);
  }, [sortedProjects, projectPage]);



  const sortedTeams = useMemo(() => {
    const q = (debouncedTeamSearch || '').toLowerCase().trim();
    let filtered = teams.filter(t => 
      !q ||
      (t.name || '').toLowerCase().includes(q) ||
      (t.teamCode || '').toLowerCase().includes(q)
    );

    return filtered.sort((a, b) => {
      let aValue = '';
      let bValue = '';
      if (teamSort.key === 'gdkd') {
        aValue = extractGDKD(a.name);
        bValue = extractGDKD(b.name);
      } else if (teamSort.key === 'blockName') {
        const aBlock = blocks.find(b => b.id === a.blockId || b.blockCode === a.blockCode);
        aValue = aBlock?.name || a.blockCode || '';
        const bBlock = blocks.find(b => b.id === b.blockId || b.blockCode === b.blockCode);
        bValue = bBlock?.name || b.blockCode || '';
      } else {
        aValue = a[teamSort.key] || '';
        bValue = b[teamSort.key] || '';
      }
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      if (aStr < bStr) return teamSort.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return teamSort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [teams, teamSort, debouncedTeamSearch, blocks]);

  const paginatedTeams = useMemo(() => {
    const start = (teamPage - 1) * 20;
    return (sortedTeams || []).slice(start, start + 20);
  }, [sortedTeams, teamPage]);

  const myBlockTeams = useMemo(() => {
    const block = currentActiveBlock;
    if (!block) return [];
    return teams.filter(t => isTeamInBlock(t, block));
  }, [currentActiveBlock, teams]);

  const myBlockBudgets = useMemo(() => {
    const block = currentActiveBlock;
    if (!block) return [];
    
    const blockTeamIds = new Set(myBlockTeams.map(t => t.id));
    const blockTeamNames = new Set(myBlockTeams.map(t => (t.name || '').toLowerCase().trim()));
    const blockTeamCodes = new Set(myBlockTeams.map(t => (t.teamCode || '').toLowerCase().trim()));

    return budgets.filter(b => {
      if (b.teamId && blockTeamIds.has(b.teamId)) return true;
      const tName = (b.teamName || '').toLowerCase().trim();
      const tCode = (b.teamCode || '').toLowerCase().trim();
      return blockTeamNames.has(tName) || blockTeamCodes.has(tCode);
    });
  }, [currentActiveBlock, myBlockTeams, budgets]);

  const myBlockCosts = useMemo(() => {
    const block = currentActiveBlock;
    if (!block) return [];
    
    const blockTeamIds = new Set(myBlockTeams.map(t => t.id));
    const blockTeamNames = new Set(myBlockTeams.map(t => (t.name || '').toLowerCase().trim()));
    const blockTeamCodes = new Set(myBlockTeams.map(t => (t.teamCode || '').toLowerCase().trim()));

    return costs.filter(c => {
      if (c.teamId && blockTeamIds.has(c.teamId)) return true;
      const tName = (c.teamName || '').toLowerCase().trim();
      const tCode = (c.teamCode || '').toLowerCase().trim();
      return blockTeamNames.has(tName) || blockTeamCodes.has(tCode);
    });
  }, [currentActiveBlock, myBlockTeams, costs]);

  const myBlockAcceptances = useMemo(() => {
    const block = currentActiveBlock;
    if (!block) return [];
    
    const blockTeamIds = new Set(myBlockTeams.map(t => t.id));
    const blockTeamNames = new Set(myBlockTeams.map(t => (t.name || '').toLowerCase().trim()));
    const blockTeamCodes = new Set(myBlockTeams.map(t => (t.teamCode || '').toLowerCase().trim()));

    return acceptances.filter(a => {
      if (a.teamId && blockTeamIds.has(a.teamId)) return true;
      const tName = (a.teamName || '').toLowerCase().trim();
      const tCode = (a.teamCode || '').toLowerCase().trim();
      return blockTeamNames.has(tName) || blockTeamCodes.has(tCode);
    });
  }, [currentActiveBlock, myBlockTeams, acceptances]);

  const myBlockFinalAcceptances = useMemo(() => {
    const block = currentActiveBlock;
    if (!block) return [];
    
    const blockTeamIds = new Set(myBlockTeams.map(t => t.id));
    const blockTeamNames = new Set(myBlockTeams.map(t => (t.name || '').toLowerCase().trim()));
    const blockTeamCodes = new Set(myBlockTeams.map(t => (t.teamCode || '').toLowerCase().trim()));

    return finalAcceptances.filter(fa => {
      if (fa.teamId && blockTeamIds.has(fa.teamId)) return true;
      const tName = (fa.teamName || '').toLowerCase().trim();
      const tCode = (fa.teamCode || '').toLowerCase().trim();
      return blockTeamNames.has(tName) || blockTeamCodes.has(tCode);
    });
  }, [currentActiveBlock, myBlockTeams, finalAcceptances]);

  const availableBudgetMonths = useMemo(() => {
    const list = Array.from(new Set(myBlockBudgets.map(b => b.month))).filter((m): m is string => typeof m === 'string' && !!m);
    list.sort((a, b) => a.localeCompare(b));
    return list;
  }, [myBlockBudgets]);

  const availableCostMonths = useMemo(() => {
    const list = Array.from(new Set(myBlockCosts.map(c => c.month))).filter((m): m is string => typeof m === 'string' && !!m);
    list.sort((a, b) => a.localeCompare(b));
    return list;
  }, [myBlockCosts]);

  const filteredBlockBudgets = useMemo(() => {
    if (!blockBudgetMonthFilter || blockBudgetMonthFilter === 'all') return myBlockBudgets;
    return myBlockBudgets.filter(b => b.month === blockBudgetMonthFilter);
  }, [myBlockBudgets, blockBudgetMonthFilter]);

  const filteredBlockCosts = useMemo(() => {
    if (!blockCostMonthFilter || blockCostMonthFilter === 'all') return myBlockCosts;
    return myBlockCosts.filter(c => c.month === blockCostMonthFilter);
  }, [myBlockCosts, blockCostMonthFilter]);

  const teamsNotInBlock = useMemo(() => {
    const block = currentActiveBlock;
    if (!block) return [];
    return teams.filter(t => !isTeamInBlock(t, block));
  }, [teams, currentActiveBlock]);

  const blockAggregatedData = useMemo(() => {
    const data: Record<string, { teamName: string; projectName: string; budgetTotal: number; costTotal: number }> = {};
    
    myBlockBudgets.forEach(b => {
      const key = `${b.teamName}_${b.projectId}`;
      if (!data[key]) {
        data[key] = { teamName: b.teamName || 'N/A', projectName: b.projectName || 'N/A', budgetTotal: 0, costTotal: 0 };
      }
      data[key].budgetTotal += b.amount || 0;
    });

    myBlockCosts.forEach(c => {
      const key = `${c.teamName}_${c.projectId}`;
      if (!data[key]) {
        data[key] = { teamName: c.teamName || 'N/A', projectName: c.projectName || 'N/A', budgetTotal: 0, costTotal: 0 };
      }
      data[key].costTotal += c.amount || 0;
    });

    return Object.values(data);
  }, [myBlockBudgets, myBlockCosts]);

  const currentActiveTeam = useMemo(() => {
    if (isGDKD && userProfile?.teamName) {
      const tn = String(userProfile.teamName).toLowerCase().trim();
      return teams.find(t => (t.name && String(t.name).toLowerCase().trim() === tn) || (t.teamCode && String(t.teamCode).toLowerCase().trim() === tn)) || null;
    }
    if (activeTeamMgmtId) {
      return teams.find(t => t.id === activeTeamMgmtId) || null;
    }
    if (userProfile?.teamName) {
      const tn = String(userProfile.teamName).toLowerCase().trim();
      const found = teams.find(t => (t.name && String(t.name).toLowerCase().trim() === tn) || (t.teamCode && String(t.teamCode).toLowerCase().trim() === tn));
      if (found) return found;
    }
    return teams[0] || null;
  }, [isGDKD, userProfile?.teamName, activeTeamMgmtId, teams]);

  const teamMembers = useMemo(() => {
    const activeTeam = currentActiveTeam;
    if (!activeTeam) return [];
    const targetTeam = (activeTeam.name || '').toLowerCase().trim();
    const targetCode = (activeTeam.teamCode || '').toLowerCase().trim();
    return allUsers.filter(u => {
      const uTeam = (u.teamName || '').toLowerCase().trim();
      return (targetTeam && uTeam === targetTeam) || (targetCode && uTeam === targetCode);
    });
  }, [allUsers, currentActiveTeam]);

  const myTeamCosts = useMemo(() => {
    const activeTeam = currentActiveTeam;
    if (!activeTeam) return [];
    const targetTeam = (activeTeam.name || '').toLowerCase().trim();
    const targetCode = (activeTeam.teamCode || '').toLowerCase().trim();
    const teamId = activeTeam.id;
    return costs.filter(c => {
      if (c.teamId && teamId && c.teamId === teamId) return true;
      const cTeam = (c.teamName || '').toLowerCase().trim();
      return (targetTeam && cTeam === targetTeam) || (targetCode && cTeam === targetCode);
    });
  }, [costs, currentActiveTeam]);

  const myTeam = currentActiveTeam;

  const myTeamBudgets = useMemo(() => {
    const activeTeam = currentActiveTeam;
    if (!activeTeam) return [];
    const targetTn = (activeTeam.name || '').toLowerCase().trim();
    const targetCode = (activeTeam.teamCode || '').toLowerCase().trim();
    const teamId = activeTeam.id;
    return budgets.filter(b => {
      if (b.teamId && teamId && b.teamId === teamId) return true;
      const bTeam = (b.teamName || '').toLowerCase().trim();
      return (targetTn && bTeam === targetTn) || (targetCode && bTeam === targetCode);
    });
  }, [budgets, currentActiveTeam]);

  const myTeamActualCosts = useMemo(() => {
    const activeTeam = currentActiveTeam;
    if (!activeTeam) return [];
    const targetTn = (activeTeam.name || '').toLowerCase().trim();
    const targetCode = (activeTeam.teamCode || '').toLowerCase().trim();
    const teamId = activeTeam.id;
    return costs.filter(c => {
      if (c.teamId && teamId && c.teamId === teamId) return true;
      const cTeam = (c.teamName || '').toLowerCase().trim();
      return (targetTn && cTeam === targetTn) || (targetCode && cTeam === targetCode);
    });
  }, [costs, currentActiveTeam]);

  const availableTeamBudgetMonths = useMemo(() => {
    const list = Array.from(new Set(myTeamBudgets.map(b => b.month))).filter((m): m is string => typeof m === 'string' && !!m);
    list.sort((a, b) => a.localeCompare(b));
    return list;
  }, [myTeamBudgets]);

  const availableTeamCostMonths = useMemo(() => {
    const list = Array.from(new Set(myTeamActualCosts.map(c => c.month))).filter((m): m is string => typeof m === 'string' && !!m);
    list.sort((a, b) => a.localeCompare(b));
    return list;
  }, [myTeamActualCosts]);

  const filteredTeamBudgets = useMemo(() => {
    if (!teamBudgetMonthFilter || teamBudgetMonthFilter === 'all') return myTeamBudgets;
    return myTeamBudgets.filter(b => b.month === teamBudgetMonthFilter);
  }, [myTeamBudgets, teamBudgetMonthFilter]);

  const filteredTeamActualCosts = useMemo(() => {
    if (!teamCostMonthFilter || teamCostMonthFilter === 'all') return myTeamActualCosts;
    return myTeamActualCosts.filter(c => c.month === teamCostMonthFilter);
  }, [myTeamActualCosts, teamCostMonthFilter]);

  const teamAggregatedData = useMemo(() => {
    if (!userProfile?.teamName) return [];
    const targetTeam = String(userProfile.teamName).toLowerCase().trim();
    const data: Record<string, { projectName: string; budgetTotal: number; costTotal: number }> = {};

    budgets
      .filter(b => (b.teamName || '').toLowerCase().trim() === targetTeam)
      .forEach(b => {
        const key = b.projectId;
        if (!data[key]) {
          data[key] = { projectName: b.projectName || 'N/A', budgetTotal: 0, costTotal: 0 };
        }
        data[key].budgetTotal += b.amount || 0;
      });

    costs
      .filter(c => (c.teamName || '').toLowerCase().trim() === targetTeam)
      .forEach(c => {
        const key = c.projectId;
        if (!data[key]) {
          data[key] = { projectName: c.projectName || 'N/A', budgetTotal: 0, costTotal: 0 };
        }
        data[key].costTotal += c.amount || 0;
      });

    return Object.values(data);
  }, [budgets, costs, userProfile?.teamName]);

  const isBudgetVisibleToUser = useCallback((b: any) => {
    if (isAdmin || isMod || isAccountant) return true;
    const userEmail = user?.email?.toLowerCase() || '';
    const budgetEmail = (b.userEmail || b.createdByEmail || '').toLowerCase();
    const isOwner = (budgetEmail && userEmail && budgetEmail === userEmail) || (b.createdBy === user?.uid);
    const isAssigned = (b.assignedUserEmail || '').toLowerCase() === userEmail;
    const isAssignedGDDA = isGDDA && (
      !userProfile?.assignedProjects || 
      userProfile.assignedProjects.length === 0 || 
      userProfile.assignedProjects.includes(b.projectId)
    );

    // Check same team for all team members (and GDKD)
    const myTeamName = (userProfile?.teamName || '').toLowerCase().trim();
    const bTeamName = (b.teamName || '').toLowerCase().trim();
    const activeTeam = currentActiveTeam;
    const activeTeamName = (activeTeam?.name || '').toLowerCase().trim();
    const activeTeamCode = (activeTeam?.teamCode || '').toLowerCase().trim();
    const bTeamCode = (b.teamCode || '').toLowerCase().trim();
    
    const isSameTeam = Boolean(
      (myTeamName && bTeamName && myTeamName === bTeamName) ||
      (activeTeamName && bTeamName && activeTeamName === bTeamName) ||
      (activeTeam?.id && b.teamId === activeTeam.id) ||
      (activeTeamCode && (bTeamName === activeTeamCode || bTeamCode === activeTeamCode))
    );

    // Check same block for GDKhoi
    const isSameBlock = isGDKhoi && (
      (currentActiveBlock && isTeamInBlock(b.teamId || b.teamName, currentActiveBlock)) ||
      (myBlockTeams && myBlockTeams.some((t: any) => t.id === b.teamId || t.name.toLowerCase().trim() === bTeamName))
    );

    return Boolean(isOwner || isAssigned || isAssignedGDDA || isSameTeam || isSameBlock);
  }, [isAdmin, isMod, isAccountant, isGDDA, isGDKhoi, user?.uid, user?.email, userProfile?.teamName, userProfile?.assignedProjects, currentActiveTeam, currentActiveBlock, myBlockTeams]);

  const safeArrayOfStrings = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val.filter(Boolean).map((x: any) => String(x).toLowerCase().trim());
    if (typeof val === 'string') return [val.toLowerCase().trim()];
    return [];
  };

  const myTeamNotifications = useMemo(() => {
    const userEmail = (user?.email || '').toLowerCase().trim();
    const myTeamName = (userProfile?.teamName || '').toLowerCase().trim();
    const myTeamId = userProfile?.teamId || '';
    const activeTeam = currentActiveTeam;
    const activeTeamName = (activeTeam?.name || '').toLowerCase().trim();
    const activeTeamCode = (activeTeam?.teamCode || '').toLowerCase().trim();
    const activeTeamId = activeTeam?.id || '';

    return teamNotifications.filter(n => {
      // 1. Super Admin, Admin, Accountant, Mod can see all notifications
      if (isAdmin || isSuperAdmin || isMod || isAccountant) return true;

      // 2. Creator or any user who has registered/modified/contributed to this budget
      const recipients = Array.from(new Set([
        ...safeArrayOfStrings(n.recipients),
        ...safeArrayOfStrings(n.previousRegistrants),
        ...safeArrayOfStrings(n.targetEmails)
      ]));
      const creatorEmail = (n.creatorEmail || n.userEmail || n.createdByEmail || '').toLowerCase().trim();
      const editorEmail = (n.editorEmail || '').toLowerCase().trim();

      if (userEmail && (
        recipients.includes(userEmail) ||
        creatorEmail === userEmail ||
        editorEmail === userEmail ||
        (n.createdBy && n.createdBy === user?.uid)
      )) {
        return true;
      }

      // 3. Team match (active team or user's assigned team)
      const nTeamId = n.teamId || '';
      const nTeamName = (n.teamName || '').toLowerCase().trim();
      const nTeamCode = (n.teamCode || '').toLowerCase().trim();

      if (activeTeamId && nTeamId && nTeamId === activeTeamId) return true;
      if (activeTeamName && nTeamName && (nTeamName === activeTeamName || nTeamName === activeTeamCode || (nTeamCode && nTeamCode === activeTeamCode))) return true;
      if (myTeamId && nTeamId && nTeamId === myTeamId) return true;
      if (myTeamName && nTeamName && (nTeamName === myTeamName || (nTeamCode && nTeamCode === myTeamName))) return true;

      // 4. GDDA / GDKhoi check
      if (isGDDA && n.projectId && (!userProfile?.assignedProjects || userProfile.assignedProjects.length === 0 || userProfile.assignedProjects.includes(n.projectId))) {
        return true;
      }
      if (isGDKhoi && isTeamInBlock(nTeamId || nTeamName, currentActiveBlock)) {
        return true;
      }

      return false;
    });
  }, [teamNotifications, user?.email, user?.uid, userProfile?.teamName, userProfile?.teamId, userProfile?.assignedProjects, currentActiveTeam, currentActiveBlock, isAdmin, isSuperAdmin, isMod, isAccountant, isGDDA, isGDKhoi]);

  const unreadTeamNotifCount = useMemo(() => {
    const userEmail = (user?.email || '').toLowerCase().trim();
    if (!userEmail) return 0;
    return myTeamNotifications.filter(n => {
      const readList = safeArrayOfStrings(n.readBy);
      return !readList.includes(userEmail);
    }).length;
  }, [myTeamNotifications, user?.email]);

  const markTeamNotifAsRead = async (notifId: string) => {
    const userEmail = (user?.email || '').toLowerCase().trim();
    if (!userEmail) return;
    try {
      const notifRef = doc(db, 'teamNotifications', notifId);
      await updateDoc(notifRef, {
        readBy: arrayUnion(userEmail)
      });
    } catch (e) {
      console.warn('Failed to mark notification as read', e);
    }
  };

  const markAllTeamNotifsAsRead = async () => {
    const userEmail = (user?.email || '').toLowerCase().trim();
    if (!userEmail) return;
    try {
      const unread = myTeamNotifications.filter(n => {
        const readList = safeArrayOfStrings(n.readBy);
        return !readList.includes(userEmail);
      });
      if (unread.length === 0) return;
      const batch = writeBatch(db);
      unread.forEach(n => {
        batch.update(doc(db, 'teamNotifications', n.id), {
          readBy: arrayUnion(userEmail)
        });
      });
      await batch.commit();
      toast.success('ÄÃ£ Ä‘Ã¡nh dáº¥u Ä‘Ã£ Ä‘á»c táº¥t cáº£ thÃ´ng bÃ¡o');
    } catch (e) {
      console.warn('Failed to mark all as read', e);
    }
  };

  const sendBudgetChangeNotification = async ({
    budgetId,
    projectId,
    projectName,
    teamId,
    teamName,
    teamCode,
    month,
    oldAmount,
    newAmount,
    editorName,
    editorEmail,
    reason,
    originalBudget,
    subBudgetsList = []
  }: {
    budgetId: string;
    projectId: string;
    projectName: string;
    teamId: string;
    teamName: string;
    teamCode?: string;
    month: string;
    oldAmount: number;
    newAmount: number;
    editorName: string;
    editorEmail: string;
    reason?: string;
    originalBudget?: any;
    subBudgetsList?: any[];
  }) => {
    try {
      const creatorEmail = (originalBudget?.userEmail || originalBudget?.createdByEmail || '').toLowerCase().trim();
      const assignedEmail = (originalBudget?.assignedUserEmail || '').toLowerCase().trim();
      const origSubEmails = (originalBudget?.subBudgets || []).map((s: any) => (s.userEmail || s.email || '').toLowerCase().trim()).filter(Boolean);
      const currSubEmails = subBudgetsList.map((s: any) => (s.userEmail || s.email || '').toLowerCase().trim()).filter(Boolean);
      const historyEmails = (originalBudget?.editHistory || []).map((h: any) => (h.editorEmail || '').toLowerCase().trim()).filter(Boolean);

      // Collect all affected user emails (creator, all users with subBudgets, previous editors)
      const allRecipients = Array.from(new Set([
        creatorEmail,
        assignedEmail,
        ...origSubEmails,
        ...currSubEmails,
        ...historyEmails
      ])).filter(Boolean);

      const diff = newAmount - (oldAmount || 0);
      const diffStr = diff > 0 ? `+${formatCurrency(diff)}` : (diff < 0 ? `-${formatCurrency(Math.abs(diff))}` : '0Ä‘');

      const notifTitle = `NgÃ¢n sÃ¡ch dá»± Ã¡n ${projectName} (${month}) Ä‘Ã£ Ä‘Æ°á»£c thay Ä‘á»•i`;
      const notifMessage = `NgÃ¢n sÃ¡ch Ä‘Äƒng kÃ½ dá»± Ã¡n ${projectName} (${month}) Ä‘Ã£ Ä‘Æ°á»£c ${editorName} cáº­p nháº­t: ${formatCurrency(oldAmount || 0)} âžœ ${formatCurrency(newAmount)} (${diffStr}).${reason ? ` LÃ½ do: ${reason}` : ''}`;

      await addDoc(collection(db, 'teamNotifications'), {
        type: 'BUDGET_CHANGED',
        budgetId,
        projectId,
        projectName,
        teamId,
        teamName,
        teamCode: teamCode || originalBudget?.teamCode || extractTeamCode(teamName),
        month,
        oldAmount: oldAmount || 0,
        newAmount,
        difference: diff,
        editorName,
        editorEmail: (editorEmail || '').toLowerCase().trim(),
        creatorEmail,
        createdBy: originalBudget?.createdBy || '',
        recipients: allRecipients,
        previousRegistrants: allRecipients,
        targetEmails: allRecipients,
        title: notifTitle,
        message: notifMessage,
        reason: reason || '',
        createdAt: serverTimestamp(),
        readBy: editorEmail ? [editorEmail.toLowerCase().trim()] : []
      });
    } catch (err) {
      console.warn('Failed to send budget change notification:', err);
    }
  };

  const handleCreateBlock = async () => {
    if (!blockNameInput.trim() || !blockCodeInput.trim()) {
      toast.error("Vui lÃ²ng nháº­p MÃ£ Khá»‘i vÃ  TÃªn Khá»‘i!");
      return;
    }
    const finalPrefix = blockPrefixInput.trim() || blockCodeInput.trim().toUpperCase();
    try {
      const q = query(collection(db, 'blocks'), where('blockCode', '==', blockCodeInput.trim().toUpperCase()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        toast.error("MÃ£ Khá»‘i nÃ y Ä‘Ã£ tá»“n táº¡i trÃªn há»‡ thá»‘ng!");
        return;
      }

      const blockRef = await addDoc(collection(db, 'blocks'), {
        name: blockNameInput.trim(),
        blockCode: blockCodeInput.trim().toUpperCase(),
        teamPrefix: finalPrefix.toUpperCase(),
        directorUid: blockDirectorUid || null,
        assistantUids: createBlockAssistantUids || [],
        createdAt: serverTimestamp(),
        createdBy: user?.uid
      });

      // Update GÄ Khá»‘i user and their role
      if (blockDirectorUid) {
        const targetUser = allUsers.find(u => u.uid === blockDirectorUid || u.id === blockDirectorUid);
        if (targetUser) {
          await updateDoc(doc(db, 'users', targetUser.id), {
            assignedBlock: blockCodeInput.trim().toUpperCase(),
            role: 'gd_khoi'
          });
        }
      }

      // Update Trá»£ lÃ½ Khá»‘i users and their role
      if (createBlockAssistantUids.length > 0) {
        for (const astUid of createBlockAssistantUids) {
          const targetUser = allUsers.find(u => u.uid === astUid || u.id === astUid);
          if (targetUser && targetUser.role !== 'admin' && targetUser.role !== 'super_admin' && targetUser.role !== 'gd_khoi') {
            await updateDoc(doc(db, 'users', targetUser.id), {
              assignedBlock: blockCodeInput.trim().toUpperCase(),
              role: 'tro_ly_khoi'
            });
          }
        }
      }

      // Assign selected teams to this new block
      if (selectedTeamIdsForNewBlock.length > 0) {
        for (const teamId of selectedTeamIdsForNewBlock) {
          await updateDoc(doc(db, 'teams', teamId), {
            blockId: blockRef.id,
            blockCode: blockCodeInput.trim().toUpperCase()
          });
          await logAction('UPDATE', 'teams', teamId, { blockId: blockRef.id, blockCode: blockCodeInput.trim().toUpperCase() });
        }
      }

      await logAction('CREATE', 'blocks', blockRef.id, { name: blockNameInput, blockCode: blockCodeInput, assistantUids: createBlockAssistantUids });
      toast.success("Táº¡o Khá»‘i má»›i thÃ nh cÃ´ng!");
      
      // Reset inputs & close dialog
      setBlockNameInput('');
      setBlockCodeInput('');
      setBlockPrefixInput('');
      setBlockDirectorUid('');
      setCreateBlockAssistantUids([]);
      setCreateBlockTeamSearch('');
      setSelectedTeamIdsForNewBlock([]);
      setIsCreateBlockDialogOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'blocks');
    }
  };

  const handleOpenEditBlockDialog = () => {
    const block = currentActiveBlock;
    if (!block) {
      toast.error("Vui lÃ²ng chá»n má»™t khá»‘i Ä‘á»ƒ chá»‰nh sá»­a!");
      return;
    }
    setEditBlockNameInput(block.name || '');
    setEditBlockCodeInput(block.blockCode || '');
    setEditBlockPrefixInput(block.teamPrefix || '');
    setEditBlockDirectorUid(block.directorUid || '');
    setEditBlockAssistantUids(Array.isArray(block.assistantUids) ? block.assistantUids : []);
    setIsEditBlockDialogOpen(true);
  };

  const handleUpdateBlock = async () => {
    const block = currentActiveBlock;
    if (!block) {
      toast.error("Vui lÃ²ng chá»n má»™t Khá»‘i!");
      return;
    }
    if (!editBlockNameInput.trim() || !editBlockCodeInput.trim()) {
      toast.error("MÃ£ Khá»‘i vÃ  TÃªn Khá»‘i khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng!");
      return;
    }

    const newCode = editBlockCodeInput.trim().toUpperCase();
    const newName = editBlockNameInput.trim();
    const newPrefix = editBlockPrefixInput.trim().toUpperCase() || newCode;
    const newDirectorUid = editBlockDirectorUid || null;

    try {
      // Check duplicate blockCode if changed
      if (newCode !== block.blockCode) {
        const q = query(collection(db, 'blocks'), where('blockCode', '==', newCode));
        const snap = await getDocs(q);
        if (!snap.empty) {
          toast.error("MÃ£ Khá»‘i nÃ y Ä‘Ã£ tá»“n táº¡i trÃªn há»‡ thá»‘ng!");
          return;
        }
      }

      const blockRef = doc(db, 'blocks', block.id);
      await updateDoc(blockRef, {
        name: newName,
        blockCode: newCode,
        teamPrefix: newPrefix,
        directorUid: newDirectorUid,
        assistantUids: editBlockAssistantUids || []
      });
      await logAction('UPDATE', 'blocks', block.id, { name: newName, blockCode: newCode, teamPrefix: newPrefix, directorUid: newDirectorUid, assistantUids: editBlockAssistantUids });

      // If blockCode changed, update all teams belonging to this block to matching blockCode
      if (newCode !== block.blockCode) {
        const affectedTeams = teams.filter(t => t.blockId === block.id || t.blockCode === block.blockCode);
        for (const t of affectedTeams) {
          await updateDoc(doc(db, 'teams', t.id), {
            blockCode: newCode
          });
          await logAction('UPDATE', 'teams', t.id, { blockCode: newCode });
        }
      }

      // Update director user profile if specified
      if (newDirectorUid && newDirectorUid !== block.directorUid) {
        const targetUser = allUsers.find(u => u.uid === newDirectorUid || u.id === newDirectorUid);
        if (targetUser) {
          await updateDoc(doc(db, 'users', targetUser.id), {
            assignedBlock: newCode,
            role: 'gd_khoi'
          });
        }
      }

      // Update assistants user profiles
      if (editBlockAssistantUids && editBlockAssistantUids.length > 0) {
        for (const astUid of editBlockAssistantUids) {
          const targetUser = allUsers.find(u => u.uid === astUid || u.id === astUid);
          if (targetUser && targetUser.role !== 'admin' && targetUser.role !== 'super_admin' && targetUser.role !== 'gd_khoi') {
            await updateDoc(doc(db, 'users', targetUser.id), {
              assignedBlock: newCode,
              role: 'tro_ly_khoi'
            });
          }
        }
      }

      toast.success("Cáº­p nháº­t thÃ´ng tin Khá»‘i thÃ nh cÃ´ng!");
      setIsEditBlockDialogOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'blocks');
    }
  };

  const handleRemoveTeamFromBlockDirect = async (teamId: string, teamName: string) => {
    const block = currentActiveBlock;
    if (!block) return;
    if (!window.confirm(`Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a phÃ²ng kinh doanh "${teamName}" khá»i Khá»‘i? (ThÃ´ng tin phÃ²ng kinh doanh nÃ y váº«n sáº½ Ä‘Æ°á»£c lÆ°u Ä‘á»™c láº­p trÃªn há»‡ thá»‘ng)`)) return;
    try {
      await updateDoc(doc(db, 'teams', teamId), {
        blockId: 'unassigned',
        blockCode: 'unassigned'
      });
      await logAction('UPDATE', 'teams', teamId, { blockId: 'unassigned', blockCode: 'unassigned' });
      toast.success(`ÄÃ£ xÃ³a phÃ²ng "${teamName}" khá»i Khá»‘i thÃ nh cÃ´ng!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'teams');
    }
  };

  const handleCreateAndAssignTeam = async () => {
    if (!newBlockTeamName.trim()) {
      toast.error("Vui lÃ²ng nháº­p tÃªn PhÃ²ng Kinh Doanh!");
      return;
    }
    let finalCode = newBlockTeamCode.trim().toUpperCase();
    if (!finalCode) {
      finalCode = extractTeamCode(newBlockTeamName);
    }
    const prefix = (currentActiveBlock?.teamPrefix || '').toUpperCase().trim();
    if (prefix && !finalCode.startsWith(prefix)) {
      finalCode = `${prefix}${finalCode}`;
    }

    const nameDup = teams.some(t => t.name.toLowerCase().trim() === newBlockTeamName.toLowerCase().trim());
    if (nameDup) {
      toast.error("TÃªn PhÃ²ng Kinh Doanh Ä‘Ã£ tá»“n táº¡i!");
      return;
    }
    const codeDup = teams.some(t => (t.teamCode || '').toUpperCase().trim() === finalCode);
    if (codeDup) {
      toast.error(`MÃ£ phÃ²ng "${finalCode}" Ä‘Ã£ tá»“n táº¡i! Vui lÃ²ng chá»n mÃ£ khÃ¡c.`);
      return;
    }

    setIsCreatingBlockTeam(true);
    try {
      const docRef = await addDoc(collection(db, 'teams'), {
        name: newBlockTeamName.trim(),
        teamCode: finalCode,
        blockId: currentActiveBlock?.id || '',
        blockCode: currentActiveBlock?.blockCode || '',
        createdAt: serverTimestamp(),
        createdBy: user?.uid
      });
      await logAction('CREATE', 'teams', docRef.id, { name: newBlockTeamName, teamCode: finalCode, blockId: currentActiveBlock?.id });
      toast.success(`ÄÃ£ táº¡o vÃ  gÃ¡n PhÃ²ng Kinh Doanh "${newBlockTeamName}" (${finalCode}) vÃ o Khá»‘i!`);
      setNewBlockTeamName('');
      setNewBlockTeamCode('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'teams');
    } finally {
      setIsCreatingBlockTeam(false);
    }
  };

  const handleAddTeamToBlockDirect = async (teamId: string) => {
    const block = currentActiveBlock;
    if (!block) {
      toast.error("KhÃ´ng tÃ¬m tháº¥y Khá»‘i nÃ o Ä‘ang hoáº¡t Ä‘á»™ng!");
      return;
    }
    const targetTeam = teams.find(t => t.id === teamId);
    if (!targetTeam) {
      toast.error("KhÃ´ng tÃ¬m tháº¥y phÃ²ng kinh doanh!");
      return;
    }
    if (!window.confirm(`Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n thÃªm phÃ²ng kinh doanh "${targetTeam.name}" vÃ o Khá»‘i "${block.name}"?`)) return;
    try {
      await updateDoc(doc(db, 'teams', teamId), {
        blockId: block.id,
        blockCode: block.blockCode
      });
      await logAction('UPDATE', 'teams', teamId, { blockId: block.id, blockCode: block.blockCode });
      toast.success(`ÄÃ£ thÃªm phÃ²ng "${targetTeam.name}" vÃ o Khá»‘i thÃ nh cÃ´ng!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'teams');
    }
  };

  const handleDeleteTeamFromSystem = async (teamId: string, teamName: string) => {
    if (!window.confirm(`Báº¡n cÃ³ cháº¯c muá»‘n XÃ“A VÄ¨NH VIá»„N team "${teamName}" khá»i há»‡ thá»‘ng? Äiá»u nÃ y khÃ´ng thá»ƒ khÃ´i phá»¥c vÃ  sáº½ há»§y gÃ¡n khá»i má»i tÃ i khoáº£n liÃªn quan.`)) return;
    try {
      await deleteDoc(doc(db, 'teams', teamId));
      await logAction('DELETE', 'teams', teamId, { name: teamName });
      toast.success(`ÄÃ£ xÃ³a vÄ©nh viá»…n team "${teamName}" thÃ nh cÃ´ng!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'teams');
    }
  };

  const handleAddBlockBudget = async () => {
    if (!blockBudgetProject || !blockBudgetTeam || !blockBudgetAmount || !blockBudgetMonth || !blockBudgetImplementer) {
      toast.error("Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ thÃ´ng tin ngÃ¢n sÃ¡ch!");
      return;
    }
    const amt = parseVal(blockBudgetAmount);
    if (amt <= 0) {
      toast.error("Vui lÃ²ng nháº­p ngÃ¢n sÃ¡ch lá»›n hÆ¡n 0!");
      return;
    }
    const selectedProject = projects.find(p => p.id === blockBudgetProject);
    const selectedTeam = teams.find(t => t.id === blockBudgetTeam);
    
    const existsInDb = budgets.some(
      b => b.teamId === blockBudgetTeam && b.projectId === blockBudgetProject && b.month === blockBudgetMonth
    );
    if (existsInDb) {
      toast.error(`Team "${selectedTeam?.name || 'N/A'}" Ä‘Ã£ Ä‘Äƒng kÃ½ ngÃ¢n sÃ¡ch cho dá»± Ã¡n "${selectedProject?.name || 'N/A'}" trong ká»³ ${blockBudgetMonth}. Má»—i dá»± Ã¡n chá»‰ Ä‘Æ°á»£c Ä‘Äƒng kÃ½ 1 ngÃ¢n sÃ¡ch trong 1 ká»³.`);
      return;
    }
    
    try {
      const docRef = await addDoc(collection(db, 'budgets'), {
        projectId: blockBudgetProject,
        projectName: selectedProject?.name || 'N/A',
        teamId: blockBudgetTeam,
        teamName: selectedTeam?.name || 'N/A',
        teamCode: selectedTeam?.teamCode || extractTeamCode(selectedTeam?.name || ''),
        implementerName: blockBudgetImplementer,
        month: blockBudgetMonth,
        amount: amt,
        createdAt: serverTimestamp(),
        createdBy: user?.uid,
        userEmail: user?.email?.toLowerCase()
      });
      await logAction('CREATE', 'budgets', docRef.id, { projectId: blockBudgetProject, teamName: selectedTeam?.name, amount: amt });
      toast.success("ÄÄƒng kÃ½ ngÃ¢n sÃ¡ch thÃ nh cÃ´ng!");
      setBlockBudgetAmount('');
      setBlockBudgetImplementer('');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'budgets');
    }
  };

  const handleAddBlockCost = async () => {
    if (!blockCostProject || !blockCostTeam || !blockCostAmount || !blockCostMonth) {
      toast.error("Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ thÃ´ng tin chi phÃ­!");
      return;
    }
    const amt = parseVal(blockCostAmount);
    if (amt <= 0) {
      toast.error("Vui lÃ²ng nháº­p chi phÃ­ lá»›n hÆ¡n 0!");
      return;
    }
    const selectedProject = projects.find(p => p.id === blockCostProject);
    const selectedTeam = teams.find(t => t.id === blockCostTeam);
    
    const fb = parseVal(blockCostFb);
    const gg = parseVal(blockCostGoogle);
    const zl = parseVal(blockCostZalo);
    const post = parseVal(blockCostPosting);
    const ot = parseVal(blockCostOther) || (amt - fb - gg - zl - post);

    const matchBudget = budgets.find(b => b.projectId === blockCostProject && b.teamId === blockCostTeam && b.month === blockCostMonth);

    try {
      const docRef = await addDoc(collection(db, 'costs'), {
        projectId: blockCostProject,
        projectName: selectedProject?.name || 'N/A',
        teamId: blockCostTeam,
        teamName: selectedTeam?.name || 'N/A',
        teamCode: selectedTeam?.teamCode || extractTeamCode(selectedTeam?.name || ''),
        budgetId: matchBudget?.id || null,
        implementerName: blockCostNote || 'GÄ Khá»‘i ghi nháº­n',
        weekNumber: 1,
        year: new Date(blockCostMonth).getFullYear().toString(),
        month: blockCostMonth,
        amount: amt,
        channels: {
          fbAds: fb,
          googleAds: gg,
          zaloAds: zl,
          posting: post,
          otherCost: ot
        },
        note: blockCostNote || 'GÄ Khá»‘i ghi nháº­n chi phÃ­',
        createdAt: serverTimestamp(),
        createdBy: user?.uid,
        userEmail: user?.email?.toLowerCase()
      });
      await logAction('CREATE', 'costs', docRef.id, { projectId: blockCostProject, teamName: selectedTeam?.name, amount: amt });
      toast.success("ThÃªm chi phÃ­ thá»±c táº¿ thÃ nh cÃ´ng!");
      setBlockCostAmount('');
      setBlockCostNote('');
      setBlockCostFb('');
      setBlockCostZalo('');
      setBlockCostGoogle('');
      setBlockCostPosting('');
      setBlockCostOther('');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'costs');
    }
  };

  const handleSaveOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingName.trim() || !onboardingTeam) {
      toast.error('Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ thÃ´ng tin');
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
      toast.success('ThÃ´ng tin Ä‘Ã£ Ä‘Æ°á»£c cáº­p nháº­t');
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
          region: newProjectRegion || 'ChÆ°a xÃ¡c Ä‘á»‹nh',
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
      toast.success(`ÄÃ£ thÃªm ${successCount} dá»± Ã¡n má»›i`);
    }
    if (duplicateCount > 0) {
      toast.warning(`${duplicateCount} dá»± Ã¡n Ä‘Ã£ tá»“n táº¡i vÃ  bá»‹ bá» qua`);
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
          toast.error("File Excel khÃ´ng cÃ³ dá»¯ liá»‡u.");
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

          const name = String(getVal(['TÃªn dá»± Ã¡n', 'Dá»± Ã¡n', 'Project', 'Project Name', 'tenduan', 'tÃªn dá»± Ã¡n']) || '').trim();
          const code = String(getVal(['MÃ£ Dá»± Ã¡n', 'MÃ£', 'Code', 'Project Code', 'maduan', 'mÃ£ dá»± Ã¡n']) || '').trim();
          const region = String(getVal(['Miá»n', 'Khu vá»±c', 'VÃ¹ng', 'Region', 'mien', 'khuvuc', 'vÃ¹ng']) || '').trim();
          const type = String(getVal(['Loáº¡i hÃ¬nh', 'Type', 'loaihinh', 'loáº¡i hÃ¬nh']) || '').trim();

          if (!name) {
            if (Object.values(row).some(v => v !== '')) {
              errorDetailsList.push(`DÃ²ng ${rowIndex}: Thiáº¿u tÃªn dá»± Ã¡n.`);
              errorsCount++;
            }
            continue;
          }

          if (existingNames.has(name.toLowerCase())) {
            errorDetailsList.push(`DÃ²ng ${rowIndex}: Dá»± Ã¡n "${name}" Ä‘Ã£ tá»“n táº¡i.`);
            errorsCount++;
            continue;
          }

          const projectCode = code || extractProjectCode(name);
          
          const docRef = doc(collection(db, 'projects'));
          batch.set(docRef, {
            name,
            projectCode,
            region: region || 'ChÆ°a xÃ¡c Ä‘á»‹nh',
            type: type || 'ChÆ°a phÃ¢n loáº¡i',
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
          toast.success(`ÄÃ£ thÃªm ${count} dá»± Ã¡n má»›i tá»« Excel.`);
        }

        if (errorsCount > 0) {
          setImportErrors(errorDetailsList);
          setIsImportErrorsDialogOpen(true);
        }

        if (count === 0 && errorsCount > 0) {
          toast.error("KhÃ´ng cÃ³ dá»± Ã¡n há»£p lá»‡ nÃ o Ä‘Æ°á»£c thÃªm.");
        }
      } catch (error) {
        console.error(error);
        toast.error("Lá»—i khi xá»­ lÃ½ file Excel.");
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
    toast.info(`Äang thÃªm ${names.length} team...`);
    let successCount = 0;
    let duplicateCount = 0;
    const existingNames = new Set(teams.map(t => t.name.toLowerCase()));

    for (const rawName of names) {
      const name = normalizeTeamName(rawName);
      if (existingNames.has(name.toLowerCase())) {
        duplicateCount++;
        continue;
      }

      const teamCode = normalizeTeamCode(extractTeamCode(name));

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
      toast.success(`ÄÃ£ thÃªm ${successCount} team má»›i`);
    }
    if (duplicateCount > 0) {
      toast.warning(`${duplicateCount} team Ä‘Ã£ tá»“n táº¡i vÃ  bá»‹ bá» qua`);
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
      toast.success('ÄÃ£ cáº­p nháº­t dá»± Ã¡n');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'projects');
    }
  };

  const handleSyncProjectCodes = async () => {
    setIsSyncingProjects(true);
    try {
      let count = 0;
      const ops: any[] = [];
      projects.forEach(p => {
        if (!p.projectCode) {
          const code = extractProjectCode(p.name);
          if (code) {
            ops.push({ ref: doc(db, 'projects', p.id), data: { projectCode: code, updatedAt: serverTimestamp() } });
            count++;
          }
        }
      });

      if (ops.length > 0) {
        for (let i = 0; i < ops.length; i += 450) {
          const batch = writeBatch(db);
          ops.slice(i, i + 450).forEach(op => batch.update(op.ref, op.data));
          await batch.commit();
        }
        await logAction('SYNC_PROJECT_CODES', 'projects', 'all', { count });
        toast.success(`ÄÃ£ cáº­p nháº­t mÃ£ cho ${count} dá»± Ã¡n`);
      } else {
        toast.info('Táº¥t cáº£ dá»± Ã¡n Ä‘Ã£ cÃ³ mÃ£ hoáº·c khÃ´ng tÃ¬m tháº¥y mÃ£ há»£p lá»‡ trong tÃªn');
      }
    } catch (error) {
      console.error('Error syncing project codes:', error);
      toast.error('Lá»—i khi Ä‘á»“ng bá»™ mÃ£ dá»± Ã¡n');
    } finally {
      setIsSyncingProjects(false);
    }
  };

  const handleSyncTeamCodes = async () => {
    setIsSyncingTeams(true);
    try {
      let count = 0;
      const ops: any[] = [];
      teams.forEach(t => {
        const normName = normalizeTeamName(t.name);
        const normCode = normalizeTeamCode(t.teamCode || extractTeamCode(t.name));
        if ((normCode && t.teamCode !== normCode) || (normName && t.name !== normName)) {
          ops.push({ 
            ref: doc(db, 'teams', t.id), 
            data: { 
              name: normName,
              teamCode: normCode, 
              updatedAt: serverTimestamp() 
            } 
          });
          count++;
        }
      });

      if (ops.length > 0) {
        for (let i = 0; i < ops.length; i += 450) {
          const batch = writeBatch(db);
          ops.slice(i, i + 450).forEach(op => batch.update(op.ref, op.data));
          await batch.commit();
        }
        await logAction('SYNC_TEAM_CODES', 'teams', 'all', { count });
        toast.success(`ÄÃ£ chuáº©n hÃ³a vÃ  Ä‘á»“ng bá»™ tÃªn/mÃ£ cho ${count} team (quy táº¯c MAYxx.xx)`);
      } else {
        toast.info('Táº¥t cáº£ mÃ£ vÃ  tÃªn team Ä‘Ã£ chuáº©n hÃ³a theo Ä‘Ãºng quy táº¯c (vÃ­ dá»¥ MAY14, MAY79.56, MAY36.01)');
      }
    } catch (error) {
      console.error('Error syncing team codes:', error);
      toast.error('Lá»—i khi Ä‘á»“ng bá»™ mÃ£ team');
    } finally {
      setIsSyncingTeams(false);
    }
  };

  const handleSyncBudgetPermissions = async () => {
    setIsSyncingBudgetPermissions(true);
    try {
      let count = 0;
      const ops: any[] = [];
      
      budgets.forEach(b => {
        const implementer = b.implementerName || '';
        const emailMatch = extractEmail(implementer);
        
        if (emailMatch && (b.assignedUserEmail !== emailMatch || b.userEmail !== emailMatch)) {
          ops.push({
            ref: doc(db, 'budgets', b.id),
            data: { 
              assignedUserEmail: emailMatch,
              userEmail: emailMatch,
              updatedAt: serverTimestamp(),
              updatedBy: user?.uid
            }
          });
          count++;
        }
      });
      
      costs.forEach(c => {
        if (c.budgetId) {
          const parentBudget = budgets.find(b => b.id === c.budgetId);
          const budgetEmail = parentBudget?.assignedUserEmail || extractEmail(parentBudget?.implementerName || '');
          
          if (budgetEmail && (c.assignedUserEmail !== budgetEmail || c.userEmail !== budgetEmail)) {
            ops.push({
              ref: doc(db, 'costs', c.id),
              data: { 
                assignedUserEmail: budgetEmail,
                userEmail: budgetEmail,
                updatedAt: serverTimestamp()
              }
            });
            count++;
          }
        }
      });

      if (ops.length > 0) {
        for (let i = 0; i < ops.length; i += 450) {
          const batch = writeBatch(db);
          ops.slice(i, i + 450).forEach(op => batch.update(op.ref, op.data));
          await batch.commit();
        }
        await logAction('SYNC_BUDGET_PERMISSIONS', 'budgets', 'all', { count });
        toast.success(`ÄÃ£ Ä‘á»“ng bá»™ phÃ¢n quyá»n cho ${count} báº£n ghi`);
      } else {
        toast.info('Táº¥t cáº£ dá»¯ liá»‡u Ä‘Ã£ Ä‘Æ°á»£c Ä‘á»“ng bá»™ phÃ¢n quyá»n');
      }
    } catch (error) {
      console.error('Error syncing budget permissions:', error);
      toast.error('Lá»—i khi Ä‘á»“ng bá»™ phÃ¢n quyá»n ngÃ¢n sÃ¡ch');
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
      toast.success('ÄÃ£ xÃ³a dá»± Ã¡n');
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
      toast.success(`ÄÃ£ xÃ³a ${selectedProjectIds.length} dá»± Ã¡n`);
      setSelectedProjectIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'projects');
    } finally {
      setIsDeletingProjects(false);
    }
  };

  const handleBulkUpdateProjectRegion = async () => {
    if (selectedProjectIds.length === 0 || !selectedRegionForBulk) {
      toast.error('Vui lÃ²ng chá»n dá»± Ã¡n vÃ  vÃ¹ng/khu vá»±c');
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
      toast.success(`ÄÃ£ cáº­p nháº­t vÃ¹ng/khu vá»±c cho ${selectedProjectIds.length} dá»± Ã¡n`);
      setSelectedProjectIds([]);
      setSelectedRegionForBulk('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'projects');
    }
  };

  const handleBulkUpdateProjectType = () => {
    if (selectedProjectIds.length === 0 || !selectedTypeForBulk) {
      toast.error('Vui lÃ²ng chá»n dá»± Ã¡n vÃ  loáº¡i hÃ¬nh');
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
      toast.success(`ÄÃ£ cáº­p nháº­t loáº¡i hÃ¬nh cho ${selectedProjectIds.length} dá»± Ã¡n`);
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
      toast.success('ÄÃ£ xÃ³a táº¥t cáº£ dá»± Ã¡n');
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
      toast.success('ÄÃ£ cáº­p nháº­t team');
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
      toast.success('ÄÃ£ xÃ³a team');
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
      toast.success(`ÄÃ£ xÃ³a ${selectedTeamIds.length} team`);
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
      toast.success('ÄÃ£ xÃ³a táº¥t cáº£ team');
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
    toast.info(`Äang thÃªm ${names.length} vÃ¹ng/khu vá»±c...`);
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
        toast.success(`ÄÃ£ thÃªm ${successCount} vÃ¹ng/khu vá»±c má»›i`);
      }
      if (duplicateCount > 0) {
        toast.warning(`${duplicateCount} vÃ¹ng/khu vá»±c Ä‘Ã£ tá»“n táº¡i vÃ  bá»‹ bá» qua`);
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
      toast.success('ÄÃ£ cáº­p nháº­t vÃ¹ng/khu vá»±c');
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
      toast.success('ÄÃ£ xÃ³a vÃ¹ng/khu vá»±c');
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
      toast.success(`ÄÃ£ xÃ³a ${selectedRegionIds.length} vÃ¹ng/khu vá»±c`);
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
      toast.success('ÄÃ£ xÃ³a táº¥t cáº£ vÃ¹ng/khu vá»±c');
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
      // The user says "Set dá»± Ã¡n theo vÃ¹ng / khu vá»±c, cÃ³ thá»ƒ set nhiá»u dá»± Ã¡n cho 1 vÃ¹ng, khu vá»±c."
      // This usually means assigning a list of projects to this region.
      
      for (const projectId of selectedProjectIdsForRegion) {
        batch.update(doc(db, 'projects', projectId), { region: regionForProjects.name });
      }
      
      await batch.commit();
      await logAction('UPDATE_REGION_PROJECTS', 'projects', 'multiple', { region: regionForProjects.name, projectIds: selectedProjectIdsForRegion });
      toast.success(`ÄÃ£ cáº­p nháº­t vÃ¹ng cho ${selectedProjectIdsForRegion.length} dá»± Ã¡n`);
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
        toast.success(`ÄÃ£ thÃªm ${successCount} loáº¡i hÃ¬nh má»›i`);
      }
      if (duplicateCount > 0) {
        toast.warning(`${duplicateCount} loáº¡i hÃ¬nh Ä‘Ã£ tá»“n táº¡i vÃ  bá»‹ bá» qua`);
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
          toast.info(`ÄÃ£ cáº­p nháº­t loáº¡i hÃ¬nh cho ${projectsToUpdate.length} dá»± Ã¡n liÃªn quan`);
        }
      }

      await logAction('UPDATE', 'types', id, { name: newName, oldName });
      setEditingTypeId(null);
      toast.success('ÄÃ£ cáº­p nháº­t loáº¡i hÃ¬nh');
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
      toast.success('ÄÃ£ xÃ³a loáº¡i hÃ¬nh');
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

      toast.success(`ÄÃ£ chuyá»ƒn ${projectsToUpdate.length} dá»± Ã¡n tá»« "${sourceName}" sang "${targetName}"`);
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
        toast.success(`ÄÃ£ chuáº©n hÃ³a ${projectsToFix.length} dá»± Ã¡n, ${typesToFix.length} loáº¡i hÃ¬nh vÃ  thÃªm ${newTypesCount} loáº¡i hÃ¬nh má»›i`);
      } else {
        toast.info("Dá»¯ liá»‡u Ä‘Ã£ Ä‘á»“ng nháº¥t, khÃ´ng cáº§n cáº­p nháº­t");
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
      toast.success(`ÄÃ£ xÃ³a ${selectedTypeIds.length} loáº¡i hÃ¬nh`);
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
      toast.success('ÄÃ£ xÃ³a táº¥t cáº£ loáº¡i hÃ¬nh');
      setSelectedTypeIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'types');
    }
  };

  const handleGlobalProjectAssign = async () => {
    if (selectedGlobalProjectIds.length === 0 || !targetGlobalType) {
      toast.error('Vui lÃ²ng chá»n Ã­t nháº¥t má»™t dá»± Ã¡n vÃ  má»™t loáº¡i hÃ¬nh');
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
      
      toast.success(`ÄÃ£ gÃ¡n loáº¡i hÃ¬nh "${targetName}" cho ${selectedGlobalProjectIds.length} dá»± Ã¡n`);
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
      toast.success(`ÄÃ£ cáº­p nháº­t membership loáº¡i hÃ¬nh "${targetTypeName}" cho cÃ¡c dá»± Ã¡n`);
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
    if (isInternalStaff || firebaseUserEmail === 'thienvu1108@gmail.com') return true;
    if (!systemSettings) return true;
    
    const now = new Date();
    const day = now.getDate();
    const start = Number(systemSettings.budgetStartDay || 15);
    const end = Number(systemSettings.budgetEndDay || 5);

    if (start > end) {
      return day >= start || day <= end;
    } else {
      return day >= start && day <= end;
    }
  };

  const firebaseUserEmail = user?.email?.toLowerCase() || '';

  const checkBudgetActionAllowed = (bMonth: string) => {
    const roleStr = (userRole || userProfile?.role || '').toLowerCase().trim();
    const isSpecialAdmin = 
      isAdmin || 
      isSuperAdmin || 
      isAccountant || 
      isMod || 
      isGDDA || 
      isGDKhoi || 
      isGDKD ||
      roleStr === 'admin' || 
      roleStr === 'super_admin' || 
      roleStr === 'quáº£n trá»‹' || 
      roleStr === 'quáº£n trá»‹ viÃªn' || 
      roleStr === 'administrator' || 
      roleStr === 'accountant' || 
      roleStr === 'káº¿ toÃ¡n' || 
      firebaseUserEmail === 'thienvu1108@gmail.com';

    if (isSpecialAdmin) {
      return { allowed: true };
    }
    
    const currentM = getMarketingMonth(new Date());
    
    // Check if bMonth is previous period
    if (bMonth < currentM) {
      return { 
        allowed: false, 
        reason: 'NgoÃ i thá»i gian Ä‘iá»u chá»‰nh cá»§a ká»³ trÆ°á»›c. KhÃ´ng thá»ƒ Ä‘Äƒng kÃ½ hoáº·c Ä‘iá»u chá»‰nh ngÃ¢n sÃ¡ch cá»§a ká»³ trÆ°á»›c.' 
      };
    }
    
    // Check if bMonth is current period
    if (bMonth === currentM) {
      if (!isWithinRegistrationWindow()) {
        return { 
          allowed: false, 
          reason: 'NgoÃ i thá»i gian Ä‘Äƒng kÃ½ hoáº·c Ä‘iá»u chá»‰nh ngÃ¢n sÃ¡ch cá»§a ká»³ hiá»‡n táº¡i.' 
        };
      }
      return { allowed: true };
    }
    
    // If future period (bMonth > currentM)
    if (!isWithinRegistrationWindow()) {
      return { 
        allowed: false, 
        reason: 'NgoÃ i thá»i gian Ä‘Äƒng kÃ½ hoáº·c Ä‘iá»u chá»‰nh ngÃ¢n sÃ¡ch.' 
      };
    }
    
    return { allowed: true };
  };

  const handleAddBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !budgetAmount || !selectedTeamId || !budgetMonth || !implementerName) {
      toast.error('Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ thÃ´ng tin');
      return false;
    }

    const checkResult = checkBudgetActionAllowed(budgetMonth);
    if (!checkResult.allowed) {
      toast.error(checkResult.reason);
      return false;
    }

    const project = projects.find(p => p.id === selectedProjectId);
    const team = teams.find(t => t.id === selectedTeamId);

    // Rule: Má»—i team chá»‰ Ä‘Äƒng kÃ½ 1 ngÃ¢n sÃ¡ch cho 1 dá»± Ã¡n trong 1 ká»³
    const existsInQueue = multiBudgetItems.some(
      item => item.teamId === selectedTeamId && item.projectId === selectedProjectId && item.month === budgetMonth
    );
    if (existsInQueue) {
      toast.error('Äá»™i Ä‘Ã£ cÃ³ Ä‘Äƒng kÃ½ ngÃ¢n sÃ¡ch cho dá»± Ã¡n nÃ y trong danh sÃ¡ch chá»!');
      return false;
    }

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
    return true;
  };

  const handleRegisterBudgetMain = (e: React.FormEvent) => {
    e.preventDefault();
    
    // If form has data, try to add it to list first
    if (selectedProjectId && budgetAmount && selectedTeamId && budgetMonth && implementerName) {
      const success = handleAddBudget(e);
      if (!success) return;
    } else if (multiBudgetItems.length === 0) {
      toast.error('Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ thÃ´ng tin Ä‘Äƒng kÃ½');
      return;
    }

    setIsConfirmingMulti(true);
    setIsConfirmBudgetOpen(true);
  };

  const handleAddBudgetToListOnly = (e: React.FormEvent) => {
    e.preventDefault();
    const success = handleAddBudget(e);
    if (success) {
      toast.success('ÄÃ£ thÃªm dá»± Ã¡n vÃ o danh sÃ¡ch chá»');
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
          // If multiple entries in the same submission, last one sets the amount or sums them
          acc[existingIndex].amount = current.amount;
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
          normalizeMonth(b.month) === normalizeMonth(item.month)
        );

        if (existingBudgetsForMatch.length > 0) {
          // Update the existing team master budget record
          const targetBudget = existingBudgetsForMatch[0];
          const targetRef = doc(db, 'budgets', targetBudget.id);
          const duplicates = existingBudgetsForMatch.slice(1);
          
          // Build/Update subBudgets for targetBudget
          let currentSubBudgets = Array.isArray(targetBudget.subBudgets) ? [...targetBudget.subBudgets] : [];
          if (currentSubBudgets.length === 0) {
            currentSubBudgets.push({
              id: `sub-init-${targetBudget.id}`,
              userId: targetBudget.createdBy || '',
              userName: targetBudget.implementerName || targetBudget.userEmail || 'ThÃ nh viÃªn',
              userEmail: (targetBudget.userEmail || '').toLowerCase(),
              amount: Number(targetBudget.amount || 0),
              note: `ÄÄƒng kÃ½ ban Ä‘áº§u`,
              createdAt: targetBudget.createdAt?.toDate ? targetBudget.createdAt.toDate().toISOString() : new Date().toISOString()
            });
          }

          // Check if this user already has an entry in subBudgets
          const userSubIndex = currentSubBudgets.findIndex(s => 
            (s.userEmail && s.userEmail.toLowerCase() === user?.email?.toLowerCase()) || 
            (s.userId && s.userId === user?.uid)
          );

          const newSubEntry = {
            id: userSubIndex > -1 ? currentSubBudgets[userSubIndex].id : `sub-${Math.random().toString(36).substring(2, 9)}`,
            userId: user?.uid || '',
            userName: item.implementerName || userProfile?.fullName || user?.displayName || user?.email || 'ThÃ nh viÃªn',
            userEmail: (user?.email || '').toLowerCase(),
            amount: item.amount,
            note: item.note || `Cáº­p nháº­t ngÃ¢n sÃ¡ch tá»•ng dá»± Ã¡n`,
            updatedAt: new Date().toISOString(),
            createdAt: userSubIndex > -1 ? (currentSubBudgets[userSubIndex].createdAt || new Date().toISOString()) : new Date().toISOString()
          };

          if (userSubIndex > -1) {
            currentSubBudgets[userSubIndex] = newSubEntry;
          } else {
            currentSubBudgets.push(newSubEntry);
          }

          const newTotalAmount = item.amount;

          await updateDoc(targetRef, {
            amount: newTotalAmount,
            implementerName: item.implementerName || targetBudget.implementerName,
            subBudgets: currentSubBudgets,
            updatedAt: serverTimestamp(),
            editHistory: arrayUnion({
              action: 'UPDATE_TOTAL',
              editorName: item.implementerName || userProfile?.fullName || user?.displayName || 'ThÃ nh viÃªn',
              editorEmail: user?.email,
              timestamp: new Date().toISOString(),
              oldAmount: targetBudget.amount,
              newTotalAmount: newTotalAmount,
              note: `Cáº­p nháº­t láº¡i ngÃ¢n sÃ¡ch tá»•ng dá»± Ã¡n cho Äá»™i`
            })
          });

          // If there are legacy duplicates, clean them up safely
          if (duplicates.length > 0) {
            for (const dup of duplicates) {
              const affectedCosts = costs.filter(c => c.budgetId === dup.id);
              for (const c of affectedCosts) {
                await updateDoc(doc(db, 'costs', c.id), { budgetId: targetBudget.id }).catch(() => {});
              }
              await deleteDoc(doc(db, 'budgets', dup.id)).catch(() => {});
            }
          }

          await logAction('UPDATE', 'budgets', targetBudget.id, { 
            oldAmount: targetBudget.amount,
            newTotalAmount,
            userEmail: user?.email
          });

          // Send notification to team members and previous registrants
          await sendBudgetChangeNotification({
            budgetId: targetBudget.id,
            projectId: item.projectId,
            projectName: item.projectName,
            teamId: item.teamId,
            teamName: item.teamName,
            teamCode: item.teamCode,
            month: item.month,
            oldAmount: targetBudget.amount || 0,
            newAmount: item.amount,
            editorName: item.implementerName || userProfile?.fullName || user?.displayName || 'ThÃ nh viÃªn',
            editorEmail: user?.email || '',
            reason: 'Cáº­p nháº­t láº¡i ngÃ¢n sÃ¡ch dá»± Ã¡n cho Äá»™i',
            originalBudget: targetBudget,
            subBudgetsList: currentSubBudgets
          });
        } else {
          // Create new team master budget doc
          const initialSubBudget = {
            id: `sub-1`,
            userId: user?.uid || '',
            userName: item.implementerName || userProfile?.fullName || user?.displayName || user?.email || 'ChÆ°a rÃµ',
            userEmail: (user?.email || '').toLowerCase(),
            amount: item.amount,
            note: item.note || `ÄÄƒng kÃ½ ngÃ¢n sÃ¡ch ban Ä‘áº§u`,
            createdAt: new Date().toISOString()
          };

          const initialHistory = {
            action: 'REGISTER',
            editorName: item.implementerName || userProfile?.fullName || user?.displayName || 'Unknown',
            editorEmail: user?.email,
            timestamp: new Date().toISOString(),
            amount: item.amount,
            note: `ÄÄƒng kÃ½ ngÃ¢n sÃ¡ch ban Ä‘áº§u cho Äá»™i`
          };

          const docRef = await addDoc(collection(db, 'budgets'), {
            projectId: item.projectId,
            projectName: item.projectName,
            teamId: item.teamId,
            teamName: item.teamName,
            implementerName: item.implementerName || userProfile?.fullName || user?.displayName || 'ChÆ°a rÃµ',
            month: item.month,
            amount: item.amount,
            subBudgets: [initialSubBudget],
            editHistory: [initialHistory],
            createdAt: serverTimestamp(),
            createdBy: user?.uid,
            userEmail: user?.email?.toLowerCase()
          });
          await logAction('CREATE', 'budgets', docRef.id, { ...item });
        }
      }

      setMultiBudgetItems([]);
      setIsConfirmBudgetOpen(false);
      setIsConfirmingMulti(false);
      toast.success('ÄÃ£ hoÃ n táº¥t Ä‘Äƒng kÃ½ ngÃ¢n sÃ¡ch');
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
      toast.success('ÄÃ£ lÆ°u cÃ i Ä‘áº·t há»‡ thá»‘ng');
      await logAction('UPDATE', 'settings', 'global', { budgetStartDay: adminBudgetStartDay, budgetEndDay: adminBudgetEndDay });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings');
    }
  };

  const handleOpenHistory = (target: any, name: string) => {
    setHistoryTargetRecord(target);
    setHistoryTargetName(name || `${target?.projectName || 'Dá»± Ã¡n'} - ${target?.teamName || 'Äá»™i'}`);
    
    let rawHist = target?.editHistory || [];
    let hist: any[] = [];
    
    if (Array.isArray(rawHist) && rawHist.length > 0) {
      hist = rawHist.map((h: any, i: number) => ({
        ...h,
        id: h.id || `hist-${i}`
      }));
      
      // Check if there is an initial registration/creation action
      const hasInitial = hist.some(e => ['REGISTER', 'CREATE', 'URL_IMPORT_CREATE', 'IMPORT_CREATE'].includes(e.action));
      if (!hasInitial) {
        const earliestTime = target?.createdAt?.toDate 
          ? target.createdAt.toDate().toISOString() 
          : (target?.createdAt ? new Date(target.createdAt).toISOString() : (hist[0]?.timestamp || new Date().toISOString()));
        
        const firstEntry = hist[0];
        const initialAmount = firstEntry?.oldAmount ?? firstEntry?.changes?.amount?.old ?? target?.amount ?? 0;
        const initialEditor = target?.implementerName || target?.userEmail || target?.createdByEmail || 'NgÆ°á»i Ä‘Äƒng kÃ½ ban Ä‘áº§u';
        
        hist.unshift({
          action: 'REGISTER',
          editorName: initialEditor,
          editorEmail: target?.userEmail || target?.createdByEmail || '',
          timestamp: earliestTime,
          amount: Number(initialAmount),
          note: `ÄÄƒng kÃ½ ngÃ¢n sÃ¡ch ban Ä‘áº§u: ${Number(initialAmount).toLocaleString()}Ä‘`
        });
      }
    } else {
      const amt = Number(target?.amount || target?.actualCost || 0);
      const editor = target?.implementerName || target?.userEmail || target?.createdByEmail || 'ChÆ°a rÃµ';
      const timeStr = target?.createdAt?.toDate 
        ? target.createdAt.toDate().toISOString() 
        : (target?.createdAt ? new Date(target.createdAt).toISOString() : new Date().toISOString());
      
      hist = [{
        action: 'REGISTER',
        editorName: editor,
        editorEmail: target?.userEmail || target?.createdByEmail || '',
        timestamp: timeStr,
        amount: amt,
        note: `ÄÄƒng kÃ½ ngÃ¢n sÃ¡ch ban Ä‘áº§u: ${amt.toLocaleString()}Ä‘`
      }];
    }
    
    setHistoryToView(hist);
    setIsHistoryDialogOpen(true);
  };

  const handleEditBudget = async (budget: any, newAmount: number) => {
    if (!isWithinRegistrationWindow()) {
      toast.error('NgoÃ i thá»i gian cho phÃ©p chá»‰nh sá»­a ngÃ¢n sÃ¡ch.');
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
      toast.success('ÄÃ£ cáº­p nháº­t ngÃ¢n sÃ¡ch');
      await logAction('UPDATE', 'budgets', budget.id, { oldAmount: budget.amount, newAmount });

      await sendBudgetChangeNotification({
        budgetId: budget.id,
        projectId: budget.projectId,
        projectName: budget.projectName,
        teamId: budget.teamId,
        teamName: budget.teamName,
        teamCode: budget.teamCode,
        month: budget.month,
        oldAmount: budget.amount || 0,
        newAmount: newAmount,
        editorName: userProfile?.fullName || user?.displayName || 'ThÃ nh viÃªn',
        editorEmail: user?.email || '',
        reason: 'Chá»‰nh sá»­a ngÃ¢n sÃ¡ch',
        originalBudget: budget,
        subBudgetsList: budget.subBudgets || []
      });
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
      toast.success('ÄÃ£ cáº­p nháº­t chi phÃ­');
      await logAction('UPDATE', 'costs', cost.id, { oldAmount: cost.amount, newAmount: totalAmount });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'costs');
    }
  };

  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = Number(fbAds) + Number(posting) + Number(zaloAds) + Number(googleAds) + Number(otherCost);
    if (!actualProjectId || totalAmount <= 0 || !selectedBudgetId) return;
    const project = projects.find(p => p.id === actualProjectId);
    const budget = budgets.find(b => b.id === selectedBudgetId);
    
    if (!budget) {
      toast.error('KhÃ´ng tÃ¬m tháº¥y thÃ´ng tin ngÃ¢n sÃ¡ch tÆ°Æ¡ng á»©ng');
      return;
    }
    
    const [yearStr] = costBudgetMonth.split('-');
    const year = Number(yearStr);
    
    // Automatically determine period based on current date
    const now = new Date();
    const day = now.getDate();
    let autoPeriod = 1;
    if (day >= 21) {
       // Start of a new marketing month (usually counted towards next month)
       autoPeriod = 1;
    } else {
       if (day <= 7) autoPeriod = 2; // Rough estimation or just use time-based logic
       else if (day <= 14) autoPeriod = 3;
       else autoPeriod = 4;
    }

    try {
      const mktReportData = {
        totalLeads: Number(totalLeads.toString().replace(/\./g, '')) || 0,
        contactedLeads: Number(contactedLeads.toString().replace(/\./g, '')) || 0,
        unconvertedLeads: Number(unconvertedLeads.toString().replace(/\./g, '')) || 0,
        unconvertedReason: unconvertedReason || '',
        convertedLeads: Number(convertedLeads.toString().replace(/\./g, '')) || 0,
        conversionRevenue: Number(conversionRevenue.toString().replace(/\./g, '')) || 0,
        startDate: mktStartDate || '',
        endDate: mktEndDate || ''
      };

      const docRef = await addDoc(collection(db, 'costs'), {
        projectId: actualProjectId,
        projectName: project?.name || 'N/A',
        budgetId: selectedBudgetId,
        teamId: budget.teamId || null,
        implementerName: budget.implementerName || 'N/A',
        teamName: budget.teamName || 'N/A',
        assignedUserEmail: budget.assignedUserEmail || null,
        weekNumber: autoPeriod, // Still kept for compatibility but auto-calculated
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
        mktReport: mktReportData,
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
        budgetId: selectedBudgetId,
        mktReport: mktReportData
      });
      setFbAds('');
      setPosting('');
      setZaloAds('');
      setGoogleAds('');
      setOtherCost('');
      setCostNote('');
      setActualProjectId('');
      setSelectedBudgetId('');
      setTotalLeads('');
      setContactedLeads('');
      setUnconvertedLeads('');
      setUnconvertedReason('');
      setConvertedLeads('');
      setConversionRevenue('');
      setMktStartDate('');
      setMktEndDate('');
      setShowMktReport(false);
      toast.success('ÄÃ£ nháº­p chi phÃ­ thá»±c táº¿ vÃ  BÃ¡o cÃ¡o Hiá»‡u quáº£ MKT');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'costs');
    }
  };

  const handleOpenEditBudget = (budget: any) => {
    // If not Super Admin, check regular time window rules
    if (!isSuperAdmin) {
      const checkResult = checkBudgetActionAllowed(budget.month);
      if (!checkResult.allowed) {
        toast.error(checkResult.reason);
        return;
      }
    }

    const matchedTeam = teams.find(t => t.id === budget.teamId || t.name === budget.teamName || t.teamCode === budget.teamCode);
    const resolvedTeamId = matchedTeam ? matchedTeam.id : (budget.teamId || budget.teamName);

    setEditingBudgetId(budget.id);
    setEditingBudgetAmount(budget.amount !== undefined && budget.amount !== null ? budget.amount.toString() : '0');
    setEditingBudgetVerifiedAmount((budget.verifiedAmount || 0).toString());
    setEditingBudgetMonth(budget.month);
    setEditingBudgetTeam(resolvedTeamId);
    setEditingBudgetTeamSearch('');
    setProjectSearch('');
    setEditingBudgetProject(budget.projectId);
    setEditingBudgetImplementer(budget.implementerName || '');
    setEditingBudgetReason('');
    setIsEditBudgetDialogOpen(true);
  };

  const confirmEditBudget = async () => {
    if (!editingBudgetId || !editingBudgetAmount || !editingBudgetTeam || !editingBudgetMonth || !editingBudgetProject || !editingBudgetImplementer) {
      toast.error('Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ thÃ´ng tin');
      return;
    }

    const originalBudget = budgets.find(b => b.id === editingBudgetId);

    // Permission check for modifying budget month: Only Super Admin is allowed
    if (!isSuperAdmin && originalBudget && originalBudget.month !== editingBudgetMonth) {
      toast.error('Chá»‰ Super Admin má»›i cÃ³ quyá»n thay Ä‘á»•i Ká»³ Ä‘Äƒng kÃ½ (thÃ¡ng) cá»§a ngÃ¢n sÃ¡ch!');
      return;
    }

    // Check window restrictions if not Super Admin
    if (!isSuperAdmin) {
      const checkResult = checkBudgetActionAllowed(editingBudgetMonth);
      if (!checkResult.allowed) {
        toast.error(checkResult.reason);
        return;
      }
    }

    try {
      const budgetRef = doc(db, 'budgets', editingBudgetId);
      const newAmountNum = Number(editingBudgetAmount);

      const selectedTeam = teams.find(t => t.id === editingBudgetTeam || t.name === editingBudgetTeam);
      const selectedProject = projects.find(p => p.id === editingBudgetProject || p.name === editingBudgetProject);

      const targetTeamName = selectedTeam?.name || teamMap[editingBudgetTeam] || editingBudgetTeam;
      const targetTeamId = selectedTeam?.id || editingBudgetTeam;
      const targetTeamCode = selectedTeam?.teamCode || extractTeamCode(targetTeamName);
      const targetProjectName = selectedProject?.name || projectMap[editingBudgetProject] || originalBudget?.projectName || 'N/A';
      const targetProjectId = selectedProject?.id || editingBudgetProject;

      const reasonText = editingBudgetReason.trim() || 'Admin cáº­p nháº­t thÃ´ng tin ngÃ¢n sÃ¡ch';

      // Update or synchronize subBudgets to prevent rollback by subsequent auto-merge or registration routines
      let updatedSubBudgets: any[] = [];
      if (originalBudget?.subBudgets && Array.isArray(originalBudget.subBudgets) && originalBudget.subBudgets.length > 0) {
        if (originalBudget.subBudgets.length === 1) {
          updatedSubBudgets = [{
            ...originalBudget.subBudgets[0],
            userName: editingBudgetImplementer || originalBudget.subBudgets[0].userName || 'ThÃ nh viÃªn',
            amount: newAmountNum,
            note: reasonText,
            updatedAt: new Date().toISOString()
          }];
        } else {
          const oldTotal = originalBudget.subBudgets.reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0);
          if (oldTotal > 0) {
            updatedSubBudgets = originalBudget.subBudgets.map((s: any) => ({
              ...s,
              amount: Math.round((Number(s.amount || 0) / oldTotal) * newAmountNum),
              updatedAt: new Date().toISOString()
            }));
            const sumScaled = updatedSubBudgets.reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0);
            if (sumScaled !== newAmountNum && updatedSubBudgets.length > 0) {
              updatedSubBudgets[0].amount += (newAmountNum - sumScaled);
            }
          } else {
            updatedSubBudgets = [{
              id: `sub-${Date.now()}`,
              userId: user?.uid || '',
              userName: editingBudgetImplementer || userProfile?.fullName || user?.displayName || 'Admin',
              amount: newAmountNum,
              note: reasonText,
              createdAt: new Date().toISOString()
            }];
          }
        }
      } else {
        updatedSubBudgets = [{
          id: `sub-${Date.now()}`,
          userId: user?.uid || '',
          userName: editingBudgetImplementer || userProfile?.fullName || user?.displayName || 'Admin',
          amount: newAmountNum,
          note: reasonText,
          createdAt: new Date().toISOString()
        }];
      }

      const updateData: any = {
        amount: newAmountNum,
        verifiedAmount: Number(editingBudgetVerifiedAmount || 0),
        month: editingBudgetMonth,
        year: editingBudgetMonth.split('-')[0],
        teamId: targetTeamId,
        teamName: targetTeamName,
        teamCode: targetTeamCode,
        projectId: targetProjectId,
        projectName: targetProjectName,
        implementerName: editingBudgetImplementer,
        subBudgets: updatedSubBudgets,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid,
        editHistory: arrayUnion({
          action: 'UPDATE',
          editorName: userProfile?.fullName || user?.displayName || (isSuperAdmin ? 'Super Admin' : 'Admin'),
          editorEmail: user?.email,
          timestamp: new Date().toISOString(),
          reason: reasonText,
          changes: {
            amount: { old: originalBudget?.amount, new: newAmountNum },
            verifiedAmount: { old: originalBudget?.verifiedAmount || 0, new: Number(editingBudgetVerifiedAmount || 0) },
            month: { old: originalBudget?.month, new: editingBudgetMonth },
            team: { old: originalBudget?.teamName, new: targetTeamName },
            project: { old: originalBudget?.projectName, new: targetProjectName },
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
            projectId: targetProjectId,
            projectName: targetProjectName,
            teamId: targetTeamId,
            teamName: targetTeamName,
            teamCode: targetTeamCode,
            month: editingBudgetMonth,
            year: editingBudgetMonth.split('-')[0]
          });
        });
        await batch.commit();
      }

      await logAction('UPDATE', 'budgets', editingBudgetId, { ...updateData, reason: reasonText });

      // Send notification to team members and previous registrants
      await sendBudgetChangeNotification({
        budgetId: editingBudgetId,
        projectId: targetProjectId,
        projectName: targetProjectName,
        teamId: targetTeamId,
        teamName: targetTeamName,
        teamCode: targetTeamCode,
        month: editingBudgetMonth,
        oldAmount: originalBudget?.amount || 0,
        newAmount: newAmountNum,
        editorName: userProfile?.fullName || user?.displayName || (isSuperAdmin ? 'Super Admin' : 'Admin'),
        editorEmail: user?.email || '',
        reason: reasonText,
        originalBudget: originalBudget,
        subBudgetsList: updatedSubBudgets
      });

      setEditingBudgetId(null);
      setEditingBudgetReason('');
      setIsEditBudgetDialogOpen(false);
      toast.success('ÄÃ£ cáº­p nháº­t ngÃ¢n sÃ¡ch');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'budgets');
    }
  };

  const handleOpenAdjustBudget = (budget: any) => {
    const checkResult = checkBudgetActionAllowed(budget.month);
    if (!checkResult.allowed) {
      toast.error(checkResult.reason);
      return;
    }

    setAdjustingBudgetId(budget.id);
    setAdjustingBudgetAmount(budget.amount ? budget.amount.toString() : '0');
    setAdjustingBudgetReason('');
    setIsAdjustBudgetDialogOpen(true);
  };

  const confirmAdjustBudget = async () => {
    if (!adjustingBudgetId || !adjustingBudgetAmount) {
      toast.error('Vui lÃ²ng nháº­p sá»‘ tiá»n ngÃ¢n sÃ¡ch má»›i');
      return;
    }

    const originalBudget = budgets.find(b => b.id === adjustingBudgetId);
    if (!originalBudget) {
      toast.error('KhÃ´ng tÃ¬m tháº¥y thÃ´ng tin ngÃ¢n sÃ¡ch tÆ°Æ¡ng á»©ng');
      return;
    }

    const checkResult = checkBudgetActionAllowed(originalBudget.month);
    if (!checkResult.allowed) {
      toast.error(checkResult.reason);
      return;
    }

    try {
      const budgetRef = doc(db, 'budgets', adjustingBudgetId);
      const newAmount = Number(adjustingBudgetAmount);
      
      if (isNaN(newAmount) || newAmount < 0) {
        toast.error('Sá»‘ tiá»n ngÃ¢n sÃ¡ch má»›i khÃ´ng há»£p lá»‡');
        return;
      }

      const reasonText = adjustingBudgetReason.trim() || 'Admin Ä‘iá»u chá»‰nh ngÃ¢n sÃ¡ch';

      // Update subBudgets proportionally
      let updatedSubBudgets: any[] = [];
      if (originalBudget.subBudgets && Array.isArray(originalBudget.subBudgets) && originalBudget.subBudgets.length > 0) {
        if (originalBudget.subBudgets.length === 1) {
          updatedSubBudgets = [{
            ...originalBudget.subBudgets[0],
            amount: newAmount,
            note: reasonText,
            updatedAt: new Date().toISOString()
          }];
        } else {
          const oldTotal = originalBudget.subBudgets.reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0);
          if (oldTotal > 0) {
            updatedSubBudgets = originalBudget.subBudgets.map((s: any) => ({
              ...s,
              amount: Math.round((Number(s.amount || 0) / oldTotal) * newAmount),
              updatedAt: new Date().toISOString()
            }));
            const sumScaled = updatedSubBudgets.reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0);
            if (sumScaled !== newAmount && updatedSubBudgets.length > 0) {
              updatedSubBudgets[0].amount += (newAmount - sumScaled);
            }
          } else {
            updatedSubBudgets = [{
              id: `sub-${Date.now()}`,
              userId: user?.uid || '',
              userName: userProfile?.fullName || user?.displayName || 'Admin',
              amount: newAmount,
              note: reasonText,
              createdAt: new Date().toISOString()
            }];
          }
        }
      } else {
        updatedSubBudgets = [{
          id: `sub-${Date.now()}`,
          userId: user?.uid || '',
          userName: originalBudget.implementerName || userProfile?.fullName || user?.displayName || 'Admin',
          amount: newAmount,
          note: reasonText,
          createdAt: new Date().toISOString()
        }];
      }

      await updateDoc(budgetRef, {
        amount: newAmount,
        subBudgets: updatedSubBudgets,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid,
        editHistory: arrayUnion({
          action: 'ADJUST',
          editorName: userProfile?.fullName || user?.displayName || 'Unknown',
          editorEmail: user?.email,
          timestamp: new Date().toISOString(),
          reason: reasonText,
          changes: {
            amount: { old: originalBudget.amount, new: newAmount }
          }
        })
      });

      await logAction('ADJUST_BUDGET', 'budgets', adjustingBudgetId, { 
        projectName: originalBudget.projectName,
        teamName: originalBudget.teamName,
        month: originalBudget.month,
        oldAmount: originalBudget.amount, 
        newAmount,
        reason: reasonText
      });

      // Send notification to team members and previous registrants
      await sendBudgetChangeNotification({
        budgetId: adjustingBudgetId,
        projectId: originalBudget.projectId,
        projectName: originalBudget.projectName,
        teamId: originalBudget.teamId,
        teamName: originalBudget.teamName,
        teamCode: originalBudget.teamCode,
        month: originalBudget.month,
        oldAmount: originalBudget.amount || 0,
        newAmount,
        editorName: userProfile?.fullName || user?.displayName || 'Admin',
        editorEmail: user?.email || '',
        reason: reasonText,
        originalBudget: originalBudget,
        subBudgetsList: updatedSubBudgets
      });

      setAdjustingBudgetId(null);
      setAdjustingBudgetAmount('');
      setAdjustingBudgetReason('');
      setIsAdjustBudgetDialogOpen(false);
      toast.success('ÄÃ£ Ä‘iá»u chá»‰nh ngÃ¢n sÃ¡ch thÃ nh cÃ´ng');
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
      toast.success('ÄÃ£ cáº­p nháº­t ngÃ¢n sÃ¡ch');
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
      toast.success('ÄÃ£ xÃ³a Ä‘Äƒng kÃ½ ngÃ¢n sÃ¡ch');
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
      toast.success(`ÄÃ£ xÃ³a ${selectedBudgetIds.length} Ä‘Äƒng kÃ½ ngÃ¢n sÃ¡ch`);
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
      toast.success('ÄÃ£ xÃ³a táº¥t cáº£ Ä‘Äƒng kÃ½ ngÃ¢n sÃ¡ch. ThÃ´ng tin Ä‘Ã£ Ä‘Æ°á»£c lÆ°u vÃ o nháº­t kÃ½ Ä‘á»ƒ khÃ´i phá»¥c náº¿u cáº§n.');
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
        toast.info('KhÃ´ng tÃ¬m tháº¥y dá»¯ liá»‡u nÃ o trong nháº­t kÃ½ Ä‘á»ƒ khÃ´i phá»¥c.');
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
        toast.info('Táº¥t cáº£ dá»¯ liá»‡u trong nháº­t kÃ½ Ä‘Ã£ tá»“n táº¡i trÃªn há»‡ thá»‘ng.');
      } else {
        await batch.commit();
        await logAction('RESTORE_BUDGETS_EXECUTED', 'budgets', 'bulk', { count: restoreCount, point: logToUse?.id || 'All' });
        toast.success(`ÄÃ£ khÃ´i phá»¥c thÃ nh cÃ´ng ${restoreCount} báº£n ghi.`);
      }
      setIsRestoreBudgetsDialogOpen(false);
    } catch (error) {
      console.error('Restore error:', error);
      handleFirestoreError(error, OperationType.WRITE, 'budgets');
    } finally {
      setIsRestoringData(false);
    }
  };

  const handleSyncProjectNames = async () => {
    if (!isAdmin && !isSuperAdmin) {
      toast.error("Chá»‰ Admin má»›i cÃ³ quyá»n thá»±c hiá»‡n viá»‡c nÃ y");
      return;
    }

    setIsRestoringData(true);
    const toastId = toast.loading("Äang Ä‘á»“ng bá»™ tÃªn dá»± Ã¡n trÃªn toÃ n há»‡ thá»‘ng...");

    try {
      const batch = writeBatch(db);
      let updateCount = 0;

      // Create a map of project ID to current project name
      const currentProjectNames: Record<string, string> = {};
      projects.forEach(p => {
        currentProjectNames[p.id] = p.name;
      });

      const oldName = "Vinhomes Cao Xa La";
      const targetProject = projects.find(p => p.name === "LUMIERE HANOI SEASON GARDEN");
      const targetId = targetProject?.id;

      // 1. Sync in acceptances
      acceptances.forEach(a => {
        let needsUpdate = false;
        let newName = a.projectName;

        if (a.projectId && currentProjectNames[a.projectId] && a.projectName !== currentProjectNames[a.projectId]) {
          newName = currentProjectNames[a.projectId];
          needsUpdate = true;
        } else if (a.projectName === oldName && targetProject) {
          newName = targetProject.name;
          needsUpdate = true;
        }

        if (needsUpdate) {
          batch.update(doc(db, 'acceptances', a.id), { 
            projectName: newName,
            projectId: a.projectId || targetId || ''
          });
          updateCount++;
        }
      });

      // 2. Sync in finalAcceptances
      finalAcceptances.forEach(fa => {
        let needsUpdate = false;
        let newName = fa.projectName;

        if (fa.projectId && currentProjectNames[fa.projectId] && fa.projectName !== currentProjectNames[fa.projectId]) {
          newName = currentProjectNames[fa.projectId];
          needsUpdate = true;
        } else if (fa.projectName === oldName && targetProject) {
          newName = targetProject.name;
          needsUpdate = true;
        }

        if (needsUpdate) {
          batch.update(doc(db, 'finalAcceptances', fa.id), { 
            projectName: newName,
            projectId: fa.projectId || targetId || ''
          });
          updateCount++;
        }
      });

      // 3. Sync in docProcessing
      docProcessingStatus.forEach(dp => {
        let needsUpdate = false;
        let newName = dp.projectName;

        if (dp.projectId && currentProjectNames[dp.projectId] && dp.projectName !== currentProjectNames[dp.projectId]) {
          newName = currentProjectNames[dp.projectId];
          needsUpdate = true;
        } else if (dp.projectName === oldName && targetProject) {
          newName = targetProject.name;
          needsUpdate = true;
        }

        if (needsUpdate) {
          batch.update(doc(db, 'docProcessing', dp.id), { 
            projectName: newName,
            projectId: dp.projectId || targetId || ''
          });
          updateCount++;
        }
      });

      // 4. Budgets
      budgets.forEach(b => {
        let needsUpdate = false;
        let newName = b.projectName;

        if (b.projectId && currentProjectNames[b.projectId] && b.projectName !== currentProjectNames[b.projectId]) {
          newName = currentProjectNames[b.projectId];
          needsUpdate = true;
        } else if (b.projectName === oldName && targetProject) {
          newName = targetProject.name;
          needsUpdate = true;
        }

        if (needsUpdate) {
          batch.update(doc(db, 'budgets', b.id), { 
            projectName: newName,
            projectId: b.projectId || targetId || ''
          });
          updateCount++;
        }
      });

      // 5. Costs
      costs.forEach(c => {
         let needsUpdate = false;
         let newName = c.projectName;

         if (c.projectId && currentProjectNames[c.projectId] && c.projectName !== currentProjectNames[c.projectId]) {
           newName = currentProjectNames[c.projectId];
           needsUpdate = true;
         } else if (c.projectName === oldName && targetProject) {
           newName = targetProject.name;
           needsUpdate = true;
         }

         if (needsUpdate) {
           batch.update(doc(db, 'costs', c.id), { 
             projectName: newName,
             projectId: c.projectId || targetId || ''
           });
           updateCount++;
         }
      });

      if (updateCount === 0) {
        toast.success("TÃªn cÃ¡c dá»± Ã¡n Ä‘Ã£ Ä‘á»“ng bá»™ sáºµn, khÃ´ng cáº§n cáº­p nháº­t thÃªm", { id: toastId });
      } else {
        await batch.commit();
        toast.success(`ÄÃ£ Ä‘á»“ng bá»™ thÃ nh cÃ´ng ${updateCount} báº£n ghi vá»›i tÃªn dá»± Ã¡n má»›i`, { id: toastId });
        await logAction('SYNC_PROJECT_NAMES', 'multiple', 'bulk', { updateCount });
      }
    } catch (error) {
      console.error(error);
      toast.error("Lá»—i khi Ä‘á»“ng bá»™ dá»¯ liá»‡u", { id: toastId });
    } finally {
      setIsRestoringData(false);
    }
  };

  const handleSyncTeamNames = async () => {
    if (!isAdmin && !isSuperAdmin) {
      toast.error("Chá»‰ Admin má»›i cÃ³ quyá»n thá»±c hiá»‡n viá»‡c nÃ y");
      return;
    }

    setIsRestoringData(true);
    const toastId = toast.loading("Äang Ä‘á»“ng bá»™ tÃªn Ä‘á»™i (team) trÃªn toÃ n há»‡ thá»‘ng...");

    try {
      const batch = writeBatch(db);
      let updateCount = 0;

      // Create maps for matching
      const currentTeamNames: Record<string, string> = {};
      teams.forEach(t => {
        currentTeamNames[t.id] = t.name;
      });

      // 1. Sync in acceptances
      acceptances.forEach(a => {
        let needsUpdate = false;
        let newName = a.teamName;

        if (a.teamId && currentTeamNames[a.teamId] && a.teamName !== currentTeamNames[a.teamId]) {
          newName = currentTeamNames[a.teamId];
          needsUpdate = true;
        }

        if (needsUpdate) {
          batch.update(doc(db, 'acceptances', a.id), { 
            teamName: newName
          });
          updateCount++;
        }
      });

      // 2. Sync in finalAcceptances
      finalAcceptances.forEach(fa => {
        let needsUpdate = false;
        let newName = fa.teamName;

        if (fa.teamId && currentTeamNames[fa.teamId] && fa.teamName !== currentTeamNames[fa.teamId]) {
          newName = currentTeamNames[fa.teamId];
          needsUpdate = true;
        }

        if (needsUpdate) {
          batch.update(doc(db, 'finalAcceptances', fa.id), { 
            teamName: newName
          });
          updateCount++;
        }
      });

      // 3. Sync in docProcessing
      docProcessingStatus.forEach(dp => {
        let needsUpdate = false;
        let newName = dp.teamName;

        if (dp.teamId && currentTeamNames[dp.teamId] && dp.teamName !== currentTeamNames[dp.teamId]) {
          newName = currentTeamNames[dp.teamId];
          needsUpdate = true;
        }

        if (needsUpdate) {
          batch.update(doc(db, 'docProcessing', dp.id), { 
            teamName: newName
          });
          updateCount++;
        }
      });

      // 4. Budgets
      budgets.forEach(b => {
        let needsUpdate = false;
        let newName = b.teamName;

        if (b.teamId && currentTeamNames[b.teamId] && b.teamName !== currentTeamNames[b.teamId]) {
          newName = currentTeamNames[b.teamId];
          needsUpdate = true;
        }

        if (needsUpdate) {
          batch.update(doc(db, 'budgets', b.id), { 
            teamName: newName
          });
          updateCount++;
        }
      });

      // 5. Costs
      costs.forEach(c => {
        let needsUpdate = false;
        let newName = c.teamName;

        if (c.teamId && currentTeamNames[c.teamId] && c.teamName !== currentTeamNames[c.teamId]) {
          newName = currentTeamNames[c.teamId];
          needsUpdate = true;
        }

        if (needsUpdate) {
          batch.update(doc(db, 'costs', c.id), { 
            teamName: newName
          });
          updateCount++;
        }
      });

      if (updateCount === 0) {
        toast.success("TÃªn cÃ¡c Ä‘á»™i Ä‘Ã£ Ä‘á»“ng bá»™ sáºµn, khÃ´ng cáº§n cáº­p nháº­t thÃªm", { id: toastId });
      } else {
        await batch.commit();
        toast.success(`ÄÃ£ Ä‘á»“ng bá»™ thÃ nh cÃ´ng ${updateCount} báº£n ghi vá»›i tÃªn Ä‘á»™i má»›i`, { id: toastId });
        await logAction('SYNC_TEAM_NAMES', 'multiple', 'bulk', { updateCount });
      }
    } catch (error) {
      console.error(error);
      toast.error("Lá»—i khi Ä‘á»“ng bá»™ dá»¯ liá»‡u tÃªn Ä‘á»™i", { id: toastId });
    } finally {
      setIsRestoringData(false);
    }
  };

  const [isMigratingMhToMay, setIsMigratingMhToMay] = useState(false);
  const [migrationStats, setMigrationStats] = useState<{
    teams: number;
    users: number;
    budgets: number;
    costs: number;
    blocks: number;
    acceptances: number;
    finalAcceptances: number;
    docProcessing: number;
    efficiencyReports: number;
    hasRun: boolean;
  }>({
    teams: 0,
    users: 0,
    budgets: 0,
    costs: 0,
    blocks: 0,
    acceptances: 0,
    finalAcceptances: 0,
    docProcessing: 0,
    efficiencyReports: 0,
    hasRun: false
  });

  const handleMigrateMhToMay = async (execute = false, silent = false) => {
    if (!isAdmin && !isSuperAdmin && user?.email?.toLowerCase() !== 'thienvu1108@gmail.com') {
      if (!silent) toast.error("Chá»‰ Admin má»›i cÃ³ quyá»n thá»±c hiá»‡n viá»‡c nÃ y");
      return;
    }

    setIsMigratingMhToMay(true);
    const toastId = silent ? null : toast.loading(execute ? "Äang tiáº¿n hÃ nh chuyá»ƒn Ä‘á»•i MH âž” MAY..." : "Äang quÃ©t há»‡ thá»‘ng tÃ¬m kiáº¿m mÃ£ MH...");

    try {
      // Helper function to query a whole collection safely
      const fetchCollectionDocs = async (colName: string) => {
        try {
          const snap = await getDocs(collection(db, colName));
          return snap.docs.map(dDoc => ({ id: dDoc.id, ...dDoc.data() as any }));
        } catch (err) {
          console.error(`Error fetching collection ${colName}:`, err);
          if (!silent) toast.error(`Cáº£nh bÃ¡o: KhÃ´ng thá»ƒ táº£i danh má»¥c "${colName}" do giá»›i háº¡n phÃ¢n quyá»n.`, { duration: 4000 });
          return [];
        }
      };

      const convertValue = (val: any) => {
        if (val === undefined || val === null) return '';
        const strVal = String(val);
        // 1. Replace MH followed by digits (e.g. MH01.1 -> MAY01.1)
        // 2. Replace MH with separators like MH-01.1 -> MAY-01.1
        // 3. Replace standalone MH (e.g. "MH" -> "MAY")
        return strVal
          .replace(/\bMH([0-9.]+)/gi, 'MAY$1')
          .replace(/\bMH[-_\s]+([0-9.]+)/gi, 'MAY-$1')
          .replace(/\bMH\b/gi, 'MAY');
      };

      // Let's retrieve all docs from the relevant collections safely and independently
      const allDbTeams = await fetchCollectionDocs('teams');
      const allDbUsers = await fetchCollectionDocs('users');
      const allDbBudgets = await fetchCollectionDocs('budgets');
      const allDbCosts = await fetchCollectionDocs('costs');
      const allDbBlocks = await fetchCollectionDocs('blocks');
      const allDbAcceptances = await fetchCollectionDocs('acceptances');
      const allDbFinalAcceptances = await fetchCollectionDocs('finalAcceptances');
      const allDbDocProcessing = await fetchCollectionDocs('docProcessing');
      const allDbEfficiency = await fetchCollectionDocs('efficiencyReports');
      const allDbSupport = await fetchCollectionDocs('supportRequests');

      let teamsCount = 0;
      let usersCount = 0;
      let budgetsCount = 0;
      let costsCount = 0;
      let blocksCount = 0;
      let acceptancesCount = 0;
      let finalAcceptancesCount = 0;
      let docProcessingCount = 0;
      let efficiencyCount = 0;
      let supportCount = 0;

      // Prepare batches
      const batchesToCommit: any[] = [];
      let currentBatch = writeBatch(db);
      let opCount = 0;

      const addUpdateToBatch = (ref: any, updateData: any) => {
        currentBatch.update(ref, updateData);
        opCount++;
        if (opCount >= 450) {
          if (execute) {
            batchesToCommit.push(currentBatch);
          }
          currentBatch = writeBatch(db);
          opCount = 0;
        }
      };

      // 1. Teams: update 'name' and 'teamCode' if they contain MH
      allDbTeams.forEach(t => {
        const originalName = t.name || '';
        const originalCode = t.teamCode || '';
        const newName = convertValue(originalName);
        const newCode = convertValue(originalCode);

        if (newName !== originalName || newCode !== originalCode) {
          teamsCount++;
          if (execute) {
            addUpdateToBatch(doc(db, 'teams', t.id), {
              name: newName,
              teamCode: newCode
            });
          }
        }
      });

      // 2. Users: update 'teamName' if it contains MH
      allDbUsers.forEach(u => {
        const originalTeam = u.teamName || '';
        const newTeam = convertValue(originalTeam);

        if (newTeam !== originalTeam) {
          usersCount++;
          if (execute) {
            addUpdateToBatch(doc(db, 'users', u.id), {
              teamName: newTeam
            });
          }
        }
      });

      // 3. Budgets: update 'teamName' and 'teamCode' if they contain MH
      allDbBudgets.forEach(b => {
        const originalTeam = b.teamName || '';
        const originalCode = b.teamCode || '';
        const newTeam = convertValue(originalTeam);
        const newCode = convertValue(originalCode);

        if (newTeam !== originalTeam || (originalCode && newCode !== originalCode)) {
          budgetsCount++;
          if (execute) {
            const up: any = { teamName: newTeam };
            if (originalCode) up.teamCode = newCode;
            addUpdateToBatch(doc(db, 'budgets', b.id), up);
          }
        }
      });

      // 4. Costs: update 'teamName' and 'teamCode' if they contain MH
      allDbCosts.forEach(c => {
        const originalTeam = c.teamName || '';
        const originalCode = c.teamCode || '';
        const newTeam = convertValue(originalTeam);
        const newCode = convertValue(originalCode);

        if (newTeam !== originalTeam || (originalCode && newCode !== originalCode)) {
          costsCount++;
          if (execute) {
            const up: any = { teamName: newTeam };
            if (originalCode) up.teamCode = newCode;
            addUpdateToBatch(doc(db, 'costs', c.id), up);
          }
        }
      });

      // 5. Blocks: update 'teamPrefix' if it is "MH" or contains "MH"
      allDbBlocks.forEach(bl => {
        const originalPrefix = bl.teamPrefix || '';
        let newPrefix = originalPrefix;
        if (String(originalPrefix).toUpperCase().trim() === 'MH') {
          newPrefix = 'MAY';
        } else {
          newPrefix = convertValue(originalPrefix);
        }

        if (newPrefix !== originalPrefix) {
          blocksCount++;
          if (execute) {
            addUpdateToBatch(doc(db, 'blocks', bl.id), {
              teamPrefix: newPrefix
            });
          }
        }
      });

      // 6. Acceptances: update 'teamName' and 'teamCode' if they contain MH
      allDbAcceptances.forEach(a => {
        const originalTeam = a.teamName || '';
        const originalCode = a.teamCode || '';
        const newTeam = convertValue(originalTeam);
        const newCode = convertValue(originalCode);

        if (newTeam !== originalTeam || (originalCode && newCode !== originalCode)) {
          acceptancesCount++;
          if (execute) {
            const up: any = { teamName: newTeam };
            if (originalCode) up.teamCode = newCode;
            addUpdateToBatch(doc(db, 'acceptances', a.id), up);
          }
        }
      });

      // 7. FinalAcceptances: update 'teamName' if it contains MH
      allDbFinalAcceptances.forEach(fa => {
        const originalTeam = fa.teamName || '';
        const originalCode = fa.teamCode || '';
        const newTeam = convertValue(originalTeam);
        const newCode = convertValue(originalCode);

        if (newTeam !== originalTeam || (originalCode && newCode !== originalCode)) {
          finalAcceptancesCount++;
          if (execute) {
            const up: any = { teamName: newTeam };
            if (originalCode) up.teamCode = newCode;
            addUpdateToBatch(doc(db, 'finalAcceptances', fa.id), up);
          }
        }
      });

      // 8. DocProcessing: update 'teamName' if it contains MH
      allDbDocProcessing.forEach(dp => {
        const originalTeam = dp.teamName || '';
        const newTeam = convertValue(originalTeam);

        if (newTeam !== originalTeam) {
          docProcessingCount++;
          if (execute) {
            addUpdateToBatch(doc(db, 'docProcessing', dp.id), {
              teamName: newTeam
            });
          }
        }
      });

      // 9. Efficiency: update 'teamName' if it contains MH
      allDbEfficiency.forEach(e => {
        const originalTeam = e.teamName || '';
        const newTeam = convertValue(originalTeam);

        if (newTeam !== originalTeam) {
          efficiencyCount++;
          if (execute) {
            addUpdateToBatch(doc(db, 'efficiencyReports', e.id), {
              teamName: newTeam
            });
          }
        }
      });

      // 10. SupportRequests: update 'teamName' or 'userTeam' if they contain MH
      allDbSupport.forEach(s => {
        const originalTeam = s.teamName || s.userTeam || '';
        const newTeam = convertValue(originalTeam);

        if (newTeam !== originalTeam) {
          supportCount++;
          if (execute) {
            const up: any = {};
            if (s.teamName) up.teamName = newTeam;
            if (s.userTeam) up.userTeam = newTeam;
            addUpdateToBatch(doc(db, 'supportRequests', s.id), up);
          }
        }
      });

      // Final commit for remaining operations in the last batch
      if (execute) {
        if (opCount > 0) {
          batchesToCommit.push(currentBatch);
        }

        // Commit all batches sequentially
        for (const batchToCommit of batchesToCommit) {
          await batchToCommit.commit();
        }

        await logAction('MIGRATE_MH_TO_MAY', 'multiple', 'bulk', {
          teams: teamsCount,
          users: usersCount,
          budgets: budgetsCount,
          costs: costsCount,
          blocks: blocksCount,
          acceptances: acceptancesCount,
          finalAcceptances: finalAcceptancesCount,
          docProcessing: docProcessingCount,
          efficiencyReports: efficiencyCount,
          supportRequests: supportCount,
        });

        const totalUpdated = teamsCount + usersCount + budgetsCount + costsCount + blocksCount + acceptancesCount + finalAcceptancesCount + docProcessingCount + efficiencyCount + supportCount;
        if (!silent) {
          toast.success(`ÄÃ£ chuyá»ƒn Ä‘á»•i thÃ nh cÃ´ng ${totalUpdated} tÃ i liá»‡u tá»« MH sang MAY!`, { id: toastId! });
        } else if (totalUpdated > 0) {
          toast.success(`Há»‡ thá»‘ng Ä‘Ã£ tá»± Ä‘á»™ng chuyá»ƒn Ä‘á»•i ${totalUpdated} dá»¯ liá»‡u tá»« MH sang MAY trÃªn toÃ n bá»™ database!`, { duration: 4000 });
        }
      } else {
        const totalUpdated = teamsCount + usersCount + budgetsCount + costsCount + blocksCount + acceptancesCount + finalAcceptancesCount + docProcessingCount + efficiencyCount + supportCount;
        if (!silent) {
          toast.success(`ÄÃ£ quÃ©t xong! TÃ¬m tháº¥y ${totalUpdated} báº£n ghi cáº§n cáº­p nháº­t.`, { id: toastId! });
        }
      }

      setMigrationStats({
        teams: teamsCount,
        users: usersCount,
        budgets: budgetsCount,
        costs: costsCount,
        blocks: blocksCount,
        acceptances: acceptancesCount,
        finalAcceptances: finalAcceptancesCount,
        docProcessing: docProcessingCount,
        efficiencyReports: efficiencyCount,
        hasRun: true
      });

    } catch (error) {
      console.error(error);
      if (!silent && toastId) {
        toast.error(`Lá»—i trong quÃ¡ trÃ¬nh ${execute ? 'chuyá»ƒn Ä‘á»•i' : 'quÃ©t há»‡ thá»‘ng'}: ${(error as Error).message}`, { id: toastId });
      }
    } finally {
      setIsMigratingMhToMay(false);
    }
  };

  const autoMigratedRef = useRef(false);
  useEffect(() => {
    if ((isAdmin || isSuperAdmin || user?.email?.toLowerCase() === 'thienvu1108@gmail.com') && !autoMigratedRef.current && user) {
      autoMigratedRef.current = true;
      setTimeout(() => {
        handleMigrateMhToMay(true, true).catch(err => console.error("Auto background MH->MAY migration:", err));
      }, 1500);
    }
  }, [isAdmin, isSuperAdmin, user]);

  const [isRestoreAllDialogOpen, setIsRestoreAllDialogOpen] = useState(false);
  const [logLimit, setLogLimit] = useState(50);
  const [logSearch, setLogSearch] = useState('');
  const debouncedLogSearch = useDebounce(logSearch, 300);
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
        (log.userEmail || '').toLowerCase().includes(debouncedLogSearch.toLowerCase()) ||
        (log.collection || '').toLowerCase().includes(debouncedLogSearch.toLowerCase()) ||
        (log.docId || '').toLowerCase().includes(debouncedLogSearch.toLowerCase());
      
      const matchesType = logTypeFilter === 'all' || 
        (logTypeFilter === 'WRITE' && (log.action === 'CREATE' || log.action === 'UPDATE' || log.action?.startsWith('IMPORT'))) ||
        (logTypeFilter === 'DELETE' && (log.action === 'DELETE' || log.action?.startsWith('DELETE_'))) ||
        (logTypeFilter === 'SYSTEM' && (log.action === 'FULL_SYSTEM_BACKUP' || log.action === 'DEEP_SYSTEM_RESTORE'));

      const matchesUser = logUserFilter === 'all' || log.userEmail === logUserFilter;

      return matchesSearch && matchesType && matchesUser;
    });
  }, [auditLogs, debouncedLogSearch, logTypeFilter, logUserFilter]);

  const RenderLogData = ({ data, action }: { data: any, action: string }) => {
    if (!data) return null;
    
    // Specical cases for bulk actions
    if (action === 'DELETE_ALL' || action === 'DELETE_BULK') {
      return (
        <div className="flex items-center gap-2 text-danger font-bold">
          <Trash2 className="w-4 h-4" /> 
          ÄÃ£ xÃ³a {data.count || data.snapshot?.length || 'táº¥t cáº£'} báº£n ghi
          {data.snapshot && <span className="text-[10px] bg-red-50 px-2 py-0.5 rounded-full">(CÃ³ snapshot khÃ´i phá»¥c)</span>}
        </div>
      );
    }

    if (action === 'IMPORT_BUDGETS' || action === 'IMPORT_COSTS' || action === 'IMPORT_UNIFIED_URL') {
      return (
        <div className="flex items-center gap-2 text-success font-bold">
          <FileUp className="w-4 h-4" /> 
          {action === 'IMPORT_UNIFIED_URL' ? (
            <span>Nháº­p tá»« URL: {data.costCount} chi phÃ­, {data.efficiencyCount} hiá»‡u quáº£</span>
          ) : (
            <span>ÄÃ£ nháº­p {data.count || data.items?.length || data.snapshot?.length || 'nhiá»u'} báº£n ghi</span>
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
                   <span className="font-bold text-slate-400 capitalize">{key.replace('Amount', ' (VNÄ)')}:</span>
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
    const toastId = toast.loading('Äang chuáº©n bá»‹ báº£n sao há»‡ thá»‘ng...');
    
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
        note: customNote || `Checkpoint tá»± Ä‘á»™ng táº¡o bá»Ÿi ${user?.email}`,
        counts: {
          budgets: budgets.length,
          costs: costs.length,
          projects: projects.length,
          teams: teams.length,
          efficiency: efficiencyReports.length
        }
      });

      toast.success('ÄÃ£ lÆ°u Ä‘iá»ƒm khÃ´i phá»¥c há»‡ thá»‘ng thÃ nh cÃ´ng!', { id: toastId });
    } catch (error) {
      console.error('Checkpoint error:', error);
      toast.error('Lá»—i khi táº¡o Ä‘iá»ƒm khÃ´i phá»¥c.', { id: toastId });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreCheckpoint = async (checkpoint: any) => {
    if (!checkpoint || !checkpoint.data?.snapshot) {
      toast.error('Dá»¯ liá»‡u khÃ´i phá»¥c khÃ´ng há»£p lá»‡ hoáº·c bá»‹ thiáº¿u snapshot');
      return;
    }

    if (isRestoringData) return;
    setIsRestoringData(true);
    const loadingToastId = toast.loading('Äang khá»Ÿi Ä‘á»™ng tiáº¿n trÃ¬nh khÃ´i phá»¥c Ä‘iá»ƒm thá»i gian...');

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

      toast.success('Há»‡ thá»‘ng Ä‘Ã£ Ä‘Æ°á»£c khÃ´i phá»¥c vá» phiÃªn báº£n Ä‘Ã£ chá»n!', { id: loadingToastId });
      setIsRestoreCheckpointDialogOpen(false);
      setSelectedCheckpoint(null);
    } catch (error) {
      console.error('Point in time restore error:', error);
      handleFirestoreError(error, OperationType.WRITE, 'system');
      toast.error('Lá»—i trong quÃ¡ trÃ¬nh khÃ´i phá»¥c.', { id: loadingToastId });
    } finally {
      setIsRestoringData(false);
    }
  };

  const handleRestoreFullDatabase = async () => {
    if (isRestoringData) return;
    setIsRestoringData(true);
    toast.info('Äang phÃ¢n tÃ­ch dá»¯ liá»‡u lá»‹ch sá»­ Ä‘á»ƒ khÃ´i phá»¥c toÃ n há»‡ thá»‘ng...');

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
        toast.info('KhÃ´ng tÃ¬m tháº¥y thÃªm dá»¯ liá»‡u nÃ o bá»‹ thiáº¿u Ä‘á»ƒ khÃ´i phá»¥c.');
      } else {
        await batch.commit();
        await logAction('DEEP_SYSTEM_RESTORE', 'system', 'all', { count: totalRestored });
        toast.success(`ÄÃ£ khÃ´i phá»¥c thÃ nh cÃ´ng ${totalRestored} báº£n ghi cho toÃ n há»‡ thá»‘ng.`);
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
      toast.info('KhÃ´ng tÃ¬m tháº¥y báº£n ghi thÃ¡ng 4 nÃ o Ä‘á»ƒ cáº­p nháº­t');
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
      toast.success(`ÄÃ£ chuyá»ƒn thÃ nh cÃ´ng ${aprilBudgets.length} ngÃ¢n sÃ¡ch vÃ  ${aprilCosts.length} thá»±c chi sang ThÃ¡ng 5`);
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
      toast.success('ÄÃ£ xÃ³a báº£n ghi chi phÃ­');
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
      toast.success(`ÄÃ£ xÃ³a ${selectedCostIds.length} báº£n ghi chi phÃ­`);
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
      toast.success('ÄÃ£ xÃ³a táº¥t cáº£ báº£n ghi chi phÃ­ thá»±c táº¿');
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
      toast.error('KhÃ´ng cÃ³ dá»¯ liá»‡u team Ä‘á»ƒ xuáº¥t');
      return;
    }

    const data = teams.map(t => ({
      'ID': t.id,
      'MÃ£ Team': t.teamCode || '',
      'TÃªn Team': t.name,
      'NgÃ y táº¡o': safeFormat(t.createdAt, 'dd/MM/yyyy HH:mm:ss')
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Teams");
    XLSX.writeFile(workbook, `danh_sach_team_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
    toast.success('ÄÃ£ xuáº¥t danh sÃ¡ch team thÃ nh cÃ´ng');
  };

  const handleExportProjects = () => {
    if (projects.length === 0) {
      toast.error('KhÃ´ng cÃ³ dá»¯ liá»‡u dá»± Ã¡n Ä‘á»ƒ xuáº¥t');
      return;
    }

    const data = projects.map(p => ({
      'ID': p.id,
      'MÃ£ Dá»± Ã¡n': p.projectCode || '',
      'TÃªn Dá»± Ã¡n': p.name,
      'Khu vá»±c': p.region || 'N/A',
      'Loáº¡i hÃ¬nh': p.type || 'N/A',
      'NgÃ y táº¡o': safeFormat(p.createdAt, 'dd/MM/yyyy HH:mm:ss')
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Projects");
    XLSX.writeFile(workbook, `danh_sach_du_an_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
    toast.success('ÄÃ£ xuáº¥t danh sÃ¡ch dá»± Ã¡n thÃ nh cÃ´ng');
  };

  const handleExportBudgets = () => {
    if (budgets.length === 0) {
      toast.error('KhÃ´ng cÃ³ dá»¯ liá»‡u ngÃ¢n sÃ¡ch Ä‘á»ƒ xuáº¥t');
      return;
    }

    const data = budgets.map(b => {
      const teamName = teamMap[b.teamId] || b.teamName || '';
      const teamObj = teams.find((t: any) => t.id === b.teamId || t.name === teamName);
      const mainTeamName = teamObj?.name || teamName;
      return {
        'ID Dá»± Ã¡n': b.projectId,
        'TÃªn Dá»± Ã¡n': b.projectName || '',
        'ID Team': b.teamId,
        'TÃªn Team': mainTeamName,
        'MÃ£ Team': teamObj?.teamCode || extractTeamCode(mainTeamName),
        'GÄKD': extractGDKD(mainTeamName),
        'ThÃ¡ng': b.month,
        'NgÆ°á»i triá»ƒn khai': b.implementerName || 'N/A',
        'NgÃ¢n sÃ¡ch': b.amount
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Budgets");
    XLSX.writeFile(workbook, `danh_sach_ngan_sach_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
    toast.success('ÄÃ£ xuáº¥t danh sÃ¡ch ngÃ¢n sÃ¡ch (Excel) thÃ nh cÃ´ng');
  };

  const handleExportFilteredBudgets = () => {
    if (budgetReportWithActuals.length === 0) {
      toast.error('KhÃ´ng cÃ³ dá»¯ liá»‡u ngÃ¢n sÃ¡ch Ä‘Ã£ lá»c Ä‘á»ƒ xuáº¥t');
      return;
    }

    const data = budgetReportWithActuals.map((b, idx) => {
      const teamName = b.teamName || '';
      const teamObj = teams.find((t: any) => t.id === b.teamId || t.name === teamName);
      const mainTeamName = teamObj?.name || teamName;
      return {
        'STT': idx + 1,
        'Äá»™i (Team)': mainTeamName,
        'MÃ£ Team': teamObj?.teamCode || extractTeamCode(mainTeamName),
        'GÄKD': extractGDKD(mainTeamName),
        'NgÆ°á»i triá»ƒn khai': b.implementerName || 'N/A',
        'Dá»± Ã¡n': b.projectName || 'N/A',
        'NgÃ¢n sÃ¡ch Ä‘Äƒng kÃ½ (VNÄ)': b.amount,
        'Thá»±c chi (VNÄ)': b.actualCost || 0,
        'ChÃªnh lá»‡ch (VNÄ)': (b.amount - (b.actualCost || 0)),
        'Ká»³ (ThÃ¡ng)': b.month || '',
        'NgÆ°á»i Ä‘Äƒng kÃ½': b.userEmail || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Filtered Budgets");
    
    worksheet['!cols'] = [
      { wch: 6 },  // STT
      { wch: 20 }, // Äá»™i (Team)
      { wch: 15 }, // MÃ£ Team
      { wch: 20 }, // GÄKD
      { wch: 20 }, // NgÆ°á»i triá»ƒn khai
      { wch: 25 }, // Dá»± Ã¡n
      { wch: 22 }, // NgÃ¢n sÃ¡ch Ä‘Äƒng kÃ½
      { wch: 18 }, // Thá»±c chi
      { wch: 18 }, // ChÃªnh lá»‡ch
      { wch: 12 }, // Ká»³ (ThÃ¡ng)
      { wch: 25 }  // NgÆ°á»i Ä‘Äƒng kÃ½
    ];

    const monthsStr = reportMonths && reportMonths.length > 0 ? reportMonths.join('_') : 'all';
    XLSX.writeFile(workbook, `danh_sach_ngan_sach_loc_${monthsStr}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
    toast.success('ÄÃ£ xuáº¥t danh sÃ¡ch ngÃ¢n sÃ¡ch Ä‘Ã£ lá»c (Excel) thÃ nh cÃ´ng');
  };

  const handleExportAdminFilteredBudgets = () => {
    if (adminFilteredBudgets.length === 0) {
      toast.error('KhÃ´ng cÃ³ dá»¯ liá»‡u ngÃ¢n sÃ¡ch admin Ä‘Ã£ lá»c Ä‘á»ƒ xuáº¥t');
      return;
    }

    const data = adminFilteredBudgets.map((b, idx) => {
      const teamName = teamMap[b.teamId] || b.teamName || '';
      const teamObj = teams.find((t: any) => t.id === b.teamId || t.name === teamName);
      const mainTeamName = teamObj?.name || teamName;
      const bcNT = baoCaoNTMap[b.id] || 0;
      const rate = b.amount > 0 ? (bcNT / b.amount) * 100 : 0;
      return {
        'STT': idx + 1,
        'ID Dá»± Ã¡n': b.projectId,
        'TÃªn Dá»± Ã¡n': projectMap[b.projectId] || b.projectName || 'N/A',
        'TÃªn Team': mainTeamName,
        'MÃ£ Team': teamObj?.teamCode || extractTeamCode(mainTeamName),
        'GÄKD': extractGDKD(mainTeamName),
        'NgÆ°á»i triá»ƒn khai': b.implementerName || 'N/A',
        'Ká»³ (ThÃ¡ng)': b.month || '',
        'NgÃ¢n sÃ¡ch Ä‘Äƒng kÃ½ (VNÄ)': b.amount || 0,
        'BÃ¡o cÃ¡o nghiá»‡m thu (VNÄ)': bcNT,
        'Tá»‰ lá»‡ (%)': Number(rate.toFixed(1)),
        'NgÃ y Ä‘Äƒng kÃ½': safeFormat(b.createdAt, 'dd/MM/yyyy HH:mm:ss'),
        'NgÆ°á»i Ä‘Äƒng kÃ½': b.userEmail || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Admin Filtered Budgets");
    
    worksheet['!cols'] = [
      { wch: 6 },  // STT
      { wch: 15 }, // ID Dá»± Ã¡n
      { wch: 25 }, // TÃªn Dá»± Ã¡n
      { wch: 20 }, // TÃªn Team
      { wch: 15 }, // MÃ£ Team
      { wch: 20 }, // GÄKD
      { wch: 20 }, // NgÆ°á»i triá»ƒn khai
      { wch: 12 }, // Ká»³ (ThÃ¡ng)
      { wch: 22 }, // NgÃ¢n sÃ¡ch Ä‘Äƒng kÃ½
      { wch: 22 }, // Thá»±c nghiá»‡m thu
      { wch: 20 }, // NgÃ y Ä‘Äƒng kÃ½
      { wch: 25 }  // NgÆ°á»i Ä‘Äƒng kÃ½
    ];

    const monthStr = adminBudgetMonthFilter || 'tat_ca';
    XLSX.writeFile(workbook, `admin_ngan_sach_loc_${monthStr}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
    toast.success('ÄÃ£ xuáº¥t danh sÃ¡ch ngÃ¢n sÃ¡ch Admin Ä‘Ã£ lá»c thÃ nh cÃ´ng');
  };

  const handleExportUnbudgetedAcceptances = () => {
    if (filteredUnbudgetedAcceptances.length === 0) {
      toast.error('KhÃ´ng cÃ³ dá»¯ liá»‡u Ä‘á»™i phÃ¡t sinh chi phÃ­ MKT chÆ°a Ä‘Äƒng kÃ½ ngÃ¢n sÃ¡ch Ä‘á»ƒ xuáº¥t');
      return;
    }

    const data = filteredUnbudgetedAcceptances.map((item, idx) => {
      return {
        'STT': idx + 1,
        'Dá»± Ã¡n': item.projectName,
        'TÃªn Team': item.teamName,
        'MÃ£ Team': item.teamCode || extractTeamCode(item.teamName),
        'GÄKD': extractGDKD(item.teamName),
        'ThÃ¡ng (Ká»³)': item.month,
        'Chi phÃ­ Nghiá»‡m thu MKT (VNÄ)': item.acceptanceCost,
        'NgÃ¢n sÃ¡ch ÄÄƒng kÃ½ (VNÄ)': 0,
        'Tráº¡ng thÃ¡i': 'ChÆ°a Ä‘Äƒng kÃ½ NgÃ¢n sÃ¡ch'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Phat sinh MKT Khong NS");
    
    worksheet['!cols'] = [
      { wch: 6 },  // STT
      { wch: 25 }, // Dá»± Ã¡n
      { wch: 20 }, // TÃªn Team
      { wch: 15 }, // MÃ£ Team
      { wch: 20 }, // GÄKD
      { wch: 12 }, // ThÃ¡ng
      { wch: 25 }, // CP Nghiá»‡m thu MKT
      { wch: 22 }, // NgÃ¢n sÃ¡ch ÄÄƒng kÃ½
      { wch: 25 }  // Tráº¡ng thÃ¡i
    ];

    const monthsStr = adminBudgetMonthFilter ? adminBudgetMonthFilter : 'all';
    XLSX.writeFile(workbook, `doi_phat_sinh_mkt_khong_ngan_sach_${monthsStr}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
    toast.success('ÄÃ£ xuáº¥t danh sÃ¡ch Ä‘á»™i phÃ¡t sinh MKT khÃ´ng ngÃ¢n sÃ¡ch (Excel) thÃ nh cÃ´ng');
  };

  const handleSyncReportNT = async () => {
    if (!inputReportNTUrl) {
      toast.error("Vui lÃ²ng nháº­p link Google Sheet");
      return;
    }

    // Extract Spreadsheet ID
    const match = inputReportNTUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match || !match[1]) {
      toast.error("Link Google Sheet khÃ´ng Ä‘Ãºng Ä‘á»‹nh dáº¡ng. Cáº§n dáº¡ng https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit...");
      return;
    }

    const spreadsheetId = match[1];
    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;

    setIsSyncingReportNT(true);

    try {
      const response = await fetch(exportUrl);
      if (!response.ok) {
        throw new Error("KhÃ´ng thá»ƒ táº£i file tá»« Google Sheet. HÃ£y cháº¯c cháº¯n link Google Sheet Ä‘Ã£ Ä‘Æ°á»£c chia sáº» cÃ´ng khai á»Ÿ cháº¿ Ä‘á»™ 'Báº¥t ká»³ ai cÃ³ liÃªn káº¿t Ä‘á»u cÃ³ thá»ƒ xem' (Anyone with link can view).");
      }
      
      const buffer = await response.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error("Tá»‡p Google Sheet rá»—ng hoáº·c khÃ´ng há»£p lá»‡.");
      }

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const dataArr: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (dataArr.length < 2) {
        throw new Error("Google Sheet cáº§n Ã­t nháº¥t 2 hÃ ng lÃ m tiÃªu Ä‘á» (hÃ ng 1 vÃ  hÃ ng 2) vÃ  cÃ¡c hÃ ng tiáº¿p theo lÃ m cÃ¡c báº£n ghi.");
      }

      const row1 = dataArr[0] || [];
      const row2 = dataArr[1] || [];
      const maxCols = Math.max(row1.length, row2.length);

      // Save headers
      const headers: string[] = [];
      for (let c = 0; c < maxCols; c++) {
        const h1 = String(row1[c] || '').trim();
        const h2 = String(row2[c] || '').trim();
        
        let headerName = '';
        if (h1 && h2) {
          headerName = h1 === h2 ? h1 : `${h1} - ${h2}`;
        } else {
          headerName = h1 || h2 || `Cá»™t ${c + 1}`;
        }
        headers.push(headerName);
      }

      // Read records (Row index 2 and onward)
      const records: any[] = [];
      for (let r = 2; r < dataArr.length; r++) {
        const rowData = dataArr[r];
        if (!rowData) continue;
        
        const isEmpty = rowData.every(val => val === null || val === undefined || String(val).trim() === '');
        if (isEmpty) continue;

        const record: Record<string, any> = { id_row: r + 1 };
        headers.forEach((header, c) => {
          record[header] = rowData[c] !== undefined && rowData[c] !== null ? rowData[c] : '';
        });
        records.push(record);
      }

      // Check permission: settings can only be saved to Firestore by isAdmin or isAccountant.
      const canWriteSettings = isAdmin || isAccountant;
      if (canWriteSettings) {
        // Helper to match nested/combined/loose column keys in each record object
        const getVal = (recordObj: Record<string, any>, possibleKeywords: string[]) => {
          for (const key of Object.keys(recordObj)) {
            if (key === 'id_row') continue;
            const cleanKey = key.trim().toLowerCase().normalize('NFC').replace(/\s+/g, '');
            for (const kw of possibleKeywords) {
              const cleanKW = kw.trim().toLowerCase().normalize('NFC').replace(/\s+/g, '');
              if (cleanKey.includes(cleanKW) || cleanKW.includes(cleanKey)) {
                return recordObj[key];
              }
            }
          }
          return undefined;
        };

        const findProjectMatch = (refObj: any) => {
          if (!refObj) return null;
          const cleanRef = String(refObj).toLowerCase().trim().normalize('NFC').replace(/[^a-z0-9]/g, '');
          if (!cleanRef) return null;
          return projects.find(p => {
            const pId = String(p.id || '').toLowerCase().trim().normalize('NFC').replace(/[^a-z0-9]/g, '');
            const pCode = String(p.projectCode || '').toLowerCase().trim().normalize('NFC').replace(/[^a-z0-9]/g, '');
            const pName = String(p.name || '').toLowerCase().trim().normalize('NFC').replace(/[^a-z0-9]/g, '');
            return pId === cleanRef || pCode === cleanRef || pName === cleanRef || cleanRef.includes(pName) || pName.includes(cleanRef);
          });
        };

        const findTeamMatch = (refObj: any) => {
          if (!refObj) return null;
          const cleanRef = String(refObj).toLowerCase().trim().normalize('NFC').replace(/[^a-z0-9]/g, '');
          if (!cleanRef) return null;
          return teams.find(t => {
            const tId = String(t.id || '').toLowerCase().trim().normalize('NFC').replace(/[^a-z0-9]/g, '');
            const tCode = String(t.teamCode || '').toLowerCase().trim().normalize('NFC').replace(/[^a-z0-9]/g, '');
            const tName = String(t.name || '').toLowerCase().trim().normalize('NFC').replace(/[^a-z0-9]/g, '');
            return tId === cleanRef || tCode === cleanRef || tName === cleanRef || cleanRef.includes(tName) || tName.includes(cleanRef);
          });
        };

        let updatedCount = 0;
        let insertedCount = 0;
        let skippedCount = 0;

        let batch = writeBatch(db);
        let opCount = 0;

        for (const record of records) {
          const monthRaw = getVal(record, ['ká»³ thÃ¡ng', 'thÃ¡ng', 'ká»³', 'month', 'thang']);
          const month = normalizeMonth(monthRaw);

          const teamRef = getVal(record, ['mÃ£ team', 'team', 'mateam', 'idteam', 'mÃ£ phÃ²ng', 'maphong']);
          const projectRef = getVal(record, ['tÃªn dá»± Ã¡n', 'dá»± Ã¡n', 'project', 'tenduan', 'projectname']);

          if (!month || !teamRef || !projectRef) {
            skippedCount++;
            continue;
          }

          const project = findProjectMatch(projectRef);
          const team = findTeamMatch(teamRef);

          if (!project || !team) {
            skippedCount++;
            continue;
          }

          // Parse cost metrics
          const fbDigitalChuaVat = parseVal(getVal(record, ['FB Digital ChÆ°a VAT', 'FB Digital C.VAT', 'Facebook ChÆ°a VAT', 'fb digital chua vat', 'fb chua vat']));
          let fbAds = parseVal(getVal(record, ['Facebook Ads', 'FB Ads', 'FBAds', 'facebookads', 'facebook ads', 'facebook', 'Digital (VAT 10%)', 'Digital VAT']));
          if (fbAds === 0 && fbDigitalChuaVat > 0) {
            fbAds = Math.round(fbDigitalChuaVat * 1.10);
          }

          const caNhanCost = parseVal(getVal(record, ['CÃ¡ nhÃ¢n', 'ca nhan', 'CÃ¡ nhÃ¢n cost', 'ca nhan cost']));
          const fbVisaCostChuaVat = parseVal(getVal(record, ['FB Visa ChÆ°a VAT', 'FB Visa Trá»±c Cháº¡y ChÆ°a VAT', 'Visa ChÆ°a VAT', 'fb visa chua vat', 'visa chua vat']));
          let visa = parseVal(getVal(record, ['VISA', 'visa', 'visa cost', 'chi phÃ­ visa', 'Visa Trá»±c Cháº¡y (10%)', 'Visa Trá»±c Cháº¡y 10%']));
          if (visa === 0 && fbVisaCostChuaVat > 0) {
            visa = Math.round(fbVisaCostChuaVat * 1.10);
          }

          const dangTinCaNhanCost = parseVal(getVal(record, ['ÄÄƒng Tin CÃ¡ NhÃ¢n', 'dang tin ca nhan', 'ÄÄƒng tin C.NhÃ¢n', 'dang tin ca nhan cost']));
          const dangTinCongTyChuaVat = parseVal(getVal(record, ['ÄÄƒng Tin CÃ´ng Ty ChÆ°a VAT', 'ÄÄƒng Tin C.Ty ChÆ°a VAT', 'dang tin cong ty chua vat', 'dang tin c ty chua vat']));
          let posting = parseVal(getVal(record, ['ÄÄƒng tin', 'Posting', 'dangtin', 'posting', 'ÄÄƒng Tin C.Ty (8%)', 'ÄÄƒng tin cÃ´ng ty 8%']));
          if (posting === 0 && dangTinCongTyChuaVat > 0) {
            posting = Math.round(dangTinCongTyChuaVat * 1.08);
          }

          const zaloAds = parseVal(getVal(record, ['Zalo Ads', 'Zalo', 'zaloads', 'zalo ads', 'zalo']));
          const googleAds = parseVal(getVal(record, ['Google Ads', 'Google', 'googleads', 'google ads', 'google', 'Google / Native']));
          const tiktokAds = parseVal(getVal(record, ['Tiktok Ads', 'TikTok', 'tiktokads', 'tiktok ads', 'tiktok']));
          const other = caNhanCost; // Map caNhanCost of other/caNhan for backwards compatibility with budget charts

          const totalCost = fbAds + caNhanCost + visa + dangTinCaNhanCost + posting + zaloAds + googleAds + tiktokAds;

          const existingAcc = acceptances.find(a => 
            a.projectId === project.id && 
            a.teamId === team.id && 
            a.month === month
          );

          if (existingAcc) {
            const ref = doc(db, 'acceptances', existingAcc.id);
            batch.update(ref, {
              projectName: project.name,
              projectCode: project.projectCode || '',
              teamName: team.name,
              teamCode: team.teamCode || '',
              fbDigitalChuaVat: fbDigitalChuaVat,
              facebookCost: fbAds,
              tiktokCost: tiktokAds,
              zaloCost: zaloAds,
              googleCost: googleAds,
              postingCost: posting,
              visaCost: visa,
              digitalCost: fbAds,
              otherCost: caNhanCost,
              fbVisaCostChuaVat: fbVisaCostChuaVat,
              dangTinCaNhanCost: dangTinCaNhanCost,
              dangTinCongTyChuaVat: dangTinCongTyChuaVat,
              caNhanCost: caNhanCost,
              totalCost: totalCost,
              beforeAcceptanceCost: totalCost,
              afterAcceptanceCost: existingAcc.status === 'TrÆ°á»›c nghiá»‡m thu' ? totalCost : existingAcc.afterAcceptanceCost,
              updatedAt: serverTimestamp(),
              updatedBy: user?.email || '',
              updatedByUid: user?.uid || ''
            });
            updatedCount++;
          } else {
            const ref = doc(collection(db, 'acceptances'));
            batch.set(ref, {
              projectId: project.id,
              projectName: project.name,
              projectCode: project.projectCode || '',
              teamId: team.id,
              teamName: team.name,
              teamCode: team.teamCode || '',
              month,
              fbDigitalChuaVat: fbDigitalChuaVat,
              facebookCost: fbAds,
              tiktokCost: tiktokAds,
              zaloCost: zaloAds,
              googleCost: googleAds,
              postingCost: posting,
              visaCost: visa,
              digitalCost: fbAds,
              otherCost: caNhanCost,
              fbVisaCostChuaVat: fbVisaCostChuaVat,
              dangTinCaNhanCost: dangTinCaNhanCost,
              dangTinCongTyChuaVat: dangTinCongTyChuaVat,
              caNhanCost: caNhanCost,
              totalCost: totalCost,
              beforeAcceptanceCost: totalCost,
              afterAcceptanceCost: totalCost,
              status: 'TrÆ°á»›c nghiá»‡m thu',
              createdAt: serverTimestamp(),
              createdBy: user?.email || '',
              createdByUid: user?.uid || '',
              updatedAt: serverTimestamp(),
              updatedBy: user?.email || '',
              updatedByUid: user?.uid || '',
              breakdown: {}
            });
            insertedCount++;
          }

          opCount++;
          if (opCount >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            opCount = 0;
          }
        }

        if (opCount > 0) {
          await batch.commit();
        }

        await setDoc(doc(db, 'settings', 'report_nt'), {
          sheetUrl: inputReportNTUrl,
          records: records,
          lastUpdated: new Date().toISOString()
        });

        toast.success(`Äá»“ng bá»™ thÃ nh cÃ´ng! Cáº­p nháº­t ${updatedCount} báº£n ghi, thÃªm má»›i ${insertedCount} báº£n ghi nghiá»‡m thu.`);
        if (skippedCount > 0) {
          toast.info(`Bá» qua ${skippedCount} báº£n ghi khÃ´ng khá»›p TÃªn Dá»± Ã¡n, MÃ£ Team hoáº·c ThÃ¡ng.`);
        }
      } else {
        // Fallback for demo / non-admin testing who want to trigger local sync:
        setReportNTUrl(inputReportNTUrl);
        setReportNTRecords(records);
        setReportNTLastUpdated(new Date().toISOString());
        toast.warning("ÄÃ£ Ä‘á»“ng bá»™ cá»¥c bá»™ táº¡m thá»i. LÆ°u Ã½: Chá»‰ Quáº£n trá»‹ viÃªn/Káº¿ toÃ¡n má»›i cÃ³ quyá»n lÆ°u cáº¥u hÃ¬nh liÃªn káº¿t lÃ¢u dÃ i vÃ o cÆ¡ sá»Ÿ dá»¯ liá»‡u há»‡ thá»‘ng.");
      }

    } catch (error: any) {
      console.error("Lá»—i Ä‘á»“ng bá»™ Google Sheet BÃ¡o cÃ¡o NT:", error);
      toast.error(`KhÃ´ng thá»ƒ Ä‘á»“ng bá»™: ${error.message || error}`);
    } finally {
      setIsSyncingReportNT(false);
    }
  };

  const handleExportCosts = () => {
    if (costs.length === 0) {
      toast.error('KhÃ´ng cÃ³ dá»¯ liá»‡u chi phÃ­ Ä‘á»ƒ xuáº¥t');
      return;
    }

    const data = costs.map(c => ({
      'ID Dá»± Ã¡n': c.projectId,
      'TÃªn Dá»± Ã¡n': c.projectName || '',
      'Team': c.teamName || '',
      'ThÃ¡ng': c.month,
      'Tuáº§n': c.weekNumber,
      'NgÆ°á»i triá»ƒn khai': c.implementerName || 'N/A',
      'FB Ads': c.channels?.fbAds || 0,
      'Posting': c.channels?.posting || 0,
      'Zalo Ads': c.channels?.zaloAds || 0,
      'Google Ads': c.channels?.googleAds || 0,
      'KhÃ¡c': c.channels?.otherCost || 0,
      'Tá»•ng chi phÃ­': c.amount,
      'Ghi chÃº': c.note || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Costs");
    XLSX.writeFile(workbook, `chi_phi_chi_tiet_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
    toast.success('ÄÃ£ xuáº¥t danh sÃ¡ch chi phÃ­ (Excel) thÃ nh cÃ´ng');
  };

  const handleDownloadBudgetTemplate = () => {
    const headers = ['ID Dá»± Ã¡n', 'ID Team', 'ThÃ¡ng', 'NgÆ°á»i triá»ƒn khai', 'NgÃ¢n sÃ¡ch'];
    const sampleData = [
      ['p_id_1', 't_id_1', '2026-03', 'Nguyá»…n VÄƒn A', '50000000'],
      ['p_id_2', 't_id_2', '2026-03', 'Tráº§n Thá»‹ B', '75000000']
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

          const pRef = String(getVal(['ID Dá»± Ã¡n', 'MÃ£ Dá»± Ã¡n', 'Dá»± Ã¡n', 'ProjectID', 'idduan', 'id dá»± Ã¡n', 'mÃ£ dá»± Ã¡n']) || '').trim();
          const tRef = String(getVal(['ID Team', 'MÃ£ Team', 'TÃªn Team', 'TeamID', 'teamid', 'id team', 'mÃ£ team']) || '').trim();
          const monthRaw = getVal(['ThÃ¡ng', 'Ká»³', 'Month', 'thang', 'thaÌng', 'ky', 'ká»³']);
          const month = normalizeMonth(monthRaw);
          const amountRaw = getVal(['NgÃ¢n sÃ¡ch', 'Amount', 'ngansach', 'ngÃ¢n saÌch', 'ngÃ¢nsÃ¡ch', 'sá»‘ tiá»n']);
          const amountDecimal = String(amountRaw || '0').replace(/[.,]/g, '');
          const amount = Number(amountDecimal);
          const implementer = String(getVal(['NgÆ°á»i phá»¥ trÃ¡ch', 'GiaÌm Ä‘Ã´Ìc kinh doanh', 'GDDA', 'NgÆ°á»i triá»ƒn khai', 'Implementer', 'nguoiphutrach', 'giamdockinhdoanh', 'nguoitrienkhai', 'ngÆ°Æ¡Ì€i triÃªÌ‰n khai', ' GD']) || '').trim();

          if (pRef && tRef && month && (amount >= 0 || !isNaN(amount))) {
            const key = `${pRef}_${tRef}_${month}`;
            if (consolidatedDataMap.has(key)) {
              consolidatedDataMap.get(key).amount += amount;
            } else {
              consolidatedDataMap.set(key, { pRef, tRef, month, amount, implementer, rawRow: processedRow });
            }
          } else if (Object.values(normalizedRow).some(v => v !== '')) {
             const missing = [];
             if (!pRef) missing.push('Dá»± Ã¡n');
             if (!tRef) missing.push('Team');
             if (!month) missing.push('ThÃ¡ng/Ká»³');
             if (isNaN(amount)) missing.push('NgÃ¢n sÃ¡ch (khÃ´ng pháº£i sá»‘)');
             
             errorDetailsList.push(
               `THÃ”NG TIN SAI Äá»ŠNH Dáº NG HOáº¶C THIáº¾U: (${missing.join(', ')}).\n` +
               `â€¢ NguyÃªn nhÃ¢n: Cá»™t "${missing[0]}" Ä‘ang Ä‘á»ƒ trá»‘ng hoáº·c chá»©a kÃ½ tá»± khÃ´ng há»£p lá»‡ (Ä‘á»‘i vá»›i sá»‘ tiá»n).\n` +
               `â€¢ CÃ¡ch kháº¯c phá»¥c: Äiá»n Ä‘áº§y Ä‘á»§ thÃ´ng tin Dá»± Ã¡n, Team, ThÃ¡ng (YYYY-MM). Äá»‘i vá»›i NgÃ¢n sÃ¡ch chá»‰ Ä‘iá»n chá»¯ sá»‘, khÃ´ng kÃ¨m Ä‘Æ¡n vá»‹ VNÄ hay dáº¥u cháº¥m phÃ¢n cÃ¡ch.`
             );
             errorsCount++;
          }
        }

        const consolidatedItems = Array.from(consolidatedDataMap.values()) as any[];

        for (const item of consolidatedItems) {
          const findProjectAddress = (ref: string) => {
            if (!ref) return null;
            const cleanRef = String(ref).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            if (!cleanRef) return null;
            return projects.find(p => 
              p.id === ref || 
              (p.projectCode && String(p.projectCode).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
              (p.name && String(p.name).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef)
            );
          };

          const findTeamAddress = (ref: string) => {
            if (!ref) return null;
            const cleanRef = String(ref).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            if (!cleanRef) return null;
            return teams.find(t => 
              t.id === ref || 
              (t.teamCode && String(t.teamCode).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
              (t.name && String(t.name).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef)
            );
          };

          const project = findProjectAddress(item.pRef);
          const team = findTeamAddress(item.tRef);

          if (!project) {
            errorDetailsList.push(
              `KHÃ”NG TÃŒM THáº¤Y Dá»° ÃN khá»›p vá»›i "${item.pRef}".\n` +
              `â€¢ NguyÃªn nhÃ¢n: TÃªn hoáº·c mÃ£ Dá»± Ã¡n khÃ´ng tá»“n táº¡i. "Dá»± Ã¡n" hiá»ƒn thá»‹ trong file lÃ  "${item.pRef}".\n` +
              `â€¢ CÃ¡ch kháº¯c phá»¥c: Äá»‘i chiáº¿u vá»›i danh sÃ¡ch Dá»± Ã¡n trong há»‡ thá»‘ng Ä‘á»ƒ láº¥y Ä‘Ãºng tÃªn hoáº·c ID.`
            );
            errorsCount++;
            continue;
          }
          if (!team) {
            errorDetailsList.push(
              `KHÃ”NG TÃŒM THáº¤Y TEAM khá»›p vá»›i "${item.tRef}".\n` +
              `â€¢ NguyÃªn nhÃ¢n: TÃªn hoáº·c mÃ£ Team khÃ´ng tá»“n táº¡i. "Team" hiá»ƒn thá»‹ trong file lÃ  "${item.tRef}".\n` +
              `â€¢ CÃ¡ch kháº¯c phá»¥c: Äá»‘i chiáº¿u vá»›i danh sÃ¡ch Team trong há»‡ thá»‘ng Ä‘á»ƒ láº¥y Ä‘Ãºng tÃªn hoáº·c ID.`
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
          toast.success(`ÄÃ£ cáº­p nháº­t ${count} ngÃ¢n sÃ¡ch. ${errorsCount > 0 ? `Bá» qua ${errorsCount} dÃ²ng lá»—i.` : ''}`);
        }

        if (count === 0 && errorsCount > 0) {
          toast.error(`KhÃ´ng cÃ³ dá»¯ liá»‡u há»£p lá»‡ Ä‘á»ƒ nháº­p. CÃ³ ${errorsCount} dÃ²ng lá»—i.`);
        } else if (count === 0) {
          toast.error(`KhÃ´ng cÃ³ dá»¯ liá»‡u há»£p lá»‡ Ä‘á»ƒ nháº­p. Vui lÃ²ng kiá»ƒm tra tiÃªu Ä‘á» cá»™t vÃ  ná»™i dung.`);
        }

        if (errorsCount > 0 || errorDetailsList.length > 0) {
          setImportErrors(errorDetailsList);
          setIsImportErrorsDialogOpen(true);
        }
      } catch (error) {
        console.error(error);
        toast.error('Lá»—i khi nháº­p dá»¯ liá»‡u');
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
          toast.error('Lá»—i khi Ä‘á»c file Excel');
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
          toast.error('Lá»—i khi Ä‘á»c file CSV');
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
      if (!ref) return null;
      const cleanRef = String(ref).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      if (!cleanRef) return null;
      return projects.find(p => 
        p.id === ref || 
        (p.projectCode && String(p.projectCode).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
        (p.name && String(p.name).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef)
      );
    };

    const findTeamInternal = (ref: string) => {
      if (!ref) return null;
      const cleanRef = String(ref).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      if (!cleanRef) return null;
      return teams.find(t => 
        t.id === ref || 
        (t.teamCode && String(t.teamCode).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
        (t.name && String(t.name).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef)
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

          const pRef = String(getVal(['ID Dá»± Ã¡n', 'MÃ£ Dá»± Ã¡n', 'Dá»± Ã¡n', 'ProjectID', 'idduan', 'id dá»± Ã¡n', 'mÃ£ dá»± Ã¡n']) || '').trim();
          const tRef = String(getVal(['ID Team', 'MÃ£ Team', 'TÃªn Team', 'TeamID', 'idteam', 'id team', 'mÃ£ team']) || '').trim();
          const monthRaw = getVal(['ThÃ¡ng', 'Ká»³ thÃ¡ng', 'Ká»³', 'Month', 'thang', 'thaÌng', 'ká»³']);
          const month = normalizeMonth(monthRaw);
          const periodValue = String(getVal(['Tuáº§n', 'Ká»³ tuáº§n', 'Week', 'Period', 'tuan', 'tuÃ¢Ì€n', 'ky']) || '').trim();
          
          const fbAds = parseVal(getVal(['FBAds', 'FB Ads', 'Facebook Ads', 'Facebook', 'Chi phÃ­ FB', 'QC Facebook', 'Ads FB', 'chiphi fb', 'facebook ads', 'ads facebook', 'facebook ads']));
          const posting = parseVal(getVal(['Posting', 'ÄÄƒng bÃ i', 'Content', 'Content & Design', 'Content/Design', 'dangbai', 'chiphi content', 'posting/content', 'posting & content']));
          const zaloAds = parseVal(getVal(['ZaloAds', 'Zalo Ads', 'Zalo', 'Chi phÃ­ Zalo', 'QC Zalo', 'Ads Zalo', 'chiphi zalo', 'zalo ads', 'ads zalo']));
          const googleAds = parseVal(getVal(['GoogleAds', 'Google Ads', 'Google', 'Chi phÃ­ Google', 'QC Google', 'SEM', 'Ads Google', 'chiphi google', 'google ads', 'ads google', 'sem/google']));
          const otherCost = parseVal(getVal(['OtherCost', 'Chi phÃ­ khÃ¡c', 'KhÃ¡c', 'PhÃ¡t sinh', 'KhÃ¡c (PhÃ¡t sinh)', 'chiphikhac', 'phatsinh', 'chi phi khac']));
          const note = String(getVal(['Note', 'Ghi chÃº', 'Ghi chÃº thÃªm', 'ghichu']) || '');

          if (!pRef || !tRef || !month) {
            const hasData = Object.values(row).some(v => v !== '');
            if (hasData) {
              const missingFields = [];
              if (!pRef) missingFields.push('Dá»± Ã¡n');
              if (!tRef) missingFields.push('Team');
              if (!month) missingFields.push('ThÃ¡ng');
              errorDetailsList.push(
                `DÃ²ng ${rowIndex}: THIáº¾U THÃ”NG TIN Báº®T BUá»˜C (${missingFields.join(', ')}).\n` +
                `â€¢ NguyÃªn nhÃ¢n: Má»™t trong cÃ¡c cá»™t báº¯t buá»™c bá»‹ trá»‘ng.\n` +
                `â€¢ CÃ¡ch kháº¯c phá»¥c: HÃ£y Ä‘iá»n Ä‘áº§y Ä‘á»§ Dá»± Ã¡n, Team vÃ  ThÃ¡ng thá»±c chi.`
              );
              errorsCount++;
            }
            continue;
          }

          const project = findProjectInternal(pRef);
          const team = findTeamInternal(tRef);

          if (!project) {
            errorDetailsList.push(
              `DÃ²ng ${rowIndex}: KHÃ”NG TÃŒM THáº¤Y Dá»° ÃN khá»›p vá»›i "${pRef}".\n` +
              `â€¢ NguyÃªn nhÃ¢n: Há»‡ thá»‘ng khÃ´ng nháº­n diá»‡n Ä‘Æ°á»£c dá»± Ã¡n nÃ y.\n` +
              `â€¢ CÃ¡ch kháº¯c phá»¥c: Kiá»ƒm tra láº¡i tÃªn hoáº·c ID Dá»± Ã¡n trong danh sÃ¡ch Quáº£n lÃ½ Dá»± Ã¡n.`
            );
            errorsCount++;
            continue;
          }
          if (!team) {
            errorDetailsList.push(
              `DÃ²ng ${rowIndex}: KHÃ”NG TÃŒM THáº¤Y TEAM khá»›p vá»›i "${tRef}".\n` +
              `â€¢ NguyÃªn nhÃ¢n: Há»‡ thá»‘ng khÃ´ng nháº­n diá»‡n Ä‘Æ°á»£c team nÃ y.\n` +
              `â€¢ CÃ¡ch kháº¯c phá»¥c: Kiá»ƒm tra láº¡i tÃªn hoáº·c ID Team trong danh sÃ¡ch Quáº£n lÃ½ Team.`
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
              `DÃ²ng ${rowIndex}: KHÃ”NG CÃ“ NGÃ‚N SÃCH ÄÃƒ DUYá»†T cho [${project.name}] - [${team.name}] thÃ¡ng ${month}.\n` +
              `â€¢ NguyÃªn nhÃ¢n: Dá»¯ liá»‡u nháº­p vÃ o chÆ°a khá»›p vá»›i danh sÃ¡ch dá»± Ã¡n/team hiá»‡n cÃ³.\n` +
              `â€¢ CÃ¡ch kháº¯c phá»¥c: Vui lÃ²ng nháº­p NgÃ¢n sÃ¡ch cho dá»± Ã¡n nÃ y trÆ°á»›c khi nháº­p chi phÃ­ thá»±c táº¿.`
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
          toast.success(`ÄÃ£ nháº­p thÃ nh cÃ´ng ${count} báº£n ghi. ${errorsCount > 0 ? `Bá» qua ${errorsCount} dÃ²ng lá»—i.` : ''}`);
          if (errorsCount > 0) {
            setImportErrors(errorDetailsList);
            setIsImportErrorsDialogOpen(true);
          }
        } else {
           if (errorDetailsList.length > 0) {
            setImportErrors(errorDetailsList);
            setIsImportErrorsDialogOpen(true);
          } else {
            toast.error(`KhÃ´ng thá»ƒ nháº­p dá»¯ liá»‡u. Kiá»ƒm tra Ä‘á»‹nh dáº¡ng file.`);
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
          toast.error('Lá»—i khi Ä‘á»c file Excel');
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
          toast.error('Lá»—i khi Ä‘á»c file CSV');
          setIsImportingCosts(false);
        }
      });
    }
  };

  const handleImportCostsFromUrl = async () => {
    if (!costSheetUrl) {
      toast.error("Vui lÃ²ng nháº­p link Google Sheet");
      return;
    }

    // Extract Spreadsheet ID
    const match = costSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match || !match[1]) {
      toast.error("Link Google Sheet khÃ´ng Ä‘Ãºng Ä‘á»‹nh dáº¡ng");
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
        throw new Error("KhÃ´ng thá»ƒ táº£i file tá»« Google Sheet. HÃ£y Ä‘áº£m báº£o file Ä‘Ã£ Ä‘Æ°á»£c chia sáº» cÃ´ng khai.");
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
            return str.includes('chiphi') || str.includes('fbads') || str.includes('zalo') || str.includes('idduan') || str.includes('cÄƒnbaÌn') || str.includes('idteam') || str.includes('dá»±Ã¡n');
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
        toast.error("KhÃ´ng tÃ¬m tháº¥y dá»¯ liá»‡u há»£p lá»‡ trong Google Sheet.");
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

        const pRef = String(getVal(['ID Dá»± Ã¡n', 'MÃ£ Dá»± Ã¡n', 'Dá»± Ã¡n', 'ProjectID', 'idduan', 'id dá»± Ã¡n', 'tÃªn dá»± Ã¡n', 'mÃ£ dá»± Ã¡n']) || '').trim();
        const tRef = String(getVal(['ID Team', 'MÃ£ Team', 'TÃªn Team', 'TeamID', 'idteam', 'id team', 'mÃ£ team', 'tÃªn team']) || '').trim();
        const monthRaw = getVal(['ThÃ¡ng', 'Ká»³ thÃ¡ng', 'Ká»³', 'Month', 'thang', 'thaÌng', 'thaÌng', 'ká»³']);
        const month = normalizeMonth(monthRaw);
        const period = String(getVal(['Tuáº§n', 'Ká»³ tuáº§n', 'Week', 'Period', 'tuan', 'tuÃ¢Ì€n', 'ká»³']) || '').trim();
        
        // Cost values with even more expanded aliases
        const fbAds = parseVal(getVal(['FBAds', 'FB Ads', 'Facebook Ads', 'Facebook', 'Chi phÃ­ FB', 'QC Facebook', 'Ads FB', 'chiphi fb', 'facebook ads', 'ads facebook']));
        const posting = parseVal(getVal(['Posting', 'ÄÄƒng bÃ i', 'Content', 'Content & Design', 'Content/Design', 'dangbai', 'chiphi content', 'posting/content', 'chi phÃ­ content']));
        const zaloAds = parseVal(getVal(['ZaloAds', 'Zalo Ads', 'Zalo', 'Chi phÃ­ Zalo', 'QC Zalo', 'Ads Zalo', 'chiphi zalo', 'zalo ads', 'ads zalo']));
        const googleAds = parseVal(getVal(['GoogleAds', 'Google Ads', 'Google', 'Chi phÃ­ Google', 'QC Google', 'SEM', 'Ads Google', 'chiphi google', 'google ads', 'ads google', 'sem/google']));
        const otherCost = parseVal(getVal(['OtherCost', 'Chi phÃ­ khÃ¡c', 'KhÃ¡c', 'PhÃ¡t sinh', 'KhÃ¡c (PhÃ¡t sinh)', 'chiphikhac', 'phatsinh', 'chi phÃ­ phÃ¡t sinh']));
        const note = String(getVal(['Note', 'Ghi chÃº', 'Ghi chÃº thÃªm', 'ghichu', 'ghi chÃº']) || '');

        // Efficiency values
        const salesCount = parseVal(getVal(['CÄƒn bÃ¡n', 'Sá»‘ cÄƒn bÃ¡n', 'Sales Count', 'Sales', 'Sá»‘ cÄƒn', 'CÄƒn', 'canban', 'socanban', 'units', 'sá»‘ lÆ°á»£ng']));
        const revenue = parseVal(getVal(['Doanh sá»‘', 'Revenue', 'Doanh thu', 'Thá»±c Ä‘áº¡t', 'Tá»•ng doanh thu', 'Doanh thu thá»±c', 'doanhso', 'doanhthu', 'thá»±c thu']));

        if (!pRef || !tRef || !month) {
          // Skip truly empty rows without error
          const hasAnyData = Object.values(normalizedRow).some(v => v !== '');
          if (hasAnyData) {
            errorDetails.push(`DÃ²ng ${rowIndex}: Thiáº¿u thÃ´ng tin báº¯t buá»™c (Dá»± Ã¡n: "${pRef}", Team: "${tRef}", Ká»³: "${month}")`);
            skippedCount++;
          }
          continue;
        }

        const findProject = (ref: string) => {
          if (!ref) return null;
          const cleanRef = String(ref).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
          if (!cleanRef) return null;
          return projects.find(p => 
            p.id === ref || 
            (p.projectCode && String(p.projectCode).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
            (p.name && String(p.name).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef)
          );
        };

        const findTeam = (ref: string) => {
          if (!ref) return null;
          const cleanRef = String(ref).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
          if (!cleanRef) return null;
          return teams.find(t => 
            t.id === ref || 
            (t.teamCode && String(t.teamCode).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
            (t.name && String(t.name).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef)
          );
        };

        const project = findProject(pRef);
        const team = findTeam(tRef);

        if (!project) {
          errorDetails.push(`DÃ²ng ${rowIndex}: KhÃ´ng tÃ¬m tháº¥y Dá»± Ã¡n khá»›p vá»›i "${pRef}"`);
          skippedCount++;
          continue;
        }
        if (!team) {
          errorDetails.push(`DÃ²ng ${rowIndex}: KhÃ´ng tÃ¬m tháº¥y Team khá»›p vá»›i "${tRef}"`);
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
          }
        }

        // 2. Process Efficiency (if efficiency values exist)
        if (salesCount > 0 || revenue > 0) {
          const docRef = doc(collection(db, 'efficiencyReports'));
          batch.set(docRef, {
            projectId,
            projectName: project.name,
            teamName: team.name,
            teamId: teamId,
            month,
            year,
            salesCount,
            revenue,
            createdAt: serverTimestamp(),
            createdBy: user?.uid,
            createdByEmail: user?.email?.toLowerCase()
          });
          efficiencyCount++;
        }
      }

      if (costCount > 0 || efficiencyCount > 0) {
        await batch.commit();
        await logAction('IMPORT_URL', 'multiple', 'bulk', { costs: costCount, efficiency: efficiencyCount, skipped: skippedCount });
        toast.success(`ÄÃ£ xá»­ lÃ½ xong dá»¯ liá»‡u Google Sheet.\n- ThÃ nh cÃ´ng: ${costCount} chi phÃ­, ${efficiencyCount} hiá»‡u quáº£.\n- Bá» qua: ${skippedCount} dÃ²ng.`);
      } else {
        toast.warning(`KhÃ´ng phÃ¡t hiá»‡n dá»¯ liá»‡u chi phÃ­/hiá»‡u quáº£ má»›i nÃ o Ä‘á»ƒ nháº­p.`);
      }

      if (errorDetails.length > 0) {
        setImportErrors(errorDetails);
        setIsImportErrorsDialogOpen(true);
      }

      setIsImportCostsDialogOpen(false);
    } catch (error) {
       handleFirestoreError(error, OperationType.WRITE, 'import');
    } finally {
       setIsImportingCostsUrl(false);
       setIsImportingCosts(false);
    }
  };


  const handleImportAcceptancesCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingAcceptances(true);
    setImportErrors([]);

    const findProjectInternal = (ref: string) => {
      if (!ref) return null;
      const cleanRef = String(ref).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      if (!cleanRef) return null;
      return projects.find(p => 
        p.id === ref || 
        (p.projectCode && String(p.projectCode).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
        (p.name && String(p.name).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef)
      );
    };

    const findTeamInternal = (ref: string) => {
      if (!ref) return null;
      const cleanRef = String(ref).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      if (!cleanRef) return null;
      return teams.find(t => 
        t.id === ref || 
        (t.teamCode && String(t.teamCode).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef) ||
        (t.name && String(t.name).toLowerCase().trim().replace(/[^a-z0-9]/g, '') === cleanRef)
      );
    };

    const processAcceptanceData = async (data: any[]) => {
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

          const pRef = String(getVal(['ID Dá»± Ã¡n', 'MÃ£ Dá»± Ã¡n', 'Dá»± Ã¡n', 'ProjectID', 'idduan', 'id dá»± Ã¡n', 'mÃ£ dá»± Ã¡n']) || '').trim();
          const tRef = String(getVal(['ID Team', 'MÃ£ Team', 'TÃªn Team', 'TeamID', 'idteam', 'id team', 'mÃ£ team']) || '').trim();
          const monthRaw = getVal(['ThÃ¡ng', 'Ká»³ thÃ¡ng', 'Ká»³', 'Month', 'thang', 'thaÌng', 'ká»³']);
          const month = normalizeMonth(monthRaw);
          
          const fbAds = parseVal(getVal(['Facebook Ads', 'FB Ads', 'FBAds', 'facebookads', 'facebook ads']));
          const tiktokAds = parseVal(getVal(['Tiktok Ads', 'TikTok', 'tiktokads', 'tiktok ads']));
          const zaloAds = parseVal(getVal(['Zalo Ads', 'Zalo', 'zaloads', 'zalo ads']));
          const googleAds = parseVal(getVal(['Google Ads', 'Google', 'googleads', 'google ads']));
          const posting = parseVal(getVal(['ÄÄƒng tin', 'Posting', 'dangtin', 'posting']));
          const visa = parseVal(getVal(['VISA', 'visa', 'visa cost', 'chi phÃ­ visa']));
          const digital = parseVal(getVal(['Digital', 'digital', 'digital cost', 'chi phÃ­ digital']));
          const other = parseVal(getVal(['KhÃ¡c', 'Other', 'khac', 'other cost']));

          if (!pRef || !tRef || !month) {
            const hasData = Object.values(row).some(v => v !== '');
            if (hasData) {
              errorDetailsList.push(`DÃ²ng ${rowIndex}: Thiáº¿u thÃ´ng tin báº¯t buá»™c (Dá»± Ã¡n, Team hoáº·c ThÃ¡ng).`);
              errorsCount++;
            }
            continue;
          }

          const project = findProjectInternal(pRef);
          const team = findTeamInternal(tRef);

          if (!project) {
            errorDetailsList.push(`DÃ²ng ${rowIndex}: KhÃ´ng tÃ¬m tháº¥y dá»± Ã¡n khá»›p vá»›i "${pRef}".`);
            errorsCount++;
            continue;
          }
          if (!team) {
            errorDetailsList.push(`DÃ²ng ${rowIndex}: KhÃ´ng tÃ¬m tháº¥y team khá»›p vá»›i "${tRef}".`);
            errorsCount++;
            continue;
          }

          const totalCost = fbAds + tiktokAds + zaloAds + googleAds + posting + other;

          const docRef = doc(collection(db, 'acceptances'));
          const finalPayload: any = {
            projectId: project.id,
            projectName: project.name,
            projectCode: project.projectCode || '',
            teamId: team.id,
            teamName: team.name,
            teamCode: team.teamCode || '',
            month,
            facebookCost: fbAds,
            tiktokCost: tiktokAds,
            zaloCost: zaloAds,
            googleCost: googleAds,
            postingCost: posting,
            visaCost: visa,
            digitalCost: digital,
            otherCost: other,
            totalCost: totalCost,
            beforeAcceptanceCost: totalCost,
            afterAcceptanceCost: totalCost,
            status: 'ÄÃ£ nghiá»‡m thu',
            createdAt: serverTimestamp(),
            createdBy: user?.email || '',
            createdByUid: user?.uid || '',
            updatedAt: serverTimestamp(),
            updatedBy: user?.email || '',
            updatedByUid: user?.uid || '',
            breakdown: {},
            editHistory: [{
              action: 'CREATE_IMPORT',
              editorName: user?.displayName || user?.email || 'Unknown',
              editorEmail: user?.email || '',
              timestamp: new Date().toISOString(),
              changes: {
                "ThÃ¡ng": { old: null, new: month },
                "Team": { old: null, new: team.name },
                "Dá»± Ã¡n": { old: null, new: project.name },
                "Tá»•ng chi phÃ­": { old: null, new: totalCost }
              }
            }]
          };

          batch.set(docRef, finalPayload);

          const finalDocRef = doc(collection(db, 'finalAcceptances'));
          batch.set(finalDocRef, {
            ...finalPayload,
            originalAcceptanceId: docRef.id,
            totalActualCost: totalCost,
            finalizedAt: serverTimestamp(),
            finalizedBy: user?.email || '',
            finalizedByUid: user?.uid || '',
          });
          count++;
        }

        if (count > 0) {
          await batch.commit();
          await logAction('IMPORT_ACCEPTANCES', 'acceptances', 'bulk', { count, errors: errorsCount });
          toast.success(`ÄÃ£ nháº­p thÃ nh cÃ´ng ${count} báº£n ghi nghiá»‡m thu.`);
        }

        if (errorsCount > 0) {
          setImportErrors(errorDetailsList);
          setIsImportErrorsDialogOpen(true);
        }
        
        setIsImportAcceptancesDialogOpen(false);
      } catch (error: any) {
        handleFirestoreError(error, OperationType.WRITE, 'acceptances');
      } finally {
        setIsImportingAcceptances(false);
        if (e.target) e.target.value = '';
      }
    };

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = async (event: any) => {
        try {
          const buffer = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(firstSheet);
          await processAcceptanceData(json);
        } catch (error) {
          console.error(error);
          toast.error('Lá»—i khi Ä‘á»c file Excel');
          setIsImportingAcceptances(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          await processAcceptanceData(results.data);
        },
        error: (error) => {
          toast.error('Lá»—i khi Ä‘á»c file CSV');
          setIsImportingAcceptances(false);
        }
      });
    }
  };

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
    return 4; // Ká»³ cuá»‘i lÃ  nhá»¯ng ngÃ y cÃ²n láº¡i
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
        // Ká»³ 4: Until the end (20th of month M)
        periodStart.setDate(startDate.getDate() + 21);
        periodEnd = new Date(year, month - 1, 20);
      }
      
      return `${format(periodStart, 'd/M')} - ${format(periodEnd, 'd/M')}`;
    } catch (e) {
      return '';
    }
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-pulse text-slate-400">Äang táº£i...</div>
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
                  src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 80' fill='none'><path d='M50 15 L88 53 H74 L50 28 L26 53 H12 Z' fill='%23E45A1D'/><path d='M50 28 L64 42 L50 56 L36 42 Z' fill='%23E45A1D'/><path d='M12 53 L31 21 H43 L24 53 Z' fill='%23E45A1D'/><path d='M88 53 L69 21 H57 L76 53 Z' fill='%23E45A1D'/></svg>" 
                  alt="MAYHOMES Logo" 
                  className="w-full h-full object-contain p-2"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="space-y-1">
                <h2 className="text-4xl font-black tracking-tighter text-slate-900 flex justify-center items-center">
                  <span className="text-[#1A4BAC]">MAY</span>
                  <span className="text-[#1A4BAC]">HOMES</span>
                </h2>
                <p className="text-[10px] font-bold text-blue-800 tracking-[0.2em] uppercase">KhÆ¡i nguá»“n cuá»™c sá»‘ng tinh hoa</p>
              </div>
            </div>
            <div className="pt-4 space-y-3">
              <CardTitle className="text-xl font-bold tracking-tight text-slate-800">Marketing Cost Control</CardTitle>
              <div className="space-y-4">
                <CardDescription className="text-slate-500">Há»‡ thá»‘ng quáº£n lÃ½ chi phÃ­ marketing chuyÃªn nghiá»‡p</CardDescription>
                <DeveloperFooter className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <Button onClick={login} className="w-full h-12 text-lg font-bold bg-[#1A4BAC] hover:bg-[#113273] text-white shadow-md shadow-blue-200/50 transition-all rounded-xl cursor-pointer" size="lg">
              <LogIn className="mr-2 h-5 w-5" /> ÄÄƒng nháº­p báº±ng Google
            </Button>

            {/* Zalo / WebView Auth Helper Panel */}
            <div className={`mt-4 border rounded-2xl overflow-hidden transition-all duration-300 ${isWebView ? 'border-amber-200 bg-amber-50/40' : 'border-slate-100 bg-slate-50/50'}`}>
              <div 
                className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-slate-50 select-none transition-colors"
                onClick={() => {
                  setShowAuthHelper(!showAuthHelper);
                }}
              >
                <div className="flex items-center gap-2">
                  <Info className={`w-4 h-4 ${isWebView ? 'text-amber-600' : 'text-slate-500'}`} />
                  <span className={`text-xs font-bold ${isWebView ? 'text-amber-900 font-extrabold' : 'text-slate-705 font-bold'}`}>
                    {isWebView ? 'âš ï¸ Lá»—i ÄÄƒng nháº­p trÃªn Zalo / Messenger?' : 'Trá»£ giÃºp khi gáº·p lá»—i ÄÄƒng nháº­p'}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isWebView ? 'text-amber-500' : 'text-slate-400'} ${showAuthHelper ? 'rotate-180' : ''}`} />
              </div>

              {showAuthHelper && (
                <div className="p-4 pt-0 border-t border-dashed border-slate-200/80 space-y-3.5 text-xs animate-in fade-in duration-200">
                  <div className="space-y-2 mt-3 text-slate-700 leading-relaxed">
                    <p>
                      Máº·c Ä‘á»‹nh, cÃ¡c á»©ng dá»¥ng chat nhÆ° <strong>Zalo</strong>, <strong>Facebook</strong> hoáº·c <strong>Messenger</strong> sáº½ má»Ÿ liÃªn káº¿t báº±ng trÃ¬nh duyá»‡t tÃ­ch há»£p riÃªng (WebView).
                    </p>
                    <p className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 font-medium leading-relaxed">
                      ðŸ”’ Äá»ƒ báº£o máº­t, Google <strong>ngÄƒn cáº£n Ä‘Äƒng nháº­p tÃ i khoáº£n (Lá»—i 403: disallowed_useragent)</strong> trong trÃ¬nh duyá»‡t tÃ­ch há»£p nÃ y Ä‘á»ƒ trÃ¡nh nguy cÆ¡ giáº£ máº¡o.
                    </p>
                  </div>

                  <div className={`p-3.5 rounded-xl border ${isWebView ? 'bg-amber-100/50 border-amber-200 text-amber-900' : 'bg-blue-50/45 border-blue-100 text-slate-800'} space-y-2`}>
                    <p className="font-bold text-slate-950">ðŸ’¡ CÃ¡ch kháº¯c phá»¥c nhanh trong 5 giÃ¢y:</p>
                    <ol className="list-decimal pl-4 space-y-1.5">
                      <li>NhÃ¬n lÃªn gÃ³c trÃªn bÃªn pháº£i mÃ n hÃ¬nh Zalo, nháº¥n chá»n nÃºt <strong>Menu Ba cháº¥m (...)</strong> hoáº·c biá»ƒu tÆ°á»£ng TÃ¹y chá»n trÃ¬nh duyá»‡t.</li>
                      <li>Chá»n <strong>"Má»Ÿ báº±ng trÃ¬nh duyá»‡t"</strong> (hoáº·c <strong>"Má»Ÿ báº±ng Safari / Chrome / TrÃ¬nh duyá»‡t máº·c Ä‘á»‹nh"</strong>).</li>
                      <li>Há»‡ thá»‘ng sáº½ chuyá»ƒn sang trÃ¬nh duyá»‡t chÃ­nh thá»©c cá»§a Ä‘iá»‡n thoáº¡i, giÃºp báº¡n Ä‘Äƒng nháº­p Google thÃ nh cÃ´ng vÃ  an toÃ n.</li>
                    </ol>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        toast.success('ÄÃ£ sao chÃ©p link á»©ng dá»¥ng!');
                      }}
                      className="flex-1 text-[11px] font-bold border-slate-200 text-slate-700 hover:bg-slate-100 h-9 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-500" /> Sao chÃ©p Link chuáº©n
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        window.open(window.location.href, '_blank');
                      }}
                      className="text-[11px] font-bold border-slate-200 text-slate-700 hover:bg-slate-100 h-9 rounded-xl flex items-center justify-center gap-1.5 px-3.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" /> Thá»­ má»Ÿ ngoÃ i
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className={cn(
        "sticky top-0 z-50 w-full bg-white/95 backdrop-blur-xl border-b border-slate-200/50 transition-all duration-300",
        isScrolled ? "py-1.5 shadow-sm bg-white/98" : "py-3 shadow-md"
      )}>
        <div className={cn(
          "max-w-7xl mx-auto px-4 flex items-center justify-between transition-all duration-300 gap-2 sm:gap-4",
          isScrolled ? "h-11 sm:h-12" : "h-16 sm:h-18"
        )}>
          {/* Left Side: Collapse Menu Button & Logo */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => {
                setIsMobileMenuOpen(!isMobileMenuOpen);
              }}
              onPointerDown={(e) => {
                e.preventDefault();
                setIsMobileMenuOpen(!isMobileMenuOpen);
              }}
              className={cn(
                "rounded-xl transition-all shrink-0 border shadow-sm touch-manipulation cursor-pointer flex items-center justify-center active:scale-95",
                isMobileMenuOpen
                  ? "bg-indigo-600 text-white hover:bg-indigo-750 border-indigo-600 shadow-md shadow-indigo-100" 
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200",
                isScrolled ? "h-8.5 w-8.5" : "h-10 w-10"
              )}
              title="Menu"
            >
              {isMobileMenuOpen ? (
                <X className={cn("transition-all duration-300", isScrolled ? "h-4 w-4" : "h-5 w-5")} />
              ) : (
                <Menu className={cn("transition-all duration-300", isScrolled ? "h-4 w-4" : "h-5 w-5")} />
              )}
            </Button>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className={cn(
                "bg-white border border-slate-100/80 rounded-xl flex items-center justify-center overflow-hidden shrink-0 transition-all duration-300",
                isScrolled ? "w-7 h-7 sm:w-8 sm:h-8" : "w-9 h-9 sm:w-11 sm:h-11 shadow-md shadow-slate-100 hover:scale-105"
              )}>
                <img 
                  src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 80' fill='none'><path d='M50 15 L88 53 H74 L50 28 L26 53 H12 Z' fill='%23E45A1D'/><path d='M50 28 L64 42 L50 56 L36 42 Z' fill='%23E45A1D'/><path d='M12 53 L31 21 H43 L24 53 Z' fill='%23E45A1D'/><path d='M88 53 L69 21 H57 L76 53 Z' fill='%23E45A1D'/></svg>" 
                  alt="MAYHOMES" 
                  className="w-full h-full object-contain p-1.5"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1 sm:gap-2">
                  <h1 className={cn(
                    "font-black tracking-tighter leading-none transition-all duration-300",
                    isScrolled ? "text-base sm:text-lg" : "text-lg sm:text-xl"
                  )}>
                    <span className="text-[#1A4BAC]">MAY</span>
                    <span className="text-[#1A4BAC]">HOMES</span>
                  </h1>
                  
                  {isScrolled && (
                    <div className="flex items-center gap-1 sm:gap-1.5 ml-1 sm:ml-2 text-slate-300 animate-in fade-in slide-in-from-left-2 duration-300 shrink-0">
                      <span className="text-xs sm:text-sm font-light">/</span>
                      <span className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100/60 text-indigo-700 text-[9px] sm:text-xs font-black px-1.5 sm:px-2.5 py-0.5 rounded-lg uppercase tracking-wider">
                        {getActiveTabLabel(activeTab)}
                      </span>
                    </div>
                  )}
                </div>
                
                {!isScrolled && (
                  <div className="flex flex-wrap gap-1 mt-1 animate-in fade-in duration-300">
                    {isSuperAdmin && <Badge variant="outline" className="text-[8px] sm:text-[9px] font-bold py-0 h-3.5 sm:h-4 border-purple-200 text-purple-700 bg-purple-50/50">SUPER ADMIN</Badge>}
                    {isAdmin && <Badge variant="outline" className="text-[8px] sm:text-[9px] font-bold py-0 h-3.5 sm:h-4 border-indigo-200 text-indigo-700 bg-indigo-50/50">ADMIN</Badge>}
                    {isMod && <Badge variant="outline" className="text-[8px] sm:text-[9px] font-bold py-0 h-3.5 sm:h-4 border-slate-200 text-slate-700 bg-slate-50/50">MODERATOR</Badge>}
                    {isAccountant && <Badge variant="outline" className="text-[8px] sm:text-[9px] font-bold py-0 h-3.5 sm:h-4 border-amber-200 text-amber-700 bg-amber-50/50">Káº¾ TOÃN</Badge>}
                    {isGDDA && <Badge variant="outline" className="text-[8px] sm:text-[9px] font-bold py-0 h-3.5 sm:h-4 border-emerald-200 text-emerald-700 bg-emerald-50/50">GDDA</Badge>}
                    {isUser && <Badge variant="outline" className="text-[8px] sm:text-[9px] font-bold py-0 h-3.5 sm:h-4 border-orange-200 text-orange-700 bg-orange-50/50">USER</Badge>}
                    {isGDKhoi && <Badge variant="outline" className="text-[8px] sm:text-[9px] font-bold py-0 h-3.5 sm:h-4 border-violet-200 text-violet-750 bg-violet-50/50">GÄ KHá»I</Badge>}
                    {isGDKD && <Badge variant="outline" className="text-[8px] sm:text-[9px] font-bold py-0 h-3.5 sm:h-4 border-teal-200 text-teal-750 bg-teal-50/50">GÄKD</Badge>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Center: Developer & Zalo Info - Inline and horizontal with Logo */}
          <div className="hidden md:flex flex-col lg:flex-row items-center justify-center gap-1.5 lg:gap-3 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 p-1.5 px-3 rounded-2xl border border-blue-100/30 text-xs shrink min-w-0 max-w-lg">
            <div className="flex items-center gap-1 font-black uppercase text-[9px] lg:text-[10px] tracking-wider text-slate-500 shrink min-w-0 select-none">
              <span className="opacity-65">PhÃ¡t triá»ƒn bá»Ÿi:</span>
              <span className="text-slate-800 truncate">ThiÃªn VÅ© - Digital Marketing Mayhomes</span>
            </div>
            <div className="hidden lg:block w-px h-3.5 bg-indigo-100 shrink-0" />
            <a 
              href="https://zalo.me/0854642555" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-0.5 bg-white hover:bg-slate-50 border border-blue-200 hover:border-blue-400 text-[10px] lg:text-xs font-black text-blue-700 rounded-lg shadow-sm transition-all duration-300 whitespace-nowrap"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-current text-blue-600 animate-bounce" />
              <span>Zalo: 0854.642.555</span>
            </a>
          </div>

          {/* Right Side: Notifications, User profile, logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notification Bell Button */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsTeamNotificationDialogOpen(true);
                }}
                className={cn(
                  "relative rounded-xl transition-all duration-300 touch-manipulation flex items-center justify-center cursor-pointer",
                  unreadTeamNotifCount > 0
                    ? "text-blue-600 bg-blue-50/80 hover:bg-blue-100 ring-1 ring-blue-200"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100",
                  isScrolled ? "h-8.5 w-8.5" : "h-10 w-10"
                )}
                title="ThÃ´ng bÃ¡o thay Ä‘á»•i ngÃ¢n sÃ¡ch"
              >
                {unreadTeamNotifCount > 0 ? (
                  <BellRing className={cn("transition-all duration-300 animate-bounce text-blue-600", isScrolled ? "h-4 w-4" : "h-5 w-5")} />
                ) : (
                  <Bell className={cn("transition-all duration-300", isScrolled ? "h-4 w-4" : "h-5 w-5")} />
                )}
                {unreadTeamNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4.5 min-w-[18px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-sm ring-2 ring-white">
                    {unreadTeamNotifCount > 99 ? '99+' : unreadTeamNotifCount}
                  </span>
                )}
              </Button>
            </div>

            <div className={cn(
              "transition-all duration-300 flex flex-col items-end",
              isScrolled ? "hidden sm:flex" : "hidden lg:flex"
            )}>
              <p className={cn("font-bold text-slate-900 leading-tight", isScrolled ? "text-xs" : "text-sm")}>{user.displayName}</p>
              {!isScrolled && <p className="text-[11px] font-medium text-slate-500">{user.email}</p>}
            </div>

            <Button variant="ghost" size="icon" onClick={logout} className={cn("text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-300", isScrolled ? "h-8 w-8" : "h-10 w-10")}>
              <LogOut className={cn("transition-all duration-300", isScrolled ? "h-4 w-4" : "h-5 w-5")} />
            </Button>
          </div>
        </div>
      </header>

      {/* Unified Vertical Drawer Navigation Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Drawer Panel */}
          <div className="relative flex w-full max-w-xs flex-col bg-white h-full shadow-2xl animate-in slide-in-from-left duration-300 z-50">
            {/* Drawer Header */}
            <div className="flex h-16 items-center justify-between px-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white border border-slate-100 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                  <img 
                    src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 80' fill='none'><path d='M50 15 L88 53 H74 L50 28 L26 53 H12 Z' fill='%23E45A1D'/><path d='M50 28 L64 42 L50 56 L36 42 Z' fill='%23E45A1D'/><path d='M12 53 L31 21 H43 L24 53 Z' fill='%23E45A1D'/><path d='M88 53 L69 21 H57 L76 53 Z' fill='%23E45A1D'/></svg>" 
                    alt="MAYHOMES" 
                    className="w-full h-full object-contain p-1"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <span className="font-black text-slate-900 tracking-tight text-xs uppercase">Mayhomes Portal</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 touch-manipulation"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Scrollable menu content */}
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              {/* Profile Info */}
              <div className="px-3 py-3 bg-indigo-50/40 rounded-2xl border border-indigo-100/20 mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xs uppercase shrink-0">
                    {user.displayName?.charAt(0) || 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 truncate leading-none mb-1">{user.displayName}</p>
                    <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>
              </div>

              {/* Mobile Notification Button */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsTeamNotificationDialogOpen(true);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black transition-all touch-manipulation mb-3 border",
                  unreadTeamNotifCount > 0
                    ? "bg-blue-50/80 border-blue-200 text-blue-800 shadow-sm"
                    : "bg-slate-50/60 border-slate-200/60 text-slate-600 hover:bg-slate-100"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <BellRing className={cn("w-4 h-4 shrink-0", unreadTeamNotifCount > 0 ? "text-blue-600 animate-bounce" : "text-slate-400")} />
                  <span>ThÃ´ng bÃ¡o thay Ä‘á»•i ngÃ¢n sÃ¡ch</span>
                </div>
                {unreadTeamNotifCount > 0 && (
                  <span className="flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white ring-2 ring-white">
                    {unreadTeamNotifCount}
                  </span>
                )}
              </button>

              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2.5 mb-1.5">DANH Má»¤C MENU</p>
              
              {menuItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.value;
                return (
                  <button
                    key={item.value}
                    onClick={() => {
                      setActiveTab(item.value);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black transition-all touch-manipulation",
                      isActive 
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <IconComponent className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : item.color)} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white ring-2 ring-white">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Collapsible Admin sub-tabs directly inside the mobile drawer menu! */}
              {activeTab === 'admin' && (isAdmin || isMod || isAccountant || isGDDA || isInternalStaff) && (
                <>
                  <div className="h-px bg-slate-100 my-3 mx-2" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2.5 mb-1.5">DANH Má»¤C QUáº¢N TRá»Š</p>
                  
                  <div className="space-y-1 pl-1">
                    <button
                      onClick={() => { setAdminSubTab('reports'); setIsMobileMenuOpen(false); }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all touch-manipulation",
                        adminSubTab === 'reports' ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                      <span>BÃ¡o cÃ¡o Quáº£n trá»‹</span>
                    </button>

                    {isInternalStaff && (
                      <>
                        <button
                          onClick={() => { setAdminSubTab('projects'); setIsMobileMenuOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all touch-manipulation",
                            adminSubTab === 'projects' ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <Building2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Quáº£n lÃ½ Dá»± Ã¡n</span>
                        </button>

                        <button
                          onClick={() => { setAdminSubTab('teams'); setIsMobileMenuOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all touch-manipulation",
                            adminSubTab === 'teams' ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <Users className="w-3.5 h-3.5 shrink-0" />
                          <span>Quáº£n lÃ½ Team</span>
                        </button>

                        <button
                          onClick={() => { setAdminSubTab('acceptance'); setIsMobileMenuOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all touch-manipulation",
                            adminSubTab === 'acceptance' ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <FileCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>Nghiá»‡m thu MKT</span>
                        </button>

                        <button
                          onClick={() => { setAdminSubTab('budgets'); setIsMobileMenuOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all touch-manipulation",
                            adminSubTab === 'budgets' ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <Wallet className="w-3.5 h-3.5 shrink-0" />
                          <span>Quáº£n lÃ½ NgÃ¢n sÃ¡ch</span>
                        </button>

                        <button
                          onClick={() => { setAdminSubTab('costs'); setIsMobileMenuOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all touch-manipulation",
                            adminSubTab === 'costs' ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <TrendingUp className="w-3.5 h-3.5xœì}{ÜÆ•ïÿ÷S”{³žždºç=–gg¤;I$kìxW0bv“ÓÍ›ììyd2d‹Å"X¬½ÁE,ÖŠo$w<œÅâjì­õ÷˜op?Â=§ªHÉ*²Èîb‰ÕÓMV«N:Ïß!Aß·Ý§­…™¿ùßˆòÚ††{ó»£‹ç_¸Äÿ‰ìôm2ì¿Ü˜§¿(Ý˜ïŒÂÐƒ;Ô·°;
z÷ÜÇî>Ý<mÎ’Í›ä”V¸el÷ñ¨³otš3ÖÁÝµ-·{23ûWøë½à¡×±ë¡åŽÞZnóÀp~;;+è§ëA°g¬ÍÓ®Û,¸‘ÆQë`ä8äÀ±Ž‰Zƒ ÕµÜÐòIÏ¶–Ú«dxÜZ&Ã“Öñ½‘kZfËé‘Ð:[Ç9ðÜ°Õñ“„¾ávh{nË€öBoÔí·†kGŽ_7æ
b$ó@677‰8äitz­ ²Zo/,°îú0^ôÓ;jƒY'ú»oîë{‡–¿?ººÐ(Ã¬zJIjßð{V(L:Ìé2L\Ÿþ·.a¾c_œÿýˆü ¿™˜87}Ã+K¿?mÚ%Lò£øØíÂÒ‡†Î’7ß$*ŠÚ(áä{cX~ðz[°i¸Þ;â}ãŽíwkÚ»b¿?þÜí“C{ü÷z°lø;´ÝÞkÊLfâzçc>Ì©æÎøs›¼øìâù„¤›„ðßÏÜÞhó´o,`,Fs¦o¡çŸ´mëh¦ÓJ)[ƒ¶y—‘v%â¾Fä-!ðh:®†¾)¼˜ÆaùßacÈ#2pqþ“nŸç_sü&Ä“—²`‘ÐÞR½D9$³èò´‡ñ7AÛ2ípföj¶†ÐïëíÁ¶‡8%¯ÂyÜ·-ÇÜr,Rá=Ú&úã_¸ ²ŸàÞ ‡†Ó<þÃ”6‰êQ¥d/»Ù´ó÷çÛÈ<ÍŸK}w:ÿm²ëG@zw<)ðÛó™§à!qb;žoZ~+$ü[áEXôak…K>«žÑÆ6!’¼l§*·¢ãõ¼QØ¤›2ßÔ¡áÛ ãl6L+ýQ7´­Fþ¶­(vãßŽ‚Ð>8ImN ©Å…xW;ânäû3Þ²™ˆdx½wGb^nW¤ôËhöÅ§/þnï.ùðý‹çÿ{_NªóÛòÌSæ‹ÔŸ	“Gºyh Gß·‡ÙÈæÔ¾;òBãöq×²`ŽÒŒ<KNã¸uÔz²\cxü·ŒQè!ÿ[!ÃÞY[ÜëžÚ]+C«9JíµŒAHtuaaÖŒìRô!ùq‰s6Fº7(-¯ÆküdÉ·E«
|˜Jž_Í2bsäÓÕn-/d7Av””êð?­®ç§·N?ûÞ'E a+„S~‘ÒfÇ
,Ë¥Ä¹’ßp²Þ¢†`™øØrî1NVâ“pgT<¢™Z‚í3[GÛ |z7h/«V"·^=X?j­á?ýÖšœàŒ8ûªpW×j´Ù`äcê¯ˆ1BðmíÝ§d4„C±k.s÷)¨­#(ˆM›<Ç¹´WBvúÏÿµŽóŸ‘wÛµæw­_¿ áÅùïÙ ¦=	Ð÷.ž?¥BEúfÃÜ‹EÒC`lÊ³Ë0ñ…|Ë1Ž-“¤rÕÐ¿~†Rä¿óâü·Äa6.ö³ŒqBîz.ïÛ·:8mÝ‹ó_¤ÃwÙÛ~ý»‹ó/B8dÇÏ@ãÂïÝüo‰ïü]2€Fÿ‡Kº­=¸aüù	iæ“¾ÏÀs=6ö'‹‹ÈHbR¥'Ó1PHSíxW§Önu!áâ›w|Ë"¦a;'Ä‡Ù!#×*ð4bq¦Æ‰p¶M^|zqþ	U¿à+~á¥THúï—0ø>ÎÒ€8£ñ]¾”ñú†þ×0pXí_Î‘‹ó_Ã·0¹¿„è„uû(Ž|OâÌý¾zî‘®l!L$˜8ðaæÙ…a5x]Ã!A¡0zÖl[JHCM:z²HÙuæì‹Ž~Ý<„¥iªoÀZŸuÉÎ{ïï’æ~ü›ÁyódÌ‘Ç_³ðRÏÿoNÉ¤Kœ¯7‚éÁw<N§íŸáåèk	oèöŒ”Õ~ƒs9þ7·|fíïÃ …§}X…¤g)Qzô·.ýúç±û†îIå1ù—jnœ1"
Rsý ýÏGÃÞ6Ìž%=ÿR9ûê­4ç'¢ë¹±`?0™þA5©¸#l¼[”.þƒww¶;[loíÜ'[;û÷>¸-™Jú“YSnÙ øVÖ
e¢ƒ}ŽØÁã®ï9ðP•@^¥­Óq":|–ñ$‹þX¡ªÜµFïZÁ%…9¾ß½F9:·³g ®Ç¯D¥*“yýâ©ÿ=Ëézƒ´$´1ðpˆm$6a‚l`c¶álžR1Zœ@<ÀÆÝ<=M‹É}ËîõÃu2ƒÓ1“Ö$=¥ž¬“Åô÷ÃïÙî¾7\‡Éá£½EVàÅoÈnÜö@$¤î½÷.®	÷¦4ïd=p¸Ñr¬“…öRúFa# é8@Ó}Û4-AOÑOéÞÌJ\ƒœ*ƒ°µ˜%ø¹~Ö_Ê±Q&æ:ý¸ï-*sü”*ÞÑqIärLö`„–ùßü‰ŽQoŽœ¢ëh#:Æ	Þx«í°9CffÛCoØœ=#ÿï_?û‰ZáÍõÄºÁW±]”c7÷ýžkã_òwÓW³]ÓîyLÆxñ)š¡Fôœïón•RÞ|Iò­ì„¢r@4½ ø¤(Î¾,Ó*Ï'›D˜‰s6Á<} öÂt¬`<åúpüÁRÙ ºx’£Áî¡á?µÐÚ-žcê	ÊQ²£(ýr–½ñsjüþ_ô ý‚¸}Ð¿1©¦Ë+YA^«K¦*;À#¯‹“¾oÀô„á0XŸŸÿ!tÚXó7VWÖV–VWW%ú;	©Ãv³ñ}Ø0îSÙ Ón6\ÏZ.l_×ƒN,ß‡*ké¡¼(åð3œ¤=Dg¸£z-ŸøÞ öî‰ôþˆÀW££7ù}1>Ž“Ûð;vGg1½u)9¹…oW¢Ã;¶&,ƒÞ€§»pdöõiFj)Y@Hž³š›$	…o<´‚ „Éb/áí8­îfÞ…A¢TÂOžÖpG’Ü<ÇìïÄ„© ûy£ŒìsBrN
V±}£C†¸yÊæ¾9#žû~·Û¢¿ %9ùQ¢v®ˆ'ÿZ#ewÃýöxÔîãŽ`}Â¬ãö_„ÌËøñzfÖ¡Ïþ¾»»»Å>ÝCºuçqhPSzü&ÌÊKÍ¾3y»BvÀK-?à¥’!ð*’#ðRÉxQŠEžý×($¼ú˜å`v‡Ê
 +àÞÉ<–³Õ§YãÝ§'ä‡­åBÃðËÙm„'¼¥ ¯à6; fnÂXNóãg’ &Î¬­gàæ™·×àCñÐË4`CT‚Ÿ¿ü˜€é{CÜ^>Êïi†ÂN¾%jÜZÊ˜l"ËVdÜm%ü#Liq#ó+$–«¸ÀÐ—ì>
Z–LGÑÔ€6A ±\~0«ŒÈxEÖßÓœcÃ·†žR§ÆL`u=×4ÐëÐë{A8#1%Ó·ˆ»z ÷`šÄÇÇ¥6b8.ÖRü¹€Ô¾•§v¾¬~ÌJó®™Iß®Ø5›'K‚ì:ûXî¬ÈXê³µhxRÏ…Ü* š«lÕ—SûÔ§¶örÄßd{üÌý™'ÕË·ÕŽø,ÕõaYŽZÃãÄY›´¾EzIZ8ÍpTµoR<UH´x©	wè{ku«S.^ÅÔ‹W	¯
ÿ·JÆó™ˆõº9£"4¼Jˆ-î]éX+ˆÝØÙš>—
©niãg*?³Ü©’ê¥î²‡–1¸–kž|8ò‡N%4É‚³®ë¬6³…+-Æ§A7W¿àF·kAšëZ×qÕ3£ƒ¥·–o8æU­½0€:p¤µ¾çpìEvú°?"ïï_=tF&¨µ“m|õ-“Ñ€86 €î‰á^ÕêG]×Yúï¸•í–¬;Æ|ãgÝþÕ/yÖõz.x22Xnß®ŒÑ³Žë,ö¾o¹x¬¿?,\ð(cäêW;qÝØ|ft°ìž«Zx1w¦Îêç²8r+/¦dÔZ}y°–< r
ºG$ŽËÐBâŒ…ëF±ÉÀâ9½q5´ÊsYjJ£y£iŽT©ÐzõJL¸n«ÛU/x’%RcÍeùc)ÉD¨¹î“$”ÒLÕqõU‰F‡l&%qx1Ý¼5%º)¥œ8£fº‹$ G;Bx¿z…K¨G1>å‘—ÿrÊÁþ%$Y`5KÇ±W#É2rœÐh–š`7[M‡å¤jI`NlÃå¿W£Ø2»š˜!oCyì(âñsÔšŠ²WšV%£ÒÃJûýRMf]t¡ä]˜kdžd ³n’ŽåxðÙrGA6þXå;SûÆN”N­µ…¬/,YýïxŽcæTZà>¥¥•¬O)ãQÖ¤çÛ&Áÿ`èq€~s]üÓé	®²PaôjÒPcú+|X‹¸°åàMðßÀ±é‡õz‡Þû;0>PRfuvß”äˆN(Á¥»£`ãD¾0’‰÷WôFÃÈåù['­'­ÑÝ–ÉóÀ’‰¯˜÷fÓwc«Š¬î`XA6Ö]xd×
º¾=ÄAéxÏ²!	™kAÌüd¡½ˆîBd§Êñ&1™É	dÿâüîÝE£ùïÈøÇ{’=šyÅïÛaZ4¦C[.
‘jÜ<5 ßñàqºqÛÜ;°ƒúÒë™¶›çÉºdYþ’þîÏ‰Z#îµ"WÁ¬<)½æ"±îÝÿÝy<þñÎ;$K;TÿÌ^vÐLBÄÔá>X/'h’Î“6¢ ý'‹íÅp-r!ˆô:uáÔºç†N{o„Q¿w<usæÐn}°73Û>`g^YZå™gÒP>6âåH”vzéÐºŸ©CÕ&Û“N[‘[Ù®ÕNL,“nD¹QVÜŒ;ïÜ#ÞÿãµÜ‰Ñ~SßÖÛjhåž=Sl«heÓ+hd’ƒ[þõÎ¢Ã+ÙY<&óí«(fçÒÅ±pÀmƒ v…»ªDH›ÚÞ	Ç
*ož•xóì¼ø¤ †ú¥m.¬'ûG0 Liá`ºMŒÎÒf¶“Ñ	<g[µ8xY ü{ÔZF}þ‡ 
iÑlïa"’C”ÿÅ5ø'Äè¨[±	ƒ=»´ î[ò­[²ë9Ûa‘¥0×g÷ß—{¤FÊØ»[{ï`vÝ§×èleËsYçªoZîÈªÀø¢\ÅÙ“
?Ï˜žÞÁ¤®y²½AãaÆÜ„êQú=‹Woôá±†4	z¡ÜLÓ¡¹XYKMú=N3qäØ¡$Œ<ç‚¬•]•ÏœÖÏ¬ª’N¥HÜ–¥Åçßäç6…	]§w)²D[ 9©´ò Ù(‹>Ùc
Ì†áfÙ&œ‹žrrßÆ|ZÏpó2Ú9YIòU”eG‚¨.&Qýñ3·‡FO–ú´NNA+3¡"çj"sØ…&›³°Õñ÷÷hô1üþÈòmÏl>2{&Iç•[‘UNˆkÄ…4ñ-KAŒŽÄ
í.î+™™•¸(¤	e”ÄWD.è?É#Â™h¤ÓÚB»'¿ÔLbÊZH:Q”6ÙØò}ïè=ºÁ´°L
JÒ\(ÂùÀF˜Ónuéi\†]“1x/¦-ÜËtFn”*ðÜßÂÓ¡•ˆ?M C–—($c1ñäd•¦E&ôE²™\ÞÓH«Pˆl8ÀH 1caù£”,Æ¿S’ýˆ‡lZ«$‘¬á‚Ã²yŸrp9‡¯s|ÜHfò‡˜M­ÃÍãóRÅv©´T‡=pV”’ÞHzÀê¾þÝ×Èë~0Q%K{SŒ¤¿œF±ê…¼‘Ã€ì"#GWñg â÷]ÂöF¾\é´ÐKèYSL¦n>êqÙa¼ŒJIFéµrY–	
P¡Ç&éH*G.ûª¸ì›ÉŒ"‰)§ú*§‹Fz^òŒdd0„ÐBñVÓ¢
M‹£ôg¯Ò±sRƒw¼gC8å¡…b8œG°G¶ö7ˆãÒà‰ü/Å6ÞñC˜n“
sÄ4Bcó4	‚¤ß‚¼b´AVïZÍ…9²¸€°ŠE-#´IîâQ„¾÷ÔB%Âð}ãd³±L–˜}hw“LN~Ûfã/VÞ.Xõ·Ží@ÈƒÃ¿oAG®1	CÑe@+`¾â!(ïÄTMý;ÑÅŽéÆëdæ/Þ^1–;7fæ(1>)l¦Žýõ=žŠá?2¹øuN6OTAêYúk:K¹—Ì½K!¯±!ã“L†íÑ´Û³‚qQjÚ÷<'´áŒùç‹ÝÜ80º3Ø~—é•›§·cZÜµ€ÆËŒ˜¿YÔè'	9 ¡»AûA*[Y>XêÀôùQ°yúdmŽÀÿàE>:#ÃÇ7ß<]^*jç‘„'C-ñ\ÄFh1î Ä¥›;á½„ØWVÖ¬Õè‹ïÑ}{ºr:Nˆ“â¯ã ¢©a7ÃÊw¯“åèo:{tê˜†¼·r#{S¶|Hñ¢ó)ö g{6¤Ée²µZ&’ãu|ôNéÇÑY°eÅà˜3«äá‰¸Å„á’X;ò–ÌXJ–Z4Q½—ÈÍ«:r³BÏŒ6uôÄà@2{$}º+gy\*‘Gß{÷aø-
¢õôâü+âŽ??QÀƒ
&ˆÿF¡NŠEÉK¬¦¥YfHJî}Úä`¢Ê;ò¹ =	ßE6‰ììõ-s‡oÓèvçoú´]ø‹|‡þIyÀ¾fÿJ¯«÷{ªÛçneúV8ò]áån’r‹4SC˜O~Ÿm‡ÞûØ2›K³J¶0£nýl¶Y f« •Ð(Q[{lãæq‘<X /g©r&R˜ÿAG›_VÙÚ{l1ÞcÜv•5ïg±9	GÜå†º?B;ç¿&‹1Ö]7RÞ:çÿGç\ep€h€‡ç?~Mõ—Mõñ’˜±TÑVÅ	«9fe-†ùJõÁµ6sTñùS²3t!k5<Æ3‚Ù ÐJö½!Ô¡»xîîƒÔ—d¢Óê}úV/J×Ÿ‘ÙveózßÒ‚ ÷©ÙièzÐÌ#ÛRJrÉ-äUánÜ>E©	¶ƒ}ÛkJu/d¤øÖ…·™ÛùÂ½E·Æb9õR©S<Š2 ò¯ÜÃf”ÿdÞÑ´Ž)Ç(ÆÞßØ±@Ž{
ƒ9ý¸[ß:¥ž}|ÆÔ“SÚ °6Çóô¼f’96æa”‹œÖÄ"e«yÊµ‡9˜ÞÇ3L`9eÌÜ> Mõæ›ñsÉÇ¶c¹½°?[Ø‰gYí‚"Ž³,A‹}i¾Œ…¡ü<Y\U:¹³=ëHºsÉ„}tÐª{ÊgåÉÂGmTU|¢¼ë4Ft.™©ä;ö¬{Òº¥»@ê|Êw[`Œ®ÂÓ°h[òwëyEJø|1;ÓTM+Ø—sÌ‡…’Š€TŒÃ¦QÌ0hç”UØgf×¬s¥T‡¯¬JBÑQ—ÝRJ/mD¨d§¬GÛA¶NLÆÊ
×QÖO*ø¸ds*LÁoëK#·_Ä{ƒ1„S3Ú¡e•7jY£©¤e“mH	›yR‰¥Ò¹“G¿Óa·£Šn‹³³äÛÛÈ‘³g©S-¤hký*?wª˜¿ÕxÊ97ëãÑ``ø'âXjGkýÑ¬u§Ñ.-Ð–zjÑ®gæÅÞR'¢ÂÕ*eTêP¨J¸¾‚']}Q~DRu!n
®¸ªroüøâùo‡ä†5ÓòÕ'rºý‹ç_ºúøè
Ž3¤ý":]>¨!Û0J`¹jQ*Pþs>Üãv¾w†q¥ÊºóNû@Üâ‚Ò¼S±ZT:žò[ï‹rblÚi/r6ã4ÆTÆEî©œ£a	…ŸÙÄíý×¯¥ŒM:á"ó±—³ÎQçWºÔâ¿¤Õ.@ÔS/uýRO§g›<¤É‡‹¢ÒŠÇ~Ï;J™¢(,ºdCƒb"‡¥Úr¥š”áçlè eõ[‹Kä¨µ¸Œ~c>îIc,JgŠƒ¤ãcÞÊÖÐ³éIG17yµ¡¡h‡Òw{ìùasè[‡TA8E- È¥Ñ™9bÚ>ƒÖ	ÞÒ†Ùæ¢¿SÍ¿ŽoãøyA—î:xÃ.ÝLô‹3µ¡Àz ¢
abòÜÏ@Ö VÜÖ{¸ë¹i}ƒ…ˆ¤×¤°’^¡d{ýÈ‹þIÝ‚×‡ÒXf­ñ;®µEb³åš”'@í½¦ºkEuèÏ)¢9úû+HqûLEAÚ7œàøô]Š£I|E$Çn¸V4§}Äb†!ÆÃ»ßtª»flŽ;’‹È.ºåZž³"»_“ÝÐTœkA{ž]Hwðó+Hs1vmˆß Š·ÜÕ$èôjÛ3OäÍ—Å×°€ ´Ð2Ñ…@6É“v»-	yù¨w¡otJ¼¼¬Ñ£z~*~&&5µ,Ò9j÷:e­å8álì6¢HÒ"8Õ–|›o‚¾¨|)v„_Ð^(PÆ4ºàj“Ø	ûŠvÃ¡o¦ÑµˆÝàè0š™™m;X‰ÕÂÐ^Ã·šñ·iôÍ„&±sú}E›0^W0ª…û¶€fùj²h¬„†æ£ÖÉBy´µmuÄ¶:B[­¶¢y¡#kÑFufDíKç*;=Súèù“	»Håy0O52æ9b›ÇZLÞfŸ'‰6"LTü{•ð7Ö "â6Û5éžèg¶‰Ô­hÄ™$¦Sæ~7Sx÷BÄÜË H°#<v ¦£Úúˆ	QâS¦£ C¢OM¦Jl^–¯qM¾CÏøƒÍèvW¢gÿSÅ‹´tú±<›½TÊ98‚Sá[§)âc9“ÎÊË8¨|“ÍRóŒ¨ÂzFöÚîÂ±»¢s¾|V4¢nˆÚœ»/å’Uû‚U©qÑ”"QE¯£¶T2•!\ÑìxG| Q6¾FO¤ NSð:}Ì©Á¤ÉDN;#´²–žm|ë¯ºÓäþ#˜%›–DÚ7ìBlæx2tæLkñ5nª±ïsKÅ4%³
pÇl'v&päÙ:¬(Årc¢TœnxñŒ¸Å‡QViÖ•ˆYxQLü[Z[[ú–LíÒ×„q¼Ò-ÁË±Ç ±{¹‘q$Fp—1“‹¾x+åM•h§…h±”„¸¡°Æ~e[‹
ƒp´¾øDUß,™9iaöìMÓ%y„m–Ü([”‘CŒ4½Q¡)¡|á‹éø!
ZµÎá,GÛÌ‡&(à1Ã>1ð¬0qF¼NA	¬;Žg„(Ï’››díŠ°º4› ×2’)¡\ö't1"H©§q3ÞÔ5<>Ö2>>=Î[l'`—RnWIôª¼(Þ™Ü¬ÀÔ
oæ†³£$+Û¤HúùÀ¸5y|j’•‰“K|…W1Ï£A4!\Fð&KnÒx”ëSÛ‹²?´$ôÆŸÓT“ŸÍ,æü|ÇáÅùO(ã™MõŒžÚµ~)Q˜*Å»d(K†NMr¥RQJ‹@Ãr%©·&ö¡á=8„Ü‚Ž5ï¾ø”ÜÇ43àÙºÔ™úl ª4ÂKRßïƒBJ?ïûÞƒ“äÏ-x(HŠWëÖ8’ÁžÑ~[ƒÞ ”‚ŸÝ˜öYý,éWŠFò…˜(¶‹'ºçx¹@Ziz…¤Ðü¡í9VÈŠryâPœJ­‚›\¤éJä¡ú˜C	úOE˜H9:Ð‰ÒÅçr0 Z £áçBh¡"åºH'Ì¦)ôËd‘JTüž$G,›Èïó‰íbÞu‹Òh´ñŽ˜F*Ô@e[^i„/,dx|YÈ´†;PA˜³+7¬õüdâDø4ÓÜQ›obÖQøvä£.ùùÃUNAa¡íÚÁÐ1N°ífþ^8¥šß’´Ñ¦³½ã™ÖÙ,ê°þ×¿3Hý.{£$¡AŽ¦Ç~QRWÂ¾Ë±¨› „bB™ê|ÂO%ü†?ÿFÌ«*De÷ÏàZbÀ9âÏ–˜/©MoJ"áÔPŒÁ¥F:•):U˜Ö^¥Â*FÞkQÜƒñŸ
A¸èpÓ/.š…ÇÔ)[Ë¤uÏÄÃ®IG<YøèVÛ6¹ °R–ç~€­ˆâö Í&´	SÓíÓŸjÖ›bMíïåB_.•T_ÕS!b?±]ô[o'fŠbùuN_“À&ìZ}hÀò7| ®…ä)]©v»]®’å´˜(áˆÑÃ„µhHYB…Ñ¥“o]Ì€ÎÙ¼%Û±›lAû È¶ÙÁÆ:H(b4uif¶00º¸í=;‚2ÎÝ˜b{Ñ—ž']¥òñJD—V2Ø¼@AÅ*`ŠÎ5vD,:õÊ×“zo:YÉqó÷@î`>¤€³ˆq°?r‰E°½*‘¬l©;¸¸Ð“°š¥K‘º¸Ó¢Lé¤Ò¹nTŸœÊó±JÊœÔjžõU v-ÍVŒ†¹ñ¼l!Pë|“™=˜Dê#¦O¿mÔgPŒýì.ß;sä)Ú¹$ðÆÏBÐD_|’ÚSxÒM"içÈáøsž›5þw[PLcàçþsþ{Šcñ3„¹xþå%psº8ÿ•!Œ©-7©]&S©ëúeE	eJdò#ß2A»ôÐPå£ÏGµø@RN'æ¦dXH™,¢Àüã]JÍb"fóÃñ‘¨Ê9<úNwæ1vœ&;™á—Ð&m¬ÆN¸–&îš}+"‰~Fp÷$[cŠ“ŠŽ§G¾u`Ÿ}{‚iUþT±R¡Ä^ðxÔ!!è×,Ë[f2@“H|Và[±BŽgYa1à|?úYäÛ`a†jáPÐE—h!LÌµŠTPº­c°<ºˆÄÍ”U‡:Sf2)n5%×4d5…i=	B,»ÈŒ6ÅÅ&¤?Ê-Ôé–N®‹ŽÞ¨ºâ…+ò¤úš`-LZ¡a—†jÒLJå*ÃqP  ¨gŽ¹ý^Í¹SVnK&ïÅ§ñA(¤”Lw
Ñ§øjN`ay)Fè»ÓA7|%§ïŽí ×´@‚)š½½^½X<–âù#ïïWŸCö32Y	Èžû[ÛdqìÓ8‰æ~ü›ÁVuùÒ˜#Ž¿2bC¹½^X+©=ÏjÓ§‚x¶ˆpúœ`ÏY½é—SÁâOæãêë,ÖsFƒ<(…ªç¢£.iÿñI zµ¥rË=ß$=ÓpHDìÍ;‘™ÌÑq¡M¦Bv‰·#õ
Û Ø»\T÷HŽ–±*£DyEÔŒìj”lÔhÅîo4ÂAXÆA­'Šs\RÐ@d¨Ü”ØŒÌÜ—X®V|äæIQŽ*ÅÇ¤ë´™„ìÿ,52ª„ŸcPQÍ‹óß‡ùè;ãß¸ÄÄLáŸÛmºPé·)]ïÌ~x<‚µ¢—ìÞÁ®m8^xCËÝ<µƒß’åæüå]ø%aüW„ï)îÔ vwÄŒ 8¿£Ì|I=Y\Ì>}eœå:öE¼"©àž;…Í™-Û ø0*™µfÚTíÇwi"ƒç¿o›ìßxFÞ3àÌ{Öm³ùä#Í†Ît	#ã  ã^¼Òz“à¼ƒ˜ùwo-¤\
KzŒ²ÈÑ@–Ú«êT¥äÒ‹ãüÙ¿xþÌ+ö ŠWBKöÎÔÞÑÞk‘¸"žâƒu¶ºŠ[Nª‰ðS¨–ò°9¬804Ïq:F	‡dtêd"å#5 ¢*WûÈöüÈ;¶ßMwœ*–P&¯ ˜Ðyˆì_ïç…—¬4-EgYwFÄ\Ž,ášöovíõ©Ý3ìÿsh»ÔÞú¯6ðñ¸ñ•šU{mLM¢úã? Î£qeìR2k©z~´Ñôc¹é<¢}A‡9i/ž4jËîÃVZ=ì”ìŒfÆú%ùê¥€òÂzUÆ¯;Ú†Ü]œòždaóm©û7×=øôŽv¥\œì®“ÛwçÈÃí…%¦]¢ý/>¿õN3vy±xÔ´"—rF°Ú¡á÷¬a ¶Cï}¬w@°nûx²W
9v°KbGµû)D¼/ÍŒ~óK"Ê}Ã_Uòc€gt&L@£±€:MÄÝ4^2U¾\Z”û÷NLµµh6ãÌAÑœü`tB¨6Ù%ÍñWÔ3ù	+l€Çégno¶"W%o	Ë%Í}Ñ):0BÐ‡é¡æ-øôÀt.žÿ°Ï5Â?~÷Þ¾;«Oâ4%}2UnQïš£¾
6­¹1®?­³²ßP’¿kŸÌZ·×Þxl~·OóDÅ¸<Þ,}‰'(×…QféKáFÓnËpêÛ<>é?k†áÉÌd­¿ãèStæ7­a!™T¦Ÿ'Ü#Òj}Ã)vxïò[.æÌ#X]ôwüxDÜòï±+óéIÇ9 #êj44ÔMlxq[@ŽhŠÓv ÷ÎÄÖ'ò«¤­öjmE¬v¶²í”{·@%o¢1‹š»W[\.‚“Wå¥§ q©UÝ›ˆgë×¢t‚ÈÁöÞ:‰ã‡óöÍÈ· ÿ‚š™ÑÝ¨GªªC‚Á¬+yË+°-æ©Õ¡^BN©2J”Cß%EÅ¨°’˜@ Ð½!šYSú^h2 0U*»H ¡ZXËK3³Ÿ]ˆÙQå-Ø4``*•j+øØA€Pß¸e’MR@”¶ÛuF¦Ð¾Ú¶©mËg—nAšÌµáPvB£hyÇ%å;²	>å@aCš8 GàNÁŽäë},/Ä&èJ¬€¿Ü¤% ‹Ú¶«Ú’‹Ubí"Ut¼ã*&äê2š¢N<ö±Šîž\‚‚TÉs–½)Jiù¤‚«Ø5U°l–´‰¹ 7	ü÷à[Ñ^ª¸™’ëŒXN`]Úë Ø™ú•æ¢ñëúã$ã¯õœ¦_/{åC—Ò;z9bú‚OïÀëŽ‚uƒø·Å|XÆþ·ÎöÐ6‰—JŒ‚¬-°¢J<¬6W\ §q“qTŽ@SE„UE˜“q>
M˜âµ8{+üšºu¢c,(„”øxWe$Z¤Há©õ^ùw«·ê.µ"ï¢ìbCŽ—¶¯b5…^±–â§·Iøþõ_„Z›tcÞ©¦fáUé(žÚÕ}éêövíõCîx^˜ÇckÁ`?,`‰»eFGI9¡/@GýH#EUóÀ ãêCw‘Æ3¨mýÖÛÚ›ù‹ó_Pï„&èÃÐ»«D„	1a àšŽ%L¾.µO5IœN­þuç¼b RµYâ(ØžÓZÒÊýLn/I‰,ÎˆLBtK#y%±QCL¦C”ˆ"OG¦j›E¦j
áq6Ôòâ3ZŽ¦ËBpJ!:Æ•ñs)
yYfÑc5c^$©¾ú‰àv±=²Iò©i·¢$pLÿÕa¬U“{es—ŸYfùG7jâVÍÄƒ¡·£¶ì-æËz¦sÁ6¹¥‰k°!U`ÊÝ]ÆÖCD½Öj\ã–J¦"JšŒ(ÉÅ®Ê¡›*TlM[8à»®¾ÜbH¨¤tb&!&céJ€b+«X7§Ý½@Ø„»[¤!*IóoÅ¨ü»¥$ÅAY|O~­“¸"gˆÎØ÷¨™YWE×\Èkáfé¯¨},Ù€Ó´8n'Òôû+õ}'•HWÐÑ2ðTAVúUôÉ3E )ª[K	=N7RoÏZ•àŸY-´âèJ¡0\—NMêUÀ¯.,È2ýythÅ@º¬Š/·ˆ/Tò’€Þ­+sÌÅ2Òñ¡ÒSôNÑ^Ï×ø{$×Ü—ÖÀ°
ÁÎd£!õÍƒÚñÓ™ÒtÉ´T4(°F#gãæ&nq:³óõ3¬øåHo]‘$†rÄ<M·?~†¥”/wZ/Ã² !1i€è”ö¦¡ŸhàµÈ *…¿`ú¥P›G£ÐT[—ôÇŸ»}ò&K}e¤€NÔçQUQâ¥ô­ á²râ(}jJiš“$jº7 Cþ>åö#=¨ûÚi›ªôÌ‰r^*&næNÃ. ¨Y+Us?ÉLéF\/R—ÅÍP1#S“ÙpËTé‹eLRhþ»mÚ¡`,aâlºÒ;Óæ«ÄdËð	u½4:É-–MƒpZ–Òäƒsv¦Eyz¶.]’ÚŠ”$Q{RõL«©%©±®ðP$Ý¬ˆŸL’…îa/©ð!s¬2¥J‚A¤_Ñ£Bi’+š01Uj‚ùÊ8?³b™ŸÈ+—V	¨Æq9pÖ– yEw€²A1E¦¾®¢€^ˆÈE±-÷æ·f^ÕÍk+™<Ñ©³6™ƒ“í¼¾3ÌÈ¾ä=Pmº+L6Ï¸ø,•q¡7ÏU¸Æ¢UÁ„Ìöe{É^Q™ð‹oÕt¨r«:ŽŒ"ÄÂ‰M#kÎ`–Š›üE‘aó–qè ÂÚNQë"
A‹“xà+P²Æ¬°dGHÖ8Ýò}ã¤mô_	hyÛ“faMËî‰ƒëdA#òB{³)‘øc[ ïƒP›#W~õ7ßÔ~÷›"ÅKÛ¤nBØÎë$1@°R¼ã£<—|Ê'?æ#Îà«äíxŒÊ×¼ØU3õ«*%¡i1­
KC2ÁxoÅPæßS¾0cb(õK5¸´VÉ30BZe¹ð(ÅƒG‰-yT%3O«ÆWréFåè„lé§1HbÊª_‰Z}iÐc9ÏÔL±˜V©H­šUZÕÄ¦ZpED|@ò&¡yR<Eê>J€¬<<5Qª¥´£—jÆ,·-\#[£YGmmLêKäW§”š.®ôeeˆô½‹çÿÑe›Ëí#aå”1ƒ|NÊ r*ãË½t3î·wÙün­óÐ56?|6Š7›2JI¾AhRGÏrPX-EZ_(ÍU7ÅWŠ¨u—J  ÑîG­fŠ¥úU«A8U|HÁ=P_òìµšA³ò¶íÞ¶’™ÞÎsë]¬Š-àkéº9$‡
‘·{™³°'º²*ƒQ¯g,c¸Ï3&kxÈì8›D"”ßÊZzffÓ@m‘Mí1_‹÷ò}òJðÇñ_mÆý0øžöùÍ³UR»23O'4cÖÒÙ·Nã~Î>Öwå„,Ù âŽõ»ÕßônË …—¨|ƒF3Z9NÊ< Ý¤ÇjX1)Ö¶nÎ9š5æûÛÛÚØ/^Q%ÂG†û’#ƒ©à¾”.¦,_Iotá¦¿åšˆÞÐsqrt_+§0c$YãF&õF–Õs&¥ÛA\µúZ$>”ÇSm¥¥/À=ô6vøº5¼Ð²‚I|¥Ö u•EétÞ"3/>Å2ª4Ü»ÝnÓÊàü(S^fô&¶Zü¿ž›`jp}ùq{il\pä^~“ç¢ö1"½ó_‹ççä)H•šDâ¬áŒšN”êÕDªcZ?—M)JßóB„CrëK¯õ\L)Ùãúœ	Ær½k¹–owu¥(\ÇÍÜLQÈZÉL_NA;gØ¶MýÈ\t„¯£«!d>qt"„Ib.
‰‚=g0þbælöcýæ»Ð)jPWRÒ?:ùoÐƒçö± ÇcImúç|lkk‚Ö2ªÏ¿¡Qˆƒ9åtu¬Ò§­ =¿;þwR0Æª-wÁ`åCè½B¶ë¡LC#U¦–3½.4žb†˜D4E9D?ÝS3V
¯DÂxCF%HãÒïi½ïÓIÑ<k¦u2jË¤¹˜ûž€ôÖ”¬J–§Œõ1Þ+A³ë
0—&_qiÊ·Ý§-­L=îþ&  UM‹‚+ˆENDÌ¬L’Ñ\“baä›ˆ¢ÑàÀº¨bB`ûkŽæÐÂïøÞ€›áá‰É‡NOÁ
òï±)›b7
±œÞž¬¿ƒ™Ô÷+qØÑ¿R;š~³º µ‡1$´Ê.&$DËüfãCARG»7ÍÿÉNA}M-lìûFÐÏF—¶WìLC÷¼Ó¯ãð’Ü^µú*ö.^BY%GD‰ë*xDµ&ù¦
øhú‚&Î'?i­¥ºå9ß%
Ê#›8t?p”Š©z¡Ï‘¡¹ÌÈŠÖrE	o”¾òä)*ò‡Ôè¨Ì5 „â¾ºåÉœÞz×sZKƒ  ‘wJ]ÿv*ô[à¤-§z91;½JÕLªÙv´öïC6Á²±A5¥Q‘EA	Z›JoKmh²7Ù5á¤I—	îÂâBf“fñ4Å²­œrb¯£	gJñlQ#RVút!Ðà?ƒc°àaÛáIk¾ê°zŠe­JB?*X	¶ç8Ä¦GuÆØ]þQzr•Ç«d—%Æ—à¯ŸOÍ¯>Ëû(ƒkÖô¾üÞ	á-½ÀVÖÔ{Þ‘®Tõœ¯M’öXŒy|ë”š¦nÞKi[<	1KË .T±~»Ö\
MkÖÐ»·=óD+x2Å{h„bH”ÑØWa¾àMÔ «RŒí<ZÚþŽå8¹õ >(\´r£cw
œ$å¥àZ+©ª Á•Ë®Ä&Äì8ªÇÉ†·%­N¯ªOÆux#†‘\Hlø²„=÷ptU€Â¬œ277öæ·ªÀ<èRô|LÒSØ*OírÇ²ëÚnýøšèÒÙ²š‰H?GÆWè:‘9š–®1e§Ù—Eµ27^¤§L€·]1¼!º*M®œ®jyíÒX¾á˜‰™-ú‚gkF®RÄóøøO¾mà­ª@È±1ØNÜ.©ï	MÓ‰L«VŽF{Cvœg¢Ýr‘i™“¸yèAØ¶|ßó›£¼Í4£aÿâù¶´œ:î¸¶$TêjÄQn7ôcÛÄ‹¥•T²:zmèŸÔš+ãÈ°C2šp‚îzÝ¦‰ÿïÌ‘Vá>/Ÿ«	ŸÎüÛ²‡U±J®HbÉ7ÍÈŒ6¦¦ýœÕZu6§Ž×Ãýå¹Í™÷íníßžÉÏ*LjÁÍ•¼eÍá±íŒº]+šZpÅùúw#´3~9„Íÿ„o4jµ-3î™Mwä85šuŠ–¤kÂV®Ç	˜ãéŽí[AèùÖmÊ µ9ò.…«³2´Úlâõ©3ÖŠOTç¯vØòØ8Ô—tðª†á?õ²Nuã\ÿLÏ€³Mr27UvDù—»Ô¬ùÒ×º":zUñ\Wì¬V‰¶üj“h.<#›Ü•33Q”Ÿ#øÿP×}›\5C’K¾êCR´GÕÖXãYSi™Z†rö­_2s—Â*Ut|­}9&B"ùnê[ŠÇF<ð.ž?³£ˆæÊžpw2áæ=k Ã¢jÄÐµXÆŒ7Ë%ŸD*hRˆJYeÙ 5)ô¬K³öTñzÀ8´2°µ½üÖI}ê1i…(;W‡`À²@Âð,äž"Ø€!ÞÐr1Ã%Ô‡Ø}g°±ð_!üøžô>Å¤J%¤ëÜ°ÊŠJEÐåÄñìz®E+ ?zØZ‹‹å%ý}Û4-—]ßsœŽÁS‡G°•zêÙmòH†7P/’¡Ü$(;´=¬fJqdÊ‹óÀˆâi9
/UúêEyâ™§ÌÝ^1UzGP¨I˜Æ¶ìÐlø.ïFdz:N~À²äå&Ä´óùÎÅùÏÃÂº¯Ál&DoMF®ytkDEªÛI5+dpÒZNæ)ª=±¶pØ¯\z7ü¶Ø]rÏ=ðXÑ…Â„ìmII­\×tÌÈ^&7’OQÞ¿,O}£¿ZM 	‡Sâ8¤qSû#,¨Ú_-é:0}“ñ®SY„^ÔÍ_ÒöÃ¥GX²ëÂây¸½°¤#ª	Î»í}‘ö­#Z¨vé–&÷[g]%À)’^J‘]­Øò §‰@Ê.‰ÐR ¨—Oi<]	®©á[M‡Ôâ–êx†«×ÕNmºW”!ŠÐ¥±«ëjxcBeÆéªÐÖuá‹®ÜGàKáFuI-ÉÑŒžÏvuH0KK»è­[dfFY/Ÿkz[Ò ÉD„›§Ñ'§h&Âfƒ¥…éì#z#éÍF«E„ŒàyòâSš6à³DÑVëúòT}2­C¤(Èêw1J8"C}  …îŒ¿¢ÉŸDÉ.æXüxDÜ:üÿÅÖÍ‰Ï’òVxÉK,•Î?¥ä@ å-2³œŠ82"®ØTu".!žRÒ)¹A]#…éCÔG¾E®Ñ³ht¹P[µ›:VÄ4•EÑt‘`uçñI$åš%QÖ`—UÅâø•â âmJ QÊ³ƒðìB“FèØpq¢Â«Ã­hF%„•tt`'•‹ä
Ë€h=`Æ•…¼!3QÒ–‡˜ij¸>'Hª¡¯2y•SÎl_|FAnØ™47JRÉÛ°29L˜¿¢Vªç`ÎÅù‡º!þtUYl6°¿¼ÜÐPÀÅUØŠ@€ÄÅM½yŸSºn¥.J)ï©¼Y¸•eÁí	Ìp\<PÀ––±¨ëšAF¡…´7•
™I_¼Pþˆ\ªtT¥^Z°‚ê¾Bæ(¬æ%Ô¯aÄ®ŒWó)aEÞ"¹&ò5æü»Ò¬xLzŸ.ø—Ú:ð)Æ;z9h¾<÷?½¬ÂßZô5[YBºÇë–i’ç[Ô%­!µÑ¶ó†yæ,bqÖiæÊ~Y\Úìõ¿´ÕÖß¥OlQÓSÄ»ETå‚¸ŽDœ?CÄáRÍNOÅ™Í«J-˜î…}ËW—Ñ~#WG;/ÍëÖ®V5[{·O^F˜À/b–Ìd-ü2ÚRe3¼.Ç¯šXfxUÀ3Ã+kjŠJ'3|(†7S¥½£Ó¤M_Ú^W€x†WõlôÑµR¡aè„R;$ßÐo\;Ð¨R´P5I,5%Šš N³ ë¬pp•‚ Ë¼
:S¥pÊªX³S(¯)º„)ˆ…&¨p]Ïñü "®R•¼ïpá@&¯j‘ŸZ›I«Xs9v°¾ºöÊ1³<tèŽç…il	*aâ1­ñ•–ëÔÎŠk³¯ùtiZóÀpPáJÕ¦ˆd|š^€Ö·R¹”Ž4¢…3€ÖïÓŒ4úrE´2Åâ¸â„({,š©˜Cµß7N¨Gæ§EAjÅó…^1S…M¦Âå”ìöÛ¾¢§!¢AÜNîwZ[gk›,­“í‘‰à‚¾Õ³L8<ðü%nCh—KTzw«CÛ	êJã¬ŠýãQÚ`Š©'gÛ½TH/qæ/§·žü¹L5›Šm€ïÿâÓŸ $5þ“Ój
˜TZxj5á§7÷ú4q¯‡n²Ç«k÷âü÷dücWÿ)[¥F˜h¥ú‹ó_w‰K;à``}¬/îóâü'ôOOÄaŠÚÚUptp¨J+ßqàZ8áÌdp3™ÑR=»–ÒÇÕ¼¡ïý-<Á”¼¡–’‡jÝPC­‹¹a¢ÈÛ¼Ã´åµ\c*[êñÂ'Jõ4®™QnÀØÑ#Ötñcyl»b)=‹ÇC˜t±Ÿ¹¥
¦&¥Ý^ZeºÏ£?Qùa'þò$n©¨™y®Dtšh‡0äºÊ¥”&Ù-
7ÎŽÑ1„h˜>*mMG½R^¤p£”?.Û%”×Ok‹è5Vº?h3×qsðP«8ÿ%æ<à)*ž¨ÍøsüÝžNÌŠN”_já¸¤@ç>
Ž!/>‹NûÒéÏÞ½ÁÐ¡¡–_Fùˆ¿mi;ÕTåêP•pÔéQ„4´´H"©KT1Yí÷á,è‘‡†ÿÔÂ”W-/€^phx2äâg™M#OA@ë—™J(‚¶Q5X9EíWëáÃ²áONA%öÈrƒÆdDðc„C/,p”)Ò‚Œ‰I¯vá<l`²Kƒ…Kˆ„5R•J^öŠ—ý\Ù¨²ešÂ¤hÚUŽZXiYìHÙW„àŽ2Ëð„BË§ãZ­8ú”„Ô3Ãp­ô>h¥‚ª;1¦4Áµ°@q»$öËÂ&I¥zß;*Žz¢§Xìd/F ­mÄ(Ülï\œÿ3	¾~ÆžÍ832Äõ°˜_Ù7Âô ²§€U-úã\rµí7€ôquxô¯kIòX|ÅA}‡ÎÜY±Š Þ©Gýíûv¯—&=P]I¥L•ŒA”Ë1d­dì™¾‡Tga³†–N°|ê=4ßZbœJÞUÿîiEÆU&(øO©¥½I4F¼]#€Ã84l‡Æ·'‹Ê’õQ’ÅÒHÊÁYDZƒ³›ðÿjƒ*÷àGíi Ï'7Ot>O¿€3½ÊÀøß²´Âôî¾d|‰ÚÏ’îM6¥YSä|´P³-ó7ÿZáæ_fþÝŸÞß~³»Üþz	 ÿ\•¿¿?ý¶÷hU€cíO—ñÔ¤Ô³q7^NÕ8•ûaãæCê›4‚×5
/ùqDE€N… #ßiÚHY'´ò&ñ­ÀsX:sëP{÷=sŽ°Oø¥fxPªyôã$Ís¯ï; X'Ãä'Í~*Å’lyˆÎTkC}`ütöËRÖâ¬tyÞ£ÀûJÈ§ð¤otÃ»»÷w›Â˜+Äq^ÍÛ‰57NJœúäŠ…? «N{@Í§Sì&]ë^@<ŠõLÚ¯á÷"Fêàº´¡Äo.¤
-ÆuÇóF¬ ‹UÙ-s+œ#3ï¼³>Óœøpþ®™Yú6-í¬¢©RYr^Iâ’’’Y8®€*2²Äø¬¸Ö¹ç†N{o„QR|‚fíÖ{3³íƒhÂj==ƒ£ú¥ÍJå²UòpÅ„×ð²rxYþÝTÀ0Óðn‚6DLƒ¤‘‘Tfiå5«âº.T¨‡ÆeëMN4ñNnxIõ9°tÆl1ï¨"ííšmS‡IÓÝþÅóßvÙ?.Œ0«š«_‚š.n5ê–Ï¨YJ"*|`Ò:Ï©bQØ&
ß¶©—ª¥j^¨«°{ûÁmVW!Ý–UÀàü\³HB®L¥qŽÃþøsËþÑíÕ¬–0yýl®„©ª7âÊÏ\³ÂS©-4wùPúuÊKU‚ÖJÚÀp³×ÈÄ¹&Žª_^';p„2¨‘ºñô]h¡N4=}îªcéy\H·Anã/§PObW¹Z|¿ÜØú»ð6ôÅ\²á‹=Dˆšz‘õ)ààx¦xÍ*šì~ý»¯Ñ§Ð—p‚R8œTä=EN‚í¯6¾¾#©*˜2%¿ñ:æ>}]jÌ=2«I"îµŸo/ü<íÃbð´¯×ñ÷ìº¼ø{¤ûÚÑ÷z¿Ž½×‹´.	Ä¯‰YY°ÛD—íÔbm³Ä5Y,uÜÂõ‰¤.NÄÅër¢©'Yè‹óŸÂBÓçXjk¾øLX´FŒ5ï°Vx5.ù„ÁÕI—ZM±¤!o_AÜµòw
	ËbnkHž›TöÒ3¤†ÀT¥¡WêÚKdj¥ƒ†f™Õ"ÔPJ2Æ®‡A7;¬rIUOÛ}ñK9XÐJUÒbà‰´xC)vø‚’¦r1*µqóÎ6Ù2ý½ïîÔö]häväÎYñ~»ÓÉíµlöˆ–œ^©=Kgãòfñ®çõ@Õ¾œ™d—Ì&»éÏgFÿÆp¼KšOlºd6ñ–?Ÿ¹|op>2sLJy%³ÊïºÒ‰ð„œºÂŠöµnü<«¦”öš]‘=/´j&¨FW…R$òpüGbäþàâü—Ýø]K»éÔåj—ú÷Ú©h8k•ÑrQÉwº‰hL„Rv\DWg+6ób,+"€(T0¯“Ì^¡$³xm_|J-î Å}‡ÔwÐ ÎÌg™\2¤d'ÿ™.ÛJ’Å²÷½N+èûÕH‹—ôu¢XþçËKÙÎ«œ&¶ï[p‚»½÷‡éÝý²RÅzp¸Ì£²>¶è½Nû&ŠE]ó÷ÑÚõjåuí÷G'ÔR7@ß<A5åR“­"»t¼q.7Ù
cóþ<ò¬7§çgwÊYVÝ8Ëª{IYV]1Ëª{åYVÝo@–•žá;ÓRVÇÈ¿AAS¥XE¬³Öî‚¬ïZNPV_­|¤Šºa+qQv,¹Y5ôÎöºnêKò.íƒZUô#²0{F~T5àýîÝ:}ö¨q:é·Ú\V]¹—˜X—Élë^^f[FÆ:l¨@®2óGn~¢CpáŒ¼¼Ì61É+1Ad&/9³«ûÊfvÕIw©™ì2QªK½D—Ø\Q;Óe*Y)usRD=©nJÝe
uF±¤nþIAö‰Øx”{Ò­Ÿ{"Ë<‰'uâ´“É“N*§œ°ù©3ÖŠOT»¿RªIÅ¼i¦™TO2y3RdhyÕsFV×Éð†ah¸Ý¨²OÞ$×÷}Ï…ƒÎDCèS]Ï7šW²]#¯Äk$•¸aiFI2úhðÒÉ´ƒ-s`»›§üƒ|ÝìàñØN|kò—êþ‡ž‰7Â?ª;`€(á¹*þ%¿Xþæ)þWþ;-h—Ž‚V4äÚ?Q]ëö(!!IMß‡õ:@ƒß<åäwñ¢`1ðä¨ŸQ$C ¬`p®~*â;ðùÆhnJ+Ñ½ p¥„oKÅR’Ö)ÞDQû ~«z¼#Ëß1eŸ¸Ã½ü¯ú#È×¼E}ä[ö1Ž*=Æä/èñ}¬c=¶m·ëŒL+´(4˜~Ho˜üZH~Š#Ø®ál‰$ýæ5|è û}h7Où‡BÎCoL>+(‹*›¬°z÷è*õ·üÄœŒ°Ê©Oqó4÷•üI™lÅœ¤¿Õ- Ê™~©:9î†žcLí%ù÷ò6he/y3ÊŸŠG#Ü˜
K%ý¹tlŠFËî(ZµÜc;?ˆÖNö›¼-*…Àdå7¹Ežä¿ýˆ¬ógdíÍO$³±_ó2P¾–^¦éL³©û„¿¨Dˆæ~&G!&Aq¬‰¨Y³if2xdù;¨þŠ;üûƒÞ lÚÖÑÌlÞ^+“ñ©>%oÃµh¾°‘ý˜ôßÀ±é‡ÖïZt™Ak…˜#¦+Jáœ@ÁŠeË¸Û¹Y9'hâÔpÿä=÷À“H¾’ÂÒ=ß0mxÙVèµ|B‡;Ôd_Áû†c²RöBÄå“å¥ØDÍâÎxDÔqŒoN›ÁºÔËÀ_ŽÄÜ¾mš–+±eÇëá9#è ô°È 5#Â¿G­µP-á?ðtó‹‰Ÿž…Í9#¿µjüÖâüÂ?RM4Ûi<Þ¢#¾¸„–4 ‰†vu=1¬â0/ø\é¥0n¨x¹`¨xJ–R¡¢sA0Ä&´„'ÆC¤'2“a»ŽíZ-ž¡Ô,ï÷G˜¤ýû.Ùeö›¾GîÚãgZ7÷³.KÆdÕ¼ÙîUjŸE‘Yi›}Çå8ø‘Yš£ñ‡ÔdP0îïÒ¬âŒÿDÍz~zqj|œb¢ºÉ¶t´S–a§_/£i]äÀ”yÝÂÜÍÜ×I.gþ§Tn'&vo°òÒ]•…·5ÎJ&k¾¿TQX.³ÍƒfÚµ/‡«¤âXiRýs>Q‰v³üXhó; OxÌ²ÚG×Ås]ˆÛdR!:°Þ¦ü‚²€™	‰÷†N¥úÂy¶¥(§[Jå	ÔÇà-Öb{wØ"F[Æ+‘Ûƒ-	ðŽÂ,=<ˆÌˆ	ç!  ˜ Õ4©Rþdá£[¨ŠP2š=+Ž_N26¡í(ü{+Ó>ýMmd*É²VÄ9F+,º°n,Ä!@€Šhg¡>qYiY¨ãàâüg!U0Ü±ÔZ—‹Jåþ5N,×:Ùù°¨E€ÑuÚÔwj°ðÎEày€¥ Ðj]3£”6u	FÏ‘À•±Lÿ"Óãßå8^ô½‚ÝIÖdZÕ—5¢çj)ŽÔŽyÝ¨–yÆhÍP+Ô4fÒ€Î$ÂlôH>†º}ÆXY(‚™Â2#t Úá®Å¡®Úa®e!®Ç¡t j+x>3ŒI˜É|òK‹B4¥½Ò‰™¤?DÁÌ(gÚbÀjÀ°¢³OAËô°"À37…v>'†~
n7*¼…Ïÿ“Ênn•ÎvPŒû™=‡è<ÐÅÅù' !xãg°5Y,œX!7]·-AI8©tZå©9(¥<uH
	ÂÇ’)@¨ÞÅô4ÊŒù² ý}áW¥G@Òú„µ’Å‡.Rj1%¨ôY+=0'²F—µñ¹ò]FggJ_µ0"‘%– ‡¬°¬ ápEÏ4B£õ$áïMv(|´Ä²³ ªBÀbºìUÕW¥ê¼ÀÈÓŽDÔõVêqÌ—ˆ)I	±cõñŸa©#jÂco^TáˆÙ
Ø³rZó¸c¯Ê¤ª¢Ís3ËÓ¾w:ÍSHYAôWe*eõ]rÓ¸—ÎdÄÚ<Ð IJ\õ§Þ~d8¯æôîx¶[¶ýwdOí}ûtzÚT§7†òJNï¶áÃ1ç‡Ëe–Âì=ø¯_Ÿm¸ØÿTŸDö3ŠîýÅuÂ¹6iÒ\Ó9ò²ç’6¸
rë‚Ú‚+93þýD"M°ì¹«ÄF|óßÒï?ðÈ—„É²ˆùÁý}™	 #·AÈ$ÁhåÏ!NEÚ?0y5U5šÓ“Y¹ K%á«E‰,ªy<Qíw@5¦3±óÊÊÁúý%ËîG]"jšn…l×:b[ß±:îÀžøø«[»ÒÒ¢tûfæýr{`ØiF82ÌÜ¢Snx)Ò÷-wVãñè¿÷pí®Wh—_o:ð	œ>ÿYñ8Ó©SÒãé~ÏcH@Yµv/uƒ–uTbš-šNÍoµÍ5ââ:	æ•ÒË§’\.I-Ç8¸ÆMÔZ©ø’œÕó ˆ‡Ðl•´nIG=ó)ðC¿ISáJ›´‹§hî	=v½y?þ¬ßh…Dóò4ó)–×OÀ€§7RÇT;ôíA“ÖIz#ÍÏø/åAå,ÀÝ¢qãF6qÆˆ6ƒ¹>¡‹ù+†AŠÇªEY½(üiD¿3Ó{ñ]%\“ú‡ êÚ$9—ä-jî-î‰Îeº©ÚsÅÝœ(“{Àmõó.yŠ˜|9!ùJæI'aƒ§‘zÝ÷¬˜C–Pa˜&&j€€Ô)4_¹H03;§áàA¯ü… –Ñiä/‰òZ'i‚§ð°¸Òa†åmEÁ‚ëª+}ÏÂ ðL+(®†¶†hùûöÀµ{0l–ù)Ê³[r93;ïÝÞb93lç89ðÄÅRÎÉ'xN=W²¹Ðo&óf?¯p2ð}ºëª%âäÄõ™ò„˜¼ÄWñ!|í&ê²ç’¬ r–$ÏÿÉfÿ°¥N¶r}îR˜§#‹ƒ¶âœ:ú.8X{5kPJJMdâ¹êAˆm<rFÌ¨÷ÿ  ÿÿì}íoÜFšç¿R£ÍŽZuëÅ/I´²Y²c#–ãµ<žìùgª›Rî·a³-itú‡ù.Æâ°$gAfw0Áä€ÅYöƒ¼þ?ôŸ\=õBV‘Eò)’ÝzI°,u“Åbñ©ªçõ÷Kzœ–¥G?&zzÁDÁÅpþ—,¤±œ2vý¸1ÇÆ–)â“Ž»¤¶	;‹rU‹@”ìâE†2DØ&‚:$uêÛoò6ž¬HC$þo.3 Ó5:€CÌÙøKæj¬º‡{¸4Öðèt®¾ÕÈo3%ZÏ8´Å”#ç±?Ððy$„Ã¯¯…bààcpÆA¡K$Ô¸ÀÒ|gå…O•»ÉÄºŽ¢UÐá?T:‘ï &ÿím½A[ÖýˆÁ?kùjò¥ØÀFXÔ¤çoú!Þ4ïÀw$>RŒoøtæÁÂ¾Ïè+R†«OÂLÔ"@1Vˆ5š!o-Íàrw?›Ù©{ì•†Ó|ö·c§X3¤zñÕ9¤@©Û5ŸïÐÇÅÆÚ´ƒ5v•T›zµÙÁo‡ËšÛpäÐ¯¸á²nüÄ-lðcÍ—Žo­]½å´vÝ·¨?
 kRËôh:/p:ÞïÝxNŽ
?d®²œr‡ËfÞ(›nu=‘ÅˆM|[(dUå2j*»“uHâ‰vÏŠX>”ZË’.#YŠ¶,uRùwùç5V›jÉÑÇ¤]ïŒháËÁ`-'ƒ%½î¡œ¡",¦#rÕÇ´dtÐÄth±˜*æñ€˜zQ ¥bˆ^‰8È¯nÄâ áÑã ±1˜7?H5@cë°æ~Ê
(ïuî^«Ö£z®QÌø«ÂÆ1Œ}µ¼Â
—Ì™Œ-ç…ä!¹?Ã­£Pcª12¹Ê,ÿ5ƒå/…~¼oùîéñwcÍ–(³Öº,R­bâ$ðÄEÑuªXU­QàEUÌŠ
F2n¿'fE¤”Ø¯±çÚé„ªçÝÚ–ŽuÓc^ýW¡×SþL·†I¡øVfFd#ùªØ½ñ¨ãyÞ>=þŸžÔ {»ÿù½X‚Ó± ºoqÃ&á7iÚRP3~Ê: ýFv{1MÜú«W z—W™@ÿVšíÕæs§hW
<ýllž3;xá|
¯°Å)n07xy…@(¡gùž;$Í¶k	œRñ)äøß.|L7¸¾FßvìÖ%) „ÊôÜWóñÉODå¬¤;u±2Â˜H¼ H^sE·£—Ñ°rîwCÓ˜l=aVV_å”Äœì³ž}Y‡ƒ‚;)oC=å\–&µ%Š”€ƒBÂWñ#ÄÂæÈNÐ˜Ù)6òs¼jŒµØ7,Áð˜˜m);)
æ¢'EQW4„,i€ÌDJà+T|%öÇMú_'*àc¯yÊÀD‹¬ª^E„ŒE%Ê’Oú®wzü‡‹Ï(ËZ[ÄçkiyÌ•ø DæÏù,~4dî*]uªtuŸ•ê®:ÜŒoÏû´BÏ«˜ò·Œ^›š™“SåäÌ‡ØLÃø<MÇ2S.ácµÛLBmÎý=ê››yÎ)ÜÜ¼Éì–2çq®6Ž×ÌÚBºöæ%5 ûÂãëÜ‹)Ñ]â?ËÇŠHˆÌcm+#3¼[¡Á€™xþƒlxr’‘·Â€Iøm(þÉ+f¿ãÄM³ Y£1aP»3·"%QÖ;-Ú2óÀ °»Ã©Ž)#°Ý>µ ¦¾uòc“¥É·‰ 0ÎW,Pk2[6eÚ.6®åkY Ã37ïÜ"k­!jÂ†SV›“‹3ñv‡ ¦ÏŸ;Û‰¹O%URHó5—\'Ý‡O‚§T<„¼Ùìaäç\ž¡ü/N§_ù@B£ÙÃg\žA|HŸˆ._Bï¬t,EÛÙÃ)Nšèˆ–ÜÜ*7KuÆøÐÛWãp˜'¯«BUŠ½ ¦·GEz¬\m§Óhâ²yzü-ÃæU ‚s•³j”â|d¥ôïÇûbð‰ýB×Aµ˜!¢"
ÙªÄƒiC”ên6ó$q`º¹AŽ?tŸ8š>9½`äeôúÕdÑrHÖM(Ô::¯èPÕ#í·ßôÈâGB¸a4,ü­Ù÷Í¶ÈÔß÷zÏ	G‹Et³o~6íª€Ùå=Ý†žn7D÷ï;!«í4Æ8	„×¥à¥\ÁZeçÚMÙ*3Fxžm“ßÙÎ•~ùî®ér®Î!›ø}ÇÔ¨2ÈÊ44!¶od+}cŸmX·€ö¦lÆ«O]‡~×Ù½éPwÀá	ŠdL6~(±+qqÍO×òÜrñGa\÷ùði÷W¦—¤Å€ÔVÈ4`˜7¼­eÁ'‰nÝë:ŒgFãÄ7$¦”‰m1Z{®ûüÁî»B–òO?pŸ‘ª<Ôôµ¡A‡ã‚¢'1d©-º¢PUQÁ–›}­É¿Êa;Û
l|()ª™õÜÎp•\´³M-¥ú¦ c—--ì‚Ý]Ì¿§	;ý÷y!lBÓ\a¿`.èÃ
¹BÍ=ÿ(¿ÉU^£×ª,“1oh"¤àÁv„üe|¡¯¾u°ÂhŽ?lŒ¼VþUpêmÙÅ¯bÅÑ±Ý0§•Rèb|9¡‹e,œš ç­EÄâd" Ø~ ‹¹qq `š•dwÉmË„cÇî"æÆ°»Dšê¹WÞLìÜÞŒ{¡SošeÓsA¾ÅXwû§Ç_0Ã0t’aÅN£¬©æ1iÉI… Ë.L™š+öú»yðRo¾<yEx˜H+[çg‘OV-Ê§¯P‰+.2ÊXåÌD ÆÖC\±(!^z”ÊO' È¾j’ÎÛFàVø‚N¤áéñ_¦HcçiL%2¨­kCd¹-ˆð`åcJ.EÕmK¯ôxÆÉ2_4ãN¸)´Yæ¡­à,AªYÕ¬y6€f:Ó{°Ð@Wt!tTŽÿdQÃš(–Õ¥*âMbO x‚ÔÞ[•‹Ðf¤ÍŸE]Œélk&Ù
·iËzÞ;·VP@{½ Óà.àr¨ÅôÂ«?y0;×ØáGÏÑ`n	‘Å¹#òßíJ?ú¨ÈCß†¸«Í(ž—òžÌ	ÃKkr×÷Ø¡Ò8‘èÓ%Î-³ÍYzÒ½2†9Ë¶‹„öÖŒ&a“8àLÛ€aåŒ{6¨0¿y9é·_©@up¡ÊàUÁgS\A5pv%p“Ú}mòÿzZ]ph5Èba9(ªP-\¨¸X-pj°tý5– g”ÿªMËÊßfÑ¢ß˜‹™ßúX—¬ù-[ïk]ë‹ò„úiu¾ÍÙõ½VEµÕÕõÚÖôNënc×^„ºÛ++äq?p:D¥RåÀ'Ý¶‘]ù­‰iS€+®Ë-Á-íÎD”¼ôZ²ª@ânwˆ44ûÃ$½F"æy0‡²&,äœ ¬P‹¿-‘JòKVH=$k»»¾»Ë–Â¡`n¹­'p$YwºÇÛíÓÂ^k¢\7µ×Œ§–£žŽNÿÀY^z¼ŽW É??ù‰ûàã«yä£é|÷Áéñ¿ÒkÂí¿ÕçÂi ’õª+b”&>ûè	sûŸïDÆ8ÓßÂ‡\Æ¬:3•ÞÈ%0ná¼3:þtÄYÍ)¸_¹–¿©5cQÌXP³]±cvÃb\°÷+ÒÕ‹óáü¢ŸõD„¾6:úV9/£¨â|é[,˜õæK6]?>ùiÜw¥§àé´÷[ùROþÖ#÷é@z¤¶ñö*î¯ÿÌU»Ð“zzüïÒøcÒ†Ùõ-0¨ o‡Õ¢,¼©xOªi)cÎTjƒx­}¤(’Ñ¼HEk5xWKêôoÐÝÙ_ùÚ;o‰ ‰¦n²•uÓ	Ú¶VÐNFM“ýì9ò+B—X’óoË3WQNÆ˜ç˜RUŽã/WÒe¬y\[ªÇÕÞådíp’P`i/pN#ý-çhrýen“kVlb]Å‡b ‡l®²Y¢»Žfè,P‘Gß§Yp`‹ÞÞÎˆA³çV7ð–NC#N¨f+˜ACKDWöêK×#½o‰Õx,‡
ËÔ	µ§¶×j¹=âõ Ò¼.*2mƒ%V^Eâš=›¸3mÞõafla·ùþpxu:RáÌ¦’.¿}_~é€ÐÊog4üuKÔDK\ÝapÐ¡£tHö¼$È>{çm_]¯Wc½œg{ÔÑß?³ƒ‹³rYEq@:± ‹±á=ÉÑßÛLg«~YÎ}¯T®?ñ(È¥jå:«²íª”´²<•êœªÄÑîQçB:”zô}òÑ›/?Þ°s5‰6¬]MâºI£½Ýà¨õ~gÔ¥f“p³MÛ--IèÚ"l×¯JyÛÆVÎp’ÉÔ.E!Šæ{Y8 öî3Ú‹ß8ŽèÛ'ª+¸ÀY«­jáG)šã¾µ©3E~C¨°Ð”¥–ì«i3ïT÷ôø{ÍëÅÉW{í“»j­çD±ê®’A@Ø€œÅç¶]ßiyôõ _ß¦/Ùïwå[Ÿ~ý…×§oþÐ»¥úoÄ5T(Al™¬06:ûbªS¶À$0ÞìeÌPênCq²ÁÛÁq¯ÈúÉ+ù»Õê¿Ê„Ht²æ:ÞŽTªw¼·kï-QbHÿ5ÝZm8êÎ“m^©<ê’wIm[Däy¶Ç<ý—§Óq`™™,„7g¥=wXŸÈ/`]¦:›ŸŸc~wB™ˆù;•ÜRH&_R'àýÓã?J¬H06wW ’	ÉæNå¿çÌPÁÒøí?K”¯ª¢<ssÀ|:,{–q:Ëu#Àƒ„"gâÓ|ŸÙÃ&9“ñ…m–’¿Ûö2³u‹¢ÛU7Vyª1sýµØT¯t”â¹cÑ¶Z´2ö©±6`xrQ$t¿wö!=(½äÑSâ*Ê1Ÿ„Puîƒ†ÇôÖ‹VÙ l2~Ïl¬o»ÁžKgÐT®†(J91†±p·ß==þg2|ûØªx•‰$\Ëšž¥ùÛ1.¿›y¦J*>¡`ËfµD|è{ý=ß$×z¾º#æ11U&÷ƒÌÊä‰¹nûTðJÈ¼zv6E%’céYjDÏÞ’äcçò1Ã‘ZÒV‚mIL<šLcz|úú[(ªzýŠG“ù“Ø‘i:/¯ËVìÅZâh’f£	`™V˜˜+îOÛg.ôO¥5Ué‹ÔE®­2Ù©¨«R—Â0ÍÉ¿u!yâõ·B'SìÎž²y¨åWÊ>2-¶:/ÅV,¾ Ë¢.VAÔƒ(-WEãÇCœÿoìzŽ*èc­ÃÚdÞÅepa«£Lk1Ûþ¶‹WImŸm•”òÞN+2cqÉö¸ŠKÔe_W‘Ù]'Vf®ŽºfUu8tv\áÌÚn„ !ódöîÝ•n—´Z››ô˜e H³u4a÷øjiTYSŠgbY¢ã¬¥‘ž»±ÖÒL¶Ï>aûªˆ£9Í`ätÊÅÑDÖq4qÝ4Ž6Á8ZX²Umm½ïõbièJ-J Z¸ID@ä.‹^Å(&FkCñhsæ™ÉÏy&¸!=üÍË“WD•‚·rYbj"w"j}¼R¹5vÅÅÓX@â1c°.m¯ÚhZXð8ÎXÚ[9z€Okªñ4Yá:†xZ”w~£i±.^²Xÿ%PV—qÆÔTy“qµÎéëïzÊý/Bx-ðùâÜÑ%¸9ÖøZ¸Dù}ÓØÚ4¶V,¶¶+|6Öst\“÷Oa‚Ë­ÅO›Ö2î}qkák†Õ’_-¬–\¢.rhÍ`¼ž—Èš	yV‹Î›†Õ*n›õ=tËŒ5l',mÁ;ÆxZTô{)iêê{Á!qˆ}©-%˜&ŸpÚvûþÁD"i)!½‰a<bc\²|îâÃÅMC\q™¾L6½šPØb-§¶JÏSþÊZ«ëõÀmsšÖ¼!ÿŽÎ#o¸Ùoñ_ÖšM8‡;p½áGkü·{0ózNg+pvvæ’.WSÈÍ;dÄÚÔãÐá^(vc×¦¸v±·èQeÖ|×!5`g!¿RÒ9ƒ×(®"Òëë{F§{8ir±žñ¡É‚_S¿F=zxæãR78V©Ì4øT'Ùí¯é¹½æÙtzÎ.[#o\é¨‡|¬Ý°L_zšÇÔüDâšïZ¯ßs¥c®©±âl+jñ6¸lI,T$"EÛôÝ°eš~¤Tpò†Ó(Ý¥—õÀ¦šXWD˜(o‰L°/ÃÃŠ'Sy/1š\
ì½ÄÅÎâÍaJ’3Ü”Ë†XV”<{S£ÒH0U|D~%JÕ ÒÃˆêznŒ6ùÑýÕ~2jñæ›Ï{d€º^œ|Í;*8ÇU\/n&sd/Æ´Ý~ˆñ…Ýò§ÃøSðz&¨$tµ£ËF×nr8ÊµV+Z´Õ.‘ùÐm­¨lÕZ"Äuá÷æS„J¨õ¤Ð\ýÃ7fJdñßš}ÅWµœ„n&ñÇ§Ç?Â+îƒ·°¤ÉÍMYFyºESÂßŒRúÄVFÕÐèýqÆÐIòÃÆpÐñ¨zZŸ{ºø[²Bfgp÷‰mµ€3d“ËÑDœŠÜ0ô´¡.‡4msódòåê››x T~«§ó¤û[RH*OŽm‡ª ½¬={ç>ûQýÃîÑ3d[(„¤’Ÿ" »ç’)À6hiÞÂN<xóyÌjÐîZÚ¢ãðéòâòÕyB^c?¯³Ÿï±Ÿïÿ–y0ðþ¥#‘ëþ tÝ(ŒG7év^|~`ì1Ö¾~É9Z|–.ùâs0¦¥ç X~öKwHŸËÅgÍ÷ƒ˜-µCÂCU+di™Í“Ú›'÷œzä]²¤’6N‹å~P[¦’·8;7ÇÖ©nÉuJ1
7¾u¤‘çbÂÙ*¨“Î›î…o°Zç–ëøÍ6xÞ¢ÅBoârÓ2.A-ÐI×Éƒ¢MIÖó‡ò7›Ë6Ax!ýqiE–ñy$ˆØ”"h¡œAUˆº0µ‡<?'5p&ñËÏW^¶4ç^rîõ#”€Ú·‹‘`pµ­þÉÆ
¹†¹Ê’×´¦ª(yEE¥{Ëé¸CÌnØïIÁvYvuLºY;5·A÷ý]7h°[!vÙK*‡‘G­öäÁÆÜØ$úQH—®Í/..Êg/”ÜháÁÇßxA{½ßí:Ãš&«Ün%V¹â*šŠ	lÃwÙ@Õþkca—*¯³Mq2Œ‘\<-!sœ¢Þ‘æ™gØ¯ÒR’¾ùˆÅŠ}ò^”¤ÜÙ•¿±o–U	AÜ¼åaKoÝ8„!Ä
oîõ¨‘dÃÔð_}äîøî°½¾gªÍrzð~Ð÷ãõH×çimd…¬>ìŒŒÅ\òŒðÞŠ]¨¨
x<aKàx‚0A†˜Šù¾ü\›(3›ž0†H\j„ìj‘YX“Õm­„éòô÷üŒyDâdjJ#d/–jÎîpÇë¸[ŸŽÆ°íÆáOâñµk¨øQYÔS"^¹"ˆˆe½–ŸŒ_V»L†€ýQ ÈÜ¨¥’S»¶ëj;ÌßÝÊ=Ub\/K^HùF!a[.¬!_ g
¤[ä½á½î ïÑ:¸á9þî'·W|ÔÖ‹r’€hÆ#¾ú2ÉIæ,üHnï7ÝNe‹`"Ù$Ê11¤‘¤Üéx³ãª,$qpXIi’ÇSÉÜ/Ú¥ª.ÁPâàkiƒ#”8¬½5ê<ß`6;:?"­€ç»¹JÜ÷^+–YÏÞ2»“¶ÉßþCÜñ‰|î¿˜d¦ö…j³o¾¤j+czl4³T£xö)°>ÖÞÉ|Ð£¹gX—¦£`Qùm¹Cº\°ü©ÉËpi¹ä2¹Öé”KW±5`MÕE²b©[ë¸>„¨èè
EBø˜0a)Qå2“ÌL˜ŒÍØÖï»ÔÞ¤ÒDöê×ó•+Ö÷ª8ÛÃ~g¸¤ãîõ+$èêKË¤øN´ì€!âÇÅhV7Üm*M·…¶åcöùc(e‘i6óÌ½Ç
ÖP-©jo¦E†±^|Î¨™‡Šˆ9N¶#]¦(iñF4Fe“ñÀŒ-Ù%6z*”À‡$ýËó“ü’ñ UÇ¡«È‚YKíîùÍ†Ù«?}Ÿùó§qÂIiUvªudš"3M‘Ñê–¬³M™¹TKÖùÌ¢ÿÅs±fßÜšü"ÿ"Ë4cgÌKfÖú‡ôÑn[ÕZ¥Å‰Õ˜ªñ™a¶Œùøà¹îûC(Ü‘hb¶qèÌXˆfg‘/=9>Õ—“+tÁ¸RÌƒ×»6^Q¥„ÕdmåžR¤bB—•¼Òc¶,p˜¦ë +q%XÑœˆCÂ²aë
sàcûc±Õ"„<Vì“ê8fn§ò6|s¯·ÓÇ’$&«Â®’½ú`Ÿ¨s%ÆÕÀ‰¶n9­]7òÔ]ª®´ÿ`&&
{H	½9„ÙßKúè)cŒÜ¸S=dGäñ'×î“G·×?y´±…ZÂÙSëùÕ°K,4S~$8ÁíÔÑ¸sïþãÛnoT9Õ%Ÿ–Þ`/O?HƒAd:¢8twÂ‰;ÌXÓnÂÉvÁ/ºÄü¢O<wNyÂV²žê¨A~M—‚OIÐ'ÃvPÅ­ð„™ÜÝ³©ä@Ì›~¿Ó@ºKê]†Ã·X7ª„•AbT+³W§ªï ¸¯RÛ@´Ø›Ë=AÃ¸¹õ¸*Š$1ajÑ˜‡÷ Ë´žfÛm>ßîï£\e¾o	Ë¨møWètš°áD¹Ø[@Ÿ (’·Ø‘›dVÜ˜^îª‰Wt¥gÁµò+âí(}L<áœÅõÌ¾ß2=h-ýéÀ,ó¡Ÿ~ÃkÍ¡=	Ôò'n‡J{%Ý{ú[›#ÏD²gãB0–HEÑœµ±˜µÓuÉø¦FW§eðû~}Ð÷˜2³ð–xå¹nÔáf^®·E…ª6ðÝÌÒ?³}…Ìäêì<iy>}ùôž+NiÐ/9:û¦)û8<MÀd›³Ç¦OÛ„ð5ÿàgÀ#×X”>Œ‹ÛÀ!ËUÈÃõ'«k¾ßßûõ`£¿×Ë±D¯XY¢H¾ô‹#¾*áy“b¦Ée‰1?á\Ë±Žo)ÖÂã6•æË ÍC¨¯È’f~Âå•æ¨´g*ÐVÍäÎ›<û¼ #K¢å)B¦Ý^ËVëˆj„.®Diõ…â2÷¢=n;}œ|Ó´ê$CÐ
zÔxôpàìz= N»“iÎÕ|öÇ<ñZûx n‰”7#5LsÇF¢2æbIu¦è	Æâ-ËübÝÏ œDÔ *¯]—ÔÉÒùY^$ïÂPAÓj3õ)Æïž)ì ™ˆ‹FqÒ˜/^¯ÙÑy[eõƒ£„›¥
GK†/CnLOü>OÂç³ñrr° ºÅö=îªy-ø„þž¡è-Øõï·ÁžŠÞŒ*™ªà0ÁOÐ|ÈÅFìVŒUÀŒÇDÁlx*^øä^ë·_¤Í¡7isgòb›PbÈ~ÁŸz§àûYœ\‘¨;H&P´x®‚Õ¹7ÇKa,ä÷cï¨+Ý¯ð[UGÄp0;qêŽ˜9…~ÏèkµoZÅ¿6râ3ä!jÍ×Y^^ó@nh¾Euy©G,ºz¡jüâh]ÝG(Ä»íþW<.^ßã5û=«Ë4Ýç}ªû¼W-¹š«AÅÆÊÑuTZ‹›ÇŒ[ëÍývËÓË¼„°YíÙI5¶‘˜ÐJF_ÉHx}j”jÿÞ#½²ÔJ‹Á«1øÙ@çô0V»w¥•Òô'Úêf-YUÙ±+.Ý\”U¤ie£ž‰SŸ×÷žŠ÷†ñ¢Õó(Ë¦BÔÉóøTBfŒ0?×c‹Â‹$­p¥§ßÙ8½‡×uNýÊ²æ1‰Í6‹D(8ÖÛopHóäG(.ü+épü†Òl÷És ‘î|}pæo3Ÿ íšCg¡ r×ØMïôûAzÆÓû¡D|k6œ†ª·ÏäÝc½E&|yRò®ÅÌlæÒ»j(ÓÀ»uUŽ nžÿ	({kå›—Œ¹Èg+·	¡×…=:ì‹ªl[éÕÌà3˜w×¥'”g—*ã	ÖœdÅU‡PZ8ÈÓëìzðø‘!ø’?Ûi6çYÅÛeé_ä]ö§¢e…¶•éhi<ž™O[šLèæfèÑøTÞ¢y´”ËŽ*¸Zâí³›Orà¢@Uf–)_]K'Ïææ°æJÛ<ä1ˆAÞrÀÿä“MÇÎÀ<Tæ›4ªq+´e/ë(ä’¬Á ï ?¹¼Fï¡ŒÊ=‡*ÓfÎ+ 'xéa›#R»KŒÏ{ŒZäÀóyéÑõß@NëäoôŠ¤"‹©¹PþsÑB	aŒåJhÂ¥—{Er’{fÌÖJ°ƒ**Dn[&TSõv)ÁHÆøokíÔðñ¦´]g¿¶4O,\—»!õ¶ûÂï÷î»;1³Ø„'ðsé|P,¾jæj‹H¼¼K+¹:ðêˆ½V%+V‚Z^<ø[:£PPñtƒ¤t¸¤T"ˆò=¿4CÑú:ñ^t°=ŒGŸ°ìl&=	jŽ¤Òïž z“eÒ¼‘t¸µ"pêÀsùýÎ0,Ê¬]»Z%‘•d¶r¸jIv8[­ WAsbÖö|Lƒõ˜½6éžÛ$
V’ä©å°¿þãˆŒwN~"Aÿäkú–©qKZ4¦o&òoªîpãwÈ.ü“?÷Õ†þÀt¢—½]+*5ö ¨Ê¼’(‡©ˆHØJSvAäCü.
‡6Ã>ÈÚIcÁäxº¤žFåtTFTOb€s·÷aë}(™"M m6H(ìôãµh$œF$- `É§#&´8ÐM;÷ðÏS&ˆD¯ÃuI¼æx¬Ô¸´Bzìv|°©®çt†.îB`ãtý‡«8~,8¹GPóó*àYmxþ\`n&Ö*:·æÎÆœÕ+½ÅTÀ™@ªÅÎ—0o§RE\O‘»È7 ÒßØï÷çáç|£9|1£$ÓñÕƒ‘ õ­'GX_ŒÅÄå!.ì²ÃN–Ð@º0B€ì(’3± Ä¦a6²¼âAUæ«o>‘3ÃeíŠÌƒs‡*›?GhHß›6@Vƒj@úvW¨ÕâkvIÊ•hSµÔel%~W\vtâ²"º>ž å}å…†Sïb½HQô²<	>Ý>ù¿àT *T–F× ·N_Ó¯ ²Ýçœk(w½ÓãÏFÑÅÍ“ÿ1“×MR£Oö/žpÑßÿDªÎ5äÃZ¨ƒá/y]©Lº!á•ÉÀ²‹³¤[j6	KÅÏOÅÑÕp•/y¦@#oÙ²–)Ý‚›8Àðn•LW®!ÐÓ¦s•= Ú³y9œÍI'°ª…À§ P›4¡—4GÃ•â„ÿ	i=tTþ—O¡~±5Ä&eÃÀ:óÄëµû]wH>¢]j‘‡Žÿü—·´øáçëtm£;0ûÆ*5Ee7z¨¤×ÚµadQšKÙ4o•rQ*)ØHÚl3Y«š®c›°OØBº@>nÈ ,/0iIˆ€™Gî.-GfJ7ý»;’ÜÄ4Û#>Á{Çò-(76À$®Ó=ë@OÇ”M[Hªh»rb¢kÝ&9&ª&c¡ÈDÇ¡Ï^œ‚¥‘ .ôY%•
¿xG7å/|¡EŒxT{€ÂäÅVÙn)9÷3ÿ~ŸêZiŸü[¯]í¤Lí±ì)ÏÎ¸<¾Ã†òg0ãÁÒæó=0Î÷@ïœïÁÏa¾ÛžÎ\N†v¡0ôuî9#±Ü2ÞüWVUMNuX
Ï§'ß4¹-éÖv¾xrû\ð…"£œOÜ–¼ƒL.Ö„©²`w¥áQ¼é6üŠÈ2ˆÈ¨ý•èrÃÍ”š\õ…¸z½"µÏÔ«ú’Ì\~‰B™Jµ²K`P×
d5Ú±­€ŒY‡êÌD¥*AÐözJÕ–ÀŽTEÐ´Ý>sÙDî6ÝPÿ½Iº'¯
óµ,…Ôš|…3G™•M2ÓÈO·ê­h^’‰½ ½ËCÛë«¢u)Ä¼
“g;yte’å7hö¡À5¨•kiç"g\ŠRYD|ž.]	uò”jZÜ¶R!P1koÓÜköã˜(²ŠÅ³Á6NBð“çÒ»0Èkýyì:s>)A4"ö þ‡£ž÷»‘û(ßúŽLo°º(àÖJ7VÑ>ËõŒOÜj¢œ9]KÂöî;®?Ì\J`ÇBÒQœÓµÄ0(–“	õg¹¦ ­¡’é¤j^$«–àI‘{U'·]Òv}wžxTÉl¹ ü’!HB;¶ &ˆ¦§P?NÞ35—®VXÚð”´I½lØø¿éïùüß)¤žÛÎLNÅ-{ÙÀiÄàN¡K&žciõÖÈë´¨Ù«#VÈÃyrkNfj®øN®²#=å´³KÒ‘}6’¹6DæXÒ	QO6S…=Ê5Ì_„¤é†ÅEGUêaV¬¼Û§KKjÂÕX–í‹“¯É }ò¤Ï:3Ã*›67OŸ}ú}ñ[[ŸRù$n-I ¾”ÌuLø£ò§÷	’þÀíAº"0zÿzÐ¢—s5?F þWTÖ{Y§#öW|–f{/”™jƒ¼aÉo+ûILšø2u=	'‚Ûˆ¹ˆl“Q%,àC‰hfÏhP|qKŽ_ ŠÂ8Èá‰µôÞeW²ÛÙæëarõ®Vš«W O¯DŽÞºÈn£ÿ|„dèÏÎSóÈBä“àÉ‚¸"ã}G{Ç›—'¯èÙÐXÑ¬;ûŒ»ø:=€\:cÇæè”ÑO*/G&pZêc^ù.…—´ïÃ¾ar‚lO´¼e{BÔ3ÉlªìšV©6…#éŠ¡'óeð” J7‹d×XÜ‹{ÀzT,&o·ðÞ`O´
K­&Voé]±|·s×vì|OU–yË0{b·ö0öYU£…íî‹‚çÂJ<8’Ñ*|ìä©_NEy—V…ÏvÇ+¼šð7UäÓ/)­Èë™•“×çÕxÀT•?sUþ~âuT£Å³èd¾¯žv5xUX/Š"‹˜•Tãññµ©¯8>5žg°O•øœs'¤ÄgŸ•W`çà4Zk˜´›Ž¡Ì†2g.H@²Ç2YmvNb`ë ×¢³Þo¹¹à*²\‹ÆUÈ}é&H‚Ãg1v™¼“¼10˜©pŒÉlöèñ“7_žÿ3@ä¾ÌæÉ«™’“àŠ•D—œQôOM¨¸xy™‚E•ã{c!7*²¯re,Ñ;$øôäG§„„•"\5@•6¾……
/ û£&_Á\heãÛ
2Fáˆ*½Çšé¹F:Æ;³Öq}Ðe©f®Û•éR„É]ÈM©*OÚ·6ÂK˜àjÑ¾>ˆZ[áÅmð»'_S3OæQ ä;$Sü$º”	rÖ ¶Nþ¹ÀÌ`8ð‡Gm€j+f—ÛZåšv­><@äZá–eò5)s)×QNN‚©âèèæÝÓãïŠàd™×±Ü~0AKèëbÏœ‰ïx|·[ëtÂOJ6³é¯ÿàŸÀNÇ¶Ò°1úuŽ-–jcbŠÊRÊêY†P¢È*7÷&J`Ü¯;£ Oè¤éw:Î˜&™‹tM×tÞ‚kˆô,/AJ:$Îx,‹cHRk`ìƒŽœïgAÖOM¹çg‚ñÓ¬·û~ô]øzó7q8JÐ‚–'U|Ñs×bÏÎ2XlIµY€ÔÜ¡§64¤ØG’Ù@úãx™î=ódÁ2–^ j@œ–õ†À<.	Ç‘Ÿ N:žŒeÇE¸p)ËÛGä¡W5ÆlÞl^kJý+Jõ¼yò*ÄÕÍã&Gó>à­8¾Ç#(à¿žJHö¡á¥ýüD„gDM…$ûˆr v:ßT<²-¾|Ñ$¤ìprkãÁ.øY:ýªú$H¬|aÑ”}ï€Çê ÌÅ7M‹bYž”&ó¼«xz¿çh2iñXF?0iY{À‚ÜjL‡M8IjÁß;&óÊë5;#:Þ5fWÐÙ¯0€/,/ÎÐe`&0¾peqæèjY(o3“Æ/[cÙÖ\.l0OÄdÎ6šõ·ŠÏd(aWa	§™žß}½yÚh4à÷yfÛØ£…ìà¼îÀÿÎ_TóZð	ýùº“ÚÚèx{Ù‚¦]ÜoÅ¿‡+Q7OXü\=t9_y8èLAa¥+6]h•£*‰Ä ½E°¾(»·g%‘vcÑ¶$£’&Ï=P×+xp‡9º
£Ÿ:Vâk
ÄºœLÐËN PR'„GŸE¶€öO%ÕÆ§[ÑÝMñŠÀN1[ŸÅÊ¹§'aÁŽ>øÜK; ŽI;~%LÌ5~µƒ}âÉéhí45ÍÕ}Ð"ƒŒé;f|IPhg»d1
ÛàåN2zk '°3Íèœ	šÐ>>gz‰§ºžÏ¬7™Ž~Ût^5ÍØï}zfóHZžVê—MhÅJ¸–×2@½äÚk³À™‹øÁÝSØ©5\h˜F³Þ~ûƒCö!¡²[¾èµ-Tœéª—½ê¥A¦ßNž5]ñÇ´LC»lë]L³:|–4ÇDºæðtEeC¬˜â¼¾\4àe²uhv®ø^Âàô_¯êéëïz»Ì÷OE6daÔHß[\„˜@·|Ü>}ýí vW	y¨ ÚÞSÜ’7±!jl(yÚ2§î…Uøq®O~*ãÀ· ?ÊbÀ«É“ÝÂ…0B·M(µë:•ž¦ï‚ï|-ø°ô7è¯ô½*ŸŠk0ázîáÌ“ÙVkassá€³ìˆ‚Ø§®ÀCž¢;ID@·×âª“O¦Š=›õÌf=2Ny¼Gõ²™D•|¬¢}OVµïú®ÛÓëÊøG×´Úõ¤1Eåy¨Z)s¡Ï“¤C%þxâŸq#+þ)¨!¸ ª60ëàR7Ä¬ISì‰ Ê¾˜(Þ‹%-i¨¦¨öí˜Öztï+0zŸžÕÈ­ZÜÃF{`mŸÝ+Ô<‰šºŒ—j‚1¸ú¨°‹M€ÅØócr?TùÆ˜·1áÈ6x$ÅËß‘¯.5ÍÊœ-ß,,Oºöf×ä‘ýä„,ë¢E=¬ÀgRË›±pâ²Š°cbmW=]eíb¼XQ¬Ö\ÖoÛXAXæ…[—q%.Ÿ8ºŠñþ¶äÆ‰Š•}ýè„”ö…^)=)PøQ7©}ø×&ÿ¯Gº£Óã—¢$-ÊôŒ%4ùV€‰ca†I˜FÄkË´*±6+/ƒ/Ë+ƒQˆ91˜%jÈ-žƒš²Ü>§ÆLÕðµºj¡á‹m9YsVüÙŠñ§Å¯.ÈØg¿ŸYiªÂwÍÿÃ8ÍUF¬g©¯b;ÌýýÎ]¼ndx
>$ïQÓáz,}]8gxô¤ßIH@`dÚ"N%ï¥#ƒ_ÕýE±Á•Û%éáJÓ;ÚÞÊ4Œ-ÇÌê ŒŸ¹ù±ØÙ8EÜéëo¢í“n}ýÕ…AÑ›J_²vûÕÛJÿB:,Îõ¿<œÿ+l´P¾Ë‰éXwçôøM‹^XŒ´XÒxV“<RIT±8-£˜7û1§	ÏA=ì–ãg°¢`Â¯q†1ƒdÍð€*(´–fEb.Õ»œ3Y¨qAå^BVÐ 6Xí®G¼Î/@ _zT:²¼NŠ,4qHyZ¡	åWBwË9?„É9/¶*¦‘B/ç')'pCà%°r)o—M-k&xîü¦´Ô*«-Q¥ÔÉRÞÞ[%°Þv_øýÞ}wG3þ$(`€2l.Yÿö‡Óã¯š9S£4^¾nV’VoU~Eç]‚0 ïÒ—_îÝóW:tF¡<b…+&1èã¬ö0ïGõ’öe.ÁV:¹VîÓ¾3òªÊ¶eÀh‚Í‡;(é„íÑwÖ×
½Æ¸­ªÔ]‚¦M$\Í˜&Î\Åi	·FÛÐ,-‹kf#…Üè"/×»¾×"ðtÜa}‰­ÖiìXÊ“A}zÅÙ…Á?¬9½BÕ¾ÛŠ¸Åèï¹ÜbYw2ßH¡™7­Û"XxÙ1Ê2æäçÞéëÿè’W
_¶$]õX¨ªóˆ©‰¸ù–Ž5MµSû ÍÀ6?5'J©=ÙX!À©õ—¡[¸øm¹ÑhÌ!j¬âHºœ«:DWÝØ8u8Ý2É©éx-,'üdn·ªævZfy²UË>­1W?²¸4w‹Ê%qÌ9!ã«2Ùgå§KÕ1jÁºž)øs§ïw‰Ã¼ž+Ã¦Ó¡fü5R†lvõagÃµg|‰\•mŸüÙ°ò!l`œ3ô³®äG]®[0½åì°Š:¾³|bzbÉUòšàÒæ«¯ðÀ„\U²yzü/iül›·?¼ý†þzü=ý¹$ø&˜Ç&@Ô¹®HL¸µVËÀ	ªÌÑ€›%áíÇ¦‡Ð}1IVUS_ŠxsV°÷«pwÇw8_lÕ¡kx½MŸï:{@à­®qixqšw\@2“^ß7	Ûkû;;tË©¢:¬Ä†k5/¼¡G-Ía
K"Rõ+u;×?T·uýk5sô$iÐ®Ž^?€•º¿ç¶¢ïúT„¼à 	÷‹-âÖ%E+úà—·´øÛ§Çß1äåï›ì©)¡+Ñ…ÚÑs÷øâu€È‹“Å±Ôv’u±¨v«„Ï e ìyqÿ-63ú.9	¨zœ.rT<-+²b×YeeVÍiÏÚ4A‡ÎY|†#Šƒãeb“Ÿ¨òï¼MÄ2êfÕˆnçí#ekD&`×v¾\m©jlÒÇYU¨<÷É”h`ç¢5Ñº,Z³çZ7–Ãý¬™Ö³ìE Y—Uªe/è÷vÛo¾w¸É1ê‚ÙòMÈ¯>fõ´¯+&V/œ²dˆ#•%ƒï)H2ø…qŽþºYÓ¡ŽU–œIœq˜¸/”´	…éäG‡*KPÅöŒl¼“ú GsÏòò¦ç†bC_¹§S†L?
¸I4’$öŒvcòeXg_¼ùžžüÂ;=þ©-§“£ÐV‰læ)wFüª)wÆ”;cÜÜŠÝ^˜>Ã¨ÑÆô:ê±O. _Fø µ:“?QžŒ¨#SšŒTär:E3àËE†C6‚žt9ÀËU/])„dñ¢!™Wƒ¾uzü|ü§Ç¯èxÈÜîsÓ½)Ðú8€ÖÅâŸ;Š¬™Ã÷q¨½ ¨¿¿çúët°js€vMÍÙ2ž;—McÊîYÑµš3O¶Ñ»e“>P@vœfÐ§ÝÍ_ø–èšW_Âl=¾Œü©9Úówús´Þï‚²WÛV¿#¿ýÈo=‡Ó•F¸Eã‡?}ÈTf“åÔX©;xX9 8½QÇå÷óqù°v-”?RÚBáóLþ„°
X~8ª"•Áó³¶,!úá(ÓÇd4tq¯t=]åxL;8JöÃQp?F}8‰Ýï[c÷ÃQ¿?·W©þ¶æƒè¤Õùh(8,j³-ÍàÀ—sgÀŸu¬&»“/E¬Úöøb&às5ß)å?+™)æïgŒI¤O¹ˆ´7e¾²¨g¼qâ8¡ ŠÃtg!ŠéµÙfbèn+Ì k.QË±‹Û'°%“þ¿,O+Š„PË•Ö…6ŽÅò`A˜PñË¨,0Ò7Fúc Œ¬~PŠG²¨H‡Kq”dÝ«hg´»5»ä¼`I
¤6_…’Œv{4Cöp•áA²ÖŠƒÜœ).¤”¬‚°ì*†d-Dà8luv³}³“ƒ‹„#t'ÓÍAn˜5ßZM%)Àh³rJë›rašní†÷†[a¹ûGJ?¸½$ÑhóèˆVpcæ# ‘
C1 ±xQY9à¾ó²ð$ôàPB#~B_Äü"°¦¦¶˜QcáÓ{O8ªEñd-—bhžÊ¥cAôdí_TO8
I1Í±¬ X§‘›8c”O¥Å‘>•F
£}òT/€¿,÷©ô§@*Ú†$Ú£Óã?5•®ñô³§ÇŸ‘ÀhP é<ùÆ3éT×Éž¥$d§2Âv²VÏA.ª_“‚ïÔŒ*¿zôNöp¥<Õ
¡xªŒÝ¨°ñF[ÕàÓó‡ÇäcýÀD0s@M™Úç ôµ
¯N@³og(n»¼ |§Híp_#ì' ^¼ˆ /Øæü9ùÝèôõ«Ôø*Ù8SÌÏœÓ
–«U…Ç÷Ž‚¨oÀQóQÎY!¾±+ÆŽ÷Æž©"´· nYëiúj½ç;±\K~öÂœ†Ùæõêÿ  ÿÿì}ÿo#Ç•ç¿RÖM,ê"QGòÌè42Æ’¿f4çŒd¯>cÕjöˆ½"Ù4»éO+à‚ü,‚àl,òCpX¬#X\6Æe/,ba‘4Èÿ¡ûîO¸zUý¥ª»ºêÙ¤¨	ðX$»«ëË«W¯^½÷ùÐ½QƒZ§
‹îå\È”œÚ‚­mvàX„j{ÊXÓHëê·ÝÖX(mà³Ù¢³Mj­-tT½^·VLµ5¦š(Èð7ùféH¸g‡è'Žzvû¡Í´p&£bŠ¥¹XLœ§ˆ5¶"L1<¢˜yú”ªÆÝ(Å.	¬èV)Cö'{jeé½$ý0‚÷ÄÎORŠíÅy{Ëý6vp<\/¾Dq.iÀr \bwÙàpY¢p•ap5T\¦rCÔà±H1žVuÒH£‘Ð˜[›Õ`nÅÛ‘Í|ab=¶x[¸¸Ë¼–D<Ë µ2ö[¹µ¿÷12€4ÃÖ¶@ÖRâj%eŒ„ª…Ø¨bÓ8l½]X4­ñWBDÏ^d¿ÊØ'Ù¦¾šœ,Ü€f‡Ÿ&÷uÂÀMl4‡m"Ø”1kØ¦˜mÛµé©3ôú*¸×¿TÐ&y«x°›˜+ã"7}(šsƒ”ÛP@¶ò?ìP.bä&8Öû¶;ü¦Òß+pÊ{V^+('•cFÐH±dÇßH€NñwJL§»–˜NÃ®–“ÂCÔ¤D<gL'”C…ª–_Êð9L“Kç‡{7æu¦þˆ¶ s°cŠ,u+'DjÈŠ Áëª¨Æq¦6®LˆO|¿;í,J± àtc[^cƒFq@³ÀE©ÂÐ?éÚ0Ò¢ŒxÑE¥ ±b‘]ªoô‡×Fg¤ÏR­'åú¦„ÅW@Ù“ë2ÇØÓ^3†±'ZØs„½9Â¦•!ìI^ú9¸Þ-×ã«ØZOyÏ_´Wáù™8Þê´3.dÊxe@#ãÞ)ÌDiÅ§)}¾…ˆwqk¼nAm¢©¢Ý%•˜cÝ©°î©¬
ÚÅbF+uÑÃßEñ-7~· 8%G`ÌM@®Z¼·‰Á³ÝFP5¦aŒ-OÀs˜ªE(Hµ,ìÕSévÁ©Ev m7©Õzu¸-¡¾ßME»(?Êì—‰­E•­%VB*‘ ³–žcÌQÖäkÚ(kÙ±Ó˜ kêá¾ýk‰VX‹n`-_§Rx5[{5®¢Õýsxµ(>ÃŒw¢ŠÀÕ²€·Rhµòx6°špÄ,)åÛ«&œ£PÕ¢9ªÚ ª‰¶ÐSMÆT‹”˜jÑSyá0ÕH×¢vÒ0gY¥ˆ7	ê$þzD\¶ñÖD»³Gf•…6D"&[²lÍÙFGdã25Çc3½ãfÇuêxl "[T)ŸÊâR>$¶ø=s@¶²'«–OÁ‚Všjd”kù}ÿ¤Ÿªù¥´Ïw[ƒáõåOº$ŽéÇe æ|Æ…Å‹W’h|P¼t;Í!ñFiÆ/¾æx¯'$ž›5“Èx…Îòò¥Î@<ª^ÓÈö·Ñ¯ðœåo¯d=£àx÷Ep<ïÃ›×ã5ÆÊ+¦ÿ%@ååÚ	#æµ01sà¼|Q*†j9"#ï­dSx$FÕs¢uÿ—‡aÀ,ÀF–ðªSÛŠ%9&DŒ—åž•-äÐŽw*˜?T™iY7ä’Ó„´4q£7Æ9à¹2üé,üée(ÔÒ(‡…ècÂŠÆÃt4Ê{g¥ª—åŽÜb‘Õ¥Ò
”ÔÔþ)Cøª{bQ!ËÉ¿øMÏéŒ¿IŸµ„ß„'&¿	mšÃoÞ8ü&ŒÃvS»	Óaà6i5FƒÛD?8Ûp›ªI‰DÂfE['ó…jŠOQ	ŠPüùžò¤Å<ü¹„ÅwÏzAŸ©1ç“0¼ì¶ƒ|†Yþó“Ë¸}÷ÌõÚÆ¥çzB\T{L1üTÅym	‚*ŒÎ¢DúïŒè©¸ã $~ê~}†*[÷GÁNU¹ÞËÐS2•O:NÿÔƒÃB=p*ÓðÓÉÐ.M¥U4µÜ·‚ƒM%p*¥`*t“P*±…Jƒ¥V–ª‚K…q}~y§¾y?NÚ8ø¸ Tú´PjTj\ÊHP©è¼Q¬KÌþü£ÈT	ûŒêr µ€NKŸ‚ÔÑW_Òž&g×—ßË‘Ú°,´ˆ¹
÷/âÎ+¬€,O’0˜«–§K“EN(}Îè40ƒ²ÂVÊªÔýÖ¸«|ËÒÉ¡0XË0Ruh£>èÎÓëËŸ¹ ¨B%×mùà÷üŽ9’þÕ…LÞ?!°?ó ˜"Œ(3N[sÆCù¯¾ºúe¨%Á&FD¢~@§Îéõåï‘¸–im×cpB°O²"Ò!yÉ3tNó&Èjûƒ‚Ê3‰ÎŠ2¸²†"Æ';Ñ×¼« l7#íf©NàÁÉ´ÚE	J™ô°;XÏ°¡¸Rÿy—ÔJ*¢É6+fÀb‚+£l
Ùc1®.ÜZÅhê@¿ƒŠ ü2œF±(—& ÌôˆÞi»û´ÝlåyêCî}Ð'lÊ—©ü	w;pOI§¹Å±Á	],ø{7R?h9Â6ÈÒ¾LŽ{\S *äîJJy?hæµ3ÿüþÞÞ£¥$Ëºx
žŠï¾Ûqü6yHjn}z}þQ	 ÀÏEîòô,^hœ«õÎ°‚’ie¡ªo×½qŠLÀ â «Û ý+é:ùø—Kð–ZÚ2ùæ´½Ùíå/Ö¨ÅzHU‡W[[&›kš» ³ æ.¿yfrŽGÄéR™¡ví:A’¤!‡&	
íÊ~Uv.o/½…?¢¼'î·¼¨^&ß2úÍbt<hÒmÛ£ND»#ùæÑ¾ÓûÔ­óo7?ƒª¯!ÄÎò½>˜By€;A>m¼ÃJ'«Ù€Á±¾¶ÆÒ©MôŸtØœ(Ð
¦¸›cá2ÃÊ…Û5NQu±Ä‰«£‘¦åÀ1šƒ¾Ã>Ü]“ÎVßRPd‘½¡ l—µÉ[#)î‚›Âl¸É›¼&ñßÉ{GØÿ’[V×9G!šÉPCh‰qûXŽŒÄ·7ªíÆƒ¦ƒRÖ ”ü!‰¹P NæCÃ´¼|Þ{ÁëÝ@sžÿÎ©~$?$ëV	í¸tûûk ]f».ý–Ä{pmÓK²È˜ºI??K nx,Mÿêi˜Úùm5ÞÙdÞå­ËcÞ‰@°C>J\Žæ Kn€EHiîfÇ´Ÿ>’ðcîe>€ðW:zQìdCgç©Â§ïk§FÁ'œÆÝàGe§×fÑ^_!‰ÝÀ;ûGŸÊ¾ÏÙN[ŽSbi¢ßH[5>Æ¥jÑHhEhJ\–¶ÿæsã˜ÏžûêSÁ‡e”~sJE?žŒ¸ªäQŒÔ«)nÌGF/µHÈÖë¯@+r­ÐŠ¬QŠ4u(E'r­R†qƒ€B#BN˜£eQ6èÜê&N·IÞa–1yÜ}”nÎ…Wèã¹±Ã1;X[iö©Ó739‘FJ‘C²ùª“|Òm²(jA»§0£_úPãÎ1_P¹ÙmùÈ˜ìqƒË ÛH¹6ˆÛÈÈ$~qõí—7u¼¥£’©g{ò÷‚É<tŽ½þ_ùQk7ètœ°&tDì	ž¨Ð¸——ÍzˆÿPËRíËGâ!B
)‰qd.]÷ûN›¹ºmL¾Ée[r@ž<ˆ`ªÑ6¿ú
i ä’‹4rJÄ«g³úÙ	„Ì³sdwè7Ý¶È) ø‘=ÏÜo“£;ÙGå8Á‰í
ÊÄj-Ñ¹+#xKð(Hˆ88ÄÑËº›KlÃÀ·ÔôZX–Ü=;àÄÃkù|(=
’sØv~ŠÁÝÉÇì‰äx
b#ö ÷ü3¯Y[_ºøAÕ{ª&!ÞTØrHž{MHT}÷‡`R*„q0[TAuN£¸\6`1Ù«÷×ðö„¸3³ËÓBw%îûÝzï(¦AÐÝO<ù‹<õœæÖøî“rOÍ}»5&B*Ý‘Ó†ê…oTóÛ^èúòÝòÿÛ¯äG]ZÌqýãmBËZEl‡ü”=ßuÒj™Ï^ßø·U‡ À_PCŽ¿›4W¹{GQûÐºÏ½/¼îÀcþl¼æÅˆ¯Ô÷’µ2ô:¾èá‰ŠÓªYä`2™ÜÙÆ: Ãïðn·’oœ„+AèÊ¢,Àêi5Ï°cZ•¦¦å ´ô³€n¶Þ$‡~Ç#§Óa+§öDk<\ å¢2ª/<'ª8•mÒ­°iûGŸœøp›Àc!‚&ñ+¦Ø±ÈpTÓÍà3—Éâlu:D„ËdÎ¾g«ÑŽs¤4Ž·µÙ€–ì%; 6p%¨lNZ>UWßC~ªµš¹,…6NÊ)þãàAî,Ýz—Mwô’ mUÄÜÌi7¶¹Yà2½¹ƒ;Íâ×ûñðlÁBUÃ:¤qûÎ©:ÆDy˜ŠP¦ñØ­÷Úƒîq4æ˜¹,7
»¤Ëh]Ï%„‚½pí<Z×½T›-)¬¹`„¨y’(b¼B1_ù29ÇspgÊé9ýÐ{¯Pµ]pWÕûÓRµÕÿR_=Y†nS.ãßÓd‹äöñ´‡ZV^	8+îi<ð
þ6Å8ËbÝžþùwì†ØšH#•*¹{*ÇÌ¦PIÝwèNaR•7¹âc—$­¦‹UgÅi'Ç²¡aÆð˜ÕýÄ”çñù5ßýÛœÊ:'” ’L ‹WÐw®¾	 î; ühº’:ÑnüÀ£ ?„Ðµ£;çR¨ÃY!ðUr~~qdÑÅq¹ú>è\˜È‚ö'ÐÃçYÀb{ã’fì˜†Åê SV@®ªê(¤&œ${à‘‹dÆplòXPôÉ©œ¦J52&TTšì`[	ò ½æ€*ä°„¹Ì1öÍ&V_dÉ±ñ„š²|W£¢Â˜Z!ŠU>h@ìnc¬[´aÌePä/è¥Oyï^zÃ"Înz¬¯8U{àÇùöZóúòÑÝ's«r¹ÊÛ ëÊ’®Òía¸ç…§QÐ‹3ë>ö½—è¼…8]¡ÓÜâ9®ârþ.•ƒ¿Ð®²šu™[H*H$Øb)¯ðf¦k¸¨,ì¢É-ÇÓ”c³ãCÉF$«ˆá¸4L˜ÙÒT‡(~ñ3’ÝxÄè°ñbÃQY¼î\Á2rlb°,ƒÂ/G3czêe†âÀÎ$ÃB$LÃÑ„ÆJ`ECáÅM5ô<ßÕ1Îã$&/%?Žm
™ÿ˜EìÑß9öXrH>ûÉŠ<¹¬ 1Ô¡†RïUžÃm SØ
c„ íÖJ’L­“&ñ¶[+QÏT¡ás¹šˆ\¥Çx:©Ênºµ2UvlúŠ• ^:Æ}4:ñŠï˜9Ù*œz!äìàúò+Qµõãî­-µì °5M.îô¦*ñƒ1_»Ôû¼()ˆmÿ	~[˜•¼“'WÖ!ÿá$¢½Œ,ƒ-,¥Ûpo£Ð‡ˆp¡Qàšr\@/Š ‚AVz¥(pÝ’\4¸pˆìÎ<ª!ß=…ä²Ú…¨nD¸˜ôÍ’»Œ®c5ö¸è¯ÌÂ±JŽÌX ˜šŒ×·¿~»{rç™ŠóLÅÒqDb1¹ H†]Hëh‘¤…ØN8Ñ@	X  Xä–Ó
²à« µ!e(×Ó¬ã
	î6ŠXS¸O¡æÕ3ö*TWŒÒJ·	&½:Ø•1;½`ëTUÈ0o4Ýò5€Š€œá
›Pâé$ÓN‘Á,pG“êyt3âXÆse–Hþ“”ò¨¸aœ$È
ûaüf¢f"—òHÒsç\‚¥¨ÊdTN:Ÿòâ"r®ÄîRV›£yÙæ\¢3.—¦)S8M.æSŽ÷äCBÀ¿ˆvò+×…üÊöIYtÇêæšìCBky z!Cï)8÷ÉÈb…4 ž˜h\9Bzåf>)Ñœ79‘4´›ïôW_^}+ätN¬ã3àb "íô5íýÝ‰ç\*°+FÈÆP÷W™Yk5˜…ÛO°*O­eø9¶–ã‹aÀÏ!­Ö.«ÖjLÑ!¹bjãžÃ•Å¼n¾¶‹ÓiR'"Ð1IBCA
j-!ÂQn…2’Œ¬“ß&Êïëa¯íG5jQ-ÕûøÚWuc©þ·ß­-®.2»k’Îƒ•+>þÖ¶ðP±ƒnª'Ÿ{NtÇ‘G5&Î&;ºæ˜™‰ÆÜ²$’„‡úYÄw?êâ`ËÐD<÷yµ]_u•vÞÌ‘¡®3DQ×¯`y^Í6„s„!á?æ[#€ñð«7nç<ºYãBU3æ©½öÈçx$S¤Ù:&f [Ã&6'-PÊMò©*7äÙÞ'/“xÒ§¦Ï 9®Šän¸¦•à×XIÞpá½á'Ù›½Íb…W'}o >®E
—m{bAâÆªMöfûdÚac¡Q+gLwdÑk<³àv.@IlGW›Q®0~!LEÈÏµ±˜•¿¾úÍ ‚bÿy@4wÚ	2e=ÁQ¸ÓJ#1ï»ªÌôx¨Dæ·¨åcï–…H–f¯ßÖîNòÏÇZbÇÍ8ŸHÎyuYçÖKœ*ó|JRMF9{wÕ¢Þd9k—2‰|¤áe€^žI¸/¦é*À„BÓ÷i_h˜Î^ŒËS–·¨Aû çtj&ÏÛd}®ßëk…m–ù¾Þ(DŽªSÕ%¶Ñj{´¼Cãô1åçùŒ`Sónä,¼9øÝ4ó¥@# šaqÌ&6®›tX7Š£Ê#VrØ9%™ñ±{}ùK €O¡þ·&<#Ú²â‘‹Ù¯­	Y*Q,‹t×ÚÐMkÍq©9åú}¦•é'òCRƒÏILle—–ÉÚ’"ŽF‡¸°ƒ=Ö™`eþH‹ 	«®*œ@×Éäte½g„ÜŸ¶ëoò	¦s‚<$é6Œµ&TÞn[¥°cÞÑäRÀZ•¦Ç,®,â+ßK™	kY;VÅŽ£—0E¢¨“+ÂÃz9Øü…8²‹Yq[iU·É½äW“ßdôFü®6yñd1ñÍx±T›”S<Y™î^ìTlÄwñ¹üFó<{^ýd©Qj ¥O(éµ%rUQ1V¥0-¼ð;#pú§ìõ]Þ½]Ý]x”<ÛByñùÍ‚“>&ík’¨75qñ¹fÅÁàÞÄ3hÓbËM§²Ðº2vdÞÄªˆ&P)t/üÆÌÉ8’Ÿ’0¶= ­·»ÓÜb÷ƒ—ð·25Wä¬Ü¹š6PÀN1US¨c>Àå —38³2ÞóédÊ;™_®¼EZô?~£®0spëna=±@×Ãzâí‰¶ç4K†Ÿã>;iÁ¦ Ã°î3)®Éß?9\Ú^mÝ5ÔEAq£Jhr€Ø.ã¹	!rŒÉ1Ô$ø‘lÓç[Ÿîazä‹«¯¥ÎûA æ-Ï‹€Í†}®	„¹<¨¸` jþDBäåÊ_om³½½¶ËyÞ¿QŸÿV<9àNãgWµEž‹o:‡Ã·{gtòÑ§Ð'3qˆŒr|¿¥$°äŽÉìKáº0nq}›,¦ê¤—ê¡Aæ"“HóÌì<Q)l:ô%^hÓ$“’é¢ƒÏNß“5Ò]ÆkŠq:Å€öÒœÓN©c£WjÚÂ}Â4ÂJá5q©Y•
:'—¹U’+ïA¯»Ð£Jû«/¯/ÿ.Ç×—¿”V’±D^»ÎèW™sr3@efÆè¾ÓuN¨¸i{©žÇè†ÂTâÓ²Oú§öƒ&ÜNÿ§¿/s’±ê¤ŸtOA¼ËÃsøWwœÌ…Y.j¨-­ë>ðùÝÂÝ3ñ¹ } ùKwwß;Ú†‡çñº{3»žÞ/|Ð=óÂï:íGâƒùoLý´ïô&Y»ˆv³Û³¿µuc¹Ž»ƒ~ßëºÃ$÷1ù¬{òÄ‹R3uŸj•ÖÃóÂWºçùyÏ{túÀAª÷n¿ô“Iù[|ýY¬_¾ìK½”?îÀÄ¦µ–FIý½®$ºà=.)¬ô'LÍ„Ûyäœ~gTþŒ¬gIÑ¦;Ì#[xx÷àãd|U¿éJdh¸´ùÿËï,]QÊy°”J]ZÎª<Ò‰ßñ²˜ýl-O‘|cˆßdý×ï<Š\†'}ºi¤ËJ¬ôÉ‹~ÐÓ&é—TK´^7ÝåÆU9V¤SšŽYªuÍ8NfÕ&›šù-vÒÌpæ¤´ópìDe.0`6‹Ç/N×ï€™Õ´Cy€,n¥¥>„¤¤ÆOt}ù/X(®ºÑIÀî*:
k:eóËÛ§À£É¼<ž»q†ƒÆø áHì+8üRh!œ“I-B‹#PÂÍ?“K%_ëžxJ¿ˆÒ-ÏëËvhÉßÓ­“®¾¦¯Y'o’i_}MûÙ‡(,xÿã"è+¿¥%·®þ½“ÚP­eÒbOÝe/ÿ'z³ÏB‘ßv³˜PÁ:bXŒ¤U¨ó~ÃÏ‰N;|ê„ymŽÏžzL'X³ô X¨Ÿóï%Ò€\µ!wºœ­Ü-%3²^¬°Ð%ìS‚Ž™£ùÇ¾G÷:þ_‹¾à%šŒ¬PX:¥Áç‡A{@·l~—Å/ `õ_=m.û {€³-è9®Wîm.ìŒÅÍš¶P¬‡ôæ¸ÕrNýšÍk+BžQ;?AY¦»óÍÜMÈ®H¾¨–ò·IÜÁ¢ú•-î!;o|Kn'ÖºÞK)`5Å#Kj®Å-â’þ‹¼©UÇßm*ÃLj·-œäˆã†…ù ".£¨NÒhÕU«oí²)%$¯ÃÙzZRŒ.Ø~ê{ÊÔ&µ@ß“cBdÇS©§	§ßžúÝÓJ‚er<U,™l±ìž`%FÈ'ëD7j#ìdF$l°ýJ_hB¨û%öÐ= XoCïK½ä2Û€ÁcSc% ÁÕ¯† "wR'­(ê…[««ÍÀë|Qwƒ÷©I®6Wëõú’)õ‹=©‡õÛ#‚âÁž.WR!­UrnL©1XàTÏ&´äÐtáVÎdbq@&¸Lw¨„¯£Q2±b»û°ùVõ`Øu“ÃõNÓáäœù×àiª
ì
¦‘ø’õw&êIj‰m²þL†¢ÓLþv„¥šbprÎôæ ÏN¡±èÈ4¶B÷Ùd°YDWçÔTbô…Ôê#q"N"Õi¼"ïï4Ž‘uHÏéÃZ)šbvaÞÌ>xõ¥“ÛQ}a›m>´‹v<÷^ô½°µûR^¸6 7Gêa‡Ø=q†êœ‡ôF‚#ŽÏöeˆ¹‘oÓ8È¬^>bxNÇA ÇÑ*6‡‡†šÀœb NüŒàÅSJ²m(ÎíWNØsðoµ…V‘Î¯fˆžÑÊ¼ûR¡v~4`~ŒöÕ¿Klšoé?¯~–ÎÕ¿sÉáO˜ÊÝóB·ï÷`5Øùäê÷]²®¿ÿ7—œyt03ü]ámÜIãÒ¿ÙY›XÎhgyš˜ý ÉxÑÎÊ"žžööŒ“yâˆ¡;i*t²òð/¢iÀ¿Ãí‘göÜÞy÷Œ¹æa½Ç€ƒ½&Ÿ´ÚƒŠ±N„3CÊÆù	•É_GäÝ3—nÁ˜$¶¯/îj Y'Ïð ¦Ü¯‰»>KCž[#˜N|à>ôú?M'›JÃÕªƒ´|¯ÝÌûÓÏD	 w4ï†¸	Ñ8[äH<G 6’‘ÐkzùÀË~¬³úo¯äP©H!ëJ°ìîe"sWªø;9&ÓFÂš~ô¨ÛÜ÷èrí~c­ñBSÈbÏ¦C=–pQãûB_K%+—VÌ$M~½V¾ž_}MÂàê›ˆ¼IÞ§2Ö#k÷W Í¯¥xå;K–£†BŽÐêIÌöd¢³7èÑ_h§ÇÃ`
¶Ÿˆü¨¶,
Õd!0\HDC'ê_ý±{òúÊKšõ‘ˆÿB’þ•¥°˜"òxÊLÐïQ©
ÉÃó7L˜Ž¡Œ7’H úm·Yë1z@Å]Âq–YlÎ-‡,Ÿø]RR*†7"
œ0ª‡×õÂ°¶pÈLðº’ýM×­A|I­ŸŸ¾±`¬š6Bì¬ÇMè®Gý¾3¬C,;
9ð¢´}Àî@Wb!rfxC_:ý.ä¶^ýÎµis‡äñ^F`yÊZ#X»!öÿ# åI<J[dsŠÉ¼›,¬„Å…µ´…¬œýâ(}1­ÄÐÍ‹E‹¹÷+ésµ;çIßÄÒ<Ü:‡J‚ß\Šåâ";'^:ÂôšuÃ[‘ÜÔ€]É,ÚßµÆ¼Û<ºHÁr÷Ì9(Û·i—Žm¾ë£6³Ý´vÃ­8ÍÂ-•Ÿc¼ì;½8FÌ9kÓI˜]È´U¼"/8·wƒS{'ÇÁ¦£¸ÏéÃn[pt&ÚmïEäxAoe}µA¸7“UsÈ¾ˆ]w¶ìyÛ{Þ1í×k¢0ø¤Ó—Xaxˆ›zËÌ;°L¥‚ª´^¯aúÄ3Ì6xÃÓluÈó˜ËÆÍtzdÃüPÜLàor.f§5T	<²{ZŸ»dô¢²­Œç¦Ûœ„È4
Åþa‘¢Ü×@*õ:ë§kŸÅð®ÆýÞ•‚Ñ7#Ó™c69?
)¸%•ý»¿+D@¸ „¬ ×‹Yßó}ºL:ŸÑ×Ä/ÚŠZ1)kW;ºsN[|±rç¼sqd^8ÆdöäƒØ÷ONd—&UT’+n¶I±#0ã¾vþz6Þ²yöê'Í§Ô ds>÷ä:§Êº±±Lè¿›ìß·Ø¿÷Ø¿÷?cÊÐÌž'½ü1¡œEox‘Ìª¡€‘t±CHÚ7#p_iÎ-On6.LÓÑë¯ÞNDkAg€ê¸Y­±¾~ƒjã°E-Ž“PÂÞìœð]ÅYo‹eRû›eâsÎMX)—„É_ï9Íˆ©¬5¨d­-.-1ÓYÇtRÓ¹Øá½CèŸ·A¿`&¤€if¸é2É9M¨¬²°X:Zò`.³¹˜Ë´,™Ð‹¦,K£È~2Ê)þØ›:û”ïBRqÇ•faœ1Z8‰;ÄWÅ;°|ÁÏ+/ ¢$FXE:¥|À5(»0¢C>dû´5ò_!@
‡5|»y9,ÐDäÓgådÒ|*IÞ…Q³e¼ßw7áõ½³Ä;o÷=D·Ìûñråîˆ„·ïÄàF’1q]Æ_½ùfþ›²v{8qÓ&Ö’VÀ*Äü±Çv´câf•øÔ‚…u_Å”·f²zvs6o—fSzt¾5rñ÷ †ý0è¯ôŸmùS‡}FÚvMŒûsƒvÐ%.
Dm”§@¢·# &ËbìM5SàB	ÍUÒ¢:æPJÄo’Ç{6ñi’§ˆN¨¹Å#—’^€¨ÇüM<ë€8ÚPèÂmÛÔZ^~ÔSyió'za‹ZŠ§+Ì‹G÷EüÑ½àe×öá¥ôézÚç3½)>^!åÊ´fÝi¬e×,O$ð˜Þ¦YtÈâ¿ª˜<¬åó™3k3çþ-š8»AÓ»M“gÿê[Ríb=0ŸD³6‰bÏØìÏ¢“æió6Í ÷_}ù¤"ã5}>uæS§pá¦ŽßéµY‚„×¿M3èYýP8•¯f*‰]1ŸQ37£J'ÞlÏ®8È§?¯Äüo«iõ ˜ÓëËß“ÚúïR53‹wÃ|NÍÚœºŸ›R1	Å,Ï(—?ý)eK(/SY°m53)nþ|*Í§’æÂM¥c'Øu‚g‡·e2e†Ï«™MiÌçÓÌÍ§µ[7Ÿúô•˜¹D~ÈÃëË¿giää!Å›¬ŠyÒæ*ÎÂôL[SÍÜd½9Ÿ—³6/¬Ý¾]XÌŸþèÌÆ‘wbtú=$¯¾|RÍlÊº`>¥&<¥äùr/™/Ý:¶°sXê‹wâØ™¤f˜ÂF·„ü:ï9'~—I”À!¾Á†2»tÍ{H{xÙ n‡Ó±aÃ”aÅ€BJ5`“¤ÂÎÊ^M¿ŽéÌ¨˜!
¶ 4Ë"àX+T_dy<?º£Èò»n{ÐôÂ‹RŠIÍb†ÕMÎj¶pÁÇ…²,„žôƒA/¯kYŒß’MÍæ7Rä+Î"z®‘"èàª<ŠŽZI'–cwŒ`9¸Æ˜ƒK¯Öë{_@e>­×ëð÷2‹šÃ±Áe9g¬ü?I~åiµôß7XµMH«ú^T¤\H°/¾¾ø²Ø`€Çø©gD(]«oÆàÚIŠg<Þ‚¨Î›Â†d$1	3Y/Šƒ.À3,Äû#YâÓã%÷±HÉ}±ƒ¿ÕÒ­´a÷µ,g
ŒÖÄ.ŽœãAÛé¯tpaçñÞ9*\Ç6¸¶¶|É²¶ÞÕ‰åº:+¦`ä%£›ˆ\Û–vU:ê1ýGø+Dø¶éŽ‰6ŽQü–7S*Ym°4R>dÓ-Y›òqŸó#Ç™sÙp|‰ôb”áKð‰ê]ÚöuÍÐcKKo×“8øe…3=5)ÊÀB´n×q´4:!£÷÷žì™ú„÷riŸ¬ÄyMÐ1vEÃ®+ŽA×$ø2þ/|Îr Ö- PIBék±0§ÙPaB6jaôål3 *ø”²J8TÈXA”çqÎ»Q½s>Z´GéÏ TŽ| )ÖŽ—	ÝHô½0há}˜­k5aY–—¼¥²BÒgcñ®%b¿,ê‹#[6õc~âu€~žfDÂL·u}ùß…F÷$ETÀ÷~¦Â÷QèõCyûÝ`æÂ<ÓÓVè°‰OæÿýÓW¿–'NŠ¿’4ÍÚ¼ÀHÃe¤KÀNÎBZR¶ÛúóïÒ¿úƒ™ë/~éôu`…–®É-·†„ƒß¥1•«Ö†²?1YÊ1Ç†éå%OàÄyqÚm¿úáˆÊ®"iÚžöÚÎð9ìG©:`AÓßZÔùâP„“2cð±GYÂ ‹ä»Ìn™±~$)šæÂÎ_ÑûÒóNŸ ìÂrÆÝ¤MÍ}…y«SEñ,A¤I;ŒóÄïU‚§ë´½·áÕWS¯±¸ÐTÙ}v8Õ!ñ5õÇ#­ï{˜[[_ºøAåõUVÓò]hnO-Õk†Îï=Žq\OÔ5°¤¬L}¿ zÓÇ[(ò‡ž–ë.é_¼, Ä‹ƒøÔRÕJn­Ü£Vé½üŠ  LQ[èMùBÚ²²{†™ªÂV~d{´}}ù3j†×—ß‘¨åÖá/&ezÆM•X*üŸ\çµ˜¿æ"£Úåd$ºK8R6¡öb=–`,Ú–ÂB`ÛA^ç¯RÑ~·éG|kP;¶’ÜTv_}é3LN—nœþ¾+ØÛÔÑFzépC½UHï(òkÑQsQG‹:x‘D=†|©@Ô÷¼¶—À(³°‚ËaÑg4ÄÅý°ï„­Ù—÷Éí=°Áp™Á¹Œâq)ù(ÓÉŠ¯µl;íºW}x¾Þ¸gÑÝ†Æ$ÛÒ	(§9tˆÞX¤‰ø$†üP‰EÄZÉS$o½ÖÕ93~qcŽq#ã#2JD;è;ñÛànG†˜Ø'Æ¼Ë—Nÿ¸^­æ¸î2¬cÅÓOä‡¤Ÿ“Øˆ+YZ¦ÿ™„[|u2ÒËÅÐV‘$ºÅ¶Ïy”‹Øq ‹\ÉUñ‹ tÈŸ_ïAT
.%¸ÄR³FÁ‹ƒÃa*˜²âËJb³f¬ýh¢SÞºPïM3ïLìŠ-Èìè-ç!ÝÅPârNëšn’‰¨à³áÀ*÷ZYœ}fR­òÍPC…³¦1ZÏçok'r¤Æ>Ï;Ò&ßÂd7.lµßË•¥qÖ«è‹%=qIü.#ÞaÙÏ@Ÿ÷!ï„ˆàwð;öIrT¬âÐKK¶ÎüN–…b,c/ZÙ äú<k_Ÿ˜m9hA¼ùF÷ ;Ê±äh_x¤öO7§VÜåÏà@ó+ŸîUÒX#Í«ÿÍ7S[N§m§„’Ž#¢-œÅîOÁHMæŠLà¢!í5•”qðdƒÁvëœûpé;i	œ•eß‰ZõŽsV[_&=²BÖM°±ÆìÝ–÷E?è>õ^ä,8­AJ`Áå+êÃ™ñÿÐQV`·—¯ßpë6Û	|%“†ÿHçàøÂÐcÈÆã?ÖÐ¤’ðœ­•*QhsQ{ìqØ¶e?	]2Wå°R|ÔåCá5É#×õz‘Óu=F]Z¶^”›f\N‹DÒMì”ôŽWîZ´$¤.úX…Š4zÊZXêŽak‘‹>à=÷ œnÛéû¨íõoœ
µüÒ—Œæ{3OÆ%æáÊÞV`Rü¥>o"ªkº-²Ûb¿#ûOI·õçßÑé»PÜ«ßç¨c?¡a
¡(eqÑ	©@¦ádüãý<ÙÝµW"5GÀŽ)„‚b`œéL{kÂlºe³-ÛïÁ×/ýÕ„ÉÆ¤\Lqf[%Ç [j„ñn¹Ç²þÝËÈ°Rª^NÐG‘%­c"!›O—nx¯/
OHòsmER>.—ÅBM÷¯.aOuÉmºº¶Ÿ*c6FXQî¡ÐãÕt{ëŠ&¸çˆ÷âÏ4>'VÞg¡ÎP2+%¾|ÖŠ«ž89 `vZ=¯ÞŠœÁ\x^}ùD3Úú|Ú„b¥Èõé¢+Z	Šý™>’dš(ö™°mb`ìèòi»G¸€Ã·OWãqPì76åTÒ$ïàð°’\Õ´{!2]E"ìúFš	»ÀðwÉjlTSþ¡ø¡´’š¯EÇÐ•”»¶¦P
W%ï»«ÊE^ØÙýZVâ’ù¤y;Nz¡dÇA†{%/k”ôæ.8Á[ä5VÉaHeldnF­Õ–dZ×À¸_&~óÌŠ>Š.ƒíÇÍ3òÔiÙlG®¶­¦{bZ*ìŒ'™*ÕÏeKÃÉÎzyÆs¦ößRPþBât5á…â©°:5)Uì´&xgwÜõÓšœ`icê¤Ì¤L´¤LQ‹ÈŽâÓøÆXÆÆK¯zÜ´Žašh’ªUlËh•[“Ojµ
®±ëÇ­1kmª¬2µo£$U–õs–‹U?òcÓî¼þ1jM.î½\.nI"®2	Ü;~6×Ôš  Ÿ®»i—}“õx’a'¢Æ_Õ¤!±ª·›%S’æÉ¤ìŽÑK•·Û	á_Ìo%sâ-˜8ZwøÎ“ÕÞ.›!á[dýÌòÁð"h‘U5™4MO+ø¶ðÈ9Twý©;äBè¤6ønFSÏÔ¶[‘8JHÆ™z„ÉXSK—”™óÉ³CH$IŒtêÞgŸ²\qþ¹‘åŽãbòÅÓo'ó³ƒ˜cÓÆœgL52øAnûÙØ(nS}ÛÎªbƒáƒŸÛ¤!À…8ë\}xœ•ñùóÑ‚†º‹´#f<‚%%#‡g¥‚'‰þuºð^Z,­	˜°Þ*bm3_È†>ÞïëÎÞ8‹ñ¶›%ñ¶±+foË[ÁlK‹¦¤á·Ò$ÍÍÉÚh‡µÓÑ-1!äu¯x+éÈ¦“bÚÍŠé”‹œUƒi¤Ê¯’ U!‰ŸBê¢U±ËKÃhƒØÇ½ö@1#¼!ÚÐÖlÿgc}ÄÁ­²Ïÿ‚¬’séz~»†ê™UÚ3Æ¥Þèf«&:
i‰ƒDBJÁmü½p|‘?16¾5šÌã âdUÁ‘IåŒ-‹ÉÊœDÄ,6fv.2 2¨™¾ýäDt‹•,Lè-F˜ª¿E_Ãäô7”6Ý">WûÒmÖPÅkØ*¦/(ü«ì¾Ó…[-„EU¹¤nåÐéÒ Š3<ÁÔ6æ>ÃãŽ~[Ì–ÕmeJ¢mß*YÊ"ŠL ‹FQ–D§³0K”¥®Ø›¸Œ˜<ºõG–ì×¦;$ŒüšâÜa‰ø­àúûsÉ™×!Í\HfšV˜DNº-¿ÂH•A`¶P8VÁ“ÈðÉ² Êµôôõ¤O‡š£ÃrQá_4Ä°Iþ•	A!É¦¦N}ÔÐ,´ƒ|@§ZH`1òQ«êÌ³$l‡å€£‡Ü<è"&pbÔY©¸”>wÒáßóvp4µ¨?0p×=”U¤ñ¬uýýw=wVG³Dh«û—!.Ôe>J‚_XH	×ïÚ§«Å¨#àÊ¬Â„ð ºÑ!?¦h)±Wrº†Á\}ËP~Þ%µ’
]èf·Sôš^H§°ù_LEü,EŠ‹Ó£vÛR¢˜ÅW¥i²“Tâ±åË¥–Ë$E‘n7½hÿÌeÀ²`BmøOÜd
`r,LfÎB¶u‚ÛÊ:‰Ãþcn‰¾G™6X#žÓC3+Žn-‚ö€ZÜmïEôOAoe}µAVX|(«æ}‘ìîäÃosšåžwL{Äõš1l5½6ŠVÐ¦ôpá#ûxAš–´Ì2––SDh	DåõzÝfªöÚ,i!·ãÈígàPÆ4‰ù–ŒïÃ`âòNFdÍÆd5ÔÜxdó¬¶Ç§”¢‹†YñÊ}Ã°‘yæ1y›¨¾®‡½¶ÕW—>]ûŒl_‚é-A÷cxOÊþCßj­í²3”ø(_Qº,ñ³–Z×{Iö¨è×––É"`´®ìï/"Èrøk>]&ÏèKâ×	-5— 
‰P·ÚÑsÚÚ‹•;ç‹#sðÀ˜ëtº0œœÈ÷4G1ŸÔ¡m˜äþz6Ö²¦xöê'”ËIj ²¹Z‘xSuÜØX&ôßMöï[ìß{ìßûŸ±|‚!È%*ŽŸ¿ü1™<’x‘Ì¦a=
R¤šúCÒ.¸bbt&å¡ZžÜl\z&¯/Ö_3}1œ€¶‚® •q³Ú"N_ºuÁC1g@a<ê÷aýE?èÔÎ	·ß·Èzƒ\,“Úß,ŸIeÍg>|aÒ×{Nó rúQ­Aåjmqi‰é–ÎÈº¥“ê–ÎÅN¨Ú™}½‚è@õ¥)¼™½^’¶«Î`/šbÚ®@L‰ÈÚ57w]Aå£JÎÍ¢>Ô.}\ÈTibâÝ$m×žBÓ†>s$êÌÊi3”™
’ä
xóMùóŽÉ1\#3iŽË¢)pVÆ«ñ€~s¡&®?¥5q¦¢Ÿâ¹:q½‹¢ÁDà$W›˜®àMžD¦zš¶¼®"jž@^¹ê=ÏTþƒ	¼Xr.T²ÏÓ0äŠóô%8Éâ«w+}+¾ÉphæÏá8µºTøûÊE@9ì)ï{¥ï5Ñ·œ€D·Ÿ|WÖÄ‰ÜÊt5´ÝÉR–r?»3AÚ])e·a÷ˆtÝ•[»C,l:Û4Ýã“t+Ö÷"A·kIÐ==·¦¥ÔÜv¦ž˜IËbn°¡®NaštÜ“&ãvsÛn9·þVKzëÉSq»ÕPq£ÑªÅ‘I¸×sÈ¹¶+Ò"»#“kGt¼©I ‡µZ¦7­°n•Íì*éGo+ù¨zÔµ¤µÔ7F;êŽL;zSúÃ6^E†éÖ+ã­Ô²¥ëœFÏ=™³ 5{vn‘²cƒqàb@’2ªñrU ’˜RÁM>Æ(z@”äæudÖhr=¥¶Ä–Ôåu7èRåBmIø-dÔ7«Ò,;PøßW¶hKÅz…t‡öÜûÂë¼4¡Ø¢½%šù^}3§O
dBbaSnQB~ÈÓ·Ø8Öjú®\KKûØ¬Å¸¥“Bd‚h;±Ö!ÁÁ$·?²¼n¾¶'úCŒQnýäæGnÕL÷èë™Æ—¦R'b«zb8^_þdê=$wÎÕM|›(¿TëtÇEÑ«-Õÿ6ð»µÅÕÅ¥ø$ùÕW×ßÿ©«|CÜW¹òãoQ¥ã|Â VÐÀ°í»µºÅ¶®qÛW^ø,Ì\2¨5zSÊ¾j¿$®ìÒÊµbÓfT{'b8²(¶‡#àÛ‰œØ®Ä‰="vu^k&ìÊy°­9TGæO‰;ÕŠ7U4—R§lf4áYIKI‚÷EÅ“6j®Å¯)²-»pp}ùCÞ„[þÉŸa0—ôaëê7ÝMØZX±‡Ì:>Ñª-Éêë$²éØ]FÇîéØç{Ìêût<"va«Œ„ÝVÚ*g¥“zFêù¨­„¸6j5P°#žeÙÅl!¯6vn…Ò¶Â†Ì™„ÉÌ’z·tCÀo7Ë‘Ø¼ÞtÐ»¹˜/Ì`O“pxD±²†gRäÆEÉFME%»`s\ÂIp%rÌ,øpíT‰=kwÑ¹ŒóbU0<w-‰bñ3Íë&°µ8ÈkAÿÊÿ®i÷ceA|'’6QàsØ	‚&ã0*ìnüüœÿuæ‡ºÜZØæäcp¿Êb0g~UÞ4yd)î¿
É›äQ×i#ßµ˜êóç¥“|#ª<?c„žBAIép¨iþ2Wãzi›üo¹dlÓ¥~·åô£»¥l¯ÌÚKØ3_â›äÃ QGWßAî~k0¼úàRÿj0Ž|j‘«
¨U‡,ÿê>'òL<›ÌñD·X¿–9Úi•%è)`ù6@ºŠA­¢ëïÿ„Dµ2#;˜pÊ0ÍøLùÏôÝªŒ›„kÄ¼ß÷›Ì*{Ç‹`p?öCÿØoûÑ/ÈAähLµ¼¨œ@Yð„4„t¿Ôineï’ö‰ðqƒœµ…÷˜XÝ%ag+Á—È õ`BÌž,ÆÒd™”cM7”R/Ã+KTÓí@¶Ÿ:Ç^qCSÈ3ÇNÁ+ŒJH•YeÚ&:èw~"-• 8¢Ë7¯ {&>ßíUÖ>Mû9h¬­rç˜9×9Î¶ä3~J›¶œKY¦ísô³±Ë.LãLCÌíûNOLÕ<RºÞêó/sž]´Cw<i-y¥µù(S&­½A¿×N¡VZï$JéwA¡•ÄJÃäçKR2íË„ñ(œŠPeÿ3Ü:èúŸXB@éM?hÓØˆÚÅ“šc¯¿¥Óý±+3ŽKB™œØ&R¹OûwÉ*ùøêÝ“J4ésï„Z\(±z”?£Ûl”	¤ùÉ>»#0þ€¢kDø	ÑSg¨SlP9‘ §Áõ÷ßPãòê·ÝV%òs8ìyvÒOŒ";¦ç +SLðašRs[¤E}¾œ‰Û%Òp?cI	[ê¤Ñÿk*9¥cÌ~5,¦%X'E8i£ËþN©ÎÏB4ÂI9ºÉ.Çuìš1‘°ð&ÿ  ÿÿì}{oÇµçW©åuÂaÂ×ð%Š ©¥HYô°"R¶Á°zfš3ÍtO¦{D2l°\ÀFn°×v¯¯áÍÃpîõ½¸ˆˆ PÐ÷à7Ù:U]ÝÕÝÕ]§z†ÔHšlqfº«ª«N:uêw~'®ÅÜ14$41"B*vG¢‰Jt$%oü¼Ý¶Ú¶Û°z¹—AÄÄÔ2|Î±h•ôAå“Ê;ªŸO¦ž1Cê¦üNÏëÒéæÞ³Ý~áûÈ7fgóqÝ­Ô˜óð}îîõ+ÇÂó»Fâð—“©i2Á‰\,j>¾IÁFý‰)\8Dq†Ú€oÕ€p À5"Š`MZÓYòJ«ÒÒž„2åÇó%‰¼Nž5]5O^|ÓØª¥¦@hX!`·ëÚ}¥C'Çñè”u‚# Ûèt­B´Ð¢¨ðnÌ,¯Ä Ù-JÖBúŒ€ýA›E Úgÿ€Ð³ÖÌãÅyDèY¢U7!º^+[(’+,õZ‡l`±°kGta§%Æ6 ø"bÖ¶Ù¦¼K'1üR‘+Ä–Ï‚ïø½@¨/$kÄáøÛ<Ð=jg(âQô}\	¢]è´xi	‰`iE<K±êÞˆa zY<O»=bˆH€*(ì·k$2äx×U Ô_îËii >ìúDÇ‡±ù,Xÿ‹Ì—F 	!S³Ží{õ¾¿3^„_$N´õ~Ï÷z3]Ïa«w÷ˆç¿B<!·|Œm:0¨3‘`ŸB »*B!¶„ä´{š@Ziˆ/*\=oºéŸ8kl²r­^OµUo%cì¯7ÞV¦¡wð¨)A°§»çÏ¿ë’ÃóçÏG)–ÛðîÒÿ®e¶¼•gkd’§‘š$¿ “V=è[mög8NŠ“þ‡R9•gÅÆé(í¥>eìâµI.d–L¼ä¡–îQÚ‡ô|Œ§•8vÅï~åñ–©Á(,•‰ÍvèëŸŸ~†-oØ[ï‚Ÿ”¿Á‘0;§'»´pÀèazõiÐ"â8fY(B¢US9Ÿ¶Ò·$´††&´8¸¾ÓX‹’hÑ¿„üð¹S3ÌTihp«u´<×ÓpÃ\ý<±y0„}óâ{03¨
©&Ï|"Ë¤þ”l8pÂâž%ã®ãJÕÈ7nU¦5µ6«L¨âpÆÂAÛDvŒ˜ý _u%ª¼Ý$+°fû­tƒ‹òGkÑnTõcŒEPýšÀp¼IÄécù—/ž`Ú»	ØÁÀïÇ¦Fíõî´úä }~?{ß©;áz„ÞQF7ü†u¯ÓµzŽ?£(…C¦ƒ=R‰ÖiÉ®P¯Û´ô¿Þà(Ìüß•‰3•´$oL®¾"¹¦x^sŒ›‘Z!¢AêJxÞÇ‹Œ?‡v<»,·]>®K\…î]DXêZ3—8‰ž°GûÂä[Ê¯ý€®qt.,ÌgúNUÊE{†s:ä¯<®¬ÎK	¢HMdÀ"ÞOPÒÌŠžo-f]0éMðUµ‘%¿ü‹%\ï|öGÆÖú\kÙ”®Êê+-Ž«ÜSý~ß!í02„µäìÛ€¸-–¬s~úy šv~ú/¤F¿ mz[Y‚}+ÀÑ‚¡ø	d]ý.`d/ßôc«1umÒßY<I+/vv}Nëýf¯‰ZÔm8b’b…$nîø7èæùrd^Æa8s´¹¯D{n:Á=»×T&È“—ÓeéVnM4B†’/í6&º5;ãäD™ÊY'­ó:nl?Ll&üL|ñ~¥kdRr[LR‘ÎÞ+Oô^±yƒ'ãÝÛ¤ðÃB,æ7–r•;@Êx‰šµØ9‹‹H¬MÜ]˜Àq²å¦t®rök´w>Ù Ò¨t¦‰Ó8œÂæ•‘[$òÊh;:+-¨Ô1:|{Â,2äsSØŒ_`AªŸ¹Wˆ'Ì1K¥Òd¿mÃ¡Ë¡’ÌüDìc…uÓÉ‰	9kHÁ©…Z£­ÈM:.IŸ›’h™caLÊDÝ¦3öÃ»¦ê2Óo¨´:¬ˆ‡¶ßõ\ŸÚþ°w°Ø\FÐÚ˜ 2÷ƒ	Ò²Á
?áV.Zw*ÂÖb-Å.‚}»C¿<¡ÆM¯é¸ k×]#ÕùiÂ‚Â×È"ýòs®‘úWÍ¯³FVæ©À!—ªmZ‹í;–Ëb[ü ç=µw,:}àl~cb‘,N`têV{ãxßjûöIxÛÆÄ?ìW÷—÷¯¢™7Ö?Ü:t|,Ý	ôÈª,&\:bh’‹Ö ½5ùä?*ûÍ¾ÓnÓUèV–®,­Ö&§Ù,Ýu~nóƒOØ|Ô€ò];º}½&çdÙy7Žg––±O€Ùrë-¯·1a»,?L(ðÇ+È¦aåä§LN2C™£tç_]²k«…¿Â;žäÄr´wiyìOV-ZU¯³)ºçyíÀé¢9|êÜí°q\9&Ü‘0MºÖQÛ³t.3CöÄ0ùOÀßCXœôghô˜eD0‚„ÈW_c©”\È©I$²3òk*×N~p\²o5Ø¿?÷¼üÛè÷q’iD×ä<s­S{¤Ó›ÔÊz
Šë§VGÂæ 2Ö{©(×Î×¥j[’iYÅ¡Ê1“Øä~7ÕÃBz,g¯ˆÝ%¯c1C˜YKWWË=¢¶íqƒ¸©…›i(³vµ[vÛ\X3Æ¾ E5ÌLo%Œu±ÜeP¥rº1Zƒ¹è¸0¶—»³`nj4§WNÔ‹ß-:UøèèÌäKÚ6K[?ªtgŸ™c”†÷"XøÛÀ••xÈ s>w\áúéÒ9€®b˜9w†¶ugûšBŒ'¿xV+`¸
<=IŠ|‰}‚Y}.ƒí=n{Ž³|óR>`ûÆãE“'^ :”jÍ¥éÐäÍ6eZ®€îÅg0÷÷÷'±Æ/nTîD¯¤ŠŸ7,ŽpÔLÛ	Íµã*ÕÃ¥Š¸n³M1}gFHƒ/9upk}.ÚÂcü
ÂÅø7RôÕ4½DÈT_j:°e”!›®6máË©õ"_éÃ5…íZ¯I-ùêÄæ½óÓ¯ët3xöÇ¾tL…4fs¬¦è ¤³Å~tß¦;Í†Õ;bÎqÆO;‰ö9ÀñP™<”¥}J€AE¦eõ¤%øn‹ÒK'%¹Yò¿SÜoñ&+J¹Ã7¯iè+óó¬k“7©‹,’.+E:A‹–!ÇíeQ:§MY8j²(õÛˆÊ¢8v{MQÀÓGW# ýˆ‰¢Üs#*‹ñ©ïÅH#v;‰¾ï57˜¶ÏŸÝeH…Ï_?ƒ)†Œ²@&àÜà‚ ç‘Ò7²-­ðV¾Z¡ïA£˜§%sõ%êˆ3>’Vn—† õÑ—KÑÐM¹GU:µdƒ©k4$”‡Œ¾€†íQù”zQJz•'¡RËËÒ(vãõ5µtðï«Zr)…Q³—È€w‘ý½g·­C[¹*]?å/yñpšì¹,K^þ$“ïNÇyN$²]òììR‹8…%F^ž”§2Vr9¤ËÐæU|KáïEÓÃ®-î,æØŽîSÄ˜dbé º¤ ¦„U¸hÀH(ŒÈ¡2.n}Ûët=ŸQwÄ¸¸\4Ü‚
·$¡áVqh¸ËCÂáQpæ¸2è·2È7ê	r3¸	pÛÔÝ%€mÔ¶Š« 	$«Ð1€oq&Ÿº×  ÚTjD0Ümú+
wn4³r~ñP7À@&§Ï„)u×8¤=@b¦ÁO±Óàn¼ÝØ˜€ÉÁW5ªóµ««Õä,X@Î‚@â+êmžÜñ„×£fmÀÏsñO½ªAZ­-×÷WFsˆÒ)º¾MmT¯#¾ŸÛ<	‰ä×Ú_Ý·öë“H Õú]»	9‡ï,Ö¼­¶Ó¤ãK]ÜJÄoçâ€Zèûî1HÝéÕÛ¸õî gÁlWàËºVêëáÚ?¹H- ÄPOV¢o$x‰ÇFõ+(“Ôi(ÙKdŒì‡óÃÅLHÇ¨§";hÞ¶–í«Ï„@˜ÔüËXeËd×‚eq:š2¼­“È¹aùÜ£„´jHHMì«€a1° ÜÀF þe Å)’ Í¯Ä?i­Ç;$©»Y7$Â®8›D=‚@e–/Û¨'zt¿Þ÷7Ž¯LŠn3æ?BIOÍêÚ8^ÄJúXÚ’—¹jÅ¯=ƒèVAi…—ÑøÌÒL·rËÅ\·.¢$N.”Œ¥$¨©23èÁ±ªU]Zá_ŸKøDt^0C!Þ÷5˜÷KE¸¤q€EG7¥}`ËóoŒ,ìŒüÀP­+¬:?ö…_¯ÚÖ8Ú8®Î»ÍPÝ…¢Þ*å8Ã<#<gU}~Ð·ÕE4ÊÞ‡±‹HøR–¯ÚóµÑ¤±‹hì"Ê»Æ.¢±‹ˆï[œ†´k	SVÄ/c‘©‡È`ç=¸‡hai,l™kì Ê¿â³[.ÕA™Jo©ƒh$dÿÍð)«5î!œ#¤ î	úb çÐÂØ7T|]”o«,™ohŒ½‘ž‘{Ö®/­^½:š{ö±c%¤ÅÚêÂ¨z¿ÆŽ•±c%ï;VÆŽåðCfuÑ7øVøÂ=Fß°k”åí­w¯pëåRÝ+‘Áô–ºWFEüG×ÃbæcÉIš•Èr´Zàq‰ŸÇz] mb”K ==¯íç&OÛ>ä…ðŸL­±:¯uð,ÌÏÏ­D>ÇuµÑ¡8ÚÕE½GMeZ>I·Z`Wº­³ï;k8Påugæg—ãÎ„nZž—òa˜ôñÁè—ÁÝaz>t®u ¹”ÞMtm§!gø¶Úh>îÔŒ3…%³†Gä¸épòed89&hOÁª…lã"Éˆ\ãbd)E 1*â„æÌxE"5vŒ‹(6Œ‹¨$ãÅ¨ÈžÞ+P(Îý-ÈÜÝ†Gký¶»ï¥“1ÖvøÜõÈ…¦JA¾>Î…‘JÊüCÈ¶÷$<þ7´¬#öÃo–1Q´À½ ¬âž}q„±dô¹šµ»`Æîö;:‡É·É¶Õk˜±N^¿#qò.vSú¸„Ká8‰O.e)ò‡.à%aYE€}f¿Mol9XÕ¨béÖÑýˆ×îÓÖµ"ùqää=[$Ý|8ÁdÉdeÏpÂ¿nµiC«ó²va‚ÿcjîõlÜÒºI¡¯B‚ú¿d_ÌNCVbÄ“K%$²lìqZ—ú‹O\ÎÁRc	¢µÜ*š£F+jƒCK¿§x%Ø9åg	Ü6.xt0JXZ/¢cìÙžÝè×íJÅª×§ÁÁ3rÐOäÇ¤Ÿg}*!>°ÌOMÓÿô.Í_qÊ…T.‰% d„áAî«P2”<ºG_ ¢$TªöÕ~DByi3ê ®t¿r©z=þ‡NÌ(l?ŸT$=zËÓóÓï‡¶äõÚ@zíjcÙAN“ˆÄFT­ÉÉÒCÎ)IŒbSäÎê"™J-ÖF½ŽEå§g[OÁLEtu:“J95º©cE¥ÕT%¼ZGÈý«¯œ¤@ƒ¬©,Ã-Ëh»Ø\cÍ–ÃÒ0«Û´ÕÈ¨¨‘×Ã4’hî'Ûs:v¼ã<°í§l¿	KÛ7ÊËïÎOGóì[·5Åv—“˜Df8Ýí__¹âáøƒW¡wÄF2V:ˆ—”nÄ?sEÞõàå_H¼=OªEÆºCÑºW¡;®[=&ˆ‹êÃ‚,z#¬?¶=?˜Û¥=A*{×§†6ý£×hþW*è³SN$xt°Ë6Dd(Û)Ì«T7tgéªëð°QÍ!ïôÚ›džªù”â¼g­Y6w+q+ç¤Ç¦¦@ýÏS}3©¯ödªry:”’©ÝŽˆ^{}ªLkg¦ÖØ©2Â%8-…~Õ8Ô˜pø„ÉÍ\iâ¬ºªs]@5;ŽôœZ4yàØ¼^MÙ:¥ð€Õh%x¼¸ ceºÈ'Ø|ÕXû³²ªÑ	>&wèú]–kxx§Ìâ€¹Fp™iØöH+o£ÇÚPÊ÷$Î	xÃVRîå2¼Ê	W4lZ>áív¡­ÿ
6ÈKà@þYß¢k4ýá;+´:%#¥ÞânêÐ?­v"©·c"ŸpœZXÜÇò}ÔÏ¾'O©ñð^ýLŒ¼¹¨.ªt“ÊCQÜÃëh½ü>«jÒó=ãÜjÅ.ñ…8/.%ˆä3¤›­3,Éecš8).óRõv%÷Tv–S³¨lr–‰Íã@™d^VT^`“$²8‰ì ÕdåM½&²¶âQ™í€Í6’®w•¬tDVÈtÛ?®ñÛÁä ã£JmSÎÔlà½ëPíQ©Nü û²èT8Ø4µ˜4”Ã"PWÆÈ-,É1rtá:ßaV™áF¾±"éP"ómŠÛ‘ƒÇé22ƒM¨À bCˆò
:©GwmÑc8Îi¸Âh‹-Îê³Š},‚Í2¡Ç¥ÙÅÎÂ<eL-›$U§jÔ0ï0Yß¶©Ð1Íü¤Nÿœyç˜sòä„ãÇYá<‰¸A
ql:êõ9ú&HAK!ÛÅUŽC´î4	3ÒÓ}8€gy Í¥ÄÎ¶m·´¦ŠLìíûº¬>%¡B¥Û9I¥š¤ÖæuîÄê©TÂ–?žÿ(Öé¼-yšÚ¤¾p÷ˆ—F¸
vÉLn¡éŸ/¥DÇqg@™rŠ:žØØžq\²o5Ø¿?÷¼üÛ³%ØÒ`MT78>Ò“°+Ù…µò¶M~í´CHÜ_aOÁ¢2ÎkÔ
i²ßXFë5"I€c6×‘±v™æäzÔî¢¤a’ÙñKÍ35Ç¢&•ÊrŸ·.3DÙ>i7Ñûi1=elÅÂF%*2¥¤”qJ:¹àô<ú]º;ž]&Ý#†]Ž1k›‘Ýª“ˆ$:lx9ãiüˆšÃç¼
Õ¡Kg$¶xdòwÔDeKí%$RGÜ¢õ(q_ãM›ÖJ3–nàýîÕ»–@›¯”ò ©c…c ¥t)”p"0ôÛàÒô:ø´¾ˆ'É?;;d÷HrÎ}˜Ù‚vŠiBÔ~&ÚóºÜUõâ³—´ÁÏÎOvýÈÉÀ‚³û¯œ§§Óò} ¼œ	óaˆ…<Bú„p]°ÉÞ&L"ÅnÂJ6EÏ²”Ü#R¨8yÆjÅ®6ß‘ 	£‰„´"Ç¼ÀAûoGòE¿†Ý§–Cðç.]f/ŠÓ¦¡÷á…úµ–dfðWäÊR9±ØØ´P’9Uc2§jDæT•Èœp\N¼—ÅçÄjCs:ÁeÎëWr¸ÊÜˆçd6˜«KÖbm5Åÿd=¹‚d=áWH
><S›J¢LWeú ÄË­ð—+àëA·2ÉÉSÄ»öÄ1O;6¥m»!“÷‘X£Ã‹à¼X°W÷çÍ8/–¦ Ÿ(Ž~t‚þSë£„‡µ‹R4ÂeÓÙ Ê‚.Ó…—KÉ/ànL¤wõJõŠa¾¤±ôæ=<–ÞÄ…¦™y=8cr‹‹3&ÊBú–rÆŒ'`þ…ôÄÝð^­;ö¾çÎŒ]²˜2ß@—,G­a³Ew_®{6tÓ(\³;¬E,–¥~þü—ôÎ¾ ¾MnŸ?ÿœ-!Þ(èpÑ%O[–sážÙŒû
5»dµµŽ}Šo„OqqùÕûETNèNt=¶2ŽÝˆc7â[ëF{ôÁ¼Ž‰Æ[@õõöyÇÒûVI/˜oÂzå¾íw0¤Y·ídÏªw£lŒ$éðÿn/Éj#Õµ,ÌMëDZ´„…»H **yGÒ!ïÂ×D²€ nô¼.°ôô©•Â:oÙxdäÐ­§üq%sQÐVmNÄØaKlî¡	_`Ï	hŸãpóÛ	´×U4L;—ÆØ —Ëñë:'ñƒÐÀah2	b¦ô¼à|’¢—» jQ¥üy2 Ž½ÌßÀeT†g¦Âp„Ñ'Rg 5}‘¡mkã¹‚šV‚=<Yf¦D3þpÆêZB™&ÊêßîZ´k£±U^FƒèKVtVm¤HÂ}Ø~…¤?
lÎ·le½ƒ„»€±pÐúç}èhuè…iØGürfÑ)Úð”Ÿ¦ÛžYåÌ3Õþk¨‡r›MØã+‘ë¤sbswo‘Øó–|/ƒ§È°:‚Øûsq&´I4’ñI€D©ÂÂU|£.2z¹"Ö_Ö_»Ô`«t{ö3zwÑtÔ¸_Ý7œ5i;×Ü2Kä¶#ûEÁ×ÑmüGË¯3/<í¡:s²³/N°Quü2Œ‘Ày>ã_^|J ¢÷9âúV¯ç<êîxnrYdìf‰ ¬jô¦±¯ç\Yk,ó/^Ê´	 <×»”	Ä}6ES(¼ãµšDÂ€…uå&”t ‚›L1…êx.½¥s	üGE3‰ýþ–Í£˜Ã‰hŽçÒ`sIìþ®ˆÙŽTátŠ½ˆù$93*é‹X˜¿”‰Å6¢E3‹ßðZN­Ì¾] ¦e„ê¨yU&:)z£·nf!Ö©×}b…Ò¢©%ny-'WùuK¢~O­A§£ÐMÍ«nOøaò&WH¼‹˜YìÎÜi–sisÊs
çýù-›Kß»›D&9{’oq)3(|è¡w€öÏÎIZoñu¯q„­Dé§g”U0ŽÓÄir0q
#*©dƒÉç´å¤´¬Ð(À\ü{Ì_´Àyh$´É
ÿ=:õ¯s¦ïdÍìoî‰À—Z‚)öqÉ']l¢QLü’ó’1Rë].é‘¹ÅyDJ1ùJé:n-¸Êžß³a58¿—â¿\QHê~ê$&JŒùM>x‚ã‡îÑÌRð\$éÌ¦iÊ-8N^Ll‚ü‘“êI¨t æ¡´ÇÄ›*
—D–tÚH:ŒlñæOa›U¦E¬ôÄ	t>õTv’+ì§€YI¡(Àè‚|—eçâ×qBÁF‰K¼hˆ$¤Óø™ƒ^Ù”%=º–U¾Œ¸={Ô´lÒAtYNžÝpã8èõm$þ7·‚­¶MõäÊl&r3ycGó‚¯æõÝºmlÑ¤êŸK¾á0:Kq*Bä)Ú2ª¤ºÎþƒ/ºÞgçWA2JŠš-6fd³ÀÈFÎôÉ\²Sè¹%:jÌ`Ó«T‡”¢ñc%´çÞ1E²|¡’ý>y‡ëÎCAû‚‚°|ÈÏÙ!MÇzBMÖ¼;"ìJR24°Â^*E"XŠZ±ßPíy¯Û;)¢ì8£ªçz"oD•±2+ç½˜ëÃmëñuc9^MÕ¼ô’.²Ó¬RÃÛt¨rœá¾ˆñ­¢r6 G¯‰ÓQúè‰D[U¬;²+V	y!ê²¯e	ëVB‰ðùÎöÏ'˜¬"™WÄÛ’]Â<Sç4™jáØsm"íÊþ"™×T5oeèæqÏsN‡ÂYË;r57uS""0eÞÃ¶;šƒVî}HvyzÛÜ›eÀØz‚f&Ž»‹/ÕÌEe´¯á"ú®ç ¥äNYU©¡ ÙÉ“rG¢Òp~ÈÏkïv-ºZ8Q¹!VÒ4Ñt%¦ËjBU‰ÿéþM²}~úÏôŸ[·ÏOÿû#ò“GçÏOîÜ¾‹ì¼·uÿÖÚ…j¼•OŠÂ´¨ñ¤#)m§’§¢4_R>Bž‰ðò^Oñ>‰]ç^Œ‹{µØ¦Ð³IdŠÍ%Z†
Ù“SÆ«T·¿’ÜKƒÒjWú6Uáð;_Ýn’L—þlè°/¼ý}ßfY‚”ZM;Pì!–/œð¼Ý%Ìöæê@÷«J^–â·¸É)ºL'âÆ‡Ã'9b[š¬âÉ(ÍÔTeAô~(“5´Ó.\…¶ÚàsV”ê,q^Ì¹Dˆj–Û..!Zª-e®ãÁ4)³LJù8®‘Å‚Ì‘Á–r-_#óò™àÉa	ÏG¹áÊQg±‘žÍé[ Æˆë3¡$BâÄ&hsÕ6êš¬Œ‘>Ãbìc({?,y¨q`(-¿ÁÁÅCµÖÈ}/Œ}ƒEyºDU h”$Q?#$
oa Zpv#Åˆ
z(ñ¡ü\¨i2x”¨ægH¢-Ï82t:Ž}M#CC:Ž]æ%Æ…†é–G…9dÃ_ã ÐqP¨æ±W¹ä˜„Úp¥„˜FáGn.)`š½öx(ì›Þ´ÅhHëËR^ Lñ|×9û£K~Ö·Ü7*²AÞ_!¢a`0P€A¨<ÇÁÈë5. ç8º`]P¦}ãè‚ÒŒ£ÆÑÈ’ÆÑØèÈ¾ §0MºÓ€ŒÏßºÒ)ÌˆÿFñC½2·’€''ê¶sl}Ùõ‹5§áò^?h;NËÊEc©ŽyA…ÖL¾øìüôs'
¢an
e´*+‘Ôæ@¶RÃ9hå9*ëëR`f£—Qc…—XáÖÌÂRâ4,¥sChŒ¤•epïüù×$‰úŠÔ!Í•töË>ýçì«ÒÇéÑ›^Ž„\ò]%$†x÷´{ŒQ!ÝÌ$É:‡qÇ#Ü—Ó÷tö²+|Ï”ðÆÅ}†¸oßzùÝypëì—{d÷vyl;f©^Æ#ÛUhRY^.ÏnüJ™wÐ`Ù^h`»JÄªIƒ•>õ~¦‹>Ï^éŠ7&ÔYÅÄ¦=LFé$Ë DÄ¥F}j€J¼i9Ì»"¯o€ùL&uƒm…¼—0Ç€–=¸èÅ«öóõ@~¢j\gn”‚b¯ák*æ7©éRÔ?æ¤>ÉÛIä+vÜY„ÖdžÈ£_dNÒT/D©l‡!Rv±¼øìÅ'n“<=û›&í¨Éûè<©ëÜ?Wt\’UŽ7û„i‚ê»¢›FójÖÜ£h²¡ƒJZÉh›Wt`°´,·Ñ¶oÂÁÅ»N›v”ÝàY¿h–6fgcã˜›üäã'hmÕƒ¾mù¦$¿¤ÂiFÛcïv{¶Õð[¶¨|;½™ªÆ—ùaŸmnÖ©t²mAûüôë3–B~™ÇÇßjt—üâÄñïyþÇV½îõÝ€JÈ”ÎÆ^×è ½,Âe$p¡d.\†‰ $±¿IHe”.@‡È¢%nû©YíõìPw«í5ßëÚnüçÚ%$P',)b)~P·Ž¤Kƒ`ý
•ÒRÂïw©ƒ4‡Ý¸êO©‡ƒ.6‘©–Nƒ„KXöÍ½åÀ•œo¬"ÝðÜiý;Ð|ŸŸ~]'ÁùéŸÈ}p¸ ó5«³nv²»F}þˆc”µœ:8GO®Å¯÷ÛOwì¶ØW<I|úX=ªÿv«¿áÒÚ^{=Ëo-‰ùðì{‹+gˆ÷üG—Tr›t2õ
öø½~Žñ.CHžúV»m<îûÉ%˜£^tD©ü ré<¼ëú)W3l#Š~J©öøä1œÚ°D:®+ßžÖìäxÂÞÀíèÔ¨´ƒ™ÇË±ÖÐ“x…!K…Í[Bº×·Û0`¨à¨K‹®·ìúÓšwˆJÖš•€ä¸/Î£à£¬N­:Î™³´s~ÙÔÍe~Q¥BÕIÓ¦V˜m˜ÆÕž¬­r6||Wjêí¦_¶’~ òÕ E5€Ta¯rXÖ@yüÑˆeyEO;†qK¢]² ‚Z›Ûý×¥í¤",|Eiöû!ÒÚaZ0„ß|Ž:›Ä
 2÷"eë5§ÓmÛ6$E2$ßöÚŠÒý& —þ·“8VKÖI– 9HU„ƒx]%jG 5Þ<!’åFCž¬˜ÇEâÞ1rÒT&âçBãä.H¸”Ò£}×8šiD´Ý:û£Û§ø¯ê­a·i3Z„ä3ánõ=°×²<Pá’«.š˜cPd<.†é¸k5×Š6ÙóÌT‹#™Š7Ì1††ÅÁ¾I"(6˜Ž[o÷©®¨°=UR"¤E:ÍÖèîËbÙæPô#Ó@á½Q¬Ü:1¡E¸ëùþ2ðM~wbó¸Â XM›ÌêùY˜'?&%âO†ä¬_s$Ž÷M”òNÍ?Qè¡H
ÒVÒå0¨Ó!g·/ÖàÇ³³³ð÷4ó7`] ÆM+ØšÎ=!§ßÐÿÿº²›8Apž	dà"dÄ`®éED­!ät q8ìúïYÝÇµYøëvã#˜¸üÃ}¤„nXbbUÑþ·‡Ã.<Ü#ðW	?Do~†gà‹Éûs[“Cªœ›¾)Ñcš ^œ+üÙÀ»ëÕ­¶½À9he
(œmFÈ_ÐòÎqþ:4)®1£7¢˜<ÁÐí'ªP¾.ÎO7’½­È¾¨DEÎ$L€©WÑ1y¡<,ŽöEß·{7:–Ó~ÅË~Icœ¢Úa•¥Q@tŠ‹Ÿ]:uÏEZÒi³E…ýXâðó
9 ÿ¥P”|ã³o2®=dé©7?&ôÈ†n¾+5t´E Äz»ç§ßZ2Pg3¡‘”Ð¶…dÇ0l:XwöÝýFˆFÄÂ8ˆdÈ¨	f¿N'W[SIa'Ú'(Y@ÅEJ
y<<ÓB.vd"ôÊ¥Âü;þm0]«½Xûût%^¥‹ïÊIÞ>·{$ÐÒ¶Rn“g¦fnëüù×GUê;ÒvÎOÕ‡Ð¦¿’ÖùéW]t¿#»UƒeÖù2t€PD RAÐQÌ9‘“acAAus‘#]l6Ð¡_¦C¿”z)`5ôzÄi§f" iíR,4d@îBQz*–ŽóÉ“¹¢˜Ÿ
ú	-[:nóS!óy¥Þ²zÁžÓ±ãÖÛ~
Þô%:šU=¡Ö+êÃ(ê2;0Þ|D8ªýÃ'Y¹B,”—,…t;v±RŒ¬¶Â‹z¡q“;5yƒv,@·œlyAD8 €|¶Ë?à§p¦wÝ‡xð”mÚ5¹lóÆtìÑš…,v!sUþIôò‹9)Ö”¨ÜÇþö-×/˜‘ÔÚ¥†Ðqìå?!•[Ñ@£Ó_~ü38`²Àï/YÝyÒZhÐNÉî«
D*ƒ;/¸7BÜ“g@¨’1TPJ:¦‡¨€Þ©Íé¼³mxºÒ…¯îYAk¶cVªÓ¤ËNh
”DáLÜnÙÏzž{×ÞO-‘H¨ s‰	zpôø»A"}Þ”¡ÌµÆ×7ˆ4Øpp6ØXwáÄ­äðòQó­~4Ð9C1ÒmMŠnhË ½s~(-•ƒI•±¢©øÐÔã°<ò©Î¹g¹´áÈŽ(”~ÁÂ¨Üm­KÕR!n÷iï‚ïÔO|‹xRžÂéØ‚
vû5h3HØ“qÊ°6\¾“¼ˆUuâ’8Ð³ç”Ë2RÌÙçÙüIwöÙßbH]ãì¯Ê‘uƒ´cûõžÓ……|óA¨ŸõÎOé’gg_&@ª"œzË£‹X¶¹Œa,l=»ÍhéÈÁÌJóÐú®mõê­D [Í÷ÚýÀ&mª‰‘ãugªs„¨1uÄ¾óÕ ²³¾csŠºÆmÝ¡x—ÚûvËkSÙØ˜ØGI²ßfgg±Á·Ý6d²hÍ\-Òª|šƒÐó>ÑèÊðh›ªÉGˆGrû¤PWéÒ—¬#âÞ/0ˆEÆ’dÉI<2\N˜N14²TÆû€kÏþ­ÜÓÀK*Tü]öîìL•+%Âd2-RíqÏk”+Ì?5¼­6†IÏ|tlµÛ0×|Í+\EŸ!©ú³6œ²#õI~ªy`÷¶-ß®LÅ°–J<ï•wNÁ·´,ÈNè(N·×fˆ°¾
–ƒõ†ðç›A˜Šhi°g•i†•7ãq²kû³ÔÈ¥+ÀQÔ×œe¥~þüÛ.§o gZQ¼dö¯¬%vxÄŒ-}øg(ÆÄ‘F¸c2±ÒÍö¼6ï\ÖI$—¸ç¾ÏGÐ.ZštÖö¨Û =	³ô!-¼Òg§mô–i:¤´ë¦k7BBnª~üêô9Æ¼1o2”°Êb	I‹{Xä•P–ËÞ—hŒÑòÂ†OÝ¦v²0öý~×î}Ì,ú‰Í]ø@ØþA´
î ø°àaÙñ›tmV£-ÒÄæóç§V,]A‡Tx³Ñ°&6oîìl‘ÊMçìËã%ü¬…PL­¢Ÿ¶<‡ÖõâSr§Å<aÉù—Ã«ïiƒUvg']OD³8¬º@ø|€özç§_ÁlHEƒ:›Ø%d^ xÂ`ŠG^õ
 Ö</æg©5!ÂT–]ÖˆÏ cÊEeOˆ$ðšäo0¨–ü ®á"YMâ¸.¬Ì‡BÕÚ$7hâïbÝ”ù	4Kö~1S·3ý øþicr
E_Ã^°˜h‹!ÒHÇ¢g/Î1º®sjìíÑäú¤g»à8§,ÑKLÒ‘BÉ‡îì´ƒ
‹[ÿÍ„7§rœµj®	ï+«ièL/>—xsãS0ìûµpÔ–ÌFM*Ö$£OêQî;»™ñel}aoË•©áDË»Œf-~PÅu60Œú†1GÝÑ9û6ôs±‰BÜ³/Žè]ßGNÄC»3;ižr}-G‡µíÑÊÓì­®àÜÐ^åÅg,D€W¿wIíüô·äå_ú$Óh	q©Êï=fAª:ŽÔÎ¾ôàoÖ˜)} © 7Ÿõé5¤Ùsþ.Ÿ®<a7è£–ÐG±£ñˆ¥I.C“/b*x]ã1Q69Oº©H:Åù0?4¡KËE’îÕv³L¦!ƒP±äU*p,y9ã'Ð›3ïp/ý—uˆaz/~E±dª2ò“uñÑdÉ«tlYª•,\Á€ \ž“Â4g˜\ºKmZt: ­ÌÁuE°…Mž&Ðƒ•,jM¼¹ð˜VœFÂ|cÒºeÒ¦ñ«À+Äõù4ëŸR¥åS"X’$¢È¾WïûkÐ'"bÖ0[(\%2…”»­ Ó~×ëåÎÍŒOÓ7.@ÜÚiÂfÖ›§é„‹Öè¢w†‰7)æùÍÌ8UŽY6TÃ
Äâhêž›3Ù¡Û„£ûdE"\ßqâŽ‰Íûs[xß7¢ÃKn¶ÇAVš+…&:ÈÄÈ‘41ã,Vy•NÓéÛÁ#Ó¤CY™d¾âIÇPZ@¿á†Üõš°Ú¼ò¦qÜ¥V™ÄWŽ^’D(µõÝˆ—Ž×ùó/æsýÜm9®HAüèjrDZ©Y`<ÛŒ&€Ü#}¡¹±g ‹‘ÕÃe'(1ÔOcs¼–c»ÏúÕêüêmÂ×³u¯ƒÚ)"GNƒf"*xAA&xÀÃÊ‘9.Š-T0”&‰…ÙS`Gh‘…QýyÙ'èý©oJÇA¯g‹j„!SÔFC®Úßl„aÖðjçäqº
ðƒûÒjp~ú+‚ÿ¬$1»5È‡éÇ»ÓÅ{-Û#³ÿp€öJ$ü`Î® e±Åì·N"¼`‘íóÓ_×YÂœoSË^Ñ´äiŒ’02);†.«FUlîxÎÄx›öÀ#VÍþýý·F?’68ÿv!9…¯Í*t1(N6,wõH§6©Î'VR©(Eç_á	£¤áRŒN&ç	|)eü-h’rýÝîÙTä·ÁåÂvÀ•ÉŸBtI‡<M$) ÿ|C…ößÝædáÂ gž¸Îƒ6uK<h21Ì.kÛ=:k<*²Ù÷)SdPÄÈJSIJä$©ÄUE¢’’Äeh÷È­oµÛtC€ÌšãøðxY¶ÎÁ‡!$ÎI•®;ã]hï÷l¿µ}/gDÎY¢:½Û›ÙG+ß…¨”#Mxg_¸üOD¦Ä$ÈAÓ®ƒ—¥7Ó«àôŒHgšÜÞ™&Û^»ÍÙEu¨z%®žþï`æñÏ% †È–nêEH”¶Ø~ïj@ü»˜g
ãŠŠmºP·0ö1œ¤¡0i'D!Ê ¸uî<¶s5ÐmÊ˜‰˜Pšs˜¶ÀVÓi”£	¶Qk·ÁV‹2§ƒh°8¯ã¾ëü¬o‡cÃOÃ5k-µ‹rä‚þióXà°mÒíE‘=§Ç¡e%ÂÏ%Xºa0	®¢ÕCY	¾Û'´Ý!ÜÈ
o‹.W-±éÀË‰¢äÞÞ»ÁÊ¦¦àÉ¶„¨Üwo@ÁŒëHÚ»TèîOw÷nÜ›Ø¼•ØØâ
Ú,ZÀUb%œÉbJ!âJâpf…³^çÉ"©÷éF¡3C÷–t®Y½‚1#1kÓ§f¬]™Ÿ&t¦ßu:N0Åôý¤Óv1&‚ÞœFE4édí’(ÄPrøÕØŽu‰tg–£Y½ Ñf"Yp^ØYh°çd==ífø9aCÍS#V"n§ó4ú=Æ­Àèo5¢š!Èðë·zŽû´`\sž>~rYER¬]>CCøñý…%‘Ào?¼±µwƒñÀûA€Ò¸t®ô*þéÚ,b¢Í+á-3¨édÄ «)Uõ£;Ò‹…§îÉcyZ®q±\ÿ|¼}ëÆöïÝ¾¿'j°:5*r¢
þ	YÇd"w@‚‡FÃtæúúƒvßOî®–©Ü±m¦×sGüš:«ß`…Çcš¥BNÃ?Þº{—•_œNªÇ¼šÛ÷¼÷pïãëvnÞØÛeUÁ^÷Qwˆu(eTí*¨ž7|VöðÆîÞ{ùØä¸äñY¿íî{9?ë	‚Ùô·(ü¤ ²£³ã¸3æºÛ8ev±g\]‡h%]³p`†´Ó;¤æ>ì,M3§cž¹'ö7O§F;	±ÎÀ…[k"‡ºääEi|U%œ¨ðaú«N5»‚[Tek–ž¨þÑ ¢I™7Q^€®è ¸P‹\Ñä^ëìÒ9?ýƒîý‚ÕgòÃ³ßl•/HGy?4hËÄòÂZGöÞ;ûo÷ÉõóÓÆŽb9™¼ëüùŸnß¸[º\µ¬=¸uûìB‹Ÿÿþ~é¢sVÉ;·Îþé6y@7vÿwú9~JÐž®I·v³‡šôAtœJ÷}·N?”:Ø”jU"è¤$Þ2a'›(S9‹¯–7¼QØ:NÕUÇh•D=Ë±ŒjÌç€¹çsÑ„><ûÞ $iFCéÿáòƒc‹ÓÞËþJ\€Æ	|ƒòDª–$Ôp—Åðmi %´€¬GNw#ªî05y¯ô¸ZMÙ)‰“7<ôEáE«ÉŒõy;|0E¼(ë¢ÀéØtùït¯ÍÞÌãkÄ·öíw{g%qKxGejšÎ·[kÎšï“FcîÞ½¹#zMÂÁÕäì,& 7¨^6´?Áo’ò™ˆ¾ž‹¦™~[OH!C]…©špÎ€óf®a– Ï8®kù”òZÝx¶ ©¨‡,†ó®×Ü†@k¸§	þ:!|îoH&Ç	.ª%÷KF±`¢BBÑ©ãù%õ´G·N@õ	½îß2Ã/v~…_KÇã+ŠÓð+ÂZä>¹ì‰;›ú ‘¤s|IöduÚàœŒ¼q‘	])´d‰DÎ¨ƒ(¢KK¸í?´a?-áB8DrHT È›zxË;2åÙùé/	]Ì„³žXK}ïà»sÍEg]H¯vÄ5/¼ÚZÊù´–=šYI*JnêÜÄ¸ÉnˆcÖZ•`Ö¦gï²v–eÙ<ï†½•ÈAF~L–çL
 ö€í %({E9f3Ñ˜úÙ¿¹¤GvÅ¼ùÖ	]_Êv¢I(‘ã¬óéå[(ÑÅ÷^Ãò[éH4Dv¥[°º ‡²Ù§(C~ÀÔ©!2‰$·Yù¶ ”Î •Â ²u©.dì§œê¢Ð´Õ±ñs— Ã^Outêùa»ÖhÇ÷»F¸kþˆx= ô:¾Æ ¥7w-´!îÞ®à›žî{À-ÃÆúaŸ¹Kð0†,ã«y•tÇûy Œã¿êFÕK@6¶!ž5€úêß?ï@YŒ`!w«bó —%5LäÎ”,9á>Ix8‹1n
½ ëx–'6ïÂØýmM7“û‰Ø¾6Ub3Ç¯ö—CíØ†ùòuQzëmgó:]D\@V|ãŠLÄl%êÒ1þ¯Lù|á§ 3ÿÊ+S.p÷ °ïð¦žóÌ¦#N+Ñ¶âVBœÎŸÿDn”H¨2Ò¦ý?ƒËó¯ƒ—yù%-áüôôÿÀ—BýC:ÒÖ7e	F6ì'ý³/áµþì¶b¶	hè'´0?žA÷4jnÒžú+ý_«OÛ\‡ïÙ„¤ÚÙ°âõ¹~A¤Žg§§#*ÂÃ#µÈ@òÜú»ýv{÷È§Ûd¢!þ®d´B³G7äÉÿ*¹!+2ï4 7©a¨ÍŸ¸%52Z¼$º&JÓ$ã=fŽØèZŒkAö¡‚Ê^|Ê	äù1;;«ÝËh@wˆøiLç\·zÛÌe1'iã˜"ÑÒ&/@ r“­v[Çd£}—bü Â~¶ŠÅ¾Õ³÷7Žo¾÷ÞÍ»7>Þ½uãÆÞÇÞ-–{Nw±1ñ1µÝ§Åû•žÝÞ˜p=¯ùOˆK·æûv¯GwdØ™å¸‰0£EÙ(V¿DÊá$†(¹„ÆS—=OÛÔL^Ñ?Ìqò“¹KŸ’±{ç§ÿ’°šáL…b¬NMRe¨v§‘O†N‡´3¯_Ø±h¤$——ÙFºÌö+5(	¿ŽdˆVvl›ÚuË-šüˆP…Âx2Ý¹ÅÑlrÔlHoÁ×T²k]üœôê}>d´³iƒJutUÆZüq+E1¦Ú]ÚOžnZ‹a7˜v±í ™À›é‘ýž×	á°§ßyb…‡wèÖUÜÖ•-Ic‹e6)DFÜ¡ù²Ö·Û^ý©v”íiAß:ÿ¥ÞZ.¶7v‘œÈdÌnª¢Ÿÿg@öZ,˜¡Iu(µtØæ)ðá"v½Q“Š"EZq±Î¥HÏÒçº¿¦[„§­>l™¤Áav‚#ï]±ÏWßIâPVNÒÅîPØÙ—™Nã„P{ƒm¼ó&;{V½ñN#*bÕ€à5­™K9À;’vì2¤u›×ÆÙfv“ÖÎ6íP_ ~Ú$ôÀØ(Üz¤ÇL†Íí—_‚,=ÿ{*$\çQ²Oo›Y|miÇ¼^Û”çgm“5õ?ëðÃ¶<ØoòT`á…h²]=üN÷ãôÑëçÏ¿c¯ûü›>{þü»ßp‡…ÕÓ‰ô¼¿#¶þ‘WâÑª¦³N7û}:#ÁðŒÕ÷³¾ÎMRyÿì[Øœ|½Fä¶ÈÍ¬.‹›Eòµi"5‹»ø­Ë´²Óo¢Â)@—~²½)tËï7=Ém“ÔHàÆ˜IÎ¾¿v
1—ÕBÌSƒl‚O[gß[è&Ð~9îéˆ kAX£äMŠÔ"¡DiÿþÉMø˜’:²þ´¡ïèywN¡_«5ÑŠ-e›Aê"ÄœÓA­B¶»,%}$Ê ŸE$N zT~@“ÁCW*ö—=ˆˆÂ…‹Suº}0XP *~UÌÖáÆÄ"æÎ0üÏ<Çß.¬@;Ö"H†ySðu%KªD|—¬6ß‘:9TæLL:Ü
Pöw»™±¼'©‡£°<±d piÝS™ü¦+ Ø›‡€Ï“n{fQFégìgô³Ï¶DN‚KEœ 8´çÈÐàN˜[²øM‘=×ÁÆ~DÞßY#÷s#Üùák¤ºKþXsÁ•Õ\7ÜÆPô/g´VÏó3¼³cõFè¬ùe…A<ìÁÔ¢ƒdßC<;	r¬g6÷ô	GÚc{†›’Ÿ$òÑJ³‚Ÿ$±I$ï¡#qÉÁ÷gqŠñŒLùúÃ(ãºÕ¶éðÎÎW?À3=¢p30;%—÷b2a$|ÁCôr¦ PÃ‚Šd&d¤HSºc¦e‰ØõÝ–c·9ÆTçqYÖ:÷z€Pà~0‡Üb‘
àŒ¥ÖõwÙn®üÃ53a|²&pì9zkˆ:ö¢“çÒ/ðf²Ïcwåš~é8vX¸¡ã>´›Žpèh{}V¥B’BUÀ¤šôNž^9a:õ‡ðs¥†ø€5D'1¥À|²fèöÛtIÖÛ/>Ýº(ÿf1Ö‚!øÇTýÏ¬ª8R>%z>ú}º5&Ýç¨^>û„Ü¹uö›­{97µ8¢ ìâ)ÞZÊ=³0Dž+ÙDœZöÁ5[ 	Îþ©¼GÇ½GïŸZŸk-]ˆ?+sF°˜Uš±ÌY«ÜÖÛN¯žf>XSŸ†ë–žaN¼ÂªÇÇe®‚vf;/®[½.¨­„NWøÄãlHéPµ_aÁ¥ICFÑp1HFë5kJ!h’S35¶ì0qï}©÷…–’ý"L>H Š+·¨éU÷h7O]’œ]À^1ïed²Xö†¬ÏyÔÂæ6%¨ŸŸ~M’bÅ:¼´GÇ÷Qâ²+»Non³Mo€sf.åÎVG½¬ÛS°â†I²à5ô™Yeè,ÇzÑA†ðOÍ“Ú™‹ƒ© býýÍÿ  ÿÿ Ëø~¼xœì}{oÇ•ïÿû)Ê„®9L8Ã—(K\ŠEÉ–V+"íxW¬ž™æL/û1éîÉLlÖ¸X,‚`íwƒ ¸V¼Fn6käá,äêæ{0ŸäÖ©ªî®ê®WÏõðº‰äLwUuÕ©Sçù;nÒß>@ßI’{Nà^=>h^D}ü/uÓ¦¸±ãw›—Ñ…‘—<p“4Š½°wÝI´‰fÐœÔm&/œEkhvöøñ1ZØø+dºÖ»Þ®ãÒŸïî¥3ãÇ•‡³Á^ÁƒÝ‹Â´ÙŽü.}$˜ÙxþñÙÉÂjŸüížþ{ˆ®Ÿü>×ãöùðÊàðëÃ‡‰¸˜u¸]oÈuöÏž}ž¢:î²ŽQã}/ìG› N?EwôfìÄñ_£;ÃÀscw¥1ÜŸF§Ÿ†¨vòO(Åÿöì†¼¾€'ÙxŸå][q<ðzý”Ÿ\è¬à)èÅÑpÐìGOÜx-~sØ\Bä//õ¢°I~Ý‹â`ÆH1ë×†i…e¸Þ†LoóÄ‰='L¯ÎDÃÔ÷BwÆø„ðÎ{CßÇ¯½´Œð{†]·Û<ôé&ííùî!òR7Hš7LÝýý0I½½£fÛM\7¤óÄÏ‰“ik÷š^ØõzQsuµ£¸ëÆÙK‹‹3¦ñFá¶ïuö¯ŽúNØõÝ£°³ë:¼Arlz¸ë%NÛw»WË{Þð¤™ŠJ»¾:C=gÐ\¶áëÜ½ØÕó/6_¯ûbcµæ^ðÉO<Ô€U{!,ŒôMØóO ï…w‚³“Ÿz¨Ó›"wµÏž}†©»ï¡ÿ‡W€9×½Iø×o;øvïk¦¸¯DYƒ-€ÿH³_èˆ03@ÉÀé¸Í£æ
â¹Æfü\Æ£–1“¢Jø‰yöú«ÚÉ¹ïtö…-w÷=Ü¸ã$.ÌXgï»æ½ËwýRkÕjßïô=×ïnùn¬^Æbã›®íÓßcïœ|Ž¶ûÃ£³“(‘ÿØCÁégöjÜ½™Ïw·þvÎL“ýUó¤JöãÒbiC®Šù®Ó…ÉŒ]ß9t»6“vóìäãU8;ùÅXÒH¢Ó§)¿_yÙ=Áw¤ ¢mŽ?`3[¦£sú´ƒÈæÇ·ý
­'i…½»7×Ø¯¸-Üv¿øjëo‹ïïŸ~2ÐçkhÝðc‹K­%ÌÏN?ÐÍ?ÿæÏOq—»X\úuÀÍ·òžõÜF.)!«ƒ¹d×ÁƒÀêóòÿü›!™‚_·ÌKgfM¦ïG×‹`;©“&­¾“<†èÍ7Q£þé‚wõAo¼Wx‘Cµ›OIsÀû‹’Q‚yûÍ<îœ!Ôö–3 ƒ´<ÃØèÚhÐÆÌ3€ÿÈÍtëÏlÜ>{ö§}g‹öáé/S‘{gÏ~2ñyÍúœ+M`/öºþkv"?i.Û‹Yk÷û§¿ÃÃi Ý's˜tñ¼†‚,#žÚÚ(iãïÜÄ†ÝáÅd÷ôSí÷#rÆ6†‰O:ÒÆØã¹×;ýyˆ¼ßú¨Ñv{n:é€X+ãOQ.f F'J&icìÑÜRÆ#iûQgâ©!Œ=æðXè	Ðp:w:aÇtX\KãÏÓéQNßÂCÛóBÇßšÚøÊÍM0f‡g'_ ·Ñ:÷ã·˜à3yÂA
m=Âk§O#8þ"DDï!å­“ÌÝÛó:žvŽ¸ƒ(g3Ô¸ÓRKñRë¸üi‚°´ç\.*cÁyÉ–Íïb)‡J ôHy6ú&’±ÎêÇŒU¿ œDr?ÙÕÕÏ¹mUý²LÓÕ;‚ª~]]U,äáÃÅ§tÓ!G/þÿ‹9€¿H¢]èéivsÇuIaS ç;¡+‚ªf6/W±Ù<”xßÅÃz¼ÍÍ¥WÉÄ¥‡KK°Š=Ûo^A¹`(Š€Ë™ÈþÆ2Äªd5šÜŽÔ˜CW7µ&Ý%däÞíïFw£Æžã'îœÑªoY¢­`ÂdíX4`µ“¿U"×ã#„åo£ÖÆëéæ[íÉæ<)€³r‘û(E”×h é;Ýè t³ßjáÊ‰ÁIŽÂ¢$1²ã®Þjàþ¢ÌÃ=/3Û ÂöQŸUkè&Ñ33<ýô%gÏþˆ×Ð9ÊTPÐ*{ÈÇ¢/–^°
ùëŒUE+è	ÎX],çDÅí:©Óv·…®á§1[í±C„(¡ ÔÃÊÈ Zû¼³937gûr9Ž—Ê·GÝ¹¿¶kÈj¿2[­l,É¦ŠÛÌæœ0ßc¸ƒ}­ø~}aÛ‰»Ûxßa!CÞ½Eö×ó:1EIåúÂ®ÓNò*ß¾§Úíì"/Lµc»èºçøQ}cAÒ"û.¸aaÅw‹Fè÷ïâ¯ñ¶†ŸÛ˜x{îÕQâ¦·´÷Kß’~Ï^ç`I°8‡MÂuÊÇU…nÆŠ–}ÅQÍÚ¾é:øÕ²›v½Ôw-<¨l¯ öLŸ³gj‡õ›LÏ‘h¼„ò¥ZöÇÛýÓß{hÐ'ªAß–ELç›JJä^Ó0×Ý¤{ö*â´Ü°88ÒÚD(ß|þ	ìqÌ6O~¢}þ”öÄ³“ïƒåííÒþéSìtð?¾ágnóð‚5µM­¢¹q¹ì'áÎA£Ø©Üw;©Û-(|³•z&{'à_£ëx†Ð&æh{îÛQ8i£úHñ{ 17foÞ\‚µ$AÝîÂÝ»GøšïR«ÕšUs^¦PVž[U'2oùƒeÇ¸zM'hãšû ³­K?[£ÄJ~Ò;.sî	5qYú¹;¢n‡ÿÀ.Èê=‘!0?ìKtlÂX‰ÿÎ“Ø†ö”ó¯9@Ö*é…×žÀ!öü“ÓÿKÓ…“Œèé!Ûøãßâ&*Ò½=q"jÊ†.Zh›˜â9	)q†¥}Åæù'þÍÙÉgÔóHë¤¿‹<C²“©ï ;ýÿ~ëzK£Ê‰Jz¾03ß¡àô÷"o !û ]…:#îúÐç[õ1›mb9¦ƒÈo^˜x]¾–M­ûÞ†t{ƒ¸‰…Ïa˜&›­Aý=¾%AßûZ<æ‚Aðã“¶iÿ´iÎ>:•Ö©	¶½Í‘`¾O¿Ðõ²¾0ôUŒC-±#åí(‚½ÈÖpI€{R½·YLF®9÷úøfÊš¥IìÈ´L¾wŽõpxóìäG@Éÿb2á"Rí·2HÉÉ Ñ†Ç®]AÜ9'Sò8sÎrS58l^R©{jâ”ÅOˆ¶P8Þà˜û x!IQ@Pž}úeÊ4J|r[>«·d7(DëLž¾Æ¶m}¹š=i'TWoS¢&ý¯EjáDjÞ3EÎÐ{”QîŸþñeØš×¿ÉÌÔìr2èA]‘ÊR5‹0¤…Þzx[þ®ÖÜ|§,ÀSÿÕÁ}Òº;<ýÒQYz_¼
´Þo>¼¸J¼ÙÀðö|LÜGMg˜F\èÖ^.¢AŒ	±3Ä¤4ñ #ßo;±^ì´àº£Çò8 z1v¯3Œ“(n’3 6‰ï»0z#;!î ‹3†ƒY¨h¸ž^á†‹;"?
{á´•@ œ°ƒ¡bÎŒŒ@!âÍöøÃLlGöpèûÊO³çeR9D’2¬dÅúØºu£™Háÿ*b—èœä¬+	Ñ3g6v93by,5¸‹â[x6ôÚmô¨³‚¦N=_3·+¿œ!=ýÀÃß!„ƒ9ÊÉ0SLàèù}«4Má§øËì(tŽtÊ y“NµÞ|³B	ÍUÌùWKÖíl’ð[upmX²NÄ1±ÙÜì
'"ÁYB®SÌuªŸÞrXÖ©õ–òíýæàå›6øíËëªbMÉÃ‹³É¡þVù×«"¶ËõD%¥G¨ð:¶isL0ã#gØõRL`‰²õÖžçã9j€‡¹üÄ:•¤	GùÕ«W1g¥2Ú,¨Y²ïÃžî8þì	é‚[îëë7îÜØ½ñáÖ;y’¯¯½wç¶ôû[wï¿û`ý»;Ò[ÜØÙ}÷Áüž9µk«•`^á6çÑÒªæ®ÀäS¢§Pmí»GWG0V¯«ó1Lñh•ò”MÜ?™':”Wþ µ?jñitKÓ9µÓ¶Ú\fht¸O/	`ýšƒ·©@MrîÅ+Gëº`ãÝÓmm +ˆÃíA—ðÇ[”jÆh¼¼ñiYfSÞIö}G³mž¦ËÁ³Æ0ñÚ8G†Ùú kœœƒ×òÆì‘¡ïe÷K¦ì:'£ñl@6ñm[Dq­/ê² ÂòyZõÖKdÌ™ç[€·Ê	™Ap ÛH”–a5ã„ÛlGC€`Lb§nŽçgï†¾g¦ef^®ÎÝqVÔìD¥%¡3HúQºÙòÝ°—öáÛÙ{[³Ç…m;ûÆÐ§Qµ_»¨ðŠ^œ‚CD•JQãò‰á³:9îÙ"‡4uÔ\ÄÏÂ6;=»Ô&–ž¡½‰ÛeoÁ_:àOÄs»ãD¨±“ÍÄ‹Ù0êXº!(É¢;ùâ|T”ô±0²ß\œž.c	¡˜NÅ|Næ:¸T„k¦ìH¨˜Zm½%F8U§Ât T^Dà ÈlÄ~¯Fbe	©Í"ŽpuÄ˜ÎkÂVäí8
@IkH·×¶$‰{BÇR×ë	·|¢(
@9T³ƒ")o9ûE0Æ§tÎN&|~ïÓÒJaæ¼¥ÕÒ…á®k†(Ý¬Ìb–ükb	zö‹aÅ›ÉTjiQ¹n/ÛÃsÝuÌÍCÂŸÇpñlù¾{G¼ñë`©iyvx·¢`÷¤ÖÙ.13½ŠqS»§_„}>ÿH¡©n\ÌTX’ÅØå-°h!à–s$7“3îæÑ `¼ýˆÚyI”ÉËþ¡è3zþÉég4À<¨‘…<Ì“üÖyÞ[6ŸÇÌ£'­'-Ú1„8¨Ó?}fâøìäÿPÏÔ«ã+b1KeàI†¤*j‰–6‡-©b`$î¼>°rž¥N“[\l"b²ÅFobJ"îÄþé`²ìZÇ½ì’˜7Ñû´p»?„À¾ßvÌò^XBƒÏ?!{SºùáŒÑ]'Þw!„9ÃH1™›Ÿ—'CáMï9¡6$çµ–Î›L¾=— A{K1×YLý+ìÛïc[‰²ð7_ —ëXÐÆ³tŸ†½¡mšƒQ[¢Í°V‘êÞ±e¢.ó€5÷’6!^hJ ÄâÁË.äðÍØîtåM|I5<•E|7ýï-CR<Ì<?æôKyŽŒ0þáaÄâ)w#ºê›­ÏÂqŽú`ŠhŸŠŒ uq¸aÃsˆ(V¸È†m9pÞ%8Rãa'õžðÝ²´)¡Ëãøå01…mgJ¼…À¤LÆX 	+®Rºñk–Bfÿue'L&g%ð×K>"õù3èqøõ%qkCŸg!ÉØ<Z*ÞÌŽ«¾ûkn’y\_(W±á9“ÈÇ0À[Ý„¹îŽ9*à)Dß¤á¯›u¸ÖW“Ë()þ<YM©Sà7"­½\¡«ÏrÚnÇ†é(oþïÇs¶ÏžýüÞMtíôûï®¡RdÈË–fˆÍN`8»gÏþm—Œ¹Äbh@mA¯®<ô•lªô~þÂMÖg•á ~-_
ï¹ïÆ—$x-t×	žÀßuÚ(ÛìRÎÃÁà¹ð‡`ò.šš‘Åã]"9rºîÛÐ‰›âž›-P¤~QšÞò{kÅŸ	]âC	Qæ?õB´‡©~&¾G~iîÅQÐlG)¤l,£îzè ƒUA‚0wÜ½œÐõ×Ðƒó0ŒKçŒ¼ €3†ÅªK-	0c"aømð‹4!Þ¿[î†ãcTó,”¾×íº¡u^sŸ¢Sõš½Øézx›iÔŒ™‚Üi±ˆð‡ƒa<ð]b÷<0yŒÉëÑm/8CÚš]Ìžªp~
dÜSÇ­ß)AÒ'zS$Dcfêa¸¾ïx²ü;Ô½Û£Hkß=JÞ½sãÃ{[woìÌeÂ¡:ªˆâwhO6c:÷`æDââF¶iêÕ“lŒÔQé?‡4ÿÂ¡ÇÍÆÊàïˆï;ðÇ÷ÃLuÐ<.:R‹sÞh8ÿ9`óX&ˆ£XØji)›xÜLì¹âÜC\yãaŒ7ém÷hÁ/wœ¶ë?2¢avŽ7µ—d‘Ðè*Ê¤~Øó%õ Ú¡ödÇyâv‰¼×CôIŽ#ßÁ¬¤•DÛˆ0ÄxÐ‚;øN´p>±›ãÐÑ·Þ¶ÁŽ"áô¬OSÄjz4 ÎFš5¡9©£ÍÅ‰mdïkêœÁî„æXÆcKÎ#Þ.gÎZ ZWæ	Ä€™yã8º2Þ‹Ð&š1d\Re@nA~È˜+àk-ïl’Œµn?–/°>²ˆ(d™M¸ð D6RPqñ´ÁB_ØÁ¯73Ï¯^œ2ø8×DÒqðIúp©µ¸ôhæ–ãÑ—1ž³mÏW+ø^Ú˜EÙ¹‡‹l"É- åáÌAF|(/Ÿ†á‹ë±«ÉÉÊyÈ4ƒÈ­Ò8@ÞÉÂXMq
Ù5*qh;Ðìj6ÈŒ.wâr“}¹§_Ì#>õ`üÍGaYŠn“4d›ÛfX`,–VÅŠ~LÑó…øäœÃ•ElÁ|Qiûêx+üE÷ðÒÒb®J´ñH±Œ’ô£8©pÌDCËÏâ¼%RëräÖå,êžòi0ìc¾³‚É$X>a³íÌ7­/´Øz	æXÆi„§ÔÜhý¦ºq"\¦•hqÀß{Qì}Oxûí¹–§ÜdRíŽWëV^œZÇ9¦Öq$=‰ZW€ê“­IŽ\ür(è®‘ßãè ~××ÂÜY«èL£?ŠáæÓ×qçwðÁ‡´~$µ/Ò>Ún}¿1jLá’ä•æ€fb°z	1°£Bïy(×TYœÀVº¨6ÊG©V1 ˆc÷ô‹N?CÔNøì—¸
Pú5%µ~Äbd–©‘yIE
BÐ±3¨RÉŠÞÊ`S¬f%°ÇW[I¿2å™6nŠûØàÛ1#9²ElèÂ1ôŒ?  ^'d1m›­@o±Âx£‹—£Ë©Íë7ÞÞzïÎî‡÷o<¸{kgçÖ»÷”£€»‡,@qÓÈe|ØóÆÌóO?Àº§3½¹ð:-töìßB4KÐý:gÏ>ÒX×Yf|aÆxâk(ªÂ¼1cŽþ7 òÊŽ¡%‡í¦æ€ÎBQ¹ŠšÇ>)e—jÆbà¬²ºj3ALŽ¸~sÿ ÿÎ]~Þµ,ÍŒökµ]-÷vŠ5	|Úp„ª_§rá<¬‡X?[KîžQÖ$§fQªk!«Êt­¥UÛt-“PŽ•®÷Â„¨]Äa™˜- ¸ëCtW…Ec‹k¤EfõX¶ÀŽ0ˆ0JáM£·²–Lv­eÈ•“!Ï.kEÙÆf¢KLãvç¹å¥ÁEC£uêSÑÈ€ÍêŠ)+MöÞÍ!Ñà¶½¸ã»Ë¢/p7cCå†.J{kŒ3ß˜1é~6³¤Oê5ñW¤Îä®‚K¼{	1´¶Ë‹R´6kd6¤˜KmNg%heJ Æcê($
‚Ò™²R!í„˜8²doéådƒŠ‰X˜û•“eÄ0´ÀN~|âÁ½?õ
O.@Û˜´ÞÞ˜)ÓõÌúB{AºWïôËñC}æ1aê‹bPË/ì½a£ÙhÉ\WìE7sYó]È¢¾óàÝ÷îïPwñÌSWÁ­î¡…N]Gä¬v&è*ý½E¨‚4êA#ø‚$m
Ÿ_„·VÞnËÅ;æ¨±m¹e	»å…Øu“ÆþœUàÄ’uBœ[}ÀŽ{£¨¾K‹ñP‘j7êõ|÷‚ßtÕ²ˆhHÅ@lT”…„ß‚¨0×ÈcÕ–ÇÓm±ûÆ	?3ü02o³ÊÏœY—@®Ÿ¸vï1õ·xˆÏíÐ=@;nÚ€ßáóy„É_æÑœY;3¨C­¯Üdå%eûž¸A³Íz\5õU+âòV=–šéK+_Ù‚(Fw"?Š“1ä1Ñ—…9ÿ®wt¶!ðJ°í±_ºNÒw»UUÑlÑŽ²zžÙà•´Ç[ÀEç µ,ÅÍ÷/V3¯…IñrÅ¤8³Ai¥ÅÉàõê_´š'ÛuvÞ{zÕñËÓ«¤‚rüÒªð
ÛIQª¹ÐÛøOs÷ñµçæN›°[äw b=òÚÙÉ¿dVÈ"”8v¶ËŸ¢°ú%­k`”¬á²ñ‡dwê°%¹ûLqAw­\nVgkç¦¥,V4à×…¶² ™âÜ×œñÐ¶…Ä"¶M©’´ßŽ©pn}gèù kÔÙªy<ï£7®^EùkÚ–á²?ž­†Uœ±ÙHllŸl$V÷™NÛì²<u³Ë÷)^ä˜ÎÞðØþ¹¿)ËîýáªíõÎ.þ<¤ñª4Z^m[KJe5ê{Ì|ŒVþðì*vn‡$ñIË¢é’T;©¸dQIB0R.šØspÙUD¶‡
\œ¼E.Å¶¬¬­štU«Èhè<*Š« !‹È
Þ<+‰¢PÄå&Yû¥¶·(®Qñ"ÆÀ‹úÑÅU§Âò·ËãäêÑá¡r¾ët™x^¤
u¸\9Bî­ÅUˆ£|Ý‡ø·c»¿òÁ«ÐFÁºŸ8LT_p^gÞj:,ºtj¢n|Ý
_·¤Š®‹³1í[G×qcªCI5n¶.Ôa>5û´1^ë¤ˆ…Ùú%Öå”åãô)Ú™&§|UssX³j‹·]Ì“:€Élïç|6îpå"„Ü…±ò&6vûn„º§ÿéUmÕö øÄÏ<Ñ®}n‰öñ(Ù:êU¹¢A¼¿¼8g°ŸwË#é+l7…¬zñ(ú~·w!…¬6N»±¨&{Œ†áf5Hðí7¶vo î®»çý” +%.Ö.»¦úºHãSƒò;ìöð÷Ò13oYcmK4ÒP3!óº
±M2âu‹’öOÿÀþÔ#ÃW°œ=àÔW57DQ<Ãú„´™¯Î£$Ëb*o]_c¸ÜQçÞnß£êÁ
·T
ÀÖ¬þZïÅePàÙûÕ\ EÔ;*6äBÊ]µ‡ÄUkg¬ú›wïµ°è¥!¬¼42hó(YoQaVÓ‹ãÕû¶Ã¢9å ¼dö™ò6Àl`¹$ÜB& AÏ<ýRS|Éü6/CT2KF²ÖàYb´t”UÔâR§ÊE§±L"‹Ý–§°¤nã?9$©<Å²‡¥²X)[z4c,u@Öù½kóÛ¤ÔÀ†œœÐ¥’rÂÒW®ðäôoq[“—KÞ/µGŠ"LÞ)j+‚é%	Ý†Ìm;”ÜŸU«eoŸv
Ìs6Þ ›ý–ÏÁ´~Íõý 6*‰-3P^-5t€r—ÊÜ^%??áAgWi¤ê¢J¦¾Ëª?N*/‡t«Š±TèL^,yJgå*û
ã(a™êdÔT¥‰’mÂc*Ï(™£Z(Q»5ÒY¢Ë%”èÌ„¡Ä6>Öˆ\¨+Ì4T²’¾'‡M¢XÒ>‰
hh?‡ÌK&ˆÄö,xìœüÂ¡ç“èY!²(9½üãk*jò+ùN†8’Ïˆ×!üˆÃIã¡¼¶€˜3˜s•<L€|¢Â›Í%¯~ó
PýE	Â,³ä( ÐS(ŒHzCâú{„3cò{¹
HeàÒi¿qTŠ6[É·i7üržD$Ë$(”,_9lËÆ6±ÌMM&ŒBu.¼šR±ª)XËV¸ùÚ*Ó¯ÔiW2óå±‘rÕPr¶‰æ…V¯:¬¾í`ý*•Uv@ê³Jâµ\#ÇkfãùÇâ·Às0>Íò‡6$»0%?)jXÑr`Â º¬H%”9ÍÙ_§O?èRQ=ÈÁÇ);l5¤t†(Ñ U}¿=¬cbö¶3l^šyF·º]Z?åØÞºX7TAÀòY¡X>*ÂS˜Ç–…\K|>I§WË<Õ:<+üõ—´ªì“æò2Ý Gdpº üGáûð‡Ú¶S¹Ic2¤7ïÆ^¯'2ªINÐÃ;Ãd8j™¸OŸæ’ÞšÄú"ÃE¼Ý>ž27¾š…Ìd‡¸A™¯ÎÂÔ²¬ª8Ê=3lÇfÀÒwÁÃÊ8mÒ)hüP¤ê„šÙhdHZ{˜“6$Ì «ÿUÑÜf‹Ý¿u]Ès«û8hœQxlUAÚ:¿¢BúlŽ°t)­÷„$yà ùð"ÍÀ\ÿq‰ýA ^Y}rðÈXô»|xb£³„ÏúA“Èƒh Âúns)ßxíšÅMc`Í—cÇubÈ§åRtÚIä±H‘t`§‹ÌoM+HâðXŠðâ“óÞ"VrýV8¦FÂøÂ.ˆÉh Õj™½÷üäúÍË ãšbÌ•Q>³I0Ê‘2n&Îßç›h¸­Ô‰ññ×"XX£ð¶{t=:ó6ÝV‚ 7;pzD=h›1¥c˜v ùº?H„§SgÌÄ0ä,Žp›Æ€`h“ª–³s­4º¸ñ6>DsE(`CX-éÍšÓ¬[pqìÂ ³8Å-ÔØ£ÌÎF"ãüœ1&·ÂûnìEÝVßIÀ@-œÜ5¢ÝØÜÂu½ˆã-£døc¼Øh3ÄÃÂ²%ÝhMËF€ (¾:ÂÇpi òJã¨ò`™Æ7N°ÖHFJ–ÈAùðD×e	P‘ˆiŠàõ©Ý6Ï2ã²ºÀ` d›åjÂ©12Hº$ëÓ/-lrÒW³ÅÊ.ëÈ¼:ÓFÅ-~Þr‘¸$è×öVó¦e&EÙ¿C½ù©ŒcŸT°Pð óýæôý¶ 'Rv›!Ž"»Me`ÕTÒR)˜ÖÈ<Fî«À™¦zJë+hUS°]'nŒ<|z»›-@—†~y¯FÕ†÷¤°nà‘á†&eõge=û6	×ïá·LJ6Ê¼8´ )±&LI>#zÚÕHp+ÿTn6 Å*6ƒ¾ÍAÅ ~•ü`úa
¥™~í¨÷9gš ièï‡œèj®ü$Ì)ù†ÊŽ_y»G‘Íœ¥á—²µ~Ð9D›èñR‚†·8ÐïnMRš¸òg@Ú‚tMÅ{çè>ÏŒ³³Çs¡ÒËfµc¬ÖË_Ø€pžÚý×Úº¢«qµu²-Ï[S‡N&QÓwóç¿ÖÑéÎ·TÐ	kh¤V
z±Hrí>ÅM‰ìdüæ¬”ý´ž²'ÿ.=óYçÑ×r>Y>ø1¯„ÖRšØUí+“«¨•×û®[ƒô'ƒ¨z¯L6)OãùZ)RÞJ‘¾ +…QŸuCd±Qš
ò´5pg×ˆ£žZjýJ}!—kCWá·Àå¸¸È;qŽÅóRZ-Uú¯Ö©°NSÉ¼—'NÄPNÀ"Ïä­/<QYFÇ‰KbÌ¿‡EN Y>=Ò¦žNª<  ;é„Æ0½`à“Ê;nLÔJÝ 
±ÇÍBÄ§+’º5´"š €åZ™ Ê°p™CüÖ®AŒ]ZXF* |PÄ—„Ž¢0®RœMÿìÙçX2?;ùÀ½þ%~j£Ù+¯R²ªös¯ðVU¾çí³“/iÔ©ZßØ%12*ÖX/Ú¡M‚GîâÑöeq×¸¯_˜¦ŸEÏMKãßç/8ý”ª~îóO²P$-=žƒú;Ê&÷]-”4hJX4H-RÂÊ‚~Šò™\úã>©’¨Q!Óô^ƒ&ewæëÒ.¾êÇð&4 ËdâÆû÷ž<÷2Î`Š;ƒÖ¶ÂnZ<ÿsy™Ë9*Ímž»f>¹÷H
Ö½!¸Õ¾í¥ýí(œ¤AÜV ±Ðº˜?ÎihmŠL*ý¢‘3Dss:>R6Î×<šUHRŠž¢×¡Æ<¡LÃC/!tÐ›è&MJF×œ0Ä|_Uaä²'éƒoG1ÝÅ¤©‘b*)m].‚°Z»!s·.\–ãz–³` ¡œeïZ$H+4ä±Ýh pÕ-'¼€¿Õ
tª“=£n%Ï£É¦ÓHcqŽ¬gdRF6›Z¤ûM­0‘Ud¢˜‘C6"žŸØ)ïÆ+9r{ ä@¹>¬Ì ÷¸`dášb‰Åc&,\kÍ<\+˜;¹»»q1à5òwCæ„³Ä¨øÐSÉ…Ùè’ºB
£Ù¥™Rn¿=Œc7ì5Ô¦å0^m1WÓ+„eJC¾´X+¨¸²˜fMŠu	
Ñ/Ë;«Špæ,7ü/ÿðsjŒªÓ_W™ÐQt4¨,š.y=Æv!Vû)xdåÇ
ÆšçˆÏÚd"¼™VH&1ÍÊÓ4É_L;/«fËó¢ÒÍXö-‚9ÈJ¥‚öÿÈþ*’ÿµ“c0Dš€iAöÔñü\Î¸£«èKÚ¬-å“§¤»UElcäR²n¶	t"K„þ6Œ"üJ^ˆL3¸û3,eô=1·&ƒÛO!”âôçGºÃÃ°7jH%üýâå
î{EO&åÉ_¸Y(}”ýRàÍåéc&Z×‘8ÕìÃïkÈ	æ‘×=\C!Ñ ¬@,Yð†¸;iŒ®"ÒV.ÂÈß8‰R#z@	cÓkåAÕ C“îK­Œ=šÙ»$¿”ã¬É`í+r¼04ˆÜ¨¹dž§oŠ+Ç…V³&tÙó¦BX5=rÆ“ý
9féÚ|lóÇ·­ÇŽž€ÐÔtÜ)âÚ–T); 6@ÂN¥ßº¾FëØ×©D¾êj@½UN`´ž=6<ÈÏƒïÜÚÙ½ñ€Àüp)™Eù¯ÙœoðÏ½wÿúÖîwßÝÝºCžÝæ¤ñÐ9;ùqØ#°AÛlí|ÖqhÖ‰Á•A–éèGôa”Ò 
å«fjÙ¬=¡5"GÍ#vÊØöbï¼•Ø›TÝè{{ž2Ö\YÆ<7S,µ¦ñ*kƒŒ^m?2âÜ€~j$€Ò Íìá^+ÃÀ·ÜLûXhêõkìøíÿ÷Ë5Åìä£·çl¶DmÕ¢%UZÝfˆ#ÐÃZš
PZ¨)€-ÑqÑµè°–v"T#b…]ÄP‘ˆ ÈP Mj$z‹ÃÈÉì÷­Bä1[:Ä}¡bÆ@ªáÓ¬£?œôf4³@‚Ý—ŸÔ€-øo]s†Ïm¬³QçdHq	ÎsDY S,ïT80ç…2¬øág¥·ç›ƒj	È?ý4ÈPf6îUæ¦dq,ÀdÈ(àS†S†zXõŒ þ”Ÿ:ý4ì£'D~ÀÁbÐÒC”ŽNTYõ•åe·Ïk©ªP¥wðU™³=‹Uüþ»SíëPëÆj™BÙõm%ìý,wŽ…8ž&…ª
‚Iœ|†Š2»±&WÝÕb—‹Šb—´<üÃ¥Öâò#DÜØgWVÍ`ë„wÒºJ*×£†”Ôè+¤Å&¡h½°dþ÷ÞA·O†î½sú÷ÐÎé÷·o*‰U_ùoZtR£Nr‰¤rÐ’ÝLzï†þQ}šRWBZ©ÍU•Èƒ6W¤uor[==‚Db+Ht:¹ïÙ©ÄX}‡Ì§k˜£dˆÙ¤”Eî÷ñßcQßGÑB¤DC?õèjòÖbÆ!i¬ŠUz™sÅàÏ¬,©mÖçô²üÆ1Ô¬÷W*2€è›~ÅûõëNêWœåÉ\gëºàÝ"mAìÔÏøCº¡ZjMîúBE3kµ”_²û” ‡^ê`3³ñÎÙÉg–ùÖPQ4¤¡yä¦ï¹—=ýþ
‹W?I±@ô¬ÓÒÈzAÁÄ[k”'ÐuÛ´<~Ñ»0û¯N§îðOÑµ*pîÔÏi*•‹Þ«±Îñ©{ù[|Fæ¤òÏéL§ñµÙ2ú V"f»M6@I‘®ì‡Øí;n£át:ó îG]ø/ôMò'3IÌ£Å¹9]hûúVŒÃ„5Ô
š°búVü“_'UEÅ _QÜH9¼](Á®aäû*ÐžX•QÏI¢ƒÎ–÷¤bAùrLGäK}ˆ)ç`ÆòF_\ç4‰üetÌ€ú^x×¨0K
q•å ¹ŒßÊ²v›–Ì¸¦´ÁÂä®kQ÷H(\á5b!@C¨p6Z®þ7¸%Ö‘¨–@]ÇÛE{Ûv}_cÄ)D!|8¬dsX 
ó,åíŒ×cI`ýd±)lòÀ”üïsé¼AÁÜk,le}R{½¦°'ë¸t–y¼Å|â‘Ð>ÌÆ]“´T\¹²ÙëG‰>|9»(J°×Ñ*±ÅU’Ìb7ÀÛá®¸íÜÖ±²rË)â¢¨gæ×ùdŸðs}¬4/›ó·­<=ÔOÆaOŒÅ}–$dÃJM¹FÊn™Ž.\µøiJ)d%„ÁgÀDt’ÌŽ( uÅy°Î>°Jß•ÅzHÙŸyú=Ü)U,j¹¿¬ (È´%©²çøIY™¨°ÁK “`Â9ÒªDT]P BDYÎÌvÅÃ•e(í'±V”„YQo`e„ÓS*­ë2-”Yu­‚ð’ôÊ2Äu-çï·Àé>$kº	ÈÛ—ð~´ýaï«‚cVdƒL•E„Î¿V³hŽ ÈÔD
™”+Ïë\»ÚžuXÌ<bE,CAû&ÕðŸ‚i_é!øÍ”¦‹Ü +³EæØ>$Ë0/õø4÷k¤žÐx¼]â¢ðÙ|ª”é¡ñ4m()'›BE%9U3D£ù2€ÖrHß “0Ös“4
šøe#ßo;ê¼FHKÂïr­>Î‹·ôÚ¨²f°3ãxU=µ®Îj*AC(b/FuóÂ3“gEŒáÆ€Ä5Î	PÃâSs›9äˆø…9ÎÄÊW^‰"75'Z%ÅâIÜzÓˆj‘-‘T´ÎãVÒõ¹ù)ÕbR…a¤rV2²Ëœ)ËÙî(oa·@ž‡Î>.Û“T²)äc…¥Ëþ»¹gšÔÇÒî(ºÖ”*¨.ßd†¾Iò$Ëp`õX·µ»£T`Åè‰PDµÔb¿vÁ°26#-dEE…ÙN¿í“¨cGÆŸåY7,Z†ŸqiYÒŽéDÏW^Óe¤ÐsZBI¶ÒÃf–Þ)Îq%akÜYÕ)¯§W@8)QLÕÕòLA#¼‚~¢ãšJ‘I!_‰à•5ÝÄV‡°"9¹ZA•ƒ‘¦È‹9öZGë‚Rw²b“
½ˆ*[oGQZªÕ„$~³‘UM‚5­T£)?È,—e³¤¬úXÕêB(‚ÒÂ…:©à%ÔtóìäG¨}vò/RµRm®ÓZ_-ýÔ`*ª(–sz[¸5 j¨¡e‘‹gIÓÔÂ¢„˜VZE4Î(AeÉù^’¶4°èÖ:p‘»(ŒRä…´D]w¾	],"§`ÈQŒ×ß?BN·Kä>PJû˜–Ø¨ÔQ‹¸7¼èÀñ°¨!UÀr(Œ=ôƒ;÷RèŸ¼É4æYúù±ÛbÑ ‡ÍË4$À6 OëK$ßrË
{ÎQ­=’Ùn(;©8gÙîK¿Ü¨_kùªšwùŒaF]­'¯RWF™È…	–_™;û..RLŒ`M^ßKÑê÷ŠˆVüû˜¶”ºÁW–Àš€ór'÷²ŸÊËÆÐQeè NEŒšœ2µdÅÄ„ºÑ©kþÕrÓJ¬\š".¼G’ÏI¸FTÔ”Ì®QìÂpÈfoà]’Å3‹×AZ×YèÆ>Åo©è*àúF QS>³êE@qd§ÑÝ¬J!ùõÆ)©yÉ§T-?Ö'Ð2ô&Àé“~e*ô(BmTìŽŠÁÜ¤ø˜àHøêô(fÐC-^‚'§}JFx¶ñžBÆg4%Në\j¦ ãñG\,dÀÒRGÅísÇsñ#m'‚<Œ´·€¦”ÀzG¤¾üu„´9Š·O}
ó V‡SÕù5Ô»Ô.¥ÿ7f9+9ûË¥[],“ƒv²Õé€v‚÷ë\Ì©ú¹¹Í€I]›ˆè¼{›€ˆœï€æI¤!Â!/˜¬¿ÂG`U‹—â?i›,Eþ_úû×ñ¥.žDÇXLa\±“ô—Uxà^¥eO¿tÔ«rL“‘(µë™œ!îA¡PkYÍépMkI‹”KÅDþ^ÖE¤¨óèUZwºæ[¾o±ìu½Â5º<i¾…€·.N@2$Ûqæ¹WÎwTQNÁÁ' }þ˜ô‰’Œ‘¸X£ë:ñÑŒ\£¸wr‘BV¦G.Ä-±ÒwKk¸ÝÜqTl©âÜŸ^Ùh$6s©$Ã`µ©õd o¢ÌÆÄ|*ÀÎç¨gEq&)Å‘šNvÓa‡:&bÄ*#\säH‡’¬’ËRu³•ÜÎIø3ž •B5.lÌAPƒÈsˆB¬EjÜGËÒ~oªz ¹ƒ§€”[²ÁþÁÒ"&K¼s´ÀK…!<÷	k/
‰Ôzw‰ox„í5ƒWžWºä;zª”•Êjµ<·b_¸¥|^kS<pˆ¹Œ7€°“/3v`&‰âæ ò¨²âC0ª{[OÏ'a‚Å[Òˆ“À”‡“U*ÉŒWQ V±t©9VFëUjHhKC9Æ*£b„›èñ_þõfÁ ™FEï›CM$U1‚¹cˆ†zÌ?®¹Õ)ƒìÒå%é¤*6St†f°Ê¡U}Ë4¼Ç•¦ø­!sÐßƒe3#0	]A4…ŒäN¥}LÃôs/É·jÐ\™B®ÝcåBù…Rá¡cTN²¬c*%·‡Š¥HhÇYxÆ¯á¸œéM0·”ÔRÀÂøßñ b>šªÌ¡zi…Ü€˜¡U†ýò.#«øA”b^»Ý9(xy=Å
+@‘t]”9jëm¼«‚D 2VÈäª/ícR‹ßñÕ&Þ&°è·°-Š “Jõ{6“øB;¯à‘h¬øÃ¥UQ˜EgÔßúó¢€81XyÉõ¢¸¹Ö¨ÃŸèukˆ‹5¸ádx¡T—û"ÁË³ÇYån­¢jz9MáDçäƒkÜl×ï:íd‚}ž;­2iAi5œ}¼+ÛOÄlµFPGEÇ—-$W3óZ©T6pÎŒ­¥ÏM4“³Û’û‡c§ú6ÖÐLÉ^Ï%G Ïõ-oj*çö}cD„²N4PØ3Æ;_<©ubÏU÷õ%·ìj’\V$äÕ¦¸Óß{Ì£¡8V´+Ýn}ˆU:˜’(ž{Ýhq8è¾Þ´˜½@MZ, Ü_ybpáêÐä{dj^?š„T“×— ÉèkR£¸±ãw_yz|þñÙÉO²ê&)gz„èì».jŸŒ$M™À’o@´eŽðÜñO¥ÂNæ[V¦€2P´ »vÐ\•çþ‘ç«…Í5:«Xó\]‘J§Ózúrd\12å=ÕÚç™–6Oq'½ù¢Œ(ÌÔF—¨Ñ¦ç&õ¹nsaþI&0)ÍŽ5]ê~«i¿¼€ÆÍMœ€£UØJ*7Wšm™ÿ£@[XÎ­d«œ&ÕÌ+‰D²ú	vfê¸i¶^³ºƒ@X¥Ru6àûúúlRŒ‡O\Ù«6½â…1O=Q†ÃWé=µÇˆRXàÆµ¿áåú5ZSœÂ·¨ôÂiR(â™Üàœrä@˜À:Gž/q1ÄŒü\ËÜä%>4Þ[ð&5Ò–7–ÍV«ÒcË«ÇË«µ[Å½­Öî­lIœŠ¿ÉúéÇ4./ƒž*É•ˆ)2²ˆSpîFmÏwÑûž{°†ài¹õ®»AêaÁ„Ñ$¼‘èò‹yÛŠ&~¯²º—F‘à} .Ið‰à6çQ¥Ñ9Zr·­óSpÇ	ïF]oï]E\laÃK¾M¼4o#&ˆ.ßÆGdtÐ ±†¼"OðJTþ÷Î°k{˜mÓÛðsPù;/“ÂýÙJ£;ÑocF§ÔÀßm¶\øvSü_*+}1¼bé®—ÒÊEx4ðWI¹6Ñã£êý\}özòè›AI]|–„¾r…‡$ÏçÅ‡ÄÚC³«í™QªÖo¥bq#î‹r“ê@ù>žCEËF·>ÙšÃ8ÚÄ1`%’´SÐOñ“¤“–œ˜Ý!%V‚{,b,V“ÁÐÎÊ:-¡j´¥vüa×MðžsDSey)Y9àv^`ç˜<*T^XZœí´	¬‹æ ¬aU7j€sê\CÀ¨ e‡2hå¼%ÛêŽ cã…ÇráÛ% ’6úG¸Á½…-‹ò@S,×9Î41t™Û™Ÿøq¦Ü„›bÈ!*®‘,0Úâï[„©ŸÚ¼ÛeÉp™1åø‹j,+ëººHg¨0±a°R%4Í±>»Éj4ïnYŒJS I“Ž¯]!o6±Œ®2ºwá¢e]xqF$)IZ	EÆšH)àDñ1¼&ø5£›¶ð×4©Èxñ-[–eúÞ ‘R»—…gÉÌ²n“´¨+9¢–2ª%].ÂéÉßË‹Zš­˜Ž-Ë<ÝËÌ_Ä·d3~[¶ ¸	¢ì$˜AâÝ(Ü5ÜÏai\»º¶ù[L}K ‘ø?ŽðÇ¬Ì˜EQ>:Ù†ñÀçÈ”ýÍÍ2ûäü¦ùK(túå Z•L|WËbÓZ›2ó†:`p—s–÷`0˜g5œwúng¿Z`ÛVa&ªõRðã…> ÿW3˜%Fá"¬ÍÜ?²yLjyÑ+æ2S]^¸ ¤"·‹±Áè0*ø+‹qiÔAì>Î¶Z-ø}ÁðÊÐÑËkaÝ;üÌœapno üÿä˜Æsi7ã=šÂô2`Û”Þ«¡‡•ÐÉ–Y½^¬w],ÌÎð‰²¼ô…£×-T%ä’´”Iå^¬e‚ß†”È#qº\t°EF­v9¶R¢1’SÔh©ÈŸb¶Êà	4q›þž8a}%Éls¶¥}í™¾ö–—BB„jÕ>J©‚ZrõY98‡@s1èU=ç-ë²Z¼ÃH. •>¥,‘eZÉO<S&%•ê‚Õ™„î÷I–=ÉËŸ‚0d1Y†VÌ8ªµ™µÌ´¥1r€ñ¼ß ¤À¾Ô[£¨¨lx:ü/³ýMÊÉÊE›ìD¡¨Åib¿ïx£²#-;öLžy…Ü¦¶ÝÿóoŸþç¬Ÿ¶d|¯Ät’˜Ê¢`ù´§4·tŠ‰d¦ÿ1‚°øÕkG…g£ùU™ïÝ>™ížçð˜ZMvqÞ$nàÉ©YðÑ°ù-ûhŽð5;7åùñn1õ­îú”‹+çVÕÅ…K¹î-ÚüÆ6å3ª=däÃU³Çç©åjš7OÆàË;ç2Û9ÜÔZŠ6eUCôå†Ý"×L™ÛOÏ'Ó™dW§&6ˆ5:ˆÄ”É^-¦ªŒðð×hØé7'ôCj¦Í‚~8Ì0ÊRHÅ(Mæn´ç©+š/ E’–9ëþcƒd$AÖ™8g+Äl’á†”!;Í%uîœü Ëí	ÞŒDžíÓN¶yöqãBù+À{2p¸’DÏåŠ¨gãö©_ÓÉ–ªá²¦l¸ì©›”Îé;ûw‰ws°mÙGç@ýp)wÀVØùl[¨
6ÚÉúŽÊf¢#u’JüücZIð“þ9ìÛ8Ð¬ÊG½¶t”ç"åD”5ˆD>}Kâ"z‘´Gð´)Ú\6Ò‘=¦F-ëf#äyÚím)u:­A¥ö4š£}UÐ½Êð_fb¬EŠRBäáàˆ`^	1¦/©BÅI© ¿Œ¤fC’6¢èX_+¬úÇJÈP…S«‡ÈaÛ“íJÄ{nƒ·(fP£¦ˆƒß¢Pzáw	Š³áÿ„‚ltxÈ¯Iª¿ï±ËK¸ÇKül-¥C³EÎdÂJ’ûÌÆmVÆRiRÐùŽ8°6ˆdÐ?ýÂ‡úg³~¦tˆÄ1³qóô³#°úÉÞù1à’žüùg'?ì0èŠMšžü
àH†ºï=ûS`,õ3f¥énÕ§|]w“ý4°hR\Ò2ë‹ÅBÝ5#|RsET¸¶r¶MÝìKÚý–æGš’Ðÿ*š¸vKLrÀªÊ5?¼Hl¨K7ðµÙHC/Ñ¿>‘“œãÖw´ßÂó¨ Q¤wÎ£åU2±Zæ¿¡GÒ¤×«áo7Äôã·-bøk8¿'öÄ?´tùŸ»—Ý²l¹^,©S¡Ý2«ŠìN¾Ô–]uõó	¤
£7ÑÝÓÏ^þX¤¡—?,uÐ>}‚^ô²Çctt¿ìé*ù¡ÞDxŸÑ¿^þè¶yŒÞÔÿ²‡Æ­+ä>ÃÖì;–öžv¬†f.Î5S­Ý"¾Ÿ®tø«•‰×W6­x¹±3Òàz½²Òà:¯Ì4¸ì@gsùß ‡Ø¥ªÁU#]®™jÂÙ%] +þQœ(ô¬²Ãbdø‹†ô4¸Œ)j˜Æg„œ4“?¡{i2#d¶†Û®ïI½ÖêiÃRE‚«¶š×TT%ÒÐôbŠáKÏk]®©ÇÃUK³1Žb
qÆdPV÷5!¸ŒNÕüô‡í0a`œngÙ„c˜ƒâì¶¦-ü­e2†]üS^zÞ$]\ç‘ìIFlœÂ¡f
¤eveúfH…*ëžìjŒ÷
Jä«ÊøkÌ¦e6ŽE$4\ã{)ãÖr.ÇÊñ#cPæù­òi~n^‰…y—3©ÆMŸ‚«v¶yÛ<)¸,Ì±2ÿÈ`ÔÙ«‹•¸Ròß9Îì89€ä}Îmr§™HFªÉ	\S¹¹/RÏwò§šH^wêcÉá¬nä“.Œ-7Œ•Ô_„Va¥8°Jk£VÊ~-B0¥íW¡ô)ûË¥ð]¤˜4kÿåæí×ÀxqÛ UBœEçó[ÆZªp™3'^é=-èælÖR­|¿Ë<N‰q–xÐEÍ=Ï.ŠÌ:Mœ"éÙHçò$CÛAëÒ_Ó=T+Í&@ÇíD Srˆ6ÑvÁÆÍB$´&»óJH$£¨wYd(ZaSNH$#¶ž7«ÇW^ªÊé¿Ž83AÚ
É¦a¥¥LÙhÆúqô²Mj{ÁÜz|[Ê8d¯'·qxÇÚ¦’ÌÔ(ÝLëêO…Ö/ÒÌ1[dÕ;·iôÿm€S7RšÉ¾¨&Qß„¨wVnÞJ:
/#ÛÓ~yKU\œVDjŠÇ÷:3×òlaÛ![ÀLY
caãE|ª¢¤L¡ªo€Ã¥6ôúQ’Z:irƒ×‰ÂúÞCHq8ÈÒ¤ˆëœ€_.ýHõóB'·s9¾$Äìb‡úc>=P,ØRI	$•±‘rœ);^–lJš÷xÀ¢,òIv¹ˆôª—‘È:°eŠµˆ®±®ÚÄW-·HY¬KâpM/Ó0»XíÓR® Ÿn`;:{‹²<ƒ±Ñ’V¬ÓÙý_!òÒf2N•°j¦!f#«mFN	3HY‚‹§©%^5hJ’Ûx¾eJl¤—)½‘^“Æ‘ñÔ£ï1©{Ú®EÙÊüÇñ(û|²³++¹Pyª–ÝÐ¬iR–Y°ëõ¹{,nÔÄ
“aé«Ð+¿œ0Å’Ðf|¢Úù;Xo¹:ºr\'?s<Dùq/åMžú%ëw*I˜¬-KÏï+’©ÍKJË´žBËm³5E¬ÿìÙ—šR;¬œŽø%ýªú€ø‰0TÒ{’·Æ}Y§[tèøh¦sZÊ8]çÍK‘'÷|˜w¹´‹Fø^ï‰íÒìòè¬Œw•Ô-Hëò{kÅŸ+„s”{¯¶‚Â÷7¶pªQ“'aš…¸®>UŽOàg¿æ["Ìó„<—&èJYL%—·¹ôb§ëáIo¦Q3F{qpjØ"ÂŸbõß'-ù§à9ëEÑ&Á.ÔnªÊ:Úw|\MEôR#úVÅ+ð2‘.‡8vÃ®öÞˆ\ÂƒV+(;ºÊ‘Ú<n˜¤]Š*¬ÖXžŽt…V*¤IH)õq
©QÌm1‡ý‚nYÒ¼Š=(ÇFFvÝM:±GËƒÉ‘õVËgP`~Ùaü<Óvü+l™‘°êß7~ö':^®S9ßâ«).)–í9%õ“‹¿;Ãvà¥WGTòÝêvA×iÉ‚‡Ýµ2î³Î:Zn/*âŽÓv}Ù™)õÊ­j
Vá›IëÚþmà®MB×úŽ¡L!½XÍ»N”ÙtîBøÚD¥OZÉÀ÷ÒÆlsvîáâ#´aB¦¶£ð}h=Ï©À}YfU°ä6âwNÑÕò`@w¥®éFè ëxsóh¼MÈ‰2g#ÐÎ£à´O{â^ÒÜBâ¦Ûâ°/Œð;7/Œ‚ãÇÆ&IFQŠ.ðnìõzJÀ‡jð–¹m,ÿ¬u²€bÞ{Ï?
,Äåõa|–o#• d×èáòâòÅy„ÿ_%ÿ_"ÿ¿Eþ¿üˆäP±Y9Žhçà£¹mGÇÙÆ8j¥ÑN
UsÇø‹ì½àf‡‘…Ç¨Æ›g7¿´­¿ôÕÙúGÓÝøG°ía÷e7þnÿôiØ{¶þV;G-°#D-,khiÏ£Æ‡óÈ#”ÖðÐ7ÑÒ·}[§»eûË˜`gY¦u06—r.oÐÙAø×WžCL=öjÈTU!ÙF¬ºî9~ÔCÑÀ¯Ž¼$«Ó…efú-x"Ž1û‚Ÿ÷Âþ–ænÃ‚Ð;³Ý: ^S3éÕQÝcÞ`&Þxžƒ‚ªF,q}DöÃð½ˆôÌEÌÛ^*>*—Êlx´€&YrßÝKùòB½ØuCB|‰{«óÙeàQÆ0¸JB±UœT£a5L¡6à0S1	äÏÁ‹ˆõ¥<«,[–êß¶Œì²70«…µ?AoPX%ó:R5qßÆ„à¦"í^,Ê”Ù™*­Ú&0ÊÞQ4”³®ôƒ¥6¡ÆKN­¸+×¦}Òo^ÞµV:/wƒu= ÍðLq !Èƒ>GBcfÍ²ìËÂAÜ€ëŒõ’jŠ¤Laµ3³É"¢‹J“†A$Ti
ëa	ÁKñA‚þ—øù˜-JjšÔ\½Í=	'à"øÆam–	9|ðO‘/‘Å7Ö˜áQ–‰@`z:ŽïæJ/zþIù­³5&ØúVÛXÑšÛÐÞwš7¿ã:q§/9êFd:5¦áÎÙÉ/š®Ñjµj…[Ï¨Yè8žk˜ ìÖå×dâõ8§µ°ZcÕ.AÉ°RH$–~eeõÉÁ#”kìoÌ\H¦7–dHRaÙI& <sŽ6ÎÿfŽ8 ƒ’¸½š—Ð Ý,\t6&6R÷Ö;4‰t%G%^/»‚ p1Z£x‡;Ôô1©¹tûô„ÅMƒõ¤á¹²x“ë„æ‘7Pì,jFPL
¼%e“¤M¤PeôõCR‚óƒ˜â¢¦êÁ¸œÅi'‘?L]ª-VÒhÐ\ZXFD™Lãù€EX•ÅÚ*âN“(ÉÍí·6&U­_wÛxÃvÜî-€ù²:,D; Rq#Ôeˆ®óÄÅ,>$ì“Æßa6h‰ãÅmx«†42HiqXÊËKÊ®p†^×ÌBo
“‚ÝÐ˜…¯ÍÌ?°ÒuÁÄ7½VóñiE#eC™]¦Æ*½`‚¸I82úpd<é?*Î‰#jKÂë’FAoÑÈ÷ÛNœ‡s,#Ø{VeDY”‹¯{;ŠÁŸ[å
èL+ƒn›Ô¬V³ÐÝ­n§°x´ý±òJlQÛ$˜mñÎ7@ŠîgJqƒWk4£±‘6ö?q-³ %3›%dµäsacmˆ¨;¤À¨„mË Ô@I"Ðûå(™¯2„<ûðüM4+ÆÝÈJKw[F“Ã'ÀÂòâ¬}Gk¤#÷Ta¯‚õ–ïš~ÁÄ<¿'þÍe•}%œy‹­ÕY;"˜fê’È·FA…Ø%Çî¾¼žì("ó>Ë¡˜÷’ @ýJ^ÏRé«²1ÀzŽk¤´x>„u-O¢ÐÖQø%š ÄÿP“êØFhM9Îb¿/ë#å,{‘©­¹9µŽñ«ÑÊV«¤‡·¤åXc©	ëÈÛë¼ñBÿâ0¿òvâPBí%™§Z=ÖCe¯0(Åº¦BnìôÜŒ‚:ÿAˆ¬lÁCw|¬$=‡=³-	°¯m³/)e-à‘÷ñ¿Ì–~©ŽO‹4ùbÝ çâ™æìn{qG4MgŠ_¸›âEO¦’[Ñ:4­™³çÆ±ÛUüê:‚°ÿ¨S™2D^Az•^™ØsT­Ò¡®IÒŠmýž‰ž•|¯=áò*óAÅ+uiMÍ—¥›ž™çŸÔ§£—íðZ_h[æ\š#Í,,uó!–íFEN"Û™!È®>AµEAè9h.AŠþOH-4¥¢@[{O2™Gé2ê‹YÇ+5¢O&Ð²´iÖ
ÿ•lçx)ÍMâît(9Š¸4Ä474ó™ˆ}ÜmfjÞ‡’Y°0ê9g`5všZ‘9žÓ"RpÒéƒ9é­cÆsj¿T|\ŽÓ2‚ªÙxU,+¡ª¶¨,c/(ørB/€ï½í9]ò3¬üK“äÞËe¹0ñ­kSÚØ]YÔyí©†îÑ†™„ƒ[ÖJB¤ÉMk#-m;Ðxz§Óq©v\÷ËÃ$bÿ¢ÕX±ø@[dÓ±‰´öI®‰¾`×ìÚ¡\Tˆk¾e¡AÔd/clQû¥UI$d*TÛÈ¤,_4h[
{“²ÿi‡®÷WªF*™‡Ýw0#²¨€Lâß$(ÕXŠï¯Ø[$Íä
œúÂvRHÁ:ò:a?……l³–™¤N}9¡zèê5ëÀó¯Jõ±cô—ø9eª<;¼”Õm\+#òl÷H¹RÂ(ãy„¡m’Ê`XV.õg0cÊî\Goe7fÕ-Ê·Î(½3ÖæùldXãyÛ;t»¥¹ãÿa9ëö°øµ
˜´Jsµ¬X6);´Ý%ÃàYœ¨Ac=ªˆ°ülÈ×nÜÄrê?…¤\‹7g/™J$ôªÂ\Úk¢ƒÜs×“Ï{cç‹]¼œ45Ýuß>ý]È‹O½ñÖxôX²ÈE\ï…Q!­#à+³ô)"ÎD‘$fk¸øŠÆ_+z°e7#˜“„dn&×Ž¨¼+Ç5i4—±`¡Â-bªõ>Vme['c-ß¥Õ3³æòø©öáe¤UK#$ßƒ¦V0l­;—^À>íÏN>ñÎ%æ¹–Lo[á€4«d8R‡^è~[/ÐÏ¡&/$PÛ‡Œ@t
Ë¾®ÙëŠäjS`é¦º^ckuêZó¸,g0ŒÒZUåë~ÅP…„åqäàç«ô`Ço?SãÅŽí±<kÌ¬5vøÔqµÕ÷\ž°­žcÏ*£¶qä×ÓßØ6f~òÑZ‡~#WÞ4é@Sx¯Îaž„ÌŽÕÂ(ØôË™2b½Ö’œy™­OÇ¢
.Äƒ^D.>ÔšÑ0ål™tê¤I‡”(Ž3v!sp%éÀŠ>];áñ…Ñ]'í·/l°^çaLX‰|lŽi	>ÍÚyú;´VQÈXR¿—¶5KQ1’:UhÍU	š|Êo‚C™[‹dkëÁä©ÙÔ
/F2b5aMmûçT‰Ø†´A‚4®º<&Ð469ð„B%CÕŠ¢¨MÞKÙ¤ºÚ·†G Öÿº#È¦h*Xé<ÈªËÎlÜ£øoéÙÉ±þ—ÃÀmŸüë½wÐõ³“ÿuBsÒ’Ô!¿ãƒ¡ÏÙ‡ödà Öt.7ö RJZƒÊ„Z„n´Û$ú.'›™·qWí(ÚG[Ý5ð2ý/[÷ìäGáœyô–I Ý¦í~óŠXŒ’Ø}ÄD¼áXö
•Ùïáøø¶—ö·£ p’Æ^mî˜KU¡à}ôFÒ?ý¢‘¸éÛìæéîá¹"ïDQÏw_áõè‘ÖX“w¸^ßuù;Ç^áUù.^5ù»üö×wEXšiê…¯èš°"‹ÏdÛ5¹Ÿß~nk‚r˜b#2çÄËs›ÄÀœçÊü   ÿÿì}ÿo7–ç¿Â¹Qkãî–dË±Ù†-Û‰ÛÉYr6{ž`Rê.u×ª»ªSUmY£0ƒü°Ø[.Ábq·,6_0Ø/Á6wXŒ…ÙýAFþÝ_r|¬*’E²X­nIvÜƒqÔ],‹|||_?oò•‰Ò¾1c®kó¡pÃtW§XŒ¢4ÄX.gyß6•½jIkÐE«Þ&—ãØÊk¹ê¢aëŸ¹Uø(d²^<å~ƒ­È;„Ï6^ñKÆ‹_Šc¬ø­ ‹…ú#ÕÓq©ÕîA Äõ[GßD¤ÿ #oL>¿xN|°IÖ£ÁÀ%Á,6XŒ¤È.=J[ÔÉ´²Ø[2qH	·6Í²2»Õ5IUIM…”Ó~´û`‡?n¼•ˆ_­–¾²‰§:4š«Ä¹Äß~W‹7§Iq²mÂw-ƒEÊ¨yZê*ªõ£kÖ6½¸ç†o–‡ÃÆz@Tc˜©ÏLÕ'ÞoàYi‚Ü kë}ÿi…*.¼ðBE(}²šßr;ÚÝn²™t¶ªŠÏ)C®ªÖ¢I†/ÂõGÍÒ¢3ŽÉ”‚#,G¢(»èÒ0ƒl«ªp€ð°ú‚ŒóiH\q³Â¯Ó%ìz±L)[ Ár±¥‚°¬0"ÛìþC@z=J·²ýà`ŸtµtÓ"|™I¬_¦›UT&f®H(¶î›`T
{G_ïÕñŸ2IÓÑ ÍN"(=;Y­/­ÜêØQá»“"80x)+á­³O!àúüd| tÓð[)²ð>cÁ±ÛiZÒ-¢©¢^Ó¦	1`9¬áê9+ò|ù%š8z'ìžœ<y'ç€8Ý<.ñ='óážôàÊµ¹û¾×e. pÆþð‡ãÃç÷ÃÂ™"EýÝ¡ùT(Qµ8Üb7¤Qê`Â7Ús2&lÖêÔÉÞ…BÏ˜ö6Ž¿b”÷ò«£çd uê¡FÜ_½¡<=åuèã=|™6õ­×îøu£ÀNÿ‡?xôßñÞñá!/$ø†õt8)%>õãPâã	º~Ýh¹áRäŸJ–8B\?dèî©ÁŽNL‘·#@?Mûc•~æ‹Ýk|üðå—n^ÖYÑ§‚ü,I7	¢ð‘ÿÔ]U™Ô[³ï×Ž€ïý‰t£Wël¯O‹<¾j`yYÀ³­A°ÂùþÈ÷È¬E˜™ÒþXígÝ}DYí€µ7°”c¶éø“œšj¹©÷ú¥„£•´Îi\GV=ÞG¸‡´¤ƒ01Önö=„@}©¬óke
©ª³kºÊ‹N±M™`×9ÙÄžnge›.‹Õ ØOïò7ÈâI‡Ýì/v]ñÞAô4‡1CŸ4— ×Œtƒ*sw¯í¿¥æ/XRÝ4eà™iS:O€¶°qÊnY0wÖÚpR®•Ñ¡.K°µƒâ¼• Gö3BbTîçL#Öé™åCX+ð¼¿¡’K6«–ÈÑµ±ñ„„0’´I±C·‰à2K±q¶Ç†=gä7–rìÅeõwýF°$/œhº’Æ.É¡Õ†à¼aíZæ–JáÆ%,j^ß§ßé„ûw–zÓÖÂjìëB	€D/e4 ¦©‰°¨àTÛÚzôì7‚äfw \ý³ÓÌI,>^­ë®Ê[çP¢¯Vq¾$ø9pÝ¡µ‘$ ])—‚”àÊœüà«T²¥œ8€0QùÖx°s›òÞÔÇ|2[¼GÁ­3f·Üë&˜¹«´±{I_$f©«”«/!Wÿäè{/3`1†a æ6vn-j,;äÄãÔ˜˜åÒ×XN¶”7ƒ«	2ÈTÖðæ€Êµ›07==§¼””û|›«x>ñrY8…V@eÈ\@aÍzÔ`‹M˜5ãxðjUÖêQ´kßYWòL>Y)¸AÏ¸±¹¹ÖÎÛ[Cy&âŸ#ºÄª”’ÀMidÒi§ïwv¶¢gõêf¨Èj¥Òê4X|^o“6
.éûuÛ¶É>…ßðKCÛ¤Pø8‹J%%ø5Ø¨¡¸FFÐNÕˆ? ÕÄ~ò©Ûc*ÛTf1V…Ì¹íkð£°¬ÏãµÆqÅÍQ ”§„=®h¢íd[å„™foË9Šý§X?eJž¬’yñ4rÿ˜¸®hÕ¢×‘Äó&@ßx%oÉ®{IgÀJèÑ×AüáÀŽGZ/<nÒÈ±Û¼‚i“M(a´v3¦¢õãQ9äPÀÄ(r´«©¦ÒbâDV¯$å(Ø6ê›½‚ô°aÿÐùÐT¸Ó÷‚7tdüÔ§£CÄFEE£W†Ä(TI~}È¨€æ"gOQÛÂFN¼Å¹¢¥ÌÄã‡]GºB_xJÙÒ¯ÂW€”ôÔR'©½"\ýYá¿œèÁ õs…uTÎË¨Ù¯àº˜ÊTÌ]ßì{Iéì:õÈYÔV¡³úË†u+êî™ÅL–wk1h{¦ÁHíƒ¨«ª¶ìû{·oß„¿:­qâÇw†^0ÀýßZ€–7°•=n%”-ùÅdeÑÚôªFç	ºÏªjæv V‘4±FUEƒ°3S6Õ@ÃÈpt‘öE†#S…3Êž¹îÊ6~ÎšŠè 3†âÜõ}ú‚ä²tÀz´?ù$¦qÜîiGKÃ¶†)Y,öy‘]ðz&2*œÌ¬ Õï³£ùI«Õ‚¿/ mÁMé¯i]°>yÎ  frˆ.yì7Î¦+„SqKW½#aW•wÞæ:[T@s‰A±ŸÊ#6®‹µå:Jm¹ŽX[Î¹Üke8¬<‘×Àêˆ5°:uk`9R8Î¼…óâ„u4¥¦NÞµè'×È½`Ô~âmûwPd§ Ì±ùq~¡¨ß4óé$¹"ŠM%Àª·¢Í!ù1fÞe>« O'üéŠ L¨d¿L†VÔæäqvÂËßd…¦gwg’¾+ùäAh»ŽË°3o¤§IÀsÚS™‘ÍcS[9lñxQKý»ƒæÚ<­ÍwÒtØcÕ%!8Â¶Äá´v##“¼~‰v €Ö(!o_fIÝÌ‹.:Ù—DHn1YßZÞyÉµ{¿á<h,Á²P¯<€ci€…Ó¢"ÝiÌ’1Ä.Š°£+9Á*(ŠqZz@: þ–Ì+i6Y*¡a0ÙŸ×OqK¥÷
½LH^tBž1vlg»x%âµŠÀ%…•ˆjvœköt'kC9z3šp¶]žq9÷íG3ëër ÷Œf]Ì…(M»sŠÓ®…Î î@æ5–Pšû¥Œ§qQê/:_™"¿¦Öª:¬+ÀÂj×Q˜ÁòRÔ­†á¸’NvcŠÑ&Sd‹>Ã p²¢ñaN´}³eV­¾ ø`
Ð¯I‚Omjt¡C1½7ˆö÷V2iƒJG­ØÂñ¹Yxy¡õ—Q6æÛó(CÍ¦¼_ù2)Ýó_ëv~†D)Ž¾”39êQBVÐƒÈŠ$d„Ç*)Ì‘B–¯ÙÇã\0‡¥E­V¼Þ”ë8L¸S_@â±õ\Íæ5w!ACæãM7¢«²SNEy[¤ýLX]ãtlA:ãŽcn7æÃd9CµL6YZÑ¹—YäŸ!AvXi0R¶vn¢Jç¼ÁœLØõãux±ãéêP`ôdä†±Õ(q(È»ãï,H= ,o®0»ôúts*íîfô›§‰Í©‘®~B˜)ññ ™`JÐñuì×©"Ä'«däÑ“óî òÒ²‰“¬˜Ì×hÿ´Õî] ÇèÕ/ÔyÐô*Qv¢{Žî'øÈ{õ^·ŽçûœÏ>‚àŒrÍH§Ûm^ªS'¬2³Bi²B[ÊCš9«3Ÿœæ4¸‹
NG<vy~¸C\ÃS@Uãi.V˜PK+ÊØÃ‡#?Ìá<Y‘ôF‡žUe!Â"Ìh¨#ñGÿ<†Ø¼ß-hÀî[‰Ý•áT"fåyßDâêÕË,ÁëB˜ºdDo.U{à§ÜÏúY¾Hsb&bÚ÷ö¸ý¦Fñ3]…ÃWt¢‹::œ%^‡ñ“ž/ìl¶Ì2q—(^
bàül/xâòé“ÄÉâ™„çN›´¸#Ë°‹dO.h¹jÔ9Eµ	“-Ký…™vyB'5ýtÔâêLú$Ë£4¹ž•ØØ.ÉŠ²b6F^xÍ²An¥%z/-”Ô8…8Úk.-—¢×’ËÑ÷ ·ô{2`g¶”Í>½y4#œT†°î«©öYf“w7ŠR#@¤/L©™å
½Õ* 5›•\¡y©¼Ž,RB®”a
²–ëgÅÖWg²!J¡¢ƒ Êz ”^½OeªSvÇT¥lx*uÆqŒœ–~#ï|Ï|ú h.\ ‹ºŠÓ(È=³™*¬kÎŽûZ“T
u€I+bElóVYiäôŒJ®²=Ýº+ÀUÎnÈ52“éª–´„¡À³ëDKÜÕO…¨céõáZ ±ŸŽã,…®Ï*ª^ãýá;´Å©å‘2Õò‡;ÕŠgaIB’©ðëåŠÂ¯—Ë…_á'G!+{l½( ç8 ŠŠ«ð±W]eÏš`ÿe'ÎÅƒëS<ËyvÂšš^‡ß«»ë$ÐD?•eJix8¨$²pjA1£;ÛÛA'ðÃÎ¡M•:FkÂÝÜ»07Ü¡Çb~“¤s˜‘ö=Ä>þ1•Nîb^'ô¬j}Þäz=*ó”¦Žq´ä#Ô ™ „ÅÁKÊW¹ÞBd•Û€‚6Àÿ”¯F¡Ææ”¾j.•{à2Óµ}þ‡®Åƒ¨×é´÷ç‚v’Óµ…ü&hÿ-_ÏÆµ}øWí£8ÚÀ’&|)·ì{ÉG~<š€¹¾ª­ëP¯J¿…Uîá¦#õÆ¸Í0Õn^T‰Ê°Û^ÿ›ü£¹GC*ZSsØ¼Tû^a%s–U©Z¥úüÑz‚/óxÅŸc]/Þ#¡÷4èá©èÃcIïD[zÌš¼A†ÝÕQŒþm­ÄÅjôæ•¢EÜºes…Þ*¬3§$jSAëµ»”êJ®ˆ]ºz}úÿ’}Ò s[qÑúK"žPe¯¨Í^ø*`Üù^ð#™\ Ìb"pC¤Ø…µvÿ¢qF(?Å Sè{Ã´¹d®aMµ'bÛ‚Ñ¤ ‚QèÅ1Ó‹”xDž}-iÍ¼‚îFß÷S# •Ï„4iŽ.j­@à­TÿM¬Ž·ÛÜL²¶½ žKñ»²£ˆqï‡éÆx‹îåÆ<Ë7»ªÅÈóÑ3(p½GUp!ˆX†%Eb2W¥“12htÆÞ6+±ôŒñ—°ÈK7È|¾ëÅ=õ®¸»…w°õ•EÄJ¢`‡äÂ"-›ú:0¤nwr‰ÏÇ^¬e5Â,&Æ¬úº¸=Ô¿eÃ=šdå7›	lÒWœ2¥W™}&-y.	Ž²QÂðÂõ‰ôå—P>¶G¶Žÿ^âÕµ)ÕÀÃM|ßÂVLfÌ5*›ú#*šv|£HŸj‘˜µÚSâÌ›ßLímb4®³(›¸»ê€=„Áçc“µ¾è[»¨+ð‰ýÝ—´ÿCßÊËƒ¶¾è[o¡7¸)Þ¢þbžƒÞèZ–jk}3lXüm	&+®ãtÃ,y1û®¿‡*‡¼xÇŸãº‹û×öK?éïdšÜ]JØàSöïÄqgúü«Ëh1P2þh¢È{CØftŒÒÜë×÷AÏ‹{†nŒ—ì£2­ÝbPÚË•c3tZÕÂ¶j¥ÛÖ7>ÎÖNwMß×Ö êì€ÿ«k£áÎôvc™ÒygdœN¸ÒºÂÑ¶Â³¥ÒÔ€ÞNÕz~7Ó¨Ôxó¼"Bã0"T@¿\ª ËÚüKSÖKm°ÌUXEJ@ª‚ÇßéêÊ¢AÂ©¬èlPVád_Q•Õš5E%NÒ3!b&
R¨åZ)ðÑZTR¼^VK3q1ñ‡A)
cí+‹L5eQ×ËÏªÀ#Þ§¯Î½¯ÀÉ`ð:àñ“^ôÔ>ƒßƒÆ#»z%•g€åßíÐÒ|6DÁëøðwíùÅ7a‹¼ô5}Ìù	Y&ƒ£¯é¤Ïÿï‚>ò9í¹ôhK*rô/>Þuþ´q ÷B—ÏC¬!°e]#ä~e4‚ñBÆz6ï{IÊ‚h»uË]gÜVt‹în€!ÄŠˆ¯= ŽXñªl\UxÃV‚D‚í&¦ÒÀþÇov±}“©žÑØ§2{ð”——îÓ®w
ç”ºÉ·#=‰·•Dƒ1Õ6‚RÌ›¼k,…Á+bd¯˜•ÇÈ<6`¨‰F^'H÷šï®Ì]wD1¾•8é™üMåtóE·:µ±«èc—Y¥¦:¦N~R±.ÇªžtohÎÑ6Ñ]Åƒ5A0`ö1i«ú»ËàjnYqJÚ{ôÃ²¨ «$ÿ£Ê“U5ƒ'¬–c¹¤¿&øÄUƒÓÛVÆ‚}ÀþLoÞzÜÔ‰ÖgÆ3Çñ@k}æ/³¥ÚM©èMû2H+’…9gÕao+ªéªÒA*M¿k©d¶„T1±ûA¸c0 ¨y‘U’Á}Ía‡KöÆp†ZI´²º—}º“a!ÅáÔW¿9*@LAÀÈ©h)ÕbºHÏ˜Yi:xn#n/$"¨ñÛ= :ëµH?MGÉj»Ý:I‹‰ç­N4¤›;’v·Ýjµª†Â3²hŽÛì6ÇƒªHÁT(AJ¥„¬Š>•õ¢™p —ªO‰´Î8Y•v!Ì–›ç
>U€ÚU!ŒÞ²™J…ÙkYlì…l^ª&¡¨f$pÝµ®·ÊœLÙóìÁ ‰3Âl“&œJD+8_åY…e”“4s¯˜csïd%Î`eÐRi¦Ü'ˆÈä­„
\„'Õd´™G1²iÍ£ñÅG^Gœ(9Æ³Ìñ—_zŠ~Aw·3âœ[¢ã”¦ì‘¿ûI}WSÚ¬æ;ÚTØóö¦ø¾UrRu¤v…¤d¯`W¦¬^t	üGTÚhwµøºÌÝÜbR³âuÜÌÛù3¿k.j•t.–y°Å•.²¦$9¯%p¦¹@ýŠošUõÁd‘ûÞ˜ô©¾Ó\äIùs×—œ´—Z©ZÄ†ü‹<’¿8O}2”ªð?ßƒrQ/~ßaÿ	eqËI½ü
`ÿŸwŠ¡Ðô?™yÂ 	s‘pîúÜ-¬iµÎª‹æ	´3Œñg0m|AžùÃ¹l¨›áXývƒ´Ï›}îÓÀß]°Yª¼¡ä‚’—Ï‚’)Ù€qëèE‡,s{“`šÈ™Ù¯ÐF†/óòzLqë~Õ-ñ'ÙÀf0máõ/ qâ›~ÿ±wpCÑûÒ¬i ÖÒ‹o*gþUHâ£ÿKÿÏeþÛt¶j½l?0r¬+r0´€$ìÈÐØA…Äè 0î„BQ"V°„À$oDns‹ìÑËòÞÐWÍ¨°Ìn>|Ü¿wôß’Ž_üÇ¦ƒÑÃ#ýØß¾&NòaÊËµ¹ŸÑýîÌz”^›£hä‡tÈaDïðãØçl<•ÉÞ0ü,b¦I.Àa´h°\G·‚ï<£Ï½F•ÇŠÌpWL§]^[k{R»ÎûÄoSy¸Ÿiˆ¶¡Š}Óþ3òÈïÐ[¬òJUV2ÃÝ,trûŽhp KËO¿×õ¹píµþ¥2DÎÐ`-ºb¶Ñ›Ì­”	ñ·tÞ…B\ñÈ€ŠŽæf5gAÐs—4znŽáÅ¿_)ê¢[ÒW„œ‡q!‡Ìî}†ÓîwnrrËjx’îÑ¿…½ªWsIgXk÷/U´Ðz¿t™_Ù<ú×!Ù/ÔE¹¬âO–ŠÑÃ‘)`X 7±°&·åGªp[]CÕJ‘kàí2÷ÕÑ—ãŽî˜‰ý2ó‡Ì5ƒ ÓÕòÑ/ã /±¶á{1”l™fào§PÄ&BÉ17Ô,jãh}T¬Šâº"
UÞ+{ã†Áìda¯9AaÈ"÷Q×,(¶FƒæU2Š›WÐqG§ôªÕH¨1Cé¬…—ªK]T.’2SŽ0KÖÈKñcŒ°Ìfu¾
šŠ}ttŠ¹H¢©šsò—›HgÍ¢Ê+ŸïdûùDc7’c­•ê\ËBø52ƒ2mS“=0¶øTÚ‹¦¢T;Çå³…'¾Û­T úo~ªÆ¦ãDäTšØ‡bSeak^&¿«šF»Õï”B3K+‹rÆF¾®+9lµ›“]q†±ÿ˜•km`€Þ²­¼¥*é·èûföá-úÀN5`Ÿ=ºö
¥ü+'/zÂàJY}×	’˜˜xa""t~ø0oþQäÄ|*Ÿ¬œP>)2ÙAOÇ„!:EK<ôâ8+fúã1»üWô¿i£mÐqV2¥ils`¶@ƒÁˆ9çÂ£iûš8î¹’•;7¤åFçì‰;T&ûÇ€[9ÄE šìú[	¥×*†‹|fº^“œëÊ‹øñèGéÞäÌ¨Œ°!rKzÿ½˜¦Så¥¡Õ\ÒÀå+¼ÀöôížY5êý‘›­žþ&`_;},_ˆjË“nâ€9\@‚ÓY*p¿I¼E.)RªTp@Œ°ü^©zp|øëŽüžÕÇ®-V‘ZêAfb—ô"*oFôð£KQØKé´ƒŸµÕ¹Xt÷©,â|–É´˜=ˆ3±†£i±ÍE+ŸXF(óûfè+NÓ±Ž¬“v\b»hWìKÕ+”Ã¹mê•–YÖXVÍõÇ/þHÏ¨1XE¶	ÆhÖ©¾¥;5€«þ˜ã£o²sôOTvç+0þ-à´œ/£*ü"VèÕtÿ¿ø÷ïƒî÷ï†$ÁF?ØN‹§½“†?ÉÑë„ód³›F
Ö ˜>äÕÉD”ÝÁ¼S%Î…[,_•%@£›W¤õB|Ö»‹ÆóŠ”ßÒ“+ÉMÆ,üEßào; o•¬(îô›O(ñ#nu'Žƒ-/n¦ý ÌŠ÷bo‹°ÜíUá§-ˆ‘®+Fá°TþÇ:Ç''UgDÞ÷Ì†¿»˜gÄ~X9VSÀe‡=Ô`ÉÏ!nEþÏ‰Äµ~G^ÕTÔ)2ÕSˆêpÇ 5ÔÖ]ºd	ãEr„bS£Èg-P0Ë¹oóÉòèÙÏ¶BÿmÂŸqoËk,^ÀÿµW>Í·‰lEá,$³¤8À'Ÿ÷~ùð=×9r+
,~ö?Ü‚t,(”4MùÉâ§¶2·ò'+¶¹2Õ–Úœº?‹£Ýù`åÜ>ëþ^M,Ì(H J8D
“†ßü‹Î»v‡³,zý(Žþ’öÉþ “F»Æ:I(«ÙÃ.ñ¯É;¬^T|\«¾—?Xª8©½øÑbRnF=8 …YpÃq,>b´>ÓY»#ñÜŸéþG)i/V@1Åâ-/ÚøÊJÉò¶Ä²gøY$ä qnKïÑ“{dK³6}ò]Àr©ÑyE_®f’-ýž„ÿ¬dLÓÕ–^­ûÐgä×ÖSiÑ7ð×ùƒIÞ¬Á·"¯õ£ AA…©a´{#|Ö0±
xqˆeöm+ö½æ.ðºÚ/XQgRý¸3|öQÄJËç·4ÏÄ7¾|öÃp\«*)	Åy,ƒÀêä±ôžGâ(ftÜM­1]ØhÅuN×â³/ì—zl4û°³æ6&Éƒ—óT¼¤3?qãâ)Õ|d©GÉÔ>„ ïèZP»âÇrÞ<öÛÑnxF£Ÿà®ÉßxífL¥Ç#Íûbxˆ@¶…”1™¶³_—ŠÉè›_pBjŸ¥nicº»Q•Å[j‹®ð©!$8CB»AäJ­™~å®ÙpƒåÏþÈë!d±Vc”’cürÄ÷ºÏj	ÊLød¼;¡Ì;¡h…`î]W ¶ˆZè5%S65-6B`ŽjI©:­µ .j¸œ$ByÁUA	m_\©vúfŸ:{Bd+³TàWôË•¡ÈVXã|äu5è¥I5è%)ËØ½`	û”é „@Þ!k±BgSåñÂ;©b›íÚÃÇúA÷,{»'y§ŸÖQg¡ÕÎ@¯ÍºdI¾L§çåì7qùŒÔìw"YÚ\µÓjÍ²n+•èÔØ|·,õ95¾¼2ÿš@#ùRO$0IŠaÉŠ'†:—T;9¾½´8?ÙV³0¡ŒK_AëÕ¼ªô„cTÌ°â|¡¹j}þO–® ¯«ÕÖ×këk¶ï™íæºÏš×’Ý%EaDŽÒb¡¸Â¡E©ñ|e®1[ÖN ¼ü#&Ü‚ºüø¥d,~áèÖS=ø­ô”iFŽ²DÁÚÞ]RNbÇï‹x7ú¼¡B~S“‡heÿ—ö[Ã l˜âP.F˜Ò%ñI“,r>û¶üÜ§BÓ’S~Ó<«àã‡^cØi>ê”U"IŽ¿ªýæXöìE`Ka|‡ÛŽœVÐqÇÞÁ~òöá“W¬â‘­.ú«x•]Ú	þ|™ÁÄ¶äÂ'Ë1?±‡Æ(öŸÂ/Œ´¼g%(†EƒP7*ÊrU&F\œN¨ï&†ü¦ŠtÜò±Ù§¶OÛUø_1àI?¦STj‘*üªÜ¬ÿ.+ã4_‡Â	ç€´É>V	ad`@D”§ÑežûÝRï¥7åÉbÏ|½sÎ÷Ð†7žÚö™¢Ôdº<€”µ:IÖ |¥ô°	K‘èê4$ã˜O¿J°¾FÃ»hÄ..áëšL«–‡ >\~Œ{±þÂüÏÇ>–JQ~Ð•÷˜wzô1Š£ŽŸ$ÍáÎÐˆðpcñšX›ŒT¦ÿæÝ(‡½³{yö|ýûßŽ‚Çaoò)Î¾¯µ‡^æÊá‡áVDy„æ1D`A!\ã¿DF¸í­xÝž<›)&×v›|ƒIòF¢žlP5ì#ºSIv¢áÊ¤æ÷@Ù²·„ív£y°:`[–¯dµ³ªf…ÒOÐi¸lxY±ê-IÆÕ_¹¡çÒò
˜ !r¯¼Y†VC÷Ëi?g&æ¢Š¿±¢mä¯ ÷ñ‹›Pº$WB¤ªÉ¶©5;2<>üLÿxñMøÖZ[èÎð¨Û~Ò‰ƒJ
]½HécVoŠ/Boçèö~›E8Ó!ý±^ À8V»î~÷ ¸j¾IöÂ(•Ùl›§Snˆ`ŽQ¸1Þi¦æ=õÅmâPÝ«^ ¿©­>á3öÓáà.=dæ²ÝT…ÈÓª4Æ•waÁÞ§Z4æù¤<ÈüÅïXiñßY-¹ÁAWŽ¶…”1Ì‹‰ôa8pØ”1,gÛ-ëT}‡eŒæi†ÒmH»å¹ÇQ¾Ìð½à¨Ë7þPºÏ-ß8¦Â•ºš‹š8ƒ°:ZªM8P
è†ˆýÒ:6¢ÙÀXÀò<COpò 3*›XiFY‹l¶ò:ë~3z=9`{21"æ°ç0_¢DËë@Å!VvÉØ\j«-ÙúZ=D·äˆ-Æ¦Ó×E#8çä0õè"Y`¥#¤
™`YL0¤ºMÊ{ýê°U0·}–ìÚ­F)(#À
UÂÈùÿ{Õ~§kèÜ· à!”Ô7oúÀßƒ0©œóø-ªWŒ¨ô4òX<{]QË¬ºàD.2}¢±Ìý³z/–±e±2)¼W#m…\>œŸgå‹wýxÝKüÆB‹Š˜ƒq×Ob¶µ-llZÀf·>°×»—úCæ‰N[A÷ _oçÁõìlWCs	[†f©@s8“‰ªWÖ¾Äo.•Ãa²$ëÒÞÖe­Âø&·âT`ÖÄjÏaM^íjfã Í	Š”’Œ¶›áÓ/ÉÚC:…¿h¡sáL’5¹š2èeáJÀ„Ýó°ùŠ7Ÿ,¶®^Ñ™ïÿð‡±(¥ÿ„ÜäòÒTè,}km¥%õGž²L&WÖ$ûYÒh7ü”ð0›¡Öa	§*õ6HèÙ}BqEÏÅb:ú–õtJ–A'+ŠfÅCÔâ®¿ˆÜ]€„?:ýˆJå{ô¯Jýlx72NcTÛÊJÛu.  RþPÈpJéÁ/ˆ,€O&áÑ×{-².ÝÀ¾30;¼ÝNš lb` Ô*`‰¬¬íòÐ[êšYY+ñªM¡ðG8¥¥ö2ax(8îáTL%¾’"²”Åv3’Ÿ|YÊ·ÉrŠiœT¼~˜IÌä‘lmÛê>/WäVfžç—^dÉ#¹µeeŸrOUÆÌ†]Œ(ÈVµ»˜Wy+½Cv0Žð`9ŒÒ´¸
(:ŒL¢¾>J
#”¬®eöž˜ûLÿ¯¤:	 5tZ\ó5Ö=…±;Œ:P{i+z¦¡(ö¡Šüþg09Í·Ùkã›ÊÉÒ²†eÁZÇQ€£å‰ù]Nx÷º	åwŒÇkÃ0
%Ü•æÈ\?çCX°F•‚éÑ<ÂÜ¥÷„nQøû¡~j	X: þ ñ§ñLøoF÷A~¡ÿBœ9Î–m†+ú&%V6E©$£©¯ drkƒ¹Ü
ÛÆv%éi8 kGƒÞËOÜ×¨žEó¶$›%C/§ªÛR³òìœ»‹Ñ[
å¢cÉ×­q,d—Æ¶Gilá l|¿Û3iü1r~»Y+•™(žœÓf)YîPàR†u¿ç–üÜS&µü™¼ Îcó¶‹L¬Äú>jé$c²{Ù­B¦¡iMÏÅÄRfiûÄôd¹l.©Q•nü,VôT¬Ý’´ÞÏŽ¾÷´¦x7±Uyþ-XL‚¥ç",<ŒKš
Ÿ7#6õ¹ìÌ/ßPÏ¿÷Ç;ƒþ˜‰¶;LÂ'HBôú¦?ü^’EkYF.õÓ9ú·PT°°YK;Qõ¥dq;HåX9¹á*ü¡š8ëq=!×a9ùs ï7£Z*<«Ã¶ øœƒë*aM•°ïÀÞD[Þ S8QßÜ¤RS5'`7òûn&IÐ«bö;NWû¼!J}ÿè_é ô6'æ)hšàbˆý—TÏ3Ò
ÍÞ&Úd¯#NŽA6P<LÀdä£óqlªm4Ö'ÙKPégUÆöõJOCµ—aÔ†¤Êd:]S©.®Â§7âi¶©ÐD¶?H#h¤ý|¯b^0ÑŒ»—åTÌ†Š‰Mec…É«âf²¨c´Ð(0z³®Þt±¼2Ó…ÍxqŠæ‹*ÆÙ›0ªŒÎfnÈèá¶lÂMM'£Æ‰ÌÃF‰/¸Y5jÙ5&±lHvu6œLnØ²aó ¬ÏhÉÂa¦¥“[;Nlï€Q	ÖŽFV1‘ Âàa5yX<ÀåSZg>=[ˆU¢>›ˆfBRA…¨À=°Y’ Ý+&9ät­*%·›%•àwß]ù†3tá‰²ø*“¡OÓ')\Õî<©¹›WOºåsïsïsï•qî¹Ã3óð§>Ïþ=ßéz÷¤'ž7ßÞLDÞé
¼X4V8”^S/_IÊ9g_M‰´¼ñÏÒÑ‡‚è$n>iTÛð‹Oê	]|’Ø™{ú€œ™Ÿ¯$k[Ý}’‘^;wçØë79ç©ãócìå”<~œ+<NèÔMÂàF'® 4|Í¹	{Xº3 ]ðoŸ.“Ÿ]°	H7-Ø„?ô‚A=>Á÷4+BÏÓé‹¿rûX¦ÅYícxÊŒ÷±°‘o;ÙnÎ-Oõv4tÁzpŒ·ÞðÚïð~p|ø«±Iˆ›ñÏ7uYÊà£x	$Áìuôz;üuxãÇ°Ým:ým_~šhýæ'f€@ìjÉTnCn¹—_z\0CcÙ*™S‰qNUÍfÏcîloÀ;{s™¢g>£½åÇÂir¸3f5Å"h¹MW×g3?Ó_ÈN@ùK7òËüXÙŽ~gÉˆŠçéYQqý–—vú6Ž¤4=WŒ‰ó¤›ƒÁä|‰õA»pfKö;^w®´yüâo’õã¿=v´ùáÑ/Ò;ÿÙ÷ó`…Y'âJØPB[q`N*ZuÈÎñá÷Tíïaç_yáWoY	|Vj“ô¸²þÄt:tñfÅMî†B–%ä~T	&$ìvG×04ÄYŸÕ¯¼²ø´ÿ)‘°ŒÏ†“@õ?÷âÀ±|ä!s¢ïý	€lÿgUJÅNŸ¼/lf)ë>—ia54Š8Iù 3èè»@ð/»gJ»[ƒÌÛ\*9™‡) :ßª¡n+¤Ægnè‹*¸›4XÂã$àcJÈn¹O8€r)ªK¨ä¢T,9«(QÏüúk^<vd+{]à×ä5fEèüQì7<ßmj«‡4žÕ·Ëé½€Í«‹í6/S¾,Wè­Ä¥<yZ? Ì€žêâ½µ^8=aèû¦K×JFƒ mÌÿ4œ_`ë	ÜþØK #.êùÿ÷Ëß’‡ô„¬*„-[_0û–y­Œµ£ŽÁ=…<p^¼á]Íw³	ç5´¡úÜõ}xüTh×;{õþ\Ã¸!ö{P¤Ñmümçä£«MÈYw¡ÔÔr§?rÂ™ôÕªÆd,*¡/Ì»Äà—Èp«zºu•\±A`G›¸Ä@TÄý*D~>è*óäØÈªô£+)%jDù—Q²í¥N\è=z^Å­Î !¢Wk7¦o°I»i@_¥[ÒÈKÒV2î NfƒªWTMN<(ü}ôOô„!5ARÆ“ó­9¥ƒƒ’ú¶¶öL•ô†1=ÂáHÞÈýVjl&‡z¶¨•&õ‚O.FÒ·ýª™ÏÐtõxÔõ&Íu…ØýNù®–æg¦æÎòÜ­q0€ózÙE+”‚$ŸžªÛ«üèöNLž¢r–öQm+™±eð2°V‚Ðñ«S6¯Ÿk-ÏLª³ˆ­ ô†+6>ßºüWq±Oƒ]L1S¼‡CÔŒ±ñ+Ä(î{{>Õ•ër	1äl˜…½bâ›,|ýŸÐÒéÙs‰rÄÌiðˆA/ž?ð[˜ƒ¾eMÎ°25Î ^væüíØOúë»&ö°Þïa!+°¬þ]@Å`°•nþýœë·ºóøó4bÖak‚ˆvÇWH»ci"Cz{ªK™™h&  Òè)ëú®ãˆ0Ä™ŒH7A<Ð4Ó>*1ƒkðe`0åvJ¸ZU^‚1  mW¨)èêqRÏ‰@~/C1w½ñÞñá7°™þ‡4ÑöGLÖÀÝ¬0ÅóPËšë†ª‘A:N«Ö“VÏG¥õ¸Æ©.¦èæÛ0ìAC¥Ì‹Æ-,7¼ÁÜ>®ówdFúÎá	ãrÇ”c\œ­ýkæÿïÃ÷É­£_}¸Jå|É/|Æ¡qÅ@4"øg¯ÑÙ{¡r¥‡Éâû'G{“ˆë7ûx6fi˜<d–ßïÉVnÿšqcÛéšõ!llöµZºj>üñ«•Ht–‘jüaú0µì¢%<-Û¿ç4,m2ö’³I7îbiþš1«Øq†F's”üoD“èq
G}Ö™LšTìÀ»…µõkÆŒ"Ç™øô’,VîPÍl?R¡C!ÑYŠÌÐ¡8Ø%‹¸¡Z=Î•°1	KÉù¢G16~ÍŠUÌ8{¦¢“6d‡æQÃ$jÌœÏÈO:1ƒ³„[ãnÏO'âìV'nPjúšñMŠ?@Lb@Þénÿ—_½üÂÒþ$Žãrûf.wlá²œäuÙô*ÎjË³çœMæ?{öäê¿ßY¡(·íwý9KÆe+ Õ(|âÇ«[”¨u–Ú˜^¿È.Z4Œl+ŸSc2N“EnŒÆÒü5ã3VMãÌ$›¢Q$ÔøÌåÃ¨|œ#RŸu&
Èƒ6	ËÈ&wºAÚæÕ•lâÁNÊn«àºvõÃÊôC–òU‹9°˜7W ^!Ÿf4¦”<âÖÑ7€ðEä}1…Nòô¸Âº-àöuè>O¹9/Æ¯ä$ú¡ïà™…:ÈN?BÖ ·ŒúGßñôØL5Y-ãjs×®,ÒÍ–‹9ëQ’Þbºàô@l”mqÄcèpžóó:øÓ©EZöâ KàH¶N(ƒ€õ½DFÕa—´}&¢A·VìizyšžJ=§V%DŽ«UJïd<ùqÇK|™êÒI×Ö=*_v½X&Õ"›LÚ+,œlö‡®GùÙÊ¨W}	·ú@®;J§!EVmÊ¦ïj	wwEÎPÅµØ<>ü8ï¾Þ3VˆX3Ê «Àª…aõ›WóÊòl QnËbowRà¸©G™#}È¾u.íóSêrc(=/h;Ò†Ðêó—µXÇô½Tœã´¹RPðÜu¨¿þŸ¡	Ñø”–üå—0ˆs¿èwÂî$KÎo›ê‚›+¢Xy¤À§Îôpçþ=«îS&ŸÉCY¥32¬)[Ox’½†AJ~¹,¦¶¾¨iÀWz;•ëá2èÿ<HûëÑpè%J ›QêàÕÝÊ‹Ï€­YøvìBƒÑƒ­—ú•f»œT·`‹‰–A  v¼ú‹	¢«‚Î‰´ª§ó»¨o/‡Ž¿úKû8¤ŠÚS?žÆâV÷u~——[#_³Õ]ŸÚÚVõt¢•%…22ƒE¾Í`Õúcu}™.ˆ…€BÒøøáË/UBg²äêèÍ}†ÔPeó‘ÿÔõBU=‚°vvŽiâþÑŸH7:3¦^µ¼ÙÀ2J}ÁªB˜ñ#ßK¢ÐºÖ‚^º±R¯ZçÙUdÑÞ&Ogy®›¯¤Mç•Y¼§~>˜ƒë’ù*·8ÌØV¨‰ü p£“Diøšù>Ê}ôtNÛ¹Z¸4ŠÂ*:tEÞU¨”9+7<ål*àÉ“‡SàÝÎÁjë×}›Ÿ·P
˜ÿ
Ds/üxÃ(:e>JBÁ.Y(ØÖ=§á“ð•Ü¥ëÂVŒ_3®bœ8+AÂ-nB`&ob%Œ±3ç6ò“N/N‚}¾ Þ—,J»’@c§°lmC—ÝÏ·þÕ•§»ŸæøUÄW©;ã$†MJOÑ`°åÅ§G'â5ãƒvW™Ê¯¢ÁÒgÁÄ-7Ž¿óÄÈ‡—_æÑM§‡¥s~f£M†¢×±4rI»ÅjŒÂ81,£¨Ù˜úÞðBQ
.´aìô½ 9DØ°PŒÚš0•.±o<QôDZ=Ô·TeVÀ*Ë%ŸF7œ+ºXEÀ&´Ð]ÝÑµÓ8R%ì)-ÆîÊb½ß\ZÊÍ\ZÇt>VF<†ŠÅÚ÷¤òÕgogµËx£'ºFŸBâ¬¾yk;»Æh•xáò{¨¨L®]»Ft÷.ÜÈžëç¹‘?žw=ré“ß²uy-õƒ…Ï@2T§BÕfRç¯&3¢'W®p®›§¥Ã—2Š_Þ¡
‡pJÏ¸=’Fô @òQ4fM~ÖÐ,ØÈTj]éÐúñìÔ7Ç7ÂBóÂ=ÞVÆTÚøÛ)d£….‘]ú¤Ô!mÐmnG±ßCxt-Z+î&TzÈ–d~ãmâ¤šWèè®šóíÎI‡½²©à¸¦n{’Ó»µdÞµtõ¿w;Úó¾ü=gG´»‘×Cí¡a¼ÝTãÜ¿b¼ÀÈö=ºR#U\ ÁEF¬ŠD`â%Ù–5:ƒÈÃ½Üå,`~~¡•F÷£]?^§œº±P ý7¤uÑ6^ÐCêqP½‘TOxýXo$ëáíâí•ñlz0{v4wï\Q™Iy¡y(/0>{…ø¼ï[e©Ýà¢‡ø"îrñ´RŽÚrA^f£â=pZ1Ã„¶º£¶.ˆ‰Î³ËvdDøèÉvfàî1Ÿ“À ºÉKS–6©x9t·UŠFØèÉE J;ÉD0p&Á-%i.£(W¹°R`€–„ìZ3î§½n’ŽØ<7Ø@ÄG5Nð,ú0èÎ$3á4©¼tñŠ /iPóÏ¿¼Õt(KíeÒLc/dô¼‡?œš+JUL?")ÆÔEÇ/þ½C†GÏkÉT£˜	Vù&¬°J”7‰¨Uâ(çAèÒ1N
?ù‰MöØB³“å4cÁ¬™y‚pXþN¦Hì£yc}Í¢ìc™øùr‰ñs`;Ðuû„r‹~ÅFQbÊYlð#Ø”èv§]dÅ™Œc°JŸ’",{ØÞ–ÆtY|´5u¹}ùr¹Ï“
¡=µ+¦ô9Ñ1ŒT	?ƒ¡î è×[Ÿ/d²Òxì›óFÔE¥ þâ)t%ŸŠ'îŽÐU™^ðÀªáX`ÃáS_4ââH']JýžDõQK–:×ª>‰?ô	e9ð¹ƒæ£×ª €Ðö& wÝPî•2@9*ØMsØUJòæT%j_®£)4ø°}s¾JAªzÿÓÕ´¢4=ßblý*YyÁv†–!ëuŠI}êž!m×¦l«ÎQ~[Ð&kq²W× õ¨`!ÄØæJæ0>ÃÐR™üç®¿ÏŠm¤ YU5+=VS£á8Í¤ê“kºçVSkÚgÖTO¬“œW<Ö7ô¢uÿ–+\f$(VZ-åZ6ØÜu&TF}gÔ?ú#xâŸŒ´f$D}µŒ×ÌôóPçS¬»­cÁ÷†£?ÄÕt
™¾c¸Ù!q"Û‘Ò‹>øz:ÎËº‡Š.úklÊ×¤á£œrÃsIhÑ } ,–Hc³ôMØ+ËZÃà¯1}‡›ÝaN€n°Ìœ­Ï ¦ÄÀŠg&köíJa²f?\”jþŠ’¯Hm05ò_!—àW!Áqè*yù%fÅ`$OzôÇ=oÓñùøè(\|øOä'$ýá?Ð	!/Ð	VF›7à!X¦ÂÁ²_N^$¶cxy0þµøê¬
S}Î'†gÁ\ÔzG•óêö£…˜÷¬@íK‹R‰òR©uÖpÅx'¤OÂ$x®Ù$¡“bBl¢ÎOxøò“•?·ö×2ê= ÃèÓé/ÿ˜,oÎ/<Yü7ôw	æ¥/´h£»Tvþ*m|mÐ(ì5ôEªØGq54èh*í^LÐëŒã˜ò¾ª¼—½aüJÝó‹KóGBÿk³~©Çv×øìí}:ÞƒæÛûÙ`>³BŒ&4‹Pmó©`ÆM‰¢I9§N«Øô
£Ç®ÂjVYNz†!¼ì^ËFÿ@öÙ¿ÇÞ^k;Ž†}ÂDÕU²´L.ÆÏ. IÉH¡¤IVÈ;´•HªhˆÙ‹í–á
kÌ^œÛbàOÛÉ^i0€y&ÐM…‘ ZÇ‡mVˆ·j3k°ÂÙ2C&Žœ;\ú”3’r»¿˜Û-"·saÕôšMÄ+³w †	|ó5ç•Œ_5niw81bR*l”u.‰4Ñy]„%j,_ ûÀîNzé:râ.Ëx(t=<øÌÞGf,ª8 J§Ë0?\´vÐÊ…Fîß‡¹Ì@áðMntV½½G,‘½xÃˆ—h’·kÜÑŠ}Ü6âO»ïö0@|Æ ßª^Þñ\£'›ÕeyJÇžñ‚ƒ^ÁÏ»%³£â
ÓåDVÖb®,æºÎ 
ïE4Œkª¹»J!FóuTv-RÈª[ÍÒhJï#V¡ÎCÿç®WÐPy§ƒu“|†Ï~[s"|Vä Ú¬ÓŽ~"5N±«Î!Qš{@'4âU¢¦yl&6ÝÏz+(ÂI«•ÞQ¦­ÂÈ&(Ñ9aeF#Ó©©ÏQi2Î$Š›a”6½Á Ú¥“Êr=éO¡):‡älhÉ„JrjAN’	†m[ù¦{êÄD/Œ&ññàÔ?ã	u<cMc
Rí‚"ÆpÃdRÊ Ý²$;VÖ}¡µÖÖšàuûAÍ	=K‹»ˆÞ^H­È9î1ifÄB+ÄJðD\7‡”,S=˜ òÍ×Þ\mû–¦ƒ²ýõÈ‡êæUb”.VD(™¨ ýW/¿ÒïÈ"+N—D‰”§7w}=ƒþ{¸ñ†ˆÕÀúŠìÇ~l~wº„ëÒ«LÀ8©ýâW+ùKñn…ë”ˆÇ2SZža. »G‰-U'q «ÓIõÇ;öº"º’èqhš¡ZîU¦ÕË¯èÈØö¥ÜÏV‹4¶Ž_ü>%[ããÃ¿ï,˜®¤½RçêNù¾ûkq—q;ãdUüu%ÿôoeÆ9¶¯0Y«ŠÀRßÿkûá²æu9ß“så‰×9*WÎW´\<¡¾D)‹Ã /¯ÌäL’ìovA=pN³gÍíM…QÖMµ?Ýªšüù2ÝôÁ‰)mþå—2[y¨*äVe±O˜:oË—ßì³ŠÆ ±0¢!ï=óD÷# £T5I¾YQtÙ÷…(¶)åÏî{H^E¤Kã¤k*³n‘k„U}ã‰?°âÐþ›EO–:U,]ž¶•‡§…ãÁ@n`°3šÎhLî×Å;:9Â/JÑ¢ç}¹äz/Ö¤/£×HVJwæZ„p˜)À¦ÜëÍX¬Ïwó>Óxv þº˜P¿•¥lÞë¢1zK,uQ¨j)ìSzyÒm3] [œêLla¬"¾+}ý:ÌÌ“½·øl¡ÇrÔ9¥%e‚±‡is‰qPÕÌ$rT›QÉ<¯²Š/ò“Õ“M§j:âŒz¨}`´fÇø™sâ€ €^w^MÆhwÕ[OÍBÂ8¹Õ8¢^EÒž­¬C¥Þ	»î©ðc›~'Íóf½>-Í[MØG§–XÏccž¡	Ôà,,1øàóº5&Ö_ás_¯2žX›eScÞ™–­6CÍ>|“*»Ñ¨ßÂ§¬ãÞÔÝíTVÅº	ÏFÍ…Ï	ª½HbåÁdÌž²J¬×ÎN­š«Æâ`JÊ±<§ói(È‚^Ì('*Înw¬ llì¢4Ï²
d®¬?ò·c?é¯ïº Þæ òÝãÃß“VÏ›\VÇRI™?<E$È-ÊÊwB}³È’EZ\*`,ÀTU.¯ØÊ 5è•ÉñÐ¢E{Ðñ‹oSøé¹0:x©IÁ sË‹Ë—›‹—æÀ‚ýòVæ^!|KÓ8uk<k—³k½bµ€¸{|øÎ:ÔÝŒ$g‰¼Ë‡ˆˆÞÈÐî±i%+cíÜ8™©mMFV+™”‘‰Á1•ö¾2W»üÇ#Kã—ÀÄ¦Š)
-²X[6ðQ6PûçlÓq“;Ï:þ ½¾ñq†Ur	1wÈ{Q8Â}Ÿ’°¢/ðß¿¥”ŠQ|©Ù#bf"ÿeÔËêP€Ï³Q„ÌóöŠ{Sd™W¦žÙâ}4q€i)Êì*<‹-®ÔðøÅ¿ŒõÁå^³´Î"…L’lñï€Y_ ¾Vò[ºªø <kØj‡eâ}ùÕÑÚÒ4½”käóIðsÜÕ¥*% #3ˆ¼n–1<°@£ð¢ £ŸºwËzÙ¥e‘ÛP!ðð»D`µ–KÞí—`hS™k¸â¢ºlir´gSyÊäë›T'']ÛXT3%oºPsò  G^W-y+¹$Eƒq–T/ØQ©¡º­h'LÍpK‹«‡É‚¼ŸXVÀ…ðÈ®—zÍ'IJŸyÍCÐéOWóÔ]Tù¶®m!9ÛÞ¤Ý˜R0óå¼›óIÒ&”Sj4;aÜ¦gÎ÷ìÜþ_53âùPoVØE LõŠŽ€3AÀD[¹ËÄÁ[2‘áHJ)¼~…=@°Åô2˜vÀP'£œðù«ÈM­gƒäÙÒê$O'1½€0À ËæÒÐÄëtüe×0ºl¤ð¯±½jc•$=ºsŒ†TQ‚f7	tµñ•G­Ž"<Òp–W•ßrr7¤¬ã=”°/±¿X¨6þõ,û-Û‘È7ñÞÕ"û–ïaø"#°ÖâSÜ!œYì`RË<¸–qW3›ˆSþùq<¨ƒ%‘‰ƒŠôÍâ´·Yôâ_,LŒÍX@¼0Âú%£ TA„lx~µ(Ü£ÁK3d/8p5õH˜„©éáqê*åwÌˆÞ/ih±àaè_iÌ–ð]Åý»x?MGÉj»Ý:I«‡lu¢a;ÅPD†š´»m}%ÃìÃMá,’ _n«zŒ·¤{Ý¡'ç¨ä*PÆL¢·½œ(ÎK'ÁÝ8ÂÌ˜ï¶Àª~ñò–ë4ËS#HEª ›}r(1.?£z§ 
.ÃƒÍœÍðN7Œ,©"ËCék•Ì•Z8Y\1­îQ\­‡‘X—²KîÁ~vÂ^?JR½•Ð`]ÊŒ„’U,g¶% ÍþúË/¾‡´åÙ”´ÂÚ—õìj.Õ«ô-ÏÌ¦V£Í,j=ÿú˜Ó²7zUmi<¿lIÃ§bGÃ'MÅŠÆ_æUµ¡Spµ åÕ~–§QÈ¾’7¶³WÓv–óç7–³©ÎÍ»Ù»Ù”ìf(ËÕ¶š±’Œ¯‘Í,;fŠöEªžd/Ë$‹iXËX±YÅV†?¾ú–²<éôÌ­õ;ÙLìdº&³’­w¾n62d2ZÈrö1·é  êt,cù»¼Rv1Û$<+KPh¨ÙYF™…”íH7²Æš¯Õ0Å$c€‘$'ƒÝæ0M©gäŽ!™0û¼ô•áÏ‡¦1yŽçrÔ‘,0r½xéx(±¼,†²q#1¼Ñc¡Žƒ ¬/;˜¶7„ ÓŸY!ïgþpëáb©p¡\üuG$•–46ƒ©ÛGåk¢Äà¯\r ¬´ Fîÿð‡19úÓ*Ù„I»×>ÞÄÚÇPå˜¦Žú¨ˆòoF ÿ&PMÏMq°ÓV§ô]Ø'Ï4Õ¥i­UØPýìmÂw¶·ƒNà‡=VÙÜ©¤yq“CYsmãÓ²£	&Û¡ˆKî3bú|L‰íDáÜR–<ãØ)¡²UŸt#þ™ÊY‰ÛœÝd°ÅüÜÐg‹’&nëyÞ¥>'pjÖ[°Ù“Ü[¿Œ—_‘ÝÉ°0ÆÞ)‘iÃ!&Ó•|.é…þn1MÞÀ×(¨å¤ ‡¥»ªd½*€‰	&ç6’¦Ü5>~xÛÅcÌr4MŽ!½Qš³GþS?Ô
·ÓÆoT&®Àƒüi«ÝCÈÚsy"N]‰È¡cW³ˆó/€‰âG]z¶ƒhh6{Ð½@Ê„­ü–/Üu<yÓ¾·ÇAÚNá(¹í|*®W&¬óqbi^ó@™^.Rì[ñ:Ê»ûæÀä—¾—Ü£KéHÏŽ¾÷*Ü‹ÿ  ÿÿì½kW– ø½~E8×]$ËIæCO§õ@*%Y9%Én)í*¬V°"ÉÈdŒH‹TfVvSSv‹Æ´YÌ³ÓîFm£kºÐ=Û;XÀÂb>¤·þ‡æ—ì=ç¾ŸqƒIÉv•	HIFÜ÷=÷Üó>æPw?‚Îõšda4ä5$öa¯ ;ã¿Àœ…Å¥uÛ9½‹¹]øá¬	&}xe6G)¾ÕŸb™éÏŒ´]Ë—›q@’ÈÑëµÎÎn™Ðö¶0³=PEœB4†o†!ÞqTJñ.n› XtD-ØâøÃcž`	m¿U‹õ‹¹D »w%"CÀ*hêrö»—<P9itJ$ý[l³s"{fCÆ€ÈñC³¼än#šD*á*õÿðÐZÿÉÏŽ/“†¾*hè«‘4´-7^¾Ø›I*ÜÆ#hU€ÄÕµ¤Ê–|"*ÌdP¦ì—&krä»ÀƒÙF1Àdsâ!7’â†¥·<0Ÿ¤àâRG`>«^Œ,Ú)¸•M9{wEð—5m’fÎøÉ8Ÿ Þ XØ½(¶[N†‹±ZbÇìK,çouqr²q|ê•ï!»…€…zžC¯ˆòÐÊB;FLx'd«}!S]i.?]1å¡–$4&ò¨7VP­ÂÔÂ‡.¬cÆWa:îðTNÝ§{·|öZX+5¡&ÛL%3 4°20½²á—œ9M¬i©áËÉ]ô€ÚVºâ2#Æž¾˜v¯óÕá¾i9ÌZD9UöŒ‚r¸š!ˆ<5µHÞwISÇnÖVÉ·àp*èëÊúÚ%QŠ?TlÖô—]õ2­³–ßþ<$áñ˜ƒCf­â6Qv>dG™|psE"Ãî|
–tŽrnS¹ª6öªÁÄ5r!²0#¤€¬v‡Õxt¿˜Å[…8Ó2Nü¦v6atÙYxìt-šîä…9-ûðy[u&†ôÜ)hÈ8	cëÖ5cµéMAiÒ±døUí_ZÌÇ.ü‚Ùa]=³ø¤’>Í#\8O¥Â_Ÿñu2áë5£GYæ “&Ñ˜Zü‘âëCNÙìcô;?Èè84F¤×Cè’ú·¦åê+jÈãµÎ|šB¿}±b_Nx«O6ƒ\ÛØÁÿ
Ú"ò8F
¾Åge¸±6²©úZ»Yd(°§Ý+õJlûÎ^Žå˜„âÙÁ0=[ïmfãçÑB¿°ØOØi²è¼ÚâŸœÿnqvþnn­îðr¬%»sD.rpC×»_5,Ï)e¸rKWæö	qZz[EíšT>æ¦4Þ—¹'­Çâ9V‰l„ÈVÜIV"ìäJ®ë"¸hÂ\±¡ Ï3ÙÎs`=œ/^EG³tH*÷![¼ÌUsEBËwo$£Ñ¡_‰¨	l oa T ômtÎSJúû¾¸ÉÎwt•;èûª¦fùÛ ©À]&ÐøGXQ]Qxû
éOLªô%"GMÓ|™'eqþUÕ£ø^—²¢V¦pR…¬zÄ¸aV _ÐAzö8O¤dm¨qâÌ÷NçôËÖ+BJ?Û¨r‡‰Ç@ÈèÈã‰%IMá¥U´Ö¿Ï”tocÞcß¢´dµ6T!}ÜwÀ
¬§äeUÌ"ÔZ¬`6Ë.ÕL‰uõ:b –öúõWÃçäZYO ¸SÚ¥L¿Áè*Â¿þKg	RÜ
ÝOvxÉ‡³t@v¯êVE—ðÖ³b,Å+ä‘vÙ
ÖØÔ+´VÔç¡ÛÖö6Û»©„l»ºnLn«Ì}XØ7ÌMÆràq+ø¢/ßuô™–$€©2Bö•ó=Dæö\æG¬¢9<~œ<$$oŸZÝé·€/!Ÿ“W3©Í¢&Ïˆ`[å`˜1²{
{xEÿ×ôC0ƒÀàª2kØ™aÆ&Èçü§/°bÕŠgÌ²6oj;!+sØnxùì˜»RWOô“ˆ6Á–AÊ8é¦óªHúäÄÁ	îÏŠÑh?5Eã€?!U^åÙQòt>§°ïÇ
Jtw®]!‘­'1¦šãdÀSÅ*Ñ¡)S¨Aÿrf?ïÇn4ãD øÓŠÖ
õgV|Îª‘ÓèorŠçÿ<DyC’råšåÏ{L(©úéâÄ=Ôm>ÉúdåAª¤\q”0’°JÀø@Ü©A“$­Èïq'fBÐæÊº6ÒŠiK§¯h¸V@¤û
ÞV‰hu™º	=wÊ5&j÷µ<WÈ›ÑXÎ’ÔÑÔLÞü¡#u¶–ÅÙ•9[I·ëŒ{"bÿÒ,àÍX‹b¨A"ÜÑÉ»Æ6˜Wèü«)ã/Še€Ïæ¨8›ø€ž‰ëú¸®Û¸³|/v¨nÓ´FphZÝENEpí½Â×…Æx;ÁGLßði6Ë‹AÛËcš;tÎ—‘¸ÜÉ˜Ñ «fyE¾‘!†8ïâçåä¼Tlc&s¯JAò2Œœß$„æ‚§Ì@SF˜ˆLSÍpêzÈêø.a5¹<$éþ|”Îº“ùØ’ìõpÓíMZ'd½c§®úæK'Åª•¾w{¢±ÿA•j$xv³Ñ2µŒó^C»)žð_„oºéFùx:ÊÆˆb¡mD_;Ã?üSšÌÎÿkË²:`»¼HSJ»»7Ä½=$T
åî¬¼‡dŽ.; ØU/qâÞ þ,#ÕÛ€ezÝGW'æeW“Ö`°öèÑÚ	ù$lÇ­»åðfp_v´[ûù|•‹oŠvM\«}ë¶³øœpÎ·{£lrHIõ3&xÀd§h«¡Íˆ´Ê‚«ùé|¿Ë’”&ûZ^’˜@ÖÑé,+AøhÞ×n ,çûJ(àíÙ,=éå%þu¦,ß
á"|¥n%ë.¶ÂâÒ=6ó‚)njõ(
£¹¸[qB¯GNælðÛoûÈçÏJ+K°âÉ×ø›¿2rì²$?¯Ð²“Úß3áCÛÉBYx¦5Ñq‚¸÷†—Ì¢yðî¬§töÞ¼þß&‡[!Šg1‚Ç=HÔI~F¬{’°/
´^SX]/JUb|›ê ¶lÎå¨ÛÅq:m·Éï­$œ¬&åîàx+¡NºN'ú¡ÉIµíq•ÜLØB“ßÚÂšÞNjÝª¨Ò‘V»n›B­MûÐh
¹HÛl€kâM'ùIBV¶ü~~œÚxQ®·Ü{ò0k[ü2;¹y
3'',à™Ž¹à¦¬Œi§UÅØŽpJÅÌób8˜¾zMÑ’hÇ<ÎNøº”m Ç.Þ¼”¤)ÿ}oœæhÛßÚSPXÍù¥züsª7Bn˜uaRm½úY‡uéŽƒó(ÒN¯C§€·ÁB!ñJ¯ZRÆÝb!8²äXœýYxÌ!¹/âð¥¬õ¤¨P>å´ Vn}yè†ç_oÉvÐ.2´ÖXRÒÌ±$›B¤y ëk—V^¤dÜÔ/üð“»¤©¶6ºŽ“L¯$Ÿíýj×l–_ ÆÎ“­$)vŠ'„v¯þÊæŸSŠ±#od9é0B.J(€ëV8sÙ Ç&l=³‰uÍa/g€3jÕnÒÊvZ9Ìµ–AÒÆ±HRªáñSœ5$soì`–ú…‰ÜÇ,²¸RÃ­(‚55o;ÄÀÙÔ¬›]«›†É‡Ÿ¾ùú§É1àt+y„“`X¿­pl­fä¶zè˜RYm**†TŽËåšà1áÊ´ŸT—m	Ç+ö[¬¤?GÙAEÙ5úûÍïØ!ð÷éoôYôJrIdíNo–ò¨„oH±8šr5×S©U6¥$&!+Ò…vBäe^>$C.Æ$%“›7o&ëáò»B´¥#RAížÔÛøÈVÁgm-¹›‘³1†Ó„ÁÔ*/ç¤Ì%z8§ùƒ•GYÅêPä¦gAHI0ð'ïÎƒ7¯ÿÍãÉÓ7¯ÿa»µê)$'uœâ±UÐßzÄooC9™Ã¢ºMg‰3÷jæI[®%9“¸í=¶<°œ­'÷>Þ}ºwïIËýzçÉ½í½{­ŽwAâ–M.¹øÿõã“ŸžÿÇäÎöc`–¿þ??óÎ[[BÅ4P“.]sšÚ¤«ùéh^îä³þ(óô,êY’’†µµ×kûî¿øìéÞ×kûî£]X¦Ý7¯ÿÕg	»¸õšÎgÓ‘:öSY-ö$f±žŽà**—¸Rî=ùøÞÛwïz &y;ð÷æõ¿Kž~F~­%¿yý>[ÖþI:‹Š?”%Åß±Ð·ÄÕüìÓ»äœ~±÷ÉÞöÃ%®ÖÎ›¯ÿáÓäñògäBÿîñÇq‹ÔÀì£v©„ÃßÒ¡oç“ÇO?y¸{w¹(a)Ù9ÿÕú›ÇÉÇvQ*øvã/…ÛN¬ý¥,}³rçÕ£lv¸w»—Oú£ù +Û­ÝGŸ~ò„ ¹å-ÂØ§ c¿Kîý|çÞCr(Ÿ>¸wo/nÉª,‰ÃÊ‚áï˜õ2Ü-.››0¡Í6.ÇnàO]›tì'ivÒQä^Â$yƒüà ›e“>îO:ò|ŠýdÖ»Kªq±dòäËH+øã'èÞ÷Ñ>»ä*îÛ=G½GŽˆY±5 BÙS8z­l ^Ä8¥DSk•5
mvÅ*B†è‘vZ MŠnÓ•µæÄJþœ%Ä¥E
ìQñ¨]*t@¼–=zú°æ/f;ít0Èœ_d¼Jc¾þÝ -Î™°`¨¦£îõ`‚	ø€”@…­¾³:U}ä³†lÙfR\ZM6¢9Ë \#A½¼‘g;în¬mÖç"0¢:¼ïÇž‰d­ €ƒvµ¢¥>H.Ó?âJ¦±TEó%‚½}8"4ìÙ†ø¿¶4=@¬êRÀÃKFâøã½û-½£RófmJåÐBKÁÑ©y¢¯}¸®øIà¶lX»l~K‹Óª/Ó:ûšâN…ãXxo1‰^:$Ì&tp–dvÊ¯[M%Î »V8¯ˆøÐaÍ‚
-7•nØâ
 u…ùZÖ-Iþ‡S)	KÁ£´‘ó=}á´#õÉ&ù”6É‰R©¤Øj€ŽI¡˜Ü×j›ÐzF:sIë%ñX­æ[uYíªþŠÝ®¢ß’‹Ì5]Qð‘h’ÐúÁÅM¹VáR£ãª‘òæÊyoÝ¶Pr¤"W}Y¥ã)AÅ¦fÉ(áÒ-m•eÈúKsµî’’
Œb–`’‰f–¦ªÕŒ‡Ìü/Œ<vŽºW	 _5¨¤ z¬%µ8¡ˆ“qÊ¶?ÃçÚrõ™Ô˜Öê W1Û®Úhíð(gvR ×#‘Ú³à÷Z4JÕGÛ1ÌDÖç¢±,®Ui	+^p–ÿ/}f]s$èôƒºWGŸÂÄ •.¤Š¶;óÒ?ËØéÚ"q8‚±j{‚ZmŠ)(]¥œ: Õt¢<êS$¶8½ @×Ü+4‡zD„CéÃs)må7`Õ?Š}`5<ÿÝx‹ÇöI–°úÁ©µöÛÚ¹S`8§aùS»,Æ]­ˆvÁœ]jg˜Œ\‘Ö†N¡Š%idy¸È"Dœm b$ËÀºa‘c­ÒXÃÓ[¿yý›©MwjÅŽ÷„ÇƒØ‚3éË-ƒWSXfðÊìX7´Eƒù	£DÝa°ìñÆ™É(º?H:€¤ôë§Ð!ª]$H,Eáú6ðãrñ¡Nš?Ö’R	Û®…NÔÎGÞUôc VW–åÏeLh™H¦)$ÔgÓT?
}AmLÖÒƒªVØÃê¶Ýjt£yW"öN4íø(Š¸~¸Ëo Æ–#ÏçÛTêõ—`ËõúW“èCééDCÝjHˆÇÃ¡—êÖM”#»2©S÷tûvbÂy´à1eSl¶ Û³Yqô½ÎmÉ”i#¨bí66mŠé§fAV"ÖXžLõ‘zßåÚGqÖl’Šº
Ðj<#Ñv#DcÀ½
jô2\°/Œ®Çõm£št°¥îF³ÁñáÍŠR"áe`ø»é¨tMH„”Ý¯Ñ?QÒiþ95öívòâƒ÷•‡®ƒñ‚ŒüEm¡ú»—~"å·ôS+Ñ -F2ÓÛõÁ¨HÕ“Þgw3dGZhø	Îî'ûÂ¦ÏsÈP¨¾ïôò¹YÛíg/Ÿ£IëK<÷-ºÌ­N¿¤s!L!J…w¶;Ó‹$å(‘ùôb“B[Þg¸¸«É Uéó­äY‰p´
iÏW“þnÐÈ×þP‹l&^‚Å7x»ôï­ ]ùÁxäÈbÜ”
CËÌqÌ_Dêó(O*CØ–Z„…jP[ñýßRÅ¢3BLýz‚I“´ö*›ådeå‚jÌ2ÄŽÆTncûÃ6e»7•¥€ƒÑð[l{5vöGZrôM÷>­¿?wØóEäòŒ"Ê¿cÃŸâb5$•ÈeÒCùxt‘¼Ew½Æ§mu¢\õŒþ}Ôé&elr¦C&C‰§Pãñº=9 +/6¹äŸÇ÷Èþ¸¼‘îy
ƒ`qÊ‚'YZÖjØõ:£eë= »â)',2(7Wã¯ûµ0ZÅƒÅµÒ·†OY¥³*Òw6a	¨A¿'Ý€Ú 3)‡L_vcNB¤ÚÎ{FVn=„L…šž–#}KÞ…î)LÂ(=¯Ô(@âþ«MIÇ•‚„\kCñ•£ùV\Dßš7¤[è°¸®'ˆÒå3,:wFT3>9ŒãôTQÑiT$Èj6‘~„
°cjx™nwrþ×'‘ó7ü9=±ÑÕ'¾àè˜ÇÇ—®L[“zatu_¨ŽÐÎX¦æèÓXó>…Žz|3¥Çöê4VÚ¾¥y,sWìr+†wMÈòé±•ô¨ºÜÇÛ‰c	6 Ï²¼‚e}4s¨£V©	k(®Œ9&¾ùe-¾ù•o5¾¹°Aµ²r,!~¹'xw0p8¨w|¤s‘näºêœªt»^ßÉF#öÎã°C{²ïŸ¥‘
ªŠÓG=ŸÎ'àÀ"`µ·!±GŒµ+¤ÆL9ž!¹SäzW×]q|q?jÍ\C'xïX¿ì»Æï“€YWk0ÚzÃuc(Ð1#Áƒ£D™ÿu0Ïë8½ÜÄxÊí’ö]R4KÄW†áÜ™>Ð½’‡„ˆ ã]Å€tC`É—`˜õ_âòœe;ÿŠ&ûíÒÿ-Ûx6ø[+ÿõß:Ž’;+lÍ,^ìŠ¡žX-BÂÒš‘Ëß÷5Ë‘AæðÍëßCÙ7_ÿ·	†àŸÐìÝÞÈb/‡9Ë+CDæn­\|÷Q¶˜ì¥û¶@6^ƒ9­6¡7öÝ‡Ã¦´éHÈ@Ú­t4rwQ´.ý‰‰­@šVÈT´¡­ã<èz
Ì—$o¢‘šiÀ88ìv"c2¨ÛvÇ×¹}†éÔe8øiæÀi·l-¦}6÷ÄÉJÚ§ã“Z‘êÌp7ÖöÝÉ˜Þ}Š‚ß- ø<6… l\ü= Jì(ðòÈƒ#òì+ÝY‘†lÓ‘rÕÔ»:÷*¸[lgh*ºMugVØÚ3ÂG{åè¥ã+ì¤lœÄŒ{y´Ì²ßøä¦f)¿(Xoà¸™µ¾ÛN$1aáEÏÿïÜƒ”™jpâÓìQ¥Ïœ×ßLÚïv/-jµqÄÝzÕ,·B*ÚÔ,ëçÓ’4õÌ¹d½^/cxÛO¨è¿lOzXò`•÷¹ôUœÎ²Wy1'Tïa^È4n¡B›>\ÒYõ¹k²L¹Eg+CÐ…»6¿Ôt‰aë—¦Ñ_¸W¡:²-2£èC<½x,üÞÌ¯þÄ6”æ¹ËËþ¬ÓŒ\XJâ&%Rmâ&.=!ÈÜ¶M;m·ªò%&®Y‡“›æ«ùáæç1åMx^J6Ì±E<Æ°“¤2oÇ‚u»&\£~xÞ£Ç7 Ý=tö'‚ƒä±qã65GHêç!'£Ë·‹¨\ó[i	¬¯,¹µYOX­j6ÏÌâg+ª ¿zö¹<Ãá¹ >`gáPüll†4?¡Ìè® ½!ü§)†<w—cü6ÇÇˆ‘ý¹‘mñ)ºŽzõ²e[(ø¦a«€ÒÜŸRñ«HIÎäü¯"èpByÅÌÃ3áÓ0KÒºƒÂ ·LfÃgHÕ[U/=Æ™)2(‘c¡çM‡ä\ÏXgÌÒ43ØÖÎZ³áš`4uÑZÔí¼0âòÜlDÁ‹(T5ö*
µ¾ŒW_¨zA|2õÔ,'„\1[Â$>l|¾Êz¹Ä{ÃƒóÆÒß¼ÅÞõ+Ìxd^cží‚ðdààKm`»ºMÆa\vÖ2V‚^‡Ui»Ãp»ZÚJÌ6 ßGùh”—>o;Rƒ=ÚB»ã‰§a{0õ}y¦JPìço^ÿç49.À|Í¿þ#«Íü,hëZP¯u%‚}-Yðµ«ñ:jÀ¹htI»Èº£Á|Vââ'9bÓè\>YÆ)ø-ÿ™é´°6Bæú#*q5®•š^~T1¥âfZ9ÏšKÔ§QõeYÁ¹â%Ù‰£›Ãêô¹{Ôy¶›a´ü B°}©çU­y-UÈ­ïx¦ê-õ Ê?†‚ww”ªšŒª.ÆV{À]nKñï†©èæÂai†‰€'ùÅÄôs:î$7öfÙz|6Õ)c‘'Ým¸Ù™
áûú:«{ãgäÜf•§ñz3¸XÐ‘N©`ç`O,±³«„#òG§Wöj"Õ2Ê†„ÇÂEÃ	‰xšâG–Eb™#˜)Ž[j³Ë½1ÌŒy,%,Wñ5ë’f‰}Ëëüxcá•Ãi¼“eóÐþoyc# 7]¾;Âò”êWÐÜâ],#§sbÖÍ²Ü7ìn&GÝM+Œ–Ð&§“|Çq:‡P¯ã^¦,AêŠªÁ­5s¿ ‚[ôâ!BV•“ùa]Ø!þYY¦‡ˆ^_hT\{ö¾‹Ï¸ …‰<T#^ÐÝ2h*cî{»XÞ“éUzN
¼…ƒœ§Œ+ôçn÷_?¡i(Ñ#vŠñ”vð'ù”ðj^¿%Ä	ÕÃY]1M5ÉT¯Ô;Ë_<^l€+¶¡Æµ^g„d`½°T[;óÄ?q3ŸµŽYË‹€àö”!õg©•ñóuÌsMÀ`®k'@)lp¥­uŽ6Sá;®%¥-ÝV,ãAáQXž®æšdGÌ
¼tæGtŽÜM€·3ôkïZ/¥Õ°—î—´)Fµáó^M5˜v	`k%zùæõïÓæÚŠ·æHƒN…~=r£úl±!µJÝMÐ§P¿á&–#û*ë,Ž´ò›kóO½Ù6ÿ„Ì·ùÇ0·cn¡å§†Üm.•’[M`âÊºmÎí¶ùî^³í»ý³	òé.ƒn¼Æ³î·èþ[¿õ>kÆcÁÍ?þs_³¯÷á-Y¿«ÆžCÅ$m—ðæ‡Ü”kœ‡˜cUMp$_ehá7CÕQ6këN=ï’9†žf#ò#|ÊŸZ¥âZEÞ[¤9”Áoí]¨ªHËªWÎû}Â´_ põ‡8á×“¤ÂÈ×A.àE õ3ÿIŒ;‡Þ¼³šàXŠÄÀõqïÄtyÖàÏ³±ªüõâýÐ!ôÞ
Ñ*`ãÉYG¥ÜÈƒó¬›/‹í FÅÐ&3¡]<Ü6ã´üº»fÈ°^UØëÝ|/Þê½¹\8kQÎ™Ù»ƒágND—¾Lïû]û|ÒßìF&"ç1¡8rG©dy~Ú¾ŸP‹V¢u¼^ŸÎ‚ÿK‡Ç's÷üðÊ«£çÉxÀÜ?/ƒ·¬ÃÛ“/ð³K› –ì(LŠ‰0sf¦;TÑÅEù$9Hø÷—E1†¿–$ã‚}:!¡ÊuÕ Zèû¬Œë²U PÞ?-Äº<­Òªìá)Ô“«bÈ°l f†áAÌc½d¥ÈÙÉz áTÉ_‚Á¦é’LÎ³¶±®KÔº€3¯’?ü!ÓÝfmÖÛå~Q½é:Ín‚(ù)0Â
::¡Uw¼°SgŸ5C¨÷V›ôK‚#=±NïqÇÅýàRu(šÒ$9y|l|úK‡)\•ë¦)šð×¨S2ú>4dPç¡6„¦-P]Aš›¡íÈÊ¿˜£ìyy•áÛù
’ÓáùïkÀ]Ø’Vº$×eòpeg<	¦ËJH`>Ž³g¹>ÎÏ¿QÑl s:'äqèú­ƒ9ùqò@-F:&ƒ"%ÿ³œYç¼]I¢=îÒ®3àÒÅè$ÜŽ@­ÒW—Öáíb)™L@,·ÏÛÙD„}êîü9 Ä›¯¿;—Æ«‹øNOí(M€1‡î	ÿMæ›%Þ%¤°]ý¯c•«Ü%àÚ:T¨s °çl6~8Ë	ü7`I– ò²;[÷³^¯ç¼WÇ¶Ž»Pà9µ—„ÂÒ\Ò-Q2é‘Ò`	d\å’ÿx¶y]¦yeaQ1:„ŒnÐ^IÆ6/©ùjFŠ÷ÓQK¹Æ)	Îcd(½4ïu¥}´á¾ê}k^ù‘›È½±úwÑÓæÂsXQ×ÚÄD®«”ñºh%ñV¼
­'Ç`¿µ·%·)y:„p‚XÚS*BÅ^æcá;þ–ÓÄCqÜŽHÁ õ@—eòƒkÃ+5}Ç)‘¸½SÒÚÊvú"<ÜÔ³ñ#«@ñûuCk!WE&!‹	[3ÂÇ‡Ãüüwc²Ôo^ÿåäÚ¯Ë[¡6ÍPlb;—…¾W½Šr‘$€`œæªNþïÿêoØ4Èß=¦àQ“F"6!Ð¢¯]‰DfµæKÚB±\]/ƒ]sjÁ¦-ü´Jšƒ¾ÿS²3èEzÙä“¼:>þû¿ù? i«`¯*îç„žmotÎþlQ¿ŠÌPß<ùIm<dïÍëÿ'âXèsA;÷ËÈÔ Z.Õ˜˜Úâ’p  ó”£Å®(†»ñÀyáõß§z¾Ç‘ëîì¾{úYXæ1CŠºô\'Œ*óï×ÚïQö¯©„â—ž¡%}í%VZ"rîW¿(ÿ¤wkgxþ;r/¶jvVâ6,;Mü‰]º¦î’bº{ahÍ:l”BÔtÁT“n¢ Â¢÷È¢ÜûªãßzÚvÊ¨—)(ÉC¼9÷EõêÒô#kAbpÕT¼¾’†.”éÑ›ÇuõDJƒt>ªqŒ&`uM˜¿ÊÏZ>™$‡œ0wè¿¹´Òö:ðZB…cxÉV°Œvë>VfåÖçàâ™P[t’TùF8šKÞ®wŸ?fiB5Ç¥töU¢KqY'K&
ò¿¯0òÙë_Í“É›¯ÿË˜:› ùÌW =Påï§þôqþbÕ‹Ô°°~­c­šÑ•É-ÚVe†õ‡†Ì]`{cgT8M5kßQcÖÎ¿î'§Â?Næ÷Ù£F¤4KI½$Î«­„KóèÒ™q££	e.(dþtSnÕ‡ºñ‹8)”ùUÎz³Ó/¿I/C–¢eÅV	ÓýðJà*åv§Æ\@ûsB‘2WìdÈÊ¿4ô¢>]½7˜Š¡UÕ¢â¨Dÿ\*)v0ãðüªPXó)
~¥Â‰Aâ¯†ÔU®‰‚t<0¯ÐöÕé?MõéRô¡º@yÁSî.:”a NÜzõKtrŠí‰ÂŠ¿IíU¨(¼œj†§YUK¹>¨k`ËÒ(Îí2Tq×`]°90×kØ‚ñA<Ln=e:f60¡ª•ãUÓ1hÑ¾ÔN¼3ŠgÔêº­4}yWp‹=^á
9fWCv¯A£#óÃÆºæ§ËÑæa¤ÞÂÎ­ð)Ü» ä'äsÁ7Må.DŸkWç¦Ü§}v™n‘9ú
Hd_?áš—œ[¾V>®Õ°g‚_$ªEAˆR}˜îg#ûÈ)sy8U†öQx,¨=íhbG5î–¸|Å§QüÉð®p2©Âcä”ò‚?£ÌÒÞp–•CròÏþ,¤’õšÌå“é¼rKæª“)È‡kÒã¦<Î'7W®øœ˜ÉÕxsåÃ+ž·e•MIe·á«t4'w³g¦Î*…¸ÑÛ'ãî8ë·§é¬Ìv'U;cqHzØ_ÇÃRk@Šv¨¦›Qy¼Ña’ðJÉ¢¡OÙL=¦$!Õà”(©_4ÏÑ¿ûh‡Õ	¬ LÊ±¬1çü'Éå
Hß|ýHYFî.OVšnýgÛOï>þ˜§’ÁÑœÛbÖÔãq>É	@ûJýespôœÐë7Ãh~WH=°ÿ¦à:ÍÝ_t„Ú×DPÅ«ÜLŽòíª¿( ‘…®‰ÏÑ…S­¾ÔëÂÒ­/tUì0éó·Wøƒ àe±á½Kâo{²¯«¥Ý|7ßÈßÊ]Á jy7ÅËóß÷‡É° G¢µú×pP Ïf¾8vžìîíîl?ä7¦˜½yýŸá[`ÄNåMo	çÃ®ÄPCn²P5Î4AñR¬ï)CÒuœÆ“ê^‚+0†Ó=+$>.Ñ˜CXâ•Œ¹ æÎ›×ÿ6ùÅ<ul–Ïí#°º¡UóÝn¼œ¦ËÌµ!Ü³õÞ‡×Ÿ'Ò@Í’S®„üºjöÀíT¤;+µTž_µV¹þ@”·Û–ÃiÉµýÿðOóäÇÉù¯¦ÌT7üBsõA­œQ«Gfrö£­ýä'?JÀi´ŸM+ÀÆtigI€àåI¯ïMúé´œÃ)É*eJù¤J÷Ò:A™éd|¶KVöÎÜ$ÀP§åà-A¹sò•^§£ô`³Ÿ¬ýˆ†lûäáÝ/ìaÜ„Tšýª7ÎÆE»}
ç /·äN]%_žÎIâ×£b H# G#hgCõ­böaù|•§1æ?SÑ#rOÒÑ¶õÚx”N!áò™hE> ãÒµ—«	øÕ¥³—ˆêÐÁn5!ï`”ÝÏÉýZ³ìÞlVáéwaqVqž»dfP]Î*=îW¼ŠòP:i5Ý%H¯tˆV¡§Ÿ¯ãò‹y¶'VóGgzPº‘Ïäš>%W|¸J} õ‡Ï¤úÏ¬Ý¢çŠÅîËöÉþõ³Y…Ö¸Ë^·ín.­¯+í(ãÀå§A^Á(oôagcÌùÒÙœö.¶AXPgkòElS;äýa1;q6§¿t6)Û$ÄXEPÉA~ˆ­<?Õz7NÁ¤y‹e#ÿ(ÈF÷ó­¤•–ýVòI‹Ü"øeôàÙ­6«Òâ‘§Z«vµ3u("a ÑQéO¹* |š¿ó›ôEÝà+'×#í¡ÆþþøÇ‰òF´ÇÒ‘d„hå%ë…¶NomÁèŒ•Y27Ì3eŽPz—Üý”Fu%u0xBNûÊgMjËy;&!5°‚Oc…|6½[Mt]&¤ÆìrÅ4íçÕ	¡š€«¤bm„×%¹Í	pF5+&ŸMwûE¸7Ã]—.íÀ˜iÉ\`åŒ@˜aHÆiœþXƒïÖ”FòC`Â›!ÿe6hÝj‹ê9„›i ád†sÍÇÚÙ“ÔkGØ­Ü3Ÿj%høVŽ˜>Vé>9ù8<ž¼ä­ËÄ~nJAz¯k"=ñÂ;AÒÞÚZrÄ<`kFîè6êÆô¨†yIzcÄ<I_„ŸÙžN‘¤²£ã½#\·ƒÿ¦2p¸{GÕe—Fé¾KJm(xöüVûÙsl®ÅÝ“I:&$ðXTØ”´¹F”•2]HÍœ3"âýnàó| ÑyŸ ÞI6’RJZ)Æúï*=¾-‰°Ê³¼D42#Ü6yº_£,|Ä¨.l<ž`\^vi Yóy^¦jñœP-‡À©ëwfcù 9ÃeB„Bç…qpï2(ÆhPÁÌ(.]íaŸŽ°}­³*'Þ:Hû„Þ(^¶Våä[ðc,¿“IÓ/b¾ô'öV‚§`UŽYyBÌ~áÍñ¼ãFYOÑ¢Ò¤£ð¡a{3`ZþwHsˆ>cræ>=™Zg<ÒÜáì—Ô?ž†±÷´HHõÑNQVF«üqà0¼"EwŸÎòsù[ƒÏ'YŸ°÷ì¬2 ºEˆŠ3µµ]gµÁ»Ú£ÚìÏÆj{;âçm•,Œ‡\¢Ýmö©ëM$}—Ô­lm>ŽGÐ´¦…žécÇ ØyuÝCwæ£—žñ¹^ÕÝG´<ÞžùïÂ,Ÿ6óûîwÍ¦u\„ý"ò*¦à¥\ÁäA“11ãÎ,K_õ9ÈuK•Ð0^Åƒ¹è„'–à¹°	!DÛy„ü¼BÉ’Kl÷ I‘Ï&ˆ1ágd59ÊH{sBÓö’ý,´šìÏ+F “ŸA6¸îË,Ã§pó‘*³²êñfU‹´<,Ž[	Q€  ÞÊ¤o@¦¶BÆSÎ³žJóHg®&Ïøoƒ§ƒ\²'@Ð+S•wo2JÀpA…ï«ß‹›ê¹Å¿ÌÈv¾ÊÄd%ž6ç¦€g<Å›É†š‡-ú³ïÅâp	!

ˆ!ócIÅ2˜|Ö#ÜšAeó…óé€œ7Çº®r¦°Å&‰
›ý>_ÉÌð¯˜þ¢ób_ÙœØ/22qÔõ˜i`»ˆ3Gh9­›8-Âž‚5Y£g8Üç[´ÑäŒpzYÇš.¡áû(eÜ¡“Ú+È˜`âl’?u2ÿlmËVÝXjÖ L6ÆÃÃ÷¨`²Ý.ç¯ ýlˆ¡éð^á`P)vT¤õP Mš˜Ž”µ×þ§ÞÙBßt0æGF#d3>7Û¡‘7<“]}cœ/Ÿ“p`°–ø­&ëÊô·=¯Šny2ésgHXùƒb¦, Á¨÷È«vÞÒ·^=Î™Jr•÷lvGæ¬QÊvÇžÃv.aZÎs–ñ³Ôá¸Ùîú¹`"ßûÙ–²0Ÿï>Ý^Mîî~¼»·ýp5Ùyòˆ¡ˆ2åARP8;‘Kç_/\“kçR™m+&-rM@÷ô“£aF:¡õÀC ;&7|Ÿá­+o«QQÂc‚!RªÒ£ 6ÉŽà`ãÙ)·ã®¦¬Õ-[¤×b8 yE‚.¢*a-e=q÷ÒþP‡voŽ+ý|d±‡Œ1û€eMNk…!ÍØ&¯›æ†«ð~›ÐWòçsHá -Ü’ýžÔb>| ±dSÀ°*z¢Ž"ôŽ ÏHa ÝÚŽ§4Ît¦Y­1xèX°¡¶éxQÓ,(¢ãäVAh¯Y«£“ÚñÐÙÇ™r*úŠqjt2ºÕéAÓ
ý¸
Xã“}Ø^Õ–úžtÌýåãæËàÐµyv,ks;¶FÚ~Y]uiï½¯W±{VýF=êPÐIšt‘A›¯ŒÅÿ·VÉÐ·ûêK¸@„ÔÌ%³³0¼.ÄÉŽ§éÄ!¾g?àß¥È^qx8¢ä!“ª¥L'‘âu¦ ]…t4äz”âÙsÁ›r‡1„ÜïC›RH¨«É ÝN%u˜r²Oí²#U.@ ˆ»Ï¸®«	ç.{R¶·/ž)­¨¥Ÿ±y<—í
ìÌ²æ¡$ô&²WÎšÏ•¦±ð3¶6K
œÕˆ¯y<­^»§ˆ9W!o 4¥—†isJ´×ÓßñÐäJƒ[²Ë/©ˆR=%É}Ó6ÆKïW‚PÍìÚ\ï@ö5€BŠaé\œkÊƒí2K|véQšs¦ænÑoàßþ*2.´Z«:­*÷œ€‰-­k¾6=Ø‘t6{•ÍÀ[®¬Òñ´Íi}Õ6‘îwºùÖøÍëß¢³<·ÿ8#¬JÕ’Tøìðqº´ü´àjòÉ4£v© jí}öéÝí½{ÆüyoD[ýL2„,ÜþÏúj""÷ÿpüƒÇ¿ù™ÕN¢Xfç‰†üÅMOa ¹!øJ¯¦Ü|’î–õ8ôïTY&%p×W¶è^^Ù`‚!ÉNcˆÏE1‚B\Éc}ø UOY,”Š€1y–!ûèx7"ÁdÆ«-lLEg

óŠïI¥ú*€jdË·:oµ™N	ð8¤÷AÉó-"¹ÊKÐ\œ”	’LZó¢YÑœG0'6Wàâe`aKÀÅ0å|œÍò¾ÅÛŠš5|­ç©™ùªÒ¯µ
\Â¯›Ë¹Äûzyë6AQzŸè¼hBÝ¶ß>Œ±÷Zf`§@g¥°'§«ZIÍ–¤¼JGK2LšY/P§Ä×wÎ­´%V¬Ü˜ÑÎD½A®mšO¿¹•âzÊÝŸÌRÚBúŒäž;[¡ïØ¦zjÆo)«¦M[oJ›¸Xu×G^2þSyª%œæ¯Ýýò¢únËKz×!Ó1xÈ‡ÍŠÛ»ëÔ&În_t@æþóŽñ;KÐ˜	®Órò¹]Ù_²N<pA²”F"ÁŠn è£04É¾"A©m.‘š±Të?|Œ6öâƒÐöSÀZ¥½ÀfènRÌK‰3I×¹¶•Äj[«[É6À*¹pDvJ{ì'P ®?wuí¿Bmm¾/¯åþlÌ&_e»…[Õ–</?¥“°Ø<DÐñ-Ì£Ù+ñv™FG¿´É8´{NþæW€|‚çVþûÁ	 /h˜Ô’Ïe +,l9]ÃÚàêjÂò7Ï{Ð !qV“}ÀÖ,¥4]úLï÷9EP)%÷iÉýpIÎ`’©€{bqÀz€Õ¦Äe«#:%ÜP©¾oWç#qTWêc'7°T'Ú”¸»A¸¸Ìfn5lZén°´®iÚ5å`¹êw=XuSG‰°ýB5ïXêK{—Í}Û+%ŠÌn[î,Rž=ïü@s«õ ¹ ¹ ¹ ¹ ¹ ¹µÿmÐÜo™8þþ“¦‡Mzñ»Dª˜9ßQS)l€¢2%aíI:&½Ó¤=þP‹¶cêQ…ÚˆCŽ6P‘Äµ2¨É¡…©Þ;ô;zµƒ}Zç`ŸVàÖÉvÉ*Y/Ùpð;~·Ëÿ2´4|£eá›]ò°(G-K¿ÓÒô»]~Z "­À~Ðì‡]MºhüJ‹ãW»ð+´±†²ðU+9àæ×P˜ý åUô®Uéƒ}6'_hQŽS±;`|Ï¶}•ï-ùÛEþð½ _é2“/|ÉW±@ä;›9ùF§µ¾*GM¾ãpÖµCg©Á2GÍ&o²Œ€ý~F.ô,Êî€Ml÷«¹k3~€þ ß	ý&ÀjG€j/·Ê‘¦/Ù>Á÷^e“J9zÖgw³ƒt>ªøÎÍRÔIý–‚G¶7¹O&íÏÖÁØ×oëKCûK%:UÓ£Ö¼Ýú|ž'£óÿ#®CJ&ðµüúïNÐåòï’½áùW 8þæ¯Þ¼þMŽ1¢Î_¡Nÿ·(ý¦Jî²¬Û2JjÄr&L%m‡ô6ØŸ°Zª-„äì/ÈMÊ6ýu3¸ºsEo2]-ëqOÑHméÈV>ª—O‹Â+|p…¿ZáVøJÍŽŸkDšÃf_Zwöä’1ˆŒÚ`€?Ê˜e~GÒd.»—€`ÅtÁ³¯Û­+Ž±ÏD{ÏãÝD˜A3ÃzÛº›ìš¼¢7-½ejÖhŸÜ7Ý¾Am¹çsTìÆðÖdbÕÃ»Ã[¡ÉªÃîo-{V=~•x+rPµjÒ;Å[™Ó›µÌ›€á],®Xv{Š‹Q^xØ¬Ù(ÞÂUKBúS%­äA	‰æyNKîHó¤ôDø›|«c-÷\ÄA6¡”™r6•ljc0å”vpI° )ém¤¡"HCÀ*=$˜ôþ
=S}L©©Oé@ÐP6¸#ÇÈÈ',+q0´ÃØ5z´4»±gÈß4Üãè'à$Çâá€ëu*ä¢!ÔÙµ¨óÊ±Þèî6ÚëNGpkŸj/é¨)†°j–`SM<…Ì6Ðë³±§ÙŠfË™9­¿Í*šqh0¼m¼¥fØö¨—*wòö«ø¯*N>âèÜª8î`1­Ô™ª
>ëØg0=!k;`­TFUÈ–)HPAÅµ[ua– Yæ~»IBéš¥@ÏÃKézŸUýq?C'Bp”¥Ý³¾°×t¢¬òÔ®¢òF[Kk\Ðû®¾å|Ï~SßHg‹}×)ù™-þC}/˜-úU}Ç9–-ü¦¾Qx“-þC}Ï’-ø¢Í±µœè^-ëbV#ª9­qå•¦¥V*T°À,jsÚ•f—õ^‡·ÍÛÐ>çŠe±çÕ‚![aG¹;'[Dáv/§ùÈCQî3ð@§Eçù€”'_9ø@GÛá§:ú]EÑ‚%-¸©,¿jbâ5Ì6e–-‡W¹â	‹ËºÔ,Wœ$¯˜(ÕšÝ5†m)ÙøjbÞ€‚ØÄÊ€d`fu¦gÚÉò[ˆïc¢Òh­‰8¶šdøà4f§êÆ»I¡áªÓ÷R|sÅR“ñQD;JšgÖš7¸ØŒ3ÏGU>%ä3';u²¯e½QqØ^¡œx‚Å»œX•Ë´µâò:´éz4Ô¿™Íò*»?Èz»WÔÔÈ'´­TE+–ˆÂA˜bEÛ=·ÌÁÛ«Š+è¦‰¯ŽA{Ý¡¢ý§¹Þcõ:bÏ ScûW¦ådÑvï&ïŸ’ÚgÉ¤¨hÄ˜$—b’t6KO^hm+_AJÕ~Œ@G6£Ø±¶ŒâYŽ¬_9ÍúùÄk$iYæ‡@,BðÝj5ùäIr˜MÀl?iËx6»Ø‰ŽoXpÉ+hìÁ{ª‡;RÿŠ|Ã±~V/Œ» ]À`‹DU‚lTwðÞW\œÔFãx)ÓL_¦o…wúÈ1¼>½3q”µLÔŠg¢6µ¤ &ôSÚ„~D€'Ì%¼q&ÖJ¯â —\åÌJ.›î0µð-Ì×ÒåŽfmcv§–»Ý“ ƒ[ÏÏ†8TB<“ÊŠGò©¬t«j0«4F„2ßìÏl”	"^$À
†1_A2µi4+eC‡q	pÞÓ~\T¦86îú>©ºúU¥z	é1F9Áç)·NurPùÞöÎ´=Q~K¢8ûéø–
¡‹þ“ì€Œ¨Á~1bñslÂPß¢ZBŒ!FŒ+Hh"JÐ„	ä†t¾‹,$>0J”¢óçŽ#¯JôjLnîª$…zš»*¨²½
“˜»*i"
½—»ª)’½Ó9ªH†W'“×ë5ô65QHHÓ¸e!Dñib·¨ˆ_ì#®uK_êj5¾Ä‰_Þ® ¦&¡ˆ=B#JÖŠa”’¶ &WÃ^ŸÆúøL—ÐèmÄ
‡âÅCAQ`\êE¬¢|äf{„UiÓ;Ã%8sq·Tî@«÷‹ñ8¯ÚJ1]†ðA žÿnLø7/O|¦HC¼‚ÉÝ	Žƒ3) I,{f…çQ­—|m%˜~ïûÓ=5®ã7æ®†o:=Sß¡›ô—JØ&ýÅ¶qìƒ±±íÍ!ç?üziá~öd¢#ØÂR‚lÉf²åŽ£@Éï‘´Ü¨¹¸ÌÐðÆ.#gPW:e ‡Kñ„6VLx¸r"Ñ>‚žM8ã ³=Ú:9>ÿçT¿^¯Ç§k‡ëÐÒ~Y#£/:ÆÏµnt	"ÈËGªÁ˜\Ûi9#g«²Æ q™¾ÑÚ	-I¸ü"ºŠ¸»÷ÞóÅã0L’~Já¤À¿ÆÝè%Rø’¢_!Xò‹ùÉ›×¿š°l4Ë)¦eêyÐ±¨©‡YB\÷c€kæKqÅX7$ K…æ
4¿êþLƒöh÷º{à‚.SXJoKz~b<¡Û–‹¦hT”Ðœ•³âŒ~¯^®—U=³d±_e1_ÔcWzîœShŒá£o÷°&°(‡ÉRÆœÜwsZ• ýßÅkFÕy5½rŠÈÀ½#Á×ÙyÜÝc$:°/ OƒEo!lnùàm­œÆ¾yýïsL­Ø´wÅ÷ŽyF&óJ«t¯ e5+PžmŠr£"ËÔmgH¥-¯M?¡8"jwžeôÏÿwÿ˜Œ€.ž#KPÈôzA[b9Ië©ƒ\õ-Rð5dnmq?hÎH¶„õò–î~+
<"Çeà(²/QØ*|É…yZõJ}kËÌZ÷{D¨—ËYÎ	²#j-É>	¢Øÿ¶”¼æŒ Š|Lí,y!ÃAûæ¯¾ù5à÷œMÞp<åvž<Âª‘¿x	Îñ­æ] ÷€ùKB	ÓŸ@Îœ&$®0}uþûÉ®@á,ýçä†ùú¿æÛVÖÉaü>T×àŠºr÷ÔàJ—¢ÀãÃó¿>Ñ»’K'=Èî£ÿ*é_InÖ=Z;!ŸäÁƒ­ñ¸Å]&:Z$Ë£bö²fôŸ?|úóÞ¼ÊGeï_–Åä‹ªø_á	Õî&¨…§U‚'_L²#NP™¯ {ödÀÚäM¬Ê!¬Âm.›A¢ñ~>Ê”Š/ t6þ‚”ýB†xÑáÿðOé`ðe…\)ì$ÿ}F¡®À.¹¹l:¸’_<zô¬d«sÖ;•Ç‚Æu]ˆ€ ÷eÉ½ã~6rwØˆ™óÏ.Ú‚LÌwa'ÕH¯µ{BÉGY¼yý{Bsý¿	]—¤$ÿs$ûõ\xFí+ñQS-4*~© ×êàE÷)•šiú—éõRµR£Â‚U2?E›Â]ì%¨bƒ—yìÐkHM
/åRdè™º‚£œìÖ
/b••)º}×|×‚ªáŽhŽBªÞCú 9
ªjéç(¨)E/5GQE"¼ÓÅ¤òƒû¥9
iÚÅ%ÍQT¨'˜+š£ˆ"]ß·…êêW¼í‹BmÔ©™ÀƒäsoT¶žKãjÄå¢\°\)ç²¥”ë-üÌƒ¿¶–lôÐ­*¬,Öç’w:X›_ÕðHÇîp³—@ŽkU@_-¦¨õO—šÿÆ¬ÁÛÛ¡8õHœj$ÆnöÌ±¬;£¢ÌÈÙ®Žæ0ƒ=Í&å|–AŠõƒ,@ •‹±S±†…‘¼¼núèÎL —	p³Ž{<µ»N»Åß0k™R2—‹3¤Lßœµg®J\€=%” !KóÆì©B¨<» ~˜¹Tßä¯Ô\Éå”ÜTÝ“îõ•[¬M(qK@èt6P+ì³A6ëNŠI–”Ã”`àîæñˆ-ÁÓ¬»¹¾¾vu=Ù?ì	-™ä”ŒÈëa>d“Ù¼= aw£wªÎ©”MªnUtgÉÁ¬óÎWÖ×ÉÚt§óÙt”ABçä¨{@fyÕ–aè²”Wí`ºß½ªÀÃÁ(;¦–ZÝ>©˜N»—’ñ~wÃ¨jWžv7aøb¬É,>³AwthÕ¥y¬û/Ÿþbž’“«å°†ÖW\©«Íþ×´Sæ¾—W#­Qlìì„È²î B>¢»ö!,ëŒ<$Ô­òÃaµrK0	{Ãù5Ñ¨±|ö°ÿ»YÙŸåS4bŽ‚v	;‰ƒgƒ|>¦ßsXqÒõÙ/ˆF^åˆ4õê˜\+(•aRÌ
ÅtŒJÇ@¬Iˆ° e‡t	¡gÃ`]’bòt¾?Î«›§×ó³˜vü§ñŠR<e7eIé‡é>aˆÌe¶±>=~î€Ëd7æ„qœõS0Xã  Y±!>Ó€ÿ§o^ÿs²þUAÐóW…XuìÍ9cÔ‡3r½Á]B]”ä¨ÀÉrOT¦_ˆ'LxSáF©‹þmÓÐ«WNGyÕnu[ê€ßjùÚ,h:Ó´Ý»yÚ~t²òÃ4Ô€ÁŽð‡f†V˜Üî£Gª‚»åg«	¦	g=(“ñ×´“”·_¼JærÖ}ÿt|öÂ[õìÌùÂ½=bƒöuw¨cY‚Æ7 òsž¨÷Çˆ£”^¨1!š%I…lvsåñ7¿;P¢¨¸¦¯føÇqúls}óòjBþ¿‚ÿ_Åÿ¯áÿ×Ÿ£LÄÛÞ&Dg»`ýû2;¹yzrÆùDšhtÎn‘|üPØ?¬NÇ½irþÁ™ñBïìn|ÿŽàÉrà	?8…4
ëßáÜg™PƒíÓ„j0¶’M0öo±šäT™'$ŠÅS§7MO«tVµ7ÉÆ¯·:<­ãÆ§u,Nëøì}B¾~ë'ÕIŠÇÑÄÄe71Ñˆôx{Ä‹mÓÆð1¢÷"Ð¥û#Õµ—TkˆÎ J,¢²¬÷¼1PÎÍSü,ô(Òbä‹§ óäy á»³“\——´™%ãÛÉj>o‰ˆm-o:Œ8ëö¶tnnmmîÛwóÔã¾®"î»üî-.Œož¾÷žå-ëF6M æí ›½þ—ó²ÊNºûYu”e“dzì`´YcË†È•[;’Å|9,Ðd€pa€¼3¯*ÂÖúÎîÉD%XfÅ•³<T7WŠy5Ê'™·`™ÿÖxì-PLvFyÿ%ðÁ 37ù®>¸®’Œ:`’†Mè’‡dRœ-M²a®6Û¹ÔÀÜmô®¬4£i>ÍË|Ö‘K=‰ÿÞ€€g¿«æ¹3éN€¾š¼äÊSî‹f˜ ,{Ž;!ú;A¢+ôÀCØ<%ðpÊL 5í^Viº5Eº´)6‘ï%-µA¶.äcøžO’ƒt€ËQŽ_º(X«
ZæTÐÙ½´¾¢›ç@[dél¼¥»›Ùù°7Ðy6Ð¦{ŒÝ„ï#ˆÇdòG]ÂÒÌ‡ˆzÐÎ‡»÷†sBÒô…ÙJé(£	ßwòÃ
`†^Ô{«È›Ë$qm¼7wÐZ…ž½Ô.ÿÔM3Ìß|(ÌÄòR0›çz;S»õÊ8\Ú ô	›˜|ó%xümŸEAˆê!‘-M|[Ò ÏŒ·è©¶À¨Ö‘þƒæÂ•GÍ¦nWq½Ö”‹Øæ8.ÑÚZ~Ñªœ=+äøÕO7Ž³“Å'ò©({äÀq"ìcRÕ*a¬çš+^0S¼\2À·È „³¤M¾)¶g¦3ösµÊˆbø[»x¸œ—Ë#,NéshQwÔ¬) „j'Žžáõˆ™˜}ÐíÇ^ÂP~òÁÍÓ`£Ñ}_’/ê7»È‚FÑÝòëëÒ”]Yàâ ÍBÄŸ^•Î³ªÇú -eÝÖ×¯ƒKZö èÏË-):E7•*?^ÿ0aXGäÐ;×»ßrE£ úóYYÌºÓ‚)ÈÀT3Š^¨='ßfÖCb3XÄòà˜Èþ±²sá—	Íww?ÞÝÛ~ø§ÐýÙø¢À¬Æ2Y “Vÿè€ØZìeðÎ“GËÞšu¯ãlY‚`o¶AØäËlr$[ª1¥<.VKÚ!eG±£‘<÷·ÌŠúÑŸžÿn2ìõzeœh¤»Õ”Ùr°ZÜzå–êAÓŒÓp4K­	'|m.Ü$µ´^¹%n.Ü$Øx¯ÜâŽ>nŽnƒ:Œ;ü\¸M´ñf8,¾©F\]OWr½:´´sƒëRr˜’êü¯s!`^K>F+Îó¯ñŒÕ4¶0v8.¥Fž]‹ºhþRýÅ¨áWÅƒá×ZôC°&Uò »¬A°A´ÔxçÅ”Ì2²šù«:ì¹ <cÝ*èw²éãbRÐ'30¿L¦³îe‹app­)Œ—cÔ¶fÍcú'¸Ìm2.dëÊiª™¦ûe1š“¥eU÷Rú‹µÍ¤[ÍÒ	]ç| Þ¸
%w‰ÛRÃ—o¾¼±],@×ß2€‚ú ½Ð¿UØT…oRˆÑŠfÊM SD›\X’æ¾0¹Y“†A’îìÀR¨&©ÏÂêmþ‰RsóPw	S[œ*½ó~DË†Vûˆü3–ê®)ô%åä„>›=®õ H5îÔ¥–Ik:(^”Ýx”O\jð!9vGÝËµT~HñÍ?!á*ðÒ}ªüšv—ÿÄe·ÿh¸ëMGt8k”àÜCeìEÃÖ‘‰XË5¦%Ì¤;|øX»‡1:P
Š)]Þ\5§:jlsü E†Îj,nE<Ùq¥u®Í¯ã·™>ÓF˜è¨„;¡fµxÑ0â’Ê_ÃF5ý[×Ê…ÅT2­ à)¸V–í†XÙA)žS~“ju%‚ÚM`€*	ÂmÐÒ¬&\zþã„ð‹¤›0WÂC±–5~!Tùc‡ö”jK AAó^a‚35¬o¢DRŒ@/I±o	Ü’ºM·×Y]cGhã24p©qÉEHŠ<(qÃ/%ýP…±‰–bç("ÐF¦c¶°}µÂŠ:Zj!Å‚¸ãÁ–üy©ŽÝ­*†J1BÁzã$A£KQ6³@‚óÚ‡ð^'à…úõë$Z¯ˆ]G1-ðÑw(Æ(›1ØðÑ]Öc\l>ÆXÅ¿2bŒyqGyŽ1Ž1ø#¸)$£¥‘0¿ùµš`[1LD©C„„¸ö |«@	gù5D÷ˆõÄzˆ/´FÜÝà¶nw(žýÅ<MbÕ…ØåŸ,È:£Ó/®J$èï¨^TU§?¢9X'$ò°íLü4ó -‡¦Q€p8`”¯ÍËgêrÐD>V.2ÅÂÂNd|dwà^c8íKîg½õüÞZ|”fS¿¯·çù¥ÅÞ«c™=å–GC¶Ÿ=ðX™Z¯Ö·ì;RÙïPÀ¬Ô%	2eÑŠûx•½Cì„;çx«.vtcm¶ñ(®ùH=t§{@zc^(SRÐßGUH¯œ:oœ¤î|»Ú¯?ãXë-ó‡U:76³–Þñžx¾>ïX"Ê>)pâë•bqg^éžûZi}‹œfö8Ž“çÎ[¡ˆþ´ç,B)IÂ”®”§ñ50<©7;	|øPH}Ö”fŠ;¡oïŒjYrÅŒÊtž<Þ‹³eŒbLçLjwlÇSë°95L)RËÎ¸8¢¾Ü<5”{„
ÓÀJ<WMCÍµ;ßÍ[VY¿Â5¤ëó<¶Ÿ›|Dåó"é¤©&ºÄ€\žm”}œ¾ ñâ„Æ ¸•˜aRæx§#ænI$<ëe»³ÞNZä]®Ô×¤þ@žšLÊdãl–ŽzEþP©ÉAUçÐ|ÆåÂøìÀ¢<·¹jx\ íÊàÀèª'ÙÁ,+‡;G® wœ2*§ùÄKƒ¿¢k­}]ê9Á{S¢«í{Ûzø‡šÇ´á> ~Íü©ÓÚ=Œ¥Æ eh{„GgŒ&.úu#I#O3†Õ„_½“‚ÝQ§6%»³–¨©ØÉLÑVSÜ•´Í=÷wÆMÍ¿V3nWF6gOŽ6gYÖ¶šÑD¦k«i%&›ýiëÁ›×w‚â§ÿe29ìïSëéÇâŽø¹ôƒþ”¼tÉô…|b^Î7Œb¢ÀZ†5žø«z\ÅÂŽËêÑ‘cåYqÔ4è„9+m K–úçs´‡xþ5¶×7Ué½y¨T³s%ˆÏiÇV¤otÔTB\Kº¨·QðþŠŽSÇÔcL	 >g ›M¨šþÔÈ2!0”gÂ9.ã"Ä«kwl$RucÆªxZìdïølª_Û—ÑGÎIÅ+4 0·ßÁ	–6‘Çÿµ>5Ø¯»ÅÑ3qØ;†ôsšéä¾ÈtÒ”¬æ4¼Å´=@ÁsÌ’—Oçdù”ßÛ”Œ ÛÙY˜$ð 2ˆÙ¼FñG½Z\H–Ž}›‘êFÔ¤_}\Gäúózu 4ÖÞ,-‡›^0œg±	$—A‰x. qˆ`§]•Çöé§"'Ì¦©…˜Óu¾˜‰  BW\ê#!G–6†y{ýroù}¿mˆÚ¶FÑ#hR˜§I£¡ÆÁö‰äÁTD1ocå î¡¥‡j¼…a¡]ÄÃhºˆþñ`KÐð>ûH³îD•\>Y˜Ð…<Å˜_…icà	—y—p×s²yƒ€ Üp(ý‡±°@XEFó7 ûÿþÞ/xV¥¢#¸á²Åñdlµ:.Ÿö¤[çÆ½UÉD€çÜuo¸%,¨„¢Xsduîc8.O¼š1¦¾ÿÊ¿¹×ÔíõÛYLWœä¸%…òl=/g]]-T²·„'ùbËçS@ï#wXÌNøÆ‡&e”õ,¼_	m¸wóBÇÝsK{Q˜²~çS¾«WOëJiG%Ê¬‘<(<\U—œ‚Ó‚%£Q]æÏ%¸¦¸ŽÐ/;º3ïpŸ+·ø~o1Ûùºa¶¹ñ=‰xItÖŸã;Šˆ	Q«Ž÷+á½çeñ1‡M-¸àI»úOÚ›×Ù§žRU(wBã×è©gƒ‹ ëàHM½ i4žfU[ÉÐgetfé›;N¯,fU|÷^e³2k³°–ãú°–ËK¿àóK]p])¯<Ù¥o~©i×¶aa0íÕ2/}‘pí¸›Î«‚çGsÌo®~µ*‹¼Aã"'¼ïäÇÙÀß
oÇö«Áª¯»-viÕ'Å‘y4}F1§KTiC6È¥K8qû©š$‡è"bÄ5ŠDmHØ™£î¥°5½ˆçÈoÈÿ‚2B€Aa³É:´ëýŠá9—­ÈsµµPÃ÷Ô5‰¶kä6¾‚ˆ»!?bøœ%Ù¨Ì.2– ò—u|ïQBÒßèÆš xOŸ	û¤¨æúpj®°SãH`ÆºðØ¦¡&NÚÓ½½úÑ*£ò®‡Á]‘'û‚c4¢ÿ©&;Åx¨_ŒŠYé?«†„ˆªžÂ½É£ªÃ4|‚¡P8‰Z’åô¸K&ÐO«bF|6{J ¨•šÐuû¶ÈÆ]ú^nOjþ–v Ý;Æ{^Âvy¯É«üÀo¨a.|öïßùîi/¹W¼üîB
~÷FE#'~÷Æ¥†Kü®,§¾{£b6Zß½¡LbáA]_a`hT3šmGsFj¼Ÿw5ViÙ!F«ÚÇËláÁ`iiûÍèÃ‹càÞõ\xd×®è\Ý²®†ÞÞùWýšq±×„ÇuIÖÙÇ ß)'N»ŽÆf5!DMv¼•Læ ³YË'YÚ¯z÷géáÄ(mI1SHŒÓùöÓ–Â¡IN%‡„«&ïŸfÇÓtbX«	=ëvó¤¥KTëÚ:³¢ï¼8~-I\ f¼“4WœF‚‚8QAã`òK(·8@$¨IëCÜ-Àù/Îû8nîîÿL8ûÃàëÙðÜ~Dïð—g‚F·òÿ{ÖëuR¹@­s€í\„|GÃºdQ'¢EéÁýáNqAß³¨±Îæ´ÖÁÎb¶\>ä&ƒÌêdD0¶¸
0oì’&ÆÓîÆ
¡1«h3z
ë|vËø] Âíþºcå
0›õWÝuq²{w+‘c¤O€
S™
Lq+X_½Ú©é;Ø w2	CZ.	‡5æräIï
tK–C¨wÊ±¶‰ íÎ«Ø4ÎMŸE„[dËè¾$£âˆ&ÂíØUDÂJÇƒz•·»)6µ©Ý@X:D#ÂdÚãî(àE"c8¶’o¾l­¶Zñ%–&€¡bdÉïüx!½À÷baij…ïÅPYŽ…ïÅXÁBáû­ÌÐáû3àþlü®«
6ÃñnL-‚Å3KÉÜÒ¶¯y°^ÁvÅ=Çé;¹it	Æ[XÅoº.~¹hËp¬—Û‰µŠé!´C0÷zÛ†1{û£Õ¾“3½WÈ'…ía%Èªñ@3¦áT3þ ›Û|‚T—í8æu°§ŸÚÝ©á–nkÎõëë€Ô6Aýóé©ˆCæö§Ÿ³À>1ÀGŸ>ÞC¡5ã'?ÂP…;úö(yy”åÃÍçþ›Ùd€FáëµÑ#³pï¹¦ïy×te¤óQµÉ©·BÛ]çµÀ?š”¬{s!
'ã<QÊ92bQÔøÔÎ8B°½gaøLDµ®{Q\Ös5(3u²ÚÄ‰¶Æ=[öØ®‘GB2äÙWÍå’Ä c‹Ÿíð©®sÎ]ê‚ÐGÅÀ”€šÒZ‰(vw
' i”Äð¼F¸÷k&Ãí¬úX¤ÑA+”»ÂW¤">g<
nHÙ¸:†§ â‹ÝAóê2\…"Š‘šÚ± ­	w”UÕÂäg Üjd—fH‰F½Z|IƒŽ•Ð²Í:Õx‹Ø#ŠÐDôY(Ô={žÜLž=é¤ðio–¥/	2ŸÄ	à“ä“}˜wïevRjÕ{dî¥ýa›gûŒ<H|(Ôô˜ *ø«¶üŒ5ø¼;Dø¸Cl*Íã[MÔïMçå°Ý¤rÒ(ÖK£†Ù›Uqc`=ô4‚Qýÿ   ÿÿì}{o\Ç•çÿú%Â˜&²ùÐ3ELYØ’5m8ë²û’Ýëî¾~ˆâ0ì »;À³mfA0€#“õn²ã/°ˆˆ`þ ÇßƒûI¦N=O½î­Ûì&)™Hì¾·nÝzž:uêœßOg$0grf…b¨£s¡Ü+É‹âü‹LéÌÕl^Å6òry4ûYg»Ùk§uÑ èŠbo.—'½ÕF„®”-ˆkU2ø1f¡ºÊÌæZ/Ýp½¶n2Du]"›8¹Z6myl~1yEŠm,„0 w¬€äkG+ÝIj{wÀ°«Fd›ìƒã€‰?õÆ‚y@F±ƒ@æÇmò:7ËF_>C0šëì¤	½|>Ü¦­sÒ6îòy	£³ÎY¡ËçÆ(}u^ìg™œ¢ôbµ†n—]à·àÊ,ãÇZn§´Ø*¶mÐ‚Ê<©qÚîÑM ƒ&}	ƒ¡LÅ+-kèr+ [\+E;pý9»Aëy¤$„ÁÜÄƒŠî½§‰À7/[6ŠÏ(¾ƒ'Ícì/©ZàÆ ß•EÅ¾"ÚVm‚|6óBvé>>Û­ök½¬ÕÚÌèækuWÉÒ<ÙJÉófÖ£ÍÛogTöU¢†QM±Y‡5Øù¯˜æîxC	cÇ)°<›y4×kÊ1Î¦dãAs)ãèNÜ+.ržÜïû!¡Nf˜ºHR':Nï½’çTË?ùÞ¥¹cÞ”j8£®¨ ñÁ‚ær9,›¸a¹'#èl%k=¦Å¿QÂõ&Y^¡‹Öò²EeYtÖérù\••{¡‘ó445øô¶á† SØÿõ7ÍÁKŸ+&Ø* X\a‡C×#ˆºJ“ä<žÃÏYàÌsB42÷Æår$×#ù`°(U
~Ó![TP8¢k‹Ëq­ÃÌæm#Å’@ÚÉ‹…h³*© ÷=äÞíÑ$µa@§W	¶’"olýÙØ.a–í8d²^-—Vu˜;½x|ä«\1Ã«QX¯Šúä©@WPVÌyÒŒðÿ/.}sda3qwézâ`¿·öó—yÏC„ÌAçóßÆèPA •‘<št(%œ „¢ó÷@CŒ‰t[3w³pÁRó(]ÿV&‰gÖÕ(+<ì/US‰Ý6FýBî»nJÜA	[coËTzjY¹C‘+Ð S)U%_Ñe× Ë@³bž1ZÈ+tˆŽýd|½<³Îá…x¿ÆmžCåVÞ%ŠÞöº­T]üŽ+ºÂ+šDéÁ\¦ä!ˆr³PÃñË¿ìÿ±ñŠ’k‘*SnÎ‘ÎAÁìºåtØ2×²Aƒ®B;’Ñ¥¶9Ø[ˆQB½ÛiZE‚zsTSƒÅ/)uÀ)çmšõ–„f37"›!ÕÕæ„ÄoÈæøæ<æö’ðƒÓÕbÿËÀÇ[utðÅüi˜ŸmNïMÐHè5¦x8	V‰qùbŸŽÕÓc6)êÈ1ÆLx¿gî„ùŠaæˆ˜”AoØ©ÑkLõæ°P!(É˜Y%ïò‰YK¦ÆJÜLè›úìlWŸÇwaï›xó©¹›Õ­Û7Æ›˜cvØƒcÜ"Jl#NCÃÝÚ±(y•=ždŽ5ú>¥¬¾Oi{£ïc:g^%» èWºý'ÔÞØÑØhÑa?ÇbGFÿÇ²`²V
ç{¢˜ÌþÄì“ê”‚îÇ’fÇÓ˜fûà=Ö4Ÿ~QãÌ\(voûg<M®î~KÎ
 ñ_Åá%E‡*`õÓCžC”î~@¢`{Gš	eÿÉ³·xXÿÂ[j§H¿6GÏ˜Ü-ò¡9É…vLÊâZ,ç‚¥?ÜN¥oÄÂÇ;˜˜í*ju"©×õáÎ[…¢ŽâŽÍ|Ÿa·NÇž*ï$G\0o‚1ßQxháûÄZ>Ñç¤¶N¥)3 Ke™qlžE|¸:aÀPëÒxE=ÞåVp[²C…€ºÅ‹ÿÖB;f	•(¦>6M¯bÑ:Þr0‰«\b|Jæ.ü{ÿÇqžQR^BsAu;«ÍÖáßÖ<© â
Çö˜›'ûeWt³ÖLž–sU¤Y¸ž«|	1(£Í6¤‹#Š¾dÑ%ž|J•¤Œ¿c)Á\FÜ…q·5ä6´³®ÓíJ`"!;]9Ù]‚šÝz²Q»÷¥‘´íÞgO†Ä=þÕ¤t·^Oðî0z9(³Ð¾‘KÌfóèà¯:’
}Œ•ÆC8Âg·¤ì)59ÇÙŽN,×ønV€8>w‰‘@ÝU2J•J¬§Q1âåtcª¥×?è´öÊ´R	)WjNDk‹<µËö®üK®zwÊ3çJ®{œŸ5kTG;:øëZÃäY-=‰¬Â‰H{Ó€®Gð[ûþqD°.1GÖ˜K+·<õ²~j2—a:³Âˆtóù~îR[ùÀí‹šVeöLeÚ¼„?JüŸ’ï¥,HY;«KÛÞXX^Á¦I#žaà€n4=~^š7ÓÀR0CÕ™£T¼ô¬7ûàW¿±ßì*w:ï”ë^üÃ¯S~,ÿNÉ(Æ‹r¹/«0†£§üÄªèñSØß²t²®}˜n÷Ò~cc×>à¥vEù9ö»Í£]¥úa‚?6 ªÑó¤Šï°ˆz UúKÒ‚`x?•¡ó)e Ž4—„ÎÌ0ªaÓñMòBaž€><*yx²qÕ½wøy§ÁIiïu?ß£MöêOôÊá7ôãxÝ1ðÍO´àµ]¯~ÖRÂmMú	<­èÃ…N8 ëMHÆìÒWµ8±s„'†#R&‰Ã6)t*žµE@×÷¸ßNÁÌ€ìø(cä]å¢¼Ôw\äËT(\ù=?B¤ÌqÛ†ª}ð·ï’£ƒÿñðnŒ—x˜´ Ìï¶`k1‚™iT–~u{+
ìÄËÅ#&ÏfÙ üòl–Œ‡sžÍ²‰èÐ³Y8 ñ8›%@g³pµ^û$¦yŽ‹¤G6±&3]½/å¹œä"üyœËt¿ü
±g.°aÉºÊ•re´^ød¾–QZK`áýzÂ´üå«ttedÚá./…4e@£—Æ“`ß¿Ç­×àÍ¦Jç«ßîšª¡Ûv‡$T1ý²;n_–îñ€˜AÜr3ò¨¨ 91:ÇÉ9ž$•ã9³Ü9³Ü9³\ùŽ;g–;g–;g–;3å:g–;g–ãlm%
u<¶¶¿0Oß@Â¶ëÓ!l{¸ð;g8{tr§N$Ç…ŽÏ&§6šGÎØÄ±Äe²>ýÔ9ó”·\üõçÌSo8óÔDé¥Nƒ\ê8,-¯¿ÔI³K½eEà›¯Ai1ºçkPÜIÐL½f$S¯ÅÔÄù•ŽÍ® ˜ºUÇ"šš@#r… EN„ð¨€Ž(WOQt"9­ùx@ÇiÞHâŸ\`!Ñi§ž—£y§Ü•Â öý~²Þaƒ´	á¬W¿5˜'•z}ñÁrïÞj»]™c‘PE¼]EzÚ>zÅ;{ÅÞŸ
Û#Ò:^Ãº¸‰àp=
ÀÁ,eµßm5³•?¯Ì=YzZÄESÔy4Âå¡61U>T[”“n)Ì‚h„„©Pà”t¡“ú†ùÉŠ¥»l=ÎKöŒ9Ç`Ë™SÎ	³äœ
CNÁícÕŒAR3i‚š	“ÓLƒ˜æ(ùSÁÈ/MF3"š)“ÐL€æ¸ä3“&žÉ%‰Ì%6<yRÀÿÅùå!ˆŽC»26åÊ$éV&Jµ2	š•IQ¬LŽ^eÔ*´*Ç£T‹NeìEb
KÄx*Ç¤O™<uJÚ”³#é^cŠ”cÑ£L™eZËZÆÊ|ñ².«¨%KÉH,Ôò¤T¯ õDõJÖ}L˜_	×åbãK9†éHÂ‡²Á®D7Ð–Lw""¼uD/»â=Z7

Q:Š–ŽvË ,A
¢Ga9•-Š˜-9ô¤DŽS‘:5SX?{~ˆãrœhDã¼ÁˆLÞ¥"ÇŠ0,ð®:ÝÃÜÓe=•0ÃRE;ùHÃRÅ;é`ÃR…;ùxÃRÅ;…ÃRå;é¨ÃR…;…ÀÃRå›Xì¡y9¿ë15šZß¥)ù…VàiDú¸Çû¥Ypœ¾Ñøîë„Ô¿1B÷¾}yø¥‰–4%-çøQ{Žfä¹¶¸‘ôêD¿,›èAk\‘%ÕdÝÆf QeþJL/M Bjù‰2¡ì¸·ßVšþ“K+ÌeyaI3g5šõzÚ1ü˜ÏÊ36Ð>E¸ò×IøÕÃvv ˆ®´7Á˜Ba¼/ñ³Í# ÝÐÇ[­´ Œ´ÙÌHØ2iP8þÎ%G}÷hÛ^JQEIæ¤qÉ¥ÁhNêÁ±û‡Ì¬# tòâð›äæÚbã’ó™†ösÈûA…Úz@c„Œe?£»Fš€h	ªŽÄŒhÅ¬är`Émt.ÅsYæUÆ˜PM7cïDý$šìDcn´~ïèàïLÞ9:øO¡½˜,WD)ä€u·×A´,§¸‰³QÎãúøo|fî$¦Uúäð—·ü•q:Èº°¶hH
-øå €zgØú,JHyžª7WP}“;¤ÕƒIJªwh†*© ª|F_1ÖÉŸ3‘Hèx„W…p¿.U¤¿";&W4 Òço:¯•DóM¥³(Õ¸äÒ¥E
ëiˆ*¯¹0G¡²Sž«7ZX;ŽÉI+†ôÇD–:L±b¢çÛ—ß}}tðeMDVÉÇ°ªq)ÆðúZ‡Ÿ·1\¶ÆÞ{­–ßP%/ó¶ÿlÂVÆ¬Mølà1¡–‘¿ýŸï‘ïü»‡'+ø\|Q¯Ôó${#Dž>a˜Ôš"™§_zvÅž¦:a±ç ›b«P£”î9©øÃ!C2¿.‚Ï=aýr9èžX††SËI>!Tä‹1zo	ë"NäŽ	]89.´[ªœ³l&-­å•ÀæYÞö˜ƒ-j¥t­‹&|ò¨ÉÐÉn6hOþbh2ÿyŸ®$ÿá#ÇJy’Ëýv7ë¡AÚ/XaòÒÇ,5ýöªˆR¹ÌµÔ’syi²KŠÚîJ‘.Ô‹M;²ËmuIÑLÀ98š_>¶;ÍVú¸4ýFš<«ÇÁë1°æõ"]°	`ù+ÌÌúC°Fvýî‹ZÚ’£‡eây…»ªØÔç|˜g¡=€>¶Ü?Ï¹Žo­(˜¾ÎŠ×Dº@*Æ òi¨'´ÛT ª¶¥BÙ H)p2H}šW7L±²Öd4*ƒ½.ŒZ:œfH³Î¿-»­,©/0}–.ÝýAÖKëÆzÈçÖâRä¢Ö™à?yFb+ÙJ[¤1h·îd½è·Z jŠÛlµ2‰îËSùj„ýœ¢UBÄmÀšy÷F¿–Ðz,/}Á¾Â9¤ñ#Vë ‰¢°|E' ÿ¤ö¦úÔD®þM‡@¿ÁÑÁÿ&íÃ/öÈ Þ½‡¥~Ñ²Èº¹ôlãbãN–L€É.'Ã3ÂŽ¿³'£­Û	ÿ;ß5gm’;U\9nLu	)ìZd	,Ka¦rÔåë øü¾E\JSÞ,%–nþû‚ÑÔT{Î‹o¿}¼MngµG½ŒV¹Où é$ÀÇ¶‘Ñé¤´ñ6¡³Tºà‚>SO»Io 0öT'§2¦–uj0TêYmWûUúÐâ¶àÍýápøí´Í2grÉèÍ"»æõ…I—^Úgžó{gÿÖ;ÍŸY˜ž¾Æ¦gZ7Ê nZvýfI&Aý¨¾y§)DÔ»½^Öc¹¾pEk™Ó¤WkÀµzºE[±†Óú¦é¡¬.'føâæà¤·î%vôaà1ç.ÒiSž2oéG6h‹íd½½ÀcîmF‚Ã¿0'\ñU9á²NLé(è}–ÂØcµ¼02ÃÜø@{B‡‹]Ú™‡×>V?!\pØg>ßéšÒàçóTÇ§ã$õ*©$ýZ…ü”Tè,e_{ñh}VpEŠø‰­9Ï¯:\à~öº\Ï›é.}×]‹ó<ªS_0ÊF+µ®÷wâñÔŽ—÷FÑgD¶._¯û,‹MýÛ}xß¨ƒ¥	gQ¢½n‹*¢…­yƒ_çÛWEÑÑÌƒþÒÝº£²åL™ƒŽ\A7ÅËxî#’R±=öKXNþ·@MÄ;ØÿÆ`›e,á,?BÍ	o¥R)$¼Ý01hµ¥tö¡I|bìGT^ôÖâ§?%ÍŠÏQY=ö:*k^	öŸ¸ó¤Z­Ê»O«ðøìl2O¶›”.ù˜Q_'OÌW\TñKh‹'Ú
&  ŠfÛ"_è >ÀhÈWÑ?ÕAö>€QmÐ5vVAÐã[îã²ÁÇQ.ìUk,­j¬üqH7÷Ë€oþ#;›õ’Ù@.*ñÔ’g|Í“'¾¡0O°è/1ÁEÁ/ôÑ</×Þ§®Tx÷hNlÏÂ9õøP„=²¤?¨¦°ŒÎVª»ë(/†G¯~;ÐÁ4¼‰äDdx¹RV"1½PV¡Š’öÁÊB-.ÒM,èmÂÀŽŠn•Ì<¸õã¥«Õåëäá°#ýûÙlÀ¹3üÿ»½²°®ÓÈ¨	^$h¾GTi%CDûŠu„G*ÏI¢ë§ŸdHx7t&O–žòÇ¬!,¶=VonVV‰‚,ÔÁi	½]qº ¥zpø%kšJÝwŒú ÛÁ²¬ÎÛeBÐÁ-nÈWw‘öŽö’aÃ6jJËq~eJÕ¥”b™ÊÀ)ÃUàá¬²f0+J÷HD‡ÊÖ²À¹PÊXô§H§c?­T>i0¼î î,SÙð
(% DÈdî®gƒÙÛŒÍUU7Sh8iü+v%X“Í½—M:¿¨óñdî—FxÀ^ÉdºW±ñ+wàÔóïhJf7bÎl*cÎÞ]gïÝvÒlñgÅ£#-	ÑTß…	õÉû?©ÍV¿úoúYçÓAö)³‹ÍjA &•xhË|ÆÙ§tW.	ö­¤ä "ÏÝ­yúÖy2s;k~ú8KŸÞËèßüìn¯	çƒ­”¥~FSBÂ{ÙãìÓ·öé‹-RÊÂ ï?þ@Dô)	°ÉQtª/ZýÏD®\Hö‡5ø³ºOüRˆC¾IgÒ·âèu¼Jp§ç€Â)!,©0¬¥³`+â²F÷6ZñžÕ| Cþij<ª¨Ì§|MTþŒ¶âù[¦F£Ÿ?€§ƒx]’‰©Å‘óìd–¥7`ÕäH:ñ§Ðù"tIŒIà“7ÚaiUpiÞ,?ý­
F¿¯\Bk½îcÙeÀû5¦‰Re“ïº#_¥fNóqWb¤_¤Ë0{@i(k·è"¼ûQ÷v¶kœµ·[tôiÐY7©5{—–Û—¼l‘{ŠË`¼òªü^Å^g£‘>ïeº¬²¡yìd1¯ê½õ.¨úxo¯åó|ÒŠ<¸ó¾m¼ôXœ×À‘Ü8¹p;úmûH$÷ì£Á h·vvzI½™vƒl¡G¶{Y[ãÔÒ.ÎºÃ^·Å-WŒi¡d…sibº[…6s÷­]_eßi³Â÷<¶çÈÃÿ!{4ì³æ¯˜€½š ÜoÞ…5 Ä|:/4zÄ±m 2Ï¬rtðÒ:ü¹wtðKÒÿîòí/´À#;¢·éüê5»lÂ9îÊöÉzÒzsØ6œÄÛjæÑ«w/W&kG_Q4¥êó¨2O¬bD›­Çdþ!ºÛKºã¦àÙKÌ·l8}²ÕÏZÃ@Fn@eÝ…åÅÂX“î±»—’¤	îI^»-·‹_ÀpÎ`8Y‹Îå3›@¹%wólwP­V¡êxò´à,èž€µIPNõÛ«ðƒçâã,,Ê±Ý9ô§?OZC€9·vÀþpêŸRÛ›fß#åæ©Å°|9ˆ°H;<—ÝÒ#Û.¬÷½eÆ	1Qü›½æÎŽ)™YÏ ¦õ†ÛÁ¯8É›±NeI‹êÞIÏlE´çáöXˆúœ­<ugÍgiÆ~œ÷pN¼ýÚ¢Ñ¦¹íîñjÀM^ì¬àÉó>mP1ffX‡Ñï=H‡@vØ@Ð}Ø—‚þYÖr½tŸãÙF@µOnÓY%+—Acýtž4@ ÄÎ Go½
#6@Ò*å»‘ýÚ‘¿æÈ}aøYþ²6hÊöƒ? Ë‡f®ÚMêIo0»2O*Ky-<Ó=*h¾2Û;Tú1½”WþàsfŽ|öÖ>ä0Zxk¿=z~ÆÐ	ý<Ÿ}ÃH
ö=w@È¨
>-Î"/ZÌh`‡‰þ£ ¶1¼‚P$9–œÍA²«+8w	C(_ÜZbØNCKJXFG<.CoìËo¹é$]•’~Ÿü’nJÔ’æé`™Õ6çò­Yô,;#¾±Ïþ„S°_ÎÄŠož”æ/úVÚ7cÝç•™îªÿ>D¦5ÉÆ£ïñÂÏ¢óš1¢ÞóR0qå¿uf]ŽÎUòñýÇ·Æ|‘0ŸÅ¿ëöý»÷7o½?æëj½vü«%\Ñk¦²è…ÑÇ¬<tDç“nŽï»'MžÀÀ4\+Ò{S1ZØ¡´Ùìw}Ý÷*AïW´õÍ‹ÁàŸO¸	5Œ§Õ¾òQ>¤ÚúåÅ¼cÀqBfêPœž÷¶¯³6ù)ÿF›Úô-A½Ä÷ëÜÔ'˜¢yŽÚÓmL¶è+eØ¢å˜aé&=©N#åpJçPJ?Y^òxX@ùƒY·EGQK¾àå82ébJâI–2Š‚˜{»€|¨êŠ{<:é Œ.&%®ÿÇ4X÷ýôÒ¡wç) çÝM:=¾ELÔ¨_1	õt;u’½‡²0«=$wÅD©'R¨«¨P±½'^°(Fã/Uqð‰ê:Z¡6þ+XýN±\b?ˆ)s¡µMpUyõÏÅ¼'+b­2‰y,Á;¦¸Å>8¹VàKŽÆç‚®$Æ…|½¤q·G:©ü®,Â˜99‘?#ïü¼Ö€ ê?œ1sÀ¿’Üœ(àr.à19Ýü±VÖéeøbGøNöÂŠõ‡í-º×”.+ù¶"o\¢aE1BØá°¹CÌŠTS`†êLºsøyfA}àjáÖŠìr (sg‰Ecƒ!’ÕÀ€±ýg™+É÷7sì„‚eReÿ¿—îÖ³Ý¤¾ÅÉµáP„§PŒ6ú'à=›a¸É0ÍO._Ï§¾°ÇÁÎˆ¢‰+s,xA"¾<1qx+Ï0oD{9Ä½^ ¼+Õ+¹4â+„±P-ìÒÖì+Jq£ÃàM£uÏµBjq?Mõy‘,¬Ñbnq“YÜS'H&ÕQº//£ÊO†Nœ1ˆã^4»×èù™u4ñbúðí„4ÕÈ±Í	YsÁ;<çZ ôÑr`JÄ_´rØÐ¦N¼9\dçËùtÂ9­gã#óÚÅ#¿9µ-¤­~sªZD#}6ftÙÕê
[´ý5F.Ù¾
ûrÊ¢L¨²’?ŠHÆsùé9‘L¿]”ÎPí¯IáW¸…rñ+ì%J©e®Çl;à¹§>n>›åœ3fI!‡ËÚ»{f¡>_n÷˜Ú X<Ú‘Û…t.'7–„OAÑXbB2 mºà±‚ÍŒú3*ÈÐòP˜24m³ðÓÏZêØ<Á
>cÏ“— (¿¯°&“áéAVw¨Ž3nÂ®ûÏ8¯2?"çb\yóN  %¼>Æ³0]ÄÄ|«˜aÉÓ­,êá=º7ýuWíP!ì´bBä'§tWÈê1ÞÆ¢9?ó¿T‘O)ŒÐÈ×UØc{UD§G·E½k9Œñ8Å98™OÔÄÉû2¸SÙump6­ÈWÄ}>Î/0§HÖ(Œ(=*q­Ü&P:ß¨-¤B5JèË±LA#ÜGœ´ÓÙÉö„µ£ÜNÖ4ûûÛ•,Ð1¡	úci1EÁízÀ`£7|ôkmØ_U]Ñ¤òP™¼" 

høžI32„N<g,Õ:¦¶ˆªsr"Á1ja/^… ¼!Ô-äQœ³c«îbÄT‰RÁ¢6(â,Z*DZ1Î…$“$h‹4‰9”< 3˜’Ë>,6	hœ¢õÓž'ØR–cHƒ­$c£ÿœÇF¶W‘•‘är+çÃ•ko’EŸÞKûäžñŒEµ¨lã×ã¡Ë¹¨<ùŽÁ¸(Íâ—)«eÁ¾^˜z°ÐðSjˆúû•:¬>+ÏÎÏŠ¾ÆSåãÞuÅÖC´Ý]ß÷„ã—±%NªêK“c^‡Š²:ò°ãNqŽ9mfÛ_|UE†Åæ§×½ÖÒÀø=ª²04ž¹µíÚª\hiœLÅ§J0xlö;?áä»“¿÷1ž½Š­Q]ïv: K¾Àš6ÂtƒF¶]
ì†t²2P<«î6ä}ûŠõ€RúÚ›Wí7#é†5²¬ÄBi¤möÅ¹My¸Iÿ¸O*Õž=®~á„Z›ÉÞ¹À{,jôú¸‘íöIÝï“l›·*B/ŠIH¿›ÖšÛ@ÀUøEÐÜ…Únâ†/c`'Ä`Ø‹¢§Ùw»ÃØÅx¨N‰>I.HHJþM7	€N
tFØyhTÆûuPQ ²pD?À#36õUüg*#k
À4ÛÇn"ó7;›èŠ%z_ÅLxÖ^fk"vZè>¿ `kÜ¾`É<Ðq,àê½+†PÉq‹Â}Mo´“‚"Â a½'#¦QÃxÂ Š˜„ã‰¼ b3LÀù1ÄbO‚Ë…:Â	J8‰ÿ'Pød<‰®Œ/nµÁ—Êºh<ÐOZia(éßF²^ú<íS‰³Ä~	À\ÀïºPbm%üP%Apß¤“ãÝím:’gm”B5‹µqB uYð¸ž¢îˆš#?ð¬¯økl?`Œ³âäÖˆ+~ÀzÅO8N…O˜ë…ÉÃéÂÔæ85€@¡ÇÀà„ÛÇªØ eÊ‘.„ÛŒT«Uø5ï~xÁhN½“¯¨#!ûØÀh™·oêqáÜ’#À¹¡ûÚ¹…zÕ¹ç`£yzÊ¹!úÄ¹®Z_ßa“‡þò	ùäy*d|ÒßëÔ¼’ž? ¬v4%UØêÙ®4ãÍV8å#xWÖG¯þ¡ÆÿtH{xtð²c`	"†G`ºI6£‚ï¿¤òÖÑÁ¯Èó£ƒ_7´Qi ¯J†±+Š2§`GÙ­AoÏ’Üpõ(ÙcÀþ7ÐX3W§ÜA¼BåøèU*8„XaÑJ•3¤àc¬Vyc>ÆŠ•7èà£W­àd)W®Ðx„Z½ÂÃ“ÕÜžÄaé Â«J¯/ë¤j%CéÄ5ˆ¯f(\Ð·¥B×uba½ò(í=O{›Í6Õr“vwVÚG?’Jýâ"á†t[÷“Ý¤).U»aƒ;[ßš'[“«0¤`ÐÂæÍq>‡ßõ˜NòF/ë ÓnsÐ Ý [›zS«	€½Íþ „8ÓEÄS˜Æ‹n<õôô	ã›|ð¡2Ý(õ¼q7Ù¦Ú0BU('PU FPµ£ÍFÑî&ƒæV³Õì¡ìGøø!ØÞ‰ÓÔÞF˜ÇµD#RKµ]émºÛ™sÚ'k¥jyz	è|³M·]i}u†¿rB/QëžTö°’n“Y¨¥XH+'ù¦­Á©¸ª"¬¬º¾O3O>è¦=vÜ³¹×M«=º}kó]ß–¯¸àG]4(®.^Üá&“ÌŠkbû9;§\
ŠHŸüðÊóÝ§¤µ#h¬®½h9”?Þ“?³²è_Z"[Ií³z/ë.lµ†½Ã[ òG<IÏñø¼™HŒG‰øØì|Æ¾{ðChWIwË>-Ž?ÀŽcB:ºPžGwÏŽ‘Ú9¤@Ðò¢b#{Ù€Ã3v_µi("¢W6Ó0]ÂˆV…P"I	‚¯"¤Hí‡â^Æ\0T˜òˆ‘":'lºåg‰7òÿÿíßªÊ§ªü¶5Åe÷ØÅµ“5Yk²ˆµHž‘@X\^bRÃ
?A¡‰’–ÙâÉõÓµO<¦^’9¤C7ˆÁ1‚RŠÉŽÁÂR¾ìp&í%å?åzû1qmœŒ 0†¯aÆ¸ÔZ¥ÎYšHè#cj…(GáñÞÑÁ7šhº0þrbå@HY
#~@eÊ?Ö'“+Š'bzfýÎ;§\€»wO¹ À§pÊEØl~vÊ% "ˆS.@/œr¢@¦[„D…é–€1}œV¤¸–Þ1!“-‰FA¸*:äÛŸšŒ–­q;K:,"ÿåÉ•D¢\bZxvžZwpP
 tM228ü¢VŒ¡ç*P€OP P •p¬X³8rÃô€´âÆ¹õiT—®,¹¨r°9vBÁócÐü®Ï/„G[¡ßré€kÑ]—eHñMéõ¸P™{²ütDB7—žV{
†Ç™5¤ŠC«¹¢¸Ê‹D7éŸ±C·‡‹·*AÞ1è¸Æjq+hòšÙà´:ÃNŒ¢Â8³|‰OV¡a?íA^P)ù›y¢Þ´\Q'Øî—¬ím¨ê|Aí…%g%B7ø=¯ŠæÃ¾: b>|JòNr Dù#Û})4Þy»Ï¬¿ÃY&þå«UÇ÷ËëSàóøŠ¢”QÑâcXñ®ãEÐopý{…	ð9Õž9.¾a¹(~T~D Bàd«Ðk›P¤A*=¸°«Xñ±ÇŒyªÖMzýô~g0›VIo'TY¡æX?!É­O„›z”‡ySÅÈÉ'»°ã²ã³ÉÂ¿§:2sÛé\lŒ%6l/s¡Á>®ÐÐ5%‘OÖ¿ßcBcò\\L^\˜>`çÂ‚}\a!›iJ¢B{Ö|¿ÅDFã¹˜˜¼˜°}?Ïû¸‚B7Ô”Dö®û~‹	Ésq1yqáx~ŸËöqåj©)	ÃÇöû-1&5,ÏEÆäEFä¹È°üÝ§$2Oûï·È˜Ô°<“… ªçòG½LIXèH›ï·¤˜Èh<“Vç¹œ`WN¨vš’ @atßoI1™yDÅq&¼_ÌÄàÔùÞ<);§nà#b ¹q!œkCjÄ‰T»ŽÑŽ?„Él˜RðîªÂ1®LÓ÷)*äbŸ×n-Ü`#Ûƒ†q’‹æVnpgdÓ2¥EGs¿!«F[´ø>Q4ö€;‹Øk:Ç=«·9Szî’ ¢¦4ýBÃ›7÷1.º=ý§4'+¦' 9’^šÄJ#¾•Q8^¸«zÞ€½´½ÁÞbæhÚ“˜ÙCïÈ ÖÖ/
 jR¹3
ðEb†sÙ¹$€LŒù5sŠ¦ÍxóÁpê×ÒB›ôµÁn&œæWx”Œ¤¯“ cüô£’³ ïèD;"ø§=R@Lw>iU›A(X¨	 ÔPÀ& ²‹bIRŸXú#õ±–Kƒ9òÖ@§s—.„—lb.:Š°þåÇOü+´@ŒÇ­SQÍJ?Ÿ~QãÈ,¨Ž(d;Â‰Ëõš{pBm©uVÈgÝ¿cv¢”3Ñ>¼wtð»½ÉöÞu˜ƒ`œP®û}}ŸO[æRz_3†'P¨^qgýJì¬÷Oy‰?ç'Êû9üÖ ˆ+65F£öøèàIÄ€‹šÇ^‹É<o(‰í ž°Ÿú7G¹“e3Éb26ÖÍ´S· QŽ	1V‘’"üp·YOû[Éb€3tÉ»>³þí/¿áÁèÈíP	—Ã+.¯Ë«x¸¼¿ ŠZ#Q?¦ÍzƒÏ¢¾Õj5ÄAöà¬?Üj7tØ÷©òJè¬"	Ì	vv?{uÚÊøù0Mjƒj›a*ïPh-p¢ñtšgoåÿ?êeÛÍV:OßÏ²ü0ý	}ÿ€ªÏ>³¼4¼(YÄÓ ú¾y£DÏn'­~ŠÁ¥{<ƒ_bOˆ.V*žçDà'Å¥ˆgé¬·g<,®™O¿wtðG ‹d8_NzÍ¬×9ÉkfN›½! {þ¾Óàá¼h_3Ä~‘üéÂlÛÝlÀ°Ø£·ÔÏÜF ÷áÆ°¯ßÇ»O]° SÙÕ¸©hñEÜ· Ù/š¦qó8þ«|<l’Öá?Ñfb
_àP_ýŽ#¤þŽNÛÃÿÅ™éÿŠ<?üœtŽ~Õ$õ¡ç#
¾\T	p˜Ôë€nXËZ@GÖÌ:äÐš•¹y¦íÇV‰1nÑí¯›J (N"Æ˜N#"JÔÃG%Rc%ê³îZ>Ì£ƒ¿#/èF›îOœæúýú*û[6ëö=‹-n§ðÝN òx‹Œ›U°>Èèsö ]Ó»­dÏ¸–ºÄH8k™GÉ¬Y?Î§žv©
Òfmnä$±Óäø‹šñ\­—J&(F2å(Þâ‡%Âä¬3o‰QaÝ´'–là™h•wig7ÉÌ†ø¿Óq~tðå”0+7>|—cV:3Ä†¬Ä²B£° Ðò+V&èiOºv2è~Íh„8µë6O´\æÀ²HŒ¨b¯¢ï WLO$jÙ`¤ZÈ—f±1R/0À+æŸ’âvÁ¨Aß5F¬î$g¼ÊÊçB§²í°éëŽ	â¥FŽ½tÀœseÝ ³²38Ù&qØmrPZ– ìƒšiKÖU	Çê%áJÚ[iO3MóŸ×ðŽM§ÀHªŒ¤±»¤“jÏfô†v ß—O2týÈ¨Ã·¿Hè<‰¬;©SU`¿Œ¨ûª€Y¸Pì	“_iSÕ®ùìd­ŒUÐœú|ûö"5Ñæ)Æc šdxáìÒ×ÓídØ¨"ƒHÎ?©°¨¨Ušà”IœY˜dåek–MÂ~+6ThÑ?4¨UélJ2a½=F\1D *Š EeA¯”‰Ž³ßv£IDŠ£GOaqØÛÆ&€uàäûª²sóbÜäüÔíú*ûÞËvá{†³‘ÙÅ'^k¬8‡+%ðˆÌ¦.d—Z20ø³6B—@xÙÖŽü¦O=kèÒžì¤Í^ÍDaðºèpÁ‹´ë±Í>j0%îžVUÿŒÜmRqÙ$?î1”æé0ëðžÙô‹«3º98Ìüg›´ËÆy(?r›Yçúó€³u´ÙÿìèÕÿ«qlY0KZ´°ph–±BQ­³³ó/_Ñâ2!•ø9yN7¥µÅ®1xìúã{>k³k·÷ƒÞ0µ&jú
Ìâ«Ö°°­Å×Ìc!4tý¸âæXY^2Ðêº¤ðôkI+¥+Kuiå)Iè~úy*®ýðJñÐd§lœ‡‹ÈÓíúê.;F5¶FÀ£U©=#“e´À&`Ï—¯g_Áû€n"¸ž	ÃÆÇ›G¯>ÿ Æë#›ü†ì›6kdªÔÊì­Ûî?œ3ŽW}6F46LÃ«=ñwzÍ:ÿ@žõéX†–ºŠ¦ë¾¥K
^8
]²NA
¾œ°žôi]®	.Ï®mï5I,Ù±†HÃ’9o0 »‰)W	1ß”+ (W–\¸üKãÁå—RN#y´âÆ÷ƒ«—pÊ?hÍ}†r ¨§üW]*¿ûšI´— úuK¾QJ\ÃãìCÆ¦Òó»¯æ€à7Xt?ñ
¨Ú_Ö85;ìõ”ÂÓl~^OuC_±Ï'•Aúç
0cèŸ—œ©g:20Ñ^ú“0˜(Ÿ•?”¦à‡bÆ=Ž‘òovAØaÉs+D¶&ð0.hQ“Ý’öX\sN7¸à Û3Á‘Ò_teðŒfVw¾g²ËÞyƒxµû+Ùêg­!]g] ³‹Åc#ÌP$Æ&(é4ÛPª.03=\³¹|!^âŽò´!¤Ê*&³Ç±P‡nÂ_k&bpÅÚL:®èZÂD‹±ï„ÅÌ:ëWiò.¢'ûöÆ¦NUmýçª9n û¦!hV2o^ÁœØxðÓ‘Pu:¬þ·èÒÚ?VKœH`ÖžìÂ_UPø6ˆ-¼Uô¬Û’ç‚Ïóåœµ˜åZ"®ú—ÕB ^P%Äu‰Ïð¡ÅK<òù0x1âsÁpÈ=@Žˆ90 6†syB ÿ[ÊNjWÙ¹FÝ5Ó•ÓtEZNŽcÛÚGý´çÓp.Ów^Žcþ½ã¥“»Ï+†.kØ²æcÉÈF˜<£Â^šS&_]ŠýU¹n`,0T´ ìs~Q…Ñ‡gly-,ˆ]Š²þÔÎV$ì“?:Â7ónùëá,`¦þÏ™$ûýd;½Ã\ØÙÊ¢ÎçI¥^_|ð`q~È½{«ív(Â-ÜS¶Gz/¼LŸ8}]íÙ©š’á:jš”å›È];ÜŠÒç5SjXtŸ¼M—øÛo5Ù—ÆäÛŠ¹÷Ž†Ö·$´>îŸžÑµ‰ê	O–ªKWò"×7ši«¾ÑHé@0÷o‚mÍ]˜¨€+£ÈåqXN¾Æ s™Y×?Ñ¼åGžƒ‹²Ø'µ°—²žeÒ—'£¬ù¥N?åüÊŸZ¼oòa~Ï¹ªŒ¬‰"GxÑG•µT™œªY8Tü€þÂn•Õh¬À&,,èPÖÌ:Aï£Vg¯Ì"lÙ°?nž´RªWXV™F,m»Š·;a‹SwÏÙÚã¢n´2[p ›¸æKh¹dN\‰gŒåê0…ŠoÁäajÍ:¢pyöÃ!ÿ¸»ù\3©¯ÿ]z½Ë¶ÙÑ¯‡)è
œº-ƒû~p¶š~tJ ºYOZäLa­ÓàüQÉ¹ááÍjè™QHt¸ÑbÌ*©ÌDö©€>)@«‰­!{cÉpì:
CæŒFD3šæ$¿çyPßrô íýý#òðý³IÑ?¿yæúÿr¿BåL_ ïÞúq î)Ï¯;0MœIbY¢9ó ÀÈIÝ3½ýÅ·ÉÃt—H÷ÊY=i‘·UjƒØrÀµ©€ÝS$@æî·pkG™Ü¿9‚L4Âº2ÜA3¥~ÙX¸´bIò ¿y¬Â¸y²Œe—­íóB»·°|•þÀÆ\§RÍ¼âj…¹ÌµöQ±y6L×Še]ã¿¤ØÓ^}‘aKyûèà×ÍÒZÏ‚‚Oî°Î"0ÆsLÎbCgÕ_3Ì—tÍü#? ¥?´\!öp@W‚ÚÑÁï`«ý¢ÔY©³.\'®Ó@pl)ÅˆƒÊƒ6¤»ÛœâÓùqìAc0
ÅJÊñVCÚ™ÿÅ†"kMfÖ÷Ë»è”Ã¨C¯³ÑœÂWa+éL¯)=>Êñç³„Î‹N­³¯• Cyèþ-ìÚûÉVêFöŽß1¤Ý‚ÓPä&²¶ÈÞá}ûã|ûeì¹åo‹%‹G«¥·ùnÒ¥dÇ<!’LíJîàU©IîHAQ÷9¶þbVêÐ¶bmÑ(]n<k?*¤Å/*Ü}:sE‹ÏàÈÆÈ§~ÉRBêþÅpŽpŠ›Y×ßÇÌìáÎáo:¤O§]Ä§ú1fvlÓZ6§eQ2EpS¥“øŽr¼JéÙ˜›Ž¾ªqe€|÷õÅìtJÏRy˜3KU’óYz¬YÊ};µçX£ù«ZÎ«ce·‘dÂ÷ä'’ßò^frMkjm¢ð7íJœ[a4&†ªÓ #:íÝ˜ù¸¾JÞgnŽŸquíÖaÊýÏI]qW«Uo û¸3K³™…J´jZÑ|FSVl†ÎÃ}Ð1Fx–…²äæòÛ:‹ƒCïµôŽ1<6òÀ‡‚`CË+¬¶YÖ×ËOV ™yèîk!`1ºP8Q±UÉðÿ/Ý±¾ú’|	
&c»S6©pJÏ`ì-s¡p\
‘TrdÊèÀ±Ç¦çRî.AT_OwÈ©…PÖK–ÁinÄÇÙœ9ï)vžæÁ”vºÓ‚Á”ÐqpðŸ¶õÛƒc×}Å­û¸žÚaIï·Óˆž(ïâ†»{tðûûäÇ‡ÿñ#²qôêï?böVWêÜêõ²Ý™ÁËs|B™ï¼ÄßöÎhw -< ú²aqå‡Ü¬œoq½xQG„ÚæÖYHÂFàEøgž Ê3h‚Õ2§fULK‘fØiÛ^ñq¸¡l•1¾ZþÑî_Úüúd©º’¶ŸÚ‘“¡²Ê|âä`»©=—fNÈàšwZ«4"¿Ûëø~1ž®j†1¿*Ý€Å~«kËa ÇÍzwä\[l\Ž³”úŽ‹—=À‚nÄ“ë`ŽåGéœOÖÎx*ŠqÔº8Œø¢‰ÆCšq¾iôRŽÇÎþ;ÚzÞïoÆ ?åQ2Ý# 
¶ÅVÁÀ&šEð<B§Â®š„Ï›s£á£[dÿ™Šø¢8¬ØŽ"§/o…Ý1hÄˆÐ€`z§Á¦>åúE¡›bùl×=Š[[^ºRÉ{ß*{:)×Ò9UªÂZ	d?zæï„°#bN·¯-n·}@b¯™Iä¡
dÒûÞ+%ö½—}o…c"»^=;i¯pü0HA¤ÁÑî¯!êUœ.ÖÿØÙÉßýæ{¶ùv¾Ègæ”v½ž•ë5Üõ:[ïñ~·pƒ{+8LC»[ÇŸÈ•.—âÓØÚÏ 8!ý÷¯   ÿÿ _¶‡r