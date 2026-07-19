import { useState, useEffect } from "react";

export interface BatteryStatus {
  level: number; // 0 to 100
  isCharging: boolean;
  chargingTime: number; // in seconds
  dischargingTime: number; // in seconds
  isSupported: boolean;
}

export function useBatteryStatus(): BatteryStatus {
  const [status, setStatus] = useState<BatteryStatus>({
    level: 85,
    isCharging: false,
    chargingTime: Infinity,
    dischargingTime: Infinity,
    isSupported: false,
  });

  useEffect(() => {
    const nav = navigator as any;
    if (!nav || typeof nav.getBattery !== "function") {
      // Fallback for browsers that don't support the Battery Status API
      setStatus((prev) => ({
        ...prev,
        isSupported: false,
      }));
      return;
    }

    let batteryInstance: any = null;

    const updateBatteryStatus = (battery: any) => {
      setStatus({
        level: Math.round(battery.level * 100),
        isCharging: battery.charging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime,
        isSupported: true,
      });
    };

    const handleChargingChange = (e: any) => {
      updateBatteryStatus(e.target);
    };

    const handleLevelChange = (e: any) => {
      updateBatteryStatus(e.target);
    };

    const handleChargingTimeChange = (e: any) => {
      updateBatteryStatus(e.target);
    };

    const handleDischargingTimeChange = (e: any) => {
      updateBatteryStatus(e.target);
    };

    nav.getBattery()
      .then((battery: any) => {
        batteryInstance = battery;
        updateBatteryStatus(battery);

        battery.addEventListener("chargingchange", handleChargingChange);
        battery.addEventListener("levelchange", handleLevelChange);
        battery.addEventListener("chargingtimechange", handleChargingTimeChange);
        battery.addEventListener("dischargingtimechange", handleDischargingTimeChange);
      })
      .catch((err: any) => {
        console.warn("Battery status API error:", err);
        setStatus((prev) => ({ ...prev, isSupported: false }));
      });

    return () => {
      if (batteryInstance) {
        batteryInstance.removeEventListener("chargingchange", handleChargingChange);
        batteryInstance.removeEventListener("levelchange", handleLevelChange);
        batteryInstance.removeEventListener("chargingtimechange", handleChargingTimeChange);
        batteryInstance.removeEventListener("dischargingtimechange", handleDischargingTimeChange);
      }
    };
  }, []);

  return status;
}
