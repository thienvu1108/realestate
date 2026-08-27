with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Mobile Admin Menu
# Remove Báo cáo, Chi phí, Hiệu quả
old_mobile_admin = """                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2.5 mb-1.5">DANH MỤC QUẢN TRỊ</p>
                  
                  <div className="space-y-1 pl-1">
                    <button
                      onClick={() => { setAdminSubTab('reports'); setIsMobileMenuOpen(false); }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all touch-manipulation",
                        adminSubTab === 'reports' ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                      <span>Báo cáo Quản trị</span>
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
                          <span>Quản lý Dự án</span>
                        </button>

                        <button
                          onClick={() => { setAdminSubTab('teams'); setIsMobileMenuOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all touch-manipulation",
                            adminSubTab === 'teams' ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <Users className="w-3.5 h-3.5 shrink-0" />
                          <span>Quản lý Team</span>
                        </button>

                        <button
                          onClick={() => { setAdminSubTab('acceptance'); setIsMobileMenuOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all touch-manipulation",
                            adminSubTab === 'acceptance' ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <FileCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>Nghiệm thu MKT</span>
                        </button>

                        <button
                          onClick={() => { setAdminSubTab('budgets'); setIsMobileMenuOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all touch-manipulation",
                            adminSubTab === 'budgets' ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <Wallet className="w-3.5 h-3.5 shrink-0" />
                          <span>Quản lý Ngân sách</span>
                        </button>

                        <button
                          onClick={() => { setAdminSubTab('costs'); setIsMobileMenuOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all touch-manipulation",
                            adminSubTab === 'costs' ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                          <span>Quản lý Chi phí</span>
                        </button>

                        <button
                          onClick={() => { setAdminSubTab('efficiency'); setIsMobileMenuOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all touch-manipulation",
                            adminSubTab === 'efficiency' ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <Target className="w-3.5 h-3.5 shrink-0" />
                          <span>Quản lý Hiệu quả</span>
                        </button>

                      </>
                    )}"""

new_mobile_admin = """                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2.5 mb-1.5">DANH MỤC QUẢN TRỊ</p>
                  
                  <div className="space-y-1 pl-1">
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
                          <span>Quản lý Dự án</span>
                        </button>

                        <button
                          onClick={() => { setAdminSubTab('teams'); setIsMobileMenuOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all touch-manipulation",
                            adminSubTab === 'teams' ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <Users className="w-3.5 h-3.5 shrink-0" />
                          <span>Quản lý Team</span>
                        </button>

                        <button
                          onClick={() => { setAdminSubTab('acceptance'); setIsMobileMenuOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all touch-manipulation",
                            adminSubTab === 'acceptance' ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <FileCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>Nghiệm thu MKT</span>
                        </button>

                        <button
                          onClick={() => { setAdminSubTab('budgets'); setIsMobileMenuOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all touch-manipulation",
                            adminSubTab === 'budgets' ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <Wallet className="w-3.5 h-3.5 shrink-0" />
                          <span>Quản lý Ngân sách</span>
                        </button>
                      </>
                    )}"""

assert old_mobile_admin in content, 'old_mobile_admin not found'
content = content.replace(old_mobile_admin, new_mobile_admin, 1)

