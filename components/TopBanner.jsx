import { useEffect, useState } from "react";

const emptyCountdown = {
  total: 0,
  hours: "00",
  minutes: "00",
  seconds: "00",
};

const getTimeRemaining = (endTime) => {
  if (!endTime) return null;

  const difference = new Date(endTime).getTime() - Date.now();
  if (difference <= 0) {
    return emptyCountdown;
  }

  const totalSeconds = Math.floor(difference / 1000);
  return {
    total: difference,
    hours: String(Math.floor(totalSeconds / 3600)).padStart(2, "0"),
    minutes: String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0"),
    seconds: String(totalSeconds % 60).padStart(2, "0"),
  };
};

const TopBanner = () => {
  const [promo, setPromo] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);

  useEffect(() => {
    let ignore = false;

    const loadBannerPromo = async () => {
      try {
        const response = await fetch("/api/promo/banner", { cache: "no-store" });
        const data = await response.json();

        if (!ignore) {
          setPromo(data?.success ? data.promo : null);
        }
      } catch (error) {
        console.error("Failed to load banner promo", error);
        if (!ignore) {
          setPromo(null);
        }
      }
    };

    loadBannerPromo();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!promo?.expiresAt) {
      setTimeRemaining(null);
      return undefined;
    }

    const tick = () => {
      const updated = getTimeRemaining(promo.expiresAt);
      setTimeRemaining(updated);
      if (updated?.total <= 0) {
        setPromo(null);
      }
    };

    tick();
    const intervalId = setInterval(tick, 1000);

    return () => clearInterval(intervalId);
  }, [promo?.expiresAt]);

  if (!promo?.bannerMessage) {
    return null;
  }

  return (
    <div className="w-full bg-primary text-white">
      <div className="mx-auto flex flex-wrap items-center justify-center gap-2 px-4 py-2 text-center text-sm font-semibold sm:text-base">
        <span>{promo.bannerMessage}</span>
        {timeRemaining && (
          <span className="rounded bg-white px-2 py-1 font-bold text-primary">
            {timeRemaining.hours}:{timeRemaining.minutes}:{timeRemaining.seconds} left
          </span>
        )}
      </div>
    </div>
  );
};

export default TopBanner;
