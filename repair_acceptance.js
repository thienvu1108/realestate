import fs from 'fs';

const filePath = 'src/App.tsx';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Clean table structure
const replacement = `            {acceptanceListView === 'pending' ? (
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                     {(isAdmin || isSuperAdmin) && (
                       <TableHead className="w-[40px] px-4">
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-300 h-4 w-4"
                            checked={filteredAcceptances.length > 0 && selectedAcceptanceIds.length === filteredAcceptances.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAcceptanceIds(filteredAcceptances.map((a: any) => a.id));
                              } else {
                                setSelectedAcceptanceIds([]);
                              }
                            }}
                          />
                       </TableHead>
                     )}
                     <TableHead className="text-center w-[40px] font-black text-[10px] text-slate-400 uppercase">STT</TableHead>
                     <TableHead className="min-w-[150px] font-black text-[10px] text-slate-400 uppercase">Team / Dự án</TableHead>
                     <TableHead className="text-right font-black text-[10px] text-slate-400 uppercase">Facebook</TableHead>
                     <TableHead className="text-right font-black text-[10px] text-slate-400 uppercase">Zalo</TableHead>
                     <TableHead className="text-right font-black text-[10px] text-slate-400 uppercase">Google</TableHead>
                     <TableHead className="text-right font-black text-[10px] text-slate-400 uppercase">Đăng tin</TableHead>
                     <TableHead className="text-right font-black text-[10px] text-slate-400 uppercase">Khác</TableHead>
                     <TableHead className="text-right font-black text-[10px] bg-amber-50/50 text-amber-600 uppercase">Tạm tính</TableHead>
                     <TableHead className="text-right font-black text-[10px] bg-emerald-50/50 text-emerald-600 uppercase">Thực thu</TableHead>
                     <TableHead className="text-center font-black text-[10px] text-slate-400 uppercase">Trạng thái</TableHead>
                     <TableHead className="text-right font-black text-[10px] text-slate-400 uppercase pr-4">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAcceptances.map((a: any, index: number) => (
                    <React.Fragment key={a.id}>
                      <TableRow className={\`hover:bg-slate-50/50 transition-colors group \${expandingAcceptance === a.id ? 'bg-indigo-50/30' : ''}\`}>
                        {(isAdmin || isSuperAdmin) && (
                          <TableCell className="px-4">
                            <input 
                              type="checkbox" 
                              className="rounded border-slate-300 h-4 w-4"
                              checked={selectedAcceptanceIds.includes(a.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAcceptanceIds(prev => [...prev, a.id]);
                                } else {
                                  setSelectedAcceptanceIds(prev => prev.filter(id => id !== a.id));
                                }
                              }}
                            />
                          </TableCell>
                        )}
                        <TableCell className="text-center font-mono text-[10px] text-slate-400">{index + 1}</TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-900 text-xs truncate max-w-[150px]">{a.projectName}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[9px] h-4 px-1 border-slate-200 text-slate-500 font-bold">{a.teamName}</Badge>
                              <span className="text-[9px] font-bold text-slate-400">{a.month}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-[10px] font-bold text-slate-600">{formatCurrency(a.facebookCost)}</TableCell>
                        <TableCell className="text-right font-mono text-[10px] font-bold text-slate-600">{formatCurrency(a.zaloCost)}</TableCell>
                        <TableCell className="text-right font-mono text-[10px] font-bold text-slate-600">{formatCurrency(a.googleCost)}</TableCell>
                        <TableCell className="text-right font-mono text-[10px] font-bold text-slate-600">{formatCurrency(a.postingCost)}</TableCell>
                        <TableCell className="text-right font-mono text-[10px] font-bold text-slate-600">{formatCurrency(a.otherCost + a.visaCost + a.digitalCost)}</TableCell>
                        <TableCell className="text-right bg-amber-50/30">
                          <p className="font-mono text-xs font-black text-amber-700">{formatCurrency(a.totalCost)}</p>
                        </TableCell>
                        <TableCell className="text-right bg-emerald-50/30">
                          <p className="font-mono text-xs font-black text-emerald-700">
                             {a.status === 'Đã nghiệm thu' ? formatCurrency(a.afterAcceptanceCost) : '-'}
                          </p>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={\`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border-none \${
                            a.status === 'Đã nghiệm thu' 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-amber-100 text-amber-700'
                          }\`}>
                            {a.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant={a.status !== 'Đã nghiệm thu' ? "default" : "ghost"}
                              size="sm"
                              className={\`h-8 px-2 text-[10px] font-black uppercase rounded-lg transition-all \${
                                a.status !== 'Đã nghiệm thu' 
                                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100' 
                                  : 'text-slate-400 hover:text-indigo-600'
                              } \${expandingAcceptance === a.id ? 'ring-2 ring-indigo-200 ring-offset-1' : ''}\`}
                              onClick={() => setExpandingAcceptance(expandingAcceptance === a.id ? null : a.id)}
                            >
                              {a.status !== 'Đã nghiệm thu' ? 'Nghiệm thu' : 'Chi tiết'}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-400 hover:text-indigo-600"
                              onClick={() => {
                                setEditingAcceptance(a);
                                setAcceptanceMonth(a.month);
                                setAcceptanceTeam(a.teamId);
                                setAcceptanceProject(a.projectId);
                                
                                const flatEntries: any[] = [];
                                if (a.breakdown) {
                                  Object.keys(a.breakdown).forEach(channel => {
                                    if (Array.isArray(a.breakdown[channel])) {
                                      a.breakdown[channel].forEach((item: any) => {
                                        flatEntries.push({
                                          id: Math.random().toString(36).substring(7),
                                          channel,
                                          account: item.account || '',
                                          amount: formatCurrencyInput(String(item.amount || 0)),
                                          isConfirmed: item.isConfirmed || false,
                                          finalAmount: item.finalAmount
                                        });
                                      });
                                    }
                                  });
                                }
                                
                                if (flatEntries.length === 0) {
                                  const legacyFields = [
                                    { key: 'facebook', val: a.facebookCost },
                                    { key: 'zalo', val: a.zaloCost },
                                    { key: 'google', val: a.googleCost },
                                    { key: 'posting', val: a.postingCost },
                                    { key: 'visa', val: a.visaCost },
                                    { key: 'digital', val: a.digitalCost },
                                    { key: 'other', val: a.otherCost },
                                  ];
                                  legacyFields.forEach(f => {
                                    if (f.val > 0) {
                                      flatEntries.push({
                                        id: Math.random().toString(36).substring(7),
                                        channel: f.key,
                                        account: 'Hệ thống',
                                        amount: formatCurrencyInput(String(f.val))
                                      });
                                    }
                                  });
                                }
                                setEntries(flatEntries.length > 0 ? flatEntries : [{ id: Math.random().toString(36).substring(7), channel: 'facebook', account: '', amount: '' }]);
                                setAcceptanceStatus(a.status);
                                setAcceptanceType(a.acceptanceType || 'Chi phí không đổi');
                                setAcceptanceRealCost(formatCurrencyInput(String(a.afterAcceptanceCost)));
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            {(isAdmin || isSuperAdmin) && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-slate-400 hover:text-red-600 transition-colors"
                                onClick={() => {
                                  setAcceptanceToDelete(a.id);
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandingAcceptance === a.id && (
                        <TableRow className="bg-indigo-50/20 border-t-0 animate-in slide-in-from-top-1 duration-300">
                          <TableCell colSpan={(isAdmin || isSuperAdmin) ? 12 : 11} className="p-0">
                            <div className="p-6 border-x-2 border-indigo-200/50 m-2 bg-white rounded-2xl shadow-xl shadow-indigo-100/50">
                               <div className="grid grid-cols-2 gap-8">
                                 <div className="space-y-4">
                                   <div className="flex items-center gap-2 mb-2">
                                     <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                                     <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest px-1">Chi tiết phân bổ chi phí</h4>
                                   </div>
                                   <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                      {Object.keys(a.breakdown || {}).map(channel => (
                                        <div key={channel} className="space-y-1">
                                          {(a.breakdown[channel] || []).map((item: any, i: number) => (
                                            <div key={i} className={\`flex items-center justify-between p-3 rounded-xl border \${item.isConfirmed ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'} hover:border-indigo-200 transition-colors\`}>
                                              <div className="flex items-center gap-3">
                                                <Badge variant="outline" className="text-[9px] font-black uppercase bg-white">{channel}</Badge>
                                                <span className="text-xs font-bold text-slate-700">{item.account}</span>
                                              </div>
                                              <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                  <p className="text-[10px] font-black text-slate-400 line-through opacity-50">{formatCurrency(item.amount)}</p>
                                                  <p className="text-xs font-black text-indigo-600">{formatCurrency(item.finalAmount || item.amount)}</p>
                                                </div>
                                                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-100">
                                                  <Button 
                                                    size="icon" 
                                                    variant="ghost" 
                                                    className={\`h-6 w-10 text-[9px] font-black \${item.isConfirmed ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-indigo-600'}\`}
                                                    onClick={() => toggleEntryConfirmation(a.id, channel, i)}
                                                  >
                                                    {item.isConfirmed ? 'OK' : 'Xác nhận'}
                                                  </Button>
                                                  <Input 
                                                    className="w-24 h-6 text-right text-[10px] font-black font-mono border-none bg-slate-50 rounded"
                                                    value={editingBreakdownValues[\`\${a.id}-\${channel}-\${i}\`] || formatCurrencyInput(String(item.finalAmount || item.amount))}
                                                    onChange={e => {
                                                      const val = formatCurrencyInput(e.target.value);
                                                      setEditingBreakdownValues(prev => ({...prev, [\`\${a.id}-\${channel}-\${i}\`]: val}));
                                                      updateBreakdownAmount(a.id, channel, i, val);
                                                    }}
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ))}
                                   </div>
                                 </div>

                                 <div className="space-y-6">
                                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loại NT</span>
                                        <Select 
                                          value={a.acceptanceType || 'Chi phí không đổi'} 
                                          onValueChange={(val) => {
                                            updateDoc(doc(db, 'acceptances', a.id), { 
                                              acceptanceType: val,
                                              afterAcceptanceCost: val === 'Chi phí không đổi' ? a.totalCost : a.afterAcceptanceCost
                                            });
                                          }}
                                        >
                                          <SelectTrigger className="w-[160px] h-8 bg-white border-slate-200 rounded-lg text-[10px] font-black uppercase">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="Chi phí không đổi">Chi phí không đổi</SelectItem>
                                            <SelectItem value="Chi phí thay đổi">Chi phí thay đổi</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiền thực NT</span>
                                        <div className="w-[160px] relative">
                                          <Input 
                                            className="h-8 text-right font-black font-mono text-indigo-700 bg-white border-slate-200 rounded-lg pr-4"
                                            value={formatCurrency(a.afterAcceptanceCost)}
                                            readOnly 
                                          />
                                        </div>
                                      </div>

                                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Lệch quyết toán</span>
                                        <span className={\`text-xs font-black font-mono \${(a.afterAcceptanceCost - a.totalCost) < 0 ? 'text-rose-600' : 'text-emerald-600'}\`}>
                                          {(a.afterAcceptanceCost - a.totalCost) > 0 ? '+' : ''}{formatCurrency(a.afterAcceptanceCost - a.totalCost)}
                                        </span>
                                      </div>
                                   </div>

                                   <Button 
                                      className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-100 transition-all gap-2"
                                      disabled={isFinalizing === a.id}
                                      onClick={() => handleFinalizeAcceptance(a)}
                                   >
                                      {isFinalizing === a.id ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                                      CHỐT SỐ LIỆU & QUYẾT TOÁN
                                   </Button>
                                   <p className="text-[9px] text-center text-slate-400 font-bold px-4 italic leading-relaxed uppercase tracking-tighter">
                                     Hành động này sẽ đóng bảng nghiệm thu tháng này và chuyển dữ liệu sang báo cáo thực tế chính thức
                                   </p>
                                 </div>
                               </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                  {filteredAcceptances.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={(isAdmin || isSuperAdmin) ? 12 : 11} className="h-40 text-center text-slate-300 italic">
                        Không tìm thấy dữ liệu nghiệm thu phù hợp
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            ) : (`;

const newLines = [
  ...lines.slice(0, 13561), // Up to line 13561
  replacement,
  ...lines.slice(14085) // From line 14085 onwards
];

fs.writeFileSync(filePath, newLines.join('\\n'));
console.log('Successfully repaired src/App.tsx');
