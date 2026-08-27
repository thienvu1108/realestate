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

  const isReportsActive = activeTab === 'reports' || (activeTab === 'admin' && adminSubTab === 'reports') || activeTab === 'mkt-efficiency';

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
  }, [reportMonths, budgets, acceptances, efficiencyReports, efficiencyGroupType, reportSortBy, teams, projects, regions, projectMap, teamMap, uniqueTeams, resolveTeamName, resolveProjectName, reportProject, reportTeam, reportRegion, reportType]);

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
  }, [projects, budgets, acceptances, efficiencyReports, reportMonths, reportProject, reportTeam, resolveTeamName]);

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
                          <span>Quáº£n lxœì}{ÜÆ•ïÿ÷S”{³žždºç=–gg¤;I$kìxW0bv“ÓÍ›ììyd2d‹Å"X¬½ÁE,ÖŠo$w<œÅâjì­õ÷˜op?Â=§ªHÉ*²Èîb‰ÕÓMV«N:Ïßÿ‰¼c_œÿýˆü`tñü‹ù`h¸7ÿQ\óQzp‡â–yùÃ³gò'N›v°el—üèG>v»ÞÈ7œ%o¾Išª^
FÈ¨üÏÝqìîÓÍÓæ,Ù¼INI`…tG}£Óœ–ÌÌþþp/xèulÇzh¹£w‡–Û<0œÀ‚ßÎÎ
ºè:Fìkó´ëª^‚]£ÖÁÈqÈc;´A«k¹¡å“ž1l-µWÉð¸µL†'­%âÃÜ˜–Ùrz$´ŽÃÖq@<7lu<Ç$¡o¸ÚžÛ2 ½Ðuû­áÚÃ‘cà×¹ÂÉÍÍMÂ§Ü"N¯@Vëí…ÖóQ†J‚¾azG­`Ð ë¤A`÷­Á}}ïÐò×ãGWÝÏªgS½Ô°ØïÃwl¿ëXÂœÃ”.Ã¼õéƒ¾o»O[¢ LÞ¥ûïâp‰3þÙï?wûäÐÿÆxWL…,áïÐv{¯)3™‰ëMœù0§Bš;ãÏmòâ³‹çÿ’>0lÂ?s{S ÍÓ¾<²ü°Í™¾„žÒ>´­£™B>L;(¥lÚæ]NDÚ•ˆû‘·„À£é¸ú.¤ðb‡å‡uB"ÈüÁÅùOº}\œIÌñ\˜pO~\Ê‚EB/xKõåÌ~ ËÓÆßmË´Ã™Ù«ÙB¿¯·Ûâ”¼
[äqß¶sË±üpJÛäQüDöÜäÐ°ašÇ˜Ò&Q=ª”ìe7›öaþþ|™§ùs©ïNç¿Mv}ãHïŽç!~{>ó<$NlÇóMËo…„`+¼‹>l­aÉçaÕ³#ÚØ¦3Drƒ—íTåVt¼ž7
›tSæ›:4|tœÍ†i¡?ê†ö¡ÕÈß–¢ÅnüÛQÚ'©Í	4µ¸ïÊcGÜ|Æ[C¶!3‘¬ã¯÷î(CÌ+ÐíŠ”~Í¾øôÅßíÝ%¾ñüïËIuc~[Bž9bÊ|‘ú3aòH7àè;ðö0;ÙœÚÁwG^hÜ>îZÌQš‘gÉi`·ŽZOk?"ƒã–1
=ä+dÂ;‹c‹{ÝóB»keh5G©½–1è ‰®.,ÌÃšq‚]Š>$?.qÎÆH÷¥åÕxŸ,ùÖà£hUóOÉó«YFlŽ|ºÚ­å…ì&ÈŽ’Rþ§ÕõâôÖégß;â¤4l…pjÃ/RÚìXá‘e¹”8WòNÖ[Ô°,[Î=ÆÉJ|n#âŒŠgA4SK°bf+ãh”OïãíeÕJäÖÀ«ëG­5ü§ßZ“¼‚g_îêZ­“Ö"Û¡,|Lýñ1F¾­£û”Œ†p(vÀÂeî>µ£ud±)`3‚§£â8—öJÈNÿâù¢Öqþ3òîÁc»Öü®5ðà«ñ$¼8ÿ=ûÄ´§ã/úÞÅóg¡ô@è¯Hßl˜{±Hz¬My–c&¾o9Æ±e’ôA®ú×ÏPŠüWb^œÿ–8ÌÆÃ~6 ƒñ/NÈ]ÏÃå½cûV§­{qþ+ƒt`ø.{»Ã¯wqþE‡ìøh\ø½Ûƒà-ñÿ±KÐèÿpÉ°?þ’ µ 7Œ??!ÍaÒ÷x®ÇÆþdqILªôd:* ij¡ïêÔÚ­.$\¼qóŽoYÄ4lç„ø0;däÚa CžF,ÎÔ8Î¶É‹O/Î?¡Êã|Å/¼”
IÿýßÇYg4þ£Ë—2^ßÐÿf +£ýË9rqþkø&÷—ð°nÅ‘OàIœ¹ŸÃ×@Ï=Ò•-„‰¤‡>Ìü/»0, ±æ¯k8ä1(FÏšmK	i¨IGO)»Îœ}ÑÑ¯¢›‡°´ MõX«ñ³.Ùyïý]ÒÜï3˜#ažŒ9òáø+c^êùŸàÍ)™t‰óõïF0=øŽ‡ãÏé´ý3¼}-áÝžq‚²Úop.ÇÿæöÃ¬ý}˜"À´ð´«ÐA‚ôì1%JþÖ¥_â<vßÐ ©<&ÿRÍS"FÄCA
r¢Ÿà  âù(cØÛ†Ù³¤ç_J"g_½•fàüDt=7ì&Ó?¨&"w„—b‹ÒÅðîÎÖrgëÁƒí­ûdkgÿÞ·%SIßBc2kÊ-ÒÊZ¡Rt°Ï;xÜõ=Ç~ªÈ+ ´uZ ND‡Ï2ždÑ+TU‚»Öè]+¸¤0Ç7â»×è"GçÖBcöÄõø•¨ôC%b2O _<õ¿g9]o–„6±Ä&LlÌ6œÍS*F‹‚ˆ§Ø¸›§§i1¹oÙ½~¸Nfp:fÒš¤£´Ã“u²˜þ~`ø=ÛÝ÷†ë09|´·È
¼øÙÛˆ¤ƒÔ½7àÞÅ5áÞ”æ¬7ZŽu²Ð^Jß(l$ýhºo›¦%ˆà)ú)Ý›Y‰kÐSe¶³¿!×ÏúK96
ÂäÀ\§—â½EeŸRÅ;Úa!.‰\ŽÉŒÐ2á›"ÑÃ1êÍ‘St= mCÇ8Áoµá£6gÈÌl{è›³gäÿýëg?Q+¼¹žX7ø*¶‹rLãæ¾?Âsmü‹Aþnúj¶kÚ=É/>E3Ôˆžó}Þ­RÊ›ï/I¾•PTˆ¦ŸôÅÙ—eÚ£Aåùd“h3qÎ&˜' /Ô^˜.l‚§\Ž?X*dCOr4Ø=4ü§Z»ÅsL=AÙ#Jv¥ÿBÎ²7~Nßÿ‹´_·oÀú7†ãñ#Õ´cy%k#ÈkuÉTe¸aäuqÒ÷­˜ž0ëóó?„NÛk~áÆêÊÚÊÒêêªD' ¾ô,Pó¿Æ}*»dÚÍ†ëyCË…íëzÐ‰åûp@åo-=”£~†“´çƒèw´B¯å“ßÀÞ!qÞøjtô&¿/ÆÇqr~Çáè,¦·.%'·ðíJtxÇ¶À„eÐðtŽlÁ¡>ÍˆA-%ë‰ÀsVs“$¡ð‡V€0Yì%<°§ÕÁÌ»¡0H”JøÉÓŽàH’›ç˜}ã˜0t¿1o”‘}NBHÎIÁ*¶±otrhÀ7OÙœÀ7gÄs?Àïv`[ôà´$'?JÔÎñä_k¤ìn¸ß:À}Ü¬ O˜uÜ>à‹Ù`?þCÏÌ:ôÙßwww·Ø§{H·®á<ƒjJß„Yy©Ùw&ocWÈx©å¼T2^Er^*Y/J±È³ÿ…„w@³üìÀîPYadÜ;™Çr¶ú4k‚c¼ûô„ü°µ\h¸Á~9»‚ðÄ·äÜfÀÌMËi~üLÄÄ™µ•áñÜ<óö|(z™lˆJðó7€ 0}oˆÛËGù=ÍPØÉ·D[K“MdÙŠŒ»­„„)­ nd~eÄr˜ú’ÃGAË’é(šúÐ&ä –Ëf•¯Èú{šsløÖÐóCêÔ˜	¬®çšzaz}/g$¦dºàöqWäA“øXà¸ÔFÇÅZŠ?Ú·ò”Ã®Â×€ÕYiÞ530éÛ»f`ódI]gËK}Ö£Oê¹[@sõ­úárjŸúÔÖ¾BŽ˜á›lŸy  ?ó¤zù¶ÚŸ¥º>,ËQkxœ8+pS€Ö·HO I§ŽªöM*ƒ§
‰/5á}ïo­nuÊÅ«˜zñ*¡àAáÿVÉØ`>±^— gT„†W	±Å½+k±Û#ÛAÓçR!Õí¢1müLåg–;UR½Ô]öÐ2×rÍ“Á‚GþÐ©Ä&YpÖuÕÆ`¶ p¥Åø4èæêÜèv­!Hs]ë:®zft°ôÖÀòÇ¼ªµP‡ î€´¶Ó·à."‚½ÈNöGäáýý«§‚ÎÈµv²¯¾e2ÇÐ=1Ü«Zý¨ë:Kÿ=·¬°dÝ1æ#?ëö¯~É»°®×sÁ“‘Árû^peŒžu\g±÷}ËÅcýýaá‚ïômê\¼úÕ¶ì®m¹Ý“ëÈæ3£ƒe÷|´x\ÕÂý×Z}j,\y1%£ÖêËƒµäSÐ=j$q\†g,\7ŠMÏé«¡UžËRSÍMs¤J…Ö«çPb
Àu[íÔØ®zÁ“,‘k.ËXÈKI&BÍuŸ$á ”fŠ¨Fˆ«¯J4:d3)áˆÃ‹éæ­)ÑM)åÄ95Ó]$‰ 9ÚÂûÕ+\B=Šñ)¼ü—Sö/!É«Y:Ž½I–‘ã„F³ÌÐ»Ùj:,'ePKsb.ÿÈ¸Å–ÙÕÄ´yÊcGŸ£ÖT”½‚èÔ´*•nVÚï—j2ë¢0 ïÂ\#ó$˜u“t,ÇƒÏ–;
²ñÇ*ß™Ú7v¢tj­-d}aéÈèÇsc0§Ò÷)-­d}J’°&=ß6	þCô»˜ëâŸNOøs•…
£W“†Ó_áÃZìÄ…- o‚ÿŽM?´¨×;ôðþØßñÂ2«³cø¦$ß@tB	.íØ'ò…‘L¼¼¢7F.÷ÈŸØ:i=i­`ˆˆ~ì¶LžÇ` ž@lH|Å¼7›¾[íTduÃ
²±îÂ#»VÐõí!JÇ{–	HXÈü[²`æ'íEŒp";UŽ7‰É\HN ûçÿsï.ÍGÆ?Þ“ìÑÌû(ÞxßÓ¢1ÚrQˆTãæ©iýŽÓÛæÞÔ—ÎXÏ´Ý<HÖ%Ë*ð—ôwNÔYp¯¹
fåIé5oø‰uïîøïöÈãñwÞ!YÚÀ ú`ö²ƒf"¦÷Áz9A“tfˆ˜´í?Yl/~„k‘A¤×©§Ö=7tÚ{#Œú½ãùÀ¨›3‡vëƒ½™Ùöû;óêÌÒ*Ï<“†ò±/G¢´ÓK‡Ö½øLª6ÙžüsÚŠÜÊv­vbbù›t#Ê²âfÜyçyôÎø¯åNŒö›:ø¶ÞVC+÷ì™b[Eû(›^A#“Üò¯w^ÉÎâ1™×h_E1;—.Ží¼€n±+ÜU%BÚÔöN`8VPyó¬Ä›gçÅ'1Ô/mûpa=Ù?‚`J›ç Óýhbt>6³ŒNà9#ØÂ¨ÅÁƒÈáß£Ö2êóðŸ8QH‹f{Ã‘Z ü/®Á?!þCGÝŠMìÙ¥åpß’oÝ’]ÏÙ‹,…é¼>»_ˆø¾Ü#5RÆÞÝÚ{³ë>½Fg+[žË:W}ëÐrGVîÀå*ÎÖø›TøyÆôô&uÍ“Ýè½3æ&TÒïY¼z£5¤IÐåfšÍÅÊZjÒïqš‰#Ç%aä9d­ìª|æ´~fU•t*Eâ¶,->ÿ&G8·)Lì:Í¸K‘%rØÉ1 H¥•ÍFYôÉS`ž(0D7Ë†4á\ô”“û6æÓz†›ÑÎÉJ’¯¢,{<Du1ÉˆêŸ¹=4z²Ô§ur
Ziœ	õ9W™Ã.4Ùœ…­Ž¿¿G£á÷G–o{f³ð‘Ù3I:¯ÜŠ¬rBÄX#Þ(¤‰où[
bt$Vøhwq_ÉÌ¬ÄE!M(£$&¸"rAÿ9HÎdxD#˜ÖrØ=ù¥Æ`šSÖBÒ‰¢´ÉÆ–ï{GïÑ¦…eRP’æBÈv0Âœv«KOã2ìšŒÁ{1má^¦3r£TÁ€‡àþž­Dü!ðh²¼DA$	‹‰''«4-2¡/’ÍäòžFZ…BdÃFˆË¥d1–øµ¸˜’ÄèG<dÓòX%‰dþ“Íû”ƒ{È9|ããF2“?ÄljnŸ—*¶K¥¥b8„ì³¢”ô–@ÒV÷õï¾F^÷ƒˆ*iÀXÚ›b$ýåÜ0ŠU¯(äd9ºŠ?£ ¿ï’¶/0òåJ§…^BÏšb2uóTËãeTJ2zH¯•Ë²LP€
=6IGR9²pÙWÅeoÜLf¼IL9ÕW9]4Òó’g$#ƒ!lDD õ&H	‹¦ÅQúÀ³WéØ¹©Á;Þ³‚¡œòÐB1Î#X#Ûû›ÄqiðÄGþ—bïxƒ!L·I…9b¡±yšAÒoA^1Ú «w­æÂY\@XÅ¢€–ZÈ$wñ¨Bß{j¡aø¾q²ÙX&ËÌ>´»I&'¿m³ñ‹«o¬úÆ‡[Çv äÁáß· #×È„¡è2 •0_ñ”wbª¦þèbÇtãu2óo¯Ë3s”ƒ¶SÇþúOHÅð„\ü:'›§‹ª 
õ,ý5¥ÜKæÞ¥Æ×ØñI¦ÃÎöèGÚíYÁ¸(5í{žÚpFüÀóÅînÝl¿ËôÊÍÓÛ1-îZ@ãŽeFÌß,êô“„ÐÐÝ ý •­,¬u`úü(Ø<}²6Gàð¢‘Žáã›ož./5óHÂ“!†–x®b#´÷Ç âÒÍðÞFBì++kÖjôÅ÷è¾=]9'ÄIñ×qPÑÔ°›ae„»×Érô7½ƒ:uLCÞ[¹‘½)Û>¤xÑù{³=	Òdƒ2ÙZ-ÉŽñ:¾z
§ôc‰è,X‰²bpÌ™UòpDÜbÂð
I¬yKf,%K-š¨ÞKäæU¹Y¡ŒgF›:zbp ™=’>]‚Î•³<.•È£ï½{0ü–ÑzzqþqÇŸŸ(àÁ
Ä£P'Å¢‰ä%VÓÒ,3H¤%÷>mr0Qåù\‚žï "›Dvöú–9‚Ã·it»sÈ7}Ú.üE¾Cÿ¤Ž<`_³¥×Õ{Œ=Õís·²}+ù®ðr7É¹Eš©!Ì'¿Ï¶CïŽ}l™Í¥Y%[˜Q·~6Û, ³U‰Jh”¨-‰=¶qó¸H,—³T9©?Ìˆÿ £Í/«lmŠ=¶ï1n»Êš÷³ØŠœ„#îrCÝ!‹ó_“Åë®)o‹ó‚£s.28@4ÀÃ‹ó¿¦úË¦úxIÌXªh«â„Õ³²Ãü¥zŒ`ŽZ›Ž9ªøü)ÙºÆ„µãÁlÐ@è?%ûÞêÐ]<w÷AêK2Ñiõ>ý «¥ëÏÈl»²ù½oiAÐûT‡ì4t=hæ‘m)%¹ä–òÎ*ˆp7nŸ¢ÔÛ…Á¾Ç…í5¥:ƒ—2R|ëÂ[‡†‰Ìm|áÞ¢[c±œz©Ô)EùWnŒa³	JŠ2ïhZÇ”ccïoìX Ç=…Áœ~Ü…­oÒGÏ>>cêÉ)mX›ãùú^³Éó0Ê‚ENkb‘²Õ<åÚÃLï‰ã&°œ2fn&‡zóÍø¹äcÛ±Ü^ØŸ-l„ÄŒ³¬vAÇY– ŽÅ¾ˆ4ßÆÂP~ž,®*ÜÙžu$]¹dÂ>:hÕ=å³òdá£6*‡*>QÞu#:ŒÌTò
{Ö=i
ÝÒ] u>å»-°FWáiX´-ù‚»Àõ
Ž¼"%|¾˜iª¦ìË¹ŒæÃBÉNE@*ÆaÓ(f´sÊ*ì3³k
V‹¹€…RªÃWV%¡hŽ¨Ën)¥—6"T²SŠÖ£¿í ['&ce…ë(ë'|\²9¦à·õ¥€‘Û…¯	â½ÁÂ©íÐ²Êµ¬ÑÔÒ²É6$È„Í<©ÄRé\‡É£ßé°ÛQÅ·ÅÙYòm„íNäÈ…Ù³¿Ô©R´µ‹~•Ÿ;UÌßj<åœ›õñh00üŒ?q,µ£µ~ˆhÖºSˆh—hK=µhWŠ€3óbo©Qáj•2*u(T%\_Á“®ˆ¾(?¢)º7W\Õ9ƒ7~|ñü·CrÃ‚Æiy‚ê¹ÝþÅó/]}|tÇRŒ~.Ô‹m˜ %°\µ¨(ÿ9îq;ß;Ã¸Re]Šy§} nqAiÞ©X-*Où-wE916í´H9›qc*c‰"÷TÎÑ°„ÂÏlâöþë×RÆ¦Np‘y†ØËYç¨ó+]jñ_Òj ê©—º~…H©Œ§Ó³MÒ‚¿äC„EÑNiÅc¿ç¥ÌQ]²¡A1‘…ÃRm9ˆ‡RMÊðóŒ6t€²ú­Å%rÔZ\F¿¿¿1÷¤1¥€3ÅAÒñ1oekèÙô¤Î£˜Š›€Š¼ÚÐP´Cé»=öü°9ô­Cª œ¢ äÒèÌ1mŸ‰AëoiÃlsÑß©æ_Ç·qü¼ Kw¼a—n&úÅ™ÚˆP`=ÐŠQ…0±yîg kÐ
+nGë½?ÜõŽÜ´¾ÁBDÒkRXI¯P²½~äEÿ¤nÁëCi,³ˆÖø×‚Ú"±ÙrMÊ ö^SÝµ¢:ôçÑýý¤¸}¦¢ íNp|ú®ÅÑ$¾"’c7\+šÓ>b1ÃãáÝo:Õ]36ÇÉEdÝr­OÙ	‘Ý¯ÉÈnèG*Îµ =Ï.¤;øù¤9Œ»6ÄÆo Å[îjtzµÎ¿í™'òæËâkXÀZh™èB ›äI»Ý–„¼|ÔÆ»Ð·@:%^^ÖèÑ=??“š‚Ziµ{Ç²Örœp6öQ$i‘NœjK¾Í‡7A_T¾;Â/h/(c]pµIì„}E»áÐ7ÓèˆÚÄnðtÍÌÌ¶¬Äjah¯á[ÍŽøÛ4úfB“Ø9ý†¾"ƒM˜F/È«Šƒ
ÕÂ}[@³|5Y4VBCóÑëd¡<ŽÚÚ†¶:b[¡­ŽV[Ñ¼Ð‘µh£:3¢ö¥ó•ž)}ôüÉ„]¤ò<˜§ó±Íc-&o3„Ïˆ“D&*þ½JøëÀq›íštOô3ÛDêV4âLÓ)s¿›Ç)¼ˆ{!bîeP$Ø; ÓQm}Ä„(ñ)ÓQÐ€!Ñ§ˆ&S%¶/Ë×¸‰ƒ&ß!‹güÀÁft»+Ñ³ÿ©âÅZ:ýXžÍ^ªåœÁ©ð­Óñ1‚œIgåeT¾I‹f©yF‡ƒFÔa=#{mwáØÝ
Ñ9_>+Q7DíÎÝ—rÉª}ÁªÔ¸hJ‘¨¢×Ñ[*™Ê®èv¼#>(_£'R§)x>æÔ`Òd¢€§ZÙKƒHÏ6>†õWÝirÿÌ’MK¢?ív!6s<:s¦µø7ÕØ÷¹¥bŒ’Ù¸c¶“	;8òlV”b¹1Q*Î7¼xFÜâŽÃ(«4ëJÄ,¼(&þ-­­-}K¦vékÂ8^é–àåØc€ˆØ½ÜÈ8#¸Ë˜ÉE_¼•ò¿¦J´ÓB´XJBÜÐ‰?Xc¿²­E…A8Z_|¢ªo–Ìœ´0{ö¦é’¼Â6Kn”-ÊÈ!Æ šÞ¨Ð”P¾ðEtü­Zçp–£mæÃNð˜aŸ‚xV˜8#^§ ‡ÖÇ3BŠgÉÍM²ŠvEXÝšMÐkÉ”P.û‡º¤Ô€Ó¸™
oêkŸç-¶°K)·«$zU^ïLnVà?j…7HsÃÙÑ’ÈmR$ý|`Üš<>5IŒÊÄÉ¥¾Âˆ«˜çÑ š†.£x“%7i<JŠõ©í‚EY‡ZzãÏiªÉÏŠfs~¾‰ãðâü'”ñÌ¦zFOí†Z¿”(L•â]2”%C§&¹R©‡(¥E a¹’ÔÛŽûÐpBnHAÇšw_|Jîcšð…l]êL}‡6Uá%©ï÷A!¥Ÿ÷}ïÁIòç<$Å«ukÉ`Ïh¿­AoJÁÏnLû,~–ô+Å@#ùBLÛÅÝs¼\ ­4½BRhþÐö+dE¹<ñ (N¥VÁM.ÒôG%òP}Ì¡ý§"L¤h‚Déâs9P-Qðs!´P‘r]¤æÓúe²H¥Î*þO’#–MdŠ÷ùÄv1ïºEi´@ÚxGL#j ²-¯4Â	2<¾,dZÃ¨ ÌÙ•Öz~2q"|šin‚¨Í7± ë(|»òQ—
‹üüaŒ*§ °Ð¿ví`è'Øv3/œRÍoIÚhÓÙÞñLëluØÆNÿëß¤ƒþG—½Q’Ð GÓc¿(©+aßåXÔM B1¡Lu>á§~ÃŸ#æÕ¢²{ˆgp-1àq‡gKÌ—Ô¦·%‘Àpƒj(ÆàR#ˆÊ*Ìk¯Ra#ï…5Š(îÁøO… \t8éŒÍÂcê”-eÒ…ºgâa×¤#	ž,|t«m›ÜPX)Ës?ÀÖ@Dq{ÐfÚŽ„©ÇéöéO5ëM±¦ö÷r¡¯—Jª¯‰ê©±ŸØ.ú­·3E±üÎ:§¯I`v­>4`ù›¾F×Bò”®T»Ý.WÉrZL”pÄè€aÂZ4¤,¡ÂèÒÉ·.f@çlÞ’íØM6Œ } dÛì`c$1šº43[˜]ÜöžAç‹nL±½èK	Ï“®RùøŠ@%¢K+l^  b0Eç;"‹ú?åëI½7¬ä¸ù{ w0ŸRÀYÄ8Ø¹Ä¢@Ø^•HV¶Ô\\èIXÍÒ¥H]ÜiQ¦tÒNéÜF7ªONåùX%eNj5Ïú*»–f+Æ@ÃÜx^¶¨u¾ÉÌL¢õÓ§Æ_6ê3(ÆþöN—ï9òíÜxãg!h¢/>Ií)<é&‘´säpü9ÏÍÿ»-(¦1pˆ€óÿ9ÿ=Å±øB‹\<ÿrÈ¸€9]œÿÊÆÔ–Î›ÔŽ.“©Ôuý²¢‚2%2ù‘o™ ]zh¨òÑç£Z| )§sS²,¤LQ`þñ.¥f1³ùáø‹HTå
}§;ó;N“ÌðÇ‹…Kh“6Vc'\Ë	wÍ¾‘D?#8{’­1ÅIEÇÓ#ß:°Ï¾=Á´*ªX©Pb/x<êôk–å-3 I$>+ð­X!Ç³¬°p¾ý¬ò†í?°ƒ0C5‰‰p(è¢K´&æZE*(ÝÖ±?X]DâfÊªCƒ)³Ž@™·š’k²šBŽ´ž!–]dF›âbÒå–FêtK'×EGoTÝ@ñB„yÒÆ@
}M°&­Ð°KC5i&¥r•á8(PÔ3ÇÜ~¯æÜ)+·%“÷âÓø RJ¦;…èS|5'°°<ˆ”#ôÝéÎ ¾’ÓwÇv€kZ ÁÍÞ^¯^¬Kñü‘‡÷÷«Ï!û™¬äOý­m²¸NöiœDs¿?þÍ`«º|iÌ‘Ç_±‰Ç¡Ü^/¬•Ô€žgµéSA<[D8}N°€ç¬ÞôË©`ñ'óñ õu„Àë9£A”BÕsÑQ—´ÿø$ ½†ÚR¹ež€o’‡ži8$"öæÈÌFæ‰è¸P&S!»ÄÛ‘zÈFÈmPì].ª{$GËX‹Q¢‰¼"jFv5J6j4b÷·
šGá ,ã ÖÆÅ9.)h 2TnJlFæ îK,W«>ró¤(G•ƒâcÒuÚÌ	Böÿ–UÂOÈ1¨¨æÅùo‰Ã|ôño\bb¦ðÏí¶F]¨ôÛ”®wf?<ÁZÑ¿Köï`×6¯G¼¡ånžÚÁŽoÉróþò.ü€’0þ+Â÷wjP»;â F œßQf¾¤ž,.fŸ¾2Îrû"^‘ŒTpÏŽÂæÌŒ–mP|•ÌÚ3mªöã»4‘Áóß·ÍŠGöo<#ï™pæ=ëˆ¶Ù|ò‘fCg:„ÈqP€q/^i½IpÞÆAÌü»·R®@…%=FYäh KíUuªRréÅq~‡ì_<æ{ Å«¡%{gjïhïµH\OñÁ:‡[]HÅ¿-'ÕDø)TKyØ‹Všç8£ˆC2:u2‘ò‘PQ•«}d{~äŒ‚Ûï¦;N•K(“WLè€<Dö¯÷ŽóÂKVš–¢³,ƒ;#b.G–pMû7»öúÔîöÇ‰9´]joýW›øxÜøJÍª=Œ6¦&ÑGýñPçŒÑ¸2v)™µT=?Ú‡hú±ˆÜtQˆ¾ Ãœ€´Oµe÷a+­ö?JvÆ	3ãý’ü?u‡RÀFya½*ã×mCî.NyO²°€‰ù¶Ôý›ëŽ|zÇ»R.Îv×Éí»‹säáöÂ’S.ÑþŸßz§»¼X<jZ‘K9#XíÐð{VÈ0Û¡÷>
Ö; X7‹}<Ù+…À;†Ø%±£Úý"^Š—fÆ¿ù%å>Šá/*ù1Àˆ3:& ÑX@
&ânšF/™*_.-Ê}Š{'¦ÚZ4›qæ hN~0:!T›ì’æÎø+ê™ü„6Àãô3·7[‘À«’·„å’æ¾è!èÃôÐGó|úŠà:Ï‹NØ‹ç¿á¿‡{oßÕ§qš’>™*·€¨wM‰Q_›ÖÜ×ŸÖYÙ‚ïŽN(ÉßµÇÏf­[ko<¶¿Û§y¢b\o–¾DŠ”ëÂ(³ô¥p#Ši·e8uŒmžFŸôŸµÃðäf²Ößqô):ó›V‹°L*ÓÏnŒiµ¾á»¼÷yŒ-—	sæ¬.ú;~<"nù÷¿Ø•ùt†¤ã€€u5šê&6¼¸- Ç
4Åi;ˆ{gâFëùUÒV{µ¶"V;[ÙvÊ½[ ’7QÈ˜EÍÝ«-.ÁÉ«òÒS¸Ô*‡îMÄ³NõëQ:Aä`{oÄñÃyûfä[ÐAÍÌÀèî	Ô#UÕ!Aˆ`Ö‡•…¼åØóÔêP/!§ÔG%Ê¡ï’¢bTX
IL PhÈÞÍ,‚©
}/4 ˜*ƒ]$ÐÐG­N¬å¥™ÙÏ.Äì¨òl00•Jµü
ìŠ @¨oÜ2É&) JÛí:#Ó
h_mÛÔ¶å³K· MæÚp(;¡Q´¼ã’òÙŸr °!M#p§`Gòõ>–bt%VÀ_nÒÐEmÛUmÉÅ*±v‘*:Þq“@ruMQ'ûXEwO.AAªä9Ë^ˆ€¥´|RÁUìš*Ø@¶KÚÄ\€›þûð­h/UÜLÉuF,'°.íuìLýJsÑøuýq’ñ×zNÓ¯—½ò¡Ké½1}Á§wàuGÁºAü[†b¾,ãÿ[g{h›ÄK%ÆAÖÀ–XQ%V›+.ÐÓ¸É8*G ©"Bƒª"LÉ8…&Lñ¿Zœ½þMÝ:QŠ1BJ|¼«2’‰@-R¤pÈÔz¯ü»ÕÛu—Z‘wQv±!ÇŽŒK[†W±šB¯XË
ñÓ[ƒ$|ÿú/B­Mº1ïTS³ðªt”O	íê¾tu{»öú!w</L‡ã±Àµ`°Ž°ÄÝ²££¤‚œÐ— £~¤‘"ˆªy`€ˆqõ¡;ŠHãŒÔ¶~ëmíÍüÎÅù¯N¨wB“FtƒaèÝU"Â„˜0pMÇ&_—Ú§‰$N§Vÿºs^1 ©Ú¬GqlÏé-iå~&·—¤DgD&!º¥‘¼’Ø¨!&Ó!JD	‘§#SµÍ"S5…ð8jyñ-GÓe!8¥†ã‡Êø¹…¼,³è±š1/’T_ýDp;ˆØÙ$ùÔ´[Q8¦ÿê°@ÖªÉ½2ˆ¹ËÏ,³|„£µGq«fâ¿ÁÐÛQ[ö‹óe=Ó¹`	
›ÜÒÄ5Ø*°åî.cë!¢^k5®qK%S%	MF”äbWåÐM*¶¦-œð‹]W_n1$TR:1““±t%@±•U¬›Óî^ ì
ÂÝ-Ò•¤ù·bT	þÝR’â ,¾'¿ÖI\‘3Dgì{ÔÌ¬«¢k.äµp³ôWÔ>–lÀéZ·iúý•ú¾“J„¤+èhxª +ý*úä™"ÐÕ­¥„ž§©·g­JðÏ¬Zqt¥P®ƒK§&õ*à†Wd™þÇ<:´b ]VÅ—[Ä*y‹I@ïÖ•9æbéøÐé)ú§h¯çkü=’kîKk`Ø…`g²ÑúæAíøéLiº¿dZ*X£‘³qóG·8…ÙùúVür¤·.‰HC9bž¦Û?ÃRÊ—;­—aYÐ˜Î4@tJ{ÓÐO4ðZd •BŠ_0ýR(„Í£Qhª­KúãÏÝ>y“¥¾2R@'êó(Èª(ñR
úVpY9q”>5¥4ÍI5Ý›	Ð!Ÿrû‘Ô}í´MUzæD9/7s§aÐNÔ¬•ª¹Ÿd¦t#®©Ëâf¨˜‘©Él¸eªôÅ2&)4ÿÝ6íP°–‹0q6]éióUb²eøƒº^‚äË†¦A8-KirŒÁ9;Ó¢<=[—®ImEJ’…¨=©z¦ÕÔ’TŒXWx(’nVD‡O&ÉB÷°—Tø9V™R%Á Ò¯èQ¡4ÉM˜˜*5Á|eœŸYH±ÌOä•K+Tã¸8ë
K€¼¢;@HÙ ˜"S_WQ@/Dä¢Ø–{ó[3¯êæˆµ•LžèÔY›ÌÁÉv^ßfd_ò¨6Ý&›g\|–Ê¸Ð›ç*\cÑª`Â
fû2‹½d¯¨LøÅ·j:T¹UGFbáƒÄ¦‘5g0KEŠMþ¢È°yË†Î8tPa‰Nm§‰¨u… ÅI<ð(YcVX²†#$kœnù¾qÒ¶ú¯´¼mˆÉ³°¦e÷DŽÁu² y¡½Ù”Hü±-÷A¨Í‘+¿ú›oj¿ûÍ
‘â¥mR7!lçu„ X)Þ‚ñ‰QžK>åsŠgðUòv<FåÀk^ìª‚úÕF•’Ðˆ´˜V…Ç¥¡™`¼·b(s‰ï)_˜Æˆ11”ú%„\Ú«ä!-Ž²\x”âÁ£Ä–<ª’™§Uã+¹t£rtB¶ôÓ$±	eÕ¯D­>Š4è±‚œgj¦XL«T¤VÍ*-‹jbS-¸…¢"> y“Ð<)ž"u%@Vžš(Õ†RÚÑK5c–Û®‘­Q‰¬£¶6&õ%ò«SJM—‰Wú²Œ²DúÞÅóÿè²Íåö‘°rÊ†˜†‡A>'e9•ñå^º™÷Û»l~·Öyè›>ÅŽM¥$ß 4©£g9(¬–"­/”æª›â+EÔºK%PÐh÷#V3ÅRýªÕ œª@>¤à¨…/yöZM YyÛvoÛ ÉLï ç¹õ.VÅðµôÝ’C…ÈÛ½LYØ]Y	•Á¨×³ˆ‹Œ1Üç“5<dvœM"Êoe-=3³i Š6ÈÈƒ¦v˜¯Åûù>y%øãø¯6ã~|ÏûüæÙ*©]™™§š1kéì[§q?gk»rB–lqÇúÝê‰oz·e€B‡KT¾A£­'enÒc5¬˜ë@[7çM†óýímmì	¯¨á#Ã}É‘ÁTp_JS–¯¤7ºðS‹ßrMDoè¹89º¯Š‚S˜1’,È‡ñ#“z#Ëê9“Òí .†Z}-HÊã)È¶ÒÒ
àz;|]^hYÁ$¾Rk€ºÊ¢t:o‘™ŸbUîÝn·ieð~”)/3z[-þ_ÏM05¸¾ü¸½Î46.8r/?†ÉsQû‘Þù¯ÎÅósò”	¤JM"qÖpFM'Ju
‚j"Õ1­ŸË¦‰‰”¥ïy!B!¹õ¥×z.¦Š‡”ìq}Îc‡¹Þµ\Ë·»ºR®ãfn¦(d­d¦/§ 3lÛ¦~d.:Â×ÑÕ2Ÿ8:Â$1…DÁž31s6û±~ó]h‡5¨+)éüŒ7èÁsûØã±¤6ýs>¶µ5AkÕçßÐ(ÄÁœrº:VéÓÖ@Æ‰ßÿ;	)˜	cUˆ–Ç»`°ò!ô^¡
ÛõÐ
¦¡‘*SË™^O1CL"š¢¢Ÿî©+…W"a¼!£¤qé÷´ÞÆ÷é¤hž‰5Ó:™µeÒ\Ì}O@zkÊV%ËSFÈúï• Ùu˜K“¯¸4åÛîÓ–V¦€wÿÐª¦EÁÄ¢?'"fÖ¦	Éh®É±0r‹MDÑhp`]T1!°ýµGsha‡w|oÀŠÍðÆðÄäC§§`…ù‰÷Ø”Í±ÇÎ…X
NoOÖßÁÌFê{•8ìè_©M¿Y]ÐÚÃZe¢e~³ñ¡ ©£Ý›Šæÿd§ ¾¦Ç6ö}#èg£KÛ«v¦¡{Þé×qxIn¯Z}{/¡¬’†#¢Äu•	<¢Ú“|S|4}Aç“Ÿ´ÖR	Ýòœïåƒ‘Mº¸ ÊÅT½…ÐçÈÐ\fdEk¹"Œ…‰„Œ7J_yòùCjtTæ…PBq_ÝòdNo½ë9-Œ¥A È;¥®;ú-pÒ–S½œ˜^¥j&Õl»Zû÷!›`Y‰Øˆ šÒ¨È¢ ­M¥·¥64Ù›lŒšpÒ¤Ëwaq!³I³xšbÙVN9±×Ñ„3%‹x¶¨)+}ºˆhðŸÁ1Xð€°íð¤µ_uX=Å²V%¡¬ÛsbÓ£:cì‚.ÿ(=¹ÊãU²ËãKð×Ï§æWŸå}”Á5kz_~o‹„ð–^`+kê=ïHW*‰zÎ…×&É{,Æ<¾uJMS7ï¥´-ž„˜¥e ‰ªØ¿]k.…¦µ kèÝÛžy¢<™â=4B1¤ Êhì«0_ð&jÐU)Æ‚v-mÇrœÜzP”.Z¹Ñ±;N’òRp­•¿TUÐàÊeWbbvÕãdÃÛ’V§WÕ'ã:¼ÃH.$6|YBˆž{8º*@aÖGN™›{ó[U`t)z>&é)lˆ§v¹cÙum7‚~|MtélYÍD¤ŸŽ#ã+tÈMK×˜²S‡ìË¢Z™/ÒS&ÀÛ®Þ]‹Ž&WÎWµ¼vi,ßpÌÄÌ}Á³5£?W)ây|ü'_ƒ6ðVU äØl'n—Ô…÷Î„¦éD¦U«NG£½!;Î3Ñn¹È´ÌI\‚<ôŒ l[¾ïùÍQÞfšÑ°ñü[ZÎ
w\[*u5â(·Æú±mâÅÒJª?Y½6ôOjÍ•qdØ!M8Aw½nÓÄÿwæÈ«pƒ—ÏÎÕ„OgþmÙ‰ÆÃˆª€X%W$±ä›fdF›NSS~Îj­:›SÇëáþòÜæÌûv·öoÏäg&µ`‚æJÞ²æðØöFÝ®Í-¸â|ý»Ú¿ÂfÂ7µÚ–ˆ÷Ì¦;rœÍ:EKÒ5a+×ãÌñtÇö­ ô|ë6e	ÐÚyÈÂÀÕÙ?Zm¶@ñúÔkÅ'*‚óW;l	ylêK:xUÃðŸzY§:‡q®¦gÀÙ&9™›*;¢üË]j
Ö|ék]½ªx®+vV+D[~µI4ž‘MîÊ™™(ÊÏü¨ë¾M®š¡É%ßõŠ!)Ú£jk¬Îñ,Š©´L-C9{HÖ/™¹Ka•*:¾…Ö¾‰œ?!‘|7õ-Åc#xÏŸÙQDseO¸;™póž5€áFQ5bèZ,cÆ›å’O¢4)D¥¬²lÐšz‰Ö¥Y{ªx=`ZØÚÞ~ë¤¾?õ˜´‚ŠB”«C0à Y ax–rOlÀ‹oh¹˜á’êCì¾3ØXø¯~|OzŸâR¥R	ƒuîXeE¥"èrâxv=×Š¢Ð=l­ÅÅò„þ¾mš–K‚®ï9NÇ`©Ã#ØˆJ=õì6y$CŒ¨ÉPn”ZÈV3¥ˆ82åÅù?`D‰ñ´€…—*}õ¢<ñLSæn¯˜*½#(Ô$Lc[vh6|„w#2=Ž?'?`YòˆrbÚù|çâüçaaÝ×`6¢Î7¦G#×<º5¢"ÕmŠ¤š28i-'óÕžX[8ìW.=~Ûì.¹çx¬èBaÂö¶¤¤V®†k:fd/“É§¨Gï_–§¾Ñ_-„&„Ã)qÒ¸©ýTí¯–ô?˜¾IŠx×)‚,B/êæ/iûáR‰#,ÙuaqŽ<Ü^XÒÕçÝv„¾HûÖ-T»tK“û­3‰®’àI/¥È®VlyÓD e—Dh)PÔË§4ž®‡W‡Ôð­¦CjqKu<ÃÕ‰ëjÈG§6Ý+ÊEèÒØÕu5¼±¡2ãtHUhëºðÅ?WnÈ#ð¥p£º¤–äè
F
Ïg	»:$˜¥¥]ôÖ-23£…¬—Ï5½-iP‡d"HÂÍÓè“ÎS4Œa³ÁÒÂtö½‘Îôf£Õ"BFð<yñ)MðY¢h«u}yª>™Ö!ÒGdõ»%‘¡…>ÐBwÆ_ÑäŠO¢ds,~<"nþÿbëæÄgIy+¼ä%–JçŸRr ò–™YNEœ†Wlª:—O)é”Ü ®‘ÂôÀÇ¡?ê†#ß"×èY4º\‰F¨­ÚM+bšÊ¢hºH°ºóx‰Š$’rÍ’(k°ËªbqüJqPñ6¥(eŠÙAxv¡I#tl8ŠÆ¿8ÑáÕáV´£ÂJ::°“JEr†…e@´0cÈÊBÞ‚™(iËCÌ45\Ÿ$ÕÐW™¼Ê)g¶/>£ 7ìLš†%©ämX™&Ì_Ñ +Õs0çâüCÝºª,¶?Ø_^nh(àâ*lE @ââÆ¦Þ¼Ï)]·R	¥”÷TÞ,ÜÊ²àöf8.(àKËXT‰uÍ £ÐB	ÚŽ›J…Ì¤/^(D.U:ªR/­XAu_!sVóê×0bWÆ‡«ù”°Š¢Fo‘Üùsþ]iV<&½OüKí
øã½4_ž{„Ÿ^Váo-úš-Ž,¡	ÝãuË4ÉÀó-ê’ÖÚhÛyÃ<s±8ë4se¿,.Hmöú€_Úêëï†Ò'¶¨é)âÝ"ªrA\G"ÎŸ¡âp©f§§âL‚æU¥L÷Â¾å«Ëh¿‘«£—æõ
kW«š­½Û'/£L`†1Kf²~m©2†^—Œc†WM,3¼*à™á•55E¥“>Ã›©Ò^ÑiÒ¦/	í¯+@<Ã+z¶úhˆZ©Ð0tB©†’oè7®hT)Z¨š$–‚ŽšEM§Y€uV8¸JAe^©R8eU¬Ù)”×ÝB‰ÄBT¸®çx~PW©JÞw¸p 	“†WµÈÏ­Í¤U¬¹;Xß ]ûåŠ…Y:tÇóÂ4¶•Ž0ñ˜ÖøÆÊ
ËujgEµÙ€×|º4H­y`8¨p¥jSD²@¾…‚
M/@ëÛ?©‡\JGÑÂ@ë÷iF}¹"Z™bq\qB”=ÍÔÌ¡Úï'Ô#óÓ¢ µâùŠB¯©Â&Sa‡ò Jvûm_	ÑÓÑ n'÷;­­³µM–ÖÉöÈDpAßêÙ&x~·!´Ë%ª½»Õ¡íu¥qVÅþñ¨m0ÅÔ“3‰í^*¤—8ó‰Ó[Oþ\¦šÍÅ6À÷ñé‹OP’ÿIi5L*-<µšðS›{}Ž¸×C7ÙcŠÕµ{qþ{2þ±«‡ÿ”­R#Ì
4RýÅù¯»Ä¥p0°>Öw‰yqþú§'âƒ‰0Emí*8:8T¥•oŠ8p-œpf2¸™Ìh©ž]KéãjÞÐ÷þž`JÞPKÉCµn¨¡ÖÅŠÜ0Qä†mÞaÚòZ®À1•-õxá¥z×Ì(7`ìèkºø±¼¶]±…”žÅã!LºØÏÜR…GS“Òn/­2ÝçÑŸ¨ü…°y·TÔL<W":M´Cr]åRJ“ì…HgÇèB4L•¶‹¦…£Æ^)¯R¸QÊ—íÊë§µEô+Ý´™ë¸9x(
‚UœÿsðOÔf|‹9þ¿nO'fE'Ê/µp\R sÇŸE§}éôç	ïÞ`èÐPË/£¿|Äß¶´jªru¨J8êô(BZZ$‘Ô%ª˜¬öûpôÈCÃjaÊ«–@/84<rñ³Ì¦‘§Š‡  õËL%AÛ¨¬œ¢ö¿†«õðaÙð'§ {d¹Ac2"xŒ1Â!‹8ÊiAÆD‚¤W»pžF¶0Ù¥ÁÂ%DÂ©J%/{ÅË~®lTÙ2MaR4í*G-¬´,v¤ì+BpG™exB¡åÓq-‰V}JÂGê™a¸Vz´RAÕÀSšàZX 8ƒŽ]ûåa“¤R½ïG=ÑS,v²#Ö6bn¶w.Îÿ™_?ãÏfœâzXÌ¯l‰azÙÓ
Àª}„q.¹Úv›@úÆ¸:<ú×µ‚$y,¾â ¾Cgî¬XEïÔˆ£Æþö}»×K“¨®¤R¦…JŒÆ Êå²V2öLßCª³°YÃK'X>õšo-1N%ïªÿ
÷€´"ã*ü§ÔÒÆÞ$#Þ®Àa¶CãÛ“Eå@Éú(Éâi$åà,"­ÁÙMøµA•{ð£ö4Ðç“›':Ÿ§
ˆ_À™^e`üïYZazw_	2¾DígI÷‰&›Ò¬)r>Z¨Ù–y›­pó/	3ÿî‹OïïN¿Ù]n½®ÊßßŸ~Û{4ƒ*À±‹ö§Ëx	jRêÙ†¸/§jœÊý°qó!õM	Áë	…—ü8¢"@§BÐ‹ï4í ¤¬Zy“øVà9,‚¹u¨½ûž9GØ'üR3<(Õ<úq’æ¹W‡÷ÀP¬“aò“f?•âFI¶<Dgªµ!ˆ>0~:{‡e)kqVº¼FïQà}%äÆSxÒ7ºáÝÝû»MaÌâ8¯æíÄš§%N}rÅÂÐU§= æÓ)v“®u/ Åz&í×NŒð{#up]ÚPâ7R…–ãÀºãù#VÐÅªì–¹Î‘™wÞYˆiÎ?|8×Ì,}›–vVÑT©,9¯$qIII‹,W@™
Yb|V\ëˆÜsC§½7Â()>A3‡vëƒ½™ÙöA4aµžÎžÁQýÒf¥rY„*y¸bÂÆkxY9¼,ÿn*`˜ix7A›
"&†AÒÈH*³€´òUq]*ÔCc²õ&§?šx'·¼¤úX:ã¶˜wÔ‘öÀöÍÆ6©Ã¤énÿâùo»ì—F˜UMŽÕ/AM·uËgÔ,%>0içT1‰(l…oÛÔKÕR5/ÔUØ½ýà6««î Ë*`ð~®Y$!W&ÒŒ8Çaü¹‹åNÿèöjVK˜¼À~‰6WÂTÕqåg®Ya„©Tš»|(ý:å¥*Ak%m`¸ÙkdâÜGÕ/¯“8BÔHÝxú.´P'šž>wÕ±ô<.¤ÛÇ ·ñ—Ó¨'±«\-¾_nlý]xúb.ÙðÅ"DM½Èúpp<S¼fMö¿þÝ×h†SèK8A)N*òž"'ÁöW__„‘TL™’ßxsŸ¾.5æ™Õ$÷ÚÏ¿Ž·~žöŽa1ø	Ú×ëø{v]^ü=Ò}íè{½‡_ÇÞëEZ—â×Ä¬,Øm¢Ëvj±¶Yâš,–:náúDR'ââu9ÑÔ“,ôÅùOa¡iÈs,µ5_|¦,Z#ÆšwX+¼—|Âàê¤‰Ë	­¦Ø
ÒÇ·¯ îZù;Š„å1·5$OMª{iƒRC`ªÒÐ+um‰%2µÒ‰ŠAC³ŠÌjj(%™c×‡Ã › V¹¤‡*‡'‚í¾øŒ¥,h¥*i1ðÄZ¼¡;|AIS9•Ú¸yg›l™þÞŽwwjû.4r;òNç¬x¿ÝéäöZ¶{DKN¯Ôž¥ƒ³qy³x×óz j_ÎL²ÆKf“Ýôç3£c8Þ%Í'6]2›xËŸÏ\>‚78™9¦?¥¼‡’Yåw]éÄNxBN]aEûZ·?~‹USJ{Í®ÈžZ5T£Ç«‰B)y8þ#	1rpqþËnü®¥‚ÝtêrµKý{íT4œµÊ‰h¹¨…ä;ÝD4&B);.¢+†³›y1–‘@*˜¿×If¯P’Y¼¶/>¥÷Ðâ¾Cê;hPgæ³L.R²ˆ“ÿL‹í%ÉbÙû^§Šôýj¤ŠÅKú:Q,ÿóå%Š‰lçUNÛ÷-8ÁÝÞûÃôî~Y©b=8\æÑÙ	[ô^'Š}Å¢Œ®ùûhízµòºöû£j© Çož šr©ÉV‘]:Þ8—›l…±yyVŒ›Óó³;å,«nœeÕ½¤,«®˜eÕ½ò,«î7 ËJÏði)«cäß  ‡©R¬"ÖYkwAÖw-'(«¯V>REÝ°•¸(;–Ü¬zg{]7õ%y—öA­ª?úY˜=#?ªð~÷n>{Ô8ô[m.«®ÜKL¬Ëd¶u//³-£c6T W‰ù#·?Ñ!¸pF^^f›˜ä•˜ ²	“—œÙÕ}e3»ê¤»ÔLv™(Õ¥^¢Kl®¨é2•¬”º9)¢žT7¥nŠ2……:£XR7ÿ¤ ûDl<Ê=éÖÏ=‘ežÄ“:qÚÉäI'•SNØüÔkÅ'ªÝ_)Õ¤b^È4ÓLª'™¼Î)2´¼ê9#«ëdxÃ04ÜnTÙ'o’ÇÀëû¾çÂAg¢!ô©®ç›Í+Ù®‘Wâ†5’JÜ°4£$}4xédÚÁ–9°ÝÍSþA¾nvðxl'¾5ùKuÿCÏÄáÕ0@ŒðÜ?ÿ’ß?
,óÿ+ÿ´KGA+ríŒ¨Æ®u{”¤&ÈïÃz Áožòò»ŒxQ°xòGT‰Ï(’!PV0¸W?ñx‹…|c47¥•è^¸ÒÂ·¥b)Iëo¢¨} ¿Õ½Þ‘åï…²OÜá^þWýäkÞ¢>ò­ûG•còôø>Ö±Û¶ÛuF¦HZL?¤7L~­$¿GÅ‘l×p¶DÈ~óš¾	t€ý>4†›§üC!ç¡7&Ÿ”E•MVX½{t•ú[þbNFXåÔ§¸yšûJþ¤L6bNÒßêŒ–Fe‡L¿T÷CÏÇ1¦ö’ü{y´²—¼åOÅ£nL
…%ƒ’þ\:6E£ew­Zî±ÇDk'ûMÞ•B`²ò›ŠÜ"Oòß~DÖù3²öæ'’ÙØ¯y(_K/Ót¦ÙÔ}Â_T"Ds?“£“‰ 8ÖDÔ¬ÙŒ´3<²üTÅþýAo¶mëhf6o¯•I†øTŸ’Š†7ˆáÚ4_ØÈ~LúoàØôCëÀ÷­ŽºÌ µBÌÓ¥pN à
Å²eÜíŒÜ¬œ4qj¸òž{àI$_Iaéžo˜6¼l+ôZ>¡Ã…Žj²¯`‚}Ã1Y){!âòÉòRl¢fqg<"ê8Æ7§Í`]êåàÎŽ/Gbnß6MË•ØÀ²c„õðœtzXdšáß£ÖÚ
¨–ðx	:‚ùÅÄOÏÂæœ‘ßZ†µ~kqþ	á©&ší4ïÑ_\BKÐDC»ºžƒVq˜|.ôR˜7
T¼\0T<%K©Ð@Ñ¹ b“ZÂã!Ò™IŒ°]Çv­ÏPj–÷û#LÒþ}—ì2ûMß#wíñ³­›ûY—%c²jÞl÷*µÏ¢È¬´Í¾ãrüÈ,ÍÑøCjƒF2(÷wiVqÆ¢Œf=?½85>Î1QÝd[:Ú)Ë°S„¯—Ñ´.r`Ê¼naîfîë$—3ÿS*·;‡7Xyé.‹ÊÂÛg%“5ß_ª¨Æ,—ÙæA³FíÚ…—ÃURq¬€4©þ9Ÿ(ŽÄ
»Y~,´ù†Ð§<fÙí£ëb‰¹.Äm	2©XoÓ~AYÀÀÌ‡Ä{C§R}aÈ<ÛR”Ó-¥r‰êcðƒNk±½Š;l£-ã‹Èí‚Á–xGá‡–DfÄ„óPL€jšT)²ðÑ-TE(ÍžÇ/§›Ðvþ½•iŸþ¦62•dY+â£]X7âF @E´³PŸ¸,Œ´,Ôqpqþ³ªîXj­ËE¥rÿ'ˆk„ì|XÔ"Àè:mê;5Xøç"ðŽ<@‚R hµ®™QJ›º£çHàÊX¦‘éñïr/ú^Áî$k2­êËÑ¿óµÇFjÇ¼nTË<c4f¨jš3iÀga6z$C]‰>c,‚,ÁLa™:Píp×âPWí0×²×‚ãP: µ<Š	Æ$
Ìd>ù¥ˆ‡E!šÒÞéÄLÒ¢`f”³m1`5`XÑÙ§‰ ezXà™›B;ŸC?·ÞÂ‹çÿIe77JgH;(ÆýÌžCtèââü¼ñ3Øš,N¬›®ŠÛ–Î $œT:­òÔ”R:$…á‰cÉ TïbúeÆ|YÐþ¾ð«Ò# iýÂZÉâC©
µ˜Tú,Œ•ž˜“À Y#
HƒËÚxƒ\ùÀ.£³3¥¯Z‘†ÈKCVXVp¸¢Îg¡Ñz„ð÷&;>ZbÙYPU!`1]ö*ê«RuÞ`äiG"êz+õ8æKÄ”¤„Ø±úøÏ°Ô5á±7/ªpÄlìY9­yÜ±WeRUÑæ¹™e‰‡iß;æ©N¤¬ ú«2•²ú.¹iÜËg2bmžh¤F%®úÓo?2œWszw<Û-Ûþ;2§v‹¾}:=mªÓŒÃ?y%§wÛðá˜óÃå2Kaöü×¯OÈ6\ìÀªO"ûÅ÷þâ:á\›4i®éyŒ@Ùs„FI\¹uAmÁ•œˆÿ~"ˆ&XöÜUƒFb#¾ùoé÷ŸxäKBŒdYÄüàþ€¾Ì€‘Û d’`´€òç
§‡†"í˜¼šªÍé†É¬\€¥’ðÕ¢DÕ<ž¨Œö; Ó™ØÇyee`ýþ‹e÷£.5M·B¶k±­ŽïXw`O|üÕ­‡]iiQºý	3óþ¹=0l‡4#fn@Ñ©
7¼”éû–»«ñxôß{8‚v×+´Ë¯7øNŸÿ†¬øœéTŠ)éñt¿ç1$ ¬Z»—ºAË:*1ÍM§fŠ·ÚæqqóJéåSI.—¤–c\ã&j­T|IÎêyÐÄCh¶JZ·¤£žùø¡ß¤©p¥MÚÅS4÷„»Þ¼Öo´B¢yyšùËë§`ÀÓ©cªúö Ië$½‘ægü—ò rànÑ¸ñÆ#›8ã?Ä›Á\ŸÐÅüÃ ÅcÕ¢¬^þ4¢ß™é½ø®®I}‰C€um’œKò5÷÷Dç2ÝTí¹ânN”É=à¶úy—<EL¾œ|%ó¤“°ÁÓH½î{ÖÌ!K¨0L5@@êÇÀš¯\$˜™Ópð W~B Ëè´ò—Dy­“4A‰SxXÜé0Ãò¶¢`ÁõÕ•?‰¾gax¦•?WC[Ã?´ü}{`Ú=6ËüåÙ-¹œ™÷no±œ¶ÀsœxâŒb)çä<§ž+Ù\hŒ7“y³ŸW8ø>ÝuÕqrâúLyBL^â«ø¾v“NuÙsIVP9K’çÿd³ØR'[¹>w)ÌÓ‘„ÅA[qNýF¬½š5(%¥&2ñ\õ Ä69#•Qo)²ègH¯@.¸Rp1=ûKÒXI}þ²1Ç.8¬Ä÷ó†»¼FßmVË`4]¢ü9ôÐÿ  ÿÿì}koÜFšî_©ÑfG­©uñ%‰Vv KvbÄòx-O&{|‚cª›Rîf÷°Ù–4:úó!ì‹ƒÅ 8@rŒ Èì&˜`q,ûAÞüý“So]È*²H¾E²[—4ËR7Y,ßªz¯Ïs)¡‡¶‰ ‰@úö[<‡'+ÒÂ‡ ‰ÿËËÀtM‡.às6þ”¹ë‡îá.Í£5| :ëo5öÛL‰Ösm1åÈyì4|IáðëkEÃAcáD8øœqPè	5.°4ßçYyÑSn2‰®£hôCø•N;è“‡É{WoÐ–5A?ðÏZ¾š|)6°5éÅ[‡~ˆw'Í;ð‰ã>y¸¸Žï3zÀÊÔÃ£ájÄ“0µPŒb¦@È[K3¸ÚÝÏgvê{¥á,ŸýÝÄ)–À™^|u)PêvÍ;ôq@±‰6í`cB%Õf^mvðÛá²6;ôkn¸ª?uüXó¥ã[k×î8í=7Æ-êBÈšÔ2=ZÎÀ®÷7™“£Â™+¤,g„\£À!ÇòŸ™7Êf§[[dOd1bßÊYÕ¹ŒšÊîdE’xªÝó"–¤Ö²´ËH–¢­HT~ Ä]þyƒÕfFZrü1é,¼}N´ðÕ`°Fƒ¶“€Á’^÷HÎPÓ»êZ2:hb:´XLóx@B½(ÑR9D¯Tä—6qèèqÄÌ›¤ 1uXó?	?e”÷ºw¿Ýðé£^h3þª°qc_-¯°Â%³E&#dÛya'ùeHîÏqë(Ô˜†jŒM®*ËÃ`ùK¡ï[þàìäëÃ±¿fK”Yk]©Ö@1qxâ²è:õ¬ªÖ(ð¢*fE£)·_‚S³"VJì×XƒsítBÕ‹nÈíFKÇºé1¯þkÐëš€)¤[Ã¤P|k3#ò‘|UìÞdÔñ<ïœü‹'5@ï¿¾Kp:–D÷-oØä ü¦M›R
j.Ð¯QY´ßØn/§‰›A•"ãTïê*s	èßÒJ³½Ú|áíZA€'£ŸÍsf/\Láµ8ÅFã¯¬¨%ô¬Às‡¤Õq- 3*¾1Eƒÿ{Â%ƒOè×WÀè;Ž€Ýº"„P™þûj><ýž¨œ•t§.WF˜ð ) ©Ák®èvô2VÎý®B`h`“­'ÌËê«’˜‚}êÛ—%q8˜a(¸“²ð6ÔS.diR[P¢aÀ H8($|?",lŽì4 y ‘#?Ç«6ÀXK|Ãr‰Ù–Š±“â0`!zÒyuÅCÈÒ‘ÈL¤¾Ò@ÅWbÜ¦ÿù<Q{-R&ZdU÷*"d,.Q–|Òxg'¿«°¸ðŒ²¼µEœq±––'Q‰Jlþ\ÌâGCæ^Ù©ÒS§JO÷Y©î* ÃÍùö¢O+ô¼J(+ˆàu¹©™;9UNÎÂyˆÍ4LÎÓl,óø0å>Q°Í$ÔæÜ?Ñcak«È9…›û€7™ßRî<.´ÂÆñš9B[¤A7Þ¼Ä `_xr}ƒ{1%:¤Kü§ÅX)‘Yg¬mUd†·`+4x0Ï¿›/PM2ŠV0	±%8}Åì—Ðcœ¸Y k4!ljwV¤¤Š ¢z§@[Æ` v—8Õ‰ e¶›À§ÀÔwN¿k±4ùÆÅŠjMÆbËfLÛ¥æbm!txæö½;d½=DMØhÊjsri&9Ãî1Äìùso'5w’©¤J
i±æRè¤ãðIð”š‡7›?Œüœ«3”ÿÍéökHh4áŒ«3ˆèÑåkQèµŽ¥h;8ÅIÑŠ›[íf©Îyûóôu]¨J‰÷Äôö¨HO”«ítM\¶ÎN¾bØ¼
Dp¡rVR\Œ¬”ýýø`_>±Ÿè:¨ö3DôOD![x0ˆ€RÝ-Æfž$L/$·ÈÀ	†îGN·¡FA/y½~íY²’
õ€ŽÎ+:Tg'Ÿû¤óÃ—>YšàH!Œ†…¿5ÿ¾ù¶Á"Y‡šãžÿœp´XD7{ñægÓ®
˜]ÞÓèéNStÿ¾±Ã²ÚÉbŒ“@Hp]PÆ¬UÆq®Ý”M *c„áÙÝ1Éñ½Bùá—ïí™.çê²‰ßtMM€*ƒl` ¡LCbûF¶Ò7¶ñ‹°ëÐ>À”]€ñZ€§^€~/°{Ó î€Ã;É˜lüHbW“âZœ/®å¹åâ8Â¸î‹áÓî¯L/I‹©­8#hÀ0ox3ZË‚OÝº×tÏŒÇ‰oH6LÛb´ö]÷ùÃÜw•,Ÿ~è:."›TyhèkC“Ç=:ÿDObÈRÛtE¡ª*¢(‚-7«úZS|•Ãv¶UØøPRT3óÝîp•\´»C-¥Uú¦ c--ì‚½=Ì¿¡	;ý7y!lBÓ\e¿`.èÃ
¹J-<ÿ¸¸IŸ*¯ñëU–Éƒ74Rð`;Bþò ¾ÐWß9\e4Çï5G^»ø*8õ.‡ìâW±âèÄnXÐJ%t1¾œ&ÐÅrNMÐ‹Ö²@bI2Pl¿K ‰%Ü¸8P0ÍJ²»äÞŽåÂ±cwscØ]"MõÂ«Æo&vîKoÆ½Ð™7Í³é¹ ßa¬;O‚³“Ï‰a:É±b'ŠQÖRó˜´ä¤R€eW¦LÍ{ýõˆ|ðRoþpúŠð0‘V¶ÁÎ"Ÿ¬^”1N_¡W\f”±,Ê™‰@mD¸bqB$¼ô8•ŸN@‘}Õ"Ý¾[á3:‘†g'™"]¤1•È n´®M‘å¶(ÂƒµcŒ)¹u·-½ÒãAc$Ë|ÑL:á¦Ðf¹‡¶‚³©VyT³Öù šéLoÃB]Ñ-„ÈP;þ“EkªXV—ª˜7‰=â	R{oU.B›‘6u1¦³)¬™d+Ú¦-ëyïÝY%@Aîûa·É]0À#äP‹é…·ðÑÃÙ¹æ.ÿ;~Ž&sKÀˆ,Í“ÿiW*øþûeîù6Ä]mFñ¢”÷äN¨^Z‹»¾Ç•Æ‰DŸ.s†l™mÎ:àK÷Êæ,Û.RÚwT3š†ELâ€3m„•3îÙ Âüæå¤ß~9X¤ÕÁ¥*ƒ+TŸOEpÕÀù•À-j÷ýµÅÿóµºàÈjÅÂrP*T¡Z¸T=p¹ZàÌ:`éúk•,Î)ÿU›–•¿­²E¿	!3¿õ±®Xó[µÞ×ºÖå	3ôÓê|›³-ê{­Šjë«ëµ­éÖÝ&®½u·×VÉ“~èt‰ J¥ÊA@z‡l#»ò[Ó*¦ W\WX‚[Ù‰(y-éµdUÄÝÞhhö‡IzƒÄÌó`åMXÈ9X¡6["•ä§¬zHÖ÷öw-…CÁÜ ?rÛ›NèH²áôŽ·ç³Â^kª\7³×Œ§–£žŽÏN~ÇY^z¼ŽW É??ýžûàãóyä£Ù|÷áÙÉ¿Ók¢í¿ÝçÂi ’õª'b”&>ûø	û_ìDÆ8³ßÂ‡\Å¬:s•ÞØ%2ná.¼3:þtÄYÍ)¸_¹–¿©5gQÌYPó]±cvÃb\°÷+ÒÕ‹óáü¢Ÿú"B_ýC+œ—QÔq¾ômÌzó6]?<ý~Üw¥§àé´÷[ùROÿæ“t =ÒØüá[*î¯ÿÎÕ»È“zvòÒøcÒ†Ùõ0¨ o‡Õ¢,¼©xOªi)cÎTjƒxí¤(’Ñ¼]HEk7yWKèß »³¿ŠµwÞ3 RMÝf+ë–všl­ Œ›&‹úÙsäg„.°$-ß–g®¢œŒ	Ï1¤ºÇ9^®´ËXó¸¶U«½ËÉÚá$;¡ÀÒ^àœFú[ÏÑäúËÜ&7¬:	ØÄºŠ3$@/ŽØ\c³DwÍÐY "¾C?²à6À½½+ƒf!Ï­oà-†FœPÍV0ƒ†Vˆ®ì/,ßŒõ¾eVã±)H,S'Òž:^»íúÄóÒ|ATdÚK¬¼$ŠÄµ|›¸3Þõafla·ùþpxu:RÑÌ¦’.¿}G~é€ÐÊog4üuKÔDK\ÝaxØ¥£tDö½6$È>{ëˆm_=Ïo°^Î³=êøïŸÙÁÅY9¬¢8) DÅÀØpÄžäøïm¦³U¿,ç¾WªÐŸx\dRµ
UùvUFZY‘ƒJuNÕâhw¨s!]J=úyÿÍ>Ü´s5‰6¬]MâºI£½= à¨~wÔ£f“p³MÛ-+IèÆì,\—&òŽ­œã$“©]ŠB"Í·óp ìÝg´¿rº]7Ô·=NT›Tp³V5Z9ÔÂ?Ž S´À}k	RgŠüFPa‘)K-ÙWÒaÞ©ÞÙÉ7š×‹“¯úÓïzj­çD±ê®“AHØ€œ%ç¶½Ài{ôaa‡¾ä ß“o|ú/¼>}ƒðÇ€Þ-Ó#®¡B	bËd…¡°ÑÙ—Pò&…ñf`/c†RoŠ“ÞŽ{E6N¿[-Þ­Ö†üU¦D¢›7GÐñv¤R½ëuéÀ¸mX{ïˆCúç¨å6ÃQožìðJåQüœ4vDDžg{ÌÓE
9ö˜¹É²atsVÚsõ‰üÖeú ³Åù9æw'”‰„¿SÉ-…dòeu>8;ù½ÄŠ cso"™ügîäqñ{Î•,/ÐþóDùº*Ê3··Ì§Ë²g§³\g0<H)r&>Íw˜=l’3_Øa)ù{/7[·,º]}cõ„§3×_›MõZG)™;ïP`«Å+ãà€k†W!EB÷{ç Òƒ²Kþ=åqù!®£Ìá1óIUçhxLo½l•Ê&ô÷ÍÆúŽî»ÔpMåz„¢Tcwûg'ÿJ†?|)¶*^e¢	7ò¦geþvŒ‹Ãïfž©RƒJN(Ø²Y-z¿¿8ƒôZÏWwÄ<&&°Êô~Y™>±ÐmŸ	^	y×oÀÎ¦¨Dr, =KèYÃ[’bì\>f82PKúÏZ°-‰‰G“iLOÎ^EU¯_ñh2;2Í#ç…ãuaÙJ¼XKMb@ÒŒa4,Ó
“ cÅý‰aû,„þ©µ¦*{‘ºÌµU&;uuUêRø¡ ¦9ýs’'^u(t2Åîô•ÍC-¿Rö‘i±ÕE)¶bðEYu¹
¢Æi¹*ÿ8âìä{dÏsTAkÖóæ(.ƒK[eZ‹Ùö·S¾Jjç|«¤´÷NV‘Ñ‹KvÆU\¢.ûºŠÌî:±‚0suÔ«ê¨£¡³ë
gÖN3™'³|°Úë‘v{qkkñ³ivMØ=¾ZUÖ”â™D–è8ki¤çn¬µ4Ó„íóOØ¾.âhN+9Ýjq4Ñ†uM\7£M0Ž•lÕEÛè{~"]	¢Å	@‹·‰ˆ|À¢W	J§É†Ñ:PüÚÜŸxfòsž	nHóòô•Q¥à­\•˜šÈ]ˆZ? ¯TaD]qNñ4xÂØ¬KÇ«7š<Ž3–¶Î–@Ž ÅÓZj<MV¸Ž!žå]ÜhZ¢‹W,–Æ	•Õeœ15UÞd\­{öúk_¹ÿe¯…_œ;#º·Æ_‹Ö8¿o[›ÆÖÊÅÖ6…Ï¦ÀšaŽNƒkòþLpÅ¡µäiÓÀZÎ½/O`-z­Ó°Zúë±…ÕÒKÔe­Œ×‹Y3Á"OÃjñyÓ°ZÍm³¾Gn™±†í„ƒ¥#X`ÇO‹‹~¯D M]}/9ä ±ï2"µeÓä“NÛ^?8œH$-#¤71ŒGlŒK–Ï]~¸¸iˆkb!.Ó—é¦×R
[¢åÌVéyÊ_àBYo÷<Ü&	§ÉQÃòïè<ò†[ý6ÿe½Õs¸×¾¿¹¹Î»3ÏwºÛ¡³»;—v¹šBnÜ!'Ö¦G÷BÉ°»6Ãµ›Š½Å*{°¸i ;ù”’Î¼FI‘^¿°otº°‡“&ëš,øuõkÔ£Gw`>.uƒc•ÊLƒÏt’ÝÝÝõZžë·É–ã;{l4¼qu¤ãò±v£6r}éYSó‰k2¼k~ßw¥c®©‰âl+jñ¸lI"T$"E;ôÝ°eš~¤Tpò†Ó(Û¥—÷À¦šX×D˜¨h‰L±¯ÀÃŠ'Sy/1š\ì½ÄÅ.âÍaJ’sÜ”+†XVœ<{CS£ÒH0U|D~%JÕ ÒÃˆêzaŒ6ù‹ÐýÕ~2jñÖ›ßúd€º^œ~Á;*8ÇU\/n&sd/ÆvÜ~„ñ…Ýò§ÃøSðz&¨$tµ£ËFÏoq8Êõv;^´Õ.•ùÐk¯ªlÕZ"ÄMá÷æS„J¨õ¤Ð\ý1Ã7fJäñßš}Å×µœ„^&ñ‡g'ßÁ+îƒ·°¤É-LYAyºESÂßŒRúÄVFÕÐøýqÆÐ÷HúÃæpÐõ¨zº0;÷té²Jfgq÷Il€3d“ËÑDœŠÜ2ô´¡.G4msódòå¶¶ð ¨üVOçIïQH*OŽm‡ª S½l<{ëˆ>ûñÂ[G½ãgÈ¶PH%?3D@wÏeS€mÐ&Ò"¼…xøæ·=40«eX@»7ji‹£§+K+×ç	ýyƒý¼É~¾Í~¾ó	ó`âýJGb×ýaäº?ToÓ/ì¼øüÀØc¬6}ý’´ø,_ñÅçpLKÏ!,<°þüè—î¾‹Ïz8‡M0[G„‡ªVÉò
9ž'ÿ1O<î9õÈÏÉ²J6Ú8mj”ac…JÞÒìÜ[§z×)-Ä(ÜøÖ‘F~\ˆ5
g« Nºhºg¾ÁjÛ®´:ày‹A¾‰_ÈMË¸hµ@§]'Ë6%YÏoÉßl.ÛrÑ…ôwÄ¥5YÆM bSMˆ …j-Ô!>èvÀÔòüœÔÀ™LdÄ/?^yÙÖœxÉ¹ïF(	´o>‹‘`pµ­þ£ÍUrs•9$¯i#LUQòŠÊJ÷¶Óu‡˜Ý°ïKÁvYvuBºY;·I÷ý=7l²[!vÙ+*‡›±G­ñÑÃÍ¹±I"ô£”.ß˜_ZZ’ÿÎ_(¹ÑÂƒ¿òÂÎF¿×s†MV»/\%V…â*šJl3pÙ@5ÿ{sq*¯³Mq2Œ‘\<-!sœ¢Þ‘æ™gØ¯ÒR’¾ù˜ÅŠ}òvœ¤ÜÝ“¿±oV––T	AÜ¼íaKoß:‚!Ä
oáõ¨‘tÃÔð_{ìîî°³±oªÍr|x?èûñ|ÒxZY%kº#c1—<#¼€b*ªBO@Ø8ž La¦b±/¿Ð&ÊÍ¦g'Œ!—!»^&BÕdõÚ«Qº<ý½8c‘8™„ÒÙË¥š³;Üóºîö  £1ì¸Iø“d|í*¾FTõŒˆW¡"byï„åÂ§ã—õ.“`27j©äTƒÃžíºÚ‰òw†rO•×+’R~ ÑÆHØ–kÄÈ™éyx¿7èa¼nzN·¿÷‹ë7Â µõ¢œ$ šÉˆ¯¾Lr’ù?’»-·[Û"˜J6‰sLi$÷B:Þì¸*KIVRG–äñT2·Í‹¶D©ªËE0’8øÀZÚàˆ$ŽkïŒºÏ7C£ÍŽÎX+àùn®÷½ßNdÖ³·Ìî¤mòw€ÿwC|"Ÿû/!ÙG™}¡ZÇì›?Pµ•1=6›ÍYªQ<ûXoå>èñÜ3¬KÓ†Q°¬ü¶Ý!].XþÔäe¸²\r™\ïv«ˆ¥«Ø°¦ê"Y³Ô­wÝ BTtt…"%|L˜Â¨”¨v™Iç
¦LÆfbë\joRi"û7‹•+Ö÷ª8;Ã~wº¤ëî†×HØ,,/®…0p|nÐ²4 †˜_£YÛtw¨¶Ü6Ú–OØçO ”E¦ÙÌ3÷+XCµ¤ª½]˜9Æzù9£f*N 6ä8ÙŽt™¢X¦ÄAÒT•MÆ3¶d—Äè©Pï‘ì//NòKÎÔ‡®#f=³»7fáé;Ì÷X<SNJ«²S­#Ó™iŠŒ~Ô·doÊÌ•Z².fÔø/]ˆ5ëâæÖù—YX¦;c^2óÖ?¤çˆÞpÇÊ¨Ö*-–I¢ÆT§°È³e<ÈÇÏu?BAà®D³5ˆ#×`ÎB4;‹|9èÉñ±¾œ\£ÆµrÆ¼Þ´ñŠ*%¬'k«ð”2º¬•°íD(`‘Ã4ÝX‰kÙÀŠ†àD2•[P˜Û‹­#ä±bŸPÇa8s8•wà›ûþnK’˜®
»NöD»(1®~H´uÇiï¹±§nèRu¥í‡3	Q`ØCJ€èíØ!Ìþ^ÖGOcäÆé!;&O~ñdýy|wã7·QK8{ªq=¿vI„fª‚'¸›9÷î?xr÷ñÝÍ:¢¾äÓÊ[¢ìåé»Y0ˆLGôB‡îN8q‡kÚM8Ù.øE—™_ô#ÏÝ§Sž0DƒÕ¼§:n’_Ò¥àcöÉ°Óß'Tqk"¼ a¦p÷Ál*3ÃVÐïv!î’…Ãá;@¬uÂÊ 1j•Ù_ ªï ¸¯‡RÛ@¼Ø›Ë=AÃ¸½ý¤.Š$1ajÑ˜‡÷ Ë´žVÇm=ßé”£\g¾o	Ë¨mø×ètZ°áÄ¹Ø[@Ÿ (R´Ø‘Ûd	VÂ˜^áª‰Wt¥gÁµò+âí’8}L<áœÅõÌ¾ß6=h#ûéÀ, ŸAÓkÏ¡=	Ôò'n—J{-Ý{ú‰Í‘g"Ù³q!K¤¢xÎÚ†XÌŒÚÙºdrS£«Ó
xˆ†ý`aÐ÷˜2—°ð–yå¹nÔáf^¡·M…ª1ÜÌÒ?³}•Ìäêì<i{}ùôž«NiÒ/9:û¦)û8:MÀd[³Ç¦OÛ‚ð5ÿàgÀ#×X”>Œ‹ÛÀ!ËUÈ"Ãõ'këAÐßÿå`³¿ïX¢×¬,Q$_úå_‚ð¢I1ÓäòÄ˜Ÿp¡åXÇ‚·káq›JóUæ!ÔWäI3?áêJs\Ú3h+æ rMž^€‘'Ñò”K!Ó®ß¶Õ:â¡Ë+ÑcZ}!„¸Â½hO:NŸ„§_¶¬:‰Ç´‚µ=8{žÔi÷rÍ¹FÀþ˜'^û À­#‘ò&0p¤†inãØHBT&\,™Î=ÁX¼e™_¬û„“ˆäqåµ³ç’²<G~FV–ÈÏa¨ †iµ™ùãwÏ”vÐLÄE£8iÌÎÏouGtÞ6"YCFýà¨àf©ÃÑ’ãËÓÓf³	¿Ï“èùl¼¥,ˆn±}»ƒ^>¡?g(~v½Äûm°§¢7£Z¦*8Lð4r©€Q'¿c0ã1Q0žŠ$>¹ßþò‹ô¡¹cô&mîLQlSb Jl Ù/øSï|bß#‹“k’ uÉŠÏU£ºðæx)L„£âcìrá£û~«¢êˆf'n@½Ó13§Ðïb­÷M«ø×&PN|†<D­ùËËkÊ-°¨.¯ôˆeW/”A_­«{àˆ„x¯ÓâŠÇåÁë{¼Vß·ºLÓ}Þ¡ºÏ;IÕ’«¹Tl¢]G¥µ¸yÂ¸µÞÜï¶=½ÌK›Õž†Qã`©	­dôU¼„GÐ§F¥öïa0²+K­´¼ƒŸt>@µ{×šP)M¢­nÖ’U•»âÊÍEYEšU6:á™ã0õy}_é©x˜,Z½ˆ²l*DŒ0O%´a†À¸‹óxý0¶(¼LÒ
WzúÝíãß:º©;p®­h“Äl³H„‚c£óÃ·i~Å…%]Žßã@Z>y Òþé‡çþ6‹	âÐ®9t
"wÝô^¿fg<½)ñaÌ·fÃi¨zûLÞ=æÑ8PdRÂ—'%ïúqÂÌf.½ë†2¼[—QåÒéÖÙÉ²—±V¾yÉ˜{|¶v›z]ÚC Ã¾¨Ê¶•^Í>ƒywSzByv©2ž`ÍIV\uÈ¥…Ó€<½É>° O9‚/ù³VkžU,±]–þE~ÎþT´L Ð¶2-Çsó)pK“	=ÂÜŒ<Úƒ€Ê[<–ÙQå‘´C+¼¡ svóI\¨±ÊÌ²!…ã«kåäÙÂÖB©r›G<¦1È;øŸ²åÏ˜‡Ê|“Eu#n…¶ìe…ÜAÒ5ƒàà"—×è=”Q£çPeÚ,xTã„/=lsLPã·>£ùð|^ztýw Ó>ý½""©Ècj.•ÿ\¶PBc…šré^œž™°µRì Š
QØ–	•„ÅÔ@½].^0Ò1þ»Z;|¼å„fÏ9h,Ï“×®EˆE`£ã¾úþw7`›ð~.}a ŠÅç­Bm‰—we¡P^»EÂ±×ºdeÀJP«‹ëCg	Êcžîb”.—”ZDQ¾‡à—Fc(ZßC'Þ‹¶‡ñè–ÍÄ£'AÍ‘TzÑÝSDo²¡\š7’·V†Nx® ß†E™·k—C«$²’Ì–@NW­Èg«ª#¨bNÌÚ^ŒiÐÁ¡ÓïÞÙÉW-²©±‘¡`%I1‘Zûë?ŽÁx÷ô{öO¿ o™·¤CcJð&`"ÿ*¤ê7~‡ì²08ý“O¨6ô;¦½ô÷¬¨ÔØ *ó*¢f""a+M-<Ú%‘ñ»(Ú{7o'M““é’z•ÓUaP=I ÎÝ=€­÷‘dŠ@4´Ù ¡°ÛOÖ¢Åp‘´€€%˜Ðâ@7íÜÃ?N™ ½×%ðšã±RãÒF8ñÙíø`S]Ïé]Ü…ÀÆé·ŽÖºIüDqz æçu,À5²6Úðü…ÀÜL¬Utn	Ì9«Wz‹©€3T‹/QÞ O¤Š¸ž
"9v!‘o@¥¿yÐÌÃÏùfkøbFI¦ã«#9@Ûc}1—‡¸°Ë;YBéÂ²ãXÎÄ‚˜†ùÈòŠU™¯f¼ùTÎ—Q´+²Îªlþ£5"}oÚ YªécØ[¥V7xˆopØ%9(×âULÕRWl°•ø]qÙÑ©ËÊèvúx‚–÷¹N½Kô"CÑËSð$øtçôÿ‚SªPy]“Ü9{M¿‚Èht¿å\»@¹ë|:Š/nþ?ˆœ¾n‘}²ó„ŒþþGº P½p®)ÖBŒx±ÌëÊdÒ¯L–]œ%ÛR³IX"(~–d|*‘ˆ®†«É3yÛ–µLéÜÄ†w«d‚¤rž}˜ëìiÕ†œÍ+ÑlN;U-Ö8ð€Ú¤)½¤5®F'üOHë¡» òG´|
õ‹­!6)Ö™<¿Óï¹Cò>íR›<r‚ç?ý»å¥ˆ>ß kÝÙ7V©)*»Ñ#%½Ö®#kŒÒ\ŠàÈ¦y«”‹JIÁFÒf›ÉZ×tÛ„ýˆ-¤‹äÃÎˆ¼ Êò“–D˜)ÑyìîÑÙrl¦tÓÏ±»#ÉÁMÌ²=’¸w,ß‚rcLâÝ³~TðtLÐ´…¤Š¶Ë '¦ºfÐmÒc¢j2ŠL|ìÅ)X)àÂ€UR	©š€wp|[þ¢ÁZÔÀˆGµ(L_l5‘í–’?óô©®å‘ÎéŸýN½“þ	µÇò§<;ãêLø.ÊÁŒK›Ï÷Ð8ßCu¾‡r¾‡?†ùn{:70p9Ú…ÂÐ×¹çŒÄr+xó_YET59Ó`)<Ÿ~Ùâ¶¤/XÛùâÉísÁËŒr1q[úV0¹XJ¤ª‚ÝU†Geð¦;ð#, Ë!"£öW\¢Ë7SBhzÕâêù>"µÏÔ«…e™-¸ò…2“je>À &®Èj´c[1 ³-0•ªaÇó•ª,©‹ %ì¸}æ²‰Ý;º¡þG‹ôN_•ækYŽ¨5ù
gŽ2+›d®‘ŸmÕ[Ñ¼${Iz—G¶××EëRŠy&ÏvòèÊ$ËoÐìCjP+×³ÎEÎ¸¥²Œø<]¾éäÕ´¸m¥F bÖÞ–3¸ßê'1Qd‹1fƒm:›4 ‚à'Ï¥wa+ÖúóØuæbR‚xDìAüF¾÷ë‘û¸ØúŽMo°ºK(àÖJ7VÑ>ÏõŒOÜj¢œ9]K¢ö8‡n0Ì]J`ÇBÒUœÓµÄ0(%–“	õç¹¦ ­¡Šé¤j^$«–àI‘ûU'w\ÒqwžxTÉl» ü’!HB;¶¨&ˆf§P?Nß33—­VXÚðŒ´I½lØ‹ù¿éïÅüß¤žÛÉMNÅ-{ùÀYÄàN¡K&žciíÎÈë¶©Ù¨#VÈÃyrkAfj¡øN®²#;å´»G²‘}6Ó¹6DæXÒ	QO6S…=Î5,^„¤é†ÅEGUêaV¬¢Û§ËË9jÂõD–í‹Ó/È sú¤Ï:7Ã*›¶0OŸ}ù}ù[[ŸRõ$n-I`a9ë˜òGO'î$ýëCº"0zÿrÐ¦—s5?F þWTÖûy§#öW|–f{/•™jƒ¼aÉo(ûIMšä2u3	'†ÛH¸ˆl“Q%,à#‰hfÏhP|qK_ ŠÂ8Èá‰ìÞçW²ÛÙæëarõ®×š«W"O¯BŽÞ†Èn£ÿ…|„Kdè•ÏÎSóÈbì“àÉ‚¸"ç}Ç{Ç›—§¯èÙÐXÙ¬;ûŒ»ä:=€\:cÇæèTÑO*/G&pZê^ù.…—´À¾ar‚lO´¼å{BÔ3ÍlªìšV©6¥#éŠ¡§óeð” J7Ëd×XÜ‹{ÀzT.&o·ðÞ`O´
K­&Qoë]‰|·×vì|OU–yË0{b·ö0XU£…íˆ‚çÒJ<8’Ñ*|âä©_MEyWV…ÏwÇ+¼šð7Uä³/©¬Èë™•“×çÕxÀT•?wUþAêuÔ£Å³èd±¯žv5xUX/‹"Ÿˆ˜UTãññµ©¯8>5žg°O•ø‚s'¤ÄçŸ•W`çà4Zk˜´›£ÌF2–d.HA²'2YmvA`ûÐo	ÑÙè·ÝBpY®Eã*¾t$ÁÑ³„F»BÞJßÌT¸Æd6{üŠøÉ›?œü+@ä¾ÌÖé«™’“à
Š•D—œQôOM¨¸xu™‚E•ã{c!7j²¯
e,Ñ;$øøô;§‚„•"\5@6¾……	/ £_Á\heãÛ
2Fáˆ*½Çšé…F:Æ;³ÞuÐe©f®Û•ÙRFÉ]ÈM©*OÚ·6Â+˜àjÑ>ˆïY[áåmðN¿ fžÌ£ ÈwH¦ø^t)ä¬	 lœüs™Áp0à: ÕVÎ.·µÊ5íZ}x€ÈµÂ-ËåkRæ:S®ãœœSÅññíÎN¾>,ƒ“e^Ç
ûÁ-¥¯‹=s&¹ãñÝn½Û6<M(ÙÌ¦¿þgˆ;ÛJÃÆè×¶X¦‰)*Ë,([È3„REV…¹7qãÁ‚3
û„Nš~·éŒ`’…H×DapÍæ-¸HÿÁòd¤CâŒÇª8†$ƒ°–&Áž1èÚÁÙØñ~–dýÔ”‹ñp~¦?Ízë°ÄßEßÐ¡7qH€£-huRPÅ×?w#ñLà,ã€Å–T›%è@ÍzjCCŠx$é¤?Ž—áÞ3OÖü ciàªÄiYoÌã’p|û	’¤ãÑÉX†q\„—²¬±}ÄzUcÌçÍæU±¦Ô¿²TÏ[§¯"\Ý"nr4ïØŠã{<‚þë©„ä^ÚODxFÔTHò8ðG'  óMÅ#ÿÐâË—MBª'·6îŸ%¤ãÐ¯«O‚Ä*MÕ÷x¬À\|Ù²è!–åIi²ÈK°†§÷pŽ&“eô“–¹,È­ÆtØD0€“dü½e2¯<¿ÕÑñn0»‚Î~…|qei†.3)€ñÅkK3ÇÏPËBu›™d0~ÙË¶æriƒy"&s¾Ñ¬¿U|&C;¸K8ËôîèÍÓf³	¿Ï3+ØÆ-euþorþ¢†×†OèÏŸÐÔÖFÇÛË4½èâ~+þ=\‰ºyÂâçê‘ËùÊ£Ag

+]¡°éBkUI$é-‚õ}l@Ù½›:+´›ˆ¶¥‰•4Ùdî²¸^Ãƒ;ÌÑUýÔ‰_SÐ Ñåt‚^~…’:!<ú,²´*©6>ÝŠînŠWvŠÙ…Y¬œ[qz"ìèƒ/¼´s ê„´ãWÂÔ¼0!PãW;Ø'~’žŽÖNSÓ\= -2Ì™¾cña&—	…v¾A£°^þpà¤£·p;ÓŒÎy‘ 	íãs&Ñ(¡WxªëùÌz“ÙˆáwMçÕ“Ñü®ýÞ§g6_‚¤åiõ¡~Ù„V¬”i¹y#ÔK®½6œ¹ˆÜ=U€ý˜ZÃ…†i4¾uÈ$4@vËg~ÇBÅ™®zù«^dúÝôYÓyLË4´ËÆ°Þ%4«£gisL¤k^OW\6ÄŠ)ÞÂëËA^&[‡fçšaàõ l Nÿðªž½þÚßc¾*²£FÊøöÒÄê¸å“ÎÙë¯‰»JÈC Ñöžâ–¼Á˜QÛ X`CÉÓ–9Ýp/¬Âs}òãH¾¨øQ[ ^Mžì-„yZ¸mbèìB©]Ï	©ô´|çëá{Í°¿I¥ïUùT|Ø€	ç»û„ÿ1OfÛíÅ­­ÅCzÌNx X°#~`Ÿºy†î$]¿ÍU'ŸL{6ë™Ízgœòxêe3©*ùDEû¾¬jß\××ëÊøG7´Úõ¤1Eåy¨Z)s¡Ï“´C%ùx’Ÿq#+ù)¨!¸ ª60àR7Ä¬ISì‰ ª¾˜8Þ˜ˆ%-k¨¦¨öÝ„6|º÷•½ÏkäÖ,îa£=°¶ÏïêžTM]ÎKµÁ\}TX„Å&Àblˆù1¹ªzcÌÛ˜rd<’â†ÕïÈW—†feÎVo–']{³kòØ~rBVtÑƒ¢Và3©åÍ†X8uYMØ1‰¶ëž®²v1Y¬¨NVk.ë·m¬ ¬òÂ­Ë¸R—O]Åx[rãTåÊ¾¾s¢JûB¯Œž”(üŠ©‹[Ô>ük‹ÿç“Þèìä¥(I‹3=“A	M¾`âD˜á=¥ñÚ2­J¬ÃÊËàË*äÇÊ`”¢ANf…²T‹ ¦¬°Oã©1S5|­®Zhøb[N×œ•¶rüiÉ«K2öÙïgVšê¥ð]cóÿ0ŽÄ#s•«„ÆYêkØÎÄ's?C¿»M¯[9ž‚÷ÈÛÔt¸™ˆDßÎ=©ÂwÄŸ¶ˆSé{éÈà×ugYlpåviz8ƒÒtÍŽvÅ†·2cËÆ1³6Àãgn(v6Nwöú«Ãxû¤[_mqPö¦Òã—®Ý~uÈ¶Ò¿ÐŸÎ!‹sý/„g'ÿ-”ïrb:VÁÝ=;ù}Ë¢#m–4žÕ¤ˆT•D,NË)æÍLÆiÂsA»ã9¬(˜ðk’aDLÅ0]3< 

-…e…Y‘„˜…Kõ.Lj\P¹—t ¨ÖøÀ£
žÏ„ó3È—•N‡¬,E“"ERDhBÂ•ÒÝ
Î D
ÎK¬ŠY¤Ð+ÅIÊ)Üx	l§\.Úe3ËZ 	ž;¿å„&µÊËTi#d¹hï.¬Øè¸/‚¾ÿÀÝÕŒ?É
 [„KVüðíÙÉç­‚)ŽQ¯Þ7+Ik·ˆ*	?£ó®AŸÓ—_íÝóW:tF‘<f…+&1è
ã¼ö0ïGõ’õe!ÁV6¹Vá³¾3òšÊ¶eÀh‚Í‡;(é„õé;ëk…^cÜƒÖTê.AÓ&®fL
g®â´„Û£h–…–Å5³±Bnt‘'—ë½Àkø:îpa™­ÖYìXÊ“AzÅù…Á?¬9½"Õ¾×Ž¹Åèï…Übyw2ßH¡™7­×&XxÙ1Ê2æäçÞÙëÿì‘W
_¶"]õX¨ª‹ˆ©‰¸Å–Ž5MµSû°ÃÀ6?5'Ji|´¹J€Së/>¡[¸øm¥ÙlÎ!j¬’Hºœ«:DWÝØ8u4ÝrÉ©éx-®¤üdn·ªvZfy²UË>­1W?¶¸´p‹*$q,8!ç«*Ùçå§KÕ1jÁº™’)øs·ôˆÃ¼ž«Ã–Ó¥füR…lvíQw”Àµg|‰\•íœþÉ°ò!l`œ3ô³®G]n\X0½•ü°Š:¾³|bzbÉUòZàÒæ«¯ðÀD\UM²uvòoiŸþl›¾ýáKúÿÙÉ7ôç²àš`› }Pçz^(1áÖÛm'L¤2Gn6T„·›B÷Å4YUC})â5ÌYÁÞ¯ÁÝÀuJà|±U‡®áú|7Ù
 ouËÂ‹Óœ¸à:”™ôú¾IØ^ÛßÝ¥û›XNÕa51|\«yá=ji®
SX‘ª_©Û¹þ¡º­ë_«™Û 'IƒvU pøýVêþ¾ÛŽ¿ëSòÂÃ4Ü/¶ˆ[S”­èÝŸþÝòÒ?<éœ|Í—¿i±¤¦„®Dj‡ïîó9Äë ‘§‹cªí¤ëbQíÖ	ŸAª@Øóâþ![lfô]rPõ8]ä¨xZVd%®³ÊÊ¬›Óžµi‚œ'*²øGÇËÄ
º§ßSåßy›ˆdÔÍªÝîßŽ”­™€=^\Øù
µ¥º±Isguy ŠÜ'S¢u‚‹ÖDë²hÍžkÝX÷£fZÌ²—f]V©^>–uPt>£CîïuÞ|ãp“%fÔ³åËˆ_}ÌêY_×L¬^6&8eÉG&KßSJdð“üu³¦#«*9’8ã(u_(i
ÓéwU– Ší'Øx+óAŽçžå!L)6.Å†¾rO6¦˜~”p>1’h¤IìíÆäË°Î¾xó=ù…wvòÏ%©-§“£ÐV…læ)wFòª)wÆ”;cÜÜŠÝ^š>Ã¨Ñ&ô:ê‰O.!_Fô :S0QžŒ¸#SšŒLär:EsàËE†C>Bt5ÀËU/]%„tñ²!™×ƒ¾}vò|üg'¯èxÈÜîÓ½)Ðú8€ÖÅâ_8Š¬™Ã÷q¨½ ¨ÿ ¿ït°s1€vCÍÙ2ž;—OcÊîYÑ†3OvÐ»e‹>PHvVØ§Ý-^ø–éš·°ŒÙz7>i8Úówûs´Ñï²×ØQ¿#?ý(n½€Ó•F´Eã‡?}ÄTe“åÔX©;xX9 8½QÇåŠqù¨v-”?VÚ"áLþ„°X~8ê"µÁó³¶,!úá(ÓÇd4tq¯l=]åxL;8*öÃQp?F}8ÝXc÷ÃQ
¿¿°W™þ¶æƒè¤Õùh(8,j³-ÍàÀ—sçÀŸu­&»“/E¬Úöøb&às5ß)å?/™)áïgŒi¤O¹ˆ´7e¾¶¤g¼qâ8¡ ÊÃtç!Šé…µÙfbèn+Ì k®ŒQË±‹Û§°%Óþ¿<O+Š„HËM”ÖG6ŽÅò`A˜PóË¨,020Fc Œ¬PÊG²¨I‡ËpTdÝ«ig´»5»ä¢`I
¤¶@…’Œw{4CöpµáA²ÖÊƒÜœ+.¤”¬’°ìj†d-•Dà8luvó}³“ƒ‹„#r'ÓÍAn˜ÀZM¥)Àh³rJë›rišní†÷‡ÛQ¹ûGJ1pý$Ñ”hóø˜„Vpkæ} ‘
C9 ±dQY5à¾‹²ð¤ôàHBc~Bš\Ä‚2°¦¦¶˜QcáÓ{O8êEñd-–—rhžÊ¥cAôdí_
TO8JI1Í±ª X§‘›8g”O¥å‘>•FJ£}òT/€¿¬Ž÷©ô§D*Ú¦$;£³“?¶”®ñô³g'Ÿ’0 hP é<ýÒ3éÔ×Éž¥"d§25Âv²V/@.ª_“‚ïÔŒª ~ôNöp•<ÕJ¡xªŒÝ¨°ñF[ÕàÓó‡ÇäcýÀD0@M™Ú ôµ
¯O@óog(n»º |§Híh_#ì' ^¼ˆ/Øæü[òëÑÙëW>Ôø*Ù8SÌÏ‚ÓJ–«Õ…Ç÷Ž’¨oÀQóQÎY!¾±+ÆŽ÷Æž©&´· nyëiöj½8±\K~þÂœ…Ùæù`­ðDëhÁ¢¶\A2%±liÓPmkéœþÙïTBi«ŸÍm¢Pk]e šÍ¦°`ª-™0ÕTA†ßÑÈg0KKáž=A_h…zöÿ  ÿÿì}mo#G’æ_Iëz,êF¢$¶äîÖ©e´%¿4ºÕçiÉ^/|ÆªT¬kE²hVÑ-®VÀæÃ`1œÅ|k1XÜì7{sƒÅXXÌ5æè~Áý„ËÈ¬—Ìª¬ÌH²HQ=,Àm‘¬ÊÊ—ÈÈÈÈˆçå†Ûm¦…3S,ÅÈmÀbâ<E¬±aŠáÅÌÓ¤T5îF)vÁH`E·J²—8ÙS+Kì%é‡¼'v~’Rl/ÎÛ«Xî7°±ƒãázñ%Š£pI–à»Ë‡Ë…«ƒ«¡Âàê4•¢EŠñ´â¨“F„ÆÜÚ¬s+ÞŽlæëÑ°ÅÛÂÅ]àµ$âY©•±ßrÈ­ý½‘¤¶È°²–W+)c$T-ÄF›ÆaëíÂ¢i¿ò"zö"ûUÆæ8É6õÕàdá4;ü4¹¯nbû 9lÁ¦ŒYÃ6ÅlÛö¨MO¡×WÁ½þ¹‚6É[ÅÛ€ÝÄ\·¹éCÐœ¤Ü†²•ÿ	d?€r#7Á±Þ·Ý	à7•þ^1€SÞ³òZA9©3‚FŠ%;þFtŠ¿Sb:ÝµÄt:v]Xh,°œü¢&%â9c:¡\*TµüR†Ï) `š\Ê¨8?Ü»1¯3õ7@´ýÃ€cP<8`©[9!RCV^WE5Ž3°qeB|âûíàØigQŠµ°¸ˆ8 §Û‚ðâ4Šš.Jux†þI×6€Ñe\À‹.*ˆ‹„ìR}£ß8¼6‚<# }–j=`x,Ð7%,¾Êž\—9Æžöš1Œ=ÑÂž#ìÍö0õ¨aOòÒÏÁõn1¸_ÅæÐzÊ{þL õð¸zÏÏäÀñ6P§q!S†Ä+Ú÷Na&J+>íLéó-D¼‹›Xãí€t³jMí.©ÄëN…u§HeUÐ.3ZY¨‹þ.Šo¹	ð»Å)9cn² rÕâ½Mží6‚ª1clyžÃ´P-BAªeÁ`7¨f˜J·N-²ëh»	L­Ö«Ãméõýh*ÚEùQf¿Lh-ªh-±RŒ˜µôcŽ²&_ÓFYËŽÆYS÷í‡XKŒ°"ÀZtc kù:•Â«ÙÚ«q­îŸÃ«Eñf¼U®–¼•B«•Ç³á€Õ„#fI)ß&X5áà…ªÍQÕn UM´…æ˜j2¦Z¤ÄT‹æ˜jÈ‡©F’¸fí°“†9Ë*E¼IP'ñ×#â²·8°&Ú½˜=2+¨l,´!1Ù’ekŽÈ6:"—©9›é7;®SÇc±ÑØ¢JÑØøT—ò	 ±Åï™²•=Yµ|
´"ÐT#£\Ëïû'ýTÍ/¥}¾Û¯/Ò%‘pL?Ö(0çã0.,^¼’Dãƒâ¥ÛÑh‰7J3æxñ5‡Ä{=!ñ¤Ø¬™DÆ+Ôp—/uâÑPõš@ž°¿æðx…ç,÷xsx<¸ðxÅ ëÇÛ¸/‚ã‰x7ÞÜ¸¯1V^1¥øÏ*/¿ÐN1¯]€‰™çå‹R1TËyo%›Â#1ªž­û¿<f6‚°ô€WÚP,É1!bœ¸,÷„¬lìh!‡v¼SÁüy ÊLËº!—œ&¤¥‰½1ÎÏ•áOodáOo(C¡–F9,DV4¦£APÞ;+U½,wä‹¬.•V8 ¤¦öObÀWÝ‹
YÆHþ9ÀozNgdøMú¬%ü&<1yøMhÓ~óÆá7aæ°›ØM˜³ ·I«1Ü&úÁÙ†ÛTMJ$ò6+Ú:™Ÿ(TS|ŠÒHP„âÏ÷”'-æáÏ%,¾{ÖúlL9÷˜„Ñàe·ä3ÌrðŸŸXÆí»g®×6.Ý8×úà¢ÚcŠ‰à§*ÎkKTaÔp%ÒgDOÅ ñSGðë+0TÙº?
vªÊõ^†žÊ©|Òqú§êS™†ŸN†v)h*­Âx ©å¾l*‘€SÙ(å S¡›l€R‰-Tê,µZ°T\*Œë{ôËã 8åø¨ðÍûApÒÆÁÀ% ¥Ò§-€RË RãRF‚JEçb]böçÕ@¦JØgT'@¨tZ’ø¤Ž¾ú’ö49»¾ü\ŽÔ†ey¤EÌU¸w^aä`y’„Á\µ<]š,rBésF§”†°
PV¥î·Æ]å[ÞNÎ…ÁZ†‘ªCÍðAwž^_þÌ@*¹nË¿çwÌ‘ôo.dòþý™ÁaD™‰pÚ
˜3ÊõÕÕ·€(C-	61"õ:uN¯/‡ÄµÔHÃh»ƒ‚í|’‘ÉK†˜¡sj˜7AVÛTîœItV”Á•51>Ù‰¾æ]¥ e»Ai7KEp2xN¦Õ.JP2È¤‡ÝÁz†ÅeÊøÏ»¤VRMî°Y1Û l\!e`SÈ‹quáÖ*FSú¥Tà—ià4ŠE¹4™ }4`> GôNÛýàØ§íf+ÏSrïƒ>aãP¾LåO¸Û{J:Í-ŽNèbÁß»‘úAË¶ù@–öerÜãšU!wWRÊûA3¯ùç÷÷ö-%YîàpÐÅSðT|÷ÝŽã·ÉCRsëƒÐëóJ ~î„(r—§gñBã\­w†”<H+U}»îSd÷ ]Ýé_I¯ÐÉÇ¿\‚·ÔÒ–É7§íÍn/±F-ÖCª:¼ÚÚ2Ù\ÓÜ™5w™øÍ3cs<"N—Êµ{h×	’$94IèThWö«²sy{é-üå=q¿å¥@õ2ù–Ñßh£ãA“nÛu"ÚÉß0öÞ§nó¸ùT}!ît–èõÁÀÊ‹ Ü	òÙhãV:YÍ~Žõµ5–¶Hm¢ÿ¢ÃæDV0ÅeØŒ0—ÁXîP.Ü®9pŠªcˆ%N\4-ŽÑôöáîštÞ°ú–"€"‹ìe»l¬MÞIqÜfCÀMÞä5‰ÿ†HŽØ;Âþ—Ü²ºÎÁ8
ÑL†ÚBKŒÛÇrd$¾½Qmg04}Ô”²x ìàIÌ…q2¦ååóÞ–X'èšóüÿtNõ#ù!Y·JhÇ¥Ûß_Ë` è2Ûué—è˜°$Þƒk›^’EÆÔMúùYpÃciúW¿OÃ<ÐÎl«ñÎ&ó.o]óN‚„òQâr4Xp„(BJsï„0;¦ýô\€Cp/ó„¿ÒÑ‹bß :;O>}_;5
>á4îß8ª(;½6‹Þðú
Iìž ÞÙ?úTö}–ÈvÚrü›KýFÚªñ1.-P‹FB+B@S‚à²´ø7ŸÇ|öÜWŸ
>,£ô›S*úñdÄU%b¤^Mqc>2zÑ¸¨EB¶n\Z‘k…VdR¤©C):‘k•2ŒâpÂ-‹š°AçV7qºMò³ŒÉãî‹ ts.¼BÏÕˆŽÙÁÚJC°O5˜¾™É‰4¢PŠ¬’ÍW\à“n“Å@QÚ=…ýÒ‡wŽù‚zÈýËnËGÆd'ˆ\ÙFÊµAÜØFF&ñ‹«?hß(¸¼©ã-•L=Û“¿LæÙ sìõÿÂZ»A§ã„5¡C¸ bOðD…Æ½|¼lÖCü‡Z–úk_>ê„ù È@úSHIŒ#séºßwÚÌÕmc2ðM.Û’òäAëP¶ùÕWHÃ %Ç\¤áS"–X=“˜ÕÏN džû »C?¸é¶ENÁìyæÎx›ÝÉ>*ÇùNlWP† Vk‰ÎXÁ[‚GABì(ÀÁ!Ž^Ö…Ü\b¾u ¦×Â²äîÙ'^ËçCéQœ;À´óSîN>fO$ßÀSx±·è ½çŸyÍÚúÒÅªÞƒT5	ñ¦Âþ“CòÜƒhBr0 ê»?ãP!ŒƒÙb 
ªsÅ%à²‹ÉnÌ˜X½¿†·'Ä™]ö˜º+q÷ØïîÔ{G1‚îè~:àÉ_ä©ç4·ÆwŸ”{jîÛ­1éRéŽœ6T/|» Š˜ßö‚D×—¿èžÿûw¿’uiE0Çõ·}-kAV±òSö|×I«eþ=_x}ã{ÜV A9þ
lÒ\åîEíC?è>÷¾ðºù³ñš#¾RÞKÖÊÐëø¢‡'*N«^d‘ƒÉdrg/p#è€vx¿Ã»ÝJ¾q®¡+‹² «§Õ<ÃŽiUšš–ƒÐÒÏºÙz“ú/ŒœNo„­œÚ­ñp,”‹Ê¨¾ðœ¨âT¶I·Â¦í}râÃmB …šÄ¯˜bÇ"ÃEPM7ƒÏ\&‹|°Õé.“9ûž­>ZD;Î‘Ò8ÞÔfZ²—ì€ÚÀ• J°9iùTy\}ù5¨BdÔbh6Lä.°Ú8)g¤øSŒƒ¹³të]6ÝÑK‚´Us33¤ÝØæfËôæî4‹_ïÇÃ³TëÆí;§êc|åa*B™Æc·"Ükb¸ÇÑ˜cNä²Ü(ì’.£uA<—
öÂ´óh]÷R l¶¤°æ‚¢FäAJ¢ˆñ
}Ä|åËäÏYÀ)[¤çôCï½v@ÕvÁ]Uï{LKÕVÿ[}õdb`¸M¹ŒL“-’SPØÇ/ÐjYy%à¬¸§ñÀw*øÛã,‹u{ú§ß°bh"Tªäî©3›
@%uß¡;…!HUÞ\äŠ]JX´š.V§\4cÈ††Ã`V÷SžÇç×\|÷os*ëœP‚H2,z\ABß¹ú&€¸ï€|ð£éJêD»ñ?Œ‚þB×ŽîœK¡d…ÀWÉùùÅ‘EÇåêûX saJ ÚŸ@ŸgwˆíUŒKš±c«LY¹vx¨ª£šp^ìG.’Ã±5ÊcAÑ'§pšJ(ÕTÈ˜PPir°ƒm%PÈƒöj˜ªÃ~æ2ÇØ7›X}‘%CÄÆ6hÊò]Š
cj…(Vù@b ±»±nÑ†1—U@‘¿ —>åA\¼{é‹8»é±¾"àTí7çgØkÍëËÿEwŸÌ®Êå*oƒ®+KºJ·„]àžžFA/Î¬ûØ÷^¢óât…Ns‹g0ä¸ŠË!hø»DDTþB»RÈjÖen!© ‘`‹¥¼Â›™®á¢²°spxˆ&·OSŽÍvŒ%!¬"†ãÒ0afKS¢øÅÏHvã£ÃÆ‹SDeñºCrËÈ±‰Á²
S¼ÍdŒéQD¨—Š;“‘0UoD+…7ÕÐó|WÇ8“˜¼”ü8¶)dþc±GçØcÉ- ùì$+òä²ÄP{„JA¾Wy·Ny`+Œ‚´[+IB0µNšÄÛn­D=S…†Ïåj"r•ãé¤*»éÖÊTÙ±ék(Vxé,H÷ÑèÄ+¾cæd«pê…³ƒëË¯HDÕÖ»·F´Ô²ƒÀÖ<6¹¸Ó›ªÄÆ|5ìRïó¢¤ ¶ý'ømaVòNrœ\Y‡@ü‡ˆö2²L¶°P”nÃ½B6 À…F-€kBÈpM ½@(vYé•¢ÀuCHpiÐàÂ!°;ó¨†|÷’_Èj¢ºIàbÒ7Kî^0ºŽÕØã¢¿2Ç*92c`Bj2h|\ßþ6úMìîÈuœg*Î3K/Ä‰ÅäBR€ 
t!­£E’b;áD$`€`‘[N+`È‚¯6€Ô†”¡\O³Ž+$¸Û(bMá<…šWÏØ¨P]1Jw*Ý&˜ôê`cTÆìô"€­PU!Ã¼ÑtË× *vp†+lB‰§“L;E³ÀMªçÑÍˆcÏ•Y"uøORÊ£â†q’ +ì‡ñ›‰š}ˆ\Ê#5HÏs–¢*KQ9é|Ê‹#dˆÈ¹»KYmŽæe›s‰Î¸\š¦Lá4¹˜O9ZÜw’	ÿ"Ø=È¯\ò+Û'eÑ«›k²	5®åè…5¾§àÜ'#gˆÒ€xb¢uråé•›ù¤DsÞäDÒÐn¾Ó_}yõ­Ó9±ŽÏ€wŠY€ˆ´Ó×´÷w'žs©À®!wBÝ_ef­Õ`2l{<Áª<µv”á/äØZŽ/b„?c„´Z»¬Z«1E‡äŠuf¨{TðºMøÚ.Nw¤Iˆ@Ç$	yP)¨µ„G¹ÊHN0²N~›(¿¯‡½¶Õ¨EµTï{ DàkO\Õ¥ú_~·¶¸ºÈì®EHN8WV®øø[ÛÂo\@Å6º©ž|î9aÐGÕ˜8›ìèšcf&BsË’Hêkdßý¨‹ƒ-CñÜçÕv}Õ9TÚ5x3G†ºÎID]¿‚DDäy5ÛRÌ†„ÿ˜l=Ž ÆÃ¯Þtþ¹óè6fI8TýÍ˜¤öÚ#Ÿã‘L‘fë˜˜l›Øœ´@)7É§ªÜg{Ÿ¼LfàIŸšB<päd¸*’»ášV‚7\c%yÃ…Oô†kœdoö6‹^ô½ø¸)\¶I\ì‰1Qˆ«6Ù›Uì“iw†a„F­œ1Ý‘E¯ñ@Ì‚Û¹ %±Y]mF¹Âø…0!<ÔÆbVþòê7ŠýçÑÜi'@Ê”õGá6L+qŒÄ¼ïª2Óã¡Z™ß¢–3Œ½["Yš½~[»;É?k‰7ã|"9çÕe[/qªÌó)	H5åìÝU‹Z|<x“	ä¬]Ê$ò‘†g”Bzy&á¾˜¦« 
Mß§}¡ub:{1.OYÞ¢íƒžÓ}¨™<o“õuº~¯¯]6´Yæûz£9ªNU—ØF«íÑòÐÇ”Ÿç3‚M=Î»‘³ðæàwÓÌ—	Œ h†Å1›Ø¸nÒaÝ(Ž*XÉaç”dBÄÄîõå/ >…úßš`ðŒhËŠG.f¿
´&d©D!°,Ò]ks@7­5Ç¥æ”;è÷™V¦ŸÈI>'1°•]Z&kKŠ8]âÂöXg‚ý•ù#-‚&¬ºªp]'“Ó•õžrÚ®7¼ÈS$X˜BÌ	òL¤Û0ÖšPx»mU”ÂŽy/D“K] kUš³¸²ˆ¯|/e&¬eíX;8Ž^Â‰¢"L®8`Lëå`óâÈ.fÅm¥UÝ&÷’_pL~_Ññ»ÚäÅ“ÅÄ7wàÅRmRNñdeº{±S±ßÅWäò5Ìóìyõ“¥F©”>¡¤×–È-TEÅX•Â´ðÂïŒpÀéŸz°×#ty÷ztuw=@âQBðlåÅç7Nú˜´¯I¢ÞÔÄÅç˜ƒcxÏ M‹Y,7ÊBëÊØ‘y<ª"š@¥Ðu¾ðO3'ãH~vHÂhØöt ´zÜîNs‹ýÝ^ÂßÊÔ\‘³rCäjÚ@;ÅTM¡Žù —ƒ^ÎàÌÊxÏ§“)ïd~¹òiÑÿTøºÂÌIÀ­»…uö,Ä]ë‰´'ÚžÓ.~Žûì¤›‚ÃºÏ¤¸&ÿäpi{µu×PÅ*¡M0Èb»Œç&„XÈ1&ÇP“àG²-LŸoa|º‡é‘/®¾–68ïP˜´</2 6ö¹&æò à‚¨ùA
—+/|½1´}ÌööÚ.çyüF}þ[ñä€;ŸE\}Ôy.¾éVßîÑÉG7ž"@ŸÌÄe 2Êñý–’À’;&[°/5†ëÂ¸AÆuöm²˜ª“B\ª7„™‹L"Í3³_ðDe¤°éDÐ—x¡M“0LJ¦‹>8}OÖHw¯)ÆéÚKsN;¥Ž^©i÷	Ó+!h„×HÄ¥fU*èœ\æVI:¬¼½>ìBŒ*í¯¾¼¾üº__þRZIÆyí:£_eÎ5ÊÍ •™£ûN×9¡â¦iDì¥zxÿ¡
?<P‰OÈ>éŸÚšp;ýŸþ¾ÌIÆª“~Ò=ñ.Ïá_Ý]p2>d¹¨¡¶´®ÿùÀ;äwtÏÄçôä/ÝÝ}ïhžÇèîÍìzz¿ðA÷Ì¿ë´‰æ¿1õÓ¾Ó{˜dí"ÚÍnÏþÖÖå:îú}¯ë“ÜÇä³îÉ/JÍÔ}ªUZÏ_éžçç=ïÑé©Þ»ý~ÐO2$åoñõg±~ùF°/õRþ¸›ÖZ%õ÷º’è‚÷¸¤°ÒŸ05nç‘púUPù3²ž%E›î0lááÝƒ“ñUý¦+‘¡áÒNäÿ/¿³tE)çÁR*ui97¨vðhH'|ÇËbö³µ<Eò!~“õ_¿ó(ržôé¦‘,+Q°Ò'/úAGL›¤_R-ÑfxÝt—WåX‘Ni:f©ÖM`t6ã8™U›ljæ·ØI3À™“ÒÎÃ±•¹À€Ù,¿8]¿fVoÐ=ä²¸•–vú’’?Ñõå¿`- ¸êF'»«è(H¬é”Í/oŸ&óðxîÆã d„#±¯àhðK¡…pN&µ-Ž@	7ÿL>.•|¬Sxfà)ý"J;H´<¯/ÿÙ¡%ÿM·N>¸úš¾f¼I¤}õ5íg¢°àý?Ž‹ ¯ü––Üºú?ôNjCµ–I‹=u—½üŸèÍ><E~ÛeÌbBëˆa1’V¡Îû?':íð©F<äµ9>{ê1`Í~Ðƒ`¡~Î¿—HrÕ†Üér¶rWt´”ÌDÈfx±Âr|@—°O	28fŽæûÝëø_xü}-ú‚—h2²Baé”WœsíÝ²ù]Ft¿ €Õc|õ´¹ìƒpìÎ¶ ç¸~4\¹·¹°37kÚB±Ò›ãVË9õk6¯­yFíüe™îÎ#4s7!»"ù¢ZÊß&5pW/ˆêW¶¸‡ì¼ð-¹Xëz/	¤€Õ,©¹·8ˆKú.ò¦BT|·©3©Ý¶p’#Ž/æƒŠ¸Œ¢:I£ATT}¬¾¶Ë¦t–¼gGèiI1º`û©sì)S›Ô}OŽ	‘O¥ž&œ~{êwOK<(
2”ÉñT±d²Å²{2€•!Ÿ¬{Ý¨Œ°“‘l`°=Âös(}! 	¡î—ØC÷ `½½/õ’ËlM•€ZW¿ˆÜI´¢¨n­®67¬ó=DÝ:tÞ§&I¸Ú\­×ëKVL¤Ô/ö¤~ÔoŠ{º\I…´2TÉ¹1¥Æ`S=›Ð’CÓ„[9“AˆÅ™à2Ý¡¾ŽBDÉ|ÄŠí6îÃæ[Õƒa×M:×;M?„“sæ_ƒ§©*°+@V˜FâKÖcÜ™,¨'aD¨%¶Éú3ŠN3ùKØ–hŠÁÉ9Ó›ƒ>;…Æ¢?"ÓØ
Ýg“Áf]SS‰ÑR«Ä‰8‰T§ñŠ¼¿Ó8FÖ!=§k¥hŠÙ…y3ûàÕ—NnWDõ…m¶ùÒz,ÚñÜ{Ñ÷ÂÖîKyáÚ€Þ©G„b÷ÄN¨7pF6Ò	Ž8>Û—!æF¾Mã ³zùˆá9q`?G«ØjsŠ8ñ3‚O)É¶¡88·_9a<ÎÁ¿ÕXE:¿š!zF+/ðîCH…ÚùÑ€ù1ÚWÿA,y°i¾¥ÿ¼ú	X:WÿÁ%‡?a*wÏÝ¾ßƒÕ`ç“«ß9tÉºþþß]ræÑÀÌð7t…·q'Kÿfgümb9£åibBô{€$ãE;+‹xzÚÛ3NFä‰w@ †î¤©ÐÉÊÃ¿hˆ¦ÿJ·GžÙs{çÝ3æš‡iôöš|Òj*Æ:fÌ)ç'T&‘wÏ\ºc’Ø¾¾ü¹«U€f<Ãƒšr¿&îzø,ixn5Ž`:ñûÐëwü04l*W«BpÐò½v3ïO??%€ÜÑ¼â&Dãl‘#ñ]€ØHFB¯êås /û±Îê¿½’C¥"…¬+Á²»—‰TüÍ]Q¨âïä˜L	{4húÑ£nsß£ÈµûµÆ[M!‹<›õXÂEïS}-•¬\Z1“4ùõZùz~õ5	ƒ«o"ò&yŸÊX¬Ý_6¿–â•ï,YŽ
9B«'1Û“‰ÎÞ G¡ƒ)Ø~"ò£Ú²(T“…Àp!¨õ‡îÉë+/iÖG".üIZøW–ÂbŠÈã)3A¿G¥*$cÌß0a>8†2ÞH"è·Ýf­Çè v	ÇYf±9·²|âwII©Þˆ(pÂ¨\×ÃÚÂ!3u\À{èJö7]·ñi$µ~~úÆ‚±VhÚ±³7¡»õûÎ°±ì(äÀ‹Òö»K ]ˆ=„È™á}éô»Ûvtxõ¯p®M›;$÷2ËS~ÔÁÚy°ßøo(OâQÚ"›kT|0H6àÝda%,f(¬¥-dàìGé‹i%è„n^,(ê@XÌ¥¸_IŸ«Ý9Oú&–®àáŽÐ9TüæR,Ù9ñÒ¦×„¨ÞŠ,à¦ìJf)Ðþ®eè0æÝæÑE
–û8¸gÎAéØ¾M»tló]µ™í¦µnÅiæh©üãeßéÅ‰0bþËY›˜NºÀìêD¦¨âÅyÁ¹½œÚ;96ÅxNvÛ‚£39Ðn{/" Çz+ë«Â½™¬šCöEìº³eÏÛÞóŽi¸^…Á'¾Ä
Ã@”ØÔ[fÞeª(T¥õzÝÓ'ža¶ÁžÆ`«C¶˜Ç\>ø3n¦Ó#æ‡âfïx“s1;­¡Jà‘ÝÓúÜ%£ÿ•me<7Ýæ$D¦Q(ö‹å¾jP©ÐY?]û,†w5öèÇð®ôŒ¾™Î³É±øQHÁ-©ìßþm!‚ Â D`¸^Ìúž¿èÓeÒùŒ¾&~¡ÐVÔŠñHY»ÚÑsÚâ‹•;ç‹#óÂ1&³'üÃ¾r"»4©¢zìXq³MŠ‡ðµó×³ñ–õÈ³W?é h>¥ ›kô¹'×9UÖeBÿÝdÿ¾Åþ½Çþ½ÿ³P†fö<éåéå,zÃ‹dVŒ¤‹úCÒ.¸û‚Hs¶hyr³qašŽÞXíôÆp"Zc:TÇÍjõõT‡-jqœÌ€âöfç„ï*¶Èzƒ\,“Ú_-ŸsnúÀJ¹$LþzÏi@Le­A%kmqi‰é˜ÎÈ:¦“ê˜ÎÅïBÿ¼úã0!L3ÃíH—IÎiBe•…ÅjÐÑ‚s™ÍÅ\¦eÉ„^4eYEö“QNñÇÞÔÙ§|bŠ;®4ãŒÑÂ¡ÀHØ!¾*Þ=à;°~^y%q 0
Äªxü+Ò)å®AÙ…ò!Û§­‘¿ )Öðíæå°@‘OŸ•“Ió©$ixFÍ–ñ~ßÝ„×÷Îï¼MÜ÷Ý2ïÇË•»#Þ¾ƒI^ÄÄuõæ›ùovÈÚíáÄM›XKZ«óÇÛ1ÐŽAŠ›UâS^Ô}SÞšÉêÙÍÙtB¼]šqLéÑùÖÈÅßƒôÃ ¿Ò|¶åOöiÛý51îÏÚA?”¸(µQž‰ÞŽ€š,‹±7ÕLE€%4;8TIkXˆê˜C)q¿IïÙÄ§Iž" :¡æ\Jz¢ó7ñ¬s þáhC¡·mSk1xùQOå¥ÍŸè…-j)ž®0/ÝñG÷‚—]Û‡—Ò§?êiŸÏô¦øx…”+ÓšEt§±–-\³<‘Àcz›fÑ!‹ÿªbò°–ÏgÎ¬Íœû·hâìMï6Mžý«oIµˆõÀ|ÍÚ$Š=c³?‹Nš§ÍÛ4ƒÞõå“ŠŒ7ÖôùÔ™OÂ…›:~§×f	^ÿ6Í gõCáT¾š©$vÅ|FÍÜŒj(x³=»:à Ÿþ¼ó¿­¦Õ€`BN¯/GjOè¿KÕÌ,Þó95ksê~nJÅ$³<£8\þô§”-¡\¼LeÁ¶ÕÌ¤¸ùó©4ŸJš7•Ž`×	žÞ–É”>;¬f6¥=0ŸO37ŸÖnÝ|êÓWbæIø!¯/ÿž¥]‡Do²*æI›«8Ó3mM5s“õæ|^ÎÚ¼|°vûva1ú£0GÞ‰Ñéÿõ¼úòI5³)ë‚ù”šð”’çË½d¾4tëØÂÎa¨O,Þ‰cg’ša
ÝF6òë¼çœø]&Q
 ‡,øÊ|ìÒ5ï!Iì1àeƒ¸NÇ†S†
I(Õ€M’
;+{5ý:¦3£b†(Ø‚Ð,‹€cq¬P}‘åñüèŽ" ËïºíAÓk,J)&5‹QV79«ÙÂ7Ê²vxÒ½¼®e1~GH245›ßH‘s¬8‹è9¸FŠ ƒ«ò(:Vhy$<pXŽÝ1‚åà7`.e¼Z¯ï}•ù´^¯ÃßË,jÄ—uäœ±6ðÿ$ù•§ÕÒß`YÔ6!}¬rè{Q‘vp!Á¾,øúâÊf`ƒã§ž¡t­¾ƒk')ž9ðx¢z:o
’‘Ä$ÌdQ¼(º Ï°ïf‰Os”ÜÇ"%÷ÅþV;H·Ò†Ý×²œ)0Z»8rŽm§¿ÒtÂ…Ç{[ä\¨p=sØàÚÚòý%ËÚZPxW'–ëê¬˜‚‘—Œn"rql[ÚUé¨Çô#tá¯táC<Ø¦;&Ú8Fñ[ÞL¨dµÁÒ0HùM·dmÊwÆ}Î[ŒgÎeÃñ%"Ð‹Q†/Á{:$ªwi3Ø×5C--½]Oâpà—EÎôÔ¤(?.Ñº]ÇÑÒè„ŒÞß{²gêÞÈ¥}²ç5ýAÇØ»®8]“àË@ø¿ð9ËX·€B%	¥¯ÅÂœfC…	Ù¨…Ñ—G°Í€ªTàSjÈ*âP!cQžÇ9ïF	ôvÌùhÑ¥?P9>ð¦hX;^&t#Ñ÷Â ý…÷a¶®Õ„EdY^ò–.È
IŸ9ŒÅ»–ˆý²¨.Ž,lÙÔù‰×úyN˜I3ÝÖõågÝ“Qß#øuš
ßG¡×åíwƒA˜7óLO[¡Ã&>™ÿ÷O_ýZž8)þJÒ4kóO —.;9iIuÚnëO¿uHÿê÷f®¿ø¥Ó×Zº&·Ü>~—ÆT®ZjÈþÄd)Ç¦0”—<çÅi·ý^è‡#*{¸Š¤i{~Øk;Ãç°¥ê€iXLkQç‹C2LÊŒÁ_Äe	ƒL,
ï2»eÆú‘¤hvš;AgìKÏ;}6 H°Ëw“65÷æ­NÅ³‘&í0Î¿W=
ž®ÓöRÜ†W_M½Æâ~@Se÷ÙáLTW„Ä×Ô´¾ïAbnm}éâ•W4ÖWYMËw¡¹=µTS¬m:/¼÷8rÄq==:P3ÔÀ’²2õý‚èMo¡ÈzZ®¸¤ñ² /àSKyT+¹µrZ¥÷òG(0€0Em¡7åiËÊîfª
[ù‘íÑöõåÏ¨ý^_~G¢–3dX‡¿˜”é7iTb©,4ðr×bþ^˜‹Œj—ÿ‘‘è.áHÙ„JØ‹õX‚=²h[
w
my¿JEûÝ¦ñ­AíØJrSÙ}õ¥Ï09]ºqúû®`oSGé¥ÃõnT!½£È¯EGÍE-êàEõò¥QßóÚ^£ÌNÀ
.‡QDŸÑ8dl÷Ã¾¶f_Þ'·÷ÀÀeç26ˆÇ¥ä£DLc$k(¾Ö²í´è^õáùzãBžEwr“lK' œ~äÐI zc‘&â“òW@%k%O¼õZWàpÌøAÄ9~ÄŒÈ(í ïÄCnƒ»tbbŸó._:ýsàzµšãºË°ŽO?‘’|NbC ®di™þgnñÕqtÊH/C[XE’èÛZ<çQ.bgÄ.r%WÅ[,‚^Ð!/|~½Q)¸”àKÌ/‡©`Êˆ/+‰Íš±ö£‰NyëB½7Í¼39°+~´ ³w¢·œ‡tC5ŠË9­kºI&¢‚Ï†«Ükeqö™IµÊG4CÎšÆhi<Ÿg¼­žÈ‘û<ïH›|“YÜ¸°Õ66T|/W–ÆX¯¢/–ôÄ%ñ»Œx‡e?}Þ‡<¼"‚ßqÀïØ'ÉQ±ŠC/-Ù:ó;YŠ±Œ½heë7Xð¬|}b¶å ñæÝ ì(Ç’£}á]Ú<ÝœZq—?ƒÍ¯|ºWqHc4¯þ7;ÜLm9¶J:Žˆ¶pc¸?#5™+2‹†´×TRÆÁ“Û1¬#pîsÀ¥ï¤%pV–}'jÕ;ÎYm}™ôÈ
Y7ÁÆC²w[Þý ûÔ{‘#°à´)—¯¨gÆÿCGYÝ^¾~Ã­Û<l'ð•Lþ3ƒãC!7þ|XCgJÂs¶VªD¡ÍEaì±ÇaÛ–ýh$tMÈ\•?ÂJñQ—…×$\×ëEN×õ<THuiÙzQFlšq9	,NI7²SÒ;^¹kAÐ’ºèc*Òè)7ja©;†­E.ú€÷Üƒrºm3¤ï£¶×¼q*ÔòK_2šïÍ<—˜‡c({HXIñ—>ø<¾‰¨®é¶Èn‹}üŽì?9$ÝÖŸ~K§SìBq¯~—£ŽMü„†)„¢”ÅE'¤™†“ñ÷óLdw×
\‰Ô;¦
Šq¦3íE¬	³é–Í¶l¿g\¿ôW&“r1ÅA˜m•ƒn©Æ»åËú34v/#ÃJ©z9AOE–´Ž‰„ <n"<]ºá½¾ü)<5 iÈKÌµqHùX¸\6Ý¿¹„=Õ$K´éêÚ~ªŒIØ|aE¹‡BWÓí­+Bš4âž#Þ‹<ÓøœXyŸ…:@É¬”øòuZ+®zzàä €Ùiõ¼z+rsáyõåÍhëðiŠ•"×§‹®4h%(ögúH’i¢ØgÂ¶‰±/ Ë§íàþß>]ÇA±ßØ”SI“\¼ƒÃÃJrUSÐî…<Êt‰°ëi&ìÃß%«±PMù„â3„ÒJj¾.C7VRîÚšz@(\•¼ï®*yag÷CjY‰Kæ“jäIì8é…’î•¼¬QÒ›»ào‘c@ÖX%‡u •±‘¹I´V[~i]ã~™øÍ3+ú(º¶7ÏÈCR¤e³5¸BØ¶šî‰i©°3ždª4T?—-';ëåÏ™ÚKAù‰ÓÕ„Š§ÂêÔ¤T±ÓšàÝq×O?hr‚¤©g>0g2Ñ’2E-";ŠOãc/½êqÓ:†i¢IªV±5,£UnM>©Õ*¸Æ®g ´Æ¬U´©²ÊÔ¾’TYÖÏYb,VýÈM»ðúÇ¨4¹¸÷r¹¸%‰¸Ê$@pïø]Ø\Sk>€d€|ºî¦]öMÖãI†mœˆzU“†Ä.¨Þn–LIš'“²;F/UÞn[$„1¿•Ì‰·`âhÝ1à;OV{»l†„o‘õ3ËÃ‹ EVÕdÒ@4y<i,¬àÛÂK çPÝeô§î¡“Úà»AM=CRÛnEâ(!kdê&cM-]RfÎ'#Ì!U$1Ò©{Ÿ}ÊrÅùçF–;ŽsˆÉO¿œÌÏf`ŽM; sž1ÕÈà¹ígc£¸Lõ-l;«Š†S~n“† N4à8¬sõuâqVPÄçÌkDê,ÒŽ˜ñb””ŒJœ•
:œ<$ú×éÂ{yh±´&`Âz«ˆµÍ|!úx[¼¯;{ã,ÆÛn–ÄÛÆ®˜MT¼-o³--š’†ßJ“47'k£ÖN;D·Ä„×½âY ¬¤#›NŠi7+¦S.VpV¦y*¿J‚T…h$~
©‹VÅ./£b÷ÚÅŒð†hC[³ýŸõ·Ê>ÿ²JÎY@¤ëùíªgViÏ—z£›­šè(l¤}$>)·ñCöÂñEþÄØøÖ,h2wŽƒŠ“UG~$•3b´,&+s³Ø˜Ù¹È€È fúöC’-LÐ-V²0¡·aª:ü|m“ÓßPÚt‹ø\íK·YC¯a«p˜¾ ð;¬²ûNlµUå’º-”C§K{ (ÎðSÛ<˜û`ps8zøm1[V·•-(‰¶}«d-(‹(2,z}DYMœÎÂ|,Q–ºbplà2`òèÖX²_›î@’0Zdðk>Šs‡%â·‚ëïÿÝ%g^‡4s!™iZa9é¶ü
c UÙ@á8XO"Ã'Ë(×ÒÓ×“>jŽËE…ÑÃ&ùW&te„$›š:õiP_@³Ðò5œj!]€ÅÈG­ª3kÌJ@<°–Žró ‹˜ÀˆQ{d¥âRú8|ÜI‡ÏwÚÁ	@ÐÔ¢þÀÀa\÷ PVMü‘
Ä³Öõ÷ßõÜiXÍ¡­îŸ‡¸PL”ø(	
|a!%\?¼3hŸr¬£Ž€+³
ÂxèD‡ü˜¢¥Ä^Éésõ-CAúy—ÔJ*t¡wšÝNÑkz!Ânä1ñ³).NÚmK‰b_•r¤ÉNR‰SÄ–/—Z.“DºÝô¢ý33”Ë‚	µAà?q“)€uÈ±0™9IØÖ	n+ë$û¹%ú-dÚ`xNÍ¬8ºµÚjq·½Ð?½•õÕYañ¡¬šCöE²»“¿Íi–{Þ1í×k>Æ°ÕôÚt(ZA›vÒÃ…CŽìãiZÒ2ËXZN¡I$•×ëu›©Úk³¤…ÜŽ#·ŸCÓ$æ[2¾ƒ‰Ë;‘5“ÕPsã‘Í³ÚŸR
<ˆ,fÅ+÷ÃFæ™Çäm¢úºöÚ~T[\Y\útí3²|	¦·Ýá=)û}«U´¶ËÎPRà£|Eé²ÄÏZj]ï%Ù£¢_[Z&‹€Ñº²¿¿ˆ Ëá¯ùt™t>£/‰_'´Ô\‚($BÝjGwÎik/Vîœw.ŽÌÁc®|ÐéÂpr"oÜÓÄ|R‡¶a’wøëÙXËšâÙ«ŸtP.'©Èæj}DâuNÕqcc™Ð7Ù¿o±ï±ïÆò	† —¨8~þòÇtfòHþáE2›†õ(H‘jvèI»àfDˆ‰Ñ˜”‡jyr³qé™¼¾XÍôÅpÚbºTÆÍj‹8}éfÔÅœ…ñ¨ßw†õý S;'Ü~ß"ër±LjµL|&•5Ÿùð…I_ï9ÍƒÈéGµ•«µÅ¥%¦[:#ë–Nª[:;I jgöõ
 mÔ—¦ðfözIÚ®8ƒ½hŠi»1%"kwÔÜÜu•*97‹úP»ôq!S¥‰‰w“´]{
MúÌ‘¨3+§Í,Pf*<H’+àÍ7åÏ;&Ç@rÌ¤9.‹¦ÀY7®Æ[ úÍ…š¸Vü”ÖÄ™Š
|ŠçêÄõ.Š“\mbº‚7y™êiÚòºŠ¨yyåª÷<Sù&ðb1È¹P	È>OÃ+ÎÓ—à$‹¯Þ­ô­ø&À¡™?‡ãÔêRáï+å°§¼ï•¾×D?ÞrÝ~ò]Y[$p+ÓÕÐv'KYÊýìÎiw¥”Ýv„Ý#ÒuWnuhìy°°élcÐtOÒ­Xß‹Ý®%A÷ôÜšz”RsÛ™>xbn$-7Š¹Á6„º8…iÒqOšŒÛÍ1l»ådÜú[-é­'OÅíVCÅF¨JG&á^Ï!däÚ®H‹ìŽL®=Ññ¦&Öj™Þ´ÂºU6³«¤½­ä£êQ×’zÔRkÜí¨;2íèMéÛ<z¦[¯Œo´RË–V¬s=÷ dÎ‚Ô|ìÙM¸EÊŽÆCŠIÊ¨ÆËUHbJ7ùC¢èQ’›×‘Y£Éõ”Ú[R—×Ý K•µ%á·Qß\¬Jw°ì@áW|_Ù¢-ëÒÚsï¯;ðÒ„b‹ö–hæ{õÍœ>)eˆ…M¹Eù!OßbãX«é[¸
d@p--]ìc³ã–N
‘	¢íÄZ‡px“ÜþÈ~ðºMøÚžè1F¹õ“›¹U3Ý£¯g_šJˆ­ê‰á|tx}ù/©ÿõÜ9W7ñm¢ü^8P­ÓD¯¶TÿëÀïÖW—â“äW_]ÿÇ®òq_åÊ¿E•ŽóAƒXAÃ¶ïzÔênÛºBÆm_yá³0,pÉ ÖèUL)ûªý’¸²K+×ŠM›Qíˆ5PàÈ~ ØŽ€o'rb»'öˆlØÕy!¬™°+çÁ¶æP™?u$îT+ÞTÑ\J²™Ñ„g%-%	ÞOOÚ¨¹kd¼¦È¶ìÂÁõåwyn]ø'†Á\Ò‡­«ßtt7akaaÄ27èøD«¶$«¯“@VDÈn¤cw»[¤cœ?6tì1«ïÓñˆØ-„­2v[i«œ•zNê1©Gä£¶âJØ¨5\Ôp@ÁŽx–e³…¼ÚØ¹2HÛ
0g.$0KRèÝB~Ð¿Ý,#tFbózÓAïæb¾0ƒ=MÂáÅÊžI!%5•pì‚Íq	K$Á•l4Ê1³XàÃ=´P%ö¬ÝEç2Î‹UÁðÜµ$ŠÅÏ4ü­›ÀÖâ ¯ý+ÿ;tº¦ÝŒ•ñHØDÏ9`'@
šŒÃ¨°»ñósþ×™êrka›GÁý*‹ÁœùUyÓä‘¥¸ÿ*$o’G]§=Œ|×`ªÏŸ—NòeŒ¨"ðTüŒz
%¥Ã¡B¤ùÈ\ë¥mò¿å’±M—úÝ–Óî–²½2k/aCÌ|‰o’[€D]}¹û­Áðê7€Ký«Á8ò©E®* V²,ü«ßûœÈ3ñl2ÇÝbýZæh§U– §€åÛ é*µŠ®¿ÿ#ÕÊŒì`Âu(Ã4ã3å¿Òww¨2n®Cò~ßo2«ì/‚ÁýØýc¿íGC¼ ‘£1Õò¢reÁ?ÒÒýR§¹•}¼KÚ'ÂÇrÖ>Þcbu—„­_"ƒÔop€	1{²K“eRvŽ5ÝPJ½®,QM·Ù~ê{ÅM!3Ì;;¬0*!Uf•i›è ßømˆ´T‚àˆ.ß¼‚ì™ø|·WYû4íç °¶~Ècæ\ç8Û’kÌø)mÚr.e™.´ÏÑÏÆ.»031·ï;=10UóHéz«Ï¿ÌyvÑÝñ¤u¶ä•Öæ£tN™´öý^;…ZIh½k(¥ß„V[(“Ÿ/I-<dÈ´/ZÄ£p*B–ýÏpë ë>`m¥7ý }Lc#jOjŽ½þJ”N÷Ç®Ì8.	erb›Hå>]ìÜ%«äã«?tO*Ñ¤Ï½jp¡ÄêQþŒn³Q&æ'ûìŽTÀøˆ®uâk$DO¡N±q@åD‚ž×ßCË«í¶*‘ŸÃaÏ³“xbÙ1=y\™b‚Ó”šÛ"-êóåL\ØÞ(‘€ûKJØR'þ_RÉ¹(cö«a1-Á:)‚ÀI]öwJu~¢NÊÑMv9®c×Œ‰dobmR	‚X!éÝ‘h HÉk?ow¶×m:ýÒ‰ËB’‰›@Ëð9Ç²Uò•Gµ;ªŸ/–ŽtÈ¦)¿×ztºu÷½î`çÿ  ÿÿì}{oÇµçW©ë„Ã„¯áK—¤—"eIÐÃŠHÙÃî™iÎ44Ó=™îÉ060°Ánp¹Á^#Ø½v¼†7Ã¹×wqAþ àïÁo²uªºº«»«»Nõ©‘<ØâÌtWUW:uêÔïüNÑûÈ7fgóIÃ­Ö™óðîîõ«'Âó»Nâð—ÓéRáD.
HµHß¤`£G~eZÎQEœ¡6à[5 (ð&
E°&­k,y¥Õhi†2å'ï'‰¼N?$ëºj>|ñqLc«–š¡a=†€Ýn<ì”f‹Ä£SÖ	Žl£Óµ
ÑB‹¢Â»u8»²{€d·P(Y‹é3vômhÇœýBÏÚ³O–¡g‰VÝ‚èz­l¡H®°Ôk]²‰!ÄÂR¬Ó…–Û à‹ˆYÛæZvðÄðKU®[>¾ãkô&  ¡¾¬[„ãïð@÷¨¡ˆGÑ÷q%ˆv¡Óâ¥%0$"€¥ñ,Äb¨{#†èeñ<EìöˆQ " ª °ßÞ$‘!Ç»®
¡þr_ÎHõ>`ÿÓ$:>ŒÍgÁúÏXd¾4H™šuìÀküõ˜ñ"ü"q:  ½hú¾×Ÿíy[½{Ç<ÿŠàaq¸åclÓAÝJ‚}nìª…Ø’Óîii¥!¾¬põ¼é¦zè¬±ÉÊµz=ÕV½•Œ±¿^{[™.„Þáã¤ÁžNì]<ÿ¦GŽ.žÿ=¥XnÃ»Gÿ»qœÙòVŸ­“)žFjŠü‚LY``uØŸ}à8%NúIåTŸ§ã´?–ú”±‹_Ö&¹Y2ñ’GZºGi#Ðó1bœVâØ¿ûU”ÇZ¦¢°PT*[»ìÐ×¿8û[Þ¨·Þ?)ƒ#avNOöhá€ÑÃõêÓ0 EÄqÌ²P„>D«®r>m§oIhMhqp}·¹%Ñ¢	ùás·n˜© ÒÐ:áVëhy®§á†¹ú¹²u0„óâ{03¨
©&Ï|"Ë¤þ”l4pÂâž%ãžãJÕÈ7n5¦5µ6«L¨âpÆÂA[%»NFÌ~€¯ºUÞi‘¦X³Oü€VºÉEùýõh7ªú1Æ"¨~M`8Þ$bƒô±üËŠO°ÇíÝì`è÷ãSãözwÛò>C¿Ÿ}pà4Èp=Fï(£›†~Ã†×íY}ÇƒQ”Â!ÓÁ©DkŒ´dO¨×€mÚz‚ß

oxfþïÊÄ™ÊÎZ	’Æ7&W_‘\S<¯ƒ9ÆÍH­Ñ õ$<ï“¥EÆ‡ŸC;]–Û.×%®B÷.",õíÙ'ËœDOØ#‡}aò-å×~H×8:2}'‡*å¢=Ã9òWWÖ¤„Q¤&2`ï'(ifEÏ·—².˜ô&øºÚÈ’„¿û‹%\ï|öGÆÖÆ|{	Ù”žÊê+-ŽkÜSýÎÀ!02„µäüë€¸m–¬{qöi švqö/¤N¿ z[ƒY‚}+ÀÑ‚¡ød]ý&`d/_b«1umÑßX<I+/vnc^ëýf¯‰ZÔm8b’b…$níø7”èæùrd^ÆQ8s´¹¯D{n9Á}»ßR&È“—ÓéVnM4B†’/í6&º5;ãäD™ÊY'­ó:nl?T¶~&¾x
¿Ò›dJr[LQ‘ÎÞ+Oô^±yƒ§âÝÛ”ðÃB,æW–r•;@Êx‰šµØ9‹‹H¬MÜ]˜Àq³å¦t®qök´w>Ù Ò¨vgˆÓ<šÆæ•‘[$òÊh;:+-¨Ô1:|{Â,2äsSØŒ_`QªŸ¹Wˆ'Ì	K¥Òb¿íÀ¡Ë:¡’ÌüDìc•uÓé©	9kHÁ©…Z£­ÊM:.IŸ›’h™caLÊDÝ¦3öÃ»¦ê
Óo¨´:¬ˆG¶ßó\ŸÚþ°w°Ø\fÐÞ¬P™ûA…´m0ƒÂO¸•‹ÂŠ°õ‚XK±‹`ßîÒ/O©qÓo9.ÈZàõÖIma†° ðu²Dÿ„üœëd‘þU÷‚Àë®“Õ*pÈ¥j‡ÖbûŽå²Ø?è{Oí]‹N8›ß¬,‘¥
I§au6O¬ŽoŸ†·mVþá v°rpÍ¼±ñÞö‘ãcéN GîReQqéˆ¡IR,ZôjÔXäsÿ¨ìs04N§CW¡X]¾¶¼VŸša³tÏù¹Í>½kóQÊStìèöô>šœ“eçÝ<™]^Á>zdÛm´½þfÅv›X~˜PàOV‘MÃÊÉO™œd†23FéÎ¿¾l-Õ×
;•w><É‰åhïÒòØŸ¬Z´ªÞ`Stßó:ÓCsø4¸Ûaó¤zB¸#a†ô¬ãŽg5é\f†ì©aòžþ€¾‡°8éÏÐè1Ëˆ`	‘¯¿Ær1)¹S“Hd3fä×T®.üà¸äÀj²îy]ø·9è3â$Óˆ®ÉyæZ·öH=¦7©—õ×O;¬Ž„ÍAd
2¬÷ SQ®¯KÕ¶,Ó²ŠC•&±§Èýnª)&†…ôXÎ^»;K^'b†0³–®®–{LmÛuâ2qS7ÓPfí:k·ì¶¹°fŒ}=DŠj™™ÞNë:c¹7Ç J%,ätc´sÑqal/÷æÀÜÖhN7®œ¨¿[tªðÑÑ™É—´–$¶q\íÍ=3Ç(îE°ð·¡++ñAæ|î¸ÂõÓ¥s ]Å(sîŒlëÎö)&4…&O~ñ¬VÀpxz’ùû³ú\Û7z$Üöœd7øæ¥¼Ëö'K&O6½ t(ÕšË3¡É›mÊŒ\ÝŠÏ`LaŒ_Ü¨Ü*^M¿`X3à¨™¶šk›'5ª‡KqÃf›búÎŒ_rêà4ÖÆ|´…Çø3.„Ëño¤è%jiz‰7¨¾Ôt`+(C6]mÚÂ—SëE8¾Ò‡k
Ûµ4^“ZòµÊÖý‹³/t3xþÇtL…4fs¬¦è¤³Å~tß¦;Í¦Õ?fÎqÆO;…ö9ÀñP™<”¥}J€AE¦eõa[ðÝ¥—NJr²ä;~£¸ßâMV”r‡o^Ó4Ð×X×&%nJY$]&VŠt,‚-CŽÛË¢tN3ž²6pÜdQê·1•EqìöŠ¢€§¯$F ú1E¹çÆTãSßË‘Fìv}ß+n0í\<ÿ²Ç
Ÿ¾zSeLÀ¹Á@Îc¥nf[Zå­|¹:Bßƒ"F1OKæê+Ôf|,¬Ü.êã/—¢¡c*šr?Ž«tjÉS×xH(1Û9¦ò)õ¢”ô*OB¥4–W-¤QìÆ«kjéàßCV´är
£f/‘ï"û{ßîXG¶.rUº~#Ê_òâà4ÿØsY

–¼>üI&ß‰óœHd»äÙùg¤q
KŒ¼<)!Ne¬ärH1–¡	Ì«ø–Âß‹¦?†][ÜYÌ±Ý§ˆ1ÉÄÒAtIAL	7ªpÑ$:€‘P«)C9b\ÜÆŽ×íy>£îˆqq¹h¸EnYBÃ­áÐpW‡„Ã£àÌpeÐoeo(Ôäfpà¶k¨»K Û¨mWAHV¥/b ßâL>¯	4@´©Ôˆ`$¸;ôVîÜ8<hfåüâ n€LM?YxS
ê ¯yD{*ÄLƒŸb§Á1Üx§¹YÉÁ—5jõëkµä,XDÎ‚@âKêmžÜñ„×§fmÀÏsñO½¬AZ«¯4VÇsˆÒ)º±CmT¯+¾Ÿß:‰ä×:X;°SH ÕÆ=»9‡ï,Ö¼íŽÓ¢ãK]ÜJÄoçâ€Zèûî3HÃé7:¸õî°oÁlOàËzVêáÚ?µD- ÄPOÕ£o$x‰ÇFõ+(“Ôi(ÙKdŒì‡óÃÅT¤ãFÔS‘´`[+öuƒgB Ì"jþe¬²²‚ë‰Á²4MÞÖ)äÜ0Œ|îÑBZ5$¤&öUÀ°Ø î†G`# ÿ2€â4IæWãF´Öc„’Ô]Š¬G‚’áWœM¢A 2Ë—mÔ}º_ø›'OVg E·ï£¤§nõAmž,a%}"mÉË\µâ×žat« ´ÂËh|fi¦[¹åb®[—P§@JÆRTˆT™ôàDÕª.­ðoÌ'|":/˜!ÈïûÎû¥"\Ò8À¢£›Ò>°•…×ÆvF~`¨ÖV[˜øÂŠ¯—íkožÔŒÝf¨îˆƒBQo•rœažž³š>?è÷ÕE4ÎÞ‡‰‹HøRV®Ûõñ¤‰‹hâ"Ê»&.¢‰‹ˆï[œ¦´k	SVÅ/‘©‡È`ç=¼‡hqy"l™kâ Ê¿â³[®ÔA™JßSÑXÈþëáRVkÜC99AHAÜôÅÎ¡Å‰o¨øº,ßVY2ßÐ{#=#÷¬ÝX^»~}<÷ìÇJ8HKõµÅqõ~M+ÇJÞ5q¬L+ÊáGÌêš o†ð­ð…{‚¾a×8ËÛ÷Þ½Â­—+u¯DÓ÷Ô½2.â?¾3KNÒ¬D–£µKü<Öëiã \íé{?7ybØöç(„ÿdjµ­ƒgqaa~5òñ8®«ÅÑ®.éý;j*ÓòéLz`ØxØ»ÒmŸÛ]Ç‘€*_¨7»0·w&tÓÊ‚”Ã¤F¿
î£Ðó‘su¨Í¥ôn¢k»M9Ã·ÕAóqp§fœ),™5<"ÇM‡“¯ ÃÉ1AËx
|ÌøH¥h$d—!HFä—#K)q'4gÆK©Q°c\†D™°a\Ž@%/ÆEžðôXBqèoAæ&èõ1<ZwÜ/•˜Œ±¶Ãÿã®Gf(4U
òõq.ŒTRæB¶½/ aàÅó¿‘ m³~ë°lìŒ‰¢îaÅ÷ü³cŒ%£ÏÕ¬åØ3voÐíÒ9Lî>¼Cv¬~ÓÔˆÍpòú]‰“w‘tZÒÇe\zèÇI|r¹d”(K‘?t‘ /	Ë*ì3zcÛi6ÁªF%K·ŽîG¼Î€¶&ð¨É#g!ïÙñèæÃ	Ž!K&+{–Þø«CZ[µûüÿSs¿o»à–~ÜK
}lÐÿ%øbv‚²#~˜\*!‘ecŸÓº4^|är–:K­åV)ÐuZQ:Xú=Å+ÁÎ)?K¨à¶qÁ£ƒQÂÒzcÏõíæ aW«V£1îž‘ƒ~"?&Uø<çS	ñõ`az†þ§_piþŠS.¤rI,%#r_…’¡ÔàÑ=ú")%¡Rµ¯ö#ÊxÀH‡Qq¥û…KÕëÅó?tcF!`ûù$ "éÑ[ž^œ};²%o¢×†ÒkïRË
tšD$6¦jMN–rNHb›"?pVÉTj±6êw-*?}Ûz
f*¢«Ó™TÊ©©ÐM+*­¦*¡àÕ:Bî‡X}å$fMenYFÛØÅžàkµ–†ùkÝ¦m¢FÆE¼¦‘DsG8YØ¾Óµãç¡m?eûMXÂØ¾T¿ûæâìwT0Ï¿vÛÓlw9…Id†Ó=Ñþõ¥+Ž?xzGl$c¥ƒxép@éFüWä]¾ûi‚·ç©CµÈDw(Z÷2tÇ«Ïq©@}XEoŒõÇŽçó{´'HuÿÆôÈ¦ôÚCÍÿj}vÊ‰änöØ†h“Œd;…9`•ê†î,]u6ª9ä½“^{‹,P5ŸRœ÷­ =Çæn5nå¼ôØô4¨ÿªo¦ôÕžNW¯N‡rA2U¢;Ñk@•iýüÏÔ›'5æB¸§¥Ð¯‡Ÿ0 ¹™+MœU×t®¨f×ñƒ¾S€†#›×«©1[§°­O–a¬L× ù;cƒ¯kVV-:ÁÇäÝ¸Çrî”Y0×é.3ÛiçmôXJùžÄ9oØjÊ½\†W9áŠ†MËG¼Ý.´õ_Áù86°èMøÆ
­NÉHi´¹›:ôO«Hêí˜È'§÷±|óoÉSjü¼C?#o.ª‹*Ý¤òPÔ÷ð:ÚßýŸU5éùžqnµb—øbœ——DòÒ‰ÍÖ–ä²9Cƒ—y©z{‰{*;Ë©YÔ†69Keë¤É P&™—‚Ø$‰l3N";LµYyS¯‰¬ƒ­xTf»`3…¤ë]5+‘2SçöÇëüv09Àø¨Q[àGÀ”3=xo9T{TkÓ§?À¾,:6M-&å¨Ô•1r‹ËrŒ]¸Åw˜Uf´‘o¬H:”È|›âväàñ@ºŒÌ`*0ˆØ£¢¼ŠÎGêÑ][ôŽs®0Úb›³ú¬a‹`³Lèqiv±³0OSË¦IÕ©5Ì;L6vl*tL3Ø Î¾qÂŠ9ýð”ãÇOXá<‰¸A
ql:êyú&HAK!ÛÅUOB´î	3ÒÓ}8€gy Í¥ÄÎul·´§ŠLìíûº¬>%¡B¥Û9I¥š¤ÖæuîÄê&©VÃ–?Yx?Öé¼-yšÚ¤¾p÷ˆ—F¸
vÉLn¡éŸ/¥D×qgA™rŠ:žØØžu\r`5Ù¿?÷¼.üÛ³%ØÒ`MT78>Ò“°'Ù…õò¶M~í´CHÜ_aOÁ¢R‰çuj…´Øo,£õ:‘$@ˆ1›ëÈX»Lsr½GjwQÒ0ÉìxN¤æ™šcQ“Je¹ÏÛ—¢lŸtZèƒý´‰˜ž²F¶ba£™RRÊ8%\Žðú}ƒÝÏ­Þ1Ã.Ç˜µÊVd7†jçô"‰Û^Íx?b æð9¯BuèÒ‰-™ü5QÙR{‰Ô·h=JÜ×xË¦µRÅL…å¦8C¿{ù®%Ðæ«¥<HêÄXa ÆØJ)]‚C
%œý¸t ½>­ÏâÇI²ÀÅÎÙ=’œsf¶ bÚ£µŸIÀ„ö½wU½øä;Úàgg¿N»~äd`ƒÁÙý—ÎÓƒÓiù>^Î„ù(ÄB#}B8ƒ‡®Ødo&ƒb7a%›¢gÙJî)T‡<cµbW›ËïH Œ„ÑDBZ‘Àc^à°ý·+ù¢_ÁîSË!øs—¯²ÅiÓÈûðRýZË23øKre©ˆœØllZ(Éœj1™S-"sªIdN8.'Þ†«âsbµ¡9à2çu‚«¹\enÄs2Ìõek©¾–âÿN²ž\C²žð+$©M%Q¦«2}PâåVùËðõ [™ää)âÝ‰	{â˜§]›ÎÒŽÝ”É{FH¬Q†áEp^,ÚkfœË3@P†OÇ?>AÿÀ©ˆõQÂÃÚÀÅ!)á²élPåAéÂ«%†‰äp7&Ò{°v­vÍ0_ÒDzóžHoâBÓÌ¼œ1¹ÅFÅe!ýžrÆL&`þ…ôÄÝð^®;öçÎN\²˜2_C—,G­a³Ew_­{6tÓ(\³»¬E,–¥qñü+—ôÏ?#¾Mî\<ÿœ-!Þ(èpÑ%OÛ–séžÙŒû
5¸dµµN|Š¯…OqiååûETNèNt=¶2NÜˆ7â÷Ö8ñ éƒy3M¶€êëûçAœHï÷JzÁ|FÐK÷]ho(¸ƒ!Íz' ûV¼ec$I7€ÿ÷ê¸xIV©­ganZ'
Ð¢%¼(ÜEPQÉ;’y¾ ’p³ïõ€= ¯O­ÖyÛ¶À##‡nÕ9åoŒ+™‚¶bhs"Æn[bsMøûN@û¼‡›‡ÜN ½®£aÚ¹4.À¸R†Dˆ_78‰„€C“I3¥çç“½„ÜQ‹*åÏ“qìídþ.£ê0<Ó€4†#Œ¾8•:©Éè‹Œl[ÏÔ´ìá‰È23%šñG³Ö ðÐÊ4QVŸøvÏ¢]¨:ð2D_²¢³j#EîÃöã8$Õø9Ph`s¾e+{ä&ÜŒ…ƒÖÇ87èû@G«C/LÃ>â—3‹vHÑ†§ü4½Îìgö8œ­­ò_C=”ÛlÂ¦_‰\ •­½ý}FbÏ[Xò½ž"£ê~`ïÏ-ÄÙÐ>$ÑHÆ'¥
WñºÈèåŠXYíQƒ­ÚëÛÏXèÝ	DÓQã|!tÿÝtúÔ¤í\'pËý‘ÛŽìw=_G·ñ-¿Á¼ð´‡ÌÉÎ¾8ÅFÕñË0Fçù4Žyñ1]€ˆÞç4ˆÛý¾wø¸·ëºÉe‘±›%‚NL°ªÑ{˜Æz¼šseE¬±Ì¿x%Ó&d€ð\ïJ&÷ÙM¡ðŽWj	Ô•›PÒn2Åª“¹ô=Kà?*šIì÷ïÙ<Š9œ8æd.7—Äîïš˜MáHN§Ø{€˜O’3A1£’¾ˆÅ…+™Xl#Z4³ø¯äÔÊìÛjZF¨ŽšWe¢“¢7úÞÍ,Ä:õªO¬AZ4µÄ-¯ää*¿nIÔÏ“©5ìÔbº©yÕë?LÞä
‰w3‹Ý™;­Âr®lNyNá|¢?ÏæÒ£·ïà&‘IÎžä[\É
zä¢ý³ó’ƒÖÄ[|Ãkc+QúéeŒãqšG†LœÂˆJ*Ùd²À9m9)-+4Ê0ÿó-rZ	m²BÇ›Nýœé;Y3û›{"ð¥–`FŠ}ÜFòÇI›Gh¿ä¼dŒÔº@×Å„Kzcd~i‘RL¾RºÎ„[®²ç÷lXÎïÅ¥8Ç/W’ú…_†:‰‰c~“žàø¡w<»\ <Iz³išrŽ€Ó‡•-?òcR;•Ô<’ã˜xSEá’È’nI‡‘-Þü)l³Ê´ˆ•ž8Î§žÊNr…ý0+)]ï²ì\ü:I(Ø(ñq‰‘„t?sÐ+›²¤ÇwÂ²Ê—·gŸš–-:ˆ.ËIÀ³nžýÄÿæV°Ý±©ž\™­äQn&ï `Ìáh^áÕ½Û°-šTýóÉ7Eg)NÅCˆ|² E[F•TOÂÙaÐâE×;ìü*H&BIQ³ÅfÁ¬lÙÈ™>™OvÊ=?´DGnz•êR4~ìA£„‚àÜ;4¦H–/T²ßßàº³ÉPÐ~„` ,òsvIË±>¤&kÞMv%)Xa/•",E­X†¿o¤vƒ¼×íQvœQÕs=‘7¢ÆX™•ó^ÌõÑ¶õäCuc9^MÕ¼ô’.²Ó¬QÃÛt¨rœá¾Œñ­¢r6 G¯‰Ó•(}t%ÑVëŽìŠ•FB^ˆzG,ÆkEÂº•P"|¾³ýó)&«Hæ±À¶äCW0ÏÔùM¦Z¸Åõ\«¤}€#Ù_$óšªæ­ŒÝ:é{ÎéÑH8kyG®å¦nJD¦Ì{Ø¶qGsÐÌ¿ÉÂ®No›{³[OÑÌä£qwñ¥š¹¨Œö5\Dßò¼  ”Ü)k*5 2;y²Sáˆ@TÎyây½žEwA‹§*7Äjš&šÎ¡ÄtYK²*qá?=¸Ev.Îþ™þsûÎÅÙ{L~òøâùïÉÝ;n“Ý··Ü^¿T·šãIQ˜užt$¥íTòT”æKÊGÈ3^Ýë)Þ'±ëÑËñqy¯Ûz6‰L±¹D«ÀP!{rÊx•Šàö×’›biPz@íJß¦&\ ~Wà«;-Ò‡é²Èÿ‘ö…wpàÛ,KR«iŠ=Äò…ž·»„9ÂÞ\è~]ÉÂËR¼á79E7ƒ)ðDÜøpøD#ÇlK“U<¥™šª,"H‚Þd²†vÚ¥«¢ÐV~Îªb‚R%Î‹9—QÍrÛÅ%DKµ¥ŒàÁu2œ&e–I)Ç›dh± ód¸e \Ë×É‚|&xzTÂóQn¸rÔYl¤gsú¨1âzÁl(‰‚XÙ‚m®ÚÆ]“•1òÃg¸QŒ}eï‡%4å±å·"8¸x¨Öâ:yà…q£¯`°(O—¨
’$êG`ŒƒDá-DÎn¤QaA$>´€Ÿ5M†ÕœãŒ(BT¢å™D†N"C'‘¡¯hdh¨Q'q¡ãÃ¼Â¸Ð0Ýò˜¢0'løk:	
Õ<ö2—“P®”Ó(Üã¨cÂ­Ñ…LB³×>…}Óë¶h}YÎ”)0žï9çtÉÏ–ûZE6ÈûËD4L†
0•ç$¸ y½‚ÁtáœDL¢Ê´o]Pº‚ItÁ$º YÒ$º ] Ùà¦EwñùkW:…™ ñ_+ ~¨WæWðá©ºí[_öDý²@Íi¸¼7:¤„SÃ²òFÑXGªc^P¡5S/>¹8ûÔ‰‚h˜›B-ƒÊJ$õ…9­ÔpŽZyŽÊúº˜ÙèeÔXáåV¸=»¸œ8KéÜ#ieCÜ¿xþe I¢¾ Hs%¤ƒ€ýr@ÿ9ÿ¢ôqzô¦W#!—…|W	‰!Þ½ ícFTH÷Es I²ÎQcÜñ÷•4Â=½ìß3%¼qq¤!î;·¿ûf›<¼}þË}²w§<¶³T¯à‘í*4©,/Wg7~¥Ì;h°ìF/44†]%bµ¤ˆÁJŸz?ÓEg/ƒtÅê,ˆbbHÓ&£t’eP"âR£†>6@%Þ´æ]×7À|&“ºÁ¶BÞK˜c@ËžN\öâUûùj ?Q5n07JÁ±×ð5ó›Ô¿Št)êsRŸäí$ò•;î,Bk2Oäq/2'iª‹¢T¶Ã)»X^|òâ#·EžžÿM“vÔä}tžÔîŸ+:.É*Ç‚›}HÂT¡ú®è¦„Ñ¼–57ä(šlè ’V2ÚæXG,mËmvì›Gppñ–Ó¡e7¹CÖ/š¥MÇ‡ÙÙÜ<áf ?ùx×	ÚÛ``EÛB¾)É/©pšÑöØ{½¾m5ý¶mªßn¶¦ñe¾7`›…›G*l[Ð¹8ûÇFÁŒå‚_æIÕñ·›]Ç%¿øqüû^“ÿ±Ýhx7 2­³±74:H/‹pÉ#\(™„K'—a" I,ÃoR¥Ða'²h‰;þ#jV{};Æ]Çêx­·{¶[ÿ¹v	‰Ô	K
ƒXŠÔ­#éÒ ØF¿B¥´”pÅû=*B Å Ía7.¦úSêá ‹Mdª¥Ó`áÒ–=Dso;ð†Ç%ç«H7<wÛçÿ4ßg_6Hpqö'ò ®è|Íê¬›ì®qŸ?âX#e-§ÎÑÓ†kñƒÎÓ]»c6BƒÃOŸ>Ö„ê¿ÓÄêo¸´¶×~ßòÛ‹EâDÞ;ÿÖâÊâ=ÿÑ%ÕÜ&N¿=~Ð€c¼«Ãçƒ¾ÝéûArÉå¨Q*?ˆ\zCïF~ÊÕLÛˆ¢ŸRª=>y§v,‘ŽëÊ·§5û9^£°7p;:5*ípöÉJ¬µ´Ã$^aÆRaó–‘îãÇí*8îÑ¢m»ñ´î¡’µf% 9îK(ø(«S«Žsæ,íÄœ_¶ts™_T©PuÒ²©f¦qµç«O«œß ŸÇ•šz{é—­¦ß€|uhQ UØÄ«–5TCž¼?fY^ÑÓNcáAÜ’h‡,¨ Öævÿi;©†H_Dšý>bˆ´vXFŒá7Ÿ"Î&±¨Ì½HÙz……Çéö:v—I‘É·½²¢ô è¥ÿå$ŽÕ'’uI’%@Rá ^U‰Ú@×Oˆ¤C¹ñ'«æq‘8…wŒ4•‰ø¹Ô8¹K.¥ôhß5Žf“í´Ïÿè¶Á)þ«F{ÔmÚŠ!ùLg´[G}ì·-T¸äª‹¦æÏ„‹a:éY-Çµ¢ÍGö<…3ÕãH¦âsŒ¡aq@°o’Š¦ã6:ª+ªlEGEJ„´D§Ù:Ý}Y¬1;< Š~d(¼7Šõ[+-Â]Ï÷—o*ð»•­“*?‚zhµl2KjÓäGdqü˜”ˆ?‘³B~9Ì‘8Þ7QÊ;12ÿD¡‡")@8H[I—Ã°N‡œÝ¾XƒŸÌÍÍÁß3Ìß€u{4­`k:÷„T&|CÿÿŸèÊnâÁy&gˆƒ¹¦µ†ÓÄáH°ë¿oõžÔçà¯;Í÷aâòxºaŠ‰UEû?ÞŽºðpÀ_%ü½Møž/¦ÌoO¨rnú¦4nDhxq®ðçïž×°:ö^ ç Õi p¶	 A;È'ùëÐ”|¸ÆŒÞ4ŠbêC·Ÿ¨Bùº8?ÝXöF´v"û¢9›0¦_FÇä…ò°8ÚßîßìZNç%/û%qVˆj‡U–FyÐ).~vé4<iYHg¤­6
ôc‰ÃÏkäþ—BQòwÌ¾É¸ö¥§vÜü˜Ð#7›N¸ù®ÖÑÑëmVö.Î¾¶d ÎfB#)¡m‹ÉŽaØt°&îì;ºûµˆ…qÉQÌ~I®¶¦’ÂN´/OP²€ŠË”$òxt¦„\ìÈ*D6è•9:0J…ùwü;`ºVg/°èJ¼FßÕÓ¼}nïX ?¤m- ¤Ü	ÎÿLÍÜöÅó/!«Ô7¤ã\œýj ¡M%í‹³/zè~Gv«Ë¬óeè ¡ˆ ¤‚ £˜s"'ÃÆ¢‚êæ2GºØl C¿B‡~9;ôRÀj<:éõ(ˆ7ÒNÍD@Òú•XhÈ€ÜÅ4¢ô*T,ç“'sE1?UôZ¶tÜ¦Cæój£mõƒ}§kÇ!¬‡¶ý¼éËt4kzB­—Ô‡QÔUv`¼ùˆ:q\û‡O²r=„X(¯X
évìr¥Ym…—5ôBã&wjòíM²Ýrº5âàT ,, òØV@.ÿŸ
À™Þâ}ÂS2tHh×ä²ÍÓ±Gkh²ØƒÌU]ø$ÑËG,æ¤XS¢rûÛ·\¿`FRk—B'±—ÿ”TosD5ŒÎ~øñOà€É¿¿duçIk¡A;<%S¸¯*©î¼àÞM\pO
Hœ¡JÆPA)é˜v z§V4§óÎ¶áéj¾ºoí¹®uT­Í;¡)P…3q§m?ë{î=û ´LÚ ¡PÌ%&èÃÑãï†‰ôy]†2×ßØ$Ò`ÃÁÙpcÝƒ·’ÃËGÍ·Ñ@?âxÅHw4a(º¡-ƒöÎù¡0´T&UÆŠ¦âCSÃðØ§:ç¾åÒ>†#H8¢Pú£r·µ!UK…¸3 ½¾S?ð-âIy
§*ØÔ¡	Ì aOLÅ5(ÃÚpùNò"VÕ‰Kâ@Ï¾wX.ËH1g_œwdë'HÜA:ç‹!uÍó¿B*DÖVÐ®í7úNò­‡mX ~68¾8û¥KžFZ ©ŠHpm.bÙzä2F±°õí£¥#‡³«EÌC{¶Õo´lußë›t¨&DŽ×›­Í/ ÆÔ1ûBÌWÈÎÆ®Í)êšwt‡â=jïÛm¯Cec³²Ž’d¿ÍÍÍaƒo{ÈdÑž½^¤Uù49¡ç}¢Ñ•áÑ6U“äöI¡®Ò¥/Ù@Ä½_b‹>Œ%È’“xd´>œ$0)œbhd©Œw, ×žÿ[¹§'–T©:ø7ºìÝÝ.WJ„ÉdZ¤
Úã¾×,W˜~jt[+l“žùèÄêt`®ùšW¸ŠCRæl81dGêSüTóÐîïX¾]Ža-ÕxÞ+ïœ†oiYÐQœn¯Ía=, áÏ7ƒ0ÑÒ`Ï*Ó+	nÆ“d×æ¨‘KW€ã¨¯9ËJãâù×=Nß 8Ï´¢&xÉì_YKìðˆ[úèÏPŒˆ#pÇdb¥›ë{Þ¹ ­SH.qÏ}ž ]´4é¬íq¯I{fé#ZxuÀNÛè-3tHi×;-×n†„Ü>Týä}ÔérŒy/bÞd(aÅ’(÷¨È+¡,—½7þ.Ñ£0ä…ŸºCídaìûƒžÝÿ€Yô•­=ø@ØþA´
î¢ø°àQÙõš•-º¶ª…Ñ©²u÷âùß©KWÐÞj6­ÊÖ­ÝÝmR½åœÞe¼„Ÿ4¢Šé‘UôÁÓ¶çÐº^|Lî¶™',Y#ÿrtõ=m²Êîî¦ë‰hGUhŸÐ~ÿâìØ‚¨hPg•-PBæŠ'æ xäe¯ `mÀ#ðâ`~–Z"LeÙÅ`ø0¦\Xö„hQ@/ Iþ&jÉà-’Õt NªáÂÊ|(T­Mqƒ&þ.ÖM™Ÿ@³dï3Eq;ÓŠïŸ6§¦Qô5ì‹‰¶"t-úqöÉÒ‚£ë§öÁÞ=P@®Oú¶NqÊ½Ä$)´‘|èÎN;¨°±õßJxsª'Y«æMá}…c5IâÅçonÜc
†}¿»ŽÚ²Ù¨IÅšdôI=Ê}g·2þ¯Œ­/ìmù±2"œhy—Ñ¬Åª¸Þ„£¾aŒÆQwtÏ?ƒý|l¢÷ü³cz×·‘ñÈîÎM™§\_ÏÑ!#m{´rç4»D««x7²Wyñ	KÑ àÕï]R¿8û-ùî/„i´„‹¸Ôå÷³ UGêçŸ{ð€7gÌ”>ÔT›ÏúôÒê;MÿO×ž°ôQ[è£ØÑxÌÒ$—¡É1<†®‡ñ˜(›Îœ'½T$â|˜šÐ¥ƒå"É†÷j§U&ÓA¨Xò*8–¼œææÉ‡Ð›³op/ý—uˆaz/~E±dª2ò“õðÑdÉ«tlYª•,\ƒÁ€ \ž“Â4g˜\ºKmZt: ­ÌÁõ&‹`›<C ß/YÔºxsá1­:Í„ùÆ¤õÊ¤MãWWˆëóÖ?¥J7Ê§&.D°$ID%¯1ð×¡ODÄ¬a¶P¸J$d
)wÛA·ó–×Ï›Ÿ¦o\€¸uÒ„Ì¬7OÓ	­ÑEïoRÌó›ÿ˜qª³l¨†ˆÅÑÔ=7o²B·	G÷ÉŠD¸¾ãÄ•­óÛxß7¢ÃKn¶'AVš+…&:ÌÄÈ‘41ã,Vy•NÓéÛÁ6#Ó¤CYb¾â)ÇPZÀ é†ÜóZ°Ú¼ò¦qÜ¥VÂWŽ^’D(µõÝˆ—Ž×ÅóÏæsýÔm8®HAüèCjrEZ©Y`<ÛŒ&€Ü#}¡¹±g ‹‘ÕÃe'(1ÔOcs¼¶c»ÏµÚÂÚiÁ×s¯‹Ú)"GNƒf"*xAA&xÀÃÊ‘9.Š-T0”&‰…ÙS`Gh‘…QýyÙ'èý©oJÇAod‹j„!SÔFC®Ú_o„aÖðêääqºðƒÒjpqö+‚ÿ¤$1»5È‡éÇ»ÓÅûmÛ#Íóÿç í•HøÁœ]AÛ:f‹ÙoDx#À";g¿n°„9_§–½¢iÉÓ%adRv]VšØÜñœ‰mð6íƒG.¬šýûúo~$pþíAr
_›UèrPœl8Xîê±NmR[H¬¤RQŠÎ¿ÆFIÃ¥LÎøRÊø[Ð$åú»Ó·©Èï€Ë…í€«S/>†è’.yšHR@ÿùŠ
í¿»­©Â…AÎ<qƒm>î•xÐdb˜[Ñ,¶ûtÖxTd³ïS ¦È ˆ±•¦8’”È9HR‰5jŠD%%$‰ËÐÞ±ÛØîtè† ™5Çñá*ð,²lƒ#Hœ“*]wÆ»ñÈ>èÛ~{ç0_Îˆœ³D#tz·6³V¾'"P)Gš:ðÎ?sùŸˆL#ˆIƒ¦/\¯Jo¦WÁé‘Î¹³;Cv¼N‡³‹êPõJ\=ýßáì“EžK@>‘-5ÜÔ‹(±ý.ÞÕ$€ø÷0ÏÆÛt! &naìc8MCaÒNˆB”A>p1êÜlçj Û2”1!1¡4ç0mƒ­¦Ó(Gl£
.Öé€­eNÑ`q^'×ùÙÀÇ†Ÿ†;kÖZj;0äÈ!üÓÖ‰À3`Û¤Û‹"{NCËJ0„ŸJ°tÃp\C«‡²|¶Nh»C¸±Þ6]®ÚbÓ—EÉï>º³“•MMÁ’	?T¹»7ïÝ„‚×‘´wªÐ½Ÿîíß¼_ÙºØØâ
Ù,YÀUb%œÍbJ!âZâhv•³^çÉièF¡;K÷–t®[ý‚1#1kÓ§f¬]]˜!t¦ßsºN0Íôý¤Óv1&‚ÞœFE´èdí‘(ÄPrøÕØŽu™ôfW¢Y½Ñf"Yp^ØYh°çd==Vø9aC-P#V"n§ó4}Æ­Àèo5¢š!Èðë·ûŽû´`\sž>ùð0²Š¤X»|††ðãú
K"ßyts{ÿ&ã/öƒ =¤qé\0èUüÓ›slˆ}ˆ6¯†·|À ¦SKt‚®¦TÕîJ/žº'åi¹ÆÅrýóÁÎí›;w¾}çÁ¾¨ÁêÖ©È‰*ø'dS‰Ü	XGÐ™?è;?¹»Z¡rÇ¶U˜^Ïñ7ÕYý†+<Ó,âhþÁö½{¬ü‚ätR=æÕÜ¹ÿðíGûÜx¼{ëæþ«
öº{#¬C)£jWÑPõìÞ¼ùðƒ°²G7÷öß~ÄÇ&Ç] ÏÆ÷ÀËùYO„ÈÖ ¿Eá'•­˜]Ç=4×ÝÆ)³‹=ãê:D+éš…3¤Þ!}0÷agiò˜9óÌµ9±¸yºuÚIˆu.ÜZ9Ô%'/Jã«ª(¹àDm€ÃÔ¯Xuj	4Ø5Ü’ *[³ôDõðMÉ¼‰òtM¿ Á…Z„à*Xˆ¦öÛçì’îÅÙïtï¬>Sïÿf»|AÒ8Êû¡a[&–Ö:²ÿöù}@n\œý3v¤ËÉÔƒÛÏÿüÜ|oçæ½Òåªeíáí;çÿZüü÷J³jLÝ½}þOwÈCº±û?;ÐÏñsP‚ötMºµ—=Ôì¦Ï¢ãTº'¸ú¡ÔÁ¦T«A'%ñ–	;ÙD‰˜ÊY|µ¼áÂÖqÂ¨®:F«$¢èYŽe,P«`>Ì`8Ÿ‹&ôÑù·Ö%I32Hÿw—[œö^öWâ4N©`xà{–? Rµ$¡†{,>€oKã€ )¡¼`#rºQôF„©É{¥'µZÊ®HIœ¼á¡/º/ZKf¬ÏÛá„)âEYN×¦Ë·÷æ\àíÂ<~“øÖýcï¬&n	ï¨NÏÐùv{½Û]÷}ÒlÎß¿?L¯)8¸šš›ÃÔà†ÕË†ö'øMR>Ñ×ó‘Ã4Ó¯óbë	É#d¨«0UÎpÞÌ7­ÀàÇuí"ŸR^cC«Ï$õˆÅpÞóZ»Ðh÷4Á_§„ÏýMÉä8ÅEõ¢ä>cÉ(LTBCˆ#:u<¿¤žöè–Á	¨>á£7Ë=`â[føÅÎ¯ðkéx|Uq~MX‹Ü'—=qgS ’tŽ/Ëž¬nœ“‘7."á¯+…–,‘ÈYuÐECti	wüG6ì§%\‡èC‰*cCryW†£<»8û%¡‹ùïqÖk‰ ï~w®¹¡è¬éÕŽ¸æ…W[K9ŸÖ²Ç³«IEÉmB›7ÙqÌZ«ÌÚôì]ÑÎ²,›ç½°·9ÈÈÉÊÂICÄ° e¯*Çl6³SÒ8ÿ7—tàÈ®8#ß:¡Ë€aãKÙNT"	%#rœõaq!½|%º”áÞkZ~;‰†Èn tÖáðaQ6Ûà¥{Ä˜ºuD&‘ä6+ß”Ò¤RD¶®"Õ…Œý”S]š¶ú!6~î
`Ø©ŽN=?
b×:íøAÏwÍÑ¯‡„^'À×¤ôÖžå‘ÄÝûÀ|ËóÀ}/ ¸eØXß°3w	&Ãe|5¯’îx?€qüW½¨z	ÈÆ6ÄsP_ýûç(‹,änUl¤ã²¤†‰Ü™’%'Ü'	g1ÆM¡`}ÏreëŒÝùßÖu3yˆíëP%6Ûtüa9ÔŽmÚ‘/_¥·Ñq¶nÐEÄdÅW®ÈDÌV¢óçÿÊ”Ïgy
0ó/\1°2å÷wðqú ûoÚí;Ïl:â´m+n'ÄéâùßHäF‰„*#M`êÑÿ3¸<ÿ:øî/ß}NK¸8ûý?ð¥ÐGÿÄŽ´õ-Y‚‘ûÉàüsx­?»í˜múmÌgÐ=-‡š›´§þJÿ×Ð67à{6!©v6¬xc~P©£ÃÙééˆŠððHC-2üc·ñÖ ÓÙ;öé6YÃ‚hˆÿ†+­ÐêÓyrGÆ¿JnÈŠÌ;ÀMj‚*Gó'nI‡Œ$ï"	ƒÃ„®‰Ò4ÉxÙ€#6zãZýE¨ ²sy¾DÌÍÍi÷2Ð"~Ó97¬þ$sYÊIZÀ8¦H´´ÉP€Üd»ÓÑ1Ùhß¥?ˆ°Ÿ­b±o÷íƒÍ“[o¿}ëÞÍönß¼¹ÿÁãG÷ŠåžÓ]lV> –£û´x¿Ò·;›×ózÿ„¸tk~`÷ûtG†YŽ‘³Z”bõK¤Nbˆ’Kh<uÙ£ñ´MÍä•ýÃ'°(?™‹±ô)»qö/	«)ÎT(!ÖÐêÔ$U†jwùdètH;cðú5‹FJry™m¤Ël¿Rƒ’ðëH†hu×¶©=Ð°Ü¢ÉU(Œ'Ómp[Í&G½Á†ô|M%{vÐÉÏIo¡Þ×øáCF;ñ6¨TGWÕm®Ç™Ñ±ZcªÝ%¡ýäé¦µvƒi«éÐš¼Ù>9è{Ý. ;qú)Vxxç¡n]ÅmÍPÙ’4¶Xf“²HdÄš/kc§ã5ž*`G)Ðžô­ó_ê] åb{cIÀ‰LvÀì¦*úùd¿Í‚ZT‡RK‡maž.b×5©(òW¤ë\Šôü'¨ûkºExÚÀ–Ijf'8òþÐû,põý$eå$]é…né1Nµ7ÜÆ;o²³gÕït0¢"&QŽQÓš¹”¼#iÇ±À.CZ·mœ]af7iíìÐñà÷‘ÝLBŒÝ‰Âm@ GúÌdØÚùîs¥çO…„ë<
#ö)ðm3‹â¢-í˜7ê[òü¬o±¦þG~Ø‘§ûMž
r ¼-¶«‡ßé~œ>zãâù7ìuŸ5`OÂŸwãî²°z:‘ž7àwÄÖ?òJüOZ5Ðt6èf@g$øž±ú~6°Â¹Iªïœ›“/×‰Ü¹™µq³H¾6C¤fqw¿u…VvöUT8#èÑO¶7nùƒ–'¹m’	Ü3!ÉÀù×à×`CÂN!æ³ZˆycêMðiûü[ÝÚï!Ç=`-k”¼I‘Zä‚"”(íß?¹	SRGÖÃ` ³?ô}!ãÎ)ô«`µ&Z±¥¬¢b3H]„˜s:¨UÈv—E£¤¤S”ã³ˆÄ	D¿Bå$19±<t¥bÙƒˆ(\¸8U§; ƒ â·Y©an´Ž6+K˜;Ãð?f<ó{°íZÇˆ æMÁ×•,©ñ]²Ú|GêäP™31ép+4BÙßVÆòJœ¤FŽÂòÄ’À¥uOe\d"ð›®<v `o¾@zÙ%1¤gœµŸÑÏ>Û:`99.q‚âÐ.œ##ƒ;anÉâ7Eô\\cûygw<ÈYŒpç‡¯êJ,ùÍWVsÝt›#Ñ[¼œ1ÐZ}ÏÏðÎNtÖk¡³Vñp°S‹’}ðì,$È±žÙÜÓ'}híanI~’ÈG+Í
~’Ä&‘¼‡ŽÄ%ßŸÅ)Æ32åë£ŒVÇ¦Ã;·P{Ï0ôˆÂ-Ì<Âì”\Þ‹É8„±ðÐË™‚@
*’™‘"MéŽ5˜–%b?6öÚŽÝáSÇeEëtÜïBûÁr›E*0t€S0–Z×ßU»¹ò×Î<t„ñÉšÀ±çè1D¬!êØ‹nžK¼À[É>Ý•ëú¥ãÄaá†ŽûÈn9~ÀyÞ¥£íVõY•
I
U“jÒ;yzå„YèÔÂÏ•âCvÖ8Ä”Éš 7èÐ%Yok¼øxûÁ-8 üßšÅX†àSõ?³ªâHQø”èùè÷qèvÖ˜tŸ£zùü#r÷öùo¶‡îåüÜÔâˆ‚²‹§x{9÷ÌÂy
¬d•8´ìƒkµAœÿ_R}›Ž{ŸÞ?½1ß^¾VæŒ`)«4c™³6V/¸­wœ~#Í|°§>×-=Ãœx„UË\íÌv^\·z}\P[	+œ®ñ‰;ÇÙþ$Ò¡j+¾Â‚+“†Œ¢ábŒÖkÖ”BÐ$§fjlÙaâþ;8RïK,%5úe
˜|@WoSÓ«áÑnž¾"9»„½bÞËÈd±ìXŸó¨…­JÐ¸8û’$9ÄŠuxi%ŽŽï3¢ÄeWvœÞÜf'šÞ çÌ\Ê­ŽzY¶§`Å“dÁkè3³ÊÐYŽõ¢ƒáŸš'µ3SAÅú+éo€ÑK¢g•ùÅßH¿„¨ËøX¡>iš0y”'ñà„Ãñ(4˜hìõD8Y¨F+[	Ý} ¾‹Ö(•©®“Óò„ÕJâ3 â8©ê;ŽÛö¨D‘÷Î?#÷,òÃ¾ÕïÿgroÐuì¾="ô9–.É‘i2.Hy×v¿ï>8
(u¤“cwcò:¡–&,ûóÀëwõ¦Yì*¼ïÿ  ÿÿ ¸‘¿xœì}{oÇ•ïÿû)Ê„®9L8Ã—(K\ŠEÉ–V+"íxW¬ž™æL/û1éîÉLlÖ¸A°ö‚»A\+^#7›5òp‹äêæ{0ŸäÖ©ªî®ê®WÏõðº‰äLwUuÕ©Sçù;hýÚ0M£ýÒ_OœØsÂôêL4L}/tgŒOt|'Iî9{uæ ¹7ô}Ôo.-£8†]·Û<ôQê¦ÍÃíEaÚlG~íùî!òR7Hš7LÝýý0I½½£fÛM\7D=üü ¥±&^êEaÓ†£'n¼Öî5½°ëõ¢æê"jGq×³–gLãÂmßëì_õ°ë»;Gag×uxƒäØôp×Kœ¶ïv¯Ž¼ä›¤Qì…½ëNêžÜ05¼ÞõžðSY¡ž3h.ÏÂM=p÷b7éopŽ4/â•¹HWƒÍ×¥ÅEt¡ü*hÍ:¡8©ÛL^8‹ÖÐììñãc´`Ó{éEHw¾»—Ú?>¨<ÌÆzµ  òMÌl<ÿøìäÇaµÏN~ŠvOÿ-DðÉO=Ô€U[_ŒÛïÃ+ƒÃG¬#&ãb6‚ÀízÃrß)éûè{!Å]£àìägêô#”F§Ÿ†ô®öÙ³Ï0u÷=âÿÎN~ ´?DoâÿÏN~×Á·{vC^_Àm&+»»¶â8:xàõú©¸9Š¡S°‚§€lÍ&Ý‹dƒ’o›Küv%¿îEq0c¤šõÊ›6þÊp_‰²)[ ÿ1&f¿Ðaf€’Óq›GÍÄsÌ8ø¹ŒG-c&E•ðóìõW+´“s;ßéì[î
î{8¸qÇI\˜±Î>ÞwÍz—ïú¥ÖªÕ¾ßé{®ßÝòÝX½ŒÅÆ7/\Û§ÀÞ9;ùm÷‡Gg'Q"ÿ‰‡‚ÓÏì1Ô¸{½;qü×èîÖßÎ™i²¿jžTÉ~\Z,mÈUqC"ßuº0™±ë;‡n×fÒnžüo¼
g'Ÿ¡øôS”D§OS~¿â]ù²7?ÁÓðß‘âmJ·9þ€Ílý˜ŽÎéÓ"›ßök´ž¤qö6îÞ\_`¿â¶pÛýâ«­¿-¾k¼úêâ¹^Cën€[\j-a~vúi„nþù·~Š»ÜíŸ=ûMÀÍ·òžõÜÆ~9`LéÙ³Ï1U`îCÙuð 0‡ú¼ƒü?ÿvH¦à7-óÒ™Y“éûQàõb˜ÄNê¤I«ï$†!zóMÔ¨ºà]}ÐÇoç^äPífÄSRÆðþ¢d”`žÅ~s;gµ½eÃÈ -Ï06º6´1óà?r3Ýú3·Ïžý)EßÂ¢}gxú«T¤ÆÞÙ³_†(ìÃÊ®YŸs¥	ìÅ^ÁÍNä'Íe{1#kmã~ÿô÷x8 ûd“.ž×PeÄS›cAeb mã›Ø°;¼¸‘ìž~ê¡ý~DÎØÆ0qãIÇCÚ{<÷z§¿Q‚÷[5ÚÃnÏM'keü)ÊÅÔèDÉÄã!mŒ=šÛ@Êx$m?êìO<5¤‘±ÇÂ=N§ãR'ì¸“‹kiüy:ý#êÂéû<´=/tü­©¯ÜÜè`6pxvòòñxÝ¨s?Žp‹	>“'¤ÐÖØ#¼vú4‚ã/BDôRÞ:ÙÈÜ½=¯ã¹açè;ˆâq6C;-µ/u°ŽËŸ&KËpÎå¢2œ—lÙü.–r¨B”g£o"ë¬~ÌXõÂI$÷“]]ýœÛVÕ/Ë4]½C ¨ê×ÕUÅB>\|J7rôâÿ¿ø‹Ô(:Ñ…žžf7wlP—6r¾j°Ò)¨jfórË‘ÍC‰÷]<0¬ÇÛÜ\z•L\z¸´[ Ø³ýæ”†¢¸œ‰€ìo,ÓI¬JV£ÉíH9tuQkÒ]BFîÝþnt×9jì9~âÎ­Jpñ–%Ú
&LÖŽEV;ù[U!²q=>BXþ6jm¼žn¾ÕžlÎ“8+¹RDy½’¾ÓšA7û­†A®œœä(ì J#;îêí¡Æî/:À<0Üóâ 1³"lµñYµ†n1Ó9ÃÓOPröìx£L­²‡|,úbé«¿ÉXQD±‚žÀáŒÕÅL,TÜ®“:m'q[è~³5Ð;ôGˆ‚!
J=¬Œ µÏ;›3ss¶/‡sàx©|{¤ñÐûk»†¬6Ññ+³ÕÊÆ’lú§¸ÍlÎ	ó=†;Ø×Šï×¶¸»÷2äÐ[dßq=¯S”„Q®/ì:í$ï òýháxªÝÎþ òÂQ;¶‹®{ŽõÐ7$-²ï¢V|·h„~ÿ.þúokø¹‰·ç^%nzK{¿ô-é÷ìx–ksØ$\§|\…Qèf¬hùÐWÕ¬í›®ƒŸQ­!»i×K}×ÂÃ€Êö
jÏô9{¦FpX¿éÁô‰öÇK˜!_ªe¼Ý?ýƒ‡}b ô=`YÄt¾©¤Dî5SqÝM:±7 i¯"NË‹ƒ#­M„òÍçŸÀÇlóäG!Úç_@iO<;ù>XÞžÑ.íŸ>õÀNÿã~îá1ÿ(XSÛÔ*š—Ë~î4Šý˜Ê}·“ºÝ‚Â7[©`²w‚þ5ºŽgmbŽ¶ç¾Å“6ªO°sóhöæÍµ XKÔí.Ü½»p„¯Ù9ð.µZ­Y5çe
•aå¹UUq"óv‘?Xv<€Ë¡×t‚6Þ©¹2Ûºôc°5J\ ä'½ã2çžP—¥_[q°#êv(ñì‚¬ÞóÀ¾DwÀ&Œ•øï1ymøGaO9ÿšd}°¡’^xíibÏ?9ý¿Ô8]8Éˆž²]?þn¢"ÝÐÛ'¢¦lè¢…¶‰)ž“gXÚWÜ`žòçßž|ÖA=´Nú±È3$;™úø~²Óáßo]oiT9QIÏffã[Ã#œþAä]ð'ìƒtêŒ¸ëCŸoÕÇl¶‰å˜"¿yaâu]øZ6µî{Òíà&>‡ašl¶qô÷ø–}ï{hñ]‡ž>×ðã“¶iÿ´iÎ>:•Ö©	¶½Í‘`¾O¿Ðõ²¾0ôUŒC-±#åí(‚½ÈÖpI€{R½·YLF®9÷úøfÊš¥IìÈ´L¾wŽõpxóìä—G@Éÿl2á"Rí·2HÉÉ Ñ†Ç®]AÜ9'Sò8sÎrS58l^R©{jâ”ÅOˆ¶P8Þà˜û x!IQ@Pž}úeÊ4J|r[>«·d7(DëLž¾Æ¶m}¹š=i'TWoS¢&ý¯EjáDjÞ3EÎÐ{”QîŸþñeØš×¿ÉÌÔìr2èA]‘ÊR5‹0¤…Þzx[þ¾ÖÜ|§,ÀSÿÙÁ}Òº;<ýÒQYz_¼
´Þo>¼¸J¼ÙÀðö|LÜGMg˜F\èÖ^.¢AŒ	±3Ä¤4ñ #ßo;±^ì´àº£Çò8 z1v¯3Œ“(n’3 6‰ï»0z#;!î ‹3†ƒY¨h¸ž^á†‹;"?
{á´•@ œ°ƒ¡bÎŒŒ@!âÍöøÃLlGöpèûÊO³çeR9D’2¬dÅúØºu£™Háÿ*b—èœä¬+	Ñ3g6v93by,5¸‹â[x6ôÚmô¨³‚¦N=_3·+¿œ!=ýwÀÃß!„ƒ9ÊÉ1SLàèù}«4MágøËì(tŽtÊ y“NµÞ|³B	ÍUÌùWKÖíl’ð[upmX²NÄ1±ÙÜì
'"ÁYB®SÌuªŸÞrXÖ©õ–òíýæàå›6øíËëªbMÉÃ‹³É¡þVù×«"¶ËõD%¥G¨ð:¶isL0ã#gØõRL`‰²õÖžçã9j€‡¹üÄ:•¤	GùÕ«W1g¥2Ú,¨Y²ïÃžî8þì	é‚[îëë7îÜØ½ñáÖ;y’¯¯½wç¶ôû[wï¿û`ý»;Ò[ÜØÙ}÷Áüž9µk«•`^á6çÑÒªæ®ÀäS¢§Pmí»GWG0V¯«ó1Lñh•ò”MÜ?™':”Wþ µ?jñitKÓ9µÓ¶Ú\fht¸O/	`ýšƒ·©@MrîÅ+Gëº`ãÝÓmm +ˆÃíA—ðÇ[”jÆh¼¼ñinàÆŽÏu’}`ßÑl›§érpÀ¬±L¼6Á‘a¶>Àš'§Ààµ¼1{$EèûCÙý’)»ÎÉhD<M|ÛÆQ\ë„º,¨°|žV½õsfcÄùà­rgBæCÇ6¥eXÍ8aç6ÛÑ`ÆBØ©ãùÙ»¡ï™i™™—k†³Awœ5;QéGIè’~”n¶|7ì¥}øvöÞÂÖìq!CÛÎ¾1ôiTí×.*¼¢§àQ¥RTÅ¸|b2îÁÎÀìOÈ9„ ©£æ"~^¶±ØéÙ¥6±ô•èMÜ.ÛxþÊ"žÛ'Bl&¶XÌ†9PÇŠÐAImØÉç£Â ¤…‘ýæâôtÛHÅt*æs2×Á¥"\s0eGBÅÔjëE(1Â©:^  òjä @f#ö{¥X0;(KHmYp„C¨#Æt^¶"oÇQ JZCº½Æ°%IÜ:–º^O¸åEQ Ê	¤šIyËÙ/‚1>¥s6pb0áó{ß˜–V
3çý(­–.w]Ó0D!èfe³äßKÐ³_+ÜL¦RK‹Êu{Ùžë®;`nþ<†‹gË÷íÜ;â_KMË³Ã»»'µÎv‰™éUŒ›Ú=ý"ì£ðùGB`Muãb¦ÂÂ,Æ.oE·œ#¹™œq7ãíGÔÎK¢,H^öDŸÑóON?£ààA,äažä·ÎóÞ²ù<–`=i=iÑŽ!|ÄAþé30Çg'ÿ‡z¦^_‹Y*'H2$UQK|´´9lI#qçõ•ó,uâ8˜Üâb“-6zSq'öOÿ“e×:îe—$À¼‰Þ‡à …Ûý!öý®c~÷Â|þ	Ù˜ÒÍgtˆî:ñ¾!Ì†@ŠÉÜü¼<
ox÷È	µ!9¯E°ŒpÞdòí¹Á‚ÜÛXŠ¹Îbê_¡`Ø~çÛ"H”…¿ùz¹\Ç‚6ž¥û4ìmÓŒÚÒm†µbˆT÷Ž-½p™¬¹—´	ñº@Sb  ^v!‡oÆv§+¯hâKªá©,â¸éGxo’âaæù1§_Êsd„ñç#O¹ÑUßl…xŽsÔSDûTd­‹Ã»hœCDÉx°‚ÄE6lËó.Á‘;©÷„ï–¥M	]o|À/‡‰É(l;Sâ-&e2ÆMXq•Ò_³2û¯+;!`29+¿þ[ò‘¨ÏŸ‰@ŒƒÀ¯/‰{\úû<IÆæ!ÐRñf¦p\õÝ_s“ÌãúB¹Š§È™Df8†Þê&ÌuwÌAPO!ú&Ý¬Ãµ¾š\FIñçÉjJ¿iíå
-X}žëÐ†p;6LGyó?ž³}öì÷n¢k§ßw•"C^¶4ClvÃÙ={ö¯»dÌ%Cj+zuå¡¯´`S¥÷ón²>«ñkùRxÏ}7¼$Ák™ »NèôÜ 6ø®ÓFÙf—r& Ï…?“wÑÔŒ,ïYÈ‘Ó¼pgØ†.HÜ÷Ül€"õ‹Ðô–ß[+þ¼HˆèJˆ2ÿ©¢=Lð3ñ=òKs/Ž‚f;J!ecu‡ÔC¬
„	¼ãî¥hà„®¿†D˜Ç€a\:gä œA0,V]jI€	ËÀoƒ_¤	ñ>øÝr7£šg¡ô½n×­óšûª×ìÅN×Ã«ØL£fŒÈäN‹E„?ãï»çÉcL^n{ÁÒÖìböT…óS ãž:n­øN	’î8Ñ›ê !3SÃõ}Çƒ”åß£ÆèÝ6EZûîQÒxðîÞÛº{cg.ÕQE¿C{¢°Ó¹3'7²MS¯ždc¤Ž:Hÿ)¤ù=.h6VG||ß?¾f`ªƒ>àqÑ‘ZœkôFÃùÏ›È˜Ç2AÅÂÆàPKKÙÄãfbÏçâÊc¼Io»Gó~¹ã´]ÿ‘=³s¼©½$‹„FWQ&õÃž/˜(áh¬Ðm°ï$;Î·Kä½¢Orùf%­$
ÜF<€!ÆƒÜÁw¢…ó‰Ýt‡†ˆ¾õ¶v	§g}š"VÓ£p6Ò¬	ÍIm.Nl#{_Sç\v'4Ç2ÎóX²€tñv9sÖÐº2O€$ÌÌÇÀÑ•ñ^„6ÑŒ!ƒà’*ƒ ròCÆ\i _kyg“d˜ˆÀ°¨uÃø±|õ‘ED!ËlÂ…%²‘‚Š‹§úÂ~½™y~ýðâ”ÁÇ¹&’ŽƒOÒ‡K­Å¥G30·¾Œyôœ]h{Î¸ZÉÀ÷ÒÆ,jÌÎ=\|dInˆ(g¢0âCyù4,o 88X\‡ˆ]MNVÎC¦Dn•ÆòNÆjŠSÈ®Q‰CÛfW³Aft¹—s˜ìË¥8ýbñ©ã‡ˆh>
ËPt›¤!ÛÜ6ÓÀc±´*VÜ˜ðcŠž/Ä'çÖ¨,²`æ‹JÛWÇ[á/º‡—–sU¢GŠe”¤ÅéL…c®Ø Zn|n¤ç-‘Z—[ ·.gQ÷”Oƒ‘`óL^ ÁÚð	›mg¾i}¡mÄÖÓH0Çš0Nk <¥æFëo0Õá:0­D‹þÞ‹bï»xÂÛGhÏu°<å&“jw¼Z·òâÔ:¦È1µŽ#éIÔºTŸlMräâ—CAwüGð»¾öæÎZýÐ@gýQ7Ÿ¾þˆ;¿ƒ>| õ#©}‘öYèÐÆpëû}ˆQc
—$·¨04ƒÕKˆzÏC¹¦òÈâ¶ÒEí´Q>JµŠ) Aü»§_túBˆ vÂg¿ê°ÀU€Ò'è¨)©õÃ›;­5R#ó’Š„ bgP¥’½•Á¦XÍJ`9Ž¯þ¶’~eÊ3lÜ÷±Á¶/bFrd‹.ØÐ…cè#~ ¼NÈbÚ6[Þb…ñF/G—S›×o¼½õÞÝïßxp÷ÖÎÎ­wï)GvY€â¦‘Êø°æ™çŸ~€uO4f:{sáuZèìÙ¿†h– ûuÎž}>¤±®³ÌøÂŒñÄ×PT…ycÆ8ý	n@å•'	BKÛMÿÌ…¢r5}RÊ.ÕŒÅÀYeuÕf‚˜qýæ
þÿ þ'.œ»ü¼kYší×j»Zî?>ìkø´áU¿NåÂyX±~¶–Ü=£¬HNÍ¢TÖBV•éZK«¶éZ&¡+]ï…	Q»ˆÃ21[*@p×‡è®.
	ŠÆ×H‹Ìê±*l€aa”Â›Fne?,™ìZÊ*!&Cž\ÖŠ²ÍD—˜ÆíÎsËKƒ‹†FëÔ§¢‘›ÕSVšì½'šC¢Ám{qÇw—E1^ànÆ†Ê1\”öÖg¾1cÒýlfIŸÔkâ¯HÉ]— y÷bhm—¥hmÖÈlH1—ÚœÎJ2ÐÊ” ŒÇÔQH¥3e¥BÚ	1qdÉÞ&Ò#ÊÉ±0÷k'Ëˆah2&0üøÄƒ{æž(
 \€¶1!h½½1S¦ë™õ…ö‚t¯Þé—â‡úÌcÂÔ)Å –_Ø{ÃF³Ñ’¹®Ø‹
næ²æ»E?|çÁ»ïÝß¡î(â#˜§®‚[ÝC!ºŽÈXíLÐUú{‹PiÔƒF<ð=IÚ>¿"n­¼Ý–‹wÌQcÚrËvË;þ°ë&ý9«>À‰%ë„8·,ú€÷F1P}—ã¡"ÕnÔëùî;¿éªeÐŠØ¨(¿Q?`®‘Çª-§Ûb÷	Œ~føadß(f•Ÿ9³.\?qíÞcêoñŸÛ¡{€vÜ´¿Ãçóÿ’¿Ì£9³vfP‡þZ_¹ÉÊKÊö=qƒf›õ¸jê«VÄå­z,)4Ó—V$¾²QŒîD~'cÈc¢9.	
sþ]ïèlCà•`Ûc¿t¤ïv«ª¢Ù¢eõ<³+À+i·€‹ÎAjYŠšï_¬f^
“âåŠIqfƒÒJ‹’ÁëÕ¿h5O¶%êì¼÷ôªã—§WIåø¥Uá¶“¢Ts¡·ñŸæî1âkÏÍ6/`·È#î Äzäµ³“Î¬E(qìl—?EaÿôKZ×À(YÃeãÉîÔaKr÷™"â‚îZ¹Ü¬ÎÖÎMKY¬hÀ¯5
meA3Å¹¯9ã¡m‰El›R%i¿RáÜú Ï.8ÐóAÖ¨³UóxÞGo\½Šò×´-Ãe<[«8c³‘ØØ>ÙH¬î3¶Ùeyêf—	îS¼È1½á±ýs%~'R–ÝûÃUÛë]üyHãUi´¼Ú¶–”ÊjÔ÷˜ù­üáÙUìÜIâ“–3DÓ%!©v,RqÉ¢’„`¤\4±;æà²«‰l¸$8y‹\Šm5XY[5éªW‘ÑÐyTWAB‘¼yVE¡ˆ;ËM²öKmoQ\£âEŒõ£-Š«N…å1n—ÇÉÕ£Ã1Bå|×é2ñ¼Hêp¹r„Ü[‹«!GùºñoÇv~åƒW¡‚u?q˜¨¾à¼Î¼ÕtXtéÔEÝøº>¾nI]gcÚ·Ž®ãÆT‡’jÜl%\¨Ã|jöic¼ÖH7³õK¬Ë)ËÇéS´3M.Nùªææ°6fÕo»˜'u “ÙÞÏølÜáÊE¹cåMlìöÝuOÿÃ«Úª!"ìAñ‰Ÿ{¢]ûÜìãQ²uÔ«rE	‚yyqÎ`?ï–GÒWØn
Yõ"âQôýoïB
YmœvcQMöÃÍk*àÛnlíÞ @Ý]wÏú)AVJ\¬]vLõu‘Æ§å=vØ3>ìáï¥bfÞ²ÆÚ–h¤¡6fBæub›dÄë%íŸþü™G†¯`9{,À!©¯j n6ˆ¢x†õ	i2_GI–ÅTÞº¾Æp¹£Î-¼Ý¾Gÿ2Ôƒn©€­YýµÞ‹Ë À³÷/ª¹@*Š¨wTlÈ…”»j‰«ÖÎXõ7;ïÞkaÑKCXyidÐæ/P²0Þ¢Â¬¦Ç«ö;l‡EsÊAy	Èì3åm€ÙÀrI¸…L@‚žyú¥¦ø’ùm^†¨d–Œd­Á²Ähé(«¨Å¥N•ŠNc™D»=,OaIÝÆ<rHRy.ŠeKe±R¶ôhÆXê€¬ó{Öæ·I©99) K%ä„¥¯..\á#Èéßâ¶&7.—¼_j/D˜¼SÔ VÓKº™Ûv>(¹?«:WË4Þ>;í˜çl¼A7û-Ÿ!ƒ5hýšëû lT[.f (¼Zjè å.•¹½J~~ÂƒÎ®ÒHÕE!”L}—UœT^èVc©þÐ9˜¼Xò”ÎÊUöÆQÂ2%Ô5È¨©J7$Û„ÇTžQ2GµP¢vj¤²D—K(Ñ™	C1ˆm|00¬¹PW˜i¨d%}O›D±¤}7ÐÐ~™—L‰í':YðØ9;ù¥CÏ'Ð³BdQrzùÇ×TÕ<äWòq$Ÿ¯Cø‡9’ÆCym1g0ç*y˜ ùD…7›K^ýæ ú‹„YfÉQ@¡§P‘ô†Äõ÷fÆä÷rÊÀ¥Ó~ã¨m¶’nÓ(n
øå<‰H–IQ(Y¾rØ–mb™›šL…ê\x5¥bUS°–­p5òµU¦_©Ó®dæËc";äª¡äl!Ì­^uX}ÛÁúU*;ªì€4Ôg•:Åk¹FŽ×ÌÆó3Äoç`|šå)lH*vaJ~RÔ°¢åÀ„AtY‘J(sš³¿NŸ~Ð¥¢zƒSvØ&j4HéQ¢ªú~{XÇÄìmgØ¼4óŒnu»´~Ê±½u±n¨‚€å³B±|T„§0-¹–ø|’N¯–yªux4Vøë9.iUÙ'ÍåeºAŽ"ÈàtAùÂ÷á;µm§r“ÆdHoÞ½^Od U“œ ‡w†ÉqÔ2qŸ>Í%½5‰õE†‹xº}<en|5™Éqƒ2_…©e5XUq”{fØŽÍ€¥ï:ƒ‡•qÚ¤S*:Ñø¡HÿÔ	5³ÑÈ´ö0'mH˜AVÿ«2¢¹Í»;êºçV÷qÐ8£ðØª‚´u~E…"ôÙaéR
Z7î	IòÀAóáEš)€¹þãûƒ@>¼²úäà‘±èwùðÄFgÿŸõƒ&‘'Ñ „	ôÝæR¾ñÚ5‹›Æ.&Àš3.ÇŽëÄOË¥è´“Èb‘"éÀN˜ßšV"Äà°áÅ'ç½E¬äú­p0L„/ð…](“Ñ@«Õ2{ïùÉõ›—AÆ5?Ä˜+£|:%f“`”#e6ÜLœ¿Ï7Ñp[©ãã¯E:°°2Fám÷èztæmº­/ nvàôˆzÐ06cJÇ0í@ótO§Î˜‰aÈYá6ÁÐ&U-gçZit':pãm|ˆ6æŠPÀ†°ZÒ›55¦Y·àâØ…fqŠ[>¨±G˜D,Æù9cLn…÷ÝØ‹º­¾“4€Z8¹kD»±5¸…0êzÇ[FÉðÇx±Ñfˆ+†…e#JºÑš– AQ|u„9þàÒ@å•ÆQ+äÁ2oœ`­‘Œ”,‘ƒòá‰®Ë "7ÓÁêS»mžeÆeuÁ@È6Ë=.Ô„Scdt	HÖ§_ZØä¤¯f‹1”]Ö‘yu¦Š[ü¼å"qIÐ¯í­æ/LËLŠ²‡zóS#Ç>©`¡àAæûÍé9ú-l# N¤ì6CEv›ÊÀª©¤¥R0­‘yŒÜW€3Mõ”ÖWÐª¦`»NÜyøôv7[€.ýó^ªîIaÜÀ#ÃMÊêÏÊ"z
öm®ßÃo™”l”yqhRbM˜’|Fô´«?4àV:ÿ©Ül@‹Tl|›!‚Š?@ü*ùÁôÃK3ýÚQïsÎ4AÒÐß9ÐÕ\ùI˜Sò”-¿òv"›9K%Â/eký sˆ6Ñã¤oq ßÜš¤4qåÏ€´éšŠ÷ÎÑ}žfgçB¥—ÍjÇX­—¿°+à<µû¯µuEWãjëd[ž·¦L¢¦ïæÏ­£Óo© ÖÐH­ôb‘äÚ9|Š›ÙÉøÍY)ûi=eNþ]zæ5*²Î-¢¯å|²|ðc^	­¥4±«ÚW&WQ+¯÷]·8é(NPõ^™lRžÆóµR¤¼•"}AV
£>ë†Èb£472äikàÎ®G=µÔú	”úB6.×†®Âo:%Êqq‘wâ‹ç¥´Zªô_+¬/Ra¦’y/Oœˆ¡œ€E:žÉ!Z_x¢²ŒŽ—Ä˜‹œ@³|z¤M=Ty@ vÒ	?ŒazÁÀ'•wÜ˜¨•ºAb›…‰OW$ukiE4 Ëµ2”aá2)6†ø¬]ƒ»´°ŒT@ø ˆ/#)Da\¥8›þÙ³Ï±d~vòk€{ý1JþüÔF³W^¤d38Tíç^á­ª|ÏÛg'_Ò¨=Rµ¾±KbdT¬±^´C›ÜÅ£íËâ®q_¿0M?‹ž›–Æ¿/Î_pú)=T3üÜçŸd¡HZz<õw”Mî»$Z(iÐ”°hZ¤„•?üå3¹ôÇ}R%Q£<B§é½MÊîÌ×¥]|ÕáLh –ÈÄ÷ï=ÿxîeœÁw­=l…Ý´xþçò2—sTšÛ<wÍ|rï‘¬{Cp«}ÛKûÛQ8Iƒ2¸­ b¡u0œÓÐ:Ú™TúE#gˆææt|¤lœ¯y4«(¤=ÿD¯Cy4B™†‡^Bé 7ÑMš”Œ®9aˆù¾ªÃÈeOÒßŽbº‹!HS#ÅTRÚº\aµvCæn]¸,Çõ,gÁ B9ËÞµHVhÈc!»Ñ à2ª[>Nx «èT'{FÝJžG“M§!‘ÆâYÏÈ¤l6µH÷›Za"«ÈD1#‡lD<?±SÞWräö Èr3|4X™îqÁÈÂ5Å‹ÇLY¸Öšy¸V0wrw!v+âbÀkäï$†Ì	g‰Qñ!¡§’²Ñ%;t…F³K3¥Ü~{ÇnØ9j¨9LËa¼Úb®¦WË”†|i±V&Pqe1Íšë¢)^–wVáÌYnø_þáÔU§¿®2¡#¢èhPY4]òzŒíB¬öSðÈÊŒ5Ï%*ŸµÉDx3­Lbš”§i’¿˜v^VÍ–;ç!D¥3š±ì[s•Jíÿ—ýU$ÿk'Ç`ˆ4+Ò‚ì©ãù¹œqGWÑ—´Y[Ê'OIw«ŠØÆÈ¥dÝlè E"–ým<Eø•¼˜f(p÷gXÊè{bnM·ŸA(Åé/Žt‡‡aoÔJ(øûÅËÜ÷*ŠžL
Ê“¿p³Pú(û¥À›ËÓÇL´®#q«Ù‡ß×Í#¯{¸†B¢XX²à/pwÒ]E¤­*\„‘¿p¥Fô€Æ¦×Êƒª7@‡&Ý—Z{4³wI~)!ÆY“'ÀÚ#V åx%`h¹+P9rÉ<Oß94V..Ž
­fM6è0²çM…°jzäŒ'ûrÌÒµøØ(æo[ÿ<¡©é¸SÄµ-©Rv@l€„J¿u}Ö±¯S‰|ÕÕ€z«œÀh={lxŸ7Þ¹µ³{ãùáR2‹ò_³9ßàŸ{ïþõ­Ýî¾»»u‡<»ÍIâ¡svò“°G`ƒ¶Ø Ûù¬ãÐ¬ƒ+ƒ ,ÓÑ%ŽèÃ(¥ÊWÍÔ²Y{ Bk DŽšGì”±íÅÞy+°!6©ºÑ÷ö2<e¬¹²Œyn¦XjM1âUÖ½Ú*~dÄ5¸#üÔH ¥AšÙÃ½V†=&n¹™ö±ÐÔë×ØñÛÿïWkŠÙÉGoÏÙl‰ÚªEKª´ºÍG ‡µ4 ´PS [¢ã¢kÑa-íD¨FÄ&
»ˆ¡"‘¡ š
8Ô(Hô‡‘“Ù+î[…Èc¶tˆûBÅ2ŒT-Â§YG8éÍhf;»/?©3 [ðßºæŸÛXg£ÎÉâ$œçˆ² ¦XÞ©p`ÎeXñÃÏJoÏ7Õúi¡ÌlÜ«ÌMÉâX€ÉQÀ§§õ°*ê	3 @ü)/>uúiØGO<ˆü €ƒÅ ¥‡(¨²ê+ËÊnŸ×þRU¡Jï,à«2g{«8øý)v§Ú×¡ÖŒÕ2…²#êÛJØûYîp<M
U“8ù!ev/bM®ºªÅ.Å.iyø‡K­ÅåGˆ"¸±Ï®¬šÁÖ	ï¤u•T®G)©ÑWH‹M:B+Ð0zaÉüï½ƒnŸþÝ{çôï¡ÓïoßT«¾òß´è¤FäIå %»˜ôÞý£ú4¥®„´R-š«*‘+m®HëÞä¶zz‰ÄVètrß&²S7ˆ±ú™O×0FÉ³I)‹Üïã¿Ç¢5¾
¢„H‰4
†~êÑÕä­Å*ŒCÒX«ô2çŠÀŸYYRÛ¬Ïéeùc¨Yï¯Td Ñ16ýŠ÷ë×Ô!®8Ê“¹ÎÖuÀ»EÚ‚Ø©Ÿó‡tCµÔš Ýõ…þŠfÖj)¿d÷)½ÔÁffã³“Ï<,ó­¡¢h:HC	òÈMßr/{ú_ø+,^ý4ÅÑ³NK#Kèo­Qž@×mÓðøEïÂìS¼:ºÃ?E×ªÀ¹S?§©T.z¯Æ:Ç¤ì!äoñ™“Ê?§3Æ?ÔfËèX	,Xˆ˜Mì6Ù %Eº²b·;ì¸†ÓéÌ¸uà¿Ð7ÉŸÌ$1çæt¡íë[1ÖP+hÂŠé[ñO~TK€|Eq#åðv¡»†!ï«@{bUF=W$M<ˆ:[Þ“ŠqäË1‘/õ!¦œƒË}qÓ$ò—Ñ1ê{á]£Â,)ÄUN8”ƒæ2~+ËFØmZ2ãšÒ“»®EÝ#m p…×ˆ… ¡ÂÙh¹zløßà–XG¢ZueoímÛõ}§…ðá°’UÌa*Ì³”·3^%€õ“Å¦°IÈSò¿Ï¥óRsp¯°°•iôIíõšÂž¬ãÒYæñó‰GBû0wMÒRqåÊf¯%úðåì¢(Á^G«ÄWI2‹Ý o‡»â¶kp[ÇÊÊ-§ˆ‹¢ž™c\ç}ÂÌõ±RtÐ¼lÎß¶òô|P?‡=i0.÷Y’+5åY(»e:ºpÕâ§)¥•P>ŸÑI2;¢€ÔçÁ:û<ÂüU(}Wë!e~æé÷p§T±P¨äþ²Z   oÐ–¤:Èžã'ee¢
Â/xL‚5
çH«QuAe93ÛW–¡´ŸÄZQfE½e€•NO©´®Ë´PfÕQ´
ÀHÒ+Ë×µœ¿ß§û¬é& o_Â?RøÑö‡1¼¯
ŽY‘B01T:ÿvXÍ¢9‚"S5(djP®<¯/píj{Öa1óˆA±ígD˜,TÃþ	¦}¥C„à7_Pš.r  ¬Ì™cû,À¼@ÔãÓÜ¯‘zBãmðft‰‹ÂSD4dóe¨R¦‡Æ7R8Ð´¡¤œl
•äT5ÎæË ZË!}LÂXÏMÒ(hâ—|¿í¨ó5"-	¿3Èµú8/ÞÒk£ÊšÁÌXŒãUõÔº:«©i<¡ˆ½ÕÍÏLž1†×8'@‹OÍmæ#âæ8+C^x}$ŠÜ4Ôœh•H‹'qëM#ªE¶DRÑ:[1H×çæ§T‹I†‘BÈYÉÈ.s¦,g»£¼!„Ýy:û¸4nORÉ¦–^,ûoìæžiRK¸£èZSª º|“ú&MÈ“,3ÀÕcÝÖîŽR1€£'BÕR‹ýÚÃÊØŒ´ f;ýv´O Ž–gÝX°h|Æ¥eI;Z¤=_yM—‘@Ïi	%ÙJÿg˜Yz§8Ç•„­qgUÿ¥¼ž^á¤D1UWË30ð
ú‰Žk*E&…|aX$`€WÖt[ÂŠä\äjUFš"/æØk­JyÜÉŠM*ô"ªl½Ei©VVøÍFV5	Ö´R¦ü ³\–Í’²êcU«5 Jê¤‚—PPÓÍ³“_¡öÙÉ?KÕJµ¹Nk}µôSƒ©¨¢XÎéAnáÖ<¨¡†–E.ž%MSˆbZiÑ8£•%7ä{IÚÒÀ6, [{èÀENì¢0J‘Ò6PuÝyø&t±ˆœ‚!?D1^ÿ9Ý.‘û`,@A(ícZb£RG-âÞð ÇÃ¢bp„TwÈ¡0öÐîÜK¡ò&Ó˜géçÇ
l‹iD6/Ó Û`€>­?,|KÈ-W(ì9GµöHf»¡ì¤bà\,œe»/ýr£~!<¬å«jÞå3†uµþ¼J]e"&X~eîì»¸H11‚5y}/}D«ß+"ZñïcÚRê_Y;hÎË-œÜËB~*/3CG•¡ƒ:i@1jrÊÔ’}SdêF§®ùW#ÈM+±rhŠ¸ðI>'aàQQS60»F±3À!›½M€wIÏ,^i]g¡û¿¥B¢«€ëDMùÌªÅ‘Fw³*…ä{HÔ#<¦¤æ=&Ÿ^PµxüXŸ@cÈÐ› §Oú•©Ð£µQ±;*s“âc‚#á‡¨[Ð£˜Aµx	žœvö)áÙÆ3üy
ŸÑ4x”L8­s©™r ŒÇ=p±HK5·ÏÏ=Æ´ò0~ÐÞ
 šRë‘úòÿÙÒBæ(Þ>õqt(ÌƒXNUç×PïR»”üß˜å¬äì#,—nu±LJÚÉV§Ú	Þ¯su0§êææ6&uvm"¢óîm"r¾š_<$a†‡¼`²þ6>U-^Šÿ¤m²ùmèï_Ç”ºtzc1…qÅNÒ_Vái€{•–5>ýÒQ¯Ê1MF¢Ô®gr†¸]„B­e5§SÀ5­%-"P.gù{Y‘¢Îw WiÝéšoù¾Å²#Ôõ×èfð¤ùÞº8ÉlÇ]˜ç^9ßQE9Ÿ€:ôùcÒ'J2Fâb®ëÄG3rŒâÞÉE
Y™¸·ÄJß-­UàvpÇQ±¥Šs|ze£‘üÙÌ¥’ƒyÔ¦Ö“a€¾‰2ó© ;_œ£žÅ™¤Gj:Ù!L‡ê˜ˆ«ŒpÍ‘#J²ZH.KÕÍVr;[$âoÌx‚V
Õ¸°!0TA"wÌ!
±©q-KûQ¼A>
¨êäžRnÉûK‹˜,ñÎÑ/†ðÜ'¬Q¼t($RëÝ%¾á¶×^Az^é’ïè©RzT>(«Õò@ÞŠ}á–:ðYx­ILñÀ!æ2Þ ÂN¾ÌØu˜$Š›ƒÈ£>fÈŠSÁ¨îm=q<Ÿ„	oI#NSNV©$36^EZÅÒ¥æXa­GT©!¡-Aå«xŒŠn¢Çù—ÿ™S\€f½o5‘TÅæŽ!ê1ÿ¸æV8t¤T²K——¤“ªØLÑšÁ*„Tõ-ÓðNT˜â·†XÌA3`”ÍŒÀ$tÑZ0’;a”ö1ÓÏ½$wÞªAsuf
¹v•åJ…‡ŽQ9ÉB.°Ž©”Ü*–" gá¿†ãr¦7ÁÜR6PK7
ã|Çƒnˆùhª2‡êy¤U>pb†VöË»tŒ¬âQŠyívç tâåõ+¬ 5FÒuQæ¨­/´5ò®
È4X!“«¼´UtJ-z|ÇWCšx›À¢ßvÂ¶(L*QÔ?îÙLN|àí¼‚G>¢±â—ViDaQcèÏ‹âÄtbå%×‹âæZ£¢×­!.Öà†“ýá…R]îGˆ/Ïg•»µŠªéå4!„“"¬q³]¿ë´“	öyî´Ê@¦¥ÕPpöExð®l?K°Õ6uBY\¶x\ÍÌk¥RÙÀ93¶–>7ÑLÎnKîŽêÛXC3%{=—U€<×·¼©©œÛ÷Êv:Ñ@aÏï|ñ¤Ö‰]<WÝ×—Ü²¨IrY‘W›âNÿà1Œ†âXÐ6¬t»õ!Vé`J¢xîu£Åá ûzÓbö5i±€rå‰QÀ…«C“ï‘©yýhRM^_‚$£¯InàÆŽß}åéñùÇg'?Íª›¤@œuè¢³ïºª}2’4eK¾Ñ–9ÀGpÇ<•
;™oY™Ê@Ñ‚îÚAsUžûGž¯6×è¬bÍsuE*NëéË‘qÅÈ”÷TkŸgZÚ<Åôæ‹2¢0S[]¢F›jœ›Ôçº5Î…ù'™À¤4;Öt©û­¦ýBð77qŽTa+©Ü\i¶eþ=la9{T´’­VpšT3¯$ÉRèc$Ø™a¨ã¦9ØzÍêa•JÕÙ€ïëë³I1
<qe¯ÚôŠÆ<õD_¥÷Ô#Ja×þ†”ë×hMq
/Ü¢Ò§I¡ˆg6>pƒspÊ‘aëy¾Ä]Ä3òs-s“—øÐxoM`À›ÔH7ZZ<ÞXZ4[­J-¯o,¯Ö~l÷¶Z»·²%q*þ&ë/¤Ó¸¼zªü%V"¦ÈÈ"NAÀ¹µ=ßEï{îÁ‚§åÖ»
ì©w„FðF¢Ë/æyl+šø½Ê6è^E‚÷<º$Á'‚ÛXœG•FçhÉÝ¶ÎL=À'¼u½½#tq±…/ù6ñbÐ¼˜ º|‘ÑAƒÆòŠ<<Á+Qùß;Ã6¬Iìa¶MoÃÏAåï¼L
÷g+îDn¼œrP ·ÙráÛMñk|©¬ôÅðŠ¥7º^J+áÑÀ\y$å>ØD/Œª÷sõaØëÉo o%5v9tðYúÊ’<ŸkÍB¬r´kdF©Z¿•ŠÅ¸/ÊM"¨åûx-Ýúd_hwâhÇ€•HbÐNA?Å[L’NZrbv‡”X	î±ˆ±XLC;w*ë´X„ªÑ–^Øñ‡]7iÀ{ÎM•å¥då€Ûyi`€cò¨P1xaiq´Ó
$°f,š°h„UÝ¨e Î©[pU£”rÈ4¢•ó–l«;J€HŒ3È…o—€JÚ<êá÷¶,ÊM±\ç8Ó\ÄÐeng~âÇ™rnŠ!‡¨¸F"°À@@hˆ/¼o¦~jón—%ÃeÆ”ã/ª±¬|¬ëê"-œ ÂÄ†ÁJ•Ð4wÆúì&«]@ÐX¼»e1*M$M:¾"t…¼-ØxÄ2ºÊèÞ…‹–EtáÅ‘¤@$iA$h"¥€ÅÇðB˜tà×ŒnÚÂ_Ó¤"ãÄ·LlaX–é{DVHí^ž$3ËºMÒ¢®äˆZÊ¨–üu¹§'//ji¶b:¶,ót/3ß’ÍømiØàr$ˆ²“L`^‰w£pSXÔp?‡9¤UpíêÚæo1õi,i Dâÿ08Â³2c	Dùèds<ÆŸ#Sö77Ëì“ó›æ/¡PÐé—ƒjU2ñ]-KˆMk	lÊÌê€Á5^ÎYÞƒÁ`ž]ÔpÞé»ývthm[…™¨ÖKÁKŒú€ü_Í`–…‹°6sÿ0TÈæ1©æE¯˜ËLuyáŠÜ.Æ£Ã¨à¯,Æ¥Q7±û:Øjµà÷yÃd(CG/#¬…uïð3s†Á¹½ðÿocÏ¥Ý`Œ÷h
CÐË€lSz¯†VB'[fõz±Þu±0;Ã'ÊòÒcŽ^·P!”KÒR&e”{±–	~R"ÄérÑÁµÚåØJ‰Æ4HN9P£¥b W|ŠÙ*ƒ'ÐÄmú{â„	ô•$#°qÌÙ–öµgúÚ[^
qEªUûl(¥
jÉÕgåà9ÌelÄt Wõœ·¬Ëjñ#¹€Tú”²D–=h%?ðL™”TªVgRºß'Yö$/
ÂÅdZ1ã¨ÖfÖ2Ó–ÆÈÆ3ð~[€’ûP_l¢¢²áéð¿Ìö7)'+mf°…¢S¤‰ý¾ã<ŽÊŽ´ìØ0yär›ÚvÿÏ¿uP|ú³V|Ú’ñ½ÓIb*‹‚åÓžÒÜÒ)&"™.ü3ÄÂâW¯žæWe¾wûd¶{žÃcjM4ÙÅy“¸'§fÁGÃæ·ì£Y8Â×ìÜ”ç{Ä»ÅlÔ·ºëS.®œ[AV.åº·hóÛ”Ïd¨Bö ‘_8W	ÌŸ§–«iÞ<ƒ/ïœËlçpSk)6Z,Ø”U5Ð—v‹\3en?=ŸLg’]œšØ Öè r|S&{µ˜ª2ÂÂ_£a§ßœÐ©™6úá0Ã(K!]S 4™S¸Ñž§®h¾€IZæ¬û‘Ygâœ­³I†R†ì4—Ô¹svòC,·'x3y¶O;ÙæÚÇå¯ ïÉÀá2H=—+¢lxœÛ§~M'[ª†Ëš²á²§n>R:§ïìCÞ%.ÜÍÁ¶eõÃ¥Ü[]`Kä³m¡*Øh'ë;>(›‰ŽÔI*ñói%UÀOú§°oã@³*õÚÒQž‹”QÔ Rùô-‰‹èEÒÁÓ¦hsÙH7Dö˜µ¬›çi··¥Ô1è´•ÚÓhŽöUA÷*Ã™‰±)J	‘‡ƒ#n€y1$ÄH˜¼¤
'¥J ü2’šIÚˆ¢c}­°ê+!t@]N­"‡mOB¶+ï¹Þ¢˜Aš"~‹Bé„ß%(Î†ÿ
²UÐá5 ¿&©þ¾?LÄ./á/ñ³µl”Í9“	#(Iî3·Y3H¥IAç;âÀÚx ’Aÿô¿>Ô?˜õ3¥Ó@$Ž™›§Ÿ€Õ/HöÎO —ôä§È?;ùQ‡AŸPlÒôìä× G
ø{0Ô}ïìÙŸc©Ÿ1+EHw«>åëº›ì§Ñ€…D“â’–Y_,:è®Ñðèáû‚œ+¢Âµ•³mêf_Òî·¼@0?Òìt„þWÑÄµ[b’VU®ùáEbc@]ºo¨ÍFz‰þõ‰œä·¾ë¤ýžGˆ"½s-¯’‰Õ2ÿ=’&½^»!¦¿mÃ_Ãù=±'þ¡¥ËÿÜ½ì–eËõbI
í–YUdwò¥¶ìª«ŸßH U½‰îž~öòÇ"u½üa‘¨ƒöéÓô¢—=££ûeOWÉõ&ÂƒüôˆþõòG·Íc<ð¦þ—=4n]!÷¶fß‰°´÷´c54sÙp®™jíñýt¥Ã_­L4¸¾²ÙhÅË‘×ë••×ye¦Áe:›Ëÿ9Ä.U®éjpÍTÎ.	èXñâD¡`•#Ã'X4¤§ÁeLQÃ4>#ä¤™dø	ÝK“!³5Üv}_HêµVH–*\µÕ$¸¦¢*‘†¦S×Xz\“è:pM=¾®ZšqSˆ3&ƒ²ºÏ¨	Áetªæ§?l‡	ãt;Ë&Ãg·5máo-“1ìâŸòÒóÆ éâ:dO2bËà~5S -³kÈh,Ó7‹@ª(TY÷dWc¼WP"_UÆ_c6-³q,"¡á—ØK·–s9VŽƒ2Ïo•Oó“øpóJ,4È»œI5nú\µ³ýÈ›ØæIÁey`Ž•ùG£Îþ[]¬„Ä•’ÿÎqfÇÉ$ïsn“;Í|@2RMNàª˜ÈÍ}‘x¾“?ÕÌ@òºS_Kgu› Ÿ¼pùcl¹a¬¤þ",°
+ÅUZ‹µRök‚)m¿š¥OÙ_.…ïB Å¤Yû/7o¿þÃ‹Û¨â,:Ÿß2ÖR…Ëœ9ñJïiA§0gÃ°–jåû]æq‚HŒ³„Äƒ.:hîyviPdÖiúàIÏF:—'ÚZ—~øšî¡Z	l6:nh'˜’C´Éˆ¶6n" 5ÙWB"E¼Ë"CÑZ›rB"±õ¼Ye8¾òRUNÿuÄ™	òÐVH6+-eÊF3Ö£—mRÛæÖãÛRÆÉ {=9¸ˆÃ;Ö6íd¦FéfZ/P*´~‘fŽÙš «Þ¹M£ÿoÓà œº‘ÒLöE5‰ú&D½³r³ðVÒÙPxÙÎ˜öË[ªÒàâ´"R»T,˜8¾×™Ù¸–gÛÙ®`ÊR‹ï(âS%e
íT}ë.µ¡×’ÔÒH“¼NÖ÷BŠÃA–æ E\çüréGªŸ:¹Ëñ…$!f;ÔóébÁ–JJ ©Œ}Œ|ãLÙô²dSÒ¼Ç‹ e‘ßHZ°ËE¤W½ŒDÖ-S¬EÔpEØpÕ&n¸j¸EÊb]‡kz™†ÙÅjŸ–rùtÛÑÙ[”åŒuˆ–´b®Èîÿ
‘—6“qª„U31»Ym3rJœAÊ\<MÅ(ñªAS’ÜÆó¥(Sb#½Léôš4¾ˆŒ§}IÝcÐv-ÊVæ?ŽGÙç“Õ˜]YáhÈ…ÊSµì†fM“²ôÈz„]‡¬ÏÅØcq£&V˜K_…^ùå„)–d€6ãÕ†ÈßÁzËÕÑ•ã:ù™ã!Ê›x)oòüÓ/Y¿SIÂdmYz~_‘„LÅh^RZ¦õZnh›í¬)bmˆøg7È¾Ô”ÚaåtÄ/éWÕÄO„¡’Þ“¼5îÈ:Ýê¤CÇGÛø0…œÓRÆé:÷h^šˆ<!¸ç3À¼Ë¥]4Â÷zO\h—f7Gge¼«¤n@Z—ß[+þ\!œ£Ü{µü¾¿	´…›Pš<	Ó,Äµpõ©r|?û5ßúaž‡ äy¸4AWÊb*¹¼Íeh ;]Oz3š1Ú‹£€SÃþ«ÿ>‘8hÉ?ÏY/Š6	v¡vSUÖÑ.¸ƒàãj*¢—Ð·*^—‰t9Ä±v½°÷Þ@äº´ZAÙÑUŽÔæqÃ$í‚PTam°Æòt¤+´R!MBJ©SHê`n‹9ìtË’æUìA962²ënÒ‰=ZLŽ¬·Zö8ƒó#Èþ‹ãç™>°ãXaË|Œ„Uÿ¸ñ³?ÑñrÊù_L1pIA°lÏ)©œ„XüÝ¶/½:¢’ïV·ê¸NK<$è®•qŸuÖÑr{ÙPwœ¶ëËÎL©WnU[P°
ßLZ×öowmºÖwe
éÅjÞu¢Ì¦sÂÐ&*}ÒJ¾—6f›³s¡52µ…ïCëyNîË2«‚%·¿sŠ®–º+uM7B÷ ]Ç«Ð˜›G³à¥hBN”9öðp }Ú÷’æ7Ý‡Õx|a„ßñ¸ya?66aHr0ŠRtwc¯×S>Tƒï°Ìmcùg­“ðÞ{þQ`!.¯/ã³|©%»F——/Î#üÿ*ùÿùÿ-òÿåG$‡òˆÍÊqD;Ím;:Î6ÆQ+vR¨zÐ˜;ÞÀ_dï7[8Œ,<F5Þ<»ù¥mý¥¯ÎÖ?šîÆ?‚m»ÿ+»ñwû§OÃÞ+°õ·âØ9j„Ý!jaYCKËèx5>œG¡´†‡¾‰–æ¸íÛ8Ý(Û×XÆ³8Ë2­ƒ±¹Ds‰àxƒÎÂ¿¾òbè±WC¦ª
É6bÕuÏñ£Šnxuä%Y%p˜.,3ÓoÁqŒÙüÌ¸Þð·4w„Þ™íÖÐõššI¯ŽÒxè#Ð˜ð3ñÆóDT5b‰ë *°®@€ïE¤g.bÞöRñQ¹ÄPfÃ£4É’ûî^Ê—êÅ®àKÜ[•˜Ï.2†ÁUŠ­â¤ë¬azµ×€™ŠI ^D¬/åAXeÙ²Tÿ¶ed—½ù€Y-¬ý	zƒÂ’,™×‘ªáˆû6&7i÷bQ¦ÌÎÌPiÕ6QöŽ¢¡œp¥,Íp°	5^rjÅ]¹6í“~óò®µÒy¹¬ëi†gŠAô93k–e¿Xâ\‡d¬—TS$e
«™H]Tš4ô¨È"¡JSX¿K^Š<ð¿üÃ/ÆlQRÓ¤öàêmîI8Á7k³LÈáƒŠ|‰,¾±Æ²LÓÓq|7WzÑóOjÌoõ¨1ÁÖ·ÚÆŠÖÜ†ö¾Ó¼ù×‰;}ÉéTç0"Ó©1wÎN~éÐtV«U+ìØzFÍBÇñ\Ã8`·.ç¸&¯Ç9­…Õ:«v	J†•B"±ô³(û+«O¡$XccæB2½±$C’
ËN2å™s´qþ7sÄ”ÄíÕ¼„ífá¢³1a°Ùº‡´Þ¡I¤+©8*ñzÙ‹ÑÅ;Ü¡® IÍ¥Û§´ ,n¬'mÏ•Å›\w 4¼bÇ`Q3‚bRà-)›$m"…*£¯’¤˜Ä¤ˆøõ0UÆå,N;‰üaê"Pm±ê”FƒæÒÂ2¢ ÊdÈ,Âª,ÖVÏÈpšDInh¿µ1©jýºÛÆ¶ãvoÌ—Õa!Úi”Š¡.CtG .fñ!aŸ¬0þ³AK/nÃûX5¤‘AJ‹ÃR^ŽXRv…3$ðºfzS˜ì†Æ,|mfþ•®&–¸éµšO+)ÛzüËì25VÑè«ÄMÂ‘Ñ‡#ãIÿQqNQ[^—4
šx‹F¾ßvâ<œcÁÞ³*#Ê¢ìX|ÝÛQ¦øÜ*W@gZtÛÄ fµš…înu;…Å£í•Wb‹Ú&Ál£ˆw¶€l¸Pt?SŠ¼‚\£´±çø‰kÙ˜ø› -ù˜Ù, «%Ÿ£hCDÝ!F%lƒ0X^  Ja€.Ø/GÉlx•!äÙ‡ço¢Y1îFVZ
¸Û2˜>–gí;Z#Ñ¸§
{¬·|×ô&æù=ño~,«ì+áÌ[l­ÎÚÁ4S—D¾5z*„Äö(9v§°ðåõdG™÷Y¶Å¼—zìWòz–J_•Ös\#¥Åó!¬ky…¶ŽÂ/Ñ!þ‡šTÇ6BkÊqû}Y)gÙ‹LmÍÍ©uŒ_ý‹V¶Z%=¼%(ÇKMXGÞ\çú_€Áø•·×€új/	È<Õê±ˆ°*{…@)Ö5‚tc¿ çfÔù_Bde²¸ã#`%é9ìq˜mI€}m›ý{I)kñ ¼ÿe¶ôKu|Z¤Éë8ŸÈ4gwÛ‹;¢yh:SüÂÝ/zò0•ÜêˆÖ¡iÍœ=7ŽÝX¨rèàW×€ýGÊ”É ò
Ò«¤€ôÊÄž£j•EpM’Vlë÷„Hô¬ä{í	—W™*ÆX©Kkj¾,ÝôÌl<ÿ¤>½l‡×úBÛ2çÒifa`©“Ð˜±l7*rÙnÈAvõ	ª-
BÏAs	RüðBj¡)ÚÚ{’AÈ<J—Q_Ì:^©}2~”Í ½H³>Pø¯d;ÄKin¢w7˜ CÉQÄ¥!¦¹¡™ÏDìãn3Só>”Ì
€…QÏÁ8«±ÓìÐŠÌñœ9‚“NÌIo3žSû¥âãjpœ–TÍÆ«baXÑUµEe{AÁ'z|ï…hÏé’Ÿ	`}à_š$÷\.Ë…‰oÅX›ÒÆîÊ¢öÈkO5t6Ì$Ü²V"MnZiiÛÉ€ÆÓ;Ž;H°ã‚¸_&û­ÆŠÅÚ"›ŽMÔ },°O2pMô«¸f×nå¢B|\ó-¢&{c‹Ú/­J"!P¡ÚF&eù¢AÛRØ›”ýO;¬p½¿R5RÉ<ì¾ë€‘Edÿ&A©ÆR|ÅÞ"iÆ WàÔ¶“B
Ö”×	û),d›µÌ$µpêëÈ	ÕCW‡¨Yþ˜Uª£¿üÃ/Ð(cPuàÙá¥¬lûãZ‘g»GÊ•FÏÛ m“TÃ²rÉ¨?ƒSvç:z+»1«nQ¾uFé˜±6Ïg#ÃÏÛÞ¡Ûm,ÍÿËY·‡Å¯UøÀÜ Uš«eÅ²IÙ¡í.)ÏâDë‘PE„ågC¾vã&–S’r-Þœ½d*‘Ð«
sIh¯‰:pÏ]O>ï/v=ðrÒÔt×}ûô÷! />õÆ[ãÑcÉ"q½F…p´Ž€¯ÌÒ7¦,ˆ8E’˜­áâ+­èÁ–ÝŒ`N’¹™\;¢ò®Dü×¤Ñ\Æ‚…
[´ˆE¨ÖûXµ•-lŒµ|—2TÏÌšËã§Ú‡—‘V-|šZÁ°µî\zû´3<;ùÄ;—˜çZ2½m…Ò¬’áHzu ûmI¼@?‡š¼@m2Ñ),ûºf_¬+’«M¥›"èz1¬Õ©hÍoà²œÁ0JkU	”¯ûC–Ç‘ƒŸ¯Òƒi¿ýL;¶Çò¬1³ÖØáS7ÆÕVßsyÂ¶zŽ=«`ŒÚÆ‘_Lc Ø˜ùÉOE#hMú\yÓ¤Mà½:‡y2;Vc `Ó/g"È,ˆõXKræe¶>‹*¸z¹øPkFÃ”³e^Ð©“&R¢8ÎØ…ÌÁ•¤G +>Bøtì„ÇFw´ß
¼°Áz‡1a%ò±m8¦%ø4kçéïÐZE!cIý^ÚþÕ,EÅHê TA¢5WaT$hò)¿	en-’­­c§fS+¼ÉˆÕ„5µíGXœS%bgÒ	Ò¸êò˜@ÓØäÀ
a”U+Š¢6yW,e“êjßZÿ›Ž ›Z Q¨üa¥ó «.;³qâ¿¥g'?Áú_·}vò/÷ÞA×ÏNþ×=
ÍIKZP‡üŽ†>g0Ú“ƒXÓ¹ÜØƒJ)j*?jºýÑnC6’è»œlf6ÞÆ]µ£hmuÔÀËôS¼lÝ³“‡sväAÒsX&t#˜¶ûÍ+b1Jb÷uð†cÙ+Tf¿7„ããÛ^ÚßŽ‚ÀI{m<¶¹c.U…‚÷ÑIÿô‹Fâ¦o³›§»‡_äŠ¼E=ß}…×£GXcMÞáx}×åï?z…Wå»xx5ÖäïòÛ_ßai¦©¾¢k2ÀŠ,>“m×ä~~û¹­	ÊaŠÈœ/Ïmój®L”ö]3f»6ïrLwuŠ!Q”ŠËå,ï[§²›–´V]bÕÛer]Cq-×l4lyŸíÂG!Êõâ)GºVLD@ßDìïlãŸdì±ø¤8ÆŠÏ
²˜«1bžmü   ÿÿì}ÿo7–ç¿Â¹Qkâî–dË±Y†-;‰Û“³älö<Á¤Ô]ê®UwU§ªÚ²F#`ùa±·X\‚Åân1Xl2¾`°_‚lîpsûƒŒüº¿äøYU$‹d±ZÝ’ì¸ã¨»X,ùøø¾~žK”)Ø©ýSrûø›ˆtàtäÉçã“ÏÉƒ·ÈF4x£$Ø¦‚Å&‹‘T Ù¥G©q‹:™V{K&)áÖ¦YVf·º&©*©©rÚöìòâÇ·ñ«ÕÒW6ñT‡Fs•8—øÛïjñæ4)N¶Mø®a°H5OK]Eµ~tÍÚ–÷ÜðÍòp¸Ñx@ˆ*c3õ™©úÔû<Ë"M›dm£ï?£PÅ…^¨ˆ¥/@Vó[îD{¡ÛM6“ÎvUñ9eÈUÕZ4ÉðEx¢þ¨YZtÆ1™Rp„åHe}@fmWV_°‘q>‰+nVøz¢„]/–)år X.·T–Fd[ý“£H/ Gév¶ì“²–núO…/3‰õËt³êÊÄÌÉÅÖ}ŒJaïøëý:þS&i:¤ÙI¥g'«õ¥•[;Ê |wS/e%¼uö)\ŸŸŒ„n~+EÞÂg,8v;MKºE4UÔ‹aÚ"#!¦,‡5\=çEž/¿Dç@ï†ÝÓ“'ïä§£›Ç%¾çt>ÜÓ\¹6wß÷ºÌ ÎØþprô¼ã~X8S¤¨¿;4Ÿ
%ªV ‡[ì†‚4J½LXâF{NÆ„­Z: Ù»Pè9ÓÞæÉÑWŒò^~uüœ N=Ôˆû«7”§§¼}¼/Ó¦¾Ú¿nØéÿðþ;Þ?9ú"ä…ßÐ¡žÇ!¥Ä§~<J|<A×¯-"7|CŠüSÉgCˆÝ=5ØÑ©)òNè§i¬#ÃÏÜe±{¾üÒÍ‹ƒÃ:/ú´@Ÿ'é&A>òŸú¡«*SƒzköýÚðýã?‘nôjíõi‘ÇW,/x¶5V8ßù^ù‘µ3SÚ«ýL »Oƒ(«°ö–rÌ6’‚SS-7õ~? ”pü¢’Ö9ëÈªÇûÈ÷–t&ÆÚmbÁ¾‡¨¯!•~­L!UuvMWyÑ)¶)¬ñ:'›Ø³Âí¬lÓU±ûé]þY<é°›ýÅ®+Þ;ˆžæ0†rè“æäš‘n@eîîƒ·ÔüKª›¦<ó!cJGà	Ð6NÙmæÎZN*Ãµ2:ÔU	¶vÐ#Bœ·ôÈ~FHŒÊ=àœiÄ:½&³|kž÷7TrÉ&cÕ9º66ž0ÂC€A’6é"vè6\f`)6ÎöØ°çŒüÆRŽ½¸¬þ®ß¶‚ä…MWÒØ¥ ¹!´ÚP¼€7Œ£=«ÓÜR)Ü¸„EÍëûtá;}€pÿÎRoÚZX@-ƒ½.” è@ôRVAúgšš¸‹j Nµ­­GÏA#Hnu‡ÂÅÑ?;Èlñ ™ÄâãÕºîª¼u%újçK‚_×ZIÐµrÙ(H)®ÌÉ¾J%ûXÊ‰S •o»w(ïM}Ì'³Å{Ü:cÖpË½n"‰™{°J[±—ô@b–ºJ¹úrõOŽ¿÷2C Óhrh.`cçöØ¢Æ²CA<î@‰Y.}ådKyk0¨±š ƒLeo¨\»sÓÓ£qÊKI¹Ï·)°Šç/—…ShTÆ€ÌÖ¬G¶Ø‚Y3Ž¯Vh`­E{ö‘u%Ïä“•‚dñŒ›[[kí¼½5”g"þY1¢+9 J)	Ü”F&vú~gw;zV¯Þi†Š¬V*­NƒÅçUð6i£Ðé’¾¯Û¶Mö)„ü†ï\"Ø!…
ÀÇ¹àXTB()Á_¨ÁFÅ5:0‚˜pªæpHüÕ¨&~ð“OÝSÙ¦2‹±*dÎm¯Xƒ…Í`}–¯5Ž“(nŽ¢ ¥<%ìqEõh'Ûr('Ì4‹xÛ„XÎQì?Åú)Pòd•Ìsˆ§ùK”ûÇ,Àu•@«½Ž$ž7úÆ+yKvÝK:ó VB¾‚”à‡v<Òzáq“FŽÝáŒH›lA	£µ[1­Ê!‡&F‘£]M5•'²z%)G@Á¶QØì¤ ‡=óøÇ€Îg€¦ÂÝ¾¼¡#ã§>å"6**½‚4$F¡JjðëCF49ŠbØ6râ-.-e&?ì:ÒúÂSÊ–~¾¤¤§–ê|8IíáêÏkÿéT¨Ÿk¬£r^FÍ~×ÅT¦bn}«ïE$¥³ëÔ#odQ[…nÌê/Öí¨»o~3IXÞ­Å í™#i´¢®ªÚ²ïïß¹sþê´Æ‰ßzÁ ÷?|kZÞÀVö¸•P¶ä7/‘•Ek;Ð«K$è>[¨ª]˜ÛXEBÐÄE4UÂÎ`LÙTu6#ÃÑEÚ—ŽLÎ({æ†?(Ûø9k*¢ÌŠsëôÉ;dé/:ôhòiLâ¸ÜÓŽ–†	lS²6Xìò"»àõLdT8YA«ßgGó“V«_BÛ‚›Ò_Óº`}>òœA Ì:å]òØoœM.V§â–®zGÂ®*î¼?Ìu¶¨€æƒb)>•Gl¬‹µå:Jm¹ŽX[Î¹Üke8¬<‘×Àêˆ5°:uk`9R8Î¼…óâ„u4¥¦Nßµè'×È½`ÔAâíøï1 ÈN™c?"òãüBQ¿iæÓ%HrE›J€UoE›Cò;cÌ¼Ë*|VAžMøÓ5™PÉ~™¬¨Íéãì„—¿Å
;L/Îîî$}WòÉ‚Ðv–afÞ,HO“€ç´§2#›Æ¦¶sØâ›ð¢–úwÍµyV›ï´/è°ÇªKBp„m‰Ã1híFF&yýí@ ­QBÞ¾Ê’º™]t²/‰Üb²¾µ¼ó’;j÷AÃyÐX‚e¡^y ÇÒ gEE.ºÓ
˜$cˆ-\aGWr‚UPã´ô€t ü-™VÒl²TBÃ`²?¯Ÿâ$–Jïz™¼è„<cìØ$ÎvðJÄ%j9€7K
+Õ(ì81ÖìÙN6Ö†(rôf4ál»<ãrîÛfÖ7ä@îÍº˜Qšv!æ§]3
!"ÜÌk,¡4ö9JO5â¢Ô_t¾2E~M­UuXW€…Õ®£0ƒå¥<¬[Ãq%ì: Æ£M2$
¦È|†àdEãÃœhûfË>¬Z}ðÁ _“*ŸÚÔèB!†bzoíï­d4Ò•ŽZ±„ã7r³ðòBë/¢ lÌ·çQ†š?$My¿òeRºç¿Öíü‰R}))frÔ£„¬ ‘IÈUR˜#)„,ß°Ç¹`K‹Z­x½)×=p˜p§¾€(Äcë¹šÍk&îB‚†ÌÇ›nDWe§œŠò ¶Hû™°ºÆÙØ‚tÆÇÜ6nÌ†Ér†j™l²´¢»r/³È?C‚ì°Ò*`¤líÂ&D/”Îx“9™,°çÇðbÇÓÕ¡ÀèéÈb«QâPwÇÞYz@YÞ\avéõé çTÚÝËè7O›S#7\ý8„0Sâã 2Á” ãë9¨SEˆNVÉÈ£'ç{ƒÈKË&Nz°b2_£ýóV»w‰£LT¿TçI@Ó«DÙ‰î:ºŸà#ïÕ{ÝF8œï?t>û‚3Ê5 n¯y¥N°ÊÌ
¥ý)ÈNm)iæ¬ÎT|r–Óà.*8ñØåÅáEpOU§y¸XaB-­(c?ùaçÉŠ¤7:ô¬*aFCÅ‰??þ—1ÄæýnlAv/ØJtè®§1+/ú&W§¨^fY^gÂ\Ð%#zs©Ú?å~ÖÏòEš3Ó¾·Ïí75ŠŸé*¾¢]ÔÑ™øà,ñ:Œo˜ô|a‡dCp°eF‰»DñRçgsxÁ—Ïž$NÏ$<wÚ¤ÅY†\${rAË5P£Î)ªMèœlYê/Ì´Ë:©ég£WÇ`Ò'Y¥Éõ¬ÄÆvIV”³h°9òÂ–r“,-Ñ“xiñ°¤Æñ(ÄÑ~si¹u¸Á\Ž¿¸¥ß“;³¥löéÍ£á¤2„õ@M´Ï2›¼÷¢(•1Ä@úÂ”šY^¡Ð[­Z³YÉºWÊëÈ"%äJ¦ k¹~FQl}uf!¢*:ª¬BéÕûT¡:ewLUÊ†×¡ÂPgÇÈié7òiÀ÷Ì§ŠæÂ%²¨«˜1‚Ü3›©Âºæì¸¯5I¥P˜´"VÄ6o••FÎÎ¨ä*»ÑÓ=¡»\åé†Ü 3™®jIK
<»î@´Ä]ýTˆ:–^Î ûé8ÁRè:ð¬¢êÞ¾C[œZ)SÝ!¸S­x–$!™
¿^­(üzµ\ø~r²²ÇÖ‹rŽª¨¸
{ÕUö¬	ö_vâ\>\ŸâYÎÛ°ÖÔÌð:ü^Ý]§&ªø©,SJÃÃA%ù“…+PãŠÝÝÙ	:vö	mªÔ1ZîæÞ…¹á.=ó›$Ã„Œtà!ö	ô©tró:¡gPëó&¼ÐëQ™§4uŒ£%7x¡É%,^R¾ÊõÚ û«Ül´þ§|5
56§,ðUs©Ü—™nð?t-D]¸Nÿ£½?´°“ü›®-ä7A+øoù:x6nÀ¿úkÅÑN –4áK¹eßK>òãa@ÐÌ…ðUm]‡zUú-¬r·©7Æ¥h†©žpó¢JT†ÝñºøßdàÍ8RÑšê˜Ãæ•¢Ø÷
+™³¬JÕ*ÕçÖ|™/À+núôëzñ>	½§AŸHE¯ÞKz'ÚÒcÖä2ì®æˆbôok%.V£7¯-âÖ-›+ôVa9%Q›
Z¯½G©®äŠØ£«×§ÿ/Ù':·­¹$â	UöŠÚÑì…¯Æïu?’9ÁÊìa!æ!‚7DŠ]Xk÷/G`„òS:…¾7L›KæÖT{B ¶mM
 …^3½@‰Gäéñ×’ÖÌ+ènö}?5¢ZPùLH“æè¢Ö
ÞJõßÄêx{ÍÀ$kÛà¹¿+;Š÷~˜nŽ·é^nÌ³¼p³«ZŒ<=ƒ×ûT‚ˆeXR$&sU:#Ó€6@gìm³RK/À˜	‹¼t“Ìç»^ÜSïŠ»[x[_YD|¡$
vH(,Ò²©¯CCê†q!—Øü|ìÅ*ÐXV#ÌbbÌª¯‹ÛÃ@ýÛ6lÐ3 IV~³™À&}Å)Sz•éÐg‚Ð’’@á(ÛÅ!/\ŸH_~	åc{dûäè$^]›R<ÜÄÁ,lÅdÆ\£²©?¢¢iÇ7Šôð©‰Y«Í1%Î¼iñÍÔÞ&Fóç:‹Òð±‰Ëð±«ØC|>ö·X;á‹¾µ‹ºŸØïÑ}I›ñ?ô­¼|1hKá‹¾õNzƒ[â-ê/æ9xànd©¶Ö7Ã†Åß†‘`²âÆ8ŽA7Ì’³ïú{¨røÀ‹w}ð9> »¸ã ô“þN¦É½G	|ÊþÝ8ŽâL¿“u-†ªCÆMyoÛŒŽQš{ýïú>èyqÏÐñ’}4BC¦Õ‚¢[J{¹rl†N«ZØV­tÛÆæÇÙÚé®éûÚD]°1àum4Ü™Ân,S:ïŒŒÓ	WZW8ÚVx¶TšÐÛ©CÏïf5c‚ožWDèoF„
èWKdyC›iÊz©–¹
«H£âQ	HUðø;]_Y4H8•Ê*œì+ª²Z³¦³¨ÄIz&DÌäBA
µ\+%>Z‹JŠ×Ëji&.&þ0(%£Qa¬}m‘©¦,êzùYxÄô5Ð¹÷8ù ¬^<~ÒkžÚgð{ÐøodW¯¤Òâ°ü»]úCšÏ†(xýÎ£=¿ø&l‘Ž¿¦Y"?!Ëdpü5Ô bÁàù¿æ]ÐG>§=÷ÿmIEŽþ%ÒÇ».ãÃÿ‰6à^èòyˆµ „¶¬k`„Ü¯ŒF0^ÈXÏÖ}/IYm·n¹ëŒ›ÀŠnÓÒ£0„X±ñµÀñ+^C•Ë¢
oØJH°ÓÄTØÿø-Ã.¶o2Õ3ûTfžòòÒ}ÚõžCáœR7ùv¤‡#ñ¶“h0¦ÚFBŠy“w¥0xEŒì³ò™Ç5ÑÈëé~óÝ•¹uGTã[‰#žÉßTN7_t{ S¸ŠÞ8v•Uú`ªcêä'ër¬êI÷&i€æíÝU<Xt f“¶¡¿G°®æ–§¤½O?,‹
°Jò?ª<YU3xÊj9–Kúk‚ßI\58½me,ØìÏôæ ÇMÝ8‘h}f<s´Ögþð2ûPªÝ”ŠÞ´¯‚d±"Y˜³qVöf±¢ú˜®*¤Òô»–ÚAfKH»„»€šY%Ü×v¸daog¨•D+«{Ù§;RN}õ›£TÁŒœŠ–R-¦;€ô<€™•æ¡ƒç6âöRA"‚z¿Ý ³^‹ôÓt”¬¶ÛÝ¨“´˜xÞêDCº¹sq!iwÛ­Vk¡j(<#æ¸Ínëq<¨Š,Aµ¤ôQJÈªèSY/*	r©ú”hAëŒ“UùhÂ|`¹q¡àS¨]Âèm›©T˜±–Åæ~ØÉæ¥jŠjA÷Ñ]ëz«ÌÉ™=ÏN8#Ì6)paÂ©D´‚óU.U¨QF9I3÷Š96÷NVâV-•fÊ-áq€ˆLÞJ¨ÀExRMF›y#›Ö<º_|äÅpÄ‰²cì0Ëù¥§ètw;#Î¹%:NiÊù;±Ÿô7ö4¥Íj¾³ M…=oŠï[%'UGjWHJö
veÊêÅA—À?pD% vW‹¯ËÜÍ-&5+þ YÇÍ¼½ ‘?ó»váÂ FQIçr™[\é";`J’ãñZ7`šÙ¯èñ¦ùWUŸLA¹_àIŸÊà»ÍEž”?·¾ä¤e¸ÔJÕ"6”à‡X4xà‘ääÅ‘xê£¡DP…ÿù>”‹zñûûO(‹XNêåW ûÿ¼S”…¦ÿÁÌÕH˜‹|€sës·±¦Ô:#t,¨.š'ÐÎ0ÆŸÁ´ñyæç²¡6n…û`õÛÒ>l:ô¹OoÁfUpHd¨nð†’J^>J¦dÆ­ã²ÌíM‚iJ gf¿Bþ½ÌËë1Å­wrôU¶ÄŸd›Á´…×¿€Ä‰o"øýkÄÞÁEïK³¦i€XK/¾	¨œurôW!‰ÿ7ý?<”ùoÓÙ¨õ²ýÀÈmT°®ÈÁÐ’°#Cc£ƒ|Â¸
E‰TdXÁ“¼¸A0Ì-²G/Ë{C_54£~À2»õð}rÿÞñ}H><yñ·ŒéÇþÎq’	S^nÌý‚î·pwŽÐ£ôÆ\E#?¤C#z‡Ç~<gã©Lö†áÇ`3Mr£Eƒ­à:Ò¸í|÷}fè4ª<V\`†»b:íòÚZÛ›ÚuÞ'~›ÊÃøLC´Uì›öOÉ#¿CoM°Ê+UTYÉw³Ðéí;¢Áþ--?ý^×säÂµ×úWÊ9CƒµèšÙZDgl2·R&ÄßÖy
qÅ#*V8š›ÕœAÏ]Òè¹9†ÿ~­¨7ŠnI{\rÆ…2»N»ß}¸ÅÉ-«áIºÇÿöª^Í%a­Ý¿RÑBëýÒdf|eëøß†d¼PCå²Š?Y*bDG¦€aÜ4ÆÂR˜Ü–©ÂAluU+E®·ËÜWG_Ž;6¸c&öSÈÌ2×‚LWË?F¿Œ¼ÄÚ¦ïÅP>X°dn˜¿“B›%ÇÜ\P³¨£õQ±*ŠëŠ(,Ty¯ì³“…½æ…!‹X@ÞG]³ dØš×É(n^CÇÒëV#¡Æ¥³^©.uQ¹HÊL9Â,Y#/Å1Â2›Õù*h*öÑÑ)æ"‰f¤jÎÉ/\fl"9œ5‹*¯|¾“íçÝHŽµVªs-á×ÈFÈ´]LMöÀØâSi/šŠbPí—Ïžøn·vRè¿øqD¨›Ž‘KPhbŠM•…­y•`ü®jízT¿S
Í,­,Êùº®ä°ÕnNveÄ}ÆücV®µzË¶ò–ª¤?Ü¦ï›Ù‡·é;Õ€}öèÚk”ò¯¾èƒ+eõ]'Jbbâ…‰ˆTÐùáÀ¼ù'IóE¨|²rJù¤lÈd=†èI,ñÐˆã¬˜éÇìòï\Ñÿn¤¶AÇYÉ”¦±ÍÙ#æœ_¤5ìkâ¸çJVîÜ–5ž³'îR™ìŸnåDh²ço'”^«,.ò™é2x	Lr®+/âÇ£?¥û“3£2Â†È5®èý÷bšNu”—†VsJü!—¯@ðÛÓ·ûBdÕ¨üGn¶zzrô›€E|íö±||!ªU,O.0¸‰æp5
Ng©Àý&ñJ¹¤H©RÁ1Âòx9¤êÁÉÑßvä÷¬>vh±ŠÔR2»¤Qy3¢‡•XÒˆ
Ä^J§ü¬õ¨ÎÅ »¯Heç³L¦ÅìAœ‰5M‹m.ZùÄ2B™ß7C_qâ˜Žud´ãkÜC»b_ª^¡ÎåhSÇ¨´Ìò°Æ²jÖœ¼ø#=£Æ`AÙ&£YL¤ú–îÔ ®vúcf4Ž¿	Èîñ?SÙ	œ¯Àø·Ór¾ŒªðsˆX¡W/Ñýsòâÿtxt¿7$Ù6ûÁNZ<íl0üIŽ~\'œ'kü›Ý4R°Áô!¯Nn$¢ìæ¥˜*q.Übùª,Ý¼"­â³Þ]4Æ˜W¤ü–ž\Ifh2fá7(:0øÇyXx«|¸`­@q§ß|B‰q«;q4l{q3íaV¤¸{Û„ån¯
?mC¨ˆt]1
‡}¤ò?Ö9†89©r8#ò¾g6|øÝÅ<#öÃÊ±šö(;ììî£»H~	q+jôN$®õ;òª¦¢N‘©žBT‡;©¡¶îÒKŸ(ê”#›úE>h‚éXÎ}›O–GÏ~±ø‹úoþŒ{Û^cñþ¯µ¸²ði¾Md+
g!™%Å>©ø|pü—ßw#·¢ÀâçàgÛŽ…²“†¢)?YüÔVæVþdÅ6wA¦ÚÅR›óA÷q´7_£¬œÛGbýÐß¯‰…™¡	T	‡HabÁð÷Àâ†ó®Ýá,‹^?Š£¿ }²?è¤Ñn„±NÒãÊjö±Kükòk ×ªïå–*ÎGê„A/~´˜”[Q$@aÜp‹˜­ÏtÖîH<·ÁgºÿQJÚ‹PL±xË‹6¾²R²¼-±ì~‰9hœÛÒ{ôäÙÒ¬MŸ|°\êBt^‘Å—ë™dK£'!ä?+Óô@µ¥Wë>‡tÄyçµõÀTZôüuþp’7kð­Èk}‡À(èCPPajFíÅÞŸ5B,Á„^b™}ÛŽ}o·¹¼®öVÔ™T?îŸ}ñÒ²Áù-Í³ ñ/Ÿ}Ç0×*„Ê@JBqË p€zy,½ç‘8Š·ASkL6d'DqÓµøû¥Í>ì¬¹ƒIòà%Ç</éÌOÜ#Ã¸xJ5ŸÇ#YêQrµ!È;ºÔ®øq‡œ7ýN´žÓè'¸kò7^»SiçñHó¾"íe!eL¦íì×¥b2úæW'œÚg©[Ú˜î.GTeñ–Ú¢+|jI‡ÎÐn¹Rk¦_¹ëc6Ü`ùs0òzAYl…Õ¥ä¿\"ñ½î³Z‚2>ïN(óN¨ Z¡Ø„{×¨-¢:d‚@É”MM‹Ä˜£ZRªNk-$¨ËšCG.'É†P^pUPBÛ—Wª¾Ù§ÎžÐ#ÙÊ,Uøýre(²Vã8y]ziRzIÊ2v/XÂ>e:h !wÈåZ¬ÐÃTy¼°ÅN«Øf»¶CÇð1„~Ð=ËÞîIÞé§uÆYhµ3Ðk³.Y’/Óéy9û-œ‡F>#5ûHc–6WíÃô”Z³¬ÛJ%ú56ß-ËE}N/¯Ì¿&PÄH¾Ô	L’bX²â‰¡Î%ÕNÎo/-ÎO6„ÕlL(ãÒWÐz5¯ë=áU 3¬8_h®ZŸÿ“¥kÀÄëjµõõÚúš-Ä{f»¹î³&äÄµäDwIQ‘£´Xc(nƒp(CQj<_™kÌ–µ/ÿˆ	· .?¾G)‹_øºµÃT~+=eš‘ã£,Q°¶w×‚”S§Øñ"Þ>o¨ßÔä!Z9xà¥ýÖ0¦8”K¤¦tI|Ò$K€œÏ¾m¿ô©Ð´äT‡…ß4ÏëøøÅ¡×vƒ:e•H’“£¯j¿†9–={FØ‚ÁRßá¶#§t@Ü±w°_§¼}øä«xd«‹~Ã*^%C—¶E‚?_f0±-¹ðÉrÌÏCì¡1Šý§ð#-ïYc	ŠaÑß`Ô
†²\•‰—§ê»…a¿©"·|lö©íÓ6FþWx’ÃéU†‡C¤
¿*7ë¿ËÊã8ÍÄ¡pÂ9$mr€UBåitÙƒ~·Ô{içCy²Ø3ßCï\ð=´é§¶}¦(5™.O e­N’5(_)=lÂR$º:Éx&Æ³¯ÒÀ¬¯Ñ°É.±‹K¸Åº&Óªå!€—ã^¬ƒ¿ð#ÿó±¥R”tå=&EÄ}Œâ¨ã'Is¸{4"<ÜX¼æ#Ö&#•é¿y7
Æaïü^ž=_ÿþw¢àqØ›|
äŸ³ïkí¡„ùrø³p;¢¼	Bó"° ®ñ_"#ÜöŠÖ‡¼nOžM“k»M>ŠÁ$y#QÏv ¨öÝ©$;ÑpeRó{ lÙ[Âv»Ù‚€<X°-ËW²ÚÇYU³Bé§Gè¦4\6¼¬Xõ–¿¤ãê¯ÜÐseyL€¹W
Þ,Ã«¡ûå´Œ³Î
óQÅßX
Ñ¶ òWÐûÇøÅ-(]’+!RÕd[ƒÔÈžý+¦¼ø&|k­-tgxÔ?éÄÁ¥‹®^¤Àô1«7Eˆ!·sü	ûÇ¿Í"œé~X/P`«]wOŽ¾…û \5ß${a”Êl¶ÍÓ)7D0Ç(Üoƒ4Sóžúâ6q¨îU/ßÔVŸðÎûépð=dæ²ÝT…ÈÓª4Æ•waÁ> Z4æù¤<ÈüÅïXiñßY-¹ÁAWŽ¶…”1Ì‹‰ôa8pØ”1,gÛ-ëT}‡eŒæi†ÒmH»å¹ÇQ¾Ìð½à¨Ë7þ™tŸ[¾qL…	*t55q
au:´T›p %Ðú)¤7tlD³‰±€åy†žàäAgT6±ÒŒ²ÙläuÖýVôzrÀöd4bDÌaÏa¾D‰–7€ŠC¬ì ’±¹ÔV[²õµ,zˆnÉ5ZŒM§¯?ŠFpÎÉaê5ÐE²ÀJ;FH2Á²™`Ht›”÷ú=Ôa« `îø,Ùµ[RPF(€ª„#óÿ!+öºýN×Ð¹nAÁC(©o9ßô¡¿aR9çñ[T¯Qéiä±2xöº¢–YuÁ‰2\d4ú>Dc™ûgõ^,cËbeRx¯FÚ
¹|8?ÏÊïùñ†—ø…1ã®Ÿ4Ålk[.ØÙ0´€=Ìn}`¯w/õ‡Ì¶‚îa¾Þ8ÎÃõìlWCs	[†f©@s8“‰ªWÖ¾Äo®”Ãa²$ëÒÞÖe­Âø&·âT`ÖÄjÏaM^íjfã Í	Š”’Œ¶—áÓ/ÉÚC:…¿h¡sáL’5¹š2èeáJÀ„Ýó°ùŠ7Ÿ,¶®_Ó™ïÿð‡±(¥ÿ„ÜäòÒTè,}km¥%õGž²L&WÖ$ûYÒh7ý”ð0›¡Öa	§*õ6HèÙ}BqEÏÅb:ú–õtJ–A'+ŠfÅCÔâÖßDî.ÀÂ~D¥ò?†=ú‡W¥‚~6¼›§1ªme¥mK'¨”?2ƒREzð"à“Ixüõ~‹lH70/ÅÌo·Û‡&›X µ
X"+k;„<ôV…ºfVÖJ|‡jSF(|gÆNi©½LX
ŽûøCS‰¯¤ˆ,e±ÝŒ¤Ä'D–òm²œ¢Cç¯f3$yä#[Û¶ºÏË¹•™çù¥—YòHnmÙgÙ§ÜS•1³a#
²U-Ç.æUÞJïŒ#<GN£4-®BŠ#“è€¯’Â%«k™½'æ>Óÿ+©NH×|µ@OaìÃ£Ô^ÚŽži(Š}¨"ðLNómöÆø¦r²´¬aY°Öqàhcyb~—Þ½nBùãñÅZÁ0ŒB@I'7Gå92×Ïù¬Q¥`z40wé=¡[þ¾D`¨ŸZ–‰?Hüi<þ›Ñ}Ð…_è¿gŽ³e‚áÊ¡þ‚I‰•MQ*Éhê+(‚ÜÚ`.·Â¶ñ¡d@IzÀÚÑ ÷²Ã÷u*„gÑüá‚-IÃfÉÐË©ªÇ¶Ô¬ü;çÞÃè-……rÑ±äëÖ8–²KcÇ£4¶p6¾ßí„4þ9¿Ý,‡Î•ÊLOÎi³”,÷	(p)ÃºßsK~î)“Z~L^Pç±Ž€yÇE&Vb}µt’1Ù½ìÖ
!ÓÐ´¦çbb)³´}bz²\5—Ô(‹J·~+úN*ÈÖîÉGZïgÇß{ZS¼›Øª<ÿ6
¬&ÁÒsÆ%Í…‹Ï[›ú\væ—oªçßˆãAƒÌDÛ]¦á$!ú}Óþ@/É¢µ,#—úéÿ{(*XØ¬¥¨úR²¸¤r¬œÜpþPMœõ8Žžë°œü9€÷Q-žÕa[P|ÎáºJXSåì;0ƒ÷Ñ¶7ÈNÔ7·¨ÔTÍ	Øü¾[Iôª‚ýŽ³Õ>ïGˆRß?þ7º@½Ã‰y
š&¸˜bÿ%Õóœ´B³w„‰6Ùëˆ“c0Ùùè|[jõIöTúÄYF•±½^éi¨ö2€ÚT™L§k*Õ…ÀUòôF<À6šÈöiä´ŸïAÌ&šq÷²œ‰™ÂÁP1±©¢l¬0yUÜLuŒFoÖÕ›.–W¦bº°/ÎÐ|QeÀ8F•ÃÙŒÁ=Ü–M¸©édÔ8•YCcØ(ñ7«F-»Æ$–ÉÎ rÃ†“iÃí¡[6l4ƒuÃâ-Y8Ì´tzkÇ©í0*ÁÚ1ÂÈ*&T<¬&‹¸|Jë,Âgg±JÔgbÑŒàPH*¨¸#K¤»aÅ$‡œ­U¥ä¶sS£d£Üãî»+ßpŽ.<Q_e2ôYúñ$…«Ú'5wóêI·¼qî½qî½qî½2Î=waxf>àÔÙ¿ã;[ïžôÄ‹æÛ›‰È;]‹Æ
‡Òkêå+I9çàì«)‘–7þy:úPÄÍç j¾qñ‰C=¥‹O;sO°‚sóó•dm«»O2Òkçî{ý&ç<u|~Œ½œ‘Çs…Ç	ºI¸ÜèÄ”†¯9W aKw¤þí³eò³6é¦›ð‡^0¨Ç'øžfEèyZ#}ñWnË´8«}O™ñ>6òíñ`7ÛÍ¹å©ÞŽ†.XŽ‘ãÖ^ûÞNŽ~=6	q3Þãù¦.K™|/$˜½ŽŸCoGÞü1lwNÛ—Ÿ&Z¿ù‰ »Z²•Û›dîå—ÌÐX¶JæTbœSU³Ùó˜»;;A'ðÃÎþÄ\¦èÂ™Ïhoù±pšîœYM±ZnSÀÕõYÁÌÏÇô²PþÒ<ä2?V6¤£ßY2¢âyzVT\¿í¥¾#)M/câ<éÖ`09_b}Ð.œÙ’ýŽ×+m¼øŸ[dãäÅoÏ‡mýìø/Ò;Žþ9ðó`…Y'âJØPB[q`N*ZuÈîÉÑ÷Tíïcç_yáWoY	|Vj“ô¸²þÄt:tñfÅMî†B–%ä~T	&$ìvG×04ÄYŸÕ¯¼¶ø´ÿ)‘°ŒÏ‡“@õ?óâÀ±|ä!s¢ïÿ	€lÿ{UJÅNŸ| lf)ë>—ia54Š8Iù 3èè»@ð/»gJ»[ƒÌÛ\*9™‡) :ßª¡n+¤ÆgnèË*¸›4XÂãK$àcJÈn¹O8€r)ªK¨ä²T,9«(QÏüúk^<vd+{]à×ä5fEèüQì7<ßmj»‡4žÕ·Ëé½€Í«‹í5¯R¾*Wè­Ä¥<yZ? Ì€žêâ½µ^8=aèû¦K×JFƒ mÌÿ<œ_`ë	ÜþØK #.êùÿ÷—¿%é	XU[¶:¿`ö-óZk#Fƒ{
yà¼xÃmºšïfÎkhC%ô¹õxü!Th×;{õþ\Ã¸!ö{P¤Ñmümçô£«MÈYw¡ÔÔr§?rÂ™ôÕªÆd,*¡/Ì»Äà—Èp»zºu•\±A`G›¸Ä@TÄý*D~>è*óäØÈªô£+)%jDùQ²í¥N\è=z^Å­Î !¢Wk/¦o°E»i@_¥[ÒÈKÒV2î NfƒªWTMN<(ü}üÏô„!5ARÆ“ó­9¥ƒÃ’ú¶¶öM•ô†1=ÂáHÞÌýVjl&‡z¶¨•&õ‚O.FÒ·ýª™ÏÐtõxÔõ&Íu…ØýNù®–æç¦æÎòÜíq0€ózÙE+”‚$Ÿž©Û«üèönLž¢r–öQm+™±eð2°V‚Ðñ«S6¯_h-ÏLª³ˆ­ ô†+6>ßºüWq±Ï‚]L1S¼‡CÔŒ±ñ+Ä(î{û>Õ•ër	1ä|˜…½bâ[,|ýŸÐÒéùs‰rÄÌYðˆA/ž?ð[˜ƒ¾eMÎ°25Î ^væüØOú{&ö°Ñïc!+°¬þ}@Å`°•nŸýÃœëwºóøó4bÖak‚ˆvÇWH»ci"Cz{ªK™™h&  Òè)ëú®ãˆ0Ä™ŒH7A<Ð4Ó>*1ƒkðe`0åvJ¸ZU^‚1  mW¨)èêqRÏ‰@~/C1·ÞxÿäèØLÿMšèû#¦kànV˜ây¨eÍuCÕÈ §UëI«ç£Òz\
ãTSt	ómö ¡RæEã–›Þ`n×y„;2£?{çð„q¹cÊ1.ÎÖþ5sƒÿ÷áäöñ¯¶Jå|É/|Î¡qÅ@4"øg¯ÑÙ{¡r¥‡Éâû'Çw‹ˆë7ûx6fi˜<d–ßïÉVnÿšqcÛÙšõ!llöµZºj>üñ«•Ht–‘jüaú0µì¢%<-Û¿4,m2ö’³I7îbiþš1«ØqŽF's”üoD“èqG}Ö¹LšTìÀ»…µõkÆŒ"Ç¹øô’,VîPÍl?R¡C!ÑYŠÌÐ¡8Ø%‹¸¡Z=.”°1	KÉù¢G16~ÍŠUÌ8¦¢“6d‡æQÃ$jÌœÏÈO:1ƒ³„ÛãnÏO'âìV'nPjúšñMŠ?@Lb@ÞÙnÿ—_½üÂÒÿ$Žãrûf.wlã²œäuÙô*ÎjË³çœOæ?{öäê¿ßY¡(·íwýKÆe+ Õ(|âÇ«[”¨u–Ú˜^¿È.Z4Œl+_Pc2N“EnŒÆÒü5ã3VMãÜ$›¢Q$ÔøÌåÃ¨|œ#RŸu.
Èƒ·ËÈ&w»AÚæÕ•lâÁnÊn«àºvõÃÊôC–òU‹9°˜7W ^!Ÿf4¦”<âöñ7€ðEä1…Nòô¸Â†-àöuè>O¹9/Æ¯å$ú¡ïâ™…:Èn?BÖ ·ŒúÇßñôØL5Y-ãjs×®-ÒÍ–‹9Q’¾ÅtÁéØ(ÿÚâˆÇÐá=!ççuð§S‹´ìÅA—À?lPë{…ŒªÃ.iû&LDƒn­ØÓô.ó4=•zN­Jˆ9V;«”ÞÉx4òãŽ—ø2Õ¥“®mxT¾ìz±LªE6™´VX8Ùê#]ò+²Q¯únõ\w”þNCŠ¬Ú”MßõîîŠœ¡Šk±urô¯pÞ}½o¬±f,$”V;4€UÃê7¯ç•åÙ@¢02Ü–ÅÞî¦Àq7S2GúC}ë\Úç§ÔåÆP{^Ðv¤¡Õç/k±Žé{©8Çis¥ à¹u¨¿þ¡	ÑøŒ–üå—0ˆ¿èwÃî$KÎo›ê‚›+¢Xy¤À§Îôpçþ==«îS&ŸÉCY¥32¬)[Ox’½†AJ~¹,¦¶¾¨iÀWz'•ëá2èÿ,HûÑpè%J [QêàÕÝÊ‹Ï€­YøvìBƒÑƒ­—ú•f»œ›T·`‹‰–A  v¼ú‹	¢«‚Î©´ª§‹»¨o/‡Ž¿úKû8¤ŠÚS?žÆâV÷uq——[#_³ÕÝ˜ÚÚVõtª•%…22ƒE¾Ã`Õúcu}™.ˆ…€BÒøøáË/UBg²äêèÍ}†ÔPeó‘ÿÔõBU=‚°vviâþñŸH7:7¦^µ¼ÙÀ2J}ÁªB˜ñ#ßK¢ÐºÖ‚^º±R¯ZçÙUdÑÞ&Ogy®›¯¤Mç•Y¼§~>˜ÃuÉ|•[fì+ÔD~¸ÑÉ¢4|Í|eˆÇ>z:gí\-\Åaº"o‚*TÊœ•žr>ðäÉÃ)ðnç`
µõë¾Í/Z(Ì¢¹À~¼a
Î2ˆ¥¡`—,lë^Ðð‰IøJîÒua+ÆÆ¯W±Nœ— á7!0“7±ÆX‰™sùIg'Á¾_ ïK¥]É ±SX¶¶¡Ëîç[ÿúÊÓ½O‰	sü:bŽ«€Ôq’FÃ&¥§h0Øöâ3£ñšñ†A»«LåWÑ`é³`bŒˆ–›'GßybäÃË/óè¦‡ÓˆÃÒ9?³Ñ&CÑëX¹¤Ýb5Faœ–QÔlL}ox©(—ÆÚ0vû^€"l
X(FmÍ˜J	—X‚7ž(z"­‚ê[ª2+`•å’O£Î]¬"`“Zè€®îêÚi©ö”cwe±Œ…Þo.-åf.­cº
+#CÅbí{Rùê³·³Úå¼Ñ]£O¡NqVß¼µ„ÝFc´J¼pù=TT&7nÜ º{næÏõóÜÈÏ»¹ôÉoÙˆº¼–úáÂg ªS¡…¿j3©s„×“Ñ“k×8×ÍƒÓ€ÒáKÅ/ïP…ƒC8¥gÜ>I#z ù(³&¿khld*µ®ôhýxvê›ãa¡yáo;‰c*íü”Ž²ŒÑBWÈý?Rê6è6w¢Øï!<ºŒ?­À†‹Šw*=dK2¿ñ6qÒÍktt×Íùvç¤Ã^ÙTp\S·=ÉéÝZ2ïZºúÐß¿í…y_~‹ž³#ÚÝÈë¡öÐ0ÞnªqnŒ_1^`dû>]©‘*.Pà2#VE"0ñ’lËAäá^nŒr0?¿ÐJ£ûÑžoPNÝX(þÒºh/è!õ8¨ÞÈª'¼~¬7õð‹‰vñöÊx6=˜=;;w®¨Ì¤ˆ¼Ð<”Ÿ½B|Þ÷m²NÔnðÑC|w¹xZ)Gm¹ 	/³Qñž@8­˜aBÛÝÆQ[ÄDçÙe;2"|ôd;3p÷˜ÏŒI`Ýä¥)KH[T¼œ@:‚Û*E#ltä"¥d"8ˆà–’4—Q‚«\X)0@KÂ
ö­÷Ó^7IGlžl â£§x}tg’™pšÎU^º|M—4¨Çy‡_^‚ˆj:”¥ö2i¦±2zÞÇÎL„‚¥*¦‘cê¢“ÿ§C†ÇÏkÉT£˜	Vù&¬°J”7‰¨Uâ(AèÒ1N
?ù‰MöØF³“å4cÁ¬™y‚pXþN¦Hì£yc}Í¢ìc™øùr‰ñsh;Ðuû„r‹~ÅFQbÊYlð#Ø”èv§]dÅ™Œc°JŸ’",{ØÞ¶ÆtY|´5u¹}ùj¹Ï“
¡=µ+¦ô9Ñ1ŒT	?ƒ¡î è×[Ÿ/d²Òxì›óFÔE¥ þêW)t%ŸŠ§îŽÐU™^ðÐªáX`ÃáS_4ââH']JýžFõQK–:×ª>‰?ô	e9ð¹ƒæ£×ª €Ðö& wÝPî•2@9*ØMsØUJòæT%j_­£)4ø°}k¾JAªzÿ³Õ´¢4=ßblý*YyÁv†–!ëuŠI}êž!m×¦l«ÎQ~[Ð&kq²W× õ¨`!ÄØæJæ0>ÃÐR™üçÖ?`Å6R€¬ªŽ•«©Ñpœæ
RõÉ5Ýs«Æ©5í3kª'ÖiÎ«ÃkƒzÑºË•N®2+­–ò-ìCî:ª£¾3êÿ<ñÏGFZ3¢¾ZÆkfúy¨ó)ÖŒÝÖ±à{ÃÑÀâj:…Lß5ÜìÀ8‘íHéE|=çeÝCE—}Š56å…kRðQN¹á¹$´hP‹>„@K¤±Õ?þ&ì•e­að×æ˜¾Ã­î0'@7XfÎÖg Sb`E‰3“5ûv­0Y³.K5EÉŽW¤6˜	ùÏKðëà8	t•¼ü³b0’'=þã>·Çéø||ü.>úgò’þð‡è„è+£Íð,Sá`Ù/§G/ÛÆ1¼<
ÿZ|uV…	ƒ©>çÃ3„`.j½£ÊyuûÑ…BÌ{V Žö•E©Dy©Ô:k¸Œb¼“	R‹'a<×l’Ði1!¶Qg—'¼?|ù…ÉÊŸ?[ûkõÐaôéô—Ì
–7çž,~
„ú{óÒZ´Ñ{Tvþs*m|mÒ(ì5ôEªØGq54èh*í^LÐëŒã˜ò¾ª¼—½aüJÝó‹KóGBÿk³~©Çv×øìí:ÞÃæÛÙ`?³BŒ&4‹Pmó©`ÆM‰¢I9§N«Øô
£Ç®ÂjVYNz†!¼ì^ËFÿ@ö9¸ÇÞ~k'Ž†ÂDÕU²´L/‘Æ/.‘ IÉH¡¤IVÈ;´•HªhˆÙí–á
kÌ~œÛbàOÛÉ^i0€y&ÐM…‘ ZÇ‡mVˆ·j3k°Âù2C&Žœ;\ú”3’r»?ŸÛ-"·saÕôšMÄ+³w †	|ó5ç•Œ_5niw81bR*l”u.‰4Ñy]„%j,_¢ûÀîNzé:râ.Ëxƒ(t=<üÌÞGf,ª8 J§Ë0?\´vÐÊ…Fî?€¹Ì@áðMîtV½ýG,‘½xÃˆ—h’·kÜÑŠ}Ü6âÏ»ïö%0@~Æ ßª^Þñ\£'›ÕeyFÇžñ‚ƒ^ÁÏ»%³£âÓåDVÖb®-æºÎ 
ïe4Œkª¹»J!Fó:*»€)dÕ­fi4¥÷«Pç¡ÿsë4TÞé`Ý$Ÿá³ßÖœÈ‡Ÿ9€6ë´£ŸHSìãªsH”æÐIx•è†i›	„M÷³ÞJ`ŠpÒj¥w”i«0²	JtNX™ÑÈtjê³ATÚ£Œ3‰âf¥Mo0ˆöè¤²\OúShŠÎa9Zr'¡’œZ“d‚aÛVG>†éž:1Ñ£I|D<8õ§<¡Žg¬iLAª]PÄn˜LJ [–dÇÊº/´ÖÚZ¼n?¨9¡çiqÑÛ©9Ç=&ÍŒXh…X©¾‘ˆëÖ’eªtB¾¹ëÚ›«mÃÒt@6£¿ùPÝ¼JŒÒåŠ% ÿêåWúyJdÅé’(‘òôæÖ72èß°‡oˆ(PÜ ¯Á~ìÇÁNàw§K¸.½ÊŒ“ZÐ/~µ’o±ïVx°Îˆ˜q,3¥åæ²q”Ø2PuÂºJ0T¼c¯+¢+‰‡¦ªå^µ`Z½üŠn€Œý×a_ÊýlµHcûäÅïS²=>9ú‡Î‚èJÚ+5p®î–ï;µ¿çqç±3NVÅ_Wò_AÿVfœcû
“µª,õý¿¶Î k^—ó=90Wžx£rå|EÉÅê‹A”²8ðòÊLÎ$ÉþVÔç4{ÖÜ)ÑÞÐTeÝTû³­J ÉŸ/óÐÍA@œ˜Òæ_~)³•‡jÁ¡BnUû”©ó¶|ù­>«X0`#òÞ3Ot? :JU“á›5@—}_ˆb›Rþ¼ðç‡äUDºt1Nª¡±¦2ûá6¹AXÕ7žø+á¿Yôd©SÅÒ…áiÛyxZ8ä;£éŒÆä~]¼£“#ü²m zÞ—K®÷Âà`Mú2zôgµ tg.¡E‡)lÊ½ÞŒÅú|7ï3Ça°á×Å„úí,eó^ÑÛb©‹Â@UKaŸÒËcn›)èØâTgbcñ]é£è×af¦˜ì½Åg¥8F£Î)(-)‹Œ=L›KŒƒªf&‘£ÚŒJæy•U|‘Ÿ¬žn:UÓÑgÔCí£5;ÞÀÏœ‡ôºój2F»«žØzjÆÉ­ÆÝð*’öle*õNøØuO…ÛôCø8iž·êõiqhžÚjÂ>:µÄzóM ça‰Á_Ô­1±þ
Ÿûz•ñÔÚ,›óÎ´lµj¶ðá›TÙFý>e÷–în§²*ÖMx>j.|NQíE+ cöŒUb½vvÖhÕ\5SRŽEà9…˜ÏBA~ôb†D9QÁpv»cacc¥y&è”U seø‘¿ûIcÏð6‘ïžýž°zÞäŠ°:–
LÊüá)"AnSèP¾ê›å@–,ÒâJc™ ¦ªry¥€ÀV¨A¯LN^€-ÚƒN^|›ÂOÏ…ÑÁKíJ
™[^\¾Ú\¼2$è—ÿ°2÷
á[švÀ™[ëäÈX»œ%Xë«mÄÝ“£ïàpÖ¡îf$9Kä]>DDôF†voˆ¥H+YkçÆÉLmk2²2XÉ¤ŒLŽ©´÷•¹Ú{ÁÀ<2±4.q	Llú ˜¢Ð"‹µee%±	É7¹û¬ãÚ›gX%!—ƒp—¼E€#¼Ù÷)) +úÿý;J©ÈÅ—š="f&ò_uA½¬uøL1EÈ<o¯¨±7E–yeê™-ÞG÷‘˜–¢Ì®Ã³ØráJO^üëXŒQî5Kë,RÈ$Éÿ˜õà[a%¿¥«ŠÂ³†­vX&Þ—_¿ -M£ÑK¹F>Ÿ¿Ä]]ªR02ƒÈëfÃÃÑ 4
/
 9ú©{· —]Z¹}5 ¿Kt VkÙ°äÝ~††1•y°†+. Ë–&G{6•§L¾¾EurÒõw¼ñ€E5Sò¦5'räuÕ’·“ûA"1Q4gIõ‚Ý•ªÛÊvÂÔ·µ¸zø,Èû©a€e\ìz©×|’¤ô™7<þt5_@ÝE•oëÚØ’³í-Ú)3_Î÷r>IÚ„rJf'L€ÛôŒãÁÅžûÀÿ«fF<êÍ
»„©^Ñp&˜h+w™8xK&2Ié/…×¯°Ö£˜^“Â^ êd4€“€¾!¹i£õl<»DZäé$¦Wf£S`Ù\šxŽ?¢ìFw‰þ5¶Wm¬’¤GwŽÑ*JÐì&A‚®6¾ò¨ÕQ„GÎòªò[Nî†”u¼‡ööÕÆ¿že¿e;ù&þÂ»Zdßò=_däÖZ<pŠ;„3‹LJc™×2îjfbÊ??Žu°$r#qR‘¾Yœ¶àö1‹^ükåcƒ‰±ˆCX¿d„*ˆÏ¯6…{48ci†ì®¦	“05=<NB¥üŽ±Áû%­¢ƒ-<ý+ Ù¾«¸Ÿbï§é(Ym·»Q'iõp€­N4l'£ŠˆÂP“v·­¯d˜}¸)œEàëÑmUƒñ¶t¯;ôâ$ð•\ÅÊ˜Iô¶—Åyé$x/Ž†03æ»mç°ª_ýŠ¼å:ÍòÔR‘ªÈfŸJŒ‹ÅÏ¨Þ)ˆÂ…ËÆð`3g3¼ÓM#Ëcê…ÈòPúZ%seã‚NWL«{Wëa$Öå€ì’{°_…°×’To%4X—2#¡$DË™m	@³_ùåñ÷¶<›’VXû²ž]Í¥z•¾å¹ÙÔjT ™‚E­Ã£ç_sZöF¯ª-á—-ixáLìhø¤©XÑøË¼ª64`
®´Ü¢ÚÏò4
ÙWòÆvöjÚÎrþüÆr6Õ¹yc7{c7›’Ýe¹ÚV3V’ñ5²™eÇLÑ¾HÕ“ìe™d1k+6«ØÊðÇWßR–'¾±“¹µ~c'›‰¬C·ÓdV²áÎ×ÍF†LfBYÎ À>æ6½De,—WÊ.fÛ„ge	ª±5;Ëh#³²éæCÖXóµ¦˜dÌ°#’äd0 Û¦© õ,ƒÜ1$fŸŽŸ£2üâùÃ#&Ïñü@Ž:’Fnô"$–—ÅP6ncÄ#†7z,Ôq€õeÓAã†`ú3+äýÌ.p=\,.´€‹ÛI¥e Í`êöQùÇš(1ø+—@+-ÈOÉýþ0&ÇZ%[0iwòÚÇ[XûªóÀÔQq RþÍôñßª	ã¹)VcÚêô¿ûä™¦¢º4­³µ

£Ÿ¿MøîÎNÐ	ü°³Ï*›;•4/nr(k®m|VÖaTã Á„a;qÉ}FLŸ)±*œ[Ê’g¼ ;%T¶ê“näÑ!S9+q›³›–¡˜Ÿ›úlQÒÄMb½1Ï»ÔçNÍz6[b’{ëâ×€ñò+Ò¡;ÆXÀÛ %2m8ÄdºòÏ%½Ðß+¦iÓøµœô°tW•¬W01ÁäÜAÒÁ”»ÆÇï¡x¬ÓƒYŽ¦É1¤7JsöÈê‡Zá¶bÚøÊÄx?oµ{ˆY{.OÅ©+9tìjqþ¥0Qüñ¨KÏÖbÍfº—H™°•ßò…[Ç“7í{û¤íŽ’;þÀ§âzåaÂÚ9'–æ5”éå"Å¾¯£¼»oü@~é{ÉÝq1º”Žôìø{or÷¢úüŠô#x˜Ñ#“F£8†òuØŠØÊ˜0mãüÐº©}½Ó¥†˜é¬'ÈŸæ•xŒVüÒóTˆeî?SÐÐM_ â€ÇÑËw®«Ô6+ÁcDF¡åÿ  ÿÿì½kW– ø½~E8×]$ËIæCO§õ@*%Y9%Én)í*¬V°"ÉÈdŒH‹TfVvSSv‹Æ´YÌ³ÓîFm£kºÐ=Û;XÀÂb>¤·þ‡æ—ì=ç¾ŸqƒIÉv•	HIFÜ÷=÷Üó>–B4†o†!ÞqTJñ.n› XtD-ØâøÃcž`	m¿U‹õ‹¹D »w%"CÀ*hêrö»—<P9itJ$ý[l³s"{fCÆ€ÈñC³¼än#šD*á*õÿðÐZÿÉÏŽ/“†¾*hè«‘4´-7^¾Ø›I*ÜÆ#hU€ÄÕµ¤Ê–|"*ÌdP¦ì—&krä»ÀƒÙF1Àdsâ!7’â†¥·<0Ÿ¤àâRG`>«^Œ,Ú)¸•M9{wEð—5m’fÎøÉ8Ÿ Þ XØ½(¶[N†‹±ZbÇìK,çouqr²q|ê•ï!»…€…zžC¯ˆòÐÊB;FLx'd«}!S]i.?]1å¡–$4&ò¨7VP­ÂÔÂ‡.¬cÆWa:îðTNÝ§{·|öZX+5¡&ÛL%3 4°20½²á—œ9M¬i©áËÉ]ô€ÚVºâ2#Æž¾˜v¯óÕá¾i9ÌZD9UöŒ‚r¸š!ˆ<5µHÞwISÇnÖVÉ·àp*èëÊúÚ%QŠ?TlÖô—]õ2­³–ßþ<$áñ˜ƒCf­â6Qv>dG™|psE"Ãî|
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
nHÙ¸:†§ â‹ÝAóê2\…"Š‘šÚ± ­	w”UÕÂäg Üjd—fH‰F½Z|IƒŽ•Ð²Í:Õx‹Ø#ŠÐDôY(Ô={žÜLž=é¤ðio–¥/	2ŸÄ	à“ä“}˜wïevRjÕ{dî¥ýa›gûŒ<H|(Ôô˜ *ø«¶üŒ5ø¼;Dø¸Cl*Íã[MÔïMçå°Ý¤rÒ(ÖK£†Ù›Uqc`=ô4‚b1g'v!2Ô‘³Ð¬‹*=®oŸe‘iÜ¸8Í[ªŒ¼Yy¹SLòÙ8°UžˆìÍÍÚDwÑí±²IÊ“¦Ãt-F?”È€.3s­7^¸ÙX.™’êºA3qx5\öÿ  ÿÿì}{o\Ç•çÿú%Â˜&²ùÐ3ELYØ’5m8ë²û’Ýëî¾~ˆâ0ì »;À³mfA0€#“õn²ã/°ˆˆ`þ ÇßƒûI¦N=nzÝªÛì&)™Hì¾·nÝzž:uêœßÏ‘2*]\~1yEŠm,„0 w¬€äkG+ÝIj{wÀ°«Fd›ìƒã€Ž?õÆ‚~@F±ƒ@æÇmò*7ÃF_>C0š«ì¤	½|>Ü¦­rR6îòy	£³ÊY¡ËçÆ(}U^ìg™œ¢ô¢”|Ý.»ÀoÀ%"”YÆµÜNi±Í!Ø¶A*ó¤Âi»G7šô%†2Y„WZÖÐåV@¶¸VB;põ9»Aë9¤$„ÁÜÄƒŠî½§‰À7/[¶ŠO+¾ƒ'Ícì/©àÆ ß•EÅó¾¢Ú6ß¹læ1þ0„ìÒ}|¶[í×zY«µ™ÑÍ× ë®’¥y²•6’çÍ¬G›·ßÎ¨ì«D£€MØ¬CÈìüWtsw¼Š¡‰±ã,OçfÅõšrŒ³)ÙxÐ\Ê8º÷Š‹œ'÷ûnH¨“¦6’Ô‰ŽÓã{¯9ÕòO±wiá˜w¥jÎ¨+yø`AÃ
³¹–uÜ°Â“t¶’µÓâß(á¿z“,¯ÐEkyÙ ²uÚ\>Weå^(ä<M>½m¸á"ÈöõMqðÒçÂ[‚Åv8t=‚¨«4INàñ~Î€¿7Ï	ÑtÊÜ—Ë‘\äƒÀ¢T)øM‡lQm Ç][l\ŽkÍf6gå,	¤¼Xh@€6«Rä¾ÇƒÜ»=š¤6ìè´ã*ÁVòÆVŸ}ífÙþˆC ëeh¹4ªÃÜéÅã#WåÂ¯Za6P(ê“§]!·bÎ“f„ÿ¸ôÍ‘v„fâîÒõÄÂ~!oí[æ/ý(ž‡™ƒÎç%¾‰Ñ‘TFòhÒ¢”°Bçïž†é63w³°ÁR‹(mÿV&‰gÖóQ<ì/US‰Ý6Fý|î»nJÜA	[coËTzj9w‡#W ;@¦RªJX¾2¢Ë®A—fÅ<c”ÏýEÐ!:ö“qõòÌ:‡âý·yö•;çð.Qôî°×m¥ªèâw\Ñs¼¢I”ìÀeJîóÑ‰(75¿ÌñËÞñï¡(¹©2æéäÍ®[N·½ s-4è*´Ó ]j›ƒ½…%Ôù1&Ñ©U!¨3Çü`J`°¸%¥
8å¼M³Î’ÐlæFd³1¤ºÚœ˜ãÙßÃ‚ÇìþÉ%¼Åàt5ìéù8«Ž¾˜?óÓ¡Íé¼		½Æ+Á*Ñ#@Ì³Ã±zzÌ&åÃ#?rŒ1ÓxÞï˜;~¾b˜9"&eÐvjôS½9,”J2æ#FV	Â»|¢×’©±7ú¦>;ÛUçñ]Ø»Ã&^jîfµC+ÇöÄÚñ&æ˜6ÆàwˆÛˆÓÃp·vJÞ\‡O2Çš]ŸRÖ?×§´½ÑõÑ3¯’]€t+ÝîŒj¯íhL´h¿ŸcØ‘Ñý1,˜ƒlg§•Â9Æž(&³?1ûd~JAw†cI³ãiÌZ³}ðkšO¿¨qf®N»·ù‰3Hzž&W·?š%g€ø¯âp’¢B°úé ÏŽ!J·? Q0‰½#ÍŒ²ÿäÙ[<¬á­|§H¿6GÏ˜ÜùÐœäB;¦Nep-–sÁRî§Ò7bHáãLôr5:
‘Ô+Žzç­BQGqÇf®Ï°[§c//ï$K\0o‚1ß<´p}b-ŸèsR[§Ò”Ð¥2Ì86Ï®Jè1ÔÚ4^Qw¹Ü‚ìPÁ£®Dñb¿5hÇ,¡yÂÔÇ¦éÍY´Ž·œLâ*—Ÿ‚¹„K€ÿÞý1@œgA””—Ð\PÝÎj³uø·5O*…¸Â±=ææÉ~Ù]¯5“§å\i¶'Ã*_B4Êh½éâˆ¢/Yt‰#ŸR%)ãïXJ0—w~Üm¹$-aÖuº]ñL$d§+'»KP³O–!jw¾4’¶ÝùìÉ¸Ç¿z‚”îÆKã	ÞÝF/eÚ7r‰ÙlüUGR¡±Ò8Gøì–”=¥&ç8Û1Í‰åºßÍÇç.1¨Û£JF©R‰õ4*F¼œnLµôúÖ^™V*!åJÍ‰hm‘§¶ÙÞsÿ’­ÞòÌ¹RèçgÍÕÑŽþºÖÐyVKO"£p"Ò^7 «üÖ¾{‘¬KÌ‘5æÒÊ-O½¬ŸêÌe˜Î,‘®"ßÏ]j+?¸}QsÁÈ£Ìž©L›—ðG‰áSò½”)kgµiÛË+Ø4©Ås#ìÐF ÃÏKñfjX
z¨:s”Š—žõfÜàê7ö›}AåNç]îº?$Æðë”Ã¿S2ÊG†ñ¢\îË*Œáè)?±*züv·,¬k¦Û½´ßØØÕ‡x©]ÉýûÝf‡QŽ®Rý°Á ÕèxRÅwØD=€*ý%iA0¼›ÊÐú”2 GšK|gfÕÐ‹éÆø&ù
‘cž€><*Ex²qÕ½wøy§ÁIiïu?ß£MöêOôÊá7ôãxÝÑðÍO´àµ]¯~ÖRÂmMú	<Ó‡p@×5šŒÙ¥¯jqb3æ-NG¤
&‰Ã6	:{ÏÚ¢ ëzÜm§‹`fñ@öz|”1ònî¢¼Ôw\äËT(\¹=?|¤ÌqÛ†ª}ð·ï’£ƒÿñðnŒ—¸˜4æv[0µÁÌ´	*K¿º½	vâåâ“g³l~y6KÆÃ9ÏfÙDtèÙ,€xœÍ’	 ³Y¸Z¯}’S<Ç!é‘M¬ÉtWïKE.'…ç2Ý¯¸BlãYlX²®r¥\­Ÿ,Ö2Jk	,¼?BO˜Ö‚¿|‚Ž®Œt;Üå%Ÿ¦hôÒxâíû÷¸õz ¼ÙTé|õÛ=MSÕtÛnãð„*¦_vÇíËÒ="p3ˆ[vF  'Fç82Ç“¤r<g–;g–;g–+ßqçÌrçÌrçÌrg¦\çÌrçÌrœ­­D¡ŽÇÖöúiãHØv}:„mwÀ^cçgNîÔ‰äØ¡ÐñÙäò€â‘Óöq,qc™¬G?uÎ<å,ý9óÔÎ<5Qz©Ó —:KËëÅ/uÒìR¯CYøækPZŒîùw4S¯ÉÔkD15q~¥c³+y(¦nÕÃ±ˆ¦&ÐAÎ# È‰èˆ
õ”œN¤€¢µè8ÍIüS,$Ú"íÔ‹ò
ô1ç”»jßï'Ûé6XA›Îzõ[ƒyR©×< ÷î­¶Û•9	âí
éiûèïì…½?=6G¤q¼†uqÁáz€ƒ^Êj¿Ûjf+^™{²ô4ÄEj"á‹ò‰P“˜ªª-ÊI·fA4BÂT(pJºÐŽI}ÃüdÅƒÒ]¶ç%{Æœc°åL‚)ç„YrN…!'pûXD5cÔLš fÂä4Ó ¦9JþT0òK“ÑL„ˆfÊ$4S# 9.ùÌ¤‰g
Ig"s‰Ožð8ŸP‚è8´+cS®L’ne¢T+“ Y™ÅÊäèU&A­A«r<J•±èTÆ^$¦°DŒG¡rLú”ÉS§”¡M9;’î5¦H9=Ê”©QÆ E1¬eü Ì/+à²BE˜(YJa@b PËER½ÔÕ+¬û˜0¿®ËaãK9†éHÂ‡²Á®D7P–Lw""¼UD/»â<Z×…(EKG»áGP– Ñ£°œJ‡Î†"fÃ!‡N‚”ÈqJ"#R§f
ø³‡X> Ç‰FÔÎñˆÈä]*"q¬Ã€wÕéÆžžäÖØS	3,U´“4,U¼“6,U¸“7,U¼S9,U¾“Ž:,U¸S<,U¾‰Åê™Ó	ñ»S£©ù]šrŸožF¤ßX{¼_šãôÆw_'¤vøº÷íËÃ/u´¤)i9ÇÚ³”0-ÏµÅ¤W· êøeù[GZãŠ,É¨&è6&àˆ*ÛðW‚d:iR“ÈO”AýcÇ½ýv®é?¹´Â\––sV£Y¯§Í_A€ù¬¼ÐcÍ“Q„+ø€_lgW‚è*A{Œ)äÇû?Û<Ò}¼ÕJ{ ÊH›M„-“…ãï\²Ôw‡¶íô§ÅÈ)Éì‚4.Ù4-ÏI=8öbÿ™u„N^~“Ü\[l\²Þa#ÓÐ~öy?ä¡¶ÐaÅ cÙÏè®‘& Z‚ª%1#Ú'gV²9°ä6ºâŠ9‚,s„*mLäM7cîDÝ$šìDcn´~ïèàïLÞ9:øO¾½˜,WD)ä€µ·×^´,«¸‰µQÎãúøo|fn%¦Uúäð—·Ü•±:È¸°¶¨I
%øe¯€zgØú,JH9žª7WP}“;¤ÕƒIJªwh†*© ª|F_1ÖÉŸ3‘Hèx„W…p¿.U¤¿";&W4 Òço:¯•DsM¥³(Õ¸äR¥E
ëiˆ*§¹°@¡2Sž«7ZXi;ŽÉI+†ôÇD–:L±b¢çÛ—ß}}tðeMDVÉÇ°ªq)ÆðúZ‡Ÿ·1\¶ÂÞ{­–ÛP%/ó¶ûlÂTÆŒMø¬ç1¡–‘¿ýŸï‘ïü»‡'+øl|Q§Ôs${#Dž:a˜Ôóš"™§^zvÅž¦:a±g!›b«£”î9©øÃ!M2¿.‚Ï>õaýr9hŸXú†SËJ>!Tä‹1zo	k"NäŽ	œ‚Ú.UÁÆY6“’ÖòŠgó,o;ÌÞ5RÚÖE>yÔdèd»@´'±	4™ÿ‡¼OW’ÿð‘e¥<É…å~»›õÐ íV˜¢ô1KM¿½*¢T.s@­|É¹¼4Ù%Emw¥HêaAÁŽls[]Êi&àÍ/Ûf+}Üš‡~#MŽUÈá€àôXszˆ.Ø°€âffý!X#»šÀ~÷E-mÉÑÃ2q¼Â^ULês ÞÏ³Ð@È[îŸã\ÇµV&‡«³â5‘.…Š1˜û4ÔÚmy ª¶¡B™ H)°2,H}šW×O±²Öd4*ƒ½.ŒZ:œfH³Î¿-»­,©/0}–.ÝýAÖKëÚzÈçÖâRä¢Öšà?9Fb+ÙJ[¤1h·îd½è· j9·Ùje0í1V¤òÕû9E«„ˆÛ€5óï~-¡õX^Öú‚}…sH7"âG¬Ö^5Ea¹<Š<N@îIí<Lu©‰\3ü›~!ƒ£ƒÿMÚ‡_ì‘ ¼;KÝ¢e‘uséÙÆÅÆ,è “]N†g„gNFS·þw®=jÁÚ$wª¸0rÜèê6RØµÈX†ÂLä2¨Ë×(ðù]‹¸”¦¼YJ,Ýü÷­©©öœß~ûy›ÜÎjz­rŸòAÒI€m#£ÒI!hãmBg©tÁ}¦žv“Þ `ì©NNeL-ëÔ`¨Ô³Ú®ö«ô¡Å<lÁ™ûÂáðÛi;›eÎä’Ñ›EvÍ«’.½´Ï<ç!öÎü­vš?²0=uMÏ´®•!¿ilØÕS\˜}$™Õ£êæ¦QïözYå¦ùÀ¥e>N“^­×êémÅ6N«›º‡r~9ÑÃï0' +½q/1£=Yw‘nL›Òó”~K=²A[l'ëíy³o3þ…9áŠ¯¹.ëÄ”Ž‚Þg)Œ=VË#=Ì´'tq°Ø¥yxíãü'„ûÌç;]AÜã|žêøtü‚¤^%•¤_«Ÿ’
¥ìc/­Ï
®Hÿ"±5çùU+ƒÜÏ^•ëy3Ý¥ïºcqžGuªZÙh¥ÖÕþN<žšñ²óÎ(ÚpFtaëòõºÏ²ØT¿í‡÷µ:(pQšp5 Úë¶¨"lÍü:ß¾B(Šê4ˆæ`,ð—îÞÐ<[Î”	9¨ÈtS¼Œç>")Ûc¿„åä~ÔD¼ƒý¯¶Y6ÀÐÀÎò#ÔœðV*•’AÂÛýƒF[JgšÄ%Æ~t!oÃ‹ÎZüô§ä¢^ñ9*«Ã^'ÏšW‚ý'î<©V«òîÓ*<>;›Ì“-Í¦¥K>fÔ×Éýóø%H´Åmy‰?P	PE³m‘/t `´ä«èŸê {À¨6è;›AÐã[öã²ÞÇQ.ìUk,mÞXÅãnî–ßüGf6ë%³\òlÄSKbœñ!4Ož¸†Â<Á¢Ï¿Äx·ÐGKð¼\{ŸÚRáÝ 9±=4RäÔãCÝö8È’þ šÂ2:[¨î¶K8 ¼½úí@Óð&’‘ýáåJY‰ÄôB`X…y”´®Pjq‘nbAovPt«dæÁ­/]­._'w€éßwÈfÎáÿßíÍ…u•FFMð"Aó=¢J("ÚW¬#<RyNbhU?õ$CÂ»¡2y²ô”?fa1h”í±òxs³²JrÈBœV‘ÐÛ§‹  Qª‡_² ©dAÐ]qG«ºý,Ëùy»Lú"¸Åùê.ÒÞ‘Á^2lØDmCi9Î¯Li z¡t€R,Si8e¸
<œUVBfEé‰èPÙZ8Jù‹þéTì§‘jãÃ2†wÂÄýe*^¥”™LÃ}Àõl0{û€±¹æÕÍr´œ´þ;Œ¬ÉæÞË&F‡_òóñdî—FxÀ^ÉdºW1ñ+wàÔóïhJf7bÎlyÆœ½»þÎÞ»í¤ÙâÏŠGGJ¢©¾ê“÷Rš­~õßô³Î§ƒìSf›U‚@L*ñÐ–þŒ³O;é®\Ì[IÈADž»[óô­ódævÖüôq–>½—Ñ¿3øÙÝ^Î[)KýŒ¦„„÷²ÇÙ§oíÓZ¤”…AÞüˆèË%À&GÑ©¾hõ_<¹r!ÙÖ@âÏVè>ñK!ù&IßŠ¥gÔñ*Áž=
Z¤„°¤
À°–Î‚­\ˆËÝÛ(Å{V	ð
ù§©ñ¨¢2žr49Pù3ù°Èß25ýü<Ä3è’|LL-þˆœg? ³,½«&Ÿ@Ò‰?….È¡KbLŸ¼ÖKó¨‚Kózùéï¼`ô»öÊ%´Ö«ÞÐ–]¼_cš(U6ð>¡;"ñUjæ4{%FJðEº³reí]„w?êÞÎvµ³öv‹Ž^"ú/ë&µæ`oáÒ’fû’—rOqŒWN•ß©ØËâl4Òç½¬óQ—UÖW ‡,æUB½7ÞUïmãµ¡|žOZ‘wÞ7—‹ó8’k'öaG¿m‰ž}4 íÖÎÂN/©7ÓÎ`a-ôÈv/k+œZÚÅÙBwØë¶¸£…àŠÑ-”¬p6MLw+h3×qßÚõUö6+|/b{Ž<lqÒØGÃ.kþŠØ«ÀÝæ]X|Ì§S±ðB£GÛXðÑ"óÌú'G ­Ã?‘{G¿$ýï¾ ßþB©<‚Ás°#
q›Î¯^³Ë&œå>Û>y@OZoÛšs€x[­Ñ<zõÏCànâ¥àÊdíèà+*à€¦4¿Ã<ªôÓ£ÑfkÏ1™{ˆîö’îxƒÉ{6Ãó-NŸlõ³Öp ‘ÛEYwayq…ð#Ö¤{ìÂîÂe†$©ƒ»yB’×nËí"Ãpœ3ÎFÖ¢sùÆÌ&PnÉÝÃ<ÛT«UO¨:ž<-8º'`m”Sýö*üàÇ¹ø8‹2dl·ÝÁéÏ“Ö`Î°;œ:Ã§Ôæ¦ÙõH¹yj0,_ö",ÒNÏe»ôÈ¶ëÃ}g™qBOLÇf¯¹³£KfÖ3¨©}½aw7Â+NòA¬SYÒ¢ºwÒÓ[íy¸=¢.g+GÝYócš±=\o¿¶¨µia»;¼p“‡yÞ§*ÆÌLë°%úéÈºûRÐ?Ëš@Ž¾—îs<;Ð¨öÉm:«då2h¬³ŸÎ“f BìL rôQ{!?b$­ÒQÎ±Ù¯ùkŽ,ÐúŸå/kƒ¦l>ø²ŒphæªÝ¤þxô³+ó¤²TÙÂ3Ý£âæ+³½C5 ÓKE5á>gæÈgoíC£…·öÛ£gþg4ÐýÁÃ€ñiÐ7Œ¤aß„Œªàs€Ðâ,ò¢ÅŒv˜è¾1òRakSÁ)E’cÉÙ$[±º‚s—0„ò÷Å­%šíÔ·¤øetÄãò0ôÆ¾üV˜îAÒÍSÒï“_²üM‰ZR?,Ó Êæ\¾5CÏ²3âûì?kAñåL¬øúIiñ¢o¤}3Ö}^™é®úïCdZ“l<ú/ü,:¯#ê/Wñ[gÖåè\%ß|kÌ	óYü»nß¿{óÖûc¾®ÖkÇ¿ŠQÂ…^3•EÏ>fÄà¡#:—t³|ßiŠ¦áZ‘Þ›9£…*@Û‘Í~Û‡Ñ~¯×¨âõ~E[ß¢þù„›ÐYÃ8ZÝã+åCª¬_–QÌ9,'dÖ¨Å™æyoú:+“_îßhRCë^¢%(¢—ø~›úS4ÏQyºÉ}¥[´3¬"Ý¤2Õj¤NéJé'ËË^(ßb0ë¶è¨2jÉ¼G&¦$žd)£(ˆ¹ç°	ÈGA^=OqG'í•ÑaRbïúopLƒußM/í{w‘pÞ½Ñ¤ÓÓè[ÄDú“PO·S'Ù{!³ÚSAr·&J=‘B]E…Š¥è=ñ‚E1Ÿx©bˆƒO¤P×Ñ
µytð_ÁêwŠåûAL™­Õh‚«Ê«sðž¬ˆ5Ê,$æ±ï˜âûàL\ä/ŸÚ’òõ’ÆÝUè¤ò»²¤	cæäDþŒ¼tðóZ¨ÿpjÄÌÿJrs¢€Ë…€ÇätsÇZ§—þWˆá;Ù#ÖK6¶·è^Sº\¬ÛŠœq‰šEa‡Ãæ0+R-3ÌÏ¤;‡ŸgÔ>¡n­ØÁ® Š²p–ä£hl0D²ê0¦ÿ,c%ù¾ñfŽP°Lªìÿ÷Ò=ðÀzÖ£›Ô·8¹6Šð9£ºÄ	¸FÏ&A.d2LóÆÂ“Ë×‹©ï<ìq°ó¢hbËAˆ/OŒDÞÊ3,ÑNq§¯ÀJõJ!ø
a,T»´5û9¥¸Öað¦ÑºãZZÜMSýC^$k4Ì-®3‹cêÉÄ£:ÊS÷åeTùÉÐ‰3qÜ‹z÷j=?³Ž&^L£¦9¶9!k!x‡ã<C	 ž ZL‰Xà‹–@›£ mêÄ›ÃFv¾\L'\Ðz&>2¯]9ò›SÛ mõ›SÕôÙ˜ÑeW«+lÑv×¹d»*üíË)‹2¡ÊFHþ("[Ì§çD2ýv(¦Ú_“Â/¸…²ñ+Ì%*WËlÙ¶Çs/ÿØAú8l–wpÁ˜%A—µw÷ÌBu¾Üî1µ°x”)¢°ƒt.'7–„OAh,1!Ð6]ðXÁfFý24<fMÙ,Áô³†:6O°‚ÏØóä%$*îk¬IgxzÕ-j§ãŒ¿+Åþ3Î«ÌÈÄ¹WÞœÈC	¯ŽñL11ß
3,9º•E=¼G÷¦¿îæ;T;­èyÚÉ)Ã²zŒ·±hÎÏÜ/ÍÉ§rŒÐÈ×U4Øm{¢Ó£ÛÆPï#!§8'+ó‰ºƒX¹c_{*Û®Ö¦ùŠØÏÇùÉ…å1G%. ‘ÛJçµ±…ÌÑGµºr,SÐ÷+ítv²=aí(·“ÕÍ~àþÁvå:&4A}-&LÐ®{6jÃG¿Ö†ýU°PÕý@*•É+2 *P@Í÷Lš‘!t"ðœ¶T«˜ÚUçäD‚c$ò…=¼
Ax;C¨!ZÈ£8gÇVìÅˆ©¤‚¡6q†–
ÑƒFŒsd’xb‘&1‹’ÇtSrYÃ‡Å&¡€Æ)
ùQ?í9‚Ý¸!e9†ÑÛJ26úÏylt°½BVFRÈ­Î!†ªÐÞ$‹.3¼“öÉ>ã‹j1·_×Œ‡6çbîÉwÆEi¿¤IY5(ûza2èÁBÃO©!êïWùaõ±È XEv~nTt5^^>î]¶¢íîú¾#¿Œ-qRUwXš,ó:T”Õ‘‡w2ˆs,h3Óþâª*2,–0?½îµ–ÆïQ•…¡ñÌÕX¨m×¦På ¥q2Ÿ*Áà±ÙïÜ„w’ïNþÞÇxxæ*¶Fu½Ûé€.ùkZ/Ónh9˜v)°Ò=˜ÏnÈ@ñŒº›@7öÍ+Æ.Hék¯_5ß¤¤ÆÈ2¥¶Ùë6Uäá&ýc?™«öìñüN¨´±¹‘ì¼Ç¼@¡Zßh¡ÙnŸÔÙý>É¶y«"d1ð¢è‘„ô»i­¹\…_Í]¨í:n¨ö2vrA†½(zš}7;Œ]Œ‡ê”è“ä‚„¤äßTÃè¤@g„‡Be¼_×  ‡@t<2cS?Ïƒÿ¡2²¦ÐL°}Ì&8³³‰ªX¢öUÌ„gìµ`¶&b§…îó9lÝ,™:ŽÜB}¡w%Ð*9nQ¸¯ÈáµvÊ¡ˆ0hGïñÂˆ)Ô0žÐƒ"&aÃx"'ˆ˜ÂðGn1„ÆÓù Ä
¡ŽpB‚NâÄ?Â	r|2žÄWÆ·Ú`ˆKe\Ôè'­´0”Ôo-Y/}žv†©ÄYb?´`.àwm(±6‡~˜'Apß¤“ãÝím:’gM”Â|+ã„@ê²àq5Eí5G~àX_ñ#ÆØ
? ³prcÄ…0‡^ø	Ë) ø„~°L®NSëãT…ƒn}¨b”.Gºtrl3R­Vá×¼=øá£¹ü|E	ÙÇ~xFË¼ySë–ÖÕ×Ö-Ô«Ö=ÍÑSÖÑ'Öõ¼õÕ6yè/—Ož§BÆ'ý½NÍ)éùÂjGSR…­žíJ3Þl…S>‚we­qôêjüO‡´‡G/;– bxV¡›d¨1Š!øþKº oüŠ<?:øuSC•úª`»¢(s9ì(»5èíƒ®%{ØÿkúêT8HàƒW¨‚AµJy‡+,Z©
†|´ÕªhŒÁG[±Š|Ôªå‚¬1åÊåðA«—x²š›“Ø/ÔCxCéÕe•4_ÉP:qM%â«JÔmmAC©Ðu•X˜Go<J{ÏÓÞf³MµÜ¤Ý•vÅÑ¤R¿¸H¸!ÝÔÅýd7iÊKÕnØàÎÖ·æIÅÔä*)´°y}œÏáw=¦“¼ÑË:ÀÂ´Û4HF7èÆf@€ÂÔj`o³?è#!Îtñ¦qÅ¢O=5ý@Â¸&|¨L×J=¯ÝM¶©6ŒPBãª
Äyíh³ÑB´»É ¹Õl5{(û>~ð¶wb5µ³æq-ÑÁÆˆÔ’A­A×@z›îvæ¬öÉZ©€Zž^úWçlÓmWZ_á/‚œÐKòuO*{XI×ÈÉÔÒ,¤s'ù¦­Á©¸yEXYU5\:žfž|ÐM{ì¸gs¯›V?ztûÖæ»®!,_qÁº¨Q\]¼¸ÃM:™×Åösv.w)‘$>ùá•ç»OIkGÐX]{Ñ²(œ'ÿnf+dÑ¿´D¶’Úgõ^Ö]Øj{š·€äŽx’žâñy3‘ñ±ÙùŒ}wà=úÐ®’î–yZ~$€Ç„t´¡ îŸ#µ³H åE'ÄFö²;†#zì~Þ¦¾ˆtˆ^ÙL_@ÀTt5
#Ò{XåC‰$%¾BH‘Ê=Å½h0Œ…4`¨0å#EtŽßtËÏojäÿÿÛ¿Íoä>íTå7­)6c¸ëÄŽä\;…P“e°&C¬EBðøøˆÂâò“Fø	
M”´ÌO®{œ®}â@0u’Ì9ü -ºAŽá•RLv–Še‡5i/åþS¶·¿×ÄÉð c¸f|€ßI­Qê˜¥‰„>2¦Vˆrï|£ˆ¦ƒñ—+BÊÊ1âT¦üc0qÒ9¹¢8"¦gÖï¼sÊ¸{÷” |
§\„Íæg§\ ‚8å" ôÂ)!
daºEˆAT˜n	ÓÇi•AŠké2Ù’(„«¢C¾ýÙ©ÉhÙ·³¤Ã"ò_ž\I$JÀ!¦…gç©u¥ @×$#ƒÃ/ja…"W >A  @*áX±fqäšØëiÄsëÓÈ«.]Y²Qå`sl…‚Ç ¹]Ÿ_¶ ßré€kÑ]—eHñMéõ¸P™{²ütD|7—ž†«ÃãÌRáÐj®(®ò"ÑMúgìÐíáâ­JDwŒ:î‡±ZÜš¼¦78­Î°S£¨0Î,_âÓ†UhØO{TJþfž¨7WÔ	¶û%c{Ûª:WP{°ä¬¤Sè·çUh>ìçDÌg€Ïa/@IQÃI”(do»/ùÆ;o÷™õw8ËÄ¿|µjù~9}
\_1ãB”2*ºA|4+Þu¼êà¶¯0">g¾gŽ‹oXÅÊTðœl½¶ùE¤Òƒ»z€{Ìè§jÝ¤×Oïw³iuôvÒA•jŽõ“’ÜøD¸©Gy˜{1U´œ\²{0.[>›,ü{ª#³°ÎÅÆXbÃô9ìcÕPSødýû-0&4&ÏÅÅäÅ…îv.,ØÇ²™¦$*”gÍ÷[PLd4ž‹‰É‹	Ó÷ó\P°-(TCMIT`ïºï·°˜Ð˜<“–ç÷¹¼`[^ –š’ÀÐ|l¿ßcRÃò\dL^dÄàAž‹Ãß}J"Có´ÿ~‹ŒIËs‘1y‘U=—8êeJÂBEÚ|¿%ÅDFã¹˜˜¼˜0¢8ÏåûØr"o§)	
F÷ý–“gATgÂ»ÅLNëÍ“²s:àŽ!1"rÈá\kR#N¤šuôˆvü!LoÃ”‚wÏ+ãÊ4}Ÿ¢ §û¼vkáÙ4Œ“\ä0·’pƒ;#kœj”)-r8šûYå0Ú¢Åw‰¢±ÜYXÄ^Ó9îX½0¸Í™ÒsÏm4¥éŸ#4¼ysã¢›ÓJcq²Òazb š#é¥IÌ Ôâ[…ƒà…»ªæ½ØKÛì-fŽ¢=‰™=ôŽbmíÁñÂ  ¢&•=£ _$f8—KÈD›?Q3'4mÆ›šS¿’ÎÚ, ¯5v3á4¿Â£d$}‹à‡ Ÿ<9zøþ€N´#‚‚èì‘bº«ðI«ÚBÁ@M  † ›@ž]KRþ‰¥?Ê?Ær©£ À"KÞêètîÒ…ð’IÁEGë_~ÜÄ¿IÄxÜ:Õ¬ôóÉá5ŽÌÒ‰êˆ ÛN\®×LØƒêlC­3¢È@>«þ³m œ‰öá½£ƒßíM¶÷&¨Ã”ãŒ€rÝïêûbÚ2›Òûš6$8BõŠ=ëWbg½{ÊK„Ôø9?QÞÈá·E\ñ°©1µÇGH"\ÔÐ<ö²&gp¼¡$>¶…zÂ~ªß5æN–lÌ$ƒÉX[7ÓNÝ€D9&`Œ?Ä8”á‡»ÍzÚ˜Jœ¡KÞõ™õoqøF @v‡J¸^qy]^ÕÀÃåEøPÔ
‰ú1-hÖ<àÐx:õ­V¨!² gýáV»9 Ã¾O•WBgI`N°{°ûÙÃ¨ÓFÆ7È‡iRTÛSy_€Bs¨h§Ó<{+ÿÿQ/Ûn¶Òyú~–å‡éOèûT}v¡˜ùà¥ám@É"žf Ñ÷õk%zv;iõS.Ýã‰ü{úCtA{´Rq<'ú?).E<Kïìd½=íaqMú½£ƒ?X Ã¹rzÔkf½æ@ËI^ÓsÚìØóð÷ÏçEûš!ö‹läOfÛDèf†=À½•ÿ,lznûê}ü·ýÔ2•YQQ…›j€_Ä}’ý¢Þi
7ñqà¿ÊÇÃ&iþm&¦ðuõÕï8Bêïè´=ü_œ™þ¯ÈóÃÏIçèàWMR*p>’# Â÷‘ƒ*“zÐkYèÈšY‡ƒó¡27¯Á²ýØ*ÑÆ-º]ãuËÈŠ“ˆ1¦ÒÈˆuÅðÉåc%ê³îZ>Ì£ƒ¿#/èF›îOœæúýú*û[6ëæ=‹-n§ðÝL òx‹Œ›U°>Èèsö ]Ó»­dO»–ÚÄH8k™GÉ¬Y?Î§žv©
Òfm®å$±Óäø‹šö\­—zJµ&#™roñÃarÖé·Ä¨0n‚	K6ðt´Ê»´³›dfCÎüßé8?:ørJ˜•¾Ë1+­bBVbY¡„‘_P(ù+Ô´'Ý;™t¿f´ðBœšu›'J.s`Y$Fòb¯¢ï WLO$jÙ`¤ZÈ—z±1R/0À+æž’âv`ÔÆ ïj#Vu’5^eå¡SYvØˆtuÇñR#ÇÞN:àÎ¹²nYÙœì“8ì69(-K€ öAÍ4%ëª„cu’p%í­´§˜¦ùÏkxÇ¦R`$UFÒØÝÒÉ|Ï¦‘ôúv ß—O2týH«Ã·¿Hè<‰¬;©Ë«À~i5ÈïO¨zá|0'Lq¤,¯†¼pÍe'›heŒ‚ÔçÛ—°	ÔD™w¤‡h’uà…3K_O·“akD‚wþI…%ŸJ¥ñÎA™Äš…Ih('[³lö;gC…fíðCZ•Î¦$s÷ÖÛcdÀM ¢(*z¥§Ltœý¶5€t"jT5z‚ÅaogDè Öž“ï«¹Í ÌÍ‹q“‹S·ë«ì{/Û…ïEÎDfŸx­±bR¬”À#ö0›Ú]haÈÀàÏÊ]€ð²­ùM:8ÖÐ¥=ÙI7š½šŽÂ,àuÑá‚i×a›}Ô`JÜ=¥ªþ¹Û¤â²I~2Üc(ÍÓaÖá<½é+Fgtp˜ùÏ6i–µóP~ä6³Îõçgëh³ÿÙÑ«ÿWãØ²9À,iÑÂÂ¡YÆ
EµÎÎÎ¿|E‹Ë„<Tâçä9Ý”vÖ»Úà1ëï¹¬Í¶5ÞÜzÃÔ0üé¨é+0‹¯ÃÂ´_Ó…ÐÐuãŠëceyIC«Kè’Â_Ð¯%­”®,Õ¥•§$¡ûéç©¸öÃ+á¡ÉNÙ8‘§ÛõÕ]vŒjlŒ€G-ªR;F&ËhLÀž/_×
Î¾‚÷ÝDp=†5Ž7^}þŒ×ÿF6?<:øÙ×mÖÈT¨•Ù[·Ü8§¯ºlŒhlè†Wsâïôšuÿ<ëÓ±-uM×}C#–¼pºdœ‚2|8a=é7Òº\lž]ÓÞ«“²c‘,ú%sÑ` þv5R®6b¾-(W@P®,Ùpù—ÆƒË/)¥œFòhÅ	ŒïW/áæ•
 Ñ4š»å POø¯ºT~÷5“h/Aõë–|£”¸šÇÙ=†ŒM¥çw_'ÌÁm°è~âPµ¿¬qj$vØë(…£ÙÜ¼žùuÅ<N6*ƒÔÏ`ÆP?/YS>Ötd`¢½ô'~0Q>+~(MçÁÅŒj#åßí‚°Ã’ç"VˆlEà¡]P¢&»!í±¸$úœnpÁíA·g‚#¥¿èÊàÍ¬î|Îd—¹óñjöW²ÕÏZC ºÎº@f*‹ÆF˜‘“h› ¤ÓlC©ºt.ÀÌtpÍò…8‰;ÊÓ†¶/«˜ÌŽ)b7º	­™ˆýÁc3im¸¢k%fÄ¾v3ë¬_¥É;D!NöÍ#Lj¾-tŸ«¸ìë† Y5ÈœyysbãÁMGBÕi¿úß¢CHiÿX-±b4"!€Y{²Cwò‚:Ä·Flá¬¢cÝ–<|ž/¬Å,ßqÕ½Dä-¢áUBl—8 ñZ¼Ä#—ƒs#.‹Üäˆ˜bb8—'r¿¥ì¤¶•kTÐ]Ó]95IÒr
ÛÖ>ê§=—†s™¾óróè…/Âý{Qéè0´yxlÃ–1KÎ@6Âä!^ðÒ‚2¹êöôTåºf€1ÀPÑ<°ÏÅErDž±å5X+º?d;ü©™­,ˆß!¦xtøoÝr×ÃZÀtýÕ$^0IöûÉvz‡¹°³•%?Sœ'•z}ñÁƒÅ=ú!÷î­¶Û¾7O™9è½ð2uâäõu5d¤hJšë¨nRÒ”7l"·íp+¹>g©™RÃ¢ûämºÜÀß~«É¾,0&7ÐØVô½w¬ˆÐ´¾%¡õqÿôŒ®MTOXx²T]ºRé¸ö¸ÑL[õFJ‚¾lkfèÂD\E®øˆÃpòÕÎ À˜ËÌºîyŒæ-·h<r\”À.©…½”Õ,“†¸"eÌ¯üôSÎ¯â©Åû¦H÷œ­ÊÈšää/ú¨²†*SP5cûŠïÑ_Ø­²Ø„ùŠÀšY‡#è}Ôêïì•Yd¼-ë÷Ç-’V¹êå—UºKÙ®âíNØâÔÝ³¶ö¸¨­ÌÈ&®øÚ@.YWâc…:Œg¡â[0y˜Z3Î„=ƒÈßEŽý°ÏÄÂ?ön¾ÐLêê›^ï²ivtëã~
º€S·apß÷ÎVÝ‚N	D7ëH‹œ)Œuœ?*Å#7<¼Yõ=3ò‰;ZŒY%s3‘y* N
ÐjbjÈÎX2{…!sF#¢˜us’ÛóÜ«oYzöþþyxþÙ$èŸß<sý¹_¡r¦‚/‡woýØ÷Tä×í™&Ö$1,Ñœ~ å”ßÓ½ýÅ·ÉÃt—H÷ÊY=i‘·óÔ°á€kRÛ§H(€ÌÏÜo
àÖŽ2%¸™h„ue¸ƒ0fJý²±piÅä^óX…qòdË*..Ûç…voaù*ý3€?Œ¹N¤šyÅÖ
™kÍ£býl˜®ËªÆI'°§½ú"Ã–òöÑÁ¯›¤µŽŸÜaE`´7Zæ˜‚Å†Îª¿f˜/éš38:øG~@J(>¸"Bìá€®µ£ƒß%ÀVûE©³Rk]¸Nl§ïØÊf ö*ÊnosÂ§óãØƒÆ0`ÿœ•”9â­ú´3÷‹5EV7šÌ¬ï—wÑõ(‡Q‡^g£9…¯ÂVÒ™^S:|”ãÎeð†N³¯/C¹ïî-ìÚûÉVjGöŽß1¤Ý‚ÓPä&²¶ÈÞá|ûã|ûeì¹áo‹%‹G«¥â	·ùnÒ¥dG?!’Lí¹ÜÁ«&R“ì‘‚¢îl!üÅ¬Ô¾mÅÚ¢VºÂ8Ö~TH÷Š*Ü}:sE‹ÏàÈÆÈ—ÿ’¥„Ô%2ü‹áà7³®¾™ÙÃÃßtHŸN»ˆÏüÇ˜Ù±	LkÙ`œ–¡,d
ï¦J%qå8•Ò³17|UãÊ ùîë!‹Ùé”ž¥ò°`–æIÎgé±f)÷íT>žc~ä¯j8¯Ž•ÝF’	Ü“ŸHnË{™É5­©µ‰Âß”+wnùÑ˜ªNƒŽè´wcæãú*yŸ¹9~ÆÕu ´ÿY‡)÷?'õœ³¸Z­:ØÇYò(˜Í,T¢UÝŠæ2è²bÓwî‚ŽÑÂ³”%;ŸßÖYj¯¥vŒþ±Q>äZ^a…4Í²®^~²‚ ÉôC_‹Ñ…bÀ‰ÂV%mÀ?8ü¿tÇúêKòh$(˜ŒíNÙ¤Âm(=ƒ±·0Ì…à¸"©äÈ”ÑcMÇ¥Â]B~P}	<=ì!ë5¤¡0Œ—,,ƒRßˆ³9³ÞvžæÁ”fÚÓ‚Á”ÐqpðŸ­¶uÛ½cÖ}Å®û¸žÚ~Iï·]ÐˆŽ(ïpÃÝ=:øý}òãÃÿøÙ8zõ÷1{«-unõzÙî‡Ìàå8>¡‚Ìu^ân{k´[ÐuY³¸òÃ
nV.¶¸^¼¨"BMsë,$a#ð"|ƒ³Gå4Á*™S³ÀæLK‘fØiÛ^ñq¸¦l•1¾þÑö_Úüúd©º’¶Ÿš‘“¡²Ê|âä`»©<—fNÈàZtZ›kDn·×ñý$b<]ùc~UªÃ~«kË~ ÃÍxwä\[l\Ž³”ºŽ‹—À‚vÄ“í •ÜÒ:/ž¬ñTã¨u;pñEŒû4ãbÓè¥ý'f´õ¼3Þ_~Ê£dº#F@l‹­‚žM4‹ àyøN…m5	Ÿ78FÃGµÈþ3-ñE8¬ØŒ"§/oùÝ1hÄˆÐ oz§Áº>eûE¡›bùl×Š[[^ºR)zß*{:)WÒ:Uª	ÂZñd?zæî¿#bA·¯-ny·]@b¯™Iä¡
dÒûÞ+%ö½—­}oÀÂ1‘]¯È´Ü?,RAip´ûkˆz§‹õÃ?vvŠw¿Åžm®/ò™9¥]¯cåzw½ÖVã{¼ßnpoy‡©owkùÙÒÅáR|[[í '¤ÿþ  ÿÿ ww¼