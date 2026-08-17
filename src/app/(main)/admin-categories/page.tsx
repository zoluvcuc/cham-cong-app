"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";

export default function AdminCategoriesPage() {
  const [activeTab, setActiveTab] = useState<"departments" | "locations" | "positions">("departments");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newItemName, setNewItemName] = useState("");

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    const { data: result } = await supabase.from(activeTab).select("*").order("id");
    if (result) setData(result);
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    
    // Với locations cần thêm các trường mặc định để không bị lỗi
    const insertData = activeTab === "locations" 
      ? { name: newItemName, current_ip: "", lat: 0, lng: 0, radius: 100 }
      : activeTab === "positions" 
        ? { title: newItemName } 
        : { name: newItemName };

    const { error } = await supabase.from(activeTab).insert([insertData]);
    if (!error) {
      setNewItemName("");
      fetchData();
    } else alert("Lỗi: " + error.message);
  };

  const handleUpdate = async (id: string, newName: string) => {
    const updateField = activeTab === "positions" ? { title: newName } : { name: newName };
    await supabase.from(activeTab).update(updateField).eq("id", id);
    setEditingItem(null);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa? (Sẽ lỗi nếu danh mục này đang có nhân viên sử dụng)")) return;
    const { error } = await supabase.from(activeTab).delete().eq("id", id);
    if (error) alert("Không thể xóa vì dữ liệu đang được ràng buộc ở bảng khác.");
    else fetchData();
  };

  return (
    <div className="animate-fade-in space-y-4 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Cấu hình Danh mục</h2>
      
      {/* Tabs */}
      <div className="flex space-x-2 bg-gray-200/50 p-1 rounded-xl">
        <button onClick={() => setActiveTab("departments")} className={`flex-1 py-2 rounded-lg font-medium text-sm transition ${activeTab === "departments" ? "bg-white shadow text-blue-600" : "text-gray-600 hover:text-gray-800"}`}>Phòng ban</button>
        <button onClick={() => setActiveTab("locations")} className={`flex-1 py-2 rounded-lg font-medium text-sm transition ${activeTab === "locations" ? "bg-white shadow text-blue-600" : "text-gray-600 hover:text-gray-800"}`}>Khu vực (Chi nhánh)</button>
        <button onClick={() => setActiveTab("positions")} className={`flex-1 py-2 rounded-lg font-medium text-sm transition ${activeTab === "positions" ? "bg-white shadow text-blue-600" : "text-gray-600 hover:text-gray-800"}`}>Vai trò (Chức vụ)</button>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
        {/* Form thêm mới */}
        <form onSubmit={handleAdd} className="flex gap-2 mb-6">
          <input 
            type="text" 
            value={newItemName} 
            onChange={(e) => setNewItemName(e.target.value)} 
            placeholder="Nhập tên mục mới..." 
            className="flex-1 border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-blue-500"
          />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700">Thêm mới</button>
        </form>

        {/* Danh sách */}
        {loading ? <div className="text-center text-gray-500 py-4">Đang tải...</div> : (
          <ul className="space-y-2">
            {data.map(item => (
              <li key={item.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-lg hover:bg-blue-50/50 transition">
                {editingItem === item.id ? (
                  <div className="flex gap-2 flex-1 mr-4">
                    <input 
                      type="text" 
                      defaultValue={activeTab === "positions" ? item.title : item.name} 
                      id={`edit-${item.id}`}
                      className="flex-1 border rounded px-2 py-1 text-sm outline-none"
                    />
                    <button onClick={() => handleUpdate(item.id, (document.getElementById(`edit-${item.id}`) as HTMLInputElement).value)} className="text-green-600 text-sm font-bold">Lưu</button>
                    <button onClick={() => setEditingItem(null)} className="text-gray-500 text-sm">Hủy</button>
                  </div>
                ) : (
                  <span className="font-medium text-gray-700">{activeTab === "positions" ? item.title : item.name}</span>
                )}

                {editingItem !== item.id && (
                  <div className="flex gap-3">
                    <button onClick={() => setEditingItem(item.id)} className="text-blue-500 hover:text-blue-700">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700">
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                )}
              </li>
            ))}
            {data.length === 0 && <div className="text-center text-gray-500 text-sm py-2">Chưa có dữ liệu.</div>}
          </ul>
        )}
      </div>
    </div>
  );
}