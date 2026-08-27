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

  const normalizedReportMonths = useMemo(() => reportMonths.map(m => normalizeMonth(m)), [reportMonths]);

  const filteredBudgets = useMemo(() => {
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
  }, [budgets, costs, projectMap, teamMap, dataDrivenTeamMap, dataDrivenProjectMap, reportProject, reportTeam, normalizedReportMonths, reportRegion, reportType, isAdmin, isMod, isGDDA, isGDKhoi, isGDKD, currentActiveBlock, teams, userProfile, budgetReportSort, user, resolveProjectName, resolveTeamName]);

  const filteredCosts = useMemo(() => {
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
  }, [costs, projects, projectMap, teamMap, dataDrivenTeamMap, dataDrivenProjectMap, reportProject, reportTeam, normalizedReportMonths, getMarketingMonth, reportRegion, reportType, reportWeek, isAdmin, isMod, isGDDA, isGDKhoi, isGDKD, currentActiveBlock, teams, userProfile, costReportSort, user, resolveProjectName, resolveTeamName]);

  const budgetReportWithActuals = useMemo(() => {
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
  }, [filteredBudgets, budgetReportSort]);

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
  }, [reportMonths, budgets, acceptances, efficiencyReports, efficiencyGroupType, reportSortBy, teams, projects, regions, projectMap, teamMap, uniqueTeams, resolveTeamName, resolveProjectName, reportProject, reportTeam, reportRegion, reportType]);

  const projectChartData = useMemo(() => {
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
  }, [projects, budgets, acceptances, efficiencyReports, reportMonths, reportProject, reportTeam, resolveTeamName]);

  const regionChartData = useMemo(() => {
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
  }, [regions, projects, budgets, acceptances, efficiencyReports, reportMonths, resolveTeamName, reportRegion, reportProject, reportTeam, reportType, resolveProjectName]);

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
  }, [efficiencyReports, acceptances, budgets, reportMonths, reportProject, reportTeam, efficiencyGroupType, projectMap, projects, chartTimeType, reportWeek, getMarketingMonth, reportSortBy, reportRegion, reportType, resolveProjectName, resolveTeamName]);

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

      // Auto-update Firestore team documents if stored team name or team code needs normalization (MAY36.1 -> MAY36.01)
      if (isAdmin || userRole === 'super_admin') {
        const docsToUpdate: any[] = [];
        raw.forEach(docData => {
          const normName = normalizeTeamName(docData.name);
          const normCode = normalizeTeamCode(docData.teamCode || extractTeamCode(docData.name));
          if ((docData.name && docData.name !== normName) || (docData.teamCode && docData.teamCode !== normCode)) {
            docsToUpdate.push({
              ref: doc(db, 'teams', docData.id),
              data: { name: normName, teamCode: normCode, updatedAt: serverTimestamp() }
            });
          }
        });
        if (docsToUpdate.length > 0) {
          (async () => {
            try {
              for (let i = 0; i < docsToUpdate.length; i += 450) {
                const batch = writeBatch(db);
                docsToUpdate.slice(i, i + 450).forEach(item => batch.update(item.ref, item.data));
                await batch.commit();
              }
            } catch (err) {
              console.error("Auto-sync teams error:", err);
            }
          })();
        }
      }
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
             xœì}{ÜÆ•ïÿ÷S”{³žždºç=–gg¤;I$kìxW0bv“ÓÍ›ììyd2d‹Å"X¬½ÁE,ÖŠo$w<œÅâjì­õ÷˜op?Â=§ªHÉ*²Èîb‰ÕÓMV«N:Ïß!$¾nþ7¢¼6ö}Ë5m·÷þt#öŒµÙ8j-·WIŸþ7èû¶û´µÐ ó…-CÃ½ùÝÑÅó/\âŒÿDvú6öÇ_nÌÓ_”nÌwFaèÁê[Ø½{îŽcwŸnž6gÉæMrJ+Ü2¶ûxÔÙ7:ÍëàÀîÚ–Û=™™ý+üõ^ðÐëØŽõÐrGï-·y`8¿ô“ÌÑi×mÜHLâÁÈqÈc;´A«k¹¡å“ž1l-ÁÌ[ËdxÒZ"¾7rMËl9=ZÇaë8 ž¶:žc’Ð7ÜÀmÏmÐ^èºýÖÀpíáÈ1ðëÆ\á@ŒdÈææ&ç‚Ü"N¯@CVëí…ÖýQÆo˜ÞQ+4È:iÐØ}kp_ß;´üõøÑÕ…FÁfÕSZLœ†ß³Âiæ;öÅùßÈð›‰‰sCÑ7¼²ôûÓ¦PÂ$?úÝ.,}h¸á,yóM¢¢¨‚N¾7Få¯·›†ë½#Þ‡1îØ~×±¦½+öûãÏÝ>9´Ç¿q¯Ë†¿C8™^Sf2×›8óaN…4wÆŸÛäÅgÏÿ#$}`Ø$„ÿ~æö¦@›§}#xdù;`1š3};=ÿ¤}h[G3…|˜vPJÙ´Í»œˆ´+÷5"o	GÓq5ô]HáÅ4Ëÿë„D‘ùƒ‹óŸtû$¸8ÿ’˜ã?¸0á žü¸”‹„^ð–ê= Ê!™ý@—§=Œ¿	Ú–i‡3³W³5„~_o¶=Ä)y¶Èã¾m9æ–cù“
ïÑ6yÔÿÂ‘ý÷94l˜æñ¦´IT*%{ÙÍ¦}˜¿?ßFæiþ\ê»Óùo“]ß8Ò»ãyHßžÏ<‰Ûñ|Óò[!áØ
/Â¢[+DXòyXõìˆ6¶é‘Üàe;U¹¯çÂ&Ý”ù¦ßg³aZAèº¡}h5ò·¥hE±ÿv„öÁIjsM-.Ä»òØw#ßŸñÖmÈÌ@$ëøÀë½;Êó
t»"¥_F³/>}ñw{wÉ‡ï_<ÿßûrRÝ˜ß–gŽ˜2_¤þL˜<ÒÍC8ú¼=ÌŽ@6§vðÝ‘·»–s”fäYrÇ­£Ö“EàÃãÈà¸eŒBùß
†ðÎâØâ^÷¼ÐîZZÍQj¯e:@¢«ó°fœ`—¢ÉKœ³1Ò½Aiy5^ã'K¾5ø(ZUàÃüSòüj–›#Ÿ®vky!»	²£¤T‡ÿiu=‡8½uúÙ÷Ž8)[!œÚð‹”6;VxdY.%Î•ü†“õ5l ËÄÇ–sq²Ÿ„Ûˆ8£âYÍÔl‡˜ÙÊ8ÚåÓû¸A{Yµ¹5ðêÁúQkÿé·Öä¯`ÄÙW…»ºVë¤µÈvh $SE|ŒÂ€okÇè>%£!Š]#°p™»OAíhÙ@Al
ØŒàé¨8Î¥½²Ó¿xþŸ¨uœÿŒ¼{pàØ®5¿k<øjü	/ÎÏ~1íéøK €¾wñüY(=ú+Ò7æ^,’k`SžåXšd[¾åÇ–IÒ¹jè_?C)ò_‰yqþ[â0ûÙ€Æ¿8!w=—÷Ží[œ¶îÅù¯Òá»ìí¿þÝÅù!²ãg qá÷nþ·ÄwþÇ.@£ÿÃ¥F]‚Ö‚Ü0þü„4s„Ißgà¹û“ÅEd$1©Ò“é¨ ¤©…v¼«Sk·ºpñÆÍ;¾eÓ°âÃì‘k‡x±8SãD8Û&/>½8ÿ„*_ð¿ðR*$ý÷K|gi@œÑø._Êx}Cÿk˜8¬Œö/çÈÅù¯á[˜Ü_Â?tÂº}G>'qæ~_=÷HW¶&’L
ø0ó¿ìÂ°€Æš¼®áÇ P=k¶-%¤¡&=Y¤ì:söEG¿ŠnÂÒ‚4Õ7`­ÆÏºdç½÷wIs¿?þÍ`Ž<†y2æÈ‡ã¯ŒYx©ç‚7§dÒ%Î×¿Áôà;Ž?§ÓöÏðrôµ„7t{Æ	Êj¿Á¹ÿ›Û>³ö÷aŠ ÐÂÓ>¬B	Ò³Ç”(=ú[—~}ˆóØ}Cw‚¤ò˜üK57N‰)È9ˆ~‚€þ‰ç£ŒaofÏ’ž)‰œ}õVšóÑõÜX°˜Lÿ šˆTÜ6^Š-JÿÁ»;[È­¶·vî“­ý{Ü–L%}É¬)·lP|H+k…2HÑÁ>Gìàq×÷ø	¨J ¯€ÒÖi8>Ëx’E¬PU	îZ£w­à’Âßˆï^£‹[Ù3×ãW¢Ò•ˆÉ<~ñÔÿžåt½AZÚx8Ä6›0A6°1Ûp6O©-
N ž`ãnžž¦Åä¾e÷úá:™Áé˜Ik’ŒÒOÖÉbúûá÷lwß®ÃäðÑÞ"+ðâ7d7n{ ’R÷Þ€{×„{Sšw²8Üh9ÖÉB{)}£°ô é¾mš– ‚§è§tof%®AN•AØZÌü†\?ë/åØ(“s~\Š÷•9~Jïh‡…¸$r9&{0BËü…o~ˆDÇ¨7GNÑõ ´ão¼Õ†vØœ!3³í¡7lÎž‘ÿ÷¯ŸýD­ðæzbÝà«Ø.Ê1›ûþÏµñ/ù»é«Ù®i÷<&c¼øÍP#zÎ÷y·J)o¾¿$ùVvBQ9 š^|ÒGg_–i•ç“M¢ÌÄ9›`ž€¾P{aº@V°	žr}8þ`©l]<ÉÑ`÷ÐðŸZhíÏ1õe(ÙQ”þ9ËÞø95~ÿ/zÐ~AÜ¾èßŽÇTÓŽå•¬ ¯Õ%S•à†‘×ÅIß·`zÂp¬ÏÏÿ:m¬ù…«+k+K«««ý„Ôa»Ùø>l÷©ìi7®ç-¶¯ëA'–ïÃ•¿µôP^ŒrøNÒž¢3ÜÑ
½–O|o {w„ÄzDà«ÑÑ›ü¾ÇÉmø;„£³˜Þº”œÜÂ·+ÑáÛ–AoÀÓ]8²{„ú4#µ”¬ $ÏYÍM’„Â7ZA Âd±—ðÀvœVw3ï†Â Q*á'Ok8‚#InžcöwbÂTÐýÆ¼QFö9	!9'«ØÆ¾Ñ	È¡CÜ<esßœÏý ¿ÛmÑƒ_Ð’œü(Q;WÄ“­‘²»á~{<ê ÷qG°‚>aÖqû€/Bfƒeüø=3ëÐgßÝÝÝbŸî!Ýº†ó84¨)=~få¥fß™¼]!;à¥–ðRÉxÉx©d	¼(Å"ÏþkÞ}Ìò?°»Ce…pïdËÙêÓ¬	ŽñîÓòÃÖr¡áøåì6ÂÞRWp› 37a,§ùñ3IHgÖV†Ç3póÌÛkð¡xèe°!*ÁÏß þLÀô½!n/å÷4Ca'ß5n-eL6‘e+2î¶þ¦´‚¸‘ù•ËU\`èKv-K¦£hê?@› ƒX.?˜UFd¼"ëïiÎ±á[CÏ©Sc&°ºžkè„uèõ½ œ‘˜’é‚Û?Ä]={0MâcãR1k)þ\@jßÊS»
_V?f¥y×ÌÀ¤oWìšÍ“%Av},wVd,õYZ4<©çBn ÍÕ¶ê‡Ë©}êS[û
9b†o²=~æ‚þÌ“êåÛjG|–êú°,G­áqâ¬ÀMZß"=$-œf8ªÚ7©ž*$Z¼Ô„;ô½¿µºÕ)¯bêÅ«„‚W…ÿ[%cƒùLÄz]‚œQ^%Ä÷®t¬ÄnllMŸK…T·‹Æ´ñ3•ŸYîTIõRwÙCË\Ë5O>ùC§šdÁY×uVƒÙ‚Â•ãÓ ›«_p£Ûµ† Íu­ë¸ê™ÑÁÒ[Ë7óªÖ^@¸ÒÚNß‚s¸ˆö";}Ø‘‡÷÷¯ž
:#ÔÚÉ6¾ú–Éh@@÷Äp¯jõ£®ë,ý÷@ÜJ‡vKÖc>‚ñ³nÿê—¼ëz=<,·ïWÆèYÇu[žd’[ð(cäêW;qÝØ|ft°ìž«Zx1w¦Îêç²8r+/¦dÔZ}y°–< r
ºG$ŽËÐBâŒ…ëF±ÉÀâ9½q5´ÊsYjJ£y£iŽT©ÐzõJL¸n«ÛU/x’%RcÍeùc)ÉD¨¹î“$”ÒLÕqõU‰F‡l&%qx1Ý¼5%º)¥œ8£fº‹$ G;Bx¿z…K¨G1>å‘—ÿrÊÁþ%$Y`5KÇ±W#É2rœÐh–š`7[M‡å¤jI`NlÃå¿W£Ø2»š˜!oCyì(âñsÔšŠ²WšV%£ÒÃJûýRMf]t¡ä]˜kdžd ³n’ŽåxðÙrGA6þXå;SûÆN”N­µ…¬/,YýïxŽcæTZà>¥¥•¬O)ãQÖ¤çÛ&Áÿ`èq€~s]üÓé	®²PaôjÒPcú+|X‹¸°åàMðßÀ±é‡õz‡Þû;0>PRfuvß”äˆN(Á¥»£`ãD¾0’‰÷WôFÃÈåù['­'­ÑÝ–ÉóÀ’‰¯˜÷fÓwc«Š¬î`XA6Ö]xd×
º¾=ÄAéxÏ²!	™kAÌüd¡½ˆîBd§Êñ&1™É	dÿâüîÝE£ùïÈøÇ{’=šyÅïÛaZ4¦C[.
‘jÜ<5 ßñàqºqÛÜ;°ƒúÒë™¶›çÉºdYþ’þîÏ‰Z#îµ"WÁ¬<)½æ"±îÝÿÝy<þñÎ;$K;TÿÌ^vÐLBÄÔá>X/'h’Î“6¢ ý'‹íÅp-r!ˆô:uáÔºç†N{o„Q¿w<usæÐn}°73Û>`g^YZå™gÒP>6âåH”vzéÐºŸ©CÕ&Û“N[‘[Ù®ÕNL,“nDòO²wÞ¹G½3þÇk¹£ý¦¾­·ÕÐÊ={¦ØVÑ>Ê¦WÐÈ$·üëE‡W²³xLæ5ÚWQÌÎ¥‹c;/à€ÛAì
wU‰6µ½ŽTÞ<+ñæÙyñIAõKÛ>\XOö` ˜Ò&Â9Àt?š¤Íl'£xÎ¶0jqð ²@ø÷¨µŒú<ü'AÒ¢ÙÞÃ0D$‡(ÿ‹kðOˆÿÐQ·b{viA9Ü·ä[·d×s¶Ã"Ka:¯Ïî"¾/÷H”±w·öÞÁìºO¯ÑÙÊ–ç²ÎUß:´Ü‘U;ðE¹Š³5þ&~ž1=½ƒI]ód7z/‚ÆÃŒ¹	Õ£ô{¯ÞèÃciôB¹™¦Cs±²–šô{œfâÈ±CIyÎY+»*Ÿ9­ŸYU%J‘¸-K‹Ï¿ÉÎm
»N3îRd‰¶@r(RiåA³Q}²Ç˜'
ÂÍ²!M8=åä¾ù´žáæd´s²’ä«(ËQ]L2¢úãgnž,õiœ‚VgB=DÎÕDæ°M6ga«ãïïÑècøý‘åÛžÙ,|döL’Î+·"«œ1Öˆ7
iâ[þ–‚‰>Ú]ÜW23+qQHÊ(‰	®ˆ\Ð’G„3ÑH¦µ…vO~©1˜&Ä”µt¢(m²±åûÞÑ{tƒia™”¤¹P„òŒ0§ÝêÒÓ¸»&cð^L[¸—éŒÜ(U0à!¸¿…§C+<š@†,/QIÆbâÉÉ*M‹Lè‹d3¹¼§‘V¡Ùp€‘@bÆÂòG)YŒ%~-.¦$1úÙ´<VI"YÃ‡ÿdó>åàr_çø¸‘Ìä1›Z‡›Çç¥ŠíRi©!{à¬(%½%ô€Õ}ý»¯‘×ý`¢J0–ö¦I97ŒbÕ+
y#‡ÙEFŽ®âÏ(@Åï»$„íŒ|¹Òi¡—Ð³¦˜LÝ| Õã²Ãx•’ŒÒkå², BMÒ‘TŽ,\öUqÙ7“/DSNõUNô¼äÉÈ`¡…â­¦E,šGéÏ^¥cç:¤ïxÏ
†pÊCÅp8`Žl3ìo6Ç¥Áù_Šm¼ã†0Ý&æˆi„ÆæiI¿yÅhƒ¬Þµšsdqa!‹ZFh “ÜÅ£.}ï©…J„áûÆÉfc™,70ûÐî&™œü¶ÍÆ_,¬¼]°ênÛ:‡ß‚Ž\c †¢Ë€VÀ|ÅCPÞ‰©šúw¢‹Ó×ÉÌ_¼½b,wnÌÌQb|RØ:Lûë{<!Ãdrñëœlž..¨‚(Ô³ô×t–r/™{—C^cCÆ'™.;Ú£i·gã¢Ô´ïyNhÃ=òÏ»?¸q`tg°ý.Ó+7O7nÇ´¸k;–50³¨/ÐOr@CwƒöƒT¶²|°
Ôéó£`óôÉÚÿÁ‹.|tF:†o¾yº¼TÔ<Î#	O†Zâ¹ˆÐbÜ7 4ˆK7wÂ{	±¯¬¬Y«Ñß£ûötåtœ'Å_ÇAESÃn†•î^'ËÑßtöèÔ1y7nåFö¦l#øâE7æSìAÎö$lH“ÊdkµL$;Æëøè)œÒ%¢³`%ÊŠÁ1gVÉÃq‹	Ã+$±vä-™±”,µh¢z/‘›Wuäf…2žmêè‰ÁdöHút	:WÎò¸T"¾÷î=Âð[:DëéÅùWÄ~¢€+LÿB‹&’—XMK³Ì0 ‘”Üû´ÉÁD•wäsAz4¾<ŠlÙÙë[æß¦ÑíÎ!ßôi»ðùý“:ò€}Íþ•^Wï1öT·7ÎÝÊ:ô­pä»ÂËÝ$äi¦†0Ÿü>Û½;ö±e6—f1”laFÝúÙl³ ÌVA&*¡Q¢¶$öØÆÍã"y°@^ÎRå0L¤þ0#þƒŽ6¿¬²µ)öØb¼Ç¸í*kÞÏb+rŽ¸Ëu„4v.ÎMc¬»n¤¼u.Îÿ	ŽÎ¹4Êà Ñ /Îüšê/›êã%1c©¢­ŠVsÌÊZó”ê1‚9jm:æ¨âó§dgèC8ÖjxŒg³A¡ÿ”ì{C"¨CwñÜÝ©/ÉD§Ôûô¬^”®?#³íÊæô¾¥AïS²ÓÐõ ™G¶¥”ä’[
È;« ÂÝ¸}ŠRlû¶×”ê^ÈHñ­7
o&2·-ò…{‹nÅrê¥R§xe@ä_¹=0†Í&()þÉ¼£iSŽQŒ½¿±c÷súq>¶¾uJ=ûøŒ©'§´A`mŽçèxÍ$slÌÃ(9­‰EÊVó”ks0½'Žg˜ÀrÊ˜¹}@š6êÍ7ãç’mÇr{a¶°3Î²ÚEgY‚:û"Ò|Cùy²¸ªtrg{Ö‘tæ’	ûè U÷”ÏÊ“…Ú¨ªøDy×iŒè\02SÉw(ìY÷¤)tKwÔù”ï¶À]…§aÑ¶äî×+8òŠ”ðùbv¦©šV°/ç2˜%;©‡	L£˜aÐÎ)«°Ï4Ì®)X-æJ!¨_Y•„¢8¢.»¥”^ÚˆPÉN)Xþ¶ƒl˜Œ•®£¬ŸTðqÉæT˜‚ßÖ—Fn¾&ˆ÷c§f´CË*oÔ²FS?HË&Û 6ó¤K¥s&~§ÃnG13ÜggÉ·¶;‘#fÏþR§ZHÑÖ.úU~îT1«ñ”snÖÇ£ÁÀðO0þÄ±ÔŽÖú!¢YëN!¢]Z -õÔ¢])ÎÌ‹½¥ND…«UÊ¨Ô¡P•p}Oº"ú¢ üˆ¤4êBÜ\qUäÞøñÅóßÉ1k§å	ªOä>tûÏ¿tõñÑgH1úEtº|PC.¶a”ÀrÕ¢T üç|¸Çí|ïãJ•u)æö¸Å¥y§bµ¨t<å·4Þ5åÄØ´Ó^ ålÆiŒ©Œ!$ŠÜS9GÃ
?³‰Ûû¯_K›:tÂEæb/g£Î¯t©Å7~I«]€¨§^êú52 ¥2žNÏ6yHþ’E;¥=üžw”27DQXtÉ†ÅDKµå J5(ÃÏ32ØÐÊê·—ÈQkqýþþÆ|Ü“ÆX”ÎIÇÇ¼•­¡gÓ“:b*n*òjCCÑ¥ïöØóÃæÐ·©‚pŠZ ?J£3sÄ´}&­¼¥?²ÍE§š7~ßÆñó‚.Ýuð†]º™ègj#Bõ@+DÂÄ.ä¹Ÿ¬A+¬¸=­÷þp×;rÓúI¯Ia%½BÉöú‘ý“º¯¥±Ì"Zãw\j‹ÄfË55(O€Ú{Mu×ŠêÐŸSDsô÷Wâö™Š‚.´o8Áñé»6G“øŠHŽÝp­hNûˆÅCŒ‡w¿éTwÍØw$‘]tËµ"<=f'Dv¿&; »¡©8×‚ö<»îàçWæ0bìÚ¿o¹«IÐéÕ:ÿ¶gžÈ›/‹¯a/@h¡e¢l’'ív[òòQïBßé”xyY£F7ôüTüLLj
jY¤rÔî=tËZËqÂÙØ?lD‘8¤E:qª-ù6Þ}QùRì¿ ½P ŒitÁÕ&±öí†CßL£#j»Á/Ða433Ûv°«…¡½†o5;âoÓè›	MbçôúŠ6a½ ¯**`T÷mÍòÕdÑX	ÍG?¬“…ò82hkÚêˆmu„¶:ZmEóBGÖ¢êÌˆÚ—ÎTvz¦ôÑó'v‘Êó`žjdÌsÄ6µ˜¼Ì>#NmD˜¨ø÷*áo¬;@DÄm¶kÒ=ÑÏl©[Ñˆ3IL§Ìýn§ð"î…ˆ¹—A‘`Gxì LGµõ¢Ä§LGA†DŸ"šL•Ø"¼,_ã&š|‡,žñ›Ñí®,,DÏþ§Š/héôcy6{©2”sp§Â·NSÄÇr&•—q<Pù&-š¥æQ;„õŒìµÝ…cw+Dç|ù¬hDÝµ/8w_Ê%«ö«Rã¢)E¢Š^G3l© d*C¸¢;ØñŽø@¢l|žHAœ¦àuú˜SƒI“‰œvFhe,> =ÛøÖ_u§ÉýG0K6-‰þ´oØ…ØÌñdèÌ™ÖâkÜTcßç–Ši0Jf#àŽÙN&ìLàÈ³uXQŠ9äÆD©87
Üðâq‹;£¬Ò¬+³ð¢˜ø·´¶¶ô-˜Ú¥¯	ãx¥[‚—c"b÷r#ãHŒà.c&}ñVÊÿš*ÑNÑb)	qC'þ`ýÊ¶áh}ñ‰ª¾Y2sÒÂìÙ›¦Kò2Û,¹Q¶(#‡hz£BSBùÂÒñC´jÃYŽ¶™;MPÀc†}
bàYaâŒx‚XwÏQ(ž%77É*Ú!au7h6A¯e $SB¹ìOèbDRNãf*¼©kx|¬e||zœ·ØNÀ.¥Ü®’èUyQ¼3¹Yÿ¨Þ ÍgG#HV ·I‘ôóqkòøÔ$1*'—ø
#®bžGƒhB¸ŒàM–Ü¤ñ()Ö§¶e~hHè?§©&?+šYÌùù$ŽÃ‹óŸ PÆ3›ê=´jýR¢0UŠwÉP–šäJ5¤¢”†åJRo;LìCÃ5zp¹!kÞ}ñ)¹ifÀ²u©3õ:Ø@Ti„—¤¾ß…”~Þ÷½'ÉŸ[ðP¯Ö­q$ƒ=£ý¶½A(?»1ì³<úYÒ¯ä1Ql7OtÏ=ðr´Òô
I¡ùCÛs¬åòÄ 8•Z7¹HÓ•ÈCõ1‡ôŸŠ0‘rt 	¥‹Ïå`@´@F=ÂÏ…ÐBEÊu‘N˜;LSè—É"•:?¨ø7<IŽX6‘)ÞçÛÅ¼ë¥Ñiã1T¨Ê¶¼Ò_$XÈðø² iw ‚0gWnXëùÉÄ‰ði¦¹	¢6ßÄ¬£ðí2ÈG]*,òó‡1>ªœ‚ÂBÿÚµƒ¡cœ`ÛÍü½pJ5¿%i£Mg{Ç3­³YÔa;ý¯g.ú]>öFIBƒMý¢¤®„}–cQ7Å„2Õù„ŸJøþ˜WTˆÊî!žÁµÄ€sÄž-1_R›>Þ”DÃ
¨¡ƒKt *Stª0#¬½J…UŒ¼Ö(¢¸ã?‚pÑá<¦3^\4©S¶4–Iêž‰‡]“Ž$x²ðÑ­¶mr@a¥,Ïý [ÅíA›Mh;¦§Û§?Õ¬7ÅšÚ6ÞË…¾
\*©¾&ª§BÄ~b»è·ÞNÌÅò;ëœ¾&MØµúÐ€åo6ø@\ÉSºRív»\%Ëi1QÂ£†	k0 Ð²„
£K'ß>º˜³xK¶c7Ù0‚öm³ƒuPÄhêÒÌla`tqÛ{veœ/º1Åö¢/%<OºJåã+•ˆ.­d°y‚ŠUÀkìˆXt.êÿ”¯'õÞt4²’ãæïÜÁ|Hgã`ä‹a{U"YÙRwpq¡'a5K—"tq§E™ÒI;¥sÝ¨>9•çc•”9©Õ<ë«@ìZš­sãyÙB Öù&3{0‰ÔGLŸÚ¨Ï û#Ø;]¾wæÈS´sHàŸ… ‰¾ø$µ§ð¤›DÒÎ‘Ãñç<7küï¶ ˜ÆÀ!Î#üçü÷Çâg-rñüË!Kàætqþ+CS[:oR;ºL¦R×õËŠÊ”ÈäG¾1d‚vé¡¡ÊGŸjñ¤œNÌMÉ"°2YDùÇ»”šÅDÌæ‡ã/"Q•s,x(ô=œîÌcì8Mv2Ã/.¡MÚXp-'LÜ5û6VDýŒà4îI¶Æ'O|ëÀ>>ûöÓªü©b¥B‰½àñ¨CBÐ¯Y–·Ìd€&PpŒ‘Ã½È$B½jR›ˆÌÛy`a†:SàPÐ9—hÁKÌ©ŠTMº}c¿¯$ºˆÄÊÃâ¡
Hñ©)Y¦¡©)´HëIbyEfœù(.*!ýQnQ¤Îµt]tÄFU/DX1ç mô£×k^ÒJ»4$“f<PjVˆƒAD=sÌ½÷jÎ²B[2y/><!udºSˆ¾ÃWsË€H)0BÙîºá+9}wlTi$•¢ÙÛëõÑ[5Àã'ž?òðþ~õ9d?#“•€y!·ßßÚ&‹ëdŸÆC4÷ûãßæ°zË—Æùpü•‹ŠxìÉíòÂZIåÕN…¼ÀPF?yÅ¨j#z-pMÏòxªž‹Çµÿø$ •„šA¹QŒjo’‡ži8$¢ßæÈBFæ‰èsP&SÜºÄQ‘z>FƒmPì.*Y$ºXëH¢u»"àEv5Jm-j ŒbÏµ
UGáÛ+À †ÂÅÑ,©E òHnlFš<w–kÄ…Ø¹yRT’Ê¡è1Á8m¡ùøÿ —Œ‡ŒÚÜ'ä´Kóâü·ÄaîõÎø7.11É÷çv[£¤SúmJ×;³`­èß%ûw°kŽ×#ÞÐr7Oí`Ç·€d¹ey~8#ž‹ÿFÏÀ
ï)îÔ vwÄŒ ˜¹£LZI=Y\‡>}eüÜ:¦A¼n–A*¸çGasfFË¬'>Œúaí‡™"Tûñ]šƒàùïÛfÅÇ#Ó5{÷Ì 8óžuDÛl>ùH³¡3À½ã8(€§¯´*$ø]ãøcþÝ[)/žÂy,r ¥öª:Ë(¹ôB0¿Cö/ž?óŠwâU®’½3µw´÷Z$ˆ§ø`#}­.¤B×–“ÂE"rjš<bEŽÍsœŽQ‚¡!:HùH”§Ê…:²=?rFÁŽíwÓ§ª}%”É‹ÿ%t@"û×{Çyá%+MKÑY–Œá’##¶¦éš]{}j²ûã?‚Ú.5•þ«Mcs<n7¥Ñ
Skæ£þø¨FÆ@Z“’ÌÐ©žíC4ýXDn:(D_PKN@Ú‹'š¡û°•Vû%;ã„Yf†~IêžºC)Ö¢¼&^•ñë‡¶!÷ô¦YD¿ÄòZê¹ÍuG>½c])ïä»ëäöÝ…Å9òp{aI‡©GWäæIßz§»¼X<jZ‘78#XíÐð{VÈàÛ¡÷>
Ö; X7‹Ý3Ù+žûtkÏ%aŸÚý‚UŠ—f²¿ù%å>Šá/*ù1Àˆ3:& ÑX@
&ânšF/™*_.-ÊÍýŠ{'¦ÚZ4›ñÃ hN~0:!T›ì’æÎø+êTü„Õ$Àãô3·7[‘À«’·„å’æ¾èÏ!èÃôÐGK|úŠà:Ï‹þÓ‹ç¿á¿‡{oßÕ§qš’>™*·€¨wM‰Q_›ÖÜ×ŸÖYÅïŽN(ÉßµÇÏ!­[ko<¶¿Û§!ÿ¢b\*–¾DŠ”ëÂ ±ô•	“hêú$e8õumžFŸôŸµÃð„û&õw}ŠÎüf£Õ",š’Êôó„›ÃcDZ­o8Åîïý£cËeÂœyð©‹.ŒˆÛCþý/ve>!é8|?`D]¦†º‰/nÈ±MqÚâÞ™¸ÑúD~•´Õ^­­ˆÕ½V¶]ƒrï¨äM2fQs÷j‹ËEHðª”òš-µÊ¡Ç¡¨S8ûú£@€M9ØÞ['qèoÞ¾ùô_P3©/º{õHU0H"˜õae!oy`µ±Å³:ÔKÈ)uWF9nK-*,…$œ(´ oˆfÁT…¾ÇL•ŠÁ.hè£V'–áÒLÊgÂmTy6SJ¥Ú
~vEèÔÝm™d“¥ív‘i´¯¶mjÛòÙ¥[K&sm8”Ð XÞqIålnN9Æ×ÆüËÁ³Sˆ!ùRË±	º+à/7iõæ¢¶íª6‚äbET»Hï¸ŠI ¹ºŒ¦¨}¬¢»'—  Uòœe//Š‡RZù¨à*vMl Û%mbÿMÿ}øV´—*n¦ä:#–X—ö:ˆS¦~¥¹hüºþ8Éøk=§é×Ë^ùh¤ôŽ^Ž˜¾àÓ;ðº£`ÝÇ þ- _–q„ÿ­³=´ÍGâ¥c„  k`K¬¨ˆ+«×ÖiÜd•ƒÇT!„AU&„Çdœ¢
¦ø_-ÎÇÞ
ÿƒ¦n¨Åj%>ÞUÉDx)R8dj½WþÝêí‚ºK­H™(»ØcGÆ¥­ƒšXMO¬e…øé­Ayý¡Ö&Ý˜wª©YxU:Jƒ§„vu_ºº½]ûFý‚;ž¦ÃñXàZ0XÇXnY¯QRüMèK­Q?ÒHDÕ<0@Ä¸úÐEðpÆŒ j[¿õ¶öf~çâüW'Ô;¡I#ºÁ0ôî*aBL¸¦c	“¯KíSD§S«Ý9¯€TmÖ£8
¶çôƒ–´Ò6“ÛK²‹““ÝÒH^IlÔóàà¡„ÈÓ‘©Úf‘©šBxœ5†¼øŒV’é²œRCˆŽñCeü\ŠB^–YôXÍ˜I–®~·Dll’|VÙ­(3wuX kÕä^„ËåÆg–>ÂÑÚ£¸U3ñß`èí¨-ûE‹ù²žé\°œƒMniâlHØ€rw—±õ«µ×¸¥’©ˆ’„&#JÒ¨«rè¦
P[ÓNäÄ®«/7†*©z˜ÉqÉXºƒØÊ*ÖÍiw/váîiˆJÒü[1 ÿn)IqPÖÍ“_ë$ÁœÈ¢3ö=jfÖUÑ5òZ¸Yú+jK6àô­kÛ‰4ýþJ}ßI%ÂÒt´2U•~}òLhŠêÖRBOƒÓÔÛ³V%øgVh8ºR 
×Á¥S“zHÁ«²$ýcZ1.«âË-â•¼E„$xuëÊôp±t|è‚ô}†S4FÆÀó5þÉ5÷¥50l‡¢§3ÙhH}ó vüt¦4S_2-
˜ÐÈÆÙ¸ù£‰[œÎÂì|ý±&~9Ò[—D$‰Q1õÒíŸaäËÖË°,hHLgø7¥½iè'P+2lI¡Å/˜~)Ô°æÑ(4{Ö%ýñçnŸ¼É²Y) õydU”x)Åk+H¸¬œ8JŸšRšæ$‰š…îÍ£¿O¹ýH¥¾vÚ¦*=s¢œ—Š‰›9‚Ó°h'jÖJÕÜO2Sº×‹Ôeq3TÌÈÔd6Ü2Uúb“šÿn›v(XËE˜8›®ôÎ´ù*1ÙÇ2|]/NAr‹eCÓ  œ–¥49Æ¸¾œiQžž­K×†¤¶"%ÉBÔžT=ÓjjÉ@*F¬+<I7+¢Ã'“d¡{ØKŠsÈ«L©’Àéã¨PUäŠ&LL•š`¾2ÎÏ,J‡X¡'òÊ¥•@ªq\Žyu…Õ;^Ñ ¤lP˜©¯«( ‚iQXÊ½ù­™WusÄÚJ&Otê¬…Mæàd;¯ï³²/yT›î
“Í3.>Ke\èÍs®±hUà\³}™Å^²WT&üâ[5ªÜªŽ#£à®ðAbÓÈš3˜%ƒ‚¼&QP×¼eCg:€®D§,ÓDÔºˆBÐâ$ø
”¬1+,YÃ’5N·|ß8iÛýW‚7Þ6Äd†YXÓ²{"Çà:YÐˆ¼ÐÞlJýØˆÇû ÔæÈ•_ýÍ7µßýf…HñÒ6©›¶ó:	B¬oÁøÄ(Ï%Ÿò‰À9Åˆ³ø*ùF;£rà5¯SUÁŒGýj£JIhDZ«ÂãÒÐ‡L0Þ[1
¹Ä÷”¯©@cÄ˜JýBù,íUòŒGY.<JñàQbKUÉÌÓ*Ï•\ºQ9:![úi’Øƒ„…²ÂU¢VEôX­?Î35S,¦UåQ«Ü”–E5±©ÜB ò¼IhžO‘º «ìNM”jC)íè¥š1Ëm×ÈÖ¨DÖQ[“ÒùÕ)¥¦ËÄ‡+}YFY"}ïâùtÙærûHX9eCLÃÃ Ÿ“2ˆœÊør/ÝÌ…ûí]6¿[ë<tÍŸâFÇ¦ŒR’ošƒÔÑ³:‘–JsÕÆMñ•"jÝ¥(h´û‘F«™b©~ÕjNU RpÔÂ—¼{­&‚@Ð¬¼m»·m€d¦w€óÜz—«bøZz‡nÉ¡Bäí^¦Ç,ì‰®¬Ç„Ê`ÔëYDƒÅÆîóŒÉ2;Î&‘å·²–ž™Ù4PEdäAS»GÌ×âý|Ÿ¼üñFüW„q?¾g‡}~ól•Ô®ÌÌÓ	Í˜µtö­Ó¸Ÿ³µÇ]9!K6ˆ¸cýnõÄ7½Û2@!‚Ã%ª¼ ÑŒVŽ“2H7é±VLŠu ­›sŽ&Cùþö¶6ö‹„WT‰ð‘á¾äÈ`*¸/¥‹)ËWÒ›]xƒ)„Åo¹&¢7ô\œÝWÅ
Á)ÌIäÃx†‘I½‘eõœIév×1­¾‰$åñd[iÕ
p½¾®G/´"`_©5@]eQ:·ÈÌ‹O±*÷n·Û´¨w?Ê”—½‰­ÿ¯ç&˜š\_~Ü^g¹—Ãä¹¨}ŒàíüWçâù9yÊƒRÕ~&‘8k8£¦¥:A5‘ê˜ÖÏeÓÄDJƒÒ÷¼¡ÇÜúÒk=SÅCJö¸>g‚±Ã‚\ïZ®åÛ]])
×q37S2‚!Ó—SÐÎ¶mS?2áëèj™Oa’˜‹B¢`ÏŒ¿˜9›ýX¿ù.4‚CŠÔ•”ôN~Æôà¹}lÈñXR›þ9ŸÛÚš µŒêóohâ`N9]ìik HcÄÆïŽÿ„Ì„±*DËã]0Xùz¯Ð…ízhÓÐHU˜åL¯§˜!&MQÑO÷ÔŒ•Â+‘0ÞQ	Ò¸ô{Z+úûtR4ÏÄšiL†Ú2i.æ¾' ½5e«’å)#d}Œ÷JÐìºÌ¥ÉW\šòm÷iK+S@»‡	hUÓ¢à
bÑŸ3ëÓ…„d4×d‡X¹Å&¢h48°.ª˜ØþÚ…£9´°Ã;¾7`Åfxcxbò¡ÓS°B†üÄ{lÊfØcçB¬î¦·'ëï`f#õ½ÀJvô¯ÔŽ¦ß¬.hía	­²‹		Ñ2¿ÙøPÔÑîMEó²SP_Ócû¾ô³Ñ¥íU;ÓÐ=ïôë8¼$·W­¾Š½‹—PVIÃQâºÊQí†I¾©>š¾ ‰óÉOZk©„nyÎw‰‚òÁÈ&Ý\ å‚bªÞBèsdh.3²z³\ÆÂDBÆÇ¥¯<yŠŠü!5º*óB(¡.¯ny2§·ÞõœÆÒ  HäR—®
ý8iË©^NÌN¯R5“j6ƒ]­ýûM°¬ºkDPMiTdQP‚Ö¦ÒÛRšìM6FM8iÒe‚»°¸Ù¤Y<M±+§œØëhÂ™’E<[Ôˆ”U3]D4øÏà˜,x@ØvxÒZ†¯:¬DbY«’Ð
V‚í9±éQ1vA—†”ž\åñ*Ùe‰ñ%øëçSó«Ïò>Êà‡5½/¿·EBxK/°•5õžw¤+•D=çÂk“ä=cß:¥¦©›÷RÚOBÌÒ2€Ä€Uì†ß®5—BÓZ€5ôîmÏ<Ñ
žLñ¡R e4öU˜/x5èªcA;–¶¿c9Nn=¨J-„ÜèÇØ'Iy)¸ÖÊ_ª*hpå²+±	1;ŽêÀq2‡ámI«Ó«ê“qÞˆa$¾,!DÏ=] 0ëÀ#§ÌÍ½ù­*0º=“ô6
ÄS»‚±ìº¶A?¾&ºt6‚,†f"ÒOÇ‘ñºNdŽ¦¥kLÙ©CöeQ­Ìé)àmWoˆ®ŠEG“+g†«Ú@^»´–o8fbf‹¾àÙšÑŸ«ñ<>þ“¯Ax«*rl6‚·KêÂ{gBÓt"ÓªƒU§£ÑÞç™h·\dZæ$®AzF¶-ß÷üæÇ(o3ÍhØ¿xþ…--g…Ž;®-	•ºq”[ãýØ6ñbi%ÕŸ¬Ž^ú'µæÊ82ìŒ†&œ »^·iâÿ;sd†úfbðòÙ¹šðéÌ¿-;ÑxQ«äŠ$–|ÓŒÌhÓijªÑÏY­Ugsêx=Ü_žÛœyÿÑîÖþí™ü¬Â¤LÐ\É[ÖÛÁ¨Ûµ‚ Ù Wœ¯7B;ã—CØ,ðOøF£VÛ1ãžÙtGŽS£9P§hIº&låzœ€9žîØ¾„žoÝ¦,Z›#ïY¸:û'C«Í(^Ÿ:c­øDEpþj‡-!C}I¯j¾ñS/ëTç0ÎõÏô8Û$'sS%`G”¹KMÁš/}­+¢£WÏuÅÎj%hË¯6‰æÂ3²É]93Eù9‚ÿuÝ·ÉU3ô ¹ä» ^1$E{TmÕ9žE1•–©e(g©Ñú%3w)¬REÇ·ÐÚ7‘óg"$’ï¦¾¥xlÄïâù3;Šˆ`®ì	w'nÞ³0Ü(ªF]‹eÌx³\òI´ñ¡‚&…¨”U–Z“B/ñÀº4kO¯ŒC+[ÛÛÁoÔ÷§“VÐAQÈ²suÈ $Ï’Aî)‚x±â-3\2@}ˆÝwÿÂïIïS¼@ªTB*Á`°Î½«¬¨Tä]NÏ®çZQ´ú£‡­µ¸X^‚Ðß·MÓrIÐõ=Çéì1uxQ©§žÝ&dˆqõ"ÊM‚²CÙÃj¦G¦¼8ÿŒ(Q ž£ðR¥¯^”'ž)pÊÜíS¥w…š„ilËÍ†ï‚ðnD¦§Ãñçä,KQnBL;Ÿï\œÿ<,¬ûÌfâ@ÔùæÑôhäšG·FT¤ºM‘T³B'­ådž¢Úk‡ýÊ¥'pÃoÝ%÷Ü](Lø‘ÁÞ–”ÔÊÕpMÇŒáeòq#ùõèýËòÔ7ú«…Ð’p8%ŽC7µ?Â‚ªýÕ’þ§Ó7Iï:EEèEÝü%m?\*q„%».,Î‘‡ÛK:¢šà¼ÛŽÐiß:¢…Êa—nir¿u&ÑUœ"é¥ÙÕÊ-rš¤ì’-Šzù”ÆÓõàê¾ÕtH-n©Žg¸:q]ùèÔ¦{E¢]»º®†7Ö!Tæ`œ©
m]¾øçÊy¾nT—Ô’]ÁHáù,aW‡³´´+ ÞºEff´õò¹¦·%êLI¸y}ÒyŠf‚Ñ!l6XZ˜Î>¢7Ò™Þl´ZDÈž'/>¥i>Kmµ®/OÕ'Ó:Dúˆ‚¬~£ä#2´ÐZèÎø+š\ñI”ŒábŽÅGÄí¡Ãÿ_lÝœø,)oE€—¼ÄRéüSJRÞ!3Ë©ˆÓp #âŠMU'ââ)%’Ô5R˜ø8ôGÝpä[ä¡á=k€F—+ÑµU»©cELSYM	Vw/Q‘DR®YevYU,Ž_)*Þ¦Ô ¥L1;Ï.4i„ŽGÑø': ¼:ÜŠÖàaTBXIGvR)°HÎp °ˆÖfYYÈB0%myˆ™¦†ës‚¤ú*“W9åÌöÅgä†IsÀp£$•¼+“Ã„ù+`¥zæ\œ¨âOW•ÅögûËË\\…­H\ÜØÔ›÷9¥ëVê"¡”òžjÁ›…[YÜžÀÇÅœai‹*±®dZ(AÛqS©™ôÅåÁ¥JGUê¥U +¨î+dŽÂj^BýFìÊøp5ŸÖ@QÔè-’;`"_cÎ¿+ÍŠÇ¤÷é‚©]¡Ÿb¼£—ƒæËsðÓË*ü­E_³eÁ‘%4¡{¼n™&x¾E]ÒRm;o˜gÎ"gf®ì—Å©Í^ðK[ý`ýÝPúÄ5=E¼[DU.ˆëàHÄù3T@.ÕìôTœIÐ¼ªÔaé^Ø·|uí7ru´óÒ¼^aíjU³µwû$àe´É Ìðâ fÉLÖÂ/£-UÆ0Ãë’qÌðª‰e†W<3¼²¦¦¨t2Ã‡bx3UÚ+0:MÚô%¡áuˆgx¥QÏöAQ+†N(Õ°CòýÆµ*EU“ÄRÐQS¢¨	â4°Î
W)²ŒÀ« 3U
§¬Š5;…òš¢»@(‘‚Xh‚
×õÏ*â*U	Áû4aÒðªù¹¡µ™´Š5—cë kß C±0ËC‡îx^˜Æ– Ò&ÓßXYa¹Ní¬(°6ðšO7©5' ®TmŠHÈ·PP¡éh}û'õKéH#Z8hý>ÍH£/WD+S,Ž+Nˆ²Ç¢™z€9Tû}ã„zd~Z¤V<_Qè£1UØd*ìP@ÉnÉÿF£BƒøÑÜï´œÎÖ6YZ'Û#ñ}«g˜cxàùzÛ†Ð.¢ôîV‡¶4ô‹‹—8ä‰Ó[Oþ\¦ÚÉ)ã½øôÅ'(ÿ¤Æ¥š®”&ZM©ÆÍ½>)Üë¡«ë1ÅÛÚ½8ÿ=ÿØÕÃpÊVšfšFÉüâü×]âÒ8 Wk„»Ä¼8ÿ	ýÓ1¾D¨¡¶v%,©Òê5E\´Ö7Sûo&3Zª+×RÜ¸ª6ô½¿…'˜¢6ÔRÔP5j¨f±26L”±a›w˜¶ž–+aLíJ=^øD©®Åµ+ÊyÄš.~,¯DmWl!¥+ñ˜“.ö3·TiÑÔ†´ÛK«=÷y'*p!ìÄ_žÄ-5S “•ˆ?í†>W¹Ò$»EáÊÑÙ1:ÆóE¥í¢i¥¨±WÊk{n”òÇe»„òúim½ÆJ÷mæ:nN‚€ç¿Ä¼<EÅµßbŽÿ¯ÛÓ‰;Ñ‰ÔK-—èÜG.äÅgÑi_:ýyÂ»7:4ÜÂòËè/µ·-m§Z©\¥©R:=Š†‡I$u‰*&+PïŸÁÚ=4ü§¦­jYòõ<Ã“!?ËìyªxZ¿L/¡ÚFÕ€ãµÿ5\­‡Ë†?9•ØË“ÁcŒóYÌ¯ÀQ¦H2&$½jØvó4²5€É.ø-!ÖHU*yÙ+^öseÃÈ–i
“¢i9jaµd!8#e#4ÊŒ$Ã
ŸŽMI´âèSRÏ”ÂµÒû •
ªî•Ò$ÕÂ"Ã„ëZ°Ö/Ìš$Õæ}ï¨8r‰žb±£¼E´¶£p³½sqþÏ$øú_x6ãÌÈ×´b¾aKÜÓƒ¹žVUµ"ŒUÉÕ§kÜ| Ò7ÆÆáÑ¿®èÈãéõ:sgÅ*‚x§F,4ö·ïÛ½^šôu%•ö,TSD@1Ø-Çµ
°gúR…ÍX:ï©÷Ð|k‰q*yWýW¸¤YKi¨Ÿà¥–6ö&Ññv ãÐ°£ž,*;ÖG:GH£!giÎnÂÿ«ªÜµ§ ŸÜ<Ñù<UPûÎô*ƒÛÈÒ
Ó»ûJÐí%j?KœO4Ù”fMÑïÑBÍ¶Ìkìûk…}I¸÷w_|zwúÍîrûë% õsUþþþôÛÞ£YPŽ]´?]ÆKP“RÏ6ÄÝx9•àTî‡›©oJÐ^×9(¼äÇ:‡XŒ¦i eÐ2Æ›Ä·Ïa±ä­CíÝ÷Ì9Â>á—š!>©æÑ“4Ï½:¼î€b“Ÿ4û©ûI²%:S­ï@ôÁíÓ8,Ó@X‹³ðã5z‚ç+¡/žÂ“¾ÑïîÞßm
c®‹y5o'ÖÍ8(qê“+ï€®:í5ŸN±›t½zµ(Ö3i¿vb„ß‹`©ƒëÒ†¿¹0*´ÖÏ!°‚.­won…sdæwÖbšóÎŸÀ53Kß¦¥4U*KÎ+IlQR–"©PE¦B¦Ÿ×:"÷ÜÐiï0Ò‰OÐÌ¡Ýú`of¶}M˜A­§³gpT¿´Y©\Ú J.­˜tñ"VË¿›
 e¢MÐÁ¦‚j‰¡Œ4º‘Ê, ­¼FTU\×…
õU£Œ»Éé&ÏÉ­ /©Æ–¿8‚-æµA¤=°ýA³±Mcê0ñ¹Û¿xþÛ.ûÇ%ƒfF“cõKPÓÅ­FÝ5ËADÅLZ«9U‚GpÎ ðm›zéVªæ…Ú»·ÜfµÒ`iÞÁÏ5äJPšç8ì?w±déÝ^ÍŠ“)Ð/SÀæJ˜ªz#®üÌ5+n0•ÊÏBs—‡_§DT%Ø`­Ä7{.\øƒndüò:ÙS“!„Ô‰ïB/3"žGwtûª6þrañ$vx«…ðË¿oC_Ì%;ðñ¾ØC‹©Ÿ‚ðgŠW¢i×á×¿û­¹p–|	çÀ!¦IÅÏSŒß$dþj£ä‹ÐŠêás)“ã¯#çÓ×¥FÎ#ÿ™$n^ûù×QóÂÏÓÞ1,’>ÁÝzEÏ®Ë‹¢Gº¯C¯÷ðëz½xé’púšè‘»Mt¼N-b6K\“EDÇ-\Ÿxèâ”X¼.'&z’…¾8ÿ),4\Ž¥¶æ‹Ïô >kDJókIã’O"4q9Òå@¸øöDO+§°¼!f¨†ä)°Iux.m0CjU@¥®ò°D¡VRP1|gV‘Y-Âï¤$¡Ýúpt³ÀjˆôPåðDØÛŸ±Ä­„#-žø2‹7”b‡/h`Z*'cK7ïl“-3ÐßÛñîNmß…FnGÞéœï·;Ü^ËVDhÉé•Z¥t/.oïz^TíË™IÖxÉl²›þ|fôoÇ»¤ùÄ¦Kfoùó™ËGðFÀ ç#3Çô§”÷P2«ü®+Ø	OÈ©+¬h_ëöÇÏc±jJÉ«ÙÙóB«fšiôx5Q(E"Ç$!Æß.ÎÙßµT°›Ž@]®v©¯P†³V9,{|§›NÆD(eÇEtÅ¯b3/F¤"ˆBó÷:UìJ‹×öÅ§ÔâþZÜw¨A}êÌ|–ÉCJë¿‘I_±¡$å+{ßë„¯‚¾_„¯xI_§{å¾¼t/‘í¼ÊÉ^û¾'¸Û{˜ÞÝ/+á«g€Ë<º!;ác‹Þët¯o`ºW”—5­]¯VvÖ~tB-uôøÍTS.5e*²KÇçrS¦0ÂîÏ#[Šqsz~v§œ+Õs¥º—”+Õs¥ºWž+ÕýäJé¾3-euŒüd"UŠ8ÄŠgí.Èú®åe•ÎÊGª¨àµ—GÇâ—Uã8ïl¯ë&°$ïÒ>è UõG?"³gäGUÃÖïÞ­Óg§“~«ÍeÕ•{‰éq™ü´îåå§eÔ`¬ˆ†
ä*#1ävá':ÎÈËËOSµD6íñ’ó³º¯l~V¤•š)+%¬ÔKW‰ÍµóU¦’[R7³DÔ“êæ’ÔÍ$Qæ‘Ð¨çKêf‘äˆG$Ýú$²ü‘xR'N™<u¤râ›Ÿ:c­øDµû+%ŒTÌî˜f²HõT‘×™E†–W0ócul;††ÛjûäMòØ{ß÷\8ÛL´€
Õõ|3 Ù!Û5²CÜ°JjH2¦hHÒY±ƒ-s`»›§üƒ|ìàñøG|kò—êþ‡ž‰7Â?ª;`€(áà~*þ%¿Xþæ)þWþ;­—gV4äÚ?QÕ[ëö(³ É1ß‡õ0@ß<åäwñ¢`}íä¨¸Q$à¡opK*p©ÐíÀ-ŸÆncX6µ6G÷Â)Ïµw¢-oHZ§ðEíc$÷­vè=ðŽ,Ç,bâ÷ò¿ê _Æïmô‘oØÇ8ªô“¿ Ç÷1BŽõØ¶Ý®32­@Ò¢Ð`ú!½aò[hYù=*Öz`»†³%’@ö›×tðM ì÷¡1Ü<å
9½1ù¬ ,ª5²ZåÝ «Ôßòg2‚§ÎÁÍÓÜWò'eBf<’þVg´4(;dú¥êä¸7z>Ž1µ—äßËÛ Å²äÍ(*pcR{+”ôçÒ±)-»£hÕrí<þ Z;Ùoò¶¨@“•ßTäy’ÿö#²ÎŸ‘µ'‘¸‹…/ö«ì©ìw™˜i6uŸðíÐTÏD'DE"ð i"nÕlFlƒÉYþÀª{â¦þþ 7Û‡¶u43›·µÊD<|ª…OIe¼Äpíšlä8&ý7plú¡uà{ƒVÇ=dÐZ!æˆéyR@%:pQðeSÏÄÝÎÈMÂ¹Š·85Ü·xÏ=ð$"¬¤<sÏ7L^¶z-ŸÐáBÇ5·ÀW0Á¾á˜¬ ¼-ùdy)6/³˜1Ít#ŒÓf°ºóò0dÇÀ—#±óµo›¦åJäãìa=<g„–ê£&@ø÷¨µ¶j!ü^‚Ž`~1ñ±³7gä·–a@­ßZ\ƒBøGªEf;ÇûCt¢±’#Ñ°¬®ç ŠT¢ŸË£´&½õ,ÈOÉR*¬OtFÔ${ÂÄX†ôDf’l×±]«Ås”Záýþ¬ß%»ÌöÒ÷È]{ül@«Ï~Öe‰”¬&6Û½JÍ±(ªj#m/ ï¸.2+q4þÚ‘
Æý]š‘AœñŸ(£YÏO/Ns@LÔÙ–ŽvÊ2ìáëe4‹‹L—2¯[˜w™û:ÉÃÌÿ”ÊËÄ¤L`ÛV¤¹Ë"ªð¶ÆYÉdÍ÷—*ªàËevuP‘QMváåpÕ€T+ MªrÎ'º"±Ân–m¾aôéoWvcAûèvXbnqÛcrK*¼ÖÛô_P003ñÞÐ©÷^îÎ¶åtK©< úÚÄ ÓZl¯â[ÄHÉxÅ"r{€p¬%ÁÙQè`•†€1á<„t š&ÕÃŸ,|tµJF³gÅ±Ç© Ä&´…noeÚ§¿©D%ÒŠÅh…E÷Ó…8P©,Tù--S\œÿ,¤Z†*–ZÚr¥Ü7Æ‰€ÑZ!;µ0ºN›ú	zÀ¹¼#n  Š¬kfôÐ¦.Áè9¸þ•é_dzü»Ç‹¾W°;ÉšL«†±Fäî¼@-ÅqÚñªB*OÃ	 j…‰æBDCìÁ™D˜üÈÇ?W¢ÏG #0SXèƒT;Tµ8LU;Dµ,<µà8”@mÁÎ‡QF‚1‰‚*™?})âaQx¥´wA:1“Ô…(å¬CXVöõi"h™bò?sSxãsbØ¦à2£Â[xñü?©ìæ&`å%Å¸ŸÙsˆ¬]\œ‚7~[“Å±‰5jÓuiÛÒ”„‚J§UžVƒRÊãQ‡„ 0 <q,™„êˆgÆÈaû8Rï,ôøë<Ñ†  ”,Œs‘jK‹)™¤Ï¢M)ãÇÔ†~)K@\¬Æäzv“‡%cÎE9VXòŽpŽ¢zg¡Ñz„ð÷&ãÿ­Çg®ìÇ,‚©W˜®1•‡ÐUi5ï0ò´¿Õº‚*sùaæPB×X®ûgXWˆèØ›•bf…N¬œÖ<â×«2©ª ðÜÌ²üÀ´‹œNóT'RVNüU™JY1•Ü4îåQ*±6O4–Q£ìUýé…·Î«9½;ží–mÿÆS»Eß>E6ÕéFƒáŸ¼’Ó»mø ½ùár‡¥hxþë×'dq(và?Õ'‘ýŒ‡bK~qp®Mš4%tŽ<FTê9Bv$2®‚Ü 6ÖV<Íó¶†Iá1v_æ7ƒô+M¶ñ%a5²ü]~@_f¨ÆmI0‚åEéqHEËCÃFôLÚLU]æ¤À$N.~R9öjñ‹jOT†úPléLìã¼²²@°-~‰Å¦ûQ—ˆW¦[aÚµŽØîÅw¬žñ¿'>þêÖ“®´´(°þ„iÿÜ¶Cš‚3–F âT^Jñ}ËÝƒÕx<úï=A»ëBÉå×›|‚§ÏCVüÎÇôà!ÅdðxºßóO6|/uƒ–mSbX-šNÍäjµÅ4ââ:©Ý•»§’Ö-IêÆÀµÆMTD©D’œÕó Ø‹‡Ðl•„jIG=ó)ÀC¯GSá›´‹§h¬	=„T½y?þ¬ßh…ïòï)–ÓÖÈÇ¥7RÇT;ôíA“Öz#ÍÏø/åáÜ,´Ü¢ÛF6qÆˆ6˜>¡‹ù+†þ‰ÇªEY½(üiÄ3Ãyñ]%\“Zþs>ÂÚ$9‡â-j¬-î‰Îeº©ÚsÅ”(ž{Àmõó.yŠhx9!ùJæI'U‚'pzÝ÷¬˜C–Ê`˜&¦H€€Ôa%4S¹H03;§ážAŸúß•ÑiØ.‰2J'i‚§ð°¸ÒqåmEÑ}ëª+=ÇÂ ðL+(®&¶†hùûöÀMz0l–yÊóJrÙ*;ïÝÞbÙ*lç89ð”ÅRÎÉ'xN=W²¹Ðo&çe?¯p2Ø{ºëª¥ÀäÄõ™òT”¼ÄWñ!|í&ê²ç’|œr–$Ï¼ÉæÝ°¥N¶r}îR˜!#…æŠC®âl6ú.,W{5k#JŠ<d¢±êwm<rF*;ÝRd¤Ï^\p¥°^zö—"Œ/ ûÿ   ÿÿì}koÜFšî_©ÑfG­‰Ôºø’D+;%;6b9^KãÉŸà˜ê¦Ô„û6l¶%Ž>Áb>ƒ±8X‚ÄÇ‚ÌÎ`‚ÉÇB°äõÿÐ?9õVÉ*²Èz‹d·.i–¥n²X,¾Uõ^ŸÇ`ÿík4]¹"¾•öÅ¥0øHLÔY”Ã¨ZìŸt/2è&h6¼{“ß~ƒg 1ØbIZÖ`à¿¸Ì @Öêç|@ý0gã/™«±zÐîáR<Z#@æ¡Ó¹úVc¿Í„¨<çPSŽYÇþ@×‘$¿¾R4
M„>ƒ«i….‘P”Kó=žS=•q“ItEh Â(uÂì O:ÿímµA[¾õH /+ÙfáK±l°¨7oê!Þ]hÞïH|$ßðéÔƒùU|ŸÑV¤#ž„™¨E Z¬°b"¼uh—»ûÙÌNÕc/5œå³¿8Å!Ó‹/Ï!	ÄÜ®y³CÑšhÓ°UÛ!TJlæÕz¿"ª±áØ¡_qÃeÝø©[Ø ·ê/ÝZ»rËiîº1bPo@"¤’¼Ñpú^à´½ß¹É4øG_ßd9#Â5
r,{™y£lvº•yöD#6öm¡„T•Ë¨®h.¬‡³ÀðNµ{VÄì‘ÔZ6v……dK¡N~ Ä=üó«¬Œ´äøcÒš{ïŒhÕËPûM'@zÝ#9CEXtGìªOhÉè ‰îPb1U6Ìã	õ¢@KÅ°´Rq_?\OÄA¢7¢ÆAc0«j ¾¾_Åÿ$ü”PÆ«
Ü½f­Kõ\ã‡ñW…chûjyÅˆ)ä7çv’_„$þ·Ž"‰iÄØä*³ü×4–(ô£}ËwO¿;ùk¶ÄwµÖe‘j”§a#.Š®SÀÊjì)#NTˆí™’qû%85+b¥Ä~Õ8×ÐN'DPÝtCh×Z:ÖMxõ_^W	ù3ÝÆ…Ÿ[™‘¡+£æ&£ŽäYëôø_¼Pìîþ×÷"`	NÇ‚¸ºÅ›lÝ´iSHAÍ…ØÕ*ë€³ÛíÅ4q=Ü®T"\ê]^e. º[Xi¶W›Ï¢])üîxô³‘yÎì€}ÍäYQ‹ÄÞ¼òÀ¥eµœ„žå{î€4Z®oFÝöxKÿ¶èFÕ“àÜ[Ž ¿º$…€P4þ€û\>>ù‰È¬tÇ-V˜ðäHÀ lÁk§è¶ò"VÎž.Q(ã­ÌËÎ«œÔ—Sj}Þµ//â ,ƒ@°é‚•[‰SÎe‰QSŠa ™H	P&$ˆ?"jŽ¯ÔÍ·â+%F~†W_€Ñ•ø†åh³½˜ŒâpžÃè,Š³â!diE}dFQ
å¨/£±?nÒÿº<á C5mêc-–ªz2—‡ŒÌw½Óãß—X\xfXÞÚ"Î8_KËÃ5âƒ›1ç³ˆQ“Wtªtä©ÒQ}O²Û	es¾=ïÓ
=¯Êß"]ljæNN™ÕÒ8±ƒÉyš"ºœÀ-¹ÛŒ@eÎý=æ66LN&ÜÜÔÇü–rç±ÑšÅkæ8i‘]{óSý}áÉõîÅ”è€.ñŸ›1R"³ÊxÏÊÈoÁVhð §nÿ & œd˜V0	²Å?yÅì—Àc¬²Y k4!l}jw+KRÅQÝÒ`c°40·‹	´èD°1†¼M Dxè['?6Xº{‹
`³bZ“±¯Óv¡~Í¬-äAÿNÝ¼s‹¬6¨	MYeN.L%gØí£Üùsg;5w’)¡R*¨Ys1:ÛF8|!JÅCÈ›ÍF~ÎåÊÿæ´{•$4š?ŒpÆåÄ‡ô‰èò5/ôÎJÇR´?œâ¤±ŽhÉÍ­r³Tå\¼}5ŽTyòº*t¤Äûjw{t£-éj;F—ÓãoB®ÔkTÎªQŠÍIÙß¾Eãû…ªƒ*1CDýD¤U‰ëÒ‚H&ÕÝb„äqâ¹trƒôà>vÚ5u0½`¬aôú•dÁrHÖtXÐ}::¯èPÝ%­·/»daŒ#!\„0þÖüûæÛódj‡ï{Ýg„¹"ºÙÈ5?›vU àòžnCO·ë¢û÷´ZŒí,ª¶Ð®ËÀõÉ¸‚µÊXÂ•›²	TfŒð`:;Û:9¾³m”~ùî®îr®Î!›ø][×¨2ÈúŸÔ4!¶od+=mŸ-X·€|¦ìŒ×<õô{ŽÝ›Þ un‘ ÆdÕG»œWsŠ»¸–çˆ‹?â c‹77Â§Ü_š^!9¤¨âÀŠ Í¼áÍ(-"Gtë^§ßf”d<£/'¾!Ù`)eLl‹ÑÚsÝgœÈ~™,šO?pŸ‘uª<ÔÔµ¡N‡ã‚¢'1„¨Mº¢PUQÜÀ–›eu­1_å°m6>$ÕÌºn{°ŒJÚÙ¦–Ò2ýS˜±Ë–vÁî.æ‚ßÑ…„þ;„¼6¡é@.³_0ô`…€\¦¿Ï?27Ù¥Êküz@•e2Æ`
u´<ØŽ¿< .ôÕ·–¿ð‡õ¡×4_§ÞæÐ[ü*VäœØ­”B	9í”°œ…StÓúQ,IéŠíË   XÂ‹÷R¬$»Kîl[^ ;v17†Ý%¡©n¼j„0ebç¾@0eÜyÓ<›žò-Æ}³åŸÉ¨£ÐIŽ;V¬±†œÇ¤$'»lpcr®Øëï†ä1ÀD½ùêäá	`"­lœE>YµhaœYBæ”¸ÈhaYl0c[‹ðÁâ„HxéqJ> €ûªAÚo‚[áK:‘§Ç™ †Ä0™ jÔ­u‘å6/Âƒ•c…I¹U·z¥GƒÆ¨Žù¢™tÂM Êreg	Râèd³&S¡”Þƒ…º¢Z‘; r'‹ZÔTÑ«*U1¥{É$÷Þªìƒ6ÚüyÂ˜Î¦0cb°¬h›¶¬Ë½sk™ •¹×Úuî‚> ‡ZLÏ½¹Ç¦gê;üïø9êÌ-#²0sDþ§]ÉßG¹cäÛwµÅóR¦“;¡¸gîú9ä§ó|²ÈyªÃlsÖnè^ÁœeÛEJûŽj?Óð†‚Ïð¢m@€°rÆ=T˜ß¼÷Û/oT Ê·P…o‰êÞ³©ì­ ª7¿¢·Aí¾¿6ø]¥¾7²Âba9H•¦Põ[¨®·XMof=oèúk,åÍ)ã•›+xE‹w.Bf~«c]²v·lÝ®uÍ.Ê¦é§Õù6g[ÔéZÇVWŸk[›;©ŸM\{Nëg¯,“­^à´‰ -¥ú€O:Ì!»2Zï©¡¶´SQ¸ZÐ÷Èjûˆ¸^P³Sí‰YÜÁ¨É›v9 ?MþDBÈ/Yó€¬îîúî.[Ð‚G!üÈm®;Ò)5§Ów¼Ýî +x…p“¦Šn3{Íˆ`9éðàôø÷Ãÿ…Ç«q¶û³“ŸÈ Çà6¾î“ç@šÍœÿ;½&ÚÄ›=> œD âQ¯:"Ò¨ã†ŸÐØ³+ãÎ~Op/°ìÎU]cÇjÀÈ{ÛðÎèøÓg•£àDåžV:üÞÔœ¥-gYÌw¨ŽØ™Šq¤"œ¨H‡-Î‹…ón~ñÖ¯Qy`åW³ñŠ*NH¾ÉBRo¾bÓõã“ŸF}WQ@
þJ{_®•Gôäo]rŸ¤Gjëo âþú/ÁLõ·‹ü¡§Çÿ‰ß3ªj˜]ßŸ	úvX]ÈÂ'Š÷‡ê–2æ¥–„×ÜGÚr"¥ÌÛ„²fgbqMcŽþ8ûË¬ƒó–˜Ÿjê&[Y7œ UgkídÜ4™WÏž!¿"tÉ€%iÁ|[žŠr&ü¿tªrÿæøªÒŽ_ÅoÚ”ý¦öŽ#k·QØ		¤öçúQßøÆ×_æü¸fÕÙHÀÆÖU|° ]qÈ&à
›%ªhŠÎô}ú‘Ó v°èíízLŠðÜêÞÒõ§EíTl=„g‰ÉÞÜâõXï[d•K‘‚Äòm"í©å5›n—x] Ÿu•¶!+_‡$q®MtŽ©ï¿ü0S¶ Ø|¸	<È:©hfSI¿}?üÒ¡¿RÐÐ-1-QnÁA›ŽÒ!ÙóšæúôC¶}u¼nõr–íQGÿÔ¼ÍÊ•c‹IÁá$B%þ„Cö$Go3­úe9÷m|KF¯à‘Ž¥j]NùvUFr˜ÉÍ”åb²q³G¨¶5=Ÿ|ôæ«×íF¢3D^» Nk½ö°CáÿÎZVÂµèûÛsWCCwÛÆâÍqu…iV’Z!ÔÅ÷òjòí`´¿qÚm7P7/NþšTSV6=9ìÁ?!kÓàJµŒÓEa#Ø®È ¥öè«>i1Sçôø{ÅwÅ	M»­“;rÝåXqã®’~@Ø Ž%ç¶]ßizôsAon›¾d¿×	ß
âôæž{=úá>½[¦F\C…Ä–É
CD£³/¡ åL
oMÃÆÌÎ6
k|ƒŠ¬ü¸lÞsVüU¦D¢7GÐ±o¤j¼ãµéÀ¸MXNo‰r?úç°áÖjƒag–lóªáa‡¼KjÛ":Î3/fé?“ZMÇ=fnâjÝœ•ÙÜa}"¿¸qƒLÓ6çÊèßP	^K)Ï»å	xÿôø!n£x—»ËU„D<}'Ìï97S°LÝ Ãç‰òUY”§nn°N›e²2žäpÁp?¥Žé8*ßgV­NÎÂ(Á6Kßmy¹™³E‘æª«-žöËxM6Õ+¥dW¼CÅ¯Œý}jrõvD¸(ºß;ûª“]~Ç(Šq%˜gA¨:÷AicÚçE«26¿·§7¹·Ý`Ï¥æ/h*W#D#C¤`$|èwOÿ•Þ¾[•†]¾–7=Ks¢cÎ4ýL5¨ä„‚-›Õõð¡ïöö|§Ÿ^ëùêŽ˜ÇD™Þ2ð#Ó'ï™@’£wõìl’JŽ¤JÉq9k¨IbÆ±åc†#Ø´¤Ô¬g’è¸)™Æ´uúú[(pzýŠÇ„ù“ØT:Ï¯ËVâÅZbZªei	À•Vð”˜d+>Mƒ¦†§Òú¦ìEê"×9éìÔ1Ô8ÉKáÇ$æäÏHxýíÐÉ$»³+mr)”´L
ŸÎKá‹cÏ‡%J«8éAœ"+#ãâ!Nÿ·Gv=Gô‘ÖDm0oŽä2¸°•Jºµ˜mÛÅ+–¶Ï¶bI	\ogüŒ°Ðc{T…ò²¯ªÈì®c+ÎÒW*]³ªT:8;®pfm×#°ŽY2}÷îr§CšÍùùzL3@¢é94	öèêZdY“
Y¹ž£¬k	=w#­k™$OŸIòôUsÁÐi—‹†‰6&Ñ°³‰†EEPÕÆÂÖz^7‘.…Ââdœù›D„5î²T‚$i¼Á°”SNö'ž%üŒgekRµß¼8y¥€>I&—%2&òH .ÖóÁ·dŒ‹±+Î(*ÆÂ
[¯_ ¥´¼jcbQ	á(#b«l5äõøJT¬!GÅÂšÑDÅ"è¹óKtñ’EÄø/´ºŒ22&Ë[kŸ¾þ®+Ýÿ"ÉŸ/Î­!]‚#’Eë@œk7‰M"dÅ"dk‰Rb]xL3G'!²ðþÜjæ Yò´Ix,çÞ'<½ÖIp,ýõÈ‚cé%ê"È4Æëy‰é€†'Á±ø¼Ip¬â¶Yß#·ÌHƒoÂÁÒ¼ª#ŒŠÅ¸—"&¯¾Ä‡w±Ï2Bbá“òÙnÏ?K<,#076ÔDl¤*,e»ø l“@Õ(Uº/u%?K<Rf«ô<é/ðš¬6;^<%	?ÉaÍðïèÔñ½&ÿeµÑ s¸ÏÖ|´¾¾Ê»“­ë´7ggg&íeÕÎ¸2bvèpÇíêæË…k3¼¹+©‹£G{°ê»©Å	ùTrÎhEI­^?·§õ³°‡­,Ö³Íá6ýLg´¯Ê_ãƒ…pæÖ’÷4V(Ì”öL¿Øí¯á¹ÝÆÙpºÎ.[5o\é¸‡|¬Ý¨\÷y–“TÿDâš‡Z·×uC_]FµÑVüÜ-ðÒ’DtH‡¶é»a+3ýH*àk(Û‹—÷Àºê}VWDdÈ´*¦¨ƒ—àaÅ“Éä‘å-;^ÂÁb›p°Ds˜ŠàÏä’&|g}DñÝ@ ÄÈ\Lû’ßB-¢Tî‡t*¢ºnË&‚}D¾ÜOÆÏÝxóE—lNÖó“oxGq·«Å-c¬Å€ôƒ–Û‹ ¶ÐÑZþt
Þ‰BÏ-„®vtÙèxÁCŽé¸ÚlÆë²Ú¥’:Íe™òYÉ}¸.\Ý|ŠP	µžŠw?¦ÉÆL‰<Y½{øª’†ÐiÃ$þøôøGxÅ=pö\³Æ‘%”s[4%\Ì(=OleTóŒß§Ýü¤?¬úmj¤sÓ3O>#ËdzúwŸÄöX{0?`³\H„¦ÈMß@;rÄu63K¦!Ñmnc"Êoõd–t>#£ôäØv¨
ð ÕËÚÓwé³Í½sØ9zŠl0Ôë3£t÷\ÔyþÙ­cþÁÕ™ñ€o¾è ÑM-#Ê½QK[|>YZXº:KèÏkìçuöó=öóýÏ˜Óâ ï²:{ë"oýD»wt“~aç¸çÆcý°qâ«—œ£Ågñ’/>#Zz`áõçg¿ôpô¹\|V}ß9¨ƒÙR;$<:µL—ÈÑ,©ýYâqg©GÞ%‹2cg½ï4©Qîµ%*yÓ33lê”\§”¨¢ðÜ[ùq.Ö(œ­‚:é¼éžqÄ«unºŽßh³-^,ƒ%~!×-ã¢Ôv<(ÚTH~ã0üÍæ²§]HG\Z‘e|Þ	‚4å„Z('AÐBâƒnLíOÉÁIœÉDFüòó•—MÅ¹—œ{Ýþ% ÁAŸö­ËÂ"Ø?e«¼¾L®a®ÒGám„©*R*QQéÞtÚî ³öº¡`»,¡:!Ý¬š[§ûþ®ÔÙ­»ì%•ÃõØ£V{ü`}fd’ý($‡‹×fÂg/”ÜháñÆßxAk­×é8ƒš"«Üçn%VFqM%¶î»l jóÿ½>¿K•×iŒ¦8ÆH.ž[Š‹Î€9NQïHñÌ3èÕÐR
}ó1ûä½8/¹½þÆ¾YZX%qó¦7€-½yã"„+<¼ÆëQ9!é†©á¿òÈÝñÝAkmOWŽåt= Ý ïÇë’ŽÏ3ÙÈ2YyØjë·Âs0Â{xj¡ˆ*àñ„-#ÛÁæa*š}ùF›(7ž0‚H\f„ìj‘YT†Õi.Gòôws’<"W23¥°šË.gw¸ãµÝÍ¾OGcÐr“¸%ÉøÚ5T|ÈTä/£"byï„¥¿§ã—Õ.“‹^o 06j©ä|}ƒŽíºÚŠRv÷ážBL/…äŠá
÷^Dm¹°F¤{œnn‘÷÷:ýžÄëàºç´{»ŸôÝn-ðQ[/ÊI¢™ŒøªË$gjï³ð#¹½ßpÛ•-‚©d“8ÇD“F’q/¤ãÍŽð±ÄÁa%updIÏs›¼NKT§º\#‰ƒ¬¥ŽHâx°öÖ°ýlÑÚìèüˆµžâæJqß{ÍD2={ËìNÊ&Hq7Äçîiô’}˜ÙªuL¿ùŠª­Œ.±^¯OSâé§@X{'÷Afžb]š6´|Eå·éèrÁò§Æ/Ã¥å’Ëäj»]F,]ÉÖ€5UÉŠ¥nµíú ¢£*)ácÂDÕC•ËL:W0}`’4[¿ïR{“JÙ›»nV®XÜ(7âlzíaà’¶»Ì]!A¯?·8¿Dæßérƒö€} `.Ä$Ý¸ÍÊº»M%°á6Ñ¶|Â>ß‚ê•0Íf–¹÷Xª%YímÃ´È1Ö‹Ï9óPr±!ÇÉvl ‡)ŠEÚA¼$K„VÙd4,#KvIŒžŒð!Éþòü$¿ä<@Õqè*²`V3»{~³aöæž¼Ï|æiœrRZUš*™¤ÈLRdÔ£º%ëlSf.Õ’u>³h ¬á\¬Yç7·Æ\×_da™dìŒxÉÌ[ÿž#zÃm+£Z©´X$‰²R9žÂ"3Ì–ñ <×= 5€;!€˜­A¹s¢éiäËAOŽOÕåä
]0®3Æàõn£WTõ`5Y[ÆSŠTL¨²bª6ÖÀÙ‰PÀ<GfºHW²±5Á‰d0$ª¶. Ð>0¶?N-ÅcÅ>8Žƒ`ê&PoÃ7÷º;=,Gaº*ì*Ù›ëïyî¢Ä¸Ä!ÑÖ-§¹ëÆžºKÕ•¦ãL%DÁI¢÷b‡0û{Q=iŒ‘w¦‡ìˆl}²µzŸ<º½öÉ£õMÔÎžjTÏ/‡]¡™ò£âÜÎ;÷îoÝ~t{½Ê¨.ù´ô–¨ÁwyòAò!Ó½À¡»NÜaÆêvÎu~ÑEæ}ì¹{tÊb°œ÷TGuòkº|J‚´z{„*nuÄ€@eŒ»fS1 Ê~¯Ý†@ºKæ:zo±nT‰$ƒÄÀ¨IfoŽª¾ý6@½„
„ØâÅ^_î	ÆÍÍ­ªpaRˆuˆ	S‹Æ<¼9Lëi´ÜÆ³íÞ~±0ÊUæû‘•ÿ
ƒN6œ¸"{èEL‹¹I`Õ0ÆôŒ«&^Ñ=®•_o‡Äécâ	g,®göý¦îAkÙOf™ýôë^síI –?qÛTÚ+éÞ“ÏlnŒ<I^ÁX‚ÅsÖ6Ä¢'´ÎÖ%“›]–ÀC4èùsýžÇ”¹„…·È+ÏU£7óŒfÜ&ªZßwŸ3KÿÌöe2(«Ó³¤éùôåÓ{.8¥N¿äèì{˜¦ìãè4“1hLC›>mÂ×üƒ#œ\cQú0.nGX®Bæ:?YYõýÞÞ¯ûë½½®Á½be‰"éÊ/ŽøÊ¨ƒçMŠ™&—'Æü„s-Ç*ü»¥XÛDš/ƒ4 ¾"Ošù	—WšãÒž‰@[	4ÇŒ;oòìóŒ<‰O¹2ív›¶ZG\#tq%zD«/„—¸m«åôHpò²aÕI<l Ú¨ÖèaßÙõºÀyv'×œ«ùìYâ5÷ñ˜Û*ø(oƒ@ª™æ6Ž$*eÂÅ’éLQŒÅ[ó‹U?ƒpQƒ<®¼vv]2GgÈ¯ÈÒy†
b˜öèš™O1z÷LaÍX\4’“Fï|ñºöÎÛZ$kÈ¨%Ü,U8Zr|áÆô¤^¯Ãï³$z>/G!¢[lßãî š×„OèO Šß‚]/ñ~ì©èÍ¨’©
üÍÀ‡\0èä·¢­fÔ%fÃñ‚Ä'÷šŸA~‘ú!4w„Þ¤õ1Å6CÀ ìü©v
>±ï‘ÅÉI€¼ƒäbC‹ç*Km¼9^
!Ç¨¸G{G…\Aøè~…ßª¨:"†ƒÙ‰kPïtÄÌ)ô{F‡X«}Ó2äµ”Ÿa¢Ö|åå5ÂÍ·¨./õˆEW/”A_­«{àˆ„x·ÕàŠÇÃƒ×÷x^×ê2E÷yŸê>ï'UK®æ*P±‰rt•Öâæ	ãÖzs¿ÝôÔ2/!lV{vFƒm¤&´”ÑWò!<‚:5Jµo ƒ‘]Yj¥ÅàÕül óz˜¨Ý»R‡Jiúmu³–¬ªìØ—n.†U¤Ye£cž‰1S×÷žŠ÷É¢Õó(ËºBÔñóèTB2ŒÐœÀë‡±EáE’V¸ÒÓkoöîÃëªgîÊ’â1IÌ6‹D(8ÖZopHãäG(.ü+isü†ÒhõÈ3 ‘îž|spæoÓÌ	‡vÍ¡³P¹kì¦wz½ ;ãéýH‰bŠ5CÙÛ§óî1^ß"“¾¼Pò®%ÌlæÒ»ª)ÓÀ»u;Žà™nœÿXzQå›Œ¬øf+·	¡×…=*ì‹¬l[éÕÌàÓ˜w×CO(Ï.•Æ¬¹Wr@iá4 O®³,Á“GŽà‡”ÙN£1Ë*–Ø.Kÿ"ï²?%-X³­LGKãñÌ|
ÜÒdB07#vß§òÏ£E#!jx$íÐoG(èœÐ|œj¬2³lxàøêZ:yÖ˜Ãj”: ·yÈc:ƒ¼å€ÿÉ'ŽÿŒyÈÌ7YT7âVhË>¬£wtF? xøÈåÕzÃ¨ŒÖs(“k^Õ8¡ÀKÛ‘Ú]ª`|ÑeÔ"_žÏ®ÿrš'£WD$yäÌ…òŸ‹JcÌ(¡)—žñŠäÄxfÂÖJ‚J*„±-*	‹©z»h^0Ò1þÛJ;µ>|¼á­zÇÙ¯-Î’>××"Ä"°ÖrŸû½î}w'`›ð~.}ŠÅ×£¶ˆÄË»´‚`ÔWn„°@ìµ*Yé³ÔòâÁßúÀF‚òˆ§»h$¥Í%¥Ñ@”ï!(¥ÑŠÖ÷P‰÷âƒía<ú„egÓñè… æH*½èî)¢·°¡\š7’·V„Nx.¿×†E™·kC«$a%™-œ®Z’ÎV+0ª#¨bNÌÚnÆÀÔèàPÙm‘Îéñ·²®°‘¡`%‰™HÍ@øúCÆ)Þ>ù‰½“oè[¦Æ-iÆÐ˜!xPu‡¿vYàŸü©K¨6ô{¦½èîZQ©±@Uæ•D9ÌDDÂVšZx´"âwQ8”öAÞNš&'Ó%Õ4*§-3Â z’ œ»½[ïÃ)ÑÒfƒ„Âv/Y‹CÂ)ÜÑ–|:dB‹Ý´sÿ<e‚„èu¸.É€×•—6ÂAH—ÝŽ6ÕõœöÀÅ]lœ®ãp¥ÄÁO$§÷j~^Å\#k£5Ïoæfb-£s‡ÀÜù˜³j¥·˜
¸1HµØùåòt@ªˆ«© !Ç.$òõ©ô×÷ÛƒýYø9[ožOIÉt|õàcÐÚæã#¬/ÆbâòvÙa'‡Ð@ª0B€ì(–3± $¦a>²¼äA•æ«o>•3ÃeíŠ4Á¹C•ÍŸb´F¤ïM «AÕ }:ËÔêñ5»Ê•x“µÔ%l%~W\vtê²"º:ž å}íE†Sï½ÈPôò¼|ºuòÁ©@U¨<®Nn¾¦_Ad4º/8×.Pîz§ÇŸã‹'ÿb '¯¤FŸìß<á£¿ÿ‘.T/œ©‡k¡F<_äue2éF„W:Ë.Î’m©Ù$,?K2>•HD—ÃU~È3yÓ–µLêÜÄ†w«d‚¤rž}˜«ìiÕF8›—¢ÙœvËZ¬qàµISzIc8XŽ NøŸÖCwAéhùê[ClR64¬3½n«×qä#Ú¥&yèøÏ~ùw‹ÿ}¾F×6º³o¬RSdv£‡Rz­]ZÖ©¹Á‘MóV)¥’‚µ¤Í6“µªé:²	û˜-¤óäãÖ<Êò“–D˜)ÑyäîÒÙr¤§tSÏ±»#ÉÁMÌ²=’¸w,ß‚tcLâÝ³þ TðtLÐ´…¤Š¶‹ '¦º¦ÑmÒc"k2ŠL|úìÅIX)àBŸUR	©ðë€wpt3üE/´¨jP˜¾Øj"Û-%ç~æßïQ]Ë#­“?w[ÕNú-jåOyvÆå™ðm6”?ƒ–6Ÿïv¾ò|Âùüæ»íéÜÀÀåd(
C_åžÓË-áÍi‘ÕäLW€¥ð|zò²Ám9H_°¶óÅ“Ûç‚Ïe3q[úV0¹XJ¤Ê‚Ý•†Geð¦Ûð#( Ë!"£öW\¢Ë7]BhzÕâêu»ˆÔ>]¯æÃlÁ¥÷‘(”™T+»ôúq­@V£ÛŠÈ˜uhŽ™¨T%Z^WªúÁØ‘ªZ‚–Ûc.›Ø½Ó¢ê4HçäUa¾–ÅˆZ“¯pú(³´IæùÙV½ÍK?db/HïòÐöúªh]
1¯ÂäYÀNU™dùŠ}(0C5jåjÖ¹È—¡TŸ'‹W"<£š·­TTÌÚÛpú÷½$&JXÅ¢Ù`›Î&ˆ øÉ³Ð»0
Èkýyä:³™” {ÿÃa×ûíÐ}d¶¾cÓ¬î
¸µÒU´Ïr=ã·šHgNÖ’¨½ûÎër—ØÇG±´%§Åd-ÑJådÌFýY®)Hk¨d:©œÉª%xRäžGÕÉm—´\ß%U2›.(¿d@’ÐŽÍË	¢Ù)”ÚÓ÷ÌLCÅå_F«–6<#mR-tbþoú»™ÿ;ƒ4ÂsÛ¹É©¸e/ø#‹ØÜ)tÉÄs,­Üzí&5uÄy8On5d¦Åw|•Ù)§í]’ì³žÎí´!2Ç’NHhŒj²™,ìq®¡y
M7,.:ªR³b™2lŸ,.æ¨	WY¶ÏO¾!ýÖÉÿ	}Ö¹éVÙ´Æ<}öuæ÷Åslm}Jå“¸•$¹Åt®cÊežNÜ'Hz}·éŠÀèýë~“^ÎÕütVø_RYïåŽØ_ñYf˜í½Pfªò†%¿u¢ì'5i’ËÔõ$œn#á"²MFa†ˆföŒÖÅg±üPÆA.O¨e÷þ(¿êÝÎ6_“«wµÒ\½yz%rôÖDvý/à#\ C¯xvžœ¯@æcŸOdÀ9ï;Þ;Þ¼8yEÏ†ÆŠfÝÙgÜ%×é>äÒ…1vlŽNùý¸òrÂN«@}Â¾Ká%íù°oèœ ›Ú-oùžyÃL3›J»¦UªMáHú˜bèé|<%¨ÔÍ"Ù5÷Áâ°‹ÉÛEã-¼7Øí£Â¡V“¨7Šõ®D¾Û¹Ç+;vG¾'‹*ËÀ¼e˜=±[{˜ûû,„ªÐÂvöEÁsa%Éh>qòD/§À‹¢¼K«Âç»ã%^Nø›(òÙ—”VäÕÌÊñëór<`¢ÊŸ¹*?õ:ªÑâYtÒ¬ÃË§C^Ö‹¢È'"f%Õx||m¢Æ+'ŽNçì%Þpî˜”øü³òã
ìœFk“€Öc³±r”ÙHÆ’Ì)HöDÆ"«Í6ô(16º!:k½¦kG‘àZ4®‚ñ¥ë 	Ÿ&4Ú%òNúÆÀ`&Ã0&³é£§PÄOÞ|uzü¯ ‘ø2'¯2N‚K(V!šxÈEÿT„J€‹——)XT9¾7r£"ûÊ(c¹ˆÞ1 Á§'?:%ì$¬áªª´ñ-,üHx‘Ø6ø
æB+ßV1ÒG,P‰è=ÖL7éïÌjÛõA—¥š¹jWfK]%w!7I¤ª<n3ÜÚ/a‚Ë5Fûê ~hm…·Áïž|CÍ¼0 ß!™â'Ñ¥\³:€°EpòÏfÃÁ€?<ÒoT[1»ÜÖ*W´kùá"×
·,—¯IšëL¹ŽsrRLGG7ïžwP'K¿ŽûÁ-¥¯‹=s*¹ãñÝnµÝŽ6<E(ÙÌ¦¿þg€;ÛJÃÆè×[,ÓÆÄ•e”ÍåB©"+cîMœÀ¸?çƒ¡“¦×nC:£LÒˆtM$×lÞ‚kˆô,/AF:$Îx,‹cH2k`ìý¶œïgAÖOE¹çgŠñS¯·z~ü]ôzý7q8JÐ‚–'•|ñs×ÏÎ2XlIµY€Tß¡'64¤ØG’Ù@úãx™î=ýdMÀ2–^ ªAœëy<$ïÇ~‚$éxt2–aáÂ¥,+l±‡^Öóy³yU¬.õ¯(ÕóÆÉ«W×ÄMŽæ}À![q|FPÀ=‘üCÁKûù‰ÏˆšIþç þìt¾‰xäJ|ù¢IHÙáäÖÆƒ]ð³tzUõIXùÂ¢)ûÞÕ˜‹—‹bYž¤&M^‚<½_Ÿs4é´x,£˜´,ÈÝgAn9¦Ã&‚œ$³àïyåuí!ï³+èì—Àç—¦è20•Ÿ¿²0uôµ,”·™Iã—­±lk.6˜Çb2çÍê[Åg2”°ƒ«°„³LÏ¾ï>‡Þ<©×ëðû,³‚mìÑBv°©;ðóÕ¼&|Bþ‚î¤¶6:Þ^¶ éE÷[ñïáJÔõ?W]ÎW:SP`Xé
…MZá¨J"1Hm¬ï#ÊîíÔYi¤ÝD´-MÄ(¥É&s¤Åõ
Üa†®Âè§N”øê‚‰.§ôò(¤Ô	áÑg‘- ý“IµñéVtw“¼"°SLÏMcåÜŠÓ‰°`G|î¥P'¤¿¦æ…¿ÚÁ>ñ‹ôt´všêæê>h‘AÎô‰3¹$„Phg»ä1
ÛàåúN:z«'°3Íèœ	šÐ>>gz‰§ºšÏ¬6™~[w^5ÍØï}jfóHZžTª—iÅJ¹ë×r@½Âµ×fÓñƒ»§°Sk¸Ð0f­õö‡ìCBd·|ÙmY¨8“U/ÕË‚L¿>k²â!I™†rÙÖ»„fuø4mŽ‰tÍ+àéŠË†X1Å;x}¹Ö¯ÃËdëÐôL=ð½„Àé¿^ÕÓ×ßuw™ïŸŠlÄÂ¨2¾·° 1*n¹Õ:}ým?q×òP@´½§¸%o0fCT6Øò´Ãœn¸VáÇ¹>ùq(ßdü(‹- ¯&wˆÂ<-Ü61pv Ô®ãTz¾¾óÕàÃzÐ[§¿Ò÷*}*>¬Á„ëº{„ÿ1K¦›ÍùùzLy X°#~`Ÿºy†î"ºÝ&Wl|2UìÙ¬g6ëyœqÊà=ª—M¥ªäí{aUû®ïº]µ®ŒtM©]@SQTž‡ª”²1ú,I;T’Ÿ·!ù7²’Ÿ‚‚ª*³.uMlÁš4Åž¢ì‹‰ã‰XÒ¢‚* ‹jßNˆa­K÷¾£÷éYÜŠÅ=l´ÖöÙ½BÕÁ“ª©Ëy©v!«
‹°ØX´1?&÷C•oŒySŽlGRÜ°üùêRS¬ÌéòÍÂò¤jovMÙONèÀ’*zPÔÃ
|Æµ¼Ù§.«;&ÑvÕÓ5¬]L+Ê“Õš€Ëúmk+Ë¼pë2®ÔåcGWÑÞß–Ü8Õ@±²¯(ƒÒ¾Ð+£'
¿bêâµÿÚàÿuIgxzüB”¤Å™žÉ „"ß0q"Ìð!‰Òˆxm™R%Öbåeðeòci0
Ñ §³DYªÅsPSfìÓhjÌd_©«¾Ø–Ó5gÅŸ­Zòê‚Œ}öû™•¦z!|×Øü?Œ#ñP_eÄ*¡q–ú
¶3ñÉÜÏÐkoÒÅëFŽ§àCò5®'"Ñ×…s†GOÊðDZÆñ§-âTú^*2øUÕßY\º]šN£4]±£]±á­ÌÂØ²qÌ¬ô1Áø©›‹SÄ¾þö Þ>éÖ×[™ï½ièñK×n¿:`[é_èOç€Å¹þ—G‚Óã‡Êw91«ànŸÿ¡aÑ‹‘¶ KÍjb"•D%‹ÓrŠyó“qšðdÐÃn9~+
&üšdS1H×÷©‚B@KaYaV$!zá’½Ë†ÉB*÷!d jƒÕîzTÁë2áüò…G¥Ó!KÑ¤ÈC#A‡”§šA¸Rº›áüJÄp^bUÌ"…^2')§pCà%°rÑ´Ëf–µ@<w~Ã	Zuj•Õ©ÒFæÈ¢iï6V	¬µÜç~¯{ßÝQŒ¿0@¶—¬ÀûÃéñ×ÃÇ(—ï…ë•¤•D–„_ÑyW ôÉ»ôå—{÷ü•œa$XáŠNÚÆ8¯=Ì{ÇQ½d}i$ØÊ&×2Þ8ë;Í ¯Èl[Œ&Ø|¸ƒ’NØ.}gp­Ðk´{ÐŠLÝ%hÚDÂÕ”NaÒ3W%Wá]ßkøªë`n‘-ÂY¤WR‡¡#>½âl8À´˜ÖT]‘ÆÞiÆ”aôw#eXÞô÷®gæ$ë4	5vDX±Œù™wúú?;$E‚-ÉB=jß´&¿ÖlÀX³O+è³ZC“ÑNsþ“ÚãõeTYéº3‹ß–êõú¢t*	Ë)¨ó°qåýŠóJGÓ-—sšŽ×üR
 /LÙ–ÕLc§ÃäM¶j`I¥BêG—w#7£á„œ¯Ê$)œ!BŸ*U#„ž3çzJ¦àÏžß!sf.N›Zç×HÙ•‡ía®žÑ rµuò'ÍÊ‡0mq>Î#Ìºb¦\;·yKùÑy|ùØñÄ’+ß5ÀSÍW_áX‰(¨êdãôøß<Ò<ù˜,oxû’þzü=ý¹(hÆƒƒÇ& ]ã†Û/¡ÞV›MÕK¤Ý1ÿn6”D­™B÷Å4UM~)â5ÌX¡Ù¯ÀÝßu
Àw±U‡®ás-ú|×Ù
\nyË‚S|³ûàÙ9äÕ}“°½¶·³C÷7±œJªÃrbø¸VóÜxÔ€\nÈ/*%oçê‡ò¶®~-'dƒžÚ©ËX£Û`¥îí¹Íø»!/8H£øbk³EIÒŠ>øåß-.üÃVëôø;¨ü}ƒ}jJès¡vtÝ=>‡xyòâtÍë¹t¹+ªÝ*Q1Hdz^³?`‹Í”ºKŽ^Aö¦‹OËB«ÄuVÉ–USÕ³6uˆâ‘ODŸâ@áàOÙ‡@ûä'ªüã;oHD¹i9PÛ~ûÃPÚ‘yÕ£…ë‡Ï¨-U9šã«Ê±drŸLøÓ	v.Zó§‡µhöêÚ*·Ÿ5º Œ½ìéañéÅ#OEçK:äÝÝÖ›ïn²ÄD¹`¶¼ŒhÓG@˜žõuÅ|éEC}òqd’_ð=¥ ÷¿0I}Á_7k:Ò±Êr® ù0S÷…J5¡0üèPe	ŠÓžrÞŒw2ähæ©)½`Âœqn˜3Ô•{Bœ1!ÎÀô£€{pKË‘æ¦glÛÃ:ûüÍ÷ôäçÞéñ?d¬œ0cŒ#Ü°J$)O(1’WM(1&”£¦ÄìöÂ¬Z6¡_ÐQO|ri0¢­¥@—ü±Ò_Ä™°_d’Ó)šƒJ.2ò‰üè¤ËI.{éJQ¤Cˆ ¼ðïÍÓãàã?=~EÇ#LÙ>7Ý›à§?],þÆQ1˜9*GÐ‹p‡z÷{{®¿F«6ãb×äœ-í¹3ùì¤ì¾ì\«9³d½[6èdÇi=Ú]óÂ·H×¼¹EÌÖã»ÁÐï’š£<»9Gk½({µmù;ò+ÑsëªV6Ñþôq”$>ß¨`¼øLÝÁ£5„‚ÓU¸}ß·ïD%i¹Xû±Ò	Ÿ/AíÇØ‚U íÃQž©uŸµe‰¼Gaô}8Æ£¡‹{eëéê+ÇCÕÁQ
‹Ž*ðøáÐêÃiH~ß’ŽB°üÆ^e"óÛš¢“Vç£úá°(¹¶*ƒ_¥ƒjÖ¶šì!nXøRÄªm¦Ã3—ó2Áûó’™þ~†¬˜ð—‘ö&­ÑWÔŒ7îO%ÂSqôí\#DÒ!½À¡6Û”„=lƒÈm`-À¥¡gY#vqûddÚÿ—‡ÍiÅ|i¹‰Š¹£ÈÆ±X,x*~Õa@Â!ã@úZH8ÕJ1<H6ép.2¸¬{­ñ¬ƒv·f—œˆHÀæË‘ñîcRÈ®2˜GÖZqìš3…{%« Ú#{€JYKÑO[Ý€ÝãlßìøP áˆÜÉts7Ìšo­Î‹¦ÒÌ^´ÙpJ«›raömå†÷›Qû€GJ?é»Ý$ÑhóèˆVpcê#Àt	†b¸`É¢²rx|çeáIéÁ‘„Æ:ý„4¹ˆùEÐJum1£ÆÂ¦öÀœpTÎÉZ,.Å@:¥KGÔÉÚ¿`p’mšcYA°N#Ó6qÆàRŠxJñä©^€jYÆSêOT´õg,hOÿØºÆÓÏžŸN?{óä¥§åÇ©…“=KI$Ni<*Dãd­žƒ\6T¿Æ…Ê©U~õ œìáJsÊ-ç”¹Qaã¶ªÁ¥çµÇú‰`ñ=u™Úç Øóµ
¯N€=óo§)n»¼Èž|§¤ìh_!š' ^</Øæüùíðôõ«.ÔøJÙ8(OÃiËÕFú†Áo&ˆ¢èmŒ<nœØm¬³!· hË[³WÞ=ßé‹¥7tÆç/²Yøk^ìœ%ž4->Ô.3dc!àOK˜©qð0»vŸ›‘ÖÉŸ»­Rˆk`­Ù"­6­-T½^·I|´>š,Èð;Å&,Ðÿ  ÿÿì}mo#G’æ_Iëz,êF¢$¶äîÖ©e´%¿4ºÕçiÉ^/|ÆªT¬kE²hVÑ-®VÀæÃ`1œÅ|k1XÜì7{sƒÅXXÌ5æè~Áý„ËÈ¬—Ìª¬ÌH²HQ=,Àm‘¬ÊÊ—ÈÈÈÈˆç±Å0;D?8q³ÛS¦…&,…±m aâ<E¬—áƒáÑÁÌÓ¤´3î)vÁHp^EIJ—8ÙS‹IÒ%é‡<!v>Rœ.N­«XÇ7°q€ãatñ%Š#jI–Ó»ËSËQ«O«¡ÂÓê4•››+Š±±â’FY„ÆÏÚ¬?+ÞZlæëÑ°ÅÎÂÅP ²$nX•Ôrø¬ý½‘Á NÈ°J–#+)c$„,Ä¦›’aë¹Â"c¿ò"zé"ûUÆæhÈ6ÕÆdáÒ3;ï4y¬abû 9Á¦YC0Å„ØöLO¡×WA·þ¹0É[ÅÛ€ÃÄ¼·…éCsœ¤Ü†>”ÿ	|<€X£0ÁÝ·Ý	`1•þ^1SÞ³òZÁ2©3‚FŠ%;þFgŠ¿Sâ3ÝµÄg:v]Xh,p™ü¢&%â9cj \*ì´ÈR†Â) ZšÜÃ¨˜=Ü»1¯3õ7À­ýÃ€cP<8¨[9!RCV ^WE(Ž3°1bB¬áûíàØig‡µ°„ˆ8Ì§Û‚ðâa3Š¦™!Jux†þI×6Ñâd\À‹.* ‹jìR}£ß8¼6‚<#€{–j=`x,¶7%\½bž\—9^žöš1¼<ÑÂž£åÍÑò0õ¨-OòÒÏòn1P_Åæ0yÊ{þL`òðyÏÏä€î6P§q!S†·+ÍÃNa&J+>íLéó-D¯‹›Xãí€Ô±jM¹.©Ä·N…[§HKUP(³SY¨‹Ê.Šo¹	 »Å)9/n²`pÕb·Mjí6¤1cly„Ã´P-BÁ£eÁ`7Žf˜J·-²ëh»	­Ö«Ãméõýh*ÚEùQf¿L4-ª4-±RŒÈ´ôcŽ˜&_ÓFLËŽÆLS÷í‡KKŒ°"XZtc`iù:•B¥ÙÚ«q­îŸC¥Eñf¢U”–¼•Â¤•Ç³á@Ò„#fI)ß&ˆ4áà…ÍÒn !M´…æøh2>Z¤ÄG‹æøhÈ‡F’¸fí°“†9Ë*E¼IP'ñ×#b¬·8°&Ú½˜=2+k,´!ñÕ’ekŽ®6:º—©9¶šé7;®SÇV±‘Õ¢J‘ÕøT—ò	 ªÅï™ƒ«•=Yµ|
´"ÐT#£\Ëïû'ýTÍ/¥}¾Û¯/Ò%‘pL?Ö(0çã0.Ä]¼’DãÜ¥ÛÑho7J3æðvñ5‡·{=áí¤Ø¬™D¹+Ôpv—/uâÑPõšØ°¿æPw…ç,÷xs¨;¸PwÅ ëºÛ¸/Ý‰x7Ü¸¯1î]1¥øÏö.¿ÐNý®]€‰™ƒàå‹R±MËyo%›Â#±£ž­û¿<f6‚°ô€WÚP,É1!bœ¸,÷„¬lìh!‡v¼SÁüy ÊLËº!—œ&¤¥‰½1ÎÏ•áOodáOo(C¡–F9,DV4¦£APÞ;+U½,wä‹¬.•V8 ¤¦öObÀWÝ‹
YÆH¾¦PšžÓJ“>;](M¨ìJóÆ¡4aæšM˜³ I«1t&úÁÙ†ÎTMJ$Š6ÃÙ:1Ÿ(TS|"ÒHâÏ÷”§&æáÏ%¾{ÖúlLùó˜äÏàe·ä³ÅrPžŸXöì»g®×6.Ã87ú¢Ú#‡‰`¡*Î^KÐPaÔpÖ!ÒgDBÅ¹ö‘X¨#øèx¨lÝUåF/CBe(S>é8ýSþô ¨LÃO'Ûº •Va< Ôr?	•H ¨l”rà§ÐM6 §Äöt|Z-ð©
úÆõ=úåqœr¬Søæý 8iã <à@OéÓ §e°§q)#Áž¢s@±î-û³ŒjàO%3ª `Ô:ÅH|
Ò@_}I{šœ]_~îCjÃ²œÐ"~*Ü¿ˆ;{°e°<Âà§ZžM¡ô9£À°
CXÀªzón‹¡Ê·¼!œ
OµïT‡ša}î<½¾ü™à(TrÝ–>Ìï˜Sèß\ÈÊý#Ç3h)B‚2á´0Ç:”ÿê««o†ZlbD$êtêœ^_þ‰Q©‘†Ñv='Ûù$+"’—ýBçÔ0o‚¬¶?(H§Ü™‘è¬(ƒk(âu²ÓyÍ»JÁÆvƒ0Òn–Š@cðhL«]” c»ƒõç‰Ë •ñŸwI­¤"š<`³b¶ ,¾×¸B0ÊÀ¦ð;ãêÂ­UŒ¦ÀK1¨ð.ÓÀi‹ri2óh€y@è¶ûÁ±OÛÍVž§>äÑ}ÂÆ¡|™ÊŸV·÷”tš[ç›ÐÅ‚¿w#õƒ–£eó,íËäèÆ5B®¤”÷ƒf^;óÏïïí=ZJ2ÖÁá ‹àiõî»Ço“‡¤æÖ¡×ç•`ü	Qä.Oµâ…ÆyWï+(yVªúvÝ§È$±?îººÒ¿’^¡“¹o©¥-“oNÛ›Ý^þbZ¬‡Tuxµµe²¹¦¹²jî2ñ›gÆ€åxDœ.•j÷Ð®$Irh’Ð©Ð®ìWeçòöÒ[ø#Ê{â~ËKêeò-£¿Ñ,FÇƒ&Ý¶=êD´;’¿aí;½OÝ:ÿæqó3¨úBÜé,ÿÐëƒ)”Pä¦ÑÆ;¬t²šýxëkk,‘ÚDÿE‡³‰ `ŠË°a.ƒ¤0Ü) V¸]sUÇœ¸: Zè¢9è;ìÃÝ5é¼aõ-E0D¥
ÊvÙX›¼5’b(¸)d†€¼ÉkÿQ±w„ý/¹euk"“µ1„‰·å(G|{£ÚÎ`<hú0(e°=ÙÁ’dÈd>4LËËç°,±NÐ4góÿéœêGòC²n•œŽK¿¿–¥ôÓe¶ëÒ/Ññ]Iì×6½$#Œ©›ôó³¬†ÇÅô¯~Ÿ†l ØVãMæ]Þº<æ	;ä£ÄØh°$7„ôäÞavLûé!Q ?†à^æ¥£Å¾A6tvž*|*¾vj|Âi¾qTQvzm–áõ’Ø=ì²ô©ìû,)í´åø7%–&*´UããUZ „<„€™Áe)8ðo>Ïùì¹¯>|XFé7§TôãÉˆ«J‘H½šâÆ|d$¢qˆ„ÌÛ¸þ
ä!×
yÈqHS‡R¤!×*ý7(d!Äá„9ò5!aƒÎ­nât›äf“ÇÝAéæ\x…>ž«;³ƒµ•†`Ÿjðy3“iD¡Y1¼š¯:¹À'!u&‹¢´{
3ú¥5îóõû—Ý–Œ¯NÐ3¸²”kƒž±ŒLâWÐ¾Q0vSÇ[*™z¶'/0Ì³AçØëÿ…µvƒNÇ	kB‡pAÄžà‰
{ùxÙ¬‡øµ,×¾|Ô	!¾A‘M ô§^GÙÒu¿ï´™«ÛÆdà›\¶%ÉƒÖ¡mó«¯†JŽ1€·HÃ!§D,qw&1«Ÿ@ø;;÷Av‡~pÓm‹œÎÙóÌñ69º“}TŽóœØ® A¬Ö+°2‚·h„ØQ€ƒC½¬¹¹Ä6|ë@M¯…eÉÝ³N8¼–Ï‡Ò£ 9€hç§Ü|ÌžH¾§ð€4boÑzÏ?óšµõ¥‹T½©jâM…ý'‡ä¹Ñ„ä`@ÕwÆ!5 B³Å@Tç4ŠKÀeö×˜1±zoOˆ;3»L0-Wâî±ßÝ©÷ŽbJÝÑýtÀ¹ÈSÏinï>)÷ÔÜ·[cÒ!¤Ò9m¨^øvA1¿í‰®/Ñ=!ÿ÷ï~%?êÒŠ8`ŽëoûZÖ‚(b;ä§ìù®“VËü{¾ðúÆ÷¸­: þ‚rüØ¸ÊÝ;ŠÚ‡~Ð}î}áuógã5/F|¥¼—¬•¡×ñEOTœV½È"Ÿ’ÉäÎ^à0vÏíðJ‡w»•|ã$\)BWeVO«y†Óª45-¡¥Ÿt³õ&9ô;^9Þ[9µ'ZãáY(•Q}á9QÅ©l“n…MÛ?úäÄ‡Û„ 4‰_1]ŽE†‹ ™n…¹L?ø`«Ó!"ô%sö=[}´ˆvœ#¥q¼-¨Í´d/Ùµ+A•`sÒò©ò¸úòkP…ÈÄÐl˜ È]`)LqRÎHñ§rgéÖ»lº£—i«"æYf¨¹±ÍÍ—éÍÜi¿Þ‡g2¨Ö!ÛwNÕ1Æ¸ÊÃT„2ÇnEèÖÄp£1ÇœÈe¹QØ%]FÞ‚x.!ì…3hç‘·î¥@ØlIaÍ#D®ƒ”D¯úˆùÊ—É9ž€;S¶HÏé‡Þ{í€ªí‚»ªÞ÷˜–ª­þ·úêÉ2ÄÀp›rÿ˜&[$§ °_ =Ô²òJ€VqOãAìTP¶)^YëöôO¿`7Ä0C©T¡ÁÝS9f6àHê¾Cw
Cƒª¼¹È»” qe5]¬:+N;¹h8Æð3'@¦î'¦<Ï¯¹øîßæ´Ô9¡‘dYô¸‚„¾sõM qßùàGÓ•Ô‰vã~ý!„®Ý9—B.È
¯’óó‹#‹.ŽËÕ÷±@ÍÂ”@´?>Ïî,Ð×«—4cÇ4,V˜²rí°MUG!5á¼ Ù\$3†ck”Ç‚¢ON- 1•°¨©1¡: Òä`ÛJ íÕ° T!‡ý ÌeŽ±o6±ú"K†ˆ'lÐ”|»áÆÔ
¬òÄÀüawcÝ¢c.«€"A/}Êƒ¸x÷Ò1sÓc}EÀ©Úo8ÎÏpÔš×—ÿ‹î>™\•ËUÞ]W–t•n?»À=/<‚^œY÷±ï½Dç-Äé
æÏ`Èñ—CÐðw‰è¦ü…v¥Õ¬ËÜBÒ:"K9‚73]ÃEeaçàðMT9ž¦›¹J6B YElÅ¥!`ÂÌ–¦:Dñ‹Ÿ‘LÅ#F‡¦ˆÊâu‡ä
–‘cƒe¦x9š•Ó£ˆP/3v&"aªÞˆ&'V‚$
/nª¡çù®Žñ'1y)‘qlSÈ\Æ,bþÎiW“[@òÙ/H†ãÉeˆ¡ö5”v¯òn5òÀV#)h·V’„`j4‰·ÝZ‰z¦
ŸËÕDä*=ÆÓIUvÓ­•©²cÓ×P¬ ÒY0î£Ñ‰W|ÇÌÉVáÔ!g×—_‘ˆª­woh©e­)xlrq§7U‰ŒùjØ¥ÞçEIAlûOðÛÂ¬ää8¹²ø' íed™œ`¡(Ý†{…$l@,€Z ×„àš zPì²Ò+E1€ë†àÒ À…C4`wæQùî)¼¾Õ.Du#’ÀÅ¤o–Ü½`t«qÄEeŽUrdÆÁ„Ôd4hø¸¾ýmô›ØÝ3ë8ÏTœg*–^ˆ#‹É…¤ó@²èBZG‹$-ÄvÂ‰HÀÁ"·œVÀ_m ©ÁB¹žfWHp·QÄšÂ%x
5Gž±/P¡ºb”îTºM0éÕÁÆ¨ŒÙéE [' ªB†y£é–¯TìàWØ„O'™vŠf;šTÏ£›Ç2Î*³DêðŸ¤”GÅã$AVØã75û¹”Gjž;ç*,EU– £rÒù”GÈ‘s%v—²ÚÍË6çq¹4M™Âir1Ÿr´¸ï$þE,°{_¹.äW¶OÊ¢;V7×dj\ËÐj|OÁ¹OFÎ+¤ñÄDëäÊÒ+7óI‰æ¼É‰¤¡Ý|§¿úòê[!§sbŸï³ i§¯iïïN<çR]1B6î„º¿ÊÌZ«Á,dØöx‚Uyjí(Ã_È±µ_Ä~ÆiµvYµVcŠÉëÌP÷¨,þàu›ðµ]œîH“:ŽIò 
‚Ok	Žr+”‘œ`dü6Q~_{m?ªQ‹j©Þ÷@ˆÀ×ž¸ªKõ¿ünmqu‘Ù]‹œp®¬\ññ·¶…ß¸€ŠmtS=ùÜsÂ ;Ž<ª1q6ÙÑ5ÇÌL„0æ‰%$<Ô×È"¾û)Ð[†&âyÌ«íúªs¨´kðfŽØt!’ˆº~+ˆˆÈój¶!¤˜#	ÿ1ØzŒ‡_½éüs;çÑmÌ’p¨ú›1HíµG>Ç#™"ÍÖ11Ø6±9iRn’OU¹!Ïö>y™ÌÀ“>5…xàÈÉpU$wÃ5­o¸ÆJò†Ÿè×8ÉÞìm+¼:é{ðq-R¸l“¸Øc¢7Vm²7«Ø'ÓîÃZ9cº#‹^ã˜·sJb³8ºÚŒr…ña*B.x.¨Å¬üåÕoûÏ¢¹ÓN€”)ë	ŽÂm˜Vâ‰yßUe¦ÇCµ 2¿E-g{·,D²4{ý¶vw’>Ö;nÆùDrÎ«Ë:·^âT™çSj2ÊÙ»«µøxð&ÈY»”Iä#Ï(„ôòLÂ}1MW&š¾OûBëÄtöb\ž²¼EÚ=§ûP3yÞ&ëëtý^_»(lh³Ì÷õF!rTª.±VÛ£å )?Ïg›zœw#gáÍÁï¦™/Ð‹c6±qÝ¤ÃºQU±’ÃÎ)É„ˆˆÝëË_|
õ¿5ÁàÑ–\Ì~hMÈR‰B`Y¤»Öæ€nZkŽKÍ)wÐï3­L?‘’|Nb*`+»´LÖ–q4º8Ä…ì±Îû+óGZMXuU!àºN&§+ë=#äþ´]ox§H°0…˜ä!™H·a¬5¡2ðvÛª(…ó^ˆ&—º Öª4=fqe_ù^ÊLXËÚ±*vp½„)EE˜\qÀ˜ÖËÁæ/Ä‘]ÌŠÛJ«ºMî%¿:à˜ü¾ £7âwµÉ‹'‹‰oîÀ‹¥Ú¤œâÉÊt÷b§b ¾‹¯Èå7j˜çÙóê'KR)}BI.‘Õ"LË+üÎ8œþ©Û;BWt¯Gt×ð%êÎ¶P^|d³à¤I[™$ÐMÍU|î€%q08†7ñ¤Ù´˜Årk©,š®Œ™7ñÀ£Z¡	ì	]çÿ„‘q2Zäg‡$Œ†mO‡9«‡êî4·Øßýà%ü­ÌÆi*7Dz¦–SÌÎêÈpiçå¤Í¬Œ÷|:ò~å—+o‘ýOÙ¨+Ìœ÷Ûº[XZÁ(,0ô°žx@{¢í9M áG·ÏNZ°è0xûLŠkò÷O—¶W[wuQ°Ú¨rØPµË¨mBÈz…´br5‰ q$Ûµôù®Å§Û–ùâêkiOó~ kùAËó"F³akkÂ].£ú@—?„P`ýx¹òÂ×Û?ÛÇl;¯íržªÀoÔ§¼¸ŸøYÄÕGm‘§ß›Ž^ÅˆíÞ|t¯)bòÉä[î¢Åo)ï+¹c2ÿúRc¸.Œd\Zß&‹©:)½¥zCh¹È$¸<³ôçSÆ›N}‰ÚÌÃ¤dºèàóÓ÷dt—Q™büL1†½4ç´SêØèˆš¶pŸ0°‚FxD\jV¥‚Îùdn•¤ÃÊ{ÐëCŒ.ôÇ¨ÒþêËëË Kàñõå/¥•d,‘×®3úUæ\£Üè˜™1ºït*nšFÄŽ©‡çñº¡ðÃƒ•øôì“þ©ý 	·ÓÿéïËüb¬:é'ÝSâòðþÕÝ‡qáC–~jKëúŸ¼C~·ðA÷L|@HþÒÝÝ÷N€©ááyü‡îÞÌ®§÷tÏ¼ð»Nû‘ø`þS?í;½‡I¢.¢ÝìöìomÝXzãî ß÷ºî0IwL>ëž<ñ¢ÔLÝ§Z¥õð¼ð•îy~Äó>pvê½Ûïý$)Rþ_Þ—oûR/å;0±i­¥QR¯+‰.xK
+ý	S3ávl ÞY•?#ëYR´éóÈÞ=ø8_Õoº .íDþÿò;KW”rê+¥R—–sƒj'†tÈÁw¼,L?[ËSðÞÕ7Yÿõ;"}áIŸn©Á²+}ò¢tÄLIú%ÕmÑMw¹qUŽ”¦“•jÝFÿ2Ž†YµÉ¦f`~‹4ó3)í<!Q™˜Íâ‰‹Óõ;`fõíÐCž‹[ii§Q(©ñ]_þÖŠ«nt°»ŠŽ‚ÄšN	üòö)Pg2oánœáÐ0> F8û
NÃ ²ZGcRKÁÐâ “póÏäRÉ×À:…'žÒ/¢´ƒDËóúòŸZò÷ßtëäƒ«¯ékÖÉ›¤AÚW_Ó~ö!ð
Þÿã¸úÊoiÉ­«ÿCï¤6Tk™´ØSwÙËÿ‰ÞìÃ³Pä·]F&&T°Ž#Oêˆßðs¢ÓŸ:aÄ£\›ã¦Ó	Öì=ˆêçü{‰€4 =mÈ.g+wEGKÉL„†+,­t	û”€cæhþŒ±ïÑ½Žÿ…Çß×¢/x‰æ+–NipÅ9ÇaÐÐ-›ßeÜfñ K=†TO›Ë>'àlzŽëGÃ•{›;cÑ±¦-ë!½9nµœF¿fóÚŠÀfÔÎOP–éî<B“u²+ò-ª¥ümRwEð‚¨~e‹{ÈŽXÒ’Û‰µ®÷’@ÖWMñÈ’š^q‹ã¶¤à‚m*Ò1!v›Ê0óØm‡7âø‚aa>¨ˆË(ª“4 Du@@ÕÇê[`»lJg	Éëpv„ž‰£¶Ÿ:Çž2›I-Ð÷ä0ÙñTêiÂé·§~÷´ÄƒR`C™OK&[,»'X‰òÉºÑÚÁ;™ÉÛ#l?‡Ò€ê~‰0t0ÕÛÐûR/¹Ì6`ˆØÔX	¨Epõ«!àÆÔI+ŠzáÖêj3pÃ:ßCÔÝ Cç}j’„«ÍÕz½¾dE>ÊpübOêáGýöˆ8x°§Ë•TÈ$C•œSjhÔ³	-94ÝA¸•3„ð	.Ó*áë(ð@”ÌÇq«Ønã>l¾U=vÝ¤Ãp½ÓôC8,gþ5xšª»d…iäºd=ÆÉ‚zF„Zb›¬?“¡è4“¿„a©¦œœ3½9è³Sh,à#2s­Ð}6IkÕ95•}!µúHœ{“Hu¢Èû;]dÒsú°VŠ¦˜]d7³^}éävET_Ø&˜O “Ç¢Ï½}/lí¾”®èÍ‘zDØ!vOœá„zgÄaƒ»‘xˆã|ÂläÛ42«—+îÇ„çÄ±pü ­bsx`h˜caƒóæ•SoÁãÆ[mø€±£s—‚b´b ï>„¤¦˜{¢}õD@…Så[úÏ«Ÿ€sõ\ ø¦r÷¼Ðíû=Pò;Ÿ\ýÎ¡+Ñõ÷ÿî’3nŒ 0†¿¡+¼û^\ú7;ÂàoËíˆNê¡7í“Üíd+"ãioÏØ‘Ù”€‘“&5'
ÿ¢!®øü+1pyÏÍ˜wÏ˜ÇßcÀ^“ÏEíùÃX½Œc!åÕü„Êä¯#òî™KwVLÛ×—?wµzÍ¬jgxPS×ÄŸ¥!¡Ë­Æ,">pzýŽ†¦K¥=jU‚AZ¾×næÝäçG¢;šwC8„hs-rL£iíïµ@½|0d?Öó·Wr¨T¤às%¨t÷2‘Š¿¹+
Uüji#aM?zÔmî{t_¸v¿±Öx¡)d1ƒgÓ¡K¸¨M}
­¥’•Kf’&¿^+_Ï¯¾&apõMDÞ$ïSë‘µû+Ðæ×R¼ò%ËQC!Ghõ$æm2ÑÙôè/´Óãa0…ÍOD~T;…j².$¢¡õ¯þÐ=y}å%ÍßHÄ…!IÿÊRXLv<ù%è÷¨T…äaŒÞ&ÇPÆI€ý¶Û¬õÑàÛ€«ÿ8Ë6g‰C¾Nü.)½Ã NÕÃëzaX[8d¦ŽÈ]Éþ¦ëÖ >d¤ÖÏOßX0Ö
M !vÖã&t×£~ßÖ!D€pxQÚ>ài	 «±‡Ù/¼¡/~²ÔŽ¯þŽ«is‡äñ^FEyÊOP#X»!£õÿ#€×IE[dsŠ“œ–,Z„……µ´…¬œÇâ(}1­ÄÐÍ‹E¥÷+ésµ;çIßÄÒ<Ü:‡J‚ß\Šåâ";þ]:ÂôšLÃ[‘ÅÑÔ€'É,Úßµ\ÆÚ<NHÁrçñÌç'Æ·i—Žm¾ëƒ1³Ý´vÃ­8¤Âœ•O¼ì;½8¿ELk9kÓ˜]È´U¼*8Kwƒ“t'§¼¦¶ÏéÃn[ð_&çÔmïE4wAoe}µA¸“’UsÈ¾ˆ=r¶<xÛ{Þ1í×k¢Ðô¤C•Xaxˆ›zËÌ;°L¥‚t´^¯÷Ä£É68¹ÓÐju$s„ËçyÆÍtzÃò¼¸™À;Þä3Ìa¨xd÷´>%ÉèD%QC·9iŠýÃ@¹¯TêœÕO×>‹Z=ú1¼+=Û¢oF&&Ç¼p,,’iK*û·[€( 8ù_Ö³¾ç/út™t>£¯‰_(´µb<RÖ®vtçœ¶øbåÎyçâÈ¼pŒÉÑÉÿ°ïŸœÈ.Mª¨$;VÜl“BB`Æ!\èüõl¼e=òìÕO:(ÂN©Èæ]éÉuN•ucc™Ð7Ù¿o±ï±ïÆ,”¡™Ozùc:C9Þð"™UCíèb‡þ´nF ¸ –-ZžÜl\˜¦£7Ö_;½1œˆÖ‚Î Õq³Zc}ýÕÆa‹Z'3 8„½Ù9á»Š-²Þ Ë¤öWËÄçì™>ðK.	“¿Þsš*YkPÉZ[\Zb:¦3²Žé¤:¦s±Ã{‡Ð?oƒ~Á8LHÌp;Òe’sšPYeÑ®œ³ ä1Zfs1—@Y2¡MÉ“F‘ýd”Ãù±7uö™Ü…Ð¢âŽ+M®8co(ŒCoˆ¯Šw`ø,‚ŸW^ ØHß‹‚£*ÿŠÄHù8jPvaD‡|Èöikäo î	‡Ì¹y9,>ä³båÑ|†Hµ…Q³eÞw7áõ½³Ä;oÎ=”µÌûñråîˆÔµïÄ0E’1q]Æ_½ùfþ›²v{ØmÓ&Ö’VÀ*Äü±Çv\²cÐÛf•øÔ‚Ou_ÅäµfÚyvs6o—fSzt¾5raõ †ý0è¯ôŸmùS‡}F¿vMçsƒvÐ%V	Dm”§@¢·# &ËbìM5“
à"ÍU.l:fCJÄo’Ç{6ag’§(K¨¹ÅÓ’^€`ÆüM<™ð|8ˆPèÂmÛÔZ^~ÔSyió'za‹ZŠ§+Ì‹G÷EüÑ½àe×öá¥ôézÚç3½)>^!yÊ´fÝi¬e×,O$ð˜Þ¦YtÈâ¿ª˜<¬åó™3k3çþ-š8»AÓ»M“gÿê[Ríb=0ŸD³6‰bÏØìÏ¢“æió6Í ÷_}ù¤"ã5}>uæS§pá¦ŽßéµYÞƒ×¿M3èYýP8•¯f*‰]1ŸQ37£J'ÞlÏ®8È§?¯Ä´n«iõ “ÓëËß‘ÚúïR53‹wÃ|NÍÚœºŸ›R1Ä,Ï(|?ý)eK/SY°m53)nþ|*Í§’æÂM¥c'Øu‚g‡·e2eT„Ï«™MiÌçÓÌÍ§µ[7Ÿúô•˜¹D¦ÇÃëË¿giää!Å›¬ŠyÒæ*ÎÂôL[SÍÜd½9Ÿ—³6/¬Ý¾]XÌ„þèÌÆ‘wbtú=$¯¾|RÍlÊº`>¥&<¥äùr/™/Ý:¶°sXF‹wâx–¤f˜ÂF·Ô‹ü:ï9'~—I”À!¾Á†2»tÍ{H{Ö n‡«aÃ”aÅ€Br4à…¤ÂÎÊ^M¿Ž‰É¨˜!
¶ &Ë"àX+T_äk<?º£Èò»n{ÐôÂ‹RŠéÉb†ÕMÎO¶pÁÇ…²,„žôƒA/¯kYŒß’ÖLÍË7Rä+Î"z®‘"èàª<ŠŽZI'–-wŒ`9¸Æ˜ƒK¯Öë{_@e>­×ëð÷2‹šÃ±Áe9g¬ü?I~åiµôß7XµMH«ú^T¤\H/æ½ø²Ø`8Æø©g]«oÆ˜ÙIŠgÞ‚rº›Â†dÜ/	áX/Šƒ.À3,Äû#0âÓã¹ö±H®}±ƒ¿Õ©­´a÷µäe
èÕÄ.ŽœãAÛé¯tpaçñÞ9*\Ç¸¶¶|É²¶dÜÕ‰åº:+¦`ä%£›ˆ\Û–vU:ê1«Gø+Dø¶éŽ‰6Ž‘õ–7S*Ym°4†=>dÓ-Y›òqŸ3#Ç™SÔp|‰ôb”áKð‰ê]ÚöuÍÐcKKo×“8øe=5)Ê0B´n×q´4:!£÷÷žì™ú„÷riŸ¬ÄyMÐ1vEÃ®+ŽA×$ø2þ/|Îr Ö-NIBÎk±0§ÙPaÂ!jaôåi3 *ø”²J8TÈXA”çqÎ»Q‚¨S9Z´GéÏ TŽ|`ÖŽ—	ÝHô½0há}˜­k5aY–—¼¥²BÒgcñ®%b¿,ê‹#[6õc~âu€Hžó`DÂL·u}ùß3F÷$ETÀ÷~¦Â÷QèõCyûÝ`Èä™<ÓÓV ¯‰OæÿýÓW¿–'NŠ¿’4ÍÚ¼ÀSAÃeƒKÀNÎBZR¶ÛúÓoÒ¿ú½™Â/~éôu`…–®É-·†Dyß¥1•«Ö†‰?1YÊ1Ç†éå%ÏËÄénÚm¿úáˆÊ®"ÚžöÚÎð9ìG©:`AÓßZÔùâP„“2cð±GYÂ ‹’»LZ™‘y$)šæÂÎ_ÐûÒóNŸ ìÂrÆÝ¤MÍ}…y«SÅÜ,A¤I;ŒóÄïU‚§ë´½·áÕWS¯±¸ÐTÙ}v8Õ‘î5õÇ#­ï{˜[[_ºøAåõUVÓò]hnO-Õk†Îï=Žq\OÔÄ3°¤¬L}¿ zÓÇ[(ò‡ž–ë.é_¼, Ä‹ƒøÔRÕJn­Ü£Vé½üŠ  LQ[èMùBÚ²²{†™ªÂV~d{´}}ù3j†×—ß‘¨åÖá/&ezÆM•XX*çŸ\çµ˜–æ"cÐådÜ¸K8®5¡öb=–`,Ú–ÂB`ÛA^ç¯RÑ~·éG|kP;¶’ÜTv_}é3LN—nœþ¾+ØÛÔÑFzépC½UHï(òkÑQsQG‹:x‘D=†|©@Ô÷¼¶—À(³°‚ËaÑg4ÄÅý°ï„­Ù—÷Éí=°Áp™Á¹Œâq)ù(ÓIŠ¯µl;íºW}x¾Þ¸gÑÝ†Æ$ÛÒ	(§9tˆÞX¤‰ø$†üP‰EÄZÉSÜm½ÖÕ83~qcŽq#‘#2JD;è;ñÛànG†˜¯'Æ¼Ë—Nÿ¸^­æ¸î2¬cÅÓOä‡¤Ÿ“Øˆ+YZ¦ÿ™„[|u2ÒËÅÐV‘$ºÅ¶Ïy”‹Øq ‹\ÉUñ‹ tÈŸ_ïAT
.%¸ÄRb²FÁ‹ƒÃa*˜²âËJb³f¬ýh¢SÞºPïM3ïLìŠ-È¤œè-ç!ÝÅPârªêšn’‰¨à³áÀ*÷ZYœ}fR­òÍPC…³¦1ZÏçokþq¤Æ>Ï;Ò&ßÂd7.lµßË•¥qÖ«è‹%=qIü.#ÞaÙÏÀŠ÷!ï„ˆàwð;öIrT¬¢ÆKK¶ÎüN–…b,c/ZÙ äú<k_Ÿ˜m9hA¼ùF÷ ;Ê±äh_x¤öO7§VÜåÏà@ó+ŸîUÒX#Í«ÿÍ7S[N§m§„’Žã—-œÅîOÁHMæŠLà¢áâ5•”qðdƒÁvëœûpé;i	œ•eß‰ZõŽsV[_&=²BÖM°±ÆìÝ–÷E?è>õ^ä,8­AJ`Áå+êÃ™ñÿÐQV`·—¯ßpë6Û	|%“†ÿLçàøÂÐcÈÆã?ÖÐ¤’ðœ­•*QhsQ{ìqØ¶e?yZŽVå°R|ÔåCá5É#×õz‘Óu=F]Z¶^”›f\N‹DÒMì”ôŽWîZ´$¤.úX…Š4zÊZXêŽak‘‹>à=÷ œEÛéû¨íõoœ
µüÒ—Œ½{3OÆ%æáÊÞV`Rü¥>o"ªkº-²Ûb¿#ûOI·õ§ßÒé»PÜ«ßå¨c?¡a
¡(eqÑ	©@¦ádüãý<ÙÝµW"5GÀŽ)„‚b`œéL{kÂlºe³-ÛïÁ×/ýÕ„ÉÆ¤\Lqf[%Ç [j„ñn¹Ç²þÝËÈ°Rª^NÐG‘%­c"!›O—nx¯/
OHòsmER>.—ÅBM÷o.aOuÉmºº¶Ÿ*c6FXQî¡ÐãÕt{ëŠ&¸çˆ÷âÏ4>'VÞg¡ÎP2+%¾|ÖŠ«ž89 `vZ=¯ÞŠœÁ\x^}ùD3Úú|Ú„b¥Èõé¢+Z	Šý™>’dš(ö™°mb`ìèòi»G¸€Ã·OWãqPì76åTÒ$ïàð°’\Õ´{!2]E"ìúFš	»ÀðwÉjlTSþ¡ø¡´’š¯EÇÐ•”»¶¦P
W%ï»«ÊE^ØÙýZVâ’ù¤y;Nz¡dÇA†{%/k”ôæ.8Á[ä5VÉaHeldnF­Õ–dZ×À¸_&~óÌŠ>Š.ƒíÇÍ3òÔiÙlG®¶­¦{bZ*ìŒ'™*ÕÏeKÃÉÎzyÆs¦ößRPþBât5á…â©°:5)Uì´&xgwÜõÓšœ`icê¤Ì¤L´¤LQ‹ÈŽâÓøÆXÆÆK¯zÜ´Žašh’ªUlËh•[“Ojµ
®±ëÇ­1kmª¬2µo£$U–õs–‹U?òcÓî¼þ1jM.î½\.nI"®2	Ü;~6×Ôš  Ÿ®»i—}“õx’a'¢Æ_Õ¤!±ª·›%S’æÉ¤ìŽÑK•·Û	á_Ìo%sâ-˜8ZwøÎ“ÕÞ.›!á[dýÌòÁð"h‘U5™4MO+ø¶ðÈ9Twý©;äBè¤6ønFSÏÔ¶[‘8JHÆ™z„ÉXSK—”™óÉ³CH$IŒtêÞgŸ²\qþ¹‘åŽãbòÅÓo'ó³ƒ˜cÓÆœgL52øAnûÙØ(nS}ÛÎªbƒáƒŸÛ¤!À…8ë\}xœ•ñùóÑ‚†º‹´#f<‚%%#‡g¥‚'‰þuºð^Z,­	˜°Þ*bm3_È†>ÞïëÎÞ8‹ñ¶›%ñ¶±+foË[ÁlK‹¦¤á·Ò$ÍÍÉÚh‡µÓÑ-1!äu¯x+éÈ¦“bÚÍŠé”‹œUƒi¤Ê¯’ U!‰ŸBê¢U±ËKÃhƒØÇ½ö@1#¼!ÚÐÖlÿgc}ÄÁ­²Ïÿ‚¬’séz~»†ê™UÚ3Æ¥Þèf«&:
i‰ƒDBJÁmü½p|‘?16¾5šÌã âdUÁ‘IåŒ-‹ÉÊœDÄ,6fv.2 2¨™¾ýäDt‹•,Lè-F˜ª¿E_Ãäô7”6Ý">ýR¶ð†i™…ßaaÝwº0Æ`ž…°Ž*WÑm¡:CÚ n†'”šº,rö­½^Ä Y$0ú¸±$28Qù¸ ,Å&xØŒe¦ä‘ª?°Ä½6ÝM$!±È@Ö|DæKªo×ßÿ»KÎ¼iæÂ+ÓÁ$
ÒmùÆ3ªwózŽÂd°
„D†B–C®¥'©'}:Ôé•‹
ÿ¢!†@ò¯LHÊhG6çtªÐ Š€2¡äƒc8mBº˜ŠQŒZµeÖ~• r !8,=äæAñ}p¡ö(IÅeñqø¸“ÿžï´ƒ€“©Eý	LÃ¸†AÐ«šÄ#ˆg­ëï¿ë¸Ó°Ò™%B[Ý?q¡æ”(+ðQøÂBJ¸~xgÐ>å¸+FWfá%äðPˆÎõ1EK‰£’Ó5Ôåê[†hôó.©•TèBï »¢×ôB:…ÝÈÿb*âg)R\œµÛ–ÅÌ¼*åH“i¤§ˆ-_.µ\&)2ˆÔ¹éEîgf(‰jƒÀâ†Q ÞãZ2sª­“ÕVÖIÂóDô=Z È´Á9ðœ>šYqtÏ´ÔânÓ?P9½•õÕYa±ž¬šCöE²S“²Í)“{Þ1í×k>Æ0ÏôÚt(ZA›vÒÃ…CŽÒãiŠÑ2Ë>ZNÑI$Ž×ëu›©Úk³„ÜŽ#·ŸÓ$æ{-ž —w2"6&ž¡æÆ#›gµ=>¥tv%X4ÌŠWî†sÌ³ˆÉÛDõu=ìµý¨¶¸²¸ôéÚgd¸Lo	ºÃ{R&úV«Èk—‡¤ FùŠÒe‰Ÿ›ÔºÞK²GE¿¶´LoueA|Ã_óé2é|F_¿Nh©¹QH„ºÕŽîœÓÖ^¬Ü9ï\™Æ\ø Ó…áäDÞ¸§ùˆù¤SÃ$âð×³±–5Å³W?é ÜGRÍÕú{ÄëœªãÆÆ2¡ÿn²ßbÿÞcÿÞÿŒåA.Q1ùüåéÌäQùÃ‹d6ëQ¢ÎìÐ’vÁÍˆp£k/)ÕòäfãÒ3y}±þšé‹á´Åt¨Œ›Õq*ÒÍ¨V9
ãQ¿ïë/úA§vN¸ý¾EÖäb™Ôþj™øL*k>óÇ“¾Þsš‘Ój*Wk‹KKL·tFÖ-T·t.v’ ÓÎìëØÚ¨/MÇÍìõ’\{ÑSp’IDî¨y¶ë
ZU¢mÁ¡véãÂŸJ“ï&)¸öt˜6T˜#Ñ`VNY ¿Tx$WÀ›oÊŸwLŽä™s\FL2n\· ô›5q­¸&­I0øÏ»‰ë]¥%ó¸Ú$sò$²ÎÓäuéòrÄUïy¦òLàÅbÀr¡Iž†Wœs/AC_½[é[ñMþ€Ã,Ç©Õ¥µßW.ÊaO9Ü+}¯‰J¼å$ºýlâ»²&¶HàV¦«¡àN–²”ÇÙ	îJé·íÈ·G¤Þ®ÜêÐØò`aSÓÆ ÜŸp[±¾É¶]K²í¨¶5õ(¥Ù¶3}ð$ÛHŠmƒm8t%ÐÓ¤Öž4±¶›cËvË‰µõ·ZRUOžVÛ­†VP•(ŽL¨½žC	Èˆ²]‘âØ™({<ÒâMM28¬Õ2Ui…u«lfWI%z[‰D4¢®%¨¥Ö¸1
Qwd
Ñ›Ò¶9ñ*bK·^wh¥–-­Xç4zîAÈœAùØ³›p‹”Œmƒ‹”Ñ†—«‘”
nò1†7Ñƒ›$7¯#3@“ë)µ%¶¤.¯»A—*jKÂo!£±¹X•î`™~Â¯ø¾²EN*Ö+¤;´çÞ^wà¥ÉÁí-ÑÌ÷ê›9}R ¾²	›r‹
òCžŠÅÆ±VÓ·pˆ}àZZºØÇf Æ-ºDÛ‰µáð&¹ý‘ýàu›ðµ=ibŒrë'7?r«fºG_Ï4¾4•:[ÕÃùèðúò_ ëþë!¹s®nâÛDù½p Z§;.:ˆ^m©þ×ß­-®..Å'É¯¾ºþþ]åâ¾Ê•‹*çƒ±‚†mßõ¨ÕÝ(¶u…ŒÛ¾òÂgaX`ŒA­Ñ«˜RöUû%qe—V®›6£Ú;k Àwý@±=«Nä·v%~ë™­«óBX³ZWÎimÍ‡:2êH<¨V¨¢¹”:e3£	Ï0ZJø»Ÿ(*ž´Qs-ÖÈxM‘mÙ…ƒëËïò ÕºðOþƒ¹¤[W¿éènÂÖÂÂˆ=dnÐñISm	S_'¬ˆ\ÝH­î2ju·H­.8l¨Õc†Þ§ã‘ª[[e„ê¶ÒV9ÃôüÒc°KÈ-m%Ä•0Kkx¥á€‚ñ,Ë.fyµ±s+dƒ¶64øÍ$\Hx^–Ï»…ü q»YvçŒæõ¦vÞÍÅ|a{šäÁ#Š•5Ô’B 7.J6j*ZàØ›ã–+Ùh”ã_±À‡{hÿ Jì¸‹Îeœ«‚á¹kIúŠŸiXZ7“Å¡=^*WþwètM»ÿ÷
â;‘”®‰Ÿó¹N€à3‡QÙ\wãçç\®3?ÔåÖÂ6 ƒÇUƒ9‹«ò¦‰ Dq—UHÞ$ºN{ù®XTŸ?/Þëa¡p P:D)DÂ~bÕ¸òÙ¦ñ[*ÿmºhï¶œ~t·”ƒ•Ùm	Gaæ|“|Ø|èèê;ÈÂo†W¿´è_Æ‘4-UêåÓ_ýÞçôš‰’¹èfé×2s:­²äÊ<„Ýf ˜U1<Utýý‘øTfŒBC:Ÿ ÿ•¾»CÕj“pÝ’÷û~“ÙWïxîÇ~èûm?’à9ˆÑ••(þà„î|:Í­ìã]Ò>>n³¶ðñ«»$ìl%HÐ}ƒCEˆyÅ¨˜,'²s¬é†RBd8:e)gº½ÄöSçØ+nM
9^æ((Ø+…Q	Õ1«LÛDÒüÎÀoCÌ¤ÎFtÞÆ0dÏÄ²»½ÊÚ§i?‡_€UòCîæ2g-Çy“\yÆOisÉÇtÉ|Ž~6v¾…iÄhˆ¹}ßé‰!¦šGJWN}&eÎG‹vÍŽ'­³%¯´6… sÊ¤µ7è÷Ú)hJB¶]ƒ”'ý~Æ ´’ØBi˜L{Ijá!CÎ|™Ð"…ó*°ì†[]ÿókCØ¹éíckO»xR«ôõW¢tº?vepI(“³×D*÷ébÿã.Y%_ý¡{R‰&}îP‹€%VògtÛ†24?Ùgw¤ÆÐ€m¨_#!zêuŠÃ'ô4¸þþj\^ýk·U‰ü{žôÀ£ÈŽé9ÈÈÊ|˜¦ÔÜiQŸgâÂöF‰´ pÏXRÂ–:iôÿ’JÎEé³_‹i	jIÎMÚè²¿Sò³URŽS²Ë»ft# ’ÊÐhF Ä
ÒHïXDCŽ˜àF^ûy»ë´½nÓé—N\TLÜ$†Ï9–w’?r<ªÝQý|±t¤Ãx4Mù½~Ð£Ó­»ïuÚöˆ7gó¹Û­37àÇÜqÖþ?   ÿÿì}{oÇµçW©ë„Ã„¯áC¢¸$µ)K‚VDÊv VÏLs¦¡™îÉtH†!°vƒØÈöÁîµã5¼yÎ½¾‹‹ˆò~“­SÕÕ]Ý]ÝuªgH¬iÀg¦»ªºêÔ©S§~çwŽ…wÄ,'Ó3¤Â)Y|Žj>ˆI@ýÊ´ø›…”ŠˆAmè¶j@ø‘ÿu"Šà?ZÓBRòJ«ÑÒž†2å'$)¹Nž’5]5O_~Òª¥¦@hX! ´ë;¥C'Ç"ñè”u‚#€Íèt­B´Ð¢¨ðnÌ®\‰=@²[(”¬Å´·ŸâA›EHÙçñ€ ²öì“¥DY¢U· N^+[(º*,‰ZÝë©­°diGta§%Æ6 ø"bþµ¹–¼M'1üR•+Ä–ÏÂèø½X>¨/¤]ÄáøÛ<d=jg(âQ}\	¢]èdui	)`iE<KEêÞˆ+ zY<ã»=âˆÂûô'ì·ë$2äx×U!h_îËi > úDÇ‡Qö,ìþ9‹±—F 	Só‡í{¿sW„_$NAß÷ú³=Ïa«wïˆg¥BQ5Œ ¢¶|´l:Ä§[IðÈ ]k[Br2<MH¬4Äxž7ÝôOË5Y¹V¯§Úª·’1ö×÷ÞV¦¡wð¸É=°§»ç/¾é‘ÃóÏÇ–ÛðîÒÿne¶¼ÕçkdŠ'wš"¿ SV#XögŸ‡*N‰3ûGR9ÕçÅÆé8í¥>e<áµI.äˆL¼ä¡–¸QÚ‡çî|Œ;•8vÅï~åñ–I¾†(,•Êæ;ôõÏO?Á–7ê­wÁOÊßàH˜Ó“]Z8 í°G½ú„ ?±³|¡Ñª«œO[é[ZCCøY&ßm®Eé°èß…@~øÜ­æˆ4´N¸Õ:Zžëià`®~®lÞ 4à€…´ü†øÌ*BªÉsŸÈ2©?%0°¸çBÉ¸çøR5ò[éAÛ,KÍ*ª8œ±pÐVÉ®“G ¥®F•wZ¤iÖì? •npQþ`-Úª~Œ±ª_“ Ž7‰x},“²âÅÂìq{7;úýøÁÔ¸½ÞÝö€<¤ÏÐïgïï;òNÑ;Êè¦¡ß°áu{VßñÇ`¥ÀÆtØF*e£Ùê5`›6ƒžà·‚ÂO™ÿ»2·¥²³ ‚èñb¼Ø”Æ:½'!mŸ,-2¦úBðx,²¬sšê‰Æ]‹ÐJ½@{öÉ2§·ÃSéÈY˜LHùµÐ5‹ÊöâB¦ïä ¢\ôfø1§£±á÷ÊãÇÚ‚”J Š¡D†â÷ý%Í¦èùöRÖ¥’ÞÔ^SMµïw±„+ÏæÈxZŸo/!›ÒSYqA‚\q•{žß8¤Æl°–œ}·Íò„uÏO?DÓÎOÿ…Ôé¤Cok0ËÎ¢o¸X0ü>‚|¨ßŒ†å«Al&°«-úá‹§OåÅÎ­Ïk½Ùì5qC‹ºG²^F†4ø1!yC‰nžoFfL…sFŸt>lÏ-'¸o÷[ÊÔuòò¸" ÚÊ­†FÈPò¥Ý–D·fgœœÂR9ë¤u[çíÊfÂoÄV›ÈOtLInˆ)*ÒÙ{…#‰Þ+6cpãT¼›~Uˆ’üÊR®r'BH¹(Q³;gqHÿÄÚÄÝ	\ö0‹Qn²åç¥F{Û“ý ‹jw†8ÍÃilÆ¹E"ã‹¶s 3àðvJ£Ã«'Ì"C¦5…MÁ"ÿ¥ú™»„øÁ°µ³$'-öÛ6¢¬*ÉÌïÃ>VY7œ˜Ð°†œB¨5ÚY£IÇ©ãpSz+Ú*5€I™¨ÛtÆ{x—ÂT]aú•ð†ñÈö{žëÓ]ì,ÇžU§´7*Tæ~P!mÌ ðnå¢…p'!l¥ 
Rì*Ø·;ôËjÜô[Ž²x½5R[˜!,\{,Ñ?!sæY¤Õ½ ðºkäÊ8äRµMk±}ÇrY¬Šô½göŽE§œµoT–ÈR… ·£Ó°:ÇûVÇ·OÂÛ6*ÿ°_Û_Ù¿†æÄXëÐñ±D$Ð#w©²¨¸tÄÐô%­z5j,ò9ÈLTö9š}§Ó¡«Ð?\Y¾º¼ZŸša³t×ù¹Í>½góQnÈtì(ö9ô>š6“åÍÝ8ž]^Á>zdËm´½þFÅv›Xæ–Pà¯ ›†•“Ÿ29ÉefŒÒmÙZª¯vþÞùð$§|£½KËc²jÑªzMÑ=ÏëNÍ®Óàn„ãê1á.“Ò³Ž:žÕ¤s™²'†i	xb^ ßÂâ¤?C£Ç,WÄC¾
üËÅø¢äBNM"‘g˜ÑRS¹vºðƒã’}«Éþý¹çuáßæ Ï( º&ç™kÝ:Ø#õ˜x¤^ÖSP\?í°:6‘ÉÁ°ÞƒLE¹v¾.‰Ú²L˜*IŽ™Äž ÷»©¦˜Òc9{Eìî,y‹ÂÌZººZîµm×ˆË¸½M-ÜLC™µëh¬Ý²ÛæÂš1öõu(ª9`fz;a¬ëŒåÞƒ•°ÓÑÌEÇ±½Ü›scX£9Ý¸r¢^ünÑ¹¦ÂGGg&_Ò¶YúÖÆQµ7÷Üs4ºÁÂÙ†®¬ÄC9mðYmà
×O—Ît£Ì†3²­;Û§˜š`6ùÅóM÷TàééKäKìÌêsßè‘pÛsœÝà›—òÛ7/™<ÙôÐ¡Tk.Ï„&o¶)3rt_(>ƒy¼¿¿?…0~q£r'ªøJªøÃâ˜GÍ´Ð\Û8®Q=\ªˆ6ÛÓwfT1øBS§±Öç£-<ÆŸ¡p!\Œ#EQKÓE„<@Â¥&êZA²éjÓ¾œô.Âå•>\SØ®¥ñ—Ô’¯U6ïŸŸ~Ù ›Á³?¤c*¤1›ë`50E‡ ƒ-ö£û6Ýi6­þsŽ3æX}fzùŠ¢LÊ2%À¢F
SŠšzÚL´E‰Ÿ‡’Ü…,ùŽß*î·x“%Ãá›×4AóÕ…ÖµI‰›ÒE
I—‰•"‹ EË}vÄ²(ÓŒ§,†7Y”úmLeQ»½&‚(àæã+‰ ~ÌDQî¹1•ÅøÔ÷b¤»Dß÷šLÛç/¾ì1¤Â§¯ŸÁC@Y`phpAÐòXé‡›Ù–Vy+_­ŽÐ÷ ˆ9ÌÓ‚SúuD„Ë+·KCÀùøË¥hè˜Š¦Üã*ZòÀÔ5ÊCÆ_@ÃvŽ©|J½(¥£Ê“P)Áäei‹ñúšZ:ø÷†U-¹œÂ(‡yEdÀ»ÈËÞ·;Ö¡­‹D•®Æˆ2‹¼üØÆ¿ 6\–‚¥’Étgâ$y.y~ö©GÁÃ.OJˆS+9‡RŒehó*¾¥ð÷¢é¯á9.f¿ŽîS„‰dÂá @Ä(ú1T#œâ
-ŠCŽà¶¾íu{žÏ85b€[.¬mQk[–`m«8XÛåAÚðp6s([[
¾†D«"ÕJí*êî5N[ÅUD„Ué‹à°8ÅNÃk?m*µ;í6ý†…; OŒY9¿ø(D SÓO>À”‚:‘kÒžGÀ1Óà§Øip7ÞinT`rcFðUÍ‚ÚBýÚj-9‘³  YøŠz›çE<áõ©}ðƒYüS¯jVë+ý+ã9H	hhù\ß¦Æ¦×ßÏož„ŒKòkí¯î[û)$"jýžÝ‚´¾ˆwkÞVÇiÑñ¥‹.n%â·sq@-ô}÷š£áôÜzwÐ·`+µ+€b=«	–ñpíŸZ¢Pb¨§j‹Ñ7Û»‚V£ú‰xIê4”ì%‘.FöCHÖ‚y†\*Ò¹!ê©ÈZ°­ûšÁ3!¢e5ÿ2VÙ
YÁõDEYš‰¦oërîG`D>÷h!ß;`Xl@iÃ# Ì†Òpš$Øì«ñ#Zë1Âyà.DÖ#ÁYð‚+Q€ P™åË6ê‰>Ýxüã'Wf ÔD· ¤§nõAm/a%}"mÉË\µâ×žat«àšÂËh|øh¦[¹åb®[—P§€	JÆRˆT™àDÕª.­ð¯Ï'|":w–!ZPËrRÞ¥"?*ãÉZYøÞx²Â.ÉÓÔ:´jVñõª=ZÍ£ãÚ‚±óÕqŒ&ê­Rî/Ì3ÂÿUÓ'Ò|S=ãìC˜8z„Gdåš½PÏAš8z&Žž¼kâè™8zøîÃiJ{0ÓfUü2ñó˜úyöÏÃûy—'Â–¹&nžü+Þx1»åRÝ<‘©ô†ºyÆBö_[/‚ú‡+ñÂÇ³8qñ_åâÁê<æâ™ a¤gäžµË«×®çÖ{â	i©¾º8®N¬‰dâÉ»&þ‘‰Dy:ûˆY](Ì.¾pO 0ìgy{ã½$Üz¹T/Id0½¡^’qÿ±r”˜¹Jr²I%Òÿ¬ú ?`­J ü¾×ñs³†mq2>øOæœX]Ðúhæ¯DnÇuµa“8>Ò%½‹FÍñY>ÏG¯ÔÛ`ºí³o»k8vLåõfæVâÎ„nZYma(æñQÚ—Aja“=ru¶”ÇLtm·)§²¶:h¢
î—ŒSh%ÓcG¬±é8ëdœ5&šÏM¦©„…â"Éˆuâbd)Å,1.â„&“xE"5
Úˆ‹(šˆ‹¨$Ä¸Èž÷+P¨`~ý-HÒþ^C0µ~ÇÝ÷R»9ü?îz$õ~¡©RÈŽ“D¤²ÿÒÐ}™ôÎ_ümëˆýð[‡¥gmð+†¸gŸa,}Rb-ù,˜±»ƒn—Îar÷á²mõ›¦Fl†¬ÖïJdµ‹¤Ó’>.ãò gÈ?âÃÇ%£RŠÄš‹;Xº eÙïÐÛN³	V5*³Vºutáu´5G­H~¢8	Á–ˆG7Npé#YÙ³œ	ÆoXÚÐÚ‚¬]ØŸàÂÇ˜š{}ÛÏòã^Rèky‚þ/™©³™Ã°x§ärìˆô{œï¤ñò#—““ÔY&d-éHæ¨ÓŠ:à“ÁòÒ)^	vNùé3é‹NŒ–Ö‹è$z®o7»Zµð(ðTôù1©Âç9ŸJˆ,Ó3ô?ý‚€ËWœ‹ •da¸
axû*”¥î¹I(	•ª}µ‘PžÀ‰E:ŒS‡+Ý/\ª^Ï_ü¡Sí Î'IÞòìüôÛ‘-y½6”^{ÚXvP Ó$†­1UkrVðŒ	D£Ø‰s³ºHæ‹µQ¿kQùéÛÖ30S]N1RNM…žæXQi5U	¯Ör?Äê+'[Î0k*KýÊR½Æ^ò	W«í°üÄ_ë6m52.jäõ0$þ7ÂÉ·öœ®ï8lûÛoÂÆö¤úÝ7ç§¿£‚yöµÛžf»Ë)L†/œî‰ö¯¯\ñpÁ«Ð;b#+ÄK‡J7âŸ¸"!yðÝ_H¼=ÏªE&ºCÑºW¡;nX}&ˆKêÃ‚ôrc¬?¶=?˜ß¥=Aª{7¦G6ý£×jþW«èãONÌxt°Ë6Dd$Û)Ì©T7tgéªð°QÍ!œôÚ›dªù”â¼oí96w«q+ç¥Ç¦§Aý/P}3¥¯ödºzy:”’©ÝŽPûªLëg¦ÖØ<©1Â%8-…~Õ8Ô˜pø„aÁÍ\iâì¹¦s]@5;Žôú 4yèØ¼^MÙ:%„ÿj´<YZ„±2]äìŒ^| ®j+«Èc’j®ßcIxGwÊ,˜ët—)xm´ó6z¬¥|Oâœ N
/»—Ë'\Ñ°iùˆ·Û…¶þ+Ø ß9ðÏ]£éßX¡Õ))6wS‡þiµI½‰vãœ»â>–£qö-yFŸ€÷bègb¬ÆEuQ¥›TŠzà^Gû»¿ ²ª&=2Î­Vì_Œ¶áreH>C:±Ù:Ã²?6gˆcû1/‡mOb7O¥-2g‰ÚÁf-©l7†É$%±¢Bð›dWmÆÙU‡©¶ ]mê5‘u°Êll¦°‘t½«f¥#²BfêÜþøqß&5jü8k¦çïm‡jjmúäØ—EçˆÁæoÅäg³¸2ÌmqYs£×ø³ÊŒ6xI‡™ˆRÜŽ<—‘l¦{¢Œ¯ uzt×=†ãp†+˜Øâü:«ØÇ"ä+z\þYì,ÌSÆÔ²éC¶qªFò’õm›
ÓÌOôÏÙ·ŽY1'OO8ü˜Î³käÖÆæi^Ÿ§o‚´D²Q¨Põ8ÜÎ0U;Ýgà±¯pþ•—XQJüç\Çv[A{Ú ÈÄÞ.±¯ËêS*Tº“TªIÎi^è~@ nj5lù“…bÎÛ’§©MêwfyïvÉg¡éŸ/¥D×qgA™r²8žñ×žu\²o5Ù¿?÷¼.üÛÓØÒ8—=>Ò“°'Ù…õò¶M~í´CHÜ_aOÁ¢R‰1ãuj…´Øo,Õó‘$@ˆ1›ëÈp¹Lsr½GjwQÒ0ÉìxŽ¥æ™šcQ“J¥ÏÛ—¢lŸtZèƒý´‰˜ž²F¶ba£™R¶Æ89#\Žðú}ƒÝÏ­ÞÃ.Ç˜µÊfd7†jçä"»Û^Îx?b æðÉ BuèÒ‰-™5QÙR{	Æ·h=JÜ×xË¦µRÅL…å¦8C¿{õ®%ÐæWJyÔ£Â@
Œ±?”Rº ‡J8úmpé z|ZŸÄ³G‹²{$9ç>ÌlA;Å´G!j?“€	íy=îªzùÉw´ÁÏÏOvýÈY²‚³û/œ§§Óò} Bœ	óaˆ…<Bú„p]°YÐ&L"EPÂJ6EÏ²”Ü#R´7yÆjÅ®6ß‘ 	£‰„´"Ç¼ÀaûoGòE¿†Ý§–Cðç._f/ŠÓ¦‘÷á…úµ–eŽîWäÊRq1±ØØ´Pò1Õb>¦ZÄÇT“ø˜ptL¼—EÉÄjCÓ2ÁeNÍW~¸ÊpÔˆçdB—kËÖR}5ÅÄ$.¹Š$.áWHÏ=:S›V¡LWeú ÄË]á/W@¹ƒne’V§ˆ:'æÜ‰cžvl:K;vSæß!7F’A[±h¯î/˜ÑV,Ï@lfOSûøÄí»!ÖG	k‡$K„Ë¦³A•W]¦/—Û%’_ÀÝ˜HïþêÕÚUÃüCéÍ{x"½‰ÍózÐ¾äêíK”Õó¥}™LÀüé‰5à«á¼ZwìÏ¸d1e~]²µ†uÌÝ}¹îÙÐM£pÍî°±X–Æù‹¯\Ò?ûŒø4¹sþâsp¶„`Dx£ ÀE—<k[Î…{f3î+Ôtâ’ÕÖ:ñ)~/|ŠK+¯Þ§(¢rBw¢ë±•qâFœ¸ßX7âÄƒ8¤æuÌ4Ùª¯7Ïƒ8‘Þ7JzÁ|FÐ+÷]ho(¸ƒ!Íz' {V¼ec$I7€ÿ÷ê¸xIV©­eanZ'
Ð¢%¼(ÜEPQÉ;’y¾ ’p³ïõ€= ¯ÏŽÖyÛ¶À##‡nÕ9åoŒ+™‚¶bhs"Æn[bsMø{N@û¼‡›‡ÜN ½®¡aÚ¹4.À¸R†Dˆ_78‰„€C“I3¥çç“½„ÜQ‹*åÏ“qìídþ.£ê0<Ó€4†#Œ¾8‘:©Éè‹Œl[ÏÔ´là‰È23%šñ‡³Ö ðÐÊ4QVŸøvÏ¢]¨:ð2D_²¢³j#EîÃöã($Õø9Ph`Ó¶e+{ä$ÜŒ…ƒÖÇ87èû@G«C/LÃ>â—3‹vHÑ†§ü4½Îì*gö8˜­]á¿†z(·Ù„M1¾¹@:+›»{{Œ”ž·°ä{<EFÕ	üÀÞŸ[ˆ³¡}H¢‘ŒO$J®âu‘ÑË±þ²þÚ¥[µ×·Ÿ³Ð»cˆ¦£Æ-øBèþ»éô©9HÛ¹Fà–9ú#·Ùï,z¾Žnã?Z~ƒyái5˜“}q‚ªã—aŒÎóiÿòòcº 9½Ïi×·ú}ïàqoÇ;p“Ë"c7K˜`U£÷0õx=çÊŠXc™ñR¦MÈ á¹Þ¥L î³)šBá¯Õ$,ä˜+7¡¤ÜdŠ)T'séKà?*šIì÷7lÅNœ@s2—†›Kb÷wUÌ¦p¤
§Sì=@Ì'É™ ˜QI_ÄâÂ¥L,¶-šYü†×rjeöí5-#TGÍ«2ÑIÑ½q3±N½î+DM-qËk9¹Ê¯[õódj;µ…nj^õúÂ“7¹Bâ]ÄÌbwæN«°œK›SžS8ŸèÏoØ\zôÎÜ$2ÉÙ“|‹K™AáC¼´v^rÐšx‹oxÍ#l%J?=£¬‚qœ!NóÐƒ‰SQI%L8§-'¥e…Fy æãßcþ¢EÎC‹ ¡MVèøïÐ©ƒ3}'kfsO¾ÔÌH±ÛHþ8ébóbâ—œ—Œ‘Zèº˜pIoŒÌ/- RŠÉWJ×™pkÁUöüž«Áù½¸çøåŠBR¿ðËP'1QbÌoòÁ?ôŽf—€ç"I`6MSnÁpúð¢²	òG~Lj'¡ÒšGÒboª(\YÒí é0²Å›?…mV™±Ò'ÐùÔSÙI®°Ÿf%…¢ £ò]–‹_Ç	Km3Î8éEC$!ÆÏôÊ¦,éñ°¬òeÄíÙ£¦e‹¢Ërðì†ÇA`#ñ¿¹lulªg Wf+y”›É;s8šDxuoà6lc‹&Uÿ|òGÑYŠSñ"_€,HÑ–Q%Õ“pö‡´xÑõ.;¿
’‰PRÔl±Y0+›F6r¦Oæ“2„@Ï-ÑQc†›^¥:¤{Ð(¡… 8÷Œ)’å•ì÷é[\w6
Ú,„åC~Î.i9ÖSj²æÝÙaWr’¡öR)ÁRÔŠeøûFj7È{ýØÞIeÇU=×y#jŒ•Y9ïÅ\m[ŸªËñjªæ¥—t‘f•Þ¦C•«àgðEŒ_h•³9zM¤˜®Dé£+9ˆ¶šXwdW¬4òBÔ;d1^+Ö­„áóíŸO0YE2¯ˆ¶%º„y¦Îh2ÕÂ-þ¨çZ%íÉþ"™×T5oeèæqßsNGÂYË;r57uS""0eÞÃ¶;šƒö`þ]HvyzÛÜ›eÀØz‚f&»‹/ÕÌEe´¯á"ú¶ç ¥äNYU©¡ ÙÉ“rG¢Òp~ÈÏëìö,ºZ<Q¹!®¤i¢éJL—Õ„ «þÓƒ[dûüôŸé?·ïœŸþ·Çä'Ï_üžÜ½óà6ÙygëÁíµÕxWr<)
Ó¢Î“Ž¤´JžŠÒ|Iùy&ÂË{=Åû$v#z90>.îÕb›BÏ&‘)6—h*dON¯RÜþjrS,J¨]éÛÔ„Àï
|u§Eú0]ù?²¡Ã¾ðö÷}›e	Rj5í@±‡X¾pÂóv—0GØ›«Ý¯)YxYŠ7Üâ&§èf0žˆŸhä˜mi²Š'£4SS•EIÐû‘LÖÐN»pUÚjÃÏYULPª³Äy1ç!ªYn»¸„h©¶”<¸Ž‡Ó¤Ì2)åã¸N†2O†[Êµ|,Èg‚'‡%<å†+GÅFz6§o#®Ì†’!ˆ•M8ÐæªmÜ5Y#?|†ÅØÇPö~XòHãÀP[~+‚ƒ‹‡j-®‘^7ú‹òt‰ª@Ñ(I¢~Æ8HÞÂ @´àìFŠôHâCø¹PÓdø(QÍ9Îˆ"D%ZžIdè$2túšF††u:¾0ÌKŒÓ-)
sÈ†¿&A¡“ PÍc¯rÉ1	µáJ	1Â=Ž: Ü]R(À$ 4{íñ8PØ7}ß£­/Ëy2Æó=çì.ùÙÀr¿W‘òþr“ ƒ¡Bå9	.@^¯ap]8'Ñ“è‚2í›D”®`]0‰.@–4‰.ÀF@ö8…iÑd|þÚ•Na&@üï?Ô+óWðôDÝvŽ­/{¢~Q æ4\ÞRÂ©aYy£h¬#Õ1/¨Ðš©—ŸœŸ~êDA4ÌM¡Œ–Ae%’úÂÈVj8Ç­<Ge}]
Ìlô2j¬ðr+Üž]\Nœ†¥tn‘´²¡î¿ø2€$Q_¤¹’ÒAÀ~9 ÿœ}Qú8=zÓË‘‹B¾«„Äï^€v1#*¤û¢9€$Yç¨1îx„ûJážÎ^v•ï™Þ¸¸Ò÷íÛß}³EÞ>ûåÙ½SÛŽYªWðÈvšT–—ËÀ³¿Ræ4Xv£Ã®±ZRÄ`¥O½Ÿé¢À³—Aºâ	uD11¤i“Q:É2(q©QC †oZó®…ˆÆë`>“IÝ`[!ï%Ì1 eO'.zñ*ý|=Ÿ¥kd-÷5uñ›Ô¿Š)ês²ämòõ;á,h2çãQû1'Oªˆ‹×žT‚Ãþ({U^~òò#·EžýM“iÔä}tÎÓuî’+:!ÉêÃ‚›}È»T¡*®è¦„¼šµ0äÀ™l´ ’I2ÚÙQGg*mËmvì›‡pVñ¶Ó¡e7¹Ö/š˜MÇ‡	ÙÜ8æ+??ìxÏ	Ú[``E;A¾É/©pfÑöØ»½¾m5ý¶mª3Þn¶¦q_¾?`ûƒ›‡*l'Ð9?ýÇFÁŒå‚_æqÕñ·š]Ç%¿øqüû^“ÿ±Õhx7 2­3«×5jG/‹pÉ#\(™„K'—!÷¿$–á7	©Œ2èàY€Äÿµ¤½¾
ãŽcu¼Ö;=Û­‚Ë\»jÄê„%…q+Åê–Žti_£_”RZJxßý!bæ°Sý)õp€Â&’ÓÒi°ˆðâ±¢¹·xÃ£’óU¤ž»í³fïóÓ/éÖÿüôOäøXÐùšY7;Ù]ã>ÄIFÊ@N•£§×â7g;vÇl„‡+ž$>}¬Õ§‰ÕßpiÍ­½¾å·‹Ä‰¼ö­Å•3„xþ£Kª¹M:™~Ûúþ 'w—!$†Ï}«Ó1÷ýä’?ÊQ/:•T~yñ†Þõý”«™
ìø¢ŸRª=>l§v‘åÊ·§5[9D£°7p›85í`öÉJ¬µšÃ$DaÆRaó–‘ãuÇíþ)8êÑ¢m»ñ¬î¢ò³f% 9îK(Ä(«S«Žsæ,íÄœ_6us™_T©PuÒ²©ffnµç«O«œß Ÿº•šz»é—­¦ß°{uhQPTØ\«‰5TCž|0f‰]ÑÓNcáqÛ’hG)¨ÐÕævÿi;©FEñ^*šý>bT´vXF7Ÿ"±Í&á¨d½HÙz…Çéö:v—I‘É·½¶¢ô €¥ÿå$NÒ'’uA’%pRA^W‰ÚØŒïŸIçpã!OVÌã"q
ï;i*äs¡¡q$\JéÑ¾kÀ4&ÚnŸýÑmƒSüWö¨Û´-Bò™Îh·ŽúØk[	¨pÉUMÌÉ'2„	¶tÜ³ZŽkE›ìy
‹_ªÇÁKÅæ6ÃB`ß$cLÇmtTWTÙ‹*ŽŠ”ûh‰N³5ºû²Xc¶yÌýÈ4PxoÞ·V*ZP»žâ/ƒØT@v+›ÇU~õÐjÙd–Ô¦ÉÈâù1)r2"g…ür˜Sp¼o¢”wbdþ‰BER€p(¶’.‡a9»}±?™››ƒ¿g˜¿ë0ö8hZÁÖtî	©:Mø†þÿ?Ñ•ÝÄ	‚óL cÍQ"sM/"j!g ˆ#`×ßê=©ÏÁ_wšÀÄåð¸$tÃ
«Šö¼=uáá¿Jø!z›ð3<_L=˜ßšQåÜôMiÜˆÐðâ\áÏÞ=¯auìÝ ÎA«ÓÀÚ4l3Øý‚v·Žó×¡)ùp½iÅÔ	†a?Q…òuq~º±ìhíDöE5*r6aL¿ŠŽÉ‹Þa¡´/¾Ý¿ÙµœÎ+^öKã¬Õ«,sò S\üìÒix.Ò²ÎH[m*èÇ‡ŸWÉý/œäï˜p“Ñë!KOí¸ù1) Gn6pó]­£,àÒÛ¨ìžŸ~mÉ@5œÍ„OBÛ“Ã°!èøLÜÙwt÷÷B4"âÅa$CFM0ûu&¹ÚšJ
;Ñ¾8AÉ*.RR`ãÑ™~8Üq±#«Ù WæèX(Ìßñï€ièZÝÀÚß§+ñ*]|¯œäís{Gý!mk!å¶Hpögjæ¶Ï_|y‰¤¾!çüôWˆfú+iŸŸ~ÑC÷;²[ó{s¤„"bŽ
âŒbš‰œ¤‹
v›‹éb³ý
úåìÐK1ªyðè¤×£ ÄH;51Hk—b¡!cpÓˆÒ«¨è°thOžÌ…ùTYœOhÙÒq[˜ÉÎ«¶Õöœ®G­Øö3ð¦/ÓÑ¬é9´^QF¡O—Ùñæ#êÄqí>ÉÊõb¡¼d)¤Û±‹m”bdµ^ÔÐ›Ü©É´ëdºådsÄ"2¦© XX ä+°­€Oþ!?€3½8Äû„gaèÐ®É%˜7f`ÖÐ,d±Éªºð?È›—XÌÉª¦Œ=å<ö·o¹~ÁŒ¤Ö.5„Žc/ÿ	©ÞæˆjþðãŸÀ“~ÉêÎ“ÖBƒvx¦p_U RÜyÁ½š¸àž8B•Œ¡‚RÒ1=ì@ôN­hNçmÃÓÕ|uß
Ús]ë°Z›!=vBS $
gâvÛ~Þ÷Ü{ö~*h™´AB ˜KLÐ‡£Çßéó}Ê\k|}ƒHƒgÃuNÜJ/5ßDýˆã1#ÝÑ„¡è†¶Ú;ç‡ÂhRUüh*$4õ¨ýÇ>U3÷-—v+œ2@Z…ž/X•¬u©Z*·íPp—ú‰°nBªNÔ„KW’}ªÎ;mö½ƒrIBŠ)÷â´!›?@ÞÒ9û[kžý2ñ ’f°‚vl¿Ñwz°(o>lÃbó³ÁÑùé/]òüì3ÒxTÄaÓh{tAÊÖ#—1ŠEªow«9˜½RD´¾k[ýF;ŒV÷½Î °I‡jU@×x½ÙÚü"áÁfLÙ±/ÄÜ3€ß¬ïØœa®yGwÀÝ£¶»Ýö:T66*{àôHöÛÜÜ6¶×DíÙkE’Ëÿ1È?ïÞ©©Ê{Œx$·O
õŽ.ûÈ:"lýRô!)É ”œ¼!£õÇ$AFáCSKe¼kPöìßÊ=4¯¤JÕÁ¿Ñ%ìîÎt¹R"|%Ó"UÐ÷½f¹ÂŒ°P£Û&aã‘ôÄEÇV§sÍ×¼²ÀH*j0gÃé;Ÿâ'”vÛòíêtQ©Æó^yç4|KË‚àÚè´}ˆâtûf†îèa]`× €]ß¼©ˆU{î˜&HIP+'»v0GVºE}ÍIRç/¾îqöÅ €x¢5?Kf/ÊZb‡ÇÅØÒGb<@5„;ò+Ý\ßëðÎiBR{î»ð|Ó¢¥Içf{MÚ“0KÑÂ«vrFo™¡CJ»Þi¹v3äÓö¡ê' NÒcÌ{Aðê&Ãk,.Dqµ‡Ee¹ì½ñçi‰Æ½€!­køÔj'+Þôìþ‡ì*›»ð°hÜ;DñaÁ£,²ë5+›tmU£½Oeóîù‹¿S+–® #*¼ÕlZ•Í[;;[¤zË9û¼Ëh?iDáÓ#«èÃgmÏ¡u½ü˜Üm3¯V²Fþåèê{Öd•ÝÝI×±$Žª.Ð> ½þùé°QÑ Î*› „ÌOÌAñÈ«^ÀÚ€GàÅÁü,µ&DøÈ²‹ÁñøK¹(°äÑ¢€Q@“üèÔÀ5ZTªé@WÃ…•ÐPµ6Åšø»X7e~Í’½_ÌÅíL?(¾ÖœšFQÑ°,&Íbè2ÒµèÇÙ'KF„¬ëœ¦{{ô@7>éÛ.8Ž\)KÚn¤Cò:;¹ ÂbD¶+áÍ©g­šëÂ“
Gdj’Ä‹Ï'ÞÜ¸Çù~w-µe³Q“Š5IÈ“z”ûÎneü_[_ØÛòce*D8Ñò.£Y‹Tq]‡£±a„ÄQwtÏ>ƒý|l¢÷ì³#z×·‘ñÐîÎM™gL_ËÑ!#m{´rç4»D««x7²Wyù	ËäÐ Õï]R??ý-ùî/„Y°„‹¸Ôå÷³ UGêgŸ{ð€7gLt>ÔT›ÏúôÒê;MÿO×žoôQ[è£ØÑxÄ²—a¹ñ<®‡ñ˜(›Îœ'½TTœâ¬—Ÿ†Ð¥ƒ¥É†÷j§U&QAØWò*–¼œæÆñSèÍÙ·¸‰þË:Ä0;¿¢¸0Õ
ùÉzøÈ°äU:N,ÕJ–Æ­Á =Á-ÏIašòK.Ý¥6-:œVfˆàºÎ¢ÑÂ&ÏèÁJµ&Þ\xL«N3a¾‡ñe½2YÏøUàâú|†õO©ÒÒ¡‰øHdßkü5èýj˜ì®ù”BúÜvÐí¼íõsçfÆ§é‡ àj4y3ëÍ³lÂEktÑ;ÃÄ›söæ?fœéÆ,™©abq4uÏÍ›ìÐmÂQw²"®ï8ïFeóÁüÞ÷èð’›íIÀ”æJ!ƒ21rTLÌ‹U^¥³lúv°Åˆ1éPV§˜¯xÊ@ÁÃãðÌî Î4À°€{^V›·Ãƒ@¾Ã4.‚»ÔªSøÊÑK’¢¶¾ñÜÒñ:ñyÀ|®Ÿº­Ç)H|½q@Mî±'+5Œg›Ñ¤ðy¤/47Žd1²z¸,â%†í‰clÎh×vl÷ù V[Xý/-øz®áuQ;EäÈ©âÉLD/(Èüxˆ82EE±¥€
lÒä Ð"{
ìˆ¼,…É#è¥¾)Æ¼žA!ªÑ‚L7¿9hÁ¬ÕÉI©t $Í~~ú+Nÿ¤$²0kæçÃçcKß4[ð^ÛöHóìÿ9@G%q0ÇUÐ¶ŽØÂô['vÇÎùé¯,wÍ×©%¬hŠñŒBIH˜”µB—í¢&6j<}a<G{à]«fÿþ†þ[§Iy»4Â×&ø¹D&–Fz¬SŽÔ‡$©¬¢ó¯òÜMÒp)F'“‹¾”’ï4I¹–n÷m*òÛà>a»ÙêÔË!ê£Kž%’Ð¾¢BûïnkªPÉË!nð`ÊÇ½’š	s+š…sÎŠlö}
Ä¬0¶ÒGx97H*áEM‘@¤„$qÚ=r[5î‘Ùl¡¢ÀêÉ–<ø0‚„6©Òuçµëìý¾í··òåŒÈ¹D4B§w!`3îhå»p"Åq¤©ïì3—ÿ‰È ‚˜9ÈøÂuð’añFÀx4žÜÌ;;3dÛët8ë§!¯ÄÈÓÿÌ>YäÿòÁ†l©á¦^„*éˆ­tñ%ª¿‡y¦0Þ§Ø¦Á1qcÁIÖ’v("òAˆQç.`;WÃ–a‰	™ˆ‰ž9·hl560@,šàUÐ¯Nlµ(Io: ‹Ù:¸ÎÏv86ü0Ü%#pÓR»ØáG!‰àŸ66Û&Ý¾ÙszLYV‚!,¼P‚¥†“àZ=”•à{°pBÛ²³­ð¶érÕ›¼œ(J~ïÑ½›¬lj
þlKX÷¡ÊÝ¹yï&Ì8ˆ¤½ÛP…îþtwïæýÊæíÄÆWàÈfÁÈ‚§+ál~DRÚ˜áWsà‡³W8…ðŠ,‘Æ€nº³toI×éºÕ/˜!c³6}jÆÚÕ…Bgú=§ëÓLßÑO:mãèÍi„C‹NÖ‰Â%§Xý€íX—Iov%šÕ‹9&òöæ……{N&ÀÐÓÓi…Ÿ6Ô5b%Bu:ßHsÐgœŒ–V#ªé‚d»~»ï¸Ï
Æ5çéã§‘U$ÅÍå3'„ßÒ–ÀPX9ûö£›[{7?{±hKç*€Á¨âŸ®Ï±!ö!
¼Þò!ƒNEìÍ	™RU?~¸#½Xx‚ž<b§åËõÏ‡Û·onß}øÎ{¢«[§"'ªàŸuL%8ýü0:àŽ83Ð×v~rwµBåŽm«0½ž;â×ÕÙö†+<Ó,EáhþáÖ½{¬ü‚¤qR=æÕÜ¹ÿðG{Þx¼sëæÞ.«
öº{#¬C)£jWÑPõìÜ¼ùðÃ°²G7w÷ÞyÄÇ&Ç] ÏúwßËùYOÜƒÈ¢ ¿Eá'•­˜]Ç=0×ÝÆ©¬‹=ãê:D+éš…&¤Þ!­/÷agéë˜9ó¿µ9á¸yºuÚIˆu.ÜZ9Ô%'/Jã«ª(¹àDm€ÃÔ¯Xuj	d×UÜ’ *[³ôDõðMÉ|†òtU¿ Á…Z„à*Xˆ¦öÚgì’îùéïtï¬>SïŸýf«|AÒ8Êû¡a[&–Ö:²÷ÎÙ}@nœŸþ3v¤ËÉÔƒÛç/þüÜ|ûæ½Òåªeíáí;gÿZüâ÷J³jLÝ½}öOwÈCº±û?ÛÐÏñs€ötMºµ—=Ôì¦Ï¢ãTº'¸ú¡ÔÁ¦T«'%×–‰4ÙD‰ÄY¬´¼áBÐqÂ¨®:Fž$"âYîc,èª`>Ì`8Ÿ‹&ôáÙ·Ö%I32;ÿw—[œŽ^öWâ‚-N¨`xà{– Rµ$¡†{ëÏ·¥1¸_J4/ØˆœîF´½ácò^éI­–²+R'oxè‹.Á‹Ö’™äóvø-ŠxQÖEÓµéòßí]Ÿ¼˜Ç×‰oíÛo3VÍjâ–ðŽêôo·×ºÝ5ß'ÍæüýûóGôš‚ƒ«©¹9Lpn8P½lh‚ß$å3}=9L3ý:/¶žÔA†­
S5áœçÍ|Ó
,žq\×.ò)å56´ºñÌ?RQX<æ=¯µÖpOüuBøÜßLŽ\„.Jî3–ŒbÁD%j0„+¢SºóKêinœ€ê>z³Ü&¾e†_ìü
¿–ŽÇ¯(NÃ¯
k‘ûä²'îlêÜ‘ÎñeÙ“Õí€s2òÆEB$üu¥%,K : h¸--áŽÿÈ†ý´„áp{ÈíP…€alÂæÑÁ'ïÊp”çç§¿$t1ÿýÎzBâ&´ºÃïÎ57u!½Ú¼ðjk©àÓZöhöJRQŠœôÅ¯Ž›ì†˜d­U	fmzö®hgY–eó^Ø[‰Ü`äÇdeaÈdž HØP‚¥W•c6Ù	iœý›K:pdW”‹‘oÐeP®ñ¥l'*Áƒ’©8ÎÆ°¸^¾…]Êðè5-¿Ž*CdPºk‹pø°(›mpŠÒ=äLÝ:"ÃGr›•oJiR©"[W‘‚BÆ~Ê)(
M[ý?w1êõTß¦Z6
ÂÕ:íëAÏ C=$Š:£Æ€ž7w-t Þ:Þ[žžx¥-C’úþ€ŸKH/Q,C¥y•tóúi ¤Þ¿êEÕK˜4¶·3@íêß?ïlXŒL!¥ªb |%•Eä™”Œ2á	I8+‹ájŠ)K8‰+›÷`ìÎþ¶¦›”ƒDÈ]‡ê£Ù¦ã7ûË¡&iÓŽÜòºà¹õŽ³yƒ®.€$¾rE²_¶¨ôè˜¿øW¦G>sÈ3@ŒáŠ•™¸ë‚{ÐwxÓNßynÓ§•h[q;!Nç/þF"H$Ti«þŸ!ßù×ÁwùîsZÂùéèÿÆ„>ú'Z¤­oÉŒlØOgŸÃkýÙmÇ$ÐÐh`~<‡îi9Ôr¤=õWú¿ö€¶¹ß³	I­aÅëóƒ‚ dNÏTmGÚ\‘­ã¹·Îî‘Ow¼rBC(7\ÉÀƒVŸî­“›+þUroUd©i°jRÃÄLëæ[xø ÜEÆl	]eB’¡³_ô,F »~P±^/?æí|‰˜››ÓnK4ø9DX3¦snXýmÈ—²”“€Q?‘hi“ *`²ÉV§£#˜Ñ¾K1a
[ÅbßîÛûÇ·ÞyçÖ½›îÞ¾ysïÃÇîË=g¡Ø¨|H@÷YñÖ£ow6*®çõ Åqé.{ßî÷éæ
;³‚
fµ€Åê—Èê›„%—Ðxê²Gãi›šÉ+!‡ù@À¦/?™‹añ)»~ú/	«)™T(!ÖÐêÔ$…j£¹WètHûUðú5‹FJò^™í‰Ëì¤Rƒ’pÑH†huÇ¶©=Ð°Ü¢Éˆ:(ÓíUòw+šýŠz{$ø2Jví  kŸ“AB½EñÃ‡L=utPÝæZüq‘YÃmwÐ¾ëtÓÚOÁÔ„ÕtèkÏÞlŸì÷½nx„»cúéHxÈånÄí±P™…4FUf·±Hdšj}»ã5ž) @) ˆ­ó)êÝ’åâmc·EÀ‰B¶Á~¦ºöÅd¯ÍZTR“…íEžß,bû5©(W¤à–ÓÐK¤â?ðàÙ_S[ÿY{ {©ApÀœà ûCOl˜ÀýöC’8(•Z1ô9vö¹A&Ä8!ô×p;è¼ÉÎžUï Ó‚Š8A5H7F2kæRŽ¤¹O)Ð´±o…YÐ¤E°C;ÄÀØ‡v3	0vñ‰ý?é³µsû»ÏA–^ü=¦­sŒØ9À÷¿,f‡‹¶´õ]¯oÊó³¾Éšúøa[žì7y*0€p'´Øö~§kúèóß°×}ñÕ€=	þÝo¸ËBÝéDzÑ€ß{øÈ½ð?iÕ@ƒÙ »ö‘°¡ÎêûÙÀ
ç&©¾{ö5ì2¾\#r[äfÖVÄÍ"QÙ‘šÅ÷ýüÖZÙéWQá,P¿G?ÙÞ4ºåZžäIj$ðGÌ„ÿg_ƒƒ‚	;˜Ïj!æV©Cæ½gí³o-th¿‡òtD€I ¬QrEj‘ŠP¢´ÿä&œEIYtNÿ@:Ðwô…<Œ_¦ÐA‚ÕšhÅ–²ŠŠÍ ubÎéàO!›\!’>&NeŽÏ§ý
•ÄäÄBð¼•ŠÇe""cáâT˜î Äñ<¿Js£u¸QYÂÜ†ä1æ+žoV ë‘c#Ãl)ø°’%U#>IV‚OH|)sN%8…F(û»ÓÊX^‰ÓÍˆ#QXžØ }¸´~¦Œ¯KcÓ•Ç €ÍÃ²éî¾3»¤@†ô‡³ösúÙg[J&U¥"3P¤…sdd$Ì-YL¥Èž‹5Œ \?"ïî¬‘9‹îLï5R]‰%¢¹àÊj®›ns$z‹—3Z«ïù^×‰Îú^è¬……A<ÁÔ¢ƒÄØ#<Ik¬ç6÷ß	÷Úõz‚x[’Ÿ$r¶J³‚	±I$ï¡#qÉÁÜg±ƒñŒL9íÃÈß†Õ±éðÎ-Ô>ÂÅ=¢ðï2×.;î–÷b2 `,œº#ôr¦`I£Â|d&d¤HSºc¦e‰xŒõÝ¶cw8îSçqYÑ:÷ú 5à~0‡ÜfÑì˜ß)K­ëï²Ý\ù§dû:ÂødM`Ës@úz0kˆ:¢›çÒ/ðf²Ïcwåš~é8vX ã>²[ŽðØþ÷èh{U}Ö¢Bâ@U£šˆNž^9¡:õ‡ðs¥†ø€5D'q˜ÿB²fq–ßtè’¬·5^~¼õàœ4þoÍb¬ÎBp‚©úŸYUqô&|Jô|ôû8t;kLºÏQ½|ö¹{ûì7[C÷rþnjqDÒÅS¼½œ{faˆ¦°JœaYöÁµÚ 	Îþ/©¾CÇ½OïŸ^Ÿo/_ˆ?+sF°”Uš±ÌY«ÜÖÛN¿‘f#XS‹†ë–žõM¼ÂªÇÇJ®‚vf;/®[½>.Ð¬„NWøèœaHéFµ_‰À¥ICFÑp1HFÐµ
kJAa’S35¶ì0qï]iö…–’zü"L>H@ƒ«·©éÕðh7O_’œ]À^1Báed²XöF¬Ïy$Áæ6ƒ÷7ÎO¿$I^¯b^Z‰£cîŒhjÙ•Ý§7·Ù‰¦7À9[–rg«£CÖ†Ò)˜jÃ$TðúÌ§2–ƒ¶è CH¦æIíÌÅÁTPñ÷JJ`Ù’(SeÎï·Òïaã2Ð•EOA$L^åI<8ápÜ
&{-âªÑÊf‚Ùvì"E4Jeªëäd1…Üaµ ·‡@¨8NZú®ã¶=*Qäý³ÏÈ=‹ü°oõûÿ™Üt»oO‡P{ŠKòÖcšŒÜEÞµÕï{ Î£BóI] i»äxÚ˜PÂš¥	ËþÜ÷ú]½i;„Þ$%V@Ã]F…í…ù¤ßý%‹âÕ×ÿ  ÿÿ â¬˜xœì}{oÇ•ïÿû)Ê„®9L8Ã—(K\ŠEÉ–V+"íxW¬ž™æL/û1éîÉLlÖ¸A°ñ‚»F\+^Ã7›5òp‹äêæ{0ŸäÖ©ªî®ê®WÏõð¦QäLwUuÕ©Sçù;haã¯éZïzOPÇw’äž¸WgR÷0múî^:cñ0~|PyØ»^/j^Y\D{Q˜6Û‘ßEä›$˜Ùxþã³“Ÿ„=Ô>;ùížþ[ˆà“O<ÔØu`n}a0n¿¯±Ž|'u›³n×–ûNIßCß)îg'?óP§¡4:ý4¤wµÏž}¢^ßC!þqvòƒ ¥ý!zÿ<;ùmßîÙy}O´ñ>Ë»¶â8:xàõú)?Í‹¨ÿqS°‚§ GÃA³=qãµ4vBúÍas	‘¿¼Ô‹Â&ùu/Šƒd¢šõ…kÃ4Â¿2ÜW¢¬AŠÇÀvwÝ¸™f¿Ð-á±&§ã6š+¨ÝËiuqauðsøEÂ®Ûm.úìÑ¬v+nÂL¶ëýÕ
í&ŒV}§³2Æ}7î8‰3ÖÙ÷Â^óÀƒÞ÷|÷y©$ÍŽ¦ø“ž3h.µVm6ÏúNßsýî–ïÆêed£¸„_Ì¸0pmŸþxçìäs´Ý|D‰ü§
N?C°ÇPãîMôfìÄñ_£»[;g¦ÉþªyR%ûqi±´!WÅ‰|×éÂdÆ®ïº]›I»yvò¿ñ*œ|†âÓOQ>MùýŠwåÈÞüOÃ|GŠ·)Ýæø6°õ`::§O;ˆl~|Û¯Ðz’ÆQØÛ¸{s}ýŠÛÂm÷‹¯¶þ¶ø®ñþé—¨‹çz­»~lq©µ„ùÙé§ºù§ßüé)îr·öì×7ßÊ{Öpsøå€1¥gÏ>ÇT¹d×ÁƒÀêóòÿô›!™‚_·ÌKgfM¦ïG×‹`;©“&­¾“<†èÍ7Q£þé‚wõAo¼Wòí¬ÙÍˆ§¤Œ9àýEÉ(Á<‹ýæwÎj{Ë†AZžaltm4hcæÀr3Ýú3·Ïžý1EßÂ¢}gxúËT¤ÆÞÙ³/Böae×¬Ï¹Òöb¯‹àG³ùIs™0œe»÷¤­mÜïŸþ§tŸÌaÒÅóò}”NmŽm”‰´qŒwnbÃîðâF²{ú©‡öû9cÃÄ'icìñÜëþ"D	Þo}Ôh»=7t@¬•ñ§(3P£%‡´1öhn)ã‘´ý¨³?ñÔFÆsx,ôh8Ž;H°ãN:,®¥ñçéô¨§ïðÐö¼Ðñ·¦6¾rsL ƒÙÀáÙÉ—ÈÇãmt£Îý8Â-&øLžpB[cðÚéÓŽ¿Ñ{Hyëd#s÷ö¼Žç†£î ŠÇÙ5î´ÔR¼Ôñ½š ,-Ã9—‹ÊXp^²eó»XÊ¡R =Rž¾‰d¬³ú1c`Õ/'‘ÜOvuõsn[U¿,Ótõ ª_WWyøpñ)ÝtÈÑ‹~9 ð—©Qt¢==ÍnîØ .UÏz¢]óPƒ•NAU3›—{âÄž¦Wg¢aê{¡;cóPâ}ëñ67—^%—.-Á(öl¿yå‚¡(.g" ûËtˆj²¼~h5š(ÜÆ{lÿê¨1‡®n ¾v}÷.!#÷n7ºë5ö?qñJY4×õ§í»Ý«#/¡­`ÂdíX4`µ“¿U"×ã#„åo£ÖÆëéæ[íÉæ<) àÛô>JåõHúN7:hÝì7Î P‹œä(ì J#;îêí¡Æî/:À<0Üóâ 1³"lµñYµ†n1Ó9ÃÓOPröìx£L­²‡|,úbé«¿ÎXQD±‚žÀáŒÕÅL,TÜ®“:m'q[è~³5Ð;ô¿C ”zX@kŸw6gææl_!çÀñRùöHã¡;÷×vYm¢ãWf«•%ÙôOq›Ùœæ{w°¯ß¯/l;qwï;,dÈ¡·È¾Sô¼¾°ë´“¼ÍÊ÷£…oàÙu;ûƒÈSôÀMÒ(vÑuÏñ£úÆBu×ÙwÑÀaÍÙ#E#ôûwñ×Çx'ÃÿÛ˜^{îÕQâ¦·´÷K_Œ~Ï^gZI°8‡MÂhÊ'T…nÆ}–}ÅéÌÚ¾é:øÕ²±›v½Ôw+@Å¼¸ŒÊ&
jÂô9¦FVX¿éÁô‰&ÇK˜_ªer¼Ý?ý½‡}b“ô=àRÄZ¾©$>î5SqÝM:±7 ¯"AËm‰ƒ#­„²ÊçÃ¶ÆœòäG!Úç_@iB<;ù>Ûž.íŸ>õÀ4?ñ?÷p‹˜m¬©Íhe…HÈe×wô%}Lå¾ÛIÝnAá›­Ô0Ù;Á ÿ]Ç3„61ÛsßŽâÀIÕGŠ'Ø¹y4{óæZ¬%	êvîÞ]8Â×ìZC³­VkVÍl™eXynUUÌÇ¼]ä–}àeè5 wêêbÉ¾H?ó"g‚Ìü äzÇeÎ#¡&.©Ø.ÙµÅŠƒéP·C‰K`ÄóžÈ˜k ö%ºf`¬·gˆÉÌÁ?
{Êù×œëƒ•ÀÂ+Là{þñéÿ¥öèÂ/FTóí
üñoq†Þž8µ^C-´M¬ïœP”8ÃÒ¾âóüã?ýæìä³êy¤uÒ_ˆ¥œ!ÙÉÔ­÷C—þÿ~ëzK£½‰zy¾03ß¡àô÷"oè‚aªPg·]ú|«>f³M,ºtùÍ¯ë¢À×²©ußÛnoú6±¼9Ód³5ˆ£¿Ç·$è{ßC‹Çè:ðôi¸¾€Ÿ´íLá§Ms&Ñ©´N­´ímŽ¼°ˆ ó}ú¥®—õ…¡¯bj±‡)oGìEÞ–î€<’ê½Me»BYîõñÌ”•I“Ø‘)–|ïëáðæÙÉG@Éÿl’+³¡)WDªðV)94
0/ŠÓ¦°(ŽGýˆèýáÎ9™^Ç©}œ?–›ªÁaó’JÃSgy´ølœÍŸp¼Á1÷ð$B’¢€ <ûôË”h”øäRµ }ÊäkzƒB´ÎäéklÛÖ—«Ù“vBuõæ1%jâÃÿ‹H-\‚HÍ;£Èz2ÊýÓ?¼[óú7y™Z:@Nf‚=¨+AYŠ –&ƒ´ÐûCoËßÒz€›ï”¥xê?;¸Oz@Cw‡§_9*ãî‹—CÖûÍ‡W‰Þž‰û¨éÓˆ‹vÁÚËE4ˆ1!v†˜”‚&`äûm'Ö‹\wôX:D_Äÿ8>^†qÅMrÀÆ€¸!taôFvBÜ>g³PÑV<½µwDþ+Lt„ÓVbrnÀ†Š!8?02=~¬>wªGôŽì=áÐ÷•'žfÏË¤þ¿Ç‹çí5Ûnzàº!c4XÉŠõátëFËÂåU„+Ñ9ÉYW ¢gÎlìr–Ãò&,X
j<p>Å·ðlèµ96 Û€PgM:»f6nWŽw)8Czúïs‡¿?B$îs”“b¦˜ÀÑ-òúVišÂÏ:ð)–ÙQèé”ò6&»›j¼ùf…š«˜ó¯–ÚÙÜÃä&‰Ë('‹%Y'â˜Øì
nv…‘à,¡×)æ:ÕOo,,ëÔzKùö~spˆòÍ
üÀöåuU±¦äE‡ÙäP«|ƒ€·UÎ‡åú¢’Ò£†?TxÛ´9&˜ñ‘3ìz)&°DÙzkÏóñ5@ŽÃ\þÇ:•¤	GùÕ«W1g¥2Ú,¨Y²ïÃžî8þì‰â‚[îëë7îÜØ½ñáÖ;y’¯¯½wç¶ôû[wï¿û`ý»;Ò[ÜØÙ}÷Áüž9µ7«•`^á6çÑÒªæ®ÀäS¢§Pmí»GWG0V¯«s+Lñh•ò”MÜ?™':”Wþ µ?jñitKÓ9µÓ¶Ú\Yhô±[û,|õë×¼Mj’s/^9*X×‡žnkYAèm·ˆ³„?Þ¢T3FãåO;p7v|®“ìûŽfÛ<M—ãf-`âµñŽ³õÖ,89¯åÙ#!(BßÊî—LÙuNF#âÙ€lâÛ6¶ˆâZ_ ÔeA…åó´ê —È˜3#Î· o•;2‚à@8¶‘(-#iÆ‰4·ÙŽ†˜2.¦˜
„KÝÏÏÞ}ÏLËÌ¼\3‚ºã¬¨Ù‰J?JBgô£t³å»a/íÃ·³÷¶fÚvöÑN£j¿và½8‡ˆ*{¢*Æå“qvfB‚È!ÄI5ñó‚°ÅNÏ.›‰ed¨DoâvÙÆ[ð—øñÜî8jìd3±ÅÂ4Ì±9V„nˆC²hÃN¾8%},Œì7§§ËØ?(¦S1Ÿ“¹.šƒ);*¦V[/B‰NÕ©ð •W#8 2±ß+…‘pAQò¦4‹Ä7Â!ÔAb:¯	[‘·ã( %­!Ý^cØ’$î	K]¯'Ü:¡À‹'/D(']vPäá-g¿Æø”ÎÙÀ‰Á„Ïï}c&Z)²œ÷£´ZºÈÛuMÃ… ›•YÌ’M,AÏ¾V¸™L¥–•ëö²=<×]wÀÜ<$âyÏ–ïÛ¹wÄÿ,5-ÏïVìžÔ:Û%f¦W1nj÷ôË°Âç	!4»‹™
C²®¼-ÜrŽ¤crÆÝ<Œ·Q;/‰² ©Ø?}FÏ?>ýŒx€ƒ5²‡y’Ò:Ï{ËæóX‚yô¤õ¤E;†ðuú§ÏÀLŸüê™zu|E,f)7ë¨“"UQK|€´9lI#qçõ•ó,uâ8˜Üâb“-6zSq'öOÿ“e×:îe—ä¼¼‰Þ‡à …Ûý!öý¶c~÷Â|þ1Ù˜ÒÍgtˆî:ñ¾QËl@ŠÉÜü¼<ÿ	ox÷È	µ!9¯E°ŒpÞdòí¹Á‚ÜÛXŠ¹ÎÂè_¡`Ø~çÛ"H”…¿ùz¹\Ç‚6ž¥û4ìmÓ´‹ÚÒm†µbˆT÷Ž-½p™¬¹—´9ðº@Sb  ^v!‡oÆv§+¯hâKªá©,â¸éGxo’âaæ)1§_ÉÓb„ñç #O¹ÑUßl…xŽs SDûTd­‹Ã»hœåöIy°‚ÄE6lËó.Á‘;©÷„ï–eJ	]o|À/‡‰É(l;Sâ-e2ÆMXq•Òa)dö_WvBðcrVý·ä#"QŸ?þ__÷¸6ô÷y’ŒÍC ¥âÍLá¸ê»ÿÂM2ëå*6œ"g™áx«›0×Ý1‡:<…è›4üu³×úzr%ÅŸ'«)u
üF¤µ—+´`õyB®CÂíØ0åÍÿýxÎöÙ³_Ü»‰®~ÿÝ5TŠyÙÒ±Ù	g÷ìÙ¿î’1—X¨­€æÕ•‡¾Ö‚M•ÞÏ_¸Éú¬2Ä¯åKá=÷Ý8ð’¯e‚î:¡ÓsØà»Ne›]Êy8˜ <þLÞES3²x¼KÒ…4`â-!¿·Vüy‘ÐÅ%>:e.Q/D{˜ààÿÄ÷È/Í½8
ší(…,ŒeÔR§ ©*¨
æäŽ»—¢ºþza¶¶né4 ˆÁVXõ’%æ5$Ò¿~‘&„ðàwË=k|ØižXÒ÷º]7´NUîSŒ©^³;]/L3š1"Sû!þp0Œ¾KL™&'0y=º“ÿF[³1ÙSfNáˆ{êP´"†;%x¸ãdªã~hL=$Ö÷²‡£wÛ`çhí»GIãÁ»wn|xoëî¹LÞS
Qí!ÁfLçñËüB\(È6Í¦z’‘úÞ@Èü§¦T8ô 	VˆqÛ}þø~˜A¢ú€ªEGjqTÑG:O"ãË7ËƒC--e›‰=Wœ{o<Œñ&½íÍ#øåŽÓvýGF Ì¡ñ¦ö’,¸]E™ {¾à‹$ºŠõ ƒË¡ödÇyâv‰×CôIŽÉÞÁ¬¤•DÛˆ0ÄxÐ‚;øN´ <±›ãÐ¤·Þ¶A€"ò¬OSjz4 ÎFš5a2©ÈÅ‰mdïkêœ‹ªî„æðÄcjJcÎãÖ.gþW€KW†þ“Xÿ™yã8º2Þ‹Ð&š1$\R%@º@~ÈÌØt¶–w6I‰‹Z72?ÀgùAsQà1›àA‰l¤Ðàâiƒå¸°ƒ_ofž_?¼8eq®‰¤ãà“ôáRkqéÑÌ-Ç£/c=g­ž3®V2ð½´1‹³sÙ‡[ÀÊ#”ƒ(Œøè\>³
"´–À!W“f•óiÆ…[ef€¼“E¦šB²kTâÐvÐ×Õ]:Äåìúr)ô¾˜G|êÁø!È™¬²„Ý&™Å6·M°@J,­Š7&ü˜bà!Ç9‡5Æ‹,Ø‚ù¢ÒöÕñVø‹îá¥¥Å\•hã‘b%éGq:Sá˜+6¸„–Ÿ)„nK¤ÖåÈ­ËY =åÓ ÷ïc¾³‚É$X>a³íÌ7­/´y	æX™ig§ÔÜh¦ºq"\¦•hqÀß{Qì}Oxûí¹–§ÜdRíŽWëV^œZÇ9¦Öq$=‰ZW@ã“­IŽ\ür(è®‘ßãè ~×JVÀµú¡Î4ú£A>}ýw~|ø@ëGR“!í³Ð¡Ô÷ûvÆ.IºP3h&C–Ö:*ôž‡rMå‘Å	l¥‹Úi£|ài& âò7vO¿ìô3ÐAí„Ï~Ùa±¨ ˆO0NSR±‡·`Zk¤Fæ%)AÄÎ J%+z+ƒ)V®ªaR{{ŽÆ«¿­¤_™RGá6ƒ¶}lplí‹0Ù¢6ôG‚ãÆˆŒ®²0µÍÇVÐµXa¼ÑÅËÑåÔæÆõoo½wg÷Ãû7Ü½µ³sëÝ{ÊQ@ÒÜÃGÐ¶iä€2>ì ycæùO?º§½¹ð:-töì_C4K û:gÏ>ÒðÕYf|aöuâ>(j»¼1cŽþ7`ëÊsˆ¡%ß¦æ°Ì¹FD ›Ëjû¤”0ª‹³>p÷ðiÛß>”»˜qýæ
þy ?‰Wæ.?ïZ–fÆìµÚ®–û$Åš>m8BÕ¯S)€ôëgkÉÝ3’¨rîÔ,
î`-dU™µ´j›eÊ±Òõ^˜µ‹ø ³¥w}Ôíê¢shlq´È¬«Âv $ëF)¼itàVöÃ’Éî¡Õ¡éb2¤ŽÁe­(ÛØLt¹fÜî<·T3¸h´3°N}v°Y]1%šÉÞ{¢9$Ü¶w|wYãîfl¨|ÀÃEiaqæ3&ÝÏf–ôyº&þj@É™ÜUp	òq/!ÀvyQ
Àf¶†s©MÓ¬ä÷¬L	“xL…6P:SÖ¤G–¿m"=¢œlP1s¿r²$ Ø)ÃüÂ{pïÏ¼ÂE1Ü¿6&ä ­·7fÊt=³¾ÐÞ@ÁÕ;ýªCüPŸyL˜:Å¢Tä{oØh6Z2×•lQ!È\Ö#w²è‡ï<x÷½û;ÔE|óÔUp«{h!¤S×y «	ºJoª zÐˆ¾Gƒ I›ÂçáCÄ­•·ÛrñŽ9jìC[nYÂnyaÇvÝ¤±?gÕ8±dç–E°ãÞ(ªïÒb<T¤Úz=ß}‡@2]µ,R1eaá· êÌ5Âç#™€ñt›Aì>qÂÿ$™À7ŠYågÎ¬K ×O\»÷˜ú[<Äçvè 7mÀïðù<Â¿ä/óhÎ¬Ô¡¿Ö×_²ò’²}OÜ Ùf=®šúªumy«ËóÌô¥…‰¯lA£;‘ÅÉò˜hŽK‚Â‡×;:ÛK%ØöØ/]'é»Ýªªh¶€hGY=ÏìÊèJÚã-à¢sZÔ…æû«ÉÔÂ¤x¹bRœÙ ´Òb†dðzõ/ZÍ“m¡9;ï=½êøåéURA9~iU¾G×¤(¸\èmü§¹{ŒøÚss§ÍØ-òˆ; ±yíìäŸ3+dÙI;ÛåOQØ?ýŠ–*0JÖpÙøC²;up‘Ü}¦ˆ¸ »V.«³µsÓR+ðkrYYÐLqîkÎxhÛBbÛ¦TIÚoG‡T8·>È³ô|5ªeÕ<ž÷ÑW¯¢ü5m‹iÙÏVÃ*ÎØl$6¶O6«ûL§mvYžºÙeBð/rLgoxlÿ\‰ß‰”e÷þpÕözgÒxUÙ,¯™­G¥²õ=f>F+xv;·ÆC’ø¤å¤tIˆGª‹T\²¨$!)MìŽ9¸ìj?"ÛC.	ôÝ"„b[ÓUÖVMºªÆUd4tÅUEdož•DQ(âÎr“¬ýRÛÆ[×¨xcàEýh‹âªS'yŒÛåqrõèpŒP9ßuº…L</R…:\®!÷Öâ*DÈQ¾îCüÛ±]™^ùàU ¢`ÝÏFÌ©/8¯3o5]:µGQ7¾n…¯[RE×ÅÙ˜ö­£ë¸1Õ¡¤7[	ê0Ÿš}Ú¯uÒÄÂlýb«kÊ²jú³¬FFÍÈéb6°3lCA&fmÌªÜvaNê˜%³‰ŸéÙ¸Ã}ÒÆJ•ØØí»êžþ‡W5OCúCØƒ?÷DSö¹å:Ø‡ dë¨×ÞŠB~þòâœL~Þ-‡¯0×âéEÄcáû=ÞÄ…f±ÚhëÆÒ˜ì1y›ÅÒT€½·ÜØÚ½Aà¶»îž3ôS‚”¸X¡ì:˜êëâ…O{ìHg|"ØƒØKÏÀÌ¢e˜-9ÃHCmÌ„8äê*P6Ék×-JÚ?ý7ø3,_‡röX,cCXÕpÚlE	ëCÑ.J¾:’¤+‹©¼u}¡kG[x»}þe¨ê*ÜR)ãZ³†k½—zgï_ÔdìQÕ¨˜¹'÷Îï¬}êovÞ½×ÂÒ6€°¾ÒÈ Ê_ 0a¼E…<M/ŽW3wØ‹æ,ƒòÙgúÚ ³å’<Éóô+M	%óÛ¼éHÒiI2’µ7ÈD*…¤Uþ¬Ô©²CÑO,“Èb·‡å),œÛ¸ŒGIÏE±ìa©,VÂ‚ÃK;~/Â
ü6)°!'' ©$hœ°ôÕÅ…+|Ð8ý[ÜÖäÆå’ÃKí„â…“CŠÚÀŠøyI·!YÛÎí$waUçj™†Øg§¹œ7èf¿å3d0 ­_s}ÿ@†JÂÉÅ¤…#K  Ü¥2OWI©ÏOxPÓUJ¨º´ƒ’©ï²Î€vÊKãaÀªb,•Ã:+Ë—Ò¶ÊîÁ8JXr„º’µNiB…d›ð˜Ê3Jæ¨JÔÞBôA–èr	ë9³Z(±†"ê
Ë•¬¤ïÉ!Œ(–´OB…ÍÏáë’	"áüD'Ëa;g'_8ô|RÀ5+D%§—|MåDÍ£|%ßÉpCòñ:„qÈ!i<”WÓs®’GOT¨±¹äÕo^ª¿(aA˜e–|¤z
…ÉhH\@©`fL~/×ò¨\:í7ŽJf+y¬6Ü¦°]nÀ“ˆd™äA„’å+GjÙØ&–¹©É„QHšÎ…WSöU5ëjÙ
J#_[eÆ•:ÓJf¾±<Ö ˜C®JÎ6ˆ¼ÐêU‡Õ·¬_¥²£Ê;C}V©³º–k¤uÍl<ÿq†Û-ðL€O³”!…IÅ.LùNŠJT´¨—0ˆ.+5	ÅJsö×éÓºTTrqÊÛÀD)!J4@Ußoë˜˜½íÛ—fÎÐ­n—VA9¶·.ÖNà{V(|Šðæ±e!½R‚O2èÕ2OµšŽÆð~=²%­*û¤é»L7È± (.(ÿQø>|Ça¯íTnÒ˜éÍ»±×ë‰¤j’ôðÎ0Y#¾Y&îãÓ§¹¤·&±¾ÈpÑ ïC·§Ì¯fQ2Ù!nPæ«³0µD«ZŒrgÛ±<ô]gð°2N›JE'×éŸúf6Ù ’Öæ¤‚3ÈªxUF4·Ùb÷oG]RÛê>g[Õ¶N©¨P„>€#,]@ëÆ=!É8h>¼H“0Â\b€Â‡WVŸ<2–î.žXÃèìá³~Ð$òÄ €0¾Û\Ê7^»f‰ÒØÅÄˆqÆåØqRh¹¬œvùC,Ò@ðØé¢sUÓ:P„ø|Öƒ"¼øä¼·\¿†©‘ð¾°e^2hµZf‡=?¹~ó2È¸æ‡se”O§ÄlŒr¼Ë†›‰ó÷ù&n+ub|üµHVÆ(¼í]Â¼M·•àÀÍœQÆfL¦h¾îÔiàÔ319{#Ü¦1 HØ¤6åì\+îDn¼ÑÆ\ý×VKz³¦R4ë\\»È¿,4qË5öè³³‘ Å8ÿ#gŒÉ­ð¾{Q·Õw’0P¿v 7¶·ðF]oâxË(þ/ÚŒjÅà¯ìÃBI7ÚCÓ² (Š’Žð1Ç\t¼Ò8jE9XfîŸ5’‘’%XP><ÑuYÀ Täbš"P@}j·ÍË¸D.0	f¹Ç…špjŒò,úô+›œôÕla…²Ë:¯Î´Qq‹Ÿ·\$.	úµ½Õü…i™IQöïPo~jÄßØç,<È|¿9#G¿…m@Ã‰”Ýfˆ£ÈnSX5õ°T
¦5‘ûê0o¦©žÒ*	ZÕl×‰ã#ŸÞîf0¢¡_cª«Qµá"<)’€xdø‚¡IYÃYY
OÁ¾MÂõ{ø-“’2/ñ, H¬	S’Ïˆžvõ’ÏJç?•›h	ŠÍ o3$@Pñ‡À€_%ÿ1ý0…ÇÒL?„vÔûœ3MÐ4ô÷Cšt5W~æ”|C„eÇ¯¼Ý£H`Î²‡ðKÙZ?è¢Môø)$Ã[èwª&)M\ù3 ‡mAº¦â½stŸgÆ‚ÙÙã¹Ç Pée³Ú1Vëå/l€8Oíþ/Úº¢«qµu²-Ï[S‡N&QÓwóçÿ¢£Óo© ÖÐH­ôb‘äÚ9|Š›ÙÉøÍY)ûi=eNþ]zæ5*²Î-¢¯å|²|ðc^	­¥4±«ÚW&WQ+¯÷]·8é(NPõ^™lRžÆóµR¤¼•"}AV
£>ë†Èb£472äikàÎ®G=µÔú	”úB6.Wx®"n:%°qq‘wâ‹ç¥´ZªôQX_¤Â:M%ó^ž8C	À‡t<“C´¾ðDe'.‰1ÿ9 `ùôH›m:©ò€€å¤~Ãô‚Oêç¸1Q+uƒ*Ä75Ÿ®H>êÖ4ÒŠh –ke(#ÁeRlñX»1via	@€ðA_F@9RˆÂ¸J¡5ý³gŸcÉüìäW€ðú”üé©f¯Ä¸2HÉf<¨ÚÏ½Â[Uùž·ÏN¾¢Q{¤ö|c—ÄÈ¨Xc½h‡6	¹‹GÛ—Å9\ã¾~aš~=7-_œ¿àôSz¨f¹Ï?ÎB‘´ôxêï(›ÜwI´PÒ )aÑ µH	+~ø)Êgréû¤J¢Fy„<N3zš”Ý™¯K»øºÃ;˜Ð Àˆïß{þã¹—qS¨!´ö°vÓâùŸËË\ÎQinóÜ5óÉ½GR°îÁ­öm/íoGAà$Êà¶ˆ…ÖÀüqNCëhSdRéœ!š›Óñ‘²q¾æÑ¬¢@’Rôüc½5æÑ•nz		x¤s€ÞD7iR2ºæ„!æûª#—=I|;Šé.† MSIiër„Õr™»uá²Ê³œ3 Ôä,{×"AZ¡!æF€Ë@nù8á ï­V Sìu+yM6†D‹sd=#“j4²ËÔ"Ýojµˆ¬"ÅŒ²ñüÄNy7^ÉÁÚ ÊÍðÑ`e¸Ç#3ÔÖK,3	dáZkæáZ!ÛÉÝ…¾­…¯‘¿“X2'œ%FÅ‡„žJ.DÈF—ìÐRÍ.Í”rûía»aç¨¡æ0-‡ñj‹¹š^í+Sò¥ÅZ™@Å•Å4kR¬Kè‡¦xYÞYU„3g¹áþ‡_PcTþj¸Ê„Žˆ¢£bÑtÉë1¶i°ÚOÁC «8V0Ö<—¨ yÖ&áÍ´B2‰i^Pž¦Iþ"øÙy%5[îœ‡•ÎhÆ²o˜AV´ÿ/ û«Hþ×NŽÁiÂR¤eÕSÇós9ãŽ®ˆ/i³¶”Ož’îV±‘KÉºÙ&hAŠD,íÛx0Šð+yí0ÍP¬îÏ°”Ñ÷ÄÜšn?ƒPŠÓ_éÃÞ¨!•P¼÷‹—+PïUà<™”'áf¡ôQöK1—§™h]GâI³¿¯!'<šG^÷p…D°Â­dÁ^àî¤1ºŠH[U¸#à$Jè%ŒM¯•Uo0 Mº/µ2öhfï’üRBŒ³&O€µG¬@ÊñJXÐ rW rä’yž¾)rh¬\\ZÍšlÐadÏ›j_ÕôÈOö+ä˜¥kˆ±QÌß¶;þyBSÓq§ˆk[R¥ì€Ø 	;•~ëú­c_§ùª+ûôV9ÑzöØ,ð ?n¼skg÷ÆóÃ¥d¿fs¾Á?÷Þýë[»7>Ü}wwëyv›“
ÄCçìä§aÀm°A¶óYÇ¡Y'W†:X¦£KÑ‡QJ(”¯š©e³öØƒÖØ‡5Ø)cÛ‹½óV`ClRu£ïíexÊXseóÜL±ÔšbÄ«¬2zµUüÈˆkpFø¨`Hƒ4³‡7z­{èKÜr3íc¡©×¯±ã·ÿß/×³“Þž³ÙµU‹–Tiu›!Ž@diª9i¡¦ ¶DÇE×¢ÃZÚ‰P€ˆLvC""C4Õl¨Qƒè-#'³WÜ·
‘Çlé÷…Še7)T„O³ŽþpÒ›ÑÌv	v_~Rg˜µà¿9tÍ>·±ÎF“!Å%H8Ïd<L±¢SáÀœ*¯â‡Ÿ•Þžo
$ ÿôÓ C™Ù¸W™›’Å± “!£€ONêaUÔ0f@€øc^oêôÓ°žxùA ‹AKQ::QeÕ“3,”Ý>¯ý¥ª(•ÞYÀbÎö,VqðûSìNµ¯C­/d
•FÔ·•àö³Ü9
àxšª*&qòŠ@Êì^Äš\u7Të[.*ê[ÒŠð—Z‹ËEpcŸ]Y5ã«ÞIK)©\RR£¯›t„V aôÂ’ù?Þ{Ý>ý9º÷Îé?ÞC;§ßß¾©$V}±¿iÑIÒÈ%’ÊAKv#0é½úGõiJ]üh¥Z'WUWÚ\‘–ºÉmõô‰­ Ñ1èä¾?Ld§ncõ2Ÿ®aŒ’!f“R¹ßÇEj|D‘1hýÔ£«É[‹U‡¤±*VéeÎ;€?³J¤¶YŸÓËòÇP³Þ_©È ¢clúEî×¯;©C\q”'si­ë€w‹´±S?çé†j©5AºëýÍ¬ÕR~ÉîSz©ƒ9ÌÌÆ;g'ŸyXæ[CEt†>ä›¾?ä^öô¿ðWX¼ú$ÅÑ³NK#Kèo­Qù@×mÓ²ïøEïÂìS¼:ºÃ?E×ªÀ¹S?§)N.z¯Æ:Ç¤üë!äoñ™“Ê?§3Æ?ÔfËèX	,Xˆ˜Mì6Ù %Eº²b·;ì¸†ÓéÌ¸uà¿Ð7ÉŸÌ$1çæt¡íë[1ÖP+hÂŠé[ñO~TEK€|E=#åðv¡êº†!ï«@{b!F=W$M<ˆ:[Þ“ŠqäË1‘/õ!¦œƒË}qÓ$ò—Ñ1ê{á]£Â,)ÄUN8”ƒæ2~+ËFØmZ2ãšÒ“»®EÝ#m p…×ˆµÿ¡ÂÙh¹løßà–XG¢ZõteoímÛõ}§…ðá°’Éa*Ì³”·3^%€õ“Å¦°IÈSò¿Ï¥óRsp¯°°•iôIíõšZž¬ãÒYæñó‰GBû0wMÒRqåÊf¯%úðåì¢(Á^G«ÄWI2‹Ý o‡»â¶kp[ÇÊÊ-§ˆ‹¢ž™c\ç}ÂÌõ±RtÐ¼lÎß¶òô|P?‡=i0.÷Y’+5åY(»e:ºpÕâ§)¥•P>ŸÑI2;¢€ÔçÁ:û<ÂüU¨vWë!eþÏÓïáN©b¡PÈýeµ @AÞ -Iu=ÇOÊÊD„^ñ˜kÎ‘V%¢ê‚0 Êrf¶+®,C5?‰µ¢$ÌŠzË +#œžRi]—i¡Ìª£h4€¤W–!®k9¿N÷!YÓM@Þ¾„ÿKá¿¶?Œá}UpÌŠl‚‰¡²ˆÐù·ÃjÍ™š¨A!Sƒråy}kWÛ³‹™G²ˆe(h?#BÀd¡þó1í+"¿ù‚Òt‘›  ae¶ÈÛ‡dÙ æ¢Ÿæ~Ôoƒ7£K\ž"¢!›/C•2=4¾‘Â¦%ådS¨¨$§ªq†h4_ÐZé`Æzn’FA¿läûmG×¨iIøA®ÕÇyñ–^UÖv`Æb¯§ÖÕYM%HãauëÅ¨n^xfò¬ˆ1Ü¸Æ9jX|jn3‡¿0Ç™Xò*Àë#Qä¦¡æD«D¢X<‰[oQ-²%’ŠÖyÜŠAº>7?¥ZLª0ŒBÎJFv™3e9Ûå!ìÈóÐÙÇ¥q{’J6…|¬°ôbÙc7÷L“úXúÀE×šRÕå›ÌÐ7iBžd™¬ë¶vw”Š¬=Š¨–Zì×.VÆf¤¬¨¨0Ûé·£}r uìÈø³<ëÆ‚EËÐà3.-KÚÑ"èùÊkºŒÔ zNK(ÉVúo8ÃÌÒ;Å9®$l;«ú/åõô
'%Š©ºZž)h„WÐOt\S)2)äÃ"ñ ¼²¦›ØêV$ç"W+¨r0Òy1Ç^+àh]PÊãNVlR¡Qeëí(JKµš°‚Äo6²ªI°¦•j4å™å²l–”U«Z]¨EPZ¸P'¼„‚šnž|q„Úg'ÿ,U+Õæ:­õÕÒO¦¢Šb9§¹…[ó †Z¹x–4M-, Jˆi¥UDãŒT–Üï%iKÛ°€ní¡9±‹Â(E^HÛ@AÔuçá›ÐÅ"r
†ü`Åxýý#ät»Dîƒ± ¡´i‰Jµˆ{Ãk€‹ŠÁRÜ!‡ÂØC?¸s/…þÉ›Lcž¥Ÿ+°-¦pØ¼LClƒú´þ°d@ò-!·\¡°çÕÚ#™í†²“ŠsA°p–í¾ôËú…ð°–¯ªy—ÏfÔÕúwò*ue”‰\˜`ù•¹³ïâ"ÅÄÖäõ½ô­~¯ˆhÅ¿iK©|e	ì 	8/·p@pr/ù©¼Ì`U†ê¤YÄ¨É)SKöQLL‘A¨ºæ_ 7­ÄÊE )âÂ{$ùœ„kDEMÙÀìÅ.Ì ‡lö6Þ%Y<³x¤u…nìSü–
‰®®o5å3«^GvÝÍª’ï!Q`,ð˜"š÷˜|zAÕâñc}!Coœ>éW¦B"ÔFÅî¨ÌMŠ	Ž„¢nAb=Ôâ%xrÚÙ§d„gÏðç)d`|FÓ àQ2á´Î¥fÊ0ôÀÅB, -uÔPÜ>w<÷?Òv"ÈÃøI@{+` hJ	¬wDêËÿgGH™# xûÔÇÑ¡0bu8U_C½KíRZðc–³’³°\ºÕÅ2)1h'[h'x¿ÎÕÁœª˜›Û˜ÔÙµ‰ˆÎ»·	ˆÈùh~ñ„A"ò‚ÉúÛøX |Vµx)þ“¶ÉRäÿµ¡¿OPêÒéItŒÅÆ;IY…§îUZÖøô+G½*Ç4‰R»žÉât
µ–ÕœN×´–´ˆ@¹TœAäïe]DŠ:ß^¥u§k¾åûËŽP×K \£›Á“æ[xëâ$C²waž{å|Gå|êÐçIŸ(É‰‹5º®ÍÈU0Š{')dez4àBÜ+}·´VÛ}ÀGÅ–*Îðé•Fòg3—J2æQ›ZO†ú&ÊlLÌ§ì|qŽzVg’R©éd‡0v¨c"F¬2Â5GŽt(Éj!¹,U7[Éíl‘ˆ¿1ã	Z)TãÂ†À\P5ˆÜ1‡(ÄZ¤Æ}´,íGñù( ª’;x
H¹%ì,-b²Ä;G¼TÂsŸ°FñÒ¡H­w—ø†7@Ø^3xéy¥K¾# §JéQù ¬VËy+ö…[êÀgáµ&1Å‡˜Ëx;ù2cÖa’(n"ú˜!+N1£º·õÄñ|&X¼%8	Ly8Y¥’ÌØxjK—šc…a´Q¥†„¶9”s`¬â1*F¸‰ÿù_þgLqšiTô¾9ÔDR#˜;†h¨Çüãš[MàÐ‘R1È.]^’Nªb3Egh«\PÕ·LCÀ;qLPi`Šßb1ýÍ0€Q63“ÐDShÁHî„QÚÇ4L?÷’Üy«ÍÕ™)äÚ=V.”_(:Få$¹À:¦Rr{¨XŠt€vœ…güŽË™ÞsKÙ@-Ü(Œ/ðº!æ£©Êªç‘VQøÀˆZe`Ø/ïÒ1²ŠD)æµÛƒÒ‰—×S¬°ÔI×E™£¶¾ÐÖÈ»*H"CÐ`…L®:ðÒ>VÑ)µèñ_iâm‹~Û	Û¢0©DQÿ¸g39ñ/´ó
ùˆÆŠ?\Z¥…YtFý¡?/
ˆÓ‰•—\/Š›k:ü‰^·†¸XƒNö‡Ju¹!¼<{œUîÖ*ª¦—Ó„NtN>ˆ°ÆÍvý®ÓN&Øç¹Ó*™”VCÁÙqàÁ»²ýD,ÁVÛhÔ	uTdqüqÙBâq53¯•JeçÌØZúÜD39»-¹8vªocÍ”ìõ\rTò\ßò¦¦rnß7FD(ÛéD…=c¼SðÅ“Z'vñ\u__rË^ &ÉeEB^mŠ;ý½Ç0Šc5@Û°ÒíÖ‡X¥ƒ)‰â¹×‡ƒîëM‹ÙÔ¤ÅÊý•'F®M¾G¦æõ£IH5y}	’Œ¾&5º;~÷•§Çç?>;ù$«n’qÖ¡GˆÎ¾ë¨öÉHÒ”	,ùD[æ Á/ðT*ìd¾ee
(EºkÍUyîy¾ZØ\£³Š5ÏÕ©t:­§/GÆ#SÞS­}žiiówÒ›/ÊˆRÀLmat‰mªqnRŸëÖ8æŸd“ÒìXÓ¥î·šöIÀhÜÜÄ	8ZP…­¤rs¥Ù–ù?
ô°…åìQÑJ¶ZÁiRÍ¼’H$K¡‘`g†¡Ž›æ@`ë5«;„U*Ug¾¯¯Ï&Åx(ðÄ•½jÓ+>PóÔe8|•ÞS{Œ(…n\ûþ¯\¿FkŠSxá•^8M
E<³ñœƒSŽXçÈó%î"†˜‘ÿ×27y‰MÁ€÷Ö¼It£¥Åã¥E³ÕªôØòêñÆòjíÇVqo«µ{+[§âo²þBú1ËË §Ê_r`%bŠŒ,âœ»QÛó]ô¾ç¬!xZn½«ÀnzGX0a´	o$ºübžÇ¶¢‰ß«l#î¥Q$xÈ£K|"¸ÅyTitŽ–Ümë¼ÀÔÜqÂ»Q×Û;BW[Øð’o/ÍÛˆ	¢Ë·ñ4h¬!¯ÈÃ¼•ÿ½3lÃšÄfÛô6üTþÎË¤p¶ÒèNtàÆÛ˜‘Á)õðw›-¾Ý¿Æ—ÊÁJ_¯Xz£ë¥´r|À•GRîƒMôøÂ¨z?W†½žüúfPRc—CŸ%¡¯\á!Éóyñ!±öÐ,„Á*G»Ff”ªõ[©XÜˆû¢Ü$‚:P¾çPÑ²Ñ­Oö…æp'Ž6qX‰$íôS¼Å$é¤%'fwH‰•à‹‹UÀd0´s§²N‹E¨mé…Øu“¼çÑTY^JV¸—Ø9&
ƒ–g@;­@kÆ¢9 ë€FXÕZàœºWÅ0*@Ù!‡L#Z9oÉ¶º£ˆÄØxá1ƒ\øv	¨¤Í£þnpoaË¢<ÐËuŽ3ÍE]ævæ'~œ)7á¦rˆŠk$D¶€øÂûaê§6ïvY2\fL9þ¢ËÊÇº®.ÒÂY *Ll¬T	Msg¬Ïn²ÚÅ»[£Ò@Ò¤ã+BWÈÛ‚G,£«Œî]¸hYD^œI
D’DB‘1&R
8Q|/„I~Íè¦-ü5M*2Þ@|ËÄ†e™¾7@d…ÔîeáYA2³¬Û$-êJŽ¨¥ŒjÉ_—‹pzò÷ò¢–f+¦cË2O÷2óñ-ÙŒß–†- .G‚(;ÉæEx7
7…E÷s˜CZ×®®mþSŸÆ’@$þƒ#ü1+3f‘@”N6Çƒa<ð92es³Ì>9¿iþ

~5¨V%ßÕ²„Ø´–À¦Ì¼¡\ãåœå=æÙEç¾ÛÙoG‡Ø¶U˜‰j½¼Äx¡ÈÏj³Ä(\„µ™û‡¡B6I-0/zÅ\fªË€Täv16F%`1.º1ˆÝ'ÐùÃV«¿Ï#þ#C:za-¬{‡ÿ3gœÛÿ|ƒÓx.íc¼GS‚^Ì`›Ò{5ô°:Ù2«×‹õ®‹…Ù>Q–—£pôº…
¡„\’–2)£Ü‹µLðÛy$N—‹¶(À¨Õ.ÇVJ4¦a@rÊ-¹âSÌV<&nÓß'L  ¯$cÎ¶´¯=Ó×ÞòRˆC(‚P­ÚgC)UPK®>+çÈa.c#¦½ªç¼e]V‹wÉ¤Ò§”%²ìA+ùÉ€gÊ¤¤R]°:“‚Ðý>É²'yùS†,&ËÐŠGµ6³–™¶4F0ž÷Û”Ø÷€úbk•O‡ÿe¶¿I9Y¹h3ƒ(µ˜"Mì÷ÏàqTv¤eÇ^€É3 ¯ÛÔ¶ûúƒâÓÿ˜µâÓ–Œï•˜NSY,Ÿö”æ–N1ÌtáŸ!F¿zí¨ðl4¿.ó½Û'³ÝóSk¢É.Î›Ä<95>6¿eÍÂ¾fç¦<ß#Þ-f£¾Õ]ŸrqåÜ
²º¸p)×½E›ßØ¦|&C²ŒüÒa¸J`öø<µ\MóæÉ|yç\f;‡›ZK±ÑbÁ¦¬j¨¾Ü°[äš)sûéùd:“ì*àÔÄ±F‘ãƒ˜2Ù«ÅT•>þ;ýfà„Þ`HÍ´YÐ§€FY
é¢˜" ¥ÉœÂö<uEó¤HÒ2gÝl€Œ$È:çl…˜M2Ü2d§¹¤Î³“b¹=Á›‘È³}ÚÉ6/Ð>n\(xO—A’è¹\Õ`ÃãlÜ>õk:ÙR5\Ö”—=uó‘Ò9}gò.qán¶-ûè¨.åØê[b ŸmUÁF;YßñAÙLt¤NR‰Ÿÿ˜VRü¤
û64«òQ¯-å¹H9eA"‘Oß’¸ˆ^$íÀ<mÊ6—tCd©QËºÙyžv{[JƒNkP©=æh_t¯2ü—™k‘¢”y88â˜CBŒ„iÁKªPqRªÀ/#©Ù¤(:Ö×
«þ±rAÔEáÔêÀ!rØö$d»ñžÛà-ŠÔ¨)¢Áà·(”^Aø]‚âlø‡P­‚¯ù5Iõ÷ýa"vy	÷x‰Ÿ­e£th¶È™LAIrŸÙ¸ÍÊ˜A*M
:ßÖÆ‘ú§ÿ…ð¡þÙÀ¬Ÿ)"qÌlÜ<ýìˆ ¬~I²w~
¸¤'Ÿ ÿìäG}B±IÓ³“_)àïÁP÷½³gŒ¥~Æ¬!Ý­ú”¯ën²ŸFMŠKZf}±Xè »FÃ£s„ïC
r®ˆ
×VÎ¶©›}I»ßòÁüH³ÓAú_E×n‰IXU¹æ‡‰a ué¾¡6iè%ú×'r’sÜú®“ö[x ŠôÎy´¼J&VËü7ôHšôz5üí†˜~ü¶Eç÷Äžø‡–.ÿs÷²[–-×‹%u*´[fU‘ÝÉ—Ú²«®~~#Taô&º{úÙË‹Ô!ôò‡E¢Ú§O#@Ð‹^öxŒŽî—=]%?Ô›òÓ#ú×ËÝ6ñÀ›ú_öÐ¸u…ÜgØš}'ÂÒÞÓŽÕÐÌeÃ¹fªµ[Ä÷Ó•µ2ÑàúÚf£/7vF\¯WV\ç•™—èl.ÿä»T5¸j¤«Á5SM8»$ `Å?Š…þUvXŒŸ`Ñž—1EÓøŒ“f’á't/Mf„ÌÖpÛõ}!©×Z="mXªHpÕV“àšŠªDš^L1\cé9pM¢ëÀ5õøb¸ji6ÆQL!Î˜Êê>£&—Ñ©šŸþ°&ŒÓí,›psPœÝÖ´…¿µLÆ°‹ÊKÏƒ¤‹ë<’=Éˆ-ƒSø1ÔL´Ì®!£±Lß,©¢PeÝ“]ñ^A‰|UÙ´ÌÆ±ˆ„†k\b/eÜZÎåX9~dÊ<¿U>ÍOâÃÍ+±Ð ïr&Õ¸éSpÕÎö#ob›'—å9VæŒ:ûou±WJþ;Ç™'¼Ï¹Mî4óÉH59«bJ 7÷EJàùNþT3ÉëN}a,9œÕm‚|òÂå±å†±’ú‹°À*¬Vi-bÔJÙ¯E¦´ýj"”>e¹¾“fí¿Ü¼ýø/n Jˆ³è|~ËXK.sæÄ+½§ÂœÃZª•ïw™Ç	"1Îºè ¹çÙ¥A‘Y§éƒS$=é\ždh;h]úákº‡j%°Ùè¸¡`JÑ&#Ú.Ø¸Yˆd€Ödw^	‰d5ð.‹Ek!lÊ	‰dÄÖóf•áøÊKU9ý×g&ÈC[!Ù4¬´”)ÍX?Ž^¶Im/˜[oK'ƒìõäà6"ïXÛ´C’™¥›i½@ý©ÐúEš9fk‚¬zç6þ¿MƒpêFJ3ÙÕ$ê›õÎÊÍÂ[IgCáed;cÚ/o©Jƒ‹ÓŠHí"P±`âø^gfãZž-l;d¸‚)Ka,,b¼£ˆOU””)´Sõ­p¸Ô†^?JRKg Mnð:QXß{)YšƒqðË¥©~^èäv.Ç’„˜]ìPÌ§Š[*)¤2ö1òAŽ3eÒË’MIó/X”E~#iÁ.‘^õ2Y¶L±QÃ5aÃU›¸áªEà)‹uI®éef«}ZÊäÓlGgoQ–g0Ö!ZÒŠuº"»ÿkD^ÚLÆ©VÍ4ÄìbdµÍÈ)!p)Kpñ4£Ä«MIrÏ—¢L‰ô2¥7ÒkÒø"2žzô=&uAÛµ([™ÿ8eŸOVcve…£!*OÕ²š5MÊÒ#ëv²>cÅšXa2,}zå—¦X’ÚŒOT"ë-WGWŽëägŽ‡(?nâ¥¼ÉóO¿dýN%	“µeéù}E2£yIi™ÖSh¹¡m¶³¦ˆµ!âŸÝ ûRSj‡•Ó¿¤_U?†JzOòÖ¸o ët«“mãÃrNK§ëÜ£yi"ò„àžÏ ó.—vÑßë=q¡]šÝ@•ñ®’ºe i]B~o­øs…pŽrïÕVðCøþ&ÐnB5jò$L³×ÂÕ§Êñ	üì×|ëC„y‚çáÒ])‹©äò6—¡^ìt=<éÍ4jÆh/ŽN[DøS¬þûDâ %ÿ<g½(Ú$Ø…ÚMUYG»à‚«©ˆ^jd@ßªx^&ÒåÇnØõÂÞ{‘ëBxÐjeGW9R›Ç“´BQ…µÁËÓ‘®ÐJ…4	)¥>N!5ªƒ¹-æ°_Ò-KšW±åØÈÈ®»I'öhy09²ÞjÙã
Ì û/"ŒŸgúÀŽ?b…-ó1Vý[àÆÏþHÇËu*ç[|50ÅÀ%Á²=§¤>pbñwgØ¼ôêˆJ¾[Ý.0¨ã:-Yð »VÆ}ÖYGËíe#0@EÜqÚ®/;3¥^¹UmAÁ*|3i]Û¿ÜµIèZß1”)¤«y×‰2›Î]_@›¨ôI+ø^Ú˜mÎÎ=\|„Ö LÈÔv¾­ç9¸/Ë¬
–ÜFüÎ)ºZè®Ô5ÝÝt¯BcnÍ‚—¢	9QælÚÃÃy<‚öiOÜKš[HÜt[Vãñ…~Çãæ…QpüØØ„!ÉÁ(JÑÞ½^O	øP¾Ã2·åŸµNP,À{ïùG…¸¼¾ ŒÏòm¤”ì=\^\¾8ðÏUòóùùùyùÉ¡<b³rÑÎÁ#FsÛŽŽ³qÔJ£ª4æŽ7ðÙ{ÁÍ#Q7Ïn~i[éë³õ¦»ñ`ÛÃîÿÚnüÝþéÓ°÷
lý­8vŽZ a7FˆZXÖÐÒ2:žGç‘G(­á¡o¢¥9nû¶NwÊö5–1Á,Î²Lë`l.ä\"8Þ ³ƒð¯¯<‡˜zìÕ©ªB²XuÝsü¨‡¢^yIV	¦ËÌô[ðDcöÿgÜoø[š»BïÌvkè€zMÍ¤WGi<thLxƒ™xãy"
ª±Äõ	ØW À÷"Ò31o{©ø¨\b(³áÑšdÉ}w/åËõb×		ð%î­JÌg—GÃà*	ÅVqR†uÖ0=„Ú€kÀLÅ$?/"Ö—ò ¬²lYªÛ2²ËÞ|À¬Öþ½AaI–ÌëHÕpÄ}‚›Š´{±(Sfgf¨´j›À({GÑPÎ
¸Ò–f8Ø„/9µâ®\›öI¿yy×Zé¼ÜÖõ€4Ã3Å† ú	™5Ë²_,q®C2ÖKª)’2…ÕÎÌN$‹ˆ.*MzTd‘P¥)¬_„%/Å	øŸÿác¶(©iR{põ6÷$œ€‹à‡µY&äðÁ?E¾DßXc†GY&éé8¾›+½èùÇ5æ·ÎzÔ˜`ë[mcEknC{ßiÞüŽëÄ¾ätªs‘éÔ˜†;g'_84]£ÕjÕ
;¶žQ³Ðq<×0Ø­Ë9®ÉÄëqNkaµÆª]‚’a¥H,ý,ÊþÊê“ƒG(	ÖØß˜¹Lo,É¤Â²“L@yæmœÿÍq@%q{5/¡A»Y¸èlLl6¤î!­whéJ*ŽJ¼^vAàb´Fñw¨+èÇ¤æÒíÓ?X7Ö“6†çÊâM®;šGÞ@±c°¨A1)ð–”M’6‘B•Ñ×I	RÌbRDü‰‹z˜ªãr§Dþ0u¨¶XuJ£AsiaQe2GäaUk«ˆgd8M¢$7´ßÚ˜Tµ~ÝmãÛq»· æËê°í€4JÅP—!ºÎ#³ø°OV‡Ù %Ž·á}¬ÒÈ ¥Åa)/G,)»Âx]3½)L
vCc¾63ÿÀJ×KÜôZÍÇ§”m=þev™«hô‚Uâ&áÈèÃ‘ñ¤ÿ¨8'Ž¨-	¯KM¼E#ßo;qÎ±Œ`ïY•eQv,¾îí(S|n•+ 3­ºmbP³ZÍBw·ºÂâÑöÇÊ+±Em“`¶QÄ;[@6Ü (ºŸ)Å^A®ÑŒÆFÚØsüÄµlÌ
üM€–|Ìl–@Õ’Ï…Q´!¢î£¶A,/ P%‰0@ì—£d6¼ÊòìÃó7Ñ¬w#+-Üm	LŸ Ë‹³ö­‘ŽhÜS…½
Ö[¾kúóüžø7?–Uö•pæ-¶Vgíˆ`š©K"ß=Bb{”»SXøòz²£ˆÌû,[„bÞK‚ =ö+y=K¥¯ÊÆ ë9®‘ÒâùÖµ<‰B[Gá—h‚ÿCMªc¡5å8‹ý¾¬”³ìE¦¶ææÔ:Æ¯þE+[­’Þ’
”c¥&¬#o®óÆý‹/À`üÊÛ‰k@}µ—džjõXDX•½Â ëš
Aº±_Ðs3
êü/!²²YÜñ°’ôö8Ì¶$À¾¶Íþ½¤”µx€GÞÇÿ2[ú¥:>-Òä‹uœ‹Odš³»íÅÑ<4)~ánŠ=y˜JnuDëÐ´fÎžÇn,T9tð«ë
Àþ£NeÊdyéUR@zebÏQµJ‡"¸&I+¶õ{B$zVò½ö„Ë«Ìc¬Ô¥55_–nzf6ž\ŸŽ^¶Ãk}¡m™siŽ4³0°ÔIhÌ‡X¶9‰l7d† »úÕ¡ç ¹)~ø‡ZhJ'D¶öžd2ÒeÔ³ŽWjDŸL e3h/Ò¬þ+ÙÎñRš›(ÄÝ&èPrqiˆinhæ3û¸ÛÌÔ¼%³`aÔs0ÎÀjì4;´"s<§E¤à¤ÓsÒ[ÇŒçÔ~©ø¸§eU³ñªXV4BUmQYÆ^Pð	ä„^ ß{!Úsºäÿ°>ð/M’{.—åÂÄ·b¬MicweQ{äµ§ºGfnY+	‘&7­´´íd@ãéNÇ¤NØqAÜ/“ˆý‹VcÅâm‘MÇ&jÐ>Ø'¸&ú‚U\³k7†rQ!>®ù–…Q“½Œ±Eí—V%‘¨Pm#“²|Ñ m)ìMÊþ§V¸Þ_©©dvßuÀŒÈ¢2‰“ Tc)¾¿bo‘4c+pêÛI!ë@Êë„ý²ÍZf’Z8õuä„ê¡«CÔ¬Ì¿*ÕÇŽÑŸÿáh”1¨:ðìðRV¶ýq­ŒÈ³Ý#åJ	£Œçm†¶I*ƒaY¹dÔŸÁŒ)»s½•Ý˜U·(ß:£ôÌX›ç³‘açmïÐí6–æŽÿ‡å¬ÛÃâ×*|`nÐ*ÍÕ²bÙ¤ìÐv—ƒgq¢õH¨"Âò³!_»qË©?I¹oÎ^2•HèU…¹$´×D¸ç®'Ÿ÷ÆÎ»x9ijºë¾}ú»Ÿzã­ñè±d‘‹¸Þ£B8ZGÀWféSDœ‰"IÌÖpñ¿Vô`ËnF0'	ÉÜL®QyW"þŽkÒh.cÁB…-ZÄ"Të}¬ÚÊ¶NÆZ¾KªgfÍåñSíÃËH«–FH¾M­`ØZw.½€}Úž|ìKÌs-™Þ¶ÂiVÉp¤½:Ðý¶$^ ŸCM^H ¶è–}]³/ÖÉÕ¦ÀÒMt½ÆÖêÔ´æ7pYÎ`¥µªÊ×ýŠ¡
	ËãÈÁÏWéÁ4Žß~¦Æ‹ÛcyÖ˜Ykìð©ãj«ï¹<a[=ÇžU0FmãÈ¯¦¿±lÌüäÑZ‡~#WÞ4é@Sx¯Îaž„ÌŽÕÂ(ØôË™2b½Ö’œy™­OÇ¢
.Äƒ^D.>ÔšÑ0ål™tê¤I‡”(Ž3v!sp%éÀŠ>];áñ…Ñ]'í·/l°^çaLX‰|lŽi	>ÍÚyú;´VQÈXR¿—¶5KQ1’:UhÍU	š|Êo‚C™[‹dkëÁä©ÙÔ
/F2b5aMmûçT‰Ø†´A‚4®º<&Ð469ð„B%CÕŠ¢¨MÞKÙ¤ºÚ·†G Öÿº#È¦h*Xé<ÈªËÎlÜ£øoéÙÉO±þ—ÃÀmŸüË½wÐõ³“ÿuBsÒ’Ô!¿ãƒ¡ÏÙ‡ödà Öt.7ö RJZƒÊ„Z„n´Û$ú.'›™·qWí(ÚG[Ý5ð2}‚—­{vò“pÎŽ<HzË$€nÓv¿yE,FIì>b¢Þp,{…Êì÷†p||ÛKûÛQ8Ic¯Ç6wÌ¥ªPð>z#éŸ~ÑHÜômvót÷ð‹\‘w¢¨ç»¯ðzôÈ k¬É;Ü¯ïºüãG¯ðª|¯Æšü]~ûë»",Í4õÂWtMX‘Åg²íšÜÏo?·5A9L±™sâå¹Mb`^Í•‰Ò¾KbÆl×æ]îé®N±"$ŠRc¹œå}ëTvÓ’Ö* K¬z»LŽ£k(®åš†-ï³]ø(D²^<å¨A×Š‰è›ˆým¼â“Œ=ŸÇXñYAsõ!FÌÓ1‰Ôª÷  âúµÓ§êÀâÈ¢ïÏž}†îÞÞEÛ‘ï;ƒÄkcÁb‡ÆH– Ù…®Êq‹2™V{+&!áV§Y³[m“TK©©rÚîî³âÇ7þO­¥¯jâ1‡F3•8—øÞ’âÍIRœt›ð-Â`‘2ªž–ºŠjþŽÿ  ÿÿì}ÿoÇ•ç¿R&|áp­™!)Q–Š‚DÉ¶`Iñ‰”×{Š7gš3Ît»{D1üÃbo±X‹ÅÝ"XÄŽÎö‹‘`s‡EDäö
þ?xÉÕ{UÝ]U]U]=œ!)YDæLWWWW½zõ¾~žstÍÚ–÷ÜðÍòp¸Ñx@ˆ*c3õ™©úÔû<Ë"M›dm£ï?£PÅ…^¨ˆ¥/@Vó[îD{¡ÛM6“ÎvUñ9eÈUÕZ4ÉðEx¢þ¨YZtÆ1™Rp„åHe}@fmWV_°‘q>‰+nVøz¢„]/–)år X.·T–Fd[ý“£
H/ Gév¶ì“²–núO…/3‰õËt³êÊÄÌÉÅÖ}ŒJaïøëý:þS&i:¤ÙI¥g'«õ¥•[;Ê |wS/e%¼uö)\ŸŸŒ„n~+EÞÂg,8v;MKºE4UÔ‹aÚ"#!¦,‡5\=çEž/¿Dç@ï†ÝÓ“'ïä§£›Ç%¾çt>ÜÓ\¹6wß÷ºÌ ÎØïrô¼ã~X8S¤¨¿;4Ÿ
%ªV ‡[ì†‚4J½LXâF{NÆ„­Z: Ù»Pè9ÓÞæÉÑWŒò^~uüœ N=Ôˆû«7”§§¼}¼/Ó¦¾Ú¿nØéÿ{þ;Þ?9ú"ä…ßÐ¡žÇ!¥Ä§~<J|<A×¯-"7|CŠüSÉgCˆÝ=5ØÑ©)òNè§i¬#ÃÏÜe±{¾üÒÍ‹ƒÃ:/ú´@Ÿ'é&A>òŸú¡«*SƒzköýÚðýã?‘nôjíõi‘ÇW,/x¶5V8ßù^ù‘µ3SÚ«ýL »Oƒ(«°ö–rÌ6’‚SS-7õ~? ”pü¢’Ö9ëÈªÇûÈ÷–t&ÆÚmbÁ¾‡¨¯!•~­L!UuvMWyÑ)¶)¬ñ:'›Ø³Âí¬lÓU±ûé]þY<é°›ýÅ®+Þ;ˆžæ0†rè“æäš‘n@eîîƒ·ÔüKª›¦<ó!cJGà	Ð6NÙmæÎZN*Ãµ2:ÔU	¶vÐ#Bœ·ôÈ~FHŒÊ=àœiÄ:½&³|kž÷7TrÉ&cÕ9º66ž0ÂC€A’6é"vè6\f`)6ÎöØ°çŒüÆRŽ½¸¬þ®ß¶‚ä…MWÒØ¥ ¹!´ÚP¼€7Œ£=«ÓÜR)Ü¸„EÍëûtá;}€pÿÎRoÚZX@-ƒ½.” è@ôRVAúgšš¸‹j Nµ­­GÏA#Hnu‡ÂÅÑ?;Èlñ ™ÄâãÕºîª¼u%újçK‚Ÿ×ZIÐµrÙ(H)®ÌÉ¾J%ûXÊ‰S •o»w(ïM}Ì'³Å{Ü:cÖpË½n"‰™{°J[±—ô@b–ºJ¹úrõOŽÿàe† ,¦Ñ0äÐ\ÀÆÎí±Ee‡‚xÜ³\úËÉ–òÖ`Pc5A™ÊÞP¹væ¦§Gã”—’rŸoS`Ï'^.§Ð
¨Œ™(¬Yl±³f^­*ÐÀZ=Šöì;"ëJžÉ'+7Èâ7·¶ÖÚy{k(ÏDü³bDWr@•R¸)L:íôýÎîvô¬^½ÓY­TZ‹Ï«àmÒF¡Ó%}_·m›ìSùß¹4D°C
€sÁ±¨„PR‚¿PƒŠkt`(0áTÍáøªQMüà'Ÿº=¦²MecUÈœÛ^±?
›Áú,1^k'QÜEJyJØãŠ&êÑN¶åPN˜iñ¶	±œ£ØŠõS äÉ*™çOó—(÷Y€ë*V-zI<oôWò–ìº—tæ¬„})Áíx¤õÂã&»Ã+‘6Ù‚Fk·b*Z?•CLŒ"G»šj*-&NdõJRŽ€‚m£±Ù+HA{æñOÏ M…»}/xCGÆO}:Ê1DlTT4ziHŒB•Ôà×‡Œ
h.rþÅ°-läÄ[\(ZÊL<~Øu¤+ô…§”-ý2|HIO-Õùp’Ú+ÂÕŸ×þË©P?×XGå¼Œšý
®‹©LÅÜúVß‹HJg×©GÞÈ¢¶
Ý˜Õ_6¬ÛQwßü(f’°¼[‹AÛ3FÒhD]Uµeßß¿sçüÕi?¾;ô‚îøÖ´¼­ìq+¡lÉo,^"+‹Öv W5:—HÐ}¶PU»0·°Š„ ‰Šh4ª*„Á˜²©êlF†£‹´/3™*œQöÌP¶ñsÖTD˜1çÖè’wÈÒ!_tèÑþäÓ˜Äq;¸§-Ø¦dm°ØäEvÁë™È¨p:³‚V¿ÏŽæ'­Vþ¾„¶7¥¿¦uÁú|<ä9ƒ ˜uÊ!ºä-°ß8›:\¬NÅ-\õŽ„]U6Üy˜ëlQÍ%ÅR|*ØXkËu”Úr±¶œs¹×ÊpXy"¯Õk`uêÖÀr
¤pœyçÅ	ëhJM¾kÑO,®‘{Á¨ƒÄÛñßc@‘2Ç~DäÇù…¢~ÓÌ§KäŠ(6• «ÞŠ6‡äwÆ<˜y—Uø¬‚<›ð§k2¡’ý2XQ›ÓÇÙ	/‹v˜^œÝÝIú®ä“¡í:6,Ã
Ì¼Yž&ÏiO1dF6?ŒMmç°Å7áE-ôïškó¬6ßi_ÐaU—„àÛ‡cÐÚŒLòú%Ú, Z£„¼}•%u3/ºèd_!¹Åd}kyç%wÔîƒ†ó ±ËB½ò Ž¥ÎŠŠ\8t§50HÆ[¸(ÂŽ® ä« (Æiéé ø[28¬¤1Ød©„†Ád^?ÅI,5”Þ+ô2!yÑ	yÆØ±1Hœ=ìà•ˆKÔ*r o–8V"ªQØqb¬Ù³l¬QäèÍhÂØvyÆåÜ·Ì¬oÈÜ3šu1¢4íBÌN»fB:D ¸™×XBi: ìs”2žjÄE©¿è|eŠüšZ«ê°® «]GaËKyX·†ãJ:Ùu@Œ)F›dHL‘-.øÀÉŠÆ‡9ÑöÍ–}Xµúàƒ)@¿&U>µ©Ñ…BÅôÞ$Úß[Éh¤*-´bÇo,äfáå…ÖÏ¢ lÌ·çQ†š?$My¿òeRºç¿Öíü‰R}))frÔ£„¬ ‘IÈUR˜#)„,ß°Ç¹`K‹Z­x½)×=p˜p§¾€(Äcë¹šÍk&îB‚†ÌÇ›nDWe§œŠò ¶Hû™°ºÆÙØ‚tÆÇÜ6nÌ†Ér†j™l²´¢»r/³È?C‚ì°Ò*`¤líÂ&D/”Îx“9™,°çÇðbÇÓÕ¡ÀèéÈb«QâPwÇÞYz@YÞ\avéõé çTÚÝËè7O›S#7\ý8„0Sâã 2Á” ãë9¨SEˆNVÉÈ£'ç{ƒÈKË&Nz°b2_£ý“V»w‰£LT¿TçI@Ó«DÙ‰î:ºŸà#ïÕ{ÝF8œï?t>û‚3Ê5 n¯y¥N°ÊÌ
¥ý)ÈNm)iæ¬ÎT|r–Óà.*8ñØåÅáEpOU§y¸XaB-­(c?ùaçÉŠ¤7:ô¬*aFCÅ‰¿8þ—1ÄæývlAv/ØJtè®§1+/ú&W§¨^fY^gÂ\Ð%#zs©Ú?å~ÖÏòEš3Ó¾·Ïí75ŠŸé*¾¢]ÔÑ™øà,ñ:Œo˜ô|a‡dCp°eF‰»DñRçgsxÁ—Ïž$NÏ$<wÚ¤ÅY†\${rAË5P£Î)ªMèœlYê/Ì´Ë:©ég£WÇ`Ò'Y¥Éõ¬ÄÆvIV”³h°9òÂ–r“,-Ñ“xiñ°¤Æñ(ÄÑ~si¹u¸Á\Žÿ pK¿#vfKÙìÓ›G3ÂIeëšhŸe6yïEQ*cˆô…)5³¼B¡·Z´f³’+t!¯”×‘EJÈ•2LAÖrýŒ¢ØúêÌB6D)TtTY„Ò«÷©,BuÊî˜ª”¯C…¡Î8Ž‘ÓÒoäÒ€ï™OÍ…KdQW1c¹g6S…uÍÙq_k’J¡0iE¬ˆmÞ*+œQÉUv£§{Bw¸ÊÒ¹Af2]Õ’–0xvÝh‰»ú©u,½>œA$öÓq‚¥ÐuàYEÕ¼?|‡¶8µ<R¦ºCþp§Zñ,,IB2~½ZQøõj¹ð+üä(de­äTQq>öª«ìYì¿ìÄ¹|¸>Å³œ·a'¬©™áuø½º»NMTñSY¦”†‡ƒJò'W Æ3º»³t?ììÚT©c´&ÜÍ½sÃ]z,æ7I:‡	éÀCìèSéä.æuBÏ ÖçMx¡×£2OiêGKnð8B’	JX¼¤|•ë-´AöW¹Ø(hüOùjjlNYà«æR¹.3Ý8àèZ<ˆºpþG{.ha'ù7][Èo‚VðßòuðlÜ8€õ×>Š£ ,iÂ—rË¾—|äÇÃ  	˜á«Úºõªô[Xån9RoŒKÑS=áæE•¨»ãuñ¿É À?š;q4¤¢5Õ1‡Í+E±ïV2gY•ªUªÏ­'ø2_€WÜôé1Öõâ}zOƒ>‘Š^1¼1–ôN´¥Ç¬ÉdØ]ÍÅèßÖJ\¬Fo^)ZÄ­[6Wè­Â:sJ¢6´^{R]É±GW¯Oÿ_²Otn+.ZÿrIÄªìµ£Ù_Œ;ßë~$s‚”ÙÃBÌCnˆ»°Öî_6ŽÀå§t
}o˜6—Ì5¬©ö„@lÛ0š@0
½8fz1€ÈÓã¯%­™WÐÝìû~jD´ ò™&ÍÑE­¼•ê¿‰Õñöš;IÖ¶Às)~Wv1îý0ÝoÓ½Ü˜gyáfWµy>z®÷©
.Ë°¤HLæªt2F¦m€ÎØÛf¥"–^€1#þyé&™Ïw½¸§Þw·ð¶¾²ˆøBIì<PX¤eS_‡†Ôã.B.±ùùØ‹U ±¬F˜ÅÄ˜U_·‡ú·mØ g@“¬üf3MúŠS¦ô*Ó¡Ï¡%/$ÂQ¶9Š!B^¸>‘¾üÊÇöÈöÉÑ?J¼º6¥x¸‰ƒXØŠÉŒ¹FeSDEÓŽoéáS-³V›cJœyÓâ›©½MŒæÏu¥ác—ácW°‡0ø|ìo±vÂ}ku>±ß£û’6ãè[yùbÐ–Â}ë ô·Ä[Ô_ÌsðÀÝÈRm­o†‹¿#ÁdÅqƒn˜%/fßõ÷Påðïúàs|@wqÿÆAé'ýL“{6ø”ý»qÅ™~'ÿê2ZT‡Œ?š(òÞ¶£4÷úßõ}Ðóâž¡ã%ûh„†L«E·”öråØVµ°­Zé¶Í³µÓ]Ó÷µ=ˆ:»`cÀÿêÚh¸3=„ÝX¦tÞ§®´®p´­ðl©45 ·S5†žßÍ4jÆ5Þ<¯ˆÐß8ŒÐ¯–*Èò†6ÿÒ”õR,sV‘FÅ£ªàñwº¾²hp*+:”U8ÙWTeµfMgQ‰“ôLˆ˜É…‚j¹VJ|´•¯—ÕÒL\LüaPJF£ÂXûÚ"SMYÔõò³*ðˆèk sï+pòX#¼xü¤×=µÏà÷ ñßÈ®^I¥Å`ùw»ô‡4ŸQð:9ú­G{~ñMØ"M³D~D–Éàøk:©Ä‚ÁóÉ» |N{îÿoÚ’ŠýK¤w]Æ‡ÿš6à^èòyˆµ „¶¬k`„Ü¯ŒF0^ÈXÏÖ}/IYm·n¹ëŒ›ÀŠnÓÒ£0„X±ñµÀñ+^C•Ë¢
oØJH°ÓÄTØÿø-Ã.¶o2Õ3ûTfžòòÒ}ÚõžCáœR7ùv¤‡#ñ¶“h0¦ÚFBŠy“w¥0xEŒì³ò™Ç5ÑÈëé~óÝ•¹uGTã[‰#žÉßTN7_t{ S¸ŠÞ8v•Uú`ªcêä'ër¬êI÷&i€æíÝU<Xt f“¶¡¿G°®æ–§¤½O?,‹
°Jò?ª<YU3xÊj9–Kúk‚ßI\58½me,ØìÏôæ ÇMÝ8‘h}f<s´Ögþð2ûPªÝ”ŠÞ´¯‚d±"Y˜³qVöf±¢ú˜®*¤Òô»–ÚAfKH»„»€šY%Ü×v¸daog¨•D+«{Ù§;RN}õ›£TÁŒœŠ–R-¦;€ô<€™•æ¡ƒç6âöRA"‚z¿Ù ³^‹ôÓt”¬¶ÛÝ¨“´˜xÞêDCº¹sq!iwÛ­Vk¡j(<#æ¸Ínëq<¨Š,Aµ¤ôQJÈªèSY/*	r©ú”hAëŒ“UùhÂ|`¹q¡àS¨]Âèm›©T˜±–Åæ~ØÉæ¥jŠjA÷Ñ]ëz«ÌÉ™=ÏN8#Ì6)paÂ©D´‚óU.U¨QF9I3÷Š96÷NVâV-•fÊ-áq€ˆLÞJ¨ÀExRMF›y#›Ö<º_|äÅpÄ‰²cì0Ëù¥§ètw;#Î¹%:NiÊù;±Ÿô7ö4¥Íj¾³ M…=oŠï[%'UGjWHJö
veÊêÅA—À?pD% vW‹¯ËÜÍ-&5+þ YÇÍ¼½ ‘?ó»váÂ FQIçr™[\é";`J’ãñZ7`šÙ¯èñ¦ùWUŸLA¹_àIŸÊà»ÍEž”?·¾ä¤e¸ÔJÕ"6”à‡X4xà‘ääÅ‘xê£¡DP…ÿù>”‹zñ»ûO(‹XNêåW ûÿ¼S”…¦ÿÉÌÕH˜‹|€sës·±¦Ô:#t,¨.š'ÐÎ0ÆŸÁ´ñyæç²¡6n…û`õÛÒ>l:ô¹OoÁfUpHd¨nð†’J^>J¦dÆ­ã²ÌíM‚iJ gf¿Bþ½ÌËë1Å­wrôU¶ÄŸd›Á´…×¿€Ä‰o"øýkÄÞÁEïK³¦i€XK/¾	¨œurôW!‰ÿý?<”ùoÓÙ¨õ²ýÀÈmT°®ÈÁÐ’°#Cc£ƒ|Â¸
E‰TdXÁ“¼¸A0Ì-²G/Ë{C_54£~À2»õð}rÿÞñH><yñ·ŒéÇþÎq’	S^nÌý”î·pwŽÐ£ôÆ\E#?¤C#z‡Ç~<gã©Lö†áÇ`3Mr£Eƒ­à:Ò¸í|÷}fè4ª<V\`†»b:íòÚZÛ›ÚuÞ'~›ÊÃøLC´Uì›öŸ‘G~‡Þš`•Wª¨²’îf¡ÓÛwDƒý[Z~ú½®çÈ…k¯õ¯”!r†kÑ5³µˆÎØdn¥Lˆ¿­ó.âŠGT¬p47«9‚ž»¤Ñss/þýZQoÝ’ö¸"ä<Œ9dv0œv¿ûp‹“[VÃ“tÿ=ìU½šK:ÃZ»¥¢…Öû¥ÈÌøÊÖñ¿É.x¡†(Êe²TÄˆŽLÃ¹iŒ…¥0¹-?R…ƒØêªVŠ\o—¹¯Ž¾wlpÇLì§™?d®™®–Œ~x‰µMß‹¡|°`#ÈÜ0'…"6JŽ¹¹ fQGë£bU×	PX0¨ò^Ù7f'{Í	
C±€¼ºfAÉ°54¯“QÜ¼†Ž;:¥×­FBJg-¼R]ê¢r‘”™r„Y²F^Šc„e6«óUÐTì££SÌDÍHÕœ“_¸ÌØDr8kU^ù|'ÛÏ'»‘k­TçZÂ¯‘Œi»˜šì±Å§Ò^4Å Ú9.Ÿ-<ñÝní¤ÐóãˆP56'"— 2ÐÄ>›*[ó*Áø]Õ4Úõ¨~§šYZY”36òu]Éa«ÝœìÊˆû0Œ=øÇ¬\kô–må-UI¸Mß7³oÓvªûìÑµ×(å_;}Ñ3WÊê»N”ÄÄÄ© óý7€yókIóE¨|²rJù¤lÈd=†èI,ñÐˆã¬˜éÇìòï\Ñÿn¤¶AÇYÉ”¦±ÍÙ#æœ_¤5ìkâ¸çJVîÜ–5ž³'îR™ì×·rˆ‹ "4Ùó·J¯UùÌt¼&9×•ñãÑŽÒýÉ™QaCäWôþ{1M§:ÊKC«¹¥þËW xíéÛ}!²jÔ?þ#7[==9úUÀ"¾vûX>¾Õ*–'ÜÄs¸€§³Tà~“x%Š\R¤T©à€aù	¼Rõàäèo;ò{V»´XEj©™‰]Ò‹¨¼ÑÃJ,iDb/¥Ó~ÖzTçb	ÐÝW¤²ˆóY&Óbö ÎÄŽ¦Å6­|b¡Ìï›¡¯8qLÇ:²NÚq‰5î¡]±/U¯Pçr´©cTZfyXcY5ëN^ü‘žQc° ‹lŒÑ¬&R}Kwj W;ý13ÇÇßd÷øŸ©ìÎW`üÛÀi9_FUø9D¬Ð«—èþ9yñÞÝïßI6‚Í~°“O{'’£×	çÉÿf7¬A0}È«“‰(»ƒy)¦Jœ·X¾*K€F7¯Hë…ø¬w1æ)¿¥'W’šŒYøŠ¾Áßq@Þ*.X+PÜé7ŸPâGÜêNÛ^ÜLûA˜)îÅÞ6a¹Û«ÂOÛ*"]WŒÂa©üuŽ!NNªÎˆ¼ï™~w1Ïˆý°r¬¦€=Ê;»û¨Á.’ŸCÜŠýŸ‰kýŽ¼ª©¨Sdª§ÕáŽAj¨­»tÅÆ'Š:åÅ¦>F‘ÏZ `:–sßæ“åÑ³Ÿ.þt…þÛ„?ãÞ¶×X¼„ÿk-®,|šoÙŠÂYHfIq€O*>ÿåÃ÷]çÈ­(°ø9øñ6¤cA¡ì¤¡hÊO?µ•¹•?Y±Í]©v±Ôæ|ÐýiíÍ×è+çö‘X?ô÷kbaf¨@AUÂ!R˜„X0ü½À°¸á¼kw8Ë¢×âèg´Oö4Ú0ÖIz|@YÍ>v‰MÞaô¢âãZõ½üÁRÅùH0èÅ“r+êÁa€(Ì‚ŽcñÓ õ™ÎÚ‰ç6øL÷ñ?JI{±Š)oyÑÆWVJ–·%–=ÃÏ"Ñ s[zžÜ#[šµé“ï–K]ˆÎ+²ør=“léoô$„üg%cš¨¶ôjÝçŽ8#ï¼¶˜J‹¾¿ÎNòf¾y­ï}
*LÍ£½Øá³†Aˆå ˜PÀ‹C,³oÛ±ïí6÷€×Õ~ÁŠ:“êÇá³">PZ68¿¥y ¾ñå³ï†ãZ…PHI(ÎcP¯ ¥÷<G1£ã6hjéÂ†ìDƒ(®sºŸa¿Ôc£Ù‡5w0I¼ä˜§â%ù‰{dO©æóx$K=Jî€ öñ yG×‚Ú?îóæ±ß‰öÂsýwMþÆk·b*í<iÞÃC²½,¤ŒÉ´ýºTL†@ßüê„Rû,uKÓÝåˆª,ÞR[t…O!éÐÚ"WjÍô+w}Ì†,F^/!‹­°£”ã—K$¾×}VKPfÂ'ãÝ	eÞ	@+´ ›pïºµEÔB‡¬A(™²©i±‚˜ sTKJÕi­…uYsèèÀå$ÙÊ®
JhûòJµÓ7ûÔÙz$[™¥ª ¿¢_®E¶Âjç#¯«A/MªA/IYÆîKØ§L ò¹\‹:c˜*¶ØiÛl×vè>†ÐºgÙÛ=É;ý´ŽÂ8­vzmÖ%Kòe:=/g¿…óÐÈg¤f¿iÌÒæª}˜žRk–u[©DŸ Ææ»e¹¨Ï©ñå•ù×ŠÉ—z"IRKV<1Ô¹¤ÚÉ9ðí¥ÅùÉ†°šm€	e\ú
Z¯æuÝ '£
`†çÍUëó²t˜x]­¶¾^[_³…xÏl7×}Ö„œ¸–œè.)
#r”kÅme(J§à+sÙ²váå1áÔåÇ÷(%cñ@·v˜êÁo¥§L3r|”%
ÖöîZrê;þ@Ä»Ñçò›š<ä@+¼´ßaÃ‡r‰4Â”.‰Ošd	óÙ·Íàç>š–œjà°ð›æy½ ¿8ôÃNcðQ§¬IrrôUí×0Ç²gÏ([0X
ã;Üvä´‚ˆ;ööë”·Ÿ¼bluÑoXÅ«dèÒ¶HðçË&¶%>YŽùyˆ=4F±ÿ~a¤å=k,A1,úì€ºQÁP–«21âòtB}·0làWU¤ã–Í>µ}Ú†À¨ÂÿŠOrø1¢ÊðPcˆTáWåfýwYy§ù‚8N8‡¤M°J#"¢<.{ðÂï–z/í¼q(O{æ{è¾‡6½ñÔ¶Ï¥&ÓåÉ ¤¬ÕI²å+¥‡MXŠDW§!ÀÄxöUøƒõ56ÙE#vq	·X×dZµ<ðáòcÜ‹uð~ä>ö±TŠòƒ®¼Ç¤ˆ¸Ó£Quü$iwÏF„‡‹×|ÄÚd¤2ý7ïFÁ8ìßË³çëßÿN<{“Oüsö}­=ô‚0Ÿ PnG”7AhCÂ5þKÄ`„ûÑ^Ñú×íÉ³é ‘brm·ÉG1˜ä!o$JàÁ UÃ>¢;•a'Ž Lj~”-{KØn7[«¶eùJVû8«jV(ýôÝ”†Ë†—5«Þò—Ô`üQý•z®,¯€	"÷JÁ›ea5t¿œöƒqÖYabž!ªøK!ÚÀAþ
zÿ¿¸¥¡Kr%DªšlkZ¹#Ã“£Åôß„o­µ…îºã'8¡Á¡”¡`ÑÕ‹˜>fõ¦ñ"äñvŽ¿!aÿø7Y„3Òïë
ŒcµëîÉÑ·p¿ €«æ›do ŒR™Í¶y:å†æ…›ãíaæ`jÞS_Ü&Õ½êò›ÚêÞ90c?Þ£‡Ì\¶›Ê yZ•Æ¸ò.,ØT‹Æ<Ÿ”™¿ø-+-þ[â¡%78è
ÃÑ¶2†y1‘>ŒG ›2†ål»e]€j¡ï°ŒQÀ<ÍPºi·<÷8Ê—ž uùÆ?–îsË7Ž©0A%ƒ®æ¢&NÁ ¬N‡–jÔc „º!bA?…ô†Žh61°<ÏÐœ<èŒÊ&VšQÖ"›-ƒ¼ÎºßŠƒ^OØžŒFŒˆ9ì9Ì—(ÑòPqˆ•D26—ÚjKC¶¾–EÑ-9¢F‹±éôõGÑÎ99L½ºHXiÇ©B&XÖ#iƒn“ò^¿‡:lÌŸ%»v«Q
Ê°B•prþ?dÅ^·ßÀé:wÁ-(x%õ-ç›>ô÷!L*ç<~‹ê#*=<VÏ^WÔ2«.8Q†‹ŒFß‡h,sÿ¬Þ‹elY¬L
ïÕH[!—ççYùâ=?Þð¿±Ð¢"æ`Üõ“F£˜mmË[ †°‡Ù­ìõî¥þy¢ÓVÐ=Ì×Çy¸žý‘íjhn#aËÐ,èqg2QõÊÚ—øÍ•r8L–d]ÚÛº¬UßäVœJÌšXí9¬‰ãÁ«ýQmÃ,`¤9A‘R’Ñö2|ú%Y{ÈC§ð-t.œÉB²&WS½ì/¼S	X€°{6Ÿ@1ðæ“ÅÖõk:3ðýï?¥ô‘Û‚\^š
¥o­¢´¤þÈS–ÉäÊšd?Kí¦Ÿf“ Ôú#,áT¥Þ	½1»O(Ž£è¹XLGß²žNÉ2èdEÑ¬xˆZÜúû€ÈÝØAø£Ó¨TþÇ°‡@ÿðªTÐÏ†w3ã4Fµ­¬´­sé•òÇ €B†cPªH~Ad|2	¿Þo‘é&ð¥˜ÙáívûÐa ¡VKdem‡‡ÞªP×ÌÊZ‰ïPmÊ…ï,À8Â)-µ—	ËÀCÁqÈ b*ñ•‘¥,¶›‘”øäƒÈR¾M–StHãü âõÃLb†$|dkÛV÷y¹"·2ó<¿ô2KÉ­-û,û”{ª2f6ìbDA¶ªåØÅ¼Ê[é²ƒq„ãÈé`”¦ÅUˆ@ÑadðõQR¡¤`u-³÷ÄÜgú%ÕI ©¡Óâš¯±è)Œ}ØaÔÚKÛÑ3E±Uä>ƒÉi¾Í^ÃßTN––5,Ö:Žm,OÌïrÂ»×M(¿c<¾X+†Q(éäæ¨<0Gæú9Â‚5ªLææ.½'t‹Âß—õSKÀÒ!ñ‰?gÂ3ººðýâÌq¶lC0\9Ô_0)±²)J%M}%C[ÌåVØ6>´ƒ(IOÃX;ô^vxâ¾.@…ð,š?\°%iØ,z9UõØ–š•`çÜ{½¥°P.:–|ÝÇ²Aviìx”ÆÁÆ÷Û}ƒÆ#ç·›åÐ¹R™‰âÉ9m–’å>….eX÷{aÉÏ=eRË¯‘Éê<Ö0ïøà±ÈÄJ¬ï¡–N2&»—ÝZ!dšÖô\L,e–¶OLO–«æ’eQéÖÀÁbEßIYÀÚ} ùHëýìøžÖï&¶*Ï¿+ƒI°ô\„…‡qI3ƒAáâóVÄ¦>—ùå›êù÷âxgÐß 3Ñv—)CøIˆ¾DßôûßÓK²h-ËÈ¥~:ÇÿŠ
6ki'ª¾”,n©Ü+'7\…?Tg=Ž£'ä:,'àýÆcTK…guØŸs¸®ÖT¹ûÌàýA´í2…õÍ-*5Usv#¿ïV’½*†`¿ãlµÏû¢Ô÷ÿî Ð@ïpbž‚¦	.¦ØIõ<'­Ðìa¢Mö:âädÅÃÁL¶À@>:Ç–ÚFc}’½•þq–Qel¯Wzª½ 6$U&ÓéšJu!p†<½O#°M…&²ýA¹@#íç{Eó‚‰fÜ½,gb¦p0TLlª(+L^7“E£…FÑ›uõ¦‹å•©˜.lÆ‹34_T0Îß„QeÄp6cpCF·enj:5NeÖÐ6J|ÁÍªQË®1‰eC²3¨ƒœÀ°ádÚp{èÄ–›Í`Ý°xFK3-ÞÚqj{ŒJ°vŒ0²Š‰«ÉÃâ.ŸÒ:‹ðÙÙB¬õ™ØD4#8’
*Dî…ÀÈ’énX1É!gkU)¹íÜÔ(Ù¨÷¸ûîÊ7œ£O”ÅW™}–~<IáªvçIÍÝ¼zÒ-oœ{oœ{oœ{¯ŒsÏ]ž™‡8õEöïÁøÎÖ»'=ñ¢ùöf"òNWàÅ¢±Â¡ôšzùJRÎ98ûjJ¤åžŽ>D'qó9H£Ú†o\|âPOéâ“ÄÎÜÓ¬àÜü|%YÛêî“ŒôÚ¹»À^¿É9OŸc/gäñã\áqB§n® 7:q¥ákÎHØÃÒé‚ûl™„üì‚M@ºiÁ&ü¡êñ	¾§YzžÖH_ü•ÛÇ2-ÎjÃSf¼…|{<ØÍvsnyª·£¡Öƒcä¸õ†×~‡÷ƒ“£_ŽMBÜŒ÷x¾©ËR¦ ÅK 	f¯ãçÐÛÑß†7ÛÝF Óßöå§‰Öo~b„À®–l@å6ä&™{ù¥Ç34–­’9•çTÕlö<æîÎNÐ	ü°³?1—)ºpæ3Ú[~(œ&Ç;gVS,‚–Ûpu}V0óó1ý…ì”¿t#¹Ì•éèw–Œ¨xžž×o{i§oãHJÓÅ˜8Oº5LÎ—X´g¶d¿ãuçJ['/þ×Ù8yñ›óaG[?>þË‡ôŽ£ÿIü|XaÖ‰¸6”ÐV˜S‡ŠV²{rôªv÷±ó/†¼€ð«Î·¬>+µIz\Yâ@:ºx³â&÷†@C!Ër?ª“
v»£‚kšNâ¬ÏêW^[|Úÿ”HXÆçÃI ÀúŸ{qàX>ò9Ñwÿ@¶ÿ#È*„¥b§ÇO>6³”uŸË4°Å	œ¤ü™tôŒ] ø—ˆÝ3¥Ý­Aæm.•œÌCˆ oÕP·Rã37ôeÜMš¬@áÇñ%ð‚1%d·Ü'@¹Õ%TrY*–œU”‡¨…g~	ý5/;²•½.ðkò³"tþ(ö› žï€6µÝCÏêÛåô^@‡æÕÅöšW)_•+ôVâÒ
ž<­æ@OuñÞZ/œž0ô}Ó¥k%£A6æÎ/°õn‰ì%€À‘õüÿûËß‡ô„¬*„-[_0û–y­Œµ£ŽÁ=…<p^¼á6]Íw³	ç5´¡úÜú<þ*´ë½z®aÜû=(RŒè6þ¶súÑ‹Õ&
dŠ¬Ž»Pjj¹Ó9áLújUc2•Ðæ]bðŽKd¸]=ÝºÊ®Ø 
°£ÍG\b *â~"?t•yrldUúQ	ƒ•”‰…5"üY„l{©zOƒž—Fq«3FˆèÕÚ‹élÑnÐWé–4ò’´•Œ;€“Ù êU“
ÿ3=!AHM”ñä|kNéà°¤¾­mD£}S%½aLp8’7óG`¿•›É¡^€-j¥I½à“‹‘ômÿ ÕÌghºz<êz“æºBì~§|WKósSó€gyîö8Ày½ì¢JA’OÏÔíU~t{·?&OQ9Kû¨¶•ÌX2xX+AèƒøÕ)›×/´–g&ÕYÄÖ€NzÃ
Ÿo]þ«¸ØgÁ.&ˆ˜)ÞÃ!jÆØøb÷½}ŸêÊu¹„r>ÌBŠ^1qŠ-¾þ†Ohéôü¹D9bæ,xÄƒ OÈø­ÌAß²&gX™g
/;ó†GþNì'ý={Øè÷±XVÿ! b0ØJ·OŽþqÎõ;Ýyüyš1ë°5AD	»ã+¤ÆÝ±4‘!½=Õ%‹ÌÆL4  iô”u}×qÄâÌ 	F¤›  hši•˜Áµ ø20˜ r;%Ü ­*/Á˜P †¶+Ôtõ8©çD ?ƒ—¡˜[o¼rôl¦¿“&zÁþˆéÀ¸›¦xjYsÃP52Hg£ÀiÕzÒêù¨ô£—Â8ÕÅ]Â|†=h¨”yÑ¸…åæ‚7˜ÛÇuáŽÌèÏÞ9<a`\î˜rŒ‹³µÍÜÂàÿ}ø¹}üË¯R9_òŸsh\1þÆÙktöžE¨\éa²øþÉñßß"âúÍ>žY&™å÷;G²•Û¿fœÁÆv¶¦A}›}­–®š¸Áj%e¤˜>L-»h	OËöïK›Œ½älÒ»Xš¿fÌÅ*vœ#ƒÑÉ%ÄÑÃ$zœÇQŸuî‚ÓŸ&;ðng¡Cmýšq£Èq.~½äK •;T3ÛTèPHt–"3thvÉ"n¨V%lLÂRr¾èÂQŒ_3†b3ÎŸ©è¤Ù¡ùFÔ0‰3ç3ò“ÎEÌà,áö¸ÛóÓ‰ø»Õ‰”š¾f¼@“â“w¶ÛÿåW/¿€°ôã?‰cÀx„Ü¾™ËÛ¸,§Ay]6½J ³Úòì9ç“ùÏž=¹:ÁïwV(Êí_û]Á’qÙ
h5
Ÿøáê%j¥vÁ¦×/²‹#ÛÊTÇ˜ŒÓäB‘£±4ÍøŒUÓ87IÃ¦h	µ>óFù0*gÀˆÔg‹òàÃ-Â2²ÉÝn¶yDu%›x°›²Û*øƒ®]=Æ°2=Æ¥|Õb,æMÃˆCÈ§)e ¸}üM |ù@La§“<=®°!G¸}ºÏS@nNÁ‹ñK9‰~èÅ»xf¡²Û5À-£þñw<=6SMVËx§ÚÜµk‹t³åbÎF”¤ïE1]pz 6Ê¿¶8â1t¸@OÈùùCüéÔ"-{qÐ%ð$['”AÀú^!£ê°KÚ¾	Ñ [+ö4½Ë<MO¥†S«"GŽÕÎ*¥w2ü¸ã%¾Lué¤k•/»^,“j‘M&mN¶úˆC×£üŠlgÔ«¾„[} ×¥¿Ó"«6eÓw½„»»"g¨âZlý+œw_ï+D¬	e€ÕÀ`ÕÂ°úÍëyey6(Œ·e±·»)pÜÍÔ£Ì‘>äPßº —öù)õ@¹± ”Æž´iChõùËZ¬cú^*ÎqÚ\)(xnê¯ÿghB4>£%ù%âÂ/úÝ°;É’óÛ¦ºàæŠ(V)0Æ©3=Ü¹ÿ@Ïªû”ÉgòPVéÁÄŒkÊÖžd¯aÐ‡’_.‹)…­/jð•Þ‰@åz8†ú?ÒþF4zIƒÀV”zxµD·rÅâ3`kÖ¾»Ð`ô`ë¥~¥„Ù.ç&Õ-Øb¢ec D¨¯þb‚èê sê­êéâ.j‡ÁÛË¡ã¯þÒ>©¢öÔ§±¸Õ}]ÜååÖÈ×lu7¦¶¶U=jeI¡ŒÌ`‘ï0XµþX]_¦b! 4>~øòKc•Ð™,¹:zAsŸ!5$TÙ|ä?õC½PU ¬]`š¸ü'ÒÎ©W-ïCF6°ŒR_°ªÀfüÈ÷’(´®µ ƒ—n¬”Ä«ÖyvY4†·ÉÓÀEÃYžë&Â+i“Áyeï©Ÿæp]2_å‡»CÀ
5‘ntò€(_3ßGâ±^€ÎY;W—F1CXE‡®È› 
•2gåÆ€§œO@<yòp
¼Û9˜Bmýºoó‹Jó_h.ð…n…B§³¢ÀGéC(Ø%K Ûº4|b¾’»t]ØŠ±ñkÆU¬ç%H¸ÅMÌäM¬„1VbæÜF~ÒÙÅI°ïÀÀû’EiWrhì–­mè²ûùÖ¿¾òtïSbÂ¿Ž˜ã* ugœ¤Ñ°Ié)¶½øLàèD¼f¼aÐ#Ãî*SùU4Xú,˜#¢åæÉÑwžùðòË<ºéá4â°tÎÏl´ÉPô:–F.i·XQ'†e5Sß^*JÁ¥q€6ŒÝ¾ ‡HÀ›‚ ŠQ[3¦RÂ%–à'ŠžÈA« ‡ú–ªÌ
Xe¹äÓè†sE«Øä€: «»ºvGª„=¥ÅØ]Y,c¡÷›KK¹™Kë˜®ÂÇÊˆÇP±XûžT¾úìí¬vùoôD×èS¨SœÕ7oía·Ñ­/ÜG~•É7ˆîÞ…›yÁsý<7òÇó®G.}ò[6¢.¯¥~¸ðH†êThá¯ÚÂLêáµÀÃdFôäÚ5Îuóà4 tøRFñË;TaààNé·OÒˆÄ H>ŠFÀ¬ÉÏÁš™J­+ýZ?žúæøFXh^¸ÇÛN¢Á˜J»'¥ã,c´Ð²Gÿ”:¤ºÍ(ö{®cã@+°á¢bÅÝ‚JÙ‚Ìo¼Mœ´AóÝusc¾Ý9é°W6×ÔmOrúc·–Ì»–®>ô÷ïD{aÞ—ß¢çìˆv7òz¨=4Œ·›jœãWŒÙ¾OWj¤ŠT ¸ÌˆU‘L¼$Û²†Agy¸—£œÌÏ/´Òè~´çÇ”S7
¤ÿ†´.ÚÆzH=ª72ƒê	¯_ ëD`=üb¢]¼½2žMfÏŽFãÎãk#*3)"/4eãÆg¯Ÿ÷}Û£¬S#µ¼@ô_Ä].žVÊQ[.HÂËlT¼'N+f˜ÐöA·qÔÖ1ÑyvÙŽŒ=ÙÎÜ=æ3cD7yiÊÒ/'Žà¶JÑ] ¹Di'™Î"¸¥$Áe…à*V
Ð’°‚½AkÆý´×MÒ›çˆø¨Æ)žEÝ™d&œ¦s•—._ä%êqÞáÅ—— ¢še©½Lšiì…Œž÷ñ‡3¡`E©ŠéG$Å˜ºèäÅtÈðøy-™j3Á*ß„UV‰ò&µJå"]:†ÁIáG?²ÉÛhv²œf,‚53O° ËßÉT‰}4o¬¯Y”},?_.‘#~mºnŸPnÑ¯Ø(JL9‹-~›Ýî´‹¬8“qVIâCR„e/ÛÛÖ˜.‹¶¦.·/_­#·ãyR!´§vÂbÅ”>'š#†‘Š"á§q0´Ñýzëó…¬BV}scÞ¨‘º¨´Ó_ü¢B …®äSñÔÝÑºª#ÓZ5l8|ª Ãá‹F\é¤K©ßÓ¨>j‰ÂRçZÕ'ñ‡>¡,>wÐ|ôZZÂÞàî²jÀ=£R(G»i»JiCÞœªDí«u´"…¶oÍW)HUï¶ú‘V”¦gâ[L€M¢¡_%+/ØÎÐ2d½N1©OÝ3¤íÚ”mÕ9Êoë@Úd-NöÊá¤,„Û\)ÃÆgZ*“ÿÜú¬ØF
UUÃ±Òc55ŽÓ\Aª>¹¦{nÕ8µ¦}fMõÄ:Íyu¸ÀcmpC/Z÷o¹ÒÉUF‚b¥ÕR¡eƒ}È]gBU`ÔwFýã?‚'þùÈHkFBÔWËxÍL?u>Åš±Û:|o8øC\M§é»†›'²)½èƒ¯§ã¼¬{¨è² O±Æ¦¼pM*>Ê)7<—„jÑ‡È"`‰4¶úÇß„½²a 5þÚÓw¸Õ!àèËÌÙú`J¬(qf²fß®&köÃe©æ¯(ÙñŠÔS#!ÿr	~'Á®’—_bVFò¤ÇÜ'ðö8Ÿ¿ÂÅGÿL~DÒïÿ=2ð`e´y‚e*,ûåôèEbÛ8†—Cá_‹¯Îª0a0Õç|bx†ÌE­wT9¯n?ºPˆyÏ
ÄÑ¾²(•(/•Zg—QŒw2Ajñ$L‚çšM:-&Äö êìò„÷‡/¿0Yùóçqk-£Þ:Œ>þòYÁòæüÂ“ÅOpC`^úB‹6zÊÎA¥-¯¢Mz…½†¾Hû(®†M¥Ý‹	zqSÞ÷@•÷²±7ìƒ_B©{~qiáHèmÖ/õ8ÃîŸ½}@Ç{Ø|û ÌágCˆÑ„fªm>Ì¸)Q4)çÔiõ›^aô¸ ÁUXÍ*ëÀIÏ0„·ÝkÙèÈ>·âØÛoíÄÑ°q@˜¨ºJ––Éá%Òøé% ))”4É
y‡¶I1û±Ý#¼@aÙs[üi;Ù+0Ïº©0Tëøð±mÀ
ñVmfV8_fÈÄ‘óc‡KŸrF2Cn÷r»Eäv.¬š¾ƒC³‰xeöÀ0o¾æ¼’Ñã«Æ-í'FŒCJ…€²Î%‘&Z#¯‹°DåKtØÝI¯ ]gCN<ÐeÙ o…®‡‡ŸÙûÈŒE@étæ‡‹ÖZy¢Âè‘Àý0—(¾É€Îª·ÿˆ%²o¸ ñMòv;Z±û ÑæOüI÷Ò¾¨ÃÏô[ÕË;žkôd³º,ÏèØ3^pÐ+øy·dvT\cºœÈÀÊZÌµÅ\×ô@á½Œ†q¡@5wW)Ähc^GeÐ"…¬ºÕ,¦ô>bê<ôn½‚†Ê;¬›ä3|öÛšùð³"Ðfvô©1pŠ}\u‰ÒÜ:) ¯Ý0Íc3°é~Ö[	Œ@NZ­ôŽ2mF6A‰Î	+3™NM}6ˆJ{”q&QÜ£´éÑT–ëI
MÑ9Œ gCKî$T’Sr’L0lÛêÈÇ0ÝS'&za4‰ˆ§þO¨ãkSj1†&“Rè–%Ù±²î­µ¶Ö¯ÛjNèyZÜEôöÂ@jEÎqI3#Z!Vª€o$âº5¤d™êÁoîºöæjÛÇ°4$Íè¯G>T7¯£t¹"BÉDè¿zù•~GžYqº$J¤<½¹õú7ìáÆ"
T7è+B°ûq°øÝé®K¯2ã¤ô‹_­ä[,Å»¬3"fËLiy†¹€ìB%¶T0Ä®L'ÕïØëŠèJ¢Ç¡i†j¹W-˜V/¿b  cÿuØ—r?[-ÒØ>yñ»”lOŽþ±³`º’öJœ«»åûNí¯Åy\ÆyìŒ“Uñ×•üWÐ¿•çØ¾Âd­*K}ÿ¯í‡3Èš×å|OÌ•'^ç¨\9_ÑBrñ„úb¥,¼¼2“3I²¿ÕõÀ9Íž5wJ´74FY7Õþl«hòçË<tsÐ'¦´ù—_Êlå¡Zp¨[•Å>eê¼-_~«Ï*ÄÂˆ†¼÷ÌÝ€ŽRÕ$AøfEÐeß¢Ø¦”?/üyà!y‘.]Œ“jh¬©Ì~¸MnVõ'þÀŠCcøo=YêT±taxÚvžŽ¹ÁÎh:£1¹_ïèä¿,Eˆž÷å’ë½08X“¾Œ^#ýY-(Ý™KhÂa
¤ ›r¯7c±>ßÍûLãqØløu1¡~;KÙ¼×Ecô¶Xê¢0PÕRØ§ôò¤Ûf
º ¶8Õ™ØÆXE|Wú(úu˜™)&{oñÙB)Žä¨s
JKÊ"cÓæã ª™Iä¨6£’y^e_ä'«§›NÕt4ÄõPûÀhÍŽ7ð3çÄ!A½î¼šŒÑîª'¶žš…„qr«qD7¼Š¤=[Y‡J½>vÝSáÇ6ý>Nšç­z}Zš§¶š°N-±žÇÆ<C¨ÁyXbðÁukL¬¿Âç¾^e<µ6Ë¦Æ¼3-[m†š-|ø&Uv£Q¿…OYÇ½¥»Û©¬ŠužšŸST{‘ÄÊÃÈ˜=c•X¯5Z5WÅÁ””cxN!æ³P½˜!QNT0œÝîXAØØØEiž	:eÈ\Y#~äïÄ~ÒßØs¼ÍAä»'G¿#¬ž7¹"¬Ž¥“2xŠHÛ”:”ï„úf9%‹´¸RÀX&€©ª\^) °•jÐ+““ E‹ö “ß¦ðÓsatðR»’‚Aæ–—¯6¯Ì	úå?¬Ì½Bø–¦pæÖ:y 2Ö.g	ÖzÅjq÷äè;8œu¨»IÎy—½‘¡Ýb)ÒJVÆÚ¹q2SÛšŒ¬V2)#ƒc*í}e®ö^0ðL,K\›>(¦(´ÈbmÙÀGÙD@Iì_B²CÇMî>ëøƒöÆæÇVIÈ%Ä Ü%ïGàoö}J
ÀŠ¾ÀÿžR*rDñ¥fˆ™‰üW]P/«C] >SÌF2ÏÛ+jìM‘e^™zf‹÷ÑÄ}d ¦¥(³ëð,¶\¸RÃ“ÿ:Öc”{ÍÒ:‹2I²Å¿f}øVXÉoéªâƒð¬a«–‰÷åWÇ/hKÓhôR®‘Ï'ÁÏqW—ª” ŒÌ òºYÆðp4ÀÂ‹@Ž~êÞ-èe—–En_@„ÀÃï€ÕZ6,y·_A€¡aLe¬áŠ‹è²¥ÉÑžMå)“¯oQœtýo<`QÍ”¼éBÍÉƒ€y]µäíä~HLÆYR½`7F¥†ê¶r 05Ãm-®>$ò~j`YÂ#»^ê5Ÿ$)}æA§?]ÍPwQåÛº6¶…äl{‹vcJÁÌ—ó½œO’6¡œR£Ù	à6=ãxp±gç>ðÿª™Ï‡z³Â.aªWtœ	&ÚÊ]&Þ’‰GRúKáõ+ì‚õ(¦—Á¤° †:à$à€oÈ_EnÚh=$Ï.‘V'y:‰é• „ÙèX6—†&^§ã(»†Ñ]b#…íU«$éÑc4¤Š4»I «¯<juá‘†³¼ªü–“»!eï¡„}…ýÅBµñ¯gÙoÙŽD¾‰¿ð®Ù·|Ãy„µœâáÌb“ÒXæÁµŒ»šÙD„˜òÏãA,‰ÜH„T¤o§-¸}Ì¢ÿZ`ùØ`blÆâ…ÁÖ/¡
"dÃó«DáÎXš!{Á«©GÂ$LMS§P)¿cFlð~I«è`@‹Cÿ
Hc¶„ï*î§ØÅûi:JVÛínÔIZ=`«ÛÉ(†"¢0Ô¤Ýmë+fn
g‘øzt[ÕÃ`¼-Ýë½8	<G%W±€2f½íåDq^:	Þ‹£!ÌŒùnÛy ¬ê¿ o¹N³<5‚T¤ª²Ù'‡ãbñ3ªw
¢pá²1<ØÌÙïtÓÈò˜z!²<”¾VÉ\Ù¸ …“ÅÓêÅÕz‰u9 »äìWa'ìõ£$Õ[	Ö¥ÌH(	QÅrf[Ðì×_~yüH[žMI+¬}YÏ®æR½JßòÜlj5*ÐLÁ¢ÖáÑó¯9-{£WÕ–ÆƒðË–4¼p&v4|ÒT¬hüe^U0WZî Qígy…ì+yc;{5mg9~c9›êÜ¼±›½±›MÉn†²\m«+ÉøÙÌ²c¦h_¤êIö²L²˜†µŒ›Uleøã«o)Ë“NßØÉÜZ¿±“ÍÄNÖ¡Ûi2+Ù†pçëf#C&3¡…,gP`s›Þ	¢ÎÆ2–¿Ë+e³í@Â³²ÕØˆ†še´‘YHÙ‰tó!k¬ùZSÌ@2æØIr2ÐmŽÓTz–Aî’	³ÏÇÏQ~ñ|ˆaŠ“çx~ GÉ#7ú‘ŽGËËb(·1âÃ=ê8Àú²‹i‹ qC0ý™ò~æ¸.–
ZÀÅ¿íˆ¤Ò2P‚Æf0uû¨ücM”ü•K ‚•äÏÈýï?&ÇZ%[0iwòÚÇ[XûªóÀÔQq RþÕôñ_ª	ã¹)VcÚêô¿ûä™¦¢º4­³µ

£Ÿ¿MøîÎNÐ	ü°³Ï*›;•4/nr(k®m|VÖaTã Á„a;qÉ}FLŸ)±*œ[Ê’g¼ ;%T¶ê“näÑ!S9+q›³›–¡˜Ÿ›úlQÒÄMb½1Ï»ÔçNÍz6[b’{ëâ×€ñò+Ò¡;ÆXÀÛ %2m8ÄdºòÏ%½Ðß+¦iÓøµœô°tW•¬W01ÁäÜAÒÁ”»ÆÇï¡x¬ÓƒYŽ¦É1¤7JsöÈê‡Zá¶bÚøÊÄx?iµ{ˆY{.OÅ©+9tìjqþ¥0Qüñ¨KÏÖbÍfº—H™°•ßò…[Ç“7í{û¤íŽ’;þÀ§âzåaÂÚ9'–æ5”éå"Å¾¯£¼»oü@~é{ÉÝq1º”ŽôìøÞäîEõùéGð0!£G<&9ŒFqåë°±•1`ÚÆù¡uSûz§K:0ÓYN?Ì+ñ­ø¥ç©ËÜ¦ ¡›¾@Å!Ž£—ï:<\W©mV‚ÇˆŒÂ-Á™CXš×ãgŒêÃ$þÁéc¤‹iè›œÂJÃCAÛUÀñ£>äÞ" ²pVŠ Ð€•.çß[äQ“Æ¤Dú ¿Ã^±êq&d·Y5dÜ@ºMáb–Ö8`EÄà&œ¥Î÷ß€¬õë’:þÿ  ÿÿì½kW–ø½E¨VÓ™ÙªÌzð©(I©¶IJC–ÔÓ„•UffFvF$«ªk
poXÆ`G€vcáõhíÁ´§1cD,ü¡´ó?è_²÷œû~Æ¬$%v+²2#îûž{îykÕ–AC_4ôÕHÚ–/_ìÍ$•ŒGnc‡Î4Ž*@âêZReK>f2(SöK“59ò]àÁl£à²…¿:ñ‰IqÃÒ[˜ORpq©#0ŸU/FíÜÊ¦œ½»¢	ø…Ëš‡¶I3güdœO oP,ì^[‚-'ÃÅØ-
±cöÆ%–ó·º€8¹ÙÆ8>u„Ê÷‰ÝBÀ†B=Ï¡WDyhe¡#&¼²Õ¾©®4—Ÿ®˜òPKyÔ+¨VajáCÖ1ã«0wxª§îÓ½[>û-¬•šP“m¦’PX˜^ÙðKÎœ&Ö´Ôðåä.ú„ÚVºâ2#Æž>Ÿv¯óÕá¾i9ÌZD9UöŒ‚r¸š!ˆ<5µHÞwISÇnÖVÉ·àp*èëÊúÚ%QŠ?TlÖô—]õ2­³ç–ßþ<$áñ˜ƒCf­â6Qv>dG™|psE"Ãî|
–tŽrnS¹ª6öªÁÄ5r!²0#¤€¬v‡Õxt¿˜Å[…8Ó2Nü¦v6atÙYxìt-šîä¹9-ûðy[u&†ôÜ)hÈ8	cëÖ5cµéMAiÒ±døUí_ZÌÇ.ü‚Ùa]=³ø¤’>Í#\8O¤Â_Ÿñu2áë5£GYæ “&Ñ˜Zü‘âëCNÙìcô;?Èè84F¤×Cè’ú·¦åê+jÈãµÎ|šB¿}±b_Nx«G6ƒ\ÛØÁ¿íÈŠy#ßâ³2ÜXÙT}­Ý¬2ØÓî•z%¶}ç/ÇrLBñì`˜ž®÷6³ñ³h¡_Xì'ì4Yt^mñOÎ7‡8;3·Vwx9Ö’Ý9"9¸¡ëÝ¯–ç”2\¹¥+sû„8­½­¢vM*ó¿Sï«Ü“Öcñ«ŽD6ÂÎd+î$+vŽr%×u\4á.ŒØPÐç€Œlç9°Î¯¢£Y:$•û-Þæª¹"¡å€»7’ÑèÐ¯DÔ6ÐÇw0 *ú.:ç)%ý}_ÜdçûºÊônª©Yþ. F*p—	4¾ÇVTWÞ¾dúS *}‰ÈQ“Æ4_åIYœ]õ(¾×¥¬(†•)œT!«1n˜è× t‡=ÎéYjCACœ8ó½Ó9Ç#ý²õJFRÀÏ6ªÜaâ12:òxbIRSøci­õoà3%ÝÛ˜wDÇØ·(-Y­UH÷=0¤ë©Oò²*fj-V°F›e—j¦Äºz1 K{ýúËá3r­¬' \„)íR¦ß`táŠ_ÿ¥3‚)î…Îî';¼?äÃY: »Wu«¢KxëY1–âòH†@»lklêZ+êóÐíNk{›íÝTB¶]]·&·Uæ>,ì›Œæ&c9ð¸|Ñï:	úLKÀT!ûÊùž
"s{.sÈ#VÑ?N’·O­îô[ÀÏÉ«™ÔfQ“gÄ°­r0ÌÙ=…=¼¢Îÿ{ú‡!˜A`pUˆµìÌˆ0cäsþcŽX±jÅ³fY›7µ†¹l7¼|vÌ]©«'úIDÈ`ËŒ eœtÓyU$}râà÷gÅh´Ÿš¢qÀˆŸ’*/óì(y2SØwŠc%º;W„®ÈÖ“SÍq2à©b•èÐ”†)Ô 9³Ÿ÷c7šq¢ü‚iEk…ú3+>gÕÈiô79Åó¢¼Ç!I¹rÍògŒ=&”TýtHqâê6g}²ò UR®8JIX%`| îÔŠ I’‡Vä÷¸“3!èŒseÝiE‹´¥SÈW4\+ Ò}ï«Ä´:LÝ„ž‚‰»GåµûÚž+äÍh,gIêN‹hj&oþÐ‘:[ËâìÊœ­¤ÛõÆ=1€ƒiðf¬E1Ô îèämcÌ+tþõ”ñÅ2ÀgsTœM|@Ï€Äu}\×í	ÜY¾;T·iZ#84­î"§"¸ö^áëBc¼à#¦oø,›åÅ í‚å1Í‹:çËH\î†dÌhU³¼"_‹HˆCœwñórr^*¶1“¹W¥ yFÎoBsÁSf )#LD¦©Àf8u=du|—°‚\’t>JgÝÉ|ìNÉFöŒú¸€év&­‚²Þ±SW}û•ŠbÕJïÜ‚hì?@P%‚	…Ýl´L-ã¼×ÐnŠg`#üá›nºB>žŽ²1¢XhÑ×ÎðŸþ!Mfçÿ½eY°]^¤©?¦ÝÝâÞ*…ò‚wVÞC2G— ìª—8qoP–‘jƒí
À2=Èî£«ó‹²«Ik0X{øpí„|’O>Ù[vËáÍà¾ìþ`·öòù*ßíš¸VúÖmgñáœo÷FÙä’ëgLð€ÉNÑVÿB›i•Wó“ù~—%)Mö	´¼ ;0¬£ÓYV‚ðÑ¼¯Ý@YÎ÷•PÀÛ³YzÒËKüëLY¾ÂEøJÝJÖ]l…-Ä¥{læSÜ ÔêQFsq%¶â„^;œÌÙà·ßö‘ÏŸ—V–`Å“?"®ñ·aäØeI~^¢e'µ¿gÂ‡¶“…²6ðLk¢ãqï!/™EóàÝYOéì½~õN·BÏb{‘¨“ü$ŒX÷$a_h½¦°º^”ªÄø6ÕlÙœËQ·‹ãtÚn“ß[I:9YMÊÝÁñVBtþNôC“!“jÛã*¹™°…&¿µ…5½ÔºUQ¥#­vÝ6…Z›ö¡!Ñ& r‘¶Ù ×Ä›Nò“„¬ lùýü8´7ð¢\o¹÷äaÖ¶øEvrófN2NXÀ3sÁMYÓN5ªŠ±á”Š™æÅp0}õš¢%ÑŽyœðu)(Û@-\¼y)ISþûÞ8ÍÑ¶¿µ§ °šóKõøçTo„Ü0!êÂ¤$Úzõ³ëÒç!Q¤^‡Noƒ…Bâ•2^µ¤ŒºÅBp8dÈ±8û“ð˜Cr^ÄáKYëIQ¡|0ÊiA6¬ÜúòÐÏ¿Ù’í ]dh­±¤¤™bI6…HóA××.­¼HÉ¸©_>øá'wISmmt'™^I>Ûú	Ô®Ù,¿ 2Œ!œ'[IRìOí^ý•Í?§cGÞÈrÒa„\”P ;×­pæ²AŽMØzfëšÂ^>Î gÔªÝ¤•í´r˜k-ƒ¤c‘¤TÃã§8kHæÞØÁ,õ¹Xd q¥†[QkjÞvˆ³©Y7»V+61“?yýÍßO“c2ÀéVò'Á°~[%àØZÍÈmôÐ1¥²ÚTT¨—Ë5ÁbÂ•i?#¨.ÛŽWì·XIŽ²ƒŠ²kô÷šß±BàïÓßè³è•ä’ÈÚÞ,#äQ	ßb%p4#äj>8®§R«lJILB":W¤í„ÈË¼|@†\IJ&7oÞLÖÃåw'„hKG¤‚Ú=©·ñ‘­‚ÏÚZr7#gc§"ƒ©U^ÎI˜KôpNó;+²ŠÕ¡$ÈMÏ‚’`àO(ÞO^¿úW>Iž¼~õwÛ­UOi$9©ã­j„þÖ#~{ÊÉ¶Õm:Kœ¹W3?HÚr-É™Ämï±åål=¾÷ñî“½{[î×;ïmïÝku¼·lráÈÅÿ¿=ú8ùéùHîl?fù›ÿô¹wÞÚ*¦štéšÓ¤0Ð&]ÍÏFór'ŸõG™§ gQÏ’lD4¬­½^Ûwÿ×ÏŸì-q½¶ï>Ü…eÚ}ýê_~ž0°‹[¯é|6I c?•ÕbObëÉ®¢r‰+õðÞãï}¹}÷®ò8`b‘7¯_ýÛäÉçä×ZòñëWÿþ³¸eíŸ¤±¨øCYRü}K\ÍÏ?»KÎé—{Ÿîm?Xâjí¼þæï>K}Bþì\èß>ú8n‘˜}Ô.•pø[:ôí|úèÉ§vï.Å!,%;ç¿ÚàCõ(ùø“]”
þûÝ¸ÅKá¶kG)KGÄ¬ÜÇyõ0›.ÁÝîå“þh>ÈÊvk÷ágŸ>&hny‹†0öÀØï’{?ß¹÷€Ê'ŸÜ»··dU–ŽÄŠáeÁðwÌzî–—ÍM˜PŠf—c·ð§®M:ö“4;é¨?r/a’¼A~pÍ²I÷'N	y>Å~²ëÝ%Õ¸X2ù3òe¤üñtïûhŸ]r÷íˆ£Þ#GÄ¬„Ø ¡ì)½V6 /bœR¢©µÊ…6;„â!CôH;-Ð&E·éÊZsb%HÎâÒ"ö¨xÔ.: Þ	Ë=}Xó³ˆv:dÎ‰/2^¥1_ÿn ç†LX0TÓQ÷z0Á|@J ƒÂVßYª>ò‚YC¶l3©
.­&ÑœÀe ®‘ ^ÞÈ³w7Ö6ësQÞ÷cÏD²VÀA»ZÑR¤—éq%ÓXª¢ùÁÞ>‚v„ÆlCü_[ˆ Vu)àá%£qüñÞý‚ÞQ©y³6¥rh¡¥ŠàèÔ<	Ñ×>\Wü$p[6¬Ý	6¿¥Åé@Õ—i}Mq§Âq,¼·˜D/æ:8K2;e×­¦NgÐ]+œŽWD|è°fA…–›J7lqÐºÂ|-k‡–$ÿË©”ˆ„¥àQÚ‰Èùž>wÚ‘úd“|J›äD©ÔRl5@ÇÆ¤PLî€kµMh=#¹¤õ’x¬Vs‚­º¬vUHÅnWÑoÉEæš®(øH4Ihýàâ¦\«p©ÑqÕHyse¼·n[(9R‘«¾¬Òñ” bS³d”pé–¶Ê2dý¥Î¹NZwIIF1K0ÉD3KÓ@ÕjÆCæþÆFžF;GÝ«€¯TR =Ö’G†Zœ‚PÄÉ8eÛŸá‚sm¹úLjÌ?ou€«˜mWm´vø”3;)Ðë‘HíYð{-¥ê£íæ "kHÈsÑX×ª´„/8Ëÿ—>³Æ®9túAÝ«£OabPJREÛùéŸeìtm‘8ÁXµ=A­6Å”®RNP‰j:Qõ)[œ^P ë	îšC=¢‹Â¡ôá¹”6ˆò°êÅ>°žÿn¼Åcû†ƒ$KXýàÔÇZûmíÜ)0œÓ°ü©]ã®VD»`Î®µ3LÆ@®HkC§PÅ„4²<\d"Î6P	1’å`Ý†°È±Vi¬áé­_¿úÍÔ‡¦;5ŒbÇ{ÂãÁlÁ™ôå–Á«©,3xev¬Z‚¢Áü„Q¢î0XöxãÌdÝ$F@RúõSèÕŽ.$–¢p}øq¹øP'ÍiI©„m×Â'jç#ï*ú1«À+Ëòç2&´L$Óê³iª…¾ 6&kéAU+ìauÛn5ºÑ¼-{'šv|E\?Üå·	 cË‘çóŠm*õê+°åzõ«Iô¡ôt	¢¡n5$ÄãáÐKuë&Ê‘]™‡Ô©{º};1áŠ<Zð˜²)6[íÙ¬8zŒ^ç¶dÊ´…ŽT±v‰6EôS³Æ +k,O¦úH=‹osí£8k6IE]è5ž‘h»Š‰¢1à^µ	úG.ØF×ãú††¶QM:ØRw£ÙàøðfE)‘ð‡20üÝtTº&$BÊîW‚èŸ(é4ÿœûv;yþÁûÊC×ÁxNFþ¼¶PýÝK?‘ò[ú©•hÐ£N™i‹íú`T¤jˆIï3‚»²‰#-4üg÷Ó}aÓƒç9d(TßwzùˆÜ¬íöÓÏÐ¤õžû]æV§Æ_Ò¹¦¥Â;Ûé€†E’r”H„|z±I¡-ïS\ÜÕdªôÙVò´D8Z´g«I7häk¨Å
6
/ÁÈâ¼]ú÷VÐ®Çü`¼rd1nJ…¡eæ8æ‡…/"õy”§•!lK-ÂƒB5¨­øþo©bÑ!¦~=Á¤ÉZ{™Ír²²ŒrÁ5fâFGc*·±…ýaŠ²Ý›ÊÆRÀÁhHø-¶½»û#-9ú¦{ŸÇÖßŸ;lƒy†"ryFå_‡±áOq±Î’ÊÎNä2é‡¡|<ºHÞ¢»ÞãÓ¶:Q®zFÿ>êt269Ó!“¡ÄS¨ñ‹xÝžÐ•›\òÏã{d\ÞH÷¼…A°8eÁã,-k5ìzÑ²õ€Æ]ñ””›«‚q‹×ýZ­‚âÁâZé[Ã§¿¬ÒYé;›°„Ô ß“n@í™”C¦/º1'!Rmç=#+·@¦‹BMOË‘Œ¾%oC÷&á ”Wj qÿÕ&Ž¤ãJ
AÂN®5‹¡øÀÊÑ|'.¢oÌÒ-tX\×Déò;#ªŸÆqzª¨è4*d5›H?BØ15¼L·;9ÿË“ÈùþœžØèê_ptÌããKW¦­I½€0:Œº/TGHhg,Ssôi¬yŸBG½€¾™R‰c{u+mßÒ<–¹+v¹Ã»&dùôØÊ	
zT]nŒãÍÄ1‡€çYÞGÁ²>š9ÔQ«Ô„5WÆßü²ßüÊwß\Ø ZY9–¿Ü¼;˜N8Ô;>Ò¹H7rÝuÎUº]¯ïd£‘N{ˆçqXŽ!
È½Ùƒ÷Ï¿ÖHUÅé£žOçp`0‡ÚÛØ#ÆÚRc&ŠÏÜ)r½«ë®8¾¸µf®Î¡¼w
¬ÀŸ÷]ã÷IÀ¬«5m½áº1è‘àÁQ¢Ì‰Ç:˜çuœÎ^lFb<åvIû‹.©š%â«
ÃpîLè^ÉCBD€ñ®bÀ?:„!°†äŽK0Ìú/ð?yÎ²M“ývé‰ÿšm<ü-„•ÿæ¯GÉ¶ŽfH¯?vEŒPO¬!aiÍÀÈåoûše„È søúÕï!ƒìëoþÇCðOhönod±Ãœåˆ!"s·V.¾û([LöÒ}[ ¯ÁœV›ÐûîÃaÓÚt$d íV:¹‚»(Z—þÄ…ÄV M+d*ÚÐÖqt=æŠK’7ÑÆHÍ4`œNv;‘1™?Ôm»…ã‡ëÜƒ>C†‡tê2Žü4sà´[¶Ó>›{âd%íÓñ‰I­ˆHuf8kûîdÌï>EÁo |›B 6.~@ƒR#;Ê¼<²Ãàˆ<ûJwV¤!Ût¤\5õ®Î½
îÛšŠnSÝ™¶öŒðÑ^9zéøÂ
;)'1ã^^-³ìÃ7>ù’©YÊw«ã73 Ö÷ûÀ‰$&,¼èùË=H™©'>ÍUúÌ©qýÍ¤Ñøn÷2ááÐ¢VGÜ­¡WÍòqÛ)¤¢MÍ²~>-ISOKÖëõ ð2†·ýô€ŠþËö¤‡Õ VÙqŸK_Åé,{™sBõæ%€Lã*´éÃ(]‘UŸ¹&Ë”[t¶2ä]H°kóKI—¶Nqi`*ý…{åª#»Ñ"3Š>ÄÓ‹wÀÂïÝÁ¬ñêOlAiž»¼ìÏ:ÍÈ…¥$nR’!Õ&nâÒ‚ÌmÛ´ÓvÛ©*_Òaâšu8¹ÙàAŽ±šn~SÞ„çà¥dÃ[Äcl;I*óv,X·kB À5Úá‡ç=Úx|ÚÝ@g$8Hî7nSs„¤~Þr2º|³ˆÊ5¿E–ÀúÊ’;P›õ„ÕªfóÌ,~Ö±¢º ð«gŸËã1žêvÅÏÆfHóÊŒîjðÚÂšbÈcpw9Æos|ŒÙŸÙŸ¢ë¨W/P¶…‚o¶
(Íý)ßP±Š”äLÎÿ²ð'‚'”WÌ<<>³$­;(rÁÔaö0|†T½UõÒcœ™"ƒ9zÞtHÎUðluÆ,M3ƒmí< 5®	FS÷­EÝ~ÐÈ›¸#®!ÏMÀF¼ˆBUc¯¢PáËÈqñ…Ú¡Ä§3POÍrBÈ³%ÜIâÃÆç» ¬—K¼7Ì18o,ýÍì]¿ÂŒGæ5æÙ.o@¾Ô¶«ÛdÜÁeg-c%èuX•¶;·«¥­Älú}˜Fyé³ð¶#5ØÃ -´;î‘x¶Sß—gªÅ~ñúÕN“ãÌ×üë? 1²ÚÌÏ‚¶®õZW"xÑ×Ò™_»¯£œ+€F—´‹Ü©;ŠìÀg%.~’#æ1Îå³eœ‚ßò_‘™^Ak#d®?¢WãZ©éåGóX*n&Ð©•ó¬¹D=ðqÚÅQ_–œ+^’ø7º9¬IŸ»GÝg»FË ð!Û‡z^Õš×R…ÜúŽgªÙR¢üc(ÈpwA©ªÉ¨êblµÜÙå¶ÿn˜Šn.æf˜øp’_LL?§éNrco–M  ÇçS2yÒÑ†+©¾¯¯³º7~FÎmVy¯7ƒ‹é”vöÄ[0»J8"txeß8¡&R-£lHx,\4œè§)ŽqdY$–Y0‚™â¸¥F0»ÜkÃÌ˜ÇRÂrÕ_³.i–Ø7¼n±Á7^9œÆ[Y6íÿ†W06rÓå»#,O©~Í-ÞÆ2r:'fÝ,ëqÀ}ÃîfrÔÝ´Âh	mr:ÉÇp§sõ:áeÊ¤®¨ÜZ3÷º ¸E/þà"dU9™Ö…bàŸ•ezˆèõ¹æ@ÅµgïÛ¸øŒR˜ÈC5ÒéÝ-ƒ¦â1Öà¾·‹å=I^¥×é¤ÀëPx0øÇyÊ¸Bîvÿõš†=b§OÉa’Ï¯æõXBœP=œÕÓTÓ™LõJ½³üÅcàÅh°b*`\ëu¶@HÖKµµ3ŸAñ7óYë˜µ¼nOR–Z?¯QÇ<×æºv”ÂWÚZgàh3þ±ãZRÚÒmÅ2…å©áj®IvÄÁ¬ÀÛ@7a~DçHÀÁÝØxÛ9C¿ö®õòaZ{é~IK‘baTÞ8ïÕTƒi—¡±¶Vr —¯_ý>m~ ­xkŽ4èä0Pè×#7ªÏË R«ÔÝ}êAÑõ;>ab9²¯‚±ÎâH+¿¹6ÿÔ›móOÈ|›s+0æZ~jÈÝæR¹ ¹Õ&®¬ÛæÜn›ïî5Û¾Û?› Ÿî2èÆ[`<ënp‹î¿ö[ï³f<Üüã?÷5ûjqÞ’õ»jìi0TüAÒfpÙ	o~ÈM¹Æyˆ9VÕ´ Gòe†~3Te³V°Ž°ÑàÔó.™ièI6"?²Ágü©U*®Uä]±EšCù!üÖÞ…Ú©Š´¬zå¼ß'<@û9W~=I*Œ|äžZ?óŸÄ¸sèÍ;«	Ž¥x ÑA\÷NL—gýþ<«Ê_/ÞBï­­6žœuôXÊ<8/Áºùb±ØjTm2ÚÅÓÀm3NË¯»k†ëU…½Þ}À÷Òè­ÑùÐ›Ë…³åœ™½;~æDtYáËô¾ß¶Ï'ýÍþ`d"rŠƒ w$J–ç§íû	µh%ZÇëõé,èð¿tx|2wÏ¯¼<z–ŒÌýó2xË:¼=ù?½´	`ÉŽÂ¤˜3gfºC]\P”O’ƒt€Ycø;`I21.HÐ§ª\Wª…¾ÏÊ¸.[åýÓB¬Ë“*­ÊžB=¹*†Ëjf.ÄÌ0–Ñ»AVŠœ=¬²àN•ü%xlš.Éä<këºD­8ó*ùSÁB0ÍÐmÖæa½]îØ›®Ó|AÐé&8’ÿ#¬ £ÓZuÇûð;uöY3„zou±I¿$8ÒãëDñw\Ü .U‡¢)M˜“ÇÇÆ§¿t˜¢ÁU¹±nš¢	:%£_àƒACö ušaChÚÕ¤¹ÚŽÌ ü‹9ÊžGW¾™¯ )1žÿÞy±ÜU±€-i¥Kr]&WvÆ“`º¬„àã8x–ëãüüë1PÍ0§sBˆ®ßê1˜“'Ÿ¨ÅH‡ÃdP¤ä–S "ãœ·+I´Ç]ÚuüBº„Ûˆ£UúêÒz"¼],"“	ˆåöy;›ˆ°OÝ¿ €xýÍ×cçÒxußë©¥³	0æÐ½#á¿Éc³Ä»„¶«ÿua¬r•»\[‡€
uöœÍÆgù ÿà,É2@^vgë~Úëõœ7âjâxÃÖq
<£ö’PXšKº% J&=R,Œ«\òO7¯K"Â4ï¡,#*F‡ÑÚ+ÉØæ%5_íÏHñ~:j)×8%ÁyÌ€¥—æ½®” 6ÜW½oÍë/?r¹÷ ¶Aÿ.zÚÀ\x+êZ›˜Èu•2^­$ÞŠ€W¡õdàì·ö¶ä6%O†NK{JE¨ÃË\cì1¼bÇßršxˆÀ!ŽÛ) è²L@~pcmx¥¦ï8%·wªSZ[ÙÃNŸG‚‡›zv ~d(~¿nh-äªÈ$d1rkFøèp˜ŸÿnL–úõ«?ŸRûuy+Ô¦ŠMlç²Ð÷ªWQŽã!’ŒÓ|BÕÉÿó_þ›æ ù»G<jÒHÄ&Zôµ+‘È¬Ö|I[(–ëÏ ëe°kN-"ØÔÁ¢…ŸCIsÐ÷Fv¡H/»“ƒ|’W'ÐÇÿüWÿ74mìUÅýœÐ³íÎÙŸ,ªàwC‘êÛ€'?©Mƒ‡ì½~õÿ$#Bë}.hgà~yDË¥S»A\îtþ€r´ØÅp78/¼þûTÏ÷(rÝÝ—cOß"Ë<fèBB÷‘žë„QEÃcþn­ýeÿúJ(~éZÒ×^b¥e "ç~õ‹òz·v†ç¿#÷2`«fg%nÃ²cÐäpÁŸØ¥kê.)¦Û±†Ö¬ÃfA)DMüG5é&
 ,z,ŠÀ½¯:îð­§m§\z™‚’<Ä›s_T¯.ÝI_0²$WMÅ‹à+ièB™½ylQWÿG¤4HWQá£ÇhÖX×T€ù«ü¬å“I@rÈ	s‡þ›K+m¯¯%T8†—lË(`·îceVn}.ž	µI'IUo„£¹äíÚy÷ùc–&TSq\Jg_%º—u²d¢ ÿû#Ÿ½úÕ<™¼þæ¿ŒY ³	šÏ|Ú³aUþvêOç? ÖY½€°Hë×:ÖªíPi‘Ü¢mUfXhÈÜ¶7vF…ÓT¹ö5fÝèü›~r*üãd~Ÿ=jDJ³”ÔKâ¼ÚJø¸4.×9:šPæ‚BàO7åV}¨¿ˆ“B™_åü¨0;ýò›ôr0¤a)ZVl•°0Ý¯®RnwjLÁ´?')sÅN†À €¬ü+C/êÓÕ{ƒ©JQU-*JôO¥’b#0ÏÿŽ 
…5Q‘¢àça:!œ$ÎðjH]åš(HÇózm_þÓTŸ.Eª”<å.á¢CêÄ©W¿D'§ØžX ¬ø›Ô^…ŠÂË©fx’U¸”ëƒº¶,âÜ.CÕwíÖÕ›s½†-ÔÀÃäÖS† cf#ªZ9^Õ0ƒí+íÄ;£xF­®ÛJÓçw·Ðã®cv51d÷4:2?l¬k~º\mFê-ìÜ
ŸÂ½J~BnQ1|ÓTîBô¹vÅpžaÊ}Úg—é6™£¯€Döøø‰®yÉ¹åkåãZ{&øEò¡ÚP„(Õé~6²O<2—‡Seh…G‚ÚÓŽ&vÔXãn‰ËW|
ÅŸï
'“*<FN)/ø3Ê,ígY9$'ÿìOB*Y¯É\>™Î+·d®:™B€|¸&=nÊã|rsåŠÏ‰™\7W>¼ây[VÙ”TvÛ¾LGsr7{fê¬Rˆ½q2îŽ³~{šÎÊlwRµ3‡¤‡ýu<,µ¤x`‡jº•Ç&)¯”,úD‘ÍÔcJRN‰’úEãñý»vX À
Â¨LËºsÎ’|¢\Éáëoþ~)ËÈÝåÉ*CÓ­ÿlûñ£ÝGóT2"šs[ÌÚ‚z<Î'9A h_ A©¿êcŽžzýfÍï
©öß\§y¡{bá‹‚Žðûšªx•›‚ÉQC¾]õ4²Ð5ñºpj¡Õ—z]Xºõ…®Š&}þîï
¼,6¼wIümaO¶áua5°´û‚ïfãÛ‚ù¹+T-ï¦xqþûþ0äHT Vÿ
äÙÌÃÇÎãÝ½ÝíüæÀÔ³×¯þ3|+À£ŒØ© ¼é-á|XÃ•jÈMªÆ™f (^Šõý1eHš¡ŽÓxRÝKCÐcÆpºgƒDÃÇ%sK¼’1ÄÜyýêÿH~1O›åsû¬nhÕ¼A·/§é2s­F÷t½÷áõg‰4P³äÁ”+!¿®š=p;éÎJ-•çWm€U®?¥Àí¶åpZrmÿƒú‡yòãäüWSfª~¡¹ú VÎ¨Õ#39ûÑÖ~ò“%à4ÚÏ¦`cº´3Œ$@ðò¤‚×÷&ýtZÎáÀ”d•2¥|R¥û	i Ìt2H>ß%+	{gn`¨Óƒrð– Ü9ùJ¯ÓQzH°ÙOÖ~DC¶}úàî—ö0nB*Í~Õgã¢Ý>…s—Ûr§®’/Oæ¤ñëa1€?¤Ð£´³Š¡úV1û0†Š|¶ÊÓóŸ©è‘?9È'éhÛzm<L§pùL´"qéÚËÕüêÒÙ‹Duè`·š‹w0Êîçä~­ŠYvo6+ÈðôŠ»°8«8Ï]²3¨®g•÷+^Ey(‡´šî¤W:D«ÐÎ“/VqùÅ<Û«ù£3=H(ÝÈ§rMŸ+¾?\¥>úÃg	RýgÖnÑsÅb÷eûdÿúÙÀ¬BkÜe¯Ûv7—Ö×•v”qàòÓ ¯Æ`”7úˆ0Ž³1æ|élN{Û ,¨³5ù"¶©òþ°˜8›Ó_:›”mb¬"¨ä ?ÄVžˆŸj½§`Ò¼Å²‘”d£ûùVÒJË~+ù³¤Enü2zðìV›UiñÈS­U»Ú™:
‘0 ˆè¨ô§\>ÍßùMú€¢nð‚•“ë‘öPãüãDy#Úcé†H2B´ò’õB[§7¶`tÆÊ,™æ™2G(½KnÈ~J£º’:˜<!'Œ}å³&µå¼“XA„‚§±B>ŸÞ-Ž&:.Rcv¹bšöóê„PMÀUÒ	±6Âë’Üæ
8£¿œ“Ï§»ý"Ü›á®Ë—v`Ì‹´d.°rF Ì0$ã4N¬ÁwkJ#ù!0áÍÿ2´nµÅõÂÍ4Ðp2Ã¹æcíìIê…5#ìVî™Oµ4|«GL«tŸœÇ|O^ò‚Öeb¿7¥ ½‚×5‘žxá iom-¹b°5#wtuã@zTÃ¼$½1âž¤/ÂÏlO§HÒÙÑñÞ®ÛÁS8Ü½£ê²K£tß%¥¶<}v«ýô¶F×âîÉ$x,*lJÚ„\#ÊJ™.¤fÎq~7ðy>è¼OPï$É)%­”cýw•ß–¿DXåY^"™n›<Ý/ŠQ–N>bT¶FO0./»4€¬ù"/SµxN¨–CàÔõ‡;³±|œá2!B¡óÂ88„wc4¨`f—®vƒ°OGØ¾ÖY•o¤}Bo/Z«rò-ø1–ßÉ¤é1_ú“{+ÁS°*Ç¬<!f¿ðæxÖq£¬'hQiÒQøP‡°½0-ÿ¤9DŸ19sÈžL­³Géîp	öêOÃØ{Z$¤úh§(+£Uþ8p^’…¢»Ogù…ü­Áçã¬OØ{v
VPÝ"DÅ™ÚÚ€®³Úà]íÑmögcµ½ñs¶JÆC.Ñî€6ûÄõ&Œ ’¾KêV6Š6Ç#hZÓBÏô±cPì¼ºî¡;óÑÏø\¯êî#Zï	Ï|wá–O›ù}÷»fÓÇ:.ÂÀ~ySðR®`ò É˜qg–¥/„Æúäº¥Jh¯âÁ\tÂKð‹Œ\Ø„¢í<D~^¡dÉ%¶{¤ÈgÄ˜ð3²še¤½9¡…i{Éþ	ZMöç
#€ÉOŽ \÷e–áS¸ùH•YYõx²ªEZG	È­„(@	PoeRÈ7 S[!ã)çYO¥‡y	¤3W“§ü·†ÁÓÁ .Ù è•©Ê»·%à¸ Â÷Õwâ¦zfñ/3²/31YID„§Í¹)`càAqãf²¡fãa‹þôX.!äBA1d~,©X“Ïzâ€[!¨l¾p>óæX×UÎ¶Ø$‘Cas£ßÇâ+™þÃ_t^ì+›ûEæC&Žº3Œcqfà-§u§EØÂSp¡&kô‡ûl‹6šœN/ëXÓ%4|¥Œ;tR{LœMò§NæŸ-0£mÙªKÍÀÉÆxxøL¶Ûåœà Ÿ14ÞK*ÅîŠ´¢
t¡IÓ²öÚ?ï­‘í!ôMCa~d4B6ã³ÚyÃ3ÙÕ7Æùòù8ù ökY€ßj²®,0AÛóªè–'“>‡p†d•?(fÊŒzïà€¼j×à-}ëÕãœÉ d WyÏfwdÎ¥lÇqì9iç¦å<g?KŽ›í®Ÿ	&òÑ½Ÿm)óÅî“íÕäîîÇ»{ÛV“ÇŠ(ðP$…³¹tþõÂe0¹v.•ùÙ¶bÒ"×t/@?9f¤Z<²cr“Á÷Þºò¶%<&"¥*=
`“ì6žr+1îjÊZÝB±õGz-†šW$è"ªÖbPÖ#w/íuÈa÷æ¸ÒÏG{ÈØ³XÖät±VòÑ|€mò÷Z±i> i¸
ï·	}%>ƒôð×Â-ÙïI-FáÃzK6«¢'zà(Bïè ð”Ú­íxJÓà|@gú‘Õƒ‡Žj›Ž5Íh":Nn„öšµ:8©ý}œ)÷¨¡/§fA'£[-4­Ð«€5>Ý‡íQm©ïIÇÜ_>n¾=Q›gÇ²6·Óa‹aô§í—Õå Q—öÞûz»gõØoÔ£‘¤I´ùÊ±ÁXü{`}»¯¾„DHÍ\2;ÃëBœìxšNBá{öóþÍPŠì‡‡#J2©ZÊt)^g
ÚÙUHGC®G)žÝÁ1¼)wCÈý>´)Õ„ºšÚíTR‡)'ûÔ.;Rå€¸ûŒëJ°špNà²'e{ûâá™ÒŠZú)›Ç3Ù®ÀÎ,kJBo"{å¬ùLi?eKh³¤ÀYøšgÀÓêµ{Š˜pòJSzi˜6§D{=ýM®4¸)»ìAð’Š(ÕS’Ü7mc¼ô~%Õ|Á®Íõd_(¤–ÎÅ¹¦|1Ø.±Äg—¥9gjîýö þí¯"ãÂA«µªƒÐªrÏ	˜ØÒº–áÛiÓƒmIg³—Ù¼åÊ*OÛœÖ—1PmÓé~§›o_¿ú-:Ësû3ÂªTý!¹Ð@…ÏN§KËO®&ŸN3j—
¢ÖÞçŸÝÝÞ»gÌŸwaðF´ÕÏ%CÈÂí_ð¬¯&"rÿÇ?xü›ŸYí$ŠevžhÈ_Üôd‚‚o ôjzÀÍ'é.`IPCÿðN•eRwÝye‹îå•&’ì4†øL#(Ä•<Ö7€@°Qõ”ÅB©³‘g²Ž÷x#Lf¼ÚÂÆTt¦ 0/¡øV‘Tª¯¨F¶|«óP›é” ! ÏCz”<ß!’«¼ÍÅI™ É¤5/šÍysbs.^¶\SÎÇÙ,ï[¼­¨YÃ×z.š™¯*ýZ«À%üº¹œK¼¯—·nÕ©÷‰.(ÑÀ‹&ÔmûíÃ{¯eÖyú1 tV
{2qºÚ©•4ÐlIÊ«Äp´$Ã¤	‘ðõwŠA|}çìÐjA[bÅÊíŒ@ÔûgäÚ¦Ùøô›[)®w ,ÑýYÁì!¥-¤ÏHî™³úŽmª§fü–²jÚ´õ¦´‰‹Uw}$0Pá%ã?•§ZÂiþÚÝ//Ú©ïÖ±¼¤w2Ãç|Ø¬¸Ý¸»NmâìöEdî?ïØ¿±³$™à:-'ŸÙ•=ð%ëÄÔÑ Ki$¬Øé6 Š>
C“ì+”ÚæÒ!©KµþãÀÇhsØi/>m?¼ X
Ñl†î&Å¼D‘8“$q}k[¹A¬¶µº•l¬¡™«‘W±Ad§´Ç~õ2àúsW×þKÔæÑÆáûòZîÏÆ¼aòU¶ûQ¸UmÉóò3j1	‹ÍCÄßÂü1š½o—itôK›ŒC»çäo~È'xnåO±ßÀQðñœ ò‚†I-Ùù÷\°ÂÂ–Ó5¬®®&Œ!ó¬g5Ù×`ÍRJÓ¥Oõ~ŸQõ‘RrŸ–Ü—ä&™
¸'¬XmJ\¶:¢SòÇ•êûvu>Gu¥>vrKu¢M‰»„‹ÛøÈlæVÃf •î†Këš¦]S–«~×ƒU7uäÛ/Tóþ€¥¾4°wÙÐÜ·½R¢Èì¶åÎB åé³Î4·Zÿšûšûšûšûšûš»QûßÍý†‰ãèá?jzØ¤¿OD± Š™ó5ñÂ(*SÖž¤cÒ;MÚÃáµh[0¦U¨}€8´àhI\+ƒšZ˜êÝ°°C¿£W;Ø§uöinl—¬òUñ‚¿³ñàw»ü/ÓQAKÃ7Z¾Ù%‹âp”Ñ²ô;-M¿Ûå§!Ò
ì­Á~ØUÐ¤‹VÀ¯´8~µ¿Dk(ßhQQµ’n~…ÙZ^EïZ•>ØgCqò…å8‹±# Æ÷lû×WùÞ’o°]äßò•.3ùÂW‘|D¾³™“otZë«rÔä;g];t\ sÔlñ&Ë¸ ØïgäBÏB ì>ØÄv¿š»6ãèÿúÐo¬v¨ör{ œiú’m±0!à|ïe6©”c‘¡gyv7;Hç£ŠßèÜ,E½Á´Ño)xd›q“ûÔaÒþtŒ}ý¶¾4´¿T¢S5=jÍÛ­/æy2:ÿ¯qR2¯å7s‚.—“ìÏ¿Åñ·ñúÕorŒuþû
uú¿­À@é7Ur—eÝ–QjT#–3a*i;¤·Áþ„ÕRm!$gÇxAnú£XxT¶é¬›ÁÕÍ˜(z“é
lY{ŠFZhKG´òQ½|Z^á€+ü¥Ð
ß°ÂWjvüL#Ò6ûÒºƒ°?à —ŒAdÔüQÆ,ó;¢&sÙ¸$ +¦kž}Ýn]qŒ}*Ú{ï&ÂšžÐÛÖÝd/Ð<à½ié-»P³Fûä¦¸éöjË=ï˜£b7†·&ƒ«ÞÞZMVv‡xk1Ø³êñ«Ä[‘ƒªU“Þ)ÞzÌœÞ¬e^èÜïbqÅ²ÛS\ŒòÂÃfÍFñ®®ZÒŸ(y€l%JH4ÏsZrGš'¥'Âßœà[ƒl¹ç"²q¥Ì”c°©Ä`Sƒ)§´ã€K‚H	Lo#AÆPé!Á¤÷—è™2ˆècJM}Jš€†²Ái8FF¦8`Y‰ë„¡Æ®Ñ£¥Ù=E~ø¦áG?'9\o¨S!¡Î®E=8˜WŽõFw·Ñ^w:ú„óXûT{‘HGM1„U³3˜jâ)d¶^Ÿ=…ÌV4[ÎÌiýmVÑŒC³€ùãmã-5Ã¶G@½T¹·_ÅUqò	GçVÅq‹i¥ÎTUðYÇ>ƒé	YÛ k¥2ªB¶LA‚:*®Ý2¨³È2·ðÛmLJ7Ð,z^J×û¬êgˆû:‚£,ížýð€½¦ƒe•§v•7Ú"XZ›à‚¶Øwõ-ç{¶ð›úFò8[ì»6HÉÏlñê{ÁÀlÑ¯ê;Î±lá7õÂ›lñê{ÆlÁmŽ…¨åD÷jY³QÍi+¯4µ(µZP¡‚fQ›Ó®4»¬÷:¼mÞ†ö9W,‹m<¯Ù
;ÊÝ9ÙÂ 
·{Ù8ÍG6ŠrŸƒ:-:Ï´ <ùÊÁ:Ú?ÕÑï*Š,iÁMeùU¯a¶)³l9¼²ÈOX\Ö¥f¹â$ù{ÅŒ@©Öì®1ühKñÈÆWó„ tÀ&Væè $3«3=ÓN–ßB|µFkMÄ±Õ$ƒÀ§1;U·0ÞM
W¾”â›+–šŒ"ÊØQÒŒ8³Ö¼ÁÅ~0`œáx>ªò)!Ÿ9Ù©“}Å(ëŠÃö
åÄ,ÞåÄª\¦­—×¡M×£¡þÍäh–WÙøAÖÛE¸¢ö F>¡m¥*¢X±D–bÀD+Úî¹evØ^U\A7M|uÚë½í?Ím´ð«×{™ÛÏ¹2í('‹¶{7yÿ”Ô>K&EE#Æ$¹Œ“¤³Yzò\k[ù
êTªöc:²ÅŽµ°eÏrdýÊiÖÏ ^ûè$IË2?b‚ïV«É§“ÃlfûI[Æ³ÙÀNt|ëÄ‚;H^AcÞS=Ü‘úWäŽõ³zaÜ ø˜èÆ #X$ªd£ºƒ÷¾ââ¤6ÇK™ndú2}'¼ÓGŽáõé‰£¬d¢V¼`8µ©%5¡ŸÚÐ&ô#œ8a.Ñà3Á°Vz¸|à*gVòpÙt€©…oa¾–.w4k³;µÜmìžÜz~6Ä¡ââ™TV<’Oe¥ãXUƒY¥1Â ”ù`f£LñŠ V0Œù
’©}L£1XÁ(ã:ŒK¨h€óžÞð£¢Ê0Å±q×÷I-ÐÕ¯*ÕKH1Ê	>Oi¼uª“ƒÊ÷¶w>á@Û³åw$Š³‘Žo©ºè?ÎÈ¸€ì#?Ç&õ-ª!ÄbÄ±‚„&¢M˜@nHç»(áÁBâS€ ¡D):æ8òªtA¯Æäæ®JRè WA¡¹«‚*‹Ð«0‰¹«’&¢Ðkqq¹«š"¹Ð+1£Šhxu2y½^CoS…„Ô1[BŸ&¦q‹ŠøÅ>âzQ·ô¥®VáKœøåÍ
`ˆ`ŠØ#„0¢d­F)ibÒy5ìõi¬Ïu	ÞF¬p(^<Æ¥^Ä*ÊGn¶GX•6½3\"3wKå´z¿óª­ÓeÏªáùïÆ„óòÄgŠ4Ä+hÜàX18™šÄ²gVxpÙzÉÑVB€)á÷Þ@˜î©q¿1w5|Óé™úÆÝ¤¿TÂ6é/¶cŒmo9ÿáà×Kð³Ç»Á–„dK6“-wJ~¤åF½ÈÅ`††7vÙ8ƒºÒÐ)=\Š'´±jdÂÃ=‰öôlÂ˜%è™ÐÖÉñù?¦òøõz=>];\Ç€FöËÉ}Ñ1~®u£Ky@^>RÆìàÚ†LË9[•5aˆËœ˜ðÖNhIÂuàÑU<ÀÝ½÷àž/‡a’ôS
÷ þ5îF/‘"ÀäýzÉÀ’_ÌO^¿úÕ„eƒ¤YN1-SÏ»€ˆu@M=ÌÊâº‡\3_Š+Æº!]*4?W ùýÓP÷g´?w@{Œ¸×Ýt™ÂRz[Òósxä	Ý¶\4E£¢„æ¬œgô{õ
tÝà¸¬ê™%kŒý*‹ù¼æ»bÐëp×àœBc}·‡5E9LF˜2æä¾Óªèÿ>^3ªÎ«é•ãPDî	¾ÎÎãî#Ñ}y,zasËokåÜ0þàõ«—cjíÀ¦½(¾wldÈ3‚ü3™WZ¥{-«YòlS”Y¦n;C*mymúéÅQ»óèô\(£þ ¸ûûdtñé\‚Bæ ×ÚËI‚XOí$àªo¹‚·¨!sk‹ûAsF²%¬—·t÷[Qà!9.G!}‰BÀVáK.ÌÓªWê[[fÖºÏØ#B½”XÎrNQkI^ÐðIÅþØRòBš3‚(ò1µ³ä…QìÛ¿øö×€ßs6yÃñ@”Ûyü¨Fþâ%8Ç·šwÜæ/	%L9sš¸ÂöÕùï'Cº…³ôŸ’æ›ÿH˜o[Y'‡ñûPy\K€+êÊ]ÜSƒw*]ŠÏÿòDOìJ.ô »þ«¤!$!¸i0X{øpí„|’O>Ù[Üe¢£E²<*f/Êa–ÁAÿùƒ'?ïÍ«|TöþEYL¾¬Š/ñžPín‚ZqZ%xòå$;â•ù
²gO¬MÞÄªÂ*ÌÑær±$ïç£L©øJgã/IÙ/UaˆMÞøŸþ!ýÌ ¾ª+…ä¿ÏH#Ô¢Ó%w!—MWòË‡¿„•luÎzÇ£òXÐ¸®«à¾,¹wÜÏFã1sþÙE[‰™á.ìà¤£éu vO(¹ã(‹×¯~Oh®ÿ7¡ë’”äŽd¡ž¡Á¨}%>jª…F%À/àZ¼è>£R3M_â2=¢ÞAªvBjTX°
Cæ§hS¸‹½£Ulð2z©Iá¥\ŠÝ S7Cp”“ÝZáE¬²²ó€"EW¢ ïšïZPu ÜÍQHÕ{H4GAU#Ýà5¥ˆâ¥æ(ª(B„wš£˜T~p¿4G!M›¡¸¤9Š
õsEsQ¤ëû¶PÝ@ýŠ×¡}Q¨:5x|îÊÖsi\¸\”«–+å\¶”²`½…Ÿyð×Ö’Z U…•ÅZã\ÒÁà®CkÓà«éØnöÈq-°
è«Åµ>câéRó¿Ó˜5xs;§‰SÄØÍž9–ugT”9[ÀÕÑf°§Ù¤œÏ2H±~eÀ¡r1v*Ö°0’—×MÝ™	ô2nÖqÏ§¢v×i·ø{f­!SJærq†”Iã›ó£öÌU‰°§„ diÞ˜=U(•gÄ3—jããƒü¥š+¹œ’›ª{Ò½¾r‹µ	%n	½±“Îj…ýb6ÈfÝI1É’r˜ÜÝ<ñ¯%xšu7×××®®'û‡Ý£!¡%“‚œ’ƒy=Ìƒl²"›·4ìnô®@ÕÃ!•²IÕ­Šî,9˜cžÂùÊú:Y›ît>›Ž2HèœuÈÌ!¯³Ú2ý“,%ÃU;˜îw¯j#°Çp0ÊŽ©¥V·OF@ê¦Óî¥d¼ßÝ0ªÚ•§ÝM¾k2‹ÏlÐZuiëþ‹'¿˜§ääj9¬!ƒõWêj³ÿ5mÃ”¹ïåÕHk;;!²¬û#ˆÐƒè®}Ë:#	$u«üpX­ÜLÂÞp~cM4j,Ÿ=ìÿnVögù˜£ ]ÂNâ`ÆÙ Ÿé÷Vœt=Dö¢‘W9bM½:&×
Je˜³B±£Ò±k",@Ù!]CBhÇÙ°ÀX—¤˜<™ïóêæ©Ãõü,¦ÿi¼â‚OÙMGYRúAºO"sÙŸn¬OŸy à2Ù9agýÖ8(@VlˆÏ4àÿéëWÿ˜ìŸ]ôüu!V{sŽÃõáŒ\oð_—P%9*p²ÜS •©Àßâ	SÞT¸Qê¢Û4ôê•ÓQ^µ[ÝV‡:à·Zg¾6šÎtm÷nž¶_B‡…¬ü0M5`°#ü¡™¡ƒÕ&·ûð¡ê‚ànùéj‚iÂYÊdü5í$åíçïŸ’¹œuß?Ÿ=÷V=;s¾poØ =BÝêX– ñ@ƒüœ'ê½Á1¢@EÅhà¥jLˆfICR!›Ý\yôí¯Ç”(*®iã«™Ã þqœ>Ý\ß¼¼šÿ¯àÿWñÿkøÿõg(ÓD#ñ¶·	ÑÙ.Xÿ¾ÈNnžžœq@>‘&³[ä?ö«Óqošœpf¼Ð[;‚ïÞ<YÎ<ã§ðæ Raý[<‚Ûà,Ój°}šPÆV²±	Æþí/W“œ*òäƒdC±xêô¦éàI•Îªö&ÙøõV§ƒ§uÜø´ŽÅiŸÝ¢³OÈ×ïü¤:©@ñ8š˜¸ì&&‘oŽø`±mÚ>&@tà¾Aºt¤ºö’jÑT‰ET–õž·"Ê¹yŠ‚…¦SZŒ|ñtž<4|v’ëò’6³d\`;YÍ‡à-±­åM‡gÝÞ–ÎÍ­­Í}ûnžºsÜ×UÄ}—ß½Å…QàÍÓ÷Þ³¼eÝÈ¦	À¼ôa³×ÿb^VùÁIw?«Ž²l’LŒ6klÙ¹rkG²˜/†š®3wæUEØZßÙ=™‚¨Ë¬ø¡r–§“êæJ1¯Fù$ó,ó_Â½ŠÉÎ(ï¿  >`æ&ß5£Ñ×U2€QLÒ°	¢ ]òAŠ³¥I6ÌÕf› —˜»Þ••f4Íg£y¹“Ïú#C"r©2ò?ÐðìwcuÃ<w&Ý© Ð7@“—<@yÊbÑ¬€ƒeÏq'D_`'HT`…x›§þN™	 ¦ÝË*M·¦H—6Å&ò½¤¥6ÈÖ¥“|ßóIrðo9ÊñKkUR«Áœ
:»—Ö×CÔ`Óãh‹,·tw3;ö:ÏÚt±»‘ð}ã˜Lþ¨KX:€Ùà±AÚùðb÷àÞpNHš¾0[	"e4áûN~ACÌÐ‹zoùñ±bs™$®ÍâæñZ«Ð³—ÚåŸºi†ù›¥€Yƒx@^
fó\bgj·^‡‹B„>ABb“o¿O‚¿î³(Q=0$r¢¥‰oKà©ñ=µ"ÂÕ:ÒÐ|C¸ò¨ÙÔí*®×š²`ÛÇ%ZûQË/Z5“£§b…¿úéÆqvòã¡øD>e8N¤ýcLªZ%Œõ\sÅfŠ—Cøãù€p–´É7Å¶á¬ÓtÆ~®VQk—ór9bd¡Å)}.-êãŽš5„PíÄÑ3¼1S³º£ýâØKÊO>¸yúl4ºïKrãyýÆaÙ@Ð(º[~}}Bš²Ë#\´YˆøÓ«ÒÙaVõX¿ ¥¬;ÃúúupÉAËýy¹¢!E§è¦RåÇ+ãâF#«ñˆzçz7ã[®hD>+‹YwZ0˜jFÑµçäÝ`f=tQ 6ƒE,Ž¹ì(;~™Ð|w÷ãÝ½íl ÝŸ/
Ìj,“å2iõˆ­Å^& ï<~¸à­)P÷:Î–%öf„MÞ¸Á&G²¥SÊãbÅ±¤RÖx;ÉsÇ¬¨Ÿýéùï&Ã^¯PÆ‰Fš±[M™-«Åí¡Wn©4Í8G³ÔÚ™ðqÂ×æÂMRKë•[ÒéæÂM‚÷Ê-îèsáæ˜á6¨Ã¸ÃÏ…ÛDo†Ãâ›jÄÕÅðtõ¸Ñ)×«CK»17¸.Õ!‡)©Îÿ2æµäc´â<ÿÏXMcc‡ãRjäÙµ¨‹æ/Õ_Œ~eQ<~­E¯1ÄkR%°ËDKw^ÜIÉ,#«™¿¬Ãž@Á0Ö­rp€~+›>.&}2óËd:ë^¶h×šÂÁxé`0fP@mkvÐ<¦‚ËÜ6 ã" A¶®œ¦š	iº_£9YÚQvPu/% ¿ØXÛLºÕ,Ðu>Áê«Pr—¸Ý)5|ùö«kÐÅÒtý(¨Ðý;…M@Uø&…­h¦Ü2E´Éå€%iî{ “›u0ùa$éÎ.,…j²‘ú,¬ÞæŸ(57ÿu÷á0µÅ©Ò;ïG´lhµÈ?ca©îšBoQRNNè³ÙùèJPŠTãN]úgÙ˜´¦ƒâEÙ‡ùÄ¥’cwÔ½\Kå‡ßüb®/Ý§Ê¯iwùO\vûO€†»ÞtD×³V@	Î=TÆ^4léH€µ\cZÂ\áÑ‰AºÃ‡µ{£Ã %  hÒåýÀUsª£Æ6ÇZdè¬ÆâVÄ“WzPçÚü:~›Yá3m„‰ŽJ¸jV‹#þ ©üå1ltÀPÓ¿uM \XL%Ó
 ž‚keÙnøµ‘”â9å7I VW"¨Ýä° ¨’ Ü-ÍjÂ¥ç?N¿ØIº	sÕ!<dkÉPã²A•o!0vhO©¶Ô4ï&8SÃú†a!J$ÅØØô’Ôù–À-©Ût{Õ5v„6.C——\„¤Èƒ7üRÒU‹h)vŽ"md:iË ÛW+¬¨£¥R,X€;lÉŸ—jáØÝªb¨#¬7N4ºe3$8¯}ïu^¨ß¼J¢õŠØuÓÝq‡bŒ²ƒÝÅa=ÆÅÁæcŒ5Qü+#FÀ˜w”çãƒ1‚›B2Z	óû_«	v°ÃÔ@Ô™ú1DHˆkÂw
´p–_Cx€Xÿ‡A¬7€øb@kÄÝýnëáv‡âÙ_ÌÓ$V]ˆ]þÑ‚¬3:ýbàªD‚~W@õ¢ªâÐ8ýÍiDÀ:!‘‡m`â§™i94„Ã£|m^Æ8S—ƒ&êð±r‘)ž¾p"ã »wðÃiXr?ãè­ç÷Öjì à£4›ú}½9Ï/-ö^“Èì	,·<²ý,èÇÊÔzµ¾aßÙÊ~‡f¥.I)‹VÜÇ«ìÊ`g |Ø9ÇãXu±£+hh´GqÍGê¡k<ÝÒôB™’‚þ>ªÂ@zåÔyã$uçÛÕ~ýÇZoèœ?€¨Ò¹±™µôŽ÷ÄCð¥ðyÇQöI_¯‹;óJoôÜ×JëXä4³Çqœ<wÞ
Eô§=odèLI¦t¥<ï¨áI½ÙIèàÃÇ€Â@ê³¦4SÜ	}sgTË’+fT¦óäÑ^œ-ccâ8gR»c;žZ‡Í©ñ`J‘ZvÆÅõåæ©¡Ü#T˜Vâ¹jj®ÝùnÞ°Êú®!]Ÿç±ýÜä#*ŸyH'M5Ñ%äòl£ìãô9— 4À­Ä“2Ç{8‰0w#H"áY/ÛõvÒ’ ïr¥¾&õò`ÐdR&g³t4Ð+ò‡JMþª:‡æ3.Ægå¹•ÈUÃãmWFP=ÎfY9Ü9r½ã”Q9Í'^zü]kíëRÏ	þÈ›]mßÛÖƒú‡yLîâ×ÌŸ:¡ÝÃXj‚°Q†¶GxtÆhâ¢_7’4ò4cXMøÕË1)ØujS²;k™šZÑÌm5Å]IÛÜsiÜÔük5ãvedsVñähs–õgm«Mdº¶šVb¸ÙŸ†Ñ¹>yýêoNPüô¯'CÃþ>õ°ž~Œà@!îˆŸk@?èOiÀK‘L_È'æå|Ãè &
¬eXã‰¿ªÇµPì ì¸¬9VžGMƒN˜³Òº„`©:GKqˆçÿHc{=qS•Þ›‡J5;W‚ØÈðœvleAúFGMÕ Äµ¤‹zï¯Èà85¡qL=Æô˜ Z€às°ÙôˆªéO,Cy&œã2.B¼ºvÇFÂ %P7f¬Š§Ån@öŽÏ§úµ}­ApäœT¼B
sûÌ¡Ñ`ùayü_+áSƒýº[M0‡½c¸A?§™Nî‹L'MÉÊ`NÃ[LÛü8Ç¬!yùdN–Où½MÉ²…IR ƒ˜Íûh¿pÔ«%Á…déØ·©nDMúeÑÇõIqD®? ÷PBcíÍÒr¸éÈy›@r”ˆç‡–qÚUylŸ~*pÂlŠ ™Zˆ9}^ç‹™¨Òp tÅ¥>rdihhÀ‘·×/÷–ß÷Û†¨mkm1‚† …yš4º1`ülŸHþÜ@Eó&vP¢áZz¨Æ[ÚE<Œ¦Ûè¶ï³4[àNTIÀå“…	]ÈSŒùU˜6žp™w	w='›7À‡Ò¿„Ud4Ú±ÿïoý‚gU*:‚n![¿@ÆV«ãò¹aOŠ°unÜ[Å±p‘LxÎ]÷†PbÁ2J(ê€5GVç>†ãòÄ©cêËð¯ü›{M=Ñ^¿›ÅtÅIŽ[R(ÏÖ£ñrÖÕÕB%{Khq’/¶|>ô9r‡Åì„o|hRFYÏÂûUÑÐ†{7/tÜ=·´×…)ëw>óá»zõ´®”vDQ¢ÌÉƒÂÃUuÉ)8-X2Õe^ñ<P‚ûaŠëý²£K0ó÷¹r‹ï÷³_ f›ß“ˆ—´@gýÙ8¾£ˆ˜µêx¿Þ{ÞPsØÔ‚ž´«oñ¤½~õç}ê)U…r'4>qÎz6¸°ŽÔÔFãIVµ•}VFg–¾¹ÓéôÊbVµÁwïe6+³6k9®k¹¼ô>¿Ô×•òÊ“]*ñæ—švmÖÓ^-óÒ	×Ž»é¼*x~4ÇüöàêW«²°È4.rRÁûîA~œü­ðvla¿¬úºÛb—V}\™GÓgsºA•6dƒ\º„‡°ŸªIrØˆ."F\£øp1AÔ†„9ê^
[Ó‹hqŽ¼ñ†ü/(#ô76K‘¬C»Þ¯>sÙŠ<W[5|O\“h»Fnã+ˆ¸ò#†ÏY’Êì"c	*Y'Á÷%$ýøM€n¬	€÷”ñ™ ¹OŠj®§æ
;5Ž´ f¬mj²à¤=ÙÛ«­2*ïz|Ðy²/8F#úŸ`B±óQŒ‡úÅ¨˜•þ³jHˆ¨Já	Ü›<ª:LÃ'
…“¨UÑ)ÙXn@»dý´*fäÀg£¹§ä €Z©	Q·o‹lÜ¥wrãxRó7´kèéÞ1Þó¶Ë{M^å~Ctá³ÿÎ÷oL{ù‹½âÅ÷o\Rðû7*9ñû7.5\â÷ml`9õý³Ñúþeêúzü C£šÑl;z˜³0ÒPãý¼­±JË1ZÕ~88^fKKÛoF^÷ö¨¿àÂ#»vEçê–u5ôöÎ¿î×Œ‹½&<®KÂ °Î>ýN18qÚuÔ06«	!j²ã­d2˜ÈZn<ÎÒ~Õ»?KÇ ¦@iKŠ™B‚dœÎ·Ÿ>·¬hMr*9$\í4yÿ4;ž¦ÃjXMèY·›'-]¢Z×Ö™}çyÀñkIâ1ãl¤¹â4Ä‰
“_š¸@¸Å"AMZânÎqÞ?Àqswÿ§ÂÙ_Ï†7àö#z‡¿<Ä0º•ÿßc°^/x¨“
ÔÈjƒl/à"ä;Ö ƒˆ:-J¦èwŠˆÒøžE-p6§µv³åŠ8ð!7dV'#‚±ÅU€yc—41žv7VY@›ÑSXç³[Æïú æ¸h÷×+çP€Ù¬ï¸ê®Cˆ“Ý»[‰$}T˜ÊT`Š[ÁúêÕNÝHßÂ¹ÃIÒrI8¬4—C OzW [²B½SŽµMiw^­À¦qnú,"„Ø"[F÷%GÜ0nÇ®"šVª8Ô«¼ÙM±©MåèÂrÐ!&ÓwG/Ã±•|ûUkµÕê\ðˆ/y°4© #K~ïÇéÞ‰…¥©Þ‰¡²ïÄXÁBáÝVfèðî¸?¿­ÁªÂ†Íp|£S‹`ñÌR2·´ík¬W°]qÏqúVn]‚ñ–@ñ›®‹ßA.Ú2ëåvb­bz@-ÅÌ½žÀÅvƒaÌÞü‚Çhµï¤ƒÃLcïrÆIgaû@X	²j<ÐŒi8ÕŒ?Àæ6Ÿ Õe;Žyìé§vwj¸¥ÛšsýÆúº µMPÿ|zªDâ¹=Âéç,$°€OðÑ§öP(BÍøÉ0TáŽ¾9J^åFùÅpó¹ÿf6 Qøzm4ÆÈ,Üû@®é{Þ5]dé|T­@2dê­PÇv×y-ð&%ë^ã\ˆÂÉ8O”rŽŒX5>µ3ŽlDE¯ÀY>Q­ë^—õ\ŠÃLì£6q¢í‚qÏ–=¶kä‘‚€9BöUs¹$1ÀØâg;|ªëœsD—º ôa10% ¦„´V"ŠÇÂÆ	@¥ 1¼¯îýšÉp;«>itÐ
eà®ði„ˆÏ‚R6®Žá)¨øbwÐ¼ºW¡ˆ†b¤¦v,ˆDkÂe•Eµ0ù·Ù¥R¢Q¯_Ò c%´l³N5Þ"¶Ãˆ"4‘Æ}JµAOŸ%7“§Ïbú )|ÚÛŸeé‚Ì'qø$ùtæÝ{‘”ZõY…{iØæÙ>#
5=&¨
þª-?e>ëÄ>®ÄÛ@…J³ÀøVuÁ{Óy9l7©œ4ŠõÒ¨a6Çf•DÜX=`Ã†XÌ™ÀI ]ˆuä,4ë¢JëÛgYd7.Nó–*#oÖF^î“ƒ|6ÎlA•'"{s³6Ñ]t{¬l’ò¤éð ]‹‘Á%2 ‹ÆÌ\ën6–K¦¤ºnÐL^mZ6&yl{1mE¢m	©½c$½;FÙaÚ?¹æ„%Ü‘kr
†zü©— º
 9‹Þ•ÉËÖ}óAh.›ã"ôæíP™¶lIÊ¸›·Å„Î²1E
­µöÿ  ÿÿì}{oG’çÿú)ÂØ&=d“M=‡CQ+SÖ¶d­E‚Uì.²ûÜÝÕÓQ\[ÌÝ-pƒ½Ýì=ƒì1fç|7së]pƒýƒ^Þ'ÙŒ|TF¾*³šÝ$%³‰ÝUYUY™‘‘‘‘¿_ÔÝ¥¯ºûYæNQvÑ%ŸC·ÊNð[ p	‰e¦ñcM·Sšls¶-°‚Ê\©pÚîÑE ƒ&}	ÂPæá™–5t¹M®•Ð
\}Î®EÐz-	i07±PÑµ÷4øæeËCñiÕ·`ð¤aŒÕ! à%UÜì»²¨xÞGBÛæ‹ —Ï<&†ºŽÏvªƒz?k·72ºøf½²4O6Ófò¼•õió:Õ}•(1
„Ð„Ý:„¬ÂÊYwGðÀ«J?NÀótîæQ\¯)Ç8›’¥Œ£;ñ¨¸Èqrà†„:1µ‘¤NTN½RTË?ÅÑ¥…2ïLJÕ‚Q—ó$ñá‚†fs9ÔtÜ°Â´·’µÓêß(¿z“Ô–é¤U«T–¡½N›Ëçª|¹
9OASCLoN¸2…ÿ_}S¼ôº0ÁV€`q™m] ê*M’¸¼€Ÿ3àï½ç„h:åÝ›—Ë‘\äƒÀ¢Ô(øM—lRk Ç]]l^ŽkÍf6gå,	¤“¼XhB‚6{¥<É}—'¹÷ú´H}4ÒaÇM‚Í$­>{ß%Œ²½}Y€¼—¡éÒxN/.ßw½\˜áU«¬Ó
U}òT +ä^ÌyÒŠˆÿ×¾µ¯ma†™¸{t>±°_È[{–ûKßŠç)Bç ýy‰‡obtäI •}¹5iQJX	¡ýwOCŒ‰t¸3³°ÁR‹(íøV¦‰gÖr)nö—zS‰Ý6ÆûùÂw5Ü¤”x€ö:ÇÞ–yè©Z=Æ]î ¹J©)aÅÊˆ.»]–‹ŒQJ>A›è8NÆÕË3k^ˆ÷kÜâÙWïœÃ»DÕ{£~¯ªª‹ßqUÏñŠ&Q{ð—©¹/F'¢Þ,Õpü:ÇO{Ç¿l¼‹¢ôZ¤ÉTxçÈà ïízålX²Ð²a“ÎBÛM’Ñ©¶5Ü]ˆ1B3híZE‚:ï˜oL	·¦T	§œ·iÖYz›¹}²ÑQ[mNhÌñD¶ ö°à2»ro18]Ç_z>ÎWG_,ž†ÅéÐætž‹„c†‡U`…h›‘? æÞáX==f“rñÈ·cÜ4žç;ÆŽŸ¯FŽÈIöGÝ:=ÆLoåƒ’ŒùH ‘‚ð.ŸèoÉÌX‰›	}Ó˜í©ýø¬Ýa¯_5w³Ú¥/ÇÖÄÚ‰ñæ˜6†pŒ;AD©mÄiˆa¸ÛÛ%onC§™c]ƒ®O)ïŸëSÚßèúèÁ™WÉ@ºn÷ÆJµ×V4&Z´?Î1ÈèþÌa¶½ÝNacWT“ùŸ˜2ß¥ +Ã±´Ùñ,f­Ù>x5Í'‡_Ô93W7ŠÝÛüÄ9$=×F“«ÛÍ“³@üWq:ƒÇHQ©
ØütgÇ¥Û(˜ÄÞ‘nF9xòì-žÖ¿ðV¾R¤_[ûÏ˜ÞÅÐœäD;¦Mep-–ÁR»Ò7bHáãLô
5:
‘Ô+Žzç­@U÷ã¶Í\ŸQ¯Ae/¯ï$K]°h‚1ŸÜ´p}b=ŸèsRK§Ò—”èR7¼qì=C|¸ª ÇQkÓxE]Þã^pS	²M¹Å‹]üÔ ³„IäIS›¦7gÑ:Þr0‰«\B>%s‰ þ½ûc€8Ï‚*)¯¡¹¢ºÕgðosžT
q…c{ÌÍ“½²3ºþÖLŸ–U¤·°#Vø¢QFëmH'G”}É²K÷)U“2ñŽ¥suçÇÝVÛ@Òf]§ËÏ@B~ºrº»5»qe¢vçC#iÛ×ž‰{ü£'Hén<4žàÝ}aôtPf¢}#§˜ÖÑÁ_u%ú3ƒp„nIÙSjpŽ³Ó‚X®{ðÝŒq¼ï£z}jd”ª•˜O£rÄËÙÆÔJo|Ðmï–i¥Z®Ô˜ˆ¶yi›í=/ÚæÝ)œ+…á°ÖªSíèà¯ëMgµô 2*'2íuº’à·öÜrD°-1GVYH+÷<õ³Aª3—a:³`Fºþ‰|>©­ü@àöEãeÖLeÚ¼D<J¼„O)öRV¤¬ŸÕ¦mo.Ô–±kRËçFØ8¡I #ÎKñfjX
zª:”Š×žÖ Âà7öZAåNÇ]º/cÄuÊß)å#ÓxÑ]îËW#ÐS~bMôø!ìnY:XW?L·úé ¹¾£‹D©]Éã½V—QŽ®Pû°	Éë Õè¸JÅwØ:d=*ý%iC2¼›ÊÐú”r GºK|{fÕÐ‹éÆø&ù‘cž€=<*Ex²q¯{ïðón““ÒÞë~¾K›ìÕŸè‘ÃoèÆñº­á	š^hÁëM:_ü¬¤„ÿ Úš¸:§6áÎk´< ³C_ÕãÔfÌZœŽ(,‡m*öÏê¢ ëºÜí§‹`fñ@özb”1òn¢¼¿ÕwÜäËT)\ÚwG~øH™ã–+UûàoÞ%ëGÿãáÝ˜(q?0i Ì¶`Z1‚™iL–Auk3
ìÄëÅ3&ÏfÝ ýòlÖŒ§sžÍº‰ìÐ³Y9 ñ8›5@g³rõ~ç$+¦xŽCÚ#›X“é¡Þ—ŠBN
þÁeº_ñ±…g!°aÉw•3åòþZðÊb+£´•ÀÒû#ì„iMøµ«tte_÷Ã]^òYÊ€F/'Þ¾{¯‡À›MÎW¿ÝÕ,UÍ¶í5ÿH¨aúeoÜ¾,Ý#â1ƒ8eßÈa¢äÄè'Cæx’TŽçÌrçÌrçÌrå;îœYîœYîœYîÌÔëœYîœYŽ³µ•¨ÔñØÚþBßm|	Û®O‡°íá6xÀëlŸáìÑÉ:‘Û:>›\¾P<rÚš Ž%n,—õñè§Î™§œõâ?gžzÃ™§&J/uäRÇaiy½ø¥Nš]êu¨+ß|j‹Ñ=_ƒêN‚fê5#™z(¦&Î¯tlv%ÅÔ­úp4ÑÔ!Èyä9Â£ Q¡’Ó‰P´ã§y#‰
…D[¤ÝF1@^=ærW‚Ií{ƒd+½Ã„¬	¬×¸5œ'•FcñÁrïÞJ§S™c™P!Þ®¶‡ñÎn8úÓóÂ¦DÛkØ×®G8èµ¬zíÖp¶òç•¹'KOC\4¡(¢Žð(Ÿ¸„šÄTÅPmQAº¥0¢¦BS2„vLê'+.”á²¸(Ùc0æƒ-gL9'Ì’s*9ÓÇ"ªƒ¤fÒ5&§™1Í1Pò§‚‘_šŒf"D4S&¡™ÍqÉg&M<SH:y—ØôäIÿ‡ïºG„":íÊØ”+“¤[™(ÕÊ$hV&E±29z•IP«DÐªRe,:•±'‰)LãQ¨“>eòÔ)ehSÎŽ¦{)RŽE2ej”1hQoß(såË
¸¬P&J–R˜HÔr¤T¯ õDõJ ë>&Í¯DèrØùRŽa:‚°ä¡l°#Ñ”§Óˆo•ÑËŽ8·Ö5‚@%JgÑRi7âÊ¤ zv§Ò©³¡ŒÙpÊ¡“ %RNIdFêÔ\axöâ+ä8ÙˆÚ~ƒ#¹¼Ke$Ž•aˆ®:ÝÃÂÝ“Ü{*i†¥ªvò™†¥ªwÒÉ†¥*wòù†¥ªw
)‡¥êwÒY‡¥*w
‰‡¥ê7±ÜC}#s:)~×cÞhjI~—¦œäç›§‘é7Vâï—V`;}½ùÝ×	©~£¥î}ûòðK-iJVÎñ³ö,#L»çêâzÒoXuü°ü­£­rC–dÔ’t“pŸÛðW‚d:iR“¸Ÿ¨ƒ–úÇ¶{ÜÒri™…,/,)æ¬f«ÑH»Z¼‚ óY~¡çš;£Wþ:ñ¿:ØÎ®ÑU‚Ö&SÈ÷%~vx¤úx«ö”‘6›ž	K&
ÇŸ¹d™ïkÛO)ª‘S’Ùi^²i0ÚžzìÅñ!3k¼8ü&¹¹ºØ¼d=ÃF¦¡ýì‹~ÈSm 1Â‹Î²ŸÑU#-@†´UKcF´OÎ¬ds`Éet!Å©q„*M&ò¦›1W¢nM¶£1·¿vïèàïLÞ9:øO¾µ˜¬WD-¤ÀÚËk/Z–UÝÄZƒ*çy}ü7Þ3·
ÓWúäð—·Ü/cuq`uQÓJ;ñÃ^õÎ¨ýY”’r<WTo®¢ú&!Mª0¶I0ª‡“ÔTïÐv©¦4ª:ð}ÅX'ÎT"¡ò¯
á~CšHûüŠl7[ÜÐ€LŸ¿é¾VÍ5”Î¢VãšKÕ¬§¡ªœîÂƒÊ,y®¬Þhe¥­8&§­ÒSYBë0ÃŠ©žo_~÷õÑÁ—u‘mX%Ã¨ÎµÃëk~ÞÁpÙ
{ïµRXnGýÔX¼Î[î½	Ó3á³žË„YF>þö>¼G>¾tðïž¬â³ñEZÏQìPyj‡aBZÏhŠtžzèÙU{6˜ê„Õž…lŠ½B>ŒRºæ¤ê;„4Íüº(>{Ô‡õËõ ½céCN-«øþ>BE¾x£÷–Ñ°V%âTî˜pÑÁ!Èq¡íZ,œe3)m-xÏò´ÃèmQ£¤í]Ôá“Ç@M†N¶+´N{ò@“ùÈût&ùY^Ê“œXîwzY	é 0Ã•™j‘¥r™jåSÎå¥ÉN9(k»'Uº P+švd›ÛêRN3ûàh|¹ Øî´ÚéãÐ<ši:tÌBŽ gÄÀª3Š@tÁ€Ï03kÁÙÓö»/êi[J»‰ãö¬bRŸkð~ž…ÎRn¸li¸Ž}×\®ÎŠ·Dz@*d0ih$´Ûò4@ôÚ†	e` £ÀBÈ° õé½z~Š•Õ£Qîö@j©8ÍVƒ[õÚYÒX`ö,ºÃ¬Ÿ6´ù­Ä¥ÈU­5À×¼ïÄv²™¶IsØißÉúÑO5 Ôrn7²ÙÎ@m+2ùl„ãœ¢MBÄmÀšy÷Æ žÐ÷¨Õ´¾`_aÒˆø{k¯‰²°\Ež  ÷ vn¦ºÌDnþM—@¿áÑÁÿ&Ã/vÉÞ›¥nÕ²Èº¹ôhãjãN–u€É'Ã#ÂÌ¿3£iÛ‰ø;×µ`n’+U\)7º¹”-2–a0S¬¹|€Â Ÿß5‰KmÊ›¥ÄÔÍ_ÐššZÀyañí·/·Éí¬þ¨ŸÑWÐJ>Hº	ð±­g´Aº)$m¼Mè(•!¸`Ï4Ò^ÒŒ=µÉ©Ž©gÝ:ˆJ#«àè J/Z¼ÀÓœw¿A8~'íd³,˜\2z³Ì®yuàAÒ£‡öXä<äÞ™¿Õ£në'#–¦§Ž±á™6´:ä'»ºŠ+³$“ ºT¼Ó*êÝ~?ë³»i±pDY™Ó¤_oÂ±FºI[±ŽÓê¤¡œNôôÅ;,À*oœKÌìCÏeÖYdÓ¦ô\¥ŸR—¬ÓÛÎú»žËìÓŒ‡aA¸âk„Ë:1¥RÐÿ,Ùcoya_Osã‚ö„NC–»´=}œÿ„tÁÑ€Å|§«"IƒGœÏSŸÊ/hêRIõ
ù)©ÐQÊ¾0öâýµYÁ)ò_$¶æ<?jÝà³WõzÞJwè³î‚,Îó¬Nu@«}©5µ¾—§f¾ì¼3‹6|#:±õø|=`·ØP¿í‹÷´wPà¢´à,j@´ÖmSC4Øš7øq¾|…TÕiÍÁ"Xà/]½¡3ùm9S&ÜAe® “âaüîû$¥j{ì‡°;¹Ÿo"žÁþ×„m–	,,¿šžJµR2Lx»?`jÐhKìC‹¸ÔØ.ämxÑù?ý)¹¨¿øÕÕÃQ¿›ßš¿ûOœyR­VåÙ§U¸|v6™'›šOj—|Ì¨¯“'ú#.æùKPh“Úôà%ÀÍ¶Ä}¡¸€Ñ.¢ªÃì} £Z§sìlîA—oÚ—ËJx/GwaZeeóÆ*–Cº¸_¨¾ùÌÛ¬•¼Üe!¿¸jIÈ¡yòÄ%
ó«>ÿãÜJMÁórî}jk…w_€åÄÖ| ¤È¡ÇEÝ“ö8Ì’Á°šÂ4:[¨îvH ¼½úíP%Óð&’‘ýáõJYÄðB`X…y–´®PVjq‘.bÁnvPt+dæÁ­/]­Ö®“‡ÛÀŽôï»d£	ûÎðÿïvgÈÂš*#³&x• ùQ£	Œ‘í+æž©<'14ˆz?u%CÂ»¡nòdé)¿Ìa!4Ê÷Xy¼±QY!9d¡JN«HèíŠÈÓE €¨ÔƒÃ/YÐR²"è¬8£½:ý<Ëù~»,ö"„Åøì.ÊÞ‘É^2mØDmCe9Î¯,i z¡r€R,Ki8eøx:«|	=™•{$²Cekà\¨ä,ûS”S¹ŸF©õÈ2Þ	w–¥LxTP"d1÷¿g“ùÛ‡ŒÍ5Ý,G{ÀEû_±Í(ÁZlì½lÑatøÅ0¯1ÏO@‡á~i¶€ì•,Ö¥k3¿òpv=ÿŽ–d~#Ì–ß˜³w7ÞÙ}·“´ÚüZqé¾Ò„h¨ïÀ€úäýÇŸTGÃV{Pý7ƒ¬ûé0û”ùÅf•"ƒJ\´©_röi7Ý‘S‚y*é9ˆ¸çÎæ<}ê<™¹µ>}œ%ÃOïeôï¾v§ß‚ýÁvÊJ?£%¡à½ìqöé[{ôA„V)ei÷ 2úr°ÁQtª/ÚƒÏÄ]¹’Œê ñg+tø¥P‡|‘Î´oÅ²3x–àAÏƒMRBYR`TOgÁW.Ôe®m”á=«øP¥üÓÒXª¨Î«\‚&•_“‹­¸@þ–¥‘ôóðp× Cò21´ø%rœý€Ì²ò¬š¼i'~: „	™>y­–æÑ.Íëõ§¿óŠÑïÚ#—Ð\¯zC›vð~Y¢ÔØdÀû„®ˆÄWi™ÓûØ312‚/Òi˜][(«·è$¼óQïv¶£íµwÚtôiÒY/©·†»—–4ß—<l{ŠÃà¼ršüNÃ^Vg½™>ïgÝzìe}røÉb%Ì{ãYðêã=m¼6”×óA+îÁƒ÷Mç¥Ãã¼
äÚÎ…½Ù1è˜["…{M@»¹½°ÝO­´;\f}²ÕÏ:
§–vq¶Ðõ{mh!¸bt%«œMÓÛúÌuÜ·Nc…}§Í
ß‹Øž#7[Ü›4öÖ°Ë›¿¬ö*p·{æ óéT<¼ÐèÛ6|´†È<³öÉÑÁHûðOäÞÑÁ/Éà»/È·¿Pf Ï`ðlìˆJÜ¦ã«ßê±g…ä¾OžÐ“6Z£Ž žVo¶Ž^ýó¸›x-¸1Y?:øŠ*8 )ÍÏ°ˆ*}÷Ç¨F´ÛÚ³MæÑ~ÒO˜¼{3¬0_²áòÉæ k† ¹5U”õj‹Ë„o1°&Ýev.3$IÜÍ“’¼z[.¾€;áœÁp6³6Ë7f6€rK®æÙê Z­zRÕñàiÃ^Ð=k“ œtVàßÎÅÛYX•!g»µ1èNNž´G sn¬€ÝéÔÞ¥6Í®KÊSƒ vÙ‹°H;"—íÚ#ß.l¬çuÆ=9QüýÖö¶®™YÏ ¦öõ†ÝÞ¯8Í[±NuI›ÚÞI_oEH´çéöX‰º‚­ïÎšÏiÆ~\tqA¾ýê¢Ö¦…íîˆjÀMVpÜó>mP!33	ÌÃ–êwn¤C";, è:ìKAÿ,ßîè{èÇ³‹€ZŸÜ§³B–/ƒÅ:ûé<i@ ÄÊ Goµò#6@Ñ*•rŽÝÈ~mË_sd>Ð-X,eóÂÂ¡™«ö’ÆãaÒÎ.Ï“ÊRd¿é.Uô¾ò¶w¨ôcz¨èMø…Ï™;òÙ[{p‡ý…·ö:ûÏü×h6¡ûƒÅ€ñiÐ'ìK%Â¾
„Ìªàc€Ðê,òªÅHÛLtŸØ÷RakCÁ©E‘céÙ$[1»Bp—p„òçÅÍ%šïÔ7¥øutÄår3ôÆžüVXîAÒËKÒï“Ÿ²üM‰ZRß,Ó Êç\¾5C×²=â{ì¿kAñåLÌøúNiñ¤o”}3æ}þ2Óõß‡Ì´Yô=žøYv^+FÕ;
.®â§Î¬Ié\!ß|kÌ	÷Yü³nß¿{ãÖûc>®ÞïÄ?ŠQÂ…3•IÏ>fäà¡-:—v³bßeŠ¦áZ–Ñ›9£…™*@Û‘~;†Ñ~®×©â~EKß¢þù„»ÐYÃ8ZÝ+Cª¼_–SÌ)V2kT‹âL‹¼7c•Ë/o4©¡õ(ÑÑK|½Î]}‚)šßQEºÉ}¥[´”ö"½¤:Õj¤NéJé'µš—ÇÃ Ê·Ìzm*u@F-ù‚kqdÒaJâIÖ2Š‚˜GÛ€\
ò×óT÷xtÒ^&%öÎÿÇ4x÷ÝôÒ¾g çÝM:=¾ELÔ¨_1	õt;u’½‡²0«=U$w›a¢Ô©ÔUT©XŠÞ¯X£ñ‰×*†8øD*uÍPGÿ¼~§X/±Ä”¹ÐZÍ„ª¼úç0ïÉªX£ÎBcKñŽ©nqÎÄU®‘øR ñ¾ ­‰q%_/mÜëSƒN¿ËKš2fANäÏÈûG?¯7!ú§FÌì‰¯$7'ŠX+Ä <&§›;×ÊØ½ô?B¬ßÉ^¹^b³±³I×š2äb¹ØWäÌKÔ¼(Z
;l6wÉy‘ê9˜a¾'Ý=ü<3 >ðµkÅvP”…£$—¢±ÁÉŠG`ÌøY¦ÆJò}ãÅÛ¡`7©²ÿßKw!ëYŸ.RßâäÚ°)ÂKäŒ6ê'àÚ6	Âp¡“a˜7ž\¾^L}çaƒ•E[çð‚D¼61qx*¿a‘D;9ÄQ ü–«W
iÄ—	c¡ZØ¡­9È)Åµƒ'í¯9Ž©ÅÝ4Õ?äU2°FÃÜâ:³¸!S'H&ÕQžw¯ÕÐËO†Nœ1ˆã^Ô»Wëù™54ðbúðí„,ÕHÙæ„¬…àŽý¥ <v‚h9p%b…/ZlîhS'Þ6²óåb:á‚Ö3ñ‘ùÛÅ#¿9o¤­~s^5D#}6FtÙÙê
›´ÝoŒB²]/üíË)«2aÊFhþ("[Í—çD2ƒN¨œfÚ_“Ê/¸„²ñ+Ì)*7ËìˆÙŽ'r/ÿØIú8m–wpÌ’ ‡Ëê»»f¡Ú_îô™Ù X<ÊQØA:—““%S’%q 4Z¦+XÌh©?û
³@†¦|ŽdúYÃ›'ØÀgìyò$÷µÖ¤3<=ÈµÓqäÆJ±÷Œó*ó-2±/Æ7ç òPÂ«m<ÓEÌ·ÂKŽneYïÑµé¯{ù
ÒN+:Dž¶sJÇp…¬ãi,›ó3÷Csò©#4òqöF[^…èôè²1Ô»FÀHˆÇ).ÄºùDÃA¬»ãX{(Û¡Ö¢ÅŠØ×ÇÅTÉÂˆú˜R‰+hÜmµsIml%sôQ­†®;–©hDøˆUv:+Ù¾ðv”[Éên?ÿ`«òÀ“š >†J&è4<µà£_ë£Á
x¨éŠ~ “‡êäe™ ¨ {&ÝÈ:¸N›ªUNmˆªsr"Á9ùÄž… ¢!ÕMäQœ³c›ödÄL‰RÁP„8CS…èA#Ç9H2I¼N±H—˜EÉã :ƒ!YÓða±K(`qŠJ~4HûŽd7îH©Å"z[IæFÿ9Ï¶WÈËH
¹Ãwˆá…*ô·É¢Ëï¤}²÷xÆ¢ZÌ}ã×5ç¡Í¹˜GòƒqQºÅ/iZV	e`]/\}˜hø.5dýý*ß¬>T«ÈÏÏŠ®ÆËëÇ£ëÂÞC´Ü]Ûs¤ã—ñ%NêÕž&Ë½/ÊÞ‘§w3Ès,h3ÓÿâzUäX,á~zÝßZ:¿G¯,gî…Ùvm
¯ô4NæÅ§J0xlö;7áä»“¿÷0ž9‹­R[ïv:¤S¾ÀšÖ+ÂlƒÚL¿øéÌç7d xÆ»›@7öÌ#Æ.Hk¯5Ÿ¤IÒC²ŒÂÂh¤möÅ:My8IÿØWæ¦=»<ÿ…*kln_öÎÞc^ P­o4ŒÐÇÍlg@ìü€d[¼U²DQôIB½´ÞÚŠ nÂ/‚å.Ìv7T{;¹ D€a/ŠžfßÍcã¡:%ú$¹ !)ù7ÕpÄ:)Ðaå¡Pï74@EÈÂ!Ý ÌÙ4ÈïÁ†PYSè ¦Ø>f	œ¿ÙÙD½X¢ÖUÌ…g¬µ`´&b¥…Îó9lÝ¬˜:Ž%ÜÂûBïJ !TsÜ¢p^‘Ãkí”CaÐ0ŽÞã…S¨a¼ ELÂ†ñBN1…&àÜb1Œ—óAˆBá‚%\Ä‰„äød¼ˆ®ŒOnõá×Ê8¨]0HÚé a(©ßZ±~ú<íŽR‰³Ä~hÀ]ÀÏÚPb%ü0/‚ à0¾IÇ»[[T’gM”Â|+ç„@ê±äq5Dm‰š#?pÌ¯øC¶Âhr.nH\øSôÂWXAÁ+ôõ`qms:XZ—SzN¸}tQÅ(]ô¨rl3R­Vá×¼-üð€ý¹ü™|FÝºýðHË¼yRÉ…uJJ€uBõµu
õªuÎÂFsô”uBô‰u<o}u†úË¥ä“ç©ÐñÉ`·[wjz~ðÚÑ’Ô`kd;Ò7[á”]Yo½ú‡:ÿÓ%ÑÑÁË®†%ˆUè&Ù@jŒb¾ÿ’NÈ›G¿"Ï~ÝÒÐF¥ƒ¾*A Æ®¨Ê\;ÊNû»†ÆàŽ«GÉ.ö¿dMŸ
…>x†*ø¨YÊ+B¬²h¦*)øh³U‘ŒÁG›±Š„>jÖòŠ kL9sùä>höò‹'{ssûµƒºÏb¨¼:¬Šæ3*'Ž©B|6C%à€:­Mh¨:®
÷è-ÐGiÿyÚßhu¨•›tz³Ò¯¸ÿ#iÔ/.îH7m@q>ÙIZRp©ÙÜÙÆæ<©˜–\…!ƒ6¯Ëù~Öc:È›ý¬,L;­a“dtn,è!­ ö¶ÃRâÌWaW¬ºñÐSÃ4ŒkðÁ‡êt­ÖóÚÙd‹ZÃU!$'ðª@Œ¿m6Z‰N/¶6[íÖpÝ~o?xÛ;±šÚÙóø-ÑÆÆ>©'Ãz“Îô4]íÌYí“µSµ<½ô®ÎÙ¢Ë®´±2ÃwBÉç=iìa#]#'3PK×±’Îƒä‡˜¶[¤Ráæ/Âêª^Ãµ ãeæÉ½´Ï¶{6v{iõ£G·om¼ëaùˆnÔEâêâÅmîbÐÉ¬¸õ(–Ÿ³syHAˆ$ñÉ¯<ßyJÚÛ‚ÆêÚ‹¶EùãÜùw3[!þ¥%²™Ô?kô³ÞÂf{Ô_Ð¢¼ °Å“ôÝÏ[‰Äx”ˆ­îgì»ïÑ‡ö¸p•ô6ÍÝâøô#ì8&¤£é¸tøì©E
-/:!†0²ŸÙ6Ñs÷ó6õe¤CöÊFúÂ 2 ¦¢«Q‘ÞÍ*J$)AðBŠTáq(ïEƒa,¤C•))²sü®[¾—xSË@ ÿÿßþm~"i§&¿éM±Ã];v$çÚ)„š,ƒ5b-ŠÇÇG$kKLké'(5QÒ2<¹n9]ýÄ`ê$™sÄAZtƒÃ«¥˜î.,ëkÐ^Êã§ìh/&®‰“áÆp5Ìø ¾Z£Ö0KI}dL­å(0<Þ;:øFMó/'V„”•cÄ©NùÇ:aê¤{rUqdLÏ¬Ýyç”+p÷î)W øN¹
­ÏN¹@qÊU è…S®BÈÂt«ƒ¨0Ý0¦ÓªƒT×2:&#d²5Q(WE‡|û³SÓÑ²5ngI—eä¿<¹šH”€+BM‹ÈÎSëJ€®IF†‡_ÔÃ
E¡|‚ @4Â±aÍòÈ5'°7ÒÈçÞ§}¯¹teÉF•ƒÅ±•
^œƒæ}~!"Ú‚qË¥®Ewqü]¶— Å7eÔãBeîIíé>Yð\zN¬vTË™!RáÔjn(®ð*ÑEúglÓíáâ­JD’wL :î‡±ZÜHš¼¦78}Q·NQáœ©]âÃ†½Ðhöá^ðRò7‹D½i„¢N°Ý/ËÛ6PÕ¹’Úƒ5g5B7¸#¯Bãa/ß b1|{JŠNr DÅ#{Û}É'ï¼ÝgÖÞá,ÿòÕŠûåŒ)pE|ÅÈ…¨eTvƒøh^¼ëxÔÁìø^áD|Î|Í—ßPåÊHTðìl£¶ùe¤2‚‡z€GÌè»j½¤?Hïw‡³iu˜ô·Óa•UjŽõ“’ÜøD„©GE˜{1U´;¹tŽ`¬Y1›,ý{ª’YØNçjc,µaFœ+ö±•†j¨)©¼³þýV’Ésu1yu¡Ç€+ö±•…l¦)©
YóýV‘Æs51y5aÆ~ž+
ö±…j¨)©
]÷ýV’Ésu1yuaE~Ÿëö±õj©))-Æöû­1&%–ç*cò*#ò\eñîSRZ¤ý÷[eLJ,ÏUÆäUFTõ\_à¬—))•ióýÖ‘Æs51y5adqžë	ö±õDÞNSR(îû­)&#gAUgÀ»ÕLNëÉ“òs:àŽ¡1"9Æ…p®5­§RÍwô¨vþ!oÃ”‚wÏ_8&”iú1EAN!öyíæÂu&Ù4Œ“œä0·’ƒ;#sœj”)Mr8›û™å2Ú¤Õw©¢±î,Lb¯éwÌ^ÜæLÙ¹gHˆ6šÒðÏÞ¼±qÑÍá?%Yœ¬v˜ž€æHúi#”Z~+£p¼pWÕ¸: Gi;“½ÅÈQ´'1£‡ž‘I¬ím"8^@Ô ²Gà‹ÄˆsÙ±$€L´ñ5rBÃf¼ñ õ+í©ÍúZc7AóË<KFÒ×I±~úÉ‹³¤ïèDÛ"ù'ˆÎ© ¦;Ÿ´©Í Ô j°	ä·‹bIÊ?±ôGùÇ˜.5b”Xdé[=Ž]:^2‰!¸êaýË›øW i›§¢š•~>9ü¢Î‘YºQd;Â…Ëõš	{pBm˜uFègÕ¿cv¢”3Ñ>¼wtð»ÝÉöÞm˜B0Ž”ë~WßÓ–Ù”Þ×4‘à
Õ+ö¨_Žõî!/RãÇüDy?"Åoª¸ìaSc4jþD\”h{Z“38žPÛB=a?ÕoŽs'Ë†6f’Ád¬Í›i·a@¢0ÆŸbœgJŠôÃV#M#‹ÎÐ)ïúÌÚ·¿8ü†'£P »C%\qy\ÕÀÃåAøPÔ
‰ú1­hÖ>àÐx:õ­v¨!r  gƒÑf§5¤b? Æ+¡£Š$0&Ø9XýìbÔiãÆ7È‡iRV;SyO€Bs¨h‡Ó<{*ÿÿQ?ÛjµÓyú|vËÓŸÐç©ùìB1óÁKÃÓ€’E\Í ¢ïëÇ0JôìVÒ¤\ºÏ1ø%võ‡è€vi¥â¸Nô¾RŠ¸–žÙÎú»ÚÅâ˜~õ{G°(@†sÝéQ¿•õ[CíNò˜~§þ€=ßmòá{Ñ¾fˆýâ6ò§³m"t3a°Koå?ž‡£zÿm_uÁ€Le"+^Tá¦ Åqß‚f¿¨wšÂÍã@|ø¯òñ¨EÚ‡ÿD›‰|=€C}õ;Žú;:lÿg¦ÿ+òüðsÒ=:øU‹4F
œä¨ð}ßÆA• ‡I£è†õ¬td­¬ËAñP™›×`
Ùzl…hr‹N×ù»å¤€â"BÆT)ˆ¨POˆO^(—1ThÀºkø0þŽ¼ smº?Upë÷+ìouÔj˜çX.¶8Âw³ èã¬2nVÁû ³ÏÙ…tNïµ“]íXj#á[Ë{”¼5ËàÇ÷i¤=j‚tX›kw’Øir	üE]»®ÞO½¥Z„‘L9Š·øa¨09êôSB*Œ“†âDÊ’	žŽVy—vv‹ìÂh¨ÓñÁ`ÿ;•ó£ƒ/§„Y¹þá»³Ò!&d%ÖJù…Ò_±:A{Òk²Y@÷kEë /Ä©ùnóDée,‹ÔH^íôôŠá‰T-Fj…|©W#õÒ¼bî!)N¤6}W“XÕI–¼Ê—/„Neo´Í$ÒÕÄK”½ítÈœseÝ ³²38Ù&qØiqPZV ìƒ™ijÖ	Çê$áJ:›i_1MóŸ×ðŠM•ÀHªŒ¤±·¤“ùšM#éõ!í ¾%®Ÿdèú‘ößþ"¡ã$òØN]þ
ì—öùù	½€^9ß˜¦ø¤,yàšËO6Ñ—1*Zð>ß¾„µHàM”{Ç@Šq8€&ù¼rfíéV2jó*ƒJðŽ?i°ä#P™4Þ1(‹X£0Éådk–MÂ~çl¨Ð,¢~¨Q«ÒÑ”dîÃv{Œ¸¢© T¥ BuAôÔ‰ÊÙo{Q¤Q£ê(é	V‡=m‰Ð¬=;ßWsŸA˜›ã&—î4VØ÷~¶ß‹0œˆÌ6>ñjsÙÚ¤X.Gìa6µ!»(ÐÂ‘ÁŸ•º4 -àeÛÛò›Útlp¬> S{²®·úu…YÀë¢Í'Ò®Ã7û¨ÉŒ¸{ÊTý3r·EÕe‹üd´ËPš?¦bÖå<½é›ËFgô
p˜ùÏéjÚ~(ßr›Yãöó³utØÿÍìèÕÿ«slÙ`–´ieaÓ,c•¢Vgwû_¾¢ÕeJ^âçä9]”vW{šð˜ïÏ¹¼Í¶7Þ\û£Ôpüé¨éË0Š¯baz‹¯éÛBHtÝ¸âº¬Ô–4´º„N)üƒzÒNéÌR]Z~Jºž~žŠc?¼M¶ËÆy¸ˆÜÝn¬ìp°côÆ†<jS“Ú!™ìF¼bö¼v]«8û
ÑtÁíLKŽ7Ž^}þÈë#ü†ìé>käª†ÔÊì­Ûî?œÓ¶W]>F$ºãÕøÛýVƒÀ ÏT–¡¥®¢áºgXÄ’‚¶B—Œ]P†‚ï 'l$ƒfÚs‚Í³kú{uR Cw¬"’E¿f.ào×Q#å,a#æÛŠråò’—i<¸ü’ªQêi¤–Àønpõa^ý§ M§¹ËQ õTÀÕ£Êð»¯™F{	¦_¯ä¥ÆÕ"Îî1dlª=¿û:an‡E÷ðsP¯€ªýeS#±Í^G-ÍææõÌO¨#æ^`p°Q¤~.3†úyÉŠð±†#í§?ñƒ‰òQÉðCi9~(fÜPrŒŒSÚa‡	$ÏU¬PÙŠÀC; T=vCÛcuIô1ÝäŠÛƒnÏGJÑ™Á!ÍìÝùœé.såêÕì¯dsµG@tõ€ÌL,ŒŒ0#'ÐAI·ÕZõèX€‘éàš-äqw”§!ß­bnL«|ÓMÄkÍD¬®‹IkAÀ]C™(5#Ö°¢˜Ycý*]Þ!
q²g.aèTóe¡{_µ `OwÍ*!sÞË{'&n:jNûÍÿ6!eýc³ÄÊÑˆ„ fíÉ6!Ü/WÔ¡¾5bç+:æmÉsÁÇy­`.fwñMWÝSDÞB ^P#Ä‰óÏpÑâ5ÞwÅ08'1â
Á°È=@ˆ10$&†syB ÷SÊjÛØ¹FÝ5=”SÓt!+§ °mõ£AÚwY8—é3/Ç1ÿˆ^(ˆÒ)\¿ÕŽŠ¡ÍÃc;¶ŒñXr2	“›`TyÁCêäz—pü çU®k# UÍû\\U¡GÔæ›^ƒ±²ËÀðC¾ÃŸš·•ñÄK‡ÿdÑ)÷{X˜n¿ú€ÄÉÞ ÙJï°v6³ä{Šó¤Òh,>x°¸K?äÞ½•NÇ—áæï)3"=¦vœ¼±®¦@v@«¥¤…Žê.%ÍxÃ.rÛ·œÛs–™)-,ºNÞ¢Óü´[ìËcr‹mY_{ÇªÍê[VOÏèÜDí„…'KÕ¥+E™Ž«›­´ÝXo¦Tôõ›`[3S&ªàÊrÅ[F¯¶ Î\æÖuc4n¹Gã‘cã¢¬vi-¥¬F™tÄé(c|å»Ÿr|-Þ7EŠ°¸çlSF¾INŽðb€^Ö0e
^ÍÀ¾ê{ìvª„®F²‹0¿¢CX3k°½‡ZýÝ2“Œ·eýñ¸EÚ*7½üºJwb)ßU¼ß	{œz»ÖÒWu½™ŠùÄ_BÈ%òJ2VhÃx&*¾“›©ucOØ#Dþ.r¬‡}.þ±Wó…nRWÿÛôz—M·£Û÷SÐ‚º‡ûžw´êqtH ºYGYLaÌÓüQ)¾…ááÅªïš}Ÿê°³Å˜W2w™»j§ Í&¦…ìÌ%Ã¹ùV
0g4"ŠÙPw'¹#Ï½ö–e÷ iïï‘‡÷èŸòˆþùÍCp×ÿ—ûªg*ø yx÷Ö=yOEqÝžabÓÙÈ
ÍéÚòsº¡··ø6y˜î^ù k$mòöb^Z£ 6pM*`{	%ùù€AÜÞV"S‚û·`ƒÀA‰$¬'Ó„3SÚ—Í…KË†&÷Æ›ÇŒ;pOvcùŠ‹5cù¼Ðé/Ô®Ò?CøÃ˜‹aAš™Wl«°¹ÖÜ*Ö÷†é\QSoü—t`{Ú«/2ì)ïüºU@Zë˜PðÎ¶Y„F{¢åŽ)˜lè¨úkÆ€ù’Î9Ã£ƒä¤ô‡ràC("äéLP?:ø]lµ_”Ú+µæ…ëÄðÊVn80±×xPŽt{™ÞÇ4†#0ùç¬¤,oÅg¹¬²ºÓdfm¯|ˆ®Ç8ŒÚô:Í)b6“îôšÒ£ßp.ÿ€oÿ0¼qjì}-{Ê}p/aWßO6S;³wüŽ!6ì†¢0‘ÕEöçÓ§Û/sÏx{˜,YÎ8š-<Oºµ¸ïJ¶õ"ÉÔžë<k"3É–”u_àáfµö-+VµÚ¾cîG•tÏø¡ÊÝ§#W´øÎœaŒ|ù/YK(]â†1Ú¥Aq3kêû˜7{¸}ø›.Ða×õ™ÿóvl Ó·l2NËÐ-d	ï¢Jqmå8Ò³16|UçÆ ùîëËÙé–¥r°`”æEÎGé±F)íT1žcI?ŠW5‚WÇºÝz’‰xÜ“HnÏ{™Á5­¡µÒßT(wlùÑ˜ªN“JtÚ¿1óqc…¼ÏÂ?ãæ:Úÿ¬ËŒûŸ“FÎY\­V	ìãŽ,¹ÌFªÑŠîEs9	t]±áÛwAÇhéYÊ’}_ÜÖYµÖR+F¿lyÁ†jË¬’¦[ÖÕËO– ™¾éïïk¡`1ºP8QØ«¤	üƒÃÿKW¬¯¾$ŸE‚’ÉØê”*Ü†22GÃXÊ¥PI%%SfŽ-›ŽC…«„|£úDzØ"ëu¤¡0Œ‡,ÔÀ©/ÄÇYœYÏ	OódJ³íaÁ`J¨üg«mÝ>Boã˜ï¾l¿û¸‘Ú~M·]ÐˆŽ,ïpÃÝ=:øý}òãÃÿøY?zõ÷1«­unõûÙÎ‡ÌáåØ>¡ŠÌµ_ân{KÚ-Hhƒ:¬y\ùfw+{\/^T¡¦»uŠ0	¼ß`¯Ã‘Dy]°*BæÔ<°yÓR¤vÚ¾W¼®[eœ¯F|´=Ç—v¿>Yª.§§fæ$d¨¬°˜8)l7UäÒÌ	9\‹vks‹Èö:~œDL¤k "a,®J5`8nuµyÙï tD àœ«‹ÍËqžR×vqÍ,hg<ÙÑ	º¬äq”Ö~ñdýŒ§b÷Á¬Û†Íˆ/ZhcÜg»F/Dìì=1³­çùþzðSž% 3Ð9¢b›lô,¢Y¿‡oWØ6“ð~sA`4|T‹ì=ÓR_„ÓŠÍ,±ûò–Óƒ&@>€Hð–'°¬ÛSv\:)¦ÏNÃa(ñ¼µÚÒ•JÑóVØóÐN¹HkWI˜v&kÅsûýgîNð"tûêâ¦wsÛ$öš¹Dº¡@&½î½RbÝ{ÙZ÷<Yõ*Aî¦ýàøa!
‚Hƒ­Ý_CÖ«Ø]lþ±»]¼ú-Žls­|QÌÌ)­z3×k¸êµ–ßãõnp{Ë+¦¾Õ­OdkGHñi,mµk œþûW   ÿÿ v<Ý