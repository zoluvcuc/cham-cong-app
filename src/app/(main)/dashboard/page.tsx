"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import { getDistance } from "@/utils/distance";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  
  // Dữ liệu nhân viên và điều kiện chấm công
  const [employee, setEmployee] = useState<any>(null);
  const [locationRule, setLocationRule] = useState<any>(null);
  
  // --- TRẠNG THÁI KIỂM TRA ĐIỀU KIỆN ---
  const [currentIp, setCurrentIp] = useState("");
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);
  
  const [isValid, setIsValid] = useState(false);
  const [validationMethod, setValidationMethod] = useState<"IP" | "GPS" | null>(null);
  
  // Lịch sử hôm nay & Danh sách lịch sử cá nhân
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [myHistory, setMyHistory] = useState<any[]>([]);

  // Popup state
  const [popup, setPopup] = useState({ show: false, message: "", type: "success" });

  const showPopup = (message: string, type: "success" | "error" = "success") => {
    setPopup({ show: true, message, type });
    setTimeout(() => {
      setPopup(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  useEffect(() => {
    initDashboard();
  }, []);

  const initDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Lấy thông tin nhân viên
    const { data: empData } = await supabase
      .from("employees")
      .select("*, locations(*)")
      .eq("id", user.id)
      .single();

    if (empData) {
      setEmployee(empData);
      setLocationRule(empData.locations);
      
      // Kiểm tra chấm công hôm nay
      const today = new Date().toISOString().split('T')[0];
      const { data: attData } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", user.id)
        .eq("date", today)
        .maybeSingle();
        
      if (attData) setTodayRecord(attData);

      // Kéo lịch sử cá nhân
      const { data: historyData } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", user.id)
        .order("date", { ascending: false })
        .limit(10);

      if (historyData) setMyHistory(historyData);
      
      checkLocationValid(empData.locations);
    }
  };

  const checkLocationValid = async (rule: any) => {
    let passedByIp = false;
    let tempIp = "";

    // 1. LUÔN ƯU TIÊN KIỂM TRA IP (WIFI) TRƯỚC
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      tempIp = data.ip;
      setCurrentIp(tempIp);
      
      if (rule.current_ip && tempIp === rule.current_ip) {
        passedByIp = true;
        setValidationMethod("IP");
        setIsValid(true);
      }
    } catch (e) {
      console.log("Không bắt được IP");
    }

    // 2. NẾU SAI IP -> CHUYỂN SANG BẮT TỌA ĐỘ GPS
    if (!passedByIp && rule.lat && rule.lng) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            // Lưu lại tọa độ để lát nữa gửi lên Database
            setCurrentLat(lat);
            setCurrentLng(lng);

            const dist = getDistance(lat, lng, rule.lat, rule.lng);
            setCurrentDistance(dist);

            if (dist <= (rule.radius || 100)) {
              setIsValid(true);
              setValidationMethod("GPS");
            } else {
              setIsValid(false);
              setValidationMethod(null);
            }
            setLoading(false);
          },
          (error) => {
            setIsValid(false);
            setLoading(false);
          },
          { enableHighAccuracy: true }
        );
      } else {
        setIsValid(false);
        setLoading(false);
      }
    } else if (passedByIp) {
      // Đã khớp IP thì dừng quét GPS luôn cho nhẹ máy
      setLoading(false);
    } else {
      setIsValid(false);
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!isValid) return showPopup("Bạn không ở đúng vị trí hợp lệ!", "error");
    
    const { error } = await supabase.from("attendance").insert({
      employee_id: employee.id,
      check_in_time: new Date().toISOString(),
      check_in_ip: currentIp,
      check_in_lat: currentLat, // Gửi tọa độ lên DB (nếu có)
      check_in_lng: currentLng,
      check_in_method: validationMethod // Lưu chữ "IP" hoặc "GPS"
    });

    if (!error) {
      showPopup("Chấm công VÀO CA thành công!", "success");
      initDashboard();
    } else {
      showPopup("Lỗi: " + error.message, "error");
    }
  };

  const handleCheckOut = async () => {
    if (!isValid) return showPopup("Bạn không ở đúng vị trí hợp lệ!", "error");
    
    const { error } = await supabase.from("attendance")
      .update({
        check_out_time: new Date().toISOString(),
        check_out_ip: currentIp,
        check_out_lat: currentLat,
        check_out_lng: currentLng,
        check_out_method: validationMethod
      })
      .eq("id", todayRecord.id);

    if (!error) {
      showPopup("Chấm công RA CA thành công!", "success");
      initDashboard();
    } else {
      showPopup("Lỗi: " + error.message, "error");
    }
  };

  const calculateTotalTime = (inTime: string, outTime: string) => {
    if (!inTime || !outTime) return "-";
    const diff = new Date(outTime).getTime() - new Date(inTime).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}p`;
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return "--:--";
    return new Date(isoString).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium animate-pulse">Đang quét vị trí & thiết bị... 🌍</div>;

  return (
    <div className="space-y-6 max-w-md mx-auto pb-10">
      
      {/* Thông tin nhân viên & Trạng thái định vị */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-3">
        <div className="text-center border-b border-gray-100 pb-3">
          <h2 className="text-xl font-bold text-gray-800">{employee?.full_name}</h2>
          <p className="text-gray-500 text-sm mt-0.5">📍 {locationRule?.name}</p>
        </div>

        <div className={`p-3 rounded-lg border text-sm ${isValid ? 'bg-blue-50/50 border-blue-200' : 'bg-red-50/50 border-red-200'}`}>
          <div className="flex justify-between mb-1">
            <span className="text-gray-600">IP Thiết bị:</span>
            <span className="font-bold text-gray-800">{currentIp || "Đang quét..."}</span>
          </div>
          {validationMethod === "GPS" && currentDistance !== null && (
            <div className="flex justify-between mb-1">
              <span className="text-gray-600">Khoảng cách:</span>
              <span className="font-bold text-gray-800">{currentDistance} mét</span>
            </div>
          )}
          <div className="flex justify-between font-medium pt-1 border-t border-gray-200/50">
            <span className="text-gray-600">Xác thực bằng:</span>
            {isValid ? (
              <span className="text-green-600 font-bold">
                ✅ {validationMethod === "IP" ? "Mạng Wifi" : "Vị trí GPS"}
              </span>
            ) : (
              <span className="text-red-600 font-bold">❌ Không hợp lệ</span>
            )}
          </div>
        </div>
      </div>

      {/* Khu vực nút Chấm công tròn */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center">
        {!todayRecord ? (
          <button 
            onClick={handleCheckIn}
            disabled={!isValid}
            className={`w-48 h-48 rounded-full text-2xl font-bold text-white shadow-lg transition-transform active:scale-95 flex items-center justify-center
              ${isValid ? 'bg-gradient-to-br from-green-400 to-green-600 hover:shadow-green-500/50' : 'bg-gray-300 cursor-not-allowed'}`}
          >
            VÀO CA
          </button>
        ) : !todayRecord.check_out_time ? (
          <div className="text-center w-full">
            <p className="text-sm text-gray-500 mb-4 font-medium">Giờ vào: {formatTime(todayRecord.check_in_time)}</p>
            <button 
              onClick={handleCheckOut}
              disabled={!isValid}
              className={`w-48 h-48 mx-auto rounded-full text-2xl font-bold text-white shadow-lg transition-transform active:scale-95 flex items-center justify-center
                ${isValid ? 'bg-gradient-to-br from-orange-400 to-orange-600 hover:shadow-orange-500/50' : 'bg-gray-300 cursor-not-allowed'}`}
            >
              RA CA
            </button>
          </div>
        ) : (
           <div className="text-center w-full py-6">
             <div className="text-4xl mb-2">🎉</div>
             <h3 className="font-bold text-lg text-gray-800">Đã hoàn thành ca làm hôm nay!</h3>
             <p className="text-xs text-gray-500 mt-1">Vào: {formatTime(todayRecord.check_in_time)} | Ra: {formatTime(todayRecord.check_out_time)}</p>
           </div>
        )}
      </div>

      {/* BẢNG LỊCH SỬ CHẤM CÔNG CÁ NHÂN */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-sm">Lịch sử chấm công gần đây</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Ngày</th>
                <th className="px-4 py-3 whitespace-nowrap">Giờ vào</th>
                <th className="px-4 py-3 whitespace-nowrap">Giờ ra</th>
                <th className="px-4 py-3 text-right whitespace-nowrap min-w-[100px]">Tổng giờ</th>
              </tr>
            </thead>
            <tbody>
              {myHistory.map((item, idx) => (
                <tr key={item.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                    {new Date(item.date).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-4 py-3 font-semibold text-green-600 whitespace-nowrap">
                    {formatTime(item.check_in_time)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-orange-500 whitespace-nowrap">
                    {formatTime(item.check_out_time)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-blue-600 whitespace-nowrap">
                    {calculateTotalTime(item.check_in_time, item.check_out_time)}
                  </td>
                </tr>
              ))}
              {myHistory.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-xs">
                    Chưa có lịch sử chấm công.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POPUP THÔNG BÁO HIỆN ĐẠI */}
      {popup.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
            <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-4 ${popup.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
              {popup.type === 'success' ? (
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              ) : (
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{popup.type === 'success' ? "Thành công!" : "Lỗi!"}</h3>
            <p className="text-gray-600 font-medium text-sm">{popup.message}</p>
          </div>
        </div>
      )}

    </div>
  );
}