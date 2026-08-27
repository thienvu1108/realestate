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
  FolderKanban,
  Loader2,
  Edit
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

  const blockMap = useMemo(() => {
    const map: Record<string, string> = {};
    blocks.forEach(b => {
      map[b.id] = b.name || b.blockCode || b.id;
    });
    return map;
  }, [blocks]);



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

  const [adminSubTab, setAdminSubTab] = useState('budgets');
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
  const [editingTeamBlockId, setEditingTeamBlockId] = useState('none');
  const [adminTeamBlockFilter, setAdminTeamBlockFilter] = useState('all');
  const [adminTeamSort, setAdminTeamSort] = useState<'name-asc' | 'name-desc' | 'code-asc' | 'date-desc' | 'members-desc'>('name-asc');
  const [isImportingTeams, setIsImportingTeams] = useState(false);
  const [newTeamBlockId, setNewTeamBlockId] = useState('none');

  const teamMemberCounts = useMemo(() => {
    const map: Record<string, number> = {};
    allUsers.forEach(u => {
      if (u.teamId) {
        map[u.teamId] = (map[u.teamId] || 0) + 1;
      }
      if (u.teamName) {
        map[u.teamName] = (map[u.teamName] || 0) + 1;
      }
    });
    return map;
  }, [allUsers]);

  const filteredAdminTeams = useMemo(() => {
    return teams.filter(t => {
      const q = (teamSearch || '').toLowerCase().trim();
      const matchesSearch = !q || 
        (t.name || '').toLowerCase().includes(q) || 
        (t.teamCode || '').toLowerCase().includes(q) ||
        (t.blockCode || '').toLowerCase().includes(q);
      
      const matchesBlock = adminTeamBlockFilter === 'all' || 
        (adminTeamBlockFilter === 'unassigned' && (!t.blockId || t.blockId === '')) ||
        (t.blockId === adminTeamBlockFilter || t.blockCode === adminTeamBlockFilter);

      return matchesSearch && matchesBlock;
    }).sort((a, b) => {
      if (adminTeamSort === 'name-desc') return (b.name || '').localeCompare(a.name || '');
      if (adminTeamSort === 'code-asc') return (a.teamCode || '').localeCompare(b.teamCode || '');
      if (adminTeamSort === 'members-desc') {
        const countA = teamMemberCounts[a.id] || teamMemberCounts[a.name] || 0;
        const countB = teamMemberCounts[b.id] || teamMemberCounts[b.name] || 0;
        return countB - countA;
      }
      if (adminTeamSort === 'date-desc') {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [teams, teamSearch, adminTeamBlockFilter, adminTeamSort, teamMemberCounts]);

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
    const existingNames = new Set(teams.map(t => (t.name || '').toLowerCase().trim()));

    const targetBlock = newTeamBlockId && newTeamBlockId !== 'none' ? blocks.find(b => b.id === newTeamBlockId) : null;

    for (const rawLine of names) {
      let name = rawLine;
      let customCode = '';
      if (rawLine.includes(' - ')) {
        const parts = rawLine.split(' - ');
        name = parts[0].trim();
        customCode = parts[1].trim();
      } else if (rawLine.includes(' | ')) {
        const parts = rawLine.split(' | ');
        name = parts[0].trim();
        customCode = parts[1].trim();
      }

      name = normalizeTeamName(name);
      if (existingNames.has(name.toLowerCase())) {
        duplicateCount++;
        continue;
      }

      const teamCode = customCode ? normalizeTeamCode(customCode) : normalizeTeamCode(extractTeamCode(name));

      try {
        const docRef = await addDoc(collection(db, 'teams'), {
          name,
          teamCode,
          blockId: targetBlock?.id || '',
          blockCode: targetBlock?.blockCode || '',
          createdAt: serverTimestamp(),
          createdBy: user?.uid
        });
        await logAction('CREATE', 'teams', docRef.id, { name, teamCode, blockId: targetBlock?.id, blockCode: targetBlock?.blockCode });
        successCount++;
        existingNames.add(name.toLowerCase());
      } catch (error) {
        console.error('Error adding team:', error);
        handleFirestoreError(error, OperationType.WRITE, 'teams');
      }
    }
    
    setNewTeamName('');
    setNewTeamBlockId('none');
    setIsAddingTeam(false);
    if (successCount > 0) {
      toast.success(`ÄÃ£ thÃªm ${successCount} team má»›i thÃ nh cÃ´ng`);
    }
    if (duplicateCount > 0) {
      toast.warning(`${duplicateCount} team Ä‘Ã£ tá»“n táº¡i vÃ  bá»‹ bá» qua`);
    }
  };

  const handleImportTeamsCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingTeams(true);
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

        let count = 0;
        let duplicateCount = 0;
        const existingNames = new Set(teams.map(t => (t.name || '').toLowerCase().trim()));

        for (let i = 0; i < rawJson.length; i++) {
          const rowData = rawJson[i];
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

          const name = String(getVal(['TÃªn Team', 'TÃªn phÃ²ng', 'TÃªn Ä‘á»™i', 'Team', 'name', 'tÃªn team', 'tÃªn phÃ²ng', 'tÃªn']) || '').trim();
          if (!name) continue;

          const normalized = normalizeTeamName(name);
          if (existingNames.has(normalized.toLowerCase())) {
            duplicateCount++;
            continue;
          }

          const rawCode = String(getVal(['MÃ£ Team', 'MÃ£ phÃ²ng', 'MÃ£', 'teamCode', 'mÃ£ team', 'mÃ£ phÃ²ng', 'code']) || '').trim();
          const teamCode = rawCode ? normalizeTeamCode(rawCode) : normalizeTeamCode(extractTeamCode(normalized));

          const rawBlock = String(getVal(['Khá»‘i', 'MÃ£ Khá»‘i', 'blockCode', 'block', 'khá»‘i', 'mÃ£ khá»‘i']) || '').trim();
          const matchedBlock = rawBlock ? blocks.find(b => (b.blockCode && b.blockCode.toLowerCase() === rawBlock.toLowerCase()) || (b.name && b.name.toLowerCase() === rawBlock.toLowerCase())) : null;

          try {
            const docRef = await addDoc(collection(db, 'teams'), {
              name: normalized,
              teamCode,
              blockId: matchedBlock?.id || '',
              blockCode: matchedBlock?.blockCode || '',
              createdAt: serverTimestamp(),
              createdBy: user?.uid
            });
            await logAction('CREATE', 'teams', docRef.id, { name: normalized, teamCode });
            existingNames.add(normalized.toLowerCase());
            count++;
          } catch (err) {
            console.error('Error importing team:', err);
          }
        }

        if (count > 0) toast.success(`ÄÃ£ nháº­p thÃ nh cÃ´ng ${count} team tá»« Excel!`);
        if (duplicateCount > 0) toast.warning(`${duplicateCount} team Ä‘Ã£ tá»“n táº¡i vÃ  bá»‹ bá» qua.`);
      } catch (err) {
        console.error("Import teams error:", err);
        toast.error("Lá»—i khi Ä‘á»c file Excel.");
      } finally {
        setIsImportingTeams(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
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

  const handleUpdateTeam = async (id: string, newName: string, newCode: string, newBlockId?: string) => {
    if (!newName.trim()) {
      toast.error('TÃªn team khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng');
      return;
    }
    try {
      const updateData: any = { 
        name: newName.trim(),
        teamCode: newCode.trim() || normalizeTeamCode(extractTeamCode(newName)),
        updatedAt: serverTimestamp() 
      };
      if (newBlockId !== undefined) {
        if (newBlockId === 'none' || !newBlockId) {
          updateData.blockId = '';
          updateData.blockCode = '';
        } else {
          const block = blocks.find(b => b.id === newBlockId);
          updateData.blockId = block?.id || '';
          updateData.blockCode = block?.blockCode || '';
        }
      }
      await updateDoc(doc(db, 'teams', id), updateData);
      await logAction('UPDATE', 'teams', id, updateData);
      setEditingTeamId(null);
      toast.success('ÄÃ£ cáº­p nháº­t team thÃ nh cÃ´ng');
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
                    xœì}moäÆ•î÷û+Ê½Y«•¨[ïòX+Í@/3ãgä‰Gv¼;0bv“êæ›ìì‘:Š>d‹Å½Ábmì.‚Åb=ñAr×H²ÉbqGöCÏúèÜŸpÏ©*’E²Š,²[M<„=êf“ÅbÕ©Sçå9çlI×1‚àÀXÛÐ:	[——†'ú9pŒÐj­/-‘Ð¹]øÒ¸y:
,¿mÛ9ÛZÞüo$wl-šöÓüÒÓüdæìéâ·É¯c;9ðBûÈ†gÛžKvGa¾½x–m¦CÉ=Ós÷»ûdû´9O¶o’SIo+¼°‡=°ÜÑ{CËmN`Íÿ…êêCËˆýÚ·ÇëÑ;a d7že;L„?íºMÉ£Ç­£‘ã#Ç:!vh‚V×rCË'=
àáãVÇ
-Ë%Ã“Ö*Ž[+íuâ{#×´ÌÖ‰Ãæð$ Gž¶:ŽÑ}óh¸}nÐtèºýÖÀpíáÈaC<è@[Ï7-¿± éÕÈõ-ÃŒG`’›dIr)!·H£ÓƒGŠo,ñ†Ù™¤+ì"ýv¾}ÃôŽ[Á !mm“¶åâFÜ;íá9r7 Í¾÷Ôò7ãû–—–òÏggGB¼@¦âZÉOJÏâ4¤+b×rœ÷m·—™u˜â5Ò‡ÿƒ¾o»OZKå ã`&Ã…¯Ó6ÀwêÀ%]«ã#¼ü¼éüY”ö'îÍÃþäÐ¥Îä™GÂ¾1&/>¿8ÿ©MÜÞäç.	&Ïºý­Ez¥ÞZ†u«ìü›oÓŽäÆµßZ'Ûm·¯Pn¾´-]ükD÷tÉÀtû^ÀY—ÀÕÄ•€§ûÐ$¡ïµVØzF:‡Š·Ë/lù¨åèlk‘ñ­ÜR2æì+Ä“MFÃ¡åwÀÂUÞ}BßÆ6­ ÄáCÖ K{	tçàòàâü_öÈƒÛH¸x–€1ÞÃÁoŒa³‰ó à§]Ï…Þƒ?{Þ`è¹09d›N\Û†“yÎÈn°ƒnh?µàZƒ~84:d{›ßùÔ ’Ïßê[áÈwåt¥Øðxb·O“ve¨µqàÛÁNÔßfÒ¦tëà×WØl¤û¥{/eÿîxÄ3¬ø=Ú,l×´{åoÂå;ÃÀŒ>ñË«[L3DÉn°.ÙðÈ-T<äLaº¶^-å;D<”ÑŽÀ˜¼.¥À®çx¾ŠóÓRîÄ–€ct,ää‹^-gõx°&:†Ù³È°X‘rŽl×2‘Ý¿l q¤›Àqë¥3ýÌ{Ê×£šåã!¥¦„õç.Ï²‚3h@" ïyŽc»RòŽ	û%	FVhtbÚ¾Õ1±aµš°!ô-2`ò´éÇ0rÈÑßÒ§iö;g`Ãstö€ìèS~ô# ÀžÉ>ìt»¸@¹ôûÝýýöéN‘k8Bãèh^N [Ré$³¤ú­á	%82ÃÀ®ÖPÈ7W´}~÷ƒ‹ç?? ‡ï_œÿO…2¤ñ~@9]«5n-“¡ÓZV	™-\PjR.ÚÙ‘Ýùè‡ÿhÔÁ]n®3‚usóQ´©¶.vhm`ìPocœ±&ÛWÌœ^fóòsŠ½‹F2lmDÁw.FJoK7.PiêïFìrv¨§&ü{ð²–¸­À€®Â¨õé¿ñ¶¢Þ.h+”»}wtñüK—8“?’ƒr!¾W%ä
—LO•Cßûkày¯É2‰ëM—»#Û1Ë®Ìš4÷/ÎG&ÏÜëA—!h‹¯‰’Ãõ¦ÈËfMh-¸”ht»Öµ®õš…±¸Þ4yæg¯o¸:º<èõí‹ó¿€B0"Þ=Ô'LÕïJG.Ä¦•ˆDwP¨ü)—*Î¢?ã5ƒæÃp½2è=Ûï‚;k.ÝŸ|áöÉS{òëk"7À÷¤£×”™ŒÄõ&ÎG¼›3!Í½É6ºcžÿGHúÀ±a_œîöf@›§}#xhù;`2šs};=Ü~j[Çs…|˜> ”²5h›?r*Ò®DÜ×ˆ¼%ÇÕÐw!…Ó8Lÿ;¬¯SyDæ÷/ÎÒí“àâü+bNþÍ…ùäÇ¥,¸\2QË x¤äÌz ÓÓÆg‚¶eÚáÜüÕ,á¹¯—·gCò*,‘G}ÛrÌÇò§µºEËäam?qm§†Ã<ù·-Õ­•|
ÀOö\ænø=ûÌGqÇó³NŠ¬ùœƒ@Â4ÝÃÖ#0ë9ü‡å:/[©Ê¥èx=o6é¢Ì7õÔðmÐq¶èMðGÔÁ"ñZ¦h¥Äs+.N ©å%Ño+¬F¾>ã¥![™ŽHæñ¾×{o”!fê•”Ò/£ÙŸ½ø›ƒ»ä£.žÿ‹BÏÜZÜ•gŽ˜2'R_&O!cpô=x{ô£&dsjßy¡qû¤kY&óN&1KNã'ËÀ5Ða48i£ÐCþ·F†!¼³Ø·ø©éZZÍQj¯e:@¢ëKK‹Ë1|i%úü¸’Â1Ý ´œøæ¯øÖàãhVóOÉýëYFlŽ|:Û­Õ¥ì"z°ñŸV×sˆÓÛ¤Ÿ}ï˜“"Ð°Â®¿¢
8×òNí/BX&Þ¶*q‚å¼ÄCª	#šòîò‘Zå3[©§òéC\ ½¬Z¹N}ÐÁ`ó¸µú­9Á«@RJ?]¡L¼Oýµœû–®àºTø*}6lDpwTlç
ã^ÿâùRØÏÈ{GGŽíZ‹ûÖÀƒS“/Iˆfuú#ˆiO&_ô½‹çÏBé†Ð_ÓôËFÒC`lÊ³Ë@·@Ë·ãÄ23x>U×¿~†Rä?óâü7ÄA#×»ýl@“ŸÉ]ÏÃé½cûV‡­{qþKƒt û.{»§_ÿöâüË6ÙÉ3Ð¸ð¼Ûƒ?ð–øÎ×%hô¿»dØŸ|EÐZÐCœÜcÒÌÃð}žëE0„ed$1©Òé½½ãÖR‚¸IÍÝúRÂÅ7ïø–ELÃvÆhdäÚa ]žF,ÎÔ8Î·É‹Ï.Î?¥Êã—|Å/½”
Iÿ~ç¦@g4ùƒË§2žßÐÿF 6+½ýórqþ+8ƒûøC¬ÛGqäS¸Gîá4Ðstea"éÀÀ¡€#ÿ‹.th¬yßëy
…Ñ³æÛRB’#ŒKüûñÞ#˜tó ¦ÖFð#ÌÕäY—ì½ÿÁ>iö'¿,G0NÆùhò{c^êùáÍ)™t‰óõoG0<øŽO'_Ðaû„Râk	oèöŒ1Êj¿Æ±œü«Û>£ö·aŠ ÐÂ†Åt<Ò³'”(=ú[—ž~ŠãØ}Cw€ŠÖ™“zè¥˜‡‚äE?Á@¿âþ(cØ»ü#ÛÿR9;õVšóÑõ\üEõª‰HÅaá¥Ø¢tòï¿··sŸÜÙ¹wgï]²³wxïÃÛ’¡¤o¡1˜5å–­ŠÐW‘R´±#6ìQ×÷ø	¨J ¯€ÒÖi8m>«¸“E_Ö¨ªWmÐ«ÖpJaŒoÄWoÐIŽö-ƒ¸¿’ Ó_$ð\Üõ¿g9]o–„¶v±Ä&lÌ6œíS*F‹‚G6oŸž¦Åä¾e÷úá&™Ãá˜Kk’ôÒÇ›d9}~`ø=Û=ô†›¶D{{‹¬Á‹ß]¸ëH:H]{®]Þ®MiÞÉ|`w£éØ$Kí•ô…ÂB@Ò?r€¦û¶iZ‚ž¢ŸÒµ™•¸¡DaC´%×Ïú+96
ÂäÀÜ¤Wâµ•…KQÅ;Za!N‰\ŽÉnŒÐ2á›!ÑÃ6ê-QbÚÁÐ1Æxá­6|´Ãæ™›o½asþŒü¿þü'j…7÷$ö|ÛE9¦qóÐá¾6ùù 5}µxÚ åÍP#ºÏGø5¾¿"9+Û¡¨/>™ Æ¾,Ó*g:,§ö8} öÂp¬`Üåú°ýÁTÙ º¸“£Áîá?±B›mçÑ>¦ ì%ÛŠÒß³LžSã÷ÿ¦í—Äí°þ•áx|K5íX^ÉsZ]2TÙn^ß·Ž`xÂpl..þÚX‹K7Ö×6ÖVÖ××e¨cP_z¨ùß‡ã>‘]2ívÃõ¼¡åÂòu=xˆåû°Aå/-Ý”—£~†´çƒèW´B¯å“#ßD±7 ÷G¾m½ÉïËñvœ\†çØ&œÚá;·pv-Ú¼3hñ8\wwaËìêÝŒGl $ÏYÏ’„Â·XA Âd±—ðÈvœVw#ï†B'Å˜šá¶$¹yŽÙ7Þ‰	SA÷[‹FÙç$„dŸ¬b[‡é¥qÛ	<÷Œxî‡xn–E~CÎdjçš¸óo4Rv7\oFÂ‚a}(¶ø$dØéÀÀj qZ¬’Ëx¨å<T2Er*YJ±È³ÿ…„w@³ümÃ¾E–@VÀµ“¹-g«O³&ØÆ»OÆä‡­ÕBÃÎË.ƒ ;ð–‚¼’Àð7%+!“„1qncmx2Ï½½Š»^¦At8œžFû0}oˆËËGù=ÍPâ°=2Ü
+	 a$2î¶þ¦´‚$öom‰Är˜ú’ÃGAK†ð×ÕX4ˆåÒY›­„²(íÐÑ‘O‹`ÈsÕõ\Ó@g"Lg¯ïáœÄ"ýCdƒ‚A3ùDààÔæLõ‘DýúVqß€2ºcÃU†öÐ.§­=sgŸ¨1½¦®j¡À‹žÇL|jh_#ÇÌê- •.™y[ø½þ”‹ßÚs~ISžê[y@×Œg=×˜v)$97ó¾øê§=Ñ^·9O:>ùCÇºª	çøê³ƒûæf:ã½ú	OÃT¯Û¬gzSo,ßpÌ«š{Ñ\ƒ ¤ØZ	£OcfkQÜ.‡¨äÃß6 3bŠLƒ“Ö2ÕOdòH˜íeH&1¦ôºQnÒ±xLo\Ér´qMv•WksäJ¹ÚÕs*¤yÝf;Õ·«žðÇ[cÎe˜ÒÜŒXÑšó>$´”fŠ¨F@>V%²™–pÄîÅtóÖŒè¦”rb”lM@²ª™£€©žáêQôO¹ååOÎŽYB’jUiX$ËÈqJ­*Ó5A±ZO;NSWâ:Ý­üW ãj[¦x‰ÀUyÊmG˜ÌQk
© :5­Jz¥ë(O[fSMf¨¡ä=kdžd £n’ŽåxÇ4åBEˆ©¬›jëåXivÜXÊZ+Ó¾Ox>ÏÁÌ~KÜê·²–µúel~Âœô|Û$ø‚Ã´Œ™›âW§'|]g`.´;S0ý>lÄfvXòGð&ø7plú¡Eý¡‡×ÇÆÏõtÚ®Ììì¾)A„ŠfBÁéaáDÖJ’ñÈÂ+z£aä‰,¾­qëqk¦ÇÓF×Éäyt×ÇIKb¿ŒLßÍv
û†YÚrhDá–}+èúö¦tÓ°of6	Y|KšãñR{1ˆöF‘ùLæÃGÉáÅùÿ:¸‹V•ß’É$k4ó>Š7>´Ã´hL»¶ZäÄnÜ<5 ßñàvºpÛÜ|Ä2{±'Óvó<"™—,«À_Òçþ”¨5Rñ¯¹
v‡iéU–.#!Öƒ»“¿9 &?Þ{‡dig êß§ù”fLÄÔ%2Ø,'h’ÆîŠ°ÚVùx¹½ü1Î…<ÑÌ©»Ö=7tÚ#ÄeÝñ|`ÔÍ¹§vëÃƒ¹ùöûžyufk—ÇHÁ¬Ç«‘(íôÒà‡Ÿ«ÁÓ­É?¥¥èùèù½^+‘÷iñÐ·\¤Ø†ªÅ¸÷Î=òðÉß]Ë•­75<ªÞRë‚2¦XVÑ:Ê`©ï˜æ–z½²h÷JVGÍ\£uT.]Û{Ü.bW¸ªJ„´™­Àp¬ òâY‹ÏÞ‹OPn/mùpa=Y?‚`F‹Ç 2hèZê”YNF'ðœ,aÔâàFdð÷¸µŠú<üƒD„À5¶ö(‚äÐåyþ„ø‡öº›0Ø½+KÊî¾%_º%«ž³†ýá¼>«_Àä]î–)cïaŽÃGçŸ]£½•MÏeí«¾õÔrGVîÀ'å*öÖøL
 ˜1=½ƒ°ûE²½AãaÆÜ„PÂ(@’!
}¸­!S[*7Ót(Z>k©I¿G6¥(>PôË¹ káßó±múØ÷*€wEh,p1ÿ&Ç8¶©¨]|tšq—Æþæ¢?“m@ì´µkø{}PWeqŽb&ayRUU"`f–iHà;,âëˆœ ïÚñän"¥šjPð8HÜDu1Á¬÷'ÏÜ=8}“œ‚VcÕ çj"sØ‡&›ó°Ôñ÷÷­¡çãï-ßöÌfá-ó²šr+²Ê	Gƒ{£†&ä/)€åI¬ðqþqŽ¡—¸(¤Jb‚+"ËÌ%MÎ‡'@4Ri#_c!?Õ{}“}<ÿÏ èâ?[;¾ï¿O˜V´yayšE‘ÚÚÁ£­.ÝË²dÞËi÷*‘¥
Ü×·pwh%â[“ îÕ&*È.'žœ¬Ò´Ì„¾H6“Ë{ÀW…È†Œ"3–V?NÉbš¿¼œ’ÄèGÜdÓòX%‰d'þÉFæÈÃ¯å¾Îöq#Éb¼›7÷KÛ¥ÒÒLRÃ¬€¤¬îëß~¼î#UDž»µHŸ¦èI5×bÕW)x~}däè*þœ†ÿ®KBX¾ÀÈW+ízëU:vMÄ¶:›{~3^E¥$—K>“äi(ôØ$’Ê‘…Ó¾.N{ãf2â…¹^
2ô_ÝpE©÷/sD22öFZo€ªTª’éW×iß¹©Á;Þ·‚¡œò©…b8ìG0Ç¶ö·ißà¡)ü›bÓbeRaŽ˜FhlŸZGGv×¶Üî˜žyÅhƒ¬ÞµšKdy	w“ZFh “ÜÅ­.}ï‰…J„áûÆx»±JV˜}hw“X~ÙvãÏŽ–ÖÞ.˜õ­vNì@äÁî¿kÁƒ\c †¢Ã€VîÃxÅ]P^‰Á4úW¢‹Â6ÉÜŸ½½f¬vnÌ-Pb|RØ&ûö=2„ðY’ŸøuÆÛ§ËK*…z”þ’ŽRî%sïR£Ë¬Ëx'Ó…aå@{ô#}lQ­JM‡žç„6ìÑ#?ð|ññG7ŽŒ£î¶ßezåöéÖí˜÷- qÇ2£o=ô“„ÐÐÝ ÏA*[[=ZêÀ ÇQ°}úxcÀð¢KŸ‘Žáã›oŸ®®5ãHÂñ¡%žëØ-ÆÏã€qéâNxo#!öµ£µk=:ñ=ºnO×Î@Ç	qPüMìT44ìb˜áêM²}§£wtD‡ŽiÈûq+7²eÁ›/ºµ˜br¶'aCšlP^°O%É¶ñ:¾º§ôc‰è,X‰²bpÌ™UòpDÜbÂðI¬yKf,%K-š¨ÞKäæu¹Y¡Œgz›Úzâô2{$½[»>JbT(”GßïaöšæäÉÅùï‰;ùb¬HàR(˜`†Œ^,šH^b=-Í2Ã€DjPrïÓfq½/<XÅ²ÐƒÆ÷€G‘m"Û{}ËÁæÛ4ºÝä›>m¾‘ïÐ¯Ô‘ìKY*,ó¨÷{ªû4ÎÝÊÈKª%/Ç
6S]XL~Ÿo‡ÞûÄ2›+ó%[šS·~6ß,H7¨ •Ð(Q[{lãæIÍŠVYª†‰ÔfÄÐÑWU¶6Å[Ž×·]eÍûÙìWœ„#îrCý<B{ç¿"Ëq6¢n¤¼u.Îÿ¶Î…t¨ækzzqþã×TÙTO‰KmNXÍ1+k1ÌPªÇæ¨Ù˜£Š÷Ÿ’•Q£:Wƒ§HBÿ)9ô†DP‡îâ¾{R_ªHÔ‡ôÌ^Ï9§¬gœ×ûV–½OµÉÎB×ƒfÚ–R’K.) ï¬‚Wãò)
M°]èìû\ØÞPª3xx #Å—Þ(¼th˜ÈÜv0Õ"\[ti,–S/•:Ä£("ÿÊ¬|)()þxÞÑ´N(Ç(ÎŽ¼µgG«†~Ò…­oÒ[Ï>9cêÉ)mÕ],Ð?ð˜/æØZ„^LrZ‹”­æ)×`xÇŽg˜ÀrÊ˜¹}Dš<±Ç›oÆ÷%ÛŽåöÂþ|a#¤°kºïjŽ³*Éû"Ò|¯
¼¼®trgŸ¬#é
Ì%ûè U÷”Êã¥Û¨ªøDù£ÓY<s`d¦’ïÑÄ4ÝqSx,«*«õà"k`tî†EË’O¸\¯`Ë+RÂ‹Ù™¦jZÁ¾œ‹X`>,”ìT¤b&0b†AÎ
Ÿi˜]S‰O˜XHV­Ú|ey¬‹Fà˜ºìVRzi#ÊsJ³´ôèo{ÈÁ6‰ÉXYá<Êž“—,N…)øm})`ävá4á©o0†pjF+´,7z-k4õc´l²	2a3O*±TºÐaòèw:ìrC1Âmy~ž|«&räÒüÙŸëäs/ZÚE¿Ê÷*æouÆËœ›õÑh00ü1âOKíh­ÍZw
s¥ÚRO-Ú•¢Ôfy±·Ô‰¨pµJ•
U)ó¢àIW /
àG´#¥¨qQpÅU-³”.žÿfHN [C,?ì	ªOä>tûÏ¿rõ3Ø*8ÎfQNÕÎrØ:V8‡–«âFK20åá·óOgIPTQ—bÜiˆ[œPw*ÖóHã)¿¥ñ®±('äôK;íRÎFœÆY/B¢ˆ=•s4Lrý3›¸½ÿú•”±©Ã@§œd!öræ9zø•NµøÆ/i¶R.©§º~ìL9O§{›Ò‚¿ä!Â¢h§´â±›ß÷ŽSæ†…E§lhÐ¬•Âf©¶Ä]©¦eøyF:@YýÖò
9n-o £?<ÜZŒŸ¤Ñ¥€3ÃNÒþ1oekèÙt§Î Ù–—RÞ*òjCCÑ
¥ïöÈóÃæÐ·žRáµ  ”FçˆiûLÚ$xI~d‹‹þN5o<_Æ,]ºêà»t1Ñgj#Bõ@¢‚0±yîç kÐøn£õ>î{ÇnZß`‘ôœÖ:*”l¯yÑ¯Ô-x}(Å`Ñ¿âZP[$6[®©AyB²Å×Tw­¨ý9E4G)î©(èBû†¾kCq4ˆ¯ˆäØ×Šæ´·XŒ0D<¼ûM§ºkÆæ¸#¹ˆì¢K®áé1;Ùýšì€ì†~¤â\ÚóìBºƒŸ_AšCÄØµ!6~(ÞrW“ Ó«uþ]ÏË›/Ã×0ÀZh™èB Ûäq»Ý–@^>nãUè[ //kôÈè†žŸÂÏÄ¤¦ –eZÂ@íÞCç±¬µ'œýÃF„Ä!-Ò‰CmÉ·y÷¦x•/Åá	úš(càj“øvŠ>†§¾™Åƒ¨-@|ž@‡ÑÜÜ|ÛÁZyB{ßjvÄßfñl&4‰§gè+²´	³x
òªbP£Z¸nh–Ï&Cc%4´ý°I–ÊqdÐÖ.´ÕÛêmu´ÚŠÆ…ö¬EÕµ/7¨|è™ÒGÏïLØE*Îƒyª‘1/Û<Ñbð60Bx8H´a âß«ÀßØì 3"î²U“~ýÌ‘ºœIb:eîwó$å€ó^ˆ9÷2Y$Ø; Ó¨¶>æ„(ñ)Ó^PÀèSD“©2·/œÔ¸‰&ß!Ëg|ÃÁftWÑ³ÿ©ðâ-~"f/U†rÎàTøÖiŠøAÎ¥£ò2Ž*ß¤E³Ô8£ÃAµCØ“‘½¶»°íî„èœ/ÔQû‚s×¥\²j_°*4.R$ªèu4aK©áŠî`Ç;æ‰¢ñ5žD
pš‚×éN&&
88íŒÐÒX¼u@z¶ñ	Ì¿êJ“û`”lZ´öIß°s3Çƒ¡3fZ“¯qQuŸ›*¦Á(™M¦61e;Ø™À‘çë°¢sÈõ‰Rq®¸àÅ=âwFQ¥YW"FáE˜ø·´–¶ô-Y2µKŸÆñJ—/˜'ˆˆÝËŒ#1Jw3¹èÄ[)ÿkªˆ.-ˆ¥$Äøƒ5Ö+[ZT„­õÅ§ª8ÉÈIKçf/š-ÉËRØfÉ²E9Ä9€f×+4%”O|Žo¢ UëlÎòl›yØi’<fØ§ žÎˆÇ)è!uÇñŒ…âyrs›¬£B«»‘«NÏ'ÅŸiIô¨ºÌ€Ó¸™‚7u÷µŒÏŽóÛ	Ø¡”ÛU½*.Š?LnVà?jÁ¤±álkÉ
ä6i&ý<0nCŽOM£28¹´ÀWˆ¸ŠyÑ4¸Œ^Â›,¹Iñ()Ö§¶E~dHèM¾pY}÷‚‘Å˜Ÿ¯AâxzqþL”ñÌ¦zFO'Ûµ~)³0UÂ»d(K–šäJ5¤n¢”%ËÝu<Ø†kô`rCšt¬y÷Ågä]3¾­š©ïÐÁ¢J#¼hè»}PHéçCß»?N¾îÀMAR^T·Æ‘,í}nkÐ„Òäg7f“û,Ÿý,y®4Éb¢¹Ýžèž{äåkËÂ+$¥€ŸÚžc…¬6—'n Å¡Ôªt“Ë4üQ™y¨~Î¡$ûOÅ4‘òì@SJïËÁ€fÐõ?¦*R®‹tÂÜfšÊ~™LR©ó#®Èïó	+Þ¢4Z m¼#†‘
EòØ’Wá‹Y>¾lÈ´†+«s/¹nmæÂ§‘æ&ˆÚ|i…³« ñŠÑlÿaŒ*§ °ÐoûI	ûfþZØ¥šß’´Ñ¦£½ç™ÖÙ<ê°½þ×¿ÅŠëççò¾7JäÙôØ/JêJØw`9uÄ•Ÿ…JÎy~Ãï#æÕ¢r…ØY×
Kœ#®ðlà’êÁñ2 $nP@Å9¸Ô™DeŠF„±Âë˜Xœ£ˆâîOþX˜„‹vçñâ¢Y´Þ7›Ë¤u–ÙnÒž—>¾Õ¶Mî(¬”•©Þ„¶#aêQº}úSÍzS¬©C`ã½ôUàRIõ5Q=û‰í¢ßz;1SËïìáô5	,Â®Õ‡,»Áçh âZHžÐ™j·Ûå*YN‹‰Ž°œ°ÖK%¤,¡ÂèÐ‰·f@çlÞ’­ØmÖ }dÛì`c$1šº43_ÜöžíAç‹.L±½è¤„çIg©¼EI%¢C+lQ  b0Eç+"‹žÊç“zo:QÉqó÷@î`>¤€³ˆq°/¹À¢@X^•HV6Õœ\x’0›¥S‘tºø¡E‘ÒI;¥c]¨Þ9•ûc•9©Õ<ë«ÀÜµ4Z1N4ÌçeZç›ÌìÁ$P1|jò{ÐF}–Š±?‚µÓåkg<A;÷€ÞäYšè‹OAR{wº	’v<|Ác³&ÿnŠiœ8DÈóÿœÿŽæ±ø¦¹xþÕpsº8ÿ¥!ô©-7©]&S©ëúeE	LÊ”ÈäÇ¾1d‚vé¦¡ŠG_Œjñ¤œÌMÉ"0‘2YD‘ó?Rjs6?˜|‰ªœcÁM¡ïápgncÛi²’YþñbáÚ¤ÕX	×rÀÄUshcE@$ÑÏ	ãdiÌpPÑñôÐ·Žì“³oO1¬ÊŸ*V*”Ø:$ýšEyËLh‰÷
|+VÈñ,+,œïG?ë&yÃöïÛA˜¡šÄD8tÑZc­"”.ëØ¬HˆÄÍ”U‡:Sf2iÞjJ®é”Õ4åHëqbÙEf´ù8.6!ýQni¤N·tp]´õFÕ/D$5éyêk‚µ0i…†}
Õ¤‘”ÊU†ã @@Qsû½šc§¬Ü–Þ‹ÏâP)™í¢OñÕÀÂò R
Œ²ïÎvÝð•¾;¶\Ó	¦hôz}ôbp[ŠÇ<x÷°ú²Ÿ‘ÉJ’|á.p¸³K–7É!ÅI4û“_°ªËWÆùhò{#!q;”Ûë…¹’Ðó¬6½+ˆ{‹h §÷	ðœÕ›žœI.þd<î£¾Ž)pÅzÎhOJ¡zrÑV—´ÿh€^Cm©Ü²FwÀ7ÉÏ4{óNdf#‹Dt\¨z“©]âíH½‡"ÉF.‘Û Ø»\T÷Hž-c],F‰&òŠY3²³Qj°QgÓ(v«Ró(„å0jm+öqIA‘¡rSb32p_b¹Z]˜à#7NŠrT¹T|LºN›9AÈþ?ÀRã.£Jø)9Õ¼8ÿq˜¾3ùµKLŒþG»­Q*ý6¥óYF0Wô{ÉzàØ·Çëoh¹Û§v°ç[@²Ü¼¿¼? $ŒAøžâJŠ`WGÀ€ó;ÊÈ—ÔÅÅìÓGÆY®c_Ä#’ñ‘
î¹ÃQØœ›Ó²Š7£’Yûf¦MÕ¾}Ÿ2xþ¶YñöÈþ{ä=3 Î|`Ó6›?ÖlèLH¥ 9	
rÜ‹GZoœ·1ˆ™Ÿ{k)å
TXÒãl Ë<ÈJ{]ª”z8ÎïÃ‹çÏ¼b xehÉ^™Z;Úk-WÄ]|°ÉÓ…­/¥ðo«Iõ#1ýª¥ö"O+ÍsœŽQ’ˆCÒ;u0‘ò–©¢*WûÈ>ù¡3
öl¿›~pªdXB™¼‚`Bä²½w\^²Ò°íe™¼3bÎåÈ®iÿfÇAŸÚ=Ãþä 1‡¶Kí­ÿlS€Ç¯Ô¬ÚC´15‰>ìOþuÎ8WÆ.%³–ªÇG{Mß‘›Î-
Ñt˜1H{ñ Q[v–ÒúÓþÇÉÊ33ÎÐ/‰ÿS?Pš°Q^X¯Jÿu»CÛ»‹SÞ“lZÀÄ|[êþÍ=Žn|zÛ;R.Î÷7Éí»KËäÁîÒŠSÑþïßz»;¼X<jZ‘K9#XíÐð{VÈr ¶Cï¬÷@°nûx²G*sì.,`—`GµŸS˜ñR<4#>øÅ/‰(QyTÉ·FœÑž0ÆêLh4wÓ4zÉTùriQî3P\;5ÕÖ¢ÙŒ3EsòƒÑ˜Pm²Kš{“ßSÏä§¬°n§Ÿ»½ùŠ^•¼%,—4E§èÀA¦›>š·àÓïÉ ^ sñü7è„½xþË~ù\{ûî¼>ˆK@Ð”ôÉT¹D½kFŒú*Ø´æÂ¸þ´ÎÊ|w4¦$×ž<°4kÝz\{ë‘eøÝ>ãr¼Yú)NP®QféCáFÓnËpêÛ>>éßk†áøCf²Ö_qô.:òÛV‹0H&•é	7‡Æˆ´ZßpŠ=Þû%BcËeÂœ9‚ÕEÇGÄí!ÿþ'»2ŸÎt0¢®FÓ@CÝÄ†·äX¦8mqïMÝh}"¿JÚj¯×VÄêäÎV¶]ƒrï¨äM2æQs÷j‹ËEéäUqé©”¸Ô*‡îMÌgJÖ¯ßÌÒ	"[{›$Æçí›‘oAÿ5#£«§PTU‡!‚YÖ–ò–V`[ŒS«C½„œRe(‡¾Kš£ÂTH0@¡Iö†hfLUè{¡Á ÀT©ì"†>jub-/ÍÈ~v`ÎŽ*oÁ†©Tª­àW`G”„úÆ-“l“¢´Ý®32­€>«m›Ú¶|vè¤É[e'EË\R¾#àSž(lHä¸SiGòõ>V—bt%VÀ_nÚÐEmÛUmÉÁ*±v‘*:ÞI“@rtMQ'ûXEwOAAªä9Ë˜)îJiù¤‚£Ø5U°€Žl¦´‰± 7	üûð­h-U\LÉqF,'°.íu0Ù™ú•¢þëúã$ý¯uŸ¦_/{ä¡Ké½1}Á§wäuGÁ¦ ~–e1_–qŒÿÖYÚæ#ñP‰1(ÀØ+ªÄÃjsÅz7GåhªˆB§ªÂm2ÎGS¦ø_-ÎÇÞ
ÿAS·ê@ÑÇ‚BH‰w]F2QR‹” )l2µÞ+ÿnõVAÝ©VÄ]”¬Ë±#ãÒæƒå«XOe¯ØÈ
ñ³›ƒ¾ý'¡Ö"ÝZtª©YxTÚJÁSB»º/]ÝÞ®}¡>„àŽç…i8®ƒMü°„%îV9:J*È	ÏR$è¨4R€¨šGˆWÝQ 3fPÛú­·µó;ç¿Sï„&è‚aèÕUa&\Ó±„Á×¥ö™"‘ÄáÔz¾î˜W UõGÁÖœ>hI+ö3¹¼$$²8"2è–"y%Ø¨!Óa–ˆ"O#SµÍ"35…pœ5†¼øœ–£é2N©!DÇø¡2~®D—U†«‰y‘„úê‚ÛAÄöÈ6É‡¦ÝŠ‚À1üW‡²VMî•Áœ»ÜøÌ"ËGØ»Q{·j&þ„ÞŽÚ²_´˜/{2 °Í-M\ƒ©Pîî2¶bÖk­Æ5.©d*¢$¡Éˆ’Xìªº©ÊÊ€­i'BúÅ®«/7†	•”NÌÄd,]I"„ØÊ* ë´/váîiˆJÒâ[qV	~n%	qPß“›$I\‘3Dgì{ÔÌ¬«¢kNäµp³ô×Ô>–,àô-ŽÛ‰4ýþZ}ßI%ÂÒt´Lzª +ý*úä™"ÐÕm¤„ž§©·g£
øg^+[qt¤²0\—NMêU¤^_Z’EúŸpthE ]VÅ—[Ä—*y‹I’Þm*cÌÅ2Òñ¦ÒSôvÑ8½î¯ñy$×ÜIk`ØMÁÎd£!õÍƒÚñÓ¹ÒpÉ°T4(rF6ÎÆÍMÝâl&fïëg˜°â#½yID’8•#ÆiºýÉ3,¥|¹Ãz–‰éL#‰NéÓ4ô|-²•Â¿`ø¥P›£Qh¨­Kú“/Ü>y“…¾2R@'êódUx)MúVpY9p”Þ5£0Íi5Ý›I¢Cþ>åö#½T÷µÃ6Uá™SÅ¼TÜÌœ†]@;P³V¨æa™Ò¸^¤.‹‹¡bD¦&³á–©ÒË˜¤ÐüwÛ´CÁ"X.ÂÄÑt¥W¦ÍW‰É>–á“ÔõÂè$·\Ö5
ÀaYI“cœ˜³3-ÊÓ³uéÚÔV¤$XˆÚ“ªGZÍ,HÅˆu…‡"éfMtød‚,t7{I…™c•)U’Dú=*”&¹¢C¥¦¯Œó3›ÒC,óyåÒJ Õ8)Oœu…%@^Ñ „lÐœ"3ŸWQ@/ÌÈEs[,îÌ½ª‹#ÖV2q¢3g-l0ãÝ¼¾3Ìd_ò¨6Ü›G\|žŠ¸Ðç*\cÒªä„Ìöe{ÉZQ™ð‹/Õt¨r«:öŒfˆ…›FÖœÁ,4Slòf†Í[6tú¡“–èÔvšŠZ—QZžÆ_’5F…k8B°ÆéŽïã¶Ð¿’¤åmCf˜‡9-»&rn’%ä…öbSfâm¸½BmŽ\ùÕß|SûÝoV@Š—¶IÝ„°œ7I"@°Þ‚ñ‰QžK>åsŠgp*9£Ç¨¼æÅ®*˜ñ¨_mT)H‹iU¸]
}È€ñÞŠS™K|OùÂ#ÆÄPê—jpiw¬’g`„´8ÊráQŠ[ò¨JdžV¯äÐEåè@¶ôÃ$Øƒ„…²êW¢V!z¬` ç™š!³*©U³JË¢šØT.¡Ù1? y“Ð8)"õ.J€¬<<5Qª¥ôA/ÕŒYn[¸F¶Fefµµ1©/‘ŸRjºÌüp¥/Ë(k€É€Hß»xþ]¶¸Ü>VNÙÃðä3.K‘S9¿ÜK7sáz{ïÎ&‡®±ñá£Q¼Ðhß”(%ù¡1H=ËAaµi}¡4WmÜ_)¢Ö}*‚F{i´š!–êW­–Â©JÊ‡TºjáK^ƒ½V“@Ð¨¼]»·k€d¦·óØz—ƒU±|-½M7—É¡òö óÄlÚ]Y	•Á¨×³DƒÉÆòˆé2;Î6‘å·²–ž¹ùt¢Š6ÈÈƒ¦ö1^‹?äûä•àËñ·6ã~|Ïûüâù*¡]™‘§š1kéì[§ñsÎ>Ñîwå€,Y'âë?VO|Ó»,“(Dp¸Då4šÑŠqRÆé=VË“bhëæœ£É²Æ|wW;÷‹„WTAøÈò¾äÈ`&y_J'S¯¤7
ºéf ‹ßqMÌÞÐsqpt_+LNaÆ™dA>ŒG™ÔYVÏ™”îâb¨Õç"ñ¤<ž‚l+-}¡HÜC/c›¯ëQÃ-+˜à+µ:¨«,J‡ó™{ñ–Q¥pïv»M+ƒGéG™ò2§7°Õðÿzn‚™YÀõåÇÝM¦±qÁ‘{ù&ÏEíÌôÎu.žŸ“'$*4ÄYÃ5”êÕDªcZ?—M)¥x!¡Ç)¹õ¥×z.¦Š›”ìvýœIŽr½k¹–owu¥(œÇíÜHÑ”´’™¾œ‚vÎ°m›úÈ\t„o¢«!d>qt"„I`.
‰‚=g0ùrîlþýæ»Ðv)jPWRÒß:ùoÐçö‰ ÇcAmúû|6ÙÖÎ­eTŸE£Oæ”ÓÕ±JŸ¶‚4öPlüîäßIH“™0V…Ùòø#XZùž^á4m×+†FªL-gz]h<Å1ˆh†rˆ~¸§&V
DÂxCF%HãÒó´ÞÆ÷é hî‰5Ã:™µcÒXÌCOÈôÖ”u¬J”§Œõs¼WJÍ®+À\š|Å¥)ßvŸ´´"ô¸ûw˜€€V5-
® ý)1³>0]HFsM¶‰…‘[l*ŠFƒ{D[_û°5‡>ðŽïX±Þî˜¼ët¬!?õ›±Y öØy£KÁé­Éú+˜ÙH}/°‡ý–ZÑôÌú’ÖFHh•ULHˆ–ùíÆG‚¤Žvo*šÿ½Jõ5;¶°uèA?‹.m¯³´3ÝýN¿ŽÃKr{ÕzV±wñÊ*i8"J\WàÕn˜ä›*à£éš:ž|ÜÚHtËc¾K”G6qèzà(SõBŸg†æ2#+ZËa,L$D|¼QúÊÓ‡¨ÈoRg÷@e^¨%÷Õ-Oæô6»žÓB,& ‰¼Sêú·3¡ß'm9ÕË‰ÙéUªfRÍf°Ikÿ6d,+TSŠŠ,%h-*½%µ¥ÉÞd}ÔLÇ ºLò.,/ei6Ÿ¦X¶•SNìu4aOÉf<[ÖÀ@ÊJŸ.c
4øgpÂ,x@Øv8n­Â©«§XÖªú1P¥•`kŽ§Øô¨Î» Ká¥;W9^%;-q~	þúùÐüê£|ˆ2¸ÆfM¯Ë¯m‘ÞÒ¶²¦Þ÷Žu¥’èÉ9xm<pÀ0æñ¥3jšºy/¥mq'Ä(-H¸PÅÇðËµÆRhZ+a½z×3ÇZàÉï¡Å&PFc_…ñ‚7Q']•æXÐŽ£¥íïYŽ“›êƒR¤‹ 7ú»Sà$)/×ZùKUM\¹ìJlBÌö£zâ8™Ãð¶¤ÕÙUõÉ¸oÄi$—¾, DÏ=RaÖIœ277wª¤yÐ¥èÅ˜¤g°TI<µËËŽk»ôñ5Ñ¡³dš©H?#ã3tÈMK×˜²S›ìË¢Z™/ÒS¦È·]Þ‹Ž&GÎWµ¼vi,ßpÌÄÌàÑšÑ×ušñ<Þþ“Ó ¼U5rl6‚±Û%uÓ{g i:È´êÉªÓh´7dÛyí–C¦evâz)ÈCÏÂ¶åûžßüåm¦ûÏ¿´¥å¬ÐqÇµ%¡RW#F¹5ÞÐÇ¶‰+©~gõìµ¡?®5VÆ±a‡d44aÝ÷ºMÿï,9Vá>N^>¿P3}:óoËv4#ª’Ä*9"‰%ß4#3Útššj<ç¬Ö¬³1u¼®/ÏmÎ}ðpçðö\~TaPh¡ä-kv-`ÔíZAÐlÐ‚+Î×¿¡ñ«!,ø¾Ñ¨Õ¶DÌ¸g6Ý‘ãÔhÔ)Z’®	K¹'`Ž§;¶o¡ç[·)K€ÖÈ{@ÎÎáxhµÙÅóS§¯ï¨˜œ¿ÚfKÈ#ã©¾¤ƒGµ¾ñ]/kWçiœëïé™älÓìÌM•€QþåN5MÖ|és]1;zUñ\Wì¬V‰¶üj“hž‘îÊ™™h–Ÿcø¨ë¾MŽšÐƒä¯‚zÅíQµ5VçxÅLZ¦–¡œ=¤Fë—ÌÜ¥i•*:¾…Ö¾‰œ?ƒHÎÍ|IqlÄ}ïâù3;BD0Wö”«“	7ï[èn„ª¡k±Œ/–KÞ‰¶>RÐ¤€JYgÑ 5)ô7¬K³öTñz@?´"°µ½üÒi}ê>iŠ Ê‡«!8@HX>K–rO6àÅFˆ7´\ŒpÉ$êÃÜ}g°°ð¯ ?¾'½Nñ©R	© ƒÁ&÷¬³¢R‘t5q<»žkEhôG[q±¼$Cß6MË%A×÷§c°ÛÔðÖ£RO=»LŽdˆóê!ÊM‚²MÙÃz¦ÏLyqþ?Q¢ÈxZ@ŽÂK•¾zQœx¦À)s·W•Þj¦s[vh4|„w#2==|A~À¢ä1ËMˆaç‹‹óë¾óˆ:Þ<XóèÒˆŠT—)‚jÖÈ`ÜZMÆ)ª=±±ô´_¹ô.ø]#°»äž{ä±¢…?²´·%%µr5\Ó˜‘!¼L7’QÞ¿,N}«¿^˜š@‡SæqHçMí° j½äù³IÓ7Mï:EÅÔ‹ºñKÚ~¸Tàv]Z^ v—VtD5Áy·e_¤ÏÖ-T»tKÓû­3®pŠ¤WRdW+¶ä4U’²K"´TRÔË§4®‡W‡Ôð­fCjqKu<ÃÕ‰ëjÈG§6Ý+ÊÅÔ¥±«ëjxcBeÆÙªÐÖuá‹ªÜ#ð¥éFuI-‰ÑŒžÏvuH0KKûB"Ð[·ÈÜœVf½|¬émIƒ:$¥$Ü>>éÜE#Áh¶,,LgÑéHo7Z-"D/’ŸÑ°ŸŠ¶Z×—§ê“i"}H“¬~QòÀY¶ÐûB¶Ð½ÉïipÅ§Q0†‹1?·‡ÿ²ucâ³¤¼%¼ä%–JÇŸRr òŽ˜2³œŠ82"®ØTu".!žRÒ)¹@]#…éBÔG¾E®Ñ³ht¹P[µ›y®ˆY*‹¢é"ÉÕÏ—¨")×,‰²»¬*Ï_)v*^¦Ô …L1;.4)BÇ†­hòó±N^nEkð0*!¬¤£+©4±HÎp °ˆÖfY[ÊB0%myˆ™¦†ësŠ ú*ÓW9åÌöÅç4ÉÛ“€áFA*yV&†	ãW4’•ê9˜s8ÿPâOg•aû³ÀþòrCC!/®ÂV$NnlêÍûœÒu+u3¡”òžjàÍÂ¥,·'i†ãâBžai‹*X×LfZ(AÛqS©™ôÅå(ƒK•U©—V!YAu_!sVóê×0bGÆ‡«y—0Š¢Fo‘Üùsþ]iT<½Ï6ù—Ú:ðiŽwôrÐxyî~rY…¿µèk¾YBºÛëŽi’ç[Ô%­!µÑ¶ó†yæ,b8ë4se¿,/Imöú	¿´Õö¼JŸØ²¦§ˆ?³*à:x&âü*d.ÕìôTœi²yU©Â€é^Ø·|uí7ru´óÒ¼^aíjU³µWû4ÉËhÓ%0Ãƒ'1KF²Vþ2ÚRåfx\r3<jæ2Ã£B>3<²¦¦¨t2ËÅòÍTi¯Àè4mÓ—”í+Èx†G:ëÙ!è£!j¥BÃðJ5l“|C¿qm Q%´P5I,•:jF5N³ ×Yaç* Ë¼Jv¦JpÊª¹fgP^St%R0š Âu=ÇóƒŠy•ª@ð¾Ã…Í4ixTC~ni-&­bÍå¹ƒõÐµ/Pö¡X˜åÐ¡;ž¦sKPéio¬¬°Z§vV¬Í^óáRZóÈpPáJÕ¦ˆd|^€Ö·¿Ww¹”Ž4ÐÂ™„ÖÐˆ4úrE´2Ãâ¸â€(ŸX4R÷1†ê°oŒ©Gæ§E µâñŠ WŒÆT°ÉìP d—°ßØò•=…ˆq;¹ßim]²²IvG&&ô­ž`Àá‘ç(q[B»\¢jÐ«[ÚNÐPWgUì:ÐK¡˜ºs.±ÝK…ôgþ2qz›É×UªÙÜP,|ÿŸ½ø%©ÉÕ9­f“J+ŸZÍôS›}
G<è¡›ìÍÕµqþ;2ù±«—ÿ)[¥Fh¥ú‹ó_u‰KÀ“õ±¾¸KÌ‹óŸÐ¯ž˜LLSÔÖ®‚£“‡ª´òM®•'œ™n&#Zªg×Rú¸š7ô½¿†;˜’7ÔRòP­j¨u±"7L¹a›?0my-Wà˜Ê–º½ðŽR=kf”0vô5]|[^Û­ØBJÏâx“Nö3·TáÑÔ¤´ÛK«Lïrô'*!¬Ä_Œã–Šš)çJD§©VË\W¹”Ò4«EáÒY1:†ÓG¥å¢iá¨±VÊë‚.”òÛe«„òúY-½ÆJ×mæ:.EÁdç¿À˜ÜEÅµ_bNþ¯ÛÓÁ¬è üRÇ%:ö8†¼ø<ÚíK‡?Ox÷C‡B5,¿Œþòˆ¿]i;Õ ªru¨
uv!…–I$u‰*&«Ã>ì=òÀðŸXòªåÐ‡†ã!?Ëlyªx Z¿ÌPB´ª`åµÿ%­Êº?=•Ø#ËÓÁ#Ä‡/,p”Ò‚Œ‰ÉS5ìÂyÙÀ`—‚…Kˆ„5R•J^öŒ—ý\Ù¨²cšÂ hÚUŽ[XiY v¤ì+¸£ÌÀ2ÓÔòi\K¢GŸøH=3×Jß­TPu§0Æ”¸(ÎdÇ®•ûå%Â&I¥zß;.F=Ñ],v²g ­mÄ(\lï\œÿ	¾~Æ'ž832Äõ°˜_ÙÂìRdÏ
€U}„8—\m»ÆÍû }#®·þM-$Çâ+6ê;täÎŠUñJ5>ïÐ·{½4éaÕµTÈ´P‰“1ˆ@¹CÖ
FÀ'Ó÷ê,lÔpÃÒË§ÞCó­%Æ©ä]õ_áVd\¥0AÁJ-mìM¢>âå ã©a;ßžL*O”¬Ÿ%Yì!ERÎ"ÒœÝ„ÿ«uªÜƒµ§‘}>¹xªýy¦	ñ8Ó«œÿ{@–V˜^ÝW’_¢ö³ ûD“MiÖ4s>Z¨Ù’y7ÿZåÍ¿¤œùw_|öîþì›Ýçö×KHòÏUùwgßö 
°ï¢ýé2^‚š”z¶!®ÆË©Z »r?lÜ|@}S‚FðºFBá!ßŽ¨Ð© :bøNÓ@ÊÓÈÛÄ·Ïa8tšÌ­CíÝ÷ÌÂ>áIMxPªyôã$Ís¯w@±‡“Ÿ4ŸS	7J²å!:3­Aôã§£wX”‚0g5R—×xz¼¯”¹ñîônxwÿÝý¦Ðç
8Î«y;±æÆ©@‰3\±ð<ªÓPóé“®u/d<ŠõLú\;1ÂD)©ƒëÒº¿¹Ð‘*´GÖÏ!°‚.Ve·ÌpÌ½óÎæ`@LsñÁƒÅ1sóômZÚQE3¥²d¿’à’’’Ùt\Ud*D‰ñQq­crÏöÁQR|€æžÚ­ææÛGÑ€Ôz:[õK•ÊeªÄáŠ¯ÓËÊÓËòs3I†™Nï&è`3Éˆ‰0HŠŒ¤2H+¯³±*ŽëB…zÙX£h½ééÞÉ­ /©>–Î8†%æ·A¤=²ýA³±K1u4Ýí_<ÿM—ýqÉ`„QÕäDýÔtq«Q·|FÍRQá“ÖyN“ˆ`›(|Û¦^¨–ªy¡®Âþíû·Y]…ô°¬‚wðsÍ"	¹2	”fÄ1û“/\,wú·W³ZÂôôK°±†ª^+ßsÍ
#Ì¤j´ÐÜå§Ò¯S^ªRÊa­ „›½ÎLœûajTýê&Ùƒ-”¥©‹§ïBuÐôô¾«ÆÒs\H· ·ÉW³ Ô“ØU®ß/[Þ†¾˜KöàãC|±˜¢¦²>•88)^³Š{‡_ÿök´Ã.ôì Oi:œòžfNÀöW‹¯/Ê‘T/+˜2$¿ñsŸ>.sÌjÄ½öý¯ñöÂÏ³^1ƒŸdûz¿gÇåáï‘îk£ïõn~½×CZ— ñkæ¬,Xm¢ËvfXÛ,qM‡¥Ž[¸>Hêâ@\<.M=ÍD_œÿ&šBžc©­ùâs½Ä¢50ÖüµàÕ8åS‚«“&.ZMs+H!o_îZù;M	ÓblkHž ›T{iƒRÃÄT¥Ð+um‰2µÂ‰Š“†f™õ¢¬¡”d¢»>lÝì °Ê%=T9<1Ùî‹ÏYÈÁ’V¨’O¼ ÅJ±Â—42i*Q©›wvÉŽè¯íxu§–ïR#·"ïtÎŠ×ÛNn­eë°G´äôJíY:y6.oïz^TíËIÖxÉh²‹þtFô¯Ç»¤ñÄ¦KF/ùÓË‡ðFÀ #3Çì‡”?¡dTùUW:°Sî3WXÑ¾ÖíOžÇbÕŒÂ^³3rà…VÍ Õèöj¢PŠDLþ@BDî.ÎÑßµT°›@]®v©¯Š†£V9-‡ZHÎé¢1Jùà"ºby¶b3/bY1“ˆBã÷:Èì
2‹çöÅgÔâþ!ZÜ÷¨A}êÌ|–‰%CJóä#ÃÅb;BI°Xöº×¡bÏ~5BÅâ)}(–ÿùòÅD¶ó*‡‰úìànïƒazu¿¬P±ì.óè†l‡-z¯Å¾bQD×â»hízµâºû£1µÔÐã·HPM¹Ô`«È./œË¶BlÞŸFœãætÿìÎ8ÊªGYu/)Êª+FYu¯<Êªûˆ²Ò3|gZÊêù7(ˆaª„UÄ:kí.Èú®åeõÕÊ{ª¨¶eÇ’›U wv7uC_’wiuÐªú£‘¥ù3ò£ª€÷»wë<³GÓÉs«eÕ™{‰u™È¶îåE¶eÔ`¬Ã†
ä:#1ävá'ÚöÈË‹lƒ¼D6`ò’#»º¯ldWp—šÁ.S…ºÔt‰Íµ#]f•R7&EÔ“êF¡ÔAQF 0¨3Š%uãO
¢OÄÆ£Ø“nýØYäI<¨S‡LtR9ä„O¾V¼£Úõ•BM*Æ…Ì2Ì¤zÉë˜‘"CË«3²¾Iv€7CÃíFe}ò&y¼¾ï{.lt&@Ÿêz¾Ð¸’Ýq%nX#¨ÄK#J’ÞG—¦ì˜ÛÝ>åäófFÀvâK“oªëx&^TW@Q0Â}ÿTü&¿~Xþö)þ+ÿ´K£ ¹öFTc×º<
HHBä×a½Ðà·OùùUF<)X<ùUâ3Šd”n`ÀÙO!¾o`1È7¢¹)­D×‚pÀ•~¾-KIZ§ù&ŠÚG ø­vèÝ÷Ž-Ï,”}âäÕïA¾æà-ÚèCß:²O°Wé>&ßà‰ °Ž=±m»]gdZ¤E¡ÁôMzÝä—Ð@òkTùÈvgG$ì™×tðM |îc¸}Ê?rzaòYAYTÙd…Õ»c «Ôwù=˜s2ÊUN}ŠÛ§¹Sò;e²i„9IŸÕé-Ee»LOªvŽ{ƒ¡çcSkI~^Þ­ì%oFùSqo„“BaI§¤?—öMÑhÙE³–»mïÑ‡ÑÜÉ~“·E¥¬ü¢"·ÈãüÙÉ&¿GÖÞâT2û5/åkéešÎ4›ºNøF%B4÷39
s2Çš˜5k>#íÁH-`Õ_q…Ð„í§¶u<7Ÿ·×Ê$C¼«…wIEÃÄpíš/ld?&ý86ýÐ:ò½A«ã.3h­sÄtEi:'@p†bÙ2~ìœÜ¬œ4qh¸òž{äI$_Iaéžo˜6¼l+ôZ>¡Ý…;Ôd§`€}Ã1Y){qùxu%6Q3ÜGDÄùÍi3X—zu	¸³càË‘ØÛ·MÓr%6°la><g=,2HÍˆð÷¸µ±ª%ü/A{°¸œøélÎù­UèPkà·–7àO¤šhö¡qˆŽøâZR@…vu=sXÅ0/ø\ŽôR˜·
T¼*’•4Pt.†Ø$‚–ðD<Dz 3¶ëØ®ÕâñJÍòÝþƒ´×%ûÌ~Ó÷È]{òl@ëæ~ÞeÁ˜¬š7[½Jí³™µ•¶9Ðw\ÁÌÒõ?¤6h$ƒ‚~—FugòGÊh6óÃ‹CããÕM¶¤£•²
+E8½Š¦u‘Sæuc7s§“XÎüO©ØNìÞ`å¥»•…—5ÎJk±¿RQX.³ÍƒfÚµ/‡³¤âXiRýs1Q‰v³üXhó; wxÌ²ÚG×Å
s]ˆËdR˜oÓ~AYÀÀÌ€Câµ¡S©¾2Ï–åt+©X"úXz‹A§µÜ^Ç¶ŒhËxÆ"r»É`K Þü°ÀÒÃAdFL8`Å¨¦I•òÇKßBU„’ÑüY1~9dlBÛü{'Ó>ýMmd*‰²Và£]X7–bH# í,Ô'.ƒ‘–Aç?©Š€pÇRk]•Êýkœ×:
Ùþ°¬E€ÑqÚÔwj0øç"ðŽ A) ´Z×Ì(¥M]‚Ñs$pe,ó|‘éñs9ŽW°;ÉœÌªú²úwQ –bl¤6æu«,ó4Œ³	4C-¨ifRÀga=’ÇPW¢Ï8A6Á\a™ÚQm¸k1ÔUæZq-Ø¥P[ÁóPÌH0&0“ùäW"A4¥O¤3	ˆÀÌ(g=µ1‰«ÃŠÎ>I-ÓÃŠ ÏÜT¶óú)¸Ý¨ð^<ÿO*»¹Iªt–iÅ¸ŸÙ˜qqþ)HÞä,M†…+ä¦«â¶¥#(“J‡UšƒRÊ£Q‡„ 0 ;–LBõ.¦ QfÌ—ö…_•Ië÷1­•ºLU¨å” Òg0Vº`LKÈiP@\ÖÆäÊ>2Ú;Súª…0ˆtŠ,a³9dE	›+ê|¦­ÇAß·Ù¦ðñf¼Ë~Ì&U ‹é²Wù¬¾*Uçƒ zžv$¢®·FPc¾DIJˆ«ÿKQ{ó¢
GÌÖPÀž•ÃšÏ;öªª
mžYx˜ö½Óažé@Ê
¢¿*C)«ï’Æƒ|âLF¬ÍÓIjTâª?¼ðö#Ãy5‡wÏ³Ý²å¿'#ÐxhwèÛ§ÃÓf:¼Áh00üñ+9¼»†Ûœ®–qXšfïþýjLv1ÁÅüS}ÙÏ¸)¸÷—7	çÚ¤IcMÈ#L”½@(H"Øà,È­j®dGÌø÷‰@4Á²û®:i$"ñÍ=H¿ÿ’G¾¤Œ‘,Š˜oÜÒ—™"aä.™$- ü9¤ÂéSÃF‘öß˜¼šªÍé†É¬\€¥’ðÕf‰,ªy¬Sìöÿ  ÿÿì}}oÇ™çW)s½á0!‡/z±Ã¥ä£HÉ,*Z‘Q¼§NÍ™&§¡yÛž‘Á"XÁEXã€øÃpvƒøâ'ÂØ?¨ó÷à7¹zê¥»ª»ºë©žž!)O¢È™îêêê§ªž×ßÏpwÝ§¦1‰WNkDçÐÿ#YvKÞPÓ°Ù]ÿ€OuxFwÜGêåW—ÛéÕ‚vûwóþ#¹Ûñ‚6©Iîn• èÌ„ë… }Çï>¢oc{øŸö¡õF¯Ð.û¾YÇGxáìúÈ*Ö1H¥Z’÷“GJ›µ´PÞQƒk¶h8‘%Þù>W¹Šc
ÌÊË+).7”–CÜÌm°Z™ú’ìÕ‹Ô
P7¡9—²nÃö›/€Àâ&µœPÚ¨·xîž¨À®·?‰Ç7êPhn/3¯_ 	OïiÛT=
ƒNñ$½§¯gâ{R9Op÷YÞøÌÓa@Úg‰ls}Ä^æWƒ¶UŸ-õªò‡È~ç®÷â³,«&‹$–Ôu‹dB’1woñØXêM•+æœ.0­>o€É—Q’'2N˜‚QFÚk<ñ÷èò‚
¯Ù„Bj€ôCb
«×€Ud0;7ð@Tþƒ 6É©ò—ÈºÖQš`Â©\¬N=ÍÐÞ–L\MIýJˆ=+€=Í~QÌ†¶JŒð¥îŸšÝ~Í§°W·djf6žÜ]ç53üÏq…39¯rÞ<ÀóùceDS•7;Yƒ“ƒï³YçVˆ“Q×gí1YÏñ"xìjÛuIU}I2×ÿ¤«ø«N¦rùÕ¥°NÇ'mÅ5uì,8XýFÚ¡”PM¤ò¹ÊAˆ­=nóœz+Ò£Ÿ½½`¢àb8ÿKÒ˜%…Œ]?nÌ±ñ ‡ŠøNÖq—uÀàÃ6qgQ£jˆ²]¼ÊÐC†ÛDP‡D N}ûžÃÆÀ“iaˆC€ÄÿEÄe`º¦€C—pˆ9Ä\ÕC÷p—æÑ>ÎÕ·šøm¦Dë‡¶˜rä<ö>¤pøõ•¢á ±pb|Î8(t‰„Xšð¬¼ø©¬›Lªë(ZýþC¥v}ú0ùoïêº²&èG
þYËW“/Å6Â¡&Ý¾uè‡xwÒ¼ß‘øH1¾áÓ™G‹ëø>£¬L=<®F<	3QË Å8!Öh
„¼µ4ƒG»ûÅÌNÝc¯4œç³¿›:Å˜!×‹¯Î!JÝ­y»C›jÓ6ÖØ!TRmîÕf¿.«µáÄ¡_qÃ£ºñ3·pÁ5_:¾µvíŽ×Ü÷Ü¢Þ0‚¬I-Ó£áõƒÈk¿òÓ99*ü¹BÊqFÈ5
r,ÿ™y£\vºµEöD#6ñm¡U•Ë¨©ìNVÔ9 ‰gÚ½(bùXjÈºŒd)ÚŠÔIåBÜåŸ7Xmf¬%'“ÖÂD?Ö°ßôR0XÒëË*Âb:W}JKFML‡‹©²aH©%Z*‡è•‰ƒüüñf*¿=’ƒyóƒT4¦±kþ'á§¬€ò^Wà4k]ú¨—ÅŒ¿*lÃØWÇ+œpÉ\‘ÉÙö^ºI~’ûÜ:Ê 5f¡“k”å¿f°ü¥Ð÷-ß??ýêhì¯ÙeÖY—Eª5PLœž¸*ºN5«ª5
¼¨ŠYQ!ÂhFÆÝ—àÌ¬H”÷5Öà\C;AuÛY Ýhé87=æÕz]0åtk˜ŠoefD1’¯ŠÝ›Ž:‘­óÓÿH°»ÿÿ¾Kp:–D÷-oØ üfM›R
j!Ð¯QY´ßÄn/§‰›A•"ã
TïÑUæÐ¿¥•fwµùÒ)Ú•‚ OF?›çÌ^ØNá·8ÅFã¯¬¨%ô¬0ð¤Ñò s*¾1Eƒÿ{Â%ƒ;tƒë)`ô-OÀn½#„P™þˆûj>9ûŽ¨œ•t§.WF˜ò ) ©Ák®èvô*VÎý®B`h`“­',Êê«œ’˜‚ýºë^–Äá`‘àNÊÃÛPO¹”¥IMA‰†ƒ"#ÀA!á«øcasd§>hÌ}‰ì”ù9^µÆZê–‹`xLÌ¶dÇNJÂ€Vô¤‹(êJ†¥#õ‘™H|¥¾Š¯Äþ¸MÿëòD|ìÕ¦L´ÈªêUDÈXR¢,ù¤ïç§¿aqáeEk‹8ãr--;Q‰Jbþ\ÎâGCæ^Ù©ÒQ§JG÷Y©î* Ã-øö²O+ô¼J)+ˆàu¹©Y89UNNë<Äf¦çi>–yr˜r	wÔ\3	µ9÷wôXØÚ²9§psð&‹[*œÇV+l¯™#´Åtíí+j ö…§×7¸S¢#ºÄÿÚŽ‘™uÆÚ6ŠÌð\…/ fâùŸÃŒ&¶LÂÇlC	Ï^3û%
'nžÈM	[ŸÚÖŠ”LD\ï´hËÌÀîr
§:¤LÀvSøÔ˜úÎÙ·–&ß"‚ÀØ®X Öd,¶lÎ´]ªß°kE Ã3·ïÝ!ëÍjÂÆSV›“K3év æÏŸ{»™¹“N%URHíš‹ÕI7Æá“à)!o¶xù9ïÎPþg¯Ý«| ¡Ñâa„3ÞA|LŸˆ._‹Bï¬t,EÛÅÃ)NšèˆŽ¸¹Un–êŒñ±·¯Æá0ÏÞT…ª”z?@LïŽŠ´£\í¦Óhâ²u~ú%ÃæU ‚­ÊY5J±Y)ÿûñÁ¾|bïé:¨ö3DôOD![•x0-ˆ€RÝ-Áfž$L'"·HßþS¯]ÓÃÒF^F¯_»E–‡dÃ„BÝ§£óšÕùéç]Òúþ‹.YšàH!Œ†ƒ¿µø¾Å¶Á"Y‡šã‡A÷áh±ˆnv âÍÏ¦]0»¼§»ÐÓÝºèþc‡!dµ›Ç'àº< œ+X«Œã\»)›@£Œ„go×$Ç÷v­òÃ/ßß7]ÎÕ9d¿j›š UÙ@B™†&Äöl¥glãgQÖ- }€)» ãµ O½ ý^`÷¦7@Ý‡w$(’1Ùø±Ä®¦ÅÕž/®å¹åâ$Â¸îíði÷W¦—¤Å€ÔVÈ4`˜7¼­eÁ'‰n=èôÛŒg&ãÄ7$¦œ‰í0Z¾ÿâÑî»J–í§ù^È€‹È&UjúÚP§ÃqÁßÑ“²Ô6]Q¨ªŠ(Š`ËÍª¾ÖØ¯òØÎ¶
JŠjf]¿=XE%ííRKi•þ‡)èØgK»`sÁ¯èBÂNÿB^›Ðt WÙ/˜z°BÀ@®Ò_­çŸØ›ìRå5y= Ê2cð†&B
lGÈ_Àúê;G«Œæø£ú0hÚ¯‚SïrÈ.~+ŽNí†–VFBãËi
]¬`áÔÝ¶~”K“‰€bûETH,åÆÅ‚iV’Û%÷v/Ž·‹˜Ãíiª[¯#¼™Ø¹¯¼÷BçÞ´È¦ç‚|‡±îì„ç§Ÿ1Ã8tR`ÅN£¬¡æ1iÉI¥ ËÞ5˜25WìÍWCòà¥Þþþì5á	`"­lƒœC>Yµ(cœ¾B%®¸Ê(cy”3ÛˆqÅ’„HxéI*? €"ûºAÚß3·Âgt"ÎOÿ4E»,Hc*‘AÕh]›"ËmQ„+ÇSr)ªn[z¥Çƒ4ÆH–ù¢™vÂM¡Í
mg	Rò¨f‹4Ó!˜>€…º¢[±; rü'‡ÖL±¬.U	o{Å¤öÞ©\„6#mþ"êbLg3X3	ÈV¼M;ÖóÞ»³J€‚<èFí:wÁ G-¦—ÁÂÓG³sõ=þwòuæ–€Yš;!ÿÍ­TðãËÜ1ömˆ»ºŒâe)ï)œP)¼´w}*‰>[æÙ2Ûœu +Ý+c˜³l»ÈhßqÍhQ0‰Î´xVÎ¸gƒ
óÛW“~ûå`‘JT—ª¡*øb*‚+¨.®nP»ïÏþ_W«Ž­Y!,¥Bª…KÕ—«Î­–®¿FÉà‚ò_µiYùÛ([ô›r2ó[ëk~G­÷u®õEyÂýt:ßål‡ú^§¢Úêêz]kz§u·©k¯BÝíµU²Ó‹¼6D©T9Içˆ€mäV~kbZÅàŠë¬%¸#»3%¯%½–¬*‘ß`MÀþ0Io„yÌ¡¢	9' +ÔäoK¤’üˆRÈúþ~èï³¥p ˜äG~sÓ‹<Ià@6¼Nßö»ƒ¼°ÂÁš)×Íí5ã©å¨§Ã£óÓßrÖ€W¯ãhò/Î¾#ƒøø¼O^ùh>ß}t~ú¯ôšxûoöø€pÚˆd½îˆ¥‰Ï>yBkÿíNdŒ9ÿ] |È£øUçq¡Ò›¸d#Æ-Ü†wFÇŸŽ8«9÷+÷ÑÒá70µ,Šj±+vÌnXŒá~Eºzqþ/œ_ô×]¡¯Žþ‘“GÎÅË(êƒ8_ú6f½ý=›®Ÿœ}7î»ŠÒSðtº{|©gé’‡t RÛüþ*îoþÍU»Ø“z~úïÒø-cÒ†Ùõ%0¨ o‡Õ¢¼©xOªi)cÎTjƒÍC¤(’Ñ‚=HEkÖyWKèß »³¿ìÚ;o‰ ™¦n³•uË‹Zu¶VÐN&M“Eýì9òcB—X’–ì·å™«('cÊsL©*Çq—+ë2Ö<®MÕãêîrrv8ÉN(°€´8§‘þ–Às4¹þ2·É§ÎÆ6±®âÃ)Ð‹c6×Ø,Ñ]G3t¨È£Ò¸°ƒEoïæ
Ä YÈs«xG§¡'T³Ì ¡#DW–o&zß2«ñX‰$–©kO­ Ùô»$è¤ù‚¨Èt–8yI‰kt]â2pÌ´xÿÕ‡™q…ÝæûÃmXàAÖéHÅ3›JºüöCù¥B+¿Ñð×QquÑQ›ŽÒ19š ûüýc¶}u‚nõržíQ'ýÜ.ÎÉ	äÅÉ é¤‚,Æ†cö$'í2úå8÷]¼RVâ‰È¥jYUÅvUNZ™ÍA¥:§*q4»GÔ¹v ¥½|üö÷Ÿlº¹šDÎ®&qÝ¤ÑÞpÔF¯=ìP³I¸Ù&„í–—$tc‰ôw®Ky×ÅV.p’ÉÔ.E!ŠæE8 îî3Ú‹_xí¶éÛ'ªM+¸ÀY«­jáo‡)jqß:‚Ô™"¿1TXlÊRKöuŸ´˜wªs~úµæõâä«ÝÖÙ·µÖs¢Xu×I?¢?\@ÎÒs†
Û~è5z‡…¨·°K_rØëÈ·>½…—A¾Aø£Oï–ë¿×P¡±e²ÂPØèìK©NÅ“Áx3°—1C©³ÅÉoÇ½"gß®Úw«µ•‘hÍt¼©Tïm:0~ÖÞ;¢Äþ9løµÚ`Ø™'»¼RyØ!?!µ]‘çÙóôŸM!§ãÀ³0Y6ŠoÎJ{î±>‘÷`]¦:kÏÏ1¿;¡L¤üJn)$“/«ðáùéï$Vd›û«É„ä?s'Oìï¹0T²4Þ¢ý‰òuU”gno˜O›eÏ2Ng¹Î`¸ŸQäL|š2{Ø$g2¾°ËRò÷[Aa¶nYt»êÆj‡§3×_“MõJG);–ìP`«%+cÿk}†W!EB÷{ïÒƒòKþ=åIù!®¢Ìá	óIUç!hxLo½j•Ê&öÌÆú®øÔpMåzŒ¢d‰1Œ…»ýþùé?‘Á÷_ˆ­ŠW™h@Âµ¢é92;ÆÅáw3ÏT©A¥'lÙ¬–ˆ}·wzýìZÏWwÄ<&&°Êì~ƒY™=Ñê¶Ï¯„¼Àë7`gST"9ž¥Fôœá-‰;—ŽÔ‘þ³lKbâÑdÓÎù›/¡¨êÍkMæOâF¦yì½ô‚6,[©ëˆ£IHš	Œ&€e:Abb`œ¸?1lŸVèŸJkªò©«\[e²S'PW¥.…Ÿ`š³ë@òÄ›/„N¦Ø]eóPË¯”}dZluYŠ­X|Q–E]­‚¨GIZ®ŠÆ?Ž‡8?ýŸÙ<UÐÇZ‡µÅ¼9ŠËàÊVG™Öb¶ýí–¯’Ú½Ø*)-ä½›Wd4Æâ’Ýq—¨Ë¾®"³»N¬ Ì\uÃ©:êxàíùÂ™µ[BæÉìýû«i6·¶è1Ë@fÐ„Ýã«¥QeM)žIe‰Ž³–FzîÆZK3MØ¾ø„íë"Žæ5¢¡×-Ž&ÚpŽ£‰ë¦q´	ÆÑâ’­j£h½ ›JCW‚hIÐâm""÷Yô*Eé4Ù0ZŠ¿@›û#ÏL~Á3Áéáo_½Ö ª¼•w%¦&rW ¢ÖÁ+e¨±+.(žÆ;Œ]@Àº´‚j£iqÁã8ciël	äèZ<­¡ÆÓd…ëâi1PÞå¦¥ºøŽÅÒø/‘²ºŒ3¦¦Ê›Œ«µÏß|ÕUîÂkQÈçÖ.Á±Æ×âu Éï›ÆÖ¦±µr±µTá³)°f˜£Óàš¼œ=´–>mX+¸÷Õ	¬Å¯uVË~=¶°Zv‰ºÊ¡5ƒñzY"k&XäiX-9oV«¸mÖ÷Ø-3Ö°p°´ìãiIÑï;HSWß+9ˆCì»ŠHm9Á4ù¤€Ó¶ß&IË	éMãã’åsW.nâšXˆËôe¶éµŒÂ–j9·Uzžò¸PÖ› n“”Óä¸øwtƒ­^“ÿ²Þh€ÀyÜ>ÞÜ\ç¿=€™×õÚÛ‘··7—u¹šBnÜ¡ Ö¦Ç÷BÉ°»6Çµ›‰½%*{°ú©;ù”’Î¼Fi‘^¿p`tº°‡“&ëš,øuõkÔ£Çw`>.uƒc•ÊLƒÏu’ÝÝÛßm‘-¯ëí³5ÒðÆÕ‘NzÈÇÚÛ(ô¥çyLÍO$®Éñ®u{]_:Öèšš*Îv¢oË–¤BE"R´Kß[¦éGJõ'o°˜Fù.½¢6õÐìÀº&ÂD¶%2Ãz¼+žLå½Ähr9°÷
kØÄ%šÃ”$¸)W±¬$y$öF¦F¥‘`ªøü=”4*UƒH#ªëÖm*ò£û«ýdÔâ·¿é’] êzyöÞQÁ9®âzq3™#{1€¨å÷bŒ/tè–?ÆŸ‚÷¨Ð3A%¡«]6:Atë˜ÃQ®7›Éú£­v™Ì‡NsUe«Ö!n
¿7Ÿ"TB'…æêO¾1S¢ˆÿÖì+¾®å$tÚ0‰?9?ý^q¼…=$M®5adåéM	3Jé[UC“÷ÇC?"Ùëƒ~; êéÂìÜ³¥_’U2;{‚»Oj{¬½œ!œ\Žn$âTä–¡o u9¦i››'³/·°µ…@å·z6O:¿$1…¤òäØv¨
ð(ÓËÚó÷é³Ÿ,¼Ü9yŽl…pTòsCt÷\6…Øm"-Â[Ø¹ÁGoÓA³:†´{£–¶ä8~¶²´r}žÐŸ7ØÏ›ìçìç‡¿dŒ#¼ÿBéHâº?Š]÷G
càÉmú…›Ÿ{ŒõÃÅ£¯_r‰Ÿåw|ñ9ÓÒs¬??ø¥‡;¤/åâ³†ÞQÌ–Ú1á¡ªU²¼BNæIí¿Î“€{Nò²¬’Öû^“åaT[¡’·4;7ÇÖ©Îˆë”bn|çH#?.Å…³UP']6Ý3	ß`µÎmß-ð¼%‹… ßÄ/ä¦e\4‚Z ³®“Ge›’¬ç·Žåo.—myýøBú;âÒŠ,ãË&H±Mˆ …Ñ$Z¨B|Ðí€©=àù98©3™Èˆ_~¸ò²­97ð’ó Û¢$:êÓ¾uYŒƒ;¨mõO7WÉÌUæ¼¦0UEÉ+*+ÝÛ^Û`vÃ^W
¶Ï²«SÒÍÚ©ùuºïïûQÝ
±Ë¾£r¸™xÔjOmÎM¡¥äpùÆüÒÒ’üwñBÉ|üEµ6zŽ7¨i²úÄéwQbeWÑTJ`ë¡Ïª¶ø_ê‹ûTyÅhŠaŒäâi±¸è˜ãõŽ4Ï<Ã~•–’ôÍ',Vì“’$åö¾ü}³²´¤JâæÍ` [zóÖ1D!V xx­×£D²SÃí‰¿úƒÖÆ©6ËëÀûAßOÐ%§µ‘U²ö¸=4sÉs0Âû(v¡¢*âñ„-ã	Âa*Ú}ùV›¨0›ž0†H\n„ìz™Y\“Õi®Æéòôw{Æ<"q27¥²—K5gw¸´ýí~HGcÐòÓð'éøÚT|¨,ê9/«"bEï„åÂgã—Õ.“1`o27j©äTƒƒŽëºÚŠówrO•×+’R~ Ñ&HØŽkÌÈ™éù`ð Óï…Q²n^»·ÿ³¾ß­E!jëE9I@4Ó_}™ä$ó}~$w~»²E0“l’ä˜ÒHrî…t¼¹qU–’88œ¤Ž<Éã©d~“m‰RUŸ‹`,qð³´ÁKÖÞ¶_l2†F—‰VÀóÝ|%îû ™Ê¬go™ÝIÛäï ÿ!î†øD>÷_J²sûBµŽÙ·¿§j+cz¬×ë³T£xþ)°>ÖÞ/|Ð“¹çX—¦£`Yùmúº\°ü©ÉËðÈrÉer½ÝE,}ÅÖ€5UÉŠ¥n½í‡ ¢£+ácÂÅ¥D•ËL6W0{`26S[èS{“J9X¸iW®XÜ¨6âízíaä“¶¿-\#Q¯¿°¼¸B¢Ðërƒöˆ} 0$üâ¸ÍÚ¦¿K%°á7Ñ¶|Ê>ßR™f3ÏÜ{¬`Õ’ªö¶aZëåçŒšy¨8Øãd;1ÐeŠb™voISaT6ÌØ’]R£§B	|Dò¿¼<É/PuºŠ,˜õÜî^Þl˜ƒ…g2ß£}gœ”Ne§ZG¦)2Óý¨nÉºØ”™wjÉºœY4Pã¿t)Ö¬Ë›[c/ò/³°L3vÆ¼d­HÏ½á®“Q­UZ,“T©Oa‘fËžë^8€‚À=‰&æjÇ®Á‚…hvùrÐ“ãS}9¹FŒkåŒ1x½»hãUJXMÖ–õ”2º¬ØJØv"°Èašn¬Äµ|`ECp"‰Ë†(ÌŒíÅVKòX±O¨ã š¹œÊ»ðÍƒî^K’˜­
»Nú‡D»(1®~H´uÇkîû‰§nàSu¥é…G3)Q`ØCJ€èƒÄ!Ìþ^ÖGOcäÆë!;!;?ÛYHžÜÝøÙ“ÍmÔÎžj\Ï¯†]R¡™ÑGA‚ÜÍ{îÜ}rw³Ê¨.ùtä-Ñ öòì§y0ˆLG"îN8q‡kÚM8Ù.øE—™_ôiàÐ)O¢ÁjÑSÔÉÏéRð)‰zdÐêª¸ÕnA˜±î>˜MÅ13h„½vé>Yè0¾CÄºQ%¬£X™ƒªúöÛ€ûz$±$‹½¹Ü4ŒÛÛ;UÄ0P$	|ˆ	S‹Æ¼Y¦õ4Z~ãÅnï°\å:ó}KXFmÃ¿Fç ×€'©ÈÅÞúAÛbGn“%X5¬1=ëª‰Wt¥gÁwò+ì‘$}L<áœÃõÌ¾ß6=h-ÿéÀ,¡Ÿa=hÎ¡=	Ôò'~›J{%Ý{öK—#ÏD²gãB0ŽHEÉœu±˜µóuÉô¦FW§ðzáB¿0e.eá-óÊsÝ¨ÃÍ<«·M…ªÖý—ÌÒ?³}•Ìäêì<i!}ùôž«N©Ó/9:û¦)û8>MÀd³Ç¦OÛ€ð5ÿàgÀ#×X”>Œ‹ÛÀ!ËUÈ"Ãõ'këaØ;øy³wÐµX¢×œ,Q$_úÕ_‚ð²I1ÓäŠÄ˜Ÿp©åXÇ‚wkáq›Jó» Í¨¯(’f~Â»+ÍIiÏT šÈ]6yyF‘DËS®„LûÝ¦«Ö‘Ô]]‰Óê!ÄîEÛiy=}Ñpê$CÐ	zÔxô¸ïí] N»WhÎÕBöÇ<	š‡x n‰”7#5LsÇF¢2åbÉu¦è	Æâ-ËübÝÏ œDÔ O*¯½}Ÿ,å9òc²²D~C1Lw¨ÍÜ§¿{¦´ƒf".ÅIcv¾ÝF{Hçm-–5dÔŽÜ,U8Z
|rczV¯×á÷y?Ÿ‹—£”ƒÑ-¶ïqwP-hÂ'ô'ð%oÁ­—x¿öTôfTÉT‡	~‚æàC.YuŠ[1V3³á™xAâ“Í_B~‘þ!4w‚Þ¤Í±Å6% Äý‚?õNÁ'î=r8¹"	PwB hñ\%1ª­7ÇKa*ä÷cï¨+Ý¯ð[UGÄp0;qêN˜9…~ÏèkµoZÅ¿6râ3ä!jÍ7X^^ãHnh¡CuùHXvõBÔøÅÑ¹ºŽXˆ÷[½®x\¼¾'hôºN—iºÏ‡T÷ù0­Zr5WƒŠM•£ë¨´7O·Î›ûÝf —y	asÚ³³0jl#3¡•Œ¾o áô©1Rû0ù•¥NZ^ÁÏ: ‡©Ú½ku¨”¦?ÑV7kÉ©ÊŽ]ñÎÍEYEšW6:á™˜à0õx}_é©ø`.Z½Œ²l*DŒ0O%ta†À¸íù¼~[^&i…+=½övßëÞ:¾©;p®­h“ÔlsH„‚c£õý7iœ}Å…&mŽßã@­y ÒÝ³?]øÛ´Ä¡]sè,Dî»é½^/ÊÏxú0Vâ£„oÍ…ÓPõö™¼{Ì£×÷ È¤„/OJÞõ“”™Í\z×ex·.£Ê¤ÓóÓÊ^ÆZùöcîòÙÊmBèuiû¢*ÛNz53øæÝMé	åÙ¥Êx‚5'YqÕ!”Nòì&ûÀ<}¾äÏöyV±ÄvYúù	ûSÑ2BÛÉtt4/Ì§À-M&ôs3öh÷C*oÉ<Z¶²£Ê#m‡Žðv„‚ÎÙÍ'9pI Æ)3Ë…Ž¯®#'ÏZsX­Rä6yLbw<ð?…dË_00•ù&êFÜ
mÙË:
¹ƒdk0úÀ;ÀD.¯Ñ{(£2FÏ¡Ê´iyTã„/=lsBj÷©‚ñ›.£ùð|^tý÷ Ó<û½"&©(bj.•ÿ\¶PBcV	Í¸ô¬WÄ 'Ö3S¶V†TQ!¬m™PIXLÔÛeû‚‘ñßÕÚ©õáã-/jÕ;ÞamyžôY¸Îº!–ÿ2ìuú{)³Ø„'ðsé‹BP,>oXµE$^Þ;+VxíI	Ä^«’•>+A]<ø[xÃXPžðtƒ¤´¹¤T"ˆò=¿4CÑù:ñ^r°=ŒGŸ°ìl&=	jŽ¤Ò‹ïž!z“Ò¼‘|¸µ2pêÀs…½ö€0,Ê¢]»Z%‘•d®r¸êˆìp®ZUAsbÖv;¦A‡zÌn‹tÎO¿lM+IìDjö×¿2‚ñöÙw$êý¾ejÜ’f)Á›€‰üËˆª;Üø°Ë¢ðì]Bµ¡ß2èUwß‰J= ª2oD”Ã\D$l¥©ƒG»$ò!~…C›a?-ÚISÁätº¤žFåµUFTOR€swaë},™"M m6H(l÷Òµh	$œF$- `É§C&´8ÐM7÷ðS&ˆD¯ÃuI¼æx¬Ô¸tBºìv|°©®çµ>îB`ãôÃ[Çkí4~*8»GPóó:àYmx~+07k[scÎê•Þb*àÆL ÕbçKœ7ÈÓ©"®§‚HŽ]HäëSé¯¶‡óðs¾Þ¼œQ’éøêÁÇHÐÆöÓ¬/ÆaâòvÙa'Kh ]!@v’È™XRÓ°Y^ñ *óÕŒ7ŸÉ™á2ŠvEÚàÜ¡Êæ	Z#Ò÷¦Ó >Ujuƒ‡ø‡]’ƒr-YÅT-uÅ[‰ß—¹¬Œn§'hyŸñ€áÔ»T/r½"O‚O·Îþ8¨
U¤ÑÕÉó7ô+ˆ¬F÷Îµ”»Áùé¯‡ÉÅ³ÿ1³7R£OöÏpÑßÿ….T/œ«Ë‡uPã^,óºr™tcÂ+“ågÉ·Ô\–ŠŸ%ŸJ%¢«áªPòLFÞte-Sº7ñ€áÝ)™ ­\C §Eæ:{Aµ!góJ<›³N`U5N< 6iF/i«1Ä	ÿÒzè.¨ü/ŸBýbkˆKÊ†uæiÐmõ:þ€|L»Ô$½ðÅþjyéoâÏ7èÚFw`öSjŠÊnôXI¯ukÃÈ£4—!8riÞ)åb¤¤`#i³Ëd­jºŽmÂ>eé"ù¤5$/²¼Ä¤%1fFtžøût¶œ˜)ÝôsÜîH
pólôîÇ· ÜØ “¸A÷¬ß<S4í ©¢í2È‰™®t›ì˜¨šŒƒ"“Ç!{q
–F¸0d•TB*Â:àœÜ–¿hð…50âQÝ
³;Md·¥äÒÏü‡=ªk¤uöoÝVµ“~‡ÚcÅSžñîLø6ÊÀŒK›Ï÷È8ß#u¾Gr¾G?„ùîz:70p9Ú…ÂÐ×¹çŒÄr+xó_YET59×à(<Ÿž}Ñà¶¤/8ÛùâÉÝsÁËŒ²¸-{'˜\¬%R£‚ÝÊàMwáGT.@V@DFí¯¤D—n¦„Ðìª/Ä5èv©}¦^-,ËlÁ•‘(”¹T+ûôúq­@V£ÛŠÈ˜uh™¨T%ˆZAW©úÁØ‘ªZ¢–ßc.›Ä½Ó¢ê¿7Hçìui¾–å˜Z“¯pæ(³²IùùV½ÍK_2±—¤wyìz}U´.¥˜Waò,a'®L²üÍ>˜¡µr=ï\äŒËQ*ËˆÏ³åk±NžSM‹ÛV**fímyý^EV±c6Ø¦óIb~òBzÆ¹â¬?]g¶“$#ââ<ì?ôŸØ­ïÄô«»„î¬tcí‹\OÀøÄ­&Ê™Óµ$nï¡wä‡ƒÂ¥Äöñq,$mÅi1]KƒRb9™°Q‘k
Ò1TÍ‹dÕ<)ò  êä®OZ~èÏ“€*™M”_2 IhÇÕÑüJãÇÙ{æ¦¡âò/ãÕ
Kž“6©‚:	ÿ7ýÝÎÿCšá¹ÝÂäTÜ²Wü‘Gìîºdâ9–Öîƒv“š©:b…<œ'·Z2S­â;¹ÊŽü”Óö>ÉGöÙÌævº™cI'4F=ÙLö$×Ð¾IÓ‹‹ŽªÔÃ¬X¶ÛgËËjÂõT–íË³?~ëìIŸua:†S6­5OŸ}û}ù[WŸÒèIÜZ’ÀÂr6×1ã²O'î$½¾ß…tE`ôþy¿I/çj~Œ :+ü¯¨¬ŠNGì¯ø,3Ìö^*3ÕyÃ‘ß:Uö“™4éeêfN·‘r¹&£JXÀÇÑÌÑ¡øâ,‹_ ŠÂ8Èá‰µüÞŸW²Û¹æëarõ®Wš«W"Oo„½‘ÝFÿ‹ø—ÈÐ+Ÿ§æ+ÅÄ'Á“pEÁûNöŽ·¯Î^Ó³¡±²Ywîwéuº¹t2ÆŽÍÑ=F?©¼™Àé¨OyAä»^Ò^û†É	²m<Ñ!ðVì	Q7Ì,³©²k:¥Ú”Ž¤O(†žÍ—ÁS‚*Ý,“]ãp,îëQ¹˜¼[4ÞÁ{ƒ=Ñ=*,µšT½Q¢w¥òÝ.m<^Ûq°<ò=9TA8æÃìIˆÝÙÃÜ?d!T¶s(
žK+ñàHF«ð©“§
üh
¼(Ê{gUøbw¼¢Á«	SE>ÿ’‘y=³ròú¼˜ªò®Ê?Ì¼Žj´x´ëðêi—PƒW…õª(ò©ˆÙˆj<>¾6UãµÇ§Æóö©o9wBJ|ñYÅqvN£u†I@ë±ùØÊl,ciæ‚${*c‘Õf[z”š ÛGÝ†^Ó·‚#¨È
p-WÁúÒMÇÏSí
y?{c`0Sá
“ÙìÉs(â'o~úO ‘ø2[g¯-2%'Á;(VM\rFÑ?5¡àâ£Ë,ªß¹Q‘}e•±BDïàÓ³o½ì$¬áªª´ñ,üXx‘86ø
æB'ßU1ÒG"P©è=ÖL·éïÌzÛA—¥š¹nWæK]'w!7I¤ª<i3ÜÙÁWkŒõAüÈÙ
/oƒß?û5ód@¾C2Åw¢K… gu a‹áä_Ì†ƒ¤ß¨¶rv¹«U®i×êÃD®nY!_“2×™rääd˜*NNnß??ýê¨N–y³öƒ	ZF_{æLzÇã»Ýz»oxšP²™Mýÿn:¶“†Ñ¯-¶X®‰)*Ë-([(2„2EVÖÜ›$ñpÁF=B'M¯Ý†tF˜¤éš(®ù¼7é?X^‚œtHœñ8*Ž!É!¬e€I°gôÛnp6n¼Ÿ%Y?5åb<œŸÆO³Þ:è…Éwñ7tèÍ_ÜÆàttRPÅ×˜<w-õLà,ã€ÅŽT›%è@ÍzæBCŠx$é¤?Ž—áÞ3OÖü ciàªÄiYoÌã’p¼Ÿø	Ò¤ãñÉX†q\„—²¬±}$zUc,æÍæU±¦Ô¿²TÏ[g¯c\]79š÷‡ìÄñ=AÿõTBŠ/í‡'"<#j*$ÅG’øƒÐù¦âQ|hñå«&!£'·6íƒŸ%¢ãÐ«ªO‚Ä*Í¨ïðX=€¹ø¢áÐC,Ë“Ò¤ÍK°†§÷ësŽ&“eô“–¹û,È­ÆtØD0€“äü½o2¯‚n£=¤ã]cvý
øâÊÒ]f2 ã‹×–fNž£–…Ñmf’Ãøåj,»šË¥æ‰˜ÌÅF³þVñ™#ØÁUXÂy¦g?ô_BožÕëuø}žYÁ.öh);ØÖø¿Îù‹jA>¡?ß£;©«Ž·—hzÑÅýNü{¸uó„ÅÏÕcŸó•ÇƒÎVºBaÓ…Ö8ª’HÒ[ëûÄ€²{7sVi7mË1*i²éÜeq½†w˜£«0ú©S%¾¦ AªËÙ½â
%uBxôYdhÿTRm|ºÝÝ¯ì³³X9wâôD",¸Ñ_ziç Ô)iÇ¯„™yaB Æ¯v°O¼—ŽÎNSÓ\=-2*˜¾cña¦—	…v±A£°^þ ïe£·p7ÓŒÎy‘ 	íãs&Ñ(¡ïðT×ó™õ&óÃïšÎ«&£ù§î{ŸžÙ|’–§Õ‡úeZ±2.¤åúP/¹öº,pæ"~p÷ŒìÇÔ.4L£Ùh}ÿG!¡²[>ë¶TœéªW¼êåA¦ßÍž5]ñÇ´LC»lë]J³:~ž5ÇDºæ5ðt%eC¬˜â}¼¾\ë×áe²uhv®…AÂàôß ¯êù›¯ºûÌ÷OE6faÔH?XZ‚˜@·Üi¿ù²Ÿº«„<T]ï)nÉLØµ‚6”<m™Ó÷Â*ü8×'?Ž•qà[€Šå°àÕäÉîñBX¡…Û&Þ”Úu¼ˆJO#ôÁw¾}Tz›ôWú^•OÅ‡5˜p]ÿ€ð?æÉl³¹¸µµxDÙ	v$ÁìSWà!ÏÑ$" ßmrÕÉÅ'SÅžÍzæ²ž'§<> zÙL¦J>UÑ~ «Ú÷Cßïêueü£ZízÒ˜‰¢ò<T­”¹ÐçIÖ¡’þ¼éÏ¸‘•þÔ\PU˜p©bÎ¤)îD£¾˜$Þ˜Š%-k¨¦¨öÝ”Öºtï+1zŸ^ÔÈ­9ÜÃE{`m_Ü+Ô<™šº‚—ê‚1¸ú¨°‹K€ÅØócr?Ôè1ocÆ‘mðHŠŽ~G¾ºÔ4+svôfayÒµ7·&OÜ''t`E=(êa>“ZÞ\ˆ…3—U„“j»êé*kÓÅŠêdu&àr~ÛÆ
ÂQ^¸sWæò‰£«ïïJnœi \Ù×·^œAé^è•Ó“…_	uqƒÚ‡nðÿº¤3<?}%JÒ’LÏtPB“o˜8føˆÄiD¼¶L«k±ò2øròce0JÑ gs„²L‹— ¦ÌÚ§ñÔ˜©¾VW-4|±-gkÎÊ?[9þ´ôÕ%ûÜ÷3'MõJø®±ùGâ±¹ÊˆUBã,õ5lg’“¹Ÿ¡×Þ¦‹×­OÁGäj:ÜLE¢o
çžŒÂwÄŸ®ˆSÙ{éÈà×ugYlpåvYz8ƒÒtÍvÅ…·2cËÅ1³ÖÇãgn"v6NwþæË£dû¤[_om±_ö¦Òã—­Ý~}Ä¶Ò?ÑŸÞ‹sý€Dç§ÿ
-”ïrb:VÁÝ>?ý]Ã¡#í –4žÕÄF*‰J"§ó?&ã4á9È ‡ÝñÂVLø5Í0"¦b”­îS…€–Â²ÂœHBÌÂ¥z—-“…Tî%d jƒÕîTÁë2áüòU@¥Ó#+Kñ¤(B#A‡ŒN"4!‹pet7Ëù1”ˆå¼Ôª˜G
½bORÎà†ÀK`;å²m—Í-k&xîü–µêÔ*«-S¥,eÛÞm­Øhù/Ã^÷¡¿§’0@¶—¬(üþ›óÓÏ–)ŽQß½nV’ÖnU~Lç]‚Ð'?¡/´wÏ_éÀÆRð„®˜Ä -`Œ‹ÚÃ¼wÕKÞ—V‚­|r-ëó¾3òšÊ¶eÀh‚Í‡;(é„íÒwÖ×
½Æ¸­©Ô]‚¦M$\Í˜&Î\Åi	·‡»Ð,-‹kf…Üè"O/×ûaÐ$ðtÜÁÂ2[­óØ±”'ƒ‡ôŠ‹!3‚8szÅª}§™p‹Ñß­ÜbEw2ßH¡™7­Ó$XxÙ1Ê2æäÁù›ÿèW
_vDºê±PUÛˆ©‰¸vKÇ™¦Zƒ©}Ôb`›ŒŸš¥Ôžn®àÔúS—Ð-\ü¶R¯×ç5Vi$]ÎU]¢«nlœ€:žn…äÔt¼W2H~2·[ÕG­–YžlÕÀ²OkÌÕO.µnQVGË	_’ÍpP~ºT£ì¡›™‚?÷za‡xÌë¹:hxmjÆß £Í®=nS¸öŒ/‘«²­³?V>„Œs†ž`Ö{ÔåÆ¥Ó[)«¨ã+0Ë'¡'–\!¯.m¾ú
LÌUU'[ç§ÿæÙ_À¶ùþ›ï¿ ÿŸŸ~M.~ É æ±	Ðu®Dn½Ù4pÂÄj s4àfÃˆðöcÓCè¾˜%«ª©/E¼†9'Øû5¸»ú^	œ/¶êÐ5|¡EŸï&{@à­®qyxqš÷\@G2“^ß7	Ûk{{{tË©¢:¬¦†k5/ƒA@-ÍUa
K"Rõ+u;×?T·uýk5sô$iÐ®
Žn/‚•ºwà7“ïzT„‚è(÷‹-âÖ%E+úéþjyéovZç§_1äå¯ì©)¡+Ñ…ÚÑõøâu€È‹³Å±Ôv²u±¨v«„Ï £@Øóâþ[lfô]rPõ8]ä¨x:Vd¥®sÊÊ¬šÓžµi‚'*²øGÇË!Ä
ÚgßQåßy—ˆdÔÍªÝö÷ß•­™€=^\Øù¬ÚRÕØ¤Ž³ª<P6÷É”h`ç¢3Ñº,ZsçZ7–Ãý ™Ö³ìU Y—UªWeÏèw÷[o¿ö¸É’0ê‚ÙòEÌ¯>fõ¼¯+&V/œ²dˆ#—%ƒï)%H2ø…iŽþºYÓ±Ž5*9’8ã8s_(i
ÓÙ·U– Ší9'Øx?÷ANæžÛò¦—†bC_¹§S†L?J¸wŒ$Y{F»±ù2¬³/ß~MO~œŸþCIjË)…Æä(4ä†5B6ó”;#}Õ”;cÊ1nîÅn/MŸaÔhSúõÔ'W/#~ÐZ)œ(OFÒ‘)MF.r9¢ðå"Ã¡˜!ŒOz7ÀËU/ÝHÙâUC2¯%|ûüôøøÏO_Óñ¹Ý—¦{S õq ­‹Åß:Š¬™Ã÷q¨½ ¨÷°wà‡t°js	€vMÍÙ2ž;WLcÊîYÑµš7OvÑ»eƒ>PDö¼FÔ£Ýµ/|ËtÍ[XÆl=¡Ã.©yÚó·{s´Ñë€²WÛU¿#?ý°·náteƒoÑøaàO3ÇÙäùF5– B`êÖANoÔqùC;.¿×®‚ò'J[,|¡‚ÉŸ€VËG5ÀC¤2x~Ö–#D?¥aúá˜Œ†.î•¯§ë¯iÇH ýpTÜ‡QÎb÷‡ÎØýp”Âï·ö*ÂßÕ|t:å‡Cm¶#¢ørîø³¶Ód— cò¥ˆUÛ_Ì|®æ;å¢ü%3¥üý‚1‹ô)—‘ö¦¬Ñ×–ôŒ7îO'Ty˜îB#DÑ!ƒÈ£6ÛŒRìÝí„à,À#cÔ²FÜâölÉ¬ÿ¯ÄÓ‰"!ÖrS¥u'±ã°<8&Tü2ª‹„CŒ€‘á #«”rÀ‘l*Òár\ £ H²îU´Æ³ºÝš]rY°$R[¨BI&»;š!{¸Êð YkåAn.RJVIXHö •@C²–J¢ð®º»ÇÅ¾ÙÉÁEÂ»“éæ 7ÌZè¬Î‹¦²`´Y9¥õM¹4M·vÃƒí¸Ü}À#¥?ëûÝ$Ñ”hóä„DVpkæc ‘
C9 ±tQÙhÀ}—eáÉèÁ±„&:ý„4½ˆ…e`MMm1£ÆÁ¦îžpT‹âÉZ,/åÐ<•K«Dôüÿ   ÿÿì}ÿoÇ•ç¿RæyÃá†3$G¢$k)ú(R–‰²"Žœìzk8Óâôi¾y¦G!°>ÿ`dÁÚ—°Apˆl6Fœd‹î‡üÌpÂÕ{UÝ]Õ]ÝõªgHQ
°Ì™é®ª®zõêÕ«Ïû<½üW‚Õ®BR`„9N+Î02c/™åSiCq¦O¥ÂlŸêô—Óó}*í) EÛ
	É‚Öhrô‹†Ò4?{<9ú˜ ’Îñ—¾1‘Îlè:ñ]¦¤ìTúc†´Xê)À²‘ÚuRôÚ¦j0{öN|¹©<Õ
±xªû¦ÂÅíƒwœž?:'¶ƒr‚i%5!µOè*ßž?c Í¯ÎÜöúR€Š•(µ£uõi?ðâqLx‹ó'ì£Ñäù³.Äø*hœ3ÎOËmÃÕfÅ'ÖŽ‚¬o?¢(ç¦œsb|Ã'ŽïßiFloHÝòôi¶¶~2¨÷¥ºøùŠ9‹³ÍïÂÞ¨*€Ö‘Ââ{9‚‹@™’P[°µÓTm·1kk×mMÅÒ6~6Wv¶¥Zk+U©TÜˆÕ€SmÙÄ©¦
2üMf>ƒYZˆ÷¬F~ðØYÏ^}j³\:“¢œbGnU!Sç)a§QÌ>ý…ª	7Jº
Q€¥Ý*YÌ^êd¬¬|b/M?ðž¸ùI2¹½DÞ^ÃržŠœŽ×K,Q‚…K°—Ú].<\Ž,\Y\UW§iÜUIòiIÔI5B#‘9·VgÃ¹%·#«ÉÂÔvT]ù¶h¸Ë½––x)µâì·‚rk{ë="€4æÖv`Ö2òj…ebÕ"lT©a®Þ.*›Öô+cªg/p_e\Ž“\C_íNn@»Ã/'öõ˜‰›ptFÛÄ¨!cÎ´M2Û¶;kÓíú¾70Ñ½þ¥’6é[ÅW»	]¯ sÓ]%¡¹0H…ÉVþ’ý Ë…dn‚c½gÝcàoÊü}ÆNIÏÊkEådrÌ(IJ¶üF#t’ß9Î9r:íìw°Ð8p9ùCxˆ›”„ç¬á„za$¨jù¥NŸ“bÁ´¹”I8?ZÝ”êlým?ãs¸c,Š‡F,õJNˆÈUIƒWL¨Æi¦W¦à¯·{»õvŒR,SÀEÂ(8Ýp"ŠÃlÐ¤Ð\ÔÚ°1ú{]W £%,Êº€§]T+DBv¹¾Éß8¼6‚|JHúÕz(ÀðX’ ï„¸øR,{z[Î8ör¯SÆ±§ZØg{g{”vÌŒaOóÒŸ‘ë½Âäzb;£Ö3ÞóB­GçÕ#x~Žï<é´SrÂ”xYD…yïf¢¶âóÎÔ>¿‚ŒwòKâ= Ü,€Ö'Êv6âŒëÎÄuge5¤]LG´"Ô%Ÿþ.·¼ò»9Ã)9cîx	äfË÷vlôl¯"©jë›‡ä9¨…J‰R-ƒ½DB5ËTzµèÔ·N€w·‘©•ú¸-¡ßMÅ»(9ÊøË±­3#Z­„H …f-:Ç8cYÓ¯“fY‹¦$Y3÷«O±ai‚µà¥¬%Û”I¯æj¯Ê&:ÝF¯È3LI¼Ìˆ\-¼eR«eãÙhÄjÊ³¦”_%Z5åàœÄªœ±ª½V5Õ:ãTÓ9Õ#§ZpÆ©F¼hœj,Ä5ƒh;ÌYW)êMŠ:‘_äe›nqÀWt«9-¬lmTN¶pÙ:cd+ÎÈ&dêŒÍVÇË×çc±PÙØ‚™²±‰©¬.åÇÀÄ&ë9#dËzrÖò©XÐ iŽŒ
-¿íï"5¿õùfk´?9ú¤Ëå˜~ª!00ÏÆaZZ<¹’Ó“âEÛÑàŒ¯ÈkœQâÉëŒïõ¤ÄÓ°Y§’/ÕÂ3‚¼d©§ Fj×Iä)ûÛàŒ/õœãïŒ.=^d}JÉñÎ_RÉñT¾JÞ\ÙŽ×˜+/Rü—@•—\h™1¯¢‰9#ÎKeÊP­#2’ÞJœÂ…2ª°\÷6fA˜yÀkm*–ð˜0NB–ûJT6u´ˆC;Ý©`ò<Ðd¦ÅÝNSÂÒÔÞç€FøÓ1üé#j¡Èa!ù˜pFãa;å½^žUe‰#7)²y¡´Ê%7µ?EÆ€Ï»{rÄHþ%ÐozõNaúMþlýfª¾4'”0Ÿmðe­é¢Øx®xò­%ü¿9ÔQ{ŸË1\ð{}&£5}&‹›†e±Ó¤(´–.-Èj"m“ïþÈ ®ÁÃËzÓ¸[Ð+ØÃA¯Sîý6Útýº}9ÏU^O6ÃŒrýÈ'â*hÃ<ê›ÕÚiÆ$:üo;‰Ž÷bT9¦rúåjeÆFvÙ…‹Et’²–#Ùi†É'ª$ƒxíþ0E­soÑ/P=)Æ•WÇôúE¹u°¬l~|oÙb«¹v¸ÅúUCèœ%v·…ty·¶øv°5Â"Ð§†¢ˆ`G~¾‚âAÔA |,óÿi["¹RíTeÑ*Ÿf»ÄÓFÝFÐ“Ú^°N ïNzMe8•HÕ¾ÇG>ÐIöø÷‹¬3~†]°ÈÁíƒÏñè%qÇÒâÜýœuñÏ!¿…Ð\@ÄŽ³qá=3f÷‰}Ö7NY¾Ö'¢0zë‰ÕkOû½A ÓÓÊºŸ2ÇcªIEö.¦Q#«Ú±Œ¢§c„Ž¥Y„ÑGí^2ô1â¥]!ž°üh„Áâ×ž6¼¶UI¤üÆv’[£¬>Ö'ÌeÐç›‚@1„Ù÷¹Vž¶‡OüÿÛ>¦<¬JŠ`í#<ƒ……lÞìD²¹¹óÅªò=‰§ál—&Ü’Ì„FñÉ|ñ»È|š^rN½œ9“ÃÒZp…ê?¶SÓ8cgqCþ+½sÉ°ÀµÛ=°q«ÙQcÀb‰"úéh«µw|Àúå4§`(ÂŠÈñuSgÎ¿ø¬Ù8Ì¹R©`Ä¦¤vFí3OÓÌË¥¶à+¶ÝG=IIàêÃÍ–ß&„IÒ—H¸è‹\¶Å­Y}¯Í3ùÝE}ÿ³i SÏ=°9¬êÔÕ.A<bF3TÙ*È@¬€÷*mïœ*Õåà9‰6:lšÍÖlØ3*t¬Î*®xx•½Øè[`£Ýû/íž^lœ;¶!ÉuÎA|15qE?ÜCòé9yþŸu_Rê(¤ìüï_¸'Y¨°ÍñŸÐyø	ÛÿGˆz`M‹Xkôšžˆ^ÇÎ+³m¾›?×–ð§ŠS¯9B(’€	Ê#™tù¼ÍYtùY:§£ÌÇÌ™]BGsÒÁ‹ßqÿ+Žö×dúXsH¨O>‘SˆÚyå·F~6÷)ÙÚeA©è6rÁ*5ýÁÜ{ã¯áá«Ëß{fEýPåB{÷ÖVõï»Ò½;xäI²|«6G¯xÐ{2¼rpžþ@šËÝÂÍƒË#dÇ‰âô£¡!w€–3@|ˆ\Ÿ}-Ð}=«¡¯GœeÐCƒÞG#à5‰Ð´Óç½’§®pÖöäù·½Ëì*(/<‘Š­)+ýÉÑÇ#©˜m­=~ÞgÆÈ\!h-£[ACÒè*â3ÅÁÝûrÔîŸº%¼V¥ÚøÛ}Öà~ÚuÉã­‘	…rµÝk<ºÙ„XØ÷à%wÑý¨)´¯5Óve9=Sî˜ìc9Õaóõ¤›ØQaçé.?'ÔêÚ’öJÎ]Q &Ÿ¼Ém¸ðxSV­—Ëü…ÆÿÎgŽpXF¢ç¸ÍÞ+—ÃæÂÃ.uìÂX‹à“’ &q‹R´»H{!E?¸Ýbò‘Ý
¶o“Û<‡¬t |Ä³íÓ?›'ph-/Øe«fX‡£4„ƒjË²ö!?œãŽÁak—–r…ü”êBã¥ôJ ÌA±$Æa+!©©ŽaN}kº8êâH•ïür&/gÎ[’6zÍt	Heç!ON ²;à˜’œG-™¨[h°ãi“ê„›™·Bj}½ƒ(&¶[äÀ X^²Ñ6m0#Œp³ƒð7  lXìºWÌ¹‚ô&$3ƒ'„©FeÅ”£žtÎÑpê’s:çe’ä…0—Âdž\9R“yš÷Ðµ¨„"[hÍDU³ÃBÃ¸òñzèJ‡ÖÂŸ$þG×ÕñŒÖ²~[w+ÛŽs›SÂØ(Mæ‚Ý¥Êxhæ©ÜJWErŠ@º ªG\óË=ì?2L*âR¸¶´K\¡ìHf’m™T$Ò¢âZéIy5Ø%ÐwªÒ‹v¢b}0íW7L÷‘z¨ø~UŸ4êŽžêÌÌÜ¼Þæ{×†Pb‹Goç½j‘]ªaZo·çÖke}´3Õ¡Hî[-C]£n³³xÍ0øAì†éuªôžobÃx³¹0E[¦Ø#Ïtwœ½/N¿yôâr…Šà±@Ù?‹ï£Ïq9îQéýHÛ8;o™©›åéUÙùKS¨2 nMé°ÒãË|—µ.eêÍ¥ÇD6äS©Ëv&ÏßgO¹•Ó?õZfU¹>l¨G>¥Vf7Í…åÓµVÁßñ
6fSœ	ŠÏ	gÚþŽ×ÙõCù
w¤›>FLâ.ú«`&uÍ•¬‡å	Á¤<f/>ÿzßµšãV(SÝbWJb«,„ØÕ:ìö6ûóUË†¨ñBšS.JžuJ„kRvÀ8†s²]åÜ+ûlMÅ:ç U›eCh…óf¶8B°¢í|4ª<ÓÎVÅC\¤îX“¬œºÆ²Ü·ˆp/>ã^œeö![2AÃ	Ó€‚è"‡ÌhlÈ>gwÌ²€+½ÝÑ»’MPžD´²B
˜>3LÏ­„0¦œÓ+”M)EÒ®NŽþYJAtÈH-÷ñTÉ(ŽkLSY i]ú`†Ç
ƒÞ0q¨€ß˜(/AZ­©Wˆ6RÑdêônñ5ûÙ¬åf+oÎÜLDEæz±D6?Á<–™P‰dP3M eí>[xú%¤ÛìTOGTP´xFò§•ªÊoAÃXRƒR	\…áòŸ™ ‰v7â„’øvZ+Âb‹ï5£bÒ¤3ÜàñÜ^äDÕ3}§…SL›R@¤yì}.<¼ùìŠéuõStÞ<Ã&Øêûˆu-gôŽ”âÜü¸I,Ð‰;Ó$ßŸ·ƒwAØ"kWÌ¦/Ò	ÞÐZTiÕ‡%¨Þ¤ûH¹(†øôY’¸ž:oZÎ“jð¿Ì¤®sUJ]ÛãOXíÚÆö¬’@åÕÆ¸€Ï^uY¤ê«ÿñV8Ùãÿyç:Ôž\CV.ˆ†Üº19úì&«Ý›}³Éj7îOŽþeóD¢²2ñ!»0·~çÆøÜa;¼%'Ò ^éõñ?ü-«MžñîÉ½¶ ÎxR®^B>.76ÞeµñÇ.]ÿr3‡e/«‚Œ‚«™šìÒaªó¥DMLQ¨<ÞK„¹;¬#ó“Ä›IV–¼ª³á¬‹pq¥¡ËjZ•”R” É ÜpQî‹-‰#G–•!ë¼awaùROÉücf:ðÄ´Cóõv{ž\*ƒX=IÕ59úšÿ[ßG õÏÁzôoìQsL+³²»{$–nã!¤8Ès©ù²
ÇlNŽ~ÏÚþäèS	çpøW6GÍ…UÏ©„s¾;yþû þ~þ›QežÎ6HÔƒ’Ë¸¦>sDFóV…—[Ø¡¸’Ô¡i Åß°Œö’è‘¿qKW•t$+~ãôá¹\Ü.ú*b§¦#á(qõÒIìHÍŒ]EI0køÍ§ŽÙ,ýat–q%g;
*ƒ¸{Ë•Äé¼Ø05
–*RÅˆòèÅ‰¯MàÑcâñíø›áû²¼ðLÝø#ùáÏË•ÂáŽ×Ä©Æk•¨ƒ‡~·YÚ…^ÆSüèuÂó}^G)þö¹®ÚMœôëwÀæŒÐ¬bÙ/‰ÓDäÈIU$J2ÍF—®ŽçÒ,iöÅKy°ÑEr]Š€óa˜SÏÊ€£u¶:„¼ØEgˆpn¸)=`–ÃCõ2sè¹úêdYt¸ŠøíÄu:¼w²-¡/–—õsÊ„ž³Iç™ãR’yJåè˜³¢`6O'WU˜ËS./®-t¸ÛÁ6r "V—™_«ÍfªG´œ½n/‡“¾	âöû>[)D&îÐ(¦H/8Åâ„FH‘œ¥N²˜ÈoÊ_±€Ne˜pî×ô‹Ç‹Ã¥Â¶%›crdý<5-†qZÒ¬SòsËÙ‘ÙjW‰…sißq†D¥ãwÖ 8I @
" –Î6˜äO§E¸kfFÔ¦0GyQƒz#ˆd(2ˆ0h³\.“7ôØn™J‹&'pÐ'1ˆïuV(nÄpYÊtp%âh~Û±Fy}´GžØq‚g$”6qE±üÑœwÎ—x¼N~¨Ó5­±ÙÙTAÇzmðÝ7“£_!ßÙøOË©Öz¥Ó—ÅAáéN­òÓøŠFËa¾¸–¾Ëq–ä ð5XZ½¸±ü¦ª´±`8'k+L}¡4ª`v¤<
CÌOqÞ¸¦æ¾H¶xFü¢mÆX÷æMÑ?.Dj]E¨Oœ/°q|EÔ¦ŽJ‚ÒCÍºtAÎSùbiËotRïÐ¬ˆÉ½$úˆ›Îkô¤|ÐšˆÕÔ¶êt¢*®µ##¹Ó¾,$‚î–»«™“…ªO¬ïa*š´
q]Ê}©Ýá­RCk^’®ÈùåÐkôºÍú`¿˜ŸÖÉ¯W2C–6ç’„ú~|¸ÔS u¶ì¨>ßFï¿×ñõvœÿ'ü+P„¿8ðÄ„×eÃwWt@îy·ÒT¾“~7`B&ÈªõÖ2<‡ÀàòE·Åû|Wèr´ë¢ ŠÎé;{ýT²ÍÊ›È 9‡\1(•ÆÀã…47.°ÃúCHyÏ5Iÿm‘Í7›KÛÛKûüš5íäÆ)ìhiÕãËb{T·	¤š ©À>Äô°¼n \ DXƒ3Ì.%gµã“‰×ŽOgeeõž£¨MÅlr¬Ñ˜iö~BLa£ÂYÂë¥}Fö…Ü:ÇŒÀ]|eîöwßŒT`–ÛK9o¨ð°·8•ˆRR¡¼»¯‡ˆ&I_´Åvfò©»!n6K]n²3L}Ì²5ERJ¹rõÍÂ{z¦¹3¦ÅêrVºd,ª¦Ì¹N§›>®È–žp.¸³¼¢ð¤#>öš¶¸øvÌ6u…r‰Speh6Î¸yçâ€¢pInÌŸ —þäèë:Xøˆæö‹œú8ë6èŒ Ù³¥ÓpQ—Naˆ›£žW?ó/ŽçŽÍ¿xæT„Ÿ€PæÆmŸÊ•·ÐÑáb¼AeY‰¯,ï2ã|½™¿Ã¾XÒ7ïŒ:ú`ß)î<Á–:Ÿ‚tbV=r(Í=šAà’á °|ØsŠÞð'GŸt1¶åŸ²Ž¥€´K HËŽï
r¹²éÁÚÂ7düCðÁº”‹Ì'Y±Î$­Ôb”=EyVœóB—ŒÂY!…ÖÞh·‹$†¼¨¢›’g4ÙKQr½ºh÷¤R"-M*<ò„ÒÒ>âj“.6ÀAFÈ¡EÓ÷ÓgXs›Í|°@JqSšp‘;²ÞmxSå
‹)’0<7!øNxnÂºõÇþfç²:`wjlì·½a^ŽðÙfÇŽyû1b²žÓç¬hÉQs¶$ÕÆüˆ—&·N¹-³É¾à¬µÎ¥œÈ»1ÖÔ˜ÄØÂ= ËûÂOGJ¤’þý­ÚÂÚRëœ¥-¦¼=ËY`&Tp“ª da»øÚöÄ%Ü‡e»Ð’€m©!›è!¢}Ì”¬t^ïõöÚÛiy^`‰¸´²ÅçÛ:F‘Aœïñ—3:â¸œ>)?ôƒ|I"pN‹Àqc¾êO{òîyCóN ÔGi¾é¼F`ã§VB@ÆF8Ä¬ZX¤2x n êívF‚@èÉ7m®“ö2BÊ²®Vo³yfT=ÁÆ/d/ò2›Ïö?EvY<òK<|7&–I™IHß–…¹Õ9—;¥ìäÞ'-Ü{¨ÊCÐ¯‘ˆk¯5SAâ~ã•’tXywú¾¼a•öŸMŽ~Æ—@ÄVW’©DÞbxæ­29Ê-Çµ¶™ƒÛõn`Ÿ9/‰z¸9)Òñ?ò†ÂîŒ¸ÄGÄŸòŸÚîa|!ÿ_þ}¼á€š€­Ûú)ï©Ñ2?Â¿ywážUÄõænÓF]ÿ£‘ Uä…Æòžézÿ
 ü+ïî·ÇÕ¿Yþ‘wol×óû•yÏ<ô»õö†ú`ò[?m×û¢§ø„÷ÆÛã¿sÛ†ŽÍÑ`àuû¼eÚç¼'÷¼ 2S·¹Vi]9H}•÷¼Ø®¿Ã§Ï0è¼kƒAonâõoéíÇ`–äKà—ùR¥1×FÉü}^I|Á»™QXæO”–)·‹ÔLïö½nÜ@ãÏÄvfm»Ã>²©‡7wÞÇ×ô[^‰~}EÂ°³ïÌ\Q¸¥á¢ÔµåÜ¢ÚÁU¡aÅŽ“ÁÆkyDâÙò›M¾{Ž¢€lÛÎÌxoÀ7Ü`)½ò€Ñ †ì•¹–hÃŸ}¾ËM²„wÚÒ[ÍÜM@¢ä&¸Ä›lC¦óð5ßZ.×y–AÉu®"’B&òþ¨=¤"Õ­´¶ÓÄOdü !Ñ’M·:	ð.#]•0;½Ž»>ûbDÑ[ HÀ¨	îoð7CwüçÂyþ|Ã_ðÚ›‚¡¥úî›™¾ì”6€8Ù#þEujyNŽ~L>Ï¿ìVØñ¼šö=Veíñ¼ŸùÃ¢§?–Eð*ŸõÃãcnCµYŸ:‡•ÿŠßìÃ³Pä3.Û-_m =1uŠtlfù9ÔiµÛõa PlMZ`œAã šBÎ>Ášƒ^ŸOµÑ ‘Œàtyªs7eÌD öyÈw9õA º?¹ú&Ï^´Ìt|¢VoÊˆ—,,šÒàŠ‹Ò	rYV€I_éÃñƒ‚Mg[¯_oøÁ~ùâêÜºK,AöªíÐj–oÍ4tä²KµwfO.Ç'(Iç'(Ëhw Ò–8>›èþÀDœÁe³”¿ÍJà®è=d¦_qqç;j^ñ<¿UØ‰ÈÔ»Å/YXdó7n\îtXÕ|gi#þƒ–®ˆÖ§$`=bž:›HvÍÌ~P!ËH«“ÄqrŠ"Â§úåUí,!¬ŽfGdÛ-äÔ–œì&‚ÓLÇS¦§‰¦ßnûÝG”ÄÁ9Ñä¸mX2q±ìî`%&È'1µ|þ`¨0jÐ„ãz‰†¶Ñ"c·Æ_vùÂÎ{_ë¥ÚZuŒ•žH4ŒI{Ö
‚þðòÒR³×VÄ¢Òèuø¼L’áRs©R©,Ð$cC‘KzRk÷í‚ìë°§K”TŒd!1¦JÀ¢)u˜êÐTØ”•)rär™¹Z–ÒI´„a ¹ž`g¿Û;ŒÖ;jrxš«·t…™ôÈþ¡¨'eD¸%¶*HuS	Ç•a¦fœ„3½9à)4’ô^‘¶Ú§»Ï!¬fÍ!‚1¡¦Ô\æHxu)´ÕðÑß!$J$€í×°Vja„.H;4¥Ö_|VOìŠ¸¾p>]#Vê‚vwéÐ{ÞÃ7lm>Ñ.wÔØ#Ê±»Wß?¦Þ qä|E¤tW3I§å É¿-ÇAæTy´`W®Žš|±aâ¤³|n&¸Š	›³‹Os€9i Ž|Fñâ%ÙŠCsûe4ø¸ ¦7[H6ð¤=“+/PwàÈë?¡£=þ3DžB 9â<0Ó‹Ï_|–ÎøÏBrÄ¶r·¼acà÷a5XGô™¤î~êñTúXCW©M8išG¢6µœbgy9˜ºTÌð|'Kš"÷öÎ˜›‰qJ…îìøÐ£% ÅM|QUMñÕê2•$;aï\{Š®y˜FïH,¬˜´¹Sk˜Fö£â‘ã]H¢„›¢“Oñ îrÝ¦Ž)~Ö†¿±QìV1pw½AÇm'›FÃÕ©‹ì´|¯ÝLúÓhñýoæÔ¸	Õ8›ïËüáƒCÍH¼ö'GçYý¯®ä¨Œ3I r&ñÌ9U¨äw:&ÓEÂ6FM?Øè6·=¾\¾T]®^ h
]ÌàÙh¨§.n|?èk¦d©]³íÍTõ¹òuoüöÆ_ì{ì:—±>[¾T†w~-Å+ÙYi£¤‘Õ“b…¢³5êó_x§Ëa(Yñc‘Ó–Å šF‰jèƒñ·Ý½×W^ê@²¢Š‹øB“ñ•£°Øy")BoÐçR¹þ¤Í2zcJ„7B$H“ÐGÚï0MÂnEþz“@õé².-÷…$=èÕ‡Ae8j4¼á°4W‹C3ºšýiÓÅi$·~>}cÎÚ*2)ºÚY"5¢!iaø~@x×ƒ®ê©=Dˆ‘/ú¤>èòéRzPS+ÝÜ‚cï?0ð¯>’‘º°v#íÿÆƒEvy”.³Õe.>‡„Á»‰°ÄKÑâKV÷QÅ¼s|B7çm1^Ê~%z®ôæAØ7RºzWÖ•Îá’à7¢¼¶Ñ9ñÂJ¯)¨ñ1à¦Föøð|Í™]mQ5tçZî·ààƒÚ±}›wéÔæ»=\(?Ñ[Öiåh)û“Ô‹@5þåiÛ8™…é„8Gƒ³]KªÈÂã`ÛQœL`¥::Ãí¶÷-½~ye©Ê„7›¹_héìc²0›'omËÛå=Òðšxì`C-$(›Qax=%œz"øz‘+J Ýýß0IPÎb*•ŠeñÒ–¯~¼áÛÙB¹sÆ)ydƒ~(a&ˆŽ·9ãÓš0™ýéüØ%«ÿp6¡ !™®sÿ RT¦Q{›™¨¹”æËóï/ Ì,[M	êÞ¯™Èþ!–ÈâG!«SFcüã‚ à (ooSÈ/DEï/²Î¼Y¡ò®¤cÃØºÒƒ7ø–ß<è>°/ùfõcgrsEõV¸c¥Í6;3ŽàkÏä7¾óâ“áÈÁ‘ÈØ•ºø€+ëêùEÆÿ]Å/à¿ñßK …²OeNñïG$Âû• ·ƒð¾‰Zç?¸‘úÚi|ˆ{iT½'¦7V^;½±,Zct¨Ž—«5VV^¢Ú¨µ¸Å±w
‡²7;`bWq™­TÙá"+}¸È|ÁEîCn¤eòWúõæ`*KU.YËó¨c:…uL'Ò1ÃuÑ;Œÿù*èŠÃ$EPa»è2I8M¸¬",ÖÂw´j‡Q¤#-3&ô¼-ÊÒ*²…¸û¦ÞÔ¹‡|§0HéW…!óVSÈ˜ä‰ÕòÒŠØ[bÀÏå‡þS¯)À¶½˜’™<™\ƒ²|È÷qŸ¶Ìþ; ¤¬ƒR¥äPèÌ·(]Å¨“š^VIIÜÌ9ãyÿ[…êûOCï¼îÛ§l)Å•È
I{(-XéDàýxR>GÃòEYÃ\¶b®‚ƒJñ"†®KùägÕ¿YgËáTÖÃi@*y£W,…o«P”¢–N?èœòÑØˆ÷é™&i}L¢+$À$ÕL§éD¨]›q¨ô0¯›Ž¿5¤¥+5°×‚FJgÇÂ,8L­1ž©ÞŽ7Yæ¥7Õ¶rÁEÒd’V5hJÔ*0j‘ƒø{ìæ–>Móñ·¯psK —Â^ Ôcò&uÄ?‚mhØ€ÛÖ¸µØ{r¿oòÒ&Oô†-n)>*£ï‹Ä£[½']×‡¢§ï÷sŸõ¦ú8tG<¡YÄwËñÂuš'xL_¥YTCü×,&¾ùÙÌ9m3çÒ+4q€*ùUš<aîâÙM ì³ItÚ&‘ôŒþY´×|Ô|•fÐõŸÝš‘ñ†¯~6uÎ¦Nê¢M¿Óoc€„7x•fÐJM9•ŸÍTR»âlFºU5:ñN÷ìê€ƒüäç•ÿí4­n ƒ	{49ú+Ýâÿ.Ìff‰n8›S§mN]JL)‘îTÏ¨zˆO~J¹¦U’ËT¶ÍL’¯6•Î¦RÎE›J»õÞf½w§öªL¦«ã/{¾Ùcwj³™MQœÍ§S7Ÿ–_¹ù4àURæR”£©69ú	†]°¿bW˜*ÞlI“¶7ñ4LÏèmf37±7Ïæåi›—o-¿z»°(gô+´	º_|vk6³)î‚³)uÌSJŸ/ÃùRÍ[ÇæÖkH}âP'5ÛœR¤6ºFJ×A¿¾çwQ¢1ø†
eÞmð5ï
í±ízÿ}Àí| æe*LV(¤"6I˜ŸŒ;–½}½ÀþšDï2¥àŒ]’5BÀ!Žš¨Åø¾i dùÝF{Ôô†%D)ñÖÎÅ,K«\¢/³¹¹C WÊ2;ÜôFý¤®EŒßƒC¢ò1¦ª/„œÃâÐspBÐÁ5sš¤ÓŽž£³0X®ispñjý÷ó~¥R¿5G±ÁåŒœ³¶þ¿Š°ZþïEíéÃÆ‘ï%'&’}¹gÍšU$<¦O=+CéreU’k‡!ž	òx‡âvÞtšÊ(3Y ÅQèæäþHÉ,ñ¾8‹Bôj;\§ßêFé–ùb—r³œ8ZC»8¨ïŽÚõA¹;êçÖon]fJƒ+ÃÑ® .-/^Zpl­C&ÜÙ‰åŠ9*&eä…£ŠœÄ¶E]ºL?ÂÇ1Àèr™ÄüpÝzÇ±¾\§×íå¼¦JT²TÅ0$)ßÇé®MÉÎ@oyºÉ4¬È/€^b~	Ñ#Ð!æÆ¯K–[Xx[Ëã>Oâ™>1)ŠÉSB´âÖq2Aýõ­[[¶>ý@\ÚWâ¼¦?êX»¢êÖ» kB~€ÿ+Ÿã€*TªóçéV›5“:}IÛ˜¨ÊD>e¦¬20¥"V@õyœðndPoËœïcôg +ÇÒí—vßH¼a¯ýØ»¯k%eYÔ—¼…CVfÑ35)Þ¥PìU=pøÀ)ß|˜kÞëp[Ù	3a¦Ûšý3¦ÐèîEŒ
ô¡¯Ó\øî½ÁPß~W‘Â¼R˜ÇzÚ13½ðÉü¿_}þ•>q"þ•ðÕœÍ‹%œ2Ô\ˆtØÉ1¤%Òi›­ï¾©³Áø?ì¹þd¥'¯ghéÚÜrËD:xYWŽ9h\µÎ›)ûCsCŽ7L·‡,/ÉN"/N»í÷‡þ° ²‡+4mËöÛõý{°åê AÓßYÔÅâ¦Ó"%ù‹Ú£0ˆb‘¢|×³[ÆY?ÂÍNsný‡|Æ>ñ¼GwF@	vè8ã^¦M-|…I«Ó”âY£HÓv¡ß«ôn÷õ¶ñ6¼øüÄ[¬îršÜ¸S;ÍU)ñsÚŽGÞÞw 0·´²pøW3o¨ÔWqK³w¡‰=µÖRªm8¬?ôÞÌ»•èèÀœ¡–”ò‰ïToútEòÐÓq= ý«—#€z	2 Ÿ[ÊE­äVù"·J/&Pb eŠºRoêÑ–ÕÝ3hª*[ùÂöh{rôOÜþNŽ¾fA«¾\‡??.ÓS¾RÑÄZYdâÿð:(Éü½01Õ®ø#N¢»@KÊ¦4Â]¬§ìÂ¢í(Ü¶åuòÊíkM?[ƒÒ®“äF²ûâ399|ãô“®F`ïÒFéåÃí®ÎBz‹È¯CG‰:YÔ‘àEuIù2QßòÚ^H£Œ'`)—CÑÇ4q6ˆc÷Ú >l~y?¾½< —œËúB—’D	¨œÆÄ¬¡ôVë¶c¯½Ã÷ªWVª‡ú,:WÕaLº-’rúAOÕK4oIÊ_…•Xe¬Õ<eä­ß+è˜éƒHsúˆ[3>Q"¹ƒ¾.‡Ü…w;èña‰}$ç]²tþç¨á•JõFc	ë°xþ‰}Ÿ•àsˆ\ÉÂ"ÿÏ&ÜjÕR¨rÚ‚	Ñ-®­¸'P.jgH ‹ÞÈ%õÐò"æ×;½^I.¥¸Ä¢fÕ”‡ÆÃ”I0åBÄ—„³fªýh¨S.š÷¦±w&Av%Žôìä-gïb¸FiˆœÖ¥¼I¦²‚ŸV¶×Êáì3–j“è½¨rÖ4Å›Êù|Êß5•'²ÐËÞK:ÒŽÿÃY\=tÕ.6”¼W(Këœ¯¢ò—Èº¬|‡Y?Cú¼»Þ	ˆà«uð;XxTlÊ¡•ìù.i,c?(Ÿæúóžu¢¯Í¶µ Ý|ãû \r¼/¼CVº!ÂÍ¹wôOp ù¹Ï÷*uV]fÍññp3²åò´í	±¤ÓÑ¦Îb,÷Gd¤6sEOà’“´×VRœƒ'Ü1¬xîÄ¥W£DV–ízÐªtêOK+‹¬ÏÊlÅFk…do¶¼Çƒ^÷¶÷0‘ÀB¤5ˆXù
pfüË¼”Ôíåë7Üy›‡µ¾¥á¯ùœ^úÈl<Ýø‹aÖG‘$ÜÃµÒ$
m!
S=Û6ëGkB×0™«ñGX)îwÅPxM¶Ñhxý ÞmxH5d˜º4k½ÈJlçrR²8’î’²þnùœC‚–0©K>VaF=ÊšZêvak‘@ˆž{+;Ý¶Òw£í€oœµ^éLó½šLÆ¥ÆáXÊÞ„$¬Iñ>ø<¾¸®é¶Øf?~Í¶oÕX·õÝ7|:IJcü§DêØÐOh™B¤”²4tB$œL|¼”ÌDvn9•+‘›#`Ç¤  g>ÓJMO·x¶Åû=8ãú…¿f²±)Ân«$2èfa¢[.bÔŸåe·âdXQª^‘ G¢ÈÂ·C‘P„§
O—ox'GŸÂS#A^d®­@PÊKáj 
lº?4>ÕU$Kµé*¹ý4³LÂöÃ§”{$öxsº½¤)GÜ‰÷d€g„Ï‘Êûé0Ï0f6J|ö:+®ùéÃ ´Ó*Iõ–Î,„çÅg·rF;?é„b™ÌõÑ¢«Z‹ýÓ|$ÉI²ØÇÂ¶J¡±O±ËGï]”àþ-¿}´OÃb~U%cñvjµ™ÄªF¤ÝsI–éYÂ®œ"aç—-I`6å¿¥3”Î¤å+JÑ’ºq&å./›ÔÀÂ5“úÎ™b‘çÖ7ïrËJ]2oÍFžÔŽÓ*Ôì8ˆpŸIeÕŒÞÜ'x‹í³Æ«U ©Œ‹Ì’@k³å‘Ö%0î™ß|ê”>Š/ƒí›Í§ì
+¢²qG®ÜVó=1/vÆÇ*ÍODKÃÉÎJvÄs¬ö/RþBàôlà…ê©°94)Rì¼%tg·ìú“MciõÄ#Hß²G¢hi‘¢ÈŽôÓô—qÄÆkUÝl:c˜Ž5HÕ	[ƒ­úÛ$ƒZÀ5nýx
 5v­’*kí;Ÿ*‹ýÆRÕþØIw]ÿX5BN,îÅD,nF ®1Ü;~6×ÜšïA0@2\wÕ-ú&îñ0ÂV¢ÖäW%mHÜ@õn³ä„¤ùxBv§è¥™¿·+
Á¿˜ÜJ&Ä[1qrÝ1à;W{·h†0ß"ö3ÆƒÑEÐ!ªêxÂ@râx",¬âÛ¢K È¡º‰éOûBë‘¾Ù'!™ûÞ†Ä"Œevâ“©¦V^PfÂ'£Ì%T…éÈ½ŸâXqñ¹ÇŽÓbú%Âo'óS0ÇNL9Ï8Qdð[‰ígõ|zé[ØvÎ
§âÜ&‚ §N4à8¬3þ"ô8(äùzxAûyQGœr1IJ
C‰ãRA‡³+,¿º<x¯€kkÖ;¬mì9Ÿ·¥ûºãO#Þv5o+]1«$¼­x´-^%‚ßj“41'KÅkO¢›aBèë^ú,VÒÂ¦“aÚÓ)<­ÓHU\ U$N!óÐªÔå¥jµAÜq¯}PÌoH.´5Þÿ¹XÜªûüÙ;@@dÃóÛ%RÏ,ñž±.õV7ÛlÐQT¤;’ƒ$ !5p›8dO_$OŒ­µÆ ÉÄ9	'kGÞ×Ê)ˆ–¥Deb–Š™=ÒL_»Â¢EÝR%‹½¥Ó¬á·dðµ&—Cæ«;àss+]Ã5Tƒ«ð0ª õ{"ÜÞe¿¦ÇgM{Ä»|¬lš›3D.]@.Þ;£]þ¬ ŸÇ'æãÖŒ¯—†ÌV¨ðÔ@álr>¼/£þ`„±ymp Iî8ÖÛÝ#!V“ÀËõ»-p|4ÚŸ}ÜeÇ_°=€ïÄXÉV/â¨Së!€ó!äI„™ÇMhÿ±Çž”/ä"Óv¼ú  žñ£\tzíWom¾ Ë¯_^Yª²2Â Ð2ßÇ/ÂI¬û8s§óÚ–·ËE·á5oÚÉû|‡ãµøžÐ\™«Aà¶Þo•J…Š¦ì·a¿Ü*¿•§Å49 ¡}’§cúpÐ¥„G2û$gTí¨Ä5«^rÀÆ!_tðÀše÷wy$Ø!açWµžœÊtQ|ç{uŸ:ã?{‘u%® &íÖ–tL)%Âÿ¡)öØî5‹–Ú¾HX­UçÛn—¤´Í,‡EEaÔÛmäµ¼rÈU?£¦4ªxºß–4Â¾ûÄlÖ‡^i!NPŠç½ñN<ääeLVa%.\œÍË„€2ñ¤Ž@\#@pQá{dïEÉ%ŽVˆºW>Ð»vTi
RÌ[jcòüë>Ù>ÿ:˜wbe7ƒRÁ©Ø‡ÒÝÙ½ün$²7ÐhŒÂ•®2èµEç‚´ÎÒžîußƒç£ô¼4…‘è~¿É{fé=^xi„œDü–E>¤¼ëý½.ßq@Òª~ÿ’ã‘8Æ¢j\±íé«MÞ‰"+e¹øÞô|Zcœ^À²¢g<u“ÛÉ¡±?õ½Á‡hÑÏ­ïÀ†û‡°UpïÅË‚gYd§×œ[çkÛ¬Zm‘æÖoMžÿ_nÅòtF…ï5›õ¹õë[[¬tÝÙÁ3„Ï,\®fVÑ‡Z=ÑîìVƒÝõÅ—³«ïQSBë“õÀK³Wï¶fUhƒ¡ Ú`rô¶`3*ÔÙÜ:(!÷Ã'æ`øÈË^ÀÚ€GàÅÁü,´&¸Á‹Áe&0¦ÆEš/
Ä3'Ì²!ò‘äœÅACã@”äÂ*3®7ç…Aë¦ÔO YÒ÷‡3Åp;êÃ÷šóä”Ùæ2¡‹
6xnÙé,nmË¯·{{ðsñ@¸†wÑ‹!¼\#ï¼.8Â Í4–/·LP5ªHI<õT….Àêëš7§t¶jÞµ@*vH;MÆ_ÒÞÜ¹ÇL¡‰ËrÔÎ»šR,%Œ&ãQá;»žò¥lýÐÞV+R!)ò×|9ÍZú †×Û°™ý´+b©£î 07z–b1CF
ˆO½NeÞ ®Ë:d¦mVîŒfhu‰®àfö*/>wÑ³àI~Ýe»“£Ÿ³ï¾±Àÿ¼¹¡‹¸Ðe÷Z¦ŽArƒºBŸ‹+œD§Bø¸û¬O®!{¿Éàpùú§Ç¸Š´B};÷eÐk~µé
3Î‰¼>Åcbl::OúÉð·ô!¸84AÜ*ÿ/•â3:8lï9¾¶Ä1Mg|NØ_~óÊÁèÍò›Â‹ÄÿòÀMÅåì4­‘Ÿ¬ï–µ3¾¦Êß©´QˆÄEò0ËIá’ã2Yz—Û¼èdÂÐ"C×Û˜T6y‘A~P°¨Ëá›‡Ó’ßÔÌw™çG©Xäx…„>_Äþ)T:9E¨zQÔêõ{Ñð2ôIHRïHÝ—•µ¸Ön×w½6kö;½AæÜLù4‡Cêæ¯mJ‘æ{ª^¼Æ®Sôeô&Kø*®u:Ä†—3Eáâèêž[rÙ‘ÛDOAFq}CpŠ@ÐÏ­ßYÚ û¾	^p³u^Uô¼"™`†:	È*P0‹A²ô$ôlÇ#jL'CU^	Ð}zÁF¶í|(Kóè+žwPððxEáŒš~àXÀíÞ¬6ïÈƒ@±Ãt.B¸ÔJóôÊÉK’’!Gœf!d½Õ›<ÿ2ˆôîm ÈjÈÐO¸ÉM?ÔpÉ±à8q
ÍçÙæ4i^“>cr2t€,FVEš (RyŒÛß å{ÝÇ£••åKÿu¾®4zÒN‘ŠsO%æpº Ö;‡„
´Ï·H¡Qì¼Ù“cG¨pB*j0ñ~‡Iaáœ=kD¢	aˆŠÚ	a(Tûë0L^íì’ÜøRVƒÉÑ§È‰øyA4bzk`âàç%PÎý×€²9þ_Í=,(#ã|oZº€Eªyáôe/oZ¦"Œw÷"Êû~­&‹”¢~‹P´x›jà‘“UãÿÆÿ¿Ë?²68ÿv€ phù='Œ@.îKçª\Ñ³r&¢ßÕ”úpF'r¨©_ÆEk¥ºþnbÒÌMp¹à¸4‰Ý>é°G­ñ¿CXïäè«Î²ßp¡ý÷î^~ªùxAö‡WE ãý~ALs²Bà¾”Ì—–Å¶ÆgM‹lú}rÄÔ¶.ŸviÊ¢•I3Ç˜rÏ;J’¡ýnc£Ýæ‚ÜãgU4à.ð,²¸ÎÁ-¢¾˜Ø$J·ñ®Ýó¼akóI¶œ±z×ïÀÊ0ìû]‹ÐÙÝvWº|çND ¬Œ4uÐÑÆëç4“ MŸÏ·z²Pz'0½	N6‹ìæÖ"Ûìµ*Â—-ªÞˆ«çÿ óÜ*ÎWõ0DµÔhS/B¢´Ãíwþ®Fâß¦<“`!…–€š¸…±á0	…I:!rQÙÀÅ¨s—©kn«PFM&"È¼ÆÂmA:ÊÑÛh‚‹=qYŸ“çÏRA4Tœ×Á¨ë4òäØˆSC¹³&`­•vá¡@.„!>­„xj›l{QbÏÙqhi	®í÷½\	Vn˜N‚WÈê¡¨ß†m„/m÷ÉÑO§Vx[|¹j…›ºœJþá½›µkX67¿Ç6|üTån]»}
Æ\°ÊÞmªBwþv§vmx•Õ-­À™Í‚™\i+a9;Š)iLHÄÅÄÓòÄA°ÐyrŽ5F|£Ð)ó½%_§wëyŒ\Q1Z›CnÆz¥åEÆgúm¿ã¨ïø'›¶‹1üæ$*bOÖ>‹B§Á0¨Ü±žgýrLêU…h³0l:+ìLìš!_¾—žžöžü¬ÙP@ ¦°óùÆš£rRÀ‰®#¹C'(¯ÄYT¬GýéƒO"«H‰µË¦¢ß´°ÀPÔÑLî³Í{×6j×æÖ”ï™çF»séB ô*þéí
ñð‡~Ð*É[>D¨)4üåaõÒw^¨êûw·”“§îú±</×¹X¡>Ü¼qmóÖÝwoÞ©…5˜â÷‰uÌ«šb¾Ãã–‡ §Ùƒ¾v·=ò!Q¡×3Gümsfîé
ÇÔ”å~ÿpãöm,ß–0IÔã^ÍÍí»ïÞ«}xõþÖõkµ¬
öº÷û3¬Ã(£fWÑTõl]»v÷CYÙ½k;µwï‰±Ép¨ã³v³û°—ñ³íŠBDSŒ«Tv´bŠL'Îº;‰|Ï¥¢Ñá¤ë[I¥„M9½˜s¨ætL½Ö™;ÁÍÓÙåDXgà¢­5‘C]qò’4¾©Š‚NÌêMW¿aÕYÑÐ`iK‚©lËÒ“HdæPQ¼þDeDœÏ´2i‚+g!š¯µÆ¿í°Îäè—>¹÷sVŸù¶Q¼ eÕýÐ´-—l«½;þ‡;ìêäè_¨#EXNæïÜ˜<ÿÝ]víG›×n.×,kwoÜÿ#´øù¯ï.:cÕ˜¿ucü¿n²»|c÷6¡Ÿãç( BÝµ~úP³“–""=/Êf&k5"èbH•ÆÉˆB¯E¼ê†7
[§	£¹êD‰0ŠþÅçãgd VÎ|Ðà8Ÿó&ôÓñŸêS”¤ÌèïÅŸtÅÁ19¯ù+i‡‚¤wzþ€˜^_SÃ&^k¾qâÎQD‘ÓÝ‰j ?#LMÖ+¥XF“ø(uÃÃ_ô&³ÑÒhfîðC„)áE±‹¿ãñå¿Ó»ô¶`¿Í†õ‡Þ;HgZÒn‘w”ù|»q¹Ó¹<²fsi{{iŸ_ópp5_©PjhÃAêeGûü&	ŸIØ×K‘Ã4Õ¯K«1¶uMUÍ9Î›¥f=¨‡à¿Û%±¼gXÝERñmÄpÞîímAC 5ÂÓ21÷¯(&Ç!-ª—$÷)KÆ°`ÿ8AIGáñ¥ôtoü€ë1zeá¿EÃ/v~É¯•ãñ†ÓðˆUXøäÒ'î8õ"ÉçøyÕ“Õiƒs2òÆEBúë
¡%©‹ÖÐ„{×k* > dˆ./áæðžûi" úïö½n	‚Œ‰¥‘à¾´õå–
Gy<9ú˜ñÅü×û4ë‰ˆµ´‚Ng±;·‘,æ4‚èÕŽC¯¶+-0_°.èŠ’”é‚8ÙqÌV«ÌÚäì]µÎ²4åçmÙ[¥þÀ{Œ|Ÿðÿï³Uy°M° ÄàP²—ŒcVŽÆì5Æì²6ÙåòRäÛÎìé&[¤ŒFNh¹»à"V]N.ß¡=—âÞkÖ‡­d$š=C€Ù-¸R…Ã‡ªj¶Á)JG&îì–ÏYQÜú6+Û4ä®ZÈìÚº2½F nª?ÿj_Ã~ö[ãoéú¬o1m‹“·¾LöZ¢£ÏÏ‚ØÒ-úN¸kñˆx=%ôZ_SÒë;õkCÜý„¯÷zà¾¸EØXešp¦ÂU|µ¨’ïx@~ûOûQõ
7Ä¨ïÉf‡Íƒr\¦k˜È©Xr¡ûDópæcÜzÖ'ð,Ï­ß†±ÿù²m&´Ø¾6Wbå¦?l0üËçvlÓ‹|ù¶(½µ¶¿~ó47&ÏÓ€àJÔçcþü¨|¾ðÙ#€™?ë†«R.‡÷` °oyÓÖÀìñç•X[qC§Éó?³È	UJšÀÔãÿ"\^||÷Íwümrô¯•¨…íú7D:òÖï©LlØFã/áµ~×mÅlÐÐOx`~<†îÙó¹¹É{êÛ}H>ÍÛÜ€ïqBríìXñÚÒ('RÇ†³³Óåáá‰†Zd ÷»wFíöÎþo“-,ˆŽøo¸ôh…½ßë;2ñ•¾!Ë3ï, 7¥a¨Í¯Ý’-HÞ*“Áa¡®‰R©xr ý:r-¨þ"RPÙ‹Ï«¼X"*[^­äÊ›¼(ñÓ”Î¹Zl¶êƒà\FÞä˜bÑÒ¦.@% r³vÛÆdc}—|ü Á~®ç‹}kà=¼rpýÝw¯ßþÿ   ÿÿì}}oGzçW)†9LÄwQ–Š‚DÉ–¢;"íu VÏL“ÓÐÌôlÏŒ(†!p›Å!¸3YcÜ-‚\ìu{›Åb/ë‹HÈíôå{0Ÿäêyªª»ª»^žžêÅël‘œžîêê§žz^¿›ŸîÞºysïÓÜõË½€»¸2÷)·ûýþJw¯ÌõÓ”ûß úÅ]óý8Ë¸GF]Y’&6XecÙýôV¨R‘¹…K¿Z,ÛÒJÞÕ?8G`òÅì¯¥/ÉØ½³çÿ`XMF;“WB¢©Õi=nŽªwšÇdør(cèúÕ¨Ëß”òªçHOâ~•^Š×ÑÑÆ8æö@+òŽZ¼ýdõˆ+œ.NÀÉ±;Ø@%öT¶F|C”•
Êæ×å—jy6êKÁ¦Ò\U¯½Yüº†FÇ%_iÐK"ÇÉËCë`íj—¨ð	Z¥‹ÛÏÒž,@fÙt1ÞÑÞyÚWi®‰*`‹Uœ”5ƒ@™Œ—µµƒàÕ²£RÑ^°è;¿‡@'ëí-B$#d²f7WÑÏ~7b{lf8à:”[:ŠÃäõæCòuþBfHßçJ ç6ºŸqáqg.“6 Hfy¿èD‹o1#)k¡B¥;\ø¬ÉŽ3á=ÔÞtŽ·k±ãwíŽw¹ÑÒ“h/.ª¦kÉQxÇÊcU»Ìz#,3,	·¶wvù„‚øBá÷Ó¸]ƒìÎ6`0#šÛ;ÿñ%ÈÒ³ß—ZÂC…Ç„ÛŒýAB´5y«¹­¯Ïæ6õw-ø`G_ø™…XD!Ð«‡Ï¹?Î¿zýìÙoðqŸýbŒß„ß/N¸ƒmõ|!=kÁç×?Jü~k€élqgÌW$Äžàý¾?ŽäÚdNÎÉÏ7™>}˜«êdÅÿviÃáqê¿Ùó_äGP€ÿ-NÈ#¿jaS#Aã‚8ý5Ä5ð•`b¹ª…0ÃÍ®Ï Kúëˆ<>ïãž¿@-wÔ¢I¹Z‚¢”(Ÿß_õ“©#›²èù/Yæ(§)áo\…ª5ÉŠ­dùÍ û%Ôšl
´»j5J9%]".r&±ð—Dsapè&êýÅ/ºpáPý1,„R .~WæV)'FO¯Ì­SÎ”íh<_GÀ]ØnDG
ò¦Âë2¯ÔÈñ.ñn¼#;9T%'¦%·tNøîAÅò22©9†£²<©` p„	
Ë!2ÕøÍwžxÅÞ¢|…º‹ë–jD	Ï¸?á¿Ñu Tä8*¸lÀ	–¤\#3+w¢œR­ß”Ãu×5æecÄ>º±Éî;6#Zþð5R]Æ–ÿæ‚£ª¹nöÛ3Ñ[â:¯€ÖBÎ÷ïtÖ·Qg­lXâéÊêZtƒQ a½^îLäDObéS>rÄöPhq’<F«­
I¸‹H÷¡sqqÔ÷Wë‹YŠõË.ãVÔùë]ZYýdŠÈ0Ìˆ%,ŒaÌ’ë¾˜^‡ðJÄ‚gå,•@ÍªT¤² sEZÒ—aYNÐû±µÛIâ®¨1E\6‚AÇ½*D,a·°S«Ï»†þ^t˜Ë\Suæ2&«QÇîh×á@ì½=WH¢ÀÛæœáÊÍðÖqœ`»aÒ$Ã‘ÀøÛéa#Ìªä)´5LÚAïôååh³©?Bœ«ôŠ1×g
HóÎª`0îò-9lk|óãk÷ßƒåÿ
lÆÁF0þ˜mþÑª*:Eá7cæóÏ_…iÇÁ”çœ4Ë§?dwnþäÚÔ³ìÞÀëZyS¶‰w.:s5+O•l®`€ÖcpÐ§ÿ›5Þçï=ãç/l-w.žK<«’#X¯ªFfœ$×†÷…°õN’µÊÈ—êS¹o…æÔƒ¬zz_æeÐÎèy	Ýšf´¦¶	¬p¾wQgû3èPƒ7>À‚&E#ÄÀìÖ;ðÞ©TAc.ÍÒ»ÅdâÞG4Pïs,+4úy
˜ž0*Š·¸éÕJù4/¼ 9;_1/Þ«È¤_öf¬ÏE×Âö¶´Îžÿœ™b~>±'÷÷Õ‚ÄÅ£ê—ÛêBà™ËêÙ† —ƒm{T\I’ffÕKgE­ÉÐþøfpåÒÊTH½þVø@ôÒàYu|ñ7ËÏ-êz},v¨ÏM…7Áš‰‡ §À¢ÁÔ`ß1ÚÉ¤Û6Pt÷ ð]QX“T¦ýž˜Æ‹S oUúÐŸ7.HU?Jú”Kûøôv7boeQ–ý	»;î%q/È
}QKgbäS†Lk&žu-ËÒÃPÎc+Ô¦ hÅôÞÝ¼Z¨µ‹?î§Y/lš¡?$%æüžD…íI¾ë?ý¥¥E_yõ%ÇJÖ^ð—Ÿ&¬o•bu¹îKWaïµJÉ2Ð”ËÞlÞ)làA´€h%Ð9æ‰D0iu’ïT˜ã<›iÚóÚ§œ®5 ·‚²á(×‹íVgƒbæ*1ÞpÚ¹.ê•UHœW#ð¡ó5jp¤å¬YÛ;ˆ ü°¯Ø\z§_1Xc¬qï–ÚŸï]ûó #3·Ô7Â“JqÄÊ$6¥âDÊ¤i¥q·4†éé—F¯¨áÍAõ×¨LÃg–þ2L‡(ƒ9Á’¹­!Öûmß»µµ,„P4à>ç]ûóâ3­þn+îñ¯­¬.­BDï‹”Ý’-{Ü\úMO›oç9[Ëü¹¥T Oêˆ¢‡	Ø’Sð›P;	y(ôùq/9ÑôÝQ4.u¢áƒqŸ¶RÖyü‚)ÎŠV|«KR^
º´!ÄhÈu–ü)î%åÐB¨/¶$qS]¹lÐÞíª^0'Ë=‘yœÿÿô—#S°×U˜ÏáâXÇZ«û¨h"|óAçô·ê ¹.lV35vöLÐ”…¯¡ °êP³âHŒ8L*Ö§^câñÜ×ÊOM,1™v@ò*“OQnf°F+N=¼ÆÄ£¹¢ÌGÒ„¶Ž©§/2ñXÀ˜ãc;@#jµâÁ(ê·âi‡¥]iòy:ýwÖ†Ý÷¯ùÐö“~Ô½6³ñ•/7ÅBsîS ôèøK;…Ø¿â¨Ä§¤q­‰GxýôË¶¿T Ž…nndñþ~ÒJâ~ëèA<H³IC3‰^Š(<2JÍ¸µŒ™Ee*¾=UÍïq+GX`ôXu6ûcfSÕ?KVý 5‰å|\ÕÕ¿kËªúaY¦«gUý¸úVEÅ¿lÚ0-X6h:‰=;ÏÎg¤.äb\Ci ùÂ5£<\½æ_yäpx”“«°ƒU°JÊZ|§L4¡SIL×œVªÁ{(Fñ½Î^z/:jìGÝ!¥€”™‘%q.˜ò:„VòŸUÈÆìˆqû;èµQjÏŠSébsžPî—„DYƒÔk— )E8raˆ I„ÕÂ3LöYã‹¸ìï'Y¯1·&l‡5ù^µÉnéLA½E@ËhÔª¢Ç²+:æt|	tD¹ƒŽØFÜ]4"ç)EÍh/1‰¡ÞcKüÓg½1J^¬
ãÕ¹…:|t%#ûò¨²ÈH‹ˆF½þ"–Z9X¢¦†ËŒ²O„Ï™*_\[Àyg*®ZåsÀ( <™„`<ÂŽ2 ?˜‘"ŠoE64øW#Có¢†ZAôåýlå—½M B­SÞ®ô‚Ú5'š¼v úSœT)™uUK—ãÕžv_¹¨ãWÈ—jÅÄŒA'•…¡ó«NIÔ30õÙ±þ2¡7¿ù<B°®³ç?ê—˜…]ñD€x5ªX¬Ú\%­¯2½â¹ ¹ìàË…}0hös)/Cë^apW¿2SHn±®zóALu¢o¹Ø¿hoõÏá+Ì`cAæaIj0—µô„[¸ˆyAí>÷dzˆ‘Jý	Ü‰ÿþ˜‹Ä†älKð7¶]Ö‹î=-çE™œ.’d­L^ùU¬qºBÃ[,±2ùü0—Ö•6˜¼ƒû Á«ãýúÜäãJ9¾ÏÀvú7þóíKWÎt  6z§ÿbê,yxÖUßÄ%aôº^5ÝìÖåàÕ%„^]ˆ‚$­^9ÑŠA|éÄk+ï_\Z‹Îäê"„ ®­³¾pæûô×¾»¸Ûê}6ÜRÞMÓ‘IyŠµ™˜žt¯mY“Q‹ö cYÁÊ¥—i´}Zú£sóG É22ƒå"Vï·2HËÎàñ†'(®0SAt¨{-9«MðnºÜ=·pÚê'ÌX(lo°Í}:	EÒ4œ{Ÿÿ5©MŸÝÄ6¬Ïê)ê‡i­ìéërÙÖ·«å7iFuõä	-jÕèw&µ¾ëè™)ÜCïç¨í/ÃÀö<¾Qìdiˆºb”­Hh‰}4Nø²üma­÷øå[eë@búå·
#W¤÷ÅÛ¡’Døâ†•D¸(}A&á@²’I„ñV­{üÈ^GBoÖîµÆÙ0Íe¿¸¬ï{óøµCÜ=–)…¼xÇr	¶Å¯‰ŠxjÚJ!P®üÃZ§*T¼Q·?‘ÄxŽFÜí:w¼š]—BŸ O ©Àžÿ²â×Éæô3ÖšÊ"¼¯A<ˆ]nŠÌ-¥kŸ\ýƒ,Í¶–{r³TüRh‘@`sé¼¦ÞO¥Frp®èÈçàÓ„‚p®UðÖ[–æÑ{lZ;fkb {gn{ËÒÒ¼Î/»®ƒOó½D<Øèýè×",U<ÌÁS³géúð¾U‰¦äåEOÕäTW©=,Ð¹ÂeOl5ú¦¢ûØ¡Å1ÅŒGãv0CçÕ—JÎo2ÔIÚa£å­åÏûQ7juæ{…FÓàx5>¾þáÝ;ÖÏËt™–S$%e~Î‚;µµ4äº"n¬\`«ž³zÑ Ÿ¿„zdëq|$¸Ì’¶/Ç0Ã­ÕªS®òûã<‰¡¼ò-}«þ/÷uê´÷NµÛºÍê·„OÞ0%_4‰:À;33'w6ÔóM]¦ËÅa*Q"wr…o°Â'üu¤Ù)&®E7ª¯ôÁúÁØv¾eÊnh6šg\Äw(±ˆâ SõN@.úÖX¹ø=UÁH ™SiýÈ”O‚weí]Æc“98ç	þË°,ËðrÍr6E¸)£¨jGö£Á°“Ž®*N4 2¾¿|mþ¤°¡©³,}:®Þ—V^ñ‹GqµRTÍ¸|bô®N³UÖFæ‹ö&7;Zk“MMoL» xð/#È'ò¹ºÆ®š‰k²f#\¨Cô@Qá4ûâ|\˜Üzv¾µÂ1Žùœ.up©(×ôb¶MH¨„Z©Y„
ÒÃ“
/0Py4Üˆ à£µµ7¤.]p¨!Üc¾¬‰|#ïfiœ´†uyMK²¤'¼„–õŒÛÏU*3×ó(~B(RQjÞÀC/'p•Må¶=Ì”/7Ãƒ4B>°üy‚AÖãKï˜'~W,5«ÌŽžV4âž":ÛÆ0Ó«X7µ§Áöµ¢ÕM«™Ò…ÍÚåkÑb -
dþR5o(â¼Xe}Ù?2sFß|~ú•(ð€k¨’‡ØßzAÏ–]Èk	.°'KO–Ä¡|$b­Îé3Ä¢.ÌL½:¹¢‰èI\$ „²%WŒ%×U®«Ô©ë`òˆ¥"F½lö—$L'
DÖ6¹îe`ÞbAqÐòÎ
ûþ¹þ¢ž…E,*Ã_VrÈîEÙãJ˜†Àˆ‹yøûöf(¾HàÙÓ¨ï-Éy-ŠeL9ißžKŒaÈèYSÿ
»Àò;ÇÚÃ@*ü­×£Èå7´ù,I+¶#z0j[Câ2ò*ƒÈuîÄ6Ñ·y š{ÉÛï+4Å  F<tÛ7_¥vgk¯xêKªå©²âSp=uÐñaæý1§_Û{dŒñçÇ²žr/oýêRŸÏÂIŽúªhŸ‰àMqÄý6›DçQ6ìqSS5p~KH¤fã2Z·•mSÆ-O¶?Ö_GHÉ8b;3Ò-“2bK´JéÄïT
ÎþëªNL&W%ðÛ¤1…úü•ÜOjøñ%iëãîc]…'Ö!p¥âÉBå¸î³¿Ó&*ãúBµ
ESäJBŽa€·ÛC™º;Ñ ¨@§ ¿)Ê_¯ÖÑZßN-ã”øóT5¥›‚¾1eíå-Ü}žRëˆñëP”Žóä?<³söìg÷o±ë§?x“•*C^¶5ƒ1;Cáì=ûÇ=sIÅˆ‚Ú
‚^]{è[mØTåýüuÏªÂaú»|)ºçƒ8ë%Ã!—Cv/êGqø^Ôdj±[5 	çÅ¥æÜ´G‚GpwÜ„[`Ý”ö½ù¢ Åš é­²îÁfñëEAk~«üiÒgû\:áßa7Á÷³´·ØLGÐ²±ÆÚc‘¡V‡ÂÞ÷Glõãî&{rqëœáÐ½:¢,ƒ?E¨÷áÏf%y*Q‘ûšsÞ›ƒ,j'ü-.ŽÒÅŒá[Œÿq0Î]ÁŽxÊkŒbF2¤é%À£PŒY{#TÁ÷‘tÏ›r,ŒáúQ”@ËòoYãøý&E–ÇGÃÆƒ÷ïÞüôþµ{7w”qè®*"pÉó¥UI«Ù­WOÔE¢®e0dãv!º±üæø—St KŒ”°¯Í‚3mG¹±1xê•%5ñü2Y›suå‡_¤wâ£~@†×O‚èA\óEU%4»Â”Õk¾P¢¨Ñä|@;â‚h¤…m´÷˜ø¦¦‘ïrU²4L{q#À³Áœ¡ßÄç“Å£qÖQw5)ØQXN/ïªX”µâ²!4'wµ¹9±õ¼¡›k%Ø­~¸–q.ØÇRðì­š7Zwö	`cÀÜ…à4¹
žËØU6è ¸äê €Þ‚‚ýr³ÍüfÓt„„ ðRë–ñsû‚û#‚V‰»gdÏAl¬ âænÃ¾~‹?ÞÜýýñ—S×.aÂÜ–ˆ”h¥í¹âZºÉ¨1ÏóW>¡T’S8™¬åÌ½´Ÿê¥¼z”7 7×¡b×Ó“•ëY‘“Ú8ÀÞQe¬¡:u—444»&åå&û²“»œïz0~¨ˆÖ«°ˆ€¢;Ø†L8µÓ€€±Xz+$mŒúX ç›liJÃ†™ÒLP¾¬´|}º~kxuu%w%š|¤ÜFvÒl4WÑ˜ëDCâÂ×F
uÞ«u)-×TÕ½ÐÓ$xÌõÎ:/°`)z‚²ì(ìiÍ ¶žÇ‚9ñ”qNG¬Œ`¨Ç¥ë¦™p-˜Vôâ@¿¤Yò|Â›Gl?Ž¸=§õît·ÎBIx^ntä¤[§‰ô4n]ªK·\þp¬×ÞÄŸ³ô~ösqíìõC|nÿÑ,7Ÿ½ÿÈo~—o||Cë¤Öø¢¸gáCË­?è@št¸,½Ee€9™¢^Fìqá÷<´{*Ÿv`’/JóF¬ÑS Šø·÷NÝê(„Ãí„¿ý²%WJÑQGÈõc’‘=Ò ò²š(Ð‡Y4¨Ë
J"«É–ãøúO+ùW¡>SÀÆU ¸Y°Ç&f¤&¶ìMŠü	8Æ‚¾@0â3 àú²¦íê#è-wo¶ùëhknsãÆÍw¯}xwïÓn>¸w{w÷öû÷£€»‡Ÿ@qGiÎø¸æ¹o~|ú Ö}95ÓêÉÇYbgÏþ±ÏæÝ¯uöìçcQë:/ƒ/2¹†‚æ¹àpü;x •×Þpd-9lwÎín!•«¸yò/¥îRÏXšÕÆ«6×Ë$o÷:ÿÿ!üS8÷ôy÷ª´0Ú/i¹×Ÿ^vÊ=	¾Ûh‚êOeâ<î‡¿[Ëîžsrâ®YPõp/dÃÙ®µºAm×
åÜéú°?D·–Ãp¤w‰îÆŠÑ ¼â&^QF=6Œå °#¢ŸŽàIÓÃ¸²VCq¯èµS Ï²£L‰™øÓ´Õyn}ipˆÒhPþV4pØ]	u¥Ùž{ª9DNÇ¯™f¼¡Ý‚*o0¸(­!î1ÎýÑ\È÷£Ì’¿©7¤_:Ó§
.Aóî%&ÑÚ.¯XÑÚÈÈlÌ1—ÞžN;óü Œ'ôQ°
BÈ™“©PÜCªÙ;$zèœl3‘s¿ŠTGŒDl•1áŸÏ8÷ï’"% „À&äÛjnÏ•åznk¹¹Í Ýëàôëæ¡¾J¤1uÊM1àòë¼Añl¼bî#{qÁÍ\öÃ|¶è§ï=xÿÃvE:
sDªàvû)ÁH©#üw;‡ìŠøy	¥/šÀEÈ=Iq)¾¡Â´V~Ý¥˜¯˜£Æc¸V\¶°—’~«;nÇÃÆãÒ= ‰e»	&·÷€÷F1Pÿ-	ã&Õ^zpÐßCü¦+DðŠP\”åeÆŸÝ˜k–H¶åÉ|›A?qÂ¿
?'ðbVõ™û,îcÚsÌü)ò}»²ÝxÔ€Ÿáïÿ!˜OÂÞYÀú?s)K*×=¦AÕb=©†úªŒ¸zTO6…*iyÝ’+[6ÍèVÚM³áö˜ŽöŠpÿÙŸèlBá•Û“?´£a'nW]ÅpÄ;Êê~F#àµ\O€›-AJ¤â…Ëw.V;¯{ŽâåJHqn[ÈÊ’$CÖ«s‘4OTŠ:Zö^uòòâ(¹ š¾$ÿ¸°TÍ…ß¦ÿ5Oa®=wR€ö’µû‘×ÏžÿŠBe ˜ØÙ)ÿ•õ;§_^ƒ e%¢ÎôaKjç…*âzíÍ2Ý¬/Ö®MKÙ¬hÀ5ˆ¶TÑL±ï{öx¸6Áb1¯-¤¯ßLŸ
ãœ¼‘«6ô|5x¶jnÏÙW®°ü1©4\ôí™4¬bU#¡Ä>åHHç…v[uw]u„à>Í·iõ„'ôï•ô)Y´ç‡£vÖ[ú~(êUE´mÛK*l5‘{T9FR>\ÅÊ­ñ%K}ÒšB4]5ê‘j×"‡­*É(FÊMÚ65’Q78,8y+Z
•Öv­šrU­«P2tÅQˆ¡²BÏZª(ugyH–þª©õÅq\<H°ð¢~µEqÔaXžàt{\=9œ T®GíÂ&¾`J…»\®\!÷öÊTÈ	½Þ…ú·Á¯}ð.´Qˆî«÷µk$¯U¶Zƒ›.­Ú£¨[_·®××­ºªë25¦Çäê:mLu$©ÆÉ$ãÂ]æSóž”àµo@¾ÂÖ/‘—ÓÖÓhgž^œòQíÍ‘×˜wG¼i5Oî¦p¼_/ðÙ¾«ÑE½õMlïuâ”µOÿ5©Æª¡¢ äŸ˜qísk| ×£¨÷èwå

‚yme°ŸßVGÒwÄn
[õ"ÓQô»z¼‹9bdµqÚƒ¤šòk¢WÖT ÁwÜ¼¶wºÛñ~4îŽYisï²q©¯‹4>3(ï‰Ëžùö@‡¿·nˆ*¼EÆÚ¶lhx¡&WBæub;â}/eÔ9ý'„ü»_ŒÎ`9bà`ë«ˆ[¢ Ï ï´’ùê<Z:°SyûÆ¦ÄåN[·ùrûKñ[€Ö8¥B [“ýµÞƒÛ ÀÕól.ÐŠbú•raå©Ú§˜ª¥«þt÷ýûKÜôæÖw^
ÚüZÁS\˜ÕâÐtµÄ~‡å°n9(¿œ}é¼¸X+·Ð	ˆè™§_{È—ÂOó2L¥°ed»œ`kŒ¶Ž²ŠZ\º©ó†fÒØf‘eñ·§¸¥NÉGØTž›bêËV[¬Ô-}<îgÜê€®óû)÷æwj`Û.NèRK9ªô•åwô
rñ»¹¬ñÄµRöË‘ÒˆPvJÄŠbzKCw s›–ƒ²ç³ªsµ&êíÕnçÀ<—ãíµÕOù¢A[×ãn÷€ZjËÍGVËà\¥¶´WÉÃÏwxðÙ]©›Â©Ô÷$û3à¤êÖx¿€nu)–Êæ7‡—lžòE¹Ê¹Â,ÊN	7™Uyê†l‹ðDØ3Nåè6JÜ©Cõ¯èr	%Z…0ƒØáƒÄ±uE˜FXVÖçÔ°I¯´ƒuC=QÚ¯!óâam?úd9Àcëìù/"±?9€ž&‹SÓÛÿ|Ý•QÍK~-ŸÙGòIZ¨4Ì‘Q6¶s˜=ƒ¹VÉËð/.¼ÙÜòê,¾RÑ¢‚¸Ê,%
ð"bê§ØÞ0Œ»ûÂÂ•1þ\f©Ü:í7JÕfëyá¶¨â€_qOËk²WZ^_¹l‹›XÓ¦F£ÐA¯¡V¬jÖ	W#·Îö+wÛ•-|CÜÖ ²ÃîZö6Â¼ðê]›Õ÷"î_l[HÃ½W¹[¼ÖjôxÍmóc…ømè.€_ªþ!GÉ¥.BÍO+Af¢-I*æ4W­ŽøC[˜ê½|\¨Ã&(Ñ`@Êˆ2PÕçÛç>&Wo»ãf/©Ìèµv[ð§œÐ£‹uK,Ÿuåã<GxlÍèµôÀçc;½Ûæ©òðx¢ð7r\¼ªóž¢—Wú9Š „Óç?íŸi¨m»•“<!Cqò^–˜
¤’3üðÖx¸‰‰ZiîóÝgqÕM’÷Âá²_‡q‡OYœ]Q%3j8óÕY˜YW‰ÅÑž™‘+VKß‹+ã¤´S:nâÉCáýEjn»¡0\Úçš´0ÅÿUÑÂÕ%yþNÚŽ¡Ï­î×ÁãLû'$irEE"üÝš`ùZ
Y®	KóÀáâÃ‹¢S€k!þË%ùB>|gãÉá'AÒïòæÉ=ŒÖã#¾×Ñž¤0&Ø_,®æ¯Y“Ü4‹¹p Ö\ðuìÆQý´Z‹Ns˜vÇÜ¤J:ˆÓ¥™·R(|=~÷ƒRþòq¿'ÔJnÝîÆ£ àzab”,--…³÷úäv/ƒþ’T®RòÅ”„C‚iŽ”Ùˆ•9ÿ~‰F¼4Š2¾ý-áQÆ´'>º‘öókÆKCþøeÑºàeBí¡>A¬¬ðhj¥LCV5p¨mÄÐFVËù…¥Qz7=Œ³¾‰6ŠRÀ†ñ¶¬'{8¦åm!Å5 •ª:Åk]pcÈ8V,fù/¹bÞîgIÚ^êDÃ(PB’»Fµ›|·ù&RoL¼)I†_&«C\I,,z(ÞÆ»i/%ðÕßæôË•WG­’bß$ÅZÇ6Q""åÃ3S—&@ÅnÀÐâuDÜ6ï2Óºº ``t›åÂ©12hº$ëÓ¯	19ë£Q1†ÔA®Ì«3mÂÜÒç-7‰K†~ílµ~pY–VýêÍObzSÁr¡ƒÂç‡ÛsüK˜b v$uZ ŽBæ
°z˜´\&™'¨}} 8³tO¿‚×5…Øõ0Îø–Çwïøê KÃ}ƒ}¯A×F+÷°q/Áá&'û³“DÏ¡¾CÆõ‡ü)‡¥eNm@JlS’Ïˆ_vý’ÜÊ—?µ‡ù@%fÐà§º!„ùƒ âWðéŽàk#åÂuÜë\Mˆ4üçCÏÜj¡üM˜SüçN^ù¸GÑÍ¬Z‰øCQ£bÙUöèM¤ Ñ#â3Ä­–&®ü7‡†¸‚õšç.ˆu®‚óó' ¡r—«Õs·ÞþÀ¬€óôî¿óÖ·šÔ[ÇeyÞž:Üd7}/ÿþw>ºXùDUCcDrÐ‹—d÷Îá¯üR¦:™ür$gTÏÙ‡OìyŠ­sýµ\O–7~®+a µœ&yTï¥ì*åMþ".¶A±š“ªžk³MÊÓx¾QŠ‘¥½ (%¨/oƒ¶Øñ(2âIp«ãX“žZnýN}a—¹¡«ðÛ…O@D9.|&-±x^N+Ñ¥ÿÎa}‘ë,ÌûyãDt %¡„h}ãIØ2>M\2cþ©_ôt šå—GÞÖÓi6 `'Ÿñ#fÒt‘y'ÎÐ­ôª0{bUjd~»bù¸¯æ±VÌ ¨\R §¬Øê/¸wfìêò3PáE}"tŒ 
ãŠÀÙìž=û9·ÌÏžÿ
à^Â†ÿñ%Å³w^¬ä08Tíï½ÂKÕùœwÎž-ªöµ¾±‡52.ÕX¯Ú¡‰Å#÷øh;¶:‡ëÚÇ/ÌÓWÕs³òø›ó×;ýBlª
?÷›ÏU)’WÏÁý=V“û>V¢%,Œ-aeÃKè™ÜúÓþRÑ =‚_í½OŠ¶çûÚ.¾íÛð.4 ËdâÆG÷¿ùñÂËØƒîÚ»Ù«iåü÷å5­ç¨4·yïZxçÞÇ¬ûcH«}/uvÒ^/6„‚»ÖƒZhß¬oç¢´N\
'U|ÐÈbør>=RÎ×Üš]ˆ-Eß|î÷¡&Ü¦áæÓdˆbØ[ì–hJf×£~Ÿë}Ãq,¿)¾ønš‰UEš+¦ÒÒÖÖ*«Ü*Ýº|ÙŽëYî‚ „²êÞ%4H;<ä‰ÝDpÕ-'<€¿Õ*tªÓ=ã¾JÞG£¦3ÐHCØG¶”˜T«‘ÃÀ¦„v¿™‘*ÍŽ\ˆ|~²¨¼ßÉ‘Û{ B›ñ­¸¯#K×·XPåZ›áá’`îìéBìÖÄÅ€ÇÈŸÉ$†ÌgUJñS”§R
ºÑ-+t‰Ñhm¦BÛïŒ³,î·Žn³I]M˜«Ùa…Ú/­Ôê*UÓìi±.A!†êeõdUQÎ¬zÃÿó¿üL£êÜ¯FªÌ¸::TÏ-u?†ú"Qûdlôc…bÍ{‰
Ägo3_LëØI,ú‚ò6MüÁ´sZ5ªvÎKˆJ{´TÙ·sPR¥‚÷ÿèþ*šÿ½“D†€!û(Jº¹q×Çè‹×¬måã·¬«Õ%lôRÊÛì t£Ë„þnŒ&üJNÄ¡Üý·2:‰Ù[“AÀíï ”âôgG¾Í#°6jX%üýâå
î{EÏfåÍ_ü²@}¤~(ðæòö±¬ûDa5;ðó&‹úGXÒ~ºÉúè@,eñFÒ‹wG»ÂðZU¸ˆ ~7à$JñJ/½YT½Á :4Þ¾t•‰G3ûKQçC™ rF¬@ÊIJÀÐ`rW rì–yÞ¾ijhî\\œÚ­š(è0¶ï‡ˆ°jfä‚;û;¸ÍŠwð±i¦oßÔŒþ}¡©™¸sÔµ­ºZvÀl€†Ê}ëæÉµ¯3©|õq@½]n`$ÏžœäçÁÍ÷nïîÝ|€0?ZKfAÿ5Ÿëý{~pãÚÞÍO÷Þß»v¿»£Yæ¦söüoû´cÀQç³NB³N®‚°,G—4¡ï§#Q@á|Tå–ÍÓÉ@ˆš4Ë]†zzòÖ`ƒ1©ºÕ÷t^(ÖÜYæ:W9–ÞPŒy”½A)¯TÇG\CHàÏ â€(ÖÌ>_èµ:è8˜üÊ‹£7š:5VüÎÿûå¦cvòÑÓ5U¨IW$J%é´@Ö2D@IpS [¢³ëéÓZÞ‰ÁF$&Ž¸H€‘@l(€!‡„Dok9*^Hß:Lžp¤Ã\.•\ÈZÄw³–sò‡ÑÂqv_¾S+ [Èß<Ã>w¸Ï&’“}K0Ô2Gð0Mz§"yÁ aå_~VzzýrÀ–Àº§_ôÊÌöýÊÜ”"Ž˜Žþ*qÊØwEcˆßçäS§_ô;ìI•8XÚº‰ŠÑ™.«ŸY.ð¢hë¼ö‡.†*²@geVk–»8üùv§;×áö‚l™íˆû´ö¾ê“¥ Qâi¡ª‚`b’/Ài‹{a4¹šn¨’]®8È.=üÃÕ¥•µO˜@p“{g#¶ŽºSð*¹RQr£¯àÅI aâà–ù_ÝÝ9ý{vÿ½Ó¿ºÏvO°sË)¬~æ¿YÉIžä’Hå %{)„ôÞïwêË”›	i½Jšë¢È5‹6×­¼7y¬^lA¦°":œ|Ðm»n/ãî;t>]ç:˜Ç\MZUäãÿ}")pãû¸ ºÀˆ´˜AÇ½qw”ˆ·©G‹]‡x±*Vée-;€_-)µësv]~“j¶:ëÀLŒÍžñ~ëF4Š0@y
ólÝˆ ¼Û”-¨ú{}“n¸^µ§Hwk¹³î™µZÎ/®>'Àa2Š¸†™Û~ïìùW	·ù6YAšÖÐ{ì¦Œµ‡=ý7þ7¯~:âÑ³Ö’Ç–ð
!ÝZƒ¡ëv<Ð{0û¯ÎçîèßïªÀ¹sÏÃTnf¯&ÚÇÈûú·ô
•¤êžÓž.êj«eö1¬Ög2&v@É‘®¬‡,n[q£µZ ÜO¤øoìñW’¸ÀV|¥í[×2n>@ÕP«h‚¤ôIúSO.FÅ _AnäÞP°{~^Ú3YýZ/ñ =ølù\*H_Mé˜z©5åÌX~ÑwsÑDþ2n,ú^ø­Y–4ê*§Êáâ*âEäi^1Ó.å-Æ³®§í#o¡pE×˜D€Ra5Zÿ7¸mòHT)P×'Év‰»íÄÝ®'ˆS˜B|sXWŒ9²PEf–òëLvÇ’ ï£jSä$ä…)ùïçróRshÝ“e+³¸§ˆ×{ˆ=åK{Y¢GÌ§‰¸G8¸²–Š#w6:éÐ_¾¬œ´¼Nlq”,³,îñåpÏ\vmé¢Üv‰¸hú™9Æu¾ å_ô‚¹wŠ/‡û·I™žë7ãÈo‚ÅyD¢¨ÒPï@P…ÊSfãW#~*E¡`ürÒDÇfv& ©+Éƒ-ù÷”[ðW€ú®lÖCËü›·ßÃ™VÇÂáàùe· @AÞW²ú ûQwXv&ª@ rðˆÇaoSÀ9
V"á.8¡¢lgªUñp}¨ý,ÑŠ’1kú-îŒh~Jåê¾NgW@«ü€$½¾u]kùó-k¾vM/òö%þÏþivÇ<¯ŽÙÑ‚˜®ˆˆ˜V³ŽÈÔèõ¥”;Ï[ËÚu½wöa1ëˆA„Z†Bö•&‹ðð¿ùœË¾3!‚øÍo:Cy Væ‹Î±ÇÐ,ÛƒyªÇ/ó¼Æ(1.Þ„lFS‰£¢AÍW€¥Ì”pé ¥œm
Lr.Ž3&ªù@k¹¤oÀE˜û¹ÃQÚ[ä›v»ÍÈÝ×è1i±ü.`×úë¼ôH/Å•ƒ„±'cõô¦:«­£lÜ{³ª[7ž¥=kb7X×¸`@›ßZ¸šCŽ˜„ëLH¼
ðú±ir‹Rsô*™iO“Ö›EU‹íYMë¼n%`]Ÿ[žÒm&UÆJÎJAv[2eM­Žò‚0VôyøâãÖº=“Ma;"½ÜößÞË3ÓÈå/ÜqÜÚCUP}}Óú¦mÈ³¼f€«§ºÉéŽÀz0á¨j©¥~iÅ°65c%"IQ¶ó/Gzs€HìØô³½ë† ¢mhðJKÛšv¼H'~½òš¾F =§WhéVúœaéáW¶&Uÿ‡v>½ÂÉ‰bêfËHð
ñŸÖtšLû"ð’t€ÝYóMluë–}Qã
ªlŒ¢EÞì±÷8Þ”s»³‘M:ü"ál½›¦£WwôÅ†ouØÛôZ5úA¹,‡%mìcÕ¨‹ N‹Vêä‚—pHÓ­³ç¿8bÍ³çcu+Ýá:oô•˜§†PQÅ±\ðƒÜÂ©yPÃ-Ëb>KžK-/3!ˆ£ÊU™¨3²²åÆºÉp´ämXf·÷ÙaÌ¢,fýtÄ’¾¸ë¥íø|Ò¹‰<‚@~ofüýwXÔn£Ýc	b£—%9*wÕ"¿ì0J¸©Ø;b®‚;	{¸¿y2‚ûã“Ìbž­?q`[Ì¢àéâeQ@-èþaË€ìKÂ¹býƒè¨ÖQ±¡N*Îe#ÂYŽûŠ·ëáq/ßÅy—ÏWÔUþ;;K]e"7&dežì»¸"01z›v~/Ek÷ ¨hå?OK©[|Evðœ—¯pˆ8¹—þTÝf–Ž:K}Ö€­b4””©eû8&¦è ôÎÍùW£ÈÍk±jhŽºðl>Ç2p©è¡TÇqÃhÈfï"ð.vñÌó÷`åu6nCoñ[-,º
¸~@4ÔÏìzpåntO±âçÐ¨‡:¦´æ=Â¿¾éºâÉ#M Co
œ>ëG!¢Gj£wtæ–ÀÇ„DÂg¬]È£ÙA\¼ˆ'ç}!F|¶ùÿ|_‰6ø*N¸à¹ôL9 Æó?=ˆ¹‘/PP5§/œ,<â_iF)ôaü¤'îVÀ ˆ–xß)òËÿ®e´…, (Þc‘ãh	˜“ÎÅóà»ô¾J‚þv9;5û1·K¯µ¹MŠíáµV¼¾^ê`NÕ/ÌÍcÒêlS*¢óÛS
"r½ž_6Æ2È@…CN˜ì?M¯â[`Õ‹·â?y/Yªü¿>î>¾Á'h‹éúK¨Œ+‹†5ž¤W­ñé×‘û­œˆf$!í~%¨{ðU(Ôz­áv
8fõJ‹
”KÅ„¿¯ù*RÜýâ(½wñÎ¯u»„×ÎX;B¹F[Á“æKtëÊ"ƒÝŽ{0Ïå~G—ä|
éð÷Y¿Q²1†1÷èÚQv4gwÁîÝ¤°ÑôxÀ…´WìÌÝ
®‚¸ý@ÛŽŠ%Uì;Ó+ìßU)•á¸w5EôdÜcÌTŒIæT@¯,ˆÌŠcOrš#5“ìP¦#7u.ÄL2#\ìH‡–®ìe©¦ÙJigBS ÿ$Œ'Hr¨&…¹&k Ý±ÀÄZêÆ}$Rû	¼A½
¨šÔ6žRn•‚ýÃ­E.–|åx—Š@xžö8^>kôî’~ám0¶7YA±_ùšïôÔi=:¿hãjy`¿
¸¥|×XS<ˆ0\¦@äÎ§‚Ü‡¦Ùâ MDŽºâCº{×žDIË‹§'½PŽb*QÁÆ+¬çv±|­9$£­T85XÚÒË¡œ{Aãb„WÙ£ÿüŸÿUS¼	—iTü¾¶È¬.Foáª¡é_÷œ‡NŽ:|}I>«JÎ”˜¡9îrAi@Õß
¯Ä	A¥A)þÙ˜›9ìOÇ½eUKW˜h¡… yÔOG.ÃâïÉ0OÞºAs}a
»wÏçN‡GŒÑ9ÉF/°O©”Ò.•b M³èŠß£qµÐ›n)¨­€Eð>ÓA7Ì~4Í¡{‹ÂÇqÃÐ® Ããò* «øA:âºv§uXÚñr>ÅŠ*`cë{qö¨m-7=ö®mQ¬ ìªÃdÔá.º?¾ã«aM¼‹°èw¢~Ó4¦µ(êo÷r&§Þðë¼‚[>µâW7DE¡ªÎ¨¿0üûEqÚ±rÊõ‚ÜÜÔÑwôºâ&7ììß,ñrÂ°xyþD1w{ÕÐÃyJ§Ú'¤Üã–«~/j§XçyÒJLNk€pöElxð¬r=a$˜´ŒŽ[}Ÿ¶?­[ÈÜ®æ.x­RÛÀµ0¶W>¯²¹\Ý–Ò?š:õ_c“Í•âõZsTò\?òæ–rmÝ7ŽÑ(Ûm¥G<c²]ðÅ‹Z+‹ù\µ__qSPSäIÈ«-q§ÿ’ÈŒGâ$hÞtséSîÒÁ”¤ÙÂë&‹ãAûõ–Eõ 5e±€rå…ÑÀ…«#“âÔ¼~2	­&¯¯@âèkJcÜ‹³¨Û~ååñ›Ÿ=ÿ©b7pÖ‘G¨Î¾#Tût"ê¶|¦­L@ŽànÒK\.ìt¹eg¨Eëµ77ì½øý*±¹Çg59ÏÝŒT>Ÿ6ñÓ‘iddÎsªÜçÊK» p'“¨ Ìô£[ÜèÇyÈ}®ËqnÌ?v#5;÷tEú­füÂRð·6qŽ°°•\nšmMÿ¥@[^S_5£dœ&×Ì;…Äò*ü5rÏð¸y6ù¾æ}ñ–Jìl ÷ýülVŒ‡OÜyWo{ÅÇŽ`ž{¢›¯3{JÇˆrDà&¿ñÊü5ÞPœ#·âÌÂyZ(²¹íãÞ9$åpC˜":‡ß/i³ÄÿÝTiò’šA ïí)xÓéŽWWN¶WWÂQ«Ò×Ö6N¶×6jmƒßm£öÝÊ‘Ä™ä›ÈXÿ,êòôTùC¬Äl‘±Uœ‚s/m&Ý˜}”Ä‡›¾mÞU`7ïˆ&R6 á«Ë/æ}lëžú½Ê22äÞZEÂ×½ºdÈw„¸±rU.º (w›¾,°È ·¢þ½´ì±+L«-l$ÃïaCômdˆèò=¾E¦‡Qk¨;òðÝ‰Êß7ád	WÛâ4þ=`þÎiR´_—FéÝô0Îv¸"ƒ]øøgW—bøôªù1?\	Vñ`ün¶“‘`.â£?hôHÎup•=zó¸z¾Æ#Ï~‚x2 ÔØÓÐÁç±ôU#²|?'2¹‡æ¡Ö9ÚMœQáÖ_™äFÚåK2àêvù:®Lëãºðlî˜hbb€d’¼SðOù³´“–’˜í±VÄ=61«€Éh×veŸËXµÚ2é·ºãv<lÀs. §*ûRp3§Ø9iŒÁË«+sàV =cñl€u@#H¼Qk œS—pÕ,9dÕÊù•¨ìŽ ’àÅ‹ŒôÂ7K@%MõµÁýåkz ÒuN2ÍEJ;ë?É”‡pS=DÅqlD¦ø¢çaêg6ï´.­3¦\Q­eÕk]7Vq€
cCR•ˆ6w©úh“Õ, hÏN$£ò yÚñ¥+ø´ã1itÕ½Ë‰$ºðàRHF $£BH2&ÈÄH N†â¢?*¹i¿ÍRŠ‚'`ncaÜ–é$†oÈ^6¾kXfDÞ&+©+nQ«Jjñ·ËE9=þ¾¶â•ÙJè˜Hót_…¿0·D?U†	 —Ç†);Íæ$HzE›Â‚ÃýæP°àÒxmó§˜ù4–< ´ø?íñ?Kš1BQ>:ÛÆÙ «‰©ü]›eù—ó›æ¯(èôëA••Ì|V"…Ø¬^…f>ÀÇd=gùsuˆÀy«·7Ó§lÛ*ÌD•/…¿bþ¢ñÿÕfKP¸(kß†
Ý<!· üÒ+á²// R‘ÇÅä`|ú1„ˆqiÔA?›?\ZZ‚Ÿ/0þ':qa-Èw‡U2öímÆÿÿnÓ|.iƒ	žã!†G 3˜B½WÃ+¡“­I¾^îw],ÂÎð'½ôÄÑ[Â	¹d¥2)£Ü›\&üi"ëtµê`£×»œØ)ñ„†É)j$:vÇ§˜­2x‚hÜ?£þ}-ÍrTj_ºÒ÷žòR„Ã A¨²öQ$¥
j©ñ³jp=;ÌeÄtGuŸ'ò²žáØn •þ*T¢ì$ÙO<Si%•xÁêL
ct°Ëûòg`&+p•0Žjmemmy‚<ƒì7”Ô÷@äbkŠÚ†çÃÿ
Çß¬š¬LÚ,a'
G-H;QÈ8:oäUÇI‹g!©ítþãÿD,;ý×y’ž&*¾Wb:±¦² ,Ÿõ”æ‘N³gºÈÏ`DÖ¯^?*2‹ß–ùÞëàl$‘Ž©5ÕdûÍ0î%vi6r4r~Ë9šå#~Ì/Ìx¾õ´Å}«û~ÊäÊydceùRî{›1¿‰CùÒ†*l„Œüu$q• ìñóñm†Rðå•sY®mj‰f#á…ÍØÕp}ÅývÑkæìíûShO¢1àÔÄ!£ƒØñABìU2Ug…”¿¦ãVg±õ“ÁX„iUÑæ€FY*é˜" ¥)“Âæ‘ŠÖ	¤°iY‹î?
X@A”73çlÃ&
7¤Ù¦Ô¹{öü3n·ùbD{¶#n²£´o–?¼§€†S$~-WT5Pt%íSŸÓ‰*Õp%ºtë•Ò¹|«?ê)qãl¶Mýé¤ç
¸Öµ$A>›WâlívÁÙúD[‰¿ù±`Rü¤ÿÖïPh$ú¨×VŽò^¤\ˆTQƒ)Aø×·-)¢);°ÏZràškA¹AÛcfÒ²BžgÜž*©Èi)¥ËhŽöUA÷*Ã……±–(ZQ‡ƒÃ4À³$$(˜]R…Š³J% ~E"’St¢Qý'ä‚¨KÀ©ÕCÔ°í±d»RñžÇà	d58E<ü¢ô
Âï*³ñÿ„ltxÈoÈªÿ ;š·¼ÄïxIŸ­µ uŽÈ…B½’å>·}GÒ˜A+Í|¾#¬M"tNÿñMý«AØ?s&Lá˜Û¾uúÕ¬þ»wþpIŸÿ”uÏžÿ¨%¡O6éèìù¯ Žð÷`¨“³g¿ï©~&dŠ°®VË×xøx”dI4’K»¾d-t¯½)Ê£s„ï§äÜQîeÎ¦ðf_ò®·œ X©Ú,¥ÿU4qï’˜fƒuÑ5?¼ˆ1†ðÒºn6¼ÐKÌ¯O•$×´õ½hÔYâóè Qg^`k8±^å¿íGÒÇ«‘oÔôó§-jøk$¿§ÎÄ?$¦üÏ=ËN¤-÷›%uÚ‰]U¸:uª-»úùZ…Ù[ìÞéW/,Ö„ÐËV4O¿LA/}Ùã	&º_öt•òPo1>È/ŽÄo/t;:ÆƒêÙCÓÞ+ô>ÃÒìD)·ö¾l‘†¦×.Sån1ŸÏGþju¢Áñ­íF+nâŽ48^¯®48Î«3èlnÿìZ«5ÚÕà˜«6œ]2Ð¸ãŸfC‡ÿÁ]vx
Ÿ`%ÐžG°EËøœÑ“²á§L/M„Tïp'îv¦^²{„× ºHpÔv“à˜‰«„š]M1ù9pLãëÀ1óúb8jy6ÁQÌ ÎE:/è	ÁLªæ»?,‡)ã|+‹RŽ.Š£-M*ü-±ƒVÿ”SÏ‹¤‹ã<š=qÄÄâ}5[ ‰Ý58bûfQH•ö]Ñ=ÛÑ˜ìœÈW•ñ×˜Mb7¡ŽI…½ÔqKœË‰züpÎ>¿½ÍÏ’ÃÍ™XD‘w¹“jÒö)8jwûá“Pû¤à n˜uþá`ÜÝ+•’¸Róß9Îì$=€ø<ç6¹³ìÄ‘zz7Ì–@mî‹–Àóü™vâãÎüÅ5é4Ã>yáöÇÄvÃDMýEY`VJ«$›µZök	B¨m¿ÚåoÙ_+•ïB!Å´]û/·o¿þÃ‹[¬Râl&Ÿßr©Âîœx¥×´áS„»aä•jõû]Öq‚°ÆÙ"â½6;\ÜOhmP8ë¢}p†¢G±ÎíM†ÔAûÚ_Ó5T«R ÷i&@¨9ÄÛŒH}a“v!â Ébw^‰8Šx—E‡"Ù›qC"Ž˜<o¤ÇWÞªÊå¿Ž93EÚ:vÓHj©P7Z?NÔ¦¶¬­'¥LÒAözjpŠ‰£'Ö®Òdf&éaY/P*²~QtŽQCÕìÜÕ`þïj 8ó eXì6‰ú!D²òj‘­³áÈ2Ê•1ë‡'ºÒâ$	)­•&Q7iÍm_Ï»…©C&ÀÌØ
“e“mEz«¢…¦æê“p´Ö†ƒN:“¢¹!i¥ýúÙChq8TmVÄuÍÀ/S?
ÿ¼ðÉi)ÇÒ„¨¹©?ÒÛMÂ–JK 2cŸ°.Øq¡î@qÕ”µïñ"€Eúñ
´^DqÔëH”7 *ÅZBÇD‚Gmá†£–€ZëŠ8³ë4T‡ä>-õ
êíÔÑÑ#ÊöÆ:B‹W!·+Êó¿Eâåídœ©`ÕlCT‡«)NC„3É—ÄÃe5dÊÒÛx¾jlG¨½QÓÖáxêÉ÷„Ò=l×’lgÿãd’}>]êPÄÑÐ•·jÑ†F–I[{d=Á®#Öçì!œè©ÆaùYèNÙb‰¤ŒÏtÒî.÷[®¿sR§?s2DùI/í—<ÿöKyß™4aÊk3¿¯HC¦c4/©-“<…ÄMYÎë@Å¿<Áö¡‡jGÒé˜Šª_0ÿbï>Ì¯¦}]§×UW»¿M§¥–Ó-í»Š›(Ã,Õbd¤èhÞ%õ“7ö£6þ;Ë™ÿ°¸Ÿ¥=.½\¯÷øv³… Vß É×NiG- $„qa{D~ëy›þ³¸l‚K‘oûíˆ{›ýèIr €öÓžx8:ê:Ýýz«×ÞÄŸ³ô~¶jÈÃÀ’µ2©¸Àd‡ö"­ÃE²õnÂWÔ;Õ™–sé3PéVg½¢(šÐ¹cïîªÐnµ¡¥HÀæ¶5ÉäŠëìù_ƒ6³†.±[Ëuçü›eŒTP©½Ñâª«Éˆ[›Û{¨7›0š»qöü7¬?ù™gÏÿ™k3Ð^öäô`•Ì?}/Mº1ÛíÄñÈ	«9S¨UŒ˜¤Í+äIÃ/öeÓýº]["¬Ûû£Ýq“¯åÆ|;É¸ÑêŽkO¡ÝàhqÍ€1j
üð¶%Š"gµ{Ó]Ýž ”‘|Ï¶r•Í›õH÷H¾ºµgð]kèzpS…n!Ë®k8ÂxÎU„Zb÷ûã(‹M]‘3½zìûH j.‡ô{Yt_€Là"]Â"}Í%Óx”ÙÈçp”¥ýƒWR@a+Ûd|óÀ®/¤@ýn1£‰ªëêÚ’ê'T¬Z'µârð¶®µZñ`õ[ñ½¨p)±SFf®Ëì“
%Á\8óS‹ß\çßKÛp"ÿÇuFÂ›ç¿ÙÏ‡Ò€+ÇðûçX˜xEÔ':®ÐO¾?Ž÷ÄyÚ/ö³UÄ•¼Â~^ ýP¯âö³¢üeð3µ_ìgï'ý¨{MÿJù/î9¸Ä,ð¼O†'?;FbÔâ\)ÕæØ¿sóëec(P»uiWŽ+²SÄ¯Þå‚YŸøf–¥üÛþJímh(,ÿè’ÈÛ=YWgÌ½ýïökðýâ¶ã2Îü£ÑN¼‘DÝô ÂÖÅ ¬Çæ¸hèß[«|mg÷#õîlŸÙ¯…ÀD|²Ä¿¶s,ÚÙ"³ªLc¿s*NðœVr¸Øírð$‰ª¤6H—µ\&¨=X<È¸Ã÷ïÅQº˜1ôxó$1ãS?îi•{‹Úm7IõlýÒ dš7jbqñ¸ä  {Ç…£„ü\Î*ììUj!~Œ»Ã8ŠÓ8ÃÏ„°Un`”*hÈÑz\Rü¼ê–*sÑÄ,/Œ1h“A×T”.­=ñ®Üâá·Ï!P9ð8?å¿~jG ÅÀÉŸN«éÒât¡j‰=æå³¡^gÏ‰rÏ%vëô~›Uö[cÝÓ/ø¤ò/‹iý¼†Uz›¬ƒßZÇ›ÿ?9ïjáKm€KÞwàá®„ÝQy©zöîFÃ‘hSkÃðUõ€ÚÞh“¯v–@!döÉš†îüS“‚È±” „`_Êòõ¿Ñ Ë¡ÝŸÄâN~éCBp¾r™|9òÍ‘EÍaÚso#é#Ã»¼4FëÅ?å¾ª>€@M:ˆZÉèhñí¹í	Yò§ÒG`ÜS>)3*Vh7$.º.Ç!G¹Ž#R=½ŽÒ³iÝ«¬žsºÏlŸâÆÊ½>~KD¤UýøÝàŸ7,_Y°ÀnŠ†ìü‡ÆxÒ¿|=azç÷|HþnjûK9QÌ%çë€ø3ÿò~r CÝ8‘}:sœu=¼¢õQÈ¯4Ä!ÏÃâ†aVãmöþ  $êÝ¨w[[E¦ßöÁ9MÚQ¸u7é?v êâèßµlvøÊúcØC½"Š“á.ït{…‡S~rt€JAÊ`BÙþ]q‡›"Ü9Ÿ»qúeŸoº|fyhá¾s`H¤|·>ýÙ@—,±Îh4n./·ÓÖpI˜çK­´Çwn.—ÛËKKK¡¡ˆ¬Ó1ÂÈÈ˜ÝÞ‡Y7”ñ¯À¯€TºF³‚7	V”Þ7È*œ€ZgªA¶Kskß(`0àu«dn‡Ûþþ	á6^÷…JµÙáPáÈíõ[j^B“ÐN†ÍÄ(|¯ZêWMMæ©¦}[MŽˆMjD›pnmà|©™îµÕO…å´“,s_
ÇæÙÉ ‚Ph3®Î©S‚T‚ZV$ÊÞrƒ‹Éš%›kê1­ŠhÆ@ãÕm!j-.nÙßü8*ù|uÓ{ZBçÐêöiSö ÞÏâagçÐÜ*.Â|Õ|fÍ›êDG3|^*‹ï
*<Ù"(¥®‚QæMU¤Î‚$ ”0}\•í‹üi ÚÁåFÕäeU\¨á$·×JŽð\ ïÃWWTñg´PÇî×t£"E† ö`¯’¼Jµ©Oð28?;$bÃ³gÏõ]Í EðÅ°ä§ÅŽß´Ä?}Ó\àæÁWü 6óœ1>ÂÀœú{žp¸Få¶jàÜöÜuÀµD|,­Ó¯ðÆÆøgmü={sj¨ký#ˆú&£Ž0lZü¾O’øpÁU T…OøN’I^{’ÌÅ‚[§ÏZlMÆ›´Ð”&Î"~…12ü™Û•ŽÛÁÙóÏ[°$þÝ°9B[øù%¢ïH4BqÞsˆšýt¤™cÙ—	·³ÎžÿuP"øp²{¾Já;p¹ºYaXûÃbV
WÆÆÝ¸á´ådtl5ïðôo%eQ1â<&sWYT¦äZ¹qëRÝ©½‹>'·çVÃµûï±»·Oÿû}vçìÙÿÝ#="ÖÉâý+ú$Ÿ0á¼\™û”¯·þã9Æ·Ò+sý4Ä}>ä~Ê¿gYœÍùtª°½aøDÄ\“\ôÏ–°H(Æ¸ý|ó)¿g?êZ\ypäeà®˜ÎãI4¡´»´+:ÜIØØÃØP`Ý,ÿ{·øW‡|/Ž¸£ÚÂH=,4}|G8ðŸ×Ï¯›9¢hí­ÎÅŠXÕPe˜g]Þ„i%eÄ_·e
s%b]nVÃÍ6<4Í-û¹«ÊÏ•¿_.@Ò0-é¯+Ò rH¬é²©àþž7ÙPpÂÚ§¿í„yµµÜ¹8Ãšý²2(–à¢,M9Å?C~*å›£pÀZ§_òß3„3„½´ØRµ8@k>RW`¹:þp2±!3Y<‚æÛžHÍxøy\÷3ò2„Æë­Ý8Êø-õJÃtãýW©£-Ç<\Pªæ{Ä¤èc)ª¨¿W@í…---…û‘d`Pí,â1'àŸ)jå5ê†ÀÖ »øôÙ_ÆÄŸÒw¼ABKÊ-¼±¾¤ÒL!À½•—úá¬°T³:OÃ|°É)¢ ˆ*Qu·â)31‘OPT•ïOŠý|l‰™µÖ%èyø•€SÃwöÿ  ÿÿ Å^ñYxœì}msÇyà÷û-œÎXÈÜÅ	
D °@"y"!*Î1,s°;Øcvf53K †QeŸ>äR)W¤J\‰Ë•ŠhÎå•(©”‰råXú¸_rýt÷Ìôûô, Iq]¦°;=ýòôÓO?ïBÖÏÒôÖ0Ëâhå¿ØÛMZ,Mw‚§¶>*°ÇÆç‰?ˆ“l}óßŽ“NÚ
ý¨›õÐòò2šA×QÃ2ôô;èúIŒÒÌË†)„^ÛïÅaÇOÐ;Ó¶)ã)¡vè¥éº×÷—'¶CÁ?Ív¢ óûi³íGîçÃ4¶÷ó¯ƒýæìU4Øk^A[x¶~ÒœËÿèxiÏïäßÒÐËüæìüJâaÔñ;Í¹½muÙƒ¹ùiü(ó÷2Öó„}›ä÷`»ðOÞýö0$ýQ'èÆMÜ;I>!öûìÌY©u•d^ì…«ø…þ^¯}˜ú°íWÌÏø½ ô7‰ïu0\üŒŸýnsõšhºbÕU¸‡›ôæ…Œ£¬¹…ñ`‡.‚B{a†Á:í#Ò"õ¢tbe­÷Í<Ô>þµ¿y†Ò“£F“£ß£089ú«!ºqü,ÆOñ?ë›KÓ½ùŠ‰øyÑöR~ó y2¸ß¶0–¢¾·×Ü…9õ³æ,
1¤‚¨ÛŒâ¤ï…ü<+ ýÑ0@áñ¿F]õNž5Àó?þM„vNžÿg†nÇq7ôÑlAŠ^|vüþç›?œ}ÑFí^àáe??Â«ü7üúNÏÐÓãÏI?_àÏEÇÏ3´”¼HY‡!î°(nÞ/>=9ú;ÜñÖÉÑÏQÔõö'–¦¡§<‡“£OPvòü:âNC?€0¸ùMa)»þVŠñµU,ƒS©)´ˆ¶ƒc¿ß•mø^Òî!¿?ÈöG'FQ äfN WäsÍÍŒ@hª¨‰Š«ùÉ {(bíÄÊû=‚Ùñïú(ÜØÇ[úü‹u{ôŽÿˆðö}æäè°‰G¿ÅzüµGßØ	0&ö+¶OŠ^W(ŽÖÂ ½³|Ð˜BË+(õ³ì† ðmLNNêÎš4;{ñS?Yè$aùô¼	´ dýrÅ°k$ +ßƒÅ¬OŽ~Ú×Y}í:àbªe^Ôñ’êÆI×ñå×Æ$<î£Ž—a°{[øÌ×Â:|,Û~s¿y¥æED®B½9ž*š–Ð›¾Z¢*¾Í—Ñ–Ÿíú~DwóÑìì`ï1Ýã¾ß	†}a—ßŸ©A1µ÷¿0‡®7hÎ¶æ+{B*iÜ…ñõÿ.gÀÉü:Ãß¦Œ0º·²”fIuWîŸ<ÿ#¾£†#žl.âîh´çŸÔ ž¶{Ð4CYrü,@;Ç¿Æ¼“‡O6þ- ´Œ.'ä†È€fGÝKøüœ<ÿ6ëŸ÷¯ú(ŸÁF/ØÎÊÑ¾›O†Ôr[—ÃE¯4CŒ@Œ¸³ùeÏ¾/×Æ×9À×yw†ƒŸ´=Ø‹÷.%¨xX¸,§Šã%m$˜D}ŸÃçæÝtl;Œw›½ ÓÁG¯z·‡¥=¯/á†û•h–øÛË]Â;Öa(Êû°úUnUÅt½av§×|„‘6,m'qnyI3ëx[‡I'Ínâm!¯OýEî§-Ìá› ôÛæ"¢bçH¦´s@‡Cß'Ï=Á#B{É‚kôsó~xË¹ÞŠ;6LÛ;û(‹ÍôCŒà9nl)Hâ4f>êƒxW)È-‰ÎLD^‚I¡cü:$Zxéyòwgùñf«Òœ«4B;#à˜›É±ÿÑÜ`ïû3ßŸÇÿ6áÏ¤»å5f.‘ÿµfæ§Ç$ïñ$$í/2VÂyÕÝ9þñúmWM@rààƒ­`¼líøûiC’”Í<žržg‹2·à©vÐ[˜£:ßOâÝÉô½A£Ñ#Èú¾¿Oø³ç·1iˆ£4CAº—Eåeeðç{)30ÙE×6B¯&ñpŸô4Ü7×Qz¼IÍ>é’ü5z‡‰Ÿ“ÈÊÔ©îHÕz!Œ-ËÅLh¶ø‘8ðf5C3îÂe@ƒ‚]y¤~Jâpð„#Åík8‘äÞÆW6pšø?ìjÄ¡ÜÍ€ñ
² Žš&Çaâ‘/pÚÍte>
2œêÂL~•"mœøø~€ºøæ ·ëœú)NÁu4)°Îó"ûr-çlñoø&Ä<Ì$&9JŠ/ÔÉšÃâçè}u–Ý^Vöôuòp”•5ØQüÑòƒ3ƒF…ŠQ¼›x2V?ˆš»°ßdÃ©FäÑý¶•øÞNsh]í>©‡˜îŸ~$öã²^„áœK6~D71ÿžf^‚ýä°î4tLq2ŒÚ-&V8
à*]Töžö’ ÚiÎð7ù|²È1hÒ#$¢& Ûq'un×òsÀ—zd4ÿÐ»æf`R'Cî›I/mOŽÜ#†ÏZÏŠ%Ÿ‡‘ë¹L$@øWVEÑ@ˆ'ºRjúTi
\æ~3Þ.hö#¼5úŠ—VÌí<hÖ«å1ú2^jŒ)UaAQÀíü×Ù~³§#¤ö]
å(çÚIÚ–_©ÍºÂ§“tè¸|6,»8‰WÓœ|å.Ýˆ;ûnë<xÝ ÂHÃi	—œ/—Pr·³W‹Q¦Ì'¥Ý)&Þ)f@+¤ sïºµYÔR†¬„3¥ iÑ› 0ªÅ¥ê¤Ö’ƒº¬¹t
}[¡mZø¯ÀúOýh‘B§/ÏWiÊO3Aá¶æcæT6\$•é9ã(ddž7–,KüÌëJÐ³£JÐ@AsŒù^s¶æÅ®âA}]®E
ÙˆÖ™ÀwÄN+Øæ§¶çð‘}|féê>®#0ž…T{rmÞå6Ø,3*ÓÓ¿×7	Djö;’Ä,®Ú—é)¥fQ¶å¼[œcõ§tVÇ4"ˆ¡b«Gb˜ÁPÑâù}?ñÂÑã)¢£¼&H³3“£Ma1? #ò¸x	Z«æ5Ý¤Gœ#RÅq^rÕÚüÍ. ¯+ÕÖ—këK¶˜0§¹îX#RâZ|¢;§ÈÍÈ‘[¬1·I°áÝØIÖx¶2WŸ-k'Óï )sâòÃ»“càBüí(KÑ;Ó®cV7+LÉßp÷ã¿Ý	þ.[Í9¢R©2P*öäƒ(û8TnÏàäè“üŽþFUŒHü›è|äÄÜ÷²^«D“Ê%Ôˆ2¼%>j¢Ù)ô¢ß6‚ú˜išuÀÈÜý¦yQ`óç§^cÚY6êìäèg`<9ú¬ö2LSËUdœcq–"þn'r\N ÎÞvs$ýÞ þ&ôÔK/Ê–'âaªù&Å;´<‘ö]Úv‚Xgù€m3¨Øf]è¤êó³Nzhÿ)üBQËÛkÌ^Bä78N$Xpš\àÝ{D¿!ÂÙ€PõJ]Ã&qøEê òÜprÓEÕÜ‰•ðÉÇø6âðÄ[<À+³Ú=Ôè"UÚU™Zÿ]àrœˆÇf~(qÑ4:ÈâÌ)¤.$Âå¾ô§¥Þ¢¦É|Ïì}÷%?CÞplÇgŒ\“é±”–÷–¦×¼¤³†¡‡–®	m >Q[’tÎBÂZ¦Å0üîFy,¨cü@Å8¡ó¼ªS¤¥a@þhn'qS¼!ýæ•R¿
ªÁ&)8 ÖU<jaO¢ï|G‘ü—6èÃû^„Q8Q©a®v0¢/°?4<ˆÃeb‘ÓÈ6ø½v£v§þ€ÿ¦¶¦~²| ÿj†Ÿ±ÔŠYŸ¶a_ÔnØ‚øý4K—¤Ô7¨1þ½ ÁãÄ¿•$1žˆîWùÝñáÇ ‰Û~š6û;€#Üàz<¹¿“}HÛä¨2þ•wâ`u/nñt|ýúoÆÁÃ¨;:ÄŸóïKÓ}/ˆ
 pøA´cÚ®y7/Œ»œ@¸Ä~‰>>‘i/Þ-[â[ëüûÆÚ.>!h$©\§§Ñ‡	¨ä!n$NaŒ`ßZäá“Š‚¨÷¡ŸùÅ;¸Aã-î¸]oCìè–Å'™ïõáÉS4–B?¾B7„éÒéå9=[dŽ#<2ô™¢çÊÜ<¨ ÁsOqÞ¤LñZajuÙu_û!~Ö[‰ž‰úJöFÅEãd‚±%èícìáf‰žŽäÒOU“nBk v¤rô[þñüYôÖÒ4×a¨›~ÚN‚Q8(
Y½éÅÇŸƒˆøüË‹ê4lÜKŸ¡¨wüËÜÃOé÷üýüWC$¿ïé/áý“£¿"2þgQWŽ7ÉWÀÍR‚æ´œbCP±ác°1ÜêYN¿7¼§>LtÔEY|G~SÛ9-‹¾tÏÛòCÔËúá{ø’™ÈOÓ„º5}³rå]Ø°;XŠ&q>s2þ«}²¿Zš&£hÇ¿†™–m
:Üt´-¸ð›å‰uÕƒY´ñÈÅËV«¥ïAŒ¶›Ó9¨–òÎvÜ¦‹	Äo‘Ã	hªí•^$q±Í0‚žqŒK
éçÜýÂ{¿•yI×ÏZ¤[š`fsÍCŸ‚Y.ÕFœML§1¢€lÞGO!¼¡mCšâ¨Âz‚›‡£rÀ
¥-rhøuÚýft»¢Ãöh8b’&Ø8Ô–(àò`1Å`Àphlô9Yš¦l]–EÑm9¨dßt¼üA<€{NtS·h ”@æXiU,±H;î=ÌªÄá0ó©U{ŽLhŽø1]Á·äŠX}Ü ÓÄ´×ï¶ÂQgé¦Oƒ];fJ”„=Ú$rx‡ŒÄ%ÿðÐITì5û¯¡s
»ü^ÒŒê›Î/½ïïƒ›TAyü–+˜{x]Â±6¬zT­2´ý!ÅÑÛàeîŸ@&µÌ-÷•É`]¬1þprrª•Å÷â]?YóR¿1ÕÂ,f8ìøi£QB[ÛrÊæÈF\è`ví]ÞÝÌïSKtÖ
:‡Å~“y®ää§šÛPØ25óRž	 ÄˆZø"€D¡7WTw˜<ÈZ9Ûº¨U˜ßèZœJÌ›Xõ9´‰ãÅ«ýQnC5`(Ûå°”Æ"“òª
×)òKC#ÊJÞžÖdbJØÍÿ"oJàvÏÜæÓ¶úÍG3­k:5ð½oþ0ä¹ôï _®€B§é[šVZDå<¹´'ùÏ‚D»ágˆ¹Ù€J3Aü.ˆ"âmâó÷èoe9Sà»†–õdJA'
ŠfÁƒ—âVn?#¢ÿ‚àv/Æ\ù£î"8cÁR1£ŸOïzNiŒb›*´­0î‹[írÂ  þ„*Ô…_Hf22ŠŽ?ßo¡5áÊðe$³ÍÚíô IzòüO\ÂÖ“¬d¥mû‡Þª×ÌÂšBw°4…Lr•3SÉ´\&LËìô¢x„qÜ'? ÓË©_áu¯a_$–EeÛU>…†­À–E}MäSf5Â»¨{Ll†À|hk;-Ÿs…Êgñ¥—iðH¡mÙ§Ñ§ÌR•³~‡xä»ªú.æ+Qy‰üb‹qàt1
`qe"ë00±dù„SNÁjZ¦ë$±ÏøÿR¨—¤ƒÅ5^c)ÐcýÐË¨ÝóÛ;[ñž£èòO 8Í·é2ŒþMj°´(a]6IÜøU˜Úhœ˜ßaˆw·“bzGi|¹W0# Èäf¯<PGò9›Â”Õ«Tæ&½GøˆÂß—Lõ±ÅaéùaêcLøoŽ÷A~Áÿ‚Ÿ9–m
†'‡ú&!VTEÉ(#ã~sVŽdÚ£Ty@ñ¡=É€ôÔAÛÑÀïÒË“œë2©¹‹&§lA6M†žO•-¶J3õzÏ½G¼·$ÊXGÅÖ­1,x—Æ¶‡qlêt|¿Ú70il1¾ÝÌ‡rÃ3Íh9r›J°Ü÷€A Ì ã2¬ç¹ý÷žTu9¿ Ã±ƒyÓ‹EÎVâ7¶pµtâ1é»ôÕ
&ÓÐ´¦åbd.S9>	¾Y®jË“ª1\Zý4VxMr’PéÌç#ì÷Þñ×žVïÆ¶Jãß +I†»ÿ}›þ§`aa0ÆiæiPû¼SÐ¼3{|]¾ÿîõˆüçŒ¦¬í†È}	¯ô›?àG"k-òÈJ?íãx‹4kiUŸKæ¿GdOÁ…þUœõ(Ž‘ëœb|µgÉˆ¥ÜXmzùqWdÄ+5 ßÜã-/ÌN"onb®©šÐÙ{«it«‚ýó•>ïÅøt¨wü;|@½Éy’&˜˜B¾Eô¼ ©Ðl¡¬M¾8Þ@²pP“n0 ÎÆ±)·ÑhŸD+A¥ý‡2§W*-ÕV†Ò*•éxU¥:¸
Ež^‰§aØÆ‚ùù@‚¡ÎóÝÒ‰yÊ„3îV–sQS8(*FVU¨Ê
“UÅMeQGi¡`ôj]½êbn~,ª›òâÕU
Œ‹WaT)1œÕL‘Ñ%Ç²	/5”§Rkh
]pÓjÔÒkŒ¢Ùôò$GPl8©6ÜY³a³ ´Ë¨¢á0ãÒéµ§ÖwÀ¬8mÇ€xVQ– BáaUyX,Àê-­ÓŸŸ.ÄÊQŸ‹ND3ƒC.¨ ‚U`XpŒT8HwÅŠ‰9_­Šb¶s£D¥¼ãn»S_¸@Ï‹/Rú<íx‚ÀUmÎš»Yõ„WÞ÷Þ÷Þ÷^ãž;3|f> Ô/³}æw¾Ö=aÄ—Í¶w&,ïx^0ð—ÒkjåS¸œ0öÕäHÕƒ‘†>ÂˆŽbæsàFµß˜øø©žÒÄ'°…¥HÁ…Ùù^Ûjî”ôZØ½ÄV¿Ñ)O›%/çdñcTáaŠA7
U€¨‚Ôð5§
(ê‚èøOê€}û|‰„8vI& Ü´$~ßÂzt‚iˆEü$kÄåÎ±ˆ‹guŽa”3>ÇÜA¾1wòÓ\hžêhè‚öàè9n}áµ?á½àäè'CwÆg¼8Ô*—É¥b%8µ×ñÐÛÑO£ëß†ãnCÐñ{u4^ûÍnÌ€$B OÚ]G/>õcF”e‹hBFÆ	Y4;{sk{;h~ÔÞ™Ê”]8Óí+ßJSä»`RSn‚–Ú”éêz´`æÇCüÚ	0}éÄ¡2ßV2¤Ãß³$DåxzRT>¿áeíž"IM_*ÂÄhÒjŽN—h¸g²dãu§J›'ÏÿÏ&Z;yþË‹!G›ÿx¿qôèÀ/6€f‰*‘†B¶âÔÆ¬Uíœ}Å®á>éü“>+ üªÓ-+‚Ÿ•Ø$§ÊO,‘NoÞYQ“»}À!DR–¥è^\™L*Hé+ô
ªah:Š±>¯_¹0ó´÷	¹Œ/†’@õ?÷’’cèÈ:5¢ïÿ	ÙþCWçJÅŽžÜá³u_ð4·Á‰$pòdf
ñì)¹ É¿øÜ=c:ÝšÌ¼ÍYÅÈÜOÈA ³­ê¶Bh|n†¾,'wÀA*PøIr	¬`Œ’Ù­°	P.E6	–\Š%çåÁkaÏW²¿Åc¶²×eþš¢Æ,Ÿ:øMHžïmj«Kp<¯oWà{™:´¨.¶Û¼ŠqøªX¡·2/-gÉÓÚnôTçï­µÂéCß7ÞºV:ƒ¬1ù—ÑäÝO ö—Ph/†dhXš¨'ÿß‰Öñ¹ªHÚ²ÅÉ)³m™ÕÊXPìïJèAàâõ·ðn¾›œÕÐ†Jè+0ü!Th×{õö\Ã¼Á÷{K1ÀÇøËöégÏW›(3SäuÜ¹RPËÿÈgÔ¥UÍÉXTB_˜w–¦wœEý­jpë*¸æ™’;ÚlÄ
‘3îWeägÉ]yž"7²ÌýÈˆAKÊ `¡DO#=^2à"ïiÐõ²8iµÃ`@2zµv¼‚MÜMúR^Éb/ÍZé°y2X¼ÂbrêAáïã_ã˜Ô” 2¹9ßš:8TÄ·¥µx°oª¤×OðWòF1é·Rb3ÔËd‹ZnRÏøl$^í×PÍüUWoÔXWè€¾ïïji~a‚aáðàÌÏÝ!Ü×s.R¡à$ùô\Í^êÐÓ;½!zJ„³¬GÄ6Eõ O/{Å1}à¿:fõúK-å™Qõ,|k¸„NzÅ
ƒ·.þ•ßìó #xÌ”ëpðš16~…Å=oßÇ²r]*Á{ƒ\±¼WL”b“º¯¿¡Z<½x*¡zÌœ¸t“é{Õ8è[Ö¤óc£\áegÚðÀßNü´·¶k"k½á>)dšÕŸ˜]éÖÉÑÏÏÀ¸~3À'§ˆj‡­"’ÛÛ!ÙïŽ†‰ôñë™.XälÔDg’ @˜=&]_µó ô	d 	ñH7¥¸¯i¦Q|Tæ®• €mM nÇ”7@+ÊiL!Q qm—°)èèó¤^|&qV†bb¥qûäè¦¿ =eb<iÜÕ
c¼µ¤¹Îe(+„»‘£´r=iù~”ú‘¯Knžòfò&av£.4”Ê¼hÌÂbsÎÌôã:‹p[$ôçoÑ1®0L9úÅÙÚ¿ffa°ÿ®ßA7ŽòÁ"æó»ð»Æ•Ñ°àoŒ½Fcïy¸Ê)ƒ‰ìû÷ŽÿnñûwöþlTÓ0ºË,{ßÙ“MmÿšQ£Ûùªõ.lúZ)]V~{Õ=KO56˜ÞM-hqOËÏïKê–6y)È¤u±4Íˆ‹•í¸@£ã9{ÄÖÃÄzœÅ‘ÇºpÆƒÊO£²ämg¦CnýšQ#Ëq!v=ç[ å;d5Û·”éPô,YªèÐ2ô‘…Ýµ/³1
I)è¢E16~ÍŠ•Í¸x¢¢ã6DƒæVÃÄjœ9Gº6ƒ‘„ÃN×ÏF¢ôU'j 4}Íh&ÄRL‡¼ó=þ/>{ñ	¸¥ÿ‰ŸñG(ô›ß±E¶å4ÙA^—C/#èYy:ÎÅDþÓ±G'ØûÎ…Úþµ?õ/Y0.Ý­Da ß^ÙBÁÖ³”.Ø`zù"h‘0ò£ü’Ê£Qš‚)r#4–æ¯±JÆiØ2 Ö@gÞFáã‘<Ö… ÷ßßD4"ÝêÙ4ó¨®$÷w2úZ}Ðµ«GæÇGò¯ZÄú¼i¨ò¢ ñ4ƒ!ÆB#n?‹!	_Œîð!ìÈã£
k¼s4—·¯Ïy™›3°büD¢ï{É¹³ˆ²Ó‹	i€W½ã¯Xxl.š,ªùNµ±k3ø°lÎZœfïÅ	Þp|!6Ô_[,ã1t8…oÈÉÉC]úÓ±yZv“ ƒà¶N1€ý½‚Õn—¸}&ÆgƒnÍÛÃô.³0={hžZYæX-T1¾£á`à'm/õhª']Zó0ÙñUËh2áÌÓdáh³GòÐu1½B[9öÊ‹p«äz¢ôoBdå¦|×”¼»ób„*Ù‹Í“£ßÂ}÷ù¾±BÄ’±Pž°È¡!Y57­^óZQYžN$ŽbÃk¹ïíNw#ó0qÄƒê[—É¥}vKÝ—^,J“ž§´i]hõñËÚ\Çx]ržã¬9_bðÄ
Ô_ÿÏÈ”Ñøœ¶üÅ§0‰—~ÓoEQ¶œ½6Ö7WD±ÒHŽ0Žè‘“û3|WÝÃD>ç‡òJ&bdØSºŸ0’½†AJ~¹l¦à¶>£iÀvz;‘k}ôd½µ¸ß÷ÒF€Í8óBXZªÛ¹róibkÚY}Ð ø`ë¥~¥„³ÝÎ,[ÐÍ$š0€ v¼ú›	¬«ŒÎ©7´ª§—wSÛ4½½è:þêoíÃjOýd›[Ý×Ë»½LùšíîÚØö¶ª§Sí,*…‘3Øä›4­Zo(ï/•I! 5>Zñ©±Jè™l¹<{Nr?ClH±°ùÀêGz¦ªBX;{‰qâÞñŸP'¾0¢^µ½ë4Yh™¥¾`UÉsÄøï¥qdÝkŽW^¬äÄ«öùì*²ho£‡óŠ³"ÖO¯¤g•Y¼§~1™ÃA}UhÎØZ¨‘ì ð¢“DjøšÙ>Ô=bhŸ·qµ4i”30¸U´ñŽ¼qª1ó¬Ì0ÊÅ8TÀÈ£»S·)äÖ¯û1Ù\) þÍ9ºðíu£ðô,(ÈPz
úÈâ@AîKê>1
])Lº.dÅØø5£*VÇ‰‹b$Üü&8bòÆWÂè+qæÔFéüü$èw `}É½´+© 4vrËÖ6t9ýìè_›ºû™rŽ_#9Çå„ÔíašÅý&Æ§8·¼ä\ÒÑñùšÉaõ;‹Tä—³Áâ± 0ÆŒ–'G_y¼çÃ‹Oï¦õqøaéŒŸùlÓ>ouTf.H·¤#7Oâ–QÖlÌ|¯©,—%Ñaìô¼€Pˆ4°0`ïµuF‰©$w‰YXñHÞEÒ*è¡¾¦*×Vi.Ýò\áÍ*6YB]¢«[ºvCª{J›cw~FÍ…ÞkÎÎj.­aº*?VŽ<†ŠÅÚubþêÉÛyíòûÞà‘®Ñc¨Sœ×7omQ§Ñ,"/Ú'ô**£ååe¤{wêzQð\çF1<ëzàÒ'{e-î°Zê‡SO€3”A¡M5ÍARg¯•<L$DÕ-œÓ Óá‹šÅ¯èPN—p†ï¸}”Åø"†„äƒx Äý´¡¹³‘©ÔºÔdë'w§¾9Y)4Ï½ãm¥q8ÄÜnèogx>0‘9â-tíâÿLíãævœø]’]›ŒA´À†‡’w*=ä[<¿ñ5hasÏîš¹1;îuè’MÇ5uÛÓÿè«Šz×ÒÕûþþÍx7*úò[øžàî^—Hãë¦çFÿãŠ¶·ñNdv3—)²J‰–äGÖ0é<E9ËAA&'§ZY|/Þõ“5L©Se¦ÿ†°/ÚÆSú”z,©ÞÀœT[~™XoÀ'Ö#_L¸K^¯ôgÓ'³§W£ñä±Îµ•9Qš‡²ñá³Wˆ/ú¾áaÒ©áÚV |‰ÏSÎßVÒU«$ae6*Ö	ˆÓJhNhû¤§É¬­bÂóü±=3"|ød»3Èé1ß£¤Atã—ÆÌ!mbörî^«dH£—ˆ/VÚ‰'‚‰S†^Q¸!xLX!xÊ˜•2¨Â¬Þ 5¥~Úç&îˆÂ¹A'ÂÕ8ÅXx0èÎÄ30](¿tyã—4Y‹_~~	<ªñTf§çP3K¼ˆâó>ùáÜX(ØQ,bú1ÊˆO]|òü?Ú¨üE-žjPÆª8„U–‚y£°Z
Ey˜.Á`¨ðïØx-¢v²ÜfÔ‚63˜KËÖd*D?šëkåà'Õ9üçÐv¡ëÎ	¦½Šƒ"ù”SßîGÐ)áãŽ»È‹3ç`å$¾gŠ°œE {[Õeù1àÖØùö¹«uøvrŸT0í™±h1¥‘æŠ¡¨"qøYômxE¿Þúx*¯•%CßÜ˜5jd."îôG?ª`H¡+ñV<uwø‚®êÈ´ÀC«„cIŸªÔáðEÃ.tÜ¥ÐïiD¹D¡Ò¹VôIý~ (+Ÿ;H>z©
-no\âî2e7Ô€ÛÃ\G%¹iö;RiCÖ‹DÓWëHE®O¯NV	HUë?_ùHËJã;ñ-ÊÀ¦qß¯â•§lw¨š²^'˜ÔÇî3ÄíÚ˜m•9ÔÕ: €6X‹¡½t¹™‡ÎÇ¶ÊHãq-Ñbå-¶‘AÊªªéXñ±×i! Uß\ã½·jÜZã¾³Æzcæ¾:œb¾6ä@ÏXÏ¯Zéä*EA¾ÒªGh9`ï3ÓW˜È;ƒÞñÁÿÅÀˆkFDÔWËxÍT?ë:›bMßm	¾Û„~Ÿì¦“Ëô-ÃËŒ#éŽ¤^ôÎ×ã1^Ö½TtQÐ§ØcS\¸&ˆå^pB3±è}pdár‰46{ÇÏ¢®ÊCp8mñV;ý ‚<ºÉRu¶>#-Jœ«¬é·…ReM¸,Ôüå9;V‘Ú jDè@,ÁO"Dæ‰ÈDÑ‹OITñäÉŽÿ¸`õŸAáâ£_£ï ì›?|ƒ‚B/Ð1VF7äC°€ÂA³¯†GÏ ÛÁ1,…Í/Va"ÎT3À°!€E­5Ê”Ww]0Ä|f9ä˜¾2#”(WJ­Ó†s„wRAjóI˜Ï%'tÚœ[aÜÞaïë/>1iù‹ñ˜¶¿–Rï>žFƒ_ý1/XÞœœz4ó7òw‰KŸjáFïaÞù/0·üU¼o ¨ÛÐ©¢ÉÔÐÀ³©Ô{QF¯=LLûîËü^>÷†}ò³„ëžœ™$éHðmÚ/ù:#Ý5ž¼}€ç{Ø|û ŸÌá‹"Ä¨B³0Õ6›
‰¸Q0©1uZyÄ&W-.€pZ³Ê:pÂ÷6Ð{Ííùç`5I¼ýÖv÷ˆ²ª‹hv^Bï_BA%#†¢&šGßÅ­xT%Š˜ýÄ®‰áPjcö“BÚnöJ…ÀA7J‚j>¶XÁÞÊÍ¬Î
K);rqäpö1#$gHíþbDj7C¨©Ækph6­Ì× èækN+)>¾jÔÒnp¢ÈØÇXØ0éœåq¢5ð:$-Qcî>vsÒ+ˆ×ù”SdY:Áe$áuÿð‰½\YTq(·K¿¸\´zÐÊ!ŠÞ? XæIáÈJnªÞþÈ^®p
ü%šèío´ŸœƒÆ4ñ/;ßEÓ—@uø„¦~«Z¼ã½†o6«Éòœ®=ã¹‚Ýw³fCÅ•åx¦J13…¬vAà½LãE¬î®ˆ‰Žy…»-’‹ª[ÌÃh”õðU¨×ÿ‰•
RO:h7Ñ2öÛšùðIhÓN;Ú‰d8I?.‡xnî>
HÄ‹H7MóÜLIØt?ëµÆDNR­°F·J%'Dˆ•+L·¦>DÆ=L8Ó8iFqÖôÂ0ÞÅ@¥±žø§ÈäCòlpÉ…>µD'AC­}à;2áƒQlDÌ9õPÇ"Ö4ª Y/Èçn˜TJyB·<ÈŽ–uŸj-MkUðºó Ç„^¤ÆÏÞ^*H­™sÜ}ÒÌ­)VªßÈµÚÇh™é“	:e¾¹åÚ›«nŸ¸¥éRÙ”þúÌ‡òá•|”.Wx(™°€Ø¯^|¦?‘§Ì¬8^EBœÞÄÊZžú7ê’ƒ×'Y ä€¾"û‘ŸÛß/âºô*"0j‰¿ä«}Ë­x·Â‚uNÈLær¦¸|†±€ôA§¶T3Ä]¥$œT½“^çyS¾Mªe^µä´zñMº<ö_G=!ö³ÕB­“ç¿ÏÐÖðäèçí)s¢+á¬ÔÈsuK}ïÔöZÇ9Çö0]ä/~ù[‚8ËíËkQbXêÛm?œCÔ¼.æ{ôÄ\Eàu‘•« +Ú”\, ¾œ„ÅaH//AòL‚ìW; 8‡ÙÓæNö†¦Ü,ë†ÚŸoUMü¼JC7Â œšÂæ_|*’•u¹àPÉ·J›}ÊÐy[¼üfV,)$…qï¹%ºs	:”ªIóM‹“}óbSü<÷çGÐ«ôté?©†F›Jõ‡[hÑªo,ðvÃsïI¥SIÓEÜÓ¶
÷´h†bƒžÑtG“à~¿£“!ü²àmÀ[ÞçÓ{©p°}­Fú»šºs“Ð¸Ã”™lÂ½^Eû|·è3K†QrÃ¯ðõ[yÈæÝQFoñ¥.JU-}L‹'NºÓT@ç’-Ž[ÄW‘¬…¿ös5ÅhëæÇæJq FaP¦‹àŒÝÏš³”‚Êj&ž¢Ú”Jf¸Š">OOONYuÔ'õˆôA¼5Û^èçÆ‰CDôºp5)£ÝEOÒzlJÉ­ÊÝô*‚öle*åNøØeO‰ÛäCø8Iž«õú´4O­5¡Xb½q†¦¤¡‰!¿¬Gcdù>÷ô"ã©¥Y
óÉ´µ3”láÃ©tò-|TwU÷¶SYë!¼1>§¨ö"°•‡S1{Î"±^:;ïlÕL4æ'£Ç|â9	™ÏC@¾tš‰r¤‚áôuÇ
ÂÆÆ.Bó™d§¬J2§JÄüíÄO{k».	o‹$ò“£ß£TÏ]–çR‘“²<#™ ·0t(ß	õÍŠD–ÔÓâJ™Æ2…œªÒãù2¶4AMöÊôä9HÑ¼>èäù—üô7;XÔŽ ` ‰¹™¹«Í™+ A‚~Ùó¯P~KÓ	8wm81×.#	ÖzÅr.ãîÉÑWp9ë²îæ(y–™wÙIFoBÐîöI)ÒJRFÛ¹Q2SÛš„LMV2*!ãc*õ}*U{/ý‡IcGÄÆŸ“gZD¶VUða2`ûM„¶ñ¼Ñ­½¶N¯m|”ç*‰‡D;èvCážQHÑ'äß¿Ã˜J("¿¨³Ïˆ™³üW]²^V»º@úL>…‹<Ÿž—}oÊ(óÊÐ3›¿Æï#O`ªx™]ƒ±èv‘êŸ<ÿíPïŒ¡öš‡u–!dgKþ¨öÒ·ÂN~‰w•DîºÛ‘Š¼/>;~Ž[šf£çrt>~HNµR¥ÒÈ„±×É#†ûƒhä
	rô {WuÐËÍñÔ¾L5À!s¿Ku	¬–òi‰§ý
I0ÔO0ÏCj¸’Mƒì²
p´w“
2ñù&–ÉQÇßö†!õjÆè7jBœÄÈëª%o¥÷‚T ¢DaœÕszc"Ô`ÙVt´ã@ÓßÒæÕ#ƒäNÞOTpÎ=²ãe^óQšá1—=’túñb±º‡2ÝÖµ±m$#Û›¸Sf±ïtM#L)5’ 7ð“ðå†Î= ÿUáï‡zP¡1å':În&kÉHŠ#!ü¥´ú•ú N{”àÇ RØ ‡:„p°„o„¾òÔ´ÑÚÓ½K¨ÕNŸŽ¢zEÂlp
,…¥¡‰×nûL®av—èLá_c{YÇ*pzøä©<M_â8èjå+óZÄäJ#P^”~+ÐÝ²NÞÁˆ}…þE]µÉ_{ùoù‰$t“üÂºš¡ßŠ3_ÄÌ#´5á”opw½˜¤Æ"®¥ÜÕ@“dˆQ~˜„urIJâ Â,}³¼mÁìcf½Ø×2—-MŒMY€¼(èÃþ¥ƒ ’“ÙòùÕNDáîNIš!zÁªÉWÂ(DMŸ§N¡RöÆ‘Á{ŠTÑ&-–|ú%³|WQ?I/ÞË²Aº8=Ý‰Ûi«K&ØjÇýét@Q˜j:Ý™ÖW2Ì?LN=	Èòð±ª—ƒñ†ð®{êÅQÒsTRKRÆœ£·-Žgç…›à½$îdÌoÛî U?úzËÌ"h8®HDµO‘JŒ±Å{XîäXáÒdcØLÙkºn$yT¼àIá¾Ñ„ª\Ð¦“%;¦•=Ê§õr$Ö¥€ô‘»³_…ž°Û‹ÓL¯%4h—r%¡ÀD•Û™	Èf¿òâÓã¯!lùlJZ‘Ú—õôj.Õ«ô-/L§V£Í4jmæ=ÿú¨Óò½ªº4æ„¯jÒÈƒsÑ£‘‘Æ¢Ec‹yUuh@\5h…DÖŸa¢­äîìÕÔôùæl¬°y£7{£7“ÞŒðrµµf´$ãk¤3Ë¯™²}ª'èËrÎbÚ2ZlVÒ•‘_}MYtúFOæÖúžìLôdm|œFÓ’­qo¾n:2BdFÔ
ôcnàÁ!ê|4cÅZ^)½˜í"•Å‰ÆÆl¨ù]†™™”íXQb-öªŸ‘$c€=#I!>æÄa3R{yÊC0aþ¹sü†ŸÑ'nŠ1åçX| Ë:’;F®õ<’—ûP6nGâÞèQWÇ0 íË	[‰\€ñÏ´÷žßŸbr8_*œkÚæQ¥eÀÎ`ìúQñÇšYbÈ¯Œs LÙwÐ½oþ0DÇZD› ´›EíãMRûª3ÇÔAâHùÇÈ*Œ/L~°ÕV»wüUÔC{šŠêXÏV+l(Œ~ñ:á[ÛÛA;ð£ö>­lîTÒ¼|É¡¬¹¶ñyi‡‰&4·Cé—Ü£Èôñ#Û©Ü¹…(yJH§óV=Ô‰=ü/D*ç%nr“§e(ás]-ŠšäX_,â.õ1cÓÞ‚Î™øÞºùk@yùjã“c,àmà©4‘`:õÂgœ^äï–`ÚðB_# ªAAëÊ[U¼^U‚‰€s“ 	¹k|´~Ó˜ŠÇ
åhŽ!¼Q€Ùÿ©i™Û
°±%À•ù ÿ²5Ý%y kÃòT”º2#‡Ž\…Ÿ¿2ÊŠ?tðÝZN¢¡9ìAçR[ú­Ø¸róf=oŸ%i;‡«ä¦ú˜]¯¼Lh;çëÄÒ¼æ…2¾X¤Ä·æëPO÷jè'ä¯KìŽ±ÑJ8ÒÞñ×ÞèæEyüŠð#Œ‹èá¯I–F£¼†Š}ØŒéÎ˜/0mãâÒº®]ÞéBNCÌxV‡cz%-¾2žœb™ÙÏ¤	4tàä< Èqöâ[‡‡+2¶…`¾<¡psCp¦–æõ(Ä9gõ¡xzßáÀ’°@b~Ü”éFÛìUÀòG}<,	ÈÝ›ˆËÈÂH‚\Zºœ}o¡;¼$M‚ñ@Kz%Us&{šVC&	7ˆÄÝfð0ki1x‰@©ýÍ3àµþÙ,Ž“‡¾ZðÐWyhUo<~°±’ê‡zgÍ,Ž<Bè*ZeE?á”fÒªS6k“=òMÁT§’Àt¿Ü7©kiqíÚÛ<1_ÉÁYÔ¥šÄ|Ê{.ºh­â¶ìJ;º.›€Y¹,8x@@õ‚ñQ?ˆ€
ÏR*¬ŠªÁ.“«±GQb»ìN-gîuuò$TËé©&U¾I…¬WÖTê=§Ê#^Â1bÊ»B·Ú.tªõõ§²>TÑ„ºd5æ
ª4˜*ôPGuäü*ÌCGŸžjVkûÔï–É@HkÅÔd›ÉU,¬$JÏmøemMeY|úr|Ý¡>†™è„8ÎŒ±OÍ…zEº¯Ž—öüŽQŽ×=“DA\ÍDžºZ ·õGR¶±Ë‡uÒFä'ápräk~fúrÑ*ÿ‘óY\ÑQ@b—™<|¢Äí/6Á¤paÞ*z'ž`ŽiÚå‰’6‡ð¤Ó´Ó»’”PU©W%®ÐaÀ„„Rúíeýð½8q›6q²g
œ4ø\íTÆèŠ³0ò¨å&i¹“'ò²ÔÃgìU[Òp§ÌÏ@&Y”86£\3JŸÆ”2‹!Àá/ïÿBH "üãØ¤ˆŸB2;Ì#Ìðg–ü	ZI“å.œÒà/®x/xÁ`f4Ë4|RÍ"E>’S|]Ë9›-’ýÎŒ2b"Aiµö KýeÄ¬\mÎAÈx“‡&K¡Ù¿˜ó/Ç²Õ?àÍÀ×6àoÀzº¢.!{D„‚¿Ü«2,M‡*W_é7k€$ö 9_mÄVïüÞW‰©0<k¦G3­9¿ÿØYégWû~š,;¯ üýãß!ÏÎ¯†
t{W\=Ùµ3Ò±ƒ³¢ÝýªäyN9Ã‰Ñ˜ÛÆÌi&Ùm9³+Ê }Ì_Qï³ÀPÖcô«šB6…ŸèVôEVü4 Ò×Õ1\´
áL±¡`Ï7‚2³áÀ$_rí&ÞÀš¿Ü†jñ4çÝ1/Ò½TŒFÄ~.C  °1.`T!tƒç%%ÍcŸÞeçeC]îzµPU¶,_Â”Üq"ég/ªyN¶Ï€˜¾#+TËX"|ÔJgšÏ”ÆÇÏ²¥÷¢–•¨aËN¼’UÌ×óc× |˜‡Ý-éU*SACž8ù¹68Ç ýRíJR›QÀ,6òÒ!28I"±JV³ˆÇ^Tà_#fªocÑSÒ¾9YÉ*}¨lö¸—À‘
¼§îi'f-Ö°Âš¥¶ªgÄºº@( +»°ð´÷_+3k¥M*ôK‚.§\1Û¿DAÅ-àÐÙý¤¦÷Ç˜ÜM¼Þ½¬™ÅM,['q¿T¯àŸÊhW”du£B+U}¾]ëm¯Š½s\Ê¶«3êÁÌ}•óöW™LÏÆæÈ£7ð9_¦ëÄ3]² ²Éˆˆ¯¹Ü“AfnÃeuÄ2ZÃã;èfyÛÔëN¼Ló5-“Â**êŒH	¶y	†9#ë—°I®¨ãÀþÐ7’\µLÄÚq&ÄÂXDäœÈ_RòYƒ°,¬›úNŽ–µ[|7Œr¶Ë])š'-öIBf‰€]V)HÆ~Óf1jã'¸Äa¸åÉªq ˆàWžþ.ÚöûFìñGõƒsJW(dk(ŒÉ×¸ð€óJÔXJíª5¾œùÏ›©­8Q#È„~Ö²¢•JýDIŸ‹jø4‚úó £âñ×}K–w7"YB®^ýŒ¾ÀØŠªô(MÜ$¶Í~Cô \ÉM©‹¥ÌÔBâ’dàÕ-õ=nx®¯aµY`ægÔ´‘J¶HU;EäŠš°&Ý(xfRî 5e©Ôù)X¸~Vº9Q¿¯5¹lÑŒ8SünÔÁTD ¨\¼ùš¦t¶PÅYW9›+·k˜Œ~!Å:,>fÐŒÍXIb¨C"ÜÑè¼©©+tülÀäÇÓR³sRìG&¤gH¢»>D}•ïÑÕuZÖÍds”Sa…½Qù:Ò¯#ò³7|è'AÜièp¹OëbÛÎù8
—ë1™T4ð³$h•¯Â$8¨‡!Ï{ñõJv¾4l“JæF“B)Ë0v~3š#ž2‰LI`*MY6CkëÁÐ1]Â|
òòx[ÃÐKšÑ°¯/É†÷ŒÆèéz‹­‚23¥–®zñ™‹\ÍJ¯Ü‚jìŸ ©&˜ŽÂnÖÚ@f–ÑÞkÄo*¯À†å/,7-ë	BÐ„~ŸXè›¯µÞ7ðPrüï“Š×ÛåQºú6íîfìms)T¬¹³å=TÖèR€]52'új'>~­³š˜zÛþ{$ÔGKù‹¶—Ðd§3}ÿþô>þ ;wûýÉ)vË‘›AÙ½¶[{Èù¼_—ìÊ´–SúVmgü–œ¯·B?êRVcæ)H±Sâ«ªÍpôÊ‚«yc¸ÕdEJÑÆ–¼T$~
ÊGù¾Ö#e:ÜâR¯&‰·ß
Rò_-b–í§à{“R+hF'V¨J<0º»V^Õ…YÝ‰Ã¨¯®$½h±W­#WÖl0ûo›Øç‡©R%˜‹äwÈküâS©Æ.+òó”xvRÿ{¦|hhE(e….¦´(n<„v)<¹;«9Í“£ŸEÝEÇ3Ã£_‡#éÄ_± ÖÜGì[ßåD]#Iår|Ëæ 6-8ªv±ïü}yÑþ%”Þíì-"¤«w¢Z¿¶ÚÏÐ2b€ÆßÀÊÑNü»Yœy¡ðvÕ6Ùz´¡£¢O *ø"m°	NO¦Ð;C¶ü½`Ïï4fÉE93©ïÜP‡YØâù VŽ<O à¡H¹à¦¬NŒ©–UÎÙKJqbÂùb:5˜¦÷ê’¥¢ù8kà…RQ6K"¶ð†iÉšæßoõ½€øöOnr$¼æÌZ½üs v‚ow!sñõÃ)6¤99Y¿ƒF‘º ƒÝdÔ2^U´Œ³¢Ç‚u:øXþ7ûœmz¼‰1Ãë(Îˆ~Ð)h¡tl˜X¹uèzÇÏË~ˆ_¤Ö¤eÉ3[Ô’l	Žî5__	Úò"Åó¦qù‡nâ®Âì¦´lz&™|wèÇòvÅf™v
¡=Ù\‘b­z¢°îU_Ùùç€RlÇ¹\´ XbK`§»u>È®[Uf]ðCØú>ÐŒJ³[ée;È4îZã`iÝD¤R«aˆSLj²¹Kk¤JýÈLî:Ëì,niáæÁ‚™·aàTnV/®Uª‡e
ÃôÃ'Ï?@{x‚ƒEtŸ$N‚i}™!lÍ|ÛY#td­¬°^#?ð—.4ÁŒbE(Ó–I¿X^±ïEÂJú5ô·3*®Ñï»ÄýŽ})þ&û¸ŠVŠ/	¿1ÕJ|Ì¥ðáX1%˜]:{Õ\jæ(‹‰YD-DšÐ½Ò{xÊ)ð˜¸%Z^^F3ööw#Ì´y!~¿7ûgªY>ÓÓè¦ÏFN?dW« â>H-ÑîÖÖ¾ú{‡² Ë€à–àà9Þµ;'Gÿ{ýÚ89úÝêä%CkÂrÒÀ©<·ª”ú[Ìømì(ÀkX$¤nNÛâPÍ`5JXâ3I¶½ÅÀàœ|pëöÝÍ[&õ×ÜZÝ¼59eˆØJÀá‹ÿ­ßFïÿº±ºÂòóÿûÐ¸n„œk  ]zWëRhé“BóÃp˜®I;ô@=D~ˆ‰4ÀV…×êÍÿþpcsŒðZ½yÿ.€éîÉÑ"†vnð“AX"ûÊA‹ýâ¬®¢tŒºëÁí[ß_½yÓ€y9b’&gƒ'G6âoÓèöÉÑ?~èÖö¾@%_8’ï®Ø7Fh>üð&>§ßßü`sõÞ¡µvòüw¢õ;ø?› úûõÛn@ªáöQ	ª"àoìØ·öÁúÆ÷îÞ/‰#¸„ÖŽ²É‡~¹Žnß¹K´‚ÿx×xÜvìè7tôÈÝ²û~Ò»Þ
¢v8ìøicòîý?x€ÉÜø€FpìCÀ±ß [ß[»uÊ;·nmº,ó½°€ùÂŒ|w—nYlzÆ„r4«wÛ€<lZ0°™¥YóÂöØ=Ä4y`{ÛOü¨MöÇ0{1Åf¶†¼w¿–«%Ñð!°Vð3ã@÷¾Mü³ÓÜÄ}½ê¨·ð5ë6f¶:À(Ú‚D/´µàK1ÏR£)ôÊ:…>§0Çik‚§hÐv*¨›®RÈ*kb-ðxÚÅ¥…lRõ¨ÚÊv@Œ.G4Œ¡¬¿X…ë²½NÇ×.|”ùr™Æ×#¸³z8tÂ…@5›Öð-A¡èÄªùN”‘/„5"–Í¡,†äÒ|±!¼Là[$h”7‘Ùöš³ÓsÕµ¤¬o›©'*E+Hà \­ÄS´WèŠ+™æràÍ—1m4Ž¡ÉÐ`Ø.qfë‘Ð@ö n²|HAž^¢ô!o€9ß»ÙCÐ8+¾nÖ\i	ÔV]š¡ úôµ.N‚lË¬²;Öî…<Äô%{g¿Ë…S‘yŒ¼·¤ˆž—t‹±œ1¹ƒ±ÇVSe@qsè®TN»"®i¼YˆÁF¨M%:¶èhÍ³XËÊ©!ô_Jˆ]îdp\ïÁ­©I7™/iŸ(žÛ![Ò±9q“>áZeÂÈ„Ï¼J:Vi9!½ê¼vùxHÎo—³o•@Î-]NøMhõäÜ–\ip©°qUhy%weƒ¾·j[(;’á«>Í¼þ “bÙ²$µÐÙ–ÓÔæýÅ¯¹ÊŒZuI•Œ8A¤ÈD=KË@UZÆmîæÎG&žR?»Í«¯J\’…<V²G’Yœ¢ÃÉ8`Ûï€çÖrþ·Òbþpr
¤Šd5ko‡‡`œYó@^MD*Ï‚9jQjUmGr(ª†Ø"%°è 2YxñB°ü¿´™7vÅ‘ Ë·Ú^5c.Õ¤t$S´:˜)qøÇNW6q£LTÛ,¸Õº”‚òUÜ©.‘/'šg}r¤§Tè’{ÙÖPMè\“ppc.¥Y	£Ì¬â‡óÌzÇ¿é/æ¹}íI’K\ýîI´6ûÚéK`h—ëàùS	é®æT»–dÎºõ3D}`WJoC­REQ„Ôò<g¸Íò¸n@C ²«Wëx°rûäèç#Êá0Ô1Šï>(;k°‡e,w™¼šúÀ2‡WæÇ:+(ê÷'ªOƒ¥Î×ÍM†³ýAÑi‚HÜ¸&t²¢ÊÙ9¢ÄX®gAÇKEÖ|](JUøvLpœvÞñ®¢‰°te\ñ\Ò‚ÆIdêbBu5MþÃñÔÇdÚÛÎ*•=ìÝ†ÞL@ÂhÎKÅ>åÌ;žGá6Nò[IÏŽçs^u•:ú|¹Ž~9JÃ jf=Ì<v{F®[tQvJ>¤ZÛÓõëHÆ+üÓˆÇ”-±@V“$Þ}@¢ÎUÍ”ìí¢¨býÖv­Ké§Æ +)`\žLþ'þ,ž'ì$k¶HÎ\ä‚X<ÉÊE%jÉÆ@öÊjM?ÜtÁ¿Ðù½ÜÞPÓ7ªÎ ‹üä–êM.Ÿ^§¥#ùÂMŒ|¯;+Ñâ e7AÄ“v:ÿHûv=ùîÛÜºƒñÏüIe£ê»—~õ·ôS©Ñ =:2Ù[÷!Y‘²)zïcÚÍˆk!Ð'8»lA
›ü@…BþùTk;ñÍÚh<ÚyL\ZwÈ¹Ÿ¤`žœªˆ—ÔBV¢däÎÖW: i‘J=Š#A>8Ý¢ˆ/ï#ÜK¨ã‡™÷x=J	]‚ˆ´Ç—Pû®ÕÉWýPÒ),<,`‹—ò~éW¬~=ò‡äÛÀG–äMÉHjY‹;Žüaé‹ðûy–§/CÚVZ$O
Uãm.ö‘W‹&˜™ú$"E“kôöÔOYÆ¹aòF;S*½³…úaJt»ËÜÆRÄ!ÙÈ_®ýUøm¨ŸÒ“£-‡÷|ýÍµÃfY4 -#—aNñu$7üÖaMVY;ˆ…]Æã0’OŽ.aoI¸^BòÓNN9…êIã›¸Ó9â”1—e1wÕˆêâ€¯<Ýâj°†Ø#õ£‹Fyäq¬}¸ø^Zi!`×kBÛVG Jw!äSF,3hî®
Î-ÆðëÂiŠÔJŸJ1ýiæ%™cì,b¨C¿¡Ü ?š¥=Œ¦;M—“àh¶3ž‘‰•{Pé"æËÓæDFÜ’ó°=ÙY8@¥uˆJuB¤<~µN i?+• ö ×
`p1°ål.$DôÌ¢!õz@GÀ‚X JÔÏ°lèy0"_ñIã'Ö rÊH³"AU³¨Œ#ä”†/ËíFÇŸï;®_Šç4äFç1%G'u|LåÊ˜T+Ó¨›RuØ”v˜™£MsÍ›:ül‰Í,8jT§iõ–Îs™ër—+9¼+R–ö”š `G…ÔåÒ<Î&9Ø :‡Ùò6‰L«³™Ã;ü+iÍ-Í¹9»ä7¿"ä7Ÿ¿Ðüæ…ªR•cùËÉ»­å„íI½Ý3åFÔTçy¢J}èõ?EÞ£¨pîFå¡€Ú+P=xëø™À*ð&N÷|0Œ €¥À9b½µ©=\¼]¡4&âôx’æŽÓë]Ñåñ%ûQéæª:¦äNü´­›¿I¦\­Ölë5áÆH f>RM‹4ø!9ÖÖ:¯}/ÙYÃb>éjŠûŽŽ/©NšUäW-Ãóxdúƒ•ÜÃL8ïrüa×’†@™’>/AÏoïì9«vüŒûrå‰¿`É¿„´òÏ¿Ð%}UØ*ž–^¿¯ËÁŸX!CBÊš“Ë¯Û‚gDQA¦{rôT=yþŸIÁÑêÝÆÌb;½€Õ-ƒCån¡\|ïÝ"Úô¶T…¬»si|B—¶ô‡CåjÓ™à‰4&½0Ô%wá¬.íHGÄ& L+T*š‘VsÄˆ±æ„N“	s¤n0O-»ŽÊœÌ×Dßî"ðCwîÁžQ¦‡ÔÚ24ùiÎ‘SíY¦z67‹“…ý}™[)2ÕÉé<–¦·ôÅ˜GÞ}J‚ÏL#"[‚7
Zü
 åFÖ¸x|l‡$ö•îlQ†lNSrU¶»j÷Êº[lgh)º9~g&ìã#<ÒŒ2eJ+¬ål´ÌŒ¼^fÜ‡¯¿ÿ}ffI_	ÌÏ×rÜä„Z/÷+Š˜°ô¢Çÿˆ23F&Ë5ú©sý2j@6¾ë-¿ˆp˜¤^»yXC+K‚~C«¤¢]%~;¤¸«GZµZ-H¼LÒÛ~°MUÿi#j‘× V:¥?—¦‰ÿ4ˆ‡˜ëí) Lí2âÓG ê2«>Ö-–·èjË”à×fÖâ!IÚ:.¤™@ÄzÈ¬vFÈÌXŒQüzúXú½¤j<ÿ•ôAPiè¢ì§ê±c)ÜÄCª,Ü”kO01W}Ó­©|L‡)·¬ÃÉõ;÷’«þáÎÏ£—wa8xÞ0Íå9¶@œÄ/çý(¸®¾		,×èT~xÞ¢»w Ü=rö-¡Aå±y“mªOøÏ9'iÈ³%TºõB´
ªÏ\CÚ”_Ø[Y2ôåæ‡SJV@~þìçúx’O‡õ?ágvÎfù±UF×u¸ýõàÁ0dp¸»â·Ùß#Ù\YUŸ’ÐQ£]Öbl³%ß”|ˆ6÷}ª¾¡j•R“›AÛÊsn†ØE’ÉD¤W‚ñÓl‘ô¥é-«Ö“•q:¨¢ÆBËXIÃ(gL±43ÜÎñf#0!ÙÔNkN·tr7 Ã5d¸	ØŒ¬‘íU×«ÈÖ‡ý2Ò\E9 ÖèñAæ©$ÀŒ\œŒáN*>l~¦Jy8Æ{CžƒöÆŸœáèâ&ý$_c†í‚ôxâà‹ï`5»Žçit~Öe®ñöJCŸ†[×Ó"’û€qïa¤&o5Sƒ:ÚCcJ?CÇêdªÇ2,“ØNŽ~ë¡½Ü×ÌðïÐYgA{’zÍp¼èã2˜…<Öu^Åh!@œ.éÖvä ØÏ„[þ$MÎcšËä!Ë$³ç?§3'ÖRÊ\sF¥ÜŒ«”¦/?¼šG1q3…N¥žgZ§êÖ‡ÈûR¼àtù’ÔÂ¿ÎÝ‘×¡èss·i‹l—Óh™>˜a»¥çy«y%W˜{ßå•ªm¾Ô§øŠ2y¸KÁ©òÅ¨ªrl5:y°ËõRý;+ºsåpŽi’‹€‰&™ÕÄôsÐ)ÃI–6?‚„"g\ÔI—fkïLFð{a†½»ôçøÜú™¡ój78WÔ)ƒRÐÎ€Á†\b#VW±gäw.Ïí[Î¨¥–‰n¨ˆX8m:¡b„¼L±K Ë(¹Ì¬Ì¸À->ƒÙ•VfÒ:Æ’–«Âùú úÿ   ÿÿì}mo[WšØ÷üŠ!;"’z³lG±åÚ²{2±âI«
ñy%rMò2¼—–4LÑÓnÐí¢@1ÙÁt;³;ÝÙæCÑ‹~P:ÿÃûKzžóþzÏ¹%Û°EÞ{ÞÏsžó¼?¤Kš%ö‚×-6øñÊÌ+G¦q)Ëæ¡ý/xc# W]¾;Âò”êWˆ¹Åe,#§sbÖÍ²Ü×m®¢£æªFKh““ao Çq4P¯ƒ>¹LY‚ÔUƒ4s?§‚[ôâ!BVåÃÉa(ìÿ4Ï“C‚^ŸhT\{öŽ‹§\ÂDª‘N«ÔÝ²ÔT<ÆÜ÷v¶¼'ˆÐ«ô:fä:þqž2®ÐŸ»Ýý”MC‰±•Fø°ƒ?É'˜WóúÌ!N¨ÎjÝ4Õt&S];ËŸ?^l€+¶¡ÆA¯³B2°^Xª­­ÉbˆŸ¸™Ï cÖü" ¸=epýqbeü¼Fó\0˜ëà(…®´Agàh3þ±ãZRÚÒmÅ2è”2<
Ëàj®IvÄÁ¬ÀÛ’nÊù#wcàm}JüÚ›ÖËIÑm%û9-…‹•£Úòó^ML;‡°µ’=ñü÷IõmÅ[s¤AÇ‡B¿¹Q}6[È2µJè&hSŠJ¨ß‰ð1Ë‘}Që,Ž´ò›kóOØl›ÊÌ·ùÇ0·cn¡å§†Ü5.•+%·ªÀÄú²mÎí¶ùn^³í»ý³)åÓ]ÝäŒ›+Ü¢û×~ë}ÖŒÇ‚›üç>°¯÷á-ÞUcOKCÅ ƒËzùæ—¹)œ‡˜cU 8’ÏRbá7&ª£t¼XZGØhpêyÏ7ô(íãiçþÔ*×*á]I‹4‡òø­½+k§È’¼hå“vó µ'¸Ú]œð‹!*HäëR.àIIëSÿIŒ;‡Þ¼³šàXŠ*Ä’ëãÞ‰éò¬ÁÏÓªüõâý²Cè½¢UÀÆ“i]¥\ÉƒsÖÍ‹ÅvP£bh“™Ð.ž
n›qZ~Ý]³Ì°^UØëÝ—ø^½…½¹\8ƒ(gjöî`ø™Ñ…/Óû¾lŸOú›ý!‘‰ðyDAîH •,ÏOÛ÷jÑJ´Ž×ëÓYÐáéðødîžï¯?;ÚCƒsÿ¼Þ²oO¾À»k« –ì(³¡0sf¦;TÑÅE½!:H:äïO³l ;,I&‰RêÓ		U®«ÕBßge\—­òÎi&ÖåQ‘y‹œB=¹*	–vÔÌ0\"H2ÃXFïY)rö@²È‚ƒ9UüãE°iZ“Éy–V–u‰ZpæUü§€?˜`·Y›‡õv¹Ÿ`oºLóA§«àŠÿ#föÁÐª9Ø‡?¤SgŸ!„½ÕÅ&ýãHC¬Å{ÜqÉþp©:Mi‚`NŸþÒaŠWåÊ²iŠ&ü5BJF¿À‡ÙÔyh†¡iTWêfh[2ƒò—"{îC^eøÖe¾‚¸Ä¨{ö{çÅZâ®J
Ø’Vº$×eòpeg<	¦óBH`>ŽÓŽg¹>ì}= 
¢ Ù &tN„Ç¢ë7zfôô‘ZwØE,Áÿ³œ^ç¼]I¢=îÒ®3àÒÅè$ÜŽ@­ÒWkËHx»X
D&Ëíóv6a›º;?€xñí×çÒxu¯ôÔŽ’ñsèÞ’ð_eŽ±Yâ]B
ÛÕÿº0V¹Ê]®-C@…=g³ñÃq¯ƒà?¸s¼Œ WÜÙºw[­–óFl Ç¶ŽÛP`ÚKBai.é–€(™ôpi°2®rÉì®^—D„iÞCYFTô!£´—ã±Mrj¾Úãâí¤¿¨\ã”ç1R"½4ïu¥}´â¾ê}k¾üðMäÞƒØý»èiƒäÂsXQmb"×UÊx]´’x+^•­'ÇÒ~ƒ·%·)yÔ…p‚¤´§T„Š±|™ÆÝu;þ–ÓÄCqÜŽ„‚ê.Ëä7–ºë¾ã”HÜÞ)¤´¶²‡>‰7õì@ü„U øýº¡µ«"“ÅÈŒðáa·wö»^êÏ9<¤öëòV¦ŠMlç²Ð÷ªW‰ÇC$	 $½!U'ÿã¿ø+6ÍáïRð¤‘ˆM4ëkW"‘qÐ|I[(–ëÏ ëe°kN-°	Á¢…ŸfCIÐ÷‚w†8Cá^¶‡½a¯8>þñßü7hÚ*Ø*²û=LÏÖVêÓ?›UÁï†"3Ô·O~R›Ùyñü£>&Žõˆ>ç´3p¿Œ¼@¢e-`bj7 ˆKÌ}€€ÎPŽ[WwãóÜë¿Oõ|#×ÝÙ}>ðô-² ±Ìc†.”@è>¡çêå¨¢â1½Ö~‡²mH%¿ô-ék/±Ò<‘s¿ÚYþ'½[[Ý³ßá{°Uµ³·aé1hr¸àOìÒ5u—ÓíØCkÖa³ ¢¦þ£ŠšH„Yï‘Y¸÷UÝ¾õ´æ”+P/SP’—ñæÜÕ«KwÒŒ¬‰ÁUSñ"øJºP¦G¯[ÔÕÿ.ÒU¢ðQc4k¬k*ÀüU~ÖzÃa‰äæý7—VÚ^^K¨ràè®Ù
–~‰Ýº•YØ|.žˆÚ‚$CTdøæhÖ¼];ï>ÌRD5Ç¹töU¢KqY'K&
ò¿¯Iä³ç?Ÿ á‹oÿ~À‰ùÌ× =ëfPå·#ú8ÿ±Îê9„EjXX¿Ö1¨f´C¥Er‹¶U™aý¡!sØÞØêgNSÂµo©1ëúgß¶Ñ©ð“ù}v¨)ÍR–Äyµ•ðqi]:3®st4¡Ì…Y€?]•[õ¾nü"N
e~•ó£^ÀìôËoÒËÁ†%Ä²b#‡…i¾¿^r•r»Sc
. ýS¤ÌuA YùW†^Ô§«÷S1”¢ªZT<•è¥’b‹D`ìžý-F
k£"%‚ŸÉsb8Ã«!u•«¢ tÌë´}!ý§©>‹>T(ÏxÊ]ÂE‡2Ô‰+R¯¾F'§ØžX ¬ø›¯BEáåT3<J‹\ÊõA][–Jqnç¡jŒ»ö ëê€Í9¬a+jàa|ë)CÐ1³0U­¯¢›@‹ö•vâQ<£V×m¥ésÈ»
„[èñ
ëø˜]E†ì^ƒFGæ‡•eÍO—+¢ÍÃH½…[áS¸7AÉÉ-*æ‚ošÊ]ˆ>—Öç¦Ü§}6™nƒ sâ+ ‘=ù
üD×¼äÜüµòq­–{&øEò$Bµ¡((£T?NöÓ¾}
ä”¹<œ*Cû(<Ôžv4IG•5î–¸|Á§QüÉÈ]ádR…ÇÈ)åB™¥î8Í»øäOÿ¬L%ë5™ëG“Â-™+NF ®I›ò 7¼¹°îsbÆWãÍ…÷×=oó"áÊnÃgI‚ïfÏLU2q£×RNÆÝqÖ¯’qžn‹ZÊâ´HuK­)9°]5ÝŒÊãõQ‚Á+Á‹F|¢ðfê1%1©§DIý¢ñxŽþÝG»\ À
Â¨LËºsÎßE)W :|ñíß!e¾»<YehºõŸÜþôáöÃy*"šs[ÌÚ‚z<N†=Œ ˆ}¥þªMrp´œÐë7Ã¨~WH=°ÿ¦à:ÍsÝ3_t„Ú×D©ŠW¹)˜µÌ·+|Q@#3]‰§Z}®×…¥[ŸéªØbÒç—Wøƒ ËbÅ{—Äßöd+^Vs»/ønV¾-_È]Á j~7ÅÓ³ß·»¨›á#Q€Zý[8(g³W~ql}º½³½uûc~sÔãÏÿ¾eàQFìTP^õ–p>p%†r•…ªq¦(/Åúþ˜2$ÍPÇi<©î¥!è±c8Ý³JƒDÃÇ%sK¼’1ÄÜyñü? /'‰c³|n%«[¶jÞ Û•—Ót™¹Âí.·Þ¿¾‡¤š%ÿ(M¹Ræ×Ø·S‘î¬´¨òüª°Êõ—D)p»m9œ–\Ûÿñÿ0A?@g?1SÝh8ðÍÕA9£VÏdúÖ[Kï¾û§Ñv:* Ó¥“H/x}oØNFùLŽW)UÊ£"ÙG¸uŒ2“a}¶WöŽ1Ü `D§åà-F¹ü•^§ýäc³w—Þ¢!Û~ôñÝ/ìaÜ„Tší¢5HY­v
ç —ßîà;µ¿<šàÄ¯YþàF@†ÑNƒ„êkìÃ$Tä^ƒ§1æ?Ñ#rÐ&ýÛÖchãA2‚„ËSÑŠ|€Ç¥k/üê’ñÓDuÄÁ®ðÅÛé§÷{ø~-²qzo<ÎððôŠÛ°82Ïm¼c¨®§Aû¯¢<”ŽCZMw	Ü+¢UhëÑã0._NÒ±šoMõ ¡t#wåš>ÂW|»Û >úÃ=D)‚þ3­-ÒsÅb÷¥ûxÿÚiÇ¬BkÜe¯kv7kËËJ;Ê8ÈòÓ ¯Æ`”7úˆHgcÌùÒÙœö.¶AXPgkòElS[øýa6>q6§¿t6)ÛÄÄXQÉAï´òHüTëÝ8“æ–üÔÁMÜÏ7Ðb’·ÑÏÐ"¾EÈ—!ÐƒÓÍ«²È#O-6ìjSu("a ÑQéO¹* |š¿ó›ôEÝà+'×Âí;üýÁòF´ÇÒád„hå%ë…¶NomÁèŒ•Y27Ì©2G(½oÈvB£ºâ:$8Â'Œ}å³Æµå¼“¤‚Oc…|6º›u]&¤&Ùå²QÒî'˜j®’NˆµQ¾.è'PÀýÙ8~6Úngå½îºÌpÙhÆ<KKæ+gÂC2NãtðÇ|/Žh$?Läfèý4í,nÖÄõÂÍÔÑp2Ã¹æcíìIê…5#ìVî™Oµb4¼Yƒ#¦‡UºÏGÎÆc>.O/ç­ËÄ~QÞ”‚ô2^×Dzâ…w‚¸½¥%tÄ<`k†ïèÑéQt{9î/ð$y–a~æöhDHZ ;êÞ;Âu;øo*‡;°wT]viäî»$×–â€Ý½ÍÚîi®ÅÝ“a2À$ðXTØ„j˜\ÃòB™.¤fî1"âýnàó^G¢ó6F½Ã´/$”´RôßEr|Kþa	”g½œ ‘1æ¶ñÓý,ë§ÉðFu‘Öðã!‰ËË. k÷òD-ÞÃTË!pêúÃ­ñ@>@S²L¡Ðy‘88˜wédbPÁÌ(Ö®Ö1ƒ°OGX»VoÈ‰/$mLodOrò‹ðc ¿ãIÓ/b¾ô'ö"§ !Ç¬<Áf¿ÈÍ±Ww£¬GÄ¢Ò¤£ÈCÂvÆÀ´üWHsH|ø<L| {2²Î~¤7¸Å%ØO©<cïi“êý­,/ŒVùã’Ãð/Ý}:ËÇò·ŸŸ¦mÌÞ³SÐ`@µ‰‰Š©ÚZ‡®³Úà]íÑm¶Çµ½-ñs†¶rÆC.Ñv‡6ûÈõ¦$}×-lm>ŽGÐ´¦…žécÇ ØyuÝCw&ý§žñ¹^…î#ZžÜžùïÊ4X>mæ÷ÝïªMŸÔqö‹È«˜‚—rãUÆÄhŒ;ã4yÚÁ4Öcëæ*¡a¼ŠsÑ	O,Á/2|acBˆ¶ó€ðó
%‹/±í”>#FÄÏH¥¸½	¦…i{hÿ„j ýIA„Àä£#ÈÆ ×}ž¦ä)Ü|¸Ê8/Z¼ƒÓb·ÜÍŽÈ­„(@	Poa˜É7 S[ÀãÉ'iK¥‡y	Bg6Ð.ÿ­að¤ÓKözeªòî­AF	x.¨ð½ñZÜT{ÿ2ÆÛù,“•DDù´97l<ã!(nÜD+j6¶è»¯Åâp	!

ˆÁócIÅR˜|ÚÂÜšAeó…“QŸ7Çº68S¸È&I867ú} ¾â™‘¿bbäûÊæÄ~áùà‰]™Æ±‹dfà-§u“L³…§àB×h—woƒ6Š¦˜ÓKëÖt1ß&RÆ-:©	&Î&ùC'óÏ˜Ñ¶lÕ¥fÉÆxxøLÖjùã Ÿ14Þ32¢»ßÏ’‚z(Ð…ÆMŒúÊjKÿ¼µ„·Ó7u
ó£¼ÍvhCøÏdnŒóå“zì=Ö² ¿ZV£¿Û“"kæ'Ã6‡p†d•?ÈÆÊbŒzïà ¿ªð–¾õêqNeP2«¼m³;2gR¶î8ö†´s	Órž³”Ÿ¥:ÇÍv×{‚‰|xï'ÊÂ<Þ~t»în¸½sûãÚúôC9åÊ(œÈ¥ó¯Y“kçR™Û–ñ5ÝÐGGÝwBë‡@zŒo2ø>&·®¼­úY1†H¨JØ0=‚ƒMÎN¾Œ»š²V›Dlý^‹á€ê1ºˆªDj1(kaˆ»—´»:ä°{sPèç#=dìˆÙ,­rºX+ùÀhÞ#mò÷Z±Q¯ÒpÞoaúJþÜƒôð×Â-Ùïq-FáÃzK6«¢'zà(B¯ë °‹íVs<¥ipÞ£3ýÀjÁCÝ‚µMÇ‹@³Z ˆŽ“3L{ë8©ý}L•{TÐgŒS³ “Ñ­HwªVhÇU 5~´Û¢Ú\ß“º¹¿|Ü|z¢ÏŽemn½ÎÃèOÛ/«ËN¥.í½÷õ*vÏê±]©G
ê"I“.2¨ñ•cƒ±øÿZÇ* úZ[}	ˆš¹dv†×…8éñ(:„Â÷ìçü›¡ÙÉû”<dRµ„é$r)hg[!¹¥x¶;Ç\ð¦Üa!·ÛÐ¦TbêjØ©ÕI&œìS»¬K• âî3®+ÁjÂ9Ë—mí‹‡S¥µô.›ÇžlW`g–5HBoöÊYsOišÞeKQÒfN³èó5O§Õk·1'à*Â(Mé¥aÚœmµôw<4¹Òà¤ì²ÁK*¢TOI|ßÔŒñÒû#Tó»6—ë} bX:çšòÅ`»ÄŸ]r”ô8Ss7k×:ðo¿AZ‹„Ê='`bCëZ†o§MwnƒH:?KÇà-—É`Tã´¾Œj›†H÷;Ý|kðâùoˆ³<·ÿ˜bV¥hwñ…*|v
ø8]Z~Z°~4J©]*ˆZ[Ÿ}r÷öÎ=cþ¼ƒ7¢­~&Bnÿœg½Däþ7Ç¿ôøW?³ÚIËì<Ñ¿¸êÉÂ&7ß@éÕä€›OÒ] %A=ýÃ;U–I	Üeç•-º—W6˜`H²Óâž(†Qˆ+y¬o ï`£h)‹E¤"`Ì†Ÿ¥„}t¼'7"ÆdÆ«Ò˜ŠÎæ%/I%ú*€jdÃ·:€ÚL§	xÒÛ äy‰H®ð4ç'eJI&­yÑ¬hÎ#˜›+pñ<°°%àb˜r2HÇ½¶ÅÛŠš¾ÖsfÞPúµVKøus9—x_/oÝ&DT§Þ'º@ '^4¡nÍoÆØ{-3°ÎÓ  Ó\Ø“‰ÓUK¬¤fKR^%†£%ÆMˆ¬€ç¨¿•uâë;gG¬´%V¬Ü˜ÑND½?Ã×6ÍÆ§ßÜJq½e‰î3f)m!}Fr{ÎVè;¶©žšñ[ÊªiÓÖ›Ò&.VÝõ‘À@…—ŒÿTžj	§ùkw¿¼h=Ü­cyqï:d:†ÏKòa³âvãî:ÁÄÙµóÈÜÞ±!~cgI3ÁuZNîÙ•=ð%ëÄÔÑ Ki$¬Øé6 Š>*‡&ÙW$(ÕÌ¥#@¤f,Õú£ÍY`§6û ´ýðB¬ÀˆL¼ÀÆÄÝ$›äD$Î$I\äÚVn«m­n%[k¨@æj¤ÃUlÙ)i±Ÿ@ý8|îBí?#Ú<Ú8|Ÿ_Ëíñ€7Œ¿Êv?(oU[ò^þ	µ˜„Åæ!â€Ž_$ùc4{%Þ.Óèè—6‡vÏÉßü
OÈ¹•?Å~GÁÇcp„4LjñÎ¿í2€¶œ®ampu5fù›½4€IœÚ×`ÍJÓ%»z¿{A} ”Ü§%÷ËKrOÜ³Ö¬6%.ë¢SüÇ•êûvu>Gu¥>éä)U6%n®`.nå³™ÍŠÍ@+Í––5M»¦Ì~×ƒ†›:rH„íªy‰¥¾4°wÙÐÜ·½R¢ÈìšåÎ‚!ew¯þ†æVë¿¡¹ßÐÜohî74÷šûÍ]©ý—As_0qü†þ“¦‡MzñU"ŠUÌœï¨)ˆ‡6@Q™’°öÄãÞiÒD‹¶cjQ…Ú{‡fmE×ÊM-Lõn¤°C¿£W;Ø§uöinl—,zO‹ì)ùÎÆC¾Ûåšô3Z¾Ñ²ðÍ.y˜e‡ý”–¥ßiiúÝ.?Êˆ"­À~Ðì‡]…˜tÑ
ä+-N¾Ú…Ÿk(ßhQQµ’n~…ÙZ^EïZ•6ØgCqü…å8•cG ŒïÙö/7øÞâo°]øßü•.3þÂW„¿³™ãotZË9jügY;t\ sÔ¬ñ&Ë8Øï§øBOË@Ù}H·ÛÅÄµo ÿô;¡ßXíPíåíŽrF¤éKºÁÂ„€Oð½gé°PŽEJ<kð³»éA2éüFçf)êFHý–‚G¶7¾O&í»Ë`ìë·õ¥¡ý¥ªé‰Ö¼¶øxÒCý³ÿE"®CJ&ðµüö¯OˆËå_£îÙ× 8þî/^<ÿË‰uöû‚èôS€Ò_è.Ëº-£Ô¨F,Sa*i;¤×Àþ„ÕRm!$gÇxAnú£Xx¶é¬›ÁÕ™(ñ&ÓØ²÷´Ð–ŽÄÊGõòY¤ð
ß \á/…VøÆ€¾R³ã=HsØìKëÌþ€ƒ€È¨øý”Yæ×E!Mæ²Ýq	H VL×röu»uÅ1vW´·ï&ÂšžÐÛÖÝdÏÑ<à½ié-;S³Fûø¦¸éöªÉ=¯›£b7†·&ƒ«¹;¼µ4YuØâ­Å`ÏªÇ¯oEªVMz§xë1sz³–y¡s0r‹+–Ýžâb”iÖl”ÜÂUKBú#%­ä!Íóœ–Ü’æIÉ‰ð7ÇøVÇ î¹ˆƒlB)3ål$1ØÈÆ`Ê)­;àc\‚¤·‘†Š c¨äcÜû3ôLDâcJM}rš€†ÒÎi8†G¦8²×	C;»F–f7¶Køá›†{ý”8É±x8àzC
¹hˆèì©óÊ±Þèî6Úëz]p«j/tÔCh˜%˜ÁTO!³âõYÙSÈlE³åLÖßfÍ84-1¼e¼¥fØö¨—*wòö«ø¯*N>%Å‰s«â¸CŠi¥¦ª*xZ·Ï`r‚×¶#ÀZ©LT!¦ A×nÔ…Yd™äÛ-’$”n Y
ô<¼”®÷iègˆû:‚£,ížýð€½¦ƒe•§v•7ÚÀXZ›à‚6Øwõ-ç{6È7õäq6Øwm’ŸÙà?Ô÷‚Ù _ÕwœcÙ ßÔ7
o²Á¨ïC²_´9f¢–Ý«e]ÌjD5§5®¼ÒÔ¢ÔjA…
˜EmN»Òì²Þëð–yÚç\±,¶ñ¼Z°ÌVØQîÎÉ	¢p«•’^ßCQî3ð@§E'½-(O¾rðŽ¶ÃOÕõ»Š¢KZpSY~ÕÄÄk˜mÊ,^YøŠÇ,.ëR³\q’ü­lŒ¡TkvÛ~´¥xdãdÞ€‚ØÄÊ€d`fu¦Sídù-Ä÷I¢ÜhÐDœ´ŠR|p³S¡…ñnRÙpÕéûG)¾¹b©Éø(¢Œ%Íˆ3kÍ\ì;Æ&ý¢7Âä3';u²/ë§­~vX[ œ8"Å›œX•Ë´±àò:´ézb¨{Ez~àõv®D{Oh[©Š(,…%‚è0Ä‚¶{n™ƒ¶WWÐM_ƒöºCÏDûz6Zx›Õ«‹=ƒLµ'\™vÔÃ‹¶}½sŠkOÑ0+hÄÔ“bP2''O´¶•¯ N¥j?F 6‚D±c-lÅÓaýòQÚî@¼öþ	Jò¼wÄ"ß-èGŸ¢Ãtfû¨&ãÙlw`'ê¾ubÁ$¯ ±o«î„úWäŽõ³zaÜ ø˜èÆ #X$ªd£ºCî}ÅÅIm4Ž—2ÝÈôez)¼ÓŽáµéIFd¢V<g8µ©95¡Ÿ`húNœ0‡4xãL0¬•^Å.ï¹Ê™•<\6Ý`já[9_K—;šµÙ w»'¥n˜Ÿ-ãPÉâ™TV<’Oe¥ãXUƒY¥1Â ”ù`f£Œñ‚ HóB¦¶IÎ‰2NB‡q	pÞÒ~˜)IqlÜõm\tõ¥zé1ú=ŒÏoêä ò½Û[q mYˆò%‰âìC¤ã[*„ÎÚŸ¦x\@¶³>‹Ÿc†úE1B„1B¬ ¡Š(A&àÒù.Jx0“øÀ h(QŠÎ÷G^•.èÕ˜ÜÜUI
ô*Dhîª Ê"ô*Lbîª¤‰(ôZ\\îª¦H.ôJLä¨"^L/¬×ÐÛÔD!eê˜Ê-!ŠOS¹EEübq½¨[úªUAø'~¹XL¢ˆ=B#JÅ0JI[“LŠn«Mc}|¦Khô6b…Cñâ¡RQÉ¸Ô‹XEù„›maV¥Fï—H`êân©ÜVogƒA¯¨)ÅtÂE÷ìwÌ¿yyâ©"ñ
$w'8VœO˜Ä²gVxpÙzÉQSB€)á÷^@˜î©q¿1w5|ÓéT}c„nÒ_*a›ô·c_ÛÞ|þËƒ_Ï-<ÂO>Ý†è¶°#$[²‰6Üq(ùÝ—–a‘‹;Àoì2²qu¥¡S:z¸OhcÕÈ„‡{À'’ØGÐ³	g`£gL[£ã³oyüZ­Ÿ®®£C#HûexŒ¾èŸkÝèD—Tƒ1;¸¶!ÓrFÎVe¥0ÄeNLøFk#Zsä‹è*àîÞûøž/‡a’ôC
÷ þÙ’"À§øýb ÉÀÐ—““Ï>dÙ i–S’–©å]@Ä: &³2„¸î!Ç ×Ì—âŠ±nH@ç
ÍOh~ç´¬û©íOÐ#îu÷À]¦°”Þ–ôüÄyÊn[.š¢QQÊæ¬œgô{õ
tÝàdYÕ3‹×˜ô«,æ“À1vÅ ×á®Â9…Æ>z¹‡Á¢¢>IHsr/ç´*ú_ÅkFÕyU½rŠÈ’{G‚¯³ó¸»ÇHt`_@ž³ÞB¤¹ùƒ·µrnÿøÅóÿÜ#©µK6íR øÞ±‘!ÏòÏd^I‘ìd´¬fÊ³MQnTd™ºå©´áµé§#GDíÎ£Ós¡ŒöÙ7 ¸û;ÔºxBè\ŒB& ×+µ%–“±žÚ9HÀUßr!_¤†Ì‹Üš3’‹ÂzyCw¿àãÒqÙ—(lyÉ…yZõB}kËÌï3öS/9)g9'ÈŽ¨µ$/hø$ˆbÿl)y!ÍAùÚYòB†‚(öÝ_|÷Àï=6yÃñ@”Ûúô) ù‹—àœ¼Õ¼ä0I(aúÈ™Ó„ÄI`_œý~Ø¥+9Kÿß0ßþ_@Â|ÛòÆïCåq-®¨)wqGÞ©t)
<<<ûÕ‰žØ_:ÉAzŸø¯âþ…ã¦NgéÁƒ¥üA}´1,r—‰ºÉò(?Í»i
ýó}Þš½~Þúó<~Qd_Wä„jwÔ"§U‚'_Ó#NP™¯ {ö°ÃÚäM4ä0G›Ë%Í¢ñ~¯Ÿ*Ÿ@étð.û…*ñ¢)ÌÿñÉ`ðUA¸RØIþ{Š¡®ÀÝ…\6u²’_<xð¬äb}Ú:îçÇ‚Æu]îKÑ½ãvÚwwØˆ™óÏ.ÚOÌwa'ÕH¯µ[BÉGY¼xþ{Lsý¢ë‚rü?G²_ªçÂCh0j_‰šh¡Q1ðK¸V‡\tŸP©™¦/q™Qï U;!5*,X…!óS´)ÜÅÞQ‚*6x™‡½†Ô¤ðR.E†n©›!8ÊÉn­ð"VYÙy‰"EW¢ß5ßµ ê@¸#š£ª÷>hŽ‚ªFºÁ9
jJÅKÍQTQ„ï4G1©üà~iŽBš6CqIsê	æŠæ(¢H×÷m¡ºú¯Cû¢Puj&ÈAò¹7*[Ï¥qq¹(–+å\¶”²`ØÂÏ<øKKh¥E,ÐŠÌÊb­q.I§s×¡ƒµið††Gêv‡«-9®V}µ˜¢ÖgL<]jþw³·Cqê‘8ÕHŒÝìÔ±¬[ý,OñÙ®Žæ0ƒ=M‡ùdœBŠõƒ4í@ •‹±S±–#yyÝôÑ™@/SÂÍ:î9ðTÔî:í»„Y«È”â¹œŸ!eÒøêü¨=sUâì)¦0YÚ«Ìž*ˆÊ³â‡™KÕÈãÞ35Wr>Â7Uó¤y}a“µ	%6„ÞØJÆµÂ~6î¤ãæ0¦(ï&7WûükžfÍÕåå¥«Ëhÿ°yÔÅ´$Êð)9èã×Ý^§“dóö€ºÍ•Ö:T=cR)Í"kŽÑÁ8ðÎëËËxmš£ÉxÔO!¡3:jà™C^gµeúGi‚‡«v0Úo^ÕF`á ŸSK­f ×?LFÍ54Øo®UíÊ£æ*_ŒÁâ3í4û‡V]šÇºýôÑ—“Ÿ\-‡5d°^w¥®6û_Ò6L™ûN¯èk’ÆŽÁN/ë~"ôGt×Þ‡eã‡’šEï°[,l
&a§;¹±$5–Ïéÿnš·Ç½	4bŽ‚v	;I3H;½É€~ïÁŠã®»„ý‚häE`M½:À×
‘Ê0)fAÄtŒJÇ@,Iˆ° ew	¡gÃ`]P6|4ÙôŠ›§×óiL;þÓ¸î‚OÙUGY\úãd3Dæ²ï®,Ž÷< pïÆ3Žãvk +6ÄgêðÿðÅóoÐþÙ×FÏ_gbÕIoÎq£>ãëþkbê"ÇGN–{
¸2øûB<‘T7n”ºèß2½Zù¨ß+j‹ÍÅ:uÀ_\œúÚÌh:Ó-b»wó´ö"è8,då‡i2¨ƒá˜:X]`r›¨.î–wˆ¤	g=(“ñ×´“”×ž¼sŠç2m¾s:˜>ñVN/ÜÛ#6hSw‡:–Åh|Ð ?çH½78F¨(ëw<  ôB	‰YRWHÇ7~÷‹%ŠŠKÚø³`À?ŽÓÝÕåÕ+„ÿ_'ÿ_%ÿ_#ÿ_ß#2Mb$^ó6!:Ûëß§éÉÍÓ“)äi¢QŸnâ|üPØ?¬zÝ½irþ¥3ã….í®¼~Gðd>ðŽœÂïÍ¤ÂúK<‚·ÁY¦Ô`íQÆZYcÿÚÔ£Ê„z­(OõÖ(é<*’qQ[Å¿¼X¯“Ó:¨|Zâ´¦›tö}é'ÕIŠÇÑÄÄ71Q‰ô¸8âƒÅ¶©‘ð1%DÙ7ˆ@—ì÷U×^\­":ƒ*±ˆÊ²ÞóV$rnž’?¥…$#Zñtž<4¼:;Éuy¨Æ,gØNVóxKDlk~ÓaÄÚÛÜ¹¹ÁÚÜ·ïæ©;Ç}¨"ÙwùÝ[\Þ<}ûmË[Ölª ÌÅ ›½þóI^ôNšûiq”¦C4:v0Ú¬±yCäÂæ–d1Ÿv3b2€¹Îr€¼3)
ÌÖúÎîÉD%¤Ì‚*Ç½dXÜ\È&E¿7L½óÞOaÞÙp«ßk?Å ÞéÌM¾kF£®«d £˜¤aDºäuAŠ³¡I6ÌÕf› —˜»•ÖúB5šæ“þ$ßêÛ}C"²Ö™þèxö»ºaž;“îT	ÐW@“k <å±Ä¬$ Ëžãz}A:!D©Ðaó”ÀÀ)3Ô¨yE¥é–éÒªØD¾—´Ô
ÞºdØÀ÷Þ$ò7ï÷È—&¬H­:*èl®-/—QƒUsI[xél¼¥»›Ùù°WˆólI›î16WßG1ðäš˜¥˜-"iÐƒvÞ?ß=¸Ó`’¦-ÌVJ‘Ž2šòûN~ACÌÐ‹zoùñ±b™$®ÆâæñÐ³—ÚåŸÐ4Ëù›÷¥€Yƒx@^
fó\bg‚[¯ŒÃÅ„6FBbÑw_'Á¯Û,
BT‰œhiâk’Ø5ÞO­ˆ°Fµºô4ß`®<j6¡]%ëµ¤,XÄ6Çq‰Ö~ùE«áäè©XÀÇ/<Ý8ÎN~<ŸÈ§¢ì‘Ç‰t"°ŒIU«”c=×\É3"—CäÇ&þ€0E5üM±m˜Ö«ÎØÏÕ*#Šáoíâåå¼\ŽYÙÀâ”>W€õqGÕšB(8qâFÌ”Àlƒîh?;ö†òÓëÜ<}6Íw$¹ñ$¼q¤‹´#hÝ-?\“¦ìòHK.Ú,DüiÉø0-Z¬ßÐRÖa}ý:XsÐ²Y{’o€hHÑ)º©TùñÊ¸ø‡ÑÝbÐÇ‡Þ¹ÞÕø–u‚hOÆy6nŽ2¦ SÍ(z!xN^fÖCçb3XÄüà˜È~ß@Ù¹ðó„æ»ÛnïÜþøO ÛãÁyYe2?@Æ­~ï€ØZìyðÖ§æ¼¡×q¶,¥`o¶Ùä•+lr$[ª1¥<.VKZ‘!eG±£‘<÷KfEýŒèÏ~7ì¶Z­eœh¤»U•Ùr°ZÜzaSõ ©Æi8š¥ÖÎ˜¾6çn’ZZ/lJ§›s7	6Þ›ÜÑçÜÍ1ÃmP‡q‡Ÿs·Il¼‹oªWÃÓ…q£S®BKÛ17¸.ÕÁ‡	g¿ê	óúXqž}KÎX ±™±Ãq.5òìZÔEóká‹QÃ¯,ŠÃ¯AôC°&Uò€t@°¥h©òÎ‹;	S¼š½g!ì9<cÝ¢Ð—²éƒl˜Ñ'c0¿D£qóŠE‹08¸Vsƒƒj[³EÌcÚ'd™kdœ4ðÖå£D3!Möó¬?ÁKÛOŠæýÅÊÒ*jãdH×ù„<Po\…’[ãv§Ôðå»¯n,AsÐåPP/ô—
›€ªÈ›b´3å*)¢MÎ,qs¯ L®†`òýr¤;;°ªÉJê³rõ6ÿD©¹ùG¨»»˜€	§Jï^;¢eC«}„ÿKu×z³œrrBŸÍžÈ'®aP¤wêÒ?N¸5ÏËn<è]jð.>vGÍ+A*¿LñÍ?%C,…«’—îSå×´»ü'®¸ý'@Ã6Ñuà¬P‚s•[GºL$ÀZ˜–0WxâÄ ÝáËµ{ýÃJ@AÑ ¥ëµK®šS5Ö8~Ð"C§‹[OvPèAƒùuü6³ÂgÚ•p§¬Y-^4Œø=TøË“°Ñ%†šþ­«åÂb

 x
®…e»áÖJvPŠç”ß$Z]‰ vÃÃ B‚p´4Ä¥ç?@˜_¬£&b®:˜‡Ìb-~!+TùVÆí)Õ–‚JÍ{…	ÎÈ°¾aXˆI166½ ±o	Ü’ºU·×Y¨±#bãÒ5p©qÉEHŠ<(qÅ/%}_…±‰–bç("ÐF¦c¶°}AaEˆ–šI±`î ³!®áØÝªb¨#'	]Š²™œ×6„÷:/ÔoŸ£h½"é:Šiî¸C1F^Á†îâ°ãâ`ó1Æš(þ•#`Ì‹;ÊsŒqŒÁÇÁM!-ˆDòûà_D:Øˆaj êLxâàAx©@	gù5D÷Äú?b½ÄgZ#îî¸ÃíÅ³_N«.$]þÉ‚¬3:ýlàªD‚~]@õ¼ªâ²qú#šÓˆ€!!‘‡m`â§™;IÞ5„Ã£|m^Æ8SWJMÔácå"S,<!|áPÆ ìÜÁK§cÉýŒ£·žß[«²ƒ‚Ò¬ê÷uqž_Zì½“Èì	,·<²}ZêÇÊ½Z/Øw¶Le¿E³P—¤”)‹VÜÇ«ìÊ`g |Ø9ÇãXu±£+hh´GqÍGê¡žî%ÒôÊ2%•úû¨
é•òÆA¡óíj?|ÆI­:çCTéž±™AzÇ{â!øRùy'%¢ì“JN|X)wæ•Þè¹Jë+XäT³Çqœ<wÞ
Eô§=¯dRÒ™’$LéJyßQÃ“°ÙIÙÁ‡…%©ÏªÒLq'ôâÎ¨–%WÌ(O&èáNœ-ccâ8gR»c;žZ‡Í©ñ`J‘ ;ãâˆÚróÔPî*L+ñ\55×î|7¬²¾ ÂµL×çyl?7ùˆÂçE^¦“¦šèœäòl£ìãô	‡4–€[Nr ó¹‡“¾s×‡$žõ²ÝYo¡E	ò.WêkR Ï	šŒË¤ƒtœô;zEþP©ÉAUçÐ|ÆåÌøì÷Á¢¼g%rÕð¸@Û•ÁÑTŸ¦ã4ïn¹‚ÞqÊ(õ†^zü]kíëRÏ	þÐ›]mßÛÖÇüÃ$¦÷ñkæOÎÐîaÌ5A¹Q†¶Gäèˆ‰‹~ÝHÒÈÓŒa5áW/Ç¤`wÔ	¦dwÖ25-Fv2S´Š»’¶¹ç~	iÜÔükq»2²9«xr´9Ëú³¶F™®-ÐJL7ûS1:×G/žÿõ	?ýÛaä°¿O<¬§#8Pˆ;âçÐúSðÒA$Óò‰y9ß0:ˆ‰kÖxâ¯êq-;;.«GGN*³£ªA'ÌYiC°ÔOˆ¥8Äó¨±½ž¸©JïÕC¥š+AldxN;¶² }££¦jâZÒY½Jï¯Èà8Ð8¦ctŒ­„às°YõˆªéO,Cy&œã2.BrumŒ„AJ n’±*ž»Ù;>é×öbBFÎIÅuP˜Ûï	–7›ÈãÿZ	Ÿ*ì×ÝìhH2qØ;F6èsšéä¾ÈtR•¬,Íi¸É´=@Áz$kH/4ÁË§ü¾MÉ¼õ™IR ƒOÚÄ(~æ¨Ws‚ÉÒ±oc\ÝˆšôÓŒD×#$Å¹þüÞC]kgœäÝU/˜@Î³Ø’ó D<€8D°Œ£¦ÊcûôS‘€SÎ¦	BÌé“/&R¤aà Ð—úHÈ‘¥M ¡'¼½~¹/ú}¿mˆºm¢&FP¤Hž&†®ßƒíÉ?J7PÅ\ÄÊATÜCKUyË…v£év úAÃûì#Í¸*qùdaBgòc~¦'\æ]Ì]OðæuJà†Céß„Bƒ0š	Ú±ÿ÷[¿àY•Šöá†›ÉÇ/±ÕêdùÜ°'EØ:7î­âX¸H&<ç®{Ã(±`™@¥,ê€5GVç>	Çå‰7P¦fŒ©/Ã¿òoî5õD{}9‹éŠ“·¤Pž­GååÕÕB%{Khq’Ï·|>ô>r‡Ùø„o|Ù¤Œ²ž…÷«¢!¡÷nžé¸{ni¯!
SÖo}âÃwaõ´®”vDQ¢ÌÉƒÊ‡«ê’pZ°d4ªË¼ây ÷#)®#ôËŽ.ÁÌ»¼Ï…M¾ßÌv~†n˜mn|O"^ÒµÇƒøŽ"bBÕñ~%¼÷¼Y|ÌaSÎxÒ®^âI{ñü—mê)U”åN¨|â*!õlp`ŽÔÔFãQZÔ”}VFg–¾¹^¯·òl\ÔÀwïY:ÎÓk9‡µœ_úŸ_êŒ€ëJyåÉ.…¼ù¥FMÛ†5†Á´WË¼ôEÂµãf2)2žÍ1¿¸úÕª,,ò
‹Œ
xß<è§+¼[Ø¯«¾î¶Ø¥U?ÍŽÌ£é3Š9ƒ J²A.­‘‰CØOÕ$¹Üˆ."F\¥øp1AÔº˜9j®•[Ó‹hqŽ¼ñ†ü¯TF0èo¢Ü,E²µ°_1| ç²y.X‹hø¹&QsÜÆWq·Ì>S”öóô<c)Uþ²NJß{”ôã7º±$ ÞSÆgä>)ª¹>œšuvjiÌXÛ4¢É‚“öhg'<ZeTÞõ0ø uy²Ï9F#úŸ`B±óQŒ‡ÚY?çþ³jHˆ¨JáÜ›<ª:LÃ'*'TÑ)ÙXn@Ûxí¤ÈÆøÀ§ý¾§ä €Z	„†íÛ,·öZnOj~A»Fœ Ý;Æ{žÃvy¯É«üÀ¯¨aÎ}öïßyõÆ´Ó{º“=}õÆ!_½QÑÈ‰¯Þ¸Ôp‰¯ÚØÀrêÕ³ÑzõFd3êúrü 0C£šÑl;z˜³r¤¡Æû¹¬±JË1ZÕ~¸t¼Ì–æ¶ßŒ><?níPÁ™Gvm]çêæu5´vÎ¾nÆÅ^c×%aPXgƒ~'ëœ8í:ŒMa¢&=Þ@Ã	Àl‰¬åÆ§iÒ.Z÷ÇÉá ÄDÚ’L!¥dœÎ·Ÿ>±¬hšä:Ä\í½sš’¡a5¬&ô¬ÛÍã–Ö¨ÖuqjEßyRâø5'q˜ñVÚ×\q*	
âD•ƒÉÏM\ Üâ ‘ &	‡¸›óŸ÷/á¸¹»ÿ®pö‡Á‡Ùð
Ü~Dïð—g‚F›ÿÿ6ƒõ°à!$È‚ÎA¶gpòë
ADˆ–HFÄî” .Hã;[ÉÙì,fËqà}n2È¬Núc‹« yc715W0YôA›ÑRXçé¦ñ; Âíþºcå
0›õÍeq²}wÉ±@Ò'@…‰L¦¸,7®ÖC#½„r‡!“0¤å’pXi.‡@ž´Ö¡[¼B½“´Miw¯X€MãÜô4"„Ø,[F÷õ³#n˜·cSM+U2¢W¹ØM±©Måè–„å C4"L&-îŽ^$2†ã"úî«ÅÆâbýœG|Îƒ¥I`¨$²ä+?^H/ðZ,,M­ðZ•åXx-Æ

¯´2C‡×gÀíñà²«
VËãÝY‹g–’¹¥m_ó`½ŒíŠ{Ž£K¹it	Æ,â7Šß/Ú¼<ÖË-d­br€	-ÅÌ½žÀÅ6KÃ˜]ü‚Çhµï$ÃTcïrÆIg‘ö°dÕ £Ópª™ü ›ÛÞP]¶ã˜×Áž~‚»à–niÎõ+ËË€› þùôT‰Ä!s{„ÓÏ´L`Ÿà£Oî¡5ãÇ?Ê¡ŠìèÅQòò(WÊ/F6Ÿûo¦Ã1
_FcŒÌRÀ½äš¾í]Ó…NzLúÅ$C¦Þ
!¶;äµÀ?š”¬ys!
'ã<QÊ92bQ|‚3ŽlDE¯ ³0|&¢Z×½(®è¹‡™ì#˜8ÑvÁ¸gËky$„ ÀCŽ}.Œ‹ül—ŸêsŽèR„>È:¦Ô”%¢¤ó¸SX9H¥ †7à5Ì½_3n'`…c‘F­Pî
_‘Dˆøœñ(¸!eåê$<_lwªW—á*ÑPŒÔÔŽ´&ÜQVYT“Ÿp«‘]š!%*õjñ%:VBËVëTã-b;Œ(Bi`Ðg¡Dˆ6hwÝD»{1}€>iíÓä)FæÃ8<B?Ú‡y·ž¦'¹V½…Wá^ÒîÖx¶ÏÈƒÄ‡BM1ª‚¿jË»¬Á½zìáãj@±T¨4Œo©ÞMòn­JeT)ÖK¥†Ù«Uqc`=ô4‚b1gJNíBd¨Ãg¡ZErnŸe‘©Ü¸8ÍªŒ¼Z½|+ôÆƒ´ÃTy"²7Wk“¸‹Þ(›¤<©:<@×bdðcÆA‰è¢13×zå…ä’)©®+4‡W«–	CÛ^L[‘h[EBj@ïXIïŽ~z˜´Oîƒ9a·Fäšœ‚á€êÀ‚®@ÓX àíQ™¼lÍÑWo„æ²9.B¯Þ•iË–¤Œ»z[Lè,S¤ÐÕ[#)}e[äg•–¢è¤Š¸Cª^ðàª\ãçºn/è²!Ø€
ªRSÆiû3$4éW Ušß´d¡«Ý€är]qàòóêbP%´žK‚Ì-¨0ï}‘ø|eËCñiÃ·Âàq1ÂÜ!DÀKZFpc ïªFÅóvQÚV0A.™yŒ=BG˜ÏŽZy{œõû;f¾Šl´–h?í&ÏzÙ/o>È0î[Œ£€	MX¬ƒÐàüWuq5¼ŠI	#Ç	HžÞˆyd®×”Æ8» r–2Ý‰ZÅEž“íÜêrÀÔŽ$u©pz~ë•2£Zú)·.-…y§SªfŒº*œÄ‹¦+ÌÎå°¢Ç+ÕŒ(º•¬ÿÿfûÕ[he_Z++F*Ë®ÓÎås•OîXFÎ“¡©Á¦w /\	2™ü_~“9xq½p‚­@‚ÅU¢º‘¨«r’œ@õ’üœ¡ þÞ6ç”¦“·Þ½R-IÀõÈ|°,°(&
þjˆö15 âˆÞXê^‰[Í˜ÌlÎ5YÐ 9nvÁA›LI8¹ŸP'÷ÑiOò;Jì'!klù9õÈ.á”NiÈEzº.észV}êš\8Ã«6X§†º»Ç¢+)fõ"ìÿÃ£ïM5f8÷ß'VìôÎ©%þÒUñÔe€áE?Ïãá›1:„Àâ”«&­”–BHÿîYˆ#ÝZ¦fv°Ô²ƒ¶}+ÁÄ›Ê‚ÊþJ3å±Ûf˜ŸÏ|W‹Û£ %j ¤Jco«LvjE˜CÏÐ*¤;PD¥˜”°leØ–]ƒ-ÊŠXÆH$/ìE%ºj'ãÚå…M^ˆîkóì·Èá]aè£ÉxÔOåÐÙï¸¡‹xEó=È«ŒÜg£1nâj8û˜ã¯½óW›­R^‹$™J[Ž4ò67ªFÛ /HLËŠ.¾…»(ÃWm¯8iÆ¡Îi4©h­"‚:[Š)ƒÅ)¥Ã)ÍÛTsŽ7SŸ¢îÓju†1gÙÛÃ’jöþoepº¶¿ô|œSW_Äž†Øéàåt¾Š?#„‡U`iÊÈ÷©;œi§g\R
Bå#¦ñôï8;þ|Åpr˜OJ1žÛø!½iX(_(É˜4²”x—»ú,	ËãfÂÞtjµ‘ÔÇ€w&^¯U¿ÕâÉžX{1ÛÁœqÃf ŽY/ˆ(´­ä4TÃp÷”¼‚†ž3ÇŠ]ŸJÒ?×§²¼ÑõÑ3¯¢#è&ºÝŒåj¯q4f´h¿cØÑý1$˜EvxØOAqÂ†IäOD>)´˜3œ	›bÖ–íG?$KóùÙ×mš™k•ÝÛüÄ	$=u£“«ÛM’³
ø¯ªî"Eº*¨ä§#yvL¢tûÃ$²Lbw¸˜€£ÌwŸ¼CÝú›ïNíMŸ¼²¡¹Ì‹vFšÊÈµXÍK~¨h¥oÆ$…70Ñ?ÒTÔØ(%I½ÌQïß¼ê4NmæúLF{bt“,tA¬	fì#¨´p}b%ŸÊç²X§ÊUª t¥Æ#Žm3”Wôjí4^QÕGT
n"A¢Tð+Qy±Ë{Ê1+D7õ™ÓôŠ,ÚŽ·šŒÇU® Ÿ<s“ Oü{÷Çâ\TRCSDu7k×:ðo¿•(Ä‹4¶G½N«Þèú¬	>­fªˆ›°-6è¢¥ŒÖ×_ŽŠ÷%ñ.q´Si$Uì+!æ*èÎw[†Ü†$-á¬ë˜]ñ$ENWwWHÍnÔ¬’¨ÝÙidÚvgÝËIâßõSºÆ'xwWŒ¾ª\´ßË+f§÷âùÏ‡<ú7#á=Ý<eO¥Ã9;¦±\÷Äw3ÄU½K1‘QiTì>ò¯Fc*½ó£aÿ¤Ê*UÀr•ÎD4µHKÛÙÞ…}Ia“w/ùä¬—šG€þ¬×Æ4Ú‹çÿºÝÕó¬V>DÆà˜§½.@—üÎ©ŽPS¥%êè1i¥’§q–§zæ25YÐ#]ÿDöOMjßcqû¢Î‚ÑFž©ÊšW°G‰‡ð²½ä©*gµÓ¶w›+«ªhRóçVb¨Ý
:ì¼dÞL-–‚îªN¥â±g§—ƒ\çæi/g©Üñ¹¦{ñ 1ƒ]'ÿö<£|¤¯ÒÊ6ŸÂ†žüK¢Ça÷ÊâÃzãÓô`œæÝ­#|ÀJm]Ø9æ£Þ¤ÝÀôaœ?¶ T££
”Šß°-ðz( UúW¨ÎðîT†Ö§’ 8R\âÓ™©Q½1ÝH¾IzCˆ˜'@A•²x²qÓýèìWÃ.M"ˆwoxö«¼dßþ~rö~@r¼jñXšZÒ‚·»ø¾zþ‹!$%ü;¶Ö(O ¶HÎhÂßk¸<D2&~ÛŽC›1*´84Q*X$.¶IÐ¨Ø<7–ô º®ên9]DfOÈ^²yW˜(¯Æ«úÎkƒ|#…µ©ÛòÃ—”9Ž]!QµŸÿ§‡¢­ÏÿËÃc¬ÄýIÃÂÜf&Ã23í É’·ö£B‚]ú¸¨Çä«96p¿|5GFÝ9_Í±1ïÐWspÄãÕôñj®=\æÀdžãöÈæ¶dº©÷Z™ÉIi„?‡q™Ý¯|B„ñ,lXq®ü¦\nk–S•©âÞA'\Ô…¿rœŽÖ§ºîÊ²R†hô\xâÝûRéuy³1ÑùíoN4JU£mGÝ³ÿƒ0aúëÑ¬{YyGXWböÊnÈA¢B(È¹¥sœO2ÇËLåø&³Ü›Ìro2ËUß¸7™åÞd–{“Yî•×›Ìro2ËÑlmu¾lm?ÖµßÃ„m×/&aÛÃC€·‰žáÕK'÷ÒÉ¥Ðù³É	F@æ‘Óx‚¸,q3‰¬Ï—~êMæ)ç¸h÷o2O}Ï3OÍ5½ÔËH.už,-¯W~©ËÎ.õ:ŒU	¾ùŒVîùwi¦^³$S¯QŠ©¹çW:wv%OŠ©Ûíb2S¢©9,B0ç‘/ È¥$<
¤#*¥SD:‘’­åñ€Î³¼‘‰J±µH‡ò y%ô˜óÈ­ÚOóä ½O€¨	f¬×¹]4Ðb§³ôàúè£Á`±N<¡By»BtÚ©ÒÅ“°õ§gÂ&Dê5•×#8\
à ²•ú½¢¶øOë»Ë{¡\4¡(K#!Q¾t5S•‡j‹2Ò­³ :BÂ…¤À©hB;cêb'Ë*rsÙNœ•ì92æœ#[Î<2å\r–œ—’!'ðú\‰jfHR3ï5sNNs‰iÎ%ÿBbäWNF3—D4œ„æÂÐœ7ùÌ¼Ï”&‰l%Ö=y^ÿÃí„Úˆ@DçI»2sÊ•y¦[™kª•y¤Y™WŠ•ù¥W™Gj•ˆ´*çK©2S:•™/‰¸"fK¡rÎô)óOR%mÊ«ƒé^ã)çJrÁ©QfH‹bHË¨¢Ìå/ËÂe…†0×d)¥‰G-W‚”Ö:¤žh­bÝÇ¸ùU0]_ªe˜ŽAX!ä¡ÙàˆG7’5Ý	óð–½ä‰Sµ®%¢²-†vÃŽ j‚%=
i©²ëlÈc6ìrèL	§(Ò#õÂDa{örËä<Þˆš¾Áá¨ˆ¼+y$Îäa°®z¹>†¥Ú!})n†•†vùž†•†wÙÎ†•wùþ†•†÷\+ï²½+î%8VßÜ|uEæÅ¸ø]™Ñ…9ù­]°“Ÿï¾O¿™÷è¾ôêô­îÿ öÙ7šëÞw_ýZ–tATÎù½ö,"LkóÆÒV2îX!êècþ[tƒ²(Ã”,D·13 N1±yLgš@%RkAsý#êÞ| (ýÝµUb²Ü\–™³º½N'jö
,˜Ïê±îhjF•¸ò×‘/ð«#ÛÙUAt)¼‰SÈï‹ýPHÛõñv?CPF¼lº$°L2(ísÙ"ßÔ¶Óž’C¤$³Ò]³Ó`ô=šz0ìUíC6•@èèøì›äÖ¥îšÕ‡™ï³ÏúA¸Ú:‚Æ0)Ë~¹F\ x-cF¬È¬dçÀâltiŠ+b²B#Ti0!–nÁäDÝI4‰F£>ÝüèÅóÿþOÑÏÿ½ããŠX›½öFË²†›Xì0 rê×G«:s«0žÒçgÿñ¶{2Ön,i˜Bb'úØ‹ îLúO£”³àDõýETß$¨‹Æ!êCŒêbž˜ênpˆ1D£jC>£ß’¬“ÿŽ D„á"¼ª¡¶;œDšÒàWè°Û£„xúürøZa4×Qz±Å\r´
Áú2P•S\XBP™%ß «ï5²Ò8Žùa+é ,†uaEPÏw_ýñ/žÿºÍ¼[è10@mŠÅH¼¾þÙ¯j¸l{ïµBXnAý+ˆ±è˜Üº	“3˜ðš§#ËÐãïþÇÃÐãíÏÿåÃËE|v|Q'Ösû^ <©a˜Öó4UpžìôÕE{v0Õ9£=+²©*òÅ(Å<'Fª@HÃÌ¯â³µ ¾X¿ÚK_„aÈ©eŸN•¨Èo¿­Fï­‚a­AÄ¡ÜÃE mª„qæË$±5âažùk‡8Ð»¢FI[º¨‡Ož!j2l²= -¼“±i2ÿ'úß$ÿê3KJy™Ëö`” Í7LYù˜«&l0/•+4 –¸r®,Ï÷ÊQ¼¶G¥³êaD‘ÙÎmµ&ÒL€\9_®l÷{ýôÑÒ<äÝ4-·Ã Ái1pÃiEÀ¶`‚”ß0›A9Òö½ãvÚçÐCqtaß*fês-¼?ÏÂ  —
[ZÜ?‡^ÇuW‡k³â)‘$
e0(l:	Þ6á¨LÛ ¡Ì 
Q`EÈ°Bêã¶Fþ+7z$Jq2¨Åà´€zú­9õ³¤Ó$ô,¾ºó"§í>¤gkAÉ¥HQ­uÀ·=ž: ±Ÿì§}Ô-ýûÙ8ºW#€šÈí†öû@¢ced!½T;§h’PÉm@–¹Iw#o'x++Ú^¯ ‡tGDüŒÌÚKF*^X.‹"ûP;•©.2‘R†¿"ØT¼xþ7hpöõ	* Â»SYêF-Kd›+Ÿ6Š6îgY¡˜Ñd`ê‰0ýïÌÃhÒvÌþÎÅ£–ÜMœSUÃáF'·$¥šË ˜1@® ¹|…A|~×%Î±)]–
W7ýý–¶Ô˜zÎ·–Þ}÷-ô.º›µ?gxÊ9äƒd˜@>¶­/È0§w>¥Üè™N:JÆ„±Ç49Æ1ílØPédí	<Í[¸ÒÒ[ÔmÁÙúMDÃáÒAV#Æä<£7ñìjÈ’~tJ,çÁ÷Îü-+L†½/'ÄMO>#Ç3íhc/†]Ö¢Èì3žIPV•/ï÷Šº7gcÒšfk O$•ù(MÆí.<ë¤ûxÛªpZ¾Ô-”ÅãDw_¼OŒ ¬òÆ»Äô>ôT³Þ*´1^JO-ý•¬²…Wì0ŸxªÙ¯Iú…á²¯Â—lbŠ¡`ü4Ø#³|kª»¹Q@ÛÅ—CA|—Ðí#ñÜ'9±ùNo0'jqÞÀ4>†_ÀÔh1ÉÛ‹èghŸRò…d/žnÖX®HæÿÂck6èS«·¨½×³^z„ûú`±A½:åmlxR›’¿cÕSÓ_¶áô¢7„/¶½¯sÒÄŽümW>Õæ ƒ‹â‚5e^·	ÑàjÞ¤Ï)û
®(rÓÀ›ƒX°À_Ì½)oD³4S&´ =W”—¬3Úú¥mÏÜ	iÉÝÌ„õAþ×€­F L,f,?U–zÅX))ºî4Ö’ûà".4öÁ[bßvÎâg?Coë¯c\]LÆCÑ4ù½ÙmµZüí^ª×jIík2]ò˜¤¾Nvõ.ÞþKPhŸÚ÷b`@Šf¬]Ø 
`xxW“ÿ  ÿÿì]ëo\Çuÿî¿bDY2!—Ü•(ÉEW–lI°$«"eØér÷Š»Õ¾|wWËhšš>`¬©á"A“¦@A>ÐñÿÁþ%sfæÎ™×½w—»¤lq‰»÷Î;3gÎœÇï´ÊƒîM £ºÂ÷ØÙT	BßtW>NjÁW­bÙt°²éî*€oþc»šµ«ZÒjäSK’Î	Í³û>R˜g”õ…·˜à¦àgúdžW{ï—+¼ÿ$'<ós ”¢–ž õ@Øã õå¶ÑÙ’Duw]ÂÀåÙððÕ¯:˜F‘ZˆøG´+ÆÉåE€X…i”´®P5jq‘bAn0;(º6sëò§KçË•‹ìödGúûÛh€Ýþÿjg†-¬é2*jB4	†ïš@ÈÑ¾r‘Ês
Cƒéþé'	ï’®äþÒñ˜EÂ’h´î±´¾±QZa)d¡N+)èí’ŒÓ% €¤Ô­ƒ—8¼”j¹+ïý!·×A³œÚÛUAÁ-n(vwYöì¥Â†mÔ6RVàüª’ª)(Åª”SF» ÂYU'Ì`VRîŽŒU£es‘’aô§,§c?­RWîÞRe(¼ á¬JÙð
¤$ D¨bîígõíÌæšv·›¢=Ð¢	øWlaJ°&®½çM¾Œ^Ò‹ñx—Fò€½RÅ:ü¬bâ—noÕó¼$êÐ™-­Xdï®¿·ó~;j¶Ä³òÑ=Í	ÉRß†õÉÍõOÊÃA³Õ/ÿU¿Ûy8è>D½Ø¬frQÉ‡6Í‡€Îvâmµ%Ø·¢$‘unoÎó·Î³™«ÝæÃõn4xx½ËÿÎÐg·“&Ø[1–~ÄKBÁëÝõîÃ·wù‹oRŒa7Ö?’})Ø(:åg­þ³G²VÁ$ûÃpüÙ?'¾”ìPÒ‘û–9£Nw	áô8È&%™% †µxtå’]ÖøÙFÞ³štÈ?/M©ŠóxÊGhŠPÅ3)ÙÊÔoUšP¿x€.ù¹¤“KK<¢ÖÙØ,–7`ÕÔ„;‰§Èõ"rIÒ$ä“7ÆaižtpiÞl?ÿ6Œ7^¹Döz=Æ¶‹Àû5”D¹°‰ÀûŒŸˆäW%™ózÜ˜Ágø6Œ¤Êêe¾	oßë]ín¶övAGÏ²ÿ×íEµæ`gáì’¡ûR—­äžò2(¯¼"¿W°WÍ¹ÒˆŸ&ÝÎ½v6Ô ž¬È«¤xo½º>ÞÛÆCõ¼X´²á¼o+/=çUp$7,®±£ß¶M"™¶Ðnn-l%Q½wƒîBÂ'Ý¶Æ©åSÜ]è“^K8ZÈ\1¦†ç¦‰émæêÌMÜ·v}¿óa…ïYÙž[üF×4ìÓæWMÀ^ Ü¯Þ…= ”ùt*^ôf>Ú@džYûäpÿ7¬uðGvýpÿç¬ÿíöÍÏ´ "†Ùˆ«|}%Í.8Ç} Õ}Š€ž¸Þ¶ç ù¶Z£yøêOCÈÝ$Z!„ÉÚáþ×œÁAšÒôzT™Ö«…ÕÖ3™ŸD·“¨71m3XXÙhùh³ßm ùx ¬¨Û[¨,V™01àîà…í…sˆ$i‚»B’W¯ªã"âøÎ†³Ñmñµ|ifRn©ÓÃ<žÊår T.žØÂ Ýdm’)§úíø!Ì¹ÔœEYQ¶;†ApúÓ¨5˜sëì§îR+µ}hö=2Ú:µ2TÎù¤ƒç²Ûz¢ÛÃúÇpßÛfZ0%Þ±‘4·¶LÎŒ3C†:4î#¼ŠqÞ,ˆuÎKZ\öŽs!Ð^„ÛS&ês¶òô‡Ï¢iÌ~œõpF¼ýê¢1¦™ãîñj Cžï¬à©óPI33ìÃë÷Ò!üöR¦V=C/Ýxv péSètVXõH¬³çY3BžL rôÓg¡0b-s*ØøkKýšcü…ágÅËÚ )ÛþˆUÍ\¹Õ×Q2˜­Î³ÒRd‹¨t‡³^¯ªö.}Ê/eõD<øÕ‘ÞÞ…öÞÞmï=
?cÈ„þ%Ì§Áß°§˜~Ï$U!Ö ãÍYM+BhLôßØ¦Â6–‚—Ê"Gâ³H¶rwç.©ï+¶—ºÓÐ–æÑWÆÐK»ê[f¹[Q/-É¿O~Ë
%IÓ:8Ê€jóè£™÷,Úˆ/íâŸp	AùåµØñMKiö¦o•ý~ìû¢3ÓÝõoBdZ“]¹óoü×,Âê=/Wö[gÖu®°o¬_óER}Vü]Wo\»±qùæ˜¯«%íâ¯Â”py¯™Ê¦F³bðˆ‰ÎÇÝßwO™,†AÓpU•÷fšÑÂàãˆ«ßõatßTª½_ÉÑ7+C|>*tÏ¨|åùjí—£óÒ€ã„Œƒê¤83<ïm_g­òKýíÔÐ¦—è)¢—Äy]¨úd¦hQ£öt3[ôò(Ù¢Í`GzQ<Õ¤ŒœÒ)¥ïW*Á<P¾“Á¬×âTÉ¨U¾àJ±dÒù)‰'ÙÊB)ˆ…ç°	(¨ í^ ¹GK'äÑùI‰ƒû¿•c´ûþôÒ¡wg	 §Ó[8éô4æ–d¢&óJ“POwR'9{!‹fµçŒäZ#?Qê±4ê<iTÑ½ÇÞ°B½UEK£.’jãpÿ_Aëw‚í’çAš2F«ÑW•WÊÏÁ{¼,Öj³ä˜Gb¼c²[êƒ3q–k¾dp`jt91mäw‹÷.Ð)á·ºd0ctrb?`7÷Zk@ õoN,1sÀ¿’½;QÀJ&àsºùc­,ëeøòDø^÷™ë%íM~ÖT.Õl]‘7.ÑÐ¢!ì`lî°j‘j)˜aj“î|Ùµ >¨…ZºµR»(ÊÌU’RÑØ`ˆl%@0¶ÿ,²±ó}ÓÃZ(°’2þÿa¼X~H}[$×£ˆ(‘f´Ñ—D®½G“H.y2,óÆÂýs³Sß²ÇÁÉE3—çXð2‰xebIÄá­¢Â,Šöæ÷zˆTËË™iÄ«³P-lóÑì§)Å	ƒ7í­y®å¦÷§©~G4ÉÂÍÏ-nf·hê“‰š¨@ß+ÒùÉ¤ÇâtÍé5f~f,¼"sx„q"’jAÚ	Y3Á;<öÍ r‚9P%R†/G‚8lîå¤Møp¸ÈÎç²Ó	gŒž,zW$9ò÷§·¹i«¿?]ÍK#ýz¬èQw«eÜ´ý=&.Ù¾ó|Ê¬LŠ²8¡D2.›Ë./ÉôÛyåÑþ‚b~¹G(¿ÂÞ¢R±Ìõ˜m<÷Ò¤OÃfÅgÐ,ËÍá²úþŽ…Y¨íËíÅÀâÑªˆÌ	ÌMçr|´$}
òh	=$g Çt™Ç
3FèÏ^N…–‡Â,$CÓ:O0ý¬%ŽÍ3*àcö<u	‰²çÚ k23<ÝêÖÔNG¡›°+Åî#‘WY˜È¤]LoÞH	¯Íx¦‹\˜oçgXòL+F=|ÈÏ¦_ôÒ*„–Lˆ<ÃrÊ×p‰­ámÍùÄÿÒ4ùTŠZðu%öÆ8^å¥ÓãÇÆ¼ÙµFòò8sq*Ÿ¨;ˆS;õep—²ëÚàZ‰¯ˆû|1¿ÀŒ&YTX =6UÒZµM u>ª-ÚÈ}Ôh¡¯ÆQZÀ}Ä);“l"µ£dMµ¸à©<gƒ.š ?–“LÐ®6úÀÇ¿Ö†ýÐpÑ•ü "çÉU •Ó@Ã÷L©‘!t"ç9c«Ö1µy©:'·!2#‘nìù»Dà·3„’¼PÎÙ±Åw3BQ¢@RÁ¼1ÈË˜·UÈ´bœs“L² R¬ JÌIÉã:ƒ%Y1ða©J(Gâ”¼×O°›P¤TŠ$EŽ’Šþ;^yZF–™[1¿†"y¡2õídÑ§†÷¦}rm<c¥ZLuãå¡›s1õä;BÆE¥?kpYM”9çz©2H`£Vjˆúû<5V)4+KÏ/”Š¾ÁKÛ'¼ëòµ‡ä¸»¶ë	ÇE—8©®{4MŽz:Š}aÇ.Ä9fŒ™­ñu•(GP?}×{­ŒoP—¥¢ñµë±Û.L¡Ë¹šÆÉt|ª	œýÎŸðNå»S¿w)ž½‹­rYïj<à[¾Äš6‚²Á%£[/zC~éÏê»yi×¾b=àÃ€T¾öæUûM%]²(Ë*,…v@ÚÆ/Îm.ÈÃMþÇ}2íññô-¨¥±¹=5;o‰…sc`„®7ºÛ}VÇû}Ö},F• ‹EÂ"ÖïÅµæcH DøEÜ¥Ønâ†/C°“·$	 ö¢œiünO^,Õ©Ð'Ù[
’R|ÓÇ “N•ñFÝ T”€,ÑðˆÊ¦~Z‡ø™‡ÊˆCa˜f`ûØC$qþfg#Ý±HŸ«P…gµ`µFò¤Eî‹)l;XÌ‡·Ð_˜]4DZNGîëäðÆ8¥PD4L ÷aÄ4j˜(@S°a¢DLc†Iø#?†AåBb™PG´` A‰ñâÑ)>™(â‡+›[m0¤­².ô£VÜ'Jú·Q,‰ŸÆa¬p–ð‡Q Ôâ®%ÖPÂ·Ó"ä£à›|q¼ÿø1§äY¥0]ÅZ9!‘:‡<®—¨KQsìGžý•>bÑVþå·(.ÿ›ôòŸpœrŸ0ë¹Åãtni“N P˜1P8Ññ1I•* L>ÒãD(°ÍX¹\†_ó.ñÃöæÒwŠuOò>ü –yû¦¦ç–¢ ç†žkç™Uçžƒæ™)ç†œçz:úú.þËÇä£§±äñQ§Sórzñ€ÔÚñ’\`«w·•o¶$R>‚we­qøê¿jâO‡µ‡‡ûÏ;– ÉðY…Þe$¦‚ï?çòæáþçìéáþMmT)èË
1veSæRØQ¼5Hv,Ž!Ww¢ö¿DhÍÜ2‰>t‡Ê øè]*HBØX²Se|ŒÝ*‹ÆàcìXYD½kISí\!z„Ù½Âä‰=·q˜;è‡è.FÊëËºhº“‘ròš.$v3R.èÛÆ†FJ‘ëº°T^~'Oãd£ÙæRnÔîÍ*½âÞ•P¿¸È„"Ý–åýh;j*Âåb7pgë›ó¬dKr%D
)lÞ¤ó9ú®u¾ÈI·Y˜¶›ƒëòºu ‡°´š ØÛìú„‰£,"Ÿ¢i\)ë¦KO/?à0¾ÅÎÓVÏw£Ç\&¨
yt]…Äiïø°ñF´{Ñ ¹Ùl5;¤ú=j~Žwäµwæi/‰acÕ¢A­Á÷@~›Ÿvæœñé¶b	µ<³é|“ó˜»âúÊŒxÔD^’î{JØ£Bº‘œÌB-½B™tê$?À´50‘*†›vÛª»á;Ð‰2óì£^œ ¹gc§—ïÝ¹zyã}	«W¼åG]4R\9³%Tf2+!=Êãçì\êR—$ñþ;ËO·°Ö–LcuáYËIùãµüû3[þÙ%¶ÕžÔ“noa³5Lo È#˜x¢Äñø´)ŒG…øØì<Áï¼ÇÚãÂyÖÛ´­ÅÅÃ$°ã˜Ž.¤çÑmÈg‡Iíœ¤@0òrŠ$ŒLº4Ã13v?ÓPD:D¯lÄÏ, ÈTt¾FdÐXB‰d#$øÊCŠÔîq$îÅ€aÌLF3:b¤ŒÎ	«n…-ñ]#ýßßþKz#õiç"¿­Mq3†û,v,Íµ“	59
Öd^Ö"ÉxBùˆ$Âbe	¹†~BBUZf+O®ŸNW?ñ ˜z“Ìyü tƒ#È¥w–²y‡³hÏ¦þS®·×ÆÉ cøf|€‹¥ÖjuÌÒDB1S+D9J÷¯MçÆ_N¬)+Åˆpžò»CvÒ9¾¦x"¦gÖ>xï„píÚ	7 ò)œp6šON¸â„› Ð'Ü„B ÓmBD…é¶ 3}œT»VÞ10B&Û‚p^NÈ7?91­Fãj7ê`Dþóãk‰B	X–lZzvžØtP
 tºlpð¢–¡å*ƒOP „p*Xc¹¡z@ZqãBû´—–—\T98;¡àÙ1h~×çgÒ£-×oyä€k9]mY Rü®òz\(ÍÝ¯<Øc¡›Kò«=£tf‘T~hµWD“ø!ý	Ýn/^.ò.â€Nça¬·‚&/˜Î»3ìÔ@)*•3•³bÙ`‡†ý8º Sê7z¢¾k¹¢NpÜÏZÇÛ¤ªóµç¶[:…ið{^å­‡ÝÔ@„>bJ²Nå@)ä÷¥½‹qŸY{Od™øó×+Žï—×§ÀçñU„.d+E7È¡Å»H7A¼Áõï•J$ÀçLÏÌÅâ*yñ£ê#–­\¯mñ!‘±òà¢® Å§3¦U­%ýøFg0—Q²ÊØ¨9œ§ $¹õ)à¦^ÈÃ<ˆ©bÔäã]Ôƒ±âølbø÷T)3sœNÙÆXlÃö9eøq™†¨)±jY³Æ„hò”]Lž]˜>`§Ì?.³PÃ4%V¡=kÞlF1j<e“g¶ïç)£ÀË(ô@M‰UPïº7›YLˆ&OÙÅäÙ…ãù}Ê/ðãò2RSb†í›Í1&E–§,cò,£ä)Ë°üÝ§Ä2Oû7›eLŠ,OYÆäYF.¨ê)¿ Q/Sb:ÒæÍæ¡ÆS61y6aEqžò	ü¸|"§)1
F÷fsŠÉäëÀ*Ž²àýl¦NïÍ“ÒszàŽÀ1
ržÁ¹6¸F1–j÷1ÀÚÃñ‡°8‚3¼{Úá"®LÓ÷)ÊÍ)„ŸïÜ^x)Ûƒ†qœ›Í­$Ýà^“=NÊ”69Íý=Ùå3ÚäÍ÷±¢±	îuØÄ¾£kÜ³{Qp›×JÎ}8€£)-ÿ¡áû·ö).º½ü§D‹“åÓc0QGEˆÒˆoÅ2/Üy½î% ^ÚÞ`o¹rtÚ“"«‡ßQA¬­-&s¼ @¡Eå®(À)BÎ£®%	db¬ŸB+'oÙŒ·§~Í!´YB_ÙÍ¤Ó|UDÉ¨ôu
d¬@~þI‹cÐƒÄ÷t¢-ü“‹Î^ALw>nQ!,Ô jÈÉ&VW(KRú)šþ(ýXÛ¥‘…9üÖ@çk—o„gíÄ‚uäaý«?ñ¯DÒ6^lŸ*4¬üóÉÁ‹š@féšˆÜlG´ðh³fÃÓd[bEüYÏï˜“èåLt¯îµ3ÙÙ› 3ŒC£M¿oî³Ó–¹)½/$!(”—ÝU_-ºêýK^!¤_óÍûQüV¡‰Õ@65L£¶~¸ÿ›¨ Á"Í#o‹ùÉ<oÛA=ÁŸú·@ù Û¸˜IV&ccßŒ;uåˆ€1áã4RR†n7ëq`Y8Ã·¼‹3kßüìà÷"]‚¹ªàrDÇÕuuÕ Wá@Qk$êuÞÐn2¸% ñL êË­ QCd ÎúÃÍvsÀÉ¾Ï…WÆW‹`Mà=8ýìPÔi«âKìnÕå6b*ïJPh-q¢éršÇ·Šÿï$ÝÇÍV<ÏßUÞ?ãïpñÙ‡b‚—†·AJù4Dß0¯Q”èÙÇQ«SpéDBø%|ú.¹`<Z*yž“óAŸ”—
<Ëïlu“ãayÍ|úÃÃý? X Ãùjº“4»Is`Ô¤®™5m$C ö<øu§!*¢uñ¹FÄ~YúéÂlÛÝH0ø >z9ý™9ü>ÜöõûÄo÷©·,ÈT$YÙQ›jŸ¡sœýŒ9i7O ñ	à¿ÒÇÃ&kü7&øz ‡úê+ú_¶ÿ)2Óÿ{zð%ëîÞdõ¡çc)*|ßsqPÀaT¯ºa­Û‚tdÍnG€Zë¡47oÀâyl…tKn×DßÒŠ@iIcºŒ"DR¨'É'-”Ò)ÔÇéZ|˜‡û¿`ÏøÆ‡î%ZÖúú
þ-›uûÆbËÛ1|· ?^¡,ãÝ2hTô9>È÷ô^+Ú1®Ånb$ZµªcÄª1‚ŸÖS{\iã˜5)ì4u~Q3ž«%q¡Ô‚|$Sâ-X,L­:ó–¤
ë¦Å8	³DÂ3Ñ*¯ñÉn²X5¾>øß9î¿œfå•»ïÌJg…Ø•”Whffšå	zÙ³^-³€î×,Ì‚§vßæ™æËX–°‘´Ù+ä;è•Ë“°Z$F.…¼4›M‘zù‚¼bþ%)oçPmô]ƒbõ$9ôª:Ÿ	Š=ÚBŠôMÇñRÒÞV<.re]b³j2D²šÄa»)@i± Ø1Óæ¬+
ŽÕ›„+joÆ‰Î4-~^ '6]‚"©b’ÆÞ$LÏlF’ÞÒà[Òö©]?6úðÍÏ"¾N
ö-uið—Ñƒôþ„:`6.Ô{Ád÷AiÀÒn¨|z²‰vÆjhF¾yg‘œžhõŽ…ãQ M²¢qvëëñãhØ¤M–\J`IW i‚kPqVaÔÍ(o¶f5$ø;Í†
Ã"Çá#µ*_MQ×?cTn/Â–@š¢@^[È+mâtö«^!2Q“æhêÉm¾mŠ0¬–ïó©Î ?7/ÅMÎ.Ý®¯à÷¤»ß³0œ=ˆÌ.>ñj£ê)ª#à2›º]h©È àÏZSš -áe[[ê›¶z«·øÖmÅWšIÍDa–ðºÄ¸àEÚõèfï4Pˆ»®EÕ°kMÎ.›ì³á¢4ÌÉ¬#xæÐ/6ªÖdô2p˜ÅÏ6k*†=T˜ÜfÖ„ü<Ù:Úø£{øêk[6˜e-ÞX0šu±Q\êìlýùkÞ\dòÐ‰Ÿ²§üPÚY]ìÄc÷ŸÞói›]m¼}$ÃØRü™¨éUXÅç-²°µÅL³!]?®¸I+•%­.â[ŠxA¿µb¾³”—ªXÄÏÓOcyíå|ÒD+›ÈÃÅ”u»¾²-ÀŽI-
¸Óâ"µ‡2±¢Ñ0	{^¹h4¿‚÷?D9ÈÆ¡ãÃW_~ôúolãîáþ/Ù®©³&ªjð@-Í^¾zëÆí9Ã¼êÓ1Ú0¯öÂßJšuÿ?ësZ†‘:O–ë®%«¼`
]²¬ ˆ‚ï'¬GýF\W{‚›g×Ö÷šI,Þ±J’,†9s1@þv5Rí.b¾Ë(«À(«K.\þÙñàòGdŠO~TõãûÁÕGpò?h+Í}Šr ¨çþy3Ão‹í9ˆ~½ß¨8®áqv‘±9÷üö·: øƒ/½ªöËšH„Æ^O+<ÃæÏë™ÞÐWl[`îbã<Hÿ¬Bfýó¬³áã,GMâÏÂ`¢bU"~(/À¥74áß¦v™°Ã’,V²lÀÃ¸ Y=,v‹ÛSvÉÌ5ÝŒ;€nŒ#æ¿øÎà¡fì»8ƒ#ï²OÞÀ^íùŠ6ûÝÖ]w{ÌD,‹‡Œ˜0#M"`‚¢N³­êñµ +Ó“k63_ˆ7qÇèiCX;TU‘ÊrSäi 5ºI­™çƒeë0é„ k1Ífä¹N3k8¯Jå—BœíÚGX:åôXè·«f¸ìšŠ YMdÞº‚5!=øÓ‘pq:,þ·8	iéŸŠ%NŒFA`O4Bø;6ÔÃ¾ÄÞ.zöm•çB¬óJÆ^Œµ„¶ˆóþ-"!`Ï¸âºÄ… gi‰ïù|¼›ó¹`8É=€È50`6†óè	üouQ»ÂÎÎè.˜®œ§Ë“r2ÛVïõãÄ'áœãï<W,óœ…/Ìó{Vë8ºyx\Å–µG\HaÊÆ™¼4£M¾¾äûºrÑPÀX`¤iØçì¦J>¢g¸½æ6Ä‰.ÁèÿÆ®V5$ì“Má›Y·üýp60S~‰g,’Ý~ô8þ ]ØqgImŠó¬T¯/Þºµ¸Ã?ìúõ•v;áž)Û#‡¼^¦-NA_W› ÛÀÕ@R2\GM•’!¼Q¹«‡«¦òœ#f*	‹Ÿ“óíþö[Mü²€™Ü@b«šgï¢,Âú–¤Ô'üÓ»|oârÂÂý¥òÒrV¤ãêz£·êW1'óü&³­Ù¡ep£rÙ&ËÉ×°€2ÕºþuLÖ­ÐhÜñ.FeÀ>®E½”õ*SŠ¸,e­¯Ôú©ÖWöÒs“Å³gÎeTOÒäÏú¤³–(“Ñ5k‡š_ðÖ¼šÐ
ÂÂŒŽD`Í¬	z—Œú{;£l2Á‘ûãfq«Tô
ó*S‰¥uWÅõNTãÔÛqŽö´©WZ]›q¸Î—Ð†ä’q%Ë”a•8‚)cjÍ²	ˆ(<EžópHÅ">îi>SMê›7½Þ9[íè—ÇÃ)èrœº-…ûnpµš~|It³ž²Ä™ÂÚ§Áù£”ý0qÃ£‡ÕÐ3{!ÖáF‹¡V2UÙVm) »‰-!{cÉhìAj
#æ˜FDg64ÕI~Ïó ¼åÈ=´÷×wØíëüÏ»Ãÿüò6¨ëÿùF‰ó™½Àn_»üi î)Ë¯;°LœEb+±Ðœi0jJï™‚ÞîâÙíx›)÷Ê[ÝzÔb?\LK)€-\;°kE"dá|Àý¶LÜÚÒ$3Bîß'A&¡°ž
wÊL%_6ÎV-Nô7/*0nCX±êâbÅ:>/´“…Êyþg 0s1X”˜¹ìJ…™™kmS±iæ{EE÷ø¯ùÂ‚ìi¯^t©¦¼}¸ÿE3#i­gC¡–;*³HŒñFG“±ÙðUõ˜ó9ßs‡û¿RþC+ðÁb|'¨îA¶Ú#ÙJ}á"s‚´•
¨ 
Z‘îsò­óãèƒÆP`älþiVRtÄ[	Igþ‚¬©4™YÛÝE7 2z½Ã)}6£Îô†Òã£\|à|úý0ßpjÙ¾ªÁå¡Wø°«7£ÍØìbX»ÖPâ&²ºˆïð¾}=ß~{nùÛÃf‰1ãd·´â@áÖ²Þ¾•l™"•©=å;t×$b’K)$ê>C"^Œ­+VÖeöÀ³÷“Fúwü¼ÆÝà+WŽøœÁŒ|é/ÕJ(=B…9ÜáNq3kúû˜•ÝÞ:øe‡õù²k ûLŒY.`ÞËæ´Ì«B•ªtŸ)Ç+”¾kóÖáþ×5!°o;Ä˜ÎÈ«T™3ViZät•i•
ßNíã9õUËyu¬ê®D]é{üÉ¯yeqMkimð7íJ\[a4&DÕipŠŽ“K3×WØMts|"ÄuHhÿ“
÷?eõ4gq¹\ö°»²”)WiÑŠ©Eó)	L^±²‡û cŒð,eÉ­#ä·õ:‡>kéc˜6²À‡‚`C•*6ÒVËúfù~• ’™Fÿð\KKÑ…Š€åk•‚¿uð?üÄúê%{		&ÃÓ).*:†Ê3˜zÃZÈ¥KÉ’F¤L86mz.ežRCõYðôpI6¨HÍ…Â°^²P5¤yçpæ¼'ßyZSÚcè.„)át°ÿOÎØúu„ÁÁ±û^uû>®§v˜÷ÛÎDO”wþÀ];ÜÿõöéÁ?ÞcW_ýÇ=Ô·º\çr’t·ï¢ÂËc>áŒÌg/ñ½Cí¤…´A_64®ÂX!ÔÊÙ×3gtD¨­n…"HgàØ:<A”¯¡
V{Èœ˜6õ`Z*¨†¶î•šÃakå«åíîñ#«_ï/•«qû9	*+è§ˆí]í¹4sL
×,km*ùÝ^Ç÷“(âéšã‘®0ô«Ò˜ï·ºÚ8V z<Ð¬GÎÕÅÆ¹bšRŸ¹¸ât#ž\ï“VR?JÇ^<Y=ã‰Æ	ˆu[`ŒxÑ$†ñdœ­=›á±³{ßŽ¶ž÷Æû›1ÀD”€Š@÷ÄÈ†mâ.8Dc¨#dvÅ$joÎpŒ†‘ÝGF(â³ü°b;Š@Z_ÞÝ)hÄÈÐ€`yÖ`Sžrý¢ÈM¹}¶ëAIÄ­U––KYï[Á÷K¹&HÇª$E;„µ¨~ï‘ÂŽˆÓ¾º¸4nû€Ä¾c*‘Û~(IŸ{—G8÷žsÎ½9Ž‰œz5!wâ$÷|;H…@¤i÷ˆz•ÖÅúÁ:[Ù§ßlÏ6ßÉ—øÌœÐ©×³s}O½ÎQã>ïæp/É4tºuü‰\îâq)>‰£­ñ€òÿ  ÿÿ {m@ª