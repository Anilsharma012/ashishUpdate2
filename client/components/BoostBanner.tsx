import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, ArrowRight } from "lucide-react";

interface BoostBannerSettings {
  enabled: boolean;
  title: string;
  subtitle: string;
  backgroundColor: string;
  textColor: string;
  linkUrl: string;
  linkText: string;
  showBoostedCount: boolean;
}

const defaultSettings: BoostBannerSettings = {
  enabled: true,
  title: "Boost Your Property",
  subtitle: "Get more visibility with our Boost Plans",
  backgroundColor: "#dc2626",
  textColor: "#ffffff",
  linkUrl: "/packages",
  linkText: "Boost Now",
  showBoostedCount: true,
};

export default function BoostBanner() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<BoostBannerSettings>(defaultSettings);
  const [boostedCount, setBoostedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsRes, boostedRes] = await Promise.all([
          fetch("/api/boost-banner-settings"),
          fetch("/api/properties/boosted"),
        ]);

        if (settingsRes.ok) {
          const data = await settingsRes.json();
          if (data.success && data.data) {
            setSettings({ ...defaultSettings, ...data.data });
          }
        }

        if (boostedRes.ok) {
          const data = await boostedRes.json();
          if (data.success) {
            setBoostedCount(Array.isArray(data.data) ? data.data.length : 0);
          }
        }
      } catch (error) {
        console.warn("Error fetching boost banner data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading || !settings.enabled) {
    return null;
  }

  return (
    <div className="px-4 mb-4">
      <div
        className="rounded-xl p-3 sm:p-4 flex items-center justify-between cursor-pointer hover:opacity-95 transition-opacity shadow-sm"
        style={{ backgroundColor: settings.backgroundColor, color: settings.textColor }}
        onClick={() => navigate(settings.linkUrl)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="bg-white/20 p-2 rounded-lg flex-shrink-0">
            <Zap className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm sm:text-base">{settings.title}</span>
              {settings.showBoostedCount && boostedCount > 0 && (
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs whitespace-nowrap">
                  {boostedCount} Active
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm opacity-90 truncate">{settings.subtitle}</p>
          </div>
        </div>
        <button
          className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium text-xs sm:text-sm flex items-center gap-1 flex-shrink-0 transition-colors hover:opacity-90"
          style={{
            backgroundColor: settings.textColor,
            color: settings.backgroundColor,
          }}
          onClick={(e) => {
            e.stopPropagation();
            navigate(settings.linkUrl);
          }}
        >
          {settings.linkText}
          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </button>
      </div>
    </div>
  );
}
