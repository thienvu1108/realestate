import React, { useState } from 'react';
import { 
  FileText, Link, HelpCircle, Phone, Mail, MapPin, Building2, CheckCircle2, 
  XCircle, AlertTriangle, ArrowRight, Copy, Check, Users, ShieldAlert, FileSpreadsheet, 
  Download, Laptop, Send, ExternalLink, QrCode
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function MktProcessManager() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [checklist, setChecklist] = useState<Record<number, boolean>>({
    1: false,
    2: false,
    3: false,
    4: false,
    5: false
  });

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}!`);
  };

  const steps = [
    { id: 1, title: 'Đăng ký Ngân sách', date: 'Ngày 15 - 20', color: 'amber' },
    { id: 2, title: 'Lập Báo cáo MKT', date: 'Ngày 21 - 25', color: 'blue' },
    { id: 3, title: 'Nghiệm thu Tài khoản', date: 'Ngày 25 - 31', color: 'indigo' },
    { id: 4, title: 'Nộp Hồ sơ Bản cứng', date: 'Trước ngày 05', color: 'emerald' }
  ];

  const handleToggleCheck = (index: number) => {
    setChecklist(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const allChecked = Object.values(checklist).every(v => v === true);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Banner Cover Page 1 */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-[#102A43] to-slate-950 rounded-[2.5rem] p-8 md:p-12 text-white border border-slate-800 shadow-xl shadow-slate-950/10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent opacity-70 pointer-events-none" />
        <div className="relative flex flex-col items-center text-center space-y-6 max-w-4xl mx-auto">
          {/* Logo Placeholder */}
          <div className="flex items-center gap-2 mb-2">
            <span className="p-3 bg-amber-500 text-slate-950 rounded-2xl font-black text-xl tracking-wider shadow-lg shadow-amber-500/20 font-mono">
              MAYHOMES
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight uppercase font-sans">
            Quy Trình Nghiệm Thu &amp; <br />
            <span className="text-amber-400 bg-clip-text">Hỗ Trợ Chi Phí Marketing</span>
          </h1>
          <p className="text-slate-300 font-medium max-w-2xl text-sm md:text-base leading-relaxed">
            Quy chuẩn vận hành, cấu trúc báo cáo và quy định tài chính dành cho <strong className="text-white">Khối Kinh Doanh</strong>.
          </p>
          <div className="pt-2">
            <Badge className="bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 py-1.5 px-4 rounded-full text-xs font-bold font-mono tracking-wider">
              Ban hành bởi Bộ phận Digital Marketing
            </Badge>
          </div>
        </div>
      </div>

      {/* Stepper Timeline Navigation */}
      <div className="bg-white/90 backdrop-blur border border-slate-200/80 p-5 rounded-[2rem] shadow-md">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2 px-1">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" /> Sơ đồ quy trình 4 bước chính
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((s, index) => {
            const isActive = activeStep === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveStep(s.id)}
                className={`relative group text-left p-5 rounded-2xl border transition-all duration-300 w-full overflow-hidden ${
                  isActive 
                    ? 'border-amber-500 bg-amber-50/40 shadow-md shadow-amber-500/5 translate-y-[-2px]' 
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/65'
                }`}
              >
                {/* Accent strip */}
                <div className={`absolute top-0 left-0 right-0 h-1 transition-all ${
                  isActive ? 'bg-amber-500' : 'bg-slate-200 group-hover:bg-slate-300'
                }`} />

                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className={`text-[11px] font-black uppercase tracking-wider ${
                    isActive ? 'text-amber-600' : 'text-slate-400'
                  }`}>
                    Bước {s.id}
                  </span>
                  <Badge variant="outline" className={`text-[10px] font-bold ${
                    isActive ? 'bg-amber-100 text-amber-800 border-ambient/20' : 'text-slate-500'
                  }`}>
                    {s.date}
                  </Badge>
                </div>

                <div className="font-bold text-slate-950 mt-3 text-sm md:text-base pr-4">
                  {s.title}
                </div>

                {index < 3 && (
                  <ArrowRight className="hidden lg:block absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Interactive Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Step details: col-span-8 */}
        <div className="lg:col-span-8 space-y-6">
          {activeStep === 1 && (
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-md overflow-hidden animate-in fade-in duration-300">
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 md:p-8 text-white flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-xs font-black uppercase tracking-widest text-amber-100 bg-white/10 px-3 py-1 rounded-full">Bước 1</span>
                  <h2 className="text-xl md:text-2xl font-black">ĐĂNG KÝ HỖ TRỢ CHI PHÍ</h2>
                  <p className="text-xs text-amber-50 font-medium">Cấu hình ngân sách dự toán trước chu kỳ</p>
                </div>
                <Badge className="bg-white text-amber-700 hover:bg-amber-50 py-1 px-3 text-xs font-bold rounded-lg shrink-0 shadow-sm font-mono">
                  Ngày 15 - 20 Hàng Tháng
                </Badge>
              </div>

              <div className="p-6 md:p-8 space-y-6">
                {/* Link Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 md:p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                      <Laptop className="w-5 h-5" />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Cổng đăng ký trực tuyến</h4>
                      <p className="text-[11px] text-slate-500 font-medium">Hệ thống ghi nhận tờ trình tự động</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch gap-2">
                    <div className="bg-white border rounded-xl px-4 py-3 flex-1 flex items-center justify-between font-mono text-xs font-bold text-slate-600 select-all overflow-x-auto">
                      https://chiphi.mayhomes.net/
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleCopy('https://chiphi.mayhomes.net/', 'Cổng đăng ký')}
                        variant="outline"
                        className="rounded-xl shrink-0"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button 
                        asChild 
                        nativeButton={false} 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold font-mono tracking-wide flex-1 sm:flex-initial"
                      >
                        <a href="https://chiphi.mayhomes.net/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                          MỞ LINK <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-[11px] text-indigo-700 font-semibold bg-indigo-50/60 p-3 rounded-lg border border-indigo-100">
                    <span className="shrink-0 text-amber-500 mt-0.5 animate-bounce">🚨</span>
                    <p>
                      <strong>Lưu ý quan trọng:</strong> Sao chép đường dẫn (Copy link) này và dán mở trên các trình duyệt web trực tiếp như <strong>Google Chrome hoặc Safari</strong>. <strong className="text-rose-600">TUYỆT ĐỐI KHÔNG</strong> mở trực tiếp thông qua trình duyệt nội bộ của ứng dụng Zalo để tránh lỗi form và phiên làm việc cookie.
                    </p>
                  </div>
                </div>

                {/* 3 Core Rules */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Quy tắc đăng ký ngân sách</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border border-emerald-200/80 bg-emerald-50/15 p-4 rounded-2xl flex flex-col justify-between space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                        </span>
                        <span className="text-xs font-extrabold uppercase text-emerald-800 tracking-wider">Tiêu chuẩn</span>
                      </div>
                      <p className="text-[11px] font-semibold leading-relaxed text-slate-700">
                        Cam kết <strong>100% trung thực</strong> và thiết lập kế hoạch triển khai chi tiết rõ ràng trước khi bấm đăng ký.
                      </p>
                    </div>

                    <div className="border border-rose-200/80 bg-rose-50/15 p-4 rounded-2xl flex flex-col justify-between space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-rose-100 text-rose-600 rounded-lg shrink-0">
                          <XCircle className="w-4 h-4" />
                        </span>
                        <span className="text-xs font-extrabold uppercase text-rose-800 tracking-wider">Nghiêm cấm</span>
                      </div>
                      <p className="text-[11px] font-semibold leading-relaxed text-slate-700">
                        <strong>KHÔNG tự ý điều chỉnh</strong> kế hoạch ngân sách sau thời gian chốt. Mọi chỉnh sửa bắt buộc phải liên hệ Team Digital.
                      </p>
                    </div>

                    <div className="border border-amber-200/80 bg-amber-50/15 p-4 rounded-2xl flex flex-col justify-between space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-amber-100 text-amber-600 rounded-lg shrink-0">
                          <AlertTriangle className="w-4 h-4" />
                        </span>
                        <span className="text-xs font-extrabold uppercase text-amber-800 tracking-wider">Quá hạn</span>
                      </div>
                      <p className="text-[11px] font-semibold leading-relaxed text-slate-700">
                        Nộp trễ hạn (sau ngày 20) = <strong>Hệ thống tự từ chối</strong> xem xét hỗ trợ (trừ trường hợp được BLĐ duyệt qua Email văn bản).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-md overflow-hidden animate-in fade-in duration-300">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 md:p-8 text-white flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-xs font-black uppercase tracking-widest text-blue-100 bg-white/10 px-3 py-1 rounded-full">Bước 2</span>
                  <h2 className="text-xl md:text-2xl font-black">LẬP BÁO CÁO CO-MKT (.PPTX)</h2>
                  <p className="text-xs text-blue-50 font-medium">Báo cáo hiệu quả chất lượng theo mẫu kiểm toán</p>
                </div>
                <Badge className="bg-white text-blue-700 hover:bg-blue-50 py-1 px-3 text-xs font-bold rounded-lg shrink-0 shadow-sm font-mono">
                  Ngày 21 - 25 Hàng Tháng
                </Badge>
              </div>

              <div className="p-6 md:p-8 space-y-6">
                
                {/* Two-Column Drive & Zalo info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Google Drive Card */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl w-10 h-10 flex items-center justify-center">
                        <Download className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Thư viện Biểu mẫu chuẩn</h4>
                      <p className="text-[11px] leading-relaxed text-slate-500 font-medium">
                        Tải trọn bộ tài liệu: File Mẫu Báo Cáo Slide (.PPTX), Đề Nghị Thanh Toán, Bảng Kê Chi Tiết.
                      </p>
                    </div>
                    <Button variant="outline" className="w-full bg-white border-slate-200 text-blue-600 hover:text-blue-700 font-bold rounded-xl mt-2 flex items-center gap-2">
                      <ExternalLink className="w-3.5 h-3.5" /> Truy cập Google Drive
                    </Button>
                  </div>

                  {/* Zalo Card */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl w-10 h-10 flex items-center justify-center">
                        <Send className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Nộp hồ sơ mềm</h4>
                      <p className="text-[11px] leading-relaxed text-slate-500 font-medium">
                        Gửi file mềm đã lập hoàn tất trực tiếp qua Zalo để kiểm duyệt cấu trúc kỹ thuật.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Button 
                        onClick={() => handleCopy('0854642555', 'Số điện thoại Zalo')}
                        variant="outline" 
                        className="flex-1 font-mono text-xs font-bold py-1 px-2 h-9 rounded-xl border-slate-200"
                      >
                        SĐT: 0854.64.2555
                      </Button>
                      <Badge className="bg-sky-600 hover:bg-sky-700 text-white font-black py-1.5 px-3 rounded-lg text-[10px] uppercase font-mono">
                        QTV: THIÊN VŨ
                      </Badge>
                    </div>
                  </div>

                </div>

                {/* Structure visual Tree */}
                <div className="border border-slate-100 rounded-2xl p-5 space-y-3 bg-slate-50/50">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Cấu trúc báo cáo phân cấp bắt buộc</h4>
                  
                  <div className="space-y-2 font-mono text-xs font-bold text-slate-700">
                    <div className="flex items-center gap-2 bg-white border p-3 rounded-xl shadow-xs">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px]">1</span>
                      <span>Mức 1:</span>
                      <span className="text-blue-600 font-extrabold uppercase">TÊN DỰ ÁN</span>
                    </div>

                    <div className="ml-6 flex items-center gap-2 bg-white border p-3 rounded-xl shadow-xs">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px]">2</span>
                      <span>Mức 2:</span>
                      <span className="text-indigo-600">CÁC KÊNH CHẠY SỐ</span>
                      <span className="font-normal text-[10px] text-slate-400 font-sans italic">(VD: Facebook, Google, Tiktok)</span>
                    </div>

                    <div className="ml-12 flex items-center gap-2 bg-white border p-3 rounded-xl shadow-xs">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px]">3</span>
                      <span>Mức 3:</span>
                      <span className="text-emerald-600">CHI TIẾT TỪNG TÀI KHOẢN</span>
                      <span className="font-normal text-[10px] text-slate-400 font-sans italic">(Bảng kê chi tiết tiền, nội dung, thời gian chạy)</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeStep === 3 && (
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-md overflow-hidden animate-in fade-in duration-300">
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 md:p-8 text-white flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-xs font-black uppercase tracking-widest text-indigo-100 bg-white/10 px-3 py-1 rounded-full">Bước 3</span>
                  <h2 className="text-xl md:text-2xl font-black">NGHIỆM THU TÀI KHOẢN</h2>
                  <p className="text-xs text-indigo-50 font-medium">Đối soát nghiệp vụ phần mềm giám sát chiến dịch quảng cáo</p>
                </div>
                <Badge className="bg-white text-indigo-700 hover:bg-indigo-50 py-1 px-3 text-xs font-bold rounded-lg shrink-0 shadow-sm font-mono">
                  Ngày 25 - 31 Hàng Tháng
                </Badge>
              </div>

              <div className="p-6 md:p-8 space-y-6">
                
                {/* Software Box */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-2xl p-4 bg-slate-50 text-center space-y-2">
                    <div className="font-black text-slate-800 text-xs uppercase tracking-wide">Công cụ 01</div>
                    <div className="font-black font-sans text-sky-600 text-base">Ultraview</div>
                    <div className="text-[10px] font-medium text-slate-400">Hỗ trợ kết nối Windows</div>
                  </div>

                  <div className="border rounded-2xl p-4 bg-slate-50 text-center space-y-2">
                    <div className="font-black text-slate-800 text-xs uppercase tracking-wide">Công cụ 02</div>
                    <div className="font-black font-sans text-amber-600 text-base">Google Remote</div>
                    <div className="text-[10px] font-medium text-slate-400">Vận hành đa nền tảng</div>
                  </div>
                </div>

                {/* 3 Conditions */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">3 Điều kiện Tiên quyết tuyệt đối</h4>
                  
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-3 bg-emerald-50/20 p-3.5 rounded-xl border border-emerald-100 text-emerald-950 font-sans text-xs font-semibold">
                      <span className="shrink-0 p-1 bg-emerald-500 text-white rounded-full mt-0.5">
                        <Check className="w-3 h-3" />
                      </span>
                      <div>
                        Trận dữ liệu tài khoản hiển thị chính xác: Chi phí thực tế khớp chu kỳ báo cáo, khung thời gian đối chiếu và phân phối nội dung đã cam kết.
                      </div>
                    </div>

                    <div className="flex items-start gap-3 bg-emerald-50/20 p-3.5 rounded-xl border border-emerald-100 text-emerald-950 font-sans text-xs font-semibold">
                      <span className="shrink-0 p-1 bg-emerald-500 text-white rounded-full mt-0.5">
                        <Check className="w-3 h-3" />
                      </span>
                      <div>
                        Kênh hotline hiển thị trên các nội dung quảng cáo <strong>CHẮC CHẮN 100%</strong> phải là số hotline chính thức cấp của nhân sự Mayhomes.
                      </div>
                    </div>

                    <div className="flex items-start gap-3 bg-rose-50/20 p-3.5 rounded-xl border border-rose-100 text-rose-950 font-sans text-xs font-semibold">
                      <span className="shrink-0 p-1 bg-rose-500 text-white rounded-full mt-0.5">
                        <XCircle className="w-3 h-3" />
                      </span>
                      <div>
                        <strong>TUYỆT ĐỐI KHÔNG NGHIỆM THU</strong> đối với các dải tài khoản quảng cáo đang bị khóa, bị vô hiệu hóa hoặc không còn khả năng đăng nhập truy xuất trực tiếp.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Campaign Naming Standard */}
                <div className="border-2 border-dashed border-indigo-100 rounded-3xl p-5 space-y-4 bg-indigo-50/10">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                      <Users className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-black uppercase text-indigo-800 tracking-wider">Tiêu chuẩn đặt tên chiến dịch</span>
                  </div>

                  <div className="bg-white border rounded-2xl p-4 text-center font-mono text-sm font-extrabold text-[#102A43] tracking-wide border-indigo-200">
                    [MAYHOMES] + [TÊN ĐỘI] + [DỰ ÁN]
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-emerald-50/50 border border-emerald-200 p-3.5 rounded-xl">
                      <div className="font-extrabold text-emerald-800 mb-1 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> NÊN (Mẫu Chuẩn)
                      </div>
                      <div className="font-mono font-bold text-slate-800 bg-white p-2 rounded border mt-1 select-all text-center">
                        Mayhomes - MH01.1 - OCP23
                      </div>
                    </div>

                    <div className="bg-rose-50/50 border border-rose-200 p-3.5 rounded-xl">
                      <div className="font-extrabold text-rose-800 mb-1 flex items-center gap-1.5">
                        <XCircle className="w-4 h-4" /> KHÔNG NÊN (Sai Lỗi)
                      </div>
                      <div className="font-mono font-bold text-slate-400 bg-white/40 p-2 rounded border border-dashed mt-1 text-center line-through">
                        MH - MH01.1 - OCP23
                      </div>
                      <p className="text-[10px] text-rose-600 font-bold mt-1.5 italic">Lỗi nghiêm trọng: Viết tắt chữ Mayhomes</p>
                    </div>
                  </div>

                  <div className="bg-rose-950 text-rose-100 p-3.5 rounded-xl text-center text-[11px] font-bold">
                    🚫 TUYỆT ĐỐI NGHIÊM CẤM: Hành vi đổi tên đổi nhãn chiến dịch cũ từ đơn vị/đại lý khác sang nhãn Mayhomes. Vi phạm sẽ bị tước quyền lợi nghiệm thu ngay lập tức!
                  </div>
                </div>

                {/* Zalo Match Group */}
                <div className="bg-slate-50 border p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex gap-3 items-center">
                    <span className="p-3 bg-sky-100 text-sky-600 rounded-xl font-black font-mono text-sm leading-none shrink-0">Zalo</span>
                    <div>
                      <h5 className="font-extrabold text-slate-800 text-sm">Nhóm Zalo Lịch Nghiệm Thu</h5>
                      <p className="text-[11px] text-slate-400 font-medium">Báo lịch trực tuyến định kỳ hàng tuần</p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto shrink-0">
                    <Button 
                      onClick={() => handleCopy('https://zalo.me/g/qtcgqe642', 'Nhóm Zalo Nghiệm Thu')}
                      variant="outline" 
                      className="rounded-xl flex-1 md:flex-initial"
                    >
                      Copy Link Group
                    </Button>
                    <Button asChild nativeButton={false} className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold flex-1 md:flex-initial">
                      <a href="https://zalo.me/g/qtcgqe642" target="_blank" rel="noopener noreferrer">
                        Tham gia nhóm
                      </a>
                    </Button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeStep === 4 && (
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-md overflow-hidden animate-in fade-in duration-300">
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6 md:p-8 text-white flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-100 bg-white/10 px-3 py-1 rounded-full">Bước 4</span>
                  <h2 className="text-xl md:text-2xl font-black">NỘP HỒ SƠ BẢN CỨNG</h2>
                  <p className="text-xs text-emerald-50 font-medium">Nộp chứng từ trực tiếp để bộ phận tài vụ làm hồ sơ thanh quyết toán</p>
                </div>
                <Badge className="bg-white text-emerald-700 hover:bg-emerald-50 py-1 px-3 text-xs font-bold rounded-lg shrink-0 shadow-sm font-mono">
                  Trước Ngày 05 Tháng Sau
                </Badge>
              </div>

              <div className="p-6 md:p-8 space-y-6">
                
                {/* Document checklist inside folder */}
                <div className="bg-slate-50 border p-6 rounded-3xl space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-2">
                    📂 Tủ Hồ sơ thanh quyết toán chuẩn:
                  </h4>

                  <div className="space-y-3 font-sans text-xs text-slate-700 font-bold">
                    <div className="flex items-center gap-3 bg-white p-3 border rounded-xl shadow-xs">
                      <span className="p-1 bg-emerald-500 text-white rounded-md shrink-0">
                        <FileText className="w-4 h-4" />
                      </span>
                      <div className="flex-1">
                        <h6>File báo cáo MKT bản giấy</h6>
                        <p className="text-[10px] text-slate-400 font-normal">Đã có ký xác nhận thẩm duyệt trực tiếp từ đại diện Team Digital</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white p-3 border rounded-xl shadow-xs">
                      <span className="p-1 bg-emerald-500 text-white rounded-md shrink-0">
                        <FileSpreadsheet className="w-4 h-4" />
                      </span>
                      <div className="flex-1">
                        <h6>Bảng kê chi tiết các hạng mục thanh toán</h6>
                        <p className="text-[10px] text-slate-400 font-normal">Liệt kê rõ ràng số tham chiếu và số liệu chiến dịch thực tế</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white p-3 border rounded-xl shadow-xs">
                      <span className="p-1 bg-emerald-500 text-white rounded-md shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                      <div className="flex-1">
                        <h6>Giấy Đề nghị thanh toán văn bản mẫu</h6>
                        <p className="text-[10px] text-slate-400 font-normal">Ký tươi, ghi rõ người thụ hưởng và các đề xuất thanh toán</p>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-emerald-800 font-bold italic text-center pt-2">
                    💡 Lưu ý: Anh/Chị bắt buộc phải scan thành tệp PDF đối với Giấy Đề nghị thanh toán và đính kèm gửi cùng file báo cáo mềm!
                  </p>
                </div>

                {/* Contacts according to regions page 8 */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Đầu mối đại diện nhận hồ sơ theo vùng</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Region North */}
                    <div className="border border-slate-200 bg-white rounded-2xl p-5 space-y-4 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3 bg-teal-500/10 text-teal-800 rounded-bl-xl font-bold font-mono text-[10px] uppercase">
                        Miền Bắc &amp; Trung
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-extrabold text-slate-500">Khu vực:</div>
                        <h5 className="font-extrabold text-slate-800 text-sm">Hà Nội, Hải Phòng, Thanh Hóa, Nha Trang, Quảng Ninh</h5>
                      </div>
                      <div className="border-t pt-4 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-extrabold text-slate-700 text-xs shadow-inner">
                             Hồng 
                          </div>
                          <div>
                            <h6 className="font-black text-slate-900 text-xs">Ms. Hồng</h6>
                            <p className="text-[10px] text-slate-400 font-mono">0343.251.535</p>
                          </div>
                        </div>
                        <Button 
                          onClick={() => handleCopy('0343251535', 'SĐT Ms Hồng')} 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 rounded-lg text-emerald-600 font-bold"
                        >
                          Copy SĐT
                        </Button>
                      </div>
                    </div>

                    {/* Region South */}
                    <div className="border border-slate-200 bg-white rounded-2xl p-5 space-y-4 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3 bg-indigo-500/10 text-indigo-800 rounded-bl-xl font-bold font-mono text-[10px] uppercase">
                        Miền Nam
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-extrabold text-slate-500">Khu vực:</div>
                        <h5 className="font-extrabold text-slate-800 text-sm">Chi Nhánh Miền Nam</h5>
                      </div>
                      <div className="border-t pt-4 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-extrabold text-slate-700 text-xs shadow-inner">
                            Nhung
                          </div>
                          <div>
                            <h6 className="font-black text-slate-900 text-xs">Ms. Hồng Nhung</h6>
                            <p className="text-[10px] text-slate-400 font-mono">Đầu mối phụ trách</p>
                          </div>
                        </div>
                        <Badge className="bg-indigo-100 text-indigo-800 font-bold font-mono text-[9px] py-0.5 rounded-md border-none">
                          MIỀN NAM
                        </Badge>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Quy Định Tài Chính Card (Page 9) */}
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-md p-6 md:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <span className="p-3 bg-slate-100 text-slate-900 rounded-2xl shadow-sm">
                <Building2 className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase">Thông tin Hóa đơn VAT Mayhomes</h3>
                <p className="text-xs text-slate-500 font-medium">Bắt buộc lập chính xác thông tin pháp lý của Công ty</p>
              </div>
            </div>

            {/* Corporate VAT Card Visual (Page 9) */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden border border-slate-800 shadow-lg select-all">
              <div className="absolute bottom-0 right-0 translate-x-10 translate-y-10 w-44 h-44 rounded-full bg-slate-800/20 blur-3xl" />
              
              <div className="space-y-4 font-sans text-xs relative">
                <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black tracking-wider uppercase text-amber-500">Mẫu hóa đơn GTGT</span>
                    <h5 className="font-black text-sm text-slate-100">CÔNG TY CP KINH DOANH BĐS MAYHOMES</h5>
                  </div>
                  <Badge variant="outline" className="border-amber-500/30 text-amber-500 text-[10px] py-0 font-mono">
                    MST: 0110347195
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 font-sans text-[11px] leading-relaxed text-slate-300">
                  <div className="space-y-2">
                    <div>
                      <strong className="text-slate-400 block text-[9.5px] uppercase font-black">Địa chỉ pháp lý:</strong>
                      <span>SB24-30, Sao Biển 24, KĐT Vinhomes Ocean Park, Xã Gia Lâm, Thành phố Hà Nội, Việt Nam.</span>
                    </div>
                    <div>
                      <strong className="text-slate-400 block text-[9.5px] uppercase font-black">Đại diện pháp luật:</strong>
                      <span className="font-bold text-white">Đặng Thị Phước Hạnh</span> <span className="text-slate-400 font-normal text-[10px] italic">(Tổng Giám Đốc)</span>
                    </div>
                  </div>

                  <div className="space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                    <div>
                      <strong className="text-amber-500 block text-[9.5px] uppercase font-black">Số tài khoản ngân hàng:</strong>
                      <span className="font-mono font-bold text-sm text-white select-all">16868168</span>
                    </div>
                    <div>
                      <strong className="text-slate-400 block text-[9.5px] uppercase font-black">Mở tại Ngân hàng:</strong>
                      <span>Techcombank – Chi Nhánh Hà Nội</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-3 flex flex-col sm:flex-row justify-between gap-2 items-stretch sm:items-center text-[11.5px]">
                  <div className="font-semibold text-slate-400">
                    📧 Email nhận hóa đơn mềm: <strong className="text-slate-100 font-mono">ketoanhoadon@mayhomes.vn</strong>
                  </div>
                  <Button 
                    onClick={() => handleCopy('ketoanhoadon@mayhomes.vn', 'Email nhận HĐ')}
                    size="sm" 
                    className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg gap-1.5 shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" /> Sao chép Email
                  </Button>
                </div>
              </div>
            </div>

            {/* Email title protocol */}
            <div className="border border-slate-200 rounded-2xl p-4 md:p-5 bg-slate-50 space-y-2 text-xs">
              <h5 className="font-extrabold text-slate-800">Cú pháp Tiêu đề Email bắt buộc:</h5>
              <div className="bg-white border rounded-xl p-3 text-center font-mono font-black text-slate-700 tracking-wider">
                Mã nhóm_Tên nhóm_Số Hóa đơn
              </div>
              <p className="text-[10px] text-slate-400 font-semibold italic">
                * Note quan trọng: Riêng đối với kênh đăng tin, Anh/Chị bắt buộc phải gửi đính kèm đầy đủ hình ảnh/ảnh chụp bài đăng thực tế.
              </p>
            </div>

            {/* Bds.com specific warning Page 10 */}
            <div className="border-2 border-rose-500/20 bg-rose-50/15 rounded-3xl p-5 md:p-6 space-y-4">
              <div className="flex items-start gap-3">
                <span className="p-2.5 bg-rose-500 text-white rounded-2xl shrink-0 mt-0.5 animate-pulse">
                  <ShieldAlert className="w-5 h-5" />
                </span>
                <div className="space-y-1">
                  <h4 className="font-black text-sm text-rose-900 uppercase">
                    LƯU Ý RIÊNG: KÊNH ĐĂNG TIN BĐS.COM
                  </h4>
                  <p className="text-[10.5px] font-bold text-rose-700 bg-rose-100/65 py-0.5 px-2 rounded-md inline-block">
                    ⚡ Quy định áp dụng chính thức từ ngày: 21/05/2026
                  </p>
                </div>
              </div>

              <div className="bg-white border border-rose-300 p-4 rounded-2xl shadow-sm text-center">
                <p className="text-xs font-black text-rose-900 leading-relaxed">
                  CÔNG TY SẼ CHÍNH THỨC <span className="bg-rose-100 text-rose-600 px-1 py-0.5 rounded">NGỪNG HỖ TRỢ</span> CHI PHÍ ĐĂNG TIN ĐỐI VỚI CÁC TÀI KHOẢN NẠP TIỀN QUA <span className="text-red-600 underline">TÀI KHOẢN CÁ NHÂN</span>.
                </p>
                <p className="text-[10.5px] font-semibold text-slate-500 mt-2">
                  Vui lòng khẩn trương chuẩn bị và triển khai phương án chuyển đổi từ bây giờ!
                </p>
              </div>

              <div className="p-4 bg-slate-50 border rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
                  <span>Đăng ký chung BẮT BUỘC qua nhóm Zalo Công ty</span>
                </div>
                <div className="flex gap-2 w-full sm:w-auto shrink-0">
                  <Button 
                    onClick={() => handleCopy('https://zalo.me/g/vyfmvn754', 'Group Zalo bds.com')}
                    size="sm" 
                    variant="outline" 
                    className="flex-1 sm:flex-initial"
                  >
                    Copy Link
                  </Button>
                  <Button asChild nativeButton={false} size="sm" className="bg-slate-900 hover:bg-slate-900 text-white flex-1 sm:flex-initial">
                    <a href="https://zalo.me/g/vyfmvn754" target="_blank" rel="noopener noreferrer">
                      Vào Group
                    </a>
                  </Button>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Sidebar: checklist checklist & final acceptance checklist: col-span-4 */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Last Check checklist Card Page 11 */}
          <div className="bg-gradient-to-b from-[#102A43] to-slate-900 text-slate-200 rounded-[2.5rem] border border-slate-800 shadow-xl p-6 md:p-8 space-y-6">
            <div className="space-y-1 text-center">
              <span className="text-amber-500 p-2.5 bg-slate-800 rounded-3xl inline-block shadow-lg shadow-slate-950/40">
                <QrCode className="w-6 h-6" />
              </span>
              <h3 className="text-lg font-black text-white uppercase tracking-wider pt-2">KIỂM TRA LẦN CUỐI</h3>
              <p className="text-[11px] text-slate-400 font-medium">Khi đạt đủ 5 checklist này, hồ sơ của bạn đã trong trạng thái sãn sàng chờ duyệt!</p>
            </div>

            <div className="space-y-3 pt-2">
              {[
                { id: 1, text: 'Tôi đã đăng ký ngân sách hỗ trợ trên web trước mốc ngày 20 chưa?' },
                { id: 2, text: 'File báo cáo (.PPTX) đã phân chia chính xác cấu trúc phân cấp (Dự án > Kênh > Tài khoản) chưa?' },
                { id: 3, text: 'Tên chiến dịch quảng cáo đã chỉnh sửa đúng định dạng mẫu chuẩn [Mayhomes] + [Tên đội] + [Dự án] chưa?' },
                { id: 4, text: 'Hotline được cài đặt chạy Ads CÓ PHẢI là số thuộc cấp quyền của nhân sự Mayhomes không?' },
                { id: 5, text: 'Các hạng mục giao dịch trên 5 triệu đồng đã được chuyển thẳng trực tiếp từ ngân hàng Mayhomes sang nhà cung cấp (Vendor) chưa?' }
              ].map((item) => {
                const checked = checklist[item.id];
                return (
                  <button
                    key={item.id}
                    onClick={() => handleToggleCheck(item.id)}
                    className={`w-full flex items-start gap-3 p-3.5 rounded-2xl text-left border transition-all ${
                      checked 
                        ? 'bg-amber-500/10 border-amber-500/40 text-white' 
                        : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-950/60 text-slate-300'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border mt-0.5 transition-all duration-300 ${
                      checked 
                        ? 'bg-amber-500 border-amber-400 text-slate-950 scale-110' 
                        : 'border-slate-700 bg-slate-900/50'
                    }`}>
                      {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </span>
                    <span className="text-xs font-semibold leading-relaxed leading-[1.45]">
                      {item.id}. {item.text}
                    </span>
                  </button>
                );
              })}
            </div>

            {allChecked ? (
              <div className="bg-emerald-500/20 border-2 border-emerald-500 text-emerald-300 p-4 rounded-2xl text-center font-bold text-xs leading-relaxed animate-bounce duration-500 mt-4">
                🎉 HỒ SƠ ĐÃ HOÀN HẢO! <br/>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white">Sẵn sàng nộp và chờ duyệt quyết toán</span>
              </div>
            ) : (
              <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-2xl text-center text-[10px] text-slate-500 font-bold tracking-widest uppercase">
                Vui lòng check đủ 5 mục chứng từ
              </div>
            )}
          </div>

          {/* Quick FAQ / Contacts info */}
          <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-6 space-y-4 shadow-sm">
            <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Hỗ trợ khẩn cấp</h4>
            
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between gap-2 p-2.5 bg-white border rounded-xl">
                <span className="font-extrabold text-slate-700">Digital Marketing</span>
                <Badge className="bg-slate-200 hover:bg-slate-200 text-slate-800 border-none font-bold font-mono">zalo/hotline</Badge>
              </div>

              <div className="flex items-center justify-between gap-2 p-2.5 bg-white border rounded-xl">
                <span className="font-extrabold text-slate-700">Phòng Kế toán</span>
                <Badge className="bg-slate-200 hover:bg-slate-200 text-slate-800 border-none font-bold font-mono">quyết toán nước</Badge>
              </div>
            </div>

            <p className="text-[10px] leading-relaxed text-slate-400 italic text-center pt-1">
              "Mọi thắc mắc xin vui lòng liên hệ Bộ phận Digital Marketing hoặc Phòng Kế toán."
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
