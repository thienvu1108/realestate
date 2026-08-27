import sys

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace handleAddTeam
old_handleAddTeam = """  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || isAddingTeam) return;
    
    const names = newTeamName.split('\\n').map(n => n.trim()).filter(n => n !== '');
    if (names.length === 0) return;

    setIsAddingTeam(true);
    toast.info(`Đang thêm ${names.length} team...`);
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
      toast.success(`Đã thêm ${successCount} team mới`);
    }
    if (duplicateCount > 0) {
      toast.warning(`${duplicateCount} team đã tồn tại và bị bỏ qua`);
    }
  };"""

new_handleAddTeam = """  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || isAddingTeam) return;
    
    const names = newTeamName.split('\\n').map(n => n.trim()).filter(n => n !== '');
    if (names.length === 0) return;

    setIsAddingTeam(true);
    toast.info(`Đang thêm ${names.length} team...`);
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
      toast.success(`Đã thêm ${successCount} team mới thành công`);
    }
    if (duplicateCount > 0) {
      toast.warning(`${duplicateCount} team đã tồn tại và bị bỏ qua`);
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
          toast.error("File Excel không có dữ liệu.");
          return;
        }

        let count = 0;
        let duplicateCount = 0;
        const existingNames = new Set(teams.map(t => (t.name || '').toLowerCase().trim()));

        for (let i = 0; i < rawJson.length; i++) {
          const rowData = rawJson[i];
          const row: any = {};
          Object.keys(rowData).forEach(k => {
            const cleanKey = k.trim().toLowerCase().normalize('NFC').replace(/\\s+/g, '').replace(/^\\uFEFF/, '');
            row[cleanKey] = rowData[k];
          });

          const getVal = (possibleKeys: string[]) => {
            for (const pk of possibleKeys) {
              const cleanPK = pk.trim().toLowerCase().normalize('NFC').replace(/\\s+/g, '').replace(/^\\uFEFF/, '');
              if (row[cleanPK] !== undefined && row[cleanPK] !== '') return row[cleanPK];
            }
            return undefined;
          };

          const name = String(getVal(['Tên Team', 'Tên phòng', 'Tên đội', 'Team', 'name', 'tên team', 'tên phòng', 'tên']) || '').trim();
          if (!name) continue;

          const normalized = normalizeTeamName(name);
          if (existingNames.has(normalized.toLowerCase())) {
            duplicateCount++;
            continue;
          }

          const rawCode = String(getVal(['Mã Team', 'Mã phòng', 'Mã', 'teamCode', 'mã team', 'mã phòng', 'code']) || '').trim();
          const teamCode = rawCode ? normalizeTeamCode(rawCode) : normalizeTeamCode(extractTeamCode(normalized));

          const rawBlock = String(getVal(['Khối', 'Mã Khối', 'blockCode', 'block', 'khối', 'mã khối']) || '').trim();
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

        if (count > 0) toast.success(`Đã nhập thành công ${count} team từ Excel!`);
        if (duplicateCount > 0) toast.warning(`${duplicateCount} team đã tồn tại và bị bỏ qua.`);
      } catch (err) {
        console.error("Import teams error:", err);
        toast.error("Lỗi khi đọc file Excel.");
      } finally {
        setIsImportingTeams(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };"""

assert old_handleAddTeam in content, 'old_handleAddTeam not found'
content = content.replace(old_handleAddTeam, new_handleAddTeam, 1)

# Replace handleUpdateTeam
old_handleUpdateTeam = """  const handleUpdateTeam = async (id: string, newName: string, newCode: string) => {
    if (!newName.trim()) return;
    try {
      await updateDoc(doc(db, 'teams', id), { 
        name: newName,
        teamCode: newCode || '',
        updatedAt: serverTimestamp() 
      });
      await logAction('UPDATE', 'teams', id, { name: newName, teamCode: newCode });
      setEditingTeamId(null);
      toast.success('Đã cập nhật team');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'teams');
    }
  };"""

new_handleUpdateTeam = """  const handleUpdateTeam = async (id: string, newName: string, newCode: string, newBlockId?: string) => {
    if (!newName.trim()) {
      toast.error('Tên team không được để trống');
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
      toast.success('Đã cập nhật team thành công');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'teams');
    }
  };"""

assert old_handleUpdateTeam in content, 'old_handleUpdateTeam not found'
content = content.replace(old_handleUpdateTeam, new_handleUpdateTeam, 1)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated handleAddTeam, handleImportTeamsCSV, and handleUpdateTeam successfully')
