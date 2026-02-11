import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Clock, Check, ArrowRight, TrendingUp, Eye, Star } from "lucide-react";
import { Button } from "./ui/button";

interface BoostPlan {
  _id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  features: string[];
  active: boolean;
  sortOrder?: number;
}

export default function BoostPackagesShowcase() {
  const [plans, setPlans] = useState<BoostPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBoostPlans();
  }, []);

  const fetchBoostPlans = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/boost-plans?active=true", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPlans(data.data.filter((p: BoostPlan) => p.active));
      }
    } catch (e) {
      console.warn("Failed to load boost plans:", e);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const getPlanColor = (index: number) => {
    const colors = [
      { bg: "from-yellow-50 to-yellow-100", text: "text-yellow-800", btn: "bg-yellow-600 hover:bg-yellow-700", icon: "text-yellow-600", border: "border-yellow-300" },
      { bg: "from-orange-50 to-orange-100", text: "text-orange-800", btn: "bg-orange-600 hover:bg-orange-700", icon: "text-orange-600", border: "border-orange-300" },
      { bg: "from-red-50 to-red-100", text: "text-red-800", btn: "bg-red-600 hover:bg-red-700", icon: "text-red-600", border: "border-red-300" },
    ];
    return colors[index % colors.length];
  };

  const getPlanIcon = (index: number) => {
    const icons = [Zap, Star, TrendingUp];
    const Icon = icons[index % icons.length];
    return <Icon className="h-6 w-6" />;
  };

  const formatDuration = (hours: number) => {
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days} ${days === 1 ? "Day" : "Days"}`;
    }
    return `${hours} ${hours === 1 ? "Hour" : "Hours"}`;
  };

  if (loading && plans.length === 0) {
    return (
      <section className="bg-white py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-96 mx-auto"></div>
          </div>
        </div>
      </section>
    );
  }

  if (plans.length === 0) return null;

  return (
    <section className="bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-4">
            <Zap className="h-8 w-8 text-yellow-500 mr-3" />
            <h2 className="text-3xl font-bold text-gray-900">
              Boost Up Packages
            </h2>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Give your property instant visibility boost. Get featured on homepage and priority in search results.
          </p>
        </div>

        <div className={`grid grid-cols-1 ${plans.length === 1 ? "max-w-md mx-auto" : plans.length === 2 ? "md:grid-cols-2 max-w-3xl mx-auto" : "md:grid-cols-3"} gap-8 mb-12`}>
          {plans.map((plan, index) => {
            const color = getPlanColor(index);
            return (
              <div
                key={plan._id}
                className={`relative rounded-xl border-2 ${color.border} overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-105`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <div className={`bg-gradient-to-r ${color.bg} ${color.text} p-6 text-center`}>
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white mb-4 shadow-lg">
                    <div className={color.icon}>
                      {getPlanIcon(index)}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <div className="text-3xl font-bold mb-1">
                    ₹{plan.price}
                  </div>
                  <div className="text-sm opacity-75 flex items-center justify-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {formatDuration(plan.duration)}
                  </div>
                </div>

                <div className="p-6 bg-white">
                  <p className="text-gray-600 mb-6">{plan.description}</p>

                  <div className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate("/my-properties");
                    }}
                    className={`w-full ${color.btn} text-white`}
                  >
                    Boost Now
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl text-white p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white bg-opacity-20 rounded-full mb-4">
                <Eye className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Instant Visibility</h3>
              <p className="text-white text-opacity-90">
                Your property appears on homepage immediately after boost
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white bg-opacity-20 rounded-full mb-4">
                <TrendingUp className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Priority Search</h3>
              <p className="text-white text-opacity-90">
                Boosted properties appear first in search results
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white bg-opacity-20 rounded-full mb-4">
                <Zap className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Quick Results</h3>
              <p className="text-white text-opacity-90">
                Get more inquiries and faster responses from buyers
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
