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
                        <xœì}käÆuè÷üŠRÇÖôØÓ=ïÕj²³{ç¡}@»£µv$+Y»Ééf–M¶Iö<<žŠDB®qaA´Ö5;üP‚ ;0òa6úóîO¸çœâ£HV‘ÅîžÙYk	i§»IÖãÔ©Sç}æ;£0ôÜ›ögLzÝ˜¿)½3{"ã¸iæÀvÙ~Äàc·ëÜÐpÃYöúë¬©êEÞ	ÝâTÞgÌs·»ûdý¸9ËÖo²cX!áÑ¨³ktš3£Àòƒ™Ù¿À÷‚^Çv¬–;zgh¹Í=Ã	,¸wrRÒE×1‚`ÇXëÇ]W5	~5Z{#Ça{ŽuÈìÐ­®å†–ÏzÆ°µÔ^eÃÃÖ2µ–˜°1-³åôXh†­Ã€íynØêxŽÉBßp;´=·e@{¡7êö[Ãµ‡#ÇÀŸs¥1R°õõuÝbN¯@VëÍ…ÞóA†Ê‚¾az­`Ð`k¬A7øs×à¹¾·oùkÉ««’îgÕÐT/5,ö{0Æ-Ûï:– s é2À­Oÿ}ßvŸ´L™QKÁÐpo~otþì—9gd»ý³ÏÝ>Û·Ï~ãÞ˜§»jœ›¯ØSAKøÚnïf¦¸ÚÈù(æTPsëìs›=ÿìüÙ†¬~úcÂ¿Ÿ¹½)àæqßZþÀXŒæLßBÏ?jïÛÖÁL)¦*1[·£.'BíZÈ}…Ð[‚à18.¿K1¼Çaùïò±Nˆä1šß??ýI·Ï‚óÓ/™yö nŸŸ~\I‚ED/™¥zˆ|Hn?Ðò´‡É/AÛ2ípför¶†Ðï«íÁ·‡’—a‹<êÛ–cn8–Ni›<ìŸýÂe?áÞ`û†`>ûÃ”6‰êU%g/{Ø´÷‹ÏÛÈ½½—ùíxþ;lÛ7 õn{bàwæsoÁK"`;žoZ~+dÑ¾Â‹°èÃÖ
–|V=?¢›!V¼l§*·¢ãõ¼QØ¤MYljßðmqÖ¦„þ¨ÚûV£øXW»ñoFAhïe6'àÔâB²+q7Fû3Ù²™ˆdï{½wF9d^nW¤øËqöù§Ïÿvçûà½ógÿwWŽª7æ7%èY@¦Ü™¯)‘G¼y` Eß‚Ùt´9¶ƒï¼Ðxë°kY £,!Ï£ÓÀ8l´/Õ~È‡-czHÿVØ0„9‹cKzÝñB»kåpµ€©½–1è Š®.,ÌÃšE»Ho.E”£îuÂåÕd/ùÖàÃxUGŸÒ÷Wó„Øù´Ú­å…ü&È’°ÿiu=‡9½5úì{*[!œÚpGŠ›+<°,—s¥¸ád½Å@2ñµåÂkZ‰oÂcL„¨xÄZ‚í[E»Atz7h//V"µZ=X;h]Ã?ýÖ59Â+q~ªðT×jµù`äcê¯ˆ¯qDDÛÚ1ºOØh‡b×,\æî;Z6`‡žŽŠã\Ú+c[ýógÿRÇéÏØ;{{ŽíZóÛÖÀƒŸÎ¾`áùéïùM`Óžœ}	Ð÷ÎŸ=¥BE:³aab1÷X›h–c&NÈ·ãÐ2Yö Wýë§ÈEþ3ÏOË`"<Âa?°ÁÙ/ŽØÏÃå½mûVÁÖ=?ý•Á:0|—ÏnÿëßŸ~Â!{ö$.üÝíÁ˜%Îùºl þË†ý³/jzðÀÙçG¬Y@LšÏÀs=>öÇ‹‹HHT¥“é° ¸©…v²«3k·ºRñÆÍÛ¾e1Ó°#ætØÈµÃ †
4YQ‹p¶Ížz~ú		_pŠ_x’þ~	ƒï#”Ìý»-e²¾¡ÿ5@ +£ýö;?ý5ü
Àý%ü!€uûÈŽ|o"ä~?>÷XW¶&¢ |€ü/»0,À±æ}¯k8ìFÏšmKi¨‰G‰\çÎ¾øèWáÍXZà¦ú¬ÕÙÓ.Ûz÷½mÖÜíŸýf0ÇœŒ9öÁÙWÆ,LêÙaæ„&]æ|ý»€ç¸ö9íŸ`r4-a†nÏ8B^í7Ë³sû@‡j?38€žôazÀH°ž}FHéÑ½.ý¼pì¾¦ )?&ÿQM3,FLCröâ[p ÐW<e{Ó0{–ôüËpäü§7²<:]ÏMûÉå’D¤ìŽ°ñ2dQºø÷ßÙÚ¸ÏnoÜ¿¿¹±õ6ÛØÚ½÷þ[PÒ,4€9&ßrc€ìCVX+åAÊö9fº¾ç8@O@T~„¶NØ‰øðYÆ“,þ²B¢<užZÁ%_Ož¾F‹Ÿ[Ù`×“)÷C1›gÐ/žúß·œ®7ÈrB7±È& È2fÎú1±Ñ"ãìé 6îúñq–Mî[v¯®±ÇLV’ô`”vx´Æ³¿¿g»»Þp€ö[‰_—=¸éK:È<{ž]¼&<›‘¼ÓõÀáÆË±ÆÚKÙ…€¨¿ç N÷mÓ´<ƒ?•{3Ïq:pªÂÖbáoÈå³þRŒ390×èãR²·ˆçè)	ÞñqIä|Lþ`„–£	ßü ‘ŽQoŽ£ép#:Æ>x«í°9ÃffÛCoØœ=aÿï_>û‰Zà-ôÄ»Á©Ø.ò1›»þÏµ³_ŠOÓÔl×´{ç1žŠj¨óý¨[%—7ß_’ü*;¡ˆˆÁŒOöˆŠÈ—eÚ£Amxr Z@Lœ“	àøe€Øà^ÁfxÊõáøƒ¥²7tñ$G…ÝÃb¡¶[<ÇÔ ÊQ²£(û)ËÎÙ3R~ÿ:h¿`nß€ô¯Ç‹ŽTÓNø•¼Ž (Õ¥ Êð†Q”ÅYß·ö <a8Öæç¶ÖüÂõÕ•k+K«««ùøÒ³@ÌÿkØ0îÙÀÓ®7\ÏZ.l_×ƒN,ß‡ªøhå¡¼((åð3œ¤=Xgx¢z-ŸíùÞ öî‘äþÁWã£7½¿˜Çécø?„ã³˜]JOná×•øðNt)É ðtŽlA¡>Í˜Aš’µ ˜D 9« I0üÆ+€™,·îÙŽÓêŽ òn(¹’èäiGp$ÉÕs\¿q7ALÞß˜7ªÐ¾À!¤ç¤ »±kt¶oÀ×9Là—æ¹ïão[°-zp5ÉéM‰Ø¹"žü×½î·G£Pw+è3®·÷¢EÈm°œÿgæúüûííþéâ­k8BcoTéÉL¸–—Ô¾3E»‚wÀKÍ?à¥â!ð*ã#ðRñxÆ"ÍþKdî‚<fùïÛÝ!^axÜ;¹×
ºú,i‚c¼ûäˆý°µ\ª¸Á~9¿‚ðÈY
ü
n³= æ&Œå¸8~Î		lâÌµ•áá<<óæ5øP>ô*	Èqðó×~ 0}oˆÛËGþ=KPøÉ·DÊ­¥œÊ&ÖlÅÊÝVJ?ÂŒT42¿²À¾*b˜šdÇð‘Ñ²d2Š¦ü¸	9°åòƒY¥DÆ+Öþ¾5ôüŒ3Õõ\Ó@+ ¬C¯ïáŒD•Lnÿwõ@nÁ$‰ŠK:b8.®eès	ª}«ˆ9ü*¬~BJ‹¦™I³+7ÍÀæÉ£ ¿N>’+ršú¼E-žÔr!×
€äêYõÃåÌ>õI×¾Â¸â›mž=õ@@êIåòMµ!>u}X–ƒÖð05Và¦ ©o‘N IÇ9Šª¶M*§J‘/5â}ïo¬n}ÌÅ«{ñªÀàAàÿVÅØ ž)[¯‹3*DÃ«Ù’Þ•†µßÍ‘í ês©ë¶Q™vöTeg–U2½Œ»ì¡e®äš§ƒŽü¡S‹M²à¼ëqVÙ‚Ò•ýÓ ›Ë_p£Ûµ†ÀÍu­«¸ê¹ÑÁÒ[Ë7ó²Ö^À8p¸µ­¾çpìÄzú°?bÞÞ½|,èŒLk'ÛøêG&Ãql€ Ý#Ã½¬Õ»gé¿ì–V¬;ú|gO»ýË_ò.¬ëÕ\ðtd°Ü¾\¡ç³Ø»¾åâ±þÞ°tÁ·ú6/µ­½=»k[n÷è*’ùÜè`Ù=5—µðBÿc­>)KWþ.·’þ û±V_î¬%w€œ‚ì1FÇEH!IÄÂUÃØt`	L¯_®F±,cr£E¥iU‰i½|
%† \µÕÎŒí²<cÍeÅc)DsÝ'	8¨Ä™2¬üêë"ÚLŠ8âð¼ycJxS‰9IÆ˜á.’@€îîýê®ÀÅø”G^ñÇ);ûW d‰Ö,ëÇ^%«ÐqB¥Ynh‚Þl5ë–“Q¨¥Ž9‰7ºh\c«ôjbX„¼å±£ðÇ/`kÆË^tj\•ŒJ×+k÷Ë4™7Ñ…F°w ÖH<Ù  n²ŽåxðÙrGAÞÿXe;SÛÆŽ”F­ky[XÖ³úßòÇÜ¨´Ù”–Vò6¥œEIX“žo›ÿA×ã í.æšøÕé	_W¹«0Z5ÉÕ˜îÂ‡k‰¶üÌÿŽMZdõ=|>±w  0¤Üêl¾)‰7P‚I;1GÁÆ‰ma,çïSôFÃØäÛ[G­Ç­tÑ÷Ý–ñóè¤§X´fÓÜøjg<«;èV÷u^Ù¶‚®oqP:Ö³¼K@JBæßX93?^h/¢‡»àÙ©2¼ITæBpÛ=?ýß;wPiþ;vöñŽdææ£˜ñ®fYcÚr™‹Tãæ±iýŽ¯ÓÆmGÖ-”—NxÏÔn‘F¤ë’'x'ûÛŸ¶ÆÜ+…®‚ZyR|-*þDdÝ¹sö·;ìÑÙÇ[wYw0¨þ}ˆ½ì ™‰Éà>X«Fh–ƒ6b§ýÇ‹íÅq-
.ˆt»pjÝsC§½3B¯ßÛž„º9³o·Þß™™mïñï¹©sM«<òLêÊÇG¼³ÒN/ëZ÷ü3µ«Úd{òOi+FZ¶+µSÍß¤Q®”7ãÖÝ{ìáÝ³¸’;1ÞojçÛñ¶j¹gOÛ*ÞGùð
òLrpË¿ÚY4¼Šùd^¡}ûì\8;¶õ¸M`Ä.qWU0iSÛ;áXAíÍ³’lž­çŸ”øP¿°í1ëéþ SÚD÷£Àè¢#mn;ÀsF°…QŠƒ‘ÂßƒÖ2ÊóðOâ‚(„Eó½‡nˆˆ-þ¯ÁŸÿÐ¨[‰
ƒ¿»´ îò­[±ë#²Ã=KœWg÷ß{¤ÆÂØ;;w1ºîÓ+t¶òå¹¨sÕ·ö-wdÕ Ñ¢\ÆÙšü’q?Ï©žîbP×<ÛŽçÅPy˜S7¡£z~ÏýÕ}x­!‚^¨VÓt(+¯©ÉÎã8çGŽJÜÈ&È±¢«Š‘Óú‘UuÂ©Û²°øâL¶™œØu–pWf–(äHE(­Üi6Ž¢O÷˜"ç‰"‡‹Ô²!œ‹–rö¶ñ´žád´c²Òà«8ÊQ\L#¢úgOÝ*=yèÓ;©4‰„z€”«‰ÄašlÎÂVÇûï’÷1Ühù¶g6K_™=‘„óÊµÈ*#D’kÄ…øV|¤ÄGG¢…wWd+™™•˜(¤e„b‚)¢àô_HÉ#¦3ÒH¦k…Ü=Å¥FgšCÖBÖ‰½´Ùß÷Þ¥¦•Ë¤4AI–
Åy@Þ·ƒÆ´[]:«r×äÞ‹Y÷2Aäz¥€/Áó-<Z)ûÃàÕ4eÈò%!`,¦–œ¼Ð´È™¾˜7“ó{a
–3DÀf,,˜áÅxà×âb†£xÈfù±ZÉ5\pø'÷)Oî!§ðã×SHþ£©u¨yr^ªÈ.qKåéòÎŠ’Ó[NHÝ×¿ûiÝFÀªˆ4÷Æ<õ¦I¹0ŒrÑ+vycûÛFBŽ¦âÏ(AÅï»,„í„|¹Öi¡ÐsMLÝx Õë²Ãx…’œÒk¢,Ó,@¥›´#)Yºì«â²7n¦/Í$¦õe‚‹<=/"9ÓFÄ:€”iÑ´(Jhö*=’!5hÇ»V0ô€Rî[È†Ãy+p`›a½y\QàcôM±·¼ÁÀm3ÇL#4ÖS'Húø£¼z×j.Ì±ÅL¡X2B+ žäuAè{O,"ß7ŽÖËl¹Á€Ø‡v7äŒ[oüùÞâÞêÞ›%«~ãƒC;P;òàðß¶ #×È˜¡ø2 •û ¯dÊ'1TSÿI4±c¸ñ›ùó7WŒåÎõ™9BÆGÀ…­èø·ïG©èþ#K!—LçhýxqAåD¡†Ò_”
“,ÌeŒ!_ãCÆ7¹,;Ú£ÔíIÉ¸›v=Ï	m8£G~àùb÷{×÷Œ½î¶ßåråúñ·\Ü¶ ÇËŒ˜¿YÖÈ'): ¢»Aý –­,ï­v`øü(X?~|mŽÁ0Ñ…OXÇðqæëÇËKeÍ#Yx4D×Ïõ€m„“þ"@ƒ¹´¹SÚÛH‘}eoåšµÿð}Ú·Ç+' ã„ƒ†?+#<½Æ–ãï½½=—·“V®çÊ7‚/)&zc>CädOB†4É Œ·VóD²c|Û ÂùXÂ:Z¢<œPf?\Â·83¼ÂRmGQ“™pÉR&Š÷¾yU‡oVã¹ÑfŽž$9LIoWdç*h—*øÑwß¹Çxþ–%Ñzr~úsÏ>?R¤+eL0ÿ¥:)gM$“XÍr³\1 á”Ôû¸%U>ÁÎ!ÈIÐøÐ(¶Îdg¯o™#8|›F·;‡tÓ§váû.}%C¯Ù¿Ðëê]NžÆí-¢nUúV8ò]ar7Ù»Åš™!Ì§÷gÛ¡wÛ>´ÌæÒ,º’-Ì¨[?™m–$³U ‰Ši”ˆ-©>¶qó°Œ,á—óX9S®?Ì±ÿ £Í/«tmŠ=¶˜ì±Hw•Wïçs+F(S—ëêþklŸþš-&¹îº±ðÖ9?ýG8:ç²Y˜pÿüôãWXÑXŸ,‰™pm•Ÿ°šbÖ–b¸ý RŽÔQ×¦£Ž*?*v†®2ÂZñŒà:h@ôŸ²]oÈqèž»»Àõ¥‘èäA½K`õâpý™nW/û–¹OuÈNCÖƒfÚ–’“K)Aï¼€Oãö)M°]ì»³}M)Îàå”<z½ôÑ¡a"qÛÀD¾ðlÙ£	[NV*uˆGYDqÊí1l6AHñæ`Ž¦uH£<÷þ-ø¸'0˜ãºð±õ­czõä£.žSƒ@ÚÏ/‘?ðš-	æ¸1£,Yä¬$[ÍãHz˜ð9žaÉ©"æökFi£^=y/ýØv,·ögKa	á¬ª]PFq–%YÇ[D–î aáY~/®*Üùžu8]¸äÜ>:¨Õ=Ž òxáÃ6
‡*:QÝu6GtÁ™‹ä[”ö¬{Ôº¥] 5>»-ÑÆWéiX¶-£wê•yeBø|99ÓMkè—Ü†…œ
T„Ã¢QN0¨s"ö‰†Ú5“V‹›€…RªÃWV%¡d²[ÊÈ¥8+Ù1å ëÑ½-¤`kÌä¤¬teýdœ+6§Bü¦>0r»ð3‹ñ^çáØŒwhUå±´ÑdÇnÙäxÂfU®t®ÃùÑïvøãÈ†b„Ûâì,û¦íNùÈ…Ù“oëT)ÛÚewåçNõ·:ŸrÁÌúh4þúŸ8–ÚÐ:¾‹h^»SšÑ.ËÐVZjQ¯'Î,²½•FD…©UJ¨Ô®Pµòú
–t…÷E‰û¤ÒëBÜ‘àªfÈyzãGçÏ~;d‡0¬!Hœ–'ˆ>±ùÐíŸ?ûÒÕÏ® 8CÊÑ/f§+:5|&ÈX-ZŒ“*P~»èîñV±wžãJu)Æö¹Å¥¸S±ZTÖŸò[sMX9!clÖh/ r>â4É©Œ.$ŠØS9EÃ
?³™ÛûŸ_K	›:tÂEŽ"Ä^Ì:Ç_êR‹3~A«]’QO½Ôã×XÈ%)•Ñt:Ûä.-x§è",²vJ-ù]ï £nˆ½°hÉ†åDKµæ J=(GÏs<ØÐÌê·—ØAkñúÝÝóIOcQ28S$[+[CÏ¦“º˜ÅTÜÄòjECÙ¥¹=òü°9ô­}ŽQ
 ôGntfŽ™¶ÏÙ 5†´á&ß\tŸ$oü9y,ÊŸti×Á»´™è‡µ¡D{ å¢raâÒÜÏ€× 
+n/òÖ{o¸í¸Yyƒ»ˆd×¤´’^)g{õÐ‹¾’Yðê`Á,Ãµè‰+m1Ûl¹¦æ	©ö^aÝ•Â:´ç”áÝ	1n—‹(hBû†#\¾+ƒqÄW†rü+…sÚG,F¢?¼ûMÇº+Fæ"CrÚÅ\)ÄÓ#v‚g÷+´´ú±ˆs%pÏ³Kñn¿„8‡cWÙ¢@ð–›š™^-óozæ‘¼ù*ÿîðˆZ&šØ:{Ün·%./¶ñ)´-°N…•—7ºgtCÏÏøÏ$¨¦À–E*£6ï¡ñXÖZÎ&öa#öÄa-ÖIBmÙw¢áMÐñ—bGøõB‰2¦ÑE$6‰ðŸ¨›(õÍ4:"]€Øþ€£™™Ù¶ƒ•X-tí5|«ÙïM£oÎ4‰Ó/4Ež6a½ ­*w*àXÏm ÎF«É½±Ršo¬±…j?2hkÚêˆmu„¶:ZmÅp¡‘µ¨Qˆ¨méQƒÊNO”6úèÍ”\dâ<¸¥	ó³ÍC-"³á;"¨PÉý:îo¼;ÀŒˆ›|×d{¢Ï|©[Ñð3IU§ÜünfðbÞ1ç^.‹?Â`Ö«­9!*lÊ4
rmŠ¨2Uæ‰Êò5nâ ÙwÙâItà`3ºÝU¹…èéÿTþâ%-$f¯†
Î`TøÖqù8BÎd£òr†âo²¬YÎhpÐðÚa¼g$¯í.»!ç«¡¢áuÃÔ¶àÂs“¬Ú¬
‹AŠHOGÓm©Äe*‡¸¢9Øñ¢ÄÑø=±?MÁêôQ„&‘sÚ	£Ê>X|Àz¶ñ¬¿êI3²”l*‰þ¤oØ¥¹™`èÀLkñ5cß–ŠK0Jb#àNÈNÎíL È³ã¢q(Œ‰°¸0
Üðâq+2ÆQ¥yS"FáÅ>ñohmmé,y2µ_Nñ*·DTŽ=I‘˜—9Cbœî2!rñodì¯™íTˆKIˆ:µkìW¾µˆ„£õù'ªúf)ä¤…ÙóMåe)lóèFdQ†I é
U	Õ_æH¢ UëÎòl›E·Ó4xB°<)œ¯cCë¶ã!2Å³ìæ:[E=„Â­î:EôZ¦dJ1—Åa ‚.Æ)Uà4nfÜ›º†µŠŽOò–ë	ø¥äÛU½*.*êL®Vˆnj¹7HcÃùÑœðmÒLúEÇ¸krÿÔ40*ç'—eøJ=®šGN4Á]F/áMÝ¤þ(Ò§Ö–E~`Xè}N¡&?+ƒ,Æü|ÇþùéO0QÆS›äŒžN¶Ò~)³0ÕòwÉa–,;5+”jÈ¼D˜'+”¤Þt< ìÃ5zp¹!%kÞyþ){ÃÌ€.äêRçÊ;tð}e¡Y¾2z£5èBiÖ²ëÓIZVL[–ö+M^ÆŠ”()wºçîyXi\„¤Bü¾í9VÈ«iy"å.Vå‰\¤¸EeÊ ñ“¥i{jæw”§õ™ Â¹ü@”ú
˜Ëü\š¨L*.æ
§`&meºH•VâÛ†GéÙÈ™!Z>³]˜nŽ–°	wÅøO¡x)ß«JíyG K¤—ÏÞ˜MªÜãü*k­L„O!â&ðÈÑ&ò1
¿.cÓ%./:88Å"©$ú¶mCÇ8Â¶›Ågáxi~KÒF› ½å™ÖÉ,
Ÿ­þ×¿3Xýn4öFE$‚<¿£Ä®”î–c‘~¸YFåXæÓboz½ÿšÜÙ~»ïÙe¥ò{(
½ZâoÄž¯_QT>Ù„"á%ØPž<K¢@”‚TÊÕ^%.]æ…5Š1îþÙK³gÑpÄË«]á1uÌ—Æ2i¡î™¨ªoÒH‚ÇÞjÛf¤¼/-qå¹ïckÀ[¸=h³	mÇ\Ð£lûtkÌBQ¼©] ã½‚Ïª@¥Ò²i¢\)¸Ú§J‡~ëÍT¿PÎxóÎiš6a×êC–¿ÞˆÖh |VÈžÐJµÛíjYª ~Ä‘Bx2WkgðŒ3IV`a|éÊÇ×|GdfÉwì:FÐÞ´mv°±"²M]œ™-ß‹¯HižAå‹Ì½øG	Í“®RõøÊ²AÄ—V×¼€Aå²[Ï5vDÂó–õ­'™]:áÄIó÷€ïàÆ
Ä€“˜pð/…ˆ @Ø^µPV¶Ô\\èIXÍÊ¥H]ÞiYˆsÚN%lãÕ'§ò|¬ë&Uwç˜t–Â“Á‘Ö»j!P\|ë+8GrÆ=}b¤Ïs(öG°wºÑÞ™cOPA=`wö4òù'À©=7ÝÔvŽíŸ}Uý‡-H”IÆ!A#üsú{J@ñ3Ì	rþìË!¼ât~ú+CS[
7©\ÆS©òåY	Ì¦”òä¾1äŒvå¡¡
$Ÿ‹è§œ¨Íð"°2^D‘¬/êRªÏ“-?8û"fU#Š/…¾‡àÎ½ÆÓt'óÄáåÌ%´I±®$ÀÄ]³kc)?DÑÏ‚qG²5¦T´=ô­=ûðä;€Uy«f‰A‰¾àÑ¨ÃB¯yx¶Le€*pöŒ‘Ã½X%Bæ0©NDš…Û¹oa;RÞP9—¨R%CÅ¢&mßÄ`«Èî]Älå~ùP¤ÄÒ„–ÙœÒ”¤õ8±."WÎ|˜TƒÞ”«É*–~‹Ø¸ü€bBŒWa²Ú:ÊMÍ°X%•PØ&_J
U lVivƒFD9n—{9a§,­–ïù§É'Ä|L„hô{9XZ¿CŠqzÜéB0àþ/%5r Ü=?ý)à!ê_1úô·Ì!ÛÓtáè†/%oÛŽµÕ·€ã+áN¯ à1žà!{ðön}òÛxXI²™á©¹»±É×Ø.9„4wûg¿Ìaùš/9öÁÙWFÂr#û 7Lk%58Ô;]‹Œ×xuÒ)ÞG•¦ï…ÓÇsFƒbBUÏåãŒÛt€hGêäH¹HÌÁëìg‹ñ·y;Ö4²y–êåÐŒZ«{ÃGá¥òÊòŠ!…$tƒrËxYÍ&y¦U±&Z	jfüÈ¯F¥ÎJ	¤Üt¯J+¤0nV» ÂõHÁâäHIþ¬‰´©ÍX#ÙA«5¥ÉI
pR”Ò*¤äFVÓrÆ¿•L†ŒRñ'ì¤t3¥ñ OÿÆe&F9ÿÜnkÔ´ÊÎ¦r½sûáÑÖŠ¾Wì‡¨ƒmÛp¼ó†–»~l[¾(ixðÎ;pã„y.þÇÞS<©üé˜sGµ“y³,ÕFþÊúuT¬x‘z±àž;…Í™-õ¨ø2ÊÙc¿ÌÊ±_ß¦ ÏÏ6k¾› ðØ»g@™w¬j³ùøCÍ†Ntœ ãô%‡AI~~ñÊŠ”‚ý:qÀŽ~{c!cU’L&‹Q&“¥öª:Ì*½ô|P¿ÜÞ³§^¹T¼Ê²ËäŸÌìí½s â)>X‹R­.d|÷–ÓÊMbê,”Ø#—yJt hžãtŒŠ$"’Ñ©¡”¯Œ‘æªv¥’|ÏQ°eûÝlÇ™rg)fF\Šì’½9Î“¬–²³,—3GÌ4M üÚé“ê7ìŸý;0Á¡í’Êù_lrNò"ý3i–{è)MZá‡ý³? 8ždË©æd
c5|´Ñìk1ºé¼¢`}A,9n/©óû°•V÷û¦;ãˆk¸†~Eì¢ºCi²IyQÀ:ã×µ!·˜gHù”†©»Ò^èŽ>½c_+ïûÛkì­;‹sìÁæÂ’Q¯Ø\–9¿õN3~y	{Ô´b«zŽ°Ú¡á÷¬çol‡Þ{ÈXocÝ,7så¯LöèÄ6^Z|/õ{Õî§4[§xiF«D¿ ¤ÜE6üÅaetpäŒÏ„	p4aP§‚£)»›ÅÑÆÊ‹‹r³‰âÙ‰±v,œÍÙ³5g?1’&»¬¹uög?áEð8ýÌíÍÖDðºè-!¹¬¹+Ú…Fò0ú¨é‚O_±L sþì·h‡>ö«~ù=<ûÖY}<·€ )é£©rˆr×”õeiÍqõq—\øÞèˆPþŽ}ötÀSÄuÇ£Ú7Y†ßíSÌƒ(W»Üe/ãáºÔÑ.{åÜî$’º>JŽC6Ãõãø“þ»Ö`E6^ýGoä×­ã^©ÄÓÏ³H#Öj}Ã1vhïèõ™h.Sâ9ñºhÂøxÄÜÒï¶kÓéJo ê;àH]§‡º©/iÐ±NE¸È½5q£ã#ùeâV{ulAlœ¼ßÊ¶ÇÀÜ;%"y™ŒY”Ü½±Ùå²Tøª˜úL:_ÒÊ¡Åsqg
è3ŒËÁ÷ÞK\¨‹úÍØ¶ ?AÍ¨Æøé	Ä#UÅ$‰àÚ‡•…¢æcìÆÁ^ÆŽÉ\ù¡s1eô¨±·HÀÐ’CT³ª*´½P<Ubƒ]DÐÐG©N¬C¦™•€_˜o¤Î,8Ð7—¸Úv~ÅéKÈÜm™l• ¥ív‘iÔWÛ6µuùüÒ-¦“»n8DNÈ‘8ê¸¢ôH>Æ©:ÉÙb'äÙÃ3)SŠµJ–t-RMnÒòÕemÛuuéÅ«Èv+:Þa•@zu9N‘¬#»§—  Õ²œå/ÌÞ”¥²ôSÉUnš*Ù@{¶KÚÄpˆ›þ}èV¼—jn¦ô:a–X6LÔ¦žÒ\<~]{œdüc½§i×Ë_Eo¤ìŽ^Ž‰¾`ÓÛóº£`ÍG'ƒèWž}HÆþ;ÎöÐV‰—Šœ¬-a°â*B¼®XR\¨q“SÔ({NBTfBxMFù(­b†þEùø¬ðTuëx(ÆXRÄ)µñ®ÊP&NÈ‘a …Cf¬yç6Þ.w©¡'UrbÈ¸°õà¹6V3™7®å™øé­AÁpõa¬MzcÞ©'fáUë¨tžÚÕt}}»öƒú.·=/ÌºãqÇµ`°†°<ß²"¿HEõ;¡/Er‘ñ=NTÍ=XŒËwÝQ8çÔ ¶õ[ojoæ»ç§¿:"ë„&Žè:ÃÐÓu<ÂŸ0`pMÇ€¯‹íSõDÁ©Õ¿.Ìk: ÕƒzìGÁ÷œ¾Ó’VøkúxEThyPhê¢[éÉ+ñb<!&Ê¨@ò¬gª¶ZdªªÈÏ†”!Ï?£R:]î‚S©ÑQ~¨”ŸK±ËË2÷ÓçEí¬o1Ùcë¬w+ŽƒÇhÈ[5#«æŽ”Ï<¸~„£µGI«fj¿A×ÛQ[vG‹øòž	<æ`=Ò4ElHl@ÔÝåd=ÄŒÝZk<RKUD(¡IˆÒpôºº©JL­i3'BêÈ®«Ï7†è*)û˜‹qÉiºÒ\‰–Up¬›Óî^@ìÌÝ-Ö…¤ù7’ÄÑoKiˆƒ²p üZciîŽ‚":§ß#5³®ˆ®¹WÂÌÒ_QÛXò§×©°o'–ôû+ãÛNj!. ® £å2<€¬´«è£gA3Xw-Ãô4"¼‘Z{®Õqþ™ÕÊ´_™DWÁ¤3&ö*R%¯.,È’FÞ¡5éò"¾\#¾PËZÄXš°oMf/–ÀN]àžâÏpŠ&Fð|M~Gt-ühÛ¡ôñœ7’mÄŽŸÎTf<€¥¦²@‘'5Öq6nþhâ§³0[_?Åœ¿é­KÊ’$i(1ôÒíŸ=Å2ÐÖ‹Ð,hpL'y„*{ÓO4RÖÈ’k
=(î`ø¥PÄ;òF¡èY—õÏ>wûìuÍÊQ¨Ïb'«²ÀKiÞ»’€ËÚ£ôÖ”Â4'	Ô,5o¦¹£ùTëôÒô¶©
Ïœ(æ¥fàfá4ôÚšc…jî¦‘)Ý˜êÅâ²¸jFdj›H3U9±œJ
Õo™v(h«Y˜$š®òÉ¬ú*UÙ'<|š?{¼0:Ê-VM,KYtLGäLóôt]º:$µ)"}RýH«©©±.óPÆÝ¬ˆŸ\…îa/©N"3¬r¡J’†I¿I²*—01TjxåŒŸù,b‰¢Ø*—¨Æauî°K,_ò’î !dƒÒ„L}]E½4)¥÷Ü™ß˜yY7G"­äâD§NZ80G›Eyg˜w}Á{ ¸k ;Š¸ø,q¡ç:\cÑê¤ÅÔöU{É^Q©ðËÕ4¨FZu%É…F^Á5”,7ýFÉq‹šqè$Æe:u©&ÂÖEd‚'±À×Àd¨ð`GÖ8Þð}ã¨môW’·½mˆÁ³°¦UÏÄ†Á5¶ áy¡½Ù”Å] ïƒP›"×žúë¯kÏýfOñÊ6ÉLÛy!:Öò·àtbT¤Ot"ðJ1ŠÈü”þ¢íQÛñ:*ÔUCGvµQ­ 4&-Vãu©ëCÎï$›»ÄöT¬MA>bœ%»„P?L{`µ,#ÄÅQž
24x”ê’Gu"ó´ê“¥—®WŽŽË–~ƒÄ÷ %¡¼r—(ÕÇž=^ì0¢™š!Ó*s©UoKK£šêTK¡€˜ò½Î(N*
‘z9@^ÚžT”jE)uôBÕ˜Õº…+¤kTfÖQkÓÅÕ©Ä¦‹ÌW9YŽYLÄúÞù³ÿìòÍåö±
Â††‡N>GU)rjç—{áj.Üoïpøn¬E®k>4Ê7Mé¥$ß ƒÔÑÓ”Œ‘–XÊRÕÆMqJ1¶n
ín,Ñj†Xª§Z/…S”™t¤áK§Á§ÕÄ$•·i÷6àÌôð(¶ÞœU±œ–Þ¡[ÈäPÃóv'×c>í‰.¯Ç™Ê`ÔëYwDƒÅÂîF“5<äzœu&aÊoå5=3³ÙDmà‘Mí1^+êøûtJðåµä[˜q?¾o‡ýèáÙ:¡]9È€@2æ-|ë8éçä#íq×È’"éX¿[=öMï±\¢ÁàW°ÐhF+ÆI¤ôX/WL†t ®;¢Mž5æ¯77µs¿HhEYÞ—L%ïKåbÊâ•ô  ›Þ`
nñ®‰Ùz.Gwê Xar
3É$üaa$R¯åI}D¤t;H
¹Ö_‹Ô’±x
¼­´ú‡"q=Æ_×#ÅUVLý+µ¨+,JÁy‹Í<ÿKÀ’»w»Ý¦ªæqúQ.¼Ìè¶žÿ¿ž™`jp}þqsKlãYùÑM~òr˜ÄŒ¤¹Í+kîF•5ïòyl}56›X“ÌË^×Ob™f©án¢w,×òí®.‚2$Ï=ìxaäðÎ“.P94ý“5…aÛ6õ}[Ñ”¼†Êú[•Q¦¡­Èf	‘ÁÙ3'³é7ß…FpHqƒº¼†þá’‘î·í iÓ?)óéª6&h-'<üªU¢tHiKýióðˆcÅÆïœý)—«1ß\ÔOÌBï5º ÄW¬ 0 L­Û'Ü·¨Ç]8çÏN)gŠ'¹~À¤¦·^éýšKÇ¥¿SÕê¿& hž*cFr.dÃ¤hÆ]OÈ•Ö”¬Nœ¤‘õ³¤×Jn®ËÈÊe]/†U¼Y“?‰¸ßvŸ´´<íõh;S¨“ÒÂ^ý¼æ/H<V_åÚö(3¢¡˜«PåæñÄqðs,SÐBS7:q|åQëZ&ÀQYÁn¼?²™C¤7:N"²ŸÉ?úQ¦Ôèàu,#ÆuÐ¯UNyr—mùKêhwdn…š(B½OÝr=No­ë9-´-c@|i{z*ø[b´¨Æz92;½ZÙýëEzmcÇ‡À²ª‘1B5¥^BeF:­M¥·¥nh’7Ù5Ã“¥AHiòâBn“æóËe
·sÌI´ð¦ôó€5|‚dU1%ü38äÇ ¶µ–°4;•«jUb
¨Â¬ùž‹RÎyÄ&&™JshåÉUm¿Í/KoM¿ªZÊ»ÈjÖô\qo‹ˆð†ž£oê]ï@S°Lz.¸›¥Î´;Üç2ytJM“ÙãBÚOBŒZ0 Å€
Õì&z\–BÓZ	èéMÏ<Òr&ÊÐòØ	)¡¨F%s±?˜‰:	¡4æX;®ŒÚß²§°¤“U¤OLÐú>'Ç@I2Z»HŠ&U7‰fí2‰B ?Žú‰”d
ô·$­N¯ÊEN•~=I«¶êÕdÒzæ’øª‘nœt¡åQcg~£NØ³.FÏ'(=…M Jj§]ÑSv]Ù ooŽ/ ³)O„úY¿Šh…®š£ºô
cvæ}QX+SÊÇrÊùgkšûâ«f¾ôJI½QˆÅÛk7P”.­åŽ™ú‰Æ?DÑKñ×UÊ œÿéÏ ¼Q71h¢Ÿ4‚#·ËÆMw›sÕÐñÔ¨Ÿ¼5ëñšì8Ïy<5r'ñx)yCÏÂ¶åûžßüùm.ûçÏ¾°¥å]PIKBåšFâõÑxMß×C¼¸›uý7ëgsý£±`evÈFCNÐm¯Û4ñÿÎ›!ÛÖL’ÌwvnÌtÂÜZ%;Ñ"³z¤.és,Å¦9šQÓYl£Ÿ“±VÃÔñz¸¿<·9óÞÃíÝ·fŠP – h®b–co`ÔíZAÐlPçëßPÏøå6ü	_kŒÕ¶„Í¸g6Ý‘ãŒÑˆST¢©	[y<JÀÍ4·mß
BÏ·Þ"’ ­Í±w -\Ý£¡Õæ”¬Ï8c­ùFÍdÕõ[Æûúœ^õrZ&o½¨S=Jk:þ™žKV4ÉÉÜT1Ø1æ_ìRSòÒ_ëšÙ‚ë²çºlg½’ ÔòË¢w°|°CAÍDY/àÿ¡žQU¼Æ´†§—|ŒWDÑ‰­‰8yO¥eÒô!c´~ÁÄ]šf¤½ÊëhXr­})¿ïV~SÑoSßR!ÕÖ÷½ógOm2þÑŽLÙîNÎÜ¼k`¸ˆ¾·}o :¢$<f²Y.ø$ºñ'Y
ßUõ
CóW7±G¼‰€¢–™õÆ¦‚Ÿœ}e°ýç¿Æp.ûüôïÜUÅºUSAØmË±Âa¡5x¸ºëAÿEÒÐºÕ…©#ë˜å`Z!³Úæ¸èÑIÓê1iyÅ”ùÄ(;WûÄ GžÑŒ' ä9ÒÞ0Quæ-Cr™Õ0ÙÚ	l$ü+x»Þ“>§˜@&·}Æ|°™«Vy ØD¿œzF¸@†bwt˜¶®%ÕÍÒ”ê}Û4-—]ßsœŽÁ_SûïðUº’ðÇä®6I¢7=W›jµŒ«Bz°š«¥<?ý{tyR¤¨,AGaR•S/ìÍU¤äþ 5c[·ùL2Â…/wAº4bÝèþÙçì<¬Ó’„'<ß9?ýyXZ¨3˜Í9*©„cðhÇÆX¤zL3±ÂG­åNq±€kûýÚµpÃoÝe÷Ü=gÉ/çå)­¨T(º™ujÂdŠŽMÅ˜âxþUÅ7ú«¥±äMeà}6Ñe„0û«ýO'¯Ú$U—Ç©Z+æÊÓƒÑ6KjÚ/,Î±›K:¬™`]ÞŒÓåiW¦WY”³-MîX‘‹L¬U~¼ Åj/¼‰²J]¢e²X^<¦EéáÆA5œÕtP-ii×…úÈu9è£SLì%%ˆb®ÉÄ{9´qDåðé ªÐÖU¡‹ªÔ0
‘æ‡ÔEµ4$TÐ¢y>ÕAÁ<.m™oÝb33Z©ÐŠ¡oIÔA™8‡ÜúqüIç-Šž£!¬7x(Î>¢	ÒëV‹	¨óìù§×âó¸ÄVëêÒT}4IRVÌïaPDžÞñ¾Þqëì+Ò´}G¹ôñˆ¹=ôHùg{V™ó¨¼g(ŒjâTÂŸ09PyCÌqXE2$®ÙT}$®@žJÔ©x@]Ô‚ËBÔG¾Å®Ñ³¨t¹‰P[´›z	ªi
‹¢ê"M®\Lp§ˆrª–,™²h¶¬ŒQ”pPT²MIÇôq=Him’™GÑÙ/Žt²¦êP+*šÂ±„ñ|ì¤Ê¼ÅB3 j¸2de¡¨ÁP©¬æ!!š¶ù	¢¾h*“—¥ŒˆíóÏ(+	?“æ€àÆQTEV.È¬4²Kêy@QBÝZU|’<©®3™*tEÀ@ââ&ªÞ¢Q4[hP7ñF%í©ç]\º•eÑi^Ø¤Ú›VZw Ž3v.e¶×6ÜÔª<%x)ÿ'©ÓQW5<Ô7fsë`=Ó ~Ñ~åL¸šo	k ¨Bó+0±1¼à€5ïò§(óðt³5©mõŸ’r£•ƒŒÂ‘øÉEUjÖÂ¯Ù*ïÝ
œÐ=^7L“<ß";´×FmóÜXÄ²Ä•ßY\êìõó9i‹¼¿ëJ›Ø¢¦¥(êÓà–Í£Ô±Å3TH[)Ùé‰8“$ªS¼GNxaßòÕu_+>.róz•ë•9ÖÞí“äÊ¢&Ë—…W”3+…äXé²¨¥Ú)³ðºà´Yx™:¯é³ðÊ«šâZ·<O!T§½¥Ó¤M_Pr-¼.!Á^Ù$[» †(•
C'„5ü|M¿qm?£ZÞBõ8±Lº­)aÔŽÄ%©µJWËK·
ÁõnáUÃß·nrÐ)ÔCÍBML¾%ˆp]Ïñü V:.¼ôïFÌff.¼ê¹ÕÝÐÚLZÕu«“½ê+ Ç~@9†rf6rºíya6ù	qGOE™1þò8ÅŽb¿Ú¼¿k1Fê¤ÖÜ3œ D¸J±)FY@ßRF…â_Pûöê!Wâ‘†³p.ñ{2I“+Ã•)V3¢ì±R÷1Èo·o‘Eæ§eNjåðŠ]¯8Ž©Ü&3n‡rJþHñy…É«…ûTÿdc“-­±Í‘Ù³Bà›{v€A°{ž_"·ÝÚ˜¨=ÝêP;AC¿t…A~‘9½µôë2I'×¨ŒzþéóO:û£:qÚŸi%í3ÇYãæNŸ\
wzhêzD	á¶ÏOÏÎ>võ’ŒåKƒP¦‘3??ýu—¹ÔA”q®E]fžŸþ„¾zb:1V[»ôˆN²³Êr#eTt¬TÎ\ì¿™B´RVKp‹Dµ¡ïý¼Áµ¡– †¢ÙPC4K„±a*ŒÛQ‡YíiµÆÅ®Ìë¥oTÊZ‘tE„Ó—‡¼éò×ŠBÔfÍ2²RäÓ`Òb?u+…MiH»½¬ØóväÁ‰\;ñ—GIKeÍ”ðdìÏD;„§G¬]¿f’Ý¢0åèìe††ú¢ÖvÑÔRŒ±Wª‹1”n”ê×e»„hý´¶ˆ^c•ûƒš¹Š›#r'ÁŒ(§¿Ä¸<EÅµ™<bžý—ÛÓñ;ÑñÔË,\Ä)ìcöü³ø´¯ñî†¹[X~þ½ö6¥íÔs2•‹4u\J§‡R÷Ð2Žd\¤JÐ
Äû§°vÿ‰…qÕZš|=Ïðh±ŸUz‰"V< ­_%ÎW`µQ×á8ƒí	WëÁƒªáOŽA:Åj¥ÄdHðý|Cîó+P”)â‚Œˆi¯ºÝ"Žl Ø•¿HÂ©‹%/zÅ«n×VŒl˜¦ MÝÈAËÛ
Î‰à Q¥$¦bÀyÆ7%•ŠãO©Èxª”H*}¤RAÔ@¡R¤ZZ6—‚}¬¼ë/.Û:KËƒûÞA¹çb‰¡¼<ÍíØJŒÒÍv÷üôŸXðõÓhá9Ä¹’!©ÓÎmÃ–¸¦—‡}ZNTõ<ˆÐW¥PP¬qó>pßè‡Gÿš–£cäO¯8¨oäNÊEñI_hìo×·{½,êa–Þ•LØ³Pþ3*ˆÎn‚¬P€=Ó<¤2‡X:ï™yhÎZ¢œJçª?…{€Z±¶”\ý(iÚøLâ1âãNÆ¾a;ä£ž.j”[?·8Bò†œÄ¨58¹	ÿ×Tµ>nO£ÄAúðDçóT«.”P¦—¹úÂ÷-­0»»/¥ü‚Dìçó©$›‘¬©<j¨ù–yUœáJg¸ Âwžúööô›ÝŽô¯PI"åßÞ~Û;àØEýÓEL‚TJ=ÛwãÅ”Æ€S¹6n> Û” ¼*ÄQzÉ#b:5‡¸¦iÀeQÝÙuæ[çp_rÊØ!}÷=sŽñOø£¦‹O¦y´ã¤ÍGV¨‡È Å;¦·4û©åûÉò5H:S-@Âô«/d#px¤°'cäÇ£÷Øy¾VzÐcxÓ7ºáí··›Â˜køb^ÎìÄÂ.Ç&N¸buèªÓútŠÝdŒY‹9“úµS%üNœç“\6”dæÂ@êàR`ìY·=`„@
ºT ÜÜçØÌÝ»kƒ3Íùæàš™¥Ù´´#ƒ¦Šeéy%ñ-Jë¦äSj$ÈÔˆôŠ âZìž:íz:E šÙ·[ïïÌÌ¶÷b€¤==£ú…A¥ví-ýhñ3ÇäD&_TÔ©°ÀÊ@½ƒ6Æ{¶?h66ÉC6» wý¶Ëÿ¸l0Â˜Nvˆ±Kj!ìèVc¬ê“ÕY0)÷e¦ÎBäw6ƒ,ƒmê‰È
l¿uÿ-^p Û<Ö@‡ü<ê"&ÂäÚÏ]¬
bñXE./ë?‡’ ¤ËÈû_ëùZ‰¤ë-%@RéúùOÇ)šT+O©–§7ú·¼JgZzC×wymÁ©ÄSŒë„Û…^¤ndNîöÑ7æìËiøá²ÄÂ¦Ž·»X—Ü;0š˜Ë¶àãCœØÌN1žCn&gh©¨žÅy†_ÿîkTÁQð%ò}Ê„‘qØ¥¤¢©îåºå–¥G/!2·ñÊU7{]¨«.ÒŸIuµßå¦+ÜžöŽá®»i¢ŸWn»üº8·]Äû±võ^~å²«ç Yá¿;fºº’Ý&Zz¦æ¢—G®É\0“®Žfy^ã„9ÉBŸŸþš<%®­ùü3½œ‚c¸fFŽå•‰K>¡OfÚÄÅxdRXµÔSêÍKp×TÞ§q°¼!†Ä…ì	Iµ? 5˜C5ÌISé±¡N+¿Ä¡VBy¾À¼ ³Z–0P&N¯éÃaÐÍ€-è¡Èá‰y6ŸÆ=•´"´xj<)ßPŠ¾ ‘DO	@tfkÜ¼½É6Ì@o'»;³}…y»sR¾ßnw
{-_#<Æ%§W©bÒ	±¿8(Þñ¼ˆÚIÞx4ùC:ý+Ãñ.žØt4ñ‘?X>„œÕÓiÔCT£§.°žSXQ¿ÖíŸ=KØª)EËåWdÇ­1ãÚâ×ë±Bypöï,D‡ßÁùé/»É\+»é0ÔÕb—úþØ,µÚñ+…‚­éoºñ+œ…Rv\†W<ÅN¢æE8€V¨~¯bS^¢Ø”dmŸJ÷÷Qã¾E
õ-T¨sõY.1YL‘ýŒ2Iô1&ùç^E˜”ôýrD˜$Kú*¾¤xûââKD²ó2G—ìúœànï½avw¿¨“œ.·è†ü„O4z¯âK¾ñ%q ÈüÛ¨íz¹ÂAvû£#ÒÔÐâ7ÏPL¹ÐX/lœ‹Ñ@¹?ðNÍéüìN98£›gt/(8£+gt/=8£ûÎÐS|çZÊËÅ”„>Ô* Ž%–Ú]àõ]Ë	ªJ+UTQ2h%©ÇŒÕöê¹d2v{sM×c>K{¯ƒZÕýˆ-Ìž°ÕsgìÎqúì‘r:í·,ë®ÜŒÇÉÄt/. &'G•ÙyeöÐ¹]¸ECpáŒ¼¸€16$UAäã¬.8 ¤û* ¤úzR7 D”“®Ly=Ï [r bãqøGwºá	P_ÆØŸW‘¯"?Ô¿Šü(‹üXYc£Ð`¼+3z=ßêÑ>&›£ÁÀ zY/$z«N ÈÄv Œ1m6ŠÊ[e†`"l5Ž¹]Š{t5S´Å¢²»‹ª!¬|ó3ÔypÕGÿüô‹!sþç×GìÉù³ÿFñß2Ç>?ýñH¸åE6¤×Y¬WbMnAÙˆ×2·ÐˆíIÔHÈ[U%7Ó09M”sº#%ýÍg|Néñï?á£sè¿¸ÏWW…þ5>©öí³ß¸sÌ!­jbÐJàQùŸ£€–Pp¨t0}-9˜¥G!/
 i—Â¤rÆÕ
zå|Éjhæ'ÑÊ‹*ùRNz+©ÁRÜ!¨¸q Wr‹yý£ˆ¢r€*pWPßr÷«·uTÛjmMºžbqúºlM=öÇõ¡û7AÏ]E[5ÕÌuzÚ:ûƒËîêÛ¬y—d JC4;ý“¼Cç§ÿ	D¨ð£óÓ/q_þm³ÚÝéòs5”ÛúŠm)%$­6ÈG¶y¨)Æzç½=¶ÎÌ6!ßõBÃa-øŽb}«fEyK$›šºI„ùöÛDb`iÓl>ûô,ûJƒ”l¡ºÛ
íœ2€4-]v‰âM¥Ã¾ÎÁ‰ ¾þkÂì;¢ñ`Z—&e¡¿Ö ÄWÇŒ¡§DËbjÒ.m¸q}ãcMðúBGZÔhê&þºÊù4¸A{5«LkÀ^lä·Ò¡(½taÝ×Q”Ö+ >½u¨©N­v@‹=ðÄ‚ÆÎÕê.Z‹×Ræu‘S—îŽ|<Ö¯o›¦å2Ûul×jEA(um_cªl»n=óc>¿8™F½ú¶,:¥nâ1ƒ¸ž–('Lï^oÆu°ù>€b*¶Z#•¿jZ˜‚ðÈ(³Ûû€K‡èÀv›4Ê9:)O¾ýQ=M[ÝXM#WÁO2g}ŠL)ÊJ39ùví\k\5÷~5]¥Š®J=§©š«TË•…
_å*UœJ§«R[]cÝ®5·kûçèYú:{tävû ÷Ú?´LtÇ&®rf@	W6ÇH¸â†u”lé˜â!IÁc&l4`ù9íàÑhhùÉ£é7Õó<„?ª'`€h4D›Ø±øMþü(°üõcüW~Ÿê¼g3(ríŒÈ›Eëñ8YGš¶CþÖ´Ù`ý8ú ÊHž¾Äê2yíhFä|ƒ>™l7°x:Ìt@j¢øÙÙÙX~ý‘¥ÚËië”Â±¬}LŽp«z÷½Ëß2í‚I‡;Å»ú#èŽ|Mcû¼`ë-jô¡oíÙ‡8ªìÓoÐã{tÊ{lÛn×™V iQh0û’Þ0£G¨4®ü9Ü³]ÃÙQ ÿË+<ø&àöûÀ®GJ)=˜~V`É[4Å.HýÙïòw°ŒC\þ‹üí×?Éß”Ùmãx¬ì¯:£¥èºüéGÕÉqo0ô|cf/É—·A¯åÍ(o•Fx0­ŸJz»rlŠF«ž([µÂk[Þ×NvOÞ1$ ¬â¦aâqñ×A¤àïÈÚ“0êåÌ¿+{+ÿ[næšÍ<'|#Ö½_9ë„™¼Èš˜{z6Ç¶ð‚‡–?°ƒ€Ü9pSÿõ 7Ûû¶u03[t_”±xøVß’òx×™áÚh´mÙHqLú86}híùÞ ÕñÂþ¬0sÄ]'¤I‘éÀEÁÉ ¥žIº‘{YÞ(4  ‰ì÷Ü=OÂÂæÅt${¾aÚ0ÙVèµ|FÃ…Žò`‚ŸbA—†B òãå¥Äc“‡aF†áÃ¤J5ÒáüòdÇÀÉå¥~	œ#¬‡çŒ ƒÐ¶ %ÔAÁßƒÖµÖÇ`4‚ùÅ…¬†¡ãŒüÖ2¨5ðQÑ„ðGjæÍwšŒ÷‡h”+/D-U¯P¤c×s0tõŸ«Uvõñª ó& YÊDÊÊ`!!Èð°µL†È, syB455o÷Ghâý}—ms3rßcwì³§2/Öå¹ÉLÌMí^¥·L.¿‘uÁ¡9.'±À\M?$&¢AÉ¸¿GIN˜söG"4kEð"h|„3Qnä[:Þ)Ë°S„Ÿ—ÑÓT$ºD¼n¡&¥ðsšÚ¬x+“êóœ¡&(2õò E|¬qR¬ùþRM¯ärWU‘QLvar¸j€*Ž°&‰œó©¬È¬°›§ÇB›¯Ù½]â@žßXÐ>zò.qO^qÛå"E¬Áz›>Ð"3gLNö·Un™³}i	¾¥ˆÒ-eRëØÇ¸:¨RÅ¶ˆÁÇÉŠÅèvKªTä;ˆ£qKô4QL¥‘ Î8@@¬i’þxáÃ[(}Íž”‡ógâz›ûhãÙ6ríÓ=µ¢©T³¤ûW8gµŠWPü)¥4ÓUEþÎO’T€Ñ¿•ÙBvän!÷q²öB~>,j!`|7õ}|¹-4¢"0Ç(^ˆ0 Y×ÌÉ¡M]„Ñó«ä¯\ÿ"Ñ‹~+P¼øw¹“¬IõxNf›áÂÁðó¶”+KµCÀoÔˆR>“äšÍP+òºuRüTD$Â|0U1¥@-üLRsæ3sÎ”ë¤jG—G~kG}WE|—‡Ò¨B‹‘É1cÌâ8e¢²Ó°8bYÚ»À˜i68¶?qÆ‹Üº('{’2Z¦Ç½»25ÃæÄHh™ëñnnZpŒ»‰‘· =‡Éª¡‹óÓO€CðÎž†©$v4 Z^Ð*´Cé}ÒíË|Ë¤ÑÕR°Ê3Õ —òhÔa!Ün%€P¼ölÏ9|Çâ…&6ýœéÔÐ}ÌÑ.s![$ii1Ã“ô¹‡~ÌÆÁ­¬±°X±Õø€\ÎÀ.ãcr¿bìÂ¹,Ç
Ï‡#œ£(Þ™Fh´!|_çôÿÃµäÌ•ÝÌ9qˆ>Ù:ÑÅ28*©æ½ Fžµ£X·ÂPdã^ô˜Œ'ÅëçŸ"Ò!Á³ŠÏ¼¬$0W+”Pb%X‹Iô_ ªò, ËSne£NÌSdTä¥¥¬ jŒ;Åº-Y›Ç
Ö(]=>xaö#Ãy9Á»åÙnÕöß’!hÚš}61ÓTÁ+¢xYÀ»iø ½ùár…%Gñûè(¾‰©]·àŸú@ä·ñP,1É/®±ˆj³&eY›#çWcŽQœ„‡ÁU+ÔÊÚš§yQ×0iô0ÃÉüfÒ*¡¼ ò'<%^t¿O“™ úÉ&°ˆ,Áò"÷8$Örß°‘!ýç6{òÏ63)ú„£ç83Q
—ZòD¥œ¥wù0u’8ß¼‚-AbáÊKûÂ¶øý”R`f4Qqž~Ü%– ¨L?‰Œ®uÀw/9í–¾!K¢¹#¾^/‰¦^þËË­Í¡µ´È°þ„+iÿž½50l‡5ã¤È\YGU‘ 6ÔJ¡]wÍw-wVãÑèõpí®WZ¡¸Þ4ð	œÞÿ†¬øûÓ«¸"æWLÀý®ÇÓZç+îdÐÒmJ«œÿ  ÿÿì}íoÇ™ç¿RæzÃaB_ôb‡KÉ HÉ,*Z‘Q¼§NÍ™&§¡yÛž‘‚`‘F°‡E``În#>`q"Œý@­ÿþ'WOUuwUuu×S==CRžD‘3ÝÕÕÕOU=¯¿Ÿy8­.N›Ç4^Å1h‰NX‰• %p!qmæ6¢L#I÷êEªØË›ÐœF¡áFûÍç@bQZN lÔ[°:Ô¨,E·?M~Ç7ê€šhÇL´Í1@a<Æd(½§lSõ(:5Æüžºž‰oì	­Ág 3O†iŸý5Y°9gÛ{™_qBØV}¶ÔËÊÊ;Î‹Ï²¬šÌóŸºóYÖ-’	(~ÄœµÅwbc©6Uz¬DÔsº<À´ú¢AžÁDFIžÈ8aÐGDmZ¯ñØ‡ê4Žâ5›€:Bí ~H+aà#°Šfçæáˆ©ÃX®“œÚK	x×(M0á”.–§ƒšho+Îî[Õ¤Î~%DŽ¥NÀžf¿(a_¥
FøÂw‚ŽO-éN¿f‹2Ø¡Z2 0ï®s þ‚ç…8˜œW9oàùü±2¢¿ŒÌNÖàäL’lÖ¹¡ÊdÔõY;ºKVãs¼»Æ†Úv]
qc_’Ì`6:”ÕéT.¿º–ÂÑî“”«¤”}‚Eº¯ßÐ}D)oª–UíQ{˜ç§[‰ôšèèEÊÇù_Š`ó-	`ìúqè¿PÄw²¾¸¬‰I:‹rU§íâUÆÑ6Í&¡-boòÛo¤`#²´0d •|Å 2Sôlfä¢Ð³™³ñGÌÕX=5÷p)­1€]Óé\}«©ßfœ@Ö;-*dtgº²hÖòbÊi Øh.¢aðë+…vFcS$€Îø°šqPè	E)°4ßç9uÉSY7­ë(ŽPõþC©v½~˜ü·wÕ])@ÕCã2S²Íâ—âRÍîPDnß:ÔC¼»Ø¼ß‘øH2¾áÓ™‡‹ëø>£¬¸#{Y<	3QË ;Á/+
D|ëò˜3òÝ/fvª{©á<Ÿý]íl‹"/¾<‡$^@·æí}ë‘Ö¦’±C¨”ØÜ«Í~7’!kÃ©C¿â†GuãgnáB†d¾t|kíÚ¯¹ï§ Ü½a‰JòFÃë‘×~åëi62BbÀ‡ÓXÅk8äXö2óF¹ìtk‹ì‰FlâÛB9Tö*—QSÑœ†ÈF‹—i·l|iàxbZÇ².£¸l%ÖI%È2¢`ÿ@ee¢%§“ÖÂn¨@¡ÉŠé>ì7=Ó=öº'r†Š°˜ŽÔU¯iÉè ‰éPb1U6ÌãšzQ¢¥rðô™8ÈÏmjqä¨qmæÍRjþ¿2'C¤úŸ„Ÿrd }¢A÷›µ.}ÔKÉÏ_6Žaì«ãNÐ_®0û„l{/Ü$ßLŸ]uQ[GÖ‘,ïHjr²ü×–,ôã}ËŸœŸ~u4ö×ìˆ&ç¬Ë"Õ(ÎÂF\]§•Õ‰+GFœ¨.'#ãîKpfV¤J‰ûkp®¡Nˆ ºí†,Ðn´tœ›óê¿½®ˆeåº5LŠ’ª23¢˜–J&¢Ò£ŽGŒÉàŸƒXìîÿ××"`	NÇ’TUå›ºª¬iSJA-d­2*ë@]•Úíå4q3ƒ•T"\ê=ºÊ\‚Çª´Òì®6_:E»RF«Éègcóœ¹qeÙùè“§$XEå+«j9	=+üi´|0ÞœºíÉ–þíÐª'1$¶<~õŽBÑøCîsùôì;Vžû”g•+Ô<9ð [ðÚ)Æ•ës hW€(H‹ÉÖeçå•A‘<Ô)ˆß¦ì>®åE”e	BoS°rG;åR–ÅVH&2(DŠ	5ÇWêƒæÛñ•´‘ŸãÕ`tiß°œÃcb¶z=Ãè"Š³Ò!diE}dFQå¨/£±?nÓÿº<á Cµmê-–ªz2––Ç[Ÿ IÜ‹Ï+Z[Ä—kia¢H)5c.g£!¯ìTéÈS¥£úžd·AEß^öi…žWšò·‚B—›š…“s§E—ý}`¦@ÌClÆ >OóAÄÓÃ”¸#7àš¨Ì¹ ÇÂÖ–ÍÉ„›û€úXÜRá<¶ZSãxÍ'-Ñ ko_bªÿ±/\_ßšÕˆ.ñ¿¶c>dDf½p£ÈoÁUhð Ó¨¥fËØ$Ã¶Â€Iøˆm(áÙkf¿D#úÍ³ Y£š°õ©Ýi­,É3$uK+€yŒÁ.0ÀÜ.khÑZ°1…¼ÕP¢<ô³o,Ý½E­Ej²aÔšŒExÍ™¶K~³Bèß™Û÷îõæ 5a“)«ÌÉ¥}†ÝÛ=)œ?÷v3sGO	•RAíš‹ÕÙ6Æá‹AP*BÞlñ0òsÞ¡üo^»Wù@B£ÅÃg¼;ƒøˆ>]¾…ÞYéXŠ¶‹‡Sœ4Ñqs«Ü,ÝiØîØ	˜×Txûj©òìMUèHÚûyØ‹JÀYíHW»é4Š¸lŸ~Ér% ^«rVRlGHÊÿ~|ð-ŸØ{ªª|ÄõQV%®K"™TwK’'‰çÒ‰È-Ò÷ÂÿÄk×ÔÁ°ô‚±†Ñë×n‘%Ç!Ù0aA÷éè¼€·ü‹.i}ÿªK–&8ÂE£áào-¾o±m°HÖ¡vøAÐ}N8+¢›ˆ\ó³iW.ïé.ôt7f¿¾oì0ÐbìæQµÅ€Fp]®OÎ¬Õ›.òMÙeŒð`:{»&9¾·k•~ùþ¾ér®Î!›øUÛÔ¨2ÈúŸ44!¶od+=c?‹Z°nùLÙ¯xêè÷»7½ê8Ü"-Åá%»ª‹«=Å]âz_ÿHƒ ³×gíði÷—¦WLN)ª8°"hÀ0ox3JË‚ÈÝzÐé·%ÏèKÇ‰oH.XJ9Ûa´|ÿ9§;_%ËöÓ|/d Dd“*5um¨Óá¸G‡àèI!j›®(TUE7°åfU]kìWylg[…	E5³®ß¬¢’„öv©¥´JÿÃfì³¥…]°¿¹àWt!a§ÿ
!/„Mh:«ìÌ=X!` Wé¯ÖóOìMv©òš¾Pe™Œ1˜B-¶#ä¯¨}õ£UÆ/üQ}4íWÁ©w9ô¿Š9k»¡¥•‘PÂørª¡„,œŠ ÛÖ²€`:¥(¶¯¢€`šî¥XIn—ÜÛu¼@8vÜ.bn·KbSÝzÕaÊÄÎ}…`Ê¸:÷¦E6=ä;Œûf'<?ýœQ	&¡“+v¢Xc9IIN*<ö®ÁÉ¹bo¾’' õö÷g¯	O ie|àòÉªEãÌ2§ÄUFËcƒ™dØF‚–&DÂKOSòé4Ø×Òþþ›!¸>§ip~úç)bØeA“		ªFÝÚYn‹"<X9V˜”KQuÛ±Wz<ˆaŒê˜/šºn
QVx(+8Kj”G'k\0™
¥ô,4ÐÕBHÜ•ã89Ô¢fŠ^U©J)ØHž ¹÷Ne´™Øæ/"Æt6ƒ“‚e%Û´c]î½;«¨ÈýnÔ®sðyÔbz,<y8;Wßã§ÏQgn	‘¥¹ò?ÝJþ>þ¸Ìß†¸«Ë(^–2Â	¥áž5¸ë{ìgœÎóé2ç©Ž³ÍYº±{es–mí;©ýÌÂ
>oÀ‹vÂÊ÷lPa~ûrÒo¿¼Q‰*ßR¾#T÷^LeoU½Å½j÷ý¥Áÿë*õ½‰ÕCËAª4…ªßRu½åjzsëyc×_£d)oA¯Üt\ÁÛ([¼«¹™ù­Žõˆµ»£Öí:×ì¢<a†~:ïr¶C®Sqluõ¹®µ¹ÓúYíÚKZ?{m•ìô"¯Mm)ÕBÒ9"`¹•ÑšxO-…´#;%…«%}¬¶‘ß`áM0û0Õn”ÅŒš¢i™# òÓä/@$„üˆÕ8Èúþ~èï³m xâüæ¦y1Ùð:}/Øïò‚W7i¦è6·×Œ–cÎOË1ü_¼W`»??ûŽznã‹>yT ùÜñÑùé¿Ñk’M¼ÙãÂI õº#"&nøô	­ý·»‚1nàüwðâ–]À…ªkêXyoÞ:â¬rœ¨ÜÓJ‡ßÀ›Z°´,‹ÅÕ1;S1ŽT„é°Åy±pÞÍ_'¼õTÆ_9ùÕ\|…¢Ê‡’o³ÔÛß³éúéÙwã¾«( ¥»/×É#zö×.y@2 µÍï¿¡âþæÏÑ\õ·Kü¡ç§ÿ‰ß2ªj˜]_Ÿ	úvX]ÈÁ'Š÷‡š–2æ¥–DÐ<DÚr"¥,Øƒ„²fgbqMcþ8ûË®ƒó–˜Ÿiê6[Y·¼¨UgkídÚ4YTÏž#?&tÉ€%iÉ~[žŠrjþ_:HU¹|UYÇ¯â7mÊ~SwÇ‘³Û(î„ÒG{sý¨o	ü?“ë/s~Üpêl"`ë*>X AW³	¸Æf‰ê š¡³@Æý~äÀ4€,z{7‡“">·ºwtýQ;[Áá9BŒä`aùfª÷-³J•DAbù6‰öÔ
šM¿K‚. Œ/ˆºJ×‡“¯C’¸F×%ºÇL‹÷_~˜Wl¾?Ü†dŽT2³©¤Çß~éÐÆßÎ(hèŽ†Ž(·ƒè¨MGé˜MHs}öþ1Û¾:A·Æz9Ïö¨“¿}æÞæäÊqŠÅdàp´P‰?á˜=ÉÉßºLg§~9Î}ß’Õ+xb…£@©ZV—S±]•“fs3å¹˜\ÜEàì*¤@F/$¿ýý§›n#ÑÆ"¯= §^{Ø¡ÆðMg-/a‡ZôýÝ…ë±¡»ëbñ¸ºâ4+I­êâE5ùîN0Ú‹_xí¶©›'ÕÕTà•MO{ð÷CÈÚ´¸RãLQØ¶+1H©=úºOZÌÇÔ9?ýZñ]qBÓnëìÛŽ\w9QÜ¸ë¤Ñ.€cúœ¡Â¶zÍ€Þa!ê-ìÒ—ö:ñ[RœÞÂ‹ Gß üÑ§wËõÂˆk¨P‚Ø2Yaˆhtöi
P±ÀdðÖŒ`ÌÜéìB¡°ÁgÁ1¨ÈÆÙ·«ö=gmÀ_eF$ÚEsûFªÆ{A›Œß„åôŽ(÷£~­6væÉ.¯vÈOHmWDÇyæÅ<ýgS«é8°Ç,L\’›³2›{¬Oä½[·È,}ÐY{®ŒùÝ	•@óZJyžØ½,OÀç§¿‹qCÀ»Ü_…¨"$â™;ybÏ…á˜’eê¾H”¯Ë¢<s{€uÚ,“•ñ$ÇëF€ûuÌÄQù!³jMrG	vYzü~+(Ìœ-‹4WÝXíð´_æÀk²©^é(éy\éWº2ö©ÉÕgØñ¢Hè~ïBªN~ù£|<)?ÄU”<fž¡ê< ¥iŸW­Ê@ÚdÂÞÙäÞõ£Ÿš¿ ©\O,‘‚±ð¡r~ú/dðý+±UØåkEÓsdNtŒ£Ã™fž©±¥O(Ø²Y]únï ôúÙµž¯îˆyLLÀ‘Ùý ?2{¢Õùž$	9z×oÀÎ&©DñX@ª”—s†š$v[>f8‚MGJÍJp&‰‰›’iL;ço¾„§7¯yL˜?‰Aå±÷ÂÚ°li/ÖÓ’P-SHK ®t‚§Ä$£8ñib4­0<•Ö7å/RW¹ÎÉd§N ÆI^
? 1gÿÞˆ7_	L²;»Òæ!—BIûÈ´ðé²>±8öb\¢tµŠ“¦)²22þ8âüôd?ðdAkMÔóæH.ƒ+[©dZ‹Ùö·[¾bi÷b+–”Àõn^ÁÏ=vÇUè!/ûªŠÌî:±â,s¥Ò§J¥ã·çgÖn=ë˜'³Ÿ|²Úéfsqkkñˆ³hvM‚=¾ºYÖ¤B-×sœu-±çn¬u-ÓäéIž¾.¢a^#zíÑ¢a¢i4ìb¢aITµ±°^ÐÕRÂ¥PXšŒ³x›ˆ°Æ',¥‘$M6Ö‚r*ÐÉþÄ³„Ÿó¬lCªöÛ—g¯Ð'	Áä]‰Œ‰<ˆ‹õBð-YãbìŠŠŠ±°ÂÃë@)­ Ú˜XRB8ÎˆØ:[y=¾kÈQ±¸ftQ±zîòÆÄ´.¾c1þK$­.ãŒŒÉòGÇÚço¾êJ÷¿
A²(ä‹skH—àÆX£dÉ:æÚM#dÓY¹Ù†VJl
æè4Dß?‡[Í ÓO›†Ç
î}uÂcÉkÇ²_-8–]¢®r€Ì`¼^–ø˜	hxKÏ›Ç*n›õ=qËŒ5ø&,-Á«:Æ¨XZ€ûN„ÃäÕ÷Šƒøá0ð®"öYNH,~R@>Ûï…G‰‡åæ&†šˆTÅ¥lW€m¨g Êô¥é"ý3í‘r[¥çI×d½Ù	ºà)Ñü$Çµ`À¿£S'lõšü—õFdÌã>Û`ðñææ:ÿí>L¶®×ÞŽ¼½½¹¬—Õ8óàÈˆÙ±ÇO´«·˜/®Íñæ®e.N5îÁzè{¤'äPÉ9gpéZ!½~áÀèga[Y¬gÛÃ]ú™Éh_—¿ÆáÌ­%ïi¬P˜)í¹~±»{{A#ð»#²åu½}¶,Þ¸<ÒiùXûI…îó<'©ù‰Ä59µn¯ëÇ¾4ºŒjµÑNüÜ-ðÒ-:$‚C»ôÝ°•™~$•p‹5”ïÅ+z`SÍ>«k"2d[3ÔÁ+ð°âÉdòHŒò–ƒ/á`±†m8X¢9LEpgrÅ¾J³>’øn$Pbd.¦}É?B-¢Tî‡t*¢ºnËjÁ¾"_î'ãçn¼ýM—ìNÖ‹³?òŽ
ânV‹[ÆX‹éG-¿—@l¡£µüé0.¼…ž	Z]íè²Ñ	¢[ÇÓq½ÙL×eµË$;tš«2å³’ûpS¸ºù¡ê<)ï~J“™E$²f÷ðu%¡Ó†Iüéùé·ðŠ{à ì!¹f­9"+(ç¶hJ¸˜QzžØÊ¨æ™¾?N»ùÉ~XôÛÕHfçž.ý’¬’ÙÙÜ}´í±ö`~Àf9¸M‘[†¾v"4ä„ëlnžÌB¢ÛÂÖE”ßêé<éü’$<ŒÒ“cÛ¡*ÀÃL/kÏÞ?¦Ï~²ðþqçä²-ÀR¯Ï
ÐÝsÙäùg´‰ùoTçÆ¾ýMnê	PîZÚÒãøéÊÒÊõyBÞ`?o²Ÿ°Ÿþ’9-Žð.©#©·þ(ñÖI´{'·énŽ{~`L0Ö'¾zÉ%Z|–ßñÅçhLKÏ,<°þüà—îƒ¾”‹ÏzzGu0[jÇ„G§VÉò
9™'µÿ1Oî,ÈOÈ²ÌØYï{Mj”‡Qm…JÞÒìÜ[§:#®SJTQxîƒ‹ü¸kÎVAtÙtÏ4bƒÕ:·}/l´ÀÙ–.‚Á¿›–qÑjÎºN–m*¦¿uÿærÙ–×O.¤¿#.­È2¾l‚AšÑ„ZM‚ …*ÄÝ˜Úž’ƒ“8“‰Œøå‡+/ÛŠs/9÷»ý!J@¢£>í[—…E0°ÊVÿds•ÜÀ\eŽÂ+ÚSU¤T¢²Ò½íµýf7ìucÁöYBµ&Ý¬š_§ûþ¾ÕÙ­»ì;*‡›©G­öäáæÜØ$úQJ—oÌ/--Åÿ.^(¹ÑÂã¿¢ÖF¯Óñ5EVû/ü.J¬¬â*šÒ¶úl j‹ÿ½¾¸O•×YŒ¦8ÆH.ž[Š‹Î€9NQïHñÌ3èÕØRŠ}ó)ûäƒ4/¹½ÿÆ¾YYZ’%qóf0€-½yë"„+<¼ÖëQ9!Ù†©á¿öØßýAkãÀTŽåu Ý ï'è’NÈ3ÙÈ*Y{Ôë·âs0Âû xj¡ˆ*âñ„-#ÛÁa*Ú}ùV›¨0ž0†H\n„ìz™YR†Õi®&òôw{’<"W27¥°š—Ë.gw¸´ýí~HGcÐòuÜ=¾v_#2yNÄË*‚È€XÑ;aéïÙøeµËdÂ¢×F ŒZ*9_ß ãº®¶’”ÝÃA¼§ÆÓ+1¹büÂ½—Q;.¬	é§Û£[äýÁýN¿Fé:¸xíÞþÏú~·…¨­å$ÑÔ#¾ê2É™Úû,üHî6üve‹`&Ù$Í11¤‘äÜéxs#|,%qp8Iy’Ç³Çü&¯ÓÕ©>ÁDâàgiƒ#‘8¬½3l?ßd4‡.;:?R­€§¸ùRÜ÷~SK¦go™ÝIÙäï ‰ î†øÜ=ž&ÙÇ¹}¡ZÇìÛßSµ•Ñ%ÖëõYªQ<û¨kï>èÉÜ3¬KÓ…–¯¬ü6ý].XþÔäexd¹ä2¹Þn"–¾dkÀšªŠdÅR·ÞöC	PÑQŠŒð1aŠ’ê¡Êe&›+˜=0IšÚÖúÔÞ¤ÒDnÚ•+Ö÷Êx»ƒ^{ù¤íïE×HÔë/,/®…(ôºÜ =b(˜)I7.F³¶éïR	løM´-¯Ùç;P½§ÙÌ3÷«QCµ$«½m˜Æzù9#gJN 6ä8ÙNô8E±L;ˆ7‚d‰0*›Œ†elÉ.ÚèÉè‘ü//OòKÁT‡®"f=·»—7æ`áé‡Ì÷hŸÆ'¥S¥©Ò‘iŠÌ4EF=ª[².6eæZ².g”õ/]Š5ëòæÖØëúË,,ÓŒ1/™EëÒsDo¸ëdT+•ËD++•ã),2Ãl™ òñÁsÝP¸ˆ¹Ä‰k°`!šE¾ôäøL]N®ÑãZ9c^ï.ÚxEUV“µe=¥LÅ„*+¶jcœ,rd¦›€$q-KÑœÐƒ!I¥°s…9ð±ý±pj)(+öÉÁqD3·Òx¾¹ßÝëa9
³Ua×ÉÁBÿÈs%ÆÕ ‰¶îxÍ}?õÔ|ª®4½ðhF7$ˆ>HÂìïeuô¤1FnÜ¹²²ó³õäñÝŸ=ÞÜF-áì©ÆõürØEÍŒ>
1ÁÝÜÑ¸wÿÁÎÝÇw7«ˆê’OGÞø.Oš‡|ÈtÄ òèî„w˜±¦Ý„sÝ‚_t™ùEŸþò„¬=ÕIüœ.Ÿ‘¨G­Þ¡Š[1àPëîƒÙT,¨2ƒFØk·!î“…ƒÞ;D¬U"É 10*A’9X ªo¿P¯G±!¶t±7—{‚†q{{§*\†ƒcbÂÔ¢± ïAŽÓz-¿ñ|·wX.Œrù¾c$FeÃ¿Fç ×€'­ÈÅÞúAÛbGn“%X5¬1=ëª‰WtcÏ‚ïäW $Ø#iú˜xÂ9‡ë™}¿mzÐZþÓYB?ÃzÐœC{¨åOü6•öJº÷ô—.7Fž‰$¯Æ…`Á‰Ò9ëb1Zçë’ú¦FW§ðzáB¿0eN³ð–yå¹jÔáfžÕŒÛ¦BUë‡þféƒÙ¾Jfeuvž4ƒ¾|zÏU§Ôé—}Ó”}œœ&`2YˆcÓ§m@øšp‚3à‘k,JÆÅmàˆËUÈ"Cç'këaØ;øy³wÐµX¢×œ,Q$]ùÕ_uð²I1ÓäŠÄ˜Ÿp©åX…wkáq›Jó» Í¨¯(’f~Â»+ÍiiÏT šcÆ]6yyF‘DÇ§\	™ö»MW­#­ºº=¦ÕBˆ+Ü‹¶Óòz$:{Õpê$6Ð	mÔkô¸ïí]à<»WhÎÕBöÇ<	š‡xÌm|”7A 5LsÇ†ŽJ©¹Xr)j‚±xËq~±êgN"j§•×Þ¾OÈòù1YY"?¡‚¦;ºfîSŒß=SÚA3ä¤1;_‚n£=¤ó¶–È2êÇn–*-¾ŒxczZ¯×á÷y’<Ÿ‹—£”ƒÑ-¶ïqwP-hÂ'ô'P¥oÁ­—x¿öTôfTÉT‡	~‚æàC.YHtŠ[1V3ê	³á©xAâ“ûÍ_B~‘ú!4w‚Þ¤Í±Å6cÀ îü©v
>qï‘ÃÉI€¼ƒbC‹ç*	Km½9^
µcRÜcŒ½£B® |t¿ÂoUTÃÁìÄ¨w:aæú=£C¬Õ¾iòÚÊ‰Ï0ˆQk¾ÁòòGñ†:T—ôˆeW/”A_«{àH„x¿ÕàŠÇãƒ×÷^×é2E÷ùê>êª%Ws¨X­]E¥u¸¹fÜ:oîw›Zæ%„ÍiÏÎÂ¨q°Ì„–2úF¼A N‘Ú¿?€ÁÈ¯,uÒbðj~6Ðù =Ôj÷®Õ¡RšþD[Ý¬%§*;vÅ;7ã*Ò¼²Ñ	ÏÄ‡©ÇëûJOÅû½hõ2Ê²©u2Â<>•Ð…ã´ç#ðúalQx™¤®ôôÚÛ}¯{ëø¦êÀY¸¶¢xL´ÙæÇFëûo<Ò8ûŠÿBÚ¿!Æ4Z=ò@¤»g<ºð·iç„C»æÐY(ˆÜ5vÓ{½^”Ÿñôa¢ÄG)Åš¡ìí3y÷˜G¯ïA‘I	_^,y×O43›¹ô®Ê4ðn]ÆŽ#x¦ç§ –^FTùö%#ë¾ÙÊmBèui
û"+ÛNz53øæÝÍØÊ³K¥ñk.&Â•‡PZ8ÈÓ›ìFpý(ü˜2Ûk4æYÅÛeé_ä'ìOIËÖl'ÓÑÑx¼0Ÿ·4™Ð#ÌÍÄ£Ý©¼¥óhÙJˆº:ÂÛ
:'4ŸäÀ¥§Ì,8¾ºŽœ<kÍaµJÛ<â1ˆAÞñÀÿ’-/|ÎÀ<dæ›<ªq+´e×QÄ;H¶£¼ü@äò½‡qTÆè9”É5-¯€jœPà¥†mNHíª`ü¦Ë¨E><Ÿ—]ÿ=ä4ÏþJ¯HH*ŠÈ™Kå?—-”Æ˜UB3.=ë	È‰õLÍÖÊ‚J*„µ-*	‹©z»l_0²1þ»J;µ>|¼åE­zÇ;¬-Ï“>×Y×"Ä"°Ñò_„½îOC0K€Mx?—¾(Åâ‹†U[Dâå½³‚`Õ×nMX öZ•¬ôY	êèâÁßúÀ&‚ò˜§»$¥Í%¥Ñ@”ï!(¥ÑŠÎ÷P‰÷Òƒía<ú„eg3ñèÅ æH*½äî¢·¸¡Bš7’·V†Nx®°×†EY´k—C«$q%™+œ®:";œ«V`UGPÅœ˜µÝŽiÐÁ¡³Û"óÓ/dSa#CÁJ;‘š…ðõï‡ŒS¼}ö‰zg¤o™·¤™BcÆàM@>þeDÕnüØeQxö§.¡ÚÐo™Nô²»ïD¥Æ U™7"Êa."¶ÒÔÁ£]ù¿‹Â¡Ì°Ÿí¤Z0YO—TÓ¨¼¶Ìƒê‰8w÷¶ÞG1S¢	¤Í	…íž^‹–BÂ)ÜÑ–|6dB‹Ýtsÿ0e‚Äèu¸.É€×•—.ÂAH—ÝŽ6Õõ¼öÀÇ]lœ~xëx­­ãàk	ÄÙ=‚šŸ×± ×ÈÚhÃó[¹™XËèÜ10w1æ¬Zé-¦nÌR-v¾$yƒ<*âj*HÌ±‰|}*ýõÃöàp~Î×ƒ3R2_=øÅ´±ýäë‹q˜¸<Ä…]vØÉ14*Œ ;IåL,Ú4,F–—<¨Ò|5ãÍgrf¸Œ¢]‘68w¨²ùSŠÖˆô½)ä4¨¤Ag•ZÝà!¾Áa—âA¹–®b²–ºâ‚­ÄïŠËŽÎ\VF·SÇ´¼/‚dÀpêÖ‹E¯HÁ‹Á§[gÿœ
T…*ÒèêäÎùúDÖ@£ûçÚÊÝàüô×ÃôâÆÙÿƒÈÙ›©Ñ'û×@¸Àèï ÕçêñÃ:¨ƒÉ/–y]¹Lº	á•ÉÀr‹³ä[j.	KÅÏ¢Ç§´Dt9\Æ<S ‘7]YË¤nÁM<`xwJ&Ð•kô´èÃ\gO#¨6âÙ¼’Ìæ¬XÖB`“ ¨MšÑKÃÁjqÂÿ„´ºJ$Ë§P¿Øâ’²a`yt[½Ž? Ó.5É#/|þ£¿Y^ú»äóº¶Ñ˜}ã”š"³=’ÒkÝÚ0²ÆHÍeŽ\šwJ¹))ØHÚì2Y«š®c›°OØBºH>mÉ ,/1iI‚€™Çþ>-'fJ7õ·;’ÜÄ<ÛCŸàÀ½ãø¤`7èžõ; ‚§cÊ€¦$U´]91Ó5ƒn“Y“qPdÒã8d/NÂÒÈ †¬’JHEX¼ƒ“Ûñ/
|¡CŒxTw€ÂìÅNÙm)¹ô3ÿAêZiý{·Uí¤ß¡öXñ”gg¼;¾Í†ò0ãÁÒæó=2Î÷HžïQ<ß£Â|w=¸œåBaè«ÜsFb¹¼ù/­"²šœë
pžÏÎ^5¸-éÎv¾xr÷\ðÅ2£l'nËÞÁ	&ëB‰Ô¨`w#Ã£2xÓ]ø•‘Qû+-Ñå†›)!4»êqº]DjŸ©WËq¶àÊ‡HÊ\ª•}ú ýŠ¸V «ÑmÅ dÌ:´ÀLTªD­ +Uý`	ìHU-QËï1—MêÞiÑõ?¤söº4_ËrB­ÉW8s”YÚ$ü|«Þ‰æ¥3±—¤wyäz}U´.¥˜Waò,a'ªL²üÅ>˜¡µr=ï\äŒËQ*ËˆÏÓåk‰NžSM‹ÛV**fímyýûžŽ‰W±c6Ø¦óI~ò<ö.ŒrÅY»Îl'%HGÄÄÿxØþqè?¶[ß©éVw	ÜYéÆ*Ú¹ž€ñ‰[M¤3§kIÒÞïÈ…K‰ìããXHÚ’Óbº–¥Är2a£þ"×¤54b:©œÉª%xRäA@ÕÉ]Ÿ´üÐŸ'U2›>(¿d@’ÐŽ-Ê	¢ù)”Æ³÷ÌMCÅå_&«–6<'mR-tRþoú»ÿ;‡4Âs»…É©¸e¯ø#ØÜ)tÉÄs,­Ýí&5´:b‰<œ'·Z2S­â;¹ÊŽü”Óö>ÉGöÙÌævº™cI'$4F5ÙLö4×Ð¾Å¦U©‡Y±l¶O——Ô„ëZ–í‹³?’~ëìÿÄ>ëÂt§lZkž>û:÷ûò9¶®>¥Ñ“¸•$…ål®cÆeŸNÜ'Hz}¿éŠÀèýó~“^ÎÕütVø_RYïŽØ_ñYf˜í½Tfªò†#¿µVö“™4ú2u3	'…ÛÐ\D®É¨1,à£ÑÌÑ¡øâ,‹_ ŠÂ8Èá‰µüÞŸW²Û¹æëarõ®Wš«W"Oo„½‘ÝFÿ‹ø—ÈÐ+Ÿ'ç+ÅÔ'Á“pEÁûN÷Ž·/Ï^Ó³¡±²Ywîwú:Ý‡\º8ÆŽÍÑ=F?©¼œ8Ó)P¯yAâw)¼¤½ö“dÛx¢Cà­Ø"o˜YfSi×tJµ)IŸP=›/ƒ§•ºY&»Æá>XÜÖ£r1y·h¼ƒ÷{¢{T8Öj´z£TïÒòÝ.m<^Ùq°<ò=9TA8æÃìiˆÝÙÃÜ?d!T…¶s(
žK+ñàHF«ðÚÉS~4^å½³*|±;^Òàå„¿©"ŸÉÈŠ¼šY9y}^ŽLUùWåd^G5Z<‹NÚuxù´K¨ÁËÂzUy-b6¢¯MÕxåÄñ©ñ<ƒ}ªÄ[Î_|Vq\ƒÓhaÐzl>6B2›È˜Î\d×2Ym¶¥GÚØ>ê6„èlôš¾AFV€kÑ¸
Ö—n‚$8~¦i´+äýìÁL†+`Lf³'Ï ˆŸ¼ýýùé¿ DàËl½¶ÈT<	ÞA±ŠÑÄcÎ(ú§"T\|t™‚E•ã{c!7*²¯¬2Vˆè|vö­7‚„•"\5@•6¾ƒ…Ÿ/ ‡Ã_Á\èdã»
2FáHJ‹ÞcÍt«‘ŽñÎ¬·ýtYª™«ve¾ÔEIrr“DªÊ“6ÃðLp¹ÆèPÄœ­ðò6ø'g¤f^œGïLñèR!ÈY@Ø8ùç3ƒá`Àé· ª­œ]îj•+Úµüð ‘ë„[VÈ×$Íu¦\§99¦Š““ÛŸœŸ~uT'Ë¼ŽYûÁ-£¯‹=sFßñøn·Þn'ž"”lfÓ_ÿ3Â?›Ží¤acôk‹-–kcbŠÊrÊŠ¡L‘•5÷&M`<\ð†QÐIÓk·!Ñ&iEº&ƒk>oÁDú–— 'g<ŽŠcHrk`ìý¶œïgIÖOE¹çg†ñÓ¬·zaú]òzó·q8F Tò5¦Ï]Óž	œe°Ø‘j³¨¹CO]hH±$rôÇñ2#Ü{æÉªÁ2–^ j@œŽëy<&ï§~t<9Ë0Ž‹páR–¶ÔC/kŒÅ¼Ù¼*Ö”úW–êyëìu‚«kã&Gó>à8¾Ç#(à¿žJHñ¡à¥ýðD„gDM…¤øHs p:ßT<Š%¾|Õ$dÔáäÖÆÃ}ð³DtzUõIX…Â¢õ½«0¯=Ä²<IMÚ¼kxz¿>çh2iñXF?0iY»Ï‚ÜrL‡M8InÁßû&ó*è6ÚC:Þ5fWÐÙ/1€/®,ÍÐe`&0¾xmiæäjYÝf&9Œ_®Æ²«¹\Ú`žˆÉ\l4«oŸÉ0‚\…%œgzöCÿôæi½^‡ßç™ìb–²ƒmÝÿëœ¿¨4áúó=º“ºÚèx{Ù¦]ÜïÄ¿‡+Q7OXü\=ö9_y2èLAa¥+6]h£*‰Ä µE°¾O(»w3ge‘vµh[–ˆQJ“Õs¤ÅõÜaŽ®Âè§ÖJ|MA­ËÙ½â
)uBxôYdhÿdRm|ºÝÝ$¯ì³³X9wâôD",¸Ñ_ziç Ôš´ãWÂÌ¼0!PãW;Ø'ÞËNGg§©i®‚Lß±ø0õ%!†B»Ø… ˆQØ/Ð÷²Ñ[8›iFç¼HÐ„öñ9“h”Ðwxª«ùÌj“ùˆáwMçU“ÑüS÷½OÍl¾IËÓêCõ²	­XÒrýF¨W¼öº,pæ"~p÷ŒìÇÔ.4L£Ùh}ÿG!¡²[>ï¶TœéªW¼êåA¦ßÍž5]ñÇ´LC¹lë¦Y?Ëšc"]óxºÒ²!VLñ>^_®õëð2Ù:4;WÂ apúo€WõüÍWÝ}æû§"›°0*¤Œ,-AL Š[î´Îß|Ù×îCÊ ˆ®÷·ä¦lˆÊÁRžvœÓ÷Â*ü8×'?Ž¥qà[€Œå°àÕäÉîÉBX¡…Û&Þ”Úu¼ˆJO#ôÁw¾}Tz›ôWú^¥OÅ‡5˜p]ÿ€ð?æÉl³¹¸µµxDÙ	v¤ÁìSWà!ÏÑbD@¿Ûäª“‹O¦Š=›õÌe=O3Ny|@õ²™L•¼VÑ~Wµï‡¾ßUëÊøG7”Úõ¤1Eåy¨J)s¡Ï“¬CEÿ¼úgÜÈÒ?5TUf\ê†Ø‚3iŠ;Ä¨/&7j±¤eUÀÕ¾«‰a­K÷¾£÷ÙEÜšÃ=\´ÖöÅ½BÕÁ“©©+x©n!ƒ«
‹°¸XŒ1?&÷CÞó6fÙ¤¸áèwä«KM±2gGo–'U{skòÄ}rBVTÑƒ¢Và3©åÍ…X8sYEØ1ZÛUO×¸vQ/V”'«3—óÛ6VŽòÂË¸2—O]ÅxWrãLåÊ¾¾õ’J÷B¯œž”(üJ©‹Ô>üKƒÿ×%áùéKQ’–fzêA	E¾%`b-ÌðIÒˆxm™R%Öbåeðå(äÇÒ`”¢AÎæ5d™/AM™µOã©1“5|¥®Zhøb[ÎÖœ•¶rüiúÕ%ûÜ÷3'MõJø®±ùGâ±¹ÊˆUBã,õ5lgÒ“¹Ÿ¡×Þ¦‹×­OÁGäj:ÜÔ"Ñ7…s†GOFá;IŒŒâOWÄ©ì½Tdðëª¿³,6¸t»,=œAiºæF»âÂ[™‡±åâ˜Yëc‚ñ3·?;§ˆ;óåQº}Ò­¯·¶Ø/{ÓØã—­Ý~}Ä¶Ò?ÓŸÞ‹sý¯€Dç§ÿ-”ïrb:VÁÝ>?ý]Ã¡#í –4žÕÄF*‰J"§ó?&ã4á9È ‡ÝñÂVLøUgS1ÊÖ÷©‚B@KaYaN$!fá’½Ë–ÉB*÷1d jƒÕ>	¨‚×eÂù9äË€J§GV–’IQ„F‚"DhBáÊèn–ó(ËyÚª˜G
½bORÎà†ÀK`;å²m—Í-k&xîü–µêÔ*«-S¥,eÛÞm­Øhù/Â^÷¿§1(`€2l.YQøý7ç§_4,S£4¾{/Ü¬$­Ý"²$ü˜Î»
¡O~B_þhïž¿Ò7L¤à1+\1‰A[Àµ‡yï8ª—¼/­[ùäZÖç}gä5™mË€Ñ›wPÒ	Û¥ï¬®zqZ“©»M›H¸š1)Lfæ*}Þƒ& º–Ù"œGz%u:Ò+.†ÌˆéáLÕ•hìfJF·R†ÝÉ|/àzfN²N“`QcÇ„Ë‘Ÿçoþ³C2(ØØY¨ÇÂ@mã›6ä×Úgöi}öa‹ah2ÚiÎR{²¹J€*ëÏ]BwfñÛJ½^ŸC”Né ¹œ‚ºWÞ¯8¯t2Ý
9§éx-®d úâ”mYÍ´v:NÞd«–TZ!¤~ìp©uç±r3ZN(øj”$…DèS¥jŒÐ³`æÜÌÈü¹×;ÄcÎÌÕAÃkSëü…CvíQ{¨ÁÕ3D®¡¶ÎþdXù¦-ÎÇy‚YWìÁ”—#o¥8Z"¯€"Ÿ2žXr%à»xªùê++	UlŸþk@šg“åûo¾Eÿ??ýšþ\´?“ÁÁc€®qÃÝNÅPoëÍ¦ê%Ñî˜ÿ 7FD­›B÷Å,UM~)â5Ì9¡Ù¯ÁÝ½Ð÷JÀw±U‡®á-ú|7Ù
\nyËƒS|³‡àÙ9ŠäÕ}“°½¶··G÷7±œJªÃª6|\«yj@®
7æ•¿’·sõCy[W¿–²AOŠíÔU¬ÑíE°R÷üfú]ŠPeQ|±µÙŠ¢$iE?ýÑß,/ýÝNëüô+¨üuƒ}kJès¡vtý>‡xyòâlÍëC¹l¹+ªÝ*Q1È(Èô¼fÀ›u—œ½‚ìM9*žŽ…VÚuNÉ–USÕ³6Mˆâ‰ODŸá@áàO9„@ûì;ªüã;ïHD¹Y9PÛþþ›¡´5"óªÇ×;ŸU[ªr´ÀV•cÉæ>™ò§ì\tæOkÑÜ)ÔUn?huA{ØÓãâÓ«GžŠÎçtÈ»û­·_{ÜdI‰rÁly•Ð¦0=ïëŠùÒË†ú¦äâÈ%¿à{J	î~¡N}Á_7k:Ñ±Få\Aòagî•jBa:ûÖ£Ê§=ã¼ïç>ÈÉÜ3[zÁ”9ãÒ0g¨+÷”8cJœéG	÷àŽ‘#ËMÏØ4v!†uöÅÛ¯éÉ/‚óÓ*ÉX9eÆ˜3F¼a¤<¥ÄÐ¯šRbL)1ÆM‰!Ùí¥Y1Œ­¦_ÐQ×>¹‚4ÉƒÖ2 KáDé/ÒŽLÙ/rÉé-@%ÅÄarÒ»I.{éF¢6È†¯@y5àßÛç§/ÁÇ~úšŽGœ²}iº7ÅO~ºXü­£c0sT>Ž —àõôüpƒVm.ÅÅ®É9[ÆsçŠÙIÙ}!Ù¹VóæÉ.z·lÐŠÈž×ˆz´»ö…o™®yË˜­'ô£aØ%5OyþvrŽ6zPöj»òwäÇ¢öÖ-T­l0’-?üéâ$I|¿QÁx%ð˜ºƒGkˆ§7ªpû¡nßKJÒ
±öS¥-¾P‚ÚO±«@Û‡£<!Rê>kËyŽÒèûpLFC÷Ê×ÓÕWŽ‡ªƒc$,~8ªÀã‡Ã¨g!ùCgH~8JÁò[{•‹Ìïj>ˆN:Fè‡Ã¡äÚ¨|•vªYÛi²Ç¸añK«¶;l˜	Ï\ÎwÊï/JfÒüýY1à/"íMZ£¯-©oÜŸ8N„§òèÛ…Fˆ¤C‘Gm¶	{Ø‘Û	
ÀY€G†že¸Åí3‘Yÿ_6§óA¢åjs'‰ã°<8ð Tü2ªÃ€„CÆ8áp «”rxl*Òár\ £àB²îU´Æ³ºÝš]rY " [(#D¦»;H!{¸Ê`Ykå±k.î1–¬’hì*A|d-•D<8\uv‹}³“C„#q'ÓÍ!Þ0k¡³:/šÊ2{Ñfã)­nÊ¥Ù·•Þl'Uì)ýYßïÖ ‰¦D›''$‚´‚[3¦K¬0”ÃÓ‹ÊFÃã»,OFN$4ÕéÇ ¤ú"–A+5µÅŒ˜z¸sÂQ-8'k±¼l”é”.P'kÿJ€uÂQJ
ŒiŽ£
‚s™±‰ï”úPÀSj¤4ˆ'OõTËÑa<¥þ”HEÛŒqÆ¢Öðüô©k<ýìÅùé¯Iâ'`ož½
Œü8Õ p²g‰S
Ñ8Y«— —Õ¯I¡r*FUX	(çÿ  ÿÿì}ÿoÇ•ç¿Ræ)æðBÉiI<‰†Lú‹ Qçˆ´×Ÿ±jö´8½œ™O÷Häq	\‚EœE~‹ub‹Ë®qÙË‹5±Èòpÿ‚û®^UuwuwuÕ«žžáP™,sfº«ëË«W¯^½÷ù70§\B%pN¹€‰o*l¼ÑV9x“ôüá¡öX=0'˜F|OU¤ö {nÒ]áÆØSÿ:ErÛ›‹ìÉWJ@ÊNÖÕ	¢yàÅËð‚-Î?!_Ž®¾ÿ¶9¾R4ÎÊÓp[ÅtµI€¾aðÛ€	¢*z#›&v«lMÈm Útº±\ó¾:¡zcg¼^É–á¯ù}Øç´xÐt¢|è¾Ì…€?É© Ø¦¦‡‡EØµ'ŒØŒt.ÿ©ßq­¬5[¤µ©Â¦u¥Žj6›v i€¶¦ÂG“þF£˜Á„­„av€~pâf7¦LMR,±mI aò<E¬—5áƒáÑÁÌÓ¿RÚw‰» œWÑER†Ò%OöÄbÒƒteôCOˆÏ£§‹Së*Öñlàx]|‰âˆZ™ËiÉÝeƒ©e‰¨U†§ÕRáiõÚÊÍM‹Ç	l,AÒJ"‹ÐøY›õàg‰­Åf¾0¹-[ì,\e*+ÃËà±R‚ZŸµ·û)24ÅÉ¶@ÉRbdÅeTBÈBl:±)¶ž+,2Öø+!²—.²_elŽ†lÓXÍ`L.=³óN“Ç:a&¶šC0lú—5“ Ä¶G`zâœzCtëŸ+ Sv«xp˜˜Wã¢0},qŽsƒ”ÛPÀ‡ò¿€+
Ñ}ÛŸ Séï5ƒ1å=+o,“Ê1#i$!Ùâ›8“øN‰ÏtÛŸiÿ´ïÂBcËä‡ð5)ÏS³…¡ÂNË€,³P8DK“{³‡{7æu¦þ¸µ¿¥sp`Šu#'DbÈÊ ÀëªÅq¦6FLŠ5ü°:Ý4â°‚‡™àtc[^#lFÑ4³ ÄL†¡Ô·F4¤8ð¢‹JHÅ¢ûTßè7oŒ Ïàž¥ZËƒíM	W¯€˜—­Ë/O{Í^žlaÏÑòæhy˜zÔ†–—ñÒÏòn0P_Åæ0yÊ{þL`òðyÏÏä€î6P§¢)ÃÛ•fTÆ°S˜‰™ŸvfæóD¯Mlðv@êXµ‰¦Š\WbŽ[§Â­S¤¥*(‹Ù©,ÔEe‰[®ÈnAqJŽÀ‹›,\½ØmƒZ»‰ iLÃ[á0-ÔˆPðhi0Ø5‚£¦ÒÍ‚F‹ì:ÚnFkšp[2BC¿šŠvQ~”Ù/M‹jM‹­„D #	2-9Ç˜#¦e¯i#¦¥ÇNc¦©‡ûæÃ¥ÅFX,-º6°´|J¡ÒlíUQE«ûçPi‘8Ã :QM@iiÀ[)LZy<$M:bÎ(å›‘&œ£Ò¢9BÚ5 ¤É¶Ð-‹)ñÑ¢9>òÂá£‘8®D;ì%aÎY•"ß$©ñuEŒµñÖD»³Gfa…6D2¾Z¼lÍÑÕª£«q™šc«™Þq½ã:ul5Y-ªYOey)Ÿ ªšxÏ\­ìÉºåS² ¦åZ~Ï?&j~)éóÎèôêâ'}IÇôc2 s>ãBÜ‰•$à.ÙŽFsx»*Í˜ÃÛ‰ko÷fÂÛeb³få®PÃ9Ø]¾ÔˆGCÕkZ`wÒþ6šCÝž³ÜãÍ¡îàB@Ýƒ¬gènã®t'ãÝ`8pE=Þ`Ü»bJñŸì]~¡0ú]· 3ÁË¥b›ÎFdä½•l
WbG=#Z÷yÌlaé¯:µ XâcBÄ8qYHYÙØÑBíx§‚ùó@•™–vC.9MJK“7zcœž)ÃŸÞJÃŸÞR†B-U9,DÖ4¦£APÞÛ+u½,wä&DV—J+PRSû§1àëþ‘E…,c$ßP(MÏéU†Ò¤ÏNJ*;‡Ò¼v(M‡9„¦BfÆ,@gÒjTƒÎD?8ÛÐ™ªI‰DÂf8['æ…j'"­H|¾£<51.ùðý“A0dcjÌŸÇ$¯úÝ Ÿ-–ƒòülÄ²gß?q½®qÆ¹‘Ð‡õ9LUqöZ‚†
£†³‘¾8#*ÎµÄB­à£Wà¡²u¿
ªÊ^†„ÊP¦|Òs†ÇüéAP™†ŸN¶u) *­Âx ¨å~*É€ ²QÊŸB7Ù€ž[ØÓ9ði½À§*èS×è—‡ApÌ±Ná›ƒà¨‹ƒò€K=¥O[€ž–ÁžŠR*Áž¢s@±î-û³ŒzàO38fT'@À¨tŠ‘ü¤¾þŠö49¹ºøÜ‡Ô†e9¡EüT¸wö`Ê`y*„ÁOµ<)š,
BésF€`†°€UõæÝC•oyC:9#žjÞ©94ÅúÜ~ruñ3ÀQ¨äº|˜ß1§Ð?»•ûGŽgÐR†e&Âq'`Žu(ÿõ×—ß:µ$ØÄˆH4èÔ9¾ºø=£R#Õv='ÛùÄ+"’WýBçÔ0o‚¬¶?(H§Ü™‘ì¬(ƒk)âuÒÓyÍ»JÁÆv‚0Òn–Š@cðhL«]” c»ƒõç‰Ë •ñŸ÷I£¤"š<`³b¶ ,¾×¸BPe`ø‹quáÖ:FSà¥Tx—ià4ŠE¹4™Ày4À< GôNÛ½àÐ§íf+Ïòèƒ!aãP¾LåO«»{Lzí-ŽóMèbÁß»‘øAËÑ²ù@–öe|tãš‚N!7£”÷‚v^;óÏîî>\Š3ÖÁá ‹àiõîû=Çï’¤á6G¡7ä•`ü	QäOµâ…Š¼«÷Nk(y”TªúnÓ§È8±_ô ]ÝFÉ_q¯ÐÉÇ¿\‚·4’–eoNÚ›Þ^þbZl†Tuxµe²¹¦¹²î2ñÛ'Æ€e1"NŸÊµ{h×I’”rh’Ô©Ð®ôWeçòöÒ[ø#Ê{D¿å¥@õ²ì-Õßh£ÃQ›nÛö"Úñß0öœÁçn“ó¨ýT}!ît–ìÁÀ”Ê‹ ¨	rÓhãV:YM<õµ5–‚Hm¢ÿ¤ÃÙDP0ÅeØŒ0H
—ARî”+Ü¾9ŠªcˆŽ]­ -tÑöáöZæ¼aõE0D¥JÊvÙX›¼5’`(¸	d†„¼Ék"þ†¨áaÿ‹oY]çÀ…È$Cma"Æíc9ÊßÞ¨¶3š>JYlOvð‡$ÙB2™“òò9ìK¬ôÍÙü8£ú‘ü¬[%§ãRçï®¥)ýt™í»ôKt|W»ÁµÍ Îcê&ùü4«áq1ÃË?$!hç¶Õxg“y—·žó^‚„ò*16š¬„Bzòà„0=¦ýüž”(€Cp/ó„¿’Ñ‹„o§
ŸŠ¯ŸpCƒoU”½A—…exC…$ö »ìï|*û>KJ;î8þu‰¥‰J#iÕøx•D•‡0“ ¸,þÍç¹1Ÿ=÷Õ'‚Ë(ýæ˜Š¾˜Œ¸ªä‰Ô«)nÌ+#‹@$eÞŠú+‡\+ä!kÄ!MJ‘†\«ô_Ü  …‡æÈWÔ„„:·º‰Óo“÷˜eLõ_¥›séúx®–p8¦k+-É>Õàó¦&'ÒˆB)²bx5_urORêLE-h÷fô+jÜ;äê÷/»_£gpd)×=ã>22‰_\ýAûª`ì&Ž·$4cêÙžü½`À0OG½Coø~ÔÙ	z='lHÂ{‚'+4îåãe³â?4Ò4^ûòQ'„xøE6ÔŸRz¡ˆ²¥ëþÐé2W·ÉÀ7¹lK(’û¬CÚæ×_#”c o‘†CN‰XâîLbV?=‚ðwvîƒìýà&Û–l:~dÏRwÆ»äù­ô£rœŸÃ‰í
ÊÄj-Ù¹+#xKðˆFˆ88äÑK»›KlÃÀ·ÔôZXÎ¸{¶Á‰‡×Ùó¡ä((›À´óSîŽ?¦OÄßÀSx@¹·è }àŸxíÆúÒùêÞƒÔ5	ñ¦ÂÞãòÌƒhB²?¢ê{x
Æ!5 B³Å@Tï8%à2ûŠ‰kÌ˜X½»†·'ä™]&˜†+v÷ØïîÔ{G9¥îè~:â‰\ä‰ç´·ÆwŸ”{jîÚ­1ÉRéŽœ.T/|· Š˜ßöœDW¿è‘ÿï¿Î>êÒŠ8`ŽëïúZÖ(â~ÈOÙó]—Y-óïyéïq;M ü5äø+°	pµ»wµý ÿÌ{éõGógã5/F|3x'^+C¯çËž¨8­‘E>%“ÉíÝÀaìž#ÚáJ‡w»•|ã$\)RWeVO«y†Óº45-¡¥Ÿt³õ69ð{^9½A…­œÚ­ñp,”‹JU_xNTq*Û¤[aÓöw>9òá6)€ÇBMâWL—c‘á2@¦›Ba.“Å>Úêõˆ}Éœ}OW.¢çHioj³-ÙKö@màJP%Øu|ª<.¿‡üT!Ybh6Lä.°¦8.§Rü)ÆÁƒÜYºÍ>›îè%!³U‘ó,SÔ\as³ÀezswšÅ¯ÅðlÁBUÃ:¤qûÎ©:Æ·Cy˜ŠT¦ñØ­Ý:€îq4æ˜¹,7
»¤g‘· žK
{áŒºyä­;‰6[™°æ‚¢F×AJ¢Œ×
}Ä|åËäÏ?À)[dàCïƒn@ÕvÁ]ÕzLK5Vÿksõhb`¸M¹ŒL“-’SPØÇÏÑê¬òŠVqOãAìTP¶	^YëöäO¿a7Ä0C©T¡ÁÝQ9f6àHê¾Cw
Cƒª½¹È»” qe5]¬:+N:¹h8
ø…– S÷bSžÇç7\|÷ßç´Ô9¡‘dYô¸‚„¾wù« â¾òÑ¦+©íÆü0
†§ºöüÖY&Ôáœ¬ø*>??nÑÅ¢\}KÔ,L	¤Aûèá³4àÎ}½ŽqI2vLÃbu€™U@®¶©ê(¤!Ä{àÊE2cXX£<}rj©„EM„Œ	Õ>•&;ØV…<h¯‡ 9a.sŒ}³‰Õi2„0ž°AS6ðíj„SS+t°Úó‡ÝmŒu‹6Œ¹¬Šü½ô)âÄîepZÄÌMŽõ§j¼á8?ÅQk_]üoºûd.pU.Wyt]YÒUºý ìw½ð8
"³îSß{…Î[é
½öÏ`Èñ—CÐðwÉè¦ü…v¥”Õ¬ËÜBÒ:"K9‚7S]ÃEea{ÿà MT9ž¦›¹JV!¬&¶âÒ0ifg¦:DñËŸ‘LÅ£ÃÆ‹SDeñºCrËÈ±‰Á²
S¼ÍJŒéQD¨—Š;“‘4UoD“+A…7ÕÐó|WÇø‹ã˜¼„ÈXØY.c±Gç´«ñ- ùì$Ãñä²äP{„J »Wy·¹°ÆA
Ú•$)˜Z'Mòm7V¢žªBÃçr5¹JŽñtR•ÞtceªìØô+	ˆt$Œûhtâ%î˜9Ù*œz!älÿêâkQµõãþ-µì °5%M.îôº*ñƒ1_»Ô»¼¨LÛÞcü¶0-y;>N®­C þÃ	HD{Y&'X*J·á¾B6 À…F-€kBÈpM ½@*viéµ¢ÀuMHpiÐàÂ!°;ó¨†|÷^_Êj—¢ºIàrÒ7Kî^0ºŽÕ8â²¿2Ç*92c`Rj24|\ßþ}ô›ØÝ3ë8ÏTœg*–^ˆ#‹É…¤ó@²èBZ«E’b;áD$`€`‘[N+`È‚¯7€Ô†`¡\O³Ž+$¸Û(bMáx
5Gž±/P¡ºr”îTºM2éÕÁÆ¨ŒÙéE [' ªB†y£é–¯TìàWØ„O'™vŠf;šTÏç×#ŽeœUf‰Ôá?eR7Œ“Yc?ŒßLÔìCäR>WƒôÜ:S`)ª²•“Î§<Ž9Sbw)«ÍÑ¼ls.Ñ—KÓ”)œ&—ó)«Å}Çùð/cÝüÊu)¿²{TÝ±º¹–õ!¡Æµ< ½¡Æ÷œû¤r†X!ˆ'&Z'WVH¯ÜÌ'%šó&'’†výþú«Ëo¥œÎ‰u|
¼SÌD¤¾¡½¿3ñœKvE…lÜ	u™µVƒYÈ°ð«òÔÚ*Ã_È±µ_Ä~F…´Z»¬Z«1E‡äÊuf¨»T–ðúmøÚ.N·Ò¤ŽE g’„<(†‚àÓZB¤£Üe$'i'¿K”ß7ÃA×Ô¢Zj="ðµÇ®êÖRó¯¿ßX\]dv×"$'œ)+W¼øÖ¶ðkP¹£~¢'ŸyNôÇ‘G5&Î&;ºæ˜™±
žXIÂ},â»Ÿ q°eh"žÇ¼Þ®¯;‡J»oæˆM×"‰¬ëW°‚ˆˆ<¯gBŠ9Âð/xÀÖE0~õºóÏíœG71k\JÂ¡êoÆ\ 7ùdŠ4[ÇÄ4`kØÄæ$fr“|ªÊy¶wÉ«x©)Ä3 +'ÃÕ‘Ü×´¼á+É.|¢7\ã${³·Y¬ðê¤ïÀÇµHá²MâbOŒ!ˆRÜX½ÉÞ¬bŸM»3l#4jåŒéŽ4zbÜÎ(‰Íâèj3ÊÆ/„©H¹à¹ 6³ò_.;‚ ØÍv¤LYqnÂ´’ÇHÎû®+3]Õ‚ÌüuœSáÝ²ÉÒìõ›ÚÝqþùXKì¸çÉ9¯/ëÜz‰SežOI@êÉ(gï®[ÔÄñàu&³v)“È+O•Bzy&á¾˜¦« 
Mß§}¡ub:{1.O9»Eºû§ÿ@3yÞ%ëëtý^_;/lhÓÌ÷õV!rTªža­·GË;T )?Ëg›zœw#gáÍÁï&™/	Ð‹c6±qÝ¤ÃºQU±’ÃÎ)É„ÄîÕÅ/ >úßš`ðŒlËÊG.f¿
´&d©D!°,Ò]k{D7­Ç¥æ”;™V¦ŸÈI>Ç1°•]Z&kKŠ8]âÂ6öXg‚ý•ú#-‚&¬ºªp]—%§+ë=#äþ´]ox§H°0Á	ò€L¤Û0ÖšTx»mU”ÂŽy/D“gº Öª$=fqe_ùAÂLØHÛ±*w°ˆ^Â‰¢"Œ/0&…‡r°ù"²‹Yq[IUï“;ñ¯8Æ¿/dÑñ»ÚøÅ“ÅÄ7wàùRcRNñxeº}¾]³ îâ+rùæyö¼úÉR£Ô@JSÒ£Kdµ“ò
¿3ŽgxìÁöŽÐÝÐÝõ |G‰ºs_*OÙ,8Éc™­Lè¦æ*>sÀ’ØÂ›xÒlRÌb¹µTMWFˆÌ›¸ïQ­Ðö„¾óÒ?bdœŒùé	£Ó®§ÃœÕCu÷Ú[ìïað
þVfãÊ4•2=Ó
ËI°3…:²\Úy9i3+ãŸÎŸ¼_ùÕÊ;¤CÿSA6ê
3çývn–ÖC0
=¬'îÑžèzNècøÑíÓ£ìzÞ>•âFöûÇK÷W;·uQ°Ú¨rØ$PµË¨mBÈz…´br5‰ q$Ýµù®Å§Û–yyùMfOóa kù~Çó"F³akkÂ].£ú@—?’„PbýxµòÂ×Û?÷Ùv^Ûå<Uß¨Oy+p?ñÓˆ«Æ"O¿7½ÊÛƒ:ùè^SÆäË’o¸‹r¿¥¼¯ä–ÉüfÃu¡hqi}—,&ê¤ô–è©Aæ"ãàòÔÒ—œO)l2ô%žk3#“’é¢ý/GÎÐËj¤ÛŒÊãgö™9§R‡FGÔ´…ûˆi„•4Â$â™fÕ*èœOæFI:¬¼ûƒ!ÄèBT•ö×_]]ü-]¯.~™YIÆyí:£_eÎ4ÊÍ€Ž™£{Nß9¢â¦i„pL=8è†Â÷GTâ“ÒOú§ö‚6ÜNÿ§¿/õ‹±ê$ŸtOAˆËƒ3øWwÆ…Xúi¨-­ï9òøÝÒÝ3â(€>ÿ¥»{èSÃƒ3ñ‡îÞÔ®§÷KtÏ¼ðûN÷¡ü`þS?í9ƒq¢.¢ÝìöôomÝXzãÎh8ôúîiœîÖ=yäE‰™ºGµJçÁYá+Ýóüˆç:}àìÔ{8†qRdö[|ýYx_¾ìK½”?êÁÄ¦µÎŒ’ú{]ItÁ{TRXéO˜šI·ó`8ðN+¨üYÏ’¢Mw˜G¶ððÎþ§ñøª~Ó•È pi'òÿ—ßYº¢”S_)•zf97¨vpbd9øŽ—…é§kyÞ+P}ãõ_¿ó(Òé¦‘,+Q°2$/†AOÎ”¤_R-ÑeÝt—+ªr¨È 4¬Ôë&0ú—q4ÌªM65ó[ì¸™÷à˜Iiçá‰Ê\`ÀlO\œ¾ß3k0ê†òÌXÞJgvú…’?ÑÕÅ?b- Qu£“€ÝUtÄÖtBà—·O:“yxwë‡†ñp0Â)Ø×p¥ÐB8Ë´:	7ÿ,{Bšñ5°NáÉ€Çô‹(é Ùò¼ºø‡–üý¯úMòÑå7ô5ëämÒ"ÝËoh?ûxïÿ±(‚¾ò[ZrçòÿÒ;©ÕY&öÔmöò¿§7ûð,ùmŸ‘‰Il"†ÅÈS…:â7üë´ƒ'Nñ(×öø„©‡t‚µ‡Á âƒ†9ÿ^, -HO;åN—“•Û²£¥d&BÃ‹–Öº„}ŠÁÀ1s4Æ8ôè^Çéñ÷uè^¡ùÇ
…%S\qÎatGtËæ÷·™x`©Hõ¤¹ìƒtÒÎ¶`à¸~tºrgsa{,:Ö¤…r=2o­Î¦Ñ¯Ù¼¶&°µó”e²;ÐdÝ„ìÈ|‹j)—4À]¼ ª_Ùâ²#V€´ävb£ï½"õÕP<²¤¦WÜâ¸-É¸`›tLˆÝ¦2Ì<v÷¥Ãy|Á°0Tˆ2Šê$	 QPõ±úØ.›™³„øu8;BÏDŠÑ÷Ÿ8‡ž2›I-Ðw²a YÇS©§	§ßžøýãJuer<Q,™l±ì`%FÈ'ëD7j#ì¥F$l°ýJ_H B¨û3„¡»€©Þ…ÞÏô’Ël†ˆM•€Z—¿>Ü¸£&éDÑ ÜZ]mnØä{ˆ¦ôè¼OL’pµ½Úl6—¬ÈGŽŸð¤|2ìVÄÁƒ=]®¤B&ªäÜ˜Rc°@£žNèŒCÓ…[9“A
¿™à2Ý£¾ŽDÉ¼ˆ[Åv÷aó­êþiß;×;m?„Ãræ_ƒ§©*°+ «0\—¬Ç¸3YROÒˆPKl“õg<½vü—´#,5Ðƒ“s¦·GCv
|Df®ºÏ&iÍ" :§¦b£/¤V¹7±T'!Š¼¿“ÐEÖ!gk¥lŠÙEv3ûàõWNnWDõ…m‚ù2y,ÚñÌ{1ôÂÎÎ«ìÂµ½Y©G¤bÿÈ9PoàŒ8lp7q|‚/C˜Mö6ƒÌêåŠû1á9"Ž‚ t£Ul -sl#lpÞ¼rê-xœÃx«0vtî2CPŒVàÝÔ´ý£sOt/ÿH¨ð`ª|Kÿyý0`.ÿÂTî®ºC J~û³Ëß;t%ºúþ_\râÑ Æð7ô¥·qß‹KÿfGümr9ÕŽè4¡zÓ>Î]ÑN¶"2žöö”]yB	È9IRs¼ ð/ZòŠÏ¿’ç‘GñÜŒyÿ„yÜá`ðìµù\Ôž?ŒuÐË8^ÍÏ¨Lþ&"ïŸ¸tgÅ$±{uñsW«×Ìªv†5aq½ðð93¤ºÜjÁ"â÷±7ìùah:°TÚ£V%„`¿ã{ÝvÞM~ö\– rKón‡m®EŽ©óüÄ&³ö: ^¾²ëŒù›+9T*ð¹Tº;©H‰onËB%¾Ë†ZÚHØÃQÛöÛ{Ý®Ým­µÞAhŠ¬˜Á³ÉP%\Ô¦>†ˆÖRÉÊ%3IË¾^+_Ï.¿!apù«ˆ¼M>¤26 kwW Ío¤xå;++G-…¡Õ“œ·ÉDgw4 ¿ÐNÃ`
›Ÿˆü¨v"
Õd!0\HdC'^þkÿèÍ•—$#þEFZøW–Âb
´ãÉ/Áp@¥*$zosBoÅ>ôÛ~»1`D€o®þÃ4GØœ%ù:â]™ôRD8aÔG®ë…acá€™:. 7ô3ö7]·Fâ‘Z??}kÁX+4„ÜYÚÐ]‡Cç´	!ì„cß‹’öOK ]È=„È~á}åû¥öüàòŸà¸š6÷”<ÚM©(ù	jk7d´þÊë9ÀëÄŽ¢-²¹FÅƒINK-ÂBÂFÒBÖÎcñ<y1­ÄÐíóE¥”÷+És[gqßé
lKC%Áo/	¹8O—žczM
¦á­HãhÀ“d–íïZ®cm'¤`¹?†óxæóËœÆwi—Žm¾ëƒ1ÓÝ´vÃ­8¤Âœ•O¼:‘ß"§µœt‰é Ì®^dÚ‰*^œ¥»ÅIºãS^Ó	Û¾ça·-ù/ãsê®÷"š»`°²¾Ú"ÜIÉªyÊ¾9[¼û»Þ!í×k£Ðô2‡*Baxˆ›zËÌ;°L¥‚t´Ùl÷ä£É.8¹“Ðju$s„gÏóŒ›éä$†åyq3w¼Ég˜ÂP%ðÐîi}J’Ñ-ˆJ¢2‡ÞçtB¦Q(ö å¾jP©pV?_ûB µ{ôSxWr¶EßŒLL¼p,,’iK*û×]€( 8ù_Ö³¾ç/ú|™ô¾ ¯/”ÚŠZ1*k×x~ëŒ¶ø|åÖYïü¹yá“£“þÁÐ?:Êº4©¢ºïXq³-3áBç¯gãÕ#O_ÿ¤‡"ìÌ4 Ù\£+=¾Î¨²nm,úï&û÷öïöïÝ/˜…rjæÁË¼ü¡œïô<žU§ÚÑù6ý!nÜŒ@pA$,[´<¾Ù¸0MGo¬¿qzãt"Zãt¨ŽëÕëë×¨6:Ôâ8šÅ!íÍÎßUl‘õ9_&¿\&>gÏô_rIšüÍÓÞ‡PÉF‹JÖÚâÒÓ1½Ê:¦—è˜Þù6ïBÿ¼	úã0!t2ÃíH—IÎiBe•E»jpÎ‚Çh™ÍÅ\eÉ„^4%OEö³*‡ócoêì3¹¡EÅW’\qÂÞPD@oÈ¯;°{|ÁÏ+/ lDÄ÷¢à¨ŠÇ¿21R>Ž”]Ñ!?eû´5òß î	‡Ì¹y9,>ä³b³9¢ù‘$j£fË¼ooÂë'±wÞ&œ{(k™÷ãÕÊíŠÔµï	˜¢Œ1v]Š¯Þ~;ÿÍ6Y»9ì¶Iq+`bþØC;.Ù1èmÓJ|nÁ§‹º¯fòZ3í<»9Nˆ·gfSzt¾µraõ †FÃ0®Ÿmù‡}J¿vwMçsƒn03¬ˆÚ(OdoG@M–EáM5“
à"ÍU.lZ°!Åâ·É£]›°³Œ§(K¨¹ÅÓâ^€`ÆüM<™ð|8ˆPèÂm÷©µ¼úd òÒæOôÂµW˜î‹ø£»Á«¾íÃKÉÓŸ´Ï§zS~¼Fò”iÍ"ºÓXK®YžHà1½I³è€ÅÕ1yXËç3gÖfÎÝ4qv‚¶w“&ÏÞå·¤Þ	Äz`>‰fm	ÏØìÏ¢£öqû&Í _õ¸&ã5}>uæS§pá¦ŽßtYÞƒ7¼I3èió@:•¯g*É]1ŸQ37£ZJ'ÞlÏ®8È§?¯ä´n«iõ “ã«‹ß“ÆcúïR=3‹wÃ|NÍÚœº››R‚Nb–g¾Ÿþ”²¥†ËTl[ÏLÍŸO¥ùTÒ\¸©tè;Nðôà¦L¦”ŠðéA=³)éù|š¹ù´vãæÓ¾3—HÌôxpuñ7,í‚ü€< ²x“U9OÚ\ÅY˜žIkê™›¬7çórÖæå½µ›·Lè¯Ál¬¼£Óÿ›Sòú«ÇõÌ¦´æSjÂS*;_îÄó¥¥[Ç¶šÀhbñNÏR¦¦°ÑûêE~œ#¿Ï$Jàß`C™]ºæ= ±=k·Ã‰Õ°aÊ°b@!19ðBRage¯&_b2*fˆ‚-¨ÉÒ8Ç
Õ—ùÏžßRdù}·;j{aƒE)	z2Â°ºÉùÉÎ!ø¸¥P–…°Ã£a0äu-‹ñ{Ž¤5SóòUŠœcÅYDÏÁU)‚®Ú£èX¡å‘tÙÃ²åŽ,×¸sp)ãÕCï%Tæóf³	/³¨9|\Ö‘sÆÚÀÿãäWžVKÿ}‹eQÛ„ô±Ê¡ïEEÚÁ…Äð²`Þ”ÍÀÃ1ÆO=#ðèZsS`fÇ)ž9LxÊyèn’r¿Ä„c‘XG}€gXû#‰0âóÃ¹ö¡L®}¾¿Õ©­´awµäe
èÕØ.ŽœÃQ×®ôG½paûÑî9“*ÜG‡¸±¶|wÉ²¶dÜõ‰åº:+¦`äÅ£‹œˆmKº*uÁ*BÇþJ>ˆÁ6Ý1ÑÆ1²ÞòfÊ@%«-–†Á°ÇOÙt‹×¦|gÜåÄÈqæ5_"½¥ø¼G C¢fŸ6ƒ}Ý0ôØÒÒ»Í8~YDÁGOMŠRLã‚­Ûu-NÈèÃÝÇ»¦>áý€\Ú'+q^ÛõŒ]Ñ²ëŠCÐ51¾„ÿKŸÓ€u„S“óZ,ÌI6TsˆZ}y`Ú¨J>¥†¬R 2V@³ó8çÝ(AÔTŽíQú3 •ã#Ø‡N‡Ë„n$†^t_z§ëZCZD–³KÞÒ9Y!É3B¼±Ø/Ëzàü¹…-›ø1?óz@$Ïy0¢ÂL¿suñ?3Fÿ(ATÀ÷~¦Â÷IèÃìö»ÅÉ[12yª§­@_cŸÌÿûû¯“8	þJÜ4kóO—>.;9iItÚNçO¿sÈðòf
?ñÒéëÀ-]“[n‰ò.Þ¥1•«Ö†‰?6YÊ1Ç†éå%ÏËÄénº]úaEeW‘m×]çôìG©:`AÓßZÔùâP„Ëd
ð¹GYÂ ‹’{–´2%óˆS4{í…í¿ 3ö•ç?$Ø¹åŒ»N›šû
óV§Š¹9‘–ÙaœÅ~¯f<	\§ë%¸¯¿žzåý€¦ÊîÓƒ™¨®Œt¯©/8i}?€ÄÜÆúÒùj¯¨ÐWiMËw¡¹=u¦¦XÛ0t^xpäˆÃfrt &ž%eeêûÙ›>ÞB‘?ô´\pIÿòe	  _À§–rU+¹³r‡Z¥wòG(0€4Em¡7³Ò–Íºg˜©*må+Û£Ý«‹ŸQû3¼ºøŽDç”aþbR¦§hRUbáLYh<ÿø:kZ^˜‹ŒA—ÿ‘rã.á¸Ö¤JØ‹õX‚]Y´-…;À¶ƒ¼Î_¥¢ý~ÛøÖ qh%¹‰ì¾þÊg˜œ.Ý8ýM?`oSGé¥ÃõnÕ!½Uä×¢£æ¢Žuð’uùRƒ¨ïz]/†Qf'`—CÑg4)ÄÅý`è„Ù—÷Éí=°Áp™Á¹Œâq)ù(ÓIŠ¯uÖvºût¯úàl½užE·[Ù0¦¬-ƒrú‘C'ìEšˆä¯„J,#Öf<eÀÝ6è\þ+‡cÆ"nÌñ#n$rDF‰h}[¹îvÐa|=ó._:ýsäz†ãºË°ŽO?‘’|ŽcC ®di™þgnùÕ":¥ÒËåÐV‘8ºÅ¶Ïx”‹Ü"Ð%[ÉUù‹ tÈŸ_AT
.%¹Äb²VÁ‹ƒÃa*˜²âKKb³f¬ýh¬SÞ9WïMSïLìŠ-dI9Ñ[Îº‹¡ÅåTÕÝ$“QÁgÃUîµ²8ûL¥Zå#š¡†JgMc´TÌçokþ±RcŸåi“oa<‹[ç¶ÚÀÆ†÷rei\€õ*ú|IO\"ÞeÄ;,ûXñ>æáüž~Ç!‰ŠUÔxIÉÖ™ßñ²PŒeD+€\¿Á‚g­àëc³--ˆ7ßèþ `G9–íïœ4>âéæÔŠ»øh~íÓ½ŠCZk¤}ùØáfbËé´í”PÒqü²…³Ãý	©É\É¸h¸xM%¥<é`°Ã:ç>\ú^RgeÙs¢N³çœ4Ö—É€¬ul¬1${§ã½ý'Þ‹§5H,¸|EC83þŸ:Ê
ìöòÍnÝæá~_É¤á?Ò98¾0²ñxãÏ‡5tF‰$<ck¥Jº\Æ{¶mÙFžÖ˜£Uù#¬ŸôùPxmòÐu½Aäô]ÁC…„Q—–­eÄ¦)—“Äâ‘tS ;%ƒÃ•Û-1©‹>V¡&žp£–ºCØZä¢xÏÝ+gÑ6Cú>ìzCÀ§B}é+ÆÞ½™'ã’ópeï 	+0)þÒŸÇ¯"ªkú²Óa¿#{H¿ó§ßÑé$\(îåïsÔ±±ŸÐ0…P”²¸è„D “p2þñnž‰ìöZ+‘š#`ÇBA10Ît¦½š0nélK÷{pÆõK5f²1)S„ÙVÉ1è–a¼[î°¬?CcwS2¬„ª—ôˆ(²¸uL$$áqcáéÓïÕÅOá©IB^×VÄ!å…p¹,
lºv	{ª/I–lÓ5µýT“°ù0ÂŠr…¯¦Û[W„4iÄ=G¼'<“ø¡¼OB dVJ|ù:­W==p| Àì´f^½9ƒ¹ð¼þê±f´õø´	ÅJ‘ë“E73h%(ö'úH’i¢Ø§Â¶‰±/ Ë'í®
p‡oŸ¬Æã ØolfSIã\¼ýƒƒZrUÐî…<Êt‰°ëI&ìÃß%«Â¨§ü{Rñ)Bi-5_—ŠÐµ”»¶¦P
W-ï»­ÊE^ØÞù˜ZVò’ù¸y’;.óÂŒîµ¼¬UÒ›;àïC@ÖX%M •±‘¹I´V[~iÝ ã~™øí+ú(ºvµOÈÒ%e³5¸BØ¶šî‰i©°3ždª4T?—-';ëåÏ©ÚGAù‰Óõ„Ê§ÂêÔ¤D±ÓšàÝ¢ë§49ÁÒÖÔ3Hï™3H™he2E-";ŠOãcŸyÕ£¶uÓD“T­bkXFk¶5ù¤V«à»~œÐ³VÑ¦Ê*Sû6JReY?§‰±Xõ“}lÚ€×?F ÉÅ½“ËÅ-IÄU&‚{ÇïÃæšZó$äÓu7í²oÒ3lE"êøª‘» z»Y2%ižLÊî½T{»m‘PþÅüV2'Þ’‰£uÇ€ï<^íí²b¾EÖÏ,/‚YU“IÑäñ$±°’o/œCu‡ÑŸº§\Äß	Âhê’Úv+2«„d¬‘©G˜Œ5µtI™9ŸŒ4;¤TAÇH'î}ö)ÍçŸ[iî8Î!–½xú­äd~º?slÚÁ˜óŒ©FßËm?[Å-`¢oaÛYWl0œbðs›$¸p¢Ça½Ëob³ò€Bœo0¯-èTw`‘tÄŒG£¤¤r(qZ*èpò€è_§ïå¡Å™5Ö[G¬mêÙÐÇÛâ}Ýég1Þv³$ÞV¸b6Qñ¶¼Ì¶´hJ~›™¤¹9Ù¨vX;íÝ"»îÏa%­l:)¦Ý¬˜N¹XÁY5˜æAªü*	R•¢‘ø)¤.Z»¼´Œ6ˆ}Üë 3Â¢mM÷6Ö‡nÍúüÏÉ*9c‘®çw¨žY¥=c\ên¶z¢£°!öAø0HD d&¸²Ž/ò'ÆÆ·¦A“¹sTœ¬*8ò“L9£e1Y™“ˆ˜ÅÆÌÎED5Óï? 9ÑÂÝb%z‹¦ºÃoÑÁ×Æ09ý¥M·ˆÏE¿”-¼aRfáwXX÷œ>Œ1˜g!¬£ÊUô¾T!Ý 7ÃJM]9ûN‰^/‹b€4}ÜXœÌ¨|\Pš†b<lÆ2SòHÕXâ^—î&âXd k>"s›%Õw‚«ïÿÅ%'^´sá•IŠ`évüãU‹»y=Ga2XB"C!Ë‚!×’“Ô£!jŽôÊE…Ñ’C ùW&¤e´#›s:UhPE@™ÐòÁ1œ6!YLå(F­Ú2k¿Z 9–Žró Ëø¾¸P{”¤â²ø(|ÔK†×wºÁÀÉ4¢áÈ¦a\Ã èUMâ‘ÄÓÎÕ÷ßÜiXéÌ¡­îŸ‡¸PsJ–ø˜øÂBJ¸~xoÔ=æ¸+FWjáÅäðPÈÎõ1EK‰£’Ó5Ôåò[†hôó>i”Tè\ï »™¢×öB:…ÝÈ9ñ³).N»]K‰bf^r¤É4R‰SÄ–/—Z.“DêÜô"÷S3”Ä‚	µAà?yÃ(odãZRsª­“ÕVÖ‰á<C2m°Fö=g†fZÝ3Ýµ¸»tÇTNÁ`e}µEVX¬'«æ)û"Þ©e²Í)“»Þ!í×k?Â0Ïºt(:A—vÒƒ…ŽÒãIŠÑ2Ë>ZNÐI$‘Ž7›M›©:è²„ÜŽ#·ŸÓ$æ{-ž —w2"VÏPsã¡Í³ÚŸR:;ˆ,fÅ›í†sÌ³ˆÉ»Dõu3tý¨±¸²¸ôùÚd¸Lo	úŸÂ{&úV«Èk—‡$ FùŠÒe‰Ÿ›4úÞ+²KE¿±´LoueooA|Ã_óù2é}A_"^'µÔ\‚,$RÝÏoÑÖž¯Ü:ë?7Œ¹.ðA§ÃÑQvãžä{ æ“:L“ˆÃ_ÏÆ:«)ž¾þIå>Ê4 Ù\­¿G¾Î¨:nm,úï&û÷öïöïÝ/XnÀ)È%*&Ÿ¿ü™<*ÿô<žM§Í(HPg¶éq»àfD¸ˆÑµ—‡jy|³qé™¼¾XÃôÅé´Å)è
P×«-D*Òõ¨V9
ãápèœ6_ƒ^ãŒpû}‹¬·Èù2iüå2ñ™T6|æ—&}sà´÷#g5ZT®Ö—–˜néUÖ-½D·ôÎ·ã ÓÞìëØÚ¨/MÇMíõ’\{ÑSp%’IDnÕ<Ûu-*Ñ6àP»ôqáO¥I†·ã\{:L*ÌJ4˜µS`è/¤Œ+àí·³Ÿ·MŽøªÌŠ9.#¦Ä?)×à- ýæBM\+®IkLE>ÇónâzEi‰À<®7É\Á<‰¬ó$y]Eº<qÕ{žªüx±°\¨d’'!Å5çÜg !‹¯Þ©õ­ø&Äa–¿„ãÔúÒÚï*å°'îµ¾×D%ÞqÝ|6ñ¬&¶HàV¦«¡àŽ—²„ÇÙ	îZé·íÈ·+Ro×nuhìŽì`aSÓÆ ÜŸp[±¾É¶]K²í
TÛšz”ÒlÛ™>x’m$Å6Š…Á6ºh„iRkOšXÛÍ±e»åÄÚú[-©ª'O«íÖC«F
¨K+j¯çPR¢lW¦8v+eGZ¼©I‡µ:KUZcÝj›ÙuR‰ÞT"Q¨kI#j©5®BÔ­L!z]úÃ6'^Elé6kã­Õ²¥ëGÏ<™³ ({vn‘²cƒq ¸Hmx¹*	I©àÆ¼‰Ü$¾y™_O¨-±•éò¦ô©r¡¶$ü2›óÕÌ,ÓOúßW¶ÈIÅz…t‡öÌ{éõG^’lÑÞÍ|§¹™Ó'â)›°°)·¨ !?ä©Xl}WØ®¥¥ó=l¢hé¤Ð• ÚN®u‡Gp0Éíô¯ß†¯íIûc”[?¹ù‘[5“=úzªñ3S©±U=6œŸ\]ü#dÝsJn©›ø.Q~/¨6éŽ‹¢×XjþUà÷‹«‹Kâ$ùõ×Wßÿ±¯|ƒè«\ùâ[Té8„4ˆ540ìú®G­îV±­+dÜö•>³Àcj^Å”²¯Ú/É+{fåZ±i3ª½±
|×÷ÛÃ
Xu2¿µ›á·®Èl]ŸÂšÕºvNkk>ÔÊ\¨•xP­8Pes)qÊ¦Fža´”ðw/VT<i£áZ¬‘bMÉÚ²ûWß9ä=@«uáŸüsIt.ÛÓÝ„­……{ÀÜ ã“¦Ú¦¾IY¹º‘ZÝeÔên‘Z]rþØP«†Þ'ã‘ª[[m„ê¶ÒV;Ãt~é1Ø¥+rK[	q-ÌÒ^i8 `G<ËY³…¼ÚØ¹5²AÛ
üf.$</K‚çB~Ð5¸]/»sJHófS;ïäb¾0ƒ=MòàŠbeµ¤Èó’šŠX¸`s¼ÀÂßZ6åøW,ðáÚ?¨{î¢sçÅªaxn[’¾âgš–Öuàdqh7‚Ê•ÿ:}Óî_à^A|'’Ò5Vàs>×	|ÆãP•ÍuG<?çrù¡.·îóò1x\³b0gqUÞ4”(î²
ÉÛäaßéžF¾k5äÏgïõ°P8P(¢"a¿@±j\ùlÓø-•ÿ}ºhïtœat»”ƒ•Ùm1Gaê|›|Ü|èèò;ÈÂïŒN/hÑ¿#iZªþÔË§¿üƒÏé5c%s!ÑÍÒo²Ìé´ÊWæ1 ì¶À¬ðTÑÕ÷DâS™1Leèd|ügúîU«mÂu[H>úmf_½çE0¸Ÿú¡èwýè”/È~ähŒ®¼¨AYð'„tçÓko¥o“î‘ôqƒœt¥w˜XÝ&ao+FŠHî[*BÎƒ,FÅ¤9‘½CM7”"ÃÑ)K9Óí%î?q½âÖ¤ãeŽ‚‚½R•P³ÊtM$Íïü.ÄL*áldç­€¡ »&–Ýû«¬}šösøX%?æn.sÖ²È›äÊS<¥M@Î%Ó%óúYá|“ˆÑsûž3CL5”®œúLÊœíšOZgK^im>	Aç”Ië`4tÐ”˜l»)OúýŒAh3b¥¥2ûÿ  ÿÿì}{oÇµçW©ë„Ã„¯áC¢’^Š”%A+"e'«g¦9ÓÐL÷xºG$ÃØÀÀ»Álä{`÷ÚñÞ<ç^ß‹‹ˆò~“­SÕÕ]Ý]ÝuªgH¤iÀg¦»ªºêÔ©S§~çwò¯„ÔÂCš˜ù<¡E<
çT`Ù?š[®óÑ€½ƒÜ¹Ñ‡ÂÇ
¬½ÂÅ“Z¥¯¿¥Óýv#™<!”âìUHå=ºØÿÒ%óä½³¿º­‘hÒ‡v‹Z\(±z”?S´mÈHý“}vG$`ü²­’:ñ5¢»ÖQ‘bã4ÇB‚îzçÏ¿ ÆåÙŸÝöHägï¨g›I<QFvtÏADV¬˜àÃeJÍ«"-ê“âX\ØÞHH÷%%l©KŒþÏ¨äœäŽ1ûU³˜æ°–déÜ]öw”€üÐGs•äó”ls†FWÏnd@TbBR22F#4›1¢4*v,¢)Gtt#¯ý¼Ý¶:¶Û´ú¹—
ÄÄ$1|Î±¸“ô‘ã“ê[ªŸO¦Ÿq<ê¦üNßëÑéæÞ³ÝAáûÈ7fgóqÃ­Ö™ð=î¸õ«ÇÂ‡»Fâ@–“éRá”,
>GµHÄ¤  ‡~eZüÍBJEÄ 6t[5 üÈÿm"Šà?ZÓBRòJ«ÑÒž„2åÇ$)¹Nž5]5O^|Òª¥¦@hX! ´ë:¥C'Ç"ñè”u‚#€Íèt­B´Ð¢¨ðnÌ®\‰=@²[(”¬Å´·ŸâA›EHÙçñ€ ²öìã¥DY¢U7!N^+[(º*,‰ZÝë©­°diGta§%Æ6 ø"bþµ¹–¼C'1üR•+Ä–ÏÂèø½X>¨/¤]ÄáøÛ<d=jg(âQ}\	¢]èdui	)`iE<KEêÞˆ+ zY<ã»=âˆÂûô'ì··IdÈñ®«BÐ¾Ü—3Ò@} (þô‰Ž£ìYØý3c/ ¦æÛ÷-æ®¿Hœ(,ƒ¾ïõg{žÃVïÞÏJ…¢jADmùhÙtˆO·’à‘A(º*Ö ¶„ädxšXiˆ/*ð<oºéŸ:—k²r­^OµUo%cì¯×ÞV¦¡wð¨É=°§»çÏ¿í‘ÃóçÏÇ–ÛðîÒÿ®e¶¼ÕgkdŠ'wš"¿ SV#XögŸ‡*N‰3û‡R9ÕgÅÆé8í¥>e<áµI.äˆL¼ä¡–¸QÚ‡çî|Œ;•8vÅï~åñ–I¾†(,•Êæ;ôõÏO?Å–7ê­wÁOÊßàH˜Ó“]Z8 í°G½ú„ ?±³|¡Ñª«œO[é[ZCCøY&ßm®Eé°èß…@~øÜ­æˆ4´N¸Õ:Zžëià`®~®l^4à€…´ü†øÌ*BªÉ3ŸÈ2©?%0°¸çBÉ¸ëøR5ò[éAÛ,KÍ*ª8œ±pÐVÉ®“G ¥®F•wZ¤iÖìc? •npQþ`-Úª~Œ±ª_“ Ž7‰x},“²âÅÂìq{7;úýøÁÔ¸½Þö€<¤ÏÐïgïï;òNÑ;Êè¦¡ß°áu{VßñÇ`¥ÀÆtØF*e£Ùê5`›6ƒžà·‚ÂO™ÿ»2·¥²³ ‚èñb¼Ø”Æ:½'!m/-2¦úBðx,²¬sšê‰Æ]‹ÐJ½@{öñ2§·ÃSéÈY˜LHùµÐ5‹ÊöâB¦ïä ¢\ôfø1§£±á÷ÊãÇÚ‚”J Š¡D†â÷ý%Í¦èùöRÖ¥’ÞÔ^SMµï÷±„+ÏæÈxZŸo/!›ÒSYqA‚\q•{žß8¤Æl°–œ}·Íò„uÏO?DÓÎOÿ…Ôé¤Cok0ËÎ¢o¸X0ü>†|¨ßŒ†åëAl&°«-úá[‹§OåÅÎ­Ïk½Ùì5qC‹ºG²^F†4ø1!yC‰nžoFfL…sFŸt>lÏM'¸g÷[ÊÔuòò¸" ÚÊ­†FÈPò¥Ý–D·fgœœÂR9ë¤u[çíÊfÂoÄV›ÈOô6™’ÜST¤³÷
G½WlÆàÆ©x76%üª%ùµ¥\åN„rQ¢f-vÎâþ‰µ‰»ÿ¸ìa£ÜdË5ÎKö¶'û@Õîqš‡ÓØŒ/r‹DÆmç@gÀá#ì”:F‡WO˜E†Lk
›‚Eþ/Jõ3w	ñƒ#`k9fINZì·m8DY#T’™ß‡}¬²n:91¡`)8…Pk´+²F“Ž?RÇá¦ôV&´Uj “2Q·éŒ÷ð.…©ºÂô*á+â¡í÷<×§»ØXŽ<«N3hoT¨Ìý BÚ6˜Aá'ÜÊEáNBØJA¤ØU°owè—'Ô¸é·d-ðzk¤¶0CX¸öY¢BæÌ5²Hÿª{Aàu×È•*pÈ¥j›ÖbûŽå²X?è{Oí‹N8kß¨,‘¥
nG§au6Ž÷­ŽoŸ„·mTþa¿¶¿²Í‰±þÓ­CÇÇ‘@Ü¡Ê¢âÒCÓ—X´èÕ¨±Èç 3QÙç`höN‡®Bÿpeùêòj}j†ÍÒ]çç60øô¾ÍG¸!OÐ°£ØgÐûhÚL–7wãxvyûè‘-·ÑöúÛmb™[B?¾‚lVN~Æä$3”™1Jwþµek©¾ZØùWxçÃ“œòö.-ýÉªE«êu6E÷<¯8=4»Nƒ»6Ž«Ç„»LfHÏ:êxV“ÎefÈž¦%à‰	xa€|‹“þ³\Fù*ðk,ã‹’95‰DžaFKMåÚéÂŽKö­&û÷çž×…›ƒ>£4@r€èšœg®uë`Ôcâ‘zYOAqý´SÀêHØD&Ãz2åÚùº$jË2aª8$9f{‚Üï¦šbbXHåì±»³äu,f3kéêj¹GÔ¶]#.ãö6µp3eÖ®£±vËn›kÆØ×CÔ¡¨æ€™éí„±®3–{szTÂBN7Fk0ÿÅöroÌaætãÊ‰zñ»Eçš
™|IÛfé[GÕÞÜ3sÌÑè^gº²ä´Ágµ+\?]:ÐUŒ2ÎÈ¶îlŸbB h‚ÙäÏ7ÜS§§/‘/±O0«Ïe0|£GÂmÏqvƒo^Êûlßx¼dòdÓ@‡R­¹<š¼Ù¦ÌÈÐ}¡øæñþþþVÀøÅÊ¨â+©â‹c5ÓvBsmã¸Fõp©"®ÛlSLß™QÅàANœÆZŸ¶ð†Â…p1þ]D-Mò@ 	—š¨keÈ¦«M[ørÒ»—WúpMa»–Æ_RK¾VÙ¼w~úUƒnÏþ8Ž©Æl®ƒÕÀ‚¶ØîÛt§Ù´úGÌ9Î˜cõ™éå+bˆ2y(KÈ” wŠ)L)jêI[0Ñ%~NJr²ä;~«¸ßâMV”‡o^ÓÍWX×&%nJ)$]&VŠt,‚-CöÙË¢tN3ž²6pÜdQê·1•EqìöŠ¢€›¯$F€ø1E¹çÆTãSß‹‘Fìv}ß+n0mŸ?ÿªÇ
Ÿ½zSeIÀ¡Á@Ëc¥nd[Zå­|¹:Bßƒ"æ0OKNéKÔ|,¬Ü.çã/—¢¡c*šr?Ž«tjÉS×xH(Û9¦ò)õ¢”Ž*OB¥“—-¤Q,Æ«kjéàßCV´är
£æ‘ï"/{ßîX‡¶.Uº~#Ê,òâS`ÿØpYr–V>üI&Ó‰3Hä¹äÙÙç¤qK»<)!Ne¬ärH1–¡	Ì«ø–Âß‹¦¿†ç¸˜ý:ºO&’	‡ƒ £èÇ4RHpŠ+´(9b€Ûú¶×íy>ãÔˆn¹°¶E¬mY‚µ­â`m—iÃÃÙÌ¡le`le l(ø­fˆT(µ«¨»K Ô:mWAV¥/b€Ãâ;¯	ü<´©Ô`ì´ÛôVî 8<1fåüâ DLM?^ø S
êD®yH{ÄLƒŸa§ÁÜx»¹QÉÁ—5jõk«µä,XDÎ‚dáKêmž?ñ„×§öiÀfñO½¬AZ­¯4ö¯Œç % ¡äs}››^W|?¿y2.É¯µ¿ºoí7¦ˆ¨õ»vÒú"ÞY¬y[§EÇ—.º¸•ˆßÎÅµÐ÷ÝchŽ†ÓotpëÝAß‚­Ô® Šõ¬&XÆ×Ãµj‰Z@‰¡žª-Fßlï
XêW$â%©ÓP²—DºÙ!Yæp©Hç†¨§";hÁ¶VìkÏ„ˆ–EÔüËXe+d×ei&š2¼­SÈ¹ùÜ£„|gHlLìt€a1° ¥ 0þeHÃi’`³¯Æ?Œh­Ç;ä»Y7dÂ®8dD=‚@e–/Û¨'útã=ð7Ž_™PÝf,|€’žºÕ´q¼„•ô‰´%/sÕŠ_{†Ñ­‚k
/£ñá£™nå–‹¹n]BIœ&(KIt Ref`€U«º´Â¿>Ÿð‰èÜY†hA-ËIy7–Šü¨Œ'keáµñd…]’§©uhÕ&­âëe{´šGÇµcçª;âMÔ[¥Ü_˜g„ÿ«¦O¤ù¦:zÆÙ‡0qôÈÊ5{¡>žƒ4qôL=y×ÄÑ3qôðÝ‡Ó”öa¦Íªøeâç1õóìŸ‡÷ó,.O„-sMÜ<ùW¼ñbvË¥ºy"SéuóŒ…ì¿²^ôWâ=2„gqââ)¾.ÊÅƒÕyÌÅ3ÂHÏÈ=k7–W¯]Ï­÷Ä?ÒR}uq\XÿÈÄ?’wMü#ÿˆòtö!³º&P˜!\$|áž@aØ5ÎòöÆ{I¸õr©^’È`zC½$ã"þcå(1s•äd“J¤ÿY-ô9@~À8Z•@ù}¯ãçf	Û2âd|ðŸÌ9±º õÑ,.,Ì_‰Ü4ŽëjÃ&q|¤Kzšã³|ž^¨'´Á4tÛgßu×pì˜ÊêÍ.Ì­Ä	Ý´² %ÚÂPÌã£´/ƒÔÂ(&{ä$êl)™èÚnSNemuÐDÜ/§ÐJ¦ÇŽXcÓqÖ+È8kL4/ž›L=R)	ÅE’ëÄÅÈRŠYb\Ä	M&ñ’Dj´!Q&4#PI*ˆq‘'<ïV PÁüú[¤ý½>†`jý¶»ï¥2v1:søÜõHêýBS¥ ‘'‰Heþ!¤¡û2é?ÿ	ÚÖûá·K;Î(Úà!VqÏ>?ÂX2ú¤ÄZòY0cwÝ.ÃäÎƒÛdÛê7MØY­ß•ÈjI§%}\ÆåAÎÄ‡KF¤‰5	v°t@Ë²ß¡7¶f¬jTf­tëèþÂëhkZ‘üDq‚-n&œàÒG²²g9Œß°:´¡µY»°?Á…15÷ú¶žåG½¤Ð× óý_2S-f3‡añ0"NÉåØé'ö8ßIãÅÇ.''©³LÈZÒ‘ÍQ§uÀ'ƒå¥S¼ìœòÓg
Òœ2%,­ÑIô\ßnvµj53àQà©*è'òcR…Ïs>•X¦gèú—ÿ®8A*ÉÂ2pÂð ÷U(JÝs/’Q*Uûj?"¡<‹t§Wº_ºT½ž?ÿC7¦ÚœO*’½åéùéw#[ò&zm(½ö>µ±ì @§I[cªÖä¬à!ˆ$F±)çfu‘Ì1k£~×¢òÓ·­§`¦"º:b¤œš
=Í±¢Òjª
^­#ä~ˆÕWN¶œaÖT–ú•¥z½ä	®VÛaù‰¿ÑmÚ&jd\ÔÈ«aIüo„“oí9];ÞqØöS¶ß„%ŒíHõûoÏOGóì·=Ív—S˜_8Ýí__ºâá‚—¡wÄF2V:ˆ—”nÄ?uEBòàû¿&x{ž:T‹Lt‡¢u/Cw\·úL—
Ô‡éåÆXl{~0¿K{‚T÷®OlúG¯=Ôü¯VÑÇŸœ˜-ðè&`—mˆ6ÈH¶S˜3R©nèÎÒU7àa£šC9éµ7ÉUó)ÅyÏ
ÚslîVãVÎKMOƒú_ úfJ_íÉtõòt($S%º1 öT™ÖÏþL­±yRc.„KpZ
ýªq¨1áð	Ã‚›¹ÒÄÙsMçº€jv?è;õh8òÀ±y½š³uJÿÕh%x¼´ceºÈ'Ø¼ø@]Õ4VV-:‘Ç$Õ\¿Ë’ðŽî”Y0×é.SðÚiçmôXJùžÄ9Aœ^v/—!N¸¢aÓò1o·mýW°A¾rà]£éßZ¡Õ))6wS‡þiµI½‰vãœ»â>–£qöyJŸ€÷bègb¬ÆEuQ¥›TŠzà^Gûû¿ ²ª&=2Î­Vì_Œ¶áreH>C:±Ù:Ã²?6gˆcû1/‡mOb7O¥-2g‰ÚÁf-©l7†É$%±¢Bð›dWmÆÙU‡©¶ ]mê5‘u°Êll¦°‘t½«f¥#²BfêÜþøqß&5jü8k¦çï‡jjmúäØ—EçˆÁæoÅäg³¸2ÌmqYs£×ø³ÊŒ6xI‡™ˆRÜŽ<—‘l¦{¢Œ¯ uzt×=†ãp†+˜Øâü:«ØÇ"ä+z\þYì,ÌSÆÔ²éC¶qªFò’õm›
ÓÌOôÏÙ·ŽY1'ON8ü˜Î³käÖÆæi^Ÿ§o‚´D²Q¨Põ8ÜÎ0U;Ýgà±¯pþ•—XQJüç\Çv[A{Ú ÈÄÞ.±¯ËêS*Tº“TªIÎi^è~@ nj5lùã…bÎÛ’§©MêwfyïvÉg¡éŸ/¥D×qgA™r²8žñ×žu\²o5Ù¿?÷¼.üÛÓØÒ8—=>Ò“°'Ù…õò¶M~í´CHÜ_aOÁ¢R‰1ãuj…´Øo,Õó‘$@ˆ1›ëÈp¹Lsr½GjwQÒ0ÉìxŽ¥æ™šcQ“J¥ÏÛ—¢lŸtZèƒý´‰˜ž²F¶ba£™R¶Æ89#\Žðú}ƒÝÏ­ÞÃ.Ç˜µÊfd7†jçä"»Û^Îx?b æðÉ BuèÒ‰-™5QÙR{	Æ·h=JÜ×xÓ¦µRÅL…å†8C¿{ù®%ÐæWJyÔ£Â@
Œ±?”Rº ‡J8úmpé z|Z_Ä³G‹²{$9ç>ÌlA;Å´G!j?“€	íy=îªzñé÷´ÁÏÎOvýÈY²‚³û¯œ§§Óò} Bœ	óaˆ…<Bú„p]°YÐ&L"EPÂJ6EÏ²”Ü#R´7yÆjÅ®6ß‘ 	£‰„´"Ç¼ÀaûoGòE¿‚Ý§–Cðç._f/ŠÓ¦‘÷á…úµ–eŽî—äÊRq1±ØØ´Pò1Õb>¦ZÄÇT“ø˜ptL¼—EÉÄjCÓ2ÁeNÍW~¸ÊpÔˆçdB—kËÖR}5ÅÄ$.¹Š$.áWHÏ=:S›V¡LWeú ÄË]á/W@¹ƒne’V§ˆ:'æÜ‰cžvl:K;vSæß!7F’A[±h¯î/˜ÑV,Ï@lfOSûøÄí»!ÖG	k‡$K„Ë¦³A•W]¦/—Û%’_ÀÝ˜HïþêÕÚUÃüCéÍ{x"½‰ÍójÐ¾äêíK”Õó¥}™LÀüé‰5à«á¼\wì}Ï¸d1e¾†.YŽZÃ:f‹î¾\÷lè¦Q¸fwX‹X,Kãüù×.éŸ}N|šÜ9þ8[B0"¼QÐà¢Kž¶-çÂ=³÷j:qÉjkø_ŸâÒÊË÷)Š¨œÐèzleœ¸'nÄ7Ö8ñ éƒysM¶€êëÍó N¤÷’^0ß„ôÒ}Ú
î`H³^Ç	ÈžUïFÙIÒàÿ½:.^’ÕFjkY˜›Ö‰´h	/
w‘ TTòŽ¤CÞ…¯ˆdÜì{=`èë³#…uÞ²-ðÈÈ¡[uNùãJæ£ ­Úœˆ±Á–ØÜC¾ÀžÐ>/Æáæ!·h¯kh˜v.°®”!â×uNâ! ÃÐdÄLéyÁù$E/!wAÔ¢Jùód@{;™¿Ë¨:Ï4 M…á£/N¤Î@j2ú"#ÛÖÆs5­x"$²ÌL‰füá¬5<´„2M”Õ'¾Ý³h×Fcª¼ŒÑ—¬è¬ÚH‘„û°ý8
I5~Ø´mÙÊz	wcá õ1Îú>ÐÑêÐÓ°øåÌ¢R´á)?M¯3»Ê™=fkWø¯¡Êm6aSŒ¯D®ÎÊæîÞ#¥ç-,ù^O‘Qu?°÷çâlh’h$ã“ ‰R……«øF]dôrE¬¿¬¿v©ÁVíõíg,ôî¢é¨q¾ºÿn:}jÒv®¸eŽþÈmGö;‹ƒ¯£Ûø–ß`^xÚCædg_œ`£êøe#ó|Ç¿¼ø„.@DïsÄõ­~ß;xÔÛñÜä²ÈØÍA'&XÕè=Lc=^Í¹²"ÖXæ_¼”i2@x®w)ˆûlŠ¦PxÇ+5‰„9æÊM(é 7™b
ÕÉ\zCçøŠfûý›G1‡'ÐœÌ¥áæ’Øý]³)©Âé{óIr&(fTÒ±¸p)‹mD‹f¿á•œZC™}»@MËÕQóªLtRôFoÜÌB¬S¯úÄ
¤ESKÜòJN®òë–Dý<™ZÃN-F¡›šW½¾ðÃäM®x1³Ø¹Ó*,çÒæ”çÎ'úó6—¾{7‰Lrö$ßâRfPøÐCï íŸ—´&Þâë^ó[‰ÒOÏ(«`gˆÓ<4ä`âFTRÉ“ÎiËIiY¡Q€ùø÷˜¿h‘óÐ"Hh“:þ»tê_çLßÉšÙßÜ/µ3Rìã6’?NºØ<D£˜ø%ç%c¤Öº.&\Ò#óKˆ”bò•Òu&ÜZp•=¿gÃjp~/.Å9~¹¢Ô/ü2ÔIL”ó›|ðÇ½£Ùåà¹HÒ#˜MÓ”[pœ>¼¨l‚ü‘“ÚI¨t æ‘´ÇÄ›*
—D–t;H:ŒlñæOa›U¦E¬ôÄ	t>õTv’+ì§€YI¡(Àè‚|—eçâ×qBÁRÄŒ3NzÑIH§ñ3½²)Kzt;,«|q{ö¨iÙ¢ƒè²œ<»áÆqÐØHüon[›êÈ•ÙJåfòÆŽæ^Ý¸ÛØ¢IÕ?Ÿ|ÃQt–âT<„È R´eTIõ$œý!-^t½ÇÎ¯‚d"”5[lÌÊf‘œé“ùd§!ÐóCKtÔ˜á¦W©)EãÇ4Jh!Î½cŠdùB%û}ò×M†‚ö#aùŸ³KZŽõ„š¬yw6EØ•¤dh`…½TŠD°µbþ¾‘Úò^?¶wRDÙqFUÏõDÞˆceVÎ{1×GÛÖã'êÆr¼šªyé%]d§Y¥†·éPå*8Ã|ãZEål@Ž^)¦+QúèJ¢­&ÖÙ+„¼õYŒ×Š„u+¡Dø|gûçLV‘Ì+bmÉ‡.až©óšLµp‹?ê¹VIû G²¿Hæ5UÍ[ºyÜ÷œ“Ã‘pÖòŽ\ÍMÝ”ˆL™÷°mãŽæ =˜’…]žÞ6÷f0¶ž ™ÉGãîâK5sQík¸ˆ¾ãyA@)¹SVUj( dvòd§Â¨4œòÄó:»=‹î‚OTnˆ+išh:‡Óe5!ÈªÄ…ÿtÿ&Ù>?ýgúÏ­Ûç§ÿýùÉ£óç¿'wnß¿EvÞÝºkíB5Þ•OŠÂ´¨ó¤#)m§’§¢4_R>Bž‰ðò^Oñ>‰]çˆ^Œ‹{µØ¦Ð³IdŠÍ%Z†
Ù“SÆ«T·¿šÜKƒÒjWú65áð»_Ýi‘>L—Eþlè°/¼ý}ßfY‚”ZM;Pì!–/œð¼Ý%Ìöæê@÷kJ^–â·¸É)ºL'âÆ‡Ã'9f[š¬âÉ(ÍÔTeAô~$“5´Ó.\…¶ÚðsV”ê,q^Ì¹Dˆj–Û..!Zª-e®ãá4)³LJù8Þ&C‹™'Ã-åZ¾Fä3Á“ÃžrÃ•£Îb#=›Ó·@×fCI„ÄÊ&hsÕ6îš¬Œ‘>Ãbìc({?,y¤q`(-¿ÁÁÅCµ×È}/Œ}ƒEyºDU h”$Q?c$
oa Zpv#Åˆ
z$ñ¡ü\¨i2|”¨ægD¢-Ï$2t:‰}E#CC:‰_æ%Æ…†é–Ç…9	dÃ_“ ÐIP¨æ±—¹ä˜„Úp¥„˜FáGn.)`š½öx(ì›^·ÅhDëËr^ Lñ|×9û£K>XîkÙ ï/GÑ0	0*À Tž“àäõ
Ð…s]0‰.(Ó¾ItAé
&Ñ“èdI“èltd_€S˜Ýi@Æço\éfÄ­€ø¡^™¿’€''ê¶sl}Ùõ‹5§áòÞ è8NËÊEc©ŽyA…ÖL½øôüô3'
¢an
e´*+‘Ôæ@¶RÃ9hå9*ëëR`f£—Qc…—Xáöìârâ4,¥sChŒ¤•epïüùW$‰ú’4 Í•töËýçìËÒÇéÑ›^Ž„\ò]%$†x÷´{ŒQ!ÝÍ$É:GqÇ#ÜWÒ÷tö²«|Ï”ðÆÅ}†¸oßúþÛ-òàÖÙ/÷ÈîíòØvÌR½‚G¶«Ð¤²¼\žÝø•2ï Á²½ÐÐv•ˆÕ’"+}êýL}ž½ÒoL¨³ Š‰!M{8˜ŒÒI–A‰ˆKúÄ 5”xÓr˜w-D4^ß ó™LêÛ
y/aŽ-{:qÑ‹W	ìç«ü,]#k¹¯©‹ß¤þUdHQÿ˜“í$oó¯/Ø	g@“9
Ü9yREDX¼ö¤†ðGÙ«òâÓ»-òôìošL£&ï£sž®s—\Ñ	IVÜìCÞ¥
UqE7%ìäÕ¬…!Îd£•L’ÑÎ®èŒ::Si[n³cß8„³Šwœí(»É}°~ÑÄl:>LÈæÆ1_ùùaÇûNÐÞj+Ú	ò}H~I…3‹¶ÇÞíõm«é·m;Pñvû³5ûò§¶?¸qØ ÒÉvóÓlÌX.ùeW«Ùu\ò‹_Ç¿ç5ù[†7p*!Ó:³z]£vô²—‘<Â…’I¸trrÿKb~“Ê(C€.‘HÜöRKÚëÛ¡0î8VÇk½Û³Ý*¸Ìµ«F, NXR·Rü néH—ñ5úE)¥¥„÷ÝïQ)i»q1ÕŸR	(l"9-‹/>ë!š{Ë7<*9ßXEºá¹Ó>ûw`ö>?ýŠnýÏOÿDîƒ5 ¯Yu³“Ý5îóGœd¤äÔY9zÚp-~}ÐyºcwìÀFhp¸âIâÓÇPý·›Xý—ÖÜÚë[~{±HœÈOÏ¾³¸r†ÏtI5·I'Ó/A@`[ß4àäî2„Äpàù ou:Æã¾Ÿ\òG9êE§’ŠÁ"/ÞÐÃ»^ Ÿr5S_ôSJµÇ‡áÔÎà#Ò¡\ùö´fË#‡hön§¢Ì>^‰µ–@s˜„(ŒÀX*lÞ2Òc¼î¸½A€Á?G=Zt£m7žÖ½CT~Ö¬$Ç}i…eujÕqÎœ¥˜óË¦n.ó‹*ªNZ6µÂlÃÌ­ö\`õi•sáàS·RSo7ý²Õô{ v¯-ªŠ
›k•#±†jÈãÆ,±+zÚi,0<n[íâ(ºÚÜî¿.m'Õ¨h Þ+BE³ßGŒŠÖËÈâo âæ3$¶Ù$< •¬)[¯°ð8Ý^Çî²!)’!ù¶WV”î· °ô¿ÄIúD².H²®¡@ª"èÃ«*Q;›ñú	‘t7òduÁ<.§ðŽ±“¦2A>wAÂ¥”í»ÆLcÒ íöÙÝ68ÅÕhºM›Ñ"$ŸéŒvë¨ï½¶å‘€
—\uÑ4Àœ|"C˜paKÇ=«å¸V´ùÈž§°ø¥z¼T¼aŽa3,ôöM2ö@±ÁtÜFg@uE•í±¨â¨H¹–è4[£»/‹5f›Ç<ÑL…÷Fá=pk¥¢µë)þ2ˆMd·²y\åGP¬–MfImšüˆ,.“!'#rVÈ/‡9Çû&Jy'FæŸ(ôP$‡b+érÖé³Ûkðã¹¹9ø{†ù°. cƒ¦lMçžªÓ„oèÿÿ]ÙMœ 8Ï2Ö%b0×ô"¢Ör€8	vý÷¬Þãúüu»ùL\þá>KB7¬@1±ªhÿÇÛÃQîø«„¢·	?Ã3ðÅÔýù­©UÎMß”Æ±M /Îþ\àÝõVÇÞà´:¬MÃ6#Ý/hyë8š’×˜Ñ›FQL`öU(_ç§ËÞˆÖNd_T£"g&ÀôËè˜¼èº@ûbàÛý]Ëé¼äe¿¤1Î
Qí°Ê2' :ÅÅÏ.†ç"-éŒ´Õ¦B~,qøy•ÐÿRÀI¾ñŽ	7½²ôÔŽ›“zäFÓ	7ßÕ::À" .½Êîùé7–TÃÙLhð$´m1Ù1‚ŽÏÄ}Gw¿¢/#2j‚Ù¯3ÉÕÖTRØ‰öÅ	JPq‘’‚ÎôÃáŽ‹Y…È½2GÇB©`þŽLC×êìÖþ>]‰Wéâ{å$oŸÛ;èi[)·E‚³?S3·}þü«#H$õ-é8ç§¿@4Ó_IûüôËºß‘Ýšß«¨˜# sTgÓLä$ÕXT°Û\äH›tèWèÐ/g‡^ŠQÍƒG'½!FÚ©™ˆAZ»ƒ»˜F”^EE‡¥C{òd®(Ì§Êâ|BË–ŽÛÂtHv^m´­~°çtí8jõÀ¶Ÿ‚7}™ŽfMÏ¡õ’ú0
}ºÌŒ7Q'ŽkÿðIV®‡å%K!ÝŽ]l£#«­ð¢†^hÜäNMÞ ½M¡[N6G¼ "cš
€…@¾Û
øäðS8Ó»nC¼Ox†	íš\‚ycöhÍB{¬ªÿƒ¼yùˆÅœ¬jÊØSîÀcû–ëÌHjíRCè8öòŸê-Žh †Ñé¯?þ)0Yà÷—¬î<i-4h‡ga
÷U"•ÁÜ¡‰îI‰3 TÉ*(%ÓÃT@ïÔŠætÞÙ6<]íÁW÷¬ =×µ«µÒc'4J¢p&n·íg}Ï½kï§‚–I$T Š¹Ä}8züÝ0‘>¯ËPæZãëDl88n¬{pâVrxù¨ùÖ è‡¡éŽ&E7´eÐÞ9?F“ªâGS!¡©'@í?ò©š¹g¹´[á”ÒŠ(ô|ÁZ¨Ü`­KÕR¹íh‡‚»ÔO„u‹Ru¢&\º’¼èSuÞ‘8h³ï”KRL¹§ÙüÉ ònÎÙßbx\óì¯‰‘4ƒ´cû¾ÓƒEyóA›Gç§¿tÉ³³ÏIàQ‡M£íÑ)[\Æ(©¾Ýa¬rä`öJqÐú®mõíD0ZÝ÷:ƒÀ&ªU]ãõfkó‹„›1esÄ¾sÏ ~³¾cs†¹æmÝwÚîvÛëPÙØ¨ìÓ#ÙosssØ@Ú^Q´g¯iH.ÿÇ ÿ¼O4z/<¦¦*ïâ‘Ü>)Ô;ºì#ëˆ°õHÑ‡¤$ƒRrò†ŒÖ“…SMa,•ñž@Ù³+÷4Ð¼’*UÿF—°;;ÓåJ‰ð•L‹TA{Üóšå
3ÂBn›„GÒ[Ì5_óÊ#1`¨¨Áœ§ìx|ŠŸPØýmË·«Ó1D¥Ï{åÓð--‚k£Óö!ŠÓí›ºk ‡ue€] v!|ófp¤"Vì¹cš %A­xœìÚÁ5Xé
põ5'Iiœ?ÿ¦ÇÙ :à‰RÔü,™½(k‰cKýyˆñ qÔîÈK¬ts}¯Ã;¤u
Iî¹ïÁóL‹–&›=ê5iOÂ,}H¯ØÉ½e†)íz§åÚÍOÛ‡ª€:ICŽ1ïÁ«›¬±¸@ÅÕy”å²÷ÆŸ§%cô†´®áS·©,¬xÐ³ûZ°¨lîÂÂ6¢UpïÅ‡²È®×¬lÒµmT-Œö>•Í;çÏÿN­Xº‚Ž¨ðV³iU6oîìl‘êMçì‹.£ü´…CL¬¢Ÿ¶=‡Öõâr§Í¼ZÉù—£«ïi“Uvg']OÄ’8ªº@ø|€öúç§_ÂlDEƒ:«l‚2/P<a0Å#/{ kó³Ôšá#Ë.kÄgà/å¢À’D‹DMò7 SKd ×hQ©¦q\Vv@CÕÚ7hâïbÝ”ù	4Kö~1S·3ý øþisjEEÃ^°˜4‹¡ËH×¢g/-²®sšìíÑÜø¤o»à8p¥,iKL¸‘BÉèìä‚
‹ÙþÍ„7§zœµjÞžT8"ÓP“$^|>ñæÆ=¦ È÷»ká¨-›šT¬IBžÔ£Üwv3ãÿÊØúÂÞ–+S!Â‰–wÍZü ŠëmØÀ0FHuG÷ìsØÐÏÇ&
qÏ>?¢w}9íîÜ”yÆôµ2Ò¶G+wN³K´ºŠWp#{•Ÿ²L QýÞ%õóÓß’ïÿ2 A˜K¸ˆK½P~ï1RÕq¤~ö…xsÆDçCMñ¸ù¬O¯!­¾Ó$ð?pøtýàù¶Aµ…>ŠG,Ëq–{Áãáz‰²éÌyÒKEÅ)Îzùi]:X*‘l(°p¯vZe„}%¯RA`ÉËin?Þœ}‹{‘è¿¬C³sñ+ŠS­‘Ÿ¬‡K^¥ãÄR­diÜÒÜòœ¦)¿äÒ]jsÐ¢ÓÁie†®·Y4ZØä=øAÉ¢ÖÄ›iÕi&Ì÷0¾¬W&ë¿
¼B\ŸÏ°þ)UºQ:4q!I"Â€ì{¿}"¢_“}ÂU"ŸRHŸÛºw¼~îÜÌø4ýDã\­“&/`f½y–M¸h.zg˜x“bÎÞüÇŒ3Ý˜%35¬@,Ž¦î¹y“=ºM8êNV$ÂõçÝ¨lÞŸßÂû¾^r³=	˜Ò\)dÐA&f@ŽŠ‰Ùc±Ê«t–Mß¶1&ÊêóO(xxžÙÔyƒ¦p×kÁjóNxÈw˜ÆEp—Zu
_9zIaAÔÖw#ž[:^çÏ¿˜Ïõ3·5â!‰/ 7¨É=ád¥fñl3š4>ô…æÆ‘,FV—Eœ Ä°=qŒÍíÚŽí>Ôj«ÿµ_Ï5¼.j§ˆ9U<™‰¨à™ŸG¦¨(¶PMšZdO‘—e¢0y}£Ô7¥Ã˜×3(D5Zéæ7-˜5¢:9)•®”à¾¤ÙÏOÅÀéŸ–DfÍü|ø|lé›fÞkÛižý‡tT"s\mëˆ-L¿ua‡ qìœŸþºÁr×|“ZÂŠ¦Ï(”„„IY+tÙ.jb£ÆÓ¶Ás´Þµ°jöïoè¿uú‘tÀ‘·I#|m‚Ÿ‹Ad²á`i¤Ç:åHm!qH’Ê
):ÿ*ÏÝ$—bt2¹HàK)ùnA“”kévß¦"¿î¶›­N½ø¢>ºäi"y ýçk*´ÿî¶¦
•¼œâ:¦|Ô+ˆ É0·¢Y8÷è¬ñ¨Èfß§@L‘Á
c+Mq„'‘sƒ¤^Ô	DJH—¡Ý#·±ÕéPã™ÍÆñá*ð¬žlÉƒ#Hh“*]w^»þÐÞïÛ~{û _ÎˆœKD#tz6ãŽV¾'"PGš:ðÎ>wùŸˆ ˆIƒŒ/\/oŒWAãÁÍ¹½3C¶½N‡³~êòJŒ<ýßÁìãEÎñ/lÈ–nêE¨’ŽØJïP ú»˜g
ã}Šmº·0öœ¤a-i‡B!b „uî¶s50l–˜‰˜è™s‹¶ÁVÓiÄ¢	NQýêtÀV‹’ô¦b°˜­ãë|4°Ã±á'€á.›–ÚÅÿ8
AHÿ´y,°	Ø6éö•ÈžÓcÊ²aá…,Ý0œ×Ðê¡¬ß…m„Úîml…·M—«¶ØtàåDQòûoïÝ`eSSð‡d[ÂºUîÎ»7 `ÆA$íÝ†*t÷g»{7îU6o%6¶¸G6F<•X	gó#’ÒÆDg¸šg8œ½ÂÙ(„Wd‰4t£Ð¥{KºN×­~Á‰‹˜µéS3Ö®.Ì:Óï:]'˜fúŽ~Òi»ß@oN#Zt²öH.(9üÀêlÇºLz³+Ñ¬^„È1‘·7/„,4Øs2†žžN+üœ°¡¨+ªÓùFšƒ>ã<`´´QM$ÛõÛ}Ç}Z0®9O?9ˆ¬")n.Ÿ9!üø–þ°†Â’ÈÙ·ÞØÚ»ÁøÙ‹ý @Ûh\:WFÿôöb¢À«á-2ØèTÄÞœ ‘)Uõ£;Ò‹…'èÉ#vZ®q±\ÿ|¸}ëÆöïÞ¾¿'j°ºu*r¢
þ	YÇT‚Ó?Á£~áˆ3ó}ýAgà'wW+TîØ¶
Óë¹#þ¶:ÛÞp…Çcš¥(MÃ?Üº{—•_4NªÇ¼šÛ÷¼ûpïÃëvnÞØÛeUÁ^÷Qo„u(eTí*ªž7|VöðÆîÞ»ùØä¸äñY¿íî{9?ë‰{Yô·(ü¤ ²£³ë¸³æºÛ8•u±g\]‡h%]³pÀ„´Ó;¤õå>ì,}3§cþ·6'Ü7O·N;	±ÎÀ…[k"‡ºääEi|U%œ¨ða˜ú«N-ìºŠ[Tek–ž¨þÑ ¢)™ÏP^€®ê ¸P‹\ÑÔ^ûì]Ò=?ýƒîý‚Õgê§g¿Ù*_4Žò~hØ–‰å…µŽì½{ößî“ëç§ÿŒ)Är2uÿÖùó?? 7~º}ãnérÕ²öàÖí³ÿ	-~þûû¥‹ÎY5¦îÜ:û§ÛäÝØýßmèçø9À@{º&ÝÚËjvÓgÑq*ÝÜýPê`SªU‰†“’kËDšl¢Dâ,VZÞðF!è8aTW#Oñ,÷1tU0ŸæN0œÏEúðì;kˆ’¤™ÿ‡ËŽ-NG/û+qÁ'T0<ð=Ë©Z’PÃ=†õçÛÒÜ/%š€lDNw#Ú€Þˆð1y¯ô¸VKÙ)‰“7<ôE—àEkÉLòy;|E¼(ë¢ÀéÚtùïöÞž¼˜ÇoßÚ·ßa¬šÕÄ-áÕé:ßn­u»k¾OšÍù{÷æè5WSss˜àÜp zÙÐþ¿IÊg"úz>r˜fúu^l=!©ƒ[¦jÂ9Î›ù¦X<ã¸®]äSÊklhuã™¤¢²xÌ»^k­áž&øë„ð¹¿!™'¸]”Üg,Å‚‰JÔ`WD§tç—ÔÓÝ28Õ'|ôf¹L|Ë¿Øù~-_Qœ†_Ö"÷ÉeOÜÙÔ¸#ãË²'«Ûçdä‹„HøëJ!K$X–@t@Ñp[ZÂmÿ¡ûi	ÂáöÛ¡
ÃØ„Í£ƒOÞ‘á(ÏÎOIèbþû#œõ„ÄM"hu‡ßkn(:ëBzµ#xáÕÖRÁ§µìÑì•¤¢9é‹_7Ù1ÉZ«ÌÚôì]ÑÎ²,ËæÝ°·¹ÁÈÉÊÂÉ<° K¯*Çl6³Ò8û7—tàÈ®8(#ß:¡Ë \ãKÙNT‚%Sqœaq!½|%º”áÑkZ~;U†È: tÖáðaQ6Ûà¥{È˜ºuD†ä6+ß”Ò¤RD¶®"…Œý”SPš¶ú!6~îb Õë©¾Mµl„«uÚ×ƒž†zHuG=oîZé@8¼t¼7=<ñK[†$õ§v|.!½dD±•æUÒÍëgzÿªU/aÒØÞvÎ µ«ÿ¼³a12…”ªŠ}€tò•T‘gR2Ê„'$á¬,†«)¦8,5à$®lÞ…±;ûÛšnR!wªf›Žß ì/‡š¤M;rËë‚çÖ;Îæuº¸ ’øÚÉ~Ù¢Ò£cþü_™ùÜ!O1þ¥+VfBà®>îAÜáM;}ç™MGœV¢mÅ­„8?ÿ‰<"‘Pe¤	¬6ú†|ç_ßÿåû/h	ç§ ÿúèŸh‘¶¾%K0²a?œ}¯õg·“@@C?¦m€ùñº§åPË‘öÔ_éÿÚÚæ|Ï&$U´†¯Ï
ht9=KP´isE¶Žä6Þt:»G>ÝñjÈ	¡Üp%Z}º·Nn®øWÉ½U‘¥¦ÁªIC3­›oáeà/€rI³%tM”	I†nÌ|Ñ³‚ìúAÅz½ø„s´ó%bnnN»-ÑàçaÍ˜Î¹nõ·!_ÊRN^ FýD¢¥M^€ª€É&[ŽŽ`Fû.ÅP@„)l‹}»oïoß|÷Ý›wo|¸{ëÆ½=¼[,÷œ…b£ò!5Ý§Å[¾ÝÙ¨¸ž×ƒ#Ä¥»ì}»ß§›+ìÌr\*˜Õf«_"«o”\Bã©Ë§mj&¯„@æ›¾üd.†Å§dìÞùé¿$¬¦DdR¡„XC«S“lªfä^¡Ó!íWÁë×,)É{e¶'.³“JJÂE#¢ÕÛ¦ö@Ãr‹&?"ê 04L·WÉß­hö+êí1dàË(Ùµƒ€®A~N	õÅ2	ôÔÑAu›kñÇEf=·ÝAû®ÓMk3<SVÓ¡¯=x³}²ß÷ºá>ìŽéw¤#á!—º·ÇBeÒU™ÝÆ"‘Qph>ªõíŽ×xª€¥€tZ ¶Î§¨wK–‹·Ý'
Ùû™êÚçÿ½60hQeHM¶y
|³ˆíkÔ¤¢h\‘‚[NC/‘ŠÿdÀƒgMmý§íì}¤Ás‚ƒî=±a÷ÛIâ TNhÅÐçPØÙ™Dã„Ð_Ãí ó&;{V½ƒN*âÕ ÝÉ¬™K9`8’væ
<1¤@[ÐÆ¾fA“ÁíP_ cÚÍ$ÀØÅ'öÿz¤ÏÖþÍíï¿ Yzþ÷T˜¶Î50bç ßÿ²˜.ÚÒÖw½¾)ÏÏú&kê6à‡my°ßä©À` ÂÐbÛsøn¬é£×ÏŸË^÷ù×ö$üùw7¾áu§éy~Gìá#÷Âÿ¢UfƒîÚtFÂ†þ«ï£ÎMR}ïìØe|µFä¶ÈÍ¬­ˆ›E¢²"5‹ïûù­+´²Ó¯£ÂY ~~²½itËï·<Éÿ’ÔHà˜	ÿÏ¾v20ŸÕBÌ­R‡Ì{OÛgßYè&Ð~9äéˆ “@X£äŠÔ"¡DiÿþÉM8‹’:²èœþt ïèy¿L¡ƒ«5ÑŠ-e›Aê"ÄœÓÁŸB6¹,B$}LœÊ6Ÿ$Nú*? ‰É‰…ày+ËDDÆÂÅ©0Ý,ˆãy*~•æFëp£²„¹3ÉcÌW<Þ.¬@;Ö"ÇF†ÙRða%KªF|’¬6Ÿ:ùRæœJ:p
Pöw§•±¼§›G¢°<±úpiýL_—Æ¦+  ›‡eÓÝ}gvIégígô³Ï¶”LªJEf 8HçÈÈ H˜[²˜J‘/<kA¹~DÞÛY#÷s#Ü™Þ+¤ºKþDsÁ•Õ\7ÜæHô/g´Vßó3¼®õZè¬……A<ÁÔ¢ƒÄØ#<Ik¬g6÷ß	÷Úõz‚x[’Ÿ$r¶J³‚	±I$ï¡#qÉÁÜg±ƒñŒL9íÃÈß†Õ±éðÎ-Ô>ÂÅ=¢ðï2×.;î–÷b2 `,œº#ôr¦`I£Â|d&d¤HSºc¦e‰xŒõÝ¶cw8îSçqYÑ:÷ú 5à~0‡ÜbÑì˜ß)K­ëï²Ý\ù§dû:ÂødM`Ës@úz0kˆ:¢›çÒ/ðf²Ïcwåš~é8vX ã>´[ŽðØþ÷éh{U}Ö¢Bâ@U£šˆNž^9¡:õ‡ðs¥†ø€5D'q˜ÿB²fq–ßtè’¬·5^|²uÿ&œ4þÍb¬ÎBp‚©úŸYUqô&|Jô|ôû8t;kLºÏQ½|ö1¹sëì7[C÷rþnjqDÒÅS¼½œ{faˆ¦°JœaYöÁµÚ 	Îþ©¾KÇ½OïŸ^Ÿo/_ˆ?+sF°”Uš±ÌY«ÜÖÛN¿‘f#XS‹†ë–žõM¼ÂªÇÇJ®‚vf;/®[½>.Ð¬„NWøèœaHÂt£ÿ  ÿÿ OÆÉ›xœì}{oÇ•ïÿ÷S”	]s˜p†/Q–¹y)J¶´–dG¤/Áê™irzÙIw(†!°Yãb±‚oÜ‚àÚñ¹Ù¬‘MœÅbEùƒºùÌ'¹uªúQÕ]Ó3CIvÜ€Dr¦»ªºêÔ©óü~à…ëÃÿFŒ×úBß{l¾	s½ƒô|'Iî9{mfØ^!ÝýöáÀK]G£°ïöÛO|Òâ¾g?Ú‰ï¤n{iq‘ìùîBï’vÏSzË¾CÛ˜±Ž¾Òïaû*Ðy—{#ß‡˜zúÛQ’z{GùŸ©û$m?IÈ^¦ínä÷ù'¼…ÕÅÅ™Ý÷3ÂÇf»‡Þ5ÇÏ»
Ô_…ÎÓç†GKK‹WÿÇ~àx~§ˆuVöô`iqøä¡ØÇe˜"è<pûÞ( /{ö±GÑùÓOC28?ý’Òÿ?
÷Ië–÷{æ¹çDg–²¯õßW‰4m_ÎI1­Ñ¤™öÖ—k³Yïôª“:Ý¸ç$.IcúµÒÝáõÝ$%C¿½D‚.PûöÙïéÄöÎO?#·„©^_\6¦òfÉÐé¹í£ö²m­_¥iñ<vbÏ	Ók3Ñ(õ½Ð±>!mJ¶í¥e‘Ô7š~ovÝôÐuC²OŸÂ†‰—zQØv áè±¯Ñ]înìø}ºKóÕÌ?õ´8
·}¯wpíxà„}ßÝ9
{ïÄÑßº½^#9±=ß÷§ë»ýkÇ^rŸ.lÓE¾á¤ŽåIëÎ­®®šYZ×š5ußÝ‹Ýd°}(4xüèn„ýÇ–$Ÿ³+”j/Uß…l’Y'ô ëdè…³dÌÎž<:!˜î+oÂúóÝ½3v%ËûzÎ·¦I¹×³Ÿþ˜n©îùéOÉîÙ¿†äÆùéoÉÙ'˜£Q×çƒ×mL3ï6œ?ý,%)tÜÏ:&­÷¼pQŠ"ïŸ}Lî8äÕØ‰ã¿"wFçÆî%o¸?Î>–9.nÈ¨³	{×VG‡÷½ýA*oh\ø¬Ð)`›³Íw#Û¢ì›'”»	–ýºÅÁŒ•bÖ8w2°t~ßWŠ‰yaßÛ–}0&Ûuà/‹eóõ¥`_ÙXÑÜ>ù©GZ°ª©K×/ž…±¾{öô½Ò®Ip~ú3ôQÆ¦Ø]]&#î<Òÿ(ã
(ç‘WÿúmÞî}ÍÂ4÷©DÓÀ(Ÿ’\ÈcšVÁ5(ãÒçrµ\Óº~bŸ½Á*FÌÍÉxU+çÆo©³ŠÚ÷;Tíñû[¾ë—±Üøö…K¶·££óÓ9‘ÿÄ#ÁÙ§öiÝ½•ŸÏw·þfÎN“ƒUû¤b±UyCßuú0™±ë;OÜ>fÒ¨
ñ¿é*œŸ~Jb*i$ÑÙ'©¸_%mî1½#…msúA6°õ`:zgŸôÛüô¶_“õ$£pãî­õ…ìWÚm{P~µõ7åw­÷Î>è³5²îô±Å¥ÎåggGäÖŸþýOŸÐ.w©¸ô›@˜oí=ë´BRbBVr>È¾CA9Ôg=âÿéßGl
~Ó±/5Ù¾?¼ýØ&±“:iÒ8ÉýQH^}•´šŸ.…ýŒ)ZJ¹›‰HI9s û‹“QByVö›xUÓÂkfÀ‰<Ã²ÑuÉ°ËµÛ%Þßú3o?ýcJ¾3‚EûÎèìW©LûçOfâóúœ«Là~ìõ	ü×îE~Ò^Æ‹ykïÎ~¦ ûdŽ’.×P’eäS[`AUb`mœÐA›ØÀ^ÂH$;Lk”¸ñ¤ãamŒ=ž{ûg¿IB÷Û€´º£þ¾›N: ¬•ñ§¨3H«%‡µ1öhÞR¦#éúQï`â©aŒ=æèXø	Ðrz=w˜:aÏtXBKãÏÓÙHNß CÛóBÇßšÚøªÍM0eOÎO?'>o«mˆ¶˜Ð3yÂAJm=ÂëgŸDpüE„‰Þ#Î['™»·çõ<7ìÝw‡Q<Îfhp'RKñR‡ê¸âiB¨´ç\!*SÁy	Ëæw©”Ã¥@z”<›|“¨XgýãŒÕ¿`œDq?ÛÕõÏ…mUÿ²JÓõ;$‚ª]_U*äÑÃÅçtÓcG/ýÿó!;€?O­¢_èéivs'uIcS`ç;£”NÁU3ÌËÕ,G˜‡ï»`ŠP7W^%—,-Á(÷ì ýzéX“EÀå\Ìþ¦2Âª„MaGjÍ‘k„[“î22rïv£»ÎQkÏñwÎjU‚K´,ñV(afí @íäoÕ…ÈÖøˆPùÛªµ‰zºýV<Ù\$V.v§ˆêz$§¶ƒ~þ[ƒ"\18ÉQØ#œ$ŽqÜÕÛ#­CÚ_tHy`¸çÅAkfDØéÒ³jÜbc®s†g‘äüéè:G¹

Zå>ñ©èK¥ªBþ&gUL¥
z‡3U%Ë9SqûNêtÄíëôiÊÖ@{ìñ!	F@($õ¨22„Ö>ëmÎÌÍa_ŽçÐñRõöHã‘;÷W¸†P›èä¥ÙjUcI>ýSÜf˜sÂ~ÏDþâõ…m'îoÓ}G…u#üÕwšž×vnR´YûþxátvÝÞÁ0òÂ”pÓµKnxŽí“o,ÔWp=û.ºai¸wËFø÷oÓ¯OèN†ŸÛ”^÷ÝkÇ‰›Þ6Þ¯|1þ}ö
’Ï9Xœ'mÆhª'T…nÎ}–ŸøšÓ9kû–ëÐgtË–Ý´ë¥¾‹p*ª‰‚›0}Á„iÖoy0=G²Éñ
åÁW™ßœýÞ#Ã³Ip)f-ßÔŸðš–©¸á&½Ø‚€W%QÚ‡æÈ Î*Ÿ}ÛšrÊÓ†ä@|­	ñüôû`l{
vºtpö‰¦9øŸÞðs¶HÙö‡ÁšÞŒVSV˜„\uGŸUÒ§Tî»½Ôí—¾ÙI½€’½é¯Ñ:Cd“2±=÷(œ´U¤|"{ 57OfoÝZ‚µ$!ýþÂÝ»Gôš‡R§Ó™Õ3ÛL‡²¬¼°ª:æcß.êk±Z—aÃ:A—îÔÂí˜o]þ1˜^Oö“ßqUðHè‰é
VL‡¦Ê\» žïË!sÀ¾$wÀLõöïŒ(y9ø‡á¾vþgÆúpC'°ˆ
ÓøÀž}tö¹=ºô‹1Õ<Ìvýø·´‰š@ÃoOœˆ[¯¡‹ÙfÖwA(JœQe_	ƒyöÑŸþýüôÓÙ÷Xë¬¿J9#¶“¹[ï .ýýýöŽA{“õòbaf6¾5:"ÁÙïeÞÀ¢@ 
MvÛõ‘/¶êS6Û¦¢K°ß¼0ñú.	|#›Z÷½åö¡o“Ê›£0M6;CÃ“ï},žñôñIÛÎ~Þ´`JëÜjÀÛÞÈ‹Š0ßgŸ›zY_ù:Æ¡{²#å(‚½(ÚÒ!“y$õ{;Ã(”åý}™ª2i;rÅRì]`=Þ:?ýåPò?ÙäJk„ˆRá­Rq2à1â)dïpÎ©ô:Aíü±ÂTŸ´¯è4<=qªB&dó'opÌ½<‰‘¤, hÏ>ó2å'>µT-IŸ*ùšß ­syúz¶m›ËÕÙ“8¡º~ó˜5óá-RK—$R‹Î(v†ÞãŒòàì/BÀ6¼¾Ö›Y:@NÎ~P×$‚ªÁ-!™Ò!ï<º-WJëm¾W•à©ÿìÑ>ùÝ=9ûÂÑwŸ¿
´>h?¸¼ÊØÀðö|JÜGmg”FB´Õ^.“aL	±7¢¤´é #ßï:±YìDpÝãGêÐ z9\¯7Š“(n³3 6é»tüJ~BÜ>ç‡²PÙV<½µ—vÄ~”&:Æik±?7È†š!¸80r… 7ìñG™ØŽê=ZáÈ÷µ'žaÏ«¤þjT$g4TÉŠÍátö´
Ë«•_°®$ LÏœÙØ,‡ÕMX²Òºï}*ŠoÑÙ0ksÙ€°? ÎJš:wvÍlHÜ®ïRr†ôìß æŽ~DXÜå(§? L1£[æü­Ò4…ŸõàS*³“Ð92)ìmlv7Ý.xõUE¾Î*åü«ƒ¶”½cKØ™ÙXgâ˜Üì
mvE‘à,á7)æ&ÕÏl,¬êÔfKõöA{øDNS:Ä¾¼i¡jÖ”"¢èI>9ÜÅ:FÚ
$«PÚãGx¨ˆ:¶msL0ãÇÎ¨ï¥”Àmë=Ï§sÔ9Žr5øIu*HŽòk×®QÎÊe´YP³Tß‡ûN¸ãô³s,Šnq„¯oÜ¼ss÷æ[wî-(¾¾þî·”ßß¾ûÎÛ÷wé÷7Þ¼¹»£¼åþÍÝ·ïß,î™Ó{³:	ånkqž,­î
œa1%f
5ÐÖ{tíÆêõMn…)­Jž²IûgóÄ‡òÒ´ø£–¾A·´S;mõ¹evûôâþ×¯;t›JÔ¤æ^¢rT²®K‡žikYAèm¿Œ³„?^ãT3FãÕÏ;²ÕäT,|G³]‘¦«ñ ³Ö(ñb|€Ç–ÙzŸj‚œƒ7òÆü‘¡ïT÷+¦ì† £1ñlÈ6ñ[[Dy­/0êBPaõ<­;è2æÌÆ±à[€·*œ	¹Ar œ`$Jd$Í8‘æ˜íh‰)bŠ¡@¸ÔMÈUÎß|ÏNË™y¹at'XQó•”„Î0DéfÇwÃýt ßÎÞ[Øš=)ehìì[£ŽëýâÁkzq
]öD]Œ+&FLä”³c©ü·zô"}^¶©Øéá²™²ŒèÍÜ.ÛtþÊ"Û'"­|&¶²0{lŠÐ-qHˆ6pòÅÅ¨0$Paä ½8=]ü ™NÍ|Næ:¸RFh§ìH¨™Z±^„¸Ã
ÏÑP{5v ·ûû•ð/.¨ÊAm—‰oŒCèƒÄL^“lEÞˆ£ ”´–r{aKR¸'L,u½™p+æ†’ ”È.;,óð–ó_$c|ÊçlèÄ`Â÷¾5­Y.úQ:Säíº¡aˆB0ÍÊ,eÉ¿a– §¿Õ¸¹L¥—µëö¢=<7\w˜¹yXÄó.ž-ßÇ¹wä¿–š–gGt+JvOní33ÓË7µ{öy8 á³¥ÀžÝ&ÄL…¥!YWÞ‹n9ÇÒ1ãnÆÛ¹—EY°TìÊ>£g}Ê<ÀÁCZyÈÃ<Ki½eóE,Á<yÜyÜáCøˆCzƒ³§`&ŽÏOÿ÷L½<¾¢,f©Š• HŠÔE-‰Òö°%]ŒÂ7 V.²Ô‰ã`
‹&"&_lò*¥$æNœý%Ë>:îe—å¼¼JÞƒà …·#ìûmÏþ è…e4øì#¶(¥ÛÎéÜuâ¢–sØ€”’¹ýyuþÝ$ðî‘Cr¾Á2Òy“Ë·#	roP)æFFÿ»Àö»ÀØI@â,üÕ/GË*hÓYÊ «È6O»h,ñf²V,‘îÞ±e¢ç.ó€5÷Š1ÞhÊ Ìâ!Ê.ìðÍÙîtåC|I=<5‹ønú!Ý[ ‡¤t˜EJÌÙê´iü¨ÃqO¹ñUßì„tN
 [DûTd£‹Ãûd\ B©x°†Äe6ŒåÀE—àHG½Ô{,v›eJI]žl¼/.‡Éhl;Sâ-e2ÆM ¸JåÆ¯Y
›ý/+;aø1+¿þ"ùˆLÔÏD ¿ŒƒÀ¯/ˆ{\ù"IÆæ!ÐRùf¶p\ýÝ_s“Üãú\¹
†SL"7Ã o÷“Ìuw" NOaú&ÝlÂµ¾š\FKñÉj*¿‘iíÅ
-T}žëð†h;¦£½ù/çlŸ?ýÅ½[äúÙ÷ß^#•È-Í0›ÄpvÏŸþË.s…Åð€Úh^Syè+-ØÔéýâ…›¼Ï:Ã!âZ¾ÞóŽ^’ÐµLÈ]'töÝ 6ø®Ó%ùfWr&€Î…?“wÙÔŒ*ïŠr!-˜xKÄß_+ÿ¼ÌèâŠHr—¨’=Jpð3ñ=öK{/Ž‚v7J!c™ôGÜéHªª‚9¹ãî¥dè„®¿FîG”m€­[9ì bA²Ö½dI@y‹´ oC_¤!<ôÝj( ì´H,xý¾¢S•cj¿½;}.L;Ú1aSPø!	ýp8Š‡¾ËL™‡6'0{=¾“%ÿF×°1³§jÌœÃïëCÑÊî”ááŽ©ûáa0ÍXßs<ÈBþi¿Ý;GçÀ=JZ÷ß¾sóƒ{[woîÌåòž>Pˆ£p‰lÆL¿Ü/$„‚lólªÇù¹ï„ÌyJ…ÃO ž`•ƒØ1·Ýwàï‡9$êp ¨Z|¤ˆ£Šßh9Òxeí†Jå‡á#-åO›‰=Wž{o=ˆé&}Ë=š'ðË§ëú­@”CÓMí%yp3¹FrAö|ÉYtUÖƒ	.‡78p’ç±Ûg"Ü>áO
Löe%$
ÜV<„!ÆÃÜ!vbå‰Ýt‡– ½õ.ŠEÈg}Ú‚PÓ£!p6Ö¬“I@.Ol+_[çBTu/´‡'ÎXSSòs·v9÷¿\º6ôŸÅúÏÌ[Ç Ð•õ^B6ÉŒ%)àŠ.) ÒŠCÆ^/€^kEg“$ØˆÀ²¨M#óz–¶yq$xžä²QBƒË§•ãÂ}½™yqýèâT!Ä…&’žCOÒKÅ¥‡30·•rHs¸hõ‚qu’¡ï¥­YÒš{°øŽ©¬¤ŒP¢0£sÅÌ*ˆX`Ð6T‡ \CšUÁC¦ŽÊÌ y'Lµ…ä×q…Cã ¯ë	3¦tˆ«ØõÕJè}9ôÔƒñC³X…„Ýf™Å˜c“H‰•UAqcÆ9¾\ó,ç°özgF0_RÙ¾&Þ
ñ=¼´´X¨]:R*£$ƒ(NgjsƒKˆÜøÂH!t[!µ.w@n]Îé9Ÿ½ÿ€òJ^ ÁbøfÛaj u­y	æÄ™‰†³Ójn¼ŠF¦º	"\¦•iqÀß÷£Øû.ðîÙs*O¹É¤Ú¨Ö)
^”Z—)r™Z'ô$j]	Ï¶&;réË‘ ¿Æ~£CøÝ\Aˆrg£~h+¤§×åòéë´ó;ôà£Ú RšyŸ¥m ~g ag™Â¥HªbÆÍÄ`È’ÂZK½çZSyˆ8Qº(NOë0—¿±{öyoƒ~Hj'|ö«^‹
€øã4e{ä’bHÔÊ¼”"#èÃØ6­í‰*éÕ°žWÆk¾­¢_ÙRGá6‡¶}dqlÈ0Ù’Kúã‹ÃqcÄ F×	³0µÍG(èZª0ÞìÓåèjsëÆÍ7¶Þ½³ûÁ;7ïß½½³sûí{ÚQ@ÒÜƒ‡hÛ4r@õ ‰¼5óìGgŸÝ'C¿¹ô:rþô_B2Ë ûzçO?ñðÕÙÌø’Ù×™û ¬íòÊŒu8æÜ‚­«Î!’„–|›ÿYÀ2K¥ájj^öI%aÔ0gUUG›	bvÄÚ+ôÿCøŸyeîŠóndivÌ^ÔvEî?1’”jô´Õ¼NÕòwTA?ÛHîžÑV d§fYp‡j!«Ú¬¥Ul–M(§J×»aÂÔ.æƒLì–
ÜÍQ·«‹RÎ¡µÅ5ÖbfõX•¶ ‰d°a”Â›F‡nm?,ÙìFÊ’Þ© &Kê\hEc31åš	»óÂRÍàâÑÎÀ:ÍÙelÀvuÅ–h¦zï‰æipÛ^ÜóÝeYŒ—¸›µ¡êÃ•=D5Æ™oÌØt?Ì,™ótmüÕ‚’3¹«à
äã^! ÛÕE% lhæÒ˜¦©®?Lâ1uØÀéL[owÂLyþ¶ô˜r²ÁÅD*ÌýÚÉ“\2 À^æ~|äÁ½?óJOÇ.qÿº”²ÞÝ˜©ÒõÌúBwƒ@×þÙ=æ‡úÔË„©3*ŠAE¾pÿŒfc$sSÉ‚ÌU3rw)‹~ðæý·ß}g‡»£˜`ž»
n÷Ÿ „tî:bPµ3!×øïF¬QñÀ÷h$ySôüb|ˆ¹µŠv;.Ý1G­hË­JØ/ìù£¾›´æP}€KÕ	sn!ú€÷J9Ps—ˆñp‘j7Úß÷Ý7$Ó5d)ÐÊ`T”…Bß‚©0×ÄËj&§Ûc÷1Œ~æ`l_)gUœ9».A\?qqï1õ·x@ÏíÐ=$;nÚ‚ßáóyB)^æáœ];³¨Ce®¿„ò’fûž¹AóÍzR7õÕëÚŠV½,Ï3×—V¾²YŒîE~'cÈc²9.	JsýÝìèìB,•dÛË~é;ÉÀí×UE»Ä8Êúy†+£«hO´€ËÁAŠ,¨Í.×“©IñjÍ¤8³Ái¥“’Áë5¸Œš'l¡9œ÷ž_Müòüª¨ ¿D•ïÑÁ5i
.—z›øiác¾öÂÜ‰yÜ" Õ#¯ŸŸþSn…,#;™cg»ú)	g_ðRVÉ.Œ?$¿Ó)Üg‹ˆúkÕ¢±&[»0-U±¢¿6(—•Í”ç¾áŒ‡¶‹Ü6§JÖ~7zÂ…sôAž_p ƒlP-«áñ|@^¹v¯‰-¦…?žQÃ*ÏØ|$Ûg6Ô}¶Ó6¿§n~Ù<å‹ÓùžàŸ«ð;™²pïWc¯w~‰ç!Wå‘ÍêšÙf¤Q.«qßcîcDùÃó«Ü¹RÄ'-ç ¥KR<RãX¤òRE%IÁH…h‚;æàÂÕ~$ØC.ôÝ¢„‚­éªj«!]Õã*rºˆ€Šò*IY!šgQš¸³Â$‹_jl¼Ey—/b¼hmQ^Mê$q»:N®Ž*ç»N¿”‰çeªÐ‡ËU#ä^[\…9Î×}ˆ;Á•éU^ 
Öý|Ä!Àœú’ó:÷VóaPÑ¥×xMãëVÄøº%]t]œé ]'Œ©	%5¸%\èÃ|ö‰1^›dÂlý|«kª²j³¬AFÍ±Ó§l`gÔ…$†Lœµ1«7rãÂœô1Kv¿Ó³qG(ú ¥+Œ•*±±;p#Ò?û¯nž†ô‡pJHüÜ“MÙ–ë€AÉ×Ñ¬½•…JüüåÅ9L~Ñ­ˆ‡¯1×”âée"báûû¢‰‹hÌbÑÖ­¥1³ÇxämKSöÞ¾sk÷&ƒÛî»{ÎÈO>RâR…²ïPªoŠ>5@î±#é‰€±Wž¹E˜­8ÃXC]Ê„äê:P6Ëk7-J:8ûWø3-ŒX‡röD.cÃXõpÚÙ ÊèC%_ŸGEÒb*oßXËÐµ£ÞmºÝ¾Çÿ²Tu•n©•qmXÃµÙ‹« ½ó÷/k²@ö‰¬jÔÌÆ¥ÜSxgŸ0ï,Î>õ×;oßëPi›
@T_iå åÏQ˜°Þ¢Cžæ—À«3wØ‹ö,ƒê°ÙÏôµ!eËy’ÿæÙ†Jö·yÒ‘¢ÓŠd¤jnP‰TI«úY¥Sm‡²ŸX%‘Åî>•§¨pŽq;,5¼Åò‡•²XúxÆTê€Üñ{Uà·YÁ€59i HAãŒ¥¯..¼.ó¿åmÍn\®8¼ôN(Qˆ°9¤¸¬ŒŸWäp[’µqn'µ«>WË<Ä>?í4ÈåÙxƒ~þ[1CÐúu×÷ïd¨"œ\N:Ñ8²ô  Ú]ªòtU”úâ„5]§„êK;h™únVÃÐNEi<,XuŒ¥vøCç`åÊò¥L†­ª{0Ž’,9B_IŒ[§¡BªMxÂå-sÔ%zo¡Aú`Ktµ‚õœ[-4ƒØ¦C†¢êJË—¬”ï) Œh–tÀB…Í/àë²	báüL'+`{ç§¿tøù¤kÖˆ,ZN¯þøºÎ‰ZDù*¾Sá†3âõ?CÒx¤® §	\¥ˆ`ŸèPcÉkÐ~¨þ²‚Q–Yñ°Fø)F,£!qý=¥B™1û½ZË£6på´ß<ª˜­±Ú<p›Ãv¹H"ŠeR*–¯©…±M,S“£4]¯¶ì«zÖÕ2
J£X[mÆ•>ÓJe¾AkÌ¡Vg›D^jõºÃêÛÕ¯RÕQ…ÃÎÐŸUú¬®åi]3Ï~”ãvK<‡à'yÊÆ†¤c¶|'M%*^ÔKD?+5	ÅJö×ðú\T
qÎ»ÀD­)“!J6@Õßoê˜”½íŒº—æÎÐ­~ŸWA9Á[›F'Hð=+¾GGxóØ²”^i Ágôz™§^MÇ`x¿Q Ù²Vµ}òôÝL7(° 3P\Pþ£ð=øNÀ^Û©Ýd0ò›wco_f u“œ¤‡÷FÉóÍfâ>=}ÚKfkRÖ.Ò}èè”¹ñµ<J&?Ä-Ê|}¦–È€ªÅ¨vÆd;6‡‡¾ëÔÆ‰É Ôtbp=±þ¹ßif£• éìQNÚb(0Ã¼ŠWmDs›ìþí¨ïBj[ÓÇAãŒÂThtJE"Ì	a™²$Z·î	E¾ÀaûÁež@¹ýãJö(|ðúêãÃ‡ÖÒÝÕÃ“j½ƒ#zÖÛLžFC&ÈwÛKÅÆë6,Q»”8 1Îº;®C
­•ÓM"DEž;]4Ì\Õ¼#¾€Þ@õ ˆ.>;ïá‘ë·Ãá(µ¾Äv¡ÌKNNÇî°'×o_×þPÆ\3ÊçSb7	FÞeËÍÅùwÄ&Zn'ubzüuX+c¾åÝˆÃ¢M·“Ð Í}¦´¬ÍØ20l;Ð~ß,¨ÓÂ©sfbröÆ¸MkÈ°YmÊÙ¹NÝ‰Ýx›¢­¹2ú¯%­–òfC¥è¬[pqq‘yhâ–jìÑýÌÎÆ‚ãâ‚1&·ÃwÜØ‹ú“´€"üÚÜ²5¸M0îz2Ç[NÉðÇxáÐvT«þ
Êº1šÈF€ 8J:¡ÇœxpÐñ*ãhå€ÌÜ'>ëXEJH° bx²ë²„¨ÉÌ4Å €Ün[$–	‰\`0Ì
7á4äYõÙ›œòÕ°°Bù…Æk2m\Üç­‰+‚~coµxQZÎ¤(ü;4›Ÿñ7ø<‚…’Ùï·gä˜·0F ´œHùm–8Šü6ÕPK§`¢Áx¬Ü×„y3Mõ”WI0ª¦`»NÜ˜yôôv7;€ýZS]­ªáÉ‘ÜÀcÃ—MÚÎÚRxöm®ß¥o™Tl”E‰g	EbMš’bFÌ´k>xV&ÿ©ÚlÀKÔl-z›%‚‹?üû‘é‡)<–æú!´£ßç‚i‚¤e¾Ò, «¹ê“0§ì&h[8yéíesž=D_
kýàsH6É£K¬Œhqàß1¨š¤2qÕÏ€Z¼åšÊ÷Îñ}žfgOæB­—ÍzÇT­W¿°à"µû¯µuMWãjël[^´¦L¢¦ïÏ­£óTÐkh¥(½\$µvŸÒ¦dv2~s(e?m¦ìÃÉ¿ËÏ¼VMÖ¹Íôµ‚OV~Ê+a ”¦ìª÷•ËUÜÊë}×-A~Ê“ÁT¿W%›T§ñb­©h¥HŸ“•cÔÏºa²ØqZJòÄ¸óëX žFjýJ})W+<×·K 	l\^ìÇâE)­H•þk…õy*¬ÓT2ï‰1T |HÇ³9D›O\–1qâŠó¯a™Ó –Ÿ³M'UÈ°œLÂOÆ0½`è³ú9nÌÔJÓ J±ÇÍCä§k’¾5ƒ´"› €å¢L U$¸\Š!þ‚j× Æ.-,	>(ãË(G
Q×8´¦þô3*™ŸŸþ^L’?}‚ÑìµW)ÙŽÕø¹—x«jßó­óÓ/xÔ«=ßÚe12:ÖØ,Ú¡Ë‚GîÒÑTq×…¯Ÿ›¦ŸGÏMKã?ç/8û˜ª9dî³òP$#=^€ú{œOîÛ,Z(iñ”°h˜"RÂª‚}Šó™Bú>©“¨UaóŒ^‹&…;óMi_õcx‡àcqë½{Ï~4÷"Î`5ƒ6¶ÒnZ¼øsyYÈ9ªÌm‘»f?¹÷X
Ö½¸Õ¾í¥ƒí(œ¤ÅÜV ±Ð¦X<ÎyhoŠM*ÿ¢U0D{s&>R5Î7<šuÈRŠž}dÖ¡Æ<¡2ÃÍ'^ÂùWÉ-ž”L®;aHù¾® Ã±›=É|#Šù.† MƒSKië„õr¹»uáªÊ³š3Ôä<{‘ ­ÑÇsãÀU ·bœð
€÷Ö(Ð©IöŒ¾•"&ŸNK"âYÏÉ¤lÇ2E¤ûM­*2QÎÈa‘ÎOìTwãëX{ äÀ¹=Pf€{B0r†ÚšR‰ÅËLy¸Öš}¸(d;µ»PÀ·•¡0à5Šw’kA„³”QñFO"d£+vè
«…†K3åÜ~{ÇnØ;jé9LÇÉx5b®¦WûÊ–†|e±Q&Pyå1Í†ë
ú¡-^VtV•áÌynøŸÿîÜÕ¤¿®2©#¦è€X]Šzv!-Vû)xTÇJÆZä• ÏÆd"º™VX&1Ï*Ò4Ù_?»¨¤†åÎEQåŒÎXöm3˜UGíÿ—ýU&ÿ'Çbˆ´a)ò²ê©ãù…œqÇTÄ—µÙXÊgO)w«ŽØÆÈ¥ÌºÙfhAšD,íÛz0Êð+Eí0Íp¬îO©”1ðäÜšn?ƒPŠ³_™ËÞh •p¼÷ËWkPïuà<•T$Ñf¡ôQþK	1W¤ÙhÝDâIs ¿¯'<š'^ÿÉ	™€Â­Ì‚7¼ÀÝIcr°¶êpVþ.ÁIT1JX›^«ªÙ` šu_ieìÑÌÞeù¥Œgmž ´G¬DÊñ*XÐ r× rÔ’y‘¾)shª\\ZÏš0è0ªçmµ¯zä¬'ûëì˜åkˆ±Q,ßXø<¡iè¸ÓÄµ-éRv@l€„Z¿M}èØ×©D¾šÊ>½VM`DÏ^6"ÈÏý›oÞÞÙ½yŸÁü)™eÅ¯Ù‚oˆÏ½ûÎ­Ý›ì¾½»u‡=»-Hò¡s~ú“pŸÁmK°AØùlâÐlƒ«B¬ÒÑèÃ(åÚWÍÕ²Y<ö ûP æãì”Áö‚wÞª l˜Mªiô=^†çŒµP–)ÏÍK£)F¾ªÚ`F¯XÅ¸7È‚¾·2iföèFo”a€‡¾¤-·ÓšövüöÿûÕšfvŠÑã9–¨Q-"©u›%ŽÀŒdi«9‰PS [¢ç’ëÑ“FÚ‰T€(3˜hì"–"DD…h«ÙÐ ÑkFNn¯°¸o5"ÝÒ!ïË°nV¨ˆžf=óád6£Ùí
ì¾â¤Î1kÁóÄµgø¼Eu6îœ9.A"xŽ8 àaÊJæ¼Ty•>ü´òöbsP øg9ÊÌÆ½ÚÜT,Ž%˜|šá”‘}ªŠzÆ,êM}Èc"?à`9hå!ÊG'«¬æbr–…ÂíóÆ_êŠR™b!æ|ÏR‡¾?ÇîÔû:ôú‚µ@¦TiD[n?ÏËBÏBUÁdN>KH•Ý‹Y“ëî†z}ËEM}K^þÁRgqù!ánÙg¯¯ÚñÕïä¥”t®G)éÑWX‹m>Bh¿¨dþ÷÷Þ$oýœÜ{óìïï‘³ïoßÒ«¹Øß´è¤Aiä
I %»˜ôÞý£æ4¥/~´R¯“««Š+m®(KÝ¶z~ÉÄV’ètòŽ?JT§nSõ2Ÿ®SL’e“Jy0 Ez|D‘
1è8ù©ÇWS´ë0Ycu¬Ò«‚+væ•H±YŸÓËòÇP³>X©É ²clúEî×o8©Ã\q”'{i­€wË´±S?é–n©AºëƒÃ¬5R~ÙîÓz©C9ÌÌÆ›ç§ŸzTæ[#et†>”ä›¾?^öì¿èWT¼úiJ¢§½ŽA–0
6ÞÚ ò;ƒ®Ûæeßé‹Þ…Ùçxu&uG|Š¯U‰s§ÎPœ\ö^uŽYù×'¿%F`äN*ÿ‚ÎtÿÐ˜-“÷A`e°`!Élbo±PQ¤kû!vû£žÛj9½Þ<€ûq×ý‹|“ý™™$æÉâÜœ)´}}+¦‚á}ÆM ˜>ŠŠë¤+¢Xä+ëi‡·U×}_Ú“1š¹"kâ~thÑÙŠžt,H _éÈ|i 1åÌXÑèóëœ'‘¿ˆŽ3 ¾çÞ5)Í’R\å„C9l/Ó·B6’Ýf$3¡)c°0»ëzÔ?2
×x\ûÏ*œV(ÁFÿoËu$êUOWÆñvñÞ¶]ß7qJQˆ+y‘œ,P%ó,íŒ×cEÈúÉcS²I(SŠ¿/¤óJs¯da+Óè“Ûëµ<³Ž+g™'ZÌ'	ïÃnÜµIKåU(›ûƒ(1‡/çG	özF%¶¼*’Yìt;Ü•·]KØ:(+·š".Ëzfq]lÀì1`n@•¢ÃöU{þ6ÊÓó~ódœìI‹q¡¼IBVjË°²Ðì–éèÂu‹Ÿ¡”B^BAú|™ˆÎ’Ù	¤®9Ö³Ï#*Á_ƒjwU±Rvàg‘~w*ZÀî¯ª 
ò
oI©ƒì9~RU&ê@ ÙàI°ÆáyU"®.h¡¢*gæ»âÁÊ2TóSX+*Â¬¬·©2"è)µÖM™Ú¬:ŽVÁøIzeâº–‹÷[t–5Ýäí+ôG
?ºþ(†÷ÕÁ1k²A&†Î"Âç‡Õ,›#825SƒÂL*”çõ¡]cÏ&,f1ËPÒ~N„€ÉÂ5ügQÚ×:D~ó%­é¢0 ÂÊl™9v É²ÌD=~Rø5ROj¼ÞŒ>sQxšˆ†|¾,UÊÌÐøV
š¶””SM¡¦’œ®ÆáÑ|9@k5¤oHI˜ê¹Imú²‘ïw}^£A¤eáw¹Öç%Zz1ª¬ìÀŽÅ8^!O£«³žJÆ£êÖËQÝ¢ðœÉ³2ÆpkÈâç$¨aù©¹ÍrDþÂg‚2äÕ€×e‘›‡š3­’Èbñ$n½iDµ¨–H)Zq+éúÂü”z1©Æ0R9«ÙUÎ”å|wT7„´[ ÏÃdWÆí)*Ù”ò±ÆÒKeÿÝÂ3Íêc™w4]JÔ—o2Cß¤	yŠe8°f¬íî¨X±z"4Q-Ø/.VÅf”PTTšíÌÛŸÀ;*þ¬ÎºA°h|Î¥UI;F¤3_ù’.#7€^Ð*²•þg8³ôNqŽk	[ãÎªùKu=½ÂI‹bª¯–gÉÀ+ø'&®©™4ò…e‘D€QY3Ml}+ŠsQ¨T;yŠ¼œcopŒ.(íq§*6©Ñ‹¸²õF¥•ZMTA7[Õ$X3J5†òƒ™å²j–TU«[]¸ERZ„P'¼„†šnŸþòˆtÏOÿI©VêÍuFë+ÒO¦¢šb9g¹…[‹ –Z–¸t–M-,Nˆi­UÂãŒR•Üˆï%iÇ Û°@nï‘C—8±KÂ(%^ÈÛ AÔwçá›Ð¥"r
†ü`Åtýý#âôûLîƒ± ‘t@i)•>j‘öF×€:ƒ#¢¸#‡±‡~hç^
ý³7™Æ<+??Ñ`[L#àIû*	ÀxýaÅ€Ô[Bm¹"á¾sÔhä¶ÎNjÎÉÂYµûò/7šÂ£Z¾®æ]1c”Q×ëß©«ÔUQ&
a"Ë¯,œ}—9&F°¦®ïeŽhõ÷ËˆVúû˜¶”¦ÁWH`CÀyµ…C†“{UÊOekè¨6tÐ$¨"FmN™F²fbÊBÓèô5ÿ¹%V!M¾Ï’ÏY¸AT4”Ì¯ãØ…ÍÞ`À»,‹g–®ƒ²®³Ô>Åo©”èjàúV Q[>³îE@qÌN£»y•Bö=$ê1ŒSRó±O/éZ<ydN ±dèM€Ó§üÊVèQ†Ú¨Ù5ƒ¹Åñ1Á‘ðÒ/éQÎ ‡Z¼OÎ8ûœŒèlÓþ,…ŒOy<Ê&œ×¹4L9 ÆÓî»TÈ€ä¥ŽZšÛçNæÑGºNy?xo% O)õŽX}ùÿìIi!sï€û8zæA®§«ók©wi\Jÿ·f9k9û1•K·úT&eíd«×í„î×¹&˜SÍs›A&uö1ÑE÷˜€ˆ‚ï€æX¤%Â¡(˜l¾MŒ¢G`]‹Wâ?›¬Dþ_ù7è¥.ŸžÄÄXla\±“–uxà^åeÏ¾pô«rÂ“‘8µ›™œ%îÁ¡ÐhYíépMkIË”+åÄþ^6E¤èóøUYw¾æ[¾XvBú^áýž´ØBÀ[' –í¸ó¼_ÍwÔQNÉÁ' sþ˜ò‰ŠŒ‘¸T£ë;ñÑŒZã¸wj‘BU¦Ç .$,±ÖwËk¸ýûÂqTn©òÜŸ^Õh¤~6w©$£`žt¹õdo’ÜÆ”ùT€/ÎqÏŠæLÒŠ#ì¦“ê”ˆIVáº£F:Tdµ°\–º›­âvF$Òoìx‚(…j\Ø˜.‚“;æ‡X‹ô¸ÈÒ~oPŒª{ …ƒ§„”[Â`ÿPi‘’%Ý9Fà¥Ò^ø„Š—	…Di½»"6¼ÂöšÅ+ÈÏ+Sò=ÕJÚUµZî«[ÁniŸE×šÅf. ÙÉ—;¨“Dq{yÜÇYqš!XÕ½­ÇŽç³0Áò-yÄI`ËÃÉ+•äÆÆk$Ð«X¦Ô†ÑzÄ•ÚPÎµŠÇq9ÂMòèÏÿü?ó`ŠKÐL«¦÷Í‘6QªÁÜ	DC=7Üj‡Ž´ŠA~™ò’LRU6S|†f¨Ê¡u}Ë6ºÇ•¦ø­sÈ_‚!es#0]!<…ŒäN¥JÃüs/)œ·zÐ\“™B­ÝSåBû…VáácÔN²”lb*·‡Ž¥(ˆã,"ã7p\Áô&™[ªj%àFi|ïDÐ9MWæP?¼ŠÂûnÀÌÐ:ÃAu—Ž‘U|?J)¯ÝîVN¼¢žbÖ±r]´9jë]ƒ¼«ƒD`2VÈåªC/PS‹ßñå&Þ`°èo9aW&•(š÷ÙLN|àKí¼„G>á±â–VyDaÑ|c˜Ï‹âÄvb%×ËâæF£Žx¢7­!.×à†“ýÁ¥J]î‡„/Ïžä•»Šªíå!„“÷#ªqg»~×é&ìóÂi•ƒLKJ«¥àìó8ðà]³ýÄ,Á¨mtÜMT„8þ„l!ù¸š™7J¥ªfl#}n’™‚ÝVÜ?;5·±Ff*öz!9ªynnyÓS¹°ï[ÇL(ÛéEC=c¼Sðù“Z/vé\õ¿¼ä–¿@C’Ë‹„¼Üwö{/sÀ(.«Ú…•îv> *LIÏ}Ùhq4ì¹i1†´XB¹¿ôÄ(áÂ5¡ÉwÙÔ|ùhRM¾¼ÉFßÝÀ¿ÿÒÓã³Ÿþ4¯n’q6¡GˆÎ¾ë2¨öÉHÒ–	¬øDÛÌ1 >‚;^àéTØÉ|ËÚÐ-è¯¶WÕ¹ìùzasƒÎ*×<×W¤2é´ž¹™PŒL{O½öy®¥ÍsÜIo¾,#Ê3…Ñj´­Æ¹M}nZã\š–	ÌJ³SM—»ßÚ// q'áhA¶ŠÊ-”f[ÿ(ÑÃ–óGe+Ùj§I7óZ"Q,…9F";3,uÜB¶^³¦ƒ@Z¥Ju6àûæúlJŒ‡O\Û«1½â}1O?Q–ÃWë=ÅcDi,pãÚßèjý£)Nã…[Ôzá)ñÌÆûnpN9v L`cÏW¸‹bÆ~®ånò
š‚ïµ	x“éŽ—O6–íV«ÊcË«'Ë«[¥½­6î­jIœŠ¿	ý…òc——COU¿ÀJäUÄ)8w£®ç»ä=Ï=\#ð´ÚzWƒÝ`õŽ¨`’Ñ$¼±èòËEÛŠ!~¯¶$ºWF‘Ð} Ž.Iè‰à¶çI­Ñ9^r·kòspÏ	ïF}oïˆ\#BlaËK¾Í¼<o#fˆ.ß¦GdtØâ±†¢"OˆJTñ÷Î¨k{”móÛèsPù»(“"üÙI£;Ñ¡oSF§Ô ßmv\øvSþš^:+1ºbéÍ¾—òÊEt4ðPI»6É£KÇõû…ú0Ùë©oào%5vtðYú*R<_’kÍB¬v´klF¹Z¿•ÊÅ„/ªM¨åût5-[Ýúl_wæè2Ç J$±h§ ŸÒ-¦H'­81û#N¬÷XÆX¬&ƒ¡]8•MZ,!õhK/ìù£¾›´à=ç˜¦šå¥äå€»Ei`€ËäQ©bðÂÒâh§5H`ÃX`ÐTÝ¨e ÎiZpUã9dÑÊEKØêŽ
 kã¥Çrá» ’®ˆúÇ¸Á½…-Dy )–ëgšËºÜí,Nü8SnÃM±ä•×±,0”ºâ‹è[„©ŸÚ¼ã²d„Ì˜jüE=–UŒu]]ä…³ T˜Ù0²R%<Í=c}¸Éê–4ˆwG£2@2¤ãkBWØÛ‚G.£«î]¸Œ,¢/žI
D’–DÂ‘1&R8Q~/DI~Íé¦+ý5M*²ÞÀ|ËÌFe™7$l…ôîeéYI2CÖmRueGÔRNµì¯«e8=û{yÑH³5Ó1²ÌÓ½ÜüÅ|K˜ñcipy,‰²“L`QIt£SXÖp¿€9äUpqum‹·˜ú4V4 &ñÑ³2cˆ¢btª9Žâ¡/iö·0ËÙ'7Í_@¡ ³/†õªdò»"KˆMk	0eæ-uÀà/ç¬èÁb0Ï/n8ïÜÞA7z‚À¶­ÃLÔë¥Ð%¦}Èþ¯g0+ŒÂeX›½*dóØÔû¢×Ìe¶º¼pHEaËcÂ¨¯,Æ•Q·†±û:Ðétà÷yÃh)CÇ/+¬ºwø™;ÃàÜÞ ôÿWØ1Mç7ë=†Âü²`cJï5ÐÃ*èdËY½^ªw].ÍÎð‰¶¼ô…£×*„rIYÊ¤Šr/×2¡oÃJä±8]!:Q€Ñ¨]Ž­”LÃ€äT 5"µâSÎV<'nóß'L  ¯"!Ç¶´/žéoy!Ä!A¨WíÃPJÔR¨Ï*À9j˜ËØŠéÀ¯ú9¬ËŠx‡cµ€Tù”³Ä,{%?YðL3)©R¬É¤òÎ€eÙ³¼ü)CˆÉ²´bÇQmÌ¬U¦-ƒ‘ŒgàýF€’ûr_lƒ¢¢ªá™ð¿ìö7%'«mÎ`'JE-æHÇ³xµÙ±PòØ+6µíÁŸþÝ!ñÙÌ¢ø4’ñ½ÓÉb*Ë‚åÓžÒÂÒ)'"°™.ý3Ì’Å¯^?*=í¯Ê|ïØlï{Žˆ©5Ñd—çMâžšš%M6¿UÍÂ½fç¦<ßÇ¢[£¾5]ŸjqåÂ
²º¸p¥Ð½e›ßØ¦üL†*eù¹“á*Ùã³¹šöÍ“3øêÎ¹šíaj‘b#bÁ¦¬jè¾Ü°_æšisûùùd;“ppbƒ ÑAÔø ¶Löz1Um„„¿F£Þ 8¡7q3mô#(`–QVBº8¦@ifNáVwž»¢ÅR,iY°î?²H@VÌ:“çl…™MrÜ*d§½¤ÎóÓP¹=¡›‘É³ÞÉ¶(Ð>j]ª~xO—C’˜¹\Õ€áq·OóšNXª†MÙpá©[Œ”.è;ÿPt‰Kw°mùG@ýpiwÀVØRòÙE¨
íd}Çe31‘:K%~ö#^Ið“þ1`h¨òQ_Z:*r‘
"Êƒd
bŸ¾¦p=OÚ#xÚ”m.[é†ÉS£–u»ò"íöXJƒNP)žF´¯ºWþËNŒHQIˆ"sÌË!!VÂDð’:Tœ’*ðËJj’Äˆ¢c}­±êŸh!L@]N­	¢€mÏB¶kï…QÌ AM?¢Pzáw	Š³Ñÿ¤‚l5txÈ¯MªÇ%r—WhWÄÙZ¶J‡v‹œÍ„T$÷™·²2fJ“‚Îw$€µ‰@$ÃÁÙz¨:´ëgZ§L3·Î>=b «Ÿ³ìŸ .ééO‰~úÃ^}Â±IÓóÓ_)àïÁP¼ó§¬¥~Æ¬¡Ü­æ”¯nrFÃ,$š—Df}e±ÐA‡GßO8È¹&*ÜX9S7ûŠq¿‚Å‘æ§ƒ"ô¿Ž&nÜ“°ºrÍ.3ÃêÒ}Km6ÖÐô¯Oä$¸õ]'tè<j@ùódy•M¬‘ùo˜‘4ùõrøÛ-1ýômËþÎï‰=ñ.ÿ÷²#Ë–›Å’&Ú‘YUlwŠ¥¶pÕÕ/n$*L^%wÏ>}ñcQ:„^ü°XÔA÷ì“ô¢=«£ûEOWÅõ*¡ƒüøˆÿõâG·-b<ˆ¦þ=4a]!÷¶æÀ‰¨´÷I54{Ùp¡™zíùýL¥Ã_®L4¸¾²ÙhåË‘×—++®‹ÊLƒ:[Èÿ9—ªWƒt5¸fê	gW$tªøGq¢Ñ?¨Ê‹‘ã,ZÒÓà²¦¨QŸ‘rÒl2ü„î¥ÉŒùn»¾/%õ¢Õ#ÖRE‚«±š×TT%ÖÐôbŠáKÏk]®©ÇÃÕH³±Žb
qÆlP¨û¬š\V§jqúÃv˜00Î´³0áö 8ÜÖÄÂß"“1pñOEéykty]D²'128ECÃHdv2}³¤ŠBuOuµÆ{-òUmüf™ƒˆ„†k\b¯dÜ"çr¬?6mžßª˜æ§ðá•Xxw5“jÜô)¸gû±7ÁæIÁ…<0ÇÊücƒÑgÿ­.ÖBâ*É8³ãä ²÷¹°Éf> ©!'pUN	æ¾L	¼ØÉŸjf {Ý©/’Ã¡n“ä“ç.Œ-7Œ•Ô_†Öa¥°J´ˆÑ(e¿!ØÒöë‰Pæ”ýåJø.RLšµÿbóöà?<¿m@j!Î²óù5k-U¸ì™/õž–t
{6LÖR£|¿«"N‹qVxÐ'‡í=—Åf§N‘ô0Ò¹:É;hSúá—t5J`Ãè¸!N°%‡“±6n" šì.*!‘¢Þe™¡ˆÂ¦œÈFŒž7T†ãK/UôßDœ™ m…eÓd¥¥lÙhÖúqüÂ&µ=gn=¾-eœ²/'Çˆ8¢cm‡$35J·Óz‰úS£õË<sk‚¬{ç6­þ¿M‹pêFJ;Ù—Õ$š›ÍÎÊÍÒ[ÉgCãeÌvÆ´_©Jƒ‹E¤¸T*˜8¾×›Ù¸^dc‡Œ€+˜²–…EŒw‰©ŠŠ2…8U€#¤6ì¢$E:yrƒ×‹ÂæÞCHq8ÌÓ”ˆë‚€_-ýÈõóR'Ç¹ŸKb~e‡ú#1=P.ØRK	d•±Oˆrœ-;_H6¥Ì{¼`QˆüFÖ.‘_Í2³°L±QÃ5aÃÕ˜¸ájDàˆ”Å¦$×ô2ó+«}ZÉÓ°£Ã[”ÕŒMˆ–µ‚NWÌîÿ
‘—1“qª„Õ01¿2²ÚÎÈ)api–àâ*FÉWšRä6^,EÙùeKoä×¤ñEl<Íè{Lêƒ¶Q¶6ÿq<Ê¾˜¬ÆüÊGC.T‘ª…š&Ué‘Í»	Y_ˆ±q£!V˜Ë\…^ûå„)–l€˜ñÉjCäïP½åÚñë'Mò3ÇC”7ñRÝäÅ§_fýN%	3kéù}I25£yAi™è)DnhÌv6±¶Düg7¨¾4”ÚÉÊéÈ_ò¯êÈŸHCe½'EkÂ7uºÕKGŽO¶éa
9§•ŒÓuáÑ¢4{BrÏç€yW+»è˜Þë=v¡]žÝÀUñ®Šºei]"þþZùç
ãÕÞë­Ð‡èým -Ú„nÔìI˜f)®E¨OUàøù¯ÅÖ‡ó"¡ÈÃå	ºJSËåm/Cû±Ó÷è¤·Ó¨“½8
5l‘ÐO©úï3‰ƒ—üÓðœõ²h“dê¶ueqÁ×P½ÒÈ¿Uù
¢LdÊ!ŽÝ°ï…ûïe®áA«5”SåHc7LÒ.E5Ök¬NGzW*äIH)÷qJ©Q=Êm)‡ýœoYÖ¼Ž=hÇÆFvÃMz±ÇËƒ©‘õV«gP`~Ùcü"ÓvüaVØ²#cÕ¿nüô|¼B§j¾%VÓ\Q,ßsZê'!wFÝÀK¯sÉw«ßuÒ¤%	úkUÜg“u´Ú^>TÄ§ëúª3Sé•[5¬Ã7³Öýcà®mB×úŽ¥L!¿²šw½(·éÜ…ð²I*Ÿt’¡ï¥­ÙöìÜƒÅ‡dÂ„lmGá{Ðz‘SAûBfUdÉmÌïœ’kÕÁ€îÊ]Ó­Ð=$7è*´ææÉ,x)ÚeÏFà=<˜'ÁChŸ÷$¼¤½…ÄM·åaµ]:¦ïxÒ¾tœ<²6aIr°ŠR|wco_øP¾£27ÆòŸµÎP.À{ïÙ‡B\^_Æ‡|¥¥ºŽ,/._ž'ôÿUöÿöÿkìÿ«YåÊqÄ;Ïm;:É7ÆQ'vR¨zÐš;Ù _äï7#FQƒ7Ïo~a[é«³õ¦»ñ`ÛÃîÿÊnüÝÁÙ'áþK°õ·âØ9ê€„Ý:&ÜÂ²F––ÉÉ<i}0O<Fi-|“,Í	Û·3tú;P¶¯µL	fq6Ë´ÆæAÁ%‚“>;„þúÒsˆI Ç^™ª.$cÄªžãGû$ºáµc/É+ÃtQ™™žˆÊ¾àgÎ½è†¿m¸Û² üÎ|·†¨×ÜLzí8Gî	‰n0o¼H„AIUc–¸¢ûá
ø^&fæ"çm/•UKå6<^@“-¹ïî¥by¡ýØuCFb‰{T‰ùü²ð(k\-¡'Õj¡³†ù!Ô\ƒÌTÌùð"f}©•e›¥úw‘‘]xóAfµ@ûÌ…%X²¨#ÕÀ÷mJn*Óîå²LÎÌPk›À¨zGÙPžpå,Í°	^rjÅ]…6ñI¿Ey×Fé¼Âèz@†áÙâ@C}„ÆÌšÍ²_…ƒ„7!ô’Š¤Laµs³Ë"â‹Ê“†–A,Ti
ëQ	ÁKéABþç¿ûÅ˜-*jš4\³Í=	'"øÆamÈ„1ø§Ì—ÈãÌðqž‰À`zzŽïJ/yöQƒùm²&}+6V´á6ÄûN‹æw\'î§S“ÃˆM§Á4Ü;?ý¥ÃÓ5:N£°côŒÚ…Ž“¹–p ·.¸&¯Ç­j¬U»$%¥(,ýY”ýë«’$XËþ¦Ì…ezSI†%VdÊ³àhüoöˆ>(…Û«}…»íÒE‡1ad³¡t½C“HWJqTáõÂ+£5Žw¸Ã]A?b5—Þ:û‚°„i@OÚž+Ä›Üp 4½fÇPQ3‚bRà-©š$1‘BµÑ7I	RÊbVDü±Kö)UÇå,N7‰üQêPm©ê”FÃöÒÂ2á ÊlØY„UU¬­#ž±á´™’Ü>dÐ~kcRÕú·K7lÏíß˜/Ôa!Ûy”Š‘~†è:O@\ÌãCÂ[aúeƒH/aÃûT5ä‘AZ‹ÃRQŽXQvE0$ˆºfzSšpCË,|ÝÌü+ÝL,qÓëŸV4R¾1Ìø—ùek¬¦ÑKV!ˆ›„#c GÆãÁÃòœ8â¶$º.i´é|¿ëÄE8Ç2½‡*#šEÙeñuoD1˜â«\	‰2èv™Aµš¥îŽºÃâñöÇÊ+Á¢¶)0Û8â6ÀŠÞÉ•â–¨ 7hÆ`#mí9~â"C¿IÐ’2›%d½äsic”mˆ¤?âÀ¨Œm0+
 Ü@É"È%ürTÌ†×2„<|xþ&™•ãnT¥¥€»-‰ÉÑ`ayqßÑëˆÇ=ÕØ«d½»æ_dbž¿/ÿ-Že5ûJ:ó;«³8"˜fê’Ì·Ž
¡°=*ŽÝ),|u=³£ˆÍûl¶å¼W~ì×òz–*_Uè9nÒâùÖµ<‰BÛDáWh‚ÿÃMªc¡å8Ëý¾lŽ”Cö¢R[sjã×à2ÊV«¥‡×”åXcië(Ú›¼ñÂàòs0¿ôvâPRí%	™§^=–0ÖÃe¯0(Å¦¦BnðzaFA“ÿ…!DÖ¶à“,îøXIz{f[`ßØfÿnRÉZ<¤#Ð¹-ýJŸkòùº.Ä'2ÍÙÝöâžlšÎ?w7Åóž<J%·{²uhZ3‡çÆ±»ª:øåu`ÿÑ§2å2ˆº‚ô*+ ½2±ç¨^¥C\“¤5Ûú=)=/ùÞxÂÕUæƒš1VéÒšš/Ë4=3Ï>jNG/Úáµ¾ÐEæ\Ú#Í–&	Å«v£2'1Û¹!WŸ Þ¢$ô¶— Åþ'¥ÚÒ	I`¬½§„Ê£t•ä¬ã•Ñ'èGùâEšõ¡ÆÀÿz¾ó@¼Tæ&JqwÃ	:TEBbZšÅLÄí675@É¬ X÷Œ3°;‡VdçDä@JN:s0'¿uÌxNã—šëÁqFFP7¯Ê…ae#TÝ•gì%Ÿ Nèð½’=§Ï~&€õAi³Ü;p¹,—&¾kmJŒÝ5‹Úc¯=ÕÐ=Þp&áÐ–’krm¤åm'COïôzî0uÂžâ~u˜Lì_D•Š¼Ål:6I‹÷±}’ƒk’oXÅ5\»1”‹
éq-¶,5HÚÙËX[4~‰*‰D0 BLÚòEÃ.RØ›”ýO;¬p}°R7R©<ì¾ë€1‹
È%þM†RM¥øÁ
Þ"iÇ ×àÔ—¶“R
6”7	û)-d›Ì$pê›È	õC×„¨ÙþX|U®?ÿÝ/ÈqÎ šÀ³ÃK¡lüq­ÈÃî‘j¥„ãœçm0†¶É*ƒQY¹bÔŸ¡Œ)¿s¼–ß˜W·¨Þ:£õÌ ÍóùÈ¨Æó†÷Äí·–æNþ;rÖñ°ø
ØD¥¹"+–MÊ±»¤d"‹“5hªGB‘,?òµ[·¨œú!+×âÍá%S…„^W˜+B{CtÐ¡{ázòEoìb±›—³¦¦»îÛg¿yño¼5>~¤Xä2®÷Òq)­à+³ü9bÎD™$f¸øÊÆ¿Tô€e7Ç0'	ËÜL®qyW!þŽkÒh/SÁB‡-ZÆ"Ôë}¬be¬“±‘ïR…ê™[sEüT|xki„{0Ô
†­u‡áÒKØ§½ÑùéGÞ…Ä<7’é±X³Z†£tè5îÇ’x‰~5y!2Ñ)YöuÃ¾²®X®6–nË ëÆ°Ö¤^ šßÀ…œÁ0JU	T¯ûë–*$YG~¾Ê¦qüö3^ìåÙ`fÑØáS7Æ5Vßy[=Ï*2Fqä7ÓßØ6f~úSÙÚ‡~£PÞé@Sx¯Ïa‘„œ«¥1P²éW3TÄf,’œE™mÀÇ¢.¤ƒ^$.=ÔÚÑ(l™—Lê¤M‡T(Ž3¸9¸’ô`Å	=];áÑ¥ã»N:è^ØÊz‡1Q%ò6	>ÍÚyæ;ŒVQÈXÒ¿—±=KÑ1’&Uh-T•	š}*n‚'*·ËÖ6ƒ1¨S³¹^
ŒÌˆÕ†5µíGTœÓ%bçÒ	Òºêê˜@ÛØÔÀa”Õ(Š’.{W*e³êjßZÿ›ž$›"Ð(tþ°ÊyW—Ù¸ÇñßÒóÓŸPý¯€Û>?ýç{o’ç§ÿë‡æä%-¸C~§Ã@°?XíÉÀAÐt®6öJJ^ƒ*„F„Ž?Ú1d£ˆ¾+ÈffãÚU7ŠÈV?!-ºL?¥ËÖ??ýq8‡#–ž“e@7’i{Ð~].FÉì>r¢ÝpYö
—Ùïàøø¶—¶£ p’Ö^—ŽmîDHUáà}üFÖ?ÿ¢•¸éÙÍõ=üÿ  ÿÿì}}oGzçW)¾å0ÖÌ”¨‚’ Q’-X’}"å8QŒus¦9ÓË™îqw(.—@þ#ÈÁÙ‚»`Ä^±È‹±‹ì‚±—?(ø{ð>ÉÕóTUwUwUuõp†¤dÍbeÎtuuuÕSO=¯¿GtÝ=|š+ò~õþ9^°Æš¼/Ýðú®ËŸ{ƒè¯ÊÏéðj¬ÉŸgÍ_ßái¦ižÓ5QE–žÉ®kòqÖ|fkB2˜âJdÎ/Ï‡s>W&Jû>ÆŒ¹®ÍGÒÓ]|E0ŠÒc¹,ò¾m*{Õ’Ö* ‹V½M.Ç±5T×rÕEÃÖ?s+÷Q¨2d½xÊý[+."÷ÿ.6^þ‹`ù/ù1–ÿ–“ÅB}ˆ‘êé8‰Ôj÷  âúí£o#ÒÐ‘7&_Œ_¾ ?Ü$ëÑ`à’`‹
,F² È®<ª·¨“iU±·dâPnmšeev«k’j!5RNûÑîÃ^ü¸ñN"µZúÊ&žêÐh®gûŠoN“âdÛ„W,ƒyÊ¨yZê*ªõ£kÖ6½¸ç†o–…ÃÆz@Tc˜©ÏLÕ'ÞoàY–i‚Ü$kë}ÿY…E\xé…ò(Púd5»åN´ºÝd3élUŸ+¹ªZ‹&>OÔ5K‹Î8&S
Ž°‰²ì¢HÃ²­ªÂÒÃê6*Î§!qÅÍ
¿NO”°ëÅ*¥\lËÅV„e…ÙfÿøðÒèQº%öƒƒ}ÒAÖÒMÿ‰ðe&±~™n.z „˜¹¢8 Øºo‚Q)ì}³WÇÊ$MGƒ4;‰ ôìdµ¾´r«cGÂw'Ep`ðRVÂ[‹O.àúüd|(uÓð[)²ð>cÁ±ÛiZÒ-¢iA½¦M)2b:ÀrXÃÕsVäùê+4qþônØ=9yòNÎq:ºy\â{NæÃ=éÁ•is|¯Ë\ àŒýáwÇ‡/:î‡…3EÊú»Có©PbÑ
àp‹ÝPF©7€	KÜhÏÉ˜°Y«S${
=cÚÛ8>üšQÞ«¯^Ô©‡qõ–òô”×¡÷ ðeÚÔ·^»ã7;ý~çÑÇ{Ç‡_†¼à[:ÔÓá8¤”øÌg@‰O&èúM£Eä†oI‘*Yâlqýü‘¡»§;:1EÞ‰ ý4í‹ÄÈð3wXì^ã“G¯¾róâà°ÎŠ>-ägIºI…ýg~èªÊÔ Þš}¿qüàè¤½^g{}ZäñUËËžm‚•Î÷Ç¾—@~d-ÂJû“b?èîÓ Êj¬½¥³MÇŸ¤àÔTËM½ß(%½¬¤uNã:²êñ>²À=¤%„‰±v›\°ïêkHe_+SHU]ÓU^tŠmÊk¼Î©&vQ¸•mº,Wƒb?]áo âI‡]ñ»^ðÞAô4‡1”CŸ6— ×Œtƒ*sw¯ï¿SÌ_°¤ºiÊÀ3Ò0¦tž m!`ã”Ý¶`î¬µá¤2\+£C]V`k="Åy‚ÙÏ‰Q¹œ3X§WU–a­Àóþ†J.b2V-‘£kcã	#=a$i“.b‡nÉe–bãl{ÎÈo,åØóËÅßõÁV<w¢éJ»$7„Vj€çð†q´kuš[*…—0¯yý€.|§îß[êM[Ë`ßJ t zITÐ€þ™¦&oÀ¼€SmkëÑ³ß’[Ýa€pqôÏN2[<@&±øxµ®»*oC‰¾ZÅù’àçÀu‡ÖFŠ tµ\6
RJ€+sòƒ¯JÉ>–râ ÂDåÛãÁÎÊ{SóÉlñ9·Ìn¹ßM 1sVic3ö’~˜¥®R®¾„\ýÓ£ß{Â€Å4†˜ØØ¹=¶¨±ìC;Pcb–K_c9ÙRÞj¬&È SYÃ[*×nÂÜôôhœêRRîó]
¬âÅÄËeáZ•1 s…5ëQƒ-6aÖŒãÁ«UX«ÇÑ®}Gˆ®Ô™|º’sÏ¸±¹¹ÖÎÚ[Cy&âŸ#ºÄª”’ÀMidÒi§ïwv¶¢çõê
Täb¥Òê4X|^oS6
.åûÛ¶Ÿ\ÈoøÎ¥!‚m’« |œŽE%¤’ü…lÔP\£#è@	§jÄPjâ?ýÌí1•m*³«BæÜöŠ5øQÚÖgÉñZã8‰âæ(
PÊ+„=®h¢íd[å„™foË9ŠýgX?eJž¬’yñ4rÿ˜¸®hÕ¢×‘Ä³&@ßx%kÉ®{IgÀJèÑ×AüáÀŽGZ/<nÒÈ±;¼‚i“M(a´v+¦¢õ“Q9äPÂÄÈs´«©¦ÒbâDV¯%åH(Ø6ê‘›½†ô¨aÿÐùÐT¸Ó÷‚·tdüÔ§£CÄFEy£×†ä(TE~sÈ(‡æ"gOQÛÂFN¼Å¹¢%aâñÃ®#]¡/<¥lé—ák@Jzj©Î‡SÔ^®þ¬†ð_Nô`€ú¹Ê:*çeÔìWr]Le*ænlö½ˆ¤tvzä,j«ÔYýeÃºu÷Ìb&	Ë»µ´=Ó`öaÔ-ª¶ìûûwîÜ‚¿:­qâÇw‡^0ÀýßZ€–7°•=n%”-ùÅdeÑÚôªFç	ºÏªjfv V‘4±¦¨Šag0¦lª:‡‘áè"í‹G¦
g”=sÝ”müœ5åÑfÅ¹ûôÉ{dé€/:ôhòILò¸ÜÓŽ–†	lS²6Xìê"»àõLdT8™YA«ß‹£ùi«Õ‚¿/ mÁMé¯i]°>yÎ  frˆ.yì7Î¦+„SqKW½#aW•wÞæ:[T@s‰A±ŸÊ"6nÈµå:…Úr¹¶œs¹×ÊpXy"«Õ‘k`uêÖÀr
¤pœyçÅ	ëhJM¼kÙO,¯‘{Á¨ýÄÛöï1 ÈN™a?"òãüB^¿iæÓ%Iry[‘ «ÞŠ6‡äwÆ<˜y—Uø¬‚<ð§«2¡’ý2XQ›“ÇÙI/‹v˜^œÝÝIú®ä“¡í:6,Ã
Ì¼Yž&ÏiO1dF6?ŒMme°Å7áE-ôïškó´6ßI_ÐaU—„àÛ
‡cÐÚA&Yýí@ ­QAÞ¾Ì’º™]v²/ÉÜr²¾µ¼ó’;j÷~ÃyÐX‚e¡^y ÇÒ §EE.ºÓJ˜$cˆ-\”aGWr‚UP”ã´ô€t ü­˜VÒl²TBÃ`²?¯Ÿâ$–Jïåz™”¼è„<cìØ$ÎvðJä%jå9€7K
+Õ(ì81ÖìéN6Ö†Èsôf4ál»:ãjîÛfÖ×Õ@îÍºœQšv)æ§]3
)"ÜÌk,¡2ö9JO5â¢Ô_t¾2y~M­UuXW€…Õ®£4ƒå¥<¨[Ãq%ì: Æä£MSdó>Ã p²¢ñaN´}Å²«V_|0è×¤
É§65º(C>½7‰ö÷V2iƒJG­ØÂñ™Yxy¡õ³(óíy”¡æHSÝ¯|™
Ýó_ëv~†D)¾”39êQBVÐƒÈŠ$Âc•æH
!Ë×íãq.˜ÃÒ¢V+^oÊu&Ü©/ 
ñØz®Šyâ.$h¨|¼éFtUvÊ©(Ê`ó´Ÿ	«kœŽ-HgÜqÌmãÆi˜,g¨–ÉF¤ÝU{™Eþd‡•V³ ekçÆ0!{¡t¾À›ÌÈd]?^÷€;ž®FOFnø[÷€‚¬;ðÎ‚ÔÊòær³K¯O9W¤Ý]A¿YšØ\1rÃÕC3%> L	:¾.ý:U„˜ád•Œ<zrÞD^Z6qÒƒ“ùí¿hµ{è1ºÀDõuž4½J
;Ñ½ƒG÷|Ô½z¿ÛÇƒóýÎgApFµæ¤Óí6/Õ©V™YQh²“B[ÊCš9«3Ÿžæ4¸‹
NG<vy~¸C\ÃS@‹ÆÓ,\,7¡–V”±‡F~˜Áy²"é=«ÊB „E˜ÑP1FâÏŽþe±y¿[Ð€Ý¶º+Ã©DÌÊó¾‰äÕÉ«—Y‚×„0tÉÈÞ\ªöÀO™Ÿõól‘æäLÄ´ïíqûMâgº
‡¯éDçut&>8K¼ã&=_Ø!ÙlÂ2q—(^Jbàül/xâòé“ÄÉâ™¤çN›´¸#Ë°ódO.h¹jÔ9Eµ	“-Ký…™vyB'5ýtÔâêLú$Ë£4¹ž•ØØ.ÉŠªb6F^xÝ²An’¥%z/-”Ô8…8Úk.-—¢×’ËÑïné·dÀÎl%›}zóhF8©aÝ/¦Úg™MÞ½(JUŒ 9>7¥
Ë+z«U@k6+¹BòRyY¤„Z)Ãd­ÖÏÈ‹­¯Î,dC–BeA•õ@*½ú€Ê"T§ìŽ©JÙð:TêŒã9-ýFÞ#ø.|ú h.\ ‹ºŠÓ(È=³™Ê­kÎŽûZ“T
u€IËcElóVYiäôŒJ®²=Ýº+ÀUÎnÈu2“éª–´¤¡À³ëDKÜÕO…¨cåõáZ ±ŸŽã,…®U¯óþðÚòÔòH™êùÃjÅ³°$)ÉTøõrEá×ËåÂ¯ð“£%[/
È9¨¢â*|ìUWÙ³&ØâÄ¹xpcŠg9oÃNXS3Ãëð{uwš¨â§²L©•dO–®@#(ftw{;è~ØÙ#´i¡ŽÑšt7÷.Ìwè±˜Ý¤è&d¤}±O L¥S»˜×	=k€ZŸ5yè…^Ê<¥©c-¹Îã5H&(aqð’òU®·Ðâ¯r°QÐøŸòÕ(ÔØœDà«æR¹.3]ßçèZ<ŒºpþG{&ha'Ù7][Èo‚Vðßòuðl\ß‡õ×>Ž£í ,iÒ—rË¾—|ìÇÃ  	˜ék±uê-Òon•{´éH½1.E3Lõ„›U¢2ì¶×Åÿ&ƒ ÿhnÇÑŠÖTÇ6/åÅ¾WXÉœå¢T]¤úìÑz‚/óxÅŸc]/Þ#¡÷,èá©èÃcIïD[zÌš¼A†ÝÕQŒþm­ÄÅjôf•¢eÜºes…Þ*¬3§$jSAëµ{”êJ®ˆ]ºz}úÿ’}Ò s[qÑúK"žTe/¯Í^ø`Üù^ð#™\¢Ìb"pC¦Ø…µvÿ¢qF(¿‚A'×÷†isÉ\ÃšjOÄ¶£I#×‹c¦(ñˆ<;úFÑšyÝ¾ï§F4@*Ÿ	iÒ]ÔZÀ[¥þ›\o·¹˜dm{<—âweGãÞÒñÝËy–nvUË‘ç£çPàzªàR±
KŠÄd®J§bdÐèŒ½kV*bå3â/a‘—n’ùl×Ë{êŠ¼»¥w°õ%"âs%Q²Cò@a™–M}R7Œ»¹ÄÆc/.‰a£¨¾.oõoÙ°AO&YùÍf›ô5§LåU¦CŸ	BKžK…£lcC„0¼p}"}õ”í‘­ãÃPxumJ5ðpß·°“sÊ¦þˆŠ¦ß(ÒÃ§Z$f­6Æ”8³¦ù7S{›ÍŸë,JÃÇ&.ÃÇ®:`aðÅØßdí¤/úÖ.ê
|b¿G÷%mÆÿÐ·ò²Å -¥/úÖÛAènÉ·1ÏÁCot]¤ÚZßæF‚ÉŠëã8ÝP$/Šïú{¨røÐ‹w|ð9>¤»¸}¿ô“þN¦ÉÝ£„>eÿnG±ÐïÔ_]F‹a€Å!ã&Š¼?„mFÇ¨Ì½þw}ô¼¸oèÆxÉ>©!ÓjAÑÍ¥½\96C§U-l«Vºm}ã±vºkú¾¶Qglø_]w¦‡°ËTÎ;#ãtÂ•ÖŽ¶ž-•¦ôvªÆÐó»™FÍ˜ Æ›åú‡¡úåRYÞÐæ_š²^jƒe®Â*Ò¨xT**xü®­,$œÊŠÎeNö•¢²Z³¦³¬Ä)z&DÌdBA
µ\+%>Z‹JŠ×Ëj©”’Ñ¨0Ö¾ºÈTSu½ü¼
<âúèÜûœ| Ö¯?åµ@Oí3ø=hü7ª«WQiqXþÝý!ÍfC¼ŽãÑž_~¶ÈGßÐÇ,‘Ÿe28ú†Nj ±`ðü_ò.è#_ÐžûGÿ›¶¤"Gÿéã]ñáÿDp/tù"ÄZÒ [Ö50BîWF#/Ö³ùÀKRDÛ­[îZpXÑ-ºCºq4†¬@|íp|ÄŠ×Peã¢¬Â¶$l71•ö?~ØÅöMVôŒÆ>•Ùƒg¼¼tŸv½ëP8§ÔM¶éáH¼­$Œ©¶„bÞä]c)^C¼¢(!<6`¨‰F^'H÷šWVæn8¢ŠßJòLþ¦jºù¢ÛÚØÀUôÆ±Ë¬ÒSS'?©\—cUOº7I4çh›è®âÁš 0û˜´Õý]‚ep5·,¨8%í=úaYT€U’ýQåÉªšÁVË±\Ò_“üNòªÁém+cÁ>`¦7o=nêÆ‰Dë3ã™ãx µ>ó‡—ÙG¡ÚM©èMû2H+Š…YŒ³ê°7‹ÕÇtUé "M_±Ô2[Bª˜Øƒ Ü1 Šy‘U’ÁÍa‡KöÆp†ZI´²º—}º“a.ÅáÔW¿9*@LAÂÈ©h©ÔbºHÏ˜Ye:xn#n/$"¨ñë= :ëµH?MGÉj»Ý:I‹‰ç­N4¤›;’v·Ýjµª†Â3²hŽÛì6ŸÄƒªHÁT(A…>J	Y}Ö‹
dÒ\ª>%[Ð:ãdU=Ú¥0XnFœC(øTjW…0zÛf*•fG®e±±vÄ¼TMB^Í"Hà>ºk]oU9™$³gÙ	’g„Ù&%"M8•ˆVp¾Ê²r5Ê('iæ¾`ŽÍ¼“•8ƒ•AK¥™rKxœ BÈ[	¸Oª´™E1²iÍ¢ñÅG^Gœ,9Æ³ÌñW_yý‚îngÄ9·DÇ)MÙc;ö“þú®¦´YÍw–´©°çíMñ}«ä¤êHí
IÉ^Á®LY½8èøŽ¨´Ñîjþu™»¹å¤æ‚?@Õq…·$òç~×.\Ô(*é\,ó`‹+]fLIr<^KàLs û=Þ4ÿZÔg$SEî—xcÒ§2øNs‘'åÏÝXrÒ2\j¥jJðC,<ðHrüòP>õQ(Tá±å¢^þ¶Ãþªâ–“zõ5Àþ¿èä%B¡é2ó„A5’æ"àÜ¹ÛXÓj:T—ÍhgãÏ`Úø’<÷‡sb¨[áXývƒ´Ï›}î³Àß]°Yª¼¥äœ’—Ï‚’)Ù€qëèe‡,s{“dš’È™Ù¯ÐF†/óòzLqë~Ý-ñGÕÀf0máõ/!qâÛ~ÿ±wpCÑûRÑ4kéå·•³Žÿ*$ñÑÿ¡ÿ‡çƒ2ÿ]:[µ^¶™
Ö9Z@vdhì Òbt@wB¡(‘Š
+XB`R7¢7†¹Eöèeuoè«†
ê,³[Þ'îý·GäÃã—ÿwÓÁèá‘~ìo_—'ù€0ååúÜOé~wæ=J¯Ï…Q4òC:ä0¢wøqìÇs6žÊdo~1Ó$çà0Z4Ø
®£ŒÛNÁwŸÓg†Þ@£ÊcÅf¸Ë§Ó.¯­µ½	©]ç}â·y¸Ÿiˆ¶¡Š}ÓþòØïÐ[¬òJUV2ÃÝ,trûŽlp +ËO¿×õ¹píµþ¥2DÎÐ`-ºj¶Ñ›Ì­$„øÛ:ïB.®xd@Å
Gss1gAÒs—4zn†áÅ¿_Íë¢[ÒW„œ‡q!‡Ìî}†Óîwmrr5<I÷èßÃ^Õ«¹¤3¬µû—*Zh½_º€LÁW6þmHvÀ5DQNTü©ˆ=™†rÓKar[v¤J±Õ5T­¹Þ.s_}9îØàŽ™ØO!3È\32]-ÿý2ðk¾Cù`ÉF Ü0;…"6JŽ™¹ fQGëcÁª(¯+ ´`På½²7n'{Í	
Cæ±€¼ºfAÅ°54¯‘QÜ¼ŠŽ;:¥×¬FBJg-¼T]ê¢r‘
3å³d¼”?ÆK1«óUÐTì££SÌD¤jÎÉÏ]fl"9œ5‹*¯|¾“íçSÝHµ.TçZ–Â¯‘Œi»˜šì±ù§Ò^4Å Ú9®ž-<ñÝní¤ÐŸûqD¨›Ž™KPhbŠM•…­y™`ünÑ4Úõ¨~W(4³´²¨fldëº’ÁV»9Ù#îÃ0vá³r­Ð[¶oY”ô‡[ô}…}x‹>°SØg®½J)ÿêÉ‹ž0¸RVßuB "&&^˜ÈH¾Ì›R99_„Ê'+'”OÊ†LvÐÓ1aˆNžÄ½<ÎŠ™þdÁ.ÿÎýïGÚhtœ•LiÛ˜-Ð`0bÎ¹ðèeZÃ¾&{®dåÎi™Qã{â•Éþ)àVy@„&»þVBéµÊ‚á"Ÿ™.ƒ—À$çºò"~<úÃQº793*#lÈ\ã’Þ/§éTGyih5S t@Àrù
/°=}·'EVúGàf«gÇ‡¿
XÄ×NËÇç¢ZÅòdƒ›8`(FÁé,¸ß^‰"—)U*8 GX~
/‡T=8>üÛŽúžÕÇ®-V‘ZêAfb—ô"*oFôð£KQØKé´ƒŸµÕ¹Xt÷å©,ò|–É4Ÿ=ˆ3±†£i±Íe+Ÿ\FHø}úŠÇt¬#ë¤—Xã.ÚûJõŠÂá\Ž6uŒJ–‡5–UsãáñË?Ð3jd™m‚1šµÀDªïèNàj§?fFãøèÛ€ìý3•Àù
Œ8-çË¨
¿€ˆzõÝ?Ç/ÿ£Ãû ûýû!#ØèÛiþ´÷Ä`ø“ý¸N8OÖø7»i$g’éC]ÌHDÙÌK>Uò\¸ÅòUY4ºyEZ/Äg]Y4Æ˜W¤ü–ž\Ifh2fá7(:0øÛyXz«l¸`­@q§ß|J‰q«;q4lyq3í¡(RÜ‹½-Âr·W¥Ÿ¶ TFº®…Ã>*ò?Ö9†89©r8#ê¾g6|øÝÅ<#÷ÃÊ±šö(;ììì¡»H~q+ÅèÿŒH\ëwdUMeB¨žRT‡;©¡¶îÒ%KŸ,ê”#›úE>h‚éXÎ|›O—GÏºøÓúoþŒ{[^cñþ¯µ¸²ðY¶MT+
g!Â’â Ÿ”>8úËGï»Î‘[Q`ù³ÿÑ¤cA¡ì¤QÐ”Ÿ.~f+s«~D±Í©v°Ôæ|ÐýiíÎ×è+çö‘X?ô÷jba
T  *á)LB,~/ð,n8ëÚÎ2ïõã8úí“ýA'v#u’RV³‡]â_“wX½(ÿ¸V}/°Tq6R'zù£Å¤ÜŒzp J³à†ã˜ä4h}¦³vGâ¹>Ó=üO¡¤½\Å‹·¼hã++%ËÛËžág‘lƒÆ™-½GOî‘-ÍÚôÉvË¥ÎEçU|¹&$[ú=	!ÿ¹1MT[zµîs@G,È;«­¦Ò¼oà¯ó“¼YƒoE^ë;FA‚‚
S3Âh7öFø¬ab9&ðâËìÛVì{;Í]àuµ_°¢ÎdñãÎðÙ§ >PZ68¿•y– ¾ñåÅwÃq­BXHI(Îb$P¯ ¥÷,§`FÇmÐÔÓ¥Ù‰Q\çtÍ?ûÒ~©ÇFÅ‡5w0I¼ä˜§â%ù‰{dÏ¨æód¤J=…ÜIíãAêŽ®µ+Ü!çÍc¿í†g4ú	îšü×nÅTÚy2Ò¼/†‡Hd{QJSi[üº”O†Dßüê„Rû,uKÓÝåˆª,ßR[t…O!éÀÚ"WiÍô+w}Ì†¬~öG^/!‹-·£”ã—$¾ß}^KPfÂ'ãÝ	eÞ	@+´ ›pïºµEÔ\‡¬A(™²©i±‚˜ sTKJÕi­¹uQsèèÀåÙÊ®JJhûâJµÓW|êì	=’­ÊR‹ ¿²_®E¶Âjg#¯«A/MªA/)YÆîKØ§L ò¹X‹:c˜/m±“*¶b×vè>ÐºgÙÛ=Í:ý¬ŽÂ8­vz­è’%ù2ž—³ßÄyhd3R³ß‰4fesÕ>LO¨5«º­R¢ORc³Ý²œ×çÔøòÊükEŒdK=‘À¤(†%+žê\RíÔøöÒâüdCX`B—¾‚Ö«yM7è	ÇX0ÃŠó¹æªõù?]º
L¼®V[_¯­¯ÙB¼§ØÍuŸ5!'®%'ºKŠÒˆ¥ÅCq„CŠRã)øÊ\c¶¬@xùÇL¸uùÉ}JÉXüÂÐ­¦zð[å)ÓŒ‰DÁÚÞ]RNbÇÈx7ú¼¡\~+&9ÐÊþC/í·†AØ0Å¡\ 0¥Kâ“&Yä|öm#ø¹O…¦%§8,ü¦yV/ÀÇ/½Æ°Ó|Ô)«D’~]û5Ì±ìây`Ka|‡ÛŽœVÐqÇÞÁ~òöá“U¬â‘­.ú«x•]Úæ	þ|™ÁÄ¶äÂ'Ë1?°‡Æ(öŸÁ/Œ´¼ç%(†EƒP7*ÊrU&F\œN¨ï&†üªŠtÜò±Ù§¶OÛ•û_1àI?¦STj‘ÊýªÜ¬…•Çqš/ˆCá„s@Úd«„020 "ªÓè²Ïýn©÷ÒÎ‡òd¹g¾‡Þ;ç{hÃOmûLQj2]ž@ÊZD4(_)=lÂR$º:Éx&ÆÓ¯ÒÀ¬¯Ñ°Á.±‹K¸Åº&Óªå!—ã^¬ƒ¿ðcÿ‹±¥R
?èÊ{LŠˆ;=úÅQÇO’æpçhDz¸±xÍÇ¬ •é¿y7
Æaïì^ž=_ÿþw¢àIØ›|
ÔŸÅ÷µöÐÂl‚@9ü(ÜŠ(o‚Ð<†,)„kü—ˆÁ÷£Ý¼õ¯Û“eÓA£‚ÉµÝ&Ç`’‡¼‘(gÛ TûˆîT„h8‚2©Ù=P¶ìi»ÝlA@¬Ø–Õ+¢ö±¨j–+ýôÝP†Ë†'ÈUoùKj0þ¨þÊ=—–WÀ‘{¥àÍ2Œp1t¿œöƒqÖ¢01Ï-øK!ÚÀAþ
zÿ¿¸	¥¡Kr%DªšlkZ¹#ÃãÃÅô—ß†ï¬µ¥îºã'8¡Á¡”¡`ÑÕó˜>fõ¦ñ"åñvŽ¾%aÿè×"Â™é·ˆõÆ±Úu÷øð;¸_À-æ›ˆ7FY˜Í¶y:Õ†æ…ã­af`jÞ3_Þ&Õ½êò›ÚêÞ90c?îÑCfNì¦2(D–V¥1®\û€jÑ˜ç“ò ó—¿a¥ÅcA<´ä]i8ÚJÆ0/&Ò‡QàdÀaSÆ°šm·¬PÍõ–1
˜§¥ÛvËs£l™á	zÁQ—oü‘rŸ[¾qL…	*t55q
au:´T›p %Ðú¤7tlD³±€åy†žàäAg”˜XeFY1[yu¿½ž°=sØs˜/Q¡åu â+;Èdl.µÕV†l}-‹¢[rD–cÓéë¢œsj˜ztXiÇ©B&XÖ#iƒn“ò^¿‡:lÌŸ%»v«Q
Ê°B•pjþ?dÅ^³ßÀé:wÁ-Èy%õMç›>ô÷ L*ã<~‹ê#*=<VÏ^WÔ2«.8Q†‹ŒFß‡h,sÿ¬Þ‹el"V&…÷j¤­Ë‡óó¬|ñ®¯{‰ßXhQs0îúI£‘Ï¶¶å‚-CØÃìÖöz÷SÈ<Ñi+èdëã<¸!þ»šÛHØ24KzœÃ™LT½²ö%~s©#’¬K{[—µ
ã›ÜŠSI€¢‰ÕžÃš8¼Ú‹m˜Œƒ4'(R*2Ú®À§_Rµ‡,t
ÑBçÂ™,%kr5eÐá…€»çaó	o>]l]»ª3?øáwcYJÿ	¹-Éå¥©ÐYúÖÚ J+ê:eB&/¬‰øYÑh7ü”ð0›¡Öc	§*õ6Hèâ>©8NAÏÅb:ú–õtJ–A§*ŠfÅCÖân¼ˆÜ]€„?:ýˆJå{ô¯J}1¼›‚ÓÕ¶²ÒvƒK'¨”=2ƒREzð"à“IxôÍ^‹¬+70/ÅÌo·Ó‡&›˜Hµ
X"+k;„<ôV…ºfVÖJ|‡jSF(|gÆNi©½LX
Ž{øƒ€Š©ÄW*ˆ,e±ÝŒ¤Ä'D–òmªœ¢Cç¯f3yäc[ÛvqŸ—+rfžç—^dÉ#™µeeŸrO•`fÃ.FˆU-Ç.fUÞJï ÆŒ#§ƒQ™W!E‡‘ItÀ×GIa„’‚ÕµÌÞsŸéÿ©NH×|µ@OaìÃ£Ô^ÚŠžk(Š}¨"¿ÿ9LNó]öÆø¦r²´ªaY°Öqàhcyb~—ÞýnBùãñùZÁ0ŒB@I'7Gå92ÓÏù¬Q¥`z40sé=¥[þ¾@`¨ŸY–ˆ?Hüi<þ+è>èÂ/ô_ˆ3ÇÙ²Ápå@Á¤Äª¦¨"Éhê+2¹µÁ\n…mã;È@!éi8 kGƒÞËOÜ×9¨žEó¶$›%C/§=¶¥fåØ9w£·
,”‹Ž%_·Æ±l]Û¥±…°ñýfÏ ¤ñÇ¨ùíf9t®Tf"rF›¥d¹OA@@a€KÖýžAXòs¯0©å×òBqë˜w|ðX±ëû@¨¥“ŒÉîe·V™†¦5=K™¥íÓ“å²¹¤FYTº5ðc°XÑw*‚,`í>|”õ~~ô{OkŠw[Ï¿+ƒ)°ô\„…‡qISÀ pñy3bSŸÉÎüòÍâù÷âxèo™h»Ã”!|‚"D_ oúÃïè%U´VeäR?£e›µ´U_J–·ƒRî•“®ÂEg=Ž£'ä:,'{àýÆcTK¥guØ”Ÿsp£HXSåì;0ƒ÷Ñ–7
'ê››TjªæìF~ß­$	zUÁ~ÇéjŸ"D©ïýÝ ÞáÄ<M\L¹ÿ’êyFZ¡Ù;ÂDñ:òädƒ‚‡ƒ	˜l|t>ŽÍbõIõTúäYF•±}£ÒÓPíeØµ!©2™N×Tª«0äéxm*4!öid²ŸïçAÌ&šq÷²œŠ™ÂÁP1±©¢l¬0yUÜLuŒFoÖÕ›.–W¦bº°/NÑ|QeÀ8{F•ÃÙŒÁ=Ü–M¸©édÔ8‘YCcØ(ñ7«F-»Æ$–ÅÎPä†'Ó†ÛC'¶lØ<hë†Å3Z²p˜iéäÖŽÛ;`T’µc„‘UL$¨0xXMpù”ÖY„OÏb•¨OÅ&¢Á”TP!*p,F–$HwÃŠI9]«JÉmç¦F©F%¸ÇÝwW¾á]x²,¾ÊdèÓôã)
Wµ;OiîæÕSnyëÜ{ëÜ{ëÜ{mœ{îÂðÌ<|À©Ï³ÆwºÞ=å‰çÍ·7‘wº/•¥7ÔËW’rÎÀÙWS"-oü³tô¡ :‰›ÏAÕ6|ëâ“‡zBŸ"vfž>`gæç+ÉÚVwŸb¤×ÎÝ9öúMÎyêøü{9%ç
O:u“p¸Ñ‰+¾á\„=,Ý.ø·O—I¨ÏÎÙ¤›ælÂzÁ Ÿà{š¡çiôÅ_»}¬Òâ¬ö1<eÆûXÚÈ·Çƒ±›3ËS½]°#Ç­7¼ñ;¼þrlâf¼Ç³M]–2%ø(^I2{½€Þÿ6¼ùcØî6þ¶/?M¶~ó3@ vµd*·!7ÉÜ«¯<.˜¡±l•Ì‰q®¨šÍžÇÜÝÞ:vö&æ2yÎ|F{Ë…Ód8pgÌjòEÐr›®®Ï
f~1¦¿€ò—nä!—ù±²!ýÎ’åÏÓ³¢üúm/íôm©Ðô\1&Î“n“ó%ÖíÂ™-ÙïxÓ¹ÒæñËÿµIÖ_þúlØÑæGGùˆÞqø?É¾Ÿ- +Ì:WÂ†
ÚŠsêPÑªCvŽOÕ®ñvþå~Ýù–•Àg¥6)+ëOH§CoVÜäþhˆ dYBD•`RAÂnawTpCÓIœõ¢~åÕÅgýÏˆ‚e|6œ
¬ÿ©‡ Žeà#˜}çè dû?Q!\*;=~ò´™•¬ûL¦	¤ÕÐ(Nà¤läç€Ì4 £gìÁ¿dìž)ín2os©ädB¤ `è|«†º­/ÜÐ‹ànÊt`
?Ž/€Œ)!»e>á Ê¥]Â@%•bÉ¢¢<D-<÷Kè¯YñØ‘­ìuŽ_“Õ˜•¡óG±ßð|´©­Ò¸¨o—Ñ{šUÛm^¦4|Y­Ð[‰K+yò´~@˜7 =ÕÅ{k½pzÂÐ÷M—®•ŒAÚ˜ÿ‹p~­'pûd`/Ždh˜»¨çÿß_þš<¢'`U!lÙêü‚Ù·Ìke¬uîÈçÅnÑÕ¼"&œ×Ð†Jès7öáñP¡]ïìÕûsã†ØìA‘bD·ñw“^®6‘#Sˆ:îR©	¨åNä„3é«UÉXTB_˜w‰Á;.‘áVõtë*¸bƒ,€m>â)"îW!òsðAW™'ÃF.J?EÂ`%e`b¡DÌ#!Û^Å‰½gAÏK£¸Õ#DôjíÆô6i7è«tKyIÚJÆÀÉlPõŠªÉ‰…¿þ™ž ¤&HÊxr¾3Wèà ¤¾­­G£=S%½aLp8’7²G`¿•›É¡žƒ-j¥I½à“‰‘ômÕÌghºz2êz“æºBì~§|WKó3S³€gyîö8Ày½ì¢*A’ÏNÕíU~t{§?&ÏP9Kû¨¶•ÌX¼¬•$ôAüê”ÍëçZË3“ê,bk$@'½áŠ…Ï·.ÿU^ìÓ`DÌäïá5clü1ŠÞžOuåº\BŽ9f¡D¯˜8Å&_Ë'´tzö\¢1s<âaÐ‹'äüVæ oY“3¬L3H…—yÃc;ö“þú®‰=¬÷Ç{XÈ
,«P1l¥[Ç‡ÿ0çú€î<þ<Íƒ˜uØš R»ã+TŒ»ci"Cz{ªK™™h&  Êè)ëú¾ãˆ0Ä™ŒH7A<Ô4Ó>*1ƒkðe`0åvJ¸ZU^1  m/PSÐÕã¤ž=ú^†bîFãýãÃoa3ýwe¢ì˜¬»YaŠç¡–5×9‹Fål”8m±žtñ|,ôS<.¥qSv	ómö a¡Ì‹Æ-¬6—¼ÁÜ>®ówTFúÎá	ã2Ç”c\œ­ýæÿï£Èí£_~´Jå|Å/|Æ¡qù@4"ø[g¯ÑÙ{¡r¥‡©âû§Gw‹Èë7ûx6fi˜<d–ßïÉVnÿ†qcÛéšõ!llöµZzÑ|øãV+‘è,#ÕøÃôajâ¢%<Mìßs–6{ÉØ¤w±4Ã˜‹Uì8C£“9Jþˆ·¢‡Iô8ŽS|Ö™LšTìÀ»…Žbë7Œ+EŽ3ñ3è%X­ÜQ4³ýH…Ž‰ÎRä`†­ÀÁ.YÄ¢Õã\	“°”Œ/ºpcã7Œ¡XÅŒ³g*:iCuh¾5L¢ÆÌùŒú¤338K¸=îöüt"~Ànuâ¥¦o/Ð¤øÄ$äîöõõ«/!,ýèò0!³ofrÇ.ËIÐAÞ”M_$ÐYmyöœ³ÉügÏž\à÷;+åöoü®?gÉ¸l´…Oüxu‹µÎR»àÓëâ¢EÃ[ùœê“qšL(rc4–æoŸ±jg&iØ<¡ÖÀgÞ*FåãQñYg¢€<üp“°Œlr·¤mQ]É&î¤ì¶
þ kW1¬L1ˆ”¯ZÌÅ¼i¸ñÂ`ù4£1¥ä·¾ „/"È)ìt’§ÇÖåàh	·¯C÷y
ÈÍ)x1~©&Ñ½xÏ,ÔAvú²¸eÔ?úž§Ç
ÕdµŒwªÍ]»ºH7[&æ¬GIz/Šé‚Ó±QþµÅ¡ÃzBÎÏèàO§iÙ‹ƒ. Ù:¡Ö÷U‡]ÒöM˜ŒÝZ±§é]äizEêa8µEBäÈ±ÚY¥ôNÆ£‘w¼Ä7©.tmÝ£òe×‹URÍ³É”-°ÂÀÂÉfqèz”_‘-A½Å—p«äº£ôwRd‹MÙô]+áî®¨ª¸›Ç‡ÿ
çÝ7{Æ
kÆBB°Ø¡¬ZV¿y-«,Ï…‘á6{»“ÇÝH=ÊéCô­spiŸŸR7æ€ÒØó‚¶#m­>Y‹uLß«ˆsœ6Wr
ž»õ×ÿ34!ŸÒ’¿ú
qîýnØdÉùmS]psE+”ãÔ™îÜ¿§gÕÊä…<$*=˜˜‘aMÙzÂ“ì5úPòËe1•°õEM¾ÒÛ¨\ÆAÿ§AÚ_†C/iPØŒRo ¯–èV._|lÍzÀ·cŒl½Ô¯”0ÛåÜ º[L´l€( µãõ_L]=tN¼ U=ßEí0x{5tüõ_Ú'!UÔžùñ4·º¯ó»¼Üù†­îúÔÖ¶ª§­,É•‘,ò«Ö×—é‚X($O½úÊX%t&K^½¤¹Ïªl>öŸù¡^¨ªGÖÎÎ1M<8ú#éFgÆÔ«–÷#XF©/X•Kà3~ì{IZ×Z’ÁK7VJâUë<»Š,ÃÛäià²á,Ëu“á•´Éà¼2‹÷ÌÏspC1_e‡»CÀ
5‘ntò€¾a¾2Äc½ Óv®æ.|†°Š]‘·AEÊœ•žr6ðäÉÃ)ðnç`Šbë7}›Ÿ·P
˜ÿ
Ds‰/üxÃ(
t:Ë 
|”>„‚]²P°­{NÃ'&á+™K×…­¿a\Å8qV‚„[Ü„ÄLÞÆJc%fÎmÔ'^œû|¼/"J»’@c§°lmC—ÝÏ·þµ•g»Ÿæø5Ä/RwÆI›”ž¢Á`Ë‹OŽNÆkÆ=2ì®2•¿ˆKŸcD´Ü8>üÞ“#^}•E7=šF–Îù)F›e¯ciäŠv‹Õ¥qbXF^³1õ½á…¼\hÃØé{rˆ,°)`¡µ5#`ªB¸Ä¼ñDÑhôPßR%¬€U–K>n8Wt±ò€Mh¡ºº«k§q¤*ØSZŒÝ•Å2z¿¹´”™¹´Žé*|,A<†ŠÅÚ÷¤òÕçïŠÚå½ÑS]£Ï N±¨oÞÚÂn£1Z%^¸‡ü**“ë×¯Ý½7³‚çúyndç]\úä·¬G]^Ký`ás‹S¡…¿jK3©s„×SÑÓ«W9×Í‚Ó€ÒáKÅ/ë°‡pJÏ¸=’Fô @òQ4fM~ÖPld*µ^èÐúñìÔ7Ç7ÂBóÒ=ÞVÆTÚøÛ)d£….‘]ú¤Ô!mÐmnG±ßCxt-ZVÜM¨ô –d~ãmò¤šWéè®™óíÎI‡½²©à¸¦n{’Ñ»µdÞµtõ¡¿w'Ú³¾ü=gG´»‘×Cí¡a¼ÝTãÜ¿b¼ÀÈö}ºR£¢¸@‚‹ŒX‰—ˆ-k´€ÈÃ½Üe,`~~¡•F¢]?^§œº±#ý7”uÑ6^ÐCêqP½‘TOzýXo$ëáíâí•ñlz0{v4wï\Q)¤ˆ¬Ð<”—Ÿ½B|Ö÷m²NÔnðÑC|w¹|ZŽÚrA^f£â=pZ1Ã„¶º£¶.ˆ‰ÎÅe;2"|ôd;3p÷˜ÏŒI`Ýä¥)KH›T¼œ@:‚Û*E#ltŽä"¥d"8ˆà–’4—Q‚«\XÉ1@KÂ
ö­÷Ó^7IGlžl ò£'x}tg’™pšÎT^ºxU’—4¨ÇY‡ç_^‚ˆj:”¥ö2i¦±2zÞÃNM„‚¥*¦‘cê¢ã—ÿÑ!Ã£µdªQÌ«lV	X%Ê›DÔ*q”ó té'…ŸüÄ&{l¡ÙÉrš±`ÖÌ<Á8,'S	$öÑ¼±¾f‘øX&~¾\"GþØtÝ>¡Ü¢_±Q
1å,¶@úlJt»Ó.Dq&ã¬’Ä§†¤Ë^¶·¥1]æmM]n_¾\GnÇó¤BhOí„ÅŠ)}A4G#•‚„ŸÆÁÐFwPôë/D…¬4ûæÆ¼Q#uQ)h§¿øE…@
]©§â‰»£tUG¦<°j8ØpøTA‡Ã¸8ÒI—J¿'Q}Š%
KkUŸÄú„²øÜAóÑkU@h	{“€»sÈn¨÷œJ åì¦9ìJòæT%j_®£hðQûÖ|•‚Tõþ§«iEiz&¾ÃØ$úU²ò‚í-CÖë“úÔ=CÚ®MÙV£ü¶$ MÖâd_8\ƒÔ£‚…c›)e˜ÃøCKUòŸ»ñ+¶‘dUÕp¬ôXM†ã4SªO®éž[5N­iŸYS=±Nr^,ðXÜÐ‹Öý[®tr™‘ \iµ”GhÙ`r×™TõQÿèà‰12Òš‘õÕ2Þ0ÓÏ#O±fì¶ŽßŽþWÓ)dú®áf‡Æ‰lG…^ôÁ×Óq^Ö=TtYÐ'XcS^¸&å”žIB‹µèCd‘°D›ý£oÃ^Y†0ÐmŒé;Üêƒptƒeæl}0%V”X˜¬Ù·«¹ÉšýpQ©ù+Kv¼"µÁÔHÈ…\‚_†ÇIp «äÕW˜ƒ‘<éÑö¼=NÇã£o¡pñá?“Ÿô‡ßý@'„¼@'XmÞ€‡`™
Ë~9=z‘Ø6ŽáåÁPø×ò«³*LLõŸž!sQë‹œW·](Ä¼g%âh_ZTJ”—J­³†Ë(Æ;™ µx&ÁsÍ&	bkuvxÂû£W_š¬üÙó¸µ¿–Qï!FŸNùGQ°¼9¿ðtñ3 ÜÐß%˜—¾Ð¢îQÙùÏ¨´òU´AO °×Ð©bŸ‚«¡AGSi÷b‚^gÇ”÷=,Ê{bìûà—Pêž_\šG8ú_›õ«xœawÏßÝ§ã=h¾»/sð¹Åb4¡Y„j›O3nJMÊ9uZ}Ä¦W=.@pV³Ê:pÊ3ám`÷Z6úÄgÿV{{­í86ö	UWÉÒ29¸@?½@$%#…’&Y!ïÑV2©¢!f/¶[b¤È­1{qf‹?m'{¥Á æ™@7F‚j>¶X!Þ›YƒÎ–2qäìØáÒgœ‘ÌÛýÙ„Ün¹«¦ïàÐl"^)Þ&ðÍ7œW2z|Ý¸¥ÝáÄˆqH©°PÖ¹$ÓDkäu–¨±|î»;é5¤k1äÄ]–ð:)Ðõðàs{ÂXTq ”N—av¸hí •'
!Œ	Ü¿s)@áðMîtV½½Ç,‘=Ãˆ—h’wkÜÑŠ}Ü6â_tß#í`€:øœA¿U½¼ã¹FO6«Ëò”Ž=ã½‚ŸwKfGÅU¦ËÉ¬¬Å\]ÌtAÞ‹h×
Šæî*…mÌ7PÙ´H)«nU¤Ñ”ÞG®B…þÏÝ¨ ¡òNë&ùŸý®æD>ø<Ï´Y§ýDÅ¸‚}¼è’¥¹‡tR@#^%ºašÇfaÓý¬·"œ´ZåUÚÊl’–0™NM}6H‘ö(ãL¢¸FiÓ¢]:©,×“þš¢sAÎ†–ÜI¨$§æä¤˜`Ø¶Õ‘aº§NLôÂhNýžPÇ3Ö4¦ ¢]PÆn˜LJÐM$Ù±²î­µ¶Ö¯ÛÅœÐ³´¸Ëèí¹ÔŠœã“fF,´B¬Tß(ÄukHÉ2Õƒ	:!ßÜuíÍÕ¶ai:H ›Ñ_|XÜ¼…¥‹J&*@ÿÕ«¯õ;ò„ÈŠÓ%Q¢äéÍÝXÐ¿a7ÞQ ¸A_‚ýÄƒíÀïN—p]zU	'5§_üj%ß|)®Tx°N‰˜q,3¥åæ²q”Ø2PuÂºJ0T¼c¯+²+‰‡¦ªå^µ`Z½úšn€Œý×a_ÉýlµHcëøåoS²5>>ü‡Î‚èJÙ+5p®î–ï;±¿çqç±3NVå_W²_Aÿ.Ì8Çö•&kµ °Ô÷ÿÚ~8…¬y]Î÷äÀ\Yâu†Ê•ñ-$O¨ÏQÊâ0ÀËfr&Iö·º 8§Ù³æN‰ö†¦Ò(ë¦ÚŸnUMþ|™‡núàÄ”6ÿê+•­<*ÊåÖÂbŸ0uÞ–/¿ÙgŒbaDCÞ»ðD÷#	 £T5I¾YQtÙ÷¥(¶)åÏKî{H^y¤Kã¤k*³n‘ë„U}ã‰?°âÐþ+¢'K,]ž¶•…§…ãÁ@m`°3šÎhLî×Å;:9Â/*Ñ²ç}¹äzÏÖ¤/£×HVKJ·p	-B8LŽ`Sîõf,Öç•¬Ï4‡À†¿!'Ôo‰”Íû]4FoÉ¥.rU-…}J/Aºm¦ K`‹S‰-ŒUÄw¥¢_‡ÂL1Ù{ËÏ–JqŒ GSPZR!{˜6—-š™dŽj3*™çUUñe~²z²é,šŽ†8£j­Ùñ¾pNÐëÎ«Éí®zbë©YH'·GtÃ«HÚ³•u¨Ô;ác×=üØ¦ÂÇIó¼U¯O‹CóÄVöÑ©%ÖóØ˜gh58K>ø¼n‰õWø<Ð«Œ'ÖfÙÔ˜w¦e«ÍP³…ß¤…ÝhÔoáSÖqoéîv*«bÝ„g£æÂçÕ^±ò`2fOY%Ökg§VÍUcy0%åXž+ói(Èƒ^Ì('*Înw¬ llì¢4Ï²
d®¬?ö·c?é¯ïº Þf òÝãÃß’VÏ›\.Ž¥“2{xŠH[”:”ï„úf%‹´¸”ÃX&€©Z¸¼’C`¨A¯LŽ_‚-ÛƒŽ_~—ÂO/¤ÑÁKí(
™[^\¾Ü\¼4$è—ÿ°2÷á[švÀ©[ëÔ¨X»œ%XëÛHˆ»Ç‡ßÃá¬CÝ$9Kä]>DDôF†vˆ¥H+YkçÆÉLmk2²2XÉ¤ŒLŽ©´÷•¹Ú½`à?™X—¸$&6}PLYhQÅÚ²²‰€’Ø¿„d›Ž›Ü}ÞñíõOVIÈ%Ä Ü!ïGàoô}J
ÀŠ¾ÄÿŽR*rDù¥fˆ)DþË.¨—Õ¡. Ÿ)g£H™çí•bìMže^™zf‹÷ÑÄ} ÓR”Ù5x[.\©áñËëƒ1Ê½Š´Î<…L‘lñï€Y_ ¾Vò;ºªø <kØj‡eâ}õõÑKÚÒ4½”käóIðsÜÕ¥*% #3ˆ¼®ÈŽX QzQ ÈÑOÝ•r€ž¸´,sûj@"~—è ¬ÖÄ°ÔÝ~	††1•y°†+. Ë–&G{6•§L½¾IurÒõ·½ñ€E5Sò¦5§räuÕ’·’A¢0Q4‹¤zÉnŒJÕmÕ@;ij†[Z\=|ˆò~f`Y—Â#»^ê5Ÿ&)}æuA§?[ÍPw±È·umlÉÙö&íÆ”‚™-ç½ŒO’6¡œR£ÙIà6=ãxp¾gçðÿª™‘Ï‡z³Â.a¯èX&ÚÊ\&Þ’‰GJúKîõËí’õ(¦—Á¤° †:à$à€oÈ_enÚh=$Ï/V'y6‰é• „ÙèX6—†&^§ã(»†Ñ]`#…í‹6VEÒ£;ÇhH•%hv“$AW_yÔê(Â#gyµð[Fî†”u¼‡ö%öÕÆ¿ž‹ßÄŽD¾‰¿ð®Ù·lÃy„µ–œüéÌbS¡±Êƒkw5³‰1åŸŸÄƒ:X™‘8©HßÌO[pû˜E/þ5Çò±ÁÄØŒÄƒ!¬_2
Â"ˆÏ¯6…{48ci†ì®V<&ajzxœ:…Jù3bƒJZEZ,xúW@³%|Wq¿‚]¼Ÿ¦£dµÝîF¤ÕÃ¶:Ñ°Œb("
CMÚÝ¶¾’¡øpS8‹$À×£Ûªãmå^wèÅIà9*¹Š”QHô¶—“Åyå$¸GC˜óÝ¶ó XÕ/~AÞqfuj$©¨¨¨fŸJŒ‹ÅÏ©Þ)‰Â¹ËÆð`3g3¼ÓM#Ëcê…ÌòPúZ%seã‚NWL«{äWëa$Öå€ì’{°_…°×’To%4X—„‘P¢òå[Ðìo¼úêè÷¶<›’VXû²ž]Í¥z•¾å™ÙÔjT ™‚E­Ã£çßsšx£×Õ–ÆƒðË–4¼p*v4|ÒT¬hüe^W0WZæ )ÚÏ²4
ÕWòÖvözÚÎ2þüÖr6Õ¹yk7{k7›’Ýe¹ÚV3V’ñ²™‰c&oŸ§ê)ö2!YLÃZÆŠÍleøãëo)Ë’NßÚÉÜZ¿µ“ÍÄNÖ¡Ûi2+Ùºtç›f#C&3¡…,cP`s›Þ	¢NÇ2–½Ëke³í@Â³²$ÕØˆ†*Î2ÚÈ,¤lGºùP5Öl­†)f ó ìˆ$è6Ç€i*H=;†dBñùàè*Ã/_1L1bòÏä¨#"0r½xéx¨°<CÙ¸Þè±PÇA Ö—L[B€éÏ¬÷s¸Àõp¹T¸Ô.þmG&•–46ƒ©ÛGÕk¢Äà¯\r ¬´ Büð»19úã*Ù„I»“Õ>ÞÄÚÇPå˜¦Žú¨ˆò¯F ÿ*(š0^˜â`5¦­Nÿèû°Ožk*ª+Ó:[«°¡0úÙÛ„ïnoÀ;{¬²¹SIóü&‡²æÚÆ§eF5L¶C—ÜgÄôÅ˜Û‰Â¹•,yÆ°SBe«>éFý2•E‰ÛŒÝX†|~nê³EI7‰õÆ,ïRŸ¨Xoÿ?   ÿÿì½ioY–ú½E]Ó™ÙÅL.ÚYZ@‘R‰nIU#RÕ'¥`fVn)’Í!àv°‡§ ?ØÃöÔú¦=»m(Áð–ûÈ¿Ä÷œ»¯q#™R•º+‰™w¿çž{ösé-ÈlÝ[7~/¿Lºä$ÃÆxx{¨DÊÐ™Î¾ð¥7ÊŽä2í¦ƒÌÁ ÚNA­ZU´^U€‰9gA]îšŸ?Þö†â	.z9úÇãÞ¨­Ù“ìU6r·ËÆ*'ãAþ“ÎÊ!Æ¬½–ÂÔ•9\èêmØù[# ¤øÓIÜ­rMÇaÏ{Ë‰ØÆ3±q·ñæ-ûé	Òö®’ílr½ò2¡å¢¯“@ñšÊâ|‘¦Y0^‡}º7Ù‚ü’yéÍ12ÚrG:>ÿ]:¿zÑì¿Âý:S<zÔk’…Ñ×Ø‡½1Ýÿæ,,.­;Îé]Ìè"xÀgu0èÄ+ÓJñ­þÌËLf éZ¾ÜŒ’DŽ^¯uvvÛ„¶·…!˜íŠ(âÌ¢1D x=ñŽ£úPŠpqÛíÀ¢[ jÁæÇókxHhû­
Xü¨ŸÍ$ÙÙN”ˆ,U #¨ ©ËÙïNò@å¤Ñ)‘tô¯±UÌzÌ‰ìšn ÇÍ–ð’»5h1¨„«ÔýýW@ký'?;¾Húª ¡¯FÒÐ¶Üxñ`o&©d8pC8tŽ qTW×’*[ò‰¨0“A™²_š¬É‘·³b0€ÈþêÄ'B®%ÅKoy`>IÁÄ¥ŽÀ|V½Y´Sp+›röîŠ&à.kÚ"$õœñ“a>,¼F±°{Ql	¶œcÏµ(ÄŽÙ—XÎßêâädãøÔ*ß'Bvk
õ<‡^å¡•…vŒ˜ðNÈV»B¦ºT_~ºdÊC-IhLäQo¬ J…©…]XÇŒ¯Â,tÜá©ÖœºO÷nùì´°VjBM¶™Jf@i`e`zeÃ/9sšXÓRÃ—“»èµ1,u#ÄEFŒ=}1i_ç«'Â}õÒ¢Ÿõ´ˆrªìåp5Cyjj‘|è>’¦ŽÝ<¬’oÀáTÐ×•Õ•K¢¨Ø¬é/.»0 êeg/,¿ý›yHÂã1† ÌZÅm¢"ì¼×ËFŽ2yïÖ’D†íÙ,éåÜ¦$rUmìU‰+äBdaHYíöËáàþx7lâLË8ið˜ÚÙ„Ñe/dà±Ó4hº“æ´ìÃçmÕ™Òs§¬¡e ã,$Œ­Z×ŒÕ¦7¥IÇ’PàWµAh1?xÛðfGh„UõÌâWJú4páìJ…¿>ãëdÂ×=jF²ÌA'ÕL¢1±ø#3Ä×NÙìcô;?Èè84F¤ÓAè’ú×#¦åê*jÈã5Î|šB¿}±b_Nx«K6ƒ\ÛØÁÿÚ"ò8F
¾Åge¸¹2°©úJ»Yd(°'í+ÕJlûÎï_Žå˜„âÙÁ0=[í¬gÃçÑB¿°ØOØi²è¼ÚâŸœÿfqvþff­nÿr¬%»sD.rpM×»_5,Ï)e¸t[Wæv	qZz[Eíš”>æ_PïËÜ“Öcþ«ŽD6ÂÎd+î$+vŽr%×u\4á.ŒØPÐç€Œlç9°Î¯¢£i:	$•»-Þæª¹"¡å€»7’ÑèÐ¯DÔ6ÐÇ·0 *ú6:ç)%ý}_Üdç»ºÊô~ª©Yþ6 F*p	4¾ÇVTWÞ¾dú#S *}‰ÈQ“Æ4_æI1>ÿªìP|¯KYQ+S8©BV=b\?£_ÐAzö8O¤dm¨qâÌ÷NçôËÖ+BJ?Û¨r‡‰Ç@ÈèÈã‰%IMá¥U´Ö¿†Ï”tocÞ-cß¢´d•6T!}ÜwÀ
¬§äE9žF¨µXÁ
m–]ªžëêuÄ ,-ìõë¯úÏÉµ²š p¦´M™~ƒÑU„+~ý—Î¤¸:»Ÿìðþ’§iì^Ù.ÇmÂ[OÇC)^!d´ËV°Æº^¡•¢>Ýî´¶·ÙÞu%dÛÕUû`r[eîÃÂ¾É8`n2–[Á}ø®“ Ï´$L•²¯œï)!2·ç2‡<b%ÍáñÃä!!y»ÔêN¿|ùœ¼šImyFŒ Û*ÃŒ‘ÝSØÃ+êü¿ç èƒW•X»ÀÎ36B>ç?åx—­xÖÀ,kó¦¶Â°"0÷€í†—ÏŽ¹+uõd@?‰ˆ`l™D Œ“v:+ÇI—œ88ÁÝéx0ØOMÑ8`ÄOI•Wyv”ìÎ†Ã” öÝñ±‚Ý+BWHdëIŒ©æ¸ðD±JthJÃjÐ¿œÙÏû±Í8QÃÈ~Á´¢•Bý©Ÿ³jä4ú«œ€âùï†(ïqHR®\½üC‚	%U?íSœ¸‡ºÍ'Y—¬<ÈA•”+ŽF–@	ˆ;µ"h’ä¡Õù=î¦½ÃÌA:£À\YµÃFZÑ"méò5×
ˆtßBÁ»À*q­V S7¡§`âîQ¹ÆDí¾¶€ç
y3ËYº£Á"Ú‚šÉ›o8RgkYœ]™³•t»žÁ¸'"æpðñ/ÍÞŒ•(†$Â¼klƒy…Î¿š0þñ¢XølŽŠ³‘è¸®ëº=;Ë÷|‡êMk‡¦ÑžçT×Þ+|kŒw|ÄôŸeÓ|Ükº`yHób‡Îù"—»!3då4ï¢È×""ÄÃç]ü¼\ƒœ—ŠmÌdîU)H^†‘óë„Ðœó”hÊH ‘i*°N]Yß%¬† —‡$ÝŸÒi{4ºS²‘=£~.`ºÓ¡I«à„¬¶ìÔUß|é„¢XµÒ{·‡ ûT‰ F‚Ga7km SË8ï5´›âØÿEø¦[n„'ƒlˆ(ÚFôµÕÿý?¤Éôü¿7,«¶Ëó4õÇ´»{}ÜÛCB¥P^°æÎÊ{Hæè²€]õ'îêN3R­·YX¤Ù}tõqb~Qv9iôz+­œOòàÁÆpØh±[o÷e÷»µ‘ÏW¹øºh×ÄµŠÐ·j;ÇŸÎùNg)©±zÆ˜ìmõ/´‘VYp5ïÎöÛ,Ii²O å%ÙdL³„æ}íÊb¶¯„ÞœNÓ“N^à_'`Êò-¨.ÂWêv²êb+l!(Ýc3/˜â¡V¢0ê‹+±'ôÚyädÎ¿ý¶|~ZXY‚Oþˆ¸Æßü…‘c—%ùy…–Ôþž	šNÊÚÀ3­‰–Ä½‡0¼dÍƒwg5¥³÷æõÿ7:ÜQ<ó<îyD¢Nò“0bí“„}Q õšÂêzQªãÛT°es.GÕ.ÓI³I~o$éèd9)vzÇ	uÒuú;ÑM†LªmËäVÂšüÖÖôvRë–ã2hµ«¶)ÔÚ¤‰6©‹´É¸"Þ´’%daËïçÇY¯¹†åjÃÝ¸'³¶Å/³“[§0sÂàqÂžé˜nÊêÀ˜vª°PUŒí§4žú`^§† ÓW¯.Zí˜ÇÙI _—‚²5ôØÂÅ›’4å¿ïÓmû{
Š«9¿TNõFÈ¢.LJ¢©W?k±.ýÁqpþEÚéuèð6X($^)ãUKÊ¸¦[,‡C‹³?	9$÷àE¼¾”µK”F9-HÃ†¥ÛŸ@ºþù×²´‹­5–”4s@,É¦i^#èúÊ¥•)7õË?üd›4ÕÔF×r’éä³Ý¡Ÿ@íŠÍò ÃÂy²•$ÅNñ„ÐîU_ÙüsJ1vä,'FÁE	°sÝ
g.äØ„­g6±®Ù!ìåÃpF¥ÚMZÙNJ‡¹Ö"HÚ8IJ5<~ŠÓšdîÍ-ÌR?7‘û˜EvWj¸E°¦æm†8›šu³k•âaÃ0ùðî›¯ÿ~’“N6’G8	†õë2ÇÖrJn» ‡Ž)•Õ¦¢²`ø@å¸\®	~®LûAuÙ†p¼b¿EÀJús””]£¿ÐüŽýŸþFŸE§ —DÖlu¦!
ø†+£)!WóÞq5•ZfJbÑ¹"mh'D^æÅC2ähLR2¹uëV².¿3"D[: ÔîI½µmµ|VV’íŒœ!œ~ˆ ¦Vy1#m`.ÑÃÍì¬<ÈJV‡’ ·<BJ‚?¡x·¼yý/?Hvß¼þ»ÍÆ²§4’œÔqŠÇV5Bë¿½ådˆêÖ%ÎÜ«™$M¹–äLâ¶wØòÀr6žÜûdgwïÞ“†ûõÖ“{›{÷-ï‚Ä-›\8rñÿóÇŸ$?>ÿÉÝÍÇÀ,ýÿ?õÎ[[BÅ4P“.]sšÚ¤«ùÙ`VlåÓî óô,êY’’†µµ×ksû?ÝÝ[àzmn?ÚeÚyóúŸ=MØÅ­×d6$Ð±ŸÊj±'1‹µ;€«¨XàJ=º÷ä“{_lno{ &y;ð÷æõ¿IvŸ’_+É'o^ÿ»Ïâ–µ{’ŽÄ¢âeIñw,ô-p5Ÿ~¶MÎé{Ÿîm>\àjm½ùúï>K? ö@.ôo·H5Ì>*—J8ü-ú¶>}¼ûéÃíÅ¢8„¥dëü[|è¯'Ÿ<ØA©à¿Û‰[¼n;±vô—²tôAÌÊ}’—²éábÜN>êf½¬h6v}öé‚æ·hcŸŒý&¹÷Ó­{É¡Ü}pïÞ^Ü’•Y:+†?”Ãß1ëe¸[Ö\67aB)šM\Ž.ÀŸº6èØOÒl¥ƒîÈ½„IòzùÁA6ÍF]ÜŸt2!äøûÉ¬·Mªq±dògäË H+øã'èÞwÑ>»à*î;G}@ŽˆY±ÕBÙS8z­l ^Ä8¥DSk•5
m¶Å*B†è‘vZ MŠnÒ•µæÄJþœ%Ä¥E
ìQñ¨]*t@¼–=zú°æ/f;í´×ËœŸg¼Jc¾þÝ -Î™°`¨&ƒöõ`‚	ø€”@zc[}guªúÈfÙ²õ¤Cpi5Ùˆæ.8põòFží¸½¶²^‹Àˆêð¡{&’µ‚ ÚÕŠ–ú E¸Lÿˆ+™ÆrPÍ—nôöáˆÐ\°#4fëãÿÚÒ@ô e°ªK/!}ˆà÷î·ôŽJÍ›µ.•Cs-uPG§æIˆ¾rcUñ“ÀmY³v'Øü†§U_¦uö5Å
Ç1÷Þb½tÚK˜Lèà,Èì”=^·š*JœAw¥p:^qÃaÍ‚
-7•nØâ
 u…ùZV-IþÑ©”ˆ„¥àQÚ‰Èùž¾pÚ‘úd“|JëäD©ÔRl@ÇÆ¤PLî€k•Mh=#¹ õ’x¬Rs‚­º¬vUHÅnWÑoÉEæš®(øH4Ihõàâ¦\©p©ÐqUHyse¼·j[(9R’«¾(Óá„ bS³d”pé–6Š"dý¥Î¹JZuIIÆxš`’‰z–¦ªÔŒ‡ÌüÏ<vŽÚW	 _5¨¤ z¬$µ8¡ˆ“qÊ¶?ÃçÚrõ™Ô˜?m´€«˜n–M´vx
Ê™­èÕH¤ò,ø½RÕÑvs ‘5$ä¹h,‹kUÂŠœåÿK—YcW	:ý îÕÑ§01¨F¥s©¢íÎ|ƒôÏ"vº²HŽ`¬Úž Vëb
JW)§¨D5(ú‰-N/(Ðõ÷
Í¡ÑÅáPúð\JkDùXõbXöÏ3Üà±}ÃA’%¬~têc­ý¶vîÎéFXþT.‹qW+¢Ý@0g×‡Ú&C W¤µ¡S¨b	BjYÎ³g¨„Éò°îCXäX«4Öðäö'o^ÿjâ…CÓ†F±ã=áqo¶àLúrËàÕÔ–¼2;Ö5-AQovÂ(Qw,{¼qf2Šî’N# )ýúÀ)tˆ*G	Q¸¾ü¸X|¨“æµ¤TÂ¶kn„µó‘wýˆUà•EùsZ$’©	ÕÙ4ÕB_P“•ô ¬ö°ºM·š ÝhÞ•ˆ½M;¾Š"®îò[€±åÈóyÅ6•zý%Ør½þÅ(úPzºÑP»ìâñ°ï¥ºuåÈ®ÌCêÔ=Ý¹“˜pEÍyLÙë-Èæt:>z‚^ç¶dÊ´…ŽT±vk‰ÖEôS±Æ +k,O¦úH=‹ïrí£8k6IE]è5ž‘h»Š‰¢1à^µ	úG.ØF×ãú†š¶Qu:ØPw³Þàøð¦ãB"áe`ø»î¨tMH„”Ý¯Ñ?QÒiþ95öíNòâ£•‡®ƒñ‚ŒüEe¡ê»—~"å·ôS)Ñ -F2ÓÛõÁ¨He“Þgw3dGZhø	Îî§ûÂ¦ÏsÈP¨¾ouò¹Y›Íg/Ÿ£IëK<÷ºÌV…¿¤s!L!J‰w¶;Ó‹$å(‘ùôb“B[Þg¸¸ËI/”éóäYp´iÏ—“îNÐÈ×þP‹l&^€Å7y»ôïí ]ùÁxäÈbÜ”CËÌqÌ_Dêó(O5*CØ–Z„…ªQ[ñýßPÅ¢SBLýr„I“k´ö*›ædeå‚jÌ2ÄŽÆTncûÃ6e»·”¥€ƒÑð[l{vöGZrtM÷>­¿?wØóEäòŒ"Ê¿cÃŸâbÕ$•ÈeÒCùxt‘¼Ew½)Æ§m´¢\õŒþ}Ôé:e¬s¦C&C‰§Pãñº=9 +/6¹äŸÇ÷Èþ¸¼‘æîy
ƒ`qÊ‚'YZTjØõ:¥e«= »â)',2(7Wã¯ûµ0ZÅƒÅµÒ·†OQ¦Ó2Òw6a	¨A¿'Ý€Ú 3)úL_¶cNB¤ÚÎ{F–n?„Lc5=-G2ú–¼ÝS˜„Pz^©Q€ÄýWë8’K)	;¹V,†â+Gó­¸ˆ¾5oH·Ðap]O¥ËgX4tîŒ¨f|rÇé9¨¢¢Ò¨HÕl$ý`ÇÔð2Ýîèü/O"çoøszb£«O|ÁÑ1/]™¶&ÕÂè0ê¾P!¡±LÍÑ¥±æ}
õøfJ%ŽíÕi¬´}KóXæ®ØåVïŠå“c+'(èQ!t¹1Ž·Çl ž#dy=‹êhæPG­RÖ<P\sL|óËZ|ó+ßj|saƒjeåX@ürOðî`:ápPïøHç"ÝÈu;Ô9Tév½¾›:í!2œÇa9†( ÷
dÞ?ÿJ#T§z>ÀEÀjoCbkWH™(r<Cr§Èõ®®ºâøâ~Tš¹:‡NðÞ)°Þuß'³®Ö`´õšëÆP c<F‚G‰"ÿ9ë`ž×a:}¹9ˆñ›!ì{.º¤:h–ˆ¯*Ã¹?2} {%÷	Æ»Šÿà0†À’;.A?ë¾Äÿ<ä9ËvþMöë¤'þk¶ñlð×Vþë¿v%wVØ*š!™/¼þÐ1B=±Z„„>¤5#—¿íj–"ƒÌá›×¿…²o¾þ_#Á?¢Ù»½‘Å^ös–7V †ˆÌÝZ	¸øî£l1ÙK÷ml¼sR:lBoî»‡M/ hÓ‘4é`à
î¢h]º#[‚4­©hMZÇyÐ=>ô˜K.IÞH#5Ó€q:qØDÆd¾¡ÛvÇ×¹}†éÔe8øiæÀi·l-¦}6÷ÄÉJš§Ã“Z‘êÌp7WöÝÉ˜çÞ}Š‚ß- ø<æ6… l\ü€¥F¶”xqd‡Áyö•î¬HC¶îH¹jê]{Ü-¶34Ýºº3Klíá£½rôÒò…vR6NbÆ½¼ZfÑ‡oxòS³ï
VÇ8nf@­ïöILXxÑóÿ–{2SŽ|š=ªô™Qãú[I¢ñÝédÂÃ¡A­6Ž¸[C§œæÃ¦SHE›šfÝ|R¦ž9—¬Óé@àeoûéýÍQ«A¬¢å>—¾Š“iö*ÏÕ{˜ 2µ[(Ñ¦W pEV}îš,SnÑÙÊt!Á®Í/5$]bØ:Å¥©@ôî•G¨ŽìF‹Ì(úO/Þ¿w³Æ«?±¥Yîò²?kÕ#’¸II†T™¸‰KO2·mÓN›M§ª|A‡‰kÖáäf½‡9FÄª¸ùyLyžƒ—’sl±ì$©ÌÛ±`Ý®	×h‹žhãñhwO ý‘à ¹ClÜ¸Mõ’úyGÈÉèòí"*×üæAZë+Kî@mÖV«œÎ2³øYËŠêÀ¯ž}.Çpx.¨ØY8?kë!ÍO(3º«Á#h¯ÿiŠ!ÁÝå¿Íá1bdnd[|Š®£^½l@Ù
¾iØ* 4÷ÇT|CÅ*R’3:ÿË±?t8¡¼bæá™ði˜%iÜEa[¦³ƒá3¤ê­¬–ãÌ”È±Ðñ¦Cr®‚g¬3fišlkç­ÙpM0šºÇh-êöƒFÞÆqyn6¢àEª{…Ú_FŽ«ˆ/Ô½ >‚zjšBn<]À$>l|¾Êz¹À{ÃƒóÆÒß¼ÅÞõ+Ìxd^cží‚ðdààKm`³¼CÆa\vÖ2V‚^‡UiºÃp»ZÚHÌ6 ßGù`>o;Rƒ=ÚB³å‰§a{0Õ}y¦JPìço^ÿç49ƒùšý{4FV“ùYÐÖµ ^«J/úZ:³àkWãUÔ€sÐè’v‘;uG‚ø,ÅÅOrÄ<¦Ñ¹|²ŒSð[þ+2Ó+ham„ÌõGTâj\+5½ü¨bKÅÍ:•rž—¨>N¢8êË²‚sÅK²ÿF7‡Õ!ésû¨òl7Ãhù>„`»©çU­y%UÈ­ïx¦ê-u/Ê?†‚ww”ªšŒª*ÆV³Ç]îHñïš©èæÂai†‰€'ùÅÄôsÚ“î$7÷¦Ùz<è”±È“nŒ6\ìL‰ð}}•Õ½ùrn³ÒÓxµ\,èH§Ô°ó@°'–ØœÙUÂù£ÓÀ+ûÆ	5‘jeCÂcá¢á„D<MqŒ#Ë<±Ì‚ÌÇ-5‚ÙåNfÆ<–«ÂøšuI³Ä¾åu‹~¼6÷Êá4ÞÉ²yhÿ·¼‚±ë.ß]ayJõ+hnñ.–‘Ó91ëfYîë·×“£öºFKh“ÓQ>„ã8™A¨×á /S– uIÕàVš¹_ÐÁ-zñ!«ŠÑì°*ìÿ¬(ÒCD¯/4*®=ûÐÆÅg\ÂDª‘N'èn4±÷½/ïI‚ô*½NGc¼…ƒœ§Œ+ôçn÷_?¡i(Ñ#¶ÆÃ	9ìàOòáÕ¼~ˆª‡³ºbšj:“©^©v–¿x¼Ø VlCŒ+½ÎæÉÀza©¶¶fSˆ!~âf>+³Áí)CêOS+ãç5ê˜çš€Á\WN€RØàJ[ém¦Â?v\KJ[º­X†½ Ã£°<\Í5ÉŽ8˜xè&Ìè	8¸› o[gè×Þ¶^>JË~'Ý/h)R,ŒjÃç½š*0í24ÖÀÖJôâÍëß¦õ´oÍ‘
ýzäFõÙ| Cj•ª› K=(j¡~'Â'L,Göe0ÖYiå7×æŸj³mþ	™oóanÆÜBËO¹›\*$·êÀÄ•UÛœÛmóÝ¾fÛwûgäÓ]Ýx§í5nÑý×~ë}ÖŒÇ‚›üç¾b_-îÃ[²zW=†Š?Hš.[áÍ¹)W81ÇªŠàH¾ÊÐÂoŠª£lÚÖ6œzÞ!s ífò#ë}ÆŸZ¥âZEÞ[¤9”Áoí]¨rœe§˜u»„h¾@àêö!pÂ/GI‰‘¯ƒ\À‹@ëgþ“w½yg5Á±Ô:ˆëãÞ‰éò¬ÁŸfCUùëÅû¡Cè½¢UÀÆ“³–K¹–ç%X7_,ÛAŠ¡MfB»xj¸mÆiùuwÍa½ª°×»ø^½U!:zs¹pV¢œ3³wÃÏœˆ.+|™Þ÷»öù¤¿ÙŒLDÎcBqäŽRÉòü´}?¡­Dëx½>þ—OæîyãÊ«£çÉ°ÇÜ?/ƒ·¬ÃÛ“/ð³Kë –ì(ŒÆ#aæÌLw¨¢‹ŠòQröðïÏÇã!üí±$™$èÓ		U®«ÕBßge\—­òáéX¬Ën™–EO¡ž\C†e=53—bfËèÝ +EÎHÖYp§Jþ¼6M—drž•µU]¢Öœy•ü)á!˜¦è6kó°Þ.÷Ç%Ø›®Ò|AÐé:8’ÿ#¬ £ÓZµ‡ûð;uöY1„jou±I?'8ÒãëDñw\Ü .U‡¢)M˜“ÇÇÆ§¿t˜¢ÁU¹¶jš¢	*%£_àƒACö ušaChÚÕ¤¾Ú–Ì ü³ÊžW¾õ™¯ )1éŸÿÖy±ÜU±€-i¥Kr]&WvÆ“`º(…àã8ëy–ë“üü«!P%Í0£sBˆ®_ë1˜“&Ôb¤Ã~Ò§ä–S $ãœ·+I´Ç]ÚuüBº„Ûˆ£UúêÒj"¼],"“	ˆåöy;›ˆ°KÝ?€xóõWCçÒxußé©¥Ó0æÐ½%á¿Îc³Ä»„¶«ÿua¬r•»\[…€
UöœÍÆ§y/ÿà,È2@^vgë~Öétœ7ârâxÃÖq
<§ö’PXšKº% J&=R,Œ«\òÏÖ¯K"Â4ï¡,#*‡ÑÚ+ÈØf5_íNIñn:h(×8%ÁyÌ€¥—æ½®” ÖÜW½oÍ«/?r¹÷ ¶Aÿ.zÚÀ\x+êJ›˜Èu•2^­$ÞŠ€W¡õdàì·ò¶ä6%»}'ˆ¥=¥"TŒáe®0öè_±ão9M<DàÇíˆPtYF ?¸¹Ò¿RÑwœ‰Û;U)­­ìa§/"ÁÃM=;?²
¿_7´rUd²˜ ¹#||ØÏÏ3$KýæõŸ©ýº¼*ÓÅ&¶sYè{Õ«(ÇñI†i>¢êäÿóÏþŠM³‡üÝc
i$bÍûÚ•HdZi¾¤-ËõgÐõ2Ø5§lª`ÑÂOó¡¤èû?#;ƒÎP¤—ÑA>ÊËèãÿüËÿM[;åø~NèÙæZëìOæUð»¡ÈõmÀ“ŸÔ¦ÁCöÞ¼þÉ€ÇzDŸÚ¸_F^ Ñr©ÂÄÔn@—„û ? -vE1ÜÎ¯ÿ>Õó=Ž\wg÷ÅÐÓ·È‚Ä2ºP„Ð}¤çZaTQó˜¿_k¿GÙ¿.¤Š_z†–ôµ—XiˆÈ¹_ÝqñG½[[ýóß{°U½³·aÙ1hr¸àOìÒ5u—ÓíØCkÖa³ ¢¦þ£š´æ½GæEàÞW-wøÖÓ¦S®@½LAIâÍ¹/ªW—î¤/Yƒ«¦âEð•4t¡L^?¶¨«ÿ#R¤«¨ðQc4k¬k*ÀüU~ÖòÑ( 9ä„¹CÿÍ¥•¶××*ýK¶‚e°[÷±2K·?Ï„Ú‚¤£¤“o„£¹äíÚy÷ùc–&TSq\Hg_%º—u²d¢ ÿû
#Ÿ½þÅ,½ùú¿Y ³šÏ|Ú³þªüíÄŸ>Î@¬³za‘Ö¯u¬T3Ú¡Ò"¹EÛªÌ°þÐ¹lonÆNSäÚ·Ô˜uƒó¯»É©ð“ù}ö¨)ÍRR-‰ój+áãÒ<ºtf\çèhB™
Y€?]—[uC7~'…2¿ÊùQ/`vúå7éå`HÃR´¬Ø(`aÚ7®®RnwjLÁ´?%)sÅNúÀ €¬üKC/êÓÕ{ƒ©JQU-*JôO¥’b#0öÏÿŽ 
…5Q‘¢àçQ:"œ$ÎðjH]åê(H‡=ózm_•þÓTŸ.Dª”ç<å.á¢CêÄ5©W¿D'§ØžX ¬ø›T^…ŠÂË©fØÍÊ\ÊõA][–Zqn¡jŒ»ö ëê€Í¹ZÃŒjàarë)CÐ1³U­¯²ŸA‹ö¥vâQ<£V×m¥ésÈ»
„[èñ
WÈ1»š²{™ÖV5?]®ˆ6#õvn…OáÞ%?!·¨˜¾i*w!ú\¹b8Ï0å>í³ÍtˆÌÑW@"{ü
üD×¼äÜâµòq­†=ü"yŒPm(
B”êÃt?Ø§@H™ËÃ©2´ÂcAíiG;ª­q·ÄåK>…ˆâO†w…“I#§”ü	e–öúÓ¬è““ö'!•¬×d.Mf¥[2WžL @>\“7åa>ºµtÅçÄL®Æ[K7®xÞe6!•Ý6†¯ÒÁŒÜÍž™:«ŒÅÞÌ8w×Y¿9I§E¶3*›‹CÒÁþZ–ZR<°}5ÝŒÊã“”€WJ}¢Èfê1%	©§DIý¢ñxŽþÝG;¬N`a
T¦ˆeÝˆ9ç?J(W@røæë¿AÊ2rwy²ÊÐtë?Ù|òxçñ'<•†ˆæÜ³¶ ³QN Ú@Pê/»˜ƒ£ã„^¿Fý»Bêý7×i^èž˜û¢ #üã¾&‚*^å¦`rÔoWõEÌuM|Ž.œZhõ…^–n}®«b‹IŸ¿ý»Â/‹5ï][Ø“­y]X,ì¾à»Yû¶`@þVî
U‹»)^žÿ¶ÛOúcr$JP«òlæá‹cëÉÎÞÎÖæC~s`êé›×ÿ¾Á£ŒØ© ¼î-á|XÁ•jÈuªÆ™f (^Šõý1eHš¡ŽÓxRÝKCÐcÆpºgƒDÃÇ%sK¼’1ÄÜ}óú_'?›¥ŽÍò¹}V7´jÞ Ûµ—Ót™¹V!„{¶Ú¹qýy"Ô,ùG0åJÈ¯«bÜNEº³RCåùU`•ëD)p»m9œ–\Ûÿð÷ÿ0K~˜œÿbÂLu£áÀ/4WTÊµzd&g?øÁÊ~ôƒœF»Ù¤lL—vŠ‘^•ðúÞ¨›NŠ˜‚¬R¦”OÊt?!­”™ŽzÉÓ²â°wJà&! †:=(o	Ê‘¯ô:¤‡›ýhå4dÛ§·¿°‡qRivËÎ0Ž›ÍS8y±Ù#wê2ù²;#=ˆ_Æ=øC=A;Ëªo³c¨ÈçË<1ÿ™Šù“ƒ|”6­ÇÐÆ£t	—ÏD+ò—®½\NÀ¯.¾Ì@T‡vË	¹x{ƒì~Nî×r<ÍîM§c2<½â,Î2Îs‡lÁª+ÃY¦ÇÀýŠWQJÇ!­¦»é•Ñ*´µûù20.?›e{b5p¦	¥ùL®é.¹â»ýeê©?|ž` EÐfÍ=W,v_¶Oö¯›õÌ*´Æ6{Ý´»¹´ºª´£Œ—Ÿy5£¼ÑG„Ypœ1çKgsÚ»ØaA­É±Mm‘÷‡ãé‰³9ý¥³IÙ&!ÆJ‚JòCleWüTëÝ<“æ–üã¤G ÝÏ7’FZtÉŸ%r‹à—Ðƒg·›¬JƒGžj,ÛÕÎÔ¡Pˆ„@DG¥?åª€ðiþÎoÑuƒ¬œ\‡´‡wøûÃ&ÊÑK7DZ¢•—¬Ú:½	´£3VfÉÜ0Ï”9BérCvSÕ•ÔÁtà	9aì+Ÿ5©-çí˜„ÔÀ
"<òt²=>é4ºLHÙåÆ“´›—'„j®’Nˆµ^—ä'PÀýÕt<z:ÙéŽÃ½îºÌpÙhÆ<OKæ+gÂC2NãtðÇ|7&4’ÞùÏ³^ãvS¼PÏ!ÜL='3œk>ÖÎž¤^X38ÂnåžùT(AÃ·›pÄôñ°J÷ùÈÙxÌÇáñä/h]&ö‹pS
Òóº&Ò/¼$í­¬$÷AÌ¶fäŽn¢nH²Ÿ¤7F¼À“ôÕ˜ð3›“	’´@v´¼w„ëvðßTw`ï¨ºìÒ(ÜwI¡-ÅÏžßn>{Ž­ÑµØ>¥CB‚E…MIó€käAQ*Ó…ÔÌ9#"îÑï>Ï{w	êeù ¥¤•ò`¨ÿ.Óã;ò—K <ËD#SÂm“§ûãñ KG3ª[#G——]@Ö|ž©Z<'TË!pêúÃ­éP>HÎp™¡ÐyaÂ»ôÆC4¨`f—®¶ƒ°OGØ¼ÖZ–o¤]BoŒ_6–åäðc(¿“IÓ/b¾ô'öF‚§`YŽYyBÌ~áÍñ¼åFY»hQiÒQøP‡°½)0-ÿÒ¢Ïœ‡™dO&ÖÙ#ô·¸û%õ§aì=-R}°5.J£Uþ8p^‘…¢»Ogù¹ü­Áç“¬KØ{v
–PÝ&DÅ™ÚZ®³Úà¶öhŽ6»Ó¡ÚÞ–ø9G[ã!—h§G›Ýu½	# ¤·IÝÒFÑæãxMkZè™>vŠW×=tw6xéŸëUÕ}DËã=á™¯ñ.Ü Áòi3¿ï~WoúXÇEØ/"¯b
^ÊLÔ£1îN³ôeÐXŸƒ\·P	ãU<˜‹Nxb	~‘‘›B´GÈÏ+”,¹Äv’ùl‚~F–“£Œ´7#´0m/Ù?ÁBËÉþ¬Da0ùÉdc€ë¾È2|
7©2-ÊïàaV6HËýñQr+!
DÔ[å›©-‘ñ³¬£ÒÃ¼Ò™ËÉ3þ[Ãài¯—ì	ôÊTåÝÛ„Œð\Páûò{qS=·ø—)ÙÎW™˜¬$"ÂÓæÜ°1ðŒ‡ ¸y+YS³ñ°Eö^,—r¡ €2?–T,ƒÉgqÀ­‰T6_8›ôÈys¬ë2g
l’È¡°¹ÑïCñ•ÌÿŠ‰á/:/ö•Í‰ý"ó!G]™Æ±‹83p„–Óº…Ó"lá)¸P“5z†Ã}¾AMÎ§—µ¬é¾‹RÆ-:©½1LœMòÇNæŸ-0£mÙªKÍÀÉÆxxøL6›ÅŒà Ÿ14Þ+*ÅîÆiI=èB“&&eÍ•ÒY!ÛCè›†ÂüØh„lÆçf;´!ò†g²«nŒóå³aòì#Ö² ¿ådUY`‚þ6gå¸]œŒºÂ’Vþ`<U`Ô{äU³oé[¯çL%¹Ê6»#sÖ(e[ŽcÏaH;—0-ç9ËøYjqÜlwý\0‘ïýdCY˜Ïwv7—“íOvö6.'[O1Q$à¡ÜKÆÎNäÒù×—ÁäÚ¹TæcdÛÆ£¹& {úÉQ?#Ðzà!“›¾OñÖ•·Õ`\Àc‚!RªÒ£ 6ÊŽà`ãÙ)6ã®¦¬Õm[¬×b8 ~E‚.¢*a-eq÷Òn_‡voKý|d±‡Œ1û€euNk…!ÍGØ&¯›ä=†«ð~‡ÐWòçsHá -Ü’ýžÔb>| ±dÀ°*z¢Ž"ô– ÏHa ÝšŽ§4ÎGt¦[­1xhY°¡¶éxQÑ,(¢ãäÆ˜Ð^ÓFK'µã¡³3åU ôãÔ,èdt«Ò½ººq°Æ§û°½ ª-ô=i™ûËÇÍ—Á¡'jòìXÖæ¶Zl1Œþ´ý²ºìÕêÒÞ{_¯b÷¬»µzÔ¡ %’4é"ƒ&_96‹ÿoö¬’¡ovÕ—p©™Kfgax]ˆ“OÒ‘C(|Ï~Á¿J‘½ñáá€’‡Lª–2DŠ×™‚vvÒÑëQŠg§wÌoÊÆr·mJu ¡®F½f3•ÔaÊÉ>µË–T¹  î>ãº¬&œ¸ìIÙÎ¾xx¦´¢–~Ææñ\¶+°3Ëš‡’Ð[È^9k>WšÆÂÏØRÚ,(p–¾æð´zíŽ"æ\…¼Ò”^¦Í)ÑNGÇC“+n@Ê.{¼¤"Jõ”$÷MÓ/½_	B5_°ksµÙ× 
)†¥sq®)_¶Ë@,ñÙ¥GiÎ™šíq·ÙƒûËÈ¸pÐj,ë ´¬Üs&6´®eøvÚtoDÒÙôU6o¹¢L‡“&§õeTÛ4Dºßéæ[Ã7¯ÎòÜþãŒ°*e·O.4Pá³SÀÇéÒòÓ‚ËÉ§“ŒÚ¥‚¨µóô³íÍ½{ÆüyoD[}*Bnÿ‚g}9‘û¿?þÁã_ÿÌj'Q,³óDCþâº'‹0„Ü|¥WÓn>IwK‚zú‡wª,“¸«Î+[t/¯l0Ád§1Äç¢A!®ä±¾|‚²£,JEÀ˜<Ë}t¼Ç‘`2ãÕ6¦¢3…y	ÅwŠ¤R}@5²á[·€ÚL§	xÒ» äù‘\é%h.NÊI&­yÑ¬hÎ#˜›+pñ"°°%àb˜r6Ì¦y×âmEÍ
¾ÖsTÌ|Yé×Z.á×Íå\â}½¼u› ¨N½Ot@^4¡nÓoÆØ{-3°ÎÓ ³BØ“‰ÓÕL­¤fKR^%†£%&Mˆ¬€¨¿5îÅ×wÎ­´%V¬Ü˜ÑÎ D½F®mšO¿¹•âzÊÝŸŽ™=¤´…ôÉ=w¶Bß±MõÔŒßRVM›¶Þ”6q±ê®*¼dü§òTK8Í_»ûåE[ÕÝ:–—ô®C¦c8ð<›·w×©LœÝ¼è€Ìýçâ7v–$ 1\§åäs»²¾dxà‚:d)D‚;Ý@ÑGah’}E‚RÓ\:"5c©ÖømÎ;Íù¡í§€´K!"0zMÑÝd<+P$Î$I\äÚVn«m­n%[k¨@æj¤ÇUlÙ)í°Ÿ@ý¸úÜUµÿ
µy´qø¾¸–»Ó!o˜|•í~nU[ò¼øŒZLÂbóq@Ç70Œf¯ÄÛeýÒ&ãÐî9ù›_ò	ž[ùSì7p|<'€¼ aRKvþ—¬°°åtkƒ««	cÈß<ï@„ÄYNö5X³”Òté3½ßçA}¬”Ü§%÷Ã%9ƒI¦î‰ãÖ¬6%.-Ñ)ùãÆ€Jõ}»:‰£ºR;¹‰¥ZÑ¦Äí5ÂÅ­}l6s»f3ÐJ{Í€¥UMÓ®)‹e¿ëÁ²›:rH„íªyÀR_Ø»lhîÛ^)QdvÓrg!òìyë{š[­ÿ=Íý=Íý=Íý=Íý=Íý=Í]«ýoƒæ~ËÄñ÷ôð5=lÒ‹ß%¢XPÅÌùŽš‚xHa•)	kOÒ1é&íáð‡Z´S‡*Ô>B:æhI\+ƒšZ˜êÝ°°C¿£W;Ø§uöinl—,ó—åø%~gãÁïvùŸ§ƒ1-ßhYøf—<-K¿ÓÒô»]~2F#DZý 5Ø»
štÑ
ø•Ç¯váWhceá-*0ªV²ÇÍ¯¡0ûAË«è]«Òûl(N¾Ð¢§b1vÀøžmÿê2ß[ò¶‹üá{A¾Òe&_ø*’¯bÈw6sòNkuYŽš|Çá¬j‡ÎRƒdŽšu Þdç ûýŒ\èY”Ý' ›Øì–3×f|ýßC¿úM€ÕŽ Õ^nö”3"M_²&|‚ï½ÊF¥r,2ô¬!Ï¶³ƒt6(ùÎÍRÔIý–‚G¶7¹O&íÏVÁØ×oëKCûK%:UÓ£Ö¼Ùø|–'ƒóÿŠ×!%øZ~ý7'èrù7É^ÿü+Póo^ÿ*ÇQç¿-Q§ÿë”~U&Û,ë¶ŒR£±œ	SIÛ!½	ö'¬–j!9;ÆrÓÅÂ£´M`Ý®nÊœ@Ñ›LW`ËzÜS4ÒB[:r •êåÓ ð
ß \á/…VøÆ€¾R³ãç‘æ°Ù—Ö„ý¹d"£&à2f™ß…4™ËNÏ% X1]CðìëvëŠcì3ÑÞóx7fÐÌð„Þ¶î&{æ¯èMKoÙ¹š5Ú'7Å-·oPSîyË»1¼5„XõðîðÖBh²ê°;Ä[‹ÁžU_%ÞŠT­šôNñÖcæôf-óBç&`x‹+–Ýžâb”6k6Šw…pÕ’¾«ä²•<(!Ñ<ÏiÉ-iž”žs‚ou²áž‹8ÈÆ!”2SŽÁ&ƒMl¦œÒ–.	 %0½4TiC¥‡3Þ_A gÊ ¢)5õ)hÊzw¥á™âd€e%®†v»F–f7öùá[†{ýœäX<p½¡N…\4„:»õà`^9ÖÝÝF{Ýjé#ÎcÍSíE"5Å–ÍÌ`ªŽ§Ùz}Öö2[Ñl93§õ·YE3ÍæwŒ·ÔÛõRån@Þ~ÿUÅÉ'P[Ç,¦•:SUÁg-û¦'dm{¬•Ê¨
Ù0	ê ¨¸vÃ .Ì ËÜÀow0I(Ý@³èyx)]ï³¬Ÿ!îgèDŽ²´{öÃ7öšB”UžÚUTÞhƒ`imB‚Ú`ßÕ·œïÙÀoêÉãl°ïÚ %?³Á¨ï³A¿ªï8Ç²ßÔ7
o²Á¨ïC²_´9ŽE-'ºWËº˜ÕˆjNk\y¥©E©Õ‚
,0‹Úœv¥Ùe½×áó6´Ï¹bYlãyµ`ÈVØQîîÉQ¸ÓÉ†i>°ÁP”{
è´è,ïÑ‚òä+èh;üTK¿«(Z°¤·”åWML¼†Ù¦Ì²áðÊ"W<aqY—šåŠ“äïŒ§JµfwŒáG[ŠG6¾œ˜7 … 6±2‡D ˜Yé™v²üâû˜¨…4Zi"Ž­&>8Ù©ª…ñnRh¸êôý£ß\±Ôd|QÆŽ’fÄ™µæ.ö½ã‡³A™OùÌÉNì²Î`|Ø\¢œx‚ÅÛœX•Ë´±äò:´éz4Ô¿•Mó2»?Èz»WÔTÈ'´­TEK–ˆÂAô˜bIÛ=·ÌÁÛ«Š+è¦‰¯ŽA{Ý¡ç¢ý'¹>`õZbÏ ScóW¦ådÑv¶“OIí³d4.iÄ˜$—b’t:MO^hm+_AJÕ~Œ@G6£Ø±6ŒâYŽ¬_1ÉºùÄkœ$iQä‡@,BðÝr9ùôIr˜Àl?iÊx6;=Ø‰–oXpÉ+hìÁª‡;RÿŠ|Ã±~V/Œ» ]À`‹DU‚lTwñÞW\œÔFãx)ÓL_¦o…wúØ1¼.½3q”•LÔŠg¢6µ  &ôSÚ„~D€'Ì%¼q&ÖJ¯â —\åÌJ.›î0µð-Ì×ÒåŽfmcv§’»Ý“ ƒ[ÍÏ†8TB<“ÊŠGò©¬t«j0«4F„2ß ìÏl”	"^$À†1_B2µ‹i4zKeC‡q	pÞÑ~<.3LqlÜõ]RtõËJõÒcr‚ÏSoêä ò½Í­h;¢ü–Dqö!Òñ-B»O²2. »ã‹Ÿc†úUŠb„1b„XABQ‚&L 7¤ó]”ð`.ñ)@ÐP¢?wyUº WcrsW%)tÐ« ÐÜUA•EèU˜ÄÜUIQèµ¸¸ÜUM‘\è•˜ÈQE
4¼:™¼Z¯¡·©‰BBê˜Ú-!ŠOS»EEübq½¨[úRU«†ð%Nüòv05D0	EìBQ²R£”´1é¬ìwº4ÖÇS]B£·+ŠDq©±Šò‘›íV¥Iï—HàÌÅÝR¹­Þ‡yÙTŠé2„eÿü7CÂ¿yyâ3Eâ4HîNp¬œLMbÙ3+<8‚l½äƒh*!À”ð{ïG L÷Ô¸Žß˜»¾éôL}c„nÒ_*a›ô›Æ±ÆÆ¶7‡œÿpðë……GøÉ“ˆŽ`K	B²%›É†;Ž%¿Òr£Zäâ0CÃ»ŒlœA]iè”ž.ÅÚX52ááÈ‰Dûz6áŒÌôLhëäøüw©<~N‡O××Ñ£¤ý²F2F_tŒŸjÝèD—Tƒ1;¸¶!ÓrFÎVeAâ2'&|£µZ’pøEtpÛ÷ÞóÅã0L’~Lá¤À¿ÄÝè$Rø’¢_!Xò³ÙÉ›×¿±l4Ë)¦eêxÐ±¨©†YB\÷c€kæKqÅX7$ …æ
4xêþLƒöh÷º{à‚.SXJoKz~b<¡Û–‹¦hT”Ðœ•³âŒ~¯^®—U=³d±_e1_TcWzîjœShŒá£o÷°&°(‡É RÆœÜwsZ• ýßÅkFÕyÕ½rŠÈÀ½#Á×ÙyÜÝc$:°/ Oƒyo!lnñàm­œÆ¾yýosL­Ø´wÅ÷ŽyF&óJËtoLËjV <ÛåFE–©;ÎJ^›~:BqDÔî<:=ÊèžÿwŸ€.ž!KPÈôzA[b9Ië©ƒ\õ-Rð5dnlp?hÎH6„õò†î~+
<"Ç¥ç(²/QØ*|É…yZõR}kËÌ÷{D¨—ËYÎ	²#j-É>	¢Øÿ¶”¼æŒ Š|Bí,y!ÃAûæ/¾ù%à÷œMÞp<å¶ž<Âª‘¿x	Îñ­æ] ÷€ùKB	ÓŸ@Îœ&$.1}yþÛQŸ®ÀØYúOÉóõÿ$Ì·­¨’Ãø}¨<®%Àµå.î©Á;•.EÇ‡çy¢'v%—NzÝGÿUÒ¿’ÜÔë­<z´rB>ÉƒÃaƒ»L´´H–GãéË¢ŸepÐúp÷§Y™ŠÎ?-Æ£/Êñø
O¨v7A-„8­<ùb”q‚Ê|Ù³G=Ö&obYaæhs¹Ø÷óA¦T|¥³á¤ìª0Ä‹¦oüûH¿ 3€/KäJa'ùï3Òu†ètÉ6ä²iáJ~ñèÑ°’ÖYçxP×u5"Ü—%÷Ž»ÙÀaÜa#fÎ?»h213Ü…œT`T#½Ôî%weñæõo	Íõ?º.IAþçHögê¹ðŒÚWâ£¦ZhTüR®ÕÁ‹î3*5Óô%.Ó#ê¤j'¤F…«0d~Š6…»Ø;JPÅ/óØ¡×š^Ê¥ÈÐ2u3G9Ù­^Ä*+;(Rt%
ú®ù®UÂÑ…T½‡ôAsTÕ0ÒÎQPSŠ(^jŽ¢Š"Dx§9ŠIå÷KsÒ´ŠKš£¨PO0W4GEº¾oÕÔ¯xÚ…Ú¨S3ÉçÞ¨l=—ÆUˆËE¹
a¹RÎeK)V[ø™e%Yë Z9¶²XkœKÚëm;t°6¾¬á‘–Ýáz'×«€¾ZLQë3&ž.5ÿ;Yƒ··Cqê‘8ÕHŒÝì™cY·ã"#g¸:šÃö4³i)Ö²¬8T.ÆNÅFòòºé£;3^&ÀÍ:î9ðTÔî:íÿ À¬ÕdJÉ\.Î2i|}~Ôž¹*qö”P„,Ík³§
¢òì‚øaæRM||³—¿Rs%rSµOÚ×—n³6¡Äm¡7·ÒiO­°?žö²i{4eIÑO	n¯ø×<ÍÚë««+WW“ýÃöQŸÐ’É˜œ’ƒyÝÏ{½l´$›·Ôo¯u®@ÕÃ)!•²QÙ.Çíir0y
ç+««dmÚ“Ùt2È ¡srÔ> 3‡¼ÎjË0ôYJ†«v0Ùo_ÕF`á`SK­v—Œ€Ô?L'íKÉp¿½fTµ+OÚë0|1Öd
ŸY¯=8´êÒ<ÖÝ—»?›¥ääj9¬!ƒõWêj³ÿmÃ”¹ïåå@k;;!²¬ûˆÐƒè®Ý€e’‡’Úe~Ø/—n&a¯?»¹"5–Ïö¿Ýi>Á@#æ(h—°“8˜aÖËgCú=‡']÷‘ý‚häeŽØAS¯Éµ‚R&Å,Ql@Ç¨t¬ÄŠ„P¶H×Úq6,pÖ%vgûÃ¼¼uêp=?‹iÇ¯¸ ÅSvÝQ–”~˜î†È\ögk«“ãç ¸LvcFÇi7ƒ5
â3 øüæõï’ýó¯Æ=5«Ž½9ÇaŒúpJ®7ø¯M¨‹‚8Yî)ÊTàïñ„©o)Ü(uÑ¿czuŠÉ /›v£Eð3_›cšÎtm÷n6_A‡…¬ü0M5`°#ü¡™¡ƒÕ&·ýè‘ê‚ànùÙr‚iÂYÊdü5í$åÍž’¹œµ?<ž½ðV=;s¾poØ =BÝêX– ñ5@ƒüœ'ê½Á1¢@EãAÏJ/Ô˜Í’ú¤B6½µôø›_(QT\ÑÆW1†üã8}¶¾º~y9!ÿ_Áÿ¯âÿ×ðÿëÏQ¦‰FâMo¢³°þ}™Ü:=9ã€|"M4Zg·É>~(ìV«åÞ49ÿàÌx¡wv×Þ¿#x²˜xÇNáÌ¤Âúwx7ÁY¦Ô`ó4¡ŒdmŒý›_,'9U&äÉGÉšbñÔêLÒÞn™NËæ:ÙøÕF«…§uXû´ÅižÝ¦³OÈ×oý¤:©@ñ8š˜¸ì&&j‘oø`±mš>&@tà¾Aºt ºö’j5ÑT‰ET–õž·"Ê¹uŠ‚…¥ZŒ|ñtž<4|wv’ëò’&³dœc;YÍGà-±­Å-‡gÕÞÎÍ­¬Í}ûnºsÜWUÄ}—ß½Å…Qà­Ó>°¼eÝÈ¦À¼ôa³×ÿtV”ùÁI{?+²l”LŽŒ6klÑ¹t{K²˜/ûc4 \g ïÎÊ’°µ¾³{2Q	–YòCå4OGå­¥ñ¬ä£Ì[°Èk<ô¶y÷%ð^37ù®>¸®’Œ:`’†uè’‡¤RœM²a®6Û¹ÔÀÜ­u®,Õ£i>ÌŠ­|Ú‘K‰ÿÞ€€g¿ªæ¹3éN€¾š¼äÊSî‹f˜ ,{Ž[!ú;A¢+tÀCØ<%ðpÊL 5i_ViºEº´.6‘ï%-µF¶.åCøž’ƒ´‡‹AŽ_Ú(X+Ç µêÍ¨ ³}iu5DÖ=Î¶ÈÒÙxKw7³óa¯¡ól M÷Ûk	ßG1ÉäÚ„¥˜ô »÷ú3BÒt…ÙJé(£	ßwòÃ
`†^Ô{«È›É$qM¼7wÐX†ž½Ô.ÿTM3ÌßÜfây)˜Ís=ˆ©Üze.mº	‰ML¾ù<	þºË¢ DõÀÈ‰–&¾)i€gÆ[ôÔŠ[`TkIÿAóáÊ£fSµ«¸^+Ê‚Els—híG%¿hÕ@NŽžŠ%rüª§ÇÙÉ‡âùT”=rà8‘Nö1©j•0ÖsÍ/˜	^.àÛä ÂYÒ$ßÛ†³VÝû¹ZeD1ü­]<\ÎËåˆ‘…§ô¹´¨;ª×B•GÏðjÄL	Ì.èŽöÇÇ^ÂP~òÞ­Ó`£ÑþP’/ª7»Èz‚FÑÝò«ëÒ”]Yàâ ÍBÄŸN™N³²Ãú -eÝÖ×¯ƒKZö`Ü RtŠn*U~¼2.þa4B¿È¡w®w=¾åŠFAtgÓb<mOÆLA¦šQôBå9y ˜Y]ˆÍ`‹ƒcn û‡ÊÎ…_$4oï|²³·ùð »ÓáEYe²8@&­þÁ±µØ‹à­'¼ª^ÇÙ²ÁÞlƒ°Ék—#ØäH¶TcJy\¬8–´&CÊbG#yîo™õ3¢?>ÿÍ¨ßétÊ8ÑH=v«.³å`µ¸=ôÒmÕƒ¦§áh–Z;>NøÚ\¸Iji½t[:Ý\¸I°ñ^ºÍ}.Ü3Üuwø¹p›hãÍpX|Sµ¸ºž®7:åzUhi'æ×¥:ä0%åù_æBÀ¼’|‚Vœç_ã«hlnìp\H<»uÑü¥ê‹QÃ¯,ŠÃ¯•è5†8`MªävY`ƒh©öÎ‹;)™fd5óWUØs(ØcÝ2èw²éÃñhLŸLÁü2™LÛ—-Z„ÁÁµºp0\8PÛš-4éžà27È¸h­+&©fBšîãÁŒ,í ;(Û—Ð_¬­¬'íršŽè:ŸàõÆU(¹KÜî”¾|óåÍèbá ºú–Ôè…þ­Â& *|“BŒV4S®™"ÚäbÀ’4÷€Éõ*˜¼Iº³ K¡š¬¥>«·ù'JÍÍ?BÝ}Ø'LeqªôÎ»-Zí#òÏXXª»¦Ð;.(''ôÙì‰€|t%¨Eªq§.ýÓlHZÓAñ¢ìÆ£|äRƒ÷É±;j_®¤òCŠoþ	1W—îSå×´»ü'.»ý'@Ã]m:¢ëÀY+ ç*C/¶ŽtH$ÀZ®0-a®ðèÄ ÝáÃÇÚ=ŒÁa€PP4Héònàª9ÕQc“ã-2tVaq+âÉK=¨se~¿Í¬ð™6ÂDG%Ü	5«Å‹†””þò6:`¨éßº:P.,¦’I	 OÁµ´l7üÀZËJñœò›$P«+Ônt8¨” Ü-ÍrÂ¥ç?L¿ØJÚ	sÕ!<ä8Ö’¡Â/d*ßB`ìÐžRm© (hÞ+Lp&†õÃB”HŠ±±è%©2ò-[R·îö:«jìm\ú.5.¹I‘%®ù¥¤7T‹h)vŽ"md:iË ÛW)¬¨¢¥æR,X€;ìmÈŸ—*áØÝªb¨#¬6N4ºe3$8¯]ïu^¨_¿N¢õŠØuÓÝq‡bŒ¢ƒÝÅa5ÆÅÁæcŒ5Qü+#FÀ˜w”çãƒ1‚›B2Z	óû_Ë	v°ÃÔ@Ô™ê1DHˆ+Â·
´p–_Cx¿‡Xÿ‡A¬7€ø|@kÄÝýn«áv‹âÙŸÍÒ$V]ˆ]þÑ‚¬3:ý|àªD‚~_@õ¢ªâÐ8ýÍiDÀ*!‘‡m`â§™{iÑ7„Ã£|m^Æ8S—ƒ&êð±r‘)ž¾p$ã »wð
ÃiXr?ãè­ç÷Öªí à£4ëú}½=Ï/-ö^“Èì	,·<²ý,èÇÊTzµ¾eßÙÊ~‹f©.I)‹VÜÇ«ìÊ`g |Ø9ÇãXu±£+hh´GqÍGê¡+<ÝÒôB™’‚þ>ªÂ@zåTyã$UçÛÕ~õÇZoéœ?„¨Ò¹±™•ôŽ÷ÄCð¥ðyÇQöI_­‹;óJoôÜWJëkXäÔ³Çqœ<wÞ
Eô§=¯eèLI¦t¥<ï¨†áIµÙIèàÃÇ€Â@ê³º4SÜ	}{gTË’+fT¤³äñ^œ-ccâ8gR»c;žZ‡Í©ñ`J‘JvÆÅuåæ©¡Ü#T˜Vâ¹jjj®ÝùnÞ²Êú-®!]Ÿç±ýÜä#JŸyH'M5Ñäòl£ìãô— 4À­À£"Ç{8ˆ0wH"áY/ÛõNÒ ïr¥¾&õò`ÐdR&fÓtÐÓ+ò‡JMþª:‡æ3.ïÆg å¹•ÈUÃãmWFP=É¦YÑß:r½ã”Q1ÉG^zü]kíëRÏ	þØ›]mßÛÖÃßÿÃ,¦÷ñkæOÎÐîa,4AØ(CÛ#<:C4qÑ¯Iyš1¬&üêå˜ìŽ:•)ÙµÌ@MèÀNfŠ¶Šâ®¤mî¹¿ƒ4njþµŠq»2²9«xr´9Ëú³¶UŒ&2][E+1	ÜìOÍè\Þ¼þ›?ý«Qä°¿M=¬§#8Pˆ;âç
ÐúSðÒA$Óò‰y9ß4:ˆ‰kÖxâ¯êq-;;.«GGŽ•§ã£ºA'ÌYi]@°Ô?¡¥8Äó¬±½ž¸©JïõC¥š+AldxN;¶² }££¦jâZÒy½‚÷WdpœŠÐ8¦crL -@ð9Ø¬{DÕô§F–	¡<Îq!^];C#a¨3VÅÓb7!{ÇÓ‰~m_Fk9'¯Ð€ÂÜ~shÔ$X¾ßDÿ×JøTc¿¶ÇG#ÌÄaïnÐOi¦“û"ÓI]²2˜Óð6Óö ?Ì1kH^ìÎÈò)¿7)A¶³57I*àdÓYâçŽzµ ¸,û6%Õ¨I?côq=BR‘ëÏè=ÔÐX{Ó´è¯{ÁržÅ&\%â¹ Ä!‚eœ´UÛ§ŸŠœ0›"@¦bN_Tùb&j€4]q©„YÚpäíõË½á÷ý¶!jÓESŒ &Haž&†® Û'’7PÅ¼”ƒ¨¹‡–ªö†…v£év ú‡½AÃûì#Í¸UpùdaBçòc~¦'\æ6á®gdóz¸áPúwCa°ŒŒæ¯@;ö¿ÿÖ/xV¥¢¸áæ²Åñdlµ:.Ÿö¤[çÆ½UÉD€çÜuo¸%,¨„¢Xsduîc8.O¼š1¦¾ÿÊ¿¹×ÔíõÛYLWœä¸%…òl=j/gU]-T²·„'ùbËçS@o‘#w8žžðMÊ(ëYx¿*Úpïæ¹Ž»ç–ö¢0eýÖg>|W­žÖ•ÒŽ(0J”Y#yPx¸ª.9§KF£ºÌ+žJp?Lq¡_vt	fÞá>—nóýÞ`¶óstÃlsã{ñ’æè¬;Æw¢RïWÂ{ÏÊâc›ZpÎ“võž´7¯ÿ¼K=¥ÊPî„Ú'®ÖRÏVÁ‘šzÒhìfeSÉÐgetfé›[­V§OË&øî½Ê¦EÖda-‡Õa-—~Áç—:'àºR^y²K%ÞüR“¶mÃÃ`Ú«e^ú"áÚq;•cžÍ1¿=¸úÕª,,ò‹œ”ð¾}g=+¼[Ø¯«¾î¶Ø¥UŸŒÌ£é3Š9]€ J²A.]Â‰CØOÕ$9lD#®V|¸˜ j}ÂÎµ/…­éE´8GÞxCþ”ú››¥HÖ¡YíWÈ¹lEž«¬…¾]×$š®‘Ûø
"î†üˆás–dƒ"»ÈX‚Ê_ÖIð½G	I?~ ›+à=e|&@î“¢šëÃ©¹ÂN#-€ëÂc›†š,8i»{{Õ£UFå]ƒº"OöÇhDÿSL(v>ŠñPw<OÿY5$DT¥°÷&ªÓð	†Bá$*UtJ6–›Ðã™@7-ÇSrà³AÜSr @­T„†¨Ú·y6îÒ{¹q<©ù[Ú5t‚tïïyÛå½&¯ò¿¦†ºðÙ¿÷»7¦½üåÞøåwo\Rð»7*9ñ»7.5\âwml`9õÝ³Ñúîesêújü C£šÑl;z˜³0ÒPãý¼«±JË1ZÕ~88^fKÛoF^wö¨¿àÜ#»vEçêu5töÎ¿êVŒ‹½&<®KÂ °Î>ýî¸wâ´ë¨`l–BÔdÇÉh0µÜ|’¥Ý²sšALÒ–3…É8o?}aYÑ šäTrH¸ÚIòáiv<IG†Õ8°šÐ³n7OZºDµ®3+úÎ‹€ã×‚ÄbÆ[Ù@sÅ©%(ˆÔ&¿0q"0p‹D‚š´:ÄÝœÿü¼€ãæîþÏ„³?¾š¯ÁíGôy ˆat;!ÿÀ`½ZðP%¨T:	ØžÃEÈw4¬+@u"Z”LÐî¤ñ=‹[àlN*ì,fËqà7dV'‚±ÅU€yc›41œ´×–Y@›ÑQXç³ÛÆïê æ¸h÷×+çP€Ù¬ï°l¯Bˆ“íDŽ’>*Le*0Å­`uùj«j¤ï`ƒÜaÈ$i¹$Ö@šË!'+Ð-Y¡Þ)†Ú&‚´;/—`Ó87}Blž-£û’ÆGÜ0nÇ¶"šVª8Ô«¼ÝM±©MåèÂrÐ!&ÓwG/Ã±‘|óec¹Ñh]ðˆ/x°4© #K~çÇéÞ‹…¥©Þ‹¡²ïÅXÁBáýVfèðþ¸;¾«ÁªÂ†õp|£›‹`ñÌR2·´ík¬7f»âžãäÜ4ºã-,â7]¿ƒ\´E8ÖËÄZÅô€ZŠ!˜{=‹mÃ˜½ýÑjßM{‡™ÆÞ+äŒ“ÎÂö°dÕ°§Ópª€Ím>BªËvó:ØÓOåîTpKw4çúµÕU@*› þùôT‰Ä!s{„ÓÏYH`Ÿà£Oï¡P„šñ“a¨Â}{”¼<Êµò‹áæsÿÍlÔC£ðÕÊhŒ‘Y
¸÷\Ó¼kºÔËÒÙ \‚dÈÔ[¡Ší®òZàMJÖ¾Æ¹…“qž(å±(*|*g!ØˆŠ^³0|&¢Z×½(.ë¹‡™*ÙGeâDÛãž-{lVÈ#!r„ì«ârIb€±ÁÏvøTW9çˆ.uAè£qÏ”€šÒJ‰(vw
Ã^@ÿ  ÿÿì}{o\G–ßÿú%ÂØ&=dó¡çp(jeÊzÀ–¬µhÃA°.»/Ùu÷íé‡(†Ó@“d6e6Á`{ŒÙ‰“Ùìì:@0"û½þÌ'IzžzÝ[·ÙMR2Ø}oÝºõ<uêÔ9¿Ÿ÷S‚ÄŠ¼Fwï×ì·w`c‘FƒV ‚ûà+’ŸB:R–~œÁSpóÅýzùÇ5\2ÅXM],bdáGY¨ö~àV#_iCJ”z«³/)ñb-[î¥ÆÞ"ö…I8‘Æ6úJ„=yJn'OcÞVø¤ºÕK“çT˜wâð„|´õ®>O÷úÆãUÚ
ï'µÆ¬dûŒœH²(Üõ˜Š*ø‹s~"2|:[Døø2PEœ-T»ÆçJpƒW»Ã~c¶ÌÃ¤ÖK©ŒEË=¤pc =LÁ’	Ì™œ™À_¡êè\(÷ŠAò²8Á"S:s5›W±¼\ÍþFÖÙnöÚi]4(º¢Ø›ËåÉÂEoµQ'¡+e‹âZ•~ŒY(Å€®2³¹ÖK7\¯­›Q]—È&N®–MC›_L^‘b!è+ ùÚÑJw’ÚÞp'ìÃªÙ&ûà8`âO½€±`Qì ùq›¼ÎÍ²Ñ—ÏŒæ:;iB/Ÿ·iëœ´»|^Âè¬3CVèò¹1J_ûY&§(=E­¡Ûeøm ¸„@„2Ëø±–Û)-¶
‚m´ 2Ojœ¶{tÈ I_Á`(“EñJËºÜ
È×JÑ\Î®EÐz)	a07ñ ¢{ïi"ðÍË–Í‡â3ŠïÀàI3Â»C@ÀKª¸1èweQñ‚¯È…¶U› ŸÍ<Æ†]ºÏv«ýZ/kµ63ºùdÝU²4O¶ÒFò¢™õhóöÛ•}•¨aTàBSlÖ!dvþ+¦9‚;^ÅP‚ÄØq
,OçfÍõšrŒ³)ÙxÐ\Ê8º÷Š‹œ'÷û~H¨“¦.’Ô‰ŽÓã{¯ä9ÕòO¾wiî˜÷¥Î¨+*H|°``…¹\Ë&nXîÉ:[ÉZiño”ð_½I–Wè¢µ¼lQYuº\>Weå^jä<M>½m¸á#ÈöýMsðÒçŠ	¶
WØáÐõ¢®Ò$9çðsøóœM§Ì½q¹IÀõH>X,J•‚ßtÈÕŽèÚbãr\kÆ0³yÛH±$vòr¡Ú¬J*È}¹w{4ImØÐiÇU‚­¤È[ö¶K˜eû#Y€¬—EË¥UæN/ù*WÌðjÖk…¢>y*Ð”sž4#üÿ‹KßG˜ÅLÜ]ºž8Ø/ä}ÇüeÅó!sÐù¼ÄÃ·1:T@e$&J	' ¡èü=Ðc"ÝäÌÝ,\°Ô<ŠA×¿•Iâ™u5Ê
ûKÕTb·Q¿û®Ûƒ„wPÂVçÇÛ2•žZVîÐcä
tÈTJU	ÇWFtÙ5è2Ð¬˜gŒòÊ_¢c?_/Ï¬sx!Þ¯q›çP¹‡w‰¢w‡½n+ÕE¿ãŠ®ðŠ&Qz°—)yÈG'¢Ü,Ôpü2Ç/{Çl¼‡¢äZ¤Ê”›s¤sP0»n9Ýö‚ÌµlÐ «ÐNƒdt©möb”PïÇvšD§V„ ÞÕÁ”À`ñKJpÊy›f½%¡ÙÌÈfcHuµ9!1Ç²9¾‡9¹ý£$¼ÃàtµØÿ2ðñV|1æ§C›Ó{4z)N‚UbFþ€Øg‡cõô˜MÊ‡‡:rŒ1ÓÞï™;a¾b˜9"&eÐvjôS½9,TJ2æ#FV	Â»|bÖ’©±7ú¦>;ÛÕçñ]Ø»Ã&Þ|jîfµC+ÇöÄÆñ&æ˜6ÆàwˆÛˆÓÃp·v,J^¥C'™cMƒ¾O)ëŸïSÚÞèû˜Î™WÉ.@ú•nÿÆ	µ7v46ZtØÏ±Ø‘Ñÿ±,˜ƒlg§•Â9Æž(&³?1û¤:¥ ;Ã±¤Ùñ4f£Ù>ú€5Íg‡_Ö83W'ŠÝÛþÄ$ÏF“«»Ã’³@üWq8C@IÑ¡
XýôgÇ¥»(˜ÄÞ“fFÙòìÖ¿ðŽÚ)Ò¯ÍÑ3&w‹|hNr¡S§²¸Ë¹`éwƒ€Sé1¤ðñ&æG»ŠZ…Hê5G}¸óV¡¨£¸c3ßgØ­Ó±§ÊÀ;ÉÌ›`ÌwZø>±–Oô9©­SéGÊèR™Gf›g®N0Ôº4^Qw¹Ü‚ìP! ®Dñbç¿µÐŽYB%
„©MÓ«X´Ž·œLâ*—Ÿ‚¹„K@ ÿÞÿ±@œgA””—Ð\PÝÎj³uø·5O*…¸Â±=ææÉ~ÙÝ¬5“§å\i®'Ã*_BÊh³éâˆ¢/Yt‰'ŸR%)ãïXJ0—waÜm¹$-Å¬ët»˜HÈNWNv— f·ž,CÔî}i$m»÷Ù“!qõ)Ý­—Æ¼ûŒ^Ê,´oå³Ù<:øËŽ¤Bc¥ñŽðÙ-){JMÎq¶c†Ëõ ¾› ŽÏ]b$P·G•ŒR¥ëiTŒx9Ý˜jéõ:­½2­TBÊ•šÑÚ"Oí²½+ÿ’«ÞòÌ¹’ëçgÍÕÑŽþªÖ0yVKO"«p"ÒÞ4 ëüÎ¾‘¬KÌ‘5æÒÊ-O½¬ŸšÌe˜Î¬0"ÝüD¾Ÿ»ÔV~ pû¢æ‚•G™=S™6/á?Â§ä{)RÖÎêÒ¶7–W°iÒˆçFØ8 @Ÿ—æÍ4°ÌPuæ(/=ëÍ>¸ÁÕoì7û‚ÊÎ;åº?$Æðë”Ë¿S2ÊG†ñ¢\îË*Œáè)?±*züö·,¬k§Û½´ßØØ5‡x©]Q~Žýn³Ã(GW©~Ø€à€jô<©â;l¢@•þŠ´ ÞOeè|J€#Í%¡33ŒjÄtc|“|…P˜' Jžl\uï~ÑipAÚ{Ã/öh“½þ½rø½À8^w<AóÃÓ-x­A×«ƒŸu€”ðD[“~O+úp¡èºFÓ’1»ôu-NlÆ¡Å‰áˆT…Iâ°M
ŠƒgmÑÐõ=î·ÓE0³ {>ÊyW¹(¯Äõ×ù2
—F~Ï)sÜv…¡jüÍÃ»dãèà¿?¼ã%&-ó»-ØZŒ`fÚ•¥_ÝÞŠ‚;ñrñˆÉ³Y6¿<›%ãáœg³l":ôl@<ÎfÉÐÇÙ,\­×>É‚ižã"é‘M¬ÉLWïKy.'¹ç2Ý/¿Blã™lX²®r¥\­>™¯e”ÖXx„ž0­ù*]™v¸ËK!MÐè¥ñ$Ø÷pëõ x³©Òùú·{†¦jè¶ÝÆá	UL¿êŽÛ—¥{D<à#f·ÜŒ<**@ANŒÎq2dŽ'IåxÎ,wÎ,wÎ,W¾ãÎ™åÎ™åÎ™åÎL¹Î™åÎ™å8[[‰B­í/ÌÓÆ·°íútÛî€¼ÆÎÎÜ©É±C¡ã³É©€æ‘3öq,qc™¬G?uÎ<å-ý9óÔ[Î<5Qz©Ó —:KË›Å/uÒìRoBYøæPZŒîùw4SoÉÔD15q~¥c³+(¦nÕÃ±ˆ¦&Ð…œG!@‘!<* #ÊÕSHEk>Ðqš7’ø'XH´EÚ©çäåècÞ)w¥0¨}¿Ÿl§wØ`mB8ëÕoæI¥^_|ð€Ü»·ÚnWæX$ToW‘ž¶^ñÞ^±÷g Âöˆ´Ž×°.n"8\p0KYíw[ÍÁlåÏ+sO–žqÑµ@p„EùÄG¨ML•Õå¤[
³ !a*8%]hÇ¤¾a~²âAé.[ó’=cÎ1Ør&Á”sÂ,9§ÂSpûXD5cÔLš fÂä4Ó ¦9JþT0òK“ÑL„ˆfÊ$4S# 9.ùÌ¤‰grIg"s‰Ožðq>EyD¢ãÐ®ŒM¹2Iº•‰R­L‚feR+“£W™µJ­Êñ(UÆ¢S{‘˜Â1…Ê1éS&OR†6åìHº7˜"åXô(S¦FƒÅ²–ñƒ2_¼¬€Ë**ÂDÉRrµ|)Õ+@=Q½R€uæWÂu¹ØøRŽa:‚°ä¡…l°+Ñ´¥ÓˆoÑË®xÖ‚‚B”Ž¢¥£Ýò#(K‚èQXN¥Cg‹"f‹C½)‘ã”DF¤NÍVàÏžbàø€'Ñ8oðÄ#"“w©ˆÄ±"¼«N7Æ0÷ôDYcO%Ì°TÑN>Ò°TñN:Ø°TáN>Þ°TñN!ä°TùN:ê°TáN!ð°Tù&{hdN'ÄïzL¦äwiÊA~¡x‘~cîñ~i§o4¾ûCBj‡ß¡{ß¾:üÊDKš’–sü¨=G	3ò\[ÜHzu¢Ž_–¿Mô 5®È’Œj²€nc3 Ž¨²%H¦—&!5‰üDŒÐ?vÜÛo+MÿÉ¥æ²¼°¤™³Íz=íþ
Ìgå¥hŸŒ"\ùë$üêa;»
DW	Ú›`L¡0Þ—øÙænèã­VÚPFÚlf$l™4(ç’£¾{´m¯?¥(†¢$sÒ¸äÒ`´'õàØ‹ýCfÖ:yyøMrsm±qÉy‡‹LCû9äý Bm= 1ÂŠÆ²ŸÑ]#M@´UGbF´bVr9°ä6:—âŠ9‚,s„*cL¨¦›±w¢~Mv¢17Z¿wtðw?&ïüÇÐ^L–+¢rÀºÛë Z–SÜÄÙƒ(çq}ü7>3wÓ*}vøË[þÊ8d]X[4$…–NürP@½7l=RÞ„ç‚êíTß$¤AÆiFõ`’’ê=ša‡J*@£ªŸÑ×ŒuòçL$:Þ áC!Ü¯KiÄÁ¯ÈN£ÉˆôùëÎ%Ñ|Sé,J5.¹ti‘Âz¢Êk.ÌQ¨ì”çÂê­VÆŽcrÒŠ!ý1‘%¤S¬˜èùöÕw8:øª&¢«äSØ Õ¸cx}­Ã/Ú.[cï½QËo¨?ƒ‹—yÛ6a+cÖ&|6ð˜PËÈ§ßþ‡÷È§÷þíÃ“|.¾¨Wêy’½"OŸ0LHêM‘ÌÓ/=»bÏS°ØsM±U(„QJ÷œTüaƒ!™ßÁçž‚†°~¹tO,CÃÀ©å$*òÅ‹½·Œ„u
'rÇ„‹.œ‚Ú-UÎÆY6“–ÖòJ`ó,o{ÌÁµRºÖE>yÔdèd·@´'±	4™ÿ›|HW’ÿ‰c¥<É…å~»›õÐ í¬0yéc–š~{UD©\æ€ZjÉ¹¼4Ù%Emw¥HêÅ‚&‚Ùå¶º¤h&àÍ/Ûf+}Üš‡~#MžUÈã€àõXózˆ.Ø°€üffý!X#»†À~ÿe-mÉÑÃ2ñ¼Â]Ulêsƒ >Ì³Ð@È[îŸç\Ç·VL_gÅk"] 
cPù4ÔÚm*UÛR¡l ¤8¤>Í«¦XYk2•Á^F-N3¤Yçß†ÝV–Ô˜>K—îþ ë¥uc=äskq)rQëLðÇŸŽ<#±•l¥-Ò´[w²^ô[- 5ÅíF¶ZŒDwŒå©…|5Â~NÑ*!â6`Í¼À{£_Kh=–—¾`_áÒˆø	«uPDQX>¢€R{S}j"×ÿºC _Èàèà‘öá—{d ïÞÃR¿hYdÝ\z¶q±q'Ë&Àd—“áaÇßÙ“ÑÖí„ÿoš³6É*.Œ7¦º„v-²–¥0Ó¹êòu 
|~ß".¥)o–K7ÿ}Áhjª=‚ç…Åwß½@Þ%·³Ú£^F«Ü§…|tàcÛÈhƒtRÚx—ÐY*]pAŸ©§Ý¤7 {ª“SSË:5*õ¬6„«ý*}hñ[ðæ~ƒp8üvÚÎf™3¹dôf‘]óúÂƒ¤K/í3Ïyˆ½³ë†æO†,LO_cÓ3­eP7­»~Š³O$“ ~Tß¼Ó"êý^/ë±Ü_¸¢µÌÇiÒ«5àZ=Ý¢­XÃÆi}ÓôPV—3|ñspÒ[÷;ú0ð˜séÆ´)O™·ô#´Åv²Þ^à1÷6#Áá_˜®øªœpY'¦tôž§0öX-/ŒÌ07>ÐžÐÅaÀb—væáµÕOö™Ïwº&‚4¸Çù<ÕñéøI½J*I¿V!?%:KÙÆ^<ZŸ\‘"þEbkÎó«N¸Ÿ½.×‹fºKßuÆâ<êÔŒ²ÑJ­ëýx<µãeç½Q´ÅÑ…­Ë×ë>ËbSÿvÞ7ê ÁEiÂYÔ€h¯Û¢ŠhakÞà×ùöBQt§A4ó`¿t÷†î¨l9S&ä #WÐMñ2žûˆ¤Tlý–“ÿ-Pñö¿1ØfÙ CK8ËPsÂ[©TJ	o÷LZm)}hŸûÑÕ†½µøéOÉE³âsTV†½ŽÊšW‚ý'î<©V«òîÓ*<>;›Ì“-Ã¦¥K>eÔ×ÉóUü$Úâ‰¶‚‰Ä¨¨¢Ù¶È:€0ÚòUôOu}`TtUFôø–û¸,Dðq”{ÕK«+ÒÍýÂ2à›ÿÈÎf½d6Ë‚ÊF<µ$ÆBóä‰o(Ì,úÂKLpQð}´ÏËµ÷©+Þ	šÛóp@#EN=>Ôaƒ,éª),£³êîº„ÊËáÑëßt0o"9Ù^®”•HL/T †U¨¢¤}p…²P‹‹tzÛ€0°c€¢[%3nýxéjuù:y¸ìHÿ®C6pîÿÿno†,¬ë42j‚	šïUš@ÉÑ¾bá‘ÊsCƒèúé'ÞÉ“¥§ü1k‹A£m•Ç››•U¢ upZEBoWDœ. D©~ÅZ€¦’AwÅ£>èöc°,«óv™ôEp‹òÕ]¤½#ƒ½dØ°Ú†Òrœ_™ÒBõBé ¥X¦2pÊpx8«¬„ÌŠÒ=Ñ¡²µ,p.”ò#ý)ÒéØO+ÕÆÇdï„;ˆûËT6¼J	(2™û€ëÙ`ööcsUÕÍÚNÚÿŠF	ÖdsïU“N£Ã/ªÄ<B<†û¥Ñ°×2Y‡îUì@üÊÃ8õü[š’Ù˜3›Ê˜³w×ßÛ{¿4[üYñèHKB4ÕwaB}öáãÏªÃA³Õ¯þ«~Öù|}Îìb³ZˆI%Ú2‚qöy'Ý•K‚}+é9ˆÈswkž¾užÌÜÎšŸ?Î’Áç÷2úw?»ÛkÂù`+e©ŸÑ”ð^ö8ûü}ú"B‹”²0Èû?}JlrêËVÿå3‘+’ýa$þl…î¿âoÒ™ô­8zF¯Üé9 p EJKª ké,ØÊ…¸¬Ñ½V¼gµ èš**sà)ß@“•?£†­x@þ–©Ñèçàé žA—äcbjñGä<û™eéX5ù’Nü)tA¾]cøävXšG\š7ËO«‚ÑïÆ+—ÐZ¯{ÃXvð~i¢TÙdÀû„îˆÄW©™Ó|Ü•)Áé2ÌPÊÚ-ºï~Ò½ígíí½Dô_ÖMjÍÁÞÂ¥%Ãö%/[äžâ2¯¼*¿W±—ÅÙh¤/zYç“.«l¨@;YÌ«„zo½ª>ÞÛÆkCù<Ÿ´"î¼o/=ç5p$7N.ÜÃŽ~Û>É=ûh0 Ú­…^Ro¦ÁÂ [è‘í^ÖÖ8µ´‹³…î°×mqGÁcZ(Yá\š˜îV¡ÍÜÄ}k×WÙwÚ¬ð=í9ò°ÅHãû¬ù+&`¯& ÷›wa1ŸNÅÂqlãÀGˆÌ3ëŸü=iþ‰Ü;:ø%é÷%ùöZàƒQˆÛt~õš]6á÷eûä=i½9lÎâmµFóèõ?»‰—‚+“µ£ƒ¯©€šRu‡yT™§?V1¢ÍÖc2ÿÝí%ÝñSðl†%æ[6œ>Ùêg­á  #· Š²îÂòâ
áG¬I÷Ø…Ý…ËIÒw„$¯Ý–ÛE†/à8g0œ¬Eçò™M Ü’»‡y¶;¨V«Pu<yZptOÀÚ$(§úíUøÁsñqeÈØîúƒÓ_$­!Àœ[;`8u†O©íM³ï‘róÔbX¾DX¤žËné‘mÖ?…ûÞ2ã„˜(þŽÍ^sgÇ”Ì¬gPS‡zÃí‚`„WœäÍƒX§²¤Euï¤g¶"Úóp{,D}ÎVžº³æ³Æ4c?Î{8'Þ~mÑhÓÜv÷x5à&/vVðäyŸ6¨33	¬ÃŽè÷¤C ;l è>ì+Aÿ,k9†^ºÏñì@# Ú'·é¬’•Ë ±Î~>Oš bg£7ˆÞ… i•ŽrŽÝÈ~íÈ_sd¾0ü,Y4eûÁe„C3Wí&õÇƒ¤7˜]™'•¥<Èžé4_™íªý˜^Ê«	ð3G>{gr-¼³ß=?cè„þŒOƒ¾a$…ûž; dTŸ„g‘-f4°ÃDÿQ
Û˜
^A(’KÎæ ÙŠÕœ»„!”¿/n-1l§¡%%,£#—‡¡7öå·Üt’®JI¿O~É
7%jIót°Lƒj›sùÖ,z–ßØgÂ)XŠ/gbÅ7OJó}+íÛ±îóÊLwÕÿ"ÓšdãÑ÷xágÑyÍQïy)˜¸òß:³.Gç*ùôþã[c¾H˜ÏâßuûþÝû›·>óuµ^;þUŒ®è5SYôÂècV:¢óI7Ç÷Ý“&O``®é½©-ìPÚŽlö»>Œî{ƒF• ÷+ÚúæÅ`ðÏgÜ„ÎÆÓê_ù(RmýrŒbÞ1à8!³Fu(ÎÏ{Û×Y›ü”£Mmz‰– ˆ^âûunêLÑ<Gíé6&[ô•2lÑrÌ°Št“ÈT§‘r8¥s(¥Ÿ,/y<, |‡Á¬Û¢£È¨%_ðr™t1%ñ$KEAÌ=‡]H@>
TõÅ=tPF“×‹c¬û~zéÐ»ó€óî&žFß"&jÔ¯˜„zº:ÉÞCY˜Õž
’»b¢Ô)ÔUT¨XŠÞ/X£ñ‰—*†8øD
u­P›Gÿ¬~§X.±Ä”¹ÐZ&¸ª¼þçbÞ“±V™…Ä<–àSÜbœ‰‹\+ð%GãsAWãB¾YÒ¸Û£
T~W–aÌœœÈŸ‘~^k@ õßŸ1sÀ¿’Üœ(àr.à19Ýü±VÖéeøbGø^öÒŠõ‡í-º×”.+ù¶"o\¢aE1BØá°¹CÌŠTS`†êLºsøEfA}àjáÖŠìr (sg‰Ecƒ!’ÕÀ€±ýg™+É÷7sì„‚eReÿîÖ³Ý¤¾ÃÉµáP„§PŒ6ú'à=›a¸É0ÍO._Ï§¾°ÇÁÎˆ¢‰+s,xA"¾<1qx+Ï0oD{9Ä½^ ¼+Õ+¹4â+„±P-ìÒÖì+Jq£ÃàM£uÏµBjq?Mõy‘,¬Ñbnq“YÜS'H&ÕQº//£ÊO†Nœ1ˆã^4»×èù™u4ñbúðí„4ÕÈ±Í	YsÁ;<çZ ôÑr`JÄ_´rØÐ¦N¼9\dçËùtÂ9­gã#óÚÅ#¿=µ-¤­~{ªZD#}6ftÙÕê
[´ý5F.Ù¾
ûjÊ¢L¨²’?ŠHÆsùé9‘L¿]”ÎPí¯IáW¸…rñ+ì%J©e®Çl;à¹§>n>›åœ3fI!‡ËÚû{f¡>_n÷˜Ú X<Ú‘Û…t.'7–„OAÑXbB2 mºà±‚ÍŒú3*ÈÐòP˜24m³ðÓÏZêØ<Á
>cÏ“— (¿¯°&“áéAVw¨Ž3nÂ®ûÏ8¯2?"çb\yóN  %¼>Æ³0]ÄÄ|§˜aÉÓ­,êáº7ýuWíP!ì´bBä'§tWÈê1ÞÆ¢9Ÿû_ªÈ§Fhäë*ì±½*¢Ó£ÛÆ¢ÞµFŠxœâœ@œÌ'êâäŽ}Ü©ìº68›Vä+â>ç˜S$kF”Ç•¸€Vn(oÔÆR¡%ôåX¦ î#NÚéìd{ÂÚQn'kšýÀýƒíÊè˜Ðý±´˜¢`‚v=`°Ñ>úµ6ì¯‚…€ª®èRy¨L^‘P4|Ï¤B'
ž3–jS[DÕ9¹‘à	µ°¯BÞÎjˆò(ÎÙ±Õw1bªD©`Qq-¢­çB’I4ŠEšÄJÐLÉe›„
4NQÈOúiÏìÆ)Ë1¤ˆÁV’±ÑÎc£Û«ÈÊHr¹‹sˆá…Êµ·É¢Ïï¥}rÏxÆ¢ZT¶ñë†ñÐå\Tž|Ç`\”fñK†”Õƒ²`_/L=Xhø)5DýýJV‹€Š•gççFE_ã©òqïºbë!Úî®ï{ÂñËØ'Uu¥É1¯CEYyØq'ƒ8Çœ6³í/¾ª"Ãb	óÓ›^ki`üUYÏ\…Úvm
U.´4N¦âS%<6ûŸðNòÝÉßûÏ^ÅÖ¨®w;Ð%_`M›aºÁ#Û.vCºÙ(žUwòÆ¾}ÅzÀ‡)}íÍ«ö›Œ‘tÃYVb¡´Ò6ûâÜ¦Š<Ü¤Ü'•jÏW¿pB­Ídï\à=
5úÆÀ}ÜÈvû¤Îî÷I¶Í[!‹E$¤ßMkÍm à*ü"hîBm7qC—1°“b0ìEÑÓì»Ýaìb<T§DŸ$$$%ÿ¦Ž@':#ì<4*ãýº¨( Y8¢à‘›ú*þ³•‘5…	`šƒíc7‘Àù›MtÅ½¯b&<k¯³5;-tŸ_P°5n_°dè8põ…Þ•@C¨ä¸Eá¾&‡7ÚIAaÐ0ŽÞ„Ó¨a<a ELÂ†ñD^1&àüb1Œ§AˆåBá„%œÄ‹„(|2žÄWÆ·Ú`ˆKe]4è'­´0”ôo#Y/}‘v†©ÄYb?Œ`.àw](±6‡~¨’ 8ƒoÒÉñþö6É³6J¡šÅÚ8!:‡,x\OQwDÍ‘xÖWüˆ5¶Š0ÆYqrkÄ?`½â'§€Â'ÌƒõÂäÆátajsœ@ Ðc`pÂícUl€2åH—BŽmFªÕ*üšw?¼`4§ÞÉWÔ‘}ìG`´ÌÛ7õ¸pnÉàÜÐ}íÜB½êÜs°Ñ<=åÜ}â\W­¯ï°ÉCù„|ò"2>éïuj^IÏV;š’*lõlWšñf+œò¼+k£×ÿPã:¤=<:xÕ1°Ã#°
Ý$›ˆ@QÁ÷_ÒyëèàWäÅÑÁ¯›Ú¨4ÐW%ÃØE™S°£ìÖ ·gIn¸z”ì1`ÿh¬™«Sî ^¡r|ô*B¬°h¥ÊRð1V«¼1cÅÊtðÑ«Vp²Æ”+Wh<Â­^ááÉjnOâ°tÐáU¥×—uRµ’¡tâšNÄW3”.èÛÆ‚†R¡ë:±0Þy”ö^¤½Íf›j¹I»;+íŠ£I¥~q‘pCº­ŠûÉnÒ”—ªÝ°Á­oÍ“Š­ÉUR0haóæ8ŸÃïzL'y£—u€…i·9hŒnÐ­Í€ =„©ÕÀÞfÐGBœé"â)LãŠE7žzzú„ñM>øP™n”zÞ¸›lSm¡*¨*#¨ÚÑf£…hw“As«ÙjöPö#|ülïÄijo#ÌãZ¢ƒ©%ƒZƒ®ô6ÝíÌ9í“µRµ<½ô¾ÎÙ¦Û®´¾:Ã_9¡—¨uO*{XI7ÈÉ,ÔÒ,¤•“ü€ÓÖàˆT
\UVV]ß†Ž§™'uÓ;îÙÜë¦ÕOÝ¾µù¾oËW\ð£.W/îpƒIfÅµG±ýœS.E$‰O~xåÅîSÒÚ4V×^¶ÊïÉ¿ŸÙ
Yô/-‘­¤ö¼ÞËº[­aoÁð‚<ÂOÒóC<¾h&ãQ">6;ÏÙwÞcíqá*énÙ§ÅñáGØqLHG
Òóè.ðÙ1R;‡Z^tBad/°c8bÆî«6E¤CôÊfúÒ2 ¦¢«Q‘ÁÃªJ$)AðU„©ÝãPÜ‹Ã˜K†
S1RDç„M·ü,ñ¦@þß¿ùuCù´S•ß¶¦¸Œá¾;¢¸vr¡&Ë`M±	Áâ#‹ËKLjXá'(4QÒ2[<¹þqºö™ÁÔK2çñƒtè18FPJ1Ù1XXÊ—Î¤½¤ü§\oÿ &®“ Æð5Ìø ¡“Z«Ô90K	}dL­å(0<>8:øFMÆ_N¬)KaÄ¨LùÇaâ¤srEñDLÏ¬ßyï”p÷î) øN¹›Íç§\ ‚8å" ôÂ)!
daºEˆAT˜n	ÓÇi•AŠké2Ù’h„«¢C¾ýÙ©ÉhÙ·³¤Ã"ò_\I$JÀ!¦…gç©u¥ @×$#ƒÃ/kÅ
y®ø R	ÇŠ5‹#7ŒÀAH+nœ[ŸFAuéÊ’‹*›c'<?ÍïúüRx´ú-—¸ÝÅñwÙY€ß”^•¹'ËOGd!tséiq`µ§`xœYCª8´š+Š«¼Ht“þœº=\¼U‰òŽq@Çý0V‹[A“×Ì§Õvj`Æ™åK|Ú°
ûiò‚JÉßÌõ¦åŠ:Áv¿dmo[@Uçj/,9+éºÁïyU4öÕóàs8P’×p’%Ê9ØîK¡ñÎÛ}fý=Î2ñ/_¯:¾_^ŸŸÇWÌ¸¥ŒŠnÃŠw/‚&xƒëß+ŒH€Ï©öÌqñËEñ£ò#'[…^Ûüƒ"RéÁ…]=ÀŠ=fÌSµnÒë§÷;ƒÙ´:Hz;é Ê
5Çú)In}"ÜÔ£<Ìƒ˜*FN>Ù…=—ŸMþ=Õ‘™ÛNçbc,±a{œöq…†n¨)‰|²þý“çâbòâÂô;ìã
ÙLSÚ³æû-(&2ÏÅÄäÅ„íûy.(ØÇº¡¦$*°wÝ÷[XLhLž‹‹É‹Çóû\^°+/PKMI`>¶ßo‰1©ay.2&/2bð ÏE†åï>%‘axÚ¿EÆ¤†å¹È˜¼È(U=—8êeJÂBGÚ|¿%ÅDFã¹˜˜¼˜°¢8Ïåû¸rBµÓ”
£û~KŠÉÈ³ *Ž3áýb&§Î÷æIÙ9=pÇ¹Èá\R#N¤Úuˆöpü!LŽ`Ã”‚wWŽqeš¾OQ!§û¼qkáÙ4Œ“\ä0·’pƒ;#kœn”)-r8šû-Yå0Ú¢Å÷‰¢±ÜYXÄÞÐ9îY½0¸Í™ÒsÏm4¥é¯Þ¾¹qÑíé?¥±8Yé0=1 Í‘ôÒ$fPñ­ŒÂAðÂ]Õó^È ì¥íö3GÓžÄÌzG±¶vˆàxaP Q“ÊQ€/3œËÎ%dbÌŸ¨™S4mÆ›†S¿–ÎÚ, ¯v3á4¿Â£d$}‹à‡ •œ=|@'ÚÁ?…èì‘bº«ðI«ÚBÁBM  †6•]K’úÄÒ©µ\Ä((°È‘·f :»t!¼dCpÑQ„õ/?~â_¤b<nŠjVúùìðËGféDuD!ÛN\®×lØƒêlK­³¢È@>ëþ³] œ‰öá½£ƒßíM¶÷&¨Ã”ãŒ€rÝïëû|Ú2—Òûš1$8BõŠ;ëWbg½ÊK„Ôø9?QÞÈá·E\	°©1µÇGŸD¸¨¡yìe±˜œÁó†’øØê	û©sÔ˜;Y6p1“,&ccÝL;uå˜€1ác))Âw›õ´?°•,8C—¼ë3ëßþâðŒ.@Ü•p9¼âòº¼j€‡Ë‹ð ¨5õcZÐ¬7xÀ¡ñL ê[­ QCd ÎúÃ­vs@‡}Ÿ*¯„Î*’Àœ`÷`÷³‡Q§­ŒoÓ¤6¨¶¦ò¾ …æPÑ'O§yöVþÿ£^¶Ýl¥óôý,ËÓŸÐ÷¨úìC1ÁKÃÛ€’E<Í ¢ï›×0JôìvÒê§\ºÇ1ø%öôÇè‚ñh¥âyNô~R\Šx–ÞÙÉz{ÆÃâšùôG°(@†óåô¨×ÌzÍ‘“¼fæ´Ù°çáï;žÎ‹ö5CìÙÈŸ.Ì¶ÐÍ{€=zKýÌmznûú}ü·ûÔ2•YQQ›j_Ä}’ý¢Ùi7ñqà¿Ê§Ã&iþm&¦ðuõõï8Bêïè´=üŸœ™þ/É‹Ã/HçèàWMRjp>¢PáûÈÅA• ‡I½è†µ¬tdÍ¬ÃA­ùP™›7`
Ù~l•ãÝ®ñº©r€â$bŒé4r ¢D]1|T"5ÆP¢>ë®UàÃ<:ø[ò’®a´éþTÁi`®ß¯¯²¿Õa³nßc±Øâv
ßí W±È¸YëƒŒ>gÒ5½ÛJöŒk©KŒ„³–y”ÌšEðã|êi—ª mÖæFN;Mn¿¬ÏÕzi¡Ôh‚b$SŽâ-~X"LÎ:ó–ÖMKp"aÉž‰Vy—vv“ìÁl¨ÑùÁ`ÿçG_M	³rãã÷9f¥3ClÈJ,+´0

-¿be‚žö¤Û`'³€î×Œ–AˆS»nóDËe,‹Äˆ*ö*úŽ zÅôD¢–Fª…|e#õÒ	¼bþ))nŒÚô]cÄêNrÆ«¬|.t*«Ñ‘¾î˜ ^jäØÛI¼Á9WÖ2+;ƒ“]`‡Ý&¥e	À>¨™¶d]•p¬^®¤½•ö4Ó4ÿyïØt
Œ¤ÊH»{@:©ölIoið-qù$C×Œ:|û‹„Î“È:°“:UöË¨º?¡
˜…UÀž0ùu0UyášÏN6ÑÊXÍ©Ï·¯`/RPmÞ±b< IÖÎ.}=ÝN†­*2ˆ„àü“
‹šZ¥	ÎA™Ä™…IVÐP^¶fÙ$ì·bC…fíðCƒZ•Î¦$ó÷ÖÛcdÀC ¢hPTôÊ@™è8ûm7j ™DÔ¨8zô‡½mœaXN¾¯*›A17/ÆMÎOÝ®¯²ï½l¾ça8{™]|âµÆŠsH±R8ÀlêBvyP …!ƒ?k ti! ´€—míÈoú4ÐsÀ±ö€.íÉNºÑìÕLf¯‹¼H»Ûì£SâîiUõÏÈÝ&—Mò“áCiþ”³ßà™M¿ØX±:£›ƒÃÌ¶I{°°lœ‡ò#·™u®?8[G›ýßÈŽ^ÿßÇ–U ³¤E‡f+Õ:;;ÿò5-.òP‰Ÿ“tSÚY[ìƒÇ®?¾ç³6»Öx{?0èSËðg¢¦¯À,¾jÛZ|Í<BC×+nŽ•å%­.¡K
A¿–´Rº²T—Vž’„î§_¤âÚ¯MvÊÆy¸ˆ<Ý®¯îr°cTck<jQ•Ú32YF¼`ö|ùºQpö¼è&‚ë™0lœq¼yôú‹`¼þW²ùñÑÁoÈ¾i³F¦jð@­ÌÞºýàþÃ9ãxÕgcDcÃ4¼Ú§×¬øäYŸŽeh©«hºî[±¤à…£Ð%ë”¡à{À	ëI¿‘ÖåšàòìÚö^“À’kˆd1,™óð·›¨‘r•pó]A¹‚reÉ…Ë¿4\~IÑ(å4’G+^`|?¸z	Ç° üÓ ‰¶ÑÜg(€z:ÀÕ¥Âð»?0‰ö
T¿nÉ7J‰kxœÝcÈØTz~÷‡„9 øÃ/@¼ªöW5NÄ{=¥ð4›Ÿ×SÝÐWì³ÀÂÉFeþ¹Ìúç%g*ÂÇ™ŽL´—þ$&Êg%Ã¥éø¡˜qCc¤üÛ£]vØ@ò\Ä
‘­	<ŒZÔÃd·¤=—ÄœÓ.¸èöLp¤ô]<£™ÕïÁ™ì²wÞ ^íþJ¶úYkD×YÈ¬AÅb`ñÀ˜Á3‰€±	J:Í6”ªKçÌL×l._ˆ—¸£<mi‡²ŠÉ¬À1EìÔ¡›ð×š‰Ø\±6“Î†€+º–0ÑbFì;aG1³ÎúUš¼‹(ÄÉ¾½q„©SUÛBÿ¹jŽÀ¾išÕƒÌ›W0'6üt$T«ÿ-:„´öÕ'F#˜µ';„ðW@Ô#¾bo=ë¶ä¹àó|9g-f¹„–ˆ«þ%Bµˆ†—T	q]âB€Æ3|hñ|>ÞEŒø\0r#bˆá\žÈÿ–²“ÚUv®QAwÍtå4$]‘–“ãØ¶öI?íù4œËô—ã˜D/äxéäîßóJG‡¡ËÃã¶¬ùXr²&Á¨ð‚—æ”ÉW—bÿÁ@U®Ë- ûœ_T!Gôá[^âD—â‡l‡?µ³•	;ÄäŽðÍ¼[þz8˜©¿†€Äs&É~?ÙNï0v¶²¨3ÅyR©×<XÜ£rïÞj»Šp÷”í‘ƒÞ/Ó'NA_W{@¶Aª¦d¸Žš&%CyÃ&r×·¢ô9GÍ”Ý'oÓåþö[Möe1¹Æ¶bî½cE„¡õ-	­û§gtm¢zÂÂ“¥êÒ•¼HÇµÇfÚªo4R:Ìý›`[³C&*àÊ(rùG–“¯q Æ\fÖõÏc4o¹Eã‘çà¢¬ öI-ì¥¬g™4ÄåÉ(k~©ÓO9¿ò§ï›<A˜ßs®*#k¢È^öQe-U&§jÖ? ¿°[%d5+°	:5³GÐû¨ÕßÛ+³È[6ì›'­”ê–U¦KÛ®âíNØâÔÝs¶ö¸¨­ÌÈ&®ùÚ@.™Wâc¹:L`¡â[0y˜Z³Î„ƒ(ÜEžýpÈÄÂ?în>×Lêë—^ï²mvôëãa
º§nËà¾œ­¦ˆnÖ“9SXë48TòFnxx³zfn´³J*3‘}* O
ÐjbkÈÞX2{ ŽÂƒ9£ÑÌ†¦9ÉïyÔ·½H{ÿˆ<¼Gÿl’GôÏo‚¹þ?ß¯P9SÁÈÃ»·~ˆ{ÊóëLg’ØÆF–hÎ<0rR÷LEoñ]ò0Ý%Ò½òAVOZäÝE•Ú  ¶pm*`÷	…ù€ûmAÜÚÑC¦÷oÎ‡ °®wÆL©_6.­X’<èo«0îBž,cYÅÅekû¼Ðî-,_¥ð‡1Ã)‚T3¯¸Za.s­}TlžÓµbY×ø_Ó‰ìi¯¿Ì°¥¼}tðëfi­gAÁ'wXgãŽ9&g±¡³ê¯æ+ºæŽþ‘ÒÚ€®ˆ{8 +Aíèàw	°Õ~Yê¬ÔY®×i 8¶”âÀÄAåAÒÝmNñéü8ö 1‹¿b%eŽx«!íÌÿbC‘5&3ëûå]tÊaÔ¡×ÙhNá«°•t¦×”åø†óÙBç‡Å§ÖÙ×J¡<ô
ÿvíÃd+u#{ÇïÒnÁi(rY[dïð¾ýq
¾ý2öÜò·‡Å’ÅŒ£ÕÒŠ	„[‹|7éR²cžI¦v%wðª‰Ô$w¤ ¨û[1+uh[±¶h”.·žµÒ¿âî>¹¢ÅgpäcäS¿d)!u‰ÿb¸GG8ÅÍ¬ëïcföpçð7Ò§Ó®âSý3;6i-ŒÓ²(™"¸©ÒI|G9^¥ôlÌÍG_×¸2@¾ûÃÅìtJÏRy˜3KU’óYz¬YÊ};µçX£ù«ZÎ«ce·‘dÂ÷ä'’ßò^frMkjm¢ð7íJœ[a4&†ªÓ #:íÝ˜ù´¾J>dnŽÏ¹º„ö?ë0åþç¤®8‹«Õª7€}Ü™%‚ÙÌB%Z5­h>#)+6Cçá>è#<ËBYróùmÅÁ¡÷ZzÇyàCA°¡åVHÛ,ëëå'+Ì<ô÷µ°](œ¨Øªdø‡ÿ‡îX_EžƒF‚‚ÉØî”M*Ü†Ò3{Ã\(—B$•™2:pì±é¹”»KPÕ—ÀÓÃ²ACj!†õ’…e0Cšñq6gÎ{Š§y0¥Ý†î´`0%tü'§mý6Â`ãØu_që>®§vXÄûmç4¢'Ê»¸áîüþ>ùñáø„l½þ»O˜½Õ•:·z½l÷cfðòŸPAæ;/ñ·½3ÚHhƒ¾lX\ùa7+ç[\/^Ô¡¶¹u’°x¾ÁY‡'ˆòš`µ‡Ì©Y`•ÓR¤vÚ¶W|n([eŒ¯–´»Æ—6¿>Yª®¤í§vä$D¨¬2Ÿ89ØnjÏ¥™2¸æÖ*Èïö:¾ŸDŒ§k„šaÌ¯J7`±ßêZãrØ èñ@³^À9×—ã,¥¾ãâe° ñäz'˜cEùQ:çÅ“µ3žŠbÜµn#¾l¢ƒñfœo½”ã±³ÿÄŽ¶ž÷Æû›1ÀOy”€Œ@÷Äˆ‚m±U0°‰f<Ð©°«&áóæÇhøèÙf„"¾,+¶£ÄéË;áCwš ñ "4 ˜žÀi°©O¹~Qè¦X>Ûu¢ÄãÖ–—®TòÞ·ÊÞ‡NÊõ€tN•„jgƒ°VÙžù;!ìˆ˜Óík‹[ÁÃmØfyè‡™ô¾÷J‰}ïegß[`á˜È®WäNÚ+Ü?ÌRAip´ûkˆz§‹õÃ?vvòw¿ùžm¾/ò™9¥]¯gåzw½ÎVã{¼ß-ÜàÞ
ÓÐîÖñ'r¥‹Ç¥ø4¶¶Æ3 NHÿý   ÿÿ DŒ	C