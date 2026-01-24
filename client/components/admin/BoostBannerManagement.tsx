import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Trash2, Upload, Save, Eye, EyeOff } from "lucide-react";

interface BoostBannerSettings {
  _id?: string;
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

export default function BoostBannerManagement() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<BoostBannerSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [boostedCount, setBoostedCount] = useState(0);

  useEffect(() => {
    fetchSettings();
    fetchBoostedCount();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/boost-banner-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setSettings({ ...defaultSettings, ...data.data });
        }
      }
    } catch (error) {
      console.error("Error fetching boost banner settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBoostedCount = async () => {
    try {
      const response = await fetch("/api/properties/boosted");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBoostedCount(Array.isArray(data.data) ? data.data.length : 0);
        }
      }
    } catch (error) {
      console.error("Error fetching boosted count:", error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/boost-banner-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: "success", text: "Boost banner settings saved successfully!" });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to save settings" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error saving settings" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-[#C70000] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Boost Up Banner Management</h2>
          <p className="text-gray-600 mt-1">
            Configure the boost banner displayed above Featured Properties on homepage
          </p>
        </div>
        <div className="text-right">
          <span className="text-sm text-gray-500">Active Boosted Properties:</span>
          <span className="ml-2 text-lg font-bold text-[#C70000]">{boostedCount}</span>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Banner Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="enabled">Enable Boost Banner</Label>
              <Switch
                id="enabled"
                checked={settings.enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
              />
            </div>

            <div>
              <Label htmlFor="title">Banner Title</Label>
              <Input
                id="title"
                value={settings.title}
                onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                placeholder="Boost Your Property"
              />
            </div>

            <div>
              <Label htmlFor="subtitle">Banner Subtitle</Label>
              <Input
                id="subtitle"
                value={settings.subtitle}
                onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
                placeholder="Get more visibility with our Boost Plans"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="backgroundColor">Background Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="backgroundColor"
                    type="color"
                    value={settings.backgroundColor}
                    onChange={(e) => setSettings({ ...settings, backgroundColor: e.target.value })}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={settings.backgroundColor}
                    onChange={(e) => setSettings({ ...settings, backgroundColor: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="textColor">Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="textColor"
                    type="color"
                    value={settings.textColor}
                    onChange={(e) => setSettings({ ...settings, textColor: e.target.value })}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={settings.textColor}
                    onChange={(e) => setSettings({ ...settings, textColor: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="linkUrl">Button Link URL</Label>
              <Input
                id="linkUrl"
                value={settings.linkUrl}
                onChange={(e) => setSettings({ ...settings, linkUrl: e.target.value })}
                placeholder="/packages"
              />
            </div>

            <div>
              <Label htmlFor="linkText">Button Text</Label>
              <Input
                id="linkText"
                value={settings.linkText}
                onChange={(e) => setSettings({ ...settings, linkText: e.target.value })}
                placeholder="Boost Now"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="showBoostedCount">Show Boosted Properties Count</Label>
              <Switch
                id="showBoostedCount"
                checked={settings.showBoostedCount}
                onCheckedChange={(checked) => setSettings({ ...settings, showBoostedCount: checked })}
              />
            </div>

            <Button onClick={saveSettings} disabled={saving} className="w-full bg-[#C70000] hover:bg-[#A60000]">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Banner Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="rounded-lg p-4 flex items-center justify-between"
              style={{ backgroundColor: settings.backgroundColor, color: settings.textColor }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{settings.title}</span>
                  {settings.showBoostedCount && (
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">
                      {boostedCount} Active
                    </span>
                  )}
                </div>
                <p className="text-sm opacity-90">{settings.subtitle}</p>
              </div>
              <button
                className="px-4 py-2 rounded-lg font-medium transition-colors"
                style={{
                  backgroundColor: settings.textColor,
                  color: settings.backgroundColor,
                }}
              >
                {settings.linkText}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-4 text-center">
              This banner will appear above "Featured Properties" section on homepage
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
