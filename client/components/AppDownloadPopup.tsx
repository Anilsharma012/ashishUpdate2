import React, { useEffect, useMemo, useState } from "react";
import { X, Download, Smartphone } from "lucide-react";

const APK_URL = "/api/app/download";
const STORAGE_KEY = "ap_download_popup_hidden";

function isAndroid() {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

export default function AppDownloadPopup() {
  const [popupOpen, setPopupOpen] = useState(false);
  const [showFloatingBtn, setShowFloatingBtn] = useState(false);

  const android = useMemo(() => isAndroid(), []);
  const hidden = useMemo(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
  }, []);

  useEffect(() => {
    setShowFloatingBtn(true);
    if (android && !hidden) {
      const t = setTimeout(() => setPopupOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, [android, hidden]);

  const closePopup = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    setPopupOpen(false);
  };

  const handleDownload = () => {
    window.location.href = APK_URL;
  };

  return (
    <>
      {showFloatingBtn && (
        <button
          onClick={() => popupOpen ? closePopup() : handleDownload()}
          className="fixed bottom-24 right-4 z-[90] flex items-center justify-center w-14 h-14 rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 transition-all animate-bounce"
          style={{ animationDuration: "2s" }}
          title="Download APK"
        >
          <div className="relative">
            <Smartphone size={24} />
            <Download size={12} className="absolute -bottom-1 -right-1 bg-green-600 rounded-full" />
          </div>
        </button>
      )}

      {popupOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40">
          <div className="w-full sm:w-[420px] mx-4 rounded-xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-[#dc2626]">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Smartphone size={20} />
                Get the Ashish Properties App
              </div>
              <button onClick={closePopup} className="p-1 rounded hover:bg-white/20 text-white" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 text-sm text-gray-700 space-y-3">
              <p className="text-gray-600">
                APK installs only on Android
              </p>

              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white border-2 border-[#dc2626] text-[#dc2626] hover:bg-red-50 font-medium"
              >
                <Download size={20} />
                Download App
              </button>

              <p className="text-xs text-gray-500 text-center">
                Note: Enable "Unknown Sources" in Settings if required
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
