import fs from 'fs';

const filePath = 'src/App.tsx';
const currentContent = fs.readFileSync(filePath, 'utf8');

const missingContent = `              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                     <TableHead className="text-center w-[40px] font-black text-[10px] text-slate-400 uppercase">STT</TableHead>
                     <TableHead className="min-w-[150px] font-black text-[10px] text-slate-400 uppercase">Team / Dự án</TableHead>
                     <TableHead className="text-right font-black text-[10px] text-slate-400 uppercase">Facebook</TableHead>
                     <TableHead className="text-right font-black text-[10px] text-slate-400 uppercase">Zalo</TableHead>
                     <TableHead className="text-right font-black text-[10px] text-slate-400 uppercase">Google</TableHead>
                     <TableHead className="text-right font-black text-[10px] text-slate-400 uppercase">Đăng tin</TableHead>
                     <TableHead className="text-right font-black text-[10px] text-slate-400 uppercase">Khác</TableHead>
                     <TableHead className="text-right font-black text-[10px] bg-emerald-50/50 text-emerald-600 uppercase">Quyết toán</TableHead>
                     <TableHead className="text-center font-black text-[10px] text-slate-400 uppercase">Trạng thái</TableHead>
                     <TableHead className="text-right font-black text-[10px] text-slate-400 uppercase pr-4">Ngày chốt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAcceptances.map((a: any, index: number) => (
                    <TableRow key={a.id} className="hover:bg-slate-50/50 transition-colors">
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
                      <TableCell className="text-right bg-emerald-50/30">
                        <p className="font-mono text-xs font-black text-emerald-700">{formatCurrency(a.afterAcceptanceCost)}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border-none bg-emerald-100 text-emerald-700">
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <span className="text-[10px] font-bold text-slate-500">
                          {a.finalizedAt ? format(new Date(a.finalizedAt), 'dd/MM/yyyy HH:mm') : '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredAcceptances.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="h-40 text-center text-slate-300 italic">
                        Chưa có dữ liệu đã quyết toán
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-white p-8 space-y-6">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto ring-8 ring-rose-50/30">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            <div className="space-y-2 text-center">
              <h3 className="text-xl font-black text-slate-900 leading-none">Xác nhận xóa?</h3>
              <p className="text-sm font-bold text-slate-500 leading-relaxed px-4">
                Hành động này không thể hoàn tác. Dữ liệu nghiệm thu sẽ bị xóa vĩnh viễn khỏi hệ thống.
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 h-12 rounded-2xl border-slate-200 text-slate-600 font-black tracking-wide"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Hủy bỏ
              </Button>
              <Button 
                className="flex-1 h-12 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black tracking-wide shadow-lg shadow-rose-200"
                onClick={handleDeleteAcceptance}
              >
                Xác nhận xóa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AcceptanceManager;`;

fs.writeFileSync(filePath, currentContent + missingContent);
console.log('Successfully restored the end of src/App.tsx');