# 2. Update Desktop Admin Menu
old_desktop_admin = """                <div className="flex items-center gap-2 min-w-max">
                  <Button 
                    variant={adminSubTab === 'reports' ? 'secondary' : 'ghost'} 
                    size="sm"
                    className={`rounded-xl h-10 px-6 font-black transition-all duration-300 ${
                      adminSubTab === 'reports' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    onClick={() => setAdminSubTab('reports')}
                  >
                    <BarChart3 className="mr-2 h-4 w-4" /> Báo cáo
                  </Button>

                  <div className="h-6 w-px bg-slate-200 mx-1" />

                  {isInternalStaff && (
                    <>
                      <Button 
                        variant={adminSubTab === 'projects' ? 'secondary' : 'ghost'} 
                        size="sm"
                        className={`rounded-xl h-10 px-4 font-bold ${adminSubTab === 'projects' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600'}`}
                        onClick={() => setAdminSubTab('projects')}
                      >
                        <Building2 className="mr-2 h-4 w-4" /> Dự án
                      </Button>
                      <Button 
                        variant={adminSubTab === 'teams' ? 'secondary' : 'ghost'} 
                        size="sm"
                        className={`rounded-xl h-10 px-4 font-bold ${adminSubTab === 'teams' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-600'}`}
                        onClick={() => setAdminSubTab('teams')}
                      >
                        <Users className="mr-2 h-4 w-4" /> Quản lý Team
                      </Button>
                      <Button 
                        variant={adminSubTab === 'acceptance' ? 'secondary' : 'ghost'} 
                        size="sm"
                        className={`rounded-xl h-10 px-4 font-bold ${adminSubTab === 'acceptance' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600'}`}
                        onClick={() => setAdminSubTab('acceptance')}
                      >
                        <FileCheck className="mr-2 h-4 w-4" /> Nghiệm thu MKT
                      </Button>
                      <Button 
                        variant={adminSubTab === 'budgets' ? 'secondary' : 'ghost'} 
                        size="sm" 
                        className={`rounded-xl h-10 px-4 font-bold ${adminSubTab === 'budgets' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-600'}`}
                        onClick={() => setAdminSubTab('budgets')}
                      >
                        <Wallet className="mr-2 h-4 w-4" /> Ngân sách
                      </Button>
                      <Button 
                        variant={adminSubTab === 'costs' ? 'secondary' : 'ghost'} 
                        size="sm" 
                        className={`rounded-xl h-10 px-4 font-bold ${adminSubTab === 'costs' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-600'}`}
                        onClick={() => setAdminSubTab('costs')}
                      >
                        <TrendingUp className="mr-2 h-4 w-4" /> Chi phí
                      </Button>
                      <Button 
                        variant={adminSubTab === 'efficiency' ? 'secondary' : 'ghost'} 
                        size="sm"
                        className={`rounded-xl h-10 px-4 font-bold ${adminSubTab === 'efficiency' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-600'}`}
                        onClick={() => setAdminSubTab('efficiency')}
                      >
                        <Target className="mr-2 h-4 w-4" /> Hiệu quả
                      </Button>
                    </>
                  )}"""

new_desktop_admin = """                <div className="flex items-center gap-2 min-w-max">
                  {isInternalStaff && (
                    <>
                      <Button 
                        variant={adminSubTab === 'projects' ? 'secondary' : 'ghost'} 
                        size="sm"
                        className={`rounded-xl h-10 px-4 font-bold ${adminSubTab === 'projects' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600'}`}
                        onClick={() => setAdminSubTab('projects')}
                      >
                        <Building2 className="mr-2 h-4 w-4" /> Dự án
                      </Button>
                      <Button 
                        variant={adminSubTab === 'teams' ? 'secondary' : 'ghost'} 
                        size="sm"
                        className={`rounded-xl h-10 px-4 font-bold ${adminSubTab === 'teams' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-600'}`}
                        onClick={() => setAdminSubTab('teams')}
                      >
                        <Users className="mr-2 h-4 w-4" /> Quản lý Team
                      </Button>
                      <Button 
                        variant={adminSubTab === 'acceptance' ? 'secondary' : 'ghost'} 
                        size="sm"
                        className={`rounded-xl h-10 px-4 font-bold ${adminSubTab === 'acceptance' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600'}`}
                        onClick={() => setAdminSubTab('acceptance')}
                      >
                        <FileCheck className="mr-2 h-4 w-4" /> Nghiệm thu MKT
                      </Button>
                      <Button 
                        variant={adminSubTab === 'budgets' ? 'secondary' : 'ghost'} 
                        size="sm" 
                        className={`rounded-xl h-10 px-4 font-bold ${adminSubTab === 'budgets' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-600'}`}
                        onClick={() => setAdminSubTab('budgets')}
                      >
                        <Wallet className="mr-2 h-4 w-4" /> Ngân sách
                      </Button>
                    </>
                  )}"""

assert old_desktop_admin in content, 'old_desktop_admin not found'
content = content.replace(old_desktop_admin, new_desktop_admin, 1)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated Admin navigation successfully')
