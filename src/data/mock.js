export const stats = [
  { label: 'Total Anggota', value: 248, change: '+12 minggu ini', tone: 'blue', trend: 'up' },
  { label: 'Tingkat Kehadiran', value: '92,4%', change: '+3,1% vs bulan lalu', tone: 'green', trend: 'up' },
  { label: 'Izin & Cuti', value: 18, change: '-4 minggu ini', tone: 'amber', trend: 'down' },
  { label: 'Terlambat', value: 7, change: '-2 minggu ini', tone: 'rose', trend: 'down' },
]

export const overview = [
  { day: 'Sen', hadir: 232, izin: 10, alpha: 6 },
  { day: 'Sel', hadir: 240, izin: 5, alpha: 3 },
  { day: 'Rab', hadir: 228, izin: 12, alpha: 8 },
  { day: 'Kam', hadir: 246, izin: 2, alpha: 0 },
  { day: 'Jum', hadir: 221, izin: 18, alpha: 9 },
  { day: 'Sab', hadir: 118, izin: 5, alpha: 2 },
  { day: 'Min', hadir: 94, izin: 3, alpha: 1 },
]

export const fields = [
  { id: 1, name: 'Citra', code: 'CTR', leader: 'Raka Pratama' },
  { id: 2, name: 'Kesekretariatan', code: 'KSK', leader: 'Salsabila Putri' },
  { id: 3, name: 'Doktrin', code: 'DKT', leader: 'Dimas Aditya' },
  { id: 4, name: 'Penugasan', code: 'PNG', leader: 'Nadia Rahma' },
  { id: 5, name: 'Aset', code: 'AST', leader: 'Fajar Hidayat' },
];

export const recentActivities = [
  { name: 'Raka Pratama', action: 'checked in', time: '08:32', at: 'Hari ini', initial: 'RP', color: 'green' },
  { name: 'Salsabila Putri', action: 'checked out', time: '17:05', at: 'Hari ini', initial: 'SP', color: 'rose' },
  { name: 'Dimas Aditya', action: 'mengajukan izin', time: '09:10', at: 'Hari ini', initial: 'DA', color: 'amber' },
  { name: 'Nadia Rahma', action: 'checked in', time: '08:15', at: 'Kemarin', initial: 'NR', color: 'green' },
  { name: 'Fajar Hidayat', action: 'checked out', time: '16:48', at: 'Kemarin', initial: 'FH', color: 'rose' },
];

export const members = [
  { id: 1, nim: '10121001', name: 'Raka Pratama', field_id: 1, role: 'Frontend', status: 'Hadir' },
  { id: 2, nim: '10121002', name: 'Salsabila Putri', field_id: 2, role: 'UI/UX', status: 'Hadir' },
  { id: 3, nim: '10121003', name: 'Dimas Aditya', field_id: 3, role: 'Backend', status: 'Izin' },
  { id: 4, nim: '10121004', name: 'Nadia Rahma', field_id: 4, role: 'Bendahara', status: 'Hadir' },
  { id: 5, nim: '10121005', name: 'Fajar Hidayat', field_id: 5, role: 'Content', status: 'Cuti' },
  { id: 6, nim: '10121006', name: 'Gita Ayu', field_id: 1, role: 'QA', status: 'Hadir' },
  { id: 7, nim: '10121007', name: 'Reza Fahlevi', field_id: 2, role: 'Public Relation', status: 'Hadir' },
  { id: 8, nim: '10121008', name: 'Citra Lestari', field_id: 3, role: 'Graphic', status: 'Terlambat' },
]

export const divisions = [
  { id: 'DIV-01', name: 'Pengembangan', field_id: 'FLD-01', anggota: 86, pimpinan: 'Raka Pratama' },
  { id: 'DIV-02', name: 'Desain', field_id: 'FLD-01', anggota: 42, pimpinan: 'Salsabila Putri' },
  { id: 'DIV-03', name: 'Marketing', field_id: 'FLD-01', anggota: 38, pimpinan: 'Fajar Hidayat' },
  { id: 'DIV-04', name: 'Keuangan', field_id: 'FLD-02', anggota: 21, pimpinan: 'Nadia Rahma' },
  { id: 'DIV-05', name: 'Humas', field_id: 'FLD-01', anggota: 30, pimpinan: 'Reza Fahlevi' },
  { id: 'DIV-06', name: 'Operasional', field_id: 'FLD-01', anggota: 31, pimpinan: 'Hendra Wijaya' },
];

export const divisionTemplates = [
  { id: 1, name: 'Ketua Pelaksana' },
  { id: 2, name: 'Wakil Ketua Pelaksana' },
  { id: 3, name: 'Acara' },
  { id: 4, name: 'Konsumsi' },
  { id: 5, name: 'Humas' },
  { id: 6, name: 'Sekretaris' },
  { id: 7, name: 'Bendahara' },
  { id: 8, name: 'PDD' },
  { id: 9, name: 'Medis' },
  { id: 10, name: 'Logistik' },
];
