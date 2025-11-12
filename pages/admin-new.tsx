import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';

interface User {
  id_card: string;
  full_name: string;
  password: string;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  // Form states
  const [formData, setFormData] = useState({
    id_card: '',
    full_name: ''
  });

  const [csvData, setCsvData] = useState('');

  useEffect(() => {
    checkAdminAccess();
    loadUsers();
  }, []);

  const checkAdminAccess = async () => {
    const userData = localStorage.getItem('user_data');
    
    // ตรวจสอบว่าเป็น admin หรือไม่ (ใส่เลขบัตรประชาชนของ admin ตรงนี้)
    if (!userData) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userData);
    if (user.id_card !== '1234567890123') { // เปลี่ยนเป็นเลขบัตรประชาชนของ admin
      alert('ไม่มีสิทธิ์เข้าถึงหน้านี้');
      router.push('/ebook');
      return;
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_ebook')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      alert('ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // ตรวจสอบเลขบัตรประชาชน
      if (formData.id_card.length !== 13 || !/^\d+$/.test(formData.id_card)) {
        alert('เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก');
        return;
      }

      // รหัสผ่านจะถูกสร้างอัตโนมัติโดย trigger ในฐานข้อมูล
      const { error } = await supabase
        .from('user_ebook')
        .insert([{
          id_card: formData.id_card,
          full_name: formData.full_name
        }]);

      if (error) throw error;

      alert('เพิ่มผู้ใช้สำเร็จ');
      setShowAddForm(false);
      setFormData({
        id_card: '', 
        full_name: ''
      });
      loadUsers();
    } catch (error: any) {
      console.error('Error adding user:', error);
      alert('เกิดข้อผิดพลาด: ' + error.message);
    }
  };

  const handleBulkImport = async () => {
    try {
      const lines = csvData.trim().split('\n');
      const users = [];

      for (let i = 1; i < lines.length; i++) { // ข้าม header
        const [id_card, full_name] = lines[i].split(',');
        
        if (id_card && full_name) {
          const cleanIdCard = id_card.trim();
          const cleanFullName = full_name.trim();
          
          // ตรวจสอบเลขบัตรประชาชน
          if (cleanIdCard.length === 13 && /^\d+$/.test(cleanIdCard)) {
            users.push({
              id_card: cleanIdCard,
              full_name: cleanFullName
            });
          }
        }
      }

      if (users.length === 0) {
        alert('ไม่พบข้อมูลที่ถูกต้องใน CSV');
        return;
      }

      const { error } = await supabase
        .from('user_ebook')
        .insert(users);

      if (error) throw error;

      alert(`เพิ่มผู้ใช้ ${users.length} คน สำเร็จ`);
      setShowBulkImport(false);
      setCsvData('');
      loadUsers();
    } catch (error: any) {
      console.error('Error bulk import:', error);
      alert('เกิดข้อผิดพลาดในการ import: ' + error.message);
    }
  };

  const toggleUserActive = async (idCard: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_ebook')
        .update({ is_active: !currentStatus })
        .eq('id_card', idCard);

      if (error) throw error;
      loadUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  const deleteSelectedUsers = async () => {
    if (!confirm(`ต้องการลบผู้ใช้ ${selectedUsers.length} คน หรือไม่?`)) return;

    try {
      const { error } = await supabase
        .from('user_ebook')
        .delete()
        .in('id_card', selectedUsers);

      if (error) throw error;
      
      alert('ลบผู้ใช้สำเร็จ');
      setSelectedUsers([]);
      loadUsers();
    } catch (error: any) {
      console.error('Error deleting users:', error);
      alert('เกิดข้อผิดพลาดในการลบ: ' + error.message);
    }
  };

  const filteredUsers = users.filter(user => 
    user.id_card.includes(searchTerm) ||
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white' }}>
        กำลังโหลด...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: 'white', padding: 20 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
          <h1 style={{ fontSize: 28, margin: 0 }}>จัดการผู้ใช้งาน eBook</h1>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => router.push('/ebook')} style={{ padding: '8px 16px', background: '#6b7280', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              กลับไป eBook
            </button>
          </div>
        </div>

        {/* การค้นหาและปุ่มต่างๆ */}
        <div style={{ display: 'flex', gap: 15, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="ค้นหาเลขบัตรประชาชน หรือ ชื่อ-นามสกุล..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, minWidth: 300, padding: 10, borderRadius: 6, border: '1px solid #374151', background: '#1f2937', color: 'white' }}
          />
          <button onClick={() => setShowAddForm(true)} style={{ padding: '10px 20px', background: '#22c55e', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            + เพิ่มผู้ใช้
          </button>
          <button onClick={() => setShowBulkImport(true)} style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            📂 Import CSV
          </button>
          {selectedUsers.length > 0 && (
            <button onClick={deleteSelectedUsers} style={{ padding: '10px 20px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              ลบที่เลือก ({selectedUsers.length})
            </button>
          )}
        </div>

        {/* สถิติ */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
          <div style={{ padding: 15, background: '#1f2937', borderRadius: 8, flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#22c55e' }}>{users.length}</div>
            <div style={{ fontSize: 14, opacity: 0.8 }}>ผู้ใช้ทั้งหมด</div>
          </div>
          <div style={{ padding: 15, background: '#1f2937', borderRadius: 8, flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#3b82f6' }}>{users.filter(u => u.is_active).length}</div>
            <div style={{ fontSize: 14, opacity: 0.8 }}>ผู้ใช้ที่ใช้งานได้</div>
          </div>
          <div style={{ padding: 15, background: '#1f2937', borderRadius: 8, flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#f59e0b' }}>{users.filter(u => u.last_login).length}</div>
            <div style={{ fontSize: 14, opacity: 0.8 }}>เคยเข้าใช้งาน</div>
          </div>
        </div>

        {/* ตารางผู้ใช้ */}
        <div style={{ background: '#1f2937', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#374151' }}>
                  <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #4b5563' }}>
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers(filteredUsers.map(u => u.id_card));
                        } else {
                          setSelectedUsers([]);
                        }
                      }}
                      checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    />
                  </th>
                  <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #4b5563' }}>เลขบัตรประชาชน</th>
                  <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #4b5563' }}>ชื่อ-นามสกุล</th>
                  <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #4b5563' }}>รหัสผ่าน</th>
                  <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #4b5563' }}>สถานะ</th>
                  <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #4b5563' }}>การใช้งานล่าสุด</th>
                  <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #4b5563' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id_card} style={{ borderBottom: '1px solid #374151' }}>
                    <td style={{ padding: 12 }}>
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id_card)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, user.id_card]);
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== user.id_card));
                          }
                        }}
                      />
                    </td>
                    <td style={{ padding: 12, fontFamily: 'monospace' }}>{user.id_card}</td>
                    <td style={{ padding: 12 }}>{user.full_name}</td>
                    <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 14 }}>{user.password}</td>
                    <td style={{ padding: 12 }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: 4, 
                        fontSize: 12,
                        background: user.is_active ? '#22c55e' : '#ef4444',
                        color: 'white'
                      }}>
                        {user.is_active ? 'ใช้งานได้' : 'ปิดใช้งาน'}
                      </span>
                    </td>
                    <td style={{ padding: 12, fontSize: 14 }}>
                      {user.last_login ? new Date(user.last_login).toLocaleDateString('th-TH') : '-'}
                    </td>
                    <td style={{ padding: 12 }}>
                      <button
                        onClick={() => toggleUserActive(user.id_card, user.is_active)}
                        style={{ 
                          padding: '4px 8px', 
                          background: user.is_active ? '#ef4444' : '#22c55e',
                          color: 'white', 
                          border: 'none', 
                          borderRadius: 4, 
                          cursor: 'pointer',
                          fontSize: 12
                        }}
                      >
                        {user.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredUsers.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', opacity: 0.7 }}>
              ไม่พบข้อมูลผู้ใช้
            </div>
          )}
        </div>
      </div>

      {/* Modal เพิ่มผู้ใช้ */}
      {showAddForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1f2937', padding: 30, borderRadius: 12, width: 500, maxWidth: '90vw' }}>
            <h2 style={{ marginBottom: 20 }}>เพิ่มผู้ใช้ใหม่</h2>
            <form onSubmit={handleAddUser}>
              <div style={{ marginBottom: 15 }}>
                <label style={{ display: 'block', marginBottom: 5, fontSize: 14 }}>เลขบัตรประชาชน (13 หลัก) *</label>
                <input
                  type="text"
                  required
                  value={formData.id_card}
                  onChange={(e) => setFormData({...formData, id_card: e.target.value.replace(/\D/g, '').slice(0, 13)})}
                  placeholder="1234567890123"
                  maxLength={13}
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #374151', background: '#111827', color: 'white', fontFamily: 'monospace' }}
                />
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 5 }}>
                  รหัสผ่าน: {formData.id_card.length >= 10 ? formData.id_card.slice(-10) : 'กรอกเลขบัตรประชาชนให้ครบ'}
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 5, fontSize: 14 }}>ชื่อ-นามสกุล *</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  placeholder="นาย ทดสอบ ระบบ"
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #374151', background: '#111827', color: 'white' }}
                />
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 5 }}>
                  ลายน้ำ: {formData.full_name || 'กรอกชื่อ-นามสกุล'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddForm(false)} style={{ padding: '10px 20px', background: '#6b7280', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                  ยกเลิก
                </button>
                <button type="submit" style={{ padding: '10px 20px', background: '#22c55e', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                  เพิ่มผู้ใช้
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Import CSV */}
      {showBulkImport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1f2937', padding: 30, borderRadius: 12, width: 600, maxWidth: '90vw' }}>
            <h2 style={{ marginBottom: 20 }}>Import ผู้ใช้จากไฟล์ CSV</h2>
            <div style={{ marginBottom: 15, fontSize: 14, opacity: 0.8 }}>
              รูปแบบ CSV: id_card,full_name
            </div>
            <div style={{ marginBottom: 15, fontSize: 12, opacity: 0.6, background: '#111827', padding: 10, borderRadius: 4, fontFamily: 'monospace' }}>
              ตัวอย่าง:<br/>
              id_card,full_name<br/>
              1234567890123,นาย ทดสอบ ระบบ<br/>
              9876543210987,นาง สมมุติ ทดลอง
            </div>
            <textarea
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              placeholder="วางข้อมูล CSV ที่นี่..."
              style={{ width: '100%', height: 200, padding: 10, borderRadius: 6, border: '1px solid #374151', background: '#111827', color: 'white', fontFamily: 'monospace', fontSize: 12 }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setShowBulkImport(false)} style={{ padding: '10px 20px', background: '#6b7280', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                ยกเลิก
              </button>
              <button onClick={handleBulkImport} style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                Import CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}