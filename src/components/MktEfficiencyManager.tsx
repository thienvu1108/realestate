import React, { useState, useMemo } from 'react';
import { 
  Target, TrendingUp, Users, Calendar, Search, Filter, 
  ChevronDown, ChevronUp, AlertCircle, HelpCircle, 
  Percent, ArrowUpRight, DollarSign, ListFilter, Edit2, 
  Building2, ArrowUpDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MktEfficiencyManagerProps {
  budgets: any[];
  costs: any[];
  projects: any[];
  teams: any[];
  onOpenMktReportDialog: (cost: any) => void;
  isAdmin: boolean;
  isMod: boolean;
  isAccountant: boolean;
  isGDDA: boolean;
  user: any;
  userProfile: any;
}

export function MktEfficiencyManager({
  budgets,
  costs,
  projects,
  teams,
  onOpenMktReportDialog,
  isAdmin,
  isMod,
  isAccountant,
  isGDDA,
  user,
  userProfile
}: MktEfficiencyManagerProps) {
  // Filter states
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Sort state
  const [sortBy, setSortBy] = useState<'month' | 'budget' | 'actual' | 'leads' | 'roi'>('month');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Expanded budgets tracker
  const [expandedBudgets, setExpandedBudgets] = useState<Record<string, boolean>>({});

  const toggleExpand = (budgetId: string) => {
    setExpandedBudgets(prev => ({
      ...prev,
      [budgetId]: !prev[budgetId]
    }));
  };

  // Get unique months list from budgets for the dropdown filter
  const uniqueMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    budgets.forEach(b => {
      if (b.month) monthsSet.add(b.month);
    });
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [budgets]);

  // Aggregate marketing costs matching budgets
  const budgetLogsMapped = useMemo(() => {
    return budgets.map(budget => {
      // Find costs that belong to this budget
      const relatedCosts = costs.filter(c => c.budgetId === budget.id);
      
      // Calculate MKT-specific metrics from these costs
      let totalMktActual = 0;
      let totalLeads = 0;
      let contactedLeads = 0;
      let unconvertedLeads = 0;
      let convertedLeads = 0;
      let conversionRevenue = 0;
      let countWithMktReport = 0;

      relatedCosts.forEach(c => {
        if (c.mktReport) {
          totalMktActual += (c.amount || 0);
          totalLeads += (c.mktReport.totalLeads || 0);
          contactedLeads += (c.mktReport.contactedLeads || 0);
          unconvertedLeads += (c.mktReport.unconvertedLeads || 0);
          convertedLeads += (c.mktReport.convertedLeads || 0);
          conversionRevenue += (c.mktReport.conversionRevenue || 0);
          countWithMktReport++;
        }
      });

      return {
        ...budget,
        relatedCosts,
        totalMktActual,
        totalLeads,
        contactedLeads,
        unconvertedLeads,
        convertedLeads,
        conversionRevenue,
        countWithMktReport,
        // Helper calculation ratios (safe division)
        conversionRate: totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0,
        cpl: totalLeads > 0 ? totalMktActual / totalLeads : 0,
        cac: convertedLeads > 0 ? totalMktActual / convertedLeads : 0,
        roi: totalMktActual > 0 ? (conversionRevenue / totalMktActual) * 100 : 0
      };
    });
  }, [budgets, costs]);

  // Filter budgets based on user selections
  const filteredBudgetLogs = useMemo(() => {
    return budgetLogsMapped.filter(blog => {
      if (selectedProjectId !== 'all' && blog.projectId !== selectedProjectId) return false;
      if (selectedTeamId !== 'all' && blog.teamId !== selectedTeamId) return false;
      if (selectedMonth !== 'all' && blog.month !== selectedMonth) return false;
      
      if (searchTerm) {
        const queryStr = searchTerm.toLowerCase();
        const matchesProject = blog.projectName?.toLowerCase().includes(queryStr);
        const matchesTeam = blog.teamName?.toLowerCase().includes(queryStr);
        const matchesImplementer = blog.implementerName?.toLowerCase().includes(queryStr);
        return matchesProject || matchesTeam || matchesImplementer;
      }
      return true;
    });
  }, [budgetLogsMapped, selectedProjectId, selectedTeamId, selectedMonth, searchTerm]);

  // Sort budgets
  const sortedBudgetLogs = useMemo(() => {
    return [...filteredBudgetLogs].sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortBy === 'month') {
        valA = a.month || '';
        valB = b.month || '';
      } else if (sortBy === 'budget') {
        valA = a.amount || 0;
        valB = b.amount || 0;
      } else if (sortBy === 'actual') {
        valA = a.totalMktActual || 0;
        valB = b.totalMktActual || 0;
      } else if (sortBy === 'leads') {
        valA = a.totalLeads || 0;
        valB = b.totalLeads || 0;
      } else if (sortBy === 'roi') {
        valA = a.roi || 0;
        valB = b.roi || 0;
      }

      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
    });
  }, [filteredBudgetLogs, sortBy, sortOrder]);

  // Overall statistics counters for current filters
  const overallStats = useMemo(() => {
    let totalBudget = 0;
    let totalMktActual = 0;
    let totalLeads = 0;
    let totalContacted = 0;
    let totalUnconverted = 0;
    let totalConverted = 0;
    let totalRevenue = 0;

    sortedBudgetLogs.forEach(blog => {
      totalBudget += (blog.amount || 0);
      totalMktActual += (blog.totalMktActual || 0);
      totalLeads += (blog.totalLeads || 0);
      totalContacted += (blog.contactedLeads || 0);
      totalUnconverted += (blog.unconvertedLeads || 0);
      totalConverted += (blog.convertedLeads || 0);
      totalRevenue += (blog.conversionRevenue || 0);
    });

    return {
      totalBudget,
      totalMktActual,
      totalLeads,
      totalContacted,
      totalUnconverted,
      totalConverted,
      totalRevenue,
      conversionRate: totalLeads > 0 ? (totalConverted / totalLeads) * 100 : 0,
      cpl: totalLeads > 0 ? totalMktActual / totalLeads : 0,
      cac: totalConverted > 0 ? totalMktActual / totalConverted : 0,
      roi: totalMktActual > 0 ? (totalRevenue / totalMktActual) * 100 : 0,
      budgetBurnRate: totalBudget > 0 ? (totalMktActual / totalBudget) * 100 : 0
    };
  }, [sortedBudgetLogs]);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Premium Header Display */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] rounded-[2rem] p-6 sm:p-10 text-white border border-slate-800 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-550/10 via-transparent to-transparent opacity-80 pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 py-0.5 px-3 rounded-full text-[10px] uppercase font-bold tracking-widest font-mono">
                MAYHOMES MARKETING
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight uppercase flex items-center gap-3">
              <Target className="w-8 h-8 text-emerald-550 animate-pulse shrink-0" />
              Quản lý Hiệu quả MKT
            </h1>
            <p className="text-slate-350 font-medium text-xs sm:text-sm max-w-2xl leading-relaxed">
              Theo dõi, giám sát chi phí quảng cáo và tính toán hiệu quả truyền thông ( leads, conversion, doanh số dự kiến, CPL, CAC ) dựa trên kế hoạch đăng ký ngân sách MKT của các đội ngũ kinh doanh theo từng dự án.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards Bento Box Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        
        {/* KPI 1: Budget and Spends */}
        <Card className="rounded-3xl border border-slate-100 shadow-sm bg-white overflow-hidden group">
          <CardContent className="p-4 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="w-4 h-4" />
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-emerald-100 bg-emerald-50/40 text-emerald-600 font-bold">
                {overallStats.budgetBurnRate.toFixed(1)}% Sử dụng
              </Badge>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Tổng Chi phí MKT</p>
              <h3 className="text-base sm:text-xl font-black text-rose-600 font-mono tracking-tight tabular-nums">
                {overallStats.totalMktActual.toLocaleString()} đ
              </h3>
              <p className="text-[9px] text-slate-500 font-medium mt-1">
                Nggân sách đk: <span className="font-bold">{overallStats.totalBudget.toLocaleString()} đ</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Lead Acquisition */}
        <Card className="rounded-3xl border border-slate-100 shadow-sm bg-white overflow-hidden group">
          <CardContent className="p-4 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                <Users className="w-4 h-4" />
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-blue-100 bg-blue-50/40 text-blue-600 font-bold">
                CPL: {Math.round(overallStats.cpl).toLocaleString()} đ
              </Badge>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Tổng Lead Nhận Được</p>
              <h3 className="text-base sm:text-xl font-black text-blue-605 font-mono tracking-tight tabular-nums">
                {overallStats.totalLeads.toLocaleString()} Leads
              </h3>
              <p className="text-[9px] text-slate-500 font-medium mt-1">
                Số đã liên hệ: <span className="font-bold text-blue-700">{overallStats.totalContacted.toLocaleString()}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Conversion Success */}
        <Card className="rounded-3xl border border-slate-100 shadow-sm bg-white overflow-hidden group">
          <CardContent className="p-4 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                <Percent className="w-4 h-4" />
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-indigo-100 bg-indigo-50/40 text-indigo-600 font-bold">
                CAC: {Math.round(overallStats.cac).toLocaleString()} đ
              </Badge>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Số Lead Chuyển Đổi</p>
              <h3 className="text-base sm:text-xl font-black text-indigo-600 font-mono tracking-tight tabular-nums">
                {overallStats.totalConverted.toLocaleString()} Chốt ({overallStats.conversionRate.toFixed(1)}%)
              </h3>
              <p className="text-[9px] text-slate-500 font-medium mt-1">
                Số chưa chốt: <span className="font-bold text-slate-700">{overallStats.totalUnconverted.toLocaleString()}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Financial Yield */}
        <Card className="rounded-3xl border border-slate-100 shadow-sm bg-white overflow-hidden group">
          <CardContent className="p-4 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="w-4 h-4" />
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-amber-100 bg-amber-50/40 text-amber-600 font-bold">
                ROI: {overallStats.roi.toFixed(1)}%
              </Badge>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Doanh Số Dự Kiến</p>
              <h3 className="text-base sm:text-xl font-black text-emerald-600 font-mono tracking-tight tabular-nums">
                {overallStats.totalRevenue.toLocaleString()} đ
              </h3>
              <p className="text-[9px] text-slate-500 font-medium mt-1">
                Tỉ lệ doanh số/chi phí: <span className="font-bold text-emerald-700">+{Math.round(overallStats.totalRevenue / 1000000)}M đ</span>
              </p>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Control Filter Panel Card */}
      <Card className="rounded-3xl border border-slate-100 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
            <ListFilter className="w-4 h-4 text-indigo-500" />
            <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Bộ lọc & Công cụ tìm kiếm nhanh</h4>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Filter 1: Project */}
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Dự án</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="h-10 text-xs font-bold rounded-xl border-slate-200 bg-slate-50/50 hover:bg-slate-50">
                  <SelectValue placeholder="Tất cả dự án" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] rounded-xl">
                  <SelectItem value="all">Tất cả dự án</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter 2: Team */}
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Phòng kinh doanh / Team</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger className="h-10 text-xs font-bold rounded-xl border-slate-200 bg-slate-50/50 hover:bg-slate-50">
                  <SelectValue placeholder="Tất cả các phòng" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] rounded-xl">
                  <SelectItem value="all">Tất cả các phòng</SelectItem>
                  {teams.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter 3: Month */}
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Tháng chi phí</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-10 text-xs font-bold rounded-xl border-slate-200 bg-slate-50/50 hover:bg-slate-50">
                  <SelectValue placeholder="Tất cả các tháng" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] rounded-xl">
                  <SelectItem value="all">Tất cả các tháng</SelectItem>
                  {uniqueMonths.map(m => (
                    <SelectItem key={m} value={m}>Tháng {m.split('-')[1]}/{m.split('-')[0]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter 4: Text search */}
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Tìm kiếm</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Nhập tên dự án, team, người đăng ký..."
                  className="h-10 pl-9 text-xs rounded-xl border-slate-200 bg-slate-50/50"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Main Budget Group Record list */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-500" />
              Kế hoạch Ngân sách & Tiến độ báo cáo MKT ({sortedBudgetLogs.length})
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">Bản ghi ngân sách đăng ký quảng cáo và kết quả thực tế tương ứng của từng đội</p>
          </div>
          
          {/* Header sorting controls */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Sắp xếp:</span>
            <button 
              onClick={() => handleSort('month')} 
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border flex items-center gap-1 transition-all ${sortBy === 'month' ? 'bg-slate-900 border-slate-950 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Tháng {sortBy === 'month' && <ArrowUpDown className="w-2.5 h-2.5" />}
            </button>
            <button 
              onClick={() => handleSort('budget')} 
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border flex items-center gap-1 transition-all ${sortBy === 'budget' ? 'bg-slate-900 border-slate-950 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Ngân sách {sortBy === 'budget' && <ArrowUpDown className="w-2.5 h-2.5" />}
            </button>
            <button 
              onClick={() => handleSort('actual')} 
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border flex items-center gap-1 transition-all ${sortBy === 'actual' ? 'bg-slate-900 border-slate-950 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Thực tế {sortBy === 'actual' && <ArrowUpDown className="w-2.5 h-2.5" />}
            </button>
            <button 
              onClick={() => handleSort('leads')} 
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border flex items-center gap-1 transition-all ${sortBy === 'leads' ? 'bg-slate-900 border-slate-950 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              Leads {sortBy === 'leads' && <ArrowUpDown className="w-2.5 h-2.5" />}
            </button>
            <button 
              onClick={() => handleSort('roi')} 
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border flex items-center gap-1 transition-all ${sortBy === 'roi' ? 'bg-slate-900 border-slate-950 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              ROI % {sortBy === 'roi' && <ArrowUpDown className="w-2.5 h-2.5" />}
            </button>
          </div>
        </div>

        {/* List of budgets with inner marketing summary */}
        {sortedBudgetLogs.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center text-slate-400 text-xs italic font-semibold max-w-full">
            Không tìm thấy bản ghi ngân sách đăng ký quảng cáo nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div className="space-y-4">
            {sortedBudgetLogs.map(blog => {
              const isExpanded = !!expandedBudgets[blog.id];
              const burnRatio = blog.amount > 0 ? (blog.totalMktActual / blog.amount) * 105 : 0;
              
              return (
                <div key={blog.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300 hover:border-slate-200">
                  
                  {/* Budget primary Header card bar */}
                  <div 
                    onClick={() => toggleExpand(blog.id)} 
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 select-none transition-colors"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="p-2 rounded-2xl bg-slate-100 text-slate-600 font-mono text-[10px] font-extrabold w-11 h-11 flex flex-col items-center justify-center shrink-0">
                        <span className="leading-none text-slate-400">T.</span>
                        <span className="text-xs leading-none text-slate-800">{blog.month?.split('-')[1]}</span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-black text-[#1A4BAC] text-sm uppercase leading-tight">{blog.projectName}</h4>
                          <span className="text-slate-300 text-xs font-light">/</span>
                          <span className="text-xs font-bold text-slate-700 bg-slate-100 rounded-md px-1.5 py-0.5">{blog.teamName}</span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 font-medium">
                          <span>Người đề xuất: <span className="font-bold text-slate-600">{blog.implementerName || 'N/A'}</span></span>
                          <span className="text-slate-200">•</span>
                          <span>Tháng tài khóa: <span className="font-extrabold text-indigo-600">{blog.month}</span></span>
                        </div>
                      </div>
                    </div>

                    {/* Numeric and target indicators */}
                    <div className="flex flex-wrap md:flex-nowrap items-center gap-4 sm:gap-6 ml-14 md:ml-0">
                      
                      {/* Budget values */}
                      <div className="text-right">
                        <div className="text-[9px] font-bold text-slate-450 uppercase tracking-wider">Ngân sách ĐK</div>
                        <div className="font-mono text-xs sm:text-sm font-black text-slate-800 tabular-nums">
                          {blog.amount?.toLocaleString()} đ
                        </div>
                      </div>

                      {/* Actual Spends */}
                      <div className="text-right">
                        <div className="text-[9px] font-bold text-slate-450 uppercase tracking-wider">Thực chi MKT</div>
                        <div className="font-mono text-xs sm:text-sm font-black text-rose-600 tabular-nums">
                          {blog.totalMktActual?.toLocaleString()} đ
                        </div>
                        {blog.amount > 0 && (
                          <div className={`text-[8.5px] font-extrabold ${blog.totalMktActual > blog.amount ? 'text-red-650' : 'text-emerald-600'}`}>
                            {((blog.totalMktActual / blog.amount) * 100).toFixed(1)}% Sử dụng
                          </div>
                        )}
                      </div>

                      {/* Leads stats preview */}
                      <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5 text-center min-w-[90px]">
                        <div>
                          <div className="text-[8px] font-semibold text-slate-400 uppercase tracking-wider leading-none mb-0.5">MKT Leads</div>
                          <div className="text-xs font-black text-blue-600 font-mono tracking-tight tabular-nums">
                            {blog.convertedLeads || 0}/{blog.totalLeads || 0}
                          </div>
                          <div className="text-[7px] text-slate-500 font-bold tracking-tighter">
                            {blog.conversionRate.toFixed(0)}% Chuyển đổi
                          </div>
                        </div>
                      </div>

                      {/* Estimated yield revenue estimate */}
                      <div className="text-right min-w-[80px]">
                        <div className="text-[8.5px] font-black text-emerald-600 flex items-center gap-0.5 justify-end">
                          <ArrowUpRight className="w-3 h-3 animate-pulse" /> Doanh thu dự kiến
                        </div>
                        <div className="font-mono text-xs sm:text-sm font-extrabold text-emerald-600 tabular-nums">
                          {blog.conversionRevenue > 0 ? `${blog.conversionRevenue.toLocaleString()}đ` : '-'}
                        </div>
                        <div className="text-[7.5px] font-bold text-slate-400">
                          ROI: {blog.roi.toFixed(0)}%
                        </div>
                      </div>

                      {/* Expand action */}
                      <div className="text-slate-450">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 bg-slate-100 rounded-full p-0.5" />
                        ) : (
                          <ChevronDown className="w-5 h-5 hover:bg-slate-100 hover:text-slate-800 rounded-full p-0.5 transition-all" />
                        )}
                      </div>

                    </div>
                  </div>

                  {/* Collapsible Panel for details */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                        <div className="space-y-0.5">
                          <h5 className="text-xs font-black uppercase text-slate-700 tracking-wider">Chi chiết các khoản chi phí thực tế ({blog.relatedCosts.length})</h5>
                          <p className="text-[9px] text-slate-400">Danh sách chứng từ chi chi tiết được đội ngũ kinh doanh nhập và báo cáo hiệu quả</p>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 text-[9px] font-bold text-slate-500">
                          <span className="bg-white border rounded-lg px-2 py-1">CPL trung bình: <strong className="text-blue-600 font-mono">{Math.round(blog.cpl).toLocaleString()}đ</strong></span>
                          <span className="bg-white border rounded-lg px-2 py-1">CAC trung bình: <strong className="text-indigo-600 font-mono">{Math.round(blog.cac).toLocaleString()}đ</strong></span>
                        </div>
                      </div>

                      {blog.relatedCosts.length === 0 ? (
                        <div className="text-center py-6 text-[11px] text-slate-400 italic">
                          Chưa ghi nhận khoản chi cụ thể nào liên kết với ngân sách này.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50/80 border-b border-slate-100 text-[9.5px] font-black text-slate-500 uppercase tracking-wider">
                                <th className="p-3 pl-4">Nội dung chi phí & ID</th>
                                <th className="p-3 text-right">Chi phí Chi ra</th>
                                <th className="p-3 text-center">Thời gian Báo cáo MKT</th>
                                <th className="p-3 text-center">Tổng Lead nhận</th>
                                <th className="p-3 text-center">Đã liên hệ</th>
                                <th className="p-3 text-center">Đã chuyển đổi</th>
                                <th className="p-3 text-right">Doanh thu dự kiến</th>
                                <th className="p-3 text-center">Chi tiết lý do</th>
                                <th className="p-3 pr-4 text-center">Thao tác</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                              {blog.relatedCosts.map((c: any) => (
                                <tr key={c.id} className="hover:bg-slate-50/40 transition-colors">
                                  
                                  {/* Description */}
                                  <td className="p-3 pl-4">
                                    <div className="font-extrabold text-slate-800 text-[11px] leading-snug">{c.description}</div>
                                    <div className="text-[7.5px] text-slate-450 font-mono mt-0.5 flex items-center gap-1.5">
                                      <span>ID: {c.id}</span>
                                      <span>•</span>
                                      <span>Kênh: <span className="font-bold text-slate-600 uppercase">{c.channel || 'Khác'}</span></span>
                                    </div>
                                  </td>
                                  
                                  {/* Amount */}
                                  <td className="p-3 text-right font-mono font-black text-rose-600 tabular-nums">
                                    {c.amount?.toLocaleString()}đ
                                  </td>

                                  {/* Report range */}
                                  <td className="p-3 text-center font-mono text-[10px] text-slate-600 tabular-nums">
                                    {c.mktReport?.startDate || c.mktReport?.endDate ? (
                                      <div className="inline-flex items-center gap-1 bg-slate-100/50 rounded px-1.5 py-0.5 text-[9px] font-bold border">
                                        {c.mktReport.startDate ? c.mktReport.startDate.split('-').reverse().join('/') : '?'} - {c.mktReport.endDate ? c.mktReport.endDate.split('-').reverse().join('/') : '?'}
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 font-semibold">-</span>
                                    )}
                                  </td>

                                  {/* Total leads */}
                                  <td className="p-3 text-center font-mono font-bold text-blue-700 tabular-nums">
                                    {c.mktReport?.totalLeads !== undefined ? c.mktReport.totalLeads.toLocaleString() : '-'}
                                  </td>

                                  {/* Contacted leads */}
                                  <td className="p-3 text-center font-mono text-slate-700 tabular-nums">
                                    {c.mktReport?.contactedLeads !== undefined ? c.mktReport.contactedLeads.toLocaleString() : '-'}
                                  </td>

                                  {/* Converted Leads */}
                                  <td className="p-3 text-center">
                                    {c.mktReport?.convertedLeads !== undefined ? (
                                      <div className="flex flex-col items-center">
                                        <span className="font-mono font-black text-emerald-600 tabular-nums">
                                          {c.mktReport.convertedLeads}
                                        </span>
                                        {c.mktReport.totalLeads > 0 && (
                                          <span className="text-[8px] font-black text-emerald-700 bg-emerald-50 px-1 rounded-sm">
                                            {((c.mktReport.convertedLeads / c.mktReport.totalLeads) * 100).toFixed(0)}%
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 font-semibold">-</span>
                                    )}
                                  </td>

                                  {/* Predicted Revenue */}
                                  <td className="p-3 text-right font-mono font-black text-emerald-600 tabular-nums">
                                    {c.mktReport?.conversionRevenue ? (
                                      <span>{c.mktReport.conversionRevenue.toLocaleString()}đ</span>
                                    ) : (
                                      <span className="text-slate-400 font-normal">-</span>
                                    )}
                                  </td>

                                  {/* Unconverted Reason */}
                                  <td className="p-3 text-slate-500 text-[10px] max-w-[150px] truncate" title={c.mktReport?.unconvertedReason}>
                                    {c.mktReport?.unconvertedReason || '-'}
                                  </td>

                                  {/* Quick Actions */}
                                  <td className="p-3 pr-4 text-center">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-7 w-7 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                      onClick={() => onOpenMktReportDialog(c)}
                                      title="Cập nhật báo cáo Hiệu quả MKT"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </td>

                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
