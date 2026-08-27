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

const isTeamInBlock = (t: any, block: any) => {
  if (!block) return false;
  if (t.blockId === block.id || t.blockCode === block.blockCode) return true;
  if (t.blockId === 'unassigned' || t.blockCode === 'unassigned') return false;
  
  if (t.blockId && t.blockId !== block.id) return false;
  if (t.blockCode && t.blockCode !== block.blockCode) return false;
  
  let prefix = (block.teamPrefix || '').toUpperCase().trim();
  if (prefix === 'MH') prefix = 'MAY';
  if (!prefix) return false;
  const code = t.teamCode || extractTeamCode(t.name || '');
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
    const code = team.teamCode || '';
    const prefix = block.teamPrefix || '';
    return !!(prefix && code.toUpperCase().startsWith(prefix.toUpperCase()));
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
      { value: 'block-mgmt', label: 'Quáº£n lÃ½ Khá»‘i', icon: Building2, color: 'text-purple-600', activeBg: 'bg-indigo-600', activeText: 'text-white font-black', visible: hasPermission('block.view'), desc: 'Äá»“ng bá»™ & giÃ¡m sÃ¡t ngÃ¢n sÃ¡ch Khá»‘i' },
      { value: 'team-mgmt', label: 'Quáº£n lÃ½ PhÃ²ng KD', icon: Users, color: 'text-teal-600', activeBg: 'bg-indigo-600', activeText: 'text-white font-black', visible: hasPermission('team_mgmt.view'), desc: 'BÃ¡o cÃ¡o tÃ­ch lÅ©y, cÃ¡c tá»• Ä‘á»™i direct' },
      { value: 'register', label: 'ÄÄƒng kÃ½ MKT', icon: Wallet, color: 'text-emerald-600', activeBg: 'bg-indigo-600', activeText: 'text-white font-black', visible: hasPermission('register.view'), desc: 'Láº­p káº¿ hoáº¡ch phÃ¢n bá»• chi phÃ­ thÃ¡ng' },
      { value: 'history', label: 'Lá»‹ch sá»­ dÃ²ng tiá»n', icon: History, color: 'text-slate-600', activeBg: 'bg-indigo-600', activeText: 'text-white font-black', visible: hasPermission('history.view'), desc: 'Tra cá»©u lá»‹ch sá»­ thu chi minh báº¡ch' },
      { value: 'report-nt', label: 'Nghiá»‡m thu MKT', icon: FileCheck, color: 'text-indigo-600', activeBg: 'bg-indigo-600', activeText: 'text-white font-black', visible: hasPermission('report_nt.view'), desc: 'Nghiá»‡m thu MKT tá»± Ä‘á»™ng láº¥y tá»« Google Sheet' },
      { value: 'support', label: 'Há»— trá»£ ká»¹ thuáº­t', icon: MessageCircle, color: 'text-blue-500', activeBg: 'bg-indigo-600', activeText: 'text-white font-black', visible: hasPermission('support.create') || hasPermission('support.resolve'), badge: pendingSupportCount, desc: 'YÃªu cáº§u há»— trá»£, pháº£n há»“i sá»± cá»‘' },
      { value: 'process-mkt', label: 'Quy trÃ¬nh MKT', icon: FileText, color: 'text-amber-500', activeBg: 'bg-indigo-600', activeText: 'text-white font-black', visible: hasPermission('process_mkt.create'), desc: 'Quáº£n lÃ½ quy trÃ¬nh chiáº¿n dá»‹ch Marketing' },
      { value: 'process-doiung', label: 'Quy trÃ¬nh Ä‘á»‘i á»©ng', icon: RefreshCw, color: 'text-violet-500', activeBg: 'bg-indigo-600', activeText: 'text-white font-black', visible: hasPermission('process_doiung.create'), desc: 'Quáº£n lÃ½ Ä‘á»‘i á»©ng & bÃ n giao' },
    ].filter(item => item.visible);
  }, [hasPermission, pendingSupportCount]);

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
                          onClick={() => { setAdminSubTab('users'); setIsMobileMenuOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all touch-manipulation",
                            adminSubTab === 'users' ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <UserCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Quáº£n lÃ½ ThÃ nh viÃªn</span>
                        </button>

                        <button
                          onClick={() => { setAdminSubTab('settings'); setIsMobileMenuOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all touch-manipulation",
                            adminSubTab === 'settings' ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                      xœì}{oäÆ•ïÿ÷S”{«•¨[ïñX+Í\=<xFv<²“Ý³›T7wØd‡dëEdE°kcop‹õÄ7’½FÞÅbGöÍú{èÜpÏ9ÅG‘¬"‹Ý-&"ñ´ºÉªbÕ©Sçù;Œ1¶þÈ
CÛí¬ëA°k¬Æak¹½Êúôß ïÛî“ÖBƒÍßúLy­CÃ½µ}þ™Ížzñì?BÖ¿8û	á¿Ÿº½õyúYùüú|g†Ü¡¼å¤oïZþÀÛs›3};=ÿ¸}`[‡3³ìõ×Y³lx¼ý’;óÜmÇî>Ù8iÎ²[ì„V¸il÷Ñ¨³gt’.gfÿº<ô:¶c=´ÜÑ;CËmîN`Áo§§¥Ý¤ó|ÒuËÆŒ,ÅþÈqØ¾c1;´A«k¹¡å³ž1l-ÁúZËlxÜZb¾7rMËl9=ZGaë(`ûž¶:žc²Ð7ÜÀaêZ´z£n¿50\{8rüº1W1#
¶±±Á’é`·Y£ÓkÐŽÕzsa÷~Ø‡áõ¦wØ
¶Æô¿ïÜ×÷,-ytu¡Q:„Ù²y-£MXþ{|¬yLæ.Î~Úí³àâìfžÿÑ…	·/Î~ìV‘¹Hè%o©ÞM; Šd?úËíZžö0ù&h[¦ÎÌ^ÍÖú}µ=øö§äeØ"ú¶å˜›Žå‡SÚ&ïöÏé²ŒŽqo°Ã†i>ÿã”6‰êQùCÒÖçMû x±ÜÓÑs™ïNæ¿Åv|ãHïŽç!~k>÷<$NlÇóMËo…,úÀWx}ØZaÂ’ÏÃªçG´¾E3Ä
ƒ—íTåVt¼ž7
›´)‹M¾m¸áFÃ´‚ÐuCûÀjoËÐŠb7þÍ(íýãÌæšZ\Hvå‘#îÆh&[C¶!s‘¬ã¯÷Î(GÌ+ÐíŠ”~9Í>ÿäùßîÞeß{ÿâÙÿÙ““êúü–„<Ä”û"ógÊä‘nÀÑ·áíav²9±ƒïŒ¼Ðxë¨kY0GYFž'§qÔ:l=^®1<úŽZÆ(ôÿ­°aï,Ž-éu×í®•£Õ¥öZÆ $ºº°0kìRü!ýq)âlœto-¯&küxÉ·Æ«
|8ú”>¿šgÄæÈ§Õn-/ä7A~”DuøŸV×s˜Ó[£Ï¾w‘"Ð°Â©¿Hi³c…‡–åq®7œ¬·¸aX&>¶\x,"+ñI¸‰3*žñL-ÁvH˜­Œ£­ŸÞÃÚs¬,‰#·^=X;lÝÀú­r‚W0âü«Â]]«uÜZä;4€’©¿">Æ	amkÇè>a£!Š]#°p™»O@íhÚ@A|
øŒàé¨8Î¥½2¶Ý¿xö_¨uœýœ½³¿ïØ®5¿c<øêüs^œýÿbÚ“ó/€úÞÅ³§¡ô@è¯HßlXx±Xz¬M<Ë±_È·ãÈ2Yö Wý«§(Eþ3/Î~Ç"2Âa?°Áù/Ù]ÏÃå½cûV§­{qökƒu`ø.»ƒ¯~qöy‡ìùSÐ¸ð{·ÿÀ[â;ÿC— Ñ¿sÙ°þëŸ“àöÎ?;fÍaÒû<×ãc¼¸ˆŒ$!U:™Ž€
@šZh'»:³v«)oÜºã[3Û9f>Ì¹vÀP§1+bjÎ¶ÙóO.Î>&åñó¾âç^F…¤¿€Á÷q–Ìÿ›-e²¾¡ÿÌ VFûÍ9vqöø&÷WðMX·âÈÇð$ÎÜ/àk çëÊÂDÒ‰CfþW]ÐXó×5ö
£gÍ¶¥„4Ô¤£Ç‹Ä®sg_|ô«èæ!,-HS}Öêüi—m¿÷þkîõÏ;˜c`žŒ9ö½ó/Yx©g‚7'2é2ç«ß`zðÎ?£iû'x9z-áÝžqŒ²Úoq.Ïÿ¯Û>³ö“0C€háIV¡‚ëÙçD”ýÖ¥¯p»¯éNT“©æÆ#æ¡ 9ûñOp ÐŸx>Êö–aö,éù—‘ÈùWodxt"ºž›ö“ë¤‰HÅaãeØ¢tñ¼³½ù€ÝÙ|ð`ksûm¶¹½wÿƒ·$SIo¡1™cÊ-ë²ÊZ©Rv°Ï1;xÔõ=Ç~ªÈ+ ´uZ NÄ‡Ï2ždñ+¤*Á]7è®\R˜ã›ÉÝ7h‘ãsk¡1{
âzòJ$ýDÌæô‹§þw-§ë²’ÐúÀÃ!¶‘Ø„	²Ù†³qBb´(8x:€»qr’“û–Ýë‡kl§c&«Iz0J;<^c‹Ùï†ß³Ý=o¸“ö6[¿)»qË‘t¹÷&Ü»xC¸7£y§ëÃ—c-´—²7
IßšîÛ¦i	"x†~*÷f^âtàT„­Å<Á¯Ëõ³þR‚090×èãR²·Hæø))ÞñqIärLþ`„–£¾õ=$z8F½9v2
,h#:Æ1Þx»í°9ÃffÛCoØœ=eÿï_>ý©Zá-ôÄ»ÁW±]”c·öüžkç¿ï¦W³]Óîy\Æxþ	š¡FtÎ÷£n•RÞ|Iò­ì„"9 ž^|²GTÄ¾,ÓjÏ'ŸD˜‰s:Á<} öÂt¬`3<åúpüÁRÙ ºx’£Áî¡á?±ÐÚ-žcê	ÊQ²£(ûr–ÝógdüþßtÐ~ÎÜ¾è_Ž©¦È+yAQ«K§*?Àu£¨‹³¾oíÃô„á0X›Ÿÿ!tÚXó7WWn¬,­®®JôwêKÏ5ÿû°aÜ'²;@¦Ýh¸ž7´\Ø¾®X¾TñÖÊCyQ0Êág8I{>ˆÎpG+ôZ>Û÷½ìÝèý1¯ÆGoúûbr§·áwüŽÏbºu)=¹…oWâÃ;±¦,ƒnÀÓ]8²{„ú4cYJÖç¬&IBáë­  arÛö»yu.5¿íÛŽÓêŽ`æÝP$J%ÑÉÓŽàH’›ç¸}ã^B˜
º_Ÿ7ªÈ¾ !¤ç¤`[ß3:;0`ˆ'|Nà›Sæ¹àwÛ°-zðZ’Ó%jçŠxòßhdìn¸ß:À}Ü¬ Ï¸uÜÞ!·Á2ös<)Mþa³Û…E˜VúûîÎÎ&ÿtéÖ5œG¡±¿O¦ôäM¸•—Ì¾3E»BvÀK-?à¥’!ð*“#ðRÉxÅ"Ïþ+î>fùØÝ!YadÜ;¹Ç
¶ú,k‚c¼ûä˜ý°µ\j¸Á~9¿‚ðØ·äÜfûÀÌMËIqü\ÄÄ™+Ã£¸yæÍð¡|èU°!’àçoÿ &`úÞ·—ò{–¡ð“o‰Œ[K9“MlÙŠ»­”„­ id~e%rU$0ô’ÃGAË’é(šúÐ&ä –Ëf•¯Øú{RpløÖÐóCrjÌV×sM½€°½¾„3S2-¸ýCÜÕ¹CÐ$>8.Ùˆá¸¸‘áÏ%¤ö"åð«ô5`õVZtÍLz»r×lž<	òëô#¹³"g©Ï{ÔâáI=r« h®>°U?\ÎìSŸlí+ì¾ÙÖùSô§žT/ßR;âóT×‡e9lRgn
Ðúé’´p’ã¨jßäºÊùSJ´x©	wè{cuëS.^åÔ‹W¯
ÿ7*Æó™Šõº9£"4¼*ˆ-é]éX+‰ÝØÙš>—J©niçOU~f¹S%ÓË¸ËZÆàZ®y:0XðáÈ:µ8Ð$Î»gµß…-(]éïŒ.ž}î2çüOlº¹ú7º]kÒ\×ºŽ«ž,½5°|Ã1¯jí…ŒC w@ZÛî[p—Ánl§û#öðí½«§‚ÎÈµv²¯¾e2ÇÐ=6Ü«Zý¸ëq–þ» nYaÅºcÌGpþ´Û¿ú%ïÂº^ÏOGËí{Á•1zÞñ8‹½ç[.ëïK|»o“sñêWÛÚß·»¶åv¯#›Ï–ÝóÑâqU/ô?Öê“Q°tåïq/éð¸kõåÁZò È)èYãOjó)‰¼--Þ×RM–ÌéÍ«¡UÞó¸ÒhÑhZ UZ¯žCQlýu\íÌØ®zÁ“ÎÇYsYÆBñXJ3Æ\÷I*i¦Œj„¸úºD£C6“Ž8¼„nÞ˜ÝTRN’ƒ¡n£4´X’P !¼_½ÂÔ£ŸòÈ+~9å`ÿ
’,±šeãØë‘d9Nh4ËM°›­fÃr2µ40'±áF¿×£Ø*»š˜!oCyì(âñÔš‰²WšV%£ÒÃÊúý2Mæ]t¡ì˜kdžl ³n²ŽåxðÙrGA>þXå;SûÆŽ•N­y_X6²úßöÇÜ©´ù”–Vò>¥œGIX“žo›ÿƒ¡Çú]Ì5ñO§'ü¹ÊC…Ñ«I¡Æô+|¸‘8qaËïÃ›à¿cÓ‡y½CïOü()·:Û†oJòD'”àÒNÜQ°qb_ËÅûÀ+z£aìrý‰­ãÖãÖ
†ˆèÇnËäyˆÒ‰¯XôfÓ»ñÕÎDVw0¬ ë.<²c]ßâ t¼gù€”…Ì¿± f~¼Ð^Äw!²Såx“˜Ì…ä¶wqö¿vï¢Ñü÷ìüÇ»’=š{ÅïÙaV4¦¡-—…H5n˜FÐïxð8mÜväØF}é”÷LíyDº.yV¿d¿ûs¢ÖØ‚{­ÈU0+OJ¯EÃŸH¬»wÏÿv—=:ÿñö=–§ªÿÀ f/;h&!br¸Öª	še3CÄ¤8hÿñb{ñC\‹B"]'.œZ÷ÝÐiïŽ0ê÷Žç£nÎØ­vgfÛûüïÜ«sK«<óLÊÇG¼‹ÒN/Z÷üSu¨Úd{òÏi+FV¶kµSËß¤Qn”7ãö½ûìÝ{çÿp-wb¼ßÔÁ·ãm5´rÏž*¶U¼òé™äà–µ³hx;+ŠÉ¼Fû*ŽÙ¹tqlû9p[ ˆ]á®ªÒ¦¶wÃ±‚Ú›g%Ù<ÛÏ?.‰¡~aÛ'ÖÓý# ¦´‰p0Ý£‹´¹ídtÏÁF-Dÿ¶–QŸ‡ÿ$!ˆBZ4ß{†ˆäÐåñüâ?4êVbÂàÏ.-(‡û†|ëVìúˆíðÈR˜Îë³û…ˆïË=RceìÍÝ{˜]÷É5:[ùò\Ö¹ê[–;²jp‡hQ®âlM¾É„ŸçLO÷0©kžíÄïÅÐx˜37a zœ~ÏãÕ}x¬!M‚^¨6Ót(+o©É¾ÇI.Ž;”„‘\ceW3§õ3«ê¤S)·eiñÅ79Ä¹Í`B`×YÆ]‰,QÀHE*­<h6Î¢O÷˜óD!Â"³lH	ç¢§œ½mc>­g¸Å íœ¬4ù*Î²Ç#ATÓŒ¨þùS·‡FOžú´ÆN@+M2¡"çj"sØ&›³°Õñ÷÷(ú~×òmÏl–>2{*Iç•[‘UNˆkÄ…”øV¼¥$FGb…wWä+™™•¸(¤	eDb‚+¢ô_€äáL†G@4RéÆB»§¸ÔLbÊZÈ:q”6[ßô}ïð=Ú`ZX&¥ %Y.ã€|`#Ìi·ºtWa×äÞ‹Y÷2ÍÈÍJ‚û[x:´Rñ‡Á£)dÈòH0SON^iZäB_,›Éå=´
…È†Œ"3–?ÌÈb<ñkq1#‰ÑG<d³òX-‰ä.8ü'Ÿ÷)÷søqŽ›éLþ³©u¸yr^ªØ.IKåpùgE)é-¤¬î«ß…¼î#UDž»>O½)FÒ_.£\õŠCÞØAÀv‘£«øS¨øC—…°}‘/×:-ôzn(&S7Hõ¸ì0^F¥$§‡ôZ…,Ë¨Ôc“v$•#K—}U\öÆ­tÆK‘Ä”S}•ÓE‘ž—<#9a#bo‚”°hZ¥<{•Æé¼ã=+zÀ),Ãá<‚8´Í°¿Ñ@—F”øý¥ØÆÛÞ`Óm’0ÇL#46NÒ Húä£²z×j.Ì±Å„…P,
h¡€Lrº ô½'*†ïÇe¶Ü`ÀìC»›frF·m4þbquÿÍ’U_ÿÞæ‘¨ypøo[Ð‘kdÂP|ÐÊ˜¯dÊ;1USÿNt±cºñ›ù‹7WŒåÎÍ™9"ÆG …­ÁÔñ¿¾%¤bøB.yã“ÅU…z–þŠf©ð’…wcÈ7øñI®ÃÎöè#u{Z2.¢¦=ÏsBÎè‘x¾ØýþÍ}c¿;ƒíw¹^¹q²þVB‹;Ð¸c™qó·Êúý$%4t7¨¤²•åýU LŸ'oÌ1ø¼èÂ‡§¬cøøæ'ËKeÍã<²ðxˆ¡%žëØ-&ýE€sis§¼·‘ûÊþÊk5þâ»´oOVNAÇ	qRü5T<5üfXáî5¶ÿM³·¿OSÇ5ä¤•›ù›òàCŠ]ŸÏ°9Û“°!M6(“­Õ2‘ìÇ7@§pF?–ˆÎ‚•(/'œY%—HÄ-.¯°ÔÚQ´d&R²Ô¢‰ê½Dn^Õ‘›Êxn´™£'’Ù#éé
t®‚åq©B}ïûŒã·tDëÉÅÙ—Ì=ÿìXV*˜ þA”‹&’—XÍJ³Ü0 ‘”Üû¤‰*ï`Èç‚ô$h|xÛ`²³×·Ì¾M£ÛC¾éS»ðû6ýIŽ<`_³©×Õ{œ=Û[ÄÝª:ô­pä»ÂËÝbì6kf†0Ÿþ>Û½;ö‘e6—f1”laFÝúél³ÌVA&*¡Q¢¶¤öØÆ­£2y°D^ÎSå0L¥þ0'þƒŽ6¿¬²µ)öØb²Ç"ÛUÞ¼ŸÇVŒH8æ.7Õý1ÖØ¾8û[L°îº±òÖ¹8ûG8:ç²(ƒD<¸8ûñ+ª¿lªO–ÄL¤Š¶*NXÍ1kk1ÜP©Çæ¨Ó1G•Ÿ?;C×‚À°VÃ#<#¸ýglÏ2Aº‹çîH}i&:EPïÑX½8]FfÛ•Íè}K‚Þ§:d§¡ëA3ïÚ–R’Ko)!ï¼‚wãö)KM°]ì{‘°}C©ÎàåŒ”Üz³ôÖ¡a"sÛD _¸·ìÖD,'/•:Å£,¢øÊí1l6AIñçàMëˆ8F9öþú¶rÜÌÉG]øØúÆ	=zúÑ)WON¨A`mŽç—èxÍ–$s¬ÏÃ(K9«‰ÅÊVó$Òæ`zÏ0åT1s{Ÿ5#Ø¨×_OžK?¶Ëí…ýÙÒFXÂ8«j”qœe	êXâ‹Èò`,åçñâªÒÉïYGÒ˜K.ì£ƒVÝ“hV/|ØFåPÅ'ª»ÎbD‚‘¹J¾M°gÝã¦Ð-í©ó©Øm‰50¾JOÃ²m-¸\¯äÈ+SÂçËÙ™¦jZÃ¾\ÈXà>,”ìT¤b&0r†A«°O5Ì®X-îJ!¨_Y•„²8$—ÝRF/mÄ¨d'„Ö£ß¶‘ƒ­1“³²Òu”õ“	>®Øœ
Sð›úRÀÈíÂ×,â½ÉÂ‰ïÐªÊcY£ÉÒ²É7$È„Í"©$Ré\‡Ë£ßîðÛQÅ·ÅÙYö-„íNåÈ…ÙÓoêT)ÛÚe¿ÊÏ:æo5žrÁÍúh4þ1ÆŸ8–ÚÑ:~ˆhÞºSŠh—h+=µhWŠ3‹bo¥Qáj•2*u(T-\_Á“®ˆ¾(	?¢TF]ˆ›"R\Õ9‡7~tñìwCvÃ‚Æiy‚ê»ÝþÅ³/\}|tÇF¿ˆNWj(Ä6L€X­ZŒ(ÿ¹îñV±wŽq¥ÊºóNû@Üâ‚RÞ©X-*OùwMD916ë´H9Ÿqš`*c‰"÷TÎÑ°„ÂÏmæöþû7RÆ¦Np‘£±³ÎqçWºÔâ¿ Õ.AÔS/õø5r ¥2žNg›<¤)†‹¢ÒŠÇ~Ï;Ì˜â(,Z²¡A˜ÈÂa©¶$C©§åøyN:@YýÖâ;l-Þ F¿··>Ÿô¤1¥€3ÅAÒø¸·²5ôl:©‹(¦â& ‘7PÊv(½Û#Ï›Cß: áµ  ”Fgæ˜iû\ZcxK~ä›‹~'Í¿Nn‹ðó‚.í:xÃ.m&úâTmD(±hÅ¨B˜ø…<÷S5¨ÂŠÛ‹¢õÞîx‡nVßà!"Ù5)­¤W*Ù^?ò¢?É-x}(ç`–ÑZtÇµ ¶Xl¶\Sƒò¨½WTw­¨ý9e4G¿¿„·ÇUt¡}Í	.š¾kCq”ÄWFrü†kEsÚG,fb<¼ûu§ºkÆæ"GrÙÅ·\+ÂÓcvBd÷+²²ú±Šs-hÏ³Ké~~	i#Æ®±E7€â-w5	:½ZçßòÌcyóUñ5<à-´Lt!°ö¸ÝnKB^>lã]è[`
//otßè†žŸ‰ŸIHMA-‹T GíÞCç±¬µ'œMüÃF‰ÃZ¬“¤Ú²oEÃ› /’/ÅŽðê…€2¦ÑE¤6‰ð¯¨›úf‘-@ì¿@‡ÑÌÌlÛÁJ¬†ö¾Õìˆ¿M£o.4‰Ó7ôŠ6a½ ¯**àT÷mÍF«É£±RšXcÕqdÐÖ´ÕÛêmu´ÚŠç…FÖ¢FufDíKTvzªôÑGO¦ì"“çÁ=ÕÈ˜ç˜mi1	x˜!|Fœ$jD˜¨ä÷:áo¼;@DÄ-¾k²=Ñg¾‰Ô­hÄ™¤¦Sî~72x÷BÄÜË¡Hð#<q f£Úúˆ	QáS¦QPÀèSD“©[$*Ë×¸…ƒfßf‹§ÑƒÍèvW¢gÿSÅ‹—´tò‘<›½R*88‚Sá'âã9“ÍÊË9H¾ÉŠf™yF‡ƒFÔã=#{mwáØÝÑ9_=+Q7Lí.Ü—qÉª}ÁªÔ¸xJ‘¨â×Ñ[*	™Ê®èv¼Ãh q6¾FO¬$NSð:}QƒIÉDAœvÊ¨²–°žm|ë¯ºÓŒüG0K6•DÒ7ìRlæd2tæLkñ5ncß–Šk0Jf#àNØN.ìLàÈ³ã°¢s(Œ‰¨¸0
Üðâq;rÆY¥yW"fáÅ1ñohmmé[r0µK_Îñ*·DTŽ=ˆHÜËœ#1†»L˜\üÅÿk¦D;¢ÅRâ†NýÁû•o-áh}þ±ª¾Y:sÒÂìù›¦Kò2Û<¹[”‘C‚4½Q¡)¡záËé¢C´jÃYŽ¶Y;MQÀ†}bàiiâŒx€XwÏQ(že·6Ø*Ú!au7)› ×2’)¥\þ't1&H©§q+ÞÔ5¼h¬U||zœ·ÜNÀ/¥Ü®’èUyQQgr³Bô£Vxƒ47œ YÜ&EÒ/ÆÝÇ§¦‰Q¹8¹¬ÀWq•ð<
¢iá2z€7yr“Æ£dXŸÚ.X–uø=kÀBïü3J5ùyÙÌbÎÏW q\œý2žÚ¤gôtÐnÈú¥Daªï’£,:5+”jÈ<D”ƒ†JRo9LìCÃ5zp¹!Ž5ï>ÿ„½ifÀru©så:ø¼²Ðˆ¯ŒžhzƒPŠZvs: eEØ²´_)x+VP"P6tßÝ÷
°Ò¼I…øÛs¬WÓòDÎ]ž­Â‰\¤¼E%dÐø`A)lOM|G9¬ÏÎåj0 è+.ñs)&P™V\¦ÌNÁleºH•^’Û†ÇéÙÈ'2Ã´|f»˜0Ý"-î‰ùŸBñR¾W•Öó2‰@¤—GoÌª¦ö8¿
ÃZ+N&N„O)â&ÈÈÑ&ð…o—A°é’”œc‘V	šýµcCÇ8Æ¶›Å{áxi~CÒF›f{Û3­ÓYT>Ûý¯~o°.úÜhìŠL9ÿEI])ß,Ç"û>H³ŒÊ±Ì§ÅÞ$ü&zþ5;¸»óvß³ËJ;å÷P”zµÄoÄž¯_QT>ÙD"á%ÔPž¥†(µ š*Låj¯’”‰!óÂÅ÷àüO¥èY4œG4ãåÕ®ð˜:áKc™´P÷M4Õ7i$Áã…o·m32Þ—–¸òÜ°5-Ü´Ù„¶c)èQ¶}úiÌBQ¼©=`ã½BÌªÀ¥Ò²i¢^)„Ú§F‡~ëÍÔ¾P.xóÎé5lÂ®Õ‡,£­Ñ ä¬=¡•j·ÛÕºTAýˆ3…8p0WkŸ#xÆH’T_:‰òñÅ-ßÛ€·ä;vƒ#hïÙ6;ØX‰EŒ¦.ÍÌ–æïÅWd4Ï ŠóÅ7fØ^ü¥„çIW©z|ehñ¥•Å5/PP¹î–¡s‘È¼eýŸDëIn—ŽF:qÒü};¸³)à4füBFP l¯Z$+[ê..ô$¬fåR¤ƒ.ï´,Å9m§rnãÕ'§ò|¬“ë&5wç:Ki†	Bpdõ®ZT_çö
.Ñ€Þ‡yOç_‚ésÅþöN7Ú;sì	¨,ðÎŸ† B>ÿ$µ'ð¤›†ÀÎ±ƒóÏ¢¤ªó·2Aü á?g  ŠŸ#&ÈÅ³/†<ó
˜ÓÅÙ¯aLmé¼Ià2™J]//J šR*“úÆÚ•‡†*‘|>.¢’r6£6#‹ÀBÊdX_Ô¥Ôž%‚-?<ÿ<U#Ž…¾‡Ó{Œ§éNæÀáåÂ%´I±®å„‰»fÏÆR~H¢Ÿ2œÆ]ÉÖ˜â¤¢Çè]ßÚ·N¿5Á´*ªYbPb/x4ê°ôkžž-3 Iœ}cäðC/6‰;Lj‘¢°a;ì ÌQGjÃ
:çUªÄd¨XÕ¤í›8lè¾ÐE,V”U @–&²ÌbJ&Hëqb]Dnœù0©!ýQn
$¯X6û->bãòŠb¼
sµÖ65Ãb•TBa‡b))U¨YeÙJõÌq¿ÜË9wÊÒjéä=ÿ$9ð„œéN!:ý^Î	,­ß!¥Àwº3ðÿ—r5rS¸wqö3 C8Ô?böéï˜C¾§éÎ£¾”SxÇv¬í¾_Ùîöú8e<Æ:dßÞ«?‡üg<¬$hfxjîmn±Å5¶G!Í½þùosX¾æcŽ}ïüK#¹Q|;&„µ’:ê®EÁk¼:é+>@“Â÷Âéã9£APCÕsù8ãö Ú‘992.’pð:{è™†ÃbúmÞ‰-lž¥¶FùlF­‹Õ½á£ðPyey@H„nPî/«Ù$GúXi¢— &âG~5*mVj$r×½
VHáÜ¬A!ƒë±BÄÉ±’üYYS›±E$òƒV[JÁI
ó¤(¥U€ä
FÖÒzÆ¿—L†ŒZñÇì´t3åñ OÿÖe&f9ÿÂnkÔ´Ê¾MåzçöÃ£¬ý]±¢vlÃñzÌZîÆ‰lûldáÁ_ÞN™çâ¿±á8°ÂûŠ;5(‚ßs # fî(³v2O–Amä¯œ£_ÇÄŠW™·
î»ÃQØœ™Ñ2Š£ž=öÃ\¡ûñJÂðü÷m³æã± ½ûf œy×:¤6›?ÔlèT'2†/9
JðùÅ+«R
þë$ ;úî…Œ7TáLHL#$“¥öª:Í*½ôbP¿ÒÞ³§^¹T¼ÊÐeòwföŽö^‹%ñ¬EPg«™Ø½å´r“…{²#‡D†æ9NÇ¨ ‘ŒN¥|d˜«Ú•Jò=¿ëŒ‚mÛïf;Î”;K)3’úS:`‘ýë½ã¼ð’µ¦¥ì,ËaæˆxÑ±3@ÓÀ¯Ý>™~Ãþù¿Ú.™œÿÅ¦à$/²?“e¹‡‘Òd~·þGTÇ$±œiNf0VÏö!š},&7G¢/¨%Ç í%“Fæü>l¥Õƒþ‡éÎ8æ®¡_‘»¨îP
6)/
XgüºÃ¡6äóŒ)i˜Z°+=à…îèàÓ;ø•ñò~°³ÆÞº»°8Çn-,é0õøŠÝe™ó[ï4ã——ˆGM+öªç¤«~Ï
9~c;ôÞGÁzëf¹›+eÐ£ßxiñ½4îU»ŸR´NñÒÌV‰n~AD¹‡bø‹£ÊèàÄŸ	Ðh" N…FSq7K£—L•/–ånÅ½SíX4›óg¡hÎ~0:f¤MvYsûüKrÎ~Ì‹2àqú©Û›­IàuÉ[ÂrYsOôŒôa:ôÑÒŸ¾dxÎÅ³ß¡úâÙ¯GøÇàÞ·îÎêÓ¸MIŸL•[@Ô»¦Ä¨¯‚MknŒëOë¼äÂwFÇDòwíó§×k¯?²¿Û§œQ1®¹Ë^"Å	Êui ]öÊ…ÝI4u}’2‡|†'ñ'ýg­Á0<Ž|¼ú;Žž¢™ßh´ZŒG¥’L?Ï"sX`ŒX«õ5§Ø=à½ŸcÔgb¹L™sÄë¢ãÇ#æöÿ³]›OçHz3ì Mß'êz44ÔMmxI[@Ž5h*¢í@ îí‰ŸÈ¯’¶Ú«c+bãà~+Ûƒrï–¨äM2fQs÷Æ—Ë ðU9õ8_²Ê¡Ç±¸3…ôG£ rð½·Æ’ê¢}3ö-è¿ fVc|÷ê‘ªb’ DpëÃÊBÑòÀ‹ƒ‹9vãP/c'ä®Œ“ü0¸˜=j,…$,(´ pˆfÁT…¾Ê‡ ¦Jb°‹ú¨Õ‰uÈ4Q	ø…x#uÞ‚OÆæ’T[Ã¯À¯¾„ÜÝ–É6X	QÚn×™V@}µmSÛ–Ï/Ýb:¹kÝ!vBÄQÇ¥Gò9NÕ gCÊ£‡g SŠµJ–t-V½Ü¤å«ËÚ¶ëÚÒ‹W‘í"Ut¼£:&ôêrš"'ÿXGwO/AAªå9Ë_ˆÞ”¥²ôSÉUîš*Ù@û¶KÚÄtˆ[þûð­x/ÕÜLéuÊ,'°.íu¨MýJsñøuýq’ñõœ¦_/£‘²;z9fú‚OoßëŽ‚5ƒ¢o9û2°ŒCüï8ÛCÛ|$^*1F
°¶DÀŠ«ñºbIq¡Æ-ÎQ#ôœ:"„0¨:Â„ð˜Œó¬b†ÿÅùø[áÐÔ­u cI§ÔÇ»*#™##@
‡ÌXïU|·ñvÁ¸K­H=©ºøGÆ¥­ÇÚXÍ oÜÈñÓ[ƒ4ƒáú/ÂX›t}Þ©§fáUë¨žÚÕ}éúövíõCîx^˜ÇãkÁ`?,`y¾e¾HEõ;¡/¸Èø‘FŠ ªæ¾"ÆÕ‡î(‚‡sfPÛú­7µ7ó½‹³_“wB“Ftƒaèî:aBL¸¦c	“¯KíSD§S«Ý9¯€ToÖã8
¾çôƒ–´Ò_ÓÛ+²BË“BÓÝÊH^IlÔó	(£‚È³‘©Úf‘©šB¢82†<ÿ”JétyN¥!DÇø¡2~.Å!/Ë<zlÌ˜I¶³~.¼Älm°bvÞí83 uX oÕŒ¼2ˆŸyrýG7j’VÍÔƒ¡·£¶ì-æË{¦¹à9‘¥)Ò`CR`âî.gë!"vk5®qK-S‘„&#JÓÑërè¦
˜[ÓNèÈ®«/7†*)û˜ËqÉYºR,ˆÄÊ*ÖÍiw/váî6kˆJÒü	°FôÝRšâ ,(¿ÖXŠÝQ0Dçì{dfÖUÑ5òZ¸Yú+jK>àô&öíÄš~e|ßI-ÂÒt´Â)ÈJ¿Š>yf4Cu72BO#¢©·çFàŸY-¤åøÊ Q\—Î˜Ô«€J^]XEÑ¡5éò*¾Ü"¾PË[ÄX
Ø·¦L³K`'‡.HOñg8E„<_“ï‘\_ZÃv>žËFCòÍƒÚñ³™JÄÉ´Ô4(pRcgãÖ&nq:³ýÕSÄìøÕHo]R‘$¡ÄÔK·þË@_î´^†eACb:ÕÀªìMC?Ñ€¬‘k
=(~ÁôK¡ˆwBÙ³.ëŸæöÙë<›•“:QŸÅAVe‰—RÜ»’„ËÚ‰£ôÔ”Ò4'IÔ,uo¦XÑûTÛô`úÇNÛT¥gN”óR3q³@pvíDÍ±R5÷ÒÌ”nÌõbuYÜ5325™Md™ª|±œI
Ío™v(X«E˜$›®òÎ¬ù*5Ù'2|ŠŸ=^‚ä«†¦A8-KYrL€#v¦Eyz¶.]’ÚŠ”&‘=©~¦ÕÔ’TŒXWx(“nVD‡O.ÉB÷°—T'‘9V¹R%aÒ¯FR£¬ÊM˜˜*5Á|åœŸy”±DQì•Ë*Tã¨;ì
Ë—¼¤;@HÙ ˜©¯«( —‚’¼çîüæÌËº9m%—':uÖÂ'sp¼UÔw†ù Ù¼êMwÉŽ2.>Íd\èÍs®±hu`q³}•Å^²WT&üò[5ª‘UGF ¹ðAbÓÈ›3¸%ƒÀrÓ¿·hÙÐ‡0.Ó©K5µ.¢´8‰¾%kÌ
OÖp„d“Mß7ŽÛv@ÿJpÛÛ†˜Ì0kZuOì\c‘Ú›MYŒ ±âñ>µ9ríWýuíw¿U#R¼²MrÂv^cAˆ‚µâ-8Ÿ¹DàŸü„SŒ"v _¥ßhÇcÔ¼Ž
uÕ0ã‘_mT+	IÕx\úÆ{#As—øžŠµ)(FŒ‹¡ä—ê‡i¬–g`„´8ÊsáQ†R[ò¨NfžV}²ôÒÊÑ	ÙÒOcÄ¤,”Wîµú8Ò Ç‹F<S3ÅbZe.µêmiYTS›jÉ- ˆìuFyRQŠÔÛ(òÒöd¢TJ©£jÆ¬¶-\#[£YGmmLKlW§’š.®òe9eˆõ½‹gÿÑå›Ëí#a”1ƒ|Ž« rjãË½p3î·wøün®E¡k|~¢Ù(ßh46e”’|ƒPRGÏrPZ0FZb)ËU·ÄWŠ©u‡$PÐh÷bV3ÅRýªõ œê@>dàÈÂ—¾­&‚@PVÞ–ÝÛ2@2Ó;À£Üz7
VÅðµôÝ’CÈÛÝ\yØ]Y•Á¨×³ˆ‹Œ1Ü‹2&kxÈí8L"”ßÎ[zff³@m‘Mí1_+êäûô•à×’¿Ú Œûað];ìG7ÏÖIíÊÍ<MhÆ¼¥Óoœ$ýœ~¤=îÚ	Y²A$ëw«'¾éÝ–
.qf´rœ”y@ºIõ°b2¬mÝçhrÔ˜ïomic¿HxEîK¦‚ûR¹˜²|%½YÐ…7˜BXü¦k"zCÏÅÉÑ}uP¬œÂLdA>Lf™ÔkyV1)Ý’B®õ×"õd<ž‚l+­þ¡ î¡Ûøáëzdx¡ÊŠi|¥Ö u•EétÞf3Ï?Á°îÝn·©ªy?Ê•—½‰­ÿ¯ç&˜š\_~ÜZã[$8F^~“Ÿ@†¼!1£iîðÊš{QeÍ{ü=¶Ï¿[L¬ÉæeëƒX¦(5<Lô®åZ¾ÝÕ•CP‡äØÁ®FïtÊ¡éŸôh)Û¶©ÛŠ®ä54Ö‡Ü«Œfø0MmE1K°ˆÎ?Ÿ9ýH¿ù.4‚CŠÔ•5ôŸè”4ˆu¿udÈ3xZ˜þI™‡«Úœ µœòðÑ¬Á!´],õ§-Ã#½+6~÷üßYHp \¯F¼¹¨ÌBï5º à«‡V0L­Û'<¶¨Ç]8ÏÎ(gŠ'¹~Â¤f´^éýšŒJÆ¥ßSÕêïÓ¤hž*c&Fr)dÓ¤lÆ=OÀJkÊV'ORFÈú(éµÀÍuE Y¹¬›Å´Š7kÊ'‘4âÛî“–V¤½o§c
mRZÔ«kþ‚ÌÀcõUnm¿„2#†¹
SnÎO?Ç2-4m£çW·ndå9âÆ#›9Äz£ã$bûüñÐR£€×±ŒC,Ô!D@¿VùÊ“‡lËRg»£p+ÔDê}ê–ëqzk]Ïi¡oâKëÜÓóS¡ß§E5ÕË‰ÙéÕB÷¯—éµƒ Ž?	ùËªFÆÕ”F	•9é´6•Þ–Z×do²1j¦'K“Ò<äÅ…Ü&ÍãËe
·sÊI¬ð¦ôó@‹1A²*‰‹	ÿñ„cÛ[ËXšJ†Uµ*q…TiÖ|ÏEsI€‰K¦ÒZyrUûoóË’ä[G¯_LU­?Ë{(jÖt_qo‹„ð†^ oê=ïPS±Lz.„›¥Á´»<æ2¹uJM“ÛãRÚOBÌZ0€Ä€Õì&º]k.…¦µ èî-Ï<Ö
&ÊðŠØ		PT£’¹Ø¼‰„Pšs¬WFío[ŽSX²É*àS´~ÌÉ	p’ŒÕ.R¤¢—ª¢Y»AbÈ£>’Ì€þ–¤ÕéU¹È™Òo&°j©]M ­ç.‰¯ÐpãÀ…fŒGÝùÍ:iÏº=Ÿô6
ÔN»¢§ìº¶Aßß_:AæSžˆô³qÑ
]'2Gsé5¦ìÌ!û¢¨Vf”õ”	ðgkºûâ«f¾ôJI½QˆÅÛk7PÔ.­åŽ™Æ‰Æ_DÙKñŸ«„ œÿé× ¼Q4±OÁ±ÛeãÂÝæB5t"5êƒ·f£3^“ç¹èB¤Fî$’7ôŒ l[¾ïùÍPÞæšÑ°ñìs[ZÞÍð‘¶$T®i$Q×ôc=Ä‹‡Y×²>šcè5WÆ¡a‡l44áÝñºMÿß™c3äÛšIÀ|gçÆ„æÞ*Ù‰¹Õë€º¤W,±›ædFMg©iŒ~NÇZu>§Ž×Ãýå¹Í™÷ßÝÙÜ{k¦8«0©%4Wñ–co`ÔíZAÐlPç«ßÐÎøÅ6ü¾Ö«m‰˜qßlº#Ç£9P§¨DS¶òxœ€»iîØ¾„žo½E,Z›cï Y¸:{ÇC«Í(YŸqÆZó‰š`Õõ[Æú’^õ0-“§^Ô©ÁšŽ¦çÀŠ&9™›*;¦üË]j/½ôµ®‰\W<×;ë•¡–_n-„ƒå“
f&B½8„ÿõœªâ5¦7<½ä»`¼â ŠöHmMÔ¹(ªx*-“e¨`£õKfîR˜‘ö*¯? áUÈµöuäü¾XùMEßM}K…èTÛh<ð.ž=µIÉøG;reO¸;¹póž5€á"ùÞñ½ˆ’È˜Éf¹ä“hý{
šdéü®òì¨Wš¿
²	Œ=’MµÌld0~1úüÞù—;xþLç²/ÎþÎIU¬[5‚Ý±+LöÑqZƒ@«{¾ô_$­+Q]š9²Ž[Æ¡•2«íŽ‹nÔ9­“VTLYLŒ²suLFÄàÍ8 !ÇHSDÃDÕ!˜7´\LIÈ!«!ØÚ)l$üWˆv½/½OñlûLüø`-rW­ò*@±‹~9ŒpÅá401lÝHª›¥ê}Û4-—]ßsœŽÁSÇïðU†’ðÛä¡6	Ð›^¨MµÍZ&U!?XÍÕŽ‰ /ÎþCž•%ä(¼Tå«—%öæ*Ròxš¹­Û‚Å˜|Œ°CéË]Ð.Ø6zpþûOkFX’ó„ç;g¿Ku³¹@%u‚p<=ÉÁñ­1©nSäL¬°Áqk9§¸XÀ…ƒ~íZ¸á·ŒÀî²ûî¾ÇQòKó9d8¥5
E7³AMCx™b`S1§8~ÿªÄâõþji.¹$^S™xŸºì°fµ¢ÿéàªMRuyœªµ"VžnŒ¶£XRÓ~aqŽ=ÜZXÒÍïòV—§]™^åQÎ¶4y`E.3±V=úñ’«£ð&B•º$BË X^>¥EðHpã¾ÕtH-iiœÐ…úÄu5ä£SLì%eˆ"Ödâ‹½Þ8¡røtHUhëºðÅ?Wn¥ˆHñ!uI-M	¬hžÏóCuH0OK;rãíÛlfF
­˜Úø–¤A’‰1ä6NâO:OQöa£ÁSétöÝH3½Ñhµ˜€:ÏžBy->ÏKlµ®/OÕ'Óqˆô]BÅü¦q GäðŽxÇíó/ÉÒöqœ-äbÐGÌíaDÊ?Û³šÄœ'åÍ¡0ª‰S9ÿDÉ@Ê›"Æa5E4Èˆ¸fSõ‰¸‚x*I§âuQ®>
ýQ7ù{h¸FÏ ÑåJ4BmÕnê%¨¦©,Š¦‹\¹p§ÈrªÖ,™²h¶¬ŒQ8(*Ù¦d ‰sú¸$Ê´6)„Ì†£èü—Ç:¨©:ÜŠŠ¦p*a¼Ÿ;©7¢`8PXDë7†¬,!˜*•µ<$LSÃ7?AÖ½Êäe)#fûüSB%ágÒ0Ü8‹ªhÃÊ%Ùa‚•º¤^D!%ÔÍA¡UåÉ'ùÌ“êú0CÈTa+71õ¢ÙBƒºÀ•¼§^tqéV–e_¤¸°Iµ7VZw N0vˆƒíµ7µ*OI_¼TþˆCêtT§ÀU€‡úÎlî¬çÔ/:Ã¯œWó)aUhÞ`…&v†²î]~!O­Ií«øÊ^r
G~à'—U©Y‹¾f«¢w+hB÷xÝ4M6ð|‹üÐRµ]4ÌsgOÈ2WþËâ‚Ôf¯ç¤­~ðþn*}b‹šž¢¨[„Á-qšGÐ±Å3T€ˆ­ÔìôTœIÀ£êoà™^Ø·|uÝã×
…‹Ò¼^%äzeŽµwû$XYÔÀdxYxE˜YéLŽ—E-Õ†ÌÂë’a³ð:¯ðYxåMMq­[GÄ!„ê´Wbtš´éK×Âë
 ¶ðÊ‚lí>¢V*4ÕðCò5ýÆµãŒjEÕ“Ä2p[S¢¨	‰K µJW+J·ŠÀõ·ðªï[t
õEwPÓÁ·®ë9žÔ‚ãÂKÿùv$h"sáU/¬n]k3iU×­{Õ7@}ƒråÂl:tÇóÂ,ø	IG˜OE™
yœbGq\m>Þµ˜#RkîN *\¥Ú“,o© Bù/h}ûGõ+éH#X8‡@ü>¥LÒË•ÑÊ«™Š¢ì±l¦`’ß^ß8&ÌÏÊ‚ÔÊç+½â4¦
›Ì„Ê(ù-Åß(*4H-üNõO6·ØÒÛ™=+¹¹g˜»ïù%zÛºÐn$D5èîV‡Ú	úÕ +ò‹Ìé­¥.“vrSAÊøBÏ?yþ1JCçR§MøL´oLŒ³Æ­Ý>…îöÐÕõˆ áv.ÎþÀÎìêŒåKƒ³M£d~qö›.s©ƒq®E]f^œý”þôD:«­]zDì¬²ÜHÊ™«ý·Ò­Ô•ÇRÜ"Umè{OpEm¨¥¨¡j6ÔPÍel˜*cÃvÔaÖzZ­„qµ+óxé•ºV¤]càüå]ÞtùcE%j«f])Ši0i±Ÿº•J‹¦6¤Ý^Víy;ŠàD.„ø«ã¤¥²fJd²
ñg¢Âák×¯™d·(\9:;FÇ˜¡a¾¨µ]4­cì•êb¥¥úqÙ.!^?­-¢×Xåþ f®ãæˆÂIåìW˜·€§¨x¢6“[Ìóÿt{:q':‘z™…‹$šû8À…=ÿ4>í+§¿Hx÷C‡Â-,¿ŠþŠQ{[Òvê™ÊUš:!¥Ó£ixh™D2.Q%dêýSX»‡†ÿÄÂ¼j-K¾^€gx<ŒÄÏ*»D‘*‚€Ö¯Rç+(‚Ú¨pœ¡ö¿‚«õðaÕð'§ 
›bµQb2"x„q¾!ù8ÊiAÆD‚´WÛn‘F60Ù•¿DÂ©K%/zÅ«~®mÙ4MaR4m#‡-,o+gdl$B€F•‘d”Š	ç™Ø”T+Ž?¥! ã™R"­ômÐJUwƒJe’jiUØûX¸ë/m¥åÁ}ï°<r‰N±ÄQ^s;¶£t³Ý»8û'|õ4Zx>ãÜÈÔiç¾aKÜÓÃaŸVU½"ŒU)kÜz Ò7ÆÆáÑ¿¦èÅÓ+ê;4s§å*‚x§F,4ö·çÛ½^–ô¥w%“ö,”¿CD1Ø­Àµ
°gz©ÎÂg,€÷Ì{h¾µÄ8•¾«þ+ÜÒŠ­¥ê'ø@ÉÒÆß$#Þ®„a¶C1êé¢FhÜúPÜâ)rp“Öàôü¿Þ ª½ðq{%Ò›':Ÿ§Zu¡„3½ÌÕ¾di…ÙÝ}%å$j?OœO5ÙŒfMåÐBÍ·Ì«â×ª8Ã%f¸ûü“·w¦ßìNd½„J‘*ÿöÞôÛÞ¥,¨ Ç.ÚŸ.ã%È¤Ô³q7^Ni8•ûaãÖCòM	Á«B¥—ü8" S#pˆÇhšv RÖ1ÕÝ`¾x%'ÄÀÙ»ï›sŒÂ/5C|2Í£'m>òêD=D(ÞÉ0ýI³ŸZ±Ÿ,_ƒ¤3Õ$L¿úB6‡gkq:>þ½ÇÁóµàAOàIßè†wwÞÞi
c®‹y5o'v9(qê“+V—®:í™O§ØM¶À¸€Z”è™Ô¯áwcœOrp]ÚP’7R‡–cßºãù#VÐ¥åæf8ÇfîÝ[˜iÎ?|8×Ì,½MK;3hªT–žW’Ø¢´nJR+ E¦F¦W4+®uÈî»¡ÓÞa¤S4A3vëƒÝ™Ùö~<aYOgOá¨~a³R»ö†–}´x‰19Âä‹B@J¬,q<Ð;lÃa¼oûƒfc‹¢0e³z×ïºü—F˜ÓÉŽ0wI­„ßnŒU]b²:&a_fê,Dqg3(2Ø¦^’ˆ¼q¡àÀÎ[Þâ²Íc½8ÀÏÓ©@)bâÜ‚^û™‹U@A-«ˆÀÕ¡þóY&é*pÿkÝ_HºÛb ê”P¤ëãŸŽS4©N©V¤7Æ·¼‚3-ýA7wymÃ©Ä!	ÆÂíB/27r'wûsþÅ4âpYâaSçÛ]nHî]xz1—mÃÇwñÅ":Åx¹ÌÐd¦¢zJ”ç~õû¯Ð|GÁÀÈ	#°K ¢iŒîÕ†å–Á£Œ¤ÌÆm¼
ÕÍ^—ª‹üg’@]íç_…é
?O{ÇðÐÝèçUØ.¿./lé~ì ]½‡_…ìêhVÄïŽ	WW²ÛDOÏÔBôòÄ5YfÒÂõ	À,ÏÁÃër‚0'Yè‹³ŸÁBS¤d"µ5Ÿª‡)8FhfÔáXQ™¸äÆd¦M\ND&¥UK#¥Þ¼‚pMåï„ËbJ\Èž ›TÇRƒ9RCLšÊˆ5¬ü„ZYåxyEfµ0H&†×ôá0èæ'€-è¡Êá‰8›Ï?å‘ÊZZ<už”o(Å_Ð ÑSN ³5nÝÙb›f ¿·“ÝÙ¾ÂŽ¼Ó9-ßow:…½–¯Ó’Ó«41é¤Ø_Þ,Þõ¼¨Ú—3“¼ñŠÙä7ýùÌè_ŽwIó‰MWÌ&Þòç3—ïÂœÍÓŸÒ¨‡ŠYîºÒ‰ð„œºÂŠöµnÿüY"VM)[.¿"»^h™×?^OÊÈÃóc!ü.Î~ÕMÞµR°›Ž@]­v©;ƒg­vþJ¡`kúnþ
¡”—Ñ‡ØIÌ¼‡	Ð 
•Ìß«Ü”—(7%YÛçŸÅý´¸o“A}êÜ|–KAAJ!²¿–Y&‰¡"Ç$ß«“’¾_Ž“dI_å—¾¼ü‘í¼ÌÙ%{¾'¸Û{˜ÝÝ/*Ã¤g€Ë=º!?á‹Þ«ü’¯a~Iœ2ÿ6Z»^®t½þè˜,uôøÍ3TS.5G#¶K'çrs40@îÏ#=ƒss:?»SNÎè&ÉÝKJÎèŠÉÝ+OÎè~’3ôß¹–ò:FñJRjPÇKí.Èú®åU¥•ªGª(´’ÔcÆj{õB2»³µ¦1Ÿ¾K{¿ƒVÕýˆ-Ìž²ÕgìîÝqúì‘q:í·Þ\Ö]¹˜“Kˆé^^BLNŽ*³/òÊì¡?r»ðÁ…3òòbÄÜÔ‘Ï³ºä„î«„êëUBHÝ„QOº6) õ<ƒbÉ%$€ˆÇéÝé¦$“ú2æ~ðùy•ùñ*óCÝñ«Ì²Ì•5¶9
½æ»2£×ó­í3²Y0à—õÒ@¢§ê$‚LìÒÈÁÓg£¨¼Uæ8!ÂvÐâ˜Û¥¸GW3EQ-*Û±{hÂÊ7?G›7}ô/Î>2ç¿sÌž\<û/ÿsì‹³ŸŒ€…[^äCzÅv%Öä”Íhq-sÇØŸD„¼U¸™†Ë©h¢|§{0R²ß|Êß)}Aü÷Ÿð£sè?yÌWWL…þ5>©ìóßºsÌ!«j4;âlˆI+G ò¿F	-¡Pé |-˜¥G!/
SÓ.“Ê7®6ÐëçKPÃ2?‰U^4É—JÒÛIÖò†ˆ@ÅÕˆ¸‘[Äõ2Š:(ª¦»‚û–›¸/Ù¼­cÚÖ0kkšÐõ‹Ó·ekÚ±\ÐhÛï¸ =ctE`l×43×éiûü.{ ¤o³æ=Ò†hvú&¸CgÿL¸ð£‹³/p_þ
}³ÚÝéÊs5ŒÛú†m)'$«6èG¶y¤©Ævçý}¶ÁÌ6O!ßóBÃa-øÕ
ú«Zå-‘nRhê1æ‡FØo‹A¦M³ùìÝ³ì[8r²…ênk´sÆl˜¤iÙ²Ko*öMnNüõí_¢ïˆÎƒiu^
ÊBÿZP_3„ž-KhI»²áÆõkŒ5¡ëKiÑ¢©ü+t•‹i:!6°N{5kLkÀ^läˆ·2 (½tçº¯c(­W |zëPÓœZ€Gà‰5‚«Õ]¶o¤Âë"¦.%ÒÅx&¢_ß6MËe¶ëØ®ÕŠ’Pêú¾Æ4ÙžtÝzî+Æ}>~ñeõêÛ²è”º…ÇÒzZ¢œ(=þõfüc\›ïø"æb«U9Rù«¦‡)˜¥vh›aŸpéØn“F9G'åé7?ªgi«a«éä*ÄIæ¼O‘«1ebÀYéMN¿Yg;×WÍ½_ÇLWi¢«2Ïišæ*ÍråJ¡"V¹Ê§2ÃéšÔV×Øf·kCÃíZ þ¹F–¾Î»Ý>è½ö-Ãq@ˆë‚žàÊÖ€+nXÇÈ–Ž)’tzì`Ó„‚"ÿ ŸD;x4Z~rkú—êþ‡ž‰7Â?ª;`€è4DŸØ‰ø—üþQ`ù'ø_ùïTç=‹ hÈµ0¢h­Ûc°Ž¶C~Ö´Ý`ã$ú ¿ËHîþˆÔeúúÑŒ(øc"2h7°8"™(¾wv6ÖBd©örÚ:A8–µà·Û¡÷À;´üm#°Ð/˜t¸[üUÝ‘ïá£kì€l½M¾ë[ûöŽ*;Æô/èñ}L:å=¶m·ëŒL+´(4˜}Ho˜Ñ-TW~ŠîÛ®álŠ$ÿæ|è û}h7N¢¥œ‡nL?+(‹t‹mzÅ.hýÙ¿åÏ`‡¸üÅÛoœ¾’?)óÛÆùXÙouFKÙuù!Ó—ª“ãþ`èù8ÆÌ^’/oƒ
^Ë›QþT>áÆ´~v:(éÏ•cS4ZuGÙªÛ~ôA¼v²ßäm‘@“UÜT L<.~û!¨üY{A½\øâ¿ÊžÊ—Û¹f3÷	‘h‡Ñ¯\tBdc²&bOÏæÄ6˜¼à]ËØA@á¸©¿?èÂömÎÌÃe">ÕÂ§¤2ÞMf¸6:m[6r“þ›>´ö}oÐêxaÿ¬0sÄC'¤ È tà¢àË §žIº‘GY®€©‰ü÷Ý}O"ÂæÕtÐ${¾aÚð²­ÐkùŒ†;Á_ÅŠ&/…äÇËKIÄ&OÃŒÃGI•0j´Ãùå`ÈŽ/—×ú%òq~Œ°ž3‚BoØ‚–Ðÿ¶n¬°>þ^‚F0¿¸µ0tœ‘ßZ†µ>Ú#Zƒþ‘ºyó&ãý!:åÊQKÍ+”éØõD‚N²ásuâ£Ê¯^¢^tÞdJ–2™²rX µ–É™ÈNˆ¦¥æíþ]¼è²îFî{ì®}þt@îåO»›ÌDl²h÷*¼ezùz6‡Þq9ÉæfÊxü!0‘JÆý9aÎùŸˆÑ¬§§ÆÇ9`&ê|KÇ;evŠðõ2FšŠL—˜×m´¤¾N¡ÍŠ?e Îç-A‘«—')âmÓŠÉšï/ÕŒjX.UÕd^WHÅ±Ö$•s>Õ™vóüXhó5; §KÈóÚÇHÞ%É+nû¡`\¤Œ5XoÓ~A,``æœÉÉÞà¾
Ã-¶/Eà[Š8ÝRZG >à:è IwØ"&'+“Û,©Rwgã–Øi¢œJ#!œ‡p€€.TÓ$=üñÂ‡·Qû 2š=-OçÏäõ6Ð5ÆÑ6síÓojCS©eI™ö¯pÎk¯" "ù!¥4áƒª2g?I+ÀìßJ‡l!I;
7ˆ€Ç8Yû!?µ0¾Nšú1¾ÜqxÇ(_ˆ( Y×Ìé¡M]‚Ñ‹«ô¯\ÿ"Ó‹¾+p¼ø{»“¬IõxNg›éÂÉðóµ”KµSÀ×kd)Ÿ„	¸f3ÔÊ¼.d]‡”?1‰0ŸLU„¨EŸ	4g™s¦´X'T;û»<ó[;ë»*ã»ä8”@ZÌLŽcç)ó•¥˜‡ÅËÒÞéÄLÑ@âÜþ$/
ë"Nö$´LGwej†Í‰™Ð²Ð;’ÝÜ´à£hA{Áª¡‹‹³ABðÎŸ†i|$v4 Z^Ð*´Cð¾?íöe±eÒìjé´Ê‘jPJy4ê°î·’)@¨Þx¶oŒ¾cõÎB›>f:5ô 1Úe!d‹¤--fd’>p#ÆhÜË+K@‘X7Èõì2>&*Æ.œ‹ r¬p<áEõÎ4B£õ8áïÎÿ?\KÎ\Ù¹ 1f!['ºXG¥Õ¼ÀÈ³žcTëVªl<ŠÁxRº~þ	ò<«ø›—•æf…N¬œÖ"ˆþË2©*œ…ÂÌrÈ­lÖ	MóT'2*òRN¥¬ jaw‹u[8±6O”¬Qºzüé…·ÎË9½ÛžíVmÿm&S»IoŸfšêôÊ’(^–éÝ2|ÐÞüp¹ŠÃR øßBh×møOýIä?ã¡Xâ’_\c×fMBY›£àWcŽQœD†ÁUÔÆÚš§yÑÖ0iŒ0Ã—ùí ûJS¨„ò‚ÊŸpH¼è,þ€^f‚ê'[ "²`Ë‹ÒãDËÃFô\Úìa.È?ÛÌ¤ìN
\âÌd)\iÉ•q–žUàaê€8ßºŠ-ÍÄÎ+/íÛâS‚ÀÌX6¢â<ý¸K,P	?©Œ®uÈw/í–>!ÑÜ¯¢©‡yµµ9´–ÖŸr#íß³·†í°fŠÌ¥qV)`C-íºk¾g¹»°Fÿ³‡#hw½ÒêÅõ¦O°àôü×dÅ?ˆø˜^Å_1™î÷<kVÜÍÜ eÛ”VË¦³ÒÄYe1¹¸Zb-¬Ä© %Jp1p­qQ’HÒ³z{ñš­ƒQ(é¨g>Á"öèõh*a“vAy¨¡‡UŠn½|Öo´jb5fbÕ«(¬qJ¯eŽ©vèÛƒ&Õ
~-ËÏ¢_ª8ZƒE F6sÎÿ˜0l^³í˜ó×¼ «±zQøÓ€rà†óò»*¸&YþSs>Eam°‚Cñ6kË{¢¹Ì65ö\ENJÏ=à¶úE—=Á!ùJæI}„æòÿ  ÿÿì}koÜÈ™î_©hg£V"µ.¾ÌD+{ KöŒ1–ãµ”Éìñ	Ž©nJM¸oËf[Rtô!ù06Æâ`ˆ1Lvƒ2Xƒý ïüý“SoU‘¬*Yo±Ù­Ë4ËR7Y,ßªz¯ÏC'fã©ÕiÄk6u„Ú ýVÂÀG`ÌÎÍ#Â3S‡±\%&9µ—ð®Qš`Â)],O5/ÐÞVœÝ·ªIýJˆK€=Í~QÂ¾JŒð¥îŸZÒ~Íe°Cµd `6žÞ_ç 0üÏq(09¯rÞ<ÀóùceD5™¬ÁÉ™$Ù¬sC•É¨ë³vt—¬Æçx<vµíºâÆ¾$™Ált(þªÓ©\~u),…1¢Ý')WI(û‹t_¿¥ûˆRÞT-«þÚ“ö0ÏO·;é5Ñ+Ð&Š”ó¿Áæ[ÀØõãÐ
~¡ˆïd}qY>“tå0ªN;ÛÅ«Œ£mšMB[ÄÞä·ßHÁFdiaÈ"@+ù:ŠAe¦èÙ:ÌÈE¡g3gã™«±zjîáR<Zc »¦Ó¹úVS¿Í8¬wZUÈèÎteÑ¬åÅ”Ó@°?Ð\DÂà×W
íŒÆ¦H ña5ã Ð%ŠR`i~Èsê’§²n2Z×Q¡ê!ü‡R'ìzý0ùoï«ºR€ª‡Æe¦d›Å/Å¥šÝ¡ˆÜ¾u¨‡xw±y¾#ñ‘d|Ã§3×ñ}FXpG4ö²xf¢–A=v‚_VˆøÖå1gä»_ÌìT=öRÃy>ûûÚ).ØE^|yI¼€nÍÛú8Ö#­M7$c‡P)±¹W›ün$CÖ†S‡~ÅêÆÏÜÂ…É|éøÖÚµ{^sßOA¸{Ã!•ä†×"¯üÒ×Óld„Ä<€§±Š×(pÈ±ìeærÙéÖÙ9ŒØÄ·…r¨ìU.£¦¢9‘/ÓnØøÒÀñÄ µŽd]Fq!ÙJ¬“JeDÁþÊÊDKN?&­…÷ÝP*B“Ó}Øoz¦{ìuOäa1©«^Ó’ÑAÓ¡Äbªl˜Ç4õ¢DKåàé3qŸ=ÙÔâ ÉQã ÚÌ›¤Ôü~eN†Hõ?	?åÈ@úD3‚6k]ú¨—’Ÿ¿*lÃØWÇ+œ ¿\aö	Ùö^ºI¾;˜>»ê¢¶Ž2¬#YÞ‘Ôäeù¯,ÿXèÇû–?>?ýòhì¯ÙMÎY—Eª5P
œ…¸*ºN5+«5WŽŒ8Q!]NFÆÝ—àÌ¬H•÷5Öà\C;AuÛY Ýhé87=æÕz]ËÊ÷tk˜%UefD1-•LD¥G“Á?±ØÝÿ¯¯DÀœŽ%©ªÊ6tUYÓ¦”‚ZÈZeTÖº*µÛËiâf+©D¸Õ{t•¹Ui¥Ù]m¾tŠv¥ŒV“ÑÏÆæ9sãÊ²óÑ'-NI°ŠÊWV	ÔrzVøÒhù`¼9uÛ“-ýÛ¡UObHlyüêšBÑøcîsùäì[Vžû”g•+Ô<9ð [ðÚ)Æ•ë hW€(H‹ÉÖeçå•A‘<Ô)ˆß¦ì>®åE”e	BoS°rG;åR–ÅVH&2(DŠ	5ÇWêƒæÛñ•´‘ŸãÕ`tiß°œÃcb¶z=Ãè"Š³Ò!diE}dFQå¨/£±?îÒÿº<á Cµmê-–ªz2––Ç[IÜ‹Ï+Z[Ä—kia¢H)5c.g£!¯ìTéÈS¥£úžd·AEß^öi…žWšò·‚B—›š…“s§E—ý}`¦@ÌClÆ >OóAÄÓÃ”¸#7àš¨Ì¹ ÇÂÖ–ÍÉ„›û€úXÜRá<¶ZSãxÍ'-Ñ kï^aªÿ±/\_ßšÕˆ.ñ¿²c>dDf½p£ÈoÁUhð Ó¨¥fËØ$Ã¶Â€Iø„m(áÙf¿D#úÍ³ Y£š°õ©Ýi­,É3$uK+€yŒÁ.0ÀÜ.khÑZ°1…¼ÕP¢<ô½³o,Ý½E­Ej²aÔšŒExÍ™¶K~³Bèß™»î‘õæ 5a“)«ÌÉ¥}†=Ø=)œ?v3sGO	•RAíš‹ÕÙ6Æá‹AP*BÞlñ0òs®ÏPþ7¯Ý«| ¡Ñâa„3®Ï >¡OD—¯E¡wV:–¢íâá'MtDGÜÜ*7KwZÃ#¶;væ5Þ¾Gª<{[:’ö~÷¢pV;ÒÕn:".[ç§_0„\	¨×ªœU£Û’ò¿|‹Á'öUU>b†ˆú‰(H«×¥‘Lª»¥É“ÄséDäé{áÀÿÔk×ÔÁ°ô‚±†Ñë×î%Ç!Ù0aA÷éè¼	€·ü]Òúîu—,Mp$„‹FÃÁßZ|ßbÛ`‘¬Cíð£ û‚p WD7;¹ægÓ®
\ÞÓ]èénÌ~ýÐØa ÅØÍ£j‹àº\Ÿœ+X«6]ä›²	4ÊáÁtövMrü`×*?üòý}Óå\C6ñË¶©	Peô!>ihBlßÈVzÆ6~µ`Ýò˜²0^ðÔÐïvozÔp¸E,ZŠÃ-J$vUW{Š»Äõ¾ÿ‘Af/®ÏÚáÓî/M¯˜œRTq`EÐ€aÞðf”–‘#ºõ Óo3J2žÑ—Žß\°”r&¶ÃhøþNw¾J–í§ù^È ˆÈ&UjêÚP§Ãñ€Á?Ð“BÔ6]Q¨ªŠ(n`ËÍªºÖØ¯òØÎ¶
Šjf]¿=XE%	ííRKi•þ‡)ÌØgK»`sÁ/éBÂNÿ%B^›Ðt WÙ/˜z°BÀ@®Ò_­çŸØ›ìRå5}= Ê2c0…&ZlGÈ_Púê{G«Œ_øÃú0hÚ¯‚Sïsè-~+rÖvCK+#¡„ñåTC	+X8A·­eÁtJPl_G% Á47.ÜK±’Ü.y°ëxpì¸]ÄÜn—Ä¦ºõª1Â”‰û
Á”q/tîM‹lz.È÷÷ÍNx~ú9£LB'VìD±Ær“’œT
xìºÁÉ¹bo¿’O&êÝïÎÞž &ÒÊ6øÀ9ä“U‹Æ™%dN‰«Œ–Ç3È°,Mˆ„—ž¦äÓ	h°o¤ýÝ×Cp+|N'ÒàüôÏSÄ°Ë‚&Tºµ)²ÜEx°r¬0)—¢ê¶c¯ôxÃÕ1_4u'Ü¢¬ðPVp– Õ(NÖ¸`2Jé}Xh +ª…¸*Çqr¨EÍ½ªR•R±'<ArïÊ>h3±Í_D Œél3&ËJ¶iÇºÜ÷V	P9‡Ý¨]ç.àò¨Åô2Xøôñì\}ÿ>G¹%`D–æNÈÿt+ùûè£2wL|â®.£xYÊt
'”†{Öà®ï±Cžq:ÏgËœ§:Î6gèÆî•1ÌY¶]d´ï¤ö3o(ø¼/Ú+gÜ³A…ùÝ«I¿ýrðF%ª|KUøŽPÝ{1•½TõWô6¨Ý÷—ÿ¯«Ô÷&VC\!,©Òª~KÕõ–«éÍ­ç]’¥¼e¼rÓqo£lñ®æ"dæ·:Ö#ÖîŽZ·ë\³‹ò„úét¾ËÙuºNÅ±ÕÕçºÖæNëgµk/iýìU²Ó‹¼6´¥TIçˆ€9äVFkâ=µÒŽì”D®–ô=²Ú>D~g€…4ÁìÃT»ERw0jŠ¦dŽ ÈO“¿ ‘òCVã< ëûû¡¿Ï´àQˆ?ò››^äÅt
dÃëô½`¿;È^!Ü¤™¢ÛÜ^3"XŽA:<:?ýÇððj\íþâì[2è1¸?ôÉK ÍçŽÎOÿ^“lâÍN" ñ¨7i4qÃ§Ohí¿ÝŒqç¿„'x/°ì.T]SÇjÄÈ{ÛðÎèøÓg•£àDåžV:üÞÔ‚¥­`Y,v¨ŽÙ™Šq¤"œ¨H‡-Î‹…ónþ*á­ß 2þúÈÉ¯æâ+U>œ|›…¤ÞýŽM×OÎ¾÷]E)ø+Ý}¹NÑ³¿vÉ#:©m~÷5÷·Žæª¿]â=?ýLü†QUÃìúøLÐ·ÃêB>Q¼?Ô´”1—(µ$‚æ!Ò–)eÁ$”5ë<‹kôoÐÀÙ_vœ·ÄÔøLSwÙÊºåE­:[+h'Ó¦É¢zöù¡K,IKöÛòüS”«PóÿÒAªÊý[à«Ê:~¿iSö›º;ŽœÝFq'$>ÚœëG}Kàÿ™\™óã–Sg›XWñÁºâ˜MÀ56KTÐ2èô#¦ì`ÑÛ»9ô0˜ñ¹Õ¼£ëÏˆÚ©Ø
fÏb$Ë·S½o™Uj¬$
Ë·I´§VÐlú]t`|AÔUº†<œ|’Ä5º.Ñ8fZ¼ÿòÃÌ¸‚`óýá.,ð ët¤’™M%=þöƒøK„6þvFACwÄ0tD¹DGm:JÇä hBšëó÷ŽÙöÕ	º5ÖËy¶Güís7ð6'WŽS,&‡£…Jü	ÇìINþÖe:;õËqî»ø–¬^Á+JÕ²ºœŠíªœä0››)ÏÅäâ.g(P!í j4z!ùèÝï>Ùts‰6.yí€8môÚÃ5~„ÿkB8ky	;Ô¢ïï.ÜŒÝ]‹·ÀÕ§YIj…Pß/ªÉww‚Ñ^üÜk·ýHÝ¼8ù«®¦¬lzrØƒ¿BÖ¦Å•êgŠÂ&°]‰AJíÑ7}Òb>¦ÎùéWŠïŠšv[gßtäºË‰âÆÝ$ýˆþpÓç¶ýÐkôQoa—¾ä°×‰ß
âô^=úá>½[®F\C…Ä–É
CD£³OS€Š&ƒ·f`cæNg
…>ŽAE6Î¾Yµï9kþ*3"Ñ.š#èØ7R5ÞÚt`ü&,§÷D¹ýsØðkµÁ°3OvyÕð°C~Lj»":Î3/æé?›ZMÇ=faâj”Üœ•Ù<`}"?¸s‡ÌÒµçÊ˜ßP	4¯¥”ç	‰ÝËò|t~úÛ·1¼ËýUˆ*B"ž¹“'ö÷\Ž)Y¦nÑá‹Dù¦,Ê3w·X§Í2YOr¼Î`¸ŸQÇL•0«Ö$gq”`—¥Çï·‚ÂÌÙ²HsÕÕOûe¼&›ê•Ž’žÇ•îP`q¥+cÿš\}†/Š„î÷Þ!¤êä—ß1ÊÇ“òC\EÉÁSæYªÎ#PÚ˜öyÕª¤M&ì˜Mî]?:ð©ùšÊÍÑÈ)úÇç§ÿBß½[•]¾V4=GæDÇ8*0œiæ™kPú„‚-›Õõð¡ïöB¯Ÿ]ëùêŽ˜ÇÄ™Ýrð#³'Zï¹@’£wóìl’J¤JÉq9g¨IbÇ±åc†#Øt¤Ô¬g’˜¸)™Æ´sþö(pzû†Ç„ù“¸T{/½ Ë–öb1-‰Õ2…´àJ'xJL2ŠŸ&†AÓ
ÃSi}Sþ"u•ëœLvêjœä¥ðsöïHxûÅ‘ÐÉ$»³+mr)”´LŸ.Ká‹c/Æ%JW«8éqš"+#ãã!ÎOÿw@öOô±ÖDm1oŽä2¸²•J¦µ˜m»å+–v/¶bI	\ïæüŒ±Ðcw\…ò²¯ªÈì®+Î2W*ÝrªT:x{¾pfíÖ°Žy2ûñÇ«i6·¶è1Ë ‰fÐ$Øã«k‘eM*dÑr=ÇY×{îÆZ×2Mž¾äé›"æ5¢¡×-&Ú˜FÃ.&–AUÛè]-%\
…¥É8‹w‰k|ÌbPIÒdƒa-(§ìO<KøÏÊ6¤j¿{uöF}’L®KdLä‘@\¬‚oÉcW\PTŒ…v^¿ JiÕÆÄ’ÂqFÄÖÙjÈëñ•¨XCŽŠÅ5£cˆŠ%Ðs—7&¦uñšEÄø/‘´ºŒ32&Ë[kŸ¿ý²+Ýÿ*É¢/Î­!]‚c’%ë@šk7M#då"dZ)±)<f˜£ÓY|ÿn5{€L?m+¸÷Õ	%¯uË~=¶àXv‰ºÊ2ƒñzYâc& áip,=o«¸mÖ÷Ä-3Öà›p°´¯ê£biîµ‡É«ïñÃaà]Eì³œXü¤€|¶ß&Ë	ÌM5©ŠKÙ®> Û4P5Î@•éKÓEúgÚ#å¶JÏ“þ¯Éz³tÁS¢ùIŽkÁ€G§N0Øê5ù/ëÈ˜Ç}¶Áà£ÍÍuþÛC˜l]¯½y{{sY/«)pæÁ³c;žhWï0_.\›ãÍ]Ë\œ<jÜƒõÐ÷H(NÈÏ¡’sÎà(ÒµBzýÂÑÏÂ.¶²XÏ¶‡»ô3“Ñ¾.Â˜[KÞÓX¡0SÚsýb÷÷ö‚FàwGdËëzûlY4¼qy¤Óò±ö“6
ÝçyNRó‰krjÝ^×}itÕj£ø¹[à¥%ZtH‡vé»a+3ýH*àk(ß‹WôÀ¦š}V7DdÈ¶*f¨ƒWàaÅ“Éä‘å-;^ÂÁbÛp°Ds˜ŠàÏäŠ!|•f}$ñÝH ÄÈ\Lû’„ZD©ÜéTDuÝ–Õ‚}	D¾ÜOÆÏÝx÷ë.Ùœ¬—gäÄÝ2¬·Œ9°ÒZ~/ØBGkùÓa\(x'
=´ºÚÑe£DwŽ9¦ãz³™®?Êj—Ivè4WeÊg%÷á¶puó)B%ÔyR(Þý”&3%ŠHdÍîá›JB§“ø“óÓoà÷ÀAØCrÍZsDVPÎmÑ”p1£ô<±•QÍ3}œvóC’ý°>è·ª‘.ÌÎ=[úY%³³'¸ûhÛcí%Àü8€Írp!š"w}íDhÈ	×ÙÜ<™…D·…­-<Š(¿Õ³yÒùIx¥'Ç¶CU€Ç™^Öž¿wLŸýdá½ãÎÉsd[(€	¤^Ÿ »ç²ÉóÏ6hóÞ¨Î<~÷ëÝÔ1 Üµ´¥Çñ³•¥•›ó„þ¼Å~Þf?ßg??øsZá]RGRoýQâ­?’h÷NîÒ/Ü÷üÀ˜`¬.N|õ’K´ø,_óÅçhLKÏ,<°þ|ï—îƒ¾”‹ÏzzGu0[jÇ„G§VÉò
9™'µÿ1Oî,ÈÉ²ÌØYï{Mj”‡Qm…JÞÒìÜ[§:#®SJTQxîƒ‹ü¸kÎVAtÙtÏ4bƒÕ:·}/l´ÀÙ–.‚Á¿›–qÑjÎºN—m*¦¿sÿærÙ–×O.¤¿#.­È2¾l‚AšÑ„ZM‚ …*ÄÝ˜Úž’ƒ“8“‰Œøåû+/ÛŠs/9»ý!J@¢£>í[—…E0°ÊVÿéæ*¹…¹Ê…W´¦ªH©De¥{ÛkûÌnØëÆ‚í³„jMºY;5¿N÷ý}?ª³[!vÙk*‡›©G­öéãÍ¹±I"ô£”.ßš_ZZŠÿ]¼Pr£…ÇD­^§ãjŠ¬>õ_ú]”XYÅU4¥	l=ôÙ@Õÿ{}qŸ*¯³Mq2Œ‘\<·sœ¢Þ‘â™gÐ«±¥ûæS*(öÉûi^r{?þ}³²´$KâæÍ` [zóÎ1D!V yx­×£rB²SÃí©¿úƒÖÆ©Ëë@»AßOÐ%g²‘U²ö¤=4ÖoÅç`„÷ðÔBUÄã	[G¶ƒ	2,ÂT´ûò­6Qa=;a‘¸ÜÙÍ2²¤«Ó\M2äéïö$yD®dnJa5/—]Îîð hûÛýŽÆ åë¸%z|í*¾Fd*òœˆ—U‘±¢wÂÒß³ñËj—É„E¯7Œ µTr¾¾AÇu]m%)»‡ƒxO!¦WbrÅø…{/¢v\XÒ=N·G·È‡ƒ‡~/ŒÒup3ðÚ½ýŸöýn-
Q[/ÊI¢©G|Õe’3µ÷Yø‘Ü?løíÊÁL²IšcbH#É¹ÒñæFøXJâàp’:8ò$gùM^§%ªS}.‚‰ÄÁÎÒG"q<X{oØ~±Éh]vt~¤ZOqó¥¸ïÃ¦–LÏÞ2»“²ÉßAÜñ¹{=M²sûBµŽÙw¿£j+£K¬×ë³T£xþP'ÖÞ+|Ð“¹çX—¦-_Yùmúº\°ü©ÉËðÈrÉer½ÝE,}ÉÖ€5UÉŠ¥n½í‡ ¢£*ácÂ%ÕC•ËL6W0{`’4µ­?ô©½I¥‰,Ü¶+W¬î”ñv½ö0òIÛß‹n¨×_X^\!Qèu¹A{Ä>P0R’n\ŒfmÓß¥Øð›h[^³Ïw z%N³™gî=V£†jIV{Û0-
ŒõòsFÎ<”œ@lÈq²èqŠb™voÉaT6ËØ’]´Ñ“Ñ>$ù_^žä—‚¨:]EÌznw/o6ÌÁÂ³˜ïÑ>3NJ§JS¥#Ó™iŠŒzT·d]lÊÌµZ².g”õ/]Š5ëòæÖØëúË,,ÓŒ1/™EëÒsDo¸ëdT+•ËD++•ã),2Ãl™ òñÁsÝP¸ˆ¹Ä‰k°`!šE¾ôäøL]NnÐãF9c^ï.ÚxEUV“µe=¥LÅ„*+¶jcœ,rd¦Û€$q#KÑœÐƒ!I¥°s…9ð±ý±pj)(+öÉÁqD3wÒx¾yØÝëa9
³Ua7ÉÁBÿÈs%ÆÕ ‰¶îyÍ}?õÔ|ª®4½ðhF7$ˆÞOÂìïeuô¤1FnÜ¹²²óÓõGäéýŸ>ÝÜF-áì©ÆõürØEÍŒ>
1ÁýÜÑxððÑÎý§÷7«ˆê’OGÞø.Ï~’‡|ÈtÄ òèî„w˜±¦Ý„sÝ‚_t™ùE?ü:å	1X-zª“:ù]
>#QZ½B·:bÀ- 2ÖÝ³©XPe°×nC Ý'½wˆX7ªD’Ab`T‚$s°@Uß~ ^bBlébo.÷ãîöNU¸0)Æ:Ä„©EcÞƒ§õ4Z~ãÅnï°\å&ó}ÇHŒÊ†ƒÎA¯NZ‘‹½ô	‚"¶ÅŽÜ%K°jXczÖU¯èÆžßÉ¯@H°GÒô1ñ„s×3û~Ûô µü§³,„~†õ 9‡ö$PËŸøm*í•tïÙ/\nŒ<I^Á8‚¥sÖ5Äb&´Î×%õM®N+à!ôÂ…~/`Êœfá-óÊsÕ¨ÃÍ<«·M…ªÖý—ÌÒ?³}•ÌÊêì<i!}ùôž«N©Ó/9:û¦)û89MÀd³Ç¦OÛ€ð5ÿàgÀ#×X”>Œ‹ÛÀ—«E†ÎOÖÖÃ°wð³þfï k±Do8Y¢Hºò«#¾2êàe“b¦É‰1?áRË±
ÿî(ÖÂã6•æë Í¨¯(’f~Âõ•æ´´g*ÐNÍ1ã.›<‡¼ £H¢ãS®„LûÝ¦«Ö‘Ö]]‰Óê!ÄîEÛiy=½n8uè„6ê‚5zÜ÷öƒ.pž=(4çj!ûcžÍC<æ¶
>Ê›À ¦¹‹cCG¥Ô\,¹Î5ÁX¼å8¿Xõ3'5ÈÓÊkoß'dyŽüˆ¬,‘ÃPAÓ]3÷)Æïž)í ™ˆ‹FrÒ˜/A·ÑÒy[Kdõƒc7KŽ–_F¼1=«×ëðû<IžÏÅËQÊÁ‚èÛ÷¸;¨4áú¨…Ò·àÖK¼ß{*z3ªdª‚Ã?Asð!—,$:Å­«€u‰„ÙðL¼ ñÉÃæ/ ¿Hýš;AoÒæÎØb›1`Œ÷þT;Ÿ¸÷ÈáäŠ$@ÞA
±¡Ås•„¥¶Þ/…ZÈ1)î1ÆÞQ!W>º_á·*ªŽˆá`vâÔ;0s
ýžÑ!Öjß´ymåÄgÄ‡¨5ß`yy£xCªËGzÄ²«Ê Æ/ŽÎÕ=p$B¼ßêpÅãñÁë{‚F¯ët™¢û|@uŸtÕ’«¹
T¬VŽ®¢Ò:Ü\3n7÷ûÍ@-óÂæ´ggaÔ8ØFfBK}#Þ †GP§ÆHí?À`äW–:i1x5?è|€jµ{7êP)M¢­nÖ’S•»âÚÍÅ¸Š4¯ltÂ31Åaêñú¾ÒSñá@/Z½Œ²l*DŒ0O%t!ƒÀ¸íù¼~[^&i…+=½övßëÞ9¾­:pn¬(m¶9$BÁ±Ñúîk4Î¾âÂ¿6ÇoÈq V¼ éîÙ.ümÚ9áÐ®9t
"wÝôA¯åg<}(ñQJ±æBc({ûLÞ=æÑë{PdRÂ—KÞÍÍÌf.½›†2¼[—±ãžéÆùéï¥—U¾{ÅÈzo¶r›z]ÚC Â¾ÈÊ¶“^Í>ƒyw;ö„òìRi<Áš‹‰på!”Nòì6ûÀ\?
?¦ÌöyV±ÄvYúù1ûSÒ25ÛÉtt4/Ì§À-M&ôs3ñh÷C*oé<Z¶¢Æ‡n‡Žðv„‚Î	Í'9pi Æ)3Ë…Ž¯®#'ÏZsX­Rä6OxLb÷<ð?…dË_00™ù&êFÜ
mÙÇuñ’­ÁèG ï ?¹¼Fïa•1zerMË+ 'x©a›Rû˜*¿î2j‘ÏÏçU@×9Í³¿Ò+’Š"ræRùÏe%„1f•ÐŒKÏzErb=S³µ2„ ’
amË„JÂbj Þ.ÛŒlŒÿ¾ÒN­oyQ«ÞñkËó¤ÏÂuÖµ±l´ü—a¯ûÈßÓÌ`žÀÏ¥/
A±øCÃª-"ñò®­ Xuàµ;Dˆ½V%+}V‚:ºxð·>ð†‰ <åé.IisI©D4å{Ji4†¢ó=Tâ½ô`{>aÙÙL<z1¨9’J/¹{†è-n¨æäÃ­•a€“Ç ž+ìµ„aQíÚåÐ*I\IæJ §€«ŽÈçªXÕT1'fm·c`tp¨Çì¶Hçüô‹ÙTØÈP°’ÄN¤f!|ýû!ãoŸ}K¢ÞÙé[¦Æ-i¦Ð˜1xQu‡¿vYžý©K¨6ô¦½êî;Q©±@Uæˆr˜‹ˆ„­4uðh—D>Äï¢p(3ì'E;©LÖÓ%Õ4*¯-3Â z¢ÎÝ?„­÷IÌhi³ABa»§×¢¥p
w´€€%Ÿ™Ðâ@7ÝÜÃßO™ 1z®K2à5Çc¥Æ¥‹pÒe·ãƒMu=¯=ðq§Þ9^kë8øZqv æçM,À5²6ÚðüV`n&Ö2:wÌ]Œ9«Vz‹©€3T‹/IÞ O¤Š¸š
sìB"_ŸJý°=8œ‡ŸóõÆàåŒ”LÇW>Fñ mlz‚õÅ8L\âÂ.;ìäHF¤r&m#ËKTi¾šñæ393\FÑ®Hœ;TÙü)EkDúÞ”rTÒÇ ³J­nðßâ°Kñ ÜHW1YK]qÁVâwÅeGg.+£Û©ã	ZÞ‚dÀpêÖ‹E¯HÁ‹Á§[gÿœ
T…*ÒèêäÞù[úDÖ@£û5çÚÊÝàüôWÃôâÆÙÿƒÈÙÛ©Ñ'û×@¸Àèï¿§ÕçêñÃ:¨ƒÉ/–y]¹Lº	á•ÉÀr‹³ä[j.	KÅÏ¢Ç§´Dt9\Æ<S ‘7]YË¤nÁM<`xwJ&Ð•kô´èÃÜdO#¨6âÙ¼’Ìæ¬XÖB`“ ¨MšÑKÃÁjqÂÿ„´ºJ$Ë§P¿Øâ’²a`ù4è¶z@>¢]j’'^øâ‡³¼ôwÉçtm£;0ûÆ)5Ef7z"¥×ºµad‘šË¹4ï”r1RR°‘´Ùe²V5]Ç6a?eé"ù¤5$/²¼Ä¤%	fFtžúût¶œ˜)ÝÔsÜîH
pól}‚÷Žã[nl€IÜ {Öo
žŽ)švTÑväÄL×ºMvLdMÆA‘Iã½8	K#\²J*!aðNîÆ¿(ð…50âQÝ
³;Md·¥äÒÏüG=ªk¤uöïÝVµ“~‡ÚcÅSžq}&|›å÷`Æƒ¥Íç{dœï‘<ß£x¾Gß‡ùîz:70p9Ê…ÂÐW¹çŒÄr+xó_ZEd59×à(<Ÿ½np[Òœí|ñäî¹à‹eFÙNÜ–½ƒL.Ö„©QÁîF†Geð¦»ð#* + "£öWZ¢Ë7SBhvÕât»ˆÔ>S¯–ãlÁ•(”¹T+ûôúq­@V£ÛŠÈ˜uh™¨T%ˆZAWªúÁØ‘ªZ¢–ßc.›Ô½Ó¢ê4HçìMi¾–å„Z“¯pæ(³´IùùV½ÍK?fb/IïòÄõúªh]J1¯ÂäYÂNU™dùŠ}(0CjåzÞ¹È—£T–ŸgË7<§š·­TTÌÚÛòú=%®b1Æl°Mç“$üäEì]äŠ³þ<vÙNJŽˆ;ˆÿñ°üãÐj·¾SÓ¬î
¸³ÒU´/r=ã·šHgN×’¤½GÞ‘
—ØÇÇ±´%§Åt-1J‰ådÂFýE®)HkhÄtR9/’UKð¤Èƒ€ª“»>iù¡?Oªd6}P~É€$¡[”DóS(gï™›†ŠË¿LV+,mxNÚ¤Z6è¤üßôw;ÿwi„çv“SqË^1ðG±¸Sè’‰çXZ»7ÚMj6huÄy8Onµd¦ZÅwr•ù)§í}’ì³™Íít!2Ç’NHhŒj²™,ìi®¡}ŠM7,.:ªR³bÙ2lŸ-/¨	7µ,Û—g$ýÖÙÿ‰}Ö…éNÙ´Ö<}öuî÷åsl]}J£'q+IËÙ\ÇŒ?Ê>¸Oôú~ÒÑûgý&½œ«ù)0è¬ð¿¤²>,:±¿â³Ì0Û{©ÌTäG~k­ì'3iôeêvN
·¡¹ˆ\“QcXÀ'1¢™;£5BñÅY,¿ …qÂjù½?)®:d·sÍ×ÃäêÝ¬4W¯DžÞ9z"»þñ.‘¡W>;OÎW ‹©O‚'2àŠ‚÷îï^½¡gCce³îÜ3îôuº¹tqŒ›£3zŒ~Ry9q§S ^ó‚ÄïRxI{!ì&'È¶ñD‡À[±'DÞ0³Ì¦Ò®é”jS:’>¡z6_O	*u³LvÃ}°¸¬GåbònÑxïöD÷¨p¬ÕhõF©Þ¥å»]Úx¼²ã`xä{r¨‚pÌ;†ÙÓ»³‡¹ÈB¨
-lçP<—VâÁ‘ŒVáµ“§
üh
¼(Ê»¶*|±;^Òàå„¿©"ŸÉÈŠ¼šY9y}^ŽLUùWåe^G5Z<‹NÚuxù´K¨ÁËÂzUy-b6¢¯MÕxåÄñ©ñ<ƒ}ªÄ[Î_|Vq\ƒÓhaÐzl>6B2›È˜Î\d×2Ym¶¥GÚØ>ê6„èlôš¾AFV€kÑ¸
Ö—n‚$8~®i´+ä½ìÁL†+`Lf³'Ï¡ˆŸ¼ûÝùé¿ DàËl½±ÈT<	®¡XÅhâ1gýS*.>ºLÁ¢Êñ½±ÙWV+DôN	>;ûÆÁNÂJ® JßÁÂO„‰Ãaƒ¯`.t²ñ]#p¤¥Eï±fºÕHÇxgÖÛ~º,ÕÌU»2_ê¢$¹¹I"UåI›áÎFø&¸\ct¨â‡ÎVxyüã³?R3/Î£ ÈwH¦øVt©ä¬ l	œü™Áp0à€ô[ ÕVÎ.wµÊíZ~x€ÈuÂ-+äk’æ:S®ÓœœSÅÉÉÝÏO¿<*ƒ“e^Ç¬ý`‚–Ñ×Åž9£ïx|·[o·“OJ6³é¯ÿáŸÀMÇvÒ°1úµÅËµ11Ee¹eE†P¦ÈÊš{“&0.xÃ¨Gè¤éµÛÎh“´"]‰Á5Ÿ·à"ýËK“‰3GÅ1$9„µ0	öŒ~ÛÎÆ÷³$ë§¢\Œ‡ó3ÃøiÖ[½0ý.ù†½ù‹»¸@#Ð‚ŽN
*ùÓç®iÏÎ2XìHµY‚ÔÜ¡g.4¤ØG’¹@úãx™î=ódÕàK/P5 NÇõ†À<Ž÷S?N:žœŒeÇE¸p)Ë
ÛGê¡—5ÆbÞl^kJý+Kõ¼uö&ÁÕµq“£ypˆÀNßãð_O%¤øPðÒ¾"Â3¢¦BR|¤9€ß;o*Å‡_¾j2êprkãñ>øY":½ªú$H¬BaÑŒúÞÕ˜‹×‡bYž¤&m^‚5<½_Ÿs4™´x,£˜´,ÈÝgAn9¦Ã&‚œ$·àï=“ytí!ï³+èì—ÀW–fè20“_¼±4sòµ,Œn3“Æ/WcÙÕ\.m0OÄd.6šÕ·ŠÏdÁ®ÂÎ3=û¡ÿzó¬^¯ÃïóÌ
v±GKÙÁ¶îÀÿuÎ_Tšð	ýùº“ºÚèx{Ù¦]ÜïÄ¿‡+Q7OXü\=ö9_y2èLAa¥+6]h£*‰Ä µE°¾O(»÷3ge‘vµh[–ˆQJ“Õs¤ÅõÜaŽ®Âè§ÖJ|MA­ËÙ½â
)uBxôYdhÿdRm|ºÝÝ$¯ì³³X9wâôD",¸Ñ_ziç Ôš´ãWÂÌ¼0!PãW;Ø'~ŽÎNSÓ\=-2*˜¾cñaêKB…v±A£°^þ ïe£·p7ÓŒÎy‘ 	íãs&Ñ(¡×xª«ùÌj“ùˆá÷MçU“Ñü÷½OÍl¾IËÓêCõ²	­XÒrýV¨W¼öº,pæ"~p÷ŒìÇÔ.4L£Ùh}÷µG!¡²[>ï¶TœéªW¼êåA¦ßÏž5]ñÇ´LC¹lë¦Y?Ïšc"]óxºÒ²!VLñ^_®õëð2Ù:4;WÂ apúo€Wõüí—Ý}æû§"›°0*¤Œï/-AL Š[î´Îß~Ñ×îCÊ ˆ®÷·ä¦lˆÊÁRžvœÓ÷Â*ü8×'?Ž¥qà[€Œå°àÕäÉîÉBX¡…Û&Þ”Úu¼ˆJO#ôÁw¾}Xz›ôWú^¥OÅ‡5˜p]ÿ€ð?æÉl³¹¸µµxDÙ	v¤ÁìSWà!ÏÑbD@¿Ûäª“‹O¦Š=›õÌe=O3Ny|@õ²™L•¼VÑ~Wµï‡¾ßUëÊøG·”Úõ¤1Eåy¨J)s¡Ï“¬CEÿ¼úgÜÈÒ?5TUf\ê†Ø‚3iŠ;Ä¨/&7j±¤eUÀÕ¾¯‰a­K÷¾£÷ÙEÜšÃ=\´ÖöÅ½BÕÁ“©©+x©n!ƒ«
‹°¸XŒ1?&÷CÞó6fÙ¤¸áèwä«KM±2gGo–'U{skòÄ}rBVTÑƒ¢Và3©åÍ…X8sYEØ1ZÛUO×¸vQ/V”'«3—óÛ6VŽòÂË¸2—O]ÅxWrãLåÊ¾¾ñ’J÷B¯œž”(üJ©‹Ô>üKƒÿ×%áùé+Q’–fzêA	E¾%`b-Ìð!IÒˆxm™R%Öbåeðå(äÇÒ`”¢AÎæ5d™/AM™µOã©1“5|¥®Zhøb[ÎÖœ•¶rüiúÕ%ûÜ÷3'MõJø®±ùGâ±¹ÊˆUBã,õ5lgÒ“¹Ÿ¡×Þ¦‹×OÁ‡ä}j:ÜÖ"Ñ·…s†GOFá;IŒŒâOWÄ©ì½Tdð›ª¿³,6¸t»,=œAiºáF»âÂ[™‡±åâ˜Yëc‚ñ3w?;§ˆ;ûÅQº}Ò­¯·¶Ø/{ÓØã—­Ý~sÄ¶Ò?ÓŸÞ‹sý¯€Dç§ÿ-”ïrb:VÁÝ>?ýmÃ¡#í –4žÕÄF*‰J"§ó?&ã4á9È ‡ÝóÂVLøUgS1ÊÖ÷©‚B@KaYaN$!fá’½Ë–ÉB*÷1d jƒÕ>¨‚×eÂù9ä«€J§GV–’IQ„F‚"DhBáÊèn–ó(ËyÚª˜G
½bORÎà†ÀK`;å²m—Í-k&xîü–µêÔ*«-S¥,eÛÞm­Øhù/Ã^÷‘¿§1(`€2l.YQøÝ×ç§hX¦8Fi¼~/Ü¬$­Ý!²$üˆÎ»
¡O~L_þhïž¿Ò7L¤à)+\1‰A[Àµ‡yï8ª—¼/­[ùäZÖç}gä5™mË€Ñ›wPÒ	Û¥ï¬®zqZ“©»M›H¸š1)Lfæ*}Þƒ& º–Ù"œGz%u:Ò+.†ÌˆéáLÕ•hìfJF·R†ÝÉ|/àzfN²N“`QcÇ„Ë‘_çoÿ³C2(ØØY¨ÇÂ@mã›6ä×Úgöi}öq‹ah2ÚiÎRûts• UÖŸ»„îÌâ·•z½>‡(Òr9u6®¼_q^édºrNÓñZ\É ôÅ)Û²šiítœ¼ÉV,©´BHýÔáRëÎcåf´œPðÕ(I
ˆÐ§JÕ¡gÁÌ¹‘)øs¯vˆÇœ™«ƒ†×¦Öù-2
‡ìÚ“öPƒ«g4ˆ\CmýÉ°ò!L[œó³®Øƒ)·.-FÞJq´D_E>1d<±äJÀwðTóÕW8V
ª:Ù:?ý×€4Ïþ
&Ëw_÷šþ~úý¹,h&ƒƒÇ& ]ã†» Š¡ÞÖ›MÕK¢Ý1ÿn6ŒˆZ?6=„î‹YªšüRÄk˜sB³_ƒ»{¡ï•€ïb«]ÃZôùn³¸Üò—§øfÁ³s'È«û&a{mooîob9•T‡Umø¸Vó2Ô€\nÌ/*%oçê‡ò¶®~-'dƒžÛ©«X£Û‹`¥îøÍô»¡ :Ê¢øbk³EIÒŠ~òÃ¿Y^ú»Öùé—Pù«û Ö”ÐæBíèú|ñò>äÅÙš×Çr;ÙrWT»U¢bQéyÍþ€-63ê.9	zÙ›.rT<­´ëœ’-«¦ªgmšÅŸˆ>ÃÂÁŸr!€öÙ·TùÇwÞ%‰r³r ¶ýÝ×CikDæU®v>«¶T5äh?¬*Ç’Í}2åO'Ø¹èÌŸ×¢¹S¨«Ü¾×ê‚0ö*°§ÇÅ§W<Ïéw÷[ï¾ò¸É’å‚Ùò:¡MazÞ×ó¥—õMÉ/Ä‘K~Á÷”ÜüBú‚¿nÖt¢cÊ¹‚äÃ8ÎÜ*Õ„ÂtöG•%(N{Îy3ÞË}“¹ç¶ô‚)sÆ¥aÎPWî)qÆ”8ÓîÁ#7F–›ž±iìBëìËw_Ñ“_ç§ÿT’±rÊŒ19fŒxÃ!IyJ‰¡_5¥Ä˜RbŒ›C²ÛK³b5ZM¿ £®}ri0’­e@—Â‰Ò_¤™²_ä’Ó)Z€J.2Š‰Âä¤ëI.{éF¢6È†¯@y5àßÛç§¯ÀÇ~ú†ŽGœ²}iº7ÅO~ºXü­£c0sT>Ž —àõõüpƒVm.ÅÅ®É9[ÆsçŠÙIÙ}!Ù¹VóæÉ.z·lÐŠÈž×ˆz´»ö…o™®yË˜­'ô£aØ%5OyþvrŽ6zPöj»òwäG¢öÖ-T­l0’-?üéâ$I|¿QÁx%ð˜ºƒGkˆ§7ªpû¡nßKJÒ
±öS¥-¾P‚ÚO±«@Û‡£<!Rê>kËyŽÒèûpLFC÷Ê×ÓÕWŽ‡ªƒc$,~8ªÀã‡Ã¨g!ùCgH~8JÁò[{•‹Ìïj>ˆN:Fè‡Ã¡äÚ¨|•vªYÛi²Ç¸añK«¶;l˜	Ï\ÎwÊï/JfÒüýY1à/"íMZ£o,©oÜŸ8N„§òèÛ…Fˆ¤C‘Gm¶	{Ø‘Û	
ÀY€G†že¸Åí3‘Yÿ_6§óA¢åjs'‰ã°<8ð Tü2ªÃ€„CÆ8áp «”rxl*Òár\ £àB²îU´Æ³ºÝš]rY " [(#D¦»;H!{¸Ê`Ykå±k.î1–¬’hì*A|d-•D<8\uv‹}³“C„#q'ÓÍ!Þ0k¡³:/šÊ2{Ñfã)­nÊ¥Ù·•>l'Uì)ýißïÖ ‰¦D›''$‚´‚;3¦K¬0”ÃÓ‹ÊFÃã»,OFN$4ÕéÇ ¤ú"–A+5µÅŒ˜z¸sÂQ-8'k±¼l”é”.P'kÿJ€uÂQJ
ŒiŽ£
‚s™±‰ï”úPÀSj¤4ˆ'OõTËÑa<¥þ”HEÛŒqÆ¢Öðüô÷©k<ýìåùé¯Hâ'`ož½Œü8Õ p²g‰S
Ñ8Y«— —Õ¯I¡r*FUX=('{¸‘€9åJsÊŒÝ¨pñF;ÕàÓó‡‡ÚcýÀD0­øž¦LíK ìy‹Z…7§ÀžÅ·3·]_dO¾SRv²¯V‚æùÿ  ÿÿì}moÉ•î_©Ñ:#*‘(‰’ü"XØÒ¼¶|g-Í$ÃX7É–Ø×$›ÃnÚb~æC°XwŒE>‹‹Ìì nvInîbù #ÿCÿàþ„[§ª_ªº«»N5›å!Ë|éîz;uêÔ©sžGæ	€/cÀ¶8I¾\¾ù¶9¾B4ÎÊSsYÁtµI€¾aðÛ€	¢(z#›&v«lIÈm Úòtc¶æ}Õ·zêñùJ6ÍéÂ>§Æƒ¦#åC÷ešh,üIBÁ65><LÃ®=bÄf¤uñÝÖXˆk%`­™"­M6­-tTµZ5I|´5>š(Èðb¶†ÙúÆ‰#˜]˜²\h’¢ø`ŒmM 	ç)b½,	¦Ÿþ…ÒÎ¸K$Ý…à¼Ò.’,”.q²GS>H—¤
xBÌ|™8]œZW±Žobã ÇÃèâKGÔ’,¦%v—	¦–!¢VžVM…§Õi*775W`c$µ(²ŸµU~V°µØJ>L¬GÍ;C™‚Ê’¸a<VLPËá³ö?GƒÆ8Y Ã(YJŒ¬ð…²›NlJ†©ç
‹Œ5þÊCˆè¥óÍW“£!Ó4V=“KOï¼ËÉc0ÛÍ!˜6ýË‚) Ä6G`zdí¾
ºõû
À$o¯ój\C¦OÎqnr
øPþðñ bE€ÂGtßv'€Å”ù{É`LIÏÊ;Ë¤rÌ)ìà	œ)øN‰Ï´aˆÏt8ì6`¡1Àer<¸‰š”ˆû´©òÃPa§Y@–2N
ÑRçFÅìáÊÆ§ëo€[û:‡F£xp Q×rBD†¬ ¼®ŠPg*`cÄ„XÃÛnÝjÇ‡/„ˆ8Ì§Û‚ðÇ1ÂfM3B”êpÏóœ“®i0¢&ÅI»€§]T
@*ÕØ¥ú&ãðÎòŒ îªõP€á¶$ØÞ”põRˆyr]æxy¹¯ÃË-ì9ZÞ-SÒÐò$/ý(ïåñUl“§¼æ{“‡ÇÈCx~&t·‰:í2ex»,ÐŒÂv
3QZñigJŸ¯!z]ÐÄ
o¤ŽùPªÈua%æ¸u*Ü:EZª‚B1ÊB]ò¡ìüà’« ²[Pœ’#ðâ&W.vÛÄ Ö®#@Ó0Ú–‡@8LU|<Zv…àhš©t½ Ñ|³N€¶ë€Ñ*½*\Pßé€¦¢]”eöËÄAÓüÒ@ÓB+!H_€L‹Î1æˆiòkÚˆiñ±Ó˜€iêá¾þpi¡–Kó¯,-Y§L¨4S{5¨¢Ñõs¨4?8Ã@tü’€Òâ€·L˜´ìx6HšpÄ,)åë‘&œ£Òü9BÚ ¤‰¶ÐMÆGó•øhþùÂá£‘0®DÛëDaÎ²J/ÔIðuAŒµñÖD³‚Ù-³‚°ÆB|_-\¶æèjÅÑÕ¸LÍ±Õte\í¸N[ÄBDVóKEVãSY\Ê'€ª”3WËº³lù,hE iŽŒr-àœô#5¿õù^k0¼<ÿ²K|á˜~¬!P`ÎÇa\ˆ»`%ñÇ¸‹¶£þÞ®H3æðvÁko÷nÂÛI±Y3‰r—ªáì.ùÔˆGCÕkZ`wÂþÖŸCÝ¥î3ÜãÍ¡îà…€ºKYÏ(ÐÝæmèNÄ»Ápàõx‡qïÒ)ÅßØ»äB;aô»v
&f‚—|”ŠmZŽÈHz+Ù.ÄŽzFrÝÿÙa0°„™¼êÔv€b		ãÄe¹'decG9´ã
&ÏUfZÜ‰ä4!-MÜèqx¦z/zO
µTä°}LXÒxèŽAyï®”UXâÈ-Ù¼TZá€’šÚ¿`ˆ¯»'2Œ‘|G¡4m«SJ“Þ;](M¨ìJóÊ¡4aæš9š03f:“V£t&úÆÙ†ÎTMJ$Š6ÃÙ81Ÿ(TSp"R‚Ï·”§&úáO$~xÚsûlLµùó˜äO÷U·í&³ÅPž?°ìÙOv[»ãÜHèCˆr&‚…ª8{Í@C…QÃY‡H_œ	çÚGb¡ðÑ+ðPÙº_UåFÏBBe(SéXý6üåƒ 2?lëL TZ…ñ P³ý$8T" ²QJ€ŸB7™€žSØÓ9ði¹À§*èS×è—u×}Á±Ná›]÷¤ƒò€— zJï6 =Í‚=žRöŠuo™Ÿe”*á˜Q  Ð)Fâ]úö+ÚÓäôòü;pR–å„¦ñSáúEÜÙƒ(ƒá©?Õð¤h²(™÷i z€UÂ2 V‹ã¨vjpªfÛå1§€ÔÉw¢(„Î$\åîßÇ^r¥@*g+j³…6ðA·À>w±/€Qê (K@?ÌV	,R½11Éý’TâÀIôtdðÕa¬Æ›,†<IeÏmêaÊÔø“%mÐT!…gÏƒ¼zÍur#Q*h~`’)ýÅÑsØ,HÐäàâ[Ìž½©»b£€»«¥cÄŒeF ·ÃŒ½ÞŽÞ˜„·ãÓŸ=¸D±R¢ÞE"Åï¥
ÅÅŸ­À˜à¨xo_SAj´.ÏÙ•ò¤æhò&)hfxu¥›± Å°R¦òãkÎ!"yPu²¤˜ÂÔaYk­çžg§îJ5¢Õ>ÿC£>­=”Cœùà1±ðÖÃkŽ¥T
î ½–¤`èRÅ·×‹7·"¶æªP±‚ªÌQ±JEÅ‚S,Ëìó2VpÙÕ c…õÕbMc¸dWÚû±ãú{Ñýõ¶ÛxñxÆÆà!Dî8ß8i¾hÎRßüö«‡ûWßõsô¼øuÖ³Nœ®•6Iô¶E Ñvf9Ù!l¶Clb·Y©Ãê ÔÀØoš`1×ùXÅá3Â1 fÓÁ²%íP%ÊZàŸ(5ÀX[@Í‡2p9îD:wb¥ÆI+qS³-(Š‚6Zèg
C»ä³B¨g9u)ñ?8h¤3dž†ašJŒÔqÃ<.Ùíºr¤²Š}
ÎB¹°)m£Æ<vy˜gÁ%Ì³Û$j4:q†ŒøÕpëÃ"ÑWpÈJ†c™7L,|üê‡A	=‡ŸÀò€©¢ð“tu•Üøî
•Ô¾ÕðAÑ5`|Øž?4ò‰¼—5cŸHJy­²är"^Š„¬Ix €7U¡öìŽk›0Uë¥ã¶må:ð,°×Ä;	,HÍ¢ Ø0¹%¬Ïo©Iù-	—pp©ŽG‹Çø\¶ QèQaÍ2@/4MJuW"Ò=kæôñ<¨úåù¯Œê6bØw=Ûhéãþãý‡û•Lý›Ð¤Ñ¼›^‹³²"q¼|ÂòÚm‚FX!…°´láµU_ »¼ÔÀ|8@Úœ`0G¤/ØÒlŒS6`1Ä†R vòPÿ˜,Dý+ñ¯HÇ˜ @C_Á©ÐýÆFåJr!D.…Ý]KaëÊ›£¤ådX’9æW¹x_W8Ó`ZùP3±îŒ fLû®\Œ¬‰k¼EŒFb(ß1@aÈŸÜE@Á4Ñ_n%öžµM	Ý¥±ù°uñ oÒfýÖå›ßÙQƒÅ_HëòüÛÞŽšŽ|v
Yï<pýS~àG_÷­>Ý…ö	Ì
cgÏÕq%bÏÃý®ŸŽ…êùx`³l”œ­Þ¼×‹ª.*&,ÄŒöƒ="•O1ÚŠOŸ¾}m‘ÚÏ¦Ê]}	QæÑ2¡‘¯TÄ®æú(‚Rs]bJ…ºÅ)]º'ÉÑÐûLë¬ëÔ•úœîç  –ßªv¬ÓÊú2é‘²¾¤™kÚóHºxÙw»ìc_>ŸrFyX%&¿¤fÿÚÐÌoTLå;7ÔŠ¥æî‰à‡tž;þ=ò#:æã9IÏDƒÿ„£¨F¿ÍGìáÖ¥¨Ì"~ÉA”­s¯Ñ°{¾ÕmØF &Vt›’É™®•ÃAJâáÑc³–¬lÛ,ÌÞÄÃ0™t­—Î	_(a‘||D<Ø¶óÊ|¹Ns;ÊÛ¢ïs—O\"dÉ
¨qµœ8c}VvYÚÈ_˜?r¨”ô”¼Z¹IçH -dwì¾Õv$¹óE—ŒF¯hm¤Ì€:øË3ábIÛ¶ Ó’Cxì>>iÑuþ`)®Èß?<Zº»ÚÚÐÔ%'&¯Ä;³Ø¿OuÑÉO·¼/ n¯H{€¸8È®«CM|²yþÒ†÷À‹=ÿSƒø Ó#//¾«èWžL[¶íkçpÊÆLd˜7’nû€EÉ>AåôÕÊ±“ïD½[×¯y<Tƒ_˜¿ö¤‹'6Àq<ö¹ú¨,òÀ/3YÌå¢Vê&ÏPˆKäSp&€ÜO2ªçôäÃ§/5†ëÂ AÚ½Êd1R'Ò½%ê¡AúG² _É¼üËÛâDÈâ(7ýH3)™.:üb`õ“©0´_[(ÇD)$Î¹Ü)U×¯ñSî¦V<ÐïˆKÍ*UÐ=ŸÚz'×JÒaå=ìõéòÆú£¨´Ky¦âJ2–Èk¬Ö¼Uæ,G¹å{¦îÆÆ(ÇÖëçó'uÂ¾É
Ç;P‰nˆ?åßuà²Tcú_þuñA!«Nô)ï®XJð7ï*–D$æ>­ë|1à	±ô¡ñ‡¼{BÎ‘3ïê¾}BÕ½8x“wml×Óë…y÷;]«}O¼1ù®Ÿ¬ï)úÑnvyü>·nìø{oÐïÛÝÆÖLúœwç‰íGfêÕ*­³ÔWy÷sŸÿGtúx¾Û·?ì÷Ý~˜Ç*‹¯?‹óJ6‚}™/å:0±i­¥QRŸ÷$Fó¤~XæO˜š	—Ç”Qq•?#ë™ñhÝú‘MÝ¼wøy8¾ªßòžÈ#×wÎøÿÙWf®(ÔÒ0QêÒr®Qí(•8½¶å4›à|Ö#ç2£(¤›F µöÝ•>9î»Èx€X/w…j‰6Gq¿™b0¯Ôƒ·—ì&Ðg÷â²I›lj&·Øa3`V!vP\†˜­”„€½AÛ³‘‡ŒâVZÚéøLdüø—çÿŽµ€‚ªkì*%Â¼"ŠL°OWo¯qoþÃ’õˆ˜ÌÐž?qxúAj)8ZâyG3Ó×À:¥í@Â‡à	;H´</ÏgÑ'¿ù¦[%Ÿ\|Í0èÞ'5Ò¾øšö3½™÷ôÏƒG°#8@´‚£:jCµ–I‹ÝµÁ
ÿ½Ø{á‘ßRÙn9b«ˆaÑ¢î£Îxuç§N;zdy>Hj"NÓ‡©)õ:`Í¾Ûƒh~Â¿
  ô†Üé"ÒqŸfí¸jt-jÓ]ŽÕ÷A—°OüwÜMs†Â¼¼Ö
àÿ¢Ñ“‹¦4¸â"Àa§Ë ü‚*[V0Dj»œm!òÞ­­…]“ðÑìŠõJZ-Ö€Tã‹5¸RM+¡I'Ÿ9ßûAŒ{ÌýÁpçümµ”@w§{LT¿²Åî¨iÁLÉíÄJÎ©¸"<?ùd»Ó!bœ'ì¶¯Þ‹ßà¢-p}ŠÒ ÚÓzÎrÞ™¸ç7‰þ "xFÍLîæêM°]¶¤³<¿M¾Ý‚]ú3 ÒeO“ Ð·$|ô„ã)ÓÓ„Óoœî‹J2gr<R,™l±ìž`%FÈ'¾50¼NlD²ÁöÛÏ¡ôw\B/áÒ%¨Ó} ÌkCïK½Ô`¶Á‹–å€±âpÕ¿!'ñ¤JZ¾ßó¶WW›nÃ«ò=Dµávè¼Loµ¹Z­V—p
2–XÞhàI=ú¬ßÆÅ‹¥ò,aO—xR*Áõä4AÎQ¼äÐl¼í„É°‚œÓéEe"ÄØmÑ]
¦“p0%¨°þRàø…†ë”ŸÙd…)n1"ÜÑaÌzŒ;“õ$ŒµÄ¶X†CÑi†ï„a¦¦œ„3½9è³Shlb12e!Õ}&9QøðË¤šIAJu-|Ãû;!ãœ=«k¥hŠÅš2Sj—ä‰»"ª/LF|ð©QÖ”A;”$ÖAxJ¡vˆÝk8¡ÞÀqØX`”‡¸aÊá0á2Ãmà•ÑøÌÂ×cÂsîšt±)J0TgwC1¤3\ß@dÉøñ	¤,rpd†±ùöõÛ/Á€¹ø¿Eq’VcË½|ó_rjwDâ„®P÷½0$e?Bež4²Þ´G!~ÂÊ"Q>up²QRY¸ ð/$HYþÕ–p‚‹<Š9_ØÁàGRÂnò¹˜{þ0ÖAoáS`€á’Ø¾<ÿe^L**Dqvµ$hi…9ÊîS»ßq<Ow`©´Gž ‚Ã–c·›I7y6Àtªl<Ø4Ï¿þb0¼<ÿyž1}%GäuÊÀ/¹‹TðÍ†‚Jµ4‘°{ƒ¦ãßë6lº/\»][«ÝDh
YÌàÞh¨Ç.jS¿€ˆÖLÉJ@»0I“‹Ï•¯'_Ï½øÆ'ï“©ŒõÈÚíhó;)^ÉÎJÓ™Ò‹)ù˜èìzôÚéÁ0T4öõDä‰}o 0\HDCÇï_ü¥{òîÊ‹Õ©SÄ…!IÿÊPXtv¾Îí÷¨Ty€_Ç‡'ÄÄªsrÝ˜r·Ûò-BX»z5øõ/ps‚²¤œCvŽïZž_õ†íy•…£È\vÒ8©õó‹÷´µBƒŠ‰õ 	Ýu¯ß·†U`'‡¶µ0]è*Wì!DN3oè+«ß¥Ó¥òüHÈf|°§ÙŒ¾˜¼’aíf(ŽÎ{Ï—ÉYä(Ú&[kT|FˆÁiÉ¢EX(W‰ZÈÁqÑžGÓJ,Ð	Ý-(ê@X(¥¸_‰î«Ü8û&.wgWè*	N3æiŽŽ—žczM¦á­ˆãh*@@¨—‚Üßs1Û4
òˆys-÷‡pÏ|~Òi|›véØæ{™pøJê»â½<¿ELk9m+ØXÓ.ß0g4AèË˜	’÷
ˆqiq¥C•@aØnDu¾Ì¼ËTQB’âÿ„IÊã?àˆÃ™«bÌ•¼³‰H,æOAêÜÖÁIËóâfŽW¢Ñ½gvw~JÒtr{AÀ žR7
éþa Ü×@*õUÚˆ~ Ÿ®=ãf–®$·û9”mÑ’‘P$|‰l°°PŸ.•ýÙÏR 'ÿ+‹}ÏzºL:Ïh1AB[Q+Æ=eí*ÏoœÑVnœuFÏõÇ˜‰Æ|ðCê\™ãN¸cÅÍ¶$Á8æžÏÆ;A®ýöË†Á{Uj ²¹(Z@xQe]Û\&ôïû{“ý½ÅþÞ~Æ,”!È&
™þ€ÎPŽ‡<…³jXõÝCµB7Q»ô‡°]p±¾šºtó¸Ÿ„ˆübíÂ4½±þÎéáD´Æt¨Ž«ÕëëW¨6ŽZÔâ8™Å!ìÍÎßUl“õ-“Ê?.‡IfÅaÀÂä¯ö¬æ!„JVjT²Ö—–˜ŽéÖ1HÇtF»¼w}{ôŽÀ-	W¥¹MÛ&9MÖ×x´kðÀoné£#Ò	”zQ—<©ÙŸ9œ/6½-3á.’+0$@~’¢üà‹•cçÔn½ºÝ—žØ,9êÍóé ÙÎlü"´Ãq%$%kÉ;‰pÛ`oœšÌ	‰!SŠ5‹mcŠï†þx“ nR„B„2æïxµ²ÊK"ðÙ™`J•1KZâ4CZa¾„q¹n‚¨‰•°°îD$"x8Dc’e%xÑp}Œ¢=@Ä%«A”.Í8FÑÈ¼å@zPC:ª"ÐH)¶"Â…™ƒ‘ j£<÷ýÀr´øO1ÀÈ(]aŒñf‚GÌƒÍ"—ðûäÁ¾I ™ä'j`ñ„ƒ° |1y‘šå)$`Rùe“gx^‹Ú†/V˜ßŽî„ø­ÌM¹7/Ewg2?‰‹ÉFâv\ôÜD	»LgÝ[¬Å×,O$ð‘^§YtÄ"¾Ê˜<¬åó™3k3çö5š8ŒâóMž´¼	Äz`>‰fm¾°ÙŸEŒ¦òÍ FcYÎôaMŸOùÔI½pSÇéôÚ,ÓÁî_§ô¸z$œÃ—3•Ä®˜Ï¨™›Q5¥o¶gW\âÓŸWb"·Ñ´ú HÈ‹Ëó?“ÊCúw©œ™Å»a>§fmNÝNL)ÆØ5Û3Êê Âßô§”){X°LÅáµåÌ¤ ùó©4ŸJ9/ÜTª[îžå>>º.“éþÅ7.$lºäñQ9³)êù|š¹ù´víæSŸ‰ãØô!©ygáèòüŸX¢ùÙ!¢x“U13Z_ÅY˜žQkÊ™›¬7çórÖæåµë·‹Hr¯ÑNŒNÿ¯‡äíWË™MqÌ§Ô„§”<_n…ó¥–·Ž-ìUÃÄ L,sžðH] è]…¼ÎzœJ”²!¾Á/×tÍÛ!¡=v`õžBÜÎ3Z^Ã&ÃŠ©òMD0°³g¯F_/‘ÊÛÆ<¸oûƒ~»EÀ±ÈU¨¾HÓxöü†" Ëé6Úƒ¦íUX”­íBŒ»°ºE%z›,,Œ Ü¸¦P–©@Ã“¾;è%u-‹ñ{Ž$)UÓyŠœc3ˆžƒW¡:x•EÇšI'– uŒ`9x0/e¼Z¯o¿„Ê<­V«ð~™EÍáƒØàe9§­ü¦»òDZú÷=–7mÒÇ*‡¾i/$j—*»!kÖr1~êi¡F×ª[Jv˜Ô™TF—E00»PHÌöRŒùÁ¢8è ÃB°?("ž
©òlQˆ>Ci£]ü¥fØl™»KW¦ [íbßªÚV¥;èx»ö·É™Páª7¨süßÊÚòí%ÃÚð/—'–ëê<˜”‘Žn(rAl[ÔUÑ¨<"t}ÆÁ¢P©ÓÁÖ]1ÑÆuÜ®›ÓLšdµÆ/ÚøM·pmJvóv §'¥áˆ>èE?F”à=ÂÙÉÙ×M--} ‘Ê/¢ £§&E1ŠqJˆÖÍ:Ž>NHÿãý‡ûº>áý€\Ú'+qŒ—YÛ5³®¨ƒ®	e ü_øç ¬`šBÒ“EïÇ[mBþ“²†}I(ÚšJ7¥©R`¥2V@åyœðnd`häíQú3 ‡ãø††•ú2¡‰¾í¹í—ö§ñºV‘eyÉ[‘Ýsˆw%ûeQŒžØ²‘ó'v‡ÚÊg¾ð%L™nëòü0.ŒîI„¡€ïü:M…ï3Ïî{òö»Æ°Èk!y¬§`^CŸÌÿûÍëßÊ'B\	›fl^¬²)ƒ½Á—€‡´D:m¯õ·?Z¤ñŸzÒ¾ ÐéëÀ-][n‰ë”•c*W­M5ö~h²$cŽÓu®K2YÜ´ÛNÏs¼‚Ê^iö³}Çëµ­áØRuÀ‚4¦¿±¨óÅ!&ep/b²„A&)ìv™¦2¦ï“2;Í…ÝÓûÊ¶_< ØÈpÆ]¥MÍ}…I«SÅÕ,¢I;Œ³ÐïUõÝGnÃjÛRÃÛ×S¯±¸È©rãñÑLTWÄ¶Ï©/8i}?‚ÄÜÊúÒè¥W4ÐWqM³w¡‰=µTS¬mèYÇöG+¢^ŽÔT3°¤¬L}¿ zÓÇ[(’‡ž†ë.Í_|¦ü‹/žþïPK¹¨•ÜZ¹E­Ò[É#
@˜¢¦`›òiËÊîfª
[ùÂöhûòüŸ©ýé]žGü–5dè†¿š”é4©(•°ô,4‚ø:«D¼0g.³á.áØÕ„J˜‹õX‚]X´…;½6¹N¾2EûÃ¦ãó­A¥n$¹‘ì¾ýÊa(œºqú§®YoRGé¥Ãõ®•!½Eä× £æ¢Žué"‰z òR‚¨ïÛm;Nf'`)—CÑgÄ1ÿÃÅý¨oy­Ù—÷Éí=°ÁðÒÃqiÄãR’Q"Š1’þ_kÙvtÛ‡t¯ºs¶^É³h£&‡1É¶tÃéø¢7i">@~b£Vò”[[¯uñÀŒDÜ˜ãG\KÝˆŒÉôÝ`ÈM¶}—CÀÐ Ü%ŸNßv¥b5Ë¢Ž=ž~"?"øÆ†@\ÉÒ2ý§n±è :¥Pábh«HÝbZ‹'<ÊEìŒ ÐE®äªx‰AÐ:ä…Ï¯\×Ï—\bY-åÅÁá0eL™@ïÅOb³f¬ýh¨SnŽÔ{ÓØ;“ »âG2'zËyDw1T£489u%o’‰8à³áÀÊöZœ}ÆR­òÍPC…³¦1ZÌçokŠð±PcŸ$i“oa8‹k#Sm`bC×re©]€óUôh)Ÿª$(K‹p˜õ3ðà}ÊÃ;!"ø¾~Ç>	ŠUdxÑ“3¿Ãe!ËØóW6«~“ÏÖ‡f[Zo¾Ñý r,9ÚöˆT>áéæÔŠ;ÿg8Ð|íÐ½ŠEjk¤yñ¿ÙáfdËåiÛ)á¢ãeSg1šë#øQ¹"S¶ä°ïêž³îÄƒÁvëdûTéýè	œ‡åÀò[ÕŽuZY_&=²BÖu@±Úì½–ý²ïvÙÇ	Ê
NdQVpùòûpfü¯y$Øíå»7Üy›‡»!|%“†Ò98¾0ô–ñxãÏ‡Õ³‘$<ak¥JÚ\Æ{šmÖZfÖ•Uù#¬ŸuùPØMr¯Ñ°{¾ÕmØÊ#Œ¬4k½È¢2Ù›Þ&ˆ¤›½)éÕW6(YB—üX…’4zÄ†šZêê°µHDðž»“Í›­‡ô½×¶û€0N…Z.ôãëÞJÒo‰y8šgïí*p'þÚŸÇ7>Õ5ÝÙk±ß‘ƒ‡G¤ÛúÛét
\(‹?'ÈbC?¡f
¡HdqÑ	‘@Fádüãí$÷ØÆZŠ‘š#`Ç¤BA10Ît¦š0žnñl‹÷{pÆõkg5ä®Ñ)]„ÞVIpæfa¼[n±¬?Mc÷cú«ˆœ—SòQdaë˜HÂÓ…§K7¼—ç¿€»$
y	Øµ|"WƒÅBM÷§awuÉmºjn?•Æ¬?Œ0"ÙCáÅ«	öÖ!M9âž Ú<£øœ@yŸzy€’X)ñÙët®¸æ‡ ÌN«&Õ[š%˜ÏÛ¯æŒvþ>m
±L¬úhÑ•-·þ4?’d²¸õ±xma€ëSxòQK‹BÚßÁ!ÚGëï8¸õ›[ròh˜}wxtTJvjÓ½Ä•.#õu}3Ê}]`ˆ»d5XóËyþáñ1&i)5_€5–òÜµ5õ€*p·J)oC•}¼°»÷)µ¥ÄEòa9ò$vœT d¹AN{)…Õ2zsÜÞ-R,UrTâ™›‘Ôjµ­¹Õ0ç—‰Ó<5¢ˆ¢_ûAó”ìÊ z6ÛCƒóƒm¤é.˜>öÂ“LŽ†ê'ò£á,g=;Ç9Vû7´¾*]N@¡x¬NFŠ;­	Þ½týôÃ$'˜3Z›zÎè}Î(-)7Ô –#}7¾1†ÑðRQšÆQKMK5Š¦a9¬rk’i¬Fá4fý8Á4z­’›«LæÛÌHŽeý§ÂbÕ|Û´;¯´!'ûöV"û6#õV™ö§ÛijÍ»þŸLÐÝ2Ë·‰{<Ì©RO‚¯*Ò˜…Ñ›Í’)Iód’tÇè¥ÒÛmŠ}‚ð(&·’	ñLœ\xËÃÕÞ,!äTdýÌ2Àð"hG5™ÄœÌ(úUðfá%ó¤î1ŠÓÆ¡Ùà{®çO='2·ÝŠœÃ"Akdê1%cM­¼4Ì„OF˜Br 	£¢#‡>ûg‡óÏµ8[ç“_<áVp+?>œ96í`Ì	ÆTcï$¶ŸµÍô0Ò·°í,+Î-øIMô›:Ã€°ÎÅ×¡Yy$œh0¯}Ð0ïˆ"êˆFIIáàáø© ÃÉÉ/./ —Kk&·ŒèÚØ²™a‹÷uÇ%Îb„íVF„màŠÙBEØòV0ÛÒ )QÀ­4Is²RìxvÚA¹&„¼î¥Oÿ`%-l:)¦Ý¬˜N‰èÀY5˜æa©ü•–*ÄñsÇ¼øTìòRÓÚ æ‘®=PÌoHn0k¼ÿ3±>‚pVÙç?"«äŒ…@6l§]AõÌ*ííR¯u³•…z4{Ä>"B¥p6~¬ž:¾HžkKÃ$ç8¨ÈXU8ägÒs
ÆÇbò0'#‹’‹ˆj¦ßÝ!	ÑÂ„Ùb%l‹¦²nÑáÖÚÀ¸ü2›n‘‹.”-¼^ôÌÔï°°X]c0Ï<XG•«è]á9t†´ Õw(5uV¬ìÍ½žT qì/ú¸1#8šQÉ¸ 8ñÄ$\X~¥Ÿä±©?`©zmº›ƒ`‘¡«ÉÌ]–Fßr/ßüWƒœÚÒLTFIaÜc£å”Á¨ZÜõë9
…Á(ôü˜þ¸¤žôéPslW.*ü‹šôÈ¿Òa+(ãÙœËS…U$	m7Ã‰¢ÅTŒ[ÌU[zíW
tÃpÀÑC®tÑ7jŽ‹”^x:Ñðï;VÛ= ™Šßèà3´k„¹ªi;"xÜº|ó]À•š•N/¹Õý~ˆ5§DY’ ÀRÂõÃýAûGZÑêxÅ^HW ·Yè\S´”È)	]Ãa\.¾eF¿ì’JF…Fù°ë)zMÛ£S¸á;/§"~†"ÅÅé^»m(QÌÌ+SŽrr‹Tâä³å«A-—IŠ"Ynz±ú±Ê`aÁ„Ú$ðOÜ0
Pr\KlÎB
µqzÚÊ:¡óF`†èÛô ÓkäÐ¶ú`hÆ£{·= w›îø¼Éí­¬¯ÖÈ
‹õdÕ²/Âš|­O’Ü·ë´Gvó†k¦×¦CÑrÛ´“vŽ8.íFIEË,ßh9Âs&¾@3^­VM¦j¯Í;ŽÄ~Xt“˜ïµxJ,L\ÞÉˆœ×€j†š÷LîÍíñ)%°ƒ(Á¢¡W¼rß0dcž7L> ª¯«^¯íø•Å•Å¥§kÏÈ6°èJq»ŸC9w-Õ(òºÁÎC"Ø¢dEé²ÄÏM*]ûÙ§¢_YZ&‹€°ºrp°ˆ ºáÅ<]&g´ 8¡¥ú'ˆB"Ô­òüÆmíhåÆYgô\0æºÀ.''òÆ=Ê÷@Ì'u˜&‡ÏÆZÖß~ÙA¹¤ ››ëï_gT×6—	ý»ÅþÞdo±¿·Ÿ±Ü€!È%*&Ÿþ€ÎL•?…³iXõÝgf—þ¶.F„‹h]{áóP-/Ö.=“×ëï˜¾N@[AW€Ê¸Zm¤"]ºàa•3 0îõûÖ°zÜw;•3Âí÷m²^#£eRùÇeâ0©¬8Ì/LújÏjúVß¯Ô¨\­-.-1ÝÒ)¬[:‘néŒvÃ ÓÎìë¼Ú¨ÏLÀíõŒ¤ÛØVÐD“n"IDÎmÑÌÚuõŽ*µ6ŽÙP;ñqO™i…aÒ­9å¥	Ýe!ªËÒi.S—
Ÿ‘´ùÿ}ùó®Î¾
3_ŽËz)pL«ð€Fk@MF|’ÆD—Š
<ÅskâzE[‰À5.7­\Ás<‰<ó(éx]E¬<¬pU9Uƒ	,†(§*¹ãQqÉYöücºè½RKÅ7ù¥ü –—È~[¹(‡=âi/µ\]xËr‰ýÃ÷dMlöÏíÊFÍv¸”E\Í™ Ù.•bÛŒ`» ½véVGŽÝ!6mZíñIµë{šP»aH¨]€N;§™TÚf¦žHI£bZ0€.ašôÙ“&Ïn$±ÙäÙù—ÒQOž:»Qu6 ,Q,Lš½žÀˆÉ°"q£0öxÄÄ[9éß°VËt¤%Ö­´™]&]èu%ÕP…6©BµÆ•Ñ„6
Ó„^•þ0Í‚W‘W6ª¥ñƒ–jÙÒŠu^øOl’3 !{vn‘²ƒ‚qÀŒ8‘,jðlU ’ŽRÁ?€&ùp&áÅëÈœÏðõˆÚÛR—Wn—*jKÂo£ª­JW°Ü>áW|_™b%¥ëåÑÚû¥ÝØQ:°A{34ó­êVBŸ¤È-„üÁÔ¦Ü „üˆ'_±q¬Tò[¸
ä=ðZZ`sƒ–N
O	âëÄZ{p\G‘Üþˆ°»MøÚœ˜1F‰õ“›‰U3Ú£¯Ç_šJŸ­ê¡áüüèòüß!Ïþë!¹q¦nâDù½p„Z¥;.:ˆve©úß]§[Y\]\
ÎŽß¾¾|ó×®²„ ¯Ï¾E=çƒ±„zm§aS«»–në
·}ÙŸ…Y`€*µF¯bJÙWí—Ä•]Z¹VLÚŒjïD¬§õÅö° :ÈaÝ8¬²W—ç…0f®.·Ú˜ó´0ßi!®S#žSÑ\Šœ²±Ñ„gÍ$õ=OÓ¨4ÖÈ`M‘mÙ…ÃËóï,rðið'y†Á\ÒG­‹ßwò.ÂÖÂÀˆ=bnÐñ‰QMIQß%,‰@]KŸÞ`ôé4}ºàü1¡OXxGœn l¥‘¦›J[é,Ò8¤Ç`.Èm$Ä¥°GçpGÃ;âY–]Ìòjbç–Èøl*lh¸›I¸¼Iœ÷RAWÛvµÎ1éÌ»Mß¼—ˆùÂö4	‚Š•1¸’B 7G5õoà‚MpÿJ¤¾¥l4²¯XàÃ-´P%æ,Ûiç2Î‹UÂðl»âgšzÖU cq0w‚®•¿÷¬®n÷ ]A|'’¶5TàsÎÖ	x†ãP”±u/¸Î×:óCm-ÜåäcpµÊb0gjU^4\(î²òÈûä^×j}§aÕç÷K‡÷ù@P8¨<)DŠ~ŠFU»ò™&î*ÿ»tÑÞkY}#“g•Ùm!aì|Ÿ|ÚDhÿâ;È»o†¿|èŒ#i¹¨S)Ä©#–AñŸ§Ð}”Ì…D7K¿•ÙÑi•%WæÀÔmº€R Rù—oþŠD¤Ò£2è0²ðÈøøo´ìU«MÂu›G>î;Mf_Ý·}ÜÏÏ©;mÇ÷˜úVŽÑ••xüàî|:ÍíøãiŸ7Éi[øx‹‰Õñ:Û!6Dm_ãàbæc:*&Î‚ìÔsº!“ôŽNHDÞ^âî#«n§·&©/}ì•<?ƒÎ˜U¦­#b¾?pÚ3©°·ðÙ×1éÞ]eíËi?\€UòSîæÒç)™’\ywå¦'Òé’ù}oà|ó¢ˆQsùÕCLsnÉ\9ós'>Z´kv<i-y¥µùÌ“%­½A¿×Ž`RBBí
¤<åïg4B+‰-<“[/I-Ü¤É’ÏZÄ­p¾A–ý§¹tÐu¾°6x€–}È½-ÇÚË]<©Uúî+Q:Ý4d®oI(Ã³×P*èbÿó.Y%Ÿ_ü¥{RŠ&}bŸP‹€%Vò{ò¶Y©¿³Ï®ˆŒß¯UP'¾CBôÈæ)6lJÐ#÷òÍ7Ô¸¼øn«ù9öl3é;ŠÈŽî>ÈÈŠ|˜¦Ô\iQŸÇâÂöF¡´ TÏXRÂ–:iôÿJÎ(sŒÙ¯šÅ4§$à&mtÙûˆrüÔC£“d#“ìqLÆ®ÏÈ šÄ–¤4#4~11Êw,¢AFt #ïü¼Ý³Úv·iõ3'.*'nÃçË;I9>¯ÜPý<Zzž‡ê¨›òû}·G§[÷ÀîrÛ#^˜žÍgn¥ÎÜ€ŸsÇ­W9}¸Û$Nd--“É¢@pT+€äAL" ôÔ[XÒþ¦CJÃŒAmê¶j@ø‘ÿ$T(!âÑ¶6$%ëiëôiÏGùéÚ3„kôœlëŠyþö«‚V-59BÃz@{÷Óö@iÆÐÉQ#.²Ž?„°®UˆZÞ­W+[7cè
$«–ôö³C<¨s˜R6ä8DÖZyº±†H"“jõ1äÉkeP……Më µ½Ì
6¤;}bl€/"F\«žØþGtÃ/±@ìóY_£w –Ê€±p¼=ž²Õ3ñ(>.Q/4=]RHXZ÷’um„58Ä.°¢ô~ ý	úír¼ë*´/öå²0PÏ Š?yƒÔñA–=K»Érì…@ƒ©ÃŽÝÆÀÛŽ±+‚/¤Ó€EcÐ÷ÜþJÏuØêÝr*TC	µÅ³e“)>	9®„TtU®Al	‰ôwš”Xaˆ'•xž5ÝôwÍÞ*®Õë‰ºê­dŒýõÎÛÊt!t_}Ö:ìéÄáå›?ôÈéå›¿fÇÛðÒ÷‡©-oåå6YätN‹ägdÑjø«ÍÞöyªâbxfÿDxNåe¾q:Kûc¡O2ø¤6É¹¨R#OµÀÂF88wçcÄÐ©ÂcWüîWñ<>Ð"È×DeawŸúz—ç¯±Ï+{ëó“ò78fçôä>¢í°G½z
 ?á3‰À‡hÕUÎ§{ÉK$­¡üÌO“ï4·#,ú>7$>wê†,‘†Ö	·ZG‹s=8˜©ŸvïC4à€¥´üñ\˜TC©&/="Ê¤þ”¬œÀÀüž$ã‘ãùJÕÈ7nëLjðe1±Ô¬°P3ÚÒëd„Ñ‘R·¢ÂÛ'¤iùÖÊSÏ§…îpQ~¶íFU?Æ±ª_å oá:zXìdEÃ‚ìYk[v0vûøÁÔ¬5ïak@^B¤ÏØí³†LÓ3ÔF1ºiì6ÜNÏê;ÞŒ¢Ø˜LÛH¤1ø‘ÃP½úlÓfÐüRPxãÇSfÿ®d³Tv6 D}¼lBãGÞ"mŸnÔ6}x<iÔ9MñDã®E$h%ÐZyºÉáíðP:bB†û(»ôWtÍ¢²][Kõ˜D”½|Ìèhlú½òøq}M ˆr(‘©„ø}A³)º¿µ‘v©$7µwÔF“ íû·?Z¡+ÏæÈxº»ÚÚ@V¥§²âr’>BpÅÛÜóüùÀ!í gƒÕäâ;Ÿt[Œ¬syþk?¬ÚåùoH~AÚô²³ì,Ú*ˆ‹ÃïK`@ýƒÏ`X~7ˆ­@)võ„~øƒÅ	Sùc«wWµÞlÖLÜÐ¢.ÃA†Ü-"Hcü˜”¼±D7Ë7#"&–áœÑÓÌõùØñìþ‰’¬N\·ÂmåVC#d(ùÒnK¢KÓ3N$­TÎ:aÝÖ9dc{`aWò±Õ&ò}@7Ä"éôµ¡#‰^nÆàÂÅx7¶úU!Kòw–r•…@`ŸDÍZìœÅEúKkwÿIqÙã,F™ôÊë—ím—û‚.*eâ4O—°/bBŽmç@gÀáì:F¯.™E†Hk
›‚eþ×„ò™»„xþÐZÎÉÉ	ûmQ¶	•dæ÷a+¬›F#Ø V‘œSµF»)j4áø#qn
oe[…0y&ê2ñ\¥0U·˜~CÞ°G<±½žÛõè.ö–ÓœU§é·v¨Ìý`´l0ƒ‚O¸•‹>„;	a+Yá®‚}»O¿Qã¦âtAÖ|··MÖ×–	K×Þ&ô-pen“}Ww}ßíl“›kTàKÕ-Åö«ËrU<¿ï¾°÷-:}à¬}gaƒl,ÀvtV{çìØj{ö(¸lgáïŽ×·Žï 11îþäÞ©ãaH GRe±Ð¥#††/±h	Ð«Qe‘÷3QÑû`hŽv›®BwsóÖæíúâ2›¥‡ÎOm>`ðéÇ65À†¡`G±/¡÷Ñ°™Œ)wçles{è‘{ÝFËíï,ØÝ&¹%ø³›Èªaåä˜œ¤†25FÉÎ¿³imÔoçvþMÞùp'‡|£½KŸÇÞ²bÑªú.›¢G®Ûö]§ÁÝ;g•3Â]&Ë¤gÛ®Õ¤s™²#CZNLÀ‘oÁã„·ÑcÆU`â!¾rü›ùñEòBNM¢Y˜ÁRS¹v:ðƒÓ%ÇV“ýÿS×íÀÿÍAŸA 1@tUÎ2×:u°Gê1ðH½¨§ ¿|Ú)`uH6ÁÁ°ÞƒTA™v¾ŽDmSLIÎ˜ÄŽûÝDULá¶Œ½"vw&¿ÎÂÂÌZººZÝ!µm·I—a{›Z¸©Š2k×ÑX»E·Í¹%cìë1ÊPóŠ™é-ÉX×Ë½*=*`!'+£5˜óŽÿb{¹Wsc\£9Y¹b¢žß¶è\Sá££3“/i{Œ°µ1¬ôª/ÍcŽÊk6œmìÂ
ÜdÀiƒgµW°~vé@Q&Ni[w¶O14‰Ùä/Î7ØS¾«‡/_á>Á¬¼.Ã7º%Øöœ¥7øæOù1Û7žm˜ÜÙt}Ð¡Tkn.&oº*Ëbt_~óøøøx+`üÅÊý¨à›‰Ç¯>ŽpÔLÛÌµ³uª‡=â¾Í6Å´Í*ÿäÔÁi¬»«ÑãÏP¸&ãßHÀE¬'á" áRum¡Ùd±I_$½‹âò
®)l×Âñ—Ô’__Ø=¸<ÿmƒn/~?Ž©Æl¦ƒÕÀ6ßîÙt§Ù´úCægÈ±z.zñ!D™Ü”d’‚;Ã
)L!kêy+D¢Í#~–%¹YðßÈï·x“‘áðÍk ùÖÚëZYâu™BÂËÄJŽEÐ¢eˆ>[²,
ç4³)‹AgM…~›QYÝ®‰ †áæ³+‰Q@üŒ‰¢Øs3*‹ñ©ïd¤»D_wÍ¦½Ë7¿í±H…__?ƒ)e‰I€¡Á‚–gJ?|˜®i…×òju„¾ÃœÃ,-bJOQGD1à3¹`evip>ûrVtFESìÇY•N-x`â5ÊSf_@ƒzÎ |þ   ÿÿì}moÇµæ_©KøšÃ˜rø"QZŠZŠ”-A/VDÊq`vs¦9ÓÐL÷x¦G$/C`ìÁZÈöÁîÚñ^'1œÄ¹¸ˆ#Fðÿà?Ù:UÕÝUÝÕU§{†eMÉ™~©®:uêœSÏyNª¥rTy*˜<o!s1^^SËÿÁ°Ê %—SeQWD¼GuÙ{nÛ9pm™¨Òñ#Ðqe‘çOmüs`ÃeÅ!XYøã2™îlRD"Ï%O†Ÿ’Ý˜#XbØåàI	q*c%«È!ÅX†E`^æSŒß›¦¿…çØÌ~Ÿ§IÉ¤ÃA‚H¡ìÇ4RHpŠK´(9f€ÛÚfÐé}Æ©‘ Üram‹:XÛ²k[ÅÁÚÎÒ†‡³‡²•±•°¡àkH´ZA¤Z„R»Œ:»B-B§­â "Â*ôE
à°8ÅN=h ?m*µ;í&ý„Ý
·,vŒÙ}~ö3P"LÏ¼·ð>æ.¨¹Æíy<3~Š‡pâíÆµ)˜Ü˜|Q³ ¶°{eµ¦Î‚Eä,0 _Poóú±ˆ+‚µOC¾1‹¿êEÒêîJ}ïÒÅ$C>×6©±t¢Ïç×ã’üZ{«{Î^}‰ˆZ»ë6¡¬/â£5o£í5éøÒE·ñÓ¹8 –ú¾;ÍQ÷zõ6n½Ûï9àJmG@±®Ó Ëø†Xû§—¨¤õtm1þ$Âö® Õ¨~E"^T†’=éRÈ~d-˜kÀeJÚ7D]ÛA®³â^)p@´,¢æ_Æ*[!+¸žˆ¡(K³ñ”ámFÎýŒÈç½à;Cbc’ KPÚp	 ³á'CÎ…Í¾’|1¦µ#ìPîLd=\Á
„Üh“u	•Y¾l£®èQÇ{Ð¿vôÞ¥Y 5Q7cá}”ôì:=P@×Ž–°’>‘6õ(®ZñkÏ(º5âšÂËh²ùXL·rË¥¸n]BIœ&(K*:©230À‰ªÕVá_›Wb"¶pVA´ •å¤|KG~T&’µ²ðƒ‰d‰.ÉÏÓ´´j“ˆ–ùxÑ­Æáµ£ÚBáàª;’MÔ[¥Â_˜k¢øWÍ^HóUô\äÂ$ÐEDV®¸»s&žI 'ï˜z&î}xÉ÷•6+Ñ7“8OÑ8Oÿyô8ÏâòDØ2Ç$Ì“$Ž³[Î5Ì›J¯h˜çBÈþKåÑP@¿âp%Þ##Äx'!óqV!¬Îc!ž	FºFîY·¾¼zåÊÅt½'ñ1HK»«‹5ˆ5‰Lâ#yÇ$>2‰hwg2«k…!DÂî	†YÞ^ù(	·^Î5JL¯h”ä¢ˆÿ…
”•äT“RÊÿ¬cP0ÉV%pÿ^ÐîçV	ms1>ø'sN¬.Xc4‹ó—â0çûÖ´Ié’=D£çø,_ç£Ûê‰-0ýÖðÛÎU;¦ö…ºsÕ•¤3¡›V¤B[Šy|–öyZÊÉ;‰…>[ªcum§!—²vÚh¢
—LJh©å±cÖØtžõ
2Ï“Í‹ç¦À'SUŠÆÂBq‚Tˆuâld)Å,qQÄ	M&ñ‚Dj´g!QEh"ÎF T*ˆ‹"OxÞ¬@¡’ùí§ Iû»=ÁÔÚm/HUìbtæðÒõHê}£©b(dÇI"RÕ‡_‡2tŸC%½Ógß‘°å²/~ã±²ãŒ¢¡‚ÈŠ!þðÓCŒ%c/Jl%Ÿ3v{ÐéÐ9Lî<¸M6^£¨›!«íw$²ÚEÒnJ.ãê gÈ?’ÍÇ¥B¤4…5	v°r@Ë²×¦'¶¼F¬jTe­të¨´´5a@­H¾£8Á–H@	/<„ò‘ìÞsœ	¦_wÚ´¡µY»°_!„15wz®‘åG]UèkPy‚þ§VªÅ8sBÄ)¹;Qù‰ÎwRþ±ÏÉIvY%d+éˆAsìÒµ!&ƒå¥Ó¼xNùå3#Ò‚2%,­ñNtµç6u·RqêõYˆ(ðRô/ò©ÀßÕ>•>°,ÌÌÒöWÿÎ\‹ Uda¸
ax~J†RƒG}îEb¥H¥Z_íGDÈ±H›qêp¥û¹OÕëé³¯:	ÕÐà<©Hô”Ç§'ßŽmÉ›èµ‘ôÚO¨å†&1l]Pµ&WdL ’Å¦)œ›ÕE2ÇX¢z‡ÊOÏuƒ™Šèêt‰‘rjJDšEeÕT%¼^GÈý¨¯œj9£¬©¬ô++õšDÉ®fËcõ‰¿¶9m5rQÔÈËaIüo„“oíx7ñ8÷]÷1ó7a	c~©|ÿÍéÉï¨`¿ö[3Ì»œÆTøÂéžØ}áŠ‡C^„Þ‰ÉDé ^Z(uÄŸúQAòðû?“D{{T‹Lt‡¦u/BwÜpzL—êÃòrXlýp~›ö©ìÜ˜Ûô_{¤ù_© ·?91[P'`›9D×ÈXÜ)Ì©ôlèÎÒ®ÃÅ…ž,xä¤×^'TÍ§ç='lUÙÜ­$­œ—.›™õ¿@õÍ´ý±Ç3•óÓ¡\Š*ÑÍ˜µ7 Êtwø'jÍ“!œCÐ2Ò¯–€Ž>aXðb¡´hï¹f]Àc¶¼~Øóv áÈÏåÏµ<1ûL	á¿¯ï--ÂX]äìŒnÞP×5Ý«ïÈcŠj®ÝeExÇ·Ëm0ïÒ\¦àuÒÊsôXJÅž¢}‚¤(¼^.C8¬„¢Áiù˜·Û‡¶þlïø£C×húÅ7Ž°:%#¥ÞâajŸÖ‘ôîXTh7©¹Ç
aÔ‡ß’ÇÔø	y/Š8c56=‹*]Uyhžçðg´¾ÿ30!ëžd'BÆ…ÕÌ!ñÅ¤`®V†3¤›­3¬úcc–xj?æÕ°íJìæ©²%#Ö,Ñ2Øª%SëG†a*R’Xó@ˆ©®ÚHª«ŽòXC¹ÚÔk"ŸÁV<*³°™D#ézWÉJGl…Ìîrûã]~:˜`|Ô¨-ð#à¬™©†Á›Õ•ÚÌñ?c_]#[¿SŸq\ÌâÚ4·Åe9Í.\ûÑg˜Uf¼Ékì–t(‘…(£Ó‘ƒÇsá22ƒ­4À bÊøºPg@½¶ø2‡3"abƒóë¬b/‹‘¯Lèqõg±³0OSË¦ÕÆ©-X—¬mºTè˜fþ°N{íˆÝæøÃc?b7çÕµÔÖÆÖi^›§o‚4%ÙŽ8U¨r$ ·³D”j§~û
à_ù= Ý%ùµÚvýfØš)pKÅ·Süº¬>%B¡RwNR©EjNógîê5R©ˆ–¿·ð~¢Óy[ò4u‘ç	ï±XÝ{ƒW –8¦¼”ZÏŸeÊÉâxÅ_wÎóÉžÓ`?ÿ%:ð³!ÊØ²p-{,|¤&aW²wËÛ6ùO§BZþ=‹ÊT‚ß¥VH“}ÇJ=_%’DbÌæ:2].ÓœÜè‘>\¤&çHj^Qs,nR©òïyþp™!ÊöI»‰ÞØO›ˆé)[ÈV46J¨Øl”ª5&Åéäò|€7Ð7èt©w\]!ÝC†]N0kSë±Ý(ÔÎñ?GÕe˜x>ãYø’j_J¨CŸÎHìí‘UÑQ•-µçPaqŠ5¢Äco¹ô©T1Sa¹é‡^èÑÏ^|h	´ù¥R$}Å(‘H1öGRJgB	'C¿	!@¯CLë³ô“êQÇb{‡ìœ’œsf¶ ƒbÖ­}œ)‚	í]ªzþô{Úà'§'¿L‡~ä*Y!ƒÁÞý!.ÒƒÓiù‰>!Î„ù@`!‘1!œÁC×l4„	£äÃ JØ‹¢gÙJá)Û‡<cOÅ®6gß‘ ÙD‘´"Çü†£öß–‹~	»O/‡Ï]>Ï^Œv›ÆÞ‡g×Z–9º_P(KÇÅÄ6`ÓBËÇTKø˜j1SMâcÂÑ1ñ6œ%{š–	ŽâÔLp”á§£GMtLèreÙYÚ]M1q«Ä%—‘Ä%üôÜã3µIÄ*”éªL”x¹Küå”;èVª´:&êœ„s'ÉyÚré,m»™gŒÜeHZ"ÚŠEwuo¡mÅò,äö—aöÄ1µ_œ¼}`7ÄÆ(ábkââˆd‰p¸t6èêj oéÂóåv‰åp7E¤woõrírÁúCéÍ»x"½ÊfŠy9h_
ÔêíK\Õó¥}™LÀü‰-ÀWÃ/x±áØû?7	ÉbîùÉrÔ60k:û|Ã³"L£	Ín±±\–úé³/}Ò~Jú4¹}úì3¶0"¼QØà¢O·ïÌ#³™ðj:	ÉZŸ:‰)þ bŠK+/>¦eåˆp¢°•qFœ„_Ù0â$‚8bæe¬4qõÇ«AœHï+%½`¾EFÐ]XO0œÁfÝ¶’g¢es$I'„ÿ»»¸|Iö4R»š…¹Yƒ(@‹¦DQxˆ ¢Rt$òÅZ€HÀ^Ðö€ž½:’xæ-×ˆŒœºµË)\É|œ´•@›•»1¸ÄÅ#4âv¼ö¹‡›‡ÜVÐ^WÐ0í\`\)C"ÄœÄR@C¡É$ˆ™6ò‚‹IF½„ô‚¨E•ŠçÉ€8öv2—Q}^Ñ„4†Cd_KÔdôEÆæÖ&s5­"6p%%²ÌL‰güÁœ3´„2M”Õ'}·ëÐ®ÇTDd_²[gÕFŠ$¼îÇ¡ Õø ÐÀ–mË>ìa°¯„}ãÜ ï­O½(šö‘¼\±l‡mx*NÓmÏ­rfý¹Ú%þ­ÐC¹Í&lŠñ•È Ò9µ¾½³ÃHéyK¾W«È¸:’ØûsqNØ‡$Éd'@¢Taé*ýB]TèåL¬¿¬¿¶©ÁVéöÜ',õî²é¨q±ê7¼5i;¯8¥J¿ä¶#ûžeÁÇñiüK§_gQxÚCudgc³êøQ0Gù,œÿòüº y½Ïi×6z½`ÿQw+Ø÷Õe‘±›)I'E°ªñ{Íõx9çÊJ´Æ²øâ¹LÁ øÁ¹L ³1M!qÆK5‰"jÌ•›PÒn2%ª“¹ôŠÎ%ˆ™fûþ›G	‡'ÐœÌ¥ÑæRäý]Žf“)ãtJ¢ˆù$43JE,.œËÄbŽ¨ifñ^Ê©5’Ù·Ô´ŒP5¯Êd'ÅoôÊÍ,Ä:õ²O, 5M­è”—rr•_·$êçÉÔuj1
ÝÔ¼êö¢8LÞäÄ»ˆ™ÅÎÌVâ>ç6§Ï8Ÿè×¯Ø\zøömÜ$*R³G}‹s™Aâ¢‡Á>:>;/h‹D‹oCìC´qzFYã8K¼ÆAA&NaD%•\c²À9m9)-»i\`>ù>á/Zä<´Zõ^ÿm:õop¦oõÉìw‰Àßµ3Rã.$œt±q€F1ñC®KÆH­º.!\²#óKˆ’bò‘ÒuE¸µà(»Ï†µÀþ}thöñËÝ
IýÂ‚:‰‰c~“7ž`û¡{8·l žGEz"fÓ4ål§7/¦ÖAþÈ¤v,”<y,-Æ1ñ¦n…+"K:m$FööÅ¯Â6«L‹ØÝ•è|ê©ì$×ØO!³’„(Àè‚|—eçâÇ‘¢`©RŒ3NzQ$¤Óø‰‡^Ù´wzt[Ü«ü=’öìPÓ²IÑg5	xuÃkGaoà"ñ¿¹Øh»TÏ@­Ì¦º•›©;sØšˆðvƒ_w[4©çÏ«o8ŽÎÒìŠˆ¼Y¢-£Jª+áì0hqÓñÛ¿
ÕB()j¶Ä,˜“Í‚B6r¦OæÕNA çG–è¸1£M¯RRŠÆ]X¨ EDpì¦H–T±ß_ãº³ÁPÐýÁIX}¨ÏÙ!MÏùš¬yg6¢´+9I© %z©‰`)jÅ2ü}cµd_?±wRDÙIEÕÀ¢º5ÆÊ¬÷Ñ\o[>Ô7–ãÕtÍK/éQušUjxª\WpŸÅø	«¨œÈÑkQ‰é©¸|ôT¢­­;r(V	y!ê°¯	ëVB‰ðùÎüçcLU‘Ì+bmêEç0Ïôõ‹L5áâ{®M¥c€cñ/Ôº¦ºy+c@×zw|0ÎZÞ‘«¹¥›”ŒÀ”yn4‡­Áü;P,ìüôvñhVÆÖc43ùxÂ]|©f!ªB~Ñ7ƒ Ì (¥pÊªN…€ÌVwvÊ!ˆÊ‚óCžxA{»ëP/hñX†¸”¦‰¦sH™.«Š ë
þëý·ÈæéÉ¿Ñ·nŸžü×GäÇNŸýžÜ¹}ÿÙz{ãþ­«gªñ.åDR4¦Å./:’Òv:y2•ù’êòJ„ç÷zš÷Q¼Î1½g÷j‰Mag“ÈÜ6—h*äHN™¨’	nYuŠ¥Aéµ+}›Zèw"|u»Iz0]ùÙÐa{{}—U	Òj5ë@±‹X½pÂëv—0GØ›ëÝ¯hYxY‰7Üâ&—èf0^ˆŸ¯4ò‚¹4YÅ“Qš©©Ê2‚$èýX&«°ÓÎ\	[mô9«Ë	JuV´_Ì¹Dˆn–»>® Zª-eŽ£Ñ4)³LJÅ8®“‘Å‚Ì“Ñ–r-¿Jä=Áãƒ‘rÃ•£Î#=[Ó× Æˆ„sB!qj6´¹j»èš¬Œ‘/®áF1ö2”½/î<Ö<0TÄ–ŸŠààâ©Z‹WÉý@ä¾„É¢¼\¢.Q4.’hœ$
oQ AÔ°w#åˆFôXòCü\¨i2z–¨egL¢-Ï$3t’:É}I3C…Fä…^\æ9æ…ŠrË…9IdÃ“¤ÐIR¨å²¹äIµáJ	1„£Ï®Ñ9¥LB³ÇÏ¿é‡¶i}YÎK”1Ïw½á|òÑÀñP™²9†Œ†I‚ÁH	ByN’ÇK˜\@ÎIvÁ$» Lû&Ù¥0É.˜d ï4É.Àf@õØ…iRO*>íK»0 þ
ˆ/ôÊü%E><Ö·cëËî¨Ÿ¨9—aÛƒ’pzXVÞ(Ö‘úœTjÍôó§§'¿õâ$¦ÐfË ªI}QÈVj8/Z»Êúº˜¹ÐËè±ÂË
V¸5·¸¬ì†¥t®€ÆHZ¹ îœ>û"„"QŸ“:”¹’6ÒAÀ~> ?†Ÿ—ÞNßô|$ä¬ï:!)ˆw7 ÝÌˆé¾X@¢>sÜw<Â}%pOW/»Ì}&%—ôAâ¾yëûo6Èƒ[ÃŸïíÛå±í˜¥zl×¡Iey9<{áWÊ¼ƒË^è…FÆ°ëD¬¦Š¬ô©÷+ºè#ðìe®xcB_1šÒ´‡É¸œd”HtèQCŸ@)oZón…ˆ&ë`>Õ¢nàVÈ¾DqhÙÝ‰³^¼J`?_ägé'²–÷-Ïâ'é¿*¤è¿Ì©v’ç<äë¶Ãih²àã¡!ü˜S'5ÊKÖžTC”£*ÏŸ>ÿØo’ÇÃï,•F‹¼-xºÆCr¦’¬>4œÜ‡ºKSTÅ™NRìäÕ¬…!'Îd³µL’±ggÚ£Ž÷TZŽßh»7`¯âM¯M;Êmðlß41^&dãÚ_ùùfÇO¼°µQNì	r?$ÿNÆ™EÛãnw{®Óè·\7Ôíñvzs5KøòÝónÔ©t2O }zò«ºaÆrAÈ¿çQÅëo4:žO~ö3âõïþËF½üJÈŒÍ¬^³¨»,ÂQHá@É$6¹Üÿ’XŠO©Œ+ØàY€ÄíþCjI=Wã–ç´ƒæÛ]×¯@ÈÜºj$ê‰;‰¼ó…¶¥#}7È¯±/J)-Eßû]*B Å Í¢Sý)õp¨@a•â´t,"¢ø@¬‡hî-Þð°ä|c²ÏÖðoÀì}zòuýOOþHîCŒ5oYm³“uÑçO´“‘2S{åèiÃµøAûñ–ÛvC¡ÁáH&IŸ^V#Õ»ÕßpXÍ­žÓo-šÄ‰¼;üÖáÊR<å“Jn“Žg^€€€[ßÔaçî<„¤àÀóAßh·ûžºäsÔM»’šÁã(ÞÈÃ»fÐO¹šÉ`Ç›¾J©öd³QLí>"Ê•oO[\9EÃØ8'NDÛŸ{o%ÑZš£HŠÂŒ%có–‘ã5ÏïBþ)<ìÒ[×[nýñnp€ªÏš• uÜ—PˆQöL«:Î™³´s¾Y·Íe~P¥BÕIÓ¥V˜[°r«[}dU¼¾t+5õ¶Ó/[I¿`÷v¡E»€¢ÂÖZåH¬‘òÞû¬°+zÚY,0<n[ms–‚]]Üî¿!¹“zT4ï™PÑìû1£¢­Ã2¶üÈ¸ù-Û\$= U¬)[/±ðxnÛí°!1É|ÚK+J÷› Xú_ž²“>‘¬3’¬×`ªúð²JÔV„Íøá	‘´w1äÉé€yl'qÆ…“¦2I>gšwFÂ¥•ë»&	L¤A›­áüÅQo»Mëñ"$ïéŒ×u´÷ÀNË	HH…K~´i`v>‘)L¸´¥£®Óô|'v>²û),i7I^2;Ì	l†¥þ€ß$c4¦ç×Ûª+*ÌÇ¢ŠcJª}´D§ÙUê}9¬1›<ç‰þÉ487NïS§¦¬ v;Å_±©ìN­UøÔ§é’9R›!?"‹äR"ådLÁ
ùå0»àøØD©èÄØâÆ…*@8[ÉÃ¨A‡o?Zƒß«V«ðû,‹7`C …#–V°5GB*^>¡ÿÿ]Ù‹Ap‘	d®"K¤À\³‹ˆ^CÈ ’$ðúï9Ý÷v«ðÛíÆû0qù÷y^ºaÅÄEû?qÇ}sá#ðWÄo#þ†kàƒéûóÓcz87}S7fÄ4¼8WøÕ0¸Ô¶»Â>heX›Fm†‚Ý7´ƒ¼v”¿MË›kÌèM£(¦1ûÊ#´¯‹‹Ó]ÈÞˆ×Nd_Tâ[Î)&ÀÌ‹è˜¼ì–º@ûbÐw{7;Ž×~ÁË~IcœÝDça•eN@ntFß»ôê´,¤=Òf‹
ú2eóó2Ù§ÿRÀIîx'„›Œ^y÷”ÇÍ·I=r³á	ç»²‹N°KïÚÔöéÉ×ŽTÃÙLhð$´mQí†Açgâö¾ã³¢/Ž"2j‚Ù¯³êj[TRØŽöÙ	JPq–’‚ÏôÃáŽÍ,#²Á®ÌÑ¹P:˜¿×¿¦¡ï´·Cgo®Ä«tñ½tœççv#ô‡äÖBÊo’pø'jæ¶NŸ}q…¤¾!mïôäÈfú;iž|ÞE÷;²[ó{•sd„"rŽyF	ÍDNQE»ÍYŽ´Ùl C¿B‡~9;ôRŽj<ZzRŒ¬SSÉAºz.2w1(½ŒÊK§öäÉœ)Í§Âò|„eKÇmaFWê-§îx7ÉZÝwÝÇM_¦£Y³sh½ >ŒSŸÎ³ç#îÄ‹Ú?|’•ë!ÄByÎRHÝ±³m”fd­<«¡4®ê©ÉÚu²Ýr¼>æ™Ód €|Û
øäð]ØÓ»á@@¼Gx†6vM.Á|aöxÍB»P¬ªÿAÝ¼|ÄbNU5mî)à±ßûŽß7ÌHjíRCè(‰ò“Ê-Žh †ÑÉ/?þ6˜ˆûKVwž´ÚÑY˜„_e©îÜpnŒ&6œ“g@¨’1d¸K:§‡m¨€Þ©™ætÞÞ6\]éÂG÷œ°Uí8•Ú,é²ƒ’0ÎÄÍ–û¤øwÝ½T2Ð2i„F€b.1a¶7J¦Ïe(s­ñµkDlØ8m¬»°ãVrxù¨õA<Ð9C3ÒmKŠmhË ½s¾0f“êòGS)¡©+@í?êS5sÏñi·Â.”ÑèyÃZ¨u°Ö¤ÇR¹mh‡B¸´¯¤uG)¤úBM¸r%yÙ§úº#IÒf/Ø/W$ÄL¹—”Yÿñ ênöð»×þ*ñ Šf°m¹ýzÏëÂ¢¼þ ‹ÍGƒÃÓ“ŸûäÉðSÒxTÌaSotAÊ>G¾Ç8©žÛf¬rdî’‰8hmÛuzõ–’Œ¶ÛÚƒÐ%mªU]tçjó‹„'›1esÈ>ˆæ^øÍÚ–Ëæ·mÜ]j»»­ MeãÚÔ=Ô~«V«ØDÚn
Q´æ®˜4$—ÿ#Þ'½'¶©©Ê{„¸$·OŒzÇV}d‘¶~†	)ö”5)%§nÈxã1*ÈHL14…±tw ÊÿZîj y%ªþJ—°;[3åîã+™©€ö¸4ÊÝ¬j|n6ÉN\tä´Û0×ú–WŽ0†ŠT]ØýcÛãÓ|‡rßím:}·2“@T*É¼×ž9ŸÒ{Arm¼Û>Âíl~3Cwì°®°k À.Dl¾ÉÄ*ƒÝwL¤(ÔŠGj×ªÔ`¥+ÀaÜ×œ$¥~úìë.g_è€'JÑó³d|QÖWlcï>þýÂÄQC¸-¯h¥«ö‚6ï\Öi$xà¿×Ç0-z7ißìQ·A{féCzóÊ€íœÑSféÒ®÷š¾Û|Ú}xô{ï£vÒcÌ{!âÕUÓk,/Äyµ¦ƒö¾ì½ñûiJc
½@AZWqÕmj'GV|Ðu{8àL­oÃ„9Q«àÜn/n<Î[v‚ÆÔ:]ÛÆÕÂØ÷™Z¿súìÔŠ¥+è˜nÞl4œ©õ·¶¶6Hå-oøY‡Ñ
>­Çé3c{Ð[GŸõür§Å¢Zêù‡ã{Þã{Ø­ôsb–Äq=´AŸÐNïôäspÁÆtkPgSë „Šß0º¢ÀŒ.yÑ+ Xp	¼8˜Ÿ¥Ö„Yv1¸Júü¥]XñƒxQ@‚( IýkÐi%2€c¼¨Ô¢qT+Û ¡jmš4Ég‰nÊ|š%{~4S4§3ý ùüqczEEÃ^ÐLšÅÐe¤ãÐ?çÞ[Z(DÈºÆiz°§Ç¸ñIÏõ!(pÁ•²¤-	áF
9$o ³*,…ÈößR¢9•£¬Us=Š¤Â™…šDyñyåÍ÷˜† ¿ß¹*Fm¹Ø¨I·-R'u)½•‰elýÈÞ–/+ó@D-ï(4kñƒ×Áa46Œ8îŽÎðSpèç…øÃOéYßÆAÄ·S.^1ýjŽkÛã•;§Ù%Z]Á+¸±½Êó§¬’C@T¿÷ÉîéÉoÈ÷PTÁŠBÄ¥^(¿÷˜©ë8²;ü,€‚ja¢ó‘¦BtyñYŸ^Cš=¯Aà?ôéúÁëmƒ>jEú(	4²*ÇeXî£üž×ÅDL´MgÁ“n*+N³×ËwCèÒÁJ‰dS£ðj»Y¦PP´/õ(•¦^ãÚÑ‡Ð›s¯ñ(ýÉ:¤`u.~Äyaº2Ž“uñ™aêQ:O,ÕJVÆ­Î =PÁ-/HQ´ä—|wŸÚôÖéä´2CÇu–&š<K ß/y««Ñ›GÓŠ×PÌw‘_Ö-SõŒ†¨×ç³¬JÝ½P9´è@$>%Ã€ìõAÿ*ôI”ýZ°Ø'%ê)	úÜVØi¿ôrçf&¦Ù àjí4y3ë‹WÙ„ƒ>ÑG{†Ê›˜9{ó/+\é¦X1Ó‚ˆÇ¢á¹ù">ºM8êNvKDè;©»1µ~~ûFtxIg{’0e9RÈ ýLÎ€œ“°Çb•Wé*›}7Ü`Ä˜t(+Ó,V<]@ÁÃåpÍö`—ß`ÐðÂ‚7¸4aµySlr³ð-xH­28zIŠÒ‚¨­ïÇ<·t¼NŸ}²˜ëoýæ˜s„4$¾€ÞØ§&÷…H'+5
Ï¶B“&‚Ï#c¡¹yd ‹±ÕÃe'(	l/ÚÆæŒv-ÏõŸjµ…ÕÿÜ„«õ ƒò‘#§Ë'+"*xAAÖgÀCÄ‘%*Ì–*±ÉRƒÂŠì1ØyU&ŒÅ#è¥>)Æ¼–A!êÑ‚L7¿:hÁ¬ÕÎ)©t ÷%Í~zòNZY˜5óóáó‰¥_´ZðNËHcøïÐQE…8Xà*l9‡laú§¤Ä±}zòË:«]óuj	3M1^QH…„IU+lÕ.j‘£ÆË¶ r´Ñ5ñhöó×ôç.ý“´!·E#úÖ?gƒÈdÃÁÊH_è’#µe“$U2êüË¼v“4\šÑÉÔ"¥â»†&i×ÒÍžKE~Â'Ì›­L?ÿ²>:ä±R<€þø’
íßüæ´QÉË!nðdÊGÝ’‰–
	ÕËÂ¹CgM@E6û>1E&+\XiJ2<‰\$Uð¢¦) RB’¸múõv›÷Èj6^.¡¢—ÀêÉ–<øcmRw·í×®=t÷zn¿µ¹Ÿ/gD®%b:{[qÇ*ßÆ‰Ç±¦ƒá§>ÿQ1	rñÆuðœañ…€ñ:h<#¸™%··fÉfÐnsÖOB^‹‘§ÿíÏ½·È9þåÙRÃM½UÒŽ\i³‡¢€êïb®1æû˜m:ŽIZ˜ÄŽÓ°–t@ÁˆÈ!Æ»€í\[†%*2‘=snÑØj6mP ±X§¨ƒ~µÛ`«ÅEzÓ	1XÌÖÑÀ÷>¸blø ð’¸i©]ló£"‰à­EØl›l~%²çì˜²¬CZ¸Q‚¥F“àZ=”•à»àFxÂv‡êlVx[t¹jEN^N4wþÉÃÛ;7Ù½©)ø:Ù”°î#ÝwëæÝ›pcÆA$ùn#Ýtû§Û;7ïM­ßR[ÜÇ6Æ–<¥¬„sùIicBÀ.çÀæ.q6Š(*²Dêê(tæ¨oI×é]§g˜!1c³6ûÔŒu+³„Îô»^Çg˜¾£Ù´]‚o '§M:Y»$N”‚ýÐé…Ìc]&Ý¹•xV/BæXT·7/…Lì9• E¤§Ý+6Ô5b%Bu:ßHcÐcœŒ–Ö"ªé‚b»ýVÏóÆ5çê£÷c«HÊ›ËgN¾fß,¡p$röÍ‡77vn2~vshß« £J¾º^eCÜ‡,ðŠ8åŽÙ›™R~ô`Kz1±ƒ®n±Óû¾-×?lÞº¹yçÁÛ·ïïDOp:»Tä¢Gð¿Ï˜V8ý~ðGœ™?èkÚƒ¾ê]­P¹cn¦×sGüº¾ÚÞh7OÆ4KQ8ž†°q÷.»¿¡hœôœâ¹}ïÁÛw>¸ñhë­›;ÛìQàë>êŽñZÕ‡ŠFzÎÖÍ›>{xs{çí‡|lrÂòø¬Ýö÷‚œ¯íÄ=ˆ*
öS4qRPÙñŠÙñü¹ýâº»p)ksd\ÿŒ¨•tÍÂÒAoAëËcØYú:fN'üo-N¸ažÎ.í$Ä:n­‰êR¥ñu(¹àÄm€?Fy¾fÕ©)È®Ë¸%AwoËÒ?‡ÿYàAÓ2Ÿ¡¼ ]¶/@p !8ÑôNkø‡éœžüÎC÷¾aõ™~wøëò7’ÆQö‡FmY´¼°Ö‘·‡ÿå>¹qzòoØ‘B,'Ó÷o>ûÓróÝÍ›wKßW/knÝþwhñ³ßß/}ëœUcúÎ­á¿Þ&¨c÷7¡Ÿ“ë0 ëîštj7»©ÙIïÄÛ©Ô'øuúG©Mé©Z4œT\[&Òd%fg¹Ò²Ã§ ã„Qÿèy¢dÄ³ÚÇXÐ•a>‡,œPp>›&ôÁð[g„;I3*;ÿ7Ÿo;œŽ^ŽWâ’-Ž©`{• VµDQÃ]†õçniî—
MÀÖã {!Ú€î˜ð1y¯ô^­–²+R';<ôE—àEkj%ù<?B‹"^”uQèu\ºüwº×«a°óø:é;{î›ŒU³¢œ"Î¨ÌÌÒùvëj§sµß'Æü½{ó‡ô˜†«éj“ƒT/´?!n’Š™D}=L3ý:¹žPÔA†­F¦ªœàÍ|Ã	<ãù¾kŠ)å5VXÝxæéVY>æÝ ¹ÖðHüvLøÜ¿&™Ç¸]”Üg,Í‚‰*ÔP®ˆ.éÎ©§ê2x!Õ'|ôæx,ú”~IðK|,m_Òì†_Ž¬E“Ëî¸³©pG:Ç—åHV§ÁÉ8Q¯+…|,Q`YuÐEÃmén÷ºàOK¸·‡ÚHÆl|òŽGyrzòsBóßâ¬'$nA«;ºwn9Á´×…ŒjÇðQTÛJŸÖ²‡s—TEÕ¤7¿:n²Ä$[­J0kÓ³wÅ:Ë²,›wEo)µÁÈdeaÄbž H™(ÁÒ+Ú1›‹Çì˜Ô‡õI¶ìÌI¹ù¶	]åšÚv¢
<h™Š“j‹éå;R¢K½†Óo¥³ÊU´aÁÚ"l>,Êfì¢tøSgQáCu³òmA©Ì@ª´@lëjJPÈØO¹…Ñ´µqáëÎR½–êÛTËÆA¸ºKûzÐ-€¡E­à¨1 çõm' mH‡ïï[A ‘øK[†$õÝÛ>—^2¢X†JóGRçõ·!zÿ¢?^Â¤1ß¶Z µkÿ¼½áhdŒ”ª?@ÚùR•E™”Œ²(¢+Íp5Í‡¥‚ÄSëwaì†ß]µMÊ’r×¦úh®áõë„ýæQ“´áÆay[òÜZÛ[¿A×@_úQ±_¶¨té˜?ûÓ#Ÿzä1 Æ?÷£•™xè‚{Ø·8i«ç=qéˆÓ‡X[qK§Ógß‘8"UFšÀj£ÿ3ä;ÿ8üþÏßFïpzòýhLè¥d EÚú¦,ÁÈ†ýx0ü^ëO~+!€†~LÛ óã	tOÓ£–#í©¿ÓÿZÚæ:|Î&$U´¼6?0$ÐØ sv– ´isÅ¶NÿÐ¯¿9h··ûÔãµ„rÃ¡&4{Ô·V+þ‘ê[™,5VMj‚˜i­¸/”»HDÎV¤kâJH2tc.äà‹®Ã(äÐ*×ëù'œ£/ÕjÕê–Xðsˆ´fLçÜpz›P/e)§. £~"ñÒ&/@Àd“vÛF0c}3a
;f±oõÜ½kGo½ýö[wo~°}ëæÍ=¼k–{ÎBqmêjúÍ®GÏm_›òƒ %FˆO½ì=·×£Îvfy>$ÌY3šÕO©ê«ÂÔ%4™ºìÒdÚ¦fòŠ ò°Øôå'³Ÿ’±{§'ÿG±š”Ì$£„8#«Ó"Õ(tŽf^¡Ó!WÁëW”½*æ—ñ¤Rƒ¢„h$C´²åºÔ¨;¾iò#²Œ©a6_%ß[±ø+z÷*Hðe”l»aH× ~N	½‹ÒIô´ÑAuW“?™õ0š»ƒŽ]§›Öbx
¦&œ†G_{.æzd¯tÄ>xÇô³ Ê‘ð”Ë}Û‰ó±P•…,FUÆÛX$2
ÍGµ¶Ùê5P Î
Ä¶ÅíaÉrù¶IØ"äD!›`?S]ûì?B²Ób	Mª©ÉÂ|‘ÇÀ7‹p_ã&™²q£Ürz‰TüÇž<ûKjë?nÀ÷‘Ì
ÝWÝÈa‚ðÛëDÙ(•Z1ô9ÜløYJ"ˆqBè¯Ñ<è¼ÉÎ®Õ{ÐéAMž ¤› ™-s)GÒÁÜO%Ð¬¹oÆ*hÒ"Ø¦
â`ì·¡Â
‡ø"ÿŸ@ôØÚ¿¾ùýg KÏþ‘JÓ¶…Æàþ/ËÙá¢-¹¾k»ëòüÜ]gMý:|±)Oö< 
'4™{ßSÇš^zãôÙ7ìuŸ}9`WÂ¯ÿð“î°Tw:‘žÕá{„‡þ'}4Ð`Ö©×> 3ú'ìy17Iåá×àe|q•Èm‘›Y[‰NŽ
•Í©YÜïç§®Ð‡|ßœ%êwé_n0ƒnùýf Å_TñˆY‘ø?ülHØÎÀ|V±°Ê.TÞ{Ü~ë ›@û]pÈÓ&ñD),«E.(‘¥ýûG_	©:rW$èœ|EÚÐwô…L\Æ ÁjM´bKYEf3H‹hÎÙàO‚M.‹Io§ª'ûÊ®@oŠÊH¢:±<o¥òqÙ…ˆÌX88¦? ƒ±=OÅïÚTs¢spmj	s¦HÉcÌW¼Þ6¬@[Î!¢ÆF†Ù2âÃRïT‰ù$ÙÓ|BúâK™}*iÃI¡ì÷v3cy)»›1Gbdybôá°Æ™2±®(›®<n lž–M½ûöÜ’!(èçÜ'ôï>s0(™T•ŽÌ@³‘&æÈØ H˜S²˜Ê¨^x.Ö0†rýˆ¼³u•ÜÏYŒp{z/‘êR–ü‰æ‚#«¹nú±è-~Ÿ µzA?Ãë:ÑY?µ°¢1ˆGƒ"µè 0ö7ÁióÄåñ»(|‡½îoSŠ“ÄÁViVð-!6‰d:—Ì};˜ÌÈTÐ^dþÖ¶K‡·ºP{„/ôˆ&¾ËB»l»[öÅd@Á…êŽ1Ê™‚%ó‘™±"MéŽU˜–%ò1Ö¶[žÛæ¸O[ÄeÅtÜéÔ€ÇÁ<r‹e°m~Ï0–ÖÐßy‡¹òwÉ"ì·„ñÉª`Ës@úv0kˆ>¢“Ò„(ðºÚçI¸òª}é8òX
 ç?t›^?ä¹ý?¡£ìWìU‹ŒÄº$F=<½rRlêçJñ>Ûkˆw’4ÿõÉÑ^~wÐ¦K²ÝÖxþÉÆý·`§ñ[ckr‚L×ÿÌªJ²7á/¥çãï/B·³Æ¤ûÕËÃÉ[Ã_oŒÜËùxQ‹#N”6OñÖrîžEA4(0…M%–å\³š`øÿHåm:î=zþÌÚ|kùLâY™=‚¥¬j4hÆ2{mì¹¶Þôzõ4ÁjRZT¬[vÖ·èEV=>Wr´3ó¼¸nz¸D³V8]’­s„}(åF­>s“†Œ¢áb fÐ5OJAaÔ©™[¶™¸óŽ4ûLKK=~–&o(ÐàÊ-jzÕÚÍ3ç$ggà+Æ(¼ŒLšeoÌúœg¬o2xýôä¢òz™uxi%ŽÎ¹+DSËŽ¬œvn³Ín€s¶,­gk£C¶¦Òi˜jE*x{åSËA[t!%Ór¥uæâ`*¨ü{-%°lI”©2ç÷kéw´qèÊ²Æ§¡¦.v'‚p8î ‹{EIñjtj]a¶Ý{T"¥2õÏäd1Fî ñX€ÛC¢<8)ZúŽç·*QäÝá§ä®C^ï9½Þ"wÏí¹3jÏAq*o=¦É¸Ä]äY½^°ÿà<:4ŸÔP¶KÎ§Må ­Yš°ì×½ ×±›fI@èURbî2*lGÔ“~uô—´-záÕ—h+Z{Á'¿õHFcuå=¯Â8'8{6`•¼y(.’tXNâ€°LæƒúMÆ IŠê‘V‘zË›¨°œót¦iÇhŸJm²Ö€ÜØóE\Ï.¶k­Œ™‰ñJ®›W¥†#nájFF˜;ŒR‰5Ôt–¬íÍDP>ö£
+áçæ©Ü»­Ï÷6~j­xL-õ{§b±ta™8Ói4®G-~0üLIúT¼9@…éò-´'`êÏCwphô	ƒÌ­õÞoýÞ­µyñ+„¢‹9þjã§ÉwþnÍíÐËjÕDô>È-‘Û·CÍ¥o:Rçž³6Oï[J	4¯ñìÐFtXfË-‚.øÆ–…b²}Ôñš<š¾:a¿Úrú>’ %­âø	Src(øV–¤
Z]ábÔ§:Küæv¼thÁ–àš4¹†Eéµ¤»Ë½Ûš˜pOVÙ›þ?ü*T¥±É’V¹ùlÇæt Ý‡¥)ãá›­á_!ÔrßŸ¹šÝ©ÑWTa4ia`÷ˆè©Š”>e-Qâ0@¬ÚvÒí¹/ÁO+»b2jƒÄ]ÊwQlfJ=èÜvÒ­¹¢L[²i#w»Ié¶€1GÛÂW€ŠS¯»ÝÐñëî¨Í’îT¾Ÿ†ß‘¬¾¿ MÛó|§½1¶ö¥o7BB–íl´¥@lˆÞ±¥ºGk¤r¯Ò-¼1ü,€å/àä}®[Gk™»·çÕ=×¯>t»A¯Ìd(p&ÒKáÀ#jF­e¶³™ÊÀ9Uó;ÔÊáV =ZMÞ :Õ™ýX(°ìL“hÎg³:û¹4­²_¦e:{†"PÙ¯³£Êÿ"ûšóEÔ%²W«éÄz|ž‰b(ºQ^u¿E&(Ÿ‚»f˜—+–Å+Ž˜¢sr–
0K ÉÈ«æ®¤‹?ÈåFËëmù¿{LŒÜ{­àžsXÙsÚ}€”¨‘%~*˜â>ˆ fò³Fde«wH¨ýmõÚ0Ø³äT¼Øœ¥¤“¹€PÃL(0HFŠ^P„#(AH!ŽAoTö°ˆê@Ïëu*S›`Â¶È.]«®’[rõNÃÂ9b¤r§<Ç²Í3æd¢æˆR‘QwQ‰œs^#'tv¾[%‚¼Ç:ÿá“Î %«‚Çx}jf_jÝÙw¼P?=
0Ô$Â•6?©––DÝ?Æi†Y'ìçŒ´_<"I€öÉ)î€Ì÷@ðhAý@8ñƒž.@|!Ià^KÆ	EÉà§T“ÌHÞ©å²ÏÓ!.;W¡S4éJÆÐ.æV%÷¶ >ùI”l@:¢È¦±›¢Z*‹KT_*rTØ.º-´‹–_Ï>é5-]Q¼Hu×ŒàªòùS‡mžüÊOøÍ!Ój¨ÀR8ÊlÕuÌåg…YÈ9ekaé³ZúTÊÓ·×mTØÙKÆÊŒmÆçF#o¥ˆN4Mý…úìþ˜±B/&554»ž3Åª´#‘/\È­@iÄ9…^~gê¥R¨ßþÑ€Š„ƒ•›‰`Î1è®ç,²Ã4ã0Y<:ÙkIÈøˆ„/cÐðÓ#F/öˆ*ÙL×€ï;ƒÔ¼’'m7=vwö<ŸZ96“ù¶Þ/Á\ú;ýýöVÕà½åppNÎðoªn`(‡Ç`Pù¦¸-ŠÎ Ó6ª)H`×No0ú®WhÿzµË1<¬vôÂ±„ÿ0å¢#ï9üüÖRHt,wçQ~o¹ø
5 ¿‡_›ž’ŸIo2{Ä’òf„jåQÇd;’ùs[À0ÒœÍR+-g¸p,•LOMJ+}ùå!Hòÿ°Ù•V„ˆÖáÍ4R³2àx
u÷Ï8/íÇJ]å/ó<¼|áÔA&Ôð',o°Ì½:‰‰¤j ä®}æaŠ4.|z«Z±>uö5?!Ç´ŽìébÚ·«Å•8£:{rI‹ZSñsbRË«Ž¼ÅÖPkåú35°¯¯aÃ;Y|¡ÎXi+Báª’w–M¬õ½}=mŸ¾X áqPI(/¸{þv¨¨å»¼¢­å› ]XAß.Ð©¢kù²G!´îÑ‡zè½
×«zý 7'RÄ¤ïµ£ŠVˆ» Çz‘ÂòtÆ4j‡eÂ/òIˆŽiÚö'Öæ:¿Rr*€Ü°ËŸTDyŠ?h·sW¼‚‰–†º:VK~ËKKY'ò-˜Ÿ©dÓd&á}©ÃC·Û¦¦8PÔbõÑ€V,Y—e¯Òe¦ð.‰fp:.¹<€ª7ø[Eä"1—shrØÛØâny³àõ×5ù:<ÝXµvÔlDKÂÎÔúš&‹y‰ÞvI&Ž¦k	o¸5óÏø%Ò¯µDX²˜Ý5Miûò¦ÊDSbDÑAÔ9™Â§Ø´HV¡²Ç—yQ‘}lÛä¡ÇœAÃƒ:,ýÜ»Wy5’¸D»Z(Ž—«\\(5ý½ßtüm§Þšæ%LÕ,•R«Ê×7Ý½£ý>]µRsŠ¨Ÿ3“¿›•”¨¯­ÎBU­7¯˜D)go8mŒK«V§\§ÏgýÄ›ráZüRe¸òïS$£w¤Õ6?·¬xxyÜÿˆe›Qeš-…jG+Œ(W;žJÐÓ»²L§ñ öŠžÈÆ™²™²¾ß:’¢–±ÕèÆè¡ŸtçkºlK²Ñ˜yÖe“ø&‘èŠ¹%j|^a°ª¼2›Ñ‚²€,`ŠKA.4/Cq¥MWf˜bµ€o\®÷gvYáå‚¶¨î¥ˆ¢F+*ÿ¨ï;Ý~+¯G¥É žðýùéãÄ†Æö¾ít”}.žñ‹CØÉËžÈšqqÇÈ‰œjv¬®¦.³7©Ùéá²™ò	„˜éÍ¶]€/ø+öißB©ÊvÔ¦aÇæ Ý‚CBÜg_œóYÏ—Á‚rº3§?GÛ:¸” 44m%62¡Vì.B†ÜaŒ›
ç¸y5¶Á€©º¬>u.I|c"$fÚ5#òf/è€“VÑN¯±$Íö„±®d1ãöük8¥åò>Š¹˜“©ø‘DjZ¡@OoàF6U¾µh(ùbwxXõ.ñ\b‹G)´cÚÞQOœ€¥Æµ³#o+*qOm°0ÓEÄMíHLý	ƒg·I˜)©°¯
WÞ€ˆm9“ñ§Ð ¼ý˜ÇyÊ‚¥bÿJÝ3zþtø9xÀ©D‡Y–Ò:+ï–ÍÆX‚Yò¤ú¤Êð‡Ô[ÃgŒ~êg±©‹³WTª"I^Ýl)£ÙÎk*—UêÈ8˜8â‚AÄDƒM^§’Ä¶9	k{Ùa9/¯“w 4§5 `ß_êöå]X&ƒ	)¥ýâHÉ=§÷ØÔrDR1·_¯Ï¢“Þ=p|#$ç¥ Ë¨à„}{& Åƒ [FÀ.0ýF5ÿ?   ÿÿ C„„¶xœì}{oÉuïÿùµÄÆÚœáKÔjŠ‚Diw••´‘k«g¦5ÓaO÷¤»G=!gqaFÝˆ×ëa$¹;ÙADþƒºþô'¹uªª»«ºëqz8Ôc½HœGOUuÕ©Sçù;¹FŸâEòôìäžþ¦Óé,’-²xãìÙ¯2òüÓ³g¿œ¿œœþKF¾A†§ÿñðìä½Åã?"Úk{åÆ$ËâhGûýöÊÍÀãÁ;qœù‰îžüŽÝ8Êü(«ß’ß°óGµ¯¦+ß$7ýÐÏ|òaÿ…ßËmæqŒ¼,ˆ#ÂH¾¹Rü¶ø.ûÑÕiòfD+ü»èWÇ$ŽàïîÎšušúÙmã½ÚÇSžŽôB/Mïy#ÿêB:ÚyOÛ‡íQÁ0yü·ïù^_?wÒMûAúróCÿ)	2”¶{´g?!oÜ^'™ÿ4k'~¿}yuÕÐ/közè'Ù~ÐçV>lo’a{s¬ìïž~Ö#ÑðìÙyzú¥Gúg'ÿNN?‹ŒÄ"ÖñD7ý´—cXHó0ß;ýY4º=ù	¥êèôgGŒjéëŒ’íÇdÓHF‡Ù!”Æ?‹HïôKÒ£#þUÿ‰Èhrvòieüd;Í’8ìLÇ|™÷c¾ê×:…ãíñý5Ç“:Ÿ"¿Ñ¶ÊÛýàImmÿb’fÁã£¶õÙÒnQÖ¾d\Òm¾MÉÖ4»ºO²0ˆüJá»aÐ;¸:m-‘«;ÄFâ­Ç^˜úKÇ;ïüòÈ¾õ5]ö}:k“^<‘»íñ-«ty¼ó]y9\L†ÎÏò–}ß“±@(®R¹ñk–Âfÿue'PNÁJàÝ$Q‰úâ™ô'8¼|IÜãÆ$<YH:3–Ê'KŒÄ|÷×Ü„¾ÎN~0y¡\Ã)
&‘Ò•ëe~x»ŸvB?dÃ’QpžòüÓÓÏ¡™“¿‹®5áZ_M.c¤ø‹d5•Nß¨´ör…–ëaxN®Ã¢í`˜Žñæ?<ž³{öìç÷Þ#7NðÁa‡Pvöìô1Ïž}þ²¥™ôìÙoT†³öìŸ÷Ù˜+,†½&”ü±‘Oé›'§?k,}¥›:½_¼p“÷Yg8D^Ë—Â{>ô“Q¦t-Sr×‹¼?‚¾ïuI¾Ùµœ‡Þæ7<ñÂ	]ÂqÙÔ‚Â!Æ^Ïoµ/k²Jƒ$ ‹Oÿk÷â0m¯‘p°U¾½Äèâ²àiæ%ñ¢€²J¿Dä1%8ø›†{Ñ~œÄ£v7¦;¢L£?IOmo™ÌÉÿqFÆ^ä‡[ä~LÙF¤úi`°ë%}ù	ºqBÉ¾Å‘OÒ¡×ÛéˆòšÇÊàéÓÐiÓ9‰è³uíÃ!}’Ä“¨O¹ÙúÓÄOüäqH5ú}?2“eæ†íµÎ&49H¼~@¦Åí„°)¢~0ˆÛ›««„~8ž$ãÐÖIÙ°€šzÇã;YîlÜµlLñ«3gL;Ç”pÚÝÐëp>ž†°~oÃàúaÚY0fÄÀý-Ó®÷†öw‡>m¾Îðyb>àð0?:\ßö:¨Óÿ ­é]°stü£´uÿƒ;·¾wïúÝ[{K¹¼·džŒ•b63&±ÖÚ¼=MåÉÚ
Þeâ$ÝbŒpp|Ì„Ì¿¥ÇHzvò…ÇO *A<¢äDÏz¬úKxózÙ™3¦Lé—)â¨â7:Žt¸E'1~°N€ÃSùaüÔJKùÄÓf’ÀWç~ä[­	Ý¤ïûGË^Üñº~øñý©ea)‡¦›:H÷„ôN®’\‡=_òErõêU"zøgƒC/Ýóžø}&Âÿ¥ÄdïPVÒIã‘ßJÆ0ÄdÜ;äN–l½$~6I"Ò²ÜBg¾ËŽë=„PB¾:}š|ù•³±f÷Öß=íÄ¶òçuu^ÒÎ´ÙŸ®ÎÓ4Ì#—/º~vèû£?™órþÜ_ððu`HQ°CÃ£mèíã…eç$ºrÞKÈ5’%_F^pí•Ë«$¶¸Îÿˆ/ÖVWW6WËCfÓÙVÑç$k¼/~áðÙR³NoŸ
îã"Ç¢ÚX.\Õ³mDÏòÃö*[Óöš•ÿ‹Æ²)˜¨|ø¨§•ã¢}¼…eyýèâÈGÆÛtÂ¥&ÒžGOÒkÕµ‡0·¾Byô’Vª^Ó‚quÒqd­EÒZ\z°úÐµ5€³ò†"nÃŒâ(æ4ÿàíñÓ‡òñr‰>e7ŒéR	|•Š“1ïz^ê—“v€ì»°SðªŽÐnœKke•›têAM y'Òq@Ic:~M+úßp0S1 ^ 3t3PY9ñÂ>ÛBlòò®ä<¸+ÑK9ôÔƒñèØ%‘ñpíRV›ôReà+läîVl¸¶*(nÌøñ%*y]*X-ãÎ‡5³iñVeÁæK*Û×Æ[áßÃkk«…*Ñ¥#¥2J:Œ“l¡Æ1A{@L'jãK#¥”¸­‘Z×; ·ÂÿŒ¢8Ÿ½ÿ€òJ^ ÁbøfÛ¹oÚ^éZd¸,Ì±‘Ì¸HiÔcË[4š,\ ¹Ýg|\¨n’×ƒieZð÷Aœß§Þ="}ÊS~z^íNVë6^œZ'9¡ÖI$}µ.ßš]¾5Ù‘KŽŒú[ìuÂk«dÜÙª:èÌ¢?Ò©¼Pý‘v~‡|ô@ÆZ“!ï³Ô¡$!Oå
×Vý0®h¤h&C–ô ô˜-õžzMå!âFé¢8m”Ë~?˜Œ*š©vöO¿è…×CU;á³é‘èùÇÑ€¾¡
lpöì·tcÅ‚‰ÖHÌK+R0‚>L¼qJ6ìVa´.|Ý0i½=¥\	êŽÛ*ú•MÉ…+xLZÂÙzäplÉñcôD¶äMý‘'ô^2:{öß=fŒøQ4$]Jì<LíÚ£¥%çp	(Œ·út9ú’ÚÜºyëëÝÙÿÞ‡·îß½½·wûƒ{ÆQ¿ú+òà¡U‹æW{ ŒOz=?M[Ï?9ýœDt‚Æ¤{vò“âÉ•Çé³gÿ‘Å;¿ûõü¿˜áéÿ†‹Âø"ìëÌ}Â=Yrvò«7œÃ±ŸàÇö¯%²Îœ§…ˆÅ·åz.’ò·—ó·…F‡ýºš'>Q¹¬MøqpÖûþczÚwå.aGÜ°½Aÿ?„ÿ™Wæ®<ïV–f7Ù³{0Û¹ÿúAêuC¿7ªIÐÓF"Tû:[wèEýÐ=ýÛFr·LÅ—½L©XZÈf.Ç„ƒüUn_Ø\­@8=´Ù§ŒŽ§w	åTéú(J™ÚÅ|©ÛR‚»"¦Ä)>{ksU‰¶-Ö¢°zl*Ûám¿7IÒ$»ž4>ôkûaÍe÷°êPö­¡#&:®…F+Ê›I¥­\JÇA$ïÎRw/¸°+Þdœ8Æ^v_Yçs
Jpñhg`Ž)ø¡°[]Y¢«þBçip»AÒýuUŒW¸›³¡êÃ•=D5Æ…o.¸t?Ì,ÙÚpóWkóp\&ãŒþÃöƒ+««`U)ª£¶7ÉbºÁ$Ò¦’b†]/±¹´si£“*Œ¹šçº”ä7sN¾øÇ`Òðaö—ßv¢uØÀéLÕQ¸­Eê„™8„•ÌIzL9Ùáb"æþÍc‚ø¿÷DaýPñÙÐ;bóöçÓ îý§ ôDAèB‡|{ðô?è~îRB‘íîÎB•®¶Wº;äìäÿÁé—=æ‡ú<ÂÔ)ÅúTo`4+™SG«9Ù]±.Â´”E¿÷îý>úp»£˜`™»
n÷Ÿ"„tî:b? jgJ®ò×F¬Ñ 	À÷è$ySôüb|ˆ¹µŠv;>Ý1G­hË¯JØ ê…“¾Ÿ¶–P}€K×	sn!ú€÷F9P{—ˆñp‘j?Bÿ]^C*‚QQVV}
¦~À\z>²	˜M·'þ'üí<BÊø¾QÎª<sn]‚øaêãžcîOñ€žÛ‘Höü¬¯áóeB_ópÉ­9Ô¡?1of¸P^R±ï™4ß¬ÇuS©yËd«Þìe¥¾´²¡ñ•­¨bt/ã$ASÍqé¨4ÇÑ×vGgb©ÛžxÑ÷Ò!˜B«ª¢Ûbeý<CIOºöd¸êA¤îƒ­h~x©fÌJG“â•šIqa‡ÓJG’Áë5¼„š'ŒžÝˆòÞó«‰_ž_Tâ—n\Õ¹{°¶ZqqUÍ™’	A|Z¸Ç˜¯½0wb ·ÈSé ¤zä³“¿Ï­ed'sììV?%ÑðôË`œ’5\H~'#€ÆÛ¾7êKqëN[»4-U±¢/Qg$¿ò ™òÜ·œñÐ6BbQÛæTÉÚïÆO¹pŽ>Èóôb˜ó<¿šÏä«WIñ˜Èçlp<£†Už±ùH0¶O1Ô}®Ó6¿§n~1:GÏ;¦ó'<Æÿ®ÂïTÊÂ=?\½Þù%Ÿ‡<^•G6Ë±G…­¶jm&©q°ƒ”ËjÜ÷˜ûQþðü*wnƒiâ“Ö7E<ÒšÔ8©¼tQIJ0R!šàŽ9¸üÂ*pÕâ’xtL¡^ã[š5š¢¼ªq9]D@Ey•$„ˆ¬Í³š(
CÜYa’Å/56Þ¢¼¦åƒ8/šG[”Zì›ív}œ\3:œ!T.ô½~)/«Ta—«FÈ½µº	rœ¯‡ÿvŒŠg3^‘H+Öý|ÄQœŒ¼Pq^çÞj>*ºô¢i|Ý†_·fŠ®Kò1 £ë¤15¡¤7£„s˜OÃ>1ÆkÛ€lA˜­QáHè–·W¤´& ËªiFÕÌ5S¯OÙÀÞ¤I<W¾(ÚX4¹qaNæ˜%·‰_ŽéÙ¹svò£ÏPPÓfJ•ØÙú1éŸþWP7OCúC4øÝ¯ÏN~¨¦ìËuÀ‡ äëh×Þ¦Þ„
ÿwâAÚI©(ë·V—Éú*Ï}€ìOª8Ò
3½½ôæšR<½ÄìZ¹xd1˜ÅœgŽFvBEróÈÛ<–†=ƒ×ËòÌŒÅÝû·®ïßZ¤¤¾ÿØ›„ÃGJ}ªPö=Jõ¸@Ì²YçBÅÔÎéLO„œ4Çº«-~ÂáìxÚ°´.eB<Ç–ÍÐ$õ“[#/óãˆçµÛ%žþ+=cÁ?Ä¦wöì‹1O‚ÌÁ¿ó+ÂŽœˆVýa
ñ)b½8=–
{(â¢äëó¨IºBLåí›[|Júqï6ÝnÅßeÁÈ§{l4¾ÖÉâ›´A:=©÷ØD’¬¥Ü"îh--“Å÷ÞÛH¿¿r÷îÊ½Á©½@`óJ¨ïÌõÂ]YÈèv]Q5jfãRî)¼³O™wgŸúÓ½îu¨´M ª¯°é{™÷…	ç-KÖÁH¼š§²í°êÎ2¨.›}¡¯)X¯È³ü÷»_{,”/”NÓa|öì³,O!w?ÍËŽ4V$#]kpƒN¤2HZÕÏ*;TýÄ:‰,ñTž¢Â9Æe<õXjx!Šå?ÖÊbÛ•ßN¢„J;~/¦
ü.Ý|ÙÑ“S=@á’!hœ±ôÍÕ•·å qþ^ÝÖìÆõŠÃËì„’…—CŠÛÀÊøyM·#YçvÒ»°êsµÎCìóÓNNµŒtb¼£~þª˜!‡hû††÷u®‡“«I'G– À¸Kuž®ŠR_œð ¦›”PC„Š-jŸCNtO?‹i<@HqJ…tS@gýð‡ÎÁÊ%ò¥l†­ª{0‰S‘Q*áÕÇçÖ)K¨nsyÆÈÍB‰Ù[h‘>Ø])ŽWÕjaÄ.=bˆ^¨+-3\²Ò>§„0bXÒ!ñhþryù±p~¦“0½³“_zü|
ôñ}‘ÅÈéõß09Q‹(_Íw:ÜbF‚ãGrH–L|í	ª¦	\¥ˆ`Ÿ¼¥ò™2
;_ûaûm úKDYfÅ7Àá§P³Œ†Ô3(ÊŒÙk±K
^U¸vÚoUÌ6ŠXm¸Ía»ü‘L"šeÒj–¯©…±M¬KS“£4]¯®ì«zÖÕ:
J£X[cÆ•9ÓJg¾AkÌ¡W5g›)!iõ¦Ãê;Õ¯2ÝQ…ÃÎ0ŸUæ¬®õi];Ï?ayC§¿Qx%ÀÏò”!ƒÉÄ.\ùNen“¢WßrmVãtÍ•ì¯7äô¹¨>ò’?cò c‡]`¢Nƒ”Í¥ êÏ÷˜ê˜”½íMº£ Ë¡×ûý“þÀÏŽñÖÅ¦Ñ	
|Ï‡ï1žÁ<¶®¤Wš#c·Y½Yæ)xk¹˜fÃûÍÈ–µjì“§ï
Ý À ¸ üÇÑ·á;	{m¯v“ÅdÈoÞO‚Á@e u“œ¢‡÷&éóÍ
qŸž>í5»5IôÅ†KÆtúC:e~r5’Éq‡2_Ÿ…¹%2`2üÎ±csxè»ÞøAmœ˜JC'×ëŸûvZù ÒÎcÊI[fÜ¡›ôÃÚˆ–®uÄý»qß‡Ô¶¦?3ŽŽ—æ†Î°$ÅMaO Ë–E ÐºsOhòÛ.ñä Ê…è›Ëâ(|ðöæ“Ã‡ö 9<©†Ñ;8¢gý¸Íä‰q<a‚|¿½Vl¼®+Z¿ÒnâSâ Ä8çrìù^)´RVN7Ã	i xìtñX¸ª/‘Ã<òDo zPLŸ÷ˆðÈíÛÑx’9	_áû§ÿwTÐ@§Óq;ìåÉÛW@ÆuÿH0WAù|JÜ&Á¸À»lù¹8ÿ¡ÜDËïd^B¿ë aeŒ£÷ý£›ñaT´éwRº ´Ù±7`êAËÙŒ+ÃµÝ7ðýÁ‚:œ:g&Ž!çaoŒÛ´Æ	xÑââR'‹ïÄ‡~²KÑÖRý×RVK{ó’2Mt.®1.ò/M¼‚{t_ØÙXbR¼)cz;úÐO‚¸ßzi(Â¯Ý ÀM¬Ámz€q×Û˜9ÞrJ†7³…C»Q­ü>,”uc=4‘ Aq”tB9ùà² ãUÆÑ(Ê™¹7K|ÖTGJH° bxªë²„¨ÉÌ4Å €†Ün[$–I‰\`0PÌ
7á4äYõé—›œöÑ°°Bù…Æk2m\Ü’ç­‰+‚~coµ|QZRþšÍOƒø|ÁJÉƒÜ÷»3rì[# :N¤ü6GE~›ÉÀjŽ²7*˜/F¥ä•fQ'9´|M—lÑÛñüXdðÐWÙ¡7dð³,× óúK*+HË~?„ßCWKÕ_Â²oØ!aláø•×‡ËÄÖ<«„>V+æsHUâGo²#²&Ê¿c&Õµoñ»µë§ÞK•>¸3W—Î¦õËÓÜ¾ÖÄ]Íª‰±­uÑZtrl¿øý×úßÑHå‹mùV†R¾ÊE:‡æ•¹C¥Ç-ULVuØ›iVèYÁœÀ&…QcþZþpÊ÷Š8Ø ÁîË\Is~ÉÙ—-ý§Â¹þ5*Ctì³#kòÐyÏ|2h¿¤ŒÆ!+‡à'÷ñZ~Rr:?÷«¿®1;sk5… LÊí(Kð¯u@Ï‡¶›‚—Wî´ö;¹ÖVÖ‰‚ë”á,Ç:§ÚUŽ”ž=û=ŒÏNþ ûþ¤¿ûÌuö~Do„,qŒnxÆ¿{…·ªñ9ß?;ù’aôà¿Ö>syšXc3m£Ë|wéh‡:·Õéë& çÁóÔÔùþŒ;_sÄçŸæže+=^€Ä;Í'÷æüM[<Â?#ŽáÚLÅùLqKŸÔIÔ)ý²Ÿó-‡ð„;ÐmQ´_õcxÀ¶dëÛ÷ž²ô2Î`Žƒ¶¶ÊnZ½øsy]
!¯Ìm‘Šà>¹³ˆú{°’~'È†»ñhä¥-Îà® ´Ív ËÇ9”àM±Iå_´
†ènÎÆGªf÷†G³‰Y„øóOíÖôF Ú¾õ4HYü
ŸòòÏ1#7¼(¢|ß„§=õÅ/ùß‰¾‹!æÆ"ÅÔ2úR@H};·ž¯\Ñ#³UƒšÇ ‚™'c!òÝž‡™°yx<W—§'<À÷4ò[7	†6·R„EçÓéˆ‹Fœ#Û9™ÔƒËÜÐtˆì¹•–@š¨Öl#ÒùI¼ên|»ÀÞ9pnF”âž[&@ø2*±"t,÷¾o¹‡‹*Ò¶Hp…jf3<FñLji¯‚pÖ?eô4fˆ±Jr¡f‡n°Ò6¸¬!Îíw'IâG½£–™Ãt<Á«s5¿R&®¬²ËÍ»Ë+Q³dÌUÀ¬\áO²Ý¹ŒNËSý~ÿ×?ç•Õ›ô‡´p3[îˆ):–¼zK—²ƒ]H‡¡nFA]™’±¡á%f§56œn¦–ÆÃ¼‹¬öŽÁ¡…q°Ü¹ðWÎhÁ²o3Ô(Qì´ÿ_B0™Ëi‡3ÔÅ«äf^rÆ[MFÖfc)ŸýJ»[MÄ6CjŒèf—?âêUðVçÁ¨fÓ¥À4Ã¡W?§RÆ0PC¥0¸ýà«ŸþüÈvx8öF©„Ã÷^ºRCî­ã é¤ "–Ÿ6å=ò%bP‘à¢u‰3`´!¼Þ"^t´L‚þÓ-1 C&|®ÁÈßËr•°¶êÙ¿Nþ®dW±ç;›ÞªªÙ` ß“u_ieæÑ,ÞeéBŒ]‘è0¬ø ¨@{‚È]C>ÐKæE6ŽÊ¡©rqi6XO3kÂ$ûë~ï*e‚fEË¨“ýmvÌòµ À8‘odWÊï¦@³ð*Söš)Äˆ¿®õ‹Î/t(Ó\™lU<Þªæ£ gOÌ‚ŒÙpÿÖ»·÷öoÝg¨R†MYÀe±àòï>úðæõý[ßÛÿ`ÿúöÛ]I*P³“G†±« @`ç³IPU“*ˆT•Ž.KDÅwÁ5WËñPRh(+‰š§â”Áö‚Óá0›TÓ`J¼Ïk¡,Sž›+–VSŒzUµAA¯XÅ¸7AŸÛ$(H3éFo0ŠG2£-·³!šÃ;~÷ÿýË–avŠÑã9–¨Q-"©u›#ŽÑLæ*!†PS U¸ç“ñÓFÚ‰ROBLvGM	–×­urAp7()ñ–yÛ+î[ƒÈã¶t¨ûÂÄ2œÕ §YÏ~8ÙÍhn;Š©8©sBðß<õÝÛïS;'#žfšJž#ž_ðfjŽÒ¹¬Ò£?~Vyz¹9À»&áéÏF9hÀÎ½ÚÜT,Ž%6 |*`gÈ€ª¢ Äo‹ò!¬äü“ "?~T9hí!ÊG§ª¬öÚ@Ž…ÂíóÆ_šjŒØr]Í|ÏR‡>?‡b3û:Ìú‚³Þ™o¾­‚žœ§BˆP /°DÄ×1Í˜“ÏQÓKg÷bÖäº»¡^®lÕP®¬,Ò½þp@ñÙÛ›n¸\Æ;EåwÃÓZHÉœLÏZló¢0`øE%ó¿¹÷.yÿô§äÞ»§sìþ`÷=#±Úk7Í‹NTº¬T‘ƒ¾ƒIïƒ(<jNSæZõ²‡¦"‡*˜ñ†¶rAa«çGJl%‰Î@'†“TwêŽª¾ÂÆÊƒI:¡lRË"†ôýLT`†k0!®€©ƒ¦£I˜|5ek±	²Š5V‡ž»"¹bÇð6/,‡Mâiœ2‡®ÅŒ1Ôl7j2€ê›Íâí›^æ1Wœ´Ã])å¦X¬*mAìÔOåCºeZjK’ÐöÊpÃ2k”_¶ûŒxUAæQ³°óîÙÉç•ù¶HYö¤¡yä¦L¤‡=ýú¯~’QèY¯c‘%ì‚‚‹·6(äËˆvy_ú waö9üMÝ‘Å×ª„-²”hGñßYÏñ1«æ÷R6äŒÜI^Ð™Îã³eò]XÊKD„Mì}¶*Štm?$~Òó[-¯×[¬&î: ïÈ·Ø[a’X&«KK¶Ôºíë	yaûFA(¦âŸò:™jbUð•ÊòÆáíC]C`ß×q“ÔºZv®Èš¸:t¶¢'’ÈWb:*_BL¹„S4úâ:çù…/£c»ôÂ»&¥YR‰«<çPÛëô©ˆÛ¬d&5efwÝˆûGÖ@á¯QK99B…óÑJuè¿ñm¼^Äncoïm×C‹§…èá°‘×<*Â³T´3[@ô“Ç¦ˆI(SŠ÷Òy%‚
‚9¤Ç‰°•yôÉíõ–Òl¢ãÊYÈós„÷á6îb*´ó«P6Ã8µ‡/ç}zV%¶¼*’Yâèv¸«n»–´uPVn=E\RõÌ²´Ø€â9`nH•¢ÃöwÊ&ÊÓóÝæÉ8â—ÎÂÐù}HÂ°RWî€“…Š[æ£×-~dì[ù|BDgù«„ã‹ÖœÛâó˜JðW¡xQU¬‡”ø[dÜÂZÅÂ °û«jäò¿Á[Òê ½0­*õü}1x]…ïÑGçâE&”JòU€OHû®Ê™ù®x°±Å™4ÖŠŠ0«ê-cªŒHzJ­u[¦…1«Ž'¨ó ~ ÝX‡¸®õâùV$Ý‡Aõ´Hõ2ý“ÁŸn8IàyMèš†l–o²ˆðùÇAoªæ4ÊÔ H¨A…ò¼½"µkíÙ­)iz˜X†’ös"(®á?ÿ”Ò¾Ñ!Âà8ß4š.
 €%,–™c,;‚y¨ÇÏ
¿F(wÁ›Ñg.ŠÀÑÏ—£èŒéØIá@ÓŽ
Aº)42•¬!<š/ÇÛ«†ô)	S=7ÍâQ›>l†]Ïœ×hiYøC®µÇyÉ–^Œ*ëFØrCkÍV—Íêê¬§dÉ$‚2ÄjT·,<yV…ŒlY\ã’‚©þjéZ2 ~áŽ3Aòj8ºSUäæ¡æL«$ªX|·Þ<¢ZtK¤­‹¸‡t}a~J³˜TcYY<³9SÖóÝQÝÊn<›}\·§)LPÊÇK/•ýwöÏ4+wbÜ1tmAž®/ßù}çMÈÓ,3=¬²n´»£‚í¼áôD¢Z±_\0¬ŽÍhë; ¨¨4ÛÙ·#>9€;vtüYŸuƒ`Ñ:pßœKë’v¬H'v¾òš.#7€^Ðj²•þ gXXzç8Çµ„­YgÕþ¥¾<RYAeI'1?rð
þ‰kE&ƒ|áX$`@VÖl[Â†æ\”J?ÔFž"¯æØ[«ÊxÜéj‡ô"®l½ÇY¥ôUäÍÆV5mY¥K5)a¹¬š%uÅdêVn@Q”)ÔÉ/a ¦÷ÎN~yDºg'¯U+Íæ:«õé§SQM±\²cSÂ­EPËŒI|:K–¦VV'Ä¬Ö*áqF)©Jn$Ò¬cmX!·“CŸx‰O¢8#AÄÛ £¸ï/Ã7‘OEäù£qœÐõˆ×ï3¹ÆD²!¥%1*sÔ"í®9ô**ŽŽˆ)àŽx•ú¡ôÏždó¬ýüØ€m1h€§í+<$ 0äå$5Òo	½åŠDï¨ÑÉm7œÔœ+Š…³j÷å_î4¯kDµ|S	£bÆ(£®—3Òª¢LÂ„È¯,œ}—V9&ÆhK_®ÅÑÊˆVúzF[JÓà+$°ƒ%à¼ÚÂ!ƒÆ¼¢ä§Ê2ƒ3tÔ:h“t£.§L#ÙÇ01e¡mtæN‚Ü¬«fˆ°äsn•Ä§‰3 !›½Ã°6YÏ"]KÉtÑ>Åo­”èà@W(I&	æ]|²îÌo0>(Žâ4º›bßC¢ÃX1E 5ïûôMS‹Çì	4Ž½sàôi¿rÕíªpFùÞãø˜àHøé—ô¨fÐCiE†'g}NFPûìÙ/2ÈÀøœ§AÀOÙ„ó²e–)ìgúÑ}Ÿ
°€¼rEËpûÒñÒ#ú“®CÆ?Œxo% O)õŽY¹àÿî)i!Kï€û8zæA-öc*Ûè(_f]Jÿwf99û”Ê¥×ûT&eíôz¯Ú	Ý¯KM0§šæ6!uö1ÑE÷˜€ˆ‚ï€æ—LX¤#Â¡¨i¿MŽ¢G`]‹×â?Y›¬Dþß˜„7ée>ŸžÔÆX\a\‰—×Mxà^åU*O¿ôÌ«rÌ“‘8µÛ™œ#îÁ¡ÐhYÝépÍkIË”ËåÄÞ¯Û"RÌùüª¬;_óëaˆXvBúA
áýžT-¬~’aÙŽû0Ïƒj¾£‰rJ~ê°çiQ‘1RŸjt}/9ZÐ«`÷N/Rh\6p!i‰¾[Oî÷ïKÇQ¹¥Ês|zU£‘þ·¹K%Œ–I—[O&#ò-’Û˜„OØùê÷¬Î$£8ÒÐÉa:âP§DL¶úOt¨Éja¹,u7[ÅíŒH
¤ß¸ñQ
Õ¬°!0\!-&w,±›q‘•š8Þ T÷@JO	)·†Áþ¡Ò"%Kºs¬ÀK¥!¼ð	[/
‰ÖzwY)Âö–Ã+ÈÏ+[ò=5JÆêÊ3Ü×·‚¯ÕÐ>‹®5‹){Ì\&@ÄÉ—;*Õ®!¼¤y6‡˜¢ëO¼ da‚åSòˆ“‘+'¯2—¯’‘YÅ²¥æ 0Œ¶c®Ô°Ð–Qå<r–Ž›–#¼FýþÿWLñ&4Óªé}K¤M´*Æhé¢¡É?·Üê‡ŽŠA~Ùò’lR•˜)>CTå‚Ð€º¾åÝ‰3‚JSü³	sÈŸNFc0ÊæF`ºBx
-É½(Î†”†ùçAZ8oÍ ¹63…^»§Ê…ñ£ÂÃÇhœd%ØÆT*nKÑÇYdÆoá¸’éM1·TÔZÀÒøßÉ j>šá(3Ï¨¢ð]ÄÌÐ&ÃAu—ÎU|?Î(¯ÝíVN<8ï˜\[c¤5Õ®‹1Gm{¥k‘wML†àÁ
¹\udCª¢sj±ã;¾ÒÄ;ý}/êª"Ày%ŠæÇ½˜ÉsøJ;¯à‘ŸWr^Ûä…ytFóa?/Jˆ×‰UVó.jÕZ:ò‰Þ´$¬ZRNöoVÊ¬>$,xyñ8/ÄjUT]g	!<×9y?¦·Øõû^7=Ç>/œV9È´¢´
NlÜj/àÀƒgû‰Y‚QÛhÚ‹lT„8þ¤l!õ¸ZX¶J¥ºKfl+}^#»­¸$vjoc‹,TìõRrT	òÜÜòf¦riß·¦L(ÛëÅcƒ=c¶SðÅ“Z/ñé\õ__rË !ÉåEB^mŠ;ýÏ@8`,'Êþua¥»ïQ•¦$N–^7ZœŒû¯7-æÐK(÷Wž\¸&4ù›š×&!Õäõ%H6ú†ÔèüÄû¯<=>ÿäìä'yu“ˆ³	=Btö]ŸAµŸ$]™Àšo@´ŽðÜ	FI…=ŸoÙ˜*@ÑFý­Ãö¦>÷ý¾^ËØ¢³ªeŽÍ©l:m`/G&#3ÞS/wœkiËw2X.ËˆrÀLk-dí*kìRŸ›–5VæŸe³jÌTÓåî·†öMÀhÜÒÄ)8ZP…­¢rK¥ÙÖå7%zØÊzþSÕJ¶YÃi2Í¼‘H4Ka‘g†£Ž›å@ëµh;”UªTg¾o¯Ï¦Åx(ñÄ½ZÓ+¾k0æ™'Êqø½§xŒ(ƒnVûýS­_c5Å¼p«F/œ%…"YØù®?º §;Îac¿¯p5ÄŒýÝÊÝä>4Þ[ç0à×H7][=ÞY[u[­*?[ß<ÞYßlü³MÚÛfãÞª–Ä¹ø›Ð_h?æqy9ôTõK	¬DM‘ÑEœNƒônÜBß  K²ª\ÞÔ ±¦­ÚŽR¶€6 „n	} IJ¿µºLj.ñê»]›C˜;ƒ{^t7îÈU"…¶‚ô;Ì¡ÁS8îòzZÆ‡-v(ëôðYŸ*ÞïMº°<I@98¿þŠ€S¤·,¾úÉ.åipàA)úÝµŽß^S¿¦—É×ÊŒ®cv«d¼ˆ| UJ2n‰käÑ›ÓúýR©ñxúø“Au}	(|‘EÁJ5ˆ4¿/ê©eˆ!"Ö8Ú-6£\Ã¿ž©uŽ¤/ªM(	†t-;=ül·XÎyæ#è2J:q(ª ªÒ]¨É,­ø3ûN¬Y…[¬c'ƒÍ]: m
-!õÀË ê…“¾Ÿ¶à9—˜Ò*RTòÊÀÝ¢J0 Ð	ÑT)¼²¶º ŠjØ2ËYØ?UBj0tšÖ^U£Á¸,…™GàrÑ¶Ð£“ÄÙxé<ƒ´øn³¤+ 2npoå:¢RÐ+wÎ2Íe8]î–'~–)wA¨8Ò‰ÊkªbŒp®þ"»aêç6ï¸„)I¦ŠQk•Ã^7Wy-ÀfæQµ„g¼Ö‡›¬n‰Fƒxvd]*K-$Kf¾!Š…=-˜{ÔŠºÆ@ß•KÈzºðà‚H2 ’¬$’	4‘qì‰òcx J:ð2§›®ònžTä¼¹™™YŒÊ2Ã`LØ
™=ÍÊoÉYÂI[ß•Qk9Õ²wWÊÈzö~}ÕJ³5+2²âÓ½ÜÆÜL˜ñciu9UDÙóL`QIö¨HSX–s¿€9äqq%n‹§˜û4V4 &ñotD?Ç¹DÅèts<ž$ãP"Sñ^šeñÉÅMó—P3èôËq½@™ú¬ÈjbóZLÅyGI0¸fK?+zpØÎó‹ÛÐ{C¿wÐŸ"`nëˆõÒ)t‰éB²ÿëÉÌûpáæî†
‰=.µÀ½è5Ë™«D/\€WQ˜ÈÄ`lpò•‚ñ¸2êÖ8ñŸ@ç:¼^&0ü‡ŽŠtür"\ {‡¿¹_ÎíBÿƒÓt.qƒqÞc©Á/|0¦
_=¬T¶.J÷R½ëRi†OŒ•¦g¨!½P!ŒèKÚª&UÀ{µ¬	}V-…ìJÂˆZŒVírf¥Äb%P§³©èŸr¶ª8
<‡›¿N½(…Ú¾š¼1Ž%l•_<Ó·ÞòRˆC©‡P/à‡¡”:¾¥TªUBvé/'¼¿êç<²D+â¦z©ò)g‰"‘%?9 M…”T)ÖdRùpÈîYŠþ„!Äd9ZqCª6fÖ:Ó–ÅÈÆ3p„#ðI}¹[¶A}QÝðlP`nû›–“Uë7ŠRQK8èÄÁÐÎGcGVvŒ(yŽØ#6µÝáï~í‘äô¿Q|Éø^‰édá•eíòyOiaéTsØL—þf¡¬7ŽJÏFû«2ßûC6ÛƒÀ“áµÎ5Ùåy“ú£@OÍŠFÌoÕG³rD¯Å¥9Ï÷Tv‹aÔ·¦ëS­³\XA6WW.º·jó›Ù”/d¨Rö`è‘_xb	Ì¿È«éÞ<9ƒ¯îœ+bçHS‹6gUÃŒùåGý2íÌ˜æÏÏ'×™„+†Ó&¢‡
q%µ×ëªƒ} 6žô†í‘ã	7Óæñ?’æe%º‹Ã‹ ª¦p
·ºËÜ-×’bùË’uÿ‘Cr’ èL³f6É!Dªèîê:wÎN~Dåö”nF&Ïy'»²@û¨õfõ+€~rp¸ÄÎåÊ¨Ã¸}š—wÂR5\hÊ†OÝrÐtAßù‡²K\¹[BpË?º ê‡Ë¸®÷-	¼Ï.BUÀh'Û{!(›©ÔYVñóOxQU€RúÛhˆq ¡*I½¶tT¤%D”5¨Ä>}Kã"z‘´Gð¼)Ú\wÒ“=æF-Ûn#äEÚí±”:6 R<À_5 ¯*˜›‘¢–ed8æXVCBœ„‰à%uÔ8-Uö—“Ô0$‰EgúÚ`Õ?6¢/Ø0»8²ZdD	æžEo×‚ß<¢®Aƒò"8~DÍôØïÔi£ÿ)µÙj@ñ¼_—Tÿa8IÕ./Ó/Ë³µî”Ý9—	cT‘ÜvÞÍ «&ïHÂm“1IÆÃÓÿ!ôPÿ|ìÖÏŒN•8vÞ;ýüˆa­~Áy~¥'?!áÙÉßõ

‡)ÍÎNþIŠ†zœ=ûíÈYõgÆ¢ÚÝjªi¨ÂS%²"êù)‡17Ä}[kcc*c_¶n£¢°Ìùr¦¯	î¯ã…[)ý<ç¦© óƒKÌt0†@òqè¨¾Æz‰nósù¾%&|×Ë†:˜D~ç2Yßdkåé;v¬L~½ntG¨>}Ú24¿OûÜöHOþ…;Ï‘…ÉíÒF“ìÈ¼)¶;åbZ¸úé7H&ß wO?ùcÑúy^þ°X0A÷ô³0òâ—=§ÿúeOWÅ½ôBù³#þîånWFq-ø/{hÒºBv3lÍ¡S!î³jhîÂàR3õê,êóÙŠƒ¿Z	fp}e“ÌÊ‡›9Ñ®×+Ù®‹J8ƒ+[Èÿ9—Wƒ,4¸êyd—ü ªÏÇIjÐ?¨&‹‘#¬:²ÎàrfžQ_PRÍ\2ü9½Fç³-æk¸ë‡¡’p‹VXH	®Æj\sQ•XCó†k&=®óè:pÍ=l®FšssfƒBÝçÔ„àrúJ‹Ó¶Ã9ãÝl;eáŽuÃmM,À-2ÇÖT—wÆ>—×Eäp²#cNä14ÌlD&Í°Ñ ³2Ëø¨82Y÷tWk¶G0b[ÕÆß`6‘I6ˆ g¸f%öJ"-r.gJÝcc0¦ïmÊÙ{×lQk…ÇnW¤fÍŠ‚«q{lú\Ès¦„>6sRßæj-Ò­’Ów3;Kj{ž›Üy¦ù±‘ZRý6ÕL?iîËL¿‹ü¹&ü±ÇûÂ 9ê6E>yáòÇÌrÃL¹úe´_8J‚£D‹2ñ‚+¿žßdÏÄ_¯DåB|Äy“ñ_n:~X‡·H-rYõ)¿å¬–
—;!â•ÞÓŠNáNr-5Jã»"Ãÿ°Ðe‰úä°ý8Àe7±YçYs$=Œt®ÏÄÚ–Uøšî¡Fyi˜¸?Â‰ ®œkŽ!vÁfM.dD“ÝEå²Q4@´,ÑBØœóÙˆÑó†J\|å¥ª‚þ›ˆ3çH/Û`I2¢x”+ÉÌY!Ž_Ø\µÌ­g·¥Ì’özrpŒˆ#;ÖôˆµþæFénZ/Á|j´~‰'„aMuïÜ5§ÿïšÃ8w#¥›ìËzÍMˆvgåµÒ[ÉgÃàe;cÞT¥MA”µæp¥T0ñÂ ·°s£HÆB0g)L„EÌvÉˆšB„8UW#e,†qš!<g!èÅQsï!d.æÙZLuIÀ¯wäúy©“ã\Ž/$·0¿Ä¡þHÎúSK²Ô2ýXíëc‚çJúã’MiÓ/"m‘µ€K1äW³DCÑ–)6"j¸f"l¸7\‘‰Ø”Äáš_a~‰ê¦•@9‹ ;:¼EYŸ˜Ø„hY+è,DqÿWˆ¼¬	Šs%¬†Ù…ù%ÈjWSÊP
2‘·XjB©WšÒ¤,^,E¹òùåÊZä×yã‹ØxšÑ÷ŒÔ=m7¢lcZãl”}1ÉŠù•—††§"744Mê²›v²¾câFK¬0–½Î¼ñËsfN²bÆ§ªq¸Gõ–«Ó·›¤]Î?k>¥¾É‹ÏªýÎ%·R´…ôü¾"y–†Ñ¼¤lKô"74f;[ÊT;"þÅº/M™žÕ¾x}QCG½ŸUm£zÌ+-²¥EkÒ7€h~½—M¼ìÒó
gWÐÌ·¥ŸõˆØ/}w¥²±¦ôÞà‰íò„öÓE;«h`8Ö5¶Ê·Œ™T{¯·BDïo¹Ñ&L£f¿„iVB]¤¢TA˜¿,¸Q	Ej.¯^¥å:Õ!ÛëÐÀ ñúôv·ò8‰G’f¶Jè§™ï…Láuþlh»¬Ô¤˜ŠºmS-G\¼CÂµ”A¯•mbOU>‚,&ÙÒŠ?êÑà£±Êˆ!bh³†§c+iÍØ†IÚ9©Æí`õJoóò„</)ãnO%[ªG0eº_ð-Ëš7qãØØÈnúi/	xM0=†ÞfÕ	:ÍßAB`ÌÎù ý±¨fYŒ‘qïýì·|¼R§zV&— 3\S,ßsFê¿!•ˆ÷&ÝQ]raøz¿ê¸IK2êoUžmÓj{ù w¼®êŽQ­£nÓZE°ÔÌZ·ö¶vÉaÛ{ŽÚ„ü…îzqnæ¹ä©|ÒIÇaµÛ‹KV’-ˆrµGß†Ö‹4Ú2ÑBä»1WtF®Vê,÷V·"ÿÜ¤«ÐZZ&‹à¸hCš”;A÷ð`™ŒBû¼'é!Ý-¤~¶««õèÍ)}Æãö›ÓÑñ#gŽ¼§tÅx?	#D=Šág€h- Zu÷ÞóG	z{Eòi´”îš>X_]¿´Lèÿ›ìÿËìÿ·ØÿW²´Ê# 6”/‰wN2žîvtœoŒ£NïePß µt¼C¿ÈŸnFøN¤OžßüÒ¶þÚWgëÍwãÁ¶‡Ýÿ•ÝøûÃÓÏ¢Á+°õ¯'‰wÔ	»5%Üè²EÖÖÉñ2i}o™ŒÒZùY[’¶ogìõ÷ @_kÌê¢H¾ÍÌ%F—ïðÙ!ôå+Ï!Î2öjÈTu!#VÝ¼0xìGW§Aš—ÿ†é¢23ÿœÇ”}Áßœ{ÑÛr·cAøùn<P¯¹åôê4K&þ1‰n0o¼H,AEUcÆ¹!¯È;>‚2ôOy	sQS¹×ÊªÅ„r³/•É–<ôgr!¡Aâû#¹®=ª®|~9x”32®–cŒ
jµÐ‰ÄüêÔ°³ØþÏˆY_ªƒ@%ÞŠìÿ.2Øo>V´‹ÁnPXS!$‹ŠQ|sß¡„àg*í^*’áÌµV±9ºgTmç¢T+ÿ`mABRhðs+ã*µ‰Ï.
¹6Êð•n@Wþ±Ï<J$4c"­HˆA–’Ü„dÐKj)‡2‡ÕÎÍN,±ˆ/*Ï#zX&	±è¥9¬_L%„ £	øïÿúç3¶¨©^ÒxpÍ6÷y8Ô7kCæèÈñ@e
EòØ`†§yrCîéy¡_(½äù§æ·Éz4˜`ô­ØðÑ†ÛïN-šßó½¤7ÔœNM#6Ópïìä—Ïàèt:"‘Ñ3ê:Ž—Z.Üº\àšœ{=.h-Pëà¬Ï¥((…Dcé÷oo>9|HÒÑ–xO™Kþ¦’Ë3¬:É<gÉÑ&ùßÜA|P·Wû2wÛ¥‹cÂ³¡uY½Cç‘®´â¨Æë…+ý— 5¸Ç]AŸ°êJïŸþAXÒ4 'mÏâInz­ÇžÀ°c¨¨CÙ(ð–TM’˜à¡Úè›G©Œ2ÊV.ü‰O”ªÇ³r¯›Æá$ó	¨¶TuÊâq{mep\e6GìtUkë hl8m¦$·ÚßÖŒTµ}ÓïÒÛóû·ùuX¨v@¸âÇ¤/@^—	ˆ‹yÈH4d+L¿£l	í%møª†<XÈhqX+
k
¬H†Y×Ì£qJ“nhÂÂ×æXé¦øb©ŸÝhøóy(åÃ‰™_®Æj½b‚PJ82†pd<>,Ï‰#nK¢ë’Å£6Ý¢qv½¤çX'°÷PCEà¹{'NÀ_XåJ4M”A·Ëj¨Õ,uwÔí)·?Sª	ÈMãÆAð°m´Pôa®·d¹A3ië±¦>²1œ‚6ùHØ, ëÅK£jC$ý	ÇJelƒ1XY àJa@ÞÄ/GÅlxU€æá#ö¯‘E5îFWD
¸Û:Q˜=VÖWñm±ŽxÜS½*Ö[¹kþ…óÂú^Ë¦øJ9óV;›‹8"˜g6“Ê·¦@…ÐØ5Çî¾ºžâ(bó¾(¡œ÷Š ÀýZªÏZå«ª1 =Ç²\‚ÂºÖÏ£Ð6Qø5š Äÿp“êÌFhKáÍr¿¯Û#å½èÔÖÂœÚÄø5¼„²Õéá-­@9ÓX"=Êvà&O¼2¼ôÆ¯¼¸ú‡ReIë©×‰%ŒõpÙ+Š]±©©¤ü‚^˜QÐæa ‘µ-øTÄ+É.`ÃlkbîÛì?J+‰Œ‡täCú/·¥_nâÓbM¾X7À…øDæ9»»AÒSÍCó™âî¦xÑ“G©ävOµÍkæðÜ8ñ`¡*Ð„_]GÐì?æì¦\Ñ×ŠÞd¥¢7Îí9ªî0×¤YÍ¶~O‰DÏ‹»7žp}=ùQÍ«uiÍÍ—e›ž…çŸ6§£—íðÚ^é"Ó0Ý‘fK“ÇbˆU»Q™¦(vCnÂ•,¨·¨=‡í5Èú£ÿ)Ù†®C2²–ãÓBçQºB†j"òFƒè“sèGùâEší±ÁÀÿv¾ó@¼Ô¦+*qwãst¨9Š¤ÌÄ¬04ËÉ‰CÚmnj>€*Z#`aÜs0ËÀì4€‘;ž‘©8éìÁœüÖã9­_>®ÇYAÝl¼©–€UPu[Tž±7*ùñ¢`ßyìõÙßà?è‹6Ë½—ËziâÛp–«ÄØ]EÔ{ì¹†îñ†…„C[¶JB¬Ékh#-o;óxz¯×óÇ™õ|÷«Ãdbÿ*j¬T|à-Šé¸FZ¼ñIŽ·I¾I`·pí&PA*¢ÇµÜ²Ò i‹‡q¶hýU%‰`p†™ŒÆ]¤°w^ö?ï°ÂíáFÝH¥ó°‡¾fDKü×p5•â‡x‹¤–Ü ]_ÚNJ)Ø†[Þ$ì§´]kd&i]ßDN¨º6Í&ˆÈò£r}ì˜üþ¯N¦9ƒj‚Ø…:°ñÇµ1"»GªÅ¦9ÏÛaí+FeåŠQ2¦üÎmòV~c^ð¢zë‚Ñ;°€6Ïç#£Ï;ÁS¿ßZ[:þcä¬ã‘òÕBp7ˆJsE1;/;Äî’’aÈ,NÕ ©	…ED~6äk·Þ£rê#VÁ%XÂK¦	½®0W„ö†€¡cÿÂõä‹ÞØÅb7Ã3gMÍwÝwOÿ#0ÆÏ‚ÙÖxúH³Èe\ï›ÓR8Ú&ÀWùsÄœ‰*I,6pñ•¿Vô€e7S˜“”en¦7Ž¸¼«g5i´×©`a‚-cê%@6±²ÖÉØÈw©úÌ­¹2¤*>¼ŒµŠ4BÊ=XÊÃÖºÃ ê8ÔÞäìäÓàBbžÉôØ¢¬Y#ÃÑ:ôš ùcI¼D‡2½@è‘}Ý°/ÑËÕæXÓm‡½Á¶š”Dó¸3ÅY£ÂúuÛQ˜Däqxè›ü`šÅo¿ÐàÁŽñðžf'>wc\cõ½'°uð¬B0jŒ#¿	¾þÎ> ²1|ó“Ÿ¨FÐ†Ðô;…òfIš;æ{}‹$dq¬–Æ@Å¦_ÍDÐY›°Hr–e¶!‹)¸z•øôPkÇ“L²e¾iS']:¤Fq\À…ÌÁ•fG€4>%ôtì„GoNïzÙ°3
¢–èuÆD•ÈGØpL$*ø<ËéÙï°ZE!cÉü\ÖþÍ,ÅÄHš TA¢µTtT%hö©¼	žêÜZ,[ÛÆ OÍæVx%0R«kj7Œ©8gJÄÎa¥¤sÕõ1®±é'Â(ªU%]ö¬TÊf×þlrjý¯zŠlŠ@£0ùÃ*çA^pvaçÇËÎN~Lõ¿n÷ìäï½Knžüï{­“W¹à1xM†¡dpÚçAÓ¹ÞØC*)fª8:þhÇ&ú® ›…whWÝ8> ×û)iÑeú	]¶þÙÉ?DK8ò`é9"“ ºQLÛÃöÛj}Jf÷Què†Ù+\f¿7ãã;A6ÜG#/m=îÒ±-K©*¼ßÈúç_´R?{GÜ<ß=ü"WäÝ8„þ+¼6Àkò®ôƒ×w]þÜãWxU¾O‡×`Mþ¼¸ýõ]‘fšÑ+º&cªÈÒ3»&·_Øš¦Ø‰ÌyîåyŸÅÀ¼š+gCŸÅŒa×æéó]rEX¥!Ær=Ïû¶©ì®%mTS—Yõö…Ç×P]Ë-Œ†­ï³[ú(T²Y<å´Å×Jˆä[D¼Ï7^ùIÎËOÊc¬ü¬$‹¥æ#îé8Ôj÷  âúÓÏbÒƒÿ˜#oBþrröìsr÷ý}²‡¡7Nƒ.,öxŒd]éª·¨“iU±·fâPnmš¥3»›¤ZIM…”Óa|x÷@ÔCn½‘Êo­–¾º‰Ç-TâBâ_yK‹7§Iq²mÂ·,ƒeÊ¨yZš*ªÍ£k¶÷½d€Ã7+ÂáÆ“.c7õ™©úÜû<Ë2Mkd{wè?Iâ¨Š/=PJ€l?¹F¸ÙL:]W=ºÊ]\4Éðex¢þ¨Y[Eã˜Ì)8Âr$Ê²‹> eu]…¤Îš6*Î§!qg…ß¥'JÔ÷•R6: Á²Ñ©‚°lr"Ûžü4 ƒ€¥Ý|? ì“YK7ýçÂ—™ÅúeúqÕ•‹™›ŠŠ¯û>•¢ÁéÏŽšøO¹¤‰4Hó“ªÑÎVþK+·"Ê!|2^J'¼u~•®/NÆ»R3-¿“1Þa},!›§%Ý"šVÔ‹QÖ–"#!¦,‡\=/‹<ŸÂLœz+êŸŸ<E#¯ q"Ý<˜øžóùpÏ{pÚÜßës 8c÷ë³“Ï{øÃM‘²þŽ¸}.”Xµ ~b7dqæ…0a)ŽöPÆ„ýF"ì1ú’ioïìäSNyÏ?=ýœ„PºÊÆýðkÊÓS^vïAàË¼©o·qÃ_5
ì÷kþ?9:;ù8µ¿¦C=N"J‰Oüä(ñ£šþªÑ"ã†_“¢¸œ,ñbq÷Õ#C¼§†5tnŠ¼úi6œT‰‘ãgðØ½Ö·ï=ÿçÅaÃzYôi ™¤›qtßâGXU¦õ6lû+GÀwNCúñëu¶7§E_Zðl¬t¾ß÷½ò#f®´TmgÝ}DévÀÚo°Th¶éø³œšk¹©w‡¥„ÓgNZ4®#«h£Üc´¤ƒ01Ön“öÝƒ@}©ìŠïêâª³kúVâ›2e5^T{^Ë—mº,Wƒâ½%ž 'õóWüûŠ÷¢§Œ¡„ú ½¹f¤¤P¬»uúF5Á’ê¦©Ï}H£„Òx´…€SvÃ‚¹³½'•á»::Ôe¶6)Î»ôÈ?fÎ=€Î4â^QY>„µÏû•\òÉØ²DŽnOŒ'ŒÔ	B¤Y›.bnÉe–bãlO{ÎÈo,åØË¯«Ÿë7‚­ yéDÓ•4Æ$7„Vj€—ð†I|huš[*…—°¬y}‡.|oî_XêM[TË`ïH% z½”WÐ€ö¹¦&oÀ² ª¶µõè™¶‚ôz0¸8ú²×ƒÌI,>^­ëÎå­C”èkTœ/¾\wd½I€®ÔËFAJ	peA~ðV)ÙÇSNP \T¾1	nRÞ›ù,ŸÌïQrëœYÃOn÷SHÌÜ‚UÚØO¼tX$æ©«”«¯1®þÝÓ/½ÜÀŠi´96°±s{vGƒe‡‚dÒƒ¹ô–“/åõ0l°š ƒÌe¯‡T®Ý‡¹èÑ8Õ¥¤Üç°ŠÏg^.§Ð
¨œ™(l[vÇ>Ìšq<ì[W~×ýøÐ¾#ò¦Ô™|°Yrƒ<žqo{¥¸ßÊ3ÿtŒèGp)%NiäÒioè÷ºñÓfõNsTäj¥Rw,ëÏÁÛ”B§Ky¿cÛ6ùU
ù-]"xLJ@Œs	YTB*)!¨ÅGÅ5z0‚˜@Us8&~H5ª™;~ð×óg£+d·W¬ÁÒf°ö%ÇkM’4NÚã8`R^%ìqSõh'Ûz('Ì4xÛƒXÎqâ?aõS¦Pòd‹,
ˆ§ÅeÊýàºEà®ýž‘xqÐ7û¦¸“ï¥½E +¡G_”°Žíx¤ÍÂãf»)*‘²%Œ¶¯'T´þh\9”01Êm7Õ8-&(²z-)GBÁ¶Q|ÛkHA÷æñÓ€ÎgÀL…C/øšŽŒWs:*0DlTTÞôÒ…ª¨Á_2*¡¹ÈË§(Žma#'qÇ+EK¹‰ÇúHºb¾ðŒ²¥D¯)é©Å§¨½2\ýËÂŸ«c€ú¹Âªçe4lWr]Ìe*vö‡^L2:»¨ÅMµUjÆ¬þòaÝˆûGæ®¸IÂòlmÏ5E£½÷«ª-ÿîÍ›×áU¯3IýäÖÈB¶ÿá]ÐòB[ÙãNJÙ’ßZ]&›«Öû@¯jõ–IÐºäª]XØxEBÐÄŽe4šª*D½pBÙT‹élFF ‹¬lpÎ(ïs×ë6~ÁšÊè 3†âÂÎ”> ùY;‹-Ú{>éA7Â=´4Ì`k˜“µÁboPƒ×3“Qá|f­~ŸÍ:¼^f¶œÒßÐº`íŸò‚A Ì:å}òØoÐ¦ŒUÜáªG¶«l8z˜ëlQƒb)>UDlìÈµåz•Úr=¹¶ºÜ¶2«<QÔÀêÉ5°zMk`¡)3oá¼lÂzšRSçoZöËk„/5M½Çþ;(²W‚@Øùqq©¬ßtáÓ%Ire[• ]OEo‡äwÎ<¸y—WøtA¾˜ð§+2¡’ý:…¼¨Íùãì¤‡¿Î;Ì/ÎîÖ,m;ùäaÐv=–¡3ï"HO“€‡ÚS™‘ÏgSÝ¶ø<¨åý³ƒæÚ~Q›ï¼ˆØcî’a[ápZ»•“IQ¿D;%@kT·/ó¤nîE—ìk2$·œ¬o-ï¼†Gíž¶Ðƒf%X–š•@–XzQT„áÐ½ÎHÂ@Œ!¶pU†Ýd¼‚¢§¥¤àoÅ€XIc°ÉZƒËþ¢~
J,5”Þ+õ2)y…<clØ$Î;»x%òuÊÀk5Å*5(ì83Öì‹lV¢ÌÑ» 	—`ÛÕWsßþ`f}Wä¾ Y—s!jÓ.¥Á¼Ài×ŒBJg€<yƒ%T¦Â>Çç©F\”æ‹.V¦Ì¯i´ªˆuXXí:J3X_Êã¦Õ0+‰²ë€SŽ6Í‘(¸"[~ás ”Ms¦í›/ûÈµúàƒ)@¿!UH>µ¹ÑE…Êé½F´ŸwÒqd-*-uÇo-fáõ¥Î_ÄAÔZ\Yd2Ôâ1i«û•/Óÿ  ÿÿì}ýoÇ•à¿R&|á0ÑÌ”(K<}@¢>Ï­)¯÷ÃnÎ49½œ™w÷ˆdÉå‡½½Åbmì.vƒ`‘8>_°Ù	â[,""·?PðÿÁûK®Þ«êîúîêá”dM‹3]]¯^½zßOížÿZ·ó3DJqöZPÌä8hÎ²„DV$!G<VIa†dà²|Õ=ï‚9,,j¹byS®{àp¯¾ )<Øcç½šÃ5gw!@C¦ãM?¤«ÒSNEx&[†ýLX]ãttA&åŽglWæÓd1CµT6yXÑm¹—“ˆ?C„ì°Ò* ¤dí¥QLˆV(“-ð:32^`'LV Åž·«GÑã¡âªQâïPPtÇÞ™“zDIÞL©vÙêÑIÎ¨¸»“ão&6£znøÚqaªÄ'#HÈ AÃ×9ò¬N!¦8Y&£€Þœwúqé*Nz±b0_£ýýV{ë½Fç«~®ÎH€ÓËD9‰þì{šŸà#ŸÕûÝÆpÜï{¿¿ï}÷LÎ(×|€pºæ…:uÂ*#+”öÇ@;ÁµEw2À¬(>8M0ø³
^W<vùòP‡Ò¹†‡€ªÊÓÂ]¬T¡j;ÊÈÃ{£pX¤ódEÒzWéL ¸EØ³¡¢ÄŸþz¾y¿;²ûl%¦ì®,O%æ¬|Ù‘¸;eõ2ÇFð:ƒàæ‚&ÑšKÅø©°³~RlÒŒ‰˜õ‚=®¿©QüÌTáðtYGgâ‹S£uèß0éýÂ.É†``Ë• w‰ì¥ÀÎžÌå#.ž>JÏŸIwÚ¨ÅY–\{rFË×Q£Î-jèœl[êoÌ´Ëz‰é§#Wû`Ò‘Cb=+scû+Ê‚YÜ_Ã«Žr,,Ð›xa~_ã¸âh¯¹°¨y®°L.‡_Cº¥ß‘>»³¥höéÁÑžá¤Ò…õ™è†2Þ8Îä¢#}©JÍ5¯Pè­V­“ÙÉ%º‘ô}džr¥›“µ\?£,¶¾|b."*ª´BéÕ”¡2ewLEÊFÐ¡ÌPgœ$Hié7ò=Ò€ï¹MÍ¹sdÞT1c¹OR¥vÍÛp_Hš« ­ôqÁ­²ÒÈé)•|y7z»§ôT€©œeº!WÉ‰€«šÓ¦c×ˆ¹«G¯ciùpÍ‘$ÌÆÉ4…¾Ï+ª^åýáÚ"h¹§Lu‡|p¯ZñÌ-IpB²~½XQøõ¢^ø~òd²òaëyyûUT\…»ê*k‚ó—ß8ç÷¯Mñ.çmØkkfY×ôÖqRUü¤ó”ÒôpRi1²ðjA1£Û››Q'
‡=B›*uŒ®osëÂÌ`›^‹ÅK’ÌaËŒô,ÀÜ'Ð?†ÒÉ]Ìš˜ž+µ¾hò0[”çÑ@Ç(Zz•û2™ ‡Å“—èO¹ÜBäém@GAà?úÓxhÐ9åŽ¯†GzœgºúŒÿajñ0îÂsúñý‚ÑÂNŠo¦¶ß­à_ý9X6®>ƒÿšŸ=JâÍ4iÂ½e/H…É JÁi`!|U[×Á^K­Üêº'ö&¸ÍafFÜ¢¨åa7ƒ.þ›ö#ü£¹™ÄÊZSsÐ¼Pû^b%sU®ZÅúbh3Âët–¸Òk¬${d<¶pDÊz%°b,éK9ƒ7È »\d£;+q±½E¥h1oÝ¢½BoU®3¯ j[Aë+w(Öi¦ˆº{=úM?i‘¹yÑzç5O¨²WÖŽf¾9îÂ ù#™\ÀÌ-,Ä<ÀdÀcç®´{ç­3°¦òS:¥¼7ÈšöÖTzÂDl0›’`”rqÂäbHJ<"O!IÍ¼‚îZ/3k6@GV>[¦I»wQk	o¥úobu¼æfdãµÝð|Šßé†"F½W³µñ=ËYn7U‹žç£](p½GEpÁ‰XNKŠÈd¯J'çÈ´d {Û.T$Ò1â‹pðK×ÉlqêÅ3õŽxº…5¸úÊ=âK!QÐCrGa—m}í[B7¬§©ÄÚ§ã Qå5Â*Æ¼úºx<,Ø¿áÊz
8ÉÊo6S8¤¯8fJK™~¦˜Zò¥DP¸ÊÖF	xÃ‚ë#é‹Ï |ìÙ8:ø©D«kcª…†Û(ø3Y±©1¯PÞ4QÖ´ZYzøT³Ä¬ÕÚ˜"gÑ´üfkïb£ù¸Þ¬4|\ì2|Ü¢ö0Œ>‡ë¬ðÅÜÚG\OnÑsI›ñ?Ì­‚b3hKá‹¹õf4ú7ÄWÔ_ì0xŒ®æ¡¶Î•aÃòoËL0Xqeœ$ æÁ‹ùwó;T8|$Û!ØÒSÜ»úLûÉü&“äîPÄ›rx;Iâ$—ïä_}f‹n€ê”ñGFÞÀ1£s”`oþÝÜ½/î[º±>rÏFhÈ¤ZtËIWÎÍÒiU×®i¯­¬½Ÿïé™¹¯~ÜÙþkjc Îôö#™Ò}g%œ^y¥M…£]…gµÒÔ½Š1ôþnfq3!(ñqE„þÆÓˆPý¢VA–7tÙ—¦,—ºÒ2Wå*2ˆx”R<¾¦ËKó§²¢³EX…›}IVkÖt…8IÎ™‚)È –k%gÀgëIñ¹.–æìb"-2cíKóL4e^×‹»UÉ#îÑe qïs0òA²FXXü¤eœÚcé÷ ñ_Ë¦^I¤E°ø»múCV@Cd¼Ž~ÐžŸ1l‘{‡¿ Ã,ïEÒ?üj¾`0þytÈ/iÏ½ÃÿC[R–£wŽôð­ó8øÏiãÞ….¿b-a‚-çXSîWz#Xä¤gýAfÌ‰¶[·ÜuNM`G7è	é&ñB¢høÞCÂñ+^C…ó¢o9JH°ÙÄP8ÿø-Ï]ì>dªe4	)Ï=åå¥{´ëÂ9Z7Åq¤—#	6Ò¸?¦ÒF4„ó&ïKaðŠùóò¹Å5ñ(èDÙ^ó¥™kžYE¬«g ÉW*‡›ÏûèÕÆ•\Å¬»È*}0Ñ1ó²“Šu9–Í¨{4@rŽ7‰é)^¬)€!gã¶Ãp‡`\Ã+srž’öý°(*ÈURüQeÉª‚à1«å8™Ÿ	v'q×àöv•±`Ð?Ó—7£-®êF@¢ö™ÑÌqÒ7jŸùà:ùPªÝhEoÚ³X’4Ìù<«.{;[Q}MW•RqúGí »&¤Šˆ=ˆ†Û€YÅ<0\v¸eÃ­1Ü¡N­¬îåw:(¹8}õÊQ ª 
BŽœŠ–R-¦[é¹•àÐÁ{óöRF"†z¿ÜƒDg[-ÒË²QºÜnwãNÚbìy«èá.Ø…´Ým·Z­¹ª©ðˆ,L4ÇuvëO’~•§ –ª„ ¥- «¢Oe¿(C&\ÈZõ)QƒÖ§ËòÕ.¸ùÀv3ä@Á§Š¤vUFoºT¥tÄZk{ÃN—* ”Õ,¢Þ£§Ö÷U™’	<{ ( "L7)Pà”#ZBxé²J1ÊÊ'`¯¨cëdežÁJ§%R~“$ˆÈù­”2\„Õä¸Yx12°Þ¸ðQÀ'òBž¾Ã,rüÅg"_ÐÓíqÎ/ÐqJ {n&aÚ[Ù1”6«¹fAšn{S\oŸTí©]Á)¹+Øé˜µ•D]ÿ+*i´»\~]äfn1¨Y±È2nníŽ|7ìº™‹E9ó:v˜ÒErÀ„$ÏëUKnÀ$p²_2ç›æ_UyFP9ø~6¦=Êƒo7çyPþÌµ/)Ã§Vª1cƒ–~ˆyƒGIžˆ·>²y–*ð¹å¢žÿ®ÃþÊì–“zñ9¤ýÿ²S–…¦ÿÁÔÑH€E1Á™k37±¦Ô:#t.à¨.ª'PÏ0ÆŸAµñ²fò©6n÷@ë·e=ÆØtè¸O£pgÎ¥Uðd¨nð“KL^<L¦hÊ­Ãç²ÈõM‚jJ@g¦¿Bþ½ÈËë1Ámëèàó‰?É
6‹jŸÿ'¾ˆá÷_`î<Pô½,ošE˜kéùå³ŽþrH’Ã£ÿ‡ñA˜ÿ*;Yu>v_…Ž2Ö1Æ„$ìÊ0èA…Äj 3î•…BC9­ –I>ˆBºAPÌÍ³¡å³a®šc?ä2»±z—<¸ø?WÉ»GÏÿïº‡Ò# ½$Ü¼*yŸ0áåêÌÇô¼·g½J¯Îãxé”‡1}#L’0™qÑTÆ{ÃôÐˆÙ€\&‡1fƒ­ :Ò¼Ý|{—Ž9úQ+.0Å]	N7¿v¥Lˆí&ëM¥áÖüLÔUœ›öwÉã°C_M±Ê+TYÉµÐñõ;¢Âþ-m?ý^×räCµ¯ô.è)rmÑ%»¶ˆBl2³RÎÄß4YJv% }ÊVxª›Õ˜AÎ]0È¹E/þýRYoÍ’n¿"¤<Œ
yDv?cyÚÃîê:G·¼†'éþa¸Uµ4Ÿp†+íÞ…ŠFë—É!3§+ë‡¿m°B•Ë+þä¡ˆ1½™ †r³Kap[q¥
±Ó4T-ù:Þ.r[]7lpÃLf™?`¦L2]ÍÿXí2é%®¬…AåƒAn†é‡›±‰‘s,Ô5‹Úxj­¢¸¯ˆ€Â†A•÷ÊÞ¸b0¿YØ2'(Yúò>êª%ÅÖ¨ß¼LFIóî(H/;•„5”I[x¡ºÔEå&)òL³äô¼?VËª³U©©ØÇ„§ˆ(š£ª=&¿4™1@òtÖÌ«¼r|/ÝÏ½‘ìk­TçZÜ¯‘Œhû¨šÜŽ±å§R_4Á Ú8.ß-<ðÝ­í¤Ð“˜P16§"• <ÐÄ6—(Gó"Aÿ]U5Ú¨|§šYXš—#6Š}]*ÒVûÙ•÷`;ð»pmt0k¶•Uªœþ`ƒ®7×oÐ;Õ	ûÜÞµ—(æ_:~Ñ3`—tñÝÄJlbS1SAç›/ çÍÏ%FNŒ¡üÉÒ1ù]‘É.z:'tÑ)ƒX’AÐçYé÷Çàìò.èÿvdô¶AÃ™¦J3èæ@m
ƒ3ÎŸg5ôkâ¼g4-w¡H+”_²·)Oöóˆk9ÄM šì„)Å×*†f{VŸëK‹øõFÙÞäÄHÏ°!Rfû½¦SíåeÀÕB€2%~—óWÀxîé«=Á³jÔ;ü#W[==:øYÄ<¾¶{X>¾dÕ*¶§`üØ»»€êgÒTày“h%²\’§”Vp@ô°ü ‡XÝ?:ø›Ž¼Îêk×«P- 2±K¶bÊoÆôò£KS†8È(ØÁÎZë|4¦÷ÊPž:š–Ð?§;š1·¹¨åËåvß<ûŠÅô¬#ë%k¤qõŠ=©z…r9ëÞ¦ž^i¹æá
‹ª¹öðèùé5²H6AÍZ` ÕWô¤Fð´Ó3¥qrøED¶ÿ…òN`|Â¿”–Óe…¿úô=?GÏÿ½Ãû çý·’Ï`­mfåhßË'ÃGò´ãzåyrú¿¹U#%iTòîJ"Jî .%¨DXøùòUi²yEX/øg½3oõ1¯ùÕF®D3T3÷dXú†pÓ#ó°°ªbº ­@v§×ü"?æ­î$q¿¿$Í¬ó"Å[I°AXìö²ðÓø€Š™®+fáqŽTúÇ:G'/Q!"Ÿ{¦Ã‡ß}Ô3b?¬«Ía’ÃÎöJ°óäà·¢zÿHâ[¿£¨j*Ê¹è)xuøç µÔÖ]¸àpãYÝC±iöQäÐ@€c±°m~¸8Úýxþã%úß&ü™lmùsø¿ÖüÒÜGÅ1‘µ(œ„äšôIåçÞáVïúÂÈ¯(°øyöÞ„cA¡ì´¡HÊÎä*s+òb›ÛÀSmc©ÍÙ¨ûqïÌÖè+çöYß÷jæÂÌ³E)T	Oa2Ä‚áw¢°Ïü†‹®ýÓY–½>Jâ¿ }²?(Ðh7Â\'éñ!%5{Ø%þ5y‡5²•ßªïúK3õÊA/~Œ9)×ã-¸(øåq,?b´9ÒÙx"ñÞ›éþ£”´+ Ø|ñç]teIÓ¼-°è~‰
9h\èÒ·èÍ=r…YÛ>Å)`±Ô%ë¼$³/—sÎ–þFoBˆV"¦é…ê
¯6}öéŒsô.jëª´ìèëìþ$+kð£Èk}PÐAQabÆ0ÞI‚Ž5ˆ†X‚1¼8Ä"û¶‘„Ávsh]íVÔ™T?þŸ}öâ²Åø-ÁYHñ‹Ï¿£ŽoBe"S\ø2 ^AGï…'Ž¢FÇcÐ4*Ó…Ù‰ûqRçv-?Ï„óRŒæv×ÜÂ y°’cœJvf'î‘å¸xJ%Ÿ'#™ëQb±;!È'ºVª]ñãŸrÞ>÷[ñÎðŒf?Á[“¯øÊ„r;OF†õ¢{ˆ€¶ç…1·ó_J`øÍŸNÚw©_Ø˜é-Ï¬Êâ+µYWøÔ`’ö½SBû¥È•Z3ùÊ_så–?ÏFÁV4„(¶RkŒ\r‚_Î‘ä~w·£Ì˜OF»SJ¼SÊ€VH.æÞwj³¨¥Y!3e i±› 0ªÅ¥š¤Ö’ƒ:o¸tLÉå$ÞÊ.BhûüRµÑ7ÿÔ9æL¶2IUüŠv9=Ù«q\Ì¼®½0©½ Eû,a€ä{ä|-RèÃT^8bÇlóSÛ¡sx\?è™e«û°èô£:ãIHµ' ×æ]² _&Óóröë‡F‘šýN$1K‡«öezL©Y–m¥}‚[œ–Å²>§Á–§Ó¯	1RlõD“$jZ<ÑÕYíäøöÂüìdSXÎÀ„<.]‚ÑªyÙ4é	ç¨&0ÃŠó¥äj´ù¸p	ˆx]©¶¾\[_²Ïü4×kBJ\‹Oôç…yr‹5¦â7	2Zã)ØÊ|}¶œ€{ù#ÆÜ‚¸üä>Åd,~öéÑfæä·Ò(Óôå‚µ­»ŽL9uŠßóÝ˜ã†JþMòÀ•gƒ¬×DÃ†Íåi3º%!i’ÈœÏ¾­E?)Ó´àU‡¹ß4Ïj|þâÔkL;KÀF±J$éÑÁçµ—a÷eÏÇ([ÐY
ý;üNä´œˆîì×+n>EÅ*îÙê#ß°ŠWéÀ§màÏ·Tl>tR÷ùYÅ£$|
¿0Ô
vP‹þ' ®W0”åªŒ8?WßutøYêøÅc³Om›¶Å1ª´¿¢Ã“ì~LATéju‘*íª\­ÿ+ã/ðCáˆ³OÚäV	ah`Éˆ(ƒÑç¾ô§¥Þ¢½¥ÉbÏü}ï%?CkÁxjÇgŠ\“íñd	¤œÕIòúm°	K‘˜ê4¤ã¨O¿JØ\£a=´æ.Öò›šL«–‡|XÆ¿X_ðãðÓqˆ¥R”Lå=&Íˆ;=ü%q'LÓæ`ûpDÜZ¼æk“£ÊôWÞ£ñpëìÏÆ7¯ÿV=nMùçüû•ö ˆ†€@8|o¸SÚ®y,#° ^á¿Ä,p/Þ)[ïóº=E44RT®í6y”€JâFâÆˆ6!Q5œ#zRI4ìÄƒ”I-Þ²eo	Çízò`w@·,?ÉkçUÍJ¡Ÿ^¡kÒtÙôòbÕ[¾HCŽ?*¿rEÏ…Å%P‚çžæ¼©§V]÷õ°ô³ÎóQÅÞ¨¹h;ò%˜ícüá:”†ÖøJðTµéÖ ´bGGÿŠáÏ¿¾u¥-tgêV˜v’h„
-BÁ!«—!0=ŒêÍ0Å‹ÇÛ9ü‚{‡¿Ì=œé”~‡¹^ À8V»î|ï	pÕx“|Â,h¶íà”b2Çx¸6ÞDY‘L-xŠÇÄ£ºW=G~[[sÀ;OÌØËý;ô’™ÉO“ž¢«2(WÞ»G¥hŒóÉ¸“ùó_±Òâ¿rd<tÄG]a:ÆRÄ0/&ÒƒYàÄ„Ã¶ˆa9ÚnÑä ZÊ;,bržæYº-a·<ö8.¶F03Ž¦xã÷¤÷üâÊLPÎ kxhðS°0«ÓÁ¥Úˆõ(¢€lˆ¹ ŸBxCÇ…4kè¨Ãz‚›Q9`%ˆ²9´,ü:ë~=‰¶¶d‡íÉpÄš1‡Ãl‰.¯ ±²ƒˆÆöR[miÊÎe9äÓ–cÖhÑ7.àž“ÝÔkdÉ+Ý9Bª2,š3hƒn“ÒÞpeØª0·BìÚ­ÎR g(€ªLG ÇÿCTìe÷¯¡sŸ¼%¡¨¾îýÒ»á¸I”'lQ¹bD¹§QÀÊà¹ëŠ: ê“'Êòáè]ðÆ²÷Ïê½8æ–ûÊd°®FÖrþpv–•/Þ	“• s-ÊböÇÝ0m4Jh[Î¹ÙÐµ€æÖ>°åÝÏÂ³Dg­¨»_ì7ÎsÿZþG~ª¡¹…SsT Gž ê•µ×èÍÝ&²ÖÎ¶)jæ7¹§ó&N}kâyñTÛ0OÒœ"K)ñh;y~úYz(\§ðcê\¸“…`M.¦ô·ò¿ðMÅaÜî¹Û|
ÅÀ›Î·._2©|óû±È¥‡Üør&Mß•6°Ò’ø#ƒ,çÉ•=É–$Úµ0#ÜÍ&ÅTë±„S•x¥ôÅü=¡8Ž"çb1sËz2%‹ “E»à!Jq×îBFî.¤„?:½˜råna¢X*eôóé]Ï)UlÓ…¶kœ;Á„JÅ0È Á„*²¿`f™±×"+ÒŒáË0³ÃÛm÷ 	¦M,µ
X +k;€8ôV…¸fÖ4ºC¥)k*|oÆ3ÒB{‘°<d÷ð‡<ULe~%…eÑÙv{&%|`Yô×d>Å”iœ_T¼~˜Íø‘G®¶mõœë¹ÈóøÒó,x¤Ð¶ì±èSn©Ê‰Ù ‹ù®ê¾‹E•7mùÅ8Â‹qäu1J`ñe"uÙX\>r
#äœ¦e¶NŒ}¦ÿWB„$5,¾ñW"3†±»Œ:P{i#Þ5`ûPAþÙ' œæÛlVÿ&=XZ–°¹Öq`hcqba—#ÞýnJé£ñå^Á4¬L€&“Û½ò@YÈç|
sN¯RP=ÚgX˜ô>¤Gþ>G`ª9–öIØOÃiŒ	ÿæxuáú_ð3Gh¹¦`y²o~`beU”Š2†ú
J„ ×6ØË­°c¼ïN2 =ú íhÐwÙå‰çºL*„wÑìþœ+HÃ¥É0ó©ªÅVk¦ÿÀî¹;è½¥PÎ:j¶nƒaÙÂ»46Šcsû ãûÕž…IãÃÈñív>tF+3QŽ\à¦,÷0Èp.ÃyÞ‹–üÞS€ª/#çT8Öa0o…`±ÈÙJ¬ï®–^<&{—½ZÁdZšÖ´\LÌejÇ'¡7ËE{IUºÑÐXÑ5©I°vp>Ò~ï~Uñ~l«2þMdX11˜”–ž³°0ç4ó4(œ}^èÞ™?¾®Þ÷0wžúx`ÆÚn3aG˜èst¥ßüž>’Yk™GÖúéþa(
XØ¬eT}.Y<R¹VNn°¨*ÎzÇŒÈuHN1äûMÆ(–
cuØÇÙ¿¦"ÖT©ûÄàn?Þú¹À‰òæ:åšª){‘¿w#M£­*‚à~ãt¥Ï1f©ïþ†ž @oqdž‚¤	&¦¾Ø¿&zž‘Th·Ž0Ö&_Žo X8ƒÉ6ÐÇdãXWÛ´O²• Òþ BEÆöµJKCµ•áˆi•ÊtºªR“\…"Ï¬Ä30lSÁ‰ü|FÁÐHçù~éÄ<gÃ+Ë©¨)<«*te…Íªâ§²¨£´00fµ®Yu±¸4Õ…KyqŠê‹*ÆÙ«0ª”Þj®ÈØÂcÙ„—š^Jc©5Š.øi5jé5&ÑlHzu’(6¼T~ƒN¬ÙpYÐ,Ú‡eTÓpØqéøÚŽcë;`V‚¶c„žUŒ%¨Px8U°~K›4Â§§qrÔ§¢1Ì`_*¨`¸#5Ò_±bãCNW«¢™íüÄ(Y©ïøÛîôÎÐ„'òâËŒ‡>M;ž$pU›ó¤æ~V=é•7Æ½7Æ½7Æ½WÆ¸çÏŸ˜…(õËlßƒù®uOñe³íË;]†‹Æ
—ÒkjåÓ¸œ30öÕäHõƒ–†>dD'1óyp£Æ†oL|âTiâ“ØÎÂÒ¤àÌì|¯í4÷IJz#ì^b«ßä”§ŽÍ‘—S²øqªð$¥ ›„*À‹^TAiøšS2ÜÂÒé‚}ût‰„<vI& Ü´$á ˆúõè?Ó¬=k¤åÎ±Œ‹'uŽa”>ÇÂA¾9îoç§¹Ð<Õ;ÑÐëÁÓsÜùÂkÂ{ÑÑÁÇ6&î„Ïxq¨u.SHÅK 	j¯Ã/¡·ƒ¿^ÿ6w‚NÿØë£‰Úo~cF˜=Õt@zrÌ¼ø,àŒ*Ë–ÉŒŠŒ3ªhvò4æöæfÔ‰Âagob*SváMgŒ¯|[(M‘îŒIM¹	FjS¦«ë±‚™ŸŽé/d;¢ô¥He¾­dÈ„¿'IˆÊñÌ¤¨|~3È:=ERš¾T„‰Ó¤ýþät‰õA»ð&Kî7^wª´~ôü­“•£ç¿<r´þÞáVéÿDž…Å°Â¬Q%l(e[ñ NÊZuÈöÑÁ×Tìïaç?ðÂ¯:Ýr"øI‰MÒpºüÄétèæ5¹? "˜²,%âÊdRQÊ^aoTPKÓIŒõyýÊKóO{)—ñÙP(°þgA2„äX:²ÊŒèÛ‡‚D¶ÿåÂ…R±Ó£'÷„Ã,EÝ<M$ì†ApÂNÒAÞ…ÌL}:{F.0ù—˜»gJ§Û™·¹ ™à) 9L¶UKÝVÏÍÐçÕän8°E˜$çHÄÆh™Ý
›påRT“0`Éy©Xr^Q¼vC-ûkQ<vä*{]æ¯)jÌŠ©óGIØ„äùÙ¦6¶Çóúv¾—©C‹êb;Í‹‡/Êz+óÒ
–<£àIOMþÞF+œ1Ì}Ó­k¥£~”5f¿?œcû	Ôþé»K !–&êÙÿ÷£_’UzÃA®*L[¶<;g·-óZWF;ú÷ô@¸ƒº›ïä ç5´¡úÌµg0ü>Th7{Íö\Ë¼Á÷{¥ÑcüUçø³«M”™)ò:îB©	¨åNäˆ3éÒªæd-*a.Ì»ÀÒ;.ÁF5¸M•|sƒÌ)‰]6b€¨÷«2òóäƒ¾<O‘Yå~TÄ`%e °P¢F¤‘GCv¼TÀƒ§ÑVÅI«ÓF˜Ñ«µ“Ð¬ÓnÐ—öJiÖJÇÈ“Ù â“Ó 
þ½!IM•ñæ|kFé`_ß®¬Ä£=[%½AB¯p¸’×Š!°ßJ‰ÍfP/“-¹I3ãS°‘tµ_C5óT]=uƒIc]¡ö¾W¼«£ù™	†…Ãƒ7?wsõá¾^ô‘
%'É§§jöÒ‡no÷Æä)
gYÅ6Mõ8O/{%0}à¿:eõúK-åÙQõ$|k„„NfÅ›
‡·)þUÜìÓ xÌ”ëððš±6~…Åƒ`/¤²r]*!zƒœ±¼Wl”b¹¯¿¡F<={*¡{Ìœxm%Òþªq0·¬I–¦F„ÂËÞ´áq¸™„ioeÇFVzã=,dšÕˆ(ºÒ£ƒŸž€qýVDOÏ0Ó;D·;¾CªßÐ×3S°ÈÉ¨‰N$€4{Jº~ÛñÌ0@È@ôH·¥xhhfP|Tæ®• €oK`n§”7À(ÊKiL!Q º¶+ØuÍyRÏ></C1s­q÷èà8L+zÎ=ÄtÒø«¦xIsËPU2Hw£@iÕzÒêý¨ô£^—Â<ÕÍMÂü· ¡RæÅ`–›Ö`®7Y„;2¡?}ãð„Žq…aÊÓ/ÎÕþ53ƒýwõ¹yøã÷–)Ÿ/Ù…ÏØ5®œˆcìµ{OÃUNLfß?8ü»DÜ¿“÷gcš†É]fùûÞžlzû×Œ2XÝØNW5hvacÐ7JéªúðÛë¬¦¡èIzªñÁÌnjùC‡{Z~~_R·´ÉÈKA&ý¨‹£ùkF\œlÇÏ¡Ù#Þ°6Öã(Ž:Ö™3L~š”íÀ·½™µõkF¬,Ç™ØÌœl‘ïPÕlßR¦CAÑ“d9˜¢ÃÈp°GvCÕz¼TÌÆ$$¥ ‹>ÅÚø5#(N6ãì‰Š‰ÛšoX«qâtFéLØNnŽ»[a6=`¯zQ­ékF!þbòN÷ø¿øüÅOÀ-ýðOâÐ¡Ðo|ÇnËq²ƒ¼.‡^EÐ“:òlœ³‰ügcO.Nð÷½
½ýkê_²`\¶F‰ÂB'¾½²…†­')]ðÁÌòEþÐ!aäGù%•1&£4SäGhÍ_3:ã”4ÎŒÓp	e@­…Î¼>¬ÂÇ)"u¬3@¾»NXD6¹Ý²6÷¨®$·3öZ}0µ«G–¦Gò¯ZÄù¼¨	†Ñ âiFcŠH#n~C¾˜ÜCØ)§GVDçh!o_‡žó27g`Åø±D?’m¼³PÙîÅHà•Qïð·<<6M–õ|§ÆØµKóô°lÎJœfwâ„n8½ú¯-žñ:œ£7äìì¾)ýéÔ<-·’¨Kà?lRû{ŒªÝ.iû&LLÌÝZr‡éçaz*ö°<µ*"òÌ±F¨R|'ãÑ(L:AZÐÔNze% üe7HdT-£É¤#°Ä’…“õæ¡Û¢ôŠläØ«.Â¯>ï‰2¿i	‘U›2ð]Öòî.Éª¸ëGÿ
÷Ý/ö¬"®X	å	«Z’UÓê5/•åÙDâaly-÷½ÝÎ€â®e%Žt}së2¹tÈo©‡Ê‹eBiìyÎØ‘Ñ…Ö¿lÌuL×¥æ9ÎšK%Ï\ƒúëÿ1´e4>¥-ñLâ¥ßôÛÃî$[Î_›ê†Û+¢8i¤@§Nôðäþ½«P"ŸóCy¥1²ì)ÛOÉ]Ã %¿|6Sr[Ÿ74à;½ƒÈµ:†ú?‹²ÞJ<iƒ"Àzœ}XZjÚ¹róYbkÖ®Ž=h0|põR¿RÂÉnç•-Øf¢f£AŠ;^ýÍÖ5 FçØZÕÓË»©–Þ^võ·öÉ
jOÃd›[Ý×Ë»½\ùšíîÊÔö¶ª§cí,)…‘Øä[,­Zo¬î/“±Ð4Þ_}ñ™µJè‰l¹:{Ar?AlH©°ù8|ÍLU=„pvöãÄƒÃ?‘n|fD½j{WY2²¾c–æ‚U%.ãÇaÆCç^<¸öb%'^µÏ'W‘Å x›<\Tœ±nbz%c08¯Ì<‹Éì_“ÔW…Æá„Í! …šÈ/zY@”†¯™íCOñØC+@ç´«¥I£œÅ­¢CwäS…Š™'eÆ€QÎÆ¡FžÜßöv¦P[¿îÇües¥ øWd4èÂ·×BÁÓ“t¢À¡Ì.ì‘Ã‚Ý—Ô}bºR˜t}ÈŠµñkFUœŽgÅHøùMÄä¯„ÕWâÄ©<ÒéùI°ï@Àú’{iWRhìå–mlèsúùÑ¿¼ôtç#bË9~sŽ«	©;ã4‹MŠOq¿¿$§’ŽNÌ×Œ/ô·È »ÌD~5, cÍh¹vtðÛ@ô|xñYáÝ´:?,“ñ3Ÿm:­ŽÚÌ%é«1
óD·Œ²fcƒse)¸,‰P‡±Ý"¤)h`3`À†¢×Ö	%¦RÜ%`ÅyOI« ‡úšª\X¥¹ä`ôËsE7«tØä	-L‰®n›Ú©Rî)cŽÝ¥y=z¯¹°P¨¹Œ†éªüX9òX*×Iù«OÞÎk—?Fš}uŠóúæ­ÍhØm4FË$î!½‡ŠÊäêÕ«ÄôîÜõ¢à¹ÎbxÞõÈ§OþÊJÜåµÔ÷ç>ÎP…1ýU[€¤É^+y˜Lˆ>¼t‰SÝÂ90¾èYüŠÕ4pp	gôŽÛ#YL/bHH>ŠG@¬É@š;ÙJ­+ýA¶~¼;ÍÍqEXh^x'ØHãþ˜r»ýp3£ó‰,¢·Ð²Cÿ˜: ºÍÍ8	·0=º1µÀ–‡Šw*=ä[<¿õ5hýæ%:»ËöÆü¸sÔaK¶7ÔmOüc¯jê]GWï†{·âaÑWØ¢÷ìˆv7
¶PzhX_·Õ8·ú¯X0´½Kwj¤²”!8ÏUál´$?²–Iç)òð,7F	˜keñƒx'LV(¥nÌ•™þÒ¾Ï™Sêñ¤z#{R=aùeb½‘˜X¿Øp_¯ôg3'³gW£õäñÎ•9Qš‡²ñásWˆ/ú¾PÒiàÚ-V z‰Ïã)o+åªÕ’ð2ëÄi%,'´{ÒmœµsClxž?vgF„Ÿ\wžû1ID?~iÊÒ:e/'àŽàµJÖ½D|°Ò^<Lœ1DðŠÆÁcd…à)gVÊ ³‚½AkFýŒÏmÜƒsƒMDªqŒ±è`ÐgB0)¿tþ’À/²¾üüxTÓ©,´I3K‚!Ãç=üáÔX(ØQ*b†1ÉÐ§.>zþï28ü²O5JcUÂ*KÃ¼IX-¢¼L—‰`pTøÎw\¼Çª·s†`Íì ’Ãò5ÙJ ±aÅæšEùÇøY½DŽøÙw]è¦sB©E¯â (>åÌ·@øtJô¸Ó.òâLÖ989‰,AŽ³doÃ º,?Üš:ß¾x±ßŽ÷IÓž¹‹Sú”®†*
‡Ÿ%ÑÀ…wPôë­Oçò
YY2íy£Fæ#RÐNøÃ
†º’oÅcwG/èªŽlÜwJ8Ž´áð©J_ìâÈÄ]JýGôQKjEŸ4Dæ€²"ñ¹‡äc–ªÀÐáö&$î.SvC¸]Êe€pT’›æ «”6äÍ©HÔ¾XG*Rppµ}c¶J@ªZÿéÊGFVšÞ‰o16a¯<çºCõ”õ&Á¤>vŸ n×Æl§Ì¡¯ÖŒÁZí•Ë5ÊÊX>¶…P†1Œ»èZ*£ÿÌµ{¬ØF)«ª¦ãÄÇjl´\§…€T}sM÷ÞªqkMûÎšêuœûjŽûÚàžwž_½ÒÉE†‚b¥U-ŽÐqÀÞå¦3¡*0Ê;£ÞáÁÿåÈŠkVD4WËxÍT?«&›bMßm	¾?õÃî¦—ËômËËŒéŽ”^ÌÎ×Ó1^Ö½TLQÐÇØc[\¸!‡òŠ/8¡y‹Xô.8²¹Dë½Ã/†[:aÁ5tþZÓ5Üè¢!ä	0M–©³ÍÀXQâ\eÍ¾]*UÖì‡óRÍ_‘³ã©-ªFBþ+ÄüxHpž'ºL^|†Q1èÉ“þqÀêŸŽ¿€ÂÅÿB¾C²o~ÿé‘‰±²ê¼!‚š}=<zž¸Žeñ (ü+qé¬
:S}ÊÃ#„ µÖ¨R^ÓyôÁû™£}a^*Q®•Zg‘÷RAóIØÏ+.Nè¸9!6úqg›¼¯¾ø‰MË_ŒÇµýµ”zé4züúyÁòæìÜ‡óâÃ‚qés-Úèåÿœr[À_Åkôn5ÌEªØG154èl*õ^ŒÑëŒ“„Ò¾‡*¿—Ï½ážürÝ³ó³˜Ž„þëÒ~©×v×øäígt¾ûÍ·Ÿå“ÙÿÄ¡±ªÐLµË¦‚7F=¦Î(¸ä
«Å®BkVYNÃâÞz¯E«} ÿ<»‘$Á^k3‰g„±ªËda‘ìŸ#Ï‘QÉŠ¡¤I–È÷h+UQ³—¸51ÂJmÌ^RèbàO×Í^©0 8è¦BIP-ãÃÇu +Ø[µ™ÓYál‰!cGÎŽ.|Ä	É	R»?ŸÚÍ#µó!ÕtÍ&¢•ù€`Ý|Íi%ÃÇWZºN%"N´FAÓ5ÏÑsà6'½‚xO9@–e¼J¼ìâî#WU\ Úí2(.£´òF!„á#÷Ÿ,ó¤p¸’[…j°÷˜²—+œ‰&y»Æ­$ÄsÐhó¿ßýiŸÔþ',õ[Õâ=ï5z³9M–§tíYxÈü¾[°*.1YN$`ºsi¾uú[ ðžGÅ¸AQ ª»«bÔ1_Ca²E
QuËy¶±
uáú?s­‡ô“ÚMò	Žý¶áFÞÿ¤Œti§=íDªœ¢WC"7÷$âebš¦}n¶$l¦ŸÍZk¢/©VZ£Œ[¥’M¢ÄÊ•F¶[Ó¢â%œiœ4‡qÖúýx‡•ÅzÒŸ†6ï†'ƒKþ(¤ñ©%:I*vlMèc÷Ô‘‰>Mb#âÎ©ßåu<bÍ 
Rõ‚bŽá†M¥”'tËƒìXY÷¹Ö•¶Qo:jLèYjÜÅìí¥‚Ô™9Çß'Íž±Ð™b¥*ñ„\7-3s2A¯Ì7·}{óÕí£[š)%KéoÎ|¨^ÅGé|…‡’Ð~õâsó‰<ffÅé¢(‘âôf®­ä©‡[xð˜ªôAØ÷Ã$ÚŒÂît×§W¨%þâW'ú–[ñN…ë”çr¢¸|‚±€ìA§®T3Ä]¥Nj¾Þ±×%Ñ”D¯C„j™W9­^|Î’n ýWÃžûÙj‘ÆÆÑóßedc|tðÓÎœ=Ñ•tVjä¹º­¿wl{-ÂqáØ§Ëâ¯KÅ¯ +ç¹}`-+K}û¯ë‡Sˆš7Å|Ož˜«¼.²rtÅ˜’‹Ô—“Ð¢8,éåHžHý.ˆÞaö¬¹W ½¥©0Ëº¡ö§[•À?¯ÓÐµ~DNmaó/>“ÉÊªZp¨ä[•Í>fè¼+^~½Ç*ôÄÂˆ–¸÷ÜÝ‹…ZÕ$ùfEÐdß¼Ø¦?/üù,@ô*=]ºè'Õ0hS™þpƒ\%¬êü‡Æðoî=©uªhºÐ=m£pOŽû}¹EÏh»£1¸ßäïèe?/yˆ–÷EÍô^*œA_V«‘ù®„îÜ$4î0e¦ —poVc±>ß)úÌ’ñ°¹á¯‰õyÈæý.*£7ÄR¥‚ª–À>¥Å£“n›	èB²Å©Bb}q­t(úu«)&[·8¶PŠc1êƒ2MXgìAÖ\`TU3‰Õ¥T²ÃUñEz²|<pªª£B4@é½5;A?Ìûôºpµ)£ýEOl=5	£äNåˆizA{®²•r'|Ü²§B]ò!|¼$Ïõút4­5a“Xâ¼­q†¶¤g¡‰Á_Ö£1±ü
Ÿf‘ñØÒ,ýd:ŽÚ	J¶ðá‡T9Vù>ºŒ{Ãô¶WYç!<1>Ç¨ö"±•ûs1{Ê"±Y:;ílÕ\4'£	Çbâ9™OC@~m%,åDÃÙëž„­}„æÉNY•dN—ˆ‡›I˜öVv|ÞIä»G¿#}¬ž7¹ ¬Î¥"'e1x†™ 7(ô(ß	õÍŠD–ÌÓâB™Æ2…œªÊã¥2¶2ACöÊôè9HÑ¢>èèùWüô¥0;XÔ¶$`™ÅùÅ‹Íù3 A‚~ùK3¯P~KÛ	8um<9×.'	ÎzÅj!ãîÑÁoár6eÝÍQò$3ïò)bFo$h÷XŠ´’”±v~”ÌÖ¶&!Ó“•LJÈDç˜J}ŸNÕîDýðÉÈFÒ8Ç%±é'Å™™­Õ|”LDÅ~=$›tÞäön'ì·WÖÞÏs•9‡·ÉÝ8†<Âk½¢¢ŸàÿŽb*RDqQ'Ÿ3gù/úd½¬vuô™b4ŠyÞ^R}oÊ(óÊÐ3—¿Áï#O`ªy™]†±ØváNŽžÿëØìŒ¡÷š‡u–!dg‹GLûé[a'¿¢»Šá]Ãv{¨#ï‹ÏŸÓ–¶Ù˜¹\+O£à©Öª”@™~tóˆáÁ¨……B‚3èÞÑôòG‹"µ/SˆÀÝïRS«+ù´äÓ~Êó`WÜ4È.«Çx7é “Ÿ¯S™œtÃÍ`Üg^Í½éFÍÈ“€ySµäôA”JDÆyP½ 7F¡†Ê¶²£ šÁ†1¯’;y?µLPÀ÷ÈnÍÓŒŽy5À¤Ó-hz¨ÒmS×Fr²½N»±…`Ûy§ “¤M(¥4Hv üÀ3Nú/7t ý¯‚Œx?Ôƒ
{ˆ©>1!pÎØp«0™xXK&RIá/¥Õ¯ÔÚ£„>•ÂN9ÔÉ¨7Oø†ôU¤¦Ön?Ý=GZôé$ªW)ÌFÇPÀ2XZšN8¢äfwŽÍþkm¯êX%Nž«"Uä ÙK]­|å^«£¯4„ò²ò[î–u|‡"öösÕÆ¿vóßò‰tá]Í³oÅ†/ræÖZ¼pÊ7„;‹]LJc™×Rî ‰bôŸŸ$ý:¹$
%q4¤,}³¼mÁìcg½ø×2—+MŒKY@‚a4€ýKGÑPM"äÊçW;…¿78#i–èª¦^	“5szœ:…Jù'DhREZù0ÌK@s|WQ?E/ÞË²QºÜnwãNÚÚÂ	¶:ñ Ž("
SMÛÝ¶¹’aþáªpæI€Ë£Çª^Æ›Ò»þ©'IÏQIUIsŽÞµ8‘—n‚;I< ÈØßvÝ@ª~øCò–/˜eÐ\‘*ÈjŸ"•g‹w©Ü)°Â¥ÉÆ2°²YÖtÝJò˜x!’<ä¾–ÉŒ®\0¦“Å3ÊåÓz9ëR@öÈßÙ¯BO¸Õ‹ÓÌ¬%´h—r%¡ÄD•Û™	ÈfíÅg‡_CØòÉ”´ÂÚ—õôj>Õ«Ì-ÏL§V£Í4jî=ÿú¨Óò½ªº4î„¯kÒðÁ©èÑp¤©hÑøb^U_Za QõgE…l+y£;{5ug}~£9›*lÞèÍÞèÍ¦¤7C^®¶ÖŒ•d|tfù5S¶/Cõ$}YÎYLC[ÆŠÍ*º2üñÕ×”A§oôd~­ßèÉNDOÖ¡Çi2-ÙŠðæë¦#C"3¡†¬ P óïQ§£+ÖòJéÅ\'ð¨,A4¶fCÍï2ÚÈÎ¤lÆ&xÈk±Wƒ#¬q îŒ$ôé1G‡iÊHíæ)w,Á„ùçÞá—(?ÿr€nŠ1ãçx| Ï:’;F®ô¢ <$’—ûP6n¢Ç#º7ÌÕ±öeÃAâ`ú3+ä½æ¸.–
ZÀÃ¿éˆ¨Ò²`‚Ag0uý¨ücÍ,1ø+ç€Ó6ä»äÁ7¿“Ã?-“u Ú­¢öñ:Ö>†*ÇÜ1uÔCA)ÿlòøÏ"U…ñ¥ÍÖ Úêô;ì‘]CEu	¬'«¶F?{ðíÍÍ¨…ÃÎ«lîUÒ¼|É£¬¹±ñii‡QŒƒ –Û¡ôKî1dútL‘íXîÜR”<£Ø)¡¼Utã€þ"•ó·¹ÉÓ2”ð¹nŽ%M<$Î‹¸KsLàÔ´· ³%6¾·nþP^~N:ô$ÃÆXx[¸D&1˜N¿ð9§7wJ0­ýÐ  êAA«Ú[U¼^U‚‰	€sQCîï¯Þ²¦âq‚£mÀ±„7J0{>‡Fæ¶lüEpe>Èï·Ú[˜²6,E©+3r˜ÈÕIøùk3`¬ø“Q—Þ­å$†ÃuÏ±•ßŠ»†7oÖöx’¶S¸Jn…ý²ë•—	kç}8š×¼P¦‹”„Î|úé¾ÑHòK×%wÇÙh-i÷ðë`ró¢:~Eø&Dôˆ×$O£Q^CÅ>¬Çlgì˜±qqi]7.ïx¡@Ç¡v<«C	Š±@½’ŒQ‹¯§¦Xæö3eø"5ñœ½üÖþþ5ÛNŠBpß‘Pø¹!xSGózâ”³ú0Ž¿|ßéÀbX ZÁ&§÷mzÈhÛ½
xþ¨OÇ%¹‹Y8© APhÀJ—óï-rO”¤1(‘ô·Ø+V=Î™ì6«†Œ	7Pâ‡n3x˜‡5öY1x	¡Ôùæàµ~nÇ§ÉC_,xè‹ž<´®7ž¾ØZIŠúfgƒÍ,Ž"B"t5­²¦ŸðJ3éÔ)ÛµÉ’ùÈ`ºS&pÝÂ/÷l*äZZ\·ö6OÌWrpu©!1Ÿöž.Ú¨¸-»2ŽnÊ&`W.KH½`|2ˆ†@…6E×`—‹ÉÕØ•Ø>{cRËÙ{@<ÕÆrzjH•oS!›•€5•z–C/¨òÐËB:F\yWèV;…Nu¦¾þtFÕ‡jšPŸÌ£Ö\A•Sš¨Žš_…{è˜ÓS-mŸæÝ²ùHi­Ä‚š|3…Ê€¥ƒ•Bé…?o¬i¢-KL_Nï¢{ÌÇ0“§™1öÙ'£æ¥zEº¯nöÂ®”QNÔ=c¢ ®fH"Ï\-ÈÛæ#©ÚØÕÃ:ë"ò³p8òµ4ß>_´Ê|ÖäLí2³ûŸhqûW"—†ÇâR8‚po³ˆH°£n7ÚDÝ«3%1lŽGàIghgv%)¡ªS¯
J\¡¢€é#¤õÛËý;qâ7mãTÏ8iðpµÓ£VÌ¢È£—3˜eåN>Q—¥>k¯ÆÂ–;e=¹dQâØ¼vÍh}ZKPª|,…€€¿¢ÿ’@MøÁãØdˆŸB2;Ê#Ì‹gÿ­¤ÍòÎZið—W|‰.ø’ÅÌh1–ø¤šE4Fš|¤¦øºœs6˜ýÎŽ2r"Iiµ{€¥þjÈ­\ÁAe¼Ù}›¥Ðî_,ø—SÙêéfÐkøk°^€®h‰Ç.ŠPð—U†+í¾ÎÕWúÍÚ Å€=j.U±õ;¿wÁWb*ÏéÃùÖb8øÈ[éçVû~š<;¯ü½Ã_!ÏÎ¯Æt{|=Ù32±ƒ²Ýý¢âyÎ8Ã™k²1·C™ÓL±Û
fW’Aú˜¿d<Þç‘¥¬Çä5V…l
?7Ð­˜‹¬xø9 d*®kb¸XÂL±¡`Ï7‚2³åÀZ$_¼Šv’`äLH_î@µxš‹îŠ”—é^)F#c¿!PRØÀg0¦:‹Áó’’ö±ï²ó²¡®p½Z¨ªZ–ÏaJî4‘Æö³‡Õ’ Ûg@L¿«*TËX"zÔJgšÏ#’Æ‡_d-Fïe-+ªaËN¢’UÎ×cŒk >HÎÃî‰tŒª•© !OœúÜœcÑ~év%¥Ë(`EéX„”,‘X%«YÄcI/jð¯3U†·ñèˆ9eß¼¬d•>T.{ÜKàHÞS÷¢4‹³oXaÍÒ[Õ3b]¼„€—…½téiï#z­Ì@®M*”6™Ð¯º‚rÅnÿ’AJ7€Cç÷“žÞŸbòVtéîeÍ,nRÙ:‰¥z…þT¦@» %k¬Z©ê³ðíFo{]ì]R¶]œ×fî«œÇ°ð¿Ê<`f66G³Ïû"°]'Î˜é’PMF(¾ærO™¹-—9ÔËXï”åí0¯;ù°e Ì×dµLJ«¨¨3¢$Ø%îŒl^Â:^Q‡ÿý¡n˜\µLÄÚq¦O…±!Ê9?ð‹Ïiù¬AX–ÖÍ|'
Ç
ÇÚ¾V9Ûç®”Í“û$‚°ËŠ ÉØkã,&zâàw’¸ßßTÕ8PÄ÷è+O£p‡¬ƒ€"öÍxW ‰æÁ¥+²µÆkÜ‚x$x%,¥nÕ_ÎýçíÔUœ¨dC?gYÑJ¥~¢¥ÀÏE5zAýiDQñðë#Ë»‘,!W¯~ÆÀB`\EÕŸõM\GÛæã°C!zP¡äŠ¡…R„ÅÑæêN©	º$YxuG}›Aw+40‚Æ,0KózÚH-[¤®B¹¢&¬€I·
ž9 ”;hÍ9*uS~
nž•iNÌïkd.W4£Î”¾;ìR*"T-Þ|ÙP:[ªâlªœ-”ÛµLÆ¼bŽ ;h&ˆf¬$1Ì!îhrÚÔë
~1âòãq©ÈÙ9)‡6¤çHbº>.Éþæ*ß“ªë¬¬šÙæ$§Â	{«òu¢9^'ø·7<
“(î6L¸<`u±]ç|…ËÍ˜ŒÂ,‰:¨òÕ˜õ0äy/¾^¨ÁÎ—†m¬dn5)”²gç)£9á)SÈ”R Æ£Ò”c3Œ¶
Û%,¦ /I°1îIs8˜K²Ñ=cq&dºÞbE«à„ÌÏé¥«^|nÄ"_³Ò+·‡ ûgHªDI#¥£°›µ6›eŒ÷úMåØ¨üEå¦«f‚Fýp€$úFòµÒûæ÷IÿmVó:à»<IWß¦Ý]ïáÞnQ.…É‚5w¶¼‡Ê]z°‹VæÄ¼A$¤¯uodÀ ¦ÁfxC}Œ”¿h{ŽÌv»í‡Û{ôCîÝ[fçø-‡7ƒù²{m·öÊù¢_—ìª´VPúVmgü>•œ¯·úáp‹±óû\ñ€ÅNÑWÿX›áé•WóÚx£É‹”’Š-Ût†Put”„)(ÕûÚŒ”éxCH|#I‚½V”â¿FÄ,ÛÏÁî&9¤®‘y“X¡+ñÀèî[yAU7fu/£¾º{1b¯^G®¬Ù`÷ß¶±ÏOR­J°Éï‘×øÅgJ]^äç)zv2ÿ{®|hE(m÷¥.æŒ(n=„ni<ÞÕœÎúÑÁ?·–]Ïdyž¤“~¥‚Xsð?l}Gu­$UÈñ­š8ØŒà¨ÚÅA0j4è÷e÷Î‘ô~ww™° ]c¼û°bÈôµƒŒ\%Ðô»X5ÚI|7‹³ /½]µM®ÞFè¨èˆ
½H|‚íâÉù.¡„-¿í†ÝÆ^”ó³æÎ-u˜¥-Þ÷®>ƒ•S‡Î ¸/S.¸)«cê¥FÀCUp¶£’RœØp¾˜N¦í½ºd©èG=ÎFøR©([Àˆ-Þ8-YÓüûíA¡oÿìº@bÀkÎ®ÕË?ÏäNèãâ.TN¢!¿¾?Ç‡´'ÇÁõ{hÙ —`P Ûà¡@¬ZÆ‹š–qAöXpN‡‹ýÿäž³Kï‘7±fø`=Œ3Ôz-”Ž3×îBºÞáóå²ô‹tÁ[–<³C-É—àé^Sðõ• -/R:o—qøäíª!ÍnÎÈ¦W`’Íw‡}oWl–]é¦Æ“-)6ª'
ë^õ•ž1Šíy#—‹v'P\	ìL·Â¾ÉÙ·`ë¾Î¬K~ëÑ šQiv+½lG™Á]k,­ŸˆTj5,qŠIM6÷Ê
V©Ÿ˜É]å™]€Å--Ü‚!X2ó6\œÎÍšÅµJõ°Ja¸~xíèùïFd—Np´Lbâ$˜ÖWÀÖ,¡·3BGÕÊJKE0üA”¸L¡	v+B™6BJêÂå"ðŠ/V²¯ýp3câû¾ƒîwüK¡ð·ÙoäU´RzI„¹VRö(…¿c¥x”Pv5êîVs©Y8b,&eiB?.ö2JÐ)§ÀcÒ–äêÕ«dÞÝþþ2mAŸ¾ Oß[øÏºY>í6¹Ò³1€Ó„ÁÕ*JÇ´¬%º5fõƒ/÷ÃŒ¿ÃX«€Ð–ààO9Þ•{GÿcõY;:øÍÙs–ÖÈr²À©<·ª’ú[Îømí(¢kXFR·hl±o†f´I%,é™Ämoqð 8gß¾{mýöãYóã•Ç·o¬ßž³Äl%àèÅÿßWï’wÿ™Ü¼±
ÂòóÿýÄºn	„‚k ¤]zÇèRèè“AóQœ®DI§ZZ€ºOÂ>%Ò [^7ný—'këS„×[ï˜îüè	áhç¯Ñ8õK¤ã_hñ_|€µÖ‡«("¤Þ~|÷öÇ7nÝ²`^Ž˜ØädðïèàïÉÚú­MîüÓ#?°vö‚aTü"€¿ûbß¡ùäÑ-zN?^oýÆƒ)Bkåèùo‘Õ{ôŸuÐýýê]? Õpû¨Uð7uì[youí½÷oM—Ä!.‘•Ã¯@ò¡_®’»÷î£VðŸîû/€Û®€û&€Žýà¹»Qö0L¶¦Cà®·¢a§?î†icöþÃGï=¦dnz@C{8ökrûƒ•Ûè¡\»wûöºÈ²0èÃ/Àð»¼”pËš`33&Œ£¹à¸ßüaÓ‚í,ÍJÐïŒÝ#\“×67Ã$vp‚Ñˆ²wSlgkð½[ôµ\-I~HÿèkÿØ¶÷ôÏNs÷õ¨£Þ¢GÔ¬›”Ùê£li½ÔÖ/Å<K¦Ô+ïúœ£§«	¢EÛ©¡6mzƒAV[oAÇ3¶(.-Ú`©GõV®b]p9¢emýÅ*|—t»¡qá“ÌWèÌ6¾Á½ÕÃ‘¢.ªQ¿yÉY`> %(ÝX7ßiƒŠ1ò…°†bÙ"ÉbH.-‘‚ÀË¹E‚Ey£Ì¶Û\h/V×"P²:¼m§ž¤­ ƒtµ¢§>h.°Š+™årÍç)m´ŽaÈÐ ìÿ  ÿÿì}ko×•à÷üŠ2×vÇìæCOÓz@¢$›ˆ%;íË%¬bw‘Ý£î®NWµ(†C`ƒ|ØÝƒì,â	‚A2ÌÌÎ‹µ0˜ÊÎÿÐü’½çÜ÷ûV“”åDØjVÝ÷=÷Üó>æ‚¡1Û ÿ¯-DP«ºðð‚Ñ‡¸þxï~Aï¨Ô¼YR9´ÐREptjž„è«ï¯)~¸-ëÖî›ßÔât êË´Î¾¦¸Sá8Þ[L¢—Ïúó	œs2;e×­&¦@I3èŽ
§Óï;¬YPa£å¦Ò[\´®0_ËèÐ²ìßœH‰HX
ž¤HœïÉ§©O6É§´AN”Jí Å:6&…br\‹6¡õŒtæ9­—ÄcQÍ	¶ê²ÚUý!»]E¿%™kº’à#Ó$¡ñÁ¥M9ªp‰è¸"R^Ã\Ù#ïm%GjrÕWu>žTlj–Œ.ÝÒfU…¬¿Ô9ÇÔ¨±KJ*0ÊY†I&š!Xš*ª™7ø_yíu® ¾jPIô%µ8¡„“qÂ¶¿ÀçÚrõÔ˜¾Ü®bv§n¡µÃç œÙÊA€G"Ñ³à÷Z4JÅ£íæ "kHÈsÑX×ª,+^p–ÿ‡³ÆŽ	:ý îÕÑ§01ˆ£Ò…TÑvg¾ÀAús;-’†#«¶#¨Õ¦˜‚ÒUÊ©*QM'Ê£>%b‹“3
t=Á½Bsˆ#ºÔ JžKiÝ€(¿«þ(öõàåïÆ›<¶o8H²„Õ÷N|¬µßÖÎÃ9ÝËŸè²wµ"Úsv=ÔÎ0¹"­BKÒÈòp‘EH8Û@%¤H–€uÂ"§Z¥±†§·>|õâ—S/šî0Ô0Šï1û[°§Ò—[¯¦6°Ìà•Ù±®k	ŠúócF‰ºÃ`ÙãM3“QttIé×N¡C]"Hœ‹Âõ"ðãùâC4¤%¥¶]#œ¤O¼«èc VWÎËŸË˜Ðy"™¦Ï¦©>
}AmLVóƒ:*ìau[n5ºÑ¼.{;™v|EZ?Üå·	 cË‰çóŠm*õâ+°åzñóIò¡ôt	¢¡N= ÄãáÀKuë&Ê‰]™‡Ô©{º};3áŠ¼Zð˜²)6[;³YyôzÛ’)Ó:EPÅÚml$ÚÒ'²Æ +k,O¦úJ=‹¯sí“8k6IE]è5ž‰h»J‰¢1à^µ	ú£ì“ëq}CCÛ¨&lªƒ»Ñlp|x³²’†Hø‡20ü»é¨tMH‚”Ý¯ÑŸ$é4NŒ}»=yï]å¥ë`<!#-¿{é“(¿¥OT¢A[L:e¦-¶ëÁ¨Hõ “Þw3d“FZhø	Îî'ûÂ¦ï‡¡PýÞîGäfmµvŸî¡IëS<÷Ët™—ÛIçB˜B”ïlw¦IÊQòÉÙ&…¶¼»¸¸+Y¿ÕùÞf¶[!­€GÚÞJÖÛùÚµXÁFaâX`Y|ƒ·Kÿ½´ë1Œ·AŽ,ÆM©1´lÀÇ|Xø"RŸGyjPÂÖ°Ô"<(TƒÚŠïÿ¦*bêLšÜ µgÅlHV–Q.Ø Æ,CÜèdLå6¶°¶¡(Û½©l,Œ†„¿RÛ‹ØmØ´äè™î}[î°uæŠÈåE’Æ†?ÁÅ:mH*;;	Ë¤†òñè"y‹îz3ŒO»ÜNrÕ3ú÷Q§h”±Á™™%BM_Äëöä€®<Ûäß#ûqy#-Üóy(‚m¤)>+ò*ª!`×ëŒ–{ w!ÄSÎXdPn®
Æ-^÷ka´
Š‹k¥_ŸþªÎgu¢ïlÆPƒ~Oºµ/@046fV˜>í¤œ„Dµ÷Œ,Ýú2]”jzZŽdô-yº§0	 ô¼R“ ‰û¯6q$×Rvr,†â+Gó­¸ˆ^˜7¤[è°¸®'ˆÒå3,:wFT3>9ŒãôTIÑiT$Èj6‘~„
°cjx™nwòòWÇ‰ó7ü9=±ÑÕ7¾àè˜ÇÇ—®L[“¸€09Œº/TGHhg,Ssôh¬yŸBG½€¾™R‰c{u+mßÒ<–¹+v¹Ã;²|úÜÊ	
zT]nŒãbâ˜C‚Às„,ï¡‡`fuÔ*‘°æâÊ˜Sâ›_Öâ›_ùVã›T++Ç9Ä/÷ï¦õNt.Ò\·Có@•n×ë»Åh¤Ó"Ãy–cˆr¯@öàý—_k¤‚ªâôQÏ'ó	8°˜CímHì‘bí
©13EŽgHî¹ÞÕ5W_Ü¨™«sèoà+ð=×ø}0ëjF[o¸n:Æc$xp”¨†?ÃcÌó:ÎgOïŒFb<ÕŠö}]š%â«
ÃpîL_è^ÉBD€ñ®bÀ?:„!°†äŽK0(zOñòœe{ù5Mö›9¤'þ5Ûx6ø+ÿÍ¯GÉ6F3d‹…×»"F¨'V‹0€´f`äòÛžf!2È¾zñ{È ûê›ž`þ	ÍÞí,öt0dycbHÈÜ­•€‹ïÊ³|ßÈ¦k0§µÃ&ôÆ¾ûpØô‚6	Hk9\Á]­KoâBbK¦2­ë@ë8ºÇ‡žsÉ%É›hc¤f0N'»É˜Ìïë¶ÝÂñÃuîAŸ!ÃC:uÇ~š9pÚ-[‹iŸÍq²²ÖÉøØ¤VD¤:3œÇÕ}w2æ…wŸ¢à× >†ƒM! @ƒR#[Ê|~d‡Áyö•î¬HC¶áH¹jê]{Ü-¶34Ý†º3Klíá£}rôÒö…vR6NbÆ½¼Zæ¼ßøøK¦f©¾(Xoà¸™µÞì'’˜°ð¢/ÿ÷Ðƒ”™jpâÓìQ¥Ïœ×ßÌZïv·ËÔjãˆ»5tëÙpÜr
©hS³¢7œV¤©]ç’u»]¼Œám?9 ¢ÿª5éb5ÈƒUµÝçÒWq:+žË9¡z‡€Lãj´éÃ¨\‘U÷\“eÊ-:[ò€.$Øµù¥†¤K[§¸40ˆþÁ½òÕ‰Ýh‘EâíÙ;`á÷îbÖxõOlAi>tyÙŸ¶›‘ç’¸II†MÜÄ¥'™Û¶i'­–SU~N‡‰kÖáäý‡«ùáæç1çMx^N6Ì±E<Æ°“¤2oÇ‚u»&\£m~xÞ¡§7 Ý=tö'‚ƒä±qã65GHêóš“ÑåÅ"*×üAZë+Kî@mÖV«žÍ³øiÛŠêÀ¯ž}.Çpx.¨ØY8?ë!ÍO(3º«Á#ho ÿÓCƒ»Ë)~›ãçˆ‘ý¹‘mñ)ºŽzõ²e[(ø¦a«€ÒÜRñ«HIÎäå¯J"èpByÅÌÃ3á“0K²|…An!˜:Ì.†Ïª·:.=Æ™)2(‘c¡ëM‡ä\ÏXgÌÒ43ØÖÎZ³áš`4uÑZÒí\Ä˜pyn6¢àEªšz…Ú_FŽ«ˆ/Ô½ >™zj6$„\9;‡;I<l|¾ÊúxŽ÷†9ç¥¹ÀÞõ+Ìxe^cží‚ðdààKmàN}›ŒÂ ¸ì¬e¬½«Òr‡ávµ´™™m@¿‡£Ñ°òYxÛ‘ìaÐZm÷H<Ûƒ‰÷å™*A±_¼zñ7yö¼ó5ÿú÷iŒ¬ó³ ­kA½Ö”^ô³tfÁÏ®ÆcÔ€sÐè’v1têŽ;ð,¥ÅOrÄ<¦Ñ¹|²ŒSð[þ+2Ó+ham„ÌõGTâj\+5½|T1¥âf¨œgÕ%êÇiC”F}YVp®xIvâßäæ°:$}îuBžíf-?€ÀC¶÷!õ¼ª5R…ÜúŽgªÙR÷“üc(ÈpwA©ªÉ¨b1¶Z}îìr[Š×ME7sH3L|8É/&¦ÏI_º“ÜØ™èñùT§ŒEžtc´á
dgj„ïëk¬î“s[ÔžÆãfp© #RÀÎÁžXbfW	GäON¯ì'ÔDªe”	…³†=ð4Å)Ž,‹Ä2F0S·Ôf—»b˜ó8—°\ãkÖ%Í{Áë–üx}á•Ãi¼–eóÐþ¼‚©›.ß]ayJõ+hnñ:–‘Ó9)ëfYît6²£Î†FKh“óÉpÇq:‡P¯ã^¦,Aê’ªÁš¹ŸÑÁ-zñ!«ªÉü0vˆQUù!¢×'š×ž½kãâS.Ha"ÕH§t·šŠ§Xƒû¾.–÷$Cz•^§“¯CáÁàç	ã
ý¹Ûý×OhJôˆ­r<%‡üI>%¼š×oàâ„êá¬®˜¦šÎdªWâÎòg— ÁŠm¨€qÔël¬–jkk>ƒâÇnæ3ê˜u~Üž2¤þ,·2~^£Žy®	Ìut”ÂWÚ¨3p²™
ì¸–”¶t[±ŒûA†Gay"\Í5ÉŽ8˜øè&Ìè	8¸› _Û§è×Þ±>>ÌëA7ß¯h)R,ŒjÃç½š"˜ö246ÀÖJôêÕ‹ßçÍ´oÍ‘
ýzäFõÝb Cj•ØMÐ£P¿á&–#û:ë,´ò›kó'n¶ÍŸù6s+0æZ~jÈÝâR¹ ¹Õ&®¬ÙæÜn›ïÎ5Û¾Û?› Ÿî2èÆ[`<ë¬s‹î_û­÷Y3nþøÏ}d_-îÃ[2¾«ÆžCÅd-—íðæ‡Ü”#ÎCÌ±*ÒÉgZøÍPuTÌ–ƒu„§ž·ÉHC‹ù£èÊßZ¥ÒZEÞ[¤9”ÂßÚ·P;u™Wu·š÷z„h=Aàê pÂ/&Y‘¯ƒ\À“@ë§þ“˜v½yg5Á±4:ˆëãþ±éò¬ÁŸcUùëÅû¡Cè½’UÀÆ›Ó¶K¹‘ç%X7_,ÛAŠ¡MfB»x¸m¦iùuwÍa½ª°×»ø^½Å½¹\8£(çÔìÝÁð3'¢Ë
_¦÷ýº}>éßìŒLDÎcFqäŽRÉòü´}?¡­Dëx½>þ—Oæîùþ•gG{Ù¸ÏÜ?/ƒ·¬ÃÛ“/ðî¥ Kv&åD˜93Óªèâ‚¢á$;ÈûøïÏÊrÿöY’LŒôé„„*×Uƒj¡ï³2®ËV@y÷¤ëò¸Îëª‹§PO®Š!ÃŠ¾š†K13Œeôn•"g$ë,8„S%ÿ¼6M—držÕõ5]¢Öœy•üSÃ?„`š¡Û¬ÍÃz»Ü/k°7]£ù‚ Óp%ÿC
Œ°‚ŽNG`hÕïÃ?Ø©³ÏÈâÞêb“~Fp¤Ç!Ö‰â=î¸¸ÿ \ªESšd0'Oé0Eƒ«r}Í4Eþ1%£_àƒACv ušaChÚÕ¤¹Ú–Ì üÓ9ÊžGW~˜¯ )1¼ü½ób¸«b[ÒJ—äºL®ìŒ'ÁtU	,ÀÇó¢ïY®‡/¿QÓl s:'äqèúƒ9û~ö‘ZŒt8ÈúeNþÏr
Ôdaœóv%‰ö¸K»Î€_H—¢“p;q´J?]ZË„·‹¥@d2±Ü>ogö¨»ó ¯¾ùzì\¯.âžÚQ>› cÝ[þ›Ì15K¼KHa»ú_Æ*W¹KÀµ5¨s °çl6~8ö3øÜ€YF ÈËîlÝ»Ýn×y#®dŽ/l·¡Àµ—„ÂÒ\Ò-Q2é‘Ò`	d\å’ÿØÝ¸.‰Ó¼‡²0Œ¨BF7h¯"c›WÔ|µ7#Å{ùhY¹Æ)	Îc(½4ïu¥}µî¾ê}k¿üÈMäÞƒÔý»èisá9¬¨£61‰ë*e¼.ZI|¯BëÉÀ1Øoô¶ä6%NK{J%¨ÃË1ö\±ão9M<DàÇíˆPtY& ?¸±:¸é;M‰ÄíbJk+{ØÉ“DðpSÏÄ¬Åï×­…\™„,%@nd„Ã—¿“¥~õâ/&‡Ô~]Þ
Ñ4C©‰í\ú^õ*Êq<D’ ‚q>œPuò¿þ‡¿bÓì#÷ˆ‚G$DjB E?»‰Ì¢æKÚB±\]/ƒ]sjÁ&‹~Z%ÍAßÿ)Ùt†"½lO†“a}}üëúŸÐ´U°[—†„žm­·Oÿí¢
~7™¡¾xò“Ú4xÈÎ«ÿ'âXèsF;÷ÇÄÔ Z.ELLíqI¸ÐùÊÑbWÃÝtà<óúïS=ß£Äuwv_=}‹,H,ó˜¡EÝGz®Fùwkíw(û×ƒTBéKÏÐ’¾ö+"rîW¯¬þ¤wkkðòwä^lÕì¬¤mXñ49\ð'véšºKŠévê…¡5ë°YP
QÓÿQÍ:™‹Þ#‹"pï§¶;|ëIË)W ^¦ $ñæÜÕ«KwÒŒ¬‰ÁUSñ"øJºP¦Go[ÔÕÿ)ÒUTø¨Æ1š€5Õ5`þ*?kÃÉ$ 9ä„¹CÿÍ¥•¶××*ƒK¶‚e°[÷±2K·¾ ÏŒÚ‚ä“¬.É/ÂÑ\òví¼ûü1K3ª©x^Ig_%º—u²d¢ ÿû#Ÿ½øù<›¼úæÆ,ÐÙÍg¾íÙ „*¿úÓÇùˆuVÏ ,RÃÂúµŽQ5£*-‘[´­Êë™»ÀöÆÖ¨tšj ×¾¥Æ¬½ü¦—ÿ8™ßg‡‘Ò,%qIœW[	KóèÒ™q££	e.(dþtCnÕûºñ‹8)”ùUÎz³Ó/I/C–£eÅfÓyÿJà*åv§Æ\@ûB‘2Wìl ÈÊ¿2ô¢>]½7˜Š¡UÕ¢â¨D$•[qðòo	ªPXó)
~æÂ‰Aâ¯†ÔU®‰‚tÜ7¯ÐöÅôŸ¦úô\ô¡º@yÁSî.:”a N\—zõKtrŠí‰ÂŠ¿Iô*T^N5Ãã¢®Á¥\Ô5°eiçö<Ti×`]°90Ç5lÁø &·ž23PÕÊñªù´h_i'ÞÅ3iuÝVš>‡¼«@¸¥€¯p…³«™!»× Ñ‘ùa}MóÓåŠhó0RoaçVøîPòr‹Š¹à—¦r¢ÏÕ+†óSîÓ>;L·È}$²ÇŸÀH„pÍKÎ¿V>­Õ°g‚_$ªEAˆRý8ß/Fö)Ræòpªí£ðHP{ÚÑÄŽkÜ-qù’O!¢ø“á]ádR…ÇÈ	åL™¥Á¬¨ääŸþÛJÖk27œLçµ[2WO!@>\“7åñprséŠÏ‰™\7—Þ¿âùZÕÅ”TvÛ>ËGsr7{fê¬RŠ½Up2î®³~kšÏªb{R·
‡¤‹ýµ=,µ¤x`jº•Çf9¯œ,úD‘ÍÔcJRN‰’úEãñý»vX À
Â¨LËº‘rÎ}¤\Ùá«oþn)ËÈÝåÉ*CÓ­ÿøÎg¶}ÈSÉ`ˆhÎm1kêñ8Ÿ	@ûJýUsptÐë7Ãh~WH=°ÿ¦à:Í3Ý_t„Ú×DPÅ«ÜLŽòíŠ_ÐÈB×ÄèÂ©…V?×ëÂÒ­/tUl1éó·Wøƒ àe±î½KÒo{²¯«s»/øn6¾-_È]Á êünŠ§/ßdƒ’‰ÔêßÀA<›ÃðÅ±õÙöÎöÖùÍ©f¯^üü*Á£ŒØ© ¼é-á|áJ5äUãL3/¥úþ˜2$ÍPÇi<©î¥!è±c8Ý³‚A¢áq‰ÆÂ¯dÌ1w_½ø/ÙOç¹c³|nÕ­š7èvãå4]f®E„p»kÝ÷¯ïeÒ@Í’S®„üº"{àv*Ò•–Už_µV¹þ@”·Û–ÃiÉµýÿËßÏ³ïg/>e¦ºÉpàš«/¢rF­™Éé÷¾·úƒ|/§Ñ^1­Ó¥a$‚—'5|¾?éåÓj¦"«T(å³:ßÏHëeæ“~öù6YqHØ;#p“ C”ƒ¯åÎÉOzŽòC‚Í~°ú=²í“ï}iã&¤ÒìÕÝq1.[­8ÃêNŸÜ©+äÇã9éAüõ°ìÃ?¤Ð£´³‚¡úV0û0†ŠÜ[áiŒùŸ¹è‘¿9NòÑë5´ñ0ŸBÂåSÑŠ|AÆ¥k/W2ð«ËgOÕ¡ƒÝJF.Þþ¨x0$÷k]ÎŠû³YI†§WÜ†ÅYÁyn“-˜Aue8+ô¸?ñ*ÊKé8¤Õt— ½Ò!Z…¶±ŒËOçÅŽXÍïêABéFîÊ5}L®øÞ`…ú@ê/÷2¤úÏ¢µLÏ‹ÝWì“ýë}³
­q}nÙÝ\Z[SÚQÆËOƒ¼ƒQ¾è#Â,8ÎÆ˜ó¥³9í[jƒ° ÎÖä‡Ô¦¶È÷ÃrvìlNÿèlR¶Iˆ±š ’ƒá!¶òXü©Ö»q&Í›,ùYŸ@6ºŸofËyÕ[Îþ<[&·þ˜ =xz«Åª,óÈSË+vµSu("a ÑQéO¹* |š¿ó›ôEÝà+'×%í¡Æþýþ÷3å‹h¥"-ÈÑÊGÖmÞÚ‚Ñ+³dn˜§Ê¡ô6¹!{9êJê`:ðŒœ0ö“ÏšÔ–óvLBj`
žÆ
ù|z¯<šè4ºLHÙåÊiÞÖÇ„j®’Nˆµ^—ì6'PÀýÙ¬œ|>Ýî•áÞw]f¸l´c^¤%s•3a†!§q:øk¾—§4’ÞÃŸýå[-ñA=‡p3õ5œÌp®ùZ;{’zaÍ@à»•ûæ[m ßjÁÓÇÃ*=à#gã1_‡Ç3¬xAë2±?„›R^ÉëšHO|ðN´·ºš= 1Øš‘;º…ºq =êÁ°"½1âÞäÏJÂÏÜ™N‘¤²£í½#\·ƒÿ¦2p¸{'Õe—Få¾K*m(ØÝ»ÕÚÝÃÖèZÜ;žäcB‚E…MYë€käEU+Ó…ÔÌCFDÜ§¿|>ìKtÞ#¨wRŒä‹œ’VÊ‹±þw?¿-ÿa	”wÃ
ÑÈŒpÛäí~YŽŠ|ò£º°5òz‚qyÙ¥dÍÃ*W‹	Õrœºþrk6–/²S\&D(t^‡ð.ýrŒÌŒâÒÕ6aöé[×Ú+râËyÐåÓå9ùeøc,“IÓb¾ôO:ìÍOÁŠ³ò†˜ý…7Ç^Û²£E¥IGáKÂvfÀ´üHsˆ>cræ>=žZg¼ÒÜâì§Ô?ž†±÷´HHõÑVYÕF«üuà0<#EwŸÎòù·ŸŸ=ÂÞ³S°Â€ê!*NÕÖútÕïi¯h³7«ím‰?h«ba<äm÷i³]_Â@ é{¤nm£hóu:‚¦5-ôL_;ÅÎ«ëº;=õŒÏõ)vÑòxOxæk|7h°|ÚÌ¸¿5›>Öqö‡Ä«˜‚—r“MÆÄhŒ»³"Ú'4Ö ×­TBÃø”æ¢žX‚_däÂ&„mç!òó
%K.±íƒ,G>› ÆŒŸ‘•ì¨ íÍ	-LÛËö±ÐJ¶?¯QL~vÙàº¯ŠßÂÍGªÌªºË;ø¸¨—IËƒò(¹•"ê-MJùå djKd<Õ¼èªô0/tæJ¶ËÿÖ0xÞïÃ%{½2Uy÷¶ £| Tø½ò¸©ö,þeF¶óY!&+‰ˆð´97l¼ã!(nÜÌÖÕl<lÑw¿‹Ã%„\(( †Ì%+`òE—@pk"•ÍÎ§}rÞëºÂ™Âe6IäPØÜèï±øIf†ÿŠ‰á_t^ì'›û‹Ì‡Lu=fÇ.âÌÀZNë&N‹°…'àBMÖh‡»·IÍN	§W´­é¾‡RÆ-:©’Œ	&Î&ùC'óÏ˜Ñ¶lÕ¥fàÀdc<<|—
&[­jNð
ÐÏ†šï•bFe^SºÐ¤‰éˆ@YkõßwWÉöú¦¡0?0!›ñ…Ùmˆ|á™ìâq¾|>ÎÞÃ½ÇZà·’­)LÐßy]vªãIC8C²ÀÊ”3e	F½p@>µ"xKßzõ82(ÈUÞ±Ù™³F)Ûv{CÚ¹„i9ÏYÁÏR›ãf»ë=ÁD>ºÿãMea¾Ø~|g%»·ýáöÎW²­Ï2Qeà¡ÜÏJ
gÇréüë…Ë`rí\*ó²måd™\Ð½ ýìhPNh=ð(ž“›~ÏðÖ•·Õ¨¬à5Á9UéQ ›Gp°ñìT›™qWSÖêŠ­?Ðk1Ð¼"AI•°ƒ².¸ûyo C»7Çµ~>ŠÔCÆŽ˜}ÀŠ&§‹µÂŒæ=l“×ŠM‡}†«ð~›ÐWòÏ=Há -Ü’ýÔb><Ð‹X²)`X=ÑGz[€]Rh·–ã-MƒóéVkÚl¨m:>Dš%ÐEtœ¼\Úk¶ÜÖÀIíÇxéìãT¹G}Æ85:Ýjt¿i…^Z¬ñÉ>l/ˆj+}OÚæþòqóepè‰Z<;–µ¹í6[£?m¿¬.ûº´÷Þ×«Ø=«Ç^£u(h‹$MºÈ ÅWŽÆâÿ[}«€dè[=õ#\ Bjæ’ÙY^âÏ§ùÄ!¾o¿Oàß¥ÈNyx8¢ä!“ªåL'‘ãu¦ m…t4äz”âÙî?ç‚7åc¹×ƒ6¥:PW“~«•Kê0çdŸÚe[ª\€ wŸq]	VÎ	\ö¤lw_¼<UZQKï²yìÉvvfYóPzÙ+gÍ=¥i,¼Ë–"ÐfE³ñ5/€§Õkw1'à*ä”¦ôÒ0mN‰v»ú7š\ipRvÙƒà%Qª§$¹oZÆxéýJªù]›kmÈ¾PH1,‹sMùb°]b‰Ï.?Ê‡œ©¹WöZ}øoZË+:­(÷œ€‰M­k¾6Ý¿"ébö¬˜·\Uçãi‹Óú2ªm"Ýïtó­ñ«¿AgynÿqJX•º7 ¨ðÙ)àãtiùiÁ•ì“iAíRAÔÚýüÓ{wvîóç]¼mõsÉ²pûg<ë+™ˆÜÿöøó3«D±ÌÎù‹›ž,Â@rCð”^Í¸ù$Ý,	êqè¾©²LJà®9¯lÑ½¼²ÁC’Æ÷D1‚B\Éc}xuWY,”Š€1yW ûèøŽ7"ÁdÆ§MlLEg

óŠ¯Iåú*€jdÓ·:€ÚL§	xÒ{ äù‘\í%hÎNÊI&­yÑ¬hÎ#˜›+pñy`aKÀÅ0å|\Ì†=‹·5#|­ç‰Ì|Eé×Z.á×Íå\â}½¼u› ¨N½Ot@…^4¡nËoÆØ{-3°ÎÓ ‹JØ“‰ÓÕÊ­¤fKR^%†£%&Mˆ¬€g¨¿UöÓë;g‡VÚ+VnÌhg¢Þ?'×6ÍÆ§ßÜJq½e‰ÌJf)m!}Fr{ÎVè7¶©žšé[ÊªiÓÖ›Ò&.VÝõH` ÂKÆ*oµ„Óü³»_^´ïÖ±¼¤w2Ã÷|Ø¬¸Ý¸»N4qvë¬2÷ŸwlˆßØY’€ÆLp–“{ve|É:éÀu4ÈRI+vº€¢¯ÂÐ$ûJ¥–¹tDjÆR­ÿ4ð1Ú\vZ‹BÛO/h–CD`ô›¡»I9¯P$Î$I\äÚVn«m­n%Û k¨@æj¤ÏUlÙ)ï²?úpüÜÅÚ†Ú<Ú8ü>¿–{³1o˜ü”í~nU[òaõ)µ˜„Åæ!â€Ž_Æü1š½o—itôK›ŒC»çäßü
oðÜÊ?Å~GÁÇcpÈ&µdçßqÀ
[N×°6¸ºš0†üË^ $ÎJ¶¯8Àšå”¦Ëwõ~÷(‚ú@)¹OKî‡Kr“LÜËÖ¬6%.—Û¢Sò*Õ÷íê|$ŽêJ}ìä–j'›wÖ	·þÙÌ­†Í@+u–Ö4M»¦¬Vü®+nêÈ!¶?¨æýK}i`ï²¡y`{¥$‘Ù-Ë…@Êî^û-Í­ÖKs¿¥¹ßÒÜoiî·4÷[š»QûßÍ}ÁÄñ[zøOš6éÅ7‰(T1s¾£¦ RØ EeJÂÚ“tLz§I{8ü¡mÆÔ¥
µ÷‡–m "‰keP“CS½vèwôjû´ÎÁ>­À­“í’õði]>eÃÁßl<øÛ.ÿ³|TÒÒð‹–…_vÉÃ²<´,ýMKÓßvùi‰Fˆ´ûƒÖ`ØUÐ¤‹VÀŸ´8þ´?Ck(¿hQQµ’}n~…Ù´¼ŠÞµ*=°Ï†âä-Êq*cG ŒïÙö¯­ð½%¿`»È?|/ÈOºÌä_EòS,ùÍfN~Ñi­­ÈQ“ß8œ5íÐY@jpÌQ³	Ä›,ã`¿_½²û`wzõÜµo¡ÿ-ô;¡ßXíPíå¾rF¤éK±ÉÂ„€OðýgÅ¤VŽEž5äÝ½â Ÿj~£s³õCÒF¿¥à•mÆMîS‡Iûîûúm}ih©D§jzÔš·–¿˜³ÑËÿ…×!%øZ~ó×Çèrù×ÙÎàå× 8þÃ_¾zñË!Æˆzùûuú¿©Á@é—uveÝ–QjT#–Sa*i;¤·Àþ„ÕRm!$gÇxAnú£XxÔ¶é¬›ÁÕÍ˜(z“é
lY{Š&ZhKG´òQ½|–)¼Â/ Wø—B+übÀ
?©ÙñžF¤9lö¥uaÀA.ƒÈ¨ø£‚Yæ·E!Mæ²Ýw	H VL×<ûºÝºâ»+ÚÛKwaÍOèmën²ghðŠÞ´ô–]¨Y£}rSÜtûµäž·ÍQ±Ã[“AˆUïo-„&«»C¼µìYõøUâ­ÈAÕªIïo=fNoÖ2/tn†w±¸bÙí).Fyáa³f£xWW-	é•<@¶’%$šç9-¹%Í“òcáoNð­ŽA6ÝsÙ8„RfÊ1ØTb°©Á”SÚvÀ%Á¤¦·‘†Š c¨ü`Òû3ôLDô1¥¦>•M@CEÿ®4##Sœ°¬ÄuÂÐc×èÑÒìÆv‘¾i¸ÇÑ'à$Çâá€ëu*ä¢!ÔÙ-Sæ•c}ÑÝm´Ïí¶>á<Ö:Ñ>dÒQSaÅ,Á¦šx
™m ×gcO!³Í–³pZ›U4ãÐ"`þxÛøJÍ°íP/UîäíWñ_Uœ|ÅÑ¹UqÜÁbZ©SU|Ú¶Ï`~LÖ¶/ÀZ©ŒªMS ‚Šk7êÂ,²ÌMüu“„Ò4Kž‡—Òõ>+úâ~†N„à(K»gøFÀ>ÓAˆ²Ê[»ŠÊm,­MHpA›ì·ú•ó=›øKý"yœMö[¤äg6ùêwÁÀlÒŸê7Î±lâ/õ‹Â›lò?ÔïŒ!Ù„ÚKQË‰îÕ².f5¡šÓW^ijQjµ BÌ¢6§]ivYïuxÛ¼ís®XÛx^-²v”»{¼‰Anw‹q>Ù`(Ê}è´è|Ø§åÉW>ÐÑvø©¶~WQ´`In*Ë¯š˜x³M™å²Ã+‹\ñ„Åe]j–+N’¿[Î”jÍnÃO¶Ol|%3o@
Albe‰@20³:ÓSídù-Ä÷1Qi4j"Ž­f>8IÙ©ØÂx7)4\uúþQŠ_®Xj2>Š(cGI3âÌZóû~Ÿq†ãù¨N	ùÌÉNì+GEwT¶–('žañ'Vå2m.¹¼mºõofG³a]Ü…?Èz»WÔDäÚVª"Š%KDa‰ úL±¤íž[æ`‡íUÅtÓÄOÇ ½îÐÑþÓ¡ÞaõÚbÏ Scë	W¦É¢mßËÞ=!µO³IYÓˆ1ÙPFˆÉòÙ,?~¢µ­üu*Uû1ÙŒbÇZØ4ŠCdýªiÑ@¼öÑq–WÕðˆE¾[¯dŸ|–0ÛÏZ2žÍvv¢í['ÜAò
{ðŽêáŽÔ¿"ßp¬ŸÕã. Å§D0˜À"Q• Õ]¼÷'µÑ4^Êt#Ó—é[á>p¯GïLe4‰ZñŒáLÔ¦Î)¨	}¢¡Mè#œ8a.Óà3Á°Vz¸¼ç*gVòpÙt€©…_a¾–.w2k›²;Qî6uO‚nœŸq¨8„t&•OäSYé4VÕ`ViŒ0e¾	ØŸÙ(D¼$H€%c¾„djÓhô—0Ê8†ã*à¼«7ü¨¬LqlÜõ=Rtõ+Jõ
ÒcŒ†Ÿç4Þ:ÕÉAåûw¶>â@Ûµå·$Š³‘Žo©ºì}Vq5Ø+G,~ŽMê[!¤RÄ©‚„&¢M˜@nHç·$áÁBâS€ ¡D):ßsyUº WcrsW%)tÐ« ÐÜUA•EèU˜ÄÜUIQèµ¸¸ÜUM‘\è•˜ÈQE
4¼:™a\¯¡·©‰BBê˜Æ-!ŠOÓ¸EEübq½¨[ú«Õ@ø’&~¹XLLF{‚F”ŒŠa”’¶ &Ÿ×ƒnÆúø\—Ðèm¤
‡ÒÅCAQ`\êE¬¢|äf»„UiÑ;Ã%8uq·Tî@«÷ÊñxX·”bºá	‚@=xù»1áß¼<ñ©"ñ
$w'8VÎ@¦€&±ìœGA¶>òA´”`Jø½ïF L÷Ô¸Žß˜»¾éäTýb„nÒ?*a›ôwŒcŒmo9ÿáà×çáÇŸmCt[XJ’-ÙÌ6Ýq(ù=’–q‘‹;Àoì2²qu¥¡Súz¸OhcÕÈ„‡{ 'í#èÙ„30KÐ3¡­³ç/ÿ1—Ç¯ÛíòéÚá:ú4‚´_ÖHÆè‹Žñ­]‚Èòò‘j0f×6dZÎÈÙª¬1C\æÄ„o´vFK®ˆ®ÒîÞýïûâq&I?¤pRà_ànt3)|JÑ/Æ,ûéüøÕ‹ŸOX6HšåÓ2u½èXÔÄaV†×=äàšùR\1Ö	è¹Bóšß=	uªAû´§ˆ{Ý=pA—),¥·%=?)‡Gž€ÐmËES4*JhÎÊYqF¿W¯@×ŽËªžY²ÆØ¯²˜O"ÇØƒ^‡»çcøèÛ=¬,Êa6Â„”)'÷õœV%@ÿ›xÍ¨:¯¦WŽC¸w$ø:;O»{ŒDöäI`°è-„Í?x[+ç†ñ_½øoCL­Ø´×Å÷ŸòŒ ÿLæ•×ùNIËjV <ÛåFE–©ÛÎJ›^›~:BqDÔî<:=Êè½üGPÜý]6ºxŽt.A!sÐëm‰å$A¬§vpÕ·\HÁ—©!óò&÷ƒæŒä²°^ÞÔÝoE‡ä¸ô…@ö%
[…¹0O«^«_m™ÙòÆê¥Âr–s‚ìˆZKò‚†O‚(öïÀ–’ÒœD‘©%/dø ˆbøË?üðûMÞp<å¶>{ˆT#ñœãWÍ»@îó—„¦?œ9MH\cûúåï'º¥³ôÈóÍ?æÛVÅä0~*k	pE¹‹;jðN¥KQàÑáË_ë‰]É¥“Ð•ô/„$7õû«®“'ûè£Íñx™»L´µH–Gåìi5(
8è?ùøñOºóz8ªºV•“/ëòKü„'T»› BœV	Þ|9)Ž8Ae~‚ìÙ“>k“7±"‡°s´¹\l‰ÆÃQ¡T|¥‹ñ—¤ì—ª0Ä‹¦oü/Ÿ	f _ÕÈ•ÂNò¿OI#Ô¢Óe÷ —MWòË‡¿„•\nŸvŸªç‚Æu]ˆ€ ÷Ùýç½bä0î°3çŸ]´™˜îÂN*0ª‘^jw…’;²xõâ÷„æú§Œ®KV‘ÿs$ûSõ\xFí+ñQs-4*~© ×êàE÷)•šiú—éõRµR£Â‚U2?E›Â]ì%¨bƒ—yäÐkHM
/åRdè™º‚£œìÖ
/b••)º}×|×‚ªáŽhŽBªÞCú 9
ªjéç(¨)E/5GQE"¼ÓÅ¤òƒû¥9
iÚÅ%ÍQT¨'˜+š£ˆ"]ß·…êêW¼í‹BmÔ©™ÀƒäsoT¶žKã"ârQ.",WÊ¹l)eÁ¸…ŸyðWW³õ.Z Õ¥•ÅZã\ò~ÿžCkÓà+iÛnt3Èq-°
è«Åµ>SâéRó¿“”5¸¸JS¤©FRìfOËº5*«‚œ-àêh3ØÓbRÍg¤X?(Š>àP¹;kXÉËë¦îÌz™ 7ë¸çÀSQ»ë´[ü ³Ö)%s9;CÊ¤ñÍùQ{æªÄØSB	²tØ˜=U(•gÄ3—jáëýá35Wr5%7Uç¸s}ékJÜzc+ŸõÕ
ûå¬_Ì:“rRdÕ '¸³ñ|ÄVàiÖÙX[[½º–ívŽ„–ÌJrJFäó`Øï“%Ù¼= Ag½{ªÎ©TLêN]vfÙÁ¬óÎWÖÖÈÚt¦óÙtT@Bçì¨s@fyÕ–aè9®ÚÁt¿sU=†ƒQñœZjuzd¤þa>í\ÊÆûu£ª]yÚÙ€á‹±f3°ø,úÑ¡U—æ±î=}üÓyNN®–Ã2X_q¥®6û_Õ6L™ûÎ°ibcÏÁNˆ,ëþ"ôà+ºkïÃ²ÎÈKIzx8¨—n	&ag0¿±*5–Ïö¯¨z³á˜£ ]ÂNâ`ÆE8ÓßCXqÒõ Ù/ˆF^;hêÕ1¹VP*Ã¤˜5Šè•Ž5€X•aÊéB;Î†.Àºdåäñ|<¬ož8\ÏOSÚñŸÆ+.Hñ”Ýp”%¥?Î÷	Cd.ûîúÚôùž .“Ý˜ÆqÖËÁ`ƒdÅ†øL# þ¾zñÙþË¯K‚ž¿.ÅªcoÎq£>œ‘ëþ×!ÔEEŽ
œ,÷He*ð÷…xÂT7n”ºèß6½ºÕt4¬[Ëå6uÀ_^>õµYÒt¦[h»wó¤õ"è8,dåÃ4Ô€ÁŽð‡f†V˜ÜÎÃ‡ª‚»åÝ•Ó„³”ÉøkÚIÊ[OÞ=!s9í¼{2>}â­zzêüàÞ±A;„º;Ô±,Aãë€ù9ÏÔ{ƒcDŠÊQßJ/Ô˜Í’¤B1»¹ôè¿;P¢¨¸ª/2†üã8ÙÝXÛ¸¼’‘ÿ_Áÿ_Åÿ_Ãÿ_ßC™&‰·¼MˆÎ¶Áú÷iq|óäø”ò±4ÑhŸÞ"øø¡°Xí¶{Óäüƒ3ã…^Û\ÿîÁãó9€ÇpüàþÑ@*¬Gð8ËtldTƒ±™­o€±ëË•lH•	Ãì½l]±xjw§yÿqÏêÖÙøµåvOë¸ñi‹Ó:>½EgŸ‘ŸßúIuRâu21qÙML4"=.Žø`±mZ>&@tà¾Aº|¤ºö’jÑTIET–õž·"Ê¹y‚ÿ=Ì§´ùá)è<yhxsv’ëò²³d\`;YÍ‡à-‘°­ÕM‡glo+çæFksß¾›'î÷±Š¸ïò··¸0
¼yòÎ;–·¬Ù4˜‹A6{ýgóªwö‹ú¨(&Ùô¹ƒÑf7D.ÝÚ’,æÓA‰&„ëäÝy]¶Öwv§ *Á2K~¨œóI}s©œ×£á¤ð¬†?ƒ5{”“­Ñ°÷” x¿™›|×ŒF\WÉ F0IÃˆtÉC6 )Î¦&Ù0W›m‚\j`îÖ»W–šÑ4ŸŽæÕÖpÖ‘K]‰ÿ½Ï~7V7ÌsgÒ
 }4yÉ”'Ü!Í08Xö<o‡èì‰
¬Ðaó”Àÿ€Sf¨iç²JÓ­*Ò¥±‰|/i©u²uùd8†ßÃIv÷ñßj4Ä¬Õ%H­ús*èì\Z[QƒMs -²t6ÞÒÝÍì|Øëè<hÓ=ÆÎzÆ÷DŒc2ù£aé fƒCÄ=hçý³Ýƒ;ƒ9!izÂl%ˆt”Ñ„ï;ù0‚†˜¡õÞ*òñ±bs™$®Åâæñ–W g/µËŸØ4ÃüÍûRÀ¬A< /³y®±3Ñ­WÆáâ€Ð¡GØÄì_'Á¯{,
BR‰kiâ[’Ø5¾¢§VBØ£Z[úš_Wž4›Ø®âz­*–°Íi\¢µQ~Ñªœ=KäøÅ§›ÆÙÉÇCñ‰|*Ê9pœH'ûÇ˜TµJë¹æŠÌ/†ð[ä „Ó¬E~)¶§í¦3ösµÊˆRø[»x¸œ—Ë#,MéshQwÔ¬) „¢GÏð8b¦ftGûås/a(ŸaÿæÉ°Ñè¼+É'ñÃ.Š¾ Qt·üx}Bš²Ë£\´YˆøÓ­óÙaQwY¿	 ¥¬;ÃúúupÉAË”½yµ	¢!E§è¦Råã•qñ‡Ñƒz<"‡Þ¹ÞÍø–+Ñ›ÏªrÖ™–LA¦šIôBôœ|w ˜YˆÍ`çÇÜ@ö”žÐ|oûÃí;ÿ©to6>+0«±LÎI«t@l-öyðÖgÏx#bŸÓlY‚`o¶AØäõË	lr"[ª1¥<.VKÚ!e'±£‰<÷·ÌŠúÑ¾üÝdÐívÊ8ÑH3v«)³å`µ¸=ôÒ-Õƒ¦§áh–Z;>NøÚœ¹Iji½tK:Ýœ¹I°ñ^ºÅ}ÎÜ3Üuwø9s›hãÍpXzS¸ºž.Žr½ZÚN¹Áu©9LYýòWC!`^Í>D+Î—ßà‹4¶0vx^I<»uÑü¥øÅ¨áWÅƒá×(zM!X“*y€]Fl-5Þyq'e³‚¬æðY{. ÁX·‚ôkÙôq9)é›˜_fÓYç²E‹08¸ÖÆçcÔ¶fÍczÇ¸Ì-2Îdëªi®™æûU9š“¥uçRú‹õÕ¬SÏò	]çc|¡Þ¸
%w‰ÛRÃ—?|ucº8w ]»` õz¡«°	¨
¿ä£Í”›@¦ˆ6y>`Iš{`r#“ï‡A’îì9€¥PM6RŸ…ÕÛüIRsóG¨»„€‰§Jïa/¡eC«}Dþ3–ê®)ô–åä„>›½®qP¤wêÒ?+Æ¤5ÏÊn<N\jð9vGËQ*?¤øæO`ˆA¸
|tŸ*¿¦Ýå?qÙí?î¸éˆ®g­€œ{¨Œ½hØ:Ò!‘ k9bZÂ\áÑ‰AºÃ‡µ{£Ã %  hÒ{«æDG-Ž´ÈÐEÄâVÄ“×zPçh~¿Í¬ð™6ÂD'%Ü	5«Å‹†¿—Õþò6:`¨éßº&P.,¦²i OÁµ¶l7üÀÚÈJñœò›$P«+ÔnrXTKn–f%ãÒóïg„_lgŒ¹ê²Lµdˆø…¬Så[ŒÚSª-5Í{…	ÎÔ°¾aXˆI)66½d1c!ß¸%un¯³XcGhã20p©qÉ%HŠ<(qÝ/%}_…±‰–bç("Ð&¦c¶°}QaEŒ–ZH±`î¸¿)ÿ¼…cw«Š¡RŠP0nœ$ht)ÊfHp^{Þë¼P¿y‘%ë±ë$¦Ýq‡bŒªƒîâ°–ââ`ó1Æš(þ•	#`Ì‹;ÊsŠqŒÁÇÁM!-ˆ„ù}È_+v°™ÂÔ@Ô™ø$ÄÑƒð­-$œå×Þ·ëÄzˆ/´FÜÝ·p‡Û-Šg:Ï³Tu!vù'²Îèô‹«	ú»ªgU‡ÆéhN#Æ„D¶]€‰ŸfîçÕÀ4
ŒòµyãL]š¨Ãcå"S,<!|áDÆ@vîàU†ÓÎ°ä~ÆÑ[Ïï­ÕØAÁGi6õûº8Ï/-ö^ŒIdö–[Ù~ôÀce¢^­ì;RÙoQÀ¬Õ%	2eÉŠût•½Cì„;çxª.vtcm¶ñ*­ùD=tÄÓ= ½±@/”))èï£*¤WNÌ'‹oWûñ3Žµ.èœQ¥‡ÆfFéï‰‡àKáóŽ%’ì“'>®K;óJoôÜG¥õ,ršÙã8Nž;o…"úÓÞ7²	t¦$	SºRÞ¦wÔÀð$nv:øðPH}Ö”fJ;¡wFµ,¹bFU>Ïí¤Ù2&1&Žs&µ;¶ã©uØœ¦‰²3.Ž¨'7Oåž Â4°ÏUÓPsíÎwsÁ*ë \Cº>Ïkû½ÉGÔ>/òNšj¢+ÈåÙFÙÇÉ/.Ch€[…9&Õïá|$ÂÜ ‰„g½lwÖÛÙ²y—+õ5©?ç ƒ&“2Å¸˜å£¾^‘¿TjòWPÕ94ŸqyŸ0>û#°(Z	\5<.Ðvep`ôÕgÅÁ¬¨[G® wœ2ª¦Ã‰—E×ZûºÔs‚?ò¦DWÛ÷¶õñ¿üý<¥÷ñkæOœÎÐîaœk‚°Q†¶GxtÆhâ¢_7’4ò4cXMøÕË))Øu¢)ÙµÌ@MËÉÌm‘â®¤mî¹¿†4njþµÈ¸]ÙœU<9ÚœeýYÛ"£IL×i%%›ý4ŒÎõÑ«}Œâ§ÿ<€ö÷¹‡õôc
qGü\úAK^:ˆdúA¾1/çF)Q`-ÃOüU=®…baÇeõèÈ±ò¬<jtÂœ•6Ðs–ú£9ZŠC<ÿGÛë‰›ªôÞ<TªÙ¹ÄF†ç´c+Ò79jª!®%]ÔÛ(x%Ç‰„Æ1õÓçÐŸ3€Í†GTMÿÔÈ2!0”gÂ9.ã"Ä«k{l$RucÆªtZìdïø|ª_Û—ÑGÎIÅ+4 0·ßÁ	–·›ÈãÿZ	Ÿì×½òh‚™8ìÃú	Ítò@d:iJVsÞbÚ àÇCÌ2¬ÏÉò)ß¡dÙÎöÂ$©€AÌæ=4Š_8êÕ9Á…déØ¯©nDMúY‰ÑÇõIiD®? ÷PBcíÌòj°áÈy–š@ò<(Ï ,ã´£òØ>ýT"à„Ù2Qˆ9yóÅÌÔ i8ºÒR	9²´	44àÈÛë—û²ß÷Û†¨;Ö(ZbA
ó4i4tcÀø#Ø>‘ü#¸Š(æ"vP¢áZz¨Æ[Ú%¼L¦Ûè÷7ï³4[àNTYÀå“…	]ÈSŒùU˜6žp™÷w='›×À‡Ò¿„d4	Ú±ÿ÷[¿àY•ŠŽà†[ÈÇ/±Õê¸|nØ“"l÷Vq,\"žs×½á”X°L Š:`Í‘Õy€á¸<ñBjÆ”ú2ü+ÿå^SO´×og1]q’Ó–Ê³õh¼œ±ºZ¨do	-NòÙ–Ï§€Þ"Gî°œóMÊ(ëYx¿*Úpïæ…Ž»ç–ö¢0eýÖ§>|WOëJiG%Ê¬‘<(<\U—œƒÓ‚%£Q]æÏ%¸¦¸NÐ/;º3ïpŸK·ø~o2Ûùºa¶¹é=‰xItÖ›Ó;Jˆ	UÇû•ðÞó†²ø”Ã¦\ð¤]}'íÕ‹¿èQO©:”;¡ñ‰kt†Ô³ÁE€18RS/@ÇEÝR2ôYYúæv»Ý­ÊYÝß½gÅ¬*Z,¬å8ÖòüÒ/øüR\WÊ+Ov©Ì›_jÚ±mXSL{µnìÀ®ixÑ9>/ú<;š†°¢-¤WƒL_w[ÚÒªŸ•Gæ‘ò³œœƒ€I²Aæ\ÂSá:USâ°ñ[Bl·FqÝR‚ŸrÔ¹¶‚QÞùÞ¹]P¶°ão"lN"IþVÜÈ•lEŒ‹ÖBÍÜc×$Z®‘Ûx"å†üá9ÍŠQUœe,A¥-ë$øÝ£<¤ßtçÆª xOŸéŽû¤¨föpj®°SãçoÆ¨ðØ”¡
NÚãøh•Qy×Ãà_®È“}Æ1QûÔÀŠ}ŽbôÓ+Gå¬òŸUC²CUá¾ãÑÐa>N(DTµ¦dQ¹=n“	ôòºœ‘_Œúä~‘ *#Ò!¶o‹lÜ¥ïäÆñdä´kè¼èÞ1Þó9l—÷š¼ÊüºÎçÌgÿÁÝ7oL;Ã§;åÓ7o\
ðÍxøæKsø¦,žÞ¼Q1Ûª7o`(KXxP××ÒEŒfÉÑÃ“…‘†§çuUZdˆÑªv¿Áñ2v04:·ýfôáÙ1pw‡úù-<²kWt®î¼®†îÎË¯{‘q±Ï„ÇuIÖÙñ¿Þ-ûÇN{Œc³’¢¦x¾™Mæ ³ÉÏŠ¼WwÌòÃ1ˆPJ’c† §óí'O,ë„C“œÊ	W;ÍÞ=)žOó‰aí¬&ô¬Û»“–.Qméò©5çIÀaëœÄbÆ[ÅHs¡i$(H4nâE`àˆÄ2y<4Ýœÿâ¼€ãænú»ÂIgÃpû	½Ã¿<{Äº•‘ÿ¿Ã`=.xˆI"r¨S€í\{|GÃºdðO'¢EéÁýØNqAúÝÓ¤±Îæ4êg1[®HïsS?f-2"[\˜%vHãig}‰Ð˜õ´]…u>½eüÜ`Ž‹vÝ±rÅ•ÍúŽëÎ„&Ù¾·™É±@²&@…¹Lá¥¸¬­\mÇFú6È>LÂ–ÂaÅ£¹
yÒ½Ý’åj™j¬m"H»‡õlç¦OB-²et_²QyÄ
ávì(¢	a]ŠãA}ÈÅnŠMm*G7NƒÑˆ™w¹	xÈØ‹ËÙ¾Z^Y^nŸñˆŸó`i2 *F„|ãÇi¾KS"|'†Êr#|'Æ
–ßhe
ß÷fã×5XUØ°ŽKtcj,žYJæ–¶}ÍƒõJ¶+î9N_ËM£K0.`	çXÜrÑVá-·3kóBh)\îõ.¶?vñž¢Õ¾›÷½WÈ'…ía%Èªq_3‚áT3þ¶²Ã	R]¶Ã—×1ž>ÑÝ‰pK·5§øõµ5@¢MP¿zzªDâ¹=¹ésXÀ“|ôí£ŠPó{òGªpG/Ž’—G¹Q^0Ü|îwYLúhÌ½¢˜˜]€{È5}Ç»¦Kýâ Ÿê%HbL½blwÌÛ€?š”¬ss!
'ã<QÊ92bHD<Ñ'6’¢Nà,_‡¤Öuï‡ËzŽÅÑ%&ûˆ&<´]'îÛ²ÇVD	¡Èd_‘Ë%KÆe~¶Ã§:æT#ºÔ¡Ë¾)5%¤Q‰(vžv
'îh”ºÃðâ»F¸÷k&Ãí¬xÑä`ÊÀ]a'òŸ3Ž7€l\ÃJPñÅv¿yufB¥HMí™Ö„;:*‹Faò3&5±K3D£^-¾¤AÇJHØfj¼Ej‡	EhŒú,jƒv÷²›Ùî^J …Ï»û³"Jù$M ŸeŸìÃ¼»O‹ãJ«Þ%«p?ïZ<KgâAâC¡&ÃUÁ¿jË»¬Á½vêáq5 †Ø*Tš¦·š©ÞÎ«A«Iå¬QŒ–F³96«$â½Àzèéÿ6ÄbÅNíBd–#g¡Yuþ<Þ>ËþÒ¸qqš7Uy³6†ÕV99ÎÆEŸ-¨òFd]nÖ&ºyÞ+›¤¼i:<@×bdðÇ‚ƒ™ËEcfŽôÆ7Ë%SRT7h&¯6-›><µ½”¶Ñ¶Š„Ô@Ü©’Þ£â0ï? sÂ
nÄ59Ã=nÔ3€]¦oÊäek†Œ¾yƒ 4—Íqzóv¨L[¶$eÜÍÛbBgÙ˜"…nÞ¦â•máŸMZJ¢2PÄzÐô‚?€À”àˆÐä?Óu{A—­v TP“š2¾ÚG„	Ä¢_04i"~ÓâB7»ñr]Žqàòys1¨Ï%Áæ¶
T„÷¾ÈÈy+|eÃ!ô´á[áë¸aî"×å]#(1ÐwM£Ùy»†¤LKfžb“eG„/ºUoVŽF;%a¾êrº™­­dûÅ 6,gdy«qIpßrELhâb,»œÿ†.Ž †W)©<Rä8ÉÓ[1ÌÑZÐØd$ãQÎRI£2Q«¸Äs²]¹C9½0µ#@½V8=»õJÈ¨–>aëÒ Ì;R5cÔáÜ]w´_v†u=ÞWP3¢èVÊÑc2ü›ìWogëäÒZ_7RPÆtvž«|rÏeÄ;RlzÇðÁ•Ø’Éÿå/™;—Ô‹'ÆŠ$FÜ@åÐõ„[“ÛDªòjÆï{Û<§ôš¼õÁåfÁý¯'æqeA	QðW“lŸP"þçÕÁå´ÕLÉ¨æ\#‘Ý çÏ;pÐÆ)ž? ;îäóº„LòŸÍ«š;Jìç1klùœxd—pÊNNi¨Ez».é 9=«~êš\<3«6X§†º»Ç¢")æJ6L°ÿ~xª©0ã´§ä>±b¶dïžXâ/]O]ÎQôó<Ž½[C8,ŸrÕ¤•
Âr@ˆéß=±`„ÚHËÔÌÂrJhÛ·"&^º% ,ªìo4SsmùùÌwµx;
R¢JªÔ9Åð¶Éd`§Ö…9ô­BšETJH	ËV†mÙ5Ø2 ¬Ð2F"ya/¢(ÑU;×./Ý¢aè¾¦1Ï¾q‹ÜÛ†>Ï¦£Bý6tgè<Frà&#÷Ùè$Œ]súµwöj‹UJÂk‰$S°åDã osÓf´ð‚hZVÈ-t8ÈJrÕëãN
ê|L£IEk•ÈÓÙ¢PL±,nL)Ni¾¥–s$¤™öi¶3˜Z­Í0æb °=T³÷G`x+óÒÕ¸ý¥çqN]Q|¡=Úéåt~Š„¼CÂÃ*°™iÊÈ÷2Sw¸ÐN/¸¤<„Ê1ELãéßqvüy†áä0Ÿ”z6ŸôÈ;$½!Ç†7dÊÃlfJœÊ]}–HÆòx—°7ýVk*õñSàÝ‰×kµow'drÈk;˜nØÀ±è‘„¶•\„jøìÑ¡‘JWÐÐ‹aæTÑ ëi$ýs=å®G7Î¼šAH?7Ñíf`,W{£1£<ûíã†ŒîÇ`Öåáá¨ =Æ1&ÊŸP>)´„3\›bÖ–í“âÒüäå×=šQk’”•Û|Ò’žºÉIÑíG“äl@ ý«ª;ƒ‡H‘®
*ùéHz’àÜ~X`C–ì.`Éj÷É»Ô­¿ó®àÉÏáéÄ»1š×yÑ.HS9›™`É‡šA€VúfJ2÷tý‘¦¢ÆF)ÉåenyÿæmÂPOÓÔf®g>íØc ›d¡´&X°¨ÒÂõ¤J>•çu±N«4èF'6œÚf,­,èÔÚé·’ªO©ÜD‚¨Tð+Iù¬Ã½Få˜H"›úÂéuEökH£ÛLÆã!7€O:¹I€'n½û1‚/· •4ÇÐQÝ+{­>ü·¿’-+Ñƒ—ilöJvÒôF×gø´™©"iÂ¶dØ¤Wˆ–êY_Cr9*Þ—è]âh§ÑHšØ;6BÌMÐ?^¶•ÉUâÙÒ	»â9HŠœ®înRÝ¨Ù$Áº³ÓÄtëÎº¯'ùzz×ç˜ŠÝè4=1»»bòuÐä¢ý£¼bv†¯^ü|ÂS˜/pÓ8…ÐÓÍSí4:œ‹°cšËuO|7ÃA\Õ»¤` éŒFÅîÓ$ñf´1¡ÒûŸLFÇMV©–kt&’©EZÚÎÒ.ìKj›¼û–OÎ• yèÏ†=B£½zñ{=?jãCdŽyÚët	Áïž¸á(ë¨´D;»&­Tò4+«BÏ8¦¦!‹z¤ëObÿÔ¤vù=·/é,m4á™š¬y{”t¿ ÛK>¦rV;Ýú ³¾¡Š&5n%öêÐ­@ ÃÎKæ»Ôb)è®êh(•Ž=ûÃ
Ìàú7O†KÁNÎ0ÝK‰ì:ùcØwòLð‰n¼J+Û|
zò'•DO?Âî•%‡õÆgÅÁ¬¨[G:ø€•ÚaçXM‡LºIèÃ8lA¨FG(•¾a[àõPCŠó¯²8Ã»SZO#p¢¸Ä§3S£zcºažHzCˆ˜'@A•P<Ù´é~ôòW“MþGvoòòWÇdÉ¾ù'òæå?’˜›õP‹'ÀÒóÐ²Î»7 ÷Õ‹_L ™àß±µÎªj‹´ßŒ&¬É½FÊC$c|õÛ^ÚLQ¡¥¡á„RÑ"i±M¢FÅà¹±ªÐuUwËé2³xBözl”ÕÈ»ÂDy#]ÕwVäË)\:u[~ø’)§±+UûÅ}ôa¶õêÅôaŠ•¸?0i<@˜ÛlÁ¤bXF¥ YªîÁ~RH°×>.ê1ùfŽÜ/ßÌ‘QwÎ7slÌ;ôÍñx3GÆ}¼™ƒëÍÆ¯s`2?q{”ç¶dº©÷¥ÉI0ÂŸÃ¸L‹îž2žÁÀ†çÊoÊÓ[Ñša*£1•€îý	tÂE]øëWÁéèÊ©.‡»¼æ£”!=žx÷þ‡Tz]C¾kBt~ó›cRÕhÛéàåÿÍaúëé¢{ÙxGXWböI1ÍíY0ÛâëÌµø6õÛÛÔooS¿5ß¸·©ßÞ¦~{›úí×ÛÔooS¿Ñtju¶tj?ÒÕÕþ?   ÿÿì}{oIrçÿú)b`’³dó¥×r)Ž%jôÀµòf £bw‰Ý§î®Þ~ˆ¢¹î°w6à…ïV·÷Àba`´‚=7w»wcÏ‹0üåù¼OâŒÈÌÊÈWUu³šÔƒHì®ÊªÊÊŒŒŒŒŒøýümY.£ÚÝmpQWq#àíã{;u¦7Üµ9>Ý[ºÐDoÆš ÛH>åãñCQCyë%FõžSC•ÊÿtìOÇ¡Qy· Nšþé]¨+AÇ|jKá7ßê–ÁõŽ±@½CP¥ ›þ(Àu­ÚŒÄUB#ä’…?N„‘(‡/(ÓNIù>28T³{ŽÓ¼™y2‘d[ÄíZ6‚]†=ærs³Î÷zÑ“ø&
+X2š®v­?Ã&kµ¹õuvûör«59©JyÄZyvÚyÄõÝüðÌÀÛiíQ[Ü„X¸RaÁ¬e¥×i6úS“:9ýpþQYL^dñüð(Ÿ¸„ÚÌQÙXj…¢h‡(a0Žš!c\Gä¦Á@Vy¡Šg­c=¥Í1èlÊ ²9a›S¡°É9},&™XdÊf)™=fÌ1Ç€±ˆýÐl1¥0ÅŒ™%fl1Çe‡)›&“¦à]Šæ—…ÌŸŸ¼{PDÇáE™¥L>”R¹PÊàA)‹¥<þ“2¸O
ðžód$¾“‘'‰1L£qœ“ß¤|n“axMÞM÷s˜‹¿dÌÜ%#ð–XÞ2±QæKh•xVyU(•Í$3c0'“ÊÇ`R¹Ü•‹9`ôEòð†ˆ-Îw¾G]#pLBz`GÁhOå#‘)Ø:åx·Ö€œJæÊ¥ÝŠ#–Á„ð—à†ÎmÍKiÍÏ	ô2˜”SV0etl®°œ€óì 'ä8é‚Æ~ƒ'a¸¼‡J)0'ºêt“ 3wORoì©äUµ“Oªz'8TåN>!p¨êBNàPõ;é´À¡*w
™CÕ¯´ä@s#s<9xWŠ¼ÑØ²ð–Æœ…šÇ‘Š7Rfè—FÎvúZý‡ï"V=üÞÈ­{óâð•	g4&+§„´:z‹•¹µ¨[s ãÄaõÛDóYv+K¸á
h36#ß>·­á¯­ôÒöä$y?YÚmbw·×Jû‡K‹¡<;¯™¬êZ-ná	\gñ¹™
ho„œ÷+,Äêa»@—YŠPŒŸ0þ–üÙzŽÜ[Žˆ­\kÆ] IäÍf¦8Â
Iƒ´‰gÎ;ÖºÇ¸ö†OÊj¤anEêK.-E3°1q¼4db• “³ç‡ßGŸ¬ÌÕ—œg¸H1¼ŸCÁiê«ÄE:-À7öK¾HäXŸ× â(Èí“2¹œTjÕœI9…q1Ê‰´é&ì…§ŸÔ70¦÷WoüÝ—ìúÑÁ-½T½
ÔB	¬»š¢W9ÕœÕ/hn‘Æ'~Ó-r§0¥/sÍÿ2NYVæM¡µ“8TP×Í§…””·à™¢zÕ÷«s…±Íš€Ý/SS]ç7lsMèPUàúY …*‘qyÄU
Mp§¦,¢}FÅ¶ëaW@bÏ_·ß)æJo£VšK×–Ø§§¡ª¼ÞÁƒÊ.y¦¬Þkee,0ÊÓVˆ¼‡*Kj4¬Põ¼yñÃwG¯ª2¹°ÂÀz§*´âç5¿nQøj…÷N),¿_þ-ÔX¢ÎOü[¶1f­¹§—I³Œ=xó?îÞfîüû»'«ø\¼O¯Öó{/TžÞP(IëF‰ÎÓ}{ÕžnZ²ÚsF©(„Ê×œ\ýQÿ¡™ßÅçnz†°w…t7(Cˆ¿Àqåßß'(ÅçÏS4Ýa4¬S‰b*wDøæÜ!(pšÝZe,œU3im­ŽÏê´ÇûlQ«¤ëL4áŒG@1†Nv+´Æ{ò×›@[ù¿Ùg|&ù‹ûŽSò$'–;­NÒ%BÚË™a²Ê™jz­e™”rAàg¥SÎ…ùr§’¤ÝQ*]šç+šlÅ.×ÔRJû ÛÞd|ù×n6šñFhzõ8î{f!O¼7@`Å4 »`°²g˜‰Õ»àì
ûÓçÕ¸©¤oây„;«ØTä!{˜÷ Õ‡![ŸgÇ7Wä_g·D:@Ü)e0a¨E¼ÛÒ¬?òÚ–	eã]£ÀÄp îù½:aÊ“•Òšôw; µ\œ&X£&¾Í:Í$ªÍ¢=Ë§î^?éÆ5c>ck‚p
UëðµûIlF[q“Õû­æÍ¤[ø©^ZÊµÆ¶š	H¢+cYf¡˜hXSa“p`3ÏŠÞèU# £_0ú¿Â¶£ ñ>¾uÐŒ$IW¾ ¢@ÌP{÷N}f¢°ÿºÍ _Xÿèà±ÖáË]ÖÄuïÞ¨_µÌa7=Ú„Ú¸™$}O²#È¹èˆ°ÓíìÁhÛv2ÜÎ·FÍ˜›ÔJ•VFÉin%E#‰,…eÌ\ À\¾¸`€—ï›Ä•6Í2ÄÔ-~Ÿ3šš[¯ynîãÏ±Ù¤z¯›ðWîñJ®GíøÑÖÞ ír4>f|”ªˆ[°gjq'êöVžÛä\ÇT“vD¥–Tp´WáÍY
Þ»_ež¾·’)ŒWÛ˜È5£¬G~hå!ÕÎþ­/´?`Vž>†Ã3®uHOZv}•Pf÷³Ÿ¾TŸ¼Ù*êÓn7éâÝŒÐ8¢­Ì8êVëp¬oñV¬Rç´>i$§‡#3[ñ&îù;å­s‘l¸Ì9KlcÞ”«ÌSú’5ÞbÛIw7p™{IiÄŒ¹•_Ó˜[ìÄ˜KA÷i²‡oynßÌj‚öO}LUÚžÇn¤?!;pÐÃïxEædˆ ónãsùM½Ì&£^u’ý‚MòQŠ_MxuJr7Êt¥9#Ž:78'Âêu½ž5âþ¬[ ‹3"‰S0êÆ_jU¯ïäå±;ãMšÍ¿ŸØ:b¾îá-6õo÷â=ã4–(/8E¬u›ÜÍmÍ«â¸X¾Bæ‰î4HÞÀ€øËWoäLz[Á\	wÐ‰*ä¤|˜¸û>‹¹Úù!x'ÿSàMä3ðCØ¦PÀˆ`ÉØø}ÒœðT®•¢~$Ú}Õ Õ–*¶‡ñ©±ŸœKÛð¼÷-~ñvÞ|ñi®«ûƒn;½µx	üOžyX©TÔÙG¸|j*ša[†Oj=@*êè¡ùˆóiºÚ…¶‚…äx	0E“'ò¾ÐBÀx¨Gñ?•~ò`O­ñ9v*u‚Ë·ÜËU%‚—“»à£V°lÚXÙrÈ÷³€7þû6«CÞî2›ÞF^5/åLˆÐ{è…FU_xŠ	N
~¥O¦à5÷>rµÂ§ÏÁrÂ5(")jè	Qd9ö“¨×¯Ä0NMJ”u7PžŽ^ÿm_çÎˆ&RÿˆzÅX#9¼Hš0MŠö¡ªJÍÍñE,Øm}†ØÆ€<·Ì&Ö¯}9©²p…ÝÝ¶¢ÿÐf›uØw†ÿ¿Ù`³«ºŒJ’U‚æ»Ç&02dr¯œGDbò´‚Ì`úýô•|wUßäáü#q™%ÂRh´ïqrcssr™¥…:mR!mOÊ´\‚÷GJ­¾Âà¥TEÈYyÆxrz<Ëé~»*ö"„ÅÄì.ËÞT¹]*KØi#e¬¯*ix‘r J¬J°dôDöªz	3w•”»'“AUkYX\¤äÏ0ÙS–Ó©žV©µÏ×UŠæD;H„ÿªR6š)	 ª˜ó@ß³Žþö>²«¦¯›¤à´hâ+¶‘¢«cïEƒ£Ã—ý´Æ"!<Fû¥Þ ^®×ªX›¯Uì¼ûÉ»Û°ëù7¼$ú0˜-½±`Ó®]ßý´5šâZyé¾Ö„d¨ïÀ€úâ³/*ƒ~£Ù«ü›^ÒþªŸ|…~±)­ä ’m™œ}ÕŽwÔ”`ŸŠ:@Ö!ï¹³5ÃŸ:Ã&n$¯6’¨ÿÕí„ÿ ×ît°?ØŒ±ôc^
ÞN6’¯>Úãb¼J1f=ÞÙø™LàK5À¦ Í©<oöž?–wJ²7¨‚ÆŸšäëÄWRŠE:jßIÇÎ¨ÑYBÄ82IIeÉ€A5ž_¹T—U¾¶Ñ†÷”Và}áÏKS©â:®ò	šTqM*¶òõ[•&Ò/. ÃA^C©ËäÐ—¨qö#6…å5uÑNâ*r@=ˆ’2	üîF;ÌÏœŸ1ëÏ§ãßGÎ“¹^÷†1í"Î~-Qnl"Î>ã+"ùUYæü>îLLŒàó|ÆReåŸ„wîwn$;Æ^{«‰£K¬Îÿ%¨ÚèïÎ.Í¾/uØ"Û”‡Áyå5ù½†½ªÎZ=~ÖMÚ÷;ø²¡
yüdE%Í{ëYðê£=m´6T×‹A+ï!bõmç¥Çã¼äÆÎ…»ÙÑkÙ["™{uÄ›ÝÚžÝîFµFÜîÏö“Ù.{ÒMZ––wq2Ût;Mh!©aL%VÎe…élåúÌM˜·Vm¿óf…ïYìË7[ü›4îÖ°Ï›¿hâójBn¿{æ€éX<¼Ðè¶m´h€ybõ‹£ƒ?²æá?±ÛG¿a½^²7¿Öf€È`lìÈJÜàã«Ûèà€sÂRß§Èß‰kAËO«ÖG¯ÿy \J¢Â˜¬|ËÐ†¦g0¢ÊÜý±ªQØmØ&ó‹èN7êŒ&L™tô+bÉFËG[½¤9èBä“>¨¢¤3»0·ÈÄ6é.Ø™½€À‘&–[ yå†Z.fÝ#êf=iò±|ub(°ÔêaW•J%™NOöÂ€Ý	HšçÑ7Þk-Ã±K·³¨*#ÎvgcÐŸ‹.¹îm¬?{:¡»Ôö¢ÙwÉpãÔ"X¸Tä‘Ëní‰o6ÖÀyoiÁ@
”xÆf·±½mjfìÒÔ¡Þp» ˜ÐULóf!ªs]Òä¶wÔ5[òêEv=U¢¾`+Ï»cóY2lÄYg¤×¯ÌmšÙîž¨ÚäùÁ
ž{Þá*ef"‚yØQýÞtÈ[‡_‡½’tÌêMàŽ¡‡î	ø:°¸õ)|:ËlñX¬S_Í°Fæƒ\™ ÂèU¦×Ba€(ZáR. ñ×¶ú5ÍfùÃ×Š‡µÀR¶/ü[ °3Ó•NTÛèGÝþÔâ›œÏBh7ÝåêßWÝö&·€¾ä‡²ÞD\øÝ‘?Úƒ;ìÏ~´×Ú¾Æ°	ý*HŸÁŸ°¯”~Ï•U!Æ ãÕ™U+"¸™è?±¤¦6†‚WÊ"ÇÒ³Àµrv…à.éÏ+6—¾ÓÐ”ÖÑ.W›¡W÷Ô·ÌrëQ'-É¿—?e…›’´¤¹;8LƒjŸóð­™w-î_ÝÃ?áØ‚òË[1ã›;¥Ù“¾Uöý˜÷ÅËŒwÖÿ2ÓlíÞ<ñcv^£ˆª÷<\\ÙOXUÒ¹ÌÜÙ¸6âƒ¤û¬ø³nÜ¹ugóÚg#>®Úm2Àå=f,“^lÌÊÁ#[t>íæÄ¾{Êd)Êºµ¨¢7S;U€·#Ž~7†Ñ}nÐ©Œ~%Kß¬ñùB¸Ð±a<­ˆ•/Cª½_ŽSÌ+N26ªÃhfDÞÛ±ÎÚå—Æ7¦Ež«BÒ_«cD£=êºÐjháóc‚!ZÜB‡¼È}q–h%<XóNÔåê´V—t•ôÃ…… ‡ï0—uš\ü€„Zñ/#‘Î§".³–…¨‡E±&Í¼~½@uG#TÖùdÄACÀâ–7¿ŸV:ôì,Kà¬{“M£o	5éWJ>=ÞN-³÷2e³çŠäV=Ÿ õD*u‰Tª(5ï‰W¬“ñ‰×ªað‰Tê
™¡6þ+¸ÿN±^raH©r¡µêˆYyýÏùÜ»'«b­:Ky,Å;¢º¥Á8¥«\+&CÓBWÓJ¾[Ú¸Óå]«Ñ†´Ã…ÅyCc´ûöÙÑÁ¯ªuÈ¤þã©2-Ù'¥bÿ-dbÿ“ËÍŸtemc†!—†×“çVÒ—ÜulmñE§Š½XÌvywŠ‘Ë»ÎmÖGwR51L7§Û‡_'æÝª–ñ­4Ò.‚2s”¤R42"[ŒH‹jlHžoº˜Ã­
¼Iÿÿi¼¡X»|Uú‘ Õ†ÝQ"e²Ñ‡ñÖþã2ˆÂ¥N†a^Ÿ}xáJ6å]€5V~@Í\cá$Hòð…ÒÈÃá©â†Yíå÷†ƒˆX¬\Ì¤_dÈ>5»Ã[³—R‰OÚ_õË¥÷ÓSÿXTÉÂÍç7Å-™:AñBx÷…òòåÐˆ#s8íE³{žŸX%¯H£ˆ¥ZP¶k&Š‡gcC+€€ [|ŠTáË– ‘›û9t©¥7‡‹è|!›F8£õl\dñvEH‘ßŸ·Í¥«~^5>úíÑÃÎVqÒö¿1‰Íö½ð›cVeÒ”- ùÈ¸j.»¼ éµòÊ¦ýe¥ür—P.…=E¥f™:Û
„ð¥7[ŸæÏŠÎY–ËÝ²òé®µµ¡7š[]4 ”G»"2;0—ÆåädIäÉ†HÍ@–é’¿
3FÐ~Î­P…) AÓ>OVý”eŽÍ0jà#kž:EÙ}m 6™ÌNëIÍ¡t:ŽÜ„c*ö>e±E&÷Å„ñæ@*x½Ÿg»ÈùQ>³’§[1ýá§|mú»NºB…üÓI+ÏØBåcx’-ãi˜ÖùÔÿÐ”t*-ø¸IÿÆX^åÑèñec^ïZ‘#yüMÅ¢Aœ›—âÜ5¸CÙqp­$hÄ½¾X€`F•,),P[*i­»•P;ŸÔ­d
CjÔÐwÇa*Z ŽÄ);ž•lWz;†[Éšn?ˆÁUyÎ]$GA,+&/« U8lô‚­zËà!à¦+ùAL®“U&TN 4åF†ŠœëŒ©Z'×æQt–7!2š,‘Nìù³¤âAØ3ä’‰¼×ìÈfƒ;¡)Q€L0¯ò¸ó¦
ÙƒV²s.¹$:Å
ºÄ*âÉ(–º„r,NYÉû½¸ëÉzŽ”…"dˆÁVRIÒ*’¤sÛ+ÏËÈ29óïP„*ÓßäŠ>7¼—îÉÝã‰b1õ_1œ‡.×bÒw¦Eå_2´¬Êœu½tta¢»Ôþ÷Ût³úXÄcP­,?¿p*ú/­Ÿ³Ë÷’åîêž'/_bY¯îñ49îuxQ|G‘ÜN á1£Ílÿ‹ïU‰cq÷Ó»þÖÊÁø½²t4¾uo,Í¶Ëcxå\Oc9/>VbÁaYïáÏöEß©ß{ÏžÅV¸­w#îó)_‚N›AÛàªqÛ/~C¾ùÏzwòêž}ÄºÀ©‚îÍ£ö“IºjI–UXí ¹_œÓÜ‡“ü{ejÚãåé/ZP[cÓûªwÎ‰"†}c€…nÔ“«áùKžˆV%cEÑeëuâjã	p~,wi¶› ¢ÆÃõäœa”=ßíÃƒÅ1;%;§°)Å7Ýp,€>)aaå¡áïÔdE‰Ì"°ýHèlê¥÷?óà±)L$Ó»‰$àßÔT¤_,Òë*táYk-­‘\i‘óâ@Š_ãöó`Èaæ-¼/ô®B"5§-
ç5)¼ÑN)&E0>A<1&
àÄ~˜(äEÓàaÉ&F ÃD¹–X&æ-€R¢E¼@H´@
T&ŠøqËÄäVíh­¬ƒÆ½¨÷˜’þmëÆÏâö V€KøÃ( îqÖÅk	Lá»ir€ ˆQN>8>}ò„Kò”W˜ŽbíœÌ"×CÔ•¨iö#ÏüJ/±d+ÿCÎò‹[—-zùW8A¹W˜ë¹ÅÍéÜÒ¦œˆ Ðcàp¢ícŠ*u@™z¤Ã…P€œ±J¥¿f\á‡ìO§Ï3ê¾Ô}ø# -3öI-Î)%Î	Ý×Î)Ò«Î9$ÍÓSÎ	Ù'Îñ´õõ<ü—OÉGÏb©ã£Þn»êÕôâéµã%¹ÁVKv”ojRp?Bteµ~ôúÿTÅŸ6kŽ^´PABõôBŸ°MÂ¤†\Cðý7|BÞ::ø-{vtð»†;ªô…`»²*Ó)þ(žêww-!W÷¢]Dø¿JdÍœ2…>t†ÊøèY*(BXY2Seˆ|ŒÙ*KÆàcÌXYB=kESÍ\!y„™½Ââ‰onâ°vÐÑYŒ”×‡uÑt&#åä1]HÌf¤Ð§	”"Çuaé½ú(î>‹»›·r£VgJù÷¢Œú¹9&é¶(ÏG;QC	.7»a;UÛša“¶%7‰Á`…Í˜r>MŸµÁy½›´Ži§Ñ¯³„/Ð­Å€D?„¡Õ äÞF¯ß#Jmyås¥ª›==ü@Ãø|¸N7j=cœžpk˜À+äÉ	¼*0$¤oÇ›W¢Õ‰ú­F³Ñß%·ß§ÛÁöŽœ¦ö6Â}K²±±ÏªQ¿Zçs ?ÍW;ÓNû$ÍXb.O@/ƒ¯sžðeW\[ž‚;‘‡¤óž2ö¨‘n°”Yð¥kTI§Aò}P[…-R¥pÓÁºê×ð-èD™ö³NÜÅížÍÝN\¹ïÆµÍO}"¬qÎ¿hp]?¿-\&«•°åòsj:)ÈcK|øã‹Ïv±æ¶ä³ºü¼épÿxwþýWÄ£¿4Ï¶¢êÓZ7éÌn5ÝY#Z ˆö[<Q×õø¬)°GýØh?ÅïàÇìãì%ÖÙ²w‹‹§I„Ç±]LHÏ¥;@l‡ìv;´¼ì„"Ì‘Ý¤ÛpÌLâOÛ4”‘Ù+›ñsÑ (‹.‹nV…à"ÙL_y‘:<Žä½xŒ™|`¤2ÃCGÊìœ°ëVì%~bd °ÿÿoÿKz"iç&¿íMq©Ã};v,%ÝÉÄœt2¾H*ž1‘„Z\˜G­a¥ŸÔDÅÏlæúåtå”©—mÎéðR”Œ –BÝÑŸÏÖÎ ]Jã§Ühÿ 8.³€1H¾†à"´SkÕ:o©”ÔG¤l…,G‰áñÓ£ƒï5ãtnþeiõ Y)X|Ÿë”¿¯2T'í“«Š'czbõæõS®À­[§\ V8å*l6žžr€â”« Ð§\…B ã­BD…ñÖ )?N«J]«è˜!åÖD£ \’òæ—§¦£UkÜH¢6fä¿8¹š(”€‹RMËÈÎSëJÈ®QÂú‡/«ù
Y¡9ø9 Ê§†5æ‘Nà`¤•7.¼OûAséâ¼/‹c'<;Íúü\F´åÆ-p-»K ñâ^ ¢¢g'§.<Úg³¡“óò«=£rf‰T~jµ0—E•ø"ý)nºÝ»6Y É»H :í‡‘ZÜJš¼l68A»
NQéœYXÃ_hÐ‹»p/x)õ#Q?±BQKl÷%kyÛÎ:_R{nÍ±¦cèäUÞxØK7ˆ0f@Œá @IVÃ)2”BñÈÁvŸÉ»h÷‰Õë‚nâ_¾]vb¿¼1¾ˆ¯"r!kY(»A~/Þ:	šàn|¯t"Pgºf.–ß°—?ª>2Q!°³•µ->$Ó V\4Ô¼ø4bÆÜUëDÝ^|§ÝŸŠ+ý¨»÷+X©iì§ 6¹õ)¦^(Â<ˆ©bÜÉ§»hã‚³‰éßc•ÌÌv:S#©;
äLiàÇUº¡Æ¤2èÎú‡­0J’É3uQ¾º0cÀÎ”~\e¡šiLªBGÖ|ØŠ¢i<Så«	;öóLQàÇUº¡Æ¤*htÝ‡­,J’É3uQ¾ºp"¿Ïô~\}AZjL
Ãˆ±ý°5FYby¦2ÊWEð ÏT†ï>&•aDÚØ*£,±<Så«Œ\PÕ3}A³^Æ¤,t¦Í‡­)J‘Æ35Q¾š°²8Ïô~\=‘¶Ó˜I£û°5E9ù6¨Šãx¿š)‚Sç{rY~NÜÀ14FAÎã"8×†Ö(¦Ríw¨öpþ!Ž`Ãïž¾p‘P¦ñÇår
áç›×P²=h'9ÉQn%÷–ÌqºQÆ4ÉÑlî÷d–#Êh‹Wß§ŠF¸·a{GÇ¸gö¢à6o•ûi ÙFcþ)BÃû7ö).º=üÇ$‹åj‡ñ©hŽ¨GE„ÒÈoE
ÉwI{©h”¶7Ù[ŽM{Rdôð3*‰µ¹Í$ÇBTîˆ|‘"â<ìX’@&Æø)4rò†ÍhãÁê×ÚR›%ôµÁn&ƒæE–Œ¢¯S cø!ø'-ŽIßÐ‰¶eòO.:{A1ÞYø¤Mm„P°P ¨!‡M ½]!–¤ôS”þ(ýXÓ¥AŒB‹}k& ó±Ë'Â%›B¨Ž<¬õñÿJ$-PãÅæ©BÍÊ?_¾¬
d–v¡ŽÈe;¢…‡ë5öà„:Û2ë¬,2ÐÏºGìD(§Ô>¼}tðÍn¹½W¢3„Œ"Ãu¿¯ï³iË\JïË†H…ÊEwÔ/õþ!¯R‹ùRy?
Šß
Tq1À¦†4jGŒ
\!Ñ<ö´˜OÎàyÂøØê	þÔ¿jÌÍ$é»˜I“±1oÆíš‰rLÀ˜pŠqš))Ówµ¸×·,œáSÞ•‰Õ7¿>ü^$£KP ·C\Žxqu\5ÀÃÕAøPÔ‰zƒW4éö×4ž	D}­Ù$jÈƒìÀYo°Õjô¹Ø÷¸ñÊø¨bŒ	<«Ÿ]Š:mÝø*û<ŽªýJ1•÷$(´€Š–8Ñt8ÍàSÅÿ÷ºÉ“F3žáÏÇ[~ÿœ?¿ÏÍgŠY^ž”,òjˆ¾c£(ÑSO¢f/¦àÒ]Qá—ðêÏÉãÒÉIÏu²?è•òPkù™í¤»k\,™Wÿôèà,
á|wº×m$ÝFß¸“:fÞi³; `ÏÃ?´ëâFô^¼¯±_ÞFýta¶m„n¼ /½–þÌl~Nzúyâ·{Õ92EV¾¨ÆMµ@‹ÏÓ¾Í~Þì4›'€øðßäƒAƒ5ÿ7|€C}ý@Hý†ÛÃÿ)˜éÿ{vø5kü¶ÁjÎÇRTø¾ïâ *€Ã¨VtÃjÒ:²FÒ ‡Öx˜œž1`
q=¶Ì¹%§«âÝÒJ@i)cºŒDR¨#Å'-”Ê)ÔÃîZ>Ì£ƒ¿aÏùÆ›îŸ&iëwjËø·2hÔìs˜‹-OÇðÝ. úx™ªŒO*à}PÙçx!ŸÓ;Íh×8»ÄHôÖêCÞ3øé}jq‡› -lsãN
;M-_VëªÝ8ˆPj4A>’©@ñ–?,¦FyJJ…uÒRœDY¢à™h•·xg7Ø.Œ†*üß¹œ¼fåÚçŸ
ÌJg„Ø•TWheVZÕ	zØ³NwfÝ¯QX!Níw›aZ/`Y¢FÒj/“ï WO¢jQ¹òÊ¬6EêåxÅüCRžÎ‘Ú"è»†ÄêNräU½|&t*¾Ñ6J¤¯;JÄK-({Ûq_4¸àÊºÊ¦Tg²Jâ°Ó ´X€ ìƒ™ikÖeÇê%áŠZ[qW3M‹Ÿ—éŠM— HªHÒØÙÒÉtÍfô†v ß’ÖO1týÄx‡7¿Žø8)ø¸S—¾þ2Þ =_Ò˜•½€=`²ßAyÀÒ×P.ûüd¥¾ŒUÑŒ÷yóÖ"9o¢Ý;RŒÇTæ;ˆÊÙµ¯ÅO¢A³ŸVTBpü)ƒ%Ú¤	ŽAUÄ…Q’ÓP^¶fÕ$ø;eC…f‘íðcƒZ•¦(ñ÷µÛ‹è€‹†
 UÑ
 ¯.ä‘:q9ûÛN!2‰¨Iu´ôäVŸ6ŠD˜ ÖïK©Ï Ÿ›—â&g—nÕ–ñ{7ÙïYÎDfŸx¥¾èlR,G`6u!»<(ÐÒ‘AÁŸµº4 ZÂË6·Õ7½èÙàXYçS{´¯5ºU…YÂë’Í/Ò®Ç7{¯ŽFÜmmªþ	»Õàê²Á~>ØE”æ\ÌÚbg6ý\}ÑêŒN³øÙb­þì‚±*¶Ü&V…ýÜl-ü¿ž½þU-›Ì²&¯,lš%X)nu¶·ÿå[^]Tòð¿bÏø¢´½2×1„Ç~zÎçmv½ñöz ßÄ–ãÏDM_„Q|ÉÛ[|ÙÜ"¢ëÇ7eeaÞ@«‹ø”"Ð«FÍ˜Ï,•ùÅG,âëég±<öã‹ù¢‰»l‚‡‹©ÝíÚòŽ ;&olIÀ½&7©=’‰7š“°çWŒŠãWˆ>à‹ag‚Ø8r¼yôúëŸ¼þ7¶ùùÑÁïÙžé³&®jˆ@œºvcýÎÝic{Õçc$²a:^í¿ÝmÔüú¬ÇeZê®{–E¬(xa+tÞÚE|8a-êÕãšš\ž]Ûßk’Xºc…,†5s–0 »‰©f	1ßU”‹ (ç]¸ü¥Ñàò‡TJO}´èÆ÷ƒ«Ô Ñvšûå PÏü·®ø5Ú0ý:C>Qi\#âì6"csíùÃw øíÃ¯A½ªö«ª FÂÍ^O-<ÍæçõLOè#ö^`î`ã:Hÿ\fýsÉŠðq†#‚‰vãŸ‡ÁDÅ¨DüP^.€J7´ãß–vIØaÉ+U¶&ð0hUƒÝÒöT]2sL×…â Û£âˆù/>3x¤ß]¬ÁQwÙ+oP¯vE[½¤9 ¢ë¤dÖ`b!X<0f aFJ"`,‚¢v£µêð± #ÓÃ5›Éâ%îž6„µB·*r³œÀ¹H7Ýd¼ÖDõÁEk1é,„¡k)­fäºV«Ø¯ÊåG!Îöì…#Jº,ôï«f„ì™Ž )-dÞ{ï„òà§#áætØüorÒÖ?5Kœ‚ÀØž¸	á´¢õm[x_Ñ3o+ž1Î2æb¼KhŠ¸äŸ"ÒÕðœ!nH\ÐxBˆ–¨ñ¾/†Á;‰1_†CîzDŽ>³1œ‡'ò?eØAí;—¹¢»l†rš.ÏÊÉl[¹ß‹»>çæ…bÌ?²2¢t2×ïYµãbèòð¸Ž-k<9QÂÔ&W^ðÐŒ:ùÞ%?~0ð*WŒ Fª€}Î®ªÔ#zó§×ÜŠ8Ùe`øßá/ìÛªŠ„b²¥#|2ë”ÿ=œ	Ì´_C@âƒd¯=‰ob;Î,éžâ›¬ÕæÖ×çvù‡Ý¾½Üj…2ÜÂ=eGäçÂÃôŽS0ÖÕÈh5°”ŒÐQÓ¥doÔEîúáS{Î13•…Å×ÉOøt{Í~™E&7°ØÍµwQaX}óÒêñé	Ÿ›¸0ûp¾21+Óqe£Þˆ›µµzÌÁ\¿I¶5;u¡T7Œ!—½Åaù{ àÌE·®“q+<÷<Ã*`ŸÖ¢QÊz”)G\–Ž²ÆWºû©ÆWöÐ}“¥³{Î5eÔ›¤äÏ{äe-S&ãÕ¬ª~À~ÁSCèj"+°+:’5±
[Ð{¤Õ¯ï3É[6›¥­RÓ+¬«L'–ö]÷;QSg×YÚÓª®5[qŸ¸æKh¹dF^‰GÆ2m˜ÀD%–`j3µjí	„(ÜEžõpÈÅ">îj>ÓMêë—^ï‚ívôÛãa
ºœ nËá¾­f„nÖS–SXó4Lf_LÂðèb5tÍ~Hu¸Ùbè•LÝDö®€Þ) ³‰m!{sÉhîAºFÌ‘FD3šî$äyÐÞrì íýÃ=v÷6ÿ³Éîñ?¿¿îúÿ|g’ë™Iz€Ý½uíË@ÞSV\w`˜8ƒÄv6b¡is#À¸SzÎ4ôöæ>fwã¦Â+×“ZÔdÏ¥¥
`+ ×¦vw‘HY˜¸×’ÀÍm-2Cpÿflx2‰„uTºƒtf*û²>»´hiò`¼yQƒqî‰7V¯8·`-Ÿg[ÝÙ…KüOþ s1ì"(3ó¢kf2×Ú[ÅæÞ0Ÿ+ôÿ9XÀžöúeB=å­£ƒß52Hk=
Ý¹£6‹tÀOtÜ1“U‰˜/øœÓ?:ø{±AÊh>„"BîaŸÏÕ£ƒo"`«}9Ô^©3/\anÐ@P¶RÃÄAãA;ÒÝeNþîü(þ 9“ÊJŠxË!ëÌÿ`Ã5&«{Ã‡èŒÃB›^oGsÊX…­¨=¾¦ôÄ(o8Ÿ ´˜¿qjí}-ÊCð/aW>‹¶b7³wôŽa­&ì†’0‘•9|†÷é1Äö«Üs+Þ&KÌ'³¥•H·–÷ÝäSÉ¶¹C¤˜ÚS½CgMb&¹’B²î3|!âÁXëÐ²beÎ¨]æxæ~RIÿŒŸW¹;|äÊŸ ™3ÈÈ—þRµ„ÒCÜðÏ»\" (nbUñfw·ßf=>ìê >Ó#Þ0Ë:rZæÝB•.ªtßVŽ×(};ÆæúÑÁ·Ua°¾`ÎN{èQª¶3FiZäl”k”ŠØNã9’ô“xU+xu¤Û­E‰ŒÇ=ùä÷¼3¸Æ5´6Iú›¥	Ž­0¢êÔ¹DÇÝ«jËì3s|*Ìu ´ÿeû_±ZÊY\©T¼	ì£Ž,µŒ#‹ÔhÙô¢ùœ¦®Øí‡û cŒô,eÉ½G(nëm½ÖÒ+Æ°ldÁ†±’¶[Ö×Ë	 ™¹éîk©`)ºPp¢|¯’!ðë‡ÿ—¯X_¿bOÁ"!Éd¸:ÅAEÛPEÓha¹r)UÒ’©²G–MÏ¡ÌUBºQ½‘®È©¹PÖCfÀi.ÄGYœ9ÏÉžÉ”vºÃaJ¸ü'§mý>Â`ãØï¾è¾û¨‘ÚaMP<n;£=YÞùwëèàwØ—‡uŸ­½þ»ûèouµÎµn7Ùù^ží®È|û%þ¶w¤Ý´ð€6èÃ†ÇUlV·r¶Çõüyj»[§ Jàyø{ž$Ê·Ð«#dNÍ›F0ÍtÃŽÛ÷J·Ãckç«íÎñC»_ÎWãÖ#;s2T–1&N	Û':riâ„®Y»µ©Eä{=N¢H¤kND:Â0®J7`~ÜêJýBØè‰@³ 9WæêŠyJ}ÛÅ`A7ãÉN0e%£tö‹Ëõ3žŠaÜ³n6#^6ÈÆxÈ2Îv.eDìì=´³­g¼ùþfð#‘% 2Ð=9²b[8Ñ˜A îÚvÍ$ºßœÝ"{TÄçùiÅvÜ}ù(¼éNA @¦Ë3Ø6í)7.Šœ”Óg«æ1”DÞÚÂüÅÉ¬ç-ãóÈN¹HgWIšv6ëdàöûýDÌèö•¹­àæ¶Hìs‰ÜõC”½î½8Äº÷‚³îÍñp”²êÕ‚ÜŽ»¹Kà»™@*"¶vY¯rw±vøííìÕovd›oåKbfNiÕë™¹ÞÁU¯³Ôø€×»¹ÜkA1­nx"W»xBŠOcik\à„üß¿  ÿÿ ‡ÆÂu