with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update initial adminSubTab
content = content.replace(
    "const [adminSubTab, setAdminSubTab] = useState('projects');",
    "const [adminSubTab, setAdminSubTab] = useState('budgets');",
    1
)

# 2. Update Mobile Admin order (put Quản lý Ngân sách first)
old_mobile_admin_sub = """                    {isInternalStaff && (
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

new_mobile_admin_sub = """                    {isInternalStaff && (
                      <>
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
                      </>
                    )}"""

# 3. Update Desktop Admin order (put Ngân sách first)
old_desktop_admin_sub = """                  {isInternalStaff && (
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

new_desktop_admin_sub = """                  {isInternalStaff && (
                    <>
                      <Button 
                        variant={adminSubTab === 'budgets' ? 'secondary' : 'ghost'} 
                        size="sm" 
                        className={`rounded-xl h-10 px-4 font-bold ${adminSubTab === 'budgets' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-600'}`}
                        onClick={() => setAdminSubTab('budgets')}
                      >
                        <Wallet className="mr-2 h-4 w-4" /> Ngân sách
                      </Button>
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
                    </>
                  )}"""

assert old_mobile_admin_sub in content, 'old_mobile_admin_sub not found'
assert old_desktop_admin_sub in content, 'old_desktop_admin_sub not found'

content = content.replace(old_mobile_admin_sub, new_mobile_admin_sub, 1)
content = content.replace(old_desktop_admin_sub, new_desktop_admin_sub, 1)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated default tab to Ngân sách successfully')
