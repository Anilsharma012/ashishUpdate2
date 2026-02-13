import React, { useState, useEffect } from "react";
import OLXStyleHeader from "../components/OLXStyleHeader";
import OLXStyleCategories from "../components/OLXStyleCategories";
import TopBanner from "../components/TopBanner";
import OLXStyleListings from "../components/OLXStyleListings";
import PackagesShowcase from "../components/PackagesShowcase";
import PWAInstallPrompt from "../components/PWAInstallPrompt";
{/* import PWAInstallButton from "../components/PWAInstallButton"; */}
import BottomNavigation from "../components/BottomNavigation";
import HomepageBanner from "../components/HomepageBanner";
import StaticFooter from "../components/StaticFooter";
import HeroImageSlider from "../components/HeroImageSlider";
import BoostBanner from "../components/BoostBanner";
import AdSlot from "../components/AdSlot";
import AdvertisementBannerCarousel from "../components/AdvertisementBannerCarousel";
import AdvertisementForm from "../components/AdvertisementBanners";
import BoostPackagesShowcase from "../components/BoostPackagesShowcase";
import FeaturedBanner from "../components/FeaturedBanner";

export default function Index() {
  const [showAdForm, setShowAdForm] = useState(false);
  const [selectedBannerType, setSelectedBannerType] = useState<
    "residential" | "commercial" | "investment" | "industrial"
  >("residential");

  // Initialize advertisement banners on mount
  useEffect(() => {
    const initializeBanners = async () => {
      try {
        const response = await fetch(
          "/api/banners?position=advertisement_banners&active=true",
        );
        const data = await response.json();

        if (!Array.isArray(data?.data) || data.data.length === 0) {
          // If no banners exist, initialize them
          await fetch("/api/admin/advertisement-banners/initialize", {
            method: "POST",
          }).catch(() => {
            // Silently fail if not admin - banners will use defaults
          });
        }
      } catch (error) {
        console.warn("Banner initialization check failed:", error);
      }
    };

    initializeBanners();
  }, []);

  const handleBannerClick = (
    bannerType: "residential" | "commercial" | "investment" | "industrial",
  ) => {
    setSelectedBannerType(bannerType);
    setShowAdForm(true);
  };

  return (
    <div className="min-h-screen bg-white">
      <OLXStyleHeader />
      <main className="pb-16 bg-white">
        {/* Big banner above hero */}
        {/* <TopBanner /> */}

        {/* Hero Image Slider */}
        <HeroImageSlider />

        {/* Advertisement Banner Carousel - disabled */}
        {/* <AdvertisementBannerCarousel onBannerClick={handleBannerClick} /> */}

        {/* Dynamic Categories (moved up as requested) */}
        <OLXStyleCategories />

        {/* Boost Up Banner - right below categories */}
        <BoostBanner />

        {/* Featured Properties Banner - right below boost banner */}
        <FeaturedBanner />

        <div className="bg-white">
          <OLXStyleListings />
        </div>

        <div className="bg-white py-8">
          <PackagesShowcase />
        </div>

        {/* Boost Up Packages - below Advertisement Packages */}
        <BoostPackagesShowcase />
      </main>
      <BottomNavigation />
      <PWAInstallPrompt />
   { /*   <PWAInstallButton /> */}
      <StaticFooter />

      {/* Advertisement Form Modal */}
      <AdvertisementForm
        isOpen={showAdForm}
        onClose={() => setShowAdForm(false)}
        bannerType={selectedBannerType}
      />
    </div>
  );
}
