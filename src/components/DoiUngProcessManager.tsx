import React, { useState } from 'react';
import { 
  RefreshCw, Users, ShieldAlert, CheckCircle2, ChevronRight, Copy, Check, 
  Mail, Phone, FileText, ArrowRight, GitMerge, ListFilter, CreditCard,
  Building2, Building, RefreshCcw, Landmark, QrCode
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function DoiUngProcessManager() {
  const [activeTuyen, setActiveTuyen] = useState<'A' | 'B'>('A');
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<number>(1);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}!`);
  };

  const copyCcEmails = () => {
    const emails = "hanghtt@mayhomes.vn; digitalmkt@mayhomes.vn; sinhpt@mayhomes.vn; phuochanhdt@mayhomes.vn";
    navigator.clipboard.writeText(emails);
    toast.success("Đã sao chép danh sách đồng gửi CC!");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Header Banner - Page 1 */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-[#18153A] to-slate-950 rounded-[2.5rem] p-8 md:p-12 text-white border border-slate-800 shadow-xl shadow-slate-950/10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-500/10 via-transparent to-transparent opacity-70 pointer-events-none" />
        <div className="relative flex flex-col items-center text-center space-y-6 max-w-4xl mx-auto">
          {/* Internal watermark */}
          <div className="flex items-center gap-2">
            <Badge className="bg-violet-500/15 text-violet-400 border border-violet-500/25 py-1 px-3.5 rounded-full text-[10px] uppercase font-black tracking-widest font-mono">
              Tài liệu lưu hành nội bộ | Mayhomes
            </Badge>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight uppercase font-sans">
            Quy Trình Đối Ứng<br />
            <span className="text-violet-400 bg-clip-text">Marketing Doanh Nghiệp</span>
          </h1>
          <p className="text-slate-300 font-medium max-w-2xl text-sm md:text-base leading-relaxed">
            Hướng dẫn tiêu chuẩn phân luồng và quản lý tối ưu ngân sách quảng cáo đối ứng dành cho các Khối.
          </p>
        </div>
      </div>

      {/* Phạm vi áp dụng & Hình thức - Page 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-[2rem] p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-violet-150 text-violet-600 rounded-xl">
              <Users className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Đối tượng áp dụng</h3>
              <p className="text-[10px] text-slate-400 font-medium font-mono">Scope of application</p>
            </div>
          </div>
          <p className="text-xs font-black text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-dashed text-center">
            Chỉ hỗ trợ đối ứng ngân sách dành cho các Khối thuộc Mayhomes Group.
          </p>
        </div>

        <div className="bg-white border rounded-[2rem] p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-violet-150 text-violet-600 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Hình thức triển khai</h3>
              <p className="text-[10px] text-slate-400 font-medium font-mono">Execution types</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-[11px] font-sans font-bold text-slate-700">
            <div className="bg-violet-50/25 border-l-4 border-violet-500 p-3 rounded-r-xl">
              <div className="text-slate-400 text-[9px] uppercase font-black">Hình thức 1</div>
               Cấp phát trực tiếp qua <strong>thẻ VISA doanh nghiệp</strong> của công ty.
            </div>

            <div className="bg-violet-50/25 border-l-4 border-violet-500 p-3 rounded-r-xl">
              <div className="text-slate-400 text-[9px] uppercase font-black">Hình thức 2</div>
              Ủy thác trực tiếp do <strong>Team DIGITAL</strong> Mayhomes chạy triển khai.
            </div>
          </div>
        </div>
      </div>

      {/* Bước 1: Khởi tạo & Trình duyệt - Page 3 */}
      <div className="bg-white border rounded-[2rem] shadow-sm p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b pb-5">
          <div className="flex items-center gap-3">
            <span className="bg-violet-600 text-white font-black font-mono w-9 h-9 rounded-xl flex items-center justify-center text-sm shadow-md">
              B1
            </span>
            <div>
              <h3 className="text-base font-black text-slate-900 uppercase">BƯỚC 1: KHỞI TẠO &amp; TRÌNH DUYỆT NGÂN SÁCH</h3>
              <p className="text-xs text-slate-400 font-medium">Bắt buộc lập email đầy đủ mạng lưới đầu mối liên quan</p>
            </div>
          </div>
          <Badge className="bg-violet-100 hover:bg-violet-100 text-violet-800 font-bold text-xs px-3.5 py-1.5 rounded-lg border-none shrink-0 font-mono tracking-wider">
            KHỞI CHẠY QUY TRÌNH
          </Badge>
        </div>

        {/* Email mapping visual structure */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left card: GD Khoi initiator */}
          <div className="lg:col-span-4 bg-slate-50 border p-5 rounded-2xl flex flex-col justify-between space-y-4">
            <div>
              <span className="text-[10px] uppercase font-black text-slate-400 block font-mono">Người khởi tạo:</span>
              <h4 className="font-extrabold text-slate-800 text-sm mt-1">Giám đốc Khối (GĐ Khối)</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed mt-2">
                Soạn thảo thư điện tử (Email) đăng ký duyệt gói đối ứng chính thức gửi trực tiếp trình Ban Lãnh Đạo (CEO) có thẩm quyền phê duyệt.
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-dashed text-slate-600 text-center font-mono text-[11px] font-bold">
              Subject: [Đăng ký Đối ứng] - Block Name...
            </div>
          </div>

          {/* Center visual Arrow */}
          <div className="lg:col-span-1 flex lg:flex-col items-center justify-center gap-2">
            <div className="h-0.5 w-12 lg:w-0.5 lg:h-12 bg-slate-200" />
            <span className="text-slate-400 font-extrabold text-[10px] uppercase font-mono">GỬI CHO</span>
            <div className="h-0.5 w-12 lg:w-0.5 lg:h-12 bg-slate-200" />
          </div>

          {/* Right card: Recipient chaunh.ceo@mayhomes.vn */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Direct Recipient */}
            <div className="border border-violet-100 bg-violet-50/15 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-black text-violet-600 block font-mono">Người Phê Duyệt có thẩm quyền:</span>
                <h5 className="font-extrabold text-slate-800 text-sm">Ban Giám Đốc (CEO)</h5>
                <p className="text-[11px] font-mono font-bold text-slate-600">chaunh.ceo@mayhomes.vn</p>
              </div>
              <Button 
                onClick={() => handleCopy('chaunh.ceo@mayhomes.vn', 'Email CEO')} 
                size="sm" 
                variant="outline" 
                className="rounded-lg shrink-0 h-8 font-bold text-violet-700"
              >
                Copy Email
              </Button>
            </div>

            {/* CC emails network (đồng gửi) */}
            <div className="border border-slate-200 bg-slate-50/50 p-4 rounded-2xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[9.5px] uppercase font-black text-slate-500 block font-mono">Mạng lưới đồng gửi bắt buộc (CC-List):</span>
                <Button 
                  onClick={copyCcEmails} 
                  size="sm" 
                  variant="ghost" 
                  className="rounded-lg h-7 text-[10px] font-bold text-slate-500"
                >
                  Sao chép cả 4 Email
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono font-bold text-slate-700">
                <div 
                  onClick={() => handleCopy('hanghtt@mayhomes.vn', 'Email Ms Hằng')}
                  className="bg-white border rounded-xl p-2 md:p-3 hover:border-violet-300 transition-colors cursor-pointer text-center relative group"
                >
                  hanghtt@mayhomes.vn
                  <div className="absolute inset-0 bg-violet-50/30 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity flex items-center justify-center font-bold text-[9px] text-violet-700">Click sao chép</div>
                </div>

                <div 
                  onClick={() => handleCopy('digitalmkt@mayhomes.vn', 'Email Digital MKT')}
                  className="bg-white border rounded-xl p-2 md:p-3 hover:border-violet-300 transition-colors cursor-pointer text-center relative group"
                >
                  digitalmkt@mayhomes.vn
                  <div className="absolute inset-0 bg-violet-50/30 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity flex items-center justify-center font-bold text-[9px] text-violet-700">Click sao chép</div>
                </div>

                <div 
                  onClick={() => handleCopy('sinhpt@mayhomes.vn', 'Email Mr Sinh')}
                  className="bg-white border rounded-xl p-2 md:p-3 hover:border-violet-300 transition-colors cursor-pointer text-center relative group"
                >
                  sinhpt@mayhomes.vn
                  <div className="absolute inset-0 bg-violet-50/30 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity flex items-center justify-center font-bold text-[9px] text-violet-700">Click sao chép</div>
                </div>

                <div 
                  onClick={() => handleCopy('phuochanhdt@mayhomes.vn', 'Email Ms Hạnh')}
                  className="bg-white border rounded-xl p-2 md:p-3 hover:border-violet-300 transition-colors cursor-pointer text-center relative group"
                >
                  phuochanhdt@mayhomes.vn
                  <div className="absolute inset-0 bg-violet-50/30 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity flex items-center justify-center font-bold text-[9px] text-violet-700">Click sao chép</div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Ma trận phân luồng - Page 4 */}
      <div className="bg-white border rounded-[2rem] shadow-sm p-6 md:p-8 space-y-6">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-black text-violet-600 block font-mono">Decision matrix chart</span>
          <h3 className="text-base font-black text-slate-800 uppercase">Ma Trận Phân Luồng: Lựa Chọn Mô Hình Triển Khai</h3>
          <p className="text-xs text-slate-400 font-medium">Lựa chọn tuyến vận hành phù hợp nhu cầu năng lực của từng Khối</p>
        </div>

        {/* Matrix comparison grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          
          {/* Tuyen A Table Block */}
          <div className="border border-teal-100 bg-teal-50/5 rounded-3xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Badge className="bg-teal-500 text-white font-extrabold rounded-lg font-mono text-[9px] border-none">TUYẾN A</Badge>
              <h4 className="font-extrabold text-teal-950 text-sm">Các Team Tự Triển Khai Marketing</h4>
            </div>

            <div className="space-y-3 font-sans text-xs text-slate-700">
              <div className="bg-white border p-3 rounded-xl">
                <span className="text-[9px] font-black uppercase text-slate-400 block font-mono">Tiêu chí: Mô hình hoạt dộng</span>
                <p className="font-bold text-slate-700 mt-0.5">Khối chịu trách nhiệm tuyển dụng, thiết lập và duy trì tự chạy vận hành quảng cáo nội bộ.</p>
              </div>

              <div className="bg-white border p-3 rounded-xl flex items-center justify-between gap-4">
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 block font-mono">Luồng lưu chuyển tiền mặt</span>
                  <div className="flex items-center gap-2 font-black text-slate-800 font-sans mt-0.5">
                    <span>GĐ Khối</span>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                    <span>Kế toán</span>
                  </div>
                </div>
                <Landmark className="w-5 h-5 text-teal-600 shrink-0" />
              </div>

              <div className="bg-white border border-teal-200/60 p-3 rounded-xl text-teal-950 font-bold bg-teal-50/20">
                <span className="text-[9px] font-black uppercase text-teal-600 block font-mono">Đích đến cuối của ngân sách đối ứng:</span>
                Chuyển khoản chuyển dải <strong className="text-teal-700">100% vào thẻ VISA cá nhân của GĐ Khối</strong> để bảo lưu chi phí.
              </div>
            </div>
          </div>

          {/* Tuyen B Table Block */}
          <div className="border border-amber-100 bg-amber-50/5 rounded-3xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-500 text-white font-extrabold rounded-lg font-mono text-[9px] border-none">TUYẾN B</Badge>
              <h4 className="font-extrabold text-amber-950 text-sm">Các Team Ủy thác Order Digital chạy</h4>
            </div>

            <div className="space-y-3 font-sans text-xs text-slate-700">
              <div className="bg-white border p-3 rounded-xl">
                <span className="text-[9px] font-black uppercase text-slate-400 block font-mono">Tiêu chí: Mô hình hoạt dộng</span>
                <p className="font-bold text-slate-700 mt-0.5">Khối lập kế hoạch, nội dung chỉ định và hoàn tất ủy thác bàn giao cho Team Digital Mayhomes vận hành chính.</p>
              </div>

              <div className="bg-white border p-3 rounded-xl flex items-center justify-between gap-4">
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 block font-mono">Luồng lưu chuyển tiền mặt</span>
                  <div className="flex items-center gap-2 font-black text-slate-800 font-sans mt-0.5">
                    <span>GĐ Khối</span>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                    <span>Team Digital</span>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                    <span>Kế toán</span>
                  </div>
                </div>
                <Users className="w-5 h-5 text-amber-600 shrink-0" />
              </div>

              <div className="bg-white border border-amber-200/60 p-3 rounded-xl text-amber-950 font-bold bg-amber-50/20">
                <span className="text-[9px] font-black uppercase text-amber-600 block font-mono">Đích đến cuối của ngân sách đối ứng:</span>
                Chuyển khoản bàn giao <strong className="text-amber-700">100% vào thẻ VISA của phía Team Digital phụ trách</strong>.
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Tuyến A và Tuyến B detailed diagrams - Pages 5 & 6 */}
      <div className="bg-white border rounded-[2rem] shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-800 uppercase">Quy trình các bước triển khai chi tiết</h3>
            <p className="text-xs text-slate-400 font-medium">Bấm chọn tuyến để xem sơ đồ các bước thực chi và nộp tiền</p>
          </div>
          
          {/* Toggles */}
          <div className="flex bg-slate-200/70 p-1 rounded-xl shrink-0 border">
            <button
              onClick={() => setActiveTuyen('A')}
              className={`py-1.5 px-4 rounded-lg font-black text-xs transition-all ${
                activeTuyen === 'A' 
                  ? 'bg-teal-500 text-white shadow' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              TUYẾN A (Tự chạy)
            </button>
            <button
              onClick={() => setActiveTuyen('B')}
              className={`py-1.5 px-4 rounded-lg font-black text-xs transition-all ${
                activeTuyen === 'B' 
                  ? 'bg-amber-500 text-white shadow' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              TUYẾN B (Ủy thác)
            </button>
          </div>
        </div>

        <div className="p-6 md:p-8">
          
          {activeTuyen === 'A' ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 text-xs font-bold text-teal-800 bg-teal-50/50 border border-teal-100 p-3.5 rounded-xl">
                <span>🟢</span>
                <span>Chỉ chính thức áp dụng khởi chạy sau khi hồ sơ trần duyệt email ở Bước 1 đã được CEO Phê duyệt thông qua ký duyệt.</span>
              </div>

              {/* Steps timeline horizontal representation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Step 2 */}
                <div className="border border-slate-200/80 bg-white rounded-2xl p-5 space-y-4 shadow-xs relative">
                  <div className="absolute top-4 right-4 bg-teal-100 text-teal-800 w-7 h-7 rounded-lg flex items-center justify-center font-black font-mono text-xs">
                    02
                  </div>
                  <div className="space-y-1 pr-12">
                    <span className="text-[9px] uppercase font-black text-slate-400 block font-mono">Nhiệm vụ Bước 2: GĐ Khối</span>
                    <h5 className="font-extrabold text-[#102A43] text-sm">GĐ KHỐI CHUYỂN 50% TIỀN ĐỐI ỨNG</h5>
                    <p className="text-[11px] leading-relaxed text-slate-500">
                      Giám đốc Khối tiến hành giao dịch chuyển chính xác <strong>50% tổng hạn ngạch đối ứng</strong> trực tiếp vào số tài khoản phòng kế toán chỉ định.
                    </p>
                  </div>

                  {/* Zalo handle info Box */}
                  <div className="bg-slate-50 border p-3 rounded-xl flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-600">Nhóm Zalo Xử lý đối ứng:</span>
                    <Button 
                      asChild 
                      nativeButton={false}
                      size="sm" 
                      className="bg-sky-600 hover:bg-sky-700 text-white h-7 py-0 px-2.5 rounded-md font-bold font-mono"
                    >
                      <a href="https://zalo.me/g/hdtexr368" target="_blank" rel="noopener noreferrer">
                        zalo.me/g/hdtexr368
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="border border-slate-200/80 bg-white rounded-2xl p-5 space-y-4 shadow-xs relative">
                  <div className="absolute top-4 right-4 bg-teal-100 text-teal-800 w-7 h-7 rounded-lg flex items-center justify-center font-black font-mono text-xs">
                    03
                  </div>
                  <div className="space-y-1 pr-12">
                    <span className="text-[9px] uppercase font-black text-slate-400 block font-mono">Nhiệm vụ Bước 3: Kế Toán</span>
                    <h5 className="font-extrabold text-[#102A43] text-sm">KẾ TOÁN CẤP 100% VÀO THẺ VISA</h5>
                    <p className="text-[11px] leading-relaxed text-slate-500">
                      Sau khi Kế toán kiểm tra dòng dòng tiền nổi và xác nhận khớp đã nhận đủ khoản nộp 50% từ phía GĐ Khối, sẽ lập tức tiến hành nạp mức <strong>100% ngân sách chiến dịch vào thẻ VISA cấp của GĐ Khối</strong>.
                    </p>
                  </div>
                  <div className="bg-emerald-50 text-emerald-800 p-3.5 rounded-xl border border-emerald-100 text-[10.5px] font-bold text-center leading-relaxed">
                    🎯 Đảm bảo 100% thanh khoản sẵn sàng lên chiến dịch hoàn hảo!
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 bg-amber-50/50 border border-amber-100 p-3.5 rounded-xl">
                <span>🟡</span>
                <span>Chỉ chính thức áp dụng khởi chạy sau khi hồ sơ trần duyệt email ở Bước 1 đã được CEO Phê duyệt thông qua ký duyệt.</span>
              </div>

              {/* Step 2 part 1, Part 2 and Step 3 timeline */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Step 2 - Part 1 */}
                <div className="border border-slate-200/80 bg-white rounded-2xl p-4.5 space-y-3.5 shadow-xs relative">
                  <span className="bg-amber-100 text-amber-800 text-[10px] py-0.5 px-2 rounded font-black font-mono uppercase tracking-wide">B2 - PHẦN 1</span>
                  <h5 className="font-extrabold text-[#102A43] text-xs">GĐ KHỐI CHUYỂN TIỀN CHO DIGITAL</h5>
                  <p className="text-[10.5px] leading-relaxed text-slate-500">
                    GĐ Khối thực hiện chuyển khoản trực tiếp khoản chi phí chạy đối ứng này bàn giao cho phía đại diện Team Digital Mayhomes.
                  </p>

                  {/* Profile Quang Khanh */}
                  <div className="border p-3 rounded-xl bg-slate-50 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-black text-xs text-slate-700">QK</div>
                      <div>
                        <h6 className="font-extrabold text-slate-900 text-[11px]">Quang Khánh</h6>
                        <p className="text-[9.5px] text-slate-400 font-mono">0949.433.098</p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleCopy('0949433098', 'Quang Khánh Mobile')} 
                      size="sm" 
                      variant="ghost" 
                      className="h-7 rounded-md text-[10px] font-bold text-sky-600"
                    >
                      Copy SĐT
                    </Button>
                  </div>
                </div>

                {/* Step 2 - Part 2 */}
                <div className="border border-slate-200/80 bg-white rounded-2xl p-4.5 space-y-3.5 shadow-xs relative">
                  <span className="bg-amber-100 text-amber-800 text-[10px] py-0.5 px-2 rounded font-black font-mono uppercase tracking-wide">B2 - PHẦN 2</span>
                  <h5 className="font-extrabold text-[#102A43] text-xs">DIGITAL CHUYỂN KẾ TOÁN</h5>
                  <p className="text-[10.5px] leading-relaxed text-slate-500">
                    Đại diện Team Digital Mayhomes chịu toàn bộ trách nhiệm thực hiện chuyển chính xác ngân sách này nộp gọn cho phòng Ban Kế toán làm căn cứ.
                  </p>
                  <div className="p-3 bg-slate-100 text-slate-500 text-[10px] text-center rounded-xl border border-dashed font-semibold italic">
                    Trung chuyển chứng từ liên quan
                  </div>
                </div>

                {/* Step 3 */}
                <div className="border border-slate-200/80 bg-white rounded-2xl p-4.5 space-y-3.5 shadow-xs relative">
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] py-0.5 px-2 rounded font-black font-mono uppercase tracking-wide">BƯỚC 3</span>
                  <h5 className="font-extrabold text-[#102A43] text-xs">CẤP 100% VISA CHO DIGITAL</h5>
                  <p className="text-[10.5px] leading-relaxed text-slate-500">
                    Phòng Kế toán kiểm tra xác nhận dòng tiền nổi thành công &rarr; Tiến hành chuyển hạn ngạch mức <strong>100% ngân sách đối ứng vào thẻ VISA của Team Digital</strong> làm đầu mối lên thầu.
                  </p>
                  <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-100 border-dashed rounded-xl text-center text-[10px] font-bold">
                    🚀 Kích hoạt thầu quảng cáo!
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>

      {/* Vòng lặp đối soát cuối kỳ - Page 7 */}
      <div className="bg-[#102A43] rounded-[2.5rem] border border-slate-800 shadow-xl p-6 md:p-8 text-slate-200 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-5">
          <span className="p-2.5 bg-slate-800 text-amber-400 rounded-xl shadow-lg">
            <RefreshCcw className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base font-black text-white uppercase tracking-wider">Vòng Lặp Đối Soát Cuối Kỳ (Bước 4 - 6)</h3>
            <p className="text-xs text-slate-400 font-medium">Báo cáo cân đối chi phí và hoàn dư thừa/khấu trừ thực chi</p>
          </div>
        </div>

        {/* Circular network flow visually drawn */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 select-all">
          
          {/* Team Digital role */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-3">
            <div>
              <span className="text-[9px] uppercase font-black text-amber-500 block font-mono">Team Digital (Bước 4 &amp; 5)</span>
              <h5 className="font-extrabold text-white text-xs mt-1">ĐỐI SOÁT CHI PHÍ CHẠY SỐ</h5>
              <p className="text-[11px] leading-relaxed text-slate-400 mt-2 font-medium">
                Thực hiện nghiệm thu đối soát chi tiết chi phí quảng cáo chạy thực tế trên các kênh thầu. Kết xuất báo cáo và số liệu thô gửi trực tiếp bàn giao phòng Ban Kế toán làm cơ sở duyệt.
              </p>
            </div>
            <Badge variant="outline" className="text-[9px] py-0 bg-slate-950 text-slate-400 border-slate-800 rounded self-start font-mono">MỞ THỎA THUẬN</Badge>
          </div>

          {/* GD Khoi role */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-3">
            <div>
              <span className="text-[9px] uppercase font-black text-violet-400 block font-mono">GĐ Khối (Bước 5)</span>
              <h5 className="font-extrabold text-white text-xs mt-1">XÁC MINH VÀ DUYỆT SỐ CHI</h5>
              <p className="text-[11px] leading-relaxed text-slate-400 mt-2 font-medium">
                Chủ trì kiểm tra, xem xét kĩ và ký xác nhận lại tất cả dải chi phí quảng cáo, mục tiêu phân bổ và KPI chuyển đổi thực tế đã thực hiện.
              </p>
            </div>
            <Badge variant="outline" className="text-[9px] py-0 bg-slate-950 text-slate-400 border-slate-800 rounded self-start font-mono">KÝ DUYỆT BẢN MỀM</Badge>
          </div>

          {/* Ke Toan role */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-3">
            <div>
              <span className="text-[9px] uppercase font-black text-emerald-400 block font-mono">Ban Kế toán (Bước 4 &amp; 6)</span>
              <h5 className="font-extrabold text-white text-xs mt-1">LẬP BẢNG CÂN ĐỐI TIỀN MẶT</h5>
              <p className="text-[11px] leading-relaxed text-slate-400 mt-2 font-medium">
                Đối chiếu sát chi phí thực tế chạy so với mức tổng ngân sách đối ứng đã bàn giao thầu từ đầu kỳ. Tính toán mức chênh lệch thừa/thiếu (thực hiện hoàn ứng hoặc khấu trừ). Gửi bản tính chi phí chênh cùng.
              </p>
            </div>
            <Badge variant="outline" className="text-[9px] py-0 bg-slate-950 text-slate-400 border-slate-800 rounded self-start font-mono">CÂN ĐỐI VAT &amp; DÒNG TIỀN</Badge>
          </div>

        </div>

        {/* Center state banner */}
        <div className="bg-slate-950 border border-slate-800/80 p-5 rounded-2xl text-center">
          <span className="text-amber-500 font-extrabold text-xs uppercase tracking-wider block mb-1">Cơ chế Quyết toán cuối cùng:</span>
          <p className="text-xs font-black text-slate-100 max-w-2xl mx-auto leading-relaxed">
            Kế toán tiến hành giải ngân thanh toán bù phần thiếu hụt hoặc trực tiếp khấu trừ phần chi phí chênh lệch thực tế cuối cùng với GĐ Khối làm căn cứ chốt sổ!
          </p>
        </div>
      </div>

      {/* Sơ đồ tổng thể quy trình - Page 8 */}
      <div className="bg-white border rounded-[2rem] shadow-sm p-6 md:p-8 space-y-6">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-black text-slate-400 block font-mono">Process blueprint map</span>
          <h3 className="text-base font-black text-slate-800 uppercase">Bản Đồ Tổng Thể Đường Đi Quy Trình Đối Ứng</h3>
          <p className="text-xs text-slate-400 font-medium font-mono">Visual timeline architecture matching slide 8</p>
        </div>

        {/* Dynamic Road visual mapping path from slide 8 */}
        <div className="relative overflow-hidden bg-slate-50 border p-6 rounded-3xl space-y-8 select-all">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            
            {/* Step 1 center point */}
            <div className="border bg-white p-4.5 rounded-2xl text-center space-y-2 relative shadow-xs">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-black flex items-center justify-center text-xs mx-auto">1</span>
              <h5 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">BƯỚC 1: TRÌNH DUYỆT</h5>
              <p className="text-[10.5px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                GĐ Khối gửi tờ trình đăng ký phê duyệt hạn ngạch qua email báo cáo CEO duyệt.
              </p>
            </div>

            {/* Split Tuyen A / B visual Box */}
            <div className="border bg-white p-4.5 rounded-2xl space-y-3 relative shadow-xs">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-black flex items-center justify-center text-xs mx-auto">2-3</span>
              <h5 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide text-center">BƯỚC 2 - 3: PHÂN LUỒNG TRIỂN KHAI</h5>
              
              <div className="space-y-1 text-[10px] font-sans font-bold leading-relaxed text-slate-600">
                <div className="bg-teal-50/45 p-2 rounded-lg text-teal-950 flex justify-between items-center">
                  <span>Tuyến A: Khối tự triển khai</span>
                  <Badge className="bg-teal-500 text-white border-none py-0 px-1 text-[8.5px]">Nộp 50% tiền</Badge>
                </div>
                <div className="bg-amber-50/45 p-2 rounded-lg text-amber-950 flex justify-between items-center">
                  <span>Tuyến B: Ủy quyền sang Digital</span>
                  <Badge className="bg-amber-500 text-white border-none py-0 px-1 text-[8.5px]">Nộp 100% tiền</Badge>
                </div>
              </div>
            </div>

            {/* Step 4-6 loop point */}
            <div className="border bg-[#102A43] text-white p-4.5 rounded-2xl text-center space-y-2 relative shadow-xs">
              <span className="w-6 h-6 rounded-full bg-slate-800 text-white font-black flex items-center justify-center text-xs mx-auto">4-6</span>
              <h5 className="font-extrabold text-white text-xs uppercase tracking-wide">BƯỚC 4 - 6: ĐỐI SOÁT</h5>
              <p className="text-[10.5px] text-slate-300 leading-relaxed max-w-xs mx-auto">
                Kết chu kỳ thực chi thầu &rarr; Kế toán lập bảng đối soát chi phí thô, xử lý khấu trừ dải hoặc hoàn tiền thừa.
              </p>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
