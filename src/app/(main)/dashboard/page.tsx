"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import { getDistance } from "@/utils/distance";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  
  // Dữ liệu nhân viên và điều kiện chấm công
  const [employee, setEmployee] = useState<any>(null);
  const [locationRule, setLocationRule] = useState<any>(null);
  
  // Trạng thái thiết bị & vị trí
  const [currentIp, setCurrentIp] = useState("");
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);
  
  const [isValid, setIsValid] = useState(false);
  const [validationMethod, setValidationMethod] = useState<"IP" | "GPS" | null>(null);
  
  // Lịch sử hôm nay & Danh sách cá nhân
  const [currentShift, setCurrentShift] = useState<any>(null); // Lưu CA MỚI NHẤT của ngày hôm nay
  const [shiftStatus, setShiftStatus] = useState<"IDLE" | "WORKING" | "FORGOT_OUT">("IDLE");
  const [myHistory, setMyHistory] = useState<any[]>([]);

  // --- STATES CHO TÍNH NĂNG CÔNG TÁC ---
  const [isBusinessTripMode, setIsBusinessTripMode] = useState(false);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [exceptionReason, setExceptionReason] = useState("");
  const [actionType, setActionType] = useState<"IN" | "OUT">("IN");

  const [popup, setPopup] = useState({ show: false, message: "", type: "success" });

  const showPopup = (message: string, type: "success" | "error" = "success") => {
    setPopup({ show: true, message, type });
    setTimeout(() => {
      setPopup(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  // HÀM: BÓC TÁCH NGÀY CHUẨN XÁC 100% THEO MÚI GIỜ VIỆT NAM (Tránh lỗi trước 7h sáng)
  const getVietnamDateString = () => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const parts = formatter.formatToParts(new Date());
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    initDashboard();
  }, []);

  const initDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: empData } = await supabase
      .from("employees")
      .select("*, locations(*)")
      .eq("id", user.id)
      .single();

    if (empData) {
      setEmployee(empData);
      setLocationRule(empData.locations);
      
      // 1. Kéo ca làm việc GẦN NHẤT
      const { data: attData } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", user.id)
        .order("check_in_time", { ascending: false })
        .limit(1);
        
      if (attData && attData.length > 0) {
        const latest = attData[0];
        setCurrentShift(latest);
        
        if (!latest.check_out_time) {
          // TÍNH TOÁN TIMEOUT (15 TIẾNG)
          const checkInTime = new Date(latest.check_in_time).getTime();
          const now = new Date().getTime();
          const hoursElapsed = (now - checkInTime) / (1000 * 60 * 60);
          
          if (hoursElapsed < 15) {
            setShiftStatus("WORKING"); // Dưới 15 tiếng => Đang làm ca đêm
          } else {
            setShiftStatus("FORGOT_OUT"); // Hơn 15 tiếng => Quên ra ca hôm qua
          }
        } else {
          setShiftStatus("IDLE");
        }
      } else {
        setCurrentShift(null);
        setShiftStatus("IDLE");
      }

      // 2. Kéo lịch sử cá nhân (Gộp nhiều ca trong ngày)
      const { data: historyData } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", user.id)
        .order("check_in_time", { ascending: false })
        .limit(15);

      if (historyData) setMyHistory(historyData);
      
      checkLocationValid(empData.locations);
    }
  };

  const checkLocationValid = async (rule: any) => {
    let passedByIp = false;
    let tempIp = "";

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

    if (!passedByIp && rule.lat && rule.lng) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCurrentLat(position.coords.latitude);
            setCurrentLng(position.coords.longitude);

            const dist = getDistance(position.coords.latitude, position.coords.longitude, rule.lat, rule.lng);
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
      setLoading(false);
    } else {
      setIsValid(false);
      setLoading(false);
    }
  };

  // XỬ LÝ NÚT BẤM (Điều hướng mở Modal hoặc Chấm luôn)
  const handleMainButtonClick = () => {
    if (!isValid && !isBusinessTripMode) return; 
    
    // LOGIC ĐÃ SỬA: Nếu đang WORKING thì mới là OUT. Nếu IDLE hoặc FORGOT_OUT thì là IN (Bắt đầu ca mới)
    const type = shiftStatus === "WORKING" ? "OUT" : "IN";
    setActionType(type);

    if (isBusinessTripMode) {
      setShowExceptionModal(true);
    } else {
      executeAction(type);
    }
  };

  // THỰC THI GHI VÀO DATABASE
  const executeAction = async (type: "IN" | "OUT") => {
    if (type === "IN") {
      const { error } = await supabase.from("attendance").insert({
        employee_id: employee.id,
        date: getVietnamDateString(),
        check_in_time: new Date().toISOString(),
        check_in_ip: currentIp,
        check_in_lat: currentLat,
        check_in_lng: currentLng,
        check_in_method: isBusinessTripMode ? "Công tác" : validationMethod,
        is_exception: isBusinessTripMode,
        exception_note: isBusinessTripMode ? exceptionReason : null
      });

      if (!error) showPopup(isBusinessTripMode ? "Đã ghi nhận công tác!" : "Chấm công VÀO CA thành công!", "success");
      else showPopup("Lỗi: " + error.message, "error");
      
    } else {
      const { error } = await supabase.from("attendance")
        .update({
          check_out_time: new Date().toISOString(),
          check_out_ip: currentIp,
          check_out_lat: currentLat,
          check_out_lng: currentLng,
          check_out_method: isBusinessTripMode ? "Công tác" : validationMethod,
          ...(isBusinessTripMode ? { is_exception: true, exception_note: exceptionReason } : {})
        })
        .eq("id", currentShift.id);

      if (!error) showPopup(isBusinessTripMode ? "Đã chốt ca công tác!" : "Chấm công RA CA thành công!", "success");
      else showPopup("Lỗi: " + error.message, "error");
    }

    // Reset UI sau khi thành công
    setShowExceptionModal(false);
    setExceptionReason("");
    setIsBusinessTripMode(false);
    initDashboard();
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
    return new Date(isoString).toLocaleTimeString("vi-VN", { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium animate-pulse">Đang quét vị trí & thiết bị... 🌍</div>;

  const isWorking = shiftStatus === "WORKING";
  const shiftsToday = myHistory.filter(h => h.date === getVietnamDateString());
  const hasCompletedAShift = shiftsToday.some(h => h.check_out_time !== null);

  return (
    <div className="space-y-6 max-w-md mx-auto pb-10">
      
      {/* 1. THÔNG TIN & TRẠNG THÁI ĐỊNH VỊ */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-3 relative overflow-hidden">
        {isBusinessTripMode && <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400"></div>}
        
        <div className="text-center border-b border-gray-100 pb-3">
          <h2 className="text-xl font-bold text-gray-800">{employee?.full_name}</h2>
          <p className="text-gray-500 text-sm mt-0.5">📍 {locationRule?.name}</p>
        </div>

        <div className={`p-3 rounded-lg border text-sm transition-colors ${isBusinessTripMode ? 'bg-yellow-50/50 border-yellow-200' : isValid ? 'bg-blue-50/50 border-blue-200' : 'bg-red-50/50 border-red-200'}`}>
          <div className="flex justify-between mb-1">
            <span className="text-gray-600">IP Thiết bị:</span>
            <span className="font-bold text-gray-800 truncate max-w-[150px]">{currentIp || "Đang quét..."}</span>
          </div>
          {validationMethod === "GPS" && currentDistance !== null && (
            <div className="flex justify-between mb-1">
              <span className="text-gray-600">Khoảng cách:</span>
              <span className="font-bold text-gray-800">{currentDistance} mét</span>
            </div>
          )}
          <div className="flex justify-between font-medium pt-1 border-t border-gray-200/50 mt-2">
            <span className="text-gray-600">Xác thực bằng:</span>
            {isBusinessTripMode ? (
              <span className="text-yellow-600 font-bold">✈️ Chế độ Công tác</span>
            ) : isValid ? (
              <span className="text-green-600 font-bold">✅ {validationMethod === "IP" ? "Mạng Wifi" : "Vị trí GPS"}</span>
            ) : (
              <span className="text-red-600 font-bold">❌ Không hợp lệ</span>
            )}
          </div>
        </div>

        {/* NÚT MỞ KHÓA CÔNG TÁC (Chỉ hiện khi chưa hợp lệ và chưa bật công tác) */}
        {!isValid && !isBusinessTripMode && (
          <div className="mt-3 text-center">
            <button 
              onClick={() => setIsBusinessTripMode(true)}
              className="text-sm text-blue-600 underline font-medium hover:text-blue-800 px-4 py-1"
            >
              ✈️ Bạn đi công tác/xử lý sự cố ngoài trạm?
            </button>
          </div>
        )}
      </div>

      {/* 2. KHU VỰC NÚT BẤM CHẤM CÔNG */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center">
        {!isWorking ? (
          <div className="text-center w-full">
            {hasCompletedAShift && !isBusinessTripMode && (
              <div className="mb-5">
                <div className="text-3xl mb-1">🎉</div>
                <h3 className="font-bold text-gray-800 text-sm">Đã hoàn thành {myHistory.filter(h => h.date === getVietnamDateString()).length} ca hôm nay!</h3>
              </div>
            )}
            {/* CẢNH BÁO QUÊN RA CA */}
            {shiftStatus === "FORGOT_OUT" && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-xs font-medium border border-red-100 text-center w-full shadow-sm animate-fade-in-up">
                ⚠️ Bạn đã quên chấm công Ra Ca của ca làm việc trước. Hãy bấm Vào Ca để bắt đầu ngày làm việc mới!
              </div>
            )}
            <button 
              onClick={handleMainButtonClick}
              disabled={!isValid && !isBusinessTripMode}
              className={`w-48 h-48 mx-auto rounded-full text-2xl font-bold text-white shadow-lg transition-transform active:scale-95 flex flex-col items-center justify-center gap-1
                ${(!isValid && !isBusinessTripMode) ? 'bg-gray-300 cursor-not-allowed' 
                  : isBusinessTripMode ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 hover:shadow-yellow-500/50' 
                  : 'bg-gradient-to-br from-green-400 to-green-600 hover:shadow-green-500/50'}`}
            >
              <span>{isBusinessTripMode ? 'CÔNG TÁC' : hasCompletedAShift ? 'TĂNG CA' : 'VÀO CA'}</span>
              {isBusinessTripMode && <span className="text-sm font-normal opacity-90">(Ghi nhận)</span>}
            </button>
          </div>
        ) : (
          <div className="text-center w-full">
            <p className="text-sm text-gray-500 mb-4 font-medium">Giờ vào ca này: {formatTime(currentShift.check_in_time)}</p>
            <button 
              onClick={handleMainButtonClick}
              disabled={!isValid && !isBusinessTripMode}
              className={`w-48 h-48 mx-auto rounded-full text-2xl font-bold text-white shadow-lg transition-transform active:scale-95 flex flex-col items-center justify-center gap-1
                ${(!isValid && !isBusinessTripMode) ? 'bg-gray-300 cursor-not-allowed' 
                  : isBusinessTripMode ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 hover:shadow-yellow-500/50' 
                  : 'bg-gradient-to-br from-orange-400 to-orange-600 hover:shadow-orange-500/50'}`}
            >
              <span>RA CA</span>
              {isBusinessTripMode && <span className="text-sm font-normal opacity-90">(Công tác)</span>}
            </button>
          </div>
        )}

        {/* Nút Hủy chế độ công tác */}
        {isBusinessTripMode && (
           <button onClick={() => setIsBusinessTripMode(false)} className="mt-5 text-sm text-gray-400 hover:text-gray-600">
             Hủy chế độ công tác
           </button>
        )}
      </div>

      {/* 3. BẢNG LỊCH SỬ CHẤM CÔNG CÁ NHÂN */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
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
                <tr key={item.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${item.is_exception ? 'bg-yellow-50/30' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                    {new Date(item.date).toLocaleDateString("vi-VN", { timeZone: 'Asia/Ho_Chi_Minh' })}
                    {item.is_exception && <span className="ml-2 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[10px] font-bold">CT</span>}
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

      {/* ================= MODAL LÝ DO CÔNG TÁC ================= */}
      {showExceptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-fade-in-up">
            <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
              <span>✈️</span> Chấm công Ngoại lệ
            </h3>
            <p className="text-sm text-gray-600 mb-4">Vui lòng nhập lý do hoặc địa điểm bạn đang công tác để Quản lý nắm thông tin.</p>
            
            <textarea 
              value={exceptionReason}
              onChange={(e) => setExceptionReason(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 mb-4 h-24 resize-none"
              placeholder="VD: Đi công tác tại cơ quan thuế..."
              required
            ></textarea>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setShowExceptionModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Hủy
              </button>
              <button 
                onClick={() => executeAction(actionType)}
                disabled={!exceptionReason.trim()}
                className="flex-1 bg-yellow-500 text-white py-2.5 rounded-lg font-bold hover:bg-yellow-600 transition shadow-md disabled:bg-yellow-300 disabled:cursor-not-allowed"
              >
                Xác nhận {actionType === "IN" ? "Vào ca" : "Ra ca"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP THÔNG BÁO HIỆN ĐẠI */}
      {popup.show && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-transparent pointer-events-none px-4">
          <div className="bg-gray-900/90 text-white rounded-xl shadow-2xl p-4 w-full max-w-xs text-center animate-fade-in-up">
            <h3 className="font-bold text-sm mb-1">{popup.type === 'success' ? "✅ Thành công" : "❌ Lỗi"}</h3>
            <p className="text-gray-200 text-xs">{popup.message}</p>
          </div>
        </div>
      )}

    </div>
  );
}