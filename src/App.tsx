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
                          <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                          <span>Quáº£n lÃ½ Chi phÃ­</span>
                        </button>

                        <button
                          onClick={() => { setAdminSubTab('efficiency'); setIsMobileMenuOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all touch-manipulation",
                            adminSubTab === 'efficiency' ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <Target className="w-3.5 h-3.5 shrink-0" />
                          <span>Quáº£n lÃ½ Hiá»‡u quáº£</span>
                        </button>

                      </>
                    )}

                    {(isAdmin || isAccountant) && (
                      <>
                        <button
                          onClick={() => { setAdminSubTab('users'); setIsxœì}{ÜÆ•ïÿ÷S”{³žždºç=–gg¤;I$kìxW0bv“ÓÍˆMvHö<2™?²ÆE°kcop‹µâÉ]#ÏÅâjì­õ÷˜op?Â=§ªHÉ*²Èîb‰ÕÓMV«N:ÏßyèulÇzh¹£w‡–Û<0œÀšýrvößˆòê:Fìkó´ë6n$¤qÔ:99p¬cb‡Ö hu-7´|Ò3†­¥ö*·–Éð¤µD|oäš–Ùrz$´ŽÃÖq@<7lu<Ç$¡o¸ÚžÛ2 ½Ðuû­áÚÃ‘cà×¹ÂæÀv:ûF‡lnn’™Q`ùÁ¹E^+€6¬ÖÛ¬ç£>•}ÃôŽZÁ AÖIƒþÀî[ƒûúÞ¡å¯Ç®.4
ºŸUÏæÍ‚Ç6Þ‡1îØ~×±„9‡)]†yëÓÿ}ßvŸ¶d¾°¥`h¸7¿=ºxþ…KœñŸÉ~ü¹Û'‡öø7îÆ<ýUùøÆ|g†Ü¡¾…ÝQ0ÏÝqìîÓÍÓæ,Ù¼INI`…[Éš4gàïÐv{ÁP|¾<üºRf<×›8óaN…4wÆŸÛäÅgÏÿ#$ý‹ó“þû™Û›mžöà‘åì €ÅhÎôí ôü“ö¡mÍÌ’7ß$E„RNÙ´Í»œˆ´+÷5"o	GÓq5ô]HáÅ4Ëÿë„D‘ùƒ‹óŸtû$¸8ÿ’˜ã?¸0áöÅùJY°Hèo©ÞM; I~øC’ÙtyÚÃø› m™v83{5[Cè÷õö`ÛCœ’Wa‹<îÛ–cn9–Ni›<êá’ïNpoCÃ†iÿaJ›Dõ¨ü!éó¦}˜¿?ßFæiþ\ê»Óùo’]ß8Ò»ãyHßœÏ<‰Ûñ|Óò[!áØ
/Â¢[+DXòyXõìˆ6¶é‘Üàe;U¹¯çÂ&Ý”ù¦ß6Üp³aZAèº¡}h5ò·¥hE±¿7
Bûà$µ9¦â]yìˆ»‘ïÏxkÈ6df ’u|àõÞeˆyº]‘Ò/£ÙŸ¾øû½»äÃ÷/žÿï}9©nÌoKÈ3GL™/R&Léæ¡}ÞfG ›S;øöÈÛÇ]Ë‚9J3ò,9ŒãÖQëÉ"páñGdpÜ2F¡‡üo…Cxgqlq¯{^hw­­æ(µ×2 ÑÕ……yX3N°KÑ‡äÇ%ÎÙéÞ ´¼¯ñ“%ß|­*ðaþ)y~5ËˆÍ‘OW»µ¼ÝÙQRªÃÿ´ºžCœÞ:ýì{Gœ†­NmøEJ›+<²,—çJ~ÃÉz‹6€eâcË¹Ç8Y‰OÂmDœQñ,ˆfj	¶CÌlemƒòé}Ü ½¬Z‰Üxõ`ý¨µ†ÿô[kr‚W0âì«Â]]«uÒZd;4€’©¿">ÆaÀ·µctŸ’ÑÅ®X¸ÌÝ§ v´Žl  6lFðtTçÒ^	Ùé_<ÿOÔ:ÎFÞ=8pl×šßµ|5þ‚„ç¿g?‚˜ötü%P@ß»xþ,”ýé›s/I5°)Ïr,ÃÄò-Ç8¶L’>ÈUCÿêJ‘ÿJÌ‹óß„ÈpØÏd0þÅ	¹ëy¸¼wlßêà´u/ÎeßeowøÕï.Î¿á?¿w{ð¼%¾ó?vÉ ý.öÇ_´ôà†ñç'¤™#Lú>ÏõØØŸ,."#‰I•žLÇ@ M-´ã]Z»Õ…„‹7nÞñ-‹˜†íœf‡Œ\;`¨ÀÓˆÅ™'ÂÙ6yñéÅù'Tyüb€¯ø…—R!é¿_Âàû8KâŒÆrùRÆëú_ÁÀaE`´=G.ÎßÂäþþ¡Öí£8ò	<‰3÷søè¹Gº²…0‘t`âPÀ‡™ÿe†4Ö|àu‡<…ÂèY³m)!5éèÉ"e×™³/:úUtó–¤©¾k5~Ö%;ï½¿Kšûýñosä1Ì“1G>ÿÑ˜…—zþgxsJ&]â|õ»L¾ãáøs:mÿ/G_KxC·gœ ¬öœËñ¿¹}àÃ0k?S8€žöaz Hž=¦DéÑßºôëCœÇîº$•Çä_ª¹qJÄˆx(HAÎAô ôO<e{Û0{–ôüKIäì«·ÒœŸˆ®çÆ‚ýÀdúÕD¤âŽ°ñRlQºøÞÝÙz@îl=x°½µsŸlíìßûà¶d*é[hLfM¹ec€âCZY+”AŠö9b»¾ç8ÀO@Uy”¶NÄ‰èðYÆ“,úc…ªJp×½k—æøF|÷]äèÜZhÌž¸¿•~¨DLæ	ô‹§þw,§ëÒ’ÐÆÀÃ!¶‘Ø„	²Ù†³yJÅhQpñt wóô4-&÷-»××ÉNÇLZ“ô`”vx²NÓß¿g»ûÞp&‡öY¿!»qÛ‘tº÷Ü»¸&Ü›Ò¼“õÀáFË±NÚKé…€¤à M÷mÓ´<E?¥{3+q:pªÂÖb–à7äúY)ÇFA˜˜ëôãR¼·¨Ì!ðSªxG;,Ä%‘Ë1ÙƒZæ/|óC$z8F½9rŠ® `è'xã­6|´Ãæ™™m½asöŒü¿ýì'j…7×ë_ÅvQŽiÜÜ÷Gx®1ÈßM_ÍvM»ç1ãÅ§h†Ñs¾Ï»UJyóý%É·²ŠÊÑô‚à“>¢8û²L{4¨<Ÿl-`&ÎÙóôe€ÚÓ²‚Mð”ëÃñKeƒlèâIŽ»‡†ÿÔBk·xŽ©'({DÉŽ¢ô_ÈYöÆÏ©ñûÑƒöâö8@ÿÎp<~¤šv,¯dmy­.™ªì 7Œ¼.Nú¾u Ó†Ã`}~þÐi{`Í/ÜX]Y[YZ]]•èïÔ—žjþwaÃ¸Oew€L»Ùp=oh¹°}]:±|¨ü­¥‡ò¢`”ÃÏp’ö|áŽVèµ|rà{Ø»#$.Ðû#_ŽÞä÷Åø8NnÃïØ!ÅôÖ¥ää¾]‰ïØ˜°zžîÂ‘-Ø#Ô§1¨¥d= !xÎjn’$¾ñÐ
&‹½„¶ã´º#˜y7‰R	?yZÃIró³o¼¦‚î7æ2²ÏIÉ9)XÅ6öN@âæ)›øæŒxîøÝl‹ü‚–ääG‰Ú¹"žük”Ý÷ÛãQ¸;‚ô	³ŽÛ|2,e?Ç“Òd¶º]XäÐ€i¥ßÝÝÝbŸî!Ýº†ó84¨)=~få¥fß™¼]!;à¥–ðRÉxÉx©d	¼(Å"Ïþ[Þ}Ìò?°»Ce…pïdËÙêÓ¬	ŽñîÓòƒÖr¡áøåì6ÂÞRWp› 37a,§ùñ3IHgÖV†Ç3póÌÛkð¡xèe°!*ÁÏß þLÀô½!n/å÷4Ca'ß5n-eL6‘e+2î¶þ¦´‚¸‘ù•ËU\`èKv-K¦£hê?@› ƒX.?˜UFd¼"ëïiÎ±á[CÏ©Sc&°ºžkè„uèõ½ œ‘˜’é‚Û?À]={0MâcãR1k)þ\@jßÈS»
_V?f¥y×ÌÀ¤oWìšÍ“%Av},wVd,õYZ4<©çBn ÍÕ¶ê‡Ë©}êS[û
9b†o²=~æ‚þÌ“êåÛjG|–êú°,G­áqâ¬ÀMZß"=$-œf8ªÚ7¹¡rþ-^jÂúÞ÷¬nuÊÅ«˜zñ*¡àAáÿFÉØ`>±^— gT„†W	±Å½+k±Û#ÛAÓçR!Õí¢1müLåg–;UR½Ô]öÐ2×rÍ“Á‚GþÐ©Ä&YpÖuÕÆ`¶ p¥Åø4èæêÜèv­!Hs]ë:®zft°ôÖÀòÇ¼ªµP‡ î€´¶Ó·à."‚½ÈNöGäáýý«§‚ÎÈµv²¯¾e2ÇÐ=1Ü«Zý¨ë:Kÿ·¬°dÝ1æ#?ëö¯~É»°®×sÁ“‘Árû^peŒžu\g±÷}ËÅcýýaá‚ïômê\¼úÕ¶ì®m¹Ý“ëÈæ3£ƒe÷|´x\ÕÂý×Z}j,\ùw˜—ôûxÜ×Z}y°–< r
ºGÚø“Ø|
"$/C‰3®Å&‹çôÆÕÐ*ë¹®4š7šæH•
­WÏ¡Ä€ë¶Ú©±]õ‚'Y"5Ö\–±?–’L„šë>IÂA)ÍQW_•htÈfRÂ‡ÓÍ[S¢›RÊ‰s0j¦»Hr´#„÷«W¸„zãSyù/§ì_B’V³t{5’,#Ç	f™¡	v³ÕtXNÊ –æÄ6\þ+q5Š-³«‰iò6”ÇŽ"?G­©({Ñ©iU2*Ý0¬´ß/ÕdÖEa@Þ…¹FæI0ë&éXŽŸ-wdãU¾3µoìDéÔZ[ÈúÂÒ‘5ÐÿŽç8Æ0`N¥îSZZÉú”2%aMz¾mü†èw1×Å?žðç*F¯&5¦¿Â‡µØ‰[þ Þÿ›~hQ¯wèáý±¿ã…!eVgÇðMI¾è„\Ú±;
6Nä#™xxEo4Œ\î‘?±uÒzÒZÁýØm™<Á < ÙøŠyo6}7¶Ú©Èê†dcÝ…Gv­ ëÛC”Ž÷,°ù·dÁÌOÚ‹á.Dvªo“¹œ@ö/ÎÿçÞ]4šÿŽŒ´'Ù£™÷Q¼ñ¾¦Ec:´å¢©ÆÍSÓú§·Í½;¨/±ži»y‘¬K–Uà/éïþ’¨5²à^+rÌÊ“ÒkÞð'ëÞÝñßï‘Çãí¼C²´3€AõÀìeÍ$DLîƒõr‚&éÌ1i#
Ú²Ø^ü×"‚H¯SN­{nè´÷Fõ{ÇóQ7gíÖ{3³íöwæÕ™¥Užy&åc#^ŽDi§—­{ñ™:Tm²=ù—´¹•íZíÄÄò7éF”eÅÍ¸óÎ=òèñ?^Ëí7uðm½­†VîÙ3Å¶ŠöQ6½‚F&9¸å_ï,:¼’Åc2¯Ñ¾Šbv.]ÛyÜ6bW¸«J„´©íÀp¬ òæY‰7ÏÎ‹O
b¨_ÚöáÂz²À”6Î¦ûÑÄè| mf;ÀsF°…Q‹ƒ‘Â¿G­eÔçá?q¢Íö†!"9´@ù_\ƒBü‡Žº›0Ø³KÊá¾%ßº%»ž³Y
Óy}v¿ñ}¹Gj¤Œ½»µ÷f×}zÎV¶<—u®úÖ¡åŽ¬
Ü/ÊUœ­ñ7©ðóŒééLêš'»Ñ{4fÌM¨¥ß³xõFkH“ ÊÍ4š‹•µÔ¤ßã4GŽJÂÈs.ÈZÙUùÌiýÌª*éTŠÄmYZ|þMŽpnS˜Øušq—"Kä°’c@‘J+š²è“=¦À<Q`ˆn–iÂ¹è)'÷mÌ§õ7 £“•$_EYöx$ˆêb’Õ?s{hôd©Oëä´Ò8ê!r®&2‡]h²9[FÃï,ßöÌfá#³g’t^¹Yå„ˆ±F¼QHßò·ÄèH¬ðÑîâ¾’™Y‰‹BšPFILpEä‚þs<"œÉðˆF*0­-ä°{òKÁ4!¦¬…¤Ei“-ß÷ŽÞ£LË¤ $Í…"ì`„9íV—žÆeØ5ƒ÷bÚÂ½LgäF©‚Áý-<Z‰øCàÑ2dy‰‚H0ONViZdB_$›Éå=´
…È†Œ"3–?JÉb,ñkq1%‰ÑxÈ¦å±JÉ.8ü'›÷)÷sø:ÇÇd&€ÙÔ:Ü<>/Ul—JKÅpÙgE)é-¤¬î«ß}…¼îû#UDž»1O{SŒ¤¿œF±ê…¼‘Ã€ì"#GWñg â÷]ÂöF¾\é´ÐKèYSL¦n>êqÙa¼ŒJIFéµrY–	
P¡Ç&éH*G.ûª¸ì›ÉŒ"‰)§ú*§‹Fz^òŒdd0„ˆ´Þ)aÑ´8Jxö*;×!5xÇ{V0ô€SZ(†Ãy+pd›a³8.žøÈÿRlão0„é6©0GL#46O“ Hú-È+Fdõ®Õ\˜#‹¡XÐ2B+ ™ä.uAè{O-T"ß7N6Ëd¹A€Ù‡v7Éää·m6þê`ñ`õàí‚UßøpëØÔ<8üûtä™0]´ò æ+‚òNLÕÔ¿]ì˜n¼Nfþêíc¹scfŽãcÂÖaêØ_ßá	©þ#ƒ‹_çdótqAD¡ž¥¿¥³”{ÉÜ»Ôò2>ÉtaØ9ÐýH»=+¥¦}ÏsBÎè‘x¾ØýÁã ;ƒíw™^¹yºq;¦Å]hÜ±Ì¨ù›E}~’º´¤²•åƒU LŸ›§OÖæü^tá£3Ò1||óÍÓå¥¢æqIx2ÄÐÏõ@l„ãþ¸ A\º¹ÞÛHˆ}å`eÍZ¾øÝ·§+g ã„8)þ:*šv3¬Œp÷:YŽþ¦³wp@§ŽiÈ»q+7²7eÁ‡/º1Ÿbr¶'aCšlP&[«e"Ù1^Ç7@Oá”~,+QVŽ9³J.ˆ[L^!‰µ#oÉŒ¥d©EÕ{‰Ü¼ª#7+”ñÌhSGO$³GÒ§KÐ¹r–Ç¥yô½wï†ßÒ¡ ZO/ÎÿHÜñç'
x°BÁñß(ÔI±h"y‰Õ´4Ë©AÉ½O›LTyA>„ 'Aã;À£È&‘½¾eŽàðmÝîòMŸ¶‘oÑ?©#Ø×ìßèuõcOu{ãÜ­¬Cß
G¾+¼ÜM²@n‘fjóÉï³íÐ»c[fsiCÉfÔ­ŸÍ6Àld¢%jKbmÜ<.’äå,UÃDê3â?èhóË*[›b-Æ{ŒÛ®²æý,¶"'áˆ»ÜP÷GHcçâü×d1ÆºëFÊ[çâüŸàèœK£ððâüG¯©þ²©>^3–*Úª8a5Ç¬¬Å0ÿA©#˜£Ö¦cŽ*>Jv†®1a­†ÇxF04úOÉ¾7$‚:tÏÝ}ú’LtA½O?ÀêEéú32Û®l¾@ï[Zô>Õ!;]šyd[JI.¹¥€¼³
"ÜÛ§(5Áva°ïqa{M©ÎàåŒßz£ðÖ¡a"sÛB _¸·èÖX,§^*uŠGQDþ•ÛcØl‚’âŸÌÁ;šÖ1åÅØû;ÈqOa0§wácë§ôÑ³Ï˜zrJÖæx~þ×lA2ÇÆ<Œ²`‘ÓšX¤l5O¹ö0Ó{âx†	,§Œ™Û¤Éa£Þ|3~.ùØv,·ög!1ã,«]PÄq–%¨c±/"Íw€±0”Ÿ'‹«J'w¶gIW`.™°ZuOù¬<Yø¨Ê¡ŠO”wÆˆÎ#3•|‡ÂžuOšB·tHOùn¬ÑUxmK¾à.p½‚#¯H	Ÿ/fgšªiûr.cù°P²SŠq˜À4Šíœ²
ûLÃìš‚Õb.`¡‚êð•UI(š#ê²[Jé¥•ì”b€õèo;ÈÁÖ‰ÉXYá:ÊúI—lN…)øm})`ävákÂxo0†pjF;´¬òF-k4õc´l²	2a3O*±T:×aòè·:ìvC1Ãmqv–|a»9raöì¯uª…mí¢_åçNó·O9çf}<ÿãOKíh­"šµî"Ú¥ÚRO-Ú•"àÌ¼Ø[êDT¸Z¥ŒJ
U	×Wð¤+¢/
Âè@J£.ÄMÁWµ@Îà_<ÿíÃ°† qZž úDîC·ñüKW]Áq†£_D§Ë5äb&@	,W-ê@ÊÎ‡{ÜÎ÷Î0®TY—bÞiˆ[\Pšw*V‹JÇS~Cã]cQN@ŒM;íRÎfœÆ˜ÊB¢È=•s4,¡ð3›¸½ÿúµ”±©Ó@'\dž!örÖ9êüJ—Z|ã—´Úˆzê¥®_c!R*ãéôl“‡´à/ùaQ´SZñØÃïyG)sC…E—lhPLdá°T[â¡TÓ2ü<#ƒ ¬~kq‰µ×€ÑïïoÌÇ=iŒE)àLqt|Ì[Ùz6=©ó(¦â& "o 64íPún=?l}ë*§¨ ù£4:3GLÛgbÐ:Á[Úð#Û\ôwªyã×ñm?/èÒ]oØ¥›‰~q¦6"X´â@T!LìBžûÈ´ÂŠÛãÑzïw½#7­o°‘ôšVÒ+”l¯yÑ?©[ðúPËÁ,¢5~Çµ ¶Hl¶\Sƒò¨½×Tw­¨ý9E4G)nŸ©(èBûšŸ¾kCq4‰¯ˆäØ×Šæ´XÌ0Äxx÷ëNu×ŒÍqGrÙE·\+ÂÓcvBd÷k²²ú‘Šs-hÏ³é~~i#Æ®±ñ@ñ–»š^­óo{æ‰¼ù²øð„Z&ºÈ&yÒn·%!/µñ.ô-N‰——5z`tCÏOÅÏÄ¤¦ –EZ GíÞCç±¬µ'œýÃF‰CZ¤§Ú’oòáMÐ•/ÅŽðÚÊ˜F\m;a_Ñn8ôÍ4:¢¶ ±üF33³m+±ZÚkøV³#þ6¾™Ð$vN¿¡¯È`¦Ñòªâ FµpßÐ,_M•ÐÐ|ôÃ:Y(#ƒ¶¶¡­ŽØVGh«£ÕV4/td-Ú¨ÎŒ¨}é¼Ae§gJ=2a©<æ©FÆ<GlóX‹IÀÛÀá3â$ÑF„‰Š¯þÆ:°DDÜf»&ÝýÌ6‘º8“ÄtÊÜïæqÊ/â^ˆ˜{	v„ÇÀtT[1!J|Êt4`Hô)¢ÉT‰-ÂËò5nâ É·Èâ?p°ÝîÊÂBôìªxñ‚–N?–g³—*C9ç@p*|ã4E|Œ gÒYyÇ•oÒ¢YjžÑá µCXÏÈ^Û]8v·BtÎ—ÏŠFÔQû‚s÷¥\²j_°*5.šR$ªèu4Ã–
B¦2„+ºƒïˆ$ÊÆ×è‰Äi
^§95˜4™(àÁig„VöÁÒàÒ³aýUwšÜ³dÓ’èOû†]ˆÍO†Îœi-¾ÆM5ö}n©˜£d6Bî˜ídÂÎŽ<[‡¥˜CnL”Šs£À/ž·¸ã0Ê*Íº1/Š‰KkkKß’©]úš0ŽWº%x9ö "v/72ŽÄî2frÑo¥ü¯©í´-–’7tâÖØ¯lkQaŽÖŸ¨ê›%3'-Ìž½iº$/ƒ°Í’e‹2rˆ1€¦7*4%”/|Q ?DA«Ö9œåh›ù°Ó<fØ§ ž&Îˆ×)è!uÇñŒ…âYrs“¬¢BVwƒfôZB2%”ËþÄa .F)5à4n¦Â›º†ÇÇZÆÇ§Çy‹íìRÊí*‰^•Å;“›øZáÒÜpv4‚dr›I?·&OM£2qri¯0â*æy4ˆ¦!„ËèÞdÉM’b}j»`QÖá‡Ö€„Þøsšjò³¢™ÅœŸ¯@â8¼8ÿ	e<³©žÑÓA»¡Ö/%
S¥x—eÉÐ©I®TCê!JihX®$õ¶ãÁÄ>4\£‡RÐ±æÝŸ’û˜f|![—:Sß¡ƒD•FxIêû}PHéç}ß{p’ü¹IñjÝG2Ø3ÚokÐ„Rð³ÓÁ>Ë£Ÿ%ýJ1ÐH¾ÅvcñD÷Ü/H+M¯š?´=Ç
YQ.O< ŠS©Up“‹4ýQ‰<Ts(Aÿ©)Gš Qºø\AdÔ#ü\-T¤\é„¹Ã4…~™,R©óƒŠÃ“äˆe™â}>±]Ì»nQ-6ÞÓH…¨lË+ðE‚…/™Öp*svå†µžŸLœŸfš› jóM,À:
ß.ƒ|Ô¥Â"?ã£Ê)(,ô¯];:Æ	¶ÝÌß§Tó’6Út¶w<Ó:›E¶±ÓÿêwéÂ ÿÑåco”$4ÈÑôØ/JêJØw`9u€PL(SOø©„ßðçßˆyuA…¨ìâ\K8GÜáÙó%µéãm@I$0Ü €Š1¸ÔH¢2E§
3ÂÚ«TXÅÈ{a"Š{0þs!Îc:ãÅE³ð˜:eKc™t¡î™xØ5éH‚'ÝjÛ&÷VÊòÜ°5QÜ´Ù„¶#aêqº}úSÍzS¬©}`ã½\è«À¥’êk¢z*Dì'¶‹~ëíÄLQ,¿³ÎékØ„]«Xþfƒ¯Ñ Äµ<¥+Õn·ËU²œ%1:`˜°Ö )K¨0ºtòí£‹Ð9Û€·d;v“#h Ù6;ØX‰EŒ¦.ÍÌ¦F·½gGPÆù¢Sl/úRÂó¤«T>¾"P‰èÒJ›(¨XLÑ¹ÆŽˆEç¢þOùzRïMG#+9nþÈÌçp1öG.±(¶W%’•-uzV³t)’AwZ”)´S:·Ñê“Sy>VI™“ZÍ³¾
Ä®¥ÙŠ1Ð07ž—-jo2³“h@}Äô©ñAõc{§Ë÷ÎyŠvî	¼ñ³4ÑŸ€¤öžt“HÚ9r8þœçfÿÝÓ8DÀy„ÿœÿžâXü¡E.ž9d	\Àœ.ÎecjKçMjG—ÉTêº~YQA™™üÈ7†LÐ.=4TùèóQ->”Ó‰¹)YR&‹(0ÿx—R³˜ˆÙüpüE$ªrŽ…¾‡ÓyŒ§ÉNføãÅÂ%´I«±®å„‰»fßÆŠ€H¢ŸœÆ=ÉÖ˜â¤¢ãé‘oØÇgßœ`Z•?U¬T(±<uHú5Ëò–™Ð$ŸøV¬ãYVX8ß~ÖyÃöØA˜¡šÄD8tÑ%Zs­"”nëØ¬ †."q3eÕ¡ŽÁ”YG LŠ[MÉ5YM!GZO‚Ë.2£ÍGq±	érK#uº¥“ë¢£7ªn x!ÂŠ<ic …¾&X“VhØ¥¡š4‚R¹Êp(ê™cn¿Wsî”•Û’É{ñi|
)%ÓBô)¾šXXDJúîtgÐ_Éé»c;À5-`Šfo¯×G/Ö ¥xþÈÃûûÕçýŒLVò…§ÀþÖ6Y\'û4N¢¹ßÿf0‡U]¾4æÈ‡ã?±‰Ç¡Ü^/¬•Ô€žgµéSA<[D8}N°€ç¬ÞôË©`ñ'óñ õu„Àë9£A”BÕsÑQ—´ÿø$ ½†ÚR¹ež€o’‡ži8$"öæÈÌFæ‰è¸P&S!»ÄÛ‘zÈFÈmPì].ª{$GËX‹Q¢‰¼"jFv5J6j4b÷·
šGá ,ã ÖÆÅ9.)h 2TnJlFæ îK,W«>ró¤(G•ƒâcÒuÚÌ	Böÿ–UÂOÈ1¨¨æÅùo‰Ã|ôño\bb¦ðÏí¶F]¨ôÛ”®wf?<ÁZÑ¿Köï`×6¯G¼¡ånžÚÁŽoÉróþò.ü€’0þ+Â÷wjP»;â F œßQf¾¤ž,.fŸ¾2Îrû"^‘ŒTpÏŽÂæÌŒ–mP|•ÌÚ3mªöã»4‘Áóß·ÍŠGöo<#ï™pæ=ëˆ¶Ù|ò‘fCg:„ÈqP€q/^i½IpÞÆAÌü»·R®@…%=FYäh KíUuªRréÅq~‹ì_<æ{ Å«¡%{gjïhïµH\OñÁ:‡[]HÅ¿-'ÕDø)TKyØ‹Všç8£ˆC2:u2‘ò‘PQ•«}d{~äŒ‚Ûï¦;N•K(“WLè€<Dö¯÷ŽóÂKVš–¢³,ƒ;#b.G–pMû7»öúÔîöÇ‰9´]joýW›øxÜøJÍª=Œ6¦&ÑGýñPçŒÑ¸2v)™µT=?Ú‡hú±ˆÜtQˆ¾ Ãœ€´Oµe÷a+­ö?JvÆ	3ãý’ü?u‡RÀFya½*ã×mCî.NyO²°€‰ù¶Ôý›ëŽ|zÇ»R.Îv×Éí»‹säáöÂ’S.ÑþŸßz§»¼X<jZ‘K9#XíÐð{VÈ0Û¡÷>
Ö; X7‹}<Ù+…À;†Ø%±£Úý"^Š—fÆ¿ù%å>Šá/*ù1Àˆ3:& ÑX@
&ânšF/™*_.-Ê}Š{'¦ÚZ4›qæ hN¾?:!T›ì’æÎøÔ3ù	+l€Çégno¶"W%o	Ë%Í}Ñ):0BÐ‡é¡æ-øôG2€è\<ÿ-:a/žÿj„üî½}wVŸÄ- hJúdªÜ¢Þ5%F}lZsc\Zge¾=:¡$×?0˜µn=®½ñØ2ünŸæˆŠqy¼Yú)NP®£ÌÒ—Â(6¦Ý–á8Ô1¶y}ÒÖÃ“˜ÉZÇÑ§èÌo6Z-ÂB2©L?O¸9,0F¤ÕúšSì>ðÞ/0ä1¶\&Ì™G°ºèïøÑˆ¸=äßÿbWæÓ’Žs FÔÕhh¨›Øðâ¶€+Ð§í@ î‰­OäWI[íÕÚŠXìleÛ5(÷nJÞD!c5w¯¶¸\'¯ÊKOAâR«º7Ï:Ö¯?
Dé‘ƒí½uÇçí›‘oAÿ53£»'PTU‡!‚YVò–V`[ÌS«C½„œRe”(‡¾KŠŠQa)$1@¡ {C4³¦*ô½Ðd `ªTv‘@Cµ:±–—ff?»³£Ê[°iÀÀT*ÕVð+°+‚ ¡¾qË$›¤€(m·ëŒL+ }µmSÛ–Ï.Ý‚4™kÃ¡ì„FÑòŽKÊwd|ÊÂ†4q@ŽÀ‚É×ûX^ˆMÐ•X¹IK@µmWµ$«ÄÚEªèxÇULÉÕe4ExìcÝ=¹©’ç,{!R<”ÒòIW±kª`Ø,isnøïÀ·¢½Tq3%×±œÀº´×A°3õ+ÍEã×õÇIÆ_ë9M¿^öÊ‡.¥wôrÄôŸÞ×ë>ðoŠù2°Œ#üoí¡m>/•#X["`E•xXm®¸@Oã&ã¨¦Š!ªŠ0!<&ã|š0Åÿjq>öVø4uëD(ÆXP)ññ®ÊH&µH	Â!Së½òïVoÔ]jEÞEÙÅ†;2.m=^Åj
½b-+ÄOo’ðýë¿µ6éÆ¼SMÍÂ«Ò9P<%´«ûÒÕííÚ7ê‡Üñ¼0ŽÇ×‚Á:~XÀwË
ŒŽ’
rB_
€Žú‘FŠ ªæ"ÆÕ‡î("3fPÛú­·µ7ó;ç¿:¡Þ	MÑ†¡wW‰bÂ@À5K˜|]jŸj$’8ZýëÎyÅ ¤j³ÅQ°=§´¤•û™Ü^’Yœ™„è–FòJb£†˜L‡(%DžŽLÕ6‹LÕÂãl¨1äÅg´M—…à”BtŒ*ãçRò²Ì¢ÇjÆ¼HR}õÁí b{d“äSÓnEIà˜þ«ÃY«&÷Ê æ.7>³ÌòŽnÔÅ­š‰ÿCoGmÙ/ZÌ—õLç‚%(lrK×`CªÀ”»»Œ­‡ˆz­Õ¸Æ-•LE”$4Q’‹]•C7U¨Øš¶p"À/v]}!¸1ÄPIéÄLBLÆÒ• !ÄVV!°nN»{°+w·HCT’æßŠQ%øwKIŠƒ²øžüZ'	pEÎ±ïQ3³®Š®¹×ÂÍÒ_QûX²§7hqÜN¤é÷WêûN*.® £eà¨‚¬ô«è“gŠ@ST·–zœn¤Þžµ*Á?³ZhÅÑ•Ba¸.šÔ«€^]XeúóèÐŠtY_n_¨ä-"$½[Wæ˜‹e¤ãC¤§è3œ¢1¼ž¯ñ÷H®¹/­a;‚ÉFCê›µã§3¥éþ’i©h,P`F6ÎÆÍNÜâtfç«gXñË‘Þº$"IåˆyšnüK)_î´^†eACb:Ó Ñ)íMC?ÑÀk‘T
=(~ÁôK¡6F¡©¶.é?wûäM–úÊH¨Ï£ «¢ÄK)è[AÂeåÄQúÔ”Ò4'IÔ,to&@‡ü}ÊíGzP÷µÓ6Ué™å¼TLÜÌœ†]@;Q³Vªæ~’™Ò¸^¤.‹›¡bF¦&³á–©ÒË˜¤ÐüwÛ´CÁ"X.ÂÄÙt¥w¦ÍW‰É>–áêzit
’[,šà´,¥É1æìL‹òôl]º6$µ)I¢ö¤ê™VSKR1b]á¡HºY>™$ÝÃ^RáCæXeJ•ƒH¿¢G…Ò$W4abªÔó•q~f!=Ä2?‘W.­8Pãrà¬+,òŠî !eƒbŠL}]E½‘‹b[îÍoÍ¼ª›#ÖV2y¢Sg-l2'Ûy}g˜}É{ ÚtW˜lžqñY*ãBož«0pE«‚	+˜íË,ö’½¢2áßªéPåVuEˆ…›FÖœÁ,)6ù‹"Ãæ-:ãÐA…%:µ&¢ÖE‚'ñÀW dYaÉŽ¬qºåûÆIÛè¿Ðò¶!&3ÌÂš–Ý9×É‚Fä…öfS"ñÇ¶@<Þ¡6G®üêo¾©ýî7+DŠ—¶IÝ„°×Ib€`¥xÆ'Fy.ø”O~Ì)FœÀWÉ7Úñ•¯y±«
f<êWUJB#ÒbZ—†>d‚ñÞŠ¡Ì%¾§|a#ÆÄPê—jpi¬’g`„´8ÊráQŠ[ò¨JfžV¯äÒÊÑ	ÙÒOcÄ$,”U¿µú(Ò Ç
rž©™b1­R‘Z5«´,ª‰MµàŠˆø€äMBó¤xŠÔ}” Yyxj¢TJiG/ÕŒYn[¸F¶F%²ŽÚÚ˜Ô—È¯N)5]&>\éË2Ê é{Ïÿ£Ë6—ÛGÂÊ)bùœ”AäTÆ—{éf.Üoï²ùÝZç¡kl~ølo4:6e”’|ƒÐ¤Žžå °ZŠ´¾Pš«6nŠ¯Që.•@A£Ý4ZÍKõ«Vƒpªù‚{ ¾ä5Øk5‚fåmÛ½m$3½œçÖ»<X[À×Ò;tsH"o÷2=faOte=&T£^Ï
X ,>0ÆpŸgLÖðÙq6‰D(¿•µôÌÌ¦*Ú #šÚ=b¾ïäûä•à7â¿Ú Œûað;ìó›g«¤vefžNhÆ¬¥³oœÆýœ}¬=îÊ	Y²AÄëw«'¾éÝ–
.Qùf´rœ”y@ºIÕ°bR¬mÝœs4jÌw··µ±_$¼¢J„÷%GSÁ})]LY¾’Þ,èÂL!,~Ë5½¡çâäè¾:(VNaÆH² Æ3ŒLê,«çLJ·ƒ¸jõµH| )§ ÛJK_(€{èmìðu=jx¡e“øJ­ê*‹Òé¼Ef^|ŠeTi¸w»Ý¦•Á#øQ¦¼ÌèMlµø=7ÁÔ,àúòãö:ÓØ¸àÈ½ü&ÏEícDzç¿:ÏÏÉS$*4‰ÄYÃ5(Õ)ª‰TÇ´~.›&&R”¾ç…<=†äÖ—^ë¹˜*R²Çõ!8Œäz×r-ßîêJQ¸Ž›¹™¢´’™¾œ‚vÎ°m›ú‘¹è_GWCÈ|âèD“Ä\{Î`üÅÌÙìÇúÍw¡RÔ ®¤¤tò3Þ Ïíc;@ŽÇ’ÚôÏù,ØÖÖ­eTŸC£sÊéêX¥O[A{$6~wüï$¤`&ŒU!Zï‚ÁÊ‡Ð{….(l×C+˜†FªL-gz]h<Å1‰hŠrˆ~º§f¬^‰„ñ†ŒJÆ¥ßÓzß¥“¢y&ÖLëd2Ô–Is1÷=é­)X•,O!ëc¼W‚f×`.M¾âÒ”o»O[Z™zÜý[L@@«šW‹þ’ˆ˜Y˜.$$£¹&;ÄÂÈ-6E£ÁuQÅ„Àö×.Í¡…Þñ½+6ÃÃ“ž‚2ä'ÞcS6Ä;ob)8½=Y3©ïVâ°£¥v4ýfuAkcHh•]LHˆ–ùÍÆ‡‚¤Žvo*šÿ“‚úš[ØØ÷ Ÿ.m¯2Ø™†îy§_Çá%¹½jõUì]¼„²JŽˆ×U&ðˆj7LòMðÑôMœO~ÒZK%tËs¾K”F6qè~à(SõBŸ#Cs™‘­åŠ0&2>Þ(}åÉSTä©Ñ=P™j@	Å}uË“9½õ®ç´0–@"ï”ºþíTè·ÀI[Nõrbvz•ª™T³ì"híC6Á²±A5¥Q‘EA	Z›JoKmh²7Ù5á¤I—	îÂâBf“fñ4Å²­œrb¯£	gJñlQ#RVút!Ðà?ƒc°àaÛáIk¾ê°zŠe­JB?*X	¶ç8Ä¦GuÆØ]þQzr•Ç«d—%Æ—à¯ŸOÍ¯>Ëû(ƒkÖô¾üÞ	á-½ÀVÖÔ{Þ‘®Tõœ¯M’öXŒy|ë”š¦nÞKi[<	1KË .T±~»Ö\
MkÖÐ»·=óD+x2Å{h„bH”ÑØWa¾àMÔ «RŒí<ZÚþŽå8¹õ >(\´r£cw
œ$å¥àZ+©ª Á•Ë®Ä&Äì8ªÇÉ†·%­N¯ªOÆux#†‘\Hlø²„=÷ptU€Â¬œ277öæ·ªÀ<èRô|LÒSØ*OírÇ²ëÚnýøšèÒÙ²š‰H?GÆWè:‘9š–®1e§Ù—Eµ27^¤§L€·]1¼!º*M®œ®jyíÒX¾á˜‰™-ú‚gkF®RÄóøøO¾mà­ª@È±1ØNÜ.©ï	MÓ‰L«VŽF{Cvœg¢Ýr‘i™“¸yèAØ¶|ßó›£¼Í4£aÿâù¶´œ:î¸¶$TêjÄQn7ôcÛÄ‹¥•T²:zmèŸÔš+ãÈ°C2šp‚îzÝ¦‰ÿïÌ‘Vá>/Ÿ«	ŸÎüÛ²‡U±J®HbÉ7ÍÈŒ6¦¦ýœÕZu6§Ž×Ãýå¹Í™÷íníßžÉÏ*LjÁÍ•¼eÍá±íŒº]+šZpÅùêw#´3~9„Íÿ„o4jµ-3î™Mwä85šuŠ–¤kÂV®Ç	˜ãéŽí[AèùÖmÊ µ9ò.…«³2´Úlâõ©3ÖŠOTç¯vØòØ8Ô—tðª†á?õ²Nuã\ÿLÏ€³Mr27UvDù—»Ô¬ùÒ×º":zUñ\Wì¬V‰¶üj“h.<#›Ü•33Q”Ÿ#øÿP×}›\5C’K¾êCR´GÕÖXãYSi™Z†rö­_2s—Â*Ut|­}9&B"ùnê[ŠÇF<ð.ž?³£ˆæÊžpw2áæ=k Ã¢jÄÐµXÆŒ7Ë%ŸD*hRˆJYeÙ 5)ô¬K³öTñzÀ8´2°µ½üÖI}ê1i…(;W‡`À²@Âð,äž"Ø€!ÞÐr1Ã%Ô‡Ø}g°±ð_!üøžô>Å¤J%¤ëÜ°ÊŠJEÐåÄñìz®E+ ?zØZ‹‹å%ý}Û4-—]ßsœŽÁS‡G°•zêÙmòH†7P/’¡Ü$(;´=¬fJqdÊ‹óÀˆâi9
/UúêEyâ™§ÌÝ^1UzGP¨I˜Æ¶ìÐlø.ïFdz:N¾Ï²äå&Ä´óùÎÅùÏÃÂº¯Ál&DoMF®ytkDEªÛI5+dpÒZNæ)ª=±¶pØ¯\z7ü¶Ø]rÏ=ðXÑ…Â„ìmII­\×tÌÈ^&7’OQÞ¿,O}£¿ZM 	‡Sâ8¤qSû#,¨Ú_-é:0}“ñ®SY„^ÔÍ_ÒöÃ¥GX²ëÂây¸½°¤#ª	Î»í}‘ö­#Z¨vé–&÷[g]%À)’^J‘]­Øò §‰@Ê.‰ÐR ¨—Oi<]	®©á[M‡Ôâ–êx†«×ÕNmºW”!ŠÐ¥±«ëjxcBeÆéªÐÖuá‹©ÜGàKáFuI-ÉÑŒžÏvuH0KK»è­[dfFY/Ÿkz[Ò ÉD„›§Ñ'§h&Âfƒ¥…éì#z#éÍF«E„ŒàyòâSš6à³DÑVëúòT}2­C¤(Èê·1J8"C}  …îŒÿH“+>‰’1\Ì±øÑˆ¸=tøÿ‹­›Ÿ%å­ð’—X*JÉ@Ê["df9qdD\±©êD\B<¥¤SrƒºF
Ó‡þ¨Ž|‹<4\£gÐèr%¡¶j7u¬ˆi*‹¢é"ÁêÎã%*’HÊ5K¢¬Á.«ŠÅñ+ÅAÅÛ”@¢”)fáÙ…&Ð±á(ÿâD„W‡[Ñ<ŒJ+éèÀN*É–ÑzÀŒ!+yCf¢¤-1ÓÔp}NTC_eò*§œÙ¾øŒ‚Ü°3in”¤’·aer˜0E¬TÏÁœ‹óuCüéª²Øþl`y¹¡¡€‹«° ‰‹›zó>§tÝJ]$”RÞS-x³p+Ë‚Û˜á¸x €3,-cQ%Ö5ƒŒB%h;n*2“¾x¡ü!¸Té¨J½´
`Õ}…ÌQXÍK¨_Ãˆ]®æSÂ(Š½ErLäkÌùw¥Yñ˜ô>]ð/µ+tàSŒwôrÐ|yî~zY…¿µèk¶,8²„&t×-Ó$Ï·¨KZCj£mçóÌYÄâ¬ÓÌ•ý²¸ µÙë~i«¬¿JŸØ¢¦§ˆw‹¨Êq‰8†
ˆÃ¥šžŠ3	šW•Z ,0Ýû–¯.£ýF®Žv^š×+¬]­j¶önŸ¼Œ60€^Ä,™ÉZøe´¥Êfx]2Ž^5±Ìðª€g†WÖÔ•NføPo¦J{F§I›¾$´3¼® ñ¯4êÙ>è£!j¥BÃÐ	¥vH¾¡ß¸v Q¥h¡j’X
:jJ5AœfÖYáà*A–xt¦Já”U±f§P^St%RMPáºžãùAE\¥*!xßâÂ&L^Õ"?7´6“V±ærì`}tí”c(fyèÐÏÓØT:ÂÄcZã++,×©Öf^óéÒ µæá Â•ªMÉù
*4½ ­oÿ¤r)iDg ­ß§iôåŠheŠÅqÅ	QöX4S0‡j¿oœPÌO‹‚ÔŠç+
½b4¦
›L…Ê(Ù-ì7¶}%DOCDƒ¸Üï´¶ÎÖ6YZ'Û#Á}«g˜pxàùJÜ†Ð.—¨ôîV‡¶4Ô•ÆYûÇ£´Á SOÎ$¶{©^âÌ_$No=ùs™j67Û ßÿÅ§/>AIjüg5¦Õ0©´ðÔjÂO5nîõi8â^Ýd)V×îÅùïÉøG®þS¶J0+Ð4Jõç¿î—vÀÁÀúX_Ü%æÅùOèŸžˆ&Âµµ«àèàP•V¾)âÀµpÂ™Éàf2£¥zv-¥«yCßû<Á”¼¡–’‡jÝPC­‹¹a¢ÈÛ¼Ã´åµ\c*[êñÂ'Jõ4®™QnÀØÑ#Ötñcyl»b)=‹ÇC˜t±Ÿ¹¥
¦&¥Ý^ZeºÏ£?Qùa'þò$n©¨™y®Dtšh‡0äºÊ¥”&Ù-
7ÎŽÑ1„h˜>*mMG½R^¤p£”?.Û%”×Ok‹è5Vº?h3×qsðP«8ÿ%æ<à)*ž¨ÍøsüÝžNÌŠN”_já¸¤@ç>
Ž!/>‹NûÒéÏÞ½ÁÐ¡¡–_Fùˆ¿mi;ÕTåêP•pÔéQ„4´´H"©KT1Yí÷á,è‘‡†ÿÔÂ”W-/€^phx2äâg™M#OA@ë—™J(‚¶Q5X9EíWëáÃ²áONA%öÈrƒÆdDðc„C/,p”)Ò‚Œ‰I¯vá<l`²Kƒ…Kˆ„5R•J^öŠ—ý\Ù¨²ešÂ¤hÚUŽZXiYìHÙW„àŽ2Ëð„BË§ãZ­8ú”„Ô3Ãp­ô>h¥‚ª;1¦4Áµ°@q»$öËÂ&I¥zß;*Žz¢§Xìd/F ­mÄ(Ülï\œÿ3	¾zÆžÍ832Äõ°˜_Ù7Âô ²§€U-úã\rµí7€ôquxô¯kIòX|ÅA}‡ÎÜY±Š Þ©Gýíûv¯—&=P]I¥L•ŒA”Ë1d­dì™¾‡Tga³†–N°|ê=4ßZbœJÞUÿîiEÆU&(øO©¥½I4F¼]#€Ã84l‡Æ·'‹Ê’õQ’ÅÒHÊÁYDZƒ³›ðÿjƒ*÷àGíi Ï'7Ot>O¿€3½ÊÀøß²´Âôî¾d|‰ÚÏ’îM6¥YSä|´P³-ó7ÿZáæ_fþÝŸÞß~³»Üþz	 ÿ\•¿¿?ý¶÷hU€cíO—ñÔ¤Ô³q7^NÕ8•ûaãæCê›4‚×5
/ùqDE€N… #ßiÚHY'´ò&ñ­ÀsX:sëP{÷=sŽ°Oø¥fxPªyôã$Ís¯ï; X'Ãä'Í~*Å’lyˆÎTkC}`ütöËRÖâ¬tyÞ£ÀûJÈ§ð¤otÃ»»÷w›Â˜+Äq^ÍÛ‰57NJœúäŠ…? «N{@Í§Sì&]ë^@<ŠõLÚ¯á÷"Fêàº´¡Äo.¤
-ÆuÇóF¬ ‹UÙ-s+œ#3ï¼³>Óœøpþ®™Yú6-í¬¢©RYr^Iâ’’’Y8®€*2²Äø¬¸Ö¹ç†N{o„QR|‚fíÖ{3³íƒhÂj==ƒ£ú¥ÍJå²UòpÅ„×ð²rxYþÝTÀ0Óðn‚6DLƒ¤‘‘Tfiå5«âº.T¨‡ÆeëMN4ñNnxIõ9°tÆl1ï¨"ííšmS‡IÓÝþÅóßvÙ?.Œ0«š«_‚š.n5ê–Ï¨YJ"*|`Ò:Ï©bQØ&
ß¶©—ª¥j^¨«°{ûÁmVW!Ý–UÀàü\³HB®L¥qŽÃþøsËþÉíÕ¬–0yýl®„©ª7âÊÏ\³ÂS©-4wùPúuÊKU‚ÖJÚÀp³×ÈÄ¹&Žª_^';p„2¨‘ºñô]h¡N4=}îªcéy\H·Anã/§PObW¹Z|¿ÜØú»ð6ôÅ\²á‹=Dˆšz‘õ)ààx¦xÍ*šì~õ»¯Ð§Ð—p‚R8œTä=EN‚í¯6¾¾#©*˜2%¿ñ:æ>}]jÌ=2«I"îµŸo/ü<íÃbð´¯×ñ÷ìº¼ø{¤ûÚÑ÷z¿Ž½×‹´.	Ä¯‰YY°ÛD—íÔbm³Ä5Y,uÜÂõ‰¤.NÄÅër¢©'Yè‹óŸÂBÓçXjk¾øLX´FŒ5ï°Vx5.ù„ÁÕI—ZM±¤!o_AÜµòw
	ËbnkHž›TöÒ3¤†ÀT¥¡WêÚKdj¥ƒ†f™Õ"ÔPJ2Æ®‡A7;¬rIUOÛ}ñK9XÐJUÒbà‰´xC)vø‚’¦r1*µqóÎ6Ù2ý½ïîÔö]häväÎYñ~»ÓÉíµlöˆ–œ^©=Kgãòfñ®çõ@Õ¾œ™d—Ì&»é/gFÿÎp¼KšOlºd6ñ–¿œ¹|op>2sLJy%³ÊïºÒ‰ð„œºÂŠöµnü<«¦”öš]‘=/´j&¨FW…R$òpü'bäþàâü—Ýø]K»éÔåj—ú÷Ú©h8k•ÑrQÉwº‰hL„Rv\DWg+6ób,+"€(T0¯“Ì^¡$³xm_|J-î Å}‡ÔwÐ ÎÌg™\2¤d'ÿk™.ÛJ’Å²÷½N+èûÕH‹—ôu¢XþçËKÙÎ«œ&¶ï[p‚»½÷‡éÝý²RÅzp¸Ì£²>¶è½Nû&ŠE]ó÷ÑÚõjåuí÷G'ÔR7@ß<A5åR“­"»t¼q.7Ù
cóþ2ò¬7§çgwÊYVÝ8Ëª{IYV]1Ëª{åYVÝ¯A–•žá;ÓRVÇÈ¿AAS¥XE¬³Öî‚¬ïZNPV_­|¤Šºa+qQv,¹Y5ôÎöºnêKò.íƒZUøC²0{F~X5àýîÝ:}ö¨q:é·Ú\V]¹—˜X—Élë^^f[FÆ:l¨@®2óGn~¢CpáŒ¼¼Ì61É+1Ad&/9³«ûÊfvÕIw©™ì2QªK½D—Ø\Q;Óe*Y)usRD=©nJÝe
uF±¤nþIAö‰Øx”{Ò­Ÿ{"Ë<‰'uâ´“É“N*§œ°ù©3ÖŠOT»¿RªIÅ¼i¦™TO2y3RdhyÕsFV×Éð†ah¸Ý¨²OÞ$×÷}Ï…ƒÎDCèS]Ï7šW²]#¯Äk$•¸aiFI2úhðÒÉ´ƒ-s`»›§üƒ|ÝìàñØN|kò—êþ‡ž‰7Â?ª;`€(á¹*þ%¿Xþæ)þWþ;-h—Ž‚V4äÚßQ]ëö(!!IMß‡õ:@ƒß<åäwñ¢`1ðä¨ŸQ$C ¬`p®~*â;ðùÆhnJ+Ñ½ p¥„oKÅR’Ö)ÞDQû ~«z¼#Ëß1eŸ¸Ã½ü¯ú#È×¼E}ä[ö1Ž*=Æä/èñ}¬c=¶m·ëŒL+´(4˜~Ho˜üZH~Š#Ø®ál‰$ýæ5|è û}h7Où‡BÎCoL>+(‹*›¬°z÷è*õ·üÄœŒ°Ê©Oqó4÷•üI™lÅœ¤¿Õ- Ê™~©:9î†žcLí%ù÷ò6he/y3ÊŸŠG#Ü˜
K%ý¹tlŠFËî(ZµÜc;?ˆÖNö›¼-*…Àdå7¹Ežä¿ýˆ¬ógdíÍO$³±_ó2P¾–^¦éL³©û„¿¨Dˆæ~&G!&Aq¬‰¨Y³if2xdù;¨þŠ;ü»ƒÞ lÚÖÑÌlÞ^+“ñ©>%oÃµh¾°‘ý˜ôßÀ±é‡ÖïZt™Ak…˜#¦+Jáœ@ÁŠeË¸Û¹Y9'hâÔpÿä=÷À“H¾’ÂÒ=ß0mxÙVèµ|B‡;Ôd_Áû†c²RöBÄå“å¥ØDÍâÎxDÔqŒoN›ÁºÔËÀ_ŽÄÜ¾mš–+±eÇëá9#è ô°È 5#Â¿G­µP-á?ðtó‹‰Ÿž…Í9#¿µjüÖâüÂ?RM4Ûi<Þ #¾¸„–4 ‰†vu=1¬â0/ø\é¥0n¨x¹`¨xJ–R¡¢sA0Ä&´„'ÆC¤'2“a»ŽíZ-ž¡Ô,ï÷G˜¤ýû.Ùeö›¾GîÚãgZ7÷³.KÆdÕ¼ÙîUjŸE‘Yi›}Çå8ø‘Yš£ñ‡ÔdP0îoÓ¬âŒÿLÍz~zqj|œb¢ºÉ¶t´S–a§_/£i]äÀ”yÝÂÜÍÜ×I.gþ§Tn'&vo°òÒ]•…·5ÎJ&k¾¿TQX.³ÍƒfÚµ/‡«¤âXiRýs>Q‰v³üXhó; OxÌ²ÚG×Ås]ˆÛdR!:°Þ¦ü‚²€™	‰÷†N¥úÂy¶¥(§[Jå	ÔÇà-Öb{wØ"F[Æ+‘Ûƒ-	ðŽÂ,=<ˆÌˆ	ç!  ˜ Õ4©Rþdá£[¨ŠP2š=+Ž_N26¡í(ü{+Ó>ýMmd*É²VÄ9F+,º°n,Ä!@€Šhg¡>qYiY¨ãàâüg!U0Ü±ÔZ—‹Jåþ5N,×:Ùù°¨E€ÑuÚÔwj°ðÎEày€¥ Ðj]3£”6u	FÏ‘À•±Lÿ"Óãßå8^ô½‚ÝIÖdZÕ—5¢çj)ŽÔŽyÝ¨–yÆhÍP+Ô4fÒ€Î$ÂlôH>†º}ÆXY(‚™Â2#t Úá®Å¡®Úa®e!®Ç¡t j+x>3ŒI˜É|òK‹B4¥½Ò‰™¤?DÁÌ(gÚbÀjÀ°¢³OAËô°"À37…v>'†~
n7*¼…Ïÿ“Ênn•ÎvPŒû™=‡è<ÐÅÅù' !xãg°5Y,œX!7]·-AI8©tZå©9(¥<uH
	ÂÇ’)@¨ÞÅô4ÊŒù² ý}áW¥G@Òú„µ’Å‡.Rj1%¨ôY+=0'²F—µñ¹ò]FggJ_µ0"‘%– ‡¬°¬ ápEÏ4B£õ$áïMv(|´Ä²³ ªBÀbºìUÕW¥ê¼ÀÈÓŽDÔõVêqÌ—ˆ)I	±cõñŸa©#jÂco^TáˆÙ
Ø³rZó¸c¯Ê¤ª¢Ís3ËÓ¾w:ÍSHYAôWe*eõ]rÓ¸—ÎdÄÚ<Ð IJ\õ§Þ~d8¯æôîx¶[¶ýwdOí}ûtzÚT§7†òJNï¶áÃ1ç‡Ëe–Âì=ø¯_Ÿm¸ØÿTŸDö3ŠîýÅuÂ¹6iÒ\Ó9ò²ç’6¸
rë‚Ú‚+93þýD"M°ì¹«ÄF|óßÒï?ðÈ—„É²ˆùÁý}™	 #·AÈ$ÁhåÏ!NEÚ?0y5U5šÓ“Y¹ K%á«E‰,ªy<Qíw@5¦3±óÊÊÁúý%ËîG]"jšn…l×:b[ß±:îÀžøø«[»ÒÒ¢tûfæýr{`ØiF82ÌÜ¢Snx)Ò÷-wVãñè¿÷pí®Wh—_o:ð	œ>ÿ5Yñ8Ó©SÒãé~ÏcH@Yµv/uƒ–uTbš-šNÍoµÍ5ââ:	æ•ÒË§’\.I-Ç8¸ÆMÔZ©ø’œÕó ˆ‡Ðl•´nIG=ó)ðC¿ISáJ›´‹§hî	=v½y?þ¬ßh…Dóò4ó)–×OÀ€§7RÇT;ôíA“ÖIz#ÍÏø/åAå,ÀÝ¢qãF6qÆˆ6ƒ¹>¡‹ù+†AŠÇªEY½(üiD¿3Ó{ñ]%\“ú‡ êÚ$9—ä-jî-î‰Îeº©ÚsÅÝœ(“{Àmõó.yŠ˜|9!ùJæI'aƒ§‘zÝ÷¬˜C–Pa˜&&j€€Ô)4_¹H03;§áàA¯ü… –Ñiä/‰òZ'i‚§ð°¸Òa†åmEÁ‚ëª+}ÏÂ ðL+(®†¶†hùûöÀµ{0l–ù)Ê³[r93;ïÝÞb93lç89ðÄÅRÎÉ'xN=W²¹Ðo&óf?¯p2ð}ºëª%âäÄõ™ò„˜¼ÄWñ!|í&ê²ç’¬ r–$ÏÿÉfÿ°¥N¶r}îR˜§#‹ƒ¶âœ:ú.8X{5kPJJMdâ¹êAˆm<rF*£ÞRdÑÏ^\p¥àbzö—"¤±’2úüecŽ]pX!‰ïçwyŒ¾Û&¬–ÁhºDù!¾ÊÐCÛå¡ý   ÿÿì}íoÜFšç¿R£ÍŽZ3RëÅ/I´²Y²#–Çky2Ùógª›Rîf÷°Ù–4:}‹ùvŒÅa1HÎ‚ÌÎ`‚É‹³ìyóè?¹zªŠdYd=E²[/i–¥n²X,>Uõ¼þ~RH[êä·ßâ9l<Y’†8Hü_†\f ¦k
8t1 ‡˜³ñ§ÌÕX?t÷p)­1àÑé\«‰ßfJ´^p(‹)GÎc áóH‡__+'ÆÀÁÇà´ƒB—H¨q¥ù>ÏÊ‹ŸÊ¸É¤ºŽ¢UPá?”:avÐ§ÿö®Ú -k‚z¤àŸ•|µè¥ØÀFXÔ¤›·õï.2ïÀw$>’Œoøtæáâ:¾Ïè+S†«OÂLÔ2@1Vˆ5ŠÝ:2ƒ«Ýý|f§ê±—ÎóÙßMb	ÌëÅ—ç¥n×¼Ù¡ŠMµi«í*©6÷j½ƒß—ÕØpâÐ¯¹áªnüÌ-lðcõ—Žo­]»ã´÷Ü·¨?
!kRÉôh9/tºÞoÜtNŽ?¤¯²œÑ9–ÿÌ¼Q6;ÝÚ"{"‹›ø¶PÈªÎeTWvUÔY ‰gÚ=/bùXj-ÈºŒ¢R´•H'>âýyƒÕfÆZrò1é,¼}N´ðÕ`°Fƒ¶“‚ÁŠ¼î±œ¡",º#qÕ§´dtÐDw(±˜:æñ€”zQ¢¥rˆ^™8È/m¦â ñQã ©1˜×?H=@c
ë°â~Ê(ïUî~»áÓG½Ð(füUaãÚ¾Z^a…Kf‹LFÈ¶óÂNòËÜŸãÖQ¨1Õ˜˜\U–ÿ†Æò„~¼oùƒ³“¯Çþš-Qf­uY¤ZÅÄYà‰Ë¢ëÔ#°²Z#Á‹Ê˜5"ŒfdÜ~	ÎÌŠD)±_c5Î5´Ó	T7ÝÚµ–ŽuÓc^ý× ×5SþH·†I¡øÖfF#ùÊØ½é¨ã!yÞ9;ù/Ò ý½ÿúF,ÁéXÝ·¼aS€ð›5mJ)¨…@¿ZeÐ~»½œ&®ý•ŠŒkP½««Ì% K+Íöjó…S´kžŒ~66Ï™¼°™Â+nqŠŒÆ^Y%PJèYçI«ãZ@çT|cŠ9þ÷„KŸÐ®/Ñw»uE
¡2ý!÷Õ|xú=‘9+éN]®Œ0å’ / Rƒ×\Ñíèe2¬œû]†ÀPÀ4&[OX”ÕW;%1'ûÔ·/Kâp0ÃPp'åámÈ§\ÈÒ¤¶ DÃ€A‘
pPHø*~ÄXØÙi ó BvJü¯Ú c-õËEÐ<&f[2c'%a@#zÒyu%CÈÒ‘ÈL¤¾Ò@ÆWbÜ¦ÿù<Q{5)-²ª{2–”(G|Òxg'¿«°¸ðŒ²¢µEœq±––'Q‰Jbþ\ÌâGMæ^Ù©Ò“§JOõYÉî* Ã-øö¢O+ô¼J)+ˆàu¹©Y89eNNã<Äf¦çi>–yrèr	ŸÈØf*sîŸè±°µerNáæ>àM·T8VØ8^3Gh‹5èÆ›—Ô ìO¯op/¦D‡t‰ÿÔŒ‘™uÆÚVEfx¶Bƒ =ñü»ÅðÕ$Ã´Â€Iøˆm(Áé+f¿„ãÄÍ³ Y£)aP»ÓX‘’)‚ˆëV mƒy Ø]NáT§‚”	Øn
ŸZ Sß9ý®ÅÒä;D›ÔšŒÅ–Í™¶KÍfm¡txæö½;d½=DMØxÊ*sri&=Ãî1Äüùso'3wÒ©¤R
©Ys1:éÆ8|xJÍCÈ›-F~ÎÕÊÿætûµ$4Z<ŒpÆÕÄGô‰èòµ(ôÎZÇR´]<œâ¤‰ŽhÅÍ­v³TeŒ½}‡yúº.T¥Ôûbz{T¤'ÒÕv:".[g'_1l^	"Ø¨œÕ£›‘•ò¿ì‹Æ'öUU>b†ˆú‰(d«¦Pª»%ØÌ“Äé…ä8ÁÐýÈé6ÔÁ0ô‚‘—Ñë×n‘%Ë!ÙÐ¡Pèè¼¢Cuvò¹O:?|é“¥	Ž„pÂhXø[‹ï[l,’u¨9~àùÏ	G‹Et³o~6íª€Ùå=Ýžî4E÷ïk;!«<Æ¸	®ËÁÊ¹‚µÊ8Î•›²	TeŒð <»;:9¾·c”~ùÞžîr®Î!›øMW×¨2ÈÊÔ4!¶od+}m¿;°níLÙ¯xêè÷»7½ê8¼#A‘ŒÉÆ%v5-®æÔxq-Ï-$AÆuon„O#¸¿4½"ZHmÅAšyÃ›QZ|’èÖ½Þ ËÈÐx&`2N|C²Á`Ê™Ø£µïºÏŽà¾«dÙ|ú¡ë¸ˆlRå¡¡®M:÷èü=‰!KmÓ…ªªˆ¢¶Ü¬ªkù*‡íl«°ñ! ¤¨fæ»Ýá**¹hw‡ZJ«ô?LAÇ[ZØ{{˜~CvúoòBØ„¦¹Ê~Á\Ð‡r•þj<ÿØÜ¤O•×äõ€*ËdŒÁê)x°!E _è«ï®2šã÷š#¯m¾
N½Ë!»øU¬8:µZ©„.Æ—ÓºXÁÂ©ºiý($–&ÅöË°XÊ‹S¬$»KîíX^ ;v17†Ý%‘©n¼jŒðfbç¾DðfÜ{Ó"›žòÆºó$8;ùŒ‘Æ¡“+v¢e-9IIN*XvÕ`Êä\±×_ÈG /õæ§¯O ie|à,òÉêEãô2qÅeFË£œ™ÔØFŒ+–$DÂKORùéÙW-ÒýáÛ¸>£ixvò—)ÒØEA“‰êFëÚYn‹"<X;Æ˜”KQwÛ‘Wz<HcŒd™/ši'ÜÚ¬ðPVp– Õ*jÖ:@3‚émXh +ª…»jÇ²¨aÍËªR•ð&±'<Arï­ÊEh3‘Í_D]Œélk&ÙŠ·iËzÞ{wV	P@û~Ømrð9Ôbzá-|ôpv®¹ËÿNž£ÉÜ0"KsÇäÚ•
¾ÿ~™;Æ¾qW›Q¼(å=…*…—Öâ®ï±C¥q"Ñ§Ëœ!;Ê6gð#÷Êæ,Û.2Úw\3š…ELâ€3m„•3îÙ Âüæå¤ß~9X¤ÕÁ¥*ƒ+TŸOEpÕÀÅ•À-j÷ýµÅÿó•ºàØjˆŠ!„å U¨Bµp©zàrµÀ¹uÀ‘ë¯U²¸ üWn:ªüm•-úM¹™ù­ŽuÅšßªõ¾Öµ¾(O˜¦ŸVçÛœmQßkUT[_]¯mMï´î6uíe¨»½¶JžôC§KQ*UÒ;$`Ù•ßê˜V1¸â:c	new&¢äµ¤×’U/t{C, ¡Ø&é’0Ïƒ9T4a!ç`…Úüm‰T’Ÿ²Bê!YßÛÜ=¶sCô‘ÛÞtB'"p Noàx{þ0/ì…p°fÊus{Íxj9êéèðìäwœ5à¥ÇëxšüóÓïÉ°Ï >>@>šÏwžü;½&ÞþÛ}> œ¶ "Y¯z"F©ã³OžÐØ³ã@Îrÿ±ì<.Tz—lÈ¸…»ðÎèøÓg5§à~å>Z:ü¦Ö‚E±`A-vÅŽÙ‹qÁ"Ü¯HW/Îÿ…ó‹~ê‹8}mtô­<r6^FQÄùÒ·Y0ëÍØtýðôûqßU”ž‚§ÓÞlåK=ý›OÐôHcó‡o©¸¿þK8WÿíbOêÙÉ@HãwŒIf×WÀ ‚¾V‹²ð¦â=©º¥Œ9S©âµV HFóv!­Ýä9\\-Y ƒîÎþ2kï¼%f dšºÍVÖ-'ì4ÙZA;™4MÕ³çÈÏ]2`IZ2ß–g®¢œŒ)Ï1¤ºÇ^®¬ËXñ¸¶e«½ËÉÚáuB‚¤½À9Ô·ž£Éõ—¹MnXu6°‰ufH^±	¸Æf‰ê:š¡³@F}‡~dÁm€,z{;W Í":·¾·tjqB[AZ!º²¿°|3Ñû–YÇJ¬ ±LX{êxí¶ëÏHóQ‘i,±ò’H×òmâ2pÌtxÿå‡™±…ÝæûÃmXàAÖéHÅ3›Jzôí;Ñ—môíŒ‚¿n‰šh‰«;»t”ŽÈ¾×†Ùgo±í«çùÖËy¶Gÿý3;¸8+'U'¤“
²hŽØ“ÿ½Ít¶ê—åÜ·ñJý‰ÇF ”ªetVÛU9ie&•ìœªÅÑîQçBº”zôòþ›?|¸içjmX»šÄu“F{{ ÀQýî¨GÍ&áf›¶[^’Ð%2ØY¸™È;6¶r“,Jí’¡h¾]„`ï>£½ø•Óíº¡ºíq¢Ú´‚œµ²ÑÊ¡þq™¢÷­%H.òC…Å¦,µd_H‡y§zg'ß(^/N¾êwN¿ëÉµžÅª»N!ýar–ž3TØö§íÑ;,„ý…ú’ƒ~/z+@àÓ_xáõé„?ôn¹þqJ[&+…Î¾”êT,0Œ7{3”z;Pœ¬ñvpÜ+²qúÝªy·ZòW™‰nÑAÇÛ‘Jõ®×¥ã¶aí½#JéŸ£–ÛhG½y²Ã+•G=òsÒØyží1Oÿ™r:ì1“eÃøæ¬´çëù	¬ËôAgÍù9úw'”‰”¿SÊ-…dòey>8;ù}„ ÆæÞ*D2!ùOßÉcó{.•,7hÿE¢|]å™ÛÛ æÓeÙ³ŒÓ9Zg0<È(r:>Íw˜=¬“³(¾°ÃRò÷:^a¶nYt»úÆê	O5f®¿6›êµŽR:w,Ù¡ÀVKVÆÁ5Ö¯"Z	ÝïHÊ/ùcô”Çå‡¸Ž2‡ÇÌ'!T á1½õ²U6H›LÐß×ë;n¸ïRÃ4•ë1Š’!Æ0îöÎNþ•øRlU¼ÊDnMÏÊüí†ßM?S#*=¡`ËfµD|èýþ~à²k=_Ýó˜èÀ*³ûAfeöD£Û>¼ò¯ß€MR‰¢±€ô,9¢goIÌØ¹|Ìpd –ôŸµ`[&Ó˜žœ½þ
Šª^¿âÑdþ$vdšGÎÇëÂ²•z±–8šDƒ¤™ÀhX¦$&&ÆŠûÃöi„þ©µ¦*‘ºÌµU:;uuUòRø¡ ¦9ýs’'^u(t2Éîô¥ÍC.¿’ö‘i±ÕE)¶bðÅ¨,êrD=LÒre4þq<ÄÙÉÿöÈžçÈ‚>Ö:¬-æÍ‘\—¶:J·³ío§|•ÔÎùVI)!ï¼"£1—ìŒ«¸D^öU™Ýubaúê¨VÕQGCg×Î¬f2Of?ø`µ×#íöâÖÖâ!=fÒìš°{|µ4²¬IÅ3©,ÑqÖÒDž»±ÖÒL¶Ï?aûºˆ£9­pät«ÅÑDÖq4qÝ4Ž6Á8Z\²Uom£ïù©4t)ˆ–$ -Þ&" ò‹^¥(&Fë@ñhsâ™ÉÏy&¸&=üÍËÓW
D•„·rUbj"w"jý ¼RÆˆ»âœâi, ñ„±X—ŽWo4-.xg,m-=@‰§µäxZTá:†xZ”wq£i©.^±Xÿ%”V—qÆÔdy‹âjÝ³×_ûÒý/Cx-øâÜÑ%¸5ÖøZ¼$ù}ÓØÚ4¶V.¶¶‘*|ÖÖ4st\‹îŸÃg­¥O›Ö
î}ykñk†Õ²_-¬–]¢.shMc¼^”ÈšyVKÎ›†Õjn›õ=vËŒ5l',Á;ÆxZRô{%iòê{É!qˆ}—©-'˜=)à´íõƒÃ‰DÒrBzÃxÄÆ¸¢ò¹Ë7qM,Ä¥û2ÛôZFaKµœÛ*=Oú\(ëížçƒÛ$å49jxCþGÞp«ßæ¿¬·Z pwàzÃ÷77×ùo÷aæùNw;tvwç².W]ÈÍ;ÄÚäãÈá^¨(ìÆ®ÍqífboÉ£F=X\‡4€…ü
JIç4^£´ŠH¯_Ø×:]ØÃE&ëê,øuùkÔ£Çw`>.yƒc•ÊLƒÏu’ÝÝÝõZžë·É–ã;{lÔ¼qy¤“ò±vã6
}éySý‰kr¼k~ßw#Ç]SSÅÙVÔâpÙ’T¨HDŠvè»aË4ýHª>àäÓ(ß¥WôÀºêX×D˜È´DfXWàaÅ“É¼—M.ö^âb›€¸Ds˜’ä7åŠ&–•$ÄÁÞPÀÔÈ4L‘_CI£T5ˆô0¢ºnŒÑ¦"1º¿ÜOF-Þzó[Ÿì P×‹Ó/xGç¸ŒëÅÍdŽìÅ8 ÂŽÛ1¾Ð¡[þt
Þ£BÏ•„®vtÙèyá­#G¹Þn'ë²Úe2zíU™­ZI„¸)üÞ|ŠP	µžŠ«?aøÆL‰"þ[½¯øº’“ÐëÂ$þðìä;xÅ}ðö‘4¹Æ„‘”§[4%üÍ(¥OleTMÞg}d?l]ª§³sO—>!«dvöwŸÔöØx8C8¹ÝHÄ©È-Mß@;êrLÓ67Of!_nak€Êoõtžô>!1…¤ôäØv¨
ð0ÓËÆ³·Žè³/¼uÔ;~†l…pTòsCt÷\Ö…Ø­#-Â[Ø¹Á‡o~ÛC³Z†”{£–¶ä8zº²´r}žÐŸ7ØÏ›ìçÛìç;Ÿ0Æ!Þ!u$qÝÆ®ûC‰1ðø6ýÂÎ‹ÏŒ=ÆúaãÑW/¹@‹Ïò_|Ç´ôÂÂëÏ~éáé¹ø¬sØ³¥qDx¨j•,¯ãyÒøóÄãžSüœ,Ëd£ÍÓ¦Fy6V¨ä-ÍÎÍ±uªWqRBŒÂoiäÇ…X£p¶
ê¤‹¦{&á¬Ö¹í:A«ž·d±ä›ø…\·Œ‹FPtÖuò°lSëù­£è7›Ë¶œA|!ýqiM–ñE$ˆØT"h¡šAuˆº0µ‡<?'5p&ñËW^¶ç^rîûƒJ@ÂÃí›Ïb$ÜAe«ÿhs•ÜÀ\¥É+ÚSU¤¼¢²Ò½ítÝ!f7ìû‘`»,»:%Ý¬†Û¤ûþž6Ù­»ì•ÃÍÄ£ÖøèáæÜØ$úQJ—oÌ/--EÿÎ_(¹ÑÂƒ¿òÂÎF¿×s†EV»/\%VFqM¥¶¸l ‹ÿ½¹¸G•×YŒ¦8ÆH.ž‹‹Î9NQïHñÌ3ì×ÈRŠ|ó	‹ûäí$I¹»ýÆ¾YYZ’%qó¶7„-½}ë"„+<¼ÆëQ	"Ù†©á¿öØÝÜagc_W›åøð~Ð÷ãù¤ð´6²JÖuGÚb®èŒð> Š]¨¨
y<aKàx‚0A†E˜Šf_¾Ñ&*Ì¦g'Œ!—!»^&B×dõÚ«qº<ýÝœ1HœÌB)„ìåRÍÙîy]w{ÐÑvÜ4üI:¾v_#2‹zNÄË(‚È€XÑ;a¹ðÙøe½ËdL Ø…€ÌZ*9Õà°g»®vâüÝƒa´§F×+/dôB˜ a[.¬1_ g
¤[äýáýÞ „É:¸é9ÝþÞ/®ßÔÖ‹r’€h¦#¾ê2ÉIæ,üHî´Ünm‹`&Ù$É1Ñ¤‘äÜéx³ãª,%qpXIy’ÇSÉÜ6/Ú¥ª.ÁXâàkiƒ#–8¬½3ê>ßd6;:?­€ç»¹RÜ÷~;•YÏÞ2»“²ÉßþCÜñ‰|î¿”dåö…j³oþ@ÕVÆôØl6g©Fñìc`}l¼Uø ÇsÏ°.MFÁ²òÛv‡t¹`ùS“—áÊrÉer½Û­"–®dkÀšªŠdÍR·Þu	PÑQŠŒð1a
ãR¢Úe&›+˜=0›©­?p©½I¥‰ì/Ü4+W¬î”qv†ýî(tI×Ý®‘°?XX^\!aàøÜ =d( 	¿8.F³¶éîP	l¹m´-Ÿ²ÏŸ@)K”f3ÏÜ{¬`Õ’¬övaZëåçŒœy(9Øãd;1Ð£Å2í Þ’¦B«l2˜±%»¤FO†xäyq’_
 î8tY0ë¹Ý½¸Ù0ûOßa¾Gó4Î8)­ÊN•ŽLSd¦)2êQß’u¾)3WjÉº˜Y4Pã¿t!Ö¬‹›[c.ò/³°L3vÆ¼d­HÏ½áŽ•Q­TZ,“T©Oa‘fËxžë~0„‚ÀÝMÌÖ Ž]ƒÑì,òå 'ÇÇêrr.×ÊcðzwÐÆ+ª”°ž¬-ã)e*&TY1•k°íD(`‘Ã4ÝX‰kùÀŠšàD:—[PèÛ‹­– ä±bŸPÇa8s8•wà›ûþnK’˜­
»NöDž»(1®~H´uÇiï¹‰§nèRu¥í‡3)Q`ØCR€èíÄ!Ìþ^VGOcäÆë!;&O~ñdýy|wã7·QK8{ªq=¿vI…fªBNp7w4îÝðäîã»›uD}É§•·DØËÓwó`™Žè…Ýpâ3V·›p²]ð‹.3¿èGž»O§<aˆ«EOuÜ$¿¤KÁÇ$ì“a§¿O¨âÖD¸aÆ¸û`6ÄÌ°ô»]¤»d¡ÇpøëF°2H@ŒZ`eö¨ê;èîëa¤@ˆm Yìõåž aÜÞ~RHEŠ€1ajÑ˜‡÷ Gi=­ŽÛz¾Ó?(F¹Î|ß,£²á_£sÐiÁ†“Täbo}‚ ˆi±#·É¬Æ˜žqÕÄ+º‘gÁµò+âí’$}L<áœÅõÌ¾ßÖ=h#ÿéÀ, ŸAÓkÏ¡=	Ôò'n—J{-Ý{ú‰Í‘g"Ù³q!K¤¢dÎÚ†XôŒÚùºdzS£«Ó
xˆ†ý`aÐ÷˜2—²ð–yå¹jÔáfžÑŒÛ¦BÕîféÙ¾Jfruvž´½€¾|zÏU§4é—}Ó”}Ÿ&`2†­YˆcÓ§mAøšpŒ3à‘k,JÆÅmàˆÊUÈ"Ãõ'këAÐßÿå`³¿ï,ÑkV–(’/ýòˆ¯AxÑ¤˜irEbÌO¸Ðr¬bÁ[Šµð¸M¥ù*Hóê+Š¤™Ÿpu¥9)í™
´•@s ¹‹&Ï/À(’èè”K!Ó®ß¶Õ:’¡Ë+ÑcZ}!„¸Â½hO:NŸ„§_¶¬:‰Ç´‚µ=8{žÔi÷
Í¹FÀþ˜'^û À­"‘ò&0p¤šinãØHCT¦\,¹Î5ÁX¼å(¿Xõ3'5È“ÊkgÏ%dyŽüŒ¬,‘ŸÃPAÓj3÷)Æïž)í ™ˆ‹FrÒè/žßêŽè¼mÄ²†ŒúÁQÁÍR‡£¥À—mLO›Í&ü>Oâç³ñr”r° ºÅö=îjxmø„þž¡ä-Øõï·ÁžŠÞŒj™ªà0ÁOÐ|È%£Nq+Ú*`Æc"a6</H|r¿ý	ä©BsÇèMZßSl3Â Œ°¢~ÁŸj§àûYœ\“È;H!P´x®’ÕÆ›ã¥0rŒ‹{´±wTÈ„îWø­Šª#b8˜¸õNÇÌœB¿gtˆµÞ7-ã_ë@9ñÑ!jÍ7X^^ë0ÚÐ‹êòJXvõBÔøÅÑººŽXˆ÷:ý!®x<:x}×êûV—)ºÏ;T÷y'­Zr5WŠM•£«¨´7O·Ö›ûÝ¶§–y	a³Ú³³0jl#3¡¥Œ¾Š7ˆàÔ©Q©ýûCŒüÊR+-¯ÆàgÐÃTíÞµ&TJÓŸh«›µdUeÇ®¸rs1ª"Í+ðLLp˜ú¼¾¯ôT¼?L­^DYÖ¢NF˜Ç§Ú0C`Ü€æ|^?Œ-
/“´Â•ž~w{àø·Žnªœ…k+ŠÇ$5Û,¡àØèüð­CZ§ßAqá_I—ã7äÀ8V§Ožˆ´úÅá¹¿M3AÚ5‡ÎBAä®±›Þë÷ÃüŒ§wb%>LøÖl8eoŸÎ»Ç<zŠLJøò"É»~œ2³™Kïº¦LïÖeT9‚tºuvòG ìe¬•o^2æ^ Ÿ­Ý&„^—ö¨°/²²m¥W3ƒOcÞÝŒ<¡<»TO°æ"V\yÈ¥…Ó€<½É>° O‚ñg;­Ö<«Xb»,ý‹üœý)i™@¡me:ZçæSà–&z„¹{´•·d-ÙQ£#m‡Vx;BAçìæ“¸$Pc•™eC
ÇW×ÊÉ³ÆV£Ô¹Í#ÓäüOÙr‚çÌCf¾É£º·B[öQE´ƒdk0!À;ÀD.¯Ö{Ee´žC™iÓð
¨Æ	^jØæ˜4> 
Æo}F-òàù¼ôèúï@ §}ú7zELRQÄÔ\*ÿ¹l¡„0ÆŒšqé¯ˆANŒg¦l­;¨¤BÛÒ¡’°˜¨·Ëæ#ã¿«´ÓÀÇ[NØiöœƒÆò<°pq-B,÷EÐ÷¸»)³Ø„'ðséP,>oµE$^Þ•£¼v‹¤„b¯uÉÊ€• VþÖ‡Î(”Ç<ÝE#)].)µˆ¢|Á/ÆP´¾‡J¼—lãÑ',;›ŽG/5GRéÅwÏ½EÒ¼‘|¸µ2pòÀsýî0,Ê¢]»Z%‰*Él	äpÕŠìp¶ZQAsbÖv3¦F‡zL¿Czg'_µÈ¦ÂF†‚•$f"5ûë?ŽÁx÷ô{öO¿ o™·¤@cFàMÀDþUHÕnüÙeapú'ŸPmèwL'zéïYQ©±@UæUD9ÌEDÂVšZx´K"âwQ8”önÑNš
&§Ó%Õ4*§+3Â z’œ»{ [ï£ˆ)ÑÒfƒ„Ân?]‹–@Â)DÒ–|<bB‹Ý´sÿ8e‚Dèu¸.É€×•—6ÂAˆÏnÇ›êzNwèâ.6N7¸u´ÖMãà§ˆ³{5?¯c®‘µÑšç7s3±–Ñ¹#`îbÌYµÒ[LÜ˜	¤Zì|‰óy: UÄÕTˆcùTú›ÝáÁ<üœo¶†/f¤d:¾zð1Šhcû£c¬/ÆbâòvÙa'GÐ@ª0B€ì8‘3± ¤¦a1²¼äA•æ«o>“3ÃeíŠ4Á¹C•ÍŸ´F¤ïM «AÕ }{«Ôêñ»Êµd“µÔl%~W\vtæ²2º:ž å}îÅ†SïR½ÈQôŠ¼|ºsúÁ©@U¨"®Iîœ½¦_Ad4ºßr®] ÜõÎN>%·NÿÄ@N_·Hƒ>Ù¿yÂFÿ#]¨^8×ŒÖBŒx±ÌëÊeÒ	¯t–]œ%ßR³IX"(~–t|*•ˆ.‡«‚ˆg
4ò¶-k™Ô-¸‰ïVÉiå=ú0×ÙÓªh6¯Ä³9ë–µXã$Àj“fô’Öh¸Cœð?!­‡î‚Òñò)Ô/¶†Ø¤lhXg>òüN¿çÉû´KmòÈ	žÿôï–—þ!þ|ƒ®mtfßX¥¦ÈìF¤ôZ»6´¬1Rs‚#›æ­R.*%kI›m&k]Óulö#¶.’;#ò(ËKLZ#`fDç±»GgË±žÒM=ÇîŽ¤ 71ÏöHOpàÞ±|Ò50‰tÏú=PÁÓ1e@Ó’*Ú.ƒœ˜éšF·ÉŽ‰¬ÉX(2Éq°'aid€VI%¤"hÞÁñíè¾Ð¢F<ª=@aöb«‰l·”\ø™ÿ Ou-tNÿìwêôO¨=V<åÙWgÂwÙPþf<XÚ|¾‡ÚùÊó=Œæ{øc˜ï¶§s—“¡\(}•{NK,·‚7ÿ¥UDV“s]–Âóñé—-nËAú‚µ/žÜ>|±Ì(›‰Û²w°‚ÉÅº€P"Uì®2<*ƒ7Ýa¹ Yµ¿’]n¸éB³«¾WÏ÷©}º^-,GÙ‚+ï Q(s©VöèjâZ¬F;¶1ëÐ3Q©Jv<_ªúÁØ‘ºZÂŽÛg.›Ä½Ó¡ê´HïôUi¾–å˜Z“¯pú(³´IùùV½ÍË bb/IïòÈöúºh]J1¯ÂäYÂNU™dùŠ}(0C5jåzÞ¹È—£T–Ÿ§Ë×b<§š·­ÔTÌÚÛr÷[ý4&JTÅ¢Ù`›Î'ˆ!øÉóÈ»0Èkýyì:³™” {ÿ£‘ïýzä>6[ß‰éVw	ÜZéÆ*Úç¹ž€ñ‰[M¤3§kIÜÞçÐ†…K‰ìããXHº’Óbº–h¥Är2a£þ<×¤5T1TÎ‹dÕ<)rß£êäŽK:nàÎ*™m”_2¤IhÇåÑüJíÇÙ{æ¦¡âò/ãÕ
Kž“6©‚{	ÿ7ýÝÌÿCšá¹ÂäTÜ²Wü‘Gìîºdâ9–ÖîŒ¼n›š©:b‰<œ'·2Sâ;¹ÊŽü”ÓîÉGöÙÌævÚ™cI'$4F5ÙLö$×Ð¼E¦U©‡Y±L¶O——Ô„ë©,Û§_AçôÿD>ëÂt«lZcž>û:÷ûò9¶¶>¥êIÜJ’ÀÂr6×1ã2O'î$ýëCº"0zÿrÐ¦—s5?F þ—TÖûE§#öW|–f{/•™jƒ¼aÉo*ûÉLšô2u3	'ÛH¹ˆl“Q#XÀG¢™=£5BñÅY,¿ …qÂù½?.®:d·³Í×Ãäê]¯5W¯Dž^…½‘ÝFÿù—ÈÐ+Ÿ'ç+ÅÄ'Á“pEÁûNöŽ7/O_Ñ³¡±²Ywöwéuz ¹tQŒ›£S=F?©¼œ(Ó*PŸò‚DïRxIûì:'È¶öD‹À[±'DÞ0³Ì¦Ò®i•jS:’>¡z6_O	*u³LvÅ}°¸¬GåbòvÑxïöDû¨p¤Õ¤ê½+•ïvaãñÊŽƒ]à‘ïÉ¢
Â20ofOBìÖæÁ¡*´°½Qð\Z‰G2Z…O<Uà«)ð¢(ïÊªðÅîxIƒ—þ¦Š|þ%•y5³ròú¼˜ªòç®Ê?È¼Žz´x4ëðòiPƒ—…õ²(ò©ˆYE5_›ªñÊ‰ãSãyûT‰7œ;!%¾ø¬â¸;§ÑZÃ$ õØ|l„e6–±4sA’=•±Èj³=JM€íC¿%Dg£ßvà2²\‹ÆU0¾t$ÁÑ³”F»BÞÊÞÌd¸Æd6{üŠøÉ›?œü+@ä¾ÌÖé+ƒLE“à
ŠU„&qFÑ?¡àâÕe
UŽï…Ü¨É¾2ÊX!¢wHðñéwN;	+E¸j€:m|?^@$F-¾‚¹ÐÊÆ·dŒ4Â‘T*z5ÓF:Æ;³ÞuÐe©f®Ú•ùRÆÉ]ÈM©*OÚ·6Â+˜àrÑ:ˆïY[áåmðN¿ f^”GïLñ½èR!ÈY@Øb8ùç3ƒá`Àt ª­œ]nk•+Úµüð ‘k…[VÈ×$Íu¦\'99¦ŠããÛœ|}X'K¿ŽûÁ-£¯‹=s&½ãñÝn½Û7<E(ÙÌ¦¿þgˆ;ÛJÃÆè×[,×ÆÄ•å”-B™"+cîM’Àx°àŒÂ>¡“¦ßíB:£LÒˆtM$×|Þ‚ˆô,/AN:$Îx¬ŠcHrk`ìƒ®œïgIÖOE¹çg†ñS¯·ûAò]üzý·q8*Ð‚V'•|És7RÏÎ2XlIµY‚Tß¡§64¤ØG’Ù@úãx™î=ýdMÁ2–^ ªAœŽêy<"$~‚4éx|2–aáÂ¥,+l‰‡^Ö‹y³yU¬.õ¯,ÕóÖé«W×ÄMŽæ}À![q|GPÀ=•âCÁKûñ‰Ïˆš
Iñ‘ä þèt¾©xJ|ù²IHÕáäÖÆÃ=ð³„túuõIXÂ¢©úÞÕ˜‹/[=Ä²<IMš¼kxz¿çhÒiñXF?0iY{À‚ÜrL‡M8InÁß[:óÊó[Ýï³+èì—ÀW–fè20“_¼¶4süµ,T·™Iã—­±lk.—6˜'b2Íê[Åg2T°ƒë°„óLÏAà¾€Þ<m6›ðû<³‚mìÑRv°©;ð“ó5¼6|Bþ„î¤¶6:Þ^¶ éE÷[ñïáJÔõ?W\ÎW:SP`Xé
…MZã¨J"1Hm¬ïcÊîÝÌYY¤ÝT´-KÄ(¥É¦s¤ÅõÜaŽ®Âè§N•øê‚©.gôŠ(¤Ô	áÑg‘- ý“IµñéVtw“¼"°SÌ.ÌbåÜŠÓ‰°`G|á¥P§¤¿fæ…¿ÚÁ>ñ“ìt´všêæêh‘aÁô‹3½$DPhç»1
ÛàåN6z«'°3Íèœ	šÐ>>gz…§ºšÏ¬6™~Ww^=ÍïÚï}jfó%HZžVª—MhÅÊ¸–›7
@½¢µ×fÓñƒ»§
°Sk¸Ð0f£óÃ·9€„ÈnùÌïX¨8ÓU¯xÕËƒL¿›=kºâ!i™†rÙÖ»”fuô,kŽ‰tÍkàéJÊ†X1Å[x}¹1hÂËdëÐì\3¼„Àé¿^Õ³×_û{Ì÷OE6faTHß^Z‚˜@·|Ò9{ýÕ u×òP@´½§¸%o0aCT6Øò´£œn¸VáÇ¹>ùq$ßdü(‹- ¯&OvˆÂ"-Ü61tv¡Ô®ç„TzZ¾óõð½fØß¤¿Ò÷*}*>lÀ„óÝ}Âÿ˜'³íöâÖÖâ!=f'<,Ø‘?°O]ƒ‡<GwŠ]¿ÍU'ŸL{6ë™Ízždœòxêe3™*ùTEû~TÕ¾¸®¯Ö•ñn(µë1Hc&ŠÊóP•R6æBŸ'Y‡Jú3ð6¤?ãFVúSPCpAUe`6À¥®‰-X“¦ØAT}1I¼1KZVPtQí»)1løtï+1zŸ×È­YÜÃF{`mŸß+T<™šº‚—j‚Ñ¸ú¨°‹M€EÛócr?TõÆ˜·1ãÈÖx$Å«ß‘¯.ÅÊœ­Þ,,Oªöf×ä±ýä„¬¨¢E=¬ÀgRË›±pæ²š°cRm×=]£ÚÅt±¢<Y­	¸¬ß¶¶‚°Ê·.ãÊ\>qtíýmÉ3”+ûúÎ‰3(í½rzR¢ð+¡.nQûð¯-þŸOz£³“—¢$-ÉôL%ù–€‰Sa†÷HœFÄkË”*±+/ƒ/«KƒQŠ93˜jÈ2-^€š2cŸÆSc&køJ]µÐðÅ¶œ­9+ÿlåøÓÒW—dì³ßÏ¬4ÕKá»Ææÿa‰Gú*#V	³Ô×°INæ~†~w›.^·
<ï‘·©ép3‰¾)œ3<zR…ï$& Ð2ˆ?m§²÷R‘Á¯«þÎ²ØàÒí²ôp¥éšíŠoeÆ–cfm€	ÆÏÜþPìlœ"îìõW‡ÉöI·¾þÚâ ìM#_¶vûÕ!ÛJÿB:‡,Îõ¿<žü;l´P¾Ë‰éXw÷ìä÷-‹^XŒ´XÒxV©$*‰XœVPÌ[ü˜ŒÓ„ç ƒvÇ	
XQ0á×4Ãˆ˜Ša¶fx@Z
Ë
³"	Ñ—ì]6Lj\P¹ +è P¬ñG<Ÿ	çg /=*YYŠ'E	Š8¤:-ˆÐ„Â•ÑÝçÇP"†óR«b)ôŠ9I9ƒ/í”Ë¦]6·¬šà¹ó[NØiR«¬±L•6²@–M{·±J`£ã¾úþwW1þ">PÀ eØ"\²Âà‡oÏN>o¦8Fi¼z/\¯$­Ý"²$üŒÎ»a@~N_~µwÏ_éÐÅRð˜®èÄ +`Œ‹ÚÃ¼wÕKÞ—F‚­|r-ãó¾ÓòšÌ¶¥Áh‚Í‡;(é„õé;ëk…^£ÝƒÖdê.AÓ&®ft
g®â´„Û£h–…–Å5³‰B®u‘§—ë½Àkø:îpa™­ÖyìXÒ“AzÅù…iÁ?¬9½bÕ¾×N¸ÅèïFn±¢;éï¤ÐÌ›Ök,¼ì˜@esòsïìõöH†+…/[‘®z,TÕ&bjM"®ÙÒ±¦©V`jvØ&ã§æD)6W	pjýÅ't¿­4›Í9DUI—sUèÊ' Ž§[!95¯Å•’_”Û-ë£ÆNGYžlÕÀ²O+ÌÕ-.5nQFGÃ	_UÉf8G(?UªÆˆQöÐÍŒLÁŸ»ý Gæõ\¶œ.5ão*d³kº£®=ãKäªlçôOš•aãœ¡Ç˜uÅu¹qaÁôVŠÃ*òø
Ìò‰Aè‰%WBÈkK›¯¾ÂsU5ÉÖÙÉ¿y¤}ú7°m~øö‡/éÿg'ßÐŸË‚h2€ylôAëya„	·Þnk8ab59p³¡"¼ýØôº/fÉªòK¯aÎ
ö~îî®Sç‹­:t_èÐç»ÉP xËk\^œâÄ= Ða”I¯î›„íµýÝ]º¿‰åTRVSÃÇµšÞÐ£–æª0…#"Rù+y;W?”·uõk9sô¤È ]~?„•º¿ï¶“ïúT„¼ð0÷‹-âV%I+z÷§·¼ôO:g'_3äåoZìƒHSBW¢µÃw÷ùâu€È‹³Å±åv²u±¨vë„Ï U ìyqÿ-63ê.9	¨zœ.rT<-+²R×YeeÖÍiÏÚÔAÇÎY|†#Šƒãå bÝÓï©òï¼MÄ2êfåˆn÷‡oGÒÖˆLÀ/®?ì|Fm©nlÒÇY](“ûdJ´N°sÑšh=*Z³çZ×–Ãý¨™Ö³ìe YªT/Ë:(:ŸÑ!÷÷:o¾q¸É’0ê‚ÙòeÌ¯>fõ¼¯k&V/œ²dˆ#—%ƒï)%H2ø…iŽþºYÓ±ŽU•œIœq”¹/”´	…éô;‡*KPÅöŒl¼•û ÇsÏLySŠC±¡®ÜS†)Ã¦%ÜƒO´$Y{F»±ù2¬³/Þ|CO~áüsIjË)…Æä(4¢«B6ó”;#}Õ”;cÊ1nîÉn/MŸ¡ÕhSúõÔ'—/#~ÐF)˜(OFÒ‘)MF.r9¢ðå"Ã¡˜!ˆOºàå²—®B6„xÙÌëA	ß>;y	>þ³“Wt<¢ÜîÓ½)Ðú8€ÖÅâoÅ¬™Ã÷q¨½ ¨ÿ ¿ït°s	€vCÎÙÒž;WLcÊîYÑ†3OvÐ»e‹>PHvVØ§Ý5/|ËtÍ[XÆl=ŽŸ4åù»}È9Úè÷@ÙkìÈß‘Ÿ‰~˜[7pº²Áˆ·hü0ð§™ŠãlòaôF5– B`êÖ!œÞ¨âòf\~'®]+åO”¶Xø	“?!¬–Žz€‡Hmðü¬-Kˆ~8JÃôÃ1]Ü+_OW_9ÓŽJ ýpÔÜ‡VÎb÷ÖØýp”Âï7ö*ÂßÖ|´:å‡Em¶%¢ørîø³®Õd Æ¢—"Vm{|1ð¹œï”‹ò_”Ì”ò÷3Æ,Òg´ˆ´7i¾¶¤f¼qâ8¡ ÊÃt!’é…µÙf$bèn+Ì k®ŒQË±‹Ûg°%³þ¿"O+Š„XËM•ÖÇ6ŽÅò`A˜PóË¨,02ÐFc Œ¬PÊG²¨I‡ËqTdÝ«ig´»5»ä¢`I
¤¶@†’Lv{4CöpµáA²ÖÊƒÜœ+.d$Y%a!ÙÔÉZ*9ˆ6À;pØêìçûf'	GìN¦›C´a6ku^4•¥ £ÍFSZÝ”KÓt+7¼?ÜŽËÝ‡<Rú‹ë7 ‰¦D›ÇÇ$„´‚[3ïøK¤0”K•Uî»(OFŽ%4ÑéÇ ¤éE,(kªk‹5.0õ°Gð„£^OÖbyÙ(‡æ)]:DOÖþ¥@õ„£”hÓ«
‚u™¶‰sFù”úPéSj¤4Ú'OõøËêxŸRJ¤¢mF€dagtvòÇ–Ô5ž~öâìäS 
 §_zZ"zà:Ù³T„ì”Æ£FØNÖêÈeCõkRðŠQÔÞÉ®‚§ÜB)O¹±6Þh«¼qzþð˜|¬˜¦T—©}@oP«ðú´øvšâ¶«ÊwJ€ÔŽ÷Õ1Â~àÅ‹ð‚mÎ¿%¿½~åC¯”3Åü4œV²\­.t8¾w”D}þˆ²˜oŒrÎ
ñ]1v¼7öL5¡½• u+ZOóWëýÀˆå:rà/Ìy˜mž¶Ñ
O´Ž,jË2¸)©eLÛ$à˜…j{ÀXÓHçôÏ~§J[øl¶èl…ZëJÕl6í€Õ SmI‡©&2üŽF>ƒYZ
÷ì	úÂ±£ž]~h³B8“ÔŒøÿ   ÿÿì}mo#G’æ_Iëz,êF¢$¶äîÖ©e´%¿4ºÕçiÉ^/|ÆªT¬kE²hVÑ-®VÀæÃ`1œÅ|k1XÜì7{sƒÅXXÌ5æè~Áý„ËÈ¬—Ìª¬ÌH²HQ=,Àm‘¬ÊÊ—ÈÈÈÈ'ž()´È)–rä6b1qž"ÖØŠ8ÅðŒbæé?R¨w£»`$
°¢[¥ŒÙKœì©•¥'ö’ôÃÞ;?I)·ÏÛ«Xî7°ØÁñx½øÅY¸¤Ëp‰ÝeÃÃeÉÂUÆÁÕPqpušÊQƒc‘b>­uÒHÑHhÎ­Íj8·âíÈf¾0±[¾-î²@¯%%že”ZYö[N¹µ¿÷1@šqk[0k)yµ’2FbÕBlT±a¶Þ.,›Öø+!¢g/²_elŽ“lC_ÍNn@³ÃOû:aâ&¶šÓ6lÈ˜5mSœmÛžµé©3ôú*º×?WÒ&y«x¸›˜+ã27}($4ç)·¡ ÙÊÿ„d?Àr37Á±Þ·Ý	ð7•þ^1SÞ³òZQ9©3‚FŠ%;þF"tŠ¿Sr:Ýµät:v]Xh,¸œü¢&%â9c8¡\
ªZF~)ÓçX0M.eÎ÷nÌëLýmÿ@ç0pÇŽXêVNˆÔIƒ×U¨Æq¦W&àßoÇN;C)ÖÂpq 
N7¶áÅ±lÐ¨Ð¸(ÕáQú'][ £!,Ê¸€]T
+†„ìR}£ß8¼6‚<#$}–j=`x,OÐ7%.¾Ëž\—9Çžöš1Ž=ÑÂž3ìÍö0õ¨ŒaOòÒÏÉõn1¹_ÅæÔzÊ{þL¨õð¼zÏÏäÈñ6P§q!S¦Ä+#Ú™÷Na&J+>íLéó-d¼‹›Xãí€p³jM•í.©ÄœëNÅu§eU¤],F´2¨‹žþ.Šo¹	ò»Å)9‚cn²rÕò½MŒží6’ª1clyBžÃ´P-BQªe`°$T3L¥ÛE§Ùu´ÝD¦VëÕá¶t„ú~4í¢ü(³_&N´UF´–X	©@FÍZzŽ1gY“¯i³¬eÇNc’¬©‡ûöS¬%FX‘`-º1‚µ|JéÕlíÕ¸ŠV÷ÏéÕ¢ø3&Þ‰*"WË o¥Ôjåx6±špÄ,)åÛD«&œ£XÕ¢9«Ú°ª‰¶ÐœSMæT‹”œjÑœSyá8ÕH‚kÑ;)ÌYV)âM‚:‰¿‘—m¼Å5ÑîÅì‘YaecÐ†HädK–­9#ÛèŒl\¦æ|l¦wÜì¸NÄBdc‹*ecãSY\Ê'ÀÄ¿gNÈVödÕò)XÐ
 ©FF¹–ß÷Oú©š_Jû|·5^_þ¤K"á˜~¬!P0çã0.-^¼’Dã“â¥ÛÑhN‰7J3æ”xñ5§Ä{=)ñ$lÖL2ãj8'ÈË—:x4T½¦E'ìo£9=^á9Ë=Þœ.=^d=£äx÷Er<‘ï“77®ÇkÌ•W)þs ÊË/´fÌkhbæÄyù¢TªeDFÞ[É¦ðHUÏ‰Öý_Ã€Y€E–ðªCÛŠ%9&DŒ—åž•-äÐŽw*˜?T™iY7ä‚Ó„°4q£7Æ9à¹þôFzC	…Zå°}LXÑx˜ŽAyï¬Tõ²Ü‘[,²ºPZá€’šÚ?eŒ_uO,*d‰‘üs ßôœÎÈô›ôYKúMxbòô›Ð¦9ýæÓoÂ8Ìi75´›0fn“Vc4ºMôƒ³M·©š”Hæ!lT´u0?Q¨¦ø¥‘°ÅŸï)OZÌÃŸX|÷¬ôÙ˜cî1£ÁËn;ÈG˜åè??°ˆÛwÏ\¯m\ºq®'ôÁEµÇáOUœ×–0¨Â¨á,J¤ÿÎÈžŠ;@ò§Žà×Wp¨²uîT•ë½Œ=•1Sù¤ãôO=8,Ô§2?íRÒTZ…ñHSË}+8ÚT"§²QÊ¦B7Ù¥[ªÔ9Yjµd©*ºT×÷è—ÇApÊùQá›÷ƒà¤£ÿ€K J¥O[¥–Q¥Æ¥ŒD•ŠŽÅºÄìÏ?ª¡L•¸Ï¨N ¨tX’ø„Ž¾ú’ö49»¾ü\ŽÔ†eq¤EÎU¸w^aEä`y’„á\µ<]š,sBésF§™”†°
RV¥î·æ]å[ÞNÎÅÁZÆ‘ªcÍøAwž^_þÌB*¹nË¿çwÌ‘ôo.DòþÁý™'ÁiD™‰pÚ
˜3ÊõÕÕ·À(C-	61"õ:uN¯/‡äµÔHÃh»ƒ‚í|’‘ÉKÆ˜¡sj˜7AVÛTîœItV”Ñ•5ŸìD_ó®R‚²Ý Œ´›¥"9<‚''Ój%)DÒÃî`=ã†â2Heüç]R+©ˆ&vØ¬˜m Ë	6®Œ2°)eÅ¸ºpk£©#ýR*‚ðË4pÅ¢\šL„>2Ð#z§í~pìÓv³•ç©±÷AŸ°q(_¦ò'ÜíÀ=%æç't±àïÝHý åÛ| Kû29îqM@UˆÝ•”ò~ÐÌkgþùý½½GKI”;8tx
Šï¾Ûqü6yHjn}z}þQI ÀÏEîòð,^h«õÎ°‚’ie¡ªo×½qŠLÈ â «Û ý+é:ùø—Kð–ZÚ2ùæ´½Ùíå/Ö¨ÅzHU‡W[[&›kš» ² æ.¿yf9Ç#ât©ÌP»‡v IÒC“„N…ve¿*;—·—ÞÂQÞ÷[^
T/“oýf1:4é¶íQ'¢Ý‘üóhßé}êÖù7›ŸAÕ×âNgù‡^L¡¼È ž6Þa¥“ÕìGààX_[ca‹Ô&ú/:nNiS\†Í£±p…áNåÂíšST–8qu42Ò´9FsÐwØ‡»kÒyÃê[
 E†ìe»l¬MÞIyÜ”fCàMÞä5‰ÿ$GìaÿKnY]çd4“¡6h‰qûXÎŒÄ·7ªíÆƒ¦GA)kÀÊþ‰¹P$NæCÃ´¼|Ü{ÁëÝ@sžÿŸÎ©~$?$ëVí¸pûûk ]f».ý	Kð\Ûô’(2¦nÒÏÏ‚Ž¥é_ý>…y ØVãMæ]Þº<æ	;ä£àr4Xq@!¤¹wB˜Ó~ú@.À!¸—ù Â_éèE±o§
¾¯ŸpŠ»Á7Ž*ÊN¯ÍÐ^_!‰Ýà;ûGŸÊ¾ÏÙN[ŽSbiJ¿‘¶j|ŽKÖ¢‘ØŠÔ” ¸,lþÍÇÆ1Ÿ=÷Õ§‚Ë(ýæ”Š~<qUÉ³©WSÜ˜Ì^4.k‘­×_ÁVäZ±Y³iêPÊNäZ…ãÅF„8œ0£eQ6èÜê&N·IÞa–1yÜ}”nÎ…Wèñ\Øá˜¬­4ûTÃé›™œH#
¥ÈŠl¾êä€OB¸M†¢´{
3ú¥5îóõû—Ý–Äd'Œ\ÙFÊµaÜØF"“øÅÕ´o^ÞÔñ–G%SÏöäï#“y6è{ý¿ð£ÖnÐé8aMè.ˆØ<Q¡q//›õÿ¡–…þÚ—:!ÄS>("„þBcd.]÷ûN›¹ºmL¾Ée[r`ž<ˆ`ªÑ6¿ú
i äC’‹4rJÄ’«g³úÙ	@æÙ¹²;ôƒ›n[äüÈžgîŒ·ÉÑì£rœàÄvebµ–è\•¼%x$ÄŽâèe]ÈÍ%¶aà[jz-,KîžpâÀáµ|>”É±ì@;?ÅàîäcöDò<…'±{‹Ð{þ™×¬­/]ü ê=HU“o*ì?9$Ï=@’ƒUßý!‡Ô€
aÌUPÓ(.XvcÆÄêý5¼=!îÌì¢Ç´Ô]‰»Ç~w§Þ;ŠatG÷Óþ"O=§¹5¾û¤ÜSsßnI‡Jwä´¡záÛUÄü¶$º¾üE÷„üß¿û•ü¨K+â€9®¼í´¬Q!PÄvÈOÙó]'­–ù÷|áõïq[u  þ‚rüØ ¹ÊÝ;ŠÚ‡~Ð}î}áuógã5/F|¥¼—¬•¡×ñEOTœV½È"“ÉäÎ^à°Œ Úá1ýïv+ùÆI¸R„®,Ê¬žVó;¦UijZBK?èfëMrèw¼0r:½¶rjO´ÆÃ²P.*£úÂs¢ŠSÙ&Ý
›¶ôÉ‰·	 4‰_1ÄŽ!ÃERM7£Ï\&‹|°Õé‘.“9ûž­>ZD;Î‘Ò8ÞÔfZ²—ì€ÚÀ• 
°9iùTy\}ñ5¨BdÖbh6Lä.°”Ú8)g$ü)ÆÁƒÜYºõ.›îè%AÚªˆ±™Ónls3à2½¹ƒ;Íâ×ûñðlÁBUÃ:¤qûÎ©:ÆX>ˆr˜ŠP¦ñØ­H÷Ú÷8sÌ‰\…]Òe¶.Às	P°Î gëº—j a³%ÁšFˆš‘)‰"Ç+ôó•/“s|ÎîLÙ"=§zïµª¶îªzßcZª¶úßê«'Ë€á6å2þ=0M¶HNAa¿@{¨eå•³âžÆß©èoSŽ³ëöôO¿`7ÄÔD©T1ÈÝS9f6„Jê¾Cw
cª¼¹È»” ¹h5]¬:+N;¹h8Æ”3‡'Ð¬î'¦<Çç×\|÷oóTÖ9¡‘dYô¸‚„¾sõM ¸ï€|ð£éJêD»ñ?Œ‚þ kGwÎ%¨ÃY!ðUr~~qdÑÅq¹ú>Ò¹0%ö'ÐÃçàÎ‚±½ŠqI#vLÃbu€)+ ×ŽUuRÎ’=ðÈE2c8¶F9}rjA§©¤RM…Œ	Õ•&;ØV…<h¯&s@rØÂ\äûf«/²`ˆØxÂ‚¦l(ßÕ¬¨0¦VŒb•$†»Ûë-Œ¹¬Šø½ô)ââÝKoXäÙMõ€SµÞpœŸq¯5¯/ÿÝ}2¸*–«¼º®,é*Ý~v{^x½8²îcß{‰Ž[ˆÃ:Í-ÁËU\NAÃß%2¢ròÚ•BT³.r™
I¶XšWx3Ó5\TvÑÉ-ÇÓ”cg;ÆCÉF ’U”á¸&ÌliªŠ_üŒÌn<":l<l˜•ÅëÁ,"Çƒe	
S¼ÉÓ£¨—™Š;“‘0UoD'4V+
/nª¡çù®Žå<N0yiòãØ¦ó3Äýs%·€ä³_Y‘' Bíj(%ù^å1Ü†tÊ#[aŒ¤ ÝZIÀÔ:io»µõLŸËÕDä*=ÆÓIUvÓ­•©²cÓ×P¬òÒY0î£Ñ‰W|ÇÌÉVáÔ!g×—_‘ˆª­woh©eÁ­)xlr¸Ó›ªÄÆ|5ìRïó¢$Ûþü¶0+y'9N®¬C ÿá$¢½Œ,Ã-,¥Ûpo£Ø‡Œp¡Yàšs\`/Š ƒAVz¥,pÝ“\6¸pŒìÎ<«!Þ=¥ä¢ÚT7"\úfÁÝF×±š{\ôWfp¬’#3B“ÑDããúö·ÑobwÏ@¬ã<Rq©Xz!ŽH,&22CÒ:’´€í„4‘€‚El9­€!
¾Z ©MR†r=Í:®àn£ˆ5…Kôê¼zÆ¾@AuE”îTºM0éÕ`cTÄìôÀÖ¨*È0o4Ýò5 ;8Ã6¡ÀÓI†"Á¸£	õ<ºq,Ëse–Hÿ“ò¨¸aœ È
ûaüf¢f"–òHMÒsç\E‚¥¨ÊDTN:žòâ	9Wrw)«ÍÙ¼lc.Ñ—KÓ”)œ&ã)GÃ}'ñ ø¹ÀîA|åº_Ù>)Cw¬n®É>$Ô¸–Ðj|OÁsŸŒ!Vâ‰ÖÁ•#„WnæƒÍq“	C»ùNõåÕ·BLçÄ:>#Þ)F"ÂN_ÓÞßxÌ¥‚»b„hÜ	u•‘µVƒYˆ°íñ «òÐÚQ†¿ck9¾ˆþŒÂjí¢j­ÆÉëÌX÷TðºMøÚ§;Ò¤ND c’„<)†")¨µ„G¹ÊHN0²N~›(¿¯‡½¶Õ¨EµTï{ DàkO\Õ¥ú_~·¶¸ºÈì®EN8WV®øø[ÛÂo\@Å6º©ž|î9aÐGÕœ8›ìèšsf&Bç–%$Ix¨¯‘¾û)¤.¶MÄç>¯¶ë«Ž¡Ò®Á›¹d¨ëŒ‘DÔõ+XAD Ï«Ù†bŒ0üÇyÀÖc0ž~õ¦ãÏíœG·1j\Â¡êoÆ\ µ×žùÏdŠ4[Çä4pkØ`sÒ¥Ø$ŸªrCœí}ò2™'}j
ñÀ‘ƒáªî†kZÞpä>Ð®q‚½ÙÛ,VxuÐ÷ðãZ„pÙq±'ÆD7Vm°7«Ø'ÓîÃÍZ9cº#C¯q fÁí\ ’Ø,Ž®6¢\aüLEˆÏÚfå/¯~3 Pì?ˆæN;R†¬'<
·aZ‰c$Æ}W™Õ‚˜ù-j9ÃØ»e!’¥Ñë·µ»“øó±–Øq#Î's^]Ô¹õ§Š<Ÿ’€TQÎÞ]µ¨ÅÇƒ7@ÎÚ¥"ixF ¤—gî‹iº
0Phú>í­ÓÙ‹qqÊò5hôœîCÍäy›¬¯Óõ{}í¢°¡Í"ß×ä¨:T]Ê6Zm–wh\€S~ž6õ8ïFž…7G¿›F¾’À„fX³‰ë&Öâ¨rÄJŽ;§$"> v¯/		àSªÿ­	‚gD[V<r1ûU 5!%
!Ë"Ýµ6tÓZs\jN¹ƒ~Ÿieú‰üÔàs‚©€­ìÒ2Y[Ràht8Ä…ì±Îû+óGZ€&¬ºª 8®““Ó•õž‘rÚ®7¼ÈC$L!Î	òL¤Û0ÖšPx»mU”ÂŽy/ É¥.€µ*Y\YÄW¾—f&¬eíX;8F/aŠD¥"L®0&ÀÃz9Úü…ÙÅ¬¸­´ªÛä^ò« Çä÷™½¿«M^<YN|s^,Õ&åOV¦»;[ ñ]|E.¿Q“yž=¯~²Ô(5$¥ORÒkKäª¢b¬JaZxáw–pÀéŸz°×#ty÷ztuw=`âQRðlåÅç7Nú˜´¯IPoêÄÅç˜ƒcx M‹Y,7Ê ueÙ‘y<ª"šJ¡ë|áŸ°Ìœ,Gò³CFÃ¶§# Õóvwš[ìï~ðþV†æŠ9+7Ä\M(b§8US¨Ë|€‹A/ÏàÌÊxÏ§“)ïd~¹òiÑÿTüºÂÌAÀ­»…uö,ÄBºÖhO´=§	¹dø9î³“l
:Œë>“âšüý“Ã¥íÕÖ]C])nTm‚AÛeynB…cr5‰€~$ÛÂôùÆ§{˜ùâêkiƒó~@
óƒ–çEÂfÃ>×DÂ\ª\0@5"¡äåÊ_om³½½¶ËyÜ¿QÿV<9àNãgWµE‹o:‡áÛ½3:ùèÆS$è“3qåòý–&%wL¶`_j×…qƒŒëìÛd1U'\ª7„™‹Læ™Ù/x¢²¤°éDÐ—x¡“0LJ¦‹>8}OÖHwY^SŒÓ)&´—æœvJ½RÓî¦VBÐ¯‘ˆKÍªTÐyr™[%é°òôú Ø…þUÚ_}y}ùt	<¾¾ü¥´’Œ%òÚuF¿Êœk”›*33F÷®sBÅMÓˆØKõð<þC7~x0 Ÿ>}Ò?µ4ávú?ý}™“ŒU'ý¤{
ð.Ïá_Ý]p2>d±¨¡¶´®ÿùÀ;äwtÏÄçôä/ÝÝ}ïÒ6<<ÿÐÝ›Ùõô~áƒî™~×i?Ìcê§}§÷0‰ÚE´›Ýžý­­‹uÜôû^×&±ÉgÝ“'^”š©ûT«´ž¾Ò=ÏÏ{Þ£ÓR½wûý ŸDHÊßâëÏ°~ùF°/õRþ¸›ÖZ%õ÷º’è‚÷¸¤°ÒŸ05nçÈ8ýÎ*¨üYÏ’¢Mw˜G¶ððîÁÇÉøª~Ó•ÈØpi'òÿ—ßYº¢”çÁR*ui97¨vðhH'|ÇË0ûÙZž2ùÆ¿Éú¯ßysžôé¦‘,+Q°Ò'/úAG›¤_R-Ñf|Ýt—WåXNi:f©ÖM`t6ãr2«6ÙÔÌo±“f>€3'¥‡ËNTæB f³xüâtý˜Y½A;ôÈâVZÚé$%5~¢ëËÁZ@qÕNvWÑQXÓi6¿¼}
y4™·€ã¹g8jŒ !#‰}GcÀ_
-„s2©¥à@hqJ¸ùgòq©äk`Â#OéQÚA¢åy}ùÏ-ùûoºuòÁÕ×ô5ëäMÒ í«¯i?û€Â‚÷ÿ8.‚¾ò[ZrëêÿÐ;©ÕZ&-öÔ]öò¢7ûð,ùm—e*XG‹1iê¼ßðs¢ÓŸ:aÄ!¯Íñ³§Ó	Öì= õsþ½D@«6äN—³•»¢£¥d&B4Ã‹ãº„}J˜Á1s4àØ÷è^ÇÿÂãïkÑ¼D'#+–NipÅ9ÇaÐÐ-›ße‰Îâ ±zÌ¯ž6—}Ž=ÀÙô×†+÷6vÆÊÍš¶P¬‡ôæ¸ÕrLýšÍk+bžQ;?AY¦»ó¹›]1ù¢ZÊß&5pW/ˆêW¶¸‡ì¼ø-¹Xëz/	„€Õ,©s-nq—ôò¦BV}·©sR»má$G_0,ÌqEu’¢ATT}¬¾¶Ë¦t–¼gGèÓ’btÁöSçØS†6©úžŒ	‘O¥ž&œ~{êwOK<(…d(“ã©bÉd‹e÷d +1B>Y÷ ºQ;a'3"ÙÀ`{„íçPúB`BÝ/eÝ‚õ6ô¾ÔK.³=65Vj\ýj$r'uÒŠ¢^¸µºÚÜ°Î÷u7èÐyŸš$ájsµ^¯/Ye"e¤~±'õð£~{DR<ØÓåJ*„•¡JÎ)59Õ³	-94ÝA¸•3,È—é•ðu“ Jæc+¶Û¸›oU†]7é0\ï4ýNÎ™ž¦ªÀ® Ya_²ãÎdA=	#B-±MÖŸÉPtšÉ_ÂŽ°Ô@SNÎ™ÞôÙ)4–ýÆVè>›6tuNM%F_H­>â$Rây§8FÖ!=§k¥hŠÙÁ¼™}ðêK'·+¢úÂ6Ú|a=íxî½è{ak÷¥¼pm@oŽÔ#Â±{â'Ô8#‹ôF’#ŽŸíË€¹‘oÓ8È¬^>"<'ÆñCàq´Âæp8`¨æ8ñ3‚O)É¶PœÛ¯<a<ÎÉ¿ÕXE:¿š=£•x÷!„BíühÀüí«ÿ —<Ø4ßÒ^ý,«ÿà’ÃŸ0•»ç…nßïÁj°óÉÕïºd]ÿï.9óè
hføºÂÛ¸“Æ¥³³þ6±œÑÎò4˜ý ‰xÑÎÊ"Ÿžöö,'#òÄ;# ¡;i(t²òð/¢iÀ¿áöÈ3{nï¼{Æ\ó0ÞcÄÁ^“OZíAÅX'Â,3Cšó*“¿ŽÈ»g.Ý‚1Il__þÜÕ*@³NžáAMs¿&îzø,iLxn5Ž`:ñûÐëwü04l*W«BpÐò½v3ïO??%€ÜÑ¼p¢q¶È™xŽ.@l$#¡×õò9—ýXgõß^É¡R‘RÖ•pÙÝËD*þæ®(Tñw2&ÓFÂš~ô¨ÛÜ÷èrí~c­ñBSÈbÏ¦C=–pQãû ¯¥’•+f’&¿^+_Ï¯¾&apõMDÞ$ïSë‘µû+Ðæ×R¼ò%ËQC!Ghõ$F{2ÑÙôè/´Óãa0í'"?ª-‹B5YÑÐ‰úWèž¼¾ò’F}$âÂ¿¤…e),&D™	ú=*U!ysþ†Iæƒc(ã	D¿í6k=–Xq`—pœE›cË!Ê'~—”ŠÉNÕÃëzaX[8d¦Ž|]Éþ¦ëÖ >¤ÖÏOßX0Ö
6Bì¬ÇMè®Gý¾3¬–€…xQÚ>Èî@Wb!bfxC_:ý.Ä¶^ý+œkÓæÉã½,å)?j`í†8Øoü7Ž€”'ñ(m‘Í5*>&ðn2X	Ã…µ´…¬<ûÅQúbZ‰:¡›Š:†¹÷+ésµ;çIßÄÒ<Ü:‡J‚ß\Šåâ";'^:Âôš€ºá­È 75È®d–íïÚÆ¸Û<»HÁr÷Ì9(Û·i—Žm¾ëQ›ÙnZ»áVœfaŽ–ÊÏ1^ö^#Æ¿œµ‰é¤Ì®NdÚ‰*^ÈžÛ»ÁS{'ÇÁ¦£¸ÏéÃn[pt&ÚmïEÉñ‚ÞÊújƒpo&«æ}»îl³çmïyÇ´G\¯‰âà“N_b…á Jlê-3ïÀ2U”ŠT¥õzÝHÓ'ža¶Ážb°Õ-æ1—þŒ›éôÈ†ù¡¸™À;Þä\ÌNk¨xd÷´>vÉè?DE[ÏM·y"Ó(û‡!E¹¯TêvÖO×>‹é]=ú1¼+=£oF†3ÇÙä~BpK*û·[@ \  +ëÅ¬ïù‹>]&Ïèkâ
mE­”µ«Ý9§-¾X¹sÞ¹82/cföäƒØ÷ONd—&UT’+n¶IØ˜q_;=oY<{õ“*Í§Ô ds>÷ä:§Êº±±Lè¿›ìß·Ø¿÷Ø¿÷?cÊÐœ=Ozùc:Cy½áE2«†GÒÅý!iÜŒà}A„9[´<¹Ù¸0MGo¬¿vzc8­1ªãfµÆúúªÃµ8Nf@q{³sÂw[d½A.–Ií¯–‰Ïsnú•rI˜üõžÓ< Le­A%kmqi‰é˜ÎÈ:¦“ê˜ÎÅïBÿ¼úã0!N3ÃíH—IÎiBe•Áb5ìhAÈÁ\fs1iY2¡MQ–F‘ýd”Sü±7uö!ßRqÇ•Faœ±´p(2vˆ¯Šw`ø,‚ŸW^ EIF‘XÅtJyÀ5(»0¢C>dû´5ò7 Âq@¾Ý¼ÒDäÃgå`Ò|(I
ïÂ¨Ù²¼ßw7áõ½³Ä;oƒûžD·Ìûñråîˆ	oß‰É$/bâºŒ¿zóÍü7;díöäÄM›XKZ«óÇÛe #)nV‰O-²ð¢î«8å­9Y=»9›Nˆ·K3Ž)=:ß9ü=¨¡A?ú+½Àg[þÔaŸ%m»¿&âþÜ ôC)¢6ÊS ÑÛP“e1ö¦šSà „f‡*hKQçPJÄo’Ç{6ø4ÉS‰N¨¹Å‘KI/ ê1:âÎ6ºpÛ6µƒ—õT^Úü‰^Ø¢–âé
óâÑ}t/xÙµ}x)}ú£žöùLoŠW˜reZ³ˆî4Ö²…k–'xLoÓ,:dø¯*&kù|æÌÚÌ¹‹&ÎnÐônÓäÙ¿ú–T;XÌ'Ñ¬M¢Ø36û³è¤yÚ¼M3èýW_>©ÈxcMŸOùÔ)\¸©ãwzm áõoÓzV?Nå«™JbWÌgÔÌÍ¨†Ò‰7Û³«òéÏ+1þÛjZ} &äôúòw¤ö„þ»TÍÌâÝ0ŸS³6§îç¦Tœ„b–g§ËŸþ”²M(/SØ¶š™7>•æSIsá¦Ò±ì:Á³ÃÛ2™²†Ï«™MiÌçÓÌÍ§µ[7Ÿúô•˜¹D’ü‡×—ÏÂ.ÈÈC"Š7Yã¤ÍUœ…é™¶¦š¹Ézs>/gm^>X»}»°8ú£0GÞ‰Ñéÿõ¼úòI5³)ë‚ù”šð”’çË½d¾4tëØÂÎaRŸX¼—Ij†	6ºHØÈ¯óžsâw™D)2ðÊ|ìÒ5ï!Iì1ÈË¸žŽS†
IRªA6I*ì¬ìÕôë83DÁ	Í2Ã±BõÅ,çGw€,¿ë¶M/¬1”RœÔ,faXÝäYÍ. |ÜP(Ëìð¤zy]Ë0~GÈdhêl~#!çXqè9¸FBÐÁU9ŠŽZŽ¤“›cw°\ãæàRâÕz}ï¨Ì§õzþ^f¨9<ˆ.käœ±6ðÿ$ø•‡ÕÒß`QÔ6>V9ô½(¤\H²/‹|}ñe3°ÁñSÏÈPºVßŒÉµ“Ïy¼E¢z;oJ’%‰I2“Eñ¢8è=ÃB¼?2K|zœKÉ},¦ä¾ØÁßjGéVÚ°ûÚ,g
ŽÖÄ.ŽœãAÛé¯tpaçñÞ9*\Çœ6¸¶¶|É²¶)¼«ËuuTLÁÈKF7¹Û–vU:êqú:ŽðW:ˆð!lÓmKñ[ÞL‘¨dµÁÂ0IùM·dmÊwÆ}ž·9Î<—ç—ˆ@/F¿ïè¨Þ¥Í`_×=¶´ôv=ÁáÀ/‹(žé©IQF~\¢u»Ž£¥Ñ	½¿÷dÏÔ'¼Kûd%ÎkúƒŽ±+v]qº&á—ø¿ð9‹X· B%IJ_‹…9†
“d£F_žÁ6#ªR‘O©)«ŒC…ˆDyç¼%ÔÛqÎG‹ö(ýÀÊñiŠ†µãeB7}/Ú_xfëZMXD–å%oé‚¬ô™ÃX¼k‰Ø/‹zàâÈÂ–Mý˜ŸxH?ÏfDÃL·u}ùßY
îIÊ¨€ïü:M…ï£Ðë‡òö»Á(Ì	…y¦§­ØaŸÌÿû§¯~-Oœ”%išµyO —‘.;9ƒ´¤:m·õ§ß:¤õ{s®¿ø¥Ó×Zº&·Ü’>~—ÆT®ZjÊþÄd!Çœ¦0–—|'ž§Ýö{¡Ž¨ìá*&MÛóÃ^Û>‡ý(U¤a1ý­E/EÊ0)b0&{”2±(P¾ËÙ-³¬Iˆf§¹°ótÆ¾ô¼Óg »°œq7iSs_aÞêT¥x–(Ò¤Æyâ÷ªGÁÓÀuÚ^ÊÛðê«©×XÜhªì>;œ‰êŠ”øšú‚ã‘Ö÷=Ì­­/]ü òŠÆú*«iù.4·§–jŠµCç…÷gŽ8®§Gê5°¤¬L}¿ zÓÇ[(ò‡ž–ë.è_¼,	 Ä‹“øÔRÕJn­Ü£Vé½üŠ@ LQ[êMùBÚ²²{†™ªÂV~d{´}}ù3j†×—ß‘¨å×á/&ezÆM5±Tšø?¹Îkqþ^˜‹,Õ.ÿ#K¢»„KÊ&TÂ^¬Çì‘EÛR¸S
l;ÊëüU*Úï6ýˆojÇV’›Êî«/}ÆÉéÒÓßw%{›:ÚH/n¨w£
éE~-:j.êhQg/’¨Ç”/ˆúž×öevVp9Œ"ú,C–b‚â~ØwÂÖìËûäöXð \fr.cƒ8.%9‘YCñµ–mÇ }@÷ªÏ×ò,ºÛaL²-rú‘C'èEšˆObÊ_•Xd¬•<eä­×ºú§cÆ"nÌñ#nÌøˆD‰h}'rÞí( Ã'ö‰9ïò¥Ó?®W«9®»ÌëXñôù!©Áç¸’¥eúŸI¸ÅWÇè”‘^.B[XEt‹m-žs”‹Ø1ÐE®äªx‹èyáóë½ ˆJÉ¥—XšÁ¬Qðâàx˜J	¦lˆø²’Ø¬k?šè”·.Ô{ÓÌ;“#»âGröNô–óîb¨FqyNëšn’‰¬à³áÀ*÷ZYœ}fR­òÍPC…³¦1ZÏçok!OäH}žw¤M¾…É,n\Øj*¾—+Kã¬WÑKúÄ%ñ»Œ|‡e?Cú¼9¼Áï8àwì“ä¨X•C/-Ù:ò;YŠXÆ^´²Ìõ<kE_Ÿ˜m9jA¼ùF÷@;Ê¹äh_x¤ö7§VÜåÏà@ó+ŸîUÒX#Í«ÿÍ7S[N§m§Ä’ŽKD[8‹1ÜŸ’‘šÌ9‹&i¯©¤,O6lÇ°Žà¹Ï—¾“–À³²ì;Q«ÞqÎjëË¤GVÈº‰6ÖÉÞmy_ôƒîSïE.Ok&°àòõáÌøèRV`·—¯ßpë6Û	}%“†ÿLçàøÂÐcÌÆã?ÖÐ¤’ðœ­•*QhsQ{ìqÜ¶e?º&É\•?ÂJñQ—…×$\×ëEN×õ=THXêÒ²õ¢,±i–ËIÈâHº)$;%½ã•»	Z’¤.z¬BE=ÍZXêŽak‘Cðž{PžnÛLéû¨íõoœ
µüÒ—,Í÷f>—‡c({’°B&Å_úàóø&¢º¦Û"»-öñ;²ÿät[ú-N±Å½ú].ulâ'4L!TJY:!ÈNÆ?ÞÏg"»»VÈ•HÍ°c
PP3i/bM˜M·l¶eû=8ãú¥¿šd²1)Âl«ä2è–a¼[î±¨?Cc÷²dXiª^ž 'F‘%­c"!›O—nx¯/
OH
y‰smEœR>.—a¡À¦û7—°§º‚d‰6]]ÛO•e6FX¥ÜC±Ç«Óí­+ MqÏ%Þ‹<S|N¬¼ÏB Ì¬”øòuZ+®úôÀÉ ³ÓêyõVÌÌ…çÕ—O4£­_À§P¬”¹>]t¥A+a±?Ó#I¦ÉbŸ	Û&†Æ¾À.Ÿ¶{T‚û8~ût5‡Å~cS%Mbñ+‰UMI»ò,ÓUÂ®o¤‘°Œ—¬Æ@5å?ŠÏJ+©ùºPtLÝXI¹kkêU°pUò¾»ªXä…Ý©e%.™Oª‘'±ã¤JvD¸Wò²FIoî‚¼EŽYc•Ö!©ŒÌÍH µÚòƒHë÷ËÄožY¥¢Ë`ûqóŒ<$µAZ6ÛQƒ+„m«éž˜–
;ãI†JCõsÑÒp²³^ñœ©ý·)!pºx¡x*¬MJ;­	ÞÙwýôA“Œ mL=‚ô9‚”‰–)jì(>oŒ%6^zÕã¦5†i¢AªVØÑ*·&Ôj®±ëÇ€Ö˜µŠ6TVÚ·Q*Ëú9ŒÅªù±iw^ÿ5‚&÷^.·$Wî¿›kjÍ×Ý´‹¾Éz<‰°Qã¯jÒØêífÉ”¤y2!»côRåí¶eBAøó[Éœx&ŽÖ¾ódµ·‹fHò-²~fñ`x´ˆªšLˆ&Ž'ÅÂ
¾-¼òª»,ý©;äBè¤6ønFSÔ¶[8
$cLa2ÖÔÒeæ|2ÂìBI‚‘NÝûìS+Î?7²ØqœCL¾xø­àd~v0slÚ€`ÌyÆT‘ÁrÛÏÆFq˜ê[ØvV…†S~n“B€'pÖ¹ú:ñ8+(âóæ5¢uiGÌ8‚%%#C‰³RA‡“‡Dÿ:¼—C‹¥5ë­k›ùB6ôx[¼¯;{ã,âm7Kð¶±+f…·å­`¶¥ESRø­4Iss²6Úaí´!º%&„¼îÏa%ÙtRL»Y1rXÁY5˜æ U~•€T4?…Ô¡U±ËKÃhƒØã^{ ˜Þ-´5ÛÿÙX1¸Uöù_UrÎ ‘®ç·k¨žY¥=c\ên¶jÐQX¤=ƒD !%p?d/_äOŒoÍ@“¹sNVŽüH*gD´,&*sˆY,fv.2 2¨™¾ýäDºÅJz‹¦ªá·hðµ&§¿¡´éø\íK·YC¯a«p˜¾ ð;¬²ûNlµUå’º-”C§K{ ,ÎðSÛÌ}08†Ç9=ü¶˜-«ÛÊ” mß*YÊÅL C£(KÐÄé,Ìc‰²ÐÀ±Àe`rtë,Ø¯Mw 	Œ	~Í£8wX ~+¸þþß]ræuH3ÉLÃ
ä¤Ûò+Ä@ª³€âq°O"á“e Êµôôõ¤O‡š³ÃrQá_4DØ$ÿÊÄÎ DH²©©SŸõiÚAPÃS-¤°ˆ|Ôª:³Æ¬„ÄIÛa9àè!7ºÈ	\ µgV*.¥ÃÇtø÷|§œ M-êLÆu€²êÄ©@<k]ÿ]À†ÕÑ,Úêþyˆ5ÁDY’ ÀRÂõÃ;ƒö)çj1ê¸2«0Ix AºÑ!?¦h)¹Wrº†Á\}ËX~Þ%µ’
]èf·Sôš^H§°ù_LEü,EŠ‹Ó£vÛR¢˜ÅW¥i¢“Tâ±åË¥–Ë$En7=´f†2bY0¡6ü'n2²“™³„mà¶²NbØœ[¢ïÑA¦ÖÈçôÁÐÌŠ£[‹ = wÛ{Aú§ ·²¾Ú +Êª9d_$»;ùðÛf¹çÓq½æcL¶š^›E+hÓNz¸pÈ™}¼ KZfKË)#4‰„DåõzÝfªöÚ,h!·ãÈígàPÆ4‰ù–ŒïÃ`âòNFDÍÆÉj¨¹ñÈæYmO)D	³â•û†q#óÈcò6Q}]{m?ª-®,.}ºöÙ‚|	¦·Ýá=iöúV+´¶ËÎPRâ£|Eé²ÄÏZj]ï%Ù£¢_[Z&‹ÀÑº²¿¿ˆH–Ã_óé2é|F_¿Nh©¹QH„ºÕŽîœÓÖ^¬Ü9ï\™Ác®|ÐéÂpr"oÜÓÄ|RCÛ0Á;üõl¬eMñìÕO:(—“Ô dsµ>"ñ:§ê¸±±Lè¿›ìß·Ø¿÷Ø¿÷?cñCKŽŸ¿ü1™É?¼HfÓ°)SÍý!iÜŒ€˜ÝIy¨–'7—žÉë‹õ×L_' -† +@eÜ¬¶ˆÃ—nF]p(æ(ŒGý¾3¬¿èÚ9áöûYo‹eRû«eâ3©¬ùÌ‡/LúzÏiDN?ª5¨\­-.-1ÝÒY·tRÝÒ¹ØI€ªÙ×+8‚´Q_Â›Ùë%a»âö¢)†í
‰)Q»£Ææ®+Rù¨‚s3Ô‡Ú¥ƒL•&ÞMÂvíShÚ¤Ï)ufåi3)3$Éðæ›òç“c ¹FÎ¤9nM!geÜ¸oè7jâZå§´Nœ©¨À§ø\¸ÞE¥ÁDð$W˜®È›<‰Hõ4ly]•¨yqåª÷<Sù&ðbä\¨DŸ§0äŠãô%:Éâ«w+}+¾ÉpjæÏá8µºPøûÊE@9ìiÞ÷JßkJ?ÞrÝþä»²&¶àV¦«IÛ,eiîgw&’vWš²Û.a÷ˆéº+·:4v‡<XØp¶1ÒtŸ¤[±¾t»–	ºGHÏ­©Gijn;ÓŸ˜™–•¹ÁB]	Â4ÓqO:·›Ë°í–'ãÖßj™Þzò©¸ÝjRq£ÙªÅ‘“p¯ç˜²äÚ®˜Ù9¹öx‰Ž75ä°VËéM+¬[e3»Êô£·5ù¨!õ¨k™zÔRkÜXÚQwä´£7¥?lãèUÉ0ÝzeùF+µliÅ:§Ñs sIÍÇžÝ„[¤ìØ`:¤˜¤,Õx¹*“˜RÁM>Æ”(zB”äæudÔhr=¥¶Ä–Ôåu7èRåBmIø-d©o.V¥;Xt ð+¾¯lÙ–Šõ
éí¹÷…×xi@±E{K4ó½úfNŸ’eˆ…M¹Eù!ßbãX«é[¸
É€àZZºØÇF-Æ-# íÄZ‡px“ÜþÈ~ðºMøÚ>ÑbŒrë'7?r«fºG_Ï4¾4•:[ÕÃùèðúò_ Rÿë!¹s®nâÛDù½p Z§;.:ˆ^m©þ×ß­-®..Å'É¯¾ºþþ]åâ¾Ê•‹*çƒ±‚†mßõ¨ÕÝ(¶u…ŒÛ¾òÂgaXð’A­Ñ«˜RöUû%qe—V®›6£Ú;k #ûb{8¿˜Û•rb˜»:/„u&ìÊó`[çP9êH¹S­ò¦ŠæRê”ÍŒ&|VÒÒ$Áû‰¢âA5×bŒ×Ù–]8¸¾üÎ!ï Ã­ÿäÏ0˜Kú°uõ›Žî&l-,ŒØCæ?Ñªm’Õ×I +JÈnLÇî²tìn1»àü±IÇgõ}:^"va«,	»­´Už•z„œÔcd¤1µ•W’Z“‹(ØÏ²ìb¶W;·ÂÒ¶Â†&Ì™„É‚Ì2)ôn!>è†ˆßn6#t–ÄæõN½›Ã|a{š	‡G+kz&…@n\”lÔT©„cl.—°”$¸’F9g>ÜCûUb`Ÿµ»è\Æy±*ž»–‰bñ3Í‚ë&¸µ8Èk‘þ•ÿ:]Óî?æÊ|'2l¢Àç9`'4‡Q3ÀîÆÏÏó¿ÎüP—[ÛA>FîWYæ™_•7MžYŠû¯Bò&yÔuÚÃÈwí¦úüyé$_æˆ*OÅÏ©§PTR:*D˜!™«q½´þ·\2¶éR¿ÛrúÑÝÒl¯ÌÚK²!f¾Ä7É‡-`¢Ž®¾ƒØýÖ`xõà¥þÕ`ùÔ2WX«YþÕï}žÈ3ñl2ÇÝbýZÎÑN«,9@OË· ÓULj]ÿG$«•™ÙÁÄëPÆiÆgÊ¥ïîPeÜ$\#†äý¾ßdVÙ;^ƒû±úÇ~Û†$xA"GcªåEåÊ‚ ÒÒýR§¹•}¼KÚ'ÂÇrÖ>Þcbu—„­„_"£Ôop‚	1z²ˆ¥É");Çšn(M½®,PM·Ù~ê{ÅM!2ÌŒ‚V•$Uf•i›ÒA¿3ðÛ€´T’àˆ.ß˜¼‚ì™òùn¯²öiÚÏI`mý;ÇÌ±Îq´%×˜ñSÚ°å\È2]hŸ£Ÿ]vaŠ31·ï;=˜ªy¤t½ÕÇ_æ<»h‡îxÒ:[òJkóQ:§LZ{ƒ~¯R­$i½k(¥ß„V[(Ÿ/I-<dˆ´/ZÄ£p*B–ýÏpë ë>`m¥7ý }Lc#jOjŽ½þJ”N÷Ç®œq\ÊäÄ6‘Ê}ºØÿ¸KVÉÇWèžT¢IŸ{'Ô"àB‰Õ£üÝf£L ÍOöÙ©€ñ4]#êÄ×Hˆž:Cbã„Ê‰=®¿ÿ†—WÿÚmU"?‡Ãžg'=ðÄ(²czâ¸2Å¦)5·EZÔçË™¸°½Q"-@÷3–”°¥Ný¿¤’sQ:ÆìWÃbZÂuR$“6ºìï4ÕùYˆf8)g7Ùå¼Ž]3'’½‰µIe<Hh$bE„¤wG¢‰JL$%¯ý¼ÝuÚ^·éôK'.ƒ"$7¡–ásŽE«ä*jwT?_,é˜!MS~¯ôètëî{Ý¶=âÅÙ|îvkÇÌyø1w÷†µóÄó»E²ð—‹¥e²À‰\,j?¾ÉÁFÏÂ…%\¸DMâß¹ÿÿ   ÿÿì}moG¶æ_©ÕÍŒ¨Q"õfY+É+KŽmø%KN20‚¸I¶È†ÉnÙ´¤ÑØA€ì.`î`o0Ø½Édƒì¼™{sca0døèŸlª®îêîê®SMJ¦m6X$»«ª«N:uê9Ï‘€×ˆP(‚5iMdÉ*­JK{È@|”W>Šy<!kºjž¼ø4¢±UKMŽÐ°CÀn×´J3†NŽâÑ)ëøG ¶ÑéZ…h¡EQáÝ:(/¯D Ù-HÖBòŒ€ýA›E Úgÿ€Ð³VùñbzkÕMˆ®×ÊŠä
K½Ö!B,,ÅÚ]Øi‰‘ ¾ˆˆµm®iûïÒI¿”ä
±å³à;¾Fo êÈ±E8ýmè¶3ñ0ú>ªÑ.tZ¼¤D°´"ž%‚XuoÈ0¾,ž§ˆÝ2
„¤ @ôÛ5r¼ëJê/÷å¬4Pö?ù@¬ãƒØ|¬ÿŒEæK#€„©YÇö½ú ¿1^_ÄN´õA¯ïõÊ]Ïa«w÷ˆç¿B<Œ ·xŒm20¨3cŸA »*B!²„ä´{š@Ziˆ/*\=kºéŸ:kl¼r­^O´Uo%cì¯7ÞV¦¡wð¨)A°§»çÏ¿ë’ÃóçÏF)ÛðîÒÿ®¥¶¼¥gkdš§‘š&¿ ÓVÝXmög8N‹“þ‡R9¥gùÆé8í¥>eìâµIÎe–Œ½ä¡–îQÚô|Œ§•8vÅï~åñ–©Á†(,•©ÍvèÛ??ý[Þ¨·Þ9?)ƒ#avNOviá€ÑÃõêÓ0 EÈqÌ²P>D«¦r>m%o‰iMh~p}§±&Ñ¢ç	ùás§f˜© ÔÐ:áVëhy®'á†™úyjó:`,æ7¤ïÁÌ (¤š<ëY&õ§d£æ÷\ w¾¯T|ãVezPÃQ‹A`³Ê„*f,´M¥×ÉÙðUWÂÊÛMÒ°|«ü¸ïÓJ7¸(´îFU?FXÕ¯q Ç›„l},ÿ²âÅ‚ìq{7;úýøÁÔ¸½ÞÖ€<¤ÏÐïgïï;u2\Ñ;Êè¦¡ß°îuºVÏéÁ(JáÉ`D¢5FZ²+Ô«Ï6m=Áo…7<
3ûweâLeg­Iâã«¯H®)ž×Á£f$Vˆpºž÷ñâãÃÏ Æ.Ím—ëW®{–xVùñ'ÑÃöÈa_˜|KÙµÐ5ŽÎ……JªïäP¥L´gð1££±AþÊãÊjEJXFj"ñ~‚‚fVø|k1í‚In‚¯ª,‰@øå_,ázç³?4¶Öç[‹È¦tUV_Nh‰ p\åžê÷i‘!¬%gßúÄm±ldóÓÏ}Ñ´óÓ!5úiÓÛêÌ´è[ŽÅO ëêw>#{ùfY1¬k“~øÎâIZy±sëóZï7{MÜÐ¢nÃ“ä+$qÓh7˜À¿¡D7Ë—#ó2ŽÂ™£Í}%ÚsÓñïÙ½¦2Až¼œ.H·rk¢2”|i·1á­é''ÊTÎ:i×9p#ûaj3ægâ‹§ð+]#Ó’ÛbšŠtú^áx¢÷ŠÍÜ8íÞ¦…b1¿±”«Ü‰Ð RÆKÔ¬ÅÎY\d@lmâîÂŽ{˜Å(3¥s•³_£½óñþF©3KœÆá6¯ŒÜ"‘WFÛ9ÐpXÁhA¥ŽÑáÛcf‘!Ÿ›Â¦`üRýÌ½BúþpÂ³T*MöÛ6º¬*ÉÌOÄ>–X7œ˜°†äœZ¨5ÚŠ¬Ñ¤ã’Äñ¹)‰–	9†€À¤LÔm:c?¸Kaª.3ý†J«ÃŠxh÷»žÛ§¶?ì,Ç6W§á·6¦¨Ìý`Š´l0ƒ‚O¸•‹ÂŠ°õ‚XK±‹`ßîÐ/O¨qÓk:.Èšïu×Hµ2KXPøY¤B~Î5²@ÿªy¾ïuÖÈJ…
r©Ú¦µØ}ÇrYlKßïyOí‹N8›ß˜Z$‹S$ºÕÞ8Þ·Ú}û$¸mcêö«ûËûWÑÌën:},Ý	ôÈª,¦\:bh’‹Ö ½6ùä?*úÍ¾ÓnÓUèV–®,­Ö¦gÙ,Ýu~nóƒOØ|Ô€ò];º}½&çdÙy7ŽËKËØ'@l¹õ–×Û˜²Ý–&øãdÓ°ròS&'©¡LQ²ó¯.Y‹µÕÜÎ_áOrb9Ú»´<ö'«­ª×ÙÝó¼¶ïtÑ>uîvØ8.îH˜%]ë¨íY:—™!{b˜ü€§?à…ï!(Nú30zÌ2"ABä+Ç¯±”GŠ/äÔ$ÙŒù5•k§?8.Ù·ìßŸ{^þmzŒ8É4¢kr–¹Ö©=R‹èMjE=ùõÓN«#fs™‚ë=HU”içëRµ-É´¬âPå˜Iì	r¿›hŠ‰a!=–±WÄîÎâ×±˜!Ì¬¥««åQÛv¸ŒAÜÔÂM5”Y»ŽÆÚ-ºmÎ­c_Q‡¢šf¦·bÆºÎXîÎ1¨R9Ù­Áœw\ÙËÝ907†5š“+&êùïžƒ*|ttfò%m›%‰­•ºsÏÌ1J£{,ümèÊ
<d9Ÿ;®`ýté@W1Êœ;#Ûº³}Š	M¡	Æ“_<«0\ùžž$E¾Ä>Á¬>—Áö	¶=Çé¾y)°}ãñ¢É“ÏJµæÒl`ò¦›2+W@÷…â3˜ÇûûûÓXã7*wÂŠWÅW‹c5Óvsmã¸Jõp¡"®ÛlSLß™ÒàANœÆZŸ·ð†Â…p1þ½D5I/ðF Õ—šleÈ&«MZørj½ÇWøpMa»ÆkRK¾:µyïüôë:Ýžýq S!ÙL«):él¾½oÓfÃê1ç8ã§Fûà
y¨LJÓ>ÅÀ ¢F
SŠ²zÒ|·yé¥c‡’Ü…,ùŽßÉï·h“¦Üá›×$ô•J…um\â¦u‘EÒeb¥HÇ"hÑ2ä¸±,Jç4ã)‹AÇM¥~SYÇn¯‰ 
xúøJb 3Q”{nLe1:õ½iÄn'Ñ÷½æÓöùó¯»©ðùëg0EQÈœ\Ðä<VúáFº¥%ÞÊW«#ô=(b³´„`®¾DbÆÇrÁÊìÒ  >þr):¦¢)÷ã¸J§–l0q‡„òƒñÐ c*ŸR/JI¯²$TJcyÙBÆn¼¾¦–þ=„a•BK.%0ÊAöð.²¿÷ì¶uhë"W¥ëG 1Âü%/>Nó¯€=—¥ `ÉKàÃŸdòÝÙ(Ï‰D¶Kž}Aj!§°ÄÈËÁ“âTÆJÎ!‡cšÀ¼òoÉý=oúcØµÅùÛá}Š“T,D—äÄ”p£
M¢¸	…±‚™¢1”#ÆÅ­o{®×gÔ..· BÃ-Ih¸Uîòpxœ9®ú­ò…zC‚ÜnÜvuw`› µ­â*ˆÉJôEà[œÉ§î5€ˆ6•Œw›~ÃŠÂÍ¬œ_üÔ 0é™Ç•0¥ ò‡´ç¨BÌ4ø)vÁ·S0¹1#øªfAµR»ºZÏ‚ä,È$¾¢ÞæÉmOx=jÖúü<ÿÔ«¤ÕÚr}e<)†(‘¢ëÛÔFõ:âûùÍ“€ØI~­ýÕ}k¿>R­ßµ›sñÎbÍÛj;M:¾tÑÅ­Düv.¨e€¾ïÔ^½[ïzìÀv¾¬k5À ¾¬ýÓ‹ÔŠõtu!üF@‚—‘xlT¿"2q†’½8@ÆÈ~8a0Ï0\Ì”tÜˆz*´ƒ*¶µl_5x& Â, æ_Ê*[&Ë¸ž,‹³á”ámFÎýÃÈç-  UCBj"_‹ ànx6ð/(Îi~)úaDk=FØ!IÝ…Èz(¸ù^pÅÙ$ê*³|ÙF=Ñ£ûõAãøñÊ,`¡è6£òJzjVÐÆñ"VÒ'Ò¿ÌU+~íF·
J+¼ŒFg–fº•[.æºu%q
t¡d,ÅA…H•™BNT­êÒ
ÿú|Ì'¢ó‚‚ñ¾¯á¼_*Â%,<º)ì[®¼1>° 3²Cµ®°jeâË¿^µ/¬q´q\­»ÍPÝ…¢Þ*á8Ã<#<gU}~Ð·ÕE4ÎÞ‡‰‹HøR–¯Ú•ÚxÒÄE4qe]ÑÄEÄ÷-NCÚµ©@Kâ—‰‡ÈÔCd°óÞC´°4¶Ô5qe_ÑÆ‹Ù-—ê 
M¥·ÔA4²ÿfø‡„Õ÷@NNR÷}1„shaâÊ¿.Ê7„U–Ì74ÁÞHÏÈ=k×—V¯^Ï=ûÄ±Òbmua\½_ÇÊÄ±’uM+ÇŠò@ø!³º&è›!|+|áž oØ5ÎòöÖ»W¸õr©î•Ð`zKÝ+ã"þãëa1ó±d$ÍŠe9ZÍñ¸DÏc½.61
Ê%Ðžž×îg&OÚ>â…ðŸL­±ZÑ:x*•ù•ÐÇã¸®6:G»º¨÷ï¨©L‹§3é¶aãAìJ·uö}gGª|¡n¹2·u&tÓrEÊ?†aÒÇ£_w‡QèùÈ¹:ÔæRz7Ñµ†œáÛj£ù8¸S3ÊÏ’ã&ÃÉ—‘áä˜ e<>f|¤R4²‹$#r‹‘¥Æ¸ˆš3ã‰Ô(Ø1.B¢LØ0.F âŒã"Oxz¬@¡8ô· st{­õÛî¾—HLÆXÛáÿQ×#3äš*9ùú8F")ó!ÛÞW0ðüùßˆß²ŽØ¿uX6vÆDÑ÷‚°bˆ{öÅÆ’ÑçjÖrì‚»;ètè&wÜ&ÛV¯ajÄ¦8yû‰“w´›ÒÇ%\zèÇItr¹h”(K‘?t /	Ë*ì3ûmzcËi4ÀªF%K¶ŽîG¼ö€¶Æ÷¨É#Ë÷l‘xtóáøG%“•]æ„7ýºÕ¦­VdíÂþÿ?ÆÔÜëÙ.¸¥uãB_…ôñ¾˜ †¬Äˆ&“JHdÙØã´.õŸ¸œƒ¥ÆDk¹Ur4GVÔ‡–~OñJ°sÊÎ*¸m\ðè`”°´^„ÇØs=»1¨Û¥’U¯Ï‚;‚gä ŸÈI	>Ïõ©„ôõ 23KÿÓ/¸4ù)¹$–€’†¹¯BÉPbðè}äˆ’P©ÚWû	ä	<`¤Í¨ƒ¸ÒýÊ¥êõüù:£°ý|æS‘ôè-OÏO¿Ù’7ÑkCéµ¨eû9:M"Sµ&'K8§@$1ŠM‘8­‹d*µHõ:•Ÿžm=3ÑÕÉL*ÅÔTà¦Ž•VSPðj!÷C¤¾2’³¦²·,£mäbq5[KÃü­nÓ6Q#ã¢F^ÓH¢¹#œ,lÏéØÑŽóÀ¶Ÿ²ý&,alß@J/¿;?ýÌ³oÝÖÛ]Nc™átO¸}åŠ‡ã^…ÞÉHé ^:PºÿÌy×ý—!ðö<u¨™èEë^…î¸nõ˜ .æ¨²è±þØöúþü.í	RÚ»>3²é¾öPó¿TBŸr"9ß£›€]¶!Ú #ÙNaX¥º¡;W]‡‡jxï¤×Þ$ªæŠóžå·æØÜ-E­œ—›™õ_¡úfZ_íÉLéòt($S%º½öT™ÖÎþL­±yRe.„KpZ
ýªq¨1áè$7s¥‰³êªÎuÕì8}¿çÔ áÈÇæõjjL×)…¬†+ÁãÅ+Ó5@>ÁNÙà«ÆÚŸ•UOð1¹C×ï²\Ã£;eÌ5º€ËLÃ¶GZY=Ö†B¾'qNÀ¶’p/áUŽ¹¢aÓò	o·mýW°A^òÏ]£éßYÕ))õwSþiµI½ù„£ÔÂâ>–ï£~ö=yJŸ÷bàgbäÍyuQ¥WŠzà^Gëå_€ðYU“žïçVËw‰/Dyép)A$Ÿ!ØlaI.³Ä1Hq™•ª·+‘¸'²³™šEmÈ`“³Lm7 Ê$ó²¢Bð›$‘mDId‡©6'+oâ5‘u°Êll¦ ‘t½+¥¥#´BfkÜþøqß&Ujü˜rfæ|ï]‡jRuæäØ—E§ÂÁ¦©Å¤¡º2FnaIŽ‘£×ø³ÊŒ6òI‡™oSÜŽ<H—’lB{@”WÐùH=ºkÃqNÃD[lqVŸUìc!l–	=.Í.vf)cjÙô ©:U£†y‡Éú¶M…Žiæ'uúgùcVÌÉ“Ž?f…ó$â)Ä±é¨×çé› -@„lGgT:Ðº³$ÈHO÷xà,\ žåe 4S”ý9×¶Ý¦ßš1(2¶·‹íëÒú”
•nç$•j’Z›×º«¤T
Zþ¸òQ¤Óy[²4µI}Áî/påì
â™ÜÓ?^J-ˆŽã–A™rŠ:žØØ.;.Ù·ìßŸ{^þmÙ’li°&ªœé€IØ•ìÂZqÛ&»vÚ!¤î¯ §`Q™Š ç5j…4Ùo,£õ‘$@ˆ1›ëÈX»Ts2½GjwQÜ0IíxŽ¥æ™šca“
e¹ÏÚ¢tŸ´›èƒý¤‰˜œ²F¶bn£bšRRÊ(%\Žðú}ƒ.ÝÏ-“îÃ.G˜µ©ÍÐnÔÎÉD¶¼œñ4~Ä@Íás^êÐ¥3[<2ù;j¢²¥ö©#nÑz”¸¯ñ¦Mk¥Š™
Ë×w|‡~÷ê]K ÍW
yÔ‰±‚@
Œ±?”Rº ‡J8úmpé z|Z_ú¤%É?;;d÷HrÆ}˜Ù‚vŠiBÔ~&ÚóºÜUõâ³—´ÁÏÎOtýÈÉÀ|‚³û¯}œ§§Ó²} ¼œ	óa€…<Bú„p]°ÉÞ&L,ÅnÂJ6EÏ²”Ü#R¨8yÆjÅ®6ß‘ 	¢‰„´"Ç¼ÀaûoGòE¿†Ý§–Cðç.]f/ŠÓ¦‘÷á…úµ–dfðWäÊR9±ØÈ´P’9U#2§jHæT•Èœp\N¼—ÅçÄjCs:ÁeÎëWr¸ŠÜˆçd6˜«KÖbm5Áÿg=¹‚d=áW@
>:S›J¢TW¥ú ÀË­ð—ËáëA·2ÎÉ“Ç»öD1O;6¥m»!“÷ŒX£Ã‹à¼X°W÷+fœK³@P„OÇ?>AÿÀ©ˆõQÂÃÚÀÅ!)á²élPåAéÂË%†	åp7&Ò»¿z¥zÅ0_ÒDz³žHoìBÓÌ¼œ1¹ÅFÅf!}K9c&0ûBzbÈnø¯Ö{ßsË—,¦Ì7Ð%ËQkXÇlÞÝ—ëžÜ4
×ìk‹e©Ÿ?ÿÆ%½³/Hßƒ&·ÏŸ	Î– Œoä÷ ¸è’§-Ë¹pÏlÊ}…šN\²ÚZ'>Å7Â§¸¸üê}Š"*'p'º['nÄ‰ñ­u#N<ˆCú`^ÇŒD“- úzû<ˆé}«¤Ì7a½rß…ö†œ;Ò¬Ûv|²gÕÀ»Q4F’t|ø·†‹—dµ‘êZæ¦u¢ -ZÌ‹Â]$ •¼#Éwák"Y@ 7z^ØzúÔJA·l<2rèVSþF¸’ù0h+‚6ÇbìF°%6÷Ð/°çø´Ïóq¸YÈíÚë*¦Iãl€ËEH„øu“øA¨ï04™1Sz^p>IÑKÈ]µ¨þ<ÇÞNæoà2ªÃ3HSa8‚è‹©3šŒ¾ÈÈ¶µÑ\AM+Á‰,2SÂX¶¾‡–P¦‰Òú¤ow-ÚµáØª/£Aô%+:­6$á}Ø~¤?
lÎ·te½ƒ˜»€±pÐúç}èhuè…iØGôrfÑ	Úð„Ÿ¦Û.¯rfƒru…ÿè¡Ìf6ÅøJäz éœÚÜÝÛc$ö¼…ßËà)2ªN€àöþÜB,ö!	G2:	(UX¸Jß¨‹Œ^.õ—õ×.5ØJÝžýŒ…ÞC45nÁB÷ß§GÍAÚÎ5·ÌÑ¹íÈ~gÑcðuxÿÑê×™žöP9ÙÙ'Ø¨:~ÆHà<ŸÆñ//>¥Ñûœq}«×óuw¼7¾,2v³XÐ‰	V5|ÓX×s®,‹5–ù/eÚžë]Êâ>›¼)ÜñZM"aÀB‚ºbJ: ÁM¦ˆBu2—ÞÒ¹þ£¼™Ä~ËæQÄáÄ	4'si¸¹$vWÄl
F*w:EÞÄ|’œ	Š÷E,T.eb±hÞÌâ7¼–Sk(³o¨i¡:j^‰N
ßè­›YˆuêuŸX‚4oj‰[^ËÉU|Ý’¨Ÿ'SkØ©Å(tóªÛ~˜¬Éï"f»3sZå\ÚœòœÜùD~ËæÒÃ÷nã&‘IÎžø[\Ê
zè ý³ó’ƒÖÄ[|Ýka+QúéeŒã,q‡†LœÂˆJ*Ù`²À9m9)-+4Ì0ýñ-pZ	m¼B§ÿú×9Ów¼fö7÷DàK-ÀŒù¸ä“.6Ñ(&~ÉyÉ©uŽ®‹—ôÆÈüb‘RL¾ºÎ„[®¢ç÷lXÎïÅ¥8Ç/V’ú…_†:‰‰c~“žàø¡{T^Êž‹$=‚Ù4I¹GÀÉÃ‹©M?òcR=	”Ô<’ã˜xEá’È’NI‡‘.Þü)l³Š´ˆ•;Î¦žJOr…ýä3+)]ï¢ì\ü:Ž)Ø0ñq„t?sÐ+›²¤G·ƒ²Š—µgš–M:ˆ.ËIÀ³nû½ÄÿfV°Õ¶©ž\™ÍøQn*ï `Ìáh^áÕ¼[·-šDýóñ7Eg)NÅˆ|² A[F•TWÂÙbÐây×ûìüÊ'BIP³EfAY6ŒläTŸÌÇ;ežZ¢ÃÆ7½
uH!?ö QBApîS$Ë*Ùï“w¸îl0t?D°@VòsvHÓ±žP“5ëÎ†»’ƒ”¬ —
‘¢V,Âß7R»AÞëGöN‚(;Ê¨ê¹žÈQe¬ÌÊy/æúhÛzüDÝXŽWS5/¹¤‹ì4«Ôð6ªLg8ƒ/bü«¨˜ÈÑk"ÅôT˜>z*ÑVëŽìŠ•FB^ˆº‡,ÆkYÂºP"|¾³ýó	&«Hê±À¶øC—0ÏÔùM¦Z°Åõ\›Jú G²¿ˆç5UÍ[ºyÜóœ“Ã‘pÖòŽ\ÍLÝ‹L˜÷°mãŽf¿5˜’…]žÞ6÷f0¶ž ™ÉGãîâK5sQík¸ˆ¾ëy~
@)¹SVUjÈdvüd§Â¨4œòÄóÚ»]‹î‚NTnˆ•$M4C±é²dUâÂº“lŸŸþ3ýçÖíóÓÿöˆüäÑùóß“;·ïß";ïmÝ¿µv¡o%Ã“¢0-j<éHBÛ©ä)/Í—”g"¼¼×S¼Ol×9¢—ããâ^-²)ôl©b3‰V¡Böäñ*åÁí¯Ä7ÅÒ tÚ•¾MU¸ ú¯n7I¦ËÿG6tØÞþ~ßfY‚”ZM;Pì!–/œð¼ÝÌöæê@÷«J^–â·¸É)ºL'âÆ‡ÃÇ9f[š´âI)ÍÄTeAô~$“5°Ó.\¶ÚðsV”è,q^Ì¹Dˆj–Û..!Z¢-E®ãá4)³L
ù8®‘¡Å‚Ì“á–b-_#ùLðä°€ç£Øpe¨³ÈHOçôÍQcÄõür ‰‚8µ	Ú\µ»&+bäÏp£ûÊÞJiÊcËoEppñP­…5rßâF_Ã`Qž.Q(&IÔÀ‰Â[ˆæœÝH1¢Â‚I|h?jš%ª9ÇQ„¨DË3‰D†N"C_ÓÈÐ@£NâBÇ†y‰q¡Aºå1EaNÙð×$(tªyìU.9&¡6\)!¦Q°ÇQÇ[£K
˜„¦¯=
û¦7m1Ñú²”(“c<ßuÎþè’Ÿ,÷Šl÷—#ˆh˜`(ÏIpòzƒèÂ9‰.˜Diß$º p“è‚It²¤It6º ²/À)L“î4 ãó·®t
3â¿Q@ü@¯Ì¯Ä$àÉ‰ºí[_ôDý¢@ÍI¸¼7ðÛ¤„SÃ²²FÑXGªc^P¡5Ó/>;?ýÜ	ƒh˜›B-ƒÊJ$õ…9­ÐpŽZyŽÊúº˜ÙèeÔXá¥V¸U^XŠ†%tn ‘´²¡î?ÿÚ‡$Q_‘:¤¹’ÒAÀ~9 ÿœ}Uø8=|ÓË‘‹B¾«„Äïžƒv0#*¤û‚9€$^ç¨1îx„ûrážÌ^v…ï™bÞ¸¨’÷í[/¿Û"nýrìÞ.ŽmÇ,ÕËxd»
M*ËËeàÙ_)õ,»ÑaW‰X5.b°Ò'ÞÏtÑGàÙ‹ ]ñÆ„:¢˜Ò´‡ƒÉ0d”ˆ¸Ô¨¡OPC±7-†y×BD£õ0Ÿñ¤n°­÷æÐ¢§½xÀ~¾ÈOTëÌ’óBì5úšŠùMê_Eºõ©O²vÙÊƒwæ¡5™'ò(Ç™‘4U„‡EQ"Ûa€…”],/>{ñ‰Û$OÏþ¦I;jò>:Oê:÷Ïå—¤•cÎÍ}HÂ4Eõ]ÞM1£y5mnÈQ4éÐA%­d¸ÍË;°XZ–ÛhÛ7áàâ]§M;Ênp‡l?o–6œ>ÌÎÆÆ17øÉÇŽßÚªû+ÜòMIvI¹ÓŒ¶ÇÞíöl«ÑoÙ¶¯:ðíôÊU/óÃÛ,Ü8¬SédÛ‚öùé?Ösf,„ì2KN«Ñq\ò‹_§Ïkð?¶êuoàúTBft6öºFée.#y„%“péä2H ‰eðML*Ãt:ìD-q»ÿšÕ^Ï„qÇ±Ú^ó½®í–À®]B"u‚’‚ –üuëH²4¶Ñ¯P	-%\ñý.!bæ ý)õ°ÃÅÆ2ÕÒi°€péË¢¹·xÃ£‚óU¤ž;­³šïóÓ¯ëÄ??ý¹Wt¾fuÖÍNv×¸Ïq¬‘°–çèiÃµøõAûéŽÝ¶}¡ÁáŠ&IŸ>V÷…ê¿ÝÀêo¸´¶×^Ïê·òÄ‰|xö½Å•3Ä{þ£KJ™M:™y{üÞ Çx—!$†Ï}«Ý6÷ýø’?ÊQÏ;¢T¾ºô†Þõý”©™r¶y?%T{tòLíX"×•mOkö?r¼FnoàvtjTÚAùñr¤µ´Ã$^aÆRnó–îãuÇí|Ê?êÒ¢ë-»þ´æ¢’µ¦% >î‹|”Õ©UÇs–vbÆ/›º¹Ì/ªT¨:iÚÔ
³Ó¸Ús¾Õ£UÎo€ÏãJM½ÝäË–’ï@¾´¨*lâUËª!?³,¯èi§±Àð nI´óCTPks»ÿº´TC¤…/"Í~1DZ;,#Æð›Ï‘@g“XTæ^¤l½ÆÂãtºm»Ã†$O†äÛ^[QºßôÒÿrbÇêÉº É ‡©
q¯«Dí Æ›'DÒ¡ÜxÈ“Õó8Oœ‚;ÆNšŠDü\hœÜ	—Rz´ïE3Iƒ¶[gt[àÿU½5ê6m†‹|¦3Ú­£¾öZ–G|*\rÕyÓ sŠŒgÂÅ0w­¦ãZáæ#}žÂ‚™jQ$Sþ†9ÂÐ°8 Ø7É@ÅÓqëíÕ%¶Ç¢ŠcJJ„´H§ÙÝ}Y¬1Û< Š~d(¸7Œõ[§¦´w=ß_
¾©ÀïNm—øÔ«i“2©Î‘…
ù1)2"g…ür˜#q¼o¢wbdþ‰\E\€p¶‚.‡a»}±?ž››ƒ¿g™¿ë0ö8hZÁÖtî	)9ø†þÿ?Ñ•ÝÄ	‚óL Ï!#sM/"j!§ˆÂ‘`×Ïê>®ÍÁ_·ÁÄåîó %tÃr«Šö´=uáÁ¿Jð!|›à3<_LßŸßšQåÜôMhÜÐðâ\áÏùÞ]¯nµí]ÎAK3@á4l3b@þœvwŽ³×¡iùp½IÅô	†n?V…òuq~º±ìpíDöE),²3f^EÇd…ò°8Úƒ¾Ý»Ñ±œö+^öã¬Õ«(ò S\üìÒ©{.Ò²ÎH›-*èÇb‡ŸWÈý/¢äïˆ}“qí!KOì¸ù1) Gn4œ`ó]ª¡£-| ÖÛ˜Ú=?ýÖ’j8›	¤„¶-Ä;†aCÐÁš¸³ïðî7B4BÆa$CFM0ûu6¾ÚšJ
;Ñ¾8AI*.RRÈãÑ™~8r¾#+Ù WæèÀ(æßéßÓÐµÚ»¾µ¿OWâUºø®œdís»Gý!mk!å6‰ögjæ¶ÎŸ}Y¥¾#mçüôWmú+iŸ~ÕE÷;²[5Xf/CE åEœ6T79Òùfúe:ôKé¡—V³àÑq¯GN¼‘vjÆ’Ö.ÅBCä.$¥WP¡bÉ8Ÿ,™Ë‹ù)± ŸÀ²¥ãV™	˜ÏKõ–Õó÷œŽ…°ØöSð¦/ÑÑ¬ê	µ^Q†qP—ÙÑæ#ìÄqí>ÉŠõb¡¼d)¤Û±‹m”bdµ^ÔÐß©É´kdºådsÄ"2À)X˜äË±­€\þ?€3½ë8Ä{„§dh“À®Éd›7¦c×Ð4d±™«:ð?H¢—XÌH±¦Då<öwßrû93’Z»Ô:Ž¼ü'¤t‹#¨atúkÀLøý%«;KZsÚá)™‚}UŽH¥pç9÷†hâœ{@âU2†rJIÆô°Ð;Õ¼9u¶O—ºðÕ=ËoÍu¬ÃRu–tÙ	MŽ’È‰Û-ûYÏsïÚû‰` %Ò	€b.1~Ž7L¤Ï›2”™Öøú‘Î†ë.œ¸^>j}kôCŽÇPŒt[†¢Ú"hïŒrCKå`Re¬h">4ñ8¬úTçÜ³\ÚÇpä 	GJ?gaTî¶Ö¥j©·´wÁwÚ|‹xRžÂéØ‚
v5h3HØÓQÊ°6\¾“¬ˆUuâ’(Ð³çË2’ÏÙåÙüÉ wöÙß"H]ãì¯Ê‘uƒ´c÷ë=§ùæƒ,P?ŸþÒ%ÏÎ¾ M€T…$8õ–G±t=r£XØzv›ÑÒ‘ƒòJóÐú®mõê­X [­ïµ¾MÚT"Çë–«ó„¨1uÄ¾óÕ ²³¾csŠºÆmÝ¡x—ÚûvËkSÙØ˜ÚGI¼ßæææ°Á·Ý6d²h•¯æiU>MŽAèyŸhtep´MÕä#Ä#™}’««téKÖqïÄ¢c‰²d$­'L
¦šY*ã}ÀµgÿVìià‰%%ªþ.{wvfŠ•b2™)ö¸ç5Šf„ŸÝÖ
Ã¤g>:¶Úm˜k}Í+\Å€!©s6œ²#õi~ªy`÷¶­¾]š‰`-¥hÞ+ïœoiYžÐQœn¯Ía=, áÏ7ƒ0åÑÒ`Ï*“+1nÆãx×æ¨‘KW€£°¯9ËJýüù·]Nßè8Ï´¢&xIí_YKìàˆ[úèÏPŒˆ#pÇdb¥›ëymÞ¹ ­ÓH.qÏ}ž¡]´4é¬íQ·A{féCZxiÀNÛè-³tHi×;M×n„Ü}¨úñG¨Ó7äó^Ä¼ñPÂ*‹%$a,îažWBY.{oü\¬1F/`È<u›ÚÉÂØïºvïcfÑOmîÂÂö¢UpïÅ²ÈŽ×˜Ú¤kÛ¨Zn‘¦6ïœ?ÿ;µbé
:¢Â›†5µysgg‹”n:g_v/ágõ0„bfd}ü´å9´®Ÿ’;-æ	‹×È¿]}O¬²;;ÉzBšÅQÕÚ Ïh¯w~úlÁFT4¨³©MPBæŠ'æ xäU¯ `mÀ#ðâ`~ZBLeÑÅ`ô`L¹(°ì	á¢€^@“úª%?€k´HVÓ8.+ó¡Pµ6Íšè»H7¥~Í’¾_ÌÅíL?(¾Ú˜žAÑ×°Ì'Úbˆ4Ò±èÇòãÅŠ£ë:§öÁÞ>C®Oz¶NcqJ½D$	´‘|èÎN;¨°±õßŒysJÇi«æšð¾Â±š†Î$öâó±77î1Ã~¿³ŒÚ’Ù¨IÅšdôI<Ê}g7Sþ¯”­/ìmù±""œhY—Ñ¬Åª¸®Á†Qß0Fã°;:g_À†~>2Qˆ{öÅ½ëûÐ‰xhwæ¦ÍS®¯eè‘¶=\¹3š] Õ%¼‚Ù«¼øŒ¥‚¨ðê÷.©Ÿþ–¼üË€øA-á".ôBÙ½Ç,HUÇ‘ÚÙ—<àÍ3¥5Äãæ³>¹†4{NƒÀÿÀEÐ§ëOØú¨%ôQäh<bi’‹Ðä‹˜
C×ÅxL”MgÎ“n"’Nq>ÌMèÒÁr‘¤Ã‡…{µÝ,’iÈ T,~
‹_Ncãø	ôfùîE¢ÿ²1LïÅ¯0–LµB†~².>š,~Ž-K´’å«3¤€ËrR˜æ“Kw©ÍA‹N´"¸®±¶ É³zð£‚E­‰7Ó’Óˆ™ïALZ·HÚ4~åx…¸>ŸeýS¨t£|jâBK’XTÙ÷êƒþô‰ˆ˜5Ì
W„LånËï´ßõz™s3åÓìÀ ní$á3ëÍÓtÂEktÑ;ÃØ›äóüf?fœ*Ç,ªabq4uÏÍ›ìÐmÂÑ}²"®ï(qÇÔæýù-¼ïÑá7Û“ +Í•@¤âäHšˆq«¼
§éìÛþ#Ó¤CYšf¾âiGPZÀ áø†Üõš°Ú¼ò¦qÜ¥VšÆWŽ^’D(µõÝ—Ž×ùó/}æsýÜmŽ8®HAüèjrEZ¡Y`<ÛŒ&€Ü#}¡™±g ‹¡ÕÃe'(ÔOcs¼–c»ÏÕjeõ¿4áë¹º×Aí‘#§ŠA3¼  <àaåÈù–*J“ÄB‹ìÉ±#´ÈÂ°þ¬ìôþÄ7…ã ×SÈE5Â)j#„!Wío6Â0mxµ3ò8]øÁ}i58?ýÁV˜ÞdÃô£ÝiŠâ½–í‘ÆÙÿs€öJ$ü`Î.¿e±Åì·N,¼`‘íóÓ_×YÂœoË^Þ´äiŒâ02);†.«FUlîxÎÄx›öÀ#TÍþýý·F?’68ÿv!9E_›UèbPœl8Xîê±NmR­ÄV©(Eç_á	£¤áRŒN*ç	|)eüÍi’rýÝîÙTä·ÁåÂvÀ¥éŸBtI‡<%) ÿ|C…ößÝætîÂ gž¸Îƒ6u<h21Ì-kÛ=:k<*²é÷ÉSdPÄØJSIJä$‰ÄUE¢’’Äeh÷È­oµÛtC€Ìšãôá*ð,²lƒ#Hœ“(]wÆ»þÐÞïÙýÖöA¶œ9g‰Fèônlf­|çND R5µï}áò?™F“ MŸ»^2”ÞL¯‚Ó3"Yr{g–l{í6gÕ¡ê•¸zú¿ƒòãžK@>‘-5ÜÔ‘(m±ýÎßÕÄ€øw1ÏäÆåÛt &jaäc8IBa’Nˆ\”A6p1ìÜ
¶s5ÐmÊ“‰ˆPšs˜¶ÀVÓi”£	¶Qk·ÁV3'ƒh°8¯ãëül`cÃOƒ5k-µ‹rä‚þióXà°mÒíE‘=§Ç¡¥%ÂÏs%Xºa8	®¢ÕCQ	¾Û'°Ý!ÜØ
o‹.W-±éÀË‰¢äÞÞ»ÁÊ¦¦àÉ¶„ªÜwo@ÁŒëHÚ»UèîOw÷nÜ›Ú¼ÛØâ
Ù,YÀUl%,gG1%‰ q%qX^á¬Ây²HêºQè”éÞ’®Ó5«—3CBf$fmö©k—*³„Îô»NÇñg˜¾£ŸtÚ.ÂDÐ›“¨ˆ&¬]†JNƒ¾oõ|¶c]"Ýòr8« ÚL$Î
;öŒŒƒ§§Ý>Çl¨
5b%âv:ßHcÐcÜ
ŒþV#ªÉ‚¿ýVÏqŸæŒkÆÓÇOB«HŠµËfh>¾£?`¡°$øí‡7¶ön0ø|?ÐC—ÎU ƒ^E?]›cCÜ‡hóRpËÇj:²DÇèj
UýèÁŽôbÁ©{üXž–k\,×?oßº±}çÁ{·ïï‰¬NŠœ¨‚BÖ1Ëã¡ÑÅpÙƒ¾þ =èÇwWËTîØ¶
Óë™#~MÕo¸Â£1MS!Ž¦áoÝ½ËÊÏIN'Õc^Íí{Þ{¸÷ñõG;7oìí²ª`¯û¨;Â:”2ªvUÏÎ>*{xcwï½‡|l2Üòø¬ßv÷½ŒŸõAˆlú[~RPÙáŠÙqÜò¹î6N™ïW×!ZI×,˜!éôèƒ¹;M“ÇÌéˆg®Å‰}ÀÍÓ©ÑNB¬3páÖšÐ¡.9yQ_UEÁ'l|¦~ÅªS¡Á®à–UÙš¥'¬‡4¨hZæM” +ú.Ô"WÎB4½×:ûc‡tÎOç {?gõ™þðì7[Å’ÆQÞÛ2±¼°Ö‘½÷Îþë}rýüôŸ±#…XN¦ïß:þçäÆ‡Û7î.W-knÝ>ûÐâç¿¿_¸èŒUcúÎ­³ºMÐÝÿÙ†~ŽžÃ€´§kÒ­Ýô¡f'yF§Ò=ÁÀ­Ó…6¥Z•:)‰·LØÉ&JÈTÎâ«åo¶ŽFuÕZ%EÏr,cZ9óÙgîÃùœ7¡Ï¾·†(IšÑAú¿»üàØâ´÷²¿ qBÃßÃ°ü¡ª%15Üeñ|[H	-àë¡ÓÝˆj ;"LMÖ+=®VvEBâä}ÑExÑj<c}Ö_ L/ÊºÈw:6]þ;Ýks¾·óøé[ûö»Œ½³»%¸£43KçÛ­µNg­ß'Æü½{óGôš†ƒ«é¹9L@n8P½lh‚ß$á3}=:LSý:/¶ž<B†º
S5æœçÍ|Ãò-žq\×Îó)e56°ºñlARQYç]¯¹ÖpOüuBøÜßLŽ\T/JîS–ŒbÁD%„0„8¢SÇóKêinŸê>zeîß2Ã/r~_KÇã+ŠÓð+ÂZä>¹ô‰;›ú ‘¤s|IöduÚàœ½q¡	]!´dDÎ¨ƒ(¢KK¸ÝhÃ~ZÂ…pˆ>ä(A161ôè —wd8Ê³óÓ_º˜ÿþg=!±–úÞáwçšòÎº^ík^xµµ”óI-{T^‰+JnêÜÄ¸ÉnˆcÖZ•`Ö&gï²v–¥Ù<ï½ËAF~L–+C&»Ïv€”½¤³r8f'¤~öo.iÃ‘]~ /F¾uB—ÃF—²¨DJFä(ëÃB%¹|%º˜âÞkXýV2‘Ý@é¬.ÀáÃ‚l¶Á)Jç0ujˆL"ñmV¶-(¥3H¤0m]Eªû)§ºÈ5mõClüÜ%À°×x~Ä®5Úñƒ®îš?¢^	½Ž¯1HéÍ]Ë#mˆ»ïWðMÏ÷½ àacýpÀÎÜ%x˜C–ñÕ¼JºãýÜÆñ_uÃê% ÛÏ@}õïŸu ,F0—»U±yŽËâ&tgJ–œpŸÄ<œù7…^€õ	<ËS›waìÎþ¶¦›ÉƒXl_›*±rÃé×	ûË¡vlÃ}ùº(½õ¶³y.". +¾qE&b¶ué˜?ÿW¦|¾pÈS€™åŠ•)¸¿ƒ»ßØwpÓNÏyfÓ§•h[q+&NçÏÿFB7J(T)iSþŸÁåù×þË¿¼ü’–p~úúàK¡þ‰!ië›²#ö“ÁÙ—ðZv[Û4ôÚ˜Ï {š57iOý•þ¯5 m®Ã÷lBRílXñúü 'RG‡³ÓÓåáá‘†Zh õÜú»ƒv{÷¨O·ÉDCü7\ñh…fnÈã;2þU|C–gÞi nRÃPš?vKb<d´0 yH&tM˜¦IÆ{”}ŽØèZŒkAö¡‚Ê^|Ê	äù177§ÝËh@wˆøiLç\·zÛÌe1#iã˜"áÒ&/@% r“­v[Çd£}—|ü Â~¶òÅ¾Õ³÷7Žo¾÷ÞÍ»7>Þ½uãÆÞÇÞÍ—{Nw±1õ1µÝ§ùû•žÝÞ˜r=¯ùOˆK·æûv¯GwdØ™å¸‰PÖ¢l«_,åpC_B£©Ë¦mb&/èæ8@ñÉœ¥OÈØ½óÓ‰YM±p¦\	±†V§&©2T»ÓÐ'C§CÒƒ×¯1ìX8R’ËËl#]dû•”˜_G2DK;¶MíºåæM~D¨Bn<™nƒƒÜâh69ê6¤·àk*Ùµ}Ÿ.HýŒôê}M?xÈhg#Ò•êèª:µèã3:VòbLµ»$´Ÿ<Ù´Ãn0íb5ÚAeß+÷È~ÏëpØ‰Óï<H±ÂÃ;të*nk†Ê–¤±ÅR›”"#îÐ|YëÛm¯þT;J€ö´ oÿRï-Û¹H|Nd²f7UÑÏÿÃ'{-ÌÐ¤:”Z:lóøp»Þ°Iy‘¿"­¸Xç¤ç?ð@Ý_Ó-ÂÓÖ ¶LRƒà0;Æ‘÷‡®Øg«ï‡$v(+'ébHw(ììKƒL'ˆqB¨½á6ÞY“=«Þx'ƒ1‰j@p„šÖÌ¥àI:ŽvÒºU´qv¹™Ý¤µ³M;Ä€ß‡v#=0v'
·é1“asûå— KÏÿž	×yFìSàÛfÄE[Ú1¯×6åùYÛdMý:ü°-Oö›<ä@x!šlW¿Óý8}ôúùóïØë>ÿfÀž„?ÿîF7Üaaõt"=¯Ãïˆ­è•øŸ´j é¬ÓÍþ€ÎHð<cõýl`s“”Þ?û6'_¯¹-r3«Ëâf‘|m–HÍâî~ë2­ìô›°pF
Ð¥ŸloÝòûMOrÛÄ5¸1f’³oÁ¯Á†„BÌ§µóÆÔ ›àÓÖÙ÷º	´ßŽ{:"ÀZÔ(y“BµÈE(QÚ¿rc>¦¸Ž¬Á@§ mè;úBÆ“ëWÁjM´bKXEùfº1çtP«€í.FII'2(Gg±ˆÞ•ÄøÄBðÐŠýe"¢páâTî €ŠßÆTs£u¸1µˆ¹3ÿcÆ3Ïñ·+ÐŽu„È’bÞ|]ñ’J!ß%«Áw¤N•:“·#”ýÝn¦,¯ØIjÈá(,O, \Z÷TÊE&¿éÊcû öæ!àÒm—hÄ€ž±l?£Ÿûlë€Aäd ¸TÄ	ŠC»`ŽŒî„¹%ß9Ð3q!lìGäý5r?c1Â¾Fª+¶äO4\iÍuÃmŒDoñrÆ@kõ¼~Šwv¢³ÞUYVÄÃÁL-:Hö=Â³³€ ÇzfsOŸpô¡=¶`¸)ùIB­4+øI›Dò:—|§ÍÈ„¯?ˆ2®[m›ï\¥úÑžaè…[˜y„Ù)¹¼“qcá¡—3T$5!CEšÐ«0-Ä~¬ï¶»Í1¦:Ë²Öé¸×„÷ƒ9ä‹T`è 'g,µ®¿Ëvse®	œyàã“5†cÏÐcˆXCÔ±,—&x7ã}¹+×ôKÇ±ÃÂ÷¡Ýtú>çø€Ž¶wPÒgUÊ%)TLªIïäé•f¡S?WbˆØYCxâQ
Tâ5@wÐ¦K²ÞÖxñéÖý›p@ù¿5‹±6Á?¦êfUE‘¢ð)ÖóáïãÐí¬1É>GõòÙ'äÎ­³ßlÝËÙ¸©ÅeçOñÖRæ™…!òXÉ¦¢Ð²®ÙMpöIé=:î=zÿÌú|kéBüY©3‚Å´jÌÑŒEÎÚX½à¶Þvzõ$óÁj”ú4X·ôsâEV=>.s´3ÛyqÝêõpAm¬pº
D'îgûCK‡ª­øb.MRŠ†‹A<Z¯™[SAŸš‰±e‡‰{ïãH½/D°”Ôè)`òa@Q\ºEM¯ºG»yæ’äìöŠ!x/%“ù²7b}Î£6·Y(AýüôkçË×á…•8:¾Ïˆ—]é=prs›žhzœ3s)w¶:êemØž‚7H’¯¡ÏÌ*Cg9Ö‹2„jžÔÎ\Lë¯¤¿F/‰žUæ'ù.¢.ãcY„ú4¤iÂäMPžÄƒÇS Ð`¢±WcádÚŒ±èîð]¤°F©Luœ˜&—§ ¨PúŸGIUßwÜ–G%Š|xö¹k‘ö¬^ï?“»ƒŽc÷ì™ ¡Ï±tqŽ|L“qAÂÈ»¶z=ïà!ÀyT @© ­˜»‘×Aµ4aÙŸû^¯£7Í"‡ÐÛ¤Är(¿‹¨0ÈHýÿ  ÿÿ /t£Ixœì}{oÇ•ïÿû)Ê„®9L8Ã—(K\ŠEÉ–V+"íxW¬ž™æL/û1éîÉLlÖ¸A°ö‚»A\+^#7›5òp‹äêæ{0ŸäÖ©êê®ê®WÏõðºQäLwUuÕ©Sçù;÷œÀMŽÿ
é¯®—8mßí^yÉ7I£Ø{×Ô1<¹ajx½ë=AßI’{x Wgö|÷y©$ÍŽ¦nŒzÎ ¹<cl7õÀÝ‹Ý¤¿}À58z|Ð¼ˆúø_ê¦M/ìz½¨yiq](¿
ÚD³NèNê6“Î¢54;{üø-Øô^zÒïî¥6CÇ*gc½‚Çº…i³ù]úI0³ñüã³“‡=Ô>;ù)Ú=ý·Á'?õPc×u‚¹õ…Á¸ý>¼28|”uäÃd\d#Ü®7,÷’¾?¾RÜ5
ÎN~æ¡N?BitúiHïjŸ=û,D½¾‡BüãìäJûCô&þyvò»¾Ý³òúžh3YÙÝµÇÑÁ¯×OùY(†NÁ
ž‚^Í~ôÄ×ÒØ	é7‡Í%DþòR/
›ä×½(fŒT³¾pm˜¦Q¸ñW†ûJ”5HñØøÑŽâ®7SöÑk2p:nó¨¹‚Ú=FH«‹«‹h€ŸÃ/vÝnsùÐÏe-d·â&Ìd»Þ_­ÐÎa’Ñªïtö…-w÷=Ü¸ã$.ÌXgï»æ½ËwýRkÕjßïô=×ïnùn¬^Æbã›®íÓ?`ïœ|Ž¶ûÃ£³“(‘ÿÄCÁégöjÜ½‰ÞŒ8þktwëoçÌ4Ù_5Oªd?.-–6äª¸!‘ï:]˜ÌØõC·k3i7ÏNþ7^…³“ÏP|ú)J¢Ó§)¿_ñ®üÙ›Ÿàix‚ïHñ6¥ÛÍlý˜ŽÎéÓ"›ßök´ž¤qö6îÞ\_È~Åmá¶ûÅW[[|×xÿôÔÅs½†ÖÝ ?¶¸ÔZÂüìôÓÝüóoÿüw¹Û?{ö›€›oå=ë¸9ürÀ˜Ò³gŸcªÀÜ‡²ëàA`õyùþíLÁoZæ¥3³&Ó÷£ÀëÅ0‰ÔI“VßICôæ›¨QÿtÁ»ú 7ÞÎ+ùvÖìfÄScxQ2J0ÏÊ~s;gµ½eÃÈ -Ï°ltm4hcæÀr3Ýú3·Ïžý)EßÂ¢}gxú«T¤ÆÞÙ³_†(ìÃÊ®YŸs¥	ìÅ^Áf'ò“æ²½˜ÁZÛ¸ß?ý=Nè>™Ã¤‹ç5dñÔæXÐF™HÇxGà&6ì/n$»§Ÿzh¿‘3¶1LÜxÒñ6ÆÏ½Þé/B”àýÖGö°ÛsÓI”µ2þåbjt¢dâñ6ÆÍm e<’¶uö'žÒÈØca…ž §Óq©vÜI‡Åµ4þ<þuáôýÚž:þÖÔÆWnn‚	t08<;ùùx¼nÔ¹G¸ÅŸÉRhkì^;}Áñ!"z)oldîÞž×ñÜ°sôÀDñ8›¡Æ–ZŠ—:¾×áO„¥e8çrQÎK¶l~K9T
¡GÊ³Ñ7‘ŒuV?ÎXõÂI$÷“]]ýœÛVÕ/Ë4]½C ¨ê×ÕUÅB>\|J7rôâŸ_ÈüEjèBOO³›;6¨K
›9ß	5XéT5³y¹'Nì9azu&¦¾º36%ÞwñÀ°osséU˜¸ôpi	¶@±gûÍ+(Ep™‰€ÙßX¦CT“åõC«ÑDá6ÞcûWG9tuõ°ë»w	¹wû»Ñ]ç¨±çø‰;g´*ÁÅ[–h+˜0³v,°ÚÉßª
‘ëñÂò·Qkãõtó­ödsžÀY¹È}”"Êë4ôntÐºì7Î P‹œä(ì J#;îêí¡Æî/:À<0Üóâ 1³"lµñYµ†n‘éœáé§G(9{öG¼†ÎSAA«ì!‹¾XzÁ*äo«"Š(VÐ8œ±ºÈôÁBÅí:©Óv·…®á§1[í±CÿQ0BA©‡•‘´öygsfnÎöår/•o4ºsm×Õ&:~e¶ZÙXÂ¦ŠÛÌæœ0ßc¸#ûZñýúÂ¶w·ñ¾ÃB†¼z‹ì;®çubŠ’0Êõ…]§äT¾-|OµÛÙD^˜"jÇvÑuÏñ£úÆ‚¤Åì»hà†…ß-¡ß¿‹¿>ÆÛþßÆÄÛs¯Ž7½¥½_ú–ôûìx–ksØ$\§|\…Qè2V´|è+Žê¬í›®ƒŸQ­avÓ®—ú®…‡•íÔžésöLà°~Óƒé9í—0C¾TËþx»úúÄ@5è{À²ˆé|SI‰Ük¦âº›tbo Ò^Eœ–GZ›å›Ï?=ŽÙæÉB´Ï¿€Òžxvò}°¼=£]Ú?}ê~â~îá1ÿ(XSÛÔ*š—Ë~î4Šý˜Ê}·“ºÝ‚Â7[©`²w‚þ5ºŽgmbŽ¶ç¾Å“6ªOd4ææÑìÍ›kA°–$¨Û]¸{wá_³sà]jµZ³jÎ›)T†•çVUÅ‰ÌÛEþ`Ùñ .‡^Ó	Úx§®.–Œôc°5röHæ ÿÓ;.sî	5qYú¹;¢n‡ÿÀ.Èê=‘!d~Ø—èØ„±ÿ!&/°ÿ(ì)ç_s€¬6TÒ¯=-€Cìù'§ÿ—§'ÑÓÃlWà‡›¨H7ôöÄ‰¨)ºh¡mbŠç$¤Ä–ö7˜çŸüù·g'ŸuPÏ#­“þB,òÉN¦>¾‚ìô_ø÷[×[UNTÒó…™ÙøÖð§yCü	û ]…:#îúÐç[õ1›mb9¦ƒÈo^˜x]¾–M­ûÞ†t{ƒ¸‰…Ïa˜&›­Aý=¾%AßûZ<F×a€§OÃõüø¤m3íŸ6ÍÙG§Ò:5!Ð¶·9òÂ"Ì÷éº^Ö†¾Šq¨e ìHy;Š`/ò†u\àžTïm*èšs¯_`¦¬YšÄ¦eò½s¬‡#À›g'¿<Jþg“É†¦\©ö[¤ädÐhÃcWˆ® îœ“)yœÈ9g¹©6/©Ô=5qÊâ'D[(opÌ} <‰¤( (Ï>ý2±Ÿ\Ä¤Ïê-ì…hÍäékÙ¶­/WgOÚ	ÕÕ›Ç”¨‰Cÿk‘Z¸‘š÷L‘3ôe”û§|¶æõoò35{€œœ	ô ®He)‚šE2¤…Þzx[þ¾ÖÜ|§,ÀSÿÙÁ}Òº;<ýÒQYz_¼
´Þo>¼¸J¼ÙÀðö|LÜGMg˜F\èÖ^.¢AŒ	±3Ä¤4ñ #ßo;±^ì´àº£Çò8 ú"Èñ±ð2Œ“(n’3 6¡£7Ø	qøXÌf¡¢áxz9„.îˆüWØë§­åÜ ;*VáüÀ`
o¶Çfb;²÷h„CßWžxš=/“úÿ/ž·wÔl»éë†£ÁJV¬­[7š‰þ¯"v‰ÎIÎº’ =sfc—3#–7aÁRPã;ð±(¾…gC¯Íe²þuVÐÔ©çkfCàvåà—‚3¤§ÿxøû#D‚p0G9ù!fŠ	Ý"ß o•Æ )ü¬Ÿb™…Î‘N oc2Â©vÁ›oV(á ¹Š9ÿjÉºÍ6à&7I£X²NÄ1±ÙÜì
'"ÁYB®SÌuªŸÞrXÖ©õ–òíýæàå›6øíËëªbMÉÃ‹ÙäP«|ƒ€ëUÛ‡åú¢’Ò£†?TxÛ´9&˜ñ‘3ìz)&°DÙzkÏóñ5@ŽÃ\þÇ:•¤	GùÕ«W1g¥2Ú,¨Y²ïÃžî8þì	é‚[îëë7îÜØ½ñáÖ;y’¯¯½wç¶ôû[wï¿û`ý»;Ò[ÜØÙ}÷Áüž9µk«•`^á6çÑÒªæ®ÀäS¢§Pmí»GWG0V¯«ó1Lñh•ò”MÜ?™':”Wþ µ?jñitKÓ9µÓ¶Ú\fht¸O/	`ýšƒ·©@MrîÅ+Gëº`ãÝÓmm +ˆÃíA—ðÇ[”jÆh¼¼ñinàÆŽÏuÂ>°ïh¶ÍÓt98`ÖØ&^‡àÈ0[`Í‚“S`ðZÞÈ	AúþPv¿dÊ®s2Ïdß¶±E×ú¡.*,Ÿ§Uo½DÆœÙq¾x«Ü™À|‚áØF¢´«'ìÜf;Ì¸ cB(;u#p<Ÿ½úž™–3órÍp6èŽ³¢²•~”„Î éGéfËwÃ^Ú‡ogï-lÍ2´íìCŸFÕ~í¢Â+zq
U*EUŒË'†qìdB¶È!M5ñó‚°ÅNÏ.µ)KÏP‰ÞÄí²·à¯ð'â¹Ýq"ÔØa3±•Ål˜u¬Ý”dÑ†|q>*JúXÙo.NO—±„PL§b>'s\*Â5Sv$TL­¶^„#œªSá: *¯F"p 0±ß+Å‚‘ØAQò¦4‹,8Â!Ôc:¯I¶"oÇQ JZCº½Æ°%IÜ:–º^O¸åEQ Ê	¤šIyËìÁŸÒ981˜ðù½oLK+…™ó~”VK†»®i¢t³2‹Yòoˆ%èÙ/‡.“©ÔÒ¢rÝ^¶‡çºë27	ÃÅ³åûvîñÆ¯ƒ¥¦åÙáÝŠ‚Ý“Zg»ÄÌô*ÆMíž~öQøü#!0„¦ºq1SaaHc—·À¢…€[Î‘ÜLÎ¸›Gƒ€ñö#jç%Q$/ûG¢Ïèù'§ŸÑ pð y˜'ù­ó¼·l>%˜GOZOZ´cqP§úÌÄñÙÉÿ¡ž©WÇW”Å,åfu†¤*j‰–6‡-©b`$î¼>°rž¥N“[\l"bØb£71%wbÿôß1Yv­ã^vIÌ›è}Z¸ÝB`ßï:æy/,¡ÁçŸ½€)Ýü0£Ct×‰÷]af)&sóóòd(¼IàÝ#'Ô†ä¼Á2ÂyÃäÛs	‚¹·±s=‹©…‚]`ûcl‹  QþæëärÚx–îÓ°7´Ms0jKC´™¬ƒ@¤ºwl™è…Ë<`Í½¤Mˆ×š ±xð²9|Û®¼¢‰/©†§fŸÀM?Â{ä3Ï9ýRž##Œ?Gxeñ”»]õÍVˆgá8G}0E´OEFÐº8Ü°‹ÆáÀ,ÑOÊƒ$.²a[œw	ŽÔxØI½'|·YÚ”ÐåñÆür˜˜ŒÂ¶3%ÞB`R&c,Ð„W)Ýø5K!³ÿº²&“³øë¿%‰úü™ô—qøõ%qkCŸg!ÉØ<Z*ÞÌŽ«¾ûknÂ<®/”«ØpŠœI0Ã1ðV7É\wÇð¢oÒð×Í:\ë«Ée”ž¬¦Ô)ð‘Ö^®Ð‚Õç	¹m·cÃt”7ÿ÷ã9ÛgÏ~qï&ºvúýw×P)2äeK3Äf'0œÝ³gÿºKÆ\b14 ¶‚ WWúJ6Uz?á†õYe8ˆ_Ë—Â{î»qà%	^ËÝuB§ç°Áw6b›]Êy8˜ <þLÞES3²x¼Kd!GN7ðÂaº qSÜs³E ŠÔ/j@Ó[B~o­øó"!¢K|(!bþS/D{˜:áÿÄ÷È/Í½8
ší(…”eÔR`°*H&ðŽ»—¢ºþza†qéœ‘ pÁ°Xu©%fL$,¿~‘&ÄûàwËÝp|Œjž…Ò÷º]7´ÎkîStª^³;]¯b3š1"S;-þp0Œ¾Kìž&1y=ºígH[³‹³§*œŸ÷ÔqkEÀwJtÇ‰ÞT	Ñ˜™z®ï;¤,ÿ5Fï¶Á(ÒÚw’ÆƒwïÜøðÞÖÝ;sL8TGQüí‰’Í˜Î=ÈœH\ÜÈ6M½zÂÆHu ‘þSHó/z\Ðl,G||ß?¾20ÕAð¸èH-Î5z£áüç€MdÌc™ Žbacp¨¥%6ñ¸™ØsÅ¹‡¸òÆÃoÒÛîÑ<‚_î8m×dDÂìoj/a‘Ðè*bR?ìù‚‰Ž–õ Ú¡ödÇyâv‰¼×CôIŽ#ßÁ¬¤•DÛˆ0ÄxÐ‚;øN´p>±›ãÐÑ·Þ¶ÁŽ"áôYŸ¦ˆÕôh œ4kBsRG›‹Û`ïkêœÁî„æXÆcHço—™³€Ö•y$1`fÞ8Ž®Œ÷"´‰f—T[236­åM’q`"Ã¢ÖãÇòÖG…,³	”ÈF
*.ž6Xè;øõfæùõÃ‹SçšH:>I.µ—ÍÀÜr<ú2æÑsv¡í9ãj%ßK³¨1;÷pñ‘M$¹ ¢<œ9ˆÂˆååÓ° ¼àà`q"v59Y9™f¹UÈ;,ŒÕ§À®Q‰CÛfW³Aft¹—s˜ìË¥8ýbñ©ã‡ˆh>
ËPt›¤!ÛÜ6ÓÀc±´*VÜ˜ðcŠž/Ä'çÖ¨,²`æ‹JÛWÇ[á/º‡—–sU¢GŠe”¤ÅéL…c®Ø Zn|n¤ç-‘Z—[ ·.³¨{Ê§ÁH°ùÎ
&/`mø„Í¶3ß´¾Ð6bëi$˜cM§5žRs£õ72Õá:0­D‹þÞ‹bï»xÂÛGhÏu°<å&“jw¼Z·òâÔºL‘ËÔ:Ž¤'Që
P}²5É‘‹_Ý5ò{ÀïZÉ
¸³V?4Ð™FÃÍ§¯?âÎïàƒhýHj_¤}:´1Üú~bÔ2…K’[T˜š‰Áê%ÄÀŽ
½ç¡\Sydq[é¢vÚ(¥ZÅ€ þÝÓ/:}†"¨ðÙ¯:Yà*@étÔ”ÔúáÍÖ©‘yIE
BÐ±3¨RÉŠÞÊ`
lƒ«jÅÔÞžãøêo+éW¦<SÀÆe ¸^°}3’#[tÁ†þ(c@@_ÀñC àuÂ,¦mó±è-Votñrt9µ¹qýÆÛ[ïÝÙýðþwoíìÜz÷žra÷ð‘(n9 Œ;€aÞ˜yþñég X÷t@c¦Ù›¯ÓBgÏþ5D³Ý¯söìó!uÍŒ/™1žøŠª0oÌ‡£?Á¨¼ò„#AhÉa»éŸ9 s®Ðç²š—}RÊ.ÕŒÅÀYeuÕf‚˜qýæ
þy ?‰ç.?ïZ–fFûµÚ®–û;Åš>m8BÕ¯S)ÚôëgkÉÝ3’tîÔ,Jõ`-dU™®µ´j›®eÊ±Òõ^˜µ‹8,³¥w}ˆîê¢ hlq´˜Y=V…í °#D¥ð¦Ñ[ÙK&»‡V‡2ä‚JˆÉg—µ¢lc3Ñ%¦q»óÜòÒà¢¡ÑÀ:õ©hdÀfuÅ”•&{ï‰æhpÛ^ÜñÝeQŒ¸›±¡òC¥=„5Æ™oÌ˜t?›YÒ'õšø«RgrWÁ%HÞ½„2´¶Ë‹R´6kd6¤˜KmNg%heJ Æcê($
‚Ò™²R!í„˜8X²·‰ôˆr²AÅD,ÌýÚa1Z`§Œ	ÿ}âÁ½?ó
O.@Û˜´ÞÞ˜)ÓõÌúB{AºWïôËñC}æeÂÔ)Å –_Ø{ÃF³Ñ’¹®Ø‹
næ²æ»E?|çÁ»ïÝß¡î(â#˜§®‚[ÝC!ºŽÈXíLÐUú{‹PiÔƒF<ð=IÚ>¿"n­¼Ý–‹wÌQcÚrËvË;þ°ë&ý9«>À‰%ë„8·,ú€÷F1P}—ã¡"ÕnÔëùî;¿éªeÐŠØ¨(¿Q?`®>ÉŒ§Ûb÷	Œþgøadß(f•Ÿ9³.\?qíÞcêoñŸÛ¡{€vÜ´¿Ãçóÿ’¿Ì£9³vfP‡þZ_¹ÉÊKší{âe›õ¸jê«VÄå­zYR(Ó—V$¾²QŒîD~'cÈc¢9.	
sþ]ïèlCà•`ÛË~é:IßíVUE³D;ÊêyfW€WÒo=œƒÔ²/4ß¿XÍ¼&ÅË“âÌ¥•VfH¯Wÿ¢Õ<Ù–¨³óÞÓ«Ž_ž^%”ã—V…TØNŠRÍ…ÞÆš»Çˆ¯=7wÚ¼€Ý"¸ë‘×ÎNþ™Y!‹0PâØÙ.ŠÂþé—´®Q²†ËÆÂîÔaKr÷™"â‚îZ¹Ü¬ÎÖÎMKY¬hÀ¯5
m± ™âÜ×œñÐ¶…Ä"¶M©’´ßŽ©pn}³ô|5êlÕ<ž÷ÑW¯¢ü5mËpÙÏVÃ*ÎX6Ûg6«ûL§-»,O]v™à>Å‹ÓìíŸ+ñ;‘²ìÞ®Ú^ovñç!W¥aÐòjÛzXR*«Qß#ó1ZùÃÙUìÜIâ“–¢é’T;©¸dQIB0R.šØspÙUD¶‡
\œ¼E.Å¶¬¬­štU«`4tÅUEdož•DQ(âÎr“¬ýRÛÆ[×¨xcàEýh‹âªSayŒÛåqrõèpŒP9ßuº…L</R…:\®!÷Öâ*DÈQ¾îCüÛ±]_ùàUh£`Ýg#Õœ×Ì[M‡E—NíQÔ¯[áãë–TÑu1Ó¾ut7¦:”Tãf+áBæS³Oãµn@ºX˜­_b]NY>NŸ¢irqÊW57'kcVmñ¶‹yR0™íý|€ÏÆ®\„»0VÞÄÆnßP÷ô?¼ª­r!ÂŸø¹'ÚµÏ-ñÁ>…­£^•+JÈûË‹sv ûy·<’¾ÂvSÈª¢ï÷x{RØÈjã´‹jfÑ0\XSß~pck÷êîº{ÎÐO	²Râbí²ë`ª¯‹4>5(ï±Ãžññ`/=™yËk[r ‘†Ú˜	q˜×Uˆm’¯[”´úo>ðgY¾‚åì±X ‡¤¾ª¸³AÅ3¬OH»ùê<J2°,¦òÖõµ—;êÜÂÛí{ô/C=Xá–JØšÕ_ë½¸
œ½QÍRQD½£bC.„ ÜU{H\µvÆª¿Ùy÷^‹ÞXÂÊKƒA›¿@ÉÂx‹
³š^¯Î°ßa;,šSÊK@f?SÞ˜,—„[È$è™§_jŠ/™ßæeˆJfÉHÖÜ KŒ–Ž²ŠZ\êTÙ¡è4–Id±ÛÃò–ÔmüÇ#‡$•ç¢{X*‹•²¥GÃ0ÆRdß‹°6¿MJlÈÉI]*‰ ',}uqá
ANÿ·5¹q¹äýR{¤x!Âä¢±"˜^’ÐmÈÜ¶óAÉýYÕ¹Z¦ñöì´S`žgãºì·|†Ö õk®ï? °QIl¹˜¢ðj©¡”»Tæö*iøù	:»J#U…P2õÝ¬ú3à¤òÒxX@·ªKåð‡ÎÁä•%Oé¬\e_a%Y¦„º5Uiâ†d›ð˜Ê3Jæ¨JÔ®CôA–èr	%š™0ƒØÆC†5"ê
3•¬¤ïÉa“(–´Oâ†ÚÏ!ó’	"±ýD'Ë;g'¿tèù¤ zVˆ,JN/ÿøšÊ£š‡üJ¾“!Žä3âu?â0GÒx(¯- ææ\% Ÿ¨ðfsÉ«ß¼TQÂ‚0Ë,9
H#ô
#’Þ¸þaÁÌ˜ü^®R¸tÚo•¢ÍVòÀmÅM¿Ü€'É2É#
%ËWÛ²±M,sSÃ„QÈ Î…WS*V5kÙ
W#_[eú•:íJf¾±<Ö ²C®JÎ6Â¼ÐêU‡Õ·¬_¥²£ÊHC}V©S¼–käxÍl<ÿ˜!~<àS–?¤°!©Ø…)ùIQÃŠ–ÑÍŠTB™Óœýuúôƒ.Õƒ|œ²Ã60Q£AJgˆPÕ÷ÛÃ:&fo;Ãvà¥Ì3ºÕíÒú)ÇöÖÅº¡
–Ï
ÅòQžÂ<¶,äZjàóI:½Zæ©ÖáÑXá¯ç¸¤UeŸ4—7ÓrÁN”ÿ(|¾ãPÛv*7iL†ôæÝØëõDR5É	zxg˜¬Gm&îãÓ§¹¤·&e}‘á¢Þ‡nO™_e!3ì7(óÕY˜ZVƒUG¹g&Û±Xú®3xX§M:¥¢ŠôOP36€¤µ‡9iƒ@ÂXý¯Êˆæ6[ÙýÛQ×…<·ºƒÆ…ÇV¤­ó+*¡Ï&àK—R ÐºqOH’š/ÒLÌ…ð—²?´áÃ+«O‹~—O¬atöðY?hyb@˜@ßm.å¯]³¸iìbâ ¬9ãrì¸Nù´\ŠN;‰ü!i ’ìtÑ ó[Ó
R„ø|Öƒ"¼øä¼·ˆ•\¿†©‘ð¾°b´Z-³÷žŸ\¿yd\óCsÍ(ŸN‰Ù$åH™—‰ó÷ù&n+ub|üµHVÆ(¼í]Â¼M·•àÀÍœQÆfLé¦h¾îáiàÔŒ™†Ìbà·i†6©j9;×J£;ÑoãC´1W„6„Õ’Þ¬©1u.®] ‹SÜòA=zÙÙHÄbœÿ‘3ÆäVxß½¨Ûê;I¨…“»F´[¶·ðF]oâxc”Œm†¸Ê°°ìcDI7ÚCÓ² (Š¯Žð1Ç\¨¼Ò8j…<X¦ñ¬5’‘’%rP><ÑuY`Täbš"¸@}j·Í³Ì¸¬.0Ùf¹Ç…špjŒ’.ÉúôK›œôÕl1†Øe™WgÚ¨¸ÅÏ[.—ýÚÞjþÂ´œIQöïPo~jãØ',<È|¿9=G¿…m@Ã‰Än3ÄQ°ÛTVM%-•‚iÌcä¾: œiª§´¾‚V5ÛuâÆøÈÃ§·»Ùtiè×˜÷jTm¸pO
+à¾`hRVVÑS°o“pý~Ë¤d£Ì‹CkÂ”ä3¢§]ý¤·ÒùOåfZ| b3hàÛÙTü! âWÉ™~˜Âc)Ó¡õ>çLt ýýs]Í•Ÿ„9%ßa@ÙÂñ+o÷(²™Y*~)[ëC´‰_ %hx‹ýŽàÖ$¥‰+ôÐ -H×T¼wŽîsf,˜=ž{x•^6«cµ^þÂ¬€óÔî¿ÖÖ]«­“myÞš:t2‰š¾›?ÿµŽNw¾¥‚NXC#µRÐ‹E’kçð)nJd'ã7g¥ì§õ”}8ùwé™×¨È:·ˆ¾–óÉòÁy%´–Ò”]Õ¾˜\E­¼ÞwÝâ¤g 8d@Õ{e²IyÏ×J‘òVŠôY)lŒúY7D¥¹‘¡ O[7»FõÔRë'PêÙ¸\º
¿]è–(ÇÅEÞ‰s,ž—Òj©Ò­°¾H…ušJæ½<q"†r éx&‡h}á‰Ê2:N\cþ-,r: Íòé‘6õtRå ØI'üdÓ>©¼ãÆD­Ôª{\j$>]‘|Ô­i¤Ñ ,×ÊP†…cRlñX»1via	¨€ðA_F:RˆÂ¸Jq6ý³gŸcÉüìä× ÷úc”üù©f¯¼2HÉfp¨ÚÏ½Â[Uùž·ÏN¾¤Q{¤j}c—ÄÈ¨Xc½h‡6	¹‹GÛ—Å9\ã¾~aš>‹ž›–Æ¿/Î_pú)=T~îóOX(’–ÏAý±É}—D%šR‹”°²à‡Ÿ¢|&—þ¸Oª$j”GÈã4½× IÙùº´‹¯ú1¼ƒ	À²™¸ñþ½çÏ½Œ3˜âÁ µ‡­°›Ïÿ\^ærŽJs›ç®™Oî=’‚uonµo{i;
'iP·@,´î æsZG›"“J¿häÑÜœŽ”ó5f’”¢çŸèu¨1F(ÓpãÐKHÀ#ô&ºI“’Ñ5'1ßWUc¹Ù“ôÁ·£˜îbÒÔH1•”¶.AX­ÝÀÜ­—å¸žå,˜@(³ì]‹i…†<² .£ºåã„W ð·ZNu²gÔ­äy4l:‰4çÈ:#“j4²ØÔ"Ýoj…‰¬"ÅŒ²ñüÄNy7^É‘Û ÊÍðÑ`e¸Ç#g®)–X¼Ì$ÀÂµÖÌÃµ‚¹“»9°[^#'±0dN8Kz*¹!]²CWHa4»4SÊí·‡qì†£†šÃ´œŒW[ÌÕô
a™Ò/-ÖÊ*.Ó¬I±.A!šâeygUÎÌrÃÿò¿ Æ¨:ýÕp•	EGƒÊ¢é’×clÒ`µŸ‚‡@V~¬`¬y.Qø¬M&Â›i…dÓ¼ <M“üEÀ´ó²j¶Ü9!*ÑË¾E0³R© ýÿ²¿Šäíä‘&`EZ=u<?—3îè*ú’6kKùä)énUÛ¹”Y7Û:H‘ˆ%BF~%/Ä¦
Üý–2úž˜[ƒÁígJqú‹#ÝáaØ5¤
þ~ñr÷½Š¢'“‚òä/Ü,‡>b¿xsyú˜‰Öu$N`5ûðûrÂ£yäu×PH4 +Ë,xÃÜ4FWi«
aäïœD©= „±éµò êÐ¡I÷¥VÆÍì]’_JˆqÖä	°öˆH9^	Dî
TŽ\2ÏÓ7E•‹‹ãB«Y“:ŒìyS!¬š9ãÉ~…³tí>6ŠùãÛÖcÇ?O@hj:îqmKª” a§Òo]_£uìëT"_u5 Þ*'0ZÏ^6<ÈÏƒïÜÚÙ½ñ€Àüp)™Eù¯ÙœoðÏ½wÿúÖîwßÝÝºCžÝæ¤ñÐ9;ùIØ#°AÛlí|ÖqhÖ‰Á•A–éèGôa”Ò 
å«2µlÖˆÐ‘£æQvÊØöbï¼•Ø›TÝè{{ž2Ö\YÆ<—)–ZSŒx•µÁŒ^m?2âÜ #üÔH ¥AšÙÃ½V†=&n¹™ö±ÐÔë×ØñÛÿïWkŠÙÉGoÏÙl‰ÚªEKª´ºÍG ‡µ4 ´PS [¢ã¢kÑa-íD¨F”LvCE""C4p¨Qè-#‡Ù+î[…Èc¶tˆûBÅ2ŒT-Â§YG8éÍhf;»/?©€-øo]s†Ïm¬³QçdHq	ÎsDY S,ïT80ç…2¬øág¥·ç›ƒj	È?ý4`(3÷*sS²8`2dði†S†zXõŒ þ”Ÿ:ý4ì£'D~ÀÁbÐÒC”ŽNTYõ•åe·Ïk©ªP¥wðU™ÙžÅ*~ŠÝ©öu¨õcµL¡ìˆú¶ö>ËËBO“BUÁ$N>CEH™Ý‹X“«î†j±ËEE±KZþáRkqù¢nÙgWVÍ`ë„wÒºJ*×£†”Ôè+¤Å&¡h½°dþ÷ÞA·OŽî½sú÷ÐÎé÷·o*‰U_ùoZtR£Nr‰¤rÐ’ÝLzï†þQ}šRWBZ©ÍU•Èƒ6W¤uor[==‚Db+Ht:¹ïÙ©ÄX}‡Ì§k˜£dˆÙ¤”Eî÷ñßcQßGÑB¤DC?õèjòÖbÆ!i¬ŠUz™sÅàOV–Ô6ëszY~ãjÖû+@tŒM¿âýúu'uˆ+Î€òd®³uÝðn‘¶ vêçü!ÝP-µ&Hw}¡¿¢™µZÊ/Ù}J€C/u0‡™Ùxçìä3Ë|k¨(šÒÐG‚¼rÓ÷‡ÜËžþþ
‹W?M±@ô¬ÓÒÈzAÁÄ[k”'ÐuÛ´<~Ñ»0û¯N§îðOÑµ*pîÔÏi*•‹Þ«±Îñ©{ù[|sRùçt¦Óø‡Úl} +Qf»M6@I‘®ì‡Øí;n£át:ó îG]ø/ôMògf’˜G‹ssºÐöõ­†k¨4aÅô­ø'¿NªŠŠ%@¾¢¸‘rx»P‚]ÃÈ÷U =±*£ž+’&D-ïIÅ‚8òå˜ŽÈ—úSÎÁŒå¾¸ÎiùËè8ê{á]£Â,)ÄUN8”ƒæ2~+ËF²Û´dÆ5¥&w]‹ºGÚ@á
¯B…Ùh¹zløßà–XG¢ZueoímÛõ}§…ðá°Â*æd*™g)og¼K*@Ö‹MÉ&!LÉÿ>—ÎKTÌÁ½v…­L£Oj¯×öÌ:.eo1Ÿx$´³q×$-W®löúQ¢_fE	ö:Z%¶¸J’Yìx;Ü·]ƒÛ:VVn9E\õÌã:ß€Ù'|À\+EÍËæüm+OÏõ“q²'Æ…â>K²a¥¦Ü#Ín™Ž.\µøiJ)°
Â‡à3ÈDt’ÌŽ( uÅy°ž}a	þ*”¾+‹õ²ÿçé÷p§T±P¨äþ²Z   oÐ–¤:Èžã'ee¢
’^ñ˜kÎ‘V%¢ê‚0 Êr&ÛW–¡´ŸÄZQfE½e€•NO©´®Ë´PfÕQ´
ÀHÒ+Ë×µœ¿ß§û¬é& o_Âÿ¥ð_ÛÆð¾*8fE6ÁÄPYDèüÛa5‹æŠLMÔ 0Sƒråy}kWÛ³‹™G²ˆe(hŸ!`²Pÿù'˜ö•‚ß|AiºÈM €°2[dŽíC²l óQOs¿Fê	·Á›Ñ%.
OÑÀæËP¥Lo¤p iCI9Ù**É©jœ!ÍÇ ZË!}LÂXÏMÒ(hâ—|¿í¨ó5"-	¿3Èµú8/ÞÒk£ÊšÁÌXŒãUõÔº:«©i<¡ˆ½ÕÍÏ™<+b7$®qN€ŸšÛÌ!GÄ/Ìq&V†¼
ðúH¹i¨9Ñ*‘(OâÖ›FT‹l‰¤¢u·b®ÏÍO©“*#…³’‘]æLYf»£¼!„Ýy:û¸4nORÉ¦–^,ûoìæžiRK¸£èZSª º|“ú&MÈ“,3ÀÕcÝÖîŽR1€£'BÕR‹ýÚÃÊØŒ´ f;ýv´O Ž–gÝX°h<ãÒ²¤-Ò‰ž¯¼¦ËH ç´„’l¥ÿ†3œYz§8Ç•„­qgUÿ¥¼ž^á¤D1UWË3dàô×TŠL
ùÂ°H<À ¯¬é&¶:„É¹ÈÕ
ªŒ4E^Ì±×
8Z”ò¸“›TèETÙz;ŠÒR­&¬ ñ›¬j¬i¥MùÁÌrY6KÊªU­.Ô€"(-\¨“
^BAM7ÏN~y„Úg'ÿ,U+Õæ:­õÕÒO¦¢Šb9§¹…[ó †Z¹x–4M-, Jˆi¥UDãŒT–Üï%iKÛ°€ní¡9±‹Â(E^HÛ@AÔuçá›ÐÅ"r
†ü`Åxýý#ät»Dîƒ± ¡´i)•:j÷†× 8ƒ#¤
¸C…±‡~pç^
ý“7™Æ<K??V`[L#à°y™†ØôiýaÉ€ä[Bn¹BaÏ9ªµG˜í†²“ŠsA°p–í¾ôËú…ð°–¯ªy—ÏfÔÕúwò*ue”‰\˜Èò+sgßÅEŠ‰¬Éë{é#Zý^ÑŠÓ–R7øÊØAp^ná€àä^òSy™Á:ªÔI²ˆQ“S¦–ì£˜˜"ƒP7:uÍ¿AnZ‰•‹@SÄ…÷Hò9	×ˆŠš²ìÅ.Ì ‡lö6Þ%Y<³x¤u…nìSü–
‰®®o5å3«^Çì4ºËª’ï!Q`,ð˜"š÷˜|zAÕâñc}!Coœ>éW¦B"ÔFÅî¨ÌMŠ	Ž„¢nAb=Ôâ%xrÚÙ§d„gÏðç)d`|FÓ àQ2á´Î¥fÊ0ôÀÅB, -uÔPÜ>w<÷?Òv"ÈÃøq@{+` hJ	¬wDêËÿgGH™# xûÔÇÑ¡0bu8U_C½KíRZðc–³’³°\ºÕÅ2)1h'[h'x¿ÎÕÁœª˜›Û2©³kwo‘óÐüâ!	ƒ4D8ä“õ·ñ±@ø¬jñRü'm“¥ÈÿkCÿ:ž Ô¥Ó“è‹)Œ+v’þ²
OÜ«´¬ñé—ŽzUŽi2¥v=“3Ä=è"j-«9®i-ir©8ƒÈßËºˆu¾½JëN×|Ë÷-–¡®—@¸F—Á“æ[xëâ$C²waž{å|Gå|êÐçIŸ(É‰‹5º®ÍÈU0Š{')dez4àBÜ+}·´VÛ}ÀGÅ–*Îðé•Fòg™K%ó¨M­'Ã }1SæSv¾8G=+Š3I)ŽÔt²C˜Nv¨c"FYe„kŽéP’ÕBrYªn¶’ÛÙ")cÆ´R¨Æ…¹ "j¹cQˆµHûhYÚâòQ@U$wðrK6Ø?XZÄd‰wŽx©0„ç>aâ¥C!‘Zï.ño€°½fð
ÒóJ—|G@O•Ò£òAY­–òVì·ÔÏÂkMbŠ1—ñìäcÆ¬Ã$QÜDõ1CVœbFuoë‰ãù$L°xKq˜òpX¥fl¼ŠµŠ¥KÍ±Â0Z¨RCB[‚Ê90Vñ#ÜDÿò/ÿ“S\€f½o5‘TÅæŽ!ê1ÿ¸æV8t¤TØ¥ËKÒIUÙLÑšÁ*„Tõ-ÓðNT˜â·†XÌA3`”eF`º‚h
-É0Jû˜†éç^’;oÕ ¹:3…\»ÇÊ…ò¥ÂCÇ¨œd!XÇTJnK‘ÐŽ³ðŒ_Ãq9Ó›`n)¨¥€…ñ¾ãA7Ä|4U™Cõ<Ò*
¸1C«ûå]:FVñƒ(Å¼v»sP:ñòzŠV€#éº(sÔÖÚyW‰@d¬Àäª/ícR‹ßñÕ&Þ&°è·°-Š “Jõûl&'>ð…v^Á#ÑXñ‡K«4¢EgÔßúó¢€81XyÉõ¢¸¹Ö¨ÃŸèukˆ‹5¸ádx¡T—û"ÁË³Ç¬r·VQ5½œ&„p¢sòA„5îl×ï:íd‚}ž;­È´ ´
Î¾ˆÞ5ÛOÄlµFPGEÇ—-$W3óZ©T6pÎŒ­¥ÏM4“³Û’û‡c§ú6ÖÐLÉ^Ï%G Ïõ-oj*çö}cD„²N4PØ3Æ;_<©ubÏU÷õ%7ö5IŽ	yµ)îô^æ€ÑP\V´+Ýn}ˆU:˜’(ž{Ýhq8è¾Þ´È^ &-Pî¯<1
¸puhò=25¯MBªÉëKdô5©ÑÜØñ»¯<=>ÿøìä§¬ºI
ÄY‡!:û®K Ú'#IS&°äm3Ç øîx§Ra'ó-+S@3P´ »vÐ\•çþ‘ç«…Í5:«Xó\]‘J§Ózúrd\12å=ÕÚçLK›§¸“Þ|QF”fj£KÔhSs“ú\·Æ¹0ÿ$˜”fÇš.u¿Õ´_H^@ãæ&NÀÑ‚*l%•›+Í¶ÌÿQ ‡-,³GE+Ùj§I5óJ"‘,…>F";3uÜ4B¶^³ºƒ@X¥Ru6àûúúlRŒ‡O\Ù«6½â…1O=Q†ÃWé=µÇˆRXàÆµ¿áÿÊõk´¦8…nQé…Ó¤PÄ3¸Á98åÈ0uŽ<_â.bˆù¹ÉK|h
¼·&0àMj¤--o,-š­V¥Ç–W7–Wk?¶Š{[­Ý[Ù’8“õÒi\ƒž*É•ˆ)2²ˆSpîFmÏwÑûž{°†ài¹õ®»AêaÁ$£Hx#Ñåó<¶Mü^e	t/"Áû@]’àÁm,Î£J£s´än[ç¦àŽÞºÞÞºŠ¸ØÂ†—|›x1hÞFL]¾Èè AcyEžà•¨üïaÖ$ö0Û¦·áç òw^&…û³•Fw¢7ÞÆŒN9¨?€¿Ûl¹ðí¦ø5¾TVúbxÅÒ]/¥•‹ðhà®<’rl¢ÇFÕû¹ú0ÙëÉo o%5v9tðYúÊ’<ŸkÍB¬r´kdF©Z¿•ŠÅ¸/ÊM"¨åûx-Ýúd_hwâhÇ€•HbÐNA?Å[L’NZrbv‡”X	î±ˆ±XLC;w*ë´X„ªÑ–^Øñ‡]7iÀ{ÎM5ËKaå€Ûyi`€ËäQ¡bðÂÒâh§H`ÍX4`Ð«ºQË œS·àªF(;äiD+ç-ÙVw” ‘/<fß.•´yÔ?Âî-lY”šb¹Îq¦¹ˆ¡cng~âÇ™rnŠ!‡¨¸F"°À@@hˆ/¼o¦~jón—%ÃeÆ”ã/ª±¬|¬ëê"-œ ÂÄ†‘•*¡iîë³›¬vAcñî–Å¨44éøŠÐò¶`ãËè*£{.ZÑ…Ïˆ$"I"¡È˜@)œ(>†Â¤¿2ºiM“ŠŒ7ß2±…aY¦ïY!µ{YxVÌ,ë6I‹º’#j‰Q-ùërNOþ^^ÔÒlÅtlYæé3ß’ÍømiØàr$ˆ²“L`^‰w£pSXÔp?‡9¤UpíêÚæo1õi,i Dâÿ08ÂgeÆ,ˆòÑÉæx0Œ>G¦ÙßÜ,gŸœß4	…‚N¿T«’‰ïjYBlZK`SfÞP®ñrÎòsvQÃy§ïvöÛÑ¡¶mf¢Z//1^èò³šÁ,1
amæþa¨ÍcRÌ‹^1—™êòÂ ¹],Œ£‚¿°—FÝÄîèüa«Õ‚ßçÿ‘¡½Œ°Ö½ÃÿÌçöÂ?ß Ç4žK»ÁïÑ† —3Ø¦ô^=¬„N¶œÕëÅz×ÅÂìŸ(ËKQ8zÝB…PB.IK™”QîÅZ&ømH‰<§ËE[`Ôj—c+%Ó0 9å@–Š\ñ)f«ž@·éï‰&PÐW’ŒcÎ¶´¯=Ó×ÞòRˆC(‚P­ÚgC)UPK®>+çÈa.c#¦½ªç¼e]V‹wÉ¤Ò§”%fÙƒVò“Ï4“’JuÁêL
B÷û$ËžäåOA²˜,C+fÕÚÌZfÚÒ9ÀxÞoPR`ßê‹­QTT6<þ—Ùþ&ådå¢ÍìD¡¨Åib¿ïx£²#-;öLžy…Ü¦¶ÝÿóoŸþÇ¬Ÿ¶d|¯Ät’˜Ê¢`ù´§4·tŠ‰d¦ÿ1‚dñ«×Ž
ÏFó«2ß»}2Û=Ïá1µ&šìâ¼IÜÀ“S³à£Éæ·ì£Y8Â×ìÜ”ç{Ä»ÅlÔ·ºëS.®œ[AV.åº·hóÛ”ŸÉP…ìA #¿p2\%0{|žZ®¦yó0_Þ9—³ÃM­¥Øh±`SV5Ô@_nØ-rÍ”¹ýô|2IvpjbƒX£ƒÈñAL™ìÕbªÊ†~3pBo0¤fZôÃ)`†Q–Bº(¦@ifNáF{žº¢ùR$i™³î?6H@FÌ:çl…˜MnH²Ó\RçÎÙÉ±ÜžàÍHäÙ>íd›h7.”¿¼'‡c$z.WD5Øð8·OýšN¶T—5eÃeOÝ|¤tNßìCÞ%.ÜÍÁ¶±ÎúáRî€­.°¥ä³m¡*Øh'ë;>(›‰ŽÔI*ñói%UÀOú§°oã@³*õÚÒQž‹”j)ˆ|ú–ÄEô"iŽàiS´¹l¤"{LZÖÍFÈó´ÛÛRêtZƒJíi4Gûª {•á¿ÌÄX‹¥„ÈÃÁ7À¼b$L^R…Š“R% ~IÍ†$mDÑ±¾VXõ•: .
§V‘Ã¶'!Û•ˆ÷ÜoQÌ FM¿E¡ô
ÂïgÃ?„‚ltxÈ¯Iª¿ï±ËK¸ÇKül-¥C³EÎdÂJ’ûÌÆí¬Œ¤Ò¤ óq`m<É ú_êŸÌú™Òi ÇÌÆÍÓÏŽÀê${ç'€KzòSäŸü¨“AŸPlÒôìä× G
ø{0Ô}ïìÙŸc©Ÿ1+EHw«>åëº›ì§Ñ ‰&Å%-³¾²Xè »FÃ£s„ïC
r®ˆ
×VÎ¶©›}I»ßòÁüHÙé 	ý¯¢‰k·Ä$¬ª\óÃ‹ÄÆ0€ºtßP›4ôýë9É9n}×Iû-<
Ezç<Z^%«eþz$Mz½þvCL?~Û"†¿†ó{bOüCK—ÿ¹{Ù-Ë–ëÅ’:Ú-³ªÈîäKmÙUW?¿‘@ª0zÝ=ýìåEêzùÃ"QíÓ§ èE/{<FG÷Ëž®’êM„ùéýëån›ÇxàMý/{hÜºBî3lÍ¾aiïiÇjhæ²á\3ÕÚ-âûéJ‡¿Z™hp}e³ÑŠ—;#®×++®óÊLƒËt6—ÿrˆ]ª\5ÒÕàš©&œ]Ð°âÅ‰BÿÀ*;,Ã'X4¤§ÁeLQÃ4>#ä¤™dø	ÝK“!Ùn»¾/$õZ«G¤K	®Új\SQ•HCÓ‹)†k,=®It¸¦_W-ÍÆ8Š)Ä“AYÝgÔ„à2:UóÓ¶Ã„qºeŽaŠ³Ûš¶ð·–ÉvñOyéyctqG²'±ep
?†š)–Ù5d4–é›E Uª¬{²«1Þ+(‘¯*ã¯1›–Ù8‘ÐpKì¥Œ[Ë¹+ÇŒA™ç·Ê§ùI|¸y%ä]Î¤7}
®ÚÙ~äMló¤à²<0ÇÊü#ƒQgÿ­.VBâJÉç8³ãä ’÷9·Éf> ©&'pUL	äæ¾H	<ßÉŸjf yÝ©/Œ%‡³ºMO^¸ü1¶Ü0VRX…•âÀ*­EŒZ)ûµÁ”¶_M„Ò§ì/—Âw!bÒ¬ý—›·_ÿáÅmT	qÏok©ÂeÎœx¥÷´ S˜³a²–jåû]æq‚HŒ³„Äƒ.:hîyviPdÖiúàIÏF:—'ÚZ—~øšî¡Z	l6:nh'˜’C´Éˆ¶6n" 5ÙWB"E¼Ë"CÑZ›rB"±õ¼Ye8¾òRUNÿuÄ™	òÐVH6MVZÊ”f¬G/Û¤¶Ì­Ç·¥Œ“Aözrp‡w¬mÚ!ÉLÒÍ´^ þThý"Í³5AV½s›Fÿß¦Á8u#¥™ì‹jõMˆzgåfá­¤³¡ð2f;cÚ/o©Jƒ‹ÓŠHí"P±`âø^gfãZž-l;d¸‚)KaYXÄxGŸª()Sh§ê['àp©½~”¤–Î@šÜàu¢°¾÷RXšƒqðË¥©~^èäv.Ç’„È®ìPÌ§Š[*)¤2ö1òAŽ3eÒË’MIó/X”E~#iÁ.‘^õ2³l™b-¢†k,Â†«6qÃU‹À-Rë’8\ÓË4dWVû´”+È§ØŽÎÞ¢,Ï`¬C´¤ëtÅìþ¯yi3§JX5ÓÙ•‘ÕvFN	3H³OS1J¼jÐ”$·ñ|)Ê”ØH/Sz#½&/"ã©GßcR÷´]‹²•ùãQöùd5²‹Ž†\¨<UËnhÖ4)K¬GØuÈú\Œ=7jb…É°ôUè•_N˜bIh3>Qmˆü¬·\]9®“Ÿ9¢ü¸‰—ò&Ï?ý2ëw*I˜Y[–žßW$!S1š—”–i=…–Úf;kŠX"þ³d_jJídåtÄ/éWÕÄO„¡’Þ“¼5îÈ:Ýê¤CÇGÛø0…œÓRÆé:÷h^šˆ<!¸ç`ÞåÒ.á{½'.´K³È£³2ÞUR· ­KÈï­®ÎQî½Ú
~ßßÚÂM¨FMž„iâZ¸úT9>Ï~Í·>D˜ç!y.MÐ•²˜J.osèÅN×Ã“ÞL£fŒöâ(àÔ°E„?Åê¿O$ZòOÁsÖ‹¢M‚]¨ÝT•u´î ø¸šŠè¥Fô­ŠWàe"]qì†]/ì½7¹.„­VPvt•#µyÜ0I» UX¬±<é
­TH“RêãR£:˜ÛbûÝ²¤y{PŽŒìº›tb–“#ë­–=Î Àü²ÿ"Âøy¦ìø£¬°e>FÂªÜøÙŸèx¹Nå|‹¯¦¸¤ ÛsJê'!w†íÀK¯Ž¨ä»Õíƒ:®Ó’	ºkeÜgu´Ü*âŽÓv}Ù™)õÊ­j
Vá›IëÚþmà®MB×úŽ¡L!½²šwˆÙtîBøÚD¥OZÉÀ÷ÒÆlsvîáâ#´aB¦¶£ð}h=Ï©À}YfUdÉmÄïœ¢«åÁ€îJ]ÓÐ=@×ñ*4ææÑ,x)šeÎF =<œGÁ#hŸöÄ½¤¹…ÄM·Åa5_áw<n^ÇM’Œ¢]àÝØëõ”€Õà;,sÛXþ³ÖÉŠxï=ÿ(°—×„ñY¾T‚’]£‡Ë‹Ëçþ¹J~^"?ß"?/?"9”G@lVŽ#Ú9xÄhnÛÑ1ÛG­4ÚI¡êAcîxÁÞn¶pYxŒj¼9»ù¥mý¥¯ÎÖ?šîÆ?‚m»ÿ+»ñwû§OÃÞ+°õ·âØ9j„Ý!jaYCKËèx5>œG¡´†‡¾‰–æ¸íÛ8Ý(Û×XÆ³8›eZcs‰ çÁñ„}å9Ä$Ðc¯†LU’mÄªëžãG=ÜðêÈKX%p˜.,3ÓoÁqŒÙüÏ¸Þð·4w„ÞÉvkè€zMÍ¤WGi<thLxƒ™xãy"
ª±Äõ	ØW À÷"Ò31o{©ø¨\bˆÙðhM²ä¾»—òå…z±ë†„ø÷V%æÙeàQÆ0¸JB±UœT£a5L¡6àd¦bÈŸƒëKyVY¶YªÛ2²ËÞ|Y-¬ý	zƒÂ’,™×‘ªáˆû6&7i÷bQ¦ÌÎÌPiÕ6QöŽ¢¡<+àJ?Xšá`j¼äÔŠ»rmÚ'ýæå]k¥ór7X×ÒÏ‚<ès$4fÖl–ýbY8ˆp’±^RM‘”)¬63;‘,"º¨4ièQ‘DB•¦°~–¼$xàù‡_ŒÙ¢¤¦IíÁÕÛÜ“p.‚oÖf™Ãÿù,¾±ÆX&éé8¾›+½èù'5æ·ÎzÔ˜`ë[mcEknC{ßiÞüŽëÄ¾ätªs‘éÔ˜†;g'¿thºF«Õªvl=£f¡ãx®a°[—s\“‰×ãœÖÂjŒU»%ÃJ!‘Xú³(û+«O¡$XËþÆÌ…dzcI†$–dÊ3çhãüoæˆ:(‰Û«y	ÚÍÂEgcÂÈfCêÒz‡&‘®¤â¨ÄëeW®ŒÖ(Þáu}Lj.Ý>ý£aqÓ`=icx®,Þäº¡yä;‹š“oIÙ$i)T}ý” Åü &EÄŸ¸¨‡©z0.gqÚIäSj‹U§44—–Q&ÓxD>È"¬ÊbmñŒ§I”äæö[“ªÖ¯»m¼a;n÷À|Y¢F©¸êfˆ®óÄEöÉ
ãï0´Äñâ6¼UC¤´8,ååˆ%eW8C¯k²Ð›Â¤`7´ÌÂ×ÎÌ?°ÒuÁÄ7½VóñiE#±¡Ç¿d—©±ŠF/X… nŽŒ>OúŠsâˆÚ’ðº¤QÐÄ[4òý¶çáËöžUÑ,Ê.‹¯{;ŠÁŸ[å
èL+ƒn›Ô¬V³ÐÝ­n§°x´ý±òJlQÛ$˜mñÎ7@Šî3¥¸Á+È5šÑØH{ŽŸ¸–Y¿	Ð’3›%dµäsacmˆ¨;¤À¨„mË Ô@I"Ðûå(™¯fyöáù›hVŒ»‘•–î¶Œ&‡O€…åÅYûŽÖHG4î©Â^ë-ß5ý"óüžø7?–Õì+áÌ[l­ÎÚÁ4S—D¾5z*„Äö(9v§°ðåõÌŽ"2ï³Ù"ó^è±_ÉëY*}U6XÏq”Ï‡°®åIÚ:
¿D„øjRÛ­)ÇYì÷e}¤œe/2µ57§Ö1~õ/ZÙj•ôð–T k,5ay;p7^è_|ãWÞN\êC¨½$ óT«Ç"Âz¨ìF ¥X×TÒý‚ž›QPç!‘•-x˜Å+IÏaÃlKìkÛìßKJY‹xä}üÙÒ/Õñi‘&_¬à\|"ÓœÝm/îˆæ¡éLñwS¼èÉÃTr«#Z‡¦5söÜ8v{`¡Ê¡ƒ_]GP öu*“Aä¤WIé•‰=GÕ*Šàš$­ØÖï	‘è¬ä{í	—W™*ÆX©Kkj¾,ÝôÌl<ÿ¤>½l‡×úBÛ2çÒifa`©“Ð˜±l7*r³ÝÀAvõ	ª-
BÏAs	Rüð!µÐ”Nˆmí=É d¥Ë¨/f¯Ôˆ>™@?b3h/Ò¬þ+lçx)ÍMâît(9Š¸4Ä474ó™ˆ}Ü-35ïCÉ¬ XõŒ3°;Í­ÈÏi‘)8éôÁœôÖ1ã9µ_*>®ÇiAÕl¼*†PU[ËØ
>œÐà{/D{N—üŸ Öþ¥IrïÀå²\˜øVŒµ)mì®YÔyí©†îÑ†3	·¬•„H“›ÖFZÚv2 ñôN§ãR'ì¸ î—‡IÄþE«±bñ¶˜MÇ&jÐ>²O¸&ú‚U\³k7†rQ!>®ù–…Q3{c‹Ú/­J"!P¡ÚF&eù¢AÛRØ›”ýO;¬p½¿R5RÉ<ì¾ë€1‹
`ÿ&A©ÆR|ÅÞ"iÆ WàÔ¶“B
Ö”×	û),d›µÌ$µpêëÈ	ÕCW‡¨Yþ˜Uª£¿üÃ/Ðˆ1¨:ðìðRV¶ýq­ŒÈ³Ý#åJ	#Æó6CÛ$•Á°¬\2êÏ`ÆÄî\Go±Yu‹ò­3JïÀŒµyžk<o{‡n·±4wü?,gÝ¿VásƒVi®–Ë&e‡¶»¤`<‹5h¬GB‘,?òµ7±œúƒ”kñæì%S‰„^U˜KB{MtÐ{îzòyoì|±ë—“¦¦»îÛ§¿yñ©7ÞK¹ˆë½0*„£u|e–¾1eAÄ™(’Äl_ÑøkE¶ìfs’ÌÍäÚ•w%âï¸&æ2,TØ¢E,BµÞÇª­laëd¬å»”¡z2k.Ÿj^FZµ4Bò=hjÃÖºCpéìÓÎðìäï\bžkÉô¶H³J†#uèÕî·%ñýjòBµ}ÈD§dÙ×5ûÊº"¹ÚXº)‚®×ÃZzÖü.Ë£´V•@ùº_1T!Éò8rðóUz0ã·Ÿ©ñbÇöXž5fÖ;|êÆ¸Úê{.OØVÏ±g£¶qä×ÓßØ6f~òSÑZ‡~#WÞ4é@Sx¯Îaž„œ«…1P°é—3dÄz¬%9ó2[ŸŽE\ˆ½ˆ\|¨5£aÊÙ2/èÔI“)QgìBæàJÒ#€!|ºvÂã£»NÚo^ØÈz‡1a%ò±m8¦%ø4kçéïÐZE!cIý^ÚþÕ,EÅHê TA¢5WaT$hò)¿	en-’­­c§fS+¼™«	kjÛ°8§JÄfÒ	Ò¸êò˜@ÓØäÀ
a”U+Š¢6yW,e“êjßZÿ›Ž ›Z Q¨üa¥ó€U—Ù¸GñßÒ³“Ÿ`ý/‡Û>;ù—{ï ëg'ÿë…æ¤%-¨C~ÇCŸ³?íÉÀA¬é\nìA¥”µ•µÝþh·!Iô]N63oã®ÚQ´¶º	jàeú)^¶îÙÉÃ9;ò é9Y&t#˜¶ûÍ+b1Jb÷uð†Ë²W¨Ì~oÇÇ·½´¿“4öÚxlsÇ\ª
ï£7’þéÄMßÎnžî~‘+òNõ|÷^`5y‡{àõ]—¿süè^•ïâáÕX“¿Ëo}W$K3M½ð]“Vdñ™l»&÷óÛÏmMPSlDæœxyn“˜Wse¢´ï’˜1Ûµy—{`º«S¬‰¢TÄX.³¼oÊnZÒZt‰Uo7“ãèŠk¹f£aËûl>
Q†¬O9jÐµÊDôM”ýÍ6^ñ	cÅ'Å1V|VÅ\}ˆótL"µê=€¸~íôi„:ðƒ8ò†è;Ã³gŸ¡»·wÑväûÎ ñÚX°Ø¡1’%@v¡«rÜ¢L¦ÅÞŠ‰CH¸Õi–ÆìV>Iõÿ  ÿÿì}ÿoGvç¿R&|Ëa¬™!)Q–Š‚DÉ¶`Ië)Ç9­±nÎ4g:œéw÷ˆâr	dá‚\œ ¸AìÕ‹|1vß!X›ü@Áÿï/¹z¯ª»«ª«ª«‡3$%k+s¦««««^½z_?ÏfôSRS!å´í=ØåÅo%âW«¥¯lâ©æ*q.ñ·ßÕâÍiRœl›ð]Â`‘2jž–ºŠjýèšµ-/î¹á›åáp£ñ€UÆfê3Sõ©÷x–Eš 7ÉÚFßG¡Š/¼PJ_€¬æ·Ü‰öB·›l&íªâsÊ«ªµh’á‹ðDýQ³´èŒc2¥àË‘(Ê.ú€4Ì Û®* <¬¾`#ã|WÜ¬ðôD	»^,SÊå@°\n© ,+ŒÈ¶ú'Gÿ^@Òíl?8Ø'd-ÝôŸ
_fë—éfÕ•‰™+’Š­û•ÂÞñ×ûuü§LÒt4H³“JÏNVëK+·:v”Aøî¦^ÊJxëìS¸>?Ý4üVŠ,¼…ÏXpìvš–t‹hª¨Ã´)DFBLXk¸zÎ‹<_~‰&ÎÞ»§'OÞÉ NG7K|Ïé|¸§=¸rmî¾ïu™ œ±?üþäèyÇý°p¦HQwh>JT­ ·Øi”z˜°ÄöœŒ	[µ:u@²w¡Ðs¦½Í“£¯å½üêø9@z¨÷—o(OOyúx_¦M}µ;~Ý(°Óÿá÷ýw¼rôEÈ	¾¡C=ŽCJ‰Oýx”øx‚®_7ZDnø†ù§’%Î†7.º{j°£SSäÐOÓþX%F†Ÿ¹Ëb÷?|ù¥›‡u^ôi ?OÒM‚(|ä?õCWU¦õÖìûµ#àûÇ$ÝèÕ:ÛëÓ"¯X^ðlk¬p¾?ò½ò#kf¦´?Vû™@wŸQV;`í,å˜m:þ$§¦Znêý~@)áøE%­s×‘U÷‘î!-é LŒµÛÄ‚}!P_C*üZ™Bªêìš®ò¢SlS&XãuN6±g…ÛYÙ¦«b5(öÓ»ü²xÒa7û‹]W¼w=ÍaäÐ'Í%È5#Ý ÊÜÝo©ù–T7MxæCÆ”ŽÀ -lœ²ÛÌµ6œT†ket¨«lí G„8o%è‘ýŒ•{À9ÓˆuzMfùÖ
<ï¯©ä’MÆª%rtml<a„‡ !‚$mÒEìÐm"¸ÌÀRlœí±aÏù¥{qYý]¿lÉ'š®¤±KArChµ¡xoG{V§¹¥R¸q	‹š×÷éÂwú áþ¥Þ´µ°€Z{](Ðè¥¬‚ôÏ45qÕ œj[[žƒFÜê„‹£v:Ùâ2‰ÅÇ«uÝUyëJôÕ*Î—¿ ®;´6’ kå²QR\™“|•Jö±”§ &*ßvïPÞ›ú˜Of‹÷(¸uÆ¬á–{ÝD3÷`•6¶b/é+€Ä,u•rõ%äêŸïe† ,¦Ñ0äÐ\ÀÆÎí±Ee‡‚xÜ³\úËÉ–òÖ`Pc5A™ÊÞP¹væ¦§Gã”—’rŸoS`Ï'^.§Ð
¨Œ™(¬Yl±³f^­*ÐÀZ=Šöì;"ëJžÉ'+7Èâ7·¶ÖÚy{k(ÏDü³bDWr@•R¸)L:íôýÎîvô¬^½ÓY­TZ‹Ï«àmÒF¡Ó%}_·m›ìSùß¹4D°C
€sÁ±¨„PR‚¿PƒŠkt`(0áTÍáøªQMüà'Ÿº=¦²MecUÈœÛ^±?
›Áú,1^k'QÜEJyJØãŠ&êÑN¶åPN˜iñ¶	±œ£ØŠõS äÉ*™çOó—(÷Y€ë*V-zI<oôWò–ìº—tæ¬„})Áíx¤õÂã&»Ã+‘6Ù‚Fk·b*Z?•CLŒ"G»šj*-&NdõJRŽ€‚m£±Ù+HA{æñÏ M…»}/xCGÆO}:Ê1DlTT4ziHŒB•Ôà×‡Œ
h.rþÅ°-läÄ[\(ZÊL<~Øu¤+ô…§”-ý*|HIO-Õùp’Ú+ÂÕŸ×þË©P?×XGå¼Œšý
®‹©LÅÜúVß‹HJg×©GÞÈ¢¶
Ý˜Õ_6¬ÛQwßü(f’°¼[‹AÛ3FÒhD]Uµeßß¿sçüÕi?¾;ô‚îøÖ´¼­ìq+¡lÉo,^"+‹Öv W5:—HÐ}¶PU»0·°Š„ ‰Šh4ª*„Á˜²©êlF†£‹´/3™*œQöÌP¶ñsÖTD˜1çÖè’wÈÒ!_tèÑþäÓ˜Äq;¸§-Ø¦dm°ØäEvÁë™È¨p:³‚V¿ÏŽæ'­Vþ¾„¶7¥¿¦uÁú|<ä9ƒ ˜uÊ!ºä-°ß8›:\¬NÅ-\õŽ„]U6Üy˜ëlQÍ%ÅR|*ØXkËu”Úr±¶œs¹×ÊpXy"¯Õk`uêÖÀr
¤pœyçÅ	ëhJM¾kÑO,®‘{Á¨ƒÄÛñßc@‘2Ç~DäÇù…¢~ÓÌ§KäŠ(6• «ÞŠ6‡äwÆ<˜y—Uø¬‚<›ð§k2¡’ý2XQ›ÓÇÙ	/‹v˜^œÝÝIú®ä“¡í:6,Ã
Ì¼Yž&ÏiO1dF6?ŒMmç°Å7áE-ôïškó¬6ßi_ÐaU—„àÛ‡cÐÚŒLòú%Ú, Z£„¼}•%u3/ºèd_!¹Åd}kyç%wÔîƒ†ó ±ËB½ò Ž¥ÎŠŠ\8t§50HÆ[¸(ÂŽ® ä« (Æiéé ø[28¬¤1Ød©„†Ád^?ÅI,5”Þ+ô2!yÑ	yÆØ±1Hœ=ìà•ˆKÔ*r o–8V"ªQØqb¬Ù³l¬QäèÍhÂØvyÆåÜ·Í¬oÈÜ3šu1¢4íBÌN»fB:D ¸™×XBi: ìs”2žjÄE©¿è|eŠüšZ«ê°® «]GaËKyX·†ãJ:Ùu@Œ)F›dHL‘-.øÀÉŠÆ‡9ÑöÍ–}Xµúàƒ)@¿&U>µ©Ñ…BÅôÞ$Úß[Éh¤*-´bÇo,äfáå…ÖŸGAØ˜oÏ£5Hšò~åË¤tÏ­Ûù9¥8úRRÌä4¨G	YA"+’«¤0GRY¾asÁ–µZñzS®{à0áN}Q8ˆÇÖs5›×LÜ…™7Ýˆ®ÊN9åAl‘ö3au³±éŒ;Ž¹mÜ˜#“åÕ2ÙdiEwå^f‘†Ùa¥UÀ,HÙÚ…1Lˆ^(/ð&s2Y`Ï7<àÅŽ§«CÑÓ‘>ÄV£Ä=  ïŽ¼³ õ€²¼¹ÂìÒëÓAÎ©´»—Ñož&6§Fn¸úqa¦ÄÇ# d‚)AÇ×%rP§Š3œ¬’‘GOÎ÷‘—–Mœô`Åd¾Fûg­vï=F˜¨~©Î“€¦W‰²Ý;8tt?ÁGÞ«÷ºp<8ßè|ög”k>@:Ý^óJ:a•™JûSÚRÒÌY©øä,§Á]Tp:â±Ë‹ÃŠàžªOóp±Â„ZZQÆ~:òÃÎ“IotèYU!,ÂŒ†Š1vüÏcˆÍûíØ‚ì^°•èÐ]N%bV^ôM$®NQ½Ì²¼Î „¹ KFôæRµ~Êý¬Ÿå‹4'f"¦}oŸÛoj?ÓU8|E'º¨£3ñÁYâuß0éùÂÉ†à`ËŒ w‰â¥ ÎÏæð‚'.Ÿ=Iœ.žIxî´I‹;²¸Höä‚–k FST›Ð9Ù²Ô_˜i—'tRÓÏF-®ŽÁ¤O²<J“ëY‰í’¬(+fÑ`sä…7,ä&YZ¢'ñÒâaIãQˆ£ýæÒr)êpƒ!¹pK¿#vfKÙìÓ›G3ÂIeëšhŸe6yïEQ*cˆô…)5³¼B¡·Z´f³’+t!¯”×‘EJÈ•2LAÖrýŒ¢ØúêÌB6D)TtTY„Ò«÷©,BuÊî˜ª”¯C…¡Î8Ž‘ÓÒoäÒ€ï™OÍ…KdQW1c¹g6S…uÍÙq_k’J¡0iE¬ˆmÞ*+œQÉUv£§{Bw¸ÊÒ¹Af2]Õ’–0xvÝh‰»ú©u,½>œA$öÓq‚¥ÐuàYEÕ¼?|‡¶8µ<R¦ºCþp§Zñ,,IB2~½ZQøõj¹ð+üä(de­äTQq>öª«ìYì¿ìÄ¹|¸>Å³œ·a'¬©™áuø½º»NMTñSY¦”†‡ƒJò'W Æ3º»³t?ììÚT©c´&ÜÍ½sÃ]z,æ7I:‡	éÀCìèSéä.æuBÏ ÖçMx¡×£2OiêGKnð8B’	JX¼¤|•ë-´AöW¹Ø(hüOùjjlNYà«æR¹.3Ý8àèZ<ˆºpþG{.ha'ù7][Èo‚VðßòuðlÜ8€õ×>Š£ ,iÂ—rË¾—|äÇÃ  	˜á«Úºõªô[Xån9RoŒKÑS=áæE•¨»ãuñ¿É À?š;q4¤¢5Õ1‡Í+E±ïV2gY•ªUªÏ­'ø2_€WÜôé1Öõâ}zOƒ>‘Š^1¼1–ôN´¥Ç¬ÉdØ]ÍÅèßÖJ\¬Fo^)ZÄ­[6Wè­Â:sJ¢6´^{R]É±GW¯Oÿ_²Otn+.ZÿrIÄªìµ£Ù_Œ;ßë~$s‚”ÙÃBÌCnˆ»°Öî_6ŽÀå§t
}o˜6—Ì5¬©ö„@lÛ0š@0
½8fz1€ÈÓã¯%­™WÐÝìû~jD´ ò™&ÍÑE­¼•ê¿‰Õñöš;IÖ¶Às)~Wv1îý0ÝoÓ½Ü˜gyáfWµy>z®÷©
.Ë°¤HLæªt2F¦m€ÎØÛf¥"–^€1#þyé&™Ïw½¸§Þw·ð¶¾²ˆøBIì<PX¤eS_‡†Ôã.B.±ùùØ‹U ±¬F˜ÅÄ˜U_·‡ú·mØ g@“¬üf3MúŠS¦ô*Ó¡Ï¡%/$ÂQ¶9Š!B^¸>‘¾üÊÇöÈöÉÑßK¼º6¥x¸‰ƒXØŠÉŒ¹FeSDEÓŽoéáS-³V›cJœyÓâ›©½MŒæÏu¥ác—ácW°‡0ø|ìo±vÂ}ku>±ß£û’6ãè[yùbÐ–Â}ë ô·Ä[Ô_ÌsðÀÝÈRm­o†‹¿#ÁdÅqƒn˜%/fßõ÷Påðïúàs|@wqÿÆAé'ýL“{6ø”ý»qÅ™~'ÿê2ZT‡Œ?š(òÞ¶£4÷úßõ}Ðóâž¡ã%ûh„†L«E·”öråØVµ°­Zé¶Í³µÓ]Ó÷µ=ˆ:»`cÀÿêÚh¸3=„ÝX¦tÞ§®´®p´­ðl©45 ·S5†žßÍ4jÆ5Þ<¯ˆÐß8ŒÐ¯–*Èò†6ÿÒ”õR,sV‘FÅ£ªàñwº¾²hp*+:”U8ÙWTeµfMgQ‰“ôLˆ˜É…‚j¹VJ|´•¯—ÕÒL\LüaPJF£ÂXûÚ"SMYÔõò³*ðˆèk sï+pòX#¼xü¤×=µÏà÷ ñ_Ë®^I¥Å`ùw»ô‡4ŸQð:9ú­G{~ñMØ"M³D~B–Éàøk:©Ä‚ÁóÅ» |N{îÿÚ’ŠýK¤w]Æ‡ÿ#mÀ½ÐåókAlY×À¹_`¼±ž­û^’² ÚnÝr×7Ý¦;¤G#`±bâk€ã#V¼†*—EÞ°• ‘`§‰©4°ÿñ[†]lßdªg4ö©Ì<åå¥û´ë=‡Â9¥nòíHGâm'Ñ`Lµ „ó&ïKaðŠÙ+få12j¢‘×	Òýæ»+sëŽ¨"Æ·G =“¿©œn¾èö@§66p½qì*«ôÁTÇÔÉO*ÖåXÕ“îMÒ Í9Ú!º«x°&è Ì>&m5B`\Í-2NI{Ÿ~X`•äTy²ªfð”Õr,—ô×¿“¸jpzÛÊX°ØŸéÍ;A›ºq"ÑúÌxæ8h­Ïüáeö¡T»)½i_ÉbE²0gã¬:ìÍbEõ1]U:H¥éw-µƒÌ–*&v?w 5/²J2¸¯9ìpÉÂÞÎP+‰VV÷²Ow2,¤8œúê7G¨‚)9-¥ZLw éy 3+ÍCÏmÄí¥‚Dõ"~³@g½é§é(Ym·»Q'i1ñ¼Õ‰†tsçâBÒî¶[­ÖBÕPxFÍq›ÝÖãxP)X‚j%Hé£”UÑ§²^T äRõ)Ñ‚Ö'«òÑ.„ùÀr3âBÁ§
P»*„ÑÛ6S©0;b-‹Íý°“ÍKÕ$Õ,‚î£»ÖõV™“	2{ž  qF˜mRà Â„S‰hç«\ «P£Œr’fîslî¬Ä¬Z*Í”[Âã$ ™¼•P‹ð¤šŒ6ó(F6­yt#¾øÈ‹áˆe!ÇØa–9þòKOÑ/èîvFœsKtœÒ”=òwb?éoìiJ›Õ|gA›
{Þþß·JNªŽÔ®”ììÊ”Õ‹ƒ.àˆJ@í®_—¹›[LjVü²Ž›y{A"æwíÂ…A¢’Îå2¶¸ÒEvÀ”$ÇãµnÀ4²_ÑãMó¯ª>#˜‚,r¿À“>•Áw›‹<)n}ÉIËp©•ªEl(Á±hðÀ#ÉÉ‹#ñÔG1 C‰ 
ÿó}(õâwöŸP°œÔË¯ öÿy§(
Mÿ“™'ª‘0ù çÖçncM#¨uFèX P]4O aŒ?ƒiãòÌÎeCmÜ
÷Áê·¤}&ØtèsŸþÞ‚ÍªàÈPÝà%”¼|”LÉŒ[Ç/:d™Û›Ó”@ÎÌ~…62ü{™—×cŠ[ïäè«l‰?Ê6ƒi¯‰ßDðû×ˆ½ƒŠÞ—fMÓ ±–^|P9ëäè/Cÿ_úx>(óß¦³%Pëeû‘Û¨`]‘ƒ¡$aG†Æ* Fù„q'Š©È°‚%&y#
pƒ`˜[d^–÷†¾jhFý€evëáûäþ½ãÿþ|xòâ?¶ŒéÇþÎq’	S^nÌýœî·pwŽÐ£ôÆ\E#?¤C#z‡Ç~<gã©Lö†áÇ`3Mr£Eƒ­à:Ò¸í|÷}fè4ª<V\`†»b:íòÚZÛ›ÚuÞ'~›ÊÃøLC´Uì›öŸG~‡Þš`•Wª¨²’îf¡ÓÛwDƒý[Z~ú½®çÈ…k¯õ¯”!r†kÑ5³µˆÎØdn¥Lˆ¿­ó.âŠGT¬p47«9‚ž»¤Ñss/þýZQoÝ’ö¸"ä<Œ9dv0œv¿ûp‹“[VÃ“tÿ-ìU½šK:ÃZ»¥¢…Öû¥ÈÌøÊÖñ¿É.x¡†(Êe²TÄˆŽLÃ¹iŒ…¥0¹-?R…ƒØêªVŠ\o—¹¯Ž¾wlpÇLì§™?d®™®–Œ~x‰µMß‹¡|°`#ÈÜ0'…"6JŽ¹¹ fQGë£bU×	PX0¨ò^Ù7f'{Í	
C±€¼ºfAÉ°54¯“QÜ¼†Ž;:¥×­FBJg-¼R]ê¢r‘”™r„Y²F^Šc„e6«óUÐTì££SÌDÍHÕœ“_¸ÌØDr8kU^ù|'ÛÏ'»‘k­TçZÂ¯‘Œi»˜šì±Å§Ò^4Å Ú9.Ÿ-<ñÝní¤ÐóãˆP56'"— 2ÐÄ>›*[ó*Áø]Õ4Úõ¨~§šYZY”36òu]Éa«ÝœìÊˆû0Œ=øÇ¬\kô–må-UI¸Mß7³oÓvªûìÑµ×(å_;}Ñ3WÊê»N”ÄÄÄ© óÃ7€yó’ 'æ‹Pùdå”òIÙÉz:&Ñ)’Xâ¡7ÇY1Ó!Øåß¸¢ÿÝHmƒŽ³’)Mc›³FÌ9¿HkØ×ÄqÏ•¬Ü¹!-7j<gOÜ¥2Ù?ÜÊ!.ˆÐdÏßN(½VY0\ä3Óeð˜ä\W^ÄG8J÷'gFe„‘k\ÑûïÅ4ê(/­æ
”øC._à¶§o÷…ÈªQÿøÜlõôäè×‹øÚícùøBT«Xž\`pÌájœÎRûMâ•(rI‘R¥‚b„å'ðrHÕƒ“£¿éÈïY}ì:Ðb©¥d&vI/¢òfD?*±¤ˆ½”N;øYëQ‹%@w_‘Ê"Îg™L‹Ùƒ8k8šÛ\´ò‰e„2¿o†¾âÄ1ëÈ:iÇ%Ö¸‡vÅ¾T½B9œËÑ¦ŽQi™åaeÕ¬?8yñzFÁ‚,²M0F³˜Hõ-Ý©\íôÇÌhÝã¢²8_ño§å|Uáç±B¯^¢ûçäÅ¿wxt¿7$Ù6ûÁNZ<íl0üIŽ~\'œ'kü›Ý4R°Áô!¯Nn$¢ìæ¥˜*q.Übùª,Ý¼"­â³Þ]4Æ˜W¤ü–ž\Ifh2fá7(:0øÇyXx«|¸`­@q§ß|B‰q«;q4l{q3íaV¤¸{Û„ån¯
?mC¨ˆt]1
‡}¤ò?Ö9†89©r8#ò¾g6|øÝÅ<#öÃÊ±šö(;ììî£»H~q+jôN$®õ;òª¦¢N‘©žBT‡;©¡¶îÒKŸ(ê”#›úE>h‚éXÎ}›O–GÏ~¾øóúoþŒ{Û^cñþ¯µ¸²ði¾Md+
g!™%Å>©ø|püßw#·¢Àâçà§ÛŽ…²“†¢)?YüÔVæVþdÅ6wA¦ÚÅR›óA÷çq´7_£¬œÛGbýÐß¯‰…™¡	T	‡HabÁð÷Àâ†ó®Ýá,‹^?Š£?§}²?è¤Ñn„±NÒãÊjö±Kükòk ×ªïå–*ÎGê„A/~´˜”[Q$@aÜp‹˜­ÏtÖîH<·ÁgºÿQJÚ‹PL±xË‹6¾²R²¼-±ì~‰9hœÛÒ{ôäÙÒ¬MŸ|°\êBt^‘Å—ë™dK£'!ä?+Óô@µ¥Wë>‡tÄyçµõÀTZôüuþp’7kð­Èk}‡À(èCPPajFíÅÞŸ5B,Á„^b™}ÛŽ}o·¹¼®öVÔ™T?îŸ}ñÒ²Áù-Í³ ñ/Ÿ}Ç0×*„Ê@JBqË p€zy,½ç‘8Š·ASkL6d'DqÓµøû¥Í>ì¬¹ƒIòà%Ç</éÌOÜ#Ã¸xJ5ŸÇ#YêQrµ!È;ºÔ®øq‡œ7ýN´žÓè'¸kò7^»SiçñHó¾"íe!eL¦íì×¥b2úæW'œÚg©[Ú˜î.GTeñ–Ú¢+|jI‡ÎÐn¹Rk¦_¹ëc6Ü`ùs0òzAYl…Õ¥ä¿\"ñ½î³Z‚2>ïN(óN¨ Z¡Ø„{×¨-¢:d‚@É”MM‹Ä˜£ZRªNk-$¨ËšCG.'É†P^pUPBÛ—Wª¾Ù§ÎžÐ#ÙÊ,Uøýre(²Vã8y]ziRzIÊ2v/XÂ>e:h !wÈåZ¬ÐÃTy¼°ÅN«Øf»¶CÇð1„~Ð=ËÞîIÞé§uÆYhµ3Ðk³.Y’/Óéy9û-œ‡F>#5ûHc–6WíÃô”Z³¬ÛJ%ú56ß-ËE}N/¯Ì¿&PÄH¾Ô	L’bX²â‰¡Î%ÕNÎo/-ÎO6„ÕlL(ãÒWÐz5¯ë=áU 3¬8_h®ZŸÿ“¥kÀÄëjµõõÚúš-Ä{f»¹î³&äÄµäDwIQ‘£´Xc(nƒp(CQj<_™kÌ–µ/ÿˆ	· .?¾G)‹_øºµÃT~+=eš‘ã£,Q°¶w×‚”S§Øñ"Þ>o¨ßÔä!Z9xà¥ýÖ0¦8”K¤¦tI|Ò$K€œÏ¾m¿ð©Ð´äT‡…ß4ÏëøøÅ¡×vƒ:e•H’“£¯j¿†9–={FØ‚ÁRßá¶#§t@Ü±w°_§¼}øä«xd«‹~Ã*^%C—¶E‚?_f0±-¹ðÉrÌÏCì¡1Šý§ð#-ïYc	ŠaÑß`Ô
†²\•‰—§ê»…a¿®"·|lö©íÓ6FþWx’ÃéU†‡C¤
¿*7ë¿ËÊã8ÍÄ¡pÂ9$mr€UBåitÙƒ~·Ô{içCy²Ø3ßCï\ð=´é§¶}¦(5™.O e­N’5(_)=lÂR$º:Éx&Æ³¯ÒÀ¬¯Ñ°É.±‹K¸Åº&Óªå!€—ã^¬ƒ¿ð#ÿó±¥R”tå=&EÄ}Œâ¨ã'Is¸{4"<ÜX¼æ#Ö&#•é¿y7
Æaïü^ž=_ÿþw¢àqØ›|
äŸ³ïkí¡„ùrøÓp;¢¼	Bó"° ®ñ_"#ÜöŠÖ‡¼nOžM“k»M>ŠÁ$y#QÏv ¨öÝ©$;ÑpeRó{ lÙ[Âv»Ù‚€<X°-ËW²ÚÇYU³Bé§Gè¦4\6¼¬Xõ–¿¤ãê¯ÜÐseyL€¹W
Þ,Ã«¡ûå´Œ³Î
óQÅßX
Ñ¶ òWÐûÇøÅ-(]’+!RÕd[ƒÔÈžý¦¼ø&|k­-tgxÔ?éÄÁ¥‹®^¤Àô1«7Eˆ!·sü	ûÇ¿É"œé~‡X/P`«]wOŽ¾…û \5ß${a”Êl¶ÍÓ)7D0Ç(Üoƒ4Sóžúâ6q¨îU/ßÔVŸðÎûépð=dæ²ÝT…ÈÓª4Æ•waÁ> Z4æù¤<ÈüÅoYiñßZ-¹ÁAWŽ¶…”1Ì‹‰ôa8pØ”1,gÛ-ëT}‡eŒæi†ÒmH»å¹ÇQ¾Ìð½à¨Ë7þ©tŸ[¾qL…	*t55q
au:´T›p %Ðú)¤7tlD³‰±€åy†žàäAgT6±ÒŒ²ÙläuÖýVôzrÀöd4bDÌaÏa¾D‰–7€ŠC¬ì ’±¹ÔV[²õµ,zˆnÉ5ZŒM§¯?ŠFpÎÉaê5ÐE²ÀJ;FH2Á²™`Ht›”÷ú=Ôa« `îø,Ùµ[RPF(€ª„#óÿ!+öºýN×Ð¹nAÁC(©o9ßô¡¿aR9çñ[T¯Qéiä±2xöº¢–YuÁ‰2\d4ú>Dc™ûgõ^,cËbeRx¯FÚ
¹|8?ÏÊïùñ†—ø…1ã®Ÿ4Ålk[.ØÙ0´€=Ìn}`¯w/õ‡Ì¶‚îa¾Þ8ÎÃõìlWCs	[†f©@s8“‰ªWÖ¾Äo®”Ãa²$ëÒÞÖe­Âø&·âT`ÖÄjÏaM^íjfã Í	Š”’Œ¶—áÓ/ÉÚC:…¿h¡sáL’5¹š2èeáJÀ„Ýó°ùŠ7Ÿ,¶®_Ó™ïÿðû±(¥ÿ„ÜäòÒTè,}km¥%õGž²L&WÖ$ûYÒh7ý”ð0›¡Öa	§*õ6HèÙ}BqEÏÅb:ú–õtJ–A'+ŠfÅCÔâÖßDî.ÀÂ~D¥ò?„=ú‡W¥‚~6¼›§1ªme¥mK'¨”?2ƒREzð"à“Ixüõ~‹lH70/ÅÌo·Û‡&›X µ
X"+k;„<ôV…ºfVÖJ|‡jSF(|gÆNi©½LX
ŽûøCS‰¯¤ˆ,e±ÝŒ¤Ä'D–òm²œ¢Cç¯f3$yä#[Û¶ºÏË¹•™çù¥—YòHnmÙgÙ§ÜS•1³a#
²U-Ç.æUÞJïŒ#<GN£4-®BŠ#“è€¯’Â%«k™½'æ>Óÿ+©NH×|µ@OaìÃ£Ô^ÚŽži(Š}¨"ðLNómöÆø¦r²´¬aY°Öqàhcyb~—Þ½nBùãñÅZÁ0ŒB@I'7Gå92×Ïù¬Q¥`z40wé=¡[þ¾D`¨ŸZ–‰?Hüi<þ›Ñ}Ð…_è¿gŽ³e‚áÊ¡þ‚I‰•MQ*Éhê+(‚ÜÚ`.·Â¶ñ¡d@IzÀÚÑ ÷²Ã÷u*„gÑüá‚-IÃfÉÐË©ªÇ¶Ô¬ü;çÞÃè-……rÑ±äëÖ8–²KcÇ£4¶p6¾ßî„4þ9¿Ý,‡Î•ÊLOÎi³”,÷	(p)ÃºßsK~î)“Z~L^Pç±Ž€yÇE&Vb}µt’1Ù½ìÖ
!ÓÐ´¦çbb)³´}bz²\5—Ô(‹J·~+úN*ÈÖîÉGZïgÇß{ZS¼›Øª<ÿ6
¬&ÁÒsÆ%Í…‹Ï[›ú\væ—oªçßˆãAƒÌDÛ]¦á$!ú}Ó~O/É¢µ,#—úéÿ[(*XØ¬¥¨úR²¸¤r¬œÜpþPMœõ8Žžë°œü9€÷Q-žÕa[P|ÎáºJXSåì;0ƒ÷Ñ¶7ÈNÔ7·¨ÔTÍ	Øü¾[Iôª‚ýŽ³Õ>ïGˆRß?þWº@½Ã‰y
š&¸˜bÿ%Õóœ´B³w„‰6Ùëˆ“c0Ùùè|[jõIöTúÄYF•±½^éi¨ö2€ÚT™L§k*Õ…ÀUòôF<À6šÈöiä´ŸïAÌ&šq÷²œ‰™ÂÁP1±©¢l¬0yUÜLuŒFoÖÕ›.–W¦bº°/ÎÐ|QeÀ8F•ÃÙŒÁ=Ü–M¸©édÔ8•YCcØ(ñ7«F-»Æ$–ÉÎ rÃ†“iÃí¡[6l4ƒuÃâ-Y8Ì´tzkÇ©í0*ÁÚ1ÂÈ*&T<¬&‹¸|Jë,Âgg±JÔgbÑŒàPH*¨¸#K¤»aÅ$‡œ­U¥ä¶sS£d£Üãî»+ßpŽ.<Q_e2ôYúñ$…«Ú'5wóêI·¼qî½qî½qî½2Î=waxf>àÔÙ¿ã;[ïžôÄ‹æÛ›‰È;]‹Æ
‡Òkêå+I9çàì«)‘–7þy:úPÄÍç j¾qñ‰C=¥‹O;sO°‚sóó•dm«»O2Òkçî{ý&ç<u|~Œ½œ‘Çs…Ç	ºI¸ÜèÄ”†¯9W aKw¤þí³eò³6é¦›ð‡^0¨Ç'øžfEèyZ#}ñWnË´8«}O™ñ>6òíñ`7ÛÍ¹å©ÞŽ†.XŽ‘ãÖ^ûÞNŽ~56	q3Þãù¦.K™|/$˜½ŽŸCoGÞü1lwNÛ—Ÿ&Z¿ù‰ »Z²•Û›dîå—ÌÐX¶JæTbœSU³Ùó˜»;;A'ðÃÎþÄ\¦èÂ™Ïhoù±pšîœYM±ZnSÀÕõYÁÌÏÇô²PþÒ<ä2?V6¤£ßY2¢âyzVT\¿í¥¾#)M/câ<éÖ`09_b}Ð.œÙ’ýŽ×+m¼øß[dãäÅoÎ‡mýôø/Ò;Žþ9ðó`…Y'âJØPB[q`N*ZuÈîÉÑ÷Tíïcç_yáWoY	|Vj“ô¸²þÄt:tñfÅMî†B–%ä~T	&$ìvG×04ÄYŸÕ¯¼¶ø´ÿ)‘°ŒÏ‡“@õ?õâÀ±|ä!s¢ïÿ€lÿgUJÅNŸ| lf)ë>—ia54Š8Iù 3èè»@ð/»gJ»[ƒÌÛ\*9™‡) :ßª¡n+¤ÆgnèË*¸›4XÂãK$àcJÈn¹O8€r)ªK¨ä²T,9«(QÏüúk^<vd+{]à×ä5fEèüQì7<ßmj»‡4žÕ·Ëé½€Í«‹í5¯R¾*Wè­Ä¥<yZ? Ì€žêâ½µ^8=aèû¦K×JFƒ mÌÿ,œ_`ë	ÜþØK #.êùÿ÷¿!é	XU[¶:¿`ö-óZk#Fƒ{
yà¼xÃmºšïfÎkhC%ô¹õxü!Th×;{õþ\Ã¸!ö{P¤Ñmümçô£«MÈYw¡ÔÔr§?rÂ™ôÕªÆd,*¡/Ì»Äà—Èp»zºu•\±A`G›¸Ä@TÄý*D~>è*óäØÈªô£+)%jDùçQ²í¥N\è=z^Å­Î !¢Wk/¦o°E»i@_¥[ÒÈKÒV2î NfƒªWTMN<(ü}üOô„!5ARÆ“ó­9¥ƒÃ’ú¶¶öM•ô†1=ÂáHÞÌýVjl&‡z¶¨•&õ‚O.FÒ·ýª™ÏÐtõxÔõ&Íu…ØýNù®–æç¦æÎòÜíq0€ózÙE+”‚$Ÿž©Û«üèönLž¢r–öQm+™±eð2°V‚Ðñ«S6¯_h-ÏLª³ˆ­ ô†+6>ßºüWq±Ï‚]L1S¼‡CÔŒ±ñ+Ä(î{û>Õ•ër	1ä|˜…½bâ[,|ýŸÐÒéùs‰rÄÌYðˆA/ž?ð[˜ƒ¾eMÎ°25Î ^væüØOú{&ö°Ñïc!+°¬þ]@Å`°•nŸýýœëwºóøó4bÖak‚ˆvÇWH»ci"Cz{ªK™™h&  Òè)ëú®ãˆ0Ä™ŒH7A<Ð4Ó>*1ƒkðe`0åvJ¸ZU^‚1  mW¨)èêqRÏ‰@~/C1·ÞxÿäèØLÿCšèû#¦kànV˜ây¨eÍuCÕÈ §UëI«ç£Òz\
ãTSt	ómö ¡RæEã–›Þ`n×y„;2£?{çð„q¹cÊ1.ÎÖþ5sƒÿ÷áäöñ¯~ºJå|É/|Î¡qÅ@4"øg¯ÑÙ{¡r¥‡Éâû'Ç{‹ˆë7ûx6fi˜<d–ßïÉVnÿšqcÛÙšõ!llöµZºj>üñ«•Ht–‘jüaú0µì¢%<-Û¿4,m2ö’³I7îbiþš1«ØqŽF's”üoD“èqG}Ö¹LšTìÀ»…µõkÆŒ"Ç¹øô’,VîPÍl?R¡C!ÑYŠÌÐ¡8Ø%‹¸¡Z=.”°1	KÉù¢G16~ÍŠUÌ8¦¢“6d‡æQÃ$jÌœÏÈO:1ƒ³„ÛãnÏO'âìV'nPjúšñMŠ?@Lb@ÞÙnÿ—_½üÂÒÿ(Žãrûf.wlã²œäuÙô*ÎjË³çœOæ?{öäê¿ßY¡(·íwýKÆe+ Õ(|âÇ«[”¨u–Ú˜^¿È.Z4Œl+_Pc2N“EnŒÆÒü5ã3VMãÜ$›¢Q$ÔøÌåÃ¨|œ#RŸu.
Èƒ·ËÈ&w»AÚæÕ•lâÁnÊn«àºvõÃÊôC–òU‹9°˜7W ^!Ÿf4¦”<âöñ7€ðEä1…Nòô¸Â†-àöuè>O¹9/Æ¯ä$ú¡ïâ™…:Èn?BÖ ·ŒúÇßñôØL5Y-ãjs×®-ÒÍ–‹9Q’¾ÅtÁéØ(ÿÚâˆÇÐá=!ççuð§S‹´ìÅA—À?lPë{…ŒªÃ.iû&LDƒn­ØÓô.ó4=•zN­Jˆ9V;«”ÞÉx4òãŽ—ø2Õ¥“®mxT¾ìz±LªE6™´VX8Ùê#]ò+²Q¯únõ\w”þNCŠ¬Ú”MßõîîŠœ¡Šk±urô/pÞ}½o¬±f,$”V;4€UÃê7¯ç•åÙ@¢02Ü–ÅÞî¦Àq7S2GúC}ë\Úç§ÔåÆP{^Ðv¤¡Õç/k±Žé{©8Çis¥ à¹u¨¿þŸ¡	ÑøŒ–üå—0ˆ¿èwÃî$KÎo›ê‚›+¢Xy¤À§Îôpçþ=«îS&ŸÉCY¥32¬)[Ox’½†AJ~¹,¦¶¾¨iÀWz'•ëá2èÿ4HûÑpè%J [QêàÕÝÊ‹Ï€­YøvìBƒÑƒ­—ú•f»œ›T·`‹‰–A  v¼ú‹	¢«‚Î©´ª§‹»¨o/‡Ž¿úKû8¤ŠÚS?žÆâV÷uq——[#_³ÕÝ˜ÚÚVõtª•%…22ƒE¾Ã`Õúcu}™.ˆ…€BÒøøáË/UBg²äêèÍ}†ÔPeó‘ÿÔõBU=‚°vviâþñI7:7¦^µ¼ÙÀ2J}ÁªB˜ñ#ßK¢ÐºÖ‚^º±R¯ZçÙUdÑÞ&Ogy®›¯¤Mç•Y¼§~>˜ÃuÉ|•[fì+ÔD~¸ÑÉ¢4|Í|eˆÇ>z:gí\-\Åaº"o‚*TÊœ•žr>ðäÉÃ)ðnç`
µõë¾Í/Z(Ì¢¹À~¼a
Î2ˆ¥¡`—,lë^Ðð‰IøJîÒua+ÆÆ¯W±Nœ— á7!0“7±ÆX‰™sùIg'Á¾_ ïK¥]É ±SX¶¶¡Ëîç[ÿúÊÓ½O‰	sü:bŽ«€Ôq’FÃ&¥§h0Øöâ3£ñšñ†A»«LåWÑ`é³`bŒˆ–›'GßybäÃË/óè¦‡ÓˆÃÒ9?³Ñ&CÑëX¹¤Ýb5Faœ–QÔlL}ox©(—ÆÚ0vû^€"l
X(FmÍ˜J	—X‚7ž(z"­‚ê[ª2+`•å’O£Î]¬"`“Zè€®îêÚi©ö”cwe±Œ…Þo.-åf.­cº
+#CÅbí{Rùê³·³Úå¼Ñ]£O¡NqVß¼µ„ÝFc´J¼pù=TT&7nÜ º{næÏõóÜÈÏ»¹ôÉoÙˆº¼–úáÂg ªS¡…¿j3©s„×“Ñ“k×8×ÍƒÓ€ÒáKÅ/ïP…ƒC8¥gÜ>I#z ù(³&¿ khld*µ®ôhýxvê›ãa¡yáo;‰c*íü”Ž²ŒÑBWÈý?Rê6è6w¢Øï!<ºŒ?­À†‹Šw*=dK2¿ñ6qÒÍktt×Íùvç¤Ã^ÙTp\S·=ÉéÝZ2ïZºúÐß¿í…y_~‹ž³#ÚÝÈë¡öÐ0ÞnªqnŒ_1^`dû>]©‘*.Pà2#VE"0ñ’lËAäá^nŒr0?¿ÐJ£ûÑžoPNÝX(þÒºh/è!õ8¨ÞÈª'¼~¬7õð‹‰vñöÊx6=˜=;;w®¨Ì¤ˆ¼Ð<”Ÿ½B|Þ÷m²NÔnðÑC|w¹xZ)Gm¹ 	/³Qñž@8­˜aBÛÝÆQ[ÄDçÙe;2"|ôd;3p÷˜ÏŒI`Ýä¥)KH[T¼œ@:‚Û*E#ltä"¥d"8ˆà–’4—Q‚«\X)0@KÂ
ö­÷Ó^7IGlžl â£§x}tg’™pšÎU^º|M—4¨Çy‡_^‚ˆj:”¥ö2i¦±2zÞÇÎL„‚¥*¦‘cê¢“ÿÞ!ÃãçµdªQÌ«|V	X%Ê›DÔ*q”‹ té'…ŸüÄ&{l£ÙÉrš±`ÖÌ<Á8,'S	$öÑ¼±¾fQö±Lü|¹DŽø9´èº}B¹E¿b£(1å,¶@ølJt»Ó.²âLÆ1X%‰OI–½lo[cº,>ÚšºÜ¾|µŽÜŽçI…ÐžÚ	‹SúœhŽF*Š„ŸÆÁÐFwPôë­Ï²
Yi<öÍy£Fê¢RÐNùË
º’OÅSwGèªŽL/xhÕp,°áð©‚‡/qq¤“.¥~O£ú¨%
KkUŸÄú„²øÜAóÑkU@h	{€»Èn¨÷ŒJ ì¦9ì*¥ysªµ¯ÖÑŠ|Ø¾5_¥ U½ÿÙêGZQšž‰o16‰†~•¬¼`;CËõ:Å¤>uÏ¶kS¶Uç(¿­	h“µ8Ù+‡kzT°bls¥sŸah©Lþsë°b)@VUÇJÕÔh8Ns©úäšî¹UãÔšö™5Õë4çÕáµÁ½hÝ¿åJ'W	Š•VKy„–ö!w	UQßõÿ žøç##­	Q_-ã53ý<ÔùkÆnëXð½áhàq5B¦ïnvH`œÈv¤ô¢¾žŽó²î¡¢Ë‚>Å›òÂ5©@ø(§Üð\Z4¨EB ‹€%ÒØêöÊ2„Ö0øksLßáVw„€ ,3gë3€)1°¢Ä™Éš}»V˜¬Ù—¥š¿¢dÇ+RL„üWÈ%øUHpœºJ^~‰Y1É“ÿaŸÀÛãt|>>þ
ýù	IøýtBÈÀt‚•Ñæx–©p°ì—Ó£‰mã^…%¾:«Â„ÁTŸó‰áB0µÞQå¼ºýèB!æ=+GûÊ¢T¢¼Tj5\F1ÞÉ©Å“0	žk6Iè´˜Ûƒ¨³ËÞ¾üÂdåÏŸÇ­ýµŒzè0útúË?fË›óO?Âý=‚yé-Úè=*;ÿ•¶@¾Š6é	öú"Uì£¸t4•v/&èuÆqLyßUÞËÆÞ°~	¥îùÅ¥y„#¡ÿµY¿Ôã»k|ööïaóíƒl0‡ŸY!FšE¨¶ùT0ã¦DÑ¤œS§ÕGlz…ÑãWa5«¬'=ÃÞv¯e£ ûÜŠco¿µGÃÆa¢ê*YZ&‡—Hãç—H€¤d¤PÒ$+äÚJ$U4ÄìÇvKŒð…5f?Îm1ð§íd¯4À<è¦ÂHP­ãÃÇ¶+Ä[µ™5Xá|™!GÎ.}ÊÉ¹ÝŸMÈí‘Û¹°júÍ&â•Ù; Ã¾ùšóJF¯·´;œ1)6Ê:—Dšh¼.Â5–/Ñ}`w'½‚t9ñ@—e¼Aº~fï#3U ¥Óe˜.Z;hå‰B£G÷À\f pø&w:«Þþ#–È^¼áÄK4ÉÛ5îhÅ>îƒF›?ñgÝwHû ?cÐoU/ïx®Ñ“Íê²<£cÏxÁA¯àçÝ’ÙQqér"+k1×s]gÐ…÷2Æ5†ÕÜ]¥£y•]@‹²êV³4šÒûˆU¨óÐÿ¹õ
*ït°n’ÏðÙokNäÃÏŠ@›uÚÑO¤ÆÀ)öqÕ9$Jsè¤€F¼JtÃ4ÍÂ¦ûYo%0E8iµÒ;Ê´UÙ%:'¬Ìhd:5õÙ *íQÆ™Dq3ŒÒ¦7D{tRY®'ý)4Eç0‚œ-¹“PIN-ÈI2Á°m«#ÃtO˜è…Ñ$>"œú'<¡Žg¬iLAª]PÄn˜LJ [–dÇÊº/´ÖÚZ¼n?¨9¡çiqÑÛ©9Ç=&ÍŒXh…X©¾‘ˆëÖ’eªtB¾¹ëÚ›«mÃÒt@6£¿ùPÝ¼JŒÒåŠ% ÿêåWúyJdÅé’(‘òôæÖ72èß°‡oˆ(PÜ ¯Á~ìÇÁNàw§K¸.½ÊŒ“ZÐ/~µ’o±ïVx°Îˆ˜q,3¥åæ²q”Ø2PuÂºJ0T¼c¯+¢+‰‡¦ªå^µ`Z½üŠn€ŒýWa_ÊýlµHcûäÅïR²=>9úûÎ‚èJÚ+5p®î–ï;µ¿çqç±3NVÅ_Wò_AÿVfœcû
“µª,õý¿¶Î k^—ó=90Wžx£rå|EÉÅê‹A”²8ðòÊLÎ$ÉþVÔç4{ÖÜ)ÑÞÐTeÝTû³­J ÉŸ/óÐÍA@œ˜Òæ_~)³•‡jÁ¡BnUû”©ó¶|ù­>«X0`#òÞ3Ot? :JU“á›5@—}_ˆb›Rþ¼ðç‡äUDºt1Nª¡±¦2ûá6¹AXÕ7žø+á¿Yôd©SÅÒ…áiÛyxZ8ä;£éŒÆä~]¼£“#ü²m zÞ—K®÷Âà`Mú2zôgµ tg.¡E‡)lÊ½ÞŒÅú|7ï3Ça°á×Å„úí,eó^ÑÛb©‹Â@UKaŸÒËcn›)èØâTgbcñ]é£è×af¦˜ì½Åg¥8F£Î)(-)‹Œ=L›KŒƒªf&‘£ÚŒJæy•U|‘Ÿ¬žn:UÓÑgÔCí£5;ÞÀÏœ‡ôºój2F»«žØzjÆÉ­ÆÝð*’öle*õNøØuO…ÛôCø8iž·êõiqhžÚjÂ>:µÄzóM ça‰Á_Ô­1±þ
Ÿûz•ñÔÚ,›óÎ´lµj¶ðá›TÙFý>e÷–în§²*ÖMx>j.|NQíE+ cöŒUb½vvÖhÕ\5SRŽEà9…˜ÏBA~ôb†D9QÁpv»cacc¥y&è”U seø‘¿ûIcÏð6‘ïžýŽ°zÞäŠ°:–
LÊüá)"AnSèP¾ê›å@–,ÒâJc™ ¦ªry¥€ÀV¨A¯LN^€-ÚƒN^|›ÂOÏ…ÑÁKíJ
™[^\¾Ú\¼2$è—ÿ°2÷
á[švÀ™[ëäÈX»œ%Xë«mÄÝ“£ïàpÖ¡îf$9Kä]>DDôF†voˆ¥H+YkçÆÉLmk2²2XÉ¤ŒLŽ©´÷•¹Ú{ÁÀ<2±4.q	Llú ˜¢Ð"‹µee%±É7¹û¬ãÚ›gX%!—ƒp—¼E€#¼Ù÷)) +úÿý[J©ÈÅ—š="f&ò_uA½¬uøL1EÈ<o¯¨±7E–yeê™-ÞG÷‘˜–¢Ì®Ã³ØráJO^üËXŒQî5Kë,RÈ$Éÿ˜õà[a%¿¥«ŠÂ³†­vX&Þ—_¿ -M£ÑK¹F>Ÿ¿À]]ªR02ƒÈëfÃÃÑ 4
/
 9ú©{· —]Z¹}5 ¿Kt VkÙ°äÝ~††1•y°†+. Ë–&G{6•§L¾¾EurÒõw¼ñ€E5Sò¦5'räuÕ’·“ûA"1Q4gIõ‚Ý•ªÛÊvÂÔ·µ¸zø,Èû©a€e\ìz©×|’¤ô™7<þt5_@ÝE•oëÚØ’³í-Ú)3_Î÷r>IÚ„rJf'L€ÛôŒãÁÅžûÀÿ«fF<êÍ
»„©^Ñp&˜h+w™8xK&2Ié/…×¯°Ö£˜^“Â^ êd4€“€¾!¹i£õl<»DZäé$¦Wf£S`Ù\šxŽ?¢ìFw‰þ5¶Wm¬’¤GwŽÑ*JÐì&A‚®6¾ò¨ÕQ„GÎòªò[Nî†”u¼‡ööÕÆ¿že¿e;ù&þÂ»Zdßò=_däÖZ<pŠ;„3‹LJc™×2îjfbÊ??Žu°$r#qR‘¾Yœ¶àö1‹^ükåcƒ‰±ˆCX¿d„*ˆÏ¯6…{48ci†ì®¦	“05=<NB¥üŽ±Áû%­¢ƒ-<ý+ Ù¾«¸Ÿbï§é(Ym·»Q'iõp€­N4l'£ŠˆÂP“v·­¯d˜}¸)œEàëÑmUƒñ¶t¯;ôâ$ð•\ÅÊ˜Iô¶—Åyé$x/Ž†03æ»mç°ª_þ’¼å:ÍòÔR‘ªÈfŸJŒ‹ÅÏ¨Þ)ˆÂ…ËÆð`3g3¼ÓM#Ëcê…ÈòPúZ%seã‚NWL«{Wëa$Öå€ì’{°_…°×’To%4X—2#¡$DË™m	@³_ùåñ÷¶<›’VXû²ž]Í¥z•¾å¹ÙÔjT ™‚E­Ã£ç_sZöF¯ª-á—-ixáLìhø¤©XÑøË¼ª64`
®´Ü¢ÚÏò4
ÙWòÆvöjÚÎrþüÆr6Õ¹yc7{c7›’Ýe¹ÚV3V’ñ5²™eÇLÑ¾HÕ“ìe™d1k+6«ØÊðÇWßR–'¾±“¹µ~c'›‰¬C·ÓdV²áÎ×ÍF†LfBYÎ À>æ6½De,—WÊ.fÛ„ge	ª±5;Ëh#³²éæCÖXóµ¦˜dÌ°#’äd0 Û¦© õ,ƒÜ1$fŸŽŸ£2üâùÃ#&Ïñü@Ž:’Fnô"$–—ÅP6ncÄ#†7z,Ôq€õeÓAã†`ú3+äýÌ.p=\,.´€‹ÓI¥e Í`êöQùÇš(1ø+—@+-ÈŸû?ü~LŽÿ¸J¶`Òîäµ·°ö1T9æ©£>*â ¤üëèã¿TÆsS¬Æ´ÕéöÉ3MEuiZgk6F?›ðÝ øagŸU6w*i^ÜäPÖ\Ûø¬¬Ã¨ÆA‚	Ãv(â’ûŒ˜>Sb;U8·”%ÏxvJ¨lÕ'ÝÈ£ÿB¦rVâ6g7,C1?7õÙ¢¤‰›Äzcžw©Ï	œšõl¶Ä$÷ÖÅ¯ãåW¤Cw2,Œ±€·AJdÚpˆÉtåŸKz¡¿WLÓ¦7ð5
j9)èaé®*Y¯
`b‚É¹ƒ¤ƒ)wÞ1BñX§³M“cHo”æì‘ÿÔµÂmÅ´ñ•‰+ð Öj÷²ö\žŠSW"rèØÕ,âüK#`¢øãQ—ž­Å šÍt/‘2a+¿å·Ž'oÚ÷ö9HÛ%wüOÅõÊÃ„µs>N,Ík(ÓËEŠ}+^Gywßø1€üÒ÷’»ãbt)éÙñ÷ÞäîEõùéGð0!£G<&9ŒFqåë°±•1`ÚÆù¡uSûz§K:0ÓYN?Ì+ñ­ø¥ç©ËÜ¦ ¡›¾@Å!Ž£—ï:<\W©mV‚ÇˆŒÂ-Á™CXš×ãgŒêÃ$þslÂÿ  ÿÿì½kW– ø½~E8×]$ËIæCO§õ@*%Y9%Én)í*¬V°"ÉÈdŒH‹TfVvSSv‹Æ´YÌ³ÓîFm£kºÐ=Û;XÀÂb>¤·þ‡æ—ì=ç¾ŸqƒIÉv•	HIFÜ÷=÷Üó>^ÛíÀ¢[ jÁÇókxHhû­
Xü¨_Ì%Ù½›(Yª FP)@S—³ß½äÊI£S"éèßb«˜õ˜Ùk42Ü@Žš­à%wkÑ$bP	W©ÿ‡¯€ÖúO~v|™4ôUAC_¤¡m¹ñò%ÀÞLRÉxä6†pèAã¨$®®%U¶äQa&ƒ2e¿4Y“#ßÌ6ŠÁ . [ø›Ÿ¹‘7,½åù$—:óYõbdÑNÁ­lÊÙ»+š€_¸¬xh‹4sÆOÆù°ðÅÂîE±%Ør2\Œ½Ð2 ;fo\b9«ˆ“[mŒãSG¨|ŸÙ-l(ÔózE”‡VÚ1bÂ;![í™êJsùéŠ)µ$¡1‘G½±‚j¦>ta3¾
³Ðq‡§Úpê>Ý»å³ÐÂZ©	5Ùf*™¥•é•¿äÌibMK_Nî¢ÔÆ°Ò—1öôÅ´{¯ž÷5HËa6Ð"Ê©²g”ÃÕAä©©Eò¾ûHš:vó°¶BH¾‡SA_WÖ×.‰Rü¡b³¦¿¸ìÂ€¨—i½°üöoä!	ÇD‚0k·ˆŠ°óÁ ›8Êäƒ›+vçS°¤s”s›’ÈUµ±W&®‘‘…!dµ;¬Æ£ûÅ,nØ*Ä™–)pÒà?0µ³	£Ë^È"Àc§3hÑt'/ÌiÙ‡ÏÛª31¤çNÙ@Ë@ÆYH[·®«Mo
J“Ž%+ À¯jÿ‚(Ðb~ð8v)à—ÌŽÐëê™Å¯ •ôiáÂy*þúŒ¯“	_÷¨=Ê2Ô0‰ÆÔâÌ_rÊf£ßùAFÄ¡1"½BÔ¿0-W_1PC¯uæÓúí‹ûrÂ[ý{²äÚÆþWÐ^€¬è‘Ç1²Pð->+Ãµ‘MÕ×ÚÍú C=í^©WbÛwþðr,Ç$Ï†éÙzo3?ú…Å~ÂN“EçÕÿäüwsˆ³ówsku‡—c-Ù#r‘ƒºÞýªayN)Ã•[º2·OˆÓÊÐÛ*j×¤‚ð1ÿ3¥ñ¾Ì=i=Ï±êHd#ìÜ@¶âN²açàX Wr]ÁE³îàÂˆ}˜ÈÈvžëá|ñ*:š¥Ó` @R¹Ùâ=`®š+Z¸{#ýJ„@M`}| ¡o£sžRÒß÷ÅMv¾k «ÜAß/P55ËßÀHî2Æ÷8ÂŠêŠÂÛW€Lb
T¥/9jÒ˜æË<)‹ó¯ªÅ÷º”Å°2…“*dÕ#Æ³ý€Òã°Çy"] kCm(hˆg¾w:çx¤_¶^É(R
øÙF•;L<BFGO,Ij
,­¢µþ|¦¤{óŽèû¥%«µ¡
éã¾†T`=õ /«b¡Öbk´Yv©fJ¬«×°´°×¯¿>'×ÊzÀu@˜Ò.eúFW®øõ_:#Hâ>Pèì~²ÃûH>œ¥²{U·*º„·žc)^!d´ËV°Æ¦^¡µ¢>Ýî´¶·ÙÞM%dÛÕuû`r[eîÃÂ¾É8`n2–[Á}ø®“ Ï´$L•²¯œï© 2·ç2‡<bÍáñãä!!yûÔêN¿|ùœ¼šIm5yFŒ Û*ÃŒ‘ÝSØÃ+êü¿æ ‚W•XûÀÎŒ36A>ç?åx«V<k`–µySÛ	aX˜{ÀvÃËgÇÜ•ºz2 ŸDD°¶Ì"PÆI7WEÒ''NpVŒFû©)Œø	©ò*ÏŽ’§óñ8%€}§8VP¢»sEè
‰l=‰1Õ· ž*V‰Mi˜Bú—3ûy?v£'x ùÀ/˜V´V¨?³BàsVœFà@“P<ÿçq Ê{’”+×,ÆØƒ`BIÕO‡'î¡nóIÖ'+rP%åŠ£„‘„%PÆâN­š$yhõ@~;éà0s‚Î(0WÖí°‘V´H[:…|EÃµ"Ý·Pð.°JÜ@«ÈÔMè)˜¸{T®1Q»¯à¹BÞŒÆr–¤îd@°ˆ¶ fòæ©³µ,Î®ÌÙJº]Ï`Üó8øø—foÆZCáŽNÞ5¶Á¼Bç_MÿxQ,|6GÅÙÄôH\×ÇuÝžÀå{±Cu›¦5‚CÓê.r*‚kï¾.4ÆÛ	>bú†O³Y^Ú.XÓ¼Ø¡s¾ŒÄånHÆŒY5Ëû(òµˆ„ñ0Äy?/7 ç¥b3™{U
’—aäü&!4<eš2ÀDdš
l†S×CVÇw	«!Èå!I÷ç£tÖÌÇî”ldÏ¨ß€˜n÷hÒ*8!ë;uÕ7_:¡(V­ô½ÛCýGªDP#Á£°›6©eœ÷ÚMñl„ÿ"|ÓM7BÈÇÓQ6Fm#úÚþáŸÒdvþ_[–ÕÛåEšúSÚÝ½!îí!¡R(/Øpgå=$stÙÀ®z‰÷õg©6Ø®€ ,Óƒì>ºú81¿(»š´ƒµGÖNÈ'yð`k<nuØ-‡7ƒû²û£ÝÚ‡Èç«\|S´kâZEè[·Åç„s¾Ýe“CJj¬Ÿ1Á&;E[ýmF¤U\ÍOçû]–¤4Ù'Ðò’ìÀ²ŽNgY	ÂGó¾ve9ßWBoÏféI//ñ¯0eùTá+u+Yw±¶”î±™LqƒP«GQÍÅ•ØŠzí<r2gƒß~ÛG>VZY‚Oþˆ¸Æßü•‘c—%ùy…–Ôþž	ÚNÊÚÀ3­‰ŽÄ½‡0¼dÍƒwg=¥³÷æõÿ69Ü
Q<‹<îyD¢Nò“0bÝ“„}Q õšÂêzQªãÛT°es.GÝ.ŽÓi»M~o%éäd5)wÇ[	uÒuú;ÑM†Lªm«äfÂšüÖÖôvRëVE•Ž´ÚuÛjmÚ‡†D›€TÈEÚf\o:ÉO²‚°å÷óãlÐÞÀ‹r½ånÜ“‡YÛâ—ÙÉÍS˜9apÈ8aÏtÌ7e}`L;ÕX¨*Æv„S*f>˜Ãi ÀôÕkŠ–D;æqvÀ×¥ l=¶pñæ¥$Mùï{ã4GÛþÖž‚bÀjÎ/ÕãŸS½rÃ„¨“’hëÕÏ:¬Kpœ„D‘vz:¼
‰WÊxÕ’2nèÁáE ÇâìÏÂcÉ=xo„/e­'E…òÁ(§iØ°rëcÈC7<ÿzK¶ƒv‘¡µÆ’’fˆ%Ù"Ík]_»´ò"%ã¦~ùà‡ŸÜ%MµµÑuœdz$ùlwè'P»f³üÈ0†pžl%I±S<!´{õW6ÿœRŒy#ËI‡BpQBì\·Â™Ë96aë™M¬kv{ù8œQ«v“V¶ÓÊa®µ’6ŽE’RŸâ¬!™{c³Ô/Lä>f‘]€Ä•nE¬©yÛ!Î¦fÝìZ­xØÄ0L>üôÍ×ÿ8MŽÉ §[É#œÃúm•€ck5#·]ÐCÇ”ÊjSQY0| r\.×?ˆ	W¦ýŒ ºlK8^±ß"`%ý9Ê*Ê®ÑßGh~Ç~¿O£Ï¢W’K"kwz³ŒG%|CŠ•ÀÑŒ«ùà¸žJ­²)%1	‰è\‘.´"/óò!r	4&)™Ü¼y3Y—ß¢-‘
j÷¤ÞÆG¶Z>kkÉÝŒœ1œ~ˆ ¦Vy9'm`.ÑÃ9Íì¬<Ê*V‡’ 7=BJ‚?¡xw¼yýo?Hž¾yýÛ­UOi$9©ã­j„þÖ#~{ÊÉ¶Õm:Kœ¹W3?HÚr-É™Ämï±åål=¹÷ñîÓ½{OZî×;OîmïÝku¼·lráÈÅÿ¯œüôü?&w¶³üõÿù™wÞÚ*¦štéšÓ¤0Ð&]ÍOGór'ŸõG™§ gQÏ’lD4¬­½^ÛwÿÅgO÷–¸^ÛwíÂ2í¾yý¯>KØÅ­×t>›Ž$Ð±ŸÊj±'1‹õtWQ¹Ä•ztïÉÇ÷¾Ø¾{×y0±ÈÛ¿7¯ÿ]òô3òk-ùøÍëÿðiÜ²öOÒ‰XTü¡,)þŽ…¾%®ægŸÞ%çô‹½Oö¶.qµvÞ|ýŸ&?{ úw?Ž[¤fµK%þ–};Ÿ<~úÉÃÝ»ËEqKÉÎù¯v øÐß<N>~°‹RÁÿ°·x)Üvbíè/eéèƒ˜•û8¯e³Ãå ¸Û½|ÒÍYÙní>úô“'Í-oÑÆ>û]rïç;÷’CùôÁ½{{qKVeéH¬þPÇ¬—ánÙpÙÜ„	¥h¶q9vû êÚô c?I³“Žús ÷&ÉäÙ,›ôqÒé”wàSì'k°Þ]R‹%“¿ _F@ZÁ?á@÷¾öÙ%Wqßî8ê=r„@Ìz@ˆ­Êž²ÀÑkeð"Æ)%šZ«¬Qh³C(ÎP2D´ÓmRt›®¬5'V‚ôç,!.-R`ŠGíR¡â°ìÑÓ‡51‹Øi§ƒAæœø"ãUóõïðhñpnÈ„C5u¯LÀ¤B00(lõÕ©ê#/˜5dË6“ª€àÒj²Í	\pà	êå<Ûqwcm³>Õá}?öL$k´«-õAŠp™þW2å *š/ÜèíÃ¡!¸`GhÌ6Äÿµ¥èÊ`U—^B0ú7ÀïÝo!è•š7kS*‡Zê ŽNÍ“}íÃuÅO·eÃÚ`ó[ZœT}™ÖÙ×w*ÇÂ{‹IôÒÙ a>0¡ƒ³$³sPöxÝjê(qÝµÂéxEÄ‡kTØh¹©tÃW ­+Ì×²vhIò?œJ‰HX
¥ˆœïé§©O6É§´IN”Jí ÅVtlL
Åä¸VÛ„Ö3Ò™KZ/‰Çj5'ØªËjWõ‡Tìvý–\d®éŠ‚D“„Ö.nÊµ
—W”×0WöÈ{ë¶…’#¹êË*O	*65KF	—ni«,CÖ_êœëÔ¨u—”T`³“L4C°4T­f<dÞào|aäi´sÔ½J øªA%Ðc-yd¨Å)EœŒS¶ý.8×–«Ï¤Æü³V¸ŠÙvÕFk‡Ï@9³“‚ ½‰Ôž¿×¢Qª>ÚŽa ²†„<eq­JKXñ‚³üé3kìš#A§Ô½:ú&õ¨t!U´Ý™/pþYÆN×‰ÃŒUÛÔjSLAé*åÔ•¨¦åQŸ"±Åéºžà^¡9Ô#ºØ JžKiÃ€(¿«þQì«áùïÆ[<¶o8H²„ÕN}¬µßÖÎÃ9ÝËŸÚe1îjE´æìúP;ÃdäŠ´6t
U,AH#ËÃE!âl•#Y^ Ö=`‹k•ÆžÞúøÍëßL½phºÃPÃ(v¼Ç <ìÀœI_n¼šÚÀ2ƒWfÇº¡%(ÌO%êƒe7ÎLFÑýAÒi$¥_8…Qíè"Ab)
×·—‹uÒü±–”JØv-Œp¢v>ò®¢±
¼²,.cBËD2M!¡>›¦úQèjc²–TµÂV·íV Í»±w¢iÇw@QÄõÃ]~› 0¶y>¯Ø¦R¯¿[®×¿šDJO— êVCB<½T·n¢Ù•yHº§Û·®È£)›b³ÙžÍŠ£'èunK¦L[èAk·±‘hSH?5k²±ÆòdªÔ³ø.×>Š³f“TÔU€.Pã‰&°«‘h îUP› ”á‚}at=®ohhÕ¤ƒ-up7šŽoV”Ò	(ÃßMG¥kB"¤ì~%ˆþ‰’NóÏ©±o·“¼¯<tŒdä/jÕß½ô)¿¥ŸZ‰m1ê”™¶Ø®FEª†˜ô>#¸›!›8ÒBÃOpv?Ù‡6=xžC†Bõ}§wÈÍÚn?{ùMZ_â¹oÑenujü%a
Q*¼³Ý™hX$)G‰DÈ§›Úò>ÃÅ]MÙ¨JŸo%ÏJ„£UðH{¾šôwƒF¾ö‡Z¬`£0ñ,°€,¾ÁÛ¥oízÌÆÛ Gã¦TZ6`Žc~Xø"RŸGyjPÂÖ°Ô"<(TƒÚŠïÿ–*bê×LšÜ µWÙ,'+Ë(lPc–!nt4¦r[Ø¶¡(Û½©l,Œ†„ßbÛ«±Û°?Ò’£oº÷ylýý¹Ã6˜7`("—gQþuþë¬!©ìì$@.“~ÊÇ£‹ä-ºëÍ0>m«åªgôï£N7Ñ(c“32J<…¿ˆ×íÉ]y±É5 ÿ<¾GöÇå´pÏËPÛˆS<ÉÒ²VCÀ®×-[ïhÜ…O9a‘A¹¹*·xÝ¯…Ñ*(,®•¾5|úË*U‘¾³	K8@ú=éÔ¾ ÁÐØ˜I9$`ú²s"ÕvÞ3²rë!dº(Ôô´Éè[ò.tOa@é1x¥F÷_mâH:®¤$ìäZ³Š¬Í·â"úÖ¼!Ýr@‡EÀu=A”.ŸaÑÐ¹3¢šñÉa§ç ŠŠH£"AV³‰ô#T€SÃËt»“ó¿>‰œ¿áÏé‰®>ñGÇ<>¾teÚšÔ£Ã¨ûBu„„vÆ05GŸÆš÷)tÔ8à›)•8¶W§±Òö-Íc™»b—[1¼kB–O­œ  G…ÐåÆ8ÞNsH°xŽå}ô,ë£™CµJMXó@qeÌ1ñÍ/kñÍ¯|«ñÍ…ª••c	ñË=Á»ƒé„ÃA½ã#‹t#×íPç<P¥ÛõúN6é´‡Èp‡å¢€Ü+=xÿü+TPUœ>êùt>s¨½‰=b¬]!5f¢ÈñÉ"×»ºîŠã‹ûQkæê:Áx§À
üeß5~ŸÌºZƒÑÖ®CŽñ	%Êü—x¬ƒy^Çéìåöh$ÆSn—„°¸è’ú Y"¾ª0çþÈôî•<$Dï*ü£Ã@kHî¸Ã¬ÿÿóç,ØùW4ØoçžøoÙÆC°ÁßBXù¯ÿÖq”ÜYaëh†d±ðúcWÄõÄj†ÖŒ\þ¾¯YFˆ2‡o^ÿ2È¾ùú¿M0ÿ„fïöF{9ÌYÞX"2wk%àâ»²Åd/Ý·²ñÌiå°	½±ï>6½€ MGBÒn¥£‘+¸‹¢uéO\HlÒ´B¦¢hçA÷øÐS`®¸$ymŒÔLÆéÄa·“ùCÝ¶[8~¸Î=è3dxH§.Ãá8ÀO3N»ek1í³¹'NVÒ>Ÿ˜ÔŠˆTg†ó¸±¶ïNÆ¼ðîSünÀçÁ° `°)`CàâïhPjdG¹€—Gv‘g_éÎŠ4d›Ž”«¦ÞÕ¹WÁÝb;CSÑmª;³ÂÖž>Ú+G/_Xa'eã$fÜËë e–}øÆ'_05Kù½@ÁêxÇÍ¨õÝ>p"‰	/zþç¤ÌTƒŸf*}æÔ¸þfÒ†h|·{™ðphQ«#îÖÐ«fù¸íRÑ¦fY?Ÿ–¤©gÎ%ëõzxÃÛ~r@Eÿe{ÒÃj«ì¸Ï¥¯ât–½Ê‹9¡zó@¦qÚôá
”®ÈªÏ]“eÊ-:[ò€.$Øµù¥†¤K[§¸40ˆþÂ½òÕ‘Ýh‘EâéÅ;`á÷î`Öxõ'¶ 4Ï]^ögfäÂR7)Éj7qé	Aæ¶mÚi»íT•/é0qÍ:œÜlð0ÇˆXÍ7?)oÂsðR²aŽ-â1¶€$•y;¬Û5!€@àíðÃóm<¾íî	 ³?$wˆ·©9BR?ï9]¾]Dåšß"HK`}eÉ¨ÍzÂjU³yf?ëXQ] øÕ³ÏåñÏõ;‡âgc3¤ù	eFw5xíá?M1ä1¸»ã·9>FŒìÏl‹OÑuÔ«—(ÛBÁ7[”æþ”Šo¨XEJr&ç]øA‡Ê+fž	Ÿ†Y’Ö¹…`ê0{>CªÞªzé1ÎL‘A‰=o:$ç*x¶À:c–¦™Á¶vÐš×£©{ŒÖ¢n?hämÜ€×ç&`#
^D¡ª±WQ¨ðeä¸ŠøBíÐâ“¨§f9!äŠÙî$ñaãó]PÖË%Þæœ7–þæ-ö®_aÆ#óól„7 ‡ _jÛÕm2nƒà²³–±ô:¬JÛ†ÛÕÒVb¶ý>ÊG£¼ôYxÛ‘ìaÐÚ÷H<Ûƒ©ïË3U‚b?óú?§ÉqækþõÐYmægA[×‚z­+¼èkéÌ‚¯]×QÎ@£KÚEîÔEvà³?Éó˜FçòYÈ2NÁoù¯ÈL¯ …µ2×Q‰«q­Ôôò£Šy,7èÔÊyÖ\¢ø8mˆâ¨/Ë
Î/ÉNüÝV‡¤ÏÝ£nÈ³Ý£åø‚íCH=¯jÍk©Bn}Ç3U‡l©Qþ1d¸»‹ TÕdTu1¶Úîìr[Š7LE7sH3L|8É/&¦ŸÓt'¹±7Ë&Ðã³©N‹<éÆhÃÈÎTß××YÝ?#ç6«<×›ÁÅ‚ŽtJ ;{b‰-˜]%‘?:¼²oœP©–Q6$<.NHôÀÓÇ8²,Ë,ÁLqÜR#˜]î5ˆafÌc)a¹jŒ¯Y—4Kì[^·ØàÇ¯Nã,›‡öË+¹éòÝ–§T¿‚æïb9³n–õ8à¾aw39ênZa´„69äc8ŽÓ9„zð2e	RWTn­™û]Ü¢ð²ªœÌëÂ1ðÏÊ2=DôúBs âÚ³÷m\|Æ)Lä¡éô‚î–ASñkpßÛÅòž$H¯ÒëtRàu(<üã<e\¡?w»ÿú	MC‰±SŒ§ä°ƒ?É§„Wóú,!N¨ÎêŠiªéL¦z¥ÞYþâ1ðb4X±0®õ:[ $ë…¥ÚÚ™Ï †ø‰›ù¬uÌZ^·§©?K­ŒŸ×¨cžks];Jaƒ+m­3p´™
ÿØq-)mé¶b‚ÂòÔp5×$;â`Vàm ›0?¢s$àànl¼íœ¡_{×zù(­†½t¿¤¥H±0ªoœ÷jªÁ´KÈÐØ [+9ÐË7¯Ÿ6?ÐV¼5Gtr(ôë‘Õg‹e€©Uên‚>õ h„úŸ0±ÙWÁXgq¤•ß\›êÍ¶ù'd¾Í?†¹s-?5äns©\ÜjWÖmsn·Íw÷šmßíŸMOwtã-0žu7¸E÷ßú­÷Y3nþñŸûš}µ¸oÉú]5ö4*þ i3¸ì„7?ä¦\ã<Ä«jZ€#ù*C¿ªŽ²Y+XGØhpêy—Ì4ô4‘ÙàSþÔ*×*ò®Ø"Í¡ü~kïBíTEZV½rÞï ý«?„À	¿ž$F¾r/­ŸùObÜ9ôæÕÇR<Ðè ®{'¦Ë³~žUå¯ï‡¡÷VˆVOÎ:z,åFœ—`Ý|±Xl5*†6™	íâià¶§å×Ý5C†õªÂ^ï>à{iôV‡è|èÍåÂY‹rÎÌÞ?s"º¬ðezßïÚç“þf029	ÅA;H%ËóÓöý„Z´­ãõúttø_:<>™»ç‡W^=OÆæþy¼eÞž|Ÿ]Ú°dGaRL„™33Ý¡Š..(Ê'ÉA:À¿¿,Š1ü°$™$èÓ		U®«ÕBßge\—­òþi!Öåi•VeO¡ž\C†e53—bfËèÝ +EÎHÖYp§Jþ¼6M—držµu]¢Öœy•ü©à!˜fè6kó°Þ.÷‹
ìM×i¾ ètœ@ÉHVÐÑé­ºã}øƒ:û¬B½·ºØ¤_éqˆu¢x;.î? —ªCÑ”&	ÌÉãcãÓ_:LÑàªÜX7MÑ„¿F’Ñ/ðÁ !{€:Í°!4mê
ÒÜmGfPþÅeÏ#È«ß†ÌW”˜Ïï¼XîªXÀ–´Ò%¹.“‡+;ãI0]VBðqœ<Ëõq~þÕ(ˆŠf˜Ó9!D×oõÌÉ“j1Òá0)ùŸå¨ÈÂ8çíJíq—v¿.F'ávâh•¾º´žoKÈdb¹}ÞÎ&"ìSwçÏ Þ|ýÕØ¹4^]ÄwzjGélB Œ9tïHøo2ÇØ,ñ.!…íê]«\å.×Ö! B=g³ñÃY>Hà?¸K²Œ —ÝÙºŸõz=ç¸š8Þ°uÜ…Ï©½$–æ’n	ˆ’I”K ã*—üÇ³Íë’ˆ0Í{(ÃˆŠÑ!dtƒöJ2¶yIÍWû3R¼ŸŽZÊ5NIp3 Cé¥y¯+%è£÷Uï[óúËÜDî=ˆmÐ¿‹ž60žÃŠºÖ&&r]¥Œ×E+‰·"àUh=8û­½-¹MÉÓ!„ÄÒžR*Æð2×{¯Øñ·œ&"pˆãvD
¨º,ÜX^©é;N‰Äíê”ÖVö°Ó‘àá¦žˆYŠß¯Z¹*2	YL€Üš>>æç¿“¥~óú/'‡Ô~]Þ
µi†bÛ¹,ô½êU”ãxˆ$ã4ŸPuòÿWÃ¦9@þî1š4±	}íJ$2«5_ÒŠåú3èzìšS‹6u°há§ÅPÒôýŸ’Ag(ÒËîä ŸäÕ	ôñßÿÍÿM[{Uq?'ôl{£sög‹*øÝPd†ú6àÉOjÓà!{o^ÿ?ÉˆÇzDŸÚ¸_F^ Ñr©ÆÄÔn@—„û ? -vE1ÜÎ¯ÿ>Õó=Ž\wg÷åØÓ·È‚Ä2ºP„Ð}¤ç:aTÑð˜¿Ö~²}H%¿ô-ék/±Ò2‘s¿úEù'½[;Ãóß‘{°U³³·aÙ1hr¸àOìÒ5u—ÓíØCkÖa³ ¢¦þ£št½GEàÞWwøÖÓ¶S®@½LAIâÍ¹/ªW—î¤/Yƒ«¦âEð•4t¡LÞ<¶¨«ÿ#R¤«¨ðQc4k¬k*ÀüU~ÖòÉ$ 9ä„¹CÿÍ¥•¶××*ÃK¶‚e°[÷±2+·>Ï„Ú‚¤“¤*È7ÂÑ\òví¼ûü1Kª©8.¥³¯]ŠË:Y2Qÿ}…‘Ï^ÿjžLÞ|ý_Æ,ÐÙÍg¾íÙ°€*?õ§óë¬^@X¤†…õkkÕŒv¨´HnÑ¶*3¬?4dîÛ;£Âiª\ûŽ³ntþu?9þq2¿Ï5"¥YJê%q^m%|\šG—ÎŒëM(sA!ð§›r«>Ô_ÄI¡Ì¯r~Ô˜~ùMz9Ò°-+¶JX˜î‡WW)·;5¦àÚŸŠ”¹b'C`@Vþ¥¡õéê½ÁT¥¨ª@%úçRI±ƒ‡çÿ@P…ÂšÇ¨HQðó(Ngx5¤®rM¤ãy½€¶¯NÿiªO—¢ÕÊžr—pÑ¡uâ†Ô«_¢“SlO,VüMj¯BEáåT3<Íª
\ÊõA][–Fqn—¡jŒ»ö ëê€Í¹^ÃŒjàarë)CÐ1³U­¯j˜ŽA‹ö¥vâQ<£V×m¥ésÈ»
„[èñ
WÈ1»š²{™6Ö5?]®ˆ6#õvn…OáÞ%?!·¨˜¾i*w!ú\»b8Ï0å>í³ËtˆÌÑW@"{ü
üD×¼äÜòµòq­†=ü"yŒPm(
B”êÃt?Ù§@H™ËÃ©2´ÂcAíiG;j¬q·Äå+>…ˆâO†w…“I#§”üe–ö†³¬’“ög!•¬×d.ŸLç•[2WL!@>\“7åq>¹¹rÅçÄL®Æ›+^ñ¼-«lJ*»m_¥£9¹›=3uV)ÄÞÎ8wÇY¿=Mge¶;©Ú‹CÒÃþ:–ZR<°C5ÝŒÊã“”€WJ}¢Èfê1%	©§DIý¢ñxŽþÝG;¬N`a
T¦ˆeÝˆ9ç?I(W@røæëœ@Ê2rwy²ÊÐtë?Û~òx÷ñÇ<•†ˆæÜ³¶ óIN Ú@Pê/û˜ƒ£ç„^¿Fó»Bêý7×i^èžXø¢ #üÓ¾&‚*^å¦`rÔoWýE,tM|Ž.œZhõ¥^–n}¡«b‡IŸ¿ý»Â/‹ï][Ø“mx]X,í¾à»Ùø¶`@þVî
UË»)^žÿ¾?L†9¨Õ¿†ƒy6óðÅ±ódwowgû!¿90õÀìÍëÿß
ð¨ #v*(ozK8Öp%†r“…ªq¦Š—b}L’f¨ã4žT÷ÒôX1œîYÁ Ñðq‰ÆÂ¯dÌ1wÞ¼þ·É/æ©c³|nÕ­š7èvãå4]f®Õáž­÷>¼þ<‘j–ü#˜r%ä×U³n§"ÝY©¥òüª°Êõ¢¸Ý¶NK®íø‡š'?NÎ5e¦ºÑpàš«jåŒZ=2“³ýhí'?ùQN£ýlZ6¦K;ÃH/O*x}oÒO§åLIV)SÊ'UºŸÖ	ÊL'ƒä³]²â°wFà&! †:=(o	Ê“¯ô:¥‡›ýdíG4dÛ'ï~aã&¤ÒìW½q6.ÚíS8y¹= wê*ùòtNz¿øC=A;«ªo³c¨Èç«<1ÿ™Šù“ƒ|’Ž¶­ÇÐÆ£t
	—ÏD+ò—®½\MÀ¯.½Ì@T‡v«	¹x£ì~Nî×ª˜e÷f³‚O¯¸‹³ŠóÜ%[0ƒêÊpVé1p¿âU”‡ÒqH«é.Az¥C´
í<ý|—_Ì³=±š?:Óƒ„Ò|&×ô)¹âûÃUê©?|ž` EÐfí=W,v_¶Oö¯ŸÌ*´Æ]öºmwsi}]iG.?òjFy£³à8cÎ—Îæ´w±Â‚:[“/b›Ú!ï‹Ù‰³9ý¥³IÙ&!Æ*‚JòClå©ø©Ö»q
&Í[,ùGÉ€@6ºŸo%­´ì·’¿HZäÁ/ ÏnµY•<ÕZµ«©C¡	€ˆŽJÊUáÓüß¤(ê/X9¹i5îð÷Ç?N”7¢=–nˆ´ #D+/Y/´uzhFg¬Ì’¹až)s„Ò»ä†ì§4ª+©ƒéÀrÂØW>kR[ÎÛ1©D(x+ä³éÝâh¢Óè2!5f—+¦i?¯NÕ\%k#¼.ÉmN €3ú«Y1ùlºÛ/Â½îºÌpÙhÆ¼HKæ+gÂC2NãtðÇ|·¦4’Þù/³AëV[¼PÏ!ÜL'3œk>ÖÎž¤^X38ÂnåžùT(AÃ·ÚpÄôñ°J÷ùÈÙxÌÇáñä%/h]&ö‹pS
Ò+x]é‰Þ	’öÖÖ’û æ[3rG·Q7¤G5ÌKÒ#^àIúª üÌötŠ$-ïáºü7•ÃØ;ª.»4J÷]RjË@qÀ³ç·ÚÏžckt-îžLÒ1!Á€Ç¢Â¦¤}@È5ò ¬”éBjæœ÷èwŸç‰ÎûõN²‘|RÒJy0ÖWéñmùK„%Pžå%¢‘á¶ÉÓý¢eéä#Fuakäñãò²KÈšÏó2U‹ç„j9N]¸3ËÉ.":/ŒƒCx—A1Fƒ
fFqéj‡0ût„íkU9ñÖAÚ'ôFñ²µ*'ß‚cùLš~ó¥?é°·<«rÌÊ2`öoŽç7ÊzŠ•&…uÛ›Óò¿CšC4ð“ó0÷ìÉÔ:{ä‘Þà—`¿¤þñ4Œ½§EBªvŠ²2Zå‡áY(ºût–ŸËß|>Éú„½g§`•Õ-BTœ©­è:«ÞÕ-Ðf6VÛÛ?h«da<äíh³O]oÂ@ é»¤ne£hóq<‚¦5-ôL;ÅÎ«ëº3½ôŒÏõªî>¢åñžðÌ×xnÐ`ù´™ßw¿k6}¬ã"ì‘W1/å
&šŒ‰ÑwfYúr@h¬ÏA®[ª„†ñ*ÌE'<±¿ÈÈ…M!ÚÎ#äçJ–\b»IŠ|6AŒ	?#«ÉQFÚ›Z˜¶—ìŸ`¡Õd^¡0˜üä²1Àu_f>…›T™•Uwð0«Z¤åaq”€ÜJˆ‘ õV&…|s 2µ2žržõTz˜—@:s5yÆk<à’=‚^™ª¼{ÛQ^€*|_ý^ÜTÏ-þeF¶óU&&+‰ˆð´97l<ã!(nÜL6Ôl<lÑŸ}/‡K¹PP@™K*–Áä³8àÖD*›/œOä¼9Öu•3…-6IäPØÜè÷±øJf†ÅÄðûÊæÄ~‘ù‰£®ÇLãØEœ8BËiÝÄi¶ð\¨É=Ãá>ß¢&g„ÓË:Öt	ßG)ãÔ^AÆg“ü©“ùgÌh[¶êÆR³p`²1¾G“ív9'xègCM‡÷
ƒJ±û£"­¨‡]hÒÄtD ¬½ö?õÖÈöú¦ƒ¡0?2!›ñ¹Ùmˆ¼á™ìêã|ù|œ|€û€µ,Ào5YW˜ ¿íyUtË“IŸC8C²ÀÊ3e	F½wp@^µkð–¾õêqÎdP2«¼g³;2gR¶ã8ö†´s	Órž³ŒŸ¥ÇÍv×ÏùøÞÏ¶”…ù|÷éöjrw÷ãÝ½í‡«ÉÎ“GE”	x(’‚ÂÙ‰\:ÿzá2˜\;—Ê|„l[1i‘kº Ÿ3Ò	­Ù1¹Éàûo]y[Š‘R•°IvÏN¹•w5e­n¡Øú#½ÃÍ+tU	k1(ëˆ»—ö‡:ä°{s\éç#‹=dìˆÙ,krºX+ùÀh>À6ù{­Ø4€4\…÷Û„¾’?ŸCzøká–ì÷¤£ðá½ˆ%›†UÑ=p¡wt xF
íÖv<¥ip> 3ýÈjÁCÇ‚µMÇ‹šf	´@'·
B{ÍZœÔ~Œ‡Î>Î”{TÐWŒS³ “Ñ­HšVèÇUÀŸìÃö‚¨¶Ô÷¤cî/7_‡ž¨Í³cY›Ûé°Å0úÓöËêrÐ¨K{ï}½ŠÝ³zì7êQ‡‚ŽHÒ¤‹Ú|åØ`,þ¿=°
H†¾ÝW_Â"¤f.™…áu!Nv<M'¡ð=ûyÿf(EöŠÃÃ%™T-e:‰¯3íì*¤£!×£Ïîà˜Þ”;Œ!ä~Ú”ê@B]Mív*©Ã”“}j—©r@Ü}Æu%XM8'pÙ“²½}ñðLiE-ýŒÍã¹lW`g–5%¡7‘½rÖ|®4…Ÿ±¥´YRà¬F|Í3àiõÚ=EÌ	¸
y¥)½4L›S¢½žþŽ‡&WÜ‚”]ö xIE”ê)Iî›¶1^z¿„j¾`×æz²¯RKçâ\S¾l—Xâ³KÒœ35w‹~{ ÿöW‘qá ÕZÕAhU¹çLli]Ëðí´éÁ6ˆ¤³Ù«lÞre•Ž§mNëË¨¶iˆt¿ÓÍ·Æo^ÿå¹ýÇaUªþ\h Âg§€Ó¥å§W“O¦µKQkï³OïnïÝ3æÏ»0x#Úêg’!dáö/xÖW¹ÿ‡ã<þÍÏ¬vÅ2;O4ä/nz²AÈÁ7Pz5=àæ“t°$¨Ç¡x§Ê2)»î¼²E÷òÊIvC|.ŠâJëÀ Ø¨zÊb¡TŒÙÈ³ÙGÇ{¼	&3^mac*:SP˜—P|§H*ÕWT#[¾Õy¨ÍtJ€€çÀ!½JžoÉU^‚æâ¤LdÒšÍŠæ<‚9±¹/[.†)çãl–÷-ÞVÔ¬ák=HÍÌW•~­Uà~Ý\Î%Þ×Ë[·	ŠêÔûD”hàEê¶ýöaŒ½×2ë<ý :+…=™8]íÔJh¶$åUb8Z’aÒ„È
xú;Å ¾¾svhµ -±båÆŒvF êýrmÓl|úÍ­×;P–èþ¬`öÒÒg$÷ÜÙ
}Ç6ÕS3~KY5mÚzSÚÄÅª»>¨ð’ñŸÊS-á4íî—íÔwëX^Ò»™ŽáÀó@>lVÜnÜ]§6qvû¢2÷ŸwlˆßØY’€ÆLp–“ÏíÊø’uâêh¥4	Vìt E…¡Iö	JmséˆÔŒ¥Zÿqàc´¹ì´„¶Ÿ^Ð
,…ˆÀè6Cw“b^¢HœI’¸>Èµ­Ü VÛZÝJ¶ÖPÌÕÈ€«Ø ²SÚc?úpý¹«kÿjóhãð}y-÷gcÞ0ù*Ûý(Üª¶äyù)µ˜„Åæ!â€ŽoaþÍ^‰·Ë4:ú¥MÆ¡Ýsò7¿ä<·ò§Øoà(øxN yAÃ¤–ìü{.XaaËéÖWWÆ¿yÞƒ‰³šìk°f)¥éÒgz¿Ï)‚úH)¹OKî‡Kr“LÜ‹Ö¬6%.[Ñ)ùãÆ€Jõ}»:‰£ºR;¹¥:Ñ¦ÄÝÂÅm|d6s«a3ÐJwÃ€¥uMÓ®)ËU¿ëÁª›:rH„íªyÀR_Ø»lhîÛ^)QdvÛrg!òìyçš[­ÿÍýÍýÍýÍýÍýÍÝ¨ýoƒæ~ËÄñôðŸ4=lÒ‹ß%¢XPÅÌùŽš‚xHa•)	kOÒ1é&íáð‡Z´-S*Ô>@Zp´Š$®•AM-LõnXØ¡ßÑ«ìÓ:û´·N¶KVùËªxÉ†ƒßÙxð»]þ—é¨ ¥á-ßì’‡Eq8ÊhYú–¦ßíòÓiöƒÖ`?ì*hÒE+àWZ¿Ú…_¡5”…o´¨À¨ZÉ7¿†Âì-¯¢w­Jì³¡8ùB‹rœŠÅØ ã{¶ýë«|oÉ7Ø.ò‡ïùJ—™|á«H¾Š"ßÙÌÉ7:­õU9jò‡³®:H.9j6x“e\ ì÷3r¡g!PvŸ lb»_Í]›ñôÿ ýNè7V;T{¹=PÎˆ4}É¶X˜ð	¾÷*›TÊ±ÈÐ³†<»›¤óQÅotn–¢Þ`HÚè·<²Í¸É}ê0i¶Æ¾~[_Ú_*Ñ©šµæíÖçó<ÿ_qR2¯å×w‚.——ìÏ¿Åñ7õæõorŒuþû
uú¿­À@é7Ur—eÝ–QjT#–3a*i;¤·Áþ„ÕRm!$gÇxAnú£XxT¶é¬›ÁÕÍ˜(z“é
lY{ŠFZhKG´òQ½|Z^á€+ü¥Ð
ß°ÂWjvü\#Ò6ûÒºƒ°?à —ŒAdÔüQÆ,ó;¢&sÙ¸$ +¦kž}Ýn]qŒ}&Ú{ï&ÂšžÐÛÖÝd/Ð<à½ié-»P³Fûä¦¸éöjË=ï˜£b7†·&ƒ«ÞÞZMVv‡xk1Ø³êñ«Ä[‘ƒªU“Þ)ÞzÌœÞ¬e^èÜïbqÅ²ÛS\ŒòÂÃfÍFñ®®ZÒŸ*y€l%JH4ÏsZrGš'¥'Âßœà[ƒl¹ç"²q¥Ì”c°©Ä`Sƒ)§´ã€K‚H	Lo#AÆPé!Á¤÷Wè™2ˆècJM}Jš€†²Ái8FF¦8`Y‰ë„¡Æ®Ñ£¥Ù=C~ø¦áG?'9\o¨S!¡Î®E=8˜WŽõFw·Ñ^w:ú„óXûT{‘HGM1„U³3˜jâ)d¶^Ÿ=…ÌV4[ÎÌiýmVÑŒC³€ùãmã-5Ã¶G@½T¹·_ÅUqò	GçVÅq‹i¥ÎTUðYÇ>ƒé	YÛ k¥2ªB¶LA‚:*®Ý2¨³È2·ðÛmLJ7Ð,z^J×û¬êgˆû:‚£,ížýð€½¦ƒe•§v•7Ú"XZ›à‚¶Øwõ-ç{¶ð›úFò8[ì»6HÉÏlñê{ÁÀlÑ¯ê;Î±lá7õÂ›lñê{ÆlÁmŽ…¨åD÷jY³QÍi+¯4µ(µZP¡‚fQ›Ó®4»¬÷:¼mÞ†ö9W,‹m<¯Ù
;ÊÝ9ÙÂ 
·{Ù8ÍG6ŠrŸ:-:Ï´ <ùÊÁ:Ú?ÕÑï*Š,iÁMeùU¯a¶)³l9¼²ÈOX\Ö¥f¹â$ù{ÅŒ@©Öì®1ühKñÈÆWó„ tÀ&Væè $3«3=ÓN–ßB|µFkMÄ±Õ$ƒÀ§1;U·0ÞM
W¾”â›+–šŒ"ÊØQÒŒ8³Ö¼ÁÅ~0`œáx>ªò)!Ÿ9Ù©“}Å(ëŠÃö
åÄ,ÞåÄª\¦­—×¡M×£¡þÍäh–WÙøAÖÛE¸¢ö F>¡m¥*¢X±D–bÀD+Úî¹evØ^U\A7M|uÚë½í?Ím´ð«×{™Û/¸2í('‹¶{7yÿ”Ô>K&EE#Æ$¹Œ“¤³YzòBk[ù
êTªöc:²ÅŽµ°eÏrdýÊiÖÏ ^ûè$IË2?b‚ïV«É'O’ÃlfûI[Æ³ÙÀNt|ëÄ‚;H^AcÞS=Ü‘úWäŽõ³zaÜ ø˜èÆ #X$ªd£ºƒ÷¾ââ¤6ÇK™ndú2}+¼ÓGŽáõé‰£¬d¢V¼`8µ©%5¡ŸÚÐ&ô#œ8a.Ñà3Á°Vz¸|à*gVòpÙt€©…oa¾–.w4k³;µÜmìžÜz~6Ä¡ââ™TV<’Oe¥ãXUƒY¥1Â ”ù`f£LñŠ V0Œù
’©}L£1XÁ(ã:ŒK¨h€óžÞðã¢Ê0Å±q×÷I-ÐÕ¯*ÕKH1Ê	>Oi¼uª“ƒÊ÷¶wp íYˆò[ÅÙ‡HÇ·T]ôŸdd\@ö‹‹Ÿc†úÕŠb„1b„XABQ‚&L 7¤ó]”ð`!ñ)@ÐP¢?wyUº WcrsW%)tÐ« ÐÜUA•EèU˜ÄÜUIQèµ¸¸ÜUM‘\è•˜ÈQE
4¼:™¼^¯¡·©‰BBê˜Æ-!ŠOÓ¸EEübq½¨[úRW«ð%Nüòv0D0	EìBQ²V£”´1é¼öú4ÖÇgº„Fo#V8/

ˆãR/bå#7Û#¬J›Þ.‘À™‹»¥rZ½_ŒÇyÕVŠé2„ÕðüwcÂ¿yyâ3Eâ4HîNp¬œLMbÙ3+<8‚l½äƒh+!À”ð{ß@˜î©q¿1w5|Óé™úÆÝ¤¿TÂ6é/¶cŒmo9ÿáà×Kð³'»Á–„dK6“-wJ~¤åF½ÈÅ`††7vÙ8ƒºÒÐ)=\Š'´±jdÂÃ=‰öôlÂ˜%è™ÐÖÉñù?§òøõz=>];\Ç€FöËÉ}Ñ1~®u£Ky@^>RÆìàÚ†LË9[•5aˆËœ˜ðÖNhIÂuàÑU<ÀÝ½÷ðž/‡a’ôS
÷ þ5îF/‘"À—äýzÉÀ’_ÌOÞ¼þÕ„eƒ¤YN1-SÏ»€ˆu@M=ÌÊâº‡\3_Š+Æº!]*4¿P ùýÓP÷g´¿p@{Œ¸×Ýt™ÂRz[Òósxä	Ý¶\4E£¢„æ¬œgô{õ
tÝà¸¬ê™%kŒý*‹ù¢æ»bÐëp×àœBc}»‡5E9LF˜2æä¾›Óªèÿ.^3ªÎ«é•ãPDî	¾ÎÎãî#Ñ}y,zasËokåÜ0þðÍëŸcjíÀ¦½(¾wldÈ3‚ü3™WZ¥{-«YòlS”Y¦n;C*mymúéÅQ»óèô\(£þÏ ¸ûÇdtñé\‚Bæ ×ÚËI‚XOí$àªo¹‚·¨!sk‹ûAsF²%¬—·t÷[Qà9.G!}‰BÀVáK.ÌÓªWê[[fÖºÏØ#B½”XÎrNQkI^ÐðIÅþG°¥ä…4gQäcjgÉ>¢Ø7õÍ¯¿çlò†ã(·óäPüÅKpŽo5ï¹Ì_J˜þræ4!q…	ì«óßO†t
gé?'7Ì×ÿ0ß¶²Nã÷¡ò¸– WÔ•»¸§ïTºžÿõ‰žØ•\:éAvýWIÿBHBpÓ`°öèÑÚ	ù$lÇ-î2ÑÑ"Y³—å0Ëà ÿüáÓŸ÷æU>*{ÿ²,&_TÅø
O¨v7A-„8­<ùb’q‚Ê|Ù³'Ö&obUaæhs¹Ø÷óQ¦T|¥³ñ¤ìª0Ä‹¦oü‡J¿ 3€/+äJa'ùï3Òu†ètÉ]ÈeÓÁ•üâÑ£/`%[³Þñ¨<4®ëjD¸/Kî÷³‘Ã¸ÃFÌœvÑdbf¸;8©À¨Fz¨ÝJî8ÊâÍëßšëÿMèº$%ùŸ#Ù_¨çÂCh0j_‰šj¡Q	ðK¸V/ºO©ÔLÓ—¸L¨wª¬Âù)Úîbï(A¼Ìc‡^CjRx)—"C7ÈÔÍåd·Vx«¬ì< HÑ•(è»æ»TwDsRõÒÍQPUÃH78GAM)¢x©9Š*Šáæ(&•Ü/ÍQHÓf(.iŽ¢B=Á\ÑEéú¾-T7P¿âuh_j£NÍ$Ÿ{£²õ\W#.åj„åJ9—-¥,Xoágüµµd£‡hUae±Ö8—t0¸ëÐÁÚ4øª†G:v‡›½r\¬új1E­Ï˜xºÔüï4fÞÞÅ©GâT#1v³gŽeÝeFÎpu4‡ìi6)ç³R¬dÙ p¨\ŒŠ5,ŒäåuÓGwf½L€›uÜsà©¨ÝuÚ-þ^€YkÈ”’¹\œ!eÒøæü¨=sUâì)¡Yš7fO
DåÙñÃÌ¥ÚøøÆ ¥æJ.§ä¦êžt¯¯ÜbmB‰[Boì¤³Za¿˜²YwRL²¤¦w7Gük	žfÝÍõõµ«ëÉþa÷hHhÉ¤ §ä`D^óÁ ›¬Èæí»½+PõpFH¥lRu«¢;KfÅ˜§p¾²¾NÖ¦;Ï¦£:'GÝ2sÈë¬¶C¥d¸jÓýîUmöFÙ1µÔêöÉHýÃtÚ½”Œ÷»FU»ò´»	ÃcMf`ñ™º£C«.ÍcÝùôó”œ\-‡5d°¾âJ]mö¿¦m˜2÷½¼ibcÇ`'D–uzðÝµaYgä!¤n•«•[‚IØÎo¬‰Få³G€ýßÍÊþ,Ÿb s´KØIÌ8äó1ýžÃŠ“®‡È~A4ò*Gì ©WÇäZA©“bV(6 cT:Ö bMB„(;¤kHí8¸ ë’“§óýq^Ý<u¸žŸÅ´ã?W\â)»é(KJ?L÷	Cd.û³õéñs \&»1'Œã¬Ÿ‚ÁÈŠñ™F ü?}óúŸ“ýó¯
‚ž¿*ÄªcoÎq£>œ‘ëþëê¢$GN–{
¤2øûB<aªÀ›
7J]ôo›†^½r:Ê«v«ÛêPüVëÌ×fAÓ™î íÞÍÓö+ˆ ã°•¦É v„?43t°ºÀäv=R]Ü-?[M0M8ëA™Œ¿¦¤¼ýâýS2—³îû§ã³ÞªggÎîí´G¨»CË4¾hŸóD½78F¨¨<  ôB	Ñ,iH*d³›+¿ùõØEÅ5m|5³`À?ŽÓg›ë›—Wòÿüÿ*þÿ¿þešh$Þö6!:Ûëß—ÙÉÍÓ“3È'ÒD£sv‹¼àã‡Âþau:îM“óÎŒzgGpãûwO–s OàøÁ)ü£9€TXÿà68Ëô€lŸ&Tƒ±•ll‚±û‹Õ$§Ê„<ù ÙP,ž:½i:xZ¥³ª½I6~½Õéài7>­cqZÇg·èìòõ[?©N*P<Ž&&.»‰‰F¤ÇÛ#>Xl›6†	¸o.Ý©®½¤ZCtUb•e½ç­ˆrnžâŸ`¡Gé”#_<'Ïßäº¼¤Í,ØNVóxKDlkyÓaÄY··¥sskksß¾›§î÷uqßåwoqaxóô½÷,oY7²i0o}Øìõ¿œ—U~pÒÝÏª£,›$Óc£Í[6D®ÜÚ‘,æËa&„ëäyU¶ÖwvO¦ *Á2+~¨œåé¤º¹RÌ«Q>É¼Ëü—°Æcob²3Êû/	€˜¹ÉwÍhôÁu•`Ô“4l‚(@—<$Câli’sµÙ&È¥æn£we¥Móéh^îä³þÈˆ\êL„üô<ûÝXÝ0ÏIw* ôÐä%Pžr‡X4kÀà`ÙsÜ	ÑØ	X¡Âæ)ÿ€Sf¨i÷²JÓ­)Ò¥M±‰|/i©²ué$Ã÷|’¤ü[ŽrüÒEÁZU€Ôj0§‚Îî¥õõ5Øô8Ú"Kgã-ÝÝÌÎ‡½Î³6Ýcìn$|AÄ8&“?ê–`68DlÐƒv>¼Ø=¸7œ’¦/ÌV‚HGMø¾“FÐP 3ô¢Þ[E~|¬Ø\&‰ksà…¸y¼ƒÖ*ôì¥vù§nšaþæC)`Ö —‚Ù<×ƒØ™Ú­WÆáâ€Ð¡OØÄä›/Á“àoû,
BT‰œhiâÛ’xf¼EO­ˆ°FµŽô4ß®<j6u»Šëµ¦,XÄ6Çq‰Ö~Ôò‹Vääè©X!Ç¯~ºqœüx(>‘OEÙ#ŽéD`ÿ“ªV	c=×\ñ‚™âåÂþ¸Eþ  œ%mòM±m8ë4±Ÿ«UFÃßÚÅÃå¼\ŽYh`qJŸË@‹ú¸£fM!T;qô¯GÌ”Àìƒîh¿8ö†ò“nž¾ îû’ÜxQ¿qØE64Šî–__Ÿ¦ìòÈm"þôªtv˜U=Öoh)ëÎ°¾~\rÐ²E^nhHÑ)º©TùñÊ¸ø‡ÑÃj<"‡Þ¹ÞÍø–+ÑŸÏÊbÖLA¦šQôBí9ùþ@0³º(›Á"–ÇÜ@ö”¿Lh¾»ûñîÞöÃ?5€îÏÆf5–Éò ™´úGÄÖb/€wž<ZðÖ¨{gË{³Â&o\Ž`“#ÙR)åq±âXÒ†)k<Šä¹¿eVÔÏˆþôüw“a¯×(ãD#ÍØ­¦Ì–ƒÕâöÐ+·Tšfœ†£YjíLø8áksá&©¥õÊ-étsá&ÁÆ{åwô¹psÌpÔaÜáçÂm¢7ÃañM5âêbxºzÜè”ëÕ¡¥Ý˜\—êÃ”TçóZò1Zqžg¬¦±…±Ãq)5òìZÔEó—ê/F¿²(¿Ö¢×â€5©’Øe‚¢¥Æ;/î¤d–‘ÕÌ_ÕaÏ à)ëV98@¿“M“‚>™ùe2u/[´ƒƒkMá`¼t03( ¶5;hÓ?ÁenqÐ [WNSÍ„4Ý/‹Ñœ,í(;¨º—Ð_l¬m&Ýj–Nè:ŸàõÆU(¹KÜî”¾|óå5èbé ºþ–Ôè…þ­Â& *|“BŒV4Sn™"ÚärÀ’4÷€ÉÍ:˜ü0’tg— –B5ÙH}VoóO”š›„ºûpH˜ÚâTé÷#Z6´ÚGäŸ±°TwM¡·()''ôÙì‰€|t%¨Eªq§.ý³lLZÓAñ¢ìÆ£|âRƒÉ±;ê^®¥òCŠoþ	1W—îSå×´»ü'.»ý'@Ã]o:¢ëÀY+ ç*c/¶ŽtH$ÀZ®1-a®ðèÄ ÝáÃÇÚ=ŒÑa€PP4Héò~àª9ÕQc›ã-2tVcq+âÉŽ+=¨sm~¿Í¬ð™6ÂDG%Ü	5«Å‹†Tþò6:`¨éßº&P.,¦’i OÁµ²l7üÀÚÈJñœò›$P«+ÔnrX TInƒ–f5áÒó'„_ì$Ý„¹ê²ˆµd¨ñÙ Ê·;´§T[j
š÷
œ©a}Ã°%’bllzIêŒ…|Kà–Ômº½Îê;B—¡KK.BRäA‰~)é‡*ŒEH´;G62ƒ´e€í«VÔÑR),À¶äÏKµpìnU1TŠ
Ö'	]Š²™œ×>„÷:/Ô¯_'ÑzEì:Šiî¸C1FÙŒÁ†îâ°ãâ`ó1Æš(þ•#`Ì‹;ÊsŒqŒÁÇÁM!-ˆ„ù}È¯Õ;ØŠaj êLý"$Äµá[ZH8Ë¯!
¼?@¬ÿÃ Ö@|1 5âîþ ·õp»Cñì/æi«.Ä.ÿdAÖ~1pU"A_@õ¢ªâÐ8ýÍiDÀ:!‘‡m`â§™i94„Ã£|m^Æ8S—ƒ&êð±r‘)ž¾p"ã »wðÃiXr?ãè­ç÷Öjì à£4›ú}½=Ï/-ö^“Èì	,·<²ý,èÇÊÔzµ¾eßÙÊ~‡f¥.I)‹VÜÇ«ìÊ`g |Ø9ÇãXu±£+hh´GqÍGê¡k<ÝÒôB™’‚þ>ªÂ@zåÔyã$uçÛÕ~ýÇZoéœ?„¨Ò¹±™µôŽ÷ÄCð¥ðyÇQöI_¯‹;óJoôÜ×JëXä4³Çqœ<wÞ
Eô§=odèLI¦t¥<ï¨áI½ÙIèàÃÇ€Â@ê³¦4SÜ	}{gTË’+fT¦óäñ^œ-ccâ8gR»c;žZ‡Í©ñ`J‘ZvÆÅõåæ©¡Ü#T˜Vâ¹jj®ÝùnÞ²Êú-®!]Ÿç±ýÜä#*ŸyH'M5Ñ%äòl£ìãô— 4À­Ä“2Ç{8‰0w#H"áY/ÛõvÒ’ ïr¥¾&õò`ÐdR&g³t4Ð+ò‡JMþª:‡æ3.Ægå¹•ÈUÃãmWFP=ÉfY9Ü9r½ã”Q9Í'^zü]kíëRÏ	þØ›]mßÛÖÃ?üÓ<¦÷ñkæOÎÐîa,5AØ(CÛ#<:c4qÑ¯Iyš1¬&üêå˜ìŽ:µ)ÙµÌ@M­èÀNfŠ¶šâ®¤mî¹¿ƒ4njþµšq»2²9«xr´9Ëú³¶ÕŒ&2][M+1	ÜìOÃè\Þ¼þ»?ý/“!ÈaŸzXO?Fp wÄÏ5 ô§4à¥ƒH¦/äór¾atÖ2¬ñÄ_ÕãZ(vv\VŽ+ÏŠ£¦A'ÌYi]B°Ô?Ÿ£¥8Äó¬±½ž¸©JïÍC¥š+AldxN;¶² }££¦jâZÒE½‚÷WdpœšÐ8¦czL -@ð9ØlzDÕô§F–	¡<Îq!^]»c#a¨3VÅÓb7 {ÇgSýÚ¾ŒÖ 8rN*^¡…¹ýæÐhH°ü°‰<þ¯•ð©Á~Ý-Ž&˜‰ÃÞ1Ü ŸÓL'÷E¦“¦de0§á-¦í
~œcÖ¼|:'Ë§üÞ¦dÙÎÎÂ$©€AÌæ}4Š_8êÕ’àB²tìÛŒT7¢&ý²Àèãz„¤8"×Ÿ?Ð{¨¡±öfi9Üô‚	ä<‹M ¹JÄsˆCË8íª<¶O?	8a6E€L-Äœ¾¨óÅLÔ i8ºâR	9²´	44àÈÛë—{ËïûmCÔ¶5Š¶ACÂ<MÝ0þ¶O$ÿn "Šy;(Ñp-=Tã-í"FÓí@ô[‚†÷ÙGš-p'ª$àòÉÂ„.ä)Æü*LO¸Ì»„»ž“Íà†Cé?Œ…Â*2š¿íØÿ÷÷~Á³*Á·-Ž_ c«ÕqùÜ°'EØ:7î­âX¸H&<ç®{Ã(±`™@%uÀš#«sÃqyâ„ÔŒ1õeøWþÍ½¦žh¯ßÎbºâ$Ç-)”gëÑx9ëêj¡’½%´8É[>Ÿz‡¹ÃbvÂ7>4)£¬gáýªhHhÃ½›:îž[ÚkˆÂ”õ;Ÿúð]½zZWJ;¢À(QfäAááªºäœ,ê2¯x(Áý0Åu„~ÙÑ%˜y‡û\¹Å÷{‹ÙÎ/Ð³ÍïIÄKZ ³þlßQDLˆZu¼_	ï=o(‹9ljÁOÚÕwxÒÞ¼þË>õ”ªB¹Ÿ¸FgH=\XGjêH£ñ4«ÚJ†>+£3KßÜétze1«Úà»÷*›•Y›…µ×‡µ\^úŸ_ê‚€ëJyåÉ.•xóKM»¶kƒi¯–yé‹„kÇÝt^<?šc~{põ«UYXä9©à}÷ ?ÎþVx;¶°_V}Ým±K«>)ŽÌ£é3Š9]‚ J²A.]Â‰CØOÕ$9lD#®Q|¸˜ jCÂÎu/…­éE´8GÞxCþ”ú››¥HÖ¡]ïWÈ¹lEž«­…¾§®I´]#·ñDÜùÃç,ÉFev‘±•¿¬“à{’~ü&@7ÖÀ{ÊøL€Ü'E5×‡Ss…GZ 3Ö…Ç65YpÒžîíÕV•w=>èŠ<Ù£ýO0¡Øù(ÆCýbTÌJÿY5$DT¥ðîMU¦á…ÂIÔªè”l,7 Ç]2~Z3rà³Ñ€ÜSr @­Ô„†¨Û·E6îÒ÷rãxRó·´kèéÞ1Þó¶Ë{M^å~Ctá³ÿÎwoL{ùË½âåwo\Rð»7*9ñ»7.5\âwml`9õÝ³Ñúîeêúzü C£šÑl;z˜³0ÒPãý¼«±JË1ZÕ~88^fKKÛoF^÷ö¨¿àÂ#»vEçê–u5ôöÎ¿ê×Œ‹½&<®KÂ °Î>ýN18qÚuÔ06«	!j²ã­d2˜ÈZn<ÉÒ~Õ»?KÇ ¦@iKŠ™B‚dœÎ·Ÿ¾°¬hMr*9$\í4yÿ4;ž¦ÃjXMèY·›'-]¢Z×Ö™}çEÀñkIâ1ãl¤¹â4Ä‰
“_š¸@¸Å"AMZânÎqÞ?ÀqswÿgÂÙ_Ï†7àö#z‡¿<Ä0º•ÿßc°^/x¨“
ÔÈjƒl/à"ä;Ö ƒˆ:-J¦èwŠˆÒøžE-p6§µv³åŠ8ð!7dV'#‚±ÅU€yc—41žv7VY@›ÑSXç³[Æïú æ¸h÷×+çP€Ù¬ï¸ê®Cˆ“Ý»[‰$}T˜ÊT`Š[ÁúêÕNÝHßÁ¹ÃIÒrI8¬4—C OzW [²B½SŽµMiw^­À¦qnú,"„Ø"[F÷%GÜ0nÇ®"šVª8Ô«¼ÝM±©MåèÂrÐ!&ÓwG/Ã±•|óekµÕê\ðˆ/y°4© #K~çÇé¾KS+|/†Êr,|/Æ

ßhe†ßŸ÷gãw5XUØ°Žotcj,žYJæ–¶}Íƒõ
¶+î9NßÉM£K0ÞÂ(~Óuñ;ÈE[†c½ÜN¬UL¡¥‚¹×¸Øn0ŒÙÛ_ð­ötp˜iì½BÎ8é,l+AVš1§šñØÜæ¤ºlÇ1¯ƒ=ýÔîN·t[s®ßX_· ¤¶	êŸOO•h@2·G8ýœ…ð‰>úôñ
E¨?ù†*ÜÑ·GÉË£Ü(¿n>÷ßÌ&4
_¯Æ™¥€{È5}Ï»¦+ƒì ªH†L½êØî:¯þÑ¤dÝkœQ8ç‰RÎ‘‹¢æ€À§vÆ‚¨è8Ãg"ªuÝ‹â²ž«Aq˜©“}Ô&N´]0îÙ²Çv<B!GÈ¾j.—$[ül‡OusŽèR„>*¦Ô”ÖJD±ó¸SØ8H£ †7à5Â½_3n'`ÕÇ"Z¡Ü¾"ñ9ãQpCÊÆÕ1<_ìšW—á*ÑPŒÔÔŽ‘hM¸£¬²¨&?áV#»4CJ4êÕâKt¬„–mÖ©Æ[ÄvQ„&Ò8  ÏB‰ 6èÙóäfòìyL …O{û³,}Iù$N Ÿ$ŸìÃ¼{/³“R«Þ#«p/íÛ<ÛgäAâC¡¦ÇUÁ_µåg¬ÁçØ!ÂÇÕ€b¨Pißj¢.xo:/‡í&•“F±^5ÌæØ¬’ˆë¡§lØ‹98	´‘¡Žœ…f]Téq}û,‹LãÆÅiÞReäÍÚÈËbrÏÆÙ€-¨òDdonÖ&º‹n•MRž4 k12ø±à DtÑ˜™k½ñÂÍÆrÉ”T×š‰Ã«MËÆ„!m/¦­H´­"!5 w,‚¤wÇ(;Lû'÷Áœ°„[#¢êÿ  ÿÿì}{o\Ç•çÿú%Â˜&²ùÐ3ELYØ’5m8ë²û’Ýëî¾~ˆâ0ì »;À³mfA0€#“õn²ã/°ˆˆ`þ ÇßƒûI¦N=nzÝªÛì&)™Hì¾·nÝzž:uêœß>ûà8 ãO=‡± Qì ùq›¼ÊÍ°Ñ—ÏŒæ*;iB/Ÿ·i«œ”»|^Âè¬2CVèò¹1J_•ûY&§(=h%_C·Ë.ðÛ p	e–ñc-·SZls¶mÐ‚Ê<©pÚîÑM ƒ&}	ƒ¡Lá•–5t¹-®•Ð\}Î®EÐz)	a07ñ ¢{ïi"ðÍË–-†âÓŠoÁàI3Â»C@ÀKª¸1èweQñ¼¯(„¶Í7A.›yŒ?!»tŸíVûµ^Öjmftó5Èº«dižl¥äy3ëÑæí·3*û*QÃ(àB6ë²;ÿÝÁ¯b(Abì8ËÓ¹™Gq½¦ãlJ64—2ŽîÄ½â"çÉý¾êd†©$u¢ãôøÞ+ENµüSì]Z8æA©š3êJ$>XÐ°Âl.‡e7¬ðd­d­Ç´ø7Jø¯Þ$Ë+tÑZ^6¨,Cg6—ÏUY¹
9OASƒOon¸2…ý_}S¼ô¹0ÁV€`q…] ê*M’x¼€Ÿ3àïÍsB42÷Æår$×#ù`°(U
~Ó![TÈqD×—ãZ3†™ÍÙF9Ki'/ Íª”¹ïñ ÷n&©û:í¸J°•„¼±Õgßc»„Y¶?âÈzZ.ê0wzñøÈU¹0Ã«VX§Šúä©@WÈ­˜ó¤áÿ.}s¤a†™¸»t=±°_È[û–ùK?Šç!Bæ óy‰‡obtäA •‘<š´(%¬ „Ðù»§!ÆDºäÌÝ,l°Ô"ŠAÛ¿•Iâ™õ|”ûKÕTb·Q?Ÿû®†Ûƒ„wPÂVçÇÛ2•žZÎÝ¡ÇÈè©”ª–¯Œè²kÐe Y1Ï%ästˆŽýd\½<³Îá…x¿Æmž}åÎ9¼K½;ìu[©*ºøWô¯h¥;p™’û|t"ÊÍBÇ/sü²wüÇÆ{(J®EªL…9G:y³ë–Óm`/È\Ëº
í4HF—Úæ`o!F	u~L§ItjAêÌ1?˜,nI©N9oÓ¬³$4›¹Ùl©®6'$æxC¶À÷°à1»r	o18]û_z>Îª£ƒ/æOÃüths:o‚FB¯1ÅÃJ°J´ÃÈóìp¬ž³IùðÈcÌ4ž÷;æŽŸ¯fŽˆIô†½ÆToåƒ’ŒùH ‘U‚ð.Ÿèµdj¬ÄÍ„¾©ÏÎvÕy|öî°‰×Ÿš»YíÐÊ±=±vc¼‰9f‡18Æ] ¢Ä6â4Ä0Ü­ƒ’7×¡Ç“Ì±¦A×§”õÏõ)mot}tçÌ«d ÝJ·{c…Úk;-Úïçvdtæ ÛÙi¥pŽ±'ŠÉìOÌ>™ŸRÐáXÒìx³Öl¼Çšæ“Ã/jœ™«Åîm~â’žg£ÉÕífÉY þ«8œÁ£¤¨P¬~:È³cˆÒí HLbïH3£ì?yöë_x+ß)Ò¯ÍÑ3&wC>4'¹ÐŽ©S\‹å\°Ô‡»AÀ©ôRøxý£\EŽB$õŠ£Þßy«PÔQÜ±™ë3ìÖéØËËÀ;ÉÌ›`Ìw-\ŸXË'úœÔÖ©ô#et©Ì#3ŽÍ3Ä‡«zµ6WÔã]n7… ;Tð¨+Q¼ØÅoÚ1K¨Dž0õ±izsm ã-g“¸Ê%Æ§„`.áàÁ¿wçY%å%4T·³ÚlþmÍ“
B!®pl¹y²_vE×kÍäi9WEš…íÉ°Ê—2ZoCº8¢èK]âÈ§TIÊø;–ÌeÄw[AnIK˜unW<	ÙéÊÉîÔìÆ“eˆÚ/¤mw>{2$îñ¯ž ¥»ñÒx‚w÷ƒÑËA™…ö\b6›GÕ‘Tèc¬4Â>»%eO©É9ÎvLsb¹îÁw3Äñ¹KŒêö¨’QªTb=Š/§S-½þA§µW¦•JH¹Rs"Z[ä©m¶÷Ü¿d`«w§<s®ºGÀùY³Fu´£ƒ¿®5tžÕÒ“È(œˆ´×èj¿µïGdësd¹´rËS/ë§:s¦3F¤ëŸÈ÷s—ÚÊn_Ô\0ò(³g*Óæ%üQâGø”|/eAÊÚYmÚöÆÂò
6MjñÜû t£èðóR¼™–‚ªÎ¥â¥g½Ù7¸úýf_P¹Óy—»îÅ‰1ü:åÇðï”Œò‘a¼(—û²
c8zÊO¬Š?…Ý-K'ëÚ‡év/í76võá^jWr?Ç~·Ùa”£«T?l@ðÇ@5:Tñ¶Q JIZï¦2´>¥À‘æß™F5ôbº1¾I¾Bä˜' Jžl\uï~ÞipAÚ{ÃÏ÷h“½ú½rø½À8^w4<AóÃÓ-x­A×«ƒŸu€”ðD[“~OçôáB'Ðu¦$cvé«ZœØŒ9B‹Ã©‚Iâ°M‚NÅžÁ³¶¨èºwÛé"˜Y<½eŒ¼›»(¯Äõ×ù2
—FnÏ)sÜv…¡jüíÃ»dãèà<¼ã%î&„¹ÝL-F03m‚ÊÒ¯noEA‚x¹xÄäÙ,„_žÍ’ñpÎ³Y6z6 g³dèãl®ÖkŸdÁÏqHzdk2ÝÕûR‘ËI!ÂŸÃ¹LC÷+®Ûx–¬«\)WFëÁ'‹µŒÒZïÐ¦µà/_… £+#ÝwyÉ§)½4žxûþ=n½ o6U:_ývOÓT5Ý¶Û8ü#¡Šé—Ýqû²tˆ\Äâ–‘CE(È‰Ñ9N†Ìñ$©Ï™åÎ™åÎ™åÊwÜ9³Ü9³Ü9³Ü™)×9³Ü9³gk+Q¨ã±µý…~Úø¶]ŸaÛÃ°€×Ø9ÃÙ£“;u"9v(t|6¹|# xä´=AKÜX&ëãÑO3O9ËÅ_Î<õ†3OM”^ê4È¥ŽÃÒòzñK4»ÔëPV¾ù”£{¾ÅÍÔkF2õQLMœ_éØìJŠ©[µÁp,¢©	4BóÈ(r"„G:¢B=%§) h-Æ:NóFÿ‰¶H;õb€¼}Ì9å®ƒÚ÷ûÉvz‡VÐ&„³^ýÖ`žTêõÅÈ½{«íveŽEB…x»BzÚ>zÅ;{aïOO…Íi¯a]\Gp¸à —²Úï¶šƒÙÊŸWæž,=qÑ„Z ˆF8Â¢|â#Ô$¦*†j‹rÒ-…Y0
œ’.´cRß0?Yñ t—­ÇyÉƒ1çl9“`Ê9a–œSaÈ	Ü>QÍ$5“&¨™09Í4ˆiŽ’?ŒüÒd4!¢™2	ÍÔhŽK>3iâ™BÒ™È\bÃ“'üÎ'”G„ :íÊØ”+“¤[™(ÕÊ$hV&E±29z•IP«DÐªRe,:•±‰),ãQ¨“>eòÔ)ehSÎŽ¤{)RŽE2ej”1hQk?(sÅË
¸¬P&J–RÔr¤T¯ õDõJ ë>&Ì¯„ërØøRŽa:‚°ä¡l°+Ñ”¥ÓˆoÑË®8Ö5‚@!JGÑÒÑnø”%HAô(,§Ò¡³¡ˆÙpÈ¡“ %rœ’ÈˆÔ©™ÂþìÅ!–Èq¢µóG<"2y—ŠH+Â0à]uº1†…§'¹5öTÂKíä#Kï¤ƒKîäãKïBK•ï¤£KîK•ob±‡úAætBü®ÇÔhjA~—¦äç[§é7Vàï—fà8}£ñÝ×	©~£…î}ûòðK-iJZÎñ£ö,%LËsmq#éÕ-ˆ:~YþÖÑƒÖ¸"K2ªÉºÉ 8¢Ê6ü• ™Nš@„Ô$òeÐBÿØqo¿kúO.­0—å…%ÅœÕhÖëiGóW`>+/ôØ@ódáÊ_'>àWÛÙU€ ºJÐÞc
ùñ¾ÄÏ6€´CoµÒ€2ÒfÓC aË¤@áø;—,õÝ¡m;ý)E1rJ2» K6FËsRŽ½Ø?df¡“‡ß$7×—¬wØÈ4´Ÿ}Þy¨­4FX1ÀXö3ºk¤	È€– jIÌˆöÉ™•l,¹.¤¸bŽ Ë¡JyÓÍ˜;Q7‰&;Ñ˜­ß;:øû“wŽþ“o/&ËQ
9`ííµ-Ë*nbm‡A”ó¸>þŸ™[‰i•>9üå-we¬2.¬-j’BI'~Ù+ Þ¶>‹RÎ„ç‚êÍTß$¤AÆiFõ`’’êša‡J*@£ªŸÑWŒuòçL$:Þ áC!Ü¯KiÄÁ¯ÈN£Éˆôù›Îk%Ñ\Sé,J5.¹Ti‘Âz¢Êi.,P¨Ì”çÂêVÚŽcrÒŠ!ý1‘%¤S¬˜èùöåw_|YÑ†Uò1l€j\Š1¼¾Öáçm—­°÷^+å6ÔŸA‰ÅË¼í>›0•1c>ëyL¨eäãoÿçÃ{äãûGÿîáÉ
>_Ô)õÉÞ‘§N&$õ¼€¦Hæ©—ž]±gƒ©NXìYÈ¦Ø*äÃ(¥{N*þ°AH“Ì¯‹à³OA}X¿\Ú'–>„aàÔ²’FùâEŒÞ[FÂZ…ˆ¹cÂE§ Ç…¶KU°q–Í¤¤µ¼âÙ<ËÛs ·E”¶uQ‡O5:Ù.ÐíÉ_lMæÿ!ïÓ•ä?|dY)Ora¹ßîf=4Hû¦(}ÌRÓo¯Š(•ËP+_r./MvÉAQÛ])ÒzXÐD°#ÛÜV—rš	8GóËÁv§ÙJwæ¡ßHÓcr8 8=Öœ^¢6, x…™YÖÈ®&°ß}QK[rô°L¯°W“ú\#€÷ó,´rÃÇ–†ûç8×q­Éáê¬xM¤D¡bæ>õ„v[ˆªm¨P& R
,„RŸæÕõS¬¬5Ê`¯£–§Ò¬óoÃn+KêLŸ¥KwõÒº¶ò¹5ƒ¸¹¨µ&øÆãGŽ‘ØJ¶ÒiÚ­;Y/ú­€ZÎíF¶ZŒD{Œ©…|5Â~NÑ*!â6`Í¼À{£_Kh=–—µ¾`_áÒˆø«µWDQX."{R;S]j"×ÿ¦C _Èàèà“öá{d ïÎÃR·hYdÝ\z¶q±q'Ë:Àd—“áaÆß™“ÑÔí„ÿkZ°6É*.Œ7ºº„v-2–¡0Ó¹êòu 
|~×".¥)o–K7ÿ}Akjª=‚ç…Å·ß¾@Þ&·³Ú£^F«Ü§…|tàcÛÈhƒtRÚx›ÐY*]pAŸ©§Ý¤7 {ª“SSË:5*õ¬6„«ý*}hñ[pæ~ƒp8üvÚÎf™3¹dôf‘]óêÂƒ¤K/í3Ïyˆ½3«†æO†,LO]cÓ3­keÈovõfI&Aõ¨ºy§)DÔ»½^Öc¹i¾pEi™Ó¤WkÀµzºE[±†Óê¦î¡œ_NôðÅ;Ì	ÀJoÜKÌèCÏcÖ]¤Ó¦ô<¥ßRlÐÛÉz{žÇìÛŒ‡aN¸âkî„Ë:1¥£ ÷Y
cÕòÂHsãí	],vig^û8ÿ	á‚Ã>óùN×D÷8Ÿ§:>¿ ©WI%é×*ä§¤Bg)ûÂØ‹Gë³‚+RÄ¿HlÍy~ÕÊà÷³WåzÞLwé»îÂXœçQê‚V6Z©uµ¿§f¼ì¼3Š6œ]Øº|½î³,6Õoûá}­
\”&œEˆöº-ªˆ[ó¿Î·¯Š¢:¢9˜ü¥»7t'Ï–3eB*rÝ/ã¹HJÅöØ/a9¹ß5ï`ÿkƒm–04°„³ü5'¼•J¥dðvÀÄ Ñ–ÒÙ‡&q‰±]ÈÛð¢³?ý)¹¨W|ŽÊêÁ°×É³æ•`ÿ‰;OªÕª¼û´
ÏÎ&ódK³i@é’õuòDÅÅ<~	mñD[ÞDâTTÑl[äÀíù*ú§:ÈÞ0ªºÆÎæFôø–ý¸,„÷q”{ÕK›7Vñ8¤›û…eÀ7ÿ‘™ÍzÉl —…<ñÔ’g|Í“'®¡0O°èó/1ÞEÁ-ôÑ</×Þ§¶Tx÷hNlÏÂ9õøP÷„=²¤?¨¦°ŒÎVª»í(/†G¯~;PÁ4¼‰äDdx¹RV"1½PVa%í‚+”…Z\¤›XÐÛ„Ý*™ypëÇKW«Ë×ÉÃ`Gú÷²Ù€sgøÿw{3da]¥‘Q¼HÐ|¨ÒJ†ˆöëTž“DÕO=Éðn¨Lž,=åCXe{¬<ÞÜ¬¬’²P§U$ôvEÄé" @”êÁá—¬h*YtWÜÑêƒn?Ër~Þ.‚¾nqC¾º‹´wd°—6QÛPZŽó+S¨^( ËTN®g••ÐƒYQºG":T¶–Î…R~À¢?E:ûi¤ÚøðLƒápq`™Ê„W@)%B&Ópp=ÌÞ>`l®yu³í'íÅ£k²¹÷²I§Ñáƒ¼Ä<B<†û¥Ñ°W2Y‡îUÌ@üÊÃ8õü;š’Ù˜3[ž1gï®¿³÷n;i¶ø³âÑ‘’„hªïÂ„úäýÇŸT‡ƒf«_ý7ý¬óé û”ÙÅf• “J<´¥?ãìÓNº+—óVÒr‘çîÖ<}ë<™¹5?}œ%ƒOïeôï~v·×„óÁVÊR?£)!á½ìqöé[ûôE„)ea÷ "úr	°ÉQtª/ZýÏD®\Hö‡5ø³ºOüRˆC¾IgÒ·béu¼Jp§gÂ)!,©0¬¥³`+â²F÷6JñžU| Bþij<ª¨Ì§\MTþL>lÅò·LF? Oñº$S‹?"çÙÈ,K¯ÁªÉ'tâO¡òEè’“À'¯µÃÒ<ªàÒ¼^~ú;/ý®½r	­õª7´e—ï×˜&J•M¼OèŽH|•š9ÍÇ^‰‘|‘.Ãì\CY»EáÝº·³]í¬½Ýb £—HƒþËºI­9Ø[¸´¤Ù¾äeƒÜS\ã•Såw*ö²8ôy/ë|Ôe•õÈa'‹y•PïwAÕÇ{Ûxm(Ÿç“VäÁ÷Mã¥Ãâ¼ŽäÚÉ…}ØÑo›G"…g@»µ³°ÓKêÍ´3Xd=²ÝËÚ
§–vq¶Ðöº-îh!¸bt%+œMÓÝ
ÚÌuÜ·v}•}§Í
ß‹Øž#[Ü‡4öÑ°Ëš¿¢ö*p·yÖ óéT,¼ÐèÇ6|´†È<³þÉÑÁHëðOäÞÑÁ/Iÿ»/È·¿Pj `ðìˆBÜ¦ó«×ì²	g¹ä¶OÐ“Ö›Ã¶æ ÞVk4^ýó¸›x)¸2Y;:øŠ
8 )Íï0*ýôÇ(F´ÙÚsLæ¢»½¤;Þ`òžÍ°Ä|Ë†Ó'[ý¬5 däö DQÖ]X^\!üˆ5é»°»p™!IêànžäµÛr»ÈðÜç†³‘µè\¾1³	”[r÷0ÏvÕjÕªŽ'OÎÂ€î	X›åT¿½
?øq.>ÎÂ¢Û­ƒAwpúó¤5˜scì§Îð)µ¹iv=RnžÌ Ë—½‹´ÓÁsÙ.=²íÂÁúÇpßYfœÐÅß±Ùkîìè’™õjj_oØ]àðŠ“¼EëT–´¨îôôV„@{n…¨ËÙÊQwÖ|Æ˜fìÇEÄÛ¯-jmZØî¯ÜäagGž÷iƒŠ13“À:l‰~çA:²Ã‚îÃ¾ôÏ²&£ï¥ûÏ4ª}r›Î*Y¹ëì§ó¤ ;€½AÔ^ÈØ I«t”sìFökGþš#ô…þgùËÚ )›þ€,#š¹j7©?$½ÁìÊ<©,A¶ðL÷¨x ùÊlïPèÇôRQMøƒÏ™9òÙ[ûÃhá­ýöè™ÿM'tð0`|ô#)DØ÷Â!£*ø ´8‹¼h1£&ºoŒ¼TØÚTp
B‘äXr¶ ÉV¬®àÜ%¡ü}qk‰f;õ-)~ñ¸<½±/¿¦{tó”ôûä—,S¢–ÔOË4¨²9—oÍÐ³ìŒøÆ>ûãOÁZP|9+¾~RZ¼èißŒuŸWfº«þû™Ö$¾Ç?‹ÎkÆˆzÇKÁÄUüÖ™u9:WÉÇ÷ßóEÂ|ÿ®Û÷ïÞß¼õþ˜¯«õÚñ¯b”p¡×LeÑó£1xèˆÎ%Ý,ßwGš"i¸V¤÷fÎha†
Ðvd³ßöa´ßë5ªx½_ÑÖ·(ƒ>á&tÖ0ŽV÷øÊGù*ë—esŽË	™5ªEq¦yÞ›¾ÎÊä—û7šÔÐº—h	Šè%¾_ç¦>ÁÍsTžnc²E_)Ã-Ç«H7éLµ©€Sº€RúÉò²—ÇÃ Ê·Ìº-:ê€ŒZò/Ç‘I‡)‰'YÊ(
bî9lCòQWÏSÜãÑI{et˜”Ø»þÓ`ÝwÓKûÞ]¤ œwo4éô4ú1Q£~Å$ÔÓíÔIöBÈÂ¬öTÜm„‰RO¤PWQ¡b)zO¼`QŒÆ'^ªâà)Ôu´BmüW°úb¹Ä~SæBk5šàªòêŸÃ¼'+b2‰y,Á;¦¸Å>8¹FàKÆç‚¶$Æ…|½¤q·G:©ü®,iÂ˜99‘?#ïü¼Ö€ ê?œ1³Ç¿’Üœ(àr!à19ÝÜ±VÆé¥ÿbGøNöÂˆõ‡í-º×”.+Å¶"g\¢fEÑBØá°¹CÌŠTËÁó3éÎáç™õO¨…[+v°+€¢,œ%ù(‘¬zŒé?ËÄXI¾o¼™c',“*ûÿ½t<°žõè&õ-N®‡"<EÎh£.q®Ñ³I†™Ó¼±ðäòõbê;{ìü€(šØ2Ç€G$âË#‡·ò‹F´“CÜéÂ+°R½RH#¾BÕÂ.mÍ~N)®u¼i´î¸¤wÓTÿÉÀs‹ëÌâÆ˜:A2ñ¨ŽòÔ}yU~2tâŒA÷¢Þ½ZÏÏ¬£‰Ó‡Çh'¤©FŽmNÈZÞá8ÏPÀ£'ˆ–S"ø¢%Ãæ(@›:ñæ°‘/Ó	´ž‰ÌkCŽüæÔ6H[ýæT5D#}6ftÙÕê
[´Ý5F.Ù®
ûrÊ¢L¨²’?ŠHÆsÅé9‘L¿J§©ö×¤ðn¡lü
s‰ÊÕ2Ûc¶íñÜË?v>›å\0fIÃeíÝ=³P/·{Lm ,eŠ(ìÀ ËÉ%áSKÌã@H´M<V°™ÑBF…Y CS6G0ý¬¡ŽÍ¬à3ö<y	‰ŠûZkÒždu‹Úé8ãÆïJ±ÿŒó*ó#2q.Æ•7çòPÂ«c<ÓELÌ·ÂKŽneQïÑ½é¯»ùÂN+:DžvrJçp…¬ãm,šó3÷Ksò©#4òuöFÛ^…èôè¶1Ô»†ÃHˆÇ)Î	ÄÊ|¢î VîØ—ÁžÊ¶kƒµiE¾"öóq~E2FaDyÌQ‰hä6Ò¹Fml!sôQ­„®Ë4Â}ÄJ;lOX;Êídu³¸°]y`Ž	MPC‹	´ëƒÚðÑ¯µa,TuE?ÊCeòŠ€
Pó=“fd<§-Õ*¦6DÕ9¹‘à‰|a¯BÞÎjˆò(ÎÙ±Õ{1bªD©`¨Bœ¡¥Bô ã$™$^£X¤IÌ¢äq Á”\Öða±I( qŠB~ÔO{Ž`7nHYŽ!Eô¶’Œþsl¯•‘r+†sˆá…*´·É¢Ëï¤}²ÏxÆ¢ZÌmã×5ã¡Í¹˜{òƒqQšÅ/iRVÊÀ¾^˜z°ÐðSjˆúûU~X},2(V‘Ÿ]——{×…­‡h»»¾ïÇ/cKœTÕ–&Ë¼euäaÇâÚÌ´¿¸ªŠ‹%ÌO¯{­¥ñ{Teah<s5jÛµ)T9hiœLÅ§J0xlö;7áä»“¿÷1ž¹Š­Q]ïv: K¾ÀšÖÂtƒZ¦]
ì†tæ³2P<£î&ä}óŠñ€RúÚëWÍ7i#é†1²ŒÄBi¤möÅºMy¸IÿØOæª={<ÿ…*mln${çï1/P¨Ö7FèãF¶Û'uv¿O²mÞªY¼(z$!ýnZknE WáAsj»Žª½Œ\C€a/ŠžfßÍcã¡:%ú$¹ !)ù7ÕpÄ:)Ðaç¡Pï×5@EÈÂ!Ý ÌØÔÏóà?C¨Œ¬)t Ól³‰Îßìl¢*–¨}3á{-˜­‰Øi¡ûüB[c÷Kæ€Žc·P_è]	4„JŽ[î+rx­r("ÆÑ{¼0b
5Œ'ô ˆIØ0žÈ	"¦0Ãü‘C!†ñt>±B¨#œÐƒ „“8ñp‚ŸŒ'qÃ•ñÅ­6âRµúI+í#%õ[KÖKŸ§a*q–Ø-˜ø]J¬Í¡„æIÐ†Á7éäxw{›ŽäY¥0ŸÅÊ8!:‡,x\MQ{DÍ‘8ÖWüˆ1¶Âhã,œÜqáÌ¡~Âr
>¡¬“k‡ÓÁÔú8Õ€@¡ÇÀà„ÛGªØ ¥Ë‘.„ÛŒT«Uø5o~xÁh.'_QGBö±žÑ2oÞTãÂº%G€uCõµuõªuÏÂFsô”uCô‰u=o}u‡MúË%ä“ç©ñI¯SsJzþ€°ÚÑ”Ta«g»ÒŒ7[á”à]Yk½ú‡ÿÓ!íáÑÁËŽ†%ˆUè&ÙDjŒb¾ÿ’.È[G¿"Ï~ÝÔÐF¥¾*A Æ®(Ê\;Ênz{†Äà†«GÉö¿Æš¾:øàª`ÐÀG­RÞ!Ä
‹Vª‚!mµ*cðÑV¬¢Aµjy‡ kL¹rùÆ#|Ðêåž¬ææ$öKõ^ÅPzuY%ÍW2”N\S‰øj†RÀu[[ÐP*t]%æÑ[ ÒÞó´·ÙlS-7iwg¥]qô#©Ô/.nH7u@q?ÙMšràRµ6¸³õ­yR15¹
C
-l^çsø]é$oô²°0í6’Ñº± ‡0µš ØÛìúHˆ3]D<…i\±èÆSOM?0®É*ÓµRÏkw“mª#T…Ð8ª1B^;Úl´ín2hn5[ÍÁÊ~„¼íXMíl„y\Kt°1"µdPkÐ5Þ¦»9«}²V* –g —€¾ÁÕ9ÛtÛ•ÖWgø‹ 'ô’|Ý“ÊVÒ5r2µtéÜI~ÀikpD*n^VVU×†Ž§™'tÓ;îÙÜë¦ÕÝ¾µù®kËW\p£.jW/îpƒNfÅµG±ýœË]
B$‰O~xåùîSÒÚ4V×^´,ÊçÉ¿›Ù
Yô/-‘­¤öY½—u¶ZÃÞ‚æ-ày„#ž¤ç†x|ÞL$Æ£D|lv>cßx>´Ç…«¤»ežÇ‡	`Ç1!m(HÇ£»ÀgÇHí,R hyÑ	1„‘½lÀŽáˆ»Ÿ·©/"¢W6Ó0]ÂˆôVùP"I	‚¯R¤rCq/c!*LyÄHã7Ýò³Ä›Zùÿÿöoó¹O;UùMkŠÍî:±#9×N!Ôd¬Ék‘<>>"°¸¼Ä¤†~‚B%-³Á“ë§kŸ8L$s?H‹nƒcx¥“ƒ…¥bÙaMÚK¹ÿ”ííïÅÄ5q2<À®†àÂwRk”º fi"¡Œ©¢†Ç{Gß(¢é`üåÄÊ²rŒø•)ÿX#LœtN®(Žˆé™õ;ïœrîÞ=å ŸÂ)a³ùÙ)— ˆ N¹ ½pÊEˆY˜nb¦[ÆôqZeâZzÇD`„L¶$
áªèovj2Z¶Æí,é°ˆü—'W‰pEˆiáÙyjÝÁA) Ð5ÉÈàð‹ZC¡ÈU €O (J8V¬Y¹föz@qãÜú4òªKW–lT9Ø[¡àÅ1hn×çÂ£-è·\:àZtÇßegY R|Sz=.Tæž,?‘ßÍ¥§áÀjGÁð83†T8´š+Š«¼Ht“þ;t{¸x«äã€Žûa¬7‚&¯éN«3ìÔÀ(*Œ3Ë—ø´aöÓä•’¿™'êMÃu‚í~ÉØÞ¶€ªÎÔ,9+éºÁíyšûùóàsØPRÔp’%ÊÙÛîK¾ñÎÛ}fýÎ2ñ/_­Z¾_NŸ—ÇWÌ¸¥ŒŠnÍŠw/‚:xƒíß+ŒH€Ï™ï™ãâ–Cñ£ò#<'[A¯mþA‘©ôàÂ®`ÅÇ3ú©Z7éõÓûÁlZ$½tPe…šcýä…$7>nêQæ^L-'—ìÂŒË–Ï&ÿžêÈ,l§s±1–Ø0½@Î…ûØBC5Ô”D>Yÿ~Œ	Ésq1yq¡û€ö±……l¦)‰
åYóýçbbòbÂôý<ìc
ÕPSØ»îû-,&4&ÏÅÅäÅ…åù}./ØÇ–¨¥¦$04Ûï·Ä˜Ô°<“1xç"ÃðwŸ’ÈÐ<í¿ß"cRÃò\dL^dAUÏåŽz™’°P‘6ßoI1‘Ñx.&&/&Œ(Îs9Á>¶œÈÛiJ‚…Ñ}¿%ÅdäYÇ™ðn1ƒSçzó¤ìœ¸cHŒˆrãB8×šÔˆ©f=¢Ý“ÃÛ0¥àÝó
Ç¸2Mß§(È)Ä>¯ÝZ¸ÁF¶ã$9Ì­$ÜàÎÈ§eJ‹Žæ~CV9$Œ¶hñ]¢hìw±×tŽ;V/ns¦ôÜ3$DMiúçoÞÜÇ¸èæôŸÒXœ¬t˜ž€æHzi3(µøVFá xá®ªy/d öÒv{‹™£hObf½#ƒX[;Dp¼0(€¨IeÏ(À‰Îeç’ 2ÑæOÔÌ	M›ñæƒæÔ¯¤3„6èkÝL8Í¯ð(I_'AÆ"ø!è'OÎ‚¾? íˆàŸ :{¤€˜î*|Òª6ƒP0P ¨!À&gÅ’”béò±\jÄ((°È’·z :»t!¼dCpÑÂú—7ñ¯@Ò1·NE5+ý|røE#³t¢:"Èv„—ë5öà„:ÛPëŒ(2ÏªÇìD(g¢}xïèàw{“í½	ê0%Á8# \÷»ú¾˜¶Ì¦ô¾¦	N P½bÏú•ØYïžò!5~ÎO”÷#rø­AW<ljŒFíñÑÁ’ˆ54½,†Éo(‰m¡ž°Ÿê7G¹“e3É`2ÖÖÍ´S7 QŽ	ã1Î#%Eøán³žö¦’Å gè’w}fýÛ_~ÃƒÑ(Ý¡.‡W\^—W5ðpy~µB¢~Lšõ84žD}«Õ$jˆƒìÀY¸Õnè°ïSå•ÐYE˜ìì~ö0ê´‘ñòašÔÕ6ÃTÞ Ð*ZàDãé4ÏÞÊÿÔË¶›­tž¾ŸeùaúúþUŸ](f>xixP²ˆ§@ô}ýF‰žÝNZýƒK÷x"¿Äžþ]Ð­TÏ‰þÀOŠKÏÒ;;YoO{X\ÓŸ~ïèà Èp®œõšY¯9Ðr’×ôœ6{C ö<ü}§Á3ÂyÑ¾fˆý"ùÓ†Ù6ºÙ€a°Goå?Þ‡Ã¾zÿm?uÁ€LeCVTTá¦ Åqß‚d¿¨wšÂÍã@|ø¯òñ°IZ‡ÿD›‰)|]€C}õ;Žú;:mÿg¦ÿ+òüðsÒ9:øU“Ô‡
œä¨ð}dã J€Ã¤^tÃZÖ:²fÖá ‡Æ|¨ÌÍk0…l?¶J´q‹n×xÝòr€â$bŒ©4r ¢D]1|òDùC‰ú¬»VóèàïÈº†Ñ¦ûS§¹~¿¾ÊþV‡ÍºyÅb‹Û)|7€<^Å"ãf¬2úœ=H×ôn+ÙÓ®¥61ÎZæQ2kÁó©§]ª‚´Y›k9Iì4¹þ¢¦=Wë¥^„R­	ÂH¦Å[ü0D˜œuú-1*Œ›†àDÂ’<­ò.íì&ÙƒÙP£óƒÁÿw:Î¾œfåÆ‡ïrÌJk†˜•XV(aäJ~ÅÊ5íI·ÁNfÝ¯-¼§fÝæ‰’ËX‰‘¼Ø«è;èÓ‰Z6©ò¥^lŒÔK'ðŠ¹§¤¸µ1è»ÚˆUdWYùBèTV£6"]Ý1A¼ÔÈ±·“xƒs®¬dVv'»À$»MJË €}P3MÉº*áX$\I{+í)¦iþóÞ±©I•‘4v÷€t2ß³i$½>¤À·Äå“]?Òêðí/:O"ëÀNêò*°_Zòûª€^8_Ì	S\iË«!/\sÙÉ&Z£ õùö%ìE5Qæ)Æa šdxáÌÒ×ÓídØäE‘àRaÉg Ri¼sP&±fa’ÊÉÖ,›„ýÎÙP¡YD;üP£V¥³)ÉÜ=†õöpE¨(J „Ê‚^é)g¿íF ˆGž`qØÛÆ:€µçäûjn3sóbÜäâÔíú*ûÞËvá{†³‘ÙÆ'^k¬X‡+%ðˆ=Ì¦6d—Z20ø³2B— ¼lkG~S§ŽŽµtiOvÒf¯¦£0x]t¸àDÚuØf5˜wO©ªFî6©¸l’Ÿ÷JóÇt˜uøOoúÅÆŠÑÝfþ³MÚƒ…eí<”¹Í¬sýyÀÙ:ÚìÿFvôêÿÕ8¶l0KZ´°ph–±BQ­³³ó/_Ñâ2!•ø9yN7¥µÅ®6xÌúã{.k³m7÷ƒÞ05:jú
Ìâ«Æ°0­Å×ôc!4tÝ¸âúXY^ÒÐêº¤ðôkI+¥+Kuiå)Iè~úy*®ýðJxh²S6ÎÃEäév}u—ƒ£#àQ‹ªÔŽ‘É2Zà°çË×µ‚³¯à}@7\Ï„acãÍ£WŸ ãõ¿‘Í~Cöu›52UƒjeöÖí÷ÎiÇ«.#ºáÕœø;½fÀ Ïút,CK]EÓußÐˆ%/….§ ßNXOú´.×›g×´÷ê¤ †ìXC$‹~É\4€¿]G”«„˜oÊ”+K6\þ¥ñàòKŠF)§‘<Zqã»ÁÕK8†yåŸH4æ.C9 ÔÓþ«.†ß}Í$ÚKPýº%ß(%®æqv!cSéùÝ×	s@p,:‡ŸƒxTí/kœ‰ö:Jáh67¯g~C]1Ïƒ“Ê õs˜1ÔÏKÖT„5˜h/ý‰L”ÏJ†JÓyðC1ã†ÇHù7G» ì0ä¹ˆ"[xh”¨‡ÉnH{,.‰>§\p{Ðí™àHé/º28F3«;ßƒ3Ùeî¼A¼šý•lõ³Öˆ®³.YƒŠÅÀâ1ƒfä$Ú&(é4ÛPª.03\³…|!NâŽò´!¤íË*&³€cŠØä‡nÂ_k&bpÅØLZ®èÂD‰±ï„ÅÌ:ëWiòQˆ“}sãS§šoÝçªn ûº!hV2g^ÞœØxpÓ‘PuÚ¯þ·èRÚ?VK¬H`ÖžìÂ]¼ ñ­[8«èX·%ÏŸçËk1ËÅ·D\u/yhxA•Û%Îh<Ã‡/ñÈåÃà\ÄˆËÃ"÷ 9"æÀ€˜Îå	Üo);©meçt×tWNMÒ…´œÇ¶µúiÏ¥á\¦ï¼Çü#z¡ÀK§pÿ^T::mÛ°eÌÇ’30yF…¼´ L®º„ý=U¹®`0T4ìsqQ…Q‡glyÄŠ.ÅÙjf+âwˆ)þ›E·Üõ°0]õ‰L’ý~²Þa.ìleÉÏçI¥^_|ð`q~È½{«í¶/ÂÍßS¦Gz/¼L8y}]ÍÙ©š’æ:ª›”4å›Èm;ÜJ®ÏYj¦Ô°è>y›.7ð·ßj²/ŒÉ4¶}ï+"4­oIh}Ü?=£kÕž,U—®E:®=n4ÓV}£‘Ò ïßÛšº0QWF‘+>â0œ|µ3 0æ2³®{£yË-e°Kja/e5Ë¤!®HFó+?ý”ó«xjñ¾)„Å=g«2²&99Â‹>ª¬¡ÊTÍ˜À¾â{ôv«„¬Fc6a~A‡"°fÖázµú;{eoËúýq‹¤U®zùe•nÄR¶«x»¶8u÷¬­=.êF+3²‰+¾„6KÄ•8ÆX¡ãY¨øL¦ÖŒ3aÏ òw‘c?ì3±ð½›/4“ºúß¦×»lšÝú¸Ÿ‚.àÔmÜ÷½³U÷ƒ SÑÍ:Ò"g
cçJñÃÈoV}ÏŒ|¢ÃŽcVÉÜLdž
¨“´š˜²3–ÇäGaÈÁœÑˆ(fCÝœäö<÷ê[–Þ¤½¿DÞ£6É#úç7Á\ÿ_îW¨œ©àäáÝ[?öÄ=ùu{¦‰5ILc#K4§h9å÷tEoñmò0Ý%Ò½òAVOZäíÅ<µFl8àšTÀö)
 óó÷Û‚¸µ£†L	îß‚A&a]î Œ™R¿l,\Z1$¹×ß<VaÜ…<YÆ²Š‹ËÆöy¡Ý[X¾Jÿàc.†S©f^±µÂBæZó¨X?¦kÅ²ªñ_Ò‰ìi¯¾È°¥¼}tðëfi­cAÁ'wXgí–9¦`±¡³ê¯æKºæŽþ‘ÒÊ€®ˆ{8 +Aíèàw	°Õ~Qê¬ÔZ®ÛiÀ;¶rÅˆ½Êƒ2¤ÛÛœðéü8ö 1Å?g%eŽx«>íÌýbM‘Õ&3ëûå]t=ÊaÔ¡×ÙhNá«°•t¦×”åø†sÙ|ç‡áƒSãìkÅËPî{…{»ö~²•Ú‘½ãwi·à4¹‰¬-²w8ßþ8ß~{nøÛÃbÉbÆÑjiÄxÂ­E¾›t)ÙÑOˆ$S{.wðª‰Ô${¤ ¨û[1+µo[±¶¨•®°ŽµÒ½â‡
wŸÎ\Ñâ38r†1òå¿d)!u‰ÿb¸GG8ÅÍ¬«ïcföpçð7Ò§Ó®â3ÿ1fvlÓZ6§e(™Â»©RI\G9N¥ôlÌÍG_Õ¸2@¾ûzÈbv:¥g©<,˜¥y’óYz¬YÊ};•çX£ù«Î«ce·‘dÂ÷ä'’Ûò^frMkjm¢ð7åJã[~4&†ªÓ #:íÝ˜ù¸¾JÞgnŽŸquíÖaÊýÏI=ç,®V«Î öqg–<
f3•hU·¢¹Œº¬Øô‡» c´ð,eÉÎÃç·u‡Úk©£lyÁ†–WX!M³¬«—Ÿ¬ @2ýÐßß×BÀbt¡p¢°UIðÿ/Ý±¾ú’|	
&c»S6©pJÏ`ì-s!8.…H*92etàØcÓq©p—T_O{Èz©A(ã%Ë`†Ô7âãlÎ¬÷„§y0¥Ù†ö´`0%tüg«mÝ6Boã˜u_±ë>®§¶_Äûm4¢#Ê;Üpw~Ÿüøð?~D6Ž^ýýGÌÞjK[½^¶û!3x9ŽO¨ s—¸ÛÞí¤…´A]Ö,®ü°‚›•‹-®/ªˆPÓÜ:IØ¼ßà¬ÃDyM°ÊCæÔ,°¹ÓR¤vÚ¶W|®)[eŒ¯†´½Æ—6¿>Yª®¤í§fä$D¨¬2Ÿ89Øn*Ï¥™2¸Öæ‘Ûíu|?‰O×€D>Ã˜_•jÀ°ßêZã²ß èð@3^À9×—ã,¥®ãâe° ñd{'èc%÷£´Î‹'kg<Å¸jÝF|ÑDã>Í¸Ø4z©Àcgÿ‰m=ïŒ÷×c€Ÿò(îˆÛb« gÍ"x¾Sa[MÂçÍŽÑðQ-²ÿLE|+6£ÄéË[þCwš ñ "4À›žÀi°®OÙ~Qè¦X>Ûu‡¢ÄãÖ–—®TŠÞ·ÊÞ‡NÊÕ€´N•„jg‚°V<Ùž¹;ÁïˆXÐík‹[ÞÃmØkfyè†™ô¾÷J‰}ïekß°pLd×«r'í·ÀTDíþ¢^ÅébýðâÝo±g›kç‹|fNi×ëX¹^Ã]¯µÕøïwƒÜ[ÞaêÛÝZþD¶tq¸ŸÆÖV{À	é¿  ÿÿ U¼j8