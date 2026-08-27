with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Find and replace <TabsContent value="teams">
start_teams = content.find('<TabsContent value="teams"')
end_teams = content.find('<TabsContent value="acceptance"', start_teams)
assert start_teams != -1, 'start_teams not found'
assert end_teams != -1, 'end_teams not found'

teams_block_new = """<TabsContent value="teams" className="space-y-6">
                  {adminSubTab === 'teams' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      {/* Top Header Card */}
                      <Card className="border border-slate-200/80 shadow-sm bg-white overflow-hidden rounded-2xl">
                        <CardHeader className="bg-gradient-to-r from-purple-50 via-indigo-50/40 to-white border-b border-slate-100 py-5 px-6">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-md shadow-purple-200">
                                <Users className="w-6 h-6" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-xl font-black text-slate-900">Quản lý Danh mục Team / Phòng KD</CardTitle>
                                  <Badge className="bg-purple-100 text-purple-800 border-purple-200 font-bold px-2.5 py-0.5 rounded-full text-xs">
                                    {teams.length} teams
                                  </Badge>
                                </div>
                                <CardDescription className="text-xs text-slate-500 mt-0.5">
                                  Quản lý danh sách phòng kinh doanh, mã team, khối trực thuộc và phân bổ nhân sự
                                </CardDescription>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExportTeams}
                                className="h-9 rounded-xl font-bold border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-purple-600 shadow-sm"
                              >
                                <Download className="w-4 h-4 mr-1.5" />
                                Xuất Excel
                              </Button>

                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept=".xlsx, .xls, .csv"
                                  className="hidden"
                                  onChange={handleImportTeamsCSV}
                                  disabled={isImportingTeams}
                                />
                                <div className="h-9 px-3.5 inline-flex items-center justify-center rounded-xl font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-purple-600 text-xs shadow-sm transition-colors cursor-pointer">
                                  {isImportingTeams ? (
                                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin text-purple-600" />
                                  ) : (
                                    <FileUp className="w-4 h-4 mr-1.5 text-purple-600" />
                                  )}
                                  <span>{isImportingTeams ? 'Đang nhập...' : 'Nhập Excel'}</span>
                                </div>
                              </label>

                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    className="h-9 rounded-xl font-black bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-200 px-4"
                                  >
                                    <Plus className="w-4 h-4 mr-1.5" />
                                    Thêm Team
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md rounded-2xl">
                                  <DialogHeader>
                                    <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                                      <Users className="w-5 h-5 text-purple-600" />
                                      Thêm Team / Phòng Kinh Doanh Mới
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-slate-500">
                                      Nhập tên phòng KD hoặc danh sách (mỗi dòng một team). Có thể gõ định dạng <code>Tên Team - Mã Team</code>.
                                    </DialogDescription>
                                  </DialogHeader>

                                  <form onSubmit={handleAddTeam} className="space-y-4 pt-2">
                                    <div className="space-y-2">
                                      <Label className="text-xs font-bold text-slate-700">Tên Team / Phòng KD *</Label>
                                      <textarea
                                        value={newTeamName}
                                        onChange={(e) => setNewTeamName(e.target.value)}
                                        placeholder={"Ví dụ:\\nPhòng KD 1\\nPhòng KD 2 - PKD2\\nTeam Marketing - MKT"}
                                        rows={4}
                                        className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
                                        required
                                      />
                                      <p className="text-[11px] text-slate-400">
                                        Mẹo: Bạn có thể dán nhiều dòng cùng lúc để tạo nhanh nhiều team.
                                      </p>
                                    </div>

                                    <div className="space-y-2">
                                      <Label className="text-xs font-bold text-slate-700">Trực thuộc Khối (Tùy chọn)</Label>
                                      <Select value={newTeamBlockId} onValueChange={setNewTeamBlockId}>
                                        <SelectTrigger className="h-10 rounded-xl border-slate-200 text-sm">
                                          <SelectValue placeholder="Chọn Khối trực thuộc" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">-- Không phân Khối (Tự do) --</SelectItem>
                                          {blocks.map((b) => (
                                            <SelectItem key={b.id} value={b.id}>
                                              {b.name || b.blockCode} ({b.blockCode || 'Chưa có mã'})
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <DialogFooter className="pt-3 gap-2">
                                      <Button
                                        type="submit"
                                        disabled={isAddingTeam || !newTeamName.trim()}
                                        className="w-full h-10 rounded-xl font-black bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-200"
                                      >
                                        {isAddingTeam ? (
                                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                          <Plus className="w-4 h-4 mr-2" />
                                        )}
                                        Xác nhận thêm
                                      </Button>
                                    </DialogFooter>
                                  </form>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        </CardHeader>

                        {/* Search & Filter bar */}
                        <CardContent className="p-4 bg-slate-50/50 border-b border-slate-100">
                          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                            <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
                              <div className="relative flex-1">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <Input
                                  value={teamSearch}
                                  onChange={(e) => setTeamSearch(e.target.value)}
                                  placeholder="Tìm kiếm team theo tên, mã phòng, mã khối..."
                                  className="h-10 pl-9 rounded-xl border-slate-200 bg-white text-sm"
                                />
                                {teamSearch && (
                                  <button
                                    onClick={() => setTeamSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>

                              <div className="w-full sm:w-56">
                                <Select value={adminTeamBlockFilter} onValueChange={setAdminTeamBlockFilter}>
                                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-bold">
                                    <SelectValue placeholder="Lọc theo Khối" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">Tất cả Khối ({teams.length})</SelectItem>
                                    <SelectItem value="unassigned">Chưa phân khối ({teams.filter(t => !t.blockId).length})</SelectItem>
                                    {blocks.map((b) => (
                                      <SelectItem key={b.id} value={b.id}>
                                        {b.name || b.blockCode} ({teams.filter(t => t.blockId === b.id || t.blockCode === b.blockCode).length})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="w-full sm:w-48">
                                <Select value={adminTeamSort} onValueChange={(v: any) => setAdminTeamSort(v)}>
                                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-xs font-bold">
                                    <SelectValue placeholder="Sắp xếp" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="name-asc">Tên Team (A - Z)</SelectItem>
                                    <SelectItem value="name-desc">Tên Team (Z - A)</SelectItem>
                                    <SelectItem value="code-asc">Mã Team (A - Z)</SelectItem>
                                    <SelectItem value="members-desc">Nhiều nhân sự nhất</SelectItem>
                                    <SelectItem value="date-desc">Mới tạo gần đây</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>

                          {/* Selected Batch Action Bar */}
                          {selectedTeamIds.length > 0 && (
                            <div className="mt-3 p-3 bg-purple-50 rounded-xl border border-purple-200 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
                              <div className="flex items-center gap-2">
                                <CheckSquare className="w-4 h-4 text-purple-700" />
                                <span className="text-xs font-black text-purple-900">
                                  Đã chọn {selectedTeamIds.length} / {teams.length} team
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedTeamIds([])}
                                  className="h-8 rounded-lg text-xs font-bold border-purple-200 text-purple-700 hover:bg-purple-100"
                                >
                                  Bỏ chọn
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={handleBulkDeleteTeams}
                                  className="h-8 rounded-lg text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                                  Xóa {selectedTeamIds.length} team đã chọn
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>

                        {/* Teams Table */}
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-slate-50/80 hover:bg-slate-50 border-b border-slate-200 text-slate-700">
                                <TableHead className="w-12 text-center">
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                    checked={filteredAdminTeams.length > 0 && filteredAdminTeams.every(t => selectedTeamIds.includes(t.id))}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        const visibleIds = filteredAdminTeams.map(t => t.id);
                                        setSelectedTeamIds(prev => Array.from(new Set([...prev, ...visibleIds])));
                                      } else {
                                        const visibleIdsSet = new Set(filteredAdminTeams.map(t => t.id));
                                        setSelectedTeamIds(prev => prev.filter(id => !visibleIdsSet.has(id)));
                                      }
                                    }}
                                  />
                                </TableHead>
                                <TableHead className="w-14 text-xs font-black text-slate-700">#</TableHead>
                                <TableHead className="w-32 text-xs font-black text-slate-700">MÃ TEAM</TableHead>
                                <TableHead className="text-xs font-black text-slate-700 min-w-[200px]">TÊN TEAM / PHÒNG KD</TableHead>
                                <TableHead className="text-xs font-black text-slate-700 min-w-[160px]">KHỐI TRỰC THUỘC</TableHead>
                                <TableHead className="text-xs font-black text-slate-700 text-center w-36">NHÂN SỰ</TableHead>
                                <TableHead className="text-xs font-black text-slate-700 w-32">NGÀY TẠO</TableHead>
                                <TableHead className="text-xs font-black text-slate-700 text-right w-28 pr-6">THAO TÁC</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredAdminTeams.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={8} className="text-center py-12">
                                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-400">
                                      <Users className="w-10 h-10 mb-3 text-slate-300" />
                                      <p className="text-sm font-bold text-slate-700">Không tìm thấy team nào</p>
                                      <p className="text-xs text-slate-400 mt-1">
                                        {teamSearch || adminTeamBlockFilter !== 'all'
                                          ? 'Hãy thử thay đổi từ khóa tìm kiếm hoặc bỏ bộ lọc Khối'
                                          : 'Chưa có dữ liệu team. Bấm "Thêm Team" hoặc "Nhập Excel" để bắt đầu.'}
                                      </p>
                                      {(teamSearch || adminTeamBlockFilter !== 'all') && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => { setTeamSearch(''); setAdminTeamBlockFilter('all'); }}
                                          className="mt-3 rounded-xl text-xs font-bold"
                                        >
                                          Xóa bộ lọc
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ) : (
                                filteredAdminTeams.map((team, idx) => {
                                  const isSelected = selectedTeamIds.includes(team.id);
                                  const isEditing = editingTeamId === team.id;
                                  const memberCount = teamMemberCounts[team.id] || teamMemberCounts[team.name] || 0;
                                  const matchedBlock = blocks.find(b => b.id === team.blockId || (team.blockCode && b.blockCode === team.blockCode));

                                  return (
                                    <TableRow
                                      key={team.id}
                                      className={cn(
                                        "transition-colors hover:bg-slate-50/80 border-b border-slate-100",
                                        isSelected && "bg-purple-50/50"
                                      )}
                                    >
                                      {/* Selection Checkbox */}
                                      <TableCell className="text-center">
                                        <input
                                          type="checkbox"
                                          className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                          checked={isSelected}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setSelectedTeamIds(prev => [...prev, team.id]);
                                            } else {
                                              setSelectedTeamIds(prev => prev.filter(id => id !== team.id));
                                            }
                                          }}
                                        />
                                      </TableCell>

                                      {/* STT */}
                                      <TableCell className="text-xs font-mono font-bold text-slate-400">
                                        {idx + 1}
                                      </TableCell>

                                      {/* Mã Team */}
                                      <TableCell>
                                        {isEditing ? (
                                          <Input
                                            value={editingTeamCode}
                                            onChange={(e) => setEditingTeamCode(e.target.value)}
                                            placeholder="Mã team"
                                            className="h-8 text-xs font-mono uppercase font-bold border-purple-300 focus:border-purple-500 rounded-lg bg-white"
                                          />
                                        ) : (
                                          <Badge className="font-mono bg-purple-50 text-purple-700 border-purple-200/80 font-bold px-2 py-0.5 rounded-lg text-[11px]">
                                            {team.teamCode || extractTeamCode(team.name) || '---'}
                                          </Badge>
                                        )}
                                      </TableCell>

                                      {/* Tên Team */}
                                      <TableCell>
                                        {isEditing ? (
                                          <Input
                                            value={editingTeamName}
                                            onChange={(e) => setEditingTeamName(e.target.value)}
                                            placeholder="Tên team"
                                            className="h-8 text-xs font-bold border-purple-300 focus:border-purple-500 rounded-lg bg-white"
                                          />
                                        ) : (
                                          <div className="flex flex-col">
                                            <span className="font-black text-slate-900 text-sm">{team.name}</span>
                                            {team.leaderName && (
                                              <span className="text-[11px] text-slate-400 font-medium">Trưởng nhóm: {team.leaderName}</span>
                                            )}
                                          </div>
                                        )}
                                      </TableCell>

                                      {/* Khối trực thuộc */}
                                      <TableCell>
                                        {isEditing ? (
                                          <Select value={editingTeamBlockId} onValueChange={setEditingTeamBlockId}>
                                            <SelectTrigger className="h-8 rounded-lg border-purple-300 text-xs">
                                              <SelectValue placeholder="Chọn Khối" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="none">-- Chưa phân khối --</SelectItem>
                                              {blocks.map((b) => (
                                                <SelectItem key={b.id} value={b.id}>
                                                  {b.name || b.blockCode}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        ) : matchedBlock ? (
                                          <Badge variant="outline" className="bg-indigo-50/60 text-indigo-700 border-indigo-200 font-bold text-xs px-2.5 py-1 rounded-lg">
                                            <Layers className="w-3 h-3 mr-1 text-indigo-500" />
                                            {matchedBlock.name || matchedBlock.blockCode}
                                          </Badge>
                                        ) : (
                                          <span className="text-xs text-slate-400 italic">Chưa phân khối</span>
                                        )}
                                      </TableCell>

                                      {/* Số nhân sự */}
                                      <TableCell className="text-center">
                                        <Badge
                                          variant="secondary"
                                          className={cn(
                                            "font-bold text-xs px-2.5 py-0.5 rounded-full",
                                            memberCount > 0
                                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                              : "bg-slate-100 text-slate-400"
                                          )}
                                        >
                                          <Users className="w-3 h-3 mr-1 inline" />
                                          {memberCount} thành viên
                                        </Badge>
                                      </TableCell>

                                      {/* Ngày tạo */}
                                      <TableCell className="text-xs text-slate-500 font-mono">
                                        {team.createdAt ? safeFormat(team.createdAt, 'dd/MM/yyyy') : '---'}
                                      </TableCell>

                                      {/* Thao tác */}
                                      <TableCell className="text-right pr-6">
                                        {isEditing ? (
                                          <div className="flex items-center justify-end gap-1">
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                              onClick={() => handleUpdateTeam(team.id, editingTeamName, editingTeamCode, editingTeamBlockId)}
                                              title="Lưu thay đổi"
                                            >
                                              <Check className="w-4 h-4" />
                                            </Button>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-8 w-8 text-slate-400 hover:bg-slate-100 rounded-lg"
                                              onClick={() => setEditingTeamId(null)}
                                              title="Hủy"
                                            >
                                              <X className="w-4 h-4" />
                                            </Button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center justify-end gap-1">
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-8 w-8 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                              onClick={() => {
                                                setEditingTeamId(team.id);
                                                setEditingTeamName(team.name);
                                                setEditingTeamCode(team.teamCode || extractTeamCode(team.name));
                                                setEditingTeamBlockId(team.blockId || 'none');
                                              }}
                                              title="Chỉnh sửa thông tin team"
                                            >
                                              <Edit className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                              onClick={() => handleDeleteTeam(team.id, team.name)}
                                              title="Xóa team"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                          </div>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })
                              )}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Footer Summary */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
                          <div>
                            Hiển thị <span className="font-bold text-slate-800">{filteredAdminTeams.length}</span> trong tổng số <span className="font-bold text-slate-800">{teams.length}</span> team
                          </div>
                          {teams.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleDeleteAllTeams}
                                className="h-7 text-[11px] font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Xóa tất cả các Team
                              </Button>
                            </div>
                          )}
                        </div>
                      </Card>
                    </div>
                  )}
                </TabsContent>

                """

content = content[:start_teams] + teams_block_new + content[end_teams:]

# 2. Find and remove <TabsContent value="costs"> and <TabsContent value="reports"> under Admin
start_costs = content.find('{/* Manage Costs Tab */}')
if start_costs == -1:
    start_costs = content.find('<TabsContent value="costs"')

start_users = content.find('{(isAdmin || isAccountant) && (\n                <TabsContent value="users"')
if start_users == -1:
    start_users = content.find('<TabsContent value="users"')

assert start_costs != -1, 'start_costs not found'
assert start_users != -1, 'start_users not found'
content = content[:start_costs] + content[start_users:]

# 3. Find and remove <TabsContent value="actual"> and <TabsContent value="mkt-efficiency">
start_actual = content.find('{/* Actual Cost Tab */}')
if start_actual == -1:
    start_actual = content.find('<TabsContent value="actual"')

start_report_nt = content.find('{/* Báo cáo NT Tab */}')
if start_report_nt == -1:
    start_report_nt = content.find('<TabsContent value="report-nt"')

assert start_actual != -1, 'start_actual not found'
assert start_report_nt != -1, 'start_report_nt not found'
content = content[:start_actual] + content[start_report_nt:]

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Applied all TabsContent changes successfully')
