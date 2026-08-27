with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Loader2 and Edit to lucide-react imports if not present
old_lucide = """  FolderKanban
} from 'lucide-react';"""

new_lucide = """  FolderKanban,
  Loader2,
  Edit
} from 'lucide-react';"""

if old_lucide in content:
    content = content.replace(old_lucide, new_lucide, 1)

# 2. Remove teamMemberCounts and filteredAdminTeams from line ~1418
old_early_declarations = """  const teamMemberCounts = useMemo(() => {
    const map: Record<string, number> = {};
    users.forEach(u => {
      if (u.teamId) {
        map[u.teamId] = (map[u.teamId] || 0) + 1;
      }
      if (u.teamName) {
        map[u.teamName] = (map[u.teamName] || 0) + 1;
      }
    });
    return map;
  }, [users]);

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
  }, [teams, teamSearch, adminTeamBlockFilter, adminTeamSort, teamMemberCounts]);"""

assert old_early_declarations in content, 'old_early_declarations not found'
content = content.replace(old_early_declarations, '', 1)

# 3. Add teamMemberCounts and filteredAdminTeams after adminTeamSort and adminTeamBlockFilter
target_state_location = """  const [adminTeamBlockFilter, setAdminTeamBlockFilter] = useState('all');
  const [adminTeamSort, setAdminTeamSort] = useState<'name-asc' | 'name-desc' | 'code-asc' | 'date-desc' | 'members-desc'>('name-asc');
  const [isImportingTeams, setIsImportingTeams] = useState(false);
  const [newTeamBlockId, setNewTeamBlockId] = useState('none');"""

replacement_with_computations = """  const [adminTeamBlockFilter, setAdminTeamBlockFilter] = useState('all');
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
  }, [teams, teamSearch, adminTeamBlockFilter, adminTeamSort, teamMemberCounts]);"""

assert target_state_location in content, 'target_state_location not found'
content = content.replace(target_state_location, replacement_with_computations, 1)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed App types, imports, and positions successfully')
